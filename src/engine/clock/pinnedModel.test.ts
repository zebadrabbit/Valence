import { describe, expect, it } from 'vitest'
import { compare, exact, formatFigures, toNumber, toSig3 } from '../figures'
import { bathRuns, concentration, endMs, modelOrders, modelProblems, rateConstantAt, roomRuns, strengthsProduct, temperatureRuns, totalTenthMl, usedUp, type KineticsModel } from '../kinetics/model'
import { PINNED_MODEL as m } from './pinnedModel'

// The numbers the clock reaction lab runs on, as the kinetics engine reads them: the five mixtures, what each
// holds once it is mixed, the rate constant at any temperature and the time of a run. Pinned against the literal
// model; src/engine/clock/model.test.ts holds that literal to the stored record.

const shown = (mixtureId: string, solutionId: string) => formatFigures(toSig3(concentration(m, mixtureId, solutionId))!)

describe('the model', () => {
  it('is one the engine can run', () => {
    expect(modelProblems(m)).toEqual([])
  })

  it('has five runs at the room\'s temperature and three in baths, all three of the first mixture', () => {
    expect(roomRuns(m).map((r) => r.id)).toEqual(['mixture-1', 'mixture-2', 'mixture-3', 'mixture-4', 'mixture-5'])
    expect(bathRuns(m).map((r) => `${r.id} ${r.mixtureId} ${r.bathId}`)).toEqual(['bath-ice mixture-1 ice', 'bath-cool mixture-1 cool', 'bath-warm mixture-1 warm'])
    expect(temperatureRuns(m).map((r) => r.id)).toEqual(['mixture-1', 'bath-ice', 'bath-cool', 'bath-warm'])
  })

  it('is refused where a record would not hold together', () => {
    const broken = (edit: (model: KineticsModel) => KineticsModel) => modelProblems(edit(m)).join('\n')
    expect(broken((x) => ({ ...x, reactants: [...x.reactants.slice(0, 2), { ...x.reactants[2]!, order: 3 }] }))).toMatch(/the order of "hydrogen-ion" is not one of the choices/)
    expect(broken((x) => ({ ...x, unitPowers: [0, -1, -2] }))).toMatch(/the unit of the model's own rate constant is not among the choices/)
    expect(broken((x) => ({ ...x, end: { ...x.end, solutionId: 'water' } }))).toMatch(/what is used up by the end of a run comes from no bottle with a strength/)
    expect(broken((x) => ({ ...x, referenceRunId: 'bath-ice' }))).toMatch(/the reference run is one at the room's temperature/)
    expect(broken((x) => ({ ...x, orderRuns: { ...x.orderRuns, iodide: ['mixture-1', 'mixture-5'] } }))).toMatch(/the two runs for the order of "iodide" differ in another reactant too/)
    expect(broken((x) => ({ ...x, orderRuns: { ...x.orderRuns, iodide: ['mixture-1', 'mixture-3'] } }))).toMatch(/the two runs for the order of "iodide" hold the same strength of it/)
    expect(broken((x) => ({ ...x, runs: [...x.runs, { id: 'bath-warm-2', mixtureId: 'mixture-2', bathId: 'warm' }] }))).toMatch(/the runs in the baths are of the reference run's mixture/)
    expect(broken((x) => ({ ...x, roomRangeTenths: [240, 200] }))).toMatch(/the range of "room" runs from its lower end to its upper/)
    expect(broken((x) => ({ ...x, mixtures: [{ ...x.mixtures[0]!, tenthMl: { ...x.mixtures[0]!.tenthMl, 'hcl-0.1m': 0 } }, ...x.mixtures.slice(1)] }))).toMatch(/the mixture "mixture-1" lacks a reactant/)
  })
})

describe('the five mixtures (spec 19.1)', () => {
  it('are of 50 mL each', () => {
    for (const mixture of m.mixtures) expect(totalTenthMl(mixture), mixture.id).toBe(500)
  })

  it('hold, once mixed, the strengths a learner works out: the bottle\'s strength times its volume over 50 mL', () => {
    expect(m.mixtures.map((x) => [x.id, shown(x.id, 'ki-0.01m'), shown(x.id, 'kbro3-0.04m'), shown(x.id, 'hcl-0.1m'), shown(x.id, 'na2s2o3-0.001m')].join(' | '))).toEqual([
      'mixture-1 | 0.00200 | 0.00800 | 0.0200 | 2.00 × 10⁻⁴',
      'mixture-2 | 0.00400 | 0.00800 | 0.0200 | 2.00 × 10⁻⁴',
      'mixture-3 | 0.00200 | 0.0160 | 0.0200 | 2.00 × 10⁻⁴',
      'mixture-4 | 0.00200 | 0.00800 | 0.0400 | 2.00 × 10⁻⁴',
      'mixture-5 | 0.00160 | 0.00400 | 0.0300 | 2.00 × 10⁻⁴',
    ])
  })

  it('double one reactant each in the second, third and fourth, and change all three in the fifth', () => {
    const ratio = (mixtureId: string, solutionId: string) => toNumber(exact(concentration(m, mixtureId, solutionId), concentration(m, 'mixture-1', solutionId)))
    const ratios = (mixtureId: string) => m.reactants.map((r) => ratio(mixtureId, r.solutionId))
    expect(ratios('mixture-2')).toEqual([2, 1, 1])
    expect(ratios('mixture-3')).toEqual([1, 2, 1])
    expect(ratios('mixture-4')).toEqual([1, 1, 2])
    expect(ratios('mixture-5')).toEqual([0.8, 0.5, 1.5])
  })

  it('use up the same small amount in every run: a sixth of the thiosulfate, which is one part of bromate in 30 000 of a mole for a litre', () => {
    for (const mixture of m.mixtures) expect(compare(usedUp(m, mixture.id), exact(1, 30000)), mixture.id).toBe(0)
    expect(m.end.per).toBe(6)
  })

  it('keep what is used up small beside every reactant, so that taking the strengths as they are at mixing is fair to about one part in a hundred', () => {
    // By the end of a run the bromate is down by what is used up, the hydrogen ion by six times that, and the iodide
    // not at all: the thiosulfate gives back every iodide ion the reaction takes. The true time is the sum of
    // small steps at the falling rate, set here against the time at the starting rate.
    const longer = m.mixtures.map((mixture) => {
      const used = toNumber(usedUp(m, mixture.id))
      const [bromate, acid] = [toNumber(concentration(m, mixture.id, 'kbro3-0.04m')), toNumber(concentration(m, mixture.id, 'hcl-0.1m'))]
      const steps = 2000
      let time = 0
      for (let i = 0; i < steps; i++) {
        const x = (used * (i + 0.5)) / steps
        time += used / steps / ((bromate - x) * (acid - 6 * x) ** 2)
      }
      return { id: mixture.id, bromatePercent: (used / bromate) * 100, acidPercent: ((6 * used) / acid) * 100, longerPercent: (time / (used / (bromate * acid ** 2)) - 1) * 100 }
    })
    expect(longer.map((x) => `${x.id}: ${x.bromatePercent.toFixed(2)}% of the bromate, ${x.acidPercent.toFixed(2)}% of the hydrogen ion, ${x.longerPercent.toFixed(2)}% longer`)).toEqual([
      'mixture-1: 0.42% of the bromate, 1.00% of the hydrogen ion, 1.22% longer',
      'mixture-2: 0.42% of the bromate, 1.00% of the hydrogen ion, 1.22% longer',
      'mixture-3: 0.21% of the bromate, 1.00% of the hydrogen ion, 1.12% longer',
      'mixture-4: 0.42% of the bromate, 0.50% of the hydrogen ion, 0.71% longer',
      'mixture-5: 0.83% of the bromate, 0.67% of the hydrogen ion, 1.09% longer',
    ])
  })
})

describe('the rate constant and the time of a run (spec 19.4)', () => {
  it('follow the Arrhenius equation from the stored figure at 25 °C', () => {
    expect(rateConstantAt(m, 29815)).toBe(50.26)
    const byPlatform = (centiK: number) => 50.26 * Math.exp((-50000 / 8.314462618) * (100 / centiK - 100 / 29815))
    for (const centiK of [27365, 28315, 29315, 29715, 31315, 31515]) expect(Math.abs(rateConstantAt(m, centiK) / byPlatform(centiK) - 1), String(centiK)).toBeLessThan(1e-12)
    expect([27315, 28315, 29315, 31315].map((centiK) => Number(rateConstantAt(m, centiK).toFixed(2)))).toEqual([7.93, 17.27, 35.63, 132.07])
  })

  it('give a time that is what must be used up over the rate, with the strengths as they are at mixing', () => {
    // (1/30000) / (50.26 x 0.00200 x 0.00800 x 0.0200²) = 103.63 s
    expect(endMs(m, 'mixture-1', 29815, 0)).toBe(103628)
    expect(toNumber(strengthsProduct(m, 'mixture-1', modelOrders(m)))).toBeCloseTo(6.4e-9, 20)
    expect(m.mixtures.map((x) => endMs(m, x.id, 29815, 0))).toEqual([103628, 51814, 51814, 25907, 115142])
  })

  it('move a time by its scatter, in parts in ten thousand', () => {
    expect(endMs(m, 'mixture-1', 29815, 100)).toBe(104664)
    expect(endMs(m, 'mixture-1', 29815, -100)).toBe(102592)
  })

  it('give every run, at every temperature and scatter the draw can give, a time long enough to time and short enough to wait for', () => {
    const times = (mixtureId: string, [low, high]: readonly [number, number]) => [endMs(m, mixtureId, high * 10 + 27315, -m.scatterPerTenThousand), endMs(m, mixtureId, low * 10 + 27315, m.scatterPerTenThousand)].map((ms) => Number((ms / 1000).toFixed(1)))
    expect(m.mixtures.map((x) => times(x.id, m.roomRangeTenths))).toEqual([
      [109.8, 147.6],
      [54.9, 73.8],
      [54.9, 73.8],
      [27.4, 36.9],
      [122, 164],
    ])
    expect(m.baths.map((bath) => times('mixture-1', bath.rangeTenths))).toEqual([
      [553.8, 636.9],
      [277.1, 328.5],
      [34.6, 45.1],
    ])
    // The shortest is far more than a hand's delay, and the longest is well inside the watch's half hour.
    expect(27.4 * 1000).toBeGreaterThan(10 * m.delayLimitMs)
    expect(636.9 * 1000).toBeLessThan(m.watchLimitMs / 2)
  })
})
