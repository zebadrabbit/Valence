import { PART_IDS, reagentOf, thingOf, type CabbageData, type PartId, type ScaleQuestionId, type Thing, type ThingId } from '@/chem-data/cabbage/data'
import { CANNOT_SAY, type BenchView, type Blocked, type Class, type Estimate, type MeterView, type Mode, type Outcome, type Reason, type SampleView, type ScaleQuestionView, type TubeShows, type UnitItem, type UnitQuestionView } from '@/engine/cabbage'

// Every sentence the red cabbage pH lab says, keyed by the engine's identifiers, so that an identifier with no
// sentence does not compile. A sentence can say only what it is handed: the lab's record and what the engine's
// views hold, which is what is seen of a tube now, what the learner has entered, and a reading once the meter has
// been read. A thing's pH, where it is from and what it means are said in one place only: the notes of a sample or
// a part that is done, which are in the record itself with their sources (src/chem-data/cabbage/cabbage.json).
// This module words everything else.
//
// Feedback on an answer says that it is not right, or what to look at again, and never which answer is right.

const lower = (text: string) => `${text[0]!.toLowerCase()}${text.slice(1)}`
const upper = (text: string) => `${text[0]!.toUpperCase()}${text.slice(1)}`
const article = (word: string) => (/^[aeiou]/i.test(word) ? 'an' : 'a')
const COUNT_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen']
const count = (n: number) => COUNT_WORDS[n] ?? String(n)

/** The lab's name, and what its page says at its head. */
export const LAB_TEXT = {
  title: 'Red cabbage pH',
  /** Under the title: what the lab is, in a sentence or two. */
  aim: 'Make a scale of colours with red cabbage indicator. Then place household things on it by eye, and check each with a pH meter.',
  complete: 'The lab is complete once all three parts are done.',
  completed: 'The lab is complete: all three parts are done. The things left over can still be tried.',
} as const

/** "Part 1", over a part's name. */
export const partNumber = (partId: PartId) => `Part ${PART_IDS.indexOf(partId) + 1}`
/** A part's name, as the record has it: "The scale". */
export const partName = (data: CabbageData, partId: PartId) => data.parts.find((p) => p.id === partId)!.name

/** How far a part has come, in a word or two, beside its name where the parts are chosen between. */
export const PART_STATUS = { closed: 'Not open yet', 'not-begun': 'Not begun', 'under-way': 'Under way', done: 'Done' } as const

/** What a part asks for, said before it is begun, without a word of what will be seen. */
export const PART_AIM: Record<PartId, string> = {
  scale: 'Put the indicator into the thirteen buffers, look along the rack, and answer three questions that the rack answers.',
  things: 'For each thing: add the indicator, look, say which tube of the scale it is nearest and whether it is acid, neutral or basic, then read the meter.',
  unit: 'Two questions from your own readings: which of two things holds more hydrogen ion, and how many times more.',
}

/** What stands on the bench, a line for each kind of thing. */
export function benchLines(data: CabbageData): string[] {
  return [
    `${upper(count(data.scale.buffers.length))} buffer solutions, from pH ${data.scale.buffers[0]!.ph} to pH ${data.scale.buffers.at(-1)!.ph}, in a rack`,
    data.reagents.find((r) => r.id === data.indicator.reagentId)!.name,
    'A pH meter with its probe, and a wash bottle of distilled water',
    `${upper(count(data.things.length))} household things, each in a tube of its own`,
  ]
}

// ---------------------------------------------------------------------------------------------------------------
// A tube in words
// ---------------------------------------------------------------------------------------------------------------

/** A liquid in words: "a clear rose liquid", "a cloudy white liquid", "a clear liquid with no colour". */
const liquidWords = (liquid: NonNullable<TubeShows['liquid']>) => {
  const clarity = liquid.cloudy ? 'cloudy' : 'clear'
  return liquid.colour === 'colourless' ? `${article(clarity)} ${clarity} liquid with no colour` : `${article(clarity)} ${clarity} ${liquid.colour} liquid`
}

/**
 * What is seen of a tube, as a sentence: the description in words that stands beside every picture of one (spec
 * 21.6). It says what is seen and never what anything is. "A clear rose liquid." "A cloudy white liquid over a
 * white solid at the bottom."
 */
export function tubeText(shows: TubeShows | null): string {
  const { liquid = null, solid = null } = shows ?? {}
  if (liquid === null) return solid === null ? 'An empty tube.' : `${upper(article(solid.colour))} ${solid.colour} solid, and no liquid.`
  if (solid === null) return `${upper(liquidWords(liquid))}.`
  return `${upper(liquidWords(liquid))} ${solid.settled ? `over ${article(solid.colour)} ${solid.colour} solid at the bottom` : `with ${article(solid.colour)} ${solid.colour} solid spread through it`}.`
}

/** A buffer's label, as it is written on its tube: "pH 3". */
export const bufferLabel = (ph: number) => `pH ${ph}`
/** A tube of the rack in words: "pH 3: a clear rose liquid." */
export const rackTubeText = (ph: number, shows: TubeShows) => `${bufferLabel(ph)}: ${lower(tubeText(shows))}`
/** The colour of a tube's liquid as a word, for a list of choices or a legend: "Rose", "No colour". */
export const colourLabel = (colour: string) => (colour === 'colourless' ? 'No colour' : upper(colour))

// ---------------------------------------------------------------------------------------------------------------
// Part 1: the scale
// ---------------------------------------------------------------------------------------------------------------

export const RACK_TEXT = {
  heading: 'The scale',
  /** Over the rack while it is kept in view beside a sample. */
  kept: 'Your scale',
  fill: 'Add the indicator to the thirteen buffers',
  look: 'Look along the rack',
  before: 'Thirteen buffers stand in the rack in order, from pH 1 on the left to pH 13 on the right.',
  filled: 'The indicator is in. Look along the rack.',
  questions: 'Three questions',
  record: 'Record the answer',
  /** Beside the rack, on how to look at it. */
  explore: 'Hover over a tube or tap it, and its colour is said in words. The arrow keys move along the rack.',
  check: 'Check the three answers',
  again: 'Answer the three again',
  hint: 'Hint',
} as const

/** A question of the rack, as it is asked. */
export function scaleQuestionText(question: Pick<ScaleQuestionView, 'kind' | 'ph'>): string {
  if (question.kind === 'same-colour-pair') return 'Two tubes next to each other show the same colour. Which two?'
  return question.ph === 7 ? 'What colour is the indicator in the pH 7 buffer, which is neutral?' : `What colour is the indicator in the pH ${question.ph} buffer?`
}

/** A choice of a question of the rack: a colour, or a pair of neighbouring tubes named by the lower. */
export const scaleChoiceLabel = (question: Pick<ScaleQuestionView, 'kind'>, choice: string | number): string => (question.kind === 'same-colour-pair' ? `pH ${choice} and pH ${Number(choice) + 1}` : colourLabel(String(choice)))

/** Guided's hint at each question of the rack: where to look, and never the answer. */
export const SCALE_HINT: Record<ScaleQuestionId, string> = {
  'acid-end': 'Find the tube at the left end of the rack and read its colour in words.',
  neutral: 'Count along to the seventh tube. Its colour is the one a neutral liquid gives.',
  'same-pair': 'Read the colours in words from left to right. One word comes twice in a row.',
}

// ---------------------------------------------------------------------------------------------------------------
// Part 2: a household thing
// ---------------------------------------------------------------------------------------------------------------

/** A thing's name, as the record has it: "Vinegar". */
export const thingName = (data: CabbageData, thingId: ThingId) => thingOf(data, thingId).name
/** A thing's name inside a sentence: "the vinegar". */
export const theThing = (data: CabbageData, thingId: ThingId) => `the ${lower(thingName(data, thingId))}`

/** How a thing is on the bench. */
export const ON_BENCH: Record<Thing['onBench'], string> = {
  'as-sold': 'As it is sold.',
  'one-in-twenty': 'About one part in twenty in water.',
  'one-in-hundred': 'About one part in a hundred in water.',
  tablets: 'Crushed tablets, about 5 g in 100 mL of water. Not all of it dissolves.',
  dissolved: 'About 5 g dissolved in 100 mL of water.',
}

export const KIND_LABEL: Record<Thing['kind'], string> = { food: 'Food', toiletry: 'Toiletry', medicine: 'Medicine', cleaner: 'Cleaner' }

export const CLASS_LABEL: Record<Class, string> = { acid: 'Acid', neutral: 'Neutral', basic: 'Basic' }

/** An estimate by eye, as it was given: "pH 3", or that the indicator cannot say. */
export const estimateLabel = (estimate: Estimate) => (estimate === CANNOT_SAY ? SAMPLE_TEXT.cannotSay : bufferLabel(estimate))

/** An estimate by eye that is recorded, as one line: "pH 3, acid", or that the indicator cannot say. */
export const byEyeLine = (estimate: Estimate, is: Class | null) => (estimate === CANNOT_SAY || is === null ? estimateLabel(estimate) : `${estimateLabel(estimate)}, ${lower(CLASS_LABEL[is])}`)

/** A reading of the meter: "pH 3.0". */
export const phText = (tenths: number) => `pH ${(tenths / 10).toFixed(1)}`

export const SAMPLE_TEXT = {
  tube: 'The tube',
  addIndicator: 'Add the indicator',
  look: 'Look at the liquid',
  byEye: 'By eye',
  /** Beside the tube's picture, on how to look at it. */
  explore: 'Hover over or tap the liquid to look at it.',
  /** Beside the small scale, on how to choose a tube of it. */
  pick: 'Press a tube of the scale to choose it.',
  record: 'Record the estimate',
  nearest: 'Which tube of the scale is it nearest?',
  cannotSay: 'The indicator cannot say',
  which: 'Is it acid, neutral or basic?',
  /** Under the question on acid, neutral or basic: the lab's rule for neutral. */
  neutralRule: 'Neutral here means the colour of the pH 7 tube.',
  /** Under the question on the nearest tube: the lab's rule for an estimate. */
  estimateRule: 'An estimate counts when it is within one unit of the meter.',
  fixed: 'The meter has been read, so the estimate can no longer be changed.',
  meter: 'The meter',
  rinse: 'Rinse the probe',
  read: 'Put the probe in and read the meter',
  check: 'Check this sample',
  again: 'Set it up again in a fresh tube',
  hint: 'Hint',
  notRead: 'Not read yet',
} as const

/** Guided's hints at a sample, each in a closed disclosure: how to go about it, and never the answer. */
export const SAMPLE_HINT = {
  estimate: 'Hold the tube beside the rack and find the tube it looks most like. If the liquid has no colour that any tube has, there is nothing to match.',
  which: 'A sample with the colour of the pH 7 tube is neutral. With the colour of a tube left of it, it is acid; right of it, basic.',
  meter: 'A probe carries some of the last sample with it. Wash that off with distilled water before the next one.',
} as const

/** Where the probe stands: rinsed, or still wet from the thing it was last in. */
export const meterText = (data: CabbageData, meter: MeterView) => (meter.lastIn === null ? 'The probe is rinsed.' : `The probe was last in ${theThing(data, meter.lastIn)} and has not been rinsed since.`)

/** Guided's warning before an unrinsed probe reads (spec 21.2). It says what will happen and leaves the choice. */
export const probeWarning = (data: CabbageData, lastIn: ThingId) =>
  `The probe has not been rinsed since it was in ${theThing(data, lastIn)}. Read now, and the meter may be pulled toward that sample, and the reading will not count. Rinse the probe first, or read anyway.`

/** What the meter showed, and, once that is judged, that an unrinsed reading does not count and why. */
export function readingText(reading: NonNullable<SampleView['reading']>): string {
  const read = `The meter reads ${phText(reading.tenths)}.`
  return reading.unrinsed ? `${read} This reading does not count: the probe was not rinsed, so the last sample may have pulled it. Rinse the probe and read again.` : read
}

/** What Guided says of an estimate and of acid, neutral or basic as each is recorded. */
export const GUIDED_TEXT = {
  estimateRight: 'Recorded. That is within one unit of the meter.',
  cannotSayRight: 'Recorded. There is no colour left to match.',
  classRight: 'Recorded. That is right.',
} as const

/** Why a sample does not count: each cause named, and never what was right (spec 21.2). */
export const REASON_TEXT: Record<Reason, string> = {
  'estimate-off': 'The estimate was not within one unit of the meter.',
  'class-wrong': 'Acid, neutral or basic did not agree with the meter.',
  'probe-unrinsed': 'The probe was not rinsed after the last sample.',
}

/** How a sample stands. */
export function sampleOutcomeText(view: Pick<SampleView, 'outcome' | 'reasons' | 'indicator'>): string {
  switch (view.outcome.state) {
    case 'open':
      return view.indicator ? 'Under way.' : 'Not begun.'
    case 'to-check':
      return 'Everything is recorded. Check this sample.'
    case 'counts':
      return 'This sample counts.'
    case 'does-not-count':
      return `This sample does not count. ${view.reasons.map((reason) => REASON_TEXT[reason]).join(' ')} Try it again in a fresh tube.`
  }
}

/** How far the second part has come, in a few words: "3 of 8 count", and past the eight the part needs, "9 count, 8 needed". */
export const countShort = (bench: Pick<BenchView, 'counted' | 'needed'>) => (bench.counted > bench.needed ? `${bench.counted} count, ${bench.needed} needed` : `${bench.counted} of ${bench.needed} count`)

/** How far the second part has come: "3 of 8 count." */
export function countText(bench: Pick<BenchView, 'counted' | 'needed' | 'things'>): string {
  const left = bench.things - bench.counted
  if (bench.counted >= bench.needed) return `${upper(count(bench.counted))} things count, and ${count(bench.needed)} were needed: this part is done. ${left === 0 ? 'Every thing on the bench counts.' : `The other ${count(left)} ${left === 1 ? 'is' : 'are'} there to try.`}`
  return `${bench.counted} of ${bench.needed} count. There are ${count(bench.things)} things to choose from.`
}

// ---------------------------------------------------------------------------------------------------------------
// Part 3: what a unit means
// ---------------------------------------------------------------------------------------------------------------

/** One of the two things a closing question sets side by side, inside a sentence: "the vinegar", "the pH 4 buffer". */
export const itemName = (data: CabbageData, item: UnitItem) => (item.kind === 'thing' ? theThing(data, item.id) : `the pH ${item.ph} buffer`)

/** One of the two as a choice: "The vinegar". */
export const itemLabel = (data: CabbageData, item: UnitItem) => upper(itemName(data, item))

/** A power of ten in words: "10 times", "1,000 times". */
export const powerLabel = (power: number) => `${(10 ** power).toLocaleString('en-US')} times`

export const UNIT_TEXT = {
  heading: 'What a unit means',
  closed: 'These two questions open once eight things count: they are drawn from your own readings.',
  more: 'Which holds more hydrogen ion?',
  times: 'How many times more?',
  record: 'Record the answer',
  check: 'Check the two answers',
  again: 'Answer the two again',
  hint: 'Hint',
  /** Guided's hint: how to work it, and never the answer. */
  hintText: 'Take one pH from the other to find how many units apart they are. Each unit is ten times. The lower pH holds more hydrogen ion.',
} as const

/** A closing question, as it is asked: the two things with the reading of each. */
export function unitQuestionText(data: CabbageData, question: Pick<UnitQuestionView, 'items'>): string {
  const [a, b] = question.items
  const said = (item: UnitItem) => (item.kind === 'thing' ? `${upper(itemName(data, item))} read ${phText(item.tenths)}` : `${upper(itemName(data, item))} is at ${phText(item.tenths)}`)
  return `${said(a)}. ${said(b)}.`
}

// ---------------------------------------------------------------------------------------------------------------
// Parts, refusals and the rest of the page
// ---------------------------------------------------------------------------------------------------------------

/** How a part stands: the rack's questions, or the closing questions. */
export function partOutcomeText(outcome: Outcome): string {
  switch (outcome.state) {
    case 'open':
      return 'Not all answered yet.'
    case 'to-check':
      return 'All answered. Check them.'
    case 'counts':
      return 'Every answer is right: this part is done.'
    case 'does-not-count':
      return 'Not every answer is right. The marks show which; answer them again.'
  }
}

/** The mark beside an answer once it has been judged. */
export const MARK_TEXT = { right: 'Right', wrong: 'Not right', notJudged: 'Not checked yet' } as const
export const markText = (right: boolean | null) => (right === null ? MARK_TEXT.notJudged : right ? MARK_TEXT.right : MARK_TEXT.wrong)

/** Why an action cannot be done now. A sentence names what is missing and never what an answer should be. */
export const BLOCKED_TEXT: Record<Blocked, string> = {
  'unknown-thing': 'That is not one of the things on this bench.',
  'not-a-choice': 'That is not one of the choices.',
  'rack-not-made': 'Make the scale first: put the indicator into the thirteen buffers.',
  'rack-made': 'The indicator is already in the buffers.',
  'not-looked': 'Look first. What you see is what you answer from.',
  'already-looked': 'You have looked at this already. It has not changed.',
  'indicator-in': 'The indicator is already in this tube.',
  'no-indicator': 'Add the indicator to this tube first.',
  'no-estimate': 'Say first which tube of the scale it is nearest.',
  'no-class': 'Say first whether it is acid, neutral or basic.',
  'class-not-asked': 'With no tube named, acid, neutral or basic is not asked.',
  'answers-fixed': 'The meter has been read in this sample, so the estimate by eye can no longer be changed.',
  'already-rinsed': 'The probe is already rinsed.',
  'probe-still-in': 'The probe was last in this thing and has not been rinsed since. Rinse the probe, then read.',
  'not-read': 'Read the meter in this sample first.',
  checked: 'This has been checked. Nothing in it can be changed.',
  'counts-already': 'This counts already, and stays as it is.',
  'nothing-to-repeat': 'There is nothing here to set up again yet.',
  'not-all-answered': 'Answer every question first.',
  'not-enough-count': 'These questions open once eight things count.',
  'not-right': 'Not right. Look again and choose another.',
  'estimate-off': 'Not yet. Hold the tube beside the rack again: is there a colour to match, and which tube has it?',
  'class-wrong': 'That does not agree with the meter. Match the colour again: is it that of the pH 7 tube, or of a tube to its left or its right?',
}

export const MODE_TEXT: Record<Mode, string> = {
  guided: 'Guided checks each answer as you give it, has a hint at each step, and warns before an unrinsed probe reads.',
  challenge: 'Challenge records what you enter and says nothing until you ask for a check.',
}

/** The notes of a part, as the record has them: shown once the part is done. */
export const partNotes = (data: CabbageData, partId: PartId): string[] => data.parts.find((p) => p.id === partId)!.notes.map((note) => note.value)
/** The note of a thing, as the record has it: shown once its sample counts. */
export const thingNote = (data: CabbageData, thingId: ThingId): string => thingOf(data, thingId).note.value

/**
 * What stands under the heading for hazards on a thing's card or a buffer's: for a laboratory chemical, the heading
 * over its statements; for anything else, the lab's one shared note (spec 21.4).
 */
export function hazardsText(data: CabbageData, item: { reagentId?: string | undefined }): { shared: boolean; text: string } {
  const reagent = reagentOf(data, item)
  return reagent ? { shared: false, text: reagent.classifiedAs } : { shared: true, text: data.sharedNote.value }
}

export const HAZARD_TEXT = {
  heading: 'Hazards',
  /** Where a sheet lists no hazard statement. */
  none: 'The safety data sheet lists no hazard statement for this.',
  atThisStrength: 'On this bench',
  /** Over the shared note, where it stands for every thing that has no bottle with a tile of its own. */
  others: 'Anything else on this bench',
} as const

export const NOTES_TEXT = { thing: 'About this thing', part: 'About this part' } as const

/** The headings of the record of the things tried. */
export const RECORD_TEXT = {
  heading: 'Your record',
  empty: 'Nothing has been measured yet.',
  thing: 'Thing',
  byEye: 'By eye',
  which: 'Acid, neutral or basic',
  meter: 'Meter',
  result: 'Result',
  counts: 'Counts',
  doesNotCount: 'Does not count',
  open: 'Not finished',
  notAsked: 'Not asked',
  tries: (n: number) => (n === 0 ? 'First tube' : `Tube ${n + 1}`),
} as const

/** The rest of the page's fixed words. */
export const PAGE_TEXT = {
  primer: 'Read the primer',
  bench: 'On the bench',
  mode: 'Mode',
  sources: 'Sources',
  things: 'The household things',
  choose: 'Choose a thing to try',
  onBench: 'On the bench',
  looked: 'looked at',
  seen: 'What you see',
  rackInWords: 'The rack in words',
  parts: 'Parts',
  previous: (name: string) => `Previous: ${name}`,
  next: (name: string) => `Next: ${name}`,
  change: 'Change',
  cancel: 'Cancel',
  /** The name of a tube's picture: "Vinegar: the tube, drawn". */
  tubePicture: (name: string) => `${name}: the tube, drawn`,
  liquidLayer: 'liquid',
  solidLayer: 'solid',
  startOver: 'Start the lab again',
  startOverWarning: 'This clears everything recorded in this lab and starts a new bench, with new readings.',
} as const

export const SOURCES_TEXT = "Where the colours, each thing's usual pH and the hazards are from. The list names each source and what it covers, and gives no pH."
