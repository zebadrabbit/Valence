import { PART_IDS, type PartId } from '@/chem-data/density/data'
import { toNumber, exactOf } from '../figures'
import { entryBlocked, type Blocked } from './actions'
import type { DensityModel } from './model'
import { scaleView, type Eye, type ScaleView } from './readings'
import { runSetup } from './setup'
import { balanceOf, benchOf, currentRun, cylinderOf, judge, partDone, resultOf, seenE3, unknownOf, verdictsOf, type Bench, type DensityState, type Reason, type Run } from './state'
import { FIELDS, figuresOfEntry, kindOf, READ_FROM, type Field, type Kind, type Value, type Verdict } from './worksheet'
import type { Instrument } from './readings'

// Everything the app shows, worked out from the stored record. Nothing here gives which liquid or which metal an
// unknown is, or the figure a density is held to, until a run of its part counts. A scale is handed over as it
// stands, for the page to draw and to put into words; the wording is the app's.

/** The paper note against one ruler: where its far edges stand, with its near edges on the zero mark. */
export interface NoteView {
  length: ScaleView
  width: ScaleView
}

export interface BalanceView {
  /** What is on the pan. */
  holds: 'nothing' | 'object' | 'empty-cylinder' | 'cylinder-with-liquid' | 'pieces' | 'wet-pieces'
  /** What the display shows, in hundredths of a gram: every figure of it is part of the reading. Null with nothing on the pan. */
  cg: number | null
}

export interface CylinderView {
  holds: 'nothing' | 'water' | 'unknown-liquid'
  /** The pieces of metal are in it. */
  pieces: boolean
  /** Where the eye is. */
  eye: Eye
  /** The bottom of the liquid's curve as it looks from where the eye is; null for an empty cylinder. */
  scale: ScaleView | null
}

/** What a part's bench shows. Null where the part has no such thing. */
export interface BenchView {
  /** Part 1: the note against the ruler marked in centimetres, and against the one marked in millimetres. */
  rulerCm: NoteView | null
  rulerMm: NoteView | null
  /** Part 1: the thermometer in ice and water. */
  thermometer: ScaleView | null
  cylinder: CylinderView
  balance: BalanceView
  /** How far the bench has been worked (parts 2 and 3). */
  steps: Bench
}

export interface EntryView {
  field: Field
  kind: Kind
  /** The instrument a reading is taken from; null for an entry that is worked out or chosen. */
  instrument: Instrument | null
  /** What is entered; null where nothing is. */
  value: Value | null
  /** How many significant figures the entered number has; null for an empty field and for a name. */
  figures: number | null
  /** Why the entry cannot be made now; null where its field is open. */
  blocked: Blocked | null
  /** Whether it is right, where that is shown: in Guided for every entry made, in Challenge once the notebook is checked. Null otherwise. */
  verdict: Verdict | null
}

/** A run as its record names it. */
export type RunOutcome =
  /** The notebook has not been checked. */
  | { state: 'open' }
  /** `percentOff` is how far the density is from the stored figure, in percent of it: negative where it is the smaller. Null for part 1, which has no stored figure. */
  | { state: 'counts'; percentOff: number | null }
  /** Why it does not count. `percentOff` is null until a run of the part counts: with the learner's own density it would give the stored figure. */
  | { state: 'does-not-count'; reasons: Reason[]; percentOff: number | null }

/** What a part's result is held to: for parts 2 and 3, which row of the table the unknown is, with its density in g/mL. Handed over only once a run of the part counts. */
export type Expected = { kind: 'readings' } | { kind: 'unknown'; id: string; density: number }

export interface PartView {
  /** How many runs of the part there are; the views below are of the last. */
  runs: number
  bench: BenchView
  /** The notebook's entries in the order they are made. */
  notebook: EntryView[]
  outcome: RunOutcome
  /** One run of the part counts. */
  done: boolean
  /** Null until the part is done, so that a page cannot show it by mistake. */
  expected: Expected | null
}

function benchView(m: DensityModel, seed: number, part: PartId, run: Run): BenchView {
  const setup = runSetup(m, seed, run.index)
  const note = (ruler: 'ruler-cm' | 'ruler-mm'): NoteView => ({ length: scaleView(m, ruler, setup.noteLengthE2 * 10), width: scaleView(m, ruler, setup.noteWidthE2 * 10) })
  const cylinder = cylinderOf(m, seed, part, run)
  const balance = balanceOf(m, seed, part, run)
  return {
    rulerCm: part === 'reading' ? note('ruler-cm') : null,
    rulerMm: part === 'reading' ? note('ruler-mm') : null,
    thermometer: part === 'reading' ? scaleView(m, 'thermometer', setup.thermometerTenths * 100) : null,
    cylinder: { holds: cylinder?.holds ?? 'nothing', pieces: cylinder?.pieces ?? false, eye: run.eye, scale: cylinder === null ? null : scaleView(m, 'cylinder', seenE3(m, cylinder.tenthMl * 100, run.eye)) },
    balance: { holds: balance?.holds ?? 'nothing', cg: balance?.cg ?? null },
    steps: benchOf(part, run),
  }
}

const percentOff = (density: number, storedE3: number) => ((density - storedE3 / 1000) / (storedE3 / 1000)) * 100

/** A run's outcome; `run` is one of the part's runs. */
export function runOutcome(m: DensityModel, state: DensityState, part: PartId, run: Run): RunOutcome {
  const judged = judge(m, state.seed, part, run)
  if (judged === null) return { state: 'open' }
  if (part === 'reading') return judged.reasons.length === 0 ? { state: 'counts', percentOff: null } : { state: 'does-not-count', reasons: judged.reasons, percentOff: null }
  const { density } = resultOf(part, run.entries)
  // A density that no entry leads to is not a measurement to set beside the stored figure.
  const measured = density !== null && judged.verdicts[part === 'liquid' ? 'liquidDensity' : 'metalDensity']?.follows === true
  const off = measured ? percentOff(toNumber(exactOf(density)), unknownOf(m, state.seed, part).densityE3) : null
  return judged.reasons.length === 0 ? { state: 'counts', percentOff: off } : { state: 'does-not-count', reasons: judged.reasons, percentOff: partDone(m, state, part) ? off : null }
}

function expectedOf(m: DensityModel, state: DensityState, part: PartId): Expected {
  if (part === 'reading') return { kind: 'readings' }
  const unknown = unknownOf(m, state.seed, part)
  return { kind: 'unknown', id: unknown.id, density: unknown.densityE3 / 1000 }
}

/** A part as its page shows it: the current run's bench and notebook, and how the part stands. */
export function partView(m: DensityModel, state: DensityState, part: PartId): PartView {
  const run = currentRun(state, part)
  // In Guided an entry is checked as it is made, so its verdict shows at once; in Challenge, once the notebook is checked.
  const verdicts = state.mode === 'guided' || run.closed ? verdictsOf(m, state.seed, part, run) : undefined
  const done = partDone(m, state, part)
  return {
    runs: state.parts[part].length,
    bench: benchView(m, state.seed, part, run),
    notebook: FIELDS[part].map((field) => ({
      field,
      kind: kindOf(field),
      instrument: READ_FROM[field] ?? null,
      value: run.entries[field],
      figures: figuresOfEntry(m, run.entries, field),
      blocked: entryBlocked(m, state, part, field),
      verdict: verdicts?.[field] ?? null,
    })),
    outcome: runOutcome(m, state, part, run),
    done,
    expected: done ? expectedOf(m, state, part) : null,
  }
}

/** The outcomes of every run of a part, in order, for its record. */
export const runOutcomes = (m: DensityModel, state: DensityState, part: PartId): RunOutcome[] => state.parts[part].map((run) => runOutcome(m, state, part, run))

/** The parts that are done, in their order. */
export const doneParts = (m: DensityModel, state: DensityState): PartId[] => PART_IDS.filter((part) => partDone(m, state, part))
