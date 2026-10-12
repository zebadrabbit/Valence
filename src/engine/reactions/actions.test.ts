import { describe, expect, it } from 'vitest'
import { STATION_IDS, type StationId } from '@/chem-data/reactions/data'
import { can, mismatch, reduce, type Action } from './actions'
import { PINNED_MODEL as m } from './pinnedModel'
import { stationView } from './select'
import { createLab, currentRun, MAX_EVENTS, MAX_RUNS, type ReactionsState } from './state'
import { rightEntry, run, wholeLab, wholeStation, wrongEntry } from './testkit'

// The reducer of the types of reactions lab: when each action can be done, what it does, and where the two modes
// differ (spec 24.2).

const A: StationId = 'zinc-copper-sulfate'
const C: StationId = 'metals-in-acid'
const E: StationId = 'peroxide'
const lookAll = (state: ReactionsState, station: StationId): Action[] => stationView(m, state, station).vessels.flatMap((v) => v.looks.map((look): Action => ({ type: 'look', station, vessel: v.id, at: look.at })))
/** Station A with the action done and every part looked at. */
const looked = (mode: 'guided' | 'challenge') => {
  const acted = run(m, createLab(mode), [{ type: 'act', station: A }])
  return run(m, acted, lookAll(acted, A))
}
const RIGHT_A = { coating: 'red-brown', liquid: 'paler blue' }
const observed = (mode: 'guided' | 'challenge', observation = RIGHT_A) => run(m, looked(mode), [{ type: 'observe', station: A, vessel: 'tube', observation }])

describe('the order of a station', () => {
  it('takes a look before the action, the action once, and then each look again, since the vessel has changed', () => {
    let state = createLab('challenge')
    expect(can(m, state, { type: 'look', station: A, vessel: 'tube', at: 'metal' })).toBeNull()
    state = run(m, state, lookAll(state, A))
    expect(stationView(m, state, A).vessels[0]!.looks.map((l) => l.words)).toEqual(['A grey piece of metal lies beside the tube.', 'The liquid is clear and blue.'])
    // A second look at the same part changes nothing.
    expect(reduce(m, state, { type: 'look', station: A, vessel: 'tube', at: 'metal' })).toBe(state)
    state = run(m, state, [{ type: 'act', station: A }])
    expect(stationView(m, state, A).vessels[0]!.looks.map((l) => [l.looked, l.words])).toEqual([[false, null], [false, null]])
    expect(can(m, state, { type: 'act', station: A })).toBe('action-done')
    state = run(m, state, lookAll(state, A))
    expect(stationView(m, state, A).vessels[0]!.looks.map((l) => l.words)).toEqual(['A red-brown coating covers the metal.', 'The liquid is still clear, and a paler blue than it was.'])
  })

  it('opens what is seen by looking, the kind by what is seen, and the equation by the kind', () => {
    const fresh = createLab('challenge')
    expect(can(m, fresh, { type: 'observe', station: A, vessel: 'tube', observation: RIGHT_A })).toBe('act-first')
    const acted = run(m, fresh, [{ type: 'act', station: A }])
    expect(can(m, acted, { type: 'observe', station: A, vessel: 'tube', observation: RIGHT_A })).toBe('look-first')
    const half = run(m, acted, [{ type: 'look', station: A, vessel: 'tube', at: 'metal' }])
    expect(can(m, half, { type: 'observe', station: A, vessel: 'tube', observation: RIGHT_A })).toBe('look-first')
    const state = looked('challenge')
    expect(can(m, state, { type: 'sayKind', station: A, vessel: 'tube', kind: 'combination' })).toBe('observe-first')
    expect(can(m, state, { type: 'enterEquation', station: A, vessel: 'tube', entry: rightEntry(m, A, 'tube') })).toBe('kind-first')
    const seen = observed('challenge')
    expect(can(m, seen, { type: 'enterEquation', station: A, vessel: 'tube', entry: rightEntry(m, A, 'tube') })).toBe('kind-first')
    const kind = run(m, seen, [{ type: 'sayKind', station: A, vessel: 'tube', kind: 'combination' }])
    expect(can(m, kind, { type: 'enterEquation', station: A, vessel: 'tube', entry: rightEntry(m, A, 'tube') })).toBeNull()
    expect(can(m, kind, { type: 'checkStation', station: A })).toBe('not-all-done')
  })

  it('refuses what is no entry: a field or a choice that is none, a kind that is none, a vessel that is none, "No reaction" as an equation, an order where none is asked', () => {
    const state = looked('challenge')
    for (const observation of [{ coating: 'red-brown' }, { coating: 'red-brown', liquid: 'purple' }, { coating: 'red-brown', liquid: 'blue', solid: 'none' }, null as never]) {
      expect(can(m, state, { type: 'observe', station: A, vessel: 'tube', observation })).toBe('invalid-entry')
    }
    expect(can(m, state, { type: 'observe', station: A, vessel: 'nothing', observation: RIGHT_A })).toBe('invalid-entry')
    expect(can(m, state, { type: 'look', station: A, vessel: 'tube', at: 'flame' })).toBe('invalid-entry')
    expect(can(m, state, { type: 'act', station: 'nothing' as never })).toBe('unknown-station')
    const seen = observed('challenge')
    expect(can(m, seen, { type: 'sayKind', station: A, vessel: 'tube', kind: 'exchange' as never })).toBe('invalid-entry')
    expect(can(m, seen, { type: 'sayOrder', station: A, order: ['magnesium', 'zinc', 'copper'] })).toBe('invalid-entry')
    const kind = run(m, seen, [{ type: 'sayKind', station: A, vessel: 'tube', kind: 'combination' }])
    expect(can(m, kind, { type: 'enterEquation', station: A, vessel: 'tube', entry: { noReaction: true, reactants: [], products: [] } })).toBe('invalid-entry')
    expect(can(m, kind, { type: 'enterEquation', station: A, vessel: 'tube', entry: { ...rightEntry(m, A, 'tube'), noReaction: true } })).toBe('invalid-entry')
    expect(can(m, kind, { type: 'enterEquation', station: A, vessel: 'tube', entry: undefined as never })).toBe('invalid-entry')
    // A tile of another station is no tile of this one.
    expect(can(m, kind, { type: 'enterEquation', station: A, vessel: 'tube', entry: rightEntry(m, E, 'tube') })).toBe('invalid-entry')
  })

  it('asks for no equation where the learner says that nothing reacted, and lets go of one built before', () => {
    let state = run(m, observed('challenge'), [{ type: 'sayKind', station: A, vessel: 'tube', kind: 'single-replacement' }, { type: 'enterEquation', station: A, vessel: 'tube', entry: rightEntry(m, A, 'tube') }])
    expect(stationView(m, state, A).outcome.state).toBe('to-check')
    state = run(m, state, [{ type: 'sayKind', station: A, vessel: 'tube', kind: 'none' }])
    const view = stationView(m, state, A)
    expect([view.vessels[0]!.equation, view.vessels[0]!.equationOpen, view.outcome.state]).toEqual([null, false, 'to-check'])
    expect(can(m, state, { type: 'enterEquation', station: A, vessel: 'tube', entry: rightEntry(m, A, 'tube') })).toBe('nothing-to-write')
  })

  it('asks the order of the three metals once each tube has been observed, and takes any order of the three', () => {
    let state = run(m, createLab('challenge'), [{ type: 'act', station: C }])
    state = run(m, state, lookAll(state, C))
    expect(stationView(m, state, C).order).toEqual({ metals: ['magnesium', 'zinc', 'copper'], open: false, said: null, right: null })
    expect(can(m, state, { type: 'sayOrder', station: C, order: ['copper', 'zinc', 'magnesium'] })).toBe('observe-first')
    state = run(m, state, [
      { type: 'observe', station: C, vessel: 'magnesium', observation: { bubbles: 'fast' } },
      { type: 'observe', station: C, vessel: 'zinc', observation: { bubbles: 'slow' } },
      { type: 'observe', station: C, vessel: 'copper', observation: { bubbles: 'none' } },
    ])
    for (const order of [['copper', 'zinc'], ['copper', 'zinc', 'zinc'], ['copper', 'zinc', 'iron']] as never[]) expect(can(m, state, { type: 'sayOrder', station: C, order })).toBe('invalid-entry')
    state = run(m, state, [{ type: 'sayOrder', station: C, order: ['copper', 'zinc', 'magnesium'] }])
    expect(stationView(m, state, C).order).toMatchObject({ open: true, said: ['copper', 'zinc', 'magnesium'], right: null })
    expect(reduce(m, state, { type: 'sayOrder', station: C, order: ['copper', 'zinc', 'magnesium'] })).toBe(state)
  })
})

describe('Guided', () => {
  it('refuses an observation that is not what the vessel shows, says which fields, and records the right one', () => {
    const state = looked('guided')
    const wrong = { coating: 'none', liquid: 'paler blue' }
    expect(can(m, state, { type: 'observe', station: A, vessel: 'tube', observation: wrong })).toBe('does-not-match')
    expect(mismatch(m, state, A, 'tube', wrong)).toEqual(['coating'])
    expect(reduce(m, state, { type: 'observe', station: A, vessel: 'tube', observation: wrong })).toBe(state)
    expect(stationView(m, observed('guided'), A).vessels[0]!.wrongFields).toEqual([])
    // Before the action there is nothing to record, so nothing is marked.
    expect(mismatch(m, createLab('guided'), A, 'tube', wrong)).toEqual([])
  })

  it('refuses a kind that is not right, and an equation with something wrong in it, by the kind of thing that is wrong', () => {
    const seen = observed('guided')
    expect(can(m, seen, { type: 'sayKind', station: A, vessel: 'tube', kind: 'double-replacement' })).toBe('not-right')
    expect(can(m, seen, { type: 'sayKind', station: A, vessel: 'tube', kind: 'none' })).toBe('not-right')
    const kind = run(m, seen, [{ type: 'sayKind', station: A, vessel: 'tube', kind: 'single-replacement' }])
    expect(stationView(m, kind, A).vessels[0]!).toMatchObject({ kindRight: true, equationOpen: true, places: { reactants: 2, products: 2 } })
    const refused = (how: 'extra' | 'missing' | 'state' | 'unbalanced') => can(m, kind, { type: 'enterEquation', station: A, vessel: 'tube', entry: wrongEntry(m, A, 'tube', how) })
    expect([refused('extra'), refused('missing'), refused('state'), refused('unbalanced')]).toEqual(['species-extra', 'species-missing', 'state-wrong', 'not-balanced'])
    expect(reduce(m, kind, { type: 'enterEquation', station: A, vessel: 'tube', entry: wrongEntry(m, A, 'tube', 'unbalanced') })).toBe(kind)
  })

  it('checks a station by itself once all of it is recorded, and the station then counts', () => {
    const kind = run(m, observed('guided'), [{ type: 'sayKind', station: A, vessel: 'tube', kind: 'single-replacement' }])
    const done = run(m, kind, [{ type: 'enterEquation', station: A, vessel: 'tube', entry: rightEntry(m, A, 'tube') }])
    expect(currentRun(done, A).events.at(-1)).toEqual({ t: 'check' })
    expect(stationView(m, done, A)).toMatchObject({ outcome: { state: 'counts' }, done: true })
    expect(can(m, done, { type: 'look', station: A, vessel: 'tube', at: 'metal' })).toBe('station-checked')
  })

  it('refuses a wrong order, and takes "no reaction" for the tube where nothing reacts with no equation asked', () => {
    let state = run(m, createLab('guided'), [{ type: 'act', station: C }])
    state = run(m, state, lookAll(state, C))
    state = run(m, state, [
      { type: 'observe', station: C, vessel: 'magnesium', observation: { bubbles: 'fast' } },
      { type: 'observe', station: C, vessel: 'zinc', observation: { bubbles: 'slow' } },
      { type: 'observe', station: C, vessel: 'copper', observation: { bubbles: 'none' } },
    ])
    expect(can(m, state, { type: 'sayOrder', station: C, order: ['zinc', 'magnesium', 'copper'] })).toBe('not-right')
    expect(can(m, state, { type: 'sayKind', station: C, vessel: 'copper', kind: 'single-replacement' })).toBe('not-right')
    state = run(m, state, [{ type: 'sayKind', station: C, vessel: 'copper', kind: 'none' }])
    expect(stationView(m, state, C).vessels[2]!).toMatchObject({ kindRight: true, equationOpen: false, places: null })
  })

  it('finds what Challenge recorded when the mode is changed in the middle: it stays, marked, can be put right, and the station is not checked by itself while any of it is wrong', () => {
    let state = run(m, observed('challenge', { coating: 'none', liquid: 'blue' }), [{ type: 'sayKind', station: A, vessel: 'tube', kind: 'combination' }, { type: 'enterEquation', station: A, vessel: 'tube', entry: wrongEntry(m, A, 'tube', 'unbalanced') }])
    expect(stationView(m, state, A).vessels[0]!).toMatchObject({ wrongFields: null, kindRight: null, equation: { judged: false, problem: null } })
    state = run(m, state, [{ type: 'setMode', mode: 'guided' }])
    expect(stationView(m, state, A).vessels[0]!).toMatchObject({ wrongFields: ['coating', 'liquid'], kindRight: false, equation: { judged: true, problem: 'not-balanced' } })
    expect(stationView(m, state, A).outcome.state).toBe('to-check')
    state = run(m, state, [{ type: 'observe', station: A, vessel: 'tube', observation: RIGHT_A }, { type: 'sayKind', station: A, vessel: 'tube', kind: 'single-replacement' }])
    expect(stationView(m, state, A).outcome.state).toBe('to-check')
    state = run(m, state, [{ type: 'enterEquation', station: A, vessel: 'tube', entry: rightEntry(m, A, 'tube') }])
    expect(stationView(m, state, A).outcome.state).toBe('counts')
    // The learner may also ask for the check with something still wrong: the run then does not count.
    const asked = run(m, run(m, observed('challenge', { coating: 'none', liquid: 'blue' }), [{ type: 'sayKind', station: A, vessel: 'tube', kind: 'none' }, { type: 'setMode', mode: 'guided' }]), [{ type: 'checkStation', station: A }])
    expect(stationView(m, asked, A).outcome).toEqual({ state: 'does-not-count', reasons: [{ kind: 'observation-wrong', vessel: 'tube' }, { kind: 'kind-wrong', vessel: 'tube' }] })
  })
})

describe('Challenge', () => {
  it('records whatever it is given, marks nothing until the station is checked, and then says why the run does not count', () => {
    let state = wholeStation(m, createLab('challenge'), C, { wrongObservationAt: 'zinc', wrongKindAt: 'copper', wrongEquationAt: 'magnesium', wrongEquation: 'missing', wrongOrder: true, check: false })
    const before = stationView(m, state, C)
    expect(before.outcome.state).toBe('to-check')
    expect(before.vessels.map((v) => [v.wrongFields, v.kindRight, v.equation?.judged ?? null, v.places, v.catalyst])).toEqual([[null, null, false, null, null], [null, null, false, null, null], [null, null, false, null, null]])
    expect(before.order!.right).toBeNull()
    expect(mismatch(m, state, C, 'zinc', { bubbles: 'none' })).toEqual([])
    state = run(m, state, [{ type: 'checkStation', station: C }])
    expect(stationView(m, state, C).outcome).toEqual({
      state: 'does-not-count',
      reasons: [
        { kind: 'equation-wrong', vessel: 'magnesium', problem: 'species-missing' },
        { kind: 'observation-wrong', vessel: 'zinc' },
        { kind: 'kind-wrong', vessel: 'copper' },
        { kind: 'equation-wrong', vessel: 'copper', problem: 'no-reaction' },
        { kind: 'order-wrong' },
      ],
    })
    expect(state.status).toBe('in-progress')
  })

  it('lets an answer be recorded again until the station is checked', () => {
    let state = run(m, observed('challenge', { coating: 'none', liquid: 'blue' }), [{ type: 'observe', station: A, vessel: 'tube', observation: RIGHT_A }, { type: 'sayKind', station: A, vessel: 'tube', kind: 'combination' }, { type: 'sayKind', station: A, vessel: 'tube', kind: 'single-replacement' }])
    state = run(m, state, [{ type: 'enterEquation', station: A, vessel: 'tube', entry: wrongEntry(m, A, 'tube', 'extra') }, { type: 'enterEquation', station: A, vessel: 'tube', entry: rightEntry(m, A, 'tube') }, { type: 'checkStation', station: A }])
    expect(stationView(m, state, A).outcome.state).toBe('counts')
    expect(can(m, state, { type: 'sayKind', station: A, vessel: 'tube', kind: 'none' })).toBe('station-checked')
  })
})

describe('working a station again, and the whole lab', () => {
  it('sets a station up again, keeps the run before, and keeps a station that counted done', () => {
    const fresh = createLab('challenge')
    expect(can(m, fresh, { type: 'workAgain', station: A })).toBe('nothing-to-repeat')
    let state = wholeStation(m, fresh, A)
    expect(stationView(m, state, A).done).toBe(true)
    state = run(m, state, [{ type: 'workAgain', station: A }])
    expect(stationView(m, state, A)).toMatchObject({ runs: 2, acted: false, outcome: { state: 'open' }, done: true })
    state = wholeStation(m, state, A, { wrongKindAt: 'tube' })
    expect(stationView(m, state, A)).toMatchObject({ outcome: { state: 'does-not-count' }, done: true })
  })

  it('is complete when all five stations count, in either mode, and stays complete when a station is worked again', () => {
    for (const mode of ['guided', 'challenge'] as const) {
      let state = createLab(mode)
      for (const [i, station] of STATION_IDS.entries()) {
        expect(state.status, `${mode} before ${station}`).toBe('in-progress')
        state = wholeStation(m, state, station)
        expect(stationView(m, state, station).outcome.state, `${mode} ${station}`).toBe('counts')
        expect(state.status).toBe(i === STATION_IDS.length - 1 ? 'completed' : 'in-progress')
      }
      state = run(m, state, [{ type: 'workAgain', station: E }, { type: 'act', station: E }])
      expect(state.status).toBe('completed')
    }
    expect(wholeLab(m, createLab('guided')).status).toBe('completed')
  })

  it('holds so many runs and so many things done in one, and still leaves a way on', () => {
    let state = createLab('challenge')
    for (let i = 1; i < MAX_RUNS; i++) state = run(m, state, [{ type: 'act', station: A }, { type: 'workAgain', station: A }])
    expect(state.stations[A].length).toBe(MAX_RUNS)
    state = run(m, state, [{ type: 'act', station: A }, { type: 'workAgain', station: A }])
    expect([state.stations[A].length, currentRun(state, A)]).toEqual([MAX_RUNS, { index: MAX_RUNS - 1, events: [] }])
    const counted = wholeStation(m, state, A)
    expect(can(m, counted, { type: 'workAgain', station: A })).toBe('no-more-runs')
    // A run of the most events takes no more, and can be set up again.
    let long = looked('challenge')
    const flip = [RIGHT_A, { coating: 'none', liquid: 'blue' }]
    for (let i = 0; currentRun(long, A).events.length < MAX_EVENTS - 1; i++) long = run(m, long, [{ type: 'observe', station: A, vessel: 'tube', observation: flip[i % 2]! }])
    expect(can(m, long, { type: 'observe', station: A, vessel: 'tube', observation: flip[0]! })).toBe('run-too-long')
    expect(can(m, long, { type: 'workAgain', station: A })).toBeNull()
  })

  it('changes the mode at any time, and a change to the mode it has is no change', () => {
    const state = createLab('guided')
    expect(reduce(m, state, { type: 'setMode', mode: 'guided' })).toBe(state)
    expect(reduce(m, state, { type: 'setMode', mode: 'challenge' }).mode).toBe('challenge')
  })
})
