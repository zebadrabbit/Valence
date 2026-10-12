import { describe, expect, it } from 'vitest'
import hazardManifest from '../../../docs/research/cations/sources/hazard-manifest.json'
import manifestFile from '../../../docs/research/cations/sources/MANIFEST.json'
import { findInstitutionText } from '../denylist'
import { termIndex, type PrimerParagraph } from '../primer'
import sources from '../sources.json'
import { cationsData } from './data'
import { CATIONS_PRIMER, READ_FIRST } from './primer'

const local = import.meta.glob<string[]>('../denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

const manifest: { sources: { id: string; url: string; supports: { fields: string[] }[] }[] } = manifestFile
const section = (id: string) => CATIONS_PRIMER.find((s) => s.id === id)!
const paragraphs = CATIONS_PRIMER.flatMap((s) => s.paragraphs.map((paragraph, i): [string, PrimerParagraph] => [`${s.id}[${i}]`, paragraph]))
const cited = new Set(paragraphs.flatMap(([, paragraph]) => paragraph.sourceIds))
const source = (id: string) => sources.find((s) => s.id === id)
const shown = (id: string) => section(id).paragraphs.map((p) => p.text).join(' ')
const all = CATIONS_PRIMER.map((s) => shown(s.id)).join(' ')
const labelled = (id: string, label: string) => section(id).paragraphs.find((p) => p.label === label)!
const words = (text: string) => text.split(/\s+/).length
const constant = (id: string) => cationsData.equilibria.find((e) => e.id === id)!.constant.shown

describe('the cations primer: its cards', () => {
  it('has the ten cards of spec 17.6, in order', () => {
    expect(CATIONS_PRIMER.map((s) => [s.id, s.heading])).toEqual([
      ['what', 'What qualitative analysis is'],
      ['solids', 'Solids from solutions'],
      ['chlorides', 'The three chlorides'],
      ['hot-water', 'Parting ions by a difference'],
      ['complex', 'Complex ions'],
      ['mercury', 'Mercury(I) and ammonia'],
      ['confirm', 'Confirming tests'],
      ['centrifuge', 'Centrifuging and pouring off'],
      ['chart', 'Reading the flow chart'],
      ['safety', 'Safety'],
    ])
  })

  it('gives every card at least three paragraphs with text, and no two cards one heading', () => {
    expect(new Set(CATIONS_PRIMER.map((s) => s.heading)).size).toBe(CATIONS_PRIMER.length)
    for (const s of CATIONS_PRIMER) {
      expect(s.paragraphs.length, s.id).toBeGreaterThan(2)
      for (const p of s.paragraphs) expect(p.text.trim().length, s.id).toBeGreaterThan(40)
    }
  })

  it('is short: no paragraph over 75 words, and no card but the safety card over 200', () => {
    for (const [where, p] of paragraphs) expect(words(p.text), where).toBeLessThanOrEqual(75)
    for (const s of CATIONS_PRIMER) expect(words(shown(s.id)), s.id).toBeLessThanOrEqual(s.id === 'safety' ? 380 : 200)
  })

  it('opens by saying how many cards there are and naming the four to read before the bench, by their headings, and no other', () => {
    const first = section('what').paragraphs[0]!.text
    expect(first).toContain('ten cards')
    expect(first).toContain('Read four of them')
    expect(first).toContain('The other six')
    expect(READ_FIRST).toEqual(['what', 'chlorides', 'centrifuge', 'safety'])
    expect(CATIONS_PRIMER.filter((s) => first.includes(s.heading)).map((s) => s.id).sort()).toEqual([...READ_FIRST].sort())
  })

  it('explains in the cards read first, as they are read, each word the bench leans on', () => {
    const read = READ_FIRST.map(shown).join(' ')
    for (const word of ['ions', 'reagent', 'solid', 'hydrochloric acid', 'mercury(I)', 'Hg₂²⁺', 'cloudy', 'suspension', 'centrifuge', 'poured', 'five steps', 'unknown']) expect(read, word).toContain(word)
  })

  it('holds no institution text in any heading or paragraph', () => {
    for (const s of CATIONS_PRIMER) {
      expect(findInstitutionText(s.heading, institutionNames), s.id).toBeNull()
      for (const p of s.paragraphs) expect(findInstitutionText(p.text, institutionNames), `${s.id}: ${p.label}`).toBeNull()
    }
  })
})

describe('the cations primer: how its text is drawn', () => {
  it('heads every paragraph with a label of one to four words, its own within the card', () => {
    for (const s of CATIONS_PRIMER) {
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
    expect(terms.map(([, term]) => term)).toEqual(['qualitative analysis', 'ions', 'precipitate', 'solubility product', 'complex ion', 'confirming test', 'suspension', 'centrifuge', 'flow chart'])
    for (const [where, term, text] of terms) {
      expect(term, where).toMatch(/^[\p{L} -]+$/u)
      expect(termIndex(text, term), `${where}: ${term}`).toBeGreaterThanOrEqual(0)
    }
    expect(new Set(terms.map(([, term]) => term.toLowerCase())).size).toBe(terms.length)
  })

  it("sets off only whole sentences of the paragraph that name the lab themselves, each a rule of the simulation's and not of a bench", () => {
    const rules = paragraphs.flatMap(([where, p]) => (p.labRules ?? []).map((rule) => [where, rule, p.text] as const))
    expect(rules.map(([where]) => where)).toEqual(['what[3]', 'hot-water[2]', 'centrifuge[3]', 'chart[1]', 'safety[4]'])
    for (const [where, rule, text] of rules) {
      expect(rule, where).toMatch(/^(In this lab|This lab) .*\.$|^This lab's own caution, .*\.$/)
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

describe('the cations primer: what each paragraph rests on', () => {
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
    expect(unsourced.map(([where]) => where)).toEqual(['what[0]', 'hot-water[2]', 'chart[1]', 'chart[2]', 'safety[0]'])
    for (const [where, p] of unsourced) for (const line of p.support.split('\n')) expect(line, where).toMatch(/^This lab: /)
  })

  it("lists in the manifest, with a primer row, exactly the sources of its own that the primer cites; the rest are documents of the hazard manifests", () => {
    const withRow = manifest.sources.filter((s) => s.supports.some((row) => row.fields.includes('primer'))).map((s) => s.id)
    const own = [...cited].filter((id) => manifest.sources.some((s) => s.id === id))
    // Every source of the lab's manifest that the primer cites is marked for it, or is one the record cites too.
    for (const id of withRow) expect(cited.has(id), id).toBe(true)
    for (const id of own) expect(withRow.includes(id) || JSON.stringify(cationsData).includes(`"${id}"`), id).toBe(true)
    expect(withRow.sort()).toEqual(['malik-centrifugation', 'malik-group-1-ions', 'malik-group-1-procedure', 'malik-group-1-separation', 'malik-ph-measurement', 'malik-precipitation', 'malik-separating-precipitate', 'malik-separation-in-groups', 'malik-solubility', 'malik-solubility-equilibria', 'malik-varying-solubility', 'malik-water-bath', 'smc-group-1-lab'])
    // The others are documents behind the hazards: under a bottle's tile, or read for the safety card and marked so.
    const ofReagents = new Set(cationsData.reagents.flatMap((r) => [r.hazards.sourceId, r.hazards.note.sourceId, ...(r.hazards.note.alsoSourceId ? [r.hazards.note.alsoSourceId] : []), ...(r.hazards.note.moreSourceIds ?? [])]))
    const forSafety = new Set(hazardManifest.sources.filter((s) => s.supports.some((row) => row.field === 'primer.safety')).map((s) => s.id))
    const others = [...cited].filter((one) => !own.includes(one))
    expect(others.length).toBeGreaterThan(20)
    for (const id of others) expect(ofReagents.has(id) || forSafety.has(id), id).toBe(true)
    // And the safety card cites every document that was read for it, so that none is listed for nothing.
    const safety = new Set(section('safety').paragraphs.flatMap((p) => p.sourceIds))
    for (const id of forSafety) expect(safety.has(id), id).toBe(true)
  })

  it('cites no page of OpenStax and no page of a secondary encyclopedia', () => {
    for (const id of cited) expect(`${id} ${source(id)!.url} ${source(id)!.citation}`).not.toMatch(/openstax|flowers-chem2e|wikipedia/i)
  })
})

describe('the cations primer: its figures are the record\'s', () => {
  it('gives the three solubility products and the formation constant as the record shows them', () => {
    const card = labelled('solids', 'Three numbers').text
    expect(card).toContain(`${constant('silver-chloride')} for silver chloride`)
    expect(card).toContain(`${constant('lead-chloride')} for lead chloride`)
    expect(card).toContain(`${constant('mercury-i-chloride')} for mercury(I) chloride`)
    expect(card).toContain('At 25 °C')
    expect(cationsData.parameters.temperatureKelvin.value).toBe(298.15)
    expect(labelled('complex', 'Silver and ammonia').text).toContain(`its formation constant, is ${constant('silver-ammonia-ion')}.`)
    // Lead chloride's is the largest by far.
    const value = (id: string) => cationsData.equilibria.find((e) => e.id === id)!.constant.value
    expect(value('lead-chloride') / value('silver-chloride')).toBeGreaterThan(10000)
  })

  it('gives the two solubilities of lead chloride as the record has them, and what the water of step 2 can hold', () => {
    const { solubilityCold: cold, solubilityHot: hot } = cationsData.leadChloride
    const card = labelled('hot-water', 'Lead chloride').text
    expect(card).toContain(`A litre of water at ${cold.celsius} °C holds ${cold.published} g of lead chloride. At ${hot.celsius} °C it holds ${hot.published} g, over three times as much.`)
    expect(hot.value / cold.value).toBeGreaterThan(3)
    // Hot, the 15 drops hold all 50 000 nmol; cold, 26 968 of them: about half.
    const p = cationsData.parameters
    const microlitres = p.waterDrops.value * p.dropMicrolitres.value
    const holds = (perMillilitre: number) => Math.floor((perMillilitre * microlitres) / 1000)
    const there = p.sampleDropsOfEach.value * p.dropMicrolitres.value * 0.1 * 1000
    expect(holds(cationsData.leadChloride.hot.value)).toBeGreaterThan(there)
    expect(Math.round((holds(cationsData.leadChloride.cold.value) / there) * 100)).toBe(54)
    expect(labelled('hot-water', 'Why hot').text).toContain('can hold all the lead chloride when it is hot, and only about half of it when it is cold')
  })
})

describe('the cations primer: what it has to say', () => {
  it('says what qualitative analysis is, and that the amounts are fixed', () => {
    expect(shown('what')).toContain('Finding out which ions a solution holds is called qualitative analysis. It does not ask how much of each there is.')
    expect(shown('what')).toContain('In this lab the amounts are fixed by the bench')
  })

  it('says each simplification of the model (spec 17.4)', () => {
    expect(shown('centrifuge')).toContain('A real bench washes each solid')
    expect(shown('centrifuge')).toContain('In this lab one pouring off is taken to be clean.')
    expect(shown('what')).toContain('you choose what to do and when, and not how much to add')
  })

  it('keeps mercury(I) apart from mercury(II): the ion of the group is mercury(I), and mercury(II) is named only to say that it is not, and in the name of what ammonia makes', () => {
    expect(shown('chlorides')).toContain("This lab's is mercury(I), written Hg₂²⁺")
    expect(shown('chlorides')).toContain('Chloride gives no solid with mercury(II), so it is no part of this group.')
    const mentions = [...all.matchAll(/[^.]*mercury\(II\)[^.]*\./g)].map((match) => match[0].trim())
    expect(mentions.length).toBeGreaterThan(3)
    for (const sentence of mentions) expect(sentence, sentence).toMatch(/mercury\(II\) amidochloride|compound of mercury\(II\)|The other is mercury\(II\)|no solid with mercury\(II\)/)
    // The bare word, where it stands, is the metal or the element, never an ion.
    expect(all).not.toMatch(/mercury ion|mercury chloride|mercury nitrate/i)
  })

  it('says what a yellow liquid is not, and why a clear liquid proves nothing before the liquid is acid', () => {
    expect(shown('confirm')).toContain('A yellow liquid is not a yellow solid.')
    expect(shown('confirm')).toContain('the liquid is coloured whether lead is there or not')
    expect(shown('confirm')).toContain('A clear liquid proves nothing until then.')
    expect(shown('confirm')).toContain('blue litmus turns red in acid')
  })

  it('says why pouring before the centrifuge parts nothing', () => {
    expect(shown('centrifuge')).toContain('Pour before the solid has been spun down and it goes over with the liquid')
  })

  it('says how the flow chart is filled in part 1 and used in part 2', () => {
    expect(shown('chart')).toContain('In this lab the chart is filled in part 1, a step at a time, from a set of tiles.')
    // Where the page has it: under each step of part 2, closed, and only once part 1 is done.
    expect(shown('chart')).toContain('Once part 1 is done, part 2 has the finished chart under each step, as a map to open.')
  })
})

describe('the cations primer: its safety card', () => {
  const card = shown('safety')

  it('says that a real bench of this lab holds lead, mercury, silver and chromate (spec 17)', () => {
    expect(card).toContain('A real bench of it holds lead, mercury, silver and chromate')
  })

  it('says of each bottle no more than its tile says, in words of its own', () => {
    const statements = (id: string) => cationsData.reagents.find((r) => r.id === id)!.hazards.statements.join(' ')
    expect(statements('hg2no32-0.1m')).toContain('H300+H310+H330')
    expect(statements('pbno32-0.1m')).toMatch(/H350.*H360/)
    expect(statements('agno3-0.1m')).toContain('H314')
    expect(statements('k2cro4-0.5m')).toMatch(/H340.*H350/)
    for (const id of ['hcl-6m', 'hno3-6m', 'nh3-6m']) expect(statements(id), id).toContain('H314')
    expect(card).toContain('Mercury(I) nitrate can kill if it is swallowed, breathed in or left on the skin.')
    expect(card).toContain('Potassium chromate may cause cancer and genetic defects.')
    // No hazard statement is copied out whole: the tiles show those.
    for (const reagent of cationsData.reagents) for (const statement of reagent.hazards.statements) expect(card, statement).not.toContain(statement.split(': ')[1]!)
  })

  it('says of ammonia with silver and with mercury only what the documents read say, and marks its caution as its own', () => {
    const text = labelled('safety', 'Ammonia with the metals').text
    expect(text).toContain("A supplier's sheet says that silver nitrate forms shock-sensitive compounds with ammonia, and a government record says that ammonia forms explosive compounds with silver and with mercury.")
    expect(text).toContain("This lab's own caution, which is no source's: on a real bench the tubes of steps 4 and 5 are not set aside or kept, and the laboratory's supervisor says what is done with them.")
    // Nothing of when such a solid forms, of the acid making it safe, or of compounds of mercury.
    expect(text).not.toMatch(/standing|dry|usual practice|promptly|removes|safe|mercury compounds|compounds of mercury/i)
    expect(labelled('safety', 'Ammonia with the metals').sourceIds).toEqual(['flinn-sds-691', 'noaa-cameo-1064', 'noaa-cameo-2434', 'noaa-cameo-4443', 'wards-sds-aa0273'])
  })

  it('gives no method of disposal, and sends the reader to the laboratory\'s supervisor', () => {
    expect(card).toContain("How it is disposed of is decided by the laboratory's own rules and by local regulations: ask the laboratory's supervisor.")
    expect(card).not.toMatch(/sink|neutrali[sz]e it|waste (container|bottle|jar)|pour it/i)
  })
})
