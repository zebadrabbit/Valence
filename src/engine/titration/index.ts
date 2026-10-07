// The titration engine as src/app/ may use it. A lint rule keeps the app out of every file below this one, so
// nothing listed here may give away a run's hidden values: flask.ts and setup.ts are left out but for the type of
// the plume's status, and so are flaskOf and the test kit.
export { createLab, currentTrial, titrationStateSchema, type Mode, type TitrationState, type Trial } from './state'
export { can, countingTrials, endpointConfirmed, reduce, warnings, type Action, type Blocked, type Warning } from './actions'
export * from './entries'
export * from './select'
export { modelFrom, type TitrationModel } from './model'
export type { PlumeStatus } from './flask'
