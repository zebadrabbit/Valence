import { chapterAt, type Chapter, type Mechanism } from '@/mechanisms'

// The timeline's slider and its three buttons, as plain functions of the scrub position.

/** The slider's range: the track in thousandths, so that its value is a whole number and a chapter's start is given back exactly. */
export const TRACK = 1000
/** One press of an arrow key on the slider: half a hundredth of the track. Every chapter and every keyframe starts on one. */
export const SLIDER_STEP = 5
export const sliderValue = (t: number) => Math.round(t * TRACK)
export const fromSlider = (value: number) => value / TRACK

/**
 * How long Play takes over the whole track, in milliseconds. The track is not linear in time (a step of
 * picoseconds has as much room as one of seconds), so this is a pace for the eye and says nothing of the reaction.
 */
export const PLAY_MS = 60_000
/** The longest stretch of time one frame may stand for: a frame that comes late does not make the timeline leap. */
const LONGEST_FRAME_MS = 100

/** Where playing has got to from `t` after `elapsedMs`: forward at the one pace, and never past the end. */
export const playedTo = (t: number, elapsedMs: number) => Math.min(1, t + Math.min(elapsedMs, LONGEST_FRAME_MS) / PLAY_MS)

/** Where a press of Previous or Next goes: a place on the track, and the chapter that starts there, or null where it is an end of the track. */
export type Way = { to: number; chapter: Chapter | null }

/**
 * Where Previous and Next go from the scrub position: to the start of the chapter before the one it is in, and to
 * the start of the one after. In the first chapter Previous goes to the start of the track, and in the last Next
 * goes to its end, which is where the timeline is completed. Null where there is nowhere further to go.
 */
export function ways(mechanism: Mechanism, t: number): { previous: Way | null; next: Way | null } {
  const at = mechanism.chapters.indexOf(chapterAt(mechanism, t))
  const [before, after] = [mechanism.chapters[at - 1], mechanism.chapters[at + 1]]
  return {
    previous: before ? { to: before.range[0], chapter: before } : t > 0 ? { to: 0, chapter: null } : null,
    next: after ? { to: after.range[0], chapter: after } : t < 1 ? { to: 1, chapter: null } : null,
  }
}
