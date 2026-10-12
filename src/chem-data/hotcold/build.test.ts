import { describe, expect, it } from 'vitest'
import hazards from '../../../docs/research/hotcold/hazards.json'
import input from '../../../docs/research/hotcold/hotcold.json'
import hazardManifest from '../../../docs/research/hotcold/sources/hazard-manifest.json'
import manifest from '../../../docs/research/hotcold/sources/MANIFEST.json'
import periodicTable from '../periodic-table.json'
import allSources from '../sources.json'
import stored from './hotcold.json'

// The checks scripts/build-chem-data.mjs runs on the endothermic and exothermic lab's record: against its manifest
// of sources, against the atomic weights the periodic table keeps, on what it works out from cited figures, on
// the numbers of spec 26.3 and 26.5 and, for the hazards, whose documents are not kept, against the hazard
// manifest's account of each. They are tested here on the real inputs and on inputs they must refuse. The checks
// of the manifests and the merge are the aqueous lab's (scripts/aqueous-lib.mjs), which that lab's tests cover on
// its own inputs; what is tested here is that they hold this record, and what this lab added
// (scripts/hotcold-lib.mjs).
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
type OwnLib = {
  checkMolarMasses(record: unknown, periodicTable: unknown): void
  checkWorkedOut(record: unknown): void
  checkDirections(record: unknown): void
  checkDilution(record: unknown): void
  checkDissolves(record: unknown): void
  checkChange(record: unknown): void
  molesOfWater(record: unknown, part: unknown, salt: unknown, grams: number): number
  fullChange(record: unknown, part: unknown, salt: unknown, grams: number): number
}
const [lib] = Object.values(import.meta.glob<Lib>('../../../scripts/aqueous-lib.mjs', { eager: true }))
const [ownLib] = Object.values(import.meta.glob<OwnLib>('../../../scripts/hotcold-lib.mjs', { eager: true }))
const { checkSupported, mergeHazards, newSources } = lib!
const { checkMolarMasses, checkWorkedOut, checkDirections, checkDilution, checkDissolves, checkChange, molesOfWater, fullChange } = ownLib!

type Input = typeof input
const edited = (edit: (record: Input) => void): Input => {
  const record: Input = JSON.parse(JSON.stringify(input))
  edit(record)
  return record
}
const merged = () => ({ ...input, reagents: mergeHazards(input.reagents, hazards, hazardManifest.sources) })
const [epsom, calcium] = input.parts
const [epsomSalt, calciumChloride] = input.reagents

describe("the build's checks, on the real inputs", () => {
  it('pass, and the merge gives the file the app loads', () => {
    expect(() => checkMolarMasses(input, periodicTable)).not.toThrow()
    expect(() => checkWorkedOut(input)).not.toThrow()
    expect(() => checkDirections(input)).not.toThrow()
    expect(() => checkDilution(input)).not.toThrow()
    expect(() => checkDissolves(input)).not.toThrow()
    expect(() => checkChange(input)).not.toThrow()
    expect(() => checkSupported(merged(), manifest.sources, hazardManifest.sources)).not.toThrow()
    expect(merged()).toEqual(stored)
  })

  it('lists every source of the two manifests among the app\'s sources, each as its manifest writes it, but for what was read and is cited by no tile and no card', () => {
    const listed = (id: string) => allSources.find((s) => s.id === id)
    for (const { id, url, citation } of manifest.sources) expect(listed(id), id).toEqual({ id, url, citation })
    for (const { id, url, citation } of hazardManifest.sources) expect(listed(id), id).toEqual({ id, url, citation })
    expect(newSources(manifest.sources, allSources, 'hotcold MANIFEST.json')).toEqual([])
    expect(() => newSources([{ ...manifest.sources[0]!, citation: 'Another citation.' }], allSources, 'x')).toThrow(/already in use/)
  })

  it('keeps no copy of any source in the folder, and gives the hash of each page that was read as a page', () => {
    for (const source of [...manifest.sources, ...hazardManifest.sources] as (Source | Sheet)[]) expect(source.file, source.id).toBeUndefined()
    const hashed = [...manifest.sources, ...hazardManifest.sources].filter((s) => 'fetchedSha256' in s).map((s) => s.id)
    expect([...manifest.sources, ...hazardManifest.sources].map((s) => s.id).filter((id) => !hashed.includes(id))).toEqual(['ciaaw-abridged-2024'])
  })
})

describe("the numbers the lab's chemistry rests on", () => {
  it('has one mole of each salt in 73 to 81 moles of water over the masses a run can have, nearest the row for 75', () => {
    const ratios = (part: unknown, salt: unknown, range: number[]) => range.map((cg) => Number(molesOfWater(input, part, salt, cg / 100).toFixed(1)))
    expect(ratios(epsom, epsomSalt, input.parameters.epsomSaltRangeCg.value)).toEqual([78.3, 72.8])
    expect(ratios(calcium, calciumChloride, input.parameters.calciumChlorideRangeCg.value)).toEqual([81.1, 73.3])
  })

  it('cools the cup of Epsom salt by 2.7 to 2.9 °C and warms the cup of calcium chloride by 11.8 to 13.0 °C, before any heat is traded with the room', () => {
    const changes = (part: unknown, salt: unknown, range: number[]) => range.map((cg) => Number(fullChange(input, part, salt, cg / 100).toFixed(2)))
    expect(changes(epsom, epsomSalt, input.parameters.epsomSaltRangeCg.value)).toEqual([-2.75, -2.93])
    expect(changes(calcium, calciumChloride, input.parameters.calciumChlorideRangeCg.value)).toEqual([11.83, 12.98])
  })
})

describe("the build's checks, on inputs they must refuse", () => {
  it('refuses an atomic weight that is not the periodic table\'s, and a molar mass that is not the sum of its atoms', () => {
    expect(() => checkMolarMasses(edited((r) => void (r.atomicWeights[2]!.published = '24.31')), periodicTable)).toThrow(/periodic table gives Mg/)
    expect(() => checkMolarMasses(edited((r) => void (r.reagents[0]!.molarMass.value = 246.48)), periodicTable)).toThrow(/not the sum/)
    expect(() => checkMolarMasses(edited((r) => void (r.reagents[0]!.watersOfCrystal = 6)), periodicTable)).toThrow(/waters are not in its composition/)
    expect(() => checkMolarMasses(edited((r) => void (r.reagents[1]!.molarMass.working = 'by hand')), periodicTable)).toThrow(/working does not show/)
  })

  it('refuses an enthalpy that is not the sum of its terms, at the bench\'s strength, at endless dilution and for the dry salt', () => {
    expect(() => checkWorkedOut(edited((r) => void (r.parts[0]!.enthalpy!.value = 17.65)))).toThrow(/not the sum of its terms/)
    expect(() => checkWorkedOut(edited((r) => void (r.parts[1]!.enthalpy!.infiniteDilution.value = -81.3)))).toThrow(/not the sum of its terms/)
    expect(() => checkWorkedOut(edited((r) => void (r.parts[0]!.dry!.terms[1]!.enthalpyOfFormation.value = -1284.8)))).toThrow(/not the sum of its terms/)
    expect(() => checkWorkedOut(edited((r) => void (r.parts[0]!.enthalpy!.working = 'by hand')))).toThrow(/working does not show/)
  })

  it('refuses a record in which the heat goes the other way: the hydrate left out of Epsom salt\'s sum turns its sign', () => {
    expect(() => checkDirections(edited((r) => void (r.parts[0]!.enthalpy!.value = r.parts[0]!.dry!.value)))).toThrow(/not heat taken in/)
    expect(() => checkDirections(edited((r) => void (r.parts[1]!.enthalpy!.value = 77.689)))).toThrow(/not heat given out/)
    expect(() => checkDirections(edited((r) => void (r.parts[0]!.dry!.infiniteDilution.value = 11.78)))).toThrow(/not heat given out/)
  })

  it('refuses masses whose strength is nearer another row of the tables, and a sum that is not of the row named', () => {
    expect(() => checkDilution(edited((r) => void (r.parameters.epsomSaltRangeCg.value = [960, 1400])))).toThrow(/not nearest the row for 75/)
    expect(() => checkDilution(edited((r) => void (r.parameters.calciumChlorideRangeCg.value = [300, 420])))).toThrow(/not nearest the row for 75/)
    expect(() => checkDilution(edited((r) => void (r.parts[1]!.dilution!.row = 76)))).toThrow(/no term is the dissolved salt in 76/)
  })

  it('refuses a portion that is half of what dissolves or more, and a note that does not show the working', () => {
    expect(() => checkDissolves(edited((r) => void (r.reagents[1]!.solubility.value = 160)))).toThrow(/not under half/)
    expect(() => checkDissolves(edited((r) => void (r.reagents[0]!.solubility.note = 'It dissolves.')))).toThrow(/does not show/)
  })

  it('refuses masses that change the cup too little to read, or take it past the highest temperature the record allows', () => {
    expect(() => checkChange(edited((r) => void (r.parameters.epsomSaltRangeCg.value = [700, 1040])))).toThrow(/too little to read plainly/)
    expect(() => checkChange(edited((r) => void (r.parameters.calciumChlorideRangeCg.value = [380, 560])))).toThrow(/over 40.0 °C/)
  })

  it('refuses a record whose value has no row in the manifest, and a row that outlives its value', () => {
    expect(() => checkSupported({ ...merged(), parts: edited((r) => void (r.parts[2]!.notes[0]!.sourceId = 'wikipedia-ice-pack')).parts }, manifest.sources, hazardManifest.sources)).toThrow(/has a row for parts\[packs\]\.notes\[0\], which does not cite it|no row that names it/)
    const without = manifest.sources.map((s) => (s.id === 'fisher-sds-cacl2' ? { ...s, supports: [{ ...s.supports[0]!, prints: '74' }] } : s))
    expect(() => checkSupported(merged(), without, hazardManifest.sources)).toThrow(/no row that prints 740/)
  })

  it('refuses hazards that are not the sheet\'s: a statement dropped, a signal word changed, a note with no row', () => {
    const entry = (edit: (entry: Entry) => void) => {
      const copy: Record<string, Entry> = JSON.parse(JSON.stringify(hazards))
      edit(copy['calcium-chloride']!)
      return copy
    }
    expect(() => mergeHazards(input.reagents, entry((e) => void e.hazards.statements.pop()), hazardManifest.sources)).toThrow(/rows for 2 statements/)
    expect(() => mergeHazards(input.reagents, entry((e) => void (e.hazards.signalWord = 'Danger')), hazardManifest.sources)).toThrow(/signal word/)
    expect(() => mergeHazards(input.reagents, entry((e) => void (e.hazards.note.alsoSourceId = 'flinn-sds-480')), hazardManifest.sources)).toThrow(/no row for calcium-chloride\.hazards\.note/)
  })
})
