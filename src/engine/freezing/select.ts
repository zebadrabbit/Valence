import { PART_IDS, type PartId } from '@/chem-data/freezing/data'
import { entryBlocked, type Blocked } from './actions'
import type { FreezingModel } from './model'
import { labSetup } from './setup'
import { benchOf, countedSolutes, currentRun, dissolvedIn, endOf, judge, partDone, readingsOf, statesOf, storedResult, wantedOf, type FreezingState, type Reason, type Run } from './state'
import { FIELDS, percentOff, type Field, type Value, type Verdict } from './worksheet'

// Everything the app shows, worked out from the stored record. Nothing here gives which liquid the unknown is, a
// reading the logger has not yet taken, how far the probe is off, or the figure a result is held to, until a run
// that counts allows it. The wording is the app's: these hand over identifiers and numbers.

/** What the bench shows for a run: the balance's readings as they are made, in hundredths of a gram. */
export interface BenchView {
  /** Part 3: the solute chosen for this run, by its id; null until one is, and in the other parts. */
  solute: string | null
  /** The solute weighed out: the unknown liquid in part 2, the chosen solute in part 3. Null in part 1 and until a solute is chosen. */
  soluteCg: number | null
  /** The solution, once it has been weighed: with the ice in it if the cup was not strained. */
  solutionCg: number | null
}

/** How much ice the cup is seen to hold: none before it is filled, then plenty, a little, or none left. */
export type Ice = 'not-yet' | 'plenty' | 'little' | 'none'

export interface CupView {
  filled: boolean
  lidOn: boolean
  stirring: boolean
  loggerStarted: boolean
  /** The solute is in. */
  soluteAdded: boolean
  /** The cup has been poured through the strainer. */
  strained: boolean
  /** The solution has been weighed, strained or not: nothing more is done to the cup. */
  weighed: boolean
  /** The notebook has an entry, so the cup is left as it is. */
  worksheetBegun: boolean
  /** The ice in the cup at the latest reading; once strained, the ice the strainer held back. */
  ice: Ice
}

export interface GraphView {
  /** The logger's readings so far, in hundredths of a degree, one for each step from 0. */
  readings: number[]
  /** The step after whose reading the solute went in; null before, and in part 1. */
  addedAt: number | null
  /** The step at which the cup was strained, or weighed unstrained: the logger's last reading. Null before. */
  endedAt: number | null
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

/** A run as its record names it. */
export type RunOutcome =
  /** The notebook has not been checked. */
  | { state: 'open' }
  /** `percentOff` is how far the result is from the stored figure, in percent: negative where the result is the smaller. Null in part 1, whose result is a reading. */
  | { state: 'counts'; percentOff: number | null }
  /** Why it does not count. `percentOff` is null until a run of the part with the same solute counts: with the learner's own result it would give the stored figure. */
  | { state: 'does-not-count'; reasons: Reason[]; percentOff: number | null }

/** What a part's result is held to. Handed over only once a run that counts allows it. */
export type Expected =
  /** Part 1: what this probe reads in ice and water, in hundredths of a degree. */
  | { kind: 'probe'; hundredths: number }
  /** Part 2: which liquid the unknown is, and its molar mass in g/mol. */
  | { kind: 'liquid'; liquidId: string; molarMass: number }
  /** Part 3: for each solute a run that counts has been made with, the particles each formula unit gives as the model has it. */
  | { kind: 'particles'; counted: { soluteId: string; particles: number }[] }

export interface PartView {
  /** How many runs of the part there are; the views below are of the last. */
  runs: number
  bench: BenchView
  cup: CupView
  graph: GraphView
  /** The notebook's entries in the order they are worked out. */
  worksheet: EntryView[]
  outcome: RunOutcome
  /** The part is done: one run counts; in part 3, one with urea and one with a salt. */
  done: boolean
  /** Part 3: what it still wants, a run that counts with urea and one with a salt. Null in the other parts. */
  wanted: { molecule: boolean; salt: boolean } | null
  /** Null until a run that counts allows it, so that a page cannot show it by mistake. */
  expected: Expected | null
}

function iceOf(m: FreezingModel, state: FreezingState, part: PartId, run: Run): Ice {
  if (!run.filled) return 'not-yet'
  const cup = statesOf(m, state.seed, part, run)[run.steps]
  // Before the logger is started no time has passed, and all the ice is there.
  const mg = cup === undefined ? m.iceCg * 10 : cup.iceMg
  return mg === 0 ? 'none' : mg <= m.iceLowCg * 10 ? 'little' : 'plenty'
}

/** True when a run of the part that counts was made with the solute of this one: only then is how far off a result was said. */
function settled(m: FreezingModel, state: FreezingState, part: PartId, run: Run): boolean {
  return part === 'particles' ? run.solute !== null && countedSolutes(m, state).includes(run.solute) : partDone(m, state, part)
}

/** A run's outcome; `run` is one of the part's runs. */
export function runOutcome(m: FreezingModel, state: FreezingState, part: PartId, run: Run): RunOutcome {
  const judged = judge(m, state.seed, part, run)
  if (judged === null) return { state: 'open' }
  const field = part === 'unknown' ? 'molarMass' : 'ratio'
  const result = part === 'water' ? null : run.entries[field]
  const held = storedResult(m, state.seed, part, run)
  // A result that no entry leads to is not a measurement to set beside the stored figure.
  const off = result !== null && held !== null && judged.verdicts[field]?.follows === true ? percentOff(result, held.stored, held.scale) : null
  if (judged.reasons.length === 0) return { state: 'counts', percentOff: off }
  return { state: 'does-not-count', reasons: judged.reasons, percentOff: settled(m, state, part, run) ? off : null }
}

function expectedOf(m: FreezingModel, state: FreezingState, part: PartId): Expected | null {
  if (part === 'particles') {
    const counted = countedSolutes(m, state).map((soluteId) => ({ soluteId, particles: m.solutes.find((s) => s.id === soluteId)!.particlesE2 / 100 }))
    return counted.length === 0 ? null : { kind: 'particles', counted }
  }
  if (!partDone(m, state, part)) return null
  const lab = labSetup(m, state.seed)
  if (part === 'water') return { kind: 'probe', hundredths: lab.probeHundredths }
  const liquid = m.liquids[lab.liquidIndex]!
  return { kind: 'liquid', liquidId: liquid.id, molarMass: liquid.molarMassE2 / 100 }
}

/** A part as its page shows it: the current run's bench, cup, graph and notebook, and how the part stands. */
export function partView(m: FreezingModel, state: FreezingState, part: PartId): PartView {
  const run = currentRun(state, part)
  const readings = readingsOf(m, state.seed, part, run)
  const bench = benchOf(m, state.seed, part, run)
  // In Guided an entry is checked as it is made, so its verdict shows at once; in Challenge, once the notebook is checked.
  const verdicts = judge(m, state.seed, part, state.mode === 'guided' ? { ...run, closed: true } : run)?.verdicts
  return {
    runs: state.parts[part].length,
    // The mass of the unknown is the balance's reading, the same range whichever liquid it is; which liquid it is stays in dissolvedIn.
    bench: { solute: run.solute, soluteCg: part === 'water' || dissolvedIn(m, state.seed, part, run) === null ? null : bench.soluteCg, solutionCg: bench.solutionCg },
    cup: {
      filled: run.filled,
      lidOn: run.lidFrom !== null,
      stirring: run.stirFrom !== null,
      loggerStarted: run.logger,
      soluteAdded: run.addedAt !== null,
      strained: run.strainedAt !== null,
      weighed: run.weighedAt !== null,
      worksheetBegun: Object.values(run.entries).some((entry) => entry !== null),
      ice: iceOf(m, state, part, run),
    },
    graph: { readings, addedAt: run.addedAt, endedAt: endOf(run), looked: run.looked, full: run.steps + m.runOnSteps > m.maxSteps },
    worksheet: FIELDS[part].map((field) => ({ field, value: run.entries[field], blocked: entryBlocked(m, state, part, field), verdict: verdicts?.[field] ?? null })),
    outcome: runOutcome(m, state, part, run),
    done: partDone(m, state, part),
    wanted: part === 'particles' ? wantedOf(m, state) : null,
    expected: expectedOf(m, state, part),
  }
}

/** The outcomes of every run of a part, in order, for its record. */
export const runOutcomes = (m: FreezingModel, state: FreezingState, part: PartId): RunOutcome[] => state.parts[part].map((run) => runOutcome(m, state, part, run))

/** The parts that are done, in their order. */
export const doneParts = (m: FreezingModel, state: FreezingState): PartId[] => PART_IDS.filter((part) => partDone(m, state, part))
