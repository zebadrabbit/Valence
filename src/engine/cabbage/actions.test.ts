import { describe, expect, it } from 'vitest'
import { THING_IDS } from '@/chem-data/cabbage/data'
import { can, reduce, type Action } from './actions'
import { CANNOT_SAY } from './model'
import { PINNED_MODEL as m } from './pinnedModel'
import { benchView, meterView, rackView, sampleView, unitView } from './select'
import { cabbageStateSchema, createLab, MAX_TRIES, sampleCounts, setupOf, unitQuestions, type CabbageState } from './state'
import { byEye, run, wholeLab, wholeSample, wholeScale, wholeThings, wholeUnit } from './testkit'

// Seed 1: vinegar 3.0, lemon juice 2.0, apple juice 3.7, ammonia 11.4, shampoo 6.8, conditioner 3.5, laundry
// detergent 10.1, laboratory detergent 9.5, mouthwash 6.8, antacid 9.0, aspirin 3.5, bleach 9.7, drain cleaner 12.2,
// Epsom salt 6.3.
const SEED = 1
const schema = cabbageStateSchema(m)
const through = (s: CabbageState) => schema.parse(JSON.parse(JSON.stringify(s)))
const lab = (mode: 'guided' | 'challenge' = 'challenge') => createLab(mode, SEED)
const withRack = (mode: 'guided' | 'challenge' = 'challenge') => wholeScale(m, lab(mode))
const blocked = (state: CabbageState, action: Action) => can(m, state, action)

describe('a new lab', () => {
  it('holds the seed, nothing done and no pH', () => {
    const state = lab('guided')
    expect(state).toMatchObject({ mode: 'guided', seed: 1, status: 'in-progress', probe: null, counted: [] })
    expect(Object.keys(state.samples)).toEqual([...THING_IDS])
    expect(JSON.stringify(state)).not.toMatch(/\d\d/)
    expect(schema.parse(state)).toEqual(state)
  })

  it('opens nothing but the rack', () => {
    const state = lab()
    expect(blocked(state, { type: 'fillRack' })).toBeNull()
    expect(blocked(state, { type: 'lookRack' })).toBe('rack-not-made')
    expect(blocked(state, { type: 'answerScale', question: 'neutral', is: 'blue' })).toBe('not-looked')
    expect(blocked(state, { type: 'addIndicator', thing: 'vinegar' })).toBe('rack-not-made')
    expect(blocked(state, { type: 'answerUnit', question: 0, answer: { more: 0, power: 1 } })).toBe('not-enough-count')
    expect(blocked(state, { type: 'checkUnit' })).toBe('not-enough-count')
    expect(blocked(state, { type: 'rinse' })).toBe('already-rinsed')
    expect(reduce(m, state, { type: 'lookRack' })).toBe(state)
  })
})

describe('the scale', () => {
  it('shows thirteen clear tubes with no colour, and the twelve colours once the indicator is in', () => {
    expect(new Set(rackView(m, lab()).tubes.map((tube) => tube.shows.liquid!.colour))).toEqual(new Set(['colourless']))
    const state = run(m, lab(), [{ type: 'fillRack' }])
    expect(rackView(m, state).tubes.map((tube) => `${tube.ph} ${tube.shows.liquid!.colour}`)).toEqual(['1 red', '2 dark pink', '3 rose', '4 lavender', '5 purple', '6 blue-violet', '7 dark blue', '8 blue', '9 teal', '10 emerald', '11 greenish-yellow', '12 greenish-yellow', '13 yellow'])
    expect(blocked(state, { type: 'fillRack' })).toBe('rack-made')
  })

  it('opens its questions once the rack has been looked along, and takes only an answer among the choices', () => {
    const state = run(m, lab(), [{ type: 'fillRack' }, { type: 'lookRack' }])
    expect(rackView(m, state)).toMatchObject({ answersOpen: true, outcome: { state: 'open' } })
    expect(blocked(state, { type: 'lookRack' })).toBe('already-looked')
    expect(blocked(state, { type: 'answerScale', question: 'neutral', is: 'orange' })).toBe('not-a-choice')
    expect(blocked(state, { type: 'answerScale', question: 'same-pair', is: 13 })).toBe('not-a-choice')
    expect(blocked(state, { type: 'answerScale', question: 'same-pair', is: 'red' })).toBe('not-a-choice')
    expect(blocked(state, { type: 'checkScale' })).toBe('not-all-answered')
  })

  it('in Guided refuses an answer that is not right, marks each as it is given, and checks by itself', () => {
    let state = run(m, lab('guided'), [{ type: 'fillRack' }, { type: 'lookRack' }])
    expect(blocked(state, { type: 'answerScale', question: 'acid-end', is: 'rose' })).toBe('not-right')
    state = run(m, state, [{ type: 'answerScale', question: 'acid-end', is: 'red' }])
    expect(rackView(m, state).questions.map((q) => q.right)).toEqual([true, null, null])
    state = run(m, state, [{ type: 'answerScale', question: 'neutral', is: 'dark blue' }, { type: 'answerScale', question: 'same-pair', is: 11 }])
    expect(rackView(m, state)).toMatchObject({ outcome: { state: 'counts' }, notesShown: true, answersOpen: false })
    expect(blocked(state, { type: 'checkScale' })).toBe('checked')
    expect(blocked(state, { type: 'againScale' })).toBe('counts-already')
  })

  it('in Challenge records what it is given, marks nothing until it is checked, and can be set up again', () => {
    let state = wholeScale(m, lab(), { wrong: true, check: false })
    expect(rackView(m, state)).toMatchObject({ outcome: { state: 'to-check' }, notesShown: false })
    expect(rackView(m, state).questions.map((q) => q.right)).toEqual([null, null, null])
    expect(blocked(state, { type: 'againScale' })).toBe('nothing-to-repeat')
    state = run(m, state, [{ type: 'checkScale' }])
    expect(rackView(m, state).questions.map((q) => q.right)).toEqual([true, false, true])
    expect(rackView(m, state)).toMatchObject({ outcome: { state: 'does-not-count' }, answersOpen: false })
    expect(blocked(state, { type: 'answerScale', question: 'neutral', is: 'dark blue' })).toBe('checked')
    state = run(m, state, [{ type: 'againScale' }])
    expect(rackView(m, state)).toMatchObject({ tries: 1, indicator: true, looked: true, answersOpen: true })
    expect(benchView(m, wholeScale(m, lab())).scaleDone).toBe(true)
  })
})

describe('a sample', () => {
  it('goes in order: the indicator, a look, the estimate with acid, neutral or basic, then the meter', () => {
    let state = withRack()
    const thing = 'vinegar'
    expect(blocked(state, { type: 'look', thing })).toBe('no-indicator')
    expect(sampleView(m, state, thing).shows.liquid).toEqual({ colour: 'colourless', cloudy: false, microlitres: 3000 })
    state = run(m, state, [{ type: 'addIndicator', thing }])
    expect(sampleView(m, state, thing).shows.liquid).toEqual({ colour: 'rose', cloudy: false, microlitres: 3500 })
    expect(blocked(state, { type: 'addIndicator', thing })).toBe('indicator-in')
    expect(blocked(state, { type: 'estimate', thing, is: 3 })).toBe('not-looked')
    state = run(m, state, [{ type: 'look', thing }])
    expect(sampleView(m, state, thing)).toMatchObject({ estimateOpen: true, classAsked: false, readOpen: false })
    expect(blocked(state, { type: 'classify', thing, is: 'acid' })).toBe('no-estimate')
    expect(blocked(state, { type: 'read', thing })).toBe('no-estimate')
    expect(blocked(state, { type: 'estimate', thing, is: 14 })).toBe('not-a-choice')
    state = run(m, state, [{ type: 'estimate', thing, is: 3 }])
    expect(blocked(state, { type: 'read', thing })).toBe('no-class')
    expect(blocked(state, { type: 'classify', thing, is: 'sour' as never })).toBe('not-a-choice')
    state = run(m, state, [{ type: 'classify', thing, is: 'acid' }])
    expect(sampleView(m, state, thing)).toMatchObject({ classAsked: true, readOpen: true, reading: null, outcome: { state: 'open' } })
    expect(blocked(state, { type: 'checkSample', thing })).toBe('not-read')
    state = run(m, state, [{ type: 'read', thing }])
    expect(sampleView(m, state, thing)).toMatchObject({ reading: { tenths: 30, unrinsed: null }, estimateOpen: false, readOpen: false, outcome: { state: 'to-check' } })
    expect(blocked(state, { type: 'estimate', thing, is: 4 })).toBe('answers-fixed')
    expect(blocked(state, { type: 'classify', thing, is: 'basic' })).toBe('answers-fixed')
    expect(blocked(state, { type: 'read', thing })).toBe('probe-still-in')
    state = run(m, state, [{ type: 'checkSample', thing }])
    expect(sampleView(m, state, thing)).toMatchObject({ outcome: { state: 'counts' }, reasons: [], estimateRight: true, classRight: true, reading: { tenths: 30, unrinsed: false }, notesShown: true })
    expect(state.counted).toEqual(['vinegar'])
    expect(blocked(state, { type: 'again', thing })).toBe('counts-already')
    expect(blocked(state, { type: 'checkSample', thing })).toBe('checked')
  })

  it('refuses a thing that is not on the bench', () => {
    expect(blocked(withRack(), { type: 'addIndicator', thing: 'buffered-aspirin' as never })).toBe('unknown-thing')
  })

  it('lets the estimate be changed until the meter is read, and drops acid, neutral or basic where the indicator is said not to say', () => {
    let state = run(m, withRack(), [{ type: 'addIndicator', thing: 'shampoo' }, { type: 'look', thing: 'shampoo' }, { type: 'estimate', thing: 'shampoo', is: 5 }, { type: 'classify', thing: 'shampoo', is: 'acid' }, { type: 'estimate', thing: 'shampoo', is: 7 }])
    expect(state.samples.shampoo).toMatchObject({ estimate: 7, is: 'acid' })
    state = run(m, state, [{ type: 'estimate', thing: 'shampoo', is: CANNOT_SAY }])
    expect(state.samples.shampoo).toMatchObject({ estimate: CANNOT_SAY, is: null })
    expect(blocked(state, { type: 'classify', thing: 'shampoo', is: 'neutral' })).toBe('class-not-asked')
    expect(sampleView(m, state, 'shampoo')).toMatchObject({ classAsked: false, readOpen: true })
  })

  it('counts an estimate within one unit of the meter, and not one farther off; acid, neutral or basic is held to the meter too', () => {
    // Shampoo reads 6.8 and shows dark blue, the colour of the pH 7 buffer.
    const counts = (estimate: number, is: 'acid' | 'neutral' | 'basic') => sampleView(m, wholeSample(m, withRack(), 'shampoo', { estimate, is }), 'shampoo')
    expect(counts(7, 'neutral')).toMatchObject({ outcome: { state: 'counts' } })
    expect(counts(6, 'neutral')).toMatchObject({ outcome: { state: 'counts' } })
    expect(counts(5, 'neutral')).toMatchObject({ outcome: { state: 'does-not-count' }, reasons: ['estimate-off'], estimateRight: false, classRight: true })
    expect(counts(7, 'acid')).toMatchObject({ outcome: { state: 'does-not-count' }, reasons: ['class-wrong'], estimateRight: true, classRight: false })
    expect(counts(9, 'basic')).toMatchObject({ reasons: ['estimate-off', 'class-wrong'] })
  })

  it('takes "the indicator cannot say" as right for bleach alone, and asks bleach for no acid, neutral or basic', () => {
    const bleach = wholeSample(m, withRack(), 'bleach')
    expect(bleach.samples.bleach).toMatchObject({ estimate: CANNOT_SAY, is: null })
    expect(sampleView(m, bleach, 'bleach')).toMatchObject({ outcome: { state: 'counts' }, reading: { tenths: 97 }, classRight: null })
    expect(sampleView(m, bleach, 'bleach').shows.liquid!.colour).toBe('colourless')
    expect(sampleView(m, wholeSample(m, withRack(), 'bleach', { estimate: 10, is: 'basic' }), 'bleach')).toMatchObject({ reasons: ['estimate-off'], classRight: null })
    expect(sampleView(m, wholeSample(m, withRack(), 'vinegar', { estimate: CANNOT_SAY }), 'vinegar')).toMatchObject({ reasons: ['estimate-off'] })
  })

  it('can be set up again in a fresh tube when it does not count or is left part done, and not before it is begun', () => {
    let state = wholeSample(m, withRack(), 'vinegar', { estimate: 7, is: 'neutral' })
    expect(blocked(state, { type: 'again', thing: 'lemon-juice' })).toBe('nothing-to-repeat')
    state = run(m, state, [{ type: 'again', thing: 'vinegar' }])
    expect(state.samples.vinegar).toEqual({ tries: 1, indicator: false, looked: false, estimate: null, is: null, warned: false, reading: null, checked: false })
    expect(sampleView(m, wholeSample(m, state, 'vinegar'), 'vinegar')).toMatchObject({ outcome: { state: 'counts' }, tries: 1 })
    const part = run(m, withRack(), [{ type: 'addIndicator', thing: 'aspirin' }, { type: 'again', thing: 'aspirin' }])
    expect(part.samples.aspirin.tries).toBe(1)
    let many = withRack()
    for (let i = 0; i < MAX_TRIES + 3; i++) many = run(m, many, [{ type: 'addIndicator', thing: 'aspirin' }, { type: 'again', thing: 'aspirin' }], through)
    expect(many.samples.aspirin.tries).toBe(MAX_TRIES)
  })
})

describe('the probe', () => {
  it('starts rinsed, is left in the last thing read, and is rinsed with distilled water', () => {
    let state = withRack()
    expect(meterView(state)).toEqual({ rinsed: true, lastIn: null })
    state = wholeSample(m, state, 'vinegar')
    expect(meterView(state)).toEqual({ rinsed: false, lastIn: 'vinegar' })
    state = run(m, state, [{ type: 'rinse' }])
    expect(meterView(state)).toEqual({ rinsed: true, lastIn: null })
    expect(reduce(m, state, { type: 'rinse' })).toBe(state)
  })

  it('unrinsed, reads part of the way toward the last sample, and the sample does not count: Challenge names the cause at the check', () => {
    // Vinegar reads 3.0 and the drain cleaner 12.2: a fifth of the way from one to the other is 1.8.
    let state = wholeSample(m, withRack(), 'vinegar')
    state = wholeSample(m, state, 'drain-cleaner', { rinse: false, check: false })
    expect(sampleView(m, state, 'drain-cleaner')).toMatchObject({ reading: { tenths: 104, unrinsed: null }, warning: false, outcome: { state: 'to-check' } })
    state = run(m, state, [{ type: 'checkSample', thing: 'drain-cleaner' }])
    expect(sampleView(m, state, 'drain-cleaner')).toMatchObject({ reading: { tenths: 104, unrinsed: true }, outcome: { state: 'does-not-count' }, reasons: ['probe-unrinsed'], estimateRight: true })
    expect(state.counted).toEqual(['vinegar'])
    expect(sampleView(m, wholeSample(m, run(m, state, [{ type: 'again', thing: 'drain-cleaner' }]), 'drain-cleaner'), 'drain-cleaner')).toMatchObject({ reading: { tenths: 122, unrinsed: false }, outcome: { state: 'counts' } })
  })

  it('unrinsed, can be rinsed and the meter read again before the check: the last reading stands', () => {
    let state = wholeSample(m, wholeSample(m, withRack(), 'vinegar'), 'drain-cleaner', { rinse: false, check: false })
    state = run(m, state, [{ type: 'rinse' }, { type: 'read', thing: 'drain-cleaner' }, { type: 'checkSample', thing: 'drain-cleaner' }])
    expect(sampleView(m, state, 'drain-cleaner')).toMatchObject({ reading: { tenths: 122, unrinsed: false }, outcome: { state: 'counts' } })
  })

  it('in Guided warns once before an unrinsed probe reads, reads nothing that time, and then says why the reading does not count', () => {
    let state = wholeSample(m, withRack('guided'), 'vinegar')
    const thing = 'drain-cleaner'
    state = run(m, state, [{ type: 'addIndicator', thing }, { type: 'look', thing }, { type: 'estimate', thing, is: 13 }, { type: 'classify', thing, is: 'basic' }, { type: 'read', thing }])
    expect(sampleView(m, state, thing)).toMatchObject({ warning: true, reading: null, readOpen: true, outcome: { state: 'open' } })
    expect(meterView(state)).toEqual({ rinsed: false, lastIn: 'vinegar' })
    const heeded = run(m, state, [{ type: 'rinse' }, { type: 'read', thing }])
    expect(sampleView(m, heeded, thing)).toMatchObject({ warning: false, reading: { tenths: 122, unrinsed: false }, outcome: { state: 'counts' } })
    state = run(m, state, [{ type: 'read', thing }])
    expect(sampleView(m, state, thing)).toMatchObject({ warning: false, reading: { tenths: 104, unrinsed: true }, outcome: { state: 'open' }, readOpen: false })
    expect(state.counted).toEqual(['vinegar'])
    state = run(m, state, [{ type: 'rinse' }, { type: 'read', thing }])
    expect(sampleView(m, state, thing)).toMatchObject({ reading: { tenths: 122, unrinsed: false }, outcome: { state: 'counts' } })
  })
})

describe('Guided', () => {
  it('refuses an estimate that is not within a unit and a wrong acid, neutral or basic, and checks a sample by itself', () => {
    let state = run(m, withRack('guided'), [{ type: 'addIndicator', thing: 'shampoo' }, { type: 'look', thing: 'shampoo' }])
    expect(blocked(state, { type: 'estimate', thing: 'shampoo', is: 5 })).toBe('estimate-off')
    expect(blocked(state, { type: 'estimate', thing: 'shampoo', is: CANNOT_SAY })).toBe('estimate-off')
    state = run(m, state, [{ type: 'estimate', thing: 'shampoo', is: 6 }])
    expect(sampleView(m, state, 'shampoo').estimateRight).toBe(true)
    expect(blocked(state, { type: 'classify', thing: 'shampoo', is: 'acid' })).toBe('class-wrong')
    state = run(m, state, [{ type: 'classify', thing: 'shampoo', is: 'neutral' }, { type: 'read', thing: 'shampoo' }])
    expect(sampleView(m, state, 'shampoo')).toMatchObject({ outcome: { state: 'counts' }, classRight: true })
    expect(blocked(run(m, state, [{ type: 'addIndicator', thing: 'bleach' }, { type: 'look', thing: 'bleach' }]), { type: 'estimate', thing: 'bleach', is: 10 })).toBe('estimate-off')
  })

  it('finds what Challenge recorded: a wrong estimate is put right before acid, neutral or basic is taken, and a sample read with it does not count', () => {
    let state = run(m, withRack(), [{ type: 'addIndicator', thing: 'shampoo' }, { type: 'look', thing: 'shampoo' }, { type: 'estimate', thing: 'shampoo', is: 3 }, { type: 'setMode', mode: 'guided' }])
    expect(sampleView(m, state, 'shampoo').estimateRight).toBe(false)
    expect(blocked(state, { type: 'classify', thing: 'shampoo', is: 'neutral' })).toBe('estimate-off')
    state = run(m, state, [{ type: 'setMode', mode: 'challenge' }, { type: 'classify', thing: 'shampoo', is: 'neutral' }, { type: 'setMode', mode: 'guided' }, { type: 'read', thing: 'shampoo' }])
    expect(sampleView(m, state, 'shampoo')).toMatchObject({ outcome: { state: 'does-not-count' }, reasons: ['estimate-off'] })
    expect(blocked(state, { type: 'again', thing: 'shampoo' })).toBeNull()
    expect(reduce(m, state, { type: 'setMode', mode: 'guided' })).toBe(state)
  })
})

describe('the count and the closing questions', () => {
  it('is done at eight, the rest being there to try', () => {
    const state = wholeThings(m, withRack())
    expect(benchView(m, state)).toMatchObject({ counted: 8, needed: 8, things: 14, thingsDone: true, scaleDone: true, unitDone: false, status: 'in-progress' })
    expect(state.counted).toEqual(['vinegar', 'lemon-juice', 'apple-juice', 'ammonia', 'shampoo', 'conditioner', 'laundry-detergent', 'lab-detergent'])
    const more = wholeSample(m, state, 'epsom-salt')
    expect(more.counted).toHaveLength(9)
    expect(unitQuestions(m, more)).toEqual(unitQuestions(m, state))
  })

  it('draws two questions from the readings: the pair the fewest whole units apart, and of the rest the pair the most', () => {
    const state = wholeThings(m, withRack())
    // Vinegar 3.0 and lemon juice 2.0 are one unit apart; conditioner 3.5 and the laboratory detergent 9.5 are six.
    expect(unitView(m, state).questions.map((q) => q.items)).toEqual([
      [{ kind: 'thing', id: 'vinegar', tenths: 30 }, { kind: 'thing', id: 'lemon-juice', tenths: 20 }],
      [{ kind: 'thing', id: 'conditioner', tenths: 35 }, { kind: 'thing', id: 'lab-detergent', tenths: 95 }],
    ])
    expect(unitView(m, state)).toMatchObject({ open: true, answersOpen: true, powers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], outcome: { state: 'open' } })
    expect(unitView(m, withRack())).toMatchObject({ open: false, questions: [], answersOpen: false })
  })

  it('falls back on a pair of buffers where the readings hold one such pair, and on two where they hold none', () => {
    const setup = setupOf(m, lab())
    const one = { seed: SEED, counted: THING_IDS.filter((id) => ['vinegar', 'lemon-juice', 'apple-juice', 'ammonia', 'shampoo', 'laundry-detergent', 'mouthwash', 'antacid'].includes(id)) }
    expect(one.counted.map((id) => setup[id])).toEqual([30, 20, 37, 114, 68, 101, 68, 90])
    expect(unitQuestions(m, one)!.map((q) => [q.items.map((item) => (item.kind === 'thing' ? item.id : `pH ${item.ph}`)).join(' and '), q.units])).toEqual([['vinegar and lemon-juice', 1], ['lemon-juice and antacid', 7]])
    const single = { seed: SEED, counted: THING_IDS.filter((id) => ['lemon-juice', 'apple-juice', 'ammonia', 'shampoo', 'laundry-detergent', 'mouthwash', 'antacid', 'epsom-salt'].includes(id)) }
    expect(unitQuestions(m, single)!.map((q) => [q.items.map((item) => (item.kind === 'thing' ? item.id : `pH ${item.ph}`)).join(' and '), q.units])).toEqual([['lemon-juice and antacid', 7], ['pH 4 and pH 7', 3]])
    const none = { seed: SEED, counted: THING_IDS.filter((id) => ['vinegar', 'apple-juice', 'ammonia', 'shampoo', 'conditioner', 'laundry-detergent', 'mouthwash', 'aspirin'].includes(id)) }
    expect(unitQuestions(m, none)!.map((q) => q.items.map((item) => (item.kind === 'buffer' ? item.ph : item.id)))).toEqual([[4, 7], [9, 11]])
  })

  it('takes the one with the lower pH as holding more hydrogen ion, ten times for each unit: Guided as each is given', () => {
    let state = run(m, wholeThings(m, withRack()), [{ type: 'setMode', mode: 'guided' }])
    expect(blocked(state, { type: 'answerUnit', question: 0, answer: { more: 0, power: 1 } })).toBe('not-right')
    expect(blocked(state, { type: 'answerUnit', question: 0, answer: { more: 1, power: 2 } })).toBe('not-right')
    expect(blocked(state, { type: 'answerUnit', question: 0, answer: { more: 1, power: 13 } })).toBe('not-a-choice')
    expect(blocked(state, { type: 'answerUnit', question: 2 as never, answer: { more: 1, power: 1 } })).toBe('not-a-choice')
    state = run(m, state, [{ type: 'answerUnit', question: 0, answer: { more: 1, power: 1 } }])
    expect(unitView(m, state).questions.map((q) => q.right)).toEqual([true, null])
    state = run(m, state, [{ type: 'answerUnit', question: 1, answer: { more: 0, power: 6 } }])
    expect(unitView(m, state)).toMatchObject({ outcome: { state: 'counts' }, notesShown: true })
    expect(state.status).toBe('completed')
  })

  it('in Challenge marks nothing until it is checked, and can be set up again after a check that does not count', () => {
    let state = wholeUnit(m, wholeThings(m, withRack()), { wrong: true, check: false })
    expect(unitView(m, state).questions.map((q) => q.right)).toEqual([null, null])
    expect(blocked(state, { type: 'againUnit' })).toBe('nothing-to-repeat')
    state = run(m, state, [{ type: 'checkUnit' }])
    expect(unitView(m, state)).toMatchObject({ outcome: { state: 'does-not-count' }, answersOpen: false })
    expect(unitView(m, state).questions.map((q) => q.right)).toEqual([true, false])
    expect(state.status).toBe('in-progress')
    state = wholeUnit(m, run(m, state, [{ type: 'againUnit' }]))
    expect(unitView(m, state)).toMatchObject({ outcome: { state: 'counts' }, tries: 1 })
    expect(blocked(state, { type: 'againUnit' })).toBe('counts-already')
    expect(blocked(state, { type: 'checkUnit' })).toBe('checked')
  })

  it('completes the lab in either mode, and a completed lab still takes the things left over', () => {
    for (const mode of ['guided', 'challenge'] as const) {
      const state = wholeLab(m, lab(mode), through)
      expect(state.status, mode).toBe('completed')
      const more = wholeSample(m, state, 'epsom-salt', {}, through)
      expect(more.status).toBe('completed')
      expect(more.counted).toHaveLength(9)
    }
  })
})

describe('the stored record', () => {
  it('round-trips through JSON at every step of a careful lab', () => {
    const state = wholeLab(m, lab('challenge'), through)
    expect(schema.parse(JSON.parse(JSON.stringify(state)))).toEqual(state)
  })

  it('refuses a record the lab could not have made', () => {
    const state = wholeThings(m, withRack())
    const refuses = (edit: (s: CabbageState) => void) => {
      const copy: CabbageState = JSON.parse(JSON.stringify(state))
      edit(copy)
      return schema.safeParse(copy).success === false
    }
    expect(schema.safeParse(state).success).toBe(true)
    expect(refuses((s) => (s.status = 'completed'))).toBe(true)
    expect(refuses((s) => s.counted.pop())).toBe(true)
    expect(refuses((s) => s.counted.push('bleach'))).toBe(true)
    expect(refuses((s) => (s.samples.vinegar.reading = 'vinegar'))).toBe(true)
    expect(refuses((s) => (s.samples.bleach.looked = true))).toBe(true)
    expect(refuses((s) => (s.samples.bleach.estimate = 3))).toBe(true)
    expect(refuses((s) => (s.samples.vinegar.is = null))).toBe(true)
    expect(refuses((s) => (s.scale.indicator = false))).toBe(true)
    expect(refuses((s) => (s.scale.answers.neutral = 'orange'))).toBe(true)
    expect(refuses((s) => (s.scale.answers['same-pair'] = 13))).toBe(true)
    expect(refuses((s) => (s.unit.checked = true))).toBe(true)
    expect(refuses((s) => ((s as { ph?: number }).ph = 3))).toBe(true)
    expect(refuses((s) => (s.seed = -1))).toBe(true)
    const early: CabbageState = { ...lab(), unit: { tries: 0, answers: [{ more: 0, power: 1 }, null], checked: false } }
    expect(schema.safeParse(early).success).toBe(false)
  })

  it('keeps a sample that counts counting whatever is done after it', () => {
    const state = wholeLab(m, lab())
    const setup = setupOf(m, state)
    for (const id of state.counted) expect(sampleCounts(m, setup, id, state.samples[id])).toBe(true)
    expect(byEye(rackView(m, state), sampleView(m, state, 'ammonia'), true)).toBe(12)
  })
})
