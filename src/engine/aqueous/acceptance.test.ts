import { describe, expect, it } from 'vitest'
import { aqueousData as data } from '@/chem-data/aqueous/data'
import { FORMS, checkEquation } from './check'
import { describeStationResult } from './describe'
import { stationResult, type Rule } from './react'
import { correctEntry } from './testkit'

// Spec 8.4, in its order. The record is the bundled one: every number here is worked out from sourced values, and
// none was tuned to a figure of the spec.

const { stations } = data
const species = (id: string) => data.species.find((s) => s.id === id)!
const ids = (list: readonly { speciesId: string }[]) => list.map((term) => term.speciesId).sort()

describe('8.4, 1: the engine agrees with each station\'s expected record and with its net ionic equation', () => {
  it('has the ten stations of spec 8.2, in order', () => {
    expect(stations.map((s) => [s.id, ...s.reagentIds, ...s.amounts.map((a) => `${a.value} ${a.unit}`)].join(' | '))).toEqual([
      'aq-01 | fecl3-0.5m | naoh-1m | 2 mL | 2 mL',
      'aq-02 | na2co3-0.5m | cuso4-0.5m | 2 mL | 2 mL',
      'aq-03 | na2co3-0.5m | nicl2-0.5m | 2 mL | 2 mL',
      'aq-04 | bacl2-0.5m | cuso4-0.5m | 2 mL | 2 mL',
      'aq-05 | cocl2-0.5m | fecl3-0.5m | 2 mL | 2 mL',
      'aq-06 | nh4no3-0.5m | naoh-1m | 2 mL | 2 mL',
      'aq-07 | caco3 | hcl-1m | 0.1 g | 3 mL',
      'aq-08 | hcl-6m | naoh-6m | 2 mL | 2 mL',
      'aq-09 | cocl2-0.5m | agno3-0.1m | 2 mL | 2 mL',
      'aq-10 | mg | hcl-3m | 0.012 g | 5 mL',
    ])
  })

  it.each(stations)('$id: the precipitate, the gas, the temperature class and the coloured ions left are the expected ones', (station) => {
    const result = stationResult(data, station.id)
    expect(result.precipitate).toBe(station.expected.precipitate)
    expect(result.gas).toBe(station.expected.gas)
    expect(result.temperature).toBe(station.expected.temperature)
    expect([...result.colouredIons].sort()).toEqual([...station.expected.colouredIons].sort())
  })

  it('fires one rule at each station but the fifth, and the rule spec 8.2 implies', () => {
    const fired: [string, Rule[]][] = stations.map((s) => [s.id, stationResult(data, s.id).rules])
    expect(fired).toEqual([
      ['aq-01', ['precipitation']],
      ['aq-02', ['precipitation']],
      ['aq-03', ['precipitation']],
      ['aq-04', ['precipitation']],
      ['aq-05', []],
      ['aq-06', ['ammonia']],
      ['aq-07', ['acid-carbonate']],
      ['aq-08', ['neutralisation']],
      ['aq-09', ['precipitation']],
      ['aq-10', ['metal-acid']],
    ])
  })

  it.each(stations.filter((s) => s.equations.netIonic !== null))('$id: what is used up and what is made are the two sides of the curated net ionic equation, in its proportions', (station) => {
    const net = station.equations.netIonic!
    const result = stationResult(data, station.id)
    expect(ids(result.consumed)).toEqual(ids(net.reactants))
    expect(ids(result.products)).toEqual(ids(net.products))
    // One mole of the equation as written is the same amount whichever term it is worked from.
    const perEquation = [
      ...net.reactants.map((term) => result.consumed.find((a) => a.speciesId === term.speciesId)!.nmol / term.coefficient),
      ...net.products.map((term) => result.products.find((a) => a.speciesId === term.speciesId)!.nmol / term.coefficient),
    ]
    for (const amount of perEquation) expect(amount).toBeCloseTo(perEquation[0]!, 6)
    expect(perEquation[0]).toBeGreaterThan(0)
  })

  it('finds no reaction at station 5 and invents no product', () => {
    const result = stationResult(data, 'aq-05')
    expect(result).toMatchObject({ rules: [], consumed: [], products: [], limiting: [], precipitate: null, gas: null, temperatureRiseC: 0, temperature: 'none' })
    // Everything that went in is still there: 1 mmol of each metal ion and 2 + 3 mmol of chloride.
    expect(result.remaining).toEqual([
      { speciesId: 'cobalt-ii-ion', nmol: 1_000_000 },
      { speciesId: 'chloride-ion', nmol: 5_000_000 },
      { speciesId: 'iron-iii-ion', nmol: 1_000_000 },
    ])
    expect(station5Equations()).toEqual([null, null, null])
  })
  const station5Equations = () => FORMS.map((form) => stations[4]!.equations[form])
})

describe('8.4, 2: the limiting reagent', () => {
  it('is hydroxide at station 1, with iron(III) left in the liquid', () => {
    const result = stationResult(data, 'aq-01')
    expect(result.limiting).toEqual(['hydroxide-ion'])
    // 2 mmol of hydroxide takes two thirds of the 1 mmol of iron(III).
    expect(result.remaining.find((a) => a.speciesId === 'iron-iii-ion')!.nmol).toBeCloseTo(1_000_000 / 3, 3)
    expect(result.remaining.some((a) => a.speciesId === 'hydroxide-ion')).toBe(false)
  })

  it('is silver at station 9, with cobalt(II) and most of the chloride left', () => {
    const result = stationResult(data, 'aq-09')
    expect(result.limiting).toEqual(['silver-ion'])
    expect(result.remaining.find((a) => a.speciesId === 'chloride-ion')!.nmol).toBe(1_800_000)
    expect(result.colouredIons).toEqual(['cobalt-ii-ion'])
  })

  it.each([
    ['aq-07', 'calcium-carbonate'],
    ['aq-10', 'magnesium'],
  ])('is the solid at %s, which is used up completely with acid to spare', (stationId, solid) => {
    const result = stationResult(data, stationId)
    expect(result.limiting).toEqual([solid])
    expect(result.remaining.some((a) => a.speciesId === solid)).toBe(false)
    expect(result.remaining.find((a) => a.speciesId === 'hydrogen-ion')!.nmol).toBeGreaterThan(1_000_000)
  })

  it('is both reactants where the two were put in to match exactly, and neither is left', () => {
    for (const [stationId, pair] of [
      ['aq-02', ['copper-ii-ion', 'carbonate-ion']],
      ['aq-03', ['nickel-ii-ion', 'carbonate-ion']],
      ['aq-04', ['barium-ion', 'sulfate-ion']],
      ['aq-08', ['hydrogen-ion', 'hydroxide-ion']],
    ] as const) {
      const result = stationResult(data, stationId)
      expect(result.limiting).toEqual(pair)
      for (const id of pair) expect(result.remaining.some((a) => a.speciesId === id)).toBe(false)
    }
  })

  it('keeps the colour of a spectator ion: copper(II) stays blue over white barium sulfate', () => {
    expect(stationResult(data, 'aq-04').colouredIons).toEqual(['copper-ii-ion'])
    expect(species('copper-ii-ion').solutionColor!.value.name).toBe('blue')
    expect(data.observations.find((o) => o.productId === 'barium-sulfate')!.color).toBe('white')
  })
})

describe('8.4, 3: the computed temperature rise', () => {
  it('is between 35 and 45 °C at station 8: 40.07 °C from the stored enthalpies, heat capacity and density', () => {
    // 12 mmol x 55.836 kJ/mol = 670.0 J into 4.0 g at 4.18 J/(g °C).
    const rise = stationResult(data, 'aq-08').temperatureRiseC
    expect(rise).toBeGreaterThan(35)
    expect(rise).toBeLessThan(45)
    expect(rise).toBeCloseTo((0.012 * (285.83 - 229.994) * 1000) / (4.0 * 4.18), 9)
    expect(rise.toFixed(2)).toBe('40.07')
  })

  it('is between 8 and 14 °C at station 10: 11.03 °C', () => {
    // 0.012 g / 24.305 g/mol = 0.4937 mmol x 466.85 kJ/mol = 230.5 J into 5.0 g at 4.18 J/(g °C).
    const rise = stationResult(data, 'aq-10').temperatureRiseC
    expect(rise).toBeGreaterThan(8)
    expect(rise).toBeLessThan(14)
    expect(rise.toFixed(2)).toBe('11.03')
  })

  it('is nothing at the other eight, whose rules release no heat in this model', () => {
    for (const station of stations.filter((s) => s.id !== 'aq-08' && s.id !== 'aq-10')) expect(stationResult(data, station.id).temperatureRiseC).toBe(0)
  })
})

describe('8.4, 4: the curated equations', () => {
  const curated = stations.flatMap((station) => FORMS.flatMap((form) => (station.equations[form] ? [{ id: `${station.id} ${form}`, station, form, equation: station.equations[form]! }] : [])))

  it('are three at each station but the fifth, which has none', () => {
    expect(curated.length).toBe(27)
    expect(stations.filter((s) => FORMS.every((form) => s.equations[form] === null)).map((s) => s.id)).toEqual(['aq-05'])
  })

  it.each(curated)('$id balances in atoms and in charge', ({ equation }) => {
    const total = (side: typeof equation.reactants) => {
      const atoms: Record<string, number> = {}
      let charge = 0
      for (const { speciesId, coefficient } of side) {
        const one = species(speciesId)
        charge += coefficient * one.charge
        for (const [element, count] of Object.entries(one.composition)) atoms[element] = (atoms[element] ?? 0) + coefficient * count
      }
      return { atoms, charge }
    }
    expect(total(equation.reactants)).toEqual(total(equation.products))
  })

  it('have no species unchanged on both sides of a net ionic equation', () => {
    for (const { form, equation, id } of curated) {
      if (form !== 'netIonic') continue
      expect(equation.reactants.filter((term) => equation.products.some((other) => other.speciesId === term.speciesId)), id).toEqual([])
    }
  })

  it('split only dissolved strong electrolytes into ions: the complete ionic equation is the molecular one with each such formula replaced by its ions, and solids, water, gases and ammonia whole', () => {
    for (const station of stations) {
      const { molecular, completeIonic } = station.equations
      if (!molecular || !completeIonic) continue
      const split = (side: typeof molecular.reactants) => {
        const counts: Record<string, number> = {}
        for (const { speciesId, coefficient } of side) {
          for (const part of species(speciesId).ions?.map((ion) => ({ id: ion.speciesId, n: ion.ratio * coefficient })) ?? [{ id: speciesId, n: coefficient }]) {
            counts[part.id] = (counts[part.id] ?? 0) + part.n
          }
        }
        return counts
      }
      const written = (side: typeof molecular.reactants) => Object.fromEntries(side.map((term) => [term.speciesId, term.coefficient]))
      expect(written(completeIonic.reactants), station.id).toEqual(split(molecular.reactants))
      expect(written(completeIonic.products), station.id).toEqual(split(molecular.products))
    }
    // What is written whole in an ionic equation: nothing dissolved and ionic.
    const whole = new Set(stations.flatMap((s) => [s.equations.completeIonic, s.equations.netIonic]).flatMap((e) => (e ? [...e.reactants, ...e.products] : [])).map((t) => t.speciesId).filter((id) => species(id).charge === 0))
    expect([...whole].sort()).toEqual(['ammonia', 'barium-sulfate', 'calcium-carbonate', 'carbon-dioxide', 'copper-ii-carbonate', 'hydrogen', 'iron-iii-hydroxide', 'magnesium', 'nickel-ii-carbonate', 'silver-chloride', 'water'])
    for (const id of whole) expect(species(id).ions, id).toBeUndefined()
  })

  it('give the net ionic equation as the complete one less its spectators, in lowest terms', () => {
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
    for (const station of stations) {
      const { completeIonic, netIonic } = station.equations
      if (!completeIonic || !netIonic) continue
      const left = new Map(completeIonic.reactants.map((t) => [t.speciesId, t.coefficient]))
      const right = new Map(completeIonic.products.map((t) => [t.speciesId, t.coefficient]))
      for (const [id, n] of left) {
        const cancel = Math.min(n, right.get(id) ?? 0)
        left.set(id, n - cancel)
        if (right.has(id)) right.set(id, right.get(id)! - cancel)
      }
      const all = [...left.values(), ...right.values()].filter((n) => n > 0)
      const shared = all.reduce(gcd)
      const reduced = (side: Map<string, number>) => Object.fromEntries([...side].filter(([, n]) => n > 0).map(([id, n]) => [id, n / shared]))
      const written = (side: typeof netIonic.reactants) => Object.fromEntries(side.map((term) => [term.speciesId, term.coefficient]))
      expect(written(netIonic.reactants), station.id).toEqual(reduced(left))
      expect(written(netIonic.products), station.id).toEqual(reduced(right))
    }
  })

  it('offer every species of the three equations on the station\'s palette, with at least two that belong to none of them', () => {
    for (const station of stations) {
      const used = new Set(FORMS.flatMap((form) => station.equations[form] ?? []).flatMap((e) => [...e.reactants, ...e.products]).map((t) => t.speciesId))
      for (const id of used) expect(station.paletteSpecies, `${station.id}: ${id}`).toContain(id)
      expect(station.paletteSpecies.filter((id) => !used.has(id)).length, station.id).toBeGreaterThanOrEqual(2)
      expect(new Set(station.paletteSpecies).size).toBe(station.paletteSpecies.length)
    }
  })
})

describe('8.4, 5: the equation checker', () => {
  it('accepts every curated equation as entered, and "No reaction" at station 5', () => {
    for (const station of stations) for (const form of FORMS) expect(checkEquation(data, station, form, correctEntry(data, station.id, form)), `${station.id} ${form}`).toBeNull()
    expect(correctEntry(data, 'aq-05', 'netIonic')).toEqual({ noReaction: true, reactants: [], products: [] })
  })

  it('accepts doubled coefficients', () => {
    for (const station of stations) {
      for (const form of FORMS) {
        const entry = correctEntry(data, station.id, form)
        const doubled = { ...entry, reactants: entry.reactants.map((t) => ({ ...t, coefficient: 2 * t.coefficient })), products: entry.products.map((t) => ({ ...t, coefficient: 2 * t.coefficient })) }
        expect(checkEquation(data, station, form, doubled), `${station.id} ${form}`).toBeNull()
      }
    }
  })

  it('rejects a distractor species, put in for a right one or added beside them', () => {
    const station = stations[0]!
    const entry = correctEntry(data, 'aq-01', 'netIonic')
    const distractor = { speciesId: 'iron-ii-hydroxide', coefficient: 1, state: 's' as const }
    expect(station.paletteSpecies).toContain(distractor.speciesId)
    expect(checkEquation(data, station, 'netIonic', { ...entry, products: [distractor] })).toBe('species')
    expect(checkEquation(data, station, 'netIonic', { ...entry, products: [...entry.products, distractor] })).toBe('species')
  })
})

describe('8.4, 6: describeStationResult', () => {
  it('says what is seen in each tube', () => {
    expect(Object.fromEntries(stations.map((s) => [s.id, describeStationResult(data, s.id)]))).toEqual({
      'aq-01': 'A rust-brown, gelatinous solid forms. No bubbles are seen. The liquid above it is yellow-orange.',
      'aq-02': 'A blue-green solid forms. No bubbles are seen. The liquid above it is colourless.',
      'aq-03': 'A pale green solid forms. No bubbles are seen. The liquid above it is colourless.',
      'aq-04': 'A white, fine solid forms. No bubbles are seen. The liquid above it is blue.',
      'aq-05': 'No solid forms. No bubbles are seen. The liquid is orange.',
      'aq-06': 'No solid forms. No bubbles are seen. The liquid is colourless.',
      'aq-07': 'The white powder gives off bubbles of a colourless gas and dissolves completely. The liquid is colourless.',
      'aq-08': 'No solid forms. No bubbles are seen. The liquid is colourless.',
      'aq-09': 'A white solid forms. No bubbles are seen. The liquid above it is pink.',
      'aq-10': 'The silvery metal ribbon gives off bubbles of a colourless gas and dissolves completely. The liquid is colourless.',
    })
  })

  it('names no formula and no tool\'s finding: nothing of smell, litmus, heat or the splint', () => {
    for (const station of stations) expect(describeStationResult(data, station.id)).not.toMatch(/[₀-₉⁺⁻]|smell|litmus|warm|hot|pop|splint/)
  })

  it('agrees with the expected record wherever the eye is a tool of the station', () => {
    for (const station of stations.filter((s) => s.observationTools.includes('eye'))) {
      const text = describeStationResult(data, station.id)
      expect(text).toContain(`is ${station.expected.liquidColor}.`)
      if (station.expected.precipitateColor) expect(text).toContain(`${station.expected.precipitateColor}`)
      expect(text.includes('gives off bubbles')).toBe(station.expected.bubbles)
    }
  })
})
