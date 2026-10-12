// The polarity and mixing engine as src/app/ may use it. A lint rule keeps the app out of every file below this
// one, so nothing listed here hands a page what the lab hides: whether two liquids mix, which is on top or whether
// a solid dissolves, other than as the picture of a tube that has stood; a liquid's family; the right answer to a
// question; or whether an answer is right before it has been judged. A page draws from the views, which hand over
// what is seen and what was entered. The model is listed because every function takes it; it is made from the
// record, which a page holds anyway for its names and its notes, and the views say when each of those may be
// shown. `pairOf` and `solidTubeOf` say only whether the bench offers a tube. The judging and the test kit are
// left out.
export { createLab, LAYERS, MAX_TRIES, mixingStateSchema, SOLID_SEEN, type Layers, type MixingState, type Mode, type Reason, type SolidSeen } from './state'
export { can, reduce, type Action, type Blocked } from './actions'
export { benchView, pairView, ruleView, solidTubeView, tubeView, type BenchView, type Outcome, type PairView, type RuleView, type SolidTubeView, type TubeShows, type TubeView } from './select'
export { modelFrom, pairOf, solidTubeOf, STAGES, type MixingModel, type Stage } from './model'
