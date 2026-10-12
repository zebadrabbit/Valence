import { describe, expect, it } from 'vitest'
import authored from '../../../docs/research/clock/clock.json'
import ownHazards from '../../../docs/research/clock/hazards.json'
import { clockCitations } from '../citations'
import sources from '../sources.json'
import { validateClock } from '../validate'
import stored from './clock.json'
import { BATH_IDS, bathOfRun, bathRunId, clockData, clockSchema, MIXTURE_IDS, mixtureOfRun, PART_IDS, REACTANT_IDS, reagentOf, RUN_IDS, type ClockData } from './data'

const local = import.meta.glob<string[]>('../denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

const copy = (): ClockData => JSON.parse(JSON.stringify(stored))
const errorsWith = (edit: (data: ClockData) => void) => {
  const data = copy()
  edit(data)
  return validateClock(data, sources).join('\n')
}
const { rateLaw, parameters } = clockData
const reaction = (id: string) => clockData.reactions.find((r) => r.id === id)!
const volumes = (mixture: ClockData['mixtures'][number]) => [...mixture.flaskA, ...mixture.flaskB].map((part) => `${part.millilitres} ${part.reagentId}`).join(', ')

describe('clockData', () => {
  it('is the generated file, with nothing dropped or added by the schema', () => {
    expect(clockData).toEqual(stored)
    expect(clockSchema.safeParse({ ...stored, extra: 1 }).success).toBe(false)
  })

  it('passes validation against the stored sources', () => {
    expect(validateClock(stored, sources, { institutionNames })).toEqual([])
  })

  it("is the authored record with each bottle's hazards merged in, and nothing else changed", () => {
    const { reagents, ...rest } = stored
    const { reagents: authoredReagents, ...authoredRest } = authored
    expect(rest).toEqual(authoredRest)
    expect(reagents.map((r) => Object.fromEntries(Object.entries(r).filter(([key]) => key !== 'classifiedAs' && key !== 'hazards')))).toEqual(authoredReagents)
    // Every bottle's record is this lab's own (spec 19.5).
    expect(Object.fromEntries(reagents.map((r) => [r.id, { classifiedAs: r.classifiedAs, hazards: r.hazards }]))).toEqual(ownHazards)
  })

  it('holds the five bottles of spec 19.1, at the strengths the bench gives', () => {
    expect(clockData.reagents.map((r) => `${r.id} | ${r.name} | ${r.form === 'solution' ? `${r.formula} ${r.shown} M` : 'no strength'}`)).toEqual([
      'ki-0.01m | Potassium iodide solution, 0.010 M | KI 0.010 M',
      'na2s2o3-0.001m | Sodium thiosulfate solution, 0.0010 M | Na₂S₂O₃ 0.0010 M',
      'kbro3-0.04m | Potassium bromate solution, 0.040 M | KBrO₃ 0.040 M',
      'hcl-0.1m | Hydrochloric acid, 0.10 M | HCl 0.10 M',
      'starch | Starch solution | no strength',
    ])
    for (const r of clockData.reagents) {
      if (r.form === 'solution') expect(Number(r.shown), r.id).toBe(r.molarity)
      expect(r.classifiedAs, r.id).toMatch(/^Hazards of /)
      expect(r.hazards.note.value.length, r.id).toBeGreaterThan(100)
    }
    expect(clockData.water).toEqual({ name: 'Distilled water', formula: 'H₂O' })
    expect(() => reagentOf(clockData, 'nothing')).toThrow(/no reagent/)
  })

  it('gives potassium bromate the gravest tile: Danger, with its three statements', () => {
    const bromate = reagentOf(clockData, 'kbro3-0.04m')
    expect([bromate.hazards.signalWord, bromate.hazards.statements.map((s) => s.split(':')[0])]).toEqual(['Danger', ['H271', 'H301', 'H350']])
  })

  it('names the three parts, the five mixtures, the three baths and the eight runs', () => {
    expect(clockData.parts.map((p) => `${p.id}: ${p.name}`)).toEqual(['runs: Five mixtures at room temperature', 'rate-law: The rate law', 'temperature: Temperature'])
    expect(clockData.parts.map((p) => p.id)).toEqual([...PART_IDS])
    expect(clockData.mixtures.map((m) => m.id)).toEqual([...MIXTURE_IDS])
    expect(clockData.baths.map((b) => `${b.id}: ${b.name}, about ${b.about} °C`)).toEqual(['ice: Ice water, about 0 °C', 'cool: Cool water, about 10 °C', 'warm: Warm water, about 40 °C'])
    expect(clockData.baths.map((b) => b.id)).toEqual([...BATH_IDS])
    expect(RUN_IDS).toEqual(['mixture-1', 'mixture-2', 'mixture-3', 'mixture-4', 'mixture-5', 'bath-ice', 'bath-cool', 'bath-warm'])
    expect([bathRunId('cool'), bathOfRun('bath-cool'), bathOfRun('mixture-2')]).toEqual(['bath-cool', 'cool', null])
    expect([mixtureOfRun(clockData, 'mixture-4').id, mixtureOfRun(clockData, 'bath-warm').id]).toEqual(['mixture-4', 'mixture-1'])
  })
})

describe('the two reactions and the count between them (spec 19.5)', () => {
  const atoms = (species: ClockData['reactions'][number]['reactants']) => {
    const count: Record<string, number> = {}
    for (const s of species) for (const [element, n] of Object.entries(s.composition)) count[element] = (count[element] ?? 0) + s.coefficient * n
    return count
  }
  const charge = (species: ClockData['reactions'][number]['reactants']) => species.reduce((sum, s) => sum + s.coefficient * s.charge, 0)

  it('are written as their sources print them', () => {
    expect(clockData.reactions.map((r) => r.equation)).toEqual(['6 I⁻(aq) + BrO₃⁻(aq) + 6 H⁺(aq) → 3 I₂(aq) + Br⁻(aq) + 3 H₂O(l)', 'I₂(aq) + 2 S₂O₃²⁻(aq) → 2 I⁻(aq) + S₄O₆²⁻(aq)'])
  })

  it('balance, atom for atom and charge for charge', () => {
    for (const r of clockData.reactions) {
      expect(atoms(r.reactants), r.id).toEqual(atoms(r.products))
      expect(charge(r.reactants), r.id).toBe(charge(r.products))
    }
    expect(atoms(reaction('slow').reactants)).toEqual({ I: 6, Br: 1, O: 3, H: 6 })
    expect(charge(reaction('slow').reactants)).toBe(-1)
    expect(atoms(reaction('clock').reactants)).toEqual({ I: 2, S: 4, O: 6 })
    expect(charge(reaction('clock').reactants)).toBe(-4)
  })

  it('give six thiosulfate ions for one bromate ion: three molecules of iodine, each taking two', () => {
    const iodine = reaction('slow').products.find((s) => s.formula === 'I₂')!.coefficient / reaction('slow').reactants.find((s) => s.formula === 'BrO₃⁻')!.coefficient
    const thiosulfate = reaction('clock').reactants.find((s) => s.formula === 'S₂O₃²⁻')!.coefficient / reaction('clock').reactants.find((s) => s.formula === 'I₂')!.coefficient
    expect([iodine, thiosulfate, iodine * thiosulfate]).toEqual([3, 2, 6])
    expect(clockData.count.value).toBe(6)
    expect(rateLaw.end.per).toBe(6)
    expect(clockData.count.working).toBe('One bromate ion makes 3 molecules of iodine, and each molecule of iodine takes 2 thiosulfate ions: 3 × 2 = 6 thiosulfate ions for each bromate ion.')
    // The second reaction gives back the six iodide ions the first one takes, so the iodide stays as it was while the thiosulfate lasts.
    expect(iodine * reaction('clock').products.find((s) => s.formula === 'I⁻')!.coefficient).toBe(reaction('slow').reactants.find((s) => s.formula === 'I⁻')!.coefficient)
  })
})

describe("the reaction's rate record (spec 19.4)", () => {
  it('has the orders usually found: one in iodide, one in bromate, two in hydrogen ion, each cited', () => {
    expect(rateLaw.reactants.map((r) => `${r.id} (${r.formula}, from ${r.reagentId}): order ${r.order.value}, from ${r.comparedIn}`)).toEqual([
      'iodide (I⁻, from ki-0.01m): order 1, from mixture-2',
      'bromate (BrO₃⁻, from kbro3-0.04m): order 1, from mixture-3',
      'hydrogen-ion (H⁺, from hcl-0.1m): order 2, from mixture-4',
    ])
    expect(rateLaw.reactants.map((r) => r.id)).toEqual([...REACTANT_IDS])
    for (const r of rateLaw.reactants) expect([r.order.sourceId, r.order.alsoSourceId], r.id).toEqual(['barton-bromate-iodide-1976', 'loo-bromate-iodide-1969'])
    expect(rateLaw.expression).toBe('rate = k[I⁻][BrO₃⁻][H⁺]²')
    expect(rateLaw.note.value).toContain('The lab stores the first term alone.')
  })

  it('has a rate constant with the figure its source prints, at 25 °C, and says in what it was measured', () => {
    expect(rateLaw.rateConstant).toMatchObject({ value: 50.26, published: '50.26', unit: 'L³/(mol³·s)', celsius: 25, sourceId: 'loo-bromate-iodide-1969' })
    expect(rateLaw.rateConstant.note).toContain('ionic strength was held at 1.00 with a nitrate')
    expect(rateLaw.rateConstant.note).toContain('no figure measured in a mixture like this bench\'s was read')
  })

  it("has an activation energy that is the lab's own, a model parameter with its rationale and no source", () => {
    expect(Object.keys(rateLaw.activationEnergy).sort()).toEqual(['rationale', 'unit', 'value'])
    expect([rateLaw.activationEnergy.value, rateLaw.activationEnergy.unit]).toEqual([50, 'kJ/mol'])
    expect(rateLaw.activationEnergy.rationale).toMatch(/^The lab's own figure, not a measured one\. No measurement of this reaction's activation energy in dilute hydrochloric acid was found\./)
    // The figures read and not used are given, with why.
    for (const figure of ['16.21 kJ', '5.23 kJ', '21 kJ', 'They are not used.']) expect(rateLaw.activationEnergy.rationale, figure).toContain(figure)
  })

  it('says what ends a run: the thiosulfate used up, six for one, shown by starch, from colourless to dark blue', () => {
    expect(rateLaw.end).toMatchObject({ reagentId: 'na2s2o3-0.001m', per: 6, indicatorId: 'starch', indicatorFlask: 'b', before: { value: 'clear and colourless' }, after: { value: 'dark blue' } })
  })

  it('takes the gas constant and the kelvin of 0 °C from NIST', () => {
    expect(clockData.constants).toEqual({ gasConstant: { value: 8.314462618, unit: 'J/(mol·K)', sourceId: 'nist-codata-2022' }, zeroCelsius: { value: 273.15, published: '273.15', unit: 'K', sourceId: 'nist-si-temperature' } })
  })
})

describe('the five mixtures (spec 19.1)', () => {
  it('are of 50 mL each, split between two flasks: iodide, thiosulfate and water in one, bromate and acid in the other', () => {
    expect(clockData.mixtures.map((m) => `${m.name}: ${volumes(m)}`)).toEqual([
      'Mixture 1: 10 ki-0.01m, 10 na2s2o3-0.001m, 10 water, 10 kbro3-0.04m, 10 hcl-0.1m',
      'Mixture 2: 20 ki-0.01m, 10 na2s2o3-0.001m, 0 water, 10 kbro3-0.04m, 10 hcl-0.1m',
      'Mixture 3: 10 ki-0.01m, 10 na2s2o3-0.001m, 0 water, 20 kbro3-0.04m, 10 hcl-0.1m',
      'Mixture 4: 10 ki-0.01m, 10 na2s2o3-0.001m, 0 water, 10 kbro3-0.04m, 20 hcl-0.1m',
      'Mixture 5: 8 ki-0.01m, 10 na2s2o3-0.001m, 12 water, 5 kbro3-0.04m, 15 hcl-0.1m',
    ])
    for (const m of clockData.mixtures) {
      expect([...m.flaskA, ...m.flaskB].reduce((sum, part) => sum + part.millilitres, 0), m.id).toBe(50)
      expect(m.flaskA.map((part) => part.reagentId), m.id).toEqual(['ki-0.01m', 'na2s2o3-0.001m', 'water'])
      expect(m.flaskB.map((part) => part.reagentId), m.id).toEqual(['kbro3-0.04m', 'hcl-0.1m'])
    }
    expect(clockData.referenceMixtureId).toBe('mixture-1')
  })
})

describe('the notes shown when a part is done', () => {
  const notes = (part: number) => clockData.parts[part]!.notes.map((n) => n.value)

  it('are three for each part, each of a hundred words or fewer', () => {
    for (const part of clockData.parts) {
      expect(part.notes.length, part.id).toBe(3)
      for (const note of part.notes) expect(note.value.split(/\s+/).length, part.id).toBeLessThanOrEqual(100)
    }
  })

  it('say of the rate constant what it was measured in, and that a real bench need not give it', () => {
    expect(notes(1)[1]).toContain(`The model's rate constant is ${rateLaw.rateConstant.published} ${rateLaw.rateConstant.unit} at ${rateLaw.rateConstant.celsius} °C.`)
    expect(notes(1)[1]).toContain('so a real bench need not give it')
    expect(notes(1)[0]).toContain(rateLaw.expression)
  })

  it("say of the activation energy that it is the lab's own figure and not a measured one, and nowhere give it as a literature value", () => {
    expect(notes(2)[1]).toContain(`The activation energy this lab's model runs on is ${rateLaw.activationEnergy.value} ${rateLaw.activationEnergy.unit}. It is the lab's own figure, not a measured one`)
    expect(notes(2)[1]).toContain('A real bench may well give a figure far from the lab\'s.')
    // No note cites a source for the figure itself: the two it cites are for the rule of thumb and for the study read and not used.
    expect(clockData.parts[2].notes[1]).toMatchObject({ sourceId: 'chemguide-arrhenius', alsoSourceId: 'uddin-iodide-bromate-1979' })
    for (const text of [...clockData.parts.flatMap((p) => p.notes.map((n) => n.value)), rateLaw.note.value, rateLaw.rateConstant.note]) expect(text).not.toMatch(/(accepted|literature|measured|published) (value|figure) (of|is) 50\b/i)
  })

  it('say what each part takes as simpler than it is, with the figures the build checks', () => {
    for (const part of [0, 1, 2]) expect(notes(part)[2]).toMatch(/^What this lab takes as simpler than it is\./)
    expect(notes(1)[2]).toContain('under 1% of the bromate and 1% or less of the hydrogen ion')
    expect(notes(1)[2]).toContain("These figures are the lab's own arithmetic.")
    expect(notes(2)[2]).toContain('above 10 °C, and the ice bath is colder')
    expect(parameters.iceRangeTenths.value[1]).toBeLessThan(100)
  })
})

describe('the parameters', () => {
  it('each have a value and a rationale that says what it is for', () => {
    expect(Object.keys(parameters)).toEqual(['roomRangeTenths', 'iceRangeTenths', 'coolRangeTenths', 'warmRangeTenths', 'standMinutes', 'starchDrops', 'scatterPerTenThousand', 'delayLimitMs', 'watchLimitSeconds', 'orderChoices', 'unitPowers', 'rateConstantTolerancePercent', 'activationTolerancePercent', 'placesFromMicro', 'placesStepMicro', 'placesCount'])
    for (const [name, parameter] of Object.entries(parameters)) expect(parameter.rationale.length, name).toBeGreaterThan(40)
  })

  it('give each bath a range about the temperature its procedure sets, and the room one of its own', () => {
    expect(clockData.baths.map((b) => [b.about * 10, (parameters as Record<string, { value: unknown }>)[b.range]!.value])).toEqual([[0, [5, 20]], [100, [90, 110]], [400, [380, 420]]])
    expect(parameters.roomRangeTenths.value).toEqual([200, 240])
  })
})

describe('validateClock', () => {
  it('refuses a record whose ids do not hold together', () => {
    expect(errorsWith((d) => void (d.rateLaw.reactants[0]!.reagentId = 'starch'))).toMatch(/reactant "iodide": "starch" is not a solution of the record/)
    expect(errorsWith((d) => void (d.rateLaw.reactants[1]!.comparedIn = 'mixture-1'))).toMatch(/reactant "bromate": its order is found from the reference mixture and another/)
    expect(errorsWith((d) => void (d.rateLaw.end.indicatorId = 'hcl-0.1m'))).toMatch(/rateLaw.end: "hcl-0.1m" is not an indicator of the record/)
    expect(errorsWith((d) => void (d.mixtures[2]!.flaskA[0]!.reagentId = 'acetone'))).toMatch(/mixture "mixture-3": unknown reagent "acetone"/)
    expect(errorsWith((d) => void (d.baths[0]!.range = 'standMinutes'))).toMatch(/bath "ice": "standMinutes" is not a parameter that is a range/)
    expect(errorsWith((d) => void (d.parameters.warmRangeTenths.value = [420, 380]))).toMatch(/parameters.warmRangeTenths: a range runs from its lower end to its upper/)
    expect(errorsWith((d) => void d.reagents.push(d.reagents[0]!))).toMatch(/reagents: duplicate id "ki-0.01m"/)
  })

  it('refuses an unknown source, a figure that is not the number beside it, and a record of another shape', () => {
    expect(errorsWith((d) => void (d.rateLaw.rateConstant.sourceId = 'nowhere'))).toMatch(/unknown source "nowhere"/)
    expect(errorsWith((d) => void (d.rateLaw.rateConstant.published = '49'))).not.toBe('')
    expect(errorsWith((d) => void ((d.rateLaw.activationEnergy as { sourceId?: string }).sourceId = 'chemguide-arrhenius'))).not.toBe('')
    expect(validateClock({}, sources)).not.toEqual([])
    expect(validateClock(null, sources)).not.toEqual([])
  })
})

describe("the sources behind a part (spec 5.1)", () => {
  it('lists, for each part, every source its stored values cite, each once', () => {
    for (const part of PART_IDS) {
      const listed = clockCitations(clockData, part, sources)
      expect(new Set(listed.map((c) => c.source.id)).size, part).toBe(listed.length)
      for (const note of clockData.parts.find((p) => p.id === part)!.notes) expect(listed.map((c) => c.source.id), part).toContain(note.sourceId)
      for (const r of clockData.reagents) expect(listed.map((c) => c.source.id), part).toContain(r.hazards.sourceId)
    }
    const ids = (part: (typeof PART_IDS)[number]) => clockCitations(clockData, part, sources).map((c) => c.source.id)
    // The rate record's own sources come with the two parts that have a notebook, and the constants with the last.
    expect(ids('runs')).not.toContain('nist-codata-2022')
    expect(ids('rate-law')).toContain('loo-bromate-iodide-1969')
    expect(ids('rate-law')).not.toContain('nist-si-temperature')
    expect(ids('temperature')).toEqual(expect.arrayContaining(['nist-codata-2022', 'nist-si-temperature', 'barton-bromate-iodide-1976', 'bellevue-clock-reaction']))
  })

  it('gives no order, rate constant or activation energy in a label: the list is shown before a part is done', () => {
    for (const part of PART_IDS) for (const citation of clockCitations(clockData, part, sources)) for (const covers of citation.covers) expect(covers, part).not.toMatch(/first order|second order|50\.26|\b50 kJ|fourth/i)
    expect(() => clockCitations(clockData, 'nothing' as 'runs', sources)).toThrow(/no part/)
  })
})
