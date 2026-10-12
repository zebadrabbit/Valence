import { describe, expect, it } from 'vitest'
import { toNumber } from '../figures'
import { can, reduce, sheetBlocked, type Action } from './actions'
import { concentration, endMs, hasTemperature, modelProblems, usedUp, type KineticsModel } from './model'
import { fieldsOf, sheetIdsOf } from './notebook'
import { doneParts, leftAt, lookAt, rateLawView, runView, sheetOutcomes, temperatureView, timesTable } from './select'
import { labSetup, scatterOf } from './setup'
import { createLab, currentAttempt, endOf, kineticsStateSchema, partIdsOf, type KineticsState } from './state'
import { apparentOrder, entryActions, finishLab, makeRoomRuns, makeRun, rateLawValues, run, sig, wholeLab, wholeSheet } from './testkit'

// Spec 20.4: the engine takes a record with no baths, and then has no part on temperature; it says how much of
// what is used up is left at a time handed in, where that is what is seen; and a rate is worked from the learner's
// own entry where what is used up is one of the reactants. Here it is run on a made-up record of that kind, which
// is no lab's: a tint that fades as it is used up, two of it for each one of the reaction, and of no order itself;
// a rate first order in one thing and second order in another; four mixtures of 20 mL and no baths at all. A
// second made-up record, the same with a bath and with something added to show the end, stands for the labs that
// have what this one lacks.

const BARE: KineticsModel = {
  solutions: [
    { id: 'left', microMolar: 3000000 },
    { id: 'right', microMolar: 500000 },
    { id: 'tint', microMolar: 4000 },
    { id: 'solvent', microMolar: null },
  ],
  reactants: [
    { id: 'p', solutionId: 'left', order: 1 },
    { id: 'q', solutionId: 'right', order: 2 },
    { id: 't', solutionId: 'tint', order: 0 },
  ],
  end: { solutionId: 'tint', per: 2, indicatorId: null },
  rateConstant: 0.0004,
  referenceCentiKelvin: 29515,
  activationJ: 60000,
  gasConstantE9: 8314462618,
  zeroCelsiusCentiKelvin: 27315,
  mixtures: [
    { id: 'base', tenthMl: { left: 50, right: 50, tint: 50, solvent: 50 } },
    { id: 'more-left', tenthMl: { left: 100, right: 50, tint: 50, solvent: 0 } },
    { id: 'more-right', tenthMl: { left: 50, right: 100, tint: 50, solvent: 0 } },
    { id: 'more-tint', tenthMl: { left: 50, right: 50, tint: 100, solvent: 0 } },
  ],
  runs: [
    { id: 'i', mixtureId: 'base', bathId: null },
    { id: 'ii', mixtureId: 'more-left', bathId: null },
    { id: 'iii', mixtureId: 'more-right', bathId: null },
    { id: 'iv', mixtureId: 'more-tint', bathId: null },
  ],
  referenceRunId: 'i',
  orderRuns: { p: ['i', 'ii'], q: ['i', 'iii'], t: ['i', 'iv'] },
  baths: [],
  roomRangeTenths: [190, 250],
  orderChoices: [0, 1, 2],
  unitPowers: [0, -1, -2, -3],
  scatterPerTenThousand: 60,
  delayLimitMs: 2500,
  watchLimitMs: 1200000,
  rateConstantTolerancePercent: 5,
  activationTolerancePercent: 0,
  places: { fromMicro: 0, stepMicro: 0, count: 0 },
}
const m = BARE

/** The same record with one bath, a line to go with it, and a drop of something that must be added for the end to show. */
const DRESSED: KineticsModel = {
  ...BARE,
  solutions: [...BARE.solutions, { id: 'drop', microMolar: null }],
  end: { ...BARE.end, indicatorId: 'drop' },
  runs: [...BARE.runs, { id: 'warmed', mixtureId: 'base', bathId: 'warm' }],
  baths: [{ id: 'warm', rangeTenths: [350, 400] }],
  activationTolerancePercent: 5,
  places: { fromMicro: 3150, stepMicro: 50, count: 6 },
}

const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1)
const schema = kineticsStateSchema(m)
const reloaded = (state: KineticsState): KineticsState => schema.parse(JSON.parse(JSON.stringify(state)))

describe('a record with no baths (spec 20.4)', () => {
  it('is one the engine can run, with no places on a line it does not have', () => {
    expect(modelProblems(m)).toEqual([])
    expect(modelProblems(DRESSED)).toEqual([])
    expect(modelProblems({ ...m, places: { fromMicro: 3150, stepMicro: 50, count: 6 } })).toEqual(['a model with no baths has no line, and so no places on one'])
    expect(modelProblems({ ...DRESSED, places: m.places })).toEqual(['the line has two places or more, each further along than the last'])
    // A run in a bath the model does not have is still refused.
    expect(modelProblems({ ...m, runs: [...m.runs, { id: 'warmed', mixtureId: 'base', bathId: 'warm' }] })).toContain('the run "warmed" stands in no bath of the model')
  })

  it('has two parts and one sheet, where a record with a bath has three and two', () => {
    expect([hasTemperature(m), partIdsOf(m), sheetIdsOf(m)]).toEqual([false, ['runs', 'rate-law'], ['rate-law']])
    expect([hasTemperature(DRESSED), partIdsOf(DRESSED), sheetIdsOf(DRESSED)]).toEqual([true, ['runs', 'rate-law', 'temperature'], ['rate-law', 'temperature']])
  })

  it('starts a lab with no working of the second sheet, and the seed fixes the room alone', () => {
    const state = createLab(m, 3, 'guided')
    expect(state.sheets.temperature).toEqual([])
    expect(state.sheets['rate-law']).toHaveLength(1)
    expect(Object.keys(state.runs)).toEqual(['i', 'ii', 'iii', 'iv'])
    expect(labSetup(m, 3)).toEqual({ roomTenths: labSetup(m, 3).roomTenths, bathTenths: {} })
    expect(createLab(DRESSED, 3, 'guided').sheets.temperature).toHaveLength(1)
    // With no bath to draw for, the draws after the room's are the scatters.
    expect(m.runs.map((r) => scatterOf(m, 3, r.id, 0)).every((s) => Number.isInteger(s) && Math.abs(s) <= 60)).toBe(true)
  })

  it('works its strengths and its times from its own numbers', () => {
    // 3.0 M x 5.0 / 20.0 = 0.750 M; 0.50 M x 5.0 / 20.0 = 0.125 M; 0.0040 M x 5.0 / 20.0 = 0.00100 M, of which half is one of the reaction.
    expect(m.reactants.map((r) => toNumber(concentration(m, 'base', r.solutionId)))).toEqual([0.75, 0.125, 0.001])
    expect(toNumber(usedUp(m, 'base'))).toBe(0.0005)
    // 0.0005 / (0.0004 x 0.750 x 0.125²) = 106.667 s; half with twice the first, a quarter with twice the second, and twice as long with twice the tint.
    expect(m.mixtures.map((x) => endMs(m, x.id, 29515, 0))).toEqual([106667, 53333, 26667, 213333])
  })

  it('is complete when its runs count and its one sheet counts, at every seed and in both modes', () => {
    for (const mode of ['guided', 'challenge'] as const) {
      for (const seed of SEEDS) {
        const timed = makeRoomRuns(m, createLab(m, seed, mode))
        expect(doneParts(m, timed), `${mode} ${seed}`).toEqual(['runs'])
        expect(timed.status, `${mode} ${seed}`).toBe('in-progress')
        expect(m.reactants.map((r) => Math.round(apparentOrder(m, timed, r.id)) + 0), `${mode} ${seed}`).toEqual([1, 2, 0])
        const state = wholeSheet(m, timed, 'rate-law')
        expect(doneParts(m, state), `${mode} ${seed}`).toEqual(['runs', 'rate-law'])
        expect(state.status, `${mode} ${seed}`).toBe('completed')
        expect(rateLawView(m, state).expected!.orders, `${mode} ${seed}`).toEqual({ p: 1, q: 2, t: 0 })
        expect(wholeLab(m, createLab(m, seed, mode)), `${mode} ${seed}`).toEqual(state)
        expect(reloaded(state), `${mode} ${seed}`).toEqual(state)
      }
    }
  }, 60_000)

  it('stores an empty list for the sheet it lacks, and nothing else of it', () => {
    const state = wholeLab(m, createLab(m, 1, 'challenge'))
    expect(Object.keys(state.sheets)).toEqual(['rate-law', 'temperature'])
    expect(JSON.stringify(state)).toContain('"temperature":[]')
    expect(JSON.stringify(state)).not.toMatch(/first|second|slope|energy/)
  })

  it('has no such sheet to look at, enter in, check or work again, and no bath to stand a flask in', () => {
    const state = makeRoomRuns(m, createLab(m, 2, 'challenge'), { stop: 'end' })
    const refused: Action[] = [
      { type: 'look', place: 0 },
      { type: 'enter', sheet: 'temperature', field: 'first', value: 0 },
      { type: 'check', sheet: 'temperature' },
      { type: 'sheetAgain', sheet: 'temperature' },
    ]
    for (const action of refused) {
      expect(can(m, state, action), action.type).toBe('unknown-sheet')
      expect(reduce(m, state, action), action.type).toBe(state)
    }
    expect(sheetBlocked(m, state, 'temperature')).toBe('unknown-sheet')
    expect(sheetBlocked(m, state, 'rate-law')).toBeNull()
    expect(sheetOutcomes(m, state, 'temperature')).toEqual([])
    expect(temperatureView(m, state)).toEqual({ blocked: 'unknown-sheet', workings: 0, entries: [], rows: null, graph: null, outcome: { state: 'open' }, done: false, expected: null })
    const fresh = createLab(m, 2, 'guided')
    for (const type of ['standInBath', 'letStand', 'readThermometer'] as const) expect(can(m, fresh, { type, run: 'i' }), type).toBe('no-bath')
    expect(timesTable(m, state).map((row) => row.bathId)).toEqual([null, null, null, null])
    // The same asked of a record with a bath is answered as it always was.
    const dressed = createLab(DRESSED, 2, 'challenge')
    expect(can(DRESSED, dressed, { type: 'look', place: 0 })).toBe('runs-missing')
    expect(temperatureView(DRESSED, dressed)).toMatchObject({ blocked: 'runs-missing', workings: 1 })
  })

  it('refuses a stored lab that holds a working of the sheet it lacks, and one with a bath that holds none', () => {
    const done = wholeLab(m, createLab(m, 1, 'challenge'))
    const edited = (edit: (state: KineticsState) => void) => {
      const copy: KineticsState = JSON.parse(JSON.stringify(done))
      edit(copy)
      return schema.safeParse(copy).success
    }
    expect(edited(() => {})).toBe(true)
    expect(edited((s) => void s.sheets.temperature.push({ entries: { first: null, second: null, slope: null, energy: null }, looked: [], closed: false }))).toBe(false)
    expect(edited((s) => void s.sheets.temperature.push({ entries: {}, looked: [], closed: false }))).toBe(false)
    expect(edited((s) => void delete (s.sheets as Partial<KineticsState['sheets']>).temperature)).toBe(false)
    expect(edited((s) => void (s.sheets['rate-law'] = []))).toBe(false)
    expect(edited((s) => void (s.status = 'in-progress'))).toBe(false)
    expect(edited((s) => void (s.runs.i![0]!.bath = 1))).toBe(false)
    const dressed = createLab(DRESSED, 1, 'challenge')
    expect(kineticsStateSchema(DRESSED).safeParse(dressed).success).toBe(true)
    expect(kineticsStateSchema(DRESSED).safeParse({ ...dressed, sheets: { ...dressed.sheets, temperature: [] } }).success).toBe(false)
    // A lab of one record is not a lab of the other.
    expect(kineticsStateSchema(DRESSED).safeParse(done).success).toBe(false)
    expect(schema.safeParse(dressed).success).toBe(false)
  })

  it('can be finished from a lab whose runs went wrong', () => {
    let state = createLab(m, 9, 'challenge')
    state = makeRun(m, state, 'ii', { stop: { earlyMs: 4000 } })
    state = makeRun(m, state, 'iv', { stop: { delayMs: m.delayLimitMs + 1 } })
    state = run(m, state, [{ type: 'pour', run: 'iii' }])
    expect(runView(m, state, 'ii').outcome).toEqual({ state: 'does-not-count', reasons: ['stopped-early'] })
    expect(runView(m, state, 'iv').outcome).toEqual({ state: 'does-not-count', reasons: ['stopped-late'] })
    expect(finishLab(m, state, reloaded).status).toBe('completed')
    const failed = wholeSheet(m, makeRoomRuns(m, createLab(m, 9, 'challenge')), 'rate-law', { slip: 'not-diluted' })
    expect(failed.status).toBe('in-progress')
    expect(finishLab(m, failed, reloaded).status).toBe('completed')
  })
})

describe('how much of what is used up is left (spec 20.4)', () => {
  const poured = (seed: number, runId: string) => run(m, createLab(m, seed, 'challenge'), [{ type: 'pour', run: runId }])

  it('is all of it before the pour and at the pour: the strength of the mixture, in whole micromoles for a litre', () => {
    const fresh = createLab(m, 4, 'guided')
    expect(m.runs.map((r) => leftAt(m, fresh, r.id, 0))).toEqual([
      { microMolar: 1000, ofMicroMolar: 1000 },
      { microMolar: 1000, ofMicroMolar: 1000 },
      { microMolar: 1000, ofMicroMolar: 1000 },
      { microMolar: 2000, ofMicroMolar: 2000 },
    ])
    // Before the pour the time handed in changes nothing.
    expect(leftAt(m, fresh, 'i', 60000)).toEqual({ microMolar: 1000, ofMicroMolar: 1000 })
    expect(leftAt(m, poured(4, 'iv'), 'iv', 0)).toEqual({ microMolar: 2000, ofMicroMolar: 2000 })
    expect(leftAt(m, poured(4, 'iv'), 'iv', -5)).toEqual({ microMolar: 2000, ofMicroMolar: 2000 })
  })

  it('falls in a straight line from the pour to the end, rounded up', () => {
    for (const seed of SEEDS) {
      for (const { id } of m.runs) {
        const state = poured(seed, id)
        const end = endOf(m, seed, id, currentAttempt(state, id))!
        const { ofMicroMolar: of } = leftAt(m, state, id, 0)!
        for (const share of [0.1, 0.25, 0.5, 0.75, 0.9, 0.999]) {
          const at = Math.floor(end * share)
          const exactly = (of * (end - at)) / end
          const { microMolar } = leftAt(m, state, id, at)!
          expect(microMolar, `${seed} ${id} ${share}`).toBe(Math.ceil(exactly - 1e-9))
          expect(microMolar - exactly, `${seed} ${id} ${share}`).toBeLessThan(1)
        }
        // Half of it is left at half the time, to the nearest micromole.
        expect(Math.abs(leftAt(m, state, id, end / 2)!.microMolar - of / 2), `${seed} ${id}`).toBeLessThanOrEqual(1)
      }
    }
  })

  it('never rises as the watch runs', () => {
    const state = poured(5, 'iii')
    const end = endOf(m, 5, 'iii', currentAttempt(state, 'iii'))!
    let last = Infinity
    for (let at = 0; at <= end + 2000; at += 137) {
      const { microMolar } = leftAt(m, state, 'iii', at)!
      expect(microMolar).toBeLessThanOrEqual(last)
      last = microMolar
    }
    expect(last).toBe(0)
  })

  it('is none exactly when the run has ended: a millisecond before, some is left and the liquid has not changed', () => {
    for (const seed of SEEDS) {
      for (const { id } of m.runs) {
        const state = poured(seed, id)
        const end = endOf(m, seed, id, currentAttempt(state, id))!
        expect([leftAt(m, state, id, end - 1)!.microMolar, lookAt(m, state, id, end - 1)], `${seed} ${id}`).toEqual([1, 'before'])
        expect([leftAt(m, state, id, end - 0.5)!.microMolar, lookAt(m, state, id, end - 0.5)], `${seed} ${id}`).toEqual([1, 'before'])
        expect([leftAt(m, state, id, end)!.microMolar, lookAt(m, state, id, end)], `${seed} ${id}`).toEqual([0, 'after'])
        expect([leftAt(m, state, id, m.watchLimitMs + 1)!.microMolar, lookAt(m, state, id, m.watchLimitMs + 1)], `${seed} ${id}`).toEqual([0, 'after'])
        for (let at = 0; at < end + 500; at += 997) expect(leftAt(m, state, id, at)!.microMolar === 0, `${seed} ${id} ${at}`).toBe(lookAt(m, state, id, at) === 'after')
      }
    }
  })

  it('is what was left at the stop once the watch is stopped, whatever time is handed in after', () => {
    const state = poured(6, 'i')
    const end = endOf(m, 6, 'i', currentAttempt(state, 'i'))!
    const early = run(m, state, [{ type: 'stop', run: 'i', elapsedMs: Math.floor(end / 4), delayMs: 0 }])
    expect(runView(m, early, 'i')).toMatchObject({ look: 'before', outcome: { state: 'does-not-count', reasons: ['stopped-early'] } })
    expect(leftAt(m, early, 'i', 0)).toEqual(leftAt(m, state, 'i', Math.floor(end / 4)))
    expect(leftAt(m, early, 'i', 0)).toEqual(leftAt(m, early, 'i', end * 3))
    expect(leftAt(m, early, 'i', 0)!.microMolar).toBeGreaterThanOrEqual(750)
    const late = run(m, state, [{ type: 'stop', run: 'i', elapsedMs: end + 900, delayMs: 900 }])
    expect([leftAt(m, late, 'i', 0), runView(m, late, 'i').look]).toEqual([{ microMolar: 0, ofMicroMolar: 1000 }, 'after'])
    const atEnd = run(m, state, [{ type: 'stopAtEnd', run: 'i' }])
    expect([leftAt(m, atEnd, 'i', 0), runView(m, atEnd, 'i').look]).toEqual([{ microMolar: 0, ofMicroMolar: 1000 }, 'after'])
    // A run made again starts with all of it.
    const again = run(m, early, [{ type: 'runAgain', run: 'i' }])
    expect(leftAt(m, again, 'i', 0)).toEqual({ microMolar: 1000, ofMicroMolar: 1000 })
  })

  it('is left whole where a run would outlast the watch: the liquid never changes, and some is always left', () => {
    const slow: KineticsModel = { ...m, rateConstant: m.rateConstant / 100 }
    const state = run(slow, createLab(slow, 1, 'challenge'), [{ type: 'pour', run: 'i' }])
    expect(endOf(slow, 1, 'i', currentAttempt(state, 'i'))!).toBeGreaterThan(slow.watchLimitMs)
    expect(leftAt(slow, state, 'i', slow.watchLimitMs)!.microMolar).toBeGreaterThan(0)
    expect(leftAt(slow, state, 'i', slow.watchLimitMs * 50)).toEqual(leftAt(slow, state, 'i', slow.watchLimitMs))
    const stopped = run(slow, state, [{ type: 'stopAtEnd', run: 'i' }])
    expect(runView(slow, stopped, 'i')).toMatchObject({ look: 'before', outcome: { state: 'does-not-count', reasons: ['ran-out'] } })
    expect(leftAt(slow, stopped, 'i', 0)!.microMolar).toBeGreaterThan(0)
  })

  it('is not said where something added shows the end: what is used up there goes unseen, at every point of a run', () => {
    let state = createLab(DRESSED, 7, 'challenge')
    const nothing = (where: string) => {
      for (const { id } of DRESSED.runs) for (const at of [0, 1, 5000, 60000, 106000, 400000, DRESSED.watchLimitMs]) expect(leftAt(DRESSED, state, id, at), `${where} ${id} ${at}`).toBeNull()
    }
    nothing('fresh')
    for (const action of [{ type: 'addIndicator', run: 'i' }, { type: 'pour', run: 'i' }, { type: 'pour', run: 'ii' }] as const) {
      state = run(DRESSED, state, [action])
      nothing(action.type)
    }
    state = run(DRESSED, state, [{ type: 'stopAtEnd', run: 'i' }, { type: 'stopAtEnd', run: 'ii' }])
    nothing('stopped')
    expect(runView(DRESSED, state, 'i').look).toBe('after')
  })
})

describe("a rate worked from the learner's own entry, where what is used up is a reactant (spec 19.3: each entry follows from the entries above it)", () => {
  const timed = (mode: 'guided' | 'challenge', seed = 11) => makeRoomRuns(m, createLab(m, seed, mode), { stop: 'end' })
  const seconds = (state: KineticsState) => timesTable(m, state)[0]!.tenths! / 10
  const entered = (state: KineticsState, values: Record<string, unknown>) => run(m, state, [...entryActions(m, 'rate-law', values as never), { type: 'check', sheet: 'rate-law' }])

  it('asks for the strength of what is used up before the rate, as the third reactant', () => {
    expect(fieldsOf(m, 'rate-law')).toEqual(['concentration:p', 'concentration:q', 'concentration:t', 'rate', 'order:p', 'order:q', 'order:t', 'rateConstant', 'unit'])
  })

  it('takes a careful rate as it always did: half of the tint in the mixture, over the time', () => {
    for (const seed of SEEDS) {
      const state = timed('challenge', seed)
      const values = rateLawValues(m, state)
      expect(values.rate, String(seed)).toEqual(sig(0.001 / 2 / seconds(state)))
      expect(rateLawView(m, entered(state, values)).outcome.state, String(seed)).toBe('counts')
    }
  })

  it('in Challenge, marks a strength left as the bottle\'s and not the rate that follows from it', () => {
    const state = timed('challenge')
    const careful = rateLawValues(m, state)
    // The tint taken as 0.00400 M, the bottle's, and the rate worked from that: four times the careful one.
    const own = { ...careful, 'concentration:t': sig(0.004), rate: sig(0.004 / 2 / seconds(state)), rateConstant: sig((0.004 / 2 / seconds(state)) / (0.75 * 0.125 ** 2)) }
    const view = rateLawView(m, entered(state, own))
    const verdict = (field: string) => view.entries.find((entry) => entry.field === field)!.verdict
    expect(verdict('concentration:t')).toEqual({ follows: false, slip: 'not-diluted' })
    expect(verdict('rate')).toEqual({ follows: true, slip: null })
    expect(verdict('rateConstant')).toEqual({ follows: true, slip: null })
    expect(view.outcome).toMatchObject({ state: 'does-not-count', reasons: ['entries-do-not-follow'] })
  })

  it('takes as well a rate worked from the strength as it should have been, as any entry above may be taken unrounded', () => {
    const state = timed('challenge')
    const careful = rateLawValues(m, state)
    const view = rateLawView(m, entered(state, { ...careful, 'concentration:t': sig(0.004) }))
    expect(view.entries.find((entry) => entry.field === 'rate')!.verdict).toEqual({ follows: true, slip: null })
    expect(view.entries.find((entry) => entry.field === 'rateConstant')!.verdict).toEqual({ follows: true, slip: null })
  })

  it('marks a rate that follows from neither, and names the slips it knows', () => {
    const state = timed('challenge')
    const careful = rateLawValues(m, state)
    const rateVerdict = (values: Record<string, unknown>) => rateLawView(m, entered(state, values)).entries.find((entry) => entry.field === 'rate')!.verdict
    expect(rateVerdict({ ...careful, rate: sig(0.003 / seconds(state)) })).toEqual({ follows: false, slip: null })
    // All of the tint taken, and not the half that is one of the reaction: from the true strength, and from the learner's own.
    expect(rateVerdict({ ...careful, rate: sig(0.001 / seconds(state)) })).toEqual({ follows: false, slip: 'count-left-out' })
    expect(rateVerdict({ ...careful, 'concentration:t': sig(0.004), rate: sig(0.004 / seconds(state)) })).toEqual({ follows: false, slip: 'count-left-out' })
    expect(rateVerdict({ ...careful, rate: { ...(careful.rate as { mantissa: number; exponent: number }), mantissa: -(careful.rate as { mantissa: number }).mantissa } })).toEqual({ follows: false, slip: 'wrong-sign' })
  })

  it('in Guided, where the strength above was checked as it was made, refuses a rate that is not the careful one', () => {
    const state = timed('guided')
    const careful = rateLawValues(m, state)
    const upToRate = run(m, state, entryActions(m, 'rate-law', careful).slice(0, 3))
    expect(can(m, upToRate, { type: 'enter', sheet: 'rate-law', field: 'rate', value: sig(0.004 / 2 / seconds(state)) })).toBe('does-not-follow')
    expect(can(m, upToRate, { type: 'enter', sheet: 'rate-law', field: 'rate', value: sig(0.001 / seconds(state)) })).toBe('count-left-out')
    expect(can(m, upToRate, { type: 'enter', sheet: 'rate-law', field: 'rate', value: careful.rate! })).toBeNull()
  })
})
