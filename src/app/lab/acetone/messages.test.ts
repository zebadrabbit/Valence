import { describe, expect, it } from 'vitest'
import { acetoneData as data, PART_IDS, RUN_IDS } from '@/chem-data/acetone/data'
import { findInstitutionText } from '@/chem-data/denylist'
import { can, createLab, currentAttempt, fieldsOf, leftAt, lookAt, modelFrom, parseFigures, rateLawView, runView, timesTable, type AcetoneState, type Blocked, type RunReason, type SheetReason, type Slip } from '@/engine/acetone'
import { entryActions, makeRoomRuns, makeRun, rateLawValues, run, wholeLab, wholeSheet } from '@/engine/acetone/testkit'
import * as T from './messages'
import { SPEED } from './watch'

// The iodination of acetone lab's sentences (spec 20.5, with 19.7's last item): that the flask and the flask of
// water beside it, the look of the liquid at any moment and the change that ends a run are said in words; that
// every identifier of the engine has a sentence; and that nothing said before the entries are made gives them.

const m = modelFrom(data)
const fresh = (mode: 'guided' | 'challenge' = 'challenge') => createLab(m, 1, mode)
const FIELDS = fieldsOf(m, 'rate-law')
const SLIPS: Slip[] = ['cut-off', 'wrong-sign', 'not-diluted', 'count-left-out', 'joules-for-kilojoules']
const BLOCKED: Blocked[] = ['lab-completed', 'unknown-run', 'unknown-sheet', 'already-done', 'no-bath', 'not-in-bath', 'thermometer-not-read', 'already-poured', 'not-poured', 'run-over', 'invalid-time', 'run-not-over', 'run-counts', 'too-many', 'runs-missing', 'rate-law-first', 'sheet-over', 'nothing-there', 'not-this-sheet', 'entry-above-missing', 'not-looked', 'same-place', 'invalid-entry', 'sheet-not-full', 'sheet-not-over', 'sheet-counts', 'does-not-follow']
const RUN_REASONS: RunReason[] = ['no-indicator', 'not-at-temperature', 'stopped-early', 'stopped-late', 'ran-out']
const SHEET_REASONS: SheetReason[] = ['entries-do-not-follow', 'orders-differ', 'outside-tolerance']
const left = (microMolar: number) => ({ microMolar })

describe('figures as they are written', () => {
  it('writes a temperature, a time, a volume and a small number as a page shows them', () => {
    expect([T.temperatureText(225), T.secondsText(2853), T.watchText(2853), T.volumeText(10)]).toEqual(['22.5 °C', '285.3 s', '4:45.3', '10.0 mL'])
    expect([T.figuresText(parseFigures('0.800')!), T.figuresText(parseFigures('3.51e-6')!)]).toEqual(['0.800', '3.51 × 10⁻⁶'])
    expect([T.RATE_UNIT, T.CONCENTRATION_UNIT, T.UNIT_LABEL[-1]]).toEqual(['mol/(L·s)', 'mol/L', 'L/(mol·s)'])
  })
})

describe('the lab, its parts and its bench', () => {
  it('names the lab and its two parts, and says what each finds without giving it', () => {
    expect(T.LAB_TEXT.name).toBe('The iodination of acetone')
    expect(PART_IDS.map((part) => T.partTitle(data, part))).toEqual(['Part 1: Four mixtures at room temperature', 'Part 2: The rate law'])
    expect(T.PART_AIM['rate-law']).toBe('The order in acetone, in hydrogen ion and in iodine, and the rate constant.')
    expect(T.LAB_TEXT.completeWhen).toBe('The lab is complete once both parts are done.')
  })

  it('sets out the bench of spec 20.1: three bottles, water, a flask and a flask of water on white paper, a stopwatch and a thermometer', () => {
    expect(T.benchLines(data, 225)).toEqual([
      'Acetone solution, 4.0 M.',
      'Hydrochloric acid, 1.0 M.',
      'Iodine solution, 0.0050 M.',
      'Distilled water.',
      'A flask for the mixture, and a second flask of water to compare it with, both on white paper.',
      'A stopwatch.',
      'A thermometer. In the room it reads 22.5 °C.',
    ])
  })
})

describe('a mixture', () => {
  it('is set out as a table and in words: what is in the flask, and the iodine that is poured in to start', () => {
    expect(RUN_IDS.map((id) => T.runTitle(data, id))).toEqual(['Mixture 1', 'Mixture 2', 'Mixture 3', 'Mixture 4'])
    expect(T.mixtureRows(data, 'mixture-4')).toEqual([
      { where: 'In the flask', liquid: 'Acetone solution, 4.0 M', volume: '10.0 mL' },
      { where: 'In the flask', liquid: 'Hydrochloric acid, 1.0 M', volume: '10.0 mL' },
      { where: 'In the flask', liquid: 'Distilled water', volume: '10.0 mL' },
      { where: 'Poured in to start', liquid: 'Iodine solution, 0.0050 M', volume: '20.0 mL' },
    ])
    expect(T.mixtureText(data, 'mixture-1')).toBe('In the flask: acetone solution, 10.0 mL; hydrochloric acid, 10.0 mL; distilled water, 20.0 mL. Poured in to start the run: iodine solution, 10.0 mL. That is 50.0 mL in all.')
    expect(T.mixtureTotal(data, 'mixture-2')).toBe('50.0 mL in all, once the iodine is poured in.')
  })
})

describe('the flask and the flask of water beside it, in words', () => {
  it('says what stands on the paper and what has been done, before the pour and after it', () => {
    expect(T.flaskText(data, 'mixture-1', { poured: false })).toBe(
      'The flask stands on white paper. It holds the acetone, the acid and the water of this mixture, 40.0 mL. The iodine solution, 10.0 mL, has been measured out and has not been poured in. Beside it stands a second flask, with 50.0 mL of distilled water, to compare the colour with.',
    )
    expect(T.flaskText(data, 'mixture-4', { poured: true })).toBe('The flask stands on white paper. The iodine solution has been poured into it, which makes 50.0 mL. Beside it stands a second flask, with 50.0 mL of distilled water, to compare the colour with.')
    expect(T.flaskText(data, 'mixture-4', { poured: false })).toContain('30.0 mL. The iodine solution, 20.0 mL,')
  })

  it('says nothing of what the liquid will do, or of its colour, which is said apart', () => {
    for (const id of RUN_IDS) for (const poured of [false, true]) expect(T.flaskText(data, id, { poured })).not.toMatch(/yellow|fade|will|soon|seconds|minutes/i)
  })
})

describe("the liquid's look at any moment, in words (spec 20.2)", () => {
  it('has four words for it, by how much iodine is left: yellow, pale yellow, the faintest yellow, and no colour', () => {
    expect([2000, 1000, 500, 499, 100, 99, 1, 0].map((microMolar) => T.liquidLook(data, left(microMolar)))).toEqual(['yellow', 'yellow', 'yellow', 'pale-yellow', 'pale-yellow', 'faintest-yellow', 'faintest-yellow', 'none'])
    expect(T.LOOK_TEXT).toEqual({ yellow: 'yellow', 'pale-yellow': 'pale yellow', 'faintest-yellow': 'the faintest yellow', none: 'no colour' })
    // The steps are the record's own parameters.
    expect([data.parameters.paleBelowMicroMolar.value, data.parameters.faintestBelowMicroMolar.value]).toEqual([500, 100])
  })

  it('says each as it is seen, with the water beside it, and that at the end the two cannot be told apart', () => {
    expect(T.liquidText(data, left(1000), false)).toBe('The liquid in the flask is colourless, like the water in the flask beside it.')
    expect(T.liquidText(data, left(1000), true)).toBe('The mixture is yellow. The water in the flask beside it has no colour.')
    expect(T.liquidText(data, left(300), true)).toBe('The mixture is pale yellow. The water in the flask beside it has no colour.')
    expect(T.liquidText(data, left(1), true)).toBe('The mixture is the faintest yellow. The water in the flask beside it has no colour.')
    expect(T.liquidText(data, left(0), true)).toBe('The mixture has no colour: it cannot be told from the water in the flask beside it.')
    expect(data.rateLaw.end).toMatchObject({ before: { value: 'yellow' }, after: { value: 'colourless' } })
  })

  it('follows a run of the engine from the pour to the end: yellow at the pour, a colour of some kind while any iodine is left, and none exactly when the run ends', () => {
    for (const id of RUN_IDS) {
      const state = run(m, fresh(), [{ type: 'pour', run: id }])
      const end = timesTable(m, run(m, state, [{ type: 'stopAtEnd', run: id }])).find((row) => row.runId === id)!.tenths! * 100
      const at = (ms: number) => T.liquidLook(data, leftAt(m, state, id, ms)!)
      expect([at(0), at(end * 0.4), at(end * 0.7), at(end * 0.97), at(end + 100)], id).toEqual(id === 'mixture-4' ? ['yellow', 'yellow', 'yellow', 'faintest-yellow', 'none'] : ['yellow', 'yellow', 'pale-yellow', 'faintest-yellow', 'none'])
      let seen: T.LiquidLook[] = []
      for (let ms = 0; ms <= end + 200; ms += 50) {
        const look = at(ms)
        if (seen.at(-1) !== look) seen = [...seen, look]
        expect(look === 'none', `${id} ${ms}`).toBe(lookAt(m, state, id, ms) === 'after')
      }
      expect(seen, id).toEqual(['yellow', 'pale-yellow', 'faintest-yellow', 'none'])
    }
  })

  it('has a sentence for each step of the fade, and for the change that ends a run, so that colour is not the only signal', () => {
    expect((['yellow', 'pale-yellow', 'faintest-yellow', 'none'] as const).map(T.fadeText)).toEqual(['', 'The mixture has faded to pale yellow.', 'The mixture has faded to the faintest yellow.', 'The last of the yellow has gone.'])
    expect(T.CHANGE_TEXT).toBe('The last of the yellow has gone.')
  })

  it('says the end always, and a step only where there is room to say it before the end: a step with no room leaves the line saying the step before it, or nothing', () => {
    const amounts = [1000, 499, 99, 0]
    const said = (room: (step: number) => boolean) => amounts.map((microMolar) => T.fadeSaid(data, left(microMolar), room))
    const [pale, faintest] = [T.fadeText('pale-yellow'), T.fadeText('faintest-yellow')]
    expect(said(() => true)).toEqual(['', pale, faintest, T.CHANGE_TEXT])
    expect(said(() => false)).toEqual(['', '', '', T.CHANGE_TEXT])
    // Room for the first step and not for the second: the line goes on saying the first until the end.
    expect(said((step) => step === data.parameters.paleBelowMicroMolar.value)).toEqual(['', pale, pale, T.CHANGE_TEXT])
  })

  it('says beside a running watch what the one speed of the four mixtures is, a minute on the watch to a second, and of a run that was left that no time was recorded, with nothing of when the colour goes', () => {
    expect(T.RUN_TEXT.fast).toBe('One second here is one minute on the watch, for all four mixtures.')
    // The sentence and the speed are one figure: sixty seconds of the lab's time to a true second.
    expect(SPEED).toBe(60)
    expect(T.RUN_TEXT.left).toBe('This run was left while its watch was running, so no time was recorded. The flask is as it was before the pour: pour the iodine in again to time it.')
  })

  it('says how the watch stands', () => {
    expect(T.watchStatusText({ poured: false, stopped: null }, 0, m)).toBe('The watch has not been started.')
    expect(T.watchStatusText({ poured: true, stopped: null }, 1244, m)).toBe('The watch is running: 2:04.4.')
    expect(T.watchStatusText({ poured: true, stopped: { tenths: 2853, by: 'hand' } }, 0, m)).toBe('The watch was stopped by hand at 4:45.3, which is 285.3 s.')
    expect(T.watchStatusText({ poured: true, stopped: { tenths: 2853, by: 'end' } }, 0, m)).toBe('The watch was stopped when the colour had gone, at 4:45.3, which is 285.3 s.')
    expect(T.watchStatusText({ poured: true, stopped: { tenths: 18000, by: 'hand' } }, 0, m)).toBe('The watch stopped itself at 30:00.0, which is 1800.0 s.')
  })
})

describe('how a run came out', () => {
  it('says that it counts, or that it does not and why (spec 20.2): stopped before the colour was gone, or long after', () => {
    expect(T.runOutcomeText(m, { state: 'open' }, null)).toBe('')
    expect(T.runOutcomeText(m, { state: 'counts' }, { tenths: 2853, by: 'hand' })).toBe('This run counts: 285.3 s goes into the table of times.')
    expect(T.runOutcomeText(m, { state: 'does-not-count', reasons: ['stopped-early'] }, { tenths: 900, by: 'hand' })).toBe('This run does not count. The watch was stopped while the mixture still had colour. Make this run again.')
    expect(T.runOutcomeText(m, { state: 'does-not-count', reasons: ['stopped-late'] }, { tenths: 2953, by: 'hand' }, false)).toBe('This run does not count. The watch was stopped more than 5 seconds after the last of the colour had gone.')
    for (const reason of RUN_REASONS) expect(T.runReasonText(m, reason).length, reason).toBeGreaterThan(20)
  })

  it('words the runs the engine really makes: one stopped early and one stopped late', () => {
    const early = makeRun(m, fresh(), 'mixture-2', { stop: { earlyMs: 20000 } })
    const late = makeRun(m, fresh(), 'mixture-2', { stop: { delayMs: 6000 } })
    expect(T.runOutcomeText(m, runView(m, early, 'mixture-2').outcome, runView(m, early, 'mixture-2').stopped)).toContain('while the mixture still had colour')
    expect(T.liquidLook(data, leftAt(m, early, 'mixture-2', 0)!)).not.toBe('none')
    expect(T.runOutcomeText(m, runView(m, late, 'mixture-2').outcome, runView(m, late, 'mixture-2').stopped)).toContain('more than 5 seconds after')
    expect(T.runProgressOf(runView(m, late, 'mixture-2'))).toBe('not-counted')
    expect((['mixture-1'] as const).map((id) => T.runProgressOf(runView(m, fresh(), id)))).toEqual(['not-started'])
    expect(T.runProgressOf(runView(m, run(m, fresh(), [{ type: 'pour', run: 'mixture-1' }]), 'mixture-1'))).toBe('running')
  })

  it('has no warning to give before a pour: the bench can make no error of technique beyond the watch', () => {
    expect(T.MODE_TEXT.guided).not.toMatch(/warn/i)
    expect(can(m, fresh('guided'), { type: 'pour', run: 'mixture-1' })).toBeNull()
  })
})

describe('the table of times', () => {
  it('says each row as a sentence', () => {
    const table = timesTable(m, makeRoomRuns(m, fresh(), { stop: 'end' }))
    expect(table.map((row) => T.timeRowText(data, row))).toEqual([
      'Mixture 1: 22.5 °C, 285.3 s, watch stopped when the colour had gone.',
      'Mixture 2: 22.5 °C, 144.2 s, watch stopped when the colour had gone.',
      'Mixture 3: 22.5 °C, 145.5 s, watch stopped when the colour had gone.',
      'Mixture 4: 22.5 °C, 581.8 s, watch stopped when the colour had gone.',
    ])
    expect(T.timeRowText(data, timesTable(m, fresh())[0]!)).toBe('Mixture 1: not timed yet.')
  })
})

describe('the notebook', () => {
  it('labels its nine entries, each with how it is made and the relation it uses', () => {
    expect(FIELDS.map((field) => T.fieldLabel(data, field))).toEqual([
      'Concentration of acetone, CH₃COCH₃, in mixture 1 once it is mixed, in mol/L',
      'Concentration of hydrogen ion, H⁺, in mixture 1 once it is mixed, in mol/L',
      'Concentration of iodine, I₂, in mixture 1 once it is mixed, in mol/L',
      'Rate of mixture 1, in mol/(L·s)',
      'Order in acetone, from mixtures 1 and 2',
      'Order in hydrogen ion, from mixtures 1 and 3',
      'Order in iodine, from mixtures 1 and 4',
      'Rate constant of mixture 1',
      'Unit of the rate constant',
    ])
    for (const field of FIELDS) {
      expect(T.formatHelp(field).length, field).toBeGreaterThan(10)
      expect(T.relationText(field).length, field).toBeGreaterThan(60)
    }
    expect(T.relationText('rate')).toBe('Rate = concentration of iodine in the mixture ÷ time. All of the iodine was used up by the end of the run. Its concentration is your entry above, and the time is in the table of times, in seconds.')
    // Nothing is divided by six here, and no relation says so.
    expect(FIELDS.map((field) => T.relationText(field)).join(' ')).not.toMatch(/÷ 6|sixth|thiosulfate/)
  })

  it('gives in no label, format or relation an order of this reaction, a figure of a run, or what the model holds', () => {
    const said = FIELDS.flatMap((field) => [T.fieldLabel(data, field), T.formatHelp(field), T.relationText(field)]).join(' ')
    expect(said).not.toMatch(/2\.91|20\.6|0\.800|0\.200|0\.00100|first order|zero order|order nought/i)
    // The examples of how a number is typed are no figure a run of this bench can have.
    const state = wholeLab(m, fresh())
    const typed = Object.values(rateLawValues(m, state)).filter((value) => typeof value === 'object').map((value) => T.entryText(value as never))
    for (const example of ['0.0123', '1.23e-6', '1.23e-4']) expect(typed).not.toContain(example)
  })

  it('offers the three orders and the five units, and shows an entry once it is made', () => {
    expect(T.orderChoices(m).map((choice) => choice.label)).toEqual(['0', '1', '2'])
    expect(T.unitChoices(m).map((choice) => choice.label)).toEqual(['1/s', 'L/(mol·s)', 'L²/(mol²·s)', 'L³/(mol³·s)', 'L⁴/(mol⁴·s)'])
    expect([T.valueText('concentration:acetone', parseFigures('0.800')!), T.valueText('rate', parseFigures('3.51e-6')!), T.valueText('order:iodine', 0), T.valueText('unit', -1), T.valueText('rateConstant', parseFigures('2.19e-5')!)]).toEqual(['0.800 mol/L', '3.51 × 10⁻⁶ mol/(L·s)', 'order 0', 'L/(mol·s)', '2.19 × 10⁻⁵'])
    expect(parseFigures(T.entryText(parseFigures('3.51e-6')!))).toEqual(parseFigures('3.51e-6'))
  })

  it('says what the notebook has filled in, and for how many runs', () => {
    expect(T.NOTEBOOK_TEXT.filledRows).toContain('The notebook has worked the other three the same way')
    expect(T.NOTEBOOK_TEXT.filledConstants).toContain('the mean of all four')
    expect(T.SHEET_TABLE_TEXT.concentration(data, 'iodine')).toBe('[I₂], in mol/L')
    const view = rateLawView(m, wholeLab(m, fresh()))
    expect(view.rows!.length + 1).toBe(4)
  })
})

describe('refusals and feedback', () => {
  it('has a sentence for every reason an action can be refused, and for every slip', () => {
    for (const blocked of BLOCKED) expect(T.blockedText(blocked).length, blocked).toBeGreaterThan(15)
    for (const slip of SLIPS) for (const field of FIELDS) expect(T.blockedText(slip, field).length, `${slip} ${field}`).toBeGreaterThan(15)
    expect(T.blockedText('runs-missing')).toBe('The notebook opens once all four runs count. Make the runs that are not in the table of times yet.')
    expect(T.blockedText('already-poured')).toBe('The iodine is in and the watch is running. Stop the watch when the colour has gone.')
    expect(T.blockedText('invalid-entry', 'rate')).toBe('That is not written as this entry is. Three significant figures. A small number can be typed with a power of ten: 1.23e-6')
    expect(T.blockedText('invalid-entry', 'order:iodine')).toBe('Choose one.')
  })

  it('says that an entry does not follow, and the kind of slip where the engine knows one, and never the value', () => {
    expect(T.entryFeedback('rate', { follows: true, slip: null })).toBe('')
    expect(T.entryFeedback('concentration:iodine', { follows: false, slip: 'not-diluted' })).toBe('That is the concentration in the bottle. In the mixture the solution is thinned by the others: use the volume of it and the whole volume.')
    expect(T.entryFeedback('rate', { follows: false, slip: null })).toBe('That does not follow from the iodine in the mixture and the time in the table. Check that the time is in seconds.')
    expect(T.entryFeedback('order:iodine', { follows: false, slip: null })).toBe('That is not the order the two rates give. Divide one rate by the other and see which ratio it is nearest.')
    expect(T.blockedText('does-not-follow', 'unit')).toBe('That is not the unit your three orders give.')
    const said = [...FIELDS.map((field) => T.entryFeedback(field, { follows: false, slip: null })), ...SLIPS.map((slip) => T.blockedText(slip, 'rate'))].join(' ')
    expect(said).not.toMatch(/\d\.\d|order (0|1|2)\b/)
  })

  it('words what Guided really refuses: a strength left as the bottle\'s, and an order the runs do not give', () => {
    const timed = makeRoomRuns(m, fresh('guided'), { stop: 'end' })
    const refusal = can(m, timed, { type: 'enter', sheet: 'rate-law', field: 'concentration:acetone', value: parseFigures('4.00')! })
    expect([refusal, T.blockedText(refusal!, 'concentration:acetone')]).toEqual(['not-diluted', 'That is the concentration in the bottle. In the mixture the solution is thinned by the others: use the volume of it and the whole volume.'])
    const upToOrders = run(m, timed, entryActions(m, 'rate-law', rateLawValues(m, timed)).slice(0, 6))
    const wrong = can(m, upToOrders, { type: 'enter', sheet: 'rate-law', field: 'order:iodine', value: 1 })
    expect([wrong, T.blockedText(wrong!, 'order:iodine')]).toEqual(['does-not-follow', 'That is not the order the two rates give. Divide one rate by the other and see which ratio it is nearest.'])
  })
})

describe('a notebook that is checked', () => {
  it('says that it counts and how near the result was, or that it does not and why', () => {
    const done = wholeLab(m, fresh())
    const view = rateLawView(m, done)
    expect(T.sheetOutcomeText(m, view.outcome)).toMatch(/^This notebook counts: every entry follows, and the mean rate constant is within 5% of what the lab's model gives at this room's temperature\. Yours is (\d\.\d% (under|over)|equal to) it\.$/)
    expect(T.sheetOutcomeText(m, { state: 'open' })).toBe('')
    expect(T.sheetOutcomeText(m, { state: 'does-not-count', reasons: ['entries-do-not-follow'], percentOff: null })).toBe('This notebook does not count. An entry does not follow from your own numbers. The notebook marks which. Work this notebook again.')
    expect(T.sheetOutcomeText(m, { state: 'does-not-count', reasons: ['outside-tolerance'], percentOff: null }, false)).toBe("This notebook does not count. The result is more than 5% from what the lab's model gives.")
    for (const reason of SHEET_REASONS) expect(T.sheetReasonText(m, reason).length, reason).toBeGreaterThan(20)
  })

  it("says what the result was held to only from what the engine hands over once the part is done: the model's orders and its rate constant at the room's temperature", () => {
    const view = rateLawView(m, wholeLab(m, fresh()))
    expect(T.rateLawExpectedText(data, view.expected!)).toBe("The lab's model has order 1 in acetone, order 1 in hydrogen ion and order 0 in iodine: rate = k[CH₃COCH₃][H⁺]. At 22.5 °C, this room's temperature, it gives a rate constant of 2.17 × 10⁻⁵ L/(mol·s).")
    expect(rateLawView(m, makeRoomRuns(m, fresh())).expected).toBeNull()
    expect(T.partNotes(data, 'rate-law')).toEqual(data.parts[1].notes.map((note) => note.value))
    expect(T.partNotes(data, 'runs').length).toBe(3)
  })
})

describe('progress, modes and the record', () => {
  it('says how far a part has come, and what each mode does', () => {
    const timed = makeRoomRuns(m, fresh())
    const views = (state: AcetoneState) => RUN_IDS.map((id) => runView(m, state, id))
    expect(T.partProgressOf(false, views(fresh()), null)).toBe('not-started')
    expect(T.partProgressOf(false, views(run(m, fresh(), [{ type: 'pour', run: 'mixture-3' }])), null)).toBe('runs')
    expect(T.partProgressOf(false, views(timed), rateLawView(m, run(m, timed, entryActions(m, 'rate-law', rateLawValues(m, timed)).slice(0, 2))))).toBe('notebook')
    expect(T.partProgressOf(false, views(timed), rateLawView(m, wholeSheet(m, timed, 'rate-law', { slip: 'not-diluted' })))).toBe('not-counted')
    expect(T.partProgressOf(true, views(timed), null)).toBe('done')
    expect(T.runsCountText(3, 4)).toBe('3 of 4 runs count')
    expect(T.MODE_TEXT.challenge).toContain('checked all together when you ask')
    expect(T.RECORD_TEXT.timedByEnd(2853)).toBe('285.3 s, watch stopped when the colour had gone')
    // A hand's own delay is said where the colour had gone, and a watch left to its limit stopped itself.
    expect([T.RECORD_TEXT.timedByHandAfter(2853, 430), T.RECORD_TEXT.timedByHandAfter(1240, 2649)]).toEqual(['285.3 s, watch stopped by hand 0.4 s after the colour had gone', '124.0 s, watch stopped by hand 2.6 s after the colour had gone'])
    expect(T.RECORD_TEXT.timedOut(18000)).toBe('1800.0 s, the watch stopped itself')
    expect(T.RECORD_TEXT.region).toBe('Record of the two parts')
  })
})

describe('every sentence of the page', () => {
  const strings = (value: unknown): string[] => (typeof value === 'string' ? [value] : Array.isArray(value) ? value.flatMap(strings) : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : [])
  /** What the page can say before anything of the model may be said: every fixed string, and every sentence a function gives for a lab in which the notebook is not done. */
  const before = (): string[] => {
    const timed = makeRoomRuns(m, fresh())
    return [
      ...strings([T.LAB_TEXT, T.PART_AIM, T.PART_DONE_WHEN, T.RUN_TEXT, T.LOOK_TEXT, T.RUN_PROGRESS_TEXT, T.TABLE_TEXT, T.NOTEBOOK_TEXT, T.VERDICT_TEXT, T.PART_PROGRESS_TEXT, T.MODE_TEXT, T.SOURCES_TEXT, T.CHANGE_TEXT]),
      ...strings({ ...T.SHEET_TABLE_TEXT, concentration: T.SHEET_TABLE_TEXT.concentration(data, 'acetone') }),
      ...strings({ ...T.PAGE_TEXT, previous: T.PAGE_TEXT.previous('x'), next: T.PAGE_TEXT.next('x') }),
      ...strings({ ...T.RECORD_TEXT, attempt: T.RECORD_TEXT.attempt(1), working: T.RECORD_TEXT.working(1), timedByHand: T.RECORD_TEXT.timedByHand(2853), timedByHandAfter: T.RECORD_TEXT.timedByHandAfter(2853, 430), timedByEnd: T.RECORD_TEXT.timedByEnd(2853), timedOut: T.RECORD_TEXT.timedOut(18000) }),
      ...PART_IDS.map((part) => T.partTitle(data, part)),
      ...T.benchLines(data, 225),
      ...RUN_IDS.flatMap((id) => [T.runTitle(data, id), T.mixtureText(data, id), T.mixtureTotal(data, id), T.flaskText(data, id, { poured: false }), T.flaskText(data, id, { poured: true }), ...strings(T.mixtureRows(data, id))]),
      ...[2000, 700, 300, 50, 0].flatMap((microMolar) => [T.liquidText(data, left(microMolar), true), T.fadeText(T.liquidLook(data, left(microMolar)))]),
      T.liquidText(data, left(1000), false),
      T.watchStatusText({ poured: false, stopped: null }, 0, m),
      T.watchStatusText({ poured: true, stopped: null }, 600, m),
      ...RUN_REASONS.map((reason) => T.runOutcomeText(m, { state: 'does-not-count', reasons: [reason] }, { tenths: 900, by: 'hand' })),
      T.runOutcomeText(m, { state: 'counts' }, { tenths: 2853, by: 'end' }),
      ...timesTable(m, timed).map((row) => T.timeRowText(data, row)),
      ...FIELDS.flatMap((field) => [T.fieldLabel(data, field), T.formatHelp(field), T.relationText(field), T.entryFeedback(field, { follows: false, slip: null })]),
      ...SLIPS.map((slip) => T.blockedText(slip, 'rate')),
      ...BLOCKED.flatMap((blocked) => [T.blockedText(blocked), T.blockedText(blocked, 'rate')]),
      ...SHEET_REASONS.map((reason) => T.sheetOutcomeText(m, { state: 'does-not-count', reasons: [reason], percentOff: null })),
      ...strings(T.orderChoices(m)),
      ...strings(T.unitChoices(m)),
    ].filter((text) => text !== '')
  }
  /** What is said only once the notebook is done. */
  const after = (): string[] => {
    const view = rateLawView(m, wholeLab(m, fresh()))
    return [T.sheetOutcomeText(m, view.outcome), T.rateLawExpectedText(data, view.expected!), ...PART_IDS.flatMap((part) => T.partNotes(data, part))]
  }

  it('is there: over a hundred and fifty of them before the notebook is done', () => {
    expect(new Set(before()).size).toBeGreaterThan(150)
  })

  it('gives nothing of what is expected before the entries are made: no order of this reaction, no rate law, no rate constant of the model, and nothing of why the iodine does not count', () => {
    for (const text of before()) {
      expect(text, text).not.toMatch(/2\.91|20\.6|86\.2|enol|slow step|k\[|nought/i)
      expect(text, text).not.toMatch(/(first|second|zero)[- ]order|order (0|1|2) in/i)
      expect(text, text).not.toMatch(/does not depend|same rate|twice as long|steady/i)
    }
    // What is said once the part is done does say them.
    expect(after().join(' ')).toMatch(/order 0 in iodine/)
  })

  it('says of the liquid only what is seen, in every sentence a run shows before its watch is stopped', () => {
    const state = run(m, fresh(), [{ type: 'pour', run: 'mixture-1' }])
    const attempt = currentAttempt(state, 'mixture-1')
    expect(attempt.stop).toBeNull()
    const shown = [T.flaskText(data, 'mixture-1', runView(m, state, 'mixture-1')), T.liquidText(data, leftAt(m, state, 'mixture-1', 60000)!, true), T.watchStatusText(runView(m, state, 'mixture-1'), 600, m)].join(' ')
    expect(shown).not.toMatch(/\d+(\.\d)? s\b|will|left|micromol|percent|%/)
  })

  it('is short and plain: no sentence of the page over 45 words, and none holds institution text', () => {
    const local = import.meta.glob<string[]>('../../../chem-data/denylist.local.json', { eager: true, import: 'default' })
    const names = Object.values(local).flat()
    for (const text of [...before(), ...after().slice(0, 2)]) {
      for (const sentence of text.split(/(?<=[.:]) /)) expect(sentence.split(/\s+/).length, sentence).toBeLessThanOrEqual(45)
      expect(findInstitutionText(text, names), text).toBeNull()
    }
  })

  // No quotation: the fingerprint of the pages is not kept in the repository, and the case is skipped where it is absent (see src/chem-data/acetone/quotation.test.ts).
  type Lib = { unpackHashes(base64: string): Set<number>; quotedRuns(text: string, fingerprint: Set<number>): string[] }
  const [lib] = Object.values(import.meta.glob<Lib>('../../../../scripts/titration-lib.mjs', { eager: true }))
  const [fingerprint] = Object.values(import.meta.glob<{ hashes: string }>('../../../../docs/research/acetone/sources/quotation-fingerprint.json', { eager: true, import: 'default' }))
  it.skipIf(fingerprint === undefined)('repeats no run of six words of a page the lab rests on (skipped where the fingerprint is absent)', () => {
    const pages = lib!.unpackHashes(fingerprint!.hashes)
    for (const text of [...new Set([...before(), ...after()])]) expect(lib!.quotedRuns(text, pages), text).toEqual([])
  })
})
