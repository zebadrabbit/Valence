import { describe, expect, it } from 'vitest'
import { cabbageData as data, PART_IDS, SCALE_QUESTION_IDS, THING_IDS } from '@/chem-data/cabbage/data'
import { findInstitutionText } from '@/chem-data/denylist'
import { can, createLab, meterView, modelFrom, rackView, sampleView, unitView, CANNOT_SAY, CLASSES, type Blocked, type CabbageState, type Reason, type TubeShows } from '@/engine/cabbage'
import { run, wholeLab, wholeSample, wholeScale, wholeThings } from '@/engine/cabbage/testkit'
import {
  benchLines,
  BLOCKED_TEXT,
  bufferLabel,
  byEyeLine,
  CLASS_LABEL,
  colourLabel,
  countShort,
  countText,
  estimateLabel,
  GUIDED_TEXT,
  HAZARD_TEXT,
  hazardsText,
  itemLabel,
  itemName,
  KIND_LABEL,
  LAB_TEXT,
  MARK_TEXT,
  markText,
  meterText,
  MODE_TEXT,
  NOTES_TEXT,
  ON_BENCH,
  PAGE_TEXT,
  PART_AIM,
  PART_STATUS,
  partName,
  partNotes,
  partNumber,
  partOutcomeText,
  phText,
  powerLabel,
  probeWarning,
  RACK_TEXT,
  rackTubeText,
  readingText,
  REASON_TEXT,
  RECORD_TEXT,
  SAMPLE_HINT,
  SAMPLE_TEXT,
  sampleOutcomeText,
  SCALE_HINT,
  scaleChoiceLabel,
  scaleQuestionText,
  SOURCES_TEXT,
  theThing,
  thingName,
  thingNote,
  tubeText,
  UNIT_TEXT,
  unitQuestionText,
} from './messages'

const m = modelFrom(data)
const SEEDS = Array.from({ length: 100 }, (_, i) => i + 1)
const lab = (mode: 'guided' | 'challenge' = 'challenge', seed = 1) => createLab(mode, seed)
const COLOURS = data.indicator.colours.map((c) => c.colour)
/** Every tube the lab can show: the rack before and after the indicator, and every thing before and after, over the seeds. */
const tubes = (): TubeShows[] => {
  const all: TubeShows[] = [...rackView(m, lab()).tubes.map((t) => t.shows), ...rackView(m, wholeScale(m, lab())).tubes.map((t) => t.shows)]
  for (const seed of SEEDS) {
    const state = wholeScale(m, lab('challenge', seed))
    for (const thing of THING_IDS) all.push(sampleView(m, state, thing).shows, sampleView(m, run(m, state, [{ type: 'addIndicator', thing }]), thing).shows)
  }
  return all
}

describe('the description in words of every tube (spec 21.6, last item)', () => {
  it('says each tube of the rack in a sentence: thirteen with no colour, and then the twelve colours by name', () => {
    expect(new Set(rackView(m, lab()).tubes.map((t) => tubeText(t.shows)))).toEqual(new Set(['A clear liquid with no colour.']))
    expect(rackView(m, wholeScale(m, lab())).tubes.map((t) => rackTubeText(t.ph, t.shows))).toEqual([
      'pH 1: a clear red liquid.',
      'pH 2: a clear dark pink liquid.',
      'pH 3: a clear rose liquid.',
      'pH 4: a clear lavender liquid.',
      'pH 5: a clear purple liquid.',
      'pH 6: a clear blue-violet liquid.',
      'pH 7: a clear dark blue liquid.',
      'pH 8: a clear blue liquid.',
      'pH 9: a clear teal liquid.',
      'pH 10: a clear emerald liquid.',
      'pH 11: a clear greenish-yellow liquid.',
      'pH 12: a clear greenish-yellow liquid.',
      'pH 13: a clear yellow liquid.',
    ])
  })

  it('says each household thing as it is seen before the indicator goes in, and nothing of what it is', () => {
    const state = wholeScale(m, lab())
    expect(Object.fromEntries(THING_IDS.map((id) => [id, tubeText(sampleView(m, state, id).shows)]))).toEqual({
      vinegar: 'A clear liquid with no colour.',
      'lemon-juice': 'A cloudy pale yellow liquid.',
      'apple-juice': 'A clear pale yellow liquid.',
      ammonia: 'A clear liquid with no colour.',
      shampoo: 'A clear liquid with no colour.',
      conditioner: 'A cloudy white liquid.',
      'laundry-detergent': 'A clear liquid with no colour.',
      'lab-detergent': 'A clear liquid with no colour.',
      mouthwash: 'A clear liquid with no colour.',
      antacid: 'A cloudy white liquid over a white solid at the bottom.',
      aspirin: 'A cloudy white liquid over a white solid at the bottom.',
      bleach: 'A clear liquid with no colour.',
      'drain-cleaner': 'A clear liquid with no colour.',
      'epsom-salt': 'A clear liquid with no colour.',
    })
  })

  it('says each thing with the indicator in, for seed 1: its colour by name, as cloudy as before, over the same solid; bleach has no colour', () => {
    let state = wholeScale(m, lab())
    for (const thing of THING_IDS) state = run(m, state, [{ type: 'addIndicator', thing }])
    expect(Object.fromEntries(THING_IDS.map((id) => [id, tubeText(sampleView(m, state, id).shows)]))).toEqual({
      vinegar: 'A clear rose liquid.',
      'lemon-juice': 'A cloudy dark pink liquid.',
      'apple-juice': 'A clear lavender liquid.',
      ammonia: 'A clear greenish-yellow liquid.',
      shampoo: 'A clear dark blue liquid.',
      conditioner: 'A cloudy rose liquid.',
      'laundry-detergent': 'A clear emerald liquid.',
      'lab-detergent': 'A clear teal liquid.',
      mouthwash: 'A clear dark blue liquid.',
      antacid: 'A cloudy teal liquid over a white solid at the bottom.',
      aspirin: 'A cloudy rose liquid over a white solid at the bottom.',
      bleach: 'A clear liquid with no colour.',
      'drain-cleaner': 'A clear yellow liquid.',
      'epsom-salt': 'A clear blue-violet liquid.',
    })
  })

  it('names the colour of the liquid in every tube the lab can show, over seeds 1 to 100, in one of four forms of sentence', () => {
    const all = tubes()
    expect(all).toHaveLength(26 + 100 * 28)
    const sentences = new Set(all.map(tubeText))
    for (const shows of all) {
      const text = tubeText(shows)
      const { colour } = shows.liquid!
      expect(text, text).toContain(colour === 'colourless' ? 'with no colour' : ` ${colour} liquid`)
      expect(text).toMatch(/^A (clear|cloudy) (liquid with no colour|[a-z -]+ liquid)( over a white solid at the bottom)?\.$/)
      expect(text).not.toMatch(/vinegar|juice|ammonia|bleach|aspirin|acid|base|buffer|pH/i)
    }
    // Two tubes that are told apart by their colour are told apart by their words.
    for (const a of COLOURS) for (const b of COLOURS) if (a !== b) expect(tubeText({ liquid: { colour: a, cloudy: false, microlitres: 1 }, solid: null })).not.toBe(tubeText({ liquid: { colour: b, cloudy: false, microlitres: 1 }, solid: null }))
    expect(sentences.size).toBeGreaterThan(20)
  })

  it('words the tubes this lab never shows, which the shared shape of a tube allows: an empty tube, a solid alone, a solid spread through', () => {
    expect(tubeText(null)).toBe('An empty tube.')
    expect(tubeText({ liquid: null, solid: { colour: 'white', settled: true } })).toBe('A white solid, and no liquid.')
    expect(tubeText({ liquid: { colour: 'emerald', cloudy: true, microlitres: 1 }, solid: { colour: 'white', settled: false } })).toBe('A cloudy emerald liquid with a white solid spread through it.')
  })

  it('has a label for every colour, for a list of choices', () => {
    expect([...COLOURS, 'colourless'].map(colourLabel)).toEqual(['Red', 'Dark pink', 'Rose', 'Lavender', 'Purple', 'Blue-violet', 'Dark blue', 'Blue', 'Teal', 'Emerald', 'Greenish-yellow', 'Yellow', 'No colour'])
    expect(bufferLabel(7)).toBe('pH 7')
  })
})

describe('the lab, its parts and its bench', () => {
  it('names the lab and its three parts, and says what each asks without a word of what will be seen', () => {
    expect(LAB_TEXT.title).toBe('Red cabbage pH')
    expect(PART_IDS.map((id) => `${partNumber(id)}: ${partName(data, id)}`)).toEqual(['Part 1: The scale', 'Part 2: The household things', 'Part 3: What a unit means'])
    for (const id of PART_IDS) for (const colour of COLOURS) expect(PART_AIM[id]).not.toContain(colour)
  })

  it('says what is on the bench, and how each thing is on it', () => {
    expect(benchLines(data)).toEqual(['Thirteen buffer solutions, from pH 1 to pH 13, in a rack', 'Red cabbage indicator solution', 'A pH meter with its probe, and a wash bottle of distilled water', 'Fourteen household things, each in a tube of its own'])
    expect(THING_IDS.map((id) => `${thingName(data, id)}: ${ON_BENCH[data.things.find((t) => t.id === id)!.onBench]}`).slice(0, 4)).toEqual(['Vinegar: As it is sold.', 'Lemon juice: As it is sold.', 'Apple juice: As it is sold.', 'Household ammonia: About one part in twenty in water.'])
    expect(ON_BENCH.tablets).toContain('Not all of it dissolves')
    expect(theThing(data, 'epsom-salt')).toBe('the epsom salt')
    expect(Object.keys(KIND_LABEL)).toEqual(['food', 'toiletry', 'medicine', 'cleaner'])
  })

  it('gives each thing the hazards of its bottle where it is a laboratory chemical, and the shared note where it is not', () => {
    expect(THING_IDS.filter((id) => !hazardsText(data, data.things.find((t) => t.id === id)!).shared)).toEqual(['ammonia', 'lab-detergent', 'bleach', 'drain-cleaner'])
    expect(hazardsText(data, data.things[0]!).text).toBe(data.sharedNote.value)
    expect(data.scale.buffers.filter((b) => !hazardsText(data, b).shared).map((b) => b.ph)).toEqual([1, 13])
    expect(hazardsText(data, data.scale.buffers[0]!).text).toContain('hydrochloric acid')
  })
})

describe('the scale', () => {
  const rack = rackView(m, wholeScale(m, lab()))

  it('asks its three questions, with the colours or the pairs of tubes to choose from', () => {
    expect(rack.questions.map(scaleQuestionText)).toEqual(['What colour is the indicator in the pH 1 buffer?', 'What colour is the indicator in the pH 7 buffer, which is neutral?', 'Two tubes next to each other show the same colour. Which two?'])
    expect(rack.questions[0]!.choices.map((choice) => scaleChoiceLabel(rack.questions[0]!, choice))).toEqual(COLOURS.map(colourLabel))
    expect(rack.questions[2]!.choices.map((choice) => scaleChoiceLabel(rack.questions[2]!, choice)).slice(0, 2)).toEqual(['pH 1 and pH 2', 'pH 2 and pH 3'])
    expect(rack.questions[2]!.choices).toHaveLength(12)
  })

  it('has a hint for Guided at every question, which says where to look and names no colour and no pair', () => {
    for (const id of SCALE_QUESTION_IDS) {
      for (const colour of COLOURS) expect(SCALE_HINT[id], id).not.toContain(colour)
      expect(SCALE_HINT[id], id).not.toMatch(/1[123]/)
    }
  })

  it('says how the three answers stand, and marks each once it is judged', () => {
    expect((['open', 'to-check', 'counts', 'does-not-count'] as const).map((state) => partOutcomeText({ state }))).toEqual(['Not all answered yet.', 'All answered. Check them.', 'Every answer is right: this part is done.', 'Not every answer is right. The marks show which; answer them again.'])
    expect([true, false, null].map(markText)).toEqual([MARK_TEXT.right, MARK_TEXT.wrong, MARK_TEXT.notJudged])
  })
})

describe('a sample', () => {
  it('words an estimate as it was given, and a reading to a tenth', () => {
    expect([3, 12, CANNOT_SAY].map((estimate) => estimateLabel(estimate as never))).toEqual(['pH 3', 'pH 12', 'The indicator cannot say'])
    expect([30, 122, 95].map(phText)).toEqual(['pH 3.0', 'pH 12.2', 'pH 9.5'])
    expect(CLASSES.map((is) => CLASS_LABEL[is])).toEqual(['Acid', 'Neutral', 'Basic'])
  })

  it("has Guided's hints, which say how to go about it and give no colour, no tube and no pH of a thing", () => {
    for (const hint of Object.values(SAMPLE_HINT)) {
      for (const colour of COLOURS) expect(hint).not.toContain(colour)
      expect(hint.replace('pH 7', '')).not.toMatch(/\d/)
    }
    expect(SAMPLE_HINT.estimate).toContain('nothing to match')
  })

  it("says where the probe stands, and words Guided's warning with the thing the probe was last in and no number", () => {
    let state = wholeSample(m, wholeScale(m, lab('guided')), 'vinegar')
    expect(meterText(data, meterView(state))).toBe('The probe was last in the vinegar and has not been rinsed since.')
    expect(meterText(data, meterView(run(m, state, [{ type: 'rinse' }])))).toBe('The probe is rinsed.')
    const thing = 'drain-cleaner'
    state = run(m, state, [{ type: 'addIndicator', thing }, { type: 'look', thing }, { type: 'estimate', thing, is: 13 }, { type: 'classify', thing, is: 'basic' }, { type: 'read', thing }])
    expect(sampleView(m, state, thing).warning).toBe(true)
    const warning = probeWarning(data, meterView(state).lastIn!)
    expect(warning).toBe('The probe has not been rinsed since it was in the vinegar. Read now, and the meter will be pulled toward that sample and the reading will not count. Rinse the probe first, or read anyway.')
    expect(warning).not.toMatch(/\d/)
  })

  it('says what the meter reads, and of an unrinsed reading that it does not count and why, once that is judged', () => {
    expect(readingText({ tenths: 30, unrinsed: null })).toBe('The meter reads pH 3.0.')
    expect(readingText({ tenths: 30, unrinsed: false })).toBe('The meter reads pH 3.0.')
    expect(readingText({ tenths: 104, unrinsed: true })).toBe('The meter reads pH 10.4. This reading does not count: the probe was not rinsed, so the last sample pulled it. Rinse the probe and read again.')
  })

  it('names each cause a sample does not count for, and never what was right', () => {
    const reasons: Reason[] = ['estimate-off', 'class-wrong', 'probe-unrinsed']
    expect(Object.keys(REASON_TEXT).sort()).toEqual([...reasons].sort())
    for (const reason of reasons) {
      expect(REASON_TEXT[reason]).not.toMatch(/\d/)
      for (const colour of COLOURS) expect(REASON_TEXT[reason]).not.toContain(colour)
    }
    expect(REASON_TEXT['probe-unrinsed']).toContain('not rinsed')
  })

  it('says how a sample stands at each point of a run that goes wrong and is done again', () => {
    let state = wholeScale(m, lab())
    expect(sampleOutcomeText(sampleView(m, state, 'vinegar'))).toBe('Not begun.')
    state = run(m, state, [{ type: 'addIndicator', thing: 'vinegar' }])
    expect(sampleOutcomeText(sampleView(m, state, 'vinegar'))).toBe('Under way.')
    state = wholeSample(m, run(m, state, [{ type: 'again', thing: 'vinegar' }]), 'vinegar', { estimate: 9, is: 'basic', check: false })
    expect(sampleOutcomeText(sampleView(m, state, 'vinegar'))).toBe('Everything is recorded. Check this sample.')
    state = run(m, state, [{ type: 'checkSample', thing: 'vinegar' }])
    expect(sampleOutcomeText(sampleView(m, state, 'vinegar'))).toBe('This sample does not count. The estimate was not within one unit of the meter. Acid, neutral or basic did not agree with the meter. Try it again in a fresh tube.')
    state = wholeSample(m, run(m, state, [{ type: 'again', thing: 'vinegar' }]), 'vinegar')
    expect(sampleOutcomeText(sampleView(m, state, 'vinegar'))).toBe('This sample counts.')
    expect(RECORD_TEXT.tries(0)).toBe('First tube')
    expect(RECORD_TEXT.tries(sampleView(m, state, 'vinegar').tries)).toBe('Tube 3')
  })

  it('says how far the count has come, and when the part is done', () => {
    expect(countText({ counted: 3, needed: 8, things: 14 })).toBe('3 of 8 count. There are fourteen things to choose from.')
    expect(countText({ counted: 8, needed: 8, things: 14 })).toBe('Eight things count, and eight were needed: this part is done. The other six are there to try.')
    expect(countText({ counted: 13, needed: 8, things: 14 })).toContain('The other one is there to try.')
    expect(countText({ counted: 14, needed: 8, things: 14 })).toBe('Fourteen things count, and eight were needed: this part is done. Every thing on the bench counts.')
  })
})

describe('what a unit means', () => {
  it('sets two things side by side with the reading of each, and asks which holds more hydrogen ion and how many times more', () => {
    const state = wholeThings(m, wholeScale(m, lab()))
    expect(unitView(m, state).questions.map((question) => unitQuestionText(data, question))).toEqual(['The vinegar read pH 3.0. The lemon juice read pH 2.0.', 'The hair conditioner read pH 3.5. The laboratory detergent read pH 9.5.'])
    expect(unitQuestionText(data, { items: [{ kind: 'buffer', ph: 4, tenths: 40 }, { kind: 'buffer', ph: 7, tenths: 70 }] })).toBe('The pH 4 buffer is at pH 4.0. The pH 7 buffer is at pH 7.0.')
    expect(itemName(data, { kind: 'buffer', ph: 9, tenths: 90 })).toBe('the pH 9 buffer')
    expect(UNIT_TEXT.more).toBe('Which holds more hydrogen ion?')
  })

  it('words each power of ten as a number of times', () => {
    expect(unitView(m, lab()).powers.map(powerLabel)).toEqual(['10 times', '100 times', '1,000 times', '10,000 times', '100,000 times', '1,000,000 times', '10,000,000 times', '100,000,000 times', '1,000,000,000 times', '10,000,000,000 times', '100,000,000,000 times', '1,000,000,000,000 times'])
  })

  it('has a hint that says how to work an answer and gives none', () => {
    expect(UNIT_TEXT.hintText).toContain('Each unit is ten times')
    expect(UNIT_TEXT.hintText).not.toMatch(/\d/)
  })
})

describe('refusals', () => {
  const ALL: Blocked[] = ['unknown-thing', 'not-a-choice', 'rack-not-made', 'rack-made', 'not-looked', 'already-looked', 'indicator-in', 'no-indicator', 'no-estimate', 'no-class', 'class-not-asked', 'answers-fixed', 'already-rinsed', 'probe-still-in', 'not-read', 'checked', 'counts-already', 'nothing-to-repeat', 'not-all-answered', 'not-enough-count', 'not-right', 'estimate-off', 'class-wrong']

  it('have a sentence for every reason an action can be refused, none of which names a colour or gives a pH but 7', () => {
    expect(Object.keys(BLOCKED_TEXT).sort()).toEqual([...ALL].sort())
    for (const blocked of ALL) {
      const text = BLOCKED_TEXT[blocked]
      expect(text.length, blocked).toBeGreaterThan(15)
      for (const colour of COLOURS) expect(text, blocked).not.toContain(colour)
      expect(text.replace('pH 7', ''), blocked).not.toMatch(/\d/)
    }
  })

  it("are the sentences the engine's refusals get, at the points of a lab where each first comes up", () => {
    const got = new Set<Blocked>()
    const note = (state: CabbageState, ...actions: Parameters<typeof can>[2][]) => {
      for (const action of actions) {
        const blocked = can(m, state, action)
        if (blocked) got.add(blocked)
      }
    }
    const fresh = lab('guided')
    note(fresh, { type: 'lookRack' }, { type: 'addIndicator', thing: 'vinegar' }, { type: 'rinse' }, { type: 'checkUnit' }, { type: 'answerScale', question: 'neutral', is: 'blue' }, { type: 'answerScale', question: 'neutral', is: 'orange' }, { type: 'againScale' })
    let state = run(m, fresh, [{ type: 'fillRack' }, { type: 'lookRack' }])
    note(state, { type: 'fillRack' }, { type: 'lookRack' }, { type: 'answerScale', question: 'neutral', is: 'blue' }, { type: 'checkScale' }, { type: 'look', thing: 'vinegar' }, { type: 'addIndicator', thing: 'soap' as never })
    state = run(m, wholeScale(m, lab('guided')), [{ type: 'addIndicator', thing: 'shampoo' }])
    note(state, { type: 'addIndicator', thing: 'shampoo' }, { type: 'estimate', thing: 'shampoo', is: 7 }, { type: 'checkScale' }, { type: 'againScale' })
    state = run(m, state, [{ type: 'look', thing: 'shampoo' }])
    note(state, { type: 'classify', thing: 'shampoo', is: 'acid' }, { type: 'read', thing: 'shampoo' }, { type: 'estimate', thing: 'shampoo', is: 2 }, { type: 'checkSample', thing: 'shampoo' }, { type: 'again', thing: 'vinegar' })
    state = run(m, state, [{ type: 'estimate', thing: 'shampoo', is: 7 }])
    note(state, { type: 'read', thing: 'shampoo' }, { type: 'classify', thing: 'shampoo', is: 'acid' })
    note(run(m, run(m, state, [{ type: 'setMode', mode: 'challenge' }]), [{ type: 'estimate', thing: 'shampoo', is: CANNOT_SAY }]), { type: 'classify', thing: 'shampoo', is: 'acid' })
    state = run(m, state, [{ type: 'classify', thing: 'shampoo', is: 'neutral' }, { type: 'read', thing: 'shampoo' }])
    note(state, { type: 'estimate', thing: 'shampoo', is: 6 }, { type: 'read', thing: 'shampoo' }, { type: 'again', thing: 'shampoo' }, { type: 'checkSample', thing: 'shampoo' })
    const challenge = wholeSample(m, wholeScale(m, lab()), 'shampoo', { check: false })
    note(challenge, { type: 'read', thing: 'shampoo' })
    const done = wholeLab(m, lab('guided'))
    note(done, { type: 'answerUnit', question: 0, answer: { more: 0, power: 1 } }, { type: 'againUnit' })
    note(wholeThings(m, wholeScale(m, lab('guided'))), { type: 'answerUnit', question: 0, answer: { more: 0, power: 1 } }, { type: 'againUnit' }, { type: 'checkUnit' })
    expect([...got].sort()).toEqual([...ALL].sort())
    for (const blocked of got) expect(BLOCKED_TEXT[blocked]).toBeDefined()
  })
})

describe('the words of the page that are made from what it is handed', () => {
  it('says how far a part has come, how many count, an estimate as one line, and one of two things as a choice', () => {
    expect(Object.values(PART_STATUS)).toEqual(['Not open yet', 'Not begun', 'Under way', 'Done'])
    expect(countShort({ counted: 3, needed: 8 })).toBe('3 of 8 count')
    expect(byEyeLine(3, 'acid')).toBe('pH 3, acid')
    expect(byEyeLine(7, 'neutral')).toBe('pH 7, neutral')
    expect(byEyeLine(CANNOT_SAY, null)).toBe(SAMPLE_TEXT.cannotSay)
    expect(itemLabel(data, { kind: 'thing', id: 'vinegar', tenths: 29 })).toBe('The vinegar')
    expect(itemLabel(data, { kind: 'buffer', ph: 4, tenths: 40 })).toBe('The pH 4 buffer')
    expect([PAGE_TEXT.previous('Vinegar'), PAGE_TEXT.next('Bleach'), PAGE_TEXT.tubePicture('Vinegar')]).toEqual(['Previous: Vinegar', 'Next: Bleach', 'Vinegar: the tube, drawn'])
  })

  it('says how a picture is looked at and a tube chosen without a word of what is seen, and heads the shared note for what has no tile', () => {
    for (const text of [RACK_TEXT.explore, SAMPLE_TEXT.explore, SAMPLE_TEXT.pick, HAZARD_TEXT.others]) for (const colour of m.colours) expect(text.toLowerCase(), text).not.toContain(colour)
    expect(RACK_TEXT.explore).toMatch(/arrow keys/)
    expect(HAZARD_TEXT.others).toBe('Anything else on this bench')
  })
})

describe('the notes and the modes', () => {
  it("hands over a part's notes and a thing's note as the record has them", () => {
    expect(partNotes(data, 'unit')).toEqual(data.parts[2].notes.map((n) => n.value))
    expect(thingNote(data, 'bleach')).toBe(data.things.find((t) => t.id === 'bleach')!.note.value)
    expect(thingNote(data, 'bleach')).toContain('the indicator cannot say')
  })

  it('says what each mode does', () => {
    expect(MODE_TEXT.guided).toContain('warns before an unrinsed probe reads')
    expect(MODE_TEXT.challenge).toContain('says nothing until you ask for a check')
  })
})

describe('every sentence of the page', () => {
  /** Every fixed string and every sentence a function gives for the cases above, as one list. */
  function sentences(): string[] {
    const fixed = [LAB_TEXT, PART_AIM, PART_STATUS, RACK_TEXT, SCALE_HINT, ON_BENCH, KIND_LABEL, CLASS_LABEL, SAMPLE_TEXT, SAMPLE_HINT, GUIDED_TEXT, REASON_TEXT, UNIT_TEXT, MARK_TEXT, BLOCKED_TEXT, MODE_TEXT, HAZARD_TEXT, NOTES_TEXT, PAGE_TEXT]
    const state = wholeThings(m, wholeScale(m, lab()))
    const made = [
      ...benchLines(data),
      ...PART_IDS.flatMap((id) => [partNumber(id), partName(data, id)]),
      ...new Set(tubes().map(tubeText)),
      ...rackView(m, state).tubes.map((t) => rackTubeText(t.ph, t.shows)),
      ...rackView(m, state).questions.flatMap((q) => [scaleQuestionText(q), ...q.choices.map((choice) => scaleChoiceLabel(q, choice))]),
      ...THING_IDS.flatMap((id) => [thingName(data, id), theThing(data, id), probeWarning(data, id), meterText(data, { rinsed: false, lastIn: id }), sampleOutcomeText(sampleView(m, state, id))]),
      meterText(data, { rinsed: true, lastIn: null }),
      readingText({ tenths: 104, unrinsed: true }),
      ...(['open', 'to-check', 'counts', 'does-not-count'] as const).map((s) => partOutcomeText({ state: s })),
      countText({ counted: 3, needed: 8, things: 14 }),
      countText({ counted: 8, needed: 8, things: 14 }),
      ...unitView(m, state).questions.map((q) => unitQuestionText(data, q)),
      ...unitView(m, state).powers.map(powerLabel),
      ...Object.values(RECORD_TEXT).map((v) => (typeof v === 'string' ? v : v(1))),
      sampleOutcomeText({ outcome: { state: 'does-not-count' }, reasons: ['estimate-off', 'class-wrong', 'probe-unrinsed'], indicator: true }),
      SOURCES_TEXT,
      countShort({ counted: 3, needed: 8 }),
      byEyeLine(3, 'acid'),
      byEyeLine(CANNOT_SAY, null),
      ...unitView(m, state).questions.flatMap((q) => q.items.map((item) => itemLabel(data, item))),
    ]
    // A group's entry that is made from a name is given one.
    return [...fixed.flatMap((group) => Object.values(group).map((value: string | ((name: string) => string)) => (typeof value === 'string' ? value : value('Vinegar')))), ...made]
  }

  it('is there: over two hundred of them, none empty', () => {
    expect(sentences().length).toBeGreaterThan(200)
    for (const text of sentences()) expect(text.trim().length, text).toBeGreaterThan(0)
  })

  it('names no maker and no supplier, and holds no institution text', () => {
    for (const text of sentences()) {
      expect(text).not.toMatch(/alconox|drano|juuce|kms|kao|rivacol|orajel|flinn|fisher|livingstone|johnson|vernier|labquest/i)
      expect(findInstitutionText(text, []), text).toBeNull()
    }
  })

  it('is short and plain: no sentence of the page over 45 words', () => {
    for (const text of sentences()) expect(text.split(/\s+/).length, text).toBeLessThanOrEqual(45)
  })

  // No quotation: the fingerprint of the pages is not kept in the repository, and the case is skipped where it is absent (see src/chem-data/cabbage/quotation.test.ts).
  type Lib = { unpackHashes(base64: string): Set<number>; quotedRuns(text: string, fingerprint: Set<number>): string[] }
  const [lib] = Object.values(import.meta.glob<Lib>('../../../../scripts/titration-lib.mjs', { eager: true }))
  const [fingerprint] = Object.values(import.meta.glob<{ hashes: string }>('../../../../docs/research/cabbage/sources/quotation-fingerprint.json', { eager: true, import: 'default' }))
  it.skipIf(fingerprint === undefined)('repeats no run of six words of a page the lab rests on (skipped where the fingerprint is absent)', () => {
    const pages = lib!.unpackHashes(fingerprint!.hashes)
    for (const text of sentences()) expect(lib!.quotedRuns(text, pages), text).toEqual([])
  })
})
