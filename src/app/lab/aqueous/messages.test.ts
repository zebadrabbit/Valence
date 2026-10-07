import { describe, expect, it } from 'vitest'
import { aqueousData as data } from '@/chem-data/aqueous/data'
import { findInstitutionText } from '@/chem-data/denylist'
import { FIELDS, FORMS, TOOL_USES, can, createLab, expectedObservation, fieldsOf, reduce, stationResult, usesOf, type Action, type Blocked, type Problem } from '@/engine/aqueous'
import { correctEntry } from '@/engine/aqueous/testkit'
import {
  BENCH_TEXT,
  FIELD_LABEL,
  FORM_LABEL,
  PROBLEM_TEXT,
  TOOL_LABEL,
  amountText,
  blockedText,
  choiceLabel,
  choiceList,
  equationFeedback,
  equationText,
  expectedLines,
  observationFeedback,
  reagentLines,
  seenText,
  stationTitle,
  toolOutcome,
} from './messages'

const ids = data.stations.map((s) => s.id)

describe('what a station is called and what goes into its tube', () => {
  it('numbers the ten stations and names each by its two reagents', () => {
    expect(ids.map((id) => stationTitle(data, id))).toEqual([
      'Station 1: Iron(III) chloride and sodium hydroxide',
      'Station 2: Sodium carbonate and copper(II) sulfate',
      'Station 3: Sodium carbonate and nickel(II) chloride',
      'Station 4: Barium chloride and copper(II) sulfate',
      'Station 5: Cobalt(II) chloride and iron(III) chloride',
      'Station 6: Ammonium nitrate and sodium hydroxide',
      'Station 7: Calcium carbonate and hydrochloric acid',
      'Station 8: Hydrochloric acid and sodium hydroxide, both 6 M',
      'Station 9: Cobalt(II) chloride and silver nitrate',
      'Station 10: Magnesium and hydrochloric acid',
    ])
    expect(() => stationTitle(data, 'aq-11')).toThrow('no station "aq-11"')
  })

  it('gives the amounts of spec 8.2, in its digits', () => {
    expect(reagentLines(data, 'aq-01')).toEqual(['2.0 mL of iron(III) chloride solution, 0.5 M', '2.0 mL of sodium hydroxide solution, 1 M'])
    expect(reagentLines(data, 'aq-07')).toEqual(['0.10 g of calcium carbonate, powder', '3.0 mL of hydrochloric acid, 1 M'])
    expect(reagentLines(data, 'aq-08')).toEqual(['2.0 mL of hydrochloric acid, 6 M', '2.0 mL of sodium hydroxide solution, 6 M'])
    expect(reagentLines(data, 'aq-09')[1]).toBe('2.0 mL of silver nitrate solution, 0.1 M')
    expect(reagentLines(data, 'aq-10')).toEqual(['0.012 g of magnesium ribbon', '5.0 mL of hydrochloric acid, 3 M'])
    expect([amountText({ value: 2, unit: 'mL' }), amountText({ value: 0.1, unit: 'g' })]).toEqual(['2.0 mL', '0.10 g'])
  })
})

describe('what each tool shows at each station', () => {
  it('says what the eye sees in the engine\'s own words', () => {
    for (const id of ids) expect(seenText(data, id)).toMatch(/The liquid( above it)? is [a-z -]+\.$/)
  })

  it('has an outcome for every tool of every station', () => {
    expect(Object.fromEntries(data.stations.flatMap((s) => usesOf(s).map((tool) => [`${s.id} ${tool}`, toolOutcome(data, s.id, tool)])))).toEqual({
      'aq-06 waft': 'Wafted towards your nose, the vapour has a sharp and pungent smell.',
      'aq-06 litmus-liquid': 'Red litmus paper dipped in the liquid turns blue.',
      'aq-06 litmus-vapour': 'Moist red litmus paper held above the liquid, touching neither the liquid nor the glass, turns blue.',
      'aq-08 touch': `The tube feels hot. ${data.cautions.hotTube.value}`,
      'aq-08 thermometer': 'The thermometer rises by about 40 °C. That figure is idealised: it is worked out as if no heat escaped from the tube and the liquid were plain water, so a real tube warms somewhat less.',
      'aq-10 touch': 'The tube feels warm.',
      'aq-10 splint': 'A lit splint held at the mouth of the tube gives a sharp pop.',
    })
  })

  it('carries the caution of spec 8.2 on the touch of the hot tube: that it is hot and that what went in is corrosive', () => {
    expect(toolOutcome(data, 'aq-08', 'touch')).toMatch(/hot.*corrosive/)
    expect(toolOutcome(data, 'aq-10', 'touch')).not.toMatch(/corrosive/)
  })

  it('words a tool where it finds nothing, too', () => {
    expect(toolOutcome(data, 'aq-01', 'waft')).toBe('Wafted towards your nose, the vapour has no smell.')
    expect(toolOutcome(data, 'aq-01', 'litmus-vapour')).toMatch(/stays red\.$/)
    expect(toolOutcome(data, 'aq-01', 'touch')).toBe('The tube feels no warmer than before.')
    expect(toolOutcome(data, 'aq-01', 'thermometer')).toBe('The thermometer does not move.')
    expect(toolOutcome(data, 'aq-01', 'splint')).toMatch(/burns on as before\.$/)
  })

  it('agrees with what the engine works out: the liquid at station 6 is basic from hydroxide left over, the gas there is ammonia, and the gas that pops is hydrogen', () => {
    const six = stationResult(data, 'aq-06')
    expect(six.remaining.find((a) => a.speciesId === 'hydroxide-ion')!.nmol).toBe(1_000_000)
    expect(six.remaining.some((a) => a.speciesId === 'ammonium-ion')).toBe(false)
    expect(six.gas).toBe('ammonia')
    expect(stationResult(data, 'aq-10').gas).toBe('hydrogen')
    for (const station of data.stations) {
      const { gas } = stationResult(data, station.id)
      expect(station.expected.toolResults.splint === 'pop', station.id).toBe(station.observationTools.includes('splint') && gas === 'hydrogen')
      expect(station.expected.toolResults.litmusInVapour === 'turns blue', station.id).toBe(gas === 'ammonia')
    }
  })

  it('names every way of applying a tool, and smelling the tube directly, which is always refused', () => {
    for (const tool of [...TOOL_USES, 'sniff'] as const) expect(TOOL_LABEL[tool].length).toBeGreaterThan(10)
    const mixed = reduce(data, createLab(data, 'guided'), { type: 'mix', stationId: 'aq-06' })
    const sniff: Action = { type: 'useTool', stationId: 'aq-06', tool: 'sniff' }
    expect(blockedText(data, sniff, can(data, mixed, sniff)!)).toBe(data.cautions.sniffing.value)
    expect(data.cautions.sniffing.value).toMatch(/^Do not put your nose over a tube.*waft/)
  })
})

describe('the observation form', () => {
  it('labels every field and every choice, with no two choices of a field reading alike', () => {
    for (const field of FIELDS) {
      expect(FIELD_LABEL[field].length).toBeGreaterThan(5)
      const labels = choiceList(data, field).map((c) => c.label)
      expect(new Set(labels).size, field).toBe(labels.length)
      for (const label of labels) expect(label.trim()).not.toBe('')
    }
    expect(choiceList(data, 'solid')[0]).toEqual({ value: 'none', label: 'no solid' })
    expect([choiceLabel('bubbles', 'bubbles'), choiceLabel('temperature', 'none'), choiceLabel('liquid', 'pink'), choiceLabel('splint', 'pop')]).toEqual(['bubbles rise', 'no warmer than before', 'pink', 'a pop'])
  })

  it('says in words what a correct observation holds, one line for each field of the station', () => {
    expect(expectedLines(data, 'aq-01')).toEqual(['Solid in the tube after mixing: rust-brown.', 'Colour of the liquid: yellow-orange.', 'Bubbles of gas: no bubbles.'])
    expect(expectedLines(data, 'aq-06')).toEqual(['Smell, wafted: sharp and pungent.', 'Red litmus dipped in the liquid: turns blue.', 'Moist red litmus held above the liquid: turns blue.'])
    expect(expectedLines(data, 'aq-10')).toEqual(['Temperature of the tube: warm.', 'Lit splint at the mouth of the tube: a pop.'])
    for (const station of data.stations) expect(expectedLines(data, station.id).length).toBe(fieldsOf(station).length)
  })

  it('tells a wrong observation which fields to look at again, and never what they should be', () => {
    expect(observationFeedback([])).toBe('That is what this tube shows.')
    expect(observationFeedback(['liquid'])).toBe('Not yet. Look again at the colour of the liquid.')
    expect(observationFeedback(['solid', 'liquid', 'bubbles'])).toBe('Not yet. Look again at the solid, the colour of the liquid and whether a gas comes off.')
    for (const station of data.stations) {
      const feedback = observationFeedback(fieldsOf(station))
      for (const value of Object.values(expectedObservation(station))) if (value !== 'none') expect(feedback, station.id).not.toContain(value)
    }
  })
})

describe('feedback on an equation', () => {
  const problems: Problem[] = ['no-reaction-expected', 'reaction-expected', 'ions-in-molecular', 'not-split', 'spectator', 'species', 'state', 'coefficients']

  it('has a sentence for every kind of thing that can be wrong, each its own', () => {
    expect(Object.keys(PROBLEM_TEXT).sort()).toEqual([...problems].sort())
    expect(new Set(Object.values(PROBLEM_TEXT)).size).toBe(problems.length)
    expect(equationFeedback(null)).toBe('Correct.')
    expect(equationFeedback('state')).toBe(PROBLEM_TEXT.state)
  })

  it('says what kind of thing is wrong and gives no answer: no formula, and no name of a substance of any station but hydrochloric acid, named for the rule on what is split', () => {
    const names = data.species.map((s) => s.id.replaceAll('-', ' ').replace(/ ion$/, '')).filter((name) => name !== 'water' && name !== 'hydrochloric acid')
    for (const problem of problems) {
      const text = PROBLEM_TEXT[problem]
      expect(text, problem).not.toMatch(/[₀-₉⁺⁻→]/)
      for (const name of names) expect(text.toLowerCase(), `${problem}: ${name}`).not.toContain(name)
    }
  })

  it('writes an entered equation in one line', () => {
    expect(equationText(data, correctEntry(data, 'aq-01', 'netIonic'))).toBe('Fe³⁺(aq) + 3OH⁻(aq) → Fe(OH)₃(s)')
    expect(equationText(data, correctEntry(data, 'aq-07', 'molecular'))).toBe('CaCO₃(s) + 2HCl(aq) → CaCl₂(aq) + H₂O(l) + CO₂(g)')
    expect(equationText(data, correctEntry(data, 'aq-09', 'completeIonic'))).toBe('Co²⁺(aq) + 2Cl⁻(aq) + 2Ag⁺(aq) + 2NO₃⁻(aq) → 2AgCl(s) + Co²⁺(aq) + 2NO₃⁻(aq)')
    expect(equationText(data, correctEntry(data, 'aq-05', 'molecular'))).toBe('No reaction')
    expect(FORMS.map((form) => FORM_LABEL[form])).toEqual(['Molecular equation', 'Complete ionic equation', 'Net ionic equation'])
  })
})

describe('why something cannot be done', () => {
  it('has a sentence for every reason, and two for an entry that is not well formed', () => {
    const reasons: Blocked[] = ['lab-completed', 'unknown-station', 'already-mixed', 'not-mixed', 'no-such-tool', 'sniffing', 'tool-not-used', 'invalid-entry']
    const mix: Action = { type: 'mix', stationId: 'aq-01' }
    const texts = reasons.map((reason) => blockedText(data, mix, reason))
    expect(new Set(texts).size).toBe(reasons.length)
    const equation: Action = { type: 'enterEquation', stationId: 'aq-01', form: 'molecular', entry: { noReaction: false, reactants: [], products: [] } }
    expect(blockedText(data, equation, 'invalid-entry')).toMatch(/at least one substance on each side.*"No reaction"/)
    expect(blockedText(data, { type: 'recordObservation', stationId: 'aq-01', observation: {} }, 'invalid-entry')).toBe('Choose one answer for each question.')
  })
})

describe('every sentence', () => {
  it('holds no institution text', () => {
    const all = [
      ...Object.values(BENCH_TEXT),
      ...Object.values(FIELD_LABEL),
      ...Object.values(TOOL_LABEL),
      ...Object.values(PROBLEM_TEXT),
      ...Object.values(FORM_LABEL),
      ...ids.flatMap((id) => [stationTitle(data, id), ...reagentLines(data, id), ...expectedLines(data, id), seenText(data, id), ...TOOL_USES.map((tool) => toolOutcome(data, id, tool))]),
    ]
    for (const text of all) expect(findInstitutionText(text, []), text).toBeNull()
  })
})
