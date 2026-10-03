import { HYBRIDIZATION, deriveAtoms } from './derive'
import type { Vec3 } from './geometry'
import { bondDirections, lonePairDirections } from './lonePairs'
import type { Element, Molecule } from './schema'

// Which hybrid orbital lobes to draw on an atom (spec 6.4, level 3): sp, sp² and sp³ atoms only.

/** Steric numbers whose hybrid orbitals are drawn. 5 and 6 are textbook labels only and are never drawn. */
const DRAWN = [2, 3, 4].map((domains) => HYBRIDIZATION[domains]!)

export const DELOCALISED_PAIR_NOTE =
  'The lone pair of this nitrogen is in a p orbital at right angles to the plane of its bonds, delocalised into the neighbouring C=O. It is not a hybrid orbital, so it has no lobe.'

export type HybridLobes = {
  hybridization: string
  /** Unit vectors from the atom: one lobe along each bond to a neighbour. */
  bonds: Vec3[]
  /** Unit vectors from the atom: one lobe for each lone pair held in a hybrid orbital. */
  lonePairs: Vec3[]
  note?: string
}

/**
 * The hybrid orbitals of one atom, one lobe per electron domain, or null for an atom
 * that has none to draw: hydrogen, a terminal atom with no hybridization assigned,
 * and steric numbers 5 and 6.
 */
export function hybridLobes(molecule: Molecule, atomIndex: number, elements: readonly Element[]): HybridLobes | null {
  const derived = deriveAtoms(molecule, elements)[atomIndex]
  if (!derived) throw new Error(`${molecule.id}: no atom ${atomIndex}`)
  if (!DRAWN.includes(derived.hybridization)) return null
  const bonds = bondDirections(molecule, atomIndex)
  // An amide or urea nitrogen is sp² with its lone pair in the unhybridized p orbital.
  if (derived.resonanceOverride) return { hybridization: derived.hybridization, bonds, lonePairs: [], note: DELOCALISED_PAIR_NOTE }
  return { hybridization: derived.hybridization, bonds, lonePairs: lonePairDirections(molecule, atomIndex, elements) }
}

/** The lobes in words, for the inspector: "sp³: 4 lobes, 2 along bonds and 2 holding lone pairs." */
export function describeHybridLobes(lobes: HybridLobes): string {
  const bonds = lobes.bonds.length
  const pairs = lobes.lonePairs.length
  const along = `${bonds} along ${bonds === 1 ? 'a bond' : 'bonds'}`
  const holding = pairs === 0 ? '' : ` and ${pairs} holding ${pairs === 1 ? 'a lone pair' : 'lone pairs'}`
  return `${lobes.hybridization}: ${bonds + pairs} lobes, ${along}${holding}.`
}
