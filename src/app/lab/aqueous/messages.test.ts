import { describe, expect, it } from 'vitest'
import { aqueousData as data } from '@/chem-data/aqueous/data'
import { findInstitutionText } from '@/chem-data/denylist'
import { FIELDS, FORMS, LOOKS, TOOL_USES, can, createLab, describeStationResult, expectedObservation, fieldsOf, isLook, reduce, stationResult, usesOf, type Action, type Blocked, type Problem } from '@/engine/aqueous'
import { correctEntry } from '@/engine/aqueous/testkit'
import {
  BENCH_TEXT,
  FIELD_LABEL,
  FORM_LABEL,
  LOOK_PART,
  MODE_TEXT,
  PAGE_TEXT,
  PROBLEM_TEXT,
  PROGRESS_TEXT,
  RECORD_TEXT,
  SOLUBILITY_TEXT,
  STATE_KEY,
  STATE_NAME,
  STATION_TEXT,
  TOOL_LABEL,
  alreadyOnSide,
  amountText,
  blockedText,
  choiceLabel,
  choiceList,
  equationFeedback,
  equationText,
  expectedLines,
  observationFeedback,
  observationLines,
  observationRefusal,
  stationTitle,
  toolFirstText,
  toolOutcome,
} from './messages'
import { tubeLook } from './stationLook'

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

  it('gives the amounts of spec 8.2, in its digits: a volume to 0.1 mL and a mass to two figures', () => {
    const amounts = (stationId: string) => data.stations.find((s) => s.id === stationId)!.amounts.map(amountText)
    expect(amounts('aq-01')).toEqual(['2.0 mL', '2.0 mL'])
    expect(amounts('aq-07')).toEqual(['0.10 g', '3.0 mL'])
    expect(amounts('aq-10')).toEqual(['0.012 g', '5.0 mL'])
  })
})

describe('what each tool shows at each station', () => {
  it('says what is seen in each part of each tube: at the bottom, in the liquid, and at its surface', () => {
    const none = ['No solid has settled.', 'The liquid is colourless.', 'No bubbles rise.']
    const fizz = 'Bubbles rise through the liquid and break at the surface.'
    expect(Object.fromEntries(data.stations.map((s) => [s.id, LOOKS.map((look) => toolOutcome(data, s.id, look))]))).toEqual({
      'aq-01': ['A rust-brown, gelatinous solid has settled here.', 'The liquid is yellow-orange.', 'No bubbles rise.'],
      'aq-02': ['A blue-green solid has settled here.', 'The liquid is colourless.', 'No bubbles rise.'],
      'aq-03': ['A pale green solid has settled here.', 'The liquid is colourless.', 'No bubbles rise.'],
      'aq-04': ['A white, fine solid has settled here.', 'The liquid is blue.', 'No bubbles rise.'],
      'aq-05': ['No solid has settled.', 'The liquid is orange.', 'No bubbles rise.'],
      'aq-06': none,
      'aq-07': ['The white powder has dissolved. No solid is left here.', 'The liquid is colourless.', fizz],
      'aq-08': none,
      'aq-09': ['A white solid has settled here.', 'The liquid is pink.', 'No bubbles rise.'],
      'aq-10': ['The silvery metal ribbon has dissolved. No solid is left here.', 'The liquid is colourless.', fizz],
    })
  })

  it('holds what is seen in each part to the expected record, to the drawing and to the engine\'s own description of the tube', () => {
    for (const station of data.stations) {
      const [bottom, liquid, surface] = LOOKS.map((look) => toolOutcome(data, station.id, look)) as [string, string, string]
      const { expected } = station
      const solid = expected.precipitateColor ?? null
      expect(liquid, station.id).toBe(`The liquid is ${expected.liquidColor}.`)
      expect(bottom.endsWith('solid has settled here.'), station.id).toBe(solid !== null)
      if (solid !== null) expect(bottom, station.id).toMatch(new RegExp(`^A ${solid}[ ,]`))
      expect(surface.startsWith('Bubbles rise'), station.id).toBe(expected.bubbles)
      const drawn = tubeLook(data, station.id)
      expect([drawn.liquid.name, drawn.solid?.name ?? null, drawn.bubbles], station.id).toEqual([expected.liquidColor, solid, expected.bubbles])
      const whole = describeStationResult(data, station.id)
      expect(whole, station.id).toContain(`is ${expected.liquidColor}.`)
      expect(whole.includes('solid forms.') && !whole.startsWith('No solid'), station.id).toBe(solid !== null)
      expect(whole.includes('dissolves completely'), station.id).toBe(bottom.includes('has dissolved'))
      expect(whole.includes('bubbles of'), station.id).toBe(expected.bubbles)
    }
  })

  it('says of a part only what is seen in that part, with no formula and nothing a tool has to be applied for', () => {
    for (const station of data.stations) {
      const [bottom, liquid, surface] = LOOKS.map((look) => toolOutcome(data, station.id, look)) as [string, string, string]
      expect(bottom, station.id).not.toMatch(/bubble|liquid/i)
      expect(liquid, station.id).not.toMatch(/solid|bubble|settled/i)
      expect(surface, station.id).not.toMatch(/solid|settled|colour/i)
      // The colour of the liquid is in the liquid's sentence alone, and that of the solid in the bottom's.
      expect(`${bottom} ${surface}`, station.id).not.toContain(station.expected.liquidColor)
      if (station.expected.precipitateColor) expect(`${liquid} ${surface}`, station.id).not.toContain(station.expected.precipitateColor)
      for (const text of [bottom, liquid, surface]) expect(text, station.id).not.toMatch(/[₀-₉⁺⁻]|smell|litmus|warm|hot|pop|splint/)
    }
  })

  it('has an outcome for every tool of every station', () => {
    expect(Object.fromEntries(data.stations.flatMap((s) => usesOf(s).filter((tool) => !isLook(tool)).map((tool) => [`${s.id} ${tool}`, toolOutcome(data, s.id, tool)])))).toEqual({
      'aq-06 waft': 'Wafted towards your nose, the vapour has a sharp and pungent smell.',
      'aq-06 litmus-liquid': 'Red litmus paper dipped in the liquid turns blue.',
      'aq-06 litmus-vapour': 'Moist red litmus paper held above the liquid, touching neither the liquid nor the glass, turns blue.',
      'aq-08 touch': `The tube feels hot. ${data.cautions.hotTube.value}`,
      // The thermometer says which of the question's answers its figure is, as the touch does: a rise alone would leave warm or hot to a guess.
      'aq-08 thermometer': 'The thermometer rises by about 40 °C, so the tube is hot. That figure is idealised: it is worked out as if no heat escaped from the tube and the liquid were plain water, so a real tube warms somewhat less.',
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
    expect(LOOKS.map((look) => TOOL_LABEL[look])).toEqual(['Look at the bottom of the tube', 'Look at the liquid', 'Look at the surface of the liquid'])
    expect(LOOKS.map((look) => LOOK_PART[look])).toEqual(['The bottom of the tube', 'The liquid', 'The surface of the liquid'])
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
    expect(expectedLines(data, 'aq-01')).toEqual(['Solid in the tube once any reaction is over: rust-brown.', 'Colour of the liquid: yellow-orange.', 'Bubbles of gas: no bubbles.'])
    expect(expectedLines(data, 'aq-06')).toEqual(['Solid in the tube once any reaction is over: no solid.', 'Colour of the liquid: colourless.', 'Bubbles of gas: no bubbles.', 'Smell, wafted: sharp and pungent.', 'Red litmus dipped in the liquid: turns blue.', 'Moist red litmus held above the liquid: turns blue.'])
    expect(expectedLines(data, 'aq-10')).toEqual(['Solid in the tube once any reaction is over: no solid.', 'Colour of the liquid: colourless.', 'Bubbles of gas: bubbles rise.', 'Temperature of the tube: warm.', 'Lit splint at the mouth of the tube: a pop.'])
    for (const station of data.stations) expect(expectedLines(data, station.id).length).toBe(fieldsOf(station).length)
  })

  it('tells a wrong observation which fields to look at again, and never what they should be', () => {
    expect(observationFeedback([])).toBe('That is what this tube shows.')
    expect(observationFeedback(['liquid'])).toBe('Not yet. Look again at the colour of the liquid.')
    expect(observationFeedback(['solid', 'liquid', 'bubbles'])).toBe('Not yet. Look again at the solid in the tube at the end, the colour of the liquid and whether a gas comes off.')
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

  it('tells a learner who checks while a question still waits for a look or for its tool to do that first, and not to answer what cannot be answered yet', () => {
    // Station 6, mixed, the three questions of the eye answered and no tool used: the engine finds the entry not whole.
    const mixed = reduce(data, createLab(data, 'challenge'), { type: 'mix', stationId: 'aq-06' })
    const seen = { solid: 'none', liquid: 'colourless', bubbles: 'none' }
    const blocked = can(data, mixed, { type: 'recordObservation', stationId: 'aq-06', observation: seen })!
    expect(blocked).toBe('invalid-entry')
    expect(observationRefusal(data, 'aq-06', [...LOOKS], blocked)).toBe('Some questions are not open yet. Each says under it what to do first. Then choose one answer for each question.')
    expect(observationRefusal(data, 'aq-06', [...LOOKS, 'waft', 'litmus-liquid'], blocked)).toBe(PAGE_TEXT.toolsFirst)
    // Every tool used: what is missing is an answer.
    expect(observationRefusal(data, 'aq-06', [...LOOKS, 'waft', 'litmus-liquid', 'litmus-vapour'], blocked)).toBe('Choose one answer for each question.')
    // Either of two tools opens the one question they both show.
    expect(observationRefusal(data, 'aq-08', [...LOOKS, 'thermometer'], blocked)).toBe('Choose one answer for each question.')
    expect(observationRefusal(data, 'aq-08', [...LOOKS], blocked)).toBe(PAGE_TEXT.toolsFirst)
    // A station of the eye alone waits too, until each of the three parts of its tube has been looked at.
    expect(observationRefusal(data, 'aq-01', [], blocked)).toBe(PAGE_TEXT.toolsFirst)
    expect(observationRefusal(data, 'aq-01', ['look-bottom', 'look-surface'], blocked)).toBe(PAGE_TEXT.toolsFirst)
    expect(observationRefusal(data, 'aq-01', [...LOOKS], blocked)).toBe('Choose one answer for each question.')
    expect(observationRefusal(data, 'aq-06', [], 'lab-completed')).toBe(blockedText(data, { type: 'mix', stationId: 'aq-06' }, 'lab-completed'))
  })
})

describe("the page's own wording", () => {
  const strings = (texts: Record<string, unknown>) => Object.values(texts).filter((text): text is string => typeof text === 'string')

  it('says what each mode does in this lab as spec 8.3 has it, and not in the words of the titration lab', () => {
    expect(MODE_TEXT.guided).toMatch(/^Guided: .*hints from the start.*correct observation.*to open\.$/)
    expect(MODE_TEXT.challenge).toMatch(/^Challenge: .*no hints.*until you have recorded your own observation/)
    for (const text of Object.values(MODE_TEXT)) expect(text).not.toMatch(/checklist|warning|trial/)
  })

  it('says where a station stands and names the way to the ones either side by their titles', () => {
    expect(STATION_TEXT.place(3, 10)).toBe('Station 3 of 10')
    expect(STATION_TEXT.previous(stationTitle(data, 'aq-02'))).toBe('Previous: Station 2: Sodium carbonate and copper(II) sulfate')
    expect(STATION_TEXT.next(stationTitle(data, 'aq-04'))).toBe('Next: Station 4: Barium chloride and copper(II) sulfate')
  })

  it('has a word for each of the four ways a station can stand, each its own', () => {
    expect(PROGRESS_TEXT).toEqual({ 'not-started': 'Not started', started: 'Started', observed: 'Observed', done: 'Done' })
  })

  it('writes a recorded observation in the lines an expected one is written in', () => {
    expect(observationLines({ liquid: 'pink', solid: 'none' })).toEqual(['Solid in the tube once any reaction is over: no solid.', 'Colour of the liquid: pink.'])
    for (const station of data.stations) expect(observationLines(expectedObservation(station))).toEqual(expectedLines(data, station.id))
  })

  it('says which tool a question waits for, and that either will do where two show the same thing', () => {
    expect(toolFirstText(['waft'])).toBe('Not yet. First use: Waft the vapour towards your nose.')
    expect(toolFirstText(['touch', 'thermometer'])).toBe('Not yet. First use: Touch the outside of the tube, or Read the thermometer.')
  })

  it('says which part of the tube a question of the eye waits for, and where to look at it', () => {
    expect(LOOKS.map((look) => toolFirstText([look]))).toEqual([
      'Not yet. First look at the bottom of the tube in the picture.',
      'Not yet. First look at the liquid in the picture.',
      'Not yet. First look at the surface of the liquid in the picture.',
    ])
  })

  it('tells a learner to explore the picture, says of each part whether it has been looked at, and names the closed list for what it holds', () => {
    expect(PAGE_TEXT.explore).toBe('Hover over or tap each part of the tube to look at it.')
    expect([PAGE_TEXT.lookedAt, PAGE_TEXT.notLookedAt]).toEqual(['looked at', 'not looked at yet'])
    expect(BENCH_TEXT.expected).toBe('What a correct observation holds')
    expect(PAGE_TEXT.challengeHidden).toBe('In Challenge, the hints and what a correct observation holds come once you have recorded your own observation.')
  })

  it('names the four state symbols in full, and says why a species is not added to a side twice', () => {
    expect(STATE_NAME).toEqual({ aq: 'dissolved in water', s: 'solid', l: 'liquid', g: 'gas' })
    expect(STATE_KEY).toBe('States: (aq) dissolved in water, (s) solid, (l) liquid, (g) gas.')
    expect(alreadyOnSide('Fe³⁺', 'reactants')).toBe('Fe³⁺ is already among the reactants.')
    expect(alreadyOnSide('H₂O', 'products')).toBe('H₂O is already among the products.')
  })

  it('gives no answer and scolds nobody: no formula, no colour of a station, and none of the words a refusal can do without', () => {
    const all = [...strings(PAGE_TEXT), ...strings(SOLUBILITY_TEXT), ...strings(RECORD_TEXT), ...Object.values(MODE_TEXT), ...Object.values(PROGRESS_TEXT), ...strings(STATION_TEXT)]
    expect(all.length).toBeGreaterThan(40)
    for (const text of all) {
      expect(text).not.toMatch(/[₀-₉⁺⁻]|wrong|fail|must|cannot|error|invalid/i)
      for (const colour of [...data.choices.solid, ...data.choices.liquid].filter((c) => c !== 'none')) expect(text, text).not.toContain(colour)
      expect(findInstitutionText(text, []), text).toBeNull()
    }
  })

  it('says of the solubility table only what the record holds: the pairs of these stations, soluble or insoluble, and that a pair it does not hold is not judged', () => {
    expect(SOLUBILITY_TEXT.caption).toContain('the pairs of ions these ten stations can bring together')
    expect(SOLUBILITY_TEXT.key).toMatch(/not listed.*no station here brings together.*says nothing of whether its compound dissolves/)
    expect(data.stations).toHaveLength(10)
  })

  it('marks in the solubility table the one pair that dissolves and reacts all the same, and says so in words under it', () => {
    const { cationId, anionId } = SOLUBILITY_TEXT.reacting
    // The record stores the pair as soluble, and it is the pair of ions that react at a station, giving ammonia.
    expect(data.solubility.find((row) => row.cationId === cationId && row.anionId === anionId)?.soluble).toBe(true)
    const stations = data.stations.filter((s) => s.equations.netIonic !== null && [cationId, anionId].every((id) => s.equations.netIonic!.reactants.some((term) => term.speciesId === id)))
    expect(stations.map((s) => s.id)).toEqual(['aq-06'])
    expect(stations[0]!.equations.netIonic!.products.map((term) => term.speciesId)).toContain('ammonia')
    // No other pair the table calls soluble is the two reactants of a station's net ionic equation.
    for (const row of data.solubility) {
      const reacts = data.stations.some((s) => s.equations.netIonic !== null && [row.cationId, row.anionId].every((id) => s.equations.netIonic!.reactants.some((term) => term.speciesId === id)))
      expect(row.soluble && reacts, `${row.cationId} ${row.anionId}`).toBe(row.cationId === cationId && row.anionId === anionId)
    }
    const note = SOLUBILITY_TEXT.reactingNote('Gases and heat as signs of a reaction')
    expect(note).toBe(`${SOLUBILITY_TEXT.mark} Ammonium ions and hydroxide ions make no solid together, but they do react: they give ammonia. See "Gases and heat as signs of a reaction" in the primer.`)
    expect(SOLUBILITY_TEXT.marked).toBe('see the note under the table')
    // It gives no formula and no state, so nothing of an equation as it is entered.
    expect(note).not.toMatch(/[₀-₉⁺⁻→]|\((aq|s|l|g)\)/)
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
      ...ids.flatMap((id) => [stationTitle(data, id), ...expectedLines(data, id), ...TOOL_USES.map((tool) => toolOutcome(data, id, tool))]),
    ]
    for (const text of all) expect(findInstitutionText(text, []), text).toBeNull()
  })
})
