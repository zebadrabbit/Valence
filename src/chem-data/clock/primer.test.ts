import { describe, expect, it } from 'vitest'
import hazardManifest from '../../../docs/research/clock/sources/hazard-manifest.json'
import manifestFile from '../../../docs/research/clock/sources/MANIFEST.json'
import { findInstitutionText } from '../denylist'
import { termIndex, type PrimerParagraph } from '../primer'
import sources from '../sources.json'
import { clockData } from './data'
import { CLOCK_PRIMER, READ_FIRST } from './primer'

const local = import.meta.glob<string[]>('../denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

const manifest: { sources: { id: string; url: string; supports: { fields: string[] }[] }[] } = manifestFile
const section = (id: string) => CLOCK_PRIMER.find((s) => s.id === id)!
const paragraphs = CLOCK_PRIMER.flatMap((s) => s.paragraphs.map((paragraph, i): [string, PrimerParagraph] => [`${s.id}[${i}]`, paragraph]))
const cited = new Set(paragraphs.flatMap(([, paragraph]) => paragraph.sourceIds))
const source = (id: string) => sources.find((s) => s.id === id)
const shown = (id: string) => section(id).paragraphs.map((p) => p.text).join(' ')
const all = CLOCK_PRIMER.map((s) => shown(s.id)).join(' ')
const labelled = (id: string, label: string) => section(id).paragraphs.find((p) => p.label === label)!
const words = (text: string) => text.split(/\s+/).length

describe('the clock reaction primer: its cards', () => {
  it('has the eight cards of spec 19.6, in order', () => {
    expect(CLOCK_PRIMER.map((s) => [s.id, s.heading])).toEqual([
      ['rate', 'How fast'],
      ['rate-law', 'What a rate depends on'],
      ['clock', 'The clock'],
      ['order', 'Finding an order'],
      ['constant', 'The rate constant'],
      ['temperature', 'Temperature and activation energy'],
      ['graph', 'Reading the graph'],
      ['safety', 'Safety'],
    ])
  })

  it('gives every card two to four paragraphs with text, and no two cards one heading', () => {
    expect(new Set(CLOCK_PRIMER.map((s) => s.heading)).size).toBe(CLOCK_PRIMER.length)
    for (const s of CLOCK_PRIMER) {
      expect(s.paragraphs.length, s.id).toBeGreaterThanOrEqual(2)
      expect(s.paragraphs.length, s.id).toBeLessThanOrEqual(4)
      for (const p of s.paragraphs) expect(p.text.trim().length, s.id).toBeGreaterThan(40)
    }
  })

  it("is short, by the Le Chatelier's principle primer's limits: no paragraph over 75 words, no card over 200, and under 1200 in all", () => {
    for (const [where, p] of paragraphs) expect(words(p.text), where).toBeLessThanOrEqual(75)
    for (const s of CLOCK_PRIMER) expect(words(shown(s.id)), s.id).toBeLessThanOrEqual(200)
    expect(words(all)).toBeLessThan(1200)
  })

  it('opens by saying how many cards there are and naming the four to read before the bench, by their headings, and no other', () => {
    const first = section('rate').paragraphs[0]!.text
    expect(first).toContain('eight cards')
    expect(first).toContain('Read four of them')
    expect(first).toContain('The other four')
    expect(READ_FIRST).toEqual(['rate', 'rate-law', 'clock', 'safety'])
    expect(CLOCK_PRIMER.filter((s) => first.includes(s.heading)).map((s) => s.id)).toEqual(READ_FIRST)
  })

  it('explains in the cards read first, as they are read, each word the bench leans on', () => {
    const read = READ_FIRST.map(shown).join(' ')
    for (const word of ['rate', 'concentration', 'mol/L', 'M.', 'mol/(L·s)', 'three significant figures', '3.22e-7', 'order', 'thiosulfate', 'Starch', 'colourless', 'blue all at once', 'watch', 'a sixth', '50 mL', 'potassium bromate']) expect(read, word).toContain(word)
  })

  it('holds no institution text in any heading or paragraph', () => {
    for (const s of CLOCK_PRIMER) {
      expect(findInstitutionText(s.heading, institutionNames), s.id).toBeNull()
      for (const p of s.paragraphs) {
        expect(findInstitutionText(p.text, institutionNames), `${s.id}: ${p.label}`).toBeNull()
        if (p.equation) expect(findInstitutionText(p.equation, institutionNames), `${s.id}: ${p.label}`).toBeNull()
      }
    }
  })
})

describe('the clock reaction primer: how its text is drawn', () => {
  it('heads every paragraph with a label of one to four words, its own within the card', () => {
    for (const s of CLOCK_PRIMER) {
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
    expect(terms.map(([, term]) => term)).toEqual(['rate', 'concentration', 'significant figures', 'rate law', 'order', 'rate constant', 'activation energy'])
    for (const [where, term, text] of terms) {
      expect(term, where).toMatch(/^[\p{L} -]+$/u)
      expect(termIndex(text, term), `${where}: ${term}`).toBeGreaterThanOrEqual(0)
    }
    expect(new Set(terms.map(([, term]) => term.toLowerCase())).size).toBe(terms.length)
  })

  it("sets off only whole sentences of the paragraph that name the lab themselves, each a rule of the simulation's and not of a bench", () => {
    const rules = paragraphs.flatMap(([where, p]) => (p.labRules ?? []).map((rule) => [where, rule, p.text] as const))
    expect(rules.map(([where]) => where)).toEqual(['graph[3]'])
    for (const [where, rule, text] of rules) {
      expect(rule, where).toMatch(/^In this lab .*\.$/)
      const at = text.indexOf(rule)
      expect(at, where).toBeGreaterThanOrEqual(0)
      expect(at === 0 || text.slice(at - 2, at) === '. ', where).toBe(true)
      expect(text.slice(at + rule.length), where).toMatch(/^$|^ [A-Z]/)
    }
  })

  it('shows a relation under the six paragraphs that state one, and nowhere else', () => {
    expect(paragraphs.filter(([, p]) => p.equation !== undefined).map(([where, p]) => [where, p.equation])).toEqual([
      ['clock[2]', 'rate = (concentration of thiosulfate in the mixture ÷ 6) ÷ time'],
      ['clock[3]', 'concentration in the mixture = concentration in the bottle × volume used ÷ whole volume'],
      ['constant[0]', 'k = rate ÷ ([A]ˣ × [B]ʸ × [C]ᶻ)'],
      ['temperature[2]', 'ln k = ln A − Ea ÷ (R × T)'],
      ['graph[1]', 'slope = (second ln k − first ln k) ÷ (second 1/T − first 1/T)'],
      ['graph[2]', 'Ea = −slope × R'],
    ])
  })
})

describe('the clock reaction primer: what each paragraph rests on', () => {
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
    expect(unsourced.map(([where]) => where)).toEqual(['rate[0]', 'rate[2]', 'order[2]', 'constant[1]', 'constant[2]', 'graph[1]', 'graph[2]', 'graph[3]', 'safety[0]'])
    for (const [where, p] of unsourced) for (const line of p.support.split('\n')) expect(line, where).toMatch(/^This lab: /)
  })

  it('lists in the manifest, with a primer row, the sources of its own that the primer cites; the rest are the documents read for its safety card', () => {
    const withRow = manifest.sources.filter((s) => s.supports.some((row) => row.fields.includes('primer'))).map((s) => s.id)
    const own = [...cited].filter((id) => manifest.sources.some((s) => s.id === id))
    // Every source the manifest marks for the primer is cited by it, and every source of the manifest the primer cites is marked.
    expect([...own].sort()).toEqual([...withRow].sort())
    expect(own.sort()).toEqual(['bellevue-clock-reaction', 'chemguide-arrhenius', 'chemguide-collision-theory', 'chemguide-finding-orders', 'chemguide-orders-of-reaction', 'chemguide-rates-concentration', 'chemguide-rates-temperature', 'moorpark-clock-reaction', 'ncssm-clock-reaction', 'nist-codata-2022', 'nist-si-temperature', 'smc-initial-rates'])
    // The others are the documents read for the safety card, each marked so in the hazard manifest; the card cites every one of them.
    const forSafety = hazardManifest.sources.filter((s) => s.supports.some((row) => row.field === 'primer.safety')).map((s) => s.id)
    const others = [...cited].filter((one) => !own.includes(one))
    expect(others.sort()).toEqual([...forSafety].sort())
    expect(others.length).toBe(8)
    const safety = new Set(section('safety').paragraphs.flatMap((p) => p.sourceIds))
    for (const id of forSafety) expect(safety.has(id), id).toBe(true)
    // No card but the last cites a document of the hazard manifest.
    for (const s of CLOCK_PRIMER) if (s.id !== 'safety') for (const p of s.paragraphs) for (const id of p.sourceIds) expect(own, `${s.id}: ${id}`).toContain(id)
  })

  it('cites no page of OpenStax and no page of a secondary encyclopedia, and neither of the two research records, which give this reaction\'s orders', () => {
    for (const id of cited) expect(`${id} ${source(id)!.url} ${source(id)!.citation}`).not.toMatch(/openstax|flowers-chem2e|wikipedia/i)
    for (const id of ['barton-bromate-iodide-1976', 'loo-bromate-iodide-1969', 'uddin-iodide-bromate-1979']) expect(cited.has(id), id).toBe(false)
  })
})

describe("the clock reaction primer: its figures are the record's", () => {
  it('gives the count between the two reactions, and the whole volume of a mixture, as the record has them', () => {
    expect(clockData.count.value).toBe(6)
    expect(labelled('clock', 'Six for one').text).toContain('use up six thiosulfate ions')
    expect(labelled('clock', 'Six for one').text).toContain('a sixth of the thiosulfate')
    expect(labelled('clock', 'Six for one').equation).toContain(`÷ ${clockData.rateLaw.end.per})`)
    const whole = [...clockData.mixtures[0]!.flaskA, ...clockData.mixtures[0]!.flaskB].reduce((sum, part) => sum + part.millilitres, 0)
    expect(labelled('clock', 'Once mixed').text).toContain(`over the whole ${whole} mL`)
  })

  it('gives the kelvin of 0 °C as the record has it, and the gas constant to four figures', () => {
    const { zeroCelsius, gasConstant } = clockData.constants
    expect(labelled('temperature', 'Kelvin').text).toBe(`The arithmetic needs the temperature in kelvin, written K: add ${zeroCelsius.published} to the reading in degrees Celsius. So 20.0 °C is 293.15 K.`)
    expect(Number((20 + zeroCelsius.value).toFixed(2))).toBe(293.15)
    expect(labelled('temperature', 'The Arrhenius equation').text).toContain(`R is the gas constant, ${gasConstant.value.toPrecision(4)} ${gasConstant.unit}`)
    expect(labelled('graph', 'The activation energy').text).toContain(`× ${gasConstant.value.toPrecision(4)} =`)
  })

  it("gives the liquid's two looks as the record has them", () => {
    const { before, after } = clockData.rateLaw.end
    expect(labelled('clock', 'The sudden blue').text).toContain(`Starch turns ${after.value} with iodine.`)
    expect(before.value).toContain('colourless')
    expect(labelled('clock', 'The sudden blue').text).toContain('the liquid stays colourless')
  })

  it("gives none of this reaction's orders, nor its rate constant or its activation energy: those are what the lab asks for", () => {
    expect(all).not.toMatch(/\[I⁻\]|\[BrO₃⁻\]|\[H⁺\]/)
    expect(all).not.toMatch(/(first|second|zero|fourth)[- ]order/i)
    expect(all).not.toContain(clockData.rateLaw.rateConstant.published!)
    expect(all).not.toMatch(/\b50(\.0)? kJ/)
    // The examples' orders, rate constant and slope are none of the lab's: second order in one reactant, third order in all, and a slope that gives 45.7 kJ/mol.
    expect(all).toContain('order 2.')
    expect(all).toContain('45.7 kJ/mol')
  })
})

describe('the clock reaction primer: its worked examples', () => {
  const three = (x: number) => Number(x.toPrecision(3))

  it('writes a small number three ways, and a number to three significant figures', () => {
    const text = labelled('rate', 'Small numbers').text
    expect(text).toContain('0.000000322 mol/(L·s). That is written 3.22 × 10⁻⁷, and typed 3.22e-7.')
    expect(0.000000322).toBe(3.22e-7)
    expect(text).toContain('0.0020 is written 0.00200.')
  })

  it('works the strength of a solution once it is mixed', () => {
    expect(labelled('clock', 'Once mixed').text).toContain('20 mL of a 0.50 M solution in a 50 mL mixture is 0.50 × 20 ÷ 50 = 0.200 M')
    expect(three((0.5 * 20) / 50)).toBe(0.2)
    // No bottle of the bench is 0.50 M.
    for (const r of clockData.reagents) if (r.form === 'solution') expect(r.molarity, r.id).not.toBe(0.5)
  })

  it('finds an order from two runs', () => {
    const text = labelled('order', 'A worked example').text
    expect(text).toContain('1.58 × 10⁻⁶ ÷ 4.00 × 10⁻⁷ = 3.95 times for twice the concentration: order 2.')
    expect(three(1.58e-6 / 4.0e-7)).toBe(3.95)
    expect(0.002 / 0.001).toBe(2)
    expect(labelled('order', 'Never exact').text).toContain('A ratio of 2.05 is twice, and 3.9 is four times.')
  })

  it('works a rate constant with its unit', () => {
    const text = labelled('constant', 'A worked example').text
    expect(text).toContain('k = 2.40 × 10⁻⁶ ÷ (0.0200 × 0.0100²) = 1.20 L²/(mol²·s).')
    expect(three(2.4e-6 / (0.02 * 0.01 ** 2))).toBe(1.2)
    // Orders of one and two add up to three: the unit the card before gives for three.
    expect(labelled('constant', 'Its unit').text).toContain('to 3, in L²/(mol²·s)')
    expect(labelled('constant', 'Its unit').text).toContain('to 4, in L³/(mol³·s)')
  })

  it('works a slope from two places on a line, and an activation energy from the slope', () => {
    expect(labelled('graph', 'The slope').text).toContain('From (0.00320, 4.500) to (0.00360, 2.300) the slope is (2.300 − 4.500) ÷ (0.00360 − 0.00320) = −5500 K.')
    expect(three((2.3 - 4.5) / (0.0036 - 0.0032))).toBe(-5500)
    expect(labelled('graph', 'The activation energy').text).toContain('5500 × 8.314 = 45 727 J/mol, which is 45.7 kJ/mol')
    expect(5500 * 8.314).toBe(45727)
    expect(three(45727 / 1000)).toBe(45.7)
  })
})

describe('the clock reaction primer: what it has to say (spec 19.6)', () => {
  it('says what a rate is and its unit, and what a rate law and an order are', () => {
    expect(shown('rate')).toContain('how much of a reactant is used up in each second')
    expect(shown('rate')).toContain('So a rate is in mol/(L·s).')
    expect(shown('rate-law')).toContain('A rate law says how the rate depends on each concentration')
    expect(shown('rate-law')).toContain('The power on a concentration is the order in that reactant.')
    expect(shown('rate-law')).toContain('An order cannot be read off the equation of the reaction.')
  })

  it('says what the thiosulfate and the starch are for, and why the change is sudden', () => {
    expect(shown('clock')).toContain('takes up iodine at once, as fast as it forms')
    expect(shown('clock')).toContain('When the last of it is used up, the next iodine meets the starch and the liquid turns blue all at once.')
  })

  it('says how an order is found by comparing two runs, and what the rate constant and its unit are', () => {
    expect(shown('order')).toContain('Take two runs that differ in one reactant only.')
    expect(shown('constant')).toContain('every mixture at one temperature should give about the same k')
    expect(shown('constant')).toContain('The unit of k depends on the orders.')
  })

  it('says what temperature does, what the activation energy is, and how the graph of part 3 is read', () => {
    expect(shown('temperature')).toContain('The least that will do is the activation energy')
    expect(shown('graph')).toContain('Its slope is −Ea ÷ R.')
    expect(shown('graph')).toContain('so the slope is a negative number')
    expect(shown('graph')).toContain('In this lab the notebook fills in each temperature in kelvin')
  })
})

describe('the clock reaction primer: its safety card', () => {
  const card = shown('safety')

  it("says what a real bench of this lab holds, with potassium bromate first, and that each bottle's hazards are on its tile", () => {
    expect(card).toContain('A real bench of this lab holds potassium bromate, which needs the most care')
    expect(card).toContain("Each bottle's tile gives its hazards.")
  })

  it('says of potassium bromate what the documents read for it say, and that it meets the rest only in the flask', () => {
    const p = labelled('safety', 'Potassium bromate')
    expect(p.text).toContain('toxic if swallowed and may cause cancer')
    expect(p.text).toContain('a carcinogen that passes through skin')
    expect(p.text).toContain('It is a strong oxidiser')
    expect(p.text).toContain('only in the flask, each already dilute')
    expect(p.sourceIds).toEqual(['flinn-sds-615', 'nj-rtk-fs-1559', 'noaa-cameo-1353', 'wards-sds-pp0395', 'wards-sds-pp0398'])
    // The two statements are those of the tile.
    const statements = clockData.reagents.find((r) => r.id === 'kbro3-0.04m')!.hazards.statements.join(' ')
    expect(statements).toContain('Toxic if swallowed')
    expect(statements).toContain('May cause cancer')
    expect(p.support).toContain('This lab: that the bromate meets the other four only in the flask, each of them dilute, is the experiment itself. No document read says what the dilute solutions give when they are mixed.')
  })

  it('says of the iodine a flask makes only what the documents say of iodine and of a solution of it', () => {
    const p = labelled('safety', 'Iodine in the flask')
    expect(p.text).toContain('irritating to skin and eyes')
    expect(p.text).toContain('iodine is very toxic to water life')
    expect(p.text).toContain('kept out of drains')
    expect(p.sourceIds).toEqual(['flinn-sds-411', 'noaa-cameo-25035', 'fisher-sds-iodine'])
  })

  it('says as a hazard nothing that no document read says: what the mixed solutions give, bromine, or the blue of starch', () => {
    expect(card).not.toMatch(/bromine|fume|vapou?r|gas\b|blue|explo/i)
  })

  it("says what to wear and what to do after a splash, gives no method of disposal, and sends the reader to the laboratory's supervisor", () => {
    expect(card).toContain('eye protection, gloves and a laboratory coat')
    expect(card).toContain('eyes are rinsed with water for 15 minutes or more, and a doctor is seen at once')
    expect(card).toContain("How anything is disposed of is decided by the laboratory's own rules and by local regulations: ask the laboratory's supervisor.")
    expect(card).not.toMatch(/sink|neutrali[sz]e it|waste (container|bottle|jar)|pour it/i)
  })
})
