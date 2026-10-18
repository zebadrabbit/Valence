import { describe, expect, it } from 'vitest'
import { FIELD_AT, KIND_ANSWERS, STATION_IDS, reactionsData, type StationId } from '@/chem-data/reactions/data'
import sources from '@/chem-data/sources.json'
import { mulberry32 } from '../rng'
import { can, reduce, type Action } from './actions'
import { balances } from './built'
import { modelFrom, type ReactionsModel } from './model'
import { PINNED_MODEL } from './pinnedModel'
import { doneStations, runOutcome, runRecords, stationView, type VesselShows } from './select'
import { createLab, reactionsStateSchema, stationModel, type Mode, type ReactionsState } from './state'
import { rightEntry, run, wholeLab, wholeStation, wrongEntry } from './testkit'

// Spec 24.5, the types of reactions lab's acceptance list, on the engine and the stored record. Its last item,
// the description in words of every picture, is the wording module's (src/app/lab/reactions/messages.test.ts);
// that the build refuses an unbalanced equation of the record is src/chem-data/reactions/build.test.ts.

const m = modelFrom(reactionsData)
const schema = reactionsStateSchema(m)
const MODES: Mode[] = ['guided', 'challenge']
/** Through JSON and the schema, as a reload does. */
const reloaded = (state: ReactionsState): ReactionsState => schema.parse(JSON.parse(JSON.stringify(state)))

const tube = (colour: string, microlitres: number, solid: string | null = null) => ({ liquid: { colour, cloudy: solid !== null, microlitres }, solid: solid === null ? null : { colour: solid, settled: false } })
const QUIET = { bubbles: 'none', light: null, residue: null, warm: false } as const
/**
 * What each vessel shows before the station's action and after it, written out from spec 24.1 and not from the
 * engine: zinc gets a red-brown coating and the blue fades; the strip burns with a white light and leaves a white
 * powder; magnesium bubbles fast, zinc slowly and copper not at all; two colourless solutions give a white solid;
 * the peroxide bubbles and the tube grows warm.
 */
const PROCEDURE: Record<StationId, Record<string, [before: VesselShows, after: VesselShows]>> = {
  'zinc-copper-sulfate': {
    tube: [
      { drawn: 'tube', tube: tube('blue', 3000), metal: { colour: 'grey', coating: null, placed: false }, ...QUIET },
      { drawn: 'tube', tube: tube('paler blue', 3000), metal: { colour: 'grey', coating: 'red-brown', placed: true }, ...QUIET },
    ],
  },
  'magnesium-flame': {
    strip: [
      { drawn: 'flame', tube: null, metal: { colour: 'silvery', coating: null, placed: false }, ...QUIET },
      { drawn: 'flame', tube: null, metal: null, ...QUIET, light: 'white light', residue: 'white' },
    ],
  },
  'metals-in-acid': {
    magnesium: [
      { drawn: 'tube', tube: tube('colourless', 3000), metal: { colour: 'silvery', coating: null, placed: false }, ...QUIET },
      { drawn: 'tube', tube: tube('colourless', 3000), metal: { colour: 'silvery', coating: null, placed: true }, ...QUIET, bubbles: 'fast' },
    ],
    zinc: [
      { drawn: 'tube', tube: tube('colourless', 3000), metal: { colour: 'grey', coating: null, placed: false }, ...QUIET },
      { drawn: 'tube', tube: tube('colourless', 3000), metal: { colour: 'grey', coating: null, placed: true }, ...QUIET, bubbles: 'slow' },
    ],
    copper: [
      { drawn: 'tube', tube: tube('colourless', 3000), metal: { colour: 'reddish', coating: null, placed: false }, ...QUIET },
      { drawn: 'tube', tube: tube('colourless', 3000), metal: { colour: 'reddish', coating: null, placed: true }, ...QUIET },
    ],
  },
  'two-solutions': {
    tube: [
      { drawn: 'tube', tube: tube('colourless', 2000), metal: null, ...QUIET },
      { drawn: 'tube', tube: tube('colourless', 4000, 'white'), metal: null, ...QUIET },
    ],
  },
  peroxide: {
    tube: [
      { drawn: 'tube', tube: tube('colourless', 3000), metal: null, ...QUIET },
      { drawn: 'tube', tube: tube('pale yellow', 3250), metal: null, ...QUIET, bubbles: 'some', warm: true },
    ],
  },
}

describe('the model', () => {
  it('is the one the stored record gives: the tests are pinned to it', () => {
    expect(m).toEqual(PINNED_MODEL)
  })
})

describe('for each station, what is shown before and after is what its stored record gives and nothing else, and the station counts when what was seen, the kind and the equation are right (24.5)', () => {
  it.each(STATION_IDS)('%s shows the procedure, before and after', (stationId) => {
    for (const mode of MODES) {
      const before = createLab(mode)
      const after = run(m, before, [{ type: 'act', station: stationId }])
      const shows = (state: ReactionsState) => Object.fromEntries(stationView(m, state, stationId).vessels.map((v) => [v.id, v.shows]))
      expect(shows(before), mode).toEqual(Object.fromEntries(Object.entries(PROCEDURE[stationId]).map(([id, [was]]) => [id, was])))
      expect(shows(after), mode).toEqual(Object.fromEntries(Object.entries(PROCEDURE[stationId]).map(([id, [, is]]) => [id, is])))
    }
  })

  it.each(STATION_IDS)('%s says in the words of each look what the record stores for it, and no words before the part is looked at', (stationId) => {
    const stored = reactionsData.stations.find((s) => s.id === stationId)!
    let state = createLab('challenge')
    const words = () => stationView(m, state, stationId).vessels.map((v) => v.looks.map((l) => l.words))
    expect(words().flat().every((w) => w === null)).toBe(true)
    const looks: Action[] = stored.vessels.flatMap((v) => v.looks.map((l): Action => ({ type: 'look', station: stationId, vessel: v.id, at: l.at })))
    state = run(m, state, looks)
    expect(words()).toEqual(stored.vessels.map((v) => v.looks.map((l) => l.before)))
    state = run(m, state, [{ type: 'act', station: stationId }])
    expect(words().flat().every((w) => w === null)).toBe(true)
    state = run(m, state, looks)
    expect(words()).toEqual(stored.vessels.map((v) => v.looks.map((l) => l.after)))
    // What the view asks for is what the record asks for, each field opened by a look the vessel has.
    for (const [i, vessel] of stationView(m, state, stationId).vessels.entries()) {
      expect(vessel.fields.map((f) => f.field)).toEqual(stored.vessels[i]!.asks)
      for (const { field, choices } of vessel.fields) {
        expect(choices).toEqual(reactionsData.choices[field])
        expect(vessel.looks.map((l) => l.at)).toContain(FIELD_AT[field])
      }
    }
  })

  it.each(STATION_IDS)('%s counts when a careful learner works it, in either mode, and a learner records what the looks say', (stationId) => {
    for (const mode of MODES) {
      const state = wholeStation(m, createLab(mode), stationId)
      expect(stationView(m, state, stationId), mode).toMatchObject({ outcome: { state: 'counts' }, done: true })
      expect(doneStations(m, state)).toEqual([stationId])
    }
  })

  it.each(STATION_IDS)('%s does not count with what was seen, a kind, an equation or the order wrong, each alone', (stationId) => {
    const station = stationModel(m, stationId)
    const vessel = station.vessels[0]!
    const outcome = (how: Parameters<typeof wholeStation>[3]) => stationView(m, wholeStation(m, createLab('challenge'), stationId, how), stationId).outcome
    expect(outcome({ wrongObservationAt: vessel.id })).toEqual({ state: 'does-not-count', reasons: [{ kind: 'observation-wrong', vessel: vessel.id }] })
    expect(outcome({ wrongKindAt: vessel.id })).toEqual({ state: 'does-not-count', reasons: [{ kind: 'kind-wrong', vessel: vessel.id }] })
    for (const [how, problem] of [['extra', 'species-extra'], ['missing', 'species-missing'], ['state', 'state-wrong'], ['unbalanced', 'not-balanced']] as const) {
      expect(outcome({ wrongEquationAt: vessel.id, wrongEquation: how }), how).toEqual({ state: 'does-not-count', reasons: [{ kind: 'equation-wrong', vessel: vessel.id, problem }] })
    }
    if (station.order !== null) expect(outcome({ wrongOrder: true })).toEqual({ state: 'does-not-count', reasons: [{ kind: 'order-wrong' }] })
  })

  it('has one equation for each metal that reacts at the station of the three metals, none for copper, and the order of the three (24.2)', () => {
    const state = wholeStation(m, createLab('guided'), 'metals-in-acid')
    const view = stationView(m, state, 'metals-in-acid')
    expect(view.vessels.map((v) => [v.id, v.kind, v.equation === null ? null : v.equation.problem])).toEqual([['magnesium', 'single-replacement', null], ['zinc', 'single-replacement', null], ['copper', 'none', null]])
    expect(view.vessels[2]!.equation).toBeNull()
    expect(view.order).toEqual({ metals: ['magnesium', 'zinc', 'copper'], open: false, said: ['magnesium', 'zinc', 'copper'], right: true })
  })

  it('completes the lab when all five stations count', () => {
    for (const mode of MODES) {
      const state = wholeLab(m, createLab(mode))
      expect([state.status, doneStations(m, state)]).toEqual(['completed', [...STATION_IDS]])
    }
  })
})

describe('every equation of the record balances in atoms and in charge; the builder refuses or marks an unbalanced one (24.5)', () => {
  const equations = STATION_IDS.flatMap((stationId) => stationModel(m, stationId).vessels.filter((v) => v.equation !== null).map((vessel) => ({ where: `${stationId} ${vessel.id}`, stationId, vessel })))

  it.each(equations)('$where balances, and no species of it carries a charge', ({ vessel }) => {
    expect(balances(m, vessel.equation!)).toBe(true)
    const stored = reactionsData.species.filter((s) => [...vessel.equation!.reactants, ...vessel.equation!.products].some((term) => term.speciesId === s.id))
    expect(stored.every((s) => !('charge' in s))).toBe(true)
  })

  it.each(equations)('$where: Guided refuses an unbalanced equation, and Challenge marks it when the station is checked', ({ stationId, vessel }) => {
    const upTo = (mode: Mode) => {
      let state = run(m, createLab(mode), [{ type: 'act', station: stationId }])
      state = run(m, state, stationView(m, state, stationId).vessels.flatMap((v) => v.looks.map((l): Action => ({ type: 'look', station: stationId, vessel: v.id, at: l.at }))))
      return run(m, state, [
        { type: 'observe', station: stationId, vessel: vessel.id, observation: Object.fromEntries(vessel.asks.map((field) => [field, vessel.after[field]!])) },
        { type: 'sayKind', station: stationId, vessel: vessel.id, kind: vessel.kind },
      ])
    }
    const unbalanced: Action = { type: 'enterEquation', station: stationId, vessel: vessel.id, entry: wrongEntry(m, stationId, vessel.id, 'unbalanced') }
    expect(can(m, upTo('guided'), unbalanced)).toBe('not-balanced')
    const recorded = run(m, upTo('challenge'), [unbalanced])
    const shown = stationView(m, recorded, stationId).vessels.find((v) => v.id === vessel.id)!
    expect(shown.equation).toMatchObject({ judged: false, problem: null })
    const checked = wholeStation(m, createLab('challenge'), stationId, { wrongEquationAt: vessel.id, wrongEquation: 'unbalanced' })
    expect(stationView(m, checked, stationId).vessels.find((v) => v.id === vessel.id)!.equation).toMatchObject({ judged: true, problem: 'not-balanced' })
  })
})

describe('every stored observation and rule has a source (24.5)', () => {
  it('cites a stored source for everything seen, every kind, every equation, every note, the order and every species', () => {
    const known = new Set(sources.map((s) => s.id))
    const cited: [string, { sourceId: string }][] = [
      ['the order of the metals', reactionsData.activity],
      ...reactionsData.kinds.map((kind): [string, { sourceId: string }] => [`the kind ${kind.id}`, kind]),
      ...reactionsData.species.map((s): [string, { sourceId: string }] => [`the species ${s.id}`, s]),
      ...reactionsData.stations.flatMap((station) => [
        ...station.notes.map((note, i): [string, { sourceId: string }] => [`${station.id}, note ${i + 1}`, note]),
        ...station.vessels.flatMap((vessel): [string, { sourceId: string }][] => [
          [`${station.id} ${vessel.id}, its kind`, vessel.kind],
          ...(vessel.equation === null ? [] : [[`${station.id} ${vessel.id}, its equation`, vessel.equation] as [string, { sourceId: string }]]),
          ...(vessel.liquid === null ? [] : [[`${station.id} ${vessel.id}, its liquid`, vessel.liquid] as [string, { sourceId: string }]]),
          ...(vessel.metal === null ? [] : [[`${station.id} ${vessel.id}, its metal`, vessel.metal.colour] as [string, { sourceId: string }]]),
          ...vessel.asks.map((field): [string, { sourceId: string }] => [`${station.id} ${vessel.id}, ${field}`, vessel.after[field]!]),
        ]),
      ]),
    ]
    expect(cited.length).toBeGreaterThan(70)
    for (const [where, value] of cited) expect(known.has(value.sourceId), where).toBe(true)
  })
})

describe('the stored record round-trips; no state a learner can reach leaves them unable to go on (24.5)', () => {
  it('comes back the same through JSON and the schema after every action of a whole lab, careful or not, in either mode', () => {
    for (const mode of MODES) {
      expect(wholeLab(m, createLab(mode), reloaded)).toEqual(wholeLab(m, createLab(mode)))
      let state = createLab(mode)
      if (mode === 'challenge') for (const stationId of STATION_IDS) state = wholeStation(m, state, stationId, { wrongKindAt: stationModel(m, stationId).vessels[0]!.id, wrongOrder: true }, reloaded)
      expect(reloaded(state)).toEqual(state)
    }
  })

  it('refuses a stored record that no lab could have made', () => {
    const state = wholeLab(m, createLab('guided'))
    const edit = (change: (s: ReactionsState) => void) => {
      const copy: ReactionsState = JSON.parse(JSON.stringify(state))
      change(copy)
      return schema.safeParse(copy).success
    }
    expect(edit(() => {})).toBe(true)
    expect(edit((s) => void (s.status = 'in-progress'))).toBe(false)
    expect(edit((s) => void (s.stations.peroxide[0]!.index = 3))).toBe(false)
    // With the station's action taken out, what follows it could not have been done.
    expect(edit((s) => void s.stations.peroxide[0]!.events.splice(s.stations.peroxide[0]!.events.findIndex((event) => event.t === 'act'), 1))).toBe(false)
    expect(edit((s) => void s.stations.peroxide[0]!.events.push({ t: 'act' }))).toBe(false)
    expect(edit((s) => void ((s as { extra?: number }).extra = 1))).toBe(false)
    expect(edit((s) => void (s.stations.peroxide = []))).toBe(false)
    // A record made with other answers is read as it stands, and judged again.
    const other: ReactionsModel = { ...m, stations: m.stations.map((station) => ({ ...station, vessels: station.vessels.map((v) => ({ ...v, kind: v.kind === 'none' ? 'none' : 'combination' })) })) }
    expect(reactionsStateSchema(other).safeParse(state).success).toBe(false)
  })

  it('always leaves something to do: from two thousand states reached by chance, some action can be done and changes the state, and the state round-trips', () => {
    const rng = mulberry32(24)
    const pick = <T,>(list: readonly T[]): T => list[Math.floor(rng() * list.length)]!
    const anyAction = (state: ReactionsState): Action => {
      const station = pick(STATION_IDS)
      const model = stationModel(m, station)
      const vessel = pick(model.vessels)
      const entries = vessel.equation === null ? [rightEntry(m, station, model.vessels[0]!.id)] : [rightEntry(m, station, vessel.id), wrongEntry(m, station, vessel.id, 'unbalanced'), wrongEntry(m, station, vessel.id, 'extra')]
      // Now and then a station is set up again or the mode is changed; the rest of the time something is done at a station.
      const chance = rng()
      if (chance < 0.03) return { type: 'workAgain', station }
      if (chance < 0.04) return { type: 'setMode', mode: state.mode === 'guided' ? 'challenge' : 'guided' }
      return pick<Action>([
        { type: 'act', station },
        { type: 'look', station, vessel: vessel.id, at: pick(vessel.looks).at },
        { type: 'look', station, vessel: vessel.id, at: pick(vessel.looks).at },
        { type: 'observe', station, vessel: vessel.id, observation: Object.fromEntries(vessel.asks.map((field) => [field, pick([vessel.after[field]!, pick(m.choices[field])])])) },
        { type: 'sayKind', station, vessel: vessel.id, kind: pick([vessel.kind, pick(KIND_ANSWERS)]) },
        { type: 'enterEquation', station, vessel: vessel.id, entry: pick(entries) },
        { type: 'sayOrder', station, order: pick([['magnesium', 'zinc', 'copper'], ['zinc', 'magnesium', 'copper']]) },
        { type: 'checkStation', station },
      ])
    }
    let state = createLab('guided')
    let reached = 0
    const outcomes = new Set<string>()
    for (let step = 0; step < 14000; step++) {
      const next = reduce(m, state, anyAction(state))
      if (next === state) continue
      state = next
      reached++
      if (reached % 25 === 0) expect(reloaded(state)).toEqual(state)
      // At every station something can be done: a part looked at, the action, an entry, the check, or the station set up again.
      for (const station of STATION_IDS) {
        const view = stationView(m, state, station)
        outcomes.add(view.outcome.state)
        const open: Action[] = [{ type: 'act', station }, { type: 'workAgain', station }, { type: 'checkStation', station }, ...view.vessels.flatMap((v) => v.looks.map((l): Action => ({ type: 'look', station, vessel: v.id, at: l.at })))]
        expect(open.some((action) => can(m, state, action) === null), `${station} after ${reached} changes`).toBe(true)
        if (view.outcome.state !== 'open' || view.acted) expect(can(m, state, { type: 'workAgain', station })).not.toBe('nothing-to-repeat')
      }
    }
    expect(reached).toBeGreaterThan(2000)
    // Among them are runs still open, runs waiting to be checked, runs that count and runs that do not.
    expect([...outcomes].sort()).toEqual(['counts', 'does-not-count', 'open', 'to-check'])
  }, 60_000)

  it('lists every run of a station for its record, with marks only on a run that was checked', () => {
    let state = wholeStation(m, createLab('challenge'), 'peroxide', { wrongKindAt: 'tube' })
    state = run(m, state, [{ type: 'workAgain', station: 'peroxide' }, { type: 'act', station: 'peroxide' }, { type: 'workAgain', station: 'peroxide' }])
    state = wholeStation(m, state, 'peroxide')
    const records = runRecords(m, state, 'peroxide')
    expect(records.map((r) => r.outcome.state)).toEqual(['does-not-count', 'open', 'counts'])
    expect(records[0]!.vessels[0]!).toMatchObject({ wrongFields: [], kindRight: false, equation: { judged: true } })
    expect(records[1]!.vessels[0]!).toMatchObject({ observation: null, wrongFields: null, kind: null, kindRight: null, equation: null })
    expect(records[2]!.vessels[0]!).toMatchObject({ wrongFields: [], kindRight: true, equation: { judged: true, problem: null } })
    expect(state.stations.peroxide.map((stored) => runOutcome(m, 'peroxide', stored).state)).toEqual(['does-not-count', 'open', 'counts'])
    expect(runRecords(m, wholeStation(m, createLab('guided'), 'metals-in-acid'), 'metals-in-acid')[0]!.order).toEqual({ said: ['magnesium', 'zinc', 'copper'], right: true })
  })
})

describe("Challenge shows nothing of what is expected before the learner's answers are recorded: a station's kind and its equation are not on the page before they are given (24.5)", () => {
  /** The same lab with every answer another one: each kind, each equation, the catalyst and the order. What is seen is left as it is. */
  const others: ReactionsModel = {
    ...m,
    stations: m.stations.map((station) => ({
      ...station,
      order: station.order === null ? null : [...station.order].reverse(),
      vessels: station.vessels.map((vessel) => ({
        ...vessel,
        kind: vessel.kind === 'combination' ? 'decomposition' : 'combination',
        equation: { reactants: [{ speciesId: station.tiles.at(-1)!, coefficient: 1 }], products: [{ speciesId: station.tiles.at(-2)!, coefficient: 3 }, { speciesId: station.tiles.at(-3)!, coefficient: 1 }] },
        catalyst: vessel.catalyst === null ? station.tiles[0]! : null,
      })),
    })),
  }

  it.each(STATION_IDS)('%s: the view is the same whatever the right answers are, at every step until the station is checked, and differs once it is', (stationId) => {
    let state = createLab('challenge')
    const same = () => expect(stationView(others, state, stationId)).toEqual(stationView(m, state, stationId))
    const step = (action: Action) => {
      expect(can(others, state, action)).toBe(can(m, state, action))
      state = reduce(m, state, action)
      same()
    }
    same()
    const station = stationModel(m, stationId)
    const looks = station.vessels.flatMap((v) => v.looks.map((l): Action => ({ type: 'look', station: stationId, vessel: v.id, at: l.at })))
    looks.forEach(step)
    step({ type: 'act', station: stationId })
    looks.forEach(step)
    for (const vessel of station.vessels) {
      step({ type: 'observe', station: stationId, vessel: vessel.id, observation: Object.fromEntries(vessel.asks.map((field) => [field, vessel.after[field]!])) })
      // The view says nothing of whether there is an equation to write until a kind is said, and then only what the learner said.
      expect(stationView(m, state, stationId).vessels.find((v) => v.id === vessel.id)!).toMatchObject({ equationOpen: false, places: null, catalyst: null, kindRight: null })
      step({ type: 'sayKind', station: stationId, vessel: vessel.id, kind: 'double-replacement' })
      expect(stationView(m, state, stationId).vessels.find((v) => v.id === vessel.id)!).toMatchObject({ equationOpen: true, places: null, catalyst: null, kindRight: null })
      step({ type: 'enterEquation', station: stationId, vessel: vessel.id, entry: rightEntry(m, stationId, station.vessels.find((v) => v.equation !== null)!.id) })
    }
    if (station.order !== null) step({ type: 'sayOrder', station: stationId, order: station.order })
    expect(stationView(m, state, stationId).outcome.state).toBe('to-check')
    state = reduce(m, state, { type: 'checkStation', station: stationId })
    expect(stationView(others, state, stationId)).not.toEqual(stationView(m, state, stationId))
  })

  it('offers at every station more tiles than its equations need, the same tiles for every vessel, and keeps the catalyst and the count of places back', () => {
    for (const stationId of STATION_IDS) {
      const station = stationModel(m, stationId)
      const view = stationView(m, createLab('challenge'), stationId)
      const needed = new Set(station.vessels.flatMap((v) => (v.equation === null ? [] : [...v.equation.reactants, ...v.equation.products].map((t) => t.speciesId))))
      expect(view.tiles.length - needed.size, stationId).toBeGreaterThanOrEqual(2)
      expect(view.tiles.map((t) => t.speciesId)).toEqual(station.tiles)
      expect(JSON.stringify(view)).not.toMatch(/"places":\{|"catalyst":\{/)
    }
    // The catalyst is handed over once the station counts, and not before.
    const done = wholeStation(m, createLab('challenge'), 'peroxide')
    expect(stationView(m, done, 'peroxide').vessels[0]!.catalyst).toEqual({ speciesId: 'iron-iii-chloride', formula: 'FeCl₃', name: 'iron(III) chloride' })
    expect(stationView(m, wholeStation(m, createLab('challenge'), 'peroxide', { check: false }), 'peroxide').vessels[0]!.catalyst).toBeNull()
  })

  it('names no kind in a station\'s title, and the record offers the same five answers for the kind at every vessel', () => {
    for (const station of reactionsData.stations) expect(station.title).not.toMatch(/replacement|combination|decomposition|displace|synthesis|catal/i)
    expect(KIND_ANSWERS).toEqual(['combination', 'decomposition', 'single-replacement', 'double-replacement', 'none'])
  })
})
