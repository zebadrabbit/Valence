import { describe, expect, it } from 'vitest'
import { flameData as data } from '@/chem-data/flame/data'
import { can, reduce, warnings, type Action } from './actions'
import { FLAME, expectedObservation, looksOf, looksOpening, wrongAnswers } from './check'
import { HANDLING, uncleanCause } from './loop'
import { stationView } from './select'
import { createLab, flameStateSchema, type FlameState } from './state'
import { run, stationScript } from './testkit'

const [BA, CA, CU, K, NA, SR] = data.salts.map((s) => s.id) as [string, string, string, string, string, string]
const start = () => createLab(data, 'challenge')
const after = (...actions: Action[]) => run(data, start(), actions)
const clean: Action = { type: 'cleanLoop' }
const dip = (stationId: string): Action => ({ type: 'dipLoop', stationId })
const hold = (stationId: string): Action => ({ type: 'holdInFlame', stationId })
const look = (stationId: string, at: string): Action => ({ type: 'look', stationId, at })
const record = (stationId: string, observation = expectedObservation(data, stationId)): Action => ({ type: 'recordObservation', stationId, observation })
const schema = flameStateSchema(data)

describe('a lab that has just been started', () => {
  it('has the loop as it was picked up, handled and not cleaned, six untouched stations and no closing answer', () => {
    expect(start()).toEqual({ mode: 'challenge', status: 'in-progress', loop: [HANDLING], stations: Array.from({ length: 6 }, () => ({ held: null, looked: [], observation: null })), closing: null })
    expect(schema.safeParse(start()).success).toBe(true)
    expect(stationView(data, start(), K)).toEqual({ flame: null, spectrum: [], looked: [], open: { colour: false, range: false, kind: false }, observation: null, counts: null, cause: null, wrong: null, guidanceShown: false, expected: null, done: false })
  })
})

describe('the loop', () => {
  it('carries what it was dipped in, each salt once and in order, until it is cleaned', () => {
    expect(after(dip(CA)).loop).toEqual([HANDLING, CA])
    expect(after(dip(CA), dip(SR), dip(CA)).loop).toEqual([HANDLING, CA, SR])
    expect(after(dip(CA), clean).loop).toEqual([])
    expect(after(clean, dip(SR), dip(BA)).loop).toEqual([SR, BA])
    // Holding it in the flame burns nothing off: only cleaning does.
    expect(after(clean, dip(SR), hold(SR)).loop).toEqual([SR])
  })

  it('returns the very same state for a dip in a well it already carries and for cleaning a clean loop', () => {
    const dipped = after(clean, dip(CU))
    expect(reduce(data, dipped, dip(CU))).toBe(dipped)
    const cleaned = after(clean)
    expect(reduce(data, cleaned, clean)).toBe(cleaned)
  })

  it('names why it is not clean for a station', () => {
    expect(uncleanCause([HANDLING, CA], CA)).toEqual({ handled: true, carried: [] })
    expect(uncleanCause([SR, K, CA], CA)).toEqual({ handled: false, carried: [SR, K] })
  })
})

describe('holding the loop in the flame', () => {
  it("needs the station's salt on the loop", () => {
    expect(can(data, start(), hold(CA))).toBe('not-dipped')
    expect(can(data, after(clean), hold(CA))).toBe('not-dipped')
    expect(can(data, after(dip(SR)), hold(CA))).toBe('not-dipped')
    expect(can(data, after(dip(CA)), hold(CA))).toBeNull()
  })

  it('keeps what was on the loop then, so that what the station shows does not change when the loop is cleaned afterwards', () => {
    const held = after(clean, dip(SR), hold(SR), clean, dip(K))
    expect(held.stations[5]).toEqual({ held: [SR], looked: [], observation: null })
    expect(stationView(data, held, SR).flame).toEqual({ colours: [{ name: 'red', hex: '#D6283B' }], hidden: false })
    expect(stationView(data, held, SR).spectrum.map((seen) => seen.feature.id)).toEqual(['sr-460', 'sroh-orange', 'sroh-red'])
  })

  it('starts the looking again when the loop held is another one, and keeps it when it is the same', () => {
    const looked = after(dip(NA), hold(NA), look(NA, FLAME))
    expect(reduce(data, looked, hold(NA))).toBe(looked)
    const again = run(data, looked, [clean, dip(NA), hold(NA)])
    expect(again.stations[4]).toEqual({ held: [NA], looked: [], observation: null })
  })
})

describe('looking', () => {
  it('is at the flame or at a line or a band the hold shows, is stored once, and is refused before the loop is held', () => {
    expect(can(data, after(dip(CA)), look(CA, FLAME))).toBe('not-held')
    const held = after(clean, dip(CA), hold(CA))
    expect(looksOf(data, held.stations[1]!.held!)).toEqual([FLAME, 'ca-422', 'caoh-green', 'caoh-orange-red'])
    expect(can(data, held, look(CA, 'sroh-red'))).toBe('nothing-there')
    expect(can(data, held, look(CA, 'na-589'))).toBe('nothing-there')
    const looked = run(data, held, [look(CA, 'caoh-green'), look(CA, FLAME)])
    expect(looked.stations[1]!.looked).toEqual(['caoh-green', FLAME])
    expect(reduce(data, looked, look(CA, FLAME))).toBe(looked)
  })

  it("has more to look at on a loop that was not cleaned: the other salts' lines and bands, and sodium's", () => {
    const held = after(dip(BA), dip(CA), hold(CA))
    expect(looksOf(data, held.stations[1]!.held!)).toEqual([FLAME, 'ca-422', 'baoh-green', 'caoh-green', 'ba-553', 'na-589', 'caoh-orange-red'])
    expect(looksOpening(data, [CA], 'colour')).toEqual([FLAME])
    expect(looksOpening(data, [CA], 'range')).toEqual(looksOpening(data, [CA], 'kind'))
  })
})

describe('recording an observation', () => {
  it('needs the loop held, every answer one of its choices, and each question open', () => {
    expect(can(data, start(), record(CA))).toBe('not-held')
    const held = after(clean, dip(CA), hold(CA))
    expect(can(data, held, record(CA))).toBe('not-looked')
    const looked = run(data, held, looksOf(data, [CA]).map((at) => look(CA, at)))
    expect(can(data, looked, record(CA))).toBeNull()
    for (const observation of [{ colour: 'crimson', range: '600-650', kind: 'band' }, { colour: 'red', range: '600-640', kind: 'band' }, { colour: 'red', range: '600-650', kind: 'glow' }]) {
      expect(can(data, looked, record(CA, observation as never)), JSON.stringify(observation)).toBe('invalid-entry')
    }
    expect(can(data, looked, record('licl-0.1m', expectedObservation(data, CA)))).toBe('unknown-station')
  })

  it('says which answers are wrong, and takes any number of attempts, the last in place of the one before', () => {
    let state = run(data, start(), stationScript(data, BA).slice(0, -1))
    state = run(data, state, [record(BA, { colour: 'pale green', range: '570-600', kind: 'line' })])
    expect(stationView(data, state, BA)).toMatchObject({ counts: true, wrong: ['range', 'kind'], done: false })
    state = run(data, state, [record(BA, { colour: 'yellow', range: '475-570', kind: 'band' })])
    expect(stationView(data, state, BA)).toMatchObject({ wrong: ['colour'], done: false })
    state = run(data, state, [record(BA)])
    expect(stationView(data, state, BA)).toMatchObject({ wrong: [], done: true, observation: expectedObservation(data, BA) })
    // A station that was done is not done once a wrong observation takes the place of the right one.
    state = run(data, state, [record(BA, { colour: 'red', range: '475-570', kind: 'band' })])
    expect(stationView(data, state, BA).done).toBe(false)
    expect(wrongAnswers(data, BA, { colour: 'red', range: '475-570', kind: 'band' })).toEqual(['colour'])
  })

  it('stores with the observation what was on the loop when it was made, and judges it by that and not by the loop as it is now', () => {
    let state = run(data, start(), stationScript(data, K, [HANDLING]))
    expect(state.stations[3]!.observation).toEqual({ ...expectedObservation(data, K), loop: [HANDLING, K] })
    // Cleaning afterwards, and even holding a clean loop, does not make the old observation count.
    state = run(data, state, [clean, dip(K), hold(K)])
    expect(stationView(data, state, K)).toMatchObject({ counts: false, cause: { handled: true, carried: [] }, done: false })
    state = run(data, state, [...looksOf(data, [K]).map((at) => look(K, at)), record(K)])
    expect(stationView(data, state, K)).toMatchObject({ counts: true, done: true })
  })
})

describe('the mode', () => {
  it('can be changed at any time, and with it whether a dip is warned of and whether guidance is shown', () => {
    let state = after(dip(CA))
    expect(warnings(data, state, dip(SR))).toEqual([])
    state = reduce(data, state, { type: 'setMode', mode: 'guided' })
    expect(warnings(data, state, dip(SR))).toEqual(['loop-not-clean'])
    expect(stationView(data, state, SR).guidanceShown).toBe(true)
    expect(schema.safeParse(state).success).toBe(true)
  })
})

describe('the stored record', () => {
  const done = () => run(data, start(), [...data.salts.flatMap((salt) => stationScript(data, salt.id)), { type: 'answerClosing', choice: 'metal' }])
  const refuses = (edit: (state: FlameState) => void, from: FlameState = done()) => {
    const state: FlameState = JSON.parse(JSON.stringify(from))
    edit(state)
    return schema.safeParse(state).success === false
  }

  it('takes a finished lab back from JSON', () => {
    expect(schema.parse(JSON.parse(JSON.stringify(done())))).toEqual(done())
  })

  it('refuses a status the entries do not give', () => {
    expect(refuses((state) => void (state.status = 'in-progress'))).toBe(true)
    expect(refuses((state) => void (state.status = 'completed'), start())).toBe(true)
    expect(refuses((state) => void (state.closing = 'chloride'))).toBe(true)
    // An observation right in every answer, made with a loop that was not clean, completes nothing.
    expect(refuses((state) => void (state.stations[0]!.observation!.loop = [HANDLING, BA]))).toBe(true)
  })

  it('refuses what the reducer would not have stored', () => {
    expect(refuses((state) => void state.stations.pop())).toBe(true)
    expect(refuses((state) => void (state.loop = [CA, CA]))).toBe(true)
    expect(refuses((state) => void (state.loop = [CA, HANDLING]))).toBe(true)
    expect(refuses((state) => void (state.loop = ['licl-0.1m']))).toBe(true)
    expect(refuses((state) => void (state.stations[1]!.held = [SR]))).toBe(true)
    expect(refuses((state) => void state.stations[1]!.looked.push('sroh-red'))).toBe(true)
    expect(refuses((state) => void state.stations[1]!.looked.push(FLAME))).toBe(true)
    expect(refuses((state) => void (state.stations[1]!.observation!.colour = 'crimson'))).toBe(true)
    expect(refuses((state) => void (state.stations[1]!.observation!.loop = [SR]))).toBe(true)
    expect(refuses((state) => void (state.stations[1]!.held = null))).toBe(true)
    expect(refuses((state) => void (state.closing = 'the flame'))).toBe(true)
    expect(refuses((state) => void Object.assign(state, { seed: 1 }))).toBe(true)
    expect(refuses((state) => void Object.assign(state.stations[0]!, { done: true }))).toBe(true)
  })
})
