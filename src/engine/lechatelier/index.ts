// The Le Chatelier engine as src/app/ may use it. A lint rule keeps the app out of every file below this one, so
// nothing listed here hands a page what a run hides: what a tube will show after a press that has not been made,
// whether an observation or an answer is right before it has been judged, or the notes of a disturbance that is
// not done. A page draws from a system's view, which hands over what is seen and what was entered. The model is
// listed because every function takes it; it is made from the record, which a page holds anyway for its names
// and its notes, and the views say when each of those may be shown. The working out of a run, its judging and the
// test kit are left out.
export { createLab, lechatelierStateSchema, currentRun, type LechatelierState, type Mode, type Run } from './state'
export { can, mismatch, reduce, type Action, type Blocked } from './actions'
export { FIELDS, LOOKS, type Field, type Look, type Observation, type Reason } from './run'
export { doneSystems, runOutcome, runRecords, systemView, type DisturbanceView, type RunOutcome, type RunRecord, type SystemView, type TubeShows } from './select'
export { answersFor, modelFrom, type LechatelierModel, type Temperature } from './model'
