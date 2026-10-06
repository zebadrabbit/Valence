import { describe, expect, it } from 'vitest'
import manifest from '../../../docs/research/phase-3/sources/MANIFEST.json'
import noaaFile from '../../../docs/research/phase-3/sources/noaa-co2-annmean-gl.txt?raw'
import phenolphthaleinProperties from '../../../docs/research/phase-3/sources/pubchem-cid-4764-properties.json'
import carbonicAcidPage from '../../../docs/research/phase-3/sources/wikipedia-carbonic-acid-1376246456.json'
import dropPage from '../../../docs/research/phase-3/sources/wikipedia-drop-unit-1314848686.json'
import input from '../../../docs/research/phase-3/titration.json'

// The checks scripts/build-chem-data.mjs runs on the titration lab's record against the kept copies of its sources,
// and, for the bottles' hazard statements, whose sheets are not kept, against the manifest's account of each sheet.
// They are tested here on inputs they must refuse. The script itself writes files, so its checks live in
// scripts/titration-lib.mjs as plain functions.
type Hazards = { signalWord: string; statements: string[] }
type Sheet = { id: string; supports: { field: string; prints: string; where: string }[] }
type Lib = {
  checkPublished(constant: { value: number; published?: string }, where: string): void
  checkAnnualMean(text: string, year: number, published: string): void
  checkMolecularWeight(properties: unknown, cid: number, published: string): void
  checkSheetHazards(sheet: Sheet, field: string, hazards: Hazards, never?: string[]): void
  checkWikipediaCopy(copy: unknown, citation: string, figures: string[]): void
  checkSha256(bytes: string, sha256: string, file: string): void
}
const [lib] = Object.values(import.meta.glob<Lib>('../../../scripts/titration-lib.mjs', { eager: true }))
const { checkPublished, checkAnnualMean, checkMolecularWeight, checkSheetHazards, checkWikipediaCopy, checkSha256 } = lib!

const { hcl, naoh, indicator } = input.bottles
const citation = (id: string) => manifest.sources.find((source) => source.id === id)!.citation

describe('checkAnnualMean', () => {
  it('accepts the stored figure for the stored year', () => {
    expect(() => checkAnnualMean(noaaFile, 2025, '425.62')).not.toThrow()
  })

  it('refuses a saved file whose value for 2025 is altered by one digit', () => {
    expect(noaaFile).toContain('425.62')
    expect(() => checkAnnualMean(noaaFile.replace('425.62', '425.63'), 2025, '425.62')).toThrow(/gives 425\.63 for 2025, not the stored 425\.62/)
  })

  it("refuses a figure that is another year's, and a year the file has no row for", () => {
    expect(() => checkAnnualMean(noaaFile, 2024, '425.62')).toThrow(/gives 422\.79 for 2024/)
    expect(() => checkAnnualMean(noaaFile, 2026, '425.62')).toThrow(/0 rows for 2026/)
  })

  it('refuses the same number written with other digits', () => {
    expect(() => checkAnnualMean(noaaFile, 2025, '425.620')).toThrow(/not the stored 425\.620/)
  })
})

describe('checkMolecularWeight', () => {
  it('accepts the stored molar mass of phenolphthalein, and refuses another', () => {
    expect(() => checkMolecularWeight(phenolphthaleinProperties, 4764, '318.3')).not.toThrow()
    expect(() => checkMolecularWeight(phenolphthaleinProperties, 4764, '318.32')).toThrow(/CID 4764 as 318\.3, not the stored 318\.32/)
    expect(() => checkMolecularWeight(phenolphthaleinProperties, 313, '318.3')).toThrow(/CID 313/)
  })
})

// Every bottle's statements are a supplier's safety data sheet's, for the concentrated or the pure substance (D4, as
// the owner confirmed and widened it on 2026-10-05). The sheets are read and not kept, so the build has no copy to
// check them against. What it can still check: the form of each statement, that the record and the manifest give
// the same account of each sheet, and, for the acid, that H331 is not among the codes. Until that day the base's
// and the indicator's statements were checked against kept PubChem records, and the acid's had been before them.
describe('checkSheetHazards', () => {
  const sheet: Sheet = manifest.sources.find((source) => source.id === hcl.hazards.sourceId)!
  const field = 'bottles.hcl.hazards'
  const [burns, harmful, metals] = hcl.hazards.statements as [string, string, string]
  /** The sheet's rows with one changed: the manifest as it would read if the sheet printed something else. */
  const printing = (rowField: string, prints: string): Sheet => ({ ...sheet, supports: sheet.supports.map((row) => (row.field === rowField ? { ...row, prints } : row)) })

  it('accepts the acid bottle as the record stores it', () => {
    expect(sheet.id).toBe('flinn-sds-395')
    expect(() => checkSheetHazards(sheet, field, hcl.hazards, ['H331'])).not.toThrow()
  })

  // The other two bottles, each against the manifest's rows for its own sheet.
  const sheetOf = (bottle: { hazards: { sourceId: string } }): Sheet => manifest.sources.find((source) => source.id === bottle.hazards.sourceId)!

  it('accepts the base and the indicator bottles as the record stores them, each against its own sheet and not against another', () => {
    expect([sheetOf(naoh).id, sheetOf(indicator).id]).toEqual(['flinn-sds-734', 'flinn-sds-591'])
    expect(() => checkSheetHazards(sheetOf(naoh), 'bottles.naoh.hazards', naoh.hazards)).not.toThrow()
    expect(() => checkSheetHazards(sheetOf(indicator), 'bottles.indicator.hazards', indicator.hazards)).not.toThrow()
    expect(() => checkSheetHazards(sheetOf(indicator), 'bottles.naoh.hazards', naoh.hazards)).toThrow(/"flinn-sds-591" has 0 rows for bottles\.naoh\.hazards\.signalWord, expected 1/)
  })

  it("refuses the base's statement with a word changed or under another code, one left out, and one its sheet does not print", () => {
    const [burn, corrode] = naoh.hazards.statements as [string, string]
    const check = (statements: string[]) => () => checkSheetHazards(sheetOf(naoh), 'bottles.naoh.hazards', { ...naoh.hazards, statements })
    expect(check(['H314: Causes serious skin burns and eye damage', corrode])).toThrow(/prints "Causes severe skin burns and eye damage \(H314\)" for bottles\.naoh\.hazards\.statements\[0\], not the stored "H314: Causes serious skin burns and eye damage"/)
    expect(check(['H315: Causes severe skin burns and eye damage', corrode])).toThrow(/not the stored "H315: Causes severe skin burns and eye damage"/)
    expect(check([burn])).toThrow(/has rows for 2 statements of bottles\.naoh\.hazards and the record stores 1/)
    expect(check([burn, corrode, 'H335: May cause respiratory irritation'])).toThrow(/has rows for 2 statements of bottles\.naoh\.hazards and the record stores 3/)
    expect(() => checkSheetHazards(sheetOf(naoh), 'bottles.naoh.hazards', { ...naoh.hazards, signalWord: 'Warning' })).toThrow(/"flinn-sds-734" prints the signal word "DANGER", not "Warning"/)
  })

  it("refuses for the indicator the statement its bottle carried before, H361f for fertility alone: the sheet prints H361, for fertility or the unborn child", () => {
    const [defects, cancer, fertility] = indicator.hazards.statements as [string, string, string]
    expect(fertility).toBe('H361: Suspected of damaging fertility or the unborn child')
    const check = (statements: string[]) => () => checkSheetHazards(sheetOf(indicator), 'bottles.indicator.hazards', { ...indicator.hazards, statements })
    expect(check([defects, cancer, 'H361f: Suspected of damaging fertility'])).toThrow(/prints "Suspected of damaging fertility or the unborn child \(H361\)" for bottles\.indicator\.hazards\.statements\[2\], not the stored "H361f: Suspected of damaging fertility"/)
    expect(check([defects, cancer, 'H361f: Suspected of damaging fertility or the unborn child'])).toThrow(/not the stored "H361f: /)
    expect(check([cancer, defects, fertility])).toThrow(/for bottles\.indicator\.hazards\.statements\[0\], not the stored "H350: May cause cancer"/)
    expect(check([defects, cancer])).toThrow(/has rows for 3 statements of bottles\.indicator\.hazards and the record stores 2/)
    expect(() => checkSheetHazards(sheetOf(indicator), 'bottles.indicator.hazards', { ...indicator.hazards, signalWord: 'Warning' })).toThrow(/"flinn-sds-591" prints the signal word "DANGER", not "Warning"/)
  })

  it('reads a stored statement as the line the sheet prints, turned round: the codes first, then the statement', () => {
    expect(sheet.supports.find((row) => row.field === `${field}.statements[0]`)!.prints).toBe('Causes severe skin and eye burns and damage (H314+H318)')
    expect(burns).toBe('H314+H318: Causes severe skin and eye burns and damage')
    // The codes stay in the order the sheet prints them.
    expect(() => checkSheetHazards(sheet, field, { ...hcl.hazards, statements: [burns, 'H302+H332: Harmful if swallowed or inhaled', metals] })).toThrow(/prints "Harmful if swallowed or inhaled \(H332\+H302\)" for bottles\.hcl\.hazards\.statements\[1\], not the stored "H302\+H332: Harmful if swallowed or inhaled"/)
  })

  it('refuses a stored statement with a word changed, or under another code', () => {
    expect(() => checkSheetHazards(sheet, field, { ...hcl.hazards, statements: [burns, harmful, 'H290: May be corrosive to metal'] })).toThrow(/prints "May be corrosive to metals \(H290\)" for bottles\.hcl\.hazards\.statements\[2\], not the stored "H290: May be corrosive to metal"/)
    expect(() => checkSheetHazards(sheet, field, { ...hcl.hazards, statements: [burns, harmful, 'H291: May be corrosive to metals'] })).toThrow(/not the stored "H291: May be corrosive to metals"/)
  })

  it("refuses the gas's H331 on this bottle, as a line of its own or paired with another code, even where the manifest's rows print it too", () => {
    const gas = 'H331: Toxic if inhaled'
    expect(() => checkSheetHazards(sheet, field, { ...hcl.hazards, statements: [burns, harmful, metals, gas] }, ['H331'])).toThrow(/bottles\.hcl\.hazards\.statements\[3\] carries the code H331, which this bottle must not carry/)
    const paired = 'H331+H302: Harmful if swallowed or inhaled'
    const agreeing = printing(`${field}.statements[1]`, 'Harmful if swallowed or inhaled (H331+H302)')
    expect(() => checkSheetHazards(agreeing, field, { ...hcl.hazards, statements: [burns, paired, metals] })).not.toThrow()
    expect(() => checkSheetHazards(agreeing, field, { ...hcl.hazards, statements: [burns, paired, metals] }, ['H331'])).toThrow(/statements\[1\] carries the code H331/)
  })

  it('refuses a signal word the sheet does not print, and reads the capitals a sheet prints as the stored word', () => {
    expect(sheet.supports.find((row) => row.field === `${field}.signalWord`)!.prints).toBe('DANGER')
    expect(hcl.hazards.signalWord).toBe('Danger')
    expect(() => checkSheetHazards(sheet, field, { ...hcl.hazards, signalWord: 'Warning' })).toThrow(/"flinn-sds-395" prints the signal word "DANGER", not "Warning"/)
    expect(() => checkSheetHazards(printing(`${field}.signalWord`, 'WARNING'), field, hcl.hazards)).toThrow(/prints the signal word "WARNING", not "Danger"/)
  })

  it("refuses a record that leaves out one of the sheet's statements, adds one, or changes their order", () => {
    expect(() => checkSheetHazards(sheet, field, { ...hcl.hazards, statements: [burns, harmful] })).toThrow(/has rows for 3 statements of bottles\.hcl\.hazards and the record stores 2: the bottle must carry all of them, in the sheet's order/)
    expect(() => checkSheetHazards(sheet, field, { ...hcl.hazards, statements: [burns, harmful, metals, 'H335: May cause respiratory irritation'] })).toThrow(/has rows for 3 statements of bottles\.hcl\.hazards and the record stores 4/)
    expect(() => checkSheetHazards(sheet, field, { ...hcl.hazards, statements: [harmful, burns, metals] })).toThrow(/for bottles\.hcl\.hazards\.statements\[0\], not the stored "H332\+H302/)
  })

  it.each(['Causes severe skin and eye burns and damage', 'H314 Causes severe skin and eye burns and damage', 'H314+: Causes severe skin and eye burns and damage', 'H314 + H318: Causes severe skin and eye burns and damage', 'H31: Causes burns', 'H314+H318:', 'Causes severe skin and eye burns and damage (H314+H318)'])(
    'refuses %j, which is not a code or codes joined by a plus sign, then a colon and a statement',
    (statement) => {
      expect(() => checkSheetHazards(sheet, field, { ...hcl.hazards, statements: [statement, harmful, metals] })).toThrow(/bottles\.hcl\.hazards\.statements\[0\]: .* is not a hazard code, or codes joined by "\+", then a colon, a space and a statement/)
    },
  )

  it('refuses a source whose rows say nothing of the bottle, or give two signal words', () => {
    const other: Sheet = manifest.sources.find((source) => source.id === hcl.hazards.note.sourceId)!
    expect(() => checkSheetHazards(other, field, hcl.hazards)).toThrow(/"fisher-sds-hcl-0\.1n" has 0 rows for bottles\.hcl\.hazards\.signalWord, expected 1/)
    const twice = { ...sheet, supports: [...sheet.supports, sheet.supports.find((row) => row.field === `${field}.signalWord`)!] }
    expect(() => checkSheetHazards(twice, field, hcl.hazards)).toThrow(/has 2 rows for bottles\.hcl\.hazards\.signalWord, expected 1/)
  })

  it('refuses a row that is not a statement followed by its codes in brackets', () => {
    expect(() => checkSheetHazards(printing(`${field}.statements[2]`, 'H290: May be corrosive to metals'), field, hcl.hazards)).toThrow(/the row for bottles\.hcl\.hazards\.statements\[2\] prints "H290: May be corrosive to metals", which is not a statement and then its code or codes in brackets/)
  })
})

describe('checkWikipediaCopy', () => {
  it('accepts each kept copy with the figures read from it', () => {
    expect(() => checkWikipediaCopy(carbonicAcidPage, citation('perrin-1982-wikipedia'), ['6.35', '10.33'])).not.toThrow()
    expect(() => checkWikipediaCopy(dropPage, citation('drop-unit-wikipedia'), ['0.05'])).not.toThrow()
  })

  it('refuses a copy of another revision', () => {
    const other = structuredClone(carbonicAcidPage)
    other.query.pages[51420].revisions[0]!.revid = 1373747490
    expect(() => checkWikipediaCopy(other, citation('perrin-1982-wikipedia'), ['6.35', '10.33'])).toThrow(/is revision 1373747490, but the citation names 1376246456/)
    expect(() => checkWikipediaCopy(dropPage, citation('perrin-1982-wikipedia'), ['0.05'])).toThrow(/is revision 1314848686, but the citation names 1376246456/)
  })

  it('refuses a citation that names no revision', () => {
    expect(() => checkWikipediaCopy(dropPage, 'Wikipedia contributors. Drop (unit).', ['0.05'])).toThrow(/names no revision/)
  })

  it('refuses a figure the revision does not print as a number of its own', () => {
    expect(() => checkWikipediaCopy(dropPage, citation('drop-unit-wikipedia'), ['0.06'])).toThrow(/does not print 0\.06/)
    // "6.3" is in the page only as the start of "6.35", and "0.33" only as the end of "10.33".
    expect(() => checkWikipediaCopy(carbonicAcidPage, citation('perrin-1982-wikipedia'), ['6.3'])).toThrow(/does not print 6\.3/)
    expect(() => checkWikipediaCopy(carbonicAcidPage, citation('perrin-1982-wikipedia'), ['0.33'])).toThrow(/does not print 0\.33/)
  })
})

// The indicator's strength is not checked here: its catalogue listing was read and is not kept (the owner's decision
// of 2026-10-05), so there is no copy to check it against. inputs.test.ts holds the record to what the manifest
// says the page printed.
describe('the checks', () => {
  it('have none for the strength of the indicator', () => {
    expect(Object.keys(lib!)).not.toContain('checkStrength')
  })

  // No bottle's statements are read from a kept PubChem record any more, so the check against one is gone with the copies.
  it('have none against a kept PubChem classification', () => {
    expect(Object.keys(lib!)).not.toContain('checkHazards')
    expect(Object.keys(import.meta.glob('../../../docs/research/phase-3/sources/pubchem-cid-*-ghs.json'))).toEqual([])
  })
})

describe('checkPublished', () => {
  it('accepts a plain decimal that reads as the value, trailing zero or not, and a constant with no printed figure', () => {
    expect(() => checkPublished({ value: 9.5, published: '9.50' }, 'constants.indicatorPKas[1]')).not.toThrow()
    expect(() => checkPublished({ value: 1e-14 }, 'constants.waterIonProduct')).not.toThrow()
  })

  it.each(['9.51', 'about 9.5', '9.5 ', '95e-1', ''])('refuses the printed text %j for 9.5', (published) => {
    expect(() => checkPublished({ value: 9.5, published }, 'constants.indicatorPKas[1]')).toThrow(/constants\.indicatorPKas\[1\]: published .* is not a plain decimal equal to the stored value 9\.5/)
  })
})

describe('checkSha256', () => {
  it('accepts the bytes the manifest hashed, and refuses the file with one character changed', () => {
    const { file, sha256 } = manifest.sources.find((source) => source.id === 'noaa-gml-co2-annmean-gl')!
    expect(() => checkSha256(noaaFile, sha256!, file!)).not.toThrow()
    expect(() => checkSha256(noaaFile.replace('425.62', '425.63'), sha256!, file!)).toThrow(/noaa-co2-annmean-gl\.txt: sha256 is [0-9a-f]{64}, not the manifest's e0b1f499/)
  })
})
