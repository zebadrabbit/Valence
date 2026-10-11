import { mixtureOfRun, PART_IDS, partsOfMixture, reagentOf, type AcetoneData, type PartId, type RunId } from '@/chem-data/acetone/data'
import { formatFigures, kindOf, parseFigures, reactantIdOf, type AcetoneModel, type Blocked, type Field, type FieldKind, type Left, type Mode, type RateLawView, type RunOutcome, type RunReason, type RunView, type SheetOutcome, type SheetReason, type Sig3, type Slip, type TimeRow, type Value, type Verdict } from '@/engine/acetone'
import { CONCENTRATION_UNIT, listed, lower, minus, RATE_UNIT, secondsText, temperatureText, UNIT_LABEL, volumeText, watchText } from '../kinetics/text'

// Every sentence the iodination of acetone lab says that is chemistry, keyed by the engine's identifiers, so that
// an identifier with no sentence does not compile. A sentence can say only what it is handed: the lab's record and
// what the engine's views hold, which is never the time of a run before its watch is stopped, whether an entry
// follows before that may be said, or the model's orders or its rate constant, until the part they belong to is
// done. The notes shown when a part is done are in the record itself, with their sources
// (src/chem-data/acetone/acetone.json); this module words everything else.
//
// What a learner sees is described as it is seen: a liquid by its look, a flask by what is in it and what has been
// done to it. The look of the liquid is said in words at any moment, from how much iodine the engine says is left,
// so that colour is not the only signal (spec 20.2). Feedback on an entry says that it does not follow, and what
// kind of slip it looks like where the engine knows one, and never the value it should have been. No label, hint
// or refusal gives an order of this reaction: Challenge reads them before the entries are made.
//
// The lab has no baths, no part on temperature and nothing to add to a flask, so the engine's identifiers for
// those can never reach a page of it. Each still has a sentence here, a plain one, so that the maps stay whole.

// ---------------------------------------------------------------------------
// Figures as they are written

// A temperature, a time, a volume and the units are written as the clock reaction lab writes them (../kinetics/text.ts).
export { CONCENTRATION_UNIT, RATE_UNIT, secondsText, temperatureText, UNIT_LABEL, volumeText, watchText }

/** A typed number of three figures as it is read: "0.800", "2.57 × 10⁻⁶". */
export const figuresText = (value: Sig3) => minus(formatFigures(value))

// ---------------------------------------------------------------------------
// The lab, its parts and its bench

export const LAB_TEXT = {
  name: 'The iodination of acetone',
  aim: 'Time the yellow of iodine as it fades. From the times, find how the rate depends on each thing in the flask.',
  /** Over the list of parts: what completes the lab. */
  completeWhen: 'The lab is complete once both parts are done.',
  complete: 'The lab is complete: both parts are done.',
} as const

const partOf = (data: AcetoneData, part: PartId) => data.parts[PART_IDS.indexOf(part)]!

/** "Part 1: Four mixtures at room temperature". */
export const partTitle = (data: AcetoneData, part: PartId) => `Part ${PART_IDS.indexOf(part) + 1}: ${partOf(data, part).name}`

/** What each part finds, under its title, in both modes. Neither gives an order or the rate constant. */
export const PART_AIM: Record<PartId, string> = {
  runs: 'How long each of four mixtures takes to lose its colour.',
  'rate-law': 'The order in acetone, in hydrogen ion and in iodine, and the rate constant.',
}

/** What makes each part done, under what it finds. */
export const PART_DONE_WHEN: Record<PartId, string> = {
  runs: 'This part is done once all four runs count.',
  'rate-law': 'This part is done once its notebook has been checked and counts.',
}

const bottleName = (data: AcetoneData, reagentId: string) => (reagentId === 'water' ? data.water.name : reagentOf(data, reagentId).name)
/** "Acetone solution, 4.0 M" as it is said inside a sentence, without its strength: "acetone solution". */
const liquidName = (data: AcetoneData, reagentId: string) => lower(bottleName(data, reagentId).split(',')[0]!)
const reactantOf = (data: AcetoneData, reactantId: string) => data.rateLaw.reactants.find((r) => r.id === reactantId)!
const mixtureNumber = (data: AcetoneData, mixtureId: string) => data.mixtures.findIndex((m) => m.id === mixtureId) + 1
const wholeVolume = (data: AcetoneData, runId: RunId) => partsOfMixture(mixtureOfRun(data, runId)).reduce((sum, part) => sum + part.millilitres, 0)

/** The bench in words (spec 20.1): the bottles as their labels read, the water, the two flasks on their paper, the watch and the thermometer with what it reads in the room. */
export function benchLines(data: AcetoneData, roomTenths: number): string[] {
  return [
    ...data.reagents.map((r) => `${r.name}.`),
    `${data.water.name}.`,
    'A flask for the mixture, and a second flask of water to compare it with, both on white paper.',
    'A stopwatch.',
    `A thermometer. In the room it reads ${temperatureText(roomTenths)}.`,
  ]
}

// ---------------------------------------------------------------------------
// A run: its mixture, its flask, its liquid and its watch

/** "Mixture 3". Every run is a mixture at the room's temperature. */
export const runTitle = (data: AcetoneData, runId: RunId) => mixtureOfRun(data, runId).name

/** The cards of a run and of the notebook, the buttons, and what is said beside them. */
export const RUN_TEXT = {
  mixture: 'The mixture',
  flask: 'The flask',
  watch: 'The watch and the liquid',
  inFlask: 'In the flask',
  pouredIn: 'Poured in to start',
  where: 'Where',
  liquid: 'Liquid',
  volume: 'Volume',
  pour: 'Pour in the iodine and start the watch',
  poured: 'Iodine poured in',
  stop: 'Stop the watch',
  stopAtEnd: 'Stop the watch for me when the colour has gone',
  /** Beside the two ways of stopping the watch. */
  stopHelp: 'Stop the watch when the liquid can no longer be told from the water beside it. Your own delay is added to the time, as a hand adds it on a real watch.',
  stopAtEndHelp: 'The watch then stops at the moment the last of the colour goes. A run timed this way counts like any other, and the record says how it was timed.',
  /** Beside the running watch: the four mixtures are all played at one speed, so a longer time is a longer wait. */
  fast: 'The page plays the time faster than a clock would, at one speed for all four mixtures.',
  /** In the flask's card, once a run was left while its watch was running: the page records no time for it, and the iodine is poured in again. */
  left: 'This run was left while its watch was running, so no time was recorded. The flask is as it was before the pour: pour the iodine in again to time it.',
  runAgain: 'Make this run again',
  runAgainHelp: 'Sets the flask up afresh. The run so far is kept in the record.',
  outcome: 'This run',
} as const

/** The rows of a mixture's table: each liquid with where it is and its volume. */
export function mixtureRows(data: AcetoneData, runId: RunId): { where: string; liquid: string; volume: string }[] {
  const mixture = mixtureOfRun(data, runId)
  return [
    ...mixture.flask.map((part) => ({ where: RUN_TEXT.inFlask, liquid: bottleName(data, part.reagentId), volume: volumeText(part.millilitres) })),
    { where: RUN_TEXT.pouredIn, liquid: bottleName(data, mixture.added.reagentId), volume: volumeText(mixture.added.millilitres) },
  ]
}

/** Under a mixture's table: what it comes to. */
export const mixtureTotal = (data: AcetoneData, runId: RunId) => `${volumeText(wholeVolume(data, runId))} in all, once the iodine is poured in.`

/** A mixture in words: what the flask holds and what is poured in, each liquid with its volume after it. */
export function mixtureText(data: AcetoneData, runId: RunId): string {
  const mixture = mixtureOfRun(data, runId)
  const holds = mixture.flask.map((part) => `${liquidName(data, part.reagentId)}, ${volumeText(part.millilitres)}`).join('; ')
  return `In the flask: ${holds}. Poured in to start the run: ${liquidName(data, mixture.added.reagentId)}, ${volumeText(mixture.added.millilitres)}. That is ${volumeText(wholeVolume(data, runId))} in all.`
}

/**
 * The flask and the flask of water beside it, in words (spec 20.5 with 19.7's last item): what stands on the
 * paper, what is in each and what has been done, in the order it is done. It says nothing of what the liquid will
 * do, and nothing of its colour: `liquidText` says that.
 */
export function flaskText(data: AcetoneData, runId: RunId, view: Pick<RunView, 'poured'>): string {
  const mixture = mixtureOfRun(data, runId)
  const before = mixture.flask.reduce((sum, part) => sum + part.millilitres, 0)
  const water = `Beside it stands a second flask, with ${volumeText(wholeVolume(data, runId))} of ${lower(data.water.name)}, to compare the colour with.`
  if (!view.poured) {
    return [`The flask stands on white paper. It holds the acetone, the acid and the water of this mixture, ${volumeText(before)}.`, `The ${liquidName(data, mixture.added.reagentId)}, ${volumeText(mixture.added.millilitres)}, has been measured out and has not been poured in.`, water].join(' ')
  }
  return [`The flask stands on white paper. The ${liquidName(data, mixture.added.reagentId)} has been poured into it, which makes ${volumeText(wholeVolume(data, runId))}.`, water].join(' ')
}

/** How the liquid looks, by how much iodine is left: the four words the lab has for it. */
export type LiquidLook = 'yellow' | 'pale-yellow' | 'faintest-yellow' | 'none'

/**
 * The look of the mixture for an amount of iodine left, as the engine gives it (`leftAt`). The steps between the
 * words are the record's, and the lab's own; the drawing may take its depth of colour from the same figure. With
 * none left there is no colour, and with any at all there is some: the end is the engine's, not an eye's.
 */
export function liquidLook(data: AcetoneData, left: Pick<Left, 'microMolar'>): LiquidLook {
  if (left.microMolar <= 0) return 'none'
  if (left.microMolar < data.parameters.faintestBelowMicroMolar.value) return 'faintest-yellow'
  return left.microMolar < data.parameters.paleBelowMicroMolar.value ? 'pale-yellow' : 'yellow'
}

/** The four looks as words, for a key under the drawing. */
export const LOOK_TEXT: Record<LiquidLook, string> = {
  yellow: 'yellow',
  'pale-yellow': 'pale yellow',
  'faintest-yellow': 'the faintest yellow',
  none: 'no colour',
}

/**
 * What the liquid looks like at any moment, as it is seen (spec 20.2): in the flask before the pour, and the
 * mixture after it, by how much iodine is left. The water beside it is said with it once the colour has gone.
 */
export function liquidText(data: AcetoneData, left: Pick<Left, 'microMolar'>, poured: boolean): string {
  if (!poured) return `The liquid in the flask is ${data.rateLaw.end.after.value}, like the water in the flask beside it.`
  const look = liquidLook(data, left)
  return look === 'none' ? 'The mixture has no colour: it cannot be told from the water in the flask beside it.' : `The mixture is ${LOOK_TEXT[look]}. The water in the flask beside it has no colour.`
}

/** Said to a status line each time the liquid's look passes to a paler word while the watch runs; empty for a look that is not a step down. */
export function fadeText(look: LiquidLook): string {
  if (look === 'pale-yellow') return 'The mixture has faded to pale yellow.'
  if (look === 'faintest-yellow') return 'The mixture has faded to the faintest yellow.'
  return look === 'none' ? CHANGE_TEXT : ''
}

/** Said once, to a status line, at the moment the last of the colour goes while the watch runs: the change that ends a run. */
export const CHANGE_TEXT = 'The last of the yellow has gone: the mixture cannot be told from the water.'

/** The watch in words: not started, running with what it reads, or stopped with what it reads and how. */
export function watchStatusText(view: Pick<RunView, 'poured' | 'stopped'>, tenthsNow: number, m: AcetoneModel): string {
  if (!view.poured) return 'The watch has not been started.'
  if (view.stopped === null) return `The watch is running: ${watchText(tenthsNow)}.`
  const reading = `${watchText(view.stopped.tenths)}, which is ${secondsText(view.stopped.tenths)}`
  if (view.stopped.tenths * 100 >= m.watchLimitMs) return `The watch stopped itself at ${reading}.`
  return view.stopped.by === 'hand' ? `The watch was stopped by hand at ${reading}.` : `The watch was stopped when the colour had gone, at ${reading}.`
}

const RUN_REASON_TEXT: Record<RunReason, (m: AcetoneModel) => string> = {
  'stopped-early': () => 'The watch was stopped while the mixture still had colour.',
  'stopped-late': (m) => `The watch was stopped more than ${m.delayLimitMs / 1000} seconds after the last of the colour had gone.`,
  'ran-out': () => 'The watch ran to its limit before the colour had gone.',
  // Not this lab's: nothing is added to show the end of a run, and no run stands in a bath.
  'no-indicator': () => 'Nothing showed the end of this run.',
  'not-at-temperature': () => 'The flask was not at one temperature.',
}

/** One reason a run does not count, as a sentence. */
export const runReasonText = (m: AcetoneModel, reason: RunReason) => RUN_REASON_TEXT[reason](m)

/**
 * The sentence for a run once its watch is stopped: that it counts, with the time that goes into the table, or
 * that it does not and why (spec 20.2). Empty for a run still under way. `again` is whether the run can be made
 * again: it cannot once the lab is complete, and the sentence then does not say to.
 */
export function runOutcomeText(m: AcetoneModel, outcome: RunOutcome, stopped: RunView['stopped'], again = true): string {
  if (outcome.state === 'open' || stopped === null) return ''
  if (outcome.state === 'counts') return `This run counts: ${secondsText(stopped.tenths)} goes into the table of times.`
  return `This run does not count. ${outcome.reasons.map((reason) => runReasonText(m, reason)).join(' ')}${again ? ' Make this run again.' : ''}`
}

/** How far a run has come, in a list of runs, beside a mark that says the same. */
export type RunProgress = 'not-started' | 'running' | 'not-counted' | 'counts'
export function runProgressOf(view: Pick<RunView, 'poured' | 'outcome'>): RunProgress {
  if (view.outcome.state === 'counts') return 'counts'
  if (view.outcome.state === 'does-not-count') return 'not-counted'
  return view.poured ? 'running' : 'not-started'
}
export const RUN_PROGRESS_TEXT: Record<RunProgress, string> = {
  'not-started': 'Not started',
  running: 'Watch running',
  'not-counted': 'Did not count',
  counts: 'Counts',
}

// ---------------------------------------------------------------------------
// The table of times

export const TABLE_TEXT = {
  caption: 'Times of the runs that count',
  run: 'Run',
  temperature: 'Temperature',
  time: 'Time',
  timed: 'Watch stopped',
  byHand: 'by hand',
  byEnd: 'when the colour had gone',
  empty: 'Not timed yet',
  /** Under the table, in part 2: where its figures go. */
  use: 'The notebook is worked from these times.',
} as const

/** One row of the table of times as a sentence: "Mixture 1: 22.5 °C, 285.3 s, watch stopped by hand." */
export function timeRowText(data: AcetoneData, row: TimeRow): string {
  const title = runTitle(data, row.runId as RunId)
  if (row.tenths === null || row.temperatureTenths === null) return `${title}: not timed yet.`
  return `${title}: ${temperatureText(row.temperatureTenths)}, ${secondsText(row.tenths)}, watch stopped ${row.by === 'hand' ? TABLE_TEXT.byHand : TABLE_TEXT.byEnd}.`
}

// ---------------------------------------------------------------------------
// The notebook

/** The cards and buttons of the notebook. */
export const NOTEBOOK_TEXT = {
  notebook: 'The notebook',
  check: 'Check the notebook',
  sheetAgain: 'Work this notebook again',
  sheetAgainHelp: 'Starts the notebook again from empty. The times in the table stay as they are, and this working is kept in the record.',
  hint: 'The relation this entry uses',
  enter: 'Enter',
  change: 'Change',
  cancel: 'Cancel',
  /** Under the notebook while an entry that has others under it can be changed. */
  changeNote: 'Changing an entry empties the entries under it.',
  notes: 'Notes on this part',
  outcome: 'This notebook',
  /** Over the rows the notebook has filled in. */
  filledRows: 'You have worked the row of mixture 1. The notebook has worked the other three the same way, from unrounded figures, and written each to three significant figures.',
  filledConstants: 'The notebook has worked out the rate constant of the other three runs with the orders you gave, and the mean of all four.',
  mean: 'Mean of the four',
  yourRow: 'your own entries',
} as const

/** The heads of the table the notebook fills. */
export const SHEET_TABLE_TEXT = {
  rateLawCaption: 'Concentrations, rates and rate constants of the four runs',
  run: 'Run',
  time: 'Time, in s',
  concentration: (data: AcetoneData, reactantId: string) => `[${reactantOf(data, reactantId).formula}], in ${CONCENTRATION_UNIT}`,
  rate: `Rate, in ${RATE_UNIT}`,
  constant: 'Rate constant, k',
} as const

/** The kinds of entry this lab's notebook has; the engine's other four belong to a part on temperature. */
type OwnKind = Extract<FieldKind, 'concentration' | 'rate' | 'order' | 'rateConstant' | 'unit'>
const OWN_KINDS: readonly FieldKind[] = ['concentration', 'rate', 'order', 'rateConstant', 'unit']
const ownKind = (field: Field): OwnKind | null => (OWN_KINDS.includes(kindOf(field)) ? (kindOf(field) as OwnKind) : null)

/** The notebook's entries, each with its label. Empty for an entry that is not this lab's. */
export function fieldLabel(data: AcetoneData, field: Field): string {
  const reactantId = reactantIdOf(field)
  const reactant = reactantId === null ? undefined : reactantOf(data, reactantId)
  const reference = mixtureNumber(data, data.referenceMixtureId)
  switch (ownKind(field)) {
    case 'concentration':
      return `Concentration of ${reactant!.name}, ${reactant!.formula}, in mixture ${reference} once it is mixed, in ${CONCENTRATION_UNIT}`
    case 'rate':
      return `Rate of mixture ${reference}, in ${RATE_UNIT}`
    case 'order':
      return `Order in ${reactant!.name}, from mixtures ${reference} and ${mixtureNumber(data, reactant!.comparedIn)}`
    case 'rateConstant':
      return `Rate constant of mixture ${reference}`
    case 'unit':
      return 'Unit of the rate constant'
    case null:
      return ''
  }
}

/** How each kind of entry is made, under its field. No example is a figure any run can have. */
const FORMAT_HELP: Record<OwnKind, string> = {
  concentration: 'Three significant figures: 0.0123',
  rate: 'Three significant figures. A small number can be typed with a power of ten: 1.23e-6',
  order: 'Choose one.',
  rateConstant: 'Three significant figures. A small number can be typed with a power of ten: 1.23e-4',
  unit: 'Choose one.',
}
export const formatHelp = (field: Field) => {
  const kind = ownKind(field)
  return kind === null ? '' : FORMAT_HELP[kind]
}

/** The relation behind each entry, for Guided's closed hint (spec 19.3). It says how the entry is worked and gives no figure of a run. */
export function relationText(field: Field): string {
  switch (ownKind(field)) {
    case 'concentration':
      return "Concentration in the mixture = concentration in the bottle × volume used ÷ whole volume of the mixture. The bottle's concentration is on its label, and the two volumes are in the table of the mixture."
    case 'rate':
      return 'Rate = concentration of iodine in the mixture ÷ time. All of the iodine was used up by the end of the run. Its concentration is your entry above, and the time is in the table of times, in seconds.'
    case 'order':
      return 'Divide the rate of the second mixture named by the rate of the first. The second holds twice the concentration of this reactant, and nothing else differs. A ratio near 1 is order 0, near 2 is order 1, and near 4 is order 2.'
    case 'rateConstant':
      return 'k = rate ÷ the concentrations, each raised to the order you gave it. A concentration of order 0 is left out, and one of order 2 is squared.'
    case 'unit':
      return `A rate is in ${RATE_UNIT}, and each order takes one ${CONCENTRATION_UNIT} away. Add up your three orders: the primer's card The rate constant gives the unit for each sum.`
    case null:
      return ''
  }
}

/** The orders to choose among, each with its label. */
export const orderChoices = (m: AcetoneModel) => m.orderChoices.map((order) => ({ value: order, label: String(order) }))
/** The units to choose among, each with its label. */
export const unitChoices = (m: AcetoneModel) => m.unitPowers.map((power) => ({ value: power, label: UNIT_LABEL[power] ?? '' }))

/** An entry as it is shown once made: a number as it was typed with its unit, or a choice in words. */
export function valueText(field: Field, value: Value): string {
  const kind = ownKind(field)
  if (typeof value === 'number') return kind === 'order' ? `order ${value}` : kind === 'unit' ? (UNIT_LABEL[value] ?? '') : ''
  const unit: Partial<Record<OwnKind, string>> = { concentration: ` ${CONCENTRATION_UNIT}`, rate: ` ${RATE_UNIT}` }
  return `${figuresText(value)}${kind === null ? '' : (unit[kind] ?? '')}`
}

/** A typed entry as it stands in its field: the number alone, since the label gives its unit. Read back by `parseFigures` as the same entry. */
export const entryText = (value: Sig3) => figuresText(value)

const DOES_NOT_FOLLOW = 'That does not follow from your own numbers.'

const SLIP_TEXT: Record<Slip, string> = {
  'cut-off': 'That looks cut off where it should be rounded. Look at the figure after the third: if it is 5 or more, the third goes up by one.',
  'wrong-sign': 'Give this as a positive number.',
  'not-diluted': 'That is the concentration in the bottle. In the mixture the solution is thinned by the others: use the volume of it and the whole volume.',
  // Not this lab's: one molecule of iodine is one of the reaction, and no entry is an energy.
  'count-left-out': DOES_NOT_FOLLOW,
  'joules-for-kilojoules': DOES_NOT_FOLLOW,
}

// None of these sends the learner to the relation: Guided has it under the field, and Challenge has none to open.
const NOT_FOLLOWING: Record<OwnKind, string> = {
  concentration: "That does not follow from the bottle's concentration and the two volumes. Check which volume is the solution's and which is the whole mixture's.",
  rate: 'That does not follow from the iodine in the mixture and the time in the table. Check that the time is in seconds.',
  order: 'That is not the order the two rates give. Divide one rate by the other and see which ratio it is nearest.',
  rateConstant: 'That does not follow from the rate, the concentrations and the orders you entered.',
  unit: 'That is not the unit your three orders give.',
}
const notFollowing = (field: Field | undefined) => {
  const kind = field === undefined ? null : ownKind(field)
  return kind === null ? DOES_NOT_FOLLOW : NOT_FOLLOWING[kind]
}

/**
 * Feedback on an entry that does not follow: what kind of slip it looks like where the engine knows one, and
 * otherwise that it does not follow from the learner's own numbers. Never the value. Empty for an entry that follows.
 */
export function entryFeedback(field: Field, verdict: Verdict): string {
  if (verdict.follows) return ''
  return verdict.slip ? SLIP_TEXT[verdict.slip] : notFollowing(field)
}

/** Beside an entry once it is checked. */
export const VERDICT_TEXT = { follows: 'Follows', not: 'Does not follow' } as const

const NO_BATH = "This lab has no baths: every run is made on the bench, at the room's temperature."
const NO_GRAPH = 'This lab has no part on temperature, and no graph.'

const BLOCKED_TEXT: Record<Exclude<Blocked, Slip>, (field?: Field) => string> = {
  'lab-completed': () => 'The lab is complete. Restart the lab to work it again.',
  'unknown-run': () => 'There is no such run.',
  'unknown-sheet': () => 'There is no such notebook.',
  'already-done': () => 'That is already done.',
  'already-poured': () => 'The iodine is in and the watch is running. Stop the watch when the colour has gone.',
  'not-poured': () => 'The watch starts when the iodine is poured in.',
  'run-over': () => 'This run is over: its watch has been stopped.',
  'invalid-time': () => 'That is not a time the watch can read.',
  'run-not-over': () => 'This run is not over yet: stop the watch first.',
  'run-counts': () => 'This run counts, and its time is in the table. A run that counts is not made again.',
  'too-many': () => 'This has been tried as many times as the record can hold. Restart the lab to go on.',
  'runs-missing': () => 'The notebook opens once all four runs count. Make the runs that are not in the table of times yet.',
  'sheet-over': () => 'This notebook has been checked. Work it again for a new one.',
  'not-this-sheet': () => 'That entry is not in this notebook.',
  'entry-above-missing': () => 'Make the entries above this one first: each is worked from the ones before it.',
  'invalid-entry': (field) => (field === undefined ? 'That is not written as this entry is.' : ['order', 'unit'].includes(kindOf(field)) ? formatHelp(field) : `That is not written as this entry is. ${formatHelp(field)}`),
  'sheet-not-full': () => 'Make every entry of the notebook first.',
  'sheet-not-over': () => 'This notebook has not been checked yet.',
  'sheet-counts': () => 'This notebook counts: there is nothing to work again.',
  'does-not-follow': (field) => notFollowing(field),
  // Not this lab's: it has no baths and no graph.
  'no-bath': () => NO_BATH,
  'not-in-bath': () => NO_BATH,
  'thermometer-not-read': () => NO_BATH,
  'rate-law-first': () => NO_GRAPH,
  'nothing-there': () => NO_GRAPH,
  'not-looked': () => NO_GRAPH,
  'same-place': () => NO_GRAPH,
}

/** Why an action cannot be done now, or why Guided did not take an entry. `field` is the entry it was, where it was one. */
export function blockedText(blocked: Blocked, field?: Field): string {
  if (blocked in BLOCKED_TEXT) return BLOCKED_TEXT[blocked as Exclude<Blocked, Slip>](field)
  return SLIP_TEXT[blocked as Slip]
}

const SHEET_REASON_TEXT: Record<SheetReason, (m: AcetoneModel) => string> = {
  'entries-do-not-follow': () => 'An entry does not follow from your own numbers.',
  'orders-differ': () => "The orders the times give are not the ones the lab's model has.",
  'outside-tolerance': (m) => `The result is more than ${m.rateConstantTolerancePercent}% from what the lab's model gives.`,
}

/** One reason the notebook does not count, as a sentence: as the record gives it, where no notebook stands beside it. */
export const sheetReasonText = (m: AcetoneModel, reason: SheetReason) => SHEET_REASON_TEXT[reason](m)

/** How far a result is from what the model gives: "0.7% under", "0.4% over", "equal to". */
const offText = (percent: number) => (Math.abs(percent) < 0.05 ? 'equal to' : `${Math.abs(percent).toFixed(1)}% ${percent < 0 ? 'under' : 'over'}`)

/**
 * The sentence for the notebook once it is checked: that it counts, or that it does not and why (spec 19.3). It
 * gives how far the result was from the model's only where the engine hands that over. Empty for a notebook that
 * is still open. `again` is whether it can be worked again: it cannot once the lab is complete.
 */
export function sheetOutcomeText(m: AcetoneModel, outcome: SheetOutcome, again = true): string {
  if (outcome.state === 'open') return ''
  const held = "what the lab's model gives at this room's temperature"
  if (outcome.state === 'counts') return `This notebook counts: every entry follows, and the mean rate constant is within ${m.rateConstantTolerancePercent}% of ${held}. Yours is ${offText(outcome.percentOff)} it.`
  const marks = outcome.reasons.includes('entries-do-not-follow') ? ' The notebook marks which.' : ''
  const off = outcome.percentOff === null ? '' : ` Its result was ${offText(outcome.percentOff)} ${held}.`
  return `This notebook does not count. ${outcome.reasons.map((reason) => sheetReasonText(m, reason)).join(' ')}${marks}${off}${again ? ' Work this notebook again.' : ''}`
}

/** What part 2's results were held to, said once the engine hands it over: the model's orders, and its rate constant at the room's temperature. */
export function rateLawExpectedText(data: AcetoneData, expected: NonNullable<RateLawView['expected']>): string {
  const { rateLaw } = data
  const orders = listed(rateLaw.reactants.map((reactant) => `order ${expected.orders[reactant.id] ?? 0} in ${reactant.name}`))
  const power = 1 - Object.values(expected.orders).reduce((sum, order) => sum + order, 0)
  const constant = parseFigures(expected.rateConstant.toExponential(2))
  return `The lab's model has ${orders}: ${rateLaw.expression}. At ${temperatureText(expected.roomTenths)}, this room's temperature, it gives a rate constant of ${constant === null ? expected.rateConstant.toPrecision(3) : figuresText(constant)} ${UNIT_LABEL[power] ?? ''}.`
}

/** What is shown under a part once it is done: the record's notes for it. A page asks for them only then. */
export const partNotes = (data: AcetoneData, part: PartId): string[] => partOf(data, part).notes.map((note) => note.value)

// ---------------------------------------------------------------------------
// Parts' progress, modes, the record and the sources

/** How far a part has come, in the list of parts and on its page, beside a mark that says the same. */
export type PartProgress = 'not-started' | 'runs' | 'notebook' | 'not-counted' | 'done'
/** `runs` are the part's own runs; `sheet` is the notebook's view, or null for part 1. */
export function partProgressOf(done: boolean, runs: readonly Pick<RunView, 'poured' | 'outcome'>[], sheet: { entries: readonly { value: Value | null }[]; outcome: SheetOutcome } | null): PartProgress {
  if (done) return 'done'
  if (sheet?.outcome.state === 'does-not-count') return 'not-counted'
  if (sheet?.entries.some((entry) => entry.value !== null)) return 'notebook'
  return runs.some((run) => runProgressOf(run) !== 'not-started') ? 'runs' : 'not-started'
}
export const PART_PROGRESS_TEXT: Record<PartProgress, string> = {
  'not-started': 'Not started',
  runs: 'Runs under way',
  notebook: 'Notebook under way',
  'not-counted': 'Notebook did not count',
  done: 'Done',
}

/** How many of a part's runs count: "3 of 4 runs count". */
export const runsCountText = (counting: number, of: number) => `${counting} of ${of} runs count`

/** What each mode does in this lab (spec 19.3), beside its radio button. There is nothing for Guided to warn of before a pour here. */
export const MODE_TEXT: Record<Mode, string> = {
  guided: 'Guided: the lab checks each entry of the notebook as you make it, and has the relation each entry uses ready to open.',
  challenge: 'Challenge: no hints. The notebook takes whatever you enter and is checked all together when you ask. A run or a notebook that does not count is made again.',
}

/** What the page itself says and no part of the lab's chemistry. */
export const PAGE_TEXT = {
  parts: 'Parts',
  runs: 'Runs',
  previous: (title: string) => `Previous: ${title}`,
  next: (title: string) => `Next: ${title}`,
  bench: 'The bench',
  hazards: "Each bottle's hazards",
  /** Under the drawing of the two flasks: the words for the liquid's look. */
  looks: 'How the liquid looks',
} as const

/** The Record tab. */
export const RECORD_TEXT = {
  region: 'Record of the two parts',
  caption: 'Every attempt at each run and every working of the notebook, with how it came out',
  part: 'Part',
  attempt: (number: number) => `Attempt ${number}`,
  working: (number: number) => `Working ${number}`,
  result: 'Result',
  open: 'Not finished yet',
  notChecked: 'Not checked yet',
  counts: 'Counts',
  doesNotCount: 'Does not count',
  /** How a run in the record was timed. */
  timedByHand: (tenths: number) => `${secondsText(tenths)}, watch stopped by hand`,
  /** A watch stopped by hand once the colour had gone: how long after, in true seconds, which is the learner's own delay. */
  timedByHandAfter: (tenths: number, delayMs: number) => `${secondsText(tenths)}, watch stopped by hand ${(delayMs / 1000).toFixed(1)} s after the colour had gone`,
  timedByEnd: (tenths: number) => `${secondsText(tenths)}, watch stopped when the colour had gone`,
  /** A watch left running to its limit: no hand stopped it. */
  timedOut: (tenths: number) => `${secondsText(tenths)}, the watch stopped itself`,
} as const

/** Under a part's sources: what is Valence's own. */
export const SOURCES_TEXT =
  "The time of each run, whether an entry follows and whether a part counts are worked out by Valence from these values and from the model's parameters. The small scatter in each time is Valence's own, and so are the steps at which the words for the liquid's colour change. The hints and the feedback are written by Valence."
