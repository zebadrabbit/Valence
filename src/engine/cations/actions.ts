import { PART_IDS, type IonId, type PartId } from '@/chem-data/cations/data'
import type { CationsModel } from './model'
import { apply, FIELDS, isOver, matches, placesRight, STEP_TUBES, wrongFieldsOf, observationOf, type Field, type Look, type Observation, type Refused, type RunEvent, type RunState } from './run'
import { currentRun, MAX_EVENTS, MAX_RUNS, newRun, runCounts, runStateOf, statusOf, type CationsState, type Mode } from './state'
import { hasSolid, showsOf } from './tube'

// Every learner action: when it can be done, and what it does. The two parts can be worked in any order, each on
// its own tubes, and a part can be run again at any time, with a new unknown in part 2. A completed lab still
// takes actions, so that part 2 can go on being practised; its status stays completed.
//
// The two modes differ here and nowhere else in the engine (spec 17.3). Guided refuses an observation that is not
// what the tube shows and a tile that does not belong in its place, so everything it records is right; it checks a
// step by itself as soon as there is nothing left to record; and it is asked before a slip of technique. Challenge
// records whatever it is given, warns of nothing, and checks a step when asked.

export type Action =
  | { type: 'setMode'; mode: Mode }
  /** Add the reagent of the step the part has reached. At step 5 this is one addition of nitric acid. */
  | { type: 'add'; part: PartId }
  /** Stand the tube in the boiling bath (step 2). */
  | { type: 'heat'; part: PartId }
  | { type: 'centrifuge'; part: PartId }
  /** Pour the liquid off the solid: away at step 1, into the second tube at step 2, into the third at step 4. */
  | { type: 'pourOff'; part: PartId }
  /** Test the liquid with litmus paper (step 5). */
  | { type: 'testLitmus'; part: PartId }
  /** At one part of the step's tube. Stored, since the looks open the observation. */
  | { type: 'look'; part: PartId; at: Look }
  /** Record what is seen in the step's tube. */
  | { type: 'observe'; part: PartId; observation: Observation }
  /** Part 1: put a tile in a place of the flow chart, or take it out. */
  | { type: 'place'; part: PartId; place: string; tile: string }
  | { type: 'unplace'; part: PartId; place: string; tile: string }
  /** Check the step's observation and, in part 1, its places. Guided does it by itself. */
  | { type: 'checkStep'; part: PartId }
  /** Part 2: say which ions the sample holds. It is said once for each run. */
  | { type: 'nameIons'; part: PartId; ions: IonId[] }
  /** Abandon the part's current run, or leave a finished one behind, and set the part up again: with a new unknown in part 2. */
  | { type: 'runAgain'; part: PartId }

/** Why an action cannot be done now. The reason names what is missing and never what an answer should be. */
export type Blocked =
  | Refused
  | 'unknown-part'
  | 'nothing-to-repeat'
  | 'no-more-runs'
  | 'run-too-long'
  /** Guided only: an observation that is not what the tube shows, a tile that does not belong in its place, and a step whose places are not yet right. */
  | 'does-not-match'
  | 'wrong-place'
  | 'chart-not-right'

/** A slip of technique about to be made. Guided mode asks before going on; Challenge mode does not look. */
export type Warning = 'not-centrifuged' | 'not-heated' | 'not-acid'

type RunAction = Exclude<Action, { type: 'setMode' } | { type: 'runAgain' }>

function eventOf(action: RunAction): RunEvent {
  switch (action.type) {
    case 'add':
      return { t: 'add' }
    case 'heat':
      return { t: 'heat' }
    case 'centrifuge':
      return { t: 'spin' }
    case 'pourOff':
      return { t: 'pour' }
    case 'testLitmus':
      return { t: 'litmus' }
    case 'look':
      return { t: 'look', at: action.at }
    case 'observe':
      return { t: 'observe', solid: action.observation?.solid, liquid: action.observation?.liquid }
    case 'place':
      return { t: 'place', place: action.place, tile: action.tile }
    case 'unplace':
      return { t: 'unplace', place: action.place, tile: action.tile }
    case 'checkStep':
      return { t: 'check' }
    case 'nameIons':
      return { t: 'name', ions: action.ions }
  }
}

/** What Guided will not record, though the run could take it: null where it would. */
function guidedRefuses(m: CationsModel, part: PartId, run: RunState, action: RunAction): Blocked | null {
  const at = run.step
  const step = run.steps[at]
  if (!step) return null
  switch (action.type) {
    case 'observe': {
      const showed = observationOf(showsOf(m, run.tubes[STEP_TUBES[at]!]), m)
      return FIELDS.every((field) => action.observation[field] === showed[field]) ? null : 'does-not-match'
    }
    case 'place':
      return m.places.find((place) => place.id === action.place)!.holds.includes(action.tile) ? null : 'wrong-place'
    case 'checkStep':
      if (!matches(step)) return 'does-not-match'
      return part === 'known' && !placesRight(m, at, step) ? 'chart-not-right' : null
    default:
      return null
  }
}

/** null when the action can be done now; otherwise the first reason that applies. */
export function can(m: CationsModel, state: CationsState, action: Action): Blocked | null {
  if (action.type === 'setMode') return null
  if (!PART_IDS.includes(action.part)) return 'unknown-part'
  const stored = currentRun(state, action.part)
  if (action.type === 'runAgain') {
    if (stored.events.length === 0) return 'nothing-to-repeat'
    // A record holds so many runs of a part and no more. Past that a run is set up again in its own place, which a run that counts is not: the part is done by it.
    return state.parts[action.part].length >= MAX_RUNS && runCounts(m, state.seed, action.part, stored) ? 'no-more-runs' : null
  }
  const run = runStateOf(m, state.seed, action.part, stored)
  const next = apply(m, action.part, run, eventOf(action))
  if (typeof next === 'string') return next
  // A check that Guided adds by itself may follow, so one place is kept for it.
  if (next !== run && stored.events.length >= MAX_EVENTS - 1) return 'run-too-long'
  return state.mode === 'guided' ? guidedRefuses(m, action.part, run, action) : null
}

/**
 * The slips of technique this action would make. Empty when there are none, when the action is blocked anyway,
 * and in Challenge. In Guided: pouring off a liquid that still has its solid spread through it, or the water of
 * step 2 before it has been heated; and recording, or checking, what is seen at step 5 before litmus has shown
 * the liquid acid. The page asks first, and the same action sent again is the way on.
 */
export function warnings(m: CationsModel, state: CationsState, action: Action): Warning[] {
  if (state.mode !== 'guided' || action.type === 'setMode' || action.type === 'runAgain' || can(m, state, action) !== null) return []
  const run = runStateOf(m, state.seed, action.part, currentRun(state, action.part))
  const at = run.step
  const step = run.steps[at]
  if (!step) return []
  if (action.type === 'pourOff') {
    const tube = run.tubes[STEP_TUBES[at]!]
    return [...(tube.suspended && hasSolid(tube) ? (['not-centrifuged'] as const) : []), ...(at === 1 && !step.heated ? (['not-heated'] as const) : [])]
  }
  const last = at === run.steps.length - 1
  if (last && action.type === 'observe' && !step.acidShown) return ['not-acid']
  if (last && action.type === 'checkStep' && step.beforeAcid) return ['not-acid']
  return []
}

/**
 * The fields of an observation that Guided would refuse, for its feedback: those that are not what the step's
 * tube shows now. Empty in Challenge, whatever the observation, so that nothing there can be tried against the
 * tube before it is recorded and checked.
 */
export function mismatch(m: CationsModel, state: CationsState, part: PartId, observation: Observation): Field[] {
  if (state.mode !== 'guided' || !PART_IDS.includes(part)) return []
  const run = runStateOf(m, state.seed, part, currentRun(state, part))
  const tubeId = STEP_TUBES[run.step]
  if (tubeId === undefined || isOver(part, run)) return []
  return wrongFieldsOf(observation, observationOf(showsOf(m, run.tubes[tubeId]), m))
}

/** The state after an action. An action that cannot be done now, or that changes nothing, returns the very same object. */
export function reduce(m: CationsModel, state: CationsState, action: Action): CationsState {
  if (can(m, state, action) !== null) return state
  if (action.type === 'setMode') return action.mode === state.mode ? state : { ...state, mode: action.mode }
  const { part } = action
  const stored = currentRun(state, part)
  const withRuns = (runs: CationsState['parts'][PartId]): CationsState => {
    const next = { ...state, parts: { ...state.parts, [part]: runs } }
    return { ...next, status: statusOf(m, next) }
  }
  if (action.type === 'runAgain') {
    const runs = state.parts[part]
    // Past the most runs a record holds, the last run is set up again in its own place, with the unknown it had, so that there is always a way on.
    return withRuns(runs.length >= MAX_RUNS ? [...runs.slice(0, -1), newRun(runs.length - 1)] : [...runs, newRun(runs.length)])
  }

  const before = runStateOf(m, state.seed, part, stored)
  const event = eventOf(action)
  const after = apply(m, part, before, event) as RunState
  if (after === before) return state
  const events = [...stored.events, event]
  // In Guided everything recorded is right, so a step is checked as soon as nothing is left to record in it.
  const step = after.steps[after.step]
  const settled = step !== undefined && !step.checked && matches(step) && (part === 'unknown' || placesRight(m, after.step, step))
  if (state.mode === 'guided' && settled && (action.type === 'observe' || action.type === 'place' || action.type === 'unplace')) events.push({ t: 'check' })
  return withRuns([...state.parts[part].slice(0, -1), { ...stored, events }])
}
