import { describe, expect, it } from 'vitest'
import manifestFile from '../../../docs/research/phase-3/sources/MANIFEST.json'
import listing from '../../../docs/research/phase-3/sources/ricca-5600-listing.html?raw'
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
  sources: { id: string; url: string; citation: string; file?: string; sha256?: string; supports: { field: string; prints: string; where: string }[] }[]
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

  it('keeps the catalogue listing the indicator strength is read from, and the listing prints it', () => {
    const strength = input.constants.indicatorStrength as Constant
    expect(strength).toMatchObject({ value: 0.5, published: '0.5', unit: 'g per 100 mL' })
    expect(source(strength.sourceId)?.file).toBe('ricca-5600-listing.html')
    expect(listing).toContain('Phenolphthalein Indicator, 0.5% (w/v)')
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
    // The page's body prints two other sets for the same constants, the second as the first constant and a difference.
    for (const figure of ['6.77', '9.93', '3.49']) expect([figure, page.includes(figure)]).toEqual([figure, true])
    expect((6.35 + 3.49).toFixed(2)).toBe('9.84')
    for (const figure of ['6.77', '9.93', '3.49', '9.84']) expect([figure, first!.note?.includes(figure)]).toEqual([figure, true])
    for (const figure of ['9.93', '9.84']) expect([figure, second!.note?.includes(figure)]).toEqual([figure, true])
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
