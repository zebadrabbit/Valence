import { describe, expect, it } from 'vitest'
import hazardManifest from '../../../docs/research/flame/sources/hazard-manifest.json'
import manifestFile from '../../../docs/research/flame/sources/MANIFEST.json'
import { findInstitutionText } from '../denylist'
import { termIndex, type PrimerParagraph } from '../primer'
import sources from '../sources.json'
import { brightestOf, flameData } from './data'
import { FLAME_PRIMER, READ_FIRST } from './primer'

const local = import.meta.glob<string[]>('../denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

const manifest: { sources: { id: string; supports: { fields: string[] }[] }[] } = manifestFile
const section = (id: string) => FLAME_PRIMER.find((s) => s.id === id)!
const paragraphs = FLAME_PRIMER.flatMap((s) => s.paragraphs.map((paragraph, i): [string, PrimerParagraph] => [`${s.id}[${i}]`, paragraph]))
const cited = new Set(paragraphs.flatMap(([, paragraph]) => paragraph.sourceIds))
const source = (id: string) => sources.find((s) => s.id === id)
const shown = (id: string) => section(id).paragraphs.map((p) => p.text).join(' ')
const all = FLAME_PRIMER.map((s) => shown(s.id)).join(' ')

describe('the flame primer: its cards', () => {
  it('has the six cards of spec 15.4, in order', () => {
    expect(FLAME_PRIMER.map((s) => [s.id, s.heading])).toEqual([
      ['flame-test', 'What a flame test is'],
      ['atoms', 'Light from atoms'],
      ['molecules', 'Molecules in a flame'],
      ['loop', 'The loop'],
      ['spectroscope', 'The spectroscope and its scale'],
      ['safety', 'Safety'],
    ])
  })

  it('gives every card at least two paragraphs with text, and no two cards one heading', () => {
    expect(new Set(FLAME_PRIMER.map((s) => s.heading)).size).toBe(FLAME_PRIMER.length)
    for (const s of FLAME_PRIMER) {
      expect(s.paragraphs.length, s.id).toBeGreaterThan(1)
      for (const p of s.paragraphs) expect(p.text.trim().length, s.id).toBeGreaterThan(40)
    }
  })

  it('opens by saying how many cards there are and naming the three to read before the bench, by their headings, and no other', () => {
    const first = section('flame-test').paragraphs[0]!.text
    expect(first).toContain('six cards')
    expect(first).toContain('Read three of them')
    expect(first).toContain('The other three')
    expect(READ_FIRST).toEqual(['flame-test', 'loop', 'spectroscope'])
    expect(FLAME_PRIMER.filter((s) => first.includes(s.heading)).map((s) => s.id)).toEqual(READ_FIRST)
  })

  it('explains in the cards read first, as they are read, each word the bench leans on', () => {
    const read = READ_FIRST.map(shown).join(' ')
    for (const word of ['chloride', 'loop', 'spectroscope', 'nm', 'sharp line', 'broad band', 'brightest', 'clean']) expect(read, word).toContain(word)
    // What a line and a band are is in the two cards that can wait, and the card on reading the strip says where.
    expect(shown('spectroscope')).toContain('Two kinds of thing show on the strip')
    expect(section('spectroscope').paragraphs[3]!.support).toContain('Light from atoms and Molecules in a flame')
  })

  it('holds no institution text in any heading or paragraph', () => {
    for (const s of FLAME_PRIMER) {
      expect(findInstitutionText(s.heading, institutionNames), s.id).toBeNull()
      for (const p of s.paragraphs) expect(findInstitutionText(p.text, institutionNames), `${s.id}: ${p.label}`).toBeNull()
    }
  })
})

describe('the flame primer: how its text is drawn', () => {
  it('heads every paragraph with a label of one to four words, its own within the card', () => {
    for (const s of FLAME_PRIMER) {
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
    expect(terms.map(([, term]) => term)).toEqual(['flame test', 'chloride', 'energy level', 'wavelength', 'line', 'molecule', 'band', 'cobalt glass', 'spectroscope', 'nanometre'])
    for (const [where, term, text] of terms) {
      expect(term, where).toMatch(/^[\p{L} -]+$/u)
      expect(termIndex(text, term), `${where}: ${term}`).toBeGreaterThanOrEqual(0)
    }
    expect(new Set(terms.map(([, term]) => term.toLowerCase())).size).toBe(terms.length)
  })

  it("sets off only whole sentences of the paragraph that name the lab themselves, each a rule of the simulation's and not of a bench", () => {
    const rules = paragraphs.flatMap(([where, p]) => (p.labRules ?? []).map((rule) => [where, rule, p.text] as const))
    expect(rules.map(([where]) => where)).toEqual(['flame-test[3]', 'molecules[4]', 'loop[1]', 'loop[2]', 'loop[3]', 'loop[4]', 'spectroscope[4]', 'spectroscope[5]'])
    for (const [where, rule, text] of rules) {
      expect(rule, where).toMatch(/^(In this lab|This lab) .*\.$/)
      // A whole sentence: it starts the text or follows a full stop, and ends the text or is followed by a space and a capital.
      const at = text.indexOf(rule)
      expect(at, where).toBeGreaterThanOrEqual(0)
      expect(at === 0 || text.slice(at - 2, at) === '. ', where).toBe(true)
      expect(text.slice(at + rule.length), where).toMatch(/^$|^ [A-Z]/)
    }
  })
})

describe('the flame primer: what each paragraph rests on', () => {
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
    expect(unsourced.map(([where]) => where)).toEqual(['flame-test[0]', 'flame-test[3]', 'flame-test[4]', 'molecules[3]', 'molecules[4]', 'loop[3]', 'loop[6]', 'spectroscope[3]', 'spectroscope[4]', 'spectroscope[5]', 'safety[0]', 'safety[2]'])
    for (const [where, p] of unsourced) for (const line of p.support.split('\n')) expect(line, where).toMatch(/^This lab: /)
  })

  it("lists in the manifest, with a primer row, exactly the sources of its own that the primer cites; the rest are documents that a bottle's hazards cite", () => {
    const withRow = manifest.sources.filter((s) => s.supports.some((row) => row.fields.includes('primer'))).map((s) => s.id)
    const own = [...cited].filter((id) => withRow.includes(id))
    expect([...own].sort()).toEqual([...withRow].sort())
    const ofBottles = new Set(flameData.salts.flatMap((s) => [s.hazards.sourceId, s.hazards.note.sourceId, ...(s.hazards.note.alsoSourceId ? [s.hazards.note.alsoSourceId] : []), ...(s.hazards.note.moreSourceIds ?? [])]))
    for (const id of [...cited].filter((one) => !own.includes(one))) {
      expect(hazardManifest.sources.some((s) => s.id === id), id).toBe(true)
      expect(ofBottles.has(id), id).toBe(true)
    }
  })

  it('cites no page of OpenStax', () => {
    for (const id of cited) expect(`${id} ${source(id)!.url} ${source(id)!.citation}`).not.toMatch(/openstax|flowers-chem2e/i)
  })
})

describe('the flame primer: what it has to say', () => {
  it('names the six metals of the bench as the record has them, and says that every bottle holds a chloride', () => {
    const bottles = section('flame-test').paragraphs[2]!.text
    expect(bottles).toContain(`${flameData.salts.map((s) => s.metal.name).slice(0, -1).join(', ')} and ${flameData.salts.at(-1)!.metal.name}`)
    expect(bottles).toContain('Each of the six bottles on this bench holds a chloride dissolved in water')
    for (const s of flameData.salts) expect(s.name, s.id).toMatch(/chloride solution/)
  })

  it('says what the three questions are, in the order the station asks them, and that there is no unknown', () => {
    expect(shown('flame-test')).toContain("the colour of the flame, where on the spectroscope's scale the brightest thing is, and whether that brightest thing is a sharp line or a broad band")
    expect(shown('flame-test')).toContain('there is no unknown to identify')
  })

  it('asks the closing question and does not answer it', () => {
    expect(shown('flame-test')).toContain('what is it that gives each flame its colour?')
    expect(all).not.toMatch(/it is the metal that gives|the metal gives each flame|because of the metal/i)
  })

  it('says that a fall between two levels gives one wavelength, a line, and that a molecule gives a band', () => {
    expect(shown('atoms')).toContain('A fall from one level to another gives light of one wavelength only')
    expect(shown('atoms')).toContain('shows as a thin bright line')
    expect(shown('molecules')).toContain('In a spectroscope they show as a band')
  })

  it('names the four metals whose flame is mostly a molecule\'s light and the two whose flame is the atom\'s, as the record ranks them', () => {
    const molecular = flameData.salts.filter((s) => brightestOf(s).emitter.kind === 'molecule').map((s) => s.metal.name)
    const atomic = flameData.salts.filter((s) => brightestOf(s).emitter.kind === 'atom').map((s) => s.metal.name)
    expect([...molecular].sort()).toEqual(['barium', 'calcium', 'copper', 'strontium'])
    expect(shown('molecules')).toContain('For four of the six metals on this bench, most of the light of the flame comes from such molecules and not from the atoms of the metal: calcium, strontium, barium and copper.')
    expect(atomic).toEqual(['potassium', 'sodium'])
    expect(shown('atoms')).toContain('For two of the six metals on this bench, sodium and potassium')
    // Every molecule the record gives a band to is written on the card, and no other formula is.
    const formulas = [...new Set(flameData.salts.flatMap((s) => s.features.flatMap((f) => (f.emitter.kind === 'molecule' ? [f.emitter.formula] : []))))]
    expect([...formulas].sort()).toEqual(['BaOH', 'CaOH', 'CuCl', 'CuOH', 'SrOH'])
    for (const formula of formulas) expect(shown('molecules'), formula).toContain(formula)
    expect(shown('molecules')).toContain('This is why the colour of a flame is not simply the colour of the strongest lines of the metal\'s atom.')
    expect(shown('molecules')).toContain('The periodic table in this app shows, on the card of each element, lines of that element\'s atoms.')
  })

  it('gives away no station: no wavelength of a stored feature, no answer range, and no flame colour but sodium\'s yellow', () => {
    const numbers = (all.match(/\d+(\.\d+)?(?= nm)/g) ?? []).map(Number)
    // The ends of the scale and of what an eye sees, and nothing else.
    expect([...new Set(numbers)].sort((a, b) => a - b)).toEqual([380, 400, 700, 780])
    for (const s of flameData.salts) {
      if (s.metal.name === 'sodium') continue
      // Lithium's red is the example, and lithium is on no station: so red may be said, of lithium alone.
      for (const word of s.flame.value.name === 'red' ? [] : [s.flame.value.name]) expect(all, word).not.toContain(word)
      expect(all).not.toMatch(new RegExp(`${s.metal.name}[^.]{0,40} turns (it|the flame)`))
    }
    expect(all).toContain('A compound of lithium turns the flame red; a compound of sodium turns it yellow.')
    expect(flameData.salts.some((s) => s.metal.name === 'lithium')).toBe(false)
  })

  it('says how the loop is cleaned, with no acid, and what an unclean one costs', () => {
    const loop = shown('loop')
    expect(loop).toContain('rinsed in distilled water, then held in the flame until the flame shows no colour at all')
    expect(loop).toContain('an observation made with a loop that was not clean does not count, whatever was recorded')
    expect(loop).toContain('The spectroscope then shows the lines and bands of both')
    expect(loop).toContain('In Guided mode the lab warns you before you dip a loop that is not clean, and lets you go on if you choose.')
  })

  it('says of hydrochloric acid that other benches use it, gives the reason only as the sources give it, and says that this lab has none', () => {
    const [, , other] = section('loop').paragraphs
    expect(other!.label).toBe('At other benches')
    expect(other!.text).toContain('Many laboratories dip the loop in hydrochloric acid before they heat it clean.')
    expect(other!.text).toContain('the acid turns a salt into its chloride, and chlorides are the salts a flame carries off most readily')
    expect(other!.text).toContain('All six solutions here are chlorides already, so rinsing the loop in distilled water and burning it clean is enough for them.')
    expect(other!.text).toMatch(/That is how other benches work\. This lab has no acid bottle, and nothing in it asks for one\.$/)
    // The reason is given for the salt, which is what the sources give it for, and the support line says so.
    expect(other!.text).not.toMatch(/because/)
    expect(other!.support).toContain('none of the four says why the acid is used to clean the wire')
    expect(other!.sourceIds).toEqual(['nasa-flame-test-worksheet', 'chemguide-flame-tests', 'malik-flame-test', 'gallitto-2017-bunsen-burner'])
    // Hydrochloric acid is on no card but this one, and no bottle of the record is an acid.
    for (const s of FLAME_PRIMER) for (const [i, p] of s.paragraphs.entries()) if (!(s.id === 'loop' && i === 2)) expect(p.text, `${s.id}[${i}]`).not.toMatch(/acid/i)
    expect(flameData.salts.some((s) => /acid/i.test(s.name))).toBe(false)
  })

  it('says that sodium is everywhere and hides other colours, that the trace is made large enough to show, and what cobalt glass is for, in the card on the loop', () => {
    const loop = shown('loop')
    expect(loop).toContain('a loop that has only been handled carries a trace of it')
    expect(loop).toContain("sodium's yellow is strong enough to hide the colour of another salt in the same flame")
    expect(loop).toContain('In this lab the trace on a handled loop is made larger than a real one, so that it always shows.')
    expect(flameData.parameters.handlingTraceShows.value).toBe(true)
    expect(flameData.masking.value).toBe('nacl-0.1m')
    const glass = section('loop').paragraphs.filter((p) => /cobalt glass/.test(p.text))
    expect(glass.length).toBe(1)
    expect(glass[0]!.text).toContain("a blue glass that holds back sodium's yellow")
    expect(glass[0]!.text).toContain('This lab has no cobalt glass')
    for (const s of FLAME_PRIMER.filter((one) => one.id !== 'loop')) expect(shown(s.id), s.id).not.toMatch(/cobalt/i)
  })

  it('gives the scale as the record has it, and says that brightness is the instruments\' and not the eye\'s', () => {
    const card = shown('spectroscope')
    expect(card).toContain(`runs from ${flameData.scale.fromNm} nm, at the violet end, to ${flameData.scale.toNm} nm, in the deep red`)
    expect(card).toContain('A nanometre is a millionth of a millimetre.')
    expect(card).toContain('Look at every line and band before you answer: those two questions open only when you have')
    expect(card).toContain('which is not always what an eye would find the brightest')
    expect(card).toContain('says that its limits are not given')
  })

  describe('the safety card', () => {
    const card = () => section('safety')
    const sheets: { id: string; supports: { field: string; prints: string; where: string }[] }[] = hazardManifest.sources
    const statements = (saltId: string) => flameData.salts.find((s) => s.id === saltId)!.hazards.statements

    it('says first that the lab is a simulation and does not take the place of safety training, then the burner', () => {
      expect(card().paragraphs.map((p) => p.label)).toEqual(['On a screen', 'The burner', 'On each bottle', 'The ones to respect', 'What to wear', 'Afterwards'])
      expect(card().paragraphs[0]!.text).toContain('It does not take the place of the safety training of a laboratory.')
      expect(card().paragraphs[1]!.text).toContain('A lit burner is never left alone.')
      expect(card().paragraphs[1]!.sourceIds).toEqual(['wpi-bunsen-burner-safety'])
    })

    it('says of the salts only what the statements on their bottles say, each from the sheet the bottle cites for them', () => {
      const [, , , salts] = card().paragraphs
      expect(statements('bacl2-0.1m')).toContain('H301: Toxic if swallowed')
      expect(salts!.text).toContain('Barium chloride asks for the most care: as a solid it is toxic if swallowed.')
      expect(statements('cucl2-0.1m')).toEqual(['H302: Harmful if swallowed', 'H314: Causes severe skin burns and eye damage'])
      expect(salts!.text).toContain('Solid copper(II) chloride is harmful if swallowed and burns skin and eyes')
      expect(statements('srcl2-0.1m')).toEqual(['H318: Causes serious eye damage'])
      expect(salts!.text).toContain('Solid strontium chloride can do serious damage to the eyes.')
      // The three with lesser warnings: no statement of theirs is of a kind the card gives the other three.
      for (const id of ['cacl2-0.1m', 'kcl-0.1m', 'nacl-0.1m']) for (const statement of statements(id)) expect(statement, id).not.toMatch(/^H(301|314|318)/)
      expect(salts!.text).toContain('Calcium chloride, potassium chloride and sodium chloride carry lesser warnings.')
      // Each solid's sheet is the one its bottle's statements cite.
      const solids = flameData.salts.map((s) => s.hazards.sourceId)
      expect(salts!.sourceIds.filter((id) => id !== 'wards-sds-cc0506').sort()).toEqual([...solids].sort())
      // What is said of life in water is a statement that the second supplier's sheet for the solution prints, by the hazard manifest's row.
      const second = sheets.find((s) => s.id === 'wards-sds-cc0506')!
      expect(flameData.salts[2]!.hazards.note.alsoSourceId).toBe('wards-sds-cc0506')
      expect(second.supports.some((row) => row.field === 'cucl2-0.1m.hazards.note' && row.prints.startsWith('H410: Very toxic to aquatic life'))).toBe(true)
    })

    it("says what every solution's sheet calls for, as the hazard manifest's rows have it for each of the six", () => {
      const wear = card().paragraphs[4]!
      const solutions = flameData.salts.map((s) => s.hazards.note.sourceId)
      expect(wear.sourceIds).toEqual(solutions)
      for (const [i, id] of solutions.entries()) {
        const rows = sheets.find((s) => s.id === id)!.supports.filter((row) => row.field === `${flameData.salts[i]!.id}.hazards.note` && row.prints.startsWith('SECTION 8'))
        expect(rows.length, id).toBe(1)
        expect(rows[0]!.where, id).toContain('eye protection, gloves and protective clothing')
      }
      expect(wear.text).toContain('eye protection, gloves and protective clothing')
    })

    it("keeps the solutions of barium and of copper out of drains and waterways, names no other for that, and leaves disposal to the laboratory's own rules and local regulations", () => {
      const after = card().paragraphs[5]!
      expect(after.text).toBe("The solutions of barium chloride and of copper(II) chloride are kept out of drains and waterways. How anything from the bench is disposed of is decided by the laboratory's own rules and by local regulations: ask the laboratory's supervisor.")
      // Every document under it is one that the note of the barium bottle or of the copper bottle rests on.
      const under = (saltId: string) => {
        const { note } = flameData.salts.find((s) => s.id === saltId)!.hazards
        return [note.sourceId, note.alsoSourceId, ...(note.moreSourceIds ?? [])]
      }
      for (const id of after.sourceIds) expect([...under('bacl2-0.1m'), ...under('cucl2-0.1m')], id).toContain(id)
      // No card gives a method of disposal.
      expect(all).not.toMatch(/pour|sink|neutrali[sz]e|waste (container|bottle|jar)|flush (it|them) (down|away)/i)
    })
  })
})
