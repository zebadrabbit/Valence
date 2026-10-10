import { describe, expect, it } from 'vitest'
import { formatFigures, toNumber } from '../figures'
import { can, warnings } from './actions'
import { concentration, endMs, modelProblems, rateConstantAt, usedUp, type KineticsModel } from './model'
import { fieldsOf } from './notebook'
import { doneParts, lookAt, rateLawView, runView, temperatureView, timesTable } from './select'
import { labSetup } from './setup'
import { createLab, currentAttempt, endOf, kineticsStateSchema } from './state'
import { apparentOrder, finishLab, makeBathRuns, makeRoomRuns, makeRun, rateLawValues, run, wholeLab, wholeSheet } from './testkit'

// Spec 19.7, sixth item: the engine holds nothing of the clock reaction that is not in its record. Here it is run
// on a second, made-up record: a reaction of three things that is second order in the first, of no order in the
// second and first order in the third, timed by a dye whose colour goes when the dye is used up, one for one, with
// nothing to add to show it; four mixtures of 25 mL, two baths, another rate constant at another temperature and
// another activation energy. No bottle, reactant, mixture, run or bath has a name the clock reaction lab uses.

const MADE_UP: KineticsModel = {
  solutions: [
    { id: 'first', microMolar: 200000 },
    { id: 'second', microMolar: 100000 },
    { id: 'third', microMolar: 50000 },
    { id: 'dye', microMolar: 2000 },
    { id: 'solvent', microMolar: null },
  ],
  reactants: [
    { id: 'a', solutionId: 'first', order: 2 },
    { id: 'b', solutionId: 'second', order: 0 },
    { id: 'c', solutionId: 'third', order: 1 },
  ],
  end: { solutionId: 'dye', per: 1, indicatorId: null },
  rateConstant: 0.25,
  referenceCentiKelvin: 30315,
  activationJ: 70000,
  gasConstantE9: 8314462618,
  zeroCelsiusCentiKelvin: 27315,
  mixtures: [
    { id: 'plain', tenthMl: { first: 50, second: 50, third: 50, dye: 50, solvent: 50 } },
    { id: 'more-first', tenthMl: { first: 100, second: 50, third: 50, dye: 50, solvent: 0 } },
    { id: 'more-second', tenthMl: { first: 50, second: 100, third: 50, dye: 50, solvent: 0 } },
    { id: 'more-third', tenthMl: { first: 50, second: 50, third: 100, dye: 50, solvent: 0 } },
  ],
  runs: [
    { id: 'one', mixtureId: 'plain', bathId: null },
    { id: 'two', mixtureId: 'more-first', bathId: null },
    { id: 'three', mixtureId: 'more-second', bathId: null },
    { id: 'four', mixtureId: 'more-third', bathId: null },
    { id: 'chilled', mixtureId: 'plain', bathId: 'cold' },
    { id: 'heated', mixtureId: 'plain', bathId: 'hot' },
  ],
  referenceRunId: 'one',
  orderRuns: { a: ['one', 'two'], b: ['one', 'three'], c: ['one', 'four'] },
  baths: [
    { id: 'cold', rangeTenths: [80, 110] },
    { id: 'hot', rangeTenths: [400, 450] },
  ],
  roomRangeTenths: [180, 260],
  orderChoices: [0, 1, 2],
  unitPowers: [0, -1, -2, -3],
  scatterPerTenThousand: 50,
  delayLimitMs: 1500,
  watchLimitMs: 3600000,
  rateConstantTolerancePercent: 5,
  activationTolerancePercent: 5,
  places: { fromMicro: 3100, stepMicro: 50, count: 11 },
}
const m = MADE_UP
const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1)

describe('the kinetics engine on a second record (spec 19.7, sixth item)', () => {
  it('can run the record', () => {
    expect(modelProblems(m)).toEqual([])
  })

  it("works the strengths, what is used up and the time from the record's own numbers", () => {
    // 0.200 M x 5.0 mL / 25.0 mL = 0.0400 M, and so on; the dye is used up whole, one for one.
    expect(m.reactants.map((r) => toNumber(concentration(m, 'plain', r.solutionId)))).toEqual([0.04, 0.02, 0.01])
    expect(toNumber(usedUp(m, 'plain'))).toBe(0.0004)
    // 0.0004 / (0.25 x 0.04² x 0.01) = 100 s at the reference temperature; a quarter of that with twice the first reactant, the same with twice the second, half with twice the third.
    expect(m.mixtures.map((x) => endMs(m, x.id, 30315, 0))).toEqual([100000, 25000, 100000, 50000])
    expect(rateConstantAt(m, 30315)).toBe(0.25)
    expect(rateConstantAt(m, 31315) / rateConstantAt(m, 30315)).toBeCloseTo(Math.exp((70000 / 8.314462618) * (1 / 303.15 - 1 / 313.15)), 9)
  })

  it('has a sheet with an entry for each of its three reactants', () => {
    expect(fieldsOf(m, 'rate-law')).toEqual(['concentration:a', 'concentration:b', 'concentration:c', 'rate', 'order:a', 'order:b', 'order:c', 'rateConstant', 'unit'])
  })

  it('needs nothing added to show the end of a run: there is no such step, no warning for it, and a run without it counts', () => {
    let state = createLab(m, 4, 'guided')
    expect(can(m, state, { type: 'addIndicator', run: 'one' })).toBe('already-done')
    expect(warnings(m, state, { type: 'pour', run: 'one' })).toEqual([])
    state = run(m, state, [{ type: 'pour', run: 'one' }])
    const end = endOf(m, 4, 'one', currentAttempt(state, 'one'))!
    expect([lookAt(m, state, 'one', end - 1), lookAt(m, state, 'one', end)]).toEqual(['before', 'after'])
    state = run(m, state, [{ type: 'stopAtEnd', run: 'one' }])
    expect(runView(m, state, 'one')).toMatchObject({ indicator: false, look: 'after', outcome: { state: 'counts' } })
    // The bath's warning is still raised, with no other beside it.
    const inBath = run(m, state, [{ type: 'standInBath', run: 'heated' }, { type: 'readThermometer', run: 'heated' }])
    expect(warnings(m, inBath, { type: 'pour', run: 'heated' })).toEqual(['not-at-temperature'])
    expect(runView(m, makeRun(m, inBath, 'chilled', { stand: false, stop: 'end' }), 'chilled').outcome).toEqual({ state: 'does-not-count', reasons: ['not-at-temperature'] })
  })

  it('finds its own orders, two, none and one, at every seed, with a unit to match, in Guided and in Challenge', () => {
    for (const mode of ['guided', 'challenge'] as const) {
      for (const seed of SEEDS) {
        const timed = makeRoomRuns(m, createLab(m, seed, mode), { stop: { delayMs: 200 } })
        expect(m.reactants.map((r) => Math.round(apparentOrder(m, timed, r.id)) + 0), `${mode} ${seed}`).toEqual([2, 0, 1])
        const values = rateLawValues(m, timed)
        expect([values['order:a'], values['order:b'], values['order:c'], values.unit], `${mode} ${seed}`).toEqual([2, 0, 1, -2])
        const state = wholeSheet(m, timed, 'rate-law')
        const view = rateLawView(m, state)
        expect(view.outcome.state, `${mode} ${seed}`).toBe('counts')
        expect(view.expected, `${mode} ${seed}`).toEqual({ orders: { a: 2, b: 0, c: 1 }, rateConstant: rateConstantAt(m, labSetup(m, seed).roomTenths * 10 + 27315), roomTenths: labSetup(m, seed).roomTenths })
      }
    }
  })

  it('refuses in Guided, and marks in Challenge, the orders the clock reaction has', () => {
    const timed = makeRoomRuns(m, createLab(m, 2, 'guided'))
    const values = rateLawValues(m, timed)
    const upToOrders = run(m, timed, ['concentration:a', 'concentration:b', 'concentration:c', 'rate'].map((field) => ({ type: 'enter', sheet: 'rate-law', field, value: values[field]! }) as const))
    expect(can(m, upToOrders, { type: 'enter', sheet: 'rate-law', field: 'order:a', value: 1 })).toBe('does-not-follow')
    expect(can(m, upToOrders, { type: 'enter', sheet: 'rate-law', field: 'order:a', value: 2 })).toBeNull()
    const marked = wholeSheet(m, makeRoomRuns(m, createLab(m, 2, 'challenge')), 'rate-law', { slip: 'wrong-order' })
    expect(rateLawView(m, marked).outcome).toMatchObject({ state: 'does-not-count', reasons: ['entries-do-not-follow'] })
  })

  it('completes a whole lab at every seed: six runs, the rate law and the activation energy, each within its tolerance', () => {
    for (const seed of SEEDS) {
      const state = wholeLab(m, createLab(m, seed, 'challenge'), { stop: 'end' })
      expect(doneParts(m, state), String(seed)).toEqual(['runs', 'rate-law', 'temperature'])
      expect(state.status, String(seed)).toBe('completed')
      expect(temperatureView(m, state).expected, String(seed)).toEqual({ activationKJ: 70 })
      const { outcome } = temperatureView(m, state)
      expect(outcome.state === 'counts' && Math.abs(outcome.percentOff) < 2, String(seed)).toBe(true)
      expect(kineticsStateSchema(m).safeParse(JSON.parse(JSON.stringify(state))).success, String(seed)).toBe(true)
    }
  }, 60_000)

  it('fills its table and its graph from its own runs', () => {
    const state = wholeSheet(m, makeBathRuns(m, makeRoomRuns(m, createLab(m, 3, 'guided'), { stop: 'end' }), { stop: 'end' }), 'rate-law')
    expect(timesTable(m, state).map((row) => `${row.runId} ${row.bathId ?? 'room'}`)).toEqual(['one room', 'two room', 'three room', 'four room', 'chilled cold', 'heated hot'])
    const view = rateLawView(m, state)
    expect(view.rows!.map((row) => `${row.runId}: ${Object.values(row.strengths).map(formatFigures).join(', ')}`)).toEqual(['two: 0.0800, 0.0200, 0.0100', 'three: 0.0400, 0.0400, 0.0100', 'four: 0.0400, 0.0200, 0.0200'])
    expect(view.constants!.rows.map((row) => row.runId)).toEqual(['two', 'three', 'four'])
    const graph = temperatureView(m, state).graph!
    expect(graph.points.map((p) => p.runId)).toEqual(['one', 'chilled', 'heated'])
    expect(graph.places.length).toBe(11)
    // ln k falls as 1/T rises: about -70 000 / 8.314 = -8420 K.
    const slope = ((graph.line[1].yMilli - graph.line[0].yMilli) * 1000) / (graph.line[1].xMicro - graph.line[0].xMicro)
    expect(Math.abs(slope / -8419 - 1)).toBeLessThan(0.02)
  })

  it('can be finished from a lab whose runs went wrong', () => {
    let state = createLab(m, 9, 'challenge')
    state = makeRun(m, state, 'heated', { stand: false, stop: { delayMs: 0 } })
    state = makeRun(m, state, 'two', { stop: { earlyMs: 4000 } })
    state = run(m, state, [{ type: 'pour', run: 'three' }])
    expect(finishLab(m, state).status).toBe('completed')
  })
})
