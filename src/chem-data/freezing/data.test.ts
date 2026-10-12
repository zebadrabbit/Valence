import { describe, expect, it } from 'vitest'
import authored from '../../../docs/research/freezing/freezing.json'
import ownHazards from '../../../docs/research/freezing/hazards.json'
import { freezingCitations } from '../citations'
import sources from '../sources.json'
import { validateFreezing } from '../validate'
import { candidatesOf, freezingData, freezingSchema, PART_IDS, solutesOf, type FreezingData } from './data'
import stored from './freezing.json'

const local = import.meta.glob<string[]>('../denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

const copy = (): FreezingData => JSON.parse(JSON.stringify(stored))
const errorsWith = (edit: (data: FreezingData) => void) => {
  const data = copy()
  edit(data)
  return validateFreezing(data, sources).join('\n')
}
const words = (text: string) => text.split(/\s+/).length

describe('freezingData', () => {
  it('is the generated file, with nothing dropped or added by the schema', () => {
    expect(freezingData).toEqual(stored)
    expect(freezingSchema.safeParse({ ...stored, extra: 1 }).success).toBe(false)
  })

  it('passes validation against the stored sources', () => {
    expect(validateFreezing(stored, sources, { institutionNames })).toEqual([])
  })

  it("is the authored record with each reagent's hazards merged in from this lab's own file, and nothing else changed", () => {
    const bare = (reagent: (typeof freezingData.reagents)[number]) => Object.fromEntries(Object.entries(reagent).filter(([key]) => key !== 'classifiedAs' && key !== 'hazards'))
    expect({ ...freezingData, reagents: freezingData.reagents.map(bare) }).toEqual(authored)
    for (const reagent of freezingData.reagents) expect({ classifiedAs: reagent.classifiedAs, hazards: reagent.hazards }, reagent.id).toEqual(ownHazards[reagent.id as keyof typeof ownHazards])
  })

  it('holds the three parts of spec 23.1, the three liquids the unknown may be, and urea and the three salts', () => {
    expect(freezingData.parts.map((part) => part.id)).toEqual([...PART_IDS])
    expect(candidatesOf(freezingData).map((r) => [r.id, r.name, r.form])).toEqual([['acetone', 'Acetone', 'liquid'], ['ethanol', 'Ethanol', 'liquid'], ['propan-2-ol', '2-Propanol', 'liquid']])
    expect(solutesOf(freezingData).map((r) => [r.id, r.name, r.form])).toEqual([['urea', 'Urea', 'solid'], ['nacl', 'Sodium chloride', 'solid'], ['kcl', 'Potassium chloride', 'solid'], ['nabr', 'Sodium bromide', 'solid']])
  })

  it('has the freezing point constant of water as its source prints it, 1.86, and the atomic weights as the periodic table has them', () => {
    expect(freezingData.water.freezingPointConstant).toMatchObject({ value: 1.86, published: '1.86', unit: '°C·kg/mol', sourceId: 'wikipedia-freezing-point-depression' })
    expect(freezingData.atomicWeights.map((w) => [w.id, w.published, w.sourceId])).toEqual([['H', '1.0080'], ['C', '12.011'], ['N', '14.007'], ['O', '15.999'], ['Na', '22.990'], ['Cl', '35.45'], ['K', '39.098'], ['Br', '79.904']].map((row) => [...row, 'ciaaw-abridged-2024']))
  })

  it('has each molar mass to two decimals, worked out from the atomic weights with the working shown', () => {
    expect(freezingData.reagents.map((r) => [r.id, r.molarMass.value])).toEqual([['acetone', 58.08], ['ethanol', 46.07], ['propan-2-ol', 60.1], ['urea', 60.06], ['nacl', 58.44], ['kcl', 74.55], ['nabr', 102.89]])
    for (const reagent of freezingData.reagents) expect(reagent.molarMass.working, reagent.id).toContain(`${reagent.molarMass.value.toFixed(2)} g/mol`)
  })

  it('says of each solute whether its count of particles is the ideal or a measured figure, and of the ideal salts that a real one gives less', () => {
    for (const reagent of freezingData.reagents) {
      const { particles } = reagent
      expect(particles.note, reagent.id).toMatch(particles.kind === 'ideal' ? /^The ideal: / : /^Measured: /)
      if (particles.kind === 'ideal' && particles.ideal === 2) expect(particles.note, reagent.id).toMatch(/No measured freezing point of its solutions was found .* a real solution gives a little less\.$/)
    }
    expect(freezingData.measured.map((row) => [row.id, row.massPercent.published, row.freezingPoint.published, row.ratio.value])).toEqual([['nacl-2', '2', '-1.19', 1.83], ['nacl-3', '3', '-1.79', 1.82], ['ethanol-2.5', '2.5', '-1', 1]])
  })

  it('names the unknown and says how it looks without saying which it is, and gives every liquid it may be the same look', () => {
    const { unknown } = freezingData.parts[1]
    expect(unknown).toEqual({ name: 'Unknown liquid', appearance: 'a clear, colourless liquid' })
    for (const liquid of candidatesOf(freezingData)) expect(liquid.appearance, liquid.id).toBe(unknown.appearance)
  })

  it('gives every parameter a rationale, and every range runs upward', () => {
    for (const [key, parameter] of Object.entries(freezingData.parameters)) {
      expect(parameter.rationale.length, key).toBeGreaterThan(40)
      if (Array.isArray(parameter.value)) expect(parameter.value[0], key).toBeLessThan(parameter.value[1])
    }
  })

  it('weighs out the unknown in one range whichever liquid it is: the record has no range for a liquid of its own', () => {
    expect(Object.keys(freezingData.parameters).filter((key) => /RangeCg$/.test(key))).toEqual(['waterRangeCg', 'unknownRangeCg', 'ureaRangeCg', 'naclRangeCg', 'kclRangeCg', 'nabrRangeCg'])
  })

  it('keeps every note short: a part has three, none over 75 words', () => {
    for (const part of freezingData.parts) {
      expect(part.notes.length, part.id).toBe(3)
      for (const note of part.notes) expect(words(note.value), part.id).toBeLessThanOrEqual(75)
    }
  })

  it('says in the notes which figures are the ideal and which is measured, with the source figures as printed', () => {
    const notes = (part: number) => freezingData.parts[part]!.notes.map((note) => note.value).join(' ')
    expect(notes(1)).toMatch(/takes each molecule as one particle and the solution as ideal/)
    expect(notes(1)).toMatch(/2\.5% ethanol by mass freezing at −1 °C, to the one figure it prints, and the ideal gives −1\.04 °C\. None was found for acetone or 2-propanol\./)
    expect(notes(2)).toMatch(/a measured figure, 1\.82\. A handbook table has water with 3% sodium chloride by mass freezing at −1\.79 °C, where two whole particles would give −1\.97 °C\./)
    expect(notes(2)).toMatch(/For potassium chloride and sodium bromide no measured freezing point was found in a source that could be read, so the lab uses 2, the ideal\. That is more than a real salt gives/)
    // The figures the notes give are the record's own.
    const [, row] = freezingData.measured
    expect(row!.idealFall.value * 2).toBeCloseTo(1.97, 2)
    expect(freezingData.measured[2]!.idealFall.value).toBe(1.04)
  })
})

describe('the hazards of the three liquids, urea and the three salts (spec 5.2)', () => {
  const reagents = freezingData.reagents

  it("carries the signal word and the statements of the default supplier's sheet for each", () => {
    expect(reagents.map((r) => [r.id, r.hazards.signalWord, r.hazards.statements.map((s) => s.split(':')[0]).join(' '), r.hazards.sourceId])).toEqual([
      ['acetone', 'Danger', 'H225 H319 H336', 'flinn-sds-7'],
      ['ethanol', 'Danger', 'H225 H302 H315+H319 H335 H370', 'flinn-sds-326'],
      ['propan-2-ol', 'Danger', 'H225 H319 H336', 'flinn-sds-420'],
      ['urea', 'None', '', 'flinn-sds-840'],
      ['nacl', 'Warning', 'H303', 'flinn-sds-721'],
      ['kcl', 'Warning', 'H303', 'flinn-sds-621'],
      ['nabr', 'Warning', 'H303+H313 H320', 'flinn-sds-714'],
    ])
  })

  it('writes each note in three short paragraphs of 160 words at most: the bench and the default sheet, what is stricter, and disposal left to the laboratory', () => {
    for (const reagent of reagents) {
      const paragraphs = reagent.hazards.note.value.split('\n\n')
      expect(paragraphs.length, reagent.id).toBe(3)
      expect(words(reagent.hazards.note.value), reagent.id).toBeLessThanOrEqual(160)
      expect(paragraphs[2], reagent.id).toBe("How any of it is disposed of is decided by the laboratory's own rules and by local regulations; ask the laboratory's supervisor.")
      expect(paragraphs[1], reagent.id).toMatch(reagent.id === 'nabr' ? /^No stricter document was found: / : /^Stricter, and what this lab goes by: /)
    }
  })

  it('says of each liquid that the unknown may be it, never that it is, in the same words and with no amount: every tile can be shown before the unknown is named', () => {
    for (const liquid of candidatesOf(freezingData)) {
      expect(liquid.hazards.note.value, liquid.id).toMatch(/^The unknown liquid may be this: [\w-]+, a few grams of it, stirred into ice and water\. /)
      // No figure in a unit the bench's instruments read: not a mass, not a temperature, not a molar mass.
      expect(liquid.hazards.note.value, liquid.id).not.toMatch(/\d\s*(g|kg|mg|mL|°C|mol)\b/)
      expect(liquid.classifiedAs, liquid.id).not.toMatch(/\d\s*(g|kg|mg|mL|°C|mol)\b/)
    }
  })

  it('gives no method of disposal, and names no supplier in what a learner reads', () => {
    for (const reagent of reagents) {
      expect(`${reagent.classifiedAs} ${reagent.hazards.note.value}`, reagent.id).not.toMatch(/Flinn|Fisher|drain|sewer|sink|trash|landfill/i)
    }
  })
})

describe('validateFreezing', () => {
  it('refuses a candidate that is no liquid or no reagent, a reagent no part uses, an atom with no weight and ids used twice', () => {
    expect(errorsWith((d) => void (d.parts[1].candidateIds[0] = 'urea'))).toMatch(/the liquids of part 2 and the solutes of part 3[^\n]*urea|candidate "urea" is not a liquid/)
    expect(errorsWith((d) => void (d.parts[1].candidateIds[0] = 'methanol'))).toMatch(/the candidate "methanol" is no reagent of the record/)
    expect(errorsWith((d) => void d.parts[2].soluteIds.pop())).toMatch(/reagent "nabr": no part uses it/)
    expect(errorsWith((d) => void d.atomicWeights.pop())).toMatch(/reagent "nabr": no atomic weight for Br/)
    expect(errorsWith((d) => void (d.reagents[1]!.id = 'acetone'))).toMatch(/reagents/)
  })

  it('refuses a published figure that is not the number beside it, an unknown source, a count of particles with no row, and a range that runs downward', () => {
    expect(errorsWith((d) => void (d.water.freezingPointConstant.published = '1.853'))).toMatch(/published "1.853" is not the stored value 1.86/)
    expect(errorsWith((d) => void (d.parts[0].notes[0]!.sourceId = 'nowhere'))).toMatch(/unknown source "nowhere"/)
    expect(errorsWith((d) => void (d.reagents[4]!.particles.measuredId = 'nacl-9'))).toMatch(/reagent "nacl": its count of particles names no measured row of its own/)
    expect(errorsWith((d) => void (d.parameters.unknownRangeCg.value = [450, 360]))).toMatch(/parameters.unknownRangeCg: a range runs from its lower end to its upper/)
  })
})

describe('freezingCitations', () => {
  const ids = (part: (typeof PART_IDS)[number]) => freezingCitations(freezingData, part, sources).map((c) => c.source.id)

  it("lists for part 1 the notes' sources", () => {
    expect(ids('water').sort()).toEqual(['wikipedia-freezing-point-depression', 'wikipedia-thermometer'])
  })

  it('lists for part 2 the constant, the atomic weights and every liquid the unknown may be with its documents, whichever it is', () => {
    expect(ids('unknown')).toEqual(expect.arrayContaining(['wikipedia-freezing-point-depression', 'ciaaw-abridged-2024', 'lange-ethanol-wikipedia', 'flinn-sds-7', 'noaa-cameo-8', 'flinn-sds-326', 'noaa-cameo-667', 'flinn-sds-420', 'noaa-cameo-946']))
    expect(ids('unknown')).not.toEqual(expect.arrayContaining(['flinn-sds-840']))
  })

  it('lists for part 3 urea and the three salts with their documents, and the measured freezing points of sodium chloride', () => {
    expect(ids('particles')).toEqual(expect.arrayContaining(['crc-nacl-solutions-wikipedia', 'wikipedia-van-t-hoff-factor', 'flinn-sds-840', 'noaa-cameo-9165', 'flinn-sds-721', 'fisher-sds-nacl', 'flinn-sds-621', 'fisher-sds-kcl', 'flinn-sds-714']))
    expect(() => freezingCitations(freezingData, 'nothing' as never, sources)).toThrow(/no part "nothing"/)
  })
})
