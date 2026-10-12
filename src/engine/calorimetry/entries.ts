// What the learner types, and the exact arithmetic it is judged with. Text is read from its characters and never
// through a float, and every judgment is a comparison of two fractions of whole numbers.

/** A number given to three significant figures: `mantissa` x 10^`exponent`, with the mantissa from 100 to 999, or -999 to -100. */
export interface Sig3 {
  mantissa: number
  exponent: number
}

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

/**
 * A number typed to exactly three significant figures ("2760", "55.8", "-57.1", "0.0500", ".449"); null otherwise.
 * Zeros in front do not count. Behind a decimal point every figure counts, so "55.80" has four and "0.050" two.
 * In a whole number, zeros after the third figure only keep the others in their places, so "2760" has three; a
 * whole number with a fourth figure that is not zero has too many.
 */
export function parseSig3(text: string): Sig3 | null {
  const match = /^([+-]?)(\d*)(?:\.(\d+))?$/.exec(text.trim().replace('−', '-'))
  if (!match || (match[2] === '' && match[3] === undefined)) return null
  const [, sign, whole = '', decimals] = match
  const digits = (whole + (decimals ?? '')).replace(/^0+/, '')
  const kept = digits.slice(0, 3)
  const rest = digits.slice(3)
  // The figures after the third: none behind a decimal point, and only place-holding zeros in a whole number.
  if (kept.length < 3 || (decimals === undefined ? /[1-9]/.test(rest) : rest !== '')) return null
  return { mantissa: (sign === '-' ? -1 : 1) * Number(kept), exponent: rest.length - (decimals?.length ?? 0) }
}

/** True for a Sig3 the parser could have made: whole numbers, the mantissa of three figures, the exponent small. */
export const isSig3 = (value: unknown): value is Sig3 => {
  if (typeof value !== 'object' || value === null) return false
  const { mantissa, exponent, ...rest } = value as Record<string, unknown>
  return Object.keys(rest).length === 0 && Number.isInteger(mantissa) && Math.abs(mantissa as number) >= 100 && Math.abs(mantissa as number) <= 999 && Number.isInteger(exponent) && Math.abs(exponent as number) <= 12
}

/** A Sig3 as it is written: "2760", "55.8", "-57.1", "0.0500". */
export function formatSig3({ mantissa, exponent }: Sig3): string {
  const digits = String(Math.abs(mantissa))
  const sign = mantissa < 0 ? '-' : ''
  if (exponent >= 0) return sign + digits + '0'.repeat(exponent)
  const point = digits.length + exponent
  return sign + (point > 0 ? `${digits.slice(0, point)}.${digits.slice(point)}` : `0.${'0'.repeat(-point)}${digits}`)
}

/** A fraction of two whole numbers, the lower one positive: an exact value. */
export type Exact = readonly [numerator: bigint, denominator: bigint]

/** numerator / denominator, of whole numbers or of fractions. */
export function exact(numerator: number | Exact, denominator: number | Exact = 1): Exact {
  const [a, b] = typeof numerator === 'number' ? [BigInt(numerator), 1n] : numerator
  const [c, d] = typeof denominator === 'number' ? [BigInt(denominator), 1n] : denominator
  const [n, m] = [a * d, b * c]
  return m < 0n ? [-n, -m] : [n, m]
}
export const times = (a: Exact, b: Exact | number): Exact => exact(a, exact(1, b))
/** Negative, zero or positive as a is below, at or above b. */
export const compare = (a: Exact, b: Exact): number => {
  const d = a[0] * b[1] - b[0] * a[1]
  return d < 0n ? -1 : d > 0n ? 1 : 0
}
const power = (exponent: number): Exact => (exponent >= 0 ? [10n ** BigInt(exponent), 1n] : [1n, 10n ** BigInt(-exponent)])
/** The size of a Sig3, without its sign. */
export const sizeOf = (value: Sig3): Exact => times(power(value.exponent), Math.abs(value.mantissa))

/** A range of exact values, both ends included. */
export type Range = readonly [low: Exact, high: Exact]
/** The range between the smallest and the largest of some values. */
export const spanOf = (...values: Exact[]): Range => [values.reduce((a, b) => (compare(a, b) <= 0 ? a : b)), values.reduce((a, b) => (compare(a, b) >= 0 ? a : b))]

/**
 * True when a size written to three significant figures is a correct rounding of some value in the range: when
 * the stretch of values that round to it, both ends included, meets the range. Both ends are included because
 * rounding a half up and rounding a half to even are both taught, so at an exact tie either neighbour is right
 * (the titration lab's rule). The stretch reaches half a unit of the third figure above the size and half a unit
 * below it; below 100 x 10^e the next size down is 99.9 x 10^e, ten times as fine, so there the stretch reaches
 * only a twentieth of a unit down.
 */
export function roundsFrom(value: Sig3, [low, high]: Range): boolean {
  const size = sizeOf(value)
  const unit = power(value.exponent)
  const above: Exact = [size[0] * 2n * unit[1] + unit[0] * size[1], size[1] * 2n * unit[1]]
  const fine = Math.abs(value.mantissa) === 100 ? 20n : 2n
  const below: Exact = [size[0] * fine * unit[1] - unit[0] * size[1], size[1] * fine * unit[1]]
  return compare(below, high) <= 0 && compare(above, low) >= 0
}

/**
 * True when a size is a value of the range cut off after its third figure where it should have been rounded: the
 * range holds a value from the size up to, and not at, one unit of the third figure above it. Asked only of a
 * size that is not a correct rounding.
 */
export function cutOffFrom(value: Sig3, [low, high]: Range): boolean {
  const size = sizeOf(value)
  const unit = power(value.exponent)
  const next: Exact = [size[0] * unit[1] + unit[0] * size[1], size[1] * unit[1]]
  return compare(size, high) <= 0 && compare(next, low) > 0
}
