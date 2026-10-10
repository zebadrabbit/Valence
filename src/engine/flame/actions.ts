import type { FlameData } from '@/chem-data/flame/data'
import { looksOf, type Observation } from './check'
import { isClean } from './loop'
import { allStationsDone, isObservation, openQuestions, statusOf, type FlameState, type Mode, type StationState } from './state'

// Every learner action: when it can be done, and what it does. The stations can be worked in any order, and
// attempts are unlimited: an observation recorded takes the place of the one before it.

export type Action =
  | { type: 'setMode'; mode: Mode }
  /** Rinsed in distilled water and held in the flame until the flame shows no colour (spec 15.2). */
  | { type: 'cleanLoop' }
  /** In the station's well. */
  | { type: 'dipLoop'; stationId: string }
  | { type: 'holdInFlame'; stationId: string }
  /** At the flame (FLAME) or at a line or a band of the spectroscope, by its id. Stored, since a look opens a question. */
  | { type: 'look'; stationId: string; at: string }
  | { type: 'recordObservation'; stationId: string; observation: Observation }
  | { type: 'answerClosing'; choice: string }

/** Why an action cannot be done now. */
export type Blocked = 'lab-completed' | 'unknown-station' | 'not-dipped' | 'not-held' | 'nothing-there' | 'not-looked' | 'invalid-entry' | 'stations-not-done'

/** A technique step about to be skipped. Guided mode asks before going on; Challenge mode does not look. */
export type Warning = 'loop-not-clean'

/** null when the action can be done now; otherwise the first reason that applies. */
export function can(data: FlameData, state: FlameState, action: Action): Blocked | null {
  if (action.type === 'setMode') return null
  if (state.status === 'completed') return 'lab-completed'
  if (action.type === 'cleanLoop') return null
  if (action.type === 'answerClosing') {
    if (!allStationsDone(data, state.stations)) return 'stations-not-done'
    return data.closing.choices.includes(action.choice) ? null : 'invalid-entry'
  }
  const index = data.salts.findIndex((salt) => salt.id === action.stationId)
  const station = state.stations[index]
  if (index < 0 || !station) return 'unknown-station'
  switch (action.type) {
    case 'dipLoop':
      return null
    case 'holdInFlame':
      return state.loop.includes(action.stationId) ? null : 'not-dipped'
    case 'look':
      if (station.held === null) return 'not-held'
      return looksOf(data, station.held).includes(action.at) ? null : 'nothing-there'
    case 'recordObservation':
      if (station.held === null) return 'not-held'
      if (!isObservation(data, action.observation)) return 'invalid-entry'
      return Object.values(openQuestions(data, station)).every(Boolean) ? null : 'not-looked'
  }
}

/**
 * The technique step this action would skip. Empty when there is none, when the action is blocked anyway, and in
 * Challenge. In Guided, a dip with anything on the loop but this station's own salt: the page asks first, and the
 * same action sent again is the way on.
 */
export function warnings(data: FlameData, state: FlameState, action: Action): Warning[] {
  if (state.mode !== 'guided' || action.type !== 'dipLoop' || can(data, state, action) !== null) return []
  return state.loop.length === 0 || isClean(state.loop, action.stationId) ? [] : ['loop-not-clean']
}

/** The state after an action. An action that cannot be done now, or that changes nothing, returns the very same object. */
export function reduce(data: FlameData, state: FlameState, action: Action): FlameState {
  if (can(data, state, action) !== null) return state
  const settled = (next: FlameState): FlameState => ({ ...next, status: statusOf(data, next) })
  switch (action.type) {
    case 'setMode':
      return { ...state, mode: action.mode }
    case 'cleanLoop':
      return state.loop.length === 0 ? state : { ...state, loop: [] }
    case 'answerClosing':
      return settled({ ...state, closing: action.choice })
  }
  const index = data.salts.findIndex((salt) => salt.id === action.stationId)
  const station = state.stations[index]!
  const withStation = (patch: Partial<StationState>): FlameState => settled({ ...state, stations: state.stations.map((other, i) => (i === index ? { ...other, ...patch } : other)) })
  switch (action.type) {
    case 'dipLoop':
      // A loop carries what it was dipped in until it is cleaned. ponytail: a loop that is not clean does not spoil the well it is dipped in.
      return state.loop.includes(action.stationId) ? state : { ...state, loop: [...state.loop, action.stationId] }
    case 'holdInFlame':
      // A new hold is a new thing to look at. Holding the same loop again shows what is already being looked at.
      return station.held !== null && station.held.join() === state.loop.join() ? state : withStation({ held: [...state.loop], looked: [] })
    case 'look':
      return station.looked.includes(action.at) ? state : withStation({ looked: [...station.looked, action.at] })
    case 'recordObservation':
      return withStation({ observation: { ...action.observation, loop: [...station.held!] } })
  }
}
