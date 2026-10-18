import { describe, expect, it } from 'vitest'
import authored from '../../../docs/research/calorimetry/calorimetry.json'
import ownHazards from '../../../docs/research/calorimetry/hazards.json'
import aqueousHazards from '../../../docs/research/phase-4/hazards.json'
import aqueous from '../aqueous/aqueous.json'
import periodicTable from '../periodic-table.json'
import sources from '../sources.json'
import { validateCalorimetry } from '../validate'
import stored from './calorimetry.json'
import { calorimetryData, calorimetrySchema, candidatesOf, PART_IDS, type CalorimetryData } from './data'

const local = import.meta.glob<string[]>('../denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

const copy = (): CalorimetryData => JSON.parse(JSON.stringify(stored))
const errorsWith = (edit: (data: CalorimetryData) => void) => {
  const data = copy()
  edit(data)
  return validateCalorimetry(data, sources).join('\n')
}
const [neutralisation, dissolving, metal] = calorimetryData.parts
const reagent = (id: string) => calorimetryData.reagents.find((r) => r.id === id)!
const terms = (list: { label: string; coefficient: number; enthalpyOfFormation: { published?: string } }[]) => list.map((t) => `${t.coefficient > 0 ? '+' : '-'} ${t.label} ${t.enthalpyOfFormation.published}`)

describe('calorimetryData', () => {
  it('is the generated file, with nothing dropped or added by the schema', () => {
    expect(calorimetryData).toEqual(stored)
    expect(calorimetrySchema.safeParse({ ...stored, extra: 1 }).success).toBe(false)
  })

  it('passes validation against the stored sources', () => {
    expect(validateCalorimetry(stored, sources, { institutionNames })).toEqual([])
  })

  it("is the authored record with each reagent's hazards merged in, and nothing else changed", () => {
    const { reagents, ...rest } = stored
    const { reagents: authoredReagents, ...authoredRest } = authored
    expect(rest).toEqual(authoredRest)
    expect(reagents.map((r) => Object.fromEntries(Object.entries(r).filter(([key]) => key !== 'classifiedAs' && key !== 'hazards')))).toEqual(authoredReagents)
    const merged = Object.fromEntries(reagents.map((r) => [r.id, { classifiedAs: r.classifiedAs, hazards: r.hazards }]))
    // Solid ammonium nitrate and the four metals from this lab's file; the acid and the base carry the aqueous reactions lab's records unchanged (spec 16.4).
    expect(merged).toEqual({ 'hcl-1m': aqueousHazards['hcl-1m'], 'naoh-1m': aqueousHazards['naoh-1m'], ...ownHazards })
    for (const id of ['hcl-1m', 'naoh-1m']) {
      const theirs = aqueous.reagents.find((r) => r.id === id)!
      expect({ classifiedAs: merged[id]!.classifiedAs, hazards: merged[id]!.hazards }).toEqual({ classifiedAs: theirs.classifiedAs, hazards: theirs.hazards })
    }
  })

  it('holds the seven reagents of spec 16.1: two solutions at 1.00 M, one solid and four metals', () => {
    expect(calorimetryData.reagents.map((r) => `${r.id} | ${r.name} | ${r.formula} | ${r.form}`)).toEqual([
      'hcl-1m | Hydrochloric acid, 1.00 M | HCl | solution',
      'naoh-1m | Sodium hydroxide solution, 1.00 M | NaOH | solution',
      'nh4no3-solid | Ammonium nitrate | NH₄NO₃ | solid',
      'aluminium-piece | Aluminium | Al | metal',
      'iron-piece | Iron | Fe | metal',
      'zinc-piece | Zinc | Zn | metal',
      'tin-piece | Tin | Sn | metal',
    ])
    for (const r of calorimetryData.reagents) {
      if (r.form === 'solution') expect(r.molarity, r.id).toBe(1)
      expect(r.classifiedAs, r.id).toMatch(/^Hazards of /)
      expect(r.hazards.note.value.length, r.id).toBeGreaterThan(100)
    }
    // Each metal's tile carries no statement: its sheet lists none for a piece.
    for (const m of candidatesOf(calorimetryData)) expect([m.hazards.signalWord, m.hazards.statements], m.id).toEqual(['None', []])
  })

  it('writes every hazard note in the three short paragraphs of spec 5.2, of 160 words at most, its own and the two of the aqueous reactions lab it carries: what is stricter second, and disposal left to the laboratory last', () => {
    for (const r of calorimetryData.reagents) {
      const { value } = r.hazards.note
      const paragraphs = value.split('\n\n')
      expect(paragraphs, r.id).toHaveLength(3)
      expect(value.split(/\s+/).length, r.id).toBeLessThanOrEqual(160)
      expect(paragraphs[1], r.id).toMatch(/^(Stricter, and what this lab goes by|What this lab goes by): /)
      expect(paragraphs[2], r.id).toBe("How any of it is disposed of is decided by the laboratory's own rules and by local regulations; ask the laboratory's supervisor.")
      expect(value, r.id).not.toMatch(/Flinn|Ward|Fisher|Avantor|ESPI/)
    }
    // The four metals are shown together until a run of part 3 counts, so no note says which of them the piece is: each says the same of its piece.
    for (const m of candidatesOf(calorimetryData)) expect(m.hazards.note.value, m.id).toMatch(new RegExp(`^The ${m.name.toLowerCase()} (on this bench|here) is a solid piece, not [a-z ]+, heated in boiling water on purpose\\.`))
  })

  it('names the three parts and what goes into each cup', () => {
    expect(calorimetryData.parts.map((p) => p.id)).toEqual([...PART_IDS])
    expect(calorimetryData.parts.map((p) => `${p.name}: ${p.amounts.map((a) => ('shown' in a ? `${a.shown} ${a.unit} ${a.reagentId}` : `about ${a.about} ${a.unit} ${a.reagentId}`)).join(', ')}`)).toEqual([
      'Neutralisation: 50.0 mL hcl-1m, 50.0 mL naoh-1m',
      'Dissolving: about 4 g nh4no3-solid, 50.0 mL water',
      "A metal's specific heat: about 50 g unknown-metal, 50.0 mL water",
    ])
    for (const p of calorimetryData.parts) for (const a of p.amounts) if ('shown' in a) expect(Number(a.shown), a.reagentId).toBe(a.value)
  })
})

describe('the enthalpies', () => {
  it('give the neutralisation for solutions of the strength on the bench, from four rows of the table, and for endless dilution from three', () => {
    const { enthalpy } = neutralisation
    expect(terms(enthalpy.terms)).toEqual(['+ NaCl in 100 H₂O -407.066', '+ H₂O(l) -285.830', '- HCl in 50 H₂O -165.356', '- NaOH in 50 H₂O -469.834'])
    expect(enthalpy.value).toBe(-57.706)
    expect(enthalpy.working).toBe('(−407.066) + (−285.830) − (−165.356) − (−469.834) = −57.706 kJ for each mole of water formed')
    expect(terms(enthalpy.infiniteDilution.terms)).toEqual(['+ H₂O(l) -285.830', '- H⁺(aq) 0', '- OH⁻(aq) -229.994'])
    expect(enthalpy.infiniteDilution.value).toBe(-55.836)
    expect(enthalpy.infiniteDilution.working).toBe('(−285.830) − 0 − (−229.994) = −55.836 kJ for each mole of water formed')
    // The three rows of endless dilution are the ones the aqueous reactions lab stores, from the same table.
    const species = (id: string) => aqueous.species.find((s) => s.id === id)!.enthalpyOfFormation
    expect([species('water'), species('hydrogen-ion'), species('hydroxide-ion')]).toEqual(enthalpy.infiniteDilution.terms.map((t) => t.enthalpyOfFormation))
  })

  it('give the dissolving of ammonium nitrate to about the strength made on the bench, and to endless dilution', () => {
    const { enthalpy } = dissolving
    expect(terms(enthalpy.terms)).toEqual(['+ NH₄NO₃ in 50 H₂O -341.155', '- NH₄NO₃(s) -365.56'])
    expect(enthalpy.value).toBe(24.405)
    expect(enthalpy.working).toBe('(−341.155) − (−365.56) = +24.405 kJ for each mole of ammonium nitrate dissolved')
    expect(terms(enthalpy.infiniteDilution.terms)).toEqual(['+ NH₄NO₃(aq), fully ionised, standard state -339.87', '- NH₄NO₃(s) -365.56'])
    expect(enthalpy.infiniteDilution.value).toBe(25.69)
  })

  it('are each the sum of their terms, negative where heat is given out and positive where it is taken in', () => {
    for (const part of [neutralisation, dissolving]) {
      for (const worked of [part.enthalpy, part.enthalpy.infiniteDilution]) {
        expect(Number(worked.terms.reduce((sum, t) => sum + t.coefficient * t.enthalpyOfFormation.value, 0).toFixed(3)), part.id).toBe(worked.value)
        for (const t of worked.terms) expect(t.enthalpyOfFormation.sourceId).toBe('nbs-tables-1982')
      }
    }
    expect(neutralisation.enthalpy.value).toBeLessThan(0)
    expect(dissolving.enthalpy.value).toBeGreaterThan(0)
  })

  it('say of the rows for the two ions that they are read and not used, and why', () => {
    const note = dissolving.enthalpy.note.value
    expect(note).toContain('−132.51 and −205.0')
    expect(note).toContain('Their sum is not used: it is 2.36 kJ/mol above')
    // -132.51 + -205.0 = -337.51, against -339.87 for the dissolved salt.
    expect(Number((-132.51 - 205.0 + 339.87).toFixed(2))).toBe(2.36)
    expect(neutralisation.enthalpy.note.value).toContain('the row for 50 is taken for the acid and for the base, and the row for 100 for the sodium chloride')
  })
})

describe('the four metals', () => {
  it('store the heat capacity of a mole as the table prints it, the molar mass of the periodic table, and the specific heat worked out from the two', () => {
    expect(candidatesOf(calorimetryData).map((m) => `${m.name}: ${m.molarHeatCapacity.published} ${m.molarHeatCapacity.unit} / ${m.molarMass.published} = ${m.specificHeat.value} ${m.specificHeat.unit}`)).toEqual([
      'Aluminium: 24.35 J/(mol·K) / 26.982 = 0.902 J/(g·°C)',
      'Iron: 25.10 J/(mol·K) / 55.845 = 0.449 J/(g·°C)',
      'Zinc: 25.40 J/(mol·K) / 65.38 = 0.388 J/(g·°C)',
      'Tin: 26.99 J/(mol·K) / 118.71 = 0.227 J/(g·°C)',
    ])
    for (const m of candidatesOf(calorimetryData)) {
      expect(Number((m.molarHeatCapacity.value / m.molarMass.value).toPrecision(3)), m.id).toBe(m.specificHeat.value)
      const element = periodicTable.find((e) => e.symbol === m.formula)!
      expect([m.molarMass.published, m.molarMass.sourceId], m.id).toEqual([element.atomicMass.published, element.atomicMass.sourceId])
      expect(m.molarHeatCapacity.sourceId, m.id).toBe('nbs-tables-1982')
    }
  })

  it('show the working of each specific heat', () => {
    expect(reagent('zinc-piece')).toMatchObject({ specificHeat: { working: '25.40 J/(mol·K) ÷ 65.38 g/mol = 0.388498 J/(g·K), stored to three significant figures as 0.388 J/(g·°C). A kelvin and a degree Celsius are steps of the same size.' } })
    expect(reagent('iron-piece')).toMatchObject({ specificHeat: { working: expect.stringContaining('25.10 J/(mol·K) ÷ 55.845 g/mol = 0.449458 J/(g·K)') } })
  })

  it('are the candidates of part 3, in the order of the record, and no two are nearer than a tenth of the smaller', () => {
    expect(metal.candidateIds).toEqual(['aluminium-piece', 'iron-piece', 'zinc-piece', 'tin-piece'])
    expect(candidatesOf(calorimetryData).map((m) => m.id)).toEqual(metal.candidateIds)
    const heats = candidatesOf(calorimetryData).map((m) => m.specificHeat.value).sort((a, b) => a - b)
    // Iron and zinc are the close pair: twice the tolerance must fit between any two.
    heats.slice(1).forEach((heat, i) => expect((heat - heats[i]!) / heats[i]!, String(heat)).toBeGreaterThan((2 * calorimetryData.parameters.tolerancePercent.value) / 100))
    expect(metal.unknown).toEqual({ name: 'Unknown metal', appearance: 'a grey piece of metal' })
  })
})

describe('the other stored values', () => {
  it('give ammonium nitrate the molar mass of the kept table of compounds', () => {
    expect(reagent('nh4no3-solid')).toMatchObject({ pubchemCid: 22985, molarMass: { value: 80.044, published: '80.044', sourceId: 'pubchem-aqueous-reagents' }, appearance: { value: 'white crystals' } })
  })

  it("give water's specific heat and density to three figures, as the aqueous reactions lab has them, each said to be an idealisation for a solution", () => {
    const { water } = calorimetryData
    expect([water.specificHeat.value, water.specificHeat.unit, water.density.value, water.density.unit]).toEqual([4.18, 'J/(g·°C)', 1, 'g/mL'])
    expect([aqueous.constants.solutionHeatCapacity.value, aqueous.constants.solutionDensity.value]).toEqual([water.specificHeat.value, water.density.value])
    expect(water.specificHeat.note).toContain('4.1813')
    expect(water.density.note).toContain('0.99705')
    for (const value of [water.specificHeat, water.density]) expect(value.note).toContain('as an idealisation')
  })

  it('give every model parameter a rationale, and every range a lower end below its upper', () => {
    for (const [name, parameter] of Object.entries(calorimetryData.parameters)) {
      expect(parameter.rationale.length, name).toBeGreaterThan(60)
      if (Array.isArray(parameter.value)) expect(parameter.value[0], name).toBeLessThan(parameter.value[1]!)
    }
    const p = calorimetryData.parameters
    expect(p.lossLidOffPpm.value / p.lossLidOnPpm.value).toBe(8)
    expect(p.mixStirredPpm.value).toBeGreaterThan(p.mixStillPpm.value)
  })
})

describe("the parts' notes", () => {
  const said = (part: (typeof calorimetryData.parts)[number]) => part.notes.map((n) => n.value).join(' ')
  // A figure as a note gives it: three figures, with a true minus or a plus sign.
  const shown = (kJ: number) => `${kJ < 0 ? '−' : '+'}${Math.abs(kJ).toPrecision(3)}`

  it('are three for each part: what the number means, why a cup reads low, and what is idealised with what a careful bench does', () => {
    for (const part of calorimetryData.parts) {
      expect(part.notes.length, part.id).toBe(3)
      expect(part.notes[1]!.value, part.id).toContain('A careful run in this lab comes out a little under')
      expect(part.notes[1]!.value, part.id).toContain('that is why such a run does not count')
      expect(part.notes[2]!.value, part.id).toMatch(/^(Two|Three) things are taken as simpler than they are\./)
      expect(part.notes[2]!.value, part.id).toContain('the calorimeter constant')
      expect(part.notes[2]!.value, part.id).toMatch(/carr(ying|ies) that line back to the moment/)
    }
  })

  it('give the stored figure of each enthalpy and the figure for endless dilution, as the record has them', () => {
    for (const part of [neutralisation, dissolving]) {
      expect(part.notes[0]!.value, part.id).toContain(`${shown(part.enthalpy.value)} kJ for each mole`)
      expect(part.notes[0]!.value, part.id).toContain(`${shown(part.enthalpy.infiniteDilution.value)} kJ/mol`)
    }
    expect(said(neutralisation)).toContain('The minus sign says that the reaction gives heat out.')
    expect(said(dissolving)).toContain('The plus sign says that dissolving takes heat in.')
    expect(said(dissolving)).toContain('The mass that cooled is the water and the salt together')
  })

  it('do not say which metal the piece is, and say what is idealised of it', () => {
    for (const m of candidatesOf(calorimetryData)) expect(said(metal), m.id).not.toMatch(new RegExp(`\\b${m.name}\\b`, 'i'))
    expect(said(metal)).toContain('The piece is taken to reach the cup at once, as hot as the bath; it is taken to arrive dry')
    expect(said(metal)).toContain('the lab uses the figure for 25 °C the whole way down: an idealisation')
  })

  it('give no method of disposal', () => {
    for (const part of calorimetryData.parts) expect(said(part), part.id).not.toMatch(/pour|sink|drain|neutrali[sz]e it|waste (container|bottle|jar)/i)
  })
})

describe('validateCalorimetry', () => {
  it('refuses a source that does not exist, wherever it is named', () => {
    expect(errorsWith((d) => void (d.water.specificHeat.sourceId = 'nowhere'))).toContain('calorimetry.water.specificHeat.sourceId: unknown source "nowhere"')
    expect(errorsWith((d) => void (d.parts[0].notes[2]!.moreSourceIds = ['nowhere']))).toContain('unknown source "nowhere"')
    expect(errorsWith((d) => void (d.parts[1].enthalpy.terms[0]!.enthalpyOfFormation.sourceId = 'nowhere'))).toContain('unknown source "nowhere"')
  })

  it('refuses a published figure that is not the stored number', () => {
    expect(errorsWith((d) => void (d.parts[0].enthalpy.terms[0]!.enthalpyOfFormation.value = -407.07))).toContain('published "-407.066" is not the stored value -407.07')
  })

  it('refuses a candidate that is no metal of the record, an amount of something the record does not hold, and ids used twice', () => {
    expect(errorsWith((d) => void d.parts[2].candidateIds.push('nh4no3-solid'))).toContain('candidates: "nh4no3-solid" is not a metal of the record')
    expect(errorsWith((d) => void (d.parts[0].amounts[0]!.reagentId = 'hcl-2m'))).toContain('part "neutralisation": unknown reagent "hcl-2m"')
    expect(errorsWith((d) => void (d.reagents[4]!.id = 'aluminium-piece'))).toContain('reagents: duplicate id "aluminium-piece"')
    expect(errorsWith((d) => void (d.parts[1].enthalpy.terms[1]!.id = 'nh4no3-in-50-water'))).toContain('duplicate id "nh4no3-in-50-water"')
  })

  it('refuses a range that runs downward, and institution text in a note or a rationale', () => {
    expect(errorsWith((d) => void (d.parameters.saltRangeCg.value = [420, 380]))).toContain('parameters.saltRangeCg: a range runs from its lower end to its upper')
    expect(errorsWith((d) => void (d.parts[0].notes[0]!.value += ' See CHEM 1411.'))).toContain('looks like a course number')
    expect(errorsWith((d) => void (d.parameters.tolerancePercent.rationale += ' Kept in cabinet B3.'))).toContain('looks like a location')
  })

  it('refuses a shape the schema does not have, and never throws', () => {
    expect(validateCalorimetry({ ...stored, parts: stored.parts.slice(0, 2) }, sources).join()).toMatch(/^schema: parts/)
    expect(validateCalorimetry(null, sources).join()).toMatch(/^schema: /)
    expect(() => validateCalorimetry(stored, undefined as never)).not.toThrow()
  })
})
