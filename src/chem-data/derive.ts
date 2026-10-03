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
export const ORGANIC_OXYGEN_NOTE =
  'organic chemistry describes this oxygen as sp², because one lone pair is delocalised into the neighbouring C=O'
export const AROMATIC_ORDER_LABEL = 'aromatic (delocalised)'
export const AROMATIC_SIGMA_PI = '1 σ + delocalised π (aromatic, effective order 1.5)'

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
}

export type DerivedBond = {
  sigmaPi: string
  /** Pauling electronegativity difference, to two decimals. */
  electronegativityDifference: number
  /** Å, measured from the stored coordinates. */
  length: number
  /** 1.5 for an aromatic bond; the stored Kekulé order otherwise. */
  displayOrder: number
  orderLabel?: string
}

type Bond = Molecule['bonds'][number]

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

  // A lone-pair atom with only single bonds, next to an atom that has a double bond to a third atom.
  // ponytail: looks at stored double bonds only. A lone pair next to an aromatic ring or a
  // triple bond (aniline, phenol, ynamines) is not detected; none is in the v1 library.
  const conjugated = (i: number) =>
    atoms[i]!.lonePairs > 0 &&
    bondsOf[i]!.every((b) => b.order === 1) &&
    bondsOf[i]!.some((b) => bondsOf[other(b, i)]!.some((far) => far.order === 2 && other(far, other(b, i)) !== i))

  return atoms.map((atom, i) => {
    const mine = bondsOf[i]!
    const bondedAtoms = mine.length
    const stericNumber = bondedAtoms + atom.lonePairs
    const base = {
      bondedAtoms,
      oxidationState:
        valenceElectrons(elementOf(elements, atom.element)) -
        2 * atom.lonePairs -
        mine.reduce((sum, b) => sum + assigned(b, i), 0),
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
      return { ...base, resonanceOverride: false, electronGeometry: null, geometry: TERMINAL_ATOM, hybridization }
    }

    const resonanceOverride = atom.element === 'N' && conjugated(i)
    const domains = resonanceOverride ? stericNumber - 1 : stericNumber
    const lonePairs = resonanceOverride ? atom.lonePairs - 1 : atom.lonePairs
    const note =
      domains >= 5 ? D_ORBITAL_NOTE : atom.element === 'O' && conjugated(i) ? ORGANIC_OXYGEN_NOTE : undefined
    return {
      ...base,
      resonanceOverride,
      electronGeometry: lookup(ELECTRON_GEOMETRY, domains, molecule, i),
      geometry: lookup(MOLECULAR_GEOMETRY, `${domains}/${lonePairs}`, molecule, i),
      hybridization: lookup(HYBRIDIZATION, domains, molecule, i),
      ...(note ? { hybridizationNote: note } : {}),
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
    return bond.aromatic
      ? { ...shared, sigmaPi: AROMATIC_SIGMA_PI, displayOrder: 1.5, orderLabel: AROMATIC_ORDER_LABEL }
      : { ...shared, sigmaPi: SIGMA_PI[bond.order], displayOrder: bond.order }
  })
}
