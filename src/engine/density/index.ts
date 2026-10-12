// The density engine as src/app/ may use it. A lint rule keeps the app out of every file below this one, so
// nothing listed here may give away a run's hidden values: which liquid or which metal an unknown is, or the
// figure a density is held to. setup.ts is left out, and so are the judging of a run and the test kit; a page
// draws from a part's view, which hands the stored figure over only once a run counts.
export { createLab, currentRun, densityStateSchema, type Bench, type DensityState, type Mode, type Reason, type Run, type Step } from './state'
export { can, entryBlocked, reduce, warnings, type Action, type Blocked, type Warning } from './actions'
export { FIELDS, READ_FROM, WORKED_FROM, isLevel, kindOf, type Entries, type Field, type Kind, type Level, type Slip, type Value, type Verdict } from './worksheet'
export { EYES, formatReading, parseReading, type Eye, type Instrument, type Parsed, type Position, type ReadingProblem, type ScaleView } from './readings'
export { doneParts, partView, runOutcome, runOutcomes, type BalanceView, type BenchView, type CylinderView, type EntryView, type Expected, type NoteView, type PartView, type RunOutcome } from './select'
export { modelFrom, SCALE_IDS, type DensityModel, type Scale, type ScaleId } from './model'
export { decimalsIn, figuresIn, formatDecimal as formatEntry, isFigures, parseDecimal as parseEntry, type Figures } from '../figures'
