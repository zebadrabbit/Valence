import type { PartId } from '@/chem-data/density/data'
import { compare, decimalsOfSum, exact, exactOf, figuresIn, figuresOfProduct, isFigures, judgeDecimals, judgeFigures, point, roundsToFigures, type Exact, type Figures, type Rounding } from '../figures'
import type { Candidate, DensityModel } from './model'
import { nearEnough, stepE3, type Eye, type Instrument } from './readings'

// The notebook (spec 22.3): a part's entries in the order they are made, and whether each is right. A reading is
// held to what its instrument showed. A worked-out entry is held to the learner's own entries above it and to
// nothing hidden, by the two rounding rules, which here are the lesson:
//
// - a sum or a difference is given to the decimal place of its least exact term;
// - a product or a quotient is given to as many significant figures as its factor with the fewest.
//
// Every reading has the decimal places its instrument gives, so a difference of two readings is exact, and so is a
// product or a quotient of two entries: there is one value an entry must be a rounding of (either neighbour at an
// exact tie), and one count of figures or of decimal places it must have. An entry with the right arithmetic and
// the wrong count is told which rule it broke.

export type Field =
  // part 1: the readings, then what is worked out
  | 'lengthCm'
  | 'widthCm'
  | 'lengthMm'
  | 'widthMm'
  | 'firstVolume'
  | 'temperature'
  | 'firstMass'
  | 'areaCm'
  | 'areaMm'
  | 'thermometerOff'
  // part 2
  | 'emptyMass'
  | 'liquidVolume'
  | 'fullMass'
  | 'liquidMass'
  | 'liquidDensity'
  | 'liquid'
  // part 3
  | 'piecesMass'
  | 'waterLevel'
  | 'finalLevel'
  | 'metalVolume'
  | 'metalDensity'
  | 'metal'

/** A part's entries in the order they are made: its readings, then what is worked out from them. */
export const FIELDS: Record<PartId, readonly Field[]> = {
  reading: ['lengthCm', 'widthCm', 'lengthMm', 'widthMm', 'firstVolume', 'temperature', 'firstMass', 'areaCm', 'areaMm', 'thermometerOff'],
  liquid: ['emptyMass', 'liquidVolume', 'fullMass', 'liquidMass', 'liquidDensity', 'liquid'],
  metal: ['piecesMass', 'waterLevel', 'finalLevel', 'metalVolume', 'metalDensity', 'metal'],
}

/** The instrument a reading is taken from; absent for an entry that is worked out or chosen. */
export const READ_FROM: Partial<Record<Field, Instrument>> = {
  lengthCm: 'ruler-cm',
  widthCm: 'ruler-cm',
  lengthMm: 'ruler-mm',
  widthMm: 'ruler-mm',
  firstVolume: 'cylinder',
  temperature: 'thermometer',
  firstMass: 'balance',
  emptyMass: 'balance',
  liquidVolume: 'cylinder',
  fullMass: 'balance',
  piecesMass: 'balance',
  waterLevel: 'cylinder',
  finalLevel: 'cylinder',
}

/** What kind of entry a field is: a reading, a number worked out by one of the two rules, or the unknown's name. */
export type Kind = 'reading' | 'difference' | 'product' | 'quotient' | 'name'
export const kindOf = (field: Field): Kind =>
  field in READ_FROM ? 'reading' : field === 'liquid' || field === 'metal' ? 'name' : field === 'areaCm' || field === 'areaMm' ? 'product' : field === 'liquidDensity' || field === 'metalDensity' ? 'quotient' : 'difference'

/** The entries a worked-out entry is worked from. Changing one of them empties it. */
export const WORKED_FROM: Partial<Record<Field, readonly Field[]>> = {
  areaCm: ['lengthCm', 'widthCm'],
  areaMm: ['lengthMm', 'widthMm'],
  thermometerOff: ['temperature'],
  liquidMass: ['fullMass', 'emptyMass'],
  liquidDensity: ['liquidMass', 'liquidVolume'],
  liquid: ['liquidDensity'],
  metalVolume: ['finalLevel', 'waterLevel'],
  metalDensity: ['piecesMass', 'metalVolume'],
  metal: ['metalDensity'],
}

/** Every entry that is worked, directly or through another, from a field. */
export function dependents(field: Field): Field[] {
  const direct = (Object.keys(WORKED_FROM) as Field[]).filter((later) => WORKED_FROM[later]!.includes(field))
  return [...new Set(direct.flatMap((later) => [later, ...dependents(later)]))]
}

/** A liquid's level as it was read: the reading in tenths of a millilitre, and where the eye was. */
export interface Level {
  value: number
  eye: Eye
}

/** What a field holds: a reading in units of its last figure, a level with the eye it was read from, a number as it was typed, or a row of the table by its id. */
export type Value = number | Level | Figures | string
export type Entries = Record<Field, Value | null>

export const NO_ENTRIES: Entries = {
  lengthCm: null,
  widthCm: null,
  lengthMm: null,
  widthMm: null,
  firstVolume: null,
  temperature: null,
  firstMass: null,
  areaCm: null,
  areaMm: null,
  thermometerOff: null,
  emptyMass: null,
  liquidVolume: null,
  fullMass: null,
  liquidMass: null,
  liquidDensity: null,
  liquid: null,
  piecesMass: null,
  waterLevel: null,
  finalLevel: null,
  metalVolume: null,
  metalDensity: null,
  metal: null,
}

export const isLevel = (value: unknown): value is Level => typeof value === 'object' && value !== null && 'eye' in value
const isTyped = (value: Value | null): value is Figures => typeof value === 'object' && value !== null && 'mantissa' in value

/** What an entry looks like when it is not right, where the lab knows: it names the slip, and which rule was broken, and never the value. */
export type Slip =
  /** A level read with the eye above it or below it. */
  | 'eye-above'
  | 'eye-below'
  /** A sum or a difference with more decimal places than its least exact term, or fewer. */
  | 'decimals-too-many'
  | 'decimals-too-few'
  /** A product or a quotient with more significant figures than its factor with the fewest, or fewer. */
  | 'figures-too-many'
  | 'figures-too-few'
  /** Cut off where it should have been rounded. */
  | 'cut-off'
  | 'wrong-sign'
  /** Volume over mass. */
  | 'upside-down'
  /** The mass of the cylinder and the liquid together, taken for the liquid's. */
  | 'cylinder-not-taken-off'
  /** The level after the pieces went in, taken for the rise. */
  | 'level-not-rise'

/** Whether an entry is right; `slip` is null where it is, and where it is not and looks like no slip the lab knows. */
export interface Verdict {
  follows: boolean
  slip: Slip | null
}
const FOLLOWS: Verdict = { follows: true, slip: null }
const not = (slip: Slip | null = null): Verdict => ({ follows: false, slip })

/** What each instrument showed for a part's readings, at eye level: a scale in thousandths of its unit, the balance in hundredths of a gram. Null where the bench has not shown it. */
export type Shown = Partial<Record<Field, number | null>>

/** A reading as a number with its figures: 62 on the centimetre ruler is 6.2, of two figures. */
function asFigures(m: DensityModel, field: Field, value: Value | null): Figures | null {
  const instrument = READ_FROM[field]
  if (instrument === undefined) return isTyped(value) ? value : null
  const reading = isLevel(value) ? value.value : typeof value === 'number' ? value : null
  return reading === null ? null : { mantissa: reading, exponent: -(instrument === 'balance' ? m.balanceDecimals : m.scales[instrument].decimals) }
}

const SUM_SLIP: Partial<Record<Rounding, Slip>> = { 'too-many': 'decimals-too-many', 'too-few': 'decimals-too-few', 'cut-off': 'cut-off' }
const PRODUCT_SLIP: Partial<Record<Rounding, Slip>> = { 'too-many': 'figures-too-many', 'too-few': 'figures-too-few', 'cut-off': 'cut-off' }
const negative = ([n, d]: Exact): Exact => [-n, d]
const isZero = (value: Exact) => value[0] === 0n

/** a - b, given to the decimal places of the less exact of the two. */
function difference(typed: Figures, a: Figures, b: Figures): Verdict {
  const [x, y] = [exactOf(a), exactOf(b)]
  const value: Exact = [x[0] * y[1] - y[0] * x[1], x[1] * y[1]]
  const decimals = decimalsOfSum(a, b)
  const rounding = judgeDecimals(typed, point(value), decimals)
  if (rounding === 'right') return FOLLOWS
  if (!isZero(value) && judgeDecimals(typed, point(negative(value)), decimals) === 'right') return not('wrong-sign')
  return not(SUM_SLIP[rounding] ?? null)
}

/**
 * A whole number that ends in zeros does not say whether they count: "70" may be 7 x 10, of one figure, or 70, of
 * two. Each way it may be read, the fewest figures first, which is how it is stored. An area of 70 cm² from a
 * ruler read to two figures can be typed no other way, as an entry takes no power of ten.
 */
const waysToRead = (typed: Figures): Figures[] => Array.from({ length: Math.max(0, typed.exponent) + 1 }, (_, zeros) => ({ mantissa: typed.mantissa * 10 ** zeros, exponent: typed.exponent - zeros })).filter(isFigures)

/** A product or a quotient of two entries, given to the significant figures of the one with the fewest; `others` are values it may have been mistaken for, each with its slip. */
function product(typed: Figures, value: Exact, figures: number, others: readonly (readonly [Exact | null, Slip])[] = []): Verdict {
  // Zeros that end a whole number are counted where that makes the figures the rule asks for.
  if (waysToRead(typed).some((read) => figuresIn(read) === figures && judgeFigures(read, point(value), figures) === 'right')) return FOLLOWS
  const rounding = judgeFigures(typed, point(value), figures)
  if (rounding === 'right') return FOLLOWS
  if (rounding !== 'wrong') return not(PRODUCT_SLIP[rounding] ?? null)
  if (typed.mantissa < 0 && judgeFigures({ ...typed, mantissa: -typed.mantissa }, point(value), figures) !== 'wrong') return not('wrong-sign')
  // A slip is known by its value, at whatever figures it was typed to.
  for (const [other, slip] of others) if (other !== null && compare(other, exact(0)) > 0 && roundsToFigures(typed, point(other))) return not(slip)
  return not()
}

/** The row of a table nearest a density; at an exact tie, either. True when `id` is such a row. */
function nearest(candidates: readonly Candidate[], density: Figures, id: string): boolean {
  const size = exactOf(density)
  const distance = (c: Candidate): Exact => {
    const gap: Exact = [size[0] * 1000n - BigInt(c.densityE3) * size[1], size[1] * 1000n]
    return gap[0] < 0n ? negative(gap) : gap
  }
  const chosen = candidates.find((c) => c.id === id)
  return chosen !== undefined && density.mantissa > 0 && candidates.every((c) => compare(distance(chosen), distance(c)) <= 0)
}

/** a / b as an exact value; null where b is not above zero. */
const over = (a: Figures | null, b: Figures | null): Exact | null => (a === null || b === null || b.mantissa <= 0 ? null : exact(exactOf(a), exactOf(b)))

/**
 * Whether one entry is right; null where it is empty or something it is worked from is. `shown` is what the
 * instruments showed, for the readings: a reading is right when it is near enough to it and, for a level, when
 * the eye was level with it.
 */
export function verdictOf(m: DensityModel, shown: Shown, entries: Entries, field: Field): Verdict | null {
  const value = entries[field]
  if (value === null) return null
  const instrument = READ_FROM[field]
  if (instrument !== undefined) {
    const at = shown[field]
    if (at === undefined || at === null) return null
    if (isLevel(value)) return value.eye !== 'level' ? not(value.eye === 'above' ? 'eye-above' : 'eye-below') : nearEnough(m, instrument, value.value, at) ? FOLLOWS : not()
    return typeof value === 'number' && nearEnough(m, instrument, value, at) ? FOLLOWS : not()
  }
  const [first, second] = (WORKED_FROM[field] ?? []).map((from) => asFigures(m, from, entries[from]))
  if (first === null || first === undefined) return null
  if (field === 'liquid' || field === 'metal') return typeof value === 'string' && nearest(field === 'liquid' ? m.liquids : m.metals, first, value) ? FOLLOWS : not()
  if (!isTyped(value)) return not()
  if (field === 'thermometerOff') return difference(value, first, { mantissa: m.icePointTenths, exponent: -m.scales.thermometer.decimals })
  if (second === null || second === undefined) return null
  switch (field) {
    case 'liquidMass':
    case 'metalVolume':
      return difference(value, first, second)
    case 'areaCm':
    case 'areaMm':
      return product(value, exact([exactOf(first)[0] * exactOf(second)[0], exactOf(first)[1] * exactOf(second)[1]]), figuresOfProduct(first, second))
    case 'liquidDensity': {
      const quotient = over(first, second)
      // No density follows from a mass or a volume that is not above zero.
      if (quotient === null || first.mantissa <= 0) return not()
      return product(value, quotient, figuresOfProduct(first, second), [
        [over(second, first), 'upside-down'],
        [over(asFigures(m, 'fullMass', entries.fullMass), second), 'cylinder-not-taken-off'],
      ])
    }
    case 'metalDensity': {
      const quotient = over(first, second)
      if (quotient === null || first.mantissa <= 0) return not()
      return product(value, quotient, figuresOfProduct(first, second), [
        [over(second, first), 'upside-down'],
        [over(first, asFigures(m, 'finalLevel', entries.finalLevel)), 'level-not-rise'],
      ])
    }
    default:
      return null
  }
}

/** How many significant figures a field's number has, as it stands in the notebook: for the page, which shows the count beside an entry once it may. Null for an empty field and for a name. */
export function figuresOfEntry(m: DensityModel, entries: Entries, field: Field): number | null {
  const figures = asFigures(m, field, entries[field])
  return figures === null ? null : figuresIn(figures)
}

/** A reading's units of its last figure, in thousandths of its instrument's unit: for comparing it with what a scale shows. */
export const readingE3 = (m: DensityModel, instrument: Instrument, value: number) => (instrument === 'balance' ? value : value * stepE3(m.scales[instrument].decimals))
