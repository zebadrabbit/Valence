import { describe, expect, it } from 'vitest'
import hazardManifest from '../../../docs/research/freezing/sources/hazard-manifest.json'
import manifest from '../../../docs/research/freezing/sources/MANIFEST.json'
import { findInstitutionText } from '../denylist'
import { readFirstOf, termIndex } from '../primer'
import sources from '../sources.json'
import { freezingData } from './data'
import { FREEZING_PRIMER, READ_FIRST } from './primer'

const local = import.meta.glob<string[]>('../denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

const paragraphs = FREEZING_PRIMER.flatMap((s) => s.paragraphs.map((paragraph, i) => [`${s.id}[${i}]`, paragraph] as const))
const shown = (id: string) => FREEZING_PRIMER.find((s) => s.id === id)!.paragraphs.map((p) => p.text).join(' ')
const all = FREEZING_PRIMER.map((s) => shown(s.id)).join(' ')
const words = (text: string) => text.split(/\s+/).length
const source = (id: string) => sources.find((s) => s.id === id)
const cited = new Set(paragraphs.flatMap(([, paragraph]) => paragraph.sourceIds))
const sig3 = (x: number) => Number(x.toPrecision(3))
const p = freezingData.parameters

describe('the freezing primer: its cards', () => {
  it('has the nine topics of spec 23.5, in order', () => {
    expect(FREEZING_PRIMER.map((s) => [s.id, s.heading])).toEqual([
      ['freezing', 'Freezing and melting'],
      ['dissolving', 'What dissolving does'],
      ['molality', 'Molality'],
      ['constant', 'The freezing point constant'],
      ['molar-mass', 'From a fall to a molar mass'],
      ['particles', 'Salts, ions and the count of particles'],
      ['graph', 'Reading the graph'],
      ['straining', 'Straining and weighing'],
      ['safety', 'Safety'],
    ])
  })

  it('gives every card two to four paragraphs with text', () => {
    for (const s of FREEZING_PRIMER) {
      expect(s.paragraphs.length, s.id).toBeGreaterThan(1)
      expect(s.paragraphs.length, s.id).toBeLessThanOrEqual(4)
      for (const paragraph of s.paragraphs) expect(paragraph.text.trim().length, s.id).toBeGreaterThan(40)
    }
  })

  it("is short, by the other primers' limits: no paragraph over 75 words, no card over 200, and under 1,200 in all", () => {
    for (const [where, paragraph] of paragraphs) expect(words(paragraph.text), where).toBeLessThanOrEqual(75)
    for (const s of FREEZING_PRIMER) expect(words(shown(s.id)), s.id).toBeLessThanOrEqual(200)
    expect(words(all)).toBeLessThan(1200)
  })

  it('opens by saying how many cards there are and naming the five to read before the bench, by their headings, and no other', () => {
    const first = FREEZING_PRIMER[0]!.paragraphs[0]!.text
    expect(first).toMatch(/^This primer has nine cards\. Read five of them before you go to the bench, in this order: Freezing and melting; What dissolving does; Molality; Reading the graph; Straining and weighing\./)
    expect(READ_FIRST).toEqual(['freezing', 'dissolving', 'molality', 'graph', 'straining'])
    expect(readFirstOf(FREEZING_PRIMER)).toEqual(READ_FIRST)
  })

  it('holds no institution text, and names no maker or supplier', () => {
    for (const [where, paragraph] of paragraphs) {
      expect(findInstitutionText(`${paragraph.text} ${paragraph.support}`, institutionNames), where).toBeNull()
      expect(paragraph.text, where).not.toMatch(/Flinn|Fisher|Vernier|Styrofoam/i)
    }
  })
})

describe('the freezing primer: how its text is drawn', () => {
  it('heads every paragraph with a label of one to four words, its own within the card', () => {
    for (const s of FREEZING_PRIMER) {
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
    expect(terms.map(([, , term]) => term)).toEqual(['freezing point', 'solute', 'molality', 'freezing point constant', 'ions'])
    for (const [where, text, term] of terms) {
      expect(term, where).toMatch(/^[\p{L} -]+$/u)
      expect(termIndex(text, term), `${where}: ${term}`).toBeGreaterThanOrEqual(0)
    }
  })

  it("sets off only whole sentences of the paragraph that name the lab themselves, each a rule of the simulation's and not of a bench", () => {
    const rules = paragraphs.flatMap(([where, paragraph]) => (paragraph.labRules ?? []).map((rule) => [where, paragraph.text, rule] as const))
    expect(rules.map(([where]) => where)).toEqual(['freezing[2]', 'molar-mass[2]'])
    for (const [where, text, rule] of rules) {
      expect(text.indexOf(rule), where).toBeGreaterThanOrEqual(0)
      expect(rule, where).toMatch(/^In this lab .*\.$/)
    }
  })

  it('shows the two relations, the molality and the fall, each under the paragraph that states it, and nowhere else', () => {
    expect(paragraphs.filter(([, paragraph]) => paragraph.equation !== undefined).map(([where, paragraph]) => [where, paragraph.equation])).toEqual([
      ['molality[0]', 'molality = moles of solute ÷ kilograms of water'],
      ['constant[1]', 'fall = 1.86 °C·kg/mol × molality × particles for each formula unit'],
    ])
  })
})

describe('the freezing primer: what each paragraph rests on', () => {
  it('cites only sources that exist, each once in a paragraph', () => {
    for (const [where, paragraph] of paragraphs) {
      expect(new Set(paragraph.sourceIds).size, where).toBe(paragraph.sourceIds.length)
      for (const id of paragraph.sourceIds) expect(source(id), `${where}: ${id}`).toBeDefined()
    }
  })

  it('writes every support line as "This lab:" or as a located passage of a source the paragraph cites, at that source\'s address', () => {
    for (const [where, paragraph] of paragraphs) {
      const lines = paragraph.support.split('\n')
      expect(lines.length, where).toBeGreaterThan(0)
      const located = lines.filter((line) => !line.startsWith('This lab: '))
      expect(located.length, where).toBeGreaterThanOrEqual(paragraph.sourceIds.length)
      for (const line of located) {
        const id = line.slice(0, line.indexOf(': '))
        expect(paragraph.sourceIds, `${where}: ${line}`).toContain(id)
        expect(line, where).toContain(`not quoted; see `)
        expect(line, where).toContain(source(id)!.url)
        expect(line, where).toContain('. It establishes that ')
      }
    }
  })

  it('quotes nothing: no support line holds a quotation mark', () => {
    for (const [where, paragraph] of paragraphs) expect(paragraph.support, where).not.toMatch(/["“”]/)
  })

  it('has exactly these paragraphs with no source, each resting on "This lab:" lines alone', () => {
    const unsourced = paragraphs.filter(([, paragraph]) => paragraph.sourceIds.length === 0)
    expect(unsourced.map(([where]) => where)).toEqual(['freezing[0]', 'dissolving[2]', 'molar-mass[1]', 'molar-mass[2]', 'particles[2]', 'graph[0]', 'graph[1]', 'straining[0]', 'straining[1]', 'straining[2]', 'safety[3]'])
    for (const [where, paragraph] of unsourced) for (const line of paragraph.support.split('\n')) expect(line, where).toMatch(/^This lab: /)
  })

  it("lists in the manifest, with a primer row, exactly the sources of its own that the primer cites; the rest are documents that a reagent's hazards cite", () => {
    const withPrimerRow = manifest.sources.filter((s) => s.supports.some((row) => row.fields.includes('primer'))).map((s) => s.id)
    const own = [...cited].filter((id) => manifest.sources.some((s) => s.id === id))
    expect([...withPrimerRow].sort()).toEqual([...own].sort())
    const others = [...cited].filter((id) => !own.includes(id))
    expect(others.sort()).toEqual(['flinn-sds-326', 'flinn-sds-420', 'flinn-sds-7', 'flinn-sds-714', 'flinn-sds-721', 'flinn-sds-840'])
    const underHazards = new Set(freezingData.reagents.flatMap((r) => [r.hazards.sourceId, r.hazards.note.sourceId, r.hazards.note.alsoSourceId, ...(r.hazards.note.moreSourceIds ?? [])]))
    for (const id of others) {
      expect(underHazards.has(id), id).toBe(true)
      expect(hazardManifest.sources.some((s) => s.id === id), id).toBe(true)
    }
  })

  it('cites no page of OpenStax', () => {
    for (const id of cited) expect(`${id} ${source(id)!.url} ${source(id)!.citation}`.toLowerCase()).not.toContain('openstax')
  })
})

describe('the freezing primer: its worked examples', () => {
  const kf = freezingData.water.freezingPointConstant.value

  it('works a molar mass from a fall: 6.00 g in 0.0800 kg and a fall of 2.79 °C is 50.0 g/mol, on rounded and on unrounded numbers alike', () => {
    expect(shown('molar-mass')).toContain('Say 6.00 g of a liquid in 0.0800 kg of water lowers the freezing point by 2.79 °C. Molality: 2.79 ÷ 1.86 = 1.50 mol/kg. Moles: 1.50 × 0.0800 = 0.120 mol. Molar mass: 6.00 ÷ 0.120 = 50.0 g/mol.')
    expect(kf).toBe(1.86)
    const molality = 2.79 / kf
    expect(sig3(molality)).toBe(1.5)
    for (const m of [molality, sig3(molality)]) {
      expect(sig3(m * 0.08)).toBe(0.12)
      for (const moles of [m * 0.08, sig3(m * 0.08)]) expect(sig3(6 / moles)).toBe(50)
    }
  })

  it('works a count of particles: 14.0 g of molar mass 160.0 g/mol in 0.125 kg with a fall of 2.47 °C is 1.90, on rounded and on unrounded numbers alike', () => {
    expect(shown('particles')).toContain('Say 14.0 g of a salt of molar mass 160.0 g/mol in 0.125 kg of water gives a fall of 2.47 °C. Moles: 14.0 ÷ 160.0 = 0.0875 mol. Molality: 0.0875 ÷ 0.125 = 0.700 mol/kg. One particle each would give 1.86 × 0.700 = 1.30 °C. Ratio: 2.47 ÷ 1.30 = 1.90.')
    const moles = 14 / 160
    expect(sig3(moles)).toBe(0.0875)
    expect(sig3(moles / 0.125)).toBe(0.7)
    const ideal = kf * (moles / 0.125)
    expect(sig3(ideal)).toBe(1.3)
    for (const fall of [ideal, sig3(ideal)]) expect(sig3(2.47 / fall)).toBe(1.9)
  })

  it('works the molality and the mass of water of its two small examples', () => {
    expect(shown('molality')).toContain('0.0500 mol in 0.125 kg of water is 0.400 mol/kg')
    expect(sig3(0.05 / 0.125)).toBe(0.4)
    expect(shown('straining')).toContain('82.46 g less 7.10 g is 75.36 g, which is 0.07536 kg')
    expect(Math.round(8246 - 710)).toBe(7536)
  })

  it("uses no run's numbers: no mass and no fall of an example is one the bench can give, and no molar mass of one is a row of a table", () => {
    const solutes = [p.unknownRangeCg, p.ureaRangeCg, p.naclRangeCg, p.kclRangeCg, p.nabrRangeCg].map((range) => range.value)
    for (const grams of [6, 14, 7.1]) expect(solutes.every(([low, high]) => grams * 100 < low || grams * 100 > high), `${grams} g`).toBe(true)
    // The water of a run is what the cup starts with and the ice that melts: never under 90 g, nor over the starting water and all the ice.
    for (const kg of [0.08, 0.125, 0.07536]) expect(kg * 1e5 < p.waterRangeCg.value[0] || kg * 1e5 > p.waterRangeCg.value[1] + p.iceCg.value, `${kg} kg`).toBe(true)
    // No fall of the bench reaches 2 °C: the build's own count has the largest at 1.98 °C.
    for (const fall of [2.79, 2.47]) expect(fall).toBeGreaterThan(2)
    for (const molarMass of [50, 160]) expect(freezingData.reagents.every((r) => Math.abs(r.molarMass.value - molarMass) > 3), `${molarMass}`).toBe(true)
  })
})

describe('the freezing primer: what it has to say', () => {
  it('says why ice and water together sit at one temperature, and what part 1 is for', () => {
    expect(shown('freezing')).toMatch(/ice and water stay together, neither gaining on the other/)
    expect(shown('freezing')).toMatch(/Part 1 finds what this one reads in ice and water\./)
    expect(shown('freezing')).toMatch(/the difference of two readings of the one probe, so what it is off by drops out/)
  })

  it('says what dissolving does and that the fall counts particles, not what they are', () => {
    expect(shown('dissolving')).toMatch(/the mixture freezes at a lower temperature/)
    expect(shown('dissolving')).toMatch(/how many dissolved particles there are for each kilogram of water, not on what they are/)
  })

  it('says what molality is and why it is counted for the water alone', () => {
    expect(shown('molality')).toMatch(/molality is the moles of solute for each kilogram of water/)
    expect(shown('molality')).toMatch(/the mass of the solution less the mass of the solute/)
  })

  it('gives the constant as the record has it, and says that the relation holds best when little is dissolved', () => {
    expect(shown('constant')).toContain(`falls by ${freezingData.water.freezingPointConstant.published} °C`)
    expect(shown('constant')).toMatch(/It holds best when little is dissolved\. This lab uses it as it stands\./)
  })

  it('gives the rounding rule as the notebook judges it', () => {
    expect(shown('molar-mass')).toMatch(/each worked-out number is entered to three significant figures\. Work the next step from the number you entered or from the unrounded one in your calculator: both are taken\./)
  })

  it('says that a salt comes apart into ions, that the ratio is the count of particles, and that a real salt gives a little under two', () => {
    expect(shown('particles')).toMatch(/one particle for each formula unit\. A salt such as sodium chloride comes apart into ions/)
    expect(shown('particles')).toMatch(/near 1 for urea, near 2 for a salt/)
    expect(shown('particles')).toMatch(/A real salt gives a little under two\./)
  })

  it('says which reading each temperature is, how a level stretch is known, and names the three errors of technique with what the lid and the stirrer do', () => {
    expect(shown('graph')).toContain(`a reading every ${p.loggerStepSeconds.value} seconds`)
    expect(shown('graph')).toMatch(/The first temperature is the level reading just before the solute went in\. The second is the last reading before you strain\. Wait for three readings running that are the same\./)
    expect(shown('graph')).toMatch(/A reading taken while the curve is still moving is not a freezing point\./)
    expect(shown('graph')).toMatch(/If all the ice melts, the temperature climbs and no reading is a freezing point\./)
    expect(shown('straining')).toMatch(/Weigh the cup without straining it and the ice is counted as water\./)
  })

  describe('the safety card', () => {
    it('says first that the lab is a simulation and does not take the place of safety training', () => {
      expect(shown('safety')).toMatch(/^This lab is a simulation: nothing here can hurt you, and it does not take the place of safety training\./)
    })

    it('says of the unknown only what all three tiles say, and of the solids only what theirs do', () => {
      expect(shown('safety')).toMatch(/treat it as each of the three liquids it may be/)
      for (const liquid of freezingData.parts[1].candidateIds) expect(freezingData.reagents.find((r) => r.id === liquid)!.hazards.statements[0], liquid).toBe('H225: Highly flammable liquid and vapor')
      expect(freezingData.reagents.find((r) => r.id === 'urea')!.hazards.statements).toEqual([])
      expect(freezingData.reagents.find((r) => r.id === 'nabr')!.hazards.statements).toContain('H320: Causes eye irritation')
      expect(shown('safety')).not.toMatch(/acetone|ethanol|propanol/i)
    })

    it("leaves disposal to the laboratory's own rules and local regulations, and gives no method of it", () => {
      expect(shown('safety')).toMatch(/How anything is disposed of is decided by the laboratory's own rules and by local regulations\. Ask the laboratory's supervisor\.$/)
      expect(all).not.toMatch(/drain|sewer|sink|trash/i)
    })
  })
})
