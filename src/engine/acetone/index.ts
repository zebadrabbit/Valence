// The iodination of acetone lab's engine as src/app/ may use it. A lint rule keeps the app out of every file below
// this one, and out of src/engine/kinetics/, the general engine this lab runs on as the clock reaction lab does:
// nothing listed here may give away what a lab holds back, which is the time of a run before its watch is stopped
// (but for the look of the liquid at a time the page hands in, which is what a learner watches: whether the colour
// has gone, and how much iodine is left), whether an entry follows before that may be said, and the model's orders
// and rate constant before the part they belong to is done. The setup by seed, the judging of a run and of a
// sheet, and the test kit are left out; a page draws from the views, which hand a held value over only once its
// part is done.
//
// This lab has no baths and no part on temperature (spec 20.1): its parts are `PART_IDS` below, two of them, and
// its one sheet is 'rate-law'. So the engine's second sheet, its graph and the actions of a bath are not handed
// on. The stored state keeps an empty list for the sheet the lab lacks (`sheets.temperature`), which a page never
// reads.
export { createLab, kineticsStateSchema as acetoneStateSchema, currentAttempt, currentSheet, MAX_ATTEMPTS, type Attempt, type KineticsState as AcetoneState, type Mode, type RunReason, type Sheet, type SheetReason } from '../kinetics/state'
export { can, entryBlocked, reduce, sheetBlocked, warnings, type Action, type Blocked, type Warning } from '../kinetics/actions'
export { fieldsOf, kindOf, reactantIdOf, type Field, type FieldKind, type Slip, type Value, type Verdict } from '../kinetics/notebook'
export { doneParts, leftAt, lookAt, rateLawView, roomTenths, runOutcome, runOutcomes, runView, sheetOutcome, sheetOutcomes, timesTable, watchAt, type EntryView, type Left, type Look, type RateLawView, type RunOutcome, type RunView, type SheetOutcome, type TimeRow } from '../kinetics/select'
export { formatFigures, formatSig3, isSig3, parseFigures, superscript, type Sig3 } from '../figures'
export { modelFrom, type AcetoneModel } from './model'

/** The parts of this lab, in their order: the four runs, and the rate law. */
export const PART_IDS = ['runs', 'rate-law'] as const
export type PartId = (typeof PART_IDS)[number]
/** The one sheet of this lab's notebook. */
export const SHEET_IDS = ['rate-law'] as const
export type SheetId = (typeof SHEET_IDS)[number]
