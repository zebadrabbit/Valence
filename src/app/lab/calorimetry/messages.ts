import { candidatesOf, PART_IDS, type CalorimetryData, type PartId } from '@/chem-data/calorimetry/data'
import { formatSig3, type Blocked, type BenchView, type CalorimetryModel, type CupView, type Expected, type Field, type GraphView, type Mode, type PartView, type Reason, type RunOutcome, type Slip, type Value, type Verdict, type Warning } from '@/engine/calorimetry'

// Every sentence the calorimetry lab says that is chemistry, keyed by the engine's identifiers, so that an
// identifier with no sentence does not compile. A sentence can say only what it is handed: the lab's record and
// what the engine's views hold, which is never the metal, a reading not yet taken, or the figure a result is held
// to, until a run of the part counts. The notes shown when a part is done are in the record itself, with their
// sources (src/chem-data/calorimetry/calorimetry.json); this module words everything else.
//
// Feedback on an entry says that it does not follow, and what kind of slip it looks like where the engine knows
// one, and never the value it should have been.

const listed = (items: readonly string[]) => (items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`)
const lower = (text: string) => `${text[0]!.toLowerCase()}${text.slice(1)}`
/** A number with a true minus sign in front of it where it is negative. */
const minus = (text: string) => text.replace(/^-/, '−')

/** A temperature as the logger shows it: "28.4 °C". */
export const temperatureText = (tenths: number) => `${minus((tenths / 10).toFixed(1))} °C`
/** A mass as the balance shows it: "4.03 g". */
export const massText = (cg: number) => `${(cg / 100).toFixed(2)} g`
/** A time on the logger, from its first reading: "45 s", "1 min", "1 min 15 s". */
export function timeText(m: CalorimetryModel, step: number): string {
  const seconds = step * m.stepSeconds
  const [min, s] = [Math.floor(seconds / 60), seconds % 60]
  return min === 0 ? `${s} s` : s === 0 ? `${min} min` : `${min} min ${s} s`
}

/** "Part 1: Neutralisation". */
export function partTitle(data: CalorimetryData, part: PartId): string {
  return `Part ${PART_IDS.indexOf(part) + 1}: ${data.parts[PART_IDS.indexOf(part)]!.name}`
}

/** What each part finds, under its title. */
export const PART_AIM: Record<PartId, string> = {
  neutralisation: 'The heat given out for each mole of water formed when an acid and a base are mixed.',
  dissolving: 'The heat taken in for each mole of ammonium nitrate that dissolves in water.',
  metal: 'The specific heat of an unknown metal, and from it which metal it is.',
}

const reagentOf = (data: CalorimetryData, id: string) => data.reagents.find((r) => r.id === id)!
/** "Hydrochloric acid, 1.00 M" as it is said inside a sentence: "hydrochloric acid, 1.00 M". */
const named = (data: CalorimetryData, id: string) => lower(reagentOf(data, id).name)
const measured = (data: CalorimetryData, part: PartId, reagentId: string) => {
  const amount = data.parts[PART_IDS.indexOf(part)]!.amounts.find((a) => a.reagentId === reagentId)
  return amount && 'shown' in amount ? `${amount.shown} ${amount.unit}` : ''
}

/**
 * The bench in words: what is used, and what the balance and the bath's thermometer read. The piece of part 3 is
 * named for what it looks like and never for what it is.
 */
export function benchLines(data: CalorimetryData, part: PartId, bench: BenchView): string[] {
  const water = `${measured(data, part, 'water')} of ${lower(data.water.name)}, in the cup.`
  if (part === 'neutralisation') return [`${measured(data, part, 'hcl-1m')} of ${named(data, 'hcl-1m')}, in the cup.`, `${measured(data, part, 'naoh-1m')} of ${named(data, 'naoh-1m')}, ready to pour in.`]
  const salt = reagentOf(data, 'nh4no3-solid')
  if (part === 'dissolving') return [water, `${salt.name}${salt.form === 'solid' ? `, ${salt.appearance.value}` : ''}, weighed out: the balance reads ${massText(bench.balanceCg ?? 0)}.`]
  return [water, `${data.parts[2].unknown.name}, ${data.parts[2].unknown.appearance}: the balance reads ${massText(bench.balanceCg ?? 0)}.`, `The piece is in boiling water, and the thermometer in that water reads ${temperatureText(bench.bathTenths ?? 0)}.`]
}

/** The four metals the piece may be, each with its specific heat: "Aluminium: 0.902 J/(g·°C)". The bench shows them from the start; which one the piece is, it does not. */
export const candidateLines = (data: CalorimetryData): string[] => candidatesOf(data).map((c) => `${c.name}: ${c.specificHeat.value.toFixed(3)} ${c.specificHeat.unit}`)

/** Over the four metals' tiles while the piece is unknown, and over the one tile once it is known. */
export function metalHazardsHeading(data: CalorimetryData, metalId: string | null): string {
  if (metalId !== null) return `The piece was ${lower(reagentOf(data, metalId).name)}: its hazards`
  return `The piece is one of ${listed(candidatesOf(data).map((c) => lower(c.name)))}. Until part 3 is done, the hazards of all four are shown.`
}

/** The cards of a part, its buttons, and what is said beside them. */
export const BENCH_TEXT = {
  bench: 'The bench',
  cup: 'The cup',
  graph: 'The graph',
  notebook: 'The notebook',
  candidates: 'The four metals the piece may be',
  lid: 'Put the lid on',
  stir: 'Stir',
  logger: 'Start the logger',
  runOn: 'Run on',
  /** Under Run on: what one press does. */
  runOnHelp: (m: CalorimetryModel) => `Lets ${m.runOnSteps * m.stepSeconds} seconds pass: ${m.runOnSteps === 2 ? 'two' : m.runOnSteps} more readings.`,
  check: 'Check the worksheet',
  runAgain: 'Run this part again',
  /** Beside Run this part again. */
  runAgainHelp: 'Sets the part up afresh, with new numbers. The run so far is kept in the record.',
  /** Beside the graph once the logger is started: what to do with it. */
  explore: 'Point at a point of the graph, or tap it or move to it with the keyboard, to look at it.',
  hint: 'The relation this entry uses',
  notes: 'Notes on this part',
  working: 'How the figure in the table was worked out',
  done: 'Part done: one run of it counts.',
  complete: 'The lab is complete: a run of each of the three parts counts.',
} as const

/** The one action that starts the change in each part (spec 16.2). */
export const CHANGE_LABEL: Record<PartId, string> = {
  neutralisation: 'Pour in the sodium hydroxide solution',
  dissolving: 'Add the ammonium nitrate',
  metal: 'Add the hot metal',
}

const CONTENTS: Record<PartId, [before: string, after: string]> = {
  neutralisation: ['The cup holds the hydrochloric acid. The sodium hydroxide solution has not been poured in.', 'Both solutions are in the cup.'],
  dissolving: ['The cup holds the water. The ammonium nitrate has not been added.', 'The ammonium nitrate is in the water.'],
  metal: ['The cup holds the water. The piece of metal is heating in the boiling water.', 'The piece of metal is in the cup.'],
}

/** The cup's state in words (spec 16.6): what is in it, the lid, the stirrer and the logger. It says what was done and never what the temperature will do. */
export function cupText(part: PartId, cup: CupView, readings: number): string {
  const logger = !cup.loggerStarted ? 'The logger has not been started.' : `The logger is running: ${readings === 1 ? 'one reading' : `${readings} readings`} so far.`
  return [CONTENTS[part][cup.changeStarted ? 1 : 0], cup.lidOn ? 'The lid is on.' : 'The lid is off.', cup.stirring ? 'The stirrer is going.' : 'The stirrer is still.', logger].join(' ')
}

/** What a look at a point of the graph says: its time and its temperature, "45 s: 28.4 °C". */
export const pointCallout = (m: CalorimetryModel, step: number, tenths: number) => `${timeText(m, step)}: ${temperatureText(tenths)}`

/** A point of the graph as the list beside it and its button name it, before and after it is looked at. */
export const pointLabel = (m: CalorimetryModel, step: number, looked: boolean) => `Look at the reading at ${timeText(m, step)}${looked ? ', looked at' : ''}`

/**
 * The graph described in words (spec 16.6): where it starts, when the change begins, where it peaks or bottoms,
 * and that it drifts back. It says what the logger has drawn so far and nothing of what it will draw.
 */
export function describeGraph(m: CalorimetryModel, graph: GraphView): string {
  const { readings, changedAt, extreme } = graph
  if (readings.length === 0) return 'The logger has not been started, and the graph is empty.'
  const axes = 'Temperature in degrees Celsius is up the side and time along the bottom, with a point for each reading.'
  const last = readings.length - 1
  const level = `The readings are level at ${temperatureText(readings[0]!)}`
  if (changedAt === null) return `${axes} ${readings.length === 1 ? `There is one reading: ${temperatureText(readings[0]!)} at ${timeText(m, 0)}` : `${level}, from ${timeText(m, 0)} to ${timeText(m, last)}`}. The change has not been started.`
  const start = `${level} until the change is started, just after the reading at ${timeText(m, changedAt)}.`
  if (last === changedAt) return `${axes} ${start} No reading has been taken since.`
  if (extreme === null) return `${axes} ${start} The readings since are still at ${temperatureText(readings[last]!)}.`
  const up = extreme.tenths > readings[changedAt]!
  if (!graph.turned) {
    const flat = last > extreme.step ? `, and are level there up to the latest reading, at ${timeText(m, last)}` : ', the latest reading'
    return `${axes} ${start} They then ${up ? 'rise' : 'fall'}, to ${temperatureText(extreme.tenths)} at ${timeText(m, extreme.step)}${flat}. The curve has not turned back yet.`
  }
  return `${axes} ${start} They then ${up ? 'rise to a highest' : 'fall to a lowest'} reading of ${temperatureText(extreme.tenths)}, first reached at ${timeText(m, extreme.step)}, and after it drift slowly back: the latest reading, at ${timeText(m, last)}, is ${temperatureText(readings[last]!)}.`
}

/** The second entry's name, from what the graph has shown: the highest reading where the cup warmed, the lowest where it cooled. */
const extremeName = (graph: GraphView | null) => (graph?.extreme && graph.changedAt !== null ? (graph.extreme.tenths > graph.readings[graph.changedAt]! ? 'Highest' : 'Lowest') : 'Highest or lowest')

/** The worksheet's labels, with units. `graph` settles whether the second entry is the highest or the lowest. */
export function fieldLabel(part: PartId, field: Field, graph: GraphView | null = null): string {
  switch (field) {
    case 'start':
      return 'Starting temperature, in °C'
    case 'extreme':
      return `${extremeName(graph)} temperature reached, in °C`
    case 'change':
      return part === 'metal' ? "Change in the water's temperature, in °C" : 'Change in temperature, in °C'
    case 'heat':
      return part === 'metal' ? 'Heat the water took in, in J' : "Heat the cup's contents took in or gave out, in J"
    case 'direction':
      return part === 'neutralisation' ? 'The reaction' : 'The dissolving'
    case 'moles':
      return part === 'neutralisation' ? 'Moles of water formed, in mol' : 'Moles of ammonium nitrate dissolved, in mol'
    case 'perMole':
      return 'Heat for each mole, in kJ/mol, with its sign'
    case 'specificHeat':
      return 'Specific heat of the metal, in J/(g·°C)'
    case 'metal':
      return 'The metal is'
  }
}

/** The two choices of which way the heat went. */
export const DIRECTION_LABEL = { out: 'gave heat out', in: 'took heat in' } as const

/** The choices of which metal the piece is, each with its label. */
export const metalChoices = (data: CalorimetryData) => candidatesOf(data).map((c) => ({ value: c.id, label: lower(c.name) }))

/** An entry as it is shown once made: a temperature with its unit, a number as it was typed, a choice in words. */
export function valueText(data: CalorimetryData, field: Field, value: Value): string {
  if (typeof value === 'number') return temperatureText(value)
  if (typeof value === 'string') return field === 'direction' ? DIRECTION_LABEL[value as keyof typeof DIRECTION_LABEL] : lower(reagentOf(data, value).name)
  const unit = { heat: 'J', moles: 'mol', perMole: 'kJ/mol', specificHeat: 'J/(g·°C)' }[field as 'heat' | 'moles' | 'perMole' | 'specificHeat']
  return `${minus(formatSig3(value))} ${unit}`
}

/** How each kind of entry is typed, under its field. No example is a figure any run can have. */
export function formatHelp(field: Field): string {
  if (field === 'direction' || field === 'metal') return 'Choose one.'
  if (field === 'start' || field === 'extreme') return 'One decimal place, as the logger shows it: 18.6'
  if (field === 'change') return 'One decimal place: 3.5'
  if (field === 'perMole') return 'Three significant figures, with a minus sign where heat was given out: −12.3 or 45.6'
  return 'Three significant figures, rounded: 1230, 45.6 or 0.0789'
}

/** The relation behind each entry, for Guided's closed hint (spec 16.2). It says how the entry is worked and gives no figure of the run. */
export function relationText(data: CalorimetryData, part: PartId, field: Field): string {
  const c = `${data.water.specificHeat.value} ${data.water.specificHeat.unit}`
  switch (field) {
    case 'start':
      return 'The temperature the logger shows before the change is started, where the points lie level. Look at one of those points.'
    case 'extreme':
      return 'The reading furthest from the starting temperature after the change is started: the highest point if the cup warmed, the lowest if it cooled. Look at that point.'
    case 'change':
      return 'Change in temperature = highest or lowest temperature − starting temperature. Give its size.'
    case 'heat':
      if (part === 'neutralisation') return `Heat = mass in the cup × ${c} × change in temperature. The two solutions together are ${data.parts[0].amounts.map((a) => ('shown' in a ? a.shown : '')).join(' mL and ')} mL, and each millilitre is taken as 1.00 g.`
      if (part === 'dissolving') return `Heat = mass in the cup × ${c} × change in temperature. The mass is the water and the ammonium nitrate together: the ${measured(data, part, 'water')} of water is taken as that many grams, and the salt's mass is the balance's reading.`
      return `Heat the water took in = mass of the water × ${c} × the rise of the water. The ${measured(data, part, 'water')} of water is taken as that many grams. The piece of metal is not part of this mass.`
    case 'direction':
      return 'If the temperature of the cup rose, heat was given out into it. If it fell, heat was taken in from it.'
    case 'moles': {
      if (part === 'neutralisation') return 'Moles = volume of the acid in litres × its concentration in moles for each litre. The base holds the same amount, and each mole of acid that reacts makes one mole of water.'
      const salt = reagentOf(data, 'nh4no3-solid')
      return `Moles = mass of the ammonium nitrate ÷ its molar mass, which is ${salt.form === 'solid' ? salt.molarMass.published : ''} g/mol.`
    }
    case 'perMole':
      return 'Heat for each mole = heat ÷ moles ÷ 1000, which gives kJ/mol. Put a minus sign in front if heat was given out, and a plus sign or none if it was taken in.'
    case 'specificHeat':
      return "Specific heat = heat the water took in ÷ (mass of the piece × the piece's fall in temperature). The piece fell from the temperature of the boiling water to the highest temperature in the cup."
    case 'metal':
      return 'The metal whose specific heat in the table is nearest to the one you worked out.'
  }
}

const SLIP_TEXT: Record<Slip, (part: PartId, field: Field) => string> = {
  'cut-off': () => 'That looks cut off where it should be rounded. Look at the figure after the third: if it is 5 or more, the third goes up by one.',
  'wrong-sign': (_part, field) =>
    field === 'perMole'
      ? 'The size is right and the sign is not. A change that gave heat out is written with a minus sign; one that took heat in, with a plus sign or none.'
      : field === 'change'
        ? 'The size is right and the sign is not. Give the size alone, or the change with the sign it has: a minus only where the temperature fell.'
        : 'Give this as a size, without a sign.',
  'salt-left-out': () => 'That is the heat of the water alone. The salt is part of the solution that cooled: use the mass of the water and the salt together.',
  'water-change-used': () => "That uses the water's change in temperature for the metal. The piece changed far more: it fell from the temperature of the boiling water to the highest temperature in the cup.",
  'joules-for-kilojoules': () => 'That is in joules for each mole. Divide by 1000 to give kilojoules for each mole.',
}

const NOT_FOLLOWING: Record<Field, string> = {
  start: 'That is not the temperature the logger shows before the change. Look at a point on the level part of the graph, and type its temperature.',
  extreme: 'That is not the highest temperature the logger shows after the change, or the lowest if the cup cooled. Look at the points again, and type the temperature of the one furthest from the start.',
  change: 'That is not the difference between the two temperatures you entered.',
  heat: 'That does not follow from the change in temperature you entered. Open the relation, and check the mass and the specific heat you used.',
  direction: 'That does not fit the two temperatures you entered. Think which way the temperature of the cup went, and where that heat came from or went to.',
  moles: 'That does not follow from what the bench gives. Open the relation, and check the units: millilitres are not litres.',
  perMole: 'That does not follow from the heat and the moles you entered.',
  specificHeat: 'That does not follow from the heat you entered, the mass of the piece and its fall in temperature.',
  metal: 'That is not the metal whose figure in the table is nearest to the specific heat you entered.',
}

/**
 * Feedback on an entry that does not follow: what kind of slip it looks like where the engine knows one, and
 * otherwise that it does not follow from the entries above it. Never the value. Empty for an entry that follows.
 */
export function entryFeedback(part: PartId, field: Field, verdict: Verdict): string {
  if (verdict.follows) return ''
  return verdict.slip ? SLIP_TEXT[verdict.slip](part, field) : NOT_FOLLOWING[field]
}

/** Beside an entry once it is checked. */
export const VERDICT_TEXT = { follows: 'Follows', not: 'Does not follow' } as const

const NOT_LOOKED: Partial<Record<Field, string>> = {
  start: 'Look at a reading before the change was started first.',
  extreme: 'Look at the reading furthest from the start first: the highest point, or the lowest if the cup cooled.',
}

/** Why an action cannot be done now, or why Guided did not take an entry. `field` is the entry it was, where it was one. */
export function blockedText(part: PartId, blocked: Blocked, field?: Field): string {
  switch (blocked) {
    case 'lab-completed':
      return 'The lab is complete. Restart the lab to work the parts again.'
    case 'unknown-part':
      return 'There is no such part.'
    case 'already-done':
      return 'That is already done.'
    case 'logger-not-started':
      return 'Start the logger first.'
    case 'change-not-started':
      return `The worksheet opens once the change has been started and the curve has turned back. ${CHANGE_LABEL[part]} first.`
    case 'logger-full':
      return 'The logger has taken all the readings it can hold. Fill in the worksheet from the graph as it is, or run this part again.'
    case 'worksheet-begun':
      return 'The worksheet is begun, so the cup is left as it is. To work the cup again, run this part again.'
    case 'run-over':
      return 'This run is over: its worksheet has been checked. Run this part again for a new run.'
    case 'nothing-there':
      return 'There is no reading there to look at.'
    case 'not-turned':
      return 'The worksheet opens once the curve has turned back. Run on until the latest reading has come back from the highest or the lowest.'
    case 'not-looked':
      return (field && NOT_LOOKED[field]) ?? 'Look at the graph first.'
    case 'not-this-part':
      return "That entry is not on this part's worksheet."
    case 'entry-above-missing':
      return 'Make the entries above this one first: each is worked from the ones before it.'
    case 'invalid-entry':
      return field === 'direction' || field === 'metal' ? formatHelp(field) : `That is not written as this entry is. ${field ? formatHelp(field) : ''}`.trim()
    case 'worksheet-not-full':
      return 'Make every entry of the worksheet first.'
    case 'nothing-to-repeat':
      return 'This run has not been begun: there is nothing to run again.'
    case 'not-the-logger':
      return NOT_FOLLOWING[field === 'extreme' ? 'extreme' : 'start']
    case 'does-not-follow':
      return field ? NOT_FOLLOWING[field] : 'That does not follow from the entries above it.'
    default:
      return SLIP_TEXT[blocked](part, field ?? 'heat')
  }
}

/** Guided's warning before the change is started with the lid off or the stirrer still (spec 16.2). */
export const WARNING_TEXT: Record<Warning, { title: string; body: string }> = {
  'lid-off': {
    title: 'The lid is off',
    body: 'Most of the heat a cup loses leaves from its open top. With the lid off, the highest or the lowest temperature will be further from the true one, and a run started this way does not count. Put the lid on first.',
  },
  'not-stirring': {
    title: 'The stirrer is still',
    body: 'Without stirring the change is slow, and the probe reads only the liquid beside it. The cup trades heat with the room all the while, and a run started this way does not count. Start the stirrer first.',
  },
}
/** The two buttons of the warning: one way back and one way on. */
export const WARNING_BUTTONS = { back: 'Go back', on: 'Start the change anyway' } as const

const REASON_TEXT: Record<Reason, (m: CalorimetryModel) => string> = {
  'lid-off': () => 'The lid was not on from the moment the change was started, so heat left through the open top while the temperature was still changing.',
  'not-stirred': () => 'The cup was not stirred from the moment the change was started, so the change was slow, and the cup traded heat with the room all the while.',
  'start-not-shown': () => 'The starting temperature entered is not the one the logger shows before the change.',
  'extreme-not-shown': () => 'The highest or lowest temperature entered is not the one the logger shows.',
  'entries-do-not-follow': () => 'An entry of the worksheet does not follow from the ones above it: the worksheet marks which.',
  'outside-tolerance': (m) => `The result is more than ${m.tolerancePercent}% from the figure the lab holds for this part.`,
}

/** One reason a run does not count, as a sentence. */
export const reasonText = (m: CalorimetryModel, reason: Reason) => REASON_TEXT[reason](m)

/** How far a result is from the figure the lab holds: "1.6% under", "0.4% over", "equal to". */
const offText = (percent: number) => (Math.abs(percent) < 0.05 ? 'equal to' : `${Math.abs(percent).toFixed(1)}% ${percent < 0 ? 'under' : 'over'}`)

/**
 * The sentence for a run once its worksheet is checked: that it counts, or that it does not and why (spec 16.2).
 * It gives how far the result was from the stored figure only where the engine hands that over, which is once a
 * run of the part counts. Empty for a run that is still open.
 */
export function outcomeText(m: CalorimetryModel, outcome: RunOutcome): string {
  if (outcome.state === 'open') return ''
  if (outcome.state === 'counts') {
    return `This run counts: its temperatures are the logger's, every entry follows, the lid was on and the cup stirred from the start of the change, and the result is within ${m.tolerancePercent}% of the figure the lab holds. Your result is ${offText(outcome.percentOff)} that figure.`
  }
  const off = outcome.percentOff === null ? '' : ` Its result was ${offText(outcome.percentOff)} the figure the lab holds.`
  return `This run does not count. ${outcome.reasons.map((reason) => reasonText(m, reason)).join(' ')}${off} Run this part again: the lab sets it up with new numbers.`
}

/** What a part's result is held to, said once the engine hands it over: the stored enthalpy, or which metal the piece was. */
export function expectedText(data: CalorimetryData, part: PartId, expected: Expected): string {
  if (expected.kind === 'metal') {
    const metal = candidatesOf(data).find((c) => c.id === expected.metalId)!
    return `The piece was ${lower(metal.name)}, whose specific heat is ${expected.specificHeat.toFixed(3)} ${metal.specificHeat.unit}.`
  }
  const record = data.parts[PART_IDS.indexOf(part)]!
  const per = 'enthalpy' in record ? record.enthalpy.per : 'mole'
  return `The figure the lab holds for this part is ${expected.kilojoulesPerMole < 0 ? '−' : '+'}${Math.abs(expected.kilojoulesPerMole).toPrecision(3)} kJ for each ${per}.`
}

/**
 * What is shown under a part once it is done: the record's notes for it, and for part 3 the working of the
 * piece's own specific heat. `expected` is the engine's, so nothing here can be asked for before a run counts.
 */
export function partNotes(data: CalorimetryData, part: PartId, expected: Expected): string[] {
  const notes = data.parts[PART_IDS.indexOf(part)]!.notes.map((note) => note.value)
  if (expected.kind !== 'metal') return notes
  return [...notes, candidatesOf(data).find((c) => c.id === expected.metalId)!.specificHeat.working]
}

/** What each mode does in this lab (spec 16.2), beside its radio button. */
export const MODE_TEXT: Record<Mode, string> = {
  guided: 'Guided: the lab warns you before the change is started with the lid off or the stirrer still, checks each entry of the worksheet as you make it, and has the relation each entry uses ready to open.',
  challenge: 'Challenge: no warning and no hints. The worksheet takes whatever you type and is checked all together when you ask. A run that does not count is run again, with new numbers.',
}

/** How far a part has come, in the list of parts and on its page, beside a mark that says the same. */
export type Progress = 'not-started' | 'cup' | 'worksheet' | 'not-counted' | 'done'
export function progressOf(view: Pick<PartView, 'cup' | 'outcome' | 'done'>): Progress {
  if (view.done) return 'done'
  if (view.outcome.state === 'does-not-count') return 'not-counted'
  if (view.cup.worksheetBegun) return 'worksheet'
  return view.cup.loggerStarted || view.cup.lidOn || view.cup.stirring ? 'cup' : 'not-started'
}
export const PROGRESS_TEXT: Record<Progress, string> = {
  'not-started': 'Not started',
  cup: 'Cup under way',
  worksheet: 'Worksheet under way',
  'not-counted': 'Run did not count',
  done: 'Done',
}

/** The Record tab. */
export const RECORD_TEXT = {
  region: 'Record of the three parts',
  caption: 'Every run of each part, with what was entered and whether it counted',
  part: 'Part',
  run: (number: number) => `Run ${number}`,
  result: 'Result',
  open: 'Not checked yet',
  counts: 'Counts',
  doesNotCount: 'Does not count',
} as const

/** Under a part's sources: what is Valence's own. */
export const SOURCES_TEXT = "The readings the logger draws, whether an entry follows and whether a run counts are worked out by Valence from these values and from the model's parameters, which are Valence's own. The hints and the feedback are written by Valence."
