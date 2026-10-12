import { describe, expect, it } from 'vitest'
import type { SaltId } from '@/chem-data/hotcold/data'
import { readings } from '../calorimetry/cup'
import { PINNED_MODEL as CALORIMETRY } from '../calorimetry/pinnedModel'
import { can, entryBlocked, reduce, type Action } from './actions'
import { formatTenths, parseChange, parseTemperature } from './entries'
import { cupModel } from './model'
import { PINNED_MODEL as m } from './pinnedModel'
import { runView } from './select'
import { runSetup } from './setup'
import { answerTo, createLab, currentRun, hotcoldStateSchema, readingsOf, type HotcoldState } from './state'
import { entryActions, looks, notebookValues, run, wholeLab, wholeRun, workCup } from './testkit'
import { FIELDS, verdictOf } from './worksheet'

const E: SaltId = 'epsom-salt'
const schema = hotcoldStateSchema(m)
const refused = (state: unknown) => schema.safeParse(state).error?.issues.map((issue) => issue.message) ?? []
const edit = (state: HotcoldState, change: (copy: HotcoldState) => void): HotcoldState => {
  const copy: HotcoldState = JSON.parse(JSON.stringify(state))
  change(copy)
  return copy
}

describe('the cup', () => {
  it("is the calorimetry lab's, stepped with this lab's salt: the same recurrence gives the readings, and that lab's own numbers are not touched", () => {
    const state = workCup(m, createLab(7, 'challenge'), E)
    const one = currentRun(state, E)
    const setup = runSetup(m, 7, E, 0)
    expect(readingsOf(m, 7, E, one)).toEqual(readings(cupModel(m, E), 'dissolving', { metalIndex: 0 }, { ...setup, metalCg: 0, bathTenths: 0 }, { lidFrom: one.lidFrom, stirFrom: one.stirFrom, changedAt: one.changedAt, steps: one.steps }))
    for (const key of ['mixStirredPpm', 'mixStillPpm', 'lossLidOnPpm', 'lossLidOffPpm', 'stepSeconds', 'runOnSteps', 'maxSteps', 'specificHeatE2', 'densityE2', 'waterTenthMl'] as const) expect(cupModel(m, E)[key], key).toBe(CALORIMETRY[key])
    expect(CALORIMETRY.solutionJ).toBe(24405)
  })

  it('worked by hand for one seed: the full change, and the first readings after the salt', () => {
    const { startTenths, saltCg } = runSetup(m, 7, E, 0)
    // Moles = mass / molar mass; heat = moles x 17 560 J; the water and the salt together warm or cool as their mass x 4.18.
    const full = -((saltCg / 100 / 246.47) * 17560) / ((50 + saltCg / 100) * 4.18)
    const shown = readingsOf(m, 7, E, currentRun(workCup(m, createLab(7, 'challenge'), E), E))
    expect(shown.slice(0, 3)).toEqual([startTenths, startTenths, startTenths])
    // After one stirred step with the lid on: 85% of the change, less half a percent of it lost to the room.
    expect(shown[3]).toBe(Math.round(startTenths + full * 10 * 0.85 * 0.995))
    expect(Math.min(...shown)).toBeGreaterThan(startTenths + full * 10 - 0.5)
  })

  it('takes its readings from nothing but the seed and what was done: none before the logger is started, and none it has not yet taken', () => {
    expect(runView(m, createLab(1, 'guided'), E).graph.readings).toEqual([])
    const started = run(m, createLab(1, 'guided'), [{ type: 'startLogger', part: E }, { type: 'runOn', part: E }])
    expect(runView(m, started, E).graph.readings).toHaveLength(1 + m.runOnSteps)
  })
})

describe('what is typed', () => {
  it('is read from its characters, to a tenth of a degree, and written back the same', () => {
    expect([parseTemperature('21.4'), parseTemperature('21'), parseTemperature('21.45'), parseChange('-2.8'), parseChange('−2.8'), parseChange('2.8')]).toEqual([214, null, null, -28, -28, 28])
    expect([formatTenths(214), formatTenths(-28), formatTenths(5), formatTenths(120)]).toEqual(['21.4', '-2.8', '0.5', '12.0'])
  })
})

describe('the notebook', () => {
  it('asks its six entries in the order of spec 26.2, and each follows from the ones above it', () => {
    expect(FIELDS).toEqual(['start', 'extreme', 'change', 'temperature', 'heat', 'word'])
    const shown = { start: 220, extreme: 192 }
    const entries = { start: 220, extreme: 192, change: 28, temperature: 'colder', heat: 'in', word: 'endothermic' } as const
    for (const field of FIELDS) expect(verdictOf(m, shown, entries, field), field).toEqual({ follows: true, slip: null })
    expect(verdictOf(m, shown, { ...entries, change: -28 }, 'change')?.follows).toBe(true)
    expect(verdictOf(m, shown, { ...entries, temperature: 'warmer' }, 'temperature')?.follows).toBe(false)
    // An entry is held to the learner's own entry above it: after "warmer", "gave heat out" follows, and the slip above is the one marked.
    expect(verdictOf(m, shown, { ...entries, temperature: 'warmer', heat: 'out' }, 'heat')?.follows).toBe(true)
    expect(verdictOf(m, shown, { ...entries, heat: 'out' }, 'heat')?.follows).toBe(false)
    expect(verdictOf(m, shown, { ...entries, word: 'exothermic' }, 'word')?.follows).toBe(false)
    expect(verdictOf(m, shown, { ...entries, start: 221 }, 'start')?.follows).toBe(false)
    expect(verdictOf(m, shown, { ...entries, heat: null }, 'word')).toBeNull()
  })

  it('opens once the salt is in and the curve has turned back, and each temperature once its reading has been looked at', () => {
    let state = run(m, createLab(2, 'guided'), [{ type: 'putLidOn', part: E }, { type: 'stir', part: E }, { type: 'startLogger', part: E }])
    expect(entryBlocked(m, state, E, 'start')).toBe('salt-not-added')
    state = run(m, state, [{ type: 'addSalt', part: E }, { type: 'runOn', part: E }])
    expect(entryBlocked(m, state, E, 'start')).toBe('not-turned')
    while (!runView(m, state, E).graph.turned) state = run(m, state, [{ type: 'runOn', part: E }])
    expect(entryBlocked(m, state, E, 'start')).toBe('not-looked')
    const [before, lowest] = looks(m, state, E) as [Action, Action]
    state = run(m, state, [before])
    expect([entryBlocked(m, state, E, 'start'), entryBlocked(m, state, E, 'extreme')]).toEqual([null, 'entry-above-missing'])
    const values = notebookValues(m, state, E)
    state = run(m, state, [{ type: 'enter', part: E, field: 'start', value: values.start }])
    expect(entryBlocked(m, state, E, 'extreme')).toBe('not-looked')
    // The cup is left as it is once the notebook is begun.
    expect(can(m, state, { type: 'runOn', part: E })).toBe('notebook-begun')
    state = run(m, state, [lowest])
    expect(entryBlocked(m, state, E, 'extreme')).toBeNull()
  })

  it('empties the entries under one that is changed, and refuses what is not written as its entry is', () => {
    const cup = workCup(m, createLab(2, 'challenge'), E)
    const values = notebookValues(m, cup, E)
    let state = run(m, cup, [...looks(m, cup, E), ...entryActions(E, values)])
    state = run(m, state, [{ type: 'enter', part: E, field: 'change', value: values.change }])
    expect(currentRun(state, E).entries).toMatchObject({ change: values.change, temperature: null, heat: null, word: null })
    expect(can(m, state, { type: 'check', part: E })).toBe('notebook-not-full')
    expect(can(m, state, { type: 'enter', part: E, field: 'temperature', value: 'hotter' })).toBe('invalid-entry')
    expect(can(m, state, { type: 'enter', part: E, field: 'change', value: 2.8 })).toBe('invalid-entry')
    expect(can(m, state, { type: 'enter', part: E, field: 'change', value: -0 })).toBe('invalid-entry')
  })
})

describe('what cannot be done', () => {
  it('says why, each time', () => {
    const fresh = createLab(3, 'guided')
    expect(can(m, fresh, { type: 'addSalt', part: E })).toBe('logger-not-started')
    expect(can(m, fresh, { type: 'runOn', part: E })).toBe('logger-not-started')
    expect(can(m, fresh, { type: 'runAgain', part: E })).toBe('nothing-to-repeat')
    expect(can(m, fresh, { type: 'look', part: E, step: 0 })).toBe('logger-not-started')
    expect(can(m, fresh, { type: 'putLidOn', part: 'packs' as SaltId })).toBe('unknown-part')
    expect(can(m, fresh, { type: 'checkPacks' })).toBe('runs-not-done')
    const lid = run(m, fresh, [{ type: 'putLidOn', part: E }, { type: 'startLogger', part: E }])
    expect(can(m, lid, { type: 'putLidOn', part: E })).toBe('already-done')
    expect(can(m, lid, { type: 'look', part: E, step: 1 })).toBe('nothing-there')
    expect(reduce(m, lid, { type: 'putLidOn', part: E })).toBe(lid)
    const over = wholeRun(m, fresh, E)
    expect(can(m, over, { type: 'stir', part: E })).toBe('run-over')
    expect(can(m, over, { type: 'check', part: E })).toBe('run-over')
    const done = wholeLab(m, fresh)
    for (const action of [{ type: 'runAgain', part: E }, { type: 'answerAgain' }, { type: 'look', part: E, step: 0 }] as Action[]) expect(can(m, done, action)).toBe('lab-completed')
    expect(can(m, done, { type: 'setMode', mode: 'challenge' })).toBeNull()
  })

  it('answers part 3 from the signs of the two enthalpies, which are stored nowhere else', () => {
    expect([answerTo(m, 'warms'), answerTo(m, 'cools')]).toEqual(['calcium-chloride', 'epsom-salt'])
    const turned = { ...m, salts: { 'epsom-salt': { ...m.salts['epsom-salt'], solutionJ: -85440 }, 'calcium-chloride': { ...m.salts['calcium-chloride'], solutionJ: 15000 } } }
    expect([answerTo(turned, 'warms'), answerTo(turned, 'cools')]).toEqual(['epsom-salt', 'calcium-chloride'])
  })
})

describe('the stored record', () => {
  const done = wholeLab(m, createLab(8, 'challenge'))

  it('is taken as the reducer leaves it, at Start and when the lab is complete', () => {
    expect(refused(createLab(8, 'guided'))).toEqual([])
    expect(refused(done)).toEqual([])
    expect(done.status).toBe('completed')
  })

  it('holds its bounds to the model', () => {
    expect(refused(edit(done, (s) => void (s.runs[E][0]!.steps = m.maxSteps + 1)))).not.toEqual([])
    expect(refused(edit(createLab(8, 'guided'), (s) => void (s.seed = 2 ** 32)))).not.toEqual([])
  })

  it('refuses what the reducer would not have stored', () => {
    const cases: [string, (s: HotcoldState) => void][] = [
      ["a run's index is its place in the list", (s) => void (s.runs[E][0]!.index = 4)],
      ['the logger was not started', (s) => void (s.runs[E][0]!.logger = false)],
      ['a step the logger has not reached', (s) => void s.runs[E][0]!.looked.push(200)],
      ['each reading once', (s) => void s.runs[E][0]!.looked.push(s.runs[E][0]!.looked[0]!)],
      ['the entries in their order, none skipped', (s) => void (s.runs[E][0]!.entries.change = null)],
      ['a notebook is checked when every entry is made', (s) => void (s.runs[E][0]!.entries.word = null)],
      ['the status is not the one the runs and the answers give', (s) => void (s.status = 'in-progress')],
      ['part 3 is checked once both questions are answered', (s) => void (s.packs.cools = null)],
      ['part 3 is answered once both runs count', (s) => void (s.runs[E][0]!.entries.word = 'exothermic')],
    ]
    for (const [message, change] of cases) expect(refused(edit(done, change)), message).toContain(message)
    expect(refused(edit(done, (s) => void ((s.packs as Record<string, unknown>).warms = 'table-salt')))).not.toEqual([])
    expect(refused({ ...done, extra: 1 })).not.toEqual([])
    expect(refused(edit(createLab(8, 'guided'), (s) => void (s.runs[E][0]!.entries.start = 210)))).toContain('nothing is entered before the salt is added')
  })
})
