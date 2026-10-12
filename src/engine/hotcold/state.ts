import { z } from 'zod'
import { SALT_IDS, type SaltId } from '@/chem-data/hotcold/data'
import { readings } from '../calorimetry/cup'
import { curveOf, technique } from '../calorimetry/state'
import { cupModel, type HotcoldModel } from './model'
import { runSetup } from './setup'
import { CHOICES, FIELDS, NO_ENTRIES, verdictOf, type Field, type Verdict } from './worksheet'

// The lab as plain data: the whole record saved for it. It holds the seed, what the learner did to each cup (as
// counts of the logger's steps), what the learner entered, and the answers to part 3's two questions, all as whole
// numbers, booleans and short strings, so a round trip through JSON gives back the same value. Anything the seed
// fixes (each run's starting temperature and mass), every reading of the logger, and anything judged (whether an
// entry follows, whether a run counts and why not, whether an answer is right) is worked out on reading and stored
// nowhere, so a stored record cannot disagree with its seed; the one stored judgement is the status, and the
// schema holds it to the runs and the answers.
//
// The cup and the logger are the calorimetry lab's (../calorimetry/cup.ts), stepped as that lab's part 2 with one
// of this lab's salts in the place of its ammonium nitrate; so are what a curve shows and the technique that
// matters (../calorimetry/state.ts). This file reads the hidden values and is not part of the public surface.
//
// The bounds are literals, and a test holds them to the model's values. A change to this shape, or to a value the
// model judges with, needs the lab's entry's version raised (src/hotcold-version.test.ts).

const count = z.number().int().min(0)
const step = count.max(240)
/** A temperature typed to 0.1 °C, in tenths: up to 999.9. */
const tenths = count.max(9999)
const saltId = z.enum(SALT_IDS)

const entriesSchema = z.strictObject({
  start: tenths.nullable(),
  extreme: tenths.nullable(),
  change: z.number().int().min(-9999).max(9999).nullable(),
  temperature: z.enum(CHOICES.temperature).nullable(),
  heat: z.enum(CHOICES.heat).nullable(),
  word: z.enum(CHOICES.word).nullable(),
})

const runSchema = z.strictObject({
  /** 0 for the first run of its salt. With the seed it fixes this run's starting temperature and mass. */
  index: count,
  /** The step at which the lid was put on, and at which the stirrer was started; null while it has not been. */
  lidFrom: step.nullable(),
  stirFrom: step.nullable(),
  /** Whether the logger has been started. It takes its first reading at once: step 0. */
  logger: z.boolean(),
  /** The step after whose reading the salt was added; null before. */
  changedAt: step.nullable(),
  /** Steps of the logger since it was started: it has taken this many readings and one. */
  steps: step,
  /** The readings looked at, by their steps, each once, in the order first looked at. */
  looked: z.array(step),
  entries: entriesSchema,
  /** The notebook has been checked and the run is over: in Guided at its last entry, in Challenge when the learner asks. */
  closed: z.boolean(),
})

/** Part 3's two questions (spec 26.1): which salt for a pack that warms, and which for one that cools. */
export const QUESTIONS = ['warms', 'cools'] as const
export type Question = (typeof QUESTIONS)[number]

const stateSchema = z.strictObject({
  seed: count.max(4294967295),
  mode: z.enum(['guided', 'challenge']),
  status: z.enum(['in-progress', 'completed']),
  /** Every run of each salt in order; the last is the current one. */
  runs: z.strictObject({ 'epsom-salt': z.array(runSchema).min(1), 'calcium-chloride': z.array(runSchema).min(1) }),
  /** Part 3: the salt answered to each question, and whether the answers have been checked. */
  packs: z.strictObject({ warms: saltId.nullable(), cools: saltId.nullable(), checked: z.boolean() }),
})

export type Run = z.infer<typeof runSchema>
export type HotcoldState = z.infer<typeof stateSchema>
export type Packs = HotcoldState['packs']
export type Mode = HotcoldState['mode']

export const newRun = (index: number): Run => ({ index, lidFrom: null, stirFrom: null, logger: false, changedAt: null, steps: 0, looked: [], entries: NO_ENTRIES, closed: false })
export const NO_ANSWERS: Packs = { warms: null, cools: null, checked: false }

/** A lab that has just been started. The seed is drawn in app/; the engine never makes one. */
export function createLab(seed: number, mode: Mode): HotcoldState {
  return { seed: seed >>> 0, mode, status: 'in-progress', runs: { 'epsom-salt': [newRun(0)], 'calcium-chloride': [newRun(0)] }, packs: NO_ANSWERS }
}

export const currentRun = (state: HotcoldState, salt: SaltId): Run => state.runs[salt][state.runs[salt].length - 1]!

/** The logger's readings of a run so far, in tenths of a degree: none before it is started. Never one it has not yet taken. */
export function readingsOf(m: HotcoldModel, seed: number, salt: SaltId, run: Run): number[] {
  if (!run.logger) return []
  const setup = runSetup(m, seed, salt, run.index)
  return readings(cupModel(m, salt), 'dissolving', { metalIndex: 0 }, { ...setup, metalCg: 0, bathTenths: 0 }, { lidFrom: run.lidFrom, stirFrom: run.stirFrom, changedAt: run.changedAt, steps: run.steps })
}

/** What the curve shows once the salt is in: its level before, and the reading furthest from that level after, with the first step that shows it, and whether it has turned back. Null before the salt, and until a reading has moved. */
export const curveOfRun = (run: Run, shown: readonly number[]) => curveOf(run, shown)

/** Why a run does not count. */
export type Reason = 'lid-off' | 'not-stirred' | 'start-not-shown' | 'extreme-not-shown' | 'entries-do-not-follow'

export interface Judged {
  /** Each entered field's verdict. */
  verdicts: Partial<Record<Field, Verdict>>
  /** Why the run does not count; empty when it does. */
  reasons: Reason[]
}

/**
 * A run judged (spec 26.2): it counts when its technique was right (the lid on and the cup stirred from the moment
 * the salt went in), its temperatures are the logger's and its entries follow. Null for a run whose notebook has
 * not been checked.
 */
export function judge(m: HotcoldModel, seed: number, salt: SaltId, run: Run): Judged | null {
  const curve = curveOf(run, readingsOf(m, seed, salt, run))
  // Only a record made by hand has a closed run without a curve.
  if (!run.closed || curve === null) return null
  const verdicts: Partial<Record<Field, Verdict>> = {}
  for (const field of FIELDS) {
    const verdict = verdictOf(m, curve, run.entries, field)
    if (verdict) verdicts[field] = verdict
  }
  const wrong = FIELDS.filter((field) => verdicts[field]?.follows !== true)
  const { lidOn, stirred } = technique(run)
  const reasons: Reason[] = [...(lidOn ? [] : (['lid-off'] as const)), ...(stirred ? [] : (['not-stirred'] as const))]
  if (wrong.includes('start')) reasons.push('start-not-shown')
  if (wrong.includes('extreme')) reasons.push('extreme-not-shown')
  if (wrong.some((field) => field !== 'start' && field !== 'extreme')) reasons.push('entries-do-not-follow')
  return { verdicts, reasons }
}

export const runCounts = (m: HotcoldModel, seed: number, salt: SaltId, run: Run): boolean => judge(m, seed, salt, run)?.reasons.length === 0

type Runs = Pick<HotcoldState, 'seed' | 'runs'>
/** A salt's part is done when one of its runs counts (spec 26.2). */
export const saltDone = (m: HotcoldModel, state: Runs, salt: SaltId): boolean => state.runs[salt].some((run) => runCounts(m, state.seed, salt, run))

/** Part 3 opens once both runs count: its questions are answered from what the two cups showed. */
export const packsOpen = (m: HotcoldModel, state: Runs): boolean => SALT_IDS.every((salt) => saltDone(m, state, salt))

/**
 * The salt that answers a question. It is stored nowhere: the salt for a pack that warms is the one whose
 * dissolving gives heat out, and the salt for a pack that cools the one whose dissolving takes heat in.
 */
export const answerTo = (m: HotcoldModel, question: Question): SaltId => SALT_IDS.find((salt) => m.salts[salt].solutionJ < 0 === (question === 'warms'))!
export const answerRight = (m: HotcoldModel, question: Question, salt: SaltId): boolean => answerTo(m, question) === salt
export const packsAnswered = (packs: Packs): boolean => QUESTIONS.every((question) => packs[question] !== null)
export const packsRight = (m: HotcoldModel, packs: Packs): boolean => QUESTIONS.every((question) => packs[question] !== null && answerRight(m, question, packs[question]))
/** Part 3 is done when its answers have been checked and both are right. */
export const packsDone = (m: HotcoldModel, state: Pick<HotcoldState, 'seed' | 'runs' | 'packs'>): boolean => packsOpen(m, state) && state.packs.checked && packsRight(m, state.packs)

/** The status the runs and the answers give: completed when both runs count and part 3's two questions are right (spec 26.2). */
export const statusOf = (m: HotcoldModel, state: Pick<HotcoldState, 'seed' | 'runs' | 'packs'>): HotcoldState['status'] => (packsDone(m, state) ? 'completed' : 'in-progress')

/**
 * The stored shape, held to the model it is read with: nothing stored that the reducer would not have stored (a
 * run whose index is not its place, a step beyond the logger's last, a cup worked before its logger was started,
 * a look at a reading not yet taken, an entry with an empty one above it, a checked notebook with an entry
 * missing, an answer to part 3 before both runs count, answers checked before both are given); and the status the
 * runs and the answers give. A run left unfinished behind a later one is as the reducer leaves it.
 */
export const hotcoldStateSchema = (m: HotcoldModel): z.ZodType<HotcoldState> =>
  stateSchema.superRefine((state, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message })
    let sound = true
    for (const salt of SALT_IDS) {
      state.runs[salt].forEach((run, place) => {
        const at = (name: string) => ['runs', salt, place, name]
        // A run's seeded values are found by stepping the seed's stream forward by its index, so an index that is not its place (a hand-edited 1e12, say) would hang the page on load.
        if (run.index !== place) {
          sound = false
          return issue(at('index'), "a run's index is its place in the list")
        }
        if (run.steps > m.maxSteps) issue(at('steps'), 'beyond the last reading the logger takes')
        if (!run.logger && (run.steps > 0 || run.changedAt !== null || run.looked.length > 0)) issue(at('logger'), 'the logger was not started')
        if (run.logger && [run.lidFrom, run.stirFrom, run.changedAt, ...run.looked].some((n) => n !== null && n > run.steps)) issue(at('steps'), 'a step the logger has not reached')
        if (!run.logger && [run.lidFrom, run.stirFrom].some((n) => n !== null && n > 0)) issue(at('steps'), 'a step the logger has not reached')
        if (run.looked.some((n, i) => run.looked.indexOf(n) !== i)) issue(at('looked'), 'each reading once')
        const filled = FIELDS.filter((field) => run.entries[field] !== null).length
        if (FIELDS.slice(0, filled).some((field) => run.entries[field] === null)) issue(at('entries'), 'the entries in their order, none skipped')
        if (filled > 0 && run.changedAt === null) issue(at('entries'), 'nothing is entered before the salt is added')
        if (run.closed && filled < FIELDS.length) issue(at('closed'), 'a notebook is checked when every entry is made')
      })
    }
    // The runs are judged only where their indexes are sound: the judging steps the seed's stream by them.
    if (!sound) return
    const { packs } = state
    if ((packs.checked || QUESTIONS.some((question) => packs[question] !== null)) && !packsOpen(m, state)) issue(['packs'], 'part 3 is answered once both runs count')
    if (packs.checked && !packsAnswered(packs)) issue(['packs', 'checked'], 'part 3 is checked once both questions are answered')
    if (state.status !== statusOf(m, state)) issue(['status'], 'the status is not the one the runs and the answers give')
  })
