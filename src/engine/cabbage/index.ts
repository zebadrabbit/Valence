// The red cabbage engine as src/app/ may use it. A lint rule keeps the app out of every file below this one, so
// nothing listed here hands a page what a lab hides: a household thing's pH before the meter has been read in it,
// the right answer to a question, or whether an answer is right before it has been judged. A page draws from the
// views, which hand over what is seen and what was entered. The model is listed because every function takes it;
// it is made from the record, which a page holds anyway for its names and its notes, and the views say when each
// of those may be shown. The seeded set-up, the judging and the test kit are left out.
export { cabbageStateSchema, createLab, MAX_TRIES, POWERS, type CabbageState, type Mode, type Reason, type UnitAnswer, type UnitItem } from './state'
export { can, reduce, type Action, type Blocked } from './actions'
export { benchView, meterView, rackView, sampleView, unitView, type BenchView, type MeterView, type Outcome, type RackTube, type RackView, type SampleView, type ScaleQuestionView, type TubeShows, type UnitQuestionView, type UnitView } from './select'
export { CANNOT_SAY, CLASSES, modelFrom, type CabbageModel, type Class, type Estimate } from './model'
