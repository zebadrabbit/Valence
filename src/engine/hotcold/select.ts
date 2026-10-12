import { PART_IDS, type PartId, type SaltId } from '@/chem-data/hotcold/data'
import { entryBlocked, type Blocked } from './actions'
import type { HotcoldModel } from './model'
import { runSetup } from './setup'
import { QUESTIONS, answerRight, curveOfRun, currentRun, judge, packsDone, packsOpen, packsRight, readingsOf, saltDone, type HotcoldState, type Question, type Reason, type Run } from './state'
import { FIELDS, type Field, type Value, type Verdict, type Went } from './worksheet'

// Everything the app shows, worked out from the stored record. Nothing here gives a reading the logger has not
// yet taken, which way a salt's temperature goes, the figure its cup runs on, or which salt answers a question of
// part 3, until the learner's own entries have given it. The wording is the app's: these hand over identifiers
// and numbers.

/** What the bench shows for a run: the balance's reading for the salt, in hundredths of a gram. */
export interface BenchView {
  balanceCg: number
}

export interface CupView {
  lidOn: boolean
  stirring: boolean
  loggerStarted: boolean
  /** The salt is in the water. */
  saltAdded: boolean
  /** The notebook has an entry, so the cup is left as it is. */
  notebookBegun: boolean
}

export interface GraphView {
  /** The logger's readings so far, in tenths of a degree, one for each step from 0. */
  readings: number[]
  /** The step after whose reading the salt was added; null before. */
  changedAt: number | null
  /** The highest or lowest reading after the salt so far, with the first step that shows it; null until a reading has moved. */
  extreme: { step: number; tenths: number } | null
  /** Whether the curve has turned back towards the room's temperature. */
  turned: boolean
  /** The steps whose readings have been looked at. */
  looked: number[]
  /** Whether the logger can take no more readings. */
  full: boolean
}

export interface EntryView {
  field: Field
  /** What is entered; null where nothing is. */
  value: Value | null
  /** Why the entry cannot be made now; null where its field is open. */
  blocked: Blocked | null
  /** Whether it follows, where that is shown: in Guided for every entry made, in Challenge once the notebook is checked. Null otherwise. */
  verdict: Verdict | null
}

/** A run as its record names it: its notebook not checked yet, or checked and counting, or checked and not, with why. */
export type RunOutcome = { state: 'open' } | { state: 'counts' } | { state: 'does-not-count'; reasons: Reason[] }

/** What a run of the salt showed and the figure its cup runs on. Handed over only once a run of the salt counts. */
export interface Expected {
  went: Went
  kilojoulesPerMole: number
}

export interface RunView {
  /** How many runs of the salt there are; the views below are of the last. */
  runs: number
  bench: BenchView
  cup: CupView
  graph: GraphView
  /** The notebook's entries in the order they are made. */
  worksheet: EntryView[]
  outcome: RunOutcome
  /** One run of the salt counts. */
  done: boolean
  /** Null until the part is done, so that a page cannot show it by mistake. */
  expected: Expected | null
}

/** A run's outcome; `run` is one of the salt's runs. */
export function runOutcome(m: HotcoldModel, state: HotcoldState, salt: SaltId, run: Run): RunOutcome {
  const judged = judge(m, state.seed, salt, run)
  if (judged === null) return { state: 'open' }
  return judged.reasons.length === 0 ? { state: 'counts' } : { state: 'does-not-count', reasons: judged.reasons }
}

/** A salt's part as its page shows it: the current run's bench, cup, graph and notebook, and how the part stands. */
export function runView(m: HotcoldModel, state: HotcoldState, salt: SaltId): RunView {
  const run = currentRun(state, salt)
  const shown = readingsOf(m, state.seed, salt, run)
  const curve = curveOfRun(run, shown)
  // In Guided an entry is checked as it is made, so its verdict shows at once; in Challenge, once the notebook is checked.
  const verdicts = judge(m, state.seed, salt, state.mode === 'guided' ? { ...run, closed: true } : run)?.verdicts
  const done = saltDone(m, state, salt)
  return {
    runs: state.runs[salt].length,
    bench: { balanceCg: runSetup(m, state.seed, salt, run.index).saltCg },
    cup: { lidOn: run.lidFrom !== null, stirring: run.stirFrom !== null, loggerStarted: run.logger, saltAdded: run.changedAt !== null, notebookBegun: Object.values(run.entries).some((entry) => entry !== null) },
    graph: { readings: shown, changedAt: run.changedAt, extreme: curve ? { step: curve.extremeStep, tenths: curve.extreme } : null, turned: curve?.turned ?? false, looked: run.looked, full: run.steps + m.runOnSteps > m.maxSteps },
    worksheet: FIELDS.map((field) => ({ field, value: run.entries[field], blocked: entryBlocked(m, state, salt, field), verdict: verdicts?.[field] ?? null })),
    outcome: runOutcome(m, state, salt, run),
    done,
    expected: done ? { went: m.salts[salt].solutionJ < 0 ? 'warmer' : 'colder', kilojoulesPerMole: m.salts[salt].solutionJ / 1000 } : null,
  }
}

/** Part 3 as its page shows it. */
export interface PacksView {
  /** Both runs count, so the questions can be answered. */
  open: boolean
  /** Each question with the salt answered to it, and whether that is right where it is shown: in Guided for every answer given, in Challenge once the answers are checked. Null otherwise. */
  questions: { id: Question; answer: SaltId | null; right: boolean | null }[]
  /** The answers have been checked. */
  checked: boolean
  /** Checked, and both right. */
  done: boolean
}

export function packsView(m: HotcoldModel, state: HotcoldState): PacksView {
  const { packs } = state
  const judged = packs.checked || state.mode === 'guided'
  return {
    open: packsOpen(m, state),
    questions: QUESTIONS.map((id) => ({ id, answer: packs[id], right: judged && packs[id] !== null ? answerRight(m, id, packs[id]) : null })),
    checked: packs.checked,
    done: packsDone(m, state),
  }
}

/** The outcomes of every run of a salt, in order, for its record. */
export const runOutcomes = (m: HotcoldModel, state: HotcoldState, salt: SaltId): RunOutcome[] => state.runs[salt].map((run) => runOutcome(m, state, salt, run))

/** The parts that are done, in their order. */
export const doneParts = (m: HotcoldModel, state: HotcoldState): PartId[] => PART_IDS.filter((part) => (part === 'packs' ? packsDone(m, state) : saltDone(m, state, part)))

/** True where part 3's answers are checked and not both right: they can then be emptied and given again. */
export const packsMissed = (m: HotcoldModel, state: HotcoldState): boolean => state.packs.checked && !packsRight(m, state.packs)
