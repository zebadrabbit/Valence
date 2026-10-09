// Where things are in the picture of the spectroscope's strip. The picture is 640 by 112 of its own units and is
// scaled as a whole; a unit is a pixel where the picture is 640 px wide, and the picture is never drawn narrower
// than MIN_WIDTH_PX (below that its card scrolls sideways). Nothing here is chemistry: a wavelength comes in and a
// place comes out.

/** The picture: its size, the room left of 400 nm and right of 780 nm, and where the strip and its scale lie. */
export const STRIP = { width: 640, height: 112, pad: 24, top: 4, tall: 76 } as const
/**
 * The narrowest the picture is drawn, in px: what the narrowest window that shows a bench (768 px, with the menu
 * open) leaves it, so that at no such width does the strip have to be scrolled to see its far end.
 */
export const MIN_WIDTH_PX = 440
/** The narrowest a line's or a band's hit area is, in units: 44 px where the picture is at its narrowest, and a unit over, so that no rounding leaves it a hair short. */
export const HIT_MIN = Math.ceil((44 * STRIP.width) / MIN_WIDTH_PX) + 1
/** How wide a line is drawn at the least: a pair of lines too close to tell apart is drawn as wide as the pair. */
export const LINE_WIDTH = 3
/**
 * What sets a sharp line apart from a broad band, so that a line beside a band, or inside one, is not taken for the
 * band's bright edge (barium's line stands 3.5 nm from the end of its band). A line is drawn the strip's whole
 * height with a dark gap of LINE_GAP either side of it, cut out of whatever is under it; a band is drawn short of
 * the strip's top and foot by BAND_INSET, so a line stands taller than any band.
 */
export const LINE_GAP = 2.5
export const BAND_INSET = 9
/** How far the edge of a hit area keeps from a thin thing beside a wide one. */
const CLEAR = 8
export interface Scale {
  fromNm: number
  toNm: number
}

/** Where a wavelength is across the picture. */
export const xOf = (scale: Scale, nm: number): number => STRIP.pad + ((nm - scale.fromNm) / (scale.toNm - scale.fromNm)) * (STRIP.width - 2 * STRIP.pad)

/** The marks of the scale: one every 20 nm, with a number at every 100 nm and at the scale's end. */
export function ticks(scale: Scale): { nm: number; x: number; numbered: boolean }[] {
  const marks = []
  for (let nm = scale.fromNm; nm <= scale.toNm; nm += 20) marks.push({ nm, x: xOf(scale, nm), numbered: nm % 100 === 0 || nm === scale.toNm })
  return marks
}

/** How strongly a line or a band is drawn, by its rank among its salt's: the brightest whole, the others fainter. */
export const brightness = (rank: number): number => (rank === 1 ? 1 : rank === 2 ? 0.75 : 0.55)

export interface Extent {
  from: number
  to: number
}

/**
 * The hit area of each thing on the strip, in the order given: as wide as the thing is drawn and never narrower
 * than `min`, so that a thin line is a target a finger finds. No two overlap: the picture is cut between each two
 * neighbours, half-way between where one ends and the next begins (a little into a wide one that has a thin one
 * beside it), and each keeps to its own side of the cut, moved off-centre where that is what leaves it its width. Where a loop that was not clean puts one thing inside
 * another, or crowds several together, a cut is moved so that each has half of `min` at the least, which the
 * picture always has room for; such an area lies beside its line more than over it.
 * ponytail: half of `min` is 22 px at the picture's narrowest, under the 44 px a finger is given elsewhere. It is
 * met only with a loop that was not clean; stack such areas in two rows if they are found hard to tap.
 */
export function hitAreas(extents: readonly Extent[], min = HIT_MIN, width: number = STRIP.width): Extent[] {
  const centre = (at: number) => (extents[at]!.from + extents[at]!.to) / 2
  const order = extents.map((_, at) => at).sort((a, b) => centre(a) - centre(b))
  const thin = (at: number) => extents[at]!.to - extents[at]!.from < min
  const cuts = [
    0,
    ...order.slice(1).map((next, k) => {
      const [left, right] = [extents[order[k]!]!, extents[next]!]
      let cut = (left.to + right.from) / 2
      // A thin thing beside a wide one: the cut stands off from the thin one, into the wide one, so that the area's edge is not drawn over a line.
      if (thin(next) && !thin(order[k]!)) cut = Math.min(cut, right.from - CLEAR)
      if (thin(order[k]!) && !thin(next)) cut = Math.max(cut, left.to + CLEAR)
      return Math.min(Math.max(cut, centre(order[k]!)), centre(next))
    }),
    width,
  ]
  // Each side of a cut at least half of `min` wide: pushed from the short end, then from the long end.
  const least = Math.min(min / 2, width / order.length)
  for (let k = 1; k < order.length; k++) cuts[k] = Math.max(cuts[k]!, cuts[k - 1]! + least)
  for (let k = order.length - 1; k > 0; k--) cuts[k] = Math.min(cuts[k]!, cuts[k + 1]! - least)
  const areas: Extent[] = []
  order.forEach((at, k) => {
    const [left, right] = [cuts[k]!, cuts[k + 1]!]
    const wanted = Math.max(extents[at]!.to - extents[at]!.from, min)
    if (right - left <= wanted) return void (areas[at] = { from: left, to: right })
    const from = Math.min(Math.max(centre(at) - wanted / 2, left), right - wanted)
    areas[at] = { from, to: from + wanted }
  })
  return areas
}
