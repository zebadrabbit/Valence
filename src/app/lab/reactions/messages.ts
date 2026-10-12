import { KIND_ANSWERS, STATION_IDS, stationOf, type Field, type KindAnswer, type Look, type MetalId, type ReactionsData, type StationId } from '@/chem-data/reactions/data'
import type { BuilderText } from '@/app/lab/EquationBuilder'
import type { At, Side } from '@/app/lab/equationRow'
import type { Blocked, Built, Mode, Observation, Problem, Reason, RunOutcome, State, StationView, Tile, VesselShows } from '@/engine/reactions'

// Every sentence the types of reactions lab says, keyed by the engine's identifiers, so that an identifier with no
// sentence does not compile. A sentence can say only what it is handed: the lab's record and what the engine's
// views hold, which is what is seen of a vessel now and what the learner has entered. What a thing seen is, which
// kind of reaction it shows and why are said in one place only: the notes of a station that is done, which are in
// the record itself with their sources (src/chem-data/reactions/reactions.json). The words for each part of a
// vessel, before and after, are the record's too, and reach a page through the view once the part has been
// looked at. This module words everything else.
//
// Feedback on an observation says which part to look at again and never what it should be; feedback on a kind or
// an order says that it is not right and never which is; feedback on an equation says what kind of thing is wrong
// with it and never what would put it right.

const listed = (items: readonly string[]) => (items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`)
const lower = (text: string) => `${text[0]!.toLowerCase()}${text.slice(1)}`
const upper = (text: string) => `${text[0]!.toUpperCase()}${text.slice(1)}`
const article = (word: string) => (/^[aeiou]/i.test(word) ? 'an' : 'a')

/** The lab's name, and what its page says at its head. */
export const LAB_TEXT = {
  title: 'Types of reactions',
  /** Under the title: what the lab is, in a sentence or two. */
  aim: 'Five stations, each with one reaction to set off. Record what you see, say which kind of reaction it is, and build its equation.',
  /** Over the list of stations. */
  complete: 'The lab is complete once all five stations count.',
  completed: 'The lab is complete: all five stations count. Any station can still be worked again.',
} as const

/** "Station A", from the record's letter. */
export const stationLetter = (data: ReactionsData, stationId: StationId) => `Station ${stationOf(data, stationId).letter}`
/** "Station A: Zinc in copper(II) sulfate solution". The title is the record's, and names what is used and never the kind of reaction. */
export const stationName = (data: ReactionsData, stationId: StationId) => `${stationLetter(data, stationId)}: ${stationOf(data, stationId).title}`

/** What is done at each station, said before it is done, with no word of what will be seen. */
export const STATION_TASK: Record<StationId, string> = {
  'zinc-copper-sulfate': 'Look at the piece of zinc and at the solution. Then put the zinc into the solution, and look at both again.',
  'magnesium-flame': 'Look at the strip of magnesium. Then hold it in the flame with the tongs. Do not look straight at it while it burns.',
  'metals-in-acid': 'Each tube holds hydrochloric acid, and each has its own metal beside it. Put each metal into its tube, and compare the three.',
  'two-solutions': 'The tube holds calcium chloride solution. Pour the sodium carbonate solution into it, and look again.',
  peroxide: 'Look at the hydrogen peroxide as it is, and feel the tube. Then add a few drops of iron(III) chloride solution, and look and feel again.',
}

/** The station's one action, as its button names it, and what the page says once it is done. */
export const ACTION_LABEL: Record<StationId, string> = {
  'zinc-copper-sulfate': 'Put the zinc in',
  'magnesium-flame': 'Hold the strip in the flame',
  'metals-in-acid': 'Put each metal in its tube',
  'two-solutions': 'Pour in the sodium carbonate',
  peroxide: 'Add the drops',
}
export const ACTION_DONE: Record<StationId, string> = {
  'zinc-copper-sulfate': 'The zinc is in the solution.',
  'magnesium-flame': 'The strip has been held in the flame.',
  'metals-in-acid': 'Each metal is in its tube of acid.',
  'two-solutions': 'The two solutions are mixed.',
  peroxide: 'The drops have been added.',
}

/** What is on the bench of a station: the record's names of what is used. Each has its hazards, which the page shows from the record. */
export const benchLines = (data: ReactionsData, stationId: StationId): string[] => stationOf(data, stationId).reagentIds.map((id) => data.reagents.find((r) => r.id === id)!.name)

export const BENCH_TEXT = {
  heading: 'The bench',
  /** Over the list of what is used. */
  uses: 'On the bench:',
  hazards: 'Hazards',
  /** What every bench has beside its bottles. */
  wear: 'Eye protection and gloves are worn at every station.',
} as const

/** What a vessel is called on the page. At the station of three tubes each is named by the metal that goes into it, which the bench shows. */
export function vesselName(data: ReactionsData, stationId: StationId, vesselId: string): string {
  const station = stationOf(data, stationId)
  const vessel = station.vessels.find((v) => v.id === vesselId)
  if (!vessel) throw new Error(`no vessel "${vesselId}" at the station "${stationId}"`)
  if (vessel.drawn === 'flame') return 'The strip'
  return station.vessels.length === 1 || vessel.metal === null ? 'The tube' : `The ${METAL_NAME[vessel.metal.id]} tube`
}

export const METAL_NAME: Record<MetalId, string> = { magnesium: 'magnesium', zinc: 'zinc', copper: 'copper' }

/** One of several tubes in a word, for a button with little room: its metal, "Magnesium". The button's full name is the tube's. */
export function vesselShort(data: ReactionsData, stationId: StationId, vesselId: string): string {
  const metal = stationOf(data, stationId).vessels.find((v) => v.id === vesselId)?.metal
  if (!metal) throw new Error(`no tube with a metal "${vesselId}" at the station "${stationId}"`)
  return upper(METAL_NAME[metal.id])
}

// ---------------------------------------------------------------------------
// Looking, and the description in words of every picture

/** The part of a vessel a look is at, as its button names it. A solid is looked for in a tube; where a strip burned it is what is left. */
export function lookPart(drawn: VesselShows['drawn'], look: Look): string {
  switch (look) {
    case 'metal':
      return 'the metal'
    case 'liquid':
      return 'the liquid'
    case 'solid':
      return drawn === 'flame' ? 'what is left' : 'any solid'
    case 'flame':
      return 'the strip in the flame'
    case 'touch':
      return 'the tube'
  }
}
/** "Look at the metal", "Look for any solid", "Glance at the strip in the flame", "Feel the tube"; with ", looked at" once it has been. */
export function lookLabel(drawn: VesselShows['drawn'], look: Look, looked: boolean): string {
  const verb = look === 'touch' ? 'Feel' : look === 'flame' ? 'Glance at' : look === 'solid' && drawn === 'tube' ? 'Look for' : 'Look at'
  return `${verb} ${lookPart(drawn, look)}${looked ? `, ${look === 'touch' ? PAGE_TEXT.felt : PAGE_TEXT.lookedAt}` : ''}`
}

const liquidWords = (colour: string) => (colour === 'colourless' ? 'colourless' : colour)

/**
 * A vessel in words, from what is seen of it and nothing else: the description of its picture. Every field of
 * what is shown is said: the liquid and any solid in it, the metal and where it is, a coating, bubbles, a light,
 * a powder left behind, and warmth, which no picture shows.
 */
export function vesselText(shows: VesselShows): string {
  const said: string[] = []
  const { tube, metal } = shows
  if (shows.drawn === 'flame') {
    if (metal !== null) said.push(`${article(metal.colour)} ${metal.colour} strip of metal, held in tongs ${metal.placed ? 'in the flame of a burner' : 'beside a burner'}.`)
    if (shows.light !== null) said.push(`The strip burns with a ${shows.light}, too bright to look at.`)
    if (shows.residue !== null) said.push(`${article(shows.residue)} ${shows.residue} powder is left in the tongs.`)
    if (said.length === 0) said.push('Tongs beside a burner, with nothing in them.')
  } else {
    if (tube === null || tube.liquid === null) said.push('An empty test tube.')
    else if (tube.solid !== null) said.push(`A test tube of ${liquidWords(tube.liquid.colour)} liquid, ${tube.solid.settled ? `with ${article(tube.solid.colour)} ${tube.solid.colour} solid at the bottom` : `cloudy with ${article(tube.solid.colour)} ${tube.solid.colour} solid`}.`)
    else said.push(`A test tube of clear, ${liquidWords(tube.liquid.colour)} liquid.`)
    if (metal !== null) {
      const coating = metal.coating === null ? '' : `, with ${article(metal.coating)} ${metal.coating} coating on it`
      said.push(metal.placed ? `${article(metal.colour)} ${metal.colour} piece of metal stands in the liquid${coating}.` : `${article(metal.colour)} ${metal.colour} piece of metal lies beside the tube${coating}.`)
    }
    const from = metal?.placed ? 'off the metal' : 'through the liquid'
    if (shows.bubbles === 'fast') said.push(`Bubbles stream ${from}, fast.`)
    else if (shows.bubbles === 'slow') said.push(`Bubbles rise ${from}, slowly.`)
    else if (shows.bubbles === 'some') said.push(`Bubbles rise ${from}.`)
    else if (metal?.placed) said.push('No bubbles rise.')
  }
  if (shows.warm) said.push('The tube is warm to the touch.')
  return said.map((sentence) => `${sentence[0]!.toUpperCase()}${sentence.slice(1)}`).join(' ')
}

/** What the page says of warmth beside the picture, since a picture cannot show it. */
export const WARM_TEXT = 'Warm to the touch'

// ---------------------------------------------------------------------------
// What is seen

/** What each field of an observation asks. A loose solid is in the liquid of a tube, and is what is left where a strip burned. */
export const fieldLabel = (drawn: VesselShows['drawn'], field: Field): string => (field === 'solid' && drawn === 'flame' ? 'What is left' : FIELD_LABEL[field])
export const FIELD_LABEL: Record<Field, string> = {
  coating: 'On the metal',
  liquid: 'Colour of the liquid',
  solid: 'Solid in the liquid',
  bubbles: 'Bubbles from the metal',
  gas: 'Bubbles in the liquid',
  light: 'Light',
  warmth: 'The tube to the touch',
}
/** The part to look at again for a field, in a sentence. */
const FIELD_PART: Record<Field, string> = { coating: 'the metal', liquid: 'the liquid', solid: 'the solid', bubbles: 'the bubbles', gas: 'the bubbles', light: 'the light', warmth: 'how the tube feels' }

/** A choice of a field as its box words it: the record's word, made to read alone. */
export function choiceLabel(field: Field, choice: string): string {
  if (field === 'coating') return choice === 'none' ? 'no coating' : `${article(choice)} ${choice} coating`
  if (field === 'solid') return choice === 'none' ? 'no solid' : `${article(choice)} ${choice} solid`
  if (field === 'bubbles') return choice === 'none' ? 'none' : choice === 'slow' ? 'slowly' : choice
  if (field === 'gas') return choice === 'none' ? 'no bubbles' : choice
  if (field === 'light') return choice === 'none' ? 'no light' : `${article(choice)} ${choice}`
  return choice
}
export const choiceList = (field: Field, choices: readonly string[]) => choices.map((value) => ({ value, label: choiceLabel(field, value) }))

/** A field in a word or two, for the line of an answer that is recorded under one of several tubes, where a line is short. */
export const FIELD_SHORT: Record<Field, string> = { coating: 'Coating', liquid: 'Liquid', solid: 'Solid', bubbles: 'Bubbles', gas: 'Bubbles', light: 'Light', warmth: 'To the touch' }

/** An observation as its record lists it, a line for each field; `short` names each field in a word or two. */
export const observationLines = (drawn: VesselShows['drawn'], fields: readonly Field[], observation: Observation, short = false): string[] =>
  fields.map((field) => `${short ? FIELD_SHORT[field] : fieldLabel(drawn, field)}: ${choiceLabel(field, observation[field] ?? '')}`)

export const OBSERVATION_TEXT = {
  heading: 'What is seen',
  /** Before the station's action, and before every part has been looked at since. */
  actFirst: 'Nothing has happened yet. Do the action, then look.',
  lookFirst: 'Look at every part first. The boxes open when you have.',
  record: 'Record what is seen',
  recordAgain: 'Record again',
  recorded: 'Recorded.',
  right: 'That is what it showed.',
} as const

/** Guided's feedback on an observation it refuses: which parts to look at again, and never what they show. */
export const mismatchText = (wrong: readonly Field[]): string => (wrong.length === 0 ? '' : `Not yet. Look again at ${listed([...new Set(wrong.map((field) => FIELD_PART[field]))])}.`)
/** The same once an observation has been judged. */
export const checkedText = (wrong: readonly Field[]): string => (wrong.length === 0 ? OBSERVATION_TEXT.right : `Not what it showed: ${listed([...new Set(wrong.map((field) => FIELD_PART[field]))])}.`)

// ---------------------------------------------------------------------------
// Which kind

export const KIND_LABEL: Record<KindAnswer, string> = {
  combination: 'Combination',
  decomposition: 'Decomposition',
  'single-replacement': 'Single replacement',
  'double-replacement': 'Double replacement',
  none: 'No reaction',
}
/** What each answer means, in a few words: shown beside it with the record's pattern in letters. It is the same at every vessel, so it gives nothing away. */
export const KIND_MEANS: Record<KindAnswer, string> = {
  combination: 'two things join into one',
  decomposition: 'one thing comes apart',
  'single-replacement': 'an element takes the place of another in a compound',
  'double-replacement': 'two compounds trade partners',
  none: 'nothing changed',
}
/** The five answers, each with its meaning and, for the four kinds, the record's pattern. */
export const kindChoices = (data: ReactionsData): { value: KindAnswer; label: string; means: string; pattern: string | null }[] =>
  KIND_ANSWERS.map((value) => ({ value, label: KIND_LABEL[value], means: KIND_MEANS[value], pattern: data.kinds.find((kind) => kind.id === value)?.pattern ?? null }))

/** An answer as its box words it: its name, what it means and, for the four kinds, the pattern. */
export const kindChoiceLabel = ({ label, means, pattern }: { label: string; means: string; pattern: string | null }): string => `${label}: ${means}${pattern === null ? '' : ` (${pattern})`}`

export const KIND_TEXT = {
  heading: 'Which kind',
  question: 'Which kind of reaction did you see?',
  record: 'Record the kind',
  observeFirst: 'Record what is seen first.',
  right: 'That is the kind.',
  wrong: 'That is not the kind.',
  /** Guided, on an answer it refuses. */
  tryAgain: 'Not that one. Look at what went in and what came out, and try again.',
} as const

// ---------------------------------------------------------------------------
// The equation

export const STATE_LABEL: Record<State, string> = { aq: 'dissolved in water', s: 'solid', l: 'liquid', g: 'gas' }
/** A tile as a screen reader says it: the formula is drawn, and the name is said. */
export const tileLabel = (tile: Tile): string => `${tile.formula}, ${tile.name}`

/** A built equation written out in a line, each term with its coefficient and its state. */
export function equationText(tiles: readonly Tile[], built: Built): string {
  const side = (terms: Built['reactants']) => terms.map((term) => `${term.coefficient === 1 ? '' : term.coefficient}${tiles.find((tile) => tile.speciesId === term.speciesId)?.formula ?? term.speciesId}(${term.state})`).join(' + ')
  return `${side(built.reactants)} → ${side(built.products)}`
}

export const EQUATION_TEXT = {
  heading: 'The equation',
  /** Over the builder. */
  build: 'Build the equation from the tiles: what went in before the arrow, what came out after it. Not every tile is needed.',
  balance: 'Give each thing its state, then set the numbers in front so that the atoms balance.',
  tiles: 'Tiles',
  goesIn: 'Goes in',
  comesOut: 'Comes out',
  kindFirst: 'Say which kind of reaction it is first.',
  /** Where the learner said that nothing reacted. */
  nothingToWrite: 'You said that nothing reacted, so there is no equation to write.',
  /** An equation with an empty side. */
  incomplete: 'Put at least one tile on each side of the arrow.',
  record: 'Record the equation',
  recordAgain: 'Record again',
  recorded: 'Recorded.',
  right: 'The equation is right, and it balances.',
} as const

/** What is wrong with an equation: the kind of thing, and never what would put it right. */
export const PROBLEM_TEXT: Record<Problem, string> = {
  'no-reaction': 'The kind said for this tube is not right, so its equation cannot be.',
  'species-extra': 'Something in the equation does not belong where it is.',
  'species-missing': 'Something is missing from the equation.',
  'state-wrong': 'A state is not right.',
  'not-balanced': 'The atoms do not balance yet: count each element on both sides.',
}

const sideName = (side: Side) => (side === 'reactants' ? 'before the arrow' : 'after the arrow')
/** A place of an equation's row as a sentence speaks of it: "place 2 before the arrow", or "place 2 of 2 before the arrow" where the row has a count of places. */
const placeName = ({ side, index }: At, of: number | null = null) => `place ${index + 1}${of === null ? '' : ` of ${of}`} ${sideName(side)}`

/**
 * Every word the builder of an equation says here (src/app/lab/EquationBuilder.tsx): the row's places are named by
 * the side of the arrow they are on, as the line over the builder speaks of them. None says which tile belongs
 * where. There is no choice of "No reaction" in the builder: that is said as the kind.
 */
export const BUILDER_TEXT: BuilderText = {
  yourEquation: 'Your equation',
  palette: EQUATION_TEXT.tiles,
  slotHelp: 'A tile you tap goes into the place with the thick outline. Tap a place to choose it.',
  full: 'Every place is full. To change one, tap it and then a tile.',
  coefficient: 'Number in front',
  fewer: 'One fewer',
  more: 'One more',
  state: 'State',
  remove: (formula) => `Take ${formula} out`,
  coefficientLimit: 'The number in front is a whole number from 1 to 9.',
  check: EQUATION_TEXT.record,
  change: 'Change',
  cancel: 'Cancel',
  noReaction: null,
  stateName: STATE_LABEL,
  alreadyOnSide: (formula, side) => `${formula} is ${sideName(side)} already.`,
  slotLabel: (at, of, term, active) => `${upper(placeName(at, of))}${term === null ? ', empty' : `: ${term.coefficient === 1 ? '' : `${term.coefficient} `}${term.formula}, ${STATE_LABEL[term.state]}`}${active ? ', chosen' : ''}`,
  slot: {
    placed: (formula, at) => `${formula} is now in ${placeName(at)}.`,
    replaced: (formula, at, was) => `${formula} is now in ${placeName(at)}, in place of ${was}.`,
    exchanged: (formula, at, other, otherAt) => `${formula} is now in ${placeName(at)}, and ${other} in ${placeName(otherAt)}.`,
    takenOut: (formula, side) => `${formula} is taken out from ${sideName(side)}.`,
    coefficient: (formula, coefficient) => `${formula}: ${coefficient} in front.`,
    state: (formula, state) => `${formula}: state (${state}), ${STATE_LABEL[state]}.`,
    term: (formula, at) => `${upper(placeName(at))}: ${formula}`,
    active: (at) => `${upper(placeName(at))} is chosen.`,
    noneActive: 'No place is chosen: every place is full.',
  },
}

/** A catalyst, shown over the arrow of a finished equation once its station counts. */
export const catalystText = (tile: Tile): string => `Over the arrow: ${tile.formula}, ${tile.name}. It sped the reaction and was not used up, so it is on neither side.`

// ---------------------------------------------------------------------------
// The order of the metals

export const ORDER_TEXT = {
  heading: 'The three metals in order',
  /** On the button that asks for it, where there is little room. */
  short: 'Order',
  question: 'Put the three metals in order, the most active first.',
  mostActive: 'Most active',
  leastActive: 'Least active',
  observeFirst: 'Record what is seen in all three tubes first.',
  /** Where the two answers name one metal. */
  sameMetal: 'The most active and the least active cannot be the same metal.',
  record: 'Record the order',
  right: 'That is the order.',
  wrong: 'That is not the order.',
  tryAgain: 'Not that order. Compare the three tubes, and try again.',
} as const
/** An order as its record lists it. */
export const orderText = (order: readonly MetalId[]): string => order.map((metal) => METAL_NAME[metal]).join(', then ')

// ---------------------------------------------------------------------------
// Hints, refusals and how a station came out

/** Guided's hints, each in a closed disclosure: how to think, and neither what a vessel shows nor which answer is right. They are the same at every station. */
export const HINT = {
  observe: 'Look at each part once more and pick the words that fit what is there now, not what was there before.',
  kind: 'Count what went in and what came out. Two things into one? One into two? Did an element change places with part of a compound, or did two compounds trade partners? If you saw no change at all, nothing reacted.',
  equation: 'Start with the things you put together, then the things you ended with. Set each state. Then take one element at a time: count its atoms on both sides, and change a number in front until they match.',
  order: 'The more active a metal is, the faster it bubbles in the acid. One that does not bubble at all is the least active of the three.',
} as const
export const HINT_LABEL = 'Hint'

/** Why an action cannot be done now. None says what a vessel shows or which answer is right. */
export function blockedText(blocked: Blocked): string {
  switch (blocked) {
    case 'station-checked':
      return 'This station has been checked. Work it again to change anything.'
    case 'action-done':
      return 'That has been done already.'
    case 'act-first':
      return OBSERVATION_TEXT.actFirst
    case 'look-first':
      return OBSERVATION_TEXT.lookFirst
    case 'observe-first':
      return KIND_TEXT.observeFirst
    case 'kind-first':
      return EQUATION_TEXT.kindFirst
    case 'nothing-to-write':
      return EQUATION_TEXT.nothingToWrite
    case 'not-all-done':
      return 'Something at this station is still to be recorded.'
    case 'invalid-entry':
      return 'That cannot be recorded as it stands.'
    case 'unknown-station':
      return 'There is no such station.'
    case 'nothing-to-repeat':
      return 'Nothing has been done at this station yet.'
    case 'no-more-runs':
      return 'This station has been worked as many times as the record holds.'
    case 'run-too-long':
      return 'This run holds as much as it can. Work the station again to go on.'
    case 'does-not-match':
      return 'Not yet. Look again.'
    case 'not-right':
      return 'Not that one. Try again.'
    case 'no-reaction':
    case 'species-extra':
    case 'species-missing':
    case 'state-wrong':
    case 'not-balanced':
      return PROBLEM_TEXT[blocked]
  }
}

/** One cause a run does not count for, with its vessel, and never what was right. */
export function reasonText(data: ReactionsData, stationId: StationId, reason: Reason): string {
  if (reason.kind === 'order-wrong') return 'The order of the metals is not right.'
  const vessel = vesselName(data, stationId, reason.vessel)
  if (reason.kind === 'observation-wrong') return `${vessel}: what was recorded is not what it showed.`
  if (reason.kind === 'kind-wrong') return `${vessel}: the kind is not right.`
  return `${vessel}: ${lower(PROBLEM_TEXT[reason.problem])}`
}

/** How a run stands, in a line; the causes of a run that does not count are listed under it. */
export function outcomeText(outcome: RunOutcome): string {
  switch (outcome.state) {
    case 'open':
      return 'Something is still to be done here.'
    case 'to-check':
      return 'Everything is recorded. Check the station.'
    case 'counts':
      return 'This station counts.'
    case 'does-not-count':
      return 'This run does not count. Work the station again.'
  }
}

export const MODE_TEXT: Record<Mode, string> = {
  guided: 'Guided checks each answer as you give it, and has a hint for each.',
  challenge: 'Challenge takes what you record and checks a station when you ask.',
}

/** How far a station has come, for the list of stations. */
export type Progress = 'not-started' | 'under-way' | 'to-check' | 'not-counted' | 'done'
export function progressOf(view: Pick<StationView, 'acted' | 'outcome' | 'done' | 'runs'>): Progress {
  if (view.done) return 'done'
  if (view.outcome.state === 'does-not-count') return 'not-counted'
  if (view.outcome.state === 'to-check') return 'to-check'
  return view.acted || view.runs > 1 ? 'under-way' : 'not-started'
}
export const PROGRESS_TEXT: Record<Progress, string> = {
  'not-started': 'Not started',
  'under-way': 'Under way',
  'to-check': 'Ready to check',
  'not-counted': 'Does not count yet',
  done: 'Counts',
}

/** The notes of a station that is done: the record's own, with their sources. */
export const stationNotes = (data: ReactionsData, stationId: StationId): string[] => stationOf(data, stationId).notes.map((note) => note.value)
export const NOTES_TEXT = {
  heading: 'What happened, and why',
  /** While the station does not count. */
  later: 'What each thing was, and why it happened, is shown here once the station counts.',
} as const

/** The page's own words: its tabs, its buttons and its headings. */
export const PAGE_TEXT = {
  tabs: { primer: 'Primer', lab: 'Lab', record: 'Record' },
  stations: 'Stations',
  mode: 'Mode',
  modes: { guided: 'Guided', challenge: 'Challenge' },
  before: 'Before',
  after: 'After',
  beforeAndAfter: 'Before and after',
  lookedAt: 'looked at',
  felt: 'felt',
  /** Under a look's button until it is pressed. */
  notLooked: 'Not looked at yet.',
  /** In the list of a picture's parts, after a part's name. */
  notLookedAt: 'not looked at yet',
  /** In a picture, under its drawing, while no part is looked at: what to do with it. It is the picture's description, and says nothing of what is seen. */
  explore: 'Hover over or tap each part of a picture to look at it.',
  /** Over the choice of what is asked now, where a station has several tubes: each tube's kind and equation, and the order. */
  oneAtATime: 'One at a time',
  /** A closed disclosure that holds the whole of what the pictures show, in words. */
  inWords: 'The picture in words',
  /** A picture's name: "The tube, drawn". */
  picture: (name: string) => `${name}, drawn`,
  /** Under each of the two pictures of a strip that has burned. */
  whileBurning: 'While it burns',
  afterwards: 'Afterwards',
  change: 'Change',
  cancel: 'Cancel',
  previous: (title: string) => `Previous: ${title}`,
  next: (title: string) => `Next: ${title}`,
  check: 'Check the station',
  workAgain: 'Work the station again',
  /** Asked before a station that counts, or holds entries, is set up again. */
  workAgainAsk: 'Set the station up again? What is recorded in this run stays in the record.',
  readFirst: 'Read first',
  sources: 'Sources',
} as const

export const RECORD_TEXT = {
  heading: 'Record',
  empty: 'Nothing has been recorded yet.',
  run: (index: number) => `Run ${index + 1}`,
  notChecked: 'Not checked',
  /** How a run that was checked came out, in the list of a station's runs: a run left behind is not to be worked again. */
  counts: 'This run counts.',
  doesNotCount: 'This run does not count.',
  nothingRecorded: 'Nothing recorded',
  kind: 'Kind',
  equation: 'Equation',
  order: 'Order',
} as const

export const SOURCES_TEXT = 'What this station shows, its hazards, the kinds of reaction and the formulas on the tiles each rest on a source that was read. The sources of the answers are listed once the station counts.'

/** Every station's name, for the list. */
export const stationNames = (data: ReactionsData): { id: StationId; name: string }[] => STATION_IDS.map((id) => ({ id, name: stationName(data, id) }))
