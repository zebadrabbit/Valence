import { describe, expect, it } from 'vitest'
import { aqueousData as data } from '@/chem-data/aqueous/data'
import { ID, react, stationResult, tally, type Tube } from './react'

const species = (id: string) => data.species.find((s) => s.id === id)!
const tube = (contents: Record<string, number>): Tube => new Map(Object.entries(contents))

describe('the tally of a tube', () => {
  it('counts whole nanomoles: a solution gives each ion its share, a solid goes in as itself', () => {
    expect([...tally(data, 'aq-01').tube]).toEqual([
      ['iron-iii-ion', 1_000_000],
      ['chloride-ion', 3_000_000],
      ['sodium-ion', 2_000_000],
      ['hydroxide-ion', 2_000_000],
    ])
    // 0.10 g over 100.09 g/mol, and 3.0 mL of 1 M acid.
    expect([...tally(data, 'aq-07').tube]).toEqual([
      ['calcium-carbonate', 999_101],
      ['hydrogen-ion', 3_000_000],
      ['chloride-ion', 3_000_000],
    ])
    expect([...tally(data, 'aq-09').tube.entries()].find(([id]) => id === 'silver-ion')).toEqual(['silver-ion', 200_000])
    for (const station of data.stations) for (const nmol of tally(data, station.id).tube.values()) expect(Number.isInteger(nmol)).toBe(true)
  })

  it('takes the liquid as the solutions alone: 4 mL where two are mixed, and the acid alone where a solid goes in', () => {
    expect(data.stations.map((s) => tally(data, s.id).volumeUl)).toEqual([4000, 4000, 4000, 4000, 4000, 4000, 3000, 4000, 4000, 5000])
  })

  it('refuses a station that is not one of the ten', () => {
    expect(() => stationResult(data, 'aq-11')).toThrow('no station "aq-11"')
  })
})

describe('the rules', () => {
  it('speak of species the record holds', () => {
    for (const id of Object.values(ID)) expect(species(id)).toBeDefined()
  })

  it('have a row of the solubility table for every pair of ions a station brings together, or leaves dissolved together afterwards', () => {
    for (const station of data.stations) {
      const before = [...tally(data, station.id).tube.keys()]
      const after = stationResult(data, station.id).remaining.map((a) => a.speciesId)
      const ions = [...new Set([...before, ...after])].map(species).filter((s) => s.charge !== 0 && s.id !== ID.hydrogenIon)
      for (const cation of ions.filter((s) => s.charge > 0)) {
        for (const anion of ions.filter((s) => s.charge < 0)) {
          expect(data.solubility.filter((row) => row.cationId === cation.id && row.anionId === anion.id).length, `${station.id}: ${cation.id} + ${anion.id}`).toBe(1)
        }
      }
    }
  })

  it('give each insoluble pair a solid that holds the two ions in the ratio their charges fix, and each soluble pair none', () => {
    for (const row of data.solubility) {
      expect(row.soluble).toBe(row.precipitateId === undefined)
      if (row.precipitateId === undefined) continue
      const [cation, anion, solid] = [species(row.cationId), species(row.anionId), species(row.precipitateId)]
      expect(solid.state).toBe('s')
      const result = react(data, tube({ [cation.id]: 600, [anion.id]: 600 }), 1000)
      expect(result.rules).toEqual(['precipitation'])
      const used = (id: string) => result.consumed.find((a) => a.speciesId === id)!.nmol
      const made = result.products[0]!.nmol
      const atoms: Record<string, number> = {}
      for (const ion of [cation, anion]) for (const [element, count] of Object.entries(ion.composition)) atoms[element] = (atoms[element] ?? 0) + (count * used(ion.id)) / made
      expect(atoms, row.precipitateId).toEqual(solid.composition)
      expect((cation.charge * used(cation.id) + anion.charge * used(anion.id)) / made).toBe(0)
    }
  })

  it('form carbon dioxide from hydrogen ions with dissolved carbonate, two for one, and with hydrogen carbonate, one for one', () => {
    const carbonate = react(data, tube({ 'carbonate-ion': 100, 'hydrogen-ion': 500 }), 1000)
    expect(carbonate).toMatchObject({ rules: ['acid-carbonate'], gas: 'carbon-dioxide', limiting: ['carbonate-ion'] })
    expect(carbonate.remaining).toEqual([
      { speciesId: 'hydrogen-ion', nmol: 300 },
      { speciesId: 'carbon-dioxide', nmol: 100 },
      { speciesId: 'water', nmol: 100 },
    ])
    const bicarbonate = react(data, tube({ 'hydrogen-carbonate-ion': 100, 'hydrogen-ion': 500 }), 1000)
    expect(bicarbonate.remaining.find((a) => a.speciesId === 'hydrogen-ion')).toEqual({ speciesId: 'hydrogen-ion', nmol: 400 })
    expect(bicarbonate.gas).toBe('carbon-dioxide')
  })

  it('leave a solid carbonate over when the acid runs out first', () => {
    const result = react(data, tube({ 'calcium-carbonate': 1000, 'hydrogen-ion': 500 }), 1000)
    expect(result.limiting).toEqual(['hydrogen-ion'])
    expect(result.remaining.find((a) => a.speciesId === 'calcium-carbonate')).toEqual({ speciesId: 'calcium-carbonate', nmol: 750 })
  })

  it('apply in one ordered pass: each rule acts on what the one before it left', () => {
    // Hydroxide first precipitates the iron(III), and what is left of it then neutralises the acid.
    const result = react(data, tube({ 'iron-iii-ion': 100, 'hydroxide-ion': 500, 'hydrogen-ion': 150 }), 1000)
    expect(result.rules).toEqual(['precipitation', 'neutralisation'])
    expect(result.remaining.map((a) => `${a.speciesId} ${a.nmol}`)).toEqual(['hydroxide-ion 50', 'iron-iii-hydroxide 100', 'water 150'])
  })

  it('do nothing with a metal that is not in the activity series, and nothing where no rule applies', () => {
    expect(react(data, tube({ 'sodium-ion': 100, 'chloride-ion': 100 }), 1000)).toMatchObject({ rules: [], products: [], temperatureRiseC: 0 })
    expect(data.activitySeries).toEqual([{ metalId: 'magnesium', ionId: 'magnesium-ion', aboveHydrogen: true, sourceId: 'flowers-chem2e-17.3' }])
  })
})

describe('the temperature rise', () => {
  it('uses the heat of each of the two rules that release it, from the stored formation enthalpies', () => {
    // 1 mol in 1 kg of water, so the rise is kJ/mol over the heat capacity in J/(g °C).
    const neutral = react(data, tube({ 'hydrogen-ion': 1e9, 'hydroxide-ion': 1e9 }), 1e6)
    expect(neutral.temperatureRiseC * 4.18).toBeCloseTo(285.83 - 229.994, 9)
    const metal = react(data, tube({ magnesium: 1e9, 'hydrogen-ion': 3e9 }), 1e6)
    expect(metal.temperatureRiseC * 4.18).toBeCloseTo(466.85, 9)
    expect(metal.products).toEqual([
      { speciesId: 'magnesium-ion', nmol: 1e9 },
      { speciesId: 'hydrogen', nmol: 1e9 },
    ])
  })

  it('is recorded as warm from 5 °C and as hot from 25 °C', () => {
    expect([data.parameters.warmFromC.value, data.parameters.hotFromC.value]).toEqual([5, 25])
    const perDegree = (4.18 * 1000) / (285.83 - 229.994) // µmol of water formed per litre for a rise of 1 °C, in thousands
    const rise = (degrees: number) => react(data, tube({ 'hydrogen-ion': Math.round(degrees * perDegree * 1e6), 'hydroxide-ion': 1e12 }), 1e6)
    expect([4.9, 5.1, 24.9, 25.1].map((degrees) => rise(degrees).temperature)).toEqual(['none', 'warm', 'warm', 'hot'])
    expect(rise(5.1).temperatureRiseC).toBeCloseTo(5.1, 3)
  })

  it('treats every liquid as water: 4.18 J/(g °C) and 1.00 g/mL', () => {
    expect([data.constants.solutionHeatCapacity.value, data.constants.solutionDensity.value]).toEqual([4.18, 1])
  })
})
