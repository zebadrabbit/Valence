import { describe, expect, it } from 'vitest'
import { aqueousData as data } from '@/chem-data/aqueous/data'
import { createLab, describeStationResult, stationView } from '@/engine/aqueous'
import { run, stationScript } from '@/engine/aqueous/testkit'
import { blend, bottleLook, progressOf, tubeLook } from './stationLook'

describe('what a bottle looks like before it is mixed', () => {
  const looks = Object.fromEntries(data.reagents.map((r) => [r.id, bottleLook(data, r.id)]))

  it('is, for a solution, the colour its one coloured ion gives it, by the name and the value the record stores; and colourless, with no colour to draw, where it has none', () => {
    expect(Object.fromEntries(data.reagents.filter((r) => r.form === 'solution').map((r) => [r.id, [looks[r.id]!.words, looks[r.id]!.hex]]))).toEqual({
      'fecl3-0.5m': ['yellow-orange solution', '#D99A2B'],
      'naoh-1m': ['colourless solution', null],
      'naoh-6m': ['colourless solution', null],
      'na2co3-0.5m': ['colourless solution', null],
      'cuso4-0.5m': ['blue solution', '#3B82C4'],
      'nicl2-0.5m': ['green solution', '#4CAF6E'],
      'bacl2-0.5m': ['colourless solution', null],
      'cocl2-0.5m': ['pink solution', '#E2749A'],
      'nh4no3-0.5m': ['colourless solution', null],
      'hcl-1m': ['colourless solution', null],
      'hcl-3m': ['colourless solution', null],
      'hcl-6m': ['colourless solution', null],
      'agno3-0.1m': ['colourless solution', null],
    })
    for (const reagent of data.reagents.filter((r) => r.form === 'solution')) {
      const coloured = reagent.ions.map((ion) => data.species.find((s) => s.id === ion.speciesId)!).filter((s) => s.solutionColor)
      // No bottle holds two coloured ions, so no bottle's colour is a blend that the record has no name for.
      expect(coloured.length, reagent.id).toBeLessThanOrEqual(1)
      expect(looks[reagent.id], reagent.id).toEqual(coloured[0] ? { words: `${coloured[0].solutionColor!.value.name} solution`, hex: coloured[0].solutionColor!.value.hex } : { words: 'colourless solution', hex: null })
    }
  })

  it('is, for a solid or a metal, the appearance the record stores for it, in words alone', () => {
    expect(looks.caco3).toEqual({ words: 'white powder', hex: null })
    expect(looks.mg).toEqual({ words: 'silvery metal ribbon', hex: null })
    for (const reagent of data.reagents.filter((r) => r.form !== 'solution')) expect(looks[reagent.id], reagent.id).toEqual({ words: reagent.appearance!.value, hex: null })
  })

  it('is the colour the same ion gives the mixed tube where it is the one coloured ion left: a bottle and a tube do not differ', () => {
    // Station 4 leaves the copper(II) ion of its copper sulfate, and station 9 the cobalt(II) ion of its cobalt chloride.
    expect(tubeLook(data, 'aq-04').liquid).toEqual({ name: 'blue', hex: looks['cuso4-0.5m']!.hex })
    expect(tubeLook(data, 'aq-09').liquid).toEqual({ name: 'pink', hex: looks['cocl2-0.5m']!.hex })
  })
})

describe('what the drawn tube shows', () => {
  const looks = Object.fromEntries(data.stations.map((s) => [s.id, tubeLook(data, s.id)]))

  it('is the liquid, the solid and the bubbles of each station', () => {
    expect(Object.fromEntries(Object.entries(looks).map(([id, look]) => [id, [look.liquid.name, look.solid?.name ?? null, look.bubbles]]))).toEqual({
      'aq-01': ['yellow-orange', 'rust-brown', false],
      'aq-02': ['colourless', 'blue-green', false],
      'aq-03': ['colourless', 'pale green', false],
      'aq-04': ['blue', 'white', false],
      'aq-05': ['orange', null, false],
      'aq-06': ['colourless', null, false],
      'aq-07': ['colourless', null, true],
      'aq-08': ['colourless', null, false],
      'aq-09': ['pink', 'white', false],
      'aq-10': ['colourless', null, true],
    })
  })

  it('agrees with the expected record and with the engine\'s description of the tube: the same solid, the same colour of liquid, bubbles or none', () => {
    for (const station of data.stations) {
      const look = looks[station.id]!
      const words = describeStationResult(data, station.id)
      expect(look.liquid.name, station.id).toBe(station.expected.liquidColor)
      expect(look.solid?.name ?? null, station.id).toBe(station.expected.precipitateColor)
      expect(look.bubbles, station.id).toBe(station.expected.bubbles)
      expect(words, station.id).toContain(`is ${look.liquid.name}.`)
      if (look.solid) expect(words, station.id).toContain(look.solid.name)
      expect(/bubbles of/.test(words), station.id).toBe(look.bubbles)
    }
  })

  it("gives the liquid the stored colour of the one coloured ion left, a blend of the two where two are left, and water's where none is", () => {
    const hex = (id: string) => data.species.find((s) => s.id === id)!.solutionColor!.value.hex
    expect(looks['aq-01']!.liquid.hex).toBe(hex('iron-iii-ion'))
    expect(looks['aq-04']!.liquid.hex).toBe(hex('copper-ii-ion'))
    expect(looks['aq-09']!.liquid.hex).toBe(hex('cobalt-ii-ion'))
    expect(looks['aq-05']!.liquid.hex).toBe(blend([hex('cobalt-ii-ion'), hex('iron-iii-ion')]))
    expect(new Set(['aq-02', 'aq-03', 'aq-06', 'aq-07', 'aq-08', 'aq-10'].map((id) => looks[id]!.liquid.hex)).size).toBe(1)
  })

  it('blends colours channel by channel', () => {
    expect(blend(['#000000', '#ffffff'])).toBe('#808080')
    expect(blend(['#102030'])).toBe('#102030')
  })

  it('has a colour to draw for every solid a station forms, each its own', () => {
    const solids = data.stations.flatMap((s) => (looks[s.id]!.solid ? [looks[s.id]!.solid!] : []))
    for (const solid of solids) expect(solid.hex, solid.name).toMatch(/^#[0-9a-f]{6}$/i)
    const byName = new Map(solids.map((solid) => [solid.name, solid.hex]))
    expect(new Set(byName.values()).size).toBe(byName.size)
    expect([...byName.keys()].sort()).toEqual(['blue-green', 'pale green', 'rust-brown', 'white'])
  })
})

describe('how far a station has come', () => {
  const at = (actions: number, stationId = 'aq-06') => {
    const state = run(data, createLab(data, 'guided'), stationScript(data, stationId).slice(0, actions))
    return progressOf(stationView(data, state, stationId))
  }

  it('is not started until the tube is mixed or an equation entered, started from then, observed once the observation is correct, and done with the three equations', () => {
    const script = stationScript(data, 'aq-06')
    // Three looks at the tube, then the station's three tools.
    expect(script.map((action) => action.type)).toEqual(['mix', ...Array.from({ length: 6 }, () => 'useTool'), 'recordObservation', 'enterEquation', 'enterEquation', 'enterEquation'])
    expect([0, 1, 4, 7, 8, 10, 11].map((n) => at(n))).toEqual(['not-started', 'started', 'started', 'started', 'observed', 'observed', 'done'])
  })

  it('is started by an equation entered before the tube is mixed, and by an observation that is not yet correct', () => {
    const lab = createLab(data, 'guided')
    const early = run(data, lab, [stationScript(data, 'aq-01').at(-1)!])
    expect(progressOf(stationView(data, early, 'aq-01'))).toBe('started')
    const wrong = run(data, lab, [...stationScript(data, 'aq-01').slice(0, 4), { type: 'recordObservation', stationId: 'aq-01', observation: { solid: 'white', liquid: 'colourless', bubbles: 'none' } }])
    expect(progressOf(stationView(data, wrong, 'aq-01'))).toBe('started')
  })
})
