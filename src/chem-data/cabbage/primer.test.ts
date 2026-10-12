import { describe, expect, it } from 'vitest'
import hazardManifest from '../../../docs/research/cabbage/sources/hazard-manifest.json'
import manifestFile from '../../../docs/research/cabbage/sources/MANIFEST.json'
import { findInstitutionText } from '../denylist'
import { termIndex, type PrimerParagraph } from '../primer'
import sources from '../sources.json'
import { cabbageData } from './data'
import { CABBAGE_PRIMER, READ_FIRST } from './primer'

const local = import.meta.glob<string[]>('../denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

const manifest: { sources: { id: string; url: string; supports: { fields: string[] }[] }[] } = manifestFile
const section = (id: string) => CABBAGE_PRIMER.find((s) => s.id === id)!
const paragraphs = CABBAGE_PRIMER.flatMap((s) => s.paragraphs.map((paragraph, i): [string, PrimerParagraph] => [`${s.id}[${i}]`, paragraph]))
const cited = new Set(paragraphs.flatMap(([, paragraph]) => paragraph.sourceIds))
const source = (id: string) => sources.find((s) => s.id === id)
const shown = (id: string) => section(id).paragraphs.map((p) => p.text).join(' ')
const all = CABBAGE_PRIMER.map((s) => shown(s.id)).join(' ')
const words = (text: string) => text.split(/\s+/).length

describe('the red cabbage primer: its cards', () => {
  it('has the seven topics of spec 21.5, in order', () => {
    expect(CABBAGE_PRIMER.map((s) => [s.id, s.heading])).toEqual([
      ['acids-and-bases', 'Acids and bases at home'],
      ['ph-scale', 'The pH scale'],
      ['indicators', 'Indicators'],
      ['buffers', 'Buffers and the scale'],
      ['meter', 'The meter and its probe'],
      ['bleach', 'When an indicator fails'],
      ['safety', 'Safety'],
    ])
  })

  it('gives every card two to four paragraphs with text, and no two cards one heading', () => {
    expect(new Set(CABBAGE_PRIMER.map((s) => s.heading)).size).toBe(CABBAGE_PRIMER.length)
    for (const s of CABBAGE_PRIMER) {
      expect(s.paragraphs.length, s.id).toBeGreaterThanOrEqual(2)
      expect(s.paragraphs.length, s.id).toBeLessThanOrEqual(4)
      for (const p of s.paragraphs) expect(p.text.trim().length, s.id).toBeGreaterThan(40)
    }
  })

  it("is short: no paragraph over 75 words and no card over 200, the other primers' limits, and the whole of it under 700", () => {
    for (const [where, p] of paragraphs) expect(words(p.text), where).toBeLessThanOrEqual(75)
    for (const s of CABBAGE_PRIMER) expect(words(shown(s.id)), s.id).toBeLessThanOrEqual(200)
    expect(words(all)).toBeLessThan(700)
  })

  it('opens by saying how many cards there are and naming the four to read before the bench, by their headings, and no other', () => {
    const first = section('acids-and-bases').paragraphs[0]!.text
    expect(first).toContain('seven cards')
    expect(first).toContain('Read four of them')
    expect(first).toContain('The other three')
    expect(READ_FIRST).toEqual(['acids-and-bases', 'ph-scale', 'indicators', 'safety'])
    expect(CABBAGE_PRIMER.filter((s) => first.includes(s.heading)).map((s) => s.id).sort()).toEqual([...READ_FIRST].sort())
  })

  it('explains in the cards read first, as they are read, each word the bench leans on', () => {
    const read = READ_FIRST.map(shown).join(' ')
    for (const word of ['hydrogen ion', 'hydroxide ion', 'acid', 'base', 'neutral', 'pH', 'ten times', 'indicator', 'within one unit', 'Nothing is tasted']) expect(read, word).toContain(word)
  })

  it('holds no institution text, and names no maker or supplier', () => {
    for (const s of CABBAGE_PRIMER) {
      expect(findInstitutionText(s.heading, institutionNames), s.id).toBeNull()
      for (const p of s.paragraphs) {
        expect(findInstitutionText(p.text, institutionNames), `${s.id}: ${p.label}`).toBeNull()
        expect(p.text).not.toMatch(/alconox|drano|flinn|fisher|vernier|labquest/i)
      }
    }
  })
})

describe('the red cabbage primer: how its text is drawn', () => {
  it('heads every paragraph with a label of one to four words, its own within the card', () => {
    for (const s of CABBAGE_PRIMER) {
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
    expect(terms.map(([, term]) => term)).toEqual(['acid', 'base', 'neutral', 'pH', 'indicator', 'buffer'])
    for (const [where, term, text] of terms) {
      expect(term, where).toMatch(/^[\p{L} -]+$/u)
      expect(termIndex(text, term), `${where}: ${term}`).toBeGreaterThanOrEqual(0)
    }
    expect(new Set(terms.map(([, term]) => term.toLowerCase())).size).toBe(terms.length)
  })

  it("sets off only whole sentences of the paragraph that name the lab themselves, each a rule of the simulation's and not of a bench", () => {
    const rules = paragraphs.flatMap(([where, p]) => (p.labRules ?? []).map((rule) => [where, rule, p.text] as const))
    expect(rules.map(([where]) => where)).toEqual(['indicators[2]', 'buffers[1]', 'meter[1]'])
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

describe('the red cabbage primer: what each paragraph rests on', () => {
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
    expect(unsourced.map(([where]) => where)).toEqual(['acids-and-bases[0]', 'indicators[2]'])
    for (const [where, p] of unsourced) for (const line of p.support.split('\n')) expect(line, where).toMatch(/^This lab: /)
  })

  it("cites sources of the lab's manifest, each marked there for the primer or cited by the record too, and for the safety card documents under the bottles' hazards", () => {
    const withRow = manifest.sources.filter((s) => s.supports.some((row) => row.fields.includes('primer'))).map((s) => s.id)
    const own = [...cited].filter((id) => manifest.sources.some((s) => s.id === id))
    for (const id of withRow) expect(cited.has(id), id).toBe(true)
    for (const id of own) expect(withRow.includes(id), id).toBe(true)
    expect(own.sort()).toEqual(['chemguide-buffers', 'fda-ph-foods-2007', 'flinn-pub-91633', 'libretexts-indicators-in-foods', 'libretexts-labquest-ph-sensor', 'libretexts-ph-scale'])
    const others = [...cited].filter((one) => !own.includes(one)).sort()
    expect(others).toEqual(['flinn-sds-395', 'flinn-sds-46', 'flinn-sds-58', 'flinn-sds-734', 'flinn-sds-736', 'noaa-cameo-4503'])
    const underHazards = new Set(cabbageData.reagents.flatMap((r) => [r.hazards.sourceId, r.hazards.note.sourceId, r.hazards.note.alsoSourceId, ...(r.hazards.note.moreSourceIds ?? [])]))
    for (const id of others) {
      expect(hazardManifest.sources.some((s) => s.id === id), id).toBe(true)
      expect(underHazards.has(id), id).toBe(true)
    }
  })
})

describe('the red cabbage primer: what it says against the record', () => {
  it("gives the two juices' ranges as the record stores them, and no other thing's pH", () => {
    const support = section('ph-scale').paragraphs[1]!.support
    const range = (id: string) => {
      const { ph } = cabbageData.things.find((t) => t.id === id)!
      return ph.basis === 'document' ? `${ph.low.published} to ${ph.high.published}` : ''
    }
    expect(support).toContain(`lemon juice lies from ${range('lemon-juice')}`)
    expect(support).toContain(`apple juice from ${range('apple-juice')}`)
    expect(all).not.toMatch(/\d\.\d/)
  })

  it('says of bleach what the record says: the colour goes, and the indicator cannot say', () => {
    expect(shown('bleach')).toContain(cabbageData.indicator.bleached.value)
    expect(shown('bleach')).toContain('the indicator cannot say')
    expect(cabbageData.things.find((t) => t.bleaches)!.id).toBe('bleach')
  })

  it("names the scale's ends as the record has them, and says a unit is ten times", () => {
    const [first, last] = [cabbageData.scale.buffers[0]!.ph, cabbageData.scale.buffers.at(-1)!.ph]
    expect(shown('ph-scale')).toContain(`from ${first} to ${last}`)
    expect(shown('buffers')).toContain(`from pH ${first} to pH ${last}`)
    expect(shown('ph-scale')).toContain('ten times the hydrogen ion')
  })

  it('says of the unrinsed probe and of the buffers what is the lab’s own, in a sentence that names the lab', () => {
    expect(shown('meter')).toContain('In this lab a probe that is not rinsed reads part of the way toward the last sample')
    expect(shown('buffers')).toContain('In this lab each buffer is taken to be exactly at the pH on its label.')
    expect(section('meter').paragraphs[1]!.support).toMatch(/This lab: what an unrinsed probe reads is this lab's model, with no source/)
  })

  it('gives no method of disposal', () => {
    expect(shown('safety')).toContain("decided by the laboratory's own rules and by local regulations: ask the laboratory's supervisor")
    expect(all).not.toMatch(/drain with|down the drain|sink/i)
  })
})
