import { describe, expect, it } from 'vitest'
import input from '../../../docs/research/cabbage/cabbage.json'
import hazards from '../../../docs/research/cabbage/hazards.json'
import hazardManifest from '../../../docs/research/cabbage/sources/hazard-manifest.json'
import manifest from '../../../docs/research/cabbage/sources/MANIFEST.json'
import allSources from '../sources.json'
import stored from './cabbage.json'

// The checks scripts/build-chem-data.mjs runs on the red cabbage pH lab's record: against its manifest of sources;
// on its own chemistry, which is that the colours cover the scale, that each pH worked out is what its figures
// give and that a careful estimate by eye is within a unit of the meter (scripts/cabbage-lib.mjs); and, for the
// bottles' hazards, whose documents are not kept, against the hazard manifest's account of each. They are tested
// here on the real inputs and on inputs they must refuse. The checks of the manifests and the merge are the
// aqueous lab's, which that lab's tests cover; what is tested here is that they hold this record.
type Row = { fields: string[]; prints: string; where: string }
type Source = { id: string; url: string; citation: string; file?: string; fetchedSha256?: string; supports: Row[] }
type Sheet = { id: string; url: string; citation: string; file?: string; supports: { field: string; prints: string; where: string }[] }
type Listed = { id: string; url: string; citation: string }
type Record_ = typeof input
type Lib = {
  citations(record: unknown): { key: string; sourceId: string; published?: string }[]
  checkSupported(record: unknown, sources: Source[], sheets?: Sheet[]): void
  mergeHazards(reagents: unknown[], hazards: Record<string, unknown>, sheets: Sheet[]): { id: string }[]
  newSources(sources: Listed[], earlier: Listed[], where: string): Listed[]
}
type OwnLib = {
  colourAt(record: unknown, tenths: number): string
  rangeTenths(thing: unknown): [number, number]
  checkScale(record: unknown): void
  checkWorkedOut(record: unknown): void
  checkEstimates(record: unknown): { id: string; lowTenths: number; highTenths: number; tubes: number[]; farthestTenths: number }[]
}
const [lib] = Object.values(import.meta.glob<Lib>('../../../scripts/aqueous-lib.mjs', { eager: true }))
const [ownLib] = Object.values(import.meta.glob<OwnLib>('../../../scripts/cabbage-lib.mjs', { eager: true }))
const { citations, checkSupported, mergeHazards, newSources } = lib!
const { colourAt, rangeTenths, checkScale, checkWorkedOut, checkEstimates } = ownLib!

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const sources: Source[] = manifest.sources
const sheets: Sheet[] = hazardManifest.sources
const merged = () => ({ ...input, reagents: mergeHazards(input.reagents, hazards, sheets) })
const withRecord = (edit: (record: Record_) => void) => {
  const record = copy(input)
  edit(record)
  return record
}
const thing = (record: Record_, id: string) => record.things.find((t) => t.id === id)!

describe('the merge and the manifests', () => {
  it('give the stored record, and hold every citation to a row', () => {
    expect(merged()).toEqual(stored)
    expect(() => checkSupported(merged(), sources, sheets)).not.toThrow()
    expect(citations(merged()).length).toBeGreaterThan(80)
  })

  it('refuse a value whose row is gone, and a figure its source does not print', () => {
    const without = copy(sources).map((s) => (s.id === 'fda-ph-foods-2007' ? { ...s, supports: s.supports.filter((row) => !row.fields.includes('things[vinegar].ph.low')) } : s))
    expect(() => checkSupported(merged(), without, sheets)).toThrow('things[vinegar].ph.low: the source "fda-ph-foods-2007" has no row that names it')
    const record = merged()
    const vinegar = (record.things as Record_['things'])[0]!.ph as { low: { published: string } }
    vinegar.low.published = '2.50'
    expect(() => checkSupported(record, sources, sheets)).toThrow('has no row that prints 2.50')
  })

  it('refuse a bottle with no hazards, and a statement the sheet does not print', () => {
    const rest = Object.fromEntries(Object.entries(hazards).filter(([id]) => id !== 'bleach'))
    expect(() => mergeHazards(input.reagents, rest, sheets)).toThrow('hazards.json: expected exactly the keys')
    const changed = copy(hazards)
    changed.bleach.hazards.statements[0] = 'H315: Causes skin irritation'
    expect(() => mergeHazards(input.reagents, changed, sheets)).toThrow('flinn-sds-736')
  })

  it('keep no copy of any source, and list each of the lab’s sources once, the sheets of earlier labs not again', () => {
    for (const source of [...sources, ...sheets]) expect(source.file).toBeUndefined()
    const ids = allSources.map((s) => s.id)
    for (const source of [...sources, ...sheets]) expect(ids.filter((id) => id === source.id), source.id).toHaveLength(1)
    const earlier = allSources.slice(0, ids.indexOf(sources[0]!.id))
    expect(newSources(sheets, earlier, 'test').map((s) => s.id)).toEqual(['flinn-sds-665.8', 'flinn-sds-46', 'flinn-sds-58.05', 'flinn-sds-736', 'noaa-cameo-4503', 'flinn-sds-246'])
    expect(() => newSources([{ ...sheets[0]!, url: 'https://example.org/other' }], earlier, 'test')).toThrow('already in use')
  })
})

describe('the scale and the colours (scripts/cabbage-lib.mjs)', () => {
  it('pass on the record, and give each buffer the colour its source names', () => {
    expect(() => checkScale(input)).not.toThrow()
    expect(input.scale.buffers.map((b) => colourAt(input, b.ph * 10))).toEqual(['red', 'dark pink', 'rose', 'lavender', 'purple', 'blue-violet', 'dark blue', 'blue', 'teal', 'emerald', 'greenish-yellow', 'greenish-yellow', 'yellow'])
    expect([25, 26, 105, 106, 120, 121].map((t) => colourAt(input, t))).toEqual(['dark pink', 'rose', 'emerald', 'greenish-yellow', 'greenish-yellow', 'yellow'])
  })

  it('refuse a gap in the table, an edge out of its place, a pair of buffers too many and a thing off the scale', () => {
    expect(() => checkScale(withRecord((r) => (r.indicator.colours[3]!.from = 5)))).toThrow('leaves a gap or an overlap after pH 3')
    expect(() => checkScale(withRecord((r) => (r.indicator.colours[0]!.from = 2)))).toThrow('the table begins at pH 2')
    expect(() => checkScale(withRecord((r) => (r.parameters.colourEdgesTenths.value[2] = 41)))).toThrow('colourEdgesTenths[2]: 41 is not from 30 to under 40')
    expect(() => checkScale(withRecord((r) => r.parameters.colourEdgesTenths.value.pop()))).toThrow('10 edges for 12 colours')
    expect(() => checkScale(withRecord((r) => r.scale.buffers.pop()))).toThrow('not those of pH 1 to pH 13')
    expect(() => checkScale(withRecord((r) => Object.assign(thing(r, 'epsom-salt').ph, { low: { value: 0.5, published: '0.5', sourceId: 'x' } })))).toThrow('things[epsom-salt].ph: 0.5 to 8.2 does not lie inside the scale')
    expect(() => checkScale(withRecord((r) => Object.assign(thing(r, 'apple-juice').ph, { high: { value: 3.38, published: '3.38', sourceId: 'x' } })))).toThrow('no tenth of a pH unit lies from 3.35 to 3.38')
  })

  it('narrow a printed range to the tenths inside it', () => {
    expect(Object.fromEntries(input.things.map((t) => [t.id, rangeTenths(t)]))).toEqual({
      vinegar: [24, 34],
      'lemon-juice': [20, 26],
      'apple-juice': [34, 40],
      ammonia: [112, 114],
      shampoo: [55, 68],
      conditioner: [35, 35],
      'laundry-detergent': [95, 105],
      'lab-detergent': [95, 95],
      mouthwash: [60, 80],
      antacid: [70, 90],
      aspirin: [35, 35],
      bleach: [96, 98],
      'drain-cleaner': [121, 128],
      'epsom-salt': [50, 82],
    })
  })
})

describe('each pH that is worked out', () => {
  it('is what its cited figures give, and shows them', () => {
    expect(() => checkWorkedOut(input)).not.toThrow()
  })

  it('is refused when it is not, or when its working leaves a figure out', () => {
    expect(() => checkWorkedOut(withRecord((r) => ((thing(r, 'ammonia').ph.low as { value: number }).value = 11.3)))).toThrow('things[ammonia].ph.low: 11.3 is not what 5% of ammonia gives at one part in 20, 11.21')
    expect(() => checkWorkedOut(withRecord((r) => (r.constants.hypochlorousPKa.value = 7.53)))).toThrow('things[bleach].ph.low')
    expect(() => checkWorkedOut(withRecord((r) => (r.parameters.oneInTwenty.value = 10)))).toThrow('things[ammonia].ph.low')
    expect(() => checkWorkedOut(withRecord((r) => ((thing(r, 'drain-cleaner').ph.high as { working: string }).working = 'It is about 12.8.')))).toThrow('the working does not show 5.00')
    expect(() => checkWorkedOut(withRecord((r) => (thing(r, 'bleach').onBench = 'as-sold')))).toThrow('a pH is worked out only for a thing diluted')
  })
})

describe('a careful estimate by eye (spec 21.6)', () => {
  it('is within a unit of the meter for every thing but bleach, whichever buffer of the same colour is named', () => {
    const figures = checkEstimates(input)
    expect(figures.map((f) => f.id)).toEqual(input.things.filter((t) => t.id !== 'bleach').map((t) => t.id))
    for (const figure of figures) expect(figure.farthestTenths, figure.id).toBeLessThanOrEqual(10)
    expect(Object.fromEntries(figures.map((f) => [f.id, [f.tubes.join(' '), f.farthestTenths]]))).toMatchObject({
      'lemon-juice': ['2 3', 5],
      ammonia: ['11 12', 8],
      'drain-cleaner': ['13', 9],
      'epsom-salt': ['5 6 7 8', 5],
      'lab-detergent': ['9', 5],
    })
  })

  it('is refused where the two buffers that share a colour are not both near enough, and where no buffer has the colour', () => {
    expect(() => checkEstimates(withRecord((r) => (r.parameters.colourEdgesTenths.value[10] = 125)))).toThrow('things[drain-cleaner]: at pH 12.1 it shows greenish-yellow, as the pH 11 buffer does, which is 1.1 of a unit away: more than 1')
    expect(() => checkEstimates(withRecord((r) => Object.assign(thing(r, 'laundry-detergent').ph, { high: { value: 10.8, published: '10.8', sourceId: 'x' } })))).toThrow('things[laundry-detergent]: at pH 10.6 it shows greenish-yellow, as the pH 12 buffer does')
    expect(() => checkEstimates(withRecord((r) => r.scale.buffers.splice(8, 1)))).toThrow('which no buffer of the scale shows')
  })
})
