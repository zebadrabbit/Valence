import { ION_IDS, PART_IDS, STEP_IDS, type IonId, type PartId, type StepId, type TubeId } from '@/chem-data/cations/data'
import type { CationsModel } from './model'
import { isOver, placeRight, reasonsOf, STEP_TUBES, wrongFieldsOf, type Field, type Look, type Observation, type Reason, type RunState } from './run'
import { sampleOf } from './setup'
import { currentRun, partDone, runStateOf, type CationsState, type Run } from './state'
import { showsOf, type Litmus, type TubeShows } from './tube'

// Everything the app shows, worked out from the stored record. Nothing here says which ions an unknown holds
// until they have been named, whether an observation is right until its step is checked, or why a run does not
// count until the run is over. A tube is handed over as what is seen of it: the colour of its liquid and of its
// solid, and whether the solid has settled, and never what either is or how much of it there is. The wording is
// the app's: these hand over identifiers and the record's words for colours.

export type { TubeShows }

export interface StepView {
  id: StepId
  /** `waiting` until the steps before it are done; `current` while it is worked; `done` once it is over. */
  status: 'waiting' | 'current' | 'done'
  /** The tube the step is worked in. */
  tube: TubeId
  /** What that tube shows: now, while the step is current; as it was when the step was checked, once it is done; null while it waits. */
  shows: TubeShows | null
  /** How many times the step's reagent has gone in. */
  added: number
  /** Step 2: the tube has stood in the bath. */
  heated: boolean
  /** Step 5: what litmus paper last showed, since the last acid went in; null where it has not been tried since. */
  litmus: Litmus | null
  /** The parts of the tube looked at since it last changed. Both open the observation. */
  looked: readonly Look[]
  observation: Observation | null
  checked: boolean
  /** The fields recorded that are not what the tube showed: null until the step is checked, and empty where the observation is right. */
  wrongFields: Field[] | null
}

export interface PlaceView {
  id: string
  step: StepId
  layer: 'solid' | 'liquid'
  /** The tiles put in it, in the order they went in. */
  tiles: readonly string[]
  /** It can be filled now: its step's observation is recorded and its step is not yet checked. */
  open: boolean
  /** In Guided, how many tiles belong in it: a scaffold. Null in Challenge, so that the count is not given. */
  slots: number | null
  /** Whether it holds what belongs in it: null until its step is checked. */
  right: boolean | null
}

/** The flow chart of part 1 as the learner has filled it. */
export interface ChartView {
  /** The tiles it is filled from: every one of them at every step, the distractors among them. A tile is not used up. */
  tiles: readonly string[]
  places: PlaceView[]
}

/** The finished flow chart, as a map of the scheme: what belongs in each place. */
export type ChartMap = { id: string; step: StepId; layer: 'solid' | 'liquid'; tiles: readonly string[] }[]

/** A run as its record names it. */
export type RunOutcome =
  /** There is still something to do in it. */
  | { state: 'open' }
  | { state: 'counts' }
  | { state: 'does-not-count'; reasons: Reason[] }

export interface PartView {
  /** How many runs of the part there are; the views below are of the last. */
  runs: number
  /** The step being worked; null once all five are done. */
  step: StepId | null
  steps: StepView[]
  /** What each of the three tubes shows now, whichever step is being worked: for a rack drawn beside the step's own tube. */
  rack: Record<TubeId, TubeShows>
  /** Part 1: the flow chart being filled. Null in part 2. */
  chart: ChartView | null
  /** Part 2: the finished chart, once part 1 is done. Null before that, and in part 1. */
  map: ChartMap | null
  /** Part 2: whether the ions can be named now, and what was named. Null in part 1. */
  naming: { open: boolean; named: readonly IonId[] | null } | null
  outcome: RunOutcome
  /** One run of the part counts. */
  done: boolean
  /** The ions the sample holds: the known's at all times, since it is the known, and an unknown's only once its ions have been named. */
  holds: readonly IonId[] | null
}

const outcomeOf = (reasons: Reason[] | null): RunOutcome => (reasons === null ? { state: 'open' } : reasons.length === 0 ? { state: 'counts' } : { state: 'does-not-count', reasons })

function stepViews(m: CationsModel, run: RunState): StepView[] {
  return run.steps.map((step, at): StepView => {
    const status = at < run.step ? 'done' : at === run.step ? 'current' : 'waiting'
    const tube = STEP_TUBES[at]!
    return {
      id: STEP_IDS[at]!,
      status,
      tube,
      shows: status === 'waiting' ? null : status === 'done' ? step.left : showsOf(m, run.tubes[tube]),
      added: step.added,
      heated: step.heated,
      litmus: step.litmus,
      looked: step.looked,
      observation: step.observation,
      checked: step.checked,
      wrongFields: step.checked && step.observation !== null && step.showed !== null ? wrongFieldsOf(step.observation, step.showed) : null,
    }
  })
}

function chartView(m: CationsModel, mode: CationsState['mode'], run: RunState): ChartView {
  return {
    tiles: m.tiles,
    places: m.places.map((place): PlaceView => {
      const step = run.steps[place.step]!
      const tiles = step.places[place.id] ?? []
      return {
        id: place.id,
        step: STEP_IDS[place.step]!,
        layer: place.layer,
        tiles,
        open: place.step === run.step && step.observation !== null && !step.checked,
        slots: mode === 'guided' ? place.holds.length : null,
        right: step.checked ? placeRight(place, tiles) : null,
      }
    }),
  }
}

/** The finished flow chart of part 1, as a map for part 2: handed over once a run of part 1 counts, and not before. */
export function chartMap(m: CationsModel, state: CationsState): ChartMap | null {
  if (!partDone(m, state, 'known')) return null
  return m.places.map((place) => ({ id: place.id, step: STEP_IDS[place.step]!, layer: place.layer, tiles: place.holds }))
}

/** A run's outcome; `run` is one of the part's runs. */
export function runOutcome(m: CationsModel, state: CationsState, part: PartId, run: Run): RunOutcome {
  return outcomeOf(reasonsOf(m, part, sampleOf(state.seed, part, run.index), runStateOf(m, state.seed, part, run)))
}

/** A part as its page shows it: the current run's five steps, its chart or its map, and how the part stands. */
export function partView(m: CationsModel, state: CationsState, part: PartId): PartView {
  const stored = currentRun(state, part)
  const run = runStateOf(m, state.seed, part, stored)
  const ions = sampleOf(state.seed, part, stored.index)
  const over = isOver(part, run)
  return {
    runs: state.parts[part].length,
    step: STEP_IDS[run.step] ?? null,
    steps: stepViews(m, run),
    rack: { a: showsOf(m, run.tubes.a), b: showsOf(m, run.tubes.b), c: showsOf(m, run.tubes.c) },
    chart: part === 'known' ? chartView(m, state.mode, run) : null,
    map: part === 'unknown' ? chartMap(m, state) : null,
    naming: part === 'unknown' ? { open: run.step >= STEP_IDS.length && run.named === null, named: run.named } : null,
    outcome: outcomeOf(reasonsOf(m, part, ions, run)),
    done: partDone(m, state, part),
    holds: part === 'known' || over ? ION_IDS.filter((ion) => ions.includes(ion)) : null,
  }
}

/** One run as the record lists it: what was recorded at each step, how the run came out and, once it is over, what its sample held. */
export interface RunRecord {
  steps: { id: StepId; observation: Observation | null; checked: boolean; wrongFields: Field[] | null }[]
  /** Part 1: whether each place held what belongs in it, for the places of steps that were checked. */
  chartRight: boolean | null
  named: readonly IonId[] | null
  outcome: RunOutcome
  holds: readonly IonId[] | null
}

/** Every run of a part, in order, for its record. */
export function runRecords(m: CationsModel, state: CationsState, part: PartId): RunRecord[] {
  return state.parts[part].map((stored): RunRecord => {
    const run = runStateOf(m, state.seed, part, stored)
    const ions = sampleOf(state.seed, part, stored.index)
    const over = isOver(part, run)
    const checkedPlaces = m.places.filter((place) => run.steps[place.step]!.checked)
    return {
      steps: stepViews(m, run).map(({ id, observation, checked, wrongFields }) => ({ id, observation, checked, wrongFields })),
      chartRight: part === 'known' && checkedPlaces.length > 0 ? checkedPlaces.every((place) => placeRight(place, run.steps[place.step]!.places[place.id] ?? [])) : null,
      named: run.named,
      outcome: outcomeOf(reasonsOf(m, part, ions, run)),
      holds: part === 'known' || over ? ION_IDS.filter((ion) => ions.includes(ion)) : null,
    }
  })
}

/** The parts that are done, in their order. */
export const doneParts = (m: CationsModel, state: CationsState): PartId[] => PART_IDS.filter((part) => partDone(m, state, part))
