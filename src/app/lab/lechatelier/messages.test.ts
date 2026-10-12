import { describe, expect, it } from 'vitest'
import { findInstitutionText } from '@/chem-data/denylist'
import { CAUSES, DISTURBANCE_IDS, SYSTEM_IDS, TUBE_IDS, WAYS, disturbanceOf, lechatelierData, parameterOf, type DisturbanceId, type SystemId } from '@/chem-data/lechatelier/data'
import { createLab, modelFrom, systemView, type Blocked, type LechatelierState, type Reason, type Temperature, type TubeShows } from '@/engine/lechatelier'
import { run, wholeSystem, workDisturbance } from '@/engine/lechatelier/testkit'
import {
  ANSWER_TEXT,
  BATH_LABEL,
  CAUSE_LABEL,
  DISTURBANCE_STATUS_TEXT,
  EQUILIBRIUM_TEXT,
  FIELD_LABEL,
  HINT,
  LAB_TEXT,
  LOOK_PART,
  MODE_TEXT,
  NOTES_TEXT,
  OBSERVATION_TEXT,
  PAGE_TEXT,
  PREDICTION_TEXT,
  PROGRESS_TEXT,
  RECORD_TEXT,
  SOURCES_TEXT,
  SYSTEM_AIM,
  TEMPERATURE_TEXT,
  TUBE_NAME,
  WAY_CHOICES,
  WAY_LABEL,
  actionLabel,
  answerLabel,
  askText,
  benchLines,
  blockedText,
  checkedText,
  choiceLabel,
  choiceList,
  disturbanceEquations,
  disturbanceNotes,
  disturbanceTitle,
  doneText,
  dropsText,
  equilibriumLines,
  lookLabel,
  lookText,
  mismatchText,
  observationLines,
  outcomeText,
  progressOf,
  reasonText,
  systemName,
  systemNumber,
  systemShortName,
  taskText,
  tubeShortName,
  tubeSoFarText,
  tubeStartText,
  tubeText,
  tubesLabel,
} from './messages'

const data = lechatelierData
const m = modelFrom(data)
/** Words that would say what a tube shows, or which way it went. */
const SEEN = /white|yellow|blue|violet|pink|colourless|dissolves|comes back|came back|a solid forms/i
const systemOfDisturbance = (id: DisturbanceId): SystemId => disturbanceOf(data, id).system.id

/** Every tube the lab can show: each disturbance's tube before it and after every press, with where it stands. */
const tubes: { id: DisturbanceId; press: number; shows: TubeShows; temperature: Temperature }[] = []
for (const systemId of SYSTEM_IDS) {
  let state: LechatelierState = createLab('challenge')
  for (const disturbance of disturbanceOf(data, data.systems.find((s) => s.id === systemId)!.disturbances[0]!.id).system.disturbances) {
    const current = () => systemView(m, state, systemId).disturbances.find((d) => d.id === disturbance.id)!
    tubes.push({ id: disturbance.id, press: 0, shows: current().shows!, temperature: current().temperature! })
    state = run(m, state, [{ type: 'predict', system: systemId, way: 'none' }])
    for (let press = 1; press <= disturbance.stages.length; press++) {
      state = run(m, state, [{ type: 'act', system: systemId }])
      tubes.push({ id: disturbance.id, press, shows: current().shows!, temperature: current().temperature! })
    }
    state = workDisturbanceFrom(state, systemId)
  }
}
/** Finishes the disturbance a system is at, whose action is complete: both looks, what is seen, and the right answer. */
function workDisturbanceFrom(state: LechatelierState, systemId: SystemId): LechatelierState {
  const view = systemView(m, state, systemId)
  const d = view.disturbances.find((other) => other.id === view.disturbance)!
  const right = disturbanceOf(data, d.id).disturbance.ask.right
  return run(m, state, [
    { type: 'look', system: systemId, at: 'liquid' },
    { type: 'look', system: systemId, at: 'bottom' },
    { type: 'observe', system: systemId, observation: { solid: d.shows!.solid?.colour ?? 'none', liquid: d.shows!.liquid!.colour } },
    { type: 'answer', system: systemId, is: right },
  ])
}

describe('the description in words of every tube (spec 18.7, last item)', () => {
  it('covers every tube the lab can show: thirty-eight of them, of ten kinds', () => {
    expect(tubes.length).toBe(DISTURBANCE_IDS.length + data.systems.flatMap((s) => s.disturbances.flatMap((d) => d.stages)).length)
    expect(tubes.length).toBe(38)
    const kinds = new Set(tubes.map((t) => `${t.shows.liquid!.colour}/${t.shows.solid?.colour ?? 'none'}/${t.temperature}`))
    expect([...kinds].sort()).toEqual([
      'between blue and yellow/none/room',
      'blue/none/hot',
      'blue/none/room',
      'colourless/none/hot',
      'colourless/none/room',
      'colourless/white/cold',
      'colourless/white/room',
      'pink/none/cold',
      'violet/none/room',
      'yellow/none/room',
    ].sort())
  })

  it('says each kind in a sentence or two, as it is seen, and where the tube stands', () => {
    const said = (id: DisturbanceId, press: number) => {
      const tube = tubes.find((t) => t.id === id && t.press === press)!
      return tubeText(tube.shows, tube.temperature)
    }
    expect(said('lead-acid', 0)).toBe('The tube holds a liquid that is clear and colourless. There is no solid in it. The tube stands in the rack, at room temperature.')
    expect(said('lead-acid', 1)).toBe(said('lead-acid', 0))
    expect(said('lead-acid', 2)).toBe('A white solid lies at the bottom of the tube. The liquid over it is clear and colourless. The tube stands in the rack, at room temperature.')
    expect(said('lead-heat', 1)).toBe('The tube holds a liquid that is clear and colourless. There is no solid in it. The tube stands in the bath of boiling water.')
    expect(said('lead-cool', 1)).toBe('A white solid lies at the bottom of the tube. The liquid over it is clear and colourless. The tube stands in the bath of ice water.')
    expect(said('indicator-acid', 0)).toBe('The tube holds a liquid that is clear and violet. There is no solid in it. The tube stands in the rack, at room temperature.')
    expect(said('indicator-acid', 1)).toBe('The tube holds a liquid that is clear, and between blue and yellow in colour. There is no solid in it. The tube stands in the rack, at room temperature.')
    expect(said('indicator-acid', 2)).toBe('The tube holds a liquid that is clear and yellow. There is no solid in it. The tube stands in the rack, at room temperature.')
    expect(said('cobalt-water', 0)).toBe('The tube holds a liquid that is clear and blue. There is no solid in it. The tube stands in the rack, at room temperature.')
    expect(said('cobalt-water', 1)).toBe('The tube holds a liquid that is clear and violet. There is no solid in it. The tube stands in the rack, at room temperature.')
    expect(said('cobalt-heat', 0)).toBe(said('cobalt-water', 1))
    expect(said('cobalt-heat', 1)).toBe('The tube holds a liquid that is clear and blue. There is no solid in it. The tube stands in the bath of boiling water.')
    expect(said('cobalt-cool', 1)).toBe('The tube holds a liquid that is clear and pink. There is no solid in it. The tube stands in the bath of ice water.')
    expect(said('magnesium-ammonia', 1)).toBe(said('lead-acid', 2))
    expect(said('zinc-ammonia', 1)).toBe(said('lead-acid', 0))
    expect(tubeText(null)).toBe('The tube is not in use yet.')
  })

  it("names the bath in the picture by the words of the sentence that says where the tube stands, and has no word for a tube in the rack", () => {
    expect(Object.keys(BATH_LABEL)).toEqual(['hot', 'cold'])
    for (const temperature of ['hot', 'cold'] as const) expect(TEMPERATURE_TEXT[temperature]).toBe(`The tube stands in the bath of ${BATH_LABEL[temperature]}.`)
    expect(BATH_LABEL.hot).not.toBe(BATH_LABEL.cold)
  })

  it('names the colour of the liquid and of the solid wherever there is one, and never says what anything is', () => {
    for (const { id, press, shows, temperature } of tubes) {
      const text = tubeText(shows, temperature)
      expect(text, `${id} ${press}`).toContain(shows.liquid!.colour)
      if (shows.solid) expect(text).toContain(`${shows.solid.colour} solid`)
      else expect(text).toContain('no solid')
      expect(text).toContain(TEMPERATURE_TEXT[temperature])
      expect(text).not.toMatch(/chloride|hydroxide|lead|zinc|magnesium|cobalt|methyl|ion|acid|indicator|complex|equilibrium|shift/i)
    }
  })

  it('says of each part of a tube what is seen there, and the two looks together say what the whole description says', () => {
    for (const { shows } of tubes) {
      const [liquid, bottom] = [lookText(shows, 'liquid'), lookText(shows, 'bottom')]
      expect(liquid).toContain(shows.liquid!.colour)
      expect(liquid).toMatch(/^The liquid is clear/)
      expect(bottom).toBe(shows.solid ? `A ${shows.solid.colour} solid lies at the bottom.` : 'No solid is at the bottom.')
      // Nothing in a look that the whole description does not hold.
      expect(tubeText(shows)).toContain(liquid.replace('The liquid is ', '').replace(/\.$/, ''))
    }
    expect(lookText({ liquid: { colour: 'between blue and yellow', cloudy: false, microlitres: 1 }, solid: null }, 'liquid')).toBe('The liquid is clear, and between blue and yellow in colour.')
  })

  it('words the tubes this lab never shows, which the shared shape of a tube allows: a cloudy liquid, a solid alone, an empty tube', () => {
    const cloudy: TubeShows = { liquid: { colour: 'colourless', cloudy: true, microlitres: 500 }, solid: { colour: 'white', settled: false } }
    expect(tubeText(cloudy)).toBe('The tube holds a cloudy liquid: a white solid is spread through it.')
    expect(lookText(cloudy, 'liquid')).toBe('The liquid is cloudy: a white solid is spread through it.')
    expect(lookText(cloudy, 'bottom')).toBe('Nothing has settled at the bottom yet.')
    expect(tubeText({ liquid: null, solid: { colour: 'white', settled: true } })).toBe('A white solid lies at the bottom of the tube, with no liquid over it.')
    expect([lookText({ liquid: null, solid: null }, 'liquid'), lookText({ liquid: null, solid: null }, 'bottom'), tubeText({ liquid: null, solid: null })]).toEqual(['There is no liquid in the tube.', 'The tube is empty.', 'The tube is not in use yet.'])
  })
})

describe('the lab, its systems and their benches', () => {
  it("has a short name for each system, for the button that chooses it: what stands after the colon of the record's name", () => {
    expect(SYSTEM_IDS.map((id) => systemShortName(data, id))).toEqual(['Lead chloride', 'Methyl violet', 'Cobalt', 'Zinc and magnesium'])
    // Every name of the record has the one colon the short name is cut at.
    for (const id of SYSTEM_IDS) expect(systemName(data, id).split(': ')).toHaveLength(2)
  })

  it('names the lab and its four systems, and says what each is without a word of what a tube shows', () => {
    expect(LAB_TEXT.title).toBe("Le Chatelier's principle")
    expect(SYSTEM_IDS.map((id) => `${systemNumber(id)}. ${systemName(data, id)}`)).toEqual(['System 1. A solid and its ions: lead chloride', 'System 2. An indicator: methyl violet', 'System 3. A complex ion: cobalt', 'System 4. Two hydroxides: zinc and magnesium'])
    for (const id of SYSTEM_IDS) expect(SYSTEM_AIM[id], id).not.toMatch(SEEN)
    expect(LAB_TEXT.aim).not.toMatch(SEEN)
  })

  it('says what is on the bench of each system: its tubes to begin with, the bottles it adds from, and the baths where it uses them', () => {
    expect(benchLines(data, 'lead-chloride')).toEqual(['The tube: 30 drops (1.5 mL) of lead(II) nitrate solution, 0.3 M.', 'To add, each from a dropper bottle: hydrochloric acid, 0.3 M.', 'Distilled water.', 'A bath of boiling water and a bath of ice water.'])
    expect(benchLines(data, 'methyl-violet')).toEqual(['The tube: 20 drops (1 mL) of distilled water and 2 drops of methyl violet indicator solution.', 'To add, each from a dropper bottle: hydrochloric acid, 6 M; sodium hydroxide solution, 6 M.'])
    expect(benchLines(data, 'cobalt')).toEqual(['The tube: about 0.1 g of cobalt(II) chloride hexahydrate, solid, dissolved in 30 drops (1.5 mL) of hydrochloric acid, 12 M.', 'Distilled water.', 'A bath of boiling water and a bath of ice water.'])
    expect(benchLines(data, 'hydroxides')).toEqual([
      'Zinc, first tube: 60 drops (3 mL) of zinc nitrate solution, 0.1 M.',
      'Magnesium, first tube: 60 drops (3 mL) of magnesium nitrate solution, 0.1 M.',
      'To add, each from a dropper bottle: sodium hydroxide solution, 6 M; hydrochloric acid, 6 M; ammonia solution, 6 M.',
      'Six small test tubes, clean and empty, for the shares.',
    ])
  })

  it('names every tube, and says what each holds to begin with', () => {
    expect(Object.keys(TUBE_NAME)).toEqual([...TUBE_IDS])
    // Among the tubes of its metal a tube is named by what it is for, and the list by the metal.
    expect((['zinc', 'zinc-acid', 'zinc-base', 'zinc-ammonia'] as const).map(tubeShortName)).toEqual(['First tube', 'For acid', 'For more sodium hydroxide', 'For ammonia'])
    expect((['magnesium', 'magnesium-acid', 'magnesium-base', 'magnesium-ammonia'] as const).map(tubeShortName)).toEqual(['First tube', 'For acid', 'For more sodium hydroxide', 'For ammonia'])
    expect(tubesLabel(['magnesium', 'magnesium-acid', 'magnesium-base', 'magnesium-ammonia'])).toBe('The four tubes of magnesium')
    expect(tubeStartText(data, 'lead-chloride', 'lead')).toBe('This tube holds 30 drops (1.5 mL) of lead(II) nitrate solution, 0.3 M.')
    expect(tubeStartText(data, 'hydroxides', 'zinc-ammonia')).toBe('This tube holds 10 drops (0.5 mL) of the stirred mixture from the first zinc tube.')
    expect(tubeStartText(data, 'hydroxides', 'magnesium-acid')).toBe('This tube holds 10 drops (0.5 mL) of the stirred mixture from the first magnesium tube.')
    for (const system of data.systems) for (const tube of system.tubes) expect(tubeStartText(data, system.id, tube.id).replace(/methyl violet/gi, ''), tube.id).not.toMatch(SEEN)
  })

  it('says what has gone into a tube before each disturbance, in the order it went, and nothing of what came of it', () => {
    expect(tubeSoFarText(data, 'lead-acid')).toBe('This tube holds 30 drops (1.5 mL) of lead(II) nitrate solution, 0.3 M.')
    expect(tubeSoFarText(data, 'lead-water')).toBe('This tube began with 30 drops (1.5 mL) of lead(II) nitrate solution, 0.3 M. Then 6 drops of hydrochloric acid, 0.3 M, went in. Then it stood in the bath of boiling water. Then it stood in the bath of ice water.')
    expect(tubeSoFarText(data, 'indicator-base')).toBe('This tube began with 20 drops (1 mL) of distilled water and 2 drops of methyl violet indicator solution. Then 6 drops of hydrochloric acid, 6 M, went in.')
    expect(tubeSoFarText(data, 'cobalt-heat')).toBe('This tube began with about 0.1 g of cobalt(II) chloride hexahydrate, solid, dissolved in 30 drops (1.5 mL) of hydrochloric acid, 12 M. Then 20 drops (1 mL) of distilled water went in.')
    // A share begins with what it was shared from, whose own drop of sodium hydroxide is said at the tube it went into.
    expect(tubeSoFarText(data, 'zinc-base')).toBe('This tube holds 10 drops (0.5 mL) of the stirred mixture from the first zinc tube.')
    for (const id of DISTURBANCE_IDS) expect(tubeSoFarText(data, id).replace(/methyl violet/gi, ''), id).not.toMatch(SEEN)
  })

  it('writes a count of drops with its volume from half a millilitre up', () => {
    expect([1, 2, 3, 9, 10, 20, 30, 60, 80].map((drops) => dropsText(data, drops))).toEqual(['1 drop', '2 drops', '3 drops', '9 drops', '10 drops (0.5 mL)', '20 drops (1 mL)', '30 drops (1.5 mL)', '60 drops (3 mL)', '80 drops (4 mL)'])
  })
})

describe('a disturbance', () => {
  it('is headed by its equilibrium as written, with what stands on each side and the colour that tells it', () => {
    expect(equilibriumLines(data, 'lead-heat')).toEqual({ equation: 'Pb²⁺(aq) + 2Cl⁻(aq) ⇌ PbCl₂(s)', left: 'Left side: lead ions and chloride ions, dissolved.', right: 'Right side: solid lead chloride, which is white.', between: null })
    expect(equilibriumLines(data, 'indicator-acid')).toEqual({ equation: 'HMV(aq) ⇌ H⁺(aq) + MV⁻(aq)', left: 'Left side: the yellow form of methyl violet, which holds a hydrogen ion.', right: 'Right side: a hydrogen ion, and the violet form of methyl violet.', between: null })
    // Cobalt's card says a third thing, which the first disturbance is read by: what a liquid that holds both ions looks like.
    expect(equilibriumLines(data, 'cobalt-water')).toEqual({
      equation: '[Co(H₂O)₆]²⁺(aq) + 4Cl⁻(aq) ⇌ [CoCl₄]²⁻(aq) + 6H₂O(l)',
      left: 'Left side: the pink ion of cobalt with water, and chloride ions.',
      right: 'Right side: the blue ion of cobalt with chloride, and water.',
      between: 'A liquid that holds both is violet.',
    })
    expect(equilibriumLines(data, 'cobalt-cool')).toEqual(equilibriumLines(data, 'cobalt-water'))
    expect(equilibriumLines(data, 'magnesium-base').equation).toBe('Mg²⁺(aq) + 2OH⁻(aq) ⇌ Mg(OH)₂(s)')
    // The card is the same at every disturbance of an equilibrium: it gives no answer away.
    expect(equilibriumLines(data, 'lead-acid')).toEqual(equilibriumLines(data, 'lead-water'))
    expect(equilibriumLines(data, 'zinc-drop')).toEqual(equilibriumLines(data, 'zinc-ammonia'))
    expect(EQUILIBRIUM_TEXT.heading).toBe('The equilibrium, as written')
  })

  it('has a title, and says what is about to be done without a word of what will be seen', () => {
    expect(DISTURBANCE_IDS.map((id) => disturbanceTitle(data, id)).slice(0, 5)).toEqual(['Disturbance 1 of 4: Add hydrochloric acid', 'Disturbance 2 of 4: Heat the tube', 'Disturbance 3 of 4: Cool the tube', 'Disturbance 4 of 4: Add water', 'Disturbance 1 of 2: Add hydrochloric acid'])
    expect(disturbanceTitle(data, 'magnesium-ammonia')).toBe('Disturbance 8 of 8: Magnesium, ammonia')
    expect(taskText(data, 'lead-acid')).toBe('Add hydrochloric acid, 0.3 M, to the tube: 2 drops at a time, three times. Look at the tube after each portion.')
    expect(taskText(data, 'lead-heat')).toBe('Stand the tube in the bath of boiling water.')
    expect(taskText(data, 'lead-cool')).toBe('Stand the tube in the bath of ice water.')
    expect(taskText(data, 'lead-water')).toBe('Add 60 drops (3 mL) of distilled water to the tube.')
    expect(taskText(data, 'indicator-base')).toBe('Add sodium hydroxide solution, 6 M, to the tube: 3 drops at a time, twice. Look at the tube after each portion.')
    expect(taskText(data, 'cobalt-water')).toBe('Add 20 drops (1 mL) of distilled water to the tube.')
    expect(taskText(data, 'zinc-drop')).toBe('Add 1 drop of sodium hydroxide solution, 6 M, to the tube.')
    expect(taskText(data, 'zinc-ammonia')).toBe('Add 80 drops (4 mL) of ammonia solution, 6 M, to the tube.')
    for (const id of DISTURBANCE_IDS) for (const text of [taskText(data, id), disturbanceTitle(data, id)]) expect(text.replace(/methyl violet/gi, ''), id).not.toMatch(SEEN)
  })

  it('names its button by what it does, with the amount that goes in at a press', () => {
    expect(DISTURBANCE_IDS.map((id) => actionLabel(data, id))).toEqual([
      'Add 2 drops of hydrochloric acid, 0.3 M',
      'Heat the tube in boiling water',
      'Cool the tube in ice water',
      'Add 60 drops (3 mL) of distilled water',
      'Add 3 drops of hydrochloric acid, 6 M',
      'Add 3 drops of sodium hydroxide solution, 6 M',
      'Add 20 drops (1 mL) of distilled water',
      'Heat the tube in boiling water',
      'Cool the tube in ice water',
      ...['zinc', 'magnesium'].flatMap(() => ['Add 1 drop of sodium hydroxide solution, 6 M', 'Add 1 drop of hydrochloric acid, 6 M', 'Add 20 drops (1 mL) of sodium hydroxide solution, 6 M', 'Add 80 drops (4 mL) of ammonia solution, 6 M']),
    ])
    // The amounts are the record's.
    for (const id of DISTURBANCE_IDS) {
      const { action } = disturbanceOf(data, id).disturbance
      if (action.kind === 'add') expect(actionLabel(data, id)).toContain(`${parameterOf(data, action.drops)} drop`)
    }
  })

  it('says what has been done to its tube so far, and nothing of what came of it', () => {
    expect([0, 1, 2, 3].map((acted) => doneText({ kind: 'add', portions: 3, acted }))).toEqual(['Nothing has been added yet.', '1 of 3 portions has gone in.', '2 of 3 portions have gone in.', 'All 3 portions have gone in.'])
    expect([0, 1].map((acted) => doneText({ kind: 'add', portions: 1, acted }))).toEqual(['Nothing has been added yet.', 'It has been added.'])
    expect([0, 1].map((acted) => doneText({ kind: 'heat', portions: 1, acted }))).toEqual(['The tube has not been heated yet.', 'The tube has stood in the boiling water.'])
    expect([0, 1].map((acted) => doneText({ kind: 'cool', portions: 1, acted }))).toEqual(['The tube has not been cooled yet.', 'The tube has stood in the ice water.'])
    // Every state of every disturbance of a careful lab has its sentence.
    for (const systemId of SYSTEM_IDS) wholeSystem(m, createLab('guided'), systemId, {}, (state) => (systemView(m, state, systemId).disturbances.forEach((d) => expect(doneText(d)).not.toMatch(SEEN)), state))
  })

  it('has a hint for Guided at every disturbance, which says how to think and neither what the tube shows nor which answer is right', () => {
    expect(Object.keys(HINT)).toEqual([...DISTURBANCE_IDS])
    for (const id of DISTURBANCE_IDS) {
      expect(HINT[id], id).not.toMatch(SEEN)
      // No hint names a side: which side is whose is on the equilibrium's card, and which way it went is the question.
      expect(HINT[id], id).not.toMatch(/\b(left|right)\b|toward the (ions|solid)/i)
      expect(HINT[id].split(/\s+/).length, id).toBeLessThanOrEqual(60)
    }
    // The two metals have the same hints, so that a hint says nothing of which metal has a second equilibrium.
    for (const kind of ['drop', 'acid', 'base', 'ammonia'] as const) expect(HINT[`zinc-${kind}`]).toBe(HINT[`magnesium-${kind}`])
  })
})

describe('the prediction', () => {
  it('is asked before the change, with the three ways, each named by the way alone, and says that it is not marked', () => {
    // What stands on each side is said once, in the card of the equilibrium, which stands over the form: a choice does not say it again.
    expect(WAY_CHOICES).toEqual([
      { value: 'left', label: 'Toward the left side' },
      { value: 'right', label: 'Toward the right side' },
      { value: 'none', label: 'Not at all' },
    ])
    for (const id of DISTURBANCE_IDS) for (const side of [equilibriumLines(data, id).left, equilibriumLines(data, id).right]) expect(side).toMatch(/^(Left|Right) side: .+\.$/)
    expect(PREDICTION_TEXT.help).toMatch(/not marked/)
    expect(WAYS.map((way) => PREDICTION_TEXT.said(way))).toEqual(['You predicted: toward the left side.', 'You predicted: toward the right side.', 'You predicted: not at all.'])
    expect(PREDICTION_TEXT.fixed).toBe('Your prediction is fixed: the change has begun.')
    expect(Object.keys(WAY_LABEL)).toEqual([...WAYS])
  })
})

describe('the observation', () => {
  it("asks two questions, with the record's words for the choices", () => {
    expect(FIELD_LABEL).toEqual({ solid: 'Solid in the tube', liquid: 'Colour of the liquid' })
    expect(choiceList(m, 'solid')).toEqual([{ value: 'none', label: 'no solid' }, { value: 'white', label: 'a white solid' }])
    expect(choiceList(m, 'liquid').map((c) => c.value)).toEqual(data.choices.liquid)
    expect(choiceList(m, 'liquid').every((c) => c.label === c.value)).toBe(true)
    expect(observationLines({ solid: 'white', liquid: 'colourless' })).toEqual(['Solid in the tube: a white solid.', 'Colour of the liquid: colourless.'])
    expect(choiceLabel('solid', 'none')).toBe('no solid')
    expect(lookLabel('liquid', false)).toBe('Look at the liquid')
    expect(lookLabel('bottom', true)).toBe('Look at the bottom of the tube, looked at')
    expect(Object.keys(LOOK_PART)).toEqual(['liquid', 'bottom'])
  })

  it('says which part to look at again, and never what it should be', () => {
    expect(mismatchText([])).toBe('')
    expect(mismatchText(['solid'])).toBe('Not yet. Look again at the solid.')
    expect(mismatchText(['solid', 'liquid'])).toBe('Not yet. Look again at the solid and the colour of the liquid.')
    expect(checkedText([])).toBe('Checked: this is what the tube showed.')
    expect(checkedText(['liquid'])).toBe('Checked: the colour of the liquid is not what the tube showed.')
    expect(checkedText(['solid', 'liquid'])).toBe('Checked: the solid and the colour of the liquid are not what the tube showed.')
    for (const text of [mismatchText(['solid', 'liquid']), checkedText(['solid', 'liquid']), OBSERVATION_TEXT.actFirst, OBSERVATION_TEXT.lookFirst]) expect(text).not.toMatch(SEEN)
  })
})

describe('the question of a disturbance', () => {
  it('asks which way the equilibrium went, with the same three choices as the prediction', () => {
    const asked = askText(data, 'cobalt-heat')
    expect([asked.heading, asked.question]).toEqual(['Which way it went', 'Which way did the equilibrium shift?'])
    expect(asked.choices).toEqual(WAY_CHOICES)
  })

  it('asks, at the four tubes that turn on a second equilibrium or on there being none, what took the metal ion away', () => {
    const asked = (['zinc-base', 'zinc-ammonia', 'magnesium-base', 'magnesium-ammonia'] as const).map((id) => askText(data, id))
    expect(asked.map((a) => a.heading)).toEqual(['What took the zinc ion away', 'What took the zinc ion away', 'What took the magnesium ion away', 'What took the magnesium ion away'])
    expect(asked[0]!.question).toBe('By the equilibrium as written, what was added should give more solid. Did something take the zinc ion out of this equilibrium instead?')
    // The same choices at all four, and the same question but for the metal's name: nothing in it says which tubes have a solid left.
    for (const a of asked) expect(a.choices).toEqual(CAUSES.map((value) => ({ value, label: CAUSE_LABEL[value] })))
    expect(asked[2]!.question).toBe(asked[0]!.question.replace('zinc', 'magnesium'))
    expect(asked[1]).toEqual(asked[0])
  })

  it('offers at every disturbance the choices its model takes, and words each answer as it was given', () => {
    for (const id of DISTURBANCE_IDS) {
      const { ask } = disturbanceOf(data, id).disturbance
      expect(askText(data, id).choices.map((c) => c.value), id).toEqual(ask.kind === 'direction' ? [...WAYS] : [...CAUSES])
    }
    expect([...WAYS, ...CAUSES].map(answerLabel)).toEqual(['Toward the left side', 'Toward the right side', 'Not at all', 'Hydroxide ions', 'Ammonia', 'Nothing did'])
    expect(ANSWER_TEXT.once).toBe('You answer once: that ends the disturbance and opens its notes.')
  })
})

describe('refusals', () => {
  const BLOCKED: Blocked[] = ['unknown-system', 'system-checked', 'all-done', 'not-all-done', 'predict-first', 'prediction-fixed', 'action-done', 'act-first', 'look-first', 'observe-first', 'invalid-entry', 'nothing-to-repeat', 'no-more-runs', 'run-too-long', 'does-not-match', 'not-right']

  it('have a sentence for every reason an action can be refused, none of which says what a tube shows or which answer is right', () => {
    const said = BLOCKED.flatMap((blocked) => [blockedText(data, blocked), ...DISTURBANCE_IDS.map((id) => blockedText(data, blocked, id))])
    expect(new Set(BLOCKED.map((blocked) => blockedText(data, blocked))).size).toBe(BLOCKED.length)
    for (const text of said) {
      expect(text.length).toBeGreaterThan(20)
      expect(text.replace(/methyl violet/gi, '')).not.toMatch(SEEN)
      expect(text).not.toMatch(/\b(left|right) side\b/)
    }
    expect(blockedText(data, 'act-first', 'lead-acid')).toBe('First: add 2 drops of hydrochloric acid, 0.3 M, every portion of it.')
    expect(blockedText(data, 'act-first', 'lead-heat')).toBe('First: heat the tube in boiling water.')
    expect(blockedText(data, 'act-first')).toBe('First: make the change.')
    expect(blockedText(data, 'predict-first')).toMatch(/It is not marked\.$/)
    expect(blockedText(data, 'not-right')).toBe('Not that one. Look at what changed in the tube, find it in the equilibrium as written, and try again.')
    // The question of what took the metal ion away has a refusal of its own, the same at its four tubes: what changed there is whether the solid is left, and ammonia is not in the equilibrium as written.
    const direction = DISTURBANCE_IDS.filter((id) => disturbanceOf(data, id).disturbance.ask.kind === 'direction')
    const cause = DISTURBANCE_IDS.filter((id) => disturbanceOf(data, id).disturbance.ask.kind === 'cause')
    expect(cause).toEqual(['zinc-base', 'zinc-ammonia', 'magnesium-base', 'magnesium-ammonia'])
    for (const id of direction) expect(blockedText(data, 'not-right', id)).toBe(blockedText(data, 'not-right'))
    for (const id of cause) expect(blockedText(data, 'not-right', id)).toBe('Not that one. Look whether the solid is still there, think what went into this tube in a large amount, and try again.')
  })

  it('are the sentences the engine\'s refusals get, at every point of a careful run', () => {
    // Each refusal the engine can give in a lab is one of the list above.
    const state = workDisturbance(m, createLab('guided'), 'cobalt')
    expect(blockedText(data, 'observe-first', systemView(m, state, 'cobalt').disturbance)).toBe('Record what you see in the tube first.')
  })
})

describe('how a system came out', () => {
  const REASONS: Reason[] = [
    { kind: 'observation-wrong', disturbance: 'lead-heat' },
    { kind: 'answer-wrong', disturbance: 'zinc-base' },
  ]

  it('names each cause a run does not count for, with its disturbance, and never what was right', () => {
    expect(REASONS.map((reason) => reasonText(data, reason))).toEqual(['What was recorded at disturbance 2 (heat the tube) is not what the tube showed.', 'The answer at disturbance 3 (zinc, more sodium hydroxide) is not right.'])
    for (const id of DISTURBANCE_IDS) for (const kind of ['observation-wrong', 'answer-wrong'] as const) expect(reasonText(data, { kind, disturbance: id }).replace(/methyl violet/gi, ''), id).not.toMatch(SEEN)
  })

  it('says that a system is to be checked, that it counts, or that it does not and where', () => {
    expect(outcomeText(data, { state: 'open' })).toBe('')
    expect(outcomeText(data, { state: 'to-check' })).toBe('Every disturbance of this system is done. Have the system checked.')
    expect(outcomeText(data, { state: 'counts' })).toBe('This system counts: each observation is what its tube showed, and each answer is right.')
    expect(outcomeText(data, { state: 'does-not-count', reasons: REASONS })).toBe('This run does not count. What was recorded at disturbance 2 (heat the tube) is not what the tube showed. The answer at disturbance 3 (zinc, more sodium hydroxide) is not right. Work the system again.')
  })

  it('says how far a system has come', () => {
    const lab = createLab('challenge')
    const at = (state: LechatelierState) => progressOf(systemView(m, state, 'cobalt'))
    expect(at(lab)).toBe('not-started')
    expect(at(run(m, lab, [{ type: 'look', system: 'cobalt', at: 'liquid' }]))).toBe('under-way')
    expect(at(run(m, lab, [{ type: 'predict', system: 'cobalt', way: 'left' }]))).toBe('under-way')
    expect(at(wholeSystem(m, lab, 'cobalt', { check: false }))).toBe('to-check')
    expect(at(wholeSystem(m, lab, 'cobalt', { wrongAnswerAt: 'cobalt-cool' }))).toBe('not-counted')
    const done = wholeSystem(m, lab, 'cobalt')
    expect(at(done)).toBe('done')
    // A system that counts stays done while it is worked again.
    expect(at(run(m, done, [{ type: 'workAgain', system: 'cobalt' }]))).toBe('done')
    expect(Object.keys(PROGRESS_TEXT)).toEqual(['not-started', 'under-way', 'to-check', 'not-counted', 'done'])
    expect(Object.keys(DISTURBANCE_STATUS_TEXT)).toEqual(['waiting', 'current', 'done'])
  })
})

describe('the notes and the modes', () => {
  it("hands over a disturbance's notes and equations as the record has them", () => {
    for (const id of DISTURBANCE_IDS) {
      const { disturbance } = disturbanceOf(data, id)
      expect(disturbanceNotes(data, id)).toEqual(disturbance.notes.map((note) => note.value))
      expect(disturbanceEquations(data, id)).toEqual((disturbance.equations ?? []).map((e) => e.value))
    }
    expect(disturbanceEquations(data, 'zinc-ammonia')).toEqual(['Zn²⁺(aq) + 4NH₃(aq) ⇌ [Zn(NH₃)₄]²⁺(aq)'])
    expect(disturbanceEquations(data, 'lead-heat')).toEqual([])
    expect(NOTES_TEXT.later).toBe('The notes on this disturbance come once it is done.')
  })

  it('says what each mode does', () => {
    expect(MODE_TEXT.guided).toMatch(/^Guided: the lab checks each observation and each answer as you give it/)
    expect(MODE_TEXT.challenge).toMatch(/^Challenge: no hints\./)
  })
})

describe('the notes of the record, which a page shows once a disturbance is done', () => {
  const notes = DISTURBANCE_IDS.flatMap((id) => disturbanceNotes(data, id).map((note) => [id, note] as const))

  it('are short: one to two notes at a disturbance, none over 60 words', () => {
    for (const id of DISTURBANCE_IDS) expect(disturbanceNotes(data, id).length, id).toBeLessThanOrEqual(2)
    for (const [id, note] of notes) expect(note.split(/\s+/).length, id).toBeLessThanOrEqual(60)
  })

  it('say which way the equilibrium went, or what took the ion away, in the words the answer has', () => {
    for (const id of DISTURBANCE_IDS) {
      const { disturbance } = disturbanceOf(data, id)
      const text = disturbanceNotes(data, id).join(' ')
      if (disturbance.ask.kind === 'direction') expect(text, id).toContain(`a shift to the ${disturbance.ask.right}`)
      else if (disturbance.ask.right === 'nothing') expect(text, id).toMatch(/Nothing took the magnesium ion away|the white solid stayed/)
      else expect(text, id).toMatch(disturbance.ask.right === 'hydroxide' ? /What took the zinc ion away was hydroxide itself/ : /four ammonia molecules make a complex ion/)
      // And of the other way, nothing that could be read as the answer.
      if (disturbance.ask.kind === 'direction') expect(text, id).not.toContain(`a shift to the ${disturbance.ask.right === 'left' ? 'right' : 'left'}`)
    }
  })

  it('give the heat that dissolving lead chloride takes in as the record works it out', () => {
    expect(data.heats[0]!.enthalpy.value).toBe(23.392)
    expect(disturbanceNotes(data, 'lead-heat')[1]).toContain('about 23 kJ for each mole')
  })

  it('say truthfully that the cobalt tube warms as water goes into the concentrated acid, and that the tube is shown once it has cooled', () => {
    expect(disturbanceNotes(data, 'cobalt-water')[1]).toBe('Concentrated hydrochloric acid gives off heat when water is added to it, so a real tube warms. Warmth moves this system toward blue, against the water. This lab shows the tube once it is back at room temperature.')
  })
})

describe('every sentence of the page', () => {
  /** Every fixed string and every sentence a function gives for the cases above, as one list. */
  function sentences(): string[] {
    const fixed = [LAB_TEXT, SYSTEM_AIM, TUBE_NAME, TEMPERATURE_TEXT, BATH_LABEL, WAY_LABEL, LOOK_PART, FIELD_LABEL, OBSERVATION_TEXT, CAUSE_LABEL, ANSWER_TEXT, HINT, MODE_TEXT, PROGRESS_TEXT, DISTURBANCE_STATUS_TEXT, NOTES_TEXT, RECORD_TEXT, EQUILIBRIUM_TEXT].flatMap((group) => Object.values(group))
    const nested = [...Object.values(PAGE_TEXT).flatMap((v) => (typeof v === 'string' ? [v] : [])), ...Object.values(PREDICTION_TEXT).flatMap((v) => (typeof v === 'string' ? [v] : [])), PAGE_TEXT.previous('x'), PAGE_TEXT.next('x'), PAGE_TEXT.run(2), PAGE_TEXT.tubePicture('The tube')]
    const made = [
      ...SYSTEM_IDS.flatMap((id) => [...benchLines(data, id), systemNumber(id), systemName(data, id), systemShortName(data, id)]),
      ...data.systems.flatMap((system) => system.tubes.map((tube) => tubeStartText(data, system.id, tube.id))),
      ...DISTURBANCE_IDS.map((id) => tubeSoFarText(data, id)),
      // The equation itself is the record's, and is a source's as written: it is left out, as every equation is.
      ...DISTURBANCE_IDS.flatMap((id) => [disturbanceTitle(data, id), taskText(data, id), actionLabel(data, id), equilibriumLines(data, id).left, equilibriumLines(data, id).right, equilibriumLines(data, id).between, askText(data, id).heading, askText(data, id).question, ...askText(data, id).choices.map((c) => c.label)]),
      ...tubes.flatMap(({ shows, temperature }) => [tubeText(shows, temperature), lookText(shows, 'liquid'), lookText(shows, 'bottom')]),
      ...WAYS.map((way) => PREDICTION_TEXT.said(way)),
      ...(['add', 'heat', 'cool'] as const).flatMap((kind) => [0, 1, 2, 3].map((acted) => doneText({ kind, portions: 3, acted }))),
      SOURCES_TEXT,
    ]
    return [...fixed, ...nested, ...made].filter((v): v is string => typeof v === 'string')
  }

  it('is there for every identifier of the engine and of the record', () => {
    expect(sentences().length).toBeGreaterThan(300)
    for (const text of sentences()) expect(text.trim().length, text).toBeGreaterThan(0)
    expect(Object.keys(SYSTEM_AIM)).toEqual([...SYSTEM_IDS])
    expect(systemOfDisturbance('zinc-drop')).toBe('hydroxides')
  })

  it('holds no institution text', () => {
    for (const text of sentences()) expect(findInstitutionText(text, []), text).toBeNull()
  })

  it('is short: nothing the page says in one breath runs over 60 words', () => {
    for (const text of sentences()) expect(text.split(/\s+/).length, text).toBeLessThanOrEqual(60)
  })

  // No quotation: the fingerprint of the pages is not kept in the repository, and the case is skipped where it is absent (see src/chem-data/lechatelier/quotation.test.ts).
  type Lib = { unpackHashes(base64: string): Set<number>; quotedRuns(text: string, fingerprint: Set<number>): string[] }
  const [lib] = Object.values(import.meta.glob<Lib>('../../../../scripts/titration-lib.mjs', { eager: true }))
  const [fingerprint] = Object.values(import.meta.glob<{ hashes: string }>('../../../../docs/research/lechatelier/sources/quotation-fingerprint.json', { eager: true, import: 'default' }))
  it.skipIf(fingerprint === undefined)('repeats no run of six words of a page the lab rests on (skipped where the fingerprint is absent)', () => {
    const pages = lib!.unpackHashes(fingerprint!.hashes)
    const BLOCKED_ALL: Blocked[] = ['unknown-system', 'system-checked', 'all-done', 'not-all-done', 'predict-first', 'prediction-fixed', 'action-done', 'act-first', 'look-first', 'observe-first', 'invalid-entry', 'nothing-to-repeat', 'no-more-runs', 'run-too-long', 'does-not-match', 'not-right']
    const more = [
      ...BLOCKED_ALL.flatMap((blocked) => [blockedText(data, blocked), blockedText(data, blocked, 'lead-acid')]),
      ...DISTURBANCE_IDS.flatMap((id) => (['observation-wrong', 'answer-wrong'] as const).map((kind) => reasonText(data, { kind, disturbance: id }))),
      outcomeText(data, { state: 'to-check' }),
      outcomeText(data, { state: 'counts' }),
      mismatchText(['solid', 'liquid']),
      checkedText(['solid', 'liquid']),
      checkedText([]),
    ]
    for (const text of [...sentences(), ...more]) expect(lib!.quotedRuns(text, pages), text).toEqual([])
  })
})
