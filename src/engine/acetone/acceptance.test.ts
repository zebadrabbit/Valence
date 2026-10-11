import { describe, expect, it } from 'vitest'
import { parseFigures, toNumber, type Sig3 } from '../figures'
import { mulberry32 } from '../rng'
import { can, reduce, warnings, type Action } from '../kinetics/actions'
import { centiKelvin, endMs, modelOrders, rateConstantAt, roomRuns, type KineticsModel } from '../kinetics/model'
import { constantOf, fieldsOf, meanOf, type Field, type Value } from '../kinetics/notebook'
import { doneParts, leftAt, lookAt, rateLawView, runOutcomes, runView, sheetOutcomes, timesTable, watchAt } from '../kinetics/select'
import { labSetup } from '../kinetics/setup'
import { constantOff, createLab, currentAttempt, endOf, heldConstant, kineticsStateSchema, roomTimings, tenthsOf, type KineticsState, type Mode } from '../kinetics/state'
import { apparentOrder, entryActions, finishLab, makeRoomRuns, makeRun, ORDINARY_DELAY_MS, rateLawValues, run, wholeLab, wholeSheet } from '../kinetics/testkit'
import { PINNED_MODEL as m } from './pinnedModel'

// Spec 20.5, the iodination of acetone lab's acceptance list: spec 19.7's lines, for four mixtures and no baths,
// on the kinetics engine and the pinned model. That the engine's own tests still pass for the clock reaction's
// record is those tests' to show (src/engine/clock/), and the descriptions in words of the flask and of the liquid
// are the wording module's (src/app/lab/acetone/messages.test.ts).

const schema = kineticsStateSchema(m)
const SEEDS = Array.from({ length: 100 }, (_, i) => i + 1)
const MODES: Mode[] = ['guided', 'challenge']
const fig = (text: string): Sig3 => parseFigures(text)!
/** Through JSON and the schema, as a reload does. */
const reloaded = (state: KineticsState): KineticsState => schema.parse(JSON.parse(JSON.stringify(state)))
const range = (values: number[], digits = 2) => [Math.min(...values), Math.max(...values)].map((x) => Number(x.toFixed(digits)))

describe('careful runs (spec 19.7, first item, for four mixtures)', () => {
  it('of the four mixtures all count at every seed from 1 to 100, in Guided and in Challenge, by a hand of ordinary quickness and by the watch itself', () => {
    for (const mode of MODES) {
      for (const stop of [{ delayMs: ORDINARY_DELAY_MS }, 'end'] as const) {
        for (const seed of SEEDS) {
          const state = makeRoomRuns(m, createLab(m, seed, mode), { stop })
          const table = timesTable(m, state)
          expect(table.every((row) => row.tenths !== null && row.temperatureTenths === labSetup(m, seed).roomTenths && row.by === (stop === 'end' ? 'end' : 'hand')), `${mode} ${seed}`).toBe(true)
          expect(doneParts(m, state), `${mode} ${seed}`).toEqual(['runs'])
        }
      }
    }
  }, 120_000)

  it('give times of a few minutes for the first mixture, about half that for the second and third and about twice that for the fourth, which stays inside the watch\'s half hour', () => {
    const times: Record<string, number[]> = {}
    for (const seed of SEEDS) for (const row of timesTable(m, makeRoomRuns(m, createLab(m, seed, 'challenge'), { stop: 'end' }))) (times[row.runId] ??= []).push(row.tenths! / 10)
    expect(Object.fromEntries(Object.entries(times).map(([runId, seconds]) => [runId, range(seconds, 1)]))).toEqual({
      'mixture-1': [240.4, 388.7],
      'mixture-2': [120.8, 196.2],
      'mixture-3': [119.6, 195.8],
      'mixture-4': [478.6, 777.6],
    })
    expect(777.6 * 1000).toBeLessThan(m.watchLimitMs / 2)
  }, 60_000)

  it('give orders that are unmistakable: with an ordinary hand each is within 0.03 of a whole number, and the order in iodine within 0.03 of nought', () => {
    const apparent: Record<string, number[]> = {}
    const ratios: number[] = []
    for (const seed of SEEDS) {
      const state = makeRoomRuns(m, createLab(m, seed, 'challenge'))
      for (const reactant of m.reactants) (apparent[reactant.id] ??= []).push(apparentOrder(m, state, reactant.id))
      expect(rateLawValues(m, state), String(seed)).toMatchObject({ 'order:acetone': 1, 'order:hydrogen-ion': 1, 'order:iodine': 0, unit: -1 })
      // What a learner divides: the rate of the fourth mixture by that of the first. Twice the iodine in twice the time.
      const table = timesTable(m, state)
      ratios.push((2 * table[0]!.tenths!) / table[3]!.tenths!)
    }
    expect(Object.fromEntries(Object.entries(apparent).map(([id, orders]) => [id, range(orders, 3)]))).toEqual({ acetone: [0.971, 1.026], 'hydrogen-ion': [0.97, 1.024], iodine: [-0.027, 0.024] })
    expect(range(ratios, 3)).toEqual([0.981, 1.017])
    for (const reactant of m.reactants) for (const order of apparent[reactant.id]!) expect(Math.abs(order - reactant.order)).toBeLessThan(0.03)
  }, 60_000)

  it.each(MODES)('complete the lab in %s at every seed: the orders that follow are the stored ones, and the rate constant is within tolerance', (mode) => {
    const constants: number[] = []
    for (const seed of SEEDS) {
      const state = wholeLab(m, createLab(m, seed, mode))
      expect(state.status, `${mode} ${seed}`).toBe('completed')
      expect(doneParts(m, state), `${mode} ${seed}`).toEqual(['runs', 'rate-law'])
      const rateLaw = rateLawView(m, state)
      expect(rateLaw.entries.every((entry) => entry.verdict?.follows === true), `${mode} ${seed}`).toBe(true)
      expect(rateLaw.expected, `${mode} ${seed}`).toEqual({ orders: { acetone: 1, 'hydrogen-ion': 1, iodine: 0 }, rateConstant: heldConstant(m, seed), roomTenths: labSetup(m, seed).roomTenths })
      if (rateLaw.outcome.state !== 'counts') throw new Error(`${mode} ${seed}: a careful lab did not count`)
      expect(Math.abs(rateLaw.outcome.percentOff), `${mode} ${seed}`).toBeLessThan(1)
      constants.push(rateLaw.outcome.percentOff)
    }
    expect(range(constants)).toEqual([-0.63, 0.61])
  }, 120_000)

  it('count as well with the watch stopped at the end itself and with each entry worked from unrounded values', () => {
    for (const seed of SEEDS) {
      for (const chain of ['rounded', 'unrounded'] as const) {
        const state = wholeLab(m, createLab(m, seed, 'guided'), { chain, stop: 'end' })
        expect(state.status, `${seed} ${chain}`).toBe('completed')
      }
    }
  }, 120_000)

  it('are held to the rate constant at the room\'s own temperature, which runs from 1.61 to 2.59 hundred-thousandths', () => {
    expect(range(SEEDS.map((seed) => heldConstant(m, seed) * 1e5), 3)).toEqual([1.608, 2.589])
    expect(heldConstant(m, 1)).toBe(rateConstantAt(m, centiKelvin(m, labSetup(m, 1).roomTenths)))
  })
})

describe("a hand that is slow (the limit on a learner's own delay)", () => {
  it('still completes the lab at every seed with every watch stopped five seconds late, the latest that counts', () => {
    const [constants, orders]: [number[], number[]] = [[], []]
    for (const seed of SEEDS) {
      const state = wholeLab(m, createLab(m, seed, 'challenge'), { stop: { delayMs: m.delayLimitMs } })
      expect(state.status, String(seed)).toBe('completed')
      constants.push(constantOff(m, seed, roomTimings(m, state)!))
      orders.push(...m.reactants.map((reactant) => apparentOrder(m, state, reactant.id) - reactant.order))
    }
    expect(range(constants)).toEqual([-2.9, -1.23])
    expect(range(orders, 3)).toEqual([-0.052, 0.035])
  }, 120_000)

  it('cannot put the rate constant outside its tolerance, or an order in doubt, at any setup the draw can give with any run as late as counts and any other on time', () => {
    // Every corner: the room at either end of its range, each time at either end of its scatter, and each watch
    // stopped at the end or five seconds after it. The times are worked straight from the model.
    const corners = <T,>(lists: T[][]): T[][] => lists.reduce<T[][]>((all, list) => all.flatMap((sofar) => list.map((one) => [...sofar, one])), [[]])
    const worst = { constant: 0, order: 0, nought: 0 }
    const rooms = roomRuns(m)
    for (const roomTenths of m.roomRangeTenths) {
      const held = rateConstantAt(m, centiKelvin(m, roomTenths))
      for (const choice of corners(rooms.map(() => corners([[-1, 1], [0, 1]])))) {
        const timings = Object.fromEntries(rooms.map((r, i) => [r.id, tenthsOf(endMs(m, r.mixtureId, centiKelvin(m, roomTenths), choice[i]![0]! * m.scatterPerTenThousand) + choice[i]![1]! * m.delayLimitMs)]))
        worst.constant = Math.max(worst.constant, Math.abs((toNumber(meanOf(rooms.map((r) => constantOf(m, r.id, timings, modelOrders(m))))) / held - 1) * 100))
        // Twice the acetone or the acid: the order is the logarithm to the base two of the ratio of the times. Twice the iodine: one less than that of the times the other way.
        for (const doubled of ['mixture-2', 'mixture-3']) worst.order = Math.max(worst.order, Math.abs(Math.log2(timings['mixture-1']! / timings[doubled]!) - 1))
        worst.nought = Math.max(worst.nought, Math.abs(1 - Math.log2(timings['mixture-4']! / timings['mixture-1']!)))
      }
    }
    expect({ constant: Number(worst.constant.toFixed(2)), order: Number(worst.order.toFixed(3)), nought: Number(worst.nought.toFixed(3)) }).toEqual({ constant: 3.68, order: 0.087, nought: 0.059 })
    expect(worst.constant).toBeLessThan(m.rateConstantTolerancePercent)
    // An order is mistaken only where the power is nearer another whole number: half an order away.
    expect(Math.max(worst.order, worst.nought)).toBeLessThan(0.1)
  }, 120_000)

  it('makes a run not count once the watch is stopped later than that, or before the colour is gone, and names the cause; the run is then made again (spec 20.2)', () => {
    for (const seed of [1, 37, 88]) {
      let state = makeRun(m, createLab(m, seed, 'guided'), 'mixture-3', { stop: { delayMs: m.delayLimitMs + 1 } })
      expect(runView(m, state, 'mixture-3').outcome, String(seed)).toEqual({ state: 'does-not-count', reasons: ['stopped-late'] })
      expect(timesTable(m, state)[2]!.tenths, String(seed)).toBeNull()
      state = makeRun(m, run(m, state, [{ type: 'runAgain', run: 'mixture-3' }]), 'mixture-3', { stop: { earlyMs: 1 } })
      expect(runView(m, state, 'mixture-3'), String(seed)).toMatchObject({ look: 'before', outcome: { state: 'does-not-count', reasons: ['stopped-early'] } })
      expect(leftAt(m, state, 'mixture-3', 0)!.microMolar, String(seed)).toBe(1)
      state = makeRun(m, run(m, state, [{ type: 'runAgain', run: 'mixture-3' }]), 'mixture-3')
      expect(runOutcomes(m, state, 'mixture-3').map((attempt) => attempt.outcome.state), String(seed)).toEqual(['does-not-count', 'does-not-count', 'counts'])
    }
  })
})

describe('the bench can make no error of technique beyond the watch (spec 20.2)', () => {
  it('has nothing to add to show the end, no bath to stand a flask in, and so nothing for Guided to warn of before the pour', () => {
    for (const seed of SEEDS) {
      const state = createLab(m, seed, 'guided')
      for (const { id } of m.runs) {
        expect(warnings(m, state, { type: 'pour', run: id }), `${seed} ${id}`).toEqual([])
        expect(can(m, state, { type: 'pour', run: id }), `${seed} ${id}`).toBeNull()
        expect(can(m, state, { type: 'addIndicator', run: id }), `${seed} ${id}`).toBe('already-done')
        expect(can(m, state, { type: 'standInBath', run: id }), `${seed} ${id}`).toBe('no-bath')
      }
    }
  })

  it('gives every reason a run of this lab can fail for: stopped early, stopped late, or left until the watch stops itself', () => {
    const reasons = new Set<string>()
    for (const seed of [1, 2, 3]) {
      for (const stop of [{ earlyMs: 30000 }, { delayMs: 5001 }, { delayMs: 60000 }, { delayMs: 0 }, 'end'] as const) {
        const outcome = runView(m, makeRun(m, createLab(m, seed, 'challenge'), 'mixture-1', { stop }), 'mixture-1').outcome
        if (outcome.state === 'does-not-count') for (const reason of outcome.reasons) reasons.add(reason)
      }
    }
    expect([...reasons].sort()).toEqual(['stopped-early', 'stopped-late'])
    // A watch left running stops itself at half an hour, long after the colour has gone: by hand that is late, and "at the end" is the end itself.
    const poured = run(m, createLab(m, 1, 'challenge'), [{ type: 'pour', run: 'mixture-4' }])
    expect(watchAt(m, poured, 'mixture-4', 5_000_000)).toBe(18000)
    expect(runView(m, run(m, poured, [{ type: 'stopAtEnd', run: 'mixture-4' }]), 'mixture-4').outcome).toEqual({ state: 'counts' })
  })
})

describe('an entry that does not follow (spec 19.7, third item)', () => {
  const SLIPS = [
    ["a strength left as the bottle's", 'not-diluted', 'concentration:acetone', 'not-diluted'],
    ['an order in iodine that is not the one the two runs give', 'wrong-order', 'order:iodine', 'does-not-follow'],
  ] as const

  it.each(SLIPS)('with %s, is refused in Guided and marked in Challenge at every seed', (_name, slip, field, blocked) => {
    for (const seed of SEEDS) {
      const guided = makeRoomRuns(m, createLab(m, seed, 'guided'), { stop: 'end' })
      const values = rateLawValues(m, guided, { slip })
      const fields = fieldsOf(m, 'rate-law')
      const before = run(m, guided, fields.slice(0, fields.indexOf(field)).map((above): Action => ({ type: 'enter', sheet: 'rate-law', field: above, value: values[above]! })))
      const action: Action = { type: 'enter', sheet: 'rate-law', field, value: values[field]! }
      expect(can(m, before, action), String(seed)).toBe(blocked)
      expect(reduce(m, before, action), String(seed)).toBe(before)
      const challenge = wholeSheet(m, makeRoomRuns(m, createLab(m, seed, 'challenge'), { stop: 'end' }), 'rate-law', { slip })
      const view = rateLawView(m, challenge)
      expect(view.outcome, String(seed)).toMatchObject({ state: 'does-not-count', reasons: ['entries-do-not-follow'], percentOff: null })
      expect(view.entries.find((entry) => entry.field === field)!.verdict, String(seed)).toEqual({ follows: false, slip: blocked === 'does-not-follow' ? null : blocked })
      expect(challenge.status, String(seed)).toBe('in-progress')
    }
  }, 120_000)

  it('with the rate worked from an iodine strength left as the bottle\'s, marks the strength and not the rate, which follows from it', () => {
    const timed = makeRoomRuns(m, createLab(m, 4, 'challenge'), { stop: 'end' })
    const careful = rateLawValues(m, timed)
    const seconds = timesTable(m, timed)[0]!.tenths! / 10
    const own = { ...careful, 'concentration:iodine': fig('0.00500'), rate: parseFigures((0.005 / seconds).toExponential(2))! }
    const view = rateLawView(m, run(m, timed, [...entryActions(m, 'rate-law', own), { type: 'check', sheet: 'rate-law' }]))
    expect(view.entries.filter((entry) => entry.verdict?.follows === false).map((entry) => [entry.field, entry.verdict!.slip])).toEqual([['concentration:iodine', 'not-diluted']])
    // No entry of this lab can look like a count left out: one molecule of iodine is one of the reaction.
    expect(m.end.per).toBe(1)
  })

  it('with the rate constant cut off where it should be rounded, is refused and marked wherever cutting off and rounding differ', () => {
    let differing = 0
    for (const seed of SEEDS) {
      const timed = makeRoomRuns(m, createLab(m, seed, 'challenge'), { stop: 'end' })
      const [careful, cutOff] = [rateLawValues(m, timed), rateLawValues(m, timed, { slip: 'cut-off' })]
      const verdict = rateLawView(m, wholeSheet(m, timed, 'rate-law', { slip: 'cut-off' })).entries.find((entry) => entry.field === 'rateConstant')!.verdict!
      if (verdict.follows) continue
      differing++
      expect(verdict, String(seed)).toEqual({ follows: false, slip: 'cut-off' })
      const guided = run(m, makeRoomRuns(m, createLab(m, seed, 'guided'), { stop: 'end' }), entryActions(m, 'rate-law', careful).slice(0, 7))
      expect(can(m, guided, { type: 'enter', sheet: 'rate-law', field: 'rateConstant', value: cutOff.rateConstant! }), String(seed)).toBe('cut-off')
    }
    expect(differing).toBeGreaterThan(15)
  }, 120_000)

  it("names the tolerance alone, or the orders alone, where nothing else is amiss, which takes a model other than the lab's own", () => {
    const careful = wholeLab(m, createLab(m, 1, 'challenge'))
    const first = (model: KineticsModel, state: KineticsState) => rateLawView(model, { ...state, status: 'in-progress' }).outcome
    expect(first(m, careful)).toMatchObject({ state: 'counts' })
    expect(first({ ...m, rateConstantTolerancePercent: 0.01 }, careful)).toEqual({ state: 'does-not-count', reasons: ['outside-tolerance'], percentOff: null })
    const wild: KineticsModel = { ...m, scatterPerTenThousand: 4000 }
    const seed = SEEDS.find((one) => {
      const values = rateLawValues(wild, makeRoomRuns(wild, createLab(wild, one, 'challenge'), { stop: 'end' }))
      return wild.reactants.some((reactant) => values[`order:${reactant.id}`] !== reactant.order) && wild.unitPowers.includes(values.unit as number)
    })!
    expect(seed).toBeDefined()
    const state = wholeSheet(wild, makeRoomRuns(wild, createLab(wild, seed, 'challenge'), { stop: 'end' }), 'rate-law')
    expect(rateLawView(wild, state).outcome).toEqual({ state: 'does-not-count', reasons: ['orders-differ'], percentOff: null })
  })
})

describe('the same seed, actions and times handed in (spec 19.7, fourth item)', () => {
  it('give the same lab, and a run a time that does not depend on the order the runs are made in', () => {
    for (const seed of [1, 2, 50, 100]) expect(wholeLab(m, createLab(m, seed, 'challenge'))).toEqual(wholeLab(m, createLab(m, seed, 'challenge')))
    const forward = makeRoomRuns(m, createLab(m, 7, 'challenge'), { stop: 'end' })
    let backward = createLab(m, 7, 'challenge')
    for (const { id } of [...m.runs].reverse()) backward = makeRun(m, backward, id, { stop: 'end' })
    expect(timesTable(m, backward)).toEqual(timesTable(m, forward))
    expect(new Set(SEEDS.map((seed) => JSON.stringify(timesTable(m, makeRoomRuns(m, createLab(m, seed, 'challenge'), { stop: 'end' })).map((row) => row.tenths)))).size).toBe(100)
  }, 60_000)

  it('give a time that depends on the delay handed in and on nothing else of the page: the same run played at any speed', () => {
    const poured = run(m, createLab(m, 3, 'challenge'), [{ type: 'pour', run: 'mixture-2' }])
    const end = endOf(m, 3, 'mixture-2', currentAttempt(poured, 'mixture-2'))!
    const stopped = (speed: number) => runView(m, run(m, poured, [{ type: 'stop', run: 'mixture-2', elapsedMs: end + 900 * speed, delayMs: 900 }]), 'mixture-2').stopped
    expect([1, 10, 60].map(stopped)).toEqual(Array.from({ length: 3 }, () => ({ tenths: tenthsOf(end + 900), by: 'hand' })))
  })
})

describe('the stored record', () => {
  it('round-trips: a lab reloaded from storage after every action ends where one never reloaded does', () => {
    for (const mode of MODES) {
      for (const seed of [1, 14, 63]) {
        const state = wholeLab(m, createLab(m, seed, mode), {}, reloaded)
        expect(state, `${mode} ${seed}`).toEqual(wholeLab(m, createLab(m, seed, mode)))
        expect(reloaded(state), `${mode} ${seed}`).toEqual(state)
      }
    }
  })

  it('holds what the learner did and entered, and nothing that is worked out: no time of a run but what the page handed in, no temperature, no verdict', () => {
    const state = wholeLab(m, createLab(m, 1, 'challenge'))
    const stored = JSON.stringify(state)
    expect(Object.keys(state)).toEqual(['seed', 'mode', 'status', 'runs', 'sheets'])
    expect(Object.keys(state.runs)).toEqual(['mixture-1', 'mixture-2', 'mixture-3', 'mixture-4'])
    expect(state.runs['mixture-1']).toEqual([{ index: 0, indicator: false, bath: 0, read: false, poured: true, stop: { by: 'hand', elapsedMs: stateEnd(state) + 300, delayMs: 300 } }])
    expect(state.sheets.temperature).toEqual([])
    for (const hidden of ['follows', 'verdict', 'counts', 'tenths', 'roomTenths', 'scatter', '2.91', '86190', 'microMolar']) expect(stored, hidden).not.toContain(hidden)
    expect(stored.length).toBeLessThan(1500)
  })
  const stateEnd = (state: KineticsState) => endOf(m, state.seed, 'mixture-1', currentAttempt(state, 'mixture-1'))!

  it('is refused where it holds what the reducer would not have stored', () => {
    const done = wholeLab(m, createLab(m, 1, 'challenge'))
    const edited = (edit: (state: KineticsState) => void) => {
      const copy: KineticsState = JSON.parse(JSON.stringify(done))
      edit(copy)
      return schema.safeParse(copy).success
    }
    expect(edited(() => {})).toBe(true)
    expect(edited((s) => void (s.status = 'in-progress'))).toBe(false)
    expect(edited((s) => void delete s.runs['mixture-4'])).toBe(false)
    expect(edited((s) => void (s.runs['bath-ice'] = s.runs['mixture-4']!))).toBe(false)
    expect(edited((s) => void (s.runs['mixture-1']![0]!.bath = 2))).toBe(false)
    expect(edited((s) => void (s.runs['mixture-1']![0]!.stop = { by: 'hand', elapsedMs: 1800001, delayMs: 0 }))).toBe(false)
    expect(edited((s) => void (s.sheets['rate-law'][0]!.entries['order:iodine'] = 7))).toBe(false)
    expect(edited((s) => void (s.sheets['rate-law'][0]!.entries.rate = null))).toBe(false)
    expect(edited((s) => void s.sheets.temperature.push({ entries: { first: null, second: null, slope: null, energy: null }, looked: [], closed: false }))).toBe(false)
    const early: KineticsState = JSON.parse(JSON.stringify(createLab(m, 1, 'challenge')))
    early.sheets['rate-law'][0]!.entries['concentration:acetone'] = { mantissa: 800, exponent: -3 }
    expect(schema.safeParse(early).success).toBe(false)
  })
})

describe('no state a learner can reach leaves them unable to go on', () => {
  const actionsAt = (state: KineticsState, rng: () => number): Action[] => {
    const runId = m.runs[Math.floor(rng() * m.runs.length)]!.id
    const fields = fieldsOf(m, 'rate-law')
    const field = fields[Math.floor(rng() * fields.length)]!
    const careful: Record<Field, Value> = (() => {
      try {
        return rateLawValues(m, state)
      } catch {
        return {}
      }
    })()
    const value: Value = rng() < 0.6 && careful[field] !== undefined ? careful[field]! : field.startsWith('order') ? Math.floor(rng() * 3) : field === 'unit' ? -Math.floor(rng() * 5) : fig(['1.23e-4', '0.00100', '0.800', '4.20e-6', '2.50e-5'][Math.floor(rng() * 5)]!)
    return [
      { type: 'addIndicator', run: runId },
      { type: 'standInBath', run: runId },
      { type: 'pour', run: runId },
      { type: 'stop', run: runId, elapsedMs: Math.floor(rng() * 900000), delayMs: Math.floor(rng() * 8000) },
      { type: 'stopAtEnd', run: runId },
      { type: 'runAgain', run: runId },
      { type: 'look', place: 0 },
      { type: 'enter', sheet: 'rate-law', field, value },
      { type: 'enter', sheet: 'temperature', field: 'first', value: 0 },
      { type: 'check', sheet: 'rate-law' },
      { type: 'sheetAgain', sheet: 'rate-law' },
      { type: 'setMode', mode: rng() < 0.5 ? 'guided' : 'challenge' },
    ]
  }

  it('from a thousand actions tried as they come, in either mode, the lab can still be completed', () => {
    for (const mode of MODES) {
      for (const seed of [1, 2, 3, 4, 5]) {
        const rng = mulberry32(seed * 7919)
        let state = createLab(m, seed, mode)
        let taken = 0
        for (let i = 0; i < 1000 && state.status !== 'completed'; i++) {
          const candidates = actionsAt(state, rng)
          const action = candidates[Math.floor(rng() * candidates.length)]!
          if (can(m, state, action) !== null) continue
          state = reduce(m, state, action)
          taken++
          if (taken % 25 === 0) state = reloaded(state)
        }
        expect(taken, `${mode} ${seed}`).toBeGreaterThan(30)
        expect(finishLab(m, reloaded(state), reloaded).status, `${mode} ${seed}`).toBe('completed')
      }
    }
  }, 120_000)
})

describe('nothing of what is expected is shown before the entries are made (spec 19.7, fifth item)', () => {
  /** Everything a page is given for the lab, as text. */
  const surface = (state: KineticsState) => JSON.stringify([m.runs.map((r) => runView(m, state, r.id)), timesTable(m, state), rateLawView(m, state), m.runs.map((r) => runOutcomes(m, state, r.id)), sheetOutcomes(m, state, 'rate-law'), m.runs.map((r) => leftAt(m, state, r.id, 0))])

  it('in Challenge, at every action of a careful lab up to the check, the surface holds no verdict, no stored order or rate constant, and no figure for how far off the result is', () => {
    for (const seed of [1, 29, 77]) {
      let state = makeRoomRuns(m, createLab(m, seed, 'challenge'))
      const checkSurface = (where: string) => {
        const text = surface(state)
        expect(text, where).not.toContain('"follows"')
        expect(text, where).not.toContain('"percentOff"')
        expect(text, where).toContain('"expected":null')
        expect(text, where).not.toContain('"orders"')
      }
      checkSurface(`${seed} runs`)
      for (const action of entryActions(m, 'rate-law', rateLawValues(m, state))) {
        state = run(m, state, [action])
        checkSurface(`${seed} ${JSON.stringify(action)}`)
      }
      state = run(m, state, [{ type: 'check', sheet: 'rate-law' }])
      expect(rateLawView(m, state).expected).toEqual({ orders: { acetone: 1, 'hydrogen-ion': 1, iodine: 0 }, rateConstant: heldConstant(m, seed), roomTenths: labSetup(m, seed).roomTenths })
    }
  })

  it('fills a row of the notebook only after the learner has worked the row it copies', () => {
    for (const mode of MODES) {
      let state = makeRoomRuns(m, createLab(m, 8, mode))
      const actions = entryActions(m, 'rate-law', rateLawValues(m, state))
      const filled = () => [rateLawView(m, state).rows !== null, rateLawView(m, state).constants !== null]
      expect(filled(), mode).toEqual([false, false])
      // Three strengths and the rate are the row worked by hand: the other three runs' rows come with the fourth entry.
      for (const [i, action] of actions.entries()) {
        state = run(m, state, [action])
        expect(filled(), `${mode} ${i}`).toEqual([i >= 3, i >= 8])
      }
      const view = rateLawView(m, state)
      expect(view.rows!.map((row) => row.runId), mode).toEqual(['mixture-2', 'mixture-3', 'mixture-4'])
      expect(view.constants!.rows.map((row) => row.runId), mode).toEqual(['mixture-2', 'mixture-3', 'mixture-4'])
    }
  })

  it('gives the look of the liquid, how much iodine is left and the reading of the watch, and no time of a run, until the watch is stopped', () => {
    const state = run(m, createLab(m, 1, 'challenge'), [{ type: 'pour', run: 'mixture-1' }])
    expect(JSON.stringify([runView(m, state, 'mixture-1'), timesTable(m, state)])).not.toMatch(/"tenths":\d/)
    expect([lookAt(m, state, 'mixture-1', 60000), watchAt(m, state, 'mixture-1', 60000)]).toEqual(['before', 600])
    const left = leftAt(m, state, 'mixture-1', 60000)!
    expect(left.ofMicroMolar).toBe(1000)
    expect(left.microMolar).toBeGreaterThan(700)
    expect(left.microMolar).toBeLessThan(900)
  })
})

describe('how much iodine is left, for the drawing of the colour (spec 20.2 and 20.4)', () => {
  it('begins at 1000 micromoles for a litre, 2000 in the mixture with twice the iodine, and is none exactly when the run ends, at every seed', () => {
    for (const seed of SEEDS) {
      for (const { id } of m.runs) {
        const state = run(m, createLab(m, seed, 'challenge'), [{ type: 'pour', run: id }])
        const end = endOf(m, seed, id, currentAttempt(state, id))!
        const of = id === 'mixture-4' ? 2000 : 1000
        expect(leftAt(m, state, id, 0), `${seed} ${id}`).toEqual({ microMolar: of, ofMicroMolar: of })
        expect(Math.abs(leftAt(m, state, id, end / 2)!.microMolar - of / 2), `${seed} ${id}`).toBeLessThanOrEqual(1)
        expect([leftAt(m, state, id, end - 1)!.microMolar, lookAt(m, state, id, end - 1)], `${seed} ${id}`).toEqual([1, 'before'])
        expect([leftAt(m, state, id, end)!.microMolar, lookAt(m, state, id, end)], `${seed} ${id}`).toEqual([0, 'after'])
      }
    }
  })

  it('falls at the same pace in the first mixture and in the fourth, which has twice as far to go: the rate does not depend on the iodine', () => {
    for (const seed of [1, 40, 90]) {
      const state = run(m, createLab({ ...m, scatterPerTenThousand: 0 }, seed, 'challenge'), [{ type: 'pour', run: 'mixture-1' }, { type: 'pour', run: 'mixture-4' }])
      const plain = { ...m, scatterPerTenThousand: 0 }
      const gone = (id: string, at: number) => leftAt(plain, state, id, 0)!.microMolar - leftAt(plain, state, id, at)!.microMolar
      for (const at of [30000, 90000, 200000]) expect(Math.abs(gone('mixture-1', at) - gone('mixture-4', at)), `${seed} ${at}`).toBeLessThanOrEqual(1)
    }
  })
})
