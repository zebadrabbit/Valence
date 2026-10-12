import { describe, expect, it } from 'vitest'
import authored from '../../../docs/research/cabbage/cabbage.json'
import hazards from '../../../docs/research/cabbage/hazards.json'
import { cabbageScaleCitations, cabbageThingCitations } from '../citations'
import sources from '../sources.json'
import { validateCabbage } from '../validate'
import stored from './cabbage.json'
import { cabbageData, cabbageSchema, PART_IDS, reagentOf, SCALE_QUESTION_IDS, THING_IDS, thingOf, type CabbageData } from './data'

const local = import.meta.glob<string[]>('../denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

const copy = (): CabbageData => JSON.parse(JSON.stringify(stored))
const errorsWith = (edit: (data: CabbageData) => void) => {
  const data = copy()
  edit(data)
  return validateCabbage(data, sources, { institutionNames })
}
const words = (text: string) => text.split(/\s+/).length
/** The makers and suppliers whose documents the record rests on: none is named in anything a learner sees. */
const BRANDS = /alconox|drano|juuce|kms|kao|rivacol|orajel|flinn|fisher|livingstone|johnson|vernier|labquest/i
const { indicator, things, parameters, reagents, scale } = cabbageData

describe('cabbageData', () => {
  it('is the generated file, with nothing dropped or added by the schema', () => {
    expect(cabbageSchema.parse(stored)).toEqual(stored)
    expect(cabbageData).toEqual(stored)
  })

  it('passes validation against the stored sources', () => {
    expect(validateCabbage(stored, sources, { institutionNames })).toEqual([])
  })

  it("is the authored record with each bottle's hazards merged in, and nothing else changed", () => {
    expect({ ...stored, reagents: stored.reagents.map(({ id, name, holds, form }) => ({ id, name, holds, form })) }).toEqual(authored)
    expect(Object.fromEntries(stored.reagents.map((r) => [r.id, { classifiedAs: r.classifiedAs, hazards: r.hazards }]))).toEqual(hazards)
  })

  it('holds the seven laboratory chemicals of spec 21.4, thirteen buffers and the three parts', () => {
    expect(reagents.map((r) => r.id)).toEqual(['buffer-ph1', 'buffer-ph13', 'indicator', 'ammonia', 'bleach', 'drain-cleaner', 'lab-detergent'])
    expect(scale.buffers.map((b) => b.ph)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])
    expect(scale.buffers.filter((b) => b.reagentId).map((b) => [b.ph, reagentOf(cabbageData, b)!.name])).toEqual([[1, 'Buffer solution, pH 1'], [13, 'Buffer solution, pH 13']])
    expect(scale.questions.map((q) => q.id)).toEqual([...SCALE_QUESTION_IDS])
    expect(cabbageData.parts.map((p) => p.id)).toEqual([...PART_IDS])
  })

  it('holds fourteen household things, named for what they are: buffered aspirin is left off for want of a source', () => {
    expect(things.map((t) => t.id)).toEqual([...THING_IDS])
    expect(things.map((t) => t.name)).toEqual(['Vinegar', 'Lemon juice', 'Apple juice', 'Household ammonia', 'Shampoo', 'Hair conditioner', 'Laundry detergent', 'Laboratory detergent', 'Mouthwash', 'Antacid tablet', 'Aspirin', 'Bleach', 'Drain cleaner', 'Epsom salt'])
    expect(parameters.neededToCount.value).toBe(8)
    expect(things.filter((t) => t.reagentId).map((t) => [t.id, reagentOf(cabbageData, t)!.id])).toEqual([['ammonia', 'ammonia'], ['lab-detergent', 'lab-detergent'], ['bleach', 'bleach'], ['drain-cleaner', 'drain-cleaner']])
    expect(() => thingOf(cabbageData, 'buffered-aspirin' as never)).toThrow('no thing')
  })

  it('names no maker and no supplier in anything a learner sees', () => {
    const seen = [...reagents.flatMap((r) => [r.name, r.holds, r.classifiedAs, r.hazards.note.value]), ...things.flatMap((t) => [t.name, t.note.value]), cabbageData.sharedNote.value, indicator.note.value, ...cabbageData.parts.flatMap((p) => [p.name, ...p.notes.map((n) => n.value)])]
    for (const text of seen) expect(text).not.toMatch(BRANDS)
  })
})

describe("the indicator's colours (spec 21.3)", () => {
  it('are the twelve its sources name, from pH 1 to pH 13, with one colour for pH 11 and pH 12', () => {
    expect(indicator.colours.map((c) => `${c.from === c.to ? c.from : `${c.from}-${c.to}`} ${c.colour}`)).toEqual(['1 red', '2 dark pink', '3 rose', '4 lavender', '5 purple', '6 blue-violet', '7 dark blue', '8 blue', '9 teal', '10 emerald', '11-12 greenish-yellow', '13 yellow'])
  })

  it("take ten from the supplier's figure for red cabbage and the two ends from a table for the dyes of its family", () => {
    expect(indicator.colours.filter((c) => c.sourceId === 'libretexts-indicators-in-foods').map((c) => c.colour)).toEqual(['red', 'yellow'])
    expect(indicator.colours.filter((c) => c.sourceId === 'flinn-pub-91633')).toHaveLength(10)
    expect(indicator.note.value).toMatch(/model’s own/)
  })

  it("have edges that are the model's own and say so, half way between two pH values but for the last", () => {
    const edges = parameters.colourEdgesTenths
    expect(edges.value).toEqual([15, 25, 35, 45, 55, 65, 75, 85, 95, 105, 120])
    expect(edges.rationale).toMatch(/model's own/)
    expect(edges.rationale).toMatch(/above 12\.0/)
  })

  it('is colourless where the dye is destroyed, by a source', () => {
    expect(indicator.bleached).toEqual({ value: 'colourless', sourceId: 'flinn-pub-91633' })
    expect(things.filter((t) => t.bleaches).map((t) => t.id)).toEqual(['bleach'])
  })
})

describe('the pH of each thing (spec 21.4)', () => {
  const range = (id: string) => {
    const { ph } = things.find((t) => t.id === id)!
    return `${ph.basis === 'document' ? `${ph.low.published} to ${ph.high.published}` : `${ph.low.value} to ${ph.high.value}`} (${ph.basis})`
  }

  it('is a range from a document, with its digits, or is worked out and says so', () => {
    expect(Object.fromEntries(THING_IDS.map((id) => [id, range(id)]))).toEqual({
      vinegar: '2.40 to 3.40 (document)',
      'lemon-juice': '2.00 to 2.60 (document)',
      'apple-juice': '3.35 to 4.00 (document)',
      ammonia: '11.2 to 11.4 (arithmetic)',
      shampoo: '5.50 to 6.80 (document)',
      conditioner: '3.5 to 3.5 (document)',
      'laundry-detergent': '9.5 to 10.5 (document)',
      'lab-detergent': '9.5 to 9.5 (document)',
      mouthwash: '6.0 to 8.0 (document)',
      antacid: '7 to 9 (document)',
      aspirin: '3.5 to 3.5 (document)',
      bleach: '9.6 to 9.8 (arithmetic)',
      'drain-cleaner': '12.1 to 12.8 (arithmetic)',
      'epsom-salt': '5 to 8.2 (document)',
    })
  })

  it('takes the vinegar and the juices from a food regulator, and names what each other figure is given for', () => {
    for (const id of ['vinegar', 'lemon-juice', 'apple-juice'] as const) {
      const { ph } = thingOf(cabbageData, id)
      expect(ph.basis === 'document' && ph.low.sourceId).toBe('fda-ph-foods-2007')
    }
    for (const thing of things) if (thing.ph.basis === 'document') expect(thing.ph.givenFor.length).toBeGreaterThan(5)
  })

  it('says of lemon juice that its range is the lowest on the bench, which is so, and not that it reads lowest, which a seed may not bear out', () => {
    const lemon = thingOf(cabbageData, 'lemon-juice')
    for (const thing of cabbageData.things) {
      if (thing.id === 'lemon-juice') continue
      expect(thing.ph.low.value, thing.id).toBeGreaterThan(lemon.ph.low.value)
      expect(thing.ph.high.value, thing.id).toBeGreaterThan(lemon.ph.high.value)
    }
    // The vinegar's range reaches under the top of the lemon juice's: in some labs the meter reads the vinegar lower.
    expect(thingOf(cabbageData, 'vinegar').ph.low.value).toBeLessThan(lemon.ph.high.value)
    expect(lemon.note.value).toContain('the lowest range')
    expect(lemon.note.value).not.toContain('most acidic')
  })

  it('says in the note of each thing that is worked out that it is, and shows the working', () => {
    for (const thing of things) {
      if (thing.ph.basis !== 'arithmetic') continue
      expect(thing.note.value).toMatch(/worked out, not measured/i)
      expect(thing.ph.low.working).toMatch(/one part in (20|100)/)
    }
  })

  it('says of the drain cleaner that it is taken as sodium hydroxide alone, and that a maker’s holds bleach', () => {
    expect(thingOf(cabbageData, 'drain-cleaner').note.value).toMatch(/sodium hydroxide in water alone/)
    expect(thingOf(cabbageData, 'drain-cleaner').note.value).toMatch(/also holds bleach/)
    // The conditioner's figure and the shampoo's are from two makers' sheets: its note sets it beside no other thing, and so says nothing of a thing not yet measured.
    expect(thingOf(cabbageData, 'conditioner').note.value).not.toMatch(/shampoo|more acidic|than/i)
  })

  it("marks what each thing looks like before the indicator goes in as the lab's own", () => {
    for (const thing of things) expect(thing.before.rationale).toMatch(/lab's own description/)
    expect(things.filter((t) => t.before.value.cloudy).map((t) => t.id)).toEqual(['lemon-juice', 'conditioner', 'antacid', 'aspirin'])
    expect(new Set(things.map((t) => t.before.value.liquid))).toEqual(new Set(['colourless', 'pale yellow', 'white']))
  })
})

describe('the notes', () => {
  it('are short: each thing’s of fifty words or fewer, each part’s of forty or fewer', () => {
    for (const thing of things) expect(words(thing.note.value), thing.id).toBeLessThanOrEqual(50)
    for (const part of cabbageData.parts) for (const note of part.notes) expect(words(note.value), part.id).toBeLessThanOrEqual(40)
  })

  it('share one note between the things with no record of their own: nothing is tasted, and the label gives the cautions', () => {
    expect(cabbageData.sharedNote.value).toMatch(/Nothing on a laboratory bench is tasted/)
    expect(cabbageData.sharedNote.value).toMatch(/maker’s own label/)
    expect(cabbageData.sharedNote.rationale).toMatch(/lab's own/)
  })

  it('keep each bottle’s hazard note to 160 words in three paragraphs, the last on disposal and never a procedure', () => {
    for (const reagent of reagents) {
      const paragraphs = reagent.hazards.note.value.split('\n\n')
      expect(paragraphs, reagent.id).toHaveLength(3)
      expect(words(reagent.hazards.note.value), reagent.id).toBeLessThanOrEqual(160)
      expect(paragraphs[2]).toBe("How any of it is disposed of is decided by the laboratory's own rules and by local regulations; ask the laboratory's supervisor.")
    }
  })

  it('give the indicator no signal word and bleach, ammonia, the drain cleaner and the two end buffers Danger', () => {
    expect(Object.fromEntries(reagents.map((r) => [r.id, r.hazards.signalWord]))).toEqual({ 'buffer-ph1': 'Danger', 'buffer-ph13': 'Danger', indicator: 'None', ammonia: 'Danger', bleach: 'Danger', 'drain-cleaner': 'Danger', 'lab-detergent': 'Warning' })
    expect(reagents.find((r) => r.id === 'bleach')!.hazards.note.value).toMatch(/chlorine/)
  })
})

describe('the parameters', () => {
  it('each have a value and a rationale that says what it is for', () => {
    for (const [key, parameter] of Object.entries(parameters)) expect(parameter.rationale.length, key).toBeGreaterThan(60)
  })

  it("say of the unrinsed probe that it is the model's own", () => {
    expect(parameters.unrinsedSharePercent.value).toBe(20)
    expect(parameters.unrinsedSharePercent.rationale).toMatch(/model's own, with no source/)
  })
})

describe('validateCabbage', () => {
  it('refuses a record whose ids do not hold together', () => {
    expect(errorsWith((d) => (d.things[3]!.reagentId = 'soap'))).toEqual(['thing "ammonia": unknown reagent "soap"'])
    expect(errorsWith((d) => (d.indicator.reagentId = 'litmus'))).toEqual(['indicator: "litmus" is not a bottle of the record'])
    expect(errorsWith((d) => d.parameters.colourEdgesTenths.value.pop())).toEqual(['parameters.colourEdgesTenths: one edge between each two neighbouring colours'])
  })

  it('refuses an unknown source, a figure that is not the number beside it, and a record of another shape', () => {
    expect(errorsWith((d) => (d.indicator.bleached.sourceId = 'nobody'))).toHaveLength(1)
    expect(errorsWith((d) => (d.constants.pKw.published = '13'))).toHaveLength(1)
    expect(errorsWith((d) => ((d.things[0] as { taste?: string }).taste = 'sour')).length).toBeGreaterThan(0)
    expect(validateCabbage(null, sources)).not.toEqual([])
  })
})

describe('the sources behind the scale and behind a thing (spec 5.1)', () => {
  it('lists every source a thing’s stored values cite, each once, and gives no pH in a label', () => {
    for (const id of THING_IDS) {
      const listed = cabbageThingCitations(cabbageData, id, sources)
      expect(listed.length, id).toBeGreaterThan(0)
      expect(new Set(listed.map((c) => c.source.id)).size).toBe(listed.length)
      for (const { covers } of listed) for (const label of covers) expect(label).not.toMatch(/\d/)
    }
    expect(cabbageThingCitations(cabbageData, 'bleach', sources).map((c) => c.source.id)).toEqual(['flinn-sds-736', 'libretexts-ph-scale', 'libretexts-e1-acid-constants', 'flinn-pub-91633', 'noaa-cameo-4503', 'libretexts-labquest-ph-sensor'])
  })

  it('lists the sources of the colours and of the three bottles of the scale, and names no colour', () => {
    const listed = cabbageScaleCitations(cabbageData, sources)
    expect(listed.map((c) => c.source.id)).toEqual(['libretexts-indicators-in-foods', 'flinn-pub-91633', 'flinn-sds-395', 'flinn-sds-395.2', 'flinn-sds-622', 'flinn-sds-734', 'flinn-sds-735.2', 'flinn-sds-665.8', 'libretexts-ph-scale'])
    for (const { covers } of listed) for (const label of covers) for (const colour of indicator.colours) expect(label).not.toContain(` ${colour.colour} `)
  })
})
