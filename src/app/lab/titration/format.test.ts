import { describe, expect, it } from 'vitest'
import { parseDeviation, parseMolarity, parseReading } from '@/engine/titration'
import { deviationE2Text, deviationText, molarityText, percentErrorText, readingText } from './format'

describe('a burette reading as text', () => {
  it('has two decimal places', () => {
    expect([24370, 70, 8290].map(readingText)).toEqual(['24.37', '0.07', '8.29'])
  })

  it('reads back as the reading it was, for every hundredth on the scale', () => {
    for (let ul = 0; ul <= 50000; ul += 10) expect(parseReading(readingText(ul))).toBe(ul)
  })
})

describe('a molarity as text', () => {
  it('has four decimal places', () => {
    expect([94900, 100000].map(molarityText)).toEqual(['0.0949', '0.1000'])
  })

  it('reads back as the molarity it was, for every one below 1 M', () => {
    for (let e6 = 0; e6 < 1_000_000; e6 += 100) expect(parseMolarity(molarityText(e6))).toBe(e6)
  })
})

describe('a percent error as text', () => {
  it('has two decimal places and a sign, the minus being U+2212', () => {
    expect([-2.1259, 1.8733, 12.5, -1.5].map(percentErrorText)).toEqual(['−2.13%', '+1.87%', '+12.50%', '−1.50%'])
  })

  it('prints a failure just past the edge as +1.00% (0.1006 M typed against a true 0.09960 M fails: 100 000 > 99 600)', () => {
    expect(percentErrorText(1.00402)).toBe('+1.00%')
  })
})

describe('a relative deviation as text', () => {
  it("the notebook's own has one decimal place", () => {
    expect([0, 4, 10, 133].map(deviationText)).toEqual(['0.0', '0.4', '1.0', '13.3'])
  })

  it("the learner's own has no trailing zero", () => {
    expect([47, 130, 200, 50, 0].map(deviationE2Text)).toEqual(['0.47', '1.3', '2', '0.5', '0'])
  })

  it("the learner's own reads back as what was typed, for every value from 0 to 20 parts per thousand", () => {
    for (let e2 = 0; e2 <= 2000; e2++) expect(parseDeviation(deviationE2Text(e2))).toBe(e2)
  })
})
