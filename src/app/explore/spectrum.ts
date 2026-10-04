import type { Element } from '@/chem-data/schema'

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
 * An sRGB colour for a visible wavelength, after Bruton's piecewise approximation.
 * ponytail: a drawing aid, not colorimetry; a screen cannot show a pure spectral colour. Use CIE matching functions if accuracy ever matters.
 */
export function wavelengthColor(nm: number): string {
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
  return `rgb(${channel(r!)}, ${channel(g!)}, ${channel(b!)})`
}

type Line = NonNullable<Element['emission']>['lines'][number]

/** One line as text: its wavelength in the source's digits, its colour, and its transition where the data names one. */
export function lineText(line: Line): string {
  return `${line.published ?? String(line.value)} nm, ${colourName(line.value)}${line.transition ? `, ${line.transition}` : ''}`
}

/** The text alternative of the strip. */
export function spectrumText(element: Element): string {
  const lines = element.emission?.lines ?? []
  return `Emission lines of ${element.name.toLowerCase()}, longest wavelength first: ${lines.map(lineText).join('; ')}.`
}
