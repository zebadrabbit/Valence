import { describe, expect, it } from 'vitest'
import hazardManifest from '../../../docs/research/mixing/sources/hazard-manifest.json'
import manifestFile from '../../../docs/research/mixing/sources/MANIFEST.json'
import { findInstitutionText } from '../denylist'
import { LIBRARY_INDEX } from '../libraryIndex'
import { termIndex, type PrimerParagraph } from '../primer'
import sources from '../sources.json'
import { mixingData } from './data'
import { MIXING_PRIMER, READ_FIRST } from './primer'

const local = import.meta.glob<string[]>('../denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

const manifest: { sources: { id: string; url: string; supports: { fields: string[] }[] }[] } = manifestFile
const section = (id: string) => MIXING_PRIMER.find((s) => s.id === id)!
const paragraphs = MIXING_PRIMER.flatMap((s) => s.paragraphs.map((paragraph, i): [string, PrimerParagraph] => [`${s.id}[${i}]`, paragraph]))
const cited = new Set(paragraphs.flatMap(([, paragraph]) => paragraph.sourceIds))
const source = (id: string) => sources.find((s) => s.id === id)
const shown = (id: string) => section(id).paragraphs.map((p) => p.text).join(' ')
const all = MIXING_PRIMER.map((s) => shown(s.id)).join(' ')
const words = (text: string) => text.split(/\s+/).length

describe('the mixing primer: its cards', () => {
  it('has the six topics of spec 25.4, in order', () => {
    expect(MIXING_PRIMER.map((s) => [s.id, s.heading])).toEqual([
      ['mixing', 'Mixing and not mixing'],
      ['polar', 'Two ends or none'],
      ['like-dissolves-like', 'Like dissolves like'],
      ['layers', 'Which layer is on top'],
      ['salt', 'Why salt comes apart in water'],
      ['safety', 'Safety'],
    ])
  })

  it('gives every card two to four paragraphs with text, and no two cards one heading', () => {
    expect(new Set(MIXING_PRIMER.map((s) => s.heading)).size).toBe(MIXING_PRIMER.length)
    for (const s of MIXING_PRIMER) {
      expect(s.paragraphs.length, s.id).toBeGreaterThanOrEqual(2)
      expect(s.paragraphs.length, s.id).toBeLessThanOrEqual(4)
      for (const p of s.paragraphs) expect(p.text.trim().length, s.id).toBeGreaterThan(40)
    }
  })

  it("is short: no paragraph over 75 words and no card over 200, the other primers' limits, and the whole of it under 700", () => {
    for (const [where, p] of paragraphs) expect(words(p.text), where).toBeLessThanOrEqual(75)
    for (const s of MIXING_PRIMER) expect(words(shown(s.id)), s.id).toBeLessThanOrEqual(200)
    expect(words(all)).toBeLessThan(700)
  })

  it('opens by saying how many cards there are and naming the four to read before the bench, by their headings, and no other', () => {
    const first = section('mixing').paragraphs[0]!.text
    expect(first).toContain('six cards')
    expect(first).toContain('Read four of them')
    expect(first).toContain('The other two')
    expect(READ_FIRST).toEqual(['mixing', 'polar', 'like-dissolves-like', 'safety'])
    expect(MIXING_PRIMER.filter((s) => first.includes(s.heading)).map((s) => s.id).sort()).toEqual([...READ_FIRST].sort())
  })

  it('explains in the cards read first, as they are read, each word the bench and the rule lean on', () => {
    const read = READ_FIRST.map(shown).join(' ')
    for (const word of ['miscible', 'immiscible', 'dissolves', 'soluble', 'insoluble', 'polar', 'nonpolar', 'like dissolves like', 'two layers', 'is tasted']) expect(read, word).toContain(word)
    // It is written for a reader who has not met the word polar: the word comes after what it names.
    const polar = shown('polar')
    expect(polar.indexOf('small negative charge')).toBeLessThan(polar.indexOf('polar'))
  })

  it('holds no institution text, and names no maker, supplier or site', () => {
    for (const s of MIXING_PRIMER) {
      expect(findInstitutionText(s.heading, institutionNames), s.id).toBeNull()
      for (const p of s.paragraphs) {
        expect(findInstitutionText(p.text, institutionNames), `${s.id}: ${p.label}`).toBeNull()
        expect(p.text).not.toMatch(/flinn|purdue|alaska|wikipedia|libretexts|ck-12|cameo|noaa/i)
      }
    }
  })
})

describe('the mixing primer: how its text is drawn', () => {
  it('heads every paragraph with a label of one to four words, its own within the card', () => {
    for (const s of MIXING_PRIMER) {
      const labels = s.paragraphs.map((p) => p.label)
      for (const label of labels) {
        expect(label, s.id).toBeDefined()
        expect(label!.split(' ').length, label).toBeLessThanOrEqual(4)
        expect(label).not.toBe(s.heading)
        expect(label).not.toMatch(/[.:\d]/)
      }
      expect(new Set(labels).size, s.id).toBe(labels.length)
    }
  })

  it('finds every term in the text of its paragraph, as a word of its own, and lists a term once in the whole primer', () => {
    const terms = paragraphs.flatMap(([where, p]) => (p.terms ?? []).map((term) => [where, term, p.text] as const))
    expect(terms.map(([, term]) => term)).toEqual(['miscible', 'immiscible', 'dissolves', 'soluble', 'insoluble', 'polar', 'nonpolar', 'density', 'ions'])
    for (const [where, term, text] of terms) {
      expect(term, where).toMatch(/^[\p{L} -]+$/u)
      expect(termIndex(text, term), `${where}: ${term}`).toBeGreaterThanOrEqual(0)
    }
    expect(new Set(terms.map(([, term]) => term.toLowerCase())).size).toBe(terms.length)
  })

  it("sets off only whole sentences of the paragraph that name the lab themselves, each a rule of the simulation's and not of a bench", () => {
    const rules = paragraphs.flatMap(([where, p]) => (p.labRules ?? []).map((rule) => [where, rule, p.text] as const))
    expect(rules.map(([where]) => where)).toEqual(['layers[2]'])
    for (const [where, rule, text] of rules) {
      expect(rule, where).toMatch(/^In this lab .*\.$/)
      const at = text.indexOf(rule)
      expect(at, where).toBeGreaterThanOrEqual(0)
      expect(at === 0 || text.slice(at - 2, at) === '. ', where).toBe(true)
      expect(text.slice(at + rule.length), where).toMatch(/^$|^ [A-Z]/)
    }
  })

  it('shows no relation under any paragraph', () => {
    expect(paragraphs.filter(([, p]) => p.equation !== undefined)).toEqual([])
  })
})

describe('the mixing primer: what each paragraph rests on', () => {
  it('cites only sources that exist, each once in a paragraph', () => {
    for (const [where, p] of paragraphs) {
      expect(new Set(p.sourceIds).size, where).toBe(p.sourceIds.length)
      for (const id of p.sourceIds) expect(source(id), `${where}: ${id}`).toBeDefined()
    }
  })

  it('writes every support line as "This lab:" or as a located passage of a source the paragraph cites, at that source\'s address', () => {
    for (const [where, p] of paragraphs) {
      const lines = p.support.split('\n')
      expect(lines.length, where).toBeGreaterThan(0)
      for (const line of lines) {
        if (line.startsWith('This lab: ')) continue
        const [, id, url] = /^([^:]+): not quoted; see .+, (https?:\/\/\S+)\. It establishes that .+\.$/.exec(line) ?? []
        expect(id, `${where}: ${line.slice(0, 60)}`).toBeDefined()
        expect(p.sourceIds, where).toContain(id)
        expect(url, where).toBe(source(id!)!.url)
      }
    }
  })

  it('quotes nothing: no support line holds a quotation mark', () => {
    for (const [where, p] of paragraphs) expect(p.support, where).not.toMatch(/["“”]/)
  })

  it('has exactly these paragraphs with no source, each resting on "This lab:" lines alone', () => {
    const unsourced = paragraphs.filter(([, p]) => p.sourceIds.length === 0)
    expect(unsourced.map(([where]) => where)).toEqual(['mixing[0]', 'layers[2]', 'safety[2]'])
    for (const [where, p] of unsourced) for (const line of p.support.split('\n')) expect(line, where).toMatch(/^This lab: /)
  })

  it("cites sources of the lab's manifest, each marked there for the primer, and for the safety card the two documents under the rubbing alcohol's hazards", () => {
    const withRow = manifest.sources.filter((s) => s.supports.some((row) => row.fields.includes('primer'))).map((s) => s.id)
    const own = [...cited].filter((id) => manifest.sources.some((s) => s.id === id))
    for (const id of withRow) expect(cited.has(id), id).toBe(true)
    for (const id of own) expect(withRow.includes(id), id).toBe(true)
    expect(own.sort()).toEqual(['ck12-dissolving-process', 'ck12-liquid-liquid-solutions', 'ck12-structure-of-water', 'flinn-sds-420.5', 'flinn-sds-789', 'noaa-cameo-12191', 'uaf-liquid-layers', 'wikipedia-isopropyl-alcohol', 'wikipedia-miscibility', 'wikipedia-solvent'])
    expect([...cited].filter((one) => !own.includes(one))).toEqual(['noaa-cameo-946'])
    const underHazards = new Set(mixingData.reagents.flatMap((r) => [r.hazards.sourceId, r.hazards.note.sourceId, r.hazards.note.alsoSourceId]))
    for (const id of section('safety').paragraphs[0]!.sourceIds) {
      expect(hazardManifest.sources.some((s) => s.id === id && s.supports.some((row) => row.field === 'primer.safety')), id).toBe(true)
      expect(underHazards.has(id), id).toBe(true)
    }
  })
})

describe('the mixing primer: what it says against the record', () => {
  const { liquids, pairs, solidInLiquid, parameters } = mixingData

  it('says of salt, sugar and oil in water what the record stores for those tubes', () => {
    expect(shown('like-dissolves-like')).toContain('Salt and sugar dissolve in a very polar liquid such as water.')
    expect(solidInLiquid.filter((t) => t.liquidId === 'water').map((t) => t.dissolves.value)).toEqual([true, true])
    expect(shown('layers')).toContain('Oil floats on water because it is the less dense of the two.')
    const water = liquids.find((l) => l.id === 'water')!.density.value
    for (const oil of ['vegetable-oil', 'mineral-oil']) {
      expect(pairs.find((p) => p.id === `water+${oil}`)!.mix.value, oil).toBe(false)
      expect(liquids.find((l) => l.id === oil)!.density.value, oil).toBeLessThan(water)
    }
  })

  it('gives no density as a number, and sorts no liquid of the bench but the two the families are named for', () => {
    expect(all).not.toMatch(/\d\.\d/)
    expect(all).not.toMatch(/like water|like oil/i)
    for (const liquid of ['Vinegar', 'vinegar', 'rubbing alcohol']) expect(all, liquid).not.toMatch(new RegExp(`${liquid} is (polar|nonpolar)`))
  })

  it('says of the layers what is the lab’s own, in a sentence that names the lab, and it is so: one amount is the greater', () => {
    expect(section('layers').paragraphs[2]!.labRules).toEqual([section('layers').paragraphs[2]!.text])
    expect(parameters.moreMicrolitres.value).toBeGreaterThan(parameters.lessMicrolitres.value)
    expect(liquids.filter((l) => l.looks.value === 'colourless')).toHaveLength(4)
  })

  it('names for the explorer only molecules the library holds, the ones the record links', () => {
    expect(shown('polar')).toContain('models of water, of the acetic acid in vinegar and of sugar')
    for (const id of ['water', 'acetic-acid', 'sucrose']) {
      expect(LIBRARY_INDEX.some((entry) => entry.id === id), id).toBe(true)
      expect([...mixingData.liquids, ...mixingData.solids].some((item) => item.moleculeId === id), id).toBe(true)
    }
  })

  it('gives no method of disposal', () => {
    expect(shown('safety')).toContain("decided by the laboratory's own rules and by local regulations: ask the laboratory's supervisor")
    expect(all).not.toMatch(/drain|sink|trash|bin\b/i)
  })
})
