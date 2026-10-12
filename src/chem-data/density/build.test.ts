import { describe, expect, it } from 'vitest'
import input from '../../../docs/research/density/density.json'
import hazards from '../../../docs/research/density/hazards.json'
import hazardManifest from '../../../docs/research/density/sources/hazard-manifest.json'
import manifest from '../../../docs/research/density/sources/MANIFEST.json'
import allSources from '../sources.json'
import stored from './density.json'

// The checks scripts/build-chem-data.mjs runs on the measurement and density lab's record: against its manifest
// of sources, against the copy of the handbooks' densities that the periodic table keeps, on the densities it
// works out from cited figures, on the numbers of spec 22.6 and, for the hazards, whose documents are not kept,
// against the hazard manifest's account of each. They are tested here on the real inputs and on inputs they must
// refuse. The checks of the manifests and the merge are the aqueous lab's (scripts/aqueous-lib.mjs), which that
// lab's tests cover on its own inputs; what is tested here is that they hold this record, and what this lab
// added (scripts/density-lib.mjs).
type Row = { fields: string[]; prints: string; where: string }
type Source = { id: string; url: string; citation: string; file?: string; supports: Row[] }
type Sheet = { id: string; url: string; citation: string; file?: string; supports: { field: string; prints: string; where: string }[] }
type Note = { value: string; sourceId: string; alsoSourceId?: string; moreSourceIds?: string[] }
type Entry = { classifiedAs: string; hazards: { signalWord: string; statements: string[]; note: Note; sourceId: string } }
type Listed = { id: string; url: string; citation: string }
type Lib = {
  checkSupported(record: unknown, sources: Source[], sheets?: Sheet[]): void
  mergeHazards(reagents: unknown[], hazards: Record<string, Entry>, sheets: Sheet[]): { id: string; classifiedAs: string; hazards: Entry['hazards'] }[]
  newSources(sources: Listed[], earlier: Listed[], where: string): Listed[]
}
type Numbers = { worst: { percent: number; id: string; volumeTenthMl: number; readTenthMl: number; massCg: number; found: number }; nearest: { lower: string; upper: string; percent: number } }
type OwnLib = {
  threeFigures(value: number): number
  checkWorkedOut(record: unknown): void
  checkMetalDensities(record: unknown, wikitext: string): void
  checkTellApart(record: unknown): { liquid: Numbers; metal: Numbers; area: { smallest: number; largest: number } }
}
const [lib] = Object.values(import.meta.glob<Lib>('../../../scripts/aqueous-lib.mjs', { eager: true }))
const [ownLib] = Object.values(import.meta.glob<OwnLib>('../../../scripts/density-lib.mjs', { eager: true }))
const [kept] = Object.values(import.meta.glob<string>('../../../docs/research/periodic-table/sources/wikipedia-densities-of-the-elements-data-page.wikitext', { eager: true, query: '?raw', import: 'default' }))
const { checkSupported, mergeHazards, newSources } = lib!
const { checkWorkedOut, checkMetalDensities, checkTellApart, threeFigures } = ownLib!

type Input = typeof input
const copy = (): Input => JSON.parse(JSON.stringify(input))
const edited = (edit: (record: Input) => void) => {
  const record = copy()
  edit(record)
  return record
}
const sheets: Sheet[] = hazardManifest.sources

describe('the record against its manifests', () => {
  it('names every cited value in a row of its source, with the figure the source prints', () => {
    expect(() => checkSupported(stored, manifest.sources, sheets)).not.toThrow()
    const built = (edit: (record: typeof stored) => void) => {
      const record: typeof stored = JSON.parse(JSON.stringify(stored))
      edit(record)
      return record
    }
    expect(() => checkSupported(built((r) => (r.liquids[0]!.printed.published = '0.8057')), manifest.sources, sheets)).toThrow(/no row that prints 0.8057/)
    expect(() => checkSupported(built((r) => (r.metals[3]!.printed.sourceId = 'wikipedia-density')), manifest.sources, sheets)).toThrow(/no row that names it/)
  })

  it('keeps no copy of a source in its own folder, and adds thirteen sources to those the earlier labs list', () => {
    expect([...manifest.sources, ...hazardManifest.sources].some((s) => 'file' in s)).toBe(false)
    const mine = new Set([...manifest.sources, ...sheets].map((s) => s.id))
    const earlier = allSources.slice(0, allSources.findIndex((s) => s.id === 'lange-ethanol-wikipedia'))
    const added = [...newSources(manifest.sources, earlier, 'x'), ...newSources(sheets, earlier, 'x')]
    expect(added.map((s) => s.id)).toEqual(['lange-ethanol-wikipedia', 'crc-nacl-solutions-wikipedia', 'nist-webbook-water-20c', 'wikipedia-celsius', 'wikipedia-thermometer', 'wikipedia-graduated-cylinder', 'wikipedia-significant-figures', 'wikipedia-density', 'purdue-significant-figures', 'flinn-sds-326', 'noaa-cameo-667', 'flinn-sds-265', 'noaa-cameo-16146'])
    // The other ten are documents an earlier lab read, listed once.
    expect([...mine].filter((id) => earlier.some((s) => s.id === id)).sort()).toEqual(['fisher-sds-nacl', 'fisher-sds-zinc-granular-mossy', 'flinn-sds-34', 'flinn-sds-721', 'flinn-sds-722', 'flinn-sds-859', 'handbook-densities-wikipedia', 'noaa-cameo-14008', 'wards-sds-aa0145', 'wards-sds-ss0450', 'wards-sds-zz0022'].sort())
    expect(() => newSources([{ ...manifest.sources[0]!, citation: 'another' }], earlier, 'x')).toThrow(/already in use/)
  })

  it("merges each reagent's hazards from the manifest's account of its sheets, and refuses a statement the sheet's rows do not print", () => {
    const merged = mergeHazards(input.reagents, hazards, sheets)
    expect(merged.map((r) => r.id)).toEqual(input.reagents.map((r) => r.id))
    expect(stored.reagents).toEqual(merged)
    const wrong: Record<string, Entry> = JSON.parse(JSON.stringify(hazards))
    wrong['ethanol-95']!.hazards.statements[0] = 'H226: Flammable liquid and vapor'
    expect(() => mergeHazards(input.reagents, wrong, sheets)).toThrow(/Highly flammable liquid and vapor \(H225\)/)
    const word: Record<string, Entry> = JSON.parse(JSON.stringify(hazards))
    word['copper-pieces']!.hazards.signalWord = 'Warning'
    expect(() => mergeHazards(input.reagents, word, sheets)).toThrow(/signal word/)
  })
})

describe('the densities worked out', () => {
  it('are the printed figures to three significant figures, a relative density times the density of water at 20 °C', () => {
    expect(() => checkWorkedOut(input)).not.toThrow()
    expect(threeFigures(0.80567 * 0.99821)).toBe(0.804)
    expect(threeFigures(0.91546 * 0.99821)).toBe(0.914)
    expect(() => checkWorkedOut(edited((r) => (r.liquids[0]!.density.value = 0.806)))).toThrow(/0.806 is not 0.80567 × 0.99821 to three significant figures, 0.804/)
    expect(() => checkWorkedOut(edited((r) => (r.liquids[4]!.density.value = 1.148)))).toThrow(/1.148 is not 1.1478 to three significant figures, 1.15/)
    expect(() => checkWorkedOut(edited((r) => (r.liquids[0]!.density.working = 'worked out')))).toThrow(/the working does not show 0.80567/)
    expect(() => checkWorkedOut(edited((r) => (r.liquids[0]!.temperature = '25 °C')))).toThrow(/relative to water at 25 °C/)
    expect(() => checkWorkedOut(edited((r) => (r.metals[0]!.printed.unit = 'lb/ft³')))).toThrow(/none the build can work from/)
  })

  it("are, for the metals, the figures of the kept copy of the handbooks' transcription, near room temperature", () => {
    expect(kept!.length).toBeGreaterThan(40000)
    expect(() => checkMetalDensities(input, kept!)).not.toThrow()
    expect(() => checkMetalDensities(edited((r) => (r.metals[2]!.printed.published = '7.86')), kept!)).toThrow(/the kept copy gives Fe 7.87 g\/cm³ near room temperature, not the stored 7.86/)
    expect(() => checkMetalDensities(edited((r) => (r.metals[3]!.temperature = '20 °C')), kept!)).toThrow(/near room temperature/)
    expect(() => checkMetalDensities(edited((r) => (r.metals[0]!.formula = 'Xx')), kept!)).toThrow(/no block for Xx/)
  })
})

describe('the numbers of spec 22.6, by number', () => {
  const numbers = checkTellApart(input)

  it('has a learner whose every reading is at the edge of the allowance within the tolerance: 1.0% out at most for a liquid, 2.8% for a metal', () => {
    expect(numbers.liquid.worst).toMatchObject({ id: 'ethanol-95', volumeTenthMl: 200, readTenthMl: 198, massCg: 1608, found: 0.812 })
    expect(numbers.liquid.worst.percent).toBeCloseTo(0.995, 3)
    expect(numbers.metal.worst).toMatchObject({ id: 'zinc', volumeTenthMl: 150, readTenthMl: 146, massCg: 10710, found: 7.34 })
    expect(numbers.metal.worst.percent).toBeCloseTo(2.801, 3)
    expect(numbers.metal.worst.percent).toBeLessThan(input.parameters.tolerancePercent.value)
  })

  it('has the candidates of each table further apart than the instruments can tell: 7.2% for the nearest liquids, 10.2% for the nearest metals', () => {
    expect(numbers.liquid.nearest).toMatchObject({ lower: 'water', upper: 'nacl-10' })
    expect(numbers.liquid.nearest.percent).toBeCloseTo(7.21, 2)
    expect(numbers.metal.nearest).toMatchObject({ lower: 'zinc', upper: 'iron' })
    expect(numbers.metal.nearest.percent).toBeCloseTo(10.22, 2)
    // What the instruments can tell: twice the furthest a careful learner comes out.
    expect(2 * numbers.liquid.worst.percent).toBeLessThan(numbers.liquid.nearest.percent)
    expect(2 * numbers.metal.worst.percent).toBeLessThan(numbers.metal.nearest.percent)
    expect(numbers.area).toEqual({ smallest: 44.84, largest: 95.77 })
  })

  it('refuses candidates too near to tell, a careful learner outside the tolerance, and a volume by difference of fewer than three figures', () => {
    expect(() => checkTellApart(edited((r) => (r.parameters.tolerancePercent.value = 4)))).toThrow(/water and nacl-10 are 7.2% apart, too near to tell/)
    expect(() => checkTellApart(edited((r) => (r.parameters.readingAllowance.value = 3)))).toThrow(/a careful learner can be 4.\d+% out/)
    expect(() => checkTellApart(edited((r) => (r.parameters.piecesRangeTenthMl.value = [100, 200])))).toThrow(/a careful learner can be|fewer than three figures/)
    expect(() => checkTellApart(edited((r) => ((r.parameters.liquidRangeTenthMl.value = [101, 450]), (r.parameters.readingAllowance.value = 1), (r.parameters.eyeShiftTenthMl.value = 3))))).toThrow(/its mass has fewer than four figures/)
    expect(() => checkTellApart(edited((r) => (r.parameters.firstVolumeRangeTenthMl.value = [104, 450])))).toThrow(/keep three figures/)
    expect(() => checkTellApart(edited((r) => (r.metals[2]!.density.value = 7.4)))).toThrow(/zinc and iron are 3.6% apart/)
  })

  it('refuses an eye whose shift the allowance could hide, a level off the scale, a thermometer that reads true, a mass of three figures and a note whose area needs a power of ten', () => {
    expect(() => checkTellApart(edited((r) => (r.parameters.eyeShiftTenthMl.value = 4)))).toThrow(/more than twice the allowance/)
    expect(() => checkTellApart(edited((r) => (r.parameters.waterRangeTenthMl.value = [200, 300])))).toThrow(/stay on the cylinder's scale/)
    expect(() => checkTellApart(edited((r) => (r.parameters.thermometerOffRangeTenths.value = [2, 8])))).toThrow(/off by more than the reading allowance/)
    expect(() => checkTellApart(edited((r) => (r.parameters.firstMassRangeCg.value = [900, 9500])))).toThrow(/four figures/)
    expect(() => checkTellApart(edited((r) => (r.parameters.noteWidthRangeE2.value = [400, 640])))).toThrow(/area must stay from 10 cm² to under 99.5 cm²/)
    expect(() => checkTellApart(edited((r) => (r.parameters.noteWidthRangeE2.value = [400, 990])))).toThrow(/its width two/)
  })
})
