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
  it('has the ten cards, in order', () => {
    expect(AQUEOUS_PRIMER.map((s) => [s.id, s.heading])).toEqual([
      ['ions', 'Ions in solution'],
      ['solubility', 'Solubility and the solubility table'],
      ['precipitates', 'Precipitates'],
      ['equations', 'The three forms of an equation'],
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

  it('opens by saying how many cards there are and naming the four to read before the bench, by their headings, and no other', () => {
    const first = section('ions').paragraphs[0]!.text
    expect(first).toContain('ten cards')
    expect(first).toContain('Read four of them')
    expect(first).toContain('The other six')
    expect(AQUEOUS_PRIMER.filter((s) => first.includes(s.heading)).map((s) => s.id)).toEqual(['ions', 'solubility', 'equations', 'observing'])
    expect(READ_FIRST).toEqual(['ions', 'solubility', 'equations', 'observing'])
  })

  it('explains in the cards read first, as they are read, each word the equations and the tools lean on', () => {
    const read = READ_FIRST.map(shown)
    const upTo = (n: number) => read.slice(0, n + 1).join(' ')
    for (const [word, card] of [['ion', 0], ['(aq)', 0], ['strong electrolyte', 0], ['H⁺', 0], ['insoluble', 1], ['spectator', 2], ['coefficient', 2], ['wafting', 3], ['litmus', 3], ['splint', 3]] as const) {
      expect(upTo(card), word).toContain(word)
    }
    // The equations card uses "precipitate", which the card before it in the primer defines but which is not read first:
    // it says what one is where the word first stands in the cards read first, and not only in passing further down.
    const all = read.join(' ')
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
    expect(rules.map(([where]) => where)).toEqual(['equations[4]', 'equations[5]', 'signs[5]', 'no-reaction[1]', 'observing[1]', 'observing[3]'])
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
    expect(unsourced.map(([where]) => where)).toEqual(['ions[0]', 'spectators[1]', 'signs[0]', 'no-reaction[1]', 'observing[0]', 'safety[0]'])
    for (const [where, p] of unsourced) for (const line of p.support.split('\n')) expect(line, where).toMatch(/^This lab: /)
  })

  it('lists in the manifest, with a primer row, exactly the sources of its own that the primer cites; the rest are safety data sheets that a reagent\'s hazards cite', () => {
    const withRow = manifest.sources.filter((s) => s.supports.some((row) => row.fields.includes('primer'))).map((s) => s.id)
    const own = [...cited].filter((id) => manifest.sources.some((s) => s.id === id))
    expect([...own].sort()).toEqual([...withRow].sort())
    const ofReagents = new Set(aqueousData.reagents.flatMap((r) => [r.hazards.sourceId, r.hazards.note.sourceId, ...(r.hazards.note.alsoSourceId ? [r.hazards.note.alsoSourceId] : [])]))
    const rest = [...cited].filter((id) => !own.includes(id))
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

  it('works its example in three equations that each balance in atoms and in charge, the net one being the complete one less its spectators', () => {
    const equations = section('equations').paragraphs.flatMap((p) => (p.equation ? [p.equation] : []))
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
    const [left, right] = equations[1]!.split(' → ').map((s) => s.split(' + '))
    const spectators = left!.filter((term) => right!.includes(term))
    expect(spectators).toEqual(['2NO₃⁻(aq)', '2K⁺(aq)'])
    expect(`${left!.filter((t) => !spectators.includes(t)).join(' + ')} → ${right!.filter((t) => !spectators.includes(t)).join(' + ')}`).toBe(equations[2])
    expect(shown('spectators')).toContain('K⁺ and NO₃⁻ are the spectators')
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
