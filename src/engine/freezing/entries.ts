// What the learner types, and the exact arithmetic it is judged with. Text is read from its characters and never
// through a float, and every judgment is a comparison of two fractions of whole numbers. The numbers of three
// significant figures and the exact arithmetic are the shared ones of ../figures.ts, which the calorimetry lab and
// the kinetics engine use too; this file hands them on and keeps this lab's own readings of a temperature to a
// hundredth of a degree and of a mass in kilograms.

export { compare, cutFromAny, exact, formatSig3, fromAny, isSig3, parseSig3, point, products, quotients, roundsFrom, sizeOf, spanOf, taken, times, type Exact, type Range, type Sig3 } from '../figures'

/** A temperature typed to 0.01 °C, with or without a sign ("0.12", "-1.48", "+0.05"), in hundredths of a degree; null when it is not written that way. A typed minus sign (U+2212) is read as a hyphen. Never negative zero. */
export function parseTemperature(text: string): number | null {
  const match = /^([+-]?)(\d{1,2})\.(\d{2})$/.exec(text.trim().replace('−', '-'))
  if (!match) return null
  const size = Number(match[2]) * 100 + Number(match[3])
  return match[1] === '-' && size !== 0 ? -size : size
}

/** A fall in temperature typed to 0.01 °C, as a size or with its sign ("1.60", "-1.60"), in hundredths of a degree; null otherwise. */
export const parseFall = parseTemperature

/** A mass of water typed in kilograms with every figure the balance gave, five decimal places ("0.10234", ".09876"), in hundredths of a gram; null otherwise. */
export function parseKilograms(text: string): number | null {
  const match = /^(\d?)\.(\d{5})$/.exec(text.trim())
  return match ? Number(match[1] || '0') * 100000 + Number(match[2]) : null
}

/** A temperature or a fall as it is written, to 0.01 °C, a negative one with a hyphen in front: "-1.48", "0.12". */
export function formatTemperature(hundredths: number): string {
  const size = Math.abs(hundredths)
  return `${hundredths < 0 ? '-' : ''}${Math.floor(size / 100)}.${String(size % 100).padStart(2, '0')}`
}

/** A mass in grams as the balance shows it, to 0.01 g: "4.12", "103.07". */
export const formatGrams = (cg: number) => formatTemperature(cg)

/** A mass in kilograms with five decimal places, from hundredths of a gram: "0.10234". */
export const formatKilograms = (cg: number) => `${Math.floor(cg / 100000)}.${String(cg % 100000).padStart(5, '0')}`
