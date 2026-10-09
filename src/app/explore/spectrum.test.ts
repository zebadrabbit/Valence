import { describe, expect, it } from 'vitest'
import { emissionSpectra } from '@/chem-data/emissionSpectra'
import { registry } from '@/chem-data/registry'
import { colourName, lineText, spectrumText, stripPosition, wavelengthColor } from './spectrum'

const element = (symbol: string) => registry.elements.find((e) => e.symbol === symbol)!
// The build decides which spectra carry the note that lines are drawn as one, by this distance.
const [build] = Object.values(import.meta.glob<{ DRAWN_AS_ONE_NM: number }>('../../../scripts/emission-lib.mjs', { eager: true }))

describe('stripPosition', () => {
  it('runs from 0 at 380 nm to 1 at 750 nm', () => {
    expect(stripPosition(380)).toBe(0)
    expect(stripPosition(750)).toBe(1)
    expect(stripPosition(565)).toBeCloseTo(0.5)
  })
})

describe('colourName', () => {
  it("names hydrogen's four Balmer lines as textbooks do", () => {
    expect([656.279, 486.135, 434.0472, 410.1734].map(colourName)).toEqual(['red', 'blue-green', 'blue-violet', 'violet'])
  })

  it('names the bands between', () => {
    expect([470, 530, 578, 600].map(colourName)).toEqual(['blue', 'green', 'yellow', 'orange'])
  })
})

describe('wavelengthColor', () => {
  const rgb = (nm: number) => wavelengthColor(nm).match(/\d+/g)!.map(Number)

  it('is red-dominant at 656 nm, blue-dominant at 470 nm and green-dominant at 540 nm', () => {
    expect(rgb(656.279)).toEqual([255, 0, 0])
    const [r, g, b] = rgb(470)
    expect(b).toBe(255)
    expect(b).toBeGreaterThan(g!)
    expect(r).toBe(0)
    expect(rgb(540)[1]).toBe(255)
  })

  it('dims towards the ends of the visible range but never to black', () => {
    for (const nm of [380, 410.1734, 697.6182, 750]) {
      const brightest = Math.max(...rgb(nm))
      expect(brightest).toBeGreaterThan(60)
      expect(brightest).toBeLessThanOrEqual(255)
    }
    expect(Math.max(...rgb(390))).toBeLessThan(Math.max(...rgb(430)))
  })

  it('gives every stored line a colour inside the strip, for the 11 elements of the explorer and the 118 of the table', () => {
    for (const emission of [...registry.elements, ...emissionSpectra].flatMap((e) => ('emission' in e && e.emission ? [e.emission] : []))) {
      for (const line of emission.lines) {
        expect(stripPosition(line.value)).toBeGreaterThan(0)
        expect(stripPosition(line.value)).toBeLessThan(1)
        expect(wavelengthColor(line.value)).toMatch(/^rgb\(\d+, \d+, \d+\)$/)
      }
    }
  })
})

describe('lines too close to draw apart', () => {
  it('are, for the build, those closer than a line is wide on the strip: 2 of its 300 units', () => {
    const { DRAWN_AS_ONE_NM } = build!
    expect((stripPosition(500 + DRAWN_AS_ONE_NM) - stripPosition(500)) * 300).toBeCloseTo(2, 10)
  })
})

describe('text', () => {
  it('gives a line in the digits its source prints, with its colour and transition', () => {
    expect(lineText(element('H').emission!.lines[0]!)).toBe('656.279 nm, red, n = 3 → 2')
    expect(lineText(element('Xe').emission!.lines[4]!)).toBe('480.70190 nm, blue')
  })

  it('describes the whole spectrum for a screen reader', () => {
    expect(spectrumText('Hydrogen', element('H').emission!)).toBe(
      'Emission lines of hydrogen, longest wavelength first: 656.279 nm, red, n = 3 → 2; 486.135 nm, blue-green, n = 4 → 2; 434.0472 nm, blue-violet, n = 5 → 2; 410.1734 nm, violet, n = 6 → 2.',
    )
  })

  it('names both sodium D lines, which the strip draws on top of each other', () => {
    expect(spectrumText('Sodium', element('Na').emission!)).toBe('Emission lines of sodium, longest wavelength first: 589.592424 nm, yellow, 3p → 3s; 588.995095 nm, yellow, 3p → 3s.')
    const [d1, d2] = element('Na').emission!.lines.map((line) => stripPosition(line.value) * 300)
    // Less than the 2 units a line is wide: the reason the data carries a note saying so.
    expect(Math.abs(d1! - d2!)).toBeLessThan(2)
  })
})
