import { angleDeg, dihedralDeg, distance } from './geometry'
import type { Molecule } from './schema'

// The measure tool (spec 6.3): what an ordered pick of two, three or four atoms measures.

export type Measurement = {
  kind: 'distance' | 'angle' | 'dihedral'
  /** The picked atom indices, in order. An angle's vertex is the second; a dihedral's axis is the second and third. */
  atoms: readonly number[]
  /** Å or degrees, from the stored coordinates. Null for a dihedral with three of its atoms in a line, which has no value. */
  value: number | null
  /**
   * The molecule's cited experimental value for exactly these atoms, when it has one, with the text its source prints;
   * or, where the source prints no figure, the value its point group fixes, with that point group in `symmetry`.
   */
  cited?: { value: number; published?: string; symmetry?: string; sourceId: string }
}

/** What a card says of a value that has `symmetry`: where it comes from, and that it is not a figure read in the source. */
export function symmetryBasis(pointGroup: string): string {
  return `From the molecule's symmetry (${pointGroup}); the source prints no figure`
}

const KINDS = { 2: ['distance', 'lengths'], 3: ['angle', 'angles'], 4: ['dihedral', 'dihedrals'] } as const

// Below this sine (about 0.6 degrees from straight) an end of a dihedral has no plane.
const IN_LINE = 0.01
const sinDeg = (degrees: number) => Math.sin((degrees * Math.PI) / 180)

/** Two atoms give a distance, three the angle at the second, four the dihedral about the second and third; anything else is null. */
export function measure(molecule: Molecule, atoms: readonly number[]): Measurement | null {
  if (atoms.length !== 2 && atoms.length !== 3 && atoms.length !== 4) return null
  const [kind, list] = KINDS[atoms.length]
  const [a, b, c, d] = atoms.map((i) => {
    const atom = molecule.atoms[i]
    if (!atom) throw new Error(`${molecule.id}: no atom ${i}`)
    return atom.position
  })
  const value =
    kind === 'distance'
      ? distance(a!, b!)
      : kind === 'angle'
        ? angleDeg(a!, b!, c!)
        : sinDeg(angleDeg(a!, b!, c!)) < IN_LINE || sinDeg(angleDeg(b!, c!, d!)) < IN_LINE
          ? null
          : dihedralDeg(a!, b!, c!, d!)
  // Reading the atoms in the other direction measures the same thing, sign of a dihedral included.
  const keys = [atoms.join(), [...atoms].reverse().join()]
  const cited = molecule.measurements?.[list].find((m) => keys.includes(m.atoms.join()))
  if (!cited) return { kind, atoms, value }
  const { value: citedValue, sourceId, published, symmetry } = cited
  return { kind, atoms, value, cited: { value: citedValue, sourceId, ...(published === undefined ? {} : { published }), ...(symmetry === undefined ? {} : { symmetry }) } }
}
