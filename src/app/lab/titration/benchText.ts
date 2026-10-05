import type { PlumeStatus } from '@/engine/titration'
import type { BenchControl, BenchView } from './benchView'
import { BURETTE_CAPACITY_UL } from './buretteGeometry'
import { flaskColour } from './flaskColour'
import { POUR_ADDITIONS, type Stream } from './stream'

// What the bench says in words: the status line under the flask, the description of the drawn stand, and what each
// action says it did. Each is worked from the bench's view alone, and the colour's name is the drawn colour's own,
// so the words cannot say one thing and the drawing another.
// Rule: no sentence here states a volume finer than a whole mL.

type Display = { pinkDisplayScale: number; faintPinkNameLimit: number }

/** The cue of the last addition, as the status line says it. */
export const PLUME_TEXT: Record<PlumeStatus, string> = {
  'fades-at-once': 'pink fades at once',
  'fades-slowly': 'pink fades slowly',
  persists: 'pink persists',
}

const colourLabel = ({ flask }: BenchView, display: Display) => flaskColour({ ...flask, hasLiquid: flask.hasAliquot, ...display }).label

/**
 * What a swirl and wait found, in the status line and in the message line alike. Not "no pink remains": the model's
 * flask is closed, so a wait finds no pink only in a flask that was not pink before it.
 */
const FOUND = { persisted: 'the pink has lasted', faded: 'no pink' }

/**
 * The status line: the flask's colour, then the last addition's cue, or what a swirl and wait found in its place.
 * It is the same text for every addition until the colour's name or the cue changes, so a live region speaks only then.
 */
export function flaskStatus(view: BenchView, display: Display): string {
  const colour = `Flask: ${colourLabel(view, display)}.`
  // An overshot flask has no cue: its colour says it.
  if (!view.flask.hasAliquot || view.flask.overshot) return colour
  if (view.flask.indicatorDrops === 0) return `${colour} No indicator in it.`
  if (view.persistence !== 'unchecked') return `${colour} Swirled 30 s: ${FOUND[view.persistence]}.`
  return view.plume ? `${colour} Last addition: ${PLUME_TEXT[view.plume]}.` : colour
}

/** The burette's level to a whole mL: "between the 12 mL and 13 mL marks". */
export function levelBracket(levelUl: number): string {
  const lastMl = BURETTE_CAPACITY_UL / 1000
  if (levelUl >= BURETTE_CAPACITY_UL) return `at the ${lastMl} mL mark, the bottom of the scale`
  const ml = Math.floor(levelUl / 1000)
  return `between the ${ml} mL and ${ml + 1} mL marks`
}

/** The drawn stand in words, for a learner who cannot see it: the burette, the stopcock, then the flask. */
export function describeStand(view: BenchView, stream: Stream, display: Display): string {
  const { burette, flask } = view
  const drops = flask.indicatorDrops
  return [
    burette.filled ? `The burette holds NaOH solution; its level is ${levelBracket(burette.levelUl)}.` : 'The burette is empty.',
    ...(burette.tipBubble ? ['There is an air bubble in the tip below the stopcock.'] : []),
    `The stopcock is ${stream.open ? 'open' : 'closed'}.`,
    flask.hasAliquot
      ? `The conical flask under the burette holds the acid with ${drops === 0 ? 'no indicator' : drops === 1 ? '1 drop of indicator' : `${drops} drops of indicator`}; the liquid is ${colourLabel(view, display)}.`
      : 'The conical flask under the burette is empty.',
  ].join(' ')
}

/** What opening and closing the stopcock say. The additions of a stream say nothing: a pour says the same from its first addition to its last. */
export function streamMessage(stream: Stream): string {
  if (!stream.open) return 'Stopcock closed.'
  if (stream.pour === null) return 'Stopcock open: NaOH is running into the flask. Press again to close it.'
  // A test holds the two pours to 1 mL and 5 mL of the model's stream addition.
  return `Running in ${stream.pour === POUR_ADDITIONS[0] ? 1 : 5} mL, then the stopcock closes. Press again to close it sooner.`
}

const ADDITION_TEXT = {
  drop: ['Drop added.', 'Another drop added.'],
  half: ['Half-drop added: part of a drop, touched off on the flask wall and rinsed in.', 'Another half-drop added.'],
} as const

/** What a drop or half-drop says; never the same text as `previous`, so a live region speaks on every press. */
export function additionMessage(amount: 'drop' | 'half', previous: string): string {
  const [first, again] = ADDITION_TEXT[amount]
  return previous === first ? again : first
}

const SWIRLED = 'Flask swirled for 30 seconds'

/** What each prep action says it did. The same in both modes: none says whether the step was needed or done well. */
export const ACTION_TEXT: Record<Exclude<BenchControl, 'deliver'>, string> = {
  conditionBurette: 'Burette rinsed with NaOH solution and drained through the tip. It is empty now.',
  // The two that move the meniscus say what became of a reading taken before them, and do not say to take one now:
  // after a first fill there is still the tip to look at.
  fillBurette: 'Burette filled with NaOH solution to near the top of its scale. An initial reading recorded before this fill no longer applies.',
  clearTipBubble:
    'A little NaOH was run through the tip and the air bubble is out. The level in the burette has fallen, so an initial reading recorded before this no longer applies.',
  rinsePipette: 'Pipette rinsed with a little HCl, which was let drain to waste.',
  pipetteAliquot: 'HCl pipetted into the flask.',
  addIndicatorDrop: 'One drop of phenolphthalein added to the flask.',
  addWater: 'Flask wall rinsed down with distilled water.',
  swirlAndWait: `${SWIRLED}.`,
}

/**
 * What a wash, a drop or a half-drop adds to its message when it undid a swirl and wait that had shown the pink to
 * last; `before` and `after` are the views either side of the action. The engine clears the wait, and a final
 * reading with it, whenever the flask changes. It ends with what to do next: the wait again while the flask is still
 * pink, a half-drop where a wash has thinned the pink away. Empty when no pink had lasted, so the drops of an
 * ordinary titration say nothing of it, and when the action ended the trial, which leaves nothing to do in it.
 */
export function undoneText(before: BenchView, after: BenchView): string {
  if (before.persistence !== 'persisted' || after.trialEnd !== 'open') return ''
  const undone = 'The flask has changed since the swirl and wait, so that wait no longer counts, and a final reading recorded after it no longer applies.'
  return after.flask.pink ? `${undone} Swirl and wait again before the final reading.` : `${undone} The water has thinned the pink until it no longer shows, so add a half-drop.`
}

/** What a swirl and wait says in the message line: that it was done, what it found, and what a pink that lasted allows. */
export function swirlText(persistence: 'faded' | 'persisted'): string {
  return `${SWIRLED}: ${FOUND[persistence]}.${persistence === 'persisted' ? ' The final reading can be taken.' : ''}`
}

/**
 * Guided's hint, shown for as long as the engine gives it. The stopcock is closed for the learner once, when the
 * hint first shows, and can be opened again, so the line does not say what the stopcock is doing now. It shows again
 * on a flask that a wash has thinned from pink to colourless, beside undoneText's "add a half-drop", so it sets a
 * limit ("no more than a drop") and does not say to go by drops. It first shows with the stream's own "pink fades
 * slowly" in the status line, and the next drop's pink fades at once, so it says that the sign for half-drops is a
 * single drop's pink.
 */
export const SLOW_DOWN_TEXT =
  "Slow down: the endpoint is near. If the stopcock was open, it was closed when this hint appeared. Add no more than a drop at a time, and change to half-drops when a single drop's pink is slow to fade."

/** For a press that came just after the stopcock closed by itself, and was dropped so that it would not open it again. */
export const STOPCOCK_ALREADY_CLOSED = 'The stopcock is already closed: it closed by itself a moment ago, so that press did nothing.'
