import { describe, expect, it } from 'vitest'
import hazardManifest from '../../../docs/research/reactions/sources/hazard-manifest.json'
import manifest from '../../../docs/research/reactions/sources/MANIFEST.json'
import { findInstitutionText } from '../denylist'
import { readFirstOf, termIndex } from '../primer'
import sources from '../sources.json'
import { reactionsData } from './data'
import { REACTIONS_PRIMER, READ_FIRST } from './primer'

const local = import.meta.glob<string[]>('../denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

const paragraphs = REACTIONS_PRIMER.flatMap((s) => s.paragraphs.map((paragraph, i) => [`${s.id}[${i}]`, paragraph] as const))
const shown = (id: string) => REACTIONS_PRIMER.find((s) => s.id === id)!.paragraphs.map((p) => p.text).join(' ')
const all = REACTIONS_PRIMER.map((s) => shown(s.id)).join(' ')
const words = (text: string) => text.split(/\s+/).length
const source = (id: string) => sources.find((s) => s.id === id)

describe('the reactions primer: its cards', () => {
  it('has the six topics of spec 24.4, in order', () => {
    expect(REACTIONS_PRIMER.map((s) => [s.id, s.heading])).toEqual([
      ['reaction', 'What a reaction is'],
      ['kinds', 'The four kinds'],
      ['equations', 'Equations and balancing'],
      ['series', 'Metals in order'],
      ['catalyst', 'A catalyst'],
      ['safety', 'Safety'],
    ])
  })

  it('gives every card two to four paragraphs with text', () => {
    for (const s of REACTIONS_PRIMER) {
      expect(s.paragraphs.length, s.id).toBeGreaterThan(1)
      expect(s.paragraphs.length, s.id).toBeLessThanOrEqual(4)
      for (const paragraph of s.paragraphs) expect(paragraph.text.trim().length, s.id).toBeGreaterThan(40)
    }
  })

  it("is short, by the other primers' limits and well inside them: no paragraph over 75 words, no card over 200, and under 800 in all", () => {
    for (const [where, paragraph] of paragraphs) expect(words(paragraph.text), where).toBeLessThanOrEqual(75)
    for (const s of REACTIONS_PRIMER) expect(words(shown(s.id)), s.id).toBeLessThanOrEqual(200)
    expect(words(all)).toBeLessThan(800)
  })

  it('opens by saying how many cards there are and naming the four to read before the bench, by their headings, and no other', () => {
    const first = REACTIONS_PRIMER[0]!.paragraphs[0]!.text
    expect(first).toMatch(/^This primer has six cards\. Read four of them before you go to the bench, in this order: What a reaction is; The four kinds; Equations and balancing; Safety\./)
    expect(READ_FIRST).toEqual(['reaction', 'kinds', 'equations', 'safety'])
    expect(readFirstOf(REACTIONS_PRIMER)).toEqual(READ_FIRST)
  })

  it('holds no institution text, and names no maker or supplier', () => {
    for (const [where, paragraph] of paragraphs) {
      expect(findInstitutionText(`${paragraph.text} ${paragraph.support}`, institutionNames), where).toBeNull()
      expect(paragraph.text, where).not.toMatch(/Flinn|Fisher|Ward|NOAA|Chemguide/i)
    }
  })
})

describe('the reactions primer: how its text is drawn', () => {
  it('heads every paragraph with a label of one to four words, its own within the card', () => {
    for (const s of REACTIONS_PRIMER) {
      const labels = s.paragraphs.map((paragraph) => paragraph.label)
      expect(new Set(labels).size, s.id).toBe(labels.length)
      for (const label of labels) {
        expect(label, s.id).toBeDefined()
        expect(label!.split(' ').length, label).toBeLessThanOrEqual(4)
      }
    }
  })

  it('finds every term in the text of its paragraph, as a word of its own, and lists a term once in the whole primer', () => {
    const terms = paragraphs.flatMap(([where, paragraph]) => (paragraph.terms ?? []).map((term) => [where, paragraph.text, term] as const))
    expect(terms.map(([, , term]) => term)).toEqual(['chemical reaction', 'combination', 'decomposition', 'single replacement', 'double replacement', 'equation', 'coefficient', 'balanced', 'activity series', 'catalyst'])
    for (const [where, text, term] of terms) {
      expect(term, where).toMatch(/^[\p{L} -]+$/u)
      expect(termIndex(text, term), `${where}: ${term}`).toBeGreaterThanOrEqual(0)
    }
  })

  it("sets off only whole sentences of the paragraph that name the lab themselves, each a rule of this lab's and not of a bench", () => {
    const rules = paragraphs.flatMap(([where, paragraph]) => (paragraph.labRules ?? []).map((rule) => [where, paragraph.text, rule] as const))
    expect(rules.map(([where]) => where)).toEqual(['catalyst[1]'])
    for (const [where, text, rule] of rules) {
      expect(text.indexOf(rule), where).toBeGreaterThanOrEqual(0)
      expect(rule, where).toMatch(/^In this lab .*\.$/)
    }
  })

  it('shows one equation, the worked example, under the paragraph that works it, and it balances', () => {
    expect(paragraphs.filter(([, paragraph]) => paragraph.equation !== undefined).map(([where, paragraph]) => [where, paragraph.equation])).toEqual([['equations[2]', '2H₂(g) + O₂(g) → 2H₂O(l)']])
    // 2 × H₂ and 1 × O₂ go in; 2 × H₂O come out: 4 hydrogen and 2 oxygen on each side, as the paragraph counts them.
    expect([2 * 2, 1 * 2]).toEqual([2 * 2, 2 * 1])
    expect(shown('equations')).toMatch(/4 hydrogen and 2 oxygen now come out\. Put 2 before the hydrogen: 4 hydrogen and 2 oxygen go in\./)
  })

  it('gives the four patterns in letters as the record stores them', () => {
    for (const kind of reactionsData.kinds) expect(shown('kinds'), kind.id).toContain(kind.pattern)
  })
})

describe('the reactions primer: what it keeps back', () => {
  it('says nothing of what the five stations show or which kind each is (spec 24.5): its examples are none of the bench\'s', () => {
    const notSafety = REACTIONS_PRIMER.filter((s) => s.id !== 'safety').map((s) => shown(s.id)).join(' ')
    // No thing of the bench is named outside the safety card, and the three metals are nowhere put in order.
    expect(notSafety).not.toMatch(/magnesium|zinc|copper|peroxide|iron|carbonate|hydrochloric|calcium chloride/i)
    // The safety card names what can hurt and no kind of reaction.
    expect(shown('safety')).not.toMatch(/combination|decomposition|replacement|catalyst/i)
    // No equation of the record is in the primer.
    expect(all).not.toMatch(/MgO|ZnSO₄|CaCO₃|H₂O₂|MgCl₂|ZnCl₂/)
  })
})

describe('the reactions primer: what each paragraph rests on', () => {
  it('cites only sources that exist, each once in a paragraph', () => {
    for (const [where, paragraph] of paragraphs) {
      expect(new Set(paragraph.sourceIds).size, where).toBe(paragraph.sourceIds.length)
      for (const id of paragraph.sourceIds) expect(source(id), `${where}: ${id}`).toBeDefined()
    }
  })

  it('says what every paragraph rests on: a located passage for each source, or what is the lab\'s own', () => {
    for (const [where, paragraph] of paragraphs) {
      const lines = paragraph.support.split('\n')
      expect(lines.length, where).toBeGreaterThan(0)
      for (const line of lines) expect(line, where).toMatch(/^This lab: \S|^[a-z0-9.-]+: not quoted; see .+, https:\/\/\S+\. It establishes that \S/)
      for (const id of paragraph.sourceIds) expect(lines.some((line) => line.startsWith(`${id}: `)), `${where}: ${id}`).toBe(true)
      if (paragraph.sourceIds.length === 0) expect(lines.every((line) => line.startsWith('This lab: ')), where).toBe(true)
    }
  })

  it("cites, for chemistry, sources the lab's manifest marks for the primer, and for safety the documents behind the bottles' hazards", () => {
    const forPrimer = new Set(manifest.sources.filter((s) => s.supports.some((row) => row.fields.includes('primer'))).map((s) => s.id))
    const sheets = new Set([...hazardManifest.sources.map((s) => s.id), ...reactionsData.reagents.flatMap((r) => [r.hazards.sourceId, r.hazards.note.sourceId])])
    for (const [where, paragraph] of paragraphs) {
      for (const id of paragraph.sourceIds) expect(forPrimer.has(id) || sheets.has(id), `${where}: ${id}`).toBe(true)
    }
    // Every source marked for the primer is cited by it.
    const cited = new Set(paragraphs.flatMap(([, paragraph]) => paragraph.sourceIds))
    expect([...forPrimer].filter((id) => !cited.has(id))).toEqual([])
  })
})
