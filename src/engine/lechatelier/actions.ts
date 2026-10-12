import { SYSTEM_IDS, type SystemId, type Way } from '@/chem-data/lechatelier/data'
import type { LechatelierModel } from './model'
import { apply, shownAtEnd, wrongFieldsOf, type Field, type Look, type Observation, type Refused, type RunEvent, type RunState } from './run'
import { currentRun, MAX_EVENTS, MAX_RUNS, newRun, runCounts, runStateOf, statusOf, systemModel, type LechatelierState, type Mode } from './state'

// Every learner action: when it can be done, and what it does. The four systems can be worked in any order, each
// on its own tubes, and a system can be worked again at any time. A completed lab still takes actions, so that a
// system can be gone through again; its status stays completed.
//
// The two modes differ here and nowhere else in the engine (spec 18.3). Guided checks each entry as it is given:
// it refuses an observation that is not what the tube shows and an answer that is not right, so everything it
// records is right, and it checks a system by itself once its last disturbance is done. Challenge records
// whatever it is given, and checks a system when asked. Neither judges the prediction, which is only kept. A mode
// changed to Guided in the middle of a disturbance finds what Challenge recorded there: Guided takes no answer
// until that observation is what the tube shows. What Challenge recorded at a disturbance that is done stays.

export type Action =
  | { type: 'setMode'; mode: Mode }
  /** Say which way the equilibrium will go. It can be changed until the disturbance's action begins. */
  | { type: 'predict'; system: SystemId; way: Way }
  /** One press of the action of the disturbance the system has reached: a portion goes in, or the tube goes into its bath. */
  | { type: 'act'; system: SystemId }
  /** At one part of the disturbance's tube. Stored, since the looks open the observation. */
  | { type: 'look'; system: SystemId; at: Look }
  /** Record what is seen in the tube. */
  | { type: 'observe'; system: SystemId; observation: Observation }
  /** Answer the disturbance's question: a way the equilibrium went, or what took the metal ion away. It is said once, and ends the disturbance. */
  | { type: 'answer'; system: SystemId; is: string }
  /** Check the system's observations and answers together. Guided does it by itself. */
  | { type: 'checkSystem'; system: SystemId }
  /** Abandon the system's current run, or leave a finished one behind, and set the system up again. */
  | { type: 'workAgain'; system: SystemId }

/** Why an action cannot be done now. The reason names what is missing and never what an answer should be. */
export type Blocked =
  | Refused
  | 'unknown-system'
  | 'nothing-to-repeat'
  | 'no-more-runs'
  | 'run-too-long'
  /** Guided only: an observation that is not what the tube shows, and an answer that is not right. */
  | 'does-not-match'
  | 'not-right'

type RunAction = Exclude<Action, { type: 'setMode' } | { type: 'workAgain' }>

function eventOf(action: RunAction): RunEvent {
  switch (action.type) {
    case 'predict':
      return { t: 'predict', way: action.way }
    case 'act':
      return { t: 'act' }
    case 'look':
      return { t: 'look', at: action.at }
    case 'observe':
      return { t: 'observe', solid: action.observation?.solid, liquid: action.observation?.liquid }
    case 'answer':
      return { t: 'answer', is: action.is }
    case 'checkSystem':
      return { t: 'check' }
  }
}

/** What Guided will not record, though the run could take it: null where it would. */
function guidedRefuses(m: LechatelierModel, systemId: SystemId, run: RunState, action: RunAction): Blocked | null {
  const disturbance = systemModel(m, systemId).disturbances[run.at]
  if (!disturbance) return null
  if (action.type === 'observe') return wrongFieldsOf(action.observation, shownAtEnd(disturbance)).length === 0 ? null : 'does-not-match'
  if (action.type === 'answer') {
    // An observation that Challenge took, before the mode was changed, and that is not what the tube shows is put right first: Guided ends no disturbance on an entry it has said is not right, since nothing of a disturbance can be entered again once it is done.
    const { observation } = run.steps[run.at]!
    if (observation !== null && wrongFieldsOf(observation, shownAtEnd(disturbance)).length > 0) return 'does-not-match'
    return action.is === disturbance.right ? null : 'not-right'
  }
  return null
}

/** null when the action can be done now; otherwise the first reason that applies. */
export function can(m: LechatelierModel, state: LechatelierState, action: Action): Blocked | null {
  if (action.type === 'setMode') return null
  if (!SYSTEM_IDS.includes(action.system)) return 'unknown-system'
  const stored = currentRun(state, action.system)
  if (action.type === 'workAgain') {
    if (stored.events.length === 0) return 'nothing-to-repeat'
    // A record holds so many runs of a system and no more. Past that a run is set up again in its own place, which a run that counts is not: the system counts by it.
    return state.systems[action.system].length >= MAX_RUNS && runCounts(m, action.system, stored) ? 'no-more-runs' : null
  }
  const run = runStateOf(m, action.system, stored)
  const next = apply(m, systemModel(m, action.system), run, eventOf(action))
  if (typeof next === 'string') return next
  // A check that Guided adds by itself may follow, so one place is kept for it.
  if (next !== run && stored.events.length >= MAX_EVENTS - 1) return 'run-too-long'
  return state.mode === 'guided' ? guidedRefuses(m, action.system, run, action) : null
}

/**
 * The fields of an observation that Guided would refuse, for its feedback: those that are not what the tube of the
 * disturbance the system has reached shows now. Empty in Challenge, whatever the observation, so that nothing
 * there can be tried against the tube before it is recorded and checked.
 */
export function mismatch(m: LechatelierModel, state: LechatelierState, systemId: SystemId, observation: Observation): Field[] {
  if (state.mode !== 'guided' || !SYSTEM_IDS.includes(systemId)) return []
  const run = runStateOf(m, systemId, currentRun(state, systemId))
  const disturbance = systemModel(m, systemId).disturbances[run.at]
  if (!disturbance || run.checked) return []
  return wrongFieldsOf(observation, shownAtEnd(disturbance))
}

/** The state after an action. An action that cannot be done now, or that changes nothing, returns the very same object. */
export function reduce(m: LechatelierModel, state: LechatelierState, action: Action): LechatelierState {
  if (can(m, state, action) !== null) return state
  if (action.type === 'setMode') return action.mode === state.mode ? state : { ...state, mode: action.mode }
  const systemId = action.system
  const stored = currentRun(state, systemId)
  const withRuns = (runs: LechatelierState['systems'][SystemId]): LechatelierState => {
    const next = { ...state, systems: { ...state.systems, [systemId]: runs } }
    return { ...next, status: statusOf(m, next) }
  }
  if (action.type === 'workAgain') {
    const runs = state.systems[systemId]
    // Past the most runs a record holds, the last run is set up again in its own place, so that there is always a way on.
    return withRuns(runs.length >= MAX_RUNS ? [...runs.slice(0, -1), newRun(runs.length - 1)] : [...runs, newRun(runs.length)])
  }

  const system = systemModel(m, systemId)
  const before = runStateOf(m, systemId, stored)
  const event = eventOf(action)
  const after = apply(m, system, before, event) as RunState
  if (after === before) return state
  const events = [...stored.events, event]
  // In Guided a system is checked as soon as its last disturbance is done.
  if (state.mode === 'guided' && action.type === 'answer' && after.at >= system.disturbances.length) events.push({ t: 'check' })
  return withRuns([...state.systems[systemId].slice(0, -1), { ...stored, events }])
}
