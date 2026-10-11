import type * as Door from '@/engine/clock'
import type { Blocked, ClockModel, ClockState, Field, Place, RateLawView, RunOutcome, RunReason, RunView, SheetId, SheetOutcome, SheetReason, Sig3, TimeRow, Value, Verdict } from '@/engine/clock'

// What the pieces in this folder are handed by the two labs that run on the kinetics engine: the clock reaction
// lab and the iodination of acetone lab. Each lab has a door of its own to that engine ('@/engine/clock',
// '@/engine/acetone'), and the two hand on the same functions and the same types under their own names. A piece
// here imports no function of either: the lab hands its own door in, with its model, its wording and its parts,
// as one `KineticsLab`. The types alone are taken from the clock reaction lab's door, which was the first, so
// that they are written once. Nothing in this folder names a reaction, a bottle or a colour.

export type Model = ClockModel
export type State = ClockState
export type { Action, Blocked, EntryView, Field, Mode, Place, RunOutcome, RunView, SheetId, SheetOutcome, Sig3, TimeRow, Value, Verdict } from '@/engine/clock'

/** The functions of a lab's door that the shared pieces call. */
export type Engine = Pick<typeof Door, 'can' | 'createLab' | 'fieldsOf' | 'kindOf' | 'lookAt' | 'parseFigures' | 'rateLawView' | 'reduce' | 'roomTenths' | 'runOutcomes' | 'runView' | 'sheetOutcomes' | 'timesTable' | 'watchAt'>

/** How far a part has come, and how far a run has: the two labs' own words for each are in their `Words`. */
export type PartProgress = 'not-started' | 'runs' | 'notebook' | 'not-counted' | 'done'
export type RunProgress = 'not-started' | 'under-way' | 'running' | 'not-counted' | 'counts'

/** A part of a lab: the runs it makes, the runs its table of times shows, and its notebook's sheet where it has one. A part with runs and a sheet has the notebook after its runs. */
export interface PartSpec {
  id: string
  runs: readonly string[]
  timed: readonly string[]
  sheet: SheetId | null
}

/**
 * Every sentence a shared piece says, from the lab's own wording module, with the lab's record already in it.
 * Each lab builds one (`src/app/lab/clock/lab.ts`, `src/app/lab/acetone/lab.ts`).
 */
export interface Words {
  lab: { aim: string; complete: string }
  page: { parts: string; runs: string; previous(title: string): string; next(title: string): string; bench: string; hazards: string }
  /** Under a part's sources: what is the app's own. */
  sources: string
  partTitle(part: string): string
  partAim(part: string): string
  partDoneWhen(part: string): string
  partProgress: Record<PartProgress, string>
  partNotes(part: string): string[]
  runsCount(counting: number, of: number): string
  benchLines(roomTenths: number): string[]

  runTitle(run: string): string
  runProgressOf(view: RunView): RunProgress
  runProgress: Partial<Record<RunProgress, string>>
  run: { watch: string; stop: string; stopHelp: string; stopAtChange: string; stopAtChangeHelp: string; runAgain: string; runAgainHelp: string }
  watchStatus(view: Pick<RunView, 'poured' | 'stopped'>, tenthsNow: number): string
  runOutcome(outcome: RunOutcome, stopped: RunView['stopped'], again: boolean): string
  runReason(reason: RunReason): string
  blocked(blocked: Blocked, field?: Field): string

  table: { caption: string; run: string; temperature: string; time: string; timed: string; byHand: string; byEnd: string; empty: string; use: string }
  timeRow(row: TimeRow): string

  notebook: { notebook: string; check: string; sheetAgain: string; sheetAgainHelp: string; hint: string; enter: string; change: string; cancel: string; changeNote: string; notes: string; outcome: string; filledRows: string; filledConstants: string; mean: string; yourRow: string }
  sheetTable: { rateLawCaption: string; run: string; time: string; concentration(reactantId: string): string; rate: string; constant: string }
  verdict: { follows: string; not: string }
  unitLabel: Record<number, string>
  fieldLabel(field: Field): string
  formatHelp(field: Field): string
  relation(field: Field): string
  entryText(value: Sig3): string
  figures(value: Sig3): string
  value(field: Field, value: Value, places?: readonly Place[]): string
  feedback(field: Field, verdict: Verdict): string
  orderChoices: readonly { value: number; label: string }[]
  unitChoices: readonly { value: number; label: string }[]
  sheetOutcome(sheet: SheetId, outcome: SheetOutcome, again: boolean): string
  sheetReason(sheet: SheetId, reason: SheetReason): string
  rateLawExpected(expected: NonNullable<RateLawView['expected']>): string

  record: {
    region: string
    caption: string
    part: string
    attempt(number: number): string
    working(number: number): string
    result: string
    open: string
    notChecked: string
    counts: string
    doesNotCount: string
    timedByHand(tenths: number): string
    timedByHandAfter(tenths: number, delayMs: number): string
    timedByEnd(tenths: number): string
    timedOut(tenths: number): string
  }
}

/** A lab on the kinetics engine, as the shared pieces take it: its own door, its model, its wording and its parts. */
export interface KineticsLab {
  engine: Engine
  m: Model
  words: Words
  parts: readonly PartSpec[]
  /** How far each part has come, from the lab as it stands. */
  progress(state: State): Record<string, PartProgress>
}
