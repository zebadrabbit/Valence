import { NO_VALUE, periodicTable, TREND_NOTES, type TrendProperty } from '@/chem-data/periodic'
import type { PeriodicElement, Quantity } from '@/chem-data/schema'

// Colouring the table by a property (periodic table spec 6).

export type { TrendProperty }

/** Each property's name as a cell is read ("electronegativity 3.98") and its label in the controls and the legend. */
export const TRENDS: Readonly<Record<TrendProperty, { name: string; label: string }>> = {
  electronegativity: { name: 'electronegativity', label: 'Electronegativity (Pauling scale)' },
  covalentRadius: { name: 'covalent radius', label: 'Covalent radius' },
  ionizationEnergy: { name: 'first ionization energy', label: 'First ionization energy' },
  meltingPoint: { name: 'melting point', label: 'Melting point' },
  density: { name: 'density', label: 'Density' },
}

/** A value in the digits its source publishes, with its unit; NO_VALUE where the source lists none. */
export function quantityText(quantity: Quantity | undefined): string {
  if (!quantity) return NO_VALUE
  return quantity.unit ? `${quantity.published} ${quantity.unit}` : quantity.published
}

/**
 * The linear scale a property is shaded on: from the lowest value any element has to the highest. `shade` is 0
 * at the lowest and 1 at the highest, and null for an element with no value, which takes no part in the range.
 */
export function trendScale(property: TrendProperty): {
  min: Quantity
  max: Quantity
  lowest: PeriodicElement
  highest: PeriodicElement
  /** How many elements have no value. */
  missing: number
  shade(element: PeriodicElement): number | null
} {
  const valued = periodicTable.flatMap((element) => {
    const quantity = element[property]
    return quantity ? [{ element, quantity }] : []
  })
  const [first, ...rest] = valued
  if (!first) throw new Error(`no element has a value for ${property}`)
  let low = first
  let high = first
  for (const entry of rest) {
    if (entry.quantity.value < low.quantity.value) low = entry
    if (entry.quantity.value > high.quantity.value) high = entry
  }
  const min = low.quantity
  const max = high.quantity
  return {
    min,
    max,
    lowest: low.element,
    highest: high.element,
    missing: periodicTable.length - valued.length,
    shade(element) {
      const quantity = element[property]
      return quantity ? (quantity.value - min.value) / (max.value - min.value) : null
    },
  }
}

/**
 * What a property's legend says beside its scale: the note each end of the scale carries in its own record,
 * such as helium's and carbon's on the melting point, then the notes authored for the property.
 */
export function trendNotes(property: TrendProperty): { text: string; sourceIds: string[] }[] {
  const { lowest, highest } = trendScale(property)
  const ends = ([['Lowest', lowest], ['Highest', highest]] as const).flatMap(([which, element]) => {
    const note = element.notes?.find((n) => n.row === property)
    return note ? [{ text: `${which}, ${element.name.toLowerCase()}: ${note.text}`, sourceIds: [note.sourceId] }] : []
  })
  return [...ends, ...TREND_NOTES[property]]
}
