import { wavelengthRgb } from '@/app/explore/spectrum'
import { brightness } from './stripGeometry'

// The colour a line or a band is drawn in on the spectroscope's strip, which is black in both themes. Nothing here
// is chemistry: a wavelength and a rank come in, and a colour and a strength come out.

type Rgb = readonly [red: number, green: number, blue: number]

/**
 * The least contrast with the strip's black that anything on the strip is drawn with: 3 to 1, as a ratio of
 * luminances, which is the least the Web Content Accessibility Guidelines (1.4.11) ask of a part of a picture that
 * has to be made out. Under it a thin violet or blue line of low rank could not be found on the strip.
 */
export const LEAST_CONTRAST = 3

/**
 * Light beyond this wavelength is drawn in this wavelength's colour.
 * ponytail: the shared function fades toward 780 nm as the eye does, and potassium's pair near 766 nm, the
 * brightest thing on its strip by what instruments recorded, would be drawn too dark to find. The primer and the
 * record say that a real eye sees that light faintly; a truer picture is the time to draw it so.
 */
export const FAR_RED_NM = 740

/** Where along a band its colour is set, from its short end to its long end: it fades in to the second and out from the fourth. */
export const BAND_STOPS = [0, 0.14, 0.5, 0.86, 1] as const

/** The relative luminance of an sRGB colour: 0 for black, 1 for white. */
function luminance(rgb: Rgb): number {
  const [red, green, blue] = rgb.map((channel) => {
    const c = channel / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!
}

/** The contrast with black of a colour drawn on it at a strength (its opacity): from 1, for black, to 21, for white drawn whole. */
export const contrastOnBlack = (rgb: Rgb, strength = 1): number => (luminance([rgb[0] * strength, rgb[1] * strength, rgb[2] * strength]) + 0.05) / 0.05

/** How finely a colour is moved toward white. The last step is white, which meets the floor at the strength of any rank. */
const STEPS = 64

/**
 * What a line or a band of this rank is drawn in at this wavelength: the colour, and the strength (the opacity) it
 * is drawn at. The strength is the rank's alone (stripGeometry's `brightness`): the brightest of a salt's is drawn
 * whole and the others fainter. The colour is the colour of the wavelength wherever that, at that strength, has the
 * least contrast with the strip. Where it has not (a violet, a blue or a deep red, which a screen shows darkly, and
 * more so when drawn faint), the colour is moved toward white by the fewest steps that reach the floor: it is
 * paler, it is still the colour of its wavelength, and it can be found.
 */
export function stripPaint(nm: number, rank: number): { colour: string; strength: number } {
  const strength = brightness(rank)
  const pure = wavelengthRgb(Math.min(nm, FAR_RED_NM))
  let rgb: Rgb = pure
  for (let step = 1; step <= STEPS && contrastOnBlack(rgb, strength) < LEAST_CONTRAST; step++) rgb = [0, 1, 2].map((i) => Math.round(pure[i]! + ((255 - pure[i]!) * step) / STEPS)) as unknown as Rgb
  return { colour: `rgb(${rgb.join(', ')})`, strength }
}
