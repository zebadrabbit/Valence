// Where things are in the picture of part 3's graph. The picture is 480 by 280 of its own units and is scaled as a
// whole, as the calorimetry lab's is. Nothing here is chemistry: one over a temperature, in millionths of a
// reciprocal kelvin, and a natural logarithm, in thousandths, come in, and a place comes out.

/** The picture: its size, and the room about the plot: at its head for the callout of the place looked at, at its left and its foot for the numbers of the two axes and their names. */
export const GRAPH = { width: 480, height: 280, left: 46, right: 18, top: 36, bottom: 46 } as const
export const PLOT_EDGE = { left: GRAPH.left, right: GRAPH.width - GRAPH.right, top: GRAPH.top, bottom: GRAPH.height - GRAPH.bottom } as const
/** How far in from each end of the bottom axis the first and the last place are drawn, so that neither lies on an edge of the plot. */
const INSET = 14

export interface Spot {
  xMicro: number
  yMilli: number
}

export interface Axes {
  /** The bottom axis runs from the first place on the line to the last. */
  from: number
  to: number
  /** The side axis, in thousandths; both ends are marks of the axis, `mark` apart. */
  low: number
  high: number
  mark: number
}

/** The two axes: the bottom one from the first place to the last, and the side one taking in every spot drawn, with a little room, and ending on its own marks. */
export function axesOf(places: readonly Spot[], points: readonly Spot[]): Axes {
  const heights = [...places, ...points].map((spot) => spot.yMilli)
  const [lowest, highest] = [Math.min(...heights) - 100, Math.max(...heights) + 100]
  const mark = [500, 1000, 2000, 5000].find((size) => (highest - lowest) / size <= 7) ?? 5000
  return { from: places[0]!.xMicro, to: places.at(-1)!.xMicro, low: Math.floor(lowest / mark) * mark, high: Math.ceil(highest / mark) * mark, mark }
}

/** Where one over a temperature is across the picture. */
export const xOf = (axes: Axes, xMicro: number): number => PLOT_EDGE.left + INSET + ((xMicro - axes.from) / (axes.to - axes.from)) * (PLOT_EDGE.right - PLOT_EDGE.left - 2 * INSET)
/** Where a logarithm is down the picture. */
export const yOf = (axes: Axes, yMilli: number): number => PLOT_EDGE.bottom - ((yMilli - axes.low) / (axes.high - axes.low)) * (PLOT_EDGE.bottom - PLOT_EDGE.top)

/** The marks of the side axis, from its foot up. */
export function sideMarks(axes: Axes): { yMilli: number; y: number }[] {
  const marks = []
  for (let yMilli = axes.low; yMilli <= axes.high; yMilli += axes.mark) marks.push({ yMilli, y: yOf(axes, yMilli) })
  return marks
}

/** The marks of the bottom axis: every other place on the line, from the second, so that the figures do not run together. */
export const bottomMarks = (axes: Axes, places: readonly Spot[]): { xMicro: number; x: number }[] => places.filter((_, at) => at % 2 === 1).map((place) => ({ xMicro: place.xMicro, x: xOf(axes, place.xMicro) }))

/**
 * The part of the picture that is each place's button: a column the plot's whole height, from halfway to the
 * place before it to halfway to the one after, so that the columns leave no gap and a pointer or a finger anywhere
 * on the plot is on the place nearest to it.
 */
export function columns(places: readonly Spot[], axes: Axes): { from: number; to: number }[] {
  const xs = places.map((place) => xOf(axes, place.xMicro))
  return xs.map((x, at) => ({ from: at === 0 ? PLOT_EDGE.left : (xs[at - 1]! + x) / 2, to: at === xs.length - 1 ? PLOT_EDGE.right : (x + xs[at + 1]!) / 2 }))
}
