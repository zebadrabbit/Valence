import { describe, expect, it } from 'vitest'
import { exp, ln } from './numbers'

// The two functions the kinetics engine works out with + - x / alone, so that every engine gives the same bits.
// Here they are held to the platform's own, which agree with them to far more figures than anything is rounded to.

describe('e to a power', () => {
  it('agrees with the platform over the powers an Arrhenius equation takes, to a part in a million million', () => {
    for (let x = -12; x <= 12; x += 0.137) expect(Math.abs(exp(x) / Math.exp(x) - 1), String(x)).toBeLessThan(1e-12)
    expect(exp(0)).toBe(1)
  })
})

describe('the natural logarithm', () => {
  it('agrees with the platform from a millionth to a million, to a part in a million million', () => {
    for (let power = -6; power <= 6; power += 0.0731) {
      const x = 10 ** power
      expect(Math.abs(ln(x) - Math.log(x)), String(x)).toBeLessThan(1e-12)
    }
    expect(ln(1)).toBe(0)
    expect(Math.abs(ln(50.26) - 3.917209)).toBeLessThan(1e-6)
  })

  it('undoes e to a power, and is not asked for the logarithm of nothing', () => {
    for (const x of [-3.5, -0.2, 0.7, 4.9]) expect(Math.abs(ln(exp(x)) - x), String(x)).toBeLessThan(1e-12)
    for (const x of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) expect(() => ln(x), String(x)).toThrow(/no logarithm/)
  })
})
