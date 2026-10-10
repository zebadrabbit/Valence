import { describe, expect, it } from 'vitest'
import type { PartId } from '@/chem-data/cations/data'
import { can, mismatch, reduce, warnings, type Action } from './actions'
import { PINNED_MODEL as m } from './pinnedModel'
import { partView } from './select'
import { sampleOf } from './setup'
import { cationsStateSchema, createLab, currentRun, MAX_EVENTS, MAX_RUNS, type CationsState } from './state'
import { run, seen, wholeRun, workStep } from './testkit'

// Every action: when it can be done, what it does, and what the two modes make of it (spec 17.3). Seed 1 deals
// lead as its first unknown and lead with mercury(I) as its second.

const schema = cationsStateSchema(m)
const guided = () => createLab(1, 'guided')
const challenge = () => createLab(1, 'challenge')
const step = (state: CationsState, part: PartId) => {
  const view = partView(m, state, part)
  return view.steps.find((s) => s.id === view.step)!
}
const events = (state: CationsState, part: PartId) => currentRun(state, part).events.map((event) => event.t).join(' ')
const LOOKS: Action[] = [
  { type: 'look', part: 'unknown', at: 'liquid' },
  { type: 'look', part: 'unknown', at: 'bottom' },
]
const looks = (part: PartId): Action[] => LOOKS.map((action) => ({ ...action, part }) as Action)
const WHITE = { solid: 'white', liquid: 'colourless' }
const NONE = { solid: 'none', liquid: 'colourless' }

describe('a fresh run', () => {
  it('takes the reagent of step 1 and nothing else', () => {
    for (const state of [guided(), challenge()]) {
      for (const part of ['known', 'unknown'] as const) {
        expect(can(m, state, { type: 'add', part })).toBeNull()
        expect(can(m, state, { type: 'heat', part })).toBe('not-this-step')
        expect(can(m, state, { type: 'testLitmus', part })).toBe('not-this-step')
        expect(can(m, state, { type: 'centrifuge', part })).toBe('nothing-to-spin')
        expect(can(m, state, { type: 'pourOff', part })).toBe('check-first')
        expect(can(m, state, { type: 'look', part, at: 'liquid' })).toBe('add-first')
        expect(can(m, state, { type: 'observe', part, observation: WHITE })).toBe('add-first')
        expect(can(m, state, { type: 'checkStep', part })).toBe('observe-first')
        expect(can(m, state, { type: 'runAgain', part })).toBe('nothing-to-repeat')
      }
      expect(can(m, state, { type: 'nameIons', part: 'unknown', ions: ['lead'] })).toBe('steps-not-done')
      expect(can(m, state, { type: 'nameIons', part: 'known', ions: ['lead'] })).toBe('not-this-part')
      expect(can(m, state, { type: 'place', part: 'unknown', place: 'precipitate-solid', tile: 'silver-chloride' })).toBe('not-this-part')
      expect(can(m, state, { type: 'place', part: 'known', place: 'precipitate-solid', tile: 'silver-chloride' })).toBe('observe-first')
      expect(can(m, state, { type: 'add', part: 'neither' as PartId })).toBe('unknown-part')
      expect(can(m, state, { type: 'setMode', mode: 'challenge' })).toBeNull()
    }
  })

  it('is left the very same object by an action that cannot be done, and by a mode it already has', () => {
    const state = guided()
    expect(reduce(m, state, { type: 'pourOff', part: 'known' })).toBe(state)
    expect(reduce(m, state, { type: 'setMode', mode: 'guided' })).toBe(state)
    expect(reduce(m, state, { type: 'setMode', mode: 'challenge' })).toEqual({ ...state, mode: 'challenge' })
  })
})

describe('the looks and the observation', () => {
  it('open the observation only when both parts of the tube have been looked at, and store a look once', () => {
    let state = run(m, challenge(), [{ type: 'add', part: 'unknown' }])
    expect(can(m, state, { type: 'add', part: 'unknown' })).toBe('already-added')
    expect(can(m, state, { type: 'observe', part: 'unknown', observation: WHITE })).toBe('look-first')
    state = run(m, state, [LOOKS[0]!])
    expect(can(m, state, { type: 'observe', part: 'unknown', observation: WHITE })).toBe('look-first')
    // A second look at the same part can be made and changes nothing.
    expect(can(m, state, LOOKS[0]!)).toBeNull()
    expect(reduce(m, state, LOOKS[0]!)).toBe(state)
    state = run(m, state, [LOOKS[1]!])
    expect(step(state, 'unknown').looked).toEqual(['liquid', 'bottom'])
    expect(can(m, state, { type: 'observe', part: 'unknown', observation: WHITE })).toBeNull()
    expect(can(m, state, { type: 'look', part: 'unknown', at: 'top' as 'liquid' })).toBe('invalid-entry')
  })

  it('take only the choices of each question', () => {
    const state = run(m, challenge(), [{ type: 'add', part: 'unknown' }, ...LOOKS])
    for (const observation of [{ solid: 'blue', liquid: 'colourless' }, { solid: 'white', liquid: 'white' }, { solid: 'white' }, {}, null, undefined]) {
      expect(can(m, state, { type: 'observe', part: 'unknown', observation: observation as never }), JSON.stringify(observation)).toBe('invalid-entry')
    }
  })

  it('are emptied by anything that goes into the tube or heats it: the tube is looked at and recorded again', () => {
    // Step 2 of the unknown that holds lead alone: cold, part of the solid is left; hot, none.
    let state = workStep(m, challenge(), 'unknown')
    state = run(m, state, [{ type: 'add', part: 'unknown' }, ...LOOKS, { type: 'observe', part: 'unknown', observation: WHITE }])
    expect(step(state, 'unknown')).toMatchObject({ observation: WHITE, looked: ['liquid', 'bottom'], heated: false })
    state = run(m, state, [{ type: 'heat', part: 'unknown' }])
    expect(step(state, 'unknown')).toMatchObject({ observation: null, looked: [], heated: true })
    expect(can(m, state, { type: 'heat', part: 'unknown' })).toBe('already-heated')
    expect(can(m, state, { type: 'checkStep', part: 'unknown' })).toBe('observe-first')
  })

  it('keep what was recorded when the tube is centrifuged, and ask for the looks again', () => {
    let state = run(m, challenge(), [{ type: 'add', part: 'unknown' }, ...LOOKS, { type: 'observe', part: 'unknown', observation: WHITE }])
    expect(step(state, 'unknown').shows).toEqual({ liquid: { colour: 'colourless', cloudy: true, microlitres: 1700 }, solid: { colour: 'white', settled: false } })
    state = run(m, state, [{ type: 'centrifuge', part: 'unknown' }])
    expect(step(state, 'unknown')).toMatchObject({ observation: WHITE, looked: [] })
    expect(step(state, 'unknown').shows).toEqual({ liquid: { colour: 'colourless', cloudy: false, microlitres: 1700 }, solid: { colour: 'white', settled: true } })
    expect(can(m, state, { type: 'centrifuge', part: 'unknown' })).toBe('nothing-to-spin')
  })
})

describe('Guided', () => {
  it('refuses an observation that is not what the tube shows, says which part to look at again, and records nothing', () => {
    const state = run(m, guided(), [{ type: 'add', part: 'unknown' }, ...LOOKS])
    const wrong: [typeof WHITE, string[]][] = [
      [NONE, ['solid']],
      [{ solid: 'white', liquid: 'yellow to orange' }, ['liquid']],
      [{ solid: 'yellow', liquid: 'yellow to orange' }, ['solid', 'liquid']],
    ]
    for (const [observation, fields] of wrong) {
      expect(can(m, state, { type: 'observe', part: 'unknown', observation })).toBe('does-not-match')
      expect(mismatch(m, state, 'unknown', observation)).toEqual(fields)
      expect(reduce(m, state, { type: 'observe', part: 'unknown', observation })).toBe(state)
    }
    expect(mismatch(m, state, 'unknown', WHITE)).toEqual([])
  })

  it('checks a step of part 2 by itself as soon as what the tube shows is recorded', () => {
    const state = run(m, guided(), [{ type: 'add', part: 'unknown' }, ...LOOKS, { type: 'observe', part: 'unknown', observation: WHITE }])
    expect(events(state, 'unknown')).toBe('add look look observe check')
    expect(step(state, 'unknown')).toMatchObject({ checked: true, wrongFields: [] })
    expect(can(m, state, { type: 'checkStep', part: 'unknown' })).toBe('step-checked')
  })

  it('checks a step of part 1 once its places hold what belongs in them, and refuses a tile that does not belong', () => {
    let state = run(m, guided(), [{ type: 'add', part: 'known' }, ...looks('known'), { type: 'observe', part: 'known', observation: WHITE }])
    expect(step(state, 'known').checked).toBe(false)
    expect(can(m, state, { type: 'checkStep', part: 'known' })).toBe('places-empty')
    expect(can(m, state, { type: 'place', part: 'known', place: 'precipitate-solid', tile: 'silver-ion' })).toBe('wrong-place')
    expect(can(m, state, { type: 'place', part: 'known', place: 'extract-lead-solid', tile: 'silver-chloride' })).toBe('not-this-step')
    expect(can(m, state, { type: 'place', part: 'known', place: 'nowhere', tile: 'silver-chloride' })).toBe('no-such-place')
    expect(can(m, state, { type: 'place', part: 'known', place: 'precipitate-solid', tile: 'gold' })).toBe('no-such-tile')
    state = run(m, state, [{ type: 'place', part: 'known', place: 'precipitate-solid', tile: 'lead-chloride' }])
    expect(can(m, state, { type: 'place', part: 'known', place: 'precipitate-solid', tile: 'lead-chloride' })).toBe('already-placed')
    expect(can(m, state, { type: 'unplace', part: 'known', place: 'precipitate-solid', tile: 'silver-chloride' })).toBe('not-placed')
    // With one of three in, the place is not yet right: Guided will not check the step.
    expect(can(m, state, { type: 'checkStep', part: 'known' })).toBe('chart-not-right')
    state = run(m, state, [
      { type: 'place', part: 'known', place: 'precipitate-solid', tile: 'mercury-i-chloride' },
      { type: 'place', part: 'known', place: 'precipitate-solid', tile: 'silver-chloride' },
    ])
    expect(events(state, 'known')).toBe('add look look observe place place place check')
    expect(partView(m, state, 'known').chart!.places[0]).toMatchObject({ tiles: ['lead-chloride', 'mercury-i-chloride', 'silver-chloride'], right: true, open: false, slots: 3 })
  })

  it('is asked before each slip of technique, and Challenge is not', () => {
    const cloudy = (mode: 'guided' | 'challenge') => {
      const state = run(m, createLab(1, mode), [{ type: 'add', part: 'unknown' }, ...LOOKS, { type: 'observe', part: 'unknown', observation: WHITE }])
      return mode === 'challenge' ? run(m, state, [{ type: 'checkStep', part: 'unknown' }]) : state
    }
    expect(warnings(m, cloudy('guided'), { type: 'pourOff', part: 'unknown' })).toEqual(['not-centrifuged'])
    expect(warnings(m, cloudy('challenge'), { type: 'pourOff', part: 'unknown' })).toEqual([])
    expect(warnings(m, run(m, cloudy('guided'), [{ type: 'centrifuge', part: 'unknown' }]), { type: 'pourOff', part: 'unknown' })).toEqual([])

    // Step 2, with the water in and not heated: both slips at once, then one, then none.
    let state = run(m, workStep(m, guided(), 'unknown'), [{ type: 'add', part: 'unknown' }, ...LOOKS, { type: 'observe', part: 'unknown', observation: WHITE }])
    expect(warnings(m, state, { type: 'pourOff', part: 'unknown' })).toEqual(['not-centrifuged', 'not-heated'])
    state = run(m, state, [{ type: 'centrifuge', part: 'unknown' }])
    expect(warnings(m, state, { type: 'pourOff', part: 'unknown' })).toEqual(['not-heated'])
    // A warning is about the action it is asked of, and an action that is blocked has none.
    expect(warnings(m, state, { type: 'centrifuge', part: 'unknown' })).toEqual([])
    expect(warnings(m, guided(), { type: 'pourOff', part: 'unknown' })).toEqual([])

    // Step 5: recording what is seen before litmus has shown the liquid acid.
    let last = guided()
    for (let at = 0; at < 4; at++) last = workStep(m, last, 'unknown')
    last = run(m, last, [{ type: 'add', part: 'unknown' }, ...LOOKS])
    expect(warnings(m, last, { type: 'observe', part: 'unknown', observation: NONE })).toEqual(['not-acid'])
    last = run(m, last, [{ type: 'testLitmus', part: 'unknown' }])
    expect(step(last, 'unknown').litmus).toBe('basic')
    expect(warnings(m, last, { type: 'observe', part: 'unknown', observation: NONE })).toEqual(['not-acid'])
    last = run(m, last, [{ type: 'add', part: 'unknown' }])
    expect(step(last, 'unknown')).toMatchObject({ litmus: null, looked: [] })
    last = run(m, last, [{ type: 'testLitmus', part: 'unknown' }, ...LOOKS])
    expect(step(last, 'unknown').litmus).toBe('acid')
    expect(warnings(m, last, { type: 'observe', part: 'unknown', observation: NONE })).toEqual([])
  })

  it('lets the learner go on after a warning: the same action sent again is taken', () => {
    let state = run(m, guided(), [{ type: 'add', part: 'unknown' }, ...LOOKS, { type: 'observe', part: 'unknown', observation: WHITE }])
    expect(warnings(m, state, { type: 'pourOff', part: 'unknown' })).toEqual(['not-centrifuged'])
    state = run(m, state, [{ type: 'pourOff', part: 'unknown' }])
    expect(partView(m, state, 'unknown').step).toBe('extract-lead')
    // The solid went away with the liquid: the tube that step 2 is worked in is empty.
    expect(step(state, 'unknown').shows).toEqual({ liquid: null, solid: null })
  })
})

describe('Challenge', () => {
  it('records whatever it is given, says nothing of it until the step is checked, and then takes no more', () => {
    let state = run(m, challenge(), [{ type: 'add', part: 'unknown' }, ...LOOKS, { type: 'observe', part: 'unknown', observation: NONE }])
    expect(step(state, 'unknown')).toMatchObject({ observation: NONE, checked: false, wrongFields: null })
    expect(mismatch(m, state, 'unknown', NONE)).toEqual([])
    // It can be recorded again before the check.
    state = run(m, state, [{ type: 'observe', part: 'unknown', observation: { solid: 'yellow', liquid: 'colourless' } }, { type: 'checkStep', part: 'unknown' }])
    expect(step(state, 'unknown')).toMatchObject({ observation: { solid: 'yellow', liquid: 'colourless' }, checked: true, wrongFields: ['solid'] })
    for (const action of [{ type: 'add' }, { type: 'look', at: 'liquid' }, { type: 'observe', observation: WHITE }, { type: 'checkStep' }] as const) {
      expect(can(m, state, { ...action, part: 'unknown' } as Action), action.type).toBe('step-checked')
    }
    // What is left is the centrifuge and the pouring off.
    expect(can(m, state, { type: 'centrifuge', part: 'unknown' })).toBeNull()
    expect(can(m, state, { type: 'pourOff', part: 'unknown' })).toBeNull()
  })

  it('takes any tile in a place of the step, and checks the places with the observation when asked', () => {
    let state = run(m, challenge(), [{ type: 'add', part: 'known' }, ...looks('known'), { type: 'observe', part: 'known', observation: WHITE }])
    expect(can(m, state, { type: 'checkStep', part: 'known' })).toBe('places-empty')
    state = run(m, state, [
      { type: 'place', part: 'known', place: 'precipitate-solid', tile: 'silver-ion' },
      { type: 'place', part: 'known', place: 'precipitate-solid', tile: 'lead-chloride' },
      { type: 'unplace', part: 'known', place: 'precipitate-solid', tile: 'lead-chloride' },
    ])
    expect(partView(m, state, 'known').chart!.places[0]).toMatchObject({ tiles: ['silver-ion'], right: null, open: true, slots: null })
    state = run(m, state, [{ type: 'checkStep', part: 'known' }])
    expect(partView(m, state, 'known').chart!.places[0]).toMatchObject({ tiles: ['silver-ion'], right: false, open: false })
    expect(can(m, state, { type: 'place', part: 'known', place: 'precipitate-solid', tile: 'lead-chloride' })).toBe('step-checked')
  })
})

describe('the steps', () => {
  it('follow one another: pouring off ends steps 1, 2 and 4, and the check ends steps 3 and 5', () => {
    let state = challenge()
    const reached: (string | null)[] = []
    for (let at = 0; at < 5; at++) {
      reached.push(partView(m, state, 'unknown').step)
      state = workStep(m, state, 'unknown')
    }
    expect(reached).toEqual(['precipitate', 'extract-lead', 'confirm-lead', 'separate', 'confirm-silver'])
    expect(partView(m, state, 'unknown')).toMatchObject({ step: null, naming: { open: true, named: null } })
    expect(events(state, 'unknown')).toBe(
      ['add spin look look observe check pour', 'add heat look look observe check pour', 'add spin look look observe check', 'add look look observe check pour', 'add litmus add litmus look look observe check'].join(' '),
    )
    expect(partView(m, state, 'unknown').steps.map((s) => [s.status, s.tube])).toEqual([['done', 'a'], ['done', 'a'], ['done', 'b'], ['done', 'a'], ['done', 'c']])
    for (const action of [{ type: 'add' }, { type: 'centrifuge' }, { type: 'pourOff' }, { type: 'checkStep' }, { type: 'look', at: 'liquid' }] as const) {
      expect(can(m, state, { ...action, part: 'unknown' } as Action), action.type).toBe('steps-done')
    }
  })

  it('pour at the steps that have a pouring off, and nowhere else', () => {
    let state = challenge()
    state = workStep(m, workStep(m, state, 'unknown'), 'unknown')
    state = run(m, state, [{ type: 'add', part: 'unknown' }])
    expect(partView(m, state, 'unknown').step).toBe('confirm-lead')
    expect(can(m, state, { type: 'pourOff', part: 'unknown' })).toBe('not-this-step')
    expect(can(m, state, { type: 'heat', part: 'unknown' })).toBe('not-this-step')
    expect(can(m, state, { type: 'testLitmus', part: 'unknown' })).toBe('not-this-step')
  })

  it('take nitric acid up to four times at step 5, and litmus only once acid has gone in', () => {
    let state = challenge()
    for (let at = 0; at < 4; at++) state = workStep(m, state, 'unknown')
    expect(can(m, state, { type: 'testLitmus', part: 'unknown' })).toBe('add-first')
    const shown: (string | null)[] = []
    for (let addition = 1; addition <= 4; addition++) {
      state = run(m, state, [{ type: 'add', part: 'unknown' }, { type: 'testLitmus', part: 'unknown' }])
      shown.push(step(state, 'unknown').litmus)
    }
    expect(shown).toEqual(['basic', 'acid', 'acid', 'acid'])
    expect(step(state, 'unknown').added).toBe(4)
    expect(can(m, state, { type: 'add', part: 'unknown' })).toBe('tube-full')
    // A full tube can still be looked at, recorded and checked.
    state = run(m, state, [...LOOKS, { type: 'observe', part: 'unknown', observation: NONE }, { type: 'checkStep', part: 'unknown' }])
    expect(partView(m, state, 'unknown').naming).toEqual({ open: true, named: null })
  })

  it('keep what a tube showed when its step was checked, once the step is done', () => {
    const state = wholeRun(m, challenge(), 'known')
    expect(partView(m, state, 'known').steps.map((s) => [s.shows?.solid?.colour ?? 'none', s.shows?.liquid?.colour])).toEqual([
      ['white', 'colourless'],
      ['white', 'colourless'],
      ['yellow', 'yellow to orange'],
      ['grey to black', 'colourless'],
      ['white', 'colourless'],
    ])
  })
})

describe('naming the ions', () => {
  const worked = () => {
    let state = challenge()
    for (let at = 0; at < 5; at++) state = workStep(m, state, 'unknown')
    return state
  }

  it('takes any of the three, none or all, each once, and is said once', () => {
    const state = worked()
    for (const ions of [[], ['lead'], ['mercury-i', 'silver'], ['silver', 'lead', 'mercury-i']] as const) expect(can(m, state, { type: 'nameIons', part: 'unknown', ions: [...ions] })).toBeNull()
    for (const ions of [['lead', 'lead'], ['gold'], 'lead', null]) expect(can(m, state, { type: 'nameIons', part: 'unknown', ions: ions as never }), JSON.stringify(ions)).toBe('invalid-entry')
    const named = run(m, state, [{ type: 'nameIons', part: 'unknown', ions: ['mercury-i', 'silver'] }])
    // Stored in the ions' own order.
    expect(partView(m, named, 'unknown').naming).toEqual({ open: false, named: ['silver', 'mercury-i'] })
    expect(can(m, named, { type: 'nameIons', part: 'unknown', ions: ['lead'] })).toBe('run-over')
    for (const action of [{ type: 'add' }, { type: 'centrifuge' }, { type: 'pourOff' }, { type: 'checkStep' }] as const) expect(can(m, named, { ...action, part: 'unknown' } as Action)).toBe('run-over')
  })

  it('ends a run of part 1 at the check of its last step, with no naming', () => {
    const state = wholeRun(m, challenge(), 'known')
    expect(partView(m, state, 'known')).toMatchObject({ step: null, naming: null, outcome: { state: 'counts' } })
    expect(can(m, state, { type: 'add', part: 'known' })).toBe('run-over')
  })
})

describe('running a part again', () => {
  it('leaves the run behind and sets up a new one, with the next unknown in part 2 and the same known in part 1', () => {
    let state = run(m, challenge(), [{ type: 'add', part: 'unknown' }])
    state = run(m, state, [{ type: 'runAgain', part: 'unknown' }])
    expect(state.parts.unknown.map((r) => [r.index, r.events.length])).toEqual([[0, 1], [1, 0]])
    expect(partView(m, state, 'unknown')).toMatchObject({ runs: 2, step: 'precipitate' })
    expect([sampleOf(1, 'unknown', 0), sampleOf(1, 'unknown', 1)]).toEqual([['lead'], ['lead', 'mercury-i']])
    expect(can(m, state, { type: 'runAgain', part: 'unknown' })).toBe('nothing-to-repeat')
    // The other part is untouched.
    expect(state.parts.known).toEqual([{ index: 0, events: [] }])
  })

  it('goes on after the lab is complete, so that part 2 can be practised, and the lab stays complete', () => {
    let state = wholeRun(m, wholeRun(m, challenge(), 'known'), 'unknown')
    expect(state.status).toBe('completed')
    state = run(m, state, [{ type: 'runAgain', part: 'unknown' }, { type: 'add', part: 'unknown' }])
    expect(state.status).toBe('completed')
    state = wholeRun(m, run(m, state, [{ type: 'runAgain', part: 'unknown' }]), 'unknown', { nameWrong: true })
    expect(partView(m, state, 'unknown')).toMatchObject({ runs: 3, done: true, outcome: { state: 'does-not-count' } })
    expect(state.status).toBe('completed')
  })

  it('sets the last run up again in its own place once the record holds its most runs, unless that run counts', () => {
    let state = challenge()
    const begun = { index: 0, events: [{ t: 'add' as const }] }
    state = { ...state, parts: { ...state.parts, unknown: Array.from({ length: MAX_RUNS }, (_, index) => ({ ...begun, index })) } }
    expect(schema.safeParse(state).success).toBe(true)
    const again = run(m, state, [{ type: 'runAgain', part: 'unknown' }])
    expect(again.parts.unknown).toHaveLength(MAX_RUNS)
    expect(again.parts.unknown.at(-1)).toEqual({ index: MAX_RUNS - 1, events: [] })
    // A last run that counts is the part done, and is not set up again.
    const counted = wholeRun(m, again, 'unknown')
    expect(partView(m, counted, 'unknown').outcome.state).toBe('counts')
    expect(can(m, counted, { type: 'runAgain', part: 'unknown' })).toBe('no-more-runs')
  })

  it('is the way on from a run that has gone on for longer than the record holds', () => {
    let state = run(m, challenge(), [{ type: 'add', part: 'unknown' }, ...LOOKS])
    const observe: Action = { type: 'observe', part: 'unknown', observation: WHITE }
    while (can(m, state, observe) === null) state = reduce(m, state, observe)
    expect(can(m, state, observe)).toBe('run-too-long')
    expect(currentRun(state, 'unknown').events.length).toBe(MAX_EVENTS - 1)
    expect(schema.safeParse(JSON.parse(JSON.stringify(state))).success).toBe(true)
    expect(can(m, state, { type: 'runAgain', part: 'unknown' })).toBeNull()
  })
})

describe('changing the mode in the middle of a step', () => {
  it('from Challenge to Guided keeps what was recorded; Guided then checks the step only if it is right', () => {
    const recorded = (observation: typeof WHITE) => run(m, challenge(), [{ type: 'add', part: 'unknown' }, ...LOOKS, { type: 'observe', part: 'unknown', observation }, { type: 'setMode', mode: 'guided' }])
    const right = recorded(WHITE)
    expect(can(m, right, { type: 'checkStep', part: 'unknown' })).toBeNull()
    const wrong = recorded(NONE)
    expect(can(m, wrong, { type: 'checkStep', part: 'unknown' })).toBe('does-not-match')
    // Recording what the tube shows puts it right, and Guided checks it at once.
    expect(step(run(m, wrong, [{ type: 'observe', part: 'unknown', observation: WHITE }]), 'unknown')).toMatchObject({ checked: true, wrongFields: [] })
  })

  it('from Guided to Challenge leaves a step that Guided checked as it is', () => {
    const state = run(m, guided(), [{ type: 'add', part: 'unknown' }, ...LOOKS, { type: 'observe', part: 'unknown', observation: WHITE }, { type: 'setMode', mode: 'challenge' }])
    expect(step(state, 'unknown').checked).toBe(true)
    expect(warnings(m, state, { type: 'pourOff', part: 'unknown' })).toEqual([])
  })
})

describe('the stored record', () => {
  it('is the seed, the mode, the status and, for each run, what was done in it: nothing that is worked out', () => {
    const state = wholeRun(m, guided(), 'unknown')
    expect(Object.keys(state)).toEqual(['seed', 'mode', 'status', 'parts'])
    expect(state.parts.unknown).toHaveLength(1)
    expect(Object.keys(state.parts.unknown[0]!)).toEqual(['index', 'events'])
    const stored = JSON.stringify(state)
    // No colour that was not recorded by the learner, no amount, no verdict.
    expect(stored).not.toMatch(/chloride|chromate|nanomol|microlit|wrong|right|counts|holds/)
    expect(schema.parse(JSON.parse(stored))).toEqual(state)
  })

  it('is refused where it is not one the lab could have made', () => {
    const state = wholeRun(m, challenge(), 'unknown')
    const edited = (edit: (copy: CationsState) => void) => {
      const copy: CationsState = JSON.parse(JSON.stringify(state))
      edit(copy)
      return schema.safeParse(copy)
    }
    const message = (result: ReturnType<typeof edited>) => (result.success ? '' : result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '))
    expect(edited(() => {}).success).toBe(true)
    expect(message(edited((s) => void (s.parts.unknown[0]!.index = 3)))).toContain("parts.unknown.0.index: a run's index is its place in the list")
    // A step skipped, a thing done twice, a look that changes nothing, and a naming before the steps are done.
    expect(message(edited((s) => void s.parts.unknown[0]!.events.splice(1, 1)))).toContain('parts.unknown.0.events: not a list of things that could have been done in this order')
    expect(edited((s) => void s.parts.unknown[0]!.events.unshift({ t: 'pour' })).success).toBe(false)
    expect(edited((s) => void s.parts.unknown[0]!.events.splice(2, 0, { t: 'look', at: 'liquid' })).success).toBe(false)
    expect(edited((s) => void (s.parts.known[0]!.events = [{ t: 'name', ions: ['lead'] }])).success).toBe(false)
    expect(edited((s) => void s.parts.unknown[0]!.events.push({ t: 'add' })).success).toBe(false)
    // The status is the one the runs give.
    expect(message(edited((s) => void (s.status = 'completed')))).toContain('status: the status is not the one the runs give')
    // The shape itself.
    expect(edited((s) => void ((s as unknown as { extra: number }).extra = 1)).success).toBe(false)
    expect(edited((s) => void (s.seed = -1)).success).toBe(false)
    expect(edited((s) => void (s.parts.unknown[0]!.events[0] = { t: 'stir' } as never)).success).toBe(false)
    expect(edited((s) => void (s.parts.unknown = [])).success).toBe(false)
    expect(edited((s) => void (s.parts.known[0]!.events = Array.from({ length: MAX_EVENTS + 1 }, () => ({ t: 'add' as const })))).success).toBe(false)
    expect(edited((s) => void (s.parts.known = Array.from({ length: MAX_RUNS + 1 }, (_, index) => ({ index, events: [] })))).success).toBe(false)
  })

  it('reads a run with a wrong entry as it was left, and judges it again as it was judged', () => {
    const state = wholeRun(m, challenge(), 'unknown', { wrongSolidAt: 2 })
    const reloaded = schema.parse(JSON.parse(JSON.stringify(state)))
    expect(partView(m, reloaded, 'unknown')).toEqual(partView(m, state, 'unknown'))
    expect(partView(m, reloaded, 'unknown').outcome).toEqual({ state: 'does-not-count', reasons: [{ kind: 'observation-wrong', step: 'confirm-lead' }, { kind: 'ions-wrong' }] })
    expect(seen(m, partView(m, reloaded, 'unknown').steps[2]!.shows!)).toEqual({ solid: 'yellow', liquid: 'yellow to orange' })
  })
})
