import { describe, expect, it } from 'vitest'
import { PART_IDS, type PartId } from '@/chem-data/calorimetry/data'
import { can, entryBlocked, reduce, warnings, type Action } from './actions'
import { parseSig3, type Sig3 } from './entries'
import { PINNED_MODEL as m } from './pinnedModel'
import { partView } from './select'
import { calorimetryStateSchema, createLab, currentRun, newRun, type CalorimetryState } from './state'
import { entryActions, looks, run, wholeRun, workCup, worksheetValues } from './testkit'
import { FIELDS, NO_ENTRIES } from './worksheet'

const sig = (text: string): Sig3 => parseSig3(text)!
const schema = calorimetryStateSchema(m)
const P: PartId = 'neutralisation'
/** A cup worked carefully to a curve that has turned, with the two looks made. */
const ready = (part: PartId, mode: 'guided' | 'challenge' = 'guided', seed = 1) => {
  const state = workCup(m, createLab(seed, mode), part)
  return run(m, state, looks(m, state, part))
}

describe('a lab that has just been started', () => {
  it('has one untouched run of each part, and is in progress', () => {
    const state = createLab(1, 'guided')
    expect(state).toEqual({ seed: 1, mode: 'guided', status: 'in-progress', parts: { neutralisation: [newRun(0)], dissolving: [newRun(0)], metal: [newRun(0)] } })
    expect(newRun(0)).toEqual({ index: 0, lidFrom: null, stirFrom: null, logger: false, changedAt: null, steps: 0, looked: [], entries: NO_ENTRIES, closed: false })
    expect(schema.safeParse(state).success).toBe(true)
    expect(createLab(2 ** 32 + 5, 'challenge').seed).toBe(5)
  })
})

describe('the cup', () => {
  it('takes the lid, the stirrer and the logger in any order, each once', () => {
    for (const order of [['putLidOn', 'stir', 'startLogger'], ['startLogger', 'stir', 'putLidOn'], ['stir', 'startLogger', 'putLidOn']] as const) {
      let state = createLab(1, 'challenge')
      for (const type of order) {
        expect(can(m, state, { type, part: P }), type).toBeNull()
        state = reduce(m, state, { type, part: P })
        expect(can(m, state, { type, part: P }), type).toBe('already-done')
      }
      expect(partView(m, state, P).cup).toEqual({ lidOn: true, stirring: true, loggerStarted: true, changeStarted: false, worksheetBegun: false })
    }
  })

  it('cannot start its change, run on or be looked at before the logger is started', () => {
    const state = createLab(1, 'challenge')
    for (const action of [{ type: 'startChange', part: P }, { type: 'runOn', part: P }, { type: 'look', part: P, step: 0 }] as Action[]) {
      expect(can(m, state, action), action.type).toBe('logger-not-started')
      expect(reduce(m, state, action)).toBe(state)
    }
  })

  it('takes a reading as the logger starts and two more at each press of Run on, and starts its change once', () => {
    let state = run(m, createLab(1, 'challenge'), [{ type: 'startLogger', part: P }])
    expect(partView(m, state, P).graph.readings).toEqual([200])
    state = run(m, state, [{ type: 'runOn', part: P }])
    expect(partView(m, state, P).graph.readings).toEqual([200, 200, 200])
    state = run(m, state, [{ type: 'startChange', part: P }])
    expect(currentRun(state, P).changedAt).toBe(2)
    expect(can(m, state, { type: 'startChange', part: P })).toBe('already-done')
    state = run(m, state, [{ type: 'runOn', part: P }])
    expect(partView(m, state, P).graph.readings.length).toBe(5)
  })

  it('remembers the step at which the lid went on and the stirrer started, so a late one is told from one in time', () => {
    const state = run(m, createLab(1, 'challenge'), [{ type: 'startLogger', part: P }, { type: 'runOn', part: P }, { type: 'putLidOn', part: P }, { type: 'startChange', part: P }, { type: 'runOn', part: P }, { type: 'stir', part: P }])
    expect(currentRun(state, P)).toMatchObject({ lidFrom: 2, changedAt: 2, stirFrom: 4, steps: 4 })
  })

  it('stops taking readings when the logger is full', () => {
    let state = run(m, createLab(1, 'challenge'), [{ type: 'startLogger', part: P }])
    for (let press = 0; press < m.maxSteps / m.runOnSteps; press++) state = run(m, state, [{ type: 'runOn', part: P }])
    expect(currentRun(state, P).steps).toBe(m.maxSteps)
    expect(can(m, state, { type: 'runOn', part: P })).toBe('logger-full')
    expect(partView(m, state, P).graph.full).toBe(true)
    expect(schema.safeParse(state).success).toBe(true)
  })

  it('works each part on its own: what is done to one cup leaves the others as they were', () => {
    const state = workCup(m, createLab(1, 'challenge'), 'dissolving')
    expect(state.parts.neutralisation).toEqual([newRun(0)])
    expect(state.parts.metal).toEqual([newRun(0)])
  })
})

describe("Guided's warning before the change is started", () => {
  const before = (actions: Action['type'][], mode: 'guided' | 'challenge' = 'guided') => run(m, createLab(1, mode), [{ type: 'startLogger', part: P }, ...actions.map((type) => ({ type, part: P }) as Action)])

  it('names the lid that is off and the stirrer that is still, and nothing when both are in use', () => {
    expect(warnings(m, before([]), { type: 'startChange', part: P })).toEqual(['lid-off', 'not-stirring'])
    expect(warnings(m, before(['putLidOn']), { type: 'startChange', part: P })).toEqual(['not-stirring'])
    expect(warnings(m, before(['stir']), { type: 'startChange', part: P })).toEqual(['lid-off'])
    expect(warnings(m, before(['putLidOn', 'stir']), { type: 'startChange', part: P })).toEqual([])
  })

  it('is not raised in Challenge, for any other action, or for a change that cannot be started', () => {
    expect(warnings(m, before([], 'challenge'), { type: 'startChange', part: P })).toEqual([])
    expect(warnings(m, before([]), { type: 'runOn', part: P })).toEqual([])
    expect(warnings(m, createLab(1, 'guided'), { type: 'startChange', part: P })).toEqual([])
  })

  it('leaves a way on: the same action, sent again, starts the change with the lid off', () => {
    const state = before([])
    expect(can(m, state, { type: 'startChange', part: P })).toBeNull()
    expect(currentRun(reduce(m, state, { type: 'startChange', part: P }), P).changedAt).toBe(0)
  })
})

describe('the looks at the graph', () => {
  it('are at a reading the logger has taken, and are remembered once each', () => {
    let state = workCup(m, createLab(1, 'guided'), P)
    const last = currentRun(state, P).steps
    for (const step of [-1, last + 1, 1.5, Number.NaN]) expect(can(m, state, { type: 'look', part: P, step }), String(step)).toBe('nothing-there')
    state = run(m, state, [{ type: 'look', part: P, step: 3 }, { type: 'look', part: P, step: 0 }])
    expect(reduce(m, state, { type: 'look', part: P, step: 3 })).toBe(state)
    expect(currentRun(state, P).looked).toEqual([3, 0])
  })

  it('open the first two entries: one before the change for the start, one that shows the highest or lowest for that', () => {
    let state = workCup(m, createLab(1, 'guided'), P)
    const { graph } = partView(m, state, P)
    expect(graph).toMatchObject({ readings: [200, 200, 200, 258, 267, 268, 268, 267, 267], changedAt: 2, extreme: { step: 5, tenths: 268 }, turned: true })
    expect(entryBlocked(m, state, P, 'start')).toBe('not-looked')
    // A look after the change does not open the starting temperature.
    state = run(m, state, [{ type: 'look', part: P, step: 4 }])
    expect(entryBlocked(m, state, P, 'start')).toBe('not-looked')
    state = run(m, state, [{ type: 'look', part: P, step: 1 }, { type: 'enter', part: P, field: 'start', value: 200 }])
    // Neither does a look at a reading that is not the highest open that entry.
    expect(entryBlocked(m, state, P, 'extreme')).toBe('not-looked')
    // Any reading that shows the highest does: the second of two level ones here.
    state = run(m, state, [{ type: 'look', part: P, step: 6 }])
    expect(entryBlocked(m, state, P, 'extreme')).toBeNull()
  })
})

describe('the worksheet', () => {
  it('stays shut until the change is started and the curve has turned back', () => {
    let state = run(m, createLab(1, 'guided'), [{ type: 'putLidOn', part: P }, { type: 'stir', part: P }, { type: 'startLogger', part: P }, { type: 'look', part: P, step: 0 }])
    expect(can(m, state, { type: 'enter', part: P, field: 'start', value: 200 })).toBe('change-not-started')
    state = run(m, state, [{ type: 'startChange', part: P }])
    expect(entryBlocked(m, state, P, 'start')).toBe('not-turned')
    // Rising, then level at its highest: not turned until a reading comes back down.
    state = run(m, state, [{ type: 'runOn', part: P }, { type: 'runOn', part: P }])
    expect(partView(m, state, P).graph).toMatchObject({ readings: [200, 258, 267, 268, 268], turned: false })
    expect(entryBlocked(m, state, P, 'start')).toBe('not-turned')
    state = run(m, state, [{ type: 'runOn', part: P }])
    expect(partView(m, state, P).graph.turned).toBe(true)
    expect(entryBlocked(m, state, P, 'start')).toBeNull()
  })

  it('takes its entries in order, each of its own kind, and none of another part', () => {
    const state = ready(P)
    expect(can(m, state, { type: 'enter', part: P, field: 'extreme', value: 268 })).toBe('entry-above-missing')
    expect(can(m, state, { type: 'enter', part: P, field: 'specificHeat', value: sig('0.449') })).toBe('not-this-part')
    expect(can(m, state, { type: 'enter', part: 'metal', field: 'moles', value: sig('0.0500') })).toBe('not-this-part')
    for (const value of [20.05, -1, '200', sig('200'), null, Number.NaN, -0]) expect(can(m, state, { type: 'enter', part: P, field: 'start', value: value as never }), String(value)).toBe('invalid-entry')
    const filled = run(m, state, entryActions(P, worksheetValues(m, state, P)).slice(0, 3))
    for (const value of [2840, '2840', { mantissa: 28, exponent: 2 }, { mantissa: 2840, exponent: 0 }]) expect(can(m, filled, { type: 'enter', part: P, field: 'heat', value: value as never }), JSON.stringify(value)).toBe('invalid-entry')
    const further = run(m, filled, [{ type: 'enter', part: P, field: 'heat', value: sig('2840') }])
    expect(can(m, further, { type: 'enter', part: P, field: 'direction', value: 'up' })).toBe('invalid-entry')
    const metal = ready('metal')
    const last = run(m, metal, entryActions('metal', worksheetValues(m, metal, 'metal')).slice(0, 5))
    expect(can(m, last, { type: 'enter', part: 'metal', field: 'metal', value: 'copper-piece' })).toBe('invalid-entry')
  })

  it('closes the cup at its first entry: no lid, no stirrer, no more time', () => {
    const state = run(m, ready(P), [{ type: 'enter', part: P, field: 'start', value: 200 }])
    expect(partView(m, state, P).cup.worksheetBegun).toBe(true)
    for (const type of ['putLidOn', 'stir', 'startLogger', 'startChange', 'runOn'] as const) expect(can(m, state, { type, part: P }), type).toBe('worksheet-begun')
    // A look is still a look.
    expect(can(m, state, { type: 'look', part: P, step: 3 })).toBeNull()
  })

  it('empties the entries after one that is made again: they were worked from it', () => {
    const state = ready(P, 'challenge')
    const filled = run(m, state, entryActions(P, worksheetValues(m, state, P)))
    expect(Object.values(currentRun(filled, P).entries).filter((entry) => entry !== null).length).toBe(7)
    const again = run(m, filled, [{ type: 'enter', part: P, field: 'change', value: 67 }])
    expect(currentRun(again, P).entries).toEqual({ ...NO_ENTRIES, start: 200, extreme: 268, change: 67 })
    // The last entry made again empties nothing.
    expect(currentRun(run(m, filled, [{ type: 'enter', part: P, field: 'perMole', value: sig('-56.9') }]), P).entries.moles).toEqual(sig('0.0500'))
  })
})

describe('Guided checks each entry as it is made', () => {
  const state = ready(P)
  const upTo = (count: number) => run(m, state, entryActions(P, worksheetValues(m, state, P)).slice(0, count))

  it('refuses a temperature that is not the one the logger shows, and stores nothing', () => {
    expect(can(m, state, { type: 'enter', part: P, field: 'start', value: 204 })).toBe('not-the-logger')
    expect(reduce(m, state, { type: 'enter', part: P, field: 'start', value: 204 })).toBe(state)
    // A tenth of a degree off is not the logger's either: only the reading itself is taken.
    expect(can(m, state, { type: 'enter', part: P, field: 'start', value: 201 })).toBe('not-the-logger')
    expect(can(m, state, { type: 'enter', part: P, field: 'start', value: 200 })).toBeNull()
    // The last reading, taken for the highest: the wrong point.
    expect(can(m, upTo(1), { type: 'enter', part: P, field: 'extreme', value: 265 })).toBe('not-the-logger')
    expect(can(m, upTo(1), { type: 'enter', part: P, field: 'extreme', value: 267 })).toBe('not-the-logger')
    expect(can(m, upTo(1), { type: 'enter', part: P, field: 'extreme', value: 268 })).toBeNull()
  })

  it('refuses an entry that does not follow, and names the slip where it knows it', () => {
    expect(can(m, upTo(2), { type: 'enter', part: P, field: 'change', value: 70 })).toBe('does-not-follow')
    expect(can(m, upTo(2), { type: 'enter', part: P, field: 'change', value: -68 })).toBe('wrong-sign')
    expect(can(m, upTo(3), { type: 'enter', part: P, field: 'heat', value: sig('2850') })).toBe('does-not-follow')
    expect(can(m, upTo(4), { type: 'enter', part: P, field: 'direction', value: 'in' })).toBe('does-not-follow')
    expect(can(m, upTo(5), { type: 'enter', part: P, field: 'moles', value: sig('0.100') })).toBe('does-not-follow')
    expect(can(m, upTo(6), { type: 'enter', part: P, field: 'perMole', value: sig('56.8') })).toBe('wrong-sign')
    expect(can(m, upTo(6), { type: 'enter', part: P, field: 'perMole', value: sig('-56800') })).toBe('joules-for-kilojoules')
    expect(can(m, upTo(6), { type: 'enter', part: P, field: 'perMole', value: sig('-56.8') })).toBeNull()
    const salt = ready('dissolving')
    const three = run(m, salt, entryActions('dissolving', worksheetValues(m, salt, 'dissolving')).slice(0, 3))
    expect(can(m, three, { type: 'enter', part: 'dissolving', field: 'heat', value: worksheetValues(m, salt, 'dissolving', { slip: 'salt-left-out' }).heat })).toBe('salt-left-out')
  })

  it('checks the worksheet at the last entry, and the run is over', () => {
    const done = upTo(7)
    expect(currentRun(done, P).closed).toBe(true)
    expect(partView(m, done, P).outcome).toMatchObject({ state: 'counts' })
    for (const action of [{ type: 'enter', part: P, field: 'perMole', value: sig('-56.8') }, { type: 'check', part: P }, { type: 'runOn', part: P }] as Action[]) expect(can(m, done, action), action.type).toBe('run-over')
    expect(upTo(6).parts[P][0]!.closed).toBe(false)
    expect(can(m, upTo(6), { type: 'check', part: P })).toBe('worksheet-not-full')
  })
})

describe('Challenge checks the entries together at the end', () => {
  it('stores what is typed, whatever it is, and marks nothing until the worksheet is checked', () => {
    let state = ready(P, 'challenge')
    const wrong: Action[] = [
      { type: 'enter', part: P, field: 'start', value: 204 },
      { type: 'enter', part: P, field: 'extreme', value: 265 },
      { type: 'enter', part: P, field: 'change', value: 70 },
      { type: 'enter', part: P, field: 'heat', value: sig('2850') },
      { type: 'enter', part: P, field: 'direction', value: 'in' },
      { type: 'enter', part: P, field: 'moles', value: sig('0.100') },
      { type: 'enter', part: P, field: 'perMole', value: sig('-99.9') },
    ]
    state = run(m, state, wrong)
    expect(currentRun(state, P).closed).toBe(false)
    expect(partView(m, state, P).worksheet.map((entry) => entry.verdict)).toEqual(Array(7).fill(null))
    expect(partView(m, state, P).outcome).toEqual({ state: 'open' })
    state = run(m, state, [{ type: 'check', part: P }])
    expect(partView(m, state, P).worksheet.map((entry) => entry.verdict?.follows)).toEqual(Array(7).fill(false))
    expect(partView(m, state, P).outcome).toEqual({ state: 'does-not-count', reasons: ['start-not-shown', 'extreme-not-shown', 'entries-do-not-follow'], percentOff: null })
  })

  it('lets an entry be made again before the check, and none after it', () => {
    const state = ready(P, 'challenge')
    let filled = run(m, state, entryActions(P, worksheetValues(m, state, P, { slip: 'no-sign' })))
    filled = run(m, filled, [{ type: 'enter', part: P, field: 'perMole', value: sig('-56.8') }, { type: 'check', part: P }])
    expect(partView(m, filled, P).outcome).toMatchObject({ state: 'counts' })
    expect(can(m, filled, { type: 'enter', part: P, field: 'perMole', value: sig('-56.8') })).toBe('run-over')
  })
})

describe('running a part again', () => {
  it('needs a run that was begun, and gives the part a new run with new numbers, leaving the old one as it was', () => {
    const fresh = createLab(1, 'challenge')
    expect(can(m, fresh, { type: 'runAgain', part: 'metal' })).toBe('nothing-to-repeat')
    const begun = run(m, fresh, [{ type: 'startLogger', part: 'metal' }, { type: 'startChange', part: 'metal' }])
    const again = run(m, begun, [{ type: 'runAgain', part: 'metal' }])
    expect(again.parts.metal).toEqual([begun.parts.metal[0], newRun(1)])
    expect(partView(m, again, 'metal').runs).toBe(2)
    expect(partView(m, begun, 'metal').bench).toEqual({ balanceCg: 4912, bathTenths: 996 })
    expect(partView(m, again, 'metal').bench).toEqual({ balanceCg: 4996, bathTenths: 991 })
    expect(partView(m, run(m, again, [{ type: 'startLogger', part: 'metal' }]), 'metal').graph.readings).toEqual([218])
    expect(run(m, again, [{ type: 'startLogger', part: 'metal' }]).parts.metal[0]).toBe(begun.parts.metal[0])
  })

  it('can be done at any point of a run: with the worksheet half filled, and after a run that counted or did not', () => {
    const half = run(m, ready(P), [{ type: 'enter', part: P, field: 'start', value: 200 }])
    expect(can(m, half, { type: 'runAgain', part: P })).toBeNull()
    const failed = wholeRun(m, createLab(1, 'challenge'), P, { lid: false })
    expect(can(m, failed, { type: 'runAgain', part: P })).toBeNull()
    const counted = wholeRun(m, createLab(1, 'guided'), P)
    const more = run(m, counted, [{ type: 'runAgain', part: P }])
    // A part that is done stays done while another run of it is under way.
    expect([partView(m, counted, P).done, partView(m, more, P).done, partView(m, more, P).outcome.state]).toEqual([true, true, 'open'])
  })
})

describe('the mode', () => {
  it('can be changed at any time, and changes how the next entry is taken', () => {
    let state = ready(P, 'challenge')
    state = run(m, state, [{ type: 'enter', part: P, field: 'start', value: 204 }, { type: 'setMode', mode: 'guided' }])
    expect(reduce(m, state, { type: 'setMode', mode: 'guided' })).toBe(state)
    // Guided shows the entry carried over for what it is, and takes it again.
    expect(partView(m, state, P).worksheet[0]!.verdict).toEqual({ follows: false, slip: null })
    expect(can(m, state, { type: 'enter', part: P, field: 'start', value: 204 })).toBe('not-the-logger')
    state = run(m, state, [{ type: 'enter', part: P, field: 'start', value: 200 }])
    expect(partView(m, state, P).worksheet[0]!.verdict).toEqual({ follows: true, slip: null })
  })

  it('leaves a full worksheet carried from Challenge to be checked by hand', () => {
    const state = ready(P, 'challenge')
    const filled = run(m, run(m, state, entryActions(P, worksheetValues(m, state, P))), [{ type: 'setMode', mode: 'guided' }])
    expect(currentRun(filled, P).closed).toBe(false)
    expect(partView(m, run(m, filled, [{ type: 'check', part: P }]), P).outcome.state).toBe('counts')
  })
})

describe('a completed lab', () => {
  const lab = PART_IDS.reduce((state, part) => wholeRun(m, state, part), createLab(1, 'guided'))

  it('is completed when a run of each part counts, and takes no further action but a change of mode', () => {
    expect(lab.status).toBe('completed')
    for (const part of PART_IDS) {
      for (const action of [{ type: 'runAgain', part }, { type: 'runOn', part }, { type: 'look', part, step: 0 }, { type: 'check', part }, { type: 'enter', part, field: 'start', value: 200 }] as Action[]) {
        expect(can(m, lab, action), `${part} ${action.type}`).toBe('lab-completed')
        expect(reduce(m, lab, action)).toBe(lab)
      }
      expect(partView(m, lab, part).worksheet.every((entry) => entry.blocked === 'lab-completed')).toBe(true)
    }
    expect(reduce(m, lab, { type: 'setMode', mode: 'challenge' }).mode).toBe('challenge')
  })

  it('is not completed by two parts, or by three runs of one', () => {
    const two = wholeRun(m, wholeRun(m, createLab(1, 'guided'), 'neutralisation'), 'metal')
    expect(two.status).toBe('in-progress')
  })
})

describe('the stored shape', () => {
  const lab = wholeRun(m, wholeRun(m, createLab(1, 'challenge'), 'dissolving', { lid: false }), 'metal')
  const refused = (edit: (state: CalorimetryState) => void) => {
    const state: CalorimetryState = JSON.parse(JSON.stringify(lab))
    edit(state)
    const result = schema.safeParse(state)
    return result.success ? '' : result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n')
  }

  it('comes back from JSON as it went in, and is accepted', () => {
    const back = JSON.parse(JSON.stringify(lab))
    expect(back).toEqual(lab)
    expect(schema.parse(back)).toEqual(lab)
  })

  it('holds its bounds to the model: the logger\'s last step', () => {
    expect(refused((s) => void (s.parts.metal[0]!.steps = m.maxSteps))).toBe('')
    expect(refused((s) => void (s.parts.metal[0]!.steps = m.maxSteps + 1))).toContain('parts.metal.0.steps')
    expect(calorimetryStateSchema({ ...m, maxSteps: 4 }).safeParse(lab).success).toBe(false)
  })

  it('refuses what the reducer would not have stored', () => {
    expect(refused((s) => void (s.parts.metal[0]!.index = 3))).toContain("parts.metal.0.index: a run's index is its place in the list")
    expect(refused((s) => void (s.parts.neutralisation[0]!.steps = 4))).toContain('parts.neutralisation.0.logger: the logger was not started')
    expect(refused((s) => void (s.parts.neutralisation[0]!.lidFrom = 2))).toContain('a step the logger has not reached')
    expect(refused((s) => void (s.parts.metal[0]!.changedAt = 99))).toContain('a step the logger has not reached')
    expect(refused((s) => void s.parts.metal[0]!.looked.push(999))).not.toBe('')
    expect(refused((s) => void s.parts.metal[0]!.looked.push(s.parts.metal[0]!.looked[0]!))).toContain('each reading once')
    expect(refused((s) => void (s.parts.metal[0]!.entries.moles = sig('0.0500')))).toContain("the part's own entries, in their order, none skipped")
    expect(refused((s) => void (s.parts.metal[0]!.entries.heat = null))).toContain("the part's own entries, in their order, none skipped")
    expect(refused((s) => void (s.parts.metal[0]!.entries.metal = 'copper-piece'))).toContain('not one of the metals it may be')
    expect(refused((s) => void (s.parts.neutralisation[0]!.entries.start = 200))).toContain('nothing is entered before the change is started')
    expect(refused((s) => void (s.parts.neutralisation[0]!.closed = true))).toContain('a worksheet is checked when every entry is made')
    expect(refused((s) => void (s.parts.metal[0]!.entries.specificHeat = { mantissa: 38, exponent: -2 }))).toContain('three significant figures')
    expect(refused((s) => void ((s as { extra?: number }).extra = 1))).not.toBe('')
    expect(refused((s) => void (s.seed = -1))).not.toBe('')
  })

  it('refuses a status that the runs do not give', () => {
    expect(refused((s) => void (s.status = 'completed'))).toContain('status: the status is not the one the runs give')
    // Two parts done, and the third run once with the lid off: in progress until it is run again with care.
    const two = wholeRun(m, lab, 'neutralisation')
    expect(two.status).toBe('in-progress')
    const all = wholeRun(m, run(m, two, [{ type: 'runAgain', part: 'dissolving' }]), 'dissolving')
    expect(all.status).toBe('completed')
    expect(schema.safeParse({ ...all, status: 'in-progress' }).success).toBe(false)
    // A run that counted cannot be made not to count by an edit that leaves the status standing.
    const edited: CalorimetryState = JSON.parse(JSON.stringify(all))
    edited.parts.metal[0]!.lidFrom = null
    expect(schema.safeParse(edited).success).toBe(false)
  })

  it('names every field of a part\'s worksheet once', () => {
    for (const part of PART_IDS) expect(new Set(FIELDS[part]).size).toBe(FIELDS[part].length)
  })
})
