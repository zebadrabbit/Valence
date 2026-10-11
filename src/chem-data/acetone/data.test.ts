import { describe, expect, it } from 'vitest'
import authored from '../../../docs/research/acetone/acetone.json'
import ownHazards from '../../../docs/research/acetone/hazards.json'
import aqueousHazards from '../../../docs/research/phase-4/hazards.json'
import { acetoneCitations } from '../citations'
import sources from '../sources.json'
import { validateAcetone } from '../validate'
import stored from './acetone.json'
import { acetoneData, acetoneSchema, MIXTURE_IDS, mixtureOfRun, PART_IDS, partsOfMixture, REACTANT_IDS, reagentOf, RUN_IDS, type AcetoneData } from './data'

const local = import.meta.glob<string[]>('../denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

const copy = (): AcetoneData => JSON.parse(JSON.stringify(stored))
const errorsWith = (edit: (data: AcetoneData) => void) => {
  const data = copy()
  edit(data)
  return validateAcetone(data, sources).join('\n')
}
const { rateLaw, parameters, reaction, constants } = acetoneData
const volumes = (mixture: AcetoneData['mixtures'][number]) => partsOfMixture(mixture).map((part) => `${part.millilitres} ${part.reagentId}`).join(', ')
const notes = (part: number) => acetoneData.parts[part]!.notes.map((n) => n.value)

describe('acetoneData', () => {
  it('is the generated file, with nothing dropped or added by the schema', () => {
    expect(acetoneData).toEqual(stored)
    expect(acetoneSchema.safeParse({ ...stored, extra: 1 }).success).toBe(false)
    expect(acetoneSchema.safeParse({ ...stored, baths: [] }).success).toBe(false)
  })

  it('passes validation against the stored sources', () => {
    expect(validateAcetone(stored, sources, { institutionNames })).toEqual([])
  })

  it("is the authored record with each bottle's hazards merged in, and nothing else changed", () => {
    const { reagents, ...rest } = stored
    const { reagents: authoredReagents, ...authoredRest } = authored
    expect(rest).toEqual(authoredRest)
    expect(reagents.map((r) => Object.fromEntries(Object.entries(r).filter(([key]) => key !== 'classifiedAs' && key !== 'hazards')))).toEqual(authoredReagents)
    // The acetone's and the iodine's records are this lab's own; the acid's is the aqueous reactions lab's, unchanged (spec 20.5 and 5.2).
    const merged = Object.fromEntries(reagents.map((r) => [r.id, { classifiedAs: r.classifiedAs, hazards: r.hazards }]))
    expect(merged).toEqual({ ...ownHazards, 'hcl-1m': aqueousHazards['hcl-1m'] })
    expect(Object.keys(ownHazards)).toEqual(['acetone-4m', 'iodine-0.005m'])
  })

  it('holds the three bottles of spec 20.1, at the strengths the bench gives', () => {
    expect(acetoneData.reagents.map((r) => `${r.id} | ${r.name} | ${r.formula} ${r.shown} M`)).toEqual([
      'acetone-4m | Acetone solution, 4.0 M | CH₃COCH₃ 4.0 M',
      'hcl-1m | Hydrochloric acid, 1.0 M | HCl 1.0 M',
      'iodine-0.005m | Iodine solution, 0.0050 M | I₂ 0.0050 M',
    ])
    for (const r of acetoneData.reagents) {
      expect(Number(r.shown), r.id).toBe(r.molarity)
      expect(r.classifiedAs, r.id).toMatch(/^Hazards of /)
      expect(r.hazards.note.value.length, r.id).toBeGreaterThan(100)
    }
    expect(acetoneData.water).toEqual({ name: 'Distilled water', formula: 'H₂O' })
    expect(() => reagentOf(acetoneData, 'nothing')).toThrow(/no reagent/)
  })

  it('gives acetone the gravest tile: Danger, a liquid and a vapour that burn', () => {
    const acetone = reagentOf(acetoneData, 'acetone-4m')
    expect([acetone.hazards.signalWord, acetone.hazards.statements.map((s) => s.split(':')[0])]).toEqual(['Danger', ['H225', 'H319', 'H336']])
  })

  it('names the two parts, the four mixtures and the four runs, and has no baths', () => {
    expect(acetoneData.parts.map((p) => `${p.id}: ${p.name}`)).toEqual(['runs: Four mixtures at room temperature', 'rate-law: The rate law'])
    expect(acetoneData.parts.map((p) => p.id)).toEqual([...PART_IDS])
    expect(acetoneData.mixtures.map((m) => m.id)).toEqual([...MIXTURE_IDS])
    expect(RUN_IDS).toEqual(['mixture-1', 'mixture-2', 'mixture-3', 'mixture-4'])
    expect(mixtureOfRun(acetoneData, 'mixture-4').name).toBe('Mixture 4')
    expect('baths' in acetoneData).toBe(false)
  })
})

describe('the reaction (spec 20.5)', () => {
  const atoms = (species: AcetoneData['reaction']['reactants']) => {
    const count: Record<string, number> = {}
    for (const s of species) for (const [element, n] of Object.entries(s.composition)) count[element] = (count[element] ?? 0) + s.coefficient * n
    return count
  }
  const charge = (species: AcetoneData['reaction']['reactants']) => species.reduce((sum, s) => sum + s.coefficient * s.charge, 0)

  it('is acetone and iodine giving iodoacetone, a hydrogen ion and an iodide ion', () => {
    expect(reaction.equation).toBe('CH₃COCH₃(aq) + I₂(aq) → CH₃COCH₂I(aq) + H⁺(aq) + I⁻(aq)')
    expect(reaction.product).toEqual({ name: 'iodoacetone', formula: 'CH₃COCH₂I' })
    expect(reaction.reactants.map((s) => `${s.coefficient} ${s.formula}`)).toEqual(['1 CH₃COCH₃', '1 I₂'])
    expect(reaction.products.map((s) => `${s.coefficient} ${s.formula}`)).toEqual(['1 CH₃COCH₂I', '1 H⁺', '1 I⁻'])
  })

  it('balances, atom for atom and charge for charge', () => {
    expect(atoms(reaction.reactants)).toEqual(atoms(reaction.products))
    expect(atoms(reaction.reactants)).toEqual({ C: 3, H: 6, O: 1, I: 2 })
    expect([charge(reaction.reactants), charge(reaction.products)]).toEqual([0, 0])
    // One hydrogen atom of the acetone gives way to one iodine atom.
    expect(atoms([reaction.products[0]!])).toEqual({ C: 3, H: 5, O: 1, I: 1 })
  })

  it('uses up one molecule of iodine for each one of itself, so nothing is divided when a rate is worked', () => {
    expect(rateLaw.end.per).toBe(1)
    expect(reaction.reactants.find((s) => s.formula === 'I₂')!.coefficient).toBe(1)
  })
})

describe("the reaction's rate record (spec 20.4)", () => {
  it('has the orders usually found: one in acetone, one in hydrogen ion and nought in iodine, each cited to three pages read', () => {
    expect(rateLaw.reactants.map((r) => `${r.id} (${r.formula}, from ${r.reagentId}): order ${r.order.value}, from ${r.comparedIn}`)).toEqual([
      'acetone (CH₃COCH₃, from acetone-4m): order 1, from mixture-2',
      'hydrogen-ion (H⁺, from hcl-1m): order 1, from mixture-3',
      'iodine (I₂, from iodine-0.005m): order 0, from mixture-4',
    ])
    expect(rateLaw.reactants.map((r) => r.id)).toEqual([...REACTANT_IDS])
    for (const r of rateLaw.reactants) expect([r.order.sourceId, r.order.alsoSourceId, r.order.moreSourceIds], r.id).toEqual(['tau-kinetics-iodination', 'uv-iodine-acetone-kinetics', ['moorpark-iodination-of-acetone']])
    expect(rateLaw.expression).toBe('rate = k[CH₃COCH₃][H⁺]')
  })

  it('has a rate constant with the figure its source prints and the power of ten printed beside it, at 25 °C', () => {
    expect(rateLaw.rateConstant).toMatchObject({ value: 2.91, published: '2.91', exponent: -5, unit: 'L/(mol·s)', celsius: 25, sourceId: 'nbs-circular-510' })
    expect(Number(`${rateLaw.rateConstant.published}e${rateLaw.rateConstant.exponent}`)).toBe(0.0000291)
    for (const figure of ['0.2 mol/L', '2.83', '2.99', '3.05', '2.86', 'the studies it gathers were not read']) expect(rateLaw.rateConstant.note, figure).toContain(figure)
  })

  it('has an activation energy with the figure its source prints, in kilocalories, and the joules in a calorie from NIST', () => {
    expect(rateLaw.activationEnergy).toMatchObject({ value: 20.6, published: '20.6', unit: 'kcal/mol', sourceId: 'nbs-circular-510' })
    expect(constants.joulesPerCalorie).toEqual({ value: 4.184, published: '4.184', unit: 'J/cal', sourceId: 'nist-sp811-conversion-factors' })
    expect((rateLaw.activationEnergy.value * constants.joulesPerCalorie.value).toFixed(1)).toBe('86.2')
    expect(rateLaw.activationEnergy.note).toContain('that is 86.2 kJ/mol')
    expect(rateLaw.activationEnergy.note).toContain('No part of this lab finds it')
    // With the calorie of the International Table the figure is the same to the tenth.
    expect((20.6 * 4.1868).toFixed(1)).toBe('86.2')
  })

  it('says what ends a run: the iodine used up, one for one, with nothing added to show it, from yellow to colourless', () => {
    expect(rateLaw.end).toMatchObject({ reagentId: 'iodine-0.005m', per: 1, before: { value: 'yellow' }, after: { value: 'colourless' } })
    expect('indicatorId' in rateLaw.end).toBe(false)
  })

  it('takes the gas constant and the kelvin of 0 °C from NIST, as the clock reaction lab does', () => {
    expect(constants.gasConstant).toEqual({ value: 8.314462618, unit: 'J/(mol·K)', sourceId: 'nist-codata-2022' })
    expect(constants.zeroCelsius).toEqual({ value: 273.15, published: '273.15', unit: 'K', sourceId: 'nist-si-temperature' })
  })
})

describe('the four mixtures (spec 20.1)', () => {
  it('are of 50 mL each: the acetone, the acid and the water in the flask, and the iodine poured in', () => {
    expect(acetoneData.mixtures.map((m) => `${m.name}: ${volumes(m)}`)).toEqual([
      'Mixture 1: 10 acetone-4m, 10 hcl-1m, 20 water, 10 iodine-0.005m',
      'Mixture 2: 20 acetone-4m, 10 hcl-1m, 10 water, 10 iodine-0.005m',
      'Mixture 3: 10 acetone-4m, 20 hcl-1m, 10 water, 10 iodine-0.005m',
      'Mixture 4: 10 acetone-4m, 10 hcl-1m, 10 water, 20 iodine-0.005m',
    ])
    for (const m of acetoneData.mixtures) {
      expect(partsOfMixture(m).reduce((sum, part) => sum + part.millilitres, 0), m.id).toBe(50)
      expect(m.flask.map((part) => part.reagentId), m.id).toEqual(['acetone-4m', 'hcl-1m', 'water'])
      expect(m.added.reagentId, m.id).toBe('iodine-0.005m')
    }
    expect(acetoneData.referenceMixtureId).toBe('mixture-1')
  })
})

describe('the notes shown when a part is done', () => {
  it('are three and four, each of a hundred words or fewer', () => {
    expect(acetoneData.parts.map((p) => p.notes.length)).toEqual([3, 4])
    for (const part of acetoneData.parts) for (const note of part.notes) expect(note.value.split(/\s+/).length, part.id).toBeLessThanOrEqual(100)
  })

  it('give none of the orders with the first part, whose notes are read before the notebook is worked', () => {
    for (const note of notes(0)) expect(note).not.toMatch(/order|twice|rate law|\[H⁺\]|does not depend|same rate/i)
    expect(notes(0)[1]).toBe('Each run ended when the last of its iodine had reacted. So the rate of a run is the iodine its mixture began with, over the time that took.')
  })

  it('say with the second part what the rate law is, why the iodine does not count, and where the rate constant is from', () => {
    expect(notes(1)[0]).toContain(`${rateLaw.expression}: first order in acetone, first order in hydrogen ion, and of order nought in iodine`)
    expect(notes(1)[1]).toMatch(/^Why the iodine does not count\./)
    expect(notes(1)[1]).toContain('called its enol')
    expect(notes(1)[1]).toContain('The slow step sets the rate, and iodine takes no part in it.')
    expect(acetoneData.parts[1].notes[1]).toMatchObject({ sourceId: 'tau-kinetics-iodination', alsoSourceId: 'uv-iodine-acetone-kinetics', moreSourceIds: ['upb-acetone-iodination', 'chemguide-orders-and-mechanisms'] })
    expect(notes(1)[2]).toContain("The model's rate constant is 2.91 × 10⁻⁵ L/(mol·s) at 25 °C")
    expect(notes(1)[2]).toContain('20.6 kcal/mol (86.2 kJ/mol)')
    expect(notes(1)[2]).toContain('a little higher in stronger acid')
    // Both figures are cited ones: no note calls either the lab's own.
    for (const note of notes(1).slice(0, 3)) expect(note).not.toMatch(/lab's own/)
  })

  it('say what each part takes as simpler than it is, with the figures the build checks', () => {
    expect(notes(0)[2]).toMatch(/^What this lab takes as simpler than it is\./)
    expect(notes(0)[2]).toContain('The drawing keeps a faint yellow until the very end')
    expect(notes(1)[3]).toMatch(/^What this lab takes as simpler than it is\./)
    expect(notes(1)[3]).toContain('0.25% or less of the acetone')
    expect(notes(1)[3]).toContain('the hydrogen ion is up by 1% or less')
    expect(notes(1)[3]).toContain('by 0.4% at most')
    expect(notes(1)[3]).toContain("These figures are the lab's own arithmetic.")
  })
})

describe('the parameters', () => {
  it('each have a value and a rationale that says what it is for', () => {
    expect(Object.keys(parameters)).toEqual(['roomRangeTenths', 'scatterPerTenThousand', 'delayLimitMs', 'watchLimitSeconds', 'orderChoices', 'unitPowers', 'rateConstantTolerancePercent', 'paleBelowMicroMolar', 'faintestBelowMicroMolar'])
    for (const [name, parameter] of Object.entries(parameters)) expect(parameter.rationale.length, name).toBeGreaterThan(40)
    expect(Object.fromEntries(Object.entries(parameters).map(([name, parameter]) => [name, parameter.value]))).toEqual({
      roomRangeTenths: [200, 240],
      scatterPerTenThousand: 100,
      delayLimitMs: 5000,
      watchLimitSeconds: 1800,
      orderChoices: [0, 1, 2],
      unitPowers: [0, -1, -2, -3, -4],
      rateConstantTolerancePercent: 5,
      paleBelowMicroMolar: 500,
      faintestBelowMicroMolar: 100,
    })
  })

  it("say of the steps between the colour's words that they are the lab's own", () => {
    expect(parameters.paleBelowMicroMolar.rationale).toContain("The step is the lab's own")
    expect(parameters.faintestBelowMicroMolar.rationale).toContain("The step is the lab's own")
    expect(parameters.faintestBelowMicroMolar.rationale).toContain('an eye loses the colour before the last of the iodine has gone')
  })
})

describe('validateAcetone', () => {
  it('refuses a record whose ids do not hold together', () => {
    expect(errorsWith((d) => void (d.rateLaw.reactants[0]!.reagentId = 'starch'))).toMatch(/reactant "acetone": "starch" is not a solution of the record/)
    expect(errorsWith((d) => void (d.rateLaw.reactants[1]!.comparedIn = 'mixture-1'))).toMatch(/reactant "hydrogen-ion": its order is found from the reference mixture and another/)
    expect(errorsWith((d) => void (d.rateLaw.end.reagentId = 'water'))).toMatch(/rateLaw.end: "water" is not the bottle of a reactant/)
    expect(errorsWith((d) => void (d.mixtures[2]!.flask[0]!.reagentId = 'kbro3-0.04m'))).toMatch(/mixture "mixture-3": unknown reagent "kbro3-0.04m"/)
    expect(errorsWith((d) => void (d.mixtures[1]!.added.reagentId = 'hcl-1m'))).toMatch(/mixture "mixture-2": what is poured in is what is used up/)
    expect(errorsWith((d) => void (d.parameters.roomRangeTenths.value = [240, 200]))).toMatch(/parameters.roomRangeTenths: a range runs from its lower end to its upper/)
    expect(errorsWith((d) => void d.reagents.push(d.reagents[0]!))).toMatch(/reagents: duplicate id "acetone-4m"/)
  })

  it('refuses an unknown source, a figure that is not the number beside it, and a record of another shape', () => {
    expect(errorsWith((d) => void (d.rateLaw.rateConstant.sourceId = 'nowhere'))).toMatch(/unknown source "nowhere"/)
    expect(errorsWith((d) => void (d.rateLaw.rateConstant.published = '2.9'))).not.toBe('')
    expect(errorsWith((d) => void (d.rateLaw.activationEnergy.published = '20.5'))).not.toBe('')
    expect(validateAcetone({}, sources)).not.toEqual([])
    expect(validateAcetone(null, sources)).not.toEqual([])
  })
})

describe('the sources behind a part (spec 5.1)', () => {
  it('lists, for each part, every source its stored values cite, each once', () => {
    for (const part of PART_IDS) {
      const listed = acetoneCitations(acetoneData, part, sources)
      expect(new Set(listed.map((c) => c.source.id)).size, part).toBe(listed.length)
      for (const note of acetoneData.parts.find((p) => p.id === part)!.notes) expect(listed.map((c) => c.source.id), part).toContain(note.sourceId)
      for (const r of acetoneData.reagents) expect(listed.map((c) => c.source.id), part).toContain(r.hazards.sourceId)
    }
    const ids = (part: (typeof PART_IDS)[number]) => acetoneCitations(acetoneData, part, sources).map((c) => c.source.id)
    // The rate record's own sources, and the constants the model works with, come with the part that has the notebook.
    for (const id of ['nbs-circular-510', 'nist-codata-2022', 'nist-si-temperature', 'nist-sp811-conversion-factors', 'uv-iodine-acetone-kinetics']) {
      expect(ids('runs'), id).not.toContain(id)
      expect(ids('rate-law'), id).toContain(id)
    }
  })

  it('gives no order, rate constant or activation energy in a label: the list is shown before a part is done', () => {
    for (const part of PART_IDS) for (const citation of acetoneCitations(acetoneData, part, sources)) for (const covers of citation.covers) expect(covers, part).not.toMatch(/first order|zero|nought|2\.91|20\.6|86\.2/i)
    expect(() => acetoneCitations(acetoneData, 'nothing' as 'runs', sources)).toThrow(/no part/)
  })
})
