import { describe, expect, it } from 'vitest'
import { aqueousData as data } from '@/chem-data/aqueous/data'
import { createLab, stationView } from '@/engine/aqueous'
import { run, stationScript } from '@/engine/aqueous/testkit'
import { seenText } from './messages'
import { blend, openingStation, progressOf, tubeLook } from './stationLook'

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

  it('agrees with the expected record and with the words under it: the same solid, the same colour of liquid, bubbles or none', () => {
    for (const station of data.stations) {
      const look = looks[station.id]!
      const words = seenText(data, station.id)
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
    expect(script.map((action) => action.type)).toEqual(['mix', 'useTool', 'useTool', 'useTool', 'recordObservation', 'enterEquation', 'enterEquation', 'enterEquation'])
    expect([0, 1, 4, 5, 7, 8].map((n) => at(n))).toEqual(['not-started', 'started', 'started', 'observed', 'observed', 'done'])
  })

  it('is started by an equation entered before the tube is mixed, and by an observation that is not yet correct', () => {
    const lab = createLab(data, 'guided')
    const early = run(data, lab, [stationScript(data, 'aq-01').at(-1)!])
    expect(progressOf(stationView(data, early, 'aq-01'))).toBe('started')
    const wrong = run(data, lab, [{ type: 'mix', stationId: 'aq-01' }, { type: 'recordObservation', stationId: 'aq-01', observation: { solid: 'white', liquid: 'colourless', bubbles: 'none' } }])
    expect(progressOf(stationView(data, wrong, 'aq-01'))).toBe('started')
  })
})

describe('the station a page opens on', () => {
  it('is the first one begun and not done; where none is, the first not done; and the first of all once every one is done', () => {
    expect(openingStation(['not-started', 'not-started', 'not-started'])).toBe(0)
    expect(openingStation(['done', 'done', 'not-started'])).toBe(2)
    expect(openingStation(['done', 'not-started', 'started', 'observed'])).toBe(2)
    expect(openingStation(['done', 'not-started', 'done', 'observed'])).toBe(3)
    expect(openingStation(['done', 'done', 'done'])).toBe(0)
  })
})
