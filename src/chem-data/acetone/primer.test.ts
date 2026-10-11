import { describe, expect, it } from 'vitest'
import hazardManifest from '../../../docs/research/acetone/sources/hazard-manifest.json'
import manifestFile from '../../../docs/research/acetone/sources/MANIFEST.json'
import { CLOCK_PRIMER } from '../clock/primer'
import { findInstitutionText } from '../denylist'
import { termIndex, type PrimerParagraph } from '../primer'
import sources from '../sources.json'
import { acetoneData } from './data'
import { ACETONE_PRIMER, READ_FIRST } from './primer'

const local = import.meta.glob<string[]>('../denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

const manifest: { sources: { id: string; url: string; supports: { fields: string[] }[] }[] } = manifestFile
const section = (id: string) => ACETONE_PRIMER.find((s) => s.id === id)!
const paragraphs = ACETONE_PRIMER.flatMap((s) => s.paragraphs.map((paragraph, i): [string, PrimerParagraph] => [`${s.id}[${i}]`, paragraph]))
const cited = new Set(paragraphs.flatMap(([, paragraph]) => paragraph.sourceIds))
const source = (id: string) => sources.find((s) => s.id === id)
const shown = (id: string) => section(id).paragraphs.map((p) => p.text).join(' ')
const all = ACETONE_PRIMER.map((s) => shown(s.id)).join(' ')
const labelled = (id: string, label: string) => section(id).paragraphs.find((p) => p.label === label)!
const words = (text: string) => text.split(/\s+/).length
const three = (x: number) => Number(x.toPrecision(3))

describe('the iodination of acetone primer: its cards', () => {
  it("has the seven cards of spec 20.5, in order: spec 19.6's without the clock and without temperature, and two of its own", () => {
    expect(ACETONE_PRIMER.map((s) => [s.id, s.heading])).toEqual([
      ['rate', 'How fast'],
      ['rate-law', 'What a rate depends on'],
      ['colour', 'Watching a colour go'],
      ['order', 'Finding an order'],
      ['nought', 'An order of nought'],
      ['constant', 'The rate constant'],
      ['safety', 'Safety'],
    ])
  })

  it('gives every card two to four paragraphs with text, and no two cards one heading', () => {
    expect(new Set(ACETONE_PRIMER.map((s) => s.heading)).size).toBe(ACETONE_PRIMER.length)
    for (const s of ACETONE_PRIMER) {
      expect(s.paragraphs.length, s.id).toBeGreaterThanOrEqual(2)
      expect(s.paragraphs.length, s.id).toBeLessThanOrEqual(4)
      for (const p of s.paragraphs) expect(p.text.trim().length, s.id).toBeGreaterThan(40)
    }
  })

  it("is short, by the other primers' limits: no paragraph over 75 words, no card over 200, and under 1200 in all", () => {
    for (const [where, p] of paragraphs) expect(words(p.text), where).toBeLessThanOrEqual(75)
    for (const s of ACETONE_PRIMER) expect(words(shown(s.id)), s.id).toBeLessThanOrEqual(200)
    expect(words(all)).toBeLessThan(1200)
  })

  it('opens by saying how many cards there are and naming the four to read before the bench, by their headings, and no other', () => {
    const first = section('rate').paragraphs[0]!.text
    expect(first).toContain('seven cards')
    expect(first).toContain('Read four of them')
    expect(first).toContain('The other three')
    expect(READ_FIRST).toEqual(['rate', 'rate-law', 'colour', 'safety'])
    expect(ACETONE_PRIMER.filter((s) => first.includes(s.heading)).map((s) => s.id)).toEqual(READ_FIRST)
  })

  it('explains in the cards read first, as they are read, each word the bench leans on', () => {
    const read = READ_FIRST.map(shown).join(' ')
    for (const word of ['rate', 'concentration', 'mol/L', 'M.', 'mol/(L·s)', 'three significant figures', '1.23e-6', 'order', 'yellow', 'fades', 'flask of water', 'white paper', 'watch', '50 mL', 'acetone', 'iodoacetone']) expect(read, word).toContain(word)
  })

  it('holds no institution text in any heading or paragraph', () => {
    for (const s of ACETONE_PRIMER) {
      expect(findInstitutionText(s.heading, institutionNames), s.id).toBeNull()
      for (const p of s.paragraphs) {
        expect(findInstitutionText(p.text, institutionNames), `${s.id}: ${p.label}`).toBeNull()
        if (p.equation) expect(findInstitutionText(p.equation, institutionNames), `${s.id}: ${p.label}`).toBeNull()
      }
    }
  })

  it("is in its own words: no paragraph is one of the clock reaction primer's, since a learner may do either lab alone", () => {
    const theirs = new Set(CLOCK_PRIMER.flatMap((s) => s.paragraphs.map((p) => p.text)))
    for (const [where, p] of paragraphs) expect(theirs.has(p.text), where).toBe(false)
    // Nor does it send the reader to that lab.
    expect(all).not.toMatch(/clock|bromate|thiosulfate|starch/i)
  })
})

describe('the iodination of acetone primer: how its text is drawn', () => {
  it('heads every paragraph with a label of one to four words, its own within the card', () => {
    for (const s of ACETONE_PRIMER) {
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
    expect(terms.map(([, term]) => term)).toEqual(['rate', 'concentration', 'significant figures', 'rate law', 'order', 'slow step', 'rate constant'])
    for (const [where, term, text] of terms) {
      expect(term, where).toMatch(/^[\p{L} -]+$/u)
      expect(termIndex(text, term), `${where}: ${term}`).toBeGreaterThanOrEqual(0)
    }
    expect(new Set(terms.map(([, term]) => term.toLowerCase())).size).toBe(terms.length)
  })

  it("sets off only a whole sentence of a paragraph that names the lab itself, a rule of the simulation's and not of a bench: what the drawing shows", () => {
    const rules = paragraphs.flatMap(([where, p]) => (p.labRules ?? []).map((rule) => [where, rule, p.text] as const))
    expect(rules.map(([where]) => where)).toEqual(['colour[2]'])
    for (const [where, rule, text] of rules) {
      expect(rule, where).toMatch(/^In this lab .*\.$/)
      const at = text.indexOf(rule)
      expect(at, where).toBeGreaterThanOrEqual(0)
      expect(at === 0 || text.slice(at - 2, at) === '. ', where).toBe(true)
      expect(text.slice(at + rule.length), where).toMatch(/^$|^ [A-Z]/)
    }
    expect(rules[0]![1]).toContain('keeps a faint yellow until the last of the iodine is gone, and then shows none')
  })

  it('shows a relation under the two paragraphs that state one, and nowhere else', () => {
    expect(paragraphs.filter(([, p]) => p.equation !== undefined).map(([where, p]) => [where, p.equation])).toEqual([
      ['colour[3]', 'concentration in the mixture = concentration in the bottle × volume used ÷ whole volume'],
      ['constant[0]', 'k = rate ÷ ([A]ˣ × [B]ʸ × [C]ᶻ)'],
    ])
  })
})

describe('the iodination of acetone primer: what each paragraph rests on', () => {
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
    expect(unsourced.map(([where]) => where)).toEqual(['rate[0]', 'rate[2]', 'order[2]', 'constant[1]', 'constant[3]', 'safety[0]'])
    for (const [where, p] of unsourced) for (const line of p.support.split('\n')) expect(line, where).toMatch(/^This lab: /)
  })

  it('lists in the manifest, with a primer row, the sources of its own that the primer cites; the rest are documents of the hazard manifest, read for its safety card', () => {
    const withRow = manifest.sources.filter((s) => s.supports.some((row) => row.fields.includes('primer'))).map((s) => s.id)
    const own = [...cited].filter((id) => manifest.sources.some((s) => s.id === id))
    expect([...own].sort()).toEqual([...withRow].sort())
    expect(own.sort()).toEqual(['chemguide-finding-orders', 'chemguide-orders-and-mechanisms', 'chemguide-orders-of-reaction', 'chemguide-rates-concentration', 'moorpark-iodination-of-acetone', 'tau-kinetics-iodination'])
    // The others are documents of the hazard manifest: every one marked there as read for the safety card, which the card cites, and one more that is under the iodine's tile.
    const forSafety = hazardManifest.sources.filter((s) => s.supports.some((row) => row.field === 'primer.safety')).map((s) => s.id)
    const others = [...cited].filter((one) => !own.includes(one))
    expect(others.sort()).toEqual([...forSafety, 'flinn-sds-411'].sort())
    const iodine = acetoneData.reagents.find((r) => r.id === 'iodine-0.005m')!
    expect(iodine.hazards.note.sourceId).toBe('flinn-sds-411')
    const safety = new Set(section('safety').paragraphs.flatMap((p) => p.sourceIds))
    for (const id of forSafety) expect(safety.has(id), id).toBe(true)
    // No card but the last cites a document of the hazard manifest.
    for (const s of ACETONE_PRIMER) if (s.id !== 'safety') for (const p of s.paragraphs) for (const id of p.sourceIds) expect(own, `${s.id}: ${id}`).toContain(id)
  })

  it('cites no page of OpenStax and no page of a secondary encyclopedia, nor the table the rate constant is from', () => {
    for (const id of cited) expect(`${id} ${source(id)!.url} ${source(id)!.citation}`).not.toMatch(/openstax|flowers-chem2e|wikipedia/i)
    expect(cited.has('nbs-circular-510')).toBe(false)
  })
})

describe("the iodination of acetone primer: what it gives away, which is nothing", () => {
  it("gives none of this reaction's orders, nor its rate law, its rate constant or its activation energy: those are what the lab asks for", () => {
    expect(all).not.toMatch(/\[CH₃COCH₃\]|\[H⁺\]|\[I₂\]/)
    expect(all).not.toMatch(/(first|second|zero)[- ]order/i)
    for (const figure of [acetoneData.rateLaw.rateConstant.published!, acetoneData.rateLaw.activationEnergy.published!, '86.2', 'enol']) expect(all, figure).not.toContain(figure)
    // No sentence has both an order and something of this flask in it, but the two that say what is asked for and what is measured.
    const sentences = all.split(/(?<=[.:]) /)
    const naming = sentences.filter((sentence) => /\border\b|orders\b/i.test(sentence) && /iodine|acetone|acid\b|hydrogen ion/i.test(sentence))
    expect(naming).toEqual([])
  })

  it('says of an order of nought what it looks like and what it tells of any reaction, and names nothing in this flask', () => {
    const card = shown('nought')
    expect(card).not.toMatch(/iodine|acetone|acid|hydrogen|yellow|colour/i)
    expect(card).toContain('A reactant of order 0 does not change the rate')
    expect(card).toContain('twice as much of it takes twice as long to go')
    expect(card).toContain('The slowest of them sets the pace of the whole reaction')
    expect(card).toContain('In simple cases a reactant of order 0 takes no part in the slow step.')
    expect(card).toContain('The notes of part 2 say what the orders found in this lab tell.')
    // The note that does say it of iodine is the second of part 2, shown once that part is done.
    expect(acetoneData.parts[1].notes[1]!.value).toContain('iodine takes no part in it')
  })

  it('does not say that the colour fades at a steady pace: that is for the learner to see', () => {
    expect(shown('colour')).not.toMatch(/stead/i)
    expect(shown('colour')).toContain('the yellow fades')
  })
})

describe('the iodination of acetone primer: its worked examples', () => {
  it('writes a small number three ways, and a number to three significant figures, with no figure a run can have', () => {
    const text = labelled('rate', 'Small numbers').text
    expect(text).toContain('0.00000123 mol/(L·s). That is written 1.23 × 10⁻⁶, and typed 1.23e-6.')
    expect(0.00000123).toBe(1.23e-6)
    expect(text).toContain('0.50 is written 0.500.')
    // The slowest run a careful learner can have is the first or fourth mixture in the coolest room, stopped five seconds late: its rate is twice the example's.
    expect(0.001 / (392.5 + 5)).toBeGreaterThan(2 * 1.23e-6)
  })

  it('works the strength of a solution once it is mixed, with no bottle of the bench', () => {
    const text = labelled('colour', 'Rate of a run').text
    expect(text).toContain('25 mL of a 0.30 M solution in a 50 mL mixture is 0.30 × 25 ÷ 50 = 0.150 M')
    expect(three((0.3 * 25) / 50)).toBe(0.15)
    for (const r of acetoneData.reagents) expect(r.molarity, r.id).not.toBe(0.3)
    const whole = [...acetoneData.mixtures[0]!.flask, acetoneData.mixtures[0]!.added].reduce((sum, part) => sum + part.millilitres, 0)
    expect(whole).toBe(50)
  })

  it('finds an order from two runs', () => {
    expect(labelled('order', 'A worked example').text).toContain('7.90 × 10⁻⁵ ÷ 2.00 × 10⁻⁵ = 3.95 times for twice the concentration: order 2.')
    expect(three(7.9e-5 / 2.0e-5)).toBe(3.95)
    expect(labelled('order', 'Never exact').text).toContain('A ratio of 0.96 is about the same, 2.07 is about twice, and 3.9 is about four times.')
  })

  it('works a rate constant with its unit, by orders that are not this reaction\'s', () => {
    const text = labelled('constant', 'A worked example').text
    expect(text).toContain('k = 3.60 × 10⁻⁵ ÷ (0.300 × 0.0400²) = 0.0750 L²/(mol²·s).')
    expect(three(3.6e-5 / (0.3 * 0.04 ** 2))).toBe(0.075)
    expect(labelled('constant', 'Its unit').text).toContain('to 3, L²/(mol²·s)')
    expect(labelled('constant', 'Its unit').text).toContain('to 2, L/(mol·s)')
  })
})

describe('the iodination of acetone primer: its safety card', () => {
  const card = shown('safety')

  it("says what a real bench of this lab holds, with acetone first, and that each bottle's hazards are on its tile", () => {
    expect(card).toContain('A real bench of this lab holds acetone, which needs the most care, because it burns.')
    expect(card).toContain("Each bottle's tile gives its hazards.")
  })

  it('says of acetone what the documents read for it say: that it burns, in water too, that its vapour travels to a flame, and what it does to a person', () => {
    const p = labelled('safety', 'Acetone')
    expect(p.text).toContain('Acetone is highly flammable, and mixed with water it still burns.')
    expect(p.text).toContain('Its vapour is heavier than air and can travel to a flame some way off')
    expect(p.text).toContain('It irritates the eyes, and its vapour can bring drowsiness or dizziness.')
    expect(p.sourceIds).toEqual(['flinn-sds-7', 'flinn-sds-7.3', 'nj-rtk-fs-0006'])
    const statements = acetoneData.reagents.find((r) => r.id === 'acetone-4m')!.hazards.statements.join(' ')
    for (const phrase of ['Highly flammable liquid and vapor', 'Causes serious eye irritation', 'May cause drowsiness or dizziness']) expect(statements).toContain(phrase)
  })

  it('says of the product that no official document read says what it does, and gives its caution as the lab\'s own and no source\'s', () => {
    const p = labelled('safety', 'Iodine and the product')
    expect(p.text).toContain(`The reaction makes a little ${acetoneData.reaction.product.name}, and no official document that could be read says what that does to a person.`)
    expect(p.text).toContain("This lab's own caution, and no source's: a government record calls its bromine relative, bromoacetone, a violent tear gas")
    expect(p.text).toContain('the flask is not sniffed or left open')
    expect(p.sourceIds).toEqual(['flinn-sds-411', 'pubchem-compound-76396', 'noaa-cameo-2648'])
    expect(p.support).toContain("This lab: that the product is treated with the care its bromine relative calls for is this lab's own caution")
    // It says no more of the product than that.
    expect(card).not.toMatch(/iodoacetone (is|irritates|burns|causes)/i)
  })

  it('states no hazard of the mixture, which no document read speaks of', () => {
    expect(card).not.toMatch(/acetone (and|with) (the )?(iodine|acid)|react(s)? (violently|dangerously)|explo|peroxide/i)
  })

  it("says what to wear and what to do after a splash, gives no method of disposal, and sends the reader to the laboratory's supervisor", () => {
    expect(card).toContain('eye protection, gloves and protective clothing')
    expect(card).toContain('eyes are rinsed with water for 15 minutes or more')
    expect(card).toContain("Disposal is decided by the laboratory's own rules and by local regulations: ask the laboratory's supervisor.")
    expect(card).not.toMatch(/sink|neutrali[sz]e it|waste (container|bottle|jar)|pour it/i)
  })
})
