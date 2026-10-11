import { bathOfRun, mixtureOfRun, PART_IDS, reagentOf, type ClockData, type PartId, type RunId } from '@/chem-data/clock/data'
import { CONCENTRATION_UNIT, listed, lower, minus, RATE_UNIT, secondsText, temperatureText, UNIT_LABEL, volumeText, watchText } from '../kineticsText'
import { formatFigures, kindOf, reactantIdOf, type Blocked, type ClockModel, type Field, type FieldKind, type Look, type Mode, type Place, type RateLawView, type RunOutcome, type RunReason, type RunView, type SheetId, type SheetOutcome, type SheetReason, type Sig3, type Slip, type TemperatureView, type TimeRow, type Value, type Verdict, type Warning } from '@/engine/clock'

// Every sentence the clock reaction lab says that is chemistry, keyed by the engine's identifiers, so that an
// identifier with no sentence does not compile. A sentence can say only what it is handed: the lab's record and
// what the engine's views hold, which is never the time of a run before its watch is stopped, whether an entry
// follows before that may be said, or the model's orders, its rate constant or its activation energy, until the
// part they belong to is done. The notes shown when a part is done are in the record itself, with their sources
// (src/chem-data/clock/clock.json); this module words everything else.
//
// What a learner sees is described as it is seen: a liquid by its look, a flask by where it stands and what has
// been done to it. Feedback on an entry says that it does not follow, and what kind of slip it looks like where
// the engine knows one, and never the value it should have been. No label, hint or refusal gives an order of this
// reaction: Challenge reads them before the entries are made.

// ---------------------------------------------------------------------------
// Figures as they are written

// A temperature, a time in seconds and on the watch's face, a volume and the units of a rate and of a rate constant
// are written as the iodination of acetone lab writes them too: one module holds them (../kineticsText.ts), and
// they are handed on here under the names this lab's page uses.
export { CONCENTRATION_UNIT, RATE_UNIT, secondsText, temperatureText, UNIT_LABEL, volumeText, watchText }

/** A temperature in kelvin, kept as the sum comes: "294.75 K". */
export const kelvinText = (centiKelvin: number) => `${(centiKelvin / 100).toFixed(2)} K`
/** A typed number of three figures as it is read: "50.3", "−6010", "3.22 × 10⁻⁷". */
export const figuresText = (value: Sig3) => minus(formatFigures(value))
/** One over a temperature in kelvin, to four significant figures: "0.003393". */
export const inverseText = (xMicro: number) => (xMicro / 1e6).toFixed(6)
/** A natural logarithm to three decimal places: "3.735". */
export const logText = (yMilli: number) => minus((yMilli / 1000).toFixed(3))

// ---------------------------------------------------------------------------
// The lab, its parts and its bench

export const LAB_TEXT = {
  name: 'The clock reaction',
  aim: 'Time a reaction that turns blue all at once. From the times, find how its rate depends on each reactant and on temperature.',
  /** Over the list of parts: what completes the lab. */
  completeWhen: 'The lab is complete once all three parts are done.',
  complete: 'The lab is complete: all three parts are done.',
} as const

const partOf = (data: ClockData, part: PartId) => data.parts[PART_IDS.indexOf(part)]!

/** "Part 1: Five mixtures at room temperature". */
export const partTitle = (data: ClockData, part: PartId) => `Part ${PART_IDS.indexOf(part) + 1}: ${partOf(data, part).name}`

/** What each part finds, under its title, in both modes. None gives an order, the rate constant or the activation energy. */
export const PART_AIM: Record<PartId, string> = {
  runs: 'How long each of five mixtures takes to turn blue.',
  'rate-law': 'The order in each of the three reactants, and the rate constant.',
  temperature: 'The activation energy, from the first mixture at four temperatures.',
}

/** What makes each part done, under what it finds. */
export const PART_DONE_WHEN: Record<PartId, string> = {
  runs: 'This part is done once all five runs count.',
  'rate-law': 'This part is done once its notebook has been checked and counts.',
  temperature: 'This part is done once its three runs count and its notebook has been checked and counts.',
}

const bottleName = (data: ClockData, reagentId: string) => (reagentId === 'water' ? data.water.name : reagentOf(data, reagentId).name)
/** "Potassium iodide solution, 0.010 M" as it is said inside a sentence, without its strength: "potassium iodide solution". */
const liquidName = (data: ClockData, reagentId: string) => lower(bottleName(data, reagentId).split(',')[0]!)
const reactantOf = (data: ClockData, reactantId: string) => data.rateLaw.reactants.find((r) => r.id === reactantId)!
const mixtureNumber = (data: ClockData, mixtureId: string) => data.mixtures.findIndex((m) => m.id === mixtureId) + 1

/** The bench in words (spec 19.1): the bottles as their labels read, the water, the glass, the watch and the thermometer with what it reads in the room. */
export function benchLines(data: ClockData, roomTenths: number): string[] {
  return [
    ...data.reagents.map((r) => `${r.name}.`),
    `${data.water.name}.`,
    'Two flasks for each mixture: flask A and flask B.',
    'A stopwatch.',
    `A thermometer. In the room it reads ${temperatureText(roomTenths)}.`,
    `Three baths: ${listed(data.baths.map((b) => lower(b.name)))}.`,
  ]
}

// ---------------------------------------------------------------------------
// A run: its mixture, its flasks, its liquid and its watch

/** "Mixture 3", or "Mixture 1 in ice water" for a run in a bath. */
export function runTitle(data: ClockData, runId: RunId): string {
  const bath = bathOfRun(runId)
  const mixture = mixtureOfRun(data, runId)
  return bath === null ? mixture.name : `${mixture.name} in ${lower(data.baths.find((b) => b.id === bath)!.name)}`
}

/** The cards of a run and of a notebook, the buttons, and what is said beside them. */
export const RUN_TEXT = {
  mixture: 'The mixture',
  flasks: 'The flasks',
  watch: 'The watch and the liquid',
  flaskA: 'Flask A',
  flaskB: 'Flask B',
  liquid: 'Liquid',
  volume: 'Volume',
  starch: 'Add starch to flask B',
  starchDone: 'Starch added to flask B',
  letStand: (data: ClockData) => `Let them stand for ${data.parameters.standMinutes.value} minutes`,
  letStandDone: (data: ClockData) => `Stood for ${data.parameters.standMinutes.value} minutes`,
  read: 'Read the thermometer',
  pour: 'Pour flask B into flask A and start the watch',
  poured: 'Flask B poured into flask A',
  stop: 'Stop the watch',
  stopAtChange: 'Stop the watch for me at the change',
  /** Beside the two ways of stopping the watch. */
  stopHelp: 'Stop the watch when the liquid changes. Your own delay is added to the time, as a hand adds it on a real watch.',
  stopAtChangeHelp: 'The watch then stops at the change itself. A run timed this way counts like any other, and the record says how it was timed.',
  /** Beside the running watch of a run on the bench: the five mixtures are all played at one speed, so a shorter time is a shorter wait. */
  fast: 'The page plays the time faster than a clock would, at one speed for all five mixtures.',
  /** Beside the running watch of a run in a bath: each bath has a speed of its own, so its wait says nothing of its time. */
  fastBath: 'The page plays the time faster than a clock would, and each bath at its own pace.',
  /** In the flasks' card, once a run was left while its watch was running: the page records no time for it, and the flasks are poured again. */
  left: 'This run was left while its watch was running, so no time was recorded. The flasks are as they were before the pour: pour again to time it.',
  runAgain: 'Make this run again',
  runAgainHelp: 'Sets the two flasks up afresh. The run so far is kept in the record.',
  outcome: 'This run',
} as const

/** The button that stands the flasks in a run's bath, before and after: "Stand both flasks in the ice water". */
export function standLabel(data: ClockData, runId: RunId, done = false): string {
  const bath = data.baths.find((b) => b.id === bathOfRun(runId))
  return bath === undefined ? '' : done ? `Both flasks stand in the ${lower(bath.name)}` : `Stand both flasks in the ${lower(bath.name)}`
}

/** The rows of a mixture's table: each liquid with its flask and its volume. A liquid of which none goes in is left out. */
export function mixtureRows(data: ClockData, runId: RunId): { flask: string; liquid: string; volume: string }[] {
  const mixture = mixtureOfRun(data, runId)
  const rows = (flask: string, parts: typeof mixture.flaskA) => parts.filter((part) => part.millilitres > 0).map((part) => ({ flask, liquid: bottleName(data, part.reagentId), volume: volumeText(part.millilitres) }))
  return [...rows(RUN_TEXT.flaskA, mixture.flaskA), ...rows(RUN_TEXT.flaskB, mixture.flaskB)]
}

const wholeVolume = (data: ClockData, runId: RunId) => {
  const mixture = mixtureOfRun(data, runId)
  return [...mixture.flaskA, ...mixture.flaskB].reduce((sum, part) => sum + part.millilitres, 0)
}

/** Under a mixture's table: what the two flasks come to. */
export const mixtureTotal = (data: ClockData, runId: RunId) => `${volumeText(wholeVolume(data, runId))} in all, once flask B is poured into flask A. The drops of starch are not counted.`

/** A mixture in words: what each flask holds, each liquid with its volume after it. */
export function mixtureText(data: ClockData, runId: RunId): string {
  const mixture = mixtureOfRun(data, runId)
  const holds = (parts: typeof mixture.flaskA) => parts.filter((part) => part.millilitres > 0).map((part) => `${liquidName(data, part.reagentId)}, ${volumeText(part.millilitres)}`).join('; ')
  return `Flask A: ${holds(mixture.flaskA)}. Flask B: ${holds(mixture.flaskB)}. That is ${volumeText(wholeVolume(data, runId))} in all.`
}

/**
 * The two flasks in words (spec 19.7, last item): where they stand and what has been done to them, in the order it
 * is done. It says nothing of what the liquid will do.
 */
export function flasksText(data: ClockData, runId: RunId, view: Pick<RunView, 'indicator' | 'flasks' | 'thermometerTenths' | 'poured'>): string {
  const bath = data.baths.find((b) => b.id === bathOfRun(runId))
  const starch = view.indicator ? 'Starch has been added to flask B.' : 'No starch has been added.'
  const mixed = view.poured ? 'Flask B has been poured into flask A.' : 'The two flasks have not been mixed.'
  if (bath === undefined) return [`Flask A and flask B ${view.poured ? 'stood' : 'stand'} on the bench, at the room's temperature.`, starch, mixed].join(' ')
  const where = {
    bench: `Flask A and flask B ${view.poured ? 'stood' : 'stand'} on the bench, at the room's temperature. They have not been put in the ${lower(bath.name)}.`,
    'in-bath': `Flask A and flask B ${view.poured ? 'stood' : 'stand'} in the ${lower(bath.name)}. They ${view.poured ? 'had' : 'have'} only just gone in.`,
    stood: `Flask A and flask B have stood in the ${lower(bath.name)} for ${data.parameters.standMinutes.value} minutes.`,
  }[view.flasks]
  const thermometer = view.flasks === 'bench' ? '' : view.thermometerTenths === null ? 'The thermometer in flask A has not been read since.' : `The thermometer in flask A reads ${temperatureText(view.thermometerTenths)}.`
  return [where, starch, thermometer, mixed].filter((sentence) => sentence !== '').join(' ')
}

/** What the liquid looks like, as it is seen (spec 19.5): in the two flasks before the pour, and in the one after it. */
export function liquidText(data: ClockData, look: Look, poured: boolean): string {
  const { before, after } = data.rateLaw.end
  if (!poured) return `The liquid in each flask is ${before.value}.`
  return look === 'after' ? `The mixture is ${after.value}.` : `The mixture is ${before.value}.`
}

/** Said once, to a status line, at the moment the liquid changes while the watch runs. */
export const changeText = (data: ClockData) => `The mixture has turned ${data.rateLaw.end.after.value}, all at once.`

/** The watch in words: not started, running with what it reads, or stopped with what it reads and how. */
export function watchStatusText(view: Pick<RunView, 'poured' | 'stopped'>, tenthsNow: number, m: ClockModel): string {
  if (!view.poured) return 'The watch has not been started.'
  if (view.stopped === null) return `The watch is running: ${watchText(tenthsNow)}.`
  const reading = `${watchText(view.stopped.tenths)}, which is ${secondsText(view.stopped.tenths)}`
  if (view.stopped.tenths * 100 >= m.watchLimitMs) return `The watch stopped itself at ${reading}.`
  return view.stopped.by === 'hand' ? `The watch was stopped by hand at ${reading}.` : `The watch was stopped at the change, at ${reading}.`
}

/** Guided's warning before the pour (spec 19.2). */
export const WARNING_TEXT: Record<Warning, { title: string; body: string }> = {
  'no-indicator': {
    title: 'No starch in flask B',
    body: 'Without starch nothing will show when the thiosulfate runs out, so there will be no change to time, and the run will not count. Add starch first.',
  },
  'not-at-temperature': {
    title: 'The flasks have not stood in the bath',
    body: 'They are still at the room\'s temperature. Mixed now, the liquid will go on changing temperature while it reacts, so its time will belong to no one temperature, and the run will not count. Let them stand first.',
  },
}
/** The two buttons of the warning: one way back and one way on. */
export const WARNING_BUTTONS = { back: 'Go back', on: 'Pour anyway' } as const

const RUN_REASON_TEXT: Record<RunReason, (m: ClockModel) => string> = {
  'no-indicator': () => 'No starch was added, so nothing showed when the thiosulfate ran out, and there was no change to time.',
  'not-at-temperature': () => "The flasks were mixed before they had come to the bath's temperature, so the time belongs to no one temperature.",
  'stopped-early': () => 'The watch was stopped before the liquid changed.',
  'stopped-late': (m) => `The watch was stopped more than ${m.delayLimitMs / 1000} seconds after the liquid changed.`,
  'ran-out': () => 'The watch ran to its limit before the liquid changed.',
}

/** One reason a run does not count, as a sentence. */
export const runReasonText = (m: ClockModel, reason: RunReason) => RUN_REASON_TEXT[reason](m)

/**
 * The sentence for a run once its watch is stopped: that it counts, with the time that goes into the table, or
 * that it does not and why (spec 19.2). Empty for a run still under way. `again` is whether the run can be made
 * again: it cannot once the lab is complete, and the sentence then does not say to.
 */
export function runOutcomeText(m: ClockModel, outcome: RunOutcome, stopped: RunView['stopped'], again = true): string {
  if (outcome.state === 'open' || stopped === null) return ''
  if (outcome.state === 'counts') return `This run counts: ${secondsText(stopped.tenths)} goes into the table of times.`
  return `This run does not count. ${outcome.reasons.map((reason) => runReasonText(m, reason)).join(' ')}${again ? ' Make this run again.' : ''}`
}

/** How far a run has come, in a list of runs, beside a mark that says the same. */
export type RunProgress = 'not-started' | 'under-way' | 'running' | 'not-counted' | 'counts'
export function runProgressOf(view: Pick<RunView, 'indicator' | 'flasks' | 'poured' | 'outcome'>): RunProgress {
  if (view.outcome.state === 'counts') return 'counts'
  if (view.outcome.state === 'does-not-count') return 'not-counted'
  if (view.poured) return 'running'
  return view.indicator || view.flasks !== 'bench' ? 'under-way' : 'not-started'
}
export const RUN_PROGRESS_TEXT: Record<RunProgress, string> = {
  'not-started': 'Not started',
  'under-way': 'Flasks being made ready',
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
  byEnd: 'at the change',
  empty: 'Not timed yet',
  /** Under the table, in parts 2 and 3: where its figures go. */
  use: 'The notebook is worked from these times.',
} as const

/** One row of the table of times as a sentence: "Mixture 1: 22.5 °C, 124.4 s, watch stopped by hand." */
export function timeRowText(data: ClockData, row: TimeRow): string {
  const title = runTitle(data, row.runId as RunId)
  if (row.tenths === null || row.temperatureTenths === null) return `${title}: not timed yet.`
  return `${title}: ${temperatureText(row.temperatureTenths)}, ${secondsText(row.tenths)}, watch stopped ${row.by === 'hand' ? TABLE_TEXT.byHand : TABLE_TEXT.byEnd}.`
}

// ---------------------------------------------------------------------------
// The notebook

/** The cards and buttons of a notebook. */
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
  /** Over the rows the notebook has filled in, in part 2. */
  filledRows: 'You have worked the row of mixture 1. The notebook has worked the other four the same way, from unrounded figures, and written each to three significant figures.',
  filledConstants: 'The notebook has worked out the rate constant of the other four runs with the orders you gave, and the mean of all five.',
  /** Over the table of part 3. */
  filledTemperatures:
    'The notebook has filled in this table. Each temperature in kelvin is the reading plus 273.15. One over it is given to four significant figures. Each rate constant is worked with the rate law of part 2, and its logarithm from the unrounded rate constant, to three decimal places.',
  mean: 'Mean of the five',
  yourRow: 'your own entries',
} as const

/** The heads of the two tables the notebook fills. */
export const SHEET_TABLE_TEXT = {
  rateLawCaption: 'Concentrations, rates and rate constants of the five runs',
  temperatureCaption: 'The rate constant at four temperatures',
  run: 'Run',
  time: 'Time, in s',
  concentration: (data: ClockData, reactantId: string) => `[${reactantOf(data, reactantId).formula}], in ${CONCENTRATION_UNIT}`,
  rate: `Rate, in ${RATE_UNIT}`,
  constant: 'Rate constant, k',
  celsius: 'Temperature, in °C',
  kelvin: 'T, in K',
  inverse: '1/T, in 1/K',
  log: 'ln k',
} as const

/** A sheet's entries, each with its label. `reactantId` is the reactant a strength or an order is asked of. */
export function fieldLabel(data: ClockData, field: Field): string {
  const reactantId = reactantIdOf(field)
  const reactant = reactantId === null ? undefined : reactantOf(data, reactantId)
  const reference = mixtureNumber(data, data.referenceMixtureId)
  switch (kindOf(field)) {
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
    case 'first':
      return 'First place on the line'
    case 'second':
      return 'Second place on the line'
    case 'slope':
      return 'Slope of the line, in K'
    case 'energy':
      return 'Activation energy, in kJ/mol'
  }
}

/** How each kind of entry is made, under its field. No example is a figure any run can have. */
const FORMAT_HELP: Record<FieldKind, string> = {
  concentration: 'Three significant figures: 0.00123',
  rate: 'Three significant figures. A small number can be typed with a power of ten: 1.23e-7',
  order: 'Choose one.',
  rateConstant: 'Three significant figures: 12.3',
  unit: 'Choose one.',
  first: 'Choose a place you have looked at.',
  second: 'Choose another place you have looked at.',
  slope: 'Three significant figures, with its sign: −1230',
  energy: 'Three significant figures: 12.3',
}
export const formatHelp = (field: Field) => FORMAT_HELP[kindOf(field)]

/** The relation behind each entry, for Guided's closed hint (spec 19.3). It says how the entry is worked and gives no figure of a run. */
export function relationText(data: ClockData, field: Field): string {
  const gas = `${data.constants.gasConstant.value.toPrecision(4)} ${data.constants.gasConstant.unit}`
  switch (kindOf(field)) {
    case 'concentration':
      return 'Concentration in the mixture = concentration in the bottle × volume used ÷ whole volume of the mixture. The bottle\'s concentration is on its label, and the two volumes are in the table of the mixture.'
    case 'rate':
      return `Rate = (concentration of thiosulfate in the mixture ÷ ${data.rateLaw.end.per}) ÷ time. The thiosulfate is thinned like the others when the flasks are mixed. The time is in the table of times, in seconds.`
    case 'order':
      return 'Divide the rate of the second mixture named by the rate of the first. The second holds twice the concentration of this reactant, and nothing else differs. A ratio near 1 is order 0, near 2 is order 1, and near 4 is order 2.'
    case 'rateConstant':
      return 'k = rate ÷ the concentrations, each raised to the order you gave it. A concentration of order 0 is left out, and one of order 2 is squared.'
    case 'unit':
      return `A rate is in ${RATE_UNIT}, and each order takes one ${CONCENTRATION_UNIT} away. Add up your three orders: the primer's card The rate constant gives the unit for each sum.`
    case 'first':
    case 'second':
      return 'Any place on the line will do, and two places far apart give the slope best. Look at a place to read its two figures.'
    case 'slope':
      return 'Slope = (second ln k − first ln k) ÷ (second 1/T − first 1/T). The line falls from left to right, so the slope is a negative number.'
    case 'energy':
      return `Ea = −slope × R, with R = ${gas}. That gives joules for each mole: divide by 1000 for kJ/mol.`
  }
}

/** The orders to choose among, each with its label. */
export const orderChoices = (m: ClockModel) => m.orderChoices.map((order) => ({ value: order, label: String(order) }))
/** The units to choose among, each with its label. */
export const unitChoices = (m: ClockModel) => m.unitPowers.map((power) => ({ value: power, label: UNIT_LABEL[power] ?? '' }))

/** What a look at a place on the line says: its two figures, "1/T = 0.003200, ln k = 4.834". */
export const placeCallout = (place: Place) => `1/T = ${inverseText(place.xMicro)}, ln k = ${logText(place.yMilli)}`
/** A place on the line as its button names it, before and after it is looked at. */
export const placeLabel = (place: Place, looked: boolean) => `Look at the line at 1/T = ${inverseText(place.xMicro)}${looked ? ', looked at' : ''}`
/** The places that can be entered: those that have been looked at, each by its number, with its two figures. */
export const placeChoices = (graph: NonNullable<TemperatureView['graph']>) => graph.places.flatMap((place, index) => (place.looked ? [{ value: index, label: placeCallout(place) }] : []))

/** An entry as it is shown once made: a number as it was typed with its unit, or a choice in words. `places` are the line's, for the two entries that are places. */
export function valueText(field: Field, value: Value, places: readonly Place[] = []): string {
  const kind = kindOf(field)
  if (typeof value === 'number') {
    if (kind === 'order') return `order ${value}`
    if (kind === 'unit') return UNIT_LABEL[value] ?? ''
    return places[value] === undefined ? '' : placeCallout(places[value])
  }
  const unit: Partial<Record<FieldKind, string>> = { concentration: ` ${CONCENTRATION_UNIT}`, rate: ` ${RATE_UNIT}`, slope: ' K', energy: ' kJ/mol' }
  return `${figuresText(value)}${unit[kind] ?? ''}`
}

/** A typed entry as it stands in its field: the number alone, since the label gives its unit. Read back by `parseFigures` as the same entry. */
export const entryText = (value: Sig3) => figuresText(value)

const SLIP_TEXT: Record<Slip, (kind: FieldKind) => string> = {
  'cut-off': () => 'That looks cut off where it should be rounded. Look at the figure after the third: if it is 5 or more, the third goes up by one.',
  'wrong-sign': (kind) =>
    kind === 'slope'
      ? 'The size is right and the sign is not. The line falls from left to right, so its slope is a negative number.'
      : kind === 'energy'
        ? 'The size is right and the sign is not. An activation energy is a positive number: take the size of the slope.'
        : 'Give this as a positive number.',
  'not-diluted': () => 'That is the concentration in the bottle. In the mixture the solution is thinned by the others: use the volume of it and the whole volume.',
  'count-left-out': () => 'That takes all of the thiosulfate. The bromate used up is a share of it: look at how many thiosulfate ions go with one bromate ion.',
  'joules-for-kilojoules': () => 'That is in joules for each mole. Divide by 1000 to give kilojoules for each mole.',
}

// None of these sends the learner to the relation: Guided has it under the field, and Challenge has none to open.
const NOT_FOLLOWING: Record<FieldKind, string> = {
  concentration: "That does not follow from the bottle's concentration and the two volumes. Check which volume is the solution's and which is the whole mixture's.",
  rate: 'That does not follow from the thiosulfate in the mixture and the time in the table. Check that the time is in seconds.',
  order: 'That is not the order the two rates give. Divide one rate by the other and see which ratio it is nearest.',
  rateConstant: 'That does not follow from the rate, the concentrations and the orders you entered.',
  unit: 'That is not the unit your three orders give.',
  first: 'That is not a place on the line.',
  second: 'That is not another place on the line.',
  slope: 'That does not follow from the two places you chose. Check which figure of each place is ln k and which is 1/T.',
  energy: 'That does not follow from the slope you entered and the gas constant.',
}

/**
 * Feedback on an entry that does not follow: what kind of slip it looks like where the engine knows one, and
 * otherwise that it does not follow from the learner's own numbers. Never the value. Empty for an entry that follows.
 */
export function entryFeedback(field: Field, verdict: Verdict): string {
  if (verdict.follows) return ''
  return verdict.slip ? SLIP_TEXT[verdict.slip](kindOf(field)) : NOT_FOLLOWING[kindOf(field)]
}

/** Beside an entry once it is checked. */
export const VERDICT_TEXT = { follows: 'Follows', not: 'Does not follow' } as const

const BLOCKED_TEXT: Record<Exclude<Blocked, Slip>, (data: ClockData, field?: Field) => string> = {
  'lab-completed': () => 'The lab is complete. Restart the lab to work it again.',
  'unknown-run': () => 'There is no such run.',
  'unknown-sheet': () => 'There is no such notebook.',
  'already-done': () => 'That is already done.',
  'no-bath': () => "This run is made on the bench, at the room's temperature: it has no bath.",
  'not-in-bath': () => 'Stand the flasks in the bath first.',
  'thermometer-not-read': () => 'Read the thermometer first: the notebook needs the temperature of this run.',
  'already-poured': () => 'The flasks are mixed and the watch is running. Stop the watch when the liquid changes.',
  'not-poured': () => 'The watch starts when flask B is poured into flask A.',
  'run-over': () => 'This run is over: its watch has been stopped.',
  'invalid-time': () => 'That is not a time the watch can read.',
  'run-not-over': () => 'This run is not over yet: stop the watch first.',
  'run-counts': () => 'This run counts, and its time is in the table. A run that counts is not made again.',
  'too-many': () => 'This has been tried as many times as the record can hold. Restart the lab to go on.',
  'runs-missing': () => 'The notebook opens once every run it is worked from counts. Make the runs that are not in the table of times yet.',
  'rate-law-first': () => 'This notebook opens once part 2 is done: its rate constants are worked with the rate law found there.',
  'sheet-over': () => 'This notebook has been checked. Work it again for a new one.',
  'nothing-there': () => 'There is no place on the line there.',
  'not-this-sheet': () => 'That entry is not in this notebook.',
  'entry-above-missing': () => 'Make the entries above this one first: each is worked from the ones before it.',
  'not-looked': () => 'Look at that place on the line first.',
  'same-place': () => 'Choose two places, not one twice: a slope needs two.',
  'invalid-entry': (_data, field) => (field === undefined ? 'That is not written as this entry is.' : ['order', 'unit', 'first', 'second'].includes(kindOf(field)) ? formatHelp(field) : `That is not written as this entry is. ${formatHelp(field)}`),
  'sheet-not-full': () => 'Make every entry of the notebook first.',
  'sheet-not-over': () => 'This notebook has not been checked yet.',
  'sheet-counts': () => 'This notebook counts: there is nothing to work again.',
  'does-not-follow': (_data, field) => (field === undefined ? 'That does not follow from your own numbers.' : NOT_FOLLOWING[kindOf(field)]),
}

/** Why an action cannot be done now, or why Guided did not take an entry. `field` is the entry it was, where it was one. */
export function blockedText(data: ClockData, blocked: Blocked, field?: Field): string {
  if (blocked in BLOCKED_TEXT) return BLOCKED_TEXT[blocked as Exclude<Blocked, Slip>](data, field)
  return SLIP_TEXT[blocked as Slip](field === undefined ? 'rate' : kindOf(field))
}

const SHEET_REASON_TEXT: Record<SheetReason, (m: ClockModel, sheet: SheetId) => string> = {
  'entries-do-not-follow': () => 'An entry does not follow from your own numbers.',
  'orders-differ': () => "The orders the times give are not the ones the lab's model has.",
  'outside-tolerance': (m, sheet) => `The result is more than ${sheet === 'rate-law' ? m.rateConstantTolerancePercent : m.activationTolerancePercent}% from what the lab's model gives.`,
}

/** One reason a notebook does not count, as a sentence: as the record gives it, where no notebook stands beside it. */
export const sheetReasonText = (m: ClockModel, sheet: SheetId, reason: SheetReason) => SHEET_REASON_TEXT[reason](m, sheet)

/** How far a result is from what the model gives: "0.7% under", "0.4% over", "equal to". */
const offText = (percent: number) => (Math.abs(percent) < 0.05 ? 'equal to' : `${Math.abs(percent).toFixed(1)}% ${percent < 0 ? 'under' : 'over'}`)

/**
 * The sentence for a notebook once it is checked: that it counts, or that it does not and why (spec 19.3). It
 * gives how far the result was from the model's only where the engine hands that over. Empty for a notebook that
 * is still open. `again` is whether it can be worked again: it cannot once the lab is complete.
 */
export function sheetOutcomeText(m: ClockModel, sheet: SheetId, outcome: SheetOutcome, again = true): string {
  if (outcome.state === 'open') return ''
  const held = sheet === 'rate-law' ? "what the lab's model gives at this room's temperature" : "the lab's own figure"
  const result = sheet === 'rate-law' ? 'the mean rate constant' : 'the activation energy'
  const tolerance = sheet === 'rate-law' ? m.rateConstantTolerancePercent : m.activationTolerancePercent
  if (outcome.state === 'counts') return `This notebook counts: every entry follows, and ${result} is within ${tolerance}% of ${held}. Yours is ${offText(outcome.percentOff)} it.`
  const marks = outcome.reasons.includes('entries-do-not-follow') ? ' The notebook marks which.' : ''
  const off = outcome.percentOff === null ? '' : ` Its result was ${offText(outcome.percentOff)} ${held}.`
  return `This notebook does not count. ${outcome.reasons.map((reason) => sheetReasonText(m, sheet, reason)).join(' ')}${marks}${off}${again ? ' Work this notebook again.' : ''}`
}

/** What part 2's results were held to, said once the engine hands it over: the model's orders, and its rate constant at the room's temperature. */
export function rateLawExpectedText(data: ClockData, expected: NonNullable<RateLawView['expected']>): string {
  const { rateLaw } = data
  const orders = listed(rateLaw.reactants.map((reactant) => `order ${expected.orders[reactant.id] ?? 0} in ${reactant.name}`))
  const power = 1 - Object.values(expected.orders).reduce((sum, order) => sum + order, 0)
  return `The lab's model has ${orders}: ${rateLaw.expression}. At ${temperatureText(expected.roomTenths)}, this room's temperature, it gives a rate constant of ${expected.rateConstant.toPrecision(3)} ${UNIT_LABEL[power] ?? ''}.`
}

/** What part 3's result was held to, said once the engine hands it over. The figure is the lab's own, and the sentence says so. */
export const temperatureExpectedText = (expected: NonNullable<TemperatureView['expected']>) => `The activation energy the lab's model runs on is ${expected.activationKJ} kJ/mol. It is the lab's own figure, not a measured one.`

/** What is shown under a part once it is done: the record's notes for it. A page asks for them only then. */
export const partNotes = (data: ClockData, part: PartId): string[] => partOf(data, part).notes.map((note) => note.value)

// ---------------------------------------------------------------------------
// The graph of part 3

export const GRAPH_TEXT = {
  graph: 'The graph',
  picture: 'The graph of part 3: ln k up the side against 1/T along the bottom, with a straight line through four points',
  /** The two axes, beside them. */
  logAxis: 'ln k',
  inverseAxis: '1/T, in 1/K',
  /** The key under the graph. */
  point: 'a run, at its temperature',
  line: 'the straight line through the four points',
  lookedAt: 'a place on the line, looked at',
  notLookedAt: 'a place on the line, not looked at yet',
  /** Beside the graph: what to do with it. */
  explore: 'Point at a place on the line, or tap it or move to it with the keyboard, to look at it.',
  arrows: 'With the keyboard, the left and right arrow keys move from one place to the next.',
  earlier: 'Place to the left',
  later: 'Place to the right',
  /** The closed disclosure that holds the graph described in words. */
  inWords: 'The graph in words',
} as const

/** What a point of the graph says when it is pointed at: its run, its temperature and its two figures. */
export const pointCallout = (data: ClockData, point: { runId: string; tenths: number; xMicro: number; yMilli: number }) =>
  `${runTitle(data, point.runId as RunId)}, at ${temperatureText(point.tenths)}: 1/T = ${inverseText(point.xMicro)}, ln k = ${logText(point.yMilli)}`

/**
 * The graph described in words (spec 19.7, last item): its axes, its four points from the warmest to the coldest,
 * and the line through them with where it runs from and to. It says what is drawn and works nothing out.
 */
export function describeGraph(data: ClockData, view: Pick<TemperatureView, 'rows' | 'graph'>): string {
  if (view.rows === null || view.graph === null) return 'The graph is empty: it is drawn once the notebook of part 3 can be opened.'
  const points = [...view.rows].sort((a, b) => a.xMicro - b.xMicro)
  const [from, to] = view.graph.line
  const each = points.map((p) => `${lower(runTitle(data, p.runId as RunId))}, at ${temperatureText(p.tenths)}, with 1/T ${inverseText(p.xMicro)} and ln k ${logText(p.yMilli)}`)
  return `ln k is up the side and 1/T, in 1/K, is along the bottom. There ${points.length === 1 ? 'is one point' : `are ${points.length} points`}, from left to right: ${each.join('; ')}. A straight line is drawn through them, from ln k ${logText(from.yMilli)} at 1/T ${inverseText(from.xMicro)} to ln k ${logText(to.yMilli)} at 1/T ${inverseText(to.xMicro)}: it ${to.yMilli < from.yMilli ? 'falls' : to.yMilli > from.yMilli ? 'rises' : 'runs level'} from left to right. ${view.graph.places.length} places on it can be looked at.`
}

// ---------------------------------------------------------------------------
// Parts' progress, modes, the record and the sources

/** How far a part has come, in the list of parts and on its page, beside a mark that says the same. */
export type PartProgress = 'not-started' | 'runs' | 'notebook' | 'not-counted' | 'done'
/** `counting` and `begun` are how many of the part's own runs count and how many have been begun; `sheet` is its notebook's view, or null for part 1. */
export function partProgressOf(done: boolean, runs: readonly Pick<RunView, 'indicator' | 'flasks' | 'poured' | 'outcome'>[], sheet: { entries: readonly { value: Value | null }[]; outcome: SheetOutcome } | null): PartProgress {
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

/** How many of a part's runs count: "3 of 5 runs count". */
export const runsCountText = (counting: number, of: number) => `${counting} of ${of} runs count`

/** What each mode does in this lab (spec 19.2, 19.3), beside its radio button. */
export const MODE_TEXT: Record<Mode, string> = {
  guided: 'Guided: the lab warns you before a pour that will not count, checks each entry of the notebook as you make it, and has the relation each entry uses ready to open.',
  challenge: 'Challenge: no warning and no hints. The notebook takes whatever you enter and is checked all together when you ask. A run or a notebook that does not count is made again.',
}

/** What the page itself says and no part of the lab's chemistry. */
export const PAGE_TEXT = {
  parts: 'Parts',
  runs: 'Runs',
  previous: (title: string) => `Previous: ${title}`,
  next: (title: string) => `Next: ${title}`,
  bench: 'The bench',
  hazards: "Each bottle's hazards",
} as const

/** The Record tab. */
export const RECORD_TEXT = {
  region: 'Record of the three parts',
  caption: 'Every attempt at each run and every working of each notebook, with how it came out',
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
  /** A watch stopped by hand once the liquid had changed: how long after, in true seconds, which is the learner's own delay. */
  timedByHandAfter: (tenths: number, delayMs: number) => `${secondsText(tenths)}, watch stopped by hand ${(delayMs / 1000).toFixed(1)} s after the change`,
  timedByEnd: (tenths: number) => `${secondsText(tenths)}, watch stopped at the change`,
  /** A watch that ran to its limit with nothing to show a change: no hand stopped it, and there was no change to stop it at. */
  timedOut: (tenths: number) => `${secondsText(tenths)}, the watch stopped itself`,
} as const

/** Under a part's sources: what is Valence's own. */
export const SOURCES_TEXT =
  "The time of each run, whether an entry follows and whether a part counts are worked out by Valence from these values and from the model's parameters. The activation energy the model runs on is Valence's own figure, and so is the small scatter in each time. The hints and the feedback are written by Valence."
