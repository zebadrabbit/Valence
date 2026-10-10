import { describe, expect, it } from 'vitest'
import { compare, exact, formatFigures, parseFigures, toNumber, toSig3, type Sig3 } from '../figures'
import { constantOf, fieldsOf, kindOf, lineOf, meanOf, placesOf, pointsOf, rateOf, reactantIdOf, slopeBetween, verdictOf, type Context, type Entries, type Place, type Value } from '../kinetics/notebook'
import { PINNED_MODEL as m } from './pinnedModel'

// The notebook (spec 19.3): whether each entry follows from the learner's own numbers, under the calorimetry lab's
// rounding rule, and what the notebook fills in by itself. The times are those of seed 1's careful runs.

const timings = { 'mixture-1': 1244, 'mixture-2': 615, 'mixture-3': 619, 'mixture-4': 312, 'mixture-5': 1366, 'bath-ice': 6371, 'bath-cool': 2994, 'bath-warm': 352 }
const lab = { roomTenths: 225, bathTenths: { ice: 5, cool: 101, warm: 420 } }
const ORDERS = { iodide: 1, bromate: 1, 'hydrogen-ion': 2 }
const points = pointsOf(m, lab, timings, ORDERS)
const places = placesOf(m, points)
const context: Context = { timings, places }
const fig = (text: string): Sig3 => parseFigures(text)!
const CAREFUL: Record<string, Value> = {
  'concentration:iodide': fig('0.00200'),
  'concentration:bromate': fig('0.00800'),
  'concentration:hydrogen-ion': fig('0.0200'),
  rate: fig('2.68e-7'),
  'order:iodide': 1,
  'order:bromate': 1,
  'order:hydrogen-ion': 2,
  rateConstant: fig('41.9'),
  unit: -3,
  first: 0,
  second: 11,
  slope: fig('-6010'),
  energy: fig('50.0'),
}
const verdict = (field: string, value: Value, over: Record<string, Value | null> = {}, at: Context = context) => verdictOf(m, at, { ...CAREFUL, ...over, [field]: value } as Entries, field)
const follows = (field: string, text: string, over: Record<string, Value | null> = {}) => verdict(field, fig(text), over)?.follows

describe("the sheets' entries", () => {
  it('are, for the rate law: a strength for each reactant, the rate, an order for each reactant, the rate constant and its unit', () => {
    expect(fieldsOf(m, 'rate-law')).toEqual(['concentration:iodide', 'concentration:bromate', 'concentration:hydrogen-ion', 'rate', 'order:iodide', 'order:bromate', 'order:hydrogen-ion', 'rateConstant', 'unit'])
    expect(fieldsOf(m, 'temperature')).toEqual(['first', 'second', 'slope', 'energy'])
    expect([kindOf('order:iodide'), reactantIdOf('order:iodide'), kindOf('rate'), reactantIdOf('rate')]).toEqual(['order', 'iodide', 'rate', null])
  })

  it('all follow where a careful learner made them, and say nothing where they are empty', () => {
    for (const field of [...fieldsOf(m, 'rate-law'), ...fieldsOf(m, 'temperature')]) {
      expect(verdictOf(m, context, CAREFUL as Entries, field), field).toEqual({ follows: true, slip: null })
      expect(verdictOf(m, context, { ...CAREFUL, [field]: null } as Entries, field), field).toBeNull()
    }
  })
})

describe('the strength of a reactant once the flasks are mixed', () => {
  it('is its strength in the bottle times its volume over the whole volume, and nothing else', () => {
    expect(follows('concentration:iodide', '0.00200')).toBe(true)
    expect(follows('concentration:iodide', '2.00e-3')).toBe(true)
    expect(follows('concentration:iodide', '0.00201')).toBe(false)
    expect(follows('concentration:bromate', '0.00800')).toBe(true)
    expect(follows('concentration:hydrogen-ion', '0.0200')).toBe(true)
    expect(follows('concentration:hydrogen-ion', '0.00200')).toBe(false)
  })

  it('is told from the strength in the bottle, and is given without a sign', () => {
    expect(verdict('concentration:iodide', fig('0.0100'))).toEqual({ follows: false, slip: 'not-diluted' })
    expect(verdict('concentration:bromate', fig('0.0400'))).toEqual({ follows: false, slip: 'not-diluted' })
    expect(verdict('concentration:iodide', fig('-0.00200'))).toEqual({ follows: false, slip: 'wrong-sign' })
    expect(verdict('concentration:iodide', fig('0.00400'))).toEqual({ follows: false, slip: null })
  })
})

describe('the rate of the first run', () => {
  it('is a sixth of the thiosulfate over the time: 1/30 000 mol/L over 124.4 s', () => {
    expect(formatFigures(toSig3(rateOf(m, 'mixture-1', timings))!)).toBe('2.68 × 10⁻⁷')
    expect(compare(rateOf(m, 'mixture-1', timings), exact(1, 30000 * 124.4))).toBe(0)
    expect(follows('rate', '2.68e-7')).toBe(true)
    expect(follows('rate', '0.000000268')).toBe(true)
  })

  it('may be worked with the time, or what is used up, taken in full or to three figures', () => {
    // 3.33e-5 / 124.4 = 2.677e-7 at the least, and 3.3333e-5 / 124 = 2.688e-7 at the most.
    expect(follows('rate', '2.69e-7')).toBe(true)
    expect(follows('rate', '2.67e-7')).toBe(false)
    expect(follows('rate', '2.70e-7')).toBe(false)
  })

  it('is told from a figure cut off, from all of the thiosulfate, and from one with a sign', () => {
    expect(verdict('rate', fig('2.67e-7'))).toEqual({ follows: false, slip: 'cut-off' })
    // 2.00e-4 / 124.4 = 1.61e-6: the thiosulfate itself, not the bromate it stands for.
    expect(verdict('rate', fig('1.61e-6'))).toEqual({ follows: false, slip: 'count-left-out' })
    expect(verdict('rate', fig('-2.68e-7'))).toEqual({ follows: false, slip: 'wrong-sign' })
    expect(verdict('rate', fig('2.68e-5'))).toEqual({ follows: false, slip: null })
  })
})

describe('the order in a reactant', () => {
  it('is the choice nearest the power that takes the ratio of the strengths to the ratio of the rates', () => {
    // Runs 1 and 2: twice the iodide, and 124.4 / 61.5 = 2.02 times the rate.
    expect([0, 1, 2].map((order) => verdict('order:iodide', order)?.follows)).toEqual([false, true, false])
    expect([0, 1, 2].map((order) => verdict('order:bromate', order)?.follows)).toEqual([false, true, false])
    // Runs 1 and 4: twice the hydrogen ion, and 124.4 / 31.2 = 3.99 times the rate.
    expect([0, 1, 2].map((order) => verdict('order:hydrogen-ion', order)?.follows)).toEqual([false, false, true])
  })

  it('is decided on whole numbers, and turns over only where the ratio of the rates is nearer another power', () => {
    const at = (second: number) => [0, 1, 2].filter((order) => verdictOf(m, { timings: { ...timings, 'mixture-2': second }, places }, CAREFUL as Entries, 'order:iodide') && verdict('order:iodide', order, {}, { timings: { ...timings, 'mixture-2': second }, places })!.follows)
    // The same time: no change in the rate. Between the choices the line is at a ratio of √2, and of √8.
    expect(at(1244)).toEqual([0])
    expect(at(880)).toEqual([0])
    expect(at(879)).toEqual([1])
    expect(at(440)).toEqual([1])
    expect(at(439)).toEqual([2])
    expect(at(311)).toEqual([2])
    expect(at(100)).toEqual([2])
  })

  it('is not a choice the model does not offer', () => {
    expect(verdict('order:iodide', 3)).toEqual({ follows: false, slip: null })
  })
})

describe('the rate constant of the first run and its unit', () => {
  it('is the rate over the strengths, each raised to the order the learner gave it', () => {
    // 2.68e-7 / (0.00200 x 0.00800 x 0.0200²) = 41.875; unrounded, 41.867.
    expect(follows('rateConstant', '41.9')).toBe(true)
    expect(formatFigures(toSig3(constantOf(m, 'mixture-1', timings, ORDERS))!)).toBe('41.9')
    expect(follows('rateConstant', '42.1')).toBe(false)
    expect(verdict('rateConstant', fig('-41.9'))).toEqual({ follows: false, slip: 'wrong-sign' })
  })

  it('follows from the rate as the learner typed it, or from the unrounded rate, or from anything between', () => {
    // With the rate typed 2.69e-7, which also follows, the constant is 42.03.
    expect(follows('rateConstant', '42.0', { rate: fig('2.69e-7') })).toBe(true)
    expect(follows('rateConstant', '41.9', { rate: fig('2.69e-7') })).toBe(true)
    expect(follows('rateConstant', '42.1', { rate: fig('2.69e-7') })).toBe(false)
    // A rate that does not follow is still the learner's own number: 3.00e-7 / 6.4e-9 = 46.9.
    expect(follows('rateConstant', '46.9', { rate: fig('3.00e-7') })).toBe(true)
    expect(follows('rateConstant', '41.9', { rate: fig('3.00e-7') })).toBe(true)
    expect(follows('rateConstant', '44.0', { rate: fig('3.00e-7') })).toBe(false)
  })

  it("follows from the learner's own orders, whatever they are, and so does the unit", () => {
    const wrong = { 'order:hydrogen-ion': 1 }
    // 2.68e-7 / (0.00200 x 0.00800 x 0.0200) = 0.8375, in L²/(mol²·s).
    expect(follows('rateConstant', '0.838', wrong)).toBe(true)
    expect(follows('rateConstant', '0.837', wrong)).toBe(true)
    expect(follows('rateConstant', '0.842', wrong)).toBe(false)
    expect(follows('rateConstant', '41.9', wrong)).toBe(false)
    expect([0, -1, -2, -3, -4].map((unit) => verdict('unit', unit, wrong)?.follows)).toEqual([false, false, true, false, false])
    expect([0, -1, -2, -3, -4].map((unit) => verdict('unit', unit)?.follows)).toEqual([false, false, false, true, false])
    // An order of nothing leaves that strength out.
    expect(follows('rateConstant', '2.09', { 'order:hydrogen-ion': 0, 'order:bromate': 0 })).toBe(false)
    expect(follows('rateConstant', '1.34e-4', { 'order:hydrogen-ion': 0, 'order:bromate': 0 })).toBe(true)
  })

  it('is told from a figure cut off where it should be rounded', () => {
    // With what is used up rounded before the time divides it, the constant is 41.83, so 41.8 follows too.
    expect(follows('rateConstant', '41.8')).toBe(true)
    expect(follows('rateConstant', '41.7')).toBe(false)
    // From a rate typed 3.00e-7 the constant is 46.875: 46.9 rounded, and 46.8 cut off.
    expect(verdict('rateConstant', fig('46.8'), { rate: fig('3.00e-7') })).toEqual({ follows: false, slip: 'cut-off' })
  })

  it('waits for the entries it is worked from', () => {
    expect(verdictOf(m, context, { ...CAREFUL, rate: null } as Entries, 'rateConstant')).toBeNull()
    expect(verdictOf(m, context, { ...CAREFUL, 'order:bromate': null } as Entries, 'rateConstant')).toBeNull()
    expect(verdictOf(m, context, { ...CAREFUL, 'order:bromate': null } as Entries, 'unit')).toBeNull()
  })
})

describe('what the notebook fills for the rate law', () => {
  it("gives each run's rate constant, worked from unrounded values, and their mean", () => {
    const constants = ['mixture-1', 'mixture-2', 'mixture-3', 'mixture-4', 'mixture-5'].map((runId) => constantOf(m, runId, timings, ORDERS))
    expect(constants.map((k) => formatFigures(toSig3(k)!))).toEqual(['41.9', '42.3', '42.1', '41.7', '42.4'])
    expect(formatFigures(toSig3(meanOf(constants))!)).toBe('42.1')
    expect(compare(meanOf([exact(1, 2), exact(1, 3), exact(1, 6)]), exact(1, 3))).toBe(0)
  })
})

describe('the graph of part 3', () => {
  it('has a point for each temperature: one over the kelvin temperature to four figures, and the logarithm of the rate constant to three decimals', () => {
    expect(points.map((p) => `${p.runId}: ${p.tenths / 10} °C, ${p.centiKelvin / 100} K, ${p.xMicro}, ${formatFigures(toSig3(p.constant)!)}, ${p.yMilli}`)).toEqual([
      'mixture-1: 22.5 °C, 295.65 K, 3382, 41.9, 3735',
      'bath-ice: 0.5 °C, 273.65 K, 3654, 8.18, 2101',
      'bath-cool: 10.1 °C, 283.25 K, 3530, 17.4, 2856',
      'bath-warm: 42 °C, 315.15 K, 3173, 148, 4997',
    ])
    for (const p of points) {
      expect(p.xMicro, p.runId).toBe(Math.round(1e8 / p.centiKelvin))
      expect(Math.abs(p.yMilli / 1000 - Math.log(toNumber(p.constant))), p.runId).toBeLessThanOrEqual(0.0005)
    }
  })

  it('has the least-squares line through those points as they are written', () => {
    const { slope, intercept } = lineOf(points)
    // By the usual sums, in floating point.
    const n = points.length
    const [sx, sy, sxx, sxy] = [points.reduce((s, p) => s + p.xMicro, 0), points.reduce((s, p) => s + p.yMilli, 0), points.reduce((s, p) => s + p.xMicro ** 2, 0), points.reduce((s, p) => s + p.xMicro * p.yMilli, 0)]
    const expected = (n * sxy - sx * sy) / (n * sxx - sx * sx)
    expect(toNumber(slope)).toBeCloseTo(expected, 9)
    expect(toNumber(intercept)).toBeCloseTo((sy - expected * sx) / n, 5)
    // Thousandths over millionths: -6.013 is -6013 K.
    expect(toNumber(slope) * 1000).toBeCloseTo(-6012.6, 0)
    expect(lineOf([{ xMicro: 3200, yMilli: 5000 }, { xMicro: 3600, yMilli: 2600 }]).slope).toEqual([-6n, 1n])
    expect(() => lineOf([{ xMicro: 3200, yMilli: 5000 }, { xMicro: 3200, yMilli: 2600 }])).toThrow(/no line/)
  })

  it('has twelve places on the line that can be looked at, each given to three decimals', () => {
    expect(places.map((p) => `${p.xMicro} ${p.yMilli}`)).toEqual(['3150 5134', '3200 4834', '3250 4533', '3300 4233', '3350 3932', '3400 3631', '3450 3331', '3500 3030', '3550 2729', '3600 2429', '3650 2128', '3700 1827'])
    const { slope, intercept } = lineOf(points)
    for (const place of places) expect(Math.abs(place.yMilli - (toNumber(slope) * place.xMicro + toNumber(intercept))), String(place.xMicro)).toBeLessThanOrEqual(0.5)
    // Every temperature the draw can give lies between the first place and the last.
    expect(places[0]!.xMicro).toBeLessThan(Math.round(1e8 / (420 * 10 + 27315)))
    expect(places.at(-1)!.xMicro).toBeGreaterThan(Math.round(1e8 / (5 * 10 + 27315)))
  })
})

describe('the slope of the line and the activation energy', () => {
  const steep: Place[] = [{ xMicro: 3200, yMilli: 4850 }, { xMicro: 3600, yMilli: 2443 }]

  it('take the slope between the two places entered: the difference in ln k over the difference in 1/T, with its sign', () => {
    // (1.827 - 5.134) / (0.003700 - 0.003150) = -6012.7 K
    expect(toNumber(slopeBetween(places[0]!, places[11]!)!)).toBeCloseTo(-6012.727, 3)
    expect(follows('slope', '-6010')).toBe(true)
    expect(follows('slope', '-6.01e3')).toBe(true)
    expect(follows('slope', '-6020')).toBe(false)
    // Taken the other way round the two differences both change sign, and the slope does not.
    expect(follows('slope', '-6010', { first: 11, second: 0 })).toBe(true)
    expect(slopeBetween(places[3]!, places[3]!)).toBeNull()
  })

  it('tell a slope without its sign, and one cut off, from one that is wrong', () => {
    expect(verdict('slope', fig('6010'))).toEqual({ follows: false, slip: 'wrong-sign' })
    expect(verdict('slope', fig('-5000'))).toEqual({ follows: false, slip: null })
    // Between the two made-up places the slope is -6017.5: -6020 rounded, -6010 cut off.
    const at: Context = { timings, places: steep }
    expect(verdict('slope', fig('-6020'), { first: 0, second: 1 }, at)).toEqual({ follows: true, slip: null })
    expect(verdict('slope', fig('-6010'), { first: 0, second: 1 }, at)).toEqual({ follows: false, slip: 'cut-off' })
  })

  it('take the activation energy as the size of the slope times the gas constant, over 1000', () => {
    // 6010 x 8.314462618 / 1000 = 49.97; with the unrounded slope, 49.99; with 8.31, 49.94.
    expect(follows('energy', '50.0')).toBe(true)
    expect(follows('energy', '49.9')).toBe(true)
    expect(follows('energy', '50.1')).toBe(false)
    expect(follows('energy', '49.8')).toBe(false)
  })

  it('tell an energy with a minus sign, one in joules, and one cut off', () => {
    expect(verdict('energy', fig('-50.0'))).toEqual({ follows: false, slip: 'wrong-sign' })
    expect(verdict('energy', fig('50000'))).toEqual({ follows: false, slip: 'joules-for-kilojoules' })
    expect(verdict('energy', fig('5.00e4'))).toEqual({ follows: false, slip: 'joules-for-kilojoules' })
    expect(verdict('energy', fig('49.8'))).toEqual({ follows: false, slip: null })
    // From a slope typed -6020, which does not follow here: 50.05 with the full gas constant, 50.03 with 8.31; cut off, 50.0.
    expect(follows('energy', '50.1', { slope: fig('-6020') })).toBe(true)
    expect(verdict('energy', fig('50.0'), { slope: fig('-6020') })).toEqual({ follows: true, slip: null })
    expect(verdict('energy', fig('50.2'), { slope: fig('-6020') })).toEqual({ follows: false, slip: null })
  })

  it('take a place only where there is one, and the second only where it is another', () => {
    expect(verdict('first', 12)).toEqual({ follows: false, slip: null })
    expect(verdict('second', 0, { first: 0 })).toEqual({ follows: false, slip: null })
    expect(verdictOf(m, context, { ...CAREFUL, second: null } as Entries, 'slope')).toBeNull()
    expect(verdictOf(m, context, { ...CAREFUL, slope: null } as Entries, 'energy')).toBeNull()
  })
})
