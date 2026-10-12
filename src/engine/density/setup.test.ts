import { describe, expect, it } from 'vitest'
import { PINNED_MODEL as m } from './pinnedModel'
import { labSetup, massCg, runSetup, unknownLiquid, unknownMetal } from './setup'

const seeds = Array.from({ length: 100 }, (_, i) => i + 1)
const within = (value: number, [lo, hi]: readonly [number, number]) => value >= lo && value <= hi

describe('what the seed fixes', () => {
  it('is the same for the same seed, and pinned for seed 1', () => {
    expect(labSetup(m, 1)).toEqual(labSetup(m, 1))
    expect(runSetup(m, 1, 0)).toEqual(runSetup(m, 1, 0))
    expect({ lab: labSetup(m, 1), run: runSetup(m, 1, 0), again: runSetup(m, 1, 1) }).toMatchInlineSnapshot(`
      {
        "again": {
          "emptyCylinderCg": 7000,
          "firstMassCg": 7637,
          "firstVolumeTenthMl": 297,
          "liquidTenthMl": 247,
          "noteLengthE2": 1286,
          "noteWidthE2": 429,
          "piecesTenthMl": 171,
          "splashTenthMl": 14,
          "thermometerTenths": -3,
          "waterTenthMl": 203,
          "wetWaterCg": 96,
        },
        "lab": {
          "liquidIndex": 1,
          "metalIndex": 0,
        },
        "run": {
          "emptyCylinderCg": 7490,
          "firstMassCg": 7266,
          "firstVolumeTenthMl": 441,
          "liquidTenthMl": 449,
          "noteLengthE2": 1384,
          "noteWidthE2": 586,
          "piecesTenthMl": 174,
          "splashTenthMl": 11,
          "thermometerTenths": 4,
          "waterTenthMl": 232,
          "wetWaterCg": 68,
        },
      }
    `)
  })

  it('draws every amount inside its range at seeds 1 to 100, for the first run and for runs after it', () => {
    for (const seed of seeds) {
      for (const index of [0, 1, 5]) {
        const s = runSetup(m, seed, index)
        const where = `seed ${seed}, run ${index}`
        expect(within(s.noteLengthE2, m.noteLengthRangeE2), where).toBe(true)
        expect(within(s.noteWidthE2, m.noteWidthRangeE2), where).toBe(true)
        expect(within(s.firstVolumeTenthMl, m.firstVolumeRangeTenthMl), where).toBe(true)
        expect(within(Math.abs(s.thermometerTenths - m.icePointTenths), m.thermometerOffRangeTenths), where).toBe(true)
        expect(within(s.firstMassCg, m.firstMassRangeCg), where).toBe(true)
        expect(within(s.emptyCylinderCg, m.emptyCylinderRangeCg), where).toBe(true)
        expect(within(s.liquidTenthMl, m.liquidRangeTenthMl), where).toBe(true)
        expect(within(s.waterTenthMl, m.waterRangeTenthMl), where).toBe(true)
        expect(within(s.piecesTenthMl, m.piecesRangeTenthMl), where).toBe(true)
        expect(within(s.wetWaterCg, m.wetWaterRangeCg), where).toBe(true)
        expect(within(s.splashTenthMl, m.splashRangeTenthMl), where).toBe(true)
      }
    }
  })

  it('gives each unknown every thing it may be, and never one it may not, over seeds 1 to 100', () => {
    expect(new Set(seeds.map((seed) => unknownLiquid(m, seed).id))).toEqual(new Set(['ethanol-95', 'nacl-20']))
    expect(new Set(seeds.map((seed) => unknownMetal(m, seed).id))).toEqual(new Set(['aluminium', 'zinc', 'copper']))
    expect(new Set(seeds.map((seed) => Math.sign(runSetup(m, seed, 0).thermometerTenths)))).toEqual(new Set([-1, 1]))
  })

  it('keeps the unknowns when a part is run again, and draws new amounts', () => {
    for (const seed of seeds.slice(0, 20)) {
      expect(runSetup(m, seed, 1)).not.toEqual(runSetup(m, seed, 0))
      expect(labSetup(m, seed)).toEqual(labSetup(m, seed))
    }
  })

  it('weighs a volume to the hundredth of a gram the balance shows', () => {
    expect(massCg(804, 253)).toBe(2034) // 0.804 g/mL x 25.3 mL = 20.3412 g
    expect(massCg(2700, 150)).toBe(4050)
    expect(massCg(7140, 153)).toBe(10924) // 109.242 g
  })
})
