// Where the rings and electron dots of a Bohr diagram go, in SVG units (1 unit is 1 px at full size).

import type { Point } from './lewisLayout'

export type BohrLayout = {
  /** The diagram is a square of this side, centred on the nucleus at [0, 0]. */
  size: number
  nucleus: number
  /** One ring per shell, innermost first, with a dot for each of its electrons. */
  rings: { radius: number; electrons: Point[] }[]
}

export const NUCLEUS_RADIUS = 15
export const ELECTRON_RADIUS = 2.5
const RING_STEP = 14
const MARGIN = 6

/** `shells` is the electrons per shell, innermost first. The dots of a shell are spaced evenly, starting at the top. */
export function bohrLayout(shells: readonly number[]): BohrLayout {
  const rings = shells.map((count, i) => {
    const radius = NUCLEUS_RADIUS + RING_STEP * (i + 1)
    return {
      radius,
      electrons: Array.from({ length: count }, (_, k): Point => {
        const angle = (2 * Math.PI * k) / count - Math.PI / 2
        return [radius * Math.cos(angle), radius * Math.sin(angle)]
      }),
    }
  })
  return { size: 2 * (NUCLEUS_RADIUS + RING_STEP * shells.length + MARGIN), nucleus: NUCLEUS_RADIUS, rings }
}
