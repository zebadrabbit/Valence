// Numbers a learner types to three significant figures, and the exact arithmetic they are judged with: shared by
// the labs whose notebooks hold typed entries that must follow from the learner's own numbers (the calorimetry
// lab, spec 16.2, and the kinetics engine of the clock reaction lab, spec 19.3). Text is read from its characters
// and never through a float, and every judgment is a comparison of two fractions of whole numbers. Lifted from
// src/engine/calorimetry/entries.ts and worksheet.ts on 2026-10-10, unchanged; the calorimetry lab's own files
// hand these on under the names they had.

/** A number given to three significant figures: `mantissa` x 10^`exponent`, with the mantissa from 100 to 999, or -999 to -100. */
export interface Sig3 {
  mantissa: number
  exponent: number
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

// THE ROUNDING RULE, as the calorimetry lab's worksheet first had it. A number typed to three significant figures
// must be a correct rounding (either neighbour at an exact tie) of its relation worked on the values above it. A
// value above may be taken in two ways, and both are accepted: as the entry was typed, already rounded; or as the
// unrounded value that entry was rounded from. Where the typed entry is itself a correct rounding, anything
// between the two is accepted as well, which takes in a calculator's value rounded part of the way.

/** A range that is one value. */
export const point = (value: Exact): Range => [value, value]

/**
 * The ways a value above may be taken: its unrounded range, and the entry as typed. Where the typed entry is a
 * correct rounding of the unrounded range the two are within half a step of each other, and everything between
 * them is taken too.
 */
export function taken(typed: Sig3, unrounded: Range): Range[] {
  const size = sizeOf(typed)
  return roundsFrom(typed, unrounded) ? [spanOf(size, ...unrounded)] : [point(size), unrounded]
}
/** a / b for every way of taking each: the range of each quotient. Every value must be above zero. */
export const quotients = (tops: Range[], bottoms: Range[], scale: Exact = exact(1)): Range[] => tops.flatMap(([lowTop, highTop]) => bottoms.map(([lowBottom, highBottom]): Range => [times(exact(lowTop, highBottom), scale), times(exact(highTop, lowBottom), scale)]))
/** True when a value of three figures is a correct rounding of some value of one of the ranges. */
export const fromAny = (value: Sig3, ranges: Range[]) => ranges.some((range) => roundsFrom(value, range))
/** True when a value of three figures is a value of one of the ranges cut off after its third figure. */
export const cutFromAny = (value: Sig3, ranges: Range[]) => ranges.some((range) => cutOffFrom(value, range))

// What the kinetics engine added (spec 19.3): numbers too small or too large to write out, the products that go
// with the quotients above, and an exact value written to three figures.

/**
 * A number typed to exactly three significant figures, plainly or with a power of ten: "50.3", "0.00200",
 * "3.22e-7", "3.22E-7", "3.22 x 10^-7", "3.22 × 10^-7", "3.22×10⁻⁷". Null otherwise. With a power of ten the figures
 * in front are read as `parseSig3` reads them, so there are three of them, and the power is a whole number of at
 * most two digits.
 */
export function parseFigures(text: string): Sig3 | null {
  const SUPERSCRIPTS = '⁰¹²³⁴⁵⁶⁷⁸⁹'
  const plain = text
    .trim()
    .replace(/[⁻⁺⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => (c === '⁻' ? '-' : c === '⁺' ? '+' : String(SUPERSCRIPTS.indexOf(c))))
    .replaceAll('−', '-')
  const match = /^([^eExX×*]+?)\s*(?:[eE]|[xX×*]\s*10\s*\^?)\s*([+-]?\d{1,2})$/.exec(plain)
  if (!match) return parseSig3(plain)
  const figures = parseSig3(match[1]!)
  if (figures === null) return null
  const value = { mantissa: figures.mantissa, exponent: figures.exponent + Number(match[2]) }
  return isSig3(value) ? value : null
}

const SUPERSCRIPT_DIGITS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹']
/** A whole number as a raised power, with a true minus sign: -7 is "⁻⁷". */
export const superscript = (n: number) => `${n < 0 ? '⁻' : ''}${[...String(Math.abs(n))].map((d) => SUPERSCRIPT_DIGITS[Number(d)]).join('')}`

/**
 * A Sig3 as a page writes it: plainly where that is short ("50.3", "0.00200"), and with a power of ten where it
 * would be a row of zeros ("3.22 × 10⁻⁷", "6.01 × 10⁵"). Plain from 0.001 up to, and not at, 100 000. A negative
 * number has a hyphen in front, as `formatSig3` writes it.
 */
export function formatFigures(value: Sig3): string {
  const { mantissa, exponent } = value
  if (exponent >= -5 && exponent <= 2) return formatSig3(value)
  const digits = String(Math.abs(mantissa))
  return `${mantissa < 0 ? '-' : ''}${digits[0]}.${digits.slice(1)} × 10${superscript(exponent + 2)}`
}

/** a x b for every way of taking each: the range of each product. Every value must be above zero. */
export const products = (as: Range[], bs: Range[], scale: Exact = exact(1)): Range[] => as.flatMap(([lowA, highA]) => bs.map(([lowB, highB]): Range => [times(times(lowA, lowB), scale), times(times(highA, highB), scale)]))

/** A fraction in its lowest terms: the products of long chains of them stay short. */
export function reduced([numerator, denominator]: Exact): Exact {
  let [a, b] = [numerator < 0n ? -numerator : numerator, denominator]
  while (b !== 0n) [a, b] = [b, a % b]
  return a === 0n ? [0n, 1n] : [numerator / a, denominator / a]
}

/** An exact value as a double: the nearest to its numerator over the nearest to its denominator. For display and for tolerances; no entry is judged on it. */
export const toNumber = ([numerator, denominator]: Exact): number => Number(numerator) / Number(denominator)

/**
 * An exact value written to three significant figures, a half going away from zero: what a notebook shows for a
 * figure it works out itself. Zero has no such writing and gives null.
 */
export function toSig3(value: Exact): Sig3 | null {
  const negative = value[0] < 0n
  const [n, d] = negative ? [-value[0], value[1]] : value
  if (n === 0n) return null
  // The power of ten that puts the value between 100 and 1000.
  let exponent = 0
  while (n * 10n ** BigInt(Math.max(0, -exponent)) >= 1000n * d * 10n ** BigInt(Math.max(0, exponent))) exponent++
  while (n * 10n ** BigInt(Math.max(0, -exponent)) < 100n * d * 10n ** BigInt(Math.max(0, exponent))) exponent--
  const [top, bottom] = [n * 10n ** BigInt(Math.max(0, -exponent)), d * 10n ** BigInt(Math.max(0, exponent))]
  let mantissa = Number((2n * top + bottom) / (2n * bottom))
  if (mantissa === 1000) [mantissa, exponent] = [100, exponent + 1]
  return { mantissa: negative ? -mantissa : mantissa, exponent }
}

/**
 * True when a signed result of three figures is within so many percent of a stored value, the edge included.
 * Exact: the stored value is `stored` / `scale`, of whole numbers.
 */
export function withinPercent(result: Sig3, stored: number, scale: number, percent: number): boolean {
  const size = sizeOf(result)
  const signed: Exact = result.mantissa < 0 ? [-size[0], size[1]] : size
  // |result - stored/scale| x 100 <= percent x |stored/scale|
  const gap = signed[0] * BigInt(scale) - BigInt(stored) * signed[1]
  return (gap < 0n ? -gap : gap) * 100n <= BigInt(percent) * BigInt(Math.abs(stored)) * signed[1]
}

// What the measurement and density lab added (spec 22.3): numbers typed to any count of figures, and the two
// rules a worked-out number is rounded by there. A sum or a difference is given to the decimal place of its
// least exact term; a product or a quotient is given to as many significant figures as its factor with the
// fewest. Nothing above this line is changed by it: a `Sig3` is a `Figures` whose mantissa has three digits.

/**
 * A number as it was typed, with the figures it was typed to: `mantissa` x 10^`exponent`. Every digit of the
 * mantissa is a significant figure. Zeros in front are not kept. Behind a decimal point every figure counts, so
 * "24.30" is 2430 x 10^-2, of four figures. Zeros that end a whole number only hold the others in their places,
 * so they go into the exponent: "1200" is 12 x 10^2, of two figures. Zero has no significant figure and keeps its
 * decimal places: "0.0" is 0 x 10^-1.
 */
export interface Figures {
  mantissa: number
  exponent: number
}

/** The most digits a typed number may have: a whole number of so many digits is exact in a double. */
const MAX_DIGITS = 9

/** A plain decimal number as it was typed, with or without a sign ("24.30", "-0.4", "+0.4", ".5", "1200"); null otherwise, and for one of more than nine digits. A typed minus sign (U+2212) is read as a hyphen. */
export function parseDecimal(text: string): Figures | null {
  const match = /^([+-]?)(\d*)(?:\.(\d+))?$/.exec(text.trim().replace('−', '-'))
  if (!match || (match[2] === '' && match[3] === undefined)) return null
  const [, sign, whole = '', decimals] = match
  let digits = (whole + (decimals ?? '')).replace(/^0+/, '')
  let exponent = -(decimals?.length ?? 0)
  if (decimals === undefined) {
    const kept = digits.replace(/0+$/, '')
    exponent = digits.length - kept.length
    digits = kept
  }
  if (digits.length > MAX_DIGITS || (decimals?.length ?? 0) > 12) return null
  // Not negative zero: JSON writes it as 0, so a stored "-0.0" would not come back as it went in.
  return { mantissa: (sign === '-' ? -1 : 1) * Number(digits || '0') || 0, exponent }
}

/** True for a Figures the parser could have made: whole numbers within its bounds, and no negative zero. */
export const isFigures = (value: unknown): value is Figures => {
  if (typeof value !== 'object' || value === null) return false
  const { mantissa, exponent, ...rest } = value as Record<string, unknown>
  return Object.keys(rest).length === 0 && Number.isInteger(mantissa) && Math.abs(mantissa as number) < 10 ** MAX_DIGITS && !Object.is(mantissa, -0) && Number.isInteger(exponent) && Math.abs(exponent as number) <= 12 && !Object.is(exponent, -0)
}

/** How many significant figures a number was typed to: none for zero. */
export const figuresIn = ({ mantissa }: Figures): number => (mantissa === 0 ? 0 : String(Math.abs(mantissa)).length)
/** How many decimal places a number was typed to. */
export const decimalsIn = ({ exponent }: Figures): number => Math.max(0, -exponent)

/** A Figures as it is written: "24.30", "-0.4", "0.0", "1200". A negative number has a hyphen in front. */
export function formatDecimal({ mantissa, exponent }: Figures): string {
  const digits = String(Math.abs(mantissa))
  const sign = mantissa < 0 ? '-' : ''
  if (exponent >= 0) return sign + (mantissa === 0 ? '0' : digits + '0'.repeat(exponent))
  const padded = digits.padStart(1 - exponent, '0')
  return `${sign}${padded.slice(0, exponent)}.${padded.slice(exponent)}`
}

/** The exact value of a Figures, with its sign. */
export const exactOf = ({ mantissa, exponent }: Figures): Exact => times(power(exponent), mantissa)

const negated = ([low, high]: Range): Range => [[-high[0], high[1]], [-low[0], low[1]]]
const isPowerOfTen = (n: number) => /^10*$/.test(String(n))

/** The stretch of values from `below` a size to `above` it, in units of 10^`unitExponent`, meets the range. */
function meets(value: Figures, range: Range, unitExponent: number, below: Exact, above: Exact, openAbove = false): boolean {
  const [low, high] = value.mantissa < 0 ? negated(range) : range
  const size = times(power(value.exponent), Math.abs(value.mantissa))
  const unit = power(unitExponent)
  const down: Exact = [size[0] * unit[1] * below[1] - unit[0] * below[0] * size[1], size[1] * unit[1] * below[1]]
  const up: Exact = [size[0] * unit[1] * above[1] + unit[0] * above[0] * size[1], size[1] * unit[1] * above[1]]
  return compare(down, high) <= 0 && (openAbove ? compare(up, low) > 0 : compare(up, low) >= 0)
}

/**
 * True when a number is a correct rounding, to the significant figures it was typed to, of some value in the
 * range: `roundsFrom` for any count of figures, and with the number's sign. Both neighbours are right at an exact
 * tie. Zero is no rounding to significant figures of anything.
 */
export function roundsToFigures(value: Figures, range: Range): boolean {
  if (value.mantissa === 0) return false
  // Below a power of ten the next number down is ten times as fine, so the stretch reaches a twentieth of a unit down.
  return meets(value, range, value.exponent, exact(1, isPowerOfTen(Math.abs(value.mantissa)) ? 20 : 2), exact(1, 2))
}

/** True when a number is a value of the range cut off after its last figure where it should have been rounded. Asked only of a number that is not a correct rounding. */
export const cutOffToFigures = (value: Figures, range: Range): boolean => value.mantissa !== 0 && meets(value, range, value.exponent, exact(0), exact(1), true)

/** The place a number was typed to, as a power of ten: its last decimal place, or the units for a whole number. */
const placeOf = (value: Figures) => Math.min(value.exponent, 0)

/** True when a number is a correct rounding, to the decimal place it was typed to, of some value in the range: half a unit of that place either way, both ends included. */
export const roundsToPlace = (value: Figures, range: Range): boolean => meets(value, range, placeOf(value), exact(1, 2), exact(1, 2))

/** True when a number is a value of the range cut off after its last decimal place. Asked only of a number that is not a correct rounding. */
export const cutOffToPlace = (value: Figures, range: Range): boolean => meets(value, range, placeOf(value), exact(0), exact(1), true)

/**
 * An exact value written to so many significant figures, a half going away from zero: `toSig3` for any count.
 * Zero has no such writing and gives null. A whole number that needs zeros to hold its places is written with
 * them ("1200" for 1.20 x 10^3), and so reads back with fewer figures than it was given.
 */
export function toFigures(value: Exact, figures: number): Figures | null {
  const negative = value[0] < 0n
  const [n, d] = negative ? [-value[0], value[1]] : value
  if (n === 0n || !Number.isInteger(figures) || figures < 1 || figures > MAX_DIGITS) return null
  const [floor, ceiling] = [10n ** BigInt(figures - 1), 10n ** BigInt(figures)]
  const scaled = (exponent: number): [bigint, bigint] => [n * 10n ** BigInt(Math.max(0, -exponent)), d * 10n ** BigInt(Math.max(0, exponent))]
  let exponent = 0
  while (scaled(exponent)[0] >= ceiling * scaled(exponent)[1]) exponent++
  while (scaled(exponent)[0] < floor * scaled(exponent)[1]) exponent--
  const [top, bottom] = scaled(exponent)
  let mantissa = Number((2n * top + bottom) / (2n * bottom))
  if (mantissa === Number(ceiling)) [mantissa, exponent] = [Number(floor), exponent + 1]
  return { mantissa: negative ? -mantissa : mantissa, exponent }
}

/** An exact value written to so many decimal places, a half going away from zero. */
export function toDecimals(value: Exact, decimals: number): Figures {
  const negative = value[0] < 0n
  const [n, d] = negative ? [-value[0], value[1]] : value
  const mantissa = Number((2n * n * 10n ** BigInt(decimals) + d) / (2n * d))
  return { mantissa: negative && mantissa !== 0 ? -mantissa : mantissa, exponent: -decimals }
}

/** The decimal places a sum or a difference is given to: those of its least exact term. */
export const decimalsOfSum = (...terms: Figures[]): number => Math.min(...terms.map(decimalsIn))
/** The significant figures a product or a quotient is given to: those of its factor with the fewest. */
export const figuresOfProduct = (...factors: Figures[]): number => Math.min(...factors.map(figuresIn))

/**
 * How a typed number stands against the value it should be a rounding of: right; right arithmetic kept to too
 * many figures or to too few; cut off where it should have been rounded; or wrong.
 */
export type Rounding = 'right' | 'too-many' | 'too-few' | 'cut-off' | 'wrong'

/** A product or a quotient, which is given to `figures` significant figures: how a typed number stands against its value. */
export function judgeFigures(typed: Figures, value: Range, figures: number): Rounding {
  const given = figuresIn(typed)
  if (given === figures) return roundsToFigures(typed, value) ? 'right' : cutOffToFigures(typed, value) ? 'cut-off' : 'wrong'
  if (given > figures) return roundsToFigures(typed, value) || cutOffToFigures(typed, value) ? 'too-many' : 'wrong'
  return roundsToFigures(typed, value) ? 'too-few' : 'wrong'
}

/** A sum or a difference, which is given to `decimals` decimal places: how a typed number stands against its value. */
export function judgeDecimals(typed: Figures, value: Range, decimals: number): Rounding {
  const given = decimalsIn(typed)
  if (given === decimals) return roundsToPlace(typed, value) ? 'right' : cutOffToPlace(typed, value) ? 'cut-off' : 'wrong'
  if (given > decimals) return roundsToPlace(typed, value) || cutOffToPlace(typed, value) ? 'too-many' : 'wrong'
  return roundsToPlace(typed, value) ? 'too-few' : 'wrong'
}
