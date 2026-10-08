import { describe, expect, it } from 'vitest'
import { aqueousData as data } from '@/chem-data/aqueous/data'
import { chargeText, ionRows, wholeRows } from './ions'

// The rows of the "Ions on this bench" panel, against the lab's record. Nothing in them is written here: a name, a
// formula, a charge, a colour and a bottle are each the record's.

const species = (id: string) => data.species.find((s) => s.id === id)!
const rows = ionRows(data)
const row = (id: string) => rows.find((r) => r.id === id)!

describe('the ions of the bench', () => {
  it('are the ions that a bottle gives or an equation of a station holds, each once, in the order of the record: the positive ones first', () => {
    expect(rows.map((r) => r.id)).toEqual([
      'iron-iii-ion',
      'copper-ii-ion',
      'nickel-ii-ion',
      'cobalt-ii-ion',
      'barium-ion',
      'silver-ion',
      'sodium-ion',
      'ammonium-ion',
      'calcium-ion',
      'magnesium-ion',
      'hydrogen-ion',
      'chloride-ion',
      'hydroxide-ion',
      'carbonate-ion',
      'sulfate-ion',
      'nitrate-ion',
    ])
    const ofBottles = data.reagents.flatMap((r) => r.ions.map((ion) => ion.speciesId))
    const ofEquations = data.stations.flatMap((s) => Object.values(s.equations).flatMap((e) => (e ? [...e.reactants, ...e.products].map((term) => term.speciesId) : []))).filter((id) => species(id).charge !== 0)
    expect(new Set(rows.map((r) => r.id))).toEqual(new Set([...ofBottles, ...ofEquations]))
    // Every ion of the solubility table is among them, so a pair that is looked up there can be looked up here.
    for (const pair of data.solubility) for (const id of [pair.cationId, pair.anionId]) expect(rows.some((r) => r.id === id), id).toBe(true)
    // The one ion of the record that no bottle gives and no equation holds has no row.
    expect(species('hydrogen-carbonate-ion').charge).toBe(-1)
    expect(rows.some((r) => r.id === 'hydrogen-carbonate-ion')).toBe(false)
    const signs = rows.map((r) => Math.sign(r.charge))
    expect(signs).toEqual([...signs].sort((a, b) => b - a))
  })

  it('give each ion the name, the formula, the charge and the colour the record stores, and count its atoms', () => {
    for (const r of rows) {
      const s = species(r.id)
      expect([r.name, r.formula, r.charge, r.colour], r.id).toEqual([s.name!.value, s.formula, s.charge, s.solutionColor?.value.name ?? null])
      expect(r.atoms, r.id).toBe(Object.values(s.composition).reduce((a, b) => a + b, 0))
    }
    expect(rows.filter((r) => r.colour !== null).map((r) => [r.name, r.colour])).toEqual([['iron(III)', 'yellow-orange'], ['copper(II)', 'blue'], ['nickel(II)', 'green'], ['cobalt(II)', 'pink']])
    expect(rows.filter((r) => r.atoms > 1).map((r) => [r.name, r.atoms])).toEqual([['ammonium', 5], ['hydroxide', 2], ['carbonate', 4], ['sulfate', 5], ['nitrate', 4]])
    expect(row('hydrogen-ion')).toMatchObject({ name: 'hydrogen', formula: 'H⁺', charge: 1, atoms: 1, colour: null })
  })

  it('name under each ion every bottle that holds it, a bottle of several strengths once, and say which bottle is a solid or a metal', () => {
    for (const reagent of data.reagents) {
      const name = reagent.name.split(',')[0]!
      for (const ion of reagent.ions) expect(row(ion.speciesId).bottles, `${reagent.id} ${ion.speciesId}`).toContainEqual({ name, form: reagent.form })
    }
    for (const r of rows) {
      expect(new Set(r.bottles.map((b) => b.name)).size, r.id).toBe(r.bottles.length)
      for (const bottle of r.bottles) expect(data.reagents.some((reagent) => reagent.name.split(',')[0] === bottle.name && reagent.form === bottle.form && reagent.ions.some((ion) => ion.speciesId === r.id)), `${r.id} ${bottle.name}`).toBe(true)
    }
    const names = (id: string) => row(id).bottles.map((b) => (b.form === 'solution' ? b.name : `${b.name} (${b.form})`))
    expect(names('chloride-ion')).toEqual(['Iron(III) chloride solution', 'Nickel(II) chloride solution', 'Barium chloride solution', 'Cobalt(II) chloride solution', 'Hydrochloric acid'])
    expect(names('hydrogen-ion')).toEqual(['Hydrochloric acid'])
    expect(names('hydroxide-ion')).toEqual(['Sodium hydroxide solution'])
    expect(names('carbonate-ion')).toEqual(['Sodium carbonate solution', 'Calcium carbonate (solid)'])
    expect(names('calcium-ion')).toEqual(['Calcium carbonate (solid)'])
    expect(names('magnesium-ion')).toEqual(['Magnesium ribbon (metal)'])
    // Every ion has a bottle: none is formed from nothing.
    expect(rows.filter((r) => r.bottles.length === 0)).toEqual([])
    // A name before its comma is the bottle without its strength or its form, and no two reagents of different substances share one.
    for (const reagent of data.reagents) expect(reagent.name.split(',').length, reagent.id).toBeLessThanOrEqual(2)
    expect(new Set(data.reagents.map((r) => r.name.split(',')[0])).size).toBe(new Set(data.reagents.map((r) => r.speciesId)).size)
  })

  it('write a charge as a number and its sign', () => {
    expect([3, 2, 1, -1, -2].map(chargeText)).toEqual(['3+', '2+', '1+', '1−', '2−'])
  })
})

describe('what is written whole', () => {
  const whole = wholeRows(data)

  it('is water, the three gases and the two bottles that are a solid: the liquid first, then the gases, then the solids', () => {
    expect(whole.map((r) => [r.name, r.formula, r.state, r.states])).toEqual([
      ['water', 'H₂O', 'l', ['l']],
      ['carbon dioxide', 'CO₂', 'g', ['g']],
      ['ammonia', 'NH₃', 'g', ['g', 'aq']],
      ['hydrogen', 'H₂', 'g', ['g']],
      ['Calcium carbonate', 'CaCO₃', 's', ['s']],
      ['Magnesium ribbon', 'Mg', 's', ['s']],
    ])
  })

  it('holds every named species of the record that has no charge, and every bottle that is not a solution, and nothing a station forms as a solid', () => {
    expect(whole.filter((r) => r.state !== 's').map((r) => r.name).sort()).toEqual(data.species.filter((s) => s.name && s.charge === 0).map((s) => s.name!.value).sort())
    expect(whole.filter((r) => r.state === 's').map((r) => r.formula)).toEqual(data.reagents.filter((r) => r.form !== 'solution').map((r) => r.formula))
    for (const r of whole) {
      const s = data.species.find((one) => one.formula === r.formula)!
      expect([s.charge, s.ions, s.state, s.acceptedStates ?? [s.state]], r.name).toEqual([0, undefined, r.state, r.states])
    }
    // Which solid a pair of ions makes is the learner's to write: no formula of a solid that forms is here.
    const forms = data.stations.flatMap((s) => (s.expected.precipitate ? [species(s.expected.precipitate).formula] : []))
    expect(forms.length).toBe(5)
    for (const formula of forms) expect(whole.some((r) => r.formula === formula), formula).toBe(false)
  })
})
