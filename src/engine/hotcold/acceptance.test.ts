import { describe, expect, it } from 'vitest'
import { hotcoldData, SALT_IDS, type SaltId } from '@/chem-data/hotcold/data'
import { can, reduce, warnings, type Action } from './actions'
import { modelFrom } from './model'
import { PINNED_MODEL } from './pinnedModel'
import { doneParts, packsView, runOutcome, runView } from './select'
import { runSetup } from './setup'
import { createLab, currentRun, hotcoldStateSchema, type HotcoldState, type Mode } from './state'
import { answerPacks, entryActions, looks, notebookValues, run, wholeLab, wholeRun, workCup, type SlipOf } from './testkit'

// The acceptance of spec 26.5, over seeds 1 to 100, on the model the app runs: the one built from the stored
// record, which a test holds to the pinned literal.
const m = modelFrom(hotcoldData)
const SEEDS = Array.from({ length: 100 }, (_, i) => i + 1)
const schema = hotcoldStateSchema(m)
const roundTrip = (state: HotcoldState): HotcoldState => schema.parse(JSON.parse(JSON.stringify(state)))
const changeOf = (state: HotcoldState, salt: SaltId) => {
  const { graph } = runView(m, state, salt)
  return graph.extreme!.tenths - graph.readings[graph.changedAt!]!
}
const spread = (values: number[]) => [Math.min(...values), Math.max(...values)]

describe('the model', () => {
  it('is the pinned one: the stored record gives the engine exactly these numbers', () => {
    expect(m).toEqual(PINNED_MODEL)
  })
})

describe('a careful run, seeds 1 to 100 (spec 26.5)', () => {
  it("cools Epsom salt's cup by 2.7 to 2.9 °C and warms calcium chloride's by 11.6 to 12.8 °C: each by enough to read on the logger, and no cup past what the record allows", () => {
    const changes = (salt: SaltId) => SEEDS.map((seed) => changeOf(workCup(m, createLab(seed, 'challenge'), salt), salt))
    expect(spread(changes('epsom-salt'))).toEqual([-29, -27])
    expect(spread(changes('calcium-chloride'))).toEqual([116, 128])
    for (const salt of SALT_IDS) for (const change of changes(salt)) expect(Math.abs(change), salt).toBeGreaterThanOrEqual(m.leastChangeTenths)
    const highest = SEEDS.map((seed) => Math.max(...runView(m, workCup(m, createLab(seed, 'challenge'), 'calcium-chloride'), 'calcium-chloride').graph.readings))
    expect(spread(highest)).toEqual([318, 364])
    expect(Math.max(...highest)).toBeLessThanOrEqual(m.highestTemperatureTenths)
  })

  it.each(['guided', 'challenge'] as Mode[])('counts for each salt in %s, in either order, and the lab is then complete once part 3 is answered from the runs', (mode) => {
    for (const seed of SEEDS) {
      for (const order of [SALT_IDS, [...SALT_IDS].reverse()]) {
        let state = createLab(seed, mode)
        for (const salt of order) {
          state = wholeRun(m, state, salt)
          expect(runOutcome(m, state, salt, currentRun(state, salt)), `${seed} ${salt}`).toEqual({ state: 'counts' })
        }
        expect(state.status).toBe('in-progress')
        state = answerPacks(m, state)
        expect(state.status, String(seed)).toBe('completed')
        expect(doneParts(m, state)).toEqual(['epsom-salt', 'calcium-chloride', 'packs'])
      }
    }
  })

  it('turns back within four minutes of the salt, so that no run needs more than eight presses of Run on after it', () => {
    for (const salt of SALT_IDS) {
      const after = SEEDS.map((seed) => {
        const { graph } = runView(m, workCup(m, createLab(seed, 'challenge'), salt), salt)
        return graph.readings.length - 1 - graph.changedAt!
      })
      expect(Math.max(...after) * m.stepSeconds, salt).toBeLessThanOrEqual(240)
    }
  })

  it('shows the same seeded bench whichever salt is run first, and new numbers when a salt is run again', () => {
    for (const seed of [1, 7, 100]) {
      const first = wholeRun(m, createLab(seed, 'guided'), 'calcium-chloride')
      expect(runView(m, first, 'epsom-salt').bench).toEqual(runView(m, createLab(seed, 'guided'), 'epsom-salt').bench)
      expect(runSetup(m, seed, 'epsom-salt', 1)).not.toEqual(runSetup(m, seed, 'epsom-salt', 0))
    }
    const masses = (salt: SaltId) => spread(SEEDS.map((seed) => runSetup(m, seed, salt, 0).saltCg))
    expect(masses('epsom-salt')).toEqual([960, 1040])
    expect(masses('calcium-chloride')).toEqual([380, 420])
    expect(spread(SEEDS.flatMap((seed) => SALT_IDS.map((salt) => runSetup(m, seed, salt, 0).startTenths)))).toEqual([200, 240])
  })
})

describe('an error of technique alone, seeds 1 to 100 (spec 26.5)', () => {
  it.each([
    ['the lid off', { lid: false }, 'lid-off', [-27, -25], [107, 118]],
    ['the stirrer still', { stir: false }, 'not-stirred', [-26, -25], [106, 116]],
  ] as const)('with %s, makes a run not count at every seed, its cause named, and the reading falls short of a careful one', (_name, how, reason, epsom, calcium) => {
    for (const salt of SALT_IDS) {
      const changes = SEEDS.map((seed) => {
        const state = wholeRun(m, createLab(seed, 'challenge'), salt, how)
        expect(runOutcome(m, state, salt, currentRun(state, salt)), `${seed} ${salt}`).toEqual({ state: 'does-not-count', reasons: [reason] })
        expect(runView(m, state, salt).done).toBe(false)
        const careful = changeOf(workCup(m, createLab(seed, 'challenge'), salt), salt)
        expect(Math.abs(changeOf(state, salt)), `${seed} ${salt}`).toBeLessThan(Math.abs(careful))
        return changeOf(state, salt)
      })
      expect(spread(changes), salt).toEqual(salt === 'epsom-salt' ? epsom : calcium)
    }
  })

  it('is warned of first in Guided, and never in Challenge', () => {
    for (const salt of SALT_IDS) {
      const add: Action = { type: 'addSalt', part: salt }
      const bare = run(m, createLab(3, 'guided'), [{ type: 'startLogger', part: salt }])
      expect(warnings(m, bare, add)).toEqual(['lid-off', 'not-stirring'])
      expect(warnings(m, run(m, bare, [{ type: 'putLidOn', part: salt }]), add)).toEqual(['not-stirring'])
      expect(warnings(m, run(m, bare, [{ type: 'stir', part: salt }]), add)).toEqual(['lid-off'])
      expect(warnings(m, run(m, bare, [{ type: 'putLidOn', part: salt }, { type: 'stir', part: salt }]), add)).toEqual([])
      expect(warnings(m, reduce(m, bare, { type: 'setMode', mode: 'challenge' }), add)).toEqual([])
      // The way on is the same action sent again: the engine takes it, and the run then does not count.
      expect(can(m, bare, add)).toBeNull()
    }
  })

  it('cannot be mended after the salt is in: a lid put on late still does not count', () => {
    let state = run(m, createLab(5, 'challenge'), [{ type: 'stir', part: 'epsom-salt' }, { type: 'startLogger', part: 'epsom-salt' }, { type: 'addSalt', part: 'epsom-salt' }, { type: 'runOn', part: 'epsom-salt' }, { type: 'putLidOn', part: 'epsom-salt' }])
    while (!runView(m, state, 'epsom-salt').graph.turned) state = run(m, state, [{ type: 'runOn', part: 'epsom-salt' }])
    state = run(m, state, [...looks(m, state, 'epsom-salt'), ...entryActions('epsom-salt', notebookValues(m, state, 'epsom-salt')), { type: 'check', part: 'epsom-salt' }])
    expect(runOutcome(m, state, 'epsom-salt', currentRun(state, 'epsom-salt'))).toEqual({ state: 'does-not-count', reasons: ['lid-off'] })
  })
})

describe('an entry that does not follow (spec 26.5)', () => {
  const SLIPS: [SlipOf, string, string][] = [
    ['wrong-point', 'not-the-logger', 'extreme-not-shown'],
    ['wrong-way', 'does-not-follow', 'entries-do-not-follow'],
    ['wrong-heat', 'does-not-follow', 'entries-do-not-follow'],
    ['wrong-word', 'does-not-follow', 'entries-do-not-follow'],
  ]

  it.each(SLIPS)('%s is refused in Guided as it is made, with the kind of slip and never the value', (slip, blocked) => {
    for (const seed of [1, 37, 100]) {
      for (const salt of SALT_IDS) {
        const cup = run(m, workCup(m, createLab(seed, 'guided'), salt), looks(m, workCup(m, createLab(seed, 'guided'), salt), salt))
        const actions = entryActions(salt, notebookValues(m, cup, salt, slip))
        let state = cup
        const refused: string[] = []
        for (const action of actions) {
          const why = can(m, state, action)
          if (why !== null) {
            refused.push(why)
            break
          }
          state = reduce(m, state, action)
        }
        expect(refused, `${seed} ${salt}`).toEqual([blocked])
        expect(currentRun(state, salt).closed).toBe(false)
      }
    }
  })

  it.each(SLIPS)('%s is taken in Challenge and marked when the notebook is checked: the run does not count, and only the entry that slipped is marked', (slip, _blocked, reason) => {
    for (const seed of [1, 37, 100]) {
      for (const salt of SALT_IDS) {
        const state = wholeRun(m, createLab(seed, 'challenge'), salt, { slip })
        expect(runOutcome(m, state, salt, currentRun(state, salt)), `${seed} ${salt}`).toEqual({ state: 'does-not-count', reasons: [reason] })
        const marked = runView(m, state, salt).worksheet.filter((entry) => entry.verdict?.follows === false).map((entry) => entry.field)
        expect(marked, `${seed} ${salt}`).toEqual([{ 'wrong-point': 'extreme', 'wrong-way': 'temperature', 'wrong-heat': 'heat', 'wrong-word': 'word' }[slip]])
      }
    }
  })

  it('takes a change typed as a size or with its own sign, and refuses the other sign', () => {
    for (const salt of SALT_IDS) {
      const cup = workCup(m, createLab(11, 'guided'), salt)
      const values = notebookValues(m, cup, salt)
      const upTo = run(m, cup, [...looks(m, cup, salt), ...entryActions(salt, values).slice(0, 2)])
      const real = (values.extreme as number) - (values.start as number)
      const enter = (value: number): Action => ({ type: 'enter', part: salt, field: 'change', value })
      expect(can(m, upTo, enter(Math.abs(real)))).toBeNull()
      expect(can(m, upTo, enter(real))).toBeNull()
      expect(can(m, upTo, enter(real < 0 ? real - 1 : -real))).toBe(real < 0 ? 'does-not-follow' : 'wrong-sign')
      expect(can(m, upTo, enter(Math.abs(real) + 1))).toBe('does-not-follow')
    }
  })
})

describe('part 3 (spec 26.1)', () => {
  const both = (mode: Mode) => SALT_IDS.reduce((state, salt) => wholeRun(m, state, salt), createLab(21, mode))

  it('opens once both runs count, and not before', () => {
    const one = wholeRun(m, createLab(21, 'guided'), 'epsom-salt')
    expect(packsView(m, one).open).toBe(false)
    expect(can(m, one, { type: 'answer', question: 'warms', salt: 'calcium-chloride' })).toBe('runs-not-done')
    expect(packsView(m, both('guided')).open).toBe(true)
  })

  it('is answered by what the two runs showed: the salt that warmed the water for the pack that warms, and the salt that cooled it for the pack that cools', () => {
    const state = both('guided')
    expect(can(m, state, { type: 'answer', question: 'warms', salt: 'epsom-salt' })).toBe('not-right')
    expect(can(m, state, { type: 'answer', question: 'cools', salt: 'calcium-chloride' })).toBe('not-right')
    const done = run(m, state, [{ type: 'answer', question: 'cools', salt: 'epsom-salt' }, { type: 'answer', question: 'warms', salt: 'calcium-chloride' }])
    expect(done.status).toBe('completed')
    expect(runView(m, done, 'epsom-salt').expected).toEqual({ went: 'colder', kilojoulesPerMole: 17.56 })
    expect(runView(m, done, 'calcium-chloride').expected).toEqual({ went: 'warmer', kilojoulesPerMole: -77.689 })
  })

  it('takes any answer in Challenge and says nothing of it until the answers are checked; answers that are not both right are given again', () => {
    let state = run(m, both('challenge'), [{ type: 'answer', question: 'warms', salt: 'epsom-salt' }, { type: 'answer', question: 'cools', salt: 'calcium-chloride' }])
    expect(packsView(m, state).questions.map((q) => q.right)).toEqual([null, null])
    expect(can(m, state, { type: 'answerAgain' })).toBe('nothing-to-answer-again')
    state = run(m, state, [{ type: 'checkPacks' }])
    expect(packsView(m, state)).toMatchObject({ checked: true, done: false, questions: [{ right: false }, { right: false }] })
    expect(state.status).toBe('in-progress')
    expect(can(m, state, { type: 'answer', question: 'warms', salt: 'calcium-chloride' })).toBe('packs-checked')
    state = run(m, state, [{ type: 'answerAgain' }])
    expect(packsView(m, state).questions.map((q) => q.answer)).toEqual([null, null])
    expect(answerPacks(m, state).status).toBe('completed')
  })
})

describe('the record (spec 26.5)', () => {
  it('gives the same run for the same seed and actions', () => {
    for (const seed of [1, 50, 100]) expect(wholeLab(m, createLab(seed, 'challenge'))).toEqual(wholeLab(m, createLab(seed, 'challenge')))
    expect(wholeLab(m, createLab(1, 'challenge'))).not.toEqual(wholeLab(m, createLab(2, 'challenge')))
  })

  it('round-trips through JSON at every step of a whole lab, in both modes and both orders', () => {
    for (const mode of ['guided', 'challenge'] as Mode[]) {
      for (const order of [SALT_IDS, [...SALT_IDS].reverse()]) expect(wholeLab(m, createLab(9, mode), order, roundTrip)).toEqual(wholeLab(m, createLab(9, mode), order))
    }
  })

  it('round-trips a run that did not count, a run made again and answers given again', () => {
    let state = wholeRun(m, createLab(13, 'challenge'), 'epsom-salt', { lid: false }, roundTrip)
    state = run(m, state, [{ type: 'runAgain', part: 'epsom-salt' }], roundTrip)
    state = wholeRun(m, state, 'epsom-salt', {}, roundTrip)
    state = wholeRun(m, state, 'calcium-chloride', {}, roundTrip)
    state = run(m, state, [{ type: 'answer', question: 'warms', salt: 'epsom-salt' }, { type: 'answer', question: 'cools', salt: 'epsom-salt' }, { type: 'checkPacks' }, { type: 'answerAgain' }], roundTrip)
    expect(answerPacks(m, state, roundTrip).status).toBe('completed')
    expect(state.runs['epsom-salt']).toHaveLength(2)
  })
})

describe('no state leaves the learner unable to go on (spec 26.5)', () => {
  it('lets a run that did not count be made again with new numbers, and a logger that is full be left behind', () => {
    let state = wholeRun(m, createLab(4, 'challenge'), 'calcium-chloride', { stir: false })
    expect(can(m, state, { type: 'runAgain', part: 'calcium-chloride' })).toBeNull()
    state = run(m, state, [{ type: 'runAgain', part: 'calcium-chloride' }])
    expect(runView(m, state, 'calcium-chloride')).toMatchObject({ runs: 2, outcome: { state: 'open' }, cup: { loggerStarted: false } })
    expect(runView(m, state, 'calcium-chloride').bench).not.toEqual(runView(m, createLab(4, 'challenge'), 'calcium-chloride').bench)
    // A logger run to its last reading with no salt in: the notebook cannot open, and the run can be made again.
    let full = run(m, createLab(4, 'guided'), [{ type: 'startLogger', part: 'epsom-salt' }])
    while (can(m, full, { type: 'runOn', part: 'epsom-salt' }) === null) full = reduce(m, full, { type: 'runOn', part: 'epsom-salt' })
    expect(can(m, full, { type: 'runOn', part: 'epsom-salt' })).toBe('logger-full')
    expect(runView(m, full, 'epsom-salt').graph.full).toBe(true)
    expect(can(m, full, { type: 'runAgain', part: 'epsom-salt' })).toBeNull()
  })

  it('finds, from every state a careful lab passes through in either mode, an action that can be done', () => {
    const moves = (state: HotcoldState): Action[] => [
      ...SALT_IDS.flatMap((part): Action[] => [{ type: 'putLidOn', part }, { type: 'stir', part }, { type: 'startLogger', part }, { type: 'addSalt', part }, { type: 'runOn', part }, { type: 'runAgain', part }, { type: 'check', part }, ...entryActions(part, { start: 0, extreme: 0, change: 0, temperature: 'warmer', heat: 'out', word: 'exothermic' })]),
      { type: 'answer', question: 'warms', salt: 'calcium-chloride' },
      { type: 'answer', question: 'cools', salt: 'epsom-salt' },
      { type: 'checkPacks' },
      { type: 'answerAgain' },
      ...(state.status === 'completed' ? [{ type: 'setMode', mode: 'guided' } as Action] : []),
    ]
    for (const mode of ['guided', 'challenge'] as Mode[]) {
      wholeLab(m, createLab(17, mode), SALT_IDS, (state) => {
        expect(state.status === 'completed' || moves(state).some((action) => can(m, state, action) === null)).toBe(true)
        return state
      })
    }
  })
})
