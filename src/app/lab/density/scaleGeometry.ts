import type { ScaleView } from '@/engine/density'

// Where the marks of a scale are drawn. Everything is in thousandths of the scale's unit, as the engine hands a
// scale over, and in the units of a drawing's viewBox. Nothing here knows what a scale reads: a mark's place comes
// in and a place in the picture comes out.

/** A stretch of a scale: the whole of it, or the part a closer look shows. */
export interface Stretch {
  fromE3: number
  toE3: number
}

/** What a scale is drawn from: a ScaleView has it, and so has an empty cylinder, whose scale shows no level. */
export type Marked = Pick<ScaleView, 'fromE3' | 'toE3' | 'markE3' | 'numberE3'>

/** A mark with a number beside it, the mark halfway between two numbers where a scale has ten marks to a number, or any other. */
export type MarkKind = 'numbered' | 'half' | 'minor'
export interface ScaleMark {
  atE3: number
  kind: MarkKind
  /** The number as the scale prints it, with a true minus sign; null for a mark with none. */
  label: string | null
}

const isMultiple = (value: number, of: number) => Math.abs(value % of) === 0

/** The marks of a scale within a stretch of it, in order: none beyond either end of the scale. */
export function marksIn(scale: Marked, stretch: Stretch): ScaleMark[] {
  const perNumber = scale.numberE3 / scale.markE3
  const halves = perNumber >= 10 && perNumber % 2 === 0
  const first = Math.ceil(Math.max(stretch.fromE3, scale.fromE3) / scale.markE3) * scale.markE3
  const marks: ScaleMark[] = []
  for (let atE3 = first; atE3 <= Math.min(stretch.toE3, scale.toE3); atE3 += scale.markE3) {
    const numbered = isMultiple(atE3, scale.numberE3)
    marks.push({ atE3, kind: numbered ? 'numbered' : halves && isMultiple(atE3, scale.numberE3 / 2) ? 'half' : 'minor', label: numbered ? String(atE3 / 1000 + 0).replace('-', '−') : null })
  }
  return marks
}

/**
 * The stretch a closer look shows: the engine's, two marks on either side of the two an edge stands between,
 * and, where that holds no numbered mark, as much more as reaches the nearer one. A millimetre ruler is numbered
 * each centimetre, so five of its marks can stand between two numbers with neither in sight: a mark is then
 * counted from nothing. No other scale of the lab needs it.
 */
export function closerStretch(view: Pick<ScaleView, 'closeUp'> & Marked): Stretch {
  const { fromE3, toE3 } = view.closeUp
  const below = Math.floor(fromE3 / view.numberE3) * view.numberE3
  const above = Math.ceil(toE3 / view.numberE3) * view.numberE3
  if (Math.ceil(fromE3 / view.numberE3) * view.numberE3 <= toE3) return view.closeUp
  const down = { fromE3: below, toE3 }
  const up = { fromE3, toE3: above }
  if (below < view.fromE3) return up
  if (above > view.toE3) return down
  return fromE3 - below <= above - toE3 ? down : up
}

/** How many gaps between marks a stretch holds. */
export const gapsIn = (scale: Marked, stretch: Stretch) => Math.round((stretch.toE3 - stretch.fromE3) / scale.markE3)

/**
 * Where a value stands along a drawing `length` long, with `before` of the drawing ahead of the stretch's first
 * value and `after` beyond its last.
 */
export const along =
  (stretch: Stretch, length: number, before: number, after: number) =>
  (atE3: number): number =>
    before + ((atE3 - stretch.fromE3) / (stretch.toE3 - stretch.fromE3)) * (length - before - after)

/** A closer look's room at either end: half a gap, so that its first and last marks stand clear of the picture's edge. */
export const closerPad = (scale: Marked, stretch: Stretch, length: number) => length / (2 * (gapsIn(scale, stretch) + 1))

/** How far apart two marks of a closer look are drawn, in the units of its viewBox. */
export const closerGap = (scale: Marked, stretch: Stretch, length: number) => length / (gapsIn(scale, stretch) + 1)
