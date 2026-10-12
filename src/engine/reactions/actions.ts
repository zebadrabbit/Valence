import { STATION_IDS, type Field, type KindAnswer, type Look, type MetalId, type StationId } from '@/chem-data/reactions/data'
import type { Entry } from '../equation'
import { checkBuilt, isBuilt, type Problem } from './built'
import type { ReactionsModel } from './model'
import { apply, complete, faultsOf, orderRight, wrongFieldsOf, type Observation, type Refused, type RunEvent, type RunState } from './run'
import { currentRun, MAX_EVENTS, MAX_RUNS, newRun, runCounts, runStateOf, stationModel, statusOf, type Mode, type ReactionsState } from './state'

// Every learner action: when it can be done, and what it does. The five stations can be worked in any order, and
// a station can be worked again at any time. A completed lab still takes actions, so that a station can be gone
// through again; its status stays completed.
//
// The two modes differ here and nowhere else in the engine (spec 24.2). Guided checks each answer as it is given:
// it refuses an observation that is not what the vessel shows, a kind that is not right, an equation with
// something wrong in it (and says which kind of thing, never what would put it right) and an order that is not
// right, so everything it records is right, and it checks a station by itself once all of it is recorded.
// Challenge records whatever it is given, and checks a station when asked. A mode changed to Guided in the middle
// of a station finds what Challenge recorded there: it stays, marked, and can be recorded again; Guided does not
// check the station by itself while any of it is not right, and the learner may still ask for the check.

export type Action =
  | { type: 'setMode'; mode: Mode }
  /** The station's one action. */
  | { type: 'act'; station: StationId }
  /** At one part of a vessel. Stored, since the looks open the observation. */
  | { type: 'look'; station: StationId; vessel: string; at: Look }
  /** Record what is seen of a vessel. */
  | { type: 'observe'; station: StationId; vessel: string; observation: Observation }
  /** Say which kind of reaction a vessel's is, or that nothing reacted. */
  | { type: 'sayKind'; station: StationId; vessel: string; kind: KindAnswer }
  /** Record the equation built for a vessel, as the page's builder hands it over. */
  | { type: 'enterEquation'; station: StationId; vessel: string; entry: Entry }
  /** Put the station's metals in order, the most active first. */
  | { type: 'sayOrder'; station: StationId; order: readonly MetalId[] }
  /** Check everything recorded at the station together. Guided does it by itself. */
  | { type: 'checkStation'; station: StationId }
  /** Abandon the station's current run, or leave a finished one behind, and set the station up again. */
  | { type: 'workAgain'; station: StationId }

/** Why an action cannot be done now. The reason names what is missing, or what kind of thing is wrong, and never what an answer should be. */
export type Blocked =
  | Refused
  | 'unknown-station'
  | 'nothing-to-repeat'
  | 'no-more-runs'
  | 'run-too-long'
  /** Guided only: an observation that is not what the vessel shows; a kind or an order that is not right; and what is wrong with an equation. */
  | 'does-not-match'
  | 'not-right'
  | Problem

type RunAction = Exclude<Action, { type: 'setMode' } | { type: 'workAgain' }>

function eventOf(action: RunAction): RunEvent {
  switch (action.type) {
    case 'act':
      return { t: 'act' }
    case 'look':
      return { t: 'look', v: action.vessel, at: action.at }
    case 'observe':
      return { t: 'observe', v: action.vessel, is: { ...(action.observation as Record<string, string>) } }
    case 'sayKind':
      return { t: 'kind', v: action.vessel, is: action.kind }
    case 'enterEquation':
      return { t: 'equation', v: action.vessel, reactants: action.entry?.reactants, products: action.entry?.products }
    case 'sayOrder':
      return { t: 'order', is: [...(action.order ?? [])] }
    case 'checkStation':
      return { t: 'check' }
  }
}

/** What Guided will not record, though the run could take it: null where it would. */
function guidedRefuses(m: ReactionsModel, stationId: StationId, action: RunAction): Blocked | null {
  const station = stationModel(m, stationId)
  if (action.type === 'sayOrder') return orderRight(station, action.order) ? null : 'not-right'
  if (action.type !== 'observe' && action.type !== 'sayKind' && action.type !== 'enterEquation') return null
  const vessel = station.vessels.find((v) => v.id === action.vessel)!
  if (action.type === 'observe') return wrongFieldsOf(vessel, action.observation).length === 0 ? null : 'does-not-match'
  if (action.type === 'sayKind') return action.kind === vessel.kind ? null : 'not-right'
  return checkBuilt(m, vessel, action.entry)
}

/** null when the action can be done now; otherwise the first reason that applies. */
export function can(m: ReactionsModel, state: ReactionsState, action: Action): Blocked | null {
  if (action.type === 'setMode') return null
  if (!STATION_IDS.includes(action.station)) return 'unknown-station'
  const stored = currentRun(state, action.station)
  if (action.type === 'workAgain') {
    if (stored.events.length === 0) return 'nothing-to-repeat'
    // A record holds so many runs of a station and no more. Past that a run is set up again in its own place, which a run that counts is not: the station counts by it.
    return state.stations[action.station].length >= MAX_RUNS && runCounts(m, action.station, stored) ? 'no-more-runs' : null
  }
  // "No reaction" is not an equation: it is said as the kind.
  if (action.type === 'enterEquation' && !isBuilt(stationModel(m, action.station), action.entry)) {
    const taken = apply(m, stationModel(m, action.station), runStateOf(m, action.station, stored), { t: 'equation', v: action.vessel, reactants: [], products: [] })
    return typeof taken === 'string' ? taken : 'invalid-entry'
  }
  const run = runStateOf(m, action.station, stored)
  const next = apply(m, stationModel(m, action.station), run, eventOf(action))
  if (typeof next === 'string') return next
  // A check that Guided adds by itself may follow, so one place is kept for it.
  if (next !== run && stored.events.length >= MAX_EVENTS - 1) return 'run-too-long'
  return state.mode === 'guided' ? guidedRefuses(m, action.station, action) : null
}

/**
 * The fields of an observation that Guided would refuse, for its feedback: those that are not what the vessel
 * shows now. Empty in Challenge, whatever the observation, so that nothing there can be tried against the vessel
 * before it is recorded and checked; and empty before the station's action, when there is nothing to record.
 */
export function mismatch(m: ReactionsModel, state: ReactionsState, stationId: StationId, vesselId: string, observation: Observation): Field[] {
  if (state.mode !== 'guided' || !STATION_IDS.includes(stationId)) return []
  const run = runStateOf(m, stationId, currentRun(state, stationId))
  const vessel = stationModel(m, stationId).vessels.find((v) => v.id === vesselId)
  if (!vessel || !run.acted || run.checked) return []
  return wrongFieldsOf(vessel, observation)
}

/** Everything is recorded and all of it is right: where Guided checks the station by itself. */
const readyToCheck = (m: ReactionsModel, stationId: StationId, run: RunState): boolean => {
  const station = stationModel(m, stationId)
  return !run.checked && complete(station, run) && faultsOf(m, station, run).length === 0
}

/** The state after an action. An action that cannot be done now, or that changes nothing, returns the very same object. */
export function reduce(m: ReactionsModel, state: ReactionsState, action: Action): ReactionsState {
  if (can(m, state, action) !== null) return state
  if (action.type === 'setMode') return action.mode === state.mode ? state : { ...state, mode: action.mode }
  const stationId = action.station
  const stored = currentRun(state, stationId)
  const withRuns = (runs: ReactionsState['stations'][StationId]): ReactionsState => {
    const next = { ...state, stations: { ...state.stations, [stationId]: runs } }
    return { ...next, status: statusOf(m, next) }
  }
  if (action.type === 'workAgain') {
    const runs = state.stations[stationId]
    // Past the most runs a record holds, the last run is set up again in its own place, so that there is always a way on.
    return withRuns(runs.length >= MAX_RUNS ? [...runs.slice(0, -1), newRun(runs.length - 1)] : [...runs, newRun(runs.length)])
  }

  const before = runStateOf(m, stationId, stored)
  const event = eventOf(action)
  const after = apply(m, stationModel(m, stationId), before, event) as RunState
  if (after === before) return state
  const events = [...stored.events, event]
  // In Guided a station is checked as soon as everything is recorded and right.
  if (state.mode === 'guided' && action.type !== 'checkStation' && readyToCheck(m, stationId, after)) events.push({ t: 'check' })
  return withRuns([...state.stations[stationId].slice(0, -1), { ...stored, events }])
}
