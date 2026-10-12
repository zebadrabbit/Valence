import { isPairId, liquidOf, PART_IDS, reagentOf, solidOf, type Family, type LiquidId, type MixingData, type PartId, type QuestionId, type SolidId, type TubeId } from '@/chem-data/mixing/data'
import type { BenchView, Blocked, Layers, Mode, Outcome, PairView, Reason, RuleView, SolidSeen, SolidTubeView, Stage, TubeShows, TubeView } from '@/engine/mixing'

// Every sentence the polarity and mixing lab says, keyed by the engine's identifiers, so that an identifier with no
// sentence does not compile. A sentence can say only what it is handed: the lab's record and what the engine's
// views hold, which is what is seen of a tube now and what the learner has entered. What a tube's outcome means is
// said in one place only: the note of a tube that counts or of a part that is done, which is in the record itself
// with its sources (src/chem-data/mixing/mixing.json). This module words everything else.
//
// A tube is described as it is seen: its layers, which is the thicker, the colour of each, a solid at the bottom.
// No sentence here names a liquid's family, and none says whether two liquids mix or a solid dissolves. Feedback on
// an answer says that it is not right, or where to look again, and never which answer is right.

const lower = (text: string) => `${text[0]!.toLowerCase()}${text.slice(1)}`
const upper = (text: string) => `${text[0]!.toUpperCase()}${text.slice(1)}`
const article = (word: string) => (/^[aeiou]/i.test(word) ? 'an' : 'a')
const COUNT_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
const count = (n: number) => COUNT_WORDS[n] ?? String(n)

/** The lab's name, and what its page says at its head. */
export const LAB_TEXT = {
  title: 'Polarity and mixing',
  /** Under the title: what the lab is, in a sentence or two. */
  aim: 'Find out which liquids mix and which stay as two layers, and what salt and sugar dissolve in. Then find the rule behind it.',
  complete: 'The lab is complete once all three parts are done.',
  completed: 'The lab is complete: all three parts are done. The tubes left over can still be tried.',
} as const

/** "Part 1", over a part's name. */
export const partNumber = (partId: PartId) => `Part ${PART_IDS.indexOf(partId) + 1}`
/** A part's name, as the record has it: "Liquid with liquid". */
export const partName = (data: MixingData, partId: PartId) => data.parts.find((p) => p.id === partId)!.name

/** How far a part has come, in a word or two, beside its name where the parts are chosen between. */
export const PART_STATUS = { closed: 'Not open yet', 'not-begun': 'Not begun', 'under-way': 'Under way', done: 'Done' } as const

/** What a part asks for, said before it is begun, without a word of what will be seen. */
export const PART_AIM: Record<PartId, string> = {
  liquids: 'Put two liquids into a tube, more of one than of the other. Shake it, let it stand, and look. Say whether there is one layer or two and, where there are two, which liquid is on top.',
  solids: 'Put a little salt or sugar into a liquid. Shake it, let it stand, and look. Say whether the solid is gone.',
  rule: 'Sort the five liquids into two families, from what your tubes showed. Then answer two questions about things that are not on the bench.',
}

/** What stands on the bench, a line for each kind of thing. */
export function benchLines(data: MixingData): string[] {
  const names = (items: readonly { name: string }[]) => items.map((item, i) => (i === 0 ? item.name : lower(item.name)))
  const list = (words: string[]) => `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`
  return [`${upper(count(data.liquids.length))} liquids, each in a dropper bottle: ${lower(list(names(data.liquids)))}`, `${list(names(data.solids))}, each in a small jar`, 'Test tubes in a rack']
}

// ---------------------------------------------------------------------------------------------------------------
// The liquids, the solids and the tubes by name
// ---------------------------------------------------------------------------------------------------------------

/** A liquid's name, as the record has it: "Distilled water". */
export const liquidName = (data: MixingData, liquid: LiquidId) => liquidOf(data, liquid).name
/** "the distilled water", within a sentence. */
export const theLiquid = (data: MixingData, liquid: LiquidId) => `the ${lower(liquidName(data, liquid))}`
export const solidName = (data: MixingData, solid: SolidId) => solidOf(data, solid).name
export const theSolid = (data: MixingData, solid: SolidId) => `the ${lower(solidName(data, solid))}`

/** What a liquid is, under its name: "2-Propanol (isopropyl alcohol) in water, about 70% by volume". It says nothing of what the liquid does. */
export function liquidHolds(data: MixingData, liquid: LiquidId): string {
  const { holds, strength } = liquidOf(data, liquid)
  return strength ? `${holds}, ${strength.value}` : holds
}
/** What a solid is, under its name: "Sodium chloride". */
export const solidHolds = (data: MixingData, solid: SolidId) => solidOf(data, solid).holds

/** A tube's name, from what is in it: "Distilled water with vegetable oil", "Table salt in vinegar". */
export function tubeName(data: MixingData, tubeId: TubeId): string {
  if (isPairId(tubeId)) {
    const [a, b] = data.pairs.find((p) => p.id === tubeId)!.liquidIds
    return `${liquidName(data, a)} with ${lower(liquidName(data, b))}`
  }
  const tube = data.solidInLiquid.find((t) => t.id === tubeId)!
  return `${solidName(data, tube.solidId)} in ${lower(liquidName(data, tube.liquidId))}`
}

/** The link from a thing to its molecule in the explorer, for each thing the record links (spec 25.2); the rest have none. */
export const MOLECULE_LINK: Partial<Record<LiquidId | SolidId, string>> = {
  water: 'Look at a water molecule in the explorer',
  vinegar: 'Look at acetic acid, the acid in vinegar, in the explorer',
  sugar: 'Look at a sugar molecule, sucrose, in the explorer',
}

// ---------------------------------------------------------------------------------------------------------------
// Choosing what goes into a tube
// ---------------------------------------------------------------------------------------------------------------

export const CHOOSE_TEXT = {
  pair: 'Choose two liquids',
  /** Over the choice of which liquid there is more of. */
  more: 'Which will there be more of?',
  solid: 'Choose a solid',
  liquid: 'Choose a liquid',
  sameLiquid: 'Choose two different liquids.',
} as const

/** The choice of the liquid there is more of: "More distilled water". */
export const moreLabel = (data: MixingData, liquid: LiquidId) => `More ${lower(liquidName(data, liquid))}`

/**
 * Why a pair or a solid in a liquid that a learner asks for is not on the bench (spec 25.1). Each says that nothing
 * the lab rests on settles it, and nothing of what the tube might show.
 */
const OFF_BENCH_TEXT: Record<string, string> = {
  'rubbing-alcohol+mineral-oil': 'Rubbing alcohol with mineral oil is not on this bench. Nothing the lab rests on says what the two show together.',
  'salt-in-rubbing-alcohol': 'Salt is not tried in the rubbing alcohol on this bench. What a little salt does there depends on how much water is in the bottle, and nothing the lab rests on settles it.',
  'sugar-in-rubbing-alcohol': 'Sugar is not tried in the rubbing alcohol on this bench. What a little sugar does there depends on how much water is in the bottle, and nothing the lab rests on settles it.',
}

/** What to say of two liquids the engine has no tube for: the same liquid twice, or a pair left off the bench. */
export function pairOffBenchText(data: MixingData, a: LiquidId, b: LiquidId): string {
  if (a === b) return CHOOSE_TEXT.sameLiquid
  const left = data.offBench.find((item) => item.id === `${a}+${b}` || item.id === `${b}+${a}`)
  return (left && OFF_BENCH_TEXT[left.id]) ?? BLOCKED_TEXT['unknown-tube']
}

/** What to say of a solid in a liquid the engine has no tube for. */
export function solidOffBenchText(data: MixingData, solid: SolidId, liquid: LiquidId): string {
  const left = data.offBench.find((item) => item.id === `${solid}-in-${liquid}`)
  return (left && OFF_BENCH_TEXT[left.id]) ?? BLOCKED_TEXT['unknown-tube']
}

// ---------------------------------------------------------------------------------------------------------------
// A tube: its steps, and what is seen of it in words
// ---------------------------------------------------------------------------------------------------------------

/** The buttons of a tube's steps. */
export const STEP_TEXT = {
  shake: 'Shake the tube',
  stand: 'Let it stand',
  look: 'Look at the tube',
} as const

/** The button that fills a pair's tube: "Pour in the distilled water, then half as much vegetable oil". */
export function pourLabel(data: MixingData, view: Pick<PairView, 'liquids'>, more: LiquidId): string {
  const less = view.liquids.find((liquid) => liquid !== more)!
  return `Pour in ${theLiquid(data, more)}, then half as much ${lower(liquidName(data, less))}`
}

/** The button that fills a solid's tube: "Put in the vinegar, then a little table salt". */
export const addLabel = (data: MixingData, view: Pick<SolidTubeView, 'solid' | 'liquid'>) => `Put in ${theLiquid(data, view.liquid)}, then a little ${lower(solidName(data, view.solid))}`

/** What is in a pair's tube, once it is filled: which liquid there is more of. It is what the thicker layer is told by. */
export function amountsText(data: MixingData, view: Pick<PairView, 'liquids' | 'more'>): string {
  if (view.more === null) return 'Nothing is in the tube yet.'
  const less = view.liquids.find((liquid) => liquid !== view.more)!
  return `In this tube: more ${lower(liquidName(data, view.more))}, less ${lower(liquidName(data, less))}.`
}

/** What to do next in a tube, by how far it has come. It says nothing of what is seen. */
export const STAGE_TEXT: Record<Stage, string> = {
  empty: 'The tube is empty. Fill it.',
  in: 'The tube is filled. Shake it.',
  shaken: 'The tube has been shaken. Let it stand.',
  stood: 'The tube has stood. Look at it.',
}

/** A liquid in words: "a clear pale yellow liquid", "a cloudy liquid with no colour". */
const liquidWords = (liquid: NonNullable<TubeShows['liquid']>) => {
  const clarity = liquid.cloudy ? 'cloudy' : 'clear'
  return liquid.colour === 'colourless' ? `${article(clarity)} ${clarity} liquid with no colour` : `${article(clarity)} ${clarity} ${liquid.colour} liquid`
}

/** The parts of a tube's picture that can be looked at, from the top down. */
export type TubePart = 'upper' | 'lower' | 'liquid' | 'solid'
export const tubeParts = (shows: TubeShows): TubePart[] => [...(shows.liquid === null ? [] : shows.above ? (['upper', 'lower'] as const) : (['liquid'] as const)), ...(shows.solid === null ? [] : (['solid'] as const))]

/** The name of a part of the picture, for its button or its label. */
export const PART_LABEL: Record<TubePart, string> = { upper: 'Top layer', lower: 'Bottom layer', liquid: 'Liquid', solid: 'Solid' }

/** Which of two layers is the thicker. The two are never of one thickness. */
const thickness = (own: number, other: number) => (own > other ? 'the thicker of the two' : 'the thinner of the two')

/**
 * What is said when one part of a tube's picture is looked at. A layer is told by where it is, how thick it is and
 * its colour, in that order, so that no layer is told by its colour alone (spec 25.2). It never names a liquid.
 */
export function partText(shows: TubeShows, part: TubePart): string {
  const { liquid, above, solid } = shows
  switch (part) {
    case 'upper':
      return above && liquid ? `The top layer: ${thickness(above.microlitres, liquid.microlitres)}. It is ${liquidWords(above)}.` : 'There is no top layer.'
    case 'lower':
      return above && liquid ? `The bottom layer: ${thickness(liquid.microlitres, above.microlitres)}. It is ${liquidWords(liquid)}.` : 'There is no bottom layer.'
    case 'liquid':
      if (liquid === null) return 'There is no liquid in the tube.'
      return liquid.cloudy ? `${upper(liquidWords(liquid))}, not yet settled.` : `${upper(liquidWords(liquid))}, all one layer.`
    case 'solid':
      if (solid === null) return 'No solid is to be seen.'
      return solid.settled ? `${upper(article(solid.colour))} ${solid.colour} solid, lying at the bottom.` : `${upper(article(solid.colour))} ${solid.colour} solid, spread through the liquid.`
  }
}

/**
 * The whole of a tube in words, as it is seen now (spec 25.5): an empty tube; a liquid not yet settled; one layer;
 * two layers, the top one first, each with how thick it is and its colour; and a solid at the bottom, spread
 * through, or not to be seen. It names no liquid and gives no reason.
 */
export function tubeText(view: Pick<TubeView, 'kind' | 'stage' | 'shows'>): string {
  const { liquid, above, solid } = view.shows
  if (liquid === null) return 'An empty tube.'
  if (view.kind === 'solid') {
    if (solid === null) return `${upper(liquidWords(liquid))}. No solid is to be seen.`
    return solid.settled ? `${upper(liquidWords(liquid))}, with ${article(solid.colour)} ${solid.colour} solid lying at the bottom.` : `${upper(liquidWords(liquid))}, with ${article(solid.colour)} ${solid.colour} solid spread through it.`
  }
  if (view.stage !== 'stood') return `${upper(liquidWords(liquid))}, not yet settled.`
  if (!above) return `One layer: ${liquidWords(liquid)}.`
  return `Two layers. On top, ${thickness(above.microlitres, liquid.microlitres)}: ${liquidWords(above)}. Underneath, ${thickness(liquid.microlitres, above.microlitres)}: ${liquidWords(liquid)}.`
}

/** A tube that is not to be read yet: said under the picture until it has stood. */
export const NOT_SETTLED_TEXT = 'A tube is read only once it has been shaken and has stood.'

// ---------------------------------------------------------------------------------------------------------------
// What is seen: the form, its choices, its hints
// ---------------------------------------------------------------------------------------------------------------

export const FORM_TEXT = {
  heading: 'What is seen',
  /** Before the tube has been looked at. */
  closed: 'Look at the tube once it has stood. Then record what you saw.',
  layers: 'How many layers are there?',
  top: 'Which liquid is on top?',
  /** Under the question on which liquid is on top: how the layers are told apart. */
  topHelp: 'The thicker layer is the liquid there is more of.',
  solid: 'Is the solid gone?',
  record: 'Record',
  change: 'Change',
  check: 'Check this tube',
  again: 'Set it up again in a fresh tube',
} as const

export const LAYERS_LABEL: Record<Layers, string> = { one: 'One layer', two: 'Two layers' }
export const SOLID_LABEL: Record<SolidSeen, string> = { gone: 'Gone: no solid is to be seen', left: 'Still there, at the bottom' }

/** What was recorded of a tube, as one line: "Two layers, vegetable oil on top"; "The solid is gone". */
export function recordedLine(data: MixingData, view: Pick<PairView, 'kind' | 'layers' | 'top'> | Pick<SolidTubeView, 'kind' | 'seen'>): string {
  if (view.kind === 'solid') return view.seen === null ? 'Nothing recorded yet' : view.seen === 'gone' ? 'The solid is gone' : 'The solid is still there'
  if (view.layers === null) return 'Nothing recorded yet'
  if (view.layers === 'one') return LAYERS_LABEL.one
  return view.top === null ? LAYERS_LABEL.two : `${LAYERS_LABEL.two}, ${lower(liquidName(data, view.top))} on top`
}

/** Guided's hints: each says where to look and how to tell, and gives no answer. */
export const TUBE_HINT = {
  layers: 'Look for a line across the liquid. A line means two layers. No line means one.',
  top: 'You put in more of one liquid, so its layer is the thicker. See whether the thicker layer is above the line or below it.',
  solid: 'Look at the bottom of the tube.',
} as const

/** What Guided says of an answer it has taken. */
export const GUIDED_TEXT = {
  recorded: 'Recorded. That is what the tube shows.',
  sorted: 'Recorded. That is right.',
  answered: 'Recorded. That is what the rule gives.',
} as const

/** Why a tube does not count: the cause named, and never what was right. */
export const REASON_TEXT: Record<Reason, string> = {
  'layers-wrong': 'The number of layers recorded is not what the tube showed.',
  'top-wrong': 'The liquid recorded as on top is not the one that was.',
  'solid-wrong': 'What was recorded of the solid is not what the tube showed.',
}

/** How a tube stands. */
export function tubeOutcomeText(view: Pick<TubeView, 'outcome' | 'reasons' | 'stage'>): string {
  switch (view.outcome.state) {
    case 'open':
      return view.stage === 'empty' ? 'Not begun.' : 'Under way.'
    case 'to-check':
      return 'Everything is recorded. Check this tube.'
    case 'counts':
      return 'This tube counts.'
    case 'does-not-count':
      return `This tube does not count. ${view.reasons.map((reason) => REASON_TEXT[reason]).join(' ')} Set it up again in a fresh tube.`
  }
}

/** How a tube stands, in a word or two, beside its name in a list. */
export const TUBE_STATUS = { 'not-begun': 'Not begun', 'under-way': 'Under way', 'to-check': 'To check', counts: 'Counts', 'does-not-count': 'Does not count' } as const
export const tubeStatus = (view: Pick<TubeView, 'outcome' | 'stage'>): string => (view.outcome.state === 'open' ? (view.stage === 'empty' ? TUBE_STATUS['not-begun'] : TUBE_STATUS['under-way']) : TUBE_STATUS[view.outcome.state])

/** How far a part has come, in a few words: "3 of 6 count", and past the six the part needs, "7 count, 6 needed". */
export const countShort = (counted: number, needed: number) => (counted > needed ? `${counted} count, ${needed} needed` : `${counted} of ${needed} count`)

/** How far part 1 or part 2 has come, in a sentence. */
export function countText(bench: BenchView, partId: 'liquids' | 'solids'): string {
  const [counted, needed, all] = partId === 'liquids' ? [bench.pairsCounted, bench.pairsNeeded, bench.pairs] : [bench.solidsCounted, bench.solidsNeeded, bench.solidTubes]
  if (counted === 0) return `None of the ${count(needed)} tubes this part needs counts yet. The bench has ${count(all)} to choose from.`
  if (counted < needed) return `${upper(count(counted))} of the ${count(needed)} tubes this part needs ${counted === 1 ? 'counts' : 'count'}. The bench has ${count(all)} to choose from.`
  const left = all - counted
  return left === 0 ? `All ${count(all)} tubes count: this part is done.` : `${upper(count(counted))} tubes count: this part is done. The other ${left === 1 ? 'one is' : `${count(left)} are`} there to try.`
}

// ---------------------------------------------------------------------------------------------------------------
// Part 3: the rule
// ---------------------------------------------------------------------------------------------------------------

export const FAMILY_LABEL: Record<Family, string> = { water: 'Like water', oil: 'Like oil' }

export const RULE_TEXT = {
  /** Until the first two parts are done. */
  closed: 'This part opens once parts 1 and 2 are done.',
  sortHeading: 'Sort the five liquids',
  sortIntro: 'Each liquid goes with water or with oil. Go by what your tubes showed.',
  /** Guided's hint for the sorting: how to go about it, and no liquid's family. */
  sortHint: 'Find a tube in which the liquid met water or an oil. One layer means the two are alike. Two layers mean they are not. If the liquid has not met either yet, try that tube first.',
  questionsHeading: 'Two questions for the rule',
  /** Guided's hint for the two questions. */
  questionHint: 'Like dissolves like. Decide which family each of the two things is in, then ask whether they are alike.',
  check: 'Check this part',
  again: 'Answer again',
} as const

/** The question over one liquid in the sorting: "Which does the vinegar go with?" */
export const sortQuestion = (data: MixingData, liquid: LiquidId) => `Which does ${theLiquid(data, liquid)} go with?`
/** A liquid as it was sorted, as one line: "Vinegar: like water". */
export const sortedLine = (data: MixingData, liquid: LiquidId, family: Family | null) => `${liquidName(data, liquid)}: ${family === null ? 'not sorted yet' : lower(FAMILY_LABEL[family])}`

/** A question of part 3, as the record asks it. */
export const questionText = (data: MixingData, questionId: QuestionId) => data.rule.questions.find((q) => q.id === questionId)!.asks

/** The choices of part 3's questions. */
const CHOICE_LABEL: Record<string, string> = {
  mixes: 'It mixes into the water',
  'stays-apart': 'It stays apart from the water',
  dissolves: 'It dissolves',
  'stays-solid': 'It stays a solid',
}
export const choiceLabel = (choice: string) => CHOICE_LABEL[choice] ?? choice

/** How part 3 stands. */
export function ruleOutcomeText(view: Pick<RuleView, 'open' | 'outcome'>): string {
  if (!view.open) return RULE_TEXT.closed
  switch (view.outcome.state) {
    case 'open':
      return 'Not all answered yet.'
    case 'to-check':
      return 'All answered. Check this part.'
    case 'counts':
      return 'Everything is right: this part is done.'
    case 'does-not-count':
      return 'Not everything is right. The marks show which. Answer again.'
  }
}

/** How far a part has come, for the button that chooses it. */
export function partStatus(bench: BenchView, partId: PartId, begun: boolean): string {
  if (partId === 'rule') return !bench.ruleOpen ? PART_STATUS.closed : bench.ruleDone ? PART_STATUS.done : begun ? PART_STATUS['under-way'] : PART_STATUS['not-begun']
  return partId === 'liquids' ? countShort(bench.pairsCounted, bench.pairsNeeded) : countShort(bench.solidsCounted, bench.solidsNeeded)
}

// ---------------------------------------------------------------------------------------------------------------
// Marks, refusals, modes
// ---------------------------------------------------------------------------------------------------------------

/** The mark beside an answer once it has been judged. */
export const MARK_TEXT = { right: 'Right', wrong: 'Not right', notJudged: 'Not checked yet' } as const
export const markText = (right: boolean | null) => (right === null ? MARK_TEXT.notJudged : right ? MARK_TEXT.right : MARK_TEXT.wrong)

/** How an outcome reads beside a mark, for a list or the record. */
export const OUTCOME_LABEL: Record<Outcome['state'], string> = { open: 'Not finished', 'to-check': 'To check', counts: 'Counts', 'does-not-count': 'Does not count' }

/** Why an action cannot be done now. A sentence names what is missing and never what an answer should be. */
export const BLOCKED_TEXT: Record<Blocked, string> = {
  'unknown-tube': 'That tube is not on this bench.',
  'not-a-choice': 'That is not one of the choices.',
  'already-in': 'This tube is filled already. To change what is in it, set it up again in a fresh tube.',
  'nothing-in': 'Nothing is in the tube yet. Fill it first.',
  'already-shaken': 'The tube has been shaken already.',
  'not-shaken': 'Shake the tube first.',
  'already-stood': 'The tube has stood already. Look at it.',
  'not-stood': 'Shake the tube and let it stand before you look.',
  'already-looked': 'You have looked at this tube already. It has not changed.',
  'not-looked': 'Look at the tube first. What you see is what you record.',
  'top-not-asked': 'Which liquid is on top is asked only where two layers are recorded.',
  'not-all-recorded': 'There is still something to record.',
  checked: 'This has been checked. Nothing in it can be changed.',
  'counts-already': 'This counts already, and stays as it is.',
  'nothing-to-repeat': 'There is nothing here to set up again yet.',
  'parts-not-done': 'Part 3 opens once parts 1 and 2 are done.',
  'not-right': 'Not right. Look again and choose another.',
  'layers-first': 'The number of layers recorded is not right. Change that first.',
}

export const MODE_TEXT: Record<Mode, string> = {
  guided: 'Guided checks each answer as you give it, and has a hint at each question.',
  challenge: 'Challenge records what you enter and says nothing until you ask for a check.',
}

// ---------------------------------------------------------------------------------------------------------------
// Notes, hazards, the record, and the page's fixed words
// ---------------------------------------------------------------------------------------------------------------

/** The note of a tube, as the record has it: shown once the tube counts. */
export const tubeNote = (data: MixingData, tubeId: TubeId): string => (isPairId(tubeId) ? data.pairs.find((p) => p.id === tubeId)!.note.value : data.solidInLiquid.find((t) => t.id === tubeId)!.note.value)
/** The notes of a part, as the record has them: shown once the part is done. */
export const partNotes = (data: MixingData, partId: PartId): string[] => data.parts.find((p) => p.id === partId)!.notes.map((note) => note.value)

/**
 * What stands under the heading for hazards of a thing on the bench: for the rubbing alcohol, the heading over its
 * statements; for anything else, the one note the kitchen things share (spec 25.3).
 */
export function hazardsText(data: MixingData, item: { reagentId?: string | undefined }): { shared: boolean; text: string } {
  const reagent = reagentOf(data, item)
  return reagent ? { shared: false, text: reagent.classifiedAs } : { shared: true, text: data.sharedNote.value }
}

export const HAZARD_TEXT = {
  heading: 'Hazards',
  atThisStrength: 'On this bench',
  /** Over the shared note, where it stands for everything that has no tile of its own. */
  others: 'Everything else on this bench',
} as const

export const NOTES_TEXT = { tube: 'About this tube', part: 'About this part' } as const

/** The headings of the record of the tubes tried. */
export const RECORD_TEXT = {
  heading: 'Your record',
  empty: 'No tube has been set up yet.',
  tube: 'Tube',
  amounts: 'More of',
  recorded: 'Recorded',
  result: 'Result',
  sorting: 'The sorting',
  questions: 'The two questions',
  notAsked: 'Not asked',
  tries: (n: number) => (n === 0 ? 'First tube' : `Tube ${n + 1}`),
} as const

/** The rest of the page's fixed words. */
export const PAGE_TEXT = {
  primer: 'Read the primer',
  bench: 'On the bench',
  mode: 'Mode',
  sources: 'Sources',
  parts: 'Parts',
  choose: 'Choose a tube to try',
  looked: 'looked at',
  seen: 'What you see',
  hint: 'Hint',
  tubeInWords: 'The tube in words',
  previous: (name: string) => `Previous: ${name}`,
  next: (name: string) => `Next: ${name}`,
  cancel: 'Cancel',
  /** The name of a tube's picture: "Distilled water with vinegar: the tube, drawn". */
  tubePicture: (name: string) => `${name}: the tube, drawn`,
  /** How a picture is looked at, said to a screen reader and under the picture. It says nothing of what is seen. */
  lookAt: 'Point at a part of the tube, or move to it with the keyboard, to have it said in words.',
  startOver: 'Start the lab again',
  startOverWarning: 'This clears everything recorded in this lab and starts with a rack of empty tubes.',
} as const

/** Under the list of a tube's sources before it counts, and of a part's before it is done: why the list is short. */
export const SOURCES_TEXT = {
  tubeBefore: 'What this tube rests on is listed here once the tube counts.',
  tubeAfter: 'Where the look of each thing, its density, what this tube shows and the hazards are from.',
  partBefore: 'What this part rests on is listed here once the part is done.',
  partAfter: 'Where the notes of this part are from.',
} as const
