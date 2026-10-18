import { describe, expect, it } from 'vitest'
import input from '../../../docs/research/cations/cations.json'
import hazards from '../../../docs/research/cations/hazards.json'
import hazardManifest from '../../../docs/research/cations/sources/hazard-manifest.json'
import manifest from '../../../docs/research/cations/sources/MANIFEST.json'
import aqueousHazards from '../../../docs/research/phase-4/hazards.json'
import aqueousHazardManifest from '../../../docs/research/phase-4/sources/hazard-manifest.json'
import { modelFrom } from '../../engine/cations/model'
import periodicTable from '../periodic-table.json'
import allSources from '../sources.json'
import stored from './cations.json'
import { cationsData } from './data'

// The checks scripts/build-chem-data.mjs runs on the Group I cations lab's record: against its manifest of
// sources, against the periodic table's record, on the values it works out from cited ones, on its rules against
// its numbers at the bench's amounts (spec 17.4) and, for the bottles' hazards, whose documents are not kept,
// against the hazard manifests' account of each. They are tested here on the real inputs and on inputs they must
// refuse. The checks of the manifests and the merge are the aqueous lab's (scripts/aqueous-lib.mjs), which that
// lab's tests cover on its own inputs; what is tested here is that they hold this record, and what this lab added
// to them (scripts/cations-lib.mjs).
type Row = { fields: string[]; prints: string; where: string }
type Source = { id: string; url: string; citation: string; file?: string; supports: Row[] }
type Sheet = { id: string; url: string; citation: string; file?: string; supports: { field: string; prints: string; where: string }[] }
type Note = { value: string; sourceId: string; alsoSourceId?: string; moreSourceIds?: string[] }
type Entry = { classifiedAs: string; hazards: { signalWord: string; statements: string[]; note: Note; sourceId: string } }
type Listed = { id: string; url: string; citation: string }
type Standard = Record<string, Record<string, Record<string, string>>>
type Lib = {
  citations(record: unknown): { key: string; sourceId: string; published?: string }[]
  checkSupported(record: unknown, sources: Source[], sheets?: Sheet[]): void
  mergeHazards(reagents: unknown[], hazards: Record<string, Entry>, sheets: Sheet[], never?: Record<string, string[]>, standard?: Standard): { id: string; classifiedAs: string; hazards: Entry['hazards'] }[]
  newSources(sources: Listed[], earlier: Listed[], where: string): Listed[]
}
type SharedLib = {
  withSharedHazards(own: Record<string, Entry>, other: Record<string, Entry>, sharedIds: string[]): Record<string, Entry>
  withSharedSheets(own: Sheet[], other: Sheet[]): Sheet[]
}
type Figures = { samples: { sample: string; step1: Record<string, { timesOver: number; leftPercent: number }>; step3: { timesOver: number } | null; step4: { timesUnder: number } | null; step5: { additions: number; timesUnder: number }[] }[]; water: { leadChloride: number; hotHolds: number; coldHolds: number; leftCold: number }; additionsToAcid: number }
type OwnLib = {
  threeFigures(value: number): number
  shownValue(shown: string): number
  constantFrom(record: unknown, kilojoules: number): number
  checkWorkedOut(record: unknown): void
  checkAtomicWeights(record: unknown, table: unknown): void
  amountsOf(record: unknown): Record<string, number>
  checkBench(record: unknown): Figures
  SAMPLES: string[][]
}
const [lib] = Object.values(import.meta.glob<Lib>('../../../scripts/aqueous-lib.mjs', { eager: true }))
const [sharedLib] = Object.values(import.meta.glob<SharedLib>('../../../scripts/calorimetry-lib.mjs', { eager: true }))
const [ownLib] = Object.values(import.meta.glob<OwnLib>('../../../scripts/cations-lib.mjs', { eager: true }))
const { citations, checkSupported, mergeHazards, newSources } = lib!
const { withSharedHazards, withSharedSheets } = sharedLib!
const { threeFigures, shownValue, constantFrom, checkWorkedOut, checkAtomicWeights, amountsOf, checkBench, SAMPLES } = ownLib!

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const sources: Source[] = manifest.sources
const SHARED = ['hcl-6m']
const STANDARD: Standard = { 'k2cro4-0.5m': { 'Causes skin and serious irritation (H315+H319)': { H315: 'Causes skin irritation', H319: 'Causes serious eye irritation' } } }
const sheets = withSharedSheets(hazardManifest.sources, aqueousHazardManifest.sources)
const allHazards = () => withSharedHazards(copy(hazards) as Record<string, Entry>, aqueousHazards as Record<string, Entry>, SHARED)
type Input = typeof input
const edited = (edit: (record: Input) => void) => {
  const record = copy(input)
  edit(record)
  return record
}
const parameter = (record: Input, name: keyof Input['parameters'], value: number) => void (record.parameters[name].value = value)

describe('checkWorkedOut', () => {
  it('accepts the record as authored', () => {
    expect(() => checkWorkedOut(input)).not.toThrow()
    expect([1.767618e-10, 1.707314e-5, 1.45826e-18, 16697750].map(threeFigures)).toEqual([1.77e-10, 1.71e-5, 1.46e-18, 16700000])
    expect(['1.77 × 10⁻¹⁰', '1.67 × 10⁷', '2.8 × 10⁻¹³', '1.77e-10', '1.77 x 10⁻¹⁰'].map(shownValue)).toEqual([1.77e-10, 1.67e7, 2.8e-13, NaN, NaN])
    expect(constantFrom(input, 55.668).toExponential(4)).toBe('1.7676e-10')
  })

  it('refuses a Gibbs energy that is not the sum of its terms, a constant that does not follow from it, and one shown otherwise than it is stored', () => {
    expect(() => checkWorkedOut(edited((r) => void (r.equilibria[0]!.gibbs.value = 55.67)))).toThrow(/equilibria\[silver-chloride\]\.gibbs: 55.67 is not the sum of its terms, 55.668/)
    expect(() => checkWorkedOut(edited((r) => void (r.equilibria[1]!.terms[1]!.coefficient = 1)))).toThrow(/equilibria\[lead-chloride\]\.gibbs: 27.214 is not the sum of its terms/)
    expect(() => checkWorkedOut(edited((r) => void (r.equilibria[0]!.constant.value = 1.8e-10)))).toThrow(/equilibria\[silver-chloride\]\.constant: 1.8e-10 is not e\^\(−ΔG° ÷ RT\) to three significant figures, 1.77e-10/)
    expect(() => checkWorkedOut(edited((r) => void (r.equilibria[3]!.constant.shown = '1.7 × 10⁷')))).toThrow(/equilibria\[silver-ammonia-ion\]\.constant: shown as "1.7 × 10⁷", which is not the stored 16700000/)
    expect(() => checkWorkedOut(edited((r) => void (r.equilibria[2]!.gibbs.working = '101.809 kJ/mol')))).toThrow(/equilibria\[mercury-i-chloride\]\.gibbs: the working does not show 153.52/)
    expect(() => checkWorkedOut(edited((r) => void (r.equilibria[2]!.constant.working = 'worked out')))).toThrow(/equilibria\[mercury-i-chloride\]\.constant: the working does not show 8.314462618/)
    expect(() => checkWorkedOut(edited((r) => void (r.equilibria[0]!.terms[0]!.gibbsId = 'gold-ion')))).toThrow(/no Gibbs energy "gold-ion"/)
    // A Gibbs energy read one digit off moves the constant, and the build then stops.
    expect(() => checkWorkedOut(edited((r) => void Object.assign(r.gibbs[4]!, { value: -109.798, published: '-109.798' })))).toThrow(/equilibria\[silver-chloride\]\.gibbs: 55.668 is not the sum of its terms, 55.677/)
    expect(() => checkWorkedOut(edited((r) => void (r.leadChromate.solubilityProduct.shown = '2.8 × 10⁻¹²')))).toThrow(/leadChromate\.solubilityProduct: shown as "2.8 × 10⁻¹²", which is not the stored 2.8e-13/)
  })

  it('refuses a molar mass that is not the sum of its atomic weights, and a solubility that is not the cited one over it', () => {
    expect(() => checkWorkedOut(edited((r) => void (r.leadChloride.molarMass.value = 278.11)))).toThrow(/leadChloride\.molarMass: 278.11 is not 207.2 \+ 2 × 35.45, 278.1/)
    expect(() => checkWorkedOut(edited((r) => void (r.leadChloride.cold.value = 39554)))).toThrow(/leadChloride\.cold: 39554 is not 10 g\/L ÷ 278.10 g\/mol in nanomoles for each millilitre, 35958/)
    expect(() => checkWorkedOut(edited((r) => void Object.assign(r.leadChloride.solubilityHot, { value: 33.4, published: '33.4' })))).toThrow(/leadChloride\.hot: 120460 is not 33.4 g\/L/)
    expect(() => checkWorkedOut(edited((r) => void (r.leadChloride.hot.working = '120 460')))).toThrow(/leadChloride\.hot: the working does not show 33.5/)
  })
})

describe('checkAtomicWeights', () => {
  it("accepts the two as authored, and refuses one that is not the periodic table's, from the periodic table's source", () => {
    expect(() => checkAtomicWeights(input, periodicTable)).not.toThrow()
    expect(() => checkAtomicWeights(edited((r) => void Object.assign(r.leadChloride.atomicWeights[0]!, { value: 207.19, published: '207.19' })), periodicTable)).toThrow(/leadChloride\.atomicWeights\[Pb\]: the periodic table gives Pb the atomic weight 207.2 from "ciaaw-abridged-2024", not the stored 207.19/)
    expect(() => checkAtomicWeights(edited((r) => void (r.leadChloride.atomicWeights[1]!.sourceId = 'nbs-tables-1982')), periodicTable)).toThrow(/the periodic table gives Cl the atomic weight 35.45/)
    expect(() => checkAtomicWeights(edited((r) => void (r.leadChloride.atomicWeights[1]!.id = 'Xx')), periodicTable)).toThrow(/no element "Xx" in the periodic table/)
  })
})

describe('the bench\'s amounts', () => {
  it('are whole numbers of microlitres and of nanomoles, and are the ones the engine works out for itself', () => {
    const amounts = amountsOf(input)
    expect(amounts).toEqual({
      sampleMicrolitres: 1500,
      ionNanomoles: 50000,
      acidMicrolitres: 200,
      chlorideNanomoles: 1200000,
      waterMicrolitres: 750,
      aceticAcidMicrolitres: 50,
      chromateMicrolitres: 200,
      chromateNanomoles: 100000,
      ammoniaMicrolitres: 750,
      ammoniaNanomoles: 4500000,
      nitricAcidMicrolitres: 400,
      nitricAcidNanomoles: 2400000,
      nitricAcidAdditions: 4,
      leadChlorideColdPerMillilitre: 35958,
      leadChlorideHotPerMillilitre: 120460,
    })
    const m = modelFrom(cationsData)
    const { acidMicrolitres, ...same } = amounts
    expect(m.hydrochloricAcidMicrolitres).toBe(acidMicrolitres)
    for (const [name, value] of Object.entries(same)) expect((m as unknown as Record<string, number>)[name], name).toBe(value)
  })
})

describe('checkBench: the rules against the numbers (spec 17.4)', () => {
  const figures = checkBench(input)
  const sample = (name: string) => figures.samples.find((s) => s.sample === name)!

  it('passes at the amounts on the bench, for the seven samples', () => {
    expect(figures.samples.map((s) => s.sample)).toEqual(SAMPLES.map((ions) => ions.join(' + ')))
    expect(SAMPLES).toHaveLength(7)
  })

  it('step 1: each ion product is far over its solubility product, and under a hundredth of each ion is left dissolved', () => {
    const known = sample('silver + lead + mercury-i')
    // Lead chloride is the closest of the three: about 860 times over, with 0.19% left.
    expect(Math.round(known.step1.lead!.timesOver)).toBe(857)
    expect(known.step1.lead!.leftPercent.toFixed(2)).toBe('0.19')
    expect(known.step1.silver!.timesOver).toBeGreaterThan(1e8)
    expect(known.step1['mercury-i']!.timesOver).toBeGreaterThan(1e16)
    for (const s of figures.samples) for (const ion of Object.values(s.step1)) expect(ion.leftPercent, s.sample).toBeLessThan(cationsData.parameters.completeWithinPercent.value)
    expect(sample('lead').step1.lead!.leftPercent.toFixed(2)).toBe('0.14')
  })

  it('step 2: the water holds all the lead chloride hot, and 54% of it cold', () => {
    expect(figures.water).toEqual({ leadChloride: 50000, hotHolds: 90345, coldHolds: 26968, leftCold: 23032 })
  })

  it('step 3: the ion product of lead chromate is over its solubility product, and step 4: the ammonia holds all the silver chloride', () => {
    expect(sample('lead').step3!.timesOver).toBeGreaterThan(1e9)
    expect(sample('silver').step3).toBeNull()
    expect(sample('silver').step4!.timesUnder.toFixed(1)).toBe('22.9')
    // With mercury(I) there, its chloride is in the liquid too and some ammonia is used up: still over ten times under.
    expect(sample('silver + mercury-i').step4!.timesUnder.toFixed(1)).toBe('10.9')
    expect(sample('lead').step4).toBeNull()
  })

  it('step 5: two additions of acid make the liquid acid whatever the sample holds, and after one the silver is still held', () => {
    expect(figures.additionsToAcid).toBe(2)
    expect(sample('silver').step5).toEqual([{ additions: 1, timesUnder: expect.closeTo(4.73, 2) }])
    expect(sample('silver + lead + mercury-i').step5).toEqual([{ additions: 1, timesUnder: expect.closeTo(2.13, 2) }])
    expect(sample('lead').step5).toEqual([])
  })

  it('stops the build where a number says the scheme would not go as the rules have it', () => {
    const check = (edit: (record: Input) => void) => () => checkBench(edited(edit))
    // Too little acid for the three ions; and a sample so dilute that lead chloride would not come down.
    expect(check((r) => parameter(r, 'hydrochloricAcidDrops', 0))).toThrow(/step 1, silver: the acid holds 0 nmol of chloride and the ions take up 50000/)
    expect(check((r) => void (r.equilibria[1]!.constant.value = 0.02))).toThrow(/step 1, lead: the ion product of lead chloride, 1.47e-2, is not over its solubility product, 0.02/)
    expect(check((r) => void (r.equilibria[1]!.constant.value = 1.71e-3))).toThrow(/step 1, lead: the solubility product leaves 13.89% of the lead dissolved, which is not under 1%/)
    // So much water that cold water holds all the lead chloride; so little that hot water does not.
    expect(check((r) => parameter(r, 'waterDrops', 40))).toThrow(/step 2: the cold water holds 71916 nmol of lead chloride, which is all of the 50000 nmol there is/)
    expect(check((r) => parameter(r, 'waterDrops', 8))).toThrow(/step 2: the hot water holds 48184 nmol of lead chloride, not all of the 50000 nmol there is/)
    // Too little chromate to be left over; and a solubility product the lead and chromate would not reach.
    expect(check((r) => parameter(r, 'chromateDrops', 2))).toThrow(/step 3, lead, the water poured off hot: 50000 nmol of chromate is not more than the 50000 nmol of lead/)
    expect(check((r) => void (r.leadChromate.solubilityProduct.value = 0.01))).toThrow(/step 3, lead, the water poured off hot: the ion product of lead chromate, 5.00e-3, is not over its solubility product, 0.01/)
    // Too little ammonia to hold the silver chloride.
    expect(check((r) => parameter(r, 'ammoniaDrops', 1))).toThrow(/step 4, silver, the water poured off hot: with all the silver chloride dissolved the quotient is/)
    expect(check((r) => void (r.equilibria[3]!.constant.value = 1.67e5))).toThrow(/step 4, silver, the water poured off hot: with all the silver chloride dissolved the quotient is 1.29e-4, which is not under the constant, 2.96e-5/)
    // One addition of acid that passes neutral; additions that never do; one that lands on neutral; and one that leaves too little ammonia to hold the silver.
    expect(check((r) => parameter(r, 'nitricAcidDrops', 16))).toThrow(/step 5: one addition of acid makes the liquid acid, so nothing is learned from testing it/)
    expect(check((r) => parameter(r, 'nitricAcidDrops', 2))).toThrow(/step 5, silver, the water poured off hot: 4 additions of acid do not make the liquid acid/)
    expect(check((r) => parameter(r, 'nitricAcidDrops', 5))).toThrow(/step 5, silver, the water poured off hot: 3 additions of acid land exactly on neutral/)
    expect(check((r) => parameter(r, 'nitricAcidDrops', 7))).toThrow(/step 5, silver, the water poured off hot: after 2 additions the liquid is still basic and the quotient is .*: silver chloride would be back before the liquid is acid/)
    expect(check((r) => void (r.reagents[6]!.molarity = 0.2))).toThrow(/ions: the three solutions the samples are made from are not of one strength/)
  })
})

describe("the bottles' hazards", () => {
  it("are this lab's seven with the aqueous reactions lab's one, taken unchanged, and the documents of both", () => {
    expect(Object.keys(hazards)).toEqual(['acetic-acid-6m', 'k2cro4-0.5m', 'nh3-6m', 'hno3-6m', 'agno3-0.1m', 'pbno32-0.1m', 'hg2no32-0.1m'])
    const all = allHazards()
    expect(Object.keys(all).sort()).toEqual([...input.reagents.map((r) => r.id)].sort())
    expect(all['hcl-6m']).toEqual((aqueousHazards as Record<string, Entry>)['hcl-6m'])
    expect(() => withSharedHazards({ ...copy(hazards), 'hcl-6m': all['hcl-6m']! } as Record<string, Entry>, aqueousHazards as Record<string, Entry>, SHARED)).toThrow(/"hcl-6m" carries another lab's record and has no entry here/)
    // A sheet both labs read is this lab's entry of it, written as the other lab has it: the two sheets for silver nitrate.
    const twice = hazardManifest.sources.filter((sheet) => aqueousHazardManifest.sources.some((other) => other.id === sheet.id))
    // Since 2026-10-18 the aqueous lab's silver nitrate note rests on this lab's two stricter sheets as well.
    expect(twice.map((sheet) => sheet.id)).toEqual(['flinn-sds-691', 'flinn-sds-692', 'wards-sds-ss0180', 'fisher-sds-agno3'])
    for (const sheet of twice) {
      const theirs = aqueousHazardManifest.sources.find((other) => other.id === sheet.id)!
      expect([sheet.url, sheet.citation], sheet.id).toEqual([theirs.url, theirs.citation])
      expect(sheets.find((s) => s.id === sheet.id)).toBe(sheet)
    }
    expect(sheets.length).toBe(hazardManifest.sources.length + aqueousHazardManifest.sources.length - twice.length)
  })

  it('merge into the stored record, each held to the rows of the documents behind it', () => {
    const merged = mergeHazards(input.reagents, allHazards(), sheets, {}, STANDARD)
    expect(merged).toEqual(stored.reagents)
    expect(() => mergeHazards(input.reagents, copy(hazards) as Record<string, Entry>, sheets, {}, STANDARD)).toThrow(/hazards\.json: expected exactly the keys hcl-6m, acetic-acid-6m/)
    const without = sheets.filter((sheet) => sheet.id !== 'wards-sds-aa0273')
    expect(() => mergeHazards(input.reagents, allHazards(), without, {}, STANDARD)).toThrow(/hazards\.json: nh3-6m\.hazards\.note: unknown source "wards-sds-aa0273"/)
  })

  it('store the mercury(I) nitrate sheet\'s statements, which it prints code first, turned as every other bottle\'s are', () => {
    const sheet = hazardManifest.sources.find((s) => s.id === 'fisher-uk-sds-hg2no32-dihydrate')!
    const printed = sheet.supports.filter((row) => row.field.startsWith('hg2no32-0.1m.hazards.statements[')).map((row) => row.prints)
    expect(printed).toEqual(['H410 - Very toxic to aquatic life with long lasting effects', 'H373 - May cause damage to organs through prolonged or repeated exposure', 'H300 + H310 + H330 - Fatal if swallowed, in contact with skin or if inhaled'])
    expect((hazards as Record<string, Entry>)['hg2no32-0.1m']!.hazards.statements).toEqual(['H410: Very toxic to aquatic life with long lasting effects', 'H373: May cause damage to organs through prolonged or repeated exposure', 'H300+H310+H330: Fatal if swallowed, in contact with skin or if inhaled'])
    // It is the sheet of mercury(I) nitrate, and no bottle of this bench is a salt of mercury(II).
    expect(sheet.citation).toContain('Mercury(I) nitrate dihydrate')
    expect(JSON.stringify(hazards)).not.toMatch(/mercury\(II\) (nitrate|chloride)|mercuric/i)
  })

  it("store the standard phrase of each of two codes for the one line of the potassium chromate sheet that drops a word, by the stated exception and by no other", () => {
    const chromate = (hazards as Record<string, Entry>)['k2cro4-0.5m']!.hazards
    expect(chromate.statements.slice(1, 3)).toEqual(['H315: Causes skin irritation', 'H319: Causes serious eye irritation'])
    const rows = hazardManifest.sources.find((s) => s.id === 'flinn-sds-623')!.supports.filter((row) => /statements\[[12]\]$/.test(row.field))
    expect(rows.map((row) => row.prints)).toEqual(['Causes skin and serious irritation (H315+H319)', 'Causes skin and serious irritation (H315+H319)'])
    for (const row of rows) expect(row.where).toContain('standard phrase')
    // Without the exception the merge refuses those rows; and the exception lets no other bottle's line through.
    expect(() => mergeHazards(input.reagents, allHazards(), sheets)).toThrow(/the source "flinn-sds-623" prints "Causes skin and serious irritation \(H315\+H319\)" for k2cro4-0\.5m\.hazards\.statements\[1\], not the stored "H315: Causes skin irritation"/)
    const altered = allHazards()
    altered['pbno32-0.1m'] = { ...altered['pbno32-0.1m']!, hazards: { ...altered['pbno32-0.1m']!.hazards, statements: altered['pbno32-0.1m']!.hazards.statements.map((s, i) => (i === 2 ? 'H318: Causes serious eye irritation' : s)) } }
    expect(() => mergeHazards(input.reagents, altered, sheets, {}, STANDARD)).toThrow(/for pbno32-0\.1m\.hazards\.statements\[2\], not the stored "H318: Causes serious eye irritation"/)
  })

  it('give lead nitrate seven statements, the seventh from another section of the same sheet, as its row says', () => {
    const lead = (hazards as Record<string, Entry>)['pbno32-0.1m']!.hazards
    expect(lead.statements).toHaveLength(7)
    expect(lead.statements[6]).toBe('H410: Very toxic to aquatic life with long lasting effects')
    expect(hazardManifest.sources.find((s) => s.id === 'flinn-sds-437')!.supports.find((row) => row.field === 'pbno32-0.1m.hazards.statements[6]')!.where).toMatch(/[Ss]ection 12/)
  })

  it('give no method of disposal under any bottle', () => {
    for (const reagent of stored.reagents) {
      expect(reagent.hazards.note.value, reagent.id).not.toMatch(/down the (sink|drain)|neutrali[sz]e it|pour it/i)
      // The 6 M acid's record, the aqueous reactions lab's, has ended as this lab's do since 2026-10-18.
      expect(reagent.hazards.note.value, reagent.id).toContain("How any of it is disposed of is decided by the laboratory's own rules and by local regulations; ask the laboratory's supervisor.")
    }
  })
})

describe('checkSupported, on this record', () => {
  const merged = () => ({ ...copy(input), reagents: mergeHazards(input.reagents, allHazards(), sheets, {}, STANDARD) })

  it('accepts the record with its manifest: every value that cites a source has a row of that source, and every row a value', () => {
    expect(() => checkSupported(merged(), sources, sheets)).not.toThrow()
    // Every published figure of the record is one a row prints: nine Gibbs energies, two atomic weights and two solubilities.
    expect(citations(input).filter((c) => c.published !== undefined)).toHaveLength(13)
  })

  it('refuses a figure no row prints, a value with no row, and a row for a value that does not cite its source', () => {
    const record = merged()
    record.gibbs[5]!.published = '-314.1'
    expect(() => checkSupported(record, sources, sheets)).toThrow(/gibbs\[lead-chloride\]: the source "nbs-tables-1982" has no row that prints -314.1 for it/)
    const fewer = copy(sources)
    const handout = fewer.find((s) => s.id === 'ntu-group-1-lab')!
    handout.supports = handout.supports.filter((row) => !row.fields.includes('leadChromate.solubilityProduct'))
    expect(() => checkSupported(merged(), fewer, sheets)).toThrow(/leadChromate\.solubilityProduct: the source "ntu-group-1-lab" has no row that names it/)
    const more = copy(sources)
    more[0]!.supports.push({ fields: ['leadChromate.solubilityProduct'], prints: '1', where: 'Nowhere.' })
    expect(() => checkSupported(merged(), more, sheets)).toThrow(/the source "nbs-tables-1982" has a row for leadChromate\.solubilityProduct, which does not cite it/)
  })
})

describe('the sources the lab adds', () => {
  const ownIds = new Set([...sources.map((s) => s.id), ...hazardManifest.sources.map((s) => s.id)])
  const shared = ['nbs-tables-1982', 'nist-codata-2022', 'ciaaw-abridged-2024', 'birk-silver']
  const sharedSheets = ['flinn-sds-691', 'flinn-sds-692']
  const first = allSources.findIndex((s) => s.id === 'birk-lead')
  const before: Listed[] = allSources.slice(0, first)

  it('lists once a source another lab lists too: the NBS tables, the constants, the atomic weights, one page of reactions, and the two sheets for silver nitrate', () => {
    for (const id of [...shared, ...sharedSheets, 'flinn-sds-395']) expect(before.some((s) => s.id === id), id).toBe(true)
    const own = newSources(sources, before, 'cations MANIFEST.json')
    expect(sources.length - own.length).toBe(shared.length)
    const added = newSources(sheets, [...before, ...own], 'cations hazard-manifest.json')
    expect(added.some((s) => sharedSheets.includes(s.id) || s.id === 'flinn-sds-395')).toBe(false)
    // Of the documents of the hazard manifest, the app lists those a bottle's hazards cite and those read for the primer's safety card.
    const cited = new Set(stored.reagents.flatMap(({ hazards: { sourceId, note } }: { hazards: Entry['hazards'] }) => [sourceId, note.sourceId, ...(note.alsoSourceId === undefined ? [] : [note.alsoSourceId]), ...(note.moreSourceIds ?? [])]))
    const forPrimer = new Set(hazardManifest.sources.filter((s) => s.supports.some((row) => row.field === 'primer.safety')).map((s) => s.id))
    const ids = [...own, ...added.filter((sheet) => cited.has(sheet.id) || forPrimer.has(sheet.id))].map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(allSources.slice(first, first + ids.length).map((s) => s.id)).toEqual(ids)
    // They end where the next lab's begin: the Le Chatelier's principle lab was added after this one.
    expect(allSources[first + ids.length]?.id).toBe('birk-zinc')
    for (const id of [...cited, ...forPrimer]) expect(allSources.some((s) => s.id === id), id).toBe(true)
    // A document that was read and that nothing shown rests on stays in the manifest and is not listed in the app.
    const unlisted = hazardManifest.sources.filter((s) => !allSources.some((listed) => listed.id === s.id)).map((s) => s.id)
    expect(unlisted.length).toBeGreaterThan(0)
    for (const id of unlisted) expect(cited.has(id) || forPrimer.has(id), id).toBe(false)
    expect(ownIds.size).toBe(sources.length + hazardManifest.sources.length)
  })

  it('refuses a shared source written differently in the two places', () => {
    const nbs = allSources.find((s) => s.id === 'nbs-tables-1982')!
    expect(() => newSources(sources.map((s) => (s.id === nbs.id ? { ...s, citation: `${s.citation} Read again.` } : s)), [nbs], 'cations MANIFEST.json')).toThrow(/the source id "nbs-tables-1982" is already in use for another address or citation/)
  })
})

describe('the manifest', () => {
  it('keeps no copy in this folder, and says of every source of its own that it was read and not kept', () => {
    for (const source of [...sources, ...hazardManifest.sources] as { id: string; file?: string }[]) expect(source.file, source.id).toBeUndefined()
    for (const source of sources.filter((s) => !['nbs-tables-1982', 'nist-codata-2022', 'ciaaw-abridged-2024', 'birk-silver'].includes(s.id))) expect(source.citation, source.id).toMatch(/read and not kept \(retrieved 2026-10-09\)/)
    expect(manifest.retrieved).toBe('2026-10-09')
  })

  it('cites no OpenStax page, and no page of a secondary encyclopedia', () => {
    for (const source of [...sources, ...hazardManifest.sources]) expect(`${source.id} ${source.url} ${source.citation}`, source.id).not.toMatch(/openstax|flowers-chem2e|wikipedia/i)
    expect(JSON.stringify(stored)).not.toMatch(/flowers-chem2e|wikipedia/)
  })

  it('says of every figure read from the scanned tables that it was read by eye from an image of the page', () => {
    const nbs = sources.find((s) => s.id === 'nbs-tables-1982')!
    expect(nbs.supports.length).toBe(9)
    for (const row of nbs.supports) {
      expect(row.where, row.prints).toMatch(/Read by eye from an image of the scanned page, which has no text layer\.$/)
      expect(row.where, row.prints).toMatch(/^Page 2-\d+, Table \d+:[A-Z][a-z]?/)
    }
    // The rows for mercury say which ion and which chloride they are, and that the rows for mercury(II) are not used.
    for (const id of ['mercury-i-ion', 'mercury-i-chloride']) expect(nbs.supports.find((row) => row.fields.includes(`gibbs[${id}]`))!.where, id).toMatch(/mercury\(II\), is another row of the page .* and is not used/)
  })

  it('marks with a primer row every source of its own that the primer rests on and the record does not cite', () => {
    const withRow = sources.filter((s) => s.supports.some((row) => row.fields.includes('primer'))).map((s) => s.id)
    expect(withRow).toEqual(['malik-solubility', 'malik-solubility-equilibria', 'malik-varying-solubility', 'malik-separation-in-groups', 'malik-precipitation', 'malik-water-bath', 'malik-centrifugation', 'malik-separating-precipitate', 'malik-ph-measurement', 'malik-group-1-separation', 'malik-group-1-ions', 'malik-group-1-procedure', 'smc-group-1-lab'])
  })
})
