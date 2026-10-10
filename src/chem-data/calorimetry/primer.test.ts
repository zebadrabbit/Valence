import { describe, expect, it } from 'vitest'
import hazardManifest from '../../../docs/research/calorimetry/sources/hazard-manifest.json'
import manifestFile from '../../../docs/research/calorimetry/sources/MANIFEST.json'
import { findInstitutionText } from '../denylist'
import { termIndex, type PrimerParagraph } from '../primer'
import sources from '../sources.json'
import { calorimetryData, candidatesOf } from './data'
import { CALORIMETRY_PRIMER, READ_FIRST } from './primer'

const local = import.meta.glob<string[]>('../denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

const manifest: { sources: { id: string; url: string; supports: { fields: string[] }[] }[] } = manifestFile
const section = (id: string) => CALORIMETRY_PRIMER.find((s) => s.id === id)!
const paragraphs = CALORIMETRY_PRIMER.flatMap((s) => s.paragraphs.map((paragraph, i): [string, PrimerParagraph] => [`${s.id}[${i}]`, paragraph]))
const cited = new Set(paragraphs.flatMap(([, paragraph]) => paragraph.sourceIds))
const source = (id: string) => sources.find((s) => s.id === id)
const shown = (id: string) => section(id).paragraphs.map((p) => p.text).join(' ')
const all = CALORIMETRY_PRIMER.map((s) => shown(s.id)).join(' ')
const labelled = (id: string, label: string) => section(id).paragraphs.find((p) => p.label === label)!
const [neutralisation, dissolving] = calorimetryData.parts
const parameters = calorimetryData.parameters

describe('the calorimetry primer: its cards', () => {
  it('has the eight cards of spec 16.5, in order', () => {
    expect(CALORIMETRY_PRIMER.map((s) => [s.id, s.heading])).toEqual([
      ['heat', 'Temperature and heat'],
      ['sign', 'Giving out heat and taking it in'],
      ['specific-heat', 'Specific heat'],
      ['calorimeter', 'The calorimeter and what it assumes'],
      ['graph', 'Reading the graph'],
      ['per-mole', 'From heat to heat for each mole'],
      ['metal', "A metal's specific heat"],
      ['safety', 'Safety'],
    ])
  })

  it('gives every card at least two paragraphs with text, and no two cards one heading', () => {
    expect(new Set(CALORIMETRY_PRIMER.map((s) => s.heading)).size).toBe(CALORIMETRY_PRIMER.length)
    for (const s of CALORIMETRY_PRIMER) {
      expect(s.paragraphs.length, s.id).toBeGreaterThan(1)
      for (const p of s.paragraphs) expect(p.text.trim().length, s.id).toBeGreaterThan(40)
    }
  })

  it('opens by saying how many cards there are and naming the four to read before the bench, by their headings, and no other', () => {
    const first = section('heat').paragraphs[0]!.text
    expect(first).toContain('eight cards')
    expect(first).toContain('Read four of them')
    expect(first).toContain('The other four')
    expect(READ_FIRST).toEqual(['heat', 'specific-heat', 'calorimeter', 'graph'])
    expect(CALORIMETRY_PRIMER.filter((s) => first.includes(s.heading)).map((s) => s.id)).toEqual(READ_FIRST)
  })

  it('explains in the cards read first, as they are read, each word the bench leans on', () => {
    const read = READ_FIRST.map(shown).join(' ')
    for (const word of ['°C', 'joule', 'specific heat', 'J/(g·°C)', '4.18', 'three significant figures', 'calorimeter', 'lid', 'stirrer', 'probe', 'logger', 'every 15 seconds', 'highest or a lowest', 'turn back']) expect(read, word).toContain(word)
    expect(parameters.loggerStepSeconds.value).toBe(15)
    expect(calorimetryData.water.specificHeat.value).toBe(4.18)
  })

  it('holds no institution text in any heading or paragraph', () => {
    for (const s of CALORIMETRY_PRIMER) {
      expect(findInstitutionText(s.heading, institutionNames), s.id).toBeNull()
      for (const p of s.paragraphs) {
        expect(findInstitutionText(p.text, institutionNames), `${s.id}: ${p.label}`).toBeNull()
        if (p.equation) expect(findInstitutionText(p.equation, institutionNames), `${s.id}: ${p.label}`).toBeNull()
      }
    }
  })
})

describe('the calorimetry primer: how its text is drawn', () => {
  it('heads every paragraph with a label of one to four words, its own within the card', () => {
    for (const s of CALORIMETRY_PRIMER) {
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
    expect(terms.map(([, term]) => term)).toEqual(['temperature', 'heat', 'joule', 'exothermic', 'endothermic', 'sign', 'specific heat', 'significant figures', 'calorimeter', 'calorimeter constant', 'mole', 'concentration', 'molar mass'])
    for (const [where, term, text] of terms) {
      expect(term, where).toMatch(/^[\p{L} -]+$/u)
      expect(termIndex(text, term), `${where}: ${term}`).toBeGreaterThanOrEqual(0)
    }
    expect(new Set(terms.map(([, term]) => term.toLowerCase())).size).toBe(terms.length)
  })

  it("sets off only whole sentences of the paragraph that name the lab themselves, each a rule of the simulation's and not of a bench", () => {
    const rules = paragraphs.flatMap(([where, p]) => (p.labRules ?? []).map((rule) => [where, rule, p.text] as const))
    expect(rules.map(([where]) => where)).toEqual(['heat[4]', 'sign[3]', 'specific-heat[4]', 'calorimeter[2]', 'calorimeter[4]', 'graph[3]', 'graph[5]', 'metal[5]'])
    for (const [where, rule, text] of rules) {
      expect(rule, where).toMatch(/^(In this lab|This lab) .*\.$/)
      // A whole sentence: it starts the text or follows a full stop, and ends the text or is followed by a space and a capital.
      const at = text.indexOf(rule)
      expect(at, where).toBeGreaterThanOrEqual(0)
      expect(at === 0 || text.slice(at - 2, at) === '. ', where).toBe(true)
      expect(text.slice(at + rule.length), where).toMatch(/^$|^ [A-Z]/)
    }
  })

  it('shows a relation under the three paragraphs that state one, and nowhere else', () => {
    expect(paragraphs.filter(([, p]) => p.equation !== undefined).map(([where, p]) => [where, p.equation])).toEqual([
      ['specific-heat[2]', 'heat = mass × specific heat × change in temperature'],
      ['per-mole[3]', 'heat for each mole = heat ÷ moles'],
      ['metal[2]', "specific heat of the metal = heat the water took in ÷ (mass of the metal × the metal's fall in temperature)"],
    ])
  })
})

describe('the calorimetry primer: what each paragraph rests on', () => {
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
    expect(unsourced.map(([where]) => where)).toEqual(['heat[0]', 'heat[4]', 'sign[3]', 'specific-heat[3]', 'specific-heat[4]', 'calorimeter[2]', 'calorimeter[4]', 'graph[0]', 'graph[3]', 'per-mole[4]', 'metal[3]', 'safety[0]', 'safety[1]', 'safety[8]'])
    for (const [where, p] of unsourced) for (const line of p.support.split('\n')) expect(line, where).toMatch(/^This lab: /)
  })

  it("lists in the manifest, with a primer row, exactly the sources of its own that the primer cites; the rest are documents that a reagent's hazards cite", () => {
    const withRow = manifest.sources.filter((s) => s.supports.some((row) => row.fields.includes('primer'))).map((s) => s.id)
    const own = [...cited].filter((id) => withRow.includes(id))
    expect([...own].sort()).toEqual([...withRow].sort())
    const ofReagents = new Set(calorimetryData.reagents.flatMap((r) => [r.hazards.sourceId, r.hazards.note.sourceId, ...(r.hazards.note.alsoSourceId ? [r.hazards.note.alsoSourceId] : []), ...(r.hazards.note.moreSourceIds ?? [])]))
    const others = [...cited].filter((one) => !own.includes(one))
    expect(others.length).toBeGreaterThan(10)
    for (const id of others) expect(ofReagents.has(id), id).toBe(true)
  })

  it('cites no page of OpenStax', () => {
    for (const id of cited) expect(`${id} ${source(id)!.url} ${source(id)!.citation}`).not.toMatch(/openstax|flowers-chem2e/i)
  })
})

describe('the calorimetry primer: its worked examples', () => {
  const three = (x: number) => Number(x.toPrecision(3))

  it('works the heat of 80.0 g of water warming by 3.5 °C', () => {
    const text = labelled('specific-heat', 'A worked example').text
    expect(text).toContain('24.8 − 21.3 = 3.5 °C')
    expect(Number((24.8 - 21.3).toFixed(1))).toBe(3.5)
    expect(text).toContain('80.0 g × 4.18 J/(g·°C) × 3.5 °C = 1170.4 J, which is 1170 J to three significant figures')
    expect(Number((80.0 * 4.18 * 3.5).toFixed(1))).toBe(1170.4)
    expect(three(1170.4)).toBe(1170)
    expect(shown('specific-heat')).toContain('That makes 1170.4 into 1170, and it would make 1176 into 1180, not 1170.')
    expect(three(1176)).toBe(1180)
  })

  it('works the moles in a volume of solution, and an acid with a base to a heat for each mole with a minus sign', () => {
    expect(labelled('per-mole', 'Moles from a solution').text).toContain('So 40.0 mL of a 0.500 M solution, which is 0.0400 L, holds 0.0400 × 0.500 = 0.0200 mol.')
    expect(three(0.04 * 0.5)).toBe(0.02)
    const text = labelled('per-mole', 'Acid and base').text
    expect(text).toContain('80.0 × 4.18 × 3.5 = 1170 J')
    expect(text).toContain('1170 J ÷ 0.0200 mol = 58 500 J/mol, which is 58.5 kJ/mol')
    expect(three(1170 / 0.02)).toBe(58500)
    // The unrounded chain gives the same three figures.
    expect(three((80.0 * 4.18 * 3.5) / 0.02 / 1000)).toBe(58.5)
    expect(text).toMatch(/the reaction gave heat out, and the answer is written −58\.5 kJ\/mol\.$/)
  })

  it('works a salt dissolving, with the salt in the mass that cooled, to a heat for each mole with a plus sign', () => {
    const text = labelled('per-mole', 'A salt dissolving').text
    expect(text).toContain('The mass that cooled is the water and the salt together, 52.5 g')
    expect(text).toContain('52.5 × 4.18 × 3.2 = 702 J')
    expect(three((50.0 + 2.5) * 4.18 * 3.2)).toBe(702)
    expect(text).toContain('2.50 ÷ 53.49 = 0.0467 mol')
    expect(three(2.5 / 53.49)).toBe(0.0467)
    expect(text).toContain('702 J ÷ 0.0467 mol = 15 000 J/mol, which is 15.0 kJ/mol')
    expect(three(702 / 0.0467)).toBe(15000)
    expect(three((52.5 * 4.18 * 3.2) / (2.5 / 53.49) / 1000)).toBe(15)
    expect(text).toMatch(/the dissolving took heat in, and the answer is written \+15\.0 kJ\/mol\.$/)
  })

  it("works a metal's specific heat, to a figure that is none of the four", () => {
    const text = labelled('metal', 'A worked example').text
    expect(text).toContain('50.0 × 4.18 × 2.8 = 585 J')
    expect(three(50.0 * 4.18 * 2.8)).toBe(585)
    expect(text).toContain('99.5 − 23.8 = 75.7 °C')
    expect(text).toContain('585 ÷ (60.0 × 75.7) = 0.129 J/(g·°C)')
    expect(three(585 / (60.0 * 75.7))).toBe(0.129)
    expect(three((50.0 * 4.18 * 2.8) / (60.0 * 75.7))).toBe(0.129)
    // The water would rise by 2.8 °C with such a piece: the example hangs together.
    const [metal, water] = [60.0 * 0.129, 50.0 * 4.18]
    expect(Number(((metal * (99.5 - 21.0)) / (metal + water)).toFixed(1))).toBe(2.8)
    const heats = candidatesOf(calorimetryData).map((c) => c.specificHeat.value)
    for (const heat of heats) expect(Math.abs(heat - 0.129) / heat, String(heat)).toBeGreaterThan(0.4)
  })

  it("uses no run's numbers: not the bench's volumes or strength, not a mass or a temperature a run can have, and no figure a run is held to", () => {
    // The moles of part 1, and the stored and the dilute figure of each enthalpy.
    for (const figure of ['0.0500', '50.0 mL', '1.00 M', ...[neutralisation.enthalpy, dissolving.enthalpy].flatMap((e) => [Math.abs(e.value).toPrecision(3), Math.abs(e.infiniteDilution.value).toPrecision(3)])]) {
      const where = CALORIMETRY_PRIMER.filter((s) => s.id !== 'safety' && shown(s.id).includes(figure)).map((s) => s.id)
      expect(where, figure).toEqual([])
    }
    // The safety card names the strength of the two solutions, which the bottles print.
    expect(shown('safety')).toContain('are each 1.00 M')
    for (const c of candidatesOf(calorimetryData)) expect(all, c.id).not.toContain(c.specificHeat.value.toFixed(3))
    // A salt of 2.50 g, a piece of 60.0 g, and starts of 21.3 and 21.0 °C beside ranges of 3.80 to 4.20 g, 48 to 52 g; the temperatures are a run's to have, the changes are not.
    expect(parameters.saltRangeCg.value[0]).toBeGreaterThan(250)
    expect(parameters.metalRangeCg.value[1]).toBeLessThan(6000)
  })
})

describe('the calorimetry primer: what it has to say', () => {
  it('says what temperature and heat are, and that they are not the same thing', () => {
    expect(shown('heat')).toContain('The temperature of a thing says how hot or how cold it is.')
    expect(shown('heat')).toContain('heat: energy on its way from the hotter thing to the colder')
    expect(shown('heat')).toContain('The two are not the same thing.')
    expect(shown('heat')).toContain('you read temperatures from a logger, and you work the heat out')
  })

  it('says which changes give heat out and which take it in, what the logger shows for each, and what the sign says', () => {
    const card = shown('sign')
    expect(card).toContain('A change that gives out heat is called exothermic.')
    expect(card).toContain('a change that takes heat in is called endothermic')
    expect(card).toContain('a rise on the logger means an exothermic change, and a fall means an endothermic one')
    expect(card).toContain('its heat is written with a minus sign in front')
    expect(card).toContain('its heat is written with a plus sign')
    expect(card).toContain('a minus for heat given out, and a plus or no sign for heat taken in')
    expect(neutralisation.enthalpy.value).toBeLessThan(0)
    expect(dissolving.enthalpy.value).toBeGreaterThan(0)
  })

  it('gives the relation between heat, mass, specific heat and change in temperature, and the rounding convention', () => {
    const card = shown('specific-heat')
    expect(card).toContain('Heat is mass times specific heat times the change in temperature.')
    expect(card).toContain('For water the figure is 4.18 J/(g·°C)')
    expect(card).toContain('a temperature is typed to 0.1 °C, and every number you work out is typed to three significant figures, rounded and not cut off')
    expect(card).toContain('You may work an entry from the rounded entries above it or from the unrounded numbers still on your calculator: the lab takes both.')
  })

  it('says what the cup is, why the lid and the stirrer matter, what makes a run count, and what is assumed', () => {
    const card = shown('calorimeter')
    expect(card).toContain('two foam cups, one inside the other, with a lid')
    expect(card).toContain('a run counts only if the lid was on and the stirrer going from the moment the change was started')
    expect(card).toContain(`Its result must also come within ${parameters.tolerancePercent.value}% of the figure the lab holds for that part.`)
    expect(card).toContain('In Guided mode the lab warns you first if the lid or the stirrer is missing, and lets you go on if you choose.')
    expect(card).toContain('First, that no heat passes between the cup and the room. Second, that the cup, the lid, the stirrer and the probe take up no heat themselves. Third, that what is in the cup behaves like water')
    expect(card).toContain('a millilitre of a solution weighs 1.00 g')
    expect(card).toContain('the second and the third are taken to be exactly true')
    expect(card).toContain('slowly with the lid on and several times faster with it off')
    expect(parameters.lossLidOffPpm.value / parameters.lossLidOnPpm.value).toBeGreaterThan(2)
  })

  it('says what a careful bench does about each thing the lab makes simple: the calorimeter constant, the line carried back, and the piece kept dry', () => {
    expect(labelled('calorimeter', 'A careful bench').text).toContain('how much heat the calorimeter itself takes up for each degree it warms')
    expect(labelled('calorimeter', 'A careful bench').text).toContain('That figure is often called the calorimeter constant.')
    expect(labelled('graph', 'A careful bench').text).toContain('draws a straight line through the slow drift, and carries that line back to the moment the change was started')
    expect(labelled('metal', 'What is made simple').text).toContain('the piece is taken to reach the cup at once, as hot as the bath and dry')
    expect(labelled('metal', 'What is made simple').text).toContain('A careful bench heats the piece in a dry test tube that stands in the boiling water')
  })

  it('says how the graph is read: the level line, the peak, the turn back, the two temperatures to type, and why a cup reads low', () => {
    const card = shown('graph')
    expect(card).toContain(`takes a reading every ${parameters.loggerStepSeconds.value} seconds`)
    expect(card).toContain('Start the logger before you start the change.')
    expect(card).toContain('Run on until you see them turn back.')
    // Nothing either side of the logger's reading is taken: the sentence says so, and the record's parameter is what makes it so.
    expect(card).toContain('must be ones the logger shows, to the tenth of a degree')
    expect(parameters.readingToleranceTenths.value).toBe(0)
    expect(card).toContain('So the change in temperature you read is a little too small')
  })

  it('says how moles are found, gives the molar mass on the tile as the record has it, and the relation for the heat for each mole', () => {
    const card = shown('per-mole')
    const salt = calorimetryData.reagents.find((r) => r.id === 'nh4no3-solid')!
    expect(card).toContain(`The molar mass of ammonium nitrate is printed on its tile: ${'molarMass' in salt ? salt.molarMass.published : ''} g/mol.`)
    expect(card).toContain('The heat for each mole is the heat divided by the moles.')
    expect(card).toContain('so divide by 1000 as well')
    expect(card).toContain('each mole of acid that reacts makes one mole of water')
  })

  it('names the four metals as the record has them, says how the piece is told, and gives no figure for any of them', () => {
    const names = candidatesOf(calorimetryData).map((c) => c.name.toLowerCase())
    expect(shown('metal')).toContain(`${names.slice(0, -1).join(', ')} and ${names.at(-1)}`)
    expect(shown('metal')).toContain('Choose the one whose figure is nearest to yours.')
    expect(shown('metal')).toContain('Water boils at very nearly 100 °C')
    expect(parameters.bathRangeTenths.value).toEqual([990, 1000])
  })

  describe('the safety card', () => {
    const card = () => section('safety')
    const statements = (id: string) => calorimetryData.reagents.find((r) => r.id === id)!.hazards.statements
    const under = (id: string) => {
      const { hazards } = calorimetryData.reagents.find((r) => r.id === id)!
      return [hazards.sourceId, hazards.note.sourceId, hazards.note.alsoSourceId, ...(hazards.note.moreSourceIds ?? [])]
    }

    it('says first that the lab is a simulation and does not take the place of safety training, then what a tile shows', () => {
      expect(card().paragraphs.map((p) => p.label)).toEqual(['On a screen', 'On each tile', 'Acid and base', 'Ammonium nitrate', 'The four metals', 'Hot water and metal', 'A cold cup', 'What to wear', 'Afterwards'])
      expect(card().paragraphs[0]!.text).toContain('It does not take the place of the safety training of a laboratory.')
      expect(card().paragraphs[1]!.text).toContain('Until part 3 is done the piece of metal is unknown, so the bench shows the tiles of all four metals it may be.')
    })

    it('says of the acid, the base and the salt only what their tiles say, each from a document the tile cites', () => {
      const [, , acidBase, salt] = card().paragraphs
      expect(acidBase!.sourceIds).toEqual([under('hcl-1m')[1], under('naoh-1m')[1]])
      expect(calorimetryData.reagents[0]!.hazards.note.value).toContain('burns the skin severely and damages the eyes')
      expect(calorimetryData.reagents[1]!.hazards.note.value).toContain('burns the skin severely and damages the eyes')
      expect(acidBase!.text).toContain('each burns skin severely and damages eyes')
      expect(statements('nh4no3-solid')).toEqual(expect.arrayContaining(['H272: May intensify fire; oxidizer', 'H315: Causes skin irritation', 'H319: Causes serious eye irritation']))
      expect(salt!.text).toContain('helps other things to burn, and one record marks it as explosive')
      for (const id of salt!.sourceIds) expect(under('nh4no3-solid'), id).toContain(id)
      // The note under the tile carries no line on drains, and neither does the card.
      expect(salt!.text).not.toMatch(/drain/)
    })

    it("says of the four metals that a piece carries no hazard statement, and keeps zinc out of drains and waterways and apart from ammonium nitrate, as zinc's tile does", () => {
      const metals = card().paragraphs[4]!
      for (const c of candidatesOf(calorimetryData)) expect([c.hazards.signalWord, c.hazards.statements], c.id).toEqual(['None', []])
      expect(metals.text).toContain("for a piece its supplier's sheet lists no hazard statement")
      const zinc = calorimetryData.reagents.find((r) => r.id === 'zinc-piece')!.hazards.note.value
      expect(zinc).toContain('it is kept out of drains and waterways')
      expect(zinc).toContain('the two are kept apart')
      expect(metals.text).toContain('Zinc is kept apart from ammonium nitrate, and out of drains and waterways.')
      const documents = candidatesOf(calorimetryData).flatMap((c) => under(c.id))
      for (const id of metals.sourceIds) expect(documents, id).toContain(id)
      // No other metal is kept from drains on the card.
      expect(all.match(/drains/g)).toHaveLength(1)
    })

    it('says of hot water, a hot piece of metal and a cup that gets cold what a careful bench does', () => {
      const hot = labelled('safety', 'Hot water and metal')
      expect(hot.text).toContain('Boiling water scalds.')
      expect(hot.text).toContain('the piece is lifted with tongs or a holder and never with fingers')
      expect(hot.sourceIds).toEqual(['ncsu-calorimetry-lab'])
      expect(labelled('safety', 'A cold cup').text).toContain('it is still handled with eye protection and gloves on')
    })

    it("says what the sheets call for, as the hazard manifests' rows have it", () => {
      const wear = labelled('safety', 'What to wear')
      expect(wear.text).toContain('Eye protection, gloves and protective clothing, for all three parts.')
      const sheets: { id: string; supports: { field: string; prints: string; where: string }[] }[] = hazardManifest.sources
      for (const id of ['flinn-sds-61', 'flinn-sds-34', 'flinn-sds-859', 'flinn-sds-822']) {
        const row = sheets.find((s) => s.id === id)!.supports.find((r) => r.prints.startsWith('SECTION 8'))!
        expect(row.where, id).toMatch(/gloves and protective clothing/)
      }
      expect(sheets.find((s) => s.id === 'espi-sds-iron')!.supports.some((r) => r.prints === 'Safety glasses')).toBe(true)
      // Iron's own sheet names nothing to be worn, which is why the card goes to another document for it.
      expect(calorimetryData.reagents.find((r) => r.id === 'iron-piece')!.hazards.note.value).toContain('It names nothing to be worn')
    })

    it("leaves disposal to the laboratory's own rules and local regulations, and gives no method of it", () => {
      expect(card().paragraphs.at(-1)!.text).toBe("How anything from the bench is disposed of is decided by the laboratory's own rules and by local regulations: ask the laboratory's supervisor.")
      expect(all).not.toMatch(/pour (it|them)|sink|neutrali[sz]e|waste (container|bottle|jar)|flush (it|them) (down|away)/i)
    })
  })
})
