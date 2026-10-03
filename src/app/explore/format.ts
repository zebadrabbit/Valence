import type { DerivedBond } from '@/chem-data/derive'
import { BOND_KINDS } from '@/chem-data/describe'
import { evToKjPerMol } from '@/chem-data/element'
import { GEOMETRY_SOURCE_LABEL } from '@/chem-data/library'
import type { Measurement } from '@/chem-data/measure'
import type { Molecule } from '@/chem-data/schema'

// How the inspector cards write numbers. Minus signs are the real character (U+2212), not a hyphen.

const MINUS = '−'
const fixed = (value: number, digits: number) => {
  const text = Math.abs(value).toFixed(digits)
  return value < 0 && Number(text) !== 0 ? MINUS + text : text
}

/** A formal charge or oxidation state: "+1", "−2", "0". */
export function signed(value: number): string {
  return value > 0 ? `+${value}` : fixed(value, 0)
}

/** A covalent, van der Waals or ionic radius. The sources print these to 0.01 Å. */
export function radius(angstroms: number): string {
  return `${fixed(angstroms, 2)} Å`
}

/** A distance measured from stored coordinates. */
export function length(angstroms: number): string {
  return `${fixed(angstroms, 3)} Å`
}

/** An angle or dihedral measured from stored coordinates. */
export function degrees(value: number): string {
  return `${fixed(value, 1)}°`
}

/** A cited length, angle or dihedral, with the digits that are stored. */
// ponytail: the research files keep cited geometry as numbers, so a published trailing zero
// (0.950 Å) is lost and this prints 0.95. Store the as-published text to fix it.
export function cited(value: number, kind: Measurement['kind']): string {
  return `${String(value).replace('-', MINUS)}${kind === 'distance' ? ' Å' : '°'}`
}

/** A bond's polarity: the difference between two Pauling electronegativities, which are given to 0.01. */
export function polarity(electronegativityDifference: number): string {
  return fixed(electronegativityDifference, 2)
}

/** "1 electron", "2 electrons". */
export function electrons(count: number): string {
  return `${count} ${count === 1 ? 'electron' : 'electrons'}`
}

/** An ionization energy stored in eV, as whole kJ/mol. */
export function kjPerMol(ev: number): string {
  return `${Math.round(evToKjPerMol(ev))} kJ/mol`
}

const ordinalRules = new Intl.PluralRules('en', { type: 'ordinal' })
const ORDINAL_SUFFIX: Readonly<Record<string, string>> = { one: 'st', two: 'nd', few: 'rd', other: 'th' }

/** "1st", "2nd", "3rd", "4th". */
export function ordinal(n: number): string {
  return `${n}${ORDINAL_SUFFIX[ordinalRules.select(n)] ?? 'th'}`
}

/** A bond's displayed order: "2 (double)", or "aromatic (delocalised), order 1.5". */
export function bondOrder(bond: DerivedBond): string {
  return bond.orderLabel ? `${bond.orderLabel}, order ${bond.displayOrder}` : `${bond.displayOrder} (${BOND_KINDS[bond.displayOrder - 1]})`
}

/** The value measured from the model's coordinates, or why there is none. */
export function measurementValue({ kind, value }: Measurement): string {
  if (value === null) return 'not defined (three of the atoms lie in a line)'
  return kind === 'distance' ? length(value) : degrees(value)
}

/**
 * The value a card shows for a length, angle or dihedral, and the status line announces
 * (spec 5.2, 6.3): the cited experimental value where the molecule has one for these atoms,
 * the model's otherwise.
 */
export function headlineValue(measurement: Measurement): string {
  return measurement.cited ? cited(measurement.cited.value, measurement.kind) : measurementValue(measurement)
}

/** Says where the headline value comes from, labelled with the molecule's geometry source. */
export function measuredNote(molecule: Molecule, measurement: Measurement): string {
  const label = GEOMETRY_SOURCE_LABEL[molecule.geometrySource]
  return measurement.cited
    ? `Cited value, ${label}. The model's coordinates give ${measurementValue(measurement)}.`
    : `Measured from the model's coordinates. Model geometry: ${label}.`
}

/** One sentence for the status line: what was measured, between which atoms, and the result. Names come from atomNames. */
export function measurementText(measurement: Measurement, atomNames: readonly string[]): string {
  const [a, b, c, d] = measurement.atoms.map((i) => atomNames[i])
  const what =
    measurement.kind === 'distance'
      ? `Distance from ${a} to ${b}`
      : measurement.kind === 'angle'
        ? `Angle at ${b}, between ${a} and ${c}`
        : `Dihedral ${a}, ${b}, ${c}, ${d}`
  return `${what}: ${headlineValue(measurement)}.`
}
