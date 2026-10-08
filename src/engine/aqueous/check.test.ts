import { describe, expect, it } from 'vitest'
import { aqueousData as data } from '@/chem-data/aqueous/data'
import { FIELDS, FORMS, LOOKS, TOOL_USES, checkEquation, choicesFor, expectedObservation, fieldsOf, isLook, usesOf, usesShowing, wrongFields, type Entry, type Term } from './check'
import { stationOf } from './react'
import { correctEntry } from './testkit'

const station = (n: number) => data.stations[n - 1]!
const term = (speciesId: string, coefficient = 1, state: Term['state'] = data.species.find((s) => s.id === speciesId)!.state): Term => ({ speciesId, coefficient, state })
const equation = (reactants: Term[], products: Term[]): Entry => ({ noReaction: false, reactants, products })

describe('what a station asks to be observed', () => {
  it('is what the eye sees at every station, then the fields its other tools can show, and no others', () => {
    expect(data.stations.map((s) => [s.id, fieldsOf(s).join(' ')])).toEqual([
      ['aq-01', 'solid liquid bubbles'],
      ['aq-02', 'solid liquid bubbles'],
      ['aq-03', 'solid liquid bubbles'],
      ['aq-04', 'solid liquid bubbles'],
      ['aq-05', 'solid liquid bubbles'],
      ['aq-06', 'solid liquid bubbles odor litmusInLiquid litmusInVapour'],
      ['aq-07', 'solid liquid bubbles'],
      ['aq-08', 'solid liquid bubbles temperature'],
      ['aq-09', 'solid liquid bubbles'],
      ['aq-10', 'solid liquid bubbles temperature splint'],
    ])
  })

  it('has the eye at every station and the tools of spec 8.2: litmus in two positions at station 6, touch or thermometer at station 8, the splint and touch at station 10', () => {
    expect(data.stations.map((s) => s.observationTools.join(' '))).toEqual(['eye', 'eye', 'eye', 'eye', 'eye', 'eye waft litmus', 'eye', 'eye touch thermometer', 'eye', 'eye splint touch'])
    expect(usesOf(station(6))).toEqual([...LOOKS, 'waft', 'litmus-liquid', 'litmus-vapour'])
    expect(usesOf(station(8))).toEqual([...LOOKS, 'touch', 'thermometer'])
    expect(usesOf(station(10))).toEqual([...LOOKS, 'touch', 'splint'])
    expect(usesOf(station(1))).toEqual([...LOOKS])
    expect(usesShowing(station(8), 'temperature')).toEqual(['touch', 'thermometer'])
  })

  it('applies the eye by looking at a part of what is in the tube, and each part shows one thing: the bottom the solid, the liquid its colour, the surface the bubbles', () => {
    expect(LOOKS).toEqual(['look-bottom', 'look-liquid', 'look-surface'])
    expect(TOOL_USES.slice(0, 3)).toEqual(LOOKS)
    for (const s of data.stations) {
      expect([usesShowing(s, 'solid'), usesShowing(s, 'liquid'), usesShowing(s, 'bubbles')], s.id).toEqual([['look-bottom'], ['look-liquid'], ['look-surface']])
      // Every field asked is shown by some use, and a look shows nothing a tool does.
      for (const field of fieldsOf(s)) expect(usesShowing(s, field).length, `${s.id} ${field}`).toBeGreaterThan(0)
      for (const field of ['odor', 'litmusInLiquid', 'litmusInVapour', 'temperature', 'splint'] as const) expect(usesShowing(s, field).some(isLook), `${s.id} ${field}`).toBe(false)
    }
    expect([isLook('look-bottom'), isLook('waft'), isLook('sniff')]).toEqual([true, false, false])
  })

  it('offers every expected value among the choices of its field', () => {
    for (const s of data.stations) for (const [field, value] of Object.entries(expectedObservation(s))) expect(choicesFor(data, field as (typeof FIELDS)[number]), `${s.id} ${field}`).toContain(value)
    for (const field of FIELDS) expect(new Set(choicesFor(data, field)).size).toBe(choicesFor(data, field).length)
  })

  it('expects what spec 8.2 says of each station', () => {
    expect(Object.fromEntries(data.stations.map((s) => [s.id, expectedObservation(s)]))).toEqual({
      'aq-01': { solid: 'rust-brown', liquid: 'yellow-orange', bubbles: 'none' },
      'aq-02': { solid: 'blue-green', liquid: 'colourless', bubbles: 'none' },
      'aq-03': { solid: 'pale green', liquid: 'colourless', bubbles: 'none' },
      'aq-04': { solid: 'white', liquid: 'blue', bubbles: 'none' },
      'aq-05': { solid: 'none', liquid: 'orange', bubbles: 'none' },
      'aq-06': { solid: 'none', liquid: 'colourless', bubbles: 'none', odor: 'sharp and pungent', litmusInLiquid: 'turns blue', litmusInVapour: 'turns blue' },
      'aq-07': { solid: 'none', liquid: 'colourless', bubbles: 'bubbles' },
      'aq-08': { solid: 'none', liquid: 'colourless', bubbles: 'none', temperature: 'hot' },
      'aq-09': { solid: 'white', liquid: 'pink', bubbles: 'none' },
      'aq-10': { solid: 'none', liquid: 'colourless', bubbles: 'bubbles', temperature: 'warm', splint: 'pop' },
    })
  })

  it('takes each colour and odour it expects from the observation row of the product, and the liquid\'s from the ion left in it', () => {
    for (const s of data.stations) {
      const { expected } = s
      const row = (id: string | null) => data.observations.find((o) => o.productId === id)
      expect(expected.precipitateColor, s.id).toBe(row(expected.precipitate)?.color ?? null)
      expect(expected.odor, s.id).toBe(expected.gas !== null && row(expected.gas)?.odor !== 'none' ? row(expected.gas)!.odor : null)
      const colours = expected.colouredIons.map((id) => data.species.find((sp) => sp.id === id)!.solutionColor!.value.name)
      if (colours.length < 2) expect(expected.liquidColor, s.id).toBe(colours[0] ?? 'colourless')
    }
  })
})

describe('the observation check', () => {
  it('passes an observation whose every shown field is the expected one', () => {
    for (const s of data.stations) expect(wrongFields(s, expectedObservation(s))).toEqual([])
  })

  it('names each field that is not', () => {
    expect(wrongFields(station(1), { solid: 'white', liquid: 'yellow-orange', bubbles: 'bubbles' })).toEqual(['solid', 'bubbles'])
    expect(wrongFields(station(6), { solid: 'none', liquid: 'colourless', bubbles: 'none', odor: 'none', litmusInLiquid: 'turns blue', litmusInVapour: 'stays red' })).toEqual(['odor', 'litmusInVapour'])
    expect(wrongFields(station(8), {})).toEqual(['solid', 'liquid', 'bubbles', 'temperature'])
  })

  it('neither asks nor grades a field the station does not show', () => {
    expect(wrongFields(station(8), { ...expectedObservation(station(8)), splint: 'pop', odor: 'like vinegar' })).toEqual([])
  })
})

describe('the equation check', () => {
  it('wants "No reaction" at station 5 in every form, and an equation everywhere else', () => {
    for (const form of FORMS) {
      expect(checkEquation(data, station(5), form, { noReaction: true, reactants: [], products: [] })).toBeNull()
      expect(checkEquation(data, station(5), form, equation([term('cobalt-ii-chloride'), term('iron-iii-chloride')], [term('iron-iii-hydroxide')]))).toBe('no-reaction-expected')
      for (const s of data.stations.filter((other) => other.id !== 'aq-05')) expect(checkEquation(data, s, form, { noReaction: true, reactants: [], products: [] }), s.id).toBe('reaction-expected')
    }
  })

  it('takes the species of a side in any order', () => {
    const entry = correctEntry(data, 'aq-06', 'completeIonic')
    expect(checkEquation(data, station(6), 'completeIonic', { ...entry, reactants: [...entry.reactants].reverse(), products: [...entry.products].reverse() })).toBeNull()
  })

  it('rejects a species missing, added, repeated or on the wrong side', () => {
    const entry = correctEntry(data, 'aq-07', 'molecular')
    const check = (changed: Partial<Entry>) => checkEquation(data, station(7), 'molecular', { ...entry, ...changed })
    expect(check({ products: entry.products.slice(1) })).toBe('species')
    expect(check({ products: [...entry.products, term('hydrogen')] })).toBe('species')
    expect(check({ reactants: [...entry.reactants, entry.reactants[0]!] })).toBe('species')
    expect(check({ reactants: entry.products, products: entry.reactants })).toBe('species')
  })

  it('rejects a wrong state, and takes ammonia as a gas or as dissolved', () => {
    const entry = correctEntry(data, 'aq-01', 'netIonic')
    expect(checkEquation(data, station(1), 'netIonic', { ...entry, products: [term('iron-iii-hydroxide', 1, 'aq')] })).toBe('state')
    expect(checkEquation(data, station(8), 'netIonic', equation([term('hydrogen-ion'), term('hydroxide-ion')], [term('water', 1, 'aq')]))).toBe('state')
    for (const state of ['g', 'aq'] as const) {
      expect(checkEquation(data, station(6), 'netIonic', equation([term('ammonium-ion'), term('hydroxide-ion')], [term('ammonia', 1, state), term('water')]))).toBeNull()
    }
    expect(checkEquation(data, station(6), 'netIonic', equation([term('ammonium-ion'), term('hydroxide-ion')], [term('ammonia', 1, 'l'), term('water')]))).toBe('state')
    expect(data.species.filter((s) => s.acceptedStates).map((s) => [s.id, s.acceptedStates])).toEqual([['ammonia', ['g', 'aq']]])
  })

  it('rejects coefficients out of proportion, on one side or between the two', () => {
    const net = (hydroxide: number, solid: number) => checkEquation(data, station(1), 'netIonic', equation([term('iron-iii-ion'), term('hydroxide-ion', hydroxide)], [term('iron-iii-hydroxide', solid)]))
    expect(net(3, 1)).toBeNull()
    expect(net(1, 1)).toBe('coefficients')
    expect(net(3, 2)).toBe('coefficients')
    expect(checkEquation(data, station(1), 'netIonic', equation([term('iron-iii-ion', 3), term('hydroxide-ion', 9)], [term('iron-iii-hydroxide', 3)]))).toBeNull()
  })

  it('says which form was asked for: ions in a molecular equation, a dissolved compound left whole in an ionic one, a spectator left in a net ionic one', () => {
    expect(checkEquation(data, station(1), 'molecular', correctEntry(data, 'aq-01', 'netIonic'))).toBe('ions-in-molecular')
    expect(checkEquation(data, station(1), 'completeIonic', correctEntry(data, 'aq-01', 'molecular'))).toBe('not-split')
    expect(checkEquation(data, station(1), 'netIonic', correctEntry(data, 'aq-01', 'molecular'))).toBe('not-split')
    expect(checkEquation(data, station(1), 'netIonic', correctEntry(data, 'aq-01', 'completeIonic'))).toBe('spectator')
    // A complete ionic equation keeps its spectators: that is what it is.
    expect(checkEquation(data, station(1), 'completeIonic', correctEntry(data, 'aq-01', 'netIonic'))).toBe('species')
  })

  it('rejects a solid split into its ions: carbonate from the powder at station 7', () => {
    const split = equation([term('carbonate-ion'), term('hydrogen-ion', 2)], [term('water'), term('carbon-dioxide')])
    expect(stationOf(data, 'aq-07').paletteSpecies).toContain('carbonate-ion')
    expect(checkEquation(data, station(7), 'netIonic', split)).toBe('species')
  })
})
