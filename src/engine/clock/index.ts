// The clock reaction lab's engine as src/app/ may use it. A lint rule keeps the app out of every file below this
// one, and out of src/engine/kinetics/, the general engine this lab runs on: nothing listed here may give away
// what a lab holds back, which is the time of a run before its watch is stopped (but for the look of the liquid
// at a time the page hands in, which is what a learner watches), whether an entry follows before that may be
// said, and the model's orders, rate constant and activation energy before the part they belong to is done. The
// setup by seed, the judging of a run and of a sheet, and the test kit are left out; a page draws from the views,
// which hand a held value over only once its part is done.
//
// The second lab on this engine, the iodination of acetone, will have a door of its own like this one, with its
// own record behind `modelFrom`; nothing below names this reaction.
export { createLab, kineticsStateSchema as clockStateSchema, currentAttempt, currentSheet, MAX_ATTEMPTS, PART_IDS, type Attempt, type KineticsState as ClockState, type Mode, type PartId, type RunReason, type Sheet, type SheetReason } from '../kinetics/state'
export { can, entryBlocked, reduce, sheetBlocked, warnings, type Action, type Blocked, type Warning } from '../kinetics/actions'
export { fieldsOf, kindOf, reactantIdOf, SHEET_IDS, type Field, type FieldKind, type Place, type SheetId, type Slip, type Value, type Verdict } from '../kinetics/notebook'
export { doneParts, lookAt, rateLawView, roomTenths, runOutcome, runOutcomes, runView, sheetOutcome, sheetOutcomes, temperatureView, timesTable, watchAt, type EntryView, type Look, type RateLawView, type RunOutcome, type RunView, type SheetOutcome, type TemperatureView, type TimeRow } from '../kinetics/select'
export { formatFigures, formatSig3, isSig3, parseFigures, superscript, type Sig3 } from '../figures'
export { modelFrom, type ClockModel } from './model'
