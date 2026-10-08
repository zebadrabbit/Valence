import { describe, expect, it } from 'vitest'
import { aqueousData as data } from '@/chem-data/aqueous/data'
import { mulberry32 } from '../rng'
import { can, reduce, type Action } from './actions'
import { FORMS, LOOKS, TOOL_USES, choicesFor, expectedObservation, fieldsOf, usesOf, type Entry, type Observation } from './check'
import { doneStations, stationView } from './select'
import { aqueousStateSchema, createLab, type AqueousState } from './state'
import { correctEntry, run, stationScript } from './testkit'

const schema = aqueousStateSchema(data)
const reload = (state: AqueousState): AqueousState => schema.parse(JSON.parse(JSON.stringify(state)))
const ids = data.stations.map((s) => s.id)
const noReaction: Entry = { noReaction: true, reactants: [], products: [] }
const mixed = (stationId: string, state = createLab(data, 'guided')) => reduce(data, state, { type: 'mix', stationId })
/** Looking at each part of what is in the tube: what opens the eye's three questions. */
const looks = (stationId: string) => LOOKS.map((tool): Action => ({ type: 'useTool', stationId, tool }))

describe('a lab that has just been started', () => {
  it('has ten untouched stations and is in progress', () => {
    const state = createLab(data, 'challenge')
    expect(state).toEqual({
      mode: 'challenge',
      status: 'in-progress',
      stations: Array.from({ length: 10 }, () => ({ mixed: false, used: [], observation: null, equations: { molecular: null, completeIonic: null, netIonic: null } })),
    })
    expect(reload(state)).toEqual(state)
    expect(doneStations(data, state)).toEqual([])
  })
})

describe('what can be done, and what it does', () => {
  it('mixes a tube once', () => {
    const state = mixed('aq-01')
    expect(state.stations[0]!.mixed).toBe(true)
    expect(can(data, state, { type: 'mix', stationId: 'aq-01' })).toBe('already-mixed')
    expect(can(data, state, { type: 'mix', stationId: 'aq-02' })).toBeNull()
  })

  it('knows only the ten stations', () => {
    const state = createLab(data, 'guided')
    for (const action of [{ type: 'mix', stationId: 'aq-11' }, { type: 'useTool', stationId: '', tool: 'waft' }, { type: 'enterEquation', stationId: 'x', form: 'molecular', entry: noReaction }] as Action[]) {
      expect(can(data, state, action)).toBe('unknown-station')
      expect(reduce(data, state, action)).toBe(state)
    }
  })

  it('applies a tool only to a mixed tube, and only a tool the station has', () => {
    const fresh = createLab(data, 'guided')
    expect(can(data, fresh, { type: 'useTool', stationId: 'aq-06', tool: 'waft' })).toBe('not-mixed')
    const state = mixed('aq-06')
    expect(can(data, state, { type: 'useTool', stationId: 'aq-06', tool: 'touch' })).toBe('no-such-tool')
    const wafted = reduce(data, state, { type: 'useTool', stationId: 'aq-06', tool: 'waft' })
    expect(wafted.stations[5]!.used).toEqual(['waft'])
    // Applied again it shows the same thing and stores nothing new.
    expect(reduce(data, wafted, { type: 'useTool', stationId: 'aq-06', tool: 'waft' })).toBe(wafted)
  })

  it('looks at a part of the tube as a tool is applied: only once the tube is mixed, stored once with the station, and kept by a reload', () => {
    const fresh = createLab(data, 'challenge')
    for (const tool of LOOKS) expect(can(data, fresh, { type: 'useTool', stationId: 'aq-01', tool })).toBe('not-mixed')
    let state = mixed('aq-01', fresh)
    for (const tool of LOOKS) expect(can(data, state, { type: 'useTool', stationId: 'aq-01', tool })).toBeNull()
    state = run(data, state, [{ type: 'useTool', stationId: 'aq-01', tool: 'look-liquid' }])
    expect(state.stations[0]!.used).toEqual(['look-liquid'])
    expect(reduce(data, state, { type: 'useTool', stationId: 'aq-01', tool: 'look-liquid' })).toBe(state)
    expect(reload(state)).toEqual(state)
    expect(state.stations[1]!.used).toEqual([])
    // Looking gives nothing away: no hints and no expected observation come with it in Challenge.
    expect(stationView(data, run(data, state, looks('aq-01').slice(0, 1)), 'aq-01')).toMatchObject({ used: ['look-liquid', 'look-bottom'], guidanceShown: false, observation: null })
  })

  it('never smells a tube directly: the request is refused with the safety note, wherever wafting is the tool', () => {
    const state = mixed('aq-06')
    expect(can(data, state, { type: 'useTool', stationId: 'aq-06', tool: 'sniff' })).toBe('sniffing')
    expect(reduce(data, state, { type: 'useTool', stationId: 'aq-06', tool: 'sniff' })).toBe(state)
    expect(can(data, mixed('aq-01'), { type: 'useTool', stationId: 'aq-01', tool: 'sniff' })).toBe('no-such-tool')
  })

  it('records an observation only of a mixed tube, in the station\'s own fields, from the choices, and of what a tool has shown', () => {
    const observation = expectedObservation(data.stations[5]!)
    expect(can(data, createLab(data, 'guided'), { type: 'recordObservation', stationId: 'aq-06', observation })).toBe('not-mixed')
    let state = run(data, mixed('aq-06'), looks('aq-06'))
    expect(can(data, state, { type: 'recordObservation', stationId: 'aq-06', observation })).toBe('tool-not-used')
    state = run(data, state, [{ type: 'useTool', stationId: 'aq-06', tool: 'waft' }, { type: 'useTool', stationId: 'aq-06', tool: 'litmus-vapour' }])
    expect(can(data, state, { type: 'recordObservation', stationId: 'aq-06', observation })).toBe('tool-not-used')
    state = run(data, state, [{ type: 'useTool', stationId: 'aq-06', tool: 'litmus-liquid' }])
    const refused = (changed: Observation) => can(data, state, { type: 'recordObservation', stationId: 'aq-06', observation: changed })
    expect(refused(observation)).toBeNull()
    expect(refused({ ...observation, odor: 'like roses' })).toBe('invalid-entry')
    expect(refused({ odor: observation.odor })).toBe('invalid-entry')
    expect(refused({ ...observation, splint: 'pop' })).toBe('invalid-entry')
    expect(reduce(data, state, { type: 'recordObservation', stationId: 'aq-06', observation }).stations[5]!.observation).toEqual(observation)
  })

  it('takes either the touch or the thermometer for the temperature at station 8', () => {
    for (const tool of ['touch', 'thermometer'] as const) {
      const state = run(data, mixed('aq-08'), [...looks('aq-08'), { type: 'useTool', stationId: 'aq-08', tool }])
      expect(can(data, state, { type: 'recordObservation', stationId: 'aq-08', observation: expectedObservation(data.stations[7]!) })).toBeNull()
    }
  })

  it('records what the eye sees only once each part of the tube has been looked at: the bottom for the solid, the liquid for its colour, the surface for the bubbles', () => {
    const record: Action = { type: 'recordObservation', stationId: 'aq-01', observation: expectedObservation(data.stations[0]!) }
    expect(can(data, mixed('aq-01'), record)).toBe('tool-not-used')
    for (const left of LOOKS) {
      const state = run(data, mixed('aq-01'), looks('aq-01').filter((action) => action.type === 'useTool' && action.tool !== left))
      expect(can(data, state, record), left).toBe('tool-not-used')
      expect(reduce(data, state, record)).toBe(state)
    }
    expect(can(data, run(data, mixed('aq-01'), looks('aq-01')), record)).toBeNull()
  })

  it('takes an equation at any time, built from the station\'s palette with no species twice on a side, or "No reaction" alone', () => {
    const state = createLab(data, 'challenge')
    const enter = (entry: Entry) => can(data, state, { type: 'enterEquation', stationId: 'aq-01', form: 'netIonic', entry })
    const good = correctEntry(data, 'aq-01', 'netIonic')
    expect(enter(good)).toBeNull()
    expect(enter(noReaction)).toBeNull()
    expect(enter({ ...good, noReaction: true })).toBe('invalid-entry')
    expect(enter({ ...good, products: [] })).toBe('invalid-entry')
    expect(enter({ ...good, products: [{ speciesId: 'silver-chloride', coefficient: 1, state: 's' }] })).toBe('invalid-entry')
    expect(enter({ ...good, reactants: [...good.reactants, good.reactants[0]!] })).toBe('invalid-entry')
    for (const coefficient of [0, 1.5, 100, -1]) expect(enter({ ...good, products: [{ ...good.products[0]!, coefficient }] })).toBe('invalid-entry')
    expect(enter({ ...good, products: [{ ...good.products[0]!, state: 'x' as 's' }] })).toBe('invalid-entry')
    expect(reduce(data, state, { type: 'enterEquation', stationId: 'aq-01', form: 'netIonic', entry: good }).stations[0]!.equations).toEqual({ molecular: null, completeIonic: null, netIonic: good })
  })

  it('returns the very same state for an action that cannot be done', () => {
    const state = createLab(data, 'guided')
    expect(reduce(data, state, { type: 'useTool', stationId: 'aq-06', tool: 'waft' })).toBe(state)
    expect(reduce(data, state, { type: 'recordObservation', stationId: 'aq-01', observation: {} })).toBe(state)
  })

  it('changes the mode at any time, and nothing else with it', () => {
    const state = mixed('aq-03')
    expect(reduce(data, state, { type: 'setMode', mode: 'challenge' })).toEqual({ ...state, mode: 'challenge' })
  })
})

describe('the view of a station', () => {
  it('shows the hints and the expected observations from the start in Guided, and in Challenge once an observation is recorded', () => {
    expect(stationView(data, createLab(data, 'guided'), 'aq-01').guidanceShown).toBe(true)
    let state = mixed('aq-01', createLab(data, 'challenge'))
    expect(stationView(data, state, 'aq-01').guidanceShown).toBe(false)
    state = run(data, state, [...looks('aq-01'), { type: 'recordObservation', stationId: 'aq-01', observation: { solid: 'white', liquid: 'colourless', bubbles: 'none' } }])
    expect(stationView(data, state, 'aq-01')).toMatchObject({ guidanceShown: true, wrongFields: ['solid', 'liquid'], done: false })
    expect(stationView(data, state, 'aq-02').guidanceShown).toBe(false)
  })

  it('judges what is stored, and stores no judgement: a wrong equation is named, and put right it is not', () => {
    let state = run(data, createLab(data, 'guided'), [{ type: 'enterEquation', stationId: 'aq-09', form: 'netIonic', entry: correctEntry(data, 'aq-09', 'completeIonic') }])
    expect(stationView(data, state, 'aq-09').equations).toMatchObject({ molecular: null, completeIonic: null, netIonic: { problem: 'spectator' } })
    state = run(data, state, [{ type: 'enterEquation', stationId: 'aq-09', form: 'netIonic', entry: correctEntry(data, 'aq-09', 'netIonic') }])
    expect(stationView(data, state, 'aq-09').equations.netIonic).toEqual({ entry: correctEntry(data, 'aq-09', 'netIonic'), problem: null })
    expect(JSON.stringify(state)).not.toMatch(/correct|problem|done/)
  })

  it('gives Guided the count of terms on each side of each curated equation and nothing else of it, and Challenge and the station where nothing reacts no count at all', () => {
    for (const station of data.stations) {
      const { template } = stationView(data, createLab(data, 'guided'), station.id)
      for (const form of FORMS) {
        const curated = station.equations[form]
        expect(template[form], `${station.id} ${form}`).toEqual(curated === null ? null : { reactants: curated.reactants.length, products: curated.products.length })
      }
      expect(JSON.stringify(template)).not.toMatch(/-|coefficient|species/)
      // In Challenge the count is not given at any time: not once an observation is recorded, and not once the equation is correct.
      const challenge = run(data, createLab(data, 'challenge'), stationScript(data, station.id))
      for (const state of [createLab(data, 'challenge'), challenge]) expect(stationView(data, state, station.id).template).toEqual({ molecular: null, completeIonic: null, netIonic: null })
    }
    expect(stationView(data, createLab(data, 'guided'), 'aq-01').template).toEqual({ molecular: { reactants: 2, products: 2 }, completeIonic: { reactants: 4, products: 3 }, netIonic: { reactants: 2, products: 1 } })
    expect(stationView(data, createLab(data, 'guided'), 'aq-05').template).toEqual({ molecular: null, completeIonic: null, netIonic: null })
  })

  it('lists the station\'s tools and fields', () => {
    expect(stationView(data, createLab(data, 'guided'), 'aq-10')).toMatchObject({ mixed: false, uses: [...LOOKS, 'touch', 'splint'], used: [], fields: ['solid', 'liquid', 'bubbles', 'temperature', 'splint'], observation: null, wrongFields: null, done: false })
  })
})

describe('a whole lab', () => {
  it.each(['guided', 'challenge'] as const)('is completed in %s mode when all ten stations have a correct observation and three correct equations, reloaded after every action', (mode) => {
    let state = createLab(data, mode)
    ids.forEach((stationId, i) => {
      expect(state.status).toBe('in-progress')
      state = run(data, state, stationScript(data, stationId), reload)
      expect(doneStations(data, state)).toEqual(ids.slice(0, i + 1))
      expect(stationView(data, state, stationId)).toMatchObject({ done: true, wrongFields: [], guidanceShown: true })
    })
    expect(state.status).toBe('completed')
    expect(state.mode).toBe(mode)
    // The same lab without a reload ends in the same state.
    expect(ids.reduce((s, stationId) => run(data, s, stationScript(data, stationId)), createLab(data, mode))).toEqual(state)
  })

  it('is completed in any order of stations, and with the equations entered before the tube is mixed', () => {
    let state = createLab(data, 'challenge')
    for (const stationId of [...ids].reverse()) {
      const [mix, ...rest] = stationScript(data, stationId)
      const equations = rest.filter((a) => a.type === 'enterEquation')
      state = run(data, state, [...equations, mix!, ...rest.filter((a) => a.type !== 'enterEquation')], reload)
    }
    expect(state.status).toBe('completed')
  })

  it('takes a wrong attempt and then the right one: attempts are unlimited', () => {
    let state = createLab(data, 'challenge')
    for (const stationId of ids) {
      const station = data.stations[ids.indexOf(stationId)]!
      const wrong = Object.fromEntries(fieldsOf(station).map((field) => [field, choicesFor(data, field).find((choice) => choice !== expectedObservation(station)[field])!]))
      const other = station.equations.netIonic === null ? correctEntry(data, 'aq-08', 'netIonic') : noReaction
      const [mix, ...rest] = stationScript(data, stationId)
      state = run(data, state, [mix!, ...usesOf(station).map((tool): Action => ({ type: 'useTool', stationId, tool })), { type: 'recordObservation', stationId, observation: wrong }], reload)
      if (station.equations.netIonic !== null) state = run(data, state, FORMS.map((form): Action => ({ type: 'enterEquation', stationId, form, entry: other })), reload)
      expect(stationView(data, state, stationId).done).toBe(false)
      expect(stationView(data, state, stationId).wrongFields).toEqual(fieldsOf(station))
      state = run(data, state, rest, reload)
      expect(stationView(data, state, stationId).done).toBe(true)
    }
    expect(state.status).toBe('completed')
  })

  it('takes no more work once completed, but for the mode', () => {
    const state = ids.reduce((s, stationId) => run(data, s, stationScript(data, stationId)), createLab(data, 'guided'))
    for (const action of [
      { type: 'mix', stationId: 'aq-01' },
      { type: 'useTool', stationId: 'aq-06', tool: 'waft' },
      { type: 'recordObservation', stationId: 'aq-01', observation: expectedObservation(data.stations[0]!) },
      { type: 'enterEquation', stationId: 'aq-01', form: 'netIonic', entry: noReaction },
    ] as Action[]) {
      expect(can(data, state, action)).toBe('lab-completed')
      expect(reduce(data, state, action)).toBe(state)
    }
    expect(can(data, state, { type: 'setMode', mode: 'challenge' })).toBeNull()
    expect(reload(reduce(data, state, { type: 'setMode', mode: 'challenge' })).status).toBe('completed')
  })

  it('goes back to in progress when a correct entry of a station that was done is replaced by a wrong one, while the lab is not yet complete', () => {
    let state = run(data, createLab(data, 'guided'), stationScript(data, 'aq-08'))
    expect(doneStations(data, state)).toEqual(['aq-08'])
    state = run(data, state, [{ type: 'enterEquation', stationId: 'aq-08', form: 'molecular', entry: noReaction }], reload)
    expect(doneStations(data, state)).toEqual([])
  })
})

describe('no state a learner can reach leaves them unable to go on', () => {
  // Every action a page could send from a state: each kind at each station, with right, wrong and malformed entries.
  function someAction(rng: () => number): Action {
    const pick = <T>(list: readonly T[]): T => list[Math.floor(rng() * list.length)]!
    const stationId = pick([...ids, 'aq-11'])
    const station = data.stations[ids.indexOf(stationId)] ?? data.stations[0]!
    const entries: Entry[] = [
      noReaction,
      ...FORMS.map((form) => correctEntry(data, station.id, form)),
      { noReaction: false, reactants: [{ speciesId: pick(station.paletteSpecies), coefficient: 1 + Math.floor(rng() * 3), state: pick(['aq', 's', 'l', 'g'] as const) }], products: [{ speciesId: pick(station.paletteSpecies), coefficient: 1, state: 'aq' }] },
      { noReaction: false, reactants: [], products: [] },
    ]
    const observation = Object.fromEntries(fieldsOf(station).map((field) => [field, pick(choicesFor(data, field))]))
    return pick<Action>([
      { type: 'setMode', mode: pick(['guided', 'challenge'] as const) },
      { type: 'mix', stationId },
      { type: 'useTool', stationId, tool: pick([...TOOL_USES, 'sniff'] as const) },
      { type: 'recordObservation', stationId, observation: pick([observation, expectedObservation(station), {}]) },
      { type: 'enterEquation', stationId, form: pick(FORMS), entry: pick(entries) },
    ])
  }

  /** From any state, the work still to do at each station: the part of the careful script that is not done yet. */
  function finish(state: AqueousState): AqueousState {
    for (const stationId of ids) {
      for (const action of stationScript(data, stationId)) {
        if (action.type === 'mix' && state.stations[ids.indexOf(stationId)]!.mixed) continue
        if (state.status === 'completed') return state
        state = run(data, state, [action])
      }
    }
    return reload(state)
  }

  it('from 60 seeded walks of 40 actions each, every state passes the stored schema, and the lab can still be completed from where each walk ends', () => {
    let refused = 0
    let done = 0
    for (let seed = 1; seed <= 60; seed++) {
      const rng = mulberry32(seed)
      let state = createLab(data, 'challenge')
      for (let step = 0; step < 40; step++) {
        const action = someAction(rng)
        const next = reduce(data, state, action)
        if (can(data, state, action) !== null) {
          expect(next).toBe(state)
          refused++
        }
        state = reload(next)
      }
      if (state.status === 'completed') done++
      expect(finish(state).status, `seed ${seed}`).toBe('completed')
    }
    // The walks do meet refusals, about half their actions, and none of them finishes the lab by chance: the check is of states part-way.
    expect([refused, done]).toEqual([1208, 0])
  }, 30_000)
})

describe('the stored record', () => {
  const full = ids.reduce((s, stationId) => run(data, s, stationScript(data, stationId)), createLab(data, 'guided'))
  const edited = (edit: (state: AqueousState) => void) => {
    const copy: AqueousState = JSON.parse(JSON.stringify(full))
    edit(copy)
    return schema.safeParse(copy).success
  }

  it('comes back from JSON as it went in', () => {
    expect(reload(full)).toEqual(full)
    expect(JSON.parse(JSON.stringify(full))).toEqual(full)
  })

  it('is refused when it holds what the reducer would not have stored', () => {
    expect(edited(() => {})).toBe(true)
    expect(edited((s) => void s.stations.pop())).toBe(false)
    expect(edited((s) => void (s.status = 'in-progress'))).toBe(false)
    expect(edited((s) => void (s.stations[0]!.equations.netIonic = null))).toBe(false) // completed, but a station is not done
    expect(edited((s) => void (s.stations[5]!.used = [...LOOKS, 'waft', 'waft', 'litmus-liquid', 'litmus-vapour']))).toBe(false)
    expect(edited((s) => void (s.stations[0]!.used = ['splint']))).toBe(false)
    // An observation of a part of the tube that was never looked at.
    expect(edited((s) => void (s.stations[0]!.used = ['look-bottom', 'look-liquid']))).toBe(false)
    expect(edited((s) => void (s.stations[0]!.used = ['look-surface', 'look-bottom', 'look-liquid']))).toBe(true)
    expect(edited((s) => void (s.stations[0]!.mixed = false))).toBe(false)
    expect(edited((s) => void (s.stations[0]!.observation!.solid = 'purple'))).toBe(false)
    expect(edited((s) => void (s.stations[0]!.equations.netIonic!.products[0]!.speciesId = 'unobtainium'))).toBe(false)
    expect(edited((s) => void ((s as unknown as { seed: number }).seed = 1))).toBe(false)
    expect(schema.safeParse(null).success).toBe(false)
  })

  it('is refused when its status claims a lab complete that its entries do not make so', () => {
    const state = { ...createLab(data, 'guided'), status: 'completed' as const }
    expect(schema.safeParse(state).success).toBe(false)
  })
})
