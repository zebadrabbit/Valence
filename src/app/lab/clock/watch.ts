import type { RunId } from '@/chem-data/clock/data'

// How the page plays the time of a run. The engine reads no clock: the page holds the true time of the pour and
// of each frame, works out from them what the watch reads in the lab's time, and asks the engine what the liquid
// looks like then. Nothing here reads a clock either: the true time comes in as a number of milliseconds, from any
// origin, so the whole of it is tested without one.
//
// Until the liquid changes, the lab's time runs faster than a clock. The five mixtures of part 1 are all played at
// one speed, so that what the lab is about is felt as well as read: the mixture with twice the acid turns four
// times sooner on the screen too. Each bath of part 3 has a speed of its own, since ten minutes in ice water and
// forty seconds in warm water cannot both be waited for at one, and the page says so beside the watch. From the
// frame the change is shown in, the watch runs at a clock's own speed: what it reads when a hand stops it is then
// the time of the change with the hand's own delay added in true seconds, which is the time the engine records
// (spec 19.2).

/**
 * How many seconds of the lab's time pass in one true second while a run on the bench, at the room's temperature,
 * is waited for: one figure for all of them. The page's own: chosen so that the slowest mixture changes no more
 * than 12 true seconds after its pour at any room and scatter the draw can give (the fifth, at 20.0 °C and 1%
 * slow, takes 164 s of the lab's time); the fastest then changes in two to three (watch.test.ts holds both over
 * seeds 1 to 100). The figure is not shown.
 */
export const ROOM_SPEED = 14

/**
 * The speed of every run. A run in a bath has its own, chosen so that each changes between 5 and 12 true seconds
 * after its pour at every seed (watch.test.ts).
 */
export const SPEED: Record<RunId, number> = {
  'mixture-1': ROOM_SPEED,
  'mixture-2': ROOM_SPEED,
  'mixture-3': ROOM_SPEED,
  'mixture-4': ROOM_SPEED,
  'mixture-5': ROOM_SPEED,
  'bath-ice': 55,
  'bath-cool': 30,
  'bath-warm': 5,
}

// The playing itself is the shared piece (src/app/lab/kinetics/play.ts), handed on here under the names this lab's
// page and its tests use.
export { endsItself, firstChanged, frame, handStop, labMsAt, PLAY, startPlay, tooSoon, type Play } from '@/app/lab/kinetics/play'
