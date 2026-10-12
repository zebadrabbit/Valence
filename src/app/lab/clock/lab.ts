import type { KineticsLab, PartProgress, PartSpec, Words } from '@/app/lab/kinetics/engine'
import { BATH_IDS, bathRunId, MIXTURE_IDS, PART_IDS, type ClockData, type PartId, type RunId } from '@/chem-data/clock/data'
import * as engine from '@/engine/clock'
import type { ClockModel, ClockState } from '@/engine/clock'
import * as T from './messages'

// The clock reaction lab as the shared pieces of the two labs on the kinetics engine take it
// (src/app/lab/kinetics/): this lab's own door to the engine, its model, its parts, and every sentence those
// pieces say, from this lab's wording module with its record in it.

/** The runs each part makes: the five mixtures, none, and the three baths. The table of times of a part shows the runs its notebook is worked from. */
export const RUNS_OF: Record<PartId, readonly RunId[]> = { runs: MIXTURE_IDS, 'rate-law': [], temperature: BATH_IDS.map(bathRunId) }

/** How far each part has come, from the lab as it stands. */
export function partProgress(m: ClockModel, state: ClockState): Record<PartId, PartProgress> {
  const runs = (part: PartId) => RUNS_OF[part].map((run) => engine.runView(m, state, run))
  const [law, temperature] = [engine.rateLawView(m, state), engine.temperatureView(m, state)]
  return {
    runs: T.partProgressOf(runs('runs').every((view) => view.outcome.state === 'counts'), runs('runs'), null),
    'rate-law': T.partProgressOf(law.done, [], law),
    temperature: T.partProgressOf(temperature.done, runs('temperature'), temperature),
  }
}

const words = (data: ClockData, m: ClockModel): Words => ({
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
  run: { ...T.RUN_TEXT },
  watchStatus: (view, tenths) => T.watchStatusText(view, tenths, m),
  runOutcome: (outcome, stopped, again) => T.runOutcomeText(m, outcome, stopped, again),
  runReason: (reason) => T.runReasonText(m, reason),
  blocked: (blocked, field) => T.blockedText(data, blocked, field),
  table: T.TABLE_TEXT,
  timeRow: (row) => T.timeRowText(data, row),
  notebook: T.NOTEBOOK_TEXT,
  sheetTable: { ...T.SHEET_TABLE_TEXT, concentration: (reactantId) => T.SHEET_TABLE_TEXT.concentration(data, reactantId) },
  verdict: T.VERDICT_TEXT,
  unitLabel: T.UNIT_LABEL,
  fieldLabel: (field) => T.fieldLabel(data, field),
  formatHelp: T.formatHelp,
  relation: (field) => T.relationText(data, field),
  entryText: T.entryText,
  figures: T.figuresText,
  value: T.valueText,
  feedback: T.entryFeedback,
  orderChoices: T.orderChoices(m),
  unitChoices: T.unitChoices(m),
  sheetOutcome: (sheet, outcome, again) => T.sheetOutcomeText(m, sheet, outcome, again),
  sheetReason: (sheet, reason) => T.sheetReasonText(m, sheet, reason),
  rateLawExpected: (expected) => T.rateLawExpectedText(data, expected),
  record: T.RECORD_TEXT,
})

/** Each part's notebook: part 1 has none. */
export const SHEET_OF = { runs: null, 'rate-law': 'rate-law', temperature: 'temperature' } as const

/** The three parts: the runs each makes, the runs its notebook is worked from, and its notebook's sheet. */
const parts = (data: ClockData): PartSpec[] => {
  const timed: Record<PartId, readonly RunId[]> = { runs: MIXTURE_IDS, 'rate-law': MIXTURE_IDS, temperature: [data.referenceMixtureId, ...RUNS_OF.temperature] }
  return PART_IDS.map((id) => ({ id, runs: RUNS_OF[id], timed: timed[id], sheet: SHEET_OF[id] }))
}

/** The lab for a record and its model. */
export const clockLab = (data: ClockData, m: ClockModel): KineticsLab => ({ engine, m, words: words(data, m), parts: parts(data), progress: (state) => partProgress(m, state) })
