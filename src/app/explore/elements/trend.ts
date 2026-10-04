import { NO_VALUE, periodicTable, TREND_NOTES, type TrendProperty } from '@/chem-data/periodic'
import { CARD_LABELS } from '@/chem-data/periodicCard'
import type { PeriodicElement, Quantity } from '@/chem-data/schema'

// Colouring the table by a property (periodic table spec 6).

export type { TrendProperty }

/**
 * Each property's name as a cell is read ("electronegativity 3.98") and its label in the controls and the
 * legend, which is the label of its row on the element card.
 */
export const TRENDS: Readonly<Record<TrendProperty, { name: string; label: string }>> = {
  electronegativity: { name: 'electronegativity', label: CARD_LABELS.electronegativity },
  covalentRadius: { name: 'covalent radius', label: CARD_LABELS.covalentRadius },
  ionizationEnergy: { name: 'first ionization energy', label: CARD_LABELS.ionizationEnergy },
  meltingPoint: { name: 'melting point', label: CARD_LABELS.meltingPoint },
  density: { name: 'density', label: CARD_LABELS.density },
}

/** A value in the digits its source publishes, with its unit; NO_VALUE where the source lists none. */
export function quantityText(quantity: Quantity | undefined): string {
  if (!quantity) return NO_VALUE
  return quantity.unit ? `${quantity.published} ${quantity.unit}` : quantity.published
}

/**
 * The digits the smallest cell has room for beside a decimal point, at the least sizes periodic.css gives a cell
 * and its type. It is what a cell prints with until its own room has been measured.
 */
export const LEAST_ROOM = 7

/**
 * A value as a cell prints it, in a cell with room for `room` digits and a decimal point: as its source publishes
 * it where that fits, else rounded, half up, to the most decimal places that fit. It never has a digit the source
 * does not publish. Only the cell prints it: the card, the readout, the cell's name and the list give the value whole.
 */
export function cellValue(published: string, room: number): string {
  const digits = (text: string) => text.replace('.', '').length
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(published)
  if (!match || digits(published) <= room) return published
  const [, sign = '', whole = '', fraction = ''] = match
  // On the digits themselves, as a whole number: a binary fraction would round 1.45 down.
  const all = BigInt(whole + fraction)
  const rounded = (places: number) => {
    const unit = 10n ** BigInt(fraction.length - places)
    const kept = (all + unit / 2n) / unit
    const text = kept.toString().padStart(places + 1, '0')
    return { kept, text: sign + (places > 0 ? `${text.slice(0, -places)}.${text.slice(-places)}` : text) }
  }
  let places = Math.max(0, Math.min(fraction.length, room - sign.length - whole.length))
  // Rounding can carry into a new digit: 9.96 with room for two digits is 10, not 10.0.
  while (places > 0 && digits(rounded(places).text) > room) places--
  // ponytail: a value none of whose digits fit is printed to its first digit and overflows its cell, as a whole
  // number too long for its cell does. No value does at LEAST_ROOM, which a test checks for every value in the table.
  while (places < fraction.length && rounded(places).kept === 0n) places++
  return rounded(places).text
}

/**
 * How many digits fit beside a decimal point in `width` pixels, each digit `digit` pixels wide and the point
 * `point`; LEAST_ROOM where the type has no width, as before the page is laid out.
 */
export function digitRoom(width: number, digit: number, point: number): number {
  return digit > 0 ? Math.max(0, Math.floor((width - point) / digit)) : LEAST_ROOM
}

/** Whether a property has a value too long for the smallest cell, so that the legend must say cells round. */
export function roundedInCells(property: TrendProperty): boolean {
  return periodicTable.some((element) => {
    const quantity = element[property]
    return quantity !== undefined && cellValue(quantity.published, LEAST_ROOM) !== quantity.published
  })
}

/** What the legend says, once, where roundedInCells is true. */
export const ROUNDED_NOTE = "A value too long for its cell is rounded in the cell. Each element's card gives it in full."

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

type LegendNote = { text: string; sourceIds: string[] }

/** Every note the element at one end of a scale carries on that property in its own record, as the legend words it. */
export function endNotes(which: 'Lowest' | 'Highest', element: PeriodicElement, property: TrendProperty): LegendNote[] {
  return (element.notes ?? [])
    .filter((note) => note.row === property)
    .map((note) => ({ text: `${which}, ${element.name.toLowerCase()}: ${note.text}`, sourceIds: [note.sourceId] }))
}

/**
 * What a property's legend says beside its scale: the notes each end of the scale carries in its own record,
 * such as helium's and carbon's on the melting point, then the notes authored for the property.
 */
export function trendNotes(property: TrendProperty): LegendNote[] {
  const { lowest, highest } = trendScale(property)
  return [...endNotes('Lowest', lowest, property), ...endNotes('Highest', highest, property), ...TREND_NOTES[property]]
}
