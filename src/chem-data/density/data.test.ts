import { describe, expect, it } from 'vitest'
import authored from '../../../docs/research/density/density.json'
import ownHazards from '../../../docs/research/density/hazards.json'
import sources from '../sources.json'
import { validateDensity } from '../validate'
import { densityCitations } from '../citations'
import { candidatesOf, densityData, densitySchema, INSTRUMENT_IDS, PART_IDS, unknownsOf, type DensityData } from './data'
import stored from './density.json'

const local = import.meta.glob<string[]>('../denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

const copy = (): DensityData => JSON.parse(JSON.stringify(stored))
const errorsWith = (edit: (data: DensityData) => void) => {
  const data = copy()
  edit(data)
  return validateDensity(data, sources).join('\n')
}
const words = (text: string) => text.split(/\s+/).length

describe('densityData', () => {
  it('is the generated file, with nothing dropped or added by the schema', () => {
    expect(densityData).toEqual(stored)
    expect(densitySchema.safeParse({ ...stored, extra: 1 }).success).toBe(false)
  })

  it('passes validation against the stored sources', () => {
    expect(validateDensity(stored, sources, { institutionNames })).toEqual([])
  })

  it("is the authored record with each reagent's hazards merged in from this lab's own file, and nothing else changed", () => {
    const { reagents, ...rest } = stored
    const { reagents: authoredReagents, ...authoredRest } = authored
    expect(rest).toEqual(authoredRest)
    expect(reagents.map((r) => Object.fromEntries(Object.entries(r).filter(([key]) => key !== 'classifiedAs' && key !== 'hazards')))).toEqual(authoredReagents)
    expect(Object.fromEntries(reagents.map((r) => [r.id, { classifiedAs: r.classifiedAs, hazards: r.hazards }]))).toEqual(ownHazards)
  })

  it('holds the three parts of spec 22.1 and the five things an unknown may be: two liquids and three metals', () => {
    expect(densityData.parts.map((p) => `${p.id} | ${p.name}`)).toEqual(['reading | Reading instruments', 'liquid | The density of a liquid', 'metal | The density of a metal'])
    expect(densityData.parts.map((p) => p.id)).toEqual([...PART_IDS])
    expect(densityData.reagents.map((r) => `${r.id} | ${r.name} | ${r.formula} | ${r.form} | ${r.tableId}`)).toEqual([
      'ethanol-95 | Ethanol, 95% | C₂H₅OH | liquid | ethanol-95',
      'nacl-20 | Sodium chloride solution, 20% | NaCl | solution | nacl-20',
      'aluminium-pieces | Aluminium | Al | metal | aluminium',
      'zinc-pieces | Zinc | Zn | metal | zinc',
      'copper-pieces | Copper | Cu | metal | copper',
    ])
    expect(unknownsOf(densityData, 'liquid').map((r) => r.id)).toEqual(['ethanol-95', 'nacl-20'])
    expect(unknownsOf(densityData, 'metal').map((r) => r.id)).toEqual(['aluminium-pieces', 'zinc-pieces', 'copper-pieces'])
  })

  it('has the table of liquids: each density at 20 °C, its strength by mass, the figure its source prints and the three figures stored', () => {
    expect(candidatesOf(densityData, 'liquid').map((l) => `${l.name} | ${'strength' in l ? l.strength : ''} | ${l.temperature} | ${l.printed.published} ${l.printed.unit} | ${l.printed.sourceId} | ${l.density.value.toPrecision(3)} ${l.density.unit}`)).toEqual([
      'Ethanol, 95% | 95% ethanol by mass, in water | 20 °C | 0.80567 relative to water at 20 °C | lange-ethanol-wikipedia | 0.804 g/mL',
      'Ethanol, 50% | 50% ethanol by mass, in water | 20 °C | 0.91546 relative to water at 20 °C | lange-ethanol-wikipedia | 0.914 g/mL',
      'Water |  | 20 °C | 0.99821 g/mL | nist-webbook-water-20c | 0.998 g/mL',
      'Sodium chloride solution, 10% | 10% sodium chloride by mass, in water | 20 °C | 1.0707 g/cm³ | crc-nacl-solutions-wikipedia | 1.07 g/mL',
      'Sodium chloride solution, 20% | 20% sodium chloride by mass, in water | 20 °C | 1.1478 g/cm³ | crc-nacl-solutions-wikipedia | 1.15 g/mL',
    ])
    expect(densityData.water.density).toMatchObject({ value: 0.99821, published: '0.99821', unit: 'g/mL', temperature: '20 °C', sourceId: 'nist-webbook-water-20c' })
  })

  it('has the table of metals: the three an unknown may be and iron, each density as the handbook transcription has it, near room temperature', () => {
    expect(candidatesOf(densityData, 'metal').map((m) => `${m.name} | ${'formula' in m ? m.formula : ''} | ${m.temperature} | ${m.printed.published} ${m.printed.unit} | ${m.printed.sourceId} | ${m.density.value.toPrecision(3)} ${m.density.unit}`)).toEqual([
      'Aluminium | Al | near room temperature | 2.70 g/cm³ | handbook-densities-wikipedia | 2.70 g/mL',
      'Zinc | Zn | near room temperature | 7.14 g/cm³ | handbook-densities-wikipedia | 7.14 g/mL',
      'Iron | Fe | near room temperature | 7.87 g/cm³ | handbook-densities-wikipedia | 7.87 g/mL',
      'Copper | Cu | near room temperature | 8.96 g/cm³ | handbook-densities-wikipedia | 8.96 g/mL',
    ])
    expect(densityData.parts[2].unknownIds).toEqual(['aluminium', 'zinc', 'copper'])
  })

  it('names an unknown and says how it looks without saying which it is', () => {
    const [, liquid, metal] = densityData.parts
    expect(liquid.unknown).toEqual({ name: 'Unknown liquid', appearance: 'a clear, colourless liquid' })
    expect(metal.unknown).toEqual({ name: 'Unknown metal', appearance: 'small pieces of metal' })
    for (const row of [...densityData.liquids, ...densityData.metals]) for (const part of [liquid, metal]) expect(`${part.unknown.name} ${part.unknown.appearance}`.toLowerCase()).not.toContain(row.name.toLowerCase().split(',')[0])
  })

  it('sets out the five instruments of spec 22.1, each read to one figure beyond its finest mark, and the balance to every figure it shows', () => {
    expect(densityData.instruments.map((i) => i.id)).toEqual([...INSTRUMENT_IDS])
    expect(densityData.instruments.map((i) => `${i.id}: marked each ${i.markEvery} ${i.unit}, read to ${i.decimals} decimal places, ${i.estimated ? 'estimated' : 'shown'}`)).toEqual([
      'ruler-cm: marked each 1 cm, read to 1 decimal places, estimated',
      'ruler-mm: marked each 0.1 cm, read to 2 decimal places, estimated',
      'cylinder: marked each 1 mL, read to 1 decimal places, estimated',
      'thermometer: marked each 1 °C, read to 1 decimal places, estimated',
      'balance: marked each 0.01 g, read to 2 decimal places, shown',
    ])
    // One figure beyond the finest mark: a tenth of the smallest division.
    for (const i of densityData.instruments) if (i.estimated) expect(10 ** -i.decimals, i.id).toBeCloseTo(i.markEvery / 10, 9)
  })

  it('takes ice and water together to be at 0.0 °C, from the melting point of ice its source prints', () => {
    expect(densityData.constants.icePoint).toMatchObject({ value: 0.0001, published: '0.0001', unit: '°C', sourceId: 'wikipedia-celsius' })
    expect(Math.round(densityData.constants.icePoint.value * 10)).toBe(0)
  })

  it('gives every parameter a rationale, and every range runs upward', () => {
    for (const [name, parameter] of Object.entries(densityData.parameters)) {
      expect(parameter.rationale.length, name).toBeGreaterThan(40)
      if (Array.isArray(parameter.value)) expect(parameter.value[0], name).toBeLessThanOrEqual(parameter.value[1])
    }
    expect(Object.fromEntries(Object.entries(densityData.parameters).map(([name, p]) => [name, p.value]))).toEqual({
      readingAllowance: 2,
      eyeShiftTenthMl: 5,
      tolerancePercent: 3,
      noteLengthRangeE2: [1200, 1549],
      noteWidthRangeE2: [400, 589],
      firstVolumeRangeTenthMl: [150, 450],
      thermometerOffRangeTenths: [3, 8],
      firstMassRangeCg: [1500, 9500],
      emptyCylinderRangeCg: [6000, 9500],
      liquidRangeTenthMl: [200, 450],
      waterRangeTenthMl: [200, 270],
      piecesRangeTenthMl: [150, 200],
      wetWaterRangeCg: [60, 120],
      splashRangeTenthMl: [8, 15],
    })
  })

  it('keeps every note short: a part has two or three, none over 75 words', () => {
    for (const part of densityData.parts) {
      expect(part.notes.length, part.id).toBeGreaterThanOrEqual(2)
      expect(part.notes.length, part.id).toBeLessThanOrEqual(3)
      for (const note of part.notes) expect(words(note.value), note.value.slice(0, 40)).toBeLessThanOrEqual(75)
    }
  })
})

describe("the hazards of what an unknown may be (spec 5.2)", () => {
  const DISPOSAL = "How any of it is disposed of is decided by the laboratory's own rules and by local regulations; ask the laboratory's supervisor."

  it('carries the signal word and the statements of the default supplier’s sheet for each', () => {
    expect(densityData.reagents.map((r) => `${r.id}: ${r.hazards.signalWord}, ${r.hazards.statements.length} statements, ${r.hazards.sourceId}`)).toEqual([
      'ethanol-95: Danger, 5 statements, flinn-sds-326',
      'nacl-20: Warning, 1 statements, flinn-sds-721',
      'aluminium-pieces: None, 0 statements, flinn-sds-34',
      'zinc-pieces: None, 0 statements, flinn-sds-859',
      'copper-pieces: None, 0 statements, flinn-sds-265',
    ])
    expect(densityData.reagents[0]!.hazards.statements[0]).toBe('H225: Highly flammable liquid and vapor')
  })

  it('writes each note in three short paragraphs of 160 words at most: the bench and the default sheet, what is stricter, and disposal left to the laboratory', () => {
    for (const r of densityData.reagents) {
      const paragraphs = r.hazards.note.value.split('\n\n')
      expect(paragraphs.length, r.id).toBe(3)
      expect(words(r.hazards.note.value), r.id).toBeLessThanOrEqual(160)
      expect(paragraphs[1], r.id).toMatch(/^Stricter, and what this lab goes by: /)
      expect(paragraphs[2], r.id).toBe(DISPOSAL)
    }
  })

  it('says of each that the unknown may be it, never that it is, so that every tile can be shown before the unknown is named', () => {
    for (const r of densityData.reagents) expect(r.hazards.note.value, r.id).toMatch(r.form === 'metal' ? /^The unknown metal may be this: dry pieces of / : /^The unknown liquid may be this: /)
  })

  it('carries in no note a figure the bench can show that the notes of the other things the unknown may be do not: the balance, the cylinder and the tiles together name nothing', () => {
    // A number, or a range of numbers, with a unit one of the bench's instruments reads. Every tile can be opened before the unknown is named, and the pieces of each metal weigh a different range of grams: a note that gave its own would name the metal from the balance.
    const BENCH_FIGURE = /\d[\d.,]*(?:\s*(?:to|and|or|-|–)\s*\d[\d.,]*)?\s*(?:g\/mL|g\/cm³|mL|cm³|cm|mm|°C|g|grams?|millilitres?|centimetres?|degrees?)(?![\p{L}/])/gu
    const figures = (note: string) => (note.match(BENCH_FIGURE) ?? []).map((figure) => figure.replace(/\s+/g, ' '))
    expect(figures('pieces of 40 to 54 g, in 15.0 mL at 20 °C')).toEqual(['40 to 54 g', '15.0 mL', '20 °C'])
    expect(figures('95% by mass; 20 to 30 minutes; 15 minutes or more')).toEqual([])
    for (const part of ['liquid', 'metal'] as const) {
      const [first, ...others] = unknownsOf(densityData, part).map((r) => ({ id: r.id, figures: figures(r.hazards.note.value) }))
      for (const other of others) expect(other.figures, `${other.id} against ${first!.id}`).toEqual(first!.figures)
    }
    // The metals' notes carry none at all, and no note an amount in grams.
    for (const r of unknownsOf(densityData, 'metal')) expect(figures(r.hazards.note.value), r.id).toEqual([])
    for (const r of densityData.reagents) expect(r.hazards.note.value, r.id).not.toMatch(/\d\s*(?:g|grams?)(?![\p{L}/])/u)
  })

  it('gives no method of disposal, and names no supplier in what a learner reads', () => {
    for (const r of densityData.reagents) {
      expect(`${r.classifiedAs} ${r.hazards.note.value}`, r.id).not.toMatch(/Flinn|Fisher|Ward|Avantor|drain it|pour it|flush it down|in the trash/i)
    }
  })
})

describe('validateDensity', () => {
  it('refuses an unknown that is no candidate or no reagent, a reagent that is no unknown, and ids used twice', () => {
    expect(errorsWith((d) => d.parts[1].unknownIds.push('water'))).toContain('the unknown "water" is no reagent of the record')
    expect(errorsWith((d) => (d.parts[2].candidateIds = ['aluminium', 'zinc', 'iron']))).toContain('the unknown "copper" is not a candidate')
    expect(errorsWith((d) => d.parts[2].candidateIds.push('tin'))).toContain('the candidate "tin" is no row of its table')
    expect(errorsWith((d) => (d.reagents[0]!.tableId = 'ethanol-50'))).toContain('reagent "ethanol-95": it is no unknown of a part')
    expect(errorsWith((d) => d.metals.push(d.metals[0]!))).toContain('metals')
  })

  it('refuses a published figure that is not the number beside it, an unknown source, and a range that runs downward', () => {
    expect(errorsWith((d) => (d.liquids[0]!.printed.published = '0.8057'))).not.toBe('')
    expect(errorsWith((d) => (d.metals[0]!.printed.sourceId = 'no-such-source'))).toContain('no-such-source')
    expect(errorsWith((d) => (d.parameters.liquidRangeTenthMl.value = [450, 200]))).toContain('a range runs from its lower end to its upper')
  })
})

describe('densityCitations', () => {
  it('lists for part 1 the melting point of ice and the notes’ sources', () => {
    expect(densityCitations(densityData, 'reading', sources).map((c) => c.source.id)).toEqual(['wikipedia-celsius', 'purdue-significant-figures', 'wikipedia-significant-figures', 'wikipedia-thermometer'])
  })

  it('lists for an unknown every row of its table and every thing it may be, whichever it is', () => {
    const liquid = densityCitations(densityData, 'liquid', sources)
    expect(liquid.map((c) => c.source.id)).toEqual(['lange-ethanol-wikipedia', 'nist-webbook-water-20c', 'crc-nacl-solutions-wikipedia', 'flinn-sds-326', 'noaa-cameo-667', 'flinn-sds-722', 'flinn-sds-721', 'fisher-sds-nacl', 'wards-sds-ss0450', 'wikipedia-density'])
    const metal = densityCitations(densityData, 'metal', sources)
    expect(metal.find((c) => c.source.id === 'handbook-densities-wikipedia')!.covers).toEqual(['Aluminium: density at near room temperature', 'Zinc: density at near room temperature', 'Iron: density at near room temperature', 'Copper: density at near room temperature', 'Notes on this part'])
    for (const id of ['flinn-sds-34', 'flinn-sds-859', 'flinn-sds-265', 'noaa-cameo-16146']) expect(metal.some((c) => c.source.id === id), id).toBe(true)
  })
})
