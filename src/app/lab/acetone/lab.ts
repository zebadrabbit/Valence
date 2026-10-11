import type { KineticsLab, PartProgress, PartSpec, Words } from '@/app/lab/kinetics/engine'
import { RUN_IDS, type AcetoneData, type PartId, type RunId } from '@/chem-data/acetone/data'
import * as engine from '@/engine/acetone'
import type { AcetoneModel, AcetoneState } from '@/engine/acetone'
import * as T from './messages'

// The iodination of acetone lab as the shared pieces of the two labs on the kinetics engine take it
// (src/app/lab/kinetics/): this lab's own door to the engine, its model, its two parts, and every sentence those
// pieces say, from this lab's wording module with its record in it.

/** The two parts: the four runs, and the notebook that is worked from their times. */
export const PARTS: readonly PartSpec[] = [
  { id: 'runs', runs: RUN_IDS, timed: RUN_IDS, sheet: null },
  { id: 'rate-law', runs: [], timed: RUN_IDS, sheet: 'rate-law' },
]

/** How far each part has come, from the lab as it stands. */
export function partProgress(m: AcetoneModel, state: AcetoneState): Record<PartId, PartProgress> {
  const runs = RUN_IDS.map((run) => engine.runView(m, state, run))
  const law = engine.rateLawView(m, state)
  return { runs: T.partProgressOf(runs.every((view) => view.outcome.state === 'counts'), runs, null), 'rate-law': T.partProgressOf(law.done, [], law) }
}

const words = (data: AcetoneData, m: AcetoneModel): Words => ({
  lab: T.LAB_TEXT,
  page: T.PAGE_TEXT,
  sources: T.SOURCES_TEXT,
  partTitle: (part) => T.partTitle(data, part as PartId),
  partAim: (part) => T.PART_AIM[part as PartId],
  partDoneWhen: (part) => T.PART_DONE_WHEN[part as PartId],
  partProgress: T.PART_PROGRESS_TEXT,
  partNotes: (part) => T.partNotes(data, part as PartId),
  runsCount: T.runsCountText,
  benchLines: (roomTenths) => T.benchLines(data, roomTenths),
  runTitle: (run) => T.runTitle(data, run as RunId),
  runProgressOf: T.runProgressOf,
  runProgress: T.RUN_PROGRESS_TEXT,
  // The second way of stopping the watch is, in this lab, at the moment the last of the colour goes.
  run: { ...T.RUN_TEXT, stopAtChange: T.RUN_TEXT.stopAtEnd, stopAtChangeHelp: T.RUN_TEXT.stopAtEndHelp },
  watchStatus: (view, tenths) => T.watchStatusText(view, tenths, m),
  runOutcome: (outcome, stopped, again) => T.runOutcomeText(m, outcome, stopped, again),
  runReason: (reason) => T.runReasonText(m, reason),
  blocked: T.blockedText,
  table: T.TABLE_TEXT,
  timeRow: (row) => T.timeRowText(data, row),
  notebook: T.NOTEBOOK_TEXT,
  sheetTable: { ...T.SHEET_TABLE_TEXT, concentration: (reactantId) => T.SHEET_TABLE_TEXT.concentration(data, reactantId) },
  verdict: T.VERDICT_TEXT,
  unitLabel: T.UNIT_LABEL,
  fieldLabel: (field) => T.fieldLabel(data, field),
  formatHelp: T.formatHelp,
  relation: T.relationText,
  entryText: T.entryText,
  figures: T.figuresText,
  value: T.valueText,
  feedback: T.entryFeedback,
  orderChoices: T.orderChoices(m),
  unitChoices: T.unitChoices(m),
  sheetOutcome: (_sheet, outcome, again) => T.sheetOutcomeText(m, outcome, again),
  sheetReason: (_sheet, reason) => T.sheetReasonText(m, reason),
  rateLawExpected: (expected) => T.rateLawExpectedText(data, expected),
  record: T.RECORD_TEXT,
})

/** The lab for a record and its model. */
export const acetoneLab = (data: AcetoneData, m: AcetoneModel): KineticsLab => ({ engine, m, words: words(data, m), parts: PARTS, progress: (state) => partProgress(m, state) })
