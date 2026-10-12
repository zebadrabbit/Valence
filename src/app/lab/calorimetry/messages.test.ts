import { describe, expect, it } from 'vitest'
import { calorimetryData as data, candidatesOf, PART_IDS, type PartId } from '@/chem-data/calorimetry/data'
import { findInstitutionText } from '@/chem-data/denylist'
import { FIELDS, can, createLab, modelFrom, parseChange, parseSig3, parseTemperature, partView, reduce, runOutcomes, type Blocked, type CalorimetryState, type Field, type Reason, type Slip } from '@/engine/calorimetry'
import { entryActions, looks, run, wholeRun, workCup, worksheetValues } from '@/engine/calorimetry/testkit'
import {
  BENCH_TEXT,
  CHANGE_LABEL,
  DIRECTION_LABEL,
  MODE_TEXT,
  PAGE_TEXT,
  PART_AIM,
  PROGRESS_TEXT,
  WARNING_BUTTONS,
  WARNING_TEXT,
  benchLines,
  notebookLines,
  blockedText,
  candidateLines,
  cupText,
  describeGraph,
  enteredText,
  entryFeedback,
  entryText,
  expectedText,
  fieldLabel,
  formatHelp,
  massText,
  metalChoices,
  metalHazardsHeading,
  outcomeText,
  partNotes,
  partTitle,
  pointCallout,
  pointLabel,
  progressOf,
  reasonText,
  relationText,
  temperatureText,
  timeText,
  valueText,
} from './messages'

const m = modelFrom(data)
const sig = (text: string) => parseSig3(text)!
const SLIPS: Slip[] = ['cut-off', 'wrong-sign', 'salt-left-out', 'water-change-used', 'joules-for-kilojoules']
const BLOCKED: Blocked[] = ['lab-completed', 'unknown-part', 'already-done', 'logger-not-started', 'change-not-started', 'logger-full', 'worksheet-begun', 'run-over', 'nothing-there', 'not-turned', 'not-looked', 'not-this-part', 'entry-above-missing', 'invalid-entry', 'worksheet-not-full', 'nothing-to-repeat', 'not-the-logger', 'does-not-follow', ...SLIPS]
const REASONS: Reason[] = ['lid-off', 'not-stirred', 'start-not-shown', 'extreme-not-shown', 'entries-do-not-follow', 'outside-tolerance']
/** A careful cup of seed 1, worked to a curve that has turned, with the two looks made. */
const ready = (part: PartId, mode: 'guided' | 'challenge' = 'guided') => {
  const state = workCup(m, createLab(1, mode), part)
  return run(m, state, looks(m, state, part))
}
const view = (state: CalorimetryState, part: PartId) => partView(m, state, part)

describe('figures as they are written', () => {
  it('writes a temperature to 0.1 °C, a mass to 0.01 g, and a time in seconds and minutes', () => {
    expect([temperatureText(284), temperatureText(200), temperatureText(-57), temperatureText(5)]).toEqual(['28.4 °C', '20.0 °C', '−5.7 °C', '0.5 °C'])
    expect([massText(403), massText(4912), massText(5000)]).toEqual(['4.03 g', '49.12 g', '50.00 g'])
    expect([0, 1, 3, 4, 5, 8, 240].map((step) => timeText(m, step))).toEqual(['0 s', '15 s', '45 s', '1 min', '1 min 15 s', '2 min', '60 min'])
  })

  it('writes an entry as it was typed, with its unit, and a choice in words', () => {
    expect(valueText(data, 'start', 200)).toBe('20.0 °C')
    expect(valueText(data, 'change', -57)).toBe('−5.7 °C')
    expect(valueText(data, 'heat', sig('2840'))).toBe('2840 J')
    expect(valueText(data, 'moles', sig('0.0500'))).toBe('0.0500 mol')
    expect(valueText(data, 'perMole', sig('-56.8'))).toBe('−56.8 kJ/mol')
    expect(valueText(data, 'perMole', sig('+24.2'))).toBe('24.2 kJ/mol')
    expect(valueText(data, 'specificHeat', sig('.379'))).toBe('0.379 J/(g·°C)')
    expect(valueText(data, 'direction', 'out')).toBe('gave heat out')
    expect(valueText(data, 'metal', 'zinc-piece')).toBe('zinc')
    expect(DIRECTION_LABEL).toEqual({ out: 'gave heat out', in: 'took heat in' })
    expect(metalChoices(data)).toEqual([{ value: 'aluminium-piece', label: 'aluminium' }, { value: 'iron-piece', label: 'iron' }, { value: 'zinc-piece', label: 'zinc' }, { value: 'tin-piece', label: 'tin' }])
  })

  it('writes a typed entry in its field as the number alone, as it was typed, so that the parsers read it back as the same entry', () => {
    expect([entryText(200), entryText(5), entryText(-57)]).toEqual(['20.0', '0.5', '−5.7'])
    expect([entryText(sig('2840')), entryText(sig('0.0500')), entryText(sig('-56.8')), entryText(sig('.379'))]).toEqual(['2840', '0.0500', '−56.8', '0.379'])
    for (const tenths of [200, 268, 5, 999]) expect(parseTemperature(entryText(tenths))).toBe(tenths)
    for (const tenths of [68, -57, 0]) expect(parseChange(entryText(tenths))).toBe(tenths)
    for (const typed of ['2840', '0.0500', '-56.8', '24.2', '0.379', '1230000']) expect(parseSig3(entryText(sig(typed)))).toEqual(sig(typed))
  })

  it('writes an entry beside its label as the number alone, since the label gives the unit, and a choice in words', () => {
    expect(enteredText(data, 'start', 200)).toBe('20.0')
    expect(enteredText(data, 'perMole', sig('-56.8'))).toBe('−56.8')
    expect(enteredText(data, 'direction', 'in')).toBe('took heat in')
    expect(enteredText(data, 'metal', 'tin-piece')).toBe('tin')
    // Every typed entry's label does give its unit.
    for (const part of PART_IDS) for (const field of FIELDS[part]) if (field !== 'direction' && field !== 'metal') expect(fieldLabel(part, field)).toMatch(/, in (°C|J|mol|kJ\/mol|J\/\(g·°C\))/)
  })
})

describe('the parts and the bench', () => {
  it('names each part and says what it finds', () => {
    expect(PART_IDS.map((part) => partTitle(data, part))).toEqual(['Part 1: Neutralisation', 'Part 2: Dissolving', "Part 3: A metal's specific heat"])
    expect(Object.keys(PART_AIM)).toEqual([...PART_IDS])
    expect(PART_AIM.metal).toBe('The specific heat of an unknown metal, and from it which metal it is.')
  })

  it('says of no part which way the heat goes: the sentence is shown in Challenge too, and that is an entry of two worksheets', () => {
    expect(PART_AIM.neutralisation).toBe('The heat for each mole of water formed when an acid and a base are mixed.')
    expect(PART_AIM.dissolving).toBe('The heat for each mole of ammonium nitrate that dissolves in water.')
    for (const aim of Object.values(PART_AIM)) expect(aim).not.toMatch(/given out|gives out|gave|taken in|takes in|took|warm|cool|cold|hot\b|rise|fall|exotherm|endotherm/i)
  })

  it("says what is used, and what the balance and the bath's thermometer read", () => {
    const lab = createLab(1, 'guided')
    expect(benchLines(data, 'neutralisation', view(lab, 'neutralisation').bench)).toEqual(['50.0 mL of hydrochloric acid, 1.00 M, in the cup.', '50.0 mL of sodium hydroxide solution, 1.00 M, which is poured in.'])
    expect(benchLines(data, 'dissolving', view(lab, 'dissolving').bench)).toEqual(['50.0 mL of distilled water, in the cup.', 'Ammonium nitrate, white crystals, weighed out: the balance reads 4.20 g.'])
    expect(benchLines(data, 'metal', view(lab, 'metal').bench)).toEqual(['50.0 mL of distilled water, in the cup.', 'Unknown metal, a grey piece of metal: the balance reads 49.12 g.', 'The piece is heated in boiling water, and the thermometer in that water reads 99.6 °C.'])
  })

  it('says each line of the bench so that it is as true once the change is started as before it', () => {
    for (const part of PART_IDS) for (const line of benchLines(data, part, view(createLab(1, 'guided'), part).bench)) expect(line, line).not.toMatch(/ready to|not yet|has not|is in boiling|waiting/)
  })

  it("gives the notebook the bench's own lines to work from, and for part 3 the four metals' figures in one line more", () => {
    const lab = createLab(1, 'guided')
    for (const part of ['neutralisation', 'dissolving'] as const) expect(notebookLines(data, part, view(lab, part).bench)).toEqual(benchLines(data, part, view(lab, part).bench))
    expect(notebookLines(data, 'metal', view(lab, 'metal').bench)).toEqual([...benchLines(data, 'metal', view(lab, 'metal').bench), 'The four metals, in J/(g·°C): aluminium 0.902, iron 0.449, zinc 0.388 and tin 0.227.'])
    // The line is the table's, whatever the piece is: the same at every seed.
    for (let seed = 1; seed <= 30; seed++) expect(notebookLines(data, 'metal', view(createLab(seed, 'guided'), 'metal').bench).at(-1)).toBe(notebookLines(data, 'metal', view(lab, 'metal').bench).at(-1))
  })

  it('lists the four metals the piece may be with the specific heat of each, as the record has them, and never says which it is before part 3 is done', () => {
    expect(candidateLines(data)).toEqual(['Aluminium: 0.902 J/(g·°C)', 'Iron: 0.449 J/(g·°C)', 'Zinc: 0.388 J/(g·°C)', 'Tin: 0.227 J/(g·°C)'])
    expect(metalHazardsHeading(data, null)).toBe('The piece is one of aluminium, iron, zinc and tin. Until part 3 is done, the hazards of all four are shown.')
    expect(metalHazardsHeading(data, 'zinc-piece')).toBe('The piece was zinc: its hazards')
    // Every seed's bench reads the same but for its figures: no metal is named on it.
    for (let seed = 1; seed <= 30; seed++) {
      const lines = benchLines(data, 'metal', view(createLab(seed, 'guided'), 'metal').bench).join(' ')
      for (const c of candidatesOf(data)) expect(lines, `${seed} ${c.id}`).not.toMatch(new RegExp(`\\b${c.name}\\b`, 'i'))
    }
  })

  it('names the one action that starts the change in each part, and what a press of Run on does', () => {
    expect(CHANGE_LABEL).toEqual({ neutralisation: 'Pour in the sodium hydroxide solution', dissolving: 'Add the ammonium nitrate', metal: 'Add the hot metal' })
    expect(BENCH_TEXT.runOnHelp(m)).toBe('Lets 30 seconds pass: two more readings.')
    expect([BENCH_TEXT.lid, BENCH_TEXT.stir, BENCH_TEXT.logger, BENCH_TEXT.runOn]).toEqual(['Put the lid on', 'Stir', 'Start the logger', 'Run on'])
  })
})

describe('the cup in words (spec 16.6)', () => {
  it('says what is in it, whether the lid is on, whether it is stirred, and how many readings the logger has', () => {
    let state = createLab(1, 'guided')
    const said = (part: PartId) => cupText(part, view(state, part).cup, view(state, part).graph.readings.length)
    expect(said('neutralisation')).toBe('The cup holds the hydrochloric acid. The sodium hydroxide solution has not been poured in. The lid is off. The stirrer is still. The logger has not been started.')
    expect(said('dissolving')).toBe('The cup holds the water. The ammonium nitrate has not been added. The lid is off. The stirrer is still. The logger has not been started.')
    expect(said('metal')).toBe('The cup holds the water. The piece of metal is heating in the boiling water. The lid is off. The stirrer is still. The logger has not been started.')
    state = run(m, state, [{ type: 'putLidOn', part: 'metal' }, { type: 'startLogger', part: 'metal' }])
    expect(said('metal')).toBe('The cup holds the water. The piece of metal is heating in the boiling water. The lid is on. The stirrer is still. The logger is running: one reading so far.')
    state = run(m, state, [{ type: 'stir', part: 'metal' }, { type: 'startChange', part: 'metal' }, { type: 'runOn', part: 'metal' }])
    expect(said('metal')).toBe('The piece of metal is in the cup. The lid is on. The stirrer is going. The logger is running: 3 readings so far.')
    state = run(m, state, [{ type: 'startLogger', part: 'neutralisation' }, { type: 'startChange', part: 'neutralisation' }])
    expect(said('neutralisation')).toBe('Both solutions are in the cup. The lid is off. The stirrer is still. The logger is running: one reading so far.')
    state = run(m, state, [{ type: 'stir', part: 'dissolving' }, { type: 'startLogger', part: 'dissolving' }, { type: 'startChange', part: 'dissolving' }])
    expect(said('dissolving')).toBe('The ammonium nitrate is in the water. The lid is off. The stirrer is going. The logger is running: one reading so far.')
  })
})

describe('the graph in words (spec 16.6)', () => {
  const AXES = 'Temperature in degrees Celsius is up the side and time along the bottom, with a point for each reading.'
  const said = (state: CalorimetryState, part: PartId) => describeGraph(m, view(state, part).graph)

  it("says each point's time and temperature when it is looked at", () => {
    expect(pointCallout(m, 3, 284)).toBe('45 s: 28.4 °C')
    expect(pointCallout(m, 0, 200)).toBe('0 s: 20.0 °C')
    expect(pointCallout(m, 9, 166)).toBe('2 min 15 s: 16.6 °C')
    expect([pointLabel(m, 3, false), pointLabel(m, 3, true)]).toEqual(['Look at the reading at 45 s', 'Look at the reading at 45 s, looked at'])
    // Every point of a run says what the logger shows there.
    const { graph } = view(ready('neutralisation'), 'neutralisation')
    expect(graph.readings.map((tenths, step) => pointCallout(m, step, tenths))).toEqual(['0 s: 20.0 °C', '15 s: 20.0 °C', '30 s: 20.0 °C', '45 s: 25.8 °C', '1 min: 26.7 °C', '1 min 15 s: 26.8 °C', '1 min 30 s: 26.8 °C', '1 min 45 s: 26.7 °C', '2 min: 26.7 °C'])
  })

  it('says where it starts, when the change begins, where it peaks, and that it drifts back: a careful run of each part', () => {
    expect(said(ready('neutralisation'), 'neutralisation')).toBe(`${AXES} The readings are level at 20.0 °C until the change is started, just after the reading at 30 s. They then rise to a highest reading of 26.8 °C, first reached at 1 min 15 s, and after it drift slowly back: the latest reading, at 2 min, is 26.7 °C.`)
    expect(said(ready('dissolving'), 'dissolving')).toBe(`${AXES} The readings are level at 22.1 °C until the change is started, just after the reading at 30 s. They then fall to a lowest reading of 16.5 °C, first reached at 1 min 15 s, and after it drift slowly back: the latest reading, at 1 min 30 s, is 16.6 °C.`)
    expect(said(ready('metal'), 'metal')).toBe(`${AXES} The readings are level at 23.9 °C until the change is started, just after the reading at 30 s. They then rise to a highest reading of 30.1 °C, first reached at 1 min 15 s, and after it drift slowly back: the latest reading, at 2 min, is 30.0 °C.`)
  })

  it('says what the logger has drawn so far at every stage before that, and nothing of what it will draw', () => {
    const P = 'neutralisation'
    let state = createLab(1, 'guided')
    expect(said(state, P)).toBe('The logger has not been started, and the graph is empty.')
    state = run(m, state, [{ type: 'putLidOn', part: P }, { type: 'stir', part: P }, { type: 'startLogger', part: P }])
    expect(said(state, P)).toBe(`${AXES} There is one reading: 20.0 °C at 0 s. The change has not been started.`)
    state = run(m, state, [{ type: 'runOn', part: P }])
    expect(said(state, P)).toBe(`${AXES} The readings are level at 20.0 °C, from 0 s to 30 s. The change has not been started.`)
    state = run(m, state, [{ type: 'startChange', part: P }])
    expect(said(state, P)).toBe(`${AXES} The readings are level at 20.0 °C until the change is started, just after the reading at 30 s. No reading has been taken since.`)
    state = run(m, state, [{ type: 'runOn', part: P }])
    expect(said(state, P)).toBe(`${AXES} The readings are level at 20.0 °C until the change is started, just after the reading at 30 s. They then rise, to 26.7 °C at 1 min, the latest reading. The curve has not turned back yet.`)
    state = run(m, state, [{ type: 'runOn', part: P }])
    expect(said(state, P)).toBe(`${AXES} The readings are level at 20.0 °C until the change is started, just after the reading at 30 s. They then rise, to 26.8 °C at 1 min 15 s, and are level there up to the latest reading, at 1 min 30 s. The curve has not turned back yet.`)
    // Nothing in any of them is a temperature the logger had not yet shown.
    expect(said(run(m, createLab(1, 'guided'), [{ type: 'startLogger', part: P }, { type: 'startChange', part: P }]), P)).not.toMatch(/26|rise|fall/)
  })

  it('describes a cup that was not stirred as it is: a slow change, still going', () => {
    const state = run(m, createLab(1, 'challenge'), [{ type: 'putLidOn', part: 'dissolving' }, { type: 'startLogger', part: 'dissolving' }, { type: 'startChange', part: 'dissolving' }, { type: 'runOn', part: 'dissolving' }, { type: 'runOn', part: 'dissolving' }])
    expect(said(state, 'dissolving')).toBe(`${AXES} The readings are level at 22.1 °C until the change is started, just after the reading at 0 s. They then fall, to 19.4 °C at 1 min, the latest reading. The curve has not turned back yet.`)
  })
})

describe('the worksheet', () => {
  it('labels each entry with its unit, and the second one for what the graph showed', () => {
    const none = (part: PartId) => FIELDS[part].map((field) => fieldLabel(part, field))
    expect(none('neutralisation')).toEqual(['Starting temperature, in °C', 'Highest or lowest temperature reached, in °C', 'Change in temperature, in °C', "Heat the cup's contents took in or gave out, in J", 'The reaction', 'Moles of water formed, in mol', 'Heat for each mole, in kJ/mol, with its sign'])
    expect(none('dissolving').slice(4, 6)).toEqual(['The dissolving', 'Moles of ammonium nitrate dissolved, in mol'])
    expect(none('metal')).toEqual(['Starting temperature, in °C', 'Highest or lowest temperature reached, in °C', "Change in the water's temperature, in °C", 'Heat the water took in, in J', 'Specific heat of the metal, in J/(g·°C)', 'The metal is'])
    expect(fieldLabel('neutralisation', 'extreme', view(ready('neutralisation'), 'neutralisation').graph)).toBe('Highest temperature reached, in °C')
    expect(fieldLabel('dissolving', 'extreme', view(ready('dissolving'), 'dissolving').graph)).toBe('Lowest temperature reached, in °C')
    expect(fieldLabel('dissolving', 'extreme', view(createLab(1, 'guided'), 'dissolving').graph)).toBe('Highest or lowest temperature reached, in °C')
  })

  it('says how each kind of entry is typed, with no example a run can have', () => {
    expect(formatHelp('start')).toBe('One decimal place, as the logger shows it: 18.6')
    expect(formatHelp('heat')).toBe('Three significant figures, rounded: 1230, 45.6 or 0.0789')
    expect(formatHelp('perMole')).toContain('with a minus sign where heat was given out')
    // No temperature below the range a run starts in is one the logger shows, and 0.0789 mol is no run's.
    expect(m.startRangeTenths[0]).toBeGreaterThan(186)
  })

  it('has the relation behind every entry of every part ready for Guided, with the figures the bench gives and none of the run', () => {
    for (const part of PART_IDS) for (const field of FIELDS[part]) expect(relationText(data, part, field).length, `${part} ${field}`).toBeGreaterThan(40)
    expect(relationText(data, 'neutralisation', 'change')).toBe('Change in temperature = highest or lowest temperature − starting temperature. Give its size.')
    expect(relationText(data, 'neutralisation', 'heat')).toBe('Heat = mass in the cup × 4.18 J/(g·°C) × change in temperature. The two solutions together are 50.0 mL and 50.0 mL, and each millilitre is taken as 1.00 g.')
    expect(relationText(data, 'dissolving', 'heat')).toBe("Heat = mass in the cup × 4.18 J/(g·°C) × change in temperature. The mass is the water and the ammonium nitrate together: the 50.0 mL of water is taken as that many grams, and the salt's mass is the balance's reading.")
    expect(relationText(data, 'metal', 'heat')).toContain('The piece of metal is not part of this mass.')
    expect(relationText(data, 'dissolving', 'moles')).toBe('Moles = mass of the ammonium nitrate ÷ its molar mass, which is 80.044 g/mol.')
    expect(relationText(data, 'neutralisation', 'perMole')).toBe('Heat for each mole = heat ÷ moles ÷ 1000, which gives kJ/mol. Put a minus sign in front if heat was given out, and a plus sign or none if it was taken in.')
    expect(relationText(data, 'metal', 'specificHeat')).toBe("Specific heat = heat the water took in ÷ (mass of the piece × the piece's fall in temperature). The piece fell from the temperature of the boiling water to the highest temperature in the cup.")
    // A relation says how, never how much: none holds a figure to three places that is a run's answer.
    for (const part of PART_IDS) for (const field of FIELDS[part]) expect(relationText(data, part, field), `${part} ${field}`).not.toMatch(/0\.0500|57\.7|24\.4|0\.902|0\.449|0\.388|0\.227/)
  })
})

describe('refusals and feedback', () => {
  it('has a sentence for every reason an action cannot be done, for every entry it can be about', () => {
    for (const blocked of BLOCKED) {
      for (const part of PART_IDS) {
        for (const field of [undefined, ...FIELDS[part]]) {
          const text = blockedText(part, blocked, field)
          expect(text.length, `${blocked} ${part} ${field}`).toBeGreaterThan(8)
          expect(text, `${blocked} ${part} ${field}`).toMatch(/[.:\d]$/)
          expect(text, `${blocked} ${part} ${field}`).not.toMatch(/undefined|null/)
        }
      }
    }
  })

  it('says of an entry that does not follow which kind of slip it looks like, where the engine knows one', () => {
    expect(entryFeedback('neutralisation', 'perMole', { follows: false, slip: 'wrong-sign' })).toBe('The size is right and the sign is not. A change that gave heat out is written with a minus sign; one that took heat in, with a plus sign or none.')
    expect(entryFeedback('neutralisation', 'change', { follows: false, slip: 'wrong-sign' })).toBe('The size is right and the sign is not. Give the size alone, or the change with the sign it has: a minus only where the temperature fell.')
    expect(entryFeedback('neutralisation', 'heat', { follows: false, slip: 'wrong-sign' })).toBe('Give this as a size, without a sign.')
    expect(entryFeedback('dissolving', 'perMole', { follows: false, slip: 'cut-off' })).toBe('That looks cut off where it should be rounded. Look at the figure after the third: if it is 5 or more, the third goes up by one.')
    expect(entryFeedback('dissolving', 'heat', { follows: false, slip: 'salt-left-out' })).toBe('That is the heat of the water alone. The salt is part of the solution that cooled: use the mass of the water and the salt together.')
    expect(entryFeedback('metal', 'specificHeat', { follows: false, slip: 'water-change-used' })).toContain("That uses the water's change in temperature for the metal.")
    expect(entryFeedback('neutralisation', 'perMole', { follows: false, slip: 'joules-for-kilojoules' })).toBe('That is in joules for each mole. Divide by 1000 to give kilojoules for each mole.')
    expect(entryFeedback('neutralisation', 'perMole', { follows: false, slip: null })).toBe('That does not follow from the heat and the moles you entered.')
    expect(entryFeedback('metal', 'metal', { follows: false, slip: null })).toBe('That is not the metal whose figure in the table is nearest to the specific heat you entered.')
    expect(entryFeedback('metal', 'metal', { follows: true, slip: null })).toBe('')
    // Part 1's moles come from a volume and part 2's from a mass: the second is not told that millilitres are not litres.
    expect(entryFeedback('neutralisation', 'moles', { follows: false, slip: null })).toBe('That does not follow from what the bench gives. Check the units: millilitres are not litres.')
    expect(entryFeedback('dissolving', 'moles', { follows: false, slip: null })).toBe('That does not follow from what the bench gives. Check the mass of the salt and the molar mass you used.')
    // A worksheet that has been checked has no relation to open, and Challenge's never has: no feedback sends the learner to one.
    for (const part of PART_IDS) {
      for (const field of FIELDS[part]) {
        for (const slip of [null, ...SLIPS]) expect(entryFeedback(part, field, { follows: false, slip }), `${part} ${field} ${slip}`).not.toMatch(/relation/i)
        for (const blocked of BLOCKED) expect(blockedText(part, blocked, field), `${part} ${field} ${blocked}`).not.toMatch(/Open the relation/)
      }
    }
  })

  it("words Guided's refusal of each scripted slip as that slip, and never gives the value", () => {
    // The sign dropped, in part 1.
    let state = ready('neutralisation')
    const careful = worksheetValues(m, state, 'neutralisation')
    state = run(m, state, entryActions('neutralisation', careful).slice(0, 6))
    const unsigned = worksheetValues(m, state, 'neutralisation', { slip: 'no-sign' }).perMole
    const blocked = can(m, state, { type: 'enter', part: 'neutralisation', field: 'perMole', value: unsigned })!
    expect(blockedText('neutralisation', blocked, 'perMole')).toBe(entryFeedback('neutralisation', 'perMole', { follows: false, slip: 'wrong-sign' }))
    expect(blockedText('neutralisation', blocked, 'perMole')).not.toContain('56.8')
    // The salt's mass left out, in part 2.
    let salt = ready('dissolving')
    salt = run(m, salt, entryActions('dissolving', worksheetValues(m, salt, 'dissolving')).slice(0, 3))
    const without = worksheetValues(m, salt, 'dissolving', { slip: 'salt-left-out' }).heat
    expect(blockedText('dissolving', can(m, salt, { type: 'enter', part: 'dissolving', field: 'heat', value: without })!, 'heat')).toContain('The salt is part of the solution that cooled')
    // The wrong point read, in part 3.
    const metal = ready('metal')
    const start = run(m, metal, entryActions('metal', worksheetValues(m, metal, 'metal')).slice(0, 1))
    const refusal = blockedText('metal', can(m, start, { type: 'enter', part: 'metal', field: 'extreme', value: 295 })!, 'extreme')
    expect(refusal).toBe('That is not the highest temperature the logger shows after the change, or the lowest if the cup cooled. Look at the points again, and type the temperature of the one furthest from the start.')
    expect(refusal).not.toMatch(/30\.1/)
  })

  it('says what to do first where an entry is not open yet', () => {
    expect(blockedText('metal', 'not-turned', 'start')).toBe('The worksheet opens once the curve has turned back. Run on until the latest reading has come back from the highest or the lowest.')
    expect(blockedText('metal', 'not-looked', 'start')).toBe('Look at a reading before the change was started first.')
    expect(blockedText('metal', 'not-looked', 'extreme')).toBe('Look at the reading furthest from the start first: the highest point, or the lowest if the cup cooled.')
    expect(blockedText('metal', 'change-not-started', 'start')).toBe('The worksheet opens once the change has been started and the curve has turned back. Add the hot metal first.')
    expect(blockedText('dissolving', 'invalid-entry', 'heat')).toBe('That is not written as this entry is. Three significant figures, rounded: 1230, 45.6 or 0.0789')
    expect(blockedText('metal', 'invalid-entry', 'metal')).toBe('Choose one.')
  })
})

describe('the warnings', () => {
  it('say before the change is started what the lid and the stirrer are for, that the run will not count, and leave a way on', () => {
    expect(Object.keys(WARNING_TEXT)).toEqual(['lid-off', 'not-stirring'])
    for (const warning of Object.values(WARNING_TEXT)) expect(warning.body).toContain('a run started this way does not count')
    expect(WARNING_TEXT['lid-off'].title).toBe('The lid is off')
    expect(WARNING_TEXT['not-stirring'].title).toBe('The stirrer is still')
    expect(WARNING_BUTTONS).toEqual({ back: 'Go back', on: 'Start the change anyway' })
  })
})

describe('a run that is checked', () => {
  it('says that a careful run counts, and how far its result is from the figure the lab holds', () => {
    const state = wholeRun(m, createLab(1, 'guided'), 'neutralisation')
    expect(outcomeText(m, view(state, 'neutralisation').outcome)).toBe("This run counts: its temperatures are the logger's, every entry follows, the lid was on and the cup stirred from the start of the change, and the result is within 5% of the figure the lab holds. Your result is 1.6% under that figure.")
    expect(outcomeText(m, { state: 'counts', percentOff: 0.42 })).toMatch(/Your result is 0\.4% over that figure\.$/)
    expect(outcomeText(m, { state: 'counts', percentOff: 0.01 })).toMatch(/Your result is equal to that figure\.$/)
    expect(outcomeText(m, { state: 'open' })).toBe('')
  })

  it('says of a run that does not count why, each cause in a sentence, and that the part is run again', () => {
    for (const reason of REASONS) expect(reasonText(m, reason), reason).toMatch(/^[A-Z].*\.$/)
    const lidOff = wholeRun(m, createLab(1, 'challenge'), 'metal', { lid: false })
    expect(outcomeText(m, view(lidOff, 'metal').outcome)).toBe('This run does not count. The lid was not on from the moment the change was started, so the cup traded heat with the room through its open top while the temperature was still changing. The result is more than 5% from the figure the lab holds for this part. Run this part again: the lab sets it up with new numbers.')
    const unstirred = wholeRun(m, createLab(1, 'challenge'), 'dissolving', { stir: false })
    expect(outcomeText(m, view(unstirred, 'dissolving').outcome)).toContain('The cup was not stirred from the moment the change was started, so the change was slow, and the cup traded heat with the room all the while.')
    const unsigned = wholeRun(m, createLab(1, 'challenge'), 'neutralisation', { slip: 'no-sign' })
    expect(outcomeText(m, view(unsigned, 'neutralisation').outcome)).toBe('This run does not count. An entry of the worksheet does not follow from the ones above it. The worksheet marks which. Run this part again: the lab sets it up with new numbers.')
    // The record lists a run's reasons with no worksheet beside them, and so does not send the reader to one.
    expect(reasonText(m, 'entries-do-not-follow')).toBe('An entry of the worksheet does not follow from the ones above it.')
    // Neither cause of a careless cup says which way the heat went: the cup of part 2 is colder than the room.
    for (const reason of ['lid-off', 'not-stirred'] as const) expect(reasonText(m, reason)).toMatch(/traded heat with the room/)
    expect(outcomeText(m, { state: 'does-not-count', reasons: ['start-not-shown', 'extreme-not-shown'], percentOff: null })).toBe('This run does not count. The starting temperature entered is not the one the logger shows before the change. The highest or lowest temperature entered is not the one the logger shows. Run this part again: the lab sets it up with new numbers.')
  })

  it('gives no figure for how far off a run was until a run of the part counts, and then gives it', () => {
    let state = wholeRun(m, createLab(1, 'challenge'), 'neutralisation', { lid: false })
    expect(outcomeText(m, view(state, 'neutralisation').outcome)).not.toMatch(/\d+\.\d%/)
    state = wholeRun(m, run(m, state, [{ type: 'runAgain', part: 'neutralisation' }]), 'neutralisation')
    const [first] = runOutcomes(m, state, 'neutralisation')
    expect(outcomeText(m, first!)).toContain(' Its result was 8.8% under the figure the lab holds. Run this part again')
  })

  it('refuses in Guided a temperature a tenth of a degree off the logger, with the sentence that says which reading is wanted', () => {
    const P = 'metal'
    const state = ready(P)
    const careful = worksheetValues(m, state, P)
    for (const by of [-1, 1]) {
      expect(blockedText(P, can(m, state, { type: 'enter', part: P, field: 'start', value: (careful.start as number) + by })!, 'start')).toBe('That is not the temperature the logger shows before the change. Look at a point on the level part of the graph, and type its temperature.')
      const started = run(m, state, entryActions(P, careful).slice(0, 1))
      expect(blockedText(P, can(m, started, { type: 'enter', part: P, field: 'extreme', value: (careful.extreme as number) + by })!, 'extreme')).toMatch(/^That is not the highest temperature the logger shows after the change/)
    }
    // A result too far off is said in one plain sentence. With the temperatures the logger's own, a careful cup does not come to it alone (the engine's acceptance tests).
    expect(outcomeText(m, { state: 'does-not-count', reasons: ['outside-tolerance'], percentOff: null })).toBe('This run does not count. The result is more than 5% from the figure the lab holds for this part. Run this part again: the lab sets it up with new numbers.')
  })

  it('does not say to run the part again where it cannot be: once the lab is complete', () => {
    const outcome = view(wholeRun(m, createLab(1, 'challenge'), 'metal', { lid: false }), 'metal').outcome
    expect(outcomeText(m, outcome)).toMatch(/ Run this part again: the lab sets it up with new numbers\.$/)
    expect(outcomeText(m, outcome, false)).not.toContain('Run this part again')
    expect(outcomeText(m, outcome, false)).toMatch(/^This run does not count\. .*for this part\.$/)
  })

  it("says what the result was held to once the engine hands it over, and shows the part's notes then", () => {
    for (const part of PART_IDS) {
      const state = wholeRun(m, createLab(1, 'guided'), part)
      const { expected } = view(state, part)
      expect(expected, part).not.toBeNull()
      expect(partNotes(data, part, expected!).slice(0, 3)).toEqual(data.parts[PART_IDS.indexOf(part)]!.notes.map((note) => note.value))
    }
    expect(expectedText(data, 'neutralisation', view(wholeRun(m, createLab(1, 'guided'), 'neutralisation'), 'neutralisation').expected!)).toBe('The figure the lab holds for this part is −57.7 kJ for each mole of water formed.')
    expect(expectedText(data, 'dissolving', view(wholeRun(m, createLab(1, 'guided'), 'dissolving'), 'dissolving').expected!)).toBe('The figure the lab holds for this part is +24.4 kJ for each mole of ammonium nitrate dissolved.')
    const metal = view(wholeRun(m, createLab(1, 'guided'), 'metal'), 'metal').expected!
    expect(expectedText(data, 'metal', metal)).toBe('The piece was zinc, whose specific heat is 0.388 J/(g·°C).')
    // Part 3's notes end with how the figure of the piece's own metal was worked out.
    expect(partNotes(data, 'metal', metal)).toHaveLength(4)
    expect(partNotes(data, 'metal', metal)[3]).toContain('25.40 J/(mol·K) ÷ 65.38 g/mol = 0.388498 J/(g·K)')
  })
})

describe("the page's own words", () => {
  it('names the list of parts and the two ways on by where they go', () => {
    expect(PAGE_TEXT.list).toBe('Parts')
    expect([PAGE_TEXT.previous('Part 1: Neutralisation'), PAGE_TEXT.next('Part 2: Dissolving')]).toEqual(['Previous: Part 1: Neutralisation', 'Next: Part 2: Dissolving'])
  })

  it('names the graph and its two axes with their units, its marks, the keys that move along it and the two buttons under it', () => {
    expect(PAGE_TEXT.graphPicture).toBe("The logger's graph: temperature up the side against time along the bottom")
    expect([PAGE_TEXT.temperatureAxis, PAGE_TEXT.timeAxis]).toEqual(['Temperature, in °C', 'Time since the first reading, in minutes'])
    expect([PAGE_TEXT.lookedAt, PAGE_TEXT.notLookedAt, PAGE_TEXT.changeMark]).toEqual(['looked at', 'not looked at yet', 'the change was started here'])
    expect(PAGE_TEXT.arrows).toBe('With the keyboard, the left and right arrow keys move from one reading to the next.')
    expect([PAGE_TEXT.earlier, PAGE_TEXT.later, PAGE_TEXT.inWords]).toEqual(['Earlier reading', 'Later reading', 'The graph in words'])
    // What the name of a point says of one that has been looked at is the key's own word.
    expect(pointLabel(m, 3, true)).toBe(`Look at the reading at 45 s, ${PAGE_TEXT.lookedAt}`)
  })

  it("names an entry's buttons and the card of a run's outcome, and says what changing an entry does", () => {
    expect([PAGE_TEXT.enter, PAGE_TEXT.change, PAGE_TEXT.cancel, PAGE_TEXT.outcome]).toEqual(['Enter', 'Change', 'Cancel', 'This run'])
    expect(PAGE_TEXT.changeNote).toBe('Changing an entry empties the entries under it.')
    // It is so: an entry made again empties every entry after it.
    const state = run(m, ready('neutralisation'), entryActions('neutralisation', worksheetValues(m, ready('neutralisation'), 'neutralisation')).slice(0, 4))
    const again = reduce(m, state, { type: 'enter', part: 'neutralisation', field: 'start', value: view(state, 'neutralisation').worksheet[0]!.value! })
    expect(view(again, 'neutralisation').worksheet.map((entry) => entry.value !== null)).toEqual([true, false, false, false, false, false, false])
  })
})

describe('progress and modes', () => {
  it('says how far a part has come, at every stage', () => {
    const P = 'dissolving'
    let state = createLab(1, 'challenge')
    const stage = () => PROGRESS_TEXT[progressOf(view(state, P))]
    expect(stage()).toBe('Not started')
    state = run(m, state, [{ type: 'putLidOn', part: P }])
    expect(stage()).toBe('Cup under way')
    state = workCup(m, state, P)
    state = run(m, state, looks(m, state, P))
    expect(stage()).toBe('Cup under way')
    const values = worksheetValues(m, state, P, { slip: 'salt-left-out' })
    state = run(m, state, entryActions(P, values).slice(0, 2))
    expect(stage()).toBe('Worksheet under way')
    state = run(m, state, [...entryActions(P, values).slice(2), { type: 'check', part: P }])
    expect(stage()).toBe('Run did not count')
    state = run(m, state, [{ type: 'runAgain', part: P }])
    expect(stage()).toBe('Not started')
    state = wholeRun(m, state, P)
    expect(stage()).toBe('Done')
    // A part that is done stays done while it is run again.
    state = reduce(m, state, { type: 'runAgain', part: P })
    expect(stage()).toBe('Done')
  })

  it('says what each mode does', () => {
    expect(MODE_TEXT.guided).toContain('warns you before the change is started with the lid off or the stirrer still, checks each entry of the worksheet as you make it')
    expect(MODE_TEXT.challenge).toContain('is checked all together when you ask')
  })
})

describe('every sentence of the module', () => {
  const local = import.meta.glob<string[]>('@/chem-data/denylist.local.json', { eager: true, import: 'default' })
  const institutionNames = Object.values(local).flat()

  it('holds no institution text, and no figure a result is held to outside what is said once a run counts', () => {
    const fixed: string[] = [
      ...Object.values(PART_AIM),
      ...Object.values(BENCH_TEXT).flatMap((text) => (typeof text === 'string' ? [text] : [text(m)])),
      ...Object.values(CHANGE_LABEL),
      ...Object.values(WARNING_TEXT).flatMap((warning) => [warning.title, warning.body]),
      ...Object.values(MODE_TEXT),
      ...Object.values(PROGRESS_TEXT),
      ...Object.values(PAGE_TEXT).map((text) => (typeof text === 'string' ? text : text('Part 1'))),
      ...REASONS.map((reason) => reasonText(m, reason)),
      ...PART_IDS.flatMap((part) => FIELDS[part].flatMap((field: Field) => [fieldLabel(part, field), formatHelp(field), relationText(data, part, field), ...BLOCKED.map((blocked) => blockedText(part, blocked, field))])),
    ]
    expect(fixed.length).toBeGreaterThan(400)
    for (const text of fixed) {
      expect(findInstitutionText(text, institutionNames), text).toBeNull()
      expect(text, text).not.toMatch(/57\.7|55\.8|24\.4|25\.7|0\.0500/)
      for (const c of candidatesOf(data)) expect(text, text).not.toContain(c.specificHeat.value.toFixed(3))
    }
  })
})
