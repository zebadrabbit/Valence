import { PART_IDS, type PartId } from '@/chem-data/calorimetry/data'
import { entryBlocked, type Blocked } from './actions'
import type { CalorimetryModel } from './model'
import { labSetup, runSetup } from './setup'
import { curveOf, currentRun, judge, partDone, readingsOf, storedResult, type CalorimetryState, type Reason, type Run } from './state'
import { FIELDS, percentOff, type Field, type Value, type Verdict } from './worksheet'

// Everything the app shows, worked out from the stored record. Nothing here gives which metal the piece is, a
// reading the logger has not yet taken, or the value a result is held to, until a run of the part counts. The
// wording is the app's: these hand over identifiers and numbers.

/** What the bench shows for a run: the readings a learner takes from it. Null where the part has no such thing. */
export interface BenchView {
  /** The balance's reading for the ammonium nitrate (part 2) or the piece of metal (part 3), in hundredths of a gram. */
  balanceCg: number | null
  /** The thermometer in the boiling water (part 3), in tenths of a degree. */
  bathTenths: number | null
}

export interface CupView {
  lidOn: boolean
  stirring: boolean
  loggerStarted: boolean
  /** The second solution is in, or the solid, or the hot metal. */
  changeStarted: boolean
  /** The worksheet has an entry, so the cup is left as it is. */
  worksheetBegun: boolean
}

export interface GraphView {
  /** The logger's readings so far, in tenths of a degree, one for each step from 0. */
  readings: number[]
  /** The step after whose reading the change was started; null before. */
  changedAt: number | null
  /** The highest or lowest reading after the change so far, with the first step that shows it; null until a reading has moved. */
  extreme: { step: number; tenths: number } | null
  /** Whether the curve has turned back towards the room's temperature. */
  turned: boolean
  /** The steps whose readings have been looked at. */
  looked: number[]
  /** Whether the logger can take more readings. */
  full: boolean
}

export interface EntryView {
  field: Field
  /** What is entered; null where nothing is. */
  value: Value | null
  /** Why the entry cannot be made now; null where its field is open. */
  blocked: Blocked | null
  /** Whether it follows, where that is shown: in Guided for every entry made, in Challenge once the worksheet is checked. Null otherwise. */
  verdict: Verdict | null
}

/** A run as its record names it. */
export type RunOutcome =
  /** The worksheet has not been checked. */
  | { state: 'open' }
  /** `percentOff` is how far the size of the result is from the size of the stored value, in percent: negative where the result is the smaller. */
  | { state: 'counts'; percentOff: number }
  /** Why it does not count. `percentOff` is null until a run of the part counts: with the learner's own result it would give the stored value. */
  | { state: 'does-not-count'; reasons: Reason[]; percentOff: number | null }

/** What a part's result is held to. Handed over only once a run of the part counts. */
export type Expected = { kind: 'enthalpy'; kilojoulesPerMole: number } | { kind: 'metal'; metalId: string; specificHeat: number }

export interface PartView {
  /** How many runs of the part there are; the views below are of the last. */
  runs: number
  bench: BenchView
  cup: CupView
  graph: GraphView
  /** The worksheet's entries in the order they are worked out. */
  worksheet: EntryView[]
  outcome: RunOutcome
  /** One run of the part counts. */
  done: boolean
  /** The stored value, and for part 3 which metal the piece is; null until the part is done, so that a page cannot show it by mistake. */
  expected: Expected | null
}

function benchOf(m: CalorimetryModel, seed: number, part: PartId, run: Run): BenchView {
  const setup = runSetup(m, seed, part, run.index)
  return { balanceCg: part === 'dissolving' ? setup.saltCg : part === 'metal' ? setup.metalCg : null, bathTenths: part === 'metal' ? setup.bathTenths : null }
}

/** A run's outcome; `run` is one of the part's runs. */
export function runOutcome(m: CalorimetryModel, state: CalorimetryState, part: PartId, run: Run): RunOutcome {
  const judged = judge(m, state.seed, part, run)
  if (judged === null) return { state: 'open' }
  const result = part === 'metal' ? run.entries.specificHeat : run.entries.perMole
  const { stored, scale } = storedResult(m, state.seed, part)
  // A result of the wrong sign, or one no entry leads to, is not a measurement to set beside the stored value.
  const measured = result !== null && judged.verdicts[part === 'metal' ? 'specificHeat' : 'perMole']?.follows === true
  const off = measured && partDone(m, state, part) ? percentOff(result, stored, scale) : null
  return judged.reasons.length === 0 ? { state: 'counts', percentOff: percentOff(result!, stored, scale) } : { state: 'does-not-count', reasons: judged.reasons, percentOff: off }
}

function expectedOf(m: CalorimetryModel, state: CalorimetryState, part: PartId): Expected {
  const { stored, scale } = storedResult(m, state.seed, part)
  if (part !== 'metal') return { kind: 'enthalpy', kilojoulesPerMole: stored / scale }
  return { kind: 'metal', metalId: m.candidates[labSetup(m, state.seed).metalIndex]!.id, specificHeat: stored / scale }
}

/** A part as its page shows it: the current run's bench, cup, graph and worksheet, and how the part stands. */
export function partView(m: CalorimetryModel, state: CalorimetryState, part: PartId): PartView {
  const run = currentRun(state, part)
  const shown = readingsOf(m, state.seed, part, run)
  const curve = curveOf(run, shown)
  // In Guided an entry is checked as it is made, so its verdict shows at once; in Challenge, once the worksheet is checked.
  const verdicts = judge(m, state.seed, part, state.mode === 'guided' ? { ...run, closed: true } : run)?.verdicts
  const done = partDone(m, state, part)
  return {
    runs: state.parts[part].length,
    bench: benchOf(m, state.seed, part, run),
    cup: { lidOn: run.lidFrom !== null, stirring: run.stirFrom !== null, loggerStarted: run.logger, changeStarted: run.changedAt !== null, worksheetBegun: Object.values(run.entries).some((entry) => entry !== null) },
    graph: { readings: shown, changedAt: run.changedAt, extreme: curve ? { step: curve.extremeStep, tenths: curve.extreme } : null, turned: curve?.turned ?? false, looked: run.looked, full: run.steps + m.runOnSteps > m.maxSteps },
    worksheet: FIELDS[part].map((field) => ({
      field,
      value: run.entries[field],
      blocked: entryBlocked(m, state, part, field),
      verdict: verdicts?.[field] ?? null,
    })),
    outcome: runOutcome(m, state, part, run),
    done,
    expected: done ? expectedOf(m, state, part) : null,
  }
}

/** The outcomes of every run of a part, in order, for its record. */
export const runOutcomes = (m: CalorimetryModel, state: CalorimetryState, part: PartId): RunOutcome[] => state.parts[part].map((run) => runOutcome(m, state, part, run))

/** The parts that are done, in their order. */
export const doneParts = (m: CalorimetryModel, state: CalorimetryState): PartId[] => PART_IDS.filter((part) => partDone(m, state, part))
