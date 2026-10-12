// How a page plays the time of a run, for the two labs on the kinetics engine. The engine reads no clock: the page
// holds the true time of the pour and of each frame, works out from them what the watch reads in the lab's time,
// and asks the engine what the liquid looks like then. Nothing here reads a clock either: the true time comes in
// as a number of milliseconds, from any origin, so the whole of it is tested without one (the clock reaction
// lab's watch.test.ts and the iodination of acetone lab's).
//
// Until the liquid changes, the lab's time runs faster than a clock, at a speed that is each lab's own to choose
// (its watch.ts). From the frame the change is shown in, the watch runs at a clock's own speed: what it reads when
// a hand stops it is then the time of the change with the hand's own delay added in true seconds, which is the
// time the engine records (spec 19.2).

/**
 * For how long a run is played at its own speed, in true milliseconds, and how long the watch then takes to run
 * on to where it stops itself. A run that will change has changed long before the first is up; one in which
 * nothing will ever show is ended by the watch's limit, and is not waited for at the run's speed.
 *
 * `deafMs` is for how long after the pour the bench takes no press. The page changes under the hand at the pour:
 * focus goes to Stop, and the watch's card stands where the flasks' was. So a press that comes twice (a second
 * Enter, a double click, a double tap) would land on Stop, and the run would not count; or, on an upright tablet,
 * where the pour stood over both, on the other way of stopping, which would then stay pressed unasked. No run
 * changes so soon: the fastest of either lab takes about two true seconds.
 */
export const PLAY = { steadyMs: 20_000, runOnMs: 4_000, deafMs: 500 } as const

/** Whether a press at the true time `now` comes too soon after the pour to be meant: it is then the pour's own, come twice. */
export const tooSoon = (play: Pick<Play, 'startedAt'>, now: number): boolean => now - play.startedAt < PLAY.deafMs

/** What the watch reads, in whole milliseconds of the lab's time, `realMs` of true time after the pour, while the liquid has not changed. */
export function labMsAt(realMs: number, speed: number, limitMs: number): number {
  const real = Math.max(0, realMs)
  if (real <= PLAY.steadyMs) return Math.min(limitMs, Math.round(real * speed))
  const steady = Math.min(limitMs, PLAY.steadyMs * speed)
  return Math.min(limitMs, Math.round(steady + ((real - PLAY.steadyMs) / PLAY.runOnMs) * (limitMs - steady)))
}

/** The first millisecond after `fromMs`, and no later than `toMs`, at which the liquid has changed: it has at `toMs` and had not at `fromMs`. */
export function firstChanged(changed: (labMs: number) => boolean, fromMs: number, toMs: number): number {
  let [before, after] = [fromMs, toMs]
  while (after - before > 1) {
    const middle = Math.floor((before + after) / 2)
    if (changed(middle)) after = middle
    else before = middle
  }
  return after
}

/** A run that is being played. */
export interface Play {
  /** The true time of the pour, in milliseconds. */
  startedAt: number
  /** What the watch reads, in whole milliseconds of the lab's time. */
  labMs: number
  /** Once the change has been shown: the true time of the frame that showed it, and what the watch read at the change. */
  shown: { at: number; labMs: number } | null
}

export const startPlay = (now: number): Play => ({ startedAt: now, labMs: 0, shown: null })

/**
 * The play at a frame drawn at the true time `now`. `changed` is the engine's word on the liquid at a time on the
 * watch. In the frame that first finds the liquid changed, the watch reads the time of the change itself, to the
 * millisecond, and not the time the frame had come to; from then on it adds true time.
 */
export function frame(play: Play, now: number, speed: number, limitMs: number, changed: (labMs: number) => boolean): Play {
  if (play.shown !== null) return { ...play, labMs: Math.min(limitMs, play.shown.labMs + Math.max(0, Math.round(now - play.shown.at))) }
  const labMs = Math.max(play.labMs, labMsAt(now - play.startedAt, speed, limitMs))
  if (!changed(labMs)) return { ...play, labMs }
  const at = changed(play.labMs) ? play.labMs : firstChanged(changed, play.labMs, labMs)
  return { ...play, labMs: at, shown: { at: now, labMs: at } }
}

/**
 * What a hand that stops the watch at the true time `now` hands the engine, from the play as that moment's frame
 * has it: what the watch reads, and how long ago the change was shown, in true milliseconds; 0 where it has not
 * been. Both whole, and neither past the watch's limit. Nor is the delay more than the watch had left to run when
 * the change was shown: the engine's time is the time of the change with the delay added, and a frame can come
 * long after the one before it (a computer that slept with the page showing), so a delay taken whole would give a
 * stopped watch that reads more than its limit, and more than the running watch ever read.
 */
export const handStop = (play: Play, now: number, limitMs: number): { elapsedMs: number; delayMs: number } => ({
  elapsedMs: play.labMs,
  delayMs: play.shown === null ? 0 : Math.min(Math.max(0, limitMs - play.shown.labMs), Math.max(0, Math.round(now - play.shown.at))),
})

/**
 * What ends a run with no hand on the watch: the change, once it is shown, where the learner has asked for the
 * watch to be stopped at it; and the watch's own limit. Null while the run goes on.
 */
export function endsItself(play: Play, limitMs: number, atChange: boolean): 'change' | 'limit' | null {
  if (atChange && play.shown !== null) return 'change'
  return play.labMs >= limitMs ? 'limit' : null
}
