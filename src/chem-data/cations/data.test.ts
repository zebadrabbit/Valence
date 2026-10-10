import { describe, expect, it } from 'vitest'
import authored from '../../../docs/research/cations/cations.json'
import ownHazards from '../../../docs/research/cations/hazards.json'
import aqueousHazards from '../../../docs/research/phase-4/hazards.json'
import aqueous from '../aqueous/aqueous.json'
import { cationsCitations } from '../citations'
import periodicTable from '../periodic-table.json'
import sources from '../sources.json'
import { validateCations } from '../validate'
import stored from './cations.json'
import { cationsData, cationsSchema, ION_IDS, PART_IDS, reagentsOf, STEP_IDS, substanceOf, type CationsData } from './data'

const local = import.meta.glob<string[]>('../denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

const copy = (): CationsData => JSON.parse(JSON.stringify(stored))
const errorsWith = (edit: (data: CationsData) => void) => {
  const data = copy()
  edit(data)
  return validateCations(data, sources).join('\n')
}
const reagent = (id: string) => cationsData.reagents.find((r) => r.id === id)!
const equilibrium = (id: string) => cationsData.equilibria.find((e) => e.id === id)!

/** The atoms and the charge of a formula as the record writes it: "[Ag(NH₃)₂]⁺", "Hg₂Cl₂", "CrO₄²⁻". */
function composition(formula: string): { atoms: Record<string, number>; charge: number } {
  const SUB = '₀₁₂₃₄₅₆₇₈₉'
  const SUPER = '⁰¹²³⁴⁵⁶⁷⁸⁹'
  const [, body, digits, sign] = /^(.*?)([⁰¹²³⁴⁵⁶⁷⁸⁹]*)([⁺⁻]?)$/.exec(formula)!
  const charge = sign === '' ? 0 : (sign === '⁺' ? 1 : -1) * (digits === '' ? 1 : Number([...digits!].map((c) => SUPER.indexOf(c)).join('')))
  let at = 0
  const count = () => {
    let text = ''
    while (at < body!.length && SUB.includes(body![at]!)) text += SUB.indexOf(body![at++]!)
    return text === '' ? 1 : Number(text)
  }
  const group = (close: string): Record<string, number> => {
    const atoms: Record<string, number> = {}
    const add = (element: string, n: number) => void (atoms[element] = (atoms[element] ?? 0) + n)
    while (at < body!.length && body![at] !== close) {
      const c = body![at]!
      if (c === '(' || c === '[') {
        at++
        const inner = group(c === '(' ? ')' : ']')
        at++
        const times = count()
        for (const [element, n] of Object.entries(inner)) add(element, n * times)
      } else {
        const [element] = /^[A-Z][a-z]?/.exec(body!.slice(at)) ?? []
        if (!element) throw new Error(`cannot read "${formula}" at ${at}`)
        at += element.length
        add(element, count())
      }
    }
    return atoms
  }
  return { atoms: group(''), charge }
}

/** One side of an equation as written: each term's coefficient, formula and state. */
function side(text: string) {
  return text.split(' + ').map((term) => {
    const [, coefficient, formula, state] = /^(\d*)(.+)\((aq|s|l|g)\)$/.exec(term) ?? []
    if (!formula) throw new Error(`cannot read the term "${term}"`)
    return { coefficient: coefficient === '' ? 1 : Number(coefficient), formula, state: state! }
  })
}
function totals(terms: ReturnType<typeof side>) {
  const atoms: Record<string, number> = {}
  let charge = 0
  for (const term of terms) {
    const { atoms: own, charge: ownCharge } = composition(term.formula)
    for (const [element, n] of Object.entries(own)) atoms[element] = (atoms[element] ?? 0) + n * term.coefficient
    charge += ownCharge * term.coefficient
  }
  return { atoms, charge }
}

describe('cationsData', () => {
  it('is the generated file, with nothing dropped or added by the schema', () => {
    expect(cationsData).toEqual(stored)
    expect(cationsSchema.safeParse({ ...stored, extra: 1 }).success).toBe(false)
  })

  it('passes validation against the stored sources', () => {
    expect(validateCations(stored, sources, { institutionNames })).toEqual([])
  })

  it("is the authored record with each bottle's hazards merged in, and nothing else changed", () => {
    const { reagents, ...rest } = stored
    const { reagents: authoredReagents, ...authoredRest } = authored
    expect(rest).toEqual(authoredRest)
    expect(reagents.map((r) => Object.fromEntries(Object.entries(r).filter(([key]) => key !== 'classifiedAs' && key !== 'hazards')))).toEqual(authoredReagents)
    const merged = Object.fromEntries(reagents.map((r) => [r.id, { classifiedAs: r.classifiedAs, hazards: r.hazards }]))
    // Seven from this lab's file; the hydrochloric acid carries the aqueous reactions lab's record unchanged.
    expect(merged).toEqual({ 'hcl-6m': aqueousHazards['hcl-6m'], ...ownHazards })
    const theirs = aqueous.reagents.find((r) => r.id === 'hcl-6m')!
    expect({ classifiedAs: merged['hcl-6m']!.classifiedAs, hazards: merged['hcl-6m']!.hazards }).toEqual({ classifiedAs: theirs.classifiedAs, hazards: theirs.hazards })
  })

  it('holds the bench of spec 17.1: five reagents and the three nitrate solutions the samples are made from', () => {
    expect(cationsData.reagents.map((r) => `${r.id} | ${r.name} | ${r.formula} | ${r.molarity}`)).toEqual([
      'hcl-6m | Hydrochloric acid, 6 M | HCl | 6',
      'acetic-acid-6m | Acetic acid, 6 M | CH₃COOH | 6',
      'k2cro4-0.5m | Potassium chromate solution, 0.5 M | K₂CrO₄ | 0.5',
      'nh3-6m | Ammonia solution, 6 M | NH₃ | 6',
      'hno3-6m | Nitric acid, 6 M | HNO₃ | 6',
      'agno3-0.1m | Silver nitrate solution, 0.1 M | AgNO₃ | 0.1',
      'pbno32-0.1m | Lead(II) nitrate solution, 0.1 M | Pb(NO₃)₂ | 0.1',
      'hg2no32-0.1m | Mercury(I) nitrate solution, 0.1 M | Hg₂(NO₃)₂ | 0.1',
    ])
    for (const r of cationsData.reagents) {
      expect(r.classifiedAs, r.id).toMatch(/^Hazards of /)
      expect(r.hazards.signalWord, r.id).toBe('Danger')
      expect(r.hazards.note.value.length, r.id).toBeGreaterThan(100)
      expect(r.hazards.note.value, r.id).toMatch(/ask the laboratory's supervisor\.$|a doctor/)
    }
    expect(cationsData.water).toEqual({ name: 'Distilled water', formula: 'H₂O' })
  })

  it('names the three ions, each with the solution a sample gets it from and the chloride it comes down as', () => {
    expect(cationsData.ions.map((ion) => `${ion.id} | ${ion.name} | ${ion.formula} | ${ion.reagentId} | ${ion.chlorideId}`)).toEqual([
      'silver | Silver | Ag⁺ | agno3-0.1m | silver-chloride',
      'lead | Lead | Pb²⁺ | pbno32-0.1m | lead-chloride',
      'mercury-i | Mercury(I) | Hg₂²⁺ | hg2no32-0.1m | mercury-i-chloride',
    ])
    expect(cationsData.ions.map((ion) => ion.id)).toEqual([...ION_IDS])
    expect(PART_IDS).toEqual(['known', 'unknown'])
    // The salt of each ion has the ion in its formula, and the three solutions are of one strength.
    for (const ion of cationsData.ions) {
      const metal = Object.keys(composition(ion.formula).atoms)[0]!
      expect(composition(reagent(ion.reagentId).formula).atoms[metal], ion.id).toBe(composition(ion.formula).atoms[metal])
      expect(composition(substanceOf(cationsData, ion.chlorideId).formula).atoms[metal], ion.id).toBe(composition(ion.formula).atoms[metal])
      expect(reagent(ion.reagentId).molarity).toBe(0.1)
    }
  })

  it('writes mercury(I) with two atoms of mercury wherever it writes it, and mercury(II) only in the name of what ammonia makes', () => {
    const text = JSON.stringify({ ...stored, reagents: authored.reagents })
    expect(composition('Hg₂²⁺')).toEqual({ atoms: { Hg: 2 }, charge: 2 })
    expect(composition(reagent('hg2no32-0.1m').formula).atoms).toEqual({ Hg: 2, N: 2, O: 6 })
    expect(composition(substanceOf(cationsData, 'mercury-i-chloride').formula).atoms).toEqual({ Hg: 2, Cl: 2 })
    // No formula of an ion or a salt of mercury(II) is in the record, and the words stand only where the amidochloride is named.
    expect(text).not.toMatch(/Hg²⁺|HgCl₂|Hg\(NO₃\)₂/)
    const mentions = [...text.matchAll(/[^".]*[Mm]ercury\(II\)[^".]*/g)].map((match) => match[0])
    expect(mentions).toHaveLength(3)
    for (const sentence of mentions) expect(sentence, sentence).toMatch(/mercury\(II\) amidochloride|compound of mercury\(II\), mercury\(II\) amidochloride/)
  })
})

describe('what each thing is and looks like', () => {
  it('gives every solid a colour that an observation can record, each with its source', () => {
    expect(cationsData.substances.filter((s) => s.state === 's').map((s) => `${s.name} | ${s.formula} | ${s.look!.value} | ${s.look!.sourceId}`)).toEqual([
      'Silver chloride | AgCl | white | birk-silver',
      'Lead chloride | PbCl₂ | white | birk-lead',
      'Mercury(I) chloride | Hg₂Cl₂ | white | birk-mercury',
      'Lead chromate | PbCrO₄ | yellow | smc-group-1-lab',
      'Mercury with mercury(II) amidochloride | Hg + HgNH₂Cl | grey to black | birk-mercury',
      'Lead hydroxide | Pb(OH)₂ | white | ntu-group-1-lab',
    ])
    expect(cationsData.choices).toEqual({ solid: ['none', 'white', 'yellow', 'grey to black'], liquid: ['colourless', 'yellow to orange'] })
  })

  it('gives the two dissolved things whose colour a rule uses: the silver-ammonia ion, colourless, and chromate, yellow to orange, from two sources', () => {
    expect(substanceOf(cationsData, 'silver-ammonia-ion')).toMatchObject({ formula: '[Ag(NH₃)₂]⁺', state: 'aq', look: { value: 'colourless', sourceId: 'birk-silver' } })
    expect(substanceOf(cationsData, 'chromate-ion').look).toEqual({ value: 'yellow to orange', sourceId: 'birk-confirmatory-tests', alsoSourceId: 'hope-q1-analysis' })
    expect(() => substanceOf(cationsData, 'gold')).toThrow(/no substance "gold"/)
  })

  it('stores the rules the engine follows, each in a sentence with its source (spec 17.4)', () => {
    expect(cationsData.rules.map((rule) => `${rule.id} | ${rule.sourceId} | ${rule.alsoSourceId ?? ''}`)).toEqual([
      'chlorides-form | malik-group-1-separation | smc-group-1-lab',
      'lead-chloride-in-water | birk-lead | malik-group-1-ions',
      'lead-chromate-forms | smc-group-1-lab | ntu-group-1-lab',
      'silver-chloride-in-ammonia | birk-silver | smc-group-1-lab',
      'mercury-chloride-with-ammonia | birk-mercury | malik-group-1-ions',
      'lead-chloride-with-ammonia | ntu-group-1-lab | birk-lead',
      'silver-chloride-returns | birk-silver | malik-group-1-ions',
      'litmus | malik-ph-measurement | smc-group-1-lab',
    ])
    for (const rule of cationsData.rules) expect(rule.says.length, rule.id).toBeGreaterThan(40)
    // What ammonia leaves of lead chloride is said as far as the page read goes: a white solid, which that page gives as lead hydroxide.
    expect(cationsData.rules.find((rule) => rule.id === 'lead-chloride-with-ammonia')!.says).toContain('A white solid is left, which the page read gives as lead hydroxide.')
  })
})

describe('the numbers', () => {
  it('store nine Gibbs energies of formation as the table prints them', () => {
    expect(cationsData.gibbs.map((g) => `${g.label} ${g.published}`)).toEqual(['Ag⁺(aq) 77.107', 'Pb²⁺(aq) -24.43', 'Hg₂²⁺(aq) 153.52', 'Cl⁻(aq) -131.228', 'AgCl(s) -109.789', 'PbCl₂(s) -314.10', 'Hg₂Cl₂(s) -210.745', 'NH₃(aq) -26.50', '[Ag(NH₃)₂]⁺(aq) -17.12'])
    for (const g of cationsData.gibbs) {
      expect(Number(g.published), g.id).toBe(g.value)
      expect(g.sourceId, g.id).toBe('nbs-tables-1982')
    }
  })

  it('work each constant out from them: three solubility products and the formation constant of the silver-ammonia ion', () => {
    expect(cationsData.equilibria.map((e) => `${e.id}: ${e.gibbs.value} kJ/mol, ${e.constant.shown}`)).toEqual([
      'silver-chloride: 55.668 kJ/mol, 1.77 × 10⁻¹⁰',
      'lead-chloride: 27.214 kJ/mol, 1.71 × 10⁻⁵',
      'mercury-i-chloride: 101.809 kJ/mol, 1.46 × 10⁻¹⁸',
      'silver-ammonia-ion: -41.227 kJ/mol, 1.67 × 10⁷',
    ])
    const { gasConstant } = cationsData.constants
    expect([gasConstant.value, gasConstant.unit, gasConstant.sourceId]).toEqual([8.314462618, 'J/(mol·K)', 'nist-codata-2022'])
    for (const e of cationsData.equilibria) {
      const energy = e.terms.reduce((sum, term) => sum + term.coefficient * cationsData.gibbs.find((g) => g.id === term.gibbsId)!.value, 0)
      expect(Number(energy.toFixed(3)), e.id).toBe(e.gibbs.value)
      const worked = Math.exp((-energy * 1000) / (gasConstant.value * cationsData.parameters.temperatureKelvin.value))
      expect(Number(worked.toPrecision(3)), e.id).toBe(e.constant.value)
    }
    expect(equilibrium('silver-chloride').gibbs.working).toBe('77.107 + (−131.228) − (−109.789) = 55.668 kJ/mol')
    expect(equilibrium('lead-chloride').constant.working).toBe('e^(−27 214 ÷ (8.314462618 × 298.15)) = 1.707 × 10⁻⁵, stored to three significant figures')
    // Each term's sign and count are those of the change the constant is of.
    expect(equilibrium('silver-ammonia-ion').terms).toEqual([{ gibbsId: 'silver-ammonia-ion', coefficient: 1 }, { gibbsId: 'silver-ion', coefficient: -1 }, { gibbsId: 'ammonia', coefficient: -2 }])
    expect(equilibrium('mercury-i-chloride').expression).toBe('[Hg₂²⁺][Cl⁻]²')
  })

  it("store the solubility product of lead chromate as a page prints it, since the table has no Gibbs energy for the solid", () => {
    expect(cationsData.leadChromate.solubilityProduct).toEqual({ value: 2.8e-13, shown: '2.8 × 10⁻¹³', sourceId: 'ntu-group-1-lab' })
    expect(cationsData.gibbs.some((g) => g.id.includes('chromate'))).toBe(false)
  })

  it('store the solubility of lead chloride cold and hot as its page prints it, and work out what a millilitre of water holds', () => {
    const lead = cationsData.leadChloride
    expect([lead.solubilityCold, lead.solubilityHot].map((s) => `${s.published} ${s.unit} at ${s.celsius} °C, ${s.sourceId}`)).toEqual(['10 g/L at 20 °C, birk-lead', '33.5 g/L at 100 °C, birk-lead'])
    expect(lead.atomicWeights.map((w) => `${w.id} ${w.published}`)).toEqual(['Pb 207.2', 'Cl 35.45'])
    for (const weight of lead.atomicWeights) {
      const element = periodicTable.find((e) => e.symbol === weight.id)!
      expect([weight.published, weight.sourceId], weight.id).toEqual([element.atomicMass.published, element.atomicMass.sourceId])
    }
    expect(lead.molarMass).toEqual({ value: 278.1, unit: 'g/mol', working: '207.2 + 2 × 35.45 = 278.10 g/mol, from the standard atomic weights of lead and of chlorine' })
    expect([lead.cold.value, lead.hot.value]).toEqual([35958, 120460])
    expect(Math.round((10 / 278.1) * 1e6)).toBe(35958)
    expect(Math.round((33.5 / 278.1) * 1e6)).toBe(120460)
    expect(lead.cold.working).toBe('10 g/L ÷ 278.10 g/mol = 0.035958 mol/L, which is 35 958 nmol in each millilitre')
    // The note sets a second page's figures beside them.
    expect(lead.note.value).toContain('about 1.1 g and about 3.2 g in 100 mL')
    expect(lead.note.alsoSourceId).toBe('malik-group-1-ions')
  })

  it('give every model parameter a rationale', () => {
    const p = cationsData.parameters
    expect(Object.fromEntries(Object.entries(p).map(([name, parameter]) => [name, parameter.value]))).toEqual({
      temperatureKelvin: 298.15,
      dropMicrolitres: 50,
      sampleDropsOfEach: 10,
      sampleDrops: 30,
      hydrochloricAcidDrops: 4,
      waterDrops: 15,
      aceticAcidDrops: 1,
      chromateDrops: 4,
      ammoniaDrops: 15,
      nitricAcidDrops: 8,
      nitricAcidAdditions: 4,
      completeWithinPercent: 1,
    })
    for (const [name, parameter] of Object.entries(p)) expect(parameter.rationale.length, name).toBeGreaterThan(60)
    // Three ions at 10 drops each fill the sample, so the known needs no water.
    expect(p.sampleDropsOfEach.value * ION_IDS.length).toBe(p.sampleDrops.value)
  })
})

describe('the five steps', () => {
  it('are those of spec 17.2, each in its tube with what it adds', () => {
    expect(cationsData.steps.map((s) => `${s.id} | ${s.name} | ${s.tube} | ${s.reagentIds.join(' + ')}`)).toEqual([
      'precipitate | Precipitate the group | a | hcl-6m',
      'extract-lead | Take the lead out | a | water',
      'confirm-lead | Confirm lead | b | acetic-acid-6m + k2cro4-0.5m',
      'separate | Part silver from mercury | a | nh3-6m',
      'confirm-silver | Confirm silver | c | hno3-6m',
    ])
    expect(cationsData.steps.map((s) => s.id)).toEqual([...STEP_IDS])
    expect(reagentsOf(cationsData, 'confirm-lead').map((r) => r.id)).toEqual(['acetic-acid-6m', 'k2cro4-0.5m'])
    expect(reagentsOf(cationsData, 'extract-lead')).toEqual([])
    // Every bottle but the three the samples are made from goes in at some step.
    const added = new Set(cationsData.steps.flatMap((s) => s.reagentIds))
    for (const r of cationsData.reagents) expect(added.has(r.id), r.id).toBe(cationsData.ions.every((ion) => ion.reagentId !== r.id))
  })

  const equations = cationsData.steps.flatMap((step) => step.equations.map((equation) => [step.id, equation.value] as const))

  it('give each step its net ionic equations, nine in all, each with a source', () => {
    expect(equations.map(([stepId, value]) => `${stepId}: ${value}`)).toEqual([
      'precipitate: Ag⁺(aq) + Cl⁻(aq) → AgCl(s)',
      'precipitate: Pb²⁺(aq) + 2Cl⁻(aq) → PbCl₂(s)',
      'precipitate: Hg₂²⁺(aq) + 2Cl⁻(aq) → Hg₂Cl₂(s)',
      'extract-lead: PbCl₂(s) → Pb²⁺(aq) + 2Cl⁻(aq)',
      'confirm-lead: Pb²⁺(aq) + CrO₄²⁻(aq) → PbCrO₄(s)',
      'separate: AgCl(s) + 2NH₃(aq) → [Ag(NH₃)₂]⁺(aq) + Cl⁻(aq)',
      'separate: Hg₂Cl₂(s) + 2NH₃(aq) → Hg(l) + HgNH₂Cl(s) + NH₄⁺(aq) + Cl⁻(aq)',
      'confirm-silver: [Ag(NH₃)₂]⁺(aq) + Cl⁻(aq) + 2H⁺(aq) → AgCl(s) + 2NH₄⁺(aq)',
    ])
    for (const step of cationsData.steps) for (const equation of step.equations) expect(equation.sourceId.length, step.id).toBeGreaterThan(0)
  })

  it.each(equations)('%s: %s balances in atoms and in charge, and has nothing unchanged on both sides', (_stepId, value) => {
    const [left, right] = value.split(' → ').map(side) as [ReturnType<typeof side>, ReturnType<typeof side>]
    expect(totals(left)).toEqual(totals(right))
    for (const term of left) expect(right.some((other) => other.formula === term.formula && other.state === term.state), term.formula).toBe(false)
  })

  it('reads a formula as it is written, groups and charges and all', () => {
    expect(composition('[Ag(NH₃)₂]⁺')).toEqual({ atoms: { Ag: 1, N: 2, H: 6 }, charge: 1 })
    expect(composition('CrO₄²⁻')).toEqual({ atoms: { Cr: 1, O: 4 }, charge: -2 })
    expect(composition('Pb(NO₃)₂')).toEqual({ atoms: { Pb: 1, N: 2, O: 6 }, charge: 0 })
    expect(totals(side('2NH₄⁺(aq) + Cl⁻(aq)'))).toEqual({ atoms: { N: 2, H: 8, Cl: 1 }, charge: 1 })
  })

  it('give each step short notes, which say what each thing was and what a real bench does that the lab does not', () => {
    const said = (id: string) => cationsData.steps.find((s) => s.id === id)!.notes.map((n) => n.value).join(' ')
    for (const step of cationsData.steps) {
      expect(step.notes.length, step.id).toBeGreaterThanOrEqual(2)
      expect(step.notes.length, step.id).toBeLessThanOrEqual(3)
      for (const note of step.notes) expect(note.value.split(/\s+/).length, step.id).toBeLessThanOrEqual(65)
    }
    expect(said('precipitate')).toContain('That is why they are called Group I.')
    expect(said('precipitate')).toContain('This lab adds a fixed amount and takes all three to come down whole.')
    expect(said('extract-lead')).toContain('If the water is poured off cold, part of the lead chloride is still with the solid, and it is still there at step 4.')
    expect(said('confirm-lead')).toContain('the colour of the liquid proves nothing: only a solid does')
    expect(said('confirm-lead')).toContain('This lab takes the second tube to stay hot.')
    expect(said('separate')).toContain('Together they look grey to black, and that confirms mercury(I).')
    expect(said('separate')).toContain('It stays as a white solid, which the page read gives as lead hydroxide.')
    expect(said('confirm-silver')).toContain('a clear liquid means nothing until litmus shows that the liquid is acid')
  })

  it('give no method of disposal', () => {
    for (const step of cationsData.steps) for (const note of step.notes) expect(note.value, step.id).not.toMatch(/sink|drain|neutrali[sz]e it|waste (container|bottle|jar)/i)
  })
})

describe('the flow chart', () => {
  it('has seven places, with what belongs in each after its step', () => {
    expect(cationsData.chart.places.map((p) => `${p.stepId} ${p.layer}: ${p.holds.join(', ')}`)).toEqual([
      'precipitate solid: silver-chloride, lead-chloride, mercury-i-chloride',
      'extract-lead solid: silver-chloride, mercury-i-chloride',
      'extract-lead liquid: lead-ion',
      'confirm-lead solid: lead-chromate',
      'separate solid: mercury-and-amidochloride',
      'separate liquid: silver-ammonia-ion',
      'confirm-silver solid: silver-chloride',
    ])
    expect([cationsData.chart.sourceId, cationsData.chart.alsoSourceId]).toEqual(['ntu-group-1-lab', 'smc-group-1-lab'])
  })

  it('is filled from nine tiles: the seven things that belong somewhere, and two that belong nowhere', () => {
    const { tileIds, places } = cationsData.chart
    expect(tileIds).toHaveLength(9)
    const used = new Set(places.flatMap((p) => p.holds))
    expect(tileIds.filter((tile) => !used.has(tile))).toEqual(['silver-ion', 'mercury-i-ion'])
    // A solid place holds solids and a liquid place dissolved things, and each ion is followed to its confirming test.
    for (const place of places) for (const tile of place.holds) expect(substanceOf(cationsData, tile).state, `${place.id} ${tile}`).toBe(place.layer === 'solid' ? 's' : 'aq')
  })
})

describe('cationsCitations', () => {
  it('lists, for each step, sources that exist, with the bottles it adds from, its rules, its equations and its notes', () => {
    for (const step of cationsData.steps) {
      const listed = cationsCitations(cationsData, step.id, sources)
      expect(listed.length, step.id).toBeGreaterThan(3)
      const covers = listed.flatMap((c) => c.covers)
      for (const label of ['What happens at this step', 'Net ionic equations', 'Notes on this step', 'Where each ion goes: the flow chart']) expect(covers, `${step.id}: ${label}`).toContain(label)
      for (const r of reagentsOf(cationsData, step.id)) expect(covers, r.id).toContain(`${r.name}: hazard classification`)
      // No label names a solid or an ion: what a thing is, is said in the notes of a step that is done.
      for (const label of covers) if (!/^(Hydrochloric|Acetic|Potassium|Ammonia|Nitric|Silver nitrate|Lead\(II\) nitrate|Mercury\(I\) nitrate)/.test(label)) expect(label).not.toMatch(/chloride|chromate|silver|lead|mercury/i)
    }
    // Step 1 is worked on the sample, so it lists the three nitrate solutions whatever the sample holds.
    const first = cationsCitations(cationsData, 'precipitate', sources).flatMap((c) => c.covers)
    for (const ion of cationsData.ions) expect(first).toContain(`${reagent(ion.reagentId).name}: the solution`)
    expect(cationsCitations(cationsData, 'extract-lead', sources).some((c) => c.source.id === 'ciaaw-abridged-2024')).toBe(true)
    expect(cationsCitations(cationsData, 'precipitate', sources).some((c) => c.source.id === 'nbs-tables-1982')).toBe(true)
    expect(() => cationsCitations(cationsData, 'rinse' as never, sources)).toThrow(/no step "rinse"/)
  })
})

describe('validateCations', () => {
  it('refuses a source that does not exist, wherever it is named', () => {
    expect(errorsWith((d) => void (d.rules[0]!.sourceId = 'nowhere'))).toContain('cations.rules[0].sourceId: unknown source "nowhere"')
    expect(errorsWith((d) => void (d.steps[3].notes[1]!.moreSourceIds = ['nowhere']))).toContain('unknown source "nowhere"')
    expect(errorsWith((d) => void (d.chart.alsoSourceId = 'nowhere'))).toContain('unknown source "nowhere"')
  })

  it('refuses a published figure that is not the stored number', () => {
    expect(errorsWith((d) => void (d.gibbs[0]!.value = 77.1))).toContain('published "77.107" is not the stored value 77.1')
    expect(errorsWith((d) => void (d.leadChloride.solubilityHot.published = '33.4'))).toContain('published "33.4" is not the stored value 33.5')
  })

  it('refuses an id that names nothing, and ids used twice', () => {
    expect(errorsWith((d) => void (d.ions[0].reagentId = 'agno3'))).toContain('ion "silver": unknown reagent "agno3"')
    expect(errorsWith((d) => void (d.equilibria[0]!.terms[0]!.gibbsId = 'gold-ion'))).toContain('equilibrium "silver-chloride": unknown Gibbs energy "gold-ion"')
    expect(errorsWith((d) => void d.steps[2].reagentIds.push('naoh-1m'))).toContain('step "confirm-lead": unknown reagent "naoh-1m"')
    expect(errorsWith((d) => void (d.steps[0].ruleIds = ['chlorides']))).toContain('step "precipitate": unknown rule "chlorides"')
    expect(errorsWith((d) => void d.chart.tileIds.push('gold'))).toContain('chart: unknown substance "gold"')
    expect(errorsWith((d) => void d.chart.places[3]!.holds.push('lead-hydroxide'))).toContain('place "confirm-lead-solid": unknown tile "lead-hydroxide"')
    expect(errorsWith((d) => void (d.chart.places[1]!.stepId = 'wash'))).toContain('place "extract-lead-solid": unknown step "wash"')
    expect(errorsWith((d) => void (d.substances[1]!.id = 'silver-chloride'))).toContain('substances: duplicate id "silver-chloride"')
    expect(errorsWith((d) => void (d.rules[1]!.id = 'chlorides-form'))).toContain('rules: duplicate id "chlorides-form"')
  })

  it('refuses a look that no observation can record, and a solid with none', () => {
    expect(errorsWith((d) => void (d.substances[3]!.look!.value = 'bright yellow'))).toContain('substance "lead-chromate": its look, "bright yellow", is not a choice of the observation')
    expect(errorsWith((d) => void delete d.substances[0]!.look)).toContain('substance "silver-chloride": a solid needs a look')
    expect(errorsWith((d) => void (d.substances.find((s) => s.id === 'chromate-ion')!.look!.value = 'white'))).toContain('substance "chromate-ion": its look, "white", is not a choice of the observation')
  })

  it('refuses institution text in a note, a rule or a rationale', () => {
    expect(errorsWith((d) => void (d.steps[0].notes[0]!.value += ' See CHEM 1411.'))).toContain('looks like a course number')
    expect(errorsWith((d) => void (d.parameters.waterDrops.rationale += ' Kept in cabinet B3.'))).toContain('looks like a location')
  })

  it('refuses a shape the schema does not have, and never throws', () => {
    expect(validateCations({ ...stored, steps: stored.steps.slice(0, 4) }, sources).join()).toMatch(/^schema: steps/)
    expect(validateCations(null, sources).join()).toMatch(/^schema: /)
    expect(() => validateCations(stored, undefined as never)).not.toThrow()
  })
})
