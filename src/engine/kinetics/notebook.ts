import { compare, cutFromAny, cutOffFrom, exact, fromAny, point, products, quotients, reduced, roundsFrom, sizeOf, spanOf, taken, times, toNumber, toSig3, type Exact, type Range, type Sig3 } from '../figures'
import { bottleStrength, centiKelvin, concentration, hasTemperature, power, reactantOf, runOf, strengthsProduct, temperatureRuns, usedUp, type KineticsModel } from './model'
import { ln } from './numbers'
import type { LabSetup } from './setup'

// The notebook (spec 19.3): its two sheets, their entries in the order they are worked out, whether each follows
// from the learner's own numbers, and what the notebook fills in by itself. Nothing here uses a hidden value: an
// entry is held to the times in the table, which are the learner's own, to what the bench shows (the bottles'
// strengths, the volumes, the thermometer) and to the entries above it. The model's orders, rate constant and
// activation energy are not read in this file.
//
// THE ROUNDING CONVENTION is the calorimetry lab's (../figures.ts). A number is typed to three significant figures
// and must be a correct rounding, either neighbour at an exact tie, of its relation worked on the values above it,
// each taken as it was typed or as the unrounded value it was rounded from. A figure that is worked on the way and
// is no entry (the amount used up by the end of a run), a time read off the watch and the gas constant may
// likewise be taken in full or rounded to three figures.
//
// WHAT THE NOTEBOOK FILLS is worked from unrounded values and written to three significant figures: the strengths
// and the rate of each other run, each run's rate constant, and their mean. For the graph it fills, for each
// temperature, the temperature in kelvin (the reading plus 273.15, kept as it comes), one over that to four
// significant figures, and the natural logarithm of the rate constant to three decimal places, worked from the
// unrounded rate constant. The line is the least-squares line through those points as they are written, and a
// place on it is given to three decimal places.

export const SHEET_IDS = ['rate-law', 'temperature'] as const
export type SheetId = (typeof SHEET_IDS)[number]
/** The sheets a model's notebook has: both, or the first alone where the model has no baths and so no part on temperature. */
export const sheetIdsOf = (m: KineticsModel): readonly SheetId[] => (hasTemperature(m) ? SHEET_IDS : ['rate-law'])

/** The kinds of entry. A strength and an order are asked once for each reactant. */
export type FieldKind = 'concentration' | 'rate' | 'order' | 'rateConstant' | 'unit' | 'first' | 'second' | 'slope' | 'energy'
/** An entry's name: its kind, and after a colon the reactant where it is asked of one ("order:iodide"). */
export type Field = string
export const kindOf = (field: Field): FieldKind => field.split(':')[0] as FieldKind
export const reactantIdOf = (field: Field): string | null => field.split(':')[1] ?? null

/** A sheet's entries in the order they are worked out. */
export function fieldsOf(m: KineticsModel, sheet: SheetId): Field[] {
  if (sheet === 'temperature') return ['first', 'second', 'slope', 'energy']
  return [...m.reactants.map((r) => `concentration:${r.id}`), 'rate', ...m.reactants.map((r) => `order:${r.id}`), 'rateConstant', 'unit']
}

/** A typed number of three figures; or a choice: an order, the power of mol/L in a unit, or a place on the line by its number. */
export type Value = number | Sig3
export type Entries = Readonly<Record<Field, Value | null>>
export const noEntries = (m: KineticsModel, sheet: SheetId): Record<Field, Value | null> => Object.fromEntries(fieldsOf(m, sheet).map((field) => [field, null]))

/** The time of each run in the table, in tenths of a second: the learner's own measurements. */
export type Timings = Readonly<Record<string, number>>

/** The kind of slip an entry that does not follow looks like, where it looks like one. It names the slip and never the value. */
export type Slip = 'cut-off' | 'wrong-sign' | 'not-diluted' | 'count-left-out' | 'joules-for-kilojoules'
/** Whether an entry follows; `slip` is null where it follows, and where it does not and looks like no slip the engine knows. */
export interface Verdict {
  follows: boolean
  slip: Slip | null
}
const FOLLOWS: Verdict = { follows: true, slip: null }
const not = (slip: Slip | null = null): Verdict => ({ follows: false, slip })

/** An exact value in full, or as it is written to three figures. */
const fullOrRounded = (...values: Exact[]): Range => spanOf(...values.flatMap((value) => [value, sizeOf(toSig3(value)!)]))
const isSig3Value = (value: Value | null | undefined): value is Sig3 => typeof value === 'object' && value !== null
const isChoice = (value: Value | null | undefined): value is number => typeof value === 'number'

/** The rate of a run, in mol/(L·s): what is used up by its end, over its time. Exact. */
export const rateOf = (m: KineticsModel, runId: string, timings: Timings): Exact => reduced(exact(times(usedUp(m, runOf(m, runId).mixtureId), 10), timings[runId]!))

/** The rate constant a run gives with a set of orders: its rate over the product of the strengths, each raised to its order. Exact. */
export const constantOf = (m: KineticsModel, runId: string, timings: Timings, orders: Readonly<Record<string, number>>): Exact =>
  reduced(exact(rateOf(m, runId, timings), strengthsProduct(m, runOf(m, runId).mixtureId, orders)))

/** The mean of some exact values. */
export const meanOf = (values: Exact[]): Exact => reduced(exact(values.reduce<Exact>((sum, [n, d]) => reduced([sum[0] * d + n * sum[1], sum[1] * d]), [0n, 1n]), values.length))

/** The ways the rate of a run may be worked: what is used up and the time each taken in full or to three figures, and the strength of what is used up rounded before it is shared out. */
function rateRange(m: KineticsModel, runId: string, timings: Timings): Range {
  const { mixtureId } = runOf(m, runId)
  const strength = concentration(m, mixtureId, m.end.solutionId)
  const used = fullOrRounded(usedUp(m, mixtureId), exact(sizeOf(toSig3(strength)!), m.end.per))
  return quotients([used], [fullOrRounded(exact(timings[runId]!, 10))])[0]!
}

/**
 * The ways the rate of the reference run may be worked from the learner's own entries; null while one of them is
 * missing. Where what is used up comes from a reactant's own bottle, its strength in the mixture is an entry above
 * the rate, and the rate is worked from that entry, taken as it was typed or as the unrounded value it was rounded
 * from, as every entry is. Where it comes from a bottle of its own, no entry gives its strength, and the rate is
 * worked from the bench alone.
 */
function rateRanges(m: KineticsModel, entries: Entries, timings: Timings): Range[] | null {
  const reference = runOf(m, m.referenceRunId)
  const own = m.reactants.find((reactant) => reactant.solutionId === m.end.solutionId)
  if (own === undefined) return [rateRange(m, reference.id, timings)]
  const typed = entries[`concentration:${own.id}`]
  if (!isSig3Value(typed)) return null
  const used = taken(typed, point(concentration(m, reference.mixtureId, m.end.solutionId))).map(([low, high]) => fullOrRounded(exact(low, m.end.per), exact(high, m.end.per)))
  return quotients(used, [fullOrRounded(exact(timings[reference.id]!, 10))])
}

/** The orders a learner has entered, by reactant; null until all are. */
export function enteredOrders(m: KineticsModel, entries: Entries): Record<string, number> | null {
  const orders: Record<string, number> = {}
  for (const reactant of m.reactants) {
    const order = entries[`order:${reactant.id}`]
    if (!isChoice(order)) return null
    orders[reactant.id] = order
  }
  return orders
}

/**
 * Whether an order follows from the two runs its question names: it is the choice nearest to the power that takes
 * the ratio of the two strengths to the ratio of the two rates; at an exact tie, either. Exact: the squares of the
 * ratios are compared, and no logarithm is taken.
 */
function orderFollows(m: KineticsModel, reactantId: string, order: number, timings: Timings): boolean {
  const [first, second] = m.orderRuns[reactantId]!
  const { solutionId } = reactantOf(m, reactantId)
  let rates = exact(rateOf(m, second, timings), rateOf(m, first, timings))
  let strengths = exact(concentration(m, runOf(m, second).mixtureId, solutionId), concentration(m, runOf(m, first).mixtureId, solutionId))
  if (compare(strengths, exact(1)) === 0) throw new Error(`the runs "${first}" and "${second}" hold the same strength of "${reactantId}"`)
  if (compare(strengths, exact(1)) < 0) [rates, strengths] = [exact(1, rates), exact(1, strengths)]
  const squared = reduced(times(rates, rates))
  return m.orderChoices.every((other) => {
    if (other === order) return true
    // Between two choices the line falls where the rates' ratio is the strengths' ratio to half their sum.
    const edge = power(strengths, order + other)
    return order < other ? compare(squared, edge) <= 0 : compare(squared, edge) >= 0
  })
}

/** The ways the rate constant of the reference run may be worked from the learner's own entries; null while one of them is missing. */
function constantRanges(m: KineticsModel, entries: Entries, timings: Timings): Range[] | null {
  const { rate } = entries
  const orders = enteredOrders(m, entries)
  const unrounded = rateRanges(m, entries, timings)
  if (!isSig3Value(rate) || orders === null || unrounded === null) return null
  const { mixtureId } = runOf(m, m.referenceRunId)
  let ranges = unrounded.flatMap((range) => taken(rate, range))
  for (const reactant of m.reactants) {
    const strength = entries[`concentration:${reactant.id}`]
    if (!isSig3Value(strength)) return null
    const order = orders[reactant.id]!
    if (order === 0) continue
    const ways = taken(strength, point(concentration(m, mixtureId, reactant.solutionId)))
    ranges = quotients(ranges, ways.map(([low, high]): Range => [power(low, order), power(high, order)]))
  }
  return ranges
}

/** A point of the graph of part 3: one temperature's run. */
export interface Point {
  runId: string
  /** The thermometer's reading, in tenths of a degree Celsius, and the same in hundredths of a kelvin. */
  tenths: number
  centiKelvin: number
  /** One over the temperature in kelvin, to four significant figures, in millionths of a reciprocal kelvin. */
  xMicro: number
  /** The run's rate constant, unrounded. */
  constant: Exact
  /** Its natural logarithm, in thousandths. */
  yMilli: number
}

/** A place on the line that can be looked at. */
export interface Place {
  xMicro: number
  yMilli: number
}

/** The points of the graph, in the order of the model's runs: the reference run at the room's temperature, then each bath's. */
export function pointsOf(m: KineticsModel, lab: LabSetup, timings: Timings, orders: Readonly<Record<string, number>>): Point[] {
  return temperatureRuns(m).map((run) => {
    const tenths = run.bathId === null ? lab.roomTenths : lab.bathTenths[run.bathId]!
    const centiK = centiKelvin(m, tenths)
    const constant = constantOf(m, run.id, timings, orders)
    // 1/T in millionths is 10^8 over the hundredths of a kelvin, to the nearest whole number.
    const xMicro = Number((2n * 10n ** 8n + BigInt(centiK)) / (2n * BigInt(centiK)))
    return { runId: run.id, tenths, centiKelvin: centiK, xMicro, constant, yMilli: Math.round(ln(toNumber(constant)) * 1000) }
  })
}

/** The least-squares line through the points as they are written: thousandths of ln k against millionths of 1/T. Exact. */
export function lineOf(points: readonly Pick<Point, 'xMicro' | 'yMilli'>[]): { slope: Exact; intercept: Exact } {
  const n = BigInt(points.length)
  let [sx, sy, sxx, sxy] = [0n, 0n, 0n, 0n]
  for (const { xMicro, yMilli } of points) {
    const [x, y] = [BigInt(xMicro), BigInt(yMilli)]
    sx += x
    sy += y
    sxx += x * x
    sxy += x * y
  }
  const spread = n * sxx - sx * sx
  if (spread === 0n) throw new Error('no line through points at one temperature')
  const slope = reduced([n * sxy - sx * sy, spread])
  return { slope, intercept: reduced([sy * slope[1] - slope[0] * sx, n * slope[1]]) }
}

/** An exact value to the nearest whole number, a half going away from zero. */
function nearest([numerator, denominator]: Exact): number {
  const size = numerator < 0n ? -numerator : numerator
  const whole = Number((2n * size + denominator) / (2n * denominator))
  return numerator < 0n ? -whole : whole
}

/** The places on the line that can be looked at, in the order of 1/T. */
export function placesOf(m: KineticsModel, points: readonly Pick<Point, 'xMicro' | 'yMilli'>[]): Place[] {
  const { slope, intercept } = lineOf(points)
  return Array.from({ length: m.places.count }, (_, i) => {
    const xMicro = m.places.fromMicro + i * m.places.stepMicro
    const [top, bottom] = times(slope, xMicro)
    return { xMicro, yMilli: nearest([top * intercept[1] + intercept[0] * bottom, bottom * intercept[1]]) }
  })
}

/** The slope of the line between two places, in kelvin: the difference in ln k over the difference in 1/T. Exact, with its sign. Null for one place taken twice. */
export function slopeBetween(first: Place, second: Place): Exact | null {
  if (first.xMicro === second.xMicro) return null
  return reduced(exact((second.yMilli - first.yMilli) * 1000, second.xMicro - first.xMicro))
}

const sizeOfExact = ([numerator, denominator]: Exact): Exact => [numerator < 0n ? -numerator : numerator, denominator]
/** The gas constant in J/(mol·K), in full or rounded as far as three figures. */
const gasConstantRange = (m: KineticsModel): Range => fullOrRounded(exact(m.gasConstantE9, 1e9))

/** What a verdict is worked from besides the entries: the times in the table, and for the second sheet the places on the line. */
export interface Context {
  timings: Timings
  places: readonly Place[]
}

/**
 * Whether one entry follows; null where it is empty or something it is worked from is.
 */
export function verdictOf(m: KineticsModel, { timings, places }: Context, entries: Entries, field: Field): Verdict | null {
  const value = entries[field]
  if (value === null || value === undefined) return null
  const reference = runOf(m, m.referenceRunId)
  switch (kindOf(field)) {
    case 'concentration': {
      if (!isSig3Value(value)) return not()
      if (value.mantissa < 0) return not('wrong-sign')
      const { solutionId } = reactantOf(m, reactantIdOf(field)!)
      const range = point(concentration(m, reference.mixtureId, solutionId))
      if (roundsFrom(value, range)) return FOLLOWS
      if (roundsFrom(value, point(bottleStrength(m, solutionId)))) return not('not-diluted')
      return not(cutOffFrom(value, range) ? 'cut-off' : null)
    }
    case 'rate': {
      if (!isSig3Value(value)) return not()
      if (value.mantissa < 0) return not('wrong-sign')
      const ranges = rateRanges(m, entries, timings)
      if (ranges === null) return null
      if (fromAny(value, ranges)) return FOLLOWS
      // All of what is used up, and not its share for each one of the reaction.
      if (m.end.per !== 1 && fromAny(value, ranges.map(([low, high]): Range => [times(low, m.end.per), times(high, m.end.per)]))) return not('count-left-out')
      return not(cutFromAny(value, ranges) ? 'cut-off' : null)
    }
    case 'order':
      return isChoice(value) && m.orderChoices.includes(value) && orderFollows(m, reactantIdOf(field)!, value, timings) ? FOLLOWS : not()
    case 'rateConstant': {
      const ranges = constantRanges(m, entries, timings)
      if (ranges === null) return null
      if (!isSig3Value(value)) return not()
      if (value.mantissa < 0) return not('wrong-sign')
      if (fromAny(value, ranges)) return FOLLOWS
      return not(cutFromAny(value, ranges) ? 'cut-off' : null)
    }
    case 'unit': {
      const orders = enteredOrders(m, entries)
      if (orders === null) return null
      // A rate is in mol/(L·s): the unit of the constant makes up for the powers of mol/L in the strengths.
      return value === 1 - Object.values(orders).reduce((sum, order) => sum + order, 0) ? FOLLOWS : not()
    }
    case 'first':
      return isChoice(value) && places[value] !== undefined ? FOLLOWS : not()
    case 'second':
      if (entries.first === null || entries.first === undefined) return null
      return isChoice(value) && places[value] !== undefined && value !== entries.first ? FOLLOWS : not()
    case 'slope': {
      const slope = enteredSlope(places, entries)
      if (slope === null) return null
      if (!isSig3Value(value)) return not()
      const range = point(sizeOfExact(slope))
      if (roundsFrom(value, range)) return value.mantissa < 0 === slope[0] < 0n ? FOLLOWS : not('wrong-sign')
      return not(cutOffFrom(value, range) ? 'cut-off' : null)
    }
    case 'energy': {
      const slope = enteredSlope(places, entries)
      const typed = entries.slope
      if (slope === null || !isSig3Value(typed)) return null
      if (!isSig3Value(value)) return not()
      // kJ/mol: the size of the slope times the gas constant, over 1000.
      const ranges = products(taken(typed, point(sizeOfExact(slope))), [gasConstantRange(m)], exact(1, 1000))
      if (fromAny(value, ranges)) return value.mantissa > 0 ? FOLLOWS : not('wrong-sign')
      if (fromAny(value, ranges.map(([low, high]): Range => [times(low, 1000), times(high, 1000)]))) return not('joules-for-kilojoules')
      return not(cutFromAny(value, ranges) ? 'cut-off' : null)
    }
  }
}

/** The slope between the two places a learner has entered; null until both are, and for one place taken twice. */
function enteredSlope(places: readonly Place[], entries: Entries): Exact | null {
  const [first, second] = [entries.first, entries.second]
  if (!isChoice(first) || !isChoice(second)) return null
  const [a, b] = [places[first], places[second]]
  return a === undefined || b === undefined ? null : slopeBetween(a, b)
}

/** How far a value is from another, in percent of the other: negative where it is the smaller. For display and for the rate constant's tolerance. */
export const percentOff = (value: number, held: number) => ((value - held) / held) * 100
