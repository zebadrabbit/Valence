import { describe, expect, it } from 'vitest'
import authored from '../../../docs/research/mixing/mixing.json'
import hazards from '../../../docs/research/mixing/hazards.json'
import { cabbageData } from '../cabbage/data'
import { mixingPartCitations, mixingTubeCitations } from '../citations'
import { LIBRARY_INDEX } from '../libraryIndex'
import sources from '../sources.json'
import { validateMixing } from '../validate'
import { isPairId, isSolidTubeId, liquidOf, LIQUID_IDS, mixingData, mixingSchema, PAIR_IDS, PART_IDS, QUESTION_IDS, reagentOf, SOLID_IDS, SOLID_TUBE_IDS, solidOf, type MixingData } from './data'
import stored from './mixing.json'

const local = import.meta.glob<string[]>('../denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

const copy = (): MixingData => JSON.parse(JSON.stringify(stored))
const errorsWith = (edit: (data: MixingData) => void) => {
  const data = copy()
  edit(data)
  return validateMixing(data, sources, { institutionNames })
}
const words = (text: string) => text.split(/\s+/).length
/** The makers, suppliers and sites whose documents the record rests on: none is named in anything a learner sees. */
const BRANDS = /flinn|purdue|alaska|wikipedia|libretexts|ck-12|cameo/i
const { liquids, solids, pairs, solidInLiquid, offBench, rule, parts, parameters, reagents } = mixingData
/** Every sentence of the record a learner sees. */
const shown = [...pairs.map((p) => p.note.value), ...solidInLiquid.map((t) => t.note.value), ...parts.flatMap((p) => p.notes.map((n) => n.value)), ...rule.questions.map((q) => q.asks), mixingData.sharedNote.value]

describe('mixingData', () => {
  it('is the generated file, with nothing dropped or added by the schema', () => {
    expect(mixingSchema.parse(stored)).toEqual(stored)
    expect(mixingData).toEqual(stored)
  })

  it('passes validation against the stored sources', () => {
    expect(validateMixing(stored, sources, { institutionNames })).toEqual([])
  })

  it("is the authored record with the bottle's hazards merged in and the shared note put in, and nothing else changed", () => {
    expect({ ...stored, reagents: stored.reagents.map(({ id, name, holds, form }) => ({ id, name, holds, form })), sharedNote: { sharedWith: 'cabbage', rationale: stored.sharedNote.rationale } }).toEqual(authored)
    expect(Object.fromEntries(stored.reagents.map((r) => [r.id, { classifiedAs: r.classifiedAs, hazards: r.hazards }]))).toEqual(hazards)
  })

  it('holds the five liquids and the two solids of spec 25.1 and the three parts, in order', () => {
    expect(liquids.map((l) => l.id)).toEqual([...LIQUID_IDS])
    expect(liquids.map((l) => l.name)).toEqual(['Distilled water', 'Rubbing alcohol', 'Vinegar', 'Vegetable oil', 'Mineral oil'])
    expect(solids.map((s) => `${s.id}: ${s.name}, ${s.holds}`)).toEqual(['salt: Table salt, Sodium chloride', 'sugar: Sugar, Sucrose'])
    expect(solids.map((s) => s.id)).toEqual([...SOLID_IDS])
    expect(parts.map((p) => `${p.id}: ${p.name}`)).toEqual(['liquids: Liquid with liquid', 'solids: Solid in liquid', 'rule: The rule'])
    expect(parts.map((p) => p.id)).toEqual([...PART_IDS])
  })

  it('offers nine pairs and eight solids in liquids, and lists the three that are left off with why (spec 25.1)', () => {
    expect(pairs.map((p) => p.id)).toEqual([...PAIR_IDS])
    expect(solidInLiquid.map((t) => t.id)).toEqual([...SOLID_TUBE_IDS])
    expect(offBench.map((o) => `${o.kind}: ${o.id}`)).toEqual(['pair: rubbing-alcohol+mineral-oil', 'solid-in-liquid: salt-in-rubbing-alcohol', 'solid-in-liquid: sugar-in-rubbing-alcohol'])
    for (const left of offBench) expect(left.rationale, left.id).toMatch(/^No source that was read says /)
    expect(pairs.length + offBench.filter((o) => o.kind === 'pair').length).toBe(10)
    expect(solidInLiquid.length + offBench.filter((o) => o.kind === 'solid-in-liquid').length).toBe(10)
    expect(PAIR_IDS.every(isPairId) && SOLID_TUBE_IDS.every(isSolidTubeId) && !isPairId('salt-in-water') && !isSolidTubeId('water+vinegar')).toBe(true)
  })

  it('gives each pair and each solid in a liquid the outcome its sources give', () => {
    expect(Object.fromEntries(pairs.map((p) => [p.id, p.mix.value]))).toEqual({
      'water+rubbing-alcohol': true,
      'water+vinegar': true,
      'water+vegetable-oil': false,
      'water+mineral-oil': false,
      'rubbing-alcohol+vinegar': true,
      'rubbing-alcohol+vegetable-oil': false,
      'vinegar+vegetable-oil': false,
      'vinegar+mineral-oil': false,
      'vegetable-oil+mineral-oil': true,
    })
    expect(Object.fromEntries(solidInLiquid.map((t) => [t.id, t.dissolves.value]))).toEqual({
      'salt-in-water': true,
      'salt-in-vinegar': true,
      'salt-in-vegetable-oil': false,
      'salt-in-mineral-oil': false,
      'sugar-in-water': true,
      'sugar-in-vinegar': true,
      'sugar-in-vegetable-oil': false,
      'sugar-in-mineral-oil': false,
    })
  })

  it('gives every outcome a source and the reason it applies, and says of each that rests on a rule for a family that it does (spec 25.5)', () => {
    for (const [id, outcome] of [...pairs.map((p) => [p.id, p.mix] as const), ...solidInLiquid.map((t) => [t.id, t.dissolves] as const)]) {
      expect(sources.some((s) => s.id === outcome.sourceId), id).toBe(true)
      expect(words(outcome.reason), id).toBeGreaterThan(10)
    }
    expect(pairs.filter((p) => p.mix.basis === 'general').map((p) => p.id)).toEqual(['rubbing-alcohol+vinegar', 'rubbing-alcohol+vegetable-oil', 'vinegar+mineral-oil', 'vegetable-oil+mineral-oil'])
    expect(solidInLiquid.filter((t) => t.dissolves.basis === 'named').map((t) => t.id)).toEqual(['salt-in-water', 'sugar-in-water'])
    // The two that name no source for their own pair say so in as many words.
    for (const id of ['rubbing-alcohol+vinegar', 'vegetable-oil+mineral-oil'] as const) expect(pairs.find((p) => p.id === id)!.mix.reason).toMatch(/^No source that was read names this pair\./)
    // The pair that rests on a handout for a stronger alcohol says so, and takes which is on top from the densities.
    expect(pairs.find((p) => p.id === 'rubbing-alcohol+vegetable-oil')!.mix.reason).toMatch(/75% or more.*about 70%.*stored densities/s)
  })

  it('stores each density with the figure its source prints, its unit and the temperature the source gives, or that it gives none', () => {
    expect(liquids.map((l) => `${l.id} ${l.density.published} ${l.density.unit} at ${l.density.temperature} (${l.density.sourceId})`)).toEqual([
      'water 0.99821 g/mL at 20 °C (nist-webbook-water-20c)',
      'rubbing-alcohol 0.87 g/mL at null (flinn-sds-420.5)',
      'vinegar 1.01 g/mL at null (flinn-sds-844)',
      'vegetable-oil 0.923 g/mL at 25 °C (noaa-cameo-18022)',
      'mineral-oil 0.822 g/mL at 20 °C (noaa-cameo-12191)',
    ])
    for (const liquid of liquids) {
      expect(Number(liquid.density.published), liquid.id).toBe(liquid.density.value)
      if (liquid.density.temperature === null) expect(liquid.density.note, liquid.id).toMatch(/prints no temperature/)
    }
  })

  it('sorts water, the rubbing alcohol and vinegar with water and the two oils with oil, each with a source and a reason', () => {
    expect(liquids.map((l) => `${l.id}: ${l.family.value}`)).toEqual(['water: water', 'rubbing-alcohol: water', 'vinegar: water', 'vegetable-oil: oil', 'mineral-oil: oil'])
    for (const liquid of liquids) expect(words(liquid.family.reason), liquid.id).toBeGreaterThan(10)
    // The rubbing alcohol's reason is honest about its oily part, and the note of part 3 says it to the learner.
    expect(liquidOf(mixingData, 'rubbing-alcohol').family.reason).toMatch(/dissolves many oils/)
    expect(parts[2].notes[1]!.value).toMatch(/oily part/)
  })

  it('links water, vinegar and sugar to molecules the library holds, and the other four things to none (spec 25.2)', () => {
    expect([...liquids, ...solids].map((item) => `${item.id}: ${item.moleculeId ?? 'none'}`)).toEqual(['water: water', 'rubbing-alcohol: none', 'vinegar: acetic-acid', 'vegetable-oil: none', 'mineral-oil: none', 'salt: none', 'sugar: sucrose'])
    for (const item of [...liquids, ...solids]) if (item.moleculeId !== undefined) expect(LIBRARY_INDEX.some((entry) => entry.id === item.moleculeId), item.id).toBe(true)
  })

  it('has two questions for part 3, each with two choices and an answer among them', () => {
    expect(rule.questions.map((q) => `${q.id}: ${q.choices.join(' / ')} -> ${q.answer.value}`)).toEqual(['grease: mixes / stays-apart -> stays-apart', 'epsom-salt: dissolves / stays-solid -> stays-solid'])
    expect(rule.questions.map((q) => q.id)).toEqual([...QUESTION_IDS])
  })

  it("gives the rubbing alcohol the one hazards record, and everything else the red cabbage pH lab's note for foods, word for word", () => {
    expect(reagents.map((r) => r.id)).toEqual(['rubbing-alcohol'])
    expect(liquids.filter((l) => reagentOf(mixingData, l)).map((l) => l.id)).toEqual(['rubbing-alcohol'])
    expect(reagentOf(mixingData, solidOf(mixingData, 'salt') as { reagentId?: string })).toBeUndefined()
    expect(mixingData.sharedNote.value).toBe(cabbageData.sharedNote.value)
    expect(mixingData.sharedNote.rationale).not.toBe(cabbageData.sharedNote.rationale)
  })

  it('keeps the hazard note to three short paragraphs of 160 words at most, the last of which gives no method of disposal (spec 5.2)', () => {
    const note = reagents[0]!.hazards.note.value
    expect(note.split('\n\n')).toHaveLength(3)
    expect(words(note)).toBeLessThanOrEqual(160)
    expect(note.split('\n\n')[2]).toBe("How any of it is disposed of is decided by the laboratory's own rules and by local regulations; ask the laboratory's supervisor.")
    expect(reagents[0]!.hazards.statements.map((s) => s.split(':')[0])).toEqual(['H225', 'H316', 'H319', 'H336'])
  })

  it('writes short notes for a learner, and names no maker, supplier or site in them', () => {
    for (const text of shown) {
      expect(words(text), text).toBeLessThanOrEqual(40)
      expect(text, text).not.toMatch(BRANDS)
    }
    for (const liquid of liquids) expect(`${liquid.name} ${liquid.holds}`).not.toMatch(BRANDS)
  })

  it('says what a tube showed and what it means only in its note, which names what was seen first', () => {
    for (const pair of pairs) expect(pair.note.value, pair.id).toMatch(pair.mix.value ? /^One layer/ : /^Two layers/)
    for (const tube of solidInLiquid) expect(tube.note.value, tube.id).toMatch(tube.dissolves.value ? /^(Dissolved|The \w+ is gone from sight)/ : /^The (salt|sugar) sits at the bottom/)
  })

  it('keeps the counts that finish parts 1 and 2 within what the bench has', () => {
    expect([parameters.neededPairs.value, parameters.neededSolids.value]).toEqual([6, 6])
    expect(parameters.lessMicrolitres.value).toBeLessThan(parameters.moreMicrolitres.value)
  })
})

describe('the sources of a tube and of a part', () => {
  const ids = (list: ReturnType<typeof mixingTubeCitations>) => list.map((c) => c.source.id)

  it('lists nothing before a tube counts but the documents behind the hazards of a bottle in it, so no source names an answer (spec 25.5)', () => {
    for (const tubeId of [...PAIR_IDS, ...SOLID_TUBE_IDS]) {
      const before = ids(mixingTubeCitations(mixingData, tubeId, sources))
      expect(before, tubeId).toEqual(tubeId.includes('rubbing-alcohol') ? ['flinn-sds-420.5', 'noaa-cameo-946'] : [])
    }
  })

  it('lists, once a tube counts, what each thing looks like, the densities of a pair, what the outcome rests on and the note', () => {
    const pair = mixingTubeCitations(mixingData, 'water+vegetable-oil', sources, true)
    expect(ids(pair)).toEqual(['nist-webbook-water-20c', 'noaa-cameo-18022', 'uaf-liquid-layers', 'ck12-liquid-liquid-solutions'])
    expect(pair.find((c) => c.source.id === 'noaa-cameo-18022')!.covers).toEqual(['Vegetable oil: what it looks like', 'Vegetable oil: its density', 'Whether the two liquids mix', 'Notes on this tube'])
    const solid = mixingTubeCitations(mixingData, 'sugar-in-vinegar', sources, true)
    expect(ids(solid)).toEqual(['flinn-sds-844', 'flinn-sds-789'])
    expect(solid.flatMap((c) => c.covers)).not.toContain('Vinegar: its density')
    // Every source the record cites for a tube is listed for it once it counts.
    for (const p of pairs) expect(ids(mixingTubeCitations(mixingData, p.id, sources, true)), p.id).toContain(p.mix.sourceId)
    for (const t of solidInLiquid) expect(ids(mixingTubeCitations(mixingData, t.id, sources, true)), t.id).toContain(t.dissolves.sourceId)
    expect(() => mixingTubeCitations(mixingData, 'rubbing-alcohol+mineral-oil' as 'water+vinegar', sources)).toThrow()
  })

  it("lists for a part, before it is done, only the rubbing alcohol's hazards; and then its notes and, for part 3, the families and the two answers", () => {
    for (const partId of PART_IDS) expect(ids(mixingPartCitations(mixingData, partId, sources)), partId).toEqual(['flinn-sds-420.5', 'noaa-cameo-946'])
    const ruleDone = mixingPartCitations(mixingData, 'rule', sources, true)
    expect(ruleDone.flatMap((c) => c.covers).filter((label) => label.endsWith(': its family'))).toHaveLength(9)
    expect(ruleDone.flatMap((c) => c.covers)).toContain('The two questions')
    expect(mixingPartCitations(mixingData, 'liquids', sources, true).flatMap((c) => c.covers)).not.toContain('Distilled water: its family')
  })
})

describe('validateMixing', () => {
  it('refuses a record whose ids do not hold together', () => {
    expect(errorsWith((d) => (d.liquids[1]!.reagentId = 'no-such-bottle')).join()).toMatch(/unknown reagent/)
    expect(errorsWith((d) => (d.pairs[0]!.liquidIds = ['water', 'vinegar'])).join()).toMatch(/named by its two liquids/)
    expect(errorsWith((d) => (d.solidInLiquid[0]!.liquidId = 'vinegar')).join()).toMatch(/it is named "salt-in-vinegar"/)
    expect(errorsWith((d) => (d.rule.questions[0]!.answer.value = 'floats')).join()).toMatch(/not one of its choices/)
    expect(errorsWith((d) => (d.parameters.neededPairs.value = 10)).join()).toMatch(/more than the bench has pairs/)
    expect(errorsWith((d) => (d.parameters.neededSolids.value = 9)).join()).toMatch(/more than the bench has solids/)
    expect(errorsWith((d) => (d.parameters.lessMicrolitres.value = 3000)).join()).toMatch(/lesser amount/)
  })

  it('refuses a source that does not exist, a published figure that is not the number beside it, and institution text', () => {
    expect(errorsWith((d) => (d.pairs[0]!.mix.sourceId = 'no-such-source')).join()).toMatch(/no-such-source/)
    expect(errorsWith((d) => (d.liquids[0]!.density.published = '0.998')).join()).toMatch(/published/)
    expect(errorsWith((d) => (d.pairs[0]!.note.value = 'See the bottle in room 214.')).join()).not.toBe('')
  })

  it('never throws, whatever it is given', () => {
    for (const input of [null, undefined, 3, 'x', [], {}]) expect(validateMixing(input, sources)).not.toEqual([])
  })
})
