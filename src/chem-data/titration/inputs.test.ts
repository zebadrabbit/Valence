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
  reference: string
  hazards: { signalWord: string; statements: string[]; note: { value: string; sourceId: string }; sourceId: string }
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
      ]),
    ]
    expect(named.filter(([, id]) => !ids.includes(id!))).toEqual([])
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
  it('gives the HCl bottle the entry for hydrochloric acid, not the one for hydrogen chloride gas', () => {
    const { hcl } = input.bottles
    const codes = hcl.hazards.statements.map((statement) => statement.split(':')[0])
    expect(codes).toEqual(['H314', 'H335'])
    expect(codes).not.toContain('H331')
    expect(hcl.classifiedAs).not.toContain('pure')
    expect(hcl.classifiedAs).toContain('hydrochloric acid')
  })

  it('labels the other two bottles as the hazards of the pure substance', () => {
    expect(input.bottles.naoh.classifiedAs).toContain('pure substance')
    expect(input.bottles.indicator.classifiedAs).toContain('pure substance')
    expect(input.bottles.naoh.hazards.statements.map((s) => s.split(':')[0])).toEqual(['H314'])
    expect(input.bottles.indicator.hazards.statements.map((s) => s.split(':')[0])).toEqual(['H341', 'H350', 'H361f'])
  })

  it('rests each hazard note on a data sheet of its own, not on the classification', () => {
    for (const [key, bottle] of bottles) {
      expect([key, bottle.hazards.note.sourceId]).not.toEqual([key, bottle.hazards.sourceId])
      expect([key, bottle.hazards.sourceId]).toEqual([key, `pubchem-cid-${bottle.pubchemCid}`])
    }
  })

  it("says which country's rule the two suppliers' sheets classify under, since the statements above the notes come from other systems", () => {
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
