import type { Left } from '@/engine/acetone'

// How this lab's page plays the time of a run. The playing itself is the shared piece of the two labs on the
// kinetics engine (src/app/lab/kinetics/play.ts), handed on here under the names this lab's page and its tests
// use: it reads no clock, and from the frame that shows the end of a run the watch adds true time. What is this
// lab's own is the speed.

/**
 * How many seconds of the lab's time pass in one true second while the colour of a run is still to be seen: sixty,
 * so that a second on the page is a minute on the watch, which the page says beside the running watch
 * (messages.ts). One figure for all four mixtures, so that what the lab is about is felt as well as read: the
 * mixture with twice the iodine takes twice as long to fade on the screen too, and the two with twice the acetone
 * or twice the acid half as long. The slowest run, the fourth mixture, whose fade takes up to 785 s of the lab's
 * time at any room and scatter the draw can give, is then watched for about 13 true seconds at the most, and the
 * fastest for two (watch.test.ts holds both over seeds 1 to 100).
 */
export const SPEED = 60

/**
 * How far off the end of a run must still be when a step of the fade comes, in true milliseconds, for the status
 * line to say the step. A status line's sentences are said to a listener one after another, and a sentence takes
 * a second or two to say: a step said just before the end holds the end back in a listener's ear, and the end is
 * what the watch is stopped by. At the one speed the faintest yellow comes 0.2 to 0.7 true seconds before the end
 * in every mixture, and is never said; pale yellow comes 2.0 to 3.3 seconds before it in the first and the fourth
 * mixture, where it is said, and 1.0 to 1.6 in the second and the third, where the end alone is said
 * (watch.test.ts holds all of it over seeds 1 to 100). The look is in words beside the watch at every frame
 * whatever is said. The figure is the page's own, and no screen reader was listened to in choosing it.
 */
export const SAY_MS = 1800

/**
 * Whether a step of the fade leaves room to be said before the end. `stepMicroMolar` is the amount of iodine
 * under which the step's word begins, and `left` what the engine says is left when the watch reads `labMs`, at
 * any frame from the step on. The fade is steady, so the time from the step to the end is to the time so far as
 * the step's amount is to the amount gone: no time of a run is asked for.
 */
export function roomToSay(labMs: number, left: Left, stepMicroMolar: number): boolean {
  const gone = left.ofMicroMolar - left.microMolar
  return gone > 0 && (labMs * stepMicroMolar) / gone >= SAY_MS * SPEED
}

export { endsItself, firstChanged, frame, handStop, labMsAt, PLAY, startPlay, tooSoon, type Play } from '@/app/lab/kinetics/play'
