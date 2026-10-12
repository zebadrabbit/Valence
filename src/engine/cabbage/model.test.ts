import { describe, expect, it } from 'vitest'
import { cabbageData, THING_IDS } from '@/chem-data/cabbage/data'
import authored from '../../../docs/research/cabbage/cabbage.json'
import { bufferShows, classAt, colourAt, modelFrom, scaleAnswer, scaleChoices, thingModel, thingShows } from './model'
import { PINNED_MODEL as m } from './pinnedModel'
import { labSetup, readingTenths } from './setup'

type Lib = { colourAt(record: unknown, tenths: number): string; rangeTenths(thing: unknown): [number, number] }
const [lib] = Object.values(import.meta.glob<Lib>('../../../scripts/cabbage-lib.mjs', { eager: true }))

describe('the model', () => {
  it('is what the stored record gives', () => {
    expect(modelFrom(cabbageData)).toEqual(m)
  })

  it("finds a colour as the build's check does, at every tenth of the scale, and a range as it does", () => {
    for (let tenths = 10; tenths <= 130; tenths++) expect(colourAt(m, tenths), String(tenths)).toBe(lib!.colourAt(authored, tenths))
    for (const thing of authored.things) expect([thingModel(m, thing.id as never).lowTenths, thingModel(m, thing.id as never).highTenths]).toEqual(lib!.rangeTenths(thing))
  })

  it('shows the lower colour at an edge and the next just above it; everything above pH 12.0 is yellow', () => {
    expect([15, 16, 65, 66, 75, 76, 105, 106, 120, 121, 130].map((tenths) => colourAt(m, tenths))).toEqual(['red', 'dark pink', 'blue-violet', 'dark blue', 'dark blue', 'blue', 'emerald', 'greenish-yellow', 'greenish-yellow', 'yellow', 'yellow'])
  })

  it('calls a pH neutral where the indicator shows the colour of the pH 7 buffer, acid below and basic above', () => {
    expect([10, 65, 66, 70, 75, 76, 130].map((tenths) => classAt(m, tenths))).toEqual(['acid', 'acid', 'neutral', 'neutral', 'neutral', 'basic', 'basic'])
  })

  it('reads the answers to the rack’s questions off the table: red, dark blue, and pH 11 with pH 12', () => {
    expect(m.questions.map((question) => scaleAnswer(m, question))).toEqual(['red', 'dark blue', 11])
    expect(scaleChoices(m, m.questions[0]!)).toEqual(m.colours)
    expect(scaleChoices(m, m.questions[2]!)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })
})

describe('what is seen of a tube', () => {
  it('is a clear liquid with no colour in every buffer until the indicator goes in, and then its colour, a little fuller', () => {
    expect(bufferShows(m, 3, false)).toEqual({ liquid: { colour: 'colourless', cloudy: false, microlitres: 3000 }, solid: null })
    expect(bufferShows(m, 3, true)).toEqual({ liquid: { colour: 'rose', cloudy: false, microlitres: 3500 }, solid: null })
  })

  it("is a thing's own look before the indicator, and after it the indicator's colour in a liquid as cloudy as before, over the same solid", () => {
    const antacid = thingModel(m, 'antacid')
    expect(thingShows(m, antacid, 82, false)).toEqual({ liquid: { colour: 'white', cloudy: true, microlitres: 3000 }, solid: { colour: 'white', settled: true } })
    expect(thingShows(m, antacid, 82, true)).toEqual({ liquid: { colour: 'blue', cloudy: true, microlitres: 3500 }, solid: { colour: 'white', settled: true } })
    expect(thingShows(m, thingModel(m, 'vinegar'), 30, true).liquid).toEqual({ colour: 'rose', cloudy: false, microlitres: 3500 })
  })

  it('has no colour once the indicator is in bleach: the dye is destroyed', () => {
    expect(thingShows(m, thingModel(m, 'bleach'), 97, true).liquid!.colour).toBe('colourless')
    expect(() => thingModel(m, 'soap' as never)).toThrow('no thing')
  })
})

describe('what the seed fixes', () => {
  it('is one pH for each thing, the same for the same seed, and not the same for every seed', () => {
    expect(labSetup(m, 7)).toEqual(labSetup(m, 7))
    expect(Object.keys(labSetup(m, 7))).toEqual([...THING_IDS])
    expect(labSetup(m, 1)).toEqual({ vinegar: 30, 'lemon-juice': 20, 'apple-juice': 37, ammonia: 114, shampoo: 68, conditioner: 35, 'laundry-detergent': 101, 'lab-detergent': 95, mouthwash: 68, antacid: 90, aspirin: 35, bleach: 97, 'drain-cleaner': 122, 'epsom-salt': 63 })
    expect(new Set(Array.from({ length: 30 }, (_, seed) => labSetup(m, seed).vinegar)).size).toBeGreaterThan(5)
  })
})

describe('what the meter reads', () => {
  const setup = { ...labSetup(m, 1), vinegar: 30, 'drain-cleaner': 120, 'lemon-juice': 32 }

  it("is the thing's own pH from a rinsed probe", () => {
    expect(readingTenths(m, setup, 'vinegar', null)).toBe(30)
  })

  it("is pulled a fifth of the way toward the last sample's from an unrinsed one, to the nearest tenth, up or down", () => {
    expect(readingTenths(m, setup, 'vinegar', 'drain-cleaner')).toBe(48)
    expect(readingTenths(m, setup, 'drain-cleaner', 'vinegar')).toBe(102)
    expect(readingTenths(m, setup, 'vinegar', 'lemon-juice')).toBe(30)
    expect(readingTenths(m, { ...setup, 'lemon-juice': 33 }, 'vinegar', 'lemon-juice')).toBe(31)
  })
})
