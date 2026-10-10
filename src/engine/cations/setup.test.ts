import { describe, expect, it } from 'vitest'
import { ION_IDS } from '@/chem-data/cations/data'
import { sampleOf, UNKNOWNS, unknownOrder } from './setup'

describe('what the seed fixes', () => {
  it('lists the seven unknowns: every choice of one, two or three of the ions, each once', () => {
    expect(UNKNOWNS.map((ions) => ions.join('+'))).toEqual(['silver', 'lead', 'mercury-i', 'silver+lead', 'silver+mercury-i', 'lead+mercury-i', 'silver+lead+mercury-i'])
    for (const ions of UNKNOWNS) expect(ions.every((ion, i) => ION_IDS.includes(ion) && ions.indexOf(ion) === i)).toBe(true)
  })

  it('gives the known all three ions, whatever the seed and the run', () => {
    for (const seed of [0, 1, 2, 4294967295]) for (const index of [0, 1, 50]) expect(sampleOf(seed, 'known', index)).toEqual(['silver', 'lead', 'mercury-i'])
  })

  it('pins the order of the unknowns for seeds 1, 2 and 11 and for the largest seed', () => {
    expect(unknownOrder(1)).toEqual([1, 5, 6, 3, 2, 0, 4])
    expect([unknownOrder(2), unknownOrder(11), unknownOrder(4294967295)]).toEqual([
      [0, 4, 3, 2, 6, 1, 5],
      [0, 1, 4, 2, 5, 6, 3],
      [0, 5, 2, 4, 3, 1, 6],
    ])
    expect([0, 1, 2, 7].map((index) => sampleOf(1, 'unknown', index).join('+'))).toEqual(['lead', 'lead+mercury-i', 'silver+lead+mercury-i', 'lead'])
  })

  it('deals each seed all seven, each once, before any comes round again', () => {
    for (let seed = 0; seed <= 200; seed++) {
      expect([...unknownOrder(seed)].sort(), String(seed)).toEqual([0, 1, 2, 3, 4, 5, 6])
      const dealt = Array.from({ length: 14 }, (_, index) => sampleOf(seed, 'unknown', index).join('+'))
      expect(new Set(dealt.slice(0, 7)).size, String(seed)).toBe(7)
      expect(dealt.slice(7), String(seed)).toEqual(dealt.slice(0, 7))
      // A new run never has the unknown of the run before it.
      dealt.slice(1).forEach((sample, i) => expect(sample, `${seed} ${i}`).not.toBe(dealt[i]))
    }
  })

  it('gives each of the seven as the first unknown to some of seeds 1 to 100', () => {
    const counts = UNKNOWNS.map(() => 0)
    for (let seed = 1; seed <= 100; seed++) counts[unknownOrder(seed)[0]!]!++
    expect(counts.reduce((sum, n) => sum + n, 0)).toBe(100)
    expect(counts).toEqual([10, 16, 18, 13, 12, 15, 16])
  })

  it('does not depend on how many runs there are: a run far along is found without walking to it', () => {
    expect(sampleOf(1, 'unknown', 700000001)).toEqual(sampleOf(1, 'unknown', 700000001 % 7))
  })
})
