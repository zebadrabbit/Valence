import { describe, expect, it } from 'vitest'
import manifest from '../../../docs/research/phase-3/sources/MANIFEST.json'
import noaaFile from '../../../docs/research/phase-3/sources/noaa-co2-annmean-gl.txt?raw'
import sodiumHydroxideRecord from '../../../docs/research/phase-3/sources/pubchem-cid-14798-ghs.json'
import hydrochloricAcidRecord from '../../../docs/research/phase-3/sources/pubchem-cid-313-ghs.json'
import phenolphthaleinRecord from '../../../docs/research/phase-3/sources/pubchem-cid-4764-ghs.json'
import phenolphthaleinProperties from '../../../docs/research/phase-3/sources/pubchem-cid-4764-properties.json'
import carbonicAcidPage from '../../../docs/research/phase-3/sources/wikipedia-carbonic-acid-1376246456.json'
import dropPage from '../../../docs/research/phase-3/sources/wikipedia-drop-unit-1314848686.json'
import input from '../../../docs/research/phase-3/titration.json'

// The checks scripts/build-chem-data.mjs runs on the titration lab's record against the kept copies of its sources,
// tested here on inputs they must refuse. The script itself writes files, so its checks live in
// scripts/titration-lib.mjs as plain functions.
type Hazards = { signalWord: string; statements: string[] }
type Lib = {
  checkPublished(constant: { value: number; published?: string }, where: string): void
  checkAnnualMean(text: string, year: number, published: string): void
  checkMolecularWeight(properties: unknown, cid: number, published: string): void
  checkHazards(record: unknown, reference: string, hazards: Hazards): void
  checkWikipediaCopy(copy: unknown, citation: string, figures: string[]): void
  checkSha256(bytes: string, sha256: string, file: string): void
}
const [lib] = Object.values(import.meta.glob<Lib>('../../../scripts/titration-lib.mjs', { eager: true }))
const { checkPublished, checkAnnualMean, checkMolecularWeight, checkHazards, checkWikipediaCopy, checkSha256 } = lib!

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

describe('checkHazards', () => {
  it('accepts each bottle as the record stores it', () => {
    expect(() => checkHazards(hydrochloricAcidRecord, hcl.reference, hcl.hazards)).not.toThrow()
    expect(() => checkHazards(sodiumHydroxideRecord, naoh.reference, naoh.hazards)).not.toThrow()
    expect(() => checkHazards(phenolphthaleinRecord, indicator.reference, indicator.hazards)).not.toThrow()
  })

  it('accepts "H361f: Suspected of damaging fertility" against a record that prints the code with asterisks', () => {
    expect(JSON.stringify(phenolphthaleinRecord)).toContain('H361f ***: Suspected of damaging fertility [Warning Reproductive toxicity]')
    expect(indicator.hazards.statements[2]).toBe('H361f: Suspected of damaging fertility')
    expect(() => checkHazards(phenolphthaleinRecord, indicator.reference, indicator.hazards)).not.toThrow()
  })

  it('refuses a stored statement with a word changed', () => {
    const statements = ['H314: Causes serious skin burns and eye damage', hcl.hazards.statements[1]!]
    expect(() => checkHazards(hydrochloricAcidRecord, hcl.reference, { ...hcl.hazards, statements })).toThrow(/does not print the statement "H314: Causes serious skin burns and eye damage"/)
  })

  it('refuses a statement under the wrong code', () => {
    const statements = ['H315: Causes severe skin burns and eye damage']
    expect(() => checkHazards(sodiumHydroxideRecord, naoh.reference, { ...naoh.hazards, statements })).toThrow(/does not print the statement "H315/)
  })

  it('refuses a statement the record lists only under another entry: H331 for the HCl bottle', () => {
    const gas = 'H331: Toxic if inhaled'
    const statements = [hcl.hazards.statements[0]!, gas]
    expect(() => checkHazards(hydrochloricAcidRecord, hcl.reference, { ...hcl.hazards, statements })).toThrow(/hydrochloric acid".*does not print the statement "H331: Toxic if inhaled"/)
    // The record does print it, under the entry for hydrogen chloride, the gas.
    const reference = 'Hazardous Chemical Information System (HCIS), Safe Work Australia: hydrogen chloride'
    expect(() => checkHazards(hydrochloricAcidRecord, reference, { ...hcl.hazards, statements })).not.toThrow()
  })

  it('refuses a signal word the entry does not carry', () => {
    expect(() => checkHazards(hydrochloricAcidRecord, hcl.reference, { ...hcl.hazards, signalWord: 'Warning' })).toThrow(/carries the signal word "Danger", not "Warning"/)
  })

  it("refuses a record that leaves out one of the entry's statements, or changes their order", () => {
    const [first, second, third] = indicator.hazards.statements as [string, string, string]
    expect(() => checkHazards(phenolphthaleinRecord, indicator.reference, { ...indicator.hazards, statements: [first, second] })).toThrow(/all 3 statements.*in its order/)
    expect(() => checkHazards(phenolphthaleinRecord, indicator.reference, { ...indicator.hazards, statements: [second, first, third] })).toThrow(/in its order/)
  })

  it('refuses a reference that names no entry of the record, or more than one', () => {
    expect(() => checkHazards(hydrochloricAcidRecord, 'Safe Work Australia: hydrochloric acid', hcl.hazards)).toThrow(/has 0 entries named/)
    expect(() => checkHazards(sodiumHydroxideRecord, hcl.reference, hcl.hazards)).toThrow(/CID 14798 has 0 entries named/)
    const twice = structuredClone(hydrochloricAcidRecord)
    twice.Record.Reference.push(twice.Record.Reference.find((entry) => entry.ReferenceNumber === 59)!)
    expect(() => checkHazards(twice, hcl.reference, hcl.hazards)).toThrow(/has 2 entries named/)
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
