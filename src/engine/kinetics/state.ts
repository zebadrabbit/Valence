import { z } from 'zod'
import { toNumber, withinPercent, type Sig3 } from '../figures'
import { centiKelvin, endMs, modelOrders, rateConstantAt, roomRuns, runOf, temperatureRuns, type KineticsModel } from './model'
import { constantOf, enteredOrders, fieldsOf, meanOf, noEntries, percentOff, placesOf, pointsOf, SHEET_IDS, verdictOf, type Context, type Entries, type Field, type Place, type Point, type SheetId, type Timings, type Value, type Verdict } from './notebook'
import { labSetup, scatterOf, type LabSetup } from './setup'

// The lab as plain data: the whole record saved for it. It holds the seed, what the learner did at each run (what
// went into the flasks, how long they stood, when and how the watch was stopped) and what the learner entered in
// the notebook, all as whole numbers, booleans and short strings, so a round trip through JSON gives back the
// same value. Anything the seed fixes (the room's temperature, the baths', each run's scatter), the time of every
// run, and anything judged (whether a run counts, whether an entry follows, whether a part is done) is worked out
// on reading and stored nowhere, so a stored record cannot disagree with its seed; the one stored judgement is the
// status, and the schema holds it to the rest.
//
// A change to this shape, or to a value the model times or judges with, needs the stored entry's version raised
// (for the clock reaction lab, src/clock-version.test.ts).

/** The most attempts at one run, and the most times one sheet of the notebook is worked: a record edited by hand cannot hold the page up. */
export const MAX_ATTEMPTS = 100

const count = z.number().int().min(0)
const sig3 = z.strictObject({
  mantissa: z.number().int().refine((n) => Math.abs(n) >= 100 && Math.abs(n) <= 999, 'three significant figures'),
  exponent: z.number().int().min(-12).max(12),
})

const attemptSchema = z.strictObject({
  /** 0 for the first attempt at its run. With the seed it fixes this attempt's scatter. */
  index: count.max(MAX_ATTEMPTS - 1),
  /** What shows the end of the run has been added to a flask. */
  indicator: z.boolean(),
  /** Where the flasks are: 0 on the bench, 1 just stood in the bath, 2 stood there until they are at its temperature. */
  bath: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  /** The thermometer in the flask has been read since the flasks last stood. */
  read: z.boolean(),
  /** One flask has been poured into the other and the watch started. */
  poured: z.boolean(),
  /**
   * How the watch was stopped: by hand, with the watch's time then and how long after the end of the run the hand
   * was, both in milliseconds and both handed in by the page, which plays the time; or at the end itself.
   */
  stop: z.union([z.strictObject({ by: z.literal('hand'), elapsedMs: count, delayMs: count }), z.strictObject({ by: z.literal('end') })]).nullable(),
})

const sheetSchema = z.strictObject({
  entries: z.record(z.string(), z.union([z.number().int(), sig3]).nullable()),
  /** The places on the line that have been looked at, by their numbers, each once, in the order first looked at. */
  looked: z.array(count),
  /** The sheet has been checked and is over: in Guided at its last entry, in Challenge when the learner asks. */
  closed: z.boolean(),
})

const stateSchema = z.strictObject({
  seed: count.max(4294967295),
  mode: z.enum(['guided', 'challenge']),
  status: z.enum(['in-progress', 'completed']),
  /** Every attempt at each run, by the run's id, in order; the last is the current one. */
  runs: z.record(z.string(), z.array(attemptSchema).min(1).max(MAX_ATTEMPTS)),
  /** Every working of each sheet of the notebook, in order; the last is the current one. */
  sheets: z.strictObject({ 'rate-law': z.array(sheetSchema).min(1).max(MAX_ATTEMPTS), temperature: z.array(sheetSchema).min(1).max(MAX_ATTEMPTS) }),
})

export type Attempt = z.infer<typeof attemptSchema>
export type Sheet = z.infer<typeof sheetSchema>
export type KineticsState = z.infer<typeof stateSchema>
export type Mode = KineticsState['mode']

export const newAttempt = (index: number): Attempt => ({ index, indicator: false, bath: 0, read: false, poured: false, stop: null })
export const newSheet = (m: KineticsModel, sheet: SheetId): Sheet => ({ entries: noEntries(m, sheet), looked: [], closed: false })

/** A lab that has just been started. The seed is drawn in app/; the engine never makes one. */
export function createLab(m: KineticsModel, seed: number, mode: Mode): KineticsState {
  return {
    seed: seed >>> 0,
    mode,
    status: 'in-progress',
    runs: Object.fromEntries(m.runs.map((run) => [run.id, [newAttempt(0)]])),
    sheets: { 'rate-law': [newSheet(m, 'rate-law')], temperature: [newSheet(m, 'temperature')] },
  }
}

export const currentAttempt = (state: Pick<KineticsState, 'runs'>, runId: string): Attempt => {
  const attempts = state.runs[runId]
  if (!attempts) throw new Error(`no run "${runId}"`)
  return attempts[attempts.length - 1]!
}
export const currentSheet = (state: Pick<KineticsState, 'sheets'>, sheet: SheetId): Sheet => state.sheets[sheet][state.sheets[sheet].length - 1]!

/** Whether an attempt lacks what shows the end of its run. */
const blind = (m: KineticsModel, attempt: Attempt) => m.end.indicatorId !== null && !attempt.indicator

/**
 * The temperature a run is mixed at, in hundredths of a kelvin, and whether that is one temperature: the room's
 * for a run on the bench, the bath's once the flasks have stood in it. Flasks poured before they have stood are
 * at the room's temperature in a bath at another, and the model times that run at the temperature half way
 * between: it belongs to neither (spec 19.2).
 */
function mixedAt(m: KineticsModel, lab: LabSetup, runId: string, attempt: Attempt): { centiK: number; settled: boolean } {
  const { bathId } = runOf(m, runId)
  const room = centiKelvin(m, lab.roomTenths)
  if (bathId === null) return { centiK: room, settled: true }
  const bath = centiKelvin(m, lab.bathTenths[bathId]!)
  return attempt.bath === 2 ? { centiK: bath, settled: true } : { centiK: Math.round((room + bath) / 2), settled: false }
}

/** When the end of a run shows, in milliseconds on the watch; null where it never shows, for want of what shows it. Hidden until the watch is stopped. */
export function endOf(m: KineticsModel, seed: number, runId: string, attempt: Attempt): number | null {
  if (blind(m, attempt)) return null
  const { centiK } = mixedAt(m, labSetup(m, seed), runId, attempt)
  return endMs(m, runOf(m, runId).mixtureId, centiK, scatterOf(m, seed, runId, attempt.index))
}

/** What the thermometer in the flask reads once it has been read, in tenths of a degree: the room's temperature until the flasks have stood in a bath, the bath's after. Null where it has not been read. */
export function thermometerOf(m: KineticsModel, seed: number, runId: string, attempt: Attempt): number | null {
  if (!attempt.read) return null
  const lab = labSetup(m, seed)
  const { bathId } = runOf(m, runId)
  return bathId !== null && attempt.bath === 2 ? lab.bathTenths[bathId]! : lab.roomTenths
}

/** Why a run does not count. */
export type RunReason = 'no-indicator' | 'not-at-temperature' | 'stopped-early' | 'stopped-late' | 'ran-out'

export interface Timed {
  /** What the stopped watch reads, in milliseconds. */
  ms: number
  /** Why the run does not count; empty when it does. */
  reasons: RunReason[]
}

/**
 * A run whose watch has been stopped (spec 19.2): what the watch reads, and whether the run counts. The time is
 * the model's with the learner's own delay added, in true milliseconds, where the watch was stopped by hand after
 * the end; the watch's own time where it was stopped before the end, or where no end ever showed. Null for a run
 * still under way. This reads the hidden time and is not part of the public surface.
 */
export function timed(m: KineticsModel, seed: number, runId: string, attempt: Attempt): Timed | null {
  const { stop } = attempt
  if (stop === null) return null
  const end = endOf(m, seed, runId, attempt)
  const reasons: RunReason[] = []
  if (end === null) reasons.push('no-indicator')
  if (!mixedAt(m, labSetup(m, seed), runId, attempt).settled) reasons.push('not-at-temperature')
  const shown = end !== null && end <= m.watchLimitMs
  if (stop.by === 'end') {
    if (end !== null && !shown) reasons.push('ran-out')
    return { ms: shown ? end : m.watchLimitMs, reasons }
  }
  if (!shown || stop.elapsedMs < end) {
    if (end !== null) reasons.push('stopped-early')
    return { ms: stop.elapsedMs, reasons }
  }
  if (stop.delayMs > m.delayLimitMs) reasons.push('stopped-late')
  return { ms: end + stop.delayMs, reasons }
}

/** A time on the watch as the table holds it: tenths of a second. */
export const tenthsOf = (ms: number) => Math.round(ms / 100)

export const runCounts = (m: KineticsModel, seed: number, runId: string, attempt: Attempt): boolean => timed(m, seed, runId, attempt)?.reasons.length === 0

/** The time of a run in the table, in tenths of a second: that of its attempt that counts. A run that counts is not made again, so that attempt is its last. Null until one counts. */
export function tableTime(m: KineticsModel, state: Pick<KineticsState, 'seed' | 'runs'>, runId: string): number | null {
  const attempt = currentAttempt(state, runId)
  const result = timed(m, state.seed, runId, attempt)
  return result !== null && result.reasons.length === 0 ? tenthsOf(result.ms) : null
}

/** The times in the table of some runs; null until every one of them counts. */
function timingsOf(m: KineticsModel, state: Pick<KineticsState, 'seed' | 'runs'>, runs: readonly { id: string }[]): Timings | null {
  const timings: Record<string, number> = {}
  for (const run of runs) {
    const tenths = tableTime(m, state, run.id)
    if (tenths === null) return null
    timings[run.id] = tenths
  }
  return timings
}

/** Why a sheet of the notebook does not count. */
export type SheetReason = 'entries-do-not-follow' | 'orders-differ' | 'outside-tolerance'

export interface Judged {
  /** Each entered field's verdict. */
  verdicts: Partial<Record<Field, Verdict>>
  /** Why the sheet does not count; empty when it does. */
  reasons: SheetReason[]
}

/** The mean of the rate constants of the runs at the room's temperature, with a set of orders. Exact. */
export const meanConstant = (m: KineticsModel, timings: Timings, orders: Readonly<Record<string, number>>) => meanOf(roomRuns(m).map((run) => constantOf(m, run.id, timings, orders)))

/** The rate constant the model gives at the room's temperature: what the first sheet's result is held to. Hidden until the part is done. */
export const heldConstant = (m: KineticsModel, seed: number) => rateConstantAt(m, centiKelvin(m, labSetup(m, seed).roomTenths))

/** A part of the lab: the runs at the room's temperature, and the two sheets of the notebook, the second with its runs in the baths. */
export const PART_IDS = ['runs', ...SHEET_IDS] as const
export type PartId = (typeof PART_IDS)[number]

/** The times the first sheet is worked from; null until every run at the room's temperature counts. */
export const roomTimings = (m: KineticsModel, state: Pick<KineticsState, 'seed' | 'runs'>) => timingsOf(m, state, roomRuns(m))

// What is worked out from a lab is worked out again at every reading, and a page reads a good deal at each
// render. So the two heaviest answers are kept beside the very objects they were worked from: a state is never
// changed in place (the reducer hands back new objects for whatever an action touches), which makes "the same
// objects" mean "the same answer". Nothing is kept for an object that is no longer referred to.
type Runs = KineticsState['runs']
const contexts = new WeakMap<Runs, { m: KineticsModel; seed: number; first: Sheet[]; byGraph: Context | null }[]>()

/**
 * What a sheet is worked from: the times of its runs, and for the second sheet the places on its line. Null while
 * the sheet cannot be opened: a run of its own does not count yet, or, for the second sheet, the first is not
 * done, since its rate constants are worked with the rate law found there.
 */
export function contextOf(m: KineticsModel, state: Pick<KineticsState, 'seed' | 'runs' | 'sheets'>, sheet: SheetId): Context | null {
  if (sheet === 'rate-law') {
    const timings = roomTimings(m, state)
    return timings && { timings, places: [] }
  }
  const kept = contexts.get(state.runs) ?? []
  const hit = kept.find((one) => one.m === m && one.seed === state.seed && one.first === state.sheets['rate-law'])
  if (hit) return hit.byGraph
  const points = graphPoints(m, state)
  const byGraph = points && { timings: Object.fromEntries(points.map((p) => [p.runId, tableTime(m, state, p.runId)!])), places: placesOf(m, points) }
  contexts.set(state.runs, [...kept.slice(-3), { m, seed: state.seed, first: state.sheets['rate-law'], byGraph }])
  return byGraph
}

/** The points of the graph of part 3; null until its sheet can be opened. */
export function graphPoints(m: KineticsModel, state: Pick<KineticsState, 'seed' | 'runs' | 'sheets'>): Point[] | null {
  const timings = timingsOf(m, state, temperatureRuns(m))
  if (timings === null || !sheetDone(m, state, 'rate-law')) return null
  return pointsOf(m, labSetup(m, state.seed), timings, modelOrders(m))
}

/**
 * A sheet judged (spec 19.3): it counts when each entry follows and its results are within tolerance of what the
 * model gives for those runs. The first sheet's results are the orders, which must be the model's, and the mean of
 * the runs' rate constants, held to the model's rate constant at the room's temperature. The second sheet's is
 * the activation energy. A result is held to the model only where every entry follows; otherwise the reasons
 * already say what is wrong. Null for a sheet that has not been checked. This reads the hidden values and is not
 * part of the public surface.
 */
export function judge(m: KineticsModel, state: Pick<KineticsState, 'seed' | 'runs' | 'sheets'>, sheetId: SheetId, sheet: Sheet): Judged | null {
  const hit = judgements.get(sheet)
  if (hit && hit.m === m && hit.seed === state.seed && hit.runs === state.runs && hit.first === state.sheets['rate-law'] && hit.sheetId === sheetId) return hit.judged
  const judged = judgeAfresh(m, state, sheetId, sheet)
  judgements.set(sheet, { m, seed: state.seed, runs: state.runs, first: state.sheets['rate-law'], sheetId, judged })
  return judged
}
const judgements = new WeakMap<Sheet, { m: KineticsModel; seed: number; runs: Runs; first: Sheet[]; sheetId: SheetId; judged: Judged | null }>()

function judgeAfresh(m: KineticsModel, state: Pick<KineticsState, 'seed' | 'runs' | 'sheets'>, sheetId: SheetId, sheet: Sheet): Judged | null {
  const context = contextOf(m, state, sheetId)
  // Only a record made by hand has a closed sheet whose runs do not count.
  if (!sheet.closed || context === null) return null
  const fields = fieldsOf(m, sheetId)
  const verdicts: Partial<Record<Field, Verdict>> = {}
  for (const field of fields) {
    const verdict = verdictOf(m, context, sheet.entries, field)
    if (verdict) verdicts[field] = verdict
  }
  if (fields.some((field) => verdicts[field]?.follows !== true)) return { verdicts, reasons: ['entries-do-not-follow'] }
  const reasons: SheetReason[] = []
  if (sheetId === 'rate-law') {
    const orders = enteredOrders(m, sheet.entries)!
    if (m.reactants.some((reactant) => orders[reactant.id] !== reactant.order)) reasons.push('orders-differ')
    else if (Math.abs(constantOff(m, state.seed, context.timings)) > m.rateConstantTolerancePercent) reasons.push('outside-tolerance')
  } else if (!withinPercent(sheet.entries.energy as Sig3, m.activationJ, 1000, m.activationTolerancePercent)) reasons.push('outside-tolerance')
  return { verdicts, reasons }
}

/** How far the mean of the runs' rate constants, worked with the model's orders, is from the model's rate constant at the room's temperature, in percent. */
export const constantOff = (m: KineticsModel, seed: number, timings: Timings) => percentOff(toNumber(meanConstant(m, timings, modelOrders(m))), heldConstant(m, seed))

/** How far an activation energy entered, in kJ/mol, is from the model's, in percent. */
export const energyOff = (m: KineticsModel, energy: Sig3) => percentOff(energy.mantissa * 10 ** energy.exponent, m.activationJ / 1000)

export const sheetCounts = (m: KineticsModel, state: Pick<KineticsState, 'seed' | 'runs' | 'sheets'>, sheetId: SheetId, sheet: Sheet): boolean => judge(m, state, sheetId, sheet)?.reasons.length === 0

/** A sheet is done when one working of it counts. */
export const sheetDone = (m: KineticsModel, state: Pick<KineticsState, 'seed' | 'runs' | 'sheets'>, sheetId: SheetId): boolean => state.sheets[sheetId].some((sheet) => sheetCounts(m, state, sheetId, sheet))

/** A part is done when its runs count and, where it has a sheet, a working of the sheet counts (spec 19.3). */
export function partDone(m: KineticsModel, state: Pick<KineticsState, 'seed' | 'runs' | 'sheets'>, part: PartId): boolean {
  if (part === 'runs') return roomTimings(m, state) !== null
  return sheetDone(m, state, part)
}

/** The status the parts give: completed when all three are done. */
export const statusOf = (m: KineticsModel, state: Pick<KineticsState, 'seed' | 'runs' | 'sheets'>): KineticsState['status'] => (PART_IDS.every((part) => partDone(m, state, part)) ? 'completed' : 'in-progress')

/** True for a value of the kind a field takes, whatever it is: a number of three figures, or a whole number for a choice. */
export function isValueOf(m: KineticsModel, field: Field, value: unknown): value is Value {
  const kind = field.split(':')[0]
  const choice = (n: unknown): n is number => Number.isSafeInteger(n) && !Object.is(n, -0)
  if (kind === 'order') return choice(value) && m.orderChoices.includes(value)
  if (kind === 'unit') return choice(value) && m.unitPowers.includes(value)
  if (kind === 'first' || kind === 'second') return choice(value) && value >= 0 && value < m.places.count
  return sig3.safeParse(value).success
}

/**
 * The stored shape, held to the model it is read with: nothing stored that the reducer would not have stored (a
 * run the model does not have, an attempt whose index is not its place, flasks in a bath where the run has none,
 * a watch stopped before it was started or past where it stops itself, an attempt left unfinished or counting
 * behind a later one, an entry of another sheet or of the wrong kind or with an empty entry above it, an entry or
 * a look on a sheet that cannot be opened, a look at a place that is not there, a place entered that was not
 * looked at, a checked sheet with an entry missing, a sheet worked again behind one that counts); and the status
 * the parts give.
 */
export const kineticsStateSchema = (m: KineticsModel): z.ZodType<KineticsState> =>
  stateSchema.superRefine((state, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message })
    const ids = m.runs.map((run) => run.id)
    if (Object.keys(state.runs).length !== ids.length || ids.some((id) => state.runs[id] === undefined)) return issue(['runs'], "the model's runs, each once")
    for (const run of m.runs) {
      const attempts = state.runs[run.id]!
      // The scatter of an attempt is found by stepping the seed's stream forward by its index, so an index that is not its place would be another attempt's.
      if (attempts.some((attempt, place) => attempt.index !== place)) return issue(['runs', run.id], "an attempt's index is its place in the list")
      attempts.forEach((attempt, place) => {
        const at = (name: string) => ['runs', run.id, place, name]
        if (run.bathId === null && (attempt.bath !== 0 || attempt.read)) issue(at('bath'), 'a run at the room\'s temperature stands in no bath')
        if (attempt.read && attempt.bath === 0) issue(at('read'), 'the thermometer is read once the flasks stand in the bath')
        if (attempt.poured && run.bathId !== null && !attempt.read) issue(at('poured'), 'the flasks of a bath are mixed once the thermometer has been read')
        if (attempt.stop !== null && !attempt.poured) issue(at('stop'), 'the watch was not started')
        if (attempt.stop?.by === 'hand' && attempt.stop.elapsedMs > m.watchLimitMs) issue(at('stop'), 'past where the watch stops itself')
        if (place < attempts.length - 1 && (attempt.stop === null || runCounts(m, state.seed, run.id, attempt))) issue(at('stop'), 'a run is made again once it is over and does not count')
      })
    }
    for (const sheetId of SHEET_IDS) {
      const fields = fieldsOf(m, sheetId)
      const open = contextOf(m, state, sheetId) !== null
      state.sheets[sheetId].forEach((sheet, place) => {
        const at = (name: string) => ['sheets', sheetId, place, name]
        const keys = Object.keys(sheet.entries)
        if (keys.length !== fields.length || fields.some((field) => !(field in sheet.entries))) return issue(at('entries'), "the sheet's own entries, each once")
        const filled = fields.filter((field) => sheet.entries[field] !== null).length
        if (fields.slice(0, filled).some((field) => sheet.entries[field] === null)) issue(at('entries'), 'the entries in their order, none skipped')
        for (const field of fields) if (sheet.entries[field] !== null && !isValueOf(m, field, sheet.entries[field])) issue(at('entries'), `"${field}" is not an entry of its kind`)
        if (!open && (filled > 0 || sheet.looked.length > 0 || sheet.closed)) issue(at('entries'), 'a sheet is worked once its runs count')
        if (sheetId === 'rate-law' && sheet.looked.length > 0) issue(at('looked'), 'the first sheet has no graph')
        if (sheet.looked.some((n, i) => n >= m.places.count || sheet.looked.indexOf(n) !== i)) issue(at('looked'), 'each place on the line once')
        for (const field of ['first', 'second']) {
          const entered = sheet.entries[field]
          if (sheetId === 'temperature' && typeof entered === 'number' && !sheet.looked.includes(entered)) issue(at('entries'), 'a place is entered once it has been looked at')
        }
        if (typeof sheet.entries.second === 'number' && sheet.entries.second === sheet.entries.first) issue(at('entries'), 'two places, not one twice')
        if (sheet.closed && filled < fields.length) issue(at('closed'), 'a sheet is checked when every entry is made')
        if (place < state.sheets[sheetId].length - 1 && (!sheet.closed || sheetCounts(m, state, sheetId, sheet))) issue(at('closed'), 'a sheet is worked again once it is checked and does not count')
      })
    }
    if (state.status !== statusOf(m, state)) issue(['status'], 'the status is not the one the parts give')
  })

export type { Context, Entries, Field, Place, Point, SheetId, Timings, Value, Verdict }
