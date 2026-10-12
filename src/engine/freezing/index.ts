// The freezing point depression engine as src/app/ may use it. A lint rule keeps the app out of every file below
// this one, so nothing listed here may give away a run's hidden values: which liquid the unknown is, how far the
// probe is off, a reading the logger has not yet taken, whether the cup has levelled, or the figure a result is
// held to. setup.ts and cup.ts are left out, and so are the judging of a run and the test kit; a page draws from a
// part's view, which hands a stored figure over only once a run that counts allows it.
export { createLab, currentRun, freezingStateSchema, type FreezingState, type Mode, type Reason, type Run } from './state'
export { can, entryBlocked, reduce, warnings, type Action, type Blocked, type Warning } from './actions'
export { FIELDS, WORKED_FROM, kindOf, parseEntry, type Entries, type Field, type Kind, type Slip, type Value, type Verdict } from './worksheet'
export { formatGrams, formatKilograms, formatSig3, formatTemperature, isSig3, parseFall, parseKilograms, parseSig3, parseTemperature, type Sig3 } from './entries'
export { doneParts, partView, runOutcome, runOutcomes, type BenchView, type CupView, type EntryView, type Expected, type GraphView, type Ice, type PartView, type RunOutcome } from './select'
export { modelFrom, type FreezingModel, type Solute } from './model'
