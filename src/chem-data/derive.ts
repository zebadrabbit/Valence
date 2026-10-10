import { valenceElectrons } from './element'
import { distance } from './geometry'
import type { Element, Molecule } from './schema'

// Values the inspectors show that are computed from a stored Lewis structure
// and the element table (spec 6.3). Nothing here is stored in the data files.

// Display strings, shared by the tests and the UI.
export const TERMINAL_ATOM = 'terminal atom'
export const HYBRIDIZATION_HYDROGEN = 'none (1s)'
export const HYBRIDIZATION_NOT_ASSIGNED = 'not assigned (terminal atom)'
export const D_ORBITAL_NOTE = 'real d-orbital involvement is negligible'
/** What a delocalised lone pair is shared with where the neighbour's double bond is one of a benzene ring. */
export const AROMATIC_RING = 'aromatic ring'
/** `into` is what the lone pair is shared with: "C=O", "C=C", or AROMATIC_RING. */
export const organicOxygenNote = (into: string) =>
  `organic chemistry describes this oxygen as sp², because one lone pair is delocalised into the neighbouring ${into}`
export const ORGANIC_OXYGEN_NOTE = organicOxygenNote('C=O')
export const AROMATIC_ORDER_LABEL = 'aromatic (delocalised)'
export const AROMATIC_SIGMA_PI = '1 σ + delocalised π (aromatic, effective order 1.5)'

/**
 * A resonance set: the bonds from one atom that the Lewis structure draws as one double bond and the rest single,
 * in one of as many equivalent structures as there are bonds. Two in SO₂ and a carboxylate; three in nitrate,
 * carbonate and SO₃. The set shares its one π bond, so each bond's effective order is (bonds + 1) / bonds.
 */
const RESONANCE_SETS: Readonly<Record<number, { label: string; count: string; order: string; partners: string }>> = {
  2: { label: 'resonance pair', count: 'two', order: '1.5', partners: 'its partner on the other bond of the pair' },
  3: { label: 'resonance set of three', count: 'three', order: '1.33', partners: 'its partners on the other bonds of the set' },
}
const resonanceAtomNote = (size: number) =>
  `drawn in one of ${RESONANCE_SETS[size]!.count} equivalent resonance structures; this atom and ${RESONANCE_SETS[size]!.partners} are identical in the real molecule`
const resonanceSigmaPi = (size: number) => `1 σ + delocalised π (${RESONANCE_SETS[size]!.label}, effective order ${RESONANCE_SETS[size]!.order})`
export const RESONANCE_ATOM_NOTE = resonanceAtomNote(2)
export const RESONANCE_ORDER_LABEL = RESONANCE_SETS[2]!.label
export const RESONANCE_SIGMA_PI = resonanceSigmaPi(2)
export const RESONANCE_TRIPLE_ATOM_NOTE = resonanceAtomNote(3)
export const RESONANCE_TRIPLE_ORDER_LABEL = RESONANCE_SETS[3]!.label
export const RESONANCE_TRIPLE_SIGMA_PI = resonanceSigmaPi(3)
export const BOND_KINDS = ['single', 'double', 'triple', 'aromatic'] as const

/** Hybridization by (effective) steric number. */
export const HYBRIDIZATION: Readonly<Record<number, string>> = {
  2: 'sp',
  3: 'sp²',
  4: 'sp³',
  5: 'sp³d (textbook label)',
  6: 'sp³d² (textbook label)',
}

/** Electron-domain geometry by (effective) steric number. */
export const ELECTRON_GEOMETRY: Readonly<Record<number, string>> = {
  2: 'linear',
  3: 'trigonal planar',
  4: 'tetrahedral',
  5: 'trigonal bipyramidal',
  6: 'octahedral',
}

/** VSEPR molecular geometry by "steric number/lone pairs". */
export const MOLECULAR_GEOMETRY: Readonly<Record<string, string>> = {
  '2/0': 'linear',
  '3/0': 'trigonal planar',
  '3/1': 'bent',
  '4/0': 'tetrahedral',
  '4/1': 'trigonal pyramidal',
  '4/2': 'bent',
  '5/0': 'trigonal bipyramidal',
  '5/1': 'seesaw',
  '5/2': 'T-shaped',
  '5/3': 'linear',
  '6/0': 'octahedral',
  '6/1': 'square pyramidal',
  '6/2': 'square planar',
}

export const SIGMA_PI: Readonly<Record<1 | 2 | 3, string>> = {
  1: '1 σ',
  2: '1 σ + 1 π',
  3: '1 σ + 2 π',
}

export type DerivedAtom = {
  bondedAtoms: number
  oxidationState: number
  /** Bonded atoms + lone pairs on the stored Lewis structure. */
  stericNumber: number
  /** True for an amide or urea nitrogen: sp², its delocalised lone pair is not a domain. */
  resonanceOverride: boolean
  /** Null for an atom bonded to fewer than two atoms. */
  electronGeometry: string | null
  /** VSEPR molecular geometry, or "terminal atom". */
  geometry: string
  hybridization: string
  hybridizationNote?: string
  /**
   * For an atom whose lone pair is delocalised (an overridden nitrogen, or an oxygen that carries the organic
   * chemistry note): what the pair is shared with, "C=O", "C=C", "C=N" or AROMATIC_RING.
   */
  delocalisedInto?: string
}

export type DerivedBond = {
  sigmaPi: string
  /** Pauling electronegativity difference, to two decimals. */
  electronegativityDifference: number
  /** Å, measured from the stored coordinates. */
  length: number
  /** 1.5 for an aromatic bond and for a bond of a resonance pair, 4/3 for one of a resonance set of three; the stored Kekulé order otherwise. */
  displayOrder: number
  orderLabel?: string
  /** For a bond of a resonance set: how the Lewis structure draws it, and that the real bonds of the set are equal. */
  orderNote?: string
}

type Bond = Molecule['bonds'][number]

/** How many bonds are in the resonance set of a bond that carries a resonance note: the noted bonds that share an atom with it, itself included. */
function resonanceSetSize(molecule: Molecule, bond: Bond): number {
  const size = molecule.bonds.filter((b) => b.resonanceNote && [b.a, b.b].some((end) => end === bond.a || end === bond.b)).length
  if (!RESONANCE_SETS[size]) throw new Error(`${molecule.id}: a resonance set of ${size} bonds is not supported`)
  return size
}

function elementOf(elements: readonly Element[], symbol: string): Element {
  const found = elements.find((e) => e.symbol === symbol)
  if (!found) throw new Error(`no element data for ${symbol}`)
  return found
}

const other = (bond: Bond, index: number) => (bond.a === index ? bond.b : bond.a)

/** One entry per atom, in the molecule's atom order. */
export function deriveAtoms(molecule: Molecule, elements: readonly Element[]): DerivedAtom[] {
  const { atoms, bonds } = molecule
  const bondsOf = atoms.map((_, i) => bonds.filter((b) => b.a === i || b.b === i))
  const symbol = (i: number) => atoms[i]!.element
  const en = (i: number) => elementOf(elements, symbol(i)).electronegativity.value

  // Electrons of one bond that the oxidation-state rule assigns to atom i.
  const assigned = (bond: Bond, i: number) => {
    const j = other(bond, i)
    if (symbol(i) === symbol(j)) return bond.order
    if (en(i) === en(j)) {
      throw new Error(`${molecule.id}: ${symbol(i)} and ${symbol(j)} have equal electronegativity`)
    }
    return en(i) > en(j) ? 2 * bond.order : 0
  }

  // An atom of an element is 0: the first of the usual rules for oxidation numbers. Splitting each bond between
  // like atoms gives the same in H₂, O₂, N₂ and Cl₂, and not in ozone, whose Lewis structure would leave each
  // oxygen with its formal charge (+1, 0, −1) and give its two equivalent outer atoms different values.
  const elemental = molecule.charge === 0 && atoms.every((a) => a.element === atoms[0]!.element)

  // A lone-pair atom with only single bonds, next to an atom that has a double bond to a third atom: what that
  // double bond is, "C=O" before any other, or undefined. A ring is stored with its double bonds drawn, so the
  // atom next to a benzene ring (the oxygen of phenol) is found, and the bond is then named as the ring.
  // ponytail: looks at stored double bonds only. A lone pair next to a triple bond (ynamines) is not
  // detected; none is in the library.
  const delocalisedInto = (i: number): string | undefined => {
    if (atoms[i]!.lonePairs === 0 || !bondsOf[i]!.every((b) => b.order === 1)) return undefined
    const found = bondsOf[i]!.flatMap((b) => {
      const neighbour = other(b, i)
      return bondsOf[neighbour]!
        .filter((far) => far.order === 2 && other(far, neighbour) !== i)
        .map((far) => (far.aromatic ? AROMATIC_RING : `${symbol(neighbour)}=${symbol(other(far, neighbour))}`))
    })
    return found.find((name) => name === 'C=O') ?? found.find((name) => name === AROMATIC_RING) ?? found[0]
  }

  return atoms.map((atom, i) => {
    const mine = bondsOf[i]!
    const bondedAtoms = mine.length
    const stericNumber = bondedAtoms + atom.lonePairs
    const base = {
      bondedAtoms,
      oxidationState: elemental
        ? 0
        : valenceElectrons(elementOf(elements, atom.element)) - 2 * atom.lonePairs - mine.reduce((sum, b) => sum + assigned(b, i), 0),
      stericNumber,
    }

    if (bondedAtoms < 2) {
      const multiple = mine.some((b) => b.order > 1)
      const hybridization =
        atom.element === 'H'
          ? HYBRIDIZATION_HYDROGEN
          : multiple
            ? lookup(HYBRIDIZATION, stericNumber, molecule, i)
            : HYBRIDIZATION_NOT_ASSIGNED
      // The ends of a resonance set display differently (sp² and "not assigned") but are equivalent.
      const noted = mine.find((b) => b.resonanceNote)
      const note = noted ? { hybridizationNote: resonanceAtomNote(resonanceSetSize(molecule, noted)) } : {}
      return { ...base, resonanceOverride: false, electronGeometry: null, geometry: TERMINAL_ATOM, hybridization, ...note }
    }

    const into = delocalisedInto(i)
    const resonanceOverride = atom.element === 'N' && into !== undefined
    const domains = resonanceOverride ? stericNumber - 1 : stericNumber
    const lonePairs = resonanceOverride ? atom.lonePairs - 1 : atom.lonePairs
    // The oxygen's note is organic chemistry's: it is given next to a carbon's double bond, and not on the O–H of nitric acid.
    const organic = atom.element === 'O' && into !== undefined && (into === AROMATIC_RING || into.startsWith('C='))
    const note = domains >= 5 ? D_ORBITAL_NOTE : organic ? organicOxygenNote(into) : undefined
    return {
      ...base,
      resonanceOverride,
      electronGeometry: lookup(ELECTRON_GEOMETRY, domains, molecule, i),
      geometry: lookup(MOLECULAR_GEOMETRY, `${domains}/${lonePairs}`, molecule, i),
      hybridization: lookup(HYBRIDIZATION, domains, molecule, i),
      ...(note ? { hybridizationNote: note } : {}),
      ...(resonanceOverride || organic ? { delocalisedInto: into } : {}),
    }
  })
}

function lookup(table: Readonly<Record<string, string>>, key: string | number, molecule: Molecule, atom: number) {
  const found = table[key]
  if (found === undefined) {
    throw new Error(`${molecule.id}: atom ${atom} (${molecule.atoms[atom]!.element}) has no entry for ${key}`)
  }
  return found
}

/** One entry per bond, in the molecule's bond order. */
export function deriveBonds(molecule: Molecule, elements: readonly Element[]): DerivedBond[] {
  return molecule.bonds.map((bond) => {
    const a = molecule.atoms[bond.a]!
    const b = molecule.atoms[bond.b]!
    const difference =
      elementOf(elements, a.element).electronegativity.value - elementOf(elements, b.element).electronegativity.value
    const shared = {
      electronegativityDifference: Math.round(Math.abs(difference) * 100) / 100,
      length: distance(a.position, b.position),
    }
    if (bond.aromatic) return { ...shared, sigmaPi: AROMATIC_SIGMA_PI, displayOrder: 1.5, orderLabel: AROMATIC_ORDER_LABEL }
    // The set shares one π bond, so no bond of it is the double or the single bond the Lewis structure draws.
    if (bond.resonanceNote) {
      const size = resonanceSetSize(molecule, bond)
      const { label, count } = RESONANCE_SETS[size]!
      return {
        ...shared,
        sigmaPi: resonanceSigmaPi(size),
        displayOrder: (size + 1) / size,
        orderLabel: label,
        orderNote: `The Lewis structure draws this bond as a ${BOND_KINDS[bond.order - 1]} bond, in one of ${count} equivalent resonance structures; the ${count} real bonds are equal.`,
      }
    }
    return { ...shared, sigmaPi: SIGMA_PI[bond.order], displayOrder: bond.order }
  })
}
