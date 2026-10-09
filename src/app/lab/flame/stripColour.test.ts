import { describe, expect, it } from 'vitest'
import { wavelengthColor, wavelengthRgb } from '@/app/explore/spectrum'
import { extentOf, flameData as data } from '@/chem-data/flame/data'
import { BAND_STOPS, FAR_RED_NM, LEAST_CONTRAST, contrastOnBlack, stripPaint } from './stripColour'
import { brightness } from './stripGeometry'

const rgbOf = (colour: string) => colour.match(/\d+/g)!.map(Number) as [number, number, number]
/** The contrast of a paint with the strip's black, as it is drawn: its colour at its strength. */
const contrast = (paint: { colour: string; strength: number }) => contrastOnBlack(rgbOf(paint.colour), paint.strength)
/** Every wavelength a line or a band of the record is painted at, with its rank: a line at the middle of its extent, a band at each stop of its fade. */
const painted = data.salts.flatMap((salt) =>
  salt.features.flatMap((feature) => {
    const { fromNm, toNm } = extentOf(data, feature)
    const at = feature.kind === 'line' ? [(fromNm + toNm) / 2] : BAND_STOPS.map((stop) => fromNm + stop * (toNm - fromNm))
    return at.map((nm) => ({ id: feature.id, nm, rank: feature.prominence }))
  }),
)

describe('contrast with the black of the strip', () => {
  it('is the ratio of luminances the accessibility guidelines define: 1 for black, 21 for white, and low for a pure blue', () => {
    expect(contrastOnBlack([0, 0, 0])).toBe(1)
    expect(contrastOnBlack([255, 255, 255])).toBeCloseTo(21, 10)
    expect(contrastOnBlack([255, 0, 0])).toBeCloseTo(5.252, 3)
    expect(contrastOnBlack([0, 0, 255])).toBeCloseTo(2.444, 3)
    // A colour drawn at a strength is that much of the way from black to it.
    expect(contrastOnBlack([255, 255, 255], 0.5)).toBeCloseTo(contrastOnBlack([127.5, 127.5, 127.5]), 10)
  })
})

describe('the colour a line or a band is drawn in', () => {
  it('is the colour of its wavelength at the strength of its rank where that can be seen: the brightest whole and the others fainter', () => {
    for (const [nm, rank] of [[589.3, 1], [553.5481, 2], [627, 1], [554, 2], [606, 2], [515, 1]] as const) {
      expect(stripPaint(nm, rank), `${nm}`).toEqual({ colour: wavelengthColor(nm), strength: brightness(rank) })
    }
    // Whatever the floor does to a colour, the strength is the rank's: brighter and dimmer by rank is kept.
    for (const { nm, rank } of painted) expect(stripPaint(nm, rank).strength).toBe(brightness(rank))
  })

  it('is never so dim that it cannot be found: everything the record puts on a strip has the least contrast with the black, at every stop of a band too', () => {
    expect(LEAST_CONTRAST).toBe(3)
    expect(painted.length).toBeGreaterThan(30)
    for (const { id, nm, rank } of painted) expect(contrast(stripPaint(nm, rank)), `${id} at ${nm} nm`).toBeGreaterThanOrEqual(LEAST_CONTRAST)
    // And so has any wavelength of the scale at any rank a salt has: a loop that was not clean, and a record that changes.
    for (let nm = data.scale.fromNm; nm <= data.scale.toNm; nm++) for (const rank of [1, 2, 3]) expect(contrast(stripPaint(nm, rank)), `${nm} nm, rank ${rank}`).toBeGreaterThanOrEqual(LEAST_CONTRAST)
  })

  it("lifts the three lines that were too dim to find: calcium's violet and strontium's blue, ranked third, and potassium's violet pair", () => {
    const dim = [
      ['ca-422', 422.673, 3],
      ['sr-460', 460.7331, 3],
      ['k-404', (404.4136 + 404.7208) / 2, 2],
    ] as const
    for (const [id, nm, rank] of dim) {
      const feature = data.salts.flatMap((salt) => salt.features).find((one) => one.id === id)!
      expect([feature.kind, feature.prominence], id).toEqual(['line', rank])
      // As the colour of the wavelength alone, at the rank's strength, it was under the floor.
      expect(contrastOnBlack(wavelengthRgb(nm), brightness(rank)), id).toBeLessThan(2.3)
      const paint = stripPaint(nm, rank)
      expect(paint.colour, id).not.toBe(wavelengthColor(nm))
      expect(contrast(paint), id).toBeGreaterThanOrEqual(LEAST_CONTRAST)
    }
  })

  it('is lifted toward white and no further than the floor asks, so that it is still the colour of its wavelength: each channel is no lower than it was, and their order is kept', () => {
    for (let nm = data.scale.fromNm; nm <= data.scale.toNm; nm++) {
      for (const rank of [1, 2, 3]) {
        const pure = wavelengthRgb(Math.min(nm, FAR_RED_NM))
        const paint = stripPaint(nm, rank)
        const lifted = rgbOf(paint.colour)
        if (paint.colour === wavelengthColor(Math.min(nm, FAR_RED_NM))) continue
        const where = `${nm} nm, rank ${rank}`
        lifted.forEach((channel, i) => expect(channel, where).toBeGreaterThanOrEqual(pure[i]!))
        for (const [a, b] of [[0, 1], [0, 2], [1, 2]] as const) if (pure[a]! > pure[b]!) expect(lifted[a]!, where).toBeGreaterThan(lifted[b]!)
        // One step of the lift less would have left it under the floor: the contrast is the floor's and little more.
        expect(contrast(paint), where).toBeLessThan(LEAST_CONTRAST * 1.08)
      }
    }
  })

  it("draws light beyond 740 nm in the colour of 740 nm, lifted like any other: potassium's deep red pair is a red that shows", () => {
    expect(FAR_RED_NM).toBe(740)
    expect(wavelengthColor(768)).toBe('rgb(124, 0, 0)')
    expect(stripPaint(768.19, 1)).toEqual(stripPaint(740, 1))
    expect(stripPaint(780, 1)).toEqual(stripPaint(740, 1))
    const [red, green, blue] = rgbOf(stripPaint(768.19, 1).colour)
    expect(red).toBeGreaterThan(175)
    expect(Math.max(green, blue)).toBeLessThan(20)
  })
})
