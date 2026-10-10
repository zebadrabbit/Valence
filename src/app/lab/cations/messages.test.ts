import { describe, expect, it } from 'vitest'
import { cationsData, ION_IDS, PART_IDS, STEP_IDS, type IonId, type PartId, type StepId } from '@/chem-data/cations/data'
import { findInstitutionText } from '@/chem-data/denylist'
import { createLab, FIELDS, LOOKS, modelFrom, partView, reduce, type Blocked, type CationsState, type Reason, type TubeShows, type Warning } from '@/engine/cations'
import { run, wholeRun, workStep, type Technique } from '@/engine/cations/testkit'
import {
  ACTION_LABEL,
  addLabel,
  benchLines,
  blockedText,
  CHART_TEXT,
  checkedText,
  choiceLabel,
  choiceList,
  doneText,
  dropsText,
  FIELD_LABEL,
  HINT,
  holdsText,
  ionLabel,
  LAB_TEXT,
  litmusText,
  LOOK_FIRST,
  LOOK_PART,
  lookLabel,
  lookText,
  mismatchText,
  MODE_TEXT,
  namedText,
  NAMING_TEXT,
  NOTES_TEXT,
  observationLines,
  outcomeText,
  PAGE_TEXT,
  PART_AIM,
  partTitle,
  placeLabel,
  POUR_LABEL,
  PROGRESS_TEXT,
  progressOf,
  reasonText,
  RECORD_TEXT,
  SAMPLE_HAZARDS_HEADING,
  SOURCES_TEXT,
  STEP_STATUS_TEXT,
  STEP_TASK,
  stepEquations,
  stepNotes,
  stepTitle,
  tileLabel,
  TUBE_NAME,
  tubeText,
  WARNING_BUTTONS,
  WARNING_TEXT,
} from './messages'

const m = modelFrom(cationsData)
const data = cationsData
const UNKNOWNS: IonId[][] = [['silver'], ['lead'], ['mercury-i'], ['silver', 'lead'], ['silver', 'mercury-i'], ['lead', 'mercury-i'], ['silver', 'lead', 'mercury-i']]
const COLOURS = /white|yellow|orange|grey|black|colourless/i
const SLIPS: Technique[] = [{}, { uncentrifugedAt: 0 }, { uncentrifugedAt: 1 }, { uncentrifugedAt: 3 }, { heat: false }, { judgeEarly: true }]

/** Every tube a learner can be shown: each step's tube after every action of a careful run and of each careless one, for the known and for seven runs of part 2, which are the seven unknowns. */
function everyTube(): TubeShows[] {
  const seen = new Map<string, TubeShows>()
  const keep = (state: CationsState, part: PartId) => {
    for (const step of partView(m, state, part).steps) if (step.shows) seen.set(JSON.stringify(step.shows), step.shows)
    return state
  }
  for (const how of SLIPS) {
    wholeRun(m, createLab(1, 'challenge'), 'known', how, (state) => keep(state, 'known'))
    let state = createLab(1, 'challenge')
    for (let i = 0; i < UNKNOWNS.length; i++) {
      state = wholeRun(m, state, 'unknown', how, (s) => keep(s, 'unknown'))
      state = reduce(m, state, { type: 'runAgain', part: 'unknown' })
    }
  }
  return [...seen.values()]
}
const tubes = everyTube()
const key = (shows: TubeShows) => `${shows.solid ? `${shows.solid.colour}${shows.solid.settled ? '' : ' (spread)'}` : 'no solid'} | ${shows.liquid ? `${shows.liquid.colour}${shows.liquid.cloudy ? ' (cloudy)' : ''}` : 'no liquid'}`

describe('the description in words of every tube (spec 17.7, last item)', () => {
  it('covers every tube a careful or a careless run can show: twelve kinds', () => {
    expect([...new Set(tubes.map(key))].sort()).toEqual([
      'grey to black (spread) | colourless (cloudy)',
      'grey to black | colourless',
      'no solid | colourless',
      'no solid | no liquid',
      'no solid | yellow to orange',
      'white (spread) | colourless (cloudy)',
      'white (spread) | yellow to orange (cloudy)',
      'white | colourless',
      'white | no liquid',
      'white | yellow to orange',
      'yellow (spread) | yellow to orange (cloudy)',
      'yellow | yellow to orange',
    ])
  })

  it('says each kind in a sentence or two, as it is seen', () => {
    const said = Object.fromEntries(tubes.map((shows) => [key(shows), tubeText(shows)]))
    expect(said).toMatchObject({
      'no solid | no liquid': 'The tube is empty.',
      'no solid | colourless': 'The tube holds a liquid that is clear and colourless. There is no solid in it.',
      'no solid | yellow to orange': 'The tube holds a liquid that is clear, and yellow to orange. There is no solid in it.',
      'white (spread) | colourless (cloudy)': 'The tube holds a cloudy liquid: a white solid is spread through a liquid that is itself colourless. Nothing has settled yet.',
      'white | colourless': 'A white solid is packed at the bottom of the tube. The liquid over it is clear and colourless.',
      'white | no liquid': 'A white solid lies at the bottom of the tube, with no liquid over it.',
      'yellow (spread) | yellow to orange (cloudy)': 'The tube holds a cloudy liquid: a yellow solid is spread through a liquid that is itself yellow to orange. Nothing has settled yet.',
      'yellow | yellow to orange': 'A yellow solid is packed at the bottom of the tube. The liquid over it is clear, and yellow to orange.',
      'grey to black | colourless': 'A grey to black solid is packed at the bottom of the tube. The liquid over it is clear and colourless.',
    })
    expect(tubeText(null)).toBe('The tube is empty.')
    // The first tube after step 4 is no step's tube any more; described all the same, it reads so.
    expect(tubeText({ liquid: null, solid: { colour: 'grey to black', settled: true } })).toBe('A grey to black solid lies at the bottom of the tube, with no liquid over it.')
  })

  it('names the colour of the solid and of the liquid wherever there is one, says cloudy just where the solid is spread through the liquid, and never says what anything is', () => {
    for (const shows of tubes) {
      const text = tubeText(shows)
      if (shows.solid) expect(text, key(shows)).toContain(`${shows.solid.colour} solid`)
      if (shows.liquid) expect(text, key(shows)).toContain(shows.liquid.colour)
      expect(text.includes('cloudy'), key(shows)).toBe(shows.liquid?.cloudy === true)
      expect(text.includes('clear'), key(shows)).toBe(shows.liquid !== null && !shows.liquid.cloudy)
      expect(text, key(shows)).not.toMatch(/chlor|chromat|silver|lead|mercury|ammon|hydrox|Ag|Pb|Hg|precipitate/)
    }
  })

  it('says of each part of a tube what is seen there, and the two looks together say what the whole description says', () => {
    for (const shows of tubes) {
      const [liquid, bottom] = [lookText(shows, 'liquid'), lookText(shows, 'bottom')]
      expect(`${liquid} ${bottom}`, key(shows)).not.toMatch(/chlor|chromat|silver|lead|mercury|ammon|hydrox|Ag|Pb|Hg|precipitate/)
      if (shows.liquid) expect(liquid, key(shows)).toContain(shows.liquid.colour)
      else expect(liquid).toBe('There is no liquid in the tube.')
      // The solid's colour is said where the solid is: at the bottom once it has settled, in the liquid while it is spread through it.
      if (shows.solid) expect(shows.solid.settled ? bottom : liquid, key(shows)).toContain(`${shows.solid.colour} solid`)
      if (shows.solid && !shows.solid.settled) expect(bottom).toBe('Nothing has settled at the bottom yet.')
      if (!shows.solid) expect(bottom, key(shows)).toMatch(/^(No solid is at the bottom|The tube is empty)\.$/)
    }
    const cloudy = tubes.find((shows) => key(shows) === 'white (spread) | colourless (cloudy)')!
    expect(lookText(cloudy, 'liquid')).toBe('The liquid is cloudy: a white solid is spread through it. The liquid itself is colourless.')
    const packed = tubes.find((shows) => key(shows) === 'yellow | yellow to orange')!
    expect([lookText(packed, 'bottom'), lookText(packed, 'liquid')]).toEqual(['A yellow solid is packed at the bottom.', 'The liquid is clear, and yellow to orange.'])
    const dry = tubes.find((shows) => key(shows) === 'white | no liquid')!
    expect(lookText(dry, 'bottom')).toBe('A white solid lies at the bottom, with no liquid over it.')
  })

  it('tells a yellow liquid from a yellow solid in words: the one is clear, the other is a solid at the bottom', () => {
    const withLead = tubeText({ liquid: { colour: 'yellow to orange', cloudy: false, microlitres: 1000 }, solid: { colour: 'yellow', settled: true } })
    const without = tubeText({ liquid: { colour: 'yellow to orange', cloudy: false, microlitres: 1000 }, solid: null })
    expect(withLead).toContain('A yellow solid is packed at the bottom')
    expect(without).toContain('There is no solid in it.')
    expect(without).not.toContain('yellow solid')
  })
})

describe('the parts, the bench and the steps', () => {
  it('names the lab, its two parts and its five steps', () => {
    expect(LAB_TEXT.title).toBe('Group I cations')
    expect(PART_IDS.map(partTitle)).toEqual(['Part 1: The known', 'Part 2: An unknown'])
    expect(STEP_IDS.map((id) => stepTitle(data, id))).toEqual(['Step 1: Precipitate the group', 'Step 2: Take the lead out', 'Step 3: Confirm lead', 'Step 4: Part silver from mercury', 'Step 5: Confirm silver'])
    expect(TUBE_NAME).toEqual({ a: 'First tube', b: 'Second tube', c: 'Third tube' })
  })

  it('says what is on the bench, the known by what it holds and an unknown by what it may hold', () => {
    expect(benchLines(data, 'known')).toEqual([
      'The sample, in the first test tube: 30 drops of a clear, colourless solution of silver, lead and mercury(I) ions, made from 10 drops of each of the three nitrate solutions.',
      'Reagents, each in a dropper bottle: hydrochloric acid, 6 M; acetic acid, 6 M; potassium chromate solution, 0.5 M; ammonia solution, 6 M; nitric acid, 6 M.',
      'Distilled water, and a beaker of boiling water to heat a tube in.',
      'Two more test tubes, clean and empty.',
      'Blue and red litmus paper.',
      'A centrifuge.',
    ])
    expect(benchLines(data, 'unknown')[0]).toBe('The sample, in the first test tube: 30 drops of a clear, colourless solution. It holds one, two or all three of these ions: silver, lead and mercury(I).')
    expect(benchLines(data, 'unknown').slice(1)).toEqual(benchLines(data, 'known').slice(1))
    expect(SAMPLE_HAZARDS_HEADING.unknown).toContain('The hazards of all three are shown, whichever it holds.')
  })

  it('names each button by what it does, with the amount that goes in', () => {
    expect(STEP_IDS.map((id) => addLabel(data, id))).toEqual([
      'Add 4 drops of hydrochloric acid, 6 M',
      'Add 15 drops of distilled water',
      'Add 1 drop of acetic acid, 6 M, then 4 drops of potassium chromate solution, 0.5 M',
      'Add 15 drops of ammonia solution, 6 M',
      'Add 8 drops of nitric acid, 6 M',
    ])
    expect([dropsText(1), dropsText(4)]).toEqual(['1 drop', '4 drops'])
    expect(POUR_LABEL).toEqual({ precipitate: 'Pour the liquid away', 'extract-lead': 'Pour the hot liquid into the second tube', separate: 'Pour the liquid into the third tube' })
    expect(Object.keys(ACTION_LABEL)).toEqual(['heat', 'centrifuge', 'testLitmus', 'checkStep', 'observe'])
    expect(LOOKS.map((look) => [LOOK_PART[look], lookLabel(look, false), lookLabel(look, true)])).toEqual([
      ['The liquid', 'Look at the liquid', 'Look at the liquid, looked at'],
      ['The bottom of the tube', 'Look at the bottom of the tube', 'Look at the bottom of the tube, looked at'],
    ])
  })

  it('says what has been done to a tube so far, and nothing of what came of it', () => {
    const view = (state: CationsState) => {
      const part = partView(m, state, 'unknown')
      return part.steps.find((step) => step.id === part.step)!
    }
    let state = createLab(1, 'challenge')
    expect(doneText(data, view(state))).toBe('Nothing has been added yet at this step. To add: 4 drops of hydrochloric acid, 6 M.')
    state = run(m, state, [{ type: 'add', part: 'unknown' }])
    expect(doneText(data, view(state))).toBe('Added so far: 4 drops of hydrochloric acid, 6 M.')
    state = run(m, workStep(m, createLab(1, 'challenge'), 'unknown'), [{ type: 'add', part: 'unknown' }])
    expect(doneText(data, view(state))).toBe('Added so far: 15 drops of distilled water. The tube has not been heated.')
    state = run(m, state, [{ type: 'heat', part: 'unknown' }])
    expect(doneText(data, view(state))).toBe('Added so far: 15 drops of distilled water. The tube has stood in the boiling water.')
    state = workStep(m, workStep(m, workStep(m, workStep(m, createLab(1, 'challenge'), 'unknown'), 'unknown'), 'unknown'), 'unknown')
    expect(doneText(data, view(state))).toBe('Nothing has been added yet at this step. To add: 8 drops of nitric acid, 6 M.')
    state = run(m, state, [{ type: 'add', part: 'unknown' }])
    expect(doneText(data, view(state))).toBe('Nitric acid has gone in once, 8 drops each time. Litmus has not been tried since.')
    state = run(m, state, [{ type: 'testLitmus', part: 'unknown' }])
    expect(doneText(data, view(state))).toBe('Nitric acid has gone in once, 8 drops each time. Blue litmus paper stays blue, and red litmus paper turns blue: the liquid is not acid yet.')
    state = run(m, state, [{ type: 'add', part: 'unknown' }, { type: 'testLitmus', part: 'unknown' }])
    expect(doneText(data, view(state))).toBe('Nitric acid has gone in twice, 8 drops each time. Blue litmus paper turns red, and red litmus paper stays red: the liquid is acid.')
    expect(doneText(data, { id: 'confirm-lead', added: 1, heated: false, litmus: null })).toBe('Added so far: 1 drop of acetic acid, 6 M and 4 drops of potassium chromate solution, 0.5 M.')
    expect(litmusText('neutral')).toContain('not acid yet')
  })

  it('tells what to do at each step, and gives a hint for Guided, without a word of what will be seen', () => {
    for (const id of STEP_IDS) {
      expect(STEP_TASK[id].length, id).toBeGreaterThan(40)
      expect(HINT[id].length, id).toBeGreaterThan(80)
      // No colour and no outcome: a learner in Challenge reads the task before the tube shows anything.
      expect(STEP_TASK[id], id).not.toMatch(COLOURS)
      expect(HINT[id], id).not.toMatch(COLOURS)
      expect(`${STEP_TASK[id]} ${HINT[id]}`, id).not.toMatch(/a solid forms|will form|will dissolve|dissolves|turns/)
    }
    expect(PART_AIM.known).not.toMatch(COLOURS)
    expect(PART_AIM.unknown).toContain('one, two or all three')
  })
})

describe('the observation', () => {
  it('asks two questions, with the record\'s words for the choices', () => {
    expect(FIELDS.map((field) => [FIELD_LABEL[field], choiceList(m, field).map((choice) => choice.label)])).toEqual([
      ['Solid in the tube', ['no solid', 'white', 'yellow', 'grey to black']],
      ['Colour of the liquid', ['colourless', 'yellow to orange']],
    ])
    expect(choiceList(m, 'solid').map((choice) => choice.value)).toEqual(data.choices.solid)
    expect(choiceLabel('liquid', 'none')).toBe('none')
    expect(observationLines({ solid: 'none', liquid: 'yellow to orange' })).toEqual(['Solid in the tube: no solid.', 'Colour of the liquid: yellow to orange.'])
    expect(LOOK_FIRST).toContain('Look at the liquid and at the bottom of the tube')
  })

  it('says which part to look at again, and never what it should be', () => {
    expect(mismatchText([])).toBe('')
    expect(mismatchText(['solid'])).toBe('Not yet. Look again at the solid.')
    expect(mismatchText(['solid', 'liquid'])).toBe('Not yet. Look again at the solid and the colour of the liquid.')
    expect(checkedText([])).toBe('Checked: this is what the tube showed.')
    expect(checkedText(['liquid'])).toBe('Checked: the colour of the liquid is not what the tube showed.')
    expect(checkedText(['solid', 'liquid'])).toBe('Checked: the solid and the colour of the liquid are not what the tube showed.')
    for (const text of [mismatchText(['solid', 'liquid']), checkedText(['solid', 'liquid'])]) expect(text).not.toMatch(COLOURS)
  })
})

describe('refusals and warnings', () => {
  const BLOCKED: Blocked[] = [
    'unknown-part', 'run-over', 'steps-done', 'steps-not-done', 'not-this-part', 'not-this-step', 'step-checked', 'already-added', 'tube-full', 'add-first', 'already-heated', 'nothing-to-spin', 'look-first', 'observe-first', 'check-first', 'invalid-entry',
    'no-such-place', 'no-such-tile', 'already-placed', 'not-placed', 'places-empty', 'nothing-to-repeat', 'no-more-runs', 'run-too-long', 'does-not-match', 'wrong-place', 'chart-not-right',
  ]

  it('has a sentence for every reason an action can be refused, none of which says what a tube shows or holds', () => {
    const said = BLOCKED.map((blocked) => blockedText(data, 'unknown', blocked, 'precipitate'))
    expect(new Set(said).size).toBe(BLOCKED.length)
    for (const text of said) {
      expect(text.length).toBeGreaterThan(20)
      expect(text).not.toMatch(COLOURS)
      expect(text).toMatch(/[.]$/)
    }
    expect(blockedText(data, 'unknown', 'add-first', 'separate')).toBe('First: add 15 drops of ammonia solution, 6 M.')
    expect(blockedText(data, 'known', 'not-this-part')).not.toBe(blockedText(data, 'unknown', 'not-this-part'))
    expect(blockedText(data, 'unknown', 'does-not-match')).toBe('That is not what the tube shows. Look at the liquid and at the bottom of the tube again.')
    expect(blockedText(data, 'known', 'wrong-place')).toContain('That does not belong in this place.')
  })

  it("words Guided's three warnings: what is about to go wrong, that the run will not count, and what to do first", () => {
    const WARNINGS: Warning[] = ['not-centrifuged', 'not-heated', 'not-acid']
    expect(WARNINGS.map((warning) => WARNING_TEXT[warning].title)).toEqual(['The solid has not been spun down', 'The water has not been heated', 'Litmus has not shown the liquid to be acid'])
    for (const warning of WARNINGS) {
      const { body } = WARNING_TEXT[warning]
      expect(body, warning).toMatch(/does not count|would not count/)
      expect(body.split(/\s+/).length, warning).toBeLessThanOrEqual(50)
      expect(WARNING_BUTTONS[warning].back).toBe('Go back')
      expect(WARNING_BUTTONS[warning].on).toMatch(/anyway$/)
      // A warning is raised whatever an unknown holds, and says so: "any", "whether ... or not".
      expect(body, warning).not.toMatch(COLOURS)
    }
    expect(WARNING_TEXT['not-heated'].body).toContain('part of any lead chloride stays with the solid')
    expect(WARNING_TEXT['not-acid'].body).toContain('whether silver is there or not')
  })
})

describe('how a run came out', () => {
  const reasonsOf = (state: CationsState, part: PartId): Reason[] => {
    const { outcome } = partView(m, state, part)
    return outcome.state === 'does-not-count' ? outcome.reasons : []
  }

  it('names each cause a run does not count for, with its step', () => {
    const each: Reason[] = [
      { kind: 'poured-uncentrifuged', step: 'precipitate' },
      { kind: 'poured-uncentrifuged', step: 'separate' },
      { kind: 'water-not-heated', step: 'extract-lead' },
      { kind: 'judged-before-acid', step: 'confirm-silver' },
      { kind: 'observation-wrong', step: 'confirm-lead' },
      { kind: 'chart-wrong' },
      { kind: 'ions-wrong' },
    ]
    expect(each.map(reasonText)).toEqual([
      'At step 1 the liquid was poured off before the solid had been spun down, so the solid went over with it.',
      'At step 4 the liquid was poured off before the solid had been spun down, so the solid went over with it.',
      'At step 2 the water was poured off without being heated, so any lead chloride was only partly dissolved and the rest stayed with the solid.',
      'At step 5 what was seen was recorded before litmus had shown the liquid to be acid. Until the liquid is acid no solid can form there, whether silver is in it or not.',
      'What was recorded at step 3 is not what the tube showed.',
      'A place of the flow chart does not hold what belongs in it.',
      'The ions named are not the ones the sample held.',
    ])
  })

  it('says that a run counts, or that it does not and why, and of an unknown what it held, once the run is over and not before', () => {
    let state = createLab(1, 'challenge')
    expect(outcomeText(data, 'unknown', partView(m, state, 'unknown').outcome, partView(m, state, 'unknown').holds)).toBe('')
    state = wholeRun(m, state, 'unknown')
    const counted = partView(m, state, 'unknown')
    expect(outcomeText(data, 'unknown', counted.outcome, counted.holds)).toBe('This run counts: the technique was right, each observation is what its tube showed, and the ions you named are the ones the sample held. The sample held lead ions and neither of the other two.')
    const cold = wholeRun(m, reduce(m, state, { type: 'runAgain', part: 'unknown' }), 'unknown', { heat: false })
    expect(reasonsOf(cold, 'unknown')).toEqual([{ kind: 'water-not-heated', step: 'extract-lead' }])
    const view = partView(m, cold, 'unknown')
    expect(outcomeText(data, 'unknown', view.outcome, view.holds)).toBe(
      'This run does not count. At step 2 the water was poured off without being heated, so any lead chloride was only partly dissolved and the rest stayed with the solid. The sample held lead and mercury(I) ions and not the third. Run this part again: the unknown will be a new one.',
    )
    const known = partView(m, wholeRun(m, createLab(1, 'guided'), 'known'), 'known')
    expect(outcomeText(data, 'known', known.outcome, known.holds)).toBe('This run counts: the technique was right, each observation is what its tube showed, and every place of the flow chart holds what belongs in it.')
    expect(holdsText(data, ION_IDS)).toBe('The sample held silver, lead and mercury(I) ions: all three.')
    expect([namedText(data, []), namedText(data, ['silver', 'mercury-i'])]).toEqual(['You named none of the three ions.', 'You named silver and mercury(I).'])
  })

  it('says how far a part has come', () => {
    const progress = (state: CationsState, part: PartId) => PROGRESS_TEXT[progressOf(partView(m, state, part))]
    let state = createLab(1, 'challenge')
    expect(progress(state, 'unknown')).toBe('Not started')
    state = run(m, state, [{ type: 'add', part: 'unknown' }])
    expect(progress(state, 'unknown')).toBe('Steps under way')
    for (let at = 0; at < 5; at++) state = workStep(m, at === 0 ? createLab(1, 'challenge') : state, 'unknown')
    expect(progress(state, 'unknown')).toBe('Ions to be named')
    expect(progress(run(m, state, [{ type: 'nameIons', part: 'unknown', ions: [] }]), 'unknown')).toBe('Run did not count')
    expect(progress(run(m, state, [{ type: 'nameIons', part: 'unknown', ions: ['lead'] }]), 'unknown')).toBe('Done')
    expect(Object.keys(STEP_STATUS_TEXT)).toEqual(['waiting', 'current', 'done'])
  })
})

describe('the flow chart, the naming and the notes', () => {
  it('names every tile by what it is, and every place by its step and its layer', () => {
    expect(m.tiles.map((tile) => tileLabel(data, tile))).toEqual([
      'Silver chloride, AgCl, a solid',
      'Lead chloride, PbCl₂, a solid',
      'Mercury(I) chloride, Hg₂Cl₂, a solid',
      'Lead chromate, PbCrO₄, a solid',
      'Mercury with mercury(II) amidochloride, Hg + HgNH₂Cl, a solid',
      'Silver ion, Ag⁺, dissolved',
      'Lead ion, Pb²⁺, dissolved',
      'Mercury(I) ion, Hg₂²⁺, dissolved',
      'Silver-ammonia ion, [Ag(NH₃)₂]⁺, dissolved',
    ])
    expect(partView(m, createLab(1, 'guided'), 'known').chart!.places.map(placeLabel)).toEqual(['Step 1: in the solid', 'Step 2: in the solid', 'Step 2: in the liquid', 'Step 3: in the solid', 'Step 4: in the solid', 'Step 4: in the liquid', 'Step 5: in the solid'])
    expect([CHART_TEXT.slots(1), CHART_TEXT.slots(3)]).toEqual(['One tile belongs here.', 'Three tiles belong here.'])
    expect(CHART_TEXT.remove('Lead ion')).toBe('Take out Lead ion')
  })

  it('names the three ions for the tick boxes, and says that the naming is said once', () => {
    expect(ION_IDS.map((ion) => ionLabel(data, ion))).toEqual(['Silver, Ag⁺', 'Lead, Pb²⁺', 'Mercury(I), Hg₂²⁺'])
    expect(NAMING_TEXT.help).toContain('Any of the three may be ticked. This is said once for each run.')
  })

  it("hands over a step's notes and equations as the record has them", () => {
    for (const id of STEP_IDS) {
      const step = data.steps.find((s) => s.id === id)!
      expect(stepNotes(data, id)).toEqual(step.notes.map((note) => note.value))
      expect(stepEquations(data, id)).toEqual(step.equations.map((equation) => equation.value))
    }
    expect(NOTES_TEXT.whichever).toContain('may or may not hold')
  })

  it('names the way to run a part again for each part, and says where the notes will be', () => {
    expect(PAGE_TEXT.runAgain).toEqual({ known: 'Run this part again', unknown: 'Run this part again, with a new unknown' })
    expect(PAGE_TEXT.runAgainHelp.unknown).toContain('with a new unknown')
    expect(PAGE_TEXT.notesLater).toBe('The notes on this step, and its equations, come once the step is done.')
  })

  it('says what each mode does', () => {
    expect(MODE_TEXT.guided).toMatch(/^Guided: /)
    expect(MODE_TEXT.challenge).toMatch(/^Challenge: no warning and no hints\./)
  })
})

describe('every sentence of the page', () => {
  /** Every fixed string and every sentence a function gives for the cases above, as one list. */
  function sentences(): string[] {
    const fixed = [LAB_TEXT, PART_AIM, STEP_TASK, TUBE_NAME, ACTION_LABEL, POUR_LABEL, LOOK_PART, FIELD_LABEL, HINT, MODE_TEXT, PROGRESS_TEXT, STEP_STATUS_TEXT, NOTES_TEXT, NAMING_TEXT, RECORD_TEXT, SAMPLE_HAZARDS_HEADING].flatMap((group) => Object.values(group))
    const nested = [...Object.values(WARNING_TEXT).flatMap((w) => [w.title, w.body]), ...Object.values(WARNING_BUTTONS).flatMap((b) => [b.back, b.on]), ...Object.values(PAGE_TEXT).flatMap((v) => (typeof v === 'string' ? [v] : typeof v === 'function' ? [] : Object.values(v))), ...Object.values(CHART_TEXT).flatMap((v) => (typeof v === 'string' ? [v] : []))]
    const made = [
      ...PART_IDS.flatMap((part) => [...benchLines(data, part), partTitle(part)]),
      ...STEP_IDS.flatMap((id: StepId) => [stepTitle(data, id), addLabel(data, id)]),
      ...tubes.flatMap((shows) => [tubeText(shows), lookText(shows, 'liquid'), lookText(shows, 'bottom')]),
      ...(['acid', 'basic', 'neutral'] as const).map(litmusText),
      LOOK_FIRST,
      SOURCES_TEXT,
    ]
    return [...fixed, ...nested, ...made].filter((v): v is string => typeof v === 'string')
  }

  it('holds no institution text', () => {
    for (const text of sentences()) expect(findInstitutionText(text, []), text).toBeNull()
  })

  it('is short: nothing the page says in one breath runs over 60 words', () => {
    for (const text of sentences()) expect(text.split(/\s+/).length, text).toBeLessThanOrEqual(60)
  })

  // No quotation: the fingerprint of the pages is not kept in the repository, and the case is skipped where it is absent (see src/chem-data/cations/quotation.test.ts).
  type Lib = { unpackHashes(base64: string): Set<number>; quotedRuns(text: string, fingerprint: Set<number>): string[] }
  const [lib] = Object.values(import.meta.glob<Lib>('../../../../scripts/titration-lib.mjs', { eager: true }))
  const [fingerprint] = Object.values(import.meta.glob<{ hashes: string }>('../../../../docs/research/cations/sources/quotation-fingerprint.json', { eager: true, import: 'default' }))
  it.skipIf(fingerprint === undefined)('repeats no run of six words of a page the lab rests on (skipped where the fingerprint is absent)', () => {
    const pages = lib!.unpackHashes(fingerprint!.hashes)
    const BLOCKED_ALL = ['run-over', 'steps-done', 'steps-not-done', 'not-this-part', 'not-this-step', 'step-checked', 'already-added', 'tube-full', 'add-first', 'already-heated', 'nothing-to-spin', 'look-first', 'observe-first', 'check-first', 'does-not-match', 'wrong-place', 'chart-not-right', 'places-empty'] as const
    const more = [...BLOCKED_ALL.map((blocked) => blockedText(data, 'unknown', blocked, 'separate')), ...(['poured-uncentrifuged', 'water-not-heated', 'judged-before-acid', 'observation-wrong'] as const).map((kind) => reasonText({ kind, step: 'separate' })), holdsText(data, ['lead'])]
    for (const text of [...sentences(), ...more]) expect(lib!.quotedRuns(text, pages), text).toEqual([])
  })
})
