import { candidatesOf, PART_IDS, solutesOf, type FreezingData, type PartId } from '@/chem-data/freezing/data'
import { formatKilograms, formatSig3, formatTemperature, kindOf, type Blocked, type BenchView, type CupView, type Expected, type Field, type FreezingModel, type GraphView, type Ice, type Mode, type PartView, type Reason, type RunOutcome, type Slip, type Value, type Verdict, type Warning } from '@/engine/freezing'

// Every sentence the freezing point depression lab says that is chemistry, keyed by the engine's identifiers, so
// that an identifier with no sentence does not compile. A sentence can say only what it is handed: the lab's
// record and what the engine's views hold, which is never which liquid the unknown is, how far the probe is off,
// a reading not yet taken, whether the cup has levelled, or the figure a result is held to, until a run that
// counts allows it. The notes shown when a part is done are in the record itself, with their sources
// (src/chem-data/freezing/freezing.json); this module words everything else.
//
// Feedback on an entry says that it does not follow, and what kind of slip it looks like where the engine knows
// one, and never the value it should have been.

/** A name as it is said inside a sentence: its first letter small, after any figure it begins with ("2-propanol"). */
const lower = (text: string) => text.replace(/^([\d-]*)(\p{L})/u, (_, figures: string, letter: string) => `${figures}${letter.toLowerCase()}`)
/** A number with a true minus sign in front of it where it is negative. */
const minus = (text: string) => text.replace(/^-/, '−')
const reagentOf = (data: FreezingData, id: string) => data.reagents.find((r) => r.id === id)!

/** A temperature as the logger shows it: "−1.48 °C". */
export const temperatureText = (hundredths: number) => `${minus(formatTemperature(hundredths))} °C`
/** A mass as the balance shows it: "4.12 g". */
export const massText = (cg: number) => `${formatTemperature(cg)} g`
/** A time on the logger, from its first reading: "30 s", "1 min", "1 min 30 s". */
export function timeText(m: FreezingModel, step: number): string {
  const seconds = step * m.stepSeconds
  const [min, s] = [Math.floor(seconds / 60), seconds % 60]
  return min === 0 ? `${s} s` : s === 0 ? `${min} min` : `${min} min ${s} s`
}

/** "Part 2: Molar mass of an unknown". */
export function partTitle(data: FreezingData, part: PartId): string {
  return `Part ${PART_IDS.indexOf(part) + 1}: ${data.parts[PART_IDS.indexOf(part)]!.name}`
}

/** What each part finds, under its title, in both modes. None gives a figure. */
export const PART_AIM: Record<PartId, string> = {
  water: 'What this probe reads in ice and water: its own freezing point of water.',
  unknown: "An unknown liquid's molar mass, and from it which of three liquids it is.",
  particles: 'How many dissolved particles each formula unit gives, for urea and for a salt.',
}

/** The freezing point constant as the bench and the notebook give it: "1.86 °C·kg/mol". */
export const constantText = (data: FreezingData) => `${data.water.freezingPointConstant.published} ${data.water.freezingPointConstant.unit}`

/**
 * The bench in words: what is used, and what the balance reads as each reading is made. The unknown is named for
 * what it looks like and never for what it is. Each line is as true at the end of the run as at its start.
 */
export function benchLines(data: FreezingData, part: PartId, view: { bench: BenchView; cup: CupView }): string[] {
  const { bench, cup } = view
  const lines = ['A foam cup with a lid, a stirrer and a temperature probe. The logger shows the probe to 0.01 °C.', `Ice and ${lower(data.water.name)}, which go in the cup.`]
  if (part === 'water') return lines
  const { unknown } = data.parts[1]
  const solute = part === 'particles' && bench.solute !== null ? reagentOf(data, bench.solute) : null
  if (part === 'unknown') lines.push(`${unknown.name}, ${unknown.appearance}, weighed out: the balance reads ${massText(bench.soluteCg ?? 0)}.`)
  else lines.push(solute === null || bench.soluteCg === null ? 'A solute of your choosing: urea, or one of three salts.' : `${solute.name}, ${solute.appearance}, weighed out: the balance reads ${massText(bench.soluteCg)}.`)
  lines.push('A wire strainer and a second cup. The second cup stands on the balance, which is set to zero with it on.')
  if (bench.solutionCg !== null) lines.push(cup.strained ? `The solution, strained into the second cup: the balance reads ${massText(bench.solutionCg)}.` : `Everything in the cup, weighed without straining: the balance reads ${massText(bench.solutionCg)}.`)
  return lines
}

/** The three liquids the unknown may be, each with its molar mass: "Acetone, CH₃COCH₃: 58.08 g/mol". The bench shows them from the start; which one the unknown is, it does not. */
export const candidateLines = (data: FreezingData): string[] => candidatesOf(data).map((c) => `${c.name}, ${c.formula}: ${c.molarMass.value.toFixed(2)} ${c.molarMass.unit}`)

/** Urea and the three salts of part 3, each with its molar mass. */
export const soluteLines = (data: FreezingData): string[] => solutesOf(data).map((s) => `${s.name}, ${s.formula}: ${s.molarMass.value.toFixed(2)} ${s.molarMass.unit}`)

/** The choices of part 3's solute, and of part 2's liquid, as a page lists them. */
export const soluteChoices = (data: FreezingData) => solutesOf(data).map((s) => ({ value: s.id, label: `${s.name}, ${s.formula}` }))
export const liquidChoices = (data: FreezingData) => candidatesOf(data).map((c) => ({ value: c.id, label: lower(c.name) }))

/**
 * What the notebook is worked from, said again at its head, so that an entry can be worked without going back up
 * to the bench: the balance's readings, the constant, and the table. It holds nothing that the bench does not show.
 */
export function notebookLines(data: FreezingData, part: PartId, view: { bench: BenchView; cup: CupView }): string[] {
  if (part === 'water') return []
  const { bench, cup } = view
  const solute = part === 'unknown' ? lower(data.parts[1].unknown.name) : bench.solute === null ? 'solute' : lower(reagentOf(data, bench.solute).name)
  return [
    ...(bench.soluteCg === null ? [] : [`Mass of the ${solute}: ${massText(bench.soluteCg)}.`]),
    ...(bench.solutionCg === null ? [] : [`${cup.strained ? 'Mass of the solution' : 'Mass of everything in the cup, not strained'}: ${massText(bench.solutionCg)}.`]),
    `Freezing point constant of water: ${constantText(data)}.`,
    part === 'unknown' ? `Molar masses: ${candidateLines(data).join('; ')}.` : bench.solute === null ? `Molar masses: ${soluteLines(data).join('; ')}.` : `Molar mass: ${soluteLines(data)[solutesOf(data).findIndex((s) => s.id === bench.solute)]}.`,
  ]
}

/** Over the tiles of the liquids: all three until the unknown is named, and then the one it was. */
export function hazardsHeading(data: FreezingData, liquidId: string | null): string {
  return liquidId === null ? 'The unknown may be any of these three, so treat it as all of them' : `The unknown was ${lower(reagentOf(data, liquidId).name)}`
}

export const BENCH_TEXT = {
  bench: 'The bench',
  cup: 'The cup',
  graph: 'The graph',
  straining: 'Straining and weighing',
  notebook: 'The notebook',
  candidates: 'The three liquids the unknown may be',
  solutes: 'What part 3 can dissolve',
  constant: 'Freezing point constant of water',
  /** Over the bench's lines at the head of the notebook. */
  fromBench: 'From the bench',
  fill: 'Put in the ice and water',
  lid: 'Put the lid on',
  stir: 'Start the stirrer',
  logger: 'Start the logger',
  /** Part 3: over the choice of solute. */
  choose: 'What to dissolve in this run',
  runOn: 'Run on',
  /** Under Run on: what one press does. */
  runOnHelp: (m: FreezingModel) => `Lets ${(m.runOnSteps * m.stepSeconds) / 60 === 1 ? 'a minute' : `${m.runOnSteps * m.stepSeconds} seconds`} pass: ${m.runOnSteps === 2 ? 'two' : m.runOnSteps} more readings.`,
  strain: 'Pour the cup through the strainer',
  weigh: 'Weigh the solution',
  check: 'Check the notebook',
  runAgain: 'Run this part again',
  /** Beside Run this part again. */
  runAgainHelp: 'Sets the part up afresh, with new numbers. The run so far is kept in the record.',
  /** Part 3, beside Run this part again once a run counts: the other solutes. */
  runAgainOther: 'Run it again to try another solute. Each run you make is kept in the record.',
  /** Beside the graph once the logger is started: what to do with it. */
  explore: 'Point at a point of the graph, or tap it or move to it with the keyboard, to look at it.',
  hint: 'The relation this entry uses',
  notes: 'Notes on this part',
  working: 'How each molar mass in the table was worked out',
  /** In the cup's card where the logger is full and the cup cannot be finished: with no solute in, or none since. */
  spent: 'The logger has taken all the readings it can hold. Run this part again.',
  done: 'Part done.',
  complete: 'The lab is complete: all three parts are done. Part 3 stays open, so the other salts can still be tried.',
} as const

/** The one action that puts the solute in, by part; part 1 has none. */
export function addLabel(data: FreezingData, part: PartId, bench: BenchView): string {
  if (part === 'unknown') return `Add the ${lower(data.parts[1].unknown.name)}`
  return bench.solute === null ? 'Add the solute' : `Add the ${lower(reagentOf(data, bench.solute).name)}`
}

const ICE_TEXT: Record<Ice, string> = {
  'not-yet': '',
  plenty: 'There is plenty of ice.',
  little: 'Only a little ice is left.',
  none: 'No ice is left.',
}

/** The cup in words (spec 23.6): what is in it, how much ice is seen, the lid, the stirrer and the logger, and what has been done with it since. `readings` is how many readings the logger has taken. */
export function cupText(data: FreezingData, part: PartId, view: { bench: BenchView; cup: CupView }, readings: number): string {
  const { cup, bench } = view
  if (!cup.filled) return 'The cup is empty. The lid is off and the stirrer is still.'
  const solute = part === 'unknown' ? lower(data.parts[1].unknown.name) : bench.solute === null ? 'solute' : lower(reagentOf(data, bench.solute).name)
  const logger = readings === 0 ? 'The logger is not started.' : `The logger has taken ${readings} ${readings === 1 ? 'reading' : 'readings'}.`
  if (cup.strained) return `The cup has been poured through the strainer. ${cup.ice === 'none' ? 'The strainer held back no ice: none was left.' : 'The strainer holds the ice, and the solution is in the second cup.'} ${cup.weighed ? 'The solution has been weighed.' : 'The solution has not been weighed yet.'} ${logger}`
  const contents = cup.soluteAdded ? `Ice, water and the ${solute} are in the cup.` : 'Ice and water are in the cup.'
  const weighed = cup.weighed ? ' The cup has been weighed with the ice in it.' : ''
  return `${contents} ${ICE_TEXT[cup.ice]} The lid is ${cup.lidOn ? 'on' : 'off'}. The stirrer is ${cup.stirring ? 'going' : 'still'}. ${logger}${weighed}`
}

/** The callout of a point that is looked at, and the same words for a screen reader: "1 min 30 s: −0.16 °C". */
export const pointCallout = (m: FreezingModel, step: number, hundredths: number) => `${timeText(m, step)}: ${temperatureText(hundredths)}`

/** The name of a point's button: what looking at it does, and whether it has been looked at. */
export const pointLabel = (m: FreezingModel, step: number, looked: boolean) => `Look at the reading at ${timeText(m, step)}${looked ? ', looked at' : ''}`

/** What the last three readings did, as they are seen: the same, or a fall or a rise of so much. */
function lately(readings: readonly number[]): string {
  if (readings.length < 3) return ''
  const [first, , last] = readings.slice(-3) as [number, number, number]
  if (new Set(readings.slice(-3)).size === 1) return ' The last three readings are the same.'
  if (last === first) return ' The last three readings are not all the same.'
  return ` Over the last three readings it ${last < first ? 'fell' : 'rose'} by ${formatTemperature(Math.abs(last - first))} °C.`
}

/**
 * The graph in words (spec 23.6): what the logger has drawn so far and nothing of what it will draw. It names the
 * readings the notebook's temperatures are taken from, so a page keeps it behind a closed disclosure.
 */
export function describeGraph(m: FreezingModel, graph: GraphView): string {
  const { readings, addedAt, endedAt } = graph
  if (readings.length === 0) return 'The logger has not been started, so there is no graph yet.'
  const at = (step: number) => `${temperatureText(readings[step]!)} at ${timeText(m, step)}`
  const last = readings.length - 1
  const start = `The graph has ${readings.length} ${readings.length === 1 ? 'reading' : 'readings'}, one every ${m.stepSeconds} seconds. It starts at ${at(0)}.`
  if (last === 0) return start
  if (addedAt === null) return `${start} The latest reading is ${at(last)}.${lately(readings)}`
  const before = ` The solute went in after the reading of ${at(addedAt)}.`
  if (last === addedAt) return `${start}${before} There is no reading since.`
  const since = readings.slice(addedAt + 1)
  const lowest = Math.min(...since)
  const low = ` The lowest reading since is ${at(addedAt + 1 + since.indexOf(lowest))}.`
  const end = endedAt === null ? ` The latest reading is ${at(last)}.` : ` The last reading, when the cup was strained or weighed, is ${at(endedAt)}.`
  return `${start}${before}${low}${end}${lately(since)}`
}

/** The label of an entry of the notebook, with its unit. */
export function fieldLabel(part: PartId, field: Field): string {
  switch (field) {
    case 'water':
      return part === 'water' ? 'Steady temperature of ice and water, in °C' : 'Temperature of ice and water, just before the solute went in, in °C'
    case 'solution':
      return 'Temperature of the solution, at the last reading, in °C'
    case 'fall':
      return 'Fall in the freezing point, in °C'
    case 'waterKg':
      return 'Mass of water in the solution, in kg'
    case 'molality':
      return 'Molality of the solution, in mol/kg'
    case 'moles':
      return part === 'unknown' ? 'Moles of the unknown, in mol' : 'Moles of the solute, in mol'
    case 'molarMass':
      return 'Molar mass of the unknown, in g/mol'
    case 'liquid':
      return 'Which liquid the unknown is'
    case 'idealFall':
      return 'Fall if each formula unit were one particle, in °C'
    case 'ratio':
      return 'Particles for each formula unit: the fall found over that fall'
  }
}

/** A choice as it is said: the liquid's name. */
export const valueText = (data: FreezingData, value: string) => lower(reagentOf(data, value)?.name ?? value)

/** A typed entry as its field shows it and the parsers read it back: the number alone, with a true minus sign. */
export function entryText(field: Field, value: Exclude<Value, string>): string {
  if (typeof value !== 'number') return minus(formatSig3(value))
  return kindOf(field) === 'kilograms' ? formatKilograms(value) : minus(formatTemperature(value))
}

/** An entry beside its label, in the notebook once it is made and in the record: a number alone, or a choice in words. */
export const enteredText = (data: FreezingData, field: Field, value: Value) => (typeof value === 'string' ? valueText(data, value) : entryText(field, value))

/** Under an entry's field: how it is written. No example is a number a run can have. */
export function formatHelp(field: Field): string {
  if (field === 'fall') return 'A size, to a hundredth of a degree: like 3.25.'
  switch (kindOf(field)) {
    case 'temperature':
      return 'To a hundredth of a degree, as the logger shows it, with a minus sign where it is below zero: like 0.50 or −3.25.'
    case 'kilograms':
      return 'In kilograms, with five decimal places: every figure the balance gave. Like 0.07536.'
    case 'figures':
      return 'To three significant figures: like 0.0875 or 50.0.'
    case 'choice':
      return 'Choose one of the three.'
  }
}

/** The relation an entry uses, for Guided's closed hint: in words, with the constant the bench gives and no number of the run. */
export function relationText(data: FreezingData, part: PartId, field: Field): string {
  switch (field) {
    case 'water':
      return part === 'water' ? 'Look at the graph. When three readings running are the same, the cup has levelled off: take the latest reading.' : 'The level reading just before the solute went in.'
    case 'solution':
      return 'The last reading of the logger, taken just before the cup was strained.'
    case 'fall':
      return 'The first temperature minus the second.'
    case 'waterKg':
      return 'The mass of the solution minus the mass of the solute, in grams; then divide by 1000 for kilograms.'
    case 'molality':
      return part === 'unknown' ? `The fall divided by ${constantText(data)}, the freezing point constant of water.` : 'The moles of solute divided by the kilograms of water.'
    case 'moles':
      return part === 'unknown' ? 'The molality times the kilograms of water.' : 'The grams of solute divided by its molar mass, from the table.'
    case 'molarMass':
      return 'The grams of the unknown divided by its moles.'
    case 'liquid':
      return 'The liquid in the table whose molar mass is nearest yours.'
    case 'idealFall':
      return `${constantText(data)} times the molality.`
    case 'ratio':
      return 'The fall you found divided by the fall one particle would give.'
  }
}

const SLIP_TEXT: Record<Slip, string> = {
  'cut-off': 'This looks cut off after its third figure. Round it instead.',
  'wrong-sign': 'The sign is wrong. A fall may have a minus sign; the numbers worked from it have none.',
  'upside-down': 'This looks worked the wrong way up. Swap what is divided by what.',
  'solute-not-taken-off': 'This is the mass of the whole solution. Take the mass of the solute from it.',
}

/** What is said of an entry that has been judged: that it follows, or that it does not, with the kind of slip where the engine knows one. Never the value. */
export function entryFeedback(field: Field, verdict: Verdict): string {
  if (verdict.follows) return 'Follows.'
  if (verdict.slip !== null) return SLIP_TEXT[verdict.slip]
  if (field === 'water' || field === 'solution') return 'This is not the reading the logger shows there.'
  return field === 'liquid' ? 'This is not the liquid whose molar mass is nearest yours.' : 'This does not follow from your entries above.'
}

export const VERDICT_TEXT = { follows: 'Follows', not: 'Does not follow' } as const

/** Why an action cannot be done now, or an entry cannot be made: what is missing, in a sentence. `field` is the entry it is about, where it is about one. */
export function blockedText(part: PartId, blocked: Blocked, field?: Field): string {
  switch (blocked) {
    case 'lab-completed':
      return 'The lab is complete. This part is read and not worked now.'
    case 'unknown-part':
      return 'There is no such part.'
    case 'already-done':
      return 'This is already done.'
    case 'cup-empty':
      return 'Put the ice and water in the cup first.'
    case 'logger-not-started':
      return 'Start the logger first.'
    case 'no-solute-chosen':
      return 'Choose what to dissolve first.'
    case 'unknown-solute':
      return 'That is not on this bench.'
    case 'solute-in':
      return 'The solute is already in the cup. To try another, run the part again.'
    case 'solute-not-added':
      return 'Add the solute first.'
    case 'no-reading-since':
      return 'The logger has taken no reading since the solute went in. Run on first.'
    case 'logger-full':
      return 'The logger has taken all the readings it can hold.'
    case 'cup-strained':
      return 'The cup has been strained: the logger takes no more readings of it.'
    case 'cup-weighed':
      return 'The solution has been weighed. The cup is finished: go on to the notebook.'
    case 'worksheet-begun':
      return 'The notebook has an entry, so the cup is left as it is.'
    case 'run-over':
      return 'This run has been checked. Run the part again for a new one.'
    case 'nothing-there':
      return 'The logger has no reading there.'
    case 'not-weighed':
      return 'The notebook opens once the solution has been weighed.'
    case 'not-looked':
      if (field === 'solution') return 'Look at the last reading on the graph first.'
      return part === 'water' ? 'Look at the latest reading on the graph first.' : 'Look at the level reading just before the solute went in, on the graph, first.'
    case 'not-this-part':
      return 'This part has no such step.'
    case 'entry-above-missing':
      return 'Make the entry above this one first.'
    case 'invalid-entry':
      return field === undefined ? 'That is not written as this entry is.' : formatHelp(field)
    case 'worksheet-not-full':
      return 'Make every entry first.'
    case 'nothing-to-repeat':
      return 'This run has not been begun.'
    case 'not-the-logger':
      if (field === 'solution') return 'This is not the last reading the logger shows. Take the reading at the end of the level stretch, just before the cup was strained.'
      return part === 'water' ? 'This is not the latest reading the logger shows.' : 'This is not the reading the logger shows just before the solute went in.'
    case 'does-not-follow':
      return entryFeedback(field ?? 'fall', { follows: false, slip: null })
    default:
      return SLIP_TEXT[blocked]
  }
}

/** Guided's warnings (spec 23.2): what is about to go wrong, in a title and a sentence or two. */
export const WARNING_TEXT: Record<Warning, { title: string; body: string }> = {
  'lid-off': { title: 'The lid is off', body: 'With the lid off the ice melts fast. Once a solute is in, the solution keeps getting weaker and its temperature never levels off; soon no ice is left.' },
  'not-stirring': { title: 'The stirrer is still', body: 'Without stirring the cup does not settle: the temperature will not level off, and no reading will be a freezing point.' },
  'not-level': { title: 'The temperature has not levelled off', body: 'A reading taken now is not a freezing point, and the run will not count. Wait for three readings running that are the same.' },
  'little-ice': { title: 'Only a little ice is left', body: 'If it all melts, the temperature climbs and no reading is a freezing point. Finish this run now, or run the part again.' },
  'no-ice': { title: 'No ice is left', body: 'With no ice in the cup the temperature is not a freezing point. This run will not count: run the part again.' },
  'not-strained': { title: 'The cup has not been strained', body: 'Weighed now, the ice is counted as water and the run will not count. Pour the cup through the strainer first.' },
}

/** The two ways out of a warning. */
export const WARNING_BUTTONS = { back: 'Go back', on: 'Go on anyway' } as const

const REASON_TEXT: Record<Reason, (part: PartId) => string> = {
  'water-not-level': (part) => (part === 'water' ? 'The reading was taken before the ice and water had levelled off, so it is not the freezing point of water.' : 'The solute went in before the ice and water had levelled off, so the first temperature is not the freezing point of water.'),
  'solution-not-level': () => 'The temperature was still changing at the last reading, so the second temperature is not the freezing point of what was weighed.',
  'ice-melted': () => 'All the ice had melted, so the temperature read was not a freezing point.',
  'not-strained': () => 'The cup was weighed without straining, so the ice was counted as water.',
  'water-not-shown': (part) => (part === 'water' ? 'The temperature entered is not the reading the logger shows.' : 'The first temperature is not the reading the logger shows.'),
  'solution-not-shown': () => 'The second temperature is not the reading the logger shows.',
  'entries-do-not-follow': () => 'An entry does not follow from the ones above it: see the marks in the notebook.',
  'outside-tolerance': () => 'The result is too far from the figure the lab holds.',
}

/** Why a run does not count, one cause in a sentence. */
export const reasonText = (part: PartId, reason: Reason) => REASON_TEXT[reason](part)

const offText = (percentOff: number) => (Math.abs(percentOff) < 0.05 ? 'the same as the figure the lab holds, to a tenth of a percent' : `${Math.abs(percentOff).toFixed(1)}% ${percentOff < 0 ? 'under' : 'over'} the figure the lab holds`)

/** How a run came out. `again` is false where the part cannot be run again, so the sentence does not say to. */
export function outcomeText(part: PartId, outcome: RunOutcome, again = true): string {
  if (outcome.state === 'open') return 'The notebook has not been checked yet.'
  if (outcome.state === 'counts') return outcome.percentOff === null ? 'This run counts.' : `This run counts. Your result is ${offText(outcome.percentOff)}.`
  const off = outcome.percentOff === null ? '' : ` Your result was ${offText(outcome.percentOff)}.`
  return `This run does not count. ${outcome.reasons.map((reason) => reasonText(part, reason)).join(' ')}${off}${again ? ' Run the part again.' : ''}`
}

/** What a part's result was held to, once the engine hands it over: a sentence for each figure. */
export function expectedText(data: FreezingData, expected: Expected): string[] {
  if (expected.kind === 'probe') {
    const off = Math.abs(expected.hundredths)
    return [`In ice and water this probe reads ${temperatureText(expected.hundredths)}${off === 0 ? ': it reads true.' : `: it reads ${formatTemperature(off)} °C ${expected.hundredths > 0 ? 'high' : 'low'}.`}`]
  }
  if (expected.kind === 'liquid') return [`The unknown was ${lower(reagentOf(data, expected.liquidId).name)}, whose molar mass is ${expected.molarMass.toFixed(2)} g/mol.`]
  return expected.counted.map(({ soluteId, particles }) => {
    const reagent = reagentOf(data, soluteId)
    return `${reagent.name}: the lab holds ${particles === Math.round(particles) ? particles : particles.toFixed(2)} ${particles === 1 ? 'particle' : 'particles'} for each formula unit. ${reagent.particles.note}`
  })
}

/** The notes of a part, shown with what its result was held to once the part is done. */
export const partNotes = (data: FreezingData, part: PartId): string[] => data.parts[PART_IDS.indexOf(part)]!.notes.map((note) => note.value)

/** Part 3: what it still wants, from the part's view. */
export function wantedText(wanted: { molecule: boolean; salt: boolean }): string {
  if (wanted.molecule && wanted.salt) return 'This part needs two runs that count: one with urea and one with a salt of your choosing.'
  if (wanted.salt) return 'A run with urea counts. Now make one with a salt of your choosing.'
  if (wanted.molecule) return 'A run with a salt counts. Now make one with urea.'
  return 'A run with urea counts, and a run with a salt. The other solutes are still here to try.'
}

export const MODE_TEXT: Record<Mode, string> = {
  guided: 'Guided: the lab warns you before an error of technique is made, checks each entry of the notebook as you make it, and has the relation each entry uses ready to open.',
  challenge: 'Challenge: no warning and no hints. The notebook takes whatever you type and is checked all together when you ask. A run that does not count is run again, with new numbers.',
}

/** How far a part has come, in the list of parts and on its page, beside a mark that says the same. */
export type Progress = 'not-started' | 'cup' | 'worksheet' | 'not-counted' | 'half' | 'done'
export function progressOf(view: Pick<PartView, 'cup' | 'outcome' | 'done' | 'wanted'>): Progress {
  if (view.done) return 'done'
  if (view.outcome.state === 'does-not-count') return 'not-counted'
  if (view.cup.worksheetBegun) return 'worksheet'
  if (view.cup.filled) return 'cup'
  return view.wanted !== null && view.wanted.molecule !== view.wanted.salt ? 'half' : 'not-started'
}
export const PROGRESS_TEXT: Record<Progress, string> = {
  'not-started': 'Not started',
  cup: 'Cup under way',
  worksheet: 'Notebook under way',
  'not-counted': 'Run did not count',
  half: 'One of its two runs counts',
  done: 'Done',
}

/**
 * What the page itself says and no part of the lab's chemistry: the names of its list, its pictures and their
 * marks, and its buttons. None of it says anything of a run.
 */
export const PAGE_TEXT = {
  list: 'Parts',
  previous: (title: string) => `Previous: ${title}`,
  next: (title: string) => `Next: ${title}`,
  cupPicture: 'The foam cup, cut away, with its lid, stirrer and probe',
  graphPicture: "The logger's graph: temperature up the side against time along the bottom",
  /** The two axes of the graph, beside them. */
  temperatureAxis: 'Temperature, in °C',
  timeAxis: 'Time since the first reading, in minutes',
  /** The key under the graph: what a filled point, an open one and the two dashed lines are. */
  lookedAt: 'looked at',
  notLookedAt: 'not looked at yet',
  soluteMark: 'the solute went in here',
  endMark: 'the cup was strained or weighed here',
  /** After the sentence that says how the graph is looked at: the keys that move along it. */
  arrows: 'With the keyboard, the left and right arrow keys move from one reading to the next.',
  /** The two buttons under the graph, a finger's size each: one reading back, and one on. */
  earlier: 'Earlier reading',
  later: 'Later reading',
  /** The closed disclosures that hold the cup and the graph described in words. */
  cupInWords: 'The cup in words',
  inWords: 'The graph in words',
  /** The button of an entry of the notebook, and the two of a change under way. */
  enter: 'Enter',
  change: 'Change',
  cancel: 'Cancel',
  /** Under the notebook while an entry that has others under it can be changed. */
  changeNote: 'Changing an entry empties the entries under it.',
  /** The card that says how the run came out. */
  outcome: 'This run',
  held: 'What the result was held to',
} as const

/** The Record tab. */
export const RECORD_TEXT = {
  region: 'Record of the three parts',
  caption: 'Every run of each part, with what was entered and whether it counted',
  part: 'Part',
  run: (number: number) => `Run ${number}`,
  solute: 'Dissolved',
  result: 'Result',
  open: 'Not checked yet',
  counts: 'Counts',
  doesNotCount: 'Does not count',
} as const

/** Under a part's sources: what is Valence's own. */
export const SOURCES_TEXT = "The readings the logger draws, how fast the cup settles and the ice melts, whether an entry follows and whether a run counts are worked out by Valence from these values and from the model's parameters, which are Valence's own. The hints and the feedback are written by Valence."
