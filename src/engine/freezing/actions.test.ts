import { describe, expect, it } from 'vitest'
import type { PartId } from '@/chem-data/freezing/data'
import { can, entryBlocked, reduce, type Action } from './actions'
import { PINNED_MODEL as m } from './pinnedModel'
import { partView } from './select'
import { createLab, currentRun, freezingStateSchema, newRun, type FreezingState } from './state'
import { entryActions, looks, run, typed, wholeLab, wholeRun, workCup, worksheetText } from './testkit'
import { FIELDS, NO_ENTRIES } from './worksheet'

// Every action: when it can be done, what it stores, and the stored shape it leaves (spec 23.2).
const fresh = (mode: 'guided' | 'challenge' = 'challenge') => createLab(1, mode)
const cup = (part: PartId, ...types: Action['type'][]) => run(m, fresh(), types.map((type) => ({ type, part }) as Action))
const blocked = (state: FreezingState, part: PartId, type: Action['type']) => can(m, state, { type, part } as Action)

describe('a new lab', () => {
  it('has one untouched run of each part, in progress, and holds its seed as a 32-bit whole number', () => {
    expect(fresh()).toEqual({ seed: 1, mode: 'challenge', status: 'in-progress', parts: { water: [newRun(0)], unknown: [newRun(0)], particles: [newRun(0)] } })
    expect(createLab(-1, 'guided').seed).toBe(4294967295)
    expect(newRun(2)).toEqual({ index: 2, solute: null, filled: false, lidFrom: null, stirFrom: null, logger: false, addedAt: null, steps: 0, strainedAt: null, weighedAt: null, looked: [], entries: NO_ENTRIES, closed: false })
  })
})

describe('the cup, in its order', () => {
  it('takes ice and water first: the lid, the stirrer and the logger wait for them', () => {
    for (const type of ['putLidOn', 'stir', 'startLogger'] as const) expect(blocked(fresh(), 'unknown', type), type).toBe('cup-empty')
    expect(blocked(fresh(), 'unknown', 'fill')).toBeNull()
    expect(blocked(cup('unknown', 'fill'), 'unknown', 'fill')).toBe('already-done')
    expect(blocked(cup('unknown', 'fill', 'putLidOn'), 'unknown', 'putLidOn')).toBe('already-done')
    expect(blocked(cup('unknown', 'fill', 'stir'), 'unknown', 'stir')).toBe('already-done')
    expect(blocked(cup('unknown', 'fill', 'startLogger'), 'unknown', 'startLogger')).toBe('already-done')
  })

  it('lets time pass only once the logger is started, two readings at a press, to the logger\'s last reading', () => {
    expect(blocked(cup('unknown', 'fill'), 'unknown', 'runOn')).toBe('logger-not-started')
    let state = cup('unknown', 'fill', 'startLogger')
    for (let press = 1; press <= m.maxSteps / m.runOnSteps; press++) {
      state = run(m, state, [{ type: 'runOn', part: 'unknown' }])
      expect(currentRun(state, 'unknown').steps).toBe(press * m.runOnSteps)
    }
    expect(blocked(state, 'unknown', 'runOn')).toBe('logger-full')
    expect(partView(m, state, 'unknown').graph).toMatchObject({ full: true })
    expect(partView(m, state, 'unknown').graph.readings).toHaveLength(m.maxSteps + 1)
  })

  it('adds the solute once the logger is started, once; part 1 has none, and part 3 wants one chosen first', () => {
    expect(blocked(cup('unknown', 'fill'), 'unknown', 'addSolute')).toBe('logger-not-started')
    expect(blocked(cup('water', 'fill', 'startLogger'), 'water', 'addSolute')).toBe('not-this-part')
    expect(blocked(cup('unknown', 'fill', 'startLogger', 'addSolute'), 'unknown', 'addSolute')).toBe('already-done')
    const part3 = cup('particles', 'fill', 'startLogger')
    expect(blocked(part3, 'particles', 'addSolute')).toBe('no-solute-chosen')
    expect(can(m, part3, { type: 'chooseSolute', part: 'particles', solute: 'sugar' })).toBe('unknown-solute')
    expect(can(m, fresh(), { type: 'chooseSolute', part: 'unknown', solute: 'urea' })).toBe('not-this-part')
    const chosen = run(m, part3, [{ type: 'chooseSolute', part: 'particles', solute: 'kcl' }])
    expect(partView(m, chosen, 'particles').bench).toMatchObject({ solute: 'kcl', solutionCg: null })
    // The choice can be changed until the solute is in, and each solute has its own mass on the balance.
    const changed = run(m, chosen, [{ type: 'chooseSolute', part: 'particles', solute: 'nabr' }])
    expect(partView(m, changed, 'particles').bench.soluteCg).not.toBe(partView(m, chosen, 'particles').bench.soluteCg)
    expect(reduce(m, changed, { type: 'chooseSolute', part: 'particles', solute: 'nabr' })).toBe(changed)
    expect(can(m, run(m, changed, [{ type: 'addSolute', part: 'particles' }]), { type: 'chooseSolute', part: 'particles', solute: 'urea' })).toBe('solute-in')
  })

  it('strains and weighs only a cup with the solute in and a reading since; after the strainer the logger takes no reading, and after the balance the cup is done', () => {
    expect(blocked(cup('unknown', 'fill', 'startLogger'), 'unknown', 'strain')).toBe('solute-not-added')
    expect(blocked(cup('unknown', 'fill', 'startLogger'), 'unknown', 'weigh')).toBe('solute-not-added')
    expect(blocked(cup('water', 'fill', 'startLogger', 'runOn'), 'water', 'strain')).toBe('not-this-part')
    expect(blocked(cup('water', 'fill', 'startLogger', 'runOn'), 'water', 'weigh')).toBe('not-this-part')
    const strained = cup('unknown', 'fill', 'startLogger', 'addSolute', 'runOn', 'strain')
    expect(currentRun(strained, 'unknown')).toMatchObject({ addedAt: 0, steps: 2, strainedAt: 2, weighedAt: null })
    for (const type of ['runOn', 'putLidOn', 'stir'] as const) expect(blocked(strained, 'unknown', type), type).toBe('cup-strained')
    expect(blocked(strained, 'unknown', 'strain')).toBe('already-done')
    const weighed = run(m, strained, [{ type: 'weigh', part: 'unknown' }])
    for (const type of ['fill', 'putLidOn', 'stir', 'startLogger', 'addSolute', 'runOn', 'strain', 'weigh'] as const) expect(blocked(weighed, 'unknown', type), type).toBe('cup-weighed')
    expect(partView(m, weighed, 'unknown').cup).toMatchObject({ strained: true, weighed: true })
    // Unstrained, the balance shows the ice too.
    const iced = cup('unknown', 'fill', 'startLogger', 'addSolute', 'runOn', 'weigh')
    expect(partView(m, iced, 'unknown').bench.solutionCg! - partView(m, weighed, 'unknown').bench.solutionCg!).toBeGreaterThan(1500)
    expect(partView(m, iced, 'unknown').graph.endedAt).toBe(2)
  })

  it('stores when the lid went on and the stirrer started, as steps of the logger', () => {
    const state = run(m, cup('unknown', 'fill', 'startLogger', 'runOn', 'putLidOn', 'runOn', 'stir'), [])
    expect(currentRun(state, 'unknown')).toMatchObject({ lidFrom: 2, stirFrom: 4, steps: 4 })
    expect(partView(m, state, 'unknown').cup).toMatchObject({ filled: true, lidOn: true, stirring: true, loggerStarted: true, soluteAdded: false, ice: 'plenty' })
    expect(partView(m, fresh(), 'unknown').cup.ice).toBe('not-yet')
    expect(partView(m, cup('unknown', 'fill'), 'unknown').cup.ice).toBe('plenty')
  })
})

describe('looking at the graph', () => {
  it('is stored once for each reading, and only a reading the logger has taken can be looked at', () => {
    let state = cup('unknown', 'fill', 'startLogger', 'runOn')
    expect(can(m, fresh(), { type: 'look', part: 'unknown', step: 0 })).toBe('logger-not-started')
    for (const step of [3, -1, 1.5, NaN]) expect(can(m, state, { type: 'look', part: 'unknown', step }), `${step}`).toBe('nothing-there')
    state = run(m, state, [{ type: 'look', part: 'unknown', step: 2 }, { type: 'look', part: 'unknown', step: 0 }])
    expect(currentRun(state, 'unknown').looked).toEqual([2, 0])
    expect(reduce(m, state, { type: 'look', part: 'unknown', step: 2 })).toBe(state)
  })
})

describe('the notebook', () => {
  const ready = (part: PartId, mode: 'guided' | 'challenge' = 'challenge') => workCup(m, createLab(1, mode), part)

  it('opens when the solution is weighed, and in part 1 when the logger is started; each temperature waits for a look at a reading that shows it', () => {
    expect(entryBlocked(m, fresh(), 'unknown', 'water')).toBe('logger-not-started')
    expect(entryBlocked(m, cup('unknown', 'fill', 'startLogger', 'addSolute', 'runOn'), 'unknown', 'water')).toBe('not-weighed')
    const state = ready('unknown')
    expect(partView(m, state, 'unknown').worksheet.map((entry) => entry.blocked)).toEqual(['not-looked', ...Array(7).fill('entry-above-missing')])
    const [first, last] = looks(m, state, 'unknown')
    // A look after the solute does not open the first temperature, nor one before it the second.
    const lookedLast = run(m, state, [last!])
    expect(entryBlocked(m, lookedLast, 'unknown', 'water')).toBe('not-looked')
    const lookedFirst = run(m, state, [first!])
    expect(entryBlocked(m, lookedFirst, 'unknown', 'water')).toBeNull()
    const text = worksheetText(m, state, 'unknown')
    const one = run(m, lookedFirst, [{ type: 'enter', part: 'unknown', field: 'water', value: typed('water', text.water) }])
    expect(entryBlocked(m, one, 'unknown', 'solution')).toBe('not-looked')
    expect(entryBlocked(m, run(m, one, [last!]), 'unknown', 'solution')).toBeNull()
    expect(entryBlocked(m, state, 'unknown', 'ratio')).toBe('not-this-part')
    const part1 = cup('water', 'fill', 'startLogger', 'runOn')
    expect(entryBlocked(m, part1, 'water', 'water')).toBe('not-looked')
    expect(entryBlocked(m, run(m, part1, [{ type: 'look', part: 'water', step: 2 }]), 'water', 'water')).toBeNull()
  })

  it('takes only a value of the kind its field is written as, and closes the cup once it has an entry', () => {
    let state = ready('unknown')
    state = run(m, state, looks(m, state, 'unknown'))
    for (const value of [1.5, '0.12', NaN, 10000, -0, { mantissa: 100, exponent: 0 }]) expect(can(m, state, { type: 'enter', part: 'unknown', field: 'water', value: value as never }), String(value)).toBe('invalid-entry')
    const actions = entryActions('unknown', worksheetText(m, state, 'unknown'))
    state = run(m, state, actions.slice(0, 4))
    expect(can(m, state, { type: 'enter', part: 'unknown', field: 'molality', value: 86 })).toBe('invalid-entry')
    state = run(m, state, actions.slice(4, 7))
    expect(can(m, state, { type: 'enter', part: 'unknown', field: 'liquid', value: 'water' })).toBe('invalid-entry')
    expect(partView(m, state, 'unknown').cup.worksheetBegun).toBe(true)
  })

  it('empties the entries after one that is changed: they were worked from it', () => {
    let state = ready('unknown')
    state = run(m, state, looks(m, state, 'unknown'))
    const actions = entryActions('unknown', worksheetText(m, state, 'unknown'))
    state = run(m, state, actions)
    expect(Object.values(currentRun(state, 'unknown').entries).filter((entry) => entry !== null)).toHaveLength(8)
    state = run(m, state, [actions[3]!])
    expect(FIELDS.unknown.map((field) => currentRun(state, 'unknown').entries[field] !== null)).toEqual([true, true, true, true, false, false, false, false])
    expect(can(m, state, { type: 'check', part: 'unknown' })).toBe('worksheet-not-full')
  })

  it('is checked by the learner in Challenge, and by its last entry in Guided; a checked run is over', () => {
    let challenge = ready('unknown')
    challenge = run(m, challenge, looks(m, challenge, 'unknown'))
    challenge = run(m, challenge, entryActions('unknown', worksheetText(m, challenge, 'unknown')))
    expect(currentRun(challenge, 'unknown').closed).toBe(false)
    expect(partView(m, challenge, 'unknown').worksheet.every((entry) => entry.verdict === null)).toBe(true)
    challenge = run(m, challenge, [{ type: 'check', part: 'unknown' }])
    expect(currentRun(challenge, 'unknown').closed).toBe(true)
    expect(partView(m, challenge, 'unknown').worksheet.every((entry) => entry.verdict?.follows === true)).toBe(true)
    expect(can(m, challenge, { type: 'check', part: 'unknown' })).toBe('run-over')
    expect(can(m, challenge, { type: 'runOn', part: 'unknown' })).toBe('run-over')
    expect(entryBlocked(m, challenge, 'unknown', 'water')).toBe('run-over')
    let guided = ready('unknown', 'guided')
    guided = run(m, guided, looks(m, guided, 'unknown'))
    const actions = entryActions('unknown', worksheetText(m, guided, 'unknown'))
    guided = run(m, guided, actions.slice(0, 2))
    // In Guided each entry made says at once that it follows.
    expect(partView(m, guided, 'unknown').worksheet.slice(0, 3).map((entry) => entry.verdict)).toEqual([{ follows: true, slip: null }, { follows: true, slip: null }, null])
    guided = run(m, guided, actions.slice(2))
    expect(currentRun(guided, 'unknown').closed).toBe(true)
  })

  it('refuses in Guided, where it is made, an entry that does not follow, and says what kind of slip it looks like where it knows', () => {
    let state = ready('unknown', 'guided')
    state = run(m, state, looks(m, state, 'unknown'))
    const text = worksheetText(m, state, 'unknown')
    const enter = (field: (typeof FIELDS.unknown)[number], value: string) => can(m, state, { type: 'enter', part: 'unknown', field, value: typed(field, value) })
    expect(enter('water', '9.99')).toBe('not-the-logger')
    state = run(m, state, entryActions('unknown', text).slice(0, 2))
    expect(enter('fall', '9.99')).toBe('does-not-follow')
    state = run(m, state, entryActions('unknown', text).slice(2, 3))
    expect(enter('waterKg', '0.50000')).toBe('does-not-follow')
    expect(reduce(m, state, { type: 'enter', part: 'unknown', field: 'waterKg', value: 50000 })).toBe(state)
    // Challenge takes the same entry and marks it when the notebook is checked.
    expect(can(m, { ...state, mode: 'challenge' }, { type: 'enter', part: 'unknown', field: 'waterKg', value: 50000 })).toBeNull()
  })
})

describe('running a part again', () => {
  it('leaves the run before as it was and sets the part up with new numbers, once there is something to leave', () => {
    expect(blocked(fresh(), 'unknown', 'runAgain')).toBe('nothing-to-repeat')
    const first = wholeRun(m, fresh(), 'unknown', { strain: false })
    const again = run(m, first, [{ type: 'runAgain', part: 'unknown' }])
    expect(again.parts.unknown).toHaveLength(2)
    expect(again.parts.unknown[0]).toBe(first.parts.unknown[0])
    expect(again.parts.unknown[1]).toEqual(newRun(1))
    expect(partView(m, again, 'unknown')).toMatchObject({ runs: 2, outcome: { state: 'open' } })
    expect(partView(m, again, 'unknown').bench.soluteCg).not.toBe(partView(m, first, 'unknown').bench.soluteCg)
  })

  it('returns the very same state for an action that cannot be done, and takes no part it does not have', () => {
    const state = fresh()
    expect(reduce(m, state, { type: 'runOn', part: 'unknown' })).toBe(state)
    expect(reduce(m, state, { type: 'setMode', mode: 'challenge' })).toBe(state)
    expect(reduce(m, state, { type: 'setMode', mode: 'guided' }).mode).toBe('guided')
    expect(can(m, state, { type: 'fill', part: 'ice' as never })).toBe('unknown-part')
  })
})

describe('the stored shape', () => {
  const schema = freezingStateSchema(m)
  const done = wholeLab(m, createLab(5, 'guided'))
  const edited = (edit: (state: FreezingState) => void) => {
    const state: FreezingState = JSON.parse(JSON.stringify(done))
    edit(state)
    return schema.safeParse(state)
  }

  it('takes every state the reducer makes, and gives it back unchanged', () => {
    expect(schema.parse(JSON.parse(JSON.stringify(done)))).toEqual(done)
    expect(schema.parse(fresh())).toEqual(fresh())
    expect(schema.parse(workCup(m, fresh(), 'particles', { solute: 'nabr', strain: false }))).toBeDefined()
  })

  it('holds its literal bounds to the model: the logger\'s last step is the model\'s', () => {
    expect(schema.safeParse({ ...fresh(), parts: { ...fresh().parts, water: [{ ...newRun(0), filled: true, logger: true, steps: m.maxSteps }] } }).success).toBe(true)
    expect(schema.safeParse({ ...fresh(), parts: { ...fresh().parts, water: [{ ...newRun(0), filled: true, logger: true, steps: m.maxSteps + 1 }] } }).success).toBe(false)
  })

  it('refuses what the reducer would not have stored', () => {
    const refusals: [string, (state: FreezingState) => void][] = [
      ['a status the runs do not give', (s) => void (s.status = 'in-progress')],
      ["a run whose index is not its place", (s) => void (s.parts.unknown[0]!.index = 3)],
      ['a solute outside part 3', (s) => void (s.parts.unknown[0]!.solute = 'urea')],
      ['a solute the bench does not have', (s) => void (s.parts.particles[0]!.solute = 'sugar')],
      ['a logger started on an empty cup', (s) => void (s.parts.water[0]!.filled = false)],
      ['a step the logger has not reached', (s) => void (s.parts.unknown[0]!.lidFrom = 59)],
      ['a look at a reading not taken', (s) => void s.parts.unknown[0]!.looked.push(60)],
      ['a reading looked at twice', (s) => void s.parts.unknown[0]!.looked.push(s.parts.unknown[0]!.looked[0]!)],
      ['a solute added in part 1', (s) => void (s.parts.water[0]!.addedAt = 0)],
      ['a cup strained before its solute went in', (s) => void (s.parts.unknown[0]!.strainedAt = 0)],
      ['a cup weighed at another reading than it was strained at', (s) => void (s.parts.unknown[0]!.weighedAt = s.parts.unknown[0]!.steps - 2)],
      ["another part's entry", (s) => void (s.parts.unknown[0]!.entries.ratio = { mantissa: 100, exponent: -2 })],
      ['an entry with an empty one above it', (s) => void (s.parts.unknown[0]!.entries.fall = null)],
      ['a liquid that is not of the table', (s) => void (s.parts.unknown[0]!.entries.liquid = 'water')],
      ['a number of two figures', (s) => void (s.parts.unknown[0]!.entries.molality = { mantissa: 86, exponent: -2 })],
      ['a key it does not know', (s) => void ((s as unknown as Record<string, unknown>).extra = 1)],
    ]
    for (const [what, edit] of refusals) expect(edited(edit).success, what).toBe(false)
    // An entry before the cup is finished, and a checked notebook with an entry missing.
    const early = run(m, fresh(), [{ type: 'fill', part: 'unknown' }, { type: 'startLogger', part: 'unknown' }])
    expect(schema.safeParse({ ...early, parts: { ...early.parts, unknown: [{ ...early.parts.unknown[0]!, entries: { ...NO_ENTRIES, water: 12 } }] } }).success).toBe(false)
    expect(schema.safeParse({ ...early, parts: { ...early.parts, unknown: [{ ...early.parts.unknown[0]!, closed: true }] } }).success).toBe(false)
  })
})
