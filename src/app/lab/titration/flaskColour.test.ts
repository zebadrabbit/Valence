import { describe, expect, it } from 'vitest'
import { DARK_PINK, flaskColour, PINK, pinkStrength, type FlaskColourInput } from './flaskColour'

const SCALE = 1e-5
const LIMIT = 1.5e-5
const pinkFlask: FlaskColourInput = {
  hasLiquid: true,
  indicatorDrops: 2,
  pinkConcentration: 0,
  pink: true,
  overshot: false,
  pinkDisplayScale: SCALE,
  faintPinkNameLimit: LIMIT,
}

describe('how strongly the pink is drawn', () => {
  it.each([0, 3.9e-13, 9.99e-7])('is nothing at %f M while the engine says the flask is not pink', (c) => {
    expect(pinkStrength(c, false, SCALE)).toBe(0)
  })

  it.each([
    [1e-6, 0.0952],
    [3e-6, 0.2592],
    [4.9e-6, 0.3874],
    [1e-5, 0.6321],
    [1.5e-5, 0.7769],
    [2.35e-5, 0.9046],
    [3.3e-5, 0.9631],
  ])('a pink flask at %f M is drawn at %f', (c, strength) => {
    expect(pinkStrength(c, true, SCALE)).toBeCloseTo(strength, 4)
  })

  it('never falls as the concentration rises', () => {
    let last = 0
    for (let c = 1e-6; c <= 6e-5; c += 1e-7) {
      const strength = pinkStrength(c, true, SCALE)
      expect(strength).toBeGreaterThanOrEqual(last)
      last = strength
    }
    expect(last).toBeLessThan(1)
  })
})

describe("the flask's colour", () => {
  it('is empty before the aliquot', () => {
    expect(flaskColour({ ...pinkFlask, hasLiquid: false, pink: false })).toEqual({ name: 'empty', label: 'empty', strength: 0, fill: PINK })
  })

  it('is colourless, with no pink drawn at all, until the engine says pink, with or without indicator', () => {
    const colourless = { name: 'colourless', label: 'colourless', strength: 0, fill: PINK }
    expect(flaskColour({ ...pinkFlask, pink: false })).toEqual(colourless)
    expect(flaskColour({ ...pinkFlask, pink: false, indicatorDrops: 0 })).toEqual(colourless)
    // Not a value the bench is ever given: the engine hands over 0 until the flask is pink.
    expect(flaskColour({ ...pinkFlask, pink: false, pinkConcentration: 9.99e-7 })).toEqual(colourless)
  })

  it('is faint pink from the threshold', () => {
    const colour = flaskColour({ ...pinkFlask, pinkConcentration: 1e-6 })
    expect([colour.name, colour.label, colour.fill]).toEqual(['faint pink', 'faint pink', PINK])
    expect(colour.strength).toBeCloseTo(0.0952, 4)
  })

  it.each([
    [4.9e-6, 'faint pink'],
    [1e-5, 'faint pink'],
    [1.49e-5, 'faint pink'],
    [1.5e-5, 'pink'],
    [1.7e-5, 'pink'],
  ])('at %f M is named %s, in words as well as colour', (pinkConcentration, name) => {
    const colour = flaskColour({ ...pinkFlask, pinkConcentration })
    expect([colour.name, colour.label, colour.fill]).toEqual([name, name, PINK])
    expect(colour.strength).toBe(pinkStrength(pinkConcentration, true, SCALE))
  })

  it("is dark pink on the engine's overshot flag", () => {
    expect(flaskColour({ ...pinkFlask, pinkConcentration: 2.4e-5, overshot: true })).toEqual({
      name: 'dark pink',
      label: 'dark pink (overshot)',
      strength: 1,
      fill: DARK_PINK,
    })
  })

  it('is never dark when not overshot, however deep', () => {
    for (const pinkConcentration of [1.7e-5, 2.4e-5, 6e-5, 1e-3]) {
      const colour = flaskColour({ ...pinkFlask, indicatorDrops: 3, pinkConcentration })
      expect([colour.name, colour.fill]).toEqual(['pink', PINK])
      expect(colour.strength).toBeLessThanOrEqual(1)
    }
  })

  it('has no pink to show with no indicator in the flask, even overshot', () => {
    expect(flaskColour({ ...pinkFlask, indicatorDrops: 0, pink: false, overshot: true }).name).toBe('colourless')
  })
})
