import type { Emission } from '@/chem-data/schema'

// Drawing an emission spectrum: where a line sits on the strip, what colour to draw it, and what to call that colour.

/** The range the strip covers, in nm. */
export const STRIP = { min: 380, max: 750 } as const

/** Where a wavelength falls along the strip: 0 at its short end, 1 at its long end. */
export function stripPosition(nm: number): number {
  return (nm - STRIP.min) / (STRIP.max - STRIP.min)
}

const BANDS: readonly (readonly [below: number, name: string])[] = [
  [425, 'violet'],
  [450, 'blue-violet'],
  [485, 'blue'],
  [500, 'blue-green'],
  [565, 'green'],
  [590, 'yellow'],
  [625, 'orange'],
  [Infinity, 'red'],
]

/** The everyday name of the colour at a visible wavelength. The boundaries are conventional, not sharp. */
export function colourName(nm: number): string {
  return BANDS.find(([below]) => nm < below)![1]
}

/**
 * The red, green and blue of an sRGB colour for a visible wavelength, each from 0 to 255, after Bruton's piecewise approximation.
 * ponytail: a drawing aid, not colorimetry; a screen cannot show a pure spectral colour. Use CIE matching functions if accuracy ever matters.
 */
export function wavelengthRgb(nm: number): [red: number, green: number, blue: number] {
  const [r, g, b] =
    nm < 440
      ? [(440 - nm) / 60, 0, 1]
      : nm < 490
        ? [0, (nm - 440) / 50, 1]
        : nm < 510
          ? [0, 1, (510 - nm) / 20]
          : nm < 580
            ? [(nm - 510) / 70, 1, 0]
            : nm < 645
              ? [1, (645 - nm) / 65, 0]
              : [1, 0, 0]
  // The eye's response falls away towards both ends of the visible range.
  const fade = nm < 420 ? 0.3 + (0.7 * (nm - 380)) / 40 : nm > 700 ? 0.3 + (0.7 * (780 - nm)) / 80 : 1
  const channel = (c: number) => Math.round(255 * Math.max(0, Math.min(1, c * fade)) ** 0.8)
  return [channel(r!), channel(g!), channel(b!)]
}

/** The same colour as CSS takes it: "rgb(255, 0, 0)". */
export const wavelengthColor = (nm: number): string => `rgb(${wavelengthRgb(nm).join(', ')})`

type Line = Emission['lines'][number]

/** One line as text: its wavelength in the source's digits, its colour, and its transition where the data names one. */
export function lineText(line: Line): string {
  return `${line.published ?? String(line.value)} nm, ${colourName(line.value)}${line.transition ? `, ${line.transition}` : ''}`
}

/** The text alternative of the strip, for the element of this name. */
export function spectrumText(name: string, emission: Emission): string {
  return `Emission lines of ${name.toLowerCase()}, longest wavelength first: ${emission.lines.map(lineText).join('; ')}.`
}
