import { describe, expect, it } from 'vitest'
import authored from '../../../docs/research/phase-4/aqueous.json'
import hazardsFile from '../../../docs/research/phase-4/hazards.json'
import { stationCitations } from '../citations'
import sources from '../sources.json'
import { validateAqueous } from '../validate'
import stored from './aqueous.json'
import { aqueousData, aqueousSchema } from './data'

const local = import.meta.glob<string[]>('../denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()
const species = (id: string) => aqueousData.species.find((s) => s.id === id)!

/** The atoms and the charge a formula writes, as the record stores formulas: Fe(OH)₃, SO₄²⁻, NH₄⁺. One level of brackets. */
function read(formula: string): { composition: Record<string, number>; charge: number } {
  const digits = (text: string, from: string) => (text === '' ? 1 : Number([...text].map((c) => from.indexOf(c)).join('')))
  const [, body, amount, sign] = /^(.*?)([⁰¹²³⁴⁵⁶⁷⁸⁹]*)([⁺⁻]?)$/.exec(formula)!
  const composition: Record<string, number> = {}
  const count = (text: string, times: number) => {
    for (const [, element, n] of text.matchAll(/([A-Z][a-z]?)([₀-₉]*)/g)) composition[element!] = (composition[element!] ?? 0) + times * digits(n!, '₀₁₂₃₄₅₆₇₈₉')
  }
  count(body!.replace(/\(([^()]*)\)([₀-₉]*)/g, (_, inner: string, n: string) => (count(inner, digits(n, '₀₁₂₃₄₅₆₇₈₉')), '')), 1)
  return { composition, charge: sign === '' ? 0 : (sign === '⁺' ? 1 : -1) * digits(amount!, '⁰¹²³⁴⁵⁶⁷⁸⁹') }
}

describe('aqueousData', () => {
  it('is the generated file, with nothing dropped or added by the schema', () => {
    expect(aqueousData).toEqual(stored)
    expect(aqueousSchema.safeParse({ ...stored, extra: 1 }).success).toBe(false)
  })

  it('passes validation against the stored sources', () => {
    expect(validateAqueous(stored, sources, { institutionNames })).toEqual([])
  })

  it('is the authored record with each reagent\'s hazards merged in from hazards.json, and nothing else changed', () => {
    const { reagents, ...rest } = stored
    const { reagents: authoredReagents, ...authoredRest } = authored
    expect(rest).toEqual(authoredRest)
    expect(reagents.map((reagent) => Object.fromEntries(Object.entries(reagent).filter(([key]) => key !== 'classifiedAs' && key !== 'hazards')))).toEqual(authoredReagents)
    const merged = Object.fromEntries(reagents.map((r) => [r.id, { classifiedAs: r.classifiedAs, hazards: r.hazards }]))
    expect(merged).toEqual(hazardsFile)
  })

  it('holds the fifteen reagents of spec 8.2, each with a heading that says what its statements classify', () => {
    expect(aqueousData.reagents.map((r) => `${r.id} ${r.form} ${r.molarity ?? r.molarMass?.published}`)).toEqual([
      'fecl3-0.5m solution 0.5',
      'naoh-1m solution 1',
      'naoh-6m solution 6',
      'na2co3-0.5m solution 0.5',
      'cuso4-0.5m solution 0.5',
      'nicl2-0.5m solution 0.5',
      'bacl2-0.5m solution 0.5',
      'cocl2-0.5m solution 0.5',
      'nh4no3-0.5m solution 0.5',
      'caco3 solid 100.09',
      'hcl-1m solution 1',
      'hcl-3m solution 3',
      'hcl-6m solution 6',
      'agno3-0.1m solution 0.1',
      'mg metal 24.305',
    ])
    for (const reagent of aqueousData.reagents) {
      expect(reagent.classifiedAs, reagent.id).toMatch(/^Hazards of .+, from a supplier's safety data sheet$/)
      expect(reagent.hazards.note.value.length, reagent.id).toBeGreaterThan(100)
    }
  })

  it('writes each hazard note in the three short paragraphs of spec 5.2, of 160 words at most: the bench and the sheet for it, what the lab goes by, and disposal left to the laboratory', () => {
    const words = (text: string) => text.split(/\s+/).length
    for (const reagent of aqueousData.reagents) {
      const { value } = reagent.hazards.note
      const paragraphs = value.split('\n\n')
      expect(paragraphs, reagent.id).toHaveLength(3)
      expect(words(value), reagent.id).toBeLessThanOrEqual(160)
      expect(paragraphs[1], reagent.id).toMatch(/^(Stricter, and what this lab goes by|What this lab goes by): /)
      expect(paragraphs[2], reagent.id).toBe("How any of it is disposed of is decided by the laboratory's own rules and by local regulations; ask the laboratory's supervisor.")
      expect(value, reagent.id).not.toMatch(/\bdrains?\b|\bsinks?\b|\btrash\b|neutrali[sz]e|\bpour/i)
      expect(value, reagent.id).not.toMatch(/Flinn|Ward|Fisher|Avantor/)
    }
  })

  it('says in no hazard note what a station shows: no gas, no heat, no solid that forms, and no colour of what is mixed', () => {
    // Five of the bottles are the hazards of other labs' bottles too (the 1 M and 6 M acid and base and the iron(III) chloride), so this holds there as well.
    // The one colour a note names is of the calcium carbonate as it stands in its bottle, which the bottle's tile shows too.
    for (const reagent of aqueousData.reagents) {
      const said = `${reagent.classifiedAs} ${reagent.hazards.note.value}`.replace('a white powder', 'a powder')
      expect(said, reagent.id).not.toMatch(/hydrogen\b(?! chloride)|carbon dioxide|ammonia|\bgas\b|bubbl|fizz|precipitat|cloud|\bwarm|\bhot\b(?! surfaces)|\bheat(?!, and hot surfaces| and hot surfaces)|temperature|exotherm|pink|blue|green|brown|orange|yellow|white|colour/i)
    }
  })

  it('uses every reagent at a station, and every species somewhere', () => {
    const used = new Set(aqueousData.stations.flatMap((s) => s.reagentIds))
    expect(aqueousData.reagents.filter((r) => !used.has(r.id))).toEqual([])
    const named = new Set([
      ...aqueousData.reagents.flatMap((r) => [...r.ions.map((ion) => ion.speciesId), r.speciesId]),
      ...aqueousData.stations.flatMap((s) => s.paletteSpecies),
      'hydrogen-carbonate-ion', // the second ion of the acid and carbonate rule (spec 8.1), which no station of v1 holds
    ])
    expect(aqueousData.species.filter((s) => !named.has(s.id)).map((s) => s.id)).toEqual([])
  })

  it('names every ion that a bottle gives or an equation of a station holds, and the liquid and the three gases that are written whole, each name with a source of its own', () => {
    const inEquations = aqueousData.stations.flatMap((s) => Object.values(s.equations).flatMap((e) => (e ? [...e.reactants, ...e.products].map((term) => term.speciesId) : [])))
    const met = new Set([...aqueousData.reagents.flatMap((r) => r.ions.map((ion) => ion.speciesId)), ...inEquations])
    // An ion is named as it is said before the word "ion": the iron(III) ion, the chloride ion.
    expect(Object.fromEntries(aqueousData.species.filter((s) => s.name).map((s) => [s.id, s.name!.value]))).toEqual({
      'iron-iii-ion': 'iron(III)',
      'copper-ii-ion': 'copper(II)',
      'nickel-ii-ion': 'nickel(II)',
      'cobalt-ii-ion': 'cobalt(II)',
      'barium-ion': 'barium',
      'silver-ion': 'silver',
      'sodium-ion': 'sodium',
      'ammonium-ion': 'ammonium',
      'calcium-ion': 'calcium',
      'magnesium-ion': 'magnesium',
      'hydrogen-ion': 'hydrogen',
      'chloride-ion': 'chloride',
      'hydroxide-ion': 'hydroxide',
      'carbonate-ion': 'carbonate',
      'sulfate-ion': 'sulfate',
      'nitrate-ion': 'nitrate',
      'carbon-dioxide': 'carbon dioxide',
      ammonia: 'ammonia',
      hydrogen: 'hydrogen',
      water: 'water',
    })
    // No compound and no solid is named here (a reagent has its own name), and neither is the one ion that no bottle gives and no equation holds.
    for (const s of aqueousData.species) expect(s.name !== undefined, s.id).toBe(met.has(s.id) && (s.charge !== 0 || s.state === 'l' || s.state === 'g'))
    expect(species('hydrogen-carbonate-ion').name).toBeUndefined()
    // A metal that the record holds in two charges is named with its charge, and so are the others the bottles name so.
    const numbered = aqueousData.species.filter((one) => one.name?.value.endsWith(')'))
    expect(numbered.map((s) => s.id)).toEqual(['iron-iii-ion', 'copper-ii-ion', 'nickel-ii-ion', 'cobalt-ii-ion'])
    for (const s of numbered) expect(s.name!.value.endsWith(`(${'I'.repeat(s.charge)})`), s.id).toBe(true)
    for (const s of aqueousData.species.filter((one) => one.name)) expect(sources.some((source) => source.id === s.name!.sourceId), s.id).toBe(true)
  })

  it('writes each formula with the atoms and the charge stored beside it', () => {
    for (const s of aqueousData.species) expect(read(s.formula), s.id).toEqual({ composition: s.composition, charge: s.charge })
    for (const r of aqueousData.reagents) expect(read(r.formula).composition, r.id).toEqual(species(r.speciesId!).composition)
  })

  it('splits each dissolved compound into ions that hold its atoms and no net charge, and gives a reagent the ions of its species', () => {
    for (const s of aqueousData.species.filter((one) => one.ions)) {
      const atoms: Record<string, number> = {}
      let charge = 0
      for (const { speciesId, ratio } of s.ions!) {
        charge += ratio * species(speciesId).charge
        for (const [element, n] of Object.entries(species(speciesId).composition)) atoms[element] = (atoms[element] ?? 0) + ratio * n
      }
      expect({ atoms, charge }, s.id).toEqual({ atoms: s.composition, charge: 0 })
      expect(s.state).toBe('aq')
    }
    for (const r of aqueousData.reagents) {
      if (r.form === 'solution') expect(r.ions, r.id).toEqual(species(r.speciesId!).ions)
      else expect(species(r.speciesId!).state, r.id).toBe('s')
    }
  })

  it('has an observation row for every solid and gas a station expects, and for no other species', () => {
    const expected = new Set(aqueousData.stations.flatMap((s) => [s.expected.precipitate, s.expected.gas]).filter((id) => id !== null))
    expect(aqueousData.observations.map((o) => o.productId).sort()).toEqual([...expected].sort())
  })

  it('names only ions in the solubility table, a positive one first, and only a metal and its ion in the activity series', () => {
    for (const row of aqueousData.solubility) {
      expect(species(row.cationId).charge, row.cationId).toBeGreaterThan(0)
      expect(species(row.anionId).charge, row.anionId).toBeLessThan(0)
    }
    expect(new Set(aqueousData.solubility.map((r) => `${r.cationId}+${r.anionId}`)).size).toBe(aqueousData.solubility.length)
    for (const row of aqueousData.activitySeries) expect([species(row.metalId).charge, species(row.metalId).state, species(row.ionId).charge > 0]).toEqual([0, 's', true])
  })

  it('gives each station two or three hints, none of which names a product, and the notes of spec 8.2 at stations 2, 3, 5, 6 and 8', () => {
    for (const station of aqueousData.stations) {
      expect(station.hints.length, station.id).toBeGreaterThanOrEqual(2)
      const products = Object.values(station.equations).flatMap((e) => e?.products ?? []).map((t) => species(t.speciesId).formula)
      for (const hint of station.hints) for (const formula of products) expect(hint, station.id).not.toContain(formula)
    }
    expect(aqueousData.stations.filter((s) => s.notes.length > 0).map((s) => s.id)).toEqual(['aq-01', 'aq-02', 'aq-03', 'aq-05', 'aq-06', 'aq-08'])
    const notes = (id: string) => aqueousData.stations.find((s) => s.id === id)!.notes.map((n) => n.value).join(' ')
    expect(notes('aq-02')).toMatch(/Cu²⁺ \+ CO₃²⁻ → CuCO₃.*basic carbonate.*Cu₂\(OH\)₂CO₃/)
    expect(notes('aq-03')).toMatch(/Ni²⁺ \+ CO₃²⁻ → NiCO₃.*basic carbonate/)
    expect(notes('aq-05')).toMatch(/Nothing reacts here.*"No reaction"/)
    expect(notes('aq-06')).toMatch(/proves nothing.*held above the liquid.*very soluble/)
    expect(notes('aq-08')).toMatch(/Heat is the only sign.*idealised/)
  })
})

describe('stationCitations', () => {
  it('lists every source a station rests on, each once, for every station', () => {
    for (const station of aqueousData.stations) {
      const listed = stationCitations(aqueousData, station.id, sources)
      expect(new Set(listed.map((c) => c.source.id)).size, station.id).toBe(listed.length)
      for (const reagentId of station.reagentIds) {
        const { hazards } = aqueousData.reagents.find((r) => r.id === reagentId)!
        for (const id of [hazards.sourceId, hazards.note.sourceId, ...(hazards.note.alsoSourceId === undefined ? [] : [hazards.note.alsoSourceId])]) expect(listed.map((c) => c.source.id), station.id).toContain(id)
      }
      for (const note of station.notes) expect(listed.find((c) => c.source.id === note.sourceId)!.covers).toContain('Notes on this station')
    }
  })

  it('cites the enthalpies and the heat capacity only where a temperature rise is worked out', () => {
    const covers = (id: string) => stationCitations(aqueousData, id, sources).flatMap((c) => c.covers)
    expect(covers('aq-08')).toContain('Enthalpies of formation, for the temperature rise')
    expect(covers('aq-10')).toContain('Place of the metal in the activity series')
    expect(covers('aq-01')).not.toContain('Enthalpies of formation, for the temperature rise')
    expect(stationCitations(aqueousData, 'aq-08', sources).find((c) => c.source.id === 'nbs-tables-1982')!.source.citation).toContain('NBS Tables of Chemical Thermodynamic Properties')
  })

  it('refuses a station that does not exist', () => {
    expect(() => stationCitations(aqueousData, 'aq-11', sources)).toThrow('no station "aq-11"')
  })
})
