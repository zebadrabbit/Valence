import { describe, expect, it } from 'vitest'
import hazardManifest from '../../../docs/research/hotcold/sources/hazard-manifest.json'
import manifestFile from '../../../docs/research/hotcold/sources/MANIFEST.json'
import { findInstitutionText } from '../denylist'
import { termIndex, type PrimerParagraph } from '../primer'
import sources from '../sources.json'
import { hotcoldData } from './data'
import { HOTCOLD_PRIMER, READ_FIRST } from './primer'

const local = import.meta.glob<string[]>('../denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

const manifest: { sources: { id: string; url: string; supports: { fields: string[] }[] }[] } = manifestFile
const section = (id: string) => HOTCOLD_PRIMER.find((s) => s.id === id)!
const paragraphs = HOTCOLD_PRIMER.flatMap((s) => s.paragraphs.map((paragraph, i): [string, PrimerParagraph] => [`${s.id}[${i}]`, paragraph]))
const cited = new Set(paragraphs.flatMap(([, paragraph]) => paragraph.sourceIds))
const source = (id: string) => sources.find((s) => s.id === id)
const shown = (id: string) => section(id).paragraphs.map((p) => p.text).join(' ')
const all = HOTCOLD_PRIMER.map((s) => shown(s.id)).join(' ')
const words = (text: string) => text.split(/\s+/).length

describe('the endothermic and exothermic primer: its cards', () => {
  it('has the six topics of spec 26.4, in order', () => {
    expect(HOTCOLD_PRIMER.map((s) => [s.id, s.heading])).toEqual([
      ['heat', 'Temperature and heat'],
      ['change', 'Giving heat out and taking heat in'],
      ['where', 'Where the heat goes'],
      ['graph', 'Reading the graph'],
      ['packs', 'Hot packs and cold packs'],
      ['safety', 'Safety'],
    ])
  })

  it('gives every card two to four paragraphs with text, and no two cards one heading', () => {
    expect(new Set(HOTCOLD_PRIMER.map((s) => s.heading)).size).toBe(HOTCOLD_PRIMER.length)
    for (const s of HOTCOLD_PRIMER) {
      expect(s.paragraphs.length, s.id).toBeGreaterThanOrEqual(2)
      expect(s.paragraphs.length, s.id).toBeLessThanOrEqual(4)
      for (const p of s.paragraphs) expect(p.text.trim().length, s.id).toBeGreaterThan(40)
    }
  })

  it('is short: no paragraph over 50 words, no card over 140, and the whole of it under 660', () => {
    for (const [where, p] of paragraphs) expect(words(p.text), where).toBeLessThanOrEqual(50)
    for (const s of HOTCOLD_PRIMER) expect(words(shown(s.id)), s.id).toBeLessThanOrEqual(140)
    expect(words(all)).toBeLessThan(660)
  })

  it('opens by saying how many cards there are and naming the four to read before the bench, by their headings, and no other', () => {
    const first = section('heat').paragraphs[0]!.text
    expect(first).toContain('six cards')
    expect(first).toContain('Read four of them')
    expect(first).toContain('The other two')
    expect(READ_FIRST).toEqual(['heat', 'change', 'graph', 'safety'])
    expect(HOTCOLD_PRIMER.filter((s) => first.includes(s.heading)).map((s) => s.id).sort()).toEqual([...READ_FIRST].sort())
  })

  it('gives in the cards read first each word the notebook asks for', () => {
    const read = READ_FIRST.map(shown).join(' ')
    for (const word of ['temperature', 'heat', 'exothermic', 'endothermic', 'gives heat out', 'takes heat in', 'starting temperature', 'highest or a lowest point', 'lid', 'stirrer']) expect(read, word).toContain(word)
  })

  it('holds no institution text, and names no maker, supplier or site', () => {
    for (const s of HOTCOLD_PRIMER) {
      expect(findInstitutionText(s.heading, institutionNames), s.id).toBeNull()
      for (const p of s.paragraphs) {
        expect(findInstitutionText(p.text, institutionNames), `${s.id}: ${p.label}`).toBeNull()
        expect(p.text).not.toMatch(/flinn|fisher|purdue|nasa|chemguide|wikipedia|cameo|noaa|nist/i)
      }
    }
  })
})

describe('the endothermic and exothermic primer: how its text is drawn', () => {
  it('heads every paragraph with a label of one to five words, its own within the card', () => {
    for (const s of HOTCOLD_PRIMER) {
      const labels = s.paragraphs.map((p) => p.label)
      for (const label of labels) {
        expect(label, s.id).toBeDefined()
        expect(label!.split(' ').length, label).toBeLessThanOrEqual(5)
        expect(label).not.toBe(s.heading)
        expect(label).not.toMatch(/[.:\d]/)
      }
      expect(new Set(labels).size, s.id).toBe(labels.length)
    }
  })

  it('finds every term in the text of its paragraph, as a word of its own, and lists a term once in the whole primer', () => {
    const terms = paragraphs.flatMap(([where, p]) => (p.terms ?? []).map((term) => [where, term, p.text] as const))
    expect(terms.map(([, term]) => term)).toEqual(['temperature', 'heat', 'exothermic', 'endothermic'])
    for (const [where, term, text] of terms) {
      expect(term, where).toMatch(/^[\p{L} -]+$/u)
      expect(termIndex(text, term), `${where}: ${term}`).toBeGreaterThanOrEqual(0)
    }
    expect(new Set(terms.map(([, term]) => term.toLowerCase())).size).toBe(terms.length)
  })

  it("sets off only whole sentences of the paragraph that name the lab themselves, each a rule of the simulation's and not of a bench", () => {
    const rules = paragraphs.flatMap(([where, p]) => (p.labRules ?? []).map((rule) => [where, rule, p.text] as const))
    expect(rules.map(([where]) => where)).toEqual(['graph[2]', 'graph[3]'])
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

describe('the endothermic and exothermic primer: what each paragraph rests on', () => {
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
    expect(unsourced.map(([where]) => where)).toEqual(['heat[0]', 'graph[2]', 'graph[3]', 'packs[2]', 'safety[3]'])
    for (const [where, p] of unsourced) for (const line of p.support.split('\n')) expect(line, where).toMatch(/^This lab: /)
  })

  it("cites sources of the lab's manifest, each marked there for the primer, and for the safety card the documents the hazard manifest marks for it, each under a salt's hazards", () => {
    const withRow = manifest.sources.filter((s) => s.supports.some((row) => row.fields.includes('primer'))).map((s) => s.id)
    const safety = new Set(section('safety').paragraphs.flatMap((p) => p.sourceIds))
    const own = [...cited].filter((id) => !safety.has(id))
    expect(own.sort()).toEqual([...withRow].sort())
    expect(own).toEqual(['chemguide-energetics-introduction', 'davidson-heat-of-solution', 'docbrown-calorimeter-methods', 'nasa-heat-transfer', 'purdue-calorimetry', 'purdue-heat', 'purdue-temperature', 'wikipedia-heating-pad', 'wikipedia-ice-pack'])
    const marked = hazardManifest.sources.filter((s) => s.supports.some((row) => row.field === 'primer.safety')).map((s) => s.id)
    expect([...safety].sort()).toEqual([...marked].sort())
    const underHazards = new Set(hotcoldData.reagents.flatMap((r) => [r.hazards.sourceId, r.hazards.note.sourceId, r.hazards.note.alsoSourceId, ...(r.hazards.note.moreSourceIds ?? [])]))
    for (const id of safety) expect(underHazards.has(id), id).toBe(true)
  })
})

describe('the endothermic and exothermic primer: what it says against the record', () => {
  it('says of neither salt of the bench which way its temperature goes: the two salts are named on the safety card alone, and there for their hazards', () => {
    for (const s of HOTCOLD_PRIMER.filter((one) => one.id !== 'safety')) expect(shown(s.id), s.id).not.toMatch(/epsom|calcium|magnesium|chloride|sulfate/i)
    const safety = shown('safety')
    for (const sentence of safety.split(/(?<=\.) /).filter((one) => /Epsom|Calcium|calcium/.test(one))) expect(sentence).not.toMatch(/heat|warm|cold|cool|hot|temperature|exothermic|endothermic/i)
    // The one sentence of that card that speaks of heat names no salt.
    expect(safety).toContain('A salt that gives heat out as it dissolves can make hot water boil up.')
    expect(all).not.toMatch(/kJ|joule/i)
  })

  it('says of the two hazards what the record stores', () => {
    const [epsom, calcium] = hotcoldData.reagents
    expect(shown('safety')).toContain('Calcium chloride is harmful if swallowed and seriously irritates the eyes.')
    expect(calcium.hazards.statements).toEqual(['H302: Harmful if swallowed', 'H319: Causes serious eye irritation'])
    expect(shown('safety')).toContain('Epsom salt is classed as no hazard')
    expect(epsom.hazards.statements).toEqual([])
    expect([epsom.appearance.value, calcium.appearance.value]).toEqual(['a white solid', 'a white solid'])
  })

  it("gives the logger's step as the record has it", () => {
    expect(shown('graph')).toContain(`every ${hotcoldData.parameters.loggerStepSeconds.value} seconds`)
  })

  it('gives no method of disposal', () => {
    expect(shown('safety')).toContain("decided by the laboratory's own rules and by local regulations: ask the laboratory's supervisor")
    expect(all).not.toMatch(/drain|sink|trash|bin\b/i)
  })
})
