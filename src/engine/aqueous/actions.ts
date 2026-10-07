import type { AqueousData } from '@/chem-data/aqueous/data'
import { usesOf, type Entry, type Form, type Observation, type ToolUse } from './check'
import { isEntry, observationProblem, statusOf, type AqueousState, type Mode, type StationState } from './state'

// Every learner action: when it can be done, and what it does. The stations can be worked in any order, and an
// equation can be entered at any time, before the tube is mixed too. Attempts are unlimited (spec 8.3): a
// recorded observation or an entered equation takes the place of the one before it.

export type Action =
  | { type: 'setMode'; mode: Mode }
  | { type: 'mix'; stationId: string }
  // 'sniff' is smelling the tube directly. It is never done: asking for it is answered with the safety note (spec 8.2).
  | { type: 'useTool'; stationId: string; tool: ToolUse | 'sniff' }
  | { type: 'recordObservation'; stationId: string; observation: Observation }
  | { type: 'enterEquation'; stationId: string; form: Form; entry: Entry }

/** Why an action cannot be done now. */
export type Blocked = 'lab-completed' | 'unknown-station' | 'already-mixed' | 'not-mixed' | 'no-such-tool' | 'sniffing' | 'tool-not-used' | 'invalid-entry'

/** null when the action can be done now; otherwise the first reason that applies. */
export function can(data: AqueousData, state: AqueousState, action: Action): Blocked | null {
  if (action.type === 'setMode') return null
  const index = data.stations.findIndex((s) => s.id === action.stationId)
  const station = state.stations[index]
  if (index < 0 || !station) return 'unknown-station'
  if (state.status === 'completed') return 'lab-completed'
  switch (action.type) {
    case 'mix':
      return station.mixed ? 'already-mixed' : null
    case 'useTool':
      if (!station.mixed) return 'not-mixed'
      if (action.tool === 'sniff') return data.stations[index]!.observationTools.includes('waft') ? 'sniffing' : 'no-such-tool'
      return usesOf(data.stations[index]!).includes(action.tool) ? null : 'no-such-tool'
    case 'recordObservation':
      return station.mixed ? observationProblem(data, action.stationId, station.used, action.observation) : 'not-mixed'
    case 'enterEquation':
      return isEntry(data, action.stationId, action.entry) ? null : 'invalid-entry'
  }
}

/** The state after an action. An action that cannot be done now returns the very same object. */
export function reduce(data: AqueousData, state: AqueousState, action: Action): AqueousState {
  if (can(data, state, action) !== null) return state
  if (action.type === 'setMode') return { ...state, mode: action.mode }
  const index = data.stations.findIndex((s) => s.id === action.stationId)
  const station = state.stations[index]!
  const withStation = (patch: Partial<StationState>): AqueousState => {
    const stations = state.stations.map((other, i) => (i === index ? { ...other, ...patch } : other))
    return { ...state, stations, status: statusOf(data, stations) }
  }
  switch (action.type) {
    case 'mix':
      return withStation({ mixed: true })
    case 'useTool':
      // can() has refused 'sniff', so what is left is one of the station's tools.
      return station.used.includes(action.tool as ToolUse) ? state : withStation({ used: [...station.used, action.tool as ToolUse] })
    case 'recordObservation':
      return withStation({ observation: action.observation })
    case 'enterEquation':
      return withStation({ equations: { ...station.equations, [action.form]: action.entry } })
  }
}
