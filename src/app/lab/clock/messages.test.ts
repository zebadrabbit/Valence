import { describe, expect, it } from 'vitest'
import { clockData, PART_IDS, RUN_IDS, type RunId } from '@/chem-data/clock/data'
import { findInstitutionText } from '@/chem-data/denylist'
import { can, createLab, fieldsOf, modelFrom, parseFigures, rateLawView, reduce, roomTenths, runView, SHEET_IDS, temperatureView, timesTable, warnings, type Action, type Blocked, type ClockState, type Field, type RunReason, type SheetReason, type Slip } from '@/engine/clock'
import { entryActions, makeBathRuns, makeRoomRuns, makeRun, rateLawValues, run, temperatureValues, wholeLab, wholeSheet } from '@/engine/clock/testkit'
import {
  benchLines,
  blockedText,
  changeText,
  CONCENTRATION_UNIT,
  describeGraph,
  entryFeedback,
  entryText,
  fieldLabel,
  figuresText,
  flasksText,
  formatHelp,
  GRAPH_TEXT,
  inverseText,
  kelvinText,
  LAB_TEXT,
  liquidText,
  logText,
  mixtureRows,
  mixtureText,
  mixtureTotal,
  MODE_TEXT,
  NOTEBOOK_TEXT,
  orderChoices,
  PAGE_TEXT,
  PART_AIM,
  PART_DONE_WHEN,
  PART_PROGRESS_TEXT,
  partNotes,
  partProgressOf,
  partTitle,
  placeCallout,
  placeChoices,
  placeLabel,
  pointCallout,
  RATE_UNIT,
  rateLawExpectedText,
  RECORD_TEXT,
  relationText,
  RUN_PROGRESS_TEXT,
  RUN_TEXT,
  runOutcomeText,
  runProgressOf,
  runReasonText,
  runsCountText,
  runTitle,
  secondsText,
  SHEET_TABLE_TEXT,
  sheetOutcomeText,
  sheetReasonText,
  SOURCES_TEXT,
  standLabel,
  TABLE_TEXT,
  temperatureExpectedText,
  temperatureText,
  timeRowText,
  UNIT_LABEL,
  unitChoices,
  valueText,
  VERDICT_TEXT,
  volumeText,
  WARNING_BUTTONS,
  WARNING_TEXT,
  watchStatusText,
  watchText,
} from './messages'

// The clock reaction lab's wording, held to the engine's identifiers and to the record. Seed 1 throughout: a room
// at 22.5 °C, and baths at 0.5, 10.1 and 42.0 °C.

const data = clockData
const m = modelFrom(data)
const fig = (text: string) => parseFigures(text)!
const fresh = (mode: 'guided' | 'challenge' = 'challenge') => createLab(m, 1, mode)
const timed = makeBathRuns(m, makeRoomRuns(m, fresh()))
const open = wholeSheet(m, timed, 'rate-law')
const done = wholeSheet(m, open, 'temperature')
const FIELDS: Field[] = [...fieldsOf(m, 'rate-law'), ...fieldsOf(m, 'temperature')]
const SLIPS: Slip[] = ['cut-off', 'wrong-sign', 'not-diluted', 'count-left-out', 'joules-for-kilojoules']
const BLOCKED: Blocked[] = ['lab-completed', 'unknown-run', 'unknown-sheet', 'already-done', 'no-bath', 'not-in-bath', 'thermometer-not-read', 'already-poured', 'not-poured', 'run-over', 'invalid-time', 'run-not-over', 'run-counts', 'too-many', 'runs-missing', 'rate-law-first', 'sheet-over', 'nothing-there', 'not-this-sheet', 'entry-above-missing', 'not-looked', 'same-place', 'invalid-entry', 'sheet-not-full', 'sheet-not-over', 'sheet-counts', 'does-not-follow', ...SLIPS]
const RUN_REASONS: RunReason[] = ['no-indicator', 'not-at-temperature', 'stopped-early', 'stopped-late', 'ran-out']
const SHEET_REASONS: SheetReason[] = ['entries-do-not-follow', 'orders-differ', 'outside-tolerance']
/** Words that would give an order of this reaction, its rate constant or its activation energy. */
const HELD = /(first|second|zero|fourth)[- ]order|order (0|1|2) in|50\.26|\b50(\.0)? kJ|\[H⁺\]²/

describe('figures as they are written', () => {
  it('writes a temperature to 0.1 °C and in kelvin, a time in seconds and on the face of the watch, and a volume to 0.1 mL', () => {
    expect([temperatureText(225), temperatureText(5), temperatureText(-12)]).toEqual(['22.5 °C', '0.5 °C', '−1.2 °C'])
    expect(kelvinText(29565)).toBe('295.65 K')
    expect([secondsText(1244), secondsText(312)]).toEqual(['124.4 s', '31.2 s'])
    expect([watchText(0), watchText(312), watchText(1244), watchText(6371), watchText(18000)]).toEqual(['0:00.0', '0:31.2', '2:04.4', '10:37.1', '30:00.0'])
    expect([volumeText(10), volumeText(8), volumeText(0.5)]).toEqual(['10.0 mL', '8.0 mL', '0.5 mL'])
  })

  it('writes a number of three figures as it reads, with a true minus sign and a power of ten where it is small', () => {
    expect([figuresText(fig('50.3')), figuresText(fig('-6010')), figuresText(fig('2.68e-7')), figuresText(fig('0.00200'))]).toEqual(['50.3', '−6010', '2.68 × 10⁻⁷', '0.00200'])
    expect([inverseText(3382), inverseText(3200), logText(3735), logText(-250)]).toEqual(['0.003382', '0.003200', '3.735', '−0.250'])
  })

  it('writes a typed entry in its field so that the parser reads it back as the same entry', () => {
    for (const text of ['0.00200', '2.68e-7', '41.9', '-6010', '50.0', '1.07e-6', '8.38e-4']) expect(parseFigures(entryText(fig(text))), text).toEqual(fig(text))
  })

  it('names the units of a rate constant by the power of mol/L in each, for every unit the model offers', () => {
    expect(unitChoices(m)).toEqual([
      { value: 0, label: '1/s' },
      { value: -1, label: 'L/(mol·s)' },
      { value: -2, label: 'L²/(mol²·s)' },
      { value: -3, label: 'L³/(mol³·s)' },
      { value: -4, label: 'L⁴/(mol⁴·s)' },
    ])
    expect(UNIT_LABEL[-3]).toBe(data.rateLaw.rateConstant.unit)
    expect(orderChoices(m)).toEqual([{ value: 0, label: '0' }, { value: 1, label: '1' }, { value: 2, label: '2' }])
    expect([RATE_UNIT, CONCENTRATION_UNIT]).toEqual(['mol/(L·s)', 'mol/L'])
  })
})

describe('the lab, its parts and its bench', () => {
  it('names the lab and each part, and says what each finds and when it is done', () => {
    expect(PART_IDS.map((part) => partTitle(data, part))).toEqual(['Part 1: Five mixtures at room temperature', 'Part 2: The rate law', 'Part 3: Temperature'])
    expect(PART_AIM).toEqual({ runs: 'How long each of five mixtures takes to turn blue.', 'rate-law': 'The order in each of the three reactants, and the rate constant.', temperature: 'The activation energy, from the first mixture at four temperatures.' })
    expect(Object.keys(PART_DONE_WHEN)).toEqual([...PART_IDS])
    expect(LAB_TEXT.completeWhen).toBe('The lab is complete once all three parts are done.')
  })

  it('gives no order, rate constant or activation energy in what a part finds: the sentences are shown in Challenge from the start', () => {
    for (const text of [...Object.values(PART_AIM), ...Object.values(PART_DONE_WHEN), ...Object.values(LAB_TEXT)]) expect(text).not.toMatch(HELD)
  })

  it('sets out the bench of spec 19.1: the five bottles as their labels read, the water, the flasks, the watch, the thermometer with what it reads, and the baths', () => {
    expect(benchLines(data, roomTenths(m, fresh()))).toEqual([
      'Potassium iodide solution, 0.010 M.',
      'Sodium thiosulfate solution, 0.0010 M.',
      'Potassium bromate solution, 0.040 M.',
      'Hydrochloric acid, 0.10 M.',
      'Starch solution.',
      'Distilled water.',
      'Two flasks for each mixture: flask A and flask B.',
      'A stopwatch.',
      'A thermometer. In the room it reads 22.5 °C.',
      'Three baths: ice water, cool water and warm water.',
    ])
  })
})

describe('a mixture', () => {
  it('names each run: a mixture by its number, and a run in a bath by its mixture and its bath', () => {
    expect(RUN_IDS.map((runId) => runTitle(data, runId))).toEqual(['Mixture 1', 'Mixture 2', 'Mixture 3', 'Mixture 4', 'Mixture 5', 'Mixture 1 in ice water', 'Mixture 1 in cool water', 'Mixture 1 in warm water'])
  })

  it('is set out as a table: each liquid with its flask and its volume, and nothing of which none goes in', () => {
    expect(mixtureRows(data, 'mixture-1')).toEqual([
      { flask: 'Flask A', liquid: 'Potassium iodide solution, 0.010 M', volume: '10.0 mL' },
      { flask: 'Flask A', liquid: 'Sodium thiosulfate solution, 0.0010 M', volume: '10.0 mL' },
      { flask: 'Flask A', liquid: 'Distilled water', volume: '10.0 mL' },
      { flask: 'Flask B', liquid: 'Potassium bromate solution, 0.040 M', volume: '10.0 mL' },
      { flask: 'Flask B', liquid: 'Hydrochloric acid, 0.10 M', volume: '10.0 mL' },
    ])
    expect(mixtureRows(data, 'mixture-4').map((row) => `${row.flask}: ${row.volume} ${row.liquid}`)).toEqual([
      'Flask A: 10.0 mL Potassium iodide solution, 0.010 M',
      'Flask A: 10.0 mL Sodium thiosulfate solution, 0.0010 M',
      'Flask B: 10.0 mL Potassium bromate solution, 0.040 M',
      'Flask B: 20.0 mL Hydrochloric acid, 0.10 M',
    ])
    // A run in a bath is of the first mixture.
    expect(mixtureRows(data, 'bath-warm')).toEqual(mixtureRows(data, 'mixture-1'))
    expect(mixtureTotal(data, 'mixture-5')).toBe('50.0 mL in all, once flask B is poured into flask A. The drops of starch are not counted.')
  })

  it('is said in words too', () => {
    expect(mixtureText(data, 'mixture-5')).toBe('Flask A: potassium iodide solution, 8.0 mL; sodium thiosulfate solution, 10.0 mL; distilled water, 12.0 mL. Flask B: potassium bromate solution, 5.0 mL; hydrochloric acid, 15.0 mL. That is 50.0 mL in all.')
    expect(mixtureText(data, 'mixture-2')).toBe('Flask A: potassium iodide solution, 20.0 mL; sodium thiosulfate solution, 10.0 mL. Flask B: potassium bromate solution, 10.0 mL; hydrochloric acid, 10.0 mL. That is 50.0 mL in all.')
  })
})

describe('the flasks in words (spec 19.7, last item)', () => {
  const said = (state: ClockState, runId: RunId) => flasksText(data, runId, runView(m, state, runId))

  it("says, for a run on the bench, where the flasks stand, whether starch is in, and whether they are mixed", () => {
    let state = fresh()
    expect(said(state, 'mixture-1')).toBe("Flask A and flask B stand on the bench, at the room's temperature. No starch has been added. The two flasks have not been mixed.")
    state = run(m, state, [{ type: 'addIndicator', run: 'mixture-1' }])
    expect(said(state, 'mixture-1')).toBe("Flask A and flask B stand on the bench, at the room's temperature. Starch has been added to flask B. The two flasks have not been mixed.")
    state = run(m, state, [{ type: 'pour', run: 'mixture-1' }])
    expect(said(state, 'mixture-1')).toBe("Flask A and flask B stood on the bench, at the room's temperature. Starch has been added to flask B. Flask B has been poured into flask A.")
  })

  it('says, for a run in a bath, each stage in turn: on the bench, just in the bath, stood there, with what the thermometer reads once it has been read', () => {
    let state = fresh()
    expect(said(state, 'bath-ice')).toBe("Flask A and flask B stand on the bench, at the room's temperature. They have not been put in the ice water. No starch has been added. The two flasks have not been mixed.")
    state = run(m, state, [{ type: 'standInBath', run: 'bath-ice' }])
    expect(said(state, 'bath-ice')).toBe('Flask A and flask B stand in the ice water. They have only just gone in. No starch has been added. The thermometer in flask A has not been read since. The two flasks have not been mixed.')
    state = run(m, state, [{ type: 'readThermometer', run: 'bath-ice' }])
    expect(said(state, 'bath-ice')).toBe('Flask A and flask B stand in the ice water. They have only just gone in. No starch has been added. The thermometer in flask A reads 22.5 °C. The two flasks have not been mixed.')
    state = run(m, state, [{ type: 'letStand', run: 'bath-ice' }, { type: 'addIndicator', run: 'bath-ice' }])
    expect(said(state, 'bath-ice')).toBe('Flask A and flask B have stood in the ice water for 10 minutes. Starch has been added to flask B. The thermometer in flask A has not been read since. The two flasks have not been mixed.')
    state = run(m, state, [{ type: 'readThermometer', run: 'bath-ice' }, { type: 'pour', run: 'bath-ice' }])
    expect(said(state, 'bath-ice')).toBe('Flask A and flask B have stood in the ice water for 10 minutes. Starch has been added to flask B. The thermometer in flask A reads 0.5 °C. Flask B has been poured into flask A.')
  })

  it('says of flasks poured too soon that they had only just gone in', () => {
    const state = run(m, fresh(), [{ type: 'standInBath', run: 'bath-warm' }, { type: 'readThermometer', run: 'bath-warm' }, { type: 'pour', run: 'bath-warm' }])
    expect(said(state, 'bath-warm')).toBe('Flask A and flask B stood in the warm water. They had only just gone in. No starch has been added. The thermometer in flask A reads 22.5 °C. Flask B has been poured into flask A.')
  })

  it('has a sentence for every state the flasks of every run can be in, and says in none of them what the liquid will do', () => {
    const texts = new Set<string>()
    for (const runId of RUN_IDS) {
      for (const indicator of [false, true]) for (const flasks of ['bench', 'in-bath', 'stood'] as const) for (const thermometerTenths of [null, 5]) for (const poured of [false, true]) texts.add(flasksText(data, runId, { indicator, flasks, thermometerTenths, poured }))
    }
    expect(texts.size).toBeGreaterThan(60)
    for (const text of texts) {
      expect(text).toMatch(/^Flask A and flask B /)
      expect(text).not.toMatch(/blue|colourless|will|turn/i)
    }
  })

  it('names the buttons that stand the flasks in a bath and let them stand, before and after', () => {
    expect([standLabel(data, 'bath-ice'), standLabel(data, 'bath-cool', true), standLabel(data, 'mixture-1')]).toEqual(['Stand both flasks in the ice water', 'Both flasks stand in the cool water', ''])
    expect([RUN_TEXT.letStand(data), RUN_TEXT.letStandDone(data)]).toEqual(['Let them stand for 10 minutes', 'Stood for 10 minutes'])
    expect(RUN_TEXT.pour).toBe('Pour flask B into flask A and start the watch')
  })
})

describe('the liquid and the watch', () => {
  it('says what the liquid looks like, as it is seen, in the record\'s words: before the pour, after it, and once it has changed', () => {
    expect(liquidText(data, 'before', false)).toBe('The liquid in each flask is clear and colourless.')
    expect(liquidText(data, 'before', true)).toBe('The mixture is clear and colourless.')
    expect(liquidText(data, 'after', true)).toBe('The mixture is dark blue.')
    expect(changeText(data)).toBe('The mixture has turned dark blue, all at once.')
    // By its look, and never by what it is: no iodine, no starch.
    for (const text of [liquidText(data, 'before', true), liquidText(data, 'after', true), changeText(data)]) expect(text).not.toMatch(/iodine|starch|thiosulfate/i)
  })

  it('says what the watch reads: not started, running, stopped by hand or at the change, or stopped by itself at its half hour', () => {
    let state = fresh()
    expect(watchStatusText(runView(m, state, 'mixture-4'), 0, m)).toBe('The watch has not been started.')
    state = run(m, state, [{ type: 'addIndicator', run: 'mixture-4' }, { type: 'pour', run: 'mixture-4' }])
    expect(watchStatusText(runView(m, state, 'mixture-4'), 153, m)).toBe('The watch is running: 0:15.3.')
    expect(watchStatusText(runView(m, makeRun(m, fresh(), 'mixture-4'), 'mixture-4'), 0, m)).toBe('The watch was stopped by hand at 0:31.2, which is 31.2 s.')
    expect(watchStatusText(runView(m, makeRun(m, fresh(), 'mixture-4', { stop: 'end' }), 'mixture-4'), 0, m)).toBe('The watch was stopped at the change, at 0:30.9, which is 30.9 s.')
    const left = run(m, fresh(), [{ type: 'pour', run: 'mixture-4' }, { type: 'stopAtEnd', run: 'mixture-4' }])
    expect(watchStatusText(runView(m, left, 'mixture-4'), 0, m)).toBe('The watch stopped itself at 30:00.0, which is 1800.0 s.')
  })

  it('says beside the watch that the time is played fast and that the learner\'s own delay is added', () => {
    expect(RUN_TEXT.fast).toBe('The page plays the time faster than a clock would.')
    // A run left with its watch running is not timed: the sentence says so, and what to do, and nothing of when the liquid changes.
    expect(RUN_TEXT.left).toBe('This run was left while its watch was running, so no time was recorded. The flasks are as they were before the pour: pour again to time it.')
    expect(RUN_TEXT.stopHelp).toContain('Your own delay is added to the time')
    expect(RUN_TEXT.stopAtChangeHelp).toContain('counts like any other, and the record says how it was timed')
  })
})

describe('the warnings and how a run came out', () => {
  it("warn in Guided before the pour, say that the run will not count, and leave a way on", () => {
    const state = run(m, fresh('guided'), [{ type: 'standInBath', run: 'bath-cool' }, { type: 'readThermometer', run: 'bath-cool' }])
    expect(warnings(m, state, { type: 'pour', run: 'bath-cool' }).map((warning) => WARNING_TEXT[warning].title)).toEqual(['No starch in flask B', 'The flasks have not stood in the bath'])
    for (const warning of Object.values(WARNING_TEXT)) expect(warning.body).toContain('the run will not count')
    expect(WARNING_TEXT['no-indicator'].body).toContain('Add starch first.')
    expect(WARNING_TEXT['not-at-temperature'].body).toContain('its time will belong to no one temperature')
    expect(WARNING_BUTTONS).toEqual({ back: 'Go back', on: 'Pour anyway' })
  })

  it('says that a run counts, with the time that goes into the table', () => {
    const view = runView(m, makeRun(m, fresh(), 'mixture-1'), 'mixture-1')
    expect(runOutcomeText(m, view.outcome, view.stopped)).toBe('This run counts: 124.4 s goes into the table of times.')
    expect(runOutcomeText(m, runView(m, fresh(), 'mixture-1').outcome, null)).toBe('')
  })

  it('says of a run that does not count why, each cause in a sentence, and that it is made again', () => {
    const outcome = (state: ClockState, runId: RunId, again = true) => runOutcomeText(m, runView(m, state, runId).outcome, runView(m, state, runId).stopped, again)
    expect(outcome(makeRun(m, fresh(), 'mixture-2', { indicator: false }), 'mixture-2')).toBe('This run does not count. No starch was added, so nothing showed when the thiosulfate ran out, and there was no change to time. Make this run again.')
    expect(outcome(makeRun(m, fresh(), 'bath-warm', { stand: false }), 'bath-warm')).toBe("This run does not count. The flasks were mixed before they had come to the bath's temperature, so the time belongs to no one temperature. Make this run again.")
    expect(outcome(makeRun(m, fresh(), 'mixture-3', { stop: { earlyMs: 9000 } }), 'mixture-3')).toBe('This run does not count. The watch was stopped before the liquid changed. Make this run again.')
    expect(outcome(makeRun(m, fresh(), 'mixture-3', { stop: { delayMs: 2500 } }), 'mixture-3')).toBe('This run does not count. The watch was stopped more than 2 seconds after the liquid changed. Make this run again.')
    expect(outcome(makeRun(m, fresh(), 'bath-ice', { indicator: false, stand: false }), 'bath-ice', false)).toBe("This run does not count. No starch was added, so nothing showed when the thiosulfate ran out, and there was no change to time. The flasks were mixed before they had come to the bath's temperature, so the time belongs to no one temperature.")
    expect(RUN_REASONS.map((reason) => runReasonText(m, reason)).every((text) => text.length > 20)).toBe(true)
  })

  it('says how far a run has come, at every stage', () => {
    const progress = (state: ClockState, runId: RunId) => RUN_PROGRESS_TEXT[runProgressOf(runView(m, state, runId))]
    expect(progress(fresh(), 'mixture-1')).toBe('Not started')
    expect(progress(run(m, fresh(), [{ type: 'addIndicator', run: 'mixture-1' }]), 'mixture-1')).toBe('Flasks being made ready')
    expect(progress(run(m, fresh(), [{ type: 'standInBath', run: 'bath-ice' }]), 'bath-ice')).toBe('Flasks being made ready')
    expect(progress(run(m, fresh(), [{ type: 'pour', run: 'mixture-1' }]), 'mixture-1')).toBe('Watch running')
    expect(progress(makeRun(m, fresh(), 'mixture-1', { indicator: false }), 'mixture-1')).toBe('Did not count')
    expect(progress(makeRun(m, fresh(), 'mixture-1'), 'mixture-1')).toBe('Counts')
  })
})

describe('the table of times', () => {
  it('says each row: the run, its temperature, its time and how the watch was stopped, or that it is not timed yet', () => {
    expect(timesTable(m, timed).map((row) => timeRowText(data, row))).toEqual([
      'Mixture 1: 22.5 °C, 124.4 s, watch stopped by hand.',
      'Mixture 2: 22.5 °C, 61.5 s, watch stopped by hand.',
      'Mixture 3: 22.5 °C, 61.9 s, watch stopped by hand.',
      'Mixture 4: 22.5 °C, 31.2 s, watch stopped by hand.',
      'Mixture 5: 22.5 °C, 136.6 s, watch stopped by hand.',
      'Mixture 1 in ice water: 0.5 °C, 637.1 s, watch stopped by hand.',
      'Mixture 1 in cool water: 10.1 °C, 299.4 s, watch stopped by hand.',
      'Mixture 1 in warm water: 42.0 °C, 35.2 s, watch stopped by hand.',
    ])
    expect(timeRowText(data, timesTable(m, makeRun(m, fresh(), 'mixture-4', { stop: 'end' }))[3]!)).toBe('Mixture 4: 22.5 °C, 30.9 s, watch stopped at the change.')
    expect(timesTable(m, fresh()).map((row) => timeRowText(data, row))).toEqual(RUN_IDS.map((runId) => `${runTitle(data, runId)}: not timed yet.`))
    expect(TABLE_TEXT.caption).toBe('Times of the runs that count')
  })
})

describe('the notebook', () => {
  it('labels each entry with what it is of and its unit, and names the two mixtures an order is found from', () => {
    expect(FIELDS.map((field) => fieldLabel(data, field))).toEqual([
      'Concentration of iodide ion, I⁻, in mixture 1 once it is mixed, in mol/L',
      'Concentration of bromate ion, BrO₃⁻, in mixture 1 once it is mixed, in mol/L',
      'Concentration of hydrogen ion, H⁺, in mixture 1 once it is mixed, in mol/L',
      'Rate of mixture 1, in mol/(L·s)',
      'Order in iodide ion, from mixtures 1 and 2',
      'Order in bromate ion, from mixtures 1 and 3',
      'Order in hydrogen ion, from mixtures 1 and 4',
      'Rate constant of mixture 1',
      'Unit of the rate constant',
      'First place on the line',
      'Second place on the line',
      'Slope of the line, in K',
      'Activation energy, in kJ/mol',
    ])
  })

  it('says how each kind of entry is made, with no example a run can have', () => {
    expect(FIELDS.map(formatHelp)).toEqual([
      'Three significant figures: 0.00123',
      'Three significant figures: 0.00123',
      'Three significant figures: 0.00123',
      'Three significant figures. A small number can be typed with a power of ten: 1.23e-7',
      'Choose one.',
      'Choose one.',
      'Choose one.',
      'Three significant figures: 12.3',
      'Choose one.',
      'Choose a place you have looked at.',
      'Choose another place you have looked at.',
      'Three significant figures, with its sign: −1230',
      'Three significant figures: 12.3',
    ])
    // Every example is read by the parser as three figures.
    for (const example of ['0.00123', '1.23e-7', '12.3', '−1230']) expect(parseFigures(example), example).not.toBeNull()
  })

  it('has the relation behind every entry ready for Guided, with the figures the bench gives and none of a run or of the model', () => {
    expect(relationText(data, 'rate')).toBe('Rate = (concentration of thiosulfate in the mixture ÷ 6) ÷ time. The thiosulfate is thinned like the others when the flasks are mixed. The time is in the table of times, in seconds.')
    expect(relationText(data, 'order:hydrogen-ion')).toBe('Divide the rate of the second mixture named by the rate of the first. The second holds twice the concentration of this reactant, and nothing else differs. A ratio near 1 is order 0, near 2 is order 1, and near 4 is order 2.')
    expect(relationText(data, 'energy')).toBe('Ea = −slope × R, with R = 8.314 J/(mol·K). That gives joules for each mole: divide by 1000 for kJ/mol.')
    expect(relationText(data, 'slope')).toContain('Slope = (second ln k − first ln k) ÷ (second 1/T − first 1/T).')
    // The same relation for each reactant: it does not say which order it will be.
    expect(new Set(['iodide', 'bromate', 'hydrogen-ion'].map((id) => relationText(data, `order:${id}`))).size).toBe(1)
    for (const field of FIELDS) {
      expect(relationText(data, field).length, field).toBeGreaterThan(40)
      expect(relationText(data, field), field).not.toMatch(/50\.26|\b50 kJ|124\.4|2\.68|41\.9|6010|\[H⁺\]²|(first|second|fourth)[- ]order/)
    }
  })

  it('offers as places those that have been looked at, each with its two figures', () => {
    expect(placeChoices(temperatureView(m, open).graph!)).toEqual([])
    const looked = run(m, open, [{ type: 'look', place: 1 }, { type: 'look', place: 10 }])
    const graph = temperatureView(m, looked).graph!
    expect(placeChoices(graph)).toEqual([{ value: 1, label: '1/T = 0.003200, ln k = 4.834' }, { value: 10, label: '1/T = 0.003650, ln k = 2.128' }])
    expect(placeCallout(graph.places[0]!)).toBe('1/T = 0.003150, ln k = 5.134')
    expect([placeLabel(graph.places[0]!, false), placeLabel(graph.places[1]!, true)]).toEqual(['Look at the line at 1/T = 0.003150', 'Look at the line at 1/T = 0.003200, looked at'])
  })

  it('writes an entry as it was made: a number with its unit, an order, a unit, or a place with its two figures', () => {
    const places = temperatureView(m, open).graph!.places
    expect(valueText('concentration:iodide', fig('0.00200'))).toBe('0.00200 mol/L')
    expect(valueText('rate', fig('2.68e-7'))).toBe('2.68 × 10⁻⁷ mol/(L·s)')
    expect(valueText('order:hydrogen-ion', 2)).toBe('order 2')
    expect(valueText('rateConstant', fig('41.9'))).toBe('41.9')
    expect(valueText('unit', -3)).toBe('L³/(mol³·s)')
    expect(valueText('first', 0, places)).toBe('1/T = 0.003150, ln k = 5.134')
    expect(valueText('slope', fig('-6010'))).toBe('−6010 K')
    expect(valueText('energy', fig('50.0'))).toBe('50.0 kJ/mol')
  })

  it('says what the notebook has filled in, and that it has done so, only in words that fit both a right and a wrong row', () => {
    expect(NOTEBOOK_TEXT.filledRows).toBe('You have worked the row of mixture 1. The notebook has worked the other four the same way, from unrounded figures, and written each to three significant figures.')
    expect(NOTEBOOK_TEXT.filledConstants).toBe('The notebook has worked out the rate constant of the other four runs with the orders you gave, and the mean of all five.')
    expect(NOTEBOOK_TEXT.filledTemperatures).toContain('Each temperature in kelvin is the reading plus 273.15.')
    expect(NOTEBOOK_TEXT.filledTemperatures).toContain('to four significant figures')
    expect(NOTEBOOK_TEXT.filledTemperatures).toContain('from the unrounded rate constant, to three decimal places')
    expect(data.constants.zeroCelsius.published).toBe('273.15')
    expect(SHEET_TABLE_TEXT.concentration(data, 'bromate')).toBe('[BrO₃⁻], in mol/L')
  })
})

describe('refusals and feedback', () => {
  it('has a sentence for every reason an action cannot be done, for every entry it can be about and for none', () => {
    for (const blocked of BLOCKED) {
      expect(blockedText(data, blocked).length, blocked).toBeGreaterThan(15)
      for (const field of FIELDS) {
        const text = blockedText(data, blocked, field)
        // The shortest is the refusal of a choice that is none: "Choose one."
        expect(text.length, `${blocked} ${field}`).toBeGreaterThan(10)
        expect(text, `${blocked} ${field}`).not.toMatch(/undefined|null|\[object/)
      }
    }
  })

  it('says of an entry that does not follow which kind of slip it looks like, where the engine knows one, and never the value', () => {
    expect(entryFeedback('concentration:iodide', { follows: false, slip: 'not-diluted' })).toBe('That is the concentration in the bottle. In the mixture the solution is thinned by the others: use the volume of it and the whole volume.')
    expect(entryFeedback('rate', { follows: false, slip: 'count-left-out' })).toBe('That takes all of the thiosulfate. The bromate used up is a share of it: look at how many thiosulfate ions go with one bromate ion.')
    expect(entryFeedback('slope', { follows: false, slip: 'wrong-sign' })).toBe('The size is right and the sign is not. The line falls from left to right, so its slope is a negative number.')
    expect(entryFeedback('energy', { follows: false, slip: 'wrong-sign' })).toBe('The size is right and the sign is not. An activation energy is a positive number: take the size of the slope.')
    expect(entryFeedback('energy', { follows: false, slip: 'joules-for-kilojoules' })).toBe('That is in joules for each mole. Divide by 1000 to give kilojoules for each mole.')
    expect(entryFeedback('rateConstant', { follows: false, slip: 'cut-off' })).toContain('cut off where it should be rounded')
    expect(entryFeedback('order:bromate', { follows: false, slip: null })).toBe('That is not the order the two rates give. Divide one rate by the other and see which ratio it is nearest.')
    expect(entryFeedback('unit', { follows: false, slip: null })).toBe('That is not the unit your three orders give.')
    expect(entryFeedback('rate', { follows: true, slip: null })).toBe('')
    for (const field of FIELDS) for (const slip of [...SLIPS, null]) expect(entryFeedback(field, { follows: false, slip }), `${field} ${slip}`).not.toMatch(/\d\.\d|6010|\b[012] is right/)
    expect(VERDICT_TEXT).toEqual({ follows: 'Follows', not: 'Does not follow' })
  })

  it("words Guided's refusal of each scripted slip as that slip", () => {
    const guided = makeRoomRuns(m, fresh('guided'), { stop: 'end' })
    const refused = (slip: 'not-diluted' | 'count-left-out' | 'wrong-order', field: Field) => {
      const values = rateLawValues(m, guided, { slip })
      const fields = fieldsOf(m, 'rate-law')
      const before = run(m, guided, fields.slice(0, fields.indexOf(field)).map((above): Action => ({ type: 'enter', sheet: 'rate-law', field: above, value: values[above]! })))
      return blockedText(data, can(m, before, { type: 'enter', sheet: 'rate-law', field, value: values[field]! })!, field)
    }
    expect(refused('not-diluted', 'concentration:iodide')).toContain('That is the concentration in the bottle.')
    expect(refused('count-left-out', 'rate')).toContain('That takes all of the thiosulfate.')
    expect(refused('wrong-order', 'order:hydrogen-ion')).toBe('That is not the order the two rates give. Divide one rate by the other and see which ratio it is nearest.')
    const second = wholeSheet(m, makeBathRuns(m, guided, { stop: 'end' }), 'rate-law')
    const actions = entryActions(m, 'temperature', temperatureValues(m, second, { slip: 'no-sign' }))
    const before = run(m, second, actions.slice(0, 4))
    expect(blockedText(data, can(m, before, actions[4]!)!, 'slope')).toContain('so its slope is a negative number')
  })

  it('says what to do first where a sheet or an entry is not open yet', () => {
    expect(blockedText(data, rateLawView(m, fresh()).blocked!)).toBe('The notebook opens once every run it is worked from counts. Make the runs that are not in the table of times yet.')
    expect(blockedText(data, temperatureView(m, timed).blocked!)).toBe('This notebook opens once part 2 is done: its rate constants are worked with the rate law found there.')
    expect(blockedText(data, 'not-looked', 'first')).toBe('Look at that place on the line first.')
    expect(blockedText(data, 'same-place', 'second')).toBe('Choose two places, not one twice: a slope needs two.')
    expect(blockedText(data, 'thermometer-not-read')).toBe('Read the thermometer first: the notebook needs the temperature of this run.')
    expect(blockedText(data, 'invalid-entry', 'rate')).toBe('That is not written as this entry is. Three significant figures. A small number can be typed with a power of ten: 1.23e-7')
    expect(blockedText(data, 'invalid-entry', 'unit')).toBe('Choose one.')
    expect(blockedText(data, 'run-counts')).toBe('This run counts, and its time is in the table. A run that counts is not made again.')
  })
})

describe('a notebook that is checked', () => {
  it('says that a careful notebook counts, and how far its result is from what the model gives', () => {
    expect(sheetOutcomeText(m, 'rate-law', rateLawView(m, open).outcome)).toBe("This notebook counts: every entry follows, and the mean rate constant is within 5% of what the lab's model gives at this room's temperature. Yours is 0.7% under it.")
    expect(sheetOutcomeText(m, 'temperature', temperatureView(m, done).outcome)).toBe("This notebook counts: every entry follows, and the activation energy is within 5% of the lab's own figure. Yours is equal to it.")
    expect(sheetOutcomeText(m, 'rate-law', rateLawView(m, timed).outcome)).toBe('')
  })

  it('says of a notebook that does not count why, and that it is worked again; and gives no figure for how far off it was until a working counts', () => {
    const failed = wholeSheet(m, timed, 'rate-law', { slip: 'count-left-out' })
    expect(sheetOutcomeText(m, 'rate-law', rateLawView(m, failed).outcome)).toBe('This notebook does not count. An entry does not follow from your own numbers. The notebook marks which. Work this notebook again.')
    expect(sheetOutcomeText(m, 'rate-law', rateLawView(m, failed).outcome, false)).toBe('This notebook does not count. An entry does not follow from your own numbers. The notebook marks which.')
    expect(sheetOutcomeText(m, 'rate-law', { state: 'does-not-count', reasons: ['outside-tolerance'], percentOff: null })).toBe("This notebook does not count. The result is more than 5% from what the lab's model gives. Work this notebook again.")
    expect(sheetOutcomeText(m, 'temperature', { state: 'does-not-count', reasons: ['outside-tolerance'], percentOff: 6.24 })).toBe("This notebook does not count. The result is more than 5% from what the lab's model gives. Its result was 6.2% over the lab's own figure. Work this notebook again.")
    expect(sheetOutcomeText(m, 'rate-law', { state: 'does-not-count', reasons: ['orders-differ'], percentOff: null })).toContain("The orders the times give are not the ones the lab's model has.")
    for (const sheet of SHEET_IDS) for (const reason of SHEET_REASONS) expect(sheetReasonText(m, sheet, reason).length).toBeGreaterThan(20)
  })

  it("says what the results were held to once the engine hands it over, and says of the activation energy that it is the lab's own figure, not a measured one", () => {
    expect(rateLawView(m, timed).expected).toBeNull()
    expect(rateLawExpectedText(data, rateLawView(m, open).expected!)).toBe("The lab's model has order 1 in iodide ion, order 1 in bromate ion and order 2 in hydrogen ion: rate = k[I⁻][BrO₃⁻][H⁺]². At 22.5 °C, this room's temperature, it gives a rate constant of 42.4 L³/(mol³·s).")
    expect(temperatureView(m, open).expected).toBeNull()
    expect(temperatureExpectedText(temperatureView(m, done).expected!)).toBe("The activation energy the lab's model runs on is 50 kJ/mol. It is the lab's own figure, not a measured one.")
  })

  it("shows a part's notes, as the record has them, and they are asked for only once the part is done", () => {
    for (const part of PART_IDS) expect(partNotes(data, part)).toEqual(data.parts.find((p) => p.id === part)!.notes.map((note) => note.value))
    expect(partNotes(data, 'temperature')[1]).toContain("It is the lab's own figure, not a measured one")
  })
})

describe('the graph in words (spec 19.7, last item)', () => {
  it('says its axes, its four points from left to right, and the line through them with where it runs from and to', () => {
    expect(describeGraph(data, temperatureView(m, open))).toBe(
      'ln k is up the side and 1/T, in 1/K, is along the bottom. There are 4 points, from left to right: mixture 1 in warm water, at 42.0 °C, with 1/T 0.003173 and ln k 4.997; mixture 1, at 22.5 °C, with 1/T 0.003382 and ln k 3.735; mixture 1 in cool water, at 10.1 °C, with 1/T 0.003530 and ln k 2.856; mixture 1 in ice water, at 0.5 °C, with 1/T 0.003654 and ln k 2.101. A straight line is drawn through them, from ln k 5.134 at 1/T 0.003150 to ln k 1.827 at 1/T 0.003700: it falls from left to right. 12 places on it can be looked at.',
    )
  })

  it('says that there is no graph yet where the notebook of part 3 cannot be opened', () => {
    expect(describeGraph(data, temperatureView(m, timed))).toBe('The graph is empty: it is drawn once the notebook of part 3 can be opened.')
    expect(describeGraph(data, temperatureView(m, fresh()))).toBe('The graph is empty: it is drawn once the notebook of part 3 can be opened.')
  })

  it('works nothing out: it gives no slope and no activation energy, at any seed', () => {
    for (const seed of [1, 2, 3, 50, 100]) {
      const state = wholeSheet(m, makeBathRuns(m, makeRoomRuns(m, createLab(m, seed, 'challenge'))), 'rate-law')
      const text = describeGraph(data, temperatureView(m, state))
      expect(text).not.toMatch(/slope|kJ|activation|−?6\d\d\d/)
      expect(text).toContain('it falls from left to right')
      expect(text.split(/\s+/).length).toBeLessThan(120)
    }
  })

  it("says each point's run, temperature and two figures when it is pointed at, and names the picture, its axes and its marks", () => {
    const row = temperatureView(m, open).rows![3]!
    expect(pointCallout(data, row)).toBe('Mixture 1 in warm water, at 42.0 °C: 1/T = 0.003173, ln k = 4.997')
    expect(GRAPH_TEXT.picture).toBe('The graph of part 3: ln k up the side against 1/T along the bottom, with a straight line through four points')
    expect([GRAPH_TEXT.logAxis, GRAPH_TEXT.inverseAxis]).toEqual(['ln k', '1/T, in 1/K'])
    expect(GRAPH_TEXT.arrows).toBe('With the keyboard, the left and right arrow keys move from one place to the next.')
  })
})

describe('progress, modes and the record', () => {
  it('says how far a part has come, at every stage', () => {
    const progress = (state: ClockState, part: 'runs' | 'rate-law' | 'temperature') => {
      const runs = RUN_IDS.filter((runId) => (part === 'temperature' ? runId.startsWith('bath-') : !runId.startsWith('bath-'))).map((runId) => runView(m, state, runId))
      const sheet = part === 'runs' ? null : part === 'rate-law' ? rateLawView(m, state) : temperatureView(m, state)
      const isDone = part === 'runs' ? runs.every((r) => r.outcome.state === 'counts') : sheet!.done
      return PART_PROGRESS_TEXT[partProgressOf(isDone, part === 'rate-law' ? [] : runs, sheet)]
    }
    expect(progress(fresh(), 'runs')).toBe('Not started')
    expect(progress(run(m, fresh(), [{ type: 'addIndicator', run: 'mixture-3' }]), 'runs')).toBe('Runs under way')
    expect(progress(makeRoomRuns(m, fresh()), 'runs')).toBe('Done')
    expect(progress(makeRoomRuns(m, fresh()), 'rate-law')).toBe('Not started')
    const begun = run(m, makeRoomRuns(m, fresh()), [{ type: 'enter', sheet: 'rate-law', field: 'concentration:iodide', value: fig('0.00200') }])
    expect(progress(begun, 'rate-law')).toBe('Notebook under way')
    expect(progress(wholeSheet(m, timed, 'rate-law', { slip: 'not-diluted' }), 'rate-law')).toBe('Notebook did not count')
    expect(progress(open, 'rate-law')).toBe('Done')
    expect(progress(open, 'temperature')).toBe('Runs under way')
    expect(progress(done, 'temperature')).toBe('Done')
    expect(runsCountText(3, 5)).toBe('3 of 5 runs count')
  })

  it('says what each mode does', () => {
    expect(MODE_TEXT.guided).toContain('warns you before a pour that will not count, checks each entry of the notebook as you make it')
    expect(MODE_TEXT.challenge).toContain('is checked all together when you ask')
  })

  it('names the rows of the record, and says how a run in it was timed', () => {
    expect([RECORD_TEXT.attempt(2), RECORD_TEXT.working(3)]).toEqual(['Attempt 2', 'Working 3'])
    expect([RECORD_TEXT.timedByHand(1244), RECORD_TEXT.timedByEnd(309)]).toEqual(['124.4 s, watch stopped by hand', '30.9 s, watch stopped at the change'])
    expect([RECORD_TEXT.timedByHandAfter(1244, 430), RECORD_TEXT.timedByHandAfter(309, 2649)]).toEqual(['124.4 s, watch stopped by hand 0.4 s after the change', '30.9 s, watch stopped by hand 2.6 s after the change'])
    expect(SOURCES_TEXT).toContain("The activation energy the model runs on is Valence's own figure")
  })
})

describe('every sentence of the page', () => {
  const local = import.meta.glob<string[]>('@/chem-data/denylist.local.json', { eager: true, import: 'default' })
  const institutionNames = Object.values(local).flat()
  const strings = (group: Record<string, unknown>): string[] => Object.values(group).flatMap((value) => (typeof value === 'string' ? [value] : typeof value === 'object' && value !== null ? strings(value as Record<string, unknown>) : []))

  /** What the page says before anything of the model may be said: every fixed string, and every sentence a function gives for a lab in which no part is done. */
  function before(): string[] {
    const views = RUN_IDS.flatMap((runId) => [fresh(), run(m, fresh(), [{ type: 'addIndicator', run: runId }]), makeRun(m, fresh(), runId), makeRun(m, fresh(), runId, { indicator: false })].map((state) => [runId, runView(m, state, runId)] as const))
    return [
      ...strings(LAB_TEXT),
      ...strings(PART_AIM),
      ...strings(PART_DONE_WHEN),
      ...strings(RUN_TEXT),
      RUN_TEXT.letStand(data),
      RUN_TEXT.letStandDone(data),
      ...strings(WARNING_TEXT),
      ...strings(WARNING_BUTTONS),
      ...strings(RUN_PROGRESS_TEXT),
      ...strings(TABLE_TEXT),
      ...strings(NOTEBOOK_TEXT),
      ...strings(SHEET_TABLE_TEXT),
      ...data.rateLaw.reactants.map((r) => SHEET_TABLE_TEXT.concentration(data, r.id)),
      ...strings(VERDICT_TEXT),
      ...strings(GRAPH_TEXT),
      ...strings(PART_PROGRESS_TEXT),
      ...strings(MODE_TEXT),
      ...strings(PAGE_TEXT),
      PAGE_TEXT.previous('Part 1'),
      PAGE_TEXT.next('Part 2'),
      ...strings(RECORD_TEXT),
      RECORD_TEXT.attempt(1),
      RECORD_TEXT.working(1),
      RECORD_TEXT.timedByHand(1244),
      RECORD_TEXT.timedByHandAfter(1244, 430),
      RECORD_TEXT.timedByEnd(1241),
      SOURCES_TEXT,
      ...PART_IDS.map((part) => partTitle(data, part)),
      ...benchLines(data, 225),
      ...RUN_IDS.flatMap((runId) => [runTitle(data, runId), mixtureText(data, runId), mixtureTotal(data, runId), standLabel(data, runId), standLabel(data, runId, true), ...mixtureRows(data, runId).flatMap((row) => [row.flask, row.liquid, row.volume])]),
      ...views.flatMap(([runId, view]) => [flasksText(data, runId, view), watchStatusText(view, 100, m), runOutcomeText(m, view.outcome, view.stopped), RUN_PROGRESS_TEXT[runProgressOf(view)]]),
      liquidText(data, 'before', false),
      liquidText(data, 'before', true),
      liquidText(data, 'after', true),
      changeText(data),
      ...RUN_REASONS.map((reason) => runReasonText(m, reason)),
      ...timesTable(m, timed).map((row) => timeRowText(data, row)),
      ...FIELDS.flatMap((field) => [fieldLabel(data, field), formatHelp(field), relationText(data, field), ...BLOCKED.map((blocked) => blockedText(data, blocked, field)), ...[...SLIPS, null].map((slip) => entryFeedback(field, { follows: false, slip }))]),
      ...BLOCKED.map((blocked) => blockedText(data, blocked)),
      ...SHEET_IDS.flatMap((sheet) => [...SHEET_REASONS.map((reason) => sheetReasonText(m, sheet, reason)), sheetOutcomeText(m, sheet, { state: 'does-not-count', reasons: ['entries-do-not-follow'], percentOff: null })]),
      ...orderChoices(m).map((choice) => choice.label),
      ...unitChoices(m).map((choice) => choice.label),
      describeGraph(data, temperatureView(m, timed)),
      runsCountText(2, 5),
    ].filter((text) => text !== '')
  }
  /** What is said only once a part is done, or of a notebook that may be read. */
  const after = (): string[] => [
    sheetOutcomeText(m, 'rate-law', rateLawView(m, open).outcome),
    sheetOutcomeText(m, 'temperature', temperatureView(m, done).outcome),
    rateLawExpectedText(data, rateLawView(m, open).expected!),
    temperatureExpectedText(temperatureView(m, done).expected!),
    describeGraph(data, temperatureView(m, open)),
    ...temperatureView(m, open).graph!.places.flatMap((place) => [placeCallout(place), placeLabel(place, true)]),
    ...temperatureView(m, open).rows!.map((row) => pointCallout(data, row)),
  ]

  it('is there for every identifier of the engine and of the record', () => {
    expect(before().length).toBeGreaterThan(800)
    for (const text of [...before(), ...after()]) expect(text.trim().length, text).toBeGreaterThan(0)
    expect(Object.keys(WARNING_TEXT)).toEqual(['no-indicator', 'not-at-temperature'])
    expect(Object.keys(MODE_TEXT)).toEqual(['guided', 'challenge'])
  })

  it('has a sentence for every refusal the engine gives a careful and a careless learner', () => {
    const seen = new Set<Blocked>()
    const tryAll = (state: ClockState) => {
      for (const runId of RUN_IDS) for (const type of ['addIndicator', 'standInBath', 'letStand', 'readThermometer', 'pour', 'stopAtEnd', 'runAgain'] as const) {
        const blocked = can(m, state, { type, run: runId })
        if (blocked) seen.add(blocked)
      }
      for (const sheet of SHEET_IDS) for (const type of ['check', 'sheetAgain'] as const) {
        const blocked = can(m, state, { type, sheet })
        if (blocked) seen.add(blocked)
      }
    }
    for (const state of [fresh(), timed, open, done, makeRun(m, fresh(), 'bath-ice', { stand: false }), run(m, fresh(), [{ type: 'pour', run: 'mixture-1' }])]) tryAll(state)
    expect(seen.size).toBeGreaterThanOrEqual(12)
    for (const blocked of seen) expect(BLOCKED, blocked).toContain(blocked)
  })

  it('holds no institution text', () => {
    for (const text of [...before(), ...after(), ...PART_IDS.flatMap((part) => partNotes(data, part))]) expect(findInstitutionText(text, institutionNames), text).toBeNull()
  })

  it('is short: nothing the page says in one breath runs over 60 words, but the graph in words, which is behind a closed disclosure', () => {
    for (const text of [...before(), ...after()]) if (!text.startsWith('ln k is up the side')) expect(text.split(/\s+/).length, text).toBeLessThanOrEqual(60)
  })

  it("gives none of this reaction's orders, nor its rate constant or its activation energy, in anything said before a part is done", () => {
    for (const text of before()) expect(text, text).not.toMatch(HELD)
    // What is said once a part is done does give them, and says whose the activation energy is.
    expect(after().some((text) => HELD.test(text))).toBe(true)
  })

  it('says of the liquid only what is seen, and of a flask nothing of what will happen, in every sentence a run shows before its watch is stopped', () => {
    const state = run(m, fresh(), [{ type: 'addIndicator', run: 'mixture-1' }, { type: 'pour', run: 'mixture-1' }])
    const view = runView(m, state, 'mixture-1')
    for (const text of [flasksText(data, 'mixture-1', view), watchStatusText(view, 300, m), liquidText(data, view.look, view.poured), mixtureText(data, 'mixture-1')]) expect(text).not.toMatch(/blue|124|will/)
    expect(reduce(m, state, { type: 'look', place: 0 })).toBe(state)
  })

  it('completes a whole lab with a sentence at every step: nothing the engine hands over is left without words', () => {
    const state = wholeLab(m, fresh('guided'))
    expect(state.status).toBe('completed')
    for (const runId of RUN_IDS) expect(runOutcomeText(m, runView(m, state, runId).outcome, runView(m, state, runId).stopped, false)).toMatch(/^This run counts: /)
    for (const entry of [...rateLawView(m, state).entries, ...temperatureView(m, state).entries]) expect(valueText(entry.field, entry.value!, temperatureView(m, state).graph!.places).length, entry.field).toBeGreaterThan(0)
    expect(LAB_TEXT.complete).toBe('The lab is complete: all three parts are done.')
  })

  // No quotation: the fingerprint of the pages is not kept in the repository, and the case is skipped where it is absent (see src/chem-data/clock/quotation.test.ts).
  type Lib = { unpackHashes(base64: string): Set<number>; quotedRuns(text: string, fingerprint: Set<number>): string[] }
  const [lib] = Object.values(import.meta.glob<Lib>('../../../../scripts/titration-lib.mjs', { eager: true }))
  const [fingerprint] = Object.values(import.meta.glob<{ hashes: string }>('../../../../docs/research/clock/sources/quotation-fingerprint.json', { eager: true, import: 'default' }))
  it.skipIf(fingerprint === undefined)('repeats no run of six words of a page the lab rests on (skipped where the fingerprint is absent)', () => {
    const pages = lib!.unpackHashes(fingerprint!.hashes)
    for (const text of [...new Set([...before(), ...after()])]) expect(lib!.quotedRuns(text, pages), text).toEqual([])
  })
})
