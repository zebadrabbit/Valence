import type { Look } from '@/chem-data/reactions/data'
import type { Bubbles, VesselShows } from '@/engine/reactions'
import { contentsEnd } from '@/app/lab/Tube'

// Where everything in the picture of a vessel is: the types of reactions lab's tube with its piece of metal, and
// its burner with the tongs (spec 24.2). Nothing here is chemistry, and nothing is drawn by chance: a picture is
// worked out from what the engine says is seen of a vessel (VesselShows) and from nothing else. A picture is 240
// of its own units wide, and a unit is a pixel wherever it has 240 px. Where three tubes stand in a row each is
// drawn `narrow`, 160 wide, with its piece of metal close beside it: an upright tablet has the width for three of
// those at very nearly full size, and not for three of the wide ones.

/** How wide a picture is, and how tall the room under its drawing is, on the same white card, where what a part shows is said while the part is looked at: a narrow picture's line breaks more often and has more room. */
export const sizeOf = (narrow: boolean) => ({
  width: narrow ? 160 : 240,
  height: DRAWING + (narrow ? 96 : 72),
})
/** How tall the drawing is: the tube as src/app/lab/Tube.tsx draws one of this height, or the burner and the tongs. */
export const DRAWING = 200
/** The line everything stands on. */
export const BENCH = DRAWING - 24
const END = contentsEnd(DRAWING)
/** Where the surface of the fullest tube of the lab is drawn. */
const HIGHEST = 62

/**
 * Where the surface of a tube's liquid is drawn, where the fullest tube of the lab holds `full`. More liquid
 * stands higher, and an addition shows, but not to scale: no liquid is drawn lower than 45% of the height of the
 * most, as the other labs' tubes are (src/app/lab/tubeDrawing.ts).
 */
export const surfaceOf = (microlitres: number, full: number): number => Math.round(END - (0.45 + 0.55 * Math.min(1, microlitres / full)) * (END - HIGHEST))

/** How far across a tube is drawn from where Tube.tsx draws one: a tube with no metal stands in the middle of its card, one with a piece of metal has the piece beside it, and a narrow picture's tube is at its left. */
export const shiftOf = (shows: Pick<VesselShows, 'metal'>, narrow: boolean): number => (narrow ? -28 : shows.metal === null ? 32 : 0)

/** A piece of metal where it stands in the liquid, by the tube's own measure, and where it lies on the bench beside the tube: a bar, by its corner, its width and its height. */
export const PIECE = {
  placed: { x: 80, y: 112, width: 16, height: 60 },
  beside: { x: 152, y: BENCH - 13, width: 60, height: 12 },
  besideNarrow: { x: 109, y: BENCH - 13, width: 42, height: 12 },
} as const

/**
 * The bubbles of each kind, each by where it is and how large. They are told apart with nothing moving: three
 * small ones just over the metal where it bubbles slowly; fourteen, larger, about the metal and up to the surface
 * where it bubbles fast; seven of a middling size through the liquid where the record says only that there are
 * bubbles. A tube with none has none drawn. Every one is under the surface of the least full tube that bubbles.
 */
export const BUBBLES: Record<Exclude<Bubbles, 'none'>, readonly (readonly [cx: number, cy: number, r: number])[]> = {
  slow: [
    [88, 105, 2.5],
    [93, 95, 2.5],
    [86, 86, 2.5],
  ],
  fast: [
    [84, 106, 4],
    [96, 104, 5],
    [74, 100, 3.5],
    [105, 97, 4.5],
    [88, 94, 5.5],
    [66, 92, 4],
    [99, 87, 4],
    [78, 88, 5],
    [111, 88, 3.5],
    [90, 85, 3.5],
    [70, 130, 3.5],
    [106, 126, 4],
    [69, 152, 3],
    [108, 148, 3.5],
  ],
  some: [
    [66, 150, 4],
    [104, 138, 4.5],
    [84, 160, 3.5],
    [96, 112, 4],
    [72, 118, 3.5],
    [88, 96, 4.5],
    [108, 160, 3.5],
  ],
}

/** The burner, and the tips of the tongs where they are held beside it and where they are held in its flame. */
export const FLAME = { x: 60, top: 54, foot: 112 } as const
export const TONGS = {
  beside: { x: 150, y: 112 },
  inFlame: { x: 86, y: 80 },
} as const
/** Where the light of the strip is drawn: about the top of the flame. */
export const LIGHT = { x: 60, y: 80, r: 30 } as const

/**
 * The pictures a vessel is drawn as. A tube is one. So is a strip that has not burned. A strip that has burned is
 * two, side by side: the tongs in the flame while the strip burns, with its light, and the tongs afterwards, with
 * what is left in them. What a vessel shows after its action is one state, and the light and the powder are not
 * seen at one moment: each has a picture, and nothing moves.
 */
export type Scene = 'whole' | 'burning' | 'afterwards'
export const scenesOf = (shows: VesselShows): readonly Scene[] => (shows.drawn === 'flame' && shows.light !== null && shows.residue !== null ? ['burning', 'afterwards'] : ['whole'])

/** A part of a picture that is looked at: the look it is, and where its button lies over the drawing. */
export interface Part {
  at: Look
  left: number
  top: number
  width: number
  height: number
}

/**
 * The parts of one picture, for the looks its vessel has. In a tube: the piece of metal, beside the tube or in the
 * liquid; the liquid, over the piece where there is one; a solid, which is looked for through the whole liquid;
 * and the hand beside the tube, which feels it. At the burner: the strip, or its light; and the jaws of the tongs,
 * or what is left in them. Every part is 44 units or more each way, and no two of a picture lie over each other.
 */
export function partsOf(shows: VesselShows, looks: readonly Look[], scene: Scene, surface: number, narrow = false): Part[] {
  const has = (look: Look) => looks.includes(look)
  if (shows.drawn === 'flame') {
    const flame: Part =
      scene === 'whole' && !shows.metal?.placed && shows.light === null
        ? { at: 'flame', left: 96, top: 86, width: 50, height: 52 }
        : {
            at: 'flame',
            left: LIGHT.x - 33,
            top: LIGHT.y - 33,
            width: 66,
            height: 66,
          }
    const left: Part = scene === 'whole' ? { at: 'solid', left: 146, top: 86, width: 52, height: 52 } : { at: 'solid', left: 122, top: 84, width: 56, height: 56 }
    return [...(has('flame') && scene !== 'afterwards' ? [flame] : []), ...(has('solid') && scene !== 'burning' ? [left] : [])]
  }
  const dx = shiftOf(shows, narrow)
  const band = (at: Look, top: number, bottom: number): Part => ({
    at,
    left: 50 + dx,
    top,
    width: 76,
    height: bottom - top,
  })
  const top = surface - 10
  const placed = shows.metal?.placed === true
  // The piece in the liquid has the foot of the tube, and the liquid what is over it; with no piece in it the liquid is one part.
  const split = placed && has('metal') ? PIECE.placed.y + 6 : END
  const parts: Part[] = []
  if (has('liquid')) parts.push(band('liquid', top, split))
  else if (has('solid')) parts.push(band('solid', top, split))
  if (has('metal') && shows.metal !== null) parts.push(placed ? band('metal', split, END) : narrow ? { at: 'metal', left: 102, top: BENCH - 50, width: 56, height: 52 } : { at: 'metal', left: 142, top: BENCH - 50, width: 80, height: 52 })
  if (has('touch')) parts.push({ at: 'touch', left: 142 + dx, top: 84, width: 62, height: 62 })
  return parts
}
