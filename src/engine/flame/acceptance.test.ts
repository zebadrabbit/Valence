import { describe, expect, it } from 'vitest'
import { brightestOf, flameData as data, rangeId, rangeOf } from '@/chem-data/flame/data'
import sources from '@/chem-data/sources.json'
import { mulberry32 } from '../rng'
import { can, reduce, warnings, type Action } from './actions'
import { FLAME, QUESTIONS, choicesFor, expectedObservation, looksOf } from './check'
import { HANDLING, flameOf, isClean, spectrumOf } from './loop'
import { closingView, doneStations, stationView } from './select'
import { createLab, flameStateSchema, type FlameState } from './state'
import { run, stationScript } from './testkit'

// Spec 15.5, the flame test lab's acceptance list, on the engine and the stored record. The fifth item, the
// descriptions in words, is the wording module's (src/app/lab/flame/messages.test.ts).

const ids = data.salts.map((s) => s.id)
const [BA, CA, , K, NA, SR] = ids as [string, string, string, string, string, string]
const through = (state: FlameState): FlameState => JSON.parse(JSON.stringify(state))

describe('a clean loop', () => {
  it.each(data.salts.map((salt) => [salt.name, salt] as const))('gives %s its stored flame colour and its stored features and nothing else', (_name, salt) => {
    const loop = [salt.id]
    expect(isClean(loop, salt.id)).toBe(true)
    expect(flameOf(data, loop)).toEqual({ colours: [salt.flame.value], hidden: false })
    const seen = spectrumOf(data, loop)
    expect(seen.map((s) => s.feature).sort((a, b) => a.prominence - b.prominence)).toEqual(salt.features)
    expect(seen.every((s) => s.saltId === salt.id)).toBe(true)
    // Along the scale, shortest wavelength first, each inside the scale.
    expect(seen.map((s) => s.fromNm)).toEqual([...seen.map((s) => s.fromNm)].sort((a, b) => a - b))
    for (const s of seen) expect(s.fromNm >= data.scale.fromNm && s.toNm <= data.scale.toNm, s.feature.id).toBe(true)
  })

  it('gives no colour and nothing in the spectroscope when nothing is on it', () => {
    expect(flameOf(data, [])).toEqual({ colours: [], hidden: false })
    expect(spectrumOf(data, [])).toEqual([])
  })
})

describe('a loop that was not cleaned', () => {
  const sodium = data.salts.find((s) => s.id === NA)!

  it('gives the features of everything on it', () => {
    const seen = spectrumOf(data, [CA, SR])
    expect(seen.map((s) => s.feature.id).sort()).toEqual(['ca-422', 'caoh-green', 'caoh-orange-red', 'sr-460', 'sroh-orange', 'sroh-red'])
    expect(seen.map((s) => [s.feature.id, s.saltId]).filter(([, saltId]) => saltId === SR).length).toBe(3)
    // Along the scale by where each stands: barium's line near 554 nm is inside calcium's green band, a little short of its middle, and is counted before it.
    expect(spectrumOf(data, [BA, CA]).map((s) => s.feature.id)).toEqual(['ca-422', 'baoh-green', 'ba-553', 'caoh-green', 'caoh-orange-red'])
    for (const loop of [[BA, CA], [HANDLING, ...ids]]) {
      const middles = spectrumOf(data, loop).map((s) => (s.fromNm + s.toNm) / 2)
      expect(middles).toEqual([...middles].sort((a, b) => a - b))
    }
    // Each salt's flame colour is named, in the order the salts came onto the loop: the model's rule for a flame with no sodium in it.
    expect(flameOf(data, [CA, SR]).colours.map((c) => c.name)).toEqual(['orange-red', 'red'])
    expect(flameOf(data, [SR, CA])).toEqual({ colours: [{ name: 'red', hex: '#D6283B' }, { name: 'orange-red', hex: '#E8602C' }], hidden: false })
  })

  it("is sodium's yellow in the flame whenever sodium is on it, with every salt's lines and bands still in the spectroscope", () => {
    for (const loop of [[NA, CA], [CA, NA], [HANDLING, CA], [HANDLING, K, BA]]) {
      expect(flameOf(data, loop), loop.join()).toEqual({ colours: [sodium.flame.value], hidden: true })
      const seen = spectrumOf(data, loop).map((s) => s.feature.id)
      expect(seen, loop.join()).toContain('na-589')
      for (const id of loop.filter((entry) => entry !== HANDLING)) for (const feature of data.salts.find((s) => s.id === id)!.features) expect(seen, loop.join()).toContain(feature.id)
    }
    // Sodium alone hides nothing: handled and dipped in sodium chloride, the loop shows sodium once.
    expect(flameOf(data, [HANDLING])).toEqual({ colours: [sodium.flame.value], hidden: false })
    expect(spectrumOf(data, [HANDLING, NA]).map((s) => s.feature.id)).toEqual(['na-589'])
  })

  it('shows nothing of the handling trace where the model is told that it does not show', () => {
    const quiet = { ...data, parameters: { ...data.parameters, handlingTraceShows: { ...data.parameters.handlingTraceShows, value: false } } }
    expect(flameOf(quiet, [HANDLING, CA]).colours.map((c) => c.name)).toEqual(['orange-red'])
    expect(spectrumOf(quiet, [HANDLING]).length).toBe(0)
    // It is still not a clean loop.
    expect(isClean([HANDLING, CA], CA)).toBe(false)
  })

  it.each([
    ['handled and never cleaned', [{ type: 'dipLoop', stationId: CA }], { handled: true, carried: [] }],
    ['dipped in another well first', [{ type: 'cleanLoop' }, { type: 'dipLoop', stationId: SR }, { type: 'dipLoop', stationId: CA }], { handled: false, carried: [SR] }],
    ['handled, and dipped in two other wells first', [{ type: 'dipLoop', stationId: BA }, { type: 'dipLoop', stationId: K }, { type: 'dipLoop', stationId: CA }], { handled: true, carried: [BA, K] }],
  ] as [string, Action[], { handled: boolean; carried: string[] }][])('makes an observation that does not count, whatever was recorded, and names the cause: %s', (_name, before, cause) => {
    let state = run(data, createLab(data, 'challenge'), [...before, { type: 'holdInFlame', stationId: CA }])
    state = run(data, state, looksOf(data, state.loop).map((at): Action => ({ type: 'look', stationId: CA, at })))
    // The answers that are right for calcium on a clean loop.
    state = run(data, state, [{ type: 'recordObservation', stationId: CA, observation: expectedObservation(data, CA) }])
    const view = stationView(data, state, CA)
    expect(view).toMatchObject({ counts: false, cause, wrong: null, done: false })
    expect(doneStations(data, state)).toEqual([])
    // Done again with a clean loop, it counts.
    state = run(data, state, stationScript(data, CA))
    expect(stationView(data, state, CA)).toMatchObject({ counts: true, cause: null, wrong: [], done: true })
  })

  it('raises a warning in Guided before the dip, and none in Challenge; the dip can be made all the same', () => {
    const dip: Action = { type: 'dipLoop', stationId: CA }
    const guided = createLab(data, 'guided')
    expect(warnings(data, guided, dip)).toEqual(['loop-not-clean'])
    expect(warnings(data, createLab(data, 'challenge'), dip)).toEqual([])
    expect(can(data, guided, dip)).toBeNull()
    expect(reduce(data, guided, dip).loop).toEqual([HANDLING, CA])
    const cleaned = reduce(data, guided, { type: 'cleanLoop' })
    expect(warnings(data, cleaned, dip)).toEqual([])
    // Carrying this station's own salt is no reason to warn; carrying another's is.
    const dipped = reduce(data, cleaned, dip)
    expect(warnings(data, dipped, dip)).toEqual([])
    expect(warnings(data, dipped, { type: 'dipLoop', stationId: SR })).toEqual(['loop-not-clean'])
    for (const action of [{ type: 'cleanLoop' }, { type: 'holdInFlame', stationId: CA }] as Action[]) expect(warnings(data, reduce(data, guided, dip), action)).toEqual([])
  })
})

describe('every stored feature', () => {
  it('has a source that is listed, and a line has NIST\'s for its wavelength', () => {
    const known = new Set(sources.map((s) => s.id))
    for (const salt of data.salts) {
      for (const feature of salt.features) {
        expect(known.has(feature.sourceId), feature.id).toBe(true)
        if (feature.kind === 'line') expect(feature.wavelengthNm.sourceId, feature.id).toMatch(/^nist-asd-lines-/)
      }
    }
  })
})

describe('what is expected of an observation', () => {
  it('is the stored flame colour, the range that holds the brightest feature, and whether that is a line or a band', () => {
    expect(Object.fromEntries(ids.map((id) => [id, Object.values(expectedObservation(data, id)).join(', ')]))).toEqual({
      'bacl2-0.1m': 'pale green, 475-570, band',
      'cacl2-0.1m': 'orange-red, 600-650, band',
      'cucl2-0.1m': 'blue-green, 400-475, band',
      'kcl-0.1m': 'lilac, 700-780, line',
      'nacl-0.1m': 'yellow, 570-600, line',
      'srcl2-0.1m': 'red, 650-700, band',
    })
    for (const salt of data.salts) expect(expectedObservation(data, salt.id).range, salt.id).toBe(rangeId(rangeOf(data, brightestOf(salt))!))
  })

  it('is always among the choices, which stand in an order that gives no station its answer by its place', () => {
    expect(choicesFor(data, 'colour')).toEqual(['blue-green', 'lilac', 'orange-red', 'pale green', 'red', 'yellow'])
    expect(choicesFor(data, 'range')).toEqual(['400-475', '475-570', '570-600', '600-650', '650-700', '700-780'])
    expect(choicesFor(data, 'kind')).toEqual(['line', 'band'])
    for (const question of ['colour', 'range'] as const) {
      const places = ids.map((id) => choicesFor(data, question).indexOf(expectedObservation(data, id)[question]))
      expect(places.every((place) => place >= 0), question).toBe(true)
      expect(places.some((place, i) => place !== i), question).toBe(true)
    }
  })

  it('is not shown in Challenge until the learner has recorded an observation of their own that counts, and is there in Guided from the start', () => {
    const challenge = run(data, createLab(data, 'challenge'), stationScript(data, NA).slice(0, -1))
    const before = stationView(data, challenge, NA)
    expect(before).toMatchObject({ guidanceShown: false, expected: null, observation: null, wrong: null, counts: null })
    // Nothing the view holds before recording says what the answers are.
    const told = JSON.stringify({ ...before, flame: null, spectrum: null })
    for (const answer of Object.values(expectedObservation(data, NA))) expect(told).not.toContain(`"${answer}"`)
    const after = stationView(data, run(data, challenge, [{ type: 'recordObservation', stationId: NA, observation: { colour: 'red', range: '400-475', kind: 'band' } }]), NA)
    expect(after).toMatchObject({ guidanceShown: true, expected: expectedObservation(data, NA), wrong: ['colour', 'range', 'kind'] })
    expect(stationView(data, createLab(data, 'guided'), NA)).toMatchObject({ guidanceShown: true, expected: expectedObservation(data, NA) })
    // The closing question's answer is in no view at all.
    expect(JSON.stringify(closingView(data, challenge))).not.toContain(data.closing.answer.value)
  })

  it('is not handed over in Challenge by an observation that did not count: one made with a loop that was not clean, whatever it holds', () => {
    // The careless learner: the handled loop is never cleaned, everything it shows is looked at, and anything at all is recorded.
    const careless = run(data, createLab(data, 'challenge'), stationScript(data, CA, [HANDLING]))
    const view = stationView(data, careless, CA)
    expect(view).toMatchObject({ counts: false, guidanceShown: false, expected: null, wrong: null, done: false })
    // Nothing the view holds but what the loop showed, and what the learner recorded, says what the answers are.
    const told = JSON.stringify({ ...view, flame: null, spectrum: null, observation: null })
    for (const answer of Object.values(expectedObservation(data, CA))) expect(told).not.toContain(`"${answer}"`)
    // Done again with a clean loop, and wrong: that one counts, and the guidance comes.
    const again = run(data, careless, [...stationScript(data, CA).slice(0, -1), { type: 'recordObservation', stationId: CA, observation: { colour: 'red', range: '400-475', kind: 'line' } }])
    expect(stationView(data, again, CA)).toMatchObject({ counts: true, guidanceShown: true, expected: expectedObservation(data, CA) })
    // Guided has it whatever was on the loop.
    expect(stationView(data, reduce(data, careless, { type: 'setMode', mode: 'guided' }), CA)).toMatchObject({ counts: false, guidanceShown: true, expected: expectedObservation(data, CA) })
  })
})

describe('a whole lab', () => {
  const closing: Action = { type: 'answerClosing', choice: data.closing.answer.value }

  it.each(['guided', 'challenge'] as const)('runs to completion in %s through the reducer, with an unclean loop on the way, and comes back from JSON the same at every step', (mode) => {
    let state = createLab(data, mode)
    expect(through(state)).toEqual(state)
    // Barium first, with the loop as it was picked up: it does not count.
    state = run(data, state, stationScript(data, BA, state.loop), through)
    expect(stationView(data, state, BA)).toMatchObject({ counts: false, cause: { handled: true, carried: [] } })
    // Then calcium with no cleaning in between: barium and the handling trace are still on the loop.
    state = run(data, state, stationScript(data, CA, state.loop), through)
    expect(stationView(data, state, CA)).toMatchObject({ counts: false, cause: { handled: true, carried: [BA] } })
    expect(closingView(data, state).open).toBe(false)
    for (const id of ids) state = run(data, state, stationScript(data, id), through)
    expect(doneStations(data, state)).toEqual(ids)
    expect(state.status).toBe('in-progress')
    expect(closingView(data, state)).toEqual({ open: true, answer: null, correct: null })
    state = run(data, state, [{ type: 'answerClosing', choice: 'chloride' }], through)
    expect([state.status, closingView(data, state)]).toEqual(['in-progress', { open: true, answer: 'chloride', correct: false }])
    state = run(data, state, [closing], through)
    expect([state.status, closingView(data, state)]).toEqual(['completed', { open: true, answer: 'metal', correct: true }])
    expect(flameStateSchema(data).safeParse(through(state)).success).toBe(true)
  })

  it('is complete only when the six observations are correct, each made with a clean loop, and the closing question is answered correctly', () => {
    let state = createLab(data, 'challenge')
    for (const id of ids.slice(0, 5)) state = run(data, state, stationScript(data, id))
    expect(can(data, state, closing)).toBe('stations-not-done')
    // The sixth is right in every answer but made with the loop still carrying the fifth salt.
    state = run(data, state, stationScript(data, SR, state.loop))
    expect(can(data, state, closing)).toBe('stations-not-done')
    state = run(data, state, [...stationScript(data, SR), closing])
    expect(state.status).toBe('completed')
    // A completed lab takes nothing more but the mode.
    for (const action of [{ type: 'cleanLoop' }, { type: 'dipLoop', stationId: NA }, { type: 'holdInFlame', stationId: NA }, { type: 'look', stationId: NA, at: FLAME }, closing] as Action[]) expect(can(data, state, action), action.type).toBe('lab-completed')
    expect(reduce(data, state, { type: 'setMode', mode: 'guided' }).mode).toBe('guided')
  })
})

describe('no state a learner can reach leaves them unable to go on', () => {
  // Every action a page could send from a state: each kind, at every station, with every choice.
  const actionsFrom = (state: FlameState): Action[] => [
    { type: 'setMode', mode: 'guided' },
    { type: 'setMode', mode: 'challenge' },
    { type: 'cleanLoop' },
    ...ids.flatMap((stationId, i): Action[] => [
      { type: 'dipLoop', stationId },
      { type: 'holdInFlame', stationId },
      ...looksOf(data, state.stations[i]!.held ?? []).map((at): Action => ({ type: 'look', stationId, at })),
      ...choicesFor(data, 'colour').flatMap((colour) => choicesFor(data, 'range').slice(0, 3).map((range): Action => ({ type: 'recordObservation', stationId, observation: { colour, range, kind: 'band' } }))),
      { type: 'recordObservation', stationId, observation: expectedObservation(data, stationId) },
    ]),
    ...data.closing.choices.map((choice): Action => ({ type: 'answerClosing', choice })),
  ]
  /** What a careful learner does from any state: every station again from a clean loop, then the closing answer. */
  const finish = (state: FlameState) => run(data, state, [...ids.flatMap((id) => stationScript(data, id)), { type: 'answerClosing', choice: data.closing.answer.value }])

  it.each([1, 2, 3, 4, 5, 6, 7, 8])('after 400 actions taken as they come, allowed or not (seed %i), the lab is a state the schema takes and can still be completed', (seed) => {
    const random = mulberry32(seed)
    let state = createLab(data, seed % 2 === 0 ? 'guided' : 'challenge')
    const schema = flameStateSchema(data)
    for (let step = 0; step < 400 && state.status !== 'completed'; step++) {
      const possible = actionsFrom(state)
      const action = possible[Math.floor(random() * possible.length)]!
      const next = reduce(data, state, action)
      // An action that cannot be done changes nothing; one that can is stored as a state the schema takes.
      if (can(data, state, action) !== null) expect(next).toBe(state)
      const parsed = schema.safeParse(through(next))
      if (!parsed.success) throw new Error(`${action.type}: ${JSON.stringify(parsed.error.issues)}`)
      expect(parsed.data).toEqual(next)
      state = next
    }
    if (state.status !== 'completed') state = finish(state)
    expect(state.status).toBe('completed')
    expect(doneStations(data, state)).toEqual(ids)
  })

  it('from every station left half done, the same', () => {
    for (const id of ids) {
      const careless = stationScript(data, id, [HANDLING])
      for (let cut = 0; cut <= careless.length; cut++) {
        const state = run(data, createLab(data, 'challenge'), careless.slice(0, cut))
        expect(finish(state).status, `${id} after ${cut}`).toBe('completed')
      }
    }
  })

  it('has a question open as soon as what it asks about has been looked at: the flame for its colour, every line and band for the other two', () => {
    let state = run(data, createLab(data, 'challenge'), stationScript(data, SR).slice(0, 3))
    expect(stationView(data, state, SR).open).toEqual({ colour: false, range: false, kind: false })
    state = run(data, state, [{ type: 'look', stationId: SR, at: FLAME }])
    expect(stationView(data, state, SR).open).toEqual({ colour: true, range: false, kind: false })
    state = run(data, state, [{ type: 'look', stationId: SR, at: 'sroh-red' }, { type: 'look', stationId: SR, at: 'sroh-orange' }])
    expect(stationView(data, state, SR).open).toEqual({ colour: true, range: false, kind: false })
    expect(can(data, state, { type: 'recordObservation', stationId: SR, observation: expectedObservation(data, SR) })).toBe('not-looked')
    state = run(data, state, [{ type: 'look', stationId: SR, at: 'sr-460' }])
    expect(stationView(data, state, SR).open).toEqual(Object.fromEntries(QUESTIONS.map((q) => [q, true])))
  })
})
