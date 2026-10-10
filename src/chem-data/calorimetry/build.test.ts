import { describe, expect, it } from 'vitest'
import input from '../../../docs/research/calorimetry/calorimetry.json'
import hazards from '../../../docs/research/calorimetry/hazards.json'
import hazardManifest from '../../../docs/research/calorimetry/sources/hazard-manifest.json'
import manifest from '../../../docs/research/calorimetry/sources/MANIFEST.json'
import aqueousHazards from '../../../docs/research/phase-4/hazards.json'
import aqueousHazardManifest from '../../../docs/research/phase-4/sources/hazard-manifest.json'
import properties from '../../../docs/research/phase-4/sources/pubchem-aqueous-reagents.json'
import periodicTable from '../periodic-table.json'
import allSources from '../sources.json'
import stored from './calorimetry.json'

// The checks scripts/build-chem-data.mjs runs on the calorimetry lab's record: against its manifest of sources,
// against the copies other labs keep, on the values it works out from cited ones and, for the reagents' hazards,
// whose documents are not kept, against the hazard manifests' account of each. They are tested here on the real
// inputs and on inputs they must refuse. The checks of the manifests and the merge are the aqueous lab's
// (scripts/aqueous-lib.mjs), which that lab's tests cover on its own inputs; what is tested here is that they
// hold this record, and what this lab added to them (scripts/calorimetry-lib.mjs).
type Row = { fields: string[]; prints: string; where: string }
type Source = { id: string; url: string; citation: string; file?: string; supports: Row[] }
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
type OwnLib = {
  threeFigures(value: number): number
  checkWorkedOut(record: unknown): void
  checkMolarMasses(record: unknown, table: unknown, properties: unknown): void
  withSharedHazards(own: Record<string, Entry>, other: Record<string, Entry>, sharedIds: string[]): Record<string, Entry>
  withSharedSheets(own: Sheet[], other: Sheet[]): Sheet[]
}
const [lib] = Object.values(import.meta.glob<Lib>('../../../scripts/aqueous-lib.mjs', { eager: true }))
const [ownLib] = Object.values(import.meta.glob<OwnLib>('../../../scripts/calorimetry-lib.mjs', { eager: true }))
const { citations, checkSupported, mergeHazards, newSources } = lib!
const { threeFigures, checkWorkedOut, checkMolarMasses, withSharedHazards, withSharedSheets } = ownLib!

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const sources: Source[] = manifest.sources
const SHARED = ['hcl-1m', 'naoh-1m']
const sheets = withSharedSheets(hazardManifest.sources, aqueousHazardManifest.sources)
const allHazards = () => withSharedHazards(copy(hazards) as Record<string, Entry>, aqueousHazards as Record<string, Entry>, SHARED)
type Input = typeof input
const edited = (edit: (record: Input) => void) => {
  const record = copy(input)
  edit(record)
  return record
}

describe('checkWorkedOut', () => {
  it('accepts the record as authored', () => {
    expect(() => checkWorkedOut(input)).not.toThrow()
    expect([0.902453, 0.449458, 0.388498, 0.227361, 0.3885, 1234.5].map(threeFigures)).toEqual([0.902, 0.449, 0.388, 0.227, 0.389, 1230])
  })

  it("refuses a specific heat that is not the metal's molar heat capacity over its molar mass, to three figures", () => {
    const zinc = (record: Input) => record.reagents[5] as { specificHeat: { value: number; working: string }; molarHeatCapacity: { value: number; published: string } }
    expect(() => checkWorkedOut(edited((r) => void (zinc(r).specificHeat.value = 0.389)))).toThrow(/reagents\[zinc-piece\]\.specificHeat: 0.389 is not 25.4 ÷ 65.38 to three significant figures/)
    expect(() => checkWorkedOut(edited((r) => void Object.assign(zinc(r).molarHeatCapacity, { value: 25.39, published: '25.39' })))).toThrow(/the working does not show 25.39/)
    expect(() => checkWorkedOut(edited((r) => void (zinc(r).specificHeat.working = '25.40 ÷ 65.38 = 0.389')))).toThrow(/the working does not show 0.388/)
  })

  it('refuses an enthalpy that is not the sum of its terms, at either strength, and a working that leaves a term out', () => {
    expect(() => checkWorkedOut(edited((r) => void (r.parts[0]!.enthalpy!.value = -55.836)))).toThrow(/parts\[neutralisation\]\.enthalpy: -55.836 is not the sum of its terms, -57.706/)
    expect(() => checkWorkedOut(edited((r) => void (r.parts[1]!.enthalpy!.infiniteDilution.value = 28.05)))).toThrow(/parts\[dissolving\]\.enthalpy\.infiniteDilution: 28.05 is not the sum of its terms, 25.69/)
    expect(() => checkWorkedOut(edited((r) => void (r.parts[1]!.enthalpy!.terms[0]!.coefficient = -1)))).toThrow(/parts\[dissolving\]\.enthalpy: 24.405 is not the sum of its terms/)
    expect(() => checkWorkedOut(edited((r) => void (r.parts[0]!.enthalpy!.working = '−57.706 kJ')))).toThrow(/the working does not show -407.066/)
  })
})

describe('checkMolarMasses', () => {
  const check = (edit: (record: Input) => void = () => {}) => checkMolarMasses(edited(edit), periodicTable, properties)
  const molarMass = (record: Input, index: number) => (record.reagents[index] as { molarMass: { value: number; published: string; sourceId: string } }).molarMass

  it('accepts the record as authored: four atomic weights of the periodic table and one molecular weight of the kept table', () => {
    expect(() => check()).not.toThrow()
  })

  it("refuses a metal's molar mass that is not the periodic table's figure, from the periodic table's source", () => {
    expect(() => check((r) => void Object.assign(molarMass(r, 5), { value: 65.37, published: '65.37' }))).toThrow(/reagents\[zinc-piece\]: the periodic table gives Zn the atomic weight 65.38 from "ciaaw-abridged-2024", not the stored 65.37/)
    expect(() => check((r) => void (molarMass(r, 4).sourceId = 'nbs-tables-1982'))).toThrow(/reagents\[iron-piece\]: the periodic table gives Fe the atomic weight 55.845/)
    expect(() => check((r) => void (r.reagents[6]!.formula = 'Xx'))).toThrow(/reagents\[tin-piece\]: no element "Xx" in the periodic table/)
  })

  it("refuses a compound that the kept table has no row for, and a molar mass that is not the table's", () => {
    expect(() => check((r) => void Object.assign(molarMass(r, 2), { value: 80.04, published: '80.04' }))).toThrow(/reagents\[nh4no3-solid\]: PubChem gives the molecular weight of CID 22985 as 80.044, not the stored 80.04/)
    expect(() => check((r) => void ((r.reagents[0] as { pubchemCid: number }).pubchemCid = 1))).toThrow(/reagents\[hcl-1m\]: PubChem's table has no row for CID 1/)
  })
})

describe("the reagents' hazards", () => {
  it("are this lab's five with the aqueous reactions lab's two, taken unchanged, and the documents of both", () => {
    expect(Object.keys(hazards)).toEqual(['nh4no3-solid', 'aluminium-piece', 'iron-piece', 'zinc-piece', 'tin-piece'])
    const all = allHazards()
    expect(Object.keys(all).sort()).toEqual([...input.reagents.map((r) => r.id)].sort())
    for (const id of SHARED) expect(all[id]).toEqual((aqueousHazards as Record<string, Entry>)[id])
    expect(() => withSharedHazards({ ...copy(hazards), 'hcl-1m': all['hcl-1m']! } as Record<string, Entry>, aqueousHazards as Record<string, Entry>, SHARED)).toThrow(/"hcl-1m" carries another lab's record and has no entry here/)
    expect(() => withSharedHazards(copy(hazards) as Record<string, Entry>, {}, SHARED)).toThrow(/the other lab's hazards.json has no entry for "hcl-1m"/)
    // A sheet both labs read is this lab's entry of it: the two sheets for ammonium nitrate.
    const twice = hazardManifest.sources.filter((sheet) => aqueousHazardManifest.sources.some((other) => other.id === sheet.id)).map((sheet) => sheet.id)
    expect(twice).toEqual(['flinn-sds-61', 'flinn-sds-61.5'])
    expect(sheets.length).toBe(hazardManifest.sources.length + aqueousHazardManifest.sources.length - twice.length)
    for (const id of twice) expect(sheets.find((sheet) => sheet.id === id)).toBe(hazardManifest.sources.find((sheet) => sheet.id === id))
  })

  it('merge into the stored record, each held to the rows of the documents behind it', () => {
    const merged = mergeHazards(input.reagents, allHazards(), sheets)
    expect(merged).toEqual(stored.reagents)
    expect(() => mergeHazards(input.reagents, copy(hazards) as Record<string, Entry>, sheets)).toThrow(/hazards\.json: expected exactly the keys hcl-1m, naoh-1m, nh4no3-solid/)
    const without = sheets.filter((sheet) => sheet.id !== 'flinn-sds-395.2')
    expect(() => mergeHazards(input.reagents, allHazards(), without)).toThrow(/hazards\.json: hcl-1m\.hazards\.note: unknown source "flinn-sds-395.2"/)
  })

  it('carry no line on drains under ammonium nitrate: the sentence is struck, and its row and the row it leaned on are rows of what was read and not carried', () => {
    const { note } = (hazards as Record<string, Entry>)['nh4no3-solid']!.hazards
    expect(note.value).not.toMatch(/drain|federal|reporting rule/)
    expect(note.value.split('\n\n')).toHaveLength(3)
    const rows = hazardManifest.sources.find((sheet) => sheet.id === 'fisher-sds-nh4no3')!.supports
    const drains = rows.find((row) => row.prints === 'Do not empty into drains.')!
    expect(drains.field).toBe('nh4no3-solid.notCarried')
    expect(drains.where).toMatch(/^Read and not carried\. .*Why: it is this supplier's stock line\./)
    expect(drains.where).toContain('no document read for this lab classes the salt as a hazard to the environment')
    expect(rows.find((row) => row.prints === 'SARA 313')!.field).toBe('nh4no3-solid.notCarried')
    // No row of any document still says that the note carries the line.
    for (const sheet of hazardManifest.sources) for (const row of sheet.supports) if (row.field.startsWith('nh4no3-solid')) expect(row.where, `${sheet.id}: ${row.prints}`).not.toMatch(/The note (has|carries) (it|the third supplier's line)/)
    // Zinc is another matter: a sheet read classes it as very toxic to life in water, and its note keeps it out of drains.
    expect((hazards as Record<string, Entry>)['zinc-piece']!.hazards.note.value).toContain('it is kept out of drains and waterways')
  })

  it('give each of the four metals a record of its own, so that a page can show the four together and then the one', () => {
    for (const id of input.parts[2]!.candidateIds!) {
      const metal = stored.reagents.find((r) => r.id === id)!
      expect(metal.classifiedAs, id).toMatch(/^Hazards of \w+ metal/)
      expect(metal.hazards.note.value.split('\n\n'), id).toHaveLength(3)
    }
  })
})

describe('checkSupported, on this record', () => {
  const merged = () => ({ ...copy(input), reagents: mergeHazards(input.reagents, allHazards(), sheets) })

  it('accepts the record with its manifest: every value that cites a source has a row of that source, and every row a value', () => {
    expect(() => checkSupported(merged(), sources, sheets)).not.toThrow()
    // Every published figure of the record is one a row prints.
    const published = citations(input).filter((c) => c.published !== undefined)
    expect(published.length).toBe(20)
  })

  it('refuses a figure no row prints, a value with no row, and a row for a value that does not cite its source', () => {
    const record = merged()
    record.parts[1]!.enthalpy!.terms[0]!.enthalpyOfFormation.published = '-341.16'
    expect(() => checkSupported(record, sources, sheets)).toThrow(/parts\[dissolving\]\.enthalpy\.terms\[nh4no3-in-50-water\]\.enthalpyOfFormation: the source "nbs-tables-1982" has no row that prints -341.16 for it/)
    const fewer = copy(sources)
    fewer.find((s) => s.id === 'nist-webbook-water-25c')!.supports = fewer.find((s) => s.id === 'nist-webbook-water-25c')!.supports.filter((row) => !row.fields.includes('water.density'))
    expect(() => checkSupported(merged(), fewer, sheets)).toThrow(/water\.density: the source "nist-webbook-water-25c" has no row that names it/)
    const more = copy(sources)
    more[0]!.supports.push({ fields: ['water.density'], prints: '1', where: 'Nowhere.' })
    expect(() => checkSupported(merged(), more, sheets)).toThrow(/the source "nbs-tables-1982" has a row for water\.density, which does not cite it/)
  })

  it("lets a reagent's look and name rest on a sheet its hazards cite, and on no other sheet", () => {
    const record = merged()
    ;(record.reagents[3] as unknown as { appearance: { sourceId: string } }).appearance.sourceId = 'flinn-sds-416.5'
    expect(() => checkSupported(record, sources, sheets)).toThrow(/reagents\[aluminium-piece\]\.appearance: unknown source "flinn-sds-416.5"/)
  })
})

describe('the sources the lab adds', () => {
  const earlier: Listed[] = allSources.filter((s) => !sources.some((own) => own.id === s.id) && !hazardManifest.sources.some((sheet) => sheet.id === s.id))
  const shared = ['nbs-tables-1982', 'ciaaw-abridged-2024', 'pubchem-aqueous-reagents']
  const before = [...earlier, ...allSources.filter((s) => shared.includes(s.id) || ['flinn-sds-61', 'flinn-sds-61.5'].includes(s.id))]

  it("lists once a source another lab lists too: the NBS tables, the atomic weights, PubChem's table, and the two sheets for ammonium nitrate", () => {
    const own = newSources(sources, before, 'calorimetry MANIFEST.json')
    expect(sources.length - own.length).toBe(shared.length)
    for (const id of shared) expect(own.some((s) => s.id === id), id).toBe(false)
    const added = newSources(sheets, [...before, ...own], 'calorimetry hazard-manifest.json')
    expect(added.some((s) => s.id === 'flinn-sds-61' || s.id === 'flinn-sds-395')).toBe(false)
    // Of the documents of the hazard manifests, the app lists those a reagent's hazards cite.
    const cited = new Set(stored.reagents.flatMap(({ hazards: { sourceId, note } }: { hazards: Entry['hazards'] }) => [sourceId, note.sourceId, ...(note.alsoSourceId === undefined ? [] : [note.alsoSourceId]), ...(note.moreSourceIds ?? [])]))
    const ids = [...own, ...added.filter((sheet) => cited.has(sheet.id))].map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    const from = allSources.findIndex((s) => s.id === ids[0])
    expect(allSources.slice(from, from + ids.length).map((s) => s.id)).toEqual(ids)
    for (const id of cited) expect(allSources.some((s) => s.id === id), id).toBe(true)
  })

  it('refuses a shared source written differently in the two places', () => {
    const nbs = allSources.find((s) => s.id === 'nbs-tables-1982')!
    expect(() => newSources(sources.map((s) => (s.id === nbs.id ? { ...s, citation: `${s.citation} Read again.` } : s)), [nbs], 'calorimetry MANIFEST.json')).toThrow(/the source id "nbs-tables-1982" is already in use for another address or citation/)
  })
})

describe('the manifest', () => {
  it('keeps no copy in this folder, and says of every source of its own that it was read and not kept', () => {
    for (const source of [...sources, ...hazardManifest.sources] as { id: string; file?: string }[]) expect(source.file, source.id).toBeUndefined()
    for (const source of sources.filter((s) => !['nbs-tables-1982', 'ciaaw-abridged-2024', 'pubchem-aqueous-reagents'].includes(s.id))) expect(source.citation, source.id).toMatch(/read and not kept \(retrieved 2026-10-09\)/)
  })

  it('cites no OpenStax page, and no page of a secondary encyclopedia', () => {
    for (const source of [...sources, ...hazardManifest.sources]) expect(`${source.id} ${source.url} ${source.citation}`, source.id).not.toMatch(/openstax|flowers-chem2e|wikipedia/i)
    // The water's specific heat and density are the aqueous reactions lab's figures and not its source, which is a page this lab does not read.
    expect(stored.water.specificHeat.sourceId).toBe('nist-webbook-water-25c')
    expect(JSON.stringify(stored)).not.toMatch(/flowers-chem2e/)
  })

  it('says of every figure read from the scanned tables that it was read by eye from an image of the page', () => {
    const nbs = sources.find((s) => s.id === 'nbs-tables-1982')!
    expect(nbs.supports.length).toBe(20)
    for (const row of nbs.supports) {
      expect(row.where, row.prints).toMatch(/Read by eye from an image of the scanned page, which has no text layer\.$/)
      if (/^-?\d/.test(row.prints)) expect(row.where, row.prints).toMatch(/^Page 2-\d+, Table \d+:[A-Z][a-z]?/)
    }
  })

  it('marks with a primer row every source the primer may rest on that is not a table of figures', () => {
    const withRow = sources.filter((s) => s.supports.some((row) => row.fields.includes('primer'))).map((s) => s.id)
    expect(withRow).toEqual(['nist-webbook-water-25c', 'chemguide-energetics-introduction', 'chemguide-enthalpy-neutralisation', 'chemguide-measuring-enthalpy', 'purdue-temperature', 'purdue-heat', 'purdue-calorimetry', 'nasa-heat-transfer', 'hyperphysics-specific-heat', 'ncsu-calorimetry-lab', 'davidson-specific-heat-copper', 'davidson-heat-of-solution', 'davidson-heat-of-neutralization', 'docbrown-calorimeter-methods'])
  })
})
