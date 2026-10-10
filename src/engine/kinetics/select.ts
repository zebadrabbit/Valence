import { toSig3, type Sig3 } from '../figures'
import { entryBlocked, sheetBlocked, type Blocked } from './actions'
import { concentration, modelOrders, roomRuns, runOf, type KineticsModel } from './model'
import { constantOf, enteredOrders, fieldsOf, rateOf, type Field, type Place, type SheetId, type Value, type Verdict } from './notebook'
import { labSetup } from './setup'
import { constantOff, contextOf, currentAttempt, currentSheet, endOf, energyOff, graphPoints, heldConstant, judge, meanConstant, PART_IDS, partDone, sheetDone, tenthsOf, thermometerOf, timed, type Attempt, type KineticsState, type PartId, type RunReason, type Sheet, type SheetReason } from './state'

// Everything the app shows, worked out from the stored record. Nothing here gives the model's orders, its rate
// constant or its activation energy, or whether an entry follows before it may be said, until the part they
// belong to is done; and nothing gives the time of a run before its watch is stopped, but for the look of the
// liquid at a time the page hands in, which is what a learner watches. The wording is the app's: these hand over
// identifiers and numbers.

/** What the liquid in the flask looks like: as it is from the mixing on, or as it is once the run has ended. */
export type Look = 'before' | 'after'

/** A run as its record names it. */
export type RunOutcome =
  /** The watch has not been stopped. */
  | { state: 'open' }
  | { state: 'counts' }
  /** Why it does not count. */
  | { state: 'does-not-count'; reasons: RunReason[] }

export interface RunView {
  runId: string
  /** How many attempts at the run there are; the views below are of the last. */
  attempts: number
  /** What shows the end of the run is in a flask. */
  indicator: boolean
  /** Where the flasks are: on the bench, just stood in the run's bath, or stood there until they are at its temperature. Always 'bench' for a run with no bath. */
  flasks: 'bench' | 'in-bath' | 'stood'
  /** What the thermometer in the flask read, in tenths of a degree; null where it has not been read since the flasks last stood. */
  thermometerTenths: number | null
  /** One flask has been poured into the other, and the watch started. */
  poured: boolean
  /** What the stopped watch reads, in tenths of a second, and how it was stopped; null while it has not been. */
  stopped: { tenths: number; by: 'hand' | 'end' } | null
  /** The liquid as it stands: 'before' until the watch is stopped, and after that as it was at the stop. */
  look: Look
  outcome: RunOutcome
}

const flasksOf = (attempt: Attempt) => (['bench', 'in-bath', 'stood'] as const)[attempt.bath]

/** A run's outcome; `attempt` is one of the run's attempts. */
export function runOutcome(m: KineticsModel, state: KineticsState, runId: string, attempt: Attempt): RunOutcome {
  const result = timed(m, state.seed, runId, attempt)
  if (result === null) return { state: 'open' }
  return result.reasons.length === 0 ? { state: 'counts' } : { state: 'does-not-count', reasons: result.reasons }
}

/**
 * What the liquid of a run looks like when the watch reads `elapsedMs`, for the page that plays the time (spec
 * 19.2): 'after' from the moment the run ends. For a run that is not under way it is the liquid as it stands.
 */
export function lookAt(m: KineticsModel, state: KineticsState, runId: string, elapsedMs: number): Look {
  const attempt = currentAttempt(state, runId)
  if (!attempt.poured) return 'before'
  const end = endOf(m, state.seed, runId, attempt)
  const at = attempt.stop === null ? elapsedMs : attempt.stop.by === 'end' ? m.watchLimitMs : attempt.stop.elapsedMs
  return end !== null && end <= m.watchLimitMs && at >= end ? 'after' : 'before'
}

/** What the watch of a run reads when the page's time is `elapsedMs`, in tenths of a second: nothing before the pour, the stopped time after the stop, and never past where it stops itself. */
export function watchAt(m: KineticsModel, state: KineticsState, runId: string, elapsedMs: number): number {
  const attempt = currentAttempt(state, runId)
  if (!attempt.poured) return 0
  const result = timed(m, state.seed, runId, attempt)
  return tenthsOf(result === null ? Math.min(Math.max(elapsedMs, 0), m.watchLimitMs) : result.ms)
}

/** A run as its page shows it: the current attempt's flasks and watch, and how the run stands. */
export function runView(m: KineticsModel, state: KineticsState, runId: string): RunView {
  const attempt = currentAttempt(state, runId)
  const result = timed(m, state.seed, runId, attempt)
  return {
    runId,
    attempts: state.runs[runId]!.length,
    indicator: attempt.indicator,
    flasks: flasksOf(attempt),
    thermometerTenths: thermometerOf(m, state.seed, runId, attempt),
    poured: attempt.poured,
    stopped: result === null || attempt.stop === null ? null : { tenths: tenthsOf(result.ms), by: attempt.stop.by },
    look: lookAt(m, state, runId, 0),
    outcome: runOutcome(m, state, runId, attempt),
  }
}

/** The outcomes of every attempt at a run, in order, each with what its watch read, for the record. */
export const runOutcomes = (m: KineticsModel, state: KineticsState, runId: string): { outcome: RunOutcome; stopped: RunView['stopped'] }[] =>
  state.runs[runId]!.map((attempt) => {
    const result = timed(m, state.seed, runId, attempt)
    return { outcome: runOutcome(m, state, runId, attempt), stopped: result === null || attempt.stop === null ? null : { tenths: tenthsOf(result.ms), by: attempt.stop.by } }
  })

/** One row of the table of times (spec 19.2): a run, the temperature it was made at, and its time once it counts. */
export interface TimeRow {
  runId: string
  mixtureId: string
  bathId: string | null
  /** In tenths of a degree: the room's for a run on the bench, known from the start; the thermometer's reading for a run in a bath, once the run counts. */
  temperatureTenths: number | null
  /** In tenths of a second; null until the run counts. */
  tenths: number | null
  /** How the watch was stopped; null until the run counts. */
  by: 'hand' | 'end' | null
}

/** The table of times, a row for each run in the model's order. A row is filled when its run counts. */
export function timesTable(m: KineticsModel, state: KineticsState): TimeRow[] {
  const lab = labSetup(m, state.seed)
  return m.runs.map((run) => {
    const attempt = currentAttempt(state, run.id)
    const result = timed(m, state.seed, run.id, attempt)
    const counts = result !== null && result.reasons.length === 0
    return {
      runId: run.id,
      mixtureId: run.mixtureId,
      bathId: run.bathId,
      temperatureTenths: run.bathId === null ? lab.roomTenths : counts ? lab.bathTenths[run.bathId]! : null,
      tenths: counts ? tenthsOf(result.ms) : null,
      by: counts ? attempt.stop!.by : null,
    }
  })
}

export interface EntryView {
  field: Field
  /** What is entered; null where nothing is. */
  value: Value | null
  /** Why the entry cannot be made now; null where its field is open. */
  blocked: Blocked | null
  /** Whether it follows, where that is shown: in Guided for every entry made, in Challenge once the sheet is checked. Null otherwise. */
  verdict: Verdict | null
}

/** A sheet as its record names it. */
export type SheetOutcome =
  /** The sheet has not been checked. */
  | { state: 'open' }
  /** `percentOff` is how far the sheet's result is from what the model gives, in percent: negative where the result is the smaller. */
  | { state: 'counts'; percentOff: number }
  /** Why it does not count. `percentOff` is null until a working of the sheet counts: with the learner's own result it would give what the model holds. */
  | { state: 'does-not-count'; reasons: SheetReason[]; percentOff: number | null }

interface SheetView {
  /** Why the sheet cannot be worked now; null where it is open. */
  blocked: Blocked | null
  /** How many times the sheet has been worked; the views below are of the last. */
  workings: number
  /** The sheet's entries in the order they are worked out. */
  entries: EntryView[]
  outcome: SheetOutcome
  /** One working of the sheet counts. */
  done: boolean
}

/** The first sheet (spec 19.3): the rate law. */
export interface RateLawView extends SheetView {
  /**
   * What the notebook fills once the reference run's row has been worked by hand: for each other run at the
   * room's temperature, the strength of each reactant and the rate, written to three figures. Null before that.
   */
  rows: { runId: string; strengths: Record<string, Sig3>; rate: Sig3 }[] | null
  /**
   * What it fills once the reference run's rate constant has been entered with its unit: the rate constant of
   * each other run, worked with the learner's own orders, and the mean of all of them, the reference run's with
   * them. Null before that.
   */
  constants: { rows: { runId: string; constant: Sig3 }[]; mean: Sig3 } | null
  /** What the model holds, and for which room: null until the sheet is done, so that a page cannot show it by mistake. */
  expected: { orders: Record<string, number>; rateConstant: number; roomTenths: number } | null
}

/** The second sheet (spec 19.3): temperature. */
export interface TemperatureView extends SheetView {
  /** What the notebook fills once the sheet can be opened: for each temperature, the reading, the same in kelvin, one over it, the rate constant and its natural logarithm. Null before that. */
  rows: { runId: string; tenths: number; centiKelvin: number; xMicro: number; constant: Sig3; yMilli: number }[] | null
  /** The graph: a point for each row, the two ends of the line through them, and the places on the line, each with whether it has been looked at. Null before the sheet can be opened. */
  graph: { points: { runId: string; xMicro: number; yMilli: number }[]; line: readonly [Place, Place]; places: (Place & { looked: boolean })[] } | null
  /** The activation energy the model holds, in kJ/mol: null until the sheet is done. */
  expected: { activationKJ: number } | null
}

function entriesOf(m: KineticsModel, state: KineticsState, sheetId: SheetId, sheet: Sheet): EntryView[] {
  // In Guided an entry is checked as it is made, so its verdict shows at once; in Challenge, once the sheet is checked.
  const verdicts = judge(m, state, sheetId, state.mode === 'guided' ? { ...sheet, closed: true } : sheet)?.verdicts
  return fieldsOf(m, sheetId).map((field) => ({ field, value: sheet.entries[field] ?? null, blocked: entryBlocked(m, state, sheetId, field), verdict: verdicts?.[field] ?? null }))
}

/** A working of a sheet as its record names it; `sheet` is one of the sheet's workings. */
export function sheetOutcome(m: KineticsModel, state: KineticsState, sheetId: SheetId, sheet: Sheet): SheetOutcome {
  const judged = judge(m, state, sheetId, sheet)
  if (judged === null) return { state: 'open' }
  const follows = !judged.reasons.includes('entries-do-not-follow') && !judged.reasons.includes('orders-differ')
  const off = !follows ? null : sheetId === 'rate-law' ? constantOff(m, state.seed, contextOf(m, state, sheetId)!.timings) : energyOff(m, sheet.entries.energy as Sig3)
  if (judged.reasons.length === 0) return { state: 'counts', percentOff: off! }
  return { state: 'does-not-count', reasons: judged.reasons, percentOff: sheetDone(m, state, sheetId) ? off : null }
}

/** The outcomes of every working of a sheet, in order, for the record. */
export const sheetOutcomes = (m: KineticsModel, state: KineticsState, sheetId: SheetId): SheetOutcome[] => state.sheets[sheetId].map((sheet) => sheetOutcome(m, state, sheetId, sheet))

const figures = (value: Parameters<typeof toSig3>[0]): Sig3 => toSig3(value)!

/** The first sheet as its page shows it. */
export function rateLawView(m: KineticsModel, state: KineticsState): RateLawView {
  const sheet = currentSheet(state, 'rate-law')
  const context = contextOf(m, state, 'rate-law')
  const others = roomRuns(m).filter((run) => run.id !== m.referenceRunId)
  const made = (field: Field) => sheet.entries[field] !== null && sheet.entries[field] !== undefined
  // The notebook copies a row once the learner has worked that row (spec 19.3, and 19.7's fifth item).
  const rowWorked = context !== null && [...m.reactants.map((r) => `concentration:${r.id}`), 'rate'].every(made)
  const orders = enteredOrders(m, sheet.entries)
  const constantWorked = rowWorked && orders !== null && made('rateConstant') && made('unit')
  const done = sheetDone(m, state, 'rate-law')
  return {
    blocked: sheetBlocked(m, state, 'rate-law'),
    workings: state.sheets['rate-law'].length,
    entries: entriesOf(m, state, 'rate-law', sheet),
    rows: rowWorked
      ? others.map((run) => ({ runId: run.id, strengths: Object.fromEntries(m.reactants.map((r) => [r.id, figures(concentration(m, runOf(m, run.id).mixtureId, r.solutionId))])), rate: figures(rateOf(m, run.id, context.timings)) }))
      : null,
    constants: constantWorked ? { rows: others.map((run) => ({ runId: run.id, constant: figures(constantOf(m, run.id, context.timings, orders)) })), mean: figures(meanConstant(m, context.timings, orders)) } : null,
    outcome: sheetOutcome(m, state, 'rate-law', sheet),
    done,
    expected: done ? { orders: modelOrders(m), rateConstant: heldConstant(m, state.seed), roomTenths: labSetup(m, state.seed).roomTenths } : null,
  }
}

/** The second sheet as its page shows it. */
export function temperatureView(m: KineticsModel, state: KineticsState): TemperatureView {
  const sheet = currentSheet(state, 'temperature')
  const points = graphPoints(m, state)
  const places = contextOf(m, state, 'temperature')?.places ?? null
  const done = sheetDone(m, state, 'temperature')
  return {
    blocked: sheetBlocked(m, state, 'temperature'),
    workings: state.sheets.temperature.length,
    entries: entriesOf(m, state, 'temperature', sheet),
    rows: points && points.map(({ runId, tenths, centiKelvin, xMicro, constant, yMilli }) => ({ runId, tenths, centiKelvin, xMicro, constant: figures(constant), yMilli })),
    graph: points && places && { points: points.map(({ runId, xMicro, yMilli }) => ({ runId, xMicro, yMilli })), line: [places[0]!, places[places.length - 1]!], places: places.map((place, i) => ({ ...place, looked: sheet.looked.includes(i) })) },
    outcome: sheetOutcome(m, state, 'temperature', sheet),
    done,
    expected: done ? { activationKJ: m.activationJ / 1000 } : null,
  }
}

/** What the bench shows for the whole lab: the thermometer in the room, in tenths of a degree. */
export const roomTenths = (m: KineticsModel, state: KineticsState) => labSetup(m, state.seed).roomTenths

/** The parts that are done, in their order. */
export const doneParts = (m: KineticsModel, state: KineticsState): PartId[] => PART_IDS.filter((part) => partDone(m, state, part))
