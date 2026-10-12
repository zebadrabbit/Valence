import { describe, expect, it } from 'vitest'
import { LIQUID_IDS, PAIR_IDS, SOLID_TUBE_IDS } from '@/chem-data/mixing/data'
import { can, reduce, type Action } from './actions'
import { PINNED_MODEL as m } from './pinnedModel'
import { benchView, pairView, ruleView, solidTubeView, tubeView } from './select'
import { createLab, MAX_TRIES, type MixingState } from './state'
import { run, wholeLab, wholePair, wholePairs, wholeRule, wholeSolids, wholeSolidTube } from './testkit'

const OIL = 'water+vegetable-oil'
const VINEGAR = 'water+vinegar'
const lab = (mode: 'guided' | 'challenge' = 'challenge') => createLab(mode)
const blocked = (state: MixingState, action: Action) => can(m, state, action)
const upTo = (state: MixingState, tube: (typeof PAIR_IDS)[number], steps: number) =>
  run(m, state, ([{ type: 'pour', tube, more: tube.split('+')[0] as 'water' }, { type: 'shake', tube }, { type: 'stand', tube }, { type: 'look', tube }] as Action[]).slice(0, steps))

describe('a tube, step by step', () => {
  it('goes one way: in, shaken, stood, looked at, recorded; no step is done out of turn or twice', () => {
    let s = lab()
    expect([blocked(s, { type: 'shake', tube: OIL }), blocked(s, { type: 'stand', tube: OIL }), blocked(s, { type: 'look', tube: OIL }), blocked(s, { type: 'again', tube: OIL })]).toEqual(['nothing-in', 'nothing-in', 'nothing-in', 'nothing-to-repeat'])
    s = upTo(s, OIL, 1)
    expect(pairView(m, s, OIL)).toMatchObject({ stage: 'in', more: 'water', looked: false, formOpen: false })
    expect([blocked(s, { type: 'pour', tube: OIL, more: 'water' }), blocked(s, { type: 'stand', tube: OIL }), blocked(s, { type: 'look', tube: OIL })]).toEqual(['already-in', 'not-shaken', 'not-stood'])
    s = upTo(s, OIL, 2)
    expect([pairView(m, s, OIL).stage, blocked(s, { type: 'shake', tube: OIL }), blocked(s, { type: 'look', tube: OIL }), blocked(s, { type: 'sayLayers', tube: OIL, is: 'two' })]).toEqual(['shaken', 'already-shaken', 'not-stood', 'not-looked'])
    s = upTo(s, OIL, 3)
    expect([pairView(m, s, OIL).stage, blocked(s, { type: 'stand', tube: OIL }), blocked(s, { type: 'sayLayers', tube: OIL, is: 'two' }), blocked(s, { type: 'check', tube: OIL })]).toEqual(['stood', 'already-stood', 'not-looked', 'not-looked'])
    s = upTo(s, OIL, 4)
    expect([pairView(m, s, OIL).formOpen, blocked(s, { type: 'look', tube: OIL }), blocked(s, { type: 'sayTop', tube: OIL, is: 'water' }), blocked(s, { type: 'check', tube: OIL })]).toEqual([true, 'already-looked', 'top-not-asked', 'not-all-recorded'])
  })

  it('takes either liquid of the pair as the one there is more of, and no other', () => {
    expect(blocked(lab(), { type: 'pour', tube: OIL, more: 'vinegar' })).toBe('not-a-choice')
    expect(pairView(m, reduce(m, lab(), { type: 'pour', tube: OIL, more: 'vegetable-oil' }), OIL).more).toBe('vegetable-oil')
  })

  it('refuses a tube the bench does not offer, a tube of the other kind, and a choice that is none', () => {
    const s = upTo(lab(), OIL, 4)
    expect(blocked(s, { type: 'shake', tube: 'rubbing-alcohol+mineral-oil' as typeof OIL })).toBe('unknown-tube')
    expect(blocked(s, { type: 'pour', tube: 'salt-in-water' as typeof OIL, more: 'water' })).toBe('unknown-tube')
    expect(blocked(s, { type: 'add', tube: OIL as unknown as 'salt-in-water' })).toBe('unknown-tube')
    expect(blocked(s, { type: 'saySolid', tube: OIL as unknown as 'salt-in-water', is: 'gone' })).toBe('unknown-tube')
    expect(blocked(s, { type: 'sayLayers', tube: OIL, is: 'three' as 'two' })).toBe('not-a-choice')
    expect(blocked(reduce(m, s, { type: 'sayLayers', tube: OIL, is: 'two' }), { type: 'sayTop', tube: OIL, is: 'vinegar' })).toBe('not-a-choice')
    const solid = run(m, lab(), [{ type: 'add', tube: 'salt-in-water' }, { type: 'shake', tube: 'salt-in-water' }, { type: 'stand', tube: 'salt-in-water' }, { type: 'look', tube: 'salt-in-water' }])
    expect(blocked(solid, { type: 'saySolid', tube: 'salt-in-water', is: 'floating' as 'gone' })).toBe('not-a-choice')
    expect(blocked(solid, { type: 'add', tube: 'salt-in-water' })).toBe('already-in')
  })

  it('returns the very same state for an action that cannot be done', () => {
    const s = lab()
    expect(reduce(m, s, { type: 'shake', tube: OIL })).toBe(s)
    expect(reduce(m, s, { type: 'setMode', mode: 'challenge' })).toBe(s)
  })
})

describe('Challenge', () => {
  it('records whatever it is given, lets it be changed, and judges nothing until the tube is checked', () => {
    let s = run(m, upTo(lab(), OIL, 4), [{ type: 'sayLayers', tube: OIL, is: 'one' }])
    expect(pairView(m, s, OIL)).toMatchObject({ layers: 'one', topAsked: false, layersRight: null, outcome: { state: 'to-check' }, notesShown: false })
    s = run(m, s, [{ type: 'sayLayers', tube: OIL, is: 'two' }])
    expect(pairView(m, s, OIL)).toMatchObject({ layers: 'two', topAsked: true, top: null, outcome: { state: 'open' } })
    s = run(m, s, [{ type: 'sayTop', tube: OIL, is: 'water' }])
    expect(pairView(m, s, OIL)).toMatchObject({ top: 'water', layersRight: null, topRight: null, outcome: { state: 'to-check' } })
    s = run(m, s, [{ type: 'check', tube: OIL }])
    expect(pairView(m, s, OIL)).toMatchObject({ layersRight: true, topRight: false, outcome: { state: 'does-not-count' }, reasons: ['top-wrong'], notesShown: false, formOpen: false })
    expect([blocked(s, { type: 'sayTop', tube: OIL, is: 'vegetable-oil' }), blocked(s, { type: 'check', tube: OIL })]).toEqual(['checked', 'checked'])
  })

  it('drops which liquid is on top where one layer is then recorded', () => {
    const s = run(m, upTo(lab(), OIL, 4), [{ type: 'sayLayers', tube: OIL, is: 'two' }, { type: 'sayTop', tube: OIL, is: 'water' }, { type: 'sayLayers', tube: OIL, is: 'one' }])
    expect(s.pairs[OIL]).toMatchObject({ layers: 'one', top: null })
  })

  it('names one cause where a tube does not count: the layers, or the liquid on top, or the solid', () => {
    expect(pairView(m, wholePair(m, lab(), OIL, { wrong: true }), OIL).reasons).toEqual(['layers-wrong'])
    // Two layers recorded of a pair that mixes: the layers are the cause, and the liquid named on top is not judged.
    expect(pairView(m, wholePair(m, lab(), VINEGAR, { wrong: true }), VINEGAR)).toMatchObject({ reasons: ['layers-wrong'], layersRight: false, topRight: null })
    expect(solidTubeView(m, wholeSolidTube(m, lab(), 'salt-in-mineral-oil', { wrong: true }), 'salt-in-mineral-oil')).toMatchObject({ reasons: ['solid-wrong'], seenRight: false, outcome: { state: 'does-not-count' } })
  })

  it('sets a tube that does not count up again, fresh, and never one that counts', () => {
    const wrong = wholePair(m, lab(), OIL, { wrong: true })
    const fresh = reduce(m, wrong, { type: 'again', tube: OIL })
    expect(fresh.pairs[OIL]).toEqual({ tries: 1, more: null, shaken: false, stood: false, looked: false, layers: null, top: null, checked: false })
    expect(pairView(m, wholePair(m, fresh, OIL, { more: 'vegetable-oil' }), OIL)).toMatchObject({ outcome: { state: 'counts' }, tries: 1, more: 'vegetable-oil', notesShown: true })
    expect(blocked(wholePair(m, lab(), OIL), { type: 'again', tube: OIL })).toBe('counts-already')
    // A tube left part done can be set up again too, which is how the other liquid is made the one there is more of.
    expect(reduce(m, upTo(lab(), OIL, 2), { type: 'again', tube: OIL }).pairs[OIL].tries).toBe(1)
    let many = lab()
    for (let i = 0; i < MAX_TRIES + 3; i++) many = reduce(m, upTo(many, OIL, 1), { type: 'again', tube: OIL })
    expect(many.pairs[OIL].tries).toBe(MAX_TRIES)
  })
})

describe('Guided', () => {
  it('refuses an answer that is not right, records one that is, and checks the tube by itself', () => {
    const looked = upTo(lab('guided'), OIL, 4)
    expect(blocked(looked, { type: 'sayLayers', tube: OIL, is: 'one' })).toBe('not-right')
    const two = reduce(m, looked, { type: 'sayLayers', tube: OIL, is: 'two' })
    expect(pairView(m, two, OIL)).toMatchObject({ layers: 'two', layersRight: true, topAsked: true, outcome: { state: 'open' } })
    expect(blocked(two, { type: 'sayTop', tube: OIL, is: 'water' })).toBe('not-right')
    const done = reduce(m, two, { type: 'sayTop', tube: OIL, is: 'vegetable-oil' })
    expect(pairView(m, done, OIL)).toMatchObject({ topRight: true, outcome: { state: 'counts' }, notesShown: true })
    expect(done.pairs[OIL].checked).toBe(true)
  })

  it('checks a pair that mixes as soon as one layer is recorded, and a solid as soon as it is said', () => {
    const s = run(m, upTo(lab('guided'), VINEGAR, 4), [{ type: 'sayLayers', tube: VINEGAR, is: 'one' }])
    expect(pairView(m, s, VINEGAR).outcome).toEqual({ state: 'counts' })
    const solid = run(m, lab('guided'), [{ type: 'add', tube: 'sugar-in-water' }, { type: 'shake', tube: 'sugar-in-water' }, { type: 'stand', tube: 'sugar-in-water' }, { type: 'look', tube: 'sugar-in-water' }])
    expect(blocked(solid, { type: 'saySolid', tube: 'sugar-in-water', is: 'left' })).toBe('not-right')
    expect(solidTubeView(m, reduce(m, solid, { type: 'saySolid', tube: 'sugar-in-water', is: 'gone' }), 'sugar-in-water')).toMatchObject({ seen: 'gone', seenRight: true, outcome: { state: 'counts' } })
  })

  it('stores the same lab as Challenge does: it adds each check by itself where Challenge is asked for it', () => {
    expect({ ...wholeLab(m, lab('guided')), mode: 'challenge' }).toEqual(wholeLab(m, lab('challenge')))
  })

  it('checks nothing by itself over an answer Challenge took that is not right: it marks it, and sends the liquid on top back to the layers first', () => {
    // Two layers and a liquid on top, recorded in Challenge of a pair that mixes, and not checked.
    const taken = reduce(m, wholePair(m, lab(), VINEGAR, { wrong: true, check: false }), { type: 'setMode', mode: 'guided' })
    expect(pairView(m, taken, VINEGAR)).toMatchObject({ layersRight: false, topRight: null, outcome: { state: 'to-check' } })
    expect(blocked(taken, { type: 'sayTop', tube: VINEGAR, is: 'water' })).toBe('layers-first')
    expect(pairView(m, reduce(m, taken, { type: 'sayLayers', tube: VINEGAR, is: 'one' }), VINEGAR).outcome).toEqual({ state: 'counts' })
    // The check can still be asked for as it stands.
    expect(pairView(m, reduce(m, taken, { type: 'check', tube: VINEGAR }), VINEGAR).outcome).toEqual({ state: 'does-not-count' })
  })
})

describe('the parts', () => {
  it('finishes part 1 at six pairs that count and part 2 at six solids in liquids, with the rest there to try', () => {
    expect(benchView(m, lab())).toMatchObject({ pairsCounted: 0, pairsNeeded: 6, pairs: 9, solidsCounted: 0, solidsNeeded: 6, solidTubes: 8, pairsDone: false, solidsDone: false, ruleOpen: false, status: 'in-progress' })
    expect(benchView(m, wholePairs(m, lab(), 5)).pairsDone).toBe(false)
    const six = wholePairs(m, lab())
    expect(benchView(m, six)).toMatchObject({ pairsCounted: 6, pairsDone: true, ruleOpen: false })
    expect(benchView(m, wholeSolids(m, six, 5))).toMatchObject({ solidsDone: false, ruleOpen: false })
    const both = wholeSolids(m, six)
    expect(benchView(m, both)).toMatchObject({ solidsCounted: 6, solidsDone: true, ruleOpen: true, status: 'in-progress' })
    expect(benchView(m, both).countedTubes).toEqual([...PAIR_IDS.slice(0, 6), ...SOLID_TUBE_IDS.slice(0, 6)])
    // A tube that does not count does not count toward a part.
    expect(benchView(m, wholePair(m, wholePairs(m, lab(), 5), PAIR_IDS[5], { wrong: true })).pairsCounted).toBe(5)
    // The rest can be tried after the part is done, and after the lab is complete.
    const all = [...PAIR_IDS.slice(6), ...SOLID_TUBE_IDS.slice(6)].reduce((s, id) => (id.includes('+') ? wholePair(m, s, id as typeof OIL) : wholeSolidTube(m, s, id as 'salt-in-water')), wholeLab(m, lab()))
    expect(benchView(m, all)).toMatchObject({ pairsCounted: 9, solidsCounted: 8, status: 'completed' })
    for (const id of [...PAIR_IDS, ...SOLID_TUBE_IDS]) expect(tubeView(m, all, id).outcome, id).toEqual({ state: 'counts' })
  })

  it('opens part 3 only once the first two parts are done', () => {
    const early = wholePairs(m, lab())
    expect([blocked(early, { type: 'sort', liquid: 'water', family: 'water' }), blocked(early, { type: 'answer', question: 'grease', is: 'mixes' }), blocked(early, { type: 'checkRule' })]).toEqual(['parts-not-done', 'parts-not-done', 'parts-not-done'])
    expect(ruleView(m, early)).toMatchObject({ open: false, answersOpen: false, outcome: { state: 'open' } })
    expect(wholeRule(m, early)).toBe(early)
  })

  it('checks the sorting against the stored families, and the two answers, when Challenge asks', () => {
    const open = wholeSolids(m, wholePairs(m, lab()))
    expect([blocked(open, { type: 'sort', liquid: 'water', family: 'acid' as 'oil' }), blocked(open, { type: 'answer', question: 'grease', is: 'dissolves' }), blocked(open, { type: 'checkRule' }), blocked(open, { type: 'againRule' })]).toEqual(['not-a-choice', 'not-a-choice', 'not-all-recorded', 'nothing-to-repeat'])
    // Everything said to be like oil, and the two wrong answers.
    const wrong = run(m, open, [...LIQUID_IDS.map((liquid): Action => ({ type: 'sort', liquid, family: 'oil' })), { type: 'answer', question: 'grease', is: 'mixes' }, { type: 'answer', question: 'epsom-salt', is: 'dissolves' }])
    expect(ruleView(m, wrong)).toMatchObject({ outcome: { state: 'to-check' }, answersOpen: true })
    expect(ruleView(m, wrong).sorted.map((s) => s.right)).toEqual([null, null, null, null, null])
    const checked = reduce(m, wrong, { type: 'checkRule' })
    expect(ruleView(m, checked).sorted.map((s) => `${s.liquid}: ${s.right}`)).toEqual(['water: false', 'rubbing-alcohol: false', 'vinegar: false', 'vegetable-oil: true', 'mineral-oil: true'])
    expect(ruleView(m, checked)).toMatchObject({ outcome: { state: 'does-not-count' }, notesShown: false, answersOpen: false })
    expect(ruleView(m, checked).questions.map((q) => q.right)).toEqual([false, false])
    expect([blocked(checked, { type: 'sort', liquid: 'water', family: 'water' }), blocked(checked, { type: 'checkRule' })]).toEqual(['checked', 'checked'])
    const again = reduce(m, checked, { type: 'againRule' })
    expect(again.rule).toMatchObject({ tries: 1, checked: false, sorted: { water: null }, answers: { grease: null } })
    const done = wholeRule(m, again)
    expect(ruleView(m, done)).toMatchObject({ outcome: { state: 'counts' }, notesShown: true, tries: 1 })
    expect(done.status).toBe('completed')
    expect(blocked(done, { type: 'againRule' })).toBe('counts-already')
  })

  it('in Guided refuses a liquid sorted into the other family and an answer that is not right, and checks the part by itself', () => {
    const open = wholeSolids(m, wholePairs(m, lab('guided')))
    expect(blocked(open, { type: 'sort', liquid: 'vinegar', family: 'oil' })).toBe('not-right')
    expect(blocked(open, { type: 'sort', liquid: 'rubbing-alcohol', family: 'oil' })).toBe('not-right')
    expect(blocked(open, { type: 'answer', question: 'epsom-salt', is: 'dissolves' })).toBe('not-right')
    const one = reduce(m, open, { type: 'sort', liquid: 'vinegar', family: 'water' })
    expect(ruleView(m, one).sorted.find((s) => s.liquid === 'vinegar')).toEqual({ liquid: 'vinegar', family: 'water', right: true })
    const done = wholeRule(m, open)
    expect([done.rule.checked, done.status, ruleView(m, done).outcome.state]).toEqual([true, 'completed', 'counts'])
  })

  it('keeps a completed lab completed, whatever is done after', () => {
    const done = wholeLab(m, lab())
    const after = wholePair(m, wholePair(m, done, PAIR_IDS[8], { wrong: true }), PAIR_IDS[7], { check: false })
    expect(after.status).toBe('completed')
    expect(reduce(m, after, { type: 'setMode', mode: 'guided' }).status).toBe('completed')
  })
})
