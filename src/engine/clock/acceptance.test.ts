import { describe, expect, it } from 'vitest'
import { parseFigures, toNumber, type Sig3 } from '../figures'
import { mulberry32 } from '../rng'
import { can, reduce, warnings, type Action } from '../kinetics/actions'
import { centiKelvin, endMs, modelOrders, rateConstantAt, roomRuns, temperatureRuns, type KineticsModel } from '../kinetics/model'
import { constantOf, fieldsOf, meanOf, placesOf, pointsOf, slopeBetween, verdictOf, type Field, type Value } from '../kinetics/notebook'
import { doneParts, lookAt, rateLawView, runOutcomes, runView, sheetOutcomes, temperatureView, timesTable, watchAt } from '../kinetics/select'
import { labSetup } from '../kinetics/setup'
import { constantOff, contextOf, createLab, currentAttempt, currentSheet, endOf, energyOff, heldConstant, kineticsStateSchema, roomTimings, tenthsOf, type KineticsState, type Mode } from '../kinetics/state'
import { apparentOrder, entryActions, finishLab, makeBathRuns, makeRoomRuns, makeRun, ORDINARY_DELAY_MS, rateLawValues, run, temperatureValues, wholeLab, wholeSheet, type Technique } from '../kinetics/testkit'
import { PINNED_MODEL as m } from './pinnedModel'

// Spec 19.7, the clock reaction lab's acceptance list, on the engine and the pinned model. Its sixth item, the
// engine on a second record, is src/engine/kinetics/secondRecord.test.ts; its last, the descriptions in words of
// the flasks and of the graph, is the wording module's (src/app/lab/clock/messages.test.ts).

const schema = kineticsStateSchema(m)
const SEEDS = Array.from({ length: 100 }, (_, i) => i + 1)
const MODES: Mode[] = ['guided', 'challenge']
const fig = (text: string): Sig3 => parseFigures(text)!
/** Through JSON and the schema, as a reload does. */
const reloaded = (state: KineticsState): KineticsState => schema.parse(JSON.parse(JSON.stringify(state)))
const range = (values: number[], digits = 2) => [Math.min(...values), Math.max(...values)].map((x) => Number(x.toFixed(digits)))
const timedBy = (state: KineticsState, how: Technique) => makeBathRuns(m, makeRoomRuns(m, state, how), how)
const energyOf = (state: KineticsState) => currentSheet(state, 'temperature').entries.energy as Sig3

describe('careful runs (spec 19.7, first item)', () => {
  it('of the five mixtures and the three temperatures all count at every seed from 1 to 100, in Guided and in Challenge, by a hand of ordinary quickness and by the watch itself', () => {
    for (const mode of MODES) {
      for (const stop of [{ delayMs: ORDINARY_DELAY_MS }, 'end'] as const) {
        for (const seed of SEEDS) {
          const state = timedBy(createLab(m, seed, mode), { stop })
          const table = timesTable(m, state)
          expect(table.every((row) => row.tenths !== null && row.temperatureTenths !== null), `${mode} ${seed}`).toBe(true)
          expect(table.every((row) => row.by === (stop === 'end' ? 'end' : 'hand')), `${mode} ${seed}`).toBe(true)
          expect(doneParts(m, state), `${mode} ${seed}`).toEqual(['runs'])
        }
      }
    }
  }, 120_000)

  it('give times of a few minutes for the first mixture at the room\'s temperature, and none too short to time or too long to wait for', () => {
    const times: Record<string, number[]> = {}
    for (const seed of SEEDS) for (const row of timesTable(m, timedBy(createLab(m, seed, 'challenge'), { stop: 'end' }))) (times[row.runId] ??= []).push(row.tenths! / 10)
    expect(Object.fromEntries(Object.entries(times).map(([runId, seconds]) => [runId, range(seconds, 1)]))).toEqual({
      'mixture-1': [109.9, 146.4],
      'mixture-2': [55.7, 73],
      'mixture-3': [54.9, 73],
      'mixture-4': [27.5, 36.7],
      'mixture-5': [123.7, 163.6],
      'bath-ice': [556, 636.8],
      'bath-cool': [277.8, 325.9],
      'bath-warm': [34.8, 44.9],
    })
  }, 60_000)

  it('give orders that are unmistakable: with an ordinary hand, each apparent order is within 0.04 of a whole number, which is the stored one', () => {
    const apparent: Record<string, number[]> = {}
    for (const seed of SEEDS) {
      const state = makeRoomRuns(m, createLab(m, seed, 'challenge'))
      for (const reactant of m.reactants) (apparent[reactant.id] ??= []).push(apparentOrder(m, state, reactant.id))
      expect(rateLawValues(m, state), String(seed)).toMatchObject({ 'order:iodide': 1, 'order:bromate': 1, 'order:hydrogen-ion': 2, unit: -3 })
    }
    expect(Object.fromEntries(Object.entries(apparent).map(([id, orders]) => [id, range(orders, 3)]))).toEqual({ iodide: [0.971, 1.019], bromate: [0.969, 1.024], 'hydrogen-ion': [1.961, 2.014] })
    for (const reactant of m.reactants) for (const order of apparent[reactant.id]!) expect(Math.abs(order - reactant.order)).toBeLessThan(0.04)
  }, 60_000)

  it.each(MODES)('complete the lab in %s at every seed: the orders that follow are the stored ones, and the rate constant and the activation energy are within tolerance', (mode) => {
    const [constants, energies]: [number[], number[]] = [[], []]
    for (const seed of SEEDS) {
      const state = wholeLab(m, createLab(m, seed, mode))
      expect(state.status, `${mode} ${seed}`).toBe('completed')
      const [rateLaw, temperature] = [rateLawView(m, state), temperatureView(m, state)]
      expect(rateLaw.entries.every((entry) => entry.verdict?.follows === true) && temperature.entries.every((entry) => entry.verdict?.follows === true), `${mode} ${seed}`).toBe(true)
      expect(rateLaw.expected, `${mode} ${seed}`).toEqual({ orders: { iodide: 1, bromate: 1, 'hydrogen-ion': 2 }, rateConstant: heldConstant(m, seed), roomTenths: labSetup(m, seed).roomTenths })
      expect(temperature.expected, `${mode} ${seed}`).toEqual({ activationKJ: 50 })
      if (rateLaw.outcome.state !== 'counts' || temperature.outcome.state !== 'counts') throw new Error(`${mode} ${seed}: a careful lab did not count`)
      expect(Math.abs(rateLaw.outcome.percentOff), `${mode} ${seed}`).toBeLessThan(m.rateConstantTolerancePercent)
      expect(Math.abs(temperature.outcome.percentOff), `${mode} ${seed}`).toBeLessThan(m.activationTolerancePercent)
      constants.push(rateLaw.outcome.percentOff)
      energies.push(temperature.outcome.percentOff)
    }
    // A hand three tenths of a second late makes every time a little long, so the rate constant comes out a little low.
    expect(range(constants)).toEqual([-1.12, 0.09])
    expect(range(energies)).toEqual([-0.8, 0.4])
  }, 120_000)

  it('count as well with the watch stopped at the change, with each entry worked from unrounded values, and with the slope taken between any two places on the line', () => {
    let pairs = 0
    for (const seed of SEEDS) {
      const timed = wholeSheet(m, timedBy(createLab(m, seed, 'guided'), { stop: 'end' }), 'rate-law', { chain: 'unrounded' })
      expect(rateLawView(m, timed).outcome.state, String(seed)).toBe('counts')
      // Through the reducer, between the two ends of the line; and, entry by entry, between every two of the twelve places, taken either way round.
      const whole = wholeSheet(m, timed, 'temperature', { chain: seed % 2 === 0 ? 'rounded' : 'unrounded' })
      expect(temperatureView(m, whole).outcome.state, String(seed)).toBe('counts')
      const context = contextOf(m, timed, 'temperature')!
      for (let first = 0; first < m.places.count; first++) {
        for (let second = 0; second < m.places.count; second++) {
          if (first === second) continue
          for (const chain of ['rounded', 'unrounded'] as const) {
            const values = temperatureValues(m, timed, { places: [first, second], chain })
            for (const field of fieldsOf(m, 'temperature')) expect(verdictOf(m, context, values, field), `${seed} ${first} ${second} ${chain} ${field}`).toEqual({ follows: true, slip: null })
            expect(Math.abs(energyOff(m, values.energy as Sig3)), `${seed} ${first} ${second}`).toBeLessThan(1.5)
            pairs++
          }
        }
      }
    }
    expect(pairs).toBe(100 * 132 * 2)
  }, 120_000)
})

describe('a hand that is slow (the limit on a learner\'s own delay)', () => {
  /** Every run stopped by hand so many milliseconds after the change. */
  const lab = (seed: number, delayMs: number) => wholeLab(m, createLab(m, seed, 'challenge'), { stop: { delayMs } })

  it('still completes the lab at every seed with every watch stopped two seconds late, the latest that counts', () => {
    const [constants, energies, orders]: [number[], number[], number[]] = [[], [], []]
    for (const seed of SEEDS) {
      const state = lab(seed, m.delayLimitMs)
      expect(state.status, String(seed)).toBe('completed')
      constants.push(constantOff(m, seed, roomTimings(m, state)!))
      energies.push(energyOff(m, energyOf(state)))
      orders.push(...m.reactants.map((reactant) => apparentOrder(m, state, reactant.id) - reactant.order))
    }
    expect(range(constants)).toEqual([-3.93, -2.33])
    expect(range(energies)).toEqual([-2.4, -0.8])
    expect(range(orders, 3)).toEqual([-0.097, 0.006])
  }, 120_000)

  it('cannot put a result outside its tolerance, or an order in doubt, at any setup the draw can give with any run as late as counts and any other on time', () => {
    // Every corner: the room and each bath at either end of its range, each time at either end of its scatter,
    // and each watch stopped at the change or two seconds after it. The times are worked straight from the model,
    // and the results as the notebook works them.
    const ends = <T,>([low, high]: readonly [T, T]) => [low, high]
    const corners = <T,>(lists: T[][]): T[][] => lists.reduce<T[][]>((all, list) => all.flatMap((sofar) => list.map((one) => [...sofar, one])), [[]])
    const time = (runId: string, mixtureId: string, tenths: number, scatter: number, delayMs: number) => [runId, tenthsOf(endMs(m, mixtureId, centiKelvin(m, tenths), scatter) + delayMs)] as const
    const worst = { constant: 0, order: 0, energy: 0 }
    const rooms = roomRuns(m)
    for (const roomTenths of ends(m.roomRangeTenths)) {
      const held = rateConstantAt(m, centiKelvin(m, roomTenths))
      for (const choice of corners(rooms.map(() => corners([[-1, 1], [0, 1]])))) {
        const timings = Object.fromEntries(rooms.map((r, i) => time(r.id, r.mixtureId, roomTenths, choice[i]![0]! * m.scatterPerTenThousand, choice[i]![1]! * m.delayLimitMs)))
        const off = (toNumber(meanOf(rooms.map((r) => constantOf(m, r.id, timings, modelOrders(m))))) / held - 1) * 100
        worst.constant = Math.max(worst.constant, Math.abs(off))
        for (const reactant of m.reactants) {
          const [first, second] = m.orderRuns[reactant.id]!
          // Each pair doubles one strength, so the apparent order is the logarithm to the base two of the ratio of the times.
          worst.order = Math.max(worst.order, Math.abs(Math.log2(timings[first]! / timings[second]!) - reactant.order))
        }
      }
      const runs = temperatureRuns(m)
      for (const baths of corners(m.baths.map((bath) => ends(bath.rangeTenths)))) {
        const lab = { roomTenths, bathTenths: Object.fromEntries(m.baths.map((bath, i) => [bath.id, baths[i]!])) }
        for (const choice of corners(runs.map(() => corners([[-1, 1], [0, 1]])))) {
          const timings = Object.fromEntries(runs.map((r, i) => time(r.id, r.mixtureId, r.bathId === null ? roomTenths : lab.bathTenths[r.bathId]!, choice[i]![0]! * m.scatterPerTenThousand, choice[i]![1]! * m.delayLimitMs)))
          const places = placesOf(m, pointsOf(m, lab, timings, modelOrders(m)))
          const energy = (-toNumber(slopeBetween(places[0]!, places.at(-1)!)!) * m.gasConstantE9) / 1e9
          worst.energy = Math.max(worst.energy, Math.abs(energy / m.activationJ - 1) * 100)
        }
      }
    }
    expect({ constant: Number(worst.constant.toFixed(2)), order: Number(worst.order.toFixed(3)), energy: Number(worst.energy.toFixed(2)) }).toEqual({ constant: 4.33, order: 0.128, energy: 2.89 })
    expect(worst.constant).toBeLessThan(m.rateConstantTolerancePercent)
    expect(worst.energy).toBeLessThan(m.activationTolerancePercent)
    // An order is mistaken only where the apparent one is nearer another whole number: half an order away.
    expect(worst.order).toBeLessThan(0.15)
  }, 120_000)

  it('makes a run not count once the watch is stopped later than that, and names the cause; the run is then made again', () => {
    for (const seed of [1, 37, 88]) {
      let state = makeRun(m, createLab(m, seed, 'guided'), 'mixture-4', { stop: { delayMs: m.delayLimitMs + 1 } })
      expect(runView(m, state, 'mixture-4').outcome, String(seed)).toEqual({ state: 'does-not-count', reasons: ['stopped-late'] })
      expect(timesTable(m, state)[3]!.tenths, String(seed)).toBeNull()
      state = makeRun(m, run(m, state, [{ type: 'runAgain', run: 'mixture-4' }]), 'mixture-4')
      expect(runOutcomes(m, state, 'mixture-4').map((attempt) => attempt.outcome.state), String(seed)).toEqual(['does-not-count', 'counts'])
    }
  })
})

describe('each error of technique alone (spec 19.7, second item)', () => {
  it('with no starch, makes a run not count at every seed and names its cause, at every one of the eight runs', () => {
    for (const seed of SEEDS) {
      for (const { id } of m.runs) {
        const state = makeRun(m, createLab(m, seed, 'challenge'), id, { indicator: false })
        expect(runView(m, state, id), `${seed} ${id}`).toMatchObject({ look: 'before', outcome: { state: 'does-not-count', reasons: ['no-indicator'] } })
        expect(timesTable(m, state).find((row) => row.runId === id)!.tenths, `${seed} ${id}`).toBeNull()
      }
    }
  }, 60_000)

  it('with the flasks poured before they have come to the bath\'s temperature, makes a run not count at every seed and names its cause, at every one of the three baths', () => {
    for (const seed of SEEDS) {
      for (const { id } of m.runs.filter((r) => r.bathId !== null)) {
        const state = makeRun(m, createLab(m, seed, 'challenge'), id, { stand: false })
        expect(runView(m, state, id).outcome, `${seed} ${id}`).toEqual({ state: 'does-not-count', reasons: ['not-at-temperature'] })
        // The time is another than the bath's own: it belongs to no one temperature.
        const careful = runView(m, makeRun(m, createLab(m, seed, 'challenge'), id), id).stopped!.tenths
        expect(Math.abs(runView(m, state, id).stopped!.tenths / careful - 1), `${seed} ${id}`).toBeGreaterThan(0.25)
      }
    }
  }, 60_000)

  it('is warned of in Guided before the pour, at every seed, and is not in Challenge', () => {
    for (const seed of SEEDS) {
      const guided = run(m, createLab(m, seed, 'guided'), [{ type: 'standInBath', run: 'bath-warm' }, { type: 'readThermometer', run: 'bath-warm' }])
      expect(warnings(m, guided, { type: 'pour', run: 'mixture-2' }), String(seed)).toEqual(['no-indicator'])
      expect(warnings(m, guided, { type: 'pour', run: 'bath-warm' }), String(seed)).toEqual(['no-indicator', 'not-at-temperature'])
      expect(warnings(m, { ...guided, mode: 'challenge' }, { type: 'pour', run: 'bath-warm' }), String(seed)).toEqual([])
      // Warned and gone on anyway, the run is made and does not count.
      const made = run(m, guided, [{ type: 'pour', run: 'bath-warm' }, { type: 'stopAtEnd', run: 'bath-warm' }])
      expect(runView(m, made, 'bath-warm').outcome, String(seed)).toEqual({ state: 'does-not-count', reasons: ['no-indicator', 'not-at-temperature'] })
    }
  })

  it('keeps a part from being done until the run is made again, carefully', () => {
    let state = makeRoomRuns(m, createLab(m, 5, 'challenge'), { indicator: false })
    expect(doneParts(m, state)).toEqual([])
    expect(rateLawView(m, state).blocked).toBe('runs-missing')
    for (const { id } of roomRuns(m)) state = makeRun(m, run(m, state, [{ type: 'runAgain', run: id }]), id)
    expect(doneParts(m, state)).toEqual(['runs'])
    expect(rateLawView(m, state).blocked).toBeNull()
  })
})

describe('an entry that does not follow (spec 19.7, third item)', () => {
  const SLIPS = [
    ['a strength left as the bottle\'s', 'not-diluted', 'concentration:iodide', 'not-diluted'],
    ['all of the thiosulfate taken for the rate', 'count-left-out', 'rate', 'count-left-out'],
    ['an order that is not the one the two runs give', 'wrong-order', 'order:hydrogen-ion', 'does-not-follow'],
  ] as const

  it.each(SLIPS)('in the first sheet, with %s, is refused in Guided and marked in Challenge at every seed', (_name, slip, field, blocked) => {
    for (const seed of SEEDS) {
      const guided = makeRoomRuns(m, createLab(m, seed, 'guided'), { stop: 'end' })
      const values = rateLawValues(m, guided, { slip })
      const fields = fieldsOf(m, 'rate-law')
      const before = run(m, guided, fields.slice(0, fields.indexOf(field)).map((above): Action => ({ type: 'enter', sheet: 'rate-law', field: above, value: values[above]! })))
      const action: Action = { type: 'enter', sheet: 'rate-law', field, value: values[field]! }
      expect(can(m, before, action), String(seed)).toBe(blocked)
      // A refusal stores nothing.
      expect(reduce(m, before, action), String(seed)).toBe(before)
      const challenge = wholeSheet(m, makeRoomRuns(m, createLab(m, seed, 'challenge'), { stop: 'end' }), 'rate-law', { slip })
      const view = rateLawView(m, challenge)
      expect(view.outcome, String(seed)).toMatchObject({ state: 'does-not-count', reasons: ['entries-do-not-follow'], percentOff: null })
      expect(view.entries.find((entry) => entry.field === field)!.verdict, String(seed)).toEqual({ follows: false, slip: blocked === 'does-not-follow' ? null : blocked })
      expect(view.done, String(seed)).toBe(false)
    }
  }, 120_000)

  it('in the first sheet, with the rate constant cut off where it should be rounded, is refused and marked wherever cutting off and rounding differ', () => {
    let differing = 0
    for (const seed of SEEDS) {
      const timed = makeRoomRuns(m, createLab(m, seed, 'challenge'), { stop: 'end' })
      const [careful, cutOff] = [rateLawValues(m, timed), rateLawValues(m, timed, { slip: 'cut-off' })]
      const state = wholeSheet(m, timed, 'rate-law', { slip: 'cut-off' })
      const verdict = rateLawView(m, state).entries.find((entry) => entry.field === 'rateConstant')!.verdict!
      if (verdict.follows) continue
      differing++
      expect(JSON.stringify(cutOff.rateConstant), String(seed)).not.toBe(JSON.stringify(careful.rateConstant))
      expect(verdict, String(seed)).toEqual({ follows: false, slip: 'cut-off' })
      const guided = run(m, makeRoomRuns(m, createLab(m, seed, 'guided'), { stop: 'end' }), entryActions(m, 'rate-law', careful).slice(0, 7))
      expect(can(m, guided, { type: 'enter', sheet: 'rate-law', field: 'rateConstant', value: cutOff.rateConstant! }), String(seed)).toBe('cut-off')
    }
    expect(differing).toBeGreaterThan(15)
  }, 120_000)

  it.each([
    ['the slope without its minus sign', 'no-sign', 'slope', 'wrong-sign'],
    ['the activation energy in joules', 'joules', 'energy', 'joules-for-kilojoules'],
  ] as const)('in the second sheet, with %s, is refused in Guided and marked in Challenge at every seed', (_name, slip, field, blocked) => {
    for (const seed of SEEDS) {
      const open = (mode: Mode) => wholeSheet(m, timedBy(createLab(m, seed, mode), { stop: 'end' }), 'rate-law')
      const guided = open('guided')
      const values = temperatureValues(m, guided, { slip })
      const actions = entryActions(m, 'temperature', values)
      const at = actions.findIndex((action) => action.type === 'enter' && action.field === field)
      const before = run(m, guided, actions.slice(0, at))
      expect(can(m, before, actions[at]!), String(seed)).toBe(blocked)
      const challenge = wholeSheet(m, open('challenge'), 'temperature', { slip })
      const view = temperatureView(m, challenge)
      expect(view.outcome, String(seed)).toMatchObject({ state: 'does-not-count', reasons: ['entries-do-not-follow'], percentOff: null })
      expect(view.entries.find((entry) => entry.field === field)!.verdict, String(seed)).toEqual({ follows: false, slip: blocked })
      expect(challenge.status, String(seed)).toBe('in-progress')
    }
  }, 120_000)

  it('marks nothing and refuses nothing of a careful notebook, whichever correct rounding it took', () => {
    for (const seed of SEEDS) {
      for (const chain of ['rounded', 'unrounded'] as const) {
        const state = wholeLab(m, createLab(m, seed, 'guided'), { chain, stop: 'end' })
        expect(state.status, `${seed} ${chain}`).toBe('completed')
      }
    }
  }, 120_000)

  it('does not hold a result to the model where an entry does not follow: the reasons say what is wrong, once', () => {
    const state = wholeSheet(m, makeRoomRuns(m, createLab(m, 12, 'challenge')), 'rate-law', { slip: 'wrong-order' })
    expect(sheetOutcomes(m, state, 'rate-law')).toEqual([{ state: 'does-not-count', reasons: ['entries-do-not-follow'], percentOff: null }])
  })

  it('names the tolerance alone, or the orders alone, where nothing else is amiss, which takes a model other than the lab\'s own', () => {
    const careful = wholeLab(m, createLab(m, 1, 'challenge'))
    const first = (model: KineticsModel, state: KineticsState) => rateLawView(model, { ...state, status: 'in-progress' }).outcome
    // The lab's own model: the first sheet counts, 0.71% under.
    expect(first(m, careful)).toMatchObject({ state: 'counts' })
    // One that asks for half a percent: every entry follows, and the result alone is too far off.
    expect(first({ ...m, rateConstantTolerancePercent: 0.5 }, careful)).toEqual({ state: 'does-not-count', reasons: ['outside-tolerance'], percentOff: null })
    // One whose times scatter by four parts in ten: at some seed two runs then give an order that is not the model's, and every entry still follows from the times.
    const wild: KineticsModel = { ...m, scatterPerTenThousand: 4000, delayLimitMs: 2000 }
    const seed = SEEDS.find((one) => {
      const values = rateLawValues(wild, makeRoomRuns(wild, createLab(wild, one, 'challenge'), { stop: 'end' }))
      return wild.reactants.some((reactant) => values[`order:${reactant.id}`] !== reactant.order) && wild.unitPowers.includes(values.unit as number)
    })!
    expect(seed).toBeDefined()
    const state = wholeSheet(wild, makeRoomRuns(wild, createLab(wild, seed, 'challenge'), { stop: 'end' }), 'rate-law')
    expect(rateLawView(wild, state).outcome).toEqual({ state: 'does-not-count', reasons: ['orders-differ'], percentOff: null })
    expect(rateLawView(wild, state).entries.every((entry) => entry.verdict?.follows === true)).toBe(true)
  })
})

describe('the same seed, actions and times handed in (spec 19.7, fourth item)', () => {
  it('give the same lab, time for time and outcome for outcome', () => {
    for (const seed of [1, 2, 50, 100]) {
      const [a, b] = [wholeLab(m, createLab(m, seed, 'challenge')), wholeLab(m, createLab(m, seed, 'challenge'))]
      expect(a).toEqual(b)
      expect(timesTable(m, a)).toEqual(timesTable(m, b))
      expect(temperatureView(m, a)).toEqual(temperatureView(m, b))
    }
  })

  it('give a run a time that does not depend on the order the runs are made in, or on what was done before', () => {
    const forward = timedBy(createLab(m, 7, 'challenge'), { stop: 'end' })
    let backward = createLab(m, 7, 'challenge')
    for (const { id } of [...m.runs].reverse()) backward = makeRun(m, backward, id, { stop: 'end' })
    expect(timesTable(m, backward)).toEqual(timesTable(m, forward))
    // An attempt left behind does not move the others, and the attempt after it has a scatter of its own.
    const again = makeRun(m, run(m, makeRun(m, createLab(m, 7, 'challenge'), 'mixture-1', { indicator: false }), [{ type: 'runAgain', run: 'mixture-1' }]), 'mixture-1', { stop: 'end' })
    expect(timesTable(m, makeRun(m, again, 'mixture-2', { stop: 'end' }))[1]).toEqual(timesTable(m, forward)[1])
    expect(timesTable(m, again)[0]!.tenths).not.toBe(timesTable(m, forward)[0]!.tenths)
  })

  it('give a time that depends on the delay handed in and on nothing else of the page: the same run played at any speed', () => {
    const poured = run(m, createLab(m, 3, 'challenge'), [{ type: 'addIndicator', run: 'mixture-5' }, { type: 'pour', run: 'mixture-5' }])
    const end = endOf(m, 3, 'mixture-5', currentAttempt(poured, 'mixture-5'))!
    const stopped = (speed: number) => runView(m, run(m, poured, [{ type: 'stop', run: 'mixture-5', elapsedMs: end + 400 * speed, delayMs: 400 }]), 'mixture-5').stopped
    expect([1, 10, 60].map(stopped)).toEqual(Array.from({ length: 3 }, () => ({ tenths: tenthsOf(end + 400), by: 'hand' })))
  })

  it('give different seeds different rooms, baths and times', () => {
    expect(new Set(SEEDS.map((seed) => JSON.stringify(timesTable(m, timedBy(createLab(m, seed, 'challenge'), { stop: 'end' })).map((row) => row.tenths)))).size).toBe(100)
  }, 60_000)
})

describe('the stored record', () => {
  it('round-trips: a lab reloaded from storage after every action ends where one never reloaded does', () => {
    for (const mode of MODES) {
      for (const seed of [1, 14, 63]) {
        let state = makeRun(m, createLab(m, seed, mode), 'bath-ice', { stand: false }, reloaded)
        state = makeRun(m, run(m, state, [{ type: 'runAgain', run: 'bath-ice' }], reloaded), 'bath-ice', {}, reloaded)
        state = wholeLab(m, makeRun(m, state, 'mixture-3', { stop: 'end' }, reloaded) && createLab(m, seed, mode), {}, reloaded)
        expect(state, `${mode} ${seed}`).toEqual(wholeLab(m, createLab(m, seed, mode)))
        expect(reloaded(state), `${mode} ${seed}`).toEqual(state)
      }
    }
  }, 60_000)

  it('holds what the learner did and entered, and nothing that is worked out: no time of a run but what the page handed in, no temperature, no verdict', () => {
    const state = wholeLab(m, createLab(m, 1, 'challenge'))
    const stored = JSON.stringify(state)
    expect(Object.keys(state)).toEqual(['seed', 'mode', 'status', 'runs', 'sheets'])
    expect(Object.keys(state.runs['bath-ice']![0]!)).toEqual(['index', 'indicator', 'bath', 'read', 'poured', 'stop'])
    expect(Object.keys(state.sheets.temperature[0]!)).toEqual(['entries', 'looked', 'closed'])
    for (const hidden of ['follows', 'verdict', 'counts', 'tenths', 'roomTenths', 'scatter', '50.26', '50000', 'yMilli']) expect(stored, hidden).not.toContain(hidden)
    expect(stored.length).toBeLessThan(2500)
  })

  it('is refused where it holds what the reducer would not have stored', () => {
    const done = wholeLab(m, createLab(m, 1, 'challenge'))
    const edited = (edit: (state: KineticsState) => void) => {
      const copy: KineticsState = JSON.parse(JSON.stringify(done))
      edit(copy)
      return schema.safeParse(copy).success
    }
    expect(edited(() => {})).toBe(true)
    expect(edited((s) => void (s.status = 'in-progress'))).toBe(false)
    expect(edited((s) => void delete s.runs['mixture-5'])).toBe(false)
    expect(edited((s) => void (s.runs['mixture-9'] = s.runs['mixture-5']!))).toBe(false)
    expect(edited((s) => void (s.runs['mixture-1']![0]!.index = 4))).toBe(false)
    expect(edited((s) => void (s.runs['mixture-1']![0]!.bath = 2))).toBe(false)
    expect(edited((s) => void (s.runs['bath-ice']![0]!.read = false))).toBe(false)
    expect(edited((s) => void (s.runs['mixture-1']![0]!.poured = false))).toBe(false)
    expect(edited((s) => void (s.runs['mixture-1']![0]!.stop = { by: 'hand', elapsedMs: 1800001, delayMs: 0 }))).toBe(false)
    expect(edited((s) => void s.runs['mixture-1']!.push({ index: 1, indicator: false, bath: 0, read: false, poured: false, stop: null }))).toBe(false)
    expect(edited((s) => void (s.sheets['rate-law'][0]!.entries.slope = null))).toBe(false)
    expect(edited((s) => void (s.sheets['rate-law'][0]!.entries.rate = null))).toBe(false)
    expect(edited((s) => void (s.sheets['rate-law'][0]!.entries['order:iodide'] = 7))).toBe(false)
    expect(edited((s) => void (s.sheets['rate-law'][0]!.entries.rate = 2))).toBe(false)
    expect(edited((s) => void (s.sheets['rate-law'][0]!.looked = [1]))).toBe(false)
    expect(edited((s) => void (s.sheets.temperature[0]!.looked = [0, 11, 12]))).toBe(false)
    expect(edited((s) => void (s.sheets.temperature[0]!.looked = [0]))).toBe(false)
    expect(edited((s) => void (s.sheets.temperature[0]!.entries.second = 0))).toBe(false)
    expect(edited((s) => void s.sheets.temperature.push({ entries: { first: null, second: null, slope: null, energy: null }, looked: [], closed: false }))).toBe(false)
    expect(edited((s) => void ((s as { extra?: number }).extra = 1))).toBe(false)
    // A sheet worked before its runs count.
    const early: KineticsState = JSON.parse(JSON.stringify(createLab(m, 1, 'challenge')))
    early.sheets['rate-law'][0]!.entries['concentration:iodide'] = { mantissa: 200, exponent: -5 }
    expect(schema.safeParse(early).success).toBe(false)
  })
})

describe('no state a learner can reach leaves them unable to go on', () => {
  const actionsAt = (state: KineticsState, rng: () => number): Action[] => {
    const runId = m.runs[Math.floor(rng() * m.runs.length)]!.id
    const sheet = rng() < 0.5 ? 'rate-law' : 'temperature'
    const field = fieldsOf(m, sheet)[Math.floor(rng() * fieldsOf(m, sheet).length)]!
    const careful: Record<Field, Value> = (() => {
      try {
        return sheet === 'rate-law' ? rateLawValues(m, state) : temperatureValues(m, state, { places: [Math.floor(rng() * 6), 6 + Math.floor(rng() * 6)] })
      } catch {
        return {}
      }
    })()
    const value: Value = rng() < 0.6 && careful[field] !== undefined ? careful[field]! : field.startsWith('order') ? Math.floor(rng() * 3) : field === 'unit' ? -Math.floor(rng() * 5) : field === 'first' || field === 'second' ? Math.floor(rng() * 12) : fig(['1.23e-4', '0.00200', '50.0', '-6010', '2.50e-7'][Math.floor(rng() * 5)]!)
    return [
      { type: 'addIndicator', run: runId },
      { type: 'standInBath', run: runId },
      { type: 'letStand', run: runId },
      { type: 'readThermometer', run: runId },
      { type: 'pour', run: runId },
      { type: 'stop', run: runId, elapsedMs: Math.floor(rng() * 700000), delayMs: Math.floor(rng() * 3000) },
      { type: 'stopAtEnd', run: runId },
      { type: 'runAgain', run: runId },
      { type: 'look', place: Math.floor(rng() * 12) },
      { type: 'enter', sheet, field, value },
      { type: 'check', sheet },
      { type: 'sheetAgain', sheet },
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
        expect(taken, `${mode} ${seed}`).toBeGreaterThan(80)
        state = reloaded(state)
        expect(finishLab(m, state, reloaded).status, `${mode} ${seed}`).toBe('completed')
      }
    }
  }, 120_000)

  it('offers a way on from every point of a run and of a sheet', () => {
    // A run under way can always be stopped; one that is over and does not count can be made again; one not yet poured can be poured or made ready.
    let state = run(m, createLab(m, 6, 'challenge'), [{ type: 'pour', run: 'mixture-1' }])
    expect(can(m, state, { type: 'stopAtEnd', run: 'mixture-1' })).toBeNull()
    state = run(m, state, [{ type: 'stopAtEnd', run: 'mixture-1' }])
    expect(can(m, state, { type: 'runAgain', run: 'mixture-1' })).toBeNull()
    // A sheet that has been checked and does not count can be worked again; one not yet full takes its next entry.
    const failed = wholeSheet(m, makeRoomRuns(m, createLab(m, 6, 'challenge')), 'rate-law', { slip: 'not-diluted' })
    expect(can(m, failed, { type: 'sheetAgain', sheet: 'rate-law' })).toBeNull()
    expect(finishLab(m, failed).status).toBe('completed')
  })
})

describe('nothing of what is expected is shown before the entries are made (spec 19.7, fifth item)', () => {
  /** Everything a page is given for the lab, as text. */
  const surface = (state: KineticsState) => JSON.stringify([m.runs.map((r) => runView(m, state, r.id)), timesTable(m, state), rateLawView(m, state), temperatureView(m, state), m.runs.map((r) => runOutcomes(m, state, r.id)), sheetOutcomes(m, state, 'rate-law'), sheetOutcomes(m, state, 'temperature')])

  it('in Challenge, at every action of a careful lab up to each check, the surface holds no verdict, no stored order, rate constant or activation energy, and no figure for how far off a result is', () => {
    for (const seed of [1, 29, 77]) {
      let state = timedBy(createLab(m, seed, 'challenge'), {})
      const checkSurface = (where: string) => {
        const text = surface(state)
        expect(text, where).not.toContain('"follows"')
        expect(text, where).not.toContain('"percentOff":-')
        expect(text.match(/"percentOff":[0-9]/), where).toBeNull()
        expect(text, where).toContain('"expected":null')
        expect(text, where).not.toContain('activationKJ')
        expect(text, where).not.toContain('"orders"')
      }
      checkSurface(`${seed} runs`)
      for (const action of entryActions(m, 'rate-law', rateLawValues(m, state))) {
        state = run(m, state, [action])
        checkSurface(`${seed} ${JSON.stringify(action)}`)
      }
      state = run(m, state, [{ type: 'check', sheet: 'rate-law' }])
      // The first sheet is done: what it was held to is handed over, and nothing of the second.
      expect(rateLawView(m, state).expected).not.toBeNull()
      const second = () => JSON.stringify([temperatureView(m, state), sheetOutcomes(m, state, 'temperature')])
      for (const action of entryActions(m, 'temperature', temperatureValues(m, state))) {
        state = run(m, state, [action])
        expect(second(), `${seed} ${JSON.stringify(action)}`).not.toContain('"follows"')
        expect(second(), `${seed}`).toContain('"expected":null')
        expect(second(), `${seed}`).not.toContain('"percentOff"')
      }
      state = run(m, state, [{ type: 'check', sheet: 'temperature' }])
      expect(temperatureView(m, state).expected).toEqual({ activationKJ: 50 })
    }
  })

  it('fills a row of the notebook only after the learner has worked the row it copies', () => {
    for (const mode of MODES) {
      let state = makeRoomRuns(m, createLab(m, 8, mode))
      const actions = entryActions(m, 'rate-law', rateLawValues(m, state))
      const filled = () => [rateLawView(m, state).rows !== null, rateLawView(m, state).constants !== null]
      expect(filled(), mode).toEqual([false, false])
      // Three strengths and the rate are the row worked by hand: the other runs' rows come with the fourth.
      for (const [i, action] of actions.entries()) {
        state = run(m, state, [action])
        expect(filled(), `${mode} ${i}`).toEqual([i >= 3, i >= 8])
      }
      const view = rateLawView(m, state)
      expect(view.rows!.map((row) => row.runId), mode).toEqual(['mixture-2', 'mixture-3', 'mixture-4', 'mixture-5'])
      expect(view.constants!.rows.map((row) => row.runId), mode).toEqual(['mixture-2', 'mixture-3', 'mixture-4', 'mixture-5'])
      // Changing an entry of the row worked by hand takes the copies away again.
      if (mode === 'challenge') {
        state = run(m, state, [actions[1]!])
        expect(filled(), mode).toEqual([false, false])
      }
    }
  })

  it('fills the rate constants with the learner\'s own orders, right or wrong, so that a filled figure never says what the orders should have been', () => {
    const timed = makeRoomRuns(m, createLab(m, 8, 'challenge'))
    const values = { ...rateLawValues(m, timed, { slip: 'wrong-order' }) }
    const state = run(m, timed, entryActions(m, 'rate-law', values))
    const constants = rateLawView(m, state).constants!.rows.map((row) => row.constant.mantissa * 10 ** row.constant.exponent)
    // With a wrong order the runs do not agree: the fourth, with twice the hydrogen ion, is out by a factor of two.
    expect(Math.max(...constants) / Math.min(...constants)).toBeGreaterThan(1.8)
    const careful = run(m, timed, entryActions(m, 'rate-law', rateLawValues(m, timed)))
    const agreeing = rateLawView(m, careful).constants!.rows.map((row) => row.constant.mantissa * 10 ** row.constant.exponent)
    expect(Math.max(...agreeing) / Math.min(...agreeing)).toBeLessThan(1.05)
  })

  it('shows the second sheet\'s table and graph only once the rate law is done, and says how far off a sheet was only once a working of it counts', () => {
    const timed = timedBy(createLab(m, 21, 'challenge'), {})
    expect(temperatureView(m, timed)).toMatchObject({ rows: null, graph: null, expected: null })
    const failed = wholeSheet(m, timed, 'rate-law', { slip: 'count-left-out' })
    expect(temperatureView(m, failed)).toMatchObject({ rows: null, graph: null })
    const done = wholeSheet(m, run(m, failed, [{ type: 'sheetAgain', sheet: 'rate-law' }]), 'rate-law')
    expect(temperatureView(m, done).graph!.points.map((p) => p.runId)).toEqual(['mixture-1', 'bath-ice', 'bath-cool', 'bath-warm'])
    expect(sheetOutcomes(m, done, 'rate-law').map((outcome) => outcome.state)).toEqual(['does-not-count', 'counts'])
  })

  it('gives the look of the liquid and the reading of the watch, and no time of a run, until the watch is stopped', () => {
    const state = run(m, createLab(m, 1, 'challenge'), [{ type: 'addIndicator', run: 'mixture-1' }, { type: 'pour', run: 'mixture-1' }])
    expect(JSON.stringify([runView(m, state, 'mixture-1'), timesTable(m, state)])).not.toMatch(/"tenths":\d/)
    expect([lookAt(m, state, 'mixture-1', 60000), watchAt(m, state, 'mixture-1', 60000)]).toEqual(['before', 600])
  })
})

describe('whole labs, driven to completion through the reducer by scripted learners', () => {
  it('complete in each mode, with the parts done in their order and the status completed only at the last entry', () => {
    for (const mode of MODES) {
      let state = createLab(m, 42, mode)
      state = makeRoomRuns(m, state)
      expect(doneParts(m, state)).toEqual(['runs'])
      state = wholeSheet(m, state, 'rate-law')
      expect(doneParts(m, state)).toEqual(['runs', 'rate-law'])
      state = makeBathRuns(m, state)
      expect(state.status).toBe('in-progress')
      state = wholeSheet(m, state, 'temperature')
      expect(doneParts(m, state)).toEqual(['runs', 'rate-law', 'temperature'])
      expect(state.status).toBe('completed')
      expect(reloaded(state)).toEqual(state)
    }
  })
})
