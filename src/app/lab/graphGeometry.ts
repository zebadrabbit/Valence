// Where things are in the picture of a logger's graph: the calorimetry lab's and the freezing point depression
// lab's. The picture is 480 by 280 of its own units and is scaled as a whole; a unit is a pixel where the picture
// is 480 px wide, which is about what the narrowest window that shows a bench (768 px, with the menu open) leaves
// it. Nothing here is chemistry: a step of the logger and a temperature come in, and a place comes out. A
// temperature is a whole number of the lab's own units, tenths of a degree in the one lab and hundredths in the
// other, and the lab's scale says how its axis is cut in those units.

/** The picture: its size, and the room about the plot: at its head for the callout of the reading looked at, at its left and its foot for the numbers of the two axes and their names. */
export const GRAPH = { width: 480, height: 280, left: 46, right: 14, top: 36, bottom: 46 } as const
const PLOT = { wide: GRAPH.width - GRAPH.left - GRAPH.right, tall: GRAPH.height - GRAPH.top - GRAPH.bottom }
/** The fewest steps the time axis spans, in minutes: two, so that a logger just started is not one point alone on an axis of no length. */
const LEAST_MINUTES = 2

/** How a lab's temperature axis is cut, in the units its readings come in. */
export interface Scale {
  /** The least room the axis leaves over the highest reading and under the lowest. */
  room: number
  /** The least the axis spans, so that a level line is drawn level and not as a zigzag of its last figure. */
  leastSpan: number
  /** The sizes a mark of the axis may be, the smallest first. */
  marks: readonly number[]
  /** What both ends of the axis are whole multiples of, where that is finer than its marks. Left out, both ends are marks. */
  ends?: number
}
/** Readings in tenths of a degree, on marks of whole degrees: half a degree of room, and two degrees at the least. The calorimetry lab's. */
export const TENTHS: Scale = { room: 5, leastSpan: 20, marks: [10, 20, 50, 100, 200] }

export interface Axes {
  /** The time axis runs from step 0 to this one, a whole number of minutes. */
  steps: number
  /** The temperature axis, in the readings' own units. */
  low: number
  high: number
  /** How far apart the marks of the temperature axis are, in the readings' own units, and those of the time axis, in steps. */
  degreeMark: number
  timeMark: number
}

/** The first of some sizes that leaves no more than `most` marks on an axis of this length; the last of them otherwise. */
const markFor = (length: number, most: number, sizes: readonly number[]) => sizes.find((size) => length / size <= most) ?? sizes.at(-1)!

/**
 * The two axes for the readings so far, one for each step from 0. The time axis ends on a whole minute with at
 * least one step of room after the latest reading, so that the picture is not drawn anew at every press of Run on
 * and the latest point is never on its edge. The temperature axis takes in every reading with room over and
 * under, and ends on its own marks, or on the finer multiples its scale names.
 */
export function axesOf(readings: readonly number[], stepSeconds: number, scale: Scale = TENTHS): Axes {
  const perMinute = 60 / stepSeconds
  const steps = Math.max(LEAST_MINUTES * perMinute, Math.ceil(readings.length / perMinute) * perMinute)
  // Room over and under, so that the ring about a reading that is looked at is inside the plot.
  const lowest = Math.min(...readings) - scale.room
  const highest = Math.max(...readings) + scale.room
  const degreeMark = markFor(Math.max(scale.leastSpan, highest - lowest), 8, scale.marks)
  const end = scale.ends ?? degreeMark
  const low = Math.floor(lowest / end) * end
  let high = Math.ceil(highest / end) * end
  while (high - low < scale.leastSpan) high += end
  return { steps, low, high, degreeMark, timeMark: markFor(steps / perMinute, 6, [1, 2, 5, 10, 20]) * perMinute }
}

/** How far in from the temperature axis the first reading is drawn, so that its point does not lie on the axis's line and numbers. */
const INSET = 10
/** Where a step of the logger is across the picture. */
export const xOf = (axes: Axes, step: number): number => GRAPH.left + INSET + (step / axes.steps) * (PLOT.wide - INSET)
/** Where a temperature is down the picture. */
export const yOf = (axes: Axes, value: number): number => GRAPH.top + PLOT.tall - ((value - axes.low) / (axes.high - axes.low)) * PLOT.tall

/** The marks of the temperature axis, from its foot up: the first is the axis's own foot wherever that is a mark. */
export function degreeMarks(axes: Axes): { value: number; y: number }[] {
  const marks = []
  for (let value = Math.ceil(axes.low / axes.degreeMark) * axes.degreeMark; value <= axes.high; value += axes.degreeMark) marks.push({ value, y: yOf(axes, value) })
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

// What a key and a step button move to is the shell's (./exploreKeys.ts), handed on here under the same names.
export { keyTarget, stepTarget } from './exploreKeys'

/** The plot's own corners, for what is drawn the plot's whole height or width. */
export const PLOT_EDGE = { left: GRAPH.left, right: GRAPH.width - GRAPH.right, top: GRAPH.top, bottom: GRAPH.height - GRAPH.bottom } as const
