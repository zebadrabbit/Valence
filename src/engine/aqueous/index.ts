// The aqueous reactions engine as src/app/ may use it. A lint rule keeps the app out of every file below this one.
// Only the ten stations can be asked about: `react`, which works on any tube, and `tally` are left out (spec 8.1).
export { stationResult, type Amount, type Rule, type StationResult, type Temperature } from './react'
export { FIELDS, FORMS, TOOL_USES, checkEquation, choicesFor, expectedObservation, fieldsOf, usesOf, usesShowing, wrongFields } from './check'
export type { Entry, Field, Form, Observation, Problem, State, Term, Tool, ToolUse } from './check'
export { aqueousStateSchema, createLab, type AqueousState, type Mode, type StationState } from './state'
export { can, reduce, type Action, type Blocked } from './actions'
export { doneStations, stationView, type StationView } from './select'
export { describeStationResult } from './describe'
