// What the learner types, and the exact arithmetic it is judged with. Text is read from its characters and never
// through a float, and every judgment is a comparison of two fractions of whole numbers. The numbers of three
// significant figures and the exact arithmetic are shared with the kinetics engine and live in ../figures.ts; this
// file hands them on under the names they have always had here, and keeps the two readings of a temperature.

export { compare, cutOffFrom, exact, formatSig3, isSig3, parseSig3, roundsFrom, sizeOf, spanOf, times, type Exact, type Range, type Sig3 } from '../figures'

/** A temperature typed to 0.1 °C ("21.4"), in tenths of a degree; null when it is not written that way. */
export function parseTemperature(text: string): number | null {
  const match = /^(\d{1,3})\.(\d)$/.exec(text.trim())
  return match ? Number(match[1]) * 10 + Number(match[2]) : null
}

/** A change in temperature typed to 0.1 °C, with or without a sign ("6.8", "-5.3", "+6.8"), in tenths of a degree; null otherwise. A typed minus sign (U+2212) is read as a hyphen. */
export function parseChange(text: string): number | null {
  const match = /^([+-]?)(\d{1,3}\.\d)$/.exec(text.trim().replace('−', '-'))
  const size = match ? parseTemperature(match[2]!) : null
  return size === null ? null : match![1] === '-' ? -size : size
}
