// The endothermic and exothermic engine as src/app/ may use it. A lint rule keeps the app out of every file below
// this one, so nothing listed here may give away a run's hidden values: a reading the logger has not yet taken,
// which way a salt's temperature goes, the figure its cup runs on, or which salt answers a question of part 3.
// setup.ts is left out, and so are the judging of a run and of an answer and the test kit; a page draws from a
// part's view, which hands a stored figure over only once a run of the salt counts.
export { QUESTIONS, createLab, currentRun, hotcoldStateSchema, type HotcoldState, type Mode, type Question, type Reason, type Run } from './state'
export { can, entryBlocked, reduce, warnings, type Action, type Blocked, type Warning } from './actions'
export { CHOICES, FIELDS, isChoice, type Choice, type Entries, type Field, type Heat, type Slip, type Value, type Verdict, type Went, type Word } from './worksheet'
export { formatTenths, parseChange, parseTemperature } from './entries'
export { doneParts, packsMissed, packsView, runOutcome, runOutcomes, runView, type BenchView, type CupView, type EntryView, type Expected, type GraphView, type PacksView, type RunOutcome, type RunView } from './select'
export { modelFrom, type HotcoldModel } from './model'
