import { describe, expect, it } from 'vitest'
import elements from '@/chem-data/elements.json'
import { registry } from '@/chem-data/registry'
import sources from '@/chem-data/sources.json'
import { distance } from '@/chem-data/geometry'
import { hclNahco3 } from './data'
import stored from './hcl-nahco3.json'
import { mechanismSchema, type Mechanism, type Step } from './schema'
import { validateMechanism } from './validate'

const local = import.meta.glob<string[]>('../chem-data/denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()
const copy = (): Mechanism => JSON.parse(JSON.stringify(stored))
const problems = (change: (m: Mechanism) => void) => {
  const changed = copy()
  change(changed)
  return validateMechanism(changed, sources, registry.molecules, { institutionNames: ['Example State'] }).join('\n')
}
const step = (m: Mechanism, id: string) => m.chapters.find((c): c is Step => c.id === id && c.kind === 'step')!

describe('the mechanism record', () => {
  it('is the generated file, with nothing dropped or added by the schema', () => {
    expect(hclNahco3).toEqual(stored)
    expect(mechanismSchema.safeParse({ ...stored, extra: 1 }).success).toBe(false)
  })

  it('passes the validator (spec 5.1)', () => {
    expect(validateMechanism(hclNahco3, sources, registry.molecules, { institutionNames })).toEqual([])
  })

  it('has fourteen atoms, each with one id and one element for the whole timeline', () => {
    expect(hclNahco3.actors.map((a) => a.element).sort().join('')).toBe('CClHHHHHHNaOOOOO')
    for (const keyframe of hclNahco3.keyframes) expect(keyframe.positions).toHaveLength(14)
  })

  it('draws the two monatomic ions as spheres of their cited ionic radii', () => {
    const ions = hclNahco3.actors.filter((a) => a.ion)
    expect(ions.map((a) => [a.id, a.ion!.charge, a.ion!.radius.value, a.ion!.radius.sourceId])).toEqual([
      ['na', 1, 1.02, 'shannon-1976'],
      ['cl', -1, 1.81, 'shannon-1976'],
    ])
    for (const actor of ions) {
      const element = elements.find((e) => e.symbol === actor.element)!
      expect(element.ionicRadii).toContainEqual({ charge: actor.ion!.charge, coordination: actor.ion!.coordination, value: actor.ion!.radius.value, sourceId: actor.ion!.radius.sourceId })
    }
  })

  it('has the sodium ion of the solid touching an oxygen: their centres are the sum of the two cited ionic radii apart', () => {
    const oxide = elements.find((e) => e.symbol === 'O')!.ionicRadii.find((r) => r.charge === -2)!.value
    const index = (id: string) => hclNahco3.actors.findIndex((a) => a.id === id)
    for (const id of ['beaker', 'solid-in']) {
      const { positions } = hclNahco3.keyframes.find((k) => k.id === id)!
      expect(distance(positions[index('na')]!, positions[index('o-carbonyl')]!)).toBeCloseTo(1.02 + oxide, 2)
    }
  })

  it('names every species its keyframes place, and a real timescale for the prologue and each step', () => {
    const placed = new Set(hclNahco3.keyframes.flatMap((k) => k.species.map((s) => ('ion' in s ? s.ion : s.speciesId))))
    expect(hclNahco3.species.map((s) => s.id).sort()).toEqual([...placed].sort())
    expect(hclNahco3.chapters.map((c) => c.timescale?.value ?? null)).toEqual([
      null,
      'before mixing',
      'seconds, depending on particle size and stirring',
      'picoseconds to nanoseconds',
      'tens of milliseconds; the slow step',
      'seconds',
      null,
    ])
  })
})

describe('the energies, worked out again from the cited values (spec 9.2)', () => {
  const { formation, carbonicAcid, constants, parameters } = hclNahco3.thermo
  const of = (id: string) => formation.find((f) => f.id === id)!
  const change = (key: 'enthalpy' | 'gibbs', reactants: string[], products: string[]) =>
    products.reduce((sum, id) => sum + of(id)[key].value, 0) - reactants.reduce((sum, id) => sum + of(id)[key].value, 0)
  const s = (id: string) => step(hclNahco3, id)

  it('the whole change is that of NaHCO₃(s) + H⁺(aq) → Na⁺(aq) + H₂O(l) + CO₂(g) in the tables: +31.4 and −42.4 kJ/mol', () => {
    const [reactants, products] = [['sodium-hydrogen-carbonate', 'hydrogen-ion'], ['sodium-ion', 'water', 'carbon-dioxide-gas']]
    expect(change('enthalpy', reactants, products)).toBeCloseTo(31.351, 3)
    expect(change('gibbs', reactants, products)).toBeCloseTo(-42.393, 3)
    const steps = hclNahco3.chapters.filter((c): c is Step => c.kind === 'step')
    expect(steps.reduce((sum, x) => sum + (x.deltaH?.value ?? 0), 0)).toBeCloseTo(change('enthalpy', reactants, products), 3)
    expect(steps.reduce((sum, x) => sum + x.deltaG.value, 0)).toBeCloseTo(change('gibbs', reactants, products), 2)
  })

  it('step 1 is the solid going to its two ions, cited: +18.70 and +2.325, slightly uphill', () => {
    expect(s('dissolving').deltaH).toEqual({ value: 18.7, sourceIds: ['nbs-tables-1982'], basis: 'cited', method: 'formation' })
    expect(s('dissolving').deltaG).toEqual({ value: 2.325, sourceIds: ['nbs-tables-1982'], basis: 'cited', method: 'formation' })
    expect(s('dissolving').deltaG.value).toBeCloseTo(change('gibbs', ['sodium-hydrogen-carbonate'], ['sodium-ion', 'hydrogen-carbonate-ion']), 3)
    expect(s('dissolving').activationG).toBeUndefined()
  })

  it('step 2 is −RT ln 10 × pKa of the true carbonic acid molecule, cited, with no enthalpy of its own and a schematic barrier', () => {
    expect(carbonicAcid.pKa.value).toBe(3.49)
    const expected = (-constants.gasConstant.value * parameters.temperature.value * Math.LN10 * carbonicAcid.pKa.value) / 1000
    expect(expected).toBeCloseTo(-19.92, 2)
    expect(s('proton-transfer').deltaG).toEqual({ value: -19.92, sourceIds: ['pines-2016', 'nist-codata-2022'], basis: 'cited', method: 'acid-constant' })
    expect(s('proton-transfer').deltaH).toBeNull()
    expect(s('proton-transfer').activationG).toBe('schematic')
  })

  it('step 3 is the tables\' total for H⁺ + HCO₃⁻ → CO₂(aq) + H₂O less step 2, derived, and the one enthalpy covers both steps', () => {
    const total = change('gibbs', ['hydrogen-ion', 'hydrogen-carbonate-ion'], ['carbon-dioxide-aqueous', 'water'])
    expect(total).toBeCloseTo(-36.339, 3)
    expect(s('decomposition').deltaG.value).toBeCloseTo(total - s('proton-transfer').deltaG.value, 3)
    expect(s('decomposition').deltaG.basis).toBe('derived')
    expect(s('decomposition').deltaG.method).toBe('remainder')
    expect(s('decomposition').deltaH).toEqual({ value: -7.64, sourceIds: ['nbs-tables-1982'], basis: 'cited', method: 'formation', covers: ['proton-transfer', 'decomposition'] })
  })

  it("step 3's barrier is derived by the Eyring equation from the cited lifetime of carbonic acid: 66.0 kJ/mol", () => {
    const [T, tau] = [parameters.temperature.value, carbonicAcid.lifetime.value / 1000]
    expect([carbonicAcid.lifetime.value, carbonicAcid.lifetime.unit, T]).toEqual([60, 'ms', 298.15])
    const expected = (constants.gasConstant.value * T * Math.log((constants.boltzmannConstant.value * T * tau) / constants.planckConstant.value)) / 1000
    expect(s('decomposition').activationG).toEqual({ value: Number(expected.toFixed(1)), sourceIds: ['pines-2016', 'nist-codata-2022'], basis: 'derived', method: 'eyring' })
    expect(expected).toBeCloseTo(66.05, 1)
  })

  it('step 4 is dissolved carbon dioxide going to the gas, cited: +20.291 and −8.379', () => {
    expect(s('gas-escapes').deltaH!.value).toBe(20.291)
    expect(s('gas-escapes').deltaG.value).toBe(-8.379)
    expect(s('gas-escapes').deltaG.basis).toBe('cited')
  })

  it('does not use the tables\' entry for "H₂CO₃(aq)", which is dissolved CO₂ with a water molecule (spec 9.2)', () => {
    expect(formation.map((f) => f.id)).not.toContain('carbonic-acid')
    expect(formation.find((f) => f.id === 'carbon-dioxide-aqueous')!.note!.value).toMatch(/not the carbonic acid molecule/)
    // No stored value is either figure of that entry.
    expect(JSON.stringify(formation.map((f) => [f.enthalpy.value, f.gibbs.value]))).not.toMatch(/699\.65|623\.08/)
  })

  it('every energy names sources that exist', () => {
    const ids = new Set(sources.map((x) => x.id))
    for (const one of hclNahco3.chapters.filter((c): c is Step => c.kind === 'step')) {
      for (const energy of [one.deltaH, one.deltaG, one.activationG]) if (energy && energy !== 'schematic') for (const id of energy.sourceIds) expect(ids.has(id)).toBe(true)
    }
  })
})

describe('validateMechanism', () => {
  it('refuses a source that does not exist, on a value and on an energy', () => {
    expect(problems((m) => (m.thermo.carbonicAcid.pKa.sourceId = 'nowhere'))).toMatch(/thermo\.carbonicAcid\.pKa\.sourceId: unknown source "nowhere"/)
    expect(problems((m) => (step(m, 'gas-escapes').deltaG.sourceIds = ['nowhere']))).toMatch(/chapter "gas-escapes": unknown source "nowhere"/)
    expect(problems((m) => (m.actors[0]!.ion!.radius.sourceId = 'nowhere'))).toMatch(/unknown source "nowhere"/)
  })

  it('refuses an id that names nothing: an actor, a species, a formation value, a chapter', () => {
    expect(problems((m) => m.chapters[1]!.active.push('k'))).toMatch(/chapter "prologue": unknown actor "k"/)
    expect(problems((m) => (m.keyframes[0]!.bonds[0]!.a = 'k'))).toMatch(/keyframe "beaker": unknown actor "k"/)
    expect(problems((m) => (step(m, 'proton-transfer').electronPaths[0]!.from = { lonePair: 'k' }))).toMatch(/chapter "proton-transfer": unknown actor "k"/)
    expect(problems((m) => ((m.keyframes[0]!.species[1] as { speciesId: string }).speciesId = 'carbonate'))).toMatch(/keyframe "beaker": unknown species "carbonate"/)
    expect(problems((m) => (m.species.find((x) => x.id === 'water')!.id = 'steam'))).toMatch(/unknown species "water"/)
    expect(problems((m) => step(m, 'dissolving').reaction!.products.push('steam'))).toMatch(/chapter "dissolving": unknown formation value "steam"/)
    expect(problems((m) => (step(m, 'decomposition').deltaH!.covers = ['proton-transfer', 'no-such']))).toMatch(/chapter "decomposition": unknown chapter "no-such"/)
  })

  it('refuses an id given twice', () => {
    expect(problems((m) => (m.actors[1]!.id = 'na'))).toMatch(/actors: duplicate id "na"/)
    expect(problems((m) => (m.chapters[1]!.id = 'beaker-start'))).toMatch(/chapters: duplicate id "beaker-start"/)
    expect(problems((m) => (step(m, 'decomposition').question!.id = 'dissolving'))).toMatch(/questions: duplicate id "dissolving"/)
  })

  it('refuses a track with a gap, a boundary with no keyframe, and a keyframe that does not place every actor', () => {
    expect(problems((m) => (m.chapters[2]!.range[0] = 0.2))).toMatch(/chapter "dissolving": begins at 0\.2, not at 0\.16/)
    expect(problems((m) => (m.chapters.at(-1)!.range[1] = 0.99))).toMatch(/the track does not end at 1/)
    expect(problems((m) => m.keyframes[3]!.positions.pop())).toMatch(/keyframe "solid-in": 13 positions for 14 actors/)
    expect(problems((m) => (m.keyframes[5]!.t = 0.3))).toMatch(/keyframe "encounter": not later than the keyframe before it/)
  })

  it('refuses a published figure that is not the stored number, and institution text in what a learner reads', () => {
    expect(problems((m) => (m.thermo.formation[0]!.gibbs.published = '-851.1'))).toMatch(/published "-851\.1" is not the stored value -851/)
    expect(problems((m) => (m.chapters[0]!.explanation.intro += ' See Room 214.'))).toMatch(/explanation\.intro/)
    expect(problems((m) => (step(m, 'dissolving').question!.options[0]!.feedback += ' As in CHEM 1411.'))).toMatch(/feedback/)
    expect(problems((m) => (m.energyNote += ' Example State.'))).toMatch(/energyNote: contains the name/)
  })

  it('refuses, by its schema, a question with two right answers or none, a value with no source, and an easing it has no name for', () => {
    expect(problems((m) => (step(m, 'dissolving').question!.options[0]!.correct = true))).toMatch(/exactly one right answer/)
    expect(problems((m) => (step(m, 'dissolving').question!.options[1]!.correct = false))).toMatch(/exactly one right answer/)
    expect(problems((m) => delete (m.thermo.formation[0]!.enthalpy as { sourceId?: string }).sourceId)).toMatch(/^schema: thermo\.formation\.0\.enthalpy\.sourceId/)
    expect(problems((m) => ((m.keyframes[1] as { easing: string }).easing = 'bounce'))).toMatch(/^schema: keyframes\.1\.easing/)
  })

  it('never throws, whatever it is given', () => {
    for (const input of [null, undefined, 3, 'x', [], {}, { chapters: null }]) expect(validateMechanism(input, sources, registry.molecules).length).toBeGreaterThan(0)
    expect(validateMechanism(stored, null as unknown as [], null as unknown as [], { institutionNames: null as unknown as [] }).length).toBeGreaterThan(0)
  })
})
