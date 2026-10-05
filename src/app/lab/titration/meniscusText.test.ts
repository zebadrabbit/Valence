import { describe, expect, it } from 'vitest'
import { findInstitutionText } from '@/chem-data/denylist'
import { MENISCUS_POSITIONS, markText, meniscusBracket, meniscusText } from './meniscusText'

// Optional, untracked: see registry.test.ts.
const local = import.meta.glob<string[]>('../../../chem-data/denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

const sentence = (a: string, b: string, position: string) =>
  `The bottom of the meniscus is between the ${a} mL and ${b} mL marks, ${position}. The numbers on a burette increase downward.`

describe('the meniscus in words', () => {
  it.each([
    [24300, '24.3', '24.4', 'at or just below the 24.3 mL mark'],
    [24319, '24.3', '24.4', 'at or just below the 24.3 mL mark'],
    [24320, '24.3', '24.4', 'about a quarter of the way down from the 24.3 mL mark'],
    [24350, '24.3', '24.4', 'about halfway between them'],
    [24370, '24.3', '24.4', 'about three quarters of the way down from the 24.3 mL mark'],
    [24399, '24.3', '24.4', 'just above the 24.4 mL mark'],
    [0, '0.0', '0.1', 'at or just below the 0.0 mL mark'],
    [987, '0.9', '1.0', 'just above the 1.0 mL mark'],
    [1963, '1.9', '2.0', 'about three quarters of the way down from the 1.9 mL mark'],
  ])('gives the two marks round a level of %i and where between them it is', (level, a, b, position) => {
    expect(meniscusText(level)).toBe(sentence(a, b, position))
  })

  it('says of a burette at the last mark that it is at the bottom of the scale', () => {
    expect(meniscusText(50000)).toBe(
      'The bottom of the meniscus is at the 50.0 mL mark, the bottom of the scale. The numbers on a burette increase downward.',
    )
  })

  it('never holds the reading itself: no number with two decimal places, at any level', () => {
    for (let level = 0; level <= 50000; level++) expect(meniscusText(level)).not.toMatch(/\d\.\d\d/)
  })

  it('has no institution text', () => {
    for (const level of [0, 1963, 24300, 24320, 24350, 24370, 24399, 50000])
      expect(findInstitutionText(meniscusText(level), institutionNames)).toBeNull()
  })
})

describe('a mark as the scale would number it', () => {
  it('is written to one decimal place, by whole-number arithmetic', () => {
    expect([0, 100, 900, 1000, 24300, 29900, 50000].map(markText)).toEqual(['0.0', '0.1', '0.9', '1.0', '24.3', '29.9', '50.0'])
  })
})

describe('the two marks round the meniscus', () => {
  it('are the graduation at or just above it and the next one down, with the fifth of the gap it is in', () => {
    expect(meniscusBracket(24370)).toEqual({ upperUl: 24300, lowerUl: 24400, position: 'three-quarters' })
    expect(meniscusBracket(0)).toEqual({ upperUl: 0, lowerUl: 100, position: 'at-or-just-below' })
    expect(meniscusBracket(49999)).toEqual({ upperUl: 49900, lowerUl: 50000, position: 'just-above' })
    expect([24300, 24320, 24340, 24360, 24380].map((level) => meniscusBracket(level).position)).toEqual([...MENISCUS_POSITIONS])
  })
})

describe('a learner with only the text', () => {
  // Every reading each wording allows, in microlitres below the upper mark, and the middle of the wording.
  const allowed = {
    'at-or-just-below': { readings: [0, 10, 20], middle: 10 },
    quarter: { readings: [20, 30], middle: 30 },
    half: { readings: [40, 50, 60], middle: 50 },
    'three-quarters': { readings: [70, 80], middle: 70 },
    'just-above': { readings: [80, 90, 100], middle: 90 },
  }

  it('is never more than the 0.02 mL allowed from the meniscus, whichever of those readings is typed', () => {
    let worst = 0
    for (let level = 0; level <= 49999; level++) {
      const { upperUl, position } = meniscusBracket(level)
      for (const below of allowed[position].readings) worst = Math.max(worst, Math.abs(upperUl + below - level))
    }
    expect(worst).toBe(20)
  })

  it('is never more than 0.01 mL out by typing the middle of each wording', () => {
    let worst = 0
    for (let level = 0; level <= 49999; level++) {
      const { upperUl, position } = meniscusBracket(level)
      worst = Math.max(worst, Math.abs(upperUl + allowed[position].middle - level))
    }
    expect(worst).toBe(10)
  })

  it('is told the last mark outright, where the reading 50.00 is exact', () => {
    expect(meniscusText(50000)).toContain(`at the ${markText(50000)} mL mark`)
  })
})
