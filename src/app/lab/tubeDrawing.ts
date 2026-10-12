import type { TubeShows } from '@/engine/tubeShows'
import { contentsEnd, type TubeLayers } from './Tube'

// What a tube shows, turned into what is drawn of it: the Group I cations lab's, the Le Chatelier's principle
// lab's and the red cabbage pH lab's, whose engines hand a page the one shape (src/engine/tubeShows.ts). Nothing here is chemistry: a tube is
// drawn from what an engine says is seen of it, and the words for each part of it are each lab's own messages.

/** How tall the picture of such a tube is, of its own units (Tube.tsx). */
export const TUBE_HEIGHT = 260
const END = contentsEnd(TUBE_HEIGHT)
/** Where the surface of a tube filled as far as its bench fills one is drawn. */
const FULL = 98
/** Where a solid that has settled begins. Every solid is drawn at this one height: the engines give no amounts of solid. */
const SOLID_TOP = 192

/** Where the bottom of the tube, which is looked at for a solid, begins: 58 units over the foot. */
const BOTTOM = END - 58

/** The two parts of such a tube that are looked at, as both engines name them. */
export type TubeLook = 'liquid' | 'bottom'

/**
 * The two sections of the tube that are looked at, from the top, each by where it begins and ends: the liquid, and
 * the bottom, where a solid settles. Both are there whatever the tube holds, so a look at the liquid of a tube with
 * none in it finds that out. The liquid's begins a little over its surface, and is 58 units tall at the least,
 * as the bottom's is.
 */
export function sectionsOf(layers: Pick<TubeLayers, 'liquid'>): readonly (readonly [look: TubeLook, top: number, bottom: number])[] {
  return [
    ['liquid', Math.min((layers.liquid?.surface ?? BOTTOM) - 12, BOTTOM - 58), BOTTOM],
    ['bottom', BOTTOM, END],
  ]
}

// The colour each thing is drawn in, by the word a lab's record stores for what is seen. The word, which a look
// says, is what has a source; a value here is the drawing's rendering of that word, and nothing is read from it. A
// liquid with no colour is drawn as water is on the other labs' white cards. The Le Chatelier's principle lab
// turns on its liquids' colours, so its five are chosen to differ in how light they are as well as in hue: from
// the darkest, blue, violet, the colour between blue and yellow, pink, yellow. That one has no name in the record,
// for want of a source that names the middle of methyl violet's range: it is drawn half way between this blue and
// this yellow in lightness, chroma and hue (OKLCH), and a test holds it there.
const LIQUID_HEX: Record<string, string> = {
  colourless: '#e8edf2',
  'yellow to orange': '#f2a93b',
  yellow: '#f6d93f',
  'between blue and yellow': '#00ae96',
  blue: '#1d3ea6',
  violet: '#8f58d1',
  pink: '#f8b4ce',
  // The red cabbage pH lab's scale, from strong acid to strong base, with the blue and the yellow above for pH 8 and
  // pH 13. A learner tells each tube of its rack from the tubes either side by eye, so each step differs from its
  // neighbours in how light it is or strongly in hue, and a test holds every pair of neighbours apart
  // (src/app/lab/cabbage/page.test.ts). The lightness falls from pH 4 to pH 7 and rises from there to pH 13.
  red: '#e02424',
  'dark pink': '#99186a',
  rose: '#f089ae',
  lavender: '#d2c2f7',
  purple: '#742bb0',
  'blue-violet': '#6f72f2',
  'dark blue': '#0e1650',
  teal: '#0d7480',
  emerald: '#16a05c',
  'greenish-yellow': '#8eba0e',
  // What two household things of that lab look like before the indicator goes in. A white liquid is the card's own
  // white: it is told from one with no colour by the wisps a cloudy liquid is drawn with, and by the word.
  'pale yellow': '#fbf3bd',
  white: '#ffffff',
}
const SOLID_HEX: Record<string, string> = { white: '#ffffff', yellow: '#f7e65a', 'grey to black': '#5b6068' }
/** A colour the drawing has no value for: drawn grey, and named in words all the same. */
const UNKNOWN_HEX = '#9ca3af'
/** The grain over a solid too dark for the ink to show on: drawn light. */
const LIGHT_GRAIN: Record<string, string> = { 'grey to black': '#ffffff' }

export const liquidHex = (colour: string) => LIQUID_HEX[colour] ?? UNKNOWN_HEX
export const solidHex = (colour: string) => SOLID_HEX[colour] ?? UNKNOWN_HEX

/**
 * Where the surface of a liquid is drawn, in a tube whose bench fills one to `full` at the most. More liquid stands
 * higher, and an addition shows, but not to scale: no liquid is drawn lower than 45% of the height of the most, so
 * that a liquid over a solid is tall enough to be seen and looked at.
 */
export function surfaceOf(microlitres: number, full: number): number {
  const share = Math.min(1, microlitres / full)
  return Math.round(END - (0.45 + 0.55 * share) * (END - FULL))
}

/** What is drawn in a tube, from what an engine says is seen of it: null is a tube not yet used, which is empty. */
export function tubeLayers(shows: TubeShows | null, full: number): TubeLayers {
  const { liquid = null, solid = null } = shows ?? {}
  return {
    liquid: liquid && { hex: liquidHex(liquid.colour), surface: surfaceOf(liquid.microlitres, full) },
    solid: solid?.settled ? { hex: solidHex(solid.colour), top: SOLID_TOP, ...(solid.colour in LIGHT_GRAIN ? { grain: LIGHT_GRAIN[solid.colour]! } : {}) } : null,
    spread: solid && !solid.settled ? { hex: solidHex(solid.colour) } : null,
  }
}
