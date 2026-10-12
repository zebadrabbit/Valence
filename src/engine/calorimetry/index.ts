// The calorimetry engine as src/app/ may use it. A lint rule keeps the app out of every file below this one, so
// nothing listed here may give away a run's hidden values: which metal the piece is, a reading the logger has not
// yet taken, or the value a result is held to. setup.ts and cup.ts are left out, and so are the judging of a run
// and the test kit; a page draws from a part's view, which hands the stored value over only once a run counts.
export { createLab, calorimetryStateSchema, currentRun, type CalorimetryState, type Mode, type Reason, type Run } from './state'
export { can, entryBlocked, reduce, warnings, type Action, type Blocked, type Warning } from './actions'
export { FIELDS, type Direction, type Entries, type Field, type Slip, type Value, type Verdict } from './worksheet'
export { formatSig3, isSig3, parseChange, parseSig3, parseTemperature, type Sig3 } from './entries'
export { doneParts, partView, runOutcome, runOutcomes, type BenchView, type CupView, type EntryView, type Expected, type GraphView, type PartView, type RunOutcome } from './select'
export { modelFrom, type CalorimetryModel } from './model'
