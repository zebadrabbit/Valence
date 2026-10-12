import { describe, expect, it } from 'vitest'
import { parseDecimal } from '../figures'
import { can, entryBlocked, reduce, warnings, type Action } from './actions'
import { PINNED_MODEL as m } from './pinnedModel'
import { partView } from './select'
import { createLab, currentRun, type DensityState } from './state'
import { readingOf, run, takeReadings, wholeRun, workedValue, workOut } from './testkit'
import type { Field, Value } from './worksheet'

const typed = (text: string) => parseDecimal(text)!
const guided = (seed = 1) => createLab(seed, 'guided')
const challenge = (seed = 1) => createLab(seed, 'challenge')
const read = (state: DensityState, part: 'reading' | 'liquid' | 'metal', field: Field, off = 0): Action => ({ type: 'enter', part, field, value: readingOf(m, state, part, field, off) })
const level: Action = { type: 'moveEye', part: 'liquid', eye: 'level' }

describe('part 1: reading instruments', () => {
  it('begins with the eye above the cylinder, every reading open, and nothing to work out yet', () => {
    const state = guided()
    expect(currentRun(state, 'reading').eye).toBe('above')
    const blocked = Object.fromEntries(partView(m, state, 'reading').notebook.map((e) => [e.field, e.blocked]))
    expect(blocked).toEqual({ lengthCm: null, widthCm: null, lengthMm: null, widthMm: null, firstVolume: null, temperature: null, firstMass: null, areaCm: 'entry-above-missing', areaMm: 'entry-above-missing', thermometerOff: 'entry-above-missing' })
  })

  it('takes the readings in any order, and opens a worked-out entry when what it is worked from is in', () => {
    let state = guided()
    state = run(m, state, [read(state, 'reading', 'firstMass'), read(state, 'reading', 'temperature')])
    expect(entryBlocked(m, state, 'reading', 'thermometerOff')).toBeNull()
    expect(entryBlocked(m, state, 'reading', 'areaCm')).toBe('entry-above-missing')
    state = run(m, state, [read(state, 'reading', 'widthCm')])
    expect(entryBlocked(m, state, 'reading', 'areaCm')).toBe('entry-above-missing')
    state = run(m, state, [read(state, 'reading', 'lengthCm')])
    expect(entryBlocked(m, state, 'reading', 'areaCm')).toBeNull()
  })

  it('has no bench to work: nothing is weighed, poured or added', () => {
    const state = guided()
    for (const action of [{ type: 'weigh', part: 'reading' }, { type: 'pour', part: 'reading' }, { type: 'addPieces', part: 'reading', how: 'slide' }] as const) expect(can(m, state, action)).toBe('not-this-part')
    expect(can(m, state, { type: 'enter', part: 'reading', field: 'emptyMass', value: 7000 })).toBe('not-this-part')
  })
})

describe('the eye and a level (spec 22.2)', () => {
  it('reads a level from where the eye is: the action cannot say otherwise', () => {
    const state = guided()
    const shown = readingOf(m, state, 'reading', 'firstVolume')
    expect(shown).toMatchObject({ eye: 'above' })
    expect(can(m, state, { type: 'enter', part: 'reading', field: 'firstVolume', value: { value: (shown as { value: number }).value, eye: 'level' } })).toBe('invalid-entry')
    expect(can(m, state, { type: 'enter', part: 'reading', field: 'firstVolume', value: 300 })).toBe('invalid-entry')
  })

  it('shows the level half a millilitre higher from above and lower from below, and where it is with the eye level', () => {
    let state = guided()
    const at = () => partView(m, state, 'reading').bench.cylinder.scale!.atE3
    const above = at()
    state = run(m, state, [{ type: 'moveEye', part: 'reading', eye: 'level' }])
    const true_ = at()
    state = run(m, state, [{ type: 'moveEye', part: 'reading', eye: 'below' }])
    expect([above - true_, at() - true_]).toEqual([500, -500])
    expect(reduce(m, state, { type: 'moveEye', part: 'reading', eye: 'below' })).toBe(state)
    expect(can(m, state, { type: 'moveEye', part: 'reading', eye: 'sideways' as 'level' })).toBe('invalid-entry')
  })

  it('warns in Guided before a level is read from above or below, takes it when it is sent again, and the run then does not count', () => {
    let state = guided()
    const fromAbove = read(state, 'reading', 'firstVolume')
    expect(can(m, state, fromAbove)).toBeNull()
    expect(warnings(m, state, fromAbove)).toEqual(['eye-above'])
    state = run(m, state, [{ type: 'moveEye', part: 'reading', eye: 'below' }])
    expect(warnings(m, state, read(state, 'reading', 'firstVolume'))).toEqual(['eye-below'])
    state = wholeRun(m, guided(), 'reading', { eye: 'above' })
    expect(partView(m, state, 'reading').outcome).toEqual({ state: 'does-not-count', reasons: ['eye-not-level'], percentOff: null })
    expect(partView(m, state, 'reading').notebook.find((e) => e.field === 'firstVolume')!.verdict).toEqual({ follows: false, slip: 'eye-above' })
  })

  it('does not warn in Challenge, nor with the eye level', () => {
    const state = challenge()
    expect(warnings(m, state, read(state, 'reading', 'firstVolume'))).toEqual([])
    const levelled = run(m, guided(), [{ type: 'moveEye', part: 'reading', eye: 'level' }])
    expect(warnings(m, levelled, read(levelled, 'reading', 'firstVolume'))).toEqual([])
  })
})

describe('Guided checks each entry as it is made (spec 22.3)', () => {
  it('refuses a reading that is not what its instrument shows from where the eye is, and takes one within the allowance', () => {
    let state = run(m, guided(), [{ type: 'moveEye', part: 'reading', eye: 'level' }])
    for (const field of ['lengthMm', 'firstVolume', 'temperature'] as const) {
      expect(can(m, state, read(state, 'reading', field, 3)), field).toBe('not-what-is-shown')
      expect(can(m, state, read(state, 'reading', field, 2)), field).toBeNull()
      expect(can(m, state, read(state, 'reading', field, -2)), field).toBeNull()
    }
    // On the centimetre ruler the edge stands anywhere between two tenths, so the allowance is counted from the edge: here 13.84 cm, which takes 13.7 to 14.0.
    expect([-2, -1, 0, 1, 2, 3].map((off) => can(m, state, read(state, 'reading', 'lengthCm', off)))).toEqual(['not-what-is-shown', null, null, null, null, 'not-what-is-shown'])
    // The balance shows its figures: a mass is copied exactly.
    const shown = readingOf(m, state, 'reading', 'firstMass') as number
    expect([shown - 1, shown, shown + 1].map((value) => can(m, state, { type: 'enter', part: 'reading', field: 'firstMass', value }))).toEqual(['not-what-is-shown', null, 'not-what-is-shown'])
    // With the eye above, what is shown is the level as it looks from there: the true level is refused.
    state = run(m, state, [{ type: 'moveEye', part: 'reading', eye: 'above' }])
    const seen = readingOf(m, state, 'reading', 'firstVolume') as { value: number }
    expect(can(m, state, { type: 'enter', part: 'reading', field: 'firstVolume', value: { value: seen.value - 5, eye: 'above' } })).toBe('not-what-is-shown')
    expect(reduce(m, state, { type: 'enter', part: 'reading', field: 'firstVolume', value: { value: seen.value - 5, eye: 'above' } })).toBe(state)
  })

  it('refuses a worked-out entry with the slip it looks like, which names the rule it broke', () => {
    let state = takeReadings(m, guided(), 'liquid')
    const mass = workedValue(m, state, 'liquid', 'liquidMass') as { mantissa: number; exponent: number }
    const enter = (field: Field, value: Value): Action => ({ type: 'enter', part: 'liquid', field, value })
    expect(can(m, state, enter('liquidMass', { mantissa: mass.mantissa * 10, exponent: -3 }))).toBe('decimals-too-many')
    expect(can(m, state, enter('liquidMass', workedValue(m, state, 'liquid', 'liquidMass', 'decimals-too-few')))).toMatch(/^(decimals-too-few|does-not-follow)$/)
    expect(can(m, state, enter('liquidMass', { mantissa: mass.mantissa + 1, exponent: -2 }))).toBe('does-not-follow')
    state = run(m, state, [enter('liquidMass', mass)])
    expect(can(m, state, enter('liquidDensity', workedValue(m, state, 'liquid', 'liquidDensity', 'figures-too-many')))).toBe('figures-too-many')
    expect(can(m, state, enter('liquidDensity', workedValue(m, state, 'liquid', 'liquidDensity', 'figures-too-few')))).toBe('figures-too-few')
    expect(can(m, state, enter('liquidDensity', workedValue(m, state, 'liquid', 'liquidDensity', 'upside-down')))).toBe('upside-down')
    state = run(m, state, [enter('liquidDensity', workedValue(m, state, 'liquid', 'liquidDensity'))])
    expect(can(m, state, enter('liquid', workedValue(m, state, 'liquid', 'liquid', 'wrong-name')))).toBe('does-not-follow')
    expect(can(m, state, enter('liquid', 'mercury'))).toBe('invalid-entry')
    expect(can(m, state, enter('liquid', workedValue(m, state, 'liquid', 'liquid')))).toBeNull()
  })

  it('checks the notebook at the last entry, and shows each verdict as the entry is made', () => {
    let state = takeReadings(m, guided(), 'liquid')
    expect(partView(m, state, 'liquid').notebook.slice(0, 3).map((e) => e.verdict)).toEqual([{ follows: true, slip: null }, { follows: true, slip: null }, { follows: true, slip: null }])
    state = workOut(m, state, 'liquid')
    expect(currentRun(state, 'liquid').closed).toBe(true)
    expect(can(m, state, { type: 'check', part: 'liquid' })).toBe('run-over')
    expect(partView(m, state, 'liquid').outcome).toMatchObject({ state: 'counts' })
  })
})

describe('Challenge checks the notebook when asked', () => {
  it('stores what is typed, right or not, shows no verdict before the check, and marks each entry after it', () => {
    let state = run(m, challenge(), [{ type: 'moveEye', part: 'reading', eye: 'level' }])
    state = run(m, state, [read(state, 'reading', 'lengthCm', 9), read(state, 'reading', 'widthCm')])
    state = run(m, state, [{ type: 'enter', part: 'reading', field: 'areaCm', value: typed('12.345') }])
    expect(partView(m, state, 'reading').notebook.every((e) => e.verdict === null)).toBe(true)
    expect(can(m, state, { type: 'check', part: 'reading' })).toBe('notebook-not-full')
    state = takeReadings(m, challenge(), 'reading')
    state = workOut(m, state, 'reading', 'figures-too-many')
    expect(partView(m, state, 'reading').outcome).toEqual({ state: 'open' })
    state = run(m, state, [{ type: 'check', part: 'reading' }])
    const marks = Object.fromEntries(partView(m, state, 'reading').notebook.map((e) => [e.field, e.verdict?.slip ?? e.verdict?.follows]))
    expect(marks).toMatchObject({ lengthCm: true, areaCm: 'figures-too-many', areaMm: 'figures-too-many', thermometerOff: true })
    expect(partView(m, state, 'reading').outcome).toEqual({ state: 'does-not-count', reasons: ['entries-do-not-follow'], percentOff: null })
  })
})

describe('part 2: the bench in the order a learner may work it', () => {
  it('weighs the empty cylinder, pours, and weighs again: each reading open while its instrument shows it', () => {
    let state = run(m, guided(), [level])
    const open = () => Object.fromEntries((['emptyMass', 'liquidVolume', 'fullMass'] as const).map((f) => [f, entryBlocked(m, state, 'liquid', f)]))
    expect(open()).toEqual({ emptyMass: 'not-shown-yet', liquidVolume: 'not-shown-yet', fullMass: 'not-shown-yet' })
    expect(can(m, state, { type: 'pour', part: 'liquid' })).toBe('empty-not-weighed')
    state = run(m, state, [{ type: 'weigh', part: 'liquid' }])
    expect(open()).toEqual({ emptyMass: null, liquidVolume: 'not-shown-yet', fullMass: 'not-shown-yet' })
    expect(can(m, state, { type: 'weigh', part: 'liquid' })).toBe('already-done')
    // Once the liquid is in, the empty cylinder cannot be weighed again: its mass is read first.
    expect(can(m, state, { type: 'pour', part: 'liquid' })).toBe('reading-not-taken')
    state = run(m, state, [read(state, 'liquid', 'emptyMass'), { type: 'pour', part: 'liquid' }])
    expect(open()).toEqual({ emptyMass: 'no-longer-shown', liquidVolume: null, fullMass: 'not-shown-yet' })
    expect(can(m, state, { type: 'pour', part: 'liquid' })).toBe('already-done')
    expect(partView(m, state, 'liquid').bench.balance).toEqual({ holds: 'nothing', cg: null })
    state = run(m, state, [{ type: 'weigh', part: 'liquid' }])
    expect(open()).toEqual({ emptyMass: 'no-longer-shown', liquidVolume: null, fullMass: null })
    expect(can(m, state, { type: 'weigh', part: 'liquid' })).toBe('already-done')
    expect(can(m, state, { type: 'addPieces', part: 'liquid', how: 'slide' })).toBe('not-this-part')
    expect(partView(m, state, 'liquid').bench.balance.holds).toBe('cylinder-with-liquid')
  })

  it('lets the volume be read before or after the second weighing', () => {
    let state = run(m, guided(), [level, { type: 'weigh', part: 'liquid' }])
    state = run(m, state, [read(state, 'liquid', 'emptyMass'), { type: 'pour', part: 'liquid' }, { type: 'weigh', part: 'liquid' }])
    state = run(m, state, [read(state, 'liquid', 'fullMass'), read(state, 'liquid', 'liquidVolume')])
    expect(partView(m, workOut(m, state, 'liquid'), 'liquid').outcome).toMatchObject({ state: 'counts' })
  })
})

describe('part 3: the bench, and the two errors of technique', () => {
  const eye: Action = { type: 'moveEye', part: 'metal', eye: 'level' }

  it('has the water’s level read before the pieces go in, and the last level read before they come out', () => {
    let state = run(m, guided(), [eye])
    expect(can(m, state, { type: 'addPieces', part: 'metal', how: 'slide' })).toBe('reading-not-taken')
    expect(entryBlocked(m, state, 'metal', 'piecesMass')).toBe('not-shown-yet')
    expect(entryBlocked(m, state, 'metal', 'finalLevel')).toBe('not-shown-yet')
    state = run(m, state, [read(state, 'metal', 'waterLevel'), { type: 'addPieces', part: 'metal', how: 'slide' }])
    expect(entryBlocked(m, state, 'metal', 'waterLevel')).toBe('no-longer-shown')
    expect(can(m, state, { type: 'addPieces', part: 'metal', how: 'slide' })).toBe('already-done')
    expect(can(m, state, { type: 'weigh', part: 'metal' })).toBe('reading-not-taken')
    state = run(m, state, [read(state, 'metal', 'finalLevel'), { type: 'weigh', part: 'metal' }])
    expect(entryBlocked(m, state, 'metal', 'finalLevel')).toBe('no-longer-shown')
    expect(entryBlocked(m, state, 'metal', 'piecesMass')).toBeNull()
    expect(can(m, state, { type: 'weigh', part: 'metal' })).toBe('already-done')
    expect(can(m, state, { type: 'addPieces', part: 'metal', how: 'explode' as 'drop' })).not.toBeNull()
  })

  it('warns in Guided before the pieces go in unweighed, before they are dropped, and before wet pieces are weighed; not in Challenge, and not for careful work', () => {
    let state = run(m, guided(), [eye])
    state = run(m, state, [read(state, 'metal', 'waterLevel')])
    expect(warnings(m, state, { type: 'addPieces', part: 'metal', how: 'slide' })).toEqual(['pieces-not-weighed'])
    expect(warnings(m, state, { type: 'addPieces', part: 'metal', how: 'drop' })).toEqual(['pieces-not-weighed', 'dropping'])
    expect(warnings(m, { ...state, mode: 'challenge' }, { type: 'addPieces', part: 'metal', how: 'drop' })).toEqual([])
    const weighed = run(m, state, [{ type: 'weigh', part: 'metal' }])
    expect(warnings(m, weighed, { type: 'addPieces', part: 'metal', how: 'slide' })).toEqual([])
    expect(warnings(m, weighed, { type: 'addPieces', part: 'metal', how: 'drop' })).toEqual(['dropping'])
    expect(warnings(m, state, { type: 'weigh', part: 'metal' })).toEqual([])
    state = run(m, state, [{ type: 'addPieces', part: 'metal', how: 'slide' }])
    state = run(m, state, [read(state, 'metal', 'finalLevel')])
    expect(warnings(m, state, { type: 'weigh', part: 'metal' })).toEqual(['pieces-wet'])
  })

  it('weighs wet pieces heavier by the water on them, and reads a lower level after a drop', () => {
    const dry = takeReadings(m, challenge(), 'metal')
    const wet = takeReadings(m, challenge(), 'metal', { weigh: 'after' })
    const dropped = takeReadings(m, challenge(), 'metal', { add: 'drop' })
    const entries = (s: DensityState) => currentRun(s, 'metal').entries
    expect((entries(wet).piecesMass as number) - (entries(dry).piecesMass as number)).toBe(68)
    expect((entries(dry).finalLevel as { value: number }).value - (entries(dropped).finalLevel as { value: number }).value).toBe(11)
    expect(partView(m, wet, 'metal').bench).toMatchObject({ balance: { holds: 'wet-pieces' }, cylinder: { holds: 'water', pieces: false }, steps: { weighed: 'wet', added: 'slid' } })
    expect(partView(m, dry, 'metal').bench).toMatchObject({ balance: { holds: 'nothing', cg: null }, cylinder: { pieces: true }, steps: { weighed: 'dry', added: 'slid' } })
  })
})

describe('changing an entry, checking, and running a part again', () => {
  it('empties what was worked from an entry when it is made again, and nothing else', () => {
    let state = run(m, challenge(), [{ type: 'moveEye', part: 'reading', eye: 'level' }])
    state = takeReadings(m, state, 'reading')
    state = workOut(m, state, 'reading')
    state = run(m, state, [read(state, 'reading', 'lengthCm', 1)])
    const { entries } = currentRun(state, 'reading')
    expect([entries.areaCm, entries.areaMm === null, entries.thermometerOff === null]).toEqual([null, false, false])
  })

  it('ends a run at the check: nothing more is entered or done at its bench', () => {
    const state = wholeRun(m, challenge(), 'liquid')
    for (const action of [{ type: 'weigh', part: 'liquid' }, { type: 'pour', part: 'liquid' }, { type: 'moveEye', part: 'liquid', eye: 'below' }, { type: 'check', part: 'liquid' }, { type: 'enter', part: 'liquid', field: 'liquid', value: 'water' }] as const) {
      expect(can(m, state, action), action.type).toBe('run-over')
      expect(reduce(m, state, action)).toBe(state)
    }
  })

  it('runs a part again with new numbers and the same unknown, once the run has been begun', () => {
    let state = challenge()
    expect(can(m, state, { type: 'runAgain', part: 'metal' })).toBe('nothing-to-repeat')
    state = wholeRun(m, state, 'metal', { add: 'drop' })
    const first = currentRun(state, 'metal').entries
    state = run(m, state, [{ type: 'runAgain', part: 'metal' }])
    expect(partView(m, state, 'metal')).toMatchObject({ runs: 2, outcome: { state: 'open' }, done: false })
    expect(currentRun(state, 'metal')).toMatchObject({ index: 1, eye: 'above', bench: [], closed: false })
    state = wholeRun(m, state, 'metal')
    expect(currentRun(state, 'metal').entries.piecesMass).not.toBe(first.piecesMass)
    expect(partView(m, state, 'metal')).toMatchObject({ done: true, expected: { kind: 'unknown', id: 'aluminium', density: 2.7 } })
  })

  it('changes the mode at any time, and nothing else once the lab is completed', () => {
    let state = guided()
    for (const part of ['reading', 'liquid', 'metal'] as const) state = wholeRun(m, state, part)
    expect(state.status).toBe('completed')
    expect(can(m, state, { type: 'runAgain', part: 'metal' })).toBe('lab-completed')
    expect(can(m, state, { type: 'moveEye', part: 'metal', eye: 'level' })).toBe('lab-completed')
    expect(entryBlocked(m, state, 'metal', 'metal')).toBe('lab-completed')
    expect(reduce(m, state, { type: 'setMode', mode: 'challenge' })).toMatchObject({ mode: 'challenge', status: 'completed' })
    expect(reduce(m, state, { type: 'setMode', mode: 'guided' })).toBe(state)
    expect(can(m, state, { type: 'weigh', part: 'nowhere' as 'metal' })).toBe('lab-completed')
    expect(can(m, guided(), { type: 'weigh', part: 'nowhere' as 'metal' })).toBe('unknown-part')
  })
})
