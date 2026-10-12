import { describe, expect, it } from 'vitest'
import authored from '../../../docs/research/hotcold/hotcold.json'
import ownHazards from '../../../docs/research/hotcold/hazards.json'
import { hotcoldCitations } from '../citations'
import sources from '../sources.json'
import { validateHotcold } from '../validate'
import { hotcoldData, hotcoldSchema, isSaltId, PART_IDS, runOf, SALT_IDS, saltOf, type HotcoldData } from './data'
import stored from './hotcold.json'

const local = import.meta.glob<string[]>('../denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

const copy = (): HotcoldData => JSON.parse(JSON.stringify(stored))
const errorsWith = (edit: (data: HotcoldData) => void) => {
  const data = copy()
  edit(data)
  return validateHotcold(data, sources).join('\n')
}
const words = (text: string) => text.split(/\s+/).length
const [epsom, calcium, packs] = hotcoldData.parts

describe('hotcoldData', () => {
  it('is the generated file, with nothing dropped or added by the schema', () => {
    expect(hotcoldData).toEqual(stored)
    expect(hotcoldSchema.safeParse({ ...stored, extra: 1 }).success).toBe(false)
  })

  it('passes validation against the stored sources', () => {
    expect(validateHotcold(stored, sources, { institutionNames })).toEqual([])
  })

  it("is the authored record with each salt's hazards merged in from this lab's own file, and nothing else changed", () => {
    const bare = (salt: (typeof hotcoldData.reagents)[number]) => Object.fromEntries(Object.entries(salt).filter(([key]) => key !== 'classifiedAs' && key !== 'hazards'))
    expect({ ...hotcoldData, reagents: hotcoldData.reagents.map(bare) }).toEqual(authored)
    for (const salt of hotcoldData.reagents) expect({ classifiedAs: salt.classifiedAs, hazards: salt.hazards }, salt.id).toEqual(ownHazards[salt.id as keyof typeof ownHazards])
  })

  it('holds the three parts of spec 26.1 and the two salts, each named for what it is', () => {
    expect(hotcoldData.parts.map((part) => [part.id, part.name])).toEqual([
      ['epsom-salt', 'Epsom salt in water'],
      ['calcium-chloride', 'Calcium chloride in water'],
      ['packs', 'Hot pack and cold pack'],
    ])
    expect(PART_IDS).toEqual(['epsom-salt', 'calcium-chloride', 'packs'])
    expect(SALT_IDS.map((id) => [saltOf(hotcoldData, id).name, saltOf(hotcoldData, id).chemicalName.value, saltOf(hotcoldData, id).formula, saltOf(hotcoldData, id).watersOfCrystal])).toEqual([
      ['Epsom salt', 'magnesium sulfate heptahydrate', 'MgSO₄·7H₂O', 7],
      ['Calcium chloride', 'calcium chloride, anhydrous', 'CaCl₂', 0],
    ])
    expect(SALT_IDS.map((id) => runOf(hotcoldData, id).reagentId)).toEqual([...SALT_IDS])
    expect([isSaltId('epsom-salt'), isSaltId('packs'), isSaltId(3)]).toEqual([true, false, false])
  })

  it('stores each enthalpy with the digits the tables print and the sum written out: Epsom salt takes heat in, and calcium chloride and the dry magnesium sulfate give it out', () => {
    expect([epsom.enthalpy.value, epsom.enthalpy.infiniteDilution.value]).toEqual([17.56, 11.78])
    expect([calcium.enthalpy.value, calcium.enthalpy.infiniteDilution.value]).toEqual([-77.689, -81.33])
    expect([epsom.dry.value, epsom.dry.infiniteDilution.value]).toEqual([-85.44, -91.22])
    expect(epsom.enthalpy.terms.map((t) => [t.label, t.coefficient, t.enthalpyOfFormation.published])).toEqual([
      ['MgSO₄ in 75 H₂O', 1, '-1370.34'],
      ['H₂O(l)', 7, '-285.830'],
      ['MgSO₄·7H₂O(s)', -1, '-3388.71'],
    ])
    expect(calcium.enthalpy.terms.map((t) => [t.label, t.coefficient, t.enthalpyOfFormation.published])).toEqual([
      ['CaCl₂ in 75 H₂O', 1, '-873.489'],
      ['CaCl₂(s)', -1, '-795.8'],
    ])
    expect(epsom.dry.terms.map((t) => t.enthalpyOfFormation.published)).toEqual(['-1370.34', '-1284.9'])
    for (const worked of [epsom.enthalpy, calcium.enthalpy, epsom.dry]) {
      expect(worked.working.startsWith('(−')).toBe(true)
      for (const sum of [worked, worked.infiniteDilution]) for (const term of sum.terms) expect(term.enthalpyOfFormation.sourceId).toBe('nbs-tables-1982')
    }
  })

  it('works each molar mass out from the atomic weights, and holds a weight for every atom and no other', () => {
    expect(hotcoldData.reagents.map((r) => [r.molarMass.value, r.molarMass.unit])).toEqual([[246.47, 'g/mol'], [110.98, 'g/mol']])
    expect(hotcoldData.atomicWeights.map((w) => w.id).sort()).toEqual([...new Set(hotcoldData.reagents.flatMap((r) => Object.keys(r.composition)))].sort())
  })

  it("says in each note what the run showed and no more than the record holds: the figures of the notes are the record's own", () => {
    expect(epsom.notes[0]!.value).toContain(`+${epsom.enthalpy.value.toPrecision(3)} kJ/mol`)
    expect(calcium.notes[0]!.value).toContain(`−${Math.abs(calcium.enthalpy.value).toPrecision(3)} kJ/mol`)
    expect(epsom.notes[1]!.value).toContain(`about ${Math.round(Math.abs(epsom.dry.value))} kJ`)
    expect(epsom.notes[0]!.value).toMatch(/colder.*took heat in.*endothermic/)
    expect(calcium.notes[0]!.value).toMatch(/warmer.*gave heat out.*exothermic/)
    expect(packs.notes.map((note) => note.sourceId)).toEqual(['wikipedia-heating-pad', 'wikipedia-ice-pack'])
  })

  it('keeps every note short: 70 words at the most, and three to a part at the most', () => {
    for (const part of hotcoldData.parts) {
      expect(part.notes.length, part.id).toBeLessThanOrEqual(3)
      for (const note of part.notes) expect(words(note.value), part.id).toBeLessThanOrEqual(70)
    }
  })

  it("writes each salt's hazard note in three short paragraphs of 160 words at the most, the last on disposal and a procedure in none, and says in neither which way the salt's temperature goes", () => {
    for (const salt of hotcoldData.reagents) {
      const note = salt.hazards.note.value
      const paragraphs = note.split('\n\n')
      expect(paragraphs, salt.id).toHaveLength(3)
      expect(words(note), salt.id).toBeLessThanOrEqual(160)
      expect(paragraphs[1], salt.id).toMatch(/^Stricter, and what this lab goes by: /)
      expect(paragraphs[2], salt.id).toBe("How any of it is disposed of is decided by the laboratory's own rules and by local regulations; ask the laboratory's supervisor.")
      expect(note, salt.id).not.toMatch(/drain|sink|trash|\bbin\b/i)
      expect(`${salt.classifiedAs} ${note} ${salt.hazards.statements.join(' ')}`, salt.id).not.toMatch(/\bheat|warm|\bhot\b|cold|cool|temperature|exothermic|endothermic|liberat/i)
      expect(salt.solubility.note, salt.id).not.toMatch(/\bheat|warm|\bhot\b|cold|cool|exothermic|endothermic/i)
    }
    expect(hotcoldData.reagents.map((r) => [r.hazards.signalWord, r.hazards.statements.length])).toEqual([['None', 0], ['Warning', 2]])
  })

  it('gives every parameter a rationale, and the cup the calorimetry lab’s own figures', () => {
    for (const [key, parameter] of Object.entries(hotcoldData.parameters)) expect(parameter.rationale.length, key).toBeGreaterThan(40)
    const { loggerStepSeconds, runOnSteps, loggerMaxSteps, mixStirredPpm, mixStillPpm, lossLidOnPpm, lossLidOffPpm, startRangeTenths, readingToleranceTenths } = hotcoldData.parameters
    expect([loggerStepSeconds, runOnSteps, loggerMaxSteps, mixStirredPpm, mixStillPpm, lossLidOnPpm, lossLidOffPpm, readingToleranceTenths].map((p) => p.value)).toEqual([15, 2, 240, 850000, 150000, 5000, 40000, 0])
    expect(startRangeTenths.value).toEqual([200, 240])
  })
})

describe('hotcoldCitations', () => {
  const ids = (part: Parameters<typeof hotcoldCitations>[1], done = false) => hotcoldCitations(hotcoldData, part, sources, done).map((c) => c.source.id)

  it('lists for a run, before it counts, the salt, its hazards and the water, and nothing that stands beside a sentence on which way the heat went', () => {
    expect(ids('epsom-salt')).toEqual(['flinn-sds-480', 'wikipedia-magnesium-sulfate', 'fisher-sds-mgso4-heptahydrate', 'nist-webbook-water-25c'])
    expect(ids('calcium-chloride')).toEqual(['flinn-sds-196', 'fisher-sds-cacl2', 'noaa-cameo-8382', 'nist-webbook-water-25c'])
    for (const part of SALT_IDS) for (const id of ['nbs-tables-1982', 'docbrown-calorimeter-methods', 'ciaaw-abridged-2024']) expect(ids(part), part).not.toContain(id)
  })

  it('adds the tables, the atomic weights and the notes once the run counts', () => {
    for (const part of SALT_IDS) {
      expect(ids(part, true).slice(0, 4), part).toEqual(ids(part))
      for (const id of ['nbs-tables-1982', 'docbrown-calorimeter-methods', 'ciaaw-abridged-2024']) expect(ids(part, true), part).toContain(id)
    }
  })

  it('lists for part 3 the two salts it asks about, and the pages on packs once it is done', () => {
    expect(ids('packs')).toEqual(['flinn-sds-480', 'wikipedia-magnesium-sulfate', 'flinn-sds-196'])
    expect(ids('packs', true)).toEqual(['flinn-sds-480', 'wikipedia-magnesium-sulfate', 'flinn-sds-196', 'wikipedia-heating-pad', 'wikipedia-ice-pack'])
  })
})

describe('validateHotcold', () => {
  it('refuses a source that does not exist, and a figure that is not the number beside it', () => {
    expect(errorsWith((d) => void (d.reagents[0].appearance.sourceId = 'nobody'))).toContain('nobody')
    expect(errorsWith((d) => void (d.parts[0].enthalpy.terms[0]!.enthalpyOfFormation.published = '-1370.43'))).toMatch(/published/)
  })

  it('refuses a run that is not of its own salt, a sum that names a term twice, an atom with no weight and a range that runs downward', () => {
    expect(errorsWith((d) => void (d.parts[1].reagentId = 'epsom-salt'))).toContain('a run is named for its salt')
    expect(errorsWith((d) => void (d.parts[0].enthalpy.terms[1]!.id = d.parts[0].enthalpy.terms[0]!.id))).toContain('the terms of a sum')
    expect(errorsWith((d) => void (d.reagents[1].composition = { Ca: 1, Br: 2 }))).toContain('no atomic weight for Br')
    expect(errorsWith((d) => void (d.parameters.epsomSaltRangeCg.value = [1040, 960]))).toContain('a range runs from its lower end')
  })

  it('refuses institution text in a note', () => {
    expect(errorsWith((d) => void (d.parts[2].notes[0]!.value += ' See CHEM 1411.'))).not.toBe('')
  })

  it('never throws, whatever it is given', () => {
    for (const input of [null, undefined, 3, 'x', [], {}]) expect(validateHotcold(input, sources)).not.toEqual([])
  })
})
