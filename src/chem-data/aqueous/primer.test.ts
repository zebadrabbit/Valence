import { describe, expect, it } from 'vitest'
import hazardManifest from '../../../docs/research/phase-4/sources/hazard-manifest.json'
import manifestFile from '../../../docs/research/phase-4/sources/MANIFEST.json'
import { findInstitutionText } from '../denylist'
import { termIndex, type PrimerParagraph } from '../primer'
import sources from '../sources.json'
import { aqueousData } from './data'
import { TITRATION_PRIMER } from '../titration/primer'
import { AQUEOUS_PRIMER, READ_FIRST } from './primer'

const local = import.meta.glob<string[]>('../denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

const manifest: { sources: { id: string; supports: { fields: string[] }[] }[] } = manifestFile
const section = (id: string) => AQUEOUS_PRIMER.find((s) => s.id === id)!
const paragraphs = AQUEOUS_PRIMER.flatMap((s) => s.paragraphs.map((paragraph, i): [string, PrimerParagraph] => [`${s.id}[${i}]`, paragraph]))
const cited = new Set(paragraphs.flatMap(([, paragraph]) => paragraph.sourceIds))
const source = (id: string) => sources.find((s) => s.id === id)
const shown = (id: string) => section(id).paragraphs.map((p) => [p.text, p.equation ?? ''].join(' ')).join(' ')
const sheets = hazardManifest.sources

describe('the aqueous primer: its cards', () => {
  // Ten until 2026-10-07: the card of worked steps was added after the owner, at a station's three equations, did not
  // know how to get from two bottles to them. It stands straight after the card on the three forms.
  it('has the eleven cards, in order', () => {
    expect(AQUEOUS_PRIMER.map((s) => [s.id, s.heading])).toEqual([
      ['ions', 'Ions in solution'],
      ['solubility', 'Solubility and the solubility table'],
      ['precipitates', 'Precipitates'],
      ['equations', 'The three forms of an equation'],
      ['working', 'Working a station, step by step'],
      ['spectators', 'Spectator ions'],
      ['signs', 'Gases and heat as signs of a reaction'],
      ['no-reaction', 'When nothing happens'],
      ['limiting', 'The limiting reagent'],
      ['observing', 'Observing safely'],
      ['safety', 'Safety'],
    ])
  })

  it('gives every card at least one paragraph with text, and no two cards one heading', () => {
    expect(new Set(AQUEOUS_PRIMER.map((s) => s.heading)).size).toBe(AQUEOUS_PRIMER.length)
    for (const s of AQUEOUS_PRIMER) {
      expect(s.paragraphs.length, s.id).toBeGreaterThan(0)
      for (const p of s.paragraphs) expect(p.text.trim().length, s.id).toBeGreaterThan(40)
    }
  })

  // It said ten cards and named four to read first; the card of worked steps is the fifth, read after the card it works out.
  it('opens by saying how many cards there are and naming the five to read before the bench, by their headings, and no other', () => {
    const first = section('ions').paragraphs[0]!.text
    expect(first).toContain('eleven cards')
    expect(first).toContain('Read five of them')
    expect(first).toContain('The other six')
    expect(AQUEOUS_PRIMER.filter((s) => first.includes(s.heading)).map((s) => s.id)).toEqual(['ions', 'solubility', 'equations', 'working', 'observing'])
    expect(READ_FIRST).toEqual(['ions', 'solubility', 'equations', 'working', 'observing'])
    expect(AQUEOUS_PRIMER.length - READ_FIRST.length).toBe(6)
  })

  it('explains in the cards read first, as they are read, each word the equations and the tools lean on', () => {
    const read = READ_FIRST.map(shown)
    const upTo = (n: number) => read.slice(0, n + 1).join(' ')
    // The tools' words were held to the fourth card read first; the card on observing is now the fifth. The words of the
    // first card that are new here are the ones it did not say before 2026-10-07: what an acid and a base are, and that an
    // ion can be a group of atoms.
    for (const [word, card] of [['ion', 0], ['polyatomic ion', 0], ['(aq)', 0], ['strong electrolyte', 0], ['H⁺', 0], ['An acid gives', 0], ['A base gives', 0], ['insoluble', 1], ['spectator', 2], ['coefficient', 2], ['subscript', 3], ['wafting', 4], ['litmus', 4], ['splint', 4]] as const) {
      expect(upTo(card), word).toContain(word)
    }
    // "acid" and "base" are said to be what they are in the card where the cards read first first use either word, and "basic" with them.
    const all = read.join(' ')
    expect(all.search(/\bacid\b/)).toBe(all.indexOf('Hydrochloric acid is hydrogen chloride') + 'Hydrochloric '.length)
    expect(all.indexOf('An acid gives')).toBeLessThan(all.indexOf(shown('solubility')))
    expect(all.search(/\bbase\b/)).toBe(all.indexOf('A base gives') + 'A '.length)
    expect(all.search(/\bbasic\b/)).toBe(all.indexOf('is called basic') + 'is called '.length)
    // The equations card uses "precipitate", which the card before it in the primer defines but which is not read first:
    // it says what one is where the word first stands in the cards read first, and not only in passing further down.
    expect(all.indexOf('precipitate')).toBe(all.indexOf('is called a precipitate') + 'is called a '.length)
    expect(shown('equations')).toMatch(/a bright yellow solid, lead\(II\) iodide\. A solid that forms like this, out of two solutions, is called a precipitate\./)
    expect(shown('equations')).toMatch(/precipitate stays whole, because its ions are locked together in the solid/)
  })

  it('holds no institution text in any heading, paragraph or equation', () => {
    for (const s of AQUEOUS_PRIMER) {
      expect(findInstitutionText(s.heading, institutionNames), s.id).toBeNull()
      for (const p of s.paragraphs) for (const text of [p.text, p.label ?? '', p.equation ?? '', p.support]) expect(findInstitutionText(text, institutionNames), `${s.id}: ${text.slice(0, 40)}`).toBeNull()
    }
  })
})

describe('the aqueous primer: how its text is drawn', () => {
  it('heads every paragraph of a card that has more than one with a label of one to four words, its own within the card', () => {
    for (const s of AQUEOUS_PRIMER) {
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
    expect(terms.length).toBeGreaterThan(15)
    for (const [where, term, text] of terms) {
      expect(term, where).toMatch(/^[\p{L} -]+$/u)
      expect(termIndex(text, term), `${where}: ${term}`).toBeGreaterThanOrEqual(0)
    }
    expect(new Set(terms.map(([, term]) => term.toLowerCase())).size).toBe(terms.length)
  })

  it("sets off only whole sentences of the paragraph that name the lab themselves, each a rule of the simulation's and not of a bench", () => {
    const rules = paragraphs.flatMap(([where, p]) => (p.labRules ?? []).map((rule) => [where, rule, p.text] as const))
    // 'working[4]' is new with the card of worked steps: that a station offers its formulas is the simulation's doing.
    expect(rules.map(([where]) => where)).toEqual(['equations[4]', 'equations[5]', 'working[4]', 'signs[5]', 'no-reaction[1]', 'observing[1]', 'observing[3]'])
    for (const [where, rule, text] of rules) {
      expect(rule, where).toMatch(/^(In this lab|The temperature rise this lab) .*\.$/)
      // A whole sentence: it starts the text or follows a full stop, and ends the text or is followed by a space and a capital.
      const at = text.indexOf(rule)
      expect(at, where).toBeGreaterThanOrEqual(0)
      expect(at === 0 || text.slice(at - 2, at) === '. ', where).toBe(true)
      expect(text.slice(at + rule.length), where).toMatch(/^$|^ [A-Z]/)
    }
  })
})

describe('the aqueous primer: what each paragraph rests on', () => {
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
    // 'working[9]' is new: the last paragraph of the card of worked steps says where things are on the page, which no source says.
    expect(unsourced.map(([where]) => where)).toEqual(['ions[0]', 'working[9]', 'spectators[1]', 'signs[0]', 'no-reaction[1]', 'observing[0]', 'safety[0]'])
    for (const [where, p] of unsourced) for (const line of p.support.split('\n')) expect(line, where).toMatch(/^This lab: /)
  })

  // Until 2026-10-07 the rest were the eighteen sheets alone. The one more is the titration lab's source for what an acid
  // and a base are, which this primer now says from the same passage.
  it('lists in the manifest, with a primer row, exactly the sources of its own that the primer cites; the rest are safety data sheets that a reagent\'s hazards cite, and the one source of the titration primer that says what an acid and a base are', () => {
    const withRow = manifest.sources.filter((s) => s.supports.some((row) => row.fields.includes('primer'))).map((s) => s.id)
    const own = [...cited].filter((id) => manifest.sources.some((s) => s.id === id))
    expect([...own].sort()).toEqual([...withRow].sort())
    const ofReagents = new Set(aqueousData.reagents.flatMap((r) => [r.hazards.sourceId, r.hazards.note.sourceId, ...(r.hazards.note.alsoSourceId ? [r.hazards.note.alsoSourceId] : [])]))
    const borrowed = 'flowers-chem2e-4.2'
    expect(TITRATION_PRIMER[0]!.paragraphs[1]!.sourceIds).toEqual([borrowed])
    const rest = [...cited].filter((id) => !own.includes(id) && id !== borrowed)
    expect(cited.has(borrowed)).toBe(true)
    expect(rest.length).toBe(18)
    for (const id of rest) {
      expect(sheets.some((s) => s.id === id), id).toBe(true)
      expect(ofReagents.has(id), id).toBe(true)
    }
  })
})

describe('the aqueous primer: what it has to say', () => {
  /** The atoms and the charge of one side of an equation as the primer writes it. */
  function side(text: string) {
    const atoms: Record<string, number> = {}
    let charge = 0
    for (const term of text.split(' + ')) {
      const [, n, formula] = /^(\d*)(.+)\((?:aq|s|l|g)\)$/.exec(term.trim())!
      const times = Number(n || 1)
      const [, body, amount, sign] = /^(.*?)([⁰¹²³⁴⁵⁶⁷⁸⁹]*)([⁺⁻]?)$/.exec(formula!)!
      const digits = (d: string, from: string) => (d === '' ? 1 : Number([...d].map((c) => from.indexOf(c)).join('')))
      if (sign) charge += times * (sign === '⁺' ? 1 : -1) * digits(amount!, '⁰¹²³⁴⁵⁶⁷⁸⁹')
      const count = (part: string, k: number) => {
        for (const [, element, sub] of part.matchAll(/([A-Z][a-z]?)([₀-₉]*)/g)) atoms[element!] = (atoms[element!] ?? 0) + times * k * digits(sub!, '₀₁₂₃₄₅₆₇₈₉')
      }
      count(body!.replace(/\(([^()]*)\)([₀-₉]*)/g, (_, inner: string, sub: string) => (count(inner, digits(sub, '₀₁₂₃₄₅₆₇₈₉')), '')), 1)
    }
    return { atoms, charge }
  }

  const equationsOf = (id: string) => section(id).paragraphs.flatMap((p) => (p.equation ? [p.equation] : []))
  /** The terms that stand on both sides of a complete ionic equation, and the equation that is left without them. */
  function withoutSpectators(complete: string) {
    const [left, right] = complete.split(' → ').map((s) => s.split(' + '))
    const spectators = left!.filter((term) => right!.includes(term))
    return { spectators, net: `${left!.filter((t) => !spectators.includes(t)).join(' + ')} → ${right!.filter((t) => !spectators.includes(t)).join(' + ')}` }
  }

  it('shows an equation on two cards only, the card on the three forms and the card that works one out, three on each', () => {
    expect(AQUEOUS_PRIMER.filter((s) => equationsOf(s.id).length > 0).map((s) => [s.id, equationsOf(s.id).length])).toEqual([['equations', 3], ['working', 3]])
  })

  it('works its example in three equations that each balance in atoms and in charge, the net one being the complete one less its spectators', () => {
    const equations = equationsOf('equations')
    expect(equations).toEqual([
      'Pb(NO₃)₂(aq) + 2KI(aq) → PbI₂(s) + 2KNO₃(aq)',
      'Pb²⁺(aq) + 2NO₃⁻(aq) + 2K⁺(aq) + 2I⁻(aq) → PbI₂(s) + 2K⁺(aq) + 2NO₃⁻(aq)',
      'Pb²⁺(aq) + 2I⁻(aq) → PbI₂(s)',
    ])
    for (const equation of equations) {
      const [left, right] = equation.split(' → ')
      expect(side(left!), equation).toEqual(side(right!))
    }
    expect(side('Pb²⁺(aq) + 2NO₃⁻(aq)')).toEqual({ atoms: { Pb: 1, N: 2, O: 6 }, charge: 0 })
    expect(withoutSpectators(equations[1]!)).toEqual({ spectators: ['2NO₃⁻(aq)', '2K⁺(aq)'], net: equations[2] })
    expect(shown('spectators')).toContain('K⁺ and NO₃⁻ are the spectators')
  })

  describe('the card that works one reaction out, step by step', () => {
    const card = section('working')
    const step = (n: number) => card.paragraphs[n]!
    const equations = equationsOf('working')
    const SKELETON = 'CaCl₂ + K₃PO₄ → Ca₃(PO₄)₂ + KCl'
    /** The atoms on the two sides of an equation written without state symbols, as the card writes the one that is not yet balanced. */
    const counts = (equation: string) => equation.split(' → ').map((s) => side(s.split(' + ').map((term) => `${term}(aq)`).join(' + ')).atoms)
    /** "calcium 1 and 3, phosphate 1 and 2, potassium 3 and 1, chlorine 2 and 1": what the card says it counts, left and right. A phosphate group is counted by its one phosphorus atom. */
    const said = ([left, right]: Record<string, number>[]) => [['calcium', 'Ca'], ['phosphate', 'P'], ['potassium', 'K'], ['chlorine', 'Cl']].map(([name, element]) => `${name} ${left![element!]} and ${right![element!]}`).join(', ')

    it('is ten paragraphs: the example, eight numbered steps each with a label of its own, and where things are', () => {
      expect(card.paragraphs.map((p) => p.label)).toEqual([
        'The example',
        'Step one, the ions',
        'Step two, swap partners',
        'Step three, the table',
        'Step four, product formulas',
        'Step five, molecular equation',
        'Step six, complete ionic',
        'Step seven, net ionic',
        'Step eight, state symbols',
        'Where things are',
      ])
      expect(shown('working')).toContain('Follow the same eight steps at a station')
    })

    it('shows three equations, each balanced in atoms and in charge: the molecular, the complete ionic, and the net ionic that is the complete one less its spectators', () => {
      expect([step(5).equation, step(6).equation, step(7).equation]).toEqual(equations)
      expect(equations).toEqual([
        '3CaCl₂(aq) + 2K₃PO₄(aq) → Ca₃(PO₄)₂(s) + 6KCl(aq)',
        '3Ca²⁺(aq) + 6Cl⁻(aq) + 6K⁺(aq) + 2PO₄³⁻(aq) → Ca₃(PO₄)₂(s) + 6K⁺(aq) + 6Cl⁻(aq)',
        '3Ca²⁺(aq) + 2PO₄³⁻(aq) → Ca₃(PO₄)₂(s)',
      ])
      for (const equation of equations) {
        const [left, right] = equation.split(' → ')
        expect(side(left!), equation).toEqual(side(right!))
      }
      // The same atoms in the three: the molecular and the complete ionic hold all of them, the net ionic the solid's.
      expect(side(equations[0]!.split(' → ')[0]!)).toEqual({ atoms: { Ca: 3, Cl: 6, K: 6, P: 2, O: 8 }, charge: 0 })
      expect(side(equations[1]!.split(' → ')[0]!)).toEqual({ atoms: { Ca: 3, Cl: 6, K: 6, P: 2, O: 8 }, charge: 0 })
      expect(side(equations[2]!.split(' → ')[0]!)).toEqual({ atoms: { Ca: 3, P: 2, O: 8 }, charge: 0 })
      expect(withoutSpectators(equations[1]!)).toEqual({ spectators: ['6Cl⁻(aq)', '6K⁺(aq)'], net: equations[2] })
      expect(step(7).text).toContain('6K⁺ and 6Cl⁻ are on the left and on the right')
    })

    it('says of each ion the charge its formula in the equations carries, and of each product a formula whose charges cancel', () => {
      const ion = (formula: string) => side(`${formula}(aq)`)
      expect([ion('Ca²⁺').charge, ion('Cl⁻').charge, ion('K⁺').charge, ion('PO₄³⁻').charge]).toEqual([2, -1, 1, -3])
      expect(ion('PO₄³⁻').atoms).toEqual({ P: 1, O: 4 }) // the five atoms of the group
      expect(step(1).text).toMatch(/one calcium ion, Ca²⁺, for every two chloride ions, Cl⁻/)
      expect(step(1).text).toMatch(/three potassium ions, K⁺, for every one phosphate ion, PO₄³⁻/)
      expect(step(1).text).toMatch(/a group of five atoms, one of phosphorus and four of oxygen.*one charge, 3−, for the whole group/)
      // Step one's two bottles and step four's two products are each their ions in the ratio said, with no charge over.
      expect(ion('CaCl₂')).toEqual(side('Ca²⁺(aq) + 2Cl⁻(aq)'))
      expect(ion('K₃PO₄')).toEqual(side('3K⁺(aq) + PO₄³⁻(aq)'))
      expect(ion('Ca₃(PO₄)₂')).toEqual(side('3Ca²⁺(aq) + 2PO₄³⁻(aq)'))
      expect(ion('KCl')).toEqual(side('K⁺(aq) + Cl⁻(aq)'))
      expect(step(4).text).toMatch(/Three calcium ions make 6\+ and two phosphate ions make 6−, so the solid is Ca₃\(PO₄\)₂/)
      expect(step(4).text).toMatch(/in brackets.*with the number after the bracket/)
      expect(step(7).text).toMatch(/3 × 2\+ is 6\+ and 2 × 3− is 6−/)
    })

    it('counts the atoms as they are, before the numbers in front are chosen and after', () => {
      expect(step(5).text).toContain(SKELETON)
      expect(said(counts(SKELETON))).toBe('calcium 1 and 3, phosphate 1 and 2, potassium 3 and 1, chlorine 2 and 1')
      expect(step(5).text).toContain(`${said(counts(SKELETON))}.`)
      const balanced = equations[0]!.replaceAll(/\((aq|s)\)/g, '')
      expect(said(counts(balanced))).toBe('calcium 3 and 3, phosphate 2 and 2, potassium 6 and 6, chlorine 6 and 6')
      expect(step(5).text).toContain(`${said(counts(balanced))}.`)
      expect(step(5).text).toMatch(/Change only the numbers in front of the formulas, never the small numbers/)
      // What step six multiplies: the number in front by the small number.
      for (const product of ['3 × 2 = 6 chloride ions', '2 × 3 = 6 potassium ions']) expect(step(6).text).toContain(product)
      // Its numbers in front share no factor, and the card says so; it also says what is done when they do.
      expect(step(7).text).toMatch(/If one whole number bigger than 1 divides all of them, divide them all by it.*Here no such number divides 3, 2 and 1/)
      const inFront = equations[2]!.split(/ \+ | → /).map((term) => Number(/^\d*/.exec(term)![0] || 1))
      expect(inFront).toEqual([3, 2, 1])
      expect([2, 3].filter((n) => inFront.every((k) => k % n === 0))).toEqual([])
    })

    it('takes its example from no station, and reads its two new pairs from the book\'s table: the lab\'s own does not hold them', () => {
      expect(shown('working')).toContain('It is at none of the stations.')
      // No species of the record holds potassium or phosphorus, so no bottle is potassium phosphate and no pair of the table is this example's.
      for (const s of aqueousData.species) for (const element of ['K', 'P']) expect(s.composition[element], s.id).toBeUndefined()
      // Calcium chloride is in the record, as what station 7 leaves dissolved. No bottle holds it, so no station mixes it with anything.
      expect(aqueousData.species.filter((s) => ['CaCl₂', 'K₃PO₄', 'Ca₃(PO₄)₂', 'KCl'].includes(s.formula)).map((s) => s.id)).toEqual(['calcium-chloride'])
      expect(aqueousData.reagents.some((r) => r.speciesId === 'calcium-chloride')).toBe(false)
      expect(step(3).text).toContain('The table of this lab holds only the pairs of its ten stations, so it does not list the two pairs of this example')
      expect(step(3).text).toContain('Every pair that a station needs is in the lab\'s table.')
      // What it says the book's table gives is what that table's rows are recorded as giving for the lab's own pairs.
      expect(step(3).text).toMatch(/Calcium with phosphate is insoluble.*Potassium with chloride is soluble/)
      expect(step(3).support).toMatch(/phosphates are insoluble but for those of the group 1 cations and of ammonium/)
      expect(manifest.sources.find((s) => s.id === 'flowers-chem2e-4.2-solubility')!.supports.some((row) => /PO43-/.test((row as { where?: string }).where ?? ''))).toBe(true)
    })

    it('says where to look when no solid forms, naming that card by its heading, and when nothing reacts', () => {
      expect(step(3).text).toContain(`Not every station forms a solid. Where a gas or water forms instead, the card "${section('signs').heading}" says so, and steps five to eight are then the same.`)
      // That card does say what forms in each of the model's four other rules.
      expect(shown('signs')).toMatch(/gives carbon dioxide gas, water and a salt.*give hydrogen gas with an acid.*give ammonia, NH₃, and water.*hydrogen ions and hydroxide ions make water/s)
      expect(step(3).text).toContain('If both new pairs are soluble, and nothing on that card applies, nothing reacts, and the answer to all three equations is "No reaction".')
    })

    it('gives the four state symbols as the first card does, and says which the example\'s formulas take', () => {
      expect(step(8).text).toMatch(/\(aq\) after each dissolved ion and each dissolved compound, \(s\) after a solid, \(l\) after water and \(g\) after a gas/)
      expect(shown('ions')).toMatch(/\(aq\) for dissolved in water, \(s\) for a solid, \(l\) for a liquid and \(g\) for a gas/)
      for (const equation of equations) expect(equation.match(/\((aq|s|l|g)\)/g)!.length).toBe(equation.split(/ \+ | → /).length)
    })

    it('ends by saying where each thing is on the page, and that the periodic table is not needed', () => {
      const last = step(9).text
      for (const name of ['"Ions on this bench"', '"Solubility table"', 'buttons at the top of the Lab tab', 'In Guided', 'hints', 'The periodic table is not needed for these equations']) expect(last, name).toContain(name)
      expect(step(4).labRules).toEqual(['In this lab each station offers its formulas to choose from, and a few of them do not belong.'])
    })
  })

  it('says in its first card which ions are groups of atoms, as the record has them, and what an acid and a base are, from the passage the titration primer has them from', () => {
    const [, , groups, , , acids] = section('ions').paragraphs
    expect([groups!.label, acids!.label]).toEqual(['Groups of atoms', 'Acids and bases'])
    // The ions of more than one atom that a bottle gives, each by the name and the formula the record stores.
    const given = new Set(aqueousData.reagents.flatMap((r) => r.ions.map((ion) => ion.speciesId)))
    const polyatomic = aqueousData.species.filter((s) => given.has(s.id) && Object.values(s.composition).reduce((a, b) => a + b, 0) > 1)
    expect(polyatomic.map((s) => s.id).sort()).toEqual(['ammonium-ion', 'carbonate-ion', 'hydroxide-ion', 'nitrate-ion', 'sulfate-ion'])
    for (const s of polyatomic) expect(groups!.text, s.id).toContain(`${s.name!.value}, ${s.formula}`)
    expect(groups!.text).toContain('The bottles on this bench give five')
    expect(groups!.text).toMatch(/a group of atoms that stays together and carries one charge for the whole group/)
    expect(acids!.text).toBe('An acid gives hydrogen ions when it dissolves in water. A base gives hydroxide ions, OH⁻, when it dissolves in water. Hydrochloric acid is an acid. Sodium hydroxide is a base. A solution of a base is called basic.')
    expect(acids!.sourceIds).toEqual(TITRATION_PRIMER[0]!.paragraphs[1]!.sourceIds)
    expect(TITRATION_PRIMER[0]!.paragraphs[1]!.text).toBe('A substance is an acid if it gives hydronium ions, H₃O⁺, when it dissolves in water. It is a base if it gives hydroxide ions, OH⁻, when it dissolves in water.')
    expect(acids!.support).toMatch(/This lab: the card says hydrogen ion where the passage says hydronium ion/)
  })

  it('takes its example from no station: no species of the record holds lead, potassium or iodine', () => {
    for (const s of aqueousData.species) for (const element of ['Pb', 'K', 'I']) expect(s.composition[element], s.id).toBeUndefined()
    expect(shown('equations')).toContain('at none of the stations')
  })

  it('gives away no station\'s equation: no card shows a product of a station as a formula', () => {
    const products = new Set(aqueousData.stations.flatMap((s) => [s.expected.precipitate, s.expected.gas]).filter((id) => id !== null).map((id) => aqueousData.species.find((s) => s.id === id)!.formula))
    // Ammonia is named with its formula for the rule on its state; carbon dioxide and hydrogen are named in words.
    products.delete('NH₃')
    for (const s of AQUEOUS_PRIMER) for (const formula of products) expect(shown(s.id), `${s.id}: ${formula}`).not.toContain(formula)
  })

  it('says what is split and what is written whole as spec 8.1 has it, and that ammonia takes either state', () => {
    const card = shown('equations')
    expect(card).toMatch(/split a dissolved ionic compound into its ions, and hydrochloric acid too/)
    expect(card).toMatch(/whole formula.*a solid.*water; and a gas\. Ammonia, NH₃, is a molecule and is written whole as well/)
    expect(card).toContain('In this lab ammonia may be given either state, (g) or (aq).')
    expect(aqueousData.species.find((s) => s.id === 'ammonia')!.acceptedStates).toEqual(['g', 'aq'])
  })

  it('reads the solubility table as the page draws it: a row for each positive ion, a column for each negative ion, only the pairs of these stations, and where it opens from', () => {
    expect(shown('solubility')).toMatch(/has a row for each positive ion and a column for each negative ion\. Where a row and a column cross, it says whether the compound the two ions make is soluble or insoluble/)
    expect(shown('solubility')).toMatch(/take a positive ion from one bottle and a negative ion from the other, and find where the two cross/)
    expect(shown('solubility')).toContain('only the pairs that these ten stations can bring together; any other pair is marked "not listed"')
    expect(shown('solubility')).toContain('Once the lab is started, it opens from the "Solubility table" button at the top of the Lab tab.')
    expect(shown('solubility')).not.toMatch(/lists pairs|beside them/)
    // The patterns it states are those of the stored rows.
    const soluble = (anion: string) => aqueousData.solubility.filter((r) => r.anionId === anion).map((r) => r.soluble)
    expect(soluble('nitrate-ion').every(Boolean)).toBe(true)
    expect(aqueousData.solubility.filter((r) => r.cationId === 'sodium-ion' || r.cationId === 'ammonium-ion').every((r) => r.soluble)).toBe(true)
    for (const anion of ['chloride-ion', 'sulfate-ion']) expect(soluble(anion).filter(Boolean).length).toBeGreaterThan(soluble(anion).filter((s) => !s).length)
    for (const anion of ['carbonate-ion', 'hydroxide-ion']) expect(soluble(anion)).toContain(false)
  })

  it('covers gases and heat as signs, the case where nothing happens, and the limiting reagent in one paragraph', () => {
    expect(shown('signs')).toMatch(/carbon dioxide gas.*hydrogen gas.*ammonia.*heat is released/s)
    expect(shown('signs')).toContain('The temperature rise this lab reports is idealised.')
    expect(shown('no-reaction')).toMatch(/nothing reacts.*"No reaction" can always be chosen/s)
    // Every rule of the model that gives a gas or heat is ruled out, the one that needs no acid too: ammonium with a base, as at station 6.
    expect(shown('no-reaction')).toContain('If there is no acid to meet a carbonate, a base or a metal, and no base to meet an ammonium ion, there is no gas and no heat.')
    expect(aqueousData.stations[5]!.equations.netIonic!.reactants.map((term) => term.speciesId)).toEqual(['ammonium-ion', 'hydroxide-ion'])
    expect(section('limiting').paragraphs.length).toBe(1)
    expect(shown('limiting')).toMatch(/limiting reagent.*in excess/)
  })

  it('teaches wafting and never sniffing, the two places of the litmus, the hot tube and the lit splint', () => {
    const card = shown('observing')
    expect(card).toMatch(/Never put your nose over a tube and breathe in/)
    expect(card).toMatch(/wafting: hold the tube away from your face and wave a little of the vapour towards your nose/)
    expect(card).toMatch(/Dipped into the liquid.*Held moist above the liquid, touching neither the liquid nor the glass/)
    expect(card).toMatch(/hot without looking it.*corrosive/)
    expect(card).toMatch(/Hydrogen answers with a sharp pop.*not a safe way to find out what an unknown gas is/)
  })

  it('rests its safety card on the sheets the bottles cite, and says of each sheet only what the hazard manifest\'s rows print for it', () => {
    const ofReagents = new Set(aqueousData.reagents.flatMap((r) => [r.hazards.sourceId, r.hazards.note.sourceId, ...(r.hazards.note.alsoSourceId ? [r.hazards.note.alsoSourceId] : [])]))
    const lines = [...section('safety').paragraphs, ...section('observing').paragraphs].flatMap((p) => p.support.split('\n')).filter((line) => line.startsWith('flinn-sds-'))
    expect(lines.length).toBe(23)
    for (const line of lines) {
      const id = line.slice(0, line.indexOf(':'))
      const sheet = sheets.find((s) => s.id === id)!
      expect(ofReagents.has(id), id).toBe(true)
      const printed = sheet.supports.map((row) => row.prints).join(' | ')
      const establishes = line.split('. It establishes that ')[1]!
      for (const code of establishes.match(/H\d{3}/g) ?? []) expect(printed, `${id}: ${code}`).toContain(code)
      const word = /signal word (Danger|Warning)/.exec(establishes)?.[1]
      if (word) expect(printed, `${id}: ${word}`).toContain(word.toUpperCase())
    }
  })

  it('says of the bottles what their headings and notes say: what the statements classify, that every sheet calls for eye protection, gloves and protective clothing, and which reagent has no statement', () => {
    const { reagents } = aqueousData
    for (const r of reagents) expect(r.hazards.note.value, r.id).toContain('eye protection, gloves and protective clothing')
    expect(shown('safety')).toContain('call for all three for every reagent here')
    const headings = Object.fromEntries(reagents.map((r) => [r.id, r.classifiedAs!]))
    for (const id of ['hcl-1m', 'hcl-3m', 'hcl-6m']) expect(headings[id]).toContain('concentrated hydrochloric acid (6 M to 12 M)')
    expect(headings.mg).toContain('magnesium metal')
    for (const r of reagents.filter((one) => !one.id.startsWith('hcl') && one.id !== 'mg')) expect(headings[r.id], r.id).toMatch(/^Hazards of solid .+, the pure substance,/)
    expect(shown('safety')).toMatch(/for the acid, concentrated acid of 6 M to 12 M; for magnesium, the metal itself; for every other bottle, the solid/)
    expect(reagents.filter((r) => r.hazards.statements.length === 0).map((r) => r.id)).toEqual(['caco3'])
    expect(shown('safety')).toContain('Calcium carbonate is the one reagent here whose sheet lists no hazard statement at all.')
  })

  it('calls corrosive exactly the bottles whose solution sheets print H314: the acid at its three strengths and the base at its two', () => {
    const corrosive = aqueousData.reagents.filter((r) => /under (the code )?H314/.test(r.hazards.note.value)).map((r) => r.id)
    expect(corrosive).toEqual(['naoh-1m', 'naoh-6m', 'hcl-1m', 'hcl-3m', 'hcl-6m'])
    expect(shown('safety')).toMatch(/hydrochloric acid, at each of its three strengths, and the sodium hydroxide solution, at both of its, are corrosive/)
  })

  it("ends its safety card with what the notes give for a splash in the eyes, and with the owner's rule in the words the titration primer gives it in", () => {
    const last = section('safety').paragraphs.at(-1)!
    const rule = 'A laboratory sets its own rule, and a common one is 15 minutes at the eyewash; follow the rule of the laboratory you are in.'
    expect(last.label).toBe('A splash')
    expect(last.text.endsWith(rule)).toBe(true)
    expect(TITRATION_PRIMER.find((s) => s.id === 'safety')!.paragraphs[1]!.text.endsWith(rule)).toBe(true)
    expect(last.support).toMatch(/This lab: .*is the owner's statement of the rule where they work \(2026-10-05\); no source was read for it/)
    // What the card says of the sheets is what the notes under the bottles say: rinsing for several minutes for the
    // eyes on every bottle but one, a number of minutes on one bottle only, and that not said to be for the eyes.
    const { reagents } = aqueousData
    const note = (id: string) => reagents.find((r) => r.id === id)!.hazards.note.value
    expect(reagents.filter((r) => !/eyes (is|are) to be rinsed (out )?with water for several minutes/.test(r.hazards.note.value)).map((r) => r.id)).toEqual(['cocl2-0.5m'])
    expect(note('cocl2-0.5m')).toContain('Neither sheet prints any first aid for a splash in the eyes.')
    expect(reagents.filter((r) => /\d+ minutes/.test(r.hazards.note.value)).map((r) => r.id)).toEqual(['fecl3-0.5m'])
    expect(note('fecl3-0.5m')).toContain('kept up for 15 minutes or more, without saying whether that is for the skin or for the eyes')
    expect(last.text).toMatch(/none gives a number of minutes for the eyes.*iron\(III\) chloride solution.*15 minutes or more, without saying what is to be flushed.*cobalt chloride print no first aid for the eyes/)
    expect(last.sourceIds).toEqual(['flinn-sds-339', 'flinn-sds-339.01', 'flinn-sds-255', 'flinn-sds-255.51'])
  })
})
