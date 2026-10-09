import type { Feature, FlameData } from '@/chem-data/flame/data'
import { FLAME, HANDLING, choicesFor, type Blocked, type Flame, type Loop, type Mode, type Observation, type Question, type Seen, type StationView, type Warning } from '@/engine/flame'
import type { ClosingProgress, Progress } from './stationLook'

// Every sentence the flame test lab says that is chemistry, keyed by the engine's identifiers, so that an
// identifier with no sentence does not compile. A sentence can say only what it is handed: the lab's record and
// what the engine works out from it. The notes shown when a station is done, and what the strip leaves out, are in
// the record itself, with their sources (src/chem-data/flame/flame.json); this module words everything else.
//
// What a callout says of a line or a band is where it is, its colour, which of the two it is and how bright it is
// beside the others, and never what gives it: that is the station's notes', once the station is done. From
// STATION_TEXT down is what the page says that is not chemistry: its headings, its buttons and the names of its
// controls.

const saltOf = (data: FlameData, saltId: string) => {
  const index = data.salts.findIndex((salt) => salt.id === saltId)
  if (index < 0) throw new Error(`no station "${saltId}"`)
  return { salt: data.salts[index]!, number: index + 1 }
}
const listed = (items: readonly string[]) => (items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`)
/** "Barium chloride solution, 0.1 M" as it is said inside a sentence: "barium chloride solution". */
const solution = (data: FlameData, saltId: string) => {
  const { name } = saltOf(data, saltId).salt
  return (name[0]!.toLowerCase() + name.slice(1)).replace(/, [\d.]+ M$/, '')
}

/** "Station 1: Barium chloride solution, 0.1 M". */
export function stationTitle(data: FlameData, stationId: string): string {
  const { salt, number } = saltOf(data, stationId)
  return `Station ${number}: ${salt.name}`
}

/** What a solution looks like in its bottle: "colourless solution", "light blue-green solution". */
export const appearanceText = (data: FlameData, stationId: string) => `${saltOf(data, stationId).salt.appearance.value.name} solution`

/** The station's three steps and its two things to look at, as spec 15.2 names them. */
export const BENCH_TEXT = {
  bottle: 'The bottle',
  loop: 'The loop',
  flame: 'The flame',
  spectroscope: 'The spectroscope',
  observations: 'What you saw',
  clean: 'Clean the loop',
  dip: 'Dip the loop',
  hold: 'Hold the loop in the flame',
  through: 'Look through the spectroscope',
  /** Under "Clean the loop": what the one step is. */
  cleaning: 'Rinsed in distilled water and held in the flame until the flame shows no colour.',
  /** Before the loop is held in the flame at a station. */
  notHeld: 'The loop has not been held in the flame at this station yet.',
  /** Beside the flame and the strip once the loop is held: what to do with them. */
  explore: 'Point at the flame, and at each line and band on the strip, or tap it or move to it with the keyboard, to look at it.',
  hints: 'Hints',
  /** The name of the closed list of what a correct observation holds: it says what opening it shows. */
  expected: 'What a correct observation holds',
  notes: 'Notes on this station',
  leftOut: 'What the strip leaves out',
  check: 'Check observations',
  done: 'Station done: the observation is correct and was made with a clean loop.',
  complete: 'The lab is complete: six observations, each made with a clean loop, and the closing question.',
} as const

/**
 * The loop's state in words: what it carries now. Given a station, it also says whether that is clean for the
 * station. It names what was done to the loop and never what the flame will show for it.
 */
export function loopText(data: FlameData, loop: Loop, stationId?: string): string {
  const handled = loop.includes(HANDLING)
  const salts = loop.filter((entry) => entry !== HANDLING).map((id) => solution(data, id))
  if (!handled && salts.length === 0) return 'The loop is clean: it carries nothing.'
  if (handled && salts.length === 0) return 'The loop has been handled and has not been cleaned.'
  const carries = `${handled ? 'The loop has been handled and has not been cleaned, and it carries' : 'The loop carries'} ${listed(salts)}`
  if (handled || salts.length > 1) return `${carries}. It is not clean.`
  return stationId === undefined || loop[0] === stationId ? `${carries} and nothing else.` : `${carries}. It has not been cleaned since.`
}

/** What the flame looks like, as its callout and its description say it: the colour always in words. */
export function flameText(flame: Flame): string {
  const names = flame.colours.map((colour) => colour.name)
  if (names.length === 0) return 'The flame shows no colour.'
  return names.length === 1 ? `The flame is ${names[0]}.` : `The flame is a mixture of colours: ${listed(names)}.`
}

/** A wavelength as a callout gives it, to the nearest nanometre. */
const near = (nm: number) => String(Math.round(nm))

/** Where a line or a band is, its colour and which it is: "a sharp line near 589 nm, yellow"; "a broad band from about 614 to 640 nm, orange-red". A band whose limits no source gives is said to be near where its sources put it. */
export function featureText(feature: Feature): string {
  if (feature.kind === 'line') return `a sharp line near ${near(feature.wavelengthNm.value)} nm, ${feature.colour}`
  if (!feature.approximate) return `a broad band from about ${near(feature.fromNm)} to ${near(feature.toNm)} nm, ${feature.colour}`
  return `a broad band near ${feature.fromNm === feature.toNm ? near(feature.fromNm) : `${near(feature.fromNm)} to ${near(feature.toNm)}`} nm, ${feature.colour}`
}

/** A line or a band by where it is alone, for a list of what has been looked at: "the line near 589 nm". */
export function featureName(feature: Feature): string {
  const words = featureText(feature)
  return `the ${words.slice(words.indexOf(feature.kind), words.lastIndexOf(','))}`
}

/** True where one thing on the strip is the brightest: a clean loop. On a loop that carries several salts each has a brightest of its own, and the model does not rank one salt's light against another's. */
const oneBrightest = (spectrum: readonly Seen[]) => spectrum.filter((seen) => seen.feature.prominence === 1).length === 1

/** How bright a line or a band is beside the others on the strip, in words, so that the brightest can be told without seeing the picture. */
export function brightnessText(seen: Seen, spectrum: readonly Seen[]): string {
  const brightest = seen.feature.prominence === 1
  if (spectrum.length === 1) return 'It is the only thing on the strip.'
  if (oneBrightest(spectrum)) return brightest ? 'It is the brightest thing on the strip.' : 'It is fainter than the brightest thing on the strip.'
  return brightest ? 'It is one of the brightest things on the strip.' : 'It is one of the fainter things on the strip.'
}

/** What is said when a line or a band is looked at: where it is, its colour, which it is, how bright it is, and that its limits or its second line are not shown where that is so. */
export function featureCallout(seen: Seen, spectrum: readonly Seen[]): string {
  const { feature } = seen
  const words = featureText(feature)
  const more = feature.kind === 'band' ? (feature.approximate ? ' Its limits are not given: it is drawn a little wider than where it is brightest.' : '') : feature.pairedWithNm ? ' It is two lines too close together to tell apart here.' : ''
  return `${words[0]!.toUpperCase()}${words.slice(1)}. ${brightnessText(seen, spectrum)}${more}`
}

/** What a look shows: the flame's colour, or a line's or a band's callout. */
export function lookText(view: Pick<StationView, 'flame' | 'spectrum'>, at: string): string {
  if (at === FLAME) return view.flame === null ? BENCH_TEXT.notHeld : flameText(view.flame)
  const seen = view.spectrum.find((one) => one.feature.id === at)
  return seen ? featureCallout(seen, view.spectrum) : 'There is nothing there.'
}

/** What is looked at, as the list beside the picture names it: "The flame", "The line near 589 nm". */
export function lookName(view: Pick<StationView, 'spectrum'>, at: string): string {
  if (at === FLAME) return 'The flame'
  const seen = view.spectrum.find((one) => one.feature.id === at)
  if (!seen) return 'Nothing'
  const name = featureName(seen.feature)
  return name[0]!.toUpperCase() + name.slice(1)
}

/** The description in words of the flame (spec 15.5): what its callout says. */
export const describeFlame = (flame: Flame): string => flameText(flame)

/**
 * The description in words of the whole spectroscope view (spec 15.5): the scale, every line and band along it
 * from the violet end, and which is the brightest where one is. It says what the strip shows and no more: not what
 * gives a line or a band, and not which answer a question wants.
 */
export function describeSpectrum(data: FlameData, spectrum: readonly Seen[]): string {
  const scale = `The scale runs from ${data.scale.fromNm} nm at the violet end to ${data.scale.toNm} nm in the deep red.`
  if (spectrum.length === 0) return `${scale} Nothing shows on the strip.`
  const things = spectrum.map((seen) => featureText(seen.feature))
  const list = spectrum.length === 1 ? `One thing shows on the strip: ${things[0]}.` : `On the strip, from the violet end: ${things.join('; ')}.`
  const brightest = spectrum.filter((seen) => seen.feature.prominence === 1).map((seen) => featureName(seen.feature))
  const which = spectrum.length === 1 ? '' : brightest.length === 1 ? ` The brightest is ${brightest[0]}.` : ` The brightest are ${listed(brightest)}: the loop carries more than one salt, and each has a brightest of its own.`
  return `${scale} ${list}${which}`
}

/** What each question asks. */
export const QUESTION_LABEL: Record<Question, string> = {
  colour: 'Colour of the flame',
  range: 'Where on the scale the brightest thing is',
  kind: 'What the brightest thing is',
}
/** A question as feedback names it, inside a sentence. */
const QUESTION_NAME: Record<Question, string> = {
  colour: 'the colour of the flame',
  range: 'where on the scale the brightest thing is',
  kind: 'whether the brightest thing is a line or a band',
}

/** A choice as it is shown: a colour by its name, a range as "600 to 650 nm", and the two kinds spelt out. */
export function choiceLabel(question: Question, choice: string): string {
  if (question === 'range') return `${choice.replace('-', ' to ')} nm`
  if (question === 'kind') return choice === 'line' ? 'a sharp line' : 'a broad band'
  return choice
}

/** A question's choices with the label each is shown by. */
export const choiceList = (data: FlameData, question: Question) => choicesFor(data, question).map((value) => ({ value, label: choiceLabel(question, value) }))

/** An observation as lines of text, one for each question: what was recorded, or what a correct one holds. */
export const observationLines = (observation: Observation): string[] => (Object.keys(QUESTION_LABEL) as Question[]).map((question) => `${QUESTION_LABEL[question]}: ${choiceLabel(question, observation[question])}`)

/** Under a question that is not open yet: what to look at first. */
export const LOOK_FIRST: Record<Question, string> = {
  colour: 'Look at the flame first.',
  range: 'Look at every line and band on the strip first.',
  kind: 'Look at every line and band on the strip first.',
}

/** The hints of every station: how to observe, and nothing of what any one flame shows. */
export const HINTS: readonly string[] = [
  'Clean the loop before you dip it, every time. A loop that was not cleaned brings the last salt, or sodium from your fingers, into this flame.',
  'Look at the flame before you look through the spectroscope, and name its colour from the flame itself.',
  'On the strip, look at every line and band. Each says where it is on the scale and how bright it is beside the others.',
  'A sharp line is at one place on the scale. A broad band covers a stretch of it, from one number to another.',
  'Find the brightest thing first. Then choose the range that holds it, and say whether it is a line or a band.',
]

/** Why an observation does not count: what the loop carried that it should not have, and what to do. It names the cause and nothing of what the flame showed. */
export function uncleanText(data: FlameData, cause: { handled: boolean; carried: readonly string[] }): string {
  const handled = cause.handled ? 'it had been handled and never cleaned, so it carried a trace of sodium' : ''
  const carried = cause.carried.length > 0 ? `it still carried ${listed(cause.carried.map((id) => solution(data, id)))} from ${cause.carried.length === 1 ? 'an earlier dip' : 'earlier dips'}` : ''
  const why = [handled, carried].filter(Boolean).join(', and ')
  return `This observation does not count, whatever it holds: the loop was not clean. When it went into the flame ${why}. Clean the loop, dip it again, hold it in the flame and observe this station again.`
}

/**
 * Feedback on a recorded observation. One made with a loop that was not clean is told that and why, and nothing
 * of its answers. Otherwise: which questions to look at again, and never what their answers should be.
 */
export function observationFeedback(data: FlameData, view: Pick<StationView, 'counts' | 'cause' | 'wrong'>): string {
  if (view.counts === null) return ''
  if (!view.counts) return uncleanText(data, view.cause!)
  const wrong = view.wrong ?? []
  return wrong.length === 0 ? 'That is what this flame shows.' : `Not yet. Look again at ${listed(wrong.map((question) => QUESTION_NAME[question]))}.`
}

/** Guided's warning before a loop that is not clean is dipped. */
export const WARNING_TEXT: Record<Warning, { title: string; body: string }> = {
  'loop-not-clean': {
    title: 'The loop is not clean',
    body: 'It still carries what it last touched: another salt, or sodium from being handled. That will go into the flame with this solution, the flame and the strip will show both, and an observation made that way does not count. Clean the loop first, then dip it.',
  },
}
/** The two buttons of the warning: one way back and one way on. */
export const WARNING_BUTTONS = { back: 'Go back and clean it', on: 'Dip it anyway' } as const

/** Why an action cannot be done now. */
export const BLOCKED_TEXT: Record<Blocked, string> = {
  'lab-completed': 'The lab is complete. Restart the lab to work the stations again.',
  'unknown-station': 'There is no such station.',
  'not-dipped': "Dip the loop in this station's solution first.",
  'not-held': 'Hold the loop in the flame first.',
  'nothing-there': 'There is nothing there to look at.',
  'not-looked': 'Some questions are not open yet. Each says under it what to look at first.',
  'invalid-entry': 'Choose one answer for each question.',
  'stations-not-done': 'The closing question opens when all six stations are done.',
}

/** What each mode does in this lab (spec 15.2), beside its radio button. */
export const MODE_TEXT: Record<Mode, string> = {
  guided: 'Guided: each station shows its hints from the start, has what a correct observation holds ready to open, and warns you before you dip a loop that is not clean.',
  challenge: 'Challenge: no warning about the loop. A station shows no hints and nothing of what a correct observation holds until you have recorded an observation there that counts: one made with a clean loop.',
}

/**
 * The closing question (spec 15.2), asked in both modes when the six stations are done. Each choice has its label
 * and what is said when it is given. A wrong one is told why it cannot be the answer, from what the learner has
 * seen at the bench, and not what the answer is; the right one is told why it is, and what it has to do with the
 * periodic table's cards.
 */
export const CLOSING = {
  heading: 'One last question',
  question: 'All six bottles hold a chloride, dissolved in water, and the same loop went into the same flame at every station. So what gives each flame its colour?',
  waits: BLOCKED_TEXT['stations-not-done'],
  choices: {
    chloride: 'The chloride in each bottle',
    gas: 'The gas the burner burns',
    loop: 'The wire of the loop',
    metal: 'The metal in each bottle',
    water: 'The water in each bottle',
  } as Record<string, string>,
  feedback: {
    chloride: 'Not this. Every one of the six bottles holds chloride, and the six flames were six different colours. What is the same in all six cannot be what makes them differ.',
    gas: 'Not this. The burner burnt the same gas at every station, and the flame took its colour only when a loop that carried a salt was held in it.',
    loop: 'Not this. It was the same loop at every station, and a loop is clean when it gives the flame no colour at all.',
    metal:
      "Yes. The chloride, the water, the loop and the gas were the same at all six stations. Only the metal changed, and the colour changed with it. For sodium and potassium the light is the light of the metal's own atoms: sharp lines. For calcium, strontium, barium and copper most of it is the light of a molecule that the metal forms in the flame: broad bands. That is why the flames of those four are not the colour of the lines on the element's card of the periodic table, which shows lines of the atom alone.",
    water: 'Not this. Every bottle holds water, and the loop was rinsed in water each time it was cleaned: a cleaned loop gives the flame no colour.',
  } as Record<string, string>,
} as const

/** What is said when the closing question is answered: the feedback of the choice given. */
export const closingFeedback = (answer: string | null): string => (answer === null ? '' : (CLOSING.feedback[answer] ?? ''))

/** The list of stations, where the one shown stands in it, and the two ways on. The closing question is the list's last entry. */
export const STATION_TEXT = {
  list: 'Stations',
  place: (number: number, total: number) => `Station ${number} of ${total}`,
  /** Over the closing question's heading, where a station has its place. */
  closingPlace: 'After the six stations',
  previous: (title: string) => `Previous: ${title}`,
  next: (title: string) => `Next: ${title}`,
}

/** How far a station has come, in the list and on its card, beside a mark that says the same. */
export const PROGRESS_TEXT: Record<Progress, string> = {
  'not-started': 'Not started',
  started: 'Started',
  'not-counted': 'Recorded with a loop that was not clean',
  'not-correct': 'Recorded, not correct yet',
  done: 'Done',
}
/** The same for the closing question. */
export const CLOSING_PROGRESS_TEXT: Record<ClosingProgress, string> = {
  waits: 'Opens when the six stations are done',
  open: 'Not answered yet',
  'not-correct': 'Answered, not correct yet',
  done: 'Done',
}

const lower = (text: string) => `${text[0]!.toLowerCase()}${text.slice(1)}`

/**
 * A line or a band that has not been looked at yet, as the list under the strip and its button name it: by its
 * place in the count along the strip and nothing else. Which of the two it is, where it is and its colour are what
 * a look at it says, and its name is those words from then on (lookName).
 */
export const unseenName = (number: number, total: number) => `Line or band ${number} of ${total}, counting from the violet end`

/** The name of the button laid over a part of a picture: what a press does, and whether it has been done. */
export const lookLabel = (name: string, looked: boolean) => `Look at ${lower(name)}${looked ? `, ${PAGE_TEXT.lookedAt}` : ''}`

/** The page's own headings, buttons and names of controls. */
export const PAGE_TEXT = {
  /** On the bottle's tile, before what the solution looks like in its bottle: "Looks: colourless solution". */
  looks: 'Looks',
  flamePicture: "The burner's flame with the loop held in it",
  stripPicture: 'What the spectroscope shows: a dark strip over a scale in nanometres',
  /** Under the scale's numbers. */
  axis: 'Wavelength in nanometres (nm)',
  /** After the name of a part of a picture, in the list beside it and in the name of the part's button. */
  lookedAt: 'looked at',
  notLookedAt: 'not looked at yet',
  /** Beside the flame once the loop has been cleaned or dipped again since it was held there: the picture is of the hold, not of the loop as it is. */
  heldBefore: 'This is what the loop gave when it was last held in the flame here. The loop has changed since: hold it in the flame again to see what it gives now.',
  /** Beside a question whose recorded answer is not what the flame shows, until it is answered again. */
  lookAgain: 'Look again',
  change: 'Change',
  cancel: 'Cancel',
  /** The button of the closing question, and what it says when no answer is chosen. */
  checkAnswer: 'Check answer',
  chooseAnswer: 'Choose one answer.',
  /** In Challenge, where the hints and the expected observation will be. */
  challengeHidden: 'In Challenge, the hints and what a correct observation holds come once you have recorded an observation here that counts.',
  /** The link under a station's notes, to the card of its metal: "Barium on the periodic table". */
  elementCard: (metal: string) => `${metal[0]!.toUpperCase()}${metal.slice(1)} on the periodic table`,
  sources: 'The colours the flame and the strip are drawn in, what a loop that was not clean shows, and whether an observation is correct are worked out by Valence from these values. The hints are written by Valence.',
} as const

/** The Record tab. */
export const RECORD_TEXT = {
  region: 'Record of the six stations',
  caption: 'What was recorded at each of the six stations, as it was last checked',
  station: 'Station',
  result: 'Result',
  notRecorded: 'Not recorded yet',
  correct: 'Correct',
  notCorrect: 'Not correct yet',
  /** An observation made with a loop that was not clean: nothing of it is judged. */
  notCounted: 'Does not count: the loop was not clean',
  /** Before the closing question's answer, as it was last given. */
  answer: 'Answer given',
  notAnswered: 'Not answered yet',
} as const

