import { describe, expect, it } from 'vitest'
import authored from '../../../docs/research/mixing/mixing.json'
import { LIQUID_IDS, mixingData, PAIR_IDS, SOLID_IDS, SOLID_TUBE_IDS } from '@/chem-data/mixing/data'
import { modelFrom, pairOf, pairShows, solidTubeOf, solidTubeShows, STAGES, topOf } from './model'
import { PINNED_MODEL as m } from './pinnedModel'

type OwnLib = { checkLayers(record: unknown): { id: string; top: string; gap: number }[] }
const [lib] = Object.values(import.meta.glob<OwnLib>('../../../scripts/mixing-lib.mjs', { eager: true }))

describe('the mixing model', () => {
  it('is, from the sourced record, the model the tests pin', () => {
    expect(modelFrom(mixingData)).toEqual(m)
  })

  it("works out which liquid is on top from the two densities, as the build does from the record's own (spec 25.3)", () => {
    expect(PAIR_IDS.map((id) => `${id}: ${topOf(m, id) ?? 'one layer'}`)).toEqual([
      'water+rubbing-alcohol: one layer',
      'water+vinegar: one layer',
      'water+vegetable-oil: vegetable-oil',
      'water+mineral-oil: mineral-oil',
      'rubbing-alcohol+vinegar: one layer',
      'rubbing-alcohol+vegetable-oil: rubbing-alcohol',
      'vinegar+vegetable-oil: vegetable-oil',
      'vinegar+mineral-oil: mineral-oil',
      'vegetable-oil+mineral-oil: one layer',
    ])
    expect(lib!.checkLayers(authored).map(({ id, top }) => [id, top])).toEqual(PAIR_IDS.filter((id) => topOf(m, id) !== null).map((id) => [id, topOf(m, id)]))
  })

  it('finds the tube of the bench for two liquids in either order and for a solid in a liquid, and none for what is left off', () => {
    expect(pairOf(m, 'vinegar', 'water')).toBe('water+vinegar')
    expect(pairOf(m, 'water', 'vinegar')).toBe('water+vinegar')
    expect(pairOf(m, 'water', 'water')).toBeNull()
    expect(pairOf(m, 'rubbing-alcohol', 'mineral-oil')).toBeNull()
    expect(LIQUID_IDS.flatMap((a) => LIQUID_IDS.map((b) => pairOf(m, a, b))).filter((id) => id !== null)).toHaveLength(18)
    expect(solidTubeOf(m, 'sugar', 'vinegar')).toBe('sugar-in-vinegar')
    expect(SOLID_IDS.map((solid) => solidTubeOf(m, solid, 'rubbing-alcohol'))).toEqual([null, null])
  })
})

describe('what a tube shows', () => {
  it('is an empty tube before anything is in it', () => {
    for (const id of PAIR_IDS) expect(pairShows(m, id, null, 'empty')).toEqual({ liquid: null, solid: null })
    for (const id of SOLID_TUBE_IDS) expect(solidTubeShows(m, id, 'empty')).toEqual({ liquid: null, solid: null })
  })

  it('is one cloudy, unsettled liquid of 4.5 mL in every pair until the tube has stood: nothing can be read from it', () => {
    for (const id of PAIR_IDS) {
      const colour = id.includes('vegetable-oil') ? 'pale yellow' : 'colourless'
      for (const stage of ['in', 'shaken'] as const) expect(pairShows(m, id, id.split('+')[0] as 'water', stage), `${id} ${stage}`).toEqual({ liquid: { colour, cloudy: true, microlitres: 4500 }, solid: null })
    }
  })

  it('is, once a pair has stood, one clear liquid where the two mix and two layers where they do not, the less dense above', () => {
    const stood = (id: (typeof PAIR_IDS)[number], more: (typeof LIQUID_IDS)[number]) => pairShows(m, id, more, 'stood')
    expect(stood('water+vinegar', 'water')).toEqual({ liquid: { colour: 'colourless', cloudy: false, microlitres: 4500 }, solid: null })
    expect(stood('vegetable-oil+mineral-oil', 'mineral-oil')).toEqual({ liquid: { colour: 'pale yellow', cloudy: false, microlitres: 4500 }, solid: null })
    // More water than oil: a thick lower layer of water under a thin layer of oil.
    expect(stood('water+vegetable-oil', 'water')).toEqual({ liquid: { colour: 'colourless', cloudy: false, microlitres: 3000 }, above: { colour: 'pale yellow', cloudy: false, microlitres: 1500 }, solid: null })
    // More oil than water: the oil is still on top, and is now the thick layer.
    expect(stood('water+vegetable-oil', 'vegetable-oil')).toEqual({ liquid: { colour: 'colourless', cloudy: false, microlitres: 1500 }, above: { colour: 'pale yellow', cloudy: false, microlitres: 3000 }, solid: null })
    // The rubbing alcohol is less dense than the vegetable oil: here the oil is underneath.
    expect(stood('rubbing-alcohol+vegetable-oil', 'rubbing-alcohol')).toEqual({ liquid: { colour: 'pale yellow', cloudy: false, microlitres: 1500 }, above: { colour: 'colourless', cloudy: false, microlitres: 3000 }, solid: null })
  })

  it('has `above` only where there are two layers, and then never two layers of one thickness', () => {
    for (const id of PAIR_IDS) {
      for (const more of id.split('+') as (typeof LIQUID_IDS)[number][]) {
        for (const stage of STAGES) {
          const shows = pairShows(m, id, more, stage)
          const two = stage === 'stood' && topOf(m, id) !== null
          expect('above' in shows, `${id} ${stage}`).toBe(two)
          if (two) {
            expect(shows.liquid!.microlitres + shows.above!.microlitres).toBe(4500)
            expect(shows.liquid!.microlitres).not.toBe(shows.above!.microlitres)
          }
        }
      }
    }
    for (const id of SOLID_TUBE_IDS) for (const stage of STAGES) expect('above' in solidTubeShows(m, id, stage)).toBe(false)
  })

  it('is, for a solid in a liquid, the solid at the bottom, then spread through a cloudy liquid, then gone or back at the bottom', () => {
    const liquid = (cloudy: boolean, colour = 'colourless') => ({ colour, cloudy, microlitres: 3000 })
    for (const id of SOLID_TUBE_IDS) {
      const colour = id.endsWith('vegetable-oil') ? 'pale yellow' : 'colourless'
      expect(solidTubeShows(m, id, 'in'), id).toEqual({ liquid: liquid(false, colour), solid: { colour: 'white', settled: true } })
      expect(solidTubeShows(m, id, 'shaken'), id).toEqual({ liquid: liquid(true, colour), solid: { colour: 'white', settled: false } })
    }
    expect(solidTubeShows(m, 'salt-in-water', 'stood')).toEqual({ liquid: liquid(false), solid: null })
    expect(solidTubeShows(m, 'sugar-in-vinegar', 'stood')).toEqual({ liquid: liquid(false), solid: null })
    expect(solidTubeShows(m, 'salt-in-mineral-oil', 'stood')).toEqual({ liquid: liquid(false), solid: { colour: 'white', settled: true } })
    expect(solidTubeShows(m, 'sugar-in-vegetable-oil', 'stood')).toEqual({ liquid: liquid(false, 'pale yellow'), solid: { colour: 'white', settled: true } })
  })
})
