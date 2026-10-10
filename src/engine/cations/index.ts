// The cations engine as src/app/ may use it. A lint rule keeps the app out of every file below this one, so
// nothing listed here may give away what a run hides: which ions an unknown holds, what a tube is made of or how
// much of anything is in it, whether an observation is right before its step is checked, or why a run does not
// count before it is over. setup.ts and tube.ts are left out, and so are the working out of a run, its judging and
// the test kit; a page draws from a part's view, which hands over what is seen and no more.
export { createLab, cationsStateSchema, currentRun, type CationsState, type Mode, type Run } from './state'
export { can, mismatch, reduce, warnings, type Action, type Blocked, type Warning } from './actions'
export { FIELDS, LOOKS, type Field, type Look, type Observation, type Reason, type Slip } from './run'
export type { Litmus } from './tube'
export { chartMap, doneParts, partView, runOutcome, runRecords, type ChartMap, type ChartView, type PartView, type PlaceView, type RunOutcome, type RunRecord, type StepView, type TubeShows } from './select'
export { modelFrom, type CationsModel } from './model'
