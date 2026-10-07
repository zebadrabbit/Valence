import { describe, expect, it } from 'vitest'
import input from '../../../docs/research/phase-4/aqueous.json'
import hazards from '../../../docs/research/phase-4/hazards.json'
import hazardManifest from '../../../docs/research/phase-4/sources/hazard-manifest.json'
import manifest from '../../../docs/research/phase-4/sources/MANIFEST.json'
import properties from '../../../docs/research/phase-4/sources/pubchem-aqueous-reagents.json'
import earlier from '../../../docs/research/phase-3/sources/MANIFEST.json'
import stored from './aqueous.json'

// The checks scripts/build-chem-data.mjs runs on the aqueous reactions lab's record: against its manifest of
// sources, against the one kept copy, and, for the reagents' hazards, whose sheets are not kept, against the
// hazard manifest's account of each sheet. They are tested here on the real inputs and on inputs they must
// refuse. The script itself writes files, so its checks live in scripts/aqueous-lib.mjs as plain functions.
type Row = { fields: string[]; prints: string; where: string }
type Source = { id: string; url: string; citation: string; file?: string; supports: Row[] }
type Sheet = { id: string; url: string; citation: string; file?: string; supports: { field: string; prints: string; where: string }[] }
type Entry = { classifiedAs: string; hazards: { signalWord: string; statements: string[]; note: { value: string; sourceId: string; alsoSourceId?: string }; sourceId: string } }
type Lib = {
  citations(record: unknown): { key: string; sourceId: string; published?: string }[]
  checkSupported(record: unknown, sources: Source[], sheets?: Sheet[]): void
  checkReagents(record: unknown, properties: unknown): void
  mergeHazards(reagents: unknown[], hazards: Record<string, Entry>, sheets: Sheet[], never?: Record<string, string[]>): { id: string; classifiedAs: string; hazards: Entry['hazards'] }[]
  newSources(sources: { id: string; url: string; citation: string }[], earlier: { id: string; url: string; citation: string }[], where: string): { id: string; url: string; citation: string }[]
}
const [lib] = Object.values(import.meta.glob<Lib>('../../../scripts/aqueous-lib.mjs', { eager: true }))
const { citations, checkSupported, checkReagents, mergeHazards, newSources } = lib!

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const sources: Source[] = manifest.sources
const sheets: Sheet[] = hazardManifest.sources

describe('citations', () => {
  it('names each place a source is cited as a manifest row names it', () => {
    const keys = citations(stored).map((c) => c.key)
    for (const key of ['species[water]', 'species[water].enthalpyOfFormation', 'species[copper-ii-ion].solutionColor', 'reagents[caco3].molarMass', 'reagents[mg].hazards.note', 'solubility[silver-ion+chloride-ion]', 'activitySeries[magnesium]', 'observations[ammonia]', 'constants.solutionDensity', 'cautions.sniffing', 'stations[aq-06].notes[1]']) {
      expect(keys).toContain(key)
    }
    expect(citations(stored).find((c) => c.key === 'species[hydroxide-ion].enthalpyOfFormation')).toEqual({ key: 'species[hydroxide-ion].enthalpyOfFormation', sourceId: 'nbs-tables-1982', published: '-229.994' })
    // A second source is a citation of the same place.
    expect(citations(stored).filter((c) => c.key === 'observations[iron-iii-hydroxide]').map((c) => c.sourceId)).toEqual(['birk-iron', 'flowers-chem2e-19.1'])
  })
})

describe('checkSupported', () => {
  it('accepts the record as built: every value has a row of its source, and every row a value', () => {
    expect(() => checkSupported(stored, sources, sheets)).not.toThrow()
  })

  it('refuses a value that cites a source with no row for it, and a source the manifest does not hold', () => {
    const record = copy(stored)
    record.species.find((s) => s.id === 'water')!.sourceId = 'nbs-tables-1982'
    expect(() => checkSupported(record, sources, sheets)).toThrow(/species\[water\]: the source "nbs-tables-1982" has no row that names it/)
    record.species.find((s) => s.id === 'water')!.sourceId = 'a-handbook'
    expect(() => checkSupported(record, sources, sheets)).toThrow(/species\[water\]: unknown source "a-handbook"/)
  })

  it('refuses a stored figure its source\'s row does not print, digit for digit, and reads a printed minus sign as the stored hyphen', () => {
    const record = copy(stored)
    const hydroxide = record.species.find((s) => s.id === 'hydroxide-ion')!.enthalpyOfFormation!
    hydroxide.published = '-229.99'
    expect(() => checkSupported(record, sources, sheets)).toThrow(/species\[hydroxide-ion\]\.enthalpyOfFormation: the source "nbs-tables-1982" has no row that prints -229\.99 for it/)
    hydroxide.published = '-229.994'
    const printed = copy(sources)
    printed.find((s) => s.id === 'nbs-tables-1982')!.supports.find((row) => row.prints === '-229.994')!.prints = '−229.994'
    expect(() => checkSupported(record, printed, sheets)).not.toThrow()
    hydroxide.published = 'about -230'
    expect(() => checkSupported(record, sources, sheets)).toThrow(/is not a plain decimal/)
  })

  it('refuses a row left behind for a value that no longer cites its source, and a source that supports nothing', () => {
    const record = copy(stored)
    record.observations = record.observations.filter((o) => o.productId !== 'barium-sulfate')
    expect(() => checkSupported(record, sources, sheets)).toThrow(/the source "birk-barium" has a row for observations\[barium-sulfate\], which does not cite it/)
    const emptied = copy(sources)
    emptied.find((s) => s.id === 'flowers-chem2e-4.4')!.supports = []
    expect(() => checkSupported(stored, emptied, sheets)).toThrow(/the source "flowers-chem2e-4\.4" supports nothing/)
  })

  it('lets a caution cite a safety data sheet only where a reagent\'s hazards cite that sheet', () => {
    expect(stored.cautions.hotTube).toMatchObject({ sourceId: 'flinn-sds-395', alsoSourceId: 'flinn-sds-735' })
    const record = copy(stored)
    for (const reagent of record.reagents) if (reagent.hazards.sourceId === 'flinn-sds-395') reagent.hazards.sourceId = 'flinn-sds-734'
    for (const reagent of record.reagents) if (reagent.hazards.note.sourceId === 'flinn-sds-395') reagent.hazards.note.sourceId = 'flinn-sds-734'
    expect(() => checkSupported(record, sources, sheets)).toThrow(/cautions\.hotTube: cites the safety data sheet "flinn-sds-395", which no reagent's hazards cite/)
  })
})

describe('checkReagents', () => {
  it('accepts the fifteen reagents against PubChem\'s kept table', () => {
    expect(() => checkReagents(input, properties)).not.toThrow()
    expect(properties.PropertyTable.Properties.length).toBe(12)
  })

  it('refuses a CID the table does not hold, a composition that is not the table\'s formula, and a molar mass that is not its figure', () => {
    const withReagent = (id: string, edit: (reagent: (typeof input.reagents)[number]) => void) => {
      const record = copy(input)
      edit(record.reagents.find((r) => r.id === id)!)
      return record
    }
    expect(() => checkReagents(withReagent('mg', (r) => void (r.pubchemCid = 962)), properties)).toThrow(/reagent "mg": PubChem's table has no row for CID 962/)
    expect(() => checkReagents(withReagent('fecl3-0.5m', (r) => void (r.speciesId = 'iron-ii-hydroxide')), properties)).toThrow(/gives CID 24380 the formula Cl3Fe, which is not the composition stored for "iron-ii-hydroxide"/)
    expect(() => checkReagents(withReagent('caco3', (r) => void (r.molarMass = { value: 100.1, published: '100.1', sourceId: 'pubchem-aqueous-reagents' })), properties)).toThrow(/as 100\.09, not the stored 100\.1/)
    expect(() => checkReagents(withReagent('caco3', (r) => void (r.molarMass!.value = 100.1)), properties)).toThrow(/as 100\.09/)
  })
})

describe('mergeHazards', () => {
  const never = { 'hcl-1m': ['H331'], 'hcl-3m': ['H331'], 'hcl-6m': ['H331'] }
  const merge = (edit: (file: Record<string, Entry>, sheets: Sheet[]) => void = () => {}) => {
    const [file, list] = [copy(hazards) as Record<string, Entry>, copy(sheets)]
    edit(file, list)
    return mergeHazards(input.reagents, file, list, never)
  }

  it('gives each of the fifteen reagents the heading and the hazards hazards.json stores for it, as the generated record has them', () => {
    expect(merge()).toEqual(stored.reagents)
  })

  it('refuses a file that leaves a reagent out or names one the lab has not', () => {
    expect(() => merge((file) => void delete file.mg)).toThrow(/hazards\.json: expected exactly the keys/)
    expect(() => merge((file) => void (file.water = file.mg!))).toThrow(/hazards\.json: expected exactly the keys/)
  })

  it('holds the statements and the signal word to the rows of the sheet the reagent cites', () => {
    expect(() => merge((file) => void (file['naoh-6m']!.hazards.statements[0] = 'H314: Causes severe skin burns'))).toThrow(/the source "flinn-sds-734" prints "Causes severe skin burns and eye damage \(H314\)" for naoh-6m\.hazards\.statements\[0\]/)
    expect(() => merge((file) => void file['naoh-6m']!.hazards.statements.pop())).toThrow(/has rows for 2 statements of naoh-6m\.hazards and the record stores 1/)
    expect(() => merge((file) => void (file.mg!.hazards.signalWord = 'Warning'))).toThrow(/prints the signal word "DANGER", not "Warning"/)
    expect(() => merge((file) => void (file['hcl-3m']!.hazards.sourceId = 'flinn-sds-734'))).toThrow(/the source "flinn-sds-734" has no row for hcl-3m\.classifiedAs/)
    expect(() => merge((file) => void (file.mg!.hazards.sourceId = 'a-sheet'))).toThrow(/hazards\.json: mg\.hazards: unknown source "a-sheet"/)
  })

  it('stores None for a sheet that prints no signal word and no hazard statement, and refuses any other word for it', () => {
    expect(hazards.caco3.hazards).toMatchObject({ signalWord: 'None', statements: [] })
    expect(() => merge((file) => void (file.caco3!.hazards.signalWord = 'Warning'))).toThrow(/prints the signal word "", not "Warning"/)
    expect(() => merge((file) => void file.caco3!.hazards.statements.push('H315: Causes skin irritation'))).toThrow(/has rows for 0 statements of caco3\.hazards and the record stores 1/)
  })

  it("keeps the gas's H331 off every bottle of the acid, even where the sheet's rows were to print it", () => {
    expect(() =>
      merge((file, list) => {
        file['hcl-1m']!.hazards.statements[1] = 'H331: Toxic if inhaled'
        list.find((s) => s.id === 'flinn-sds-395')!.supports.find((row) => row.field === 'hcl-1m.hazards.statements[1]')!.prints = 'Toxic if inhaled (H331)'
      }),
    ).toThrow(/hcl-1m\.hazards\.statements\[1\] carries the code H331, which this bottle must not carry/)
  })

  it('wants a row of its own for each sheet a note rests on, and two different sheets where it names two', () => {
    expect(() => merge((file) => void (file['naoh-1m']!.hazards.note.sourceId = 'flinn-sds-468'))).toThrow(/the source "flinn-sds-468" has no row for naoh-1m\.hazards\.note/)
    expect(() => merge((file) => void (file['naoh-6m']!.hazards.note.alsoSourceId = 'flinn-sds-735'))).toThrow(/alsoSourceId names "flinn-sds-735", the source the note already cites/)
    expect(() => merge((file) => void (file.mg!.hazards.note.value = ' '))).toThrow(/the note is empty/)
    expect(() => merge((file) => void (file.mg!.classifiedAs = ''))).toThrow(/classifiedAs is empty/)
  })

  it('refuses a sheet listed with a kept copy, and hazards written into the lab\'s own record', () => {
    expect(() => merge((_, list) => void (list.find((s) => s.id === 'flinn-sds-468')!.file = 'sds_468.pdf'))).toThrow(/cited as read and not kept/)
    expect(() => mergeHazards(stored.reagents, hazards, sheets, never)).toThrow(/its hazards belong in hazards\.json/)
  })

  it('works on a small fixture of its own: one reagent, one sheet', () => {
    const sheet: Sheet = {
      id: 'sheet',
      url: 'https://example.org/sheet',
      citation: 'A sheet',
      supports: [
        { field: 'salt.classifiedAs', prints: 'Salt', where: 'The title.' },
        { field: 'salt.hazards.signalWord', prints: 'WARNING', where: 'Under the title.' },
        { field: 'salt.hazards.statements[0]', prints: 'Causes serious eye irritation (H319)', where: 'Section 2.' },
        { field: 'salt.hazards.note', prints: 'Salt', where: 'The title.' },
      ],
    }
    const entry: Entry = { classifiedAs: 'Hazards of salt', hazards: { signalWord: 'Warning', statements: ['H319: Causes serious eye irritation'], note: { value: 'A dilute solution.', sourceId: 'sheet' }, sourceId: 'sheet' } }
    expect(mergeHazards([{ id: 'salt', name: 'Salt', sourceId: 'record' }], { salt: entry }, [sheet])).toEqual([{ id: 'salt', name: 'Salt', classifiedAs: 'Hazards of salt', hazards: entry.hazards, sourceId: 'record' }])
  })
})

describe('newSources', () => {
  it("adds the lab's own sources whole, and of the sheets only those the titration lab did not already cite", () => {
    const first = earlier.sources.map(({ id, url, citation }) => ({ id, url, citation }))
    const own = newSources(sources, first, 'the manifest')
    expect(own.length).toBe(sources.length)
    const added = newSources(sheets, [...first, ...own], 'the hazard manifest')
    const shared = sheets.filter((sheet) => first.some((s) => s.id === sheet.id)).map((s) => s.id)
    expect(shared).toEqual(['flinn-sds-395', 'flinn-sds-395.2', 'flinn-sds-734'])
    expect(added.map((s) => s.id)).toEqual(sheets.map((s) => s.id).filter((id) => !shared.includes(id)))
  })

  it('refuses an id already in use for another address or citation, an id given twice, and a source with no citation', () => {
    const [one] = sources
    expect(() => newSources([one!], [{ ...one!, citation: 'Another reading of it' }], 'the manifest')).toThrow(/the source id "flowers-chem2e-4\.2-solubility" is already in use for another address or citation/)
    expect(() => newSources([one!, one!], [], 'the manifest')).toThrow(/the manifest repeats a source id/)
    expect(() => newSources([{ ...one!, citation: ' ' }], [], 'the manifest')).toThrow(/needs an id, a url and a citation/)
  })
})

describe('the manifest', () => {
  it('keeps one copy, PubChem\'s table, and says of every other source that it was read and not kept', () => {
    expect(sources.filter((s) => s.file !== undefined).map((s) => s.id)).toEqual(['pubchem-aqueous-reagents'])
    for (const source of sources.filter((s) => s.file === undefined)) expect(source.citation, source.id).toMatch(/not kept|no copy is kept/)
  })

  it('says nothing about a licence in the citation of any OpenStax page, and gives those pages ids of their own', () => {
    const pages = sources.filter((s) => s.url.includes('openstax.org'))
    expect(pages.length).toBe(10)
    for (const page of pages) {
      expect(page.id).toMatch(/^flowers-chem2e-\d+\.\d+(-solubility)?$/)
      expect(page.citation).not.toMatch(/licen[cs]e|CC BY|creativecommons/i)
      expect(page.citation).toContain('Access for free at https://openstax.org/books/chemistry-2e/pages/1-introduction')
    }
  })

  it('gives every row something its source prints and where that is, and names each value in one row or two', () => {
    for (const source of sources) {
      for (const row of source.supports) {
        expect(row.fields.length, source.id).toBeGreaterThan(0)
        expect(row.prints.trim(), source.id).not.toBe('')
        expect(row.where.length, source.id).toBeGreaterThan(30)
      }
    }
  })
})
