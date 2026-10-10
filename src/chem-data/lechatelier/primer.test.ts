import { describe, expect, it } from 'vitest'
import hazardManifest from '../../../docs/research/lechatelier/sources/hazard-manifest.json'
import manifestFile from '../../../docs/research/lechatelier/sources/MANIFEST.json'
import { findInstitutionText } from '../denylist'
import { termIndex, type PrimerParagraph } from '../primer'
import sources from '../sources.json'
import { lechatelierData } from './data'
import { LECHATELIER_PRIMER, READ_FIRST } from './primer'

const local = import.meta.glob<string[]>('../denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

const manifest: { sources: { id: string; url: string; supports: { fields: string[] }[] }[] } = manifestFile
const section = (id: string) => LECHATELIER_PRIMER.find((s) => s.id === id)!
const paragraphs = LECHATELIER_PRIMER.flatMap((s) => s.paragraphs.map((paragraph, i): [string, PrimerParagraph] => [`${s.id}[${i}]`, paragraph]))
const cited = new Set(paragraphs.flatMap(([, paragraph]) => paragraph.sourceIds))
const source = (id: string) => sources.find((s) => s.id === id)
const shown = (id: string) => section(id).paragraphs.map((p) => p.text).join(' ')
const all = LECHATELIER_PRIMER.map((s) => shown(s.id)).join(' ')
const labelled = (id: string, label: string) => section(id).paragraphs.find((p) => p.label === label)!
const words = (text: string) => text.split(/\s+/).length

describe('the Le Chatelier primer: its cards', () => {
  it('has the ten cards of spec 18.6, in order', () => {
    expect(LECHATELIER_PRIMER.map((s) => [s.id, s.heading])).toEqual([
      ['equilibrium', 'What equilibrium is'],
      ['principle', "Le Chatelier's principle"],
      ['adding', 'Adding and taking away'],
      ['heat', 'Heating and cooling'],
      ['diluting', 'Diluting'],
      ['solid', 'A solid and its ions'],
      ['indicators', 'Indicators'],
      ['complex', 'Complex ions and colour'],
      ['second', 'A second equilibrium'],
      ['safety', 'Safety'],
    ])
  })

  it('gives every card two to four paragraphs with text, and no two cards one heading', () => {
    expect(new Set(LECHATELIER_PRIMER.map((s) => s.heading)).size).toBe(LECHATELIER_PRIMER.length)
    for (const s of LECHATELIER_PRIMER) {
      expect(s.paragraphs.length, s.id).toBeGreaterThanOrEqual(2)
      expect(s.paragraphs.length, s.id).toBeLessThanOrEqual(4)
      for (const p of s.paragraphs) expect(p.text.trim().length, s.id).toBeGreaterThan(40)
    }
  })

  it('is short: no paragraph over 75 words, no card over 200, and the whole of it well under what the Group I cations primer runs to', () => {
    for (const [where, p] of paragraphs) expect(words(p.text), where).toBeLessThanOrEqual(75)
    for (const s of LECHATELIER_PRIMER) expect(words(shown(s.id)), s.id).toBeLessThanOrEqual(200)
    expect(words(all)).toBeLessThan(1200)
  })

  it('opens by saying how many cards there are and naming the four to read before the bench, by their headings, and no other', () => {
    const first = section('equilibrium').paragraphs[0]!.text
    expect(first).toContain('ten cards')
    expect(first).toContain('Read four of them')
    expect(first).toContain('The other six')
    expect(READ_FIRST).toEqual(['equilibrium', 'principle', 'adding', 'safety'])
    expect(LECHATELIER_PRIMER.filter((s) => first.includes(s.heading)).map((s) => s.id).sort()).toEqual([...READ_FIRST].sort())
  })

  it('explains in the cards read first, as they are read, each word the bench leans on', () => {
    const read = READ_FIRST.map(shown).join(' ')
    for (const word of ['equilibrium', 'left side', 'right side', 'shift', 'disturbed', 'hydroxide ions', 'hydrogen ions', 'acid', 'base', 'heating or cooling']) expect(read, word).toContain(word)
  })

  it('holds no institution text in any heading or paragraph', () => {
    for (const s of LECHATELIER_PRIMER) {
      expect(findInstitutionText(s.heading, institutionNames), s.id).toBeNull()
      for (const p of s.paragraphs) expect(findInstitutionText(p.text, institutionNames), `${s.id}: ${p.label}`).toBeNull()
    }
  })
})

describe('the Le Chatelier primer: how its text is drawn', () => {
  it('heads every paragraph with a label of one to four words, its own within the card', () => {
    for (const s of LECHATELIER_PRIMER) {
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
    expect(terms.map(([, term]) => term)).toEqual(['equilibrium', 'indicator', 'complex ion'])
    for (const [where, term, text] of terms) {
      expect(term, where).toMatch(/^[\p{L} -]+$/u)
      expect(termIndex(text, term), `${where}: ${term}`).toBeGreaterThanOrEqual(0)
    }
    expect(new Set(terms.map(([, term]) => term.toLowerCase())).size).toBe(terms.length)
  })

  it("sets off only whole sentences of the paragraph that name the lab themselves, each a rule of the simulation's and not of a bench", () => {
    const rules = paragraphs.flatMap(([where, p]) => (p.labRules ?? []).map((rule) => [where, rule, p.text] as const))
    expect(rules.map(([where]) => where)).toEqual(['equilibrium[2]', 'principle[2]'])
    for (const [where, rule, text] of rules) {
      expect(rule, where).toMatch(/^In this lab .*\.$/)
      // A whole sentence: it starts the text or follows a full stop, and ends the text or is followed by a space and a capital.
      const at = text.indexOf(rule)
      expect(at, where).toBeGreaterThanOrEqual(0)
      expect(at === 0 || text.slice(at - 2, at) === '. ', where).toBe(true)
      expect(text.slice(at + rule.length), where).toMatch(/^$|^ [A-Z]/)
    }
  })

  it('shows no relation under any paragraph: this lab has nothing to work out', () => {
    expect(paragraphs.filter(([, p]) => p.equation !== undefined)).toEqual([])
  })
})

describe('the Le Chatelier primer: what each paragraph rests on', () => {
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
    expect(unsourced.map(([where]) => where)).toEqual(['equilibrium[0]', 'principle[2]', 'safety[0]'])
    for (const [where, p] of unsourced) for (const line of p.support.split('\n')) expect(line, where).toMatch(/^This lab: /)
  })

  it('lists in the manifest, with a primer row, the sources of its own that the primer alone cites; the rest are documents of the hazard manifest', () => {
    const withRow = manifest.sources.filter((s) => s.supports.some((row) => row.fields.includes('primer'))).map((s) => s.id)
    const own = [...cited].filter((id) => manifest.sources.some((s) => s.id === id))
    // Every source the manifest marks for the primer is cited by it, and every source of the manifest the primer cites is marked or is one the record cites too.
    for (const id of withRow) expect(cited.has(id), id).toBe(true)
    for (const id of own) expect(withRow.includes(id) || JSON.stringify(lechatelierData).includes(`"${id}"`), id).toBe(true)
    expect(withRow.sort()).toEqual(['birk-zinc', 'chemguide-equilibria-introduction', 'chemguide-le-chatelier', 'lower-le-chatelier', 'malik-varying-solubility'])
    expect(own.sort()).toEqual(['bellevue-le-chatelier', 'birk-lead', 'birk-magnesium', 'birk-zinc', 'chemguide-equilibria-introduction', 'chemguide-indicators', 'chemguide-le-chatelier', 'chemguide-ligand-exchange', 'libretexts-acid-base-indicators', 'lower-le-chatelier', 'malik-varying-solubility', 'nbs-tables-1982', 'nuffield-cobalt-equilibrium'])
    // The others are the documents read for the safety card, each marked so in the hazard manifest; the card cites every one of them.
    const forSafety = hazardManifest.sources.filter((s) => s.supports.some((row) => row.field === 'primer.safety')).map((s) => s.id)
    const others = [...cited].filter((one) => !own.includes(one))
    expect(others.sort()).toEqual([...forSafety].sort())
    expect(others.length).toBe(10)
    const safety = new Set(section('safety').paragraphs.flatMap((p) => p.sourceIds))
    for (const id of forSafety) expect(safety.has(id), id).toBe(true)
  })

  it('cites no page of OpenStax and no page of a secondary encyclopedia', () => {
    for (const id of cited) expect(`${id} ${source(id)!.url} ${source(id)!.citation}`).not.toMatch(/openstax|flowers-chem2e|wikipedia/i)
  })
})

describe("the Le Chatelier primer: its figures are the record's", () => {
  it('gives the two solubilities of lead chloride as the record has them', () => {
    const { solubilityCold: cold, solubilityHot: hot } = lechatelierData.leadChloride
    expect(labelled('solid', 'Hot and cold').text).toBe(`A litre of water at ${cold.celsius} °C holds ${cold.published} g of lead chloride. At ${hot.celsius} °C it holds ${hot.published} g, over three times as much.`)
    expect(hot.value / cold.value).toBeGreaterThan(3)
  })

  it('gives the heat that dissolving lead chloride takes in as the record works it out, to the whole kilojoule', () => {
    expect(labelled('heat', 'Two cases here').text).toContain(`about ${Math.round(lechatelierData.heats[0]!.enthalpy.value)} kJ for each mole`)
    expect(lechatelierData.equilibria.find((e) => e.id === 'cobalt')!.heat!.takenInToward).toBe('right')
    expect(labelled('heat', 'Two cases here').text).toContain('from the pink ion of cobalt to the blue one takes in heat too')
  })

  it("gives the indicator's range and colours as the record has them", () => {
    const { range, looks } = lechatelierData.indicator
    const text = labelled('indicators', 'Methyl violet').text
    expect(text).toContain(`It changes between pH ${range.from.published} and pH ${range.to.published}`)
    expect(text).toContain(`Methyl violet is ${looks.below.value} in strong acid and ${looks.noAcid.value} in water.`)
    // It names no colour for the middle of the range: no page read does.
    expect(all).not.toMatch(/\bgreen\b/i)
  })

  it('gives the colours of the two cobalt ions, and of a liquid that holds both, as the record has them', () => {
    const cobalt = lechatelierData.equilibria.find((e) => e.id === 'cobalt')!.seenBy
    expect(cobalt).toEqual({ kind: 'colour', left: 'pink', right: 'blue' })
    expect(labelled('complex', 'Cobalt').text).toBe('Cobalt with six water molecules around it is pink. Cobalt with four chloride ions around it is blue. The two are at equilibrium in a liquid that holds chloride, and a liquid that holds both is violet.')
  })
})

describe('the Le Chatelier primer: what it has to say (spec 18.6)', () => {
  it('says what equilibrium is: two changes at one rate, and not no change', () => {
    expect(shown('equilibrium')).toContain('When the change forward and the change back run at the same rate, the amount of each thing stops changing.')
    expect(shown('equilibrium')).toContain('Nothing has stopped: both changes go on')
  })

  it('states the principle, and that only part of a disturbance is undone', () => {
    expect(shown('principle')).toContain('A system at equilibrium that is disturbed shifts in the direction that undoes part of the disturbance.')
    expect(shown('principle')).toContain('Only part is undone')
  })

  it('says which way adding and taking away push, and that a thing can be taken away without leaving the tube', () => {
    expect(shown('adding')).toContain('the system moves away from the side it stands on')
    expect(shown('adding')).toContain('the system moves toward the side it stood on')
    expect(shown('adding')).toContain('An acid takes hydroxide ions away by joining them to its hydrogen ions, which makes water.')
  })

  it('says which way heating and cooling push', () => {
    expect(shown('heat')).toContain('Heating a system at equilibrium moves it the way that takes heat in. Cooling moves it the way that gives heat out.')
  })

  it('says what diluting does, and what a solid shows', () => {
    expect(shown('diluting')).toContain('The system moves toward the side with more dissolved particles.')
    expect(shown('solid')).toContain('So the solid itself shows which way the equilibrium went.')
  })

  it('says what a second equilibrium does, with zinc as the case and magnesium as the one without', () => {
    expect(shown('second')).toContain('If the second uses it up, the first shifts to make more of it.')
    expect(shown('second')).toContain('holds the zinc ion in a complex ion that stays dissolved')
    expect(shown('second')).toContain('Magnesium rarely forms complex ions, and forms none here that would hold it dissolved.')
  })

  it('says each rule of the simulation where it belongs', () => {
    expect(shown('equilibrium')).toContain('In this lab each equilibrium is written one way and kept that way')
    expect(shown('principle')).toContain('In this lab you say which way a system will shift before each change, and that is never marked.')
  })

  it('does not go through the bench one tube at a time: no portion, no bath and no colour that a tube turns', () => {
    // The cards say which way each kind of disturbance pushes, and what zinc and magnesium do; the lab asks the learner to apply that to its tubes.
    expect(all).not.toMatch(/the first portion|after the second|in the boiling bath|the tube (turns|turned|shows)/i)
  })
})

describe('the Le Chatelier primer: its safety card', () => {
  const card = shown('safety')

  it('says what a real bench of this lab holds, and that each bottle\'s hazards are on its tile', () => {
    expect(card).toContain('A real bench of it holds salts of lead and of cobalt, concentrated acid, and strong solutions of sodium hydroxide and of ammonia.')
    expect(card).toContain("Each bottle's tile gives its hazards.")
    // No hazard statement of a tile is copied out: the tiles show those.
    for (const reagent of lechatelierData.reagents) for (const statement of reagent.hazards.statements) expect(card, statement).not.toContain(statement.split(': ')[1]!)
  })

  it('says of the three solids the lab makes what the documents read for them say', () => {
    const text = labelled('safety', 'The solids it makes').text
    expect(text).toContain('lead chloride is harmful if swallowed or breathed in, may cause cancer, may harm fertility or an unborn child, and is very toxic to water life')
    expect(text).toContain('Zinc hydroxide irritates skin and eyes and is very toxic to water life.')
    expect(text).toContain('One sheet calls magnesium hydroxide an irritant; another classes it as no hazard.')
    expect(labelled('safety', 'The solids it makes').sourceIds).toEqual(['flinn-sds-435', 'flinn-sds-435.5', 'fisher-sds-pbcl2', 'noaa-cameo-3735', 'mpbio-sds-zinc-hydroxide', 'flinn-sds-475', 'fisher-sds-mgoh2'])
  })

  it('says that the concentrated acid gives off heat when it is diluted, on two documents, and marks the warming of the cobalt tube as the lab\'s reading', () => {
    const p = labelled('safety', 'Acid and water')
    expect(p.text).toContain('Concentrated hydrochloric acid gives off heat when water is added to it, so a real tube of system 3 warms as it is diluted.')
    expect(p.sourceIds).toEqual(['flinn-sds-395', 'noaa-cameo-3598', 'flinn-sds-255.6'])
    expect(p.support).toContain("This lab: that the tube of system 3 warms is this lab's reading of the two documents on the acid: neither speaks of cobalt.")
  })

  it("gives no method of disposal, and sends the reader to the laboratory's supervisor", () => {
    expect(card).toContain("How anything is disposed of is decided by the laboratory's own rules and by local regulations: ask the laboratory's supervisor.")
    expect(card).not.toMatch(/sink|neutrali[sz]e it|waste (container|bottle|jar)|pour it/i)
  })
})
