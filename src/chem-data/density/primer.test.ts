import { describe, expect, it } from 'vitest'
import hazardManifest from '../../../docs/research/density/sources/hazard-manifest.json'
import manifestFile from '../../../docs/research/density/sources/MANIFEST.json'
import { findInstitutionText } from '../denylist'
import { termIndex, type PrimerParagraph } from '../primer'
import sources from '../sources.json'
import { densityData } from './data'
import { DENSITY_PRIMER, READ_FIRST } from './primer'

const local = import.meta.glob<string[]>('../denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

const manifest: { sources: { id: string; url: string; supports: { fields: string[] }[] }[] } = manifestFile
const section = (id: string) => DENSITY_PRIMER.find((s) => s.id === id)!
const paragraphs = DENSITY_PRIMER.flatMap((s) => s.paragraphs.map((paragraph, i): [string, PrimerParagraph] => [`${s.id}[${i}]`, paragraph]))
const cited = new Set(paragraphs.flatMap(([, paragraph]) => paragraph.sourceIds))
const source = (id: string) => sources.find((s) => s.id === id)
const shown = (id: string) => section(id).paragraphs.map((p) => p.text).join(' ')
const all = DENSITY_PRIMER.map((s) => shown(s.id)).join(' ')
const words = (text: string) => text.split(/\s+/).length
const p = densityData.parameters

describe('the density primer: its cards', () => {
  it('has the eight topics of spec 22.5, in order', () => {
    expect(DENSITY_PRIMER.map((s) => [s.id, s.heading])).toEqual([
      ['measurement', 'What a measurement is'],
      ['scale', 'Reading a scale between its marks'],
      ['level', "Reading a liquid's level"],
      ['figures', 'Significant figures'],
      ['rounding', 'Rounding what is worked out'],
      ['density', 'Density'],
      ['displacement', 'Volume by the water pushed aside'],
      ['safety', 'Safety'],
    ])
  })

  it('gives every card two to four paragraphs with text, and no two cards one heading', () => {
    expect(new Set(DENSITY_PRIMER.map((s) => s.heading)).size).toBe(DENSITY_PRIMER.length)
    for (const s of DENSITY_PRIMER) {
      expect(s.paragraphs.length, s.id).toBeGreaterThan(1)
      expect(s.paragraphs.length, s.id).toBeLessThanOrEqual(4)
      for (const paragraph of s.paragraphs) expect(paragraph.text.trim().length, s.id).toBeGreaterThan(40)
    }
  })

  it("is short, by the other primers' limits: no paragraph over 75 words, no card over 200, and under 1,200 in all", () => {
    for (const [where, paragraph] of paragraphs) expect(words(paragraph.text), where).toBeLessThanOrEqual(75)
    for (const s of DENSITY_PRIMER) expect(words(shown(s.id)), s.id).toBeLessThanOrEqual(200)
    expect(words(all)).toBeLessThan(1200)
  })

  it('opens by saying how many cards there are and naming the four to read before the bench, by their headings, and no other', () => {
    const first = DENSITY_PRIMER[0]!.paragraphs[0]!.text
    expect(first).toContain('eight cards')
    expect(first).toContain('Read four of them')
    expect(READ_FIRST).toEqual(['measurement', 'scale', 'level', 'figures'])
    for (const s of DENSITY_PRIMER) expect(first.includes(s.heading), s.id).toBe(READ_FIRST.includes(s.id))
  })

  it('explains in the cards read first, as they are read, each word the bench leans on', () => {
    const before = READ_FIRST.map(shown).join(' ')
    for (const word of ['estimate', 'marks', 'tenths', 'meniscus', 'bottom of the curve', 'eye level', 'significant figures', 'final zero']) expect(before.toLowerCase(), word).toContain(word)
  })

  it('holds no institution text, and names no maker or supplier', () => {
    for (const s of DENSITY_PRIMER) {
      expect(findInstitutionText(s.heading, institutionNames), s.id).toBeNull()
      for (const paragraph of s.paragraphs) {
        expect(findInstitutionText(paragraph.text, institutionNames), s.id).toBeNull()
        expect(paragraph.text, s.id).not.toMatch(/flinn|fisher|ward's|wikipedia|purdue/i)
      }
    }
  })
})

describe('the density primer: how its text is drawn', () => {
  it('heads every paragraph with a label of one to four words, its own within the card', () => {
    for (const s of DENSITY_PRIMER) {
      const labels = s.paragraphs.map((paragraph) => paragraph.label)
      for (const label of labels) {
        expect(label, s.id).toBeDefined()
        expect(label!.split(' ').length, label).toBeLessThanOrEqual(4)
      }
      expect(new Set(labels).size, s.id).toBe(labels.length)
    }
  })

  it('finds every term in the text of its paragraph, as a word of its own, and lists a term once in the whole primer', () => {
    const terms = paragraphs.flatMap(([where, paragraph]) => (paragraph.terms ?? []).map((term): [string, string, string] => [where, term, paragraph.text]))
    expect(terms.map(([, term]) => term)).toEqual(['measurement', 'estimate', 'meniscus', 'significant figures', 'density'])
    for (const [where, term, text] of terms) {
      expect(term, where).toMatch(/^[\p{L} -]+$/u)
      expect(termIndex(text, term), `${where}: ${term}`).toBeGreaterThanOrEqual(0)
    }
    expect(new Set(terms.map(([, term]) => term.toLowerCase())).size).toBe(terms.length)
  })

  it("sets off only whole sentences of the paragraph that name the lab themselves, each a rule of the simulation's and not of a bench", () => {
    const rules = paragraphs.flatMap(([where, paragraph]) => (paragraph.labRules ?? []).map((rule): [string, string, string] => [where, rule, paragraph.text]))
    expect(rules.length).toBe(5)
    for (const [where, rule, text] of rules) {
      expect(rule, where).toMatch(/^In this lab .*\.$/)
      const at = text.indexOf(rule)
      expect(at, where).toBeGreaterThanOrEqual(0)
      expect(at === 0 || text.slice(0, at).endsWith('. '), where).toBe(true)
      expect(text.slice(at + rule.length), where).toMatch(/^$|^ [A-Z]/)
    }
  })

  it('shows the one relation, density as mass over volume, under the paragraph that states it, and nowhere else', () => {
    expect(paragraphs.filter(([, paragraph]) => paragraph.equation !== undefined).map(([where, paragraph]) => [where, paragraph.equation])).toEqual([['density[0]', 'density = mass ÷ volume']])
  })
})

describe('the density primer: what each paragraph rests on', () => {
  it('cites only sources that exist, each once in a paragraph', () => {
    for (const [where, paragraph] of paragraphs) {
      expect(new Set(paragraph.sourceIds).size, where).toBe(paragraph.sourceIds.length)
      for (const id of paragraph.sourceIds) expect(source(id), `${where}: ${id}`).toBeDefined()
    }
  })

  it('writes every support line as "This lab:" or as a located passage of a source the paragraph cites, at that source\'s address', () => {
    for (const [where, paragraph] of paragraphs) {
      const lines = paragraph.support.split('\n')
      expect(lines.length, where).toBeGreaterThan(0)
      const located = lines.filter((line) => !line.startsWith('This lab: '))
      expect(located.length, where).toBeGreaterThanOrEqual(paragraph.sourceIds.length)
      for (const line of located) {
        const id = line.slice(0, line.indexOf(': '))
        expect(paragraph.sourceIds, `${where}: ${line}`).toContain(id)
        expect(line, where).toContain(`not quoted; see `)
        expect(line, where).toContain(source(id)!.url)
        expect(line, where).toContain('. It establishes that ')
      }
    }
  })

  it('quotes nothing: no support line holds a quotation mark', () => {
    for (const [where, paragraph] of paragraphs) expect(paragraph.support, where).not.toMatch(/["“”]/)
  })

  it('has exactly these paragraphs with no source, each resting on "This lab:" lines alone', () => {
    const unsourced = paragraphs.filter(([, paragraph]) => paragraph.sourceIds.length === 0)
    expect(unsourced.map(([where]) => where)).toEqual(['measurement[0]', 'rounding[3]', 'displacement[1]', 'safety[2]'])
    for (const [where, paragraph] of unsourced) for (const line of paragraph.support.split('\n')) expect(line, where).toMatch(/^This lab: /)
  })

  it("lists in the manifest, with a primer row, exactly the sources of its own that the primer cites; the rest are documents that a reagent's hazards cite", () => {
    const withPrimerRow = manifest.sources.filter((s) => s.supports.some((row) => row.fields.includes('primer'))).map((s) => s.id)
    const own = [...cited].filter((id) => manifest.sources.some((s) => s.id === id))
    expect([...withPrimerRow].sort()).toEqual([...own].sort())
    const others = [...cited].filter((id) => !own.includes(id))
    expect(others.sort()).toEqual(['fisher-sds-zinc-granular-mossy', 'flinn-sds-265', 'flinn-sds-326', 'flinn-sds-34', 'flinn-sds-859'])
    const underHazards = new Set(densityData.reagents.flatMap((r) => [r.hazards.sourceId, r.hazards.note.sourceId, r.hazards.note.alsoSourceId, ...(r.hazards.note.moreSourceIds ?? [])]))
    for (const id of others) {
      expect(underHazards.has(id), id).toBe(true)
      expect(hazardManifest.sources.some((s) => s.id === id), id).toBe(true)
    }
  })

  it('cites no page of OpenStax', () => {
    for (const id of cited) expect(`${id} ${source(id)!.url} ${source(id)!.citation}`.toLowerCase()).not.toContain('openstax')
  })
})

describe('the density primer: its worked examples', () => {
  const rounding = shown('rounding')

  it('works a difference to the decimal place of its least exact term: 61.4 g − 52.37 g is 9.0 g', () => {
    expect(rounding).toContain('61.4 g − 52.37 g is 9.03 on a calculator')
    expect(Number((61.4 - 52.37).toFixed(2))).toBe(9.03)
    // 61.4 stops at tenths, so the answer has one decimal place.
    expect((61.4 - 52.37).toFixed(1)).toBe('9.0')
    expect(rounding).toContain('so the answer is 9.0 g')
  })

  it('works a product and a quotient to the figures of the factor with the fewest: 75 cm² and 2.4 g/mL', () => {
    expect(rounding).toContain('31.2 cm × 2.4 cm is 74.88 on a calculator')
    expect(Number((31.2 * 2.4).toFixed(2))).toBe(74.88)
    expect((31.2 * 2.4).toPrecision(2)).toBe('75')
    expect(rounding).toContain('so the area is 75 cm²')
    expect(rounding).toContain('13.94 g ÷ 5.8 mL is 2.4034…')
    expect((13.94 / 5.8).toFixed(4)).toBe('2.4034')
    expect((13.94 / 5.8).toPrecision(2)).toBe('2.4')
    expect(rounding).toContain('the density is 2.4 g/mL')
  })

  it('counts the figures of its examples rightly', () => {
    const figures = shown('figures')
    for (const said of ['9.6 mL has two', '8.43 cm has three', '7.30 g has three', '4.07 has three', '7.0 has two', '0.050 has two']) expect(figures, said).toContain(said)
    expect(figures).toContain('as in 1200, may only be holding places: written so, it is taken to have two')
  })

  it("uses no run's numbers: no length, volume, mass or temperature of an example is one the bench can give, and no density of one is a row of a table", () => {
    const between = (value: number, [lo, hi]: readonly [number, number], scale: number) => value * scale >= lo && value * scale <= hi
    for (const cm of [8.4, 8.43, 7.3, 7.0, 31.2, 2.4]) {
      expect(between(cm, p.noteLengthRangeE2.value as [number, number], 100), `${cm} cm`).toBe(false)
      expect(between(cm, p.noteWidthRangeE2.value as [number, number], 100), `${cm} cm`).toBe(false)
    }
    for (const ml of [9.6, 5.8]) for (const range of [p.firstVolumeRangeTenthMl, p.liquidRangeTenthMl, p.waterRangeTenthMl, p.piecesRangeTenthMl]) expect(between(ml, range.value as [number, number], 10), `${ml} mL`).toBe(false)
    // The lightest thing a balance of this lab weighs is 15 g, and the lightest liquid poured 16 g.
    for (const g of [7.3, 13.94]) expect(g * 100).toBeLessThan(Math.min(p.firstMassRangeCg.value[0]!, 804 * 20))
    for (const off of [1.2, 0.9]) expect(between(off, p.thermometerOffRangeTenths.value as [number, number], 10), `${off} °C`).toBe(false)
    for (const row of [...densityData.liquids, ...densityData.metals]) expect(row.density.value.toPrecision(2)).not.toBe('2.4')
  })
})

describe('the density primer: what it has to say', () => {
  it('says what a measurement is, and why its last figure is an estimate', () => {
    const text = shown('measurement')
    expect(text).toMatch(/A measurement is a number with a unit, read from an instrument/)
    expect(text).toMatch(/every reading ends in a figure that is an estimate/)
    expect(text).toMatch(/within two of its last figure/)
    expect(p.readingAllowance.value).toBe(2)
  })

  it('says how a scale is read between its marks, what each of the four is read to as the record has it, and that the balance is copied', () => {
    const text = shown('scale')
    expect(text).toMatch(/in tenths of the gap: that is the last figure/)
    const decimals = Object.fromEntries(densityData.instruments.map((i) => [i.id, i.decimals]))
    expect(decimals).toEqual({ 'ruler-cm': 1, 'ruler-mm': 2, cylinder: 1, thermometer: 1, balance: 2 })
    expect(text).toContain('The ruler marked in centimetres is read to a tenth of a centimetre, and the one marked in millimetres to a hundredth.')
    expect(text).toContain('The cylinder is marked each millilitre and read to a tenth.')
    expect(text).toContain('The thermometer is marked each degree and read to a tenth.')
    expect(text).toMatch(/you copy every one, a final zero included/)
    expect(text).toMatch(/Ice and water stirred together stay at 0 °C/)
  })

  it('says where a level is read and that the eye is brought level, and of a level read from above or below only that it is wrong: not which way', () => {
    const text = shown('level')
    expect(text).toMatch(/The level is the bottom of the curve: read there/)
    expect(text).toMatch(/Bring your eye level with the bottom of the curve before you read/)
    expect(text).toMatch(/the reading is wrong/)
    expect(all).not.toMatch(/reads? (too )?(high|higher|low|lower) from (above|below)|from above[^.]*(higher|lower)|from below[^.]*(higher|lower)/)
  })

  it('gives both rounding rules as the notebook judges them', () => {
    const text = shown('rounding')
    expect(text).toContain('A sum or a difference stops at the decimal place of its least exact term.')
    expect(text).toContain('A product or a quotient gets as many significant figures as its factor with the fewest.')
    expect(text).toMatch(/under 5, leave the figure before it alone; 5 or more, raise it by one/)
  })

  it('says what density is, why it names a substance, and that a table gives it for a temperature and a strength', () => {
    const text = shown('density')
    expect(text).toMatch(/The density of a thing is its mass divided by its volume/)
    expect(text).toMatch(/does not depend on how much there is/)
    expect(text).toMatch(/the nearest figure there names the unknown/)
    expect(text).toMatch(/by mass or by volume/)
    expect(densityData.water.density.published).toBe('0.99821')
    expect(text).toContain('Water at 20 °C is very close to 1 g/mL.')
  })

  it('says how a volume is found by the water pushed aside, and names the two errors of technique', () => {
    const text = shown('displacement')
    expect(text).toMatch(/the rise is the volume of the pieces/)
    expect(text).toMatch(/Weigh the pieces while they are dry/)
    expect(text).toMatch(/dropped in, they splash water out, and the rise reads low/)
  })

  describe('the safety card', () => {
    const text = shown('safety')
    const reagent = (id: string) => densityData.reagents.find((r) => r.id === id)!

    it('says first that the lab is a simulation and does not take the place of safety training', () => {
      expect(section('safety').paragraphs[0]!.text).toMatch(/^This lab is a simulation: nothing here can hurt you, and it does not take the place of safety training\./)
    })

    it('says of the unknowns only what their tiles say: ethanol burns, the metals carry no statement, zinc is kept out of drains', () => {
      expect(reagent('ethanol-95').hazards.statements[0]).toBe('H225: Highly flammable liquid and vapor')
      expect(text).toMatch(/ethanol, which burns readily, so it is kept from flames and sparks/)
      for (const id of ['aluminium-pieces', 'zinc-pieces', 'copper-pieces']) expect(reagent(id).hazards.statements, id).toEqual([])
      expect(text).toMatch(/their tiles carry no hazard statement/)
      expect(reagent('zinc-pieces').hazards.note.value).toMatch(/kept out of drains and waterways/)
      expect(text).toMatch(/Zinc is kept out of drains/)
      expect(text).toMatch(/Until an unknown is named, treat it as every one of the things it may be/)
    })

    it("leaves disposal to the laboratory's own rules and local regulations, and gives no method of it", () => {
      expect(text).toMatch(/decided by the laboratory's own rules and by local regulations\. Ask the laboratory's supervisor\./)
      expect(all).not.toMatch(/down the (drain|sink)|in the (trash|bin)|flush (it|them)/i)
    })
  })
})
