import { describe, expect, it } from 'vitest'
import { acetoneData, RUN_IDS } from '@/chem-data/acetone/data'
import { compare, exact, formatFigures, toNumber, toSig3 } from '../figures'
import { centiKelvin, concentration, endMs, hasTemperature, modelProblems, rateConstantAt, roomRuns, totalTenthMl, usedUp } from '../kinetics/model'
import { sheetIdsOf } from '../kinetics/notebook'
import { labSetup, scatterOf } from '../kinetics/setup'
import { partIdsOf } from '../kinetics/state'
import { PART_IDS, SHEET_IDS } from './index'
import { modelFrom } from './model'
import { PINNED_MODEL as m } from './pinnedModel'

// The numbers the iodination of acetone lab runs on, as the kinetics engine reads them: the model the app runs on
// is the one the engine's tests are pinned against, and that model's four mixtures, rate constant and times.

const shown = (mixtureId: string, solutionId: string) => formatFigures(toSig3(concentration(m, mixtureId, solutionId))!)

describe('the model made from the stored record', () => {
  it('is the pinned model, number for number, and one the engine can run', () => {
    expect(modelFrom(acetoneData)).toEqual(m)
    expect(modelProblems(m)).toEqual([])
    expect(m.runs.map((run) => run.id)).toEqual([...RUN_IDS])
  })

  it('has no baths, and so two parts and one sheet: those the door names', () => {
    expect([m.baths, hasTemperature(m)]).toEqual([[], false])
    expect(partIdsOf(m)).toEqual([...PART_IDS])
    expect(sheetIdsOf(m)).toEqual([...SHEET_IDS])
    expect(roomRuns(m).map((r) => r.id)).toEqual(['mixture-1', 'mixture-2', 'mixture-3', 'mixture-4'])
  })

  it('takes the rate constant as its source prints it, 2.91 with a power of ten of -5 at 25 °C, and the activation energy as 20.6 kcal/mol in joules', () => {
    expect(m.rateConstant).toBe(0.0000291)
    expect(m.referenceCentiKelvin).toBe(29815)
    expect(m.activationJ).toBe(86190)
    expect(Math.round(20.6 * 4.184 * 1000)).toBe(86190)
    expect(m.end).toEqual({ solutionId: 'iodine-0.005m', per: 1, indicatorId: null })
  })

  it('refuses a record that holds no reaction the engine can run', () => {
    const broken = JSON.parse(JSON.stringify(acetoneData))
    broken.rateLaw.reactants[2].order.value = 5
    expect(() => modelFrom(broken)).toThrow(/the record does not hold a reaction the engine can run: the order of "iodine" is not one of the choices/)
  })
})

describe('the four mixtures (spec 20.1)', () => {
  it('are of 50 mL each and hold, once mixed, the strengths a learner works out', () => {
    for (const mixture of m.mixtures) expect(totalTenthMl(mixture), mixture.id).toBe(500)
    expect(m.mixtures.map((x) => [x.id, shown(x.id, 'acetone-4m'), shown(x.id, 'hcl-1m'), shown(x.id, 'iodine-0.005m')].join(' | '))).toEqual([
      'mixture-1 | 0.800 | 0.200 | 0.00100',
      'mixture-2 | 1.60 | 0.200 | 0.00100',
      'mixture-3 | 0.800 | 0.400 | 0.00100',
      'mixture-4 | 0.800 | 0.200 | 0.00200',
    ])
  })

  it('double one solution each in the second, third and fourth', () => {
    const ratios = (mixtureId: string) => m.reactants.map((r) => toNumber(exact(concentration(m, mixtureId, r.solutionId), concentration(m, 'mixture-1', r.solutionId))))
    expect(['mixture-2', 'mixture-3', 'mixture-4'].map(ratios)).toEqual([[2, 1, 1], [1, 2, 1], [1, 1, 2]])
  })

  it('use up all of their iodine, one for one: what is used up is the iodine the mixture began with', () => {
    for (const mixture of m.mixtures) expect(compare(usedUp(m, mixture.id), concentration(m, mixture.id, 'iodine-0.005m')), mixture.id).toBe(0)
    expect(toNumber(usedUp(m, 'mixture-4'))).toBe(0.002)
  })
})

describe('the rate constant and the time of a run (spec 20.4)', () => {
  it('follow the Arrhenius equation from the stored figure at 25 °C', () => {
    expect(rateConstantAt(m, 29815)).toBe(0.0000291)
    const byPlatform = (centiK: number) => 2.91e-5 * Math.exp((-86190 / 8.314462618) * (100 / centiK - 100 / 29815))
    for (const centiK of [29315, 29515, 29715, 30815]) expect(Math.abs(rateConstantAt(m, centiK) / byPlatform(centiK) - 1), String(centiK)).toBeLessThan(1e-12)
    expect([200, 240].map((tenths) => Number((rateConstantAt(m, centiKelvin(m, tenths)) * 1e5).toFixed(3)))).toEqual([1.608, 2.589])
    // The table the figures are from has 1.15 x 10^-6 at 0 °C and 8.80 x 10^-5 at 35 °C in weaker acid: the model's are within a tenth of them.
    expect(Number((rateConstantAt(m, 27315) * 1e6).toFixed(2))).toBe(1.21)
    expect(Number((rateConstantAt(m, 30815) * 1e5).toFixed(2))).toBe(8.99)
  })

  it('give a time that is the iodine over the rate: twice the acetone or the acid halves it, and twice the iodine doubles it', () => {
    // 0.00100 / (2.91e-5 x 0.800 x 0.200) = 214.78 s
    expect(m.mixtures.map((x) => endMs(m, x.id, 29815, 0))).toEqual([214777, 107388, 107388, 429553])
  })

  it('give every run, at every room and scatter the draw can give, a time of minutes: long enough to time, and well inside the watch\'s half hour', () => {
    const times = (mixtureId: string) => [endMs(m, mixtureId, centiKelvin(m, m.roomRangeTenths[1]), -m.scatterPerTenThousand), endMs(m, mixtureId, centiKelvin(m, m.roomRangeTenths[0]), m.scatterPerTenThousand)].map((ms) => Number((ms / 1000).toFixed(1)))
    expect(m.mixtures.map((x) => times(x.id))).toEqual([
      [239, 392.5],
      [119.5, 196.3],
      [119.5, 196.3],
      [478, 785],
    ])
    expect(119.5 * 1000).toBeGreaterThan(20 * m.delayLimitMs)
    expect(785 * 1000).toBeLessThan(m.watchLimitMs / 2)
  })
})

describe('what the seed fixes', () => {
  it('is the room alone, and a scatter for each attempt at each run', () => {
    expect(labSetup(m, 1)).toEqual({ roomTenths: 225, bathTenths: {} })
    expect(m.runs.map((run) => scatterOf(m, 1, run.id, 0))).toEqual([-100, 6, 97, 94])
    const rooms = Array.from({ length: 100 }, (_, i) => labSetup(m, i + 1).roomTenths)
    expect([Math.min(...rooms), Math.max(...rooms)]).toEqual([200, 240])
  })
})
