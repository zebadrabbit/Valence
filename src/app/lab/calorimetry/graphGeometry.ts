// Where things are in the picture of the logger's graph. The picture is 480 by 280 of its own units and is scaled
// as a whole; a unit is a pixel where the picture is 480 px wide, which is about what the narrowest window that
// shows a bench (768 px, with the menu open) leaves it. Nothing here is chemistry: a step of the logger and a
// temperature in tenths of a degree come in, and a place comes out.

/** The picture: its size, and the room about the plot: at its head for the callout of the reading looked at, at its left and its foot for the numbers of the two axes and their names. */
export const GRAPH = { width: 480, height: 280, left: 46, right: 14, top: 36, bottom: 46 } as const
const PLOT = { wide: GRAPH.width - GRAPH.left - GRAPH.right, tall: GRAPH.height - GRAPH.top - GRAPH.bottom }
/** The fewest steps the time axis spans, in minutes: two, so that a logger just started is not one point alone on an axis of no length. */
const LEAST_MINUTES = 2
/** The least room the temperature axis leaves over the highest reading and under the lowest, in tenths of a degree. */
const ROOM = 5
/** The least the temperature axis spans, in tenths of a degree: two degrees, so that a level line is drawn level and not as a zigzag of tenths. */
const LEAST_SPAN = 20

export interface Axes {
  /** The time axis runs from step 0 to this one, a whole number of minutes. */
  steps: number
  /** The temperature axis, in tenths of a degree; both ends are marks of the axis. */
  low: number
  high: number
  /** How far apart the marks of the temperature axis are, in tenths of a degree, and those of the time axis, in steps. */
  degreeMark: number
  timeMark: number
}

/** The first of some sizes that leaves no more than `most` marks on an axis of this length; the last of them otherwise. */
const markFor = (length: number, most: number, sizes: readonly number[]) => sizes.find((size) => length / size <= most) ?? sizes.at(-1)!

/**
 * The two axes for the readings so far, in tenths of a degree, one for each step from 0. The time axis ends on a
 * whole minute with at least one step of room after the latest reading, so that the picture is not drawn anew at
 * every press of Run on and the latest point is never on its edge. The temperature axis takes in every reading
 * with room over and under, and ends on its own marks.
 */
export function axesOf(readings: readonly number[], stepSeconds: number): Axes {
  const perMinute = 60 / stepSeconds
  const steps = Math.max(LEAST_MINUTES * perMinute, Math.ceil(readings.length / perMinute) * perMinute)
  // Half a degree over and under, so that the ring about a reading that is looked at is inside the plot.
  const lowest = Math.min(...readings) - ROOM
  const highest = Math.max(...readings) + ROOM
  const degreeMark = markFor(Math.max(LEAST_SPAN, highest - lowest), 8, [10, 20, 50, 100, 200])
  const low = Math.floor(lowest / degreeMark) * degreeMark
  let high = Math.ceil(highest / degreeMark) * degreeMark
  while (high - low < LEAST_SPAN) high += degreeMark
  return { steps, low, high, degreeMark, timeMark: markFor(steps / perMinute, 6, [1, 2, 5, 10, 20]) * perMinute }
}

/** Where a step of the logger is across the picture. */
export const xOf = (axes: Axes, step: number): number => GRAPH.left + (step / axes.steps) * PLOT.wide
/** Where a temperature, in tenths of a degree, is down the picture. */
export const yOf = (axes: Axes, tenths: number): number => GRAPH.top + PLOT.tall - ((tenths - axes.low) / (axes.high - axes.low)) * PLOT.tall

/** The marks of the temperature axis, from its foot up. */
export function degreeMarks(axes: Axes): { tenths: number; y: number }[] {
  const marks = []
  for (let tenths = axes.low; tenths <= axes.high; tenths += axes.degreeMark) marks.push({ tenths, y: yOf(axes, tenths) })
  return marks
}

/** The marks of the time axis, each at a whole number of minutes. */
export function timeMarks(axes: Axes, stepSeconds: number): { minutes: number; x: number }[] {
  const marks = []
  for (let step = 0; step <= axes.steps; step += axes.timeMark) marks.push({ minutes: (step * stepSeconds) / 60, x: xOf(axes, step) })
  return marks
}

/**
 * The part of the picture that is each reading's button: a column the plot's whole height, from halfway to the
 * reading before it to halfway to the one after, so that the columns leave no gap and a pointer or a finger
 * anywhere on the plot is on the reading nearest to it.
 */
export function columns(count: number, axes: Axes): { from: number; to: number }[] {
  return Array.from({ length: count }, (_, step) => ({ from: Math.max(0, xOf(axes, step - 0.5)), to: Math.min(GRAPH.width, xOf(axes, step + 0.5)) }))
}

/** The reading a key moves to from reading `at` of `count`: the arrow keys one reading back or on, Home and End to the first and the last. Null for any other key, and where there is no reading that way. */
export function keyTarget(key: string, at: number, count: number): number | null {
  const to = { ArrowLeft: at - 1, ArrowRight: at + 1, Home: 0, End: count - 1 }[key]
  return to === undefined || to === at || to < 0 || to >= count ? null : to
}

/** The reading a step back or on from the one last looked at lands on; from none, the first going on and the latest going back. Null where there is no reading that way. */
export function stepTarget(by: -1 | 1, at: number | null, count: number): number | null {
  const to = at === null ? (by === 1 ? 0 : count - 1) : at + by
  return to < 0 || to >= count ? null : to
}

/** The plot's own corners, for what is drawn the plot's whole height or width. */
export const PLOT_EDGE = { left: GRAPH.left, right: GRAPH.width - GRAPH.right, top: GRAPH.top, bottom: GRAPH.height - GRAPH.bottom } as const
