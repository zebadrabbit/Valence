import { z } from 'zod'
import { PART_IDS, type PartId } from '@/chem-data/calorimetry/data'
import { readings, type Timeline } from './cup'
import type { CalorimetryModel } from './model'
import { labSetup, runSetup } from './setup'
import { FIELDS, NO_ENTRIES, verdictOf, withinTolerance, type Entries, type Field, type Shown, type Verdict } from './worksheet'

// The lab as plain data: the whole record saved for it. It holds the seed, what the learner did to each cup (as
// counts of the logger's steps) and what the learner typed, all as whole numbers, booleans and short strings, so
// a round trip through JSON gives back the same value. Anything the seed fixes (which metal, each run's masses
// and temperatures), every reading of the logger, and anything judged (whether an entry follows, whether a run
// counts and why not, whether a part is done) is worked out on reading and stored nowhere, so a stored record
// cannot disagree with its seed; the one stored judgement is the status, and the schema holds it to the runs.
//
// The bounds are literals, and a test holds them to the model's values. A change to this shape, or to a value the
// model judges with, needs the calorimetry entry's version raised (src/calorimetry-version.test.ts).

const count = z.number().int().min(0)
const step = count.max(240)
/** A temperature typed to 0.1 °C, in tenths: up to 999.9. */
const tenths = count.max(9999)
const sig3 = z.strictObject({
  mantissa: z.number().int().refine((n) => Math.abs(n) >= 100 && Math.abs(n) <= 999, 'three significant figures'),
  exponent: z.number().int().min(-12).max(12),
})

const entriesSchema = z.strictObject({
  start: tenths.nullable(),
  extreme: tenths.nullable(),
  change: z.number().int().min(-9999).max(9999).nullable(),
  heat: sig3.nullable(),
  direction: z.enum(['out', 'in']).nullable(),
  moles: sig3.nullable(),
  perMole: sig3.nullable(),
  specificHeat: sig3.nullable(),
  metal: z.string().min(1).nullable(),
})

const runSchema = z.strictObject({
  /** 0 for the first run of its part. With the seed it fixes this run's starting temperature, masses and bath. */
  index: count,
  /** The step at which the lid was put on, and at which the stirrer was started; null while it has not been. */
  lidFrom: step.nullable(),
  stirFrom: step.nullable(),
  /** Whether the logger has been started. It takes its first reading at once: step 0. */
  logger: z.boolean(),
  /** The step after whose reading the change was started (the second solution poured in, the solid added, the hot metal added); null before. */
  changedAt: step.nullable(),
  /** Steps of the logger since it was started: it has taken this many readings and one. */
  steps: step,
  /** The readings looked at, by their steps, each once, in the order first looked at. */
  looked: z.array(step),
  entries: entriesSchema,
  /** The worksheet has been checked and the run is over: in Guided at its last entry, in Challenge when the learner asks. */
  closed: z.boolean(),
})

const stateSchema = z.strictObject({
  seed: count.max(4294967295),
  mode: z.enum(['guided', 'challenge']),
  status: z.enum(['in-progress', 'completed']),
  /** Every run of each part in order; the last is the current one. */
  parts: z.strictObject({ neutralisation: z.array(runSchema).min(1), dissolving: z.array(runSchema).min(1), metal: z.array(runSchema).min(1) }),
})

export type Run = z.infer<typeof runSchema>
export type CalorimetryState = z.infer<typeof stateSchema>
export type Mode = CalorimetryState['mode']

export const newRun = (index: number): Run => ({ index, lidFrom: null, stirFrom: null, logger: false, changedAt: null, steps: 0, looked: [], entries: NO_ENTRIES, closed: false })

/** A lab that has just been started. The seed is drawn in app/; the engine never makes one. */
export function createLab(seed: number, mode: Mode): CalorimetryState {
  return { seed: seed >>> 0, mode, status: 'in-progress', parts: { neutralisation: [newRun(0)], dissolving: [newRun(0)], metal: [newRun(0)] } }
}

export const currentRun = (state: CalorimetryState, part: PartId): Run => state.parts[part][state.parts[part].length - 1]!

const timelineOf = (run: Run): Timeline => ({ lidFrom: run.lidFrom, stirFrom: run.stirFrom, changedAt: run.changedAt, steps: run.steps })

/** The logger's readings of a run so far, in tenths of a degree: none before it is started. Never one it has not yet taken. */
export function readingsOf(m: CalorimetryModel, seed: number, part: PartId, run: Run): number[] {
  return run.logger ? readings(m, part, labSetup(m, seed), runSetup(m, seed, part, run.index), timelineOf(run)) : []
}

/** What the curve shows once the change is started: its level before, and the reading furthest from that level after, with the first step that shows it. Null before the change, and until a reading has moved. */
export function curveOf(run: Run, shown: readonly number[]): (Shown & { extremeStep: number; turned: boolean }) | null {
  if (run.changedAt === null) return null
  const start = shown[run.changedAt]!
  let extremeStep = -1
  for (let at = run.changedAt + 1; at < shown.length; at++) {
    if (Math.abs(shown[at]! - start) > Math.abs((shown[extremeStep] ?? start) - start)) extremeStep = at
  }
  if (extremeStep < 0) return null
  const extreme = shown[extremeStep]!
  // Turned back: the latest reading is nearer the level than the extreme was.
  return { start, extreme, extremeStep, turned: Math.abs(shown[shown.length - 1]! - start) < Math.abs(extreme - start) }
}

/** The technique that matters (spec 16.2): whether the lid was on, and the stirrer going, from the moment the change was started. */
export const technique = (run: Run) => ({
  lidOn: run.changedAt !== null && run.lidFrom !== null && run.lidFrom <= run.changedAt,
  stirred: run.changedAt !== null && run.stirFrom !== null && run.stirFrom <= run.changedAt,
})

/** Why a run does not count. */
export type Reason = 'lid-off' | 'not-stirred' | 'start-not-shown' | 'extreme-not-shown' | 'entries-do-not-follow' | 'outside-tolerance'

export interface Judged {
  /** Each entered field's verdict. */
  verdicts: Partial<Record<Field, Verdict>>
  /** Why the run does not count; empty when it does. */
  reasons: Reason[]
}

/**
 * A run judged (spec 16.2): it counts when its temperatures are the logger's, each entry follows, the lid was on
 * and the cup stirred throughout, and its result is within the tolerance of the stored value. The result is held
 * to the stored value only where it is the learner's own measurement, with the temperatures the logger's and
 * every entry following; otherwise the reasons already say what is wrong. Null for a run whose worksheet has not
 * been checked. This reads the hidden values and is not part of the public surface.
 */
export function judge(m: CalorimetryModel, seed: number, part: PartId, run: Run): Judged | null {
  const curve = curveOf(run, readingsOf(m, seed, part, run))
  // Only a record made by hand has a closed run without a curve.
  if (!run.closed || curve === null) return null
  const setup = runSetup(m, seed, part, run.index)
  const verdicts: Partial<Record<Field, Verdict>> = {}
  for (const field of FIELDS[part]) {
    const verdict = verdictOf(m, part, setup, curve, run.entries, field)
    if (verdict) verdicts[field] = verdict
  }
  const wrong = FIELDS[part].filter((field) => verdicts[field]?.follows !== true)
  const { lidOn, stirred } = technique(run)
  const reasons: Reason[] = [...(lidOn ? [] : (['lid-off'] as const)), ...(stirred ? [] : (['not-stirred'] as const))]
  if (wrong.includes('start')) reasons.push('start-not-shown')
  if (wrong.includes('extreme')) reasons.push('extreme-not-shown')
  if (wrong.some((field) => field !== 'start' && field !== 'extreme')) reasons.push('entries-do-not-follow')
  if (wrong.length === 0 && !resultWithin(m, seed, part, run.entries)) reasons.push('outside-tolerance')
  return { verdicts, reasons }
}

/** The stored value a part's result is held to, as a whole number over a scale: J/mol over 1000 for kJ/mol, or the metal's specific heat x 1000. */
export function storedResult(m: CalorimetryModel, seed: number, part: PartId): { stored: number; scale: number } {
  if (part === 'neutralisation') return { stored: m.neutralisationJ, scale: 1000 }
  if (part === 'dissolving') return { stored: m.solutionJ, scale: 1000 }
  return { stored: m.candidates[labSetup(m, seed).metalIndex]!.specificHeatE3, scale: 1000 }
}

function resultWithin(m: CalorimetryModel, seed: number, part: PartId, entries: Entries): boolean {
  const result = part === 'metal' ? entries.specificHeat : entries.perMole
  const { stored, scale } = storedResult(m, seed, part)
  if (result === null || !withinTolerance(m, result, stored, scale)) return false
  return part !== 'metal' || entries.metal === m.candidates[labSetup(m, seed).metalIndex]!.id
}

export const runCounts = (m: CalorimetryModel, seed: number, part: PartId, run: Run): boolean => judge(m, seed, part, run)?.reasons.length === 0

/** A part is done when one of its runs counts (spec 16.2). */
export const partDone = (m: CalorimetryModel, state: Pick<CalorimetryState, 'seed' | 'parts'>, part: PartId): boolean => state.parts[part].some((run) => runCounts(m, state.seed, part, run))

/** The status the runs give: completed when all three parts are done. */
export const statusOf = (m: CalorimetryModel, state: Pick<CalorimetryState, 'seed' | 'parts'>): CalorimetryState['status'] => (PART_IDS.every((part) => partDone(m, state, part)) ? 'completed' : 'in-progress')

/**
 * The stored shape, held to the model it is read with: nothing stored that the reducer would not have stored (a
 * run whose index is not its place, a step beyond the logger's last, a cup worked before its logger was started,
 * a look at a reading not yet taken, an entry of another part's worksheet or one with an empty entry above it, a
 * metal that is not a candidate, a checked worksheet with an entry missing); and the status the runs give. A run
 * left unfinished behind a later one is as the reducer leaves it: running a part again abandons the run before.
 */
export const calorimetryStateSchema = (m: CalorimetryModel): z.ZodType<CalorimetryState> =>
  stateSchema.superRefine((state, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message })
    for (const part of PART_IDS) {
      state.parts[part].forEach((run, place) => {
        const at = (name: string) => ['parts', part, place, name]
        // A run's seeded values are found by stepping the seed's stream forward by its index, so an index that is not its place (a hand-edited 1e12, say) would hang the page on load.
        if (run.index !== place) return issue(at('index'), "a run's index is its place in the list")
        if (run.steps > m.maxSteps) issue(at('steps'), 'beyond the last reading the logger takes')
        if (!run.logger && (run.steps > 0 || run.changedAt !== null || run.looked.length > 0)) issue(at('logger'), 'the logger was not started')
        if (run.logger && [run.lidFrom, run.stirFrom, run.changedAt, ...run.looked].some((n) => n !== null && n > run.steps)) issue(at('steps'), 'a step the logger has not reached')
        if (!run.logger && [run.lidFrom, run.stirFrom].some((n) => n !== null && n > 0)) issue(at('steps'), 'a step the logger has not reached')
        if (run.looked.some((n, i) => run.looked.indexOf(n) !== i)) issue(at('looked'), 'each reading once')
        const fields = FIELDS[part]
        const entered = (Object.keys(run.entries) as Field[]).filter((field) => run.entries[field] !== null)
        const filled = fields.filter((field) => run.entries[field] !== null).length
        if (entered.some((field) => !fields.includes(field)) || fields.slice(0, filled).some((field) => run.entries[field] === null)) issue(at('entries'), "the part's own entries, in their order, none skipped")
        if (entered.length > 0 && run.changedAt === null) issue(at('entries'), 'nothing is entered before the change is started')
        if (run.entries.metal !== null && !m.candidates.some((c) => c.id === run.entries.metal)) issue(at('entries'), 'not one of the metals it may be')
        if (run.closed && filled < fields.length) issue(at('closed'), 'a worksheet is checked when every entry is made')
      })
    }
    if (state.status !== statusOf(m, state)) issue(['status'], 'the status is not the one the runs give')
  })
