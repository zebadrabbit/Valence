import { describe, expect, it } from 'vitest'
import cabbage from '../../../docs/research/cabbage/cabbage.json'
import hazards from '../../../docs/research/mixing/hazards.json'
import input from '../../../docs/research/mixing/mixing.json'
import hazardManifest from '../../../docs/research/mixing/sources/hazard-manifest.json'
import manifest from '../../../docs/research/mixing/sources/MANIFEST.json'
import { LIBRARY_INDEX } from '../libraryIndex'
import allSources from '../sources.json'
import stored from './mixing.json'

// The checks scripts/build-chem-data.mjs runs on the polarity and mixing lab's record: against its manifest of
// sources; on its own bench, which is that every pair and every solid in a liquid is on the bench or listed as left
// off it, that everything on the bench says what it rests on, that which liquid is on top follows from two
// densities far enough apart to say, that a part's count can be reached and that a linked molecule is in the
// library (scripts/mixing-lib.mjs); and, for the rubbing alcohol's hazards, whose documents are not kept, against
// the hazard manifest's account of each. They are tested here on the real inputs and on inputs they must refuse.
// The checks of the manifests and the merge are the aqueous lab's, which that lab's tests cover; what is tested
// here is that they hold this record.
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
  pairId(record: unknown, a: string, b: string): string
  checkBench(record: unknown): void
  checkSourced(record: unknown): void
  onTop(record: unknown, pair: unknown): string
  checkLayers(record: unknown): { id: string; top: string; gap: number }[]
  checkParts(record: unknown): void
  checkMolecules(record: unknown, libraryIds: string[]): void
  withSharedNote(record: unknown, cabbage: unknown): Record_ & { sharedNote: { value: string; rationale: string } }
}
const [lib] = Object.values(import.meta.glob<Lib>('../../../scripts/aqueous-lib.mjs', { eager: true }))
const [ownLib] = Object.values(import.meta.glob<OwnLib>('../../../scripts/mixing-lib.mjs', { eager: true }))
const { citations, checkSupported, mergeHazards, newSources } = lib!
const { pairId, checkBench, checkSourced, checkLayers, checkParts, checkMolecules, withSharedNote } = ownLib!

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const sources: Source[] = manifest.sources
const sheets: Sheet[] = hazardManifest.sources
const merged = () => copy({ ...withSharedNote(input, cabbage), reagents: mergeHazards(input.reagents, hazards, sheets) })
const edited = (edit: (record: Record_) => void) => {
  const record = copy(input)
  edit(record)
  return record
}
const libraryIds = LIBRARY_INDEX.map((entry) => entry.id)

describe("the build's checks of the mixing record against its sources", () => {
  it('builds the stored record from the authored one', () => {
    expect(merged()).toEqual(stored)
  })

  it('holds the record and the manifests to one account of the sources', () => {
    expect(() => checkSupported(merged(), sources, sheets)).not.toThrow()
    // Every citation of the record, hazards apart, is of a source of the lab's manifest.
    const cited = citations(merged()).filter((c) => !c.key.startsWith('reagents['))
    expect(cited.length).toBeGreaterThan(80)
    expect(cited.filter((c) => !sources.some((s) => s.id === c.sourceId))).toEqual([])
  })

  it('refuses a value no row names, a figure no row prints, and a row for a value that does not cite its source', () => {
    const noRow = merged()
    noRow.pairs[0]!.mix.sourceId = 'uaf-liquid-layers'
    expect(() => checkSupported(noRow, sources, sheets)).toThrow(/has no row that names it/)
    const figure = merged()
    figure.liquids[3]!.density.published = '0.92'
    expect(() => checkSupported(figure, sources, sheets)).toThrow(/no row that prints 0.92/)
    const stale = copy(sources)
    stale[0]!.supports[0]!.fields.push('liquids[vinegar].density')
    expect(() => checkSupported(merged(), stale, sheets)).toThrow(/which does not cite it/)
  })

  it("lists every source of the two manifests among the app's sources, the reused ones at the address and citation their first lab gave them", () => {
    for (const source of [...sources, ...sheets]) {
      const listed = allSources.find((s) => s.id === source.id)
      expect(listed, source.id).toEqual({ id: source.id, url: source.url, citation: source.citation })
    }
    expect(newSources(sources, allSources, 'mixing MANIFEST.json')).toEqual([])
    expect(() => newSources([{ ...sources[0]!, citation: 'Another citation.' }], allSources, 'mixing MANIFEST.json')).toThrow(/already in use/)
  })

  it('keeps no copy of any source, and records the hash of each page as it was read', () => {
    for (const source of [...sources, ...sheets] as (Source & { fetchedSha256?: string })[]) {
      expect(source.file, source.id).toBeUndefined()
      expect(source.fetchedSha256, source.id).toMatch(/^[0-9a-f]{64}$/)
    }
  })

  it('reads Wikipedia only at /wiki/ addresses that pin a revision', () => {
    const wiki = sources.filter((s) => s.url.includes('wikipedia.org'))
    expect(wiki).toHaveLength(4)
    for (const source of wiki) expect(source.url, source.id).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\/[^?]+\?oldid=\d+$/)
  })
})

describe("the build's checks of the mixing lab's bench", () => {
  it('passes the authored record', () => {
    expect(() => checkBench(input)).not.toThrow()
    expect(() => checkSourced(input)).not.toThrow()
    expect(() => checkParts(input)).not.toThrow()
    expect(() => checkMolecules(input, libraryIds)).not.toThrow()
  })

  it('works out which liquid is on top of each pair that makes layers from the two stored densities, each pair far enough apart to say (spec 25.3)', () => {
    expect(checkLayers(input)).toEqual([
      { id: 'water+vegetable-oil', top: 'vegetable-oil', gap: 0.075 },
      { id: 'water+mineral-oil', top: 'mineral-oil', gap: 0.176 },
      { id: 'rubbing-alcohol+vegetable-oil', top: 'rubbing-alcohol', gap: 0.053 },
      { id: 'vinegar+vegetable-oil', top: 'vegetable-oil', gap: 0.087 },
      { id: 'vinegar+mineral-oil', top: 'mineral-oil', gap: 0.188 },
    ])
  })

  it('refuses two densities too near each other to say which liquid is on top', () => {
    // With the supplier's own figure for a heavy mineral oil, the pair left off the bench could not be put on it.
    const near = edited((r) => {
      r.liquids[4]!.density.value = 0.86
      r.pairs.push({ ...copy(r.pairs[3]!), id: 'rubbing-alcohol+mineral-oil', liquidIds: ['rubbing-alcohol', 'mineral-oil'] })
    })
    expect(() => checkLayers(near)).toThrow(/pairs\[rubbing-alcohol\+mineral-oil\].*0\.010 apart: under 0\.03, too near to say which liquid is on top/)
    expect(() => checkLayers(edited((r) => (r.parameters.leastDensityGap.value = 0.06)))).toThrow(/pairs\[rubbing-alcohol\+vegetable-oil\]/)
  })

  it('refuses a pair or a solid in a liquid that is neither on the bench nor listed as left off it, or is both', () => {
    expect(() => checkBench(edited((r) => r.pairs.splice(0, 1)))).toThrow(/"water\+rubbing-alcohol" is neither on the bench nor listed as left off it/)
    expect(() => checkBench(edited((r) => r.offBench.splice(1, 1)))).toThrow(/"salt-in-rubbing-alcohol" is neither on the bench nor listed/)
    expect(() => checkBench(edited((r) => r.offBench.push({ id: 'water+vinegar', kind: 'pair', rationale: 'x' })))).toThrow(/"water\+vinegar" is listed twice/)
    expect(() => checkBench(edited((r) => (r.offBench[0]!.kind = 'solid-in-liquid')))).toThrow(/it is a pair/)
    expect(() => checkBench(edited((r) => (r.offBench[0]!.rationale = ' ')))).toThrow(/does not say why/)
    expect(() => checkBench(edited((r) => r.offBench.push({ id: 'pepper-in-water', kind: 'solid-in-liquid', rationale: 'x' })))).toThrow(/no pair of two liquids and no solid in a liquid/)
  })

  it("refuses a pair that is not two liquids of the record in the bench's order, and a solid tube under another name", () => {
    expect(() => checkBench(edited((r) => (r.pairs[1]!.liquidIds = ['vinegar', 'water'])))).toThrow(/named by its two liquids in the bench's order, "water\+vinegar"/)
    expect(() => checkBench(edited((r) => (r.pairs[1]!.liquidIds = ['water', 'water'])))).toThrow(/not two different liquids/)
    expect(() => checkBench(edited((r) => (r.solidInLiquid[0]!.solidId = 'sugar')))).toThrow(/it is named "sugar-in-water"/)
    expect(pairId(input, 'mineral-oil', 'water')).toBe('water+mineral-oil')
  })

  it('refuses anything on the bench with no source, no basis or no reason (spec 25.5)', () => {
    expect(() => checkSourced(edited((r) => (r.pairs[2]!.mix.sourceId = '')))).toThrow(/pairs\[water\+vegetable-oil\]\.mix: no source; a tube with no source is not on the bench/)
    expect(() => checkSourced(edited((r) => (r.solidInLiquid[3]!.dissolves.reason = '')))).toThrow(/solidInLiquid\[salt-in-mineral-oil\]\.dissolves: it does not say why its source applies/)
    expect(() => checkSourced(edited((r) => (r.pairs[0]!.mix.basis = 'guess')))).toThrow(/its basis is/)
    expect(() => checkSourced(edited((r) => (r.liquids[2]!.density.sourceId = '')))).toThrow(/liquids\[vinegar\]\.density: no source/)
    expect(() => checkSourced(edited((r) => (r.liquids[2]!.family.sourceId = '')))).toThrow(/liquids\[vinegar\]\.family: no source/)
  })

  it('refuses a count the bench cannot reach, an answer that is no choice, and a link to a molecule the library does not hold', () => {
    expect(() => checkParts(edited((r) => (r.parameters.neededPairs.value = 10)))).toThrow(/10 pairs are needed and the bench has 9/)
    expect(() => checkParts(edited((r) => (r.parameters.neededSolids.value = 9)))).toThrow(/9 tubes are needed and the bench has 8/)
    expect(() => checkParts(edited((r) => (r.rule.questions[1]!.answer.value = 'floats')))).toThrow(/its answer is not one of its choices/)
    expect(() => checkMolecules(edited((r) => ((r.liquids[1] as { moleculeId?: string }).moleculeId = 'propan-2-ol')), libraryIds)).toThrow(/the library holds no molecule "propan-2-ol"/)
  })

  it("takes the foods' note from the red cabbage pH lab's record, and refuses wording of its own", () => {
    expect(withSharedNote(input, cabbage).sharedNote).toEqual({ value: cabbage.sharedNote.value, rationale: input.sharedNote.rationale })
    expect(() => withSharedNote(edited((r) => ((r.sharedNote as { value?: string }).value = 'Another note.')), cabbage)).toThrow(/holds no wording of its own/)
    expect(() => withSharedNote(input, {})).toThrow(/has no shared note to take/)
  })
})

describe("the build's checks of the rubbing alcohol's hazards", () => {
  it('merges the two records, the rubbing alcohol\'s and, since 2026-10-18, the mineral oil\'s, held to the rows of the hazard manifest', () => {
    expect(mergeHazards(input.reagents, hazards, sheets).map((r) => r.id)).toEqual(['rubbing-alcohol', 'mineral-oil'])
  })

  it('refuses a statement the sheet does not print, a signal word it does not print, and a note with no row under it', () => {
    const more = copy(hazards)
    more['rubbing-alcohol'].hazards.statements.push('H302: Harmful if swallowed')
    expect(() => mergeHazards(input.reagents, more, sheets)).toThrow(/rows for 4 statements .* and the record stores 5/)
    const word = copy(hazards)
    word['rubbing-alcohol'].hazards.signalWord = 'Warning'
    expect(() => mergeHazards(input.reagents, word, sheets)).toThrow(/prints the signal word "DANGER", not "Warning"/)
    const bare = copy(sheets)
    bare[1]!.supports = bare[1]!.supports.filter((row) => row.field !== 'rubbing-alcohol.hazards.note')
    expect(() => mergeHazards(input.reagents, hazards, bare)).toThrow(/has no row for rubbing-alcohol.hazards.note/)
  })
})
