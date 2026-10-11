// Scripted learners, for tests only: nothing in the app imports this file.
import type { Sig3 } from '../figures'
import { scripted } from '../scripted'
import { can, reduce, type Action } from './actions'
import { bathRuns, mixtureOf, roomRuns, runOf, totalTenthMl, type KineticsModel } from './model'
import { fieldsOf, kindOf, reactantIdOf, sheetIdsOf, type Field, type SheetId, type Value } from './notebook'
import { rateLawView, temperatureView, timesTable } from './select'
import { currentAttempt, currentSheet, endOf, runCounts, sheetCounts, sheetDone, type KineticsState } from './state'

/** Applies the actions in order; throws on one that cannot be done (see `scripted`). */
export const run = scripted<KineticsModel, KineticsState, Action>(can, reduce)

/** A number as a learner rounds it to three significant figures, from a calculator's value. */
export function sig(x: number): Sig3 {
  const size = Math.abs(x)
  let exponent = Math.floor(Math.log10(size)) - 2
  let mantissa = Math.round(size / 10 ** exponent)
  if (mantissa === 1000) [mantissa, exponent] = [100, exponent + 1]
  if (mantissa < 100) [mantissa, exponent] = [mantissa * 10, exponent - 1]
  return { mantissa: x < 0 ? -mantissa : mantissa, exponent }
}
export const valueOf = ({ mantissa, exponent }: Sig3) => mantissa * 10 ** exponent
/** A number cut off after its third figure where it should be rounded. */
export function cut(x: number): Sig3 {
  const exponent = Math.floor(Math.log10(Math.abs(x))) - 2
  return { mantissa: Math.sign(x) * Math.floor(Math.abs(x) / 10 ** exponent + 1e-9), exponent }
}

export interface Technique {
  /** False to leave out what shows the end of the run. */
  indicator?: boolean
  /** False to pour as soon as the flasks are in the bath, without letting them stand. */
  stand?: boolean
  /** How the watch is stopped: by hand so many milliseconds after the end, at the end itself, or by hand so many milliseconds before it. An ordinary hand by default. */
  stop?: { delayMs: number } | 'end' | { earlyMs: number }
}
/** A hand of ordinary quickness: three tenths of a second after the liquid changes. */
export const ORDINARY_DELAY_MS = 300

/**
 * Makes a run from flasks that have not been touched to a stopped watch: what shows the end, the bath where the
 * run has one, the pour and the stop. The stop reads the hidden time of the end, as a learner reads it off the
 * liquid. `through` is applied after every action.
 */
export function makeRun(m: KineticsModel, state: KineticsState, runId: string, { indicator = true, stand = true, stop = { delayMs: ORDINARY_DELAY_MS } }: Technique = {}, through: (s: KineticsState) => KineticsState = (s) => s): KineticsState {
  const go = (actions: Action[]) => (state = run(m, state, actions, through))
  if (indicator && m.end.indicatorId !== null) go([{ type: 'addIndicator', run: runId }])
  if (runOf(m, runId).bathId !== null) go([{ type: 'standInBath', run: runId }, ...(stand ? [{ type: 'letStand', run: runId } as const] : []), { type: 'readThermometer', run: runId }])
  go([{ type: 'pour', run: runId }])
  const end = endOf(m, state.seed, runId, currentAttempt(state, runId))
  if (stop === 'end') return go([{ type: 'stopAtEnd', run: runId }])
  // With nothing to show the end, the scripted learner waits five minutes and gives up.
  if (end === null) return go([{ type: 'stop', run: runId, elapsedMs: 300_000, delayMs: 0 }])
  if ('earlyMs' in stop) return go([{ type: 'stop', run: runId, elapsedMs: Math.max(0, end - stop.earlyMs), delayMs: 0 }])
  return go([{ type: 'stop', run: runId, elapsedMs: Math.min(m.watchLimitMs, end + stop.delayMs), delayMs: stop.delayMs }])
}

/** Every run at the room's temperature, each made once, in the model's order. */
export const makeRoomRuns = (m: KineticsModel, state: KineticsState, how: Technique = {}, through: (s: KineticsState) => KineticsState = (s) => s): KineticsState => roomRuns(m).reduce((s, r) => makeRun(m, s, r.id, how, through), state)
/** Every run in a bath, each made once, in the model's order. */
export const makeBathRuns = (m: KineticsModel, state: KineticsState, how: Technique = {}, through: (s: KineticsState) => KineticsState = (s) => s): KineticsState => bathRuns(m).reduce((s, r) => makeRun(m, s, r.id, how, through), state)

export interface Arithmetic {
  /** Each entry worked from the rounded entries above it, or from the calculator's unrounded values. */
  chain?: 'rounded' | 'unrounded'
  /** One slip: a strength left as the bottle's; all of what is used up taken for the rate; an order one too low; a figure cut off where it should be rounded; the slope without its sign; the energy in joules. */
  slip?: 'not-diluted' | 'count-left-out' | 'wrong-order' | 'cut-off' | 'no-sign' | 'joules'
  /** The two places on the line the slope is taken from, by their numbers: the two ends by default. */
  places?: readonly [number, number]
}

/**
 * What a learner enters in the first sheet, worked out from what the bench and the table of times show and nothing
 * else: the bottles' strengths, the volumes, and the times. Careful unless a slip is asked for.
 */
export function rateLawValues(m: KineticsModel, state: KineticsState, { chain = 'rounded', slip }: Arithmetic = {}): Record<Field, Value> {
  const keep = chain === 'rounded' ? (x: number) => valueOf(sig(x)) : (x: number) => x
  const table = timesTable(m, state)
  const seconds = (runId: string) => table.find((row) => row.runId === runId)!.tenths! / 10
  const strength = (runId: string, solutionId: string) => {
    const mixture = mixtureOf(m, runOf(m, runId).mixtureId)
    return ((m.solutions.find((s) => s.id === solutionId)!.microMolar ?? 0) / 1e6) * ((mixture.tenthMl[solutionId] ?? 0) / totalTenthMl(mixture))
  }
  const rate = (runId: string) => strength(runId, m.end.solutionId) / m.end.per / seconds(runId)
  // The slip of taking all of what is used up is made in the row worked by hand, and carried into its rate constant.
  const entered = rate(m.referenceRunId) * (slip === 'count-left-out' ? m.end.per : 1)
  const values: Record<Field, Value> = {}
  let product = 1
  for (const reactant of m.reactants) {
    const [first, second] = m.orderRuns[reactant.id]!
    const apparent = Math.log(rate(second) / rate(first)) / Math.log(strength(second, reactant.solutionId) / strength(first, reactant.solutionId))
    const nearest = [...m.orderChoices].sort((a, b) => Math.abs(a - apparent) - Math.abs(b - apparent))[0]!
    const order = slip === 'wrong-order' && reactant.id === m.reactants.at(-1)!.id ? m.orderChoices.find((choice) => choice !== nearest)! : nearest
    const mixed = strength(m.referenceRunId, reactant.solutionId)
    values[`concentration:${reactant.id}`] = slip === 'not-diluted' && reactant.id === m.reactants[0]!.id ? sig((m.solutions.find((s) => s.id === reactant.solutionId)!.microMolar ?? 0) / 1e6) : sig(mixed)
    values[`order:${reactant.id}`] = order
    product *= keep(mixed) ** order
  }
  values.rate = sig(entered)
  const constant = keep(entered) / product
  values.rateConstant = slip === 'cut-off' ? cut(constant) : sig(constant)
  values.unit = 1 - m.reactants.reduce((sum, reactant) => sum + (values[`order:${reactant.id}`] as number), 0)
  return values
}

/** What a learner enters in the second sheet, worked out from two places on the line as the graph gives them. */
export function temperatureValues(m: KineticsModel, state: KineticsState, { chain = 'rounded', slip, places }: Arithmetic = {}): Record<Field, Value> {
  const keep = chain === 'rounded' ? (x: number) => valueOf(sig(x)) : (x: number) => x
  const { graph } = temperatureView(m, state)
  const [first, second] = places ?? [0, m.places.count - 1]
  const [a, b] = [graph!.places[first]!, graph!.places[second]!]
  const slope = (b.yMilli - a.yMilli) / 1000 / ((b.xMicro - a.xMicro) / 1e6)
  const energy = (-keep(slope) * m.gasConstantE9) / 1e9 / (slip === 'joules' ? 1 : 1000)
  const written = slip === 'cut-off' ? cut(slope) : sig(slope)
  return { first, second, slope: slip === 'no-sign' ? { ...written, mantissa: Math.abs(written.mantissa) } : written, energy: sig(energy) }
}

/** The entries of a sheet in order, from the values given, with the two looks the second sheet's places need in front. */
export function entryActions(m: KineticsModel, sheet: SheetId, values: Record<Field, Value>): Action[] {
  const looks: Action[] = sheet === 'temperature' ? [{ type: 'look', place: values.first as number }, { type: 'look', place: values.second as number }] : []
  return [...looks, ...fieldsOf(m, sheet).map((field): Action => ({ type: 'enter', sheet, field, value: values[field]! }))]
}

/** One whole working of a sheet whose runs count: its entries made and, in Challenge, checked. Careful unless told otherwise. A script that Guided would refuse throws. */
export function wholeSheet(m: KineticsModel, state: KineticsState, sheet: SheetId, how: Arithmetic = {}, through: (s: KineticsState) => KineticsState = (s) => s): KineticsState {
  const values = sheet === 'rate-law' ? rateLawValues(m, state, how) : temperatureValues(m, state, how)
  state = run(m, state, entryActions(m, sheet, values), through)
  return state.mode === 'challenge' ? run(m, state, [{ type: 'check', sheet }], through) : state
}

/** A whole careful lab: every run, then each sheet the model has. */
export function wholeLab(m: KineticsModel, state: KineticsState, how: Technique & Arithmetic = {}, through: (s: KineticsState) => KineticsState = (s) => s): KineticsState {
  state = makeBathRuns(m, makeRoomRuns(m, state, how, through), how, through)
  return sheetIdsOf(m).reduce((s, sheet) => wholeSheet(m, s, sheet, how, through), state)
}

/**
 * Brings a run to an attempt that counts from wherever it stands: an attempt that is over and does not count is
 * left behind, one under way is stopped at its end, and what is still missing from the flasks is put right first.
 */
export function finishRun(m: KineticsModel, state: KineticsState, runId: string, through: (s: KineticsState) => KineticsState = (s) => s): KineticsState {
  const go = (actions: Action[]) => (state = run(m, state, actions, through))
  for (let tries = 0; tries < 3; tries++) {
    const attempt = currentAttempt(state, runId)
    if (attempt.stop !== null) {
      if (runCounts(m, state.seed, runId, attempt)) return state
      go([{ type: 'runAgain', run: runId }])
      continue
    }
    if (!attempt.poured) {
      if (m.end.indicatorId !== null && !attempt.indicator) go([{ type: 'addIndicator', run: runId }])
      if (runOf(m, runId).bathId !== null) {
        if (currentAttempt(state, runId).bath === 0) go([{ type: 'standInBath', run: runId }])
        if (currentAttempt(state, runId).bath === 1) go([{ type: 'letStand', run: runId }])
        if (!currentAttempt(state, runId).read) go([{ type: 'readThermometer', run: runId }])
      }
      go([{ type: 'pour', run: runId }])
    }
    go([{ type: 'stopAtEnd', run: runId }])
  }
  return state
}

/** Brings a whole lab to completion from wherever it stands, carefully: every run, then each sheet that is not done. */
export function finishLab(m: KineticsModel, state: KineticsState, through: (s: KineticsState) => KineticsState = (s) => s): KineticsState {
  for (const { id } of m.runs) state = finishRun(m, state, id, through)
  for (const sheet of sheetIdsOf(m)) {
    if (sheetDone(m, state, sheet)) continue
    const current = currentSheet(state, sheet)
    if (current.closed && !sheetCounts(m, state, sheet, current)) state = run(m, state, [{ type: 'sheetAgain', sheet }], through)
    state = wholeSheet(m, state, sheet, {}, through)
  }
  return state
}

/** The apparent order of a reactant from the two runs its question names: the logarithm of the ratio of the rates over that of the ratio of the strengths. For tests' figures. */
export function apparentOrder(m: KineticsModel, state: KineticsState, reactantId: string): number {
  const [first, second] = m.orderRuns[reactantId]!
  const table = timesTable(m, state)
  const tenths = (runId: string) => table.find((row) => row.runId === runId)!.tenths!
  const solutionId = m.reactants.find((r) => r.id === reactantId)!.solutionId
  const share = (runId: string, id: string) => {
    const mixture = mixtureOf(m, runOf(m, runId).mixtureId)
    return (mixture.tenthMl[id] ?? 0) / totalTenthMl(mixture)
  }
  const rates = (share(second, m.end.solutionId) / tenths(second)) / (share(first, m.end.solutionId) / tenths(first))
  return Math.log(rates) / Math.log(share(second, solutionId) / share(first, solutionId))
}

export { kindOf, reactantIdOf, rateLawView }
