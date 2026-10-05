import { describe, expect, it } from 'vitest'
import manifestFile from '../../../docs/research/phase-3/sources/MANIFEST.json'
import { findInstitutionText } from '../denylist'
import sources from '../sources.json'
import supportFile from '../support.ts?raw'
import { titrationData } from './data'
import { TITRATION_PRIMER, type PrimerParagraph } from './primer'

// Optional, untracked: see registry.test.ts.
const local = import.meta.glob<string[]>('../denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

const manifest: { sources: { id: string; supports: { field: string }[] }[] } = manifestFile

const section = (id: string) => TITRATION_PRIMER.find((s) => s.id === id)!
const paragraphs = TITRATION_PRIMER.flatMap((s) => s.paragraphs.map((paragraph, i): [string, PrimerParagraph] => [`${s.id}[${i}]`, paragraph]))
const cited = new Set(paragraphs.flatMap(([, paragraph]) => paragraph.sourceIds))
const source = (id: string) => sources.find((s) => s.id === id)
/** Everything a card shows, as one text. */
const shown = (id: string) => section(id).paragraphs.map((p) => [p.text, p.equation ?? ''].join(' ')).join(' ')

describe('the titration primer: its cards', () => {
  it('has the twelve cards, in order', () => {
    expect(TITRATION_PRIMER.map((s) => s.id)).toEqual([
      'acids-and-bases',
      'molarity',
      'titration',
      'standardizing',
      'endpoint',
      'phenolphthalein',
      'titrating',
      'calculation',
      'burette',
      'glassware',
      'precision',
      'safety',
    ])
  })

  it('gives every card a heading of its own and at least one paragraph with text', () => {
    expect(new Set(TITRATION_PRIMER.map((s) => s.heading)).size).toBe(12)
    for (const s of TITRATION_PRIMER) {
      expect([s.id, s.heading.length > 0, s.paragraphs.length > 0]).toEqual([s.id, true, true])
    }
    for (const [where, paragraph] of paragraphs) expect([where, paragraph.text.length > 0, paragraph.equation !== '']).toEqual([where, true, true])
  })

  it('opens by naming the three cards to read before the bench, by their headings, and no other', () => {
    const first = section('acids-and-bases').paragraphs[0]!.text
    const named = TITRATION_PRIMER.filter((s) => first.includes(s.heading)).map((s) => s.id)
    expect(named).toEqual(['titrating', 'calculation', 'burette'])
    expect(first).toMatch(/can wait/)
  })

  it('holds no institution text in any heading, paragraph or equation', () => {
    const prose = [
      ...TITRATION_PRIMER.map((s): [string, string] => [`${s.id} heading`, s.heading]),
      ...paragraphs.map(([where, p]): [string, string] => [where, p.text]),
      ...paragraphs.flatMap(([where, p]): [string, string][] => (p.equation === undefined ? [] : [[`${where} equation`, p.equation]])),
    ]
    expect(prose.length).toBeGreaterThan(12 + paragraphs.length)
    for (const [what, text] of prose) expect([what, findInstitutionText(text, institutionNames)]).toEqual([what, null])
  })
})

describe('the titration primer: what each paragraph rests on', () => {
  it('cites only sources that exist, each once in a paragraph', () => {
    for (const [where, paragraph] of paragraphs) {
      expect([where, new Set(paragraph.sourceIds).size]).toEqual([where, paragraph.sourceIds.length])
      expect([where, paragraph.sourceIds.filter((id) => source(id) === undefined)]).toEqual([where, []])
    }
  })

  it('writes every support line as "This lab:" or as a located passage of a source the paragraph cites, at that source\'s address', () => {
    for (const [where, paragraph] of paragraphs) {
      const lines = paragraph.support.split('\n')
      const located = lines.filter((line) => !line.startsWith('This lab: '))
      for (const line of located) {
        const [, id, url] = /^([a-z0-9.-]+): not quoted; see .+, (https:\/\/\S+)\. It establishes that .+\.$/.exec(line) ?? []
        expect([where, line, id !== undefined && paragraph.sourceIds.includes(id)]).toEqual([where, line, true])
        expect([where, id, url]).toEqual([where, id, source(id!)?.url])
      }
      // Every cited source has its passage, and a paragraph says nothing of a source it does not cite.
      expect([where, [...new Set(located.map((line) => line.split(': ')[0]))]]).toEqual([where, paragraph.sourceIds])
      for (const line of lines.filter((line) => line.startsWith('This lab: '))) expect([where, line]).toEqual([where, expect.stringMatching(/^This lab: .+\.$/)])
    }
  })

  it('quotes nothing: no support line holds a quotation mark', () => {
    for (const [where, paragraph] of paragraphs) expect([where, /["“”‘’«»]/.test(paragraph.support)]).toEqual([where, false])
  })

  it('has exactly these paragraphs with no source, each resting on "This lab:" lines alone', () => {
    const unsourced = paragraphs.filter(([, paragraph]) => paragraph.sourceIds.length === 0)
    expect(unsourced.map(([where]) => where)).toEqual([
      // Which cards to read first.
      'acids-and-bases[0]',
      // The worked example, and the rule to round and not cut off.
      'calculation[2]',
      'calculation[3]',
      // That the lab's technique errors are larger than a bench's.
      'glassware[3]',
      // The definition of relative deviation.
      'precision[1]',
      // That the simulation replaces no safety training.
      'safety[0]',
    ])
    for (const [where, paragraph] of unsourced) {
      expect([where, paragraph.support.split('\n').every((line) => line.startsWith('This lab: '))]).toEqual([where, true])
    }
    // The definition is chemistry, so its line says outright that nothing was read for it.
    expect(section('precision').paragraphs[1]!.support).toMatch(/No source for it was read\./)
  })

  it('says, where a sourced paragraph goes further than its sources, that no source was read for that part', () => {
    // Why the wait has a length, and that a solution which has stood is standardized again.
    expect(section('titrating').paragraphs[4]!.support).toMatch(/This lab: .*no source that says so was read/)
    expect(section('standardizing').paragraphs[1]!.support).toMatch(/This lab: .*no source was read/)
  })

  it('lists in the manifest, with a primer row, exactly the sources the primer cites', () => {
    const listed = manifest.sources.filter((s) => s.supports.some((row) => row.field === 'primer')).map((s) => s.id)
    expect([...listed].sort()).toEqual([...cited].sort())
  })

  it('says nothing about a licence in the citation of any OpenStax page it cites, and gives those pages ids of their own', () => {
    const openstax = [...cited].map((id) => source(id)!).filter((s) => /openstax/i.test(s.url))
    expect(openstax.length).toBe(7)
    for (const s of openstax) {
      expect([s.id, /CC BY|licen[sc]ed/i.test(s.citation)]).toEqual([s.id, false])
      // An id beginning "openstax-" is a source the periodic table quotes, with its licence in the citation (periodic.test.ts).
      expect([s.id, s.id.startsWith('openstax-')]).toEqual([s.id, false])
    }
  })

  it('takes the passage helper from a file that imports nothing and names no source', () => {
    expect(supportFile).not.toMatch(/\bimport\b|\brequire\b/)
    expect(supportFile).not.toMatch(/openstax|pubchem|CC BY|licen[sc]/i)
    expect(supportFile).toMatch(/export function located\(url: string, where: string, establishes: string\): string/)
  })
})

describe('the titration primer: what it has to say', () => {
  it('works its examples correctly', () => {
    expect((0.1 * 0.025).toFixed(6)).toBe('0.002500')
    expect(shown('molarity')).toContain('0.1000 × 0.02500 = 0.002500')
    expect((30.6 - 0.5).toFixed(2)).toBe('30.10')
    const molarity = (0.12 * 25) / 30.1
    expect(molarity.toFixed(6)).toBe('0.099668')
    // Rounded and cut off differ, so the example shows the difference.
    expect(molarity.toFixed(4)).toBe('0.0997')
    expect((Math.floor(molarity * 1e4) / 1e4).toFixed(4)).toBe('0.0996')
    const example = shown('calculation')
    for (const figure of ['0.1200', '0.50', '30.60', '30.10', '0.1200 × 25.00 ÷ 30.10 = 0.099668', '0.0997', '0.0996']) expect([figure, example.includes(figure)]).toEqual([figure, true])
  })

  it('tells the learner, in the calculation card, to keep every digit and to round to four decimal places, not cut off', () => {
    const card = shown('calculation')
    expect(card).toContain('0.0997')
    expect(card).toMatch(/[Kk]eep every digit/)
    expect(card).toMatch(/round/i)
    expect(card).toMatch(/four decimal places/)
    expect(card).toMatch(/cut/)
  })

  it('uses a bottle no run of this lab can have in its worked example', () => {
    const [low, high] = titrationData.parameters.hclRangeE4.value
    expect([low, high]).toEqual([850, 1050])
    expect(1200).toBeGreaterThan(high)
    expect(shown('calculation')).toMatch(/only an example/)
  })

  it('gives an estimate of the endpoint that is as good as the titrating card says', () => {
    // The estimate takes the NaOH as 0.1 M; the real one is anywhere in the seeded range, so the endpoint is off by this much at most.
    const [, label] = titrationData.parameters.hclRangeE4.value
    const worst = Math.max(...titrationData.parameters.naohRangeE5.value.map((naoh) => Math.abs((label / 1e4) * 25 * (1 / 0.1 - 1e5 / naoh))))
    expect(worst.toFixed(2)).toBe('1.38')
    expect(shown('titrating')).toMatch(/× 25\.00 ÷ 0\.1/)
    expect(shown('titrating')).toMatch(/a millilitre or so/)
    // The card's own example: 0.1200 M acid, about 30 mL.
    expect(((0.12 * 25) / 0.1).toFixed(0)).toBe('30')
  })

  it('teaches the titration itself in the titrating card', () => {
    const card = shown('titrating')
    for (const said of [/[Ss]wirl/, /5 mL/, /linger/, /one drop at a time/, /part of a drop/, /wall of the flask/, /distilled water/, /half-drop/, /30 seconds/, /carbon dioxide/, /closed/]) {
      expect([String(said), said.test(card)]).toEqual([String(said), true])
    }
  })

  it('carries the corrections to the other cards', () => {
    // The acid was itself standardized, and is not called a primary standard.
    expect(shown('standardizing')).toMatch(/standardiz(ed|ing) the acid/)
    expect(TITRATION_PRIMER.map((s) => shown(s.id)).join(' ')).not.toMatch(/primary standard/)
    // The solution goes on taking up carbon dioxide once made.
    expect(shown('standardizing')).toMatch(/after it is made/)
    expect(shown('standardizing')).toMatch(/kept closed/)
    expect(shown('standardizing')).toMatch(/standardized again/)
    expect(shown('glassware')).toMatch(/two or three small portions/)
    expect(shown('glassware')).toMatch(/[Rr]efill the burette before each trial/)
    expect(shown('burette')).toMatch(/eye level with/)
    expect(shown('burette')).toMatch(/reading view/)
  })

  it('says where a learner reads it what is not true to a bench: the size of each technique error, the bubble, and the burette that stays dilute', () => {
    // Spec 7.3 names the three and says the documentation tells the learner so.
    const card = shown('glassware')
    expect(card).toMatch(/more than it does at a real bench/)
    expect(card).toMatch(/holds less air than/)
    expect(card).toMatch(/in this lab it stays diluted until you condition it/)
    // A burette that was never conditioned gives results that agree only under this lab's rule, so it is not the
    // example of a mistake repeated; the example is one that repeats at a real bench too.
    expect(shown('precision')).not.toMatch(/conditioned/)
    expect(shown('precision')).toMatch(/copied wrongly from the acid bottle/)
  })

  it('describes the three bottles in the safety card from the sources the stored bottles cite', () => {
    const safety = section('safety')
    const ids = new Set(safety.paragraphs.flatMap((p) => p.sourceIds))
    for (const [key, bottle] of Object.entries(titrationData.bottles)) {
      expect([key, ids.has(bottle.hazards.sourceId), ids.has(bottle.hazards.note.sourceId)]).toEqual([key, true, true])
    }
    // The acid bottle's statements are those of hydrochloric acid, not of a pure substance (D4).
    expect(shown('safety')).not.toMatch(/pure hydrochloric|pure hydrogen chloride/)
    expect(shown('safety')).toMatch(/replaces/)
    // Which supplier's indicator is on the bench is assumed, so no sheet is called the sheet of this lab's bottle.
    expect(shown('safety')).not.toMatch(/The supplier's/)
    expect(shown('safety')).toMatch(/A supplier's safety data sheet for a solution of this kind/)
  })
})
