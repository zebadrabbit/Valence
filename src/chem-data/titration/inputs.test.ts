import { describe, expect, it } from 'vitest'
import manifestFile from '../../../docs/research/phase-3/sources/MANIFEST.json'
import carbonicAcidPage from '../../../docs/research/phase-3/sources/wikipedia-carbonic-acid-1376246456.json'
import inputFile from '../../../docs/research/phase-3/titration.json'
import { findInstitutionText } from '../denylist'

// The two authored files the build step (scripts/build-chem-data.mjs) will read: the lab's record and the
// manifest of its sources. Checked here before any schema or build exists, so a later task starts from inputs
// that already hold together.
type Constant = { value: number; published?: string; unit: string; note?: string; sourceId: string; year?: number }
type Bottle = {
  name: string
  formula: string
  pubchemCid: number
  classifiedAs: string
  /** The entry of a kept PubChem record the statements were read from until 2026-10-05. No bottle has one now: every bottle's statements are a sheet's. */
  reference?: string
  hazards: { signalWord: string; statements: string[]; note: { value: string; sourceId: string; alsoSourceId?: string }; sourceId: string }
}
type Input = {
  bottles: Record<'hcl' | 'naoh' | 'indicator', Bottle>
  constants: Record<string, Constant | Constant[]>
  parameters: Record<string, { value: number | number[]; rationale: string }>
}
type Manifest = {
  sources: { id: string; url: string; citation: string; file?: string; sha256?: string; fetchedSha256?: string; supports: { field: string; prints: string; where: string }[] }[]
}

const input: Input = inputFile
const manifest: Manifest = manifestFile

// Optional, untracked: see registry.test.ts.
const local = import.meta.glob<string[]>('../denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

/** Every constant with the path the manifest names it by: "constants.henryCo2", "constants.indicatorPKas[1]". */
const constants = Object.entries(input.constants).flatMap(([key, entry]): [string, Constant][] =>
  Array.isArray(entry) ? entry.map((item, i) => [`constants.${key}[${i}]`, item]) : [[`constants.${key}`, entry]],
)
const bottles = Object.entries(input.bottles)
const source = (id: string) => manifest.sources.find((s) => s.id === id)
const value = (key: string) => input.parameters[key]?.value as number

describe('the titration inputs: sources', () => {
  it('names only sources the manifest lists, each listed once', () => {
    const ids = manifest.sources.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    const named = [
      ...constants.map(([path, c]) => [path, c.sourceId]),
      ...bottles.flatMap(([key, b]) => [
        [`bottles.${key}.hazards`, b.hazards.sourceId],
        [`bottles.${key}.hazards.note`, b.hazards.note.sourceId],
        ...(b.hazards.note.alsoSourceId === undefined ? [] : [[`bottles.${key}.hazards.note.alsoSourceId`, b.hazards.note.alsoSourceId]]),
      ]),
    ]
    expect(named.filter(([, id]) => !ids.includes(id!))).toEqual([])
    // A note's second source, where it has one, is another source than its first.
    for (const [key, b] of bottles) expect([key, b.hazards.note.alsoSourceId]).not.toEqual([key, b.hazards.note.sourceId])
  })

  it('has, for each printed figure, a manifest row that prints the same digits', () => {
    const published = constants.filter(([, c]) => c.published !== undefined)
    expect(published.length).toBe(9)
    for (const [path, c] of published) {
      const prints = source(c.sourceId)?.supports.filter((row) => row.field === path).map((row) => row.prints)
      expect([path, prints]).toEqual([path, expect.arrayContaining([c.published])])
    }
  })

  it('stores K_w with no printed figure, and the manifest row gives the pK_w the release prints', () => {
    const kw = input.constants.waterIonProduct as Constant
    expect(kw).toMatchObject({ value: 1e-14, unit: '', sourceId: 'iapws-r11-24' })
    expect(kw.published).toBeUndefined()
    expect(source('iapws-r11-24')?.supports.find((row) => row.field === 'constants.waterIonProduct')?.prints).toBe('13.99')
    // The note's conversion from the molal to the molar scale, worked again from the two figures it names.
    expect(kw.note).toContain('13.994')
    expect(kw.note).toContain('0.99705')
    expect((13.994 - 2 * Math.log10(0.99705)).toFixed(3)).toBe('13.997')
    expect(kw.note).toContain('13.997')
  })

  it('states the year of the atmospheric CO2 figure', () => {
    expect((input.constants.atmosphericCo2 as Constant).year).toBe(2025)
  })

  it('keeps no copy of an OpenStax page', () => {
    const openstax = manifest.sources.filter((s) => /openstax/i.test(s.id) || /openstax/i.test(s.url))
    expect(openstax.filter((s) => s.file !== undefined)).toEqual([])
  })

  it('cites the catalogue listing the indicator strength is read from as a page that was read and not kept (the owner\'s decision of 2026-10-05)', () => {
    const strength = input.constants.indicatorStrength as Constant
    expect(strength).toMatchObject({ value: 0.5, published: '0.5', unit: 'g per 100 mL' })
    const listing = source(strength.sourceId)!
    // No copy, so nothing in the build can check the figure again: the manifest says what the page prints and where.
    expect(listing.file).toBeUndefined()
    expect(listing.sha256).toBeUndefined()
    expect(Object.keys(import.meta.glob('../../../docs/research/phase-3/sources/*.html'))).toEqual([])
    expect(listing.citation).toMatch(/read on 2026-10-04; no copy is kept/)
    const prints = (field: string) => listing.supports.filter((row) => row.field === field).map((row) => row.prints)
    expect(prints('constants.indicatorStrength')).toEqual(['0.5'])
    expect(prints('constants.indicatorStrength.note')).toEqual(['(w/v)', '50% (v/v) Alcohol', '5 g/L'])
    // The hash of the page as it was fetched is recorded apart: `sha256` is the hash of a kept file, and there is none.
    expect(listing.fetchedSha256).toMatch(/^[0-9a-f]{64}$/)
    // The note says what the figure now rests on.
    expect(strength.note).toMatch(/read on 2026-10-04/)
    expect(strength.note).toMatch(/No copy of the page is kept/)
    expect(strength.note).toMatch(/the build does not check it again/)
  })

  it('records the hash of a page as fetched only for a source that keeps no copy', () => {
    for (const s of manifest.sources) expect([s.id, s.fetchedSha256 !== undefined && s.file !== undefined]).toEqual([s.id, false])
  })

  it('says of the carbonic constants what the kept page prints, and calls the rest this project\'s reading', () => {
    const page = Object.values(carbonicAcidPage.query.pages)[0]!.revisions[0]!.slots.main['*']
    const [first, second] = input.constants.carbonicPKas as Constant[]
    // The infobox: a temperature beside the first figure only, and one word beside the stored one.
    expect(page).toContain('3.75 (25 °C; anhydrous)')
    expect(page).toContain(`${first!.published} (hydrous)`)
    expect(first!.note).toContain('hydrous')
    expect(first!.note).toMatch(/no temperature/)
    // What the figure is the constant of is not on the page, so the note does not put it there.
    expect(page).not.toMatch(/apparent|composite|taken together/i)
    expect(first!.note).toMatch(/this project's reading/)
    const where = source(first!.sourceId)?.supports.find((row) => row.field === 'constants.carbonicPKas[0]')?.where
    expect(where).toContain('hydrous')
    expect(where).not.toMatch(/apparent|taken together/)
    // The page's body prints one other set for the same two constants.
    for (const figure of ['6.77', '9.93']) expect([figure, page.includes(figure), first!.note?.includes(figure)]).toEqual([figure, true, true])
    expect(second!.note).toContain('9.93')
    // A difference the body also prints is no value of the second constant, so nothing is worked from it.
    for (const text of [first!.note, second!.note, ...source(first!.sourceId)!.supports.map((row) => row.where)]) expect(text).not.toContain('9.84')
    for (const note of [first!.note, second!.note]) expect(note).not.toContain('3.49')
  })

  it('names a second source for the carbonic constants, one that gives the species and the temperature, and stores nothing from it', () => {
    const [first, second] = input.constants.carbonicPKas as Constant[]
    const survey = source('usgs-phreeqc-dat')!
    // Read and not kept, so nothing in the build can check it: the manifest says what it prints and where.
    expect(survey.file).toBeUndefined()
    const prints = (field: string) => survey.supports.filter((row) => row.field === field).map((row) => row.prints)
    expect(prints('constants.carbonicPKas[0].note')).toEqual(['16.681', '10.329'])
    expect(prints('constants.carbonicPKas[1].note')).toEqual(['10.329'])
    expect(survey.supports.map((row) => /25 °C/.test(row.where))).toEqual([true, true, true])
    // The first constant with dissolved carbon dioxide as the acid is a difference of the two printed figures: worked out, not read.
    expect((16.681 - 10.329).toFixed(3)).toBe('6.352')
    for (const figure of ['16.681', '10.329', '6.352', '25 °C', 'worked out']) expect([figure, first!.note?.includes(figure)]).toEqual([figure, true])
    for (const figure of ['10.329', '6.352', '25 °C']) expect([figure, second!.note?.includes(figure)]).toEqual([figure, true])
    for (const note of [first!.note, second!.note]) expect(note).toMatch(/dissolved carbon dioxide/)
    // Rounded to two decimals they are the stored figures, which stay as they were, on the source they were read from.
    expect([(6.352).toFixed(2), (10.329).toFixed(2)]).toEqual([first!.published, second!.published])
    expect([first, second].map((c) => [c!.value, c!.sourceId])).toEqual([
      [6.35, 'perrin-1982-wikipedia'],
      [10.33, 'perrin-1982-wikipedia'],
    ])
  })

  it('gives every kept copy a hash, and every source something it supports', () => {
    for (const s of manifest.sources) {
      expect([s.id, s.file === undefined, s.supports.length > 0]).toEqual([s.id, s.sha256 === undefined, true])
      expect([s.id, /^https:\/\//.test(s.url)]).toEqual([s.id, true])
    }
  })
})

describe('the titration inputs: bottles', () => {
  // D4 as the owner confirmed and widened it on 2026-10-05: each bottle's signal word and statements are those of
  // one supplier's safety data sheet for the concentrated or the pure substance, read and not kept. Before, the acid
  // bottle carried an entry of PubChem's record that gave no strength, and the other two the entries PubChem gives
  // from a European regulation.
  const SHEETS = { hcl: 'flinn-sds-395', naoh: 'flinn-sds-734', indicator: 'flinn-sds-591' } as const
  const KEYS = ['hcl', 'naoh', 'indicator'] as const
  const SHEET_ID = SHEETS.hcl
  const sheet = source(SHEET_ID)!
  const printedBy = (id: string, field: string) => source(id)!.supports.filter((row) => row.field === field).map((row) => row.prints)
  const printedFor = (field: string) => printedBy(SHEET_ID, field)

  it("gives the HCl bottle the signal word and the statements of a supplier's safety data sheet for concentrated acid, as the sheet prints them, and not the gas's H331", () => {
    const { hcl } = input.bottles
    expect(hcl.hazards.sourceId).toBe(SHEET_ID)
    expect(hcl.hazards.signalWord).toBe('Danger')
    // The sheet's own three lines, each with its code or codes in front as the sheet prints them.
    expect(hcl.hazards.statements).toEqual(['H314+H318: Causes severe skin and eye burns and damage', 'H332+H302: Harmful if swallowed or inhaled', 'H290: May be corrosive to metals'])
    const codes = hcl.hazards.statements.flatMap((statement) => statement.split(':')[0]!.split('+'))
    expect(codes).toEqual(['H314', 'H318', 'H332', 'H302', 'H290'])
    expect(codes).not.toContain('H331')
    // No entry of a PubChem record is named for it any more.
    expect(hcl.reference).toBeUndefined()
  })

  it("gives the other two bottles the signal word and the statements of the same supplier's sheets for the solid, as each sheet prints them", () => {
    const { naoh, indicator } = input.bottles
    expect([naoh.hazards.sourceId, indicator.hazards.sourceId]).toEqual([SHEETS.naoh, SHEETS.indicator])
    expect([naoh.hazards.signalWord, indicator.hazards.signalWord]).toEqual(['Danger', 'Danger'])
    expect(naoh.hazards.statements).toEqual(['H314: Causes severe skin burns and eye damage', 'H290: May be corrosive to metals'])
    // The sheet prints H361 with no letter after it, and gives it both halves: fertility and the unborn child.
    expect(indicator.hazards.statements).toEqual(['H341: Suspected of causing genetic defects', 'H350: May cause cancer', 'H361: Suspected of damaging fertility or the unborn child'])
    expect(JSON.stringify(input.bottles)).not.toContain('H361f')
    // No bottle names an entry of a PubChem record any more, and none cites one for its hazards.
    for (const key of KEYS) expect([key, input.bottles[key].reference, /pubchem/.test(input.bottles[key].hazards.sourceId)]).toEqual([key, undefined, false])
  })

  it('says over the HCl bottle\'s statements whose hazards they are and at what strength', () => {
    const { classifiedAs } = input.bottles.hcl
    expect(classifiedAs).toBe("Hazards of concentrated hydrochloric acid (6 M to 12 M), from a supplier's safety data sheet")
    expect(classifiedAs).not.toContain('pure')
    expect(classifiedAs).not.toMatch(/Australia|PubChem|regulator/i)
    // The strength is the one in the sheet's title, and its section 3 gives the same solution as a percentage.
    expect(printedFor('bottles.hcl.classifiedAs')).toEqual(['6 M - 12 M (Concentrated)', '20-38%'])
  })

  it("says over the other two bottles' statements whose hazards they are and in what form: the solid, the pure substance", () => {
    expect(input.bottles.naoh.classifiedAs).toBe("Hazards of solid sodium hydroxide, the pure substance, from a supplier's safety data sheet")
    expect(input.bottles.indicator.classifiedAs).toBe("Hazards of solid phenolphthalein, the pure substance, from a supplier's safety data sheet")
    // Each sheet's title names the substance and no strength; another row gives the form.
    expect(printedBy(SHEETS.naoh, 'bottles.naoh.classifiedAs')).toEqual(['Sodium Hydroxide', 'Sodium hydroxide, solid'])
    expect(printedBy(SHEETS.indicator, 'bottles.indicator.classifiedAs')).toEqual(['Phenolphthalein', 'Pale yellow powder'])
    for (const key of ['naoh', 'indicator'] as const) {
      expect([key, /regulation|PubChem|European/i.test(input.bottles[key].classifiedAs)]).toEqual([key, false])
      // That the sheet is for the substance alone is said where its title is: nothing else is in its composition table.
      expect([key, /alone/.test(source(SHEETS[key])!.supports.find((row) => row.field === `bottles.${key}.classifiedAs`)!.where)]).toEqual([key, true])
    }
  })

  it('lists each sheet in the manifest as a page that was read and not kept, with a row for the signal word, each statement, the strength or form and the revision date', () => {
    const expected = {
      hcl: {
        url: 'https://www.flinnsci.com/sds_395-hydrochloric-acid-6-m---12-m-concentrated/sds_395',
        citation: /Safety Data Sheet: Hydrochloric Acid 6 M - 12 M \(Concentrated\), SDS number sds_395; revision date December 3, 2018 \(read on 2026-10-05; no copy is kept\)\.$/,
        revised: 'December 3, 2018',
        lines: ['Causes severe skin and eye burns and damage (H314+H318)', 'Harmful if swallowed or inhaled (H332+H302)', 'May be corrosive to metals (H290)'],
      },
      naoh: {
        url: 'https://www.flinnsci.com/sds_734-sodium-hydroxide/sds_734',
        citation: /Safety Data Sheet: Sodium Hydroxide, SDS number sds_734; revision date March 25, 2014 \(read on 2026-10-05; no copy is kept\)\.$/,
        revised: 'March 25, 2014',
        lines: ['Causes severe skin burns and eye damage (H314)', 'May be corrosive to metals (H290)'],
      },
      indicator: {
        url: 'https://www.flinnsci.com/sds_591-phenolphthalein/sds_591',
        citation: /Safety Data Sheet: Phenolphthalein, SDS number sds_591; revision date April 1, 2015 \(read on 2026-10-05; no copy is kept\)\.$/,
        revised: 'April 1, 2015',
        lines: ['Suspected of causing genetic defects (H341)', 'May cause cancer (H350)', 'Suspected of damaging fertility or the unborn child (H361)'],
      },
    }
    for (const key of KEYS) {
      const s = source(SHEETS[key])!
      const field = `bottles.${key}`
      expect([key, s.url, s.file, s.sha256]).toEqual([key, expected[key].url, undefined, undefined])
      expect([key, /^[0-9a-f]{64}$/.test(s.fetchedSha256 ?? '')]).toEqual([key, true])
      expect([key, expected[key].citation.test(s.citation)]).toEqual([key, true])
      expect([key, printedBy(s.id, `${field}.hazards.signalWord`)]).toEqual([key, ['DANGER']])
      expect([key, input.bottles[key].hazards.statements.map((_, i) => printedBy(s.id, `${field}.hazards.statements[${i}]`))]).toEqual([key, expected[key].lines.map((line) => [line])])
      expect([key, printedBy(s.id, `${field}.hazards`)]).toEqual([key, [expected[key].revised]])
      // Every row of the sheet is for its bottle or for the primer, and none is for a statement the bottle does not store.
      const others = s.supports.map((row) => row.field).filter((f) => f !== 'primer' && f !== `${field}.classifiedAs` && f !== `${field}.hazards` && f !== `${field}.hazards.signalWord` && !new RegExp(`^bottles\\.${key}\\.hazards\\.statements\\[[0-${expected[key].lines.length - 1}]\\]$`).test(f))
      expect([key, others]).toEqual([key, []])
      // No two sheets are one page.
      expect([key, manifest.sources.filter((other) => other.fetchedSha256 === s.fetchedSha256).length]).toEqual([key, 1])
    }
  })

  it('says in the manifest which form the statements are stored in and why, and of each sheet\'s sentences that are not hazard statements only that they are not carried', () => {
    const where = sheet.supports.map((row) => row.where).join(' ')
    expect(where).toMatch(/The record stores the sheet's own three lines/)
    expect(where).toMatch(/not one line for each code/)
    // One line says the sentence is there and is left out. The sentence is not repeated.
    const lines = sheet.supports.filter((row) => /cancer/i.test(`${row.prints} ${row.where}`))
    expect(lines.length).toBe(1)
    expect(lines[0]!.where).toMatch(/is not a GHS hazard statement, and is not carried into the record/)
    for (const text of [input.bottles.hcl.classifiedAs, input.bottles.hcl.hazards.note.value, ...input.bottles.hcl.hazards.statements]) expect(text).not.toMatch(/cancer|carcinogen/i)
    // The other two sheets' statements are stored in the same form, and their rows say so by pointing at the acid's.
    for (const key of ['naoh', 'indicator'] as const) {
      const rows = source(SHEETS[key])!.supports
      expect([key, /stored as the acid's are \(see `flinn-sds-395`\)/.test(rows.find((row) => row.field === `bottles.${key}.hazards.statements[0]`)!.where)]).toEqual([key, true])
      // One line of each says what else the sheet's hazard section prints, and that it is left out.
      expect([key, rows.filter((row) => /not carried into the record/.test(row.where)).length]).toEqual([key, 1])
    }
    // The indicator's sheet has a sentence on a cancer listing too: it is not a hazard statement, and it is not repeated.
    const listing = source(SHEETS.indicator)!.supports.filter((row) => /listing/i.test(row.where))
    expect(listing.length).toBe(1)
    expect(listing[0]!.where).toMatch(/is not a GHS hazard statement, and is not carried into the record/)
    for (const key of KEYS) expect([key, /carcinogen|IARC|Toxicology Program|anticipated/i.test(JSON.stringify(source(SHEETS[key])))]).toEqual([key, false])
  })

  it('keeps no PubChem copy of a classification and lists none, now that no bottle reads one', () => {
    expect(manifest.sources.filter((s) => /cid[-/ ](313|14798)\b/i.test(`${s.id} ${s.url} ${s.file ?? ''}`))).toEqual([])
    expect(Object.keys(import.meta.glob('../../../docs/research/phase-3/sources/pubchem-cid-*-ghs.json'))).toEqual([])
    expect(manifest.sources.filter((s) => /Safe Work Australia|GHS Classification|1272\/2008/.test(JSON.stringify(s)))).toEqual([])
    // PubChem's record for phenolphthalein is still a source, for the molar mass alone, and its kept copy is the property table.
    const record = source('pubchem-cid-4764')!
    expect(record.file).toBe('pubchem-cid-4764-properties.json')
    expect(record.supports.map((row) => row.field)).toEqual(['constants.indicatorMolarMass'])
    expect(JSON.stringify(manifest)).not.toContain('alsoKept')
    expect((input.constants.indicatorMolarMass as Constant).sourceId).toBe('pubchem-cid-4764')
  })

  it('rests each hazard note on a data sheet of its own, not on the source of the statements', () => {
    for (const [key, bottle] of bottles) {
      expect([key, bottle.hazards.note.sourceId]).not.toEqual([key, bottle.hazards.sourceId])
      expect([key, /^(fisher|ricca)-sds-/.test(bottle.hazards.note.sourceId)]).toEqual([key, true])
    }
  })

  it('tells the sheet under the HCl bottle\'s note from the sheet its statements come from, and keeps what the note said', () => {
    const { value } = input.bottles.hcl.hazards.note
    expect(value).toMatch(/A supplier's safety data sheet for hydrochloric acid of this strength, which is not the sheet the statements above come from/)
    expect(value).toMatch(/gives the signal word Warning, not Danger: it says the solution irritates the skin, causes serious eye irritation and may corrode metals\./)
    expect(value).toMatch(/That sheet calls for eye protection and gloves, and says that a splash in the eyes or on the skin is to be flushed with a lot of water, for 15 minutes or longer\.$/)
    expect(input.bottles.hcl.hazards.note.sourceId).toBe('fisher-sds-hcl-0.1n')
  })

  it("says which country's rule the two suppliers' sheets under the notes classify under: the base's statements come from another system, and the sheet the acid's come from does not name its rule", () => {
    expect(JSON.stringify(sheet)).not.toMatch(/1910\.1200/)
    expect(sheet.supports.map((row) => row.where).join(' ')).toMatch(/does not say which rule its classification is made under/)
    for (const key of ['hcl', 'naoh'] as const) {
      const { note } = input.bottles[key].hazards
      expect([key, /classifies under the United States hazard communication standard/.test(note.value)]).toEqual([key, true])
      expect([key, source(note.sourceId)?.supports.some((row) => row.field === `bottles.${key}.hazards.note` && row.prints === '29 CFR 1910.1200')]).toEqual([key, true])
    }
  })

  it("calls each note's sheet a supplier's sheet for a solution of that kind, since which product is on this bench is assumed and not established", () => {
    for (const [key, bottle] of bottles) {
      expect([key, /A supplier's safety data sheet for /.test(bottle.hazards.note.value)]).toEqual([key, true])
      expect([key, /The supplier's/.test(bottle.hazards.note.value)]).toEqual([key, false])
    }
    // The strength's own note says the bottle being such a solution is an assumption; the hazard note may not say more.
    expect((input.constants.indicatorStrength as Constant).note).toMatch(/an assumption, not something established/)
    expect(input.bottles.indicator.hazards.note.value).toMatch(/is taken to be a 0\.5% \(w\/v\) solution in 50% alcohol/)
  })

  it('repeats the by-mass figure of each note that states one', () => {
    // 0.1 mol/L times the molar mass, in g/L, taking the density as 1.00 g/mL, so a tenth of it is the percentage.
    // The molar masses are sums of the abridged atomic weights the periodic table stores (H 1.0080, Cl 35.45;
    // Na 22.990, O 15.999).
    const percent = (molarMass: number) => ((0.1 * molarMass) / 10).toFixed(1)
    expect(percent(36.458)).toBe('0.4')
    expect(percent(39.997)).toBe('0.4')
    expect(bottles.filter(([, b]) => b.hazards.note.value.includes('by mass')).map(([key]) => key)).toEqual(['hcl', 'naoh'])
    expect(input.bottles.hcl.hazards.note.value).toContain(`about ${percent(36.458)}% hydrogen chloride by mass (worked out`)
    expect(input.bottles.naoh.hazards.note.value).toContain(`about ${percent(39.997)}% sodium hydroxide by mass (worked out`)
  })
})

describe('the titration inputs: parameters and prose', () => {
  it('gives every parameter a rationale that is a sentence', () => {
    expect(Object.keys(input.parameters).length).toBe(31)
    for (const [key, parameter] of Object.entries(input.parameters)) {
      expect([key, /^[A-Z].{20,}\.$/s.test(parameter.rationale)]).toEqual([key, true])
    }
  })

  it('says in the rationales what the owner decided they must say', () => {
    const rationale = (key: string) => input.parameters[key]?.rationale
    expect(rationale('unconditionedStrengthPercent')).toMatch(/refill/)
    expect(rationale('unconditionedStrengthPercent')).toMatch(/real burette/)
    expect(rationale('halfDropUl')).toMatch(/wall/)
    expect(rationale('halfDropUl')).toMatch(/distilled water/)
    // Every delivery is a whole number of half-drops but the one that stops at the last mark.
    expect(rationale('halfDropUl')).toMatch(/except .* 50\.00 mL mark/)
    expect(rationale('waterMaxUl')).toMatch(/CO₂/)
    expect(rationale('molarityRoundingE6')).toMatch(/fourth decimal place/)
    expect(rationale('molarityRoundingE6')).toMatch(/tie/)
    expect(rationale('faintPinkNameLimit')).toMatch(/Presentation only/)
    expect(rationale('pinkDisplayScale')).toMatch(/Presentation only/)
  })

  it('holds how long a drawn plume takes to fade as two durations, one for each way of fading, and nothing finer', () => {
    // The app is handed the plume's status and no number, so the drawing's fade can follow from nothing else.
    expect(value('plumeFadeAtOnceSeconds')).toBe(0.5)
    expect(value('plumeFadeSlowlySeconds')).toBe(3)
    for (const key of ['plumeFadeAtOnceSeconds', 'plumeFadeSlowlySeconds']) {
      expect([key, /Presentation only/.test(input.parameters[key]!.rationale), /status/.test(input.parameters[key]!.rationale)]).toEqual([key, true, true])
    }
  })

  it('says where a cited figure is used outside the conditions it was given for', () => {
    // NOAA's figure is a fraction of dry air, and the model multiplies it by the whole pressure of the air.
    expect(input.parameters.airPressureBar!.rationale).toMatch(/dry air/)
    expect(input.parameters.airPressureBar!.rationale).toMatch(/whole pressure/)
    // The indicator's constants were measured in a buffer and go into a flask that is not one.
    const [first] = input.constants.indicatorPKas as Constant[]
    expect(first!.note).toMatch(/0\.2 M phosphate buffers/)
    expect(first!.note).toMatch(/unchanged/)
  })

  it('holds no institution text in any name, statement, note or rationale', () => {
    const prose: [string, string][] = [
      ...bottles.flatMap(([key, b]): [string, string][] => [
        [`${key} name`, b.name],
        [`${key} classifiedAs`, b.classifiedAs],
        [`${key} note`, b.hazards.note.value],
        ...b.hazards.statements.map((statement, i): [string, string] => [`${key} statement ${i}`, statement]),
      ]),
      ...constants.flatMap(([path, c]): [string, string][] => (c.note === undefined ? [] : [[path, c.note]])),
      ...Object.entries(input.parameters).map(([key, p]): [string, string] => [key, p.rationale]),
    ]
    expect(prose.length).toBeGreaterThan(40)
    for (const [what, text] of prose) expect([what, findInstitutionText(text, institutionNames)]).toEqual([what, null])
  })

  it('keeps every delivery and the tip bubble on the half-drop grid', () => {
    expect(value('dropUl') % value('halfDropUl')).toBe(0)
    expect(value('streamUl') % value('halfDropUl')).toBe(0)
    expect((value('halfDropUl') * value('tipBubbleUl')) % value('tipBubbleEscapeUl')).toBe(0)
    expect(value('tipBubbleEscapeUl') % value('halfDropUl')).toBe(0)
    expect(value('waterMaxUl') % value('waterStepUl')).toBe(0)
  })
})
