import { z } from 'zod'
import { PART_IDS, type PartId } from '@/chem-data/freezing/data'
import { cupStates, readingOf, solutionCg, type CupState, type Dissolved, type Timeline } from './cup'
import type { FreezingModel } from './model'
import { labSetup, runSetup } from './setup'
import { FIELDS, NO_ENTRIES, verdictOf, withinPerMille, type Bench, type Field, type Shown, type Verdict } from './worksheet'

// The lab as plain data: the whole record saved for it. It holds the seed, what the learner did to each cup (as
// counts of the logger's steps), which solute was chosen in part 3 and what the learner typed, all as whole
// numbers, booleans and short strings, so a round trip through JSON gives back the same value. Anything the seed
// fixes (which liquid, how far the probe is off, each run's masses and first reading), every reading of the
// logger and of the balance, and anything judged (whether an entry follows, whether a run counts and why not,
// whether a part is done) is worked out on reading and stored nowhere, so a stored record cannot disagree with its
// seed; the one stored judgement is the status, and the schema holds it to the runs.
//
// The bounds are literals, and a test holds them to the model's values. A change to this shape, or to a value the
// model judges with, needs the freezing entry's version raised (src/freezing-version.test.ts).

const count = z.number().int().min(0)
const step = count.max(60)
/** A temperature or a fall typed to 0.01 °C, in hundredths: up to 99.99 either side of zero. */
const hundredths = z.number().int().min(-9999).max(9999)
const sig3 = z.strictObject({
  mantissa: z.number().int().refine((n) => Math.abs(n) >= 100 && Math.abs(n) <= 999, 'three significant figures'),
  exponent: z.number().int().min(-12).max(12),
})

const entriesSchema = z.strictObject({
  water: hundredths.nullable(),
  solution: hundredths.nullable(),
  fall: hundredths.nullable(),
  /** Hundredths of a gram: under 10 kg. */
  waterKg: count.max(999999).nullable(),
  molality: sig3.nullable(),
  moles: sig3.nullable(),
  molarMass: sig3.nullable(),
  liquid: z.string().min(1).nullable(),
  idealFall: sig3.nullable(),
  ratio: sig3.nullable(),
})

const runSchema = z.strictObject({
  /** 0 for the first run of its part. With the seed it fixes this run's first reading and masses. */
  index: count,
  /** Part 3: the solute chosen for this run, by its id; null until one is, and in the other parts. */
  solute: z.string().min(1).nullable(),
  /** Whether the ice and the water are in the cup. */
  filled: z.boolean(),
  /** The step at which the lid was put on, and at which the stirrer was started; null while it has not been. */
  lidFrom: step.nullable(),
  stirFrom: step.nullable(),
  /** Whether the logger has been started. It takes its first reading at once: step 0. */
  logger: z.boolean(),
  /** The step after whose reading the solute was added; null before, and in part 1. */
  addedAt: step.nullable(),
  /** Steps of the logger since it was started: it has taken this many readings and one. */
  steps: step,
  /** The step at which the cup was poured through the strainer; null if it has not been. The logger takes no reading after it. */
  strainedAt: step.nullable(),
  /** The step at which the solution was weighed, strained or not; null before. Nothing is done to the cup after it. */
  weighedAt: step.nullable(),
  /** The readings looked at, by their steps, each once, in the order first looked at. */
  looked: z.array(step),
  entries: entriesSchema,
  /** The notebook has been checked and the run is over: in Guided at its last entry, in Challenge when the learner asks. */
  closed: z.boolean(),
})

const stateSchema = z.strictObject({
  seed: count.max(4294967295),
  mode: z.enum(['guided', 'challenge']),
  status: z.enum(['in-progress', 'completed']),
  /** Every run of each part in order; the last is the current one. */
  parts: z.strictObject({ water: z.array(runSchema).min(1), unknown: z.array(runSchema).min(1), particles: z.array(runSchema).min(1) }),
})

export type Run = z.infer<typeof runSchema>
export type FreezingState = z.infer<typeof stateSchema>
export type Mode = FreezingState['mode']

export const newRun = (index: number): Run => ({ index, solute: null, filled: false, lidFrom: null, stirFrom: null, logger: false, addedAt: null, steps: 0, strainedAt: null, weighedAt: null, looked: [], entries: NO_ENTRIES, closed: false })

/** A lab that has just been started. The seed is drawn in app/; the engine never makes one. */
export function createLab(seed: number, mode: Mode): FreezingState {
  return { seed: seed >>> 0, mode, status: 'in-progress', parts: { water: [newRun(0)], unknown: [newRun(0)], particles: [newRun(0)] } }
}

export const currentRun = (state: FreezingState, part: PartId): Run => state.parts[part][state.parts[part].length - 1]!

/** What a run dissolves, with the mass weighed out for it: the unknown liquid in part 2, the solute chosen in part 3; null in part 1 and until a solute is chosen. Hidden for part 2: it says which liquid the unknown is. */
export function dissolvedIn(m: FreezingModel, seed: number, part: PartId, run: Run): Dissolved | null {
  const setup = runSetup(m, seed, part, run.index)
  if (part === 'unknown') return { ...m.liquids[labSetup(m, seed).liquidIndex]!, cg: setup.unknownCg }
  const solute = part === 'particles' ? m.solutes.find((s) => s.id === run.solute) : undefined
  return solute === undefined ? null : { ...solute, cg: setup.soluteCg[solute.id]! }
}

/** The step at which a run's cup was strained, or weighed unstrained: its last reading. Null while it has been neither. */
export const endOf = (run: Run): number | null => run.strainedAt ?? run.weighedAt

const timelineOf = (run: Run): Timeline => ({ lidFrom: run.lidFrom, stirFrom: run.stirFrom, addedAt: run.addedAt, steps: run.steps })

/** The cup of a run at every reading so far: none before the logger is started. Hidden. */
export function statesOf(m: FreezingModel, seed: number, part: PartId, run: Run): CupState[] {
  return run.logger ? cupStates(m, runSetup(m, seed, part, run.index), dissolvedIn(m, seed, part, run), timelineOf(run)) : []
}

/** The logger's readings of a run so far, in hundredths of a degree: none before it is started. Never one it has not yet taken. */
export function readingsOf(m: FreezingModel, seed: number, part: PartId, run: Run): number[] {
  const probe = labSetup(m, seed).probeHundredths
  return statesOf(m, seed, part, run).map((state) => readingOf(state, probe))
}

/**
 * What the logger showed for the notebook's two temperatures: the reading when the solute went in (in part 1, the
 * latest reading) and the reading when the cup was strained or weighed. Null before the logger is started, and in
 * parts 2 and 3 before the solute is in.
 */
export function shownOf(part: PartId, run: Run, readings: readonly number[]): Shown | null {
  if (!run.logger) return null
  if (part === 'water') return { water: readings[run.steps]!, solution: null }
  if (run.addedAt === null) return null
  const end = endOf(run)
  return { water: readings[run.addedAt]!, solution: end === null ? null : readings[end]! }
}

/** What the balance and the table show for a run: the solute weighed out, the solution once it is weighed, and the molar mass of part 3's solute. */
export function benchOf(m: FreezingModel, seed: number, part: PartId, run: Run): Bench {
  const solute = dissolvedIn(m, seed, part, run)
  if (solute === null) return { soluteCg: null, solutionCg: null, soluteMolarMassE2: null }
  const weighed = run.weighedAt === null ? null : solutionCg(statesOf(m, seed, part, run)[run.weighedAt]!, solute, run.strainedAt !== null)
  return { soluteCg: solute.cg, solutionCg: weighed, soluteMolarMassE2: part === 'particles' ? solute.molarMassE2 : null }
}

/** Why a run does not count. */
export type Reason = 'water-not-level' | 'solution-not-level' | 'ice-melted' | 'not-strained' | 'water-not-shown' | 'solution-not-shown' | 'entries-do-not-follow' | 'outside-tolerance'

/**
 * The three errors of technique (spec 23.2), each by its own cause: a temperature taken before it had levelled
 * off (the ice and water when the solute went in, or in part 1 when the reading was taken; the solution when the
 * cup was strained); all the ice melted by then, so that what was read was no freezing point; and the solution
 * weighed with the ice in it. Empty for a run with none of them, and for one whose cup is not finished.
 */
export function techniqueOf(m: FreezingModel, seed: number, part: PartId, run: Run): Reason[] {
  const states = statesOf(m, seed, part, run)
  const end = part === 'water' ? run.steps : endOf(run)
  const first = part === 'water' ? states[run.steps] : run.addedAt === null ? undefined : states[run.addedAt]
  const last = part === 'water' || end === null ? undefined : states[end]
  if (first === undefined || (part !== 'water' && last === undefined)) return []
  const melted = first.iceMg === 0 || last?.iceMg === 0
  return [
    ...(!melted && !first.level ? (['water-not-level'] as const) : []),
    ...(!melted && last !== undefined && !last.level ? (['solution-not-level'] as const) : []),
    ...(melted ? (['ice-melted'] as const) : []),
    ...(part !== 'water' && run.strainedAt === null ? (['not-strained'] as const) : []),
  ]
}

export interface Judged {
  /** Each entered field's verdict. */
  verdicts: Partial<Record<Field, Verdict>>
  /** Why the run does not count; empty when it does. */
  reasons: Reason[]
}

/**
 * A run judged (spec 23.2): it counts when its technique was right, its temperatures are the logger's, each entry
 * follows, and its result is within the tolerance of the stored figure; in part 2 the liquid named must be the
 * one it was. The result is held to the stored figure only where every entry follows; otherwise the reasons
 * already say what is wrong. Null for a run whose notebook has not been checked. This reads the hidden values and
 * is not part of the public surface.
 */
export function judge(m: FreezingModel, seed: number, part: PartId, run: Run): Judged | null {
  if (!run.closed) return null
  const shown = shownOf(part, run, readingsOf(m, seed, part, run))
  // Only a record made by hand has a closed run without its readings.
  if (shown === null) return null
  const bench = benchOf(m, seed, part, run)
  const verdicts: Partial<Record<Field, Verdict>> = {}
  for (const field of FIELDS[part]) {
    const verdict = verdictOf(m, part, bench, shown, run.entries, field)
    if (verdict) verdicts[field] = verdict
  }
  const wrong = FIELDS[part].filter((field) => verdicts[field]?.follows !== true)
  const reasons: Reason[] = techniqueOf(m, seed, part, run)
  if (wrong.includes('water')) reasons.push('water-not-shown')
  if (wrong.includes('solution')) reasons.push('solution-not-shown')
  if (wrong.some((field) => field !== 'water' && field !== 'solution')) reasons.push('entries-do-not-follow')
  if (wrong.length === 0 && !resultWithin(m, seed, part, run)) reasons.push('outside-tolerance')
  return { verdicts, reasons }
}

/** The stored figure a run's result is held to, as a whole number over a scale, with the allowance on it in parts in a thousand: the probe's own reading in ice and water, held to exactly; the liquid's molar mass; the particles of the run's solute. Null for a run of part 3 with no solute. */
export function storedResult(m: FreezingModel, seed: number, part: PartId, run: Run): { stored: number; scale: number; perMille: number } | null {
  if (part === 'water') return { stored: labSetup(m, seed).probeHundredths, scale: 100, perMille: 0 }
  const solute = dissolvedIn(m, seed, part, run)
  if (solute === null) return null
  return part === 'unknown' ? { stored: solute.molarMassE2, scale: 100, perMille: m.molarMassTolerancePerMille } : { stored: solute.particlesE2, scale: 100, perMille: m.particlesTolerancePerMille }
}

function resultWithin(m: FreezingModel, seed: number, part: PartId, run: Run): boolean {
  const held = storedResult(m, seed, part, run)
  if (held === null) return false
  if (part === 'water') return run.entries.water === held.stored
  const result = part === 'unknown' ? run.entries.molarMass : run.entries.ratio
  if (result === null || !withinPerMille(result, held.stored, held.scale, held.perMille)) return false
  return part !== 'unknown' || run.entries.liquid === m.liquids[labSetup(m, seed).liquidIndex]!.id
}

export const runCounts = (m: FreezingModel, seed: number, part: PartId, run: Run): boolean => judge(m, seed, part, run)?.reasons.length === 0

/** The solutes of part 3 that a run that counts has been made with, in the model's order. */
export function countedSolutes(m: FreezingModel, state: Pick<FreezingState, 'seed' | 'parts'>): string[] {
  const counted = new Set(state.parts.particles.filter((run) => run.solute !== null && runCounts(m, state.seed, 'particles', run)).map((run) => run.solute))
  return m.solutes.filter((solute) => counted.has(solute.id)).map((solute) => solute.id)
}

/** What part 3 still wants (spec 23.1): a run that counts with the solute that stays whole, and one with a salt. */
export function wantedOf(m: FreezingModel, state: Pick<FreezingState, 'seed' | 'parts'>): { molecule: boolean; salt: boolean } {
  const counted = countedSolutes(m, state).map((id) => m.solutes.find((s) => s.id === id)!)
  return { molecule: !counted.some((s) => s.idealParticles === 1), salt: !counted.some((s) => s.idealParticles > 1) }
}

/** A part is done when one of its runs counts; part 3, when a run with urea counts and a run with a salt does (spec 23.2). */
export function partDone(m: FreezingModel, state: Pick<FreezingState, 'seed' | 'parts'>, part: PartId): boolean {
  if (part !== 'particles') return state.parts[part].some((run) => runCounts(m, state.seed, part, run))
  const wanted = wantedOf(m, state)
  return !wanted.molecule && !wanted.salt
}

/** The status the runs give: completed when all three parts are done. */
export const statusOf = (m: FreezingModel, state: Pick<FreezingState, 'seed' | 'parts'>): FreezingState['status'] => (PART_IDS.every((part) => partDone(m, state, part)) ? 'completed' : 'in-progress')

/**
 * The stored shape, held to the model it is read with: nothing stored that the reducer would not have stored (a
 * run whose index is not its place, a step beyond the logger's last, a cup worked out of its order, a solute
 * outside part 3 or one the bench does not have, a look at a reading not taken, an entry of another part's
 * notebook or one with an empty entry above it, a liquid that is not of the table, a checked notebook with an
 * entry missing); and the status the runs give. A run left unfinished behind a later one is as the reducer leaves
 * it: running a part again abandons the run before.
 */
export const freezingStateSchema = (m: FreezingModel): z.ZodType<FreezingState> =>
  stateSchema.superRefine((state, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message })
    for (const part of PART_IDS) {
      state.parts[part].forEach((run, place) => {
        const at = (name: string) => ['parts', part, place, name]
        // A run's seeded values are found by stepping the seed's stream forward by its index, so an index that is not its place (a hand-edited 1e12, say) would hang the page on load.
        if (run.index !== place) return issue(at('index'), "a run's index is its place in the list")
        if (run.steps > m.maxSteps) issue(at('steps'), 'beyond the last reading the logger takes')
        if (run.solute !== null && (part !== 'particles' || !m.solutes.some((s) => s.id === run.solute))) issue(at('solute'), 'a solute of part 3, and of part 3 only')
        if (!run.filled && (run.lidFrom !== null || run.stirFrom !== null || run.logger)) issue(at('filled'), 'nothing is done to an empty cup')
        if (!run.logger && (run.steps > 0 || run.addedAt !== null || run.looked.length > 0 || [run.lidFrom, run.stirFrom].some((n) => n !== null && n > 0))) issue(at('logger'), 'the logger was not started')
        if ([run.lidFrom, run.stirFrom, run.addedAt, run.strainedAt, run.weighedAt, ...run.looked].some((n) => n !== null && n > run.steps)) issue(at('steps'), 'a step the logger has not reached')
        if (run.looked.some((n, i) => run.looked.indexOf(n) !== i)) issue(at('looked'), 'each reading once')
        if (run.addedAt !== null && (part === 'water' || (part === 'particles' && run.solute === null))) issue(at('addedAt'), 'no solute to add')
        const end = endOf(run)
        if (end !== null && (run.addedAt === null || end <= run.addedAt || end !== run.steps)) issue(at('strainedAt'), 'a cup is strained or weighed at its last reading, after the solute and a reading of it')
        if (run.strainedAt !== null && run.weighedAt !== null && run.weighedAt !== run.strainedAt) issue(at('weighedAt'), 'the logger takes no reading after the cup is strained')
        const fields = FIELDS[part]
        const entered = (Object.keys(run.entries) as Field[]).filter((field) => run.entries[field] !== null)
        const filled = fields.filter((field) => run.entries[field] !== null).length
        if (entered.some((field) => !fields.includes(field)) || fields.slice(0, filled).some((field) => run.entries[field] === null)) issue(at('entries'), "the part's own entries, in their order, none skipped")
        if (entered.length > 0 && (part === 'water' ? !run.logger : run.weighedAt === null)) issue(at('entries'), 'nothing is entered before the cup is finished')
        if (run.entries.liquid !== null && !m.liquids.some((c) => c.id === run.entries.liquid)) issue(at('entries'), 'not one of the liquids it may be')
        if (run.closed && filled < fields.length) issue(at('closed'), 'a notebook is checked when every entry is made')
      })
    }
    if (state.status !== statusOf(m, state)) issue(['status'], 'the status is not the one the runs give')
  })
