// The flame test engine as src/app/ may use it. A lint rule keeps the app out of every file below this one, so
// that a page draws from a station's view, which holds what a correct observation is only where that may be shown
// (spec 15.2), and never from the check itself.
export { FLAME, QUESTIONS, choicesFor, looksOf } from './check'
export type { Kind, Observation, Question } from './check'
export { HANDLING, type Flame, type Loop, type Seen } from './loop'
export { createLab, flameStateSchema, type FlameState, type Mode, type StationState } from './state'
export { can, reduce, warnings, type Action, type Blocked, type Warning } from './actions'
export { closingView, doneStations, stationView, type StationView } from './select'
