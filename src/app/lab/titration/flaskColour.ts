// The flask's colour as it is drawn and named. Presentation only: nothing here is graded, and whether the flask is
// pink at all is the engine's word, never a comparison made here.

export type FlaskColourName = 'empty' | 'colourless' | 'faint pink' | 'pink' | 'dark pink'

export interface FlaskColour {
  name: FlaskColourName
  /** The words for the colour, so that colour is never the only signal. */
  label: string
  /** The opacity of the pink layer over the colourless liquid, 0 to 1. */
  strength: number
  /** The pink layer's colour. The flask is drawn against the same card in both themes, so one value serves both. */
  fill: string
}

// Starting values, chosen by eye; the owner judges them in the browser.
export const PINK = '#d81b7f'
export const DARK_PINK = '#8a0f4d'

export interface FlaskColourInput {
  hasLiquid: boolean
  indicatorDrops: number
  /** mol/L of the pink form in the mixed flask; the engine gives 0 until the flask is pink. */
  pinkConcentration: number
  /** The engine's own threshold test. */
  pink: boolean
  /** The engine's flag: the trial ended more than the allowed volume past the flask's equivalence. */
  overshot: boolean
  /** Stored parameter: the concentration at which the drawn pink reaches 63% of its full strength. */
  pinkDisplayScale: number
  /** Stored parameter: a pink flask is named "faint pink" below this concentration and "pink" from it. */
  faintPinkNameLimit: number
}

/**
 * How strongly the pink is drawn. Nothing until the flask is pink, so the colour appears at the same addition as the
 * words do; from there 1 - exp(-c / scale), which deepens with concentration and levels off, as the share of light a
 * coloured solution absorbs does.
 */
export function pinkStrength(pinkConcentration: number, pink: boolean, pinkDisplayScale: number): number {
  return pink ? 1 - Math.exp(-pinkConcentration / pinkDisplayScale) : 0
}

export function flaskColour(input: FlaskColourInput): FlaskColour {
  if (!input.hasLiquid) return { name: 'empty', label: 'empty', strength: 0, fill: PINK }
  // The dark colour comes from the flag and not from the concentration: a careful endpoint can already be more than
  // half as deep as the pink goes. With no indicator in the flask there is no pink to show.
  if (input.overshot && input.indicatorDrops > 0) return { name: 'dark pink', label: 'dark pink (overshot)', strength: 1, fill: DARK_PINK }
  if (!input.pink) return { name: 'colourless', label: 'colourless', strength: 0, fill: PINK }
  const name = input.pinkConcentration < input.faintPinkNameLimit ? 'faint pink' : 'pink'
  return { name, label: name, strength: pinkStrength(input.pinkConcentration, true, input.pinkDisplayScale), fill: PINK }
}
