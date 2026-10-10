import { describe, expect, it } from 'vitest'
import { parseFigures } from '../figures'
import { can, entryBlocked, reduce, sheetBlocked, warnings, type Action } from '../kinetics/actions'
import { lookAt, rateLawView, runView, temperatureView, timesTable, watchAt } from '../kinetics/select'
import { createLab, currentAttempt, currentSheet, endOf, kineticsStateSchema, type KineticsState } from '../kinetics/state'
import { makeBathRuns, makeRoomRuns, makeRun, rateLawValues, run, wholeSheet } from '../kinetics/testkit'
import { PINNED_MODEL as m } from './pinnedModel'

// Every learner action of the clock reaction lab: when it can be done, what it does, and what it is told when it
// cannot. Seed 1 throughout: a room at 22.5 °C, and baths at 0.5, 10.1 and 42.0 °C.

const fresh = (mode: 'guided' | 'challenge' = 'challenge') => createLab(m, 1, mode)
const schema = kineticsStateSchema(m)
const fig = (text: string) => parseFigures(text)!
const endMs = (state: KineticsState, runId: string) => endOf(m, state.seed, runId, currentAttempt(state, runId))!

describe('a lab that has just been started', () => {
  it('has one untouched attempt at each of the eight runs, two empty sheets, and is in progress', () => {
    const state = fresh('guided')
    expect(Object.keys(state.runs)).toEqual(['mixture-1', 'mixture-2', 'mixture-3', 'mixture-4', 'mixture-5', 'bath-ice', 'bath-cool', 'bath-warm'])
    for (const attempts of Object.values(state.runs)) expect(attempts).toEqual([{ index: 0, indicator: false, bath: 0, read: false, poured: false, stop: null }])
    expect(Object.values(state.sheets['rate-law'][0]!.entries).every((entry) => entry === null)).toBe(true)
    expect(state).toMatchObject({ seed: 1, mode: 'guided', status: 'in-progress' })
    expect(schema.safeParse(state).success).toBe(true)
    expect(createLab(m, -1, 'guided').seed).toBe(4294967295)
  })
})

describe('a run at the room\'s temperature', () => {
  it('goes one way: starch, the pour that starts the watch, and the stop', () => {
    let state = fresh()
    expect(can(m, state, { type: 'stop', run: 'mixture-1', elapsedMs: 1000, delayMs: 0 })).toBe('not-poured')
    expect(can(m, state, { type: 'stopAtEnd', run: 'mixture-1' })).toBe('not-poured')
    expect(can(m, state, { type: 'runAgain', run: 'mixture-1' })).toBe('run-not-over')
    state = run(m, state, [{ type: 'addIndicator', run: 'mixture-1' }])
    expect(can(m, state, { type: 'addIndicator', run: 'mixture-1' })).toBe('already-done')
    expect(runView(m, state, 'mixture-1')).toMatchObject({ indicator: true, flasks: 'bench', thermometerTenths: null, poured: false, stopped: null, look: 'before', outcome: { state: 'open' } })
    state = run(m, state, [{ type: 'pour', run: 'mixture-1' }])
    for (const type of ['addIndicator', 'pour'] as const) expect(can(m, state, { type, run: 'mixture-1' }), type).toBe('already-poured')
    expect(can(m, state, { type: 'runAgain', run: 'mixture-1' })).toBe('run-not-over')
    const end = endMs(state, 'mixture-1')
    expect(end).toBe(124054)
    state = run(m, state, [{ type: 'stop', run: 'mixture-1', elapsedMs: end + 300, delayMs: 300 }])
    expect(runView(m, state, 'mixture-1')).toMatchObject({ poured: true, stopped: { tenths: 1244, by: 'hand' }, look: 'after', outcome: { state: 'counts' } })
    for (const action of [{ type: 'addIndicator', run: 'mixture-1' }, { type: 'pour', run: 'mixture-1' }, { type: 'stopAtEnd', run: 'mixture-1' }] as Action[]) expect(can(m, state, action), action.type).toBe('run-over')
    // A run that counts is in the table and is not made again.
    expect(can(m, state, { type: 'runAgain', run: 'mixture-1' })).toBe('run-counts')
    expect(timesTable(m, state)[0]).toEqual({ runId: 'mixture-1', mixtureId: 'mixture-1', bathId: null, temperatureTenths: 225, tenths: 1244, by: 'hand' })
  })

  it('stands in no bath and has no thermometer of its own: the room\'s is on the bench', () => {
    const state = fresh()
    for (const type of ['standInBath', 'letStand', 'readThermometer'] as const) expect(can(m, state, { type, run: 'mixture-3' }), type).toBe('no-bath')
    expect(timesTable(m, state).slice(0, 5).map((row) => [row.temperatureTenths, row.tenths, row.by])).toEqual(Array.from({ length: 5 }, () => [225, null, null]))
  })

  it('takes a watch stopped at the change as it takes one stopped by hand, and says which it was', () => {
    const state = makeRun(m, fresh(), 'mixture-4', { stop: 'end' })
    expect(runView(m, state, 'mixture-4')).toMatchObject({ stopped: { tenths: 309, by: 'end' }, look: 'after', outcome: { state: 'counts' } })
    expect(timesTable(m, state)[3]).toMatchObject({ tenths: 309, by: 'end' })
    // By hand, the learner's own delay is added in true milliseconds.
    expect(runView(m, makeRun(m, fresh(), 'mixture-4', { stop: { delayMs: 700 } }), 'mixture-4').stopped).toEqual({ tenths: 316, by: 'hand' })
  })

  it('reads the times it is handed as whole milliseconds inside the watch\'s half hour, and nothing else', () => {
    const state = run(m, fresh(), [{ type: 'addIndicator', run: 'mixture-2' }, { type: 'pour', run: 'mixture-2' }])
    for (const [elapsedMs, delayMs] of [[-1, 0], [1.5, 0], [1800001, 0], [1000, -1], [1000, 0.5], [Number.NaN, 0], [1000, Number.POSITIVE_INFINITY], [-0, 0]]) expect(can(m, state, { type: 'stop', run: 'mixture-2', elapsedMs: elapsedMs!, delayMs: delayMs! }), `${elapsedMs} ${delayMs}`).toBe('invalid-time')
    expect(can(m, state, { type: 'stop', run: 'mixture-2', elapsedMs: 1800000, delayMs: 0 })).toBeNull()
    expect(can(m, state, { type: 'stop', run: 'mixture-9', elapsedMs: 1, delayMs: 0 })).toBe('unknown-run')
  })

  it('shows the liquid and the watch at any time the page hands in, and never past where the watch stops itself', () => {
    let state = fresh()
    expect([lookAt(m, state, 'mixture-1', 500000), watchAt(m, state, 'mixture-1', 500000)]).toEqual(['before', 0])
    state = run(m, state, [{ type: 'addIndicator', run: 'mixture-1' }, { type: 'pour', run: 'mixture-1' }])
    const end = endMs(state, 'mixture-1')
    expect([0, end - 1, end, end + 1, 1800000].map((at) => lookAt(m, state, 'mixture-1', at))).toEqual(['before', 'before', 'after', 'after', 'after'])
    expect([0, 61234, 2000000, -5].map((at) => watchAt(m, state, 'mixture-1', at))).toEqual([0, 612, 18000, 0])
    state = run(m, state, [{ type: 'stop', run: 'mixture-1', elapsedMs: end + 5000, delayMs: 250 }])
    // Once stopped, the watch reads the stopped time whatever the page's time is.
    expect([0, 999999].map((at) => watchAt(m, state, 'mixture-1', at))).toEqual([1243, 1243])
    expect(lookAt(m, state, 'mixture-1', 0)).toBe('after')
  })
})

describe('a run in a bath', () => {
  it('stands in the bath, is left to stand, has its thermometer read, and is then poured', () => {
    let state = fresh()
    expect(can(m, state, { type: 'letStand', run: 'bath-ice' })).toBe('not-in-bath')
    expect(can(m, state, { type: 'readThermometer', run: 'bath-ice' })).toBe('not-in-bath')
    expect(can(m, state, { type: 'pour', run: 'bath-ice' })).toBe('not-in-bath')
    state = run(m, state, [{ type: 'addIndicator', run: 'bath-ice' }, { type: 'standInBath', run: 'bath-ice' }])
    expect(can(m, state, { type: 'standInBath', run: 'bath-ice' })).toBe('already-done')
    expect(can(m, state, { type: 'pour', run: 'bath-ice' })).toBe('thermometer-not-read')
    expect(runView(m, state, 'bath-ice')).toMatchObject({ flasks: 'in-bath', thermometerTenths: null })
    state = run(m, state, [{ type: 'letStand', run: 'bath-ice' }])
    expect(can(m, state, { type: 'letStand', run: 'bath-ice' })).toBe('already-done')
    state = run(m, state, [{ type: 'readThermometer', run: 'bath-ice' }])
    expect(can(m, state, { type: 'readThermometer', run: 'bath-ice' })).toBe('already-done')
    expect(runView(m, state, 'bath-ice')).toMatchObject({ flasks: 'stood', thermometerTenths: 5 })
    state = run(m, state, [{ type: 'pour', run: 'bath-ice' }, { type: 'stopAtEnd', run: 'bath-ice' }])
    expect(runView(m, state, 'bath-ice')).toMatchObject({ stopped: { tenths: 6368, by: 'end' }, outcome: { state: 'counts' } })
    expect(timesTable(m, state)[5]).toEqual({ runId: 'bath-ice', mixtureId: 'mixture-1', bathId: 'ice', temperatureTenths: 5, tenths: 6368, by: 'end' })
  })

  it('shows the room\'s temperature on a thermometer read before the flasks have stood, and forgets that reading once they have', () => {
    let state = run(m, fresh(), [{ type: 'standInBath', run: 'bath-warm' }, { type: 'readThermometer', run: 'bath-warm' }])
    expect(runView(m, state, 'bath-warm').thermometerTenths).toBe(225)
    state = run(m, state, [{ type: 'letStand', run: 'bath-warm' }])
    expect(runView(m, state, 'bath-warm').thermometerTenths).toBeNull()
    expect(can(m, state, { type: 'pour', run: 'bath-warm' })).toBe('thermometer-not-read')
    state = run(m, state, [{ type: 'readThermometer', run: 'bath-warm' }])
    expect(runView(m, state, 'bath-warm').thermometerTenths).toBe(420)
  })

  it('has no temperature in the table until it counts', () => {
    expect(timesTable(m, fresh()).slice(5).map((row) => [row.runId, row.temperatureTenths, row.tenths])).toEqual([['bath-ice', null, null], ['bath-cool', null, null], ['bath-warm', null, null]])
  })
})

describe('the two errors of technique (spec 19.2)', () => {
  it('are warned of in Guided before the pour, and not in Challenge', () => {
    const pour = (runId: string): Action => ({ type: 'pour', run: runId })
    expect(warnings(m, fresh('guided'), pour('mixture-1'))).toEqual(['no-indicator'])
    expect(warnings(m, fresh('challenge'), pour('mixture-1'))).toEqual([])
    expect(warnings(m, run(m, fresh('guided'), [{ type: 'addIndicator', run: 'mixture-1' }]), pour('mixture-1'))).toEqual([])
    const inBath = run(m, fresh('guided'), [{ type: 'standInBath', run: 'bath-cool' }, { type: 'readThermometer', run: 'bath-cool' }])
    expect(warnings(m, inBath, pour('bath-cool'))).toEqual(['no-indicator', 'not-at-temperature'])
    expect(warnings(m, run(m, inBath, [{ type: 'addIndicator', run: 'bath-cool' }]), pour('bath-cool'))).toEqual(['not-at-temperature'])
    expect(warnings(m, run(m, inBath, [{ type: 'addIndicator', run: 'bath-cool' }, { type: 'letStand', run: 'bath-cool' }, { type: 'readThermometer', run: 'bath-cool' }]), pour('bath-cool'))).toEqual([])
    // Nothing is warned of where the pour cannot be made anyway, or for any other action.
    expect(warnings(m, fresh('guided'), pour('bath-cool'))).toEqual([])
    expect(warnings(m, fresh('guided'), { type: 'addIndicator', run: 'mixture-1' })).toEqual([])
  })

  it('leave the pour open in Guided all the same: the same action sent again is the way on', () => {
    const state = fresh('guided')
    expect(can(m, state, { type: 'pour', run: 'mixture-1' })).toBeNull()
    expect(currentAttempt(reduce(m, state, { type: 'pour', run: 'mixture-1' }), 'mixture-1').poured).toBe(true)
  })

  it('with no starch, show nothing however long the watch runs, and the run does not count', () => {
    let state = run(m, fresh(), [{ type: 'pour', run: 'mixture-1' }])
    expect(endOf(m, 1, 'mixture-1', currentAttempt(state, 'mixture-1'))).toBeNull()
    expect([0, 124054, 600000, 1800000].map((at) => lookAt(m, state, 'mixture-1', at))).toEqual(['before', 'before', 'before', 'before'])
    state = run(m, state, [{ type: 'stop', run: 'mixture-1', elapsedMs: 300000, delayMs: 0 }])
    expect(runView(m, state, 'mixture-1')).toMatchObject({ stopped: { tenths: 3000, by: 'hand' }, look: 'before', outcome: { state: 'does-not-count', reasons: ['no-indicator'] } })
    expect(timesTable(m, state)[0]).toMatchObject({ tenths: null, by: null })
    // Left to stop itself, the watch runs to its half hour.
    const left = run(m, fresh(), [{ type: 'pour', run: 'mixture-1' }, { type: 'stopAtEnd', run: 'mixture-1' }])
    expect(runView(m, left, 'mixture-1')).toMatchObject({ stopped: { tenths: 18000, by: 'end' }, look: 'before', outcome: { state: 'does-not-count', reasons: ['no-indicator'] } })
  })

  it('with flasks poured before they have stood, give a time that belongs to neither temperature, and the run does not count', () => {
    const hasty = makeRun(m, fresh(), 'bath-ice', { stand: false, stop: 'end' })
    const careful = makeRun(m, fresh(), 'bath-ice', { stop: 'end' })
    const room = makeRun(m, fresh(), 'mixture-1', { stop: 'end' })
    expect(runView(m, hasty, 'bath-ice')).toMatchObject({ flasks: 'in-bath', thermometerTenths: 225, outcome: { state: 'does-not-count', reasons: ['not-at-temperature'] } })
    const [between, cold, warm] = [runView(m, hasty, 'bath-ice').stopped!.tenths, runView(m, careful, 'bath-ice').stopped!.tenths, runView(m, room, 'mixture-1').stopped!.tenths]
    expect([warm, between, cold]).toEqual([1241, 2724, 6368])
    expect(timesTable(m, hasty)[5]).toMatchObject({ temperatureTenths: null, tenths: null })
  })

  it('name both where both were made', () => {
    const state = run(m, fresh(), [{ type: 'standInBath', run: 'bath-warm' }, { type: 'readThermometer', run: 'bath-warm' }, { type: 'pour', run: 'bath-warm' }, { type: 'stop', run: 'bath-warm', elapsedMs: 60000, delayMs: 0 }])
    expect(runView(m, state, 'bath-warm').outcome).toEqual({ state: 'does-not-count', reasons: ['no-indicator', 'not-at-temperature'] })
  })
})

describe('a watch stopped by hand at the wrong moment', () => {
  const poured = run(m, fresh(), [{ type: 'addIndicator', run: 'mixture-4' }, { type: 'pour', run: 'mixture-4' }])
  const end = endMs(poured, 'mixture-4')
  const stopped = (elapsedMs: number, delayMs: number) => runView(m, run(m, poured, [{ type: 'stop', run: 'mixture-4', elapsedMs, delayMs }]), 'mixture-4')

  it('before the liquid has changed, reads what it read then, and the run does not count', () => {
    expect(end).toBe(30860)
    expect(stopped(end - 1, 0)).toMatchObject({ stopped: { tenths: 309, by: 'hand' }, look: 'before', outcome: { state: 'does-not-count', reasons: ['stopped-early'] } })
    expect(stopped(12000, 0)).toMatchObject({ stopped: { tenths: 120, by: 'hand' }, look: 'before', outcome: { state: 'does-not-count', reasons: ['stopped-early'] } })
  })

  it('up to two seconds after the change counts, the edge included; later than that does not', () => {
    expect(stopped(end, 0).outcome).toEqual({ state: 'counts' })
    expect(stopped(end + 40000, 2000)).toMatchObject({ stopped: { tenths: 329 }, outcome: { state: 'counts' } })
    expect(stopped(end + 40020, 2001)).toMatchObject({ stopped: { tenths: 329 }, look: 'after', outcome: { state: 'does-not-count', reasons: ['stopped-late'] } })
    expect(stopped(1800000, 9000)).toMatchObject({ stopped: { tenths: 399 }, outcome: { state: 'does-not-count', reasons: ['stopped-late'] } })
  })

  it('is made again as a new attempt, with a scatter of its own, and the attempt before it is kept', () => {
    let state = run(m, poured, [{ type: 'stop', run: 'mixture-4', elapsedMs: 5000, delayMs: 0 }, { type: 'runAgain', run: 'mixture-4' }])
    expect(state.runs['mixture-4']!.map((attempt) => [attempt.index, attempt.poured, attempt.stop?.by ?? null])).toEqual([[0, true, 'hand'], [1, false, null]])
    expect(runView(m, state, 'mixture-4')).toMatchObject({ attempts: 2, indicator: false, poured: false, stopped: null, outcome: { state: 'open' } })
    state = makeRun(m, state, 'mixture-4', { stop: 'end' })
    expect(runView(m, state, 'mixture-4').stopped).toEqual({ tenths: 305, by: 'end' })
    expect(schema.safeParse(state).success).toBe(true)
  })
})

describe('the first sheet of the notebook', () => {
  const timed = makeRoomRuns(m, fresh('challenge'))

  it('opens once all five runs at the room\'s temperature count', () => {
    let state = fresh()
    expect(sheetBlocked(m, state, 'rate-law')).toBe('runs-missing')
    expect(can(m, state, { type: 'enter', sheet: 'rate-law', field: 'concentration:iodide', value: fig('0.00200') })).toBe('runs-missing')
    for (const runId of ['mixture-1', 'mixture-2', 'mixture-3', 'mixture-4']) state = makeRun(m, state, runId)
    expect(sheetBlocked(m, state, 'rate-law')).toBe('runs-missing')
    state = makeRun(m, state, 'mixture-5', { indicator: false })
    expect(sheetBlocked(m, state, 'rate-law')).toBe('runs-missing')
    expect(sheetBlocked(m, timed, 'rate-law')).toBeNull()
    expect(rateLawView(m, timed).entries.map((entry) => entry.blocked)).toEqual([null, ...Array.from({ length: 8 }, () => 'entry-above-missing')])
  })

  it('takes its entries in their order, each of its own kind', () => {
    expect(can(m, timed, { type: 'enter', sheet: 'rate-law', field: 'rate', value: fig('2.68e-7') })).toBe('entry-above-missing')
    expect(can(m, timed, { type: 'enter', sheet: 'rate-law', field: 'slope', value: fig('-6010') })).toBe('not-this-sheet')
    expect(can(m, timed, { type: 'enter', sheet: 'rate-law', field: 'concentration:iodide', value: 1 })).toBe('invalid-entry')
    expect(can(m, timed, { type: 'enter', sheet: 'rate-law', field: 'concentration:iodide', value: { mantissa: 20, exponent: -4 } })).toBe('invalid-entry')
    expect(can(m, timed, { type: 'enter', sheet: 'nothing' as 'rate-law', field: 'rate', value: 1 })).toBe('unknown-sheet')
    const values = rateLawValues(m, timed)
    const upToOrders = run(m, timed, ['concentration:iodide', 'concentration:bromate', 'concentration:hydrogen-ion', 'rate'].map((field): Action => ({ type: 'enter', sheet: 'rate-law', field, value: values[field]! })))
    for (const value of [3, -1, 1.5, fig('1.00')]) expect(can(m, upToOrders, { type: 'enter', sheet: 'rate-law', field: 'order:iodide', value }), JSON.stringify(value)).toBe('invalid-entry')
    const upToUnit = run(m, upToOrders, ['order:iodide', 'order:bromate', 'order:hydrogen-ion', 'rateConstant'].map((field): Action => ({ type: 'enter', sheet: 'rate-law', field, value: values[field]! })))
    for (const value of [1, -5, fig('1.00')]) expect(can(m, upToUnit, { type: 'enter', sheet: 'rate-law', field: 'unit', value }), JSON.stringify(value)).toBe('invalid-entry')
    expect(can(m, upToUnit, { type: 'enter', sheet: 'rate-law', field: 'unit', value: -3 })).toBeNull()
  })

  it('empties the entries under one that is changed, since they were worked from it', () => {
    const values = rateLawValues(m, timed)
    const fields = ['concentration:iodide', 'concentration:bromate', 'concentration:hydrogen-ion', 'rate', 'order:iodide']
    let state = run(m, timed, fields.map((field): Action => ({ type: 'enter', sheet: 'rate-law', field, value: values[field]! })))
    state = run(m, state, [{ type: 'enter', sheet: 'rate-law', field: 'concentration:bromate', value: fig('0.00800') }])
    expect(rateLawView(m, state).entries.map((entry) => entry.value !== null)).toEqual([true, true, false, false, false, false, false, false, false])
  })

  it('is checked by the learner in Challenge once it is full, and by its last entry in Guided', () => {
    expect(can(m, timed, { type: 'check', sheet: 'rate-law' })).toBe('sheet-not-full')
    const values = rateLawValues(m, timed)
    const all = Object.keys(currentSheet(timed, 'rate-law').entries).map((field): Action => ({ type: 'enter', sheet: 'rate-law', field, value: values[field]! }))
    const full = run(m, timed, all)
    expect(currentSheet(full, 'rate-law').closed).toBe(false)
    expect(rateLawView(m, full)).toMatchObject({ outcome: { state: 'open' }, done: false })
    const checked = run(m, full, [{ type: 'check', sheet: 'rate-law' }])
    expect(rateLawView(m, checked)).toMatchObject({ outcome: { state: 'counts' }, done: true })
    expect(can(m, checked, { type: 'check', sheet: 'rate-law' })).toBe('sheet-over')
    expect(can(m, checked, all[0]!)).toBe('sheet-over')
    expect(can(m, checked, { type: 'sheetAgain', sheet: 'rate-law' })).toBe('sheet-counts')
    const guided = run(m, makeRoomRuns(m, fresh('guided')), all)
    expect(currentSheet(guided, 'rate-law').closed).toBe(true)
    expect(rateLawView(m, guided).done).toBe(true)
  })

  it('is worked again from empty once it has been checked and does not count', () => {
    expect(can(m, timed, { type: 'sheetAgain', sheet: 'rate-law' })).toBe('sheet-not-over')
    const failed = wholeSheet(m, timed, 'rate-law', { slip: 'wrong-order' })
    expect(rateLawView(m, failed).outcome).toMatchObject({ state: 'does-not-count', reasons: ['entries-do-not-follow'] })
    const again = run(m, failed, [{ type: 'sheetAgain', sheet: 'rate-law' }])
    expect(rateLawView(m, again)).toMatchObject({ workings: 2, outcome: { state: 'open' }, rows: null, constants: null })
    expect(rateLawView(m, again).entries.every((entry) => entry.value === null)).toBe(true)
    expect(rateLawView(m, wholeSheet(m, again, 'rate-law')).done).toBe(true)
  })
})

describe('the second sheet of the notebook', () => {
  const allRuns = makeBathRuns(m, makeRoomRuns(m, fresh('challenge')))
  const open = wholeSheet(m, allRuns, 'rate-law')

  it('waits for its own runs, and then for the rate law', () => {
    expect(sheetBlocked(m, fresh(), 'temperature')).toBe('runs-missing')
    expect(sheetBlocked(m, makeRoomRuns(m, fresh()), 'temperature')).toBe('runs-missing')
    expect(sheetBlocked(m, allRuns, 'temperature')).toBe('rate-law-first')
    expect(temperatureView(m, allRuns)).toMatchObject({ blocked: 'rate-law-first', rows: null, graph: null })
    expect(can(m, allRuns, { type: 'look', place: 0 })).toBe('rate-law-first')
    expect(sheetBlocked(m, open, 'temperature')).toBeNull()
    // The baths' runs can be made before the rate law is worked, or after.
    const later = makeBathRuns(m, wholeSheet(m, makeRoomRuns(m, fresh()), 'rate-law'))
    expect(sheetBlocked(m, later, 'temperature')).toBeNull()
  })

  it('takes a place on the line only once it has been looked at, and two places that are not one', () => {
    expect(can(m, open, { type: 'enter', sheet: 'temperature', field: 'first', value: 2 })).toBe('not-looked')
    expect(can(m, open, { type: 'look', place: 12 })).toBe('nothing-there')
    expect(can(m, open, { type: 'look', place: -1 })).toBe('nothing-there')
    let state = run(m, open, [{ type: 'look', place: 2 }, { type: 'look', place: 9 }])
    expect(reduce(m, state, { type: 'look', place: 2 })).toBe(state)
    expect(temperatureView(m, state).graph!.places.map((place) => place.looked)).toEqual([false, false, true, false, false, false, false, false, false, true, false, false])
    state = run(m, state, [{ type: 'enter', sheet: 'temperature', field: 'first', value: 2 }])
    expect(can(m, state, { type: 'enter', sheet: 'temperature', field: 'second', value: 2 })).toBe('same-place')
    expect(can(m, state, { type: 'enter', sheet: 'temperature', field: 'second', value: 5 })).toBe('not-looked')
    expect(can(m, state, { type: 'enter', sheet: 'temperature', field: 'second', value: 12 })).toBe('invalid-entry')
    state = run(m, state, [{ type: 'enter', sheet: 'temperature', field: 'second', value: 9 }])
    expect(can(m, state, { type: 'enter', sheet: 'temperature', field: 'slope', value: 2 })).toBe('invalid-entry')
    // (2.429 - 4.533) / (0.003600 - 0.003250) = -6011.4 K, and 6010 x 8.314 / 1000 = 49.97 kJ/mol.
    state = run(m, state, [{ type: 'enter', sheet: 'temperature', field: 'slope', value: fig('-6010') }, { type: 'enter', sheet: 'temperature', field: 'energy', value: fig('50.0') }, { type: 'check', sheet: 'temperature' }])
    expect(temperatureView(m, state)).toMatchObject({ outcome: { state: 'counts' }, done: true, expected: { activationKJ: 50 } })
    expect(state.status).toBe('completed')
  })
})

describe('the mode, and a lab that is complete', () => {
  it('lets the mode be changed at any time, and changes nothing else', () => {
    const state = makeRoomRuns(m, fresh('guided'))
    const changed = reduce(m, state, { type: 'setMode', mode: 'challenge' })
    expect(changed).toEqual({ ...state, mode: 'challenge' })
    expect(reduce(m, state, { type: 'setMode', mode: 'guided' })).toBe(state)
  })

  it('returns the very same state for an action that cannot be done', () => {
    const state = fresh()
    for (const action of [{ type: 'stopAtEnd', run: 'mixture-1' }, { type: 'look', place: 0 }, { type: 'check', sheet: 'rate-law' }, { type: 'runAgain', run: 'bath-ice' }, { type: 'pour', run: 'nothing' }] as Action[]) expect(reduce(m, state, action), action.type).toBe(state)
  })

  it('takes no action but a change of mode once all three parts are done', () => {
    const done = wholeSheet(m, wholeSheet(m, makeBathRuns(m, makeRoomRuns(m, fresh('guided'))), 'rate-law'), 'temperature')
    expect(done.status).toBe('completed')
    for (const action of [{ type: 'runAgain', run: 'mixture-1' }, { type: 'look', place: 0 }, { type: 'sheetAgain', sheet: 'temperature' }, { type: 'addIndicator', run: 'mixture-1' }] as Action[]) expect(can(m, done, action), action.type).toBe('lab-completed')
    expect(entryBlocked(m, done, 'temperature', 'slope')).toBe('lab-completed')
    expect(can(m, done, { type: 'setMode', mode: 'challenge' })).toBeNull()
  })
})
