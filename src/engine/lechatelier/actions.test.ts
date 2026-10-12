import { describe, expect, it } from 'vitest'
import { can, mismatch, reduce, type Action } from './actions'
import { PINNED_MODEL as m } from './pinnedModel'
import { apply, newRunState, replay, shownAtEnd, stageAt, type RunEvent } from './run'
import { systemView } from './select'
import { createLab, currentRun, lechatelierStateSchema, MAX_EVENTS, MAX_RUNS, runStateOf, systemModel, type LechatelierState } from './state'
import { run, wholeSystem, workDisturbance } from './testkit'

const lead = systemModel(m, 'lead-chloride')
const S = 'lead-chloride' as const
const LOOK: Action[] = [
  { type: 'look', system: S, at: 'liquid' },
  { type: 'look', system: S, at: 'bottom' },
]
const view = (state: LechatelierState, at = 0) => systemView(m, state, S).disturbances[at]!

describe('a disturbance, one thing at a time', () => {
  it('begins with nothing predicted, nothing done and nothing recorded, its tube as it stands', () => {
    const state = createLab('challenge')
    expect(view(state)).toMatchObject({ id: 'lead-acid', status: 'current', prediction: null, predictionFixed: false, acted: 0, portions: 3, looked: [], observationOpen: false, observation: null, answerOpen: false, answer: null, notesShown: false })
    expect(view(state).shows).toEqual({ liquid: { colour: 'colourless', cloudy: false, microlitres: 1500 }, solid: null })
    expect(view(state, 1)).toMatchObject({ status: 'waiting', shows: null, temperature: null })
  })

  it('takes no press of its action until a prediction is recorded', () => {
    const state = createLab('challenge')
    expect(can(m, state, { type: 'act', system: S })).toBe('predict-first')
    expect(reduce(m, state, { type: 'act', system: S })).toBe(state)
    expect(can(m, run(m, state, [{ type: 'predict', system: S, way: 'left' }]), { type: 'act', system: S })).toBeNull()
  })

  it('lets the prediction be changed until the action begins, and never after', () => {
    let state = run(m, createLab('challenge'), [{ type: 'predict', system: S, way: 'left' }, { type: 'predict', system: S, way: 'none' }])
    expect(view(state)).toMatchObject({ prediction: 'none', predictionFixed: false })
    // The same prediction again changes nothing.
    expect(reduce(m, state, { type: 'predict', system: S, way: 'none' })).toBe(state)
    state = run(m, state, [{ type: 'act', system: S }])
    expect(view(state)).toMatchObject({ prediction: 'none', predictionFixed: true })
    for (const way of ['left', 'right', 'none'] as const) expect(can(m, state, { type: 'predict', system: S, way })).toBe('prediction-fixed')
    expect(can(m, createLab('challenge'), { type: 'predict', system: S, way: 'up' as never })).toBe('invalid-entry')
  })

  it('adds a portion at each press, shows the tube after each, and takes no press beyond the last', () => {
    let state = run(m, createLab('challenge'), [{ type: 'predict', system: S, way: 'right' }])
    const seen: (string | null)[] = []
    for (let press = 1; press <= 3; press++) {
      state = run(m, state, [{ type: 'act', system: S }])
      expect(view(state).acted).toBe(press)
      seen.push(view(state).shows!.solid?.colour ?? null)
      expect(view(state).shows!.liquid!.microlitres).toBe(1500 + 100 * press)
    }
    expect(seen).toEqual([null, 'white', 'white'])
    expect(can(m, state, { type: 'act', system: S })).toBe('action-done')
  })

  it('can be looked at at any time, and is looked at again after every press', () => {
    let state = run(m, createLab('challenge'), LOOK)
    expect(view(state).looked).toEqual(['liquid', 'bottom'])
    // A look at a part already looked at changes nothing.
    expect(reduce(m, state, LOOK[0]!)).toBe(state)
    state = run(m, state, [{ type: 'predict', system: S, way: 'left' }, { type: 'act', system: S }])
    expect(view(state).looked).toEqual([])
    expect(can(m, state, { type: 'look', system: S, at: 'top' as never })).toBe('invalid-entry')
  })

  it('opens the observation only when every portion is in and both parts have been looked at since', () => {
    const observation = { solid: 'white', liquid: 'colourless' }
    let state = run(m, createLab('challenge'), [{ type: 'predict', system: S, way: 'left' }, { type: 'act', system: S }, ...LOOK])
    expect(can(m, state, { type: 'observe', system: S, observation })).toBe('act-first')
    state = run(m, state, [{ type: 'act', system: S }, { type: 'act', system: S }])
    expect(can(m, state, { type: 'observe', system: S, observation })).toBe('look-first')
    expect(view(state).observationOpen).toBe(false)
    state = run(m, state, [LOOK[0]!])
    expect(can(m, state, { type: 'observe', system: S, observation })).toBe('look-first')
    state = run(m, state, [LOOK[1]!])
    expect(view(state).observationOpen).toBe(true)
    expect(can(m, state, { type: 'observe', system: S, observation: { solid: 'cream', liquid: 'colourless' } })).toBe('invalid-entry')
    expect(can(m, state, { type: 'observe', system: S, observation: undefined as never })).toBe('invalid-entry')
    expect(can(m, state, { type: 'observe', system: S, observation })).toBeNull()
  })

  it('takes the observation again until the question is answered, and the answer once', () => {
    let state = run(m, createLab('challenge'), [{ type: 'predict', system: S, way: 'left' }, { type: 'act', system: S }, { type: 'act', system: S }, { type: 'act', system: S }, ...LOOK])
    expect(can(m, state, { type: 'answer', system: S, is: 'right' })).toBe('observe-first')
    state = run(m, state, [{ type: 'observe', system: S, observation: { solid: 'none', liquid: 'pink' } }])
    expect(view(state)).toMatchObject({ observation: { solid: 'none', liquid: 'pink' }, answerOpen: true })
    state = run(m, state, [{ type: 'observe', system: S, observation: { solid: 'white', liquid: 'colourless' } }])
    expect(view(state).observation).toEqual({ solid: 'white', liquid: 'colourless' })
    // The same observation again changes nothing.
    expect(reduce(m, state, { type: 'observe', system: S, observation: { solid: 'white', liquid: 'colourless' } })).toBe(state)
    expect(can(m, state, { type: 'answer', system: S, is: 'hydroxide' })).toBe('invalid-entry')
    state = run(m, state, [{ type: 'answer', system: S, is: 'left' }])
    expect(view(state)).toMatchObject({ status: 'done', answer: 'left', notesShown: true, observationOpen: false, answerOpen: false })
    // The run has moved on: what is done now is done to the next disturbance.
    expect(systemView(m, state, S).disturbance).toBe('lead-heat')
    expect(view(state, 1)).toMatchObject({ status: 'current', prediction: null, acted: 0 })
    expect(view(state, 1).shows).toEqual(view(state, 0).shows)
  })

  it('asks the two hydroxides what took the ion away, and takes only an answer to that question', () => {
    let state = createLab('challenge')
    state = workDisturbance(m, workDisturbance(m, state, 'hydroxides'), 'hydroxides')
    expect(systemView(m, state, 'hydroxides').disturbance).toBe('zinc-base')
    state = run(m, state, [{ type: 'predict', system: 'hydroxides', way: 'right' }, { type: 'act', system: 'hydroxides' }, { type: 'look', system: 'hydroxides', at: 'liquid' }, { type: 'look', system: 'hydroxides', at: 'bottom' }, { type: 'observe', system: 'hydroxides', observation: { solid: 'none', liquid: 'colourless' } }])
    expect(systemView(m, state, 'hydroxides').disturbances[2]!.ask).toBe('cause')
    expect(can(m, state, { type: 'answer', system: 'hydroxides', is: 'left' })).toBe('invalid-entry')
    expect(can(m, state, { type: 'answer', system: 'hydroxides', is: 'ammonia' })).toBeNull()
  })
})

describe('a system, checked and worked again', () => {
  it('is checked only once every disturbance is done, and takes nothing after', () => {
    let state = createLab('challenge')
    expect(can(m, state, { type: 'checkSystem', system: S })).toBe('not-all-done')
    state = wholeSystem(m, state, S, { check: false })
    expect(systemView(m, state, S)).toMatchObject({ disturbance: null, outcome: { state: 'to-check' }, done: false })
    expect(can(m, state, { type: 'act', system: S })).toBe('all-done')
    expect(can(m, state, { type: 'predict', system: S, way: 'left' })).toBe('all-done')
    state = run(m, state, [{ type: 'checkSystem', system: S }])
    expect(systemView(m, state, S)).toMatchObject({ outcome: { state: 'counts' }, done: true })
    for (const action of [{ type: 'checkSystem', system: S }, { type: 'act', system: S }, ...LOOK] as Action[]) expect(can(m, state, action)).toBe('system-checked')
  })

  it('is worked again from untouched tubes, and the run before is kept', () => {
    let state = createLab('challenge')
    expect(can(m, state, { type: 'workAgain', system: S })).toBe('nothing-to-repeat')
    state = wholeSystem(m, state, S, { wrongAnswerAt: 'lead-cool' })
    expect(systemView(m, state, S).outcome).toEqual({ state: 'does-not-count', reasons: [{ kind: 'answer-wrong', disturbance: 'lead-cool' }] })
    const again = run(m, state, [{ type: 'workAgain', system: S }])
    expect(again.systems[S].map((r) => r.index)).toEqual([0, 1])
    expect(again.systems[S][0]).toBe(state.systems[S][0])
    expect(systemView(m, again, S)).toMatchObject({ runs: 2, disturbance: 'lead-acid', outcome: { state: 'open' }, done: false })
    expect(systemView(m, wholeSystem(m, again, S), S)).toMatchObject({ outcome: { state: 'counts' }, done: true })
    // A run can be abandoned part of the way through as well.
    const begun = run(m, createLab('guided'), [{ type: 'predict', system: S, way: 'left' }])
    expect(run(m, begun, [{ type: 'workAgain', system: S }]).systems[S].length).toBe(2)
  })

  it('leaves the other systems as they are', () => {
    const state = wholeSystem(m, createLab('challenge'), 'cobalt')
    for (const other of ['lead-chloride', 'methyl-violet', 'hydroxides'] as const) expect(state.systems[other]).toEqual([{ index: 0, events: [] }])
    expect(can(m, state, { type: 'act', system: 'no-such' as never })).toBe('unknown-system')
  })

  it('holds no more runs and no more events than the record allows, and always leaves a way on', () => {
    // Two hundred runs that do not count: the next is set up in the last one's place.
    const runs = Array.from({ length: MAX_RUNS }, (_, index) => ({ index, events: [{ t: 'predict' as const, way: 'left' as const }] }))
    const full: LechatelierState = { ...createLab('challenge'), systems: { ...createLab('challenge').systems, [S]: runs } }
    const again = reduce(m, full, { type: 'workAgain', system: S })
    expect(again.systems[S].length).toBe(MAX_RUNS)
    expect(currentRun(again, S)).toEqual({ index: MAX_RUNS - 1, events: [] })
    // The last of two hundred counts: there is nothing more to set up.
    const counted = currentRun(wholeSystem(m, createLab('challenge'), S), S).events
    const done: LechatelierState = { ...full, systems: { ...full.systems, [S]: [...runs.slice(0, -1), { index: MAX_RUNS - 1, events: counted }] } }
    expect(can(m, done, { type: 'workAgain', system: S })).toBe('no-more-runs')
    // A run that has changed its prediction to and fro until the record is nearly full takes nothing more, and can be worked again.
    const flips = Array.from({ length: MAX_EVENTS - 1 }, (_, i): RunEvent => ({ t: 'predict', way: i % 2 === 0 ? 'left' : 'right' }))
    const long: LechatelierState = { ...createLab('challenge'), systems: { ...createLab('challenge').systems, [S]: [{ index: 0, events: flips }] } }
    expect(lechatelierStateSchema(m).safeParse(long).success).toBe(true)
    expect(can(m, long, { type: 'predict', system: S, way: 'none' })).toBe('run-too-long')
    expect(can(m, long, { type: 'act', system: S })).toBe('run-too-long')
    expect(can(m, long, { type: 'workAgain', system: S })).toBeNull()
  })
})

describe('the two modes', () => {
  it('Guided takes only an observation that is what the tube shows, and says which part is not', () => {
    const before = run(m, createLab('guided'), [{ type: 'predict', system: S, way: 'left' }, { type: 'act', system: S }, { type: 'act', system: S }, { type: 'act', system: S }, ...LOOK])
    const wrong = { solid: 'none', liquid: 'colourless' }
    expect(can(m, before, { type: 'observe', system: S, observation: wrong })).toBe('does-not-match')
    expect(reduce(m, before, { type: 'observe', system: S, observation: wrong })).toBe(before)
    expect(mismatch(m, before, S, wrong)).toEqual(['solid'])
    expect(mismatch(m, before, S, { solid: 'none', liquid: 'pink' })).toEqual(['solid', 'liquid'])
    expect(mismatch(m, before, S, { solid: 'white', liquid: 'colourless' })).toEqual([])
    const after = run(m, before, [{ type: 'observe', system: S, observation: { solid: 'white', liquid: 'colourless' } }])
    expect(view(after)).toMatchObject({ wrongFields: [], answerRight: null })
  })

  it('Guided takes only the right answer, and the wrong ones as often as they are tried', () => {
    let state = run(m, createLab('guided'), [{ type: 'predict', system: S, way: 'left' }, { type: 'act', system: S }, { type: 'act', system: S }, { type: 'act', system: S }, ...LOOK, { type: 'observe', system: S, observation: { solid: 'white', liquid: 'colourless' } }])
    for (const is of ['left', 'none', 'left']) {
      expect(can(m, state, { type: 'answer', system: S, is })).toBe('not-right')
      expect(reduce(m, state, { type: 'answer', system: S, is })).toBe(state)
    }
    state = run(m, state, [{ type: 'answer', system: S, is: 'right' }])
    expect(view(state)).toMatchObject({ status: 'done', answerRight: true, notesShown: true })
  })

  it('Guided never judges the prediction: any of the three goes on', () => {
    for (const way of ['left', 'right', 'none'] as const) expect(systemView(m, wholeSystem(m, createLab('guided'), S, { predict: way }), S).outcome).toEqual({ state: 'counts' })
  })

  it('Guided checks the system by itself when its last disturbance is done', () => {
    const state = wholeSystem(m, createLab('guided'), S, { check: false })
    expect(currentRun(state, S).events.at(-1)).toEqual({ t: 'check' })
    expect(systemView(m, state, S)).toMatchObject({ outcome: { state: 'counts' }, done: true })
  })

  it('Challenge takes whatever is recorded, says nothing of it, and checks when asked', () => {
    const state = wholeSystem(m, createLab('challenge'), S, { wrongSolidAt: 'lead-acid', wrongAnswerAt: 'lead-heat', check: false })
    expect(mismatch(m, state, S, { solid: 'none', liquid: 'pink' })).toEqual([])
    for (const d of systemView(m, state, S).disturbances) expect([d.wrongFields, d.answerRight]).toEqual([null, null])
    const checked = run(m, state, [{ type: 'checkSystem', system: S }])
    expect(systemView(m, checked, S).disturbances.map((d) => [d.wrongFields, d.answerRight])).toEqual([[['solid'], true], [[], false], [[], true], [[], true]])
  })

  it('can be changed at any time, and a run begun in one mode is finished in the other', () => {
    let state = workDisturbance(m, createLab('challenge'), S, { wrongAnswerAt: 'lead-acid' })
    expect(reduce(m, state, { type: 'setMode', mode: 'challenge' })).toBe(state)
    state = run(m, state, [{ type: 'setMode', mode: 'guided' }])
    // Guided judges what it is shown, as it stands: the answer Challenge took is marked.
    expect(view(state).answerRight).toBe(false)
    state = wholeSystem(m, state, S)
    expect(systemView(m, state, S).outcome).toEqual({ state: 'does-not-count', reasons: [{ kind: 'answer-wrong', disturbance: 'lead-acid' }] })
  })

  it('Guided takes no answer while an observation that Challenge recorded at the disturbance in hand is not what the tube shows: it is put right first, and the run then counts', () => {
    const wrong = { solid: 'none', liquid: 'colourless' }
    const recorded = run(m, createLab('challenge'), [{ type: 'predict', system: S, way: 'left' }, { type: 'act', system: S }, { type: 'act', system: S }, { type: 'act', system: S }, ...LOOK, { type: 'observe', system: S, observation: wrong }])
    // Challenge takes the answer on it, right or not.
    expect(can(m, recorded, { type: 'answer', system: S, is: 'right' })).toBeNull()
    const guided = run(m, recorded, [{ type: 'setMode', mode: 'guided' }])
    expect(view(guided).wrongFields).toEqual(['solid'])
    // Guided refuses the right answer and a wrong one alike, for the observation's sake, and so says nothing of the answer.
    for (const is of ['right', 'left', 'none']) {
      expect(can(m, guided, { type: 'answer', system: S, is })).toBe('does-not-match')
      expect(reduce(m, guided, { type: 'answer', system: S, is })).toBe(guided)
    }
    // The observation can still be recorded again; then the answer is taken, and the system counts.
    const right = run(m, guided, [{ type: 'observe', system: S, observation: { solid: 'white', liquid: 'colourless' } }])
    expect(can(m, right, { type: 'answer', system: S, is: 'left' })).toBe('not-right')
    expect(can(m, right, { type: 'answer', system: S, is: 'right' })).toBeNull()
    expect(systemView(m, wholeSystem(m, run(m, right, [{ type: 'answer', system: S, is: 'right' }]), S), S).outcome).toEqual({ state: 'counts' })
    // The stored shape takes a run that ended a disturbance on such an observation, as Challenge makes one: the mode is not in a run.
    const ended = run(m, recorded, [{ type: 'answer', system: S, is: 'right' }, { type: 'setMode', mode: 'guided' }])
    expect(lechatelierStateSchema(m).safeParse(JSON.parse(JSON.stringify(ended))).success).toBe(true)
  })
})

describe('a run as it is stored', () => {
  it('is the list of what was done, and works out to the same run every time', () => {
    const state = wholeSystem(m, createLab('challenge'), 'methyl-violet')
    const events = currentRun(state, 'methyl-violet').events
    expect(events.map((e) => e.t).join(' ')).toBe('predict act look look act look look observe answer predict act look look act look look observe answer check')
    const system = systemModel(m, 'methyl-violet')
    expect(replay(m, system, events as RunEvent[])).toEqual(runStateOf(m, 'methyl-violet', currentRun(state, 'methyl-violet')))
    expect(runStateOf(m, 'methyl-violet', currentRun(state, 'methyl-violet'))).toBe(runStateOf(m, 'methyl-violet', currentRun(state, 'methyl-violet')))
  })

  it('is refused by the schema where it could not have been made', () => {
    const schema = lechatelierStateSchema(m)
    const withEvents = (events: unknown[]): unknown => ({ ...createLab('guided'), systems: { ...createLab('guided').systems, [S]: [{ index: 0, events }] } })
    expect(schema.safeParse(createLab('guided')).success).toBe(true)
    // An action before its prediction; a look that changes nothing; an observation before the action is complete; an answer of the other question.
    for (const events of [[{ t: 'act' }], [{ t: 'look', at: 'liquid' }, { t: 'look', at: 'liquid' }], [{ t: 'predict', way: 'left' }, { t: 'act' }, { t: 'look', at: 'liquid' }, { t: 'look', at: 'bottom' }, { t: 'observe', solid: 'none', liquid: 'colourless' }], [{ t: 'check' }]]) {
      expect(schema.safeParse(withEvents(events)).success, JSON.stringify(events)).toBe(false)
    }
    // A status the runs do not give, a run out of its place, and a key the shape does not know.
    expect(schema.safeParse({ ...createLab('guided'), status: 'completed' }).success).toBe(false)
    expect(schema.safeParse({ ...createLab('guided'), systems: { ...createLab('guided').systems, cobalt: [{ index: 1, events: [] }] } }).success).toBe(false)
    expect(schema.safeParse({ ...createLab('guided'), seed: 1 }).success).toBe(false)
    expect(schema.safeParse(withEvents([{ t: 'predict', way: 'left', extra: true }])).success).toBe(false)
  })
})

describe('apply', () => {
  it('hands back the very same run where nothing changes, and a reason where a thing cannot be done', () => {
    const start = newRunState(lead)
    const looked = apply(m, lead, start, { t: 'look', at: 'liquid' })
    expect(apply(m, lead, looked as never, { t: 'look', at: 'liquid' })).toBe(looked)
    expect(apply(m, lead, start, { t: 'act' })).toBe('predict-first')
    expect(apply(m, lead, start, { t: 'check' })).toBe('not-all-done')
  })

  it('reads each tube from the model: before any press, after each, and at its end', () => {
    const [acid] = lead.disturbances
    expect([0, 1, 2, 3, 9].map((acted) => stageAt(acid!, acted).microlitres)).toEqual([1500, 1600, 1700, 1800, 1800])
    expect(shownAtEnd(acid!)).toEqual({ solid: 'white', liquid: 'colourless' })
  })
})
