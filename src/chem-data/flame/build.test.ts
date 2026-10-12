import { describe, expect, it } from 'vitest'
import emissionManifest from '../../../docs/research/emission-spectra/sources/MANIFEST.json'
import input from '../../../docs/research/flame/flame.json'
import hazards from '../../../docs/research/flame/hazards.json'
import hazardManifest from '../../../docs/research/flame/sources/hazard-manifest.json'
import manifest from '../../../docs/research/flame/sources/MANIFEST.json'
import allSources from '../sources.json'
import stored from './flame.json'

// The checks scripts/build-chem-data.mjs runs on the flame test lab's record: against its manifest of sources,
// against the saved NIST tables, and, for the bottles' hazards, whose documents are not kept, against the hazard
// manifest's account of each. They are tested here on the real inputs and on inputs they must refuse. The checks
// of the manifests and the merge are the aqueous lab's (scripts/aqueous-lib.mjs), which that lab's tests cover on
// its own inputs; what is tested here is that they hold this record, and what this lab added to them.
type Row = { fields: string[]; prints: string; where: string }
type Source = { id: string; url: string; citation: string; file?: string; sha256?: string; supports: Row[] }
type Sheet = { id: string; url: string; citation: string; file?: string; supports: { field: string; prints: string; where: string }[] }
type Note = { value: string; sourceId: string; alsoSourceId?: string; moreSourceIds?: string[] }
type Entry = { classifiedAs: string; hazards: { signalWord: string; statements: string[]; note: Note; sourceId: string } }
type Listed = { id: string; url: string; citation: string }
type Lib = {
  citations(record: unknown): { key: string; sourceId: string; published?: string }[]
  checkSupported(record: unknown, sources: Source[], sheets?: Sheet[]): void
  mergeHazards(reagents: unknown[], hazards: Record<string, Entry>, sheets: Sheet[]): { id: string; classifiedAs: string; hazards: Entry['hazards'] }[]
  newSources(sources: Listed[], earlier: Listed[], where: string): Listed[]
}
type FlameLib = { checkFlameLines(record: unknown, tableOf: (sourceId: string, symbol: string) => string | undefined, range: { min: number; max: number }): void }
const [lib] = Object.values(import.meta.glob<Lib>('../../../scripts/aqueous-lib.mjs', { eager: true }))
const [flameLib] = Object.values(import.meta.glob<FlameLib>('../../../scripts/flame-lib.mjs', { eager: true }))
const { citations, checkSupported, mergeHazards, newSources } = lib!
const { checkFlameLines } = flameLib!

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const sources: Source[] = manifest.sources
const sheets: Sheet[] = hazardManifest.sources
const SCALE = { min: 400, max: 780 }

const tables = {
  ...import.meta.glob<string>('../../../docs/research/emission-spectra/sources/nist-asd-lines-*.txt', { eager: true, query: '?raw', import: 'default' }),
  ...import.meta.glob<string>('../../../docs/research/flame/sources/nist-asd-lines-*.txt', { eager: true, query: '?raw', import: 'default' }),
}
const file = (name: string) => Object.entries(tables).find(([path]) => path.endsWith(`/${name}`))?.[1]
/** The saved table a citation names, as the build finds it. */
const tableOf = (sourceId: string, symbol: string) =>
  sourceId === 'nist-asd-lines-neutral' ? file(emissionManifest.files.find((f) => f.symbol === symbol && f.query === 'neutral-visible')!.file) : sourceId === 'nist-asd-lines-k-700-780' && symbol === 'K' ? file('nist-asd-lines-k-700-780.txt') : undefined

describe('checkFlameLines', () => {
  const check = (edit: (record: typeof input) => void = () => {}) => {
    const record = copy(input)
    edit(record)
    return checkFlameLines(record, tableOf, SCALE)
  }
  const line = (record: typeof input, saltIndex: number, featureIndex: number) => record.salts[saltIndex]!.features[featureIndex] as { wavelengthNm: { value: number; published: string; sourceId: string }; pairedWithNm?: { value: number; published: string; sourceId: string }; emitter: { kind: string; symbol?: string } }

  it('accepts the record as authored: nine lines, each printed in a saved table of its own metal', () => {
    expect(() => check()).not.toThrow()
  })

  it('refuses a line whose digits no saved table of that metal prints, however near, and a stored number that is not the digits', () => {
    expect(() => check((r) => void (line(r, 4, 0).wavelengthNm.published = '588.9951'))).toThrow(/salts\[nacl-0.1m\]\.features\[na-589\]\.wavelengthNm: the saved table of Na I prints no line at 588.9951 nm/)
    expect(() => check((r) => void (line(r, 4, 0).pairedWithNm!.published = '589.6'))).toThrow(/features\[na-589\]\.pairedWithNm: the saved table of Na I prints no line at 589.6 nm/)
    expect(() => check((r) => void (line(r, 4, 0).wavelengthNm.value = 589))).toThrow(/the stored 589 is not the printed 588.995095/)
    // Sodium's line is in sodium's table and no other's.
    expect(() => check((r) => void Object.assign(line(r, 3, 1).wavelengthNm, { value: 588.995095, published: '588.995095' }))).toThrow(/the saved table of K I prints no line at 588.995095 nm/)
  })

  it('refuses a line beyond 700 nm that cites the tables of 400 to 700 nm, and a source that keeps no table of the metal', () => {
    expect(() => check((r) => void (line(r, 3, 0).wavelengthNm.sourceId = 'nist-asd-lines-neutral'))).toThrow(/features\[k-766\]\.wavelengthNm: the saved table of K I prints no line at 766.489913 nm/)
    expect(() => check((r) => void (line(r, 0, 1).wavelengthNm.sourceId = 'nist-asd-lines-k-700-780'))).toThrow(/the source "nist-asd-lines-k-700-780" keeps no table of Ba I/)
    expect(() => check((r) => void (line(r, 0, 1).wavelengthNm.sourceId = 'human-zeegers-1975'))).toThrow(/the source "human-zeegers-1975" keeps no table of Ba I/)
  })

  it("refuses a line given to a molecule, or to an atom that is not the salt's metal", () => {
    expect(() => check((r) => void (line(r, 0, 1).emitter = { kind: 'molecule' }))).toThrow(/features\[ba-553\]: a line is an atom's, and this one names no atom/)
    expect(() => check((r) => void (line(r, 0, 1).emitter.symbol = 'Na'))).toThrow(/the line is given to Na, which is not this salt's metal/)
  })
})

describe('checkSupported, on the flame record', () => {
  it('accepts the record as built: every value has a row of its source, and every row a value', () => {
    expect(() => checkSupported(stored, sources, sheets)).not.toThrow()
  })

  it('names the places of this record as the manifest rows do, a note\'s third and fourth sources among them', () => {
    const keys = citations(stored)
    expect(keys.filter((c) => c.key === 'salts[kcl-0.1m].features[k-766].wavelengthNm')).toEqual([{ key: 'salts[kcl-0.1m].features[k-766].wavelengthNm', sourceId: 'nist-asd-lines-k-700-780', published: '766.489913' }])
    expect(keys.filter((c) => c.key === 'closing.answer').map((c) => c.sourceId)).toEqual(['kirchhoff-bunsen-1860'])
    const { note } = stored.salts[0]!.hazards
    expect(keys.filter((c) => c.key === 'salts[bacl2-0.1m].hazards.note').map((c) => c.sourceId)).toEqual([note.sourceId, note.alsoSourceId, ...(note.moreSourceIds ?? [])])
  })

  it('refuses a feature that cites a source with no row for it, a stored wavelength no row prints, and a row left behind', () => {
    const record = copy(stored)
    record.salts[1]!.features[0]!.sourceId = 'chemguide-flame-tests'
    expect(() => checkSupported(record, sources, sheets)).toThrow(/salts\[cacl2-0.1m\]\.features\[caoh-orange-red\]: the source "chemguide-flame-tests" has no row that names it/)
    const rows = copy(sources)
    rows.find((s) => s.id === 'nist-asd-lines-k-700-780')!.supports[0]!.prints = '766.4899'
    expect(() => checkSupported(stored, rows, sheets)).toThrow(/features\[k-766\]\.wavelengthNm: the source "nist-asd-lines-k-700-780" has no row that prints 766.489913 for it/)
    const fewer = copy(stored)
    fewer.salts[0]!.leftOut.pop()
    expect(() => checkSupported(fewer, sources, sheets)).toThrow(/the source "human-zeegers-1975" has a row for salts\[bacl2-0.1m\]\.leftOut\[1\], which does not cite it/)
  })

  it("holds a bottle's hazards to the hazard manifest and not to the lab's own: a document under a note needs no row here", () => {
    const record = copy(stored)
    record.salts[0]!.appearance.sourceId = record.salts[0]!.hazards.note.alsoSourceId!
    // Outside the hazards, a document of the hazard manifest may be cited where a bottle's hazards cite it.
    expect(() => checkSupported(record, sources.map((s) => (s.id === 'flinn-sds-94.01' ? { ...s, supports: s.supports.slice(0, 1) } : s)), sheets)).not.toThrow()
    record.salts[0]!.appearance.sourceId = 'a-sheet'
    expect(() => checkSupported(record, sources, sheets)).toThrow(/salts\[bacl2-0.1m\]\.appearance: unknown source "a-sheet"/)
  })
})

describe('mergeHazards, on the flame record', () => {
  const merge = (edit: (file: Record<string, Entry>, sheets: Sheet[]) => void = () => {}) => {
    const [entries, list] = [copy(hazards) as Record<string, Entry>, copy(sheets)]
    edit(entries, list)
    return mergeHazards(input.salts, entries, list)
  }

  it('gives each of the six solutions the heading and the hazards hazards.json stores for it, as the generated record has them', () => {
    expect(merge()).toEqual(stored.salts)
  })

  it('refuses a file that leaves a solution out, and statements that are not the rows of the sheet cited', () => {
    expect(() => merge((entries) => void delete entries['kcl-0.1m'])).toThrow(/hazards\.json: expected exactly the keys/)
    expect(() => merge((entries) => void entries['bacl2-0.1m']!.hazards.statements.pop())).toThrow(/has rows for 2 statements of bacl2-0.1m\.hazards and the record stores 1/)
    expect(() => merge((entries) => void (entries['srcl2-0.1m']!.hazards.signalWord = 'Warning'))).toThrow(/prints the signal word "DANGER", not "Warning"/i)
  })

  it('takes a note that rests on more than two documents: the third and any after it in moreSourceIds, each with a row of its own for the note', () => {
    // Most notes of this lab rest on more than two, and none names a third source without a second.
    const notes = Object.values(hazards as Record<string, Entry>).map((entry) => entry.hazards.note)
    expect(notes.filter((note) => note.moreSourceIds !== undefined).length).toBeGreaterThan(3)
    for (const note of notes) if (note.moreSourceIds !== undefined) expect(note.alsoSourceId).toBeDefined()
    expect(() => merge((entries) => void entries['bacl2-0.1m']!.hazards.note.moreSourceIds!.push('flinn-sds-722'))).toThrow(/the source "flinn-sds-722" has no row for bacl2-0.1m\.hazards\.note/)
    expect(() => merge((entries) => void entries['bacl2-0.1m']!.hazards.note.moreSourceIds!.push('a-sheet'))).toThrow(/hazards\.json: bacl2-0.1m\.hazards\.note: unknown source "a-sheet"/)
  })

  it('refuses moreSourceIds that is empty, that stands without a second source, or that names a source the note already cites', () => {
    expect(() => merge((entries) => void (entries['bacl2-0.1m']!.hazards.note.moreSourceIds = []))).toThrow(/moreSourceIds is for the sources after the second/)
    expect(() => merge((entries) => void delete entries['bacl2-0.1m']!.hazards.note.alsoSourceId)).toThrow(/moreSourceIds is for the sources after the second/)
    expect(() => merge((entries) => void (entries['bacl2-0.1m']!.hazards.note.moreSourceIds = 'noaa-cameo-19847' as unknown as string[]))).toThrow(/moreSourceIds is for the sources after the second/)
    const { note } = (hazards as Record<string, Entry>)['bacl2-0.1m']!.hazards
    for (const again of [note.sourceId, note.alsoSourceId!, note.moreSourceIds![0]!]) {
      expect(() => merge((entries) => void entries['bacl2-0.1m']!.hazards.note.moreSourceIds!.push(again)), again).toThrow(new RegExp(`moreSourceIds names "${again}", a source the note already cites`))
    }
    // A note is its words, however they are set out: paragraphs with a blank line between them are taken as they are.
    expect(merge((entries) => void (entries['bacl2-0.1m']!.hazards.note.value = 'One.\n\nTwo.\n\nThree.'))[0]!.hazards.note.value).toBe('One.\n\nTwo.\n\nThree.')
  })

  // Swallowing is the hazard the bottle's statements name first. The note once left the second supplier's first aid for it out, to keep to a length.
  it("carries in barium's note, in its second paragraph, the second supplier's first aid for swallowing, with a row of that sheet for it and none that says it was left out; and the note keeps to a length", () => {
    const { note } = (hazards as Record<string, Entry>)['bacl2-0.1m']!.hazards
    const second = note.value.split('\n\n')[1]!
    expect(second).toMatch(/If any is swallowed, .*a doctor or a poison centre .*at once/)
    const rows = sheets.find((sheet) => sheet.id === note.alsoSourceId)!.supports
    expect(rows.filter((row) => row.prints === 'INGESTION').map((row) => row.field)).toEqual(['bacl2-0.1m.hazards.note'])
    for (const row of rows.filter((row) => row.field.endsWith('.notCarried'))) expect(row.where, row.prints).not.toMatch(/For swallowing/)
    // Six notes, each of three short paragraphs; the longest is barium's.
    for (const entry of Object.values(hazards as Record<string, Entry>)) {
      expect(entry.hazards.note.value.split('\n\n')).toHaveLength(3)
      expect(entry.hazards.note.value.split(/\s+/).length).toBeLessThanOrEqual(195)
    }
  })

  it('works on a small fixture of its own: one salt, a note that rests on three documents', () => {
    const sheet = (id: string, rows: string[]): Sheet => ({ id, url: `https://example.org/${id}`, citation: `Document ${id}`, supports: rows.map((field) => ({ field, prints: field.endsWith('signalWord') ? 'WARNING' : field.endsWith('statements[0]') ? 'Causes serious eye irritation (H319)' : 'Salt', where: 'Somewhere.' })) })
    const list = [sheet('solid', ['salt.classifiedAs', 'salt.hazards.signalWord', 'salt.hazards.statements[0]']), sheet('solution', ['salt.hazards.note']), sheet('second', ['salt.hazards.note']), sheet('record', ['salt.hazards.note'])]
    const entry: Entry = { classifiedAs: 'Hazards of salt', hazards: { signalWord: 'Warning', statements: ['H319: Causes serious eye irritation'], note: { value: 'A dilute solution.', sourceId: 'solution', alsoSourceId: 'second', moreSourceIds: ['record'] }, sourceId: 'solid' } }
    expect(mergeHazards([{ id: 'salt', name: 'Salt', sourceId: 'own' }], { salt: entry }, list)).toEqual([{ id: 'salt', name: 'Salt', classifiedAs: 'Hazards of salt', hazards: entry.hazards, sourceId: 'own' }])
    expect(() => mergeHazards([{ id: 'salt', sourceId: 'own' }], { salt: entry }, list.slice(0, 3))).toThrow(/hazards\.json: salt\.hazards\.note: unknown source "record"/)
  })
})

describe('the sources the lab adds', () => {
  const earlier: Listed[] = allSources.filter((s) => !sources.some((own) => own.id === s.id) && !sheets.some((sheet) => sheet.id === s.id))
  const emission = allSources.find((s) => s.id === 'nist-asd-lines-neutral')!
  const aqueousSheets = allSources.filter((s) => ['flinn-sds-94', 'flinn-sds-94.01'].includes(s.id))

  it('lists once a source another lab lists too: the emission spectra\'s tables and the two sheets the aqueous lab read', () => {
    const own = newSources(sources, [...earlier, emission, ...aqueousSheets], 'flame MANIFEST.json')
    expect(sources.length - own.length).toBe(2)
    expect(own.some((s) => s.id === 'nist-asd-lines-neutral' || s.id === 'flinn-sds-94.01')).toBe(false)
    const added = newSources(sheets, [...earlier, emission, ...aqueousSheets, ...own], 'flame hazard-manifest.json')
    // The six solution sheets are in both of this lab's manifests, written alike, and are listed from the first; the solid barium chloride's sheet is the aqueous lab's.
    const shared = sheets.filter((sheet) => sources.some((s) => s.id === sheet.id) || aqueousSheets.some((s) => s.id === sheet.id)).map((sheet) => sheet.id)
    expect(shared).toEqual(expect.arrayContaining(['flinn-sds-94.01', 'flinn-sds-197', 'flinn-sds-281.1', 'flinn-sds-622', 'flinn-sds-722', 'flinn-sds-785']))
    expect(sheets.length - added.length).toBe(shared.length)
    // Of the documents of the hazard manifest, the app lists those a bottle's hazards cite, and not the ones that were read and that no note carries anything from.
    const cited = new Set(stored.salts.flatMap(({ hazards: { sourceId, note } }) => [sourceId, note.sourceId, note.alsoSourceId, ...(note.moreSourceIds ?? [])]))
    const unused = sheets.filter((sheet) => !cited.has(sheet.id))
    for (const sheet of unused) {
      expect(sheet.supports.every((row) => row.field.endsWith('.notCarried')), sheet.id).toBe(true)
      expect(allSources.some((s) => s.id === sheet.id), sheet.id).toBe(false)
    }
    const ids = [...own, ...added.filter((sheet) => cited.has(sheet.id))].map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    // They stand together in the list of sources, in this order, wherever a later lab's come after them.
    const from = allSources.findIndex((s) => s.id === ids[0])
    expect(allSources.slice(from, from + ids.length).map((s) => s.id)).toEqual(ids)
  })

  it('refuses a shared source written differently in the two places', () => {
    expect(() => newSources(sources.map((s) => (s.id === 'nist-asd-lines-neutral' ? { ...s, citation: `${s.citation} Read again.` } : s)), [emission], 'flame MANIFEST.json')).toThrow(/the source id "nist-asd-lines-neutral" is already in use for another address or citation/)
  })
})

describe('the manifest', () => {
  it('keeps one copy, the table of potassium from 700 to 780 nm, and says of every other source that it was read and not kept', () => {
    expect(sources.filter((s) => s.file !== undefined).map((s) => [s.id, s.file])).toEqual([['nist-asd-lines-k-700-780', 'nist-asd-lines-k-700-780.txt']])
    for (const source of sources.filter((s) => s.file === undefined && s.id !== 'nist-asd-lines-neutral')) expect(source.citation, source.id).toMatch(/not kept|no copy is kept/)
  })

  it('cites no OpenStax page, and marks no source as a secondary one: none is', () => {
    for (const source of [...sources, ...sheets]) expect(`${source.url} ${source.citation}`, source.id).not.toMatch(/openstax|wikipedia/i)
  })

  it('gives every row something its source prints and where that is, in no more than five words of the source running', () => {
    for (const source of sources) {
      expect(source.supports.length, source.id).toBeGreaterThan(0)
      for (const row of source.supports) {
        expect(row.fields.length, source.id).toBeGreaterThan(0)
        expect(row.prints.trim(), source.id).not.toBe('')
        expect(row.where.length, source.id).toBeGreaterThan(30)
        // A title or a heading is a label and may be longer; anything else printed is a figure, a formula or a few words.
        if (!row.fields.includes('primer') && !/^salts\[[^\]]+\]$/.test(row.fields[0]!)) expect((row.prints.match(/\p{L}+/gu) ?? []).length, `${source.id}: ${row.prints}`).toBeLessThanOrEqual(5)
      }
    }
  })
})
