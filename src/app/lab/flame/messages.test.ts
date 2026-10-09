import { describe, expect, it } from 'vitest'
import { findInstitutionText } from '@/chem-data/denylist'
import { flameData as data } from '@/chem-data/flame/data'
import { FLAME, HANDLING, QUESTIONS, choicesFor, createLab, looksOf, reduce, stationView, warnings, type Action, type Blocked, type FlameState } from '@/engine/flame'
import { run, stationScript } from '@/engine/flame/testkit'
import {
  BENCH_TEXT,
  BLOCKED_TEXT,
  CLOSING,
  CLOSING_PROGRESS_TEXT,
  HINTS,
  LOOK_FIRST,
  MODE_TEXT,
  PAGE_TEXT,
  PROGRESS_TEXT,
  QUESTION_LABEL,
  RECORD_TEXT,
  STATION_TEXT,
  WARNING_BUTTONS,
  WARNING_TEXT,
  appearanceText,
  brightnessText,
  choiceLabel,
  choiceList,
  closingFeedback,
  describeFlame,
  describeSpectrum,
  featureCallout,
  featureName,
  featureText,
  flameText,
  lookLabel,
  lookName,
  lookText,
  loopText,
  observationFeedback,
  observationLines,
  stationTitle,
  uncleanText,
  unseenName,
} from './messages'

const ids = data.salts.map((s) => s.id)
const [BA, CA, CU, K, NA, SR] = ids as [string, string, string, string, string, string]
/** A station as it stands once a clean loop, or the loop given, has been held in the flame and everything looked at. */
const held = (stationId: string, before: Action[] = [{ type: 'cleanLoop' }]): FlameState => {
  let state = run(data, createLab(data, 'challenge'), [...before, { type: 'dipLoop', stationId }, { type: 'holdInFlame', stationId }])
  state = run(data, state, looksOf(data, state.loop).map((at): Action => ({ type: 'look', stationId, at })))
  return state
}
const view = (stationId: string, before?: Action[]) => stationView(data, held(stationId, before), stationId)
const SCALE = 'The scale runs from 400 nm at the violet end to 780 nm in the deep red.'

describe('the stations and their bottles', () => {
  it('names each station by its place and its solution, and says what the solution looks like', () => {
    expect(ids.map((id) => `${stationTitle(data, id)}; ${appearanceText(data, id)}`)).toEqual([
      'Station 1: Barium chloride solution, 0.1 M; colourless solution',
      'Station 2: Calcium chloride solution, 0.1 M; colourless solution',
      'Station 3: Copper(II) chloride solution, 0.1 M; light blue-green solution',
      'Station 4: Potassium chloride solution, 0.1 M; colourless solution',
      'Station 5: Sodium chloride solution, 0.1 M; colourless solution',
      'Station 6: Strontium chloride solution, 0.1 M; colourless solution',
    ])
    expect(() => stationTitle(data, 'licl-0.1m')).toThrow(/no station/)
  })
})

describe('the loop in words', () => {
  it('says what it carries, and whether that is clean, without saying what the flame will show', () => {
    expect(loopText(data, [])).toBe('The loop is clean: it carries nothing.')
    expect(loopText(data, [HANDLING])).toBe('The loop has been handled and has not been cleaned.')
    expect(loopText(data, [CA], CA)).toBe('The loop carries calcium chloride solution and nothing else.')
    expect(loopText(data, [CA])).toBe('The loop carries calcium chloride solution and nothing else.')
    expect(loopText(data, [CA], SR)).toBe('The loop carries calcium chloride solution. It has not been cleaned since.')
    expect(loopText(data, [HANDLING, CU], CU)).toBe('The loop has been handled and has not been cleaned, and it carries copper(II) chloride solution. It is not clean.')
    expect(loopText(data, [CA, SR, BA], BA)).toBe('The loop carries calcium chloride solution, strontium chloride solution and barium chloride solution. It is not clean.')
    for (const loop of [[], [HANDLING], [CA], [HANDLING, NA], [CA, SR]]) expect(loopText(data, loop), loop.join()).not.toMatch(/yellow|sodium(?! chloride)|orange|red\b|colour/)
  })

  it('is the state of the lab as it starts: handled and not cleaned', () => {
    expect(loopText(data, createLab(data, 'guided').loop)).toBe('The loop has been handled and has not been cleaned.')
  })
})

describe('the flame in words, for every salt', () => {
  it('says the stored colour of each on a clean loop', () => {
    expect(Object.fromEntries(ids.map((id) => [id, describeFlame(view(id).flame!)]))).toEqual({
      'bacl2-0.1m': 'The flame is pale green.',
      'cacl2-0.1m': 'The flame is orange-red.',
      'cucl2-0.1m': 'The flame is blue-green.',
      'kcl-0.1m': 'The flame is lilac.',
      'nacl-0.1m': 'The flame is yellow.',
      'srcl2-0.1m': 'The flame is red.',
    })
    for (const id of ids) expect(lookText(view(id), FLAME), id).toBe(`The flame is ${data.salts.find((s) => s.id === id)!.flame.value.name}.`)
  })

  it("is sodium's yellow on a loop that carries sodium, a mixture named by each colour on one that carries two other salts, and no colour on a clean loop", () => {
    for (const id of ids) expect(describeFlame(view(id, []).flame!), id).toBe('The flame is yellow.')
    expect(describeFlame(view(SR, [{ type: 'cleanLoop' }, { type: 'dipLoop', stationId: CA }]).flame!)).toBe('The flame is a mixture of colours: orange-red and red.')
    expect(flameText({ colours: [], hidden: false })).toBe('The flame shows no colour.')
    expect(lookText(stationView(data, createLab(data, 'guided'), CA), FLAME)).toBe('The loop has not been held in the flame at this station yet.')
  })
})

describe('the spectroscope in words, for every salt', () => {
  it('describes the whole view of each on a clean loop: the scale, every line and band from the violet end, and which is the brightest', () => {
    expect(Object.fromEntries(ids.map((id) => [id, describeSpectrum(data, view(id).spectrum)]))).toEqual({
      'bacl2-0.1m': `${SCALE} On the strip, from the violet end: a broad band from about 480 to 550 nm, green; a sharp line near 554 nm, green. The brightest is the band from about 480 to 550 nm.`,
      'cacl2-0.1m': `${SCALE} On the strip, from the violet end: a sharp line near 423 nm, violet; a broad band from about 540 to 568 nm, green; a broad band from about 614 to 640 nm, orange-red. The brightest is the band from about 614 to 640 nm.`,
      'cucl2-0.1m': `${SCALE} On the strip, from the violet end: a broad band from about 400 to 470 nm, blue; a broad band near 550 nm, green. The brightest is the band from about 400 to 470 nm.`,
      'kcl-0.1m': `${SCALE} On the strip, from the violet end: a sharp line near 404 nm, violet; a sharp line near 766 nm, deep red. The brightest is the line near 766 nm.`,
      'nacl-0.1m': `${SCALE} One thing shows on the strip: a sharp line near 589 nm, yellow.`,
      'srcl2-0.1m': `${SCALE} On the strip, from the violet end: a sharp line near 461 nm, blue; a broad band near 606 nm, orange; a broad band near 671 to 686 nm, red. The brightest is the band near 671 to 686 nm.`,
    })
    expect(describeSpectrum(data, [])).toBe(`${SCALE} Nothing shows on the strip.`)
  })

  it('says of each line and band, when it is looked at, where it is, its colour, which it is and how bright it is beside the others', () => {
    const callouts = (id: string) => view(id).spectrum.map((seen) => featureCallout(seen, view(id).spectrum))
    expect(callouts(BA)).toEqual(['A broad band from about 480 to 550 nm, green. It is the brightest thing on the strip.', 'A sharp line near 554 nm, green. It is fainter than the brightest thing on the strip.'])
    expect(callouts(CA)).toEqual([
      'A sharp line near 423 nm, violet. It is fainter than the brightest thing on the strip.',
      'A broad band from about 540 to 568 nm, green. It is fainter than the brightest thing on the strip.',
      'A broad band from about 614 to 640 nm, orange-red. It is the brightest thing on the strip.',
    ])
    expect(callouts(CU)).toEqual([
      'A broad band from about 400 to 470 nm, blue. It is the brightest thing on the strip.',
      'A broad band near 550 nm, green. It is fainter than the brightest thing on the strip. Its limits are not given: it is drawn a little wider than where it is brightest.',
    ])
    expect(callouts(K)).toEqual([
      'A sharp line near 404 nm, violet. It is fainter than the brightest thing on the strip. It is two lines too close together to tell apart here.',
      'A sharp line near 766 nm, deep red. It is the brightest thing on the strip. It is two lines too close together to tell apart here.',
    ])
    expect(callouts(NA)).toEqual(['A sharp line near 589 nm, yellow. It is the only thing on the strip. It is two lines too close together to tell apart here.'])
    expect(callouts(SR)).toEqual([
      'A sharp line near 461 nm, blue. It is fainter than the brightest thing on the strip.',
      'A broad band near 606 nm, orange. It is fainter than the brightest thing on the strip. Its limits are not given: it is drawn a little wider than where it is brightest.',
      'A broad band near 671 to 686 nm, red. It is the brightest thing on the strip. Its limits are not given: it is drawn a little wider than where it is brightest.',
    ])
    for (const id of ids) for (const seen of view(id).spectrum) expect(lookText(view(id), seen.feature.id)).toBe(featureCallout(seen, view(id).spectrum))
    expect(lookText(view(CA), 'sroh-red')).toBe('There is nothing there.')
  })

  it('gives every stored feature a callout that holds its place, its colour and its kind, and never what gives it', () => {
    for (const salt of data.salts) {
      for (const feature of salt.features) {
        const words = featureText(feature)
        expect(words, feature.id).toContain(feature.colour)
        expect(words, feature.id).toContain(feature.kind === 'line' ? 'a sharp line near' : 'a broad band')
        expect(words, feature.id).toContain(String(Math.round(feature.kind === 'line' ? feature.wavelengthNm.value : feature.fromNm)))
        const said = featureCallout({ saltId: salt.id, feature, fromNm: 0, toNm: 0 }, view(salt.id).spectrum)
        expect(said, feature.id).not.toContain(feature.emitter.kind === 'atom' ? ` ${salt.metal.name}` : feature.emitter.formula)
        expect(said, feature.id).not.toMatch(/atom|molecule/)
      }
    }
  })

  it("names what is looked at, for the list beside the picture", () => {
    expect(looksOf(data, [CA]).map((at) => lookName(view(CA), at))).toEqual(['The flame', 'The line near 423 nm', 'The band from about 540 to 568 nm', 'The band from about 614 to 640 nm'])
    expect(featureName(data.salts[5]!.features[1]!)).toBe('the band near 606 nm')
    expect(lookName(view(CA), 'sr-460')).toBe('Nothing')
  })

  it("shows every salt's lines and bands on a loop that was not cleaned, and claims no one brightest among them", () => {
    const mixed = view(CA, [])
    expect(describeSpectrum(data, mixed.spectrum)).toBe(
      `${SCALE} On the strip, from the violet end: a sharp line near 423 nm, violet; a broad band from about 540 to 568 nm, green; a sharp line near 589 nm, yellow; a broad band from about 614 to 640 nm, orange-red. The brightest are the line near 589 nm and the band from about 614 to 640 nm: the loop carries more than one salt, and each has a brightest of its own.`,
    )
    expect(mixed.spectrum.map((seen) => brightnessText(seen, mixed.spectrum))).toEqual(['It is one of the fainter things on the strip.', 'It is one of the fainter things on the strip.', 'It is one of the brightest things on the strip.', 'It is one of the brightest things on the strip.'])
  })
})

describe('the questions', () => {
  it('have a label each, and choices shown in words', () => {
    expect(QUESTIONS.map((question) => QUESTION_LABEL[question])).toEqual(['Colour of the flame', 'Where on the scale the brightest thing is', 'What the brightest thing is'])
    expect(choiceList(data, 'colour').map((choice) => choice.label)).toEqual(['blue-green', 'lilac', 'orange-red', 'pale green', 'red', 'yellow'])
    expect(choiceList(data, 'range')).toEqual([
      { value: '400-475', label: '400 to 475 nm' },
      { value: '475-570', label: '475 to 570 nm' },
      { value: '570-600', label: '570 to 600 nm' },
      { value: '600-650', label: '600 to 650 nm' },
      { value: '650-700', label: '650 to 700 nm' },
      { value: '700-780', label: '700 to 780 nm' },
    ])
    expect(choiceList(data, 'kind')).toEqual([{ value: 'line', label: 'a sharp line' }, { value: 'band', label: 'a broad band' }])
    for (const question of QUESTIONS) for (const choice of choicesFor(data, question)) expect(choiceLabel(question, choice).length).toBeGreaterThan(2)
  })

  it('say under a question that is not open what to look at first', () => {
    expect(LOOK_FIRST).toEqual({ colour: 'Look at the flame first.', range: 'Look at every line and band on the strip first.', kind: 'Look at every line and band on the strip first.' })
  })

  it('write an observation, recorded or expected, as one line for each question', () => {
    expect(observationLines({ colour: 'red', range: '650-700', kind: 'band' })).toEqual(['Colour of the flame: red', 'Where on the scale the brightest thing is: 650 to 700 nm', 'What the brightest thing is: a broad band'])
    // What a correct observation holds, where the station's view hands it over: Guided from the start.
    expect(observationLines(stationView(data, createLab(data, 'guided'), NA).expected!)).toEqual(['Colour of the flame: yellow', 'Where on the scale the brightest thing is: 570 to 600 nm', 'What the brightest thing is: a sharp line'])
  })
})

describe('the hints', () => {
  it('say how to observe and nothing of what any flame shows', () => {
    expect(HINTS.length).toBe(5)
    const all = HINTS.join(' ')
    for (const salt of data.salts) {
      for (const word of [salt.flame.value.name, salt.metal.name === 'sodium' ? 'yellow' : salt.metal.name]) expect(all, word).not.toMatch(new RegExp(`\\b${word}\\b`))
    }
    expect(all).not.toMatch(/\d/)
    expect(all).toContain('Clean the loop before you dip it')
  })
})

describe('feedback on an observation', () => {
  const recorded = (stationId: string, observation: { colour: string; range: string; kind: 'line' | 'band' }, before?: Action[]) => stationView(data, reduce(data, held(stationId, before), { type: 'recordObservation', stationId, observation }), stationId)

  it('says which answers to look at again and never what they should be', () => {
    expect(observationFeedback(data, recorded(SR, { colour: 'red', range: '650-700', kind: 'band' }))).toBe('That is what this flame shows.')
    expect(observationFeedback(data, recorded(SR, { colour: 'orange-red', range: '650-700', kind: 'band' }))).toBe('Not yet. Look again at the colour of the flame.')
    expect(observationFeedback(data, recorded(SR, { colour: 'red', range: '600-650', kind: 'line' }))).toBe('Not yet. Look again at where on the scale the brightest thing is and whether the brightest thing is a line or a band.')
    const all = observationFeedback(data, recorded(SR, { colour: 'yellow', range: '600-650', kind: 'line' }))
    expect(all).toBe('Not yet. Look again at the colour of the flame, where on the scale the brightest thing is and whether the brightest thing is a line or a band.')
    for (const answer of ['red', '650', '700', 'broad']) expect(all).not.toContain(answer)
    expect(observationFeedback(data, stationView(data, createLab(data, 'guided'), SR))).toBe('')
  })

  it('says of an observation made with a loop that was not clean that it does not count, and why, whatever it holds', () => {
    const right = { colour: 'orange-red', range: '600-650', kind: 'band' } as const
    const handled = recorded(CA, right, [])
    expect(observationFeedback(data, handled)).toBe(
      'This observation does not count, whatever it holds: the loop was not clean. When it went into the flame it had been handled and never cleaned, so it carried a trace of sodium. Clean the loop, dip it again, hold it in the flame and observe this station again.',
    )
    const carried = recorded(CA, right, [{ type: 'cleanLoop' }, { type: 'dipLoop', stationId: SR }])
    expect(observationFeedback(data, carried)).toBe(
      'This observation does not count, whatever it holds: the loop was not clean. When it went into the flame it still carried strontium chloride solution from an earlier dip. Clean the loop, dip it again, hold it in the flame and observe this station again.',
    )
    expect(uncleanText(data, { handled: true, carried: [BA, K] })).toBe(
      'This observation does not count, whatever it holds: the loop was not clean. When it went into the flame it had been handled and never cleaned, so it carried a trace of sodium, and it still carried barium chloride solution and potassium chloride solution from earlier dips. Clean the loop, dip it again, hold it in the flame and observe this station again.',
    )
    // The same words whether the answers were right or wrong: nothing of them is judged.
    expect(observationFeedback(data, recorded(CA, { colour: 'yellow', range: '570-600', kind: 'line' }, []))).toBe(observationFeedback(data, handled))
  })
})

describe("Guided's warning", () => {
  it('is raised before a loop that is not clean is dipped, says what will happen, and offers a way back and a way on', () => {
    const guided = createLab(data, 'guided')
    const [warning] = warnings(data, guided, { type: 'dipLoop', stationId: CA })
    expect(WARNING_TEXT[warning!]).toEqual({
      title: 'The loop is not clean',
      body: 'It still carries what it last touched: another salt, or sodium from being handled. That will go into the flame with this solution, the flame and the strip will show both, and an observation made that way does not count. Clean the loop first, then dip it.',
    })
    expect(WARNING_BUTTONS).toEqual({ back: 'Go back and clean it', on: 'Dip it anyway' })
  })
})

describe('what is said when an action cannot be done', () => {
  it('has a sentence for every reason', () => {
    const reasons: Blocked[] = ['lab-completed', 'unknown-station', 'not-dipped', 'not-held', 'nothing-there', 'not-looked', 'invalid-entry', 'stations-not-done']
    expect(Object.keys(BLOCKED_TEXT).sort()).toEqual([...reasons].sort())
    for (const reason of reasons) expect(BLOCKED_TEXT[reason].length, reason).toBeGreaterThan(20)
  })
})

describe('the closing question', () => {
  it('asks what gives each flame its colour, with a label and feedback for each choice of the record', () => {
    expect(CLOSING.question).toBe('All six bottles hold a chloride, dissolved in water, and the same loop went into the same flame at every station. So what gives each flame its colour?')
    expect(Object.keys(CLOSING.choices)).toEqual(data.closing.choices)
    expect(Object.keys(CLOSING.feedback)).toEqual(data.closing.choices)
    // No label is set apart from the others by its length or by an explanation.
    for (const label of Object.values(CLOSING.choices)) expect(label).toMatch(/^The [a-z ]{10,24}$/)
  })

  it('explains: the right answer says why and ties it to the cards of the periodic table; a wrong one says why it cannot be so and not what is', () => {
    const { answer } = data.closing
    expect(closingFeedback(answer.value)).toMatch(/^Yes\. /)
    expect(closingFeedback(answer.value)).toContain('Only the metal changed, and the colour changed with it.')
    expect(closingFeedback(answer.value)).toContain('For calcium, strontium, barium and copper most of it is the light of a molecule that the metal forms in the flame')
    expect(closingFeedback(answer.value)).toContain("the element's card of the periodic table")
    for (const choice of data.closing.choices.filter((one) => one !== answer.value)) {
      expect(closingFeedback(choice), choice).toMatch(/^Not this\. /)
      expect(closingFeedback(choice), choice).not.toMatch(/\bmetal\b/)
      expect(closingFeedback(choice).length, choice).toBeGreaterThan(80)
    }
    expect(closingFeedback(null)).toBe('')
    expect(closingFeedback('flame')).toBe('')
  })
})

describe("the page's own words", () => {
  it('name a line or a band that has not been looked at by its place in the count and nothing else, and after that by what the look said', () => {
    expect(unseenName(2, 3)).toBe('Line or band 2 of 3, counting from the violet end')
    // Neither which of the two it is, nor where it is, nor its colour: the same words for every one of them, whatever it is. The violet is the scale's end.
    for (const id of ids) {
      const { spectrum } = view(id)
      spectrum.forEach((_, at) => {
        const name = unseenName(at + 1, spectrum.length)
        expect(name).toMatch(/^Line or band \d of \d, counting from the violet end$/)
        expect(name).not.toMatch(/nm|sharp|broad|bright/)
      })
    }
    expect(lookLabel(unseenName(1, 2), false)).toBe('Look at line or band 1 of 2, counting from the violet end')
    expect(lookLabel(lookName(view(NA), 'na-589'), true)).toBe('Look at the line near 589 nm, looked at')
    expect(lookLabel(lookName(view(NA), FLAME), false)).toBe('Look at the flame')
    expect(lookLabel(lookName(view(NA), FLAME), true)).toBe('Look at the flame, looked at')
  })

  it('say how far a station and the closing question have come, a different word for each', () => {
    expect(PROGRESS_TEXT).toEqual({
      'not-started': 'Not started',
      started: 'Started',
      'not-counted': 'Recorded with a loop that was not clean',
      'not-correct': 'Recorded, not correct yet',
      done: 'Done',
    })
    expect(CLOSING_PROGRESS_TEXT).toEqual({ waits: 'Opens when the six stations are done', open: 'Not answered yet', 'not-correct': 'Answered, not correct yet', done: 'Done' })
    expect(new Set(Object.values(PROGRESS_TEXT)).size).toBe(5)
    expect(STATION_TEXT.place(3, 6)).toBe('Station 3 of 6')
    expect(STATION_TEXT.previous('One')).toBe('Previous: One')
    expect(STATION_TEXT.next(CLOSING.heading)).toBe('Next: One last question')
  })

  it('say what Challenge keeps back and until when, as the engine has it, and give nothing of any flame away', () => {
    expect(PAGE_TEXT.challengeHidden).toBe('In Challenge, the hints and what a correct observation holds come once you have recorded an observation here that counts.')
    expect(PAGE_TEXT.heldBefore).toBe('This is what the loop gave when it was last held in the flame here. The loop has changed since: hold it in the flame again to see what it gives now.')
    const words = [...Object.values(PAGE_TEXT).flatMap((value) => (typeof value === 'string' ? [value] : [])), ...Object.values(RECORD_TEXT), ...Object.values(PROGRESS_TEXT), ...Object.values(CLOSING_PROGRESS_TEXT), PAGE_TEXT.elementCard('strontium')].join(' ')
    for (const salt of data.salts) expect(words, salt.id).not.toMatch(new RegExp(`\\b(${salt.flame.value.name}|${salt.metal.name === 'strontium' ? 'lilac' : salt.metal.name})\\b`))
    expect(words).not.toMatch(/\d\d\d/)
    expect(PAGE_TEXT.elementCard('copper')).toBe('Copper on the periodic table')
    expect(RECORD_TEXT.notCounted).toBe('Does not count: the loop was not clean')
  })
})

describe('every sentence of the module', () => {
  it('holds no institution text', () => {
    const sentences = [
      ...Object.values(PAGE_TEXT).flatMap((value) => (typeof value === 'string' ? [value] : [])),
      ...Object.values(RECORD_TEXT),
      ...Object.values(PROGRESS_TEXT),
      ...Object.values(CLOSING_PROGRESS_TEXT),
      STATION_TEXT.list,
      STATION_TEXT.closingPlace,
      unseenName(1, 2),
      PAGE_TEXT.elementCard('barium'),
      ...Object.values(BENCH_TEXT),
      ...Object.values(BLOCKED_TEXT),
      ...Object.values(MODE_TEXT),
      ...Object.values(QUESTION_LABEL),
      ...Object.values(LOOK_FIRST),
      ...HINTS,
      ...Object.values(WARNING_TEXT).flatMap((warning) => [warning.title, warning.body]),
      ...Object.values(WARNING_BUTTONS),
      CLOSING.heading,
      CLOSING.question,
      ...Object.values(CLOSING.choices),
      ...Object.values(CLOSING.feedback),
      ...ids.flatMap((id) => [stationTitle(data, id), describeSpectrum(data, view(id).spectrum), ...view(id).spectrum.map((seen) => featureCallout(seen, view(id).spectrum)), loopText(data, [HANDLING, id], id)]),
      uncleanText(data, { handled: true, carried: [BA, K] }),
    ]
    expect(sentences.length).toBeGreaterThan(70)
    for (const sentence of sentences) expect(findInstitutionText(sentence, []), sentence).toBeNull()
  })

  it('says of the two modes what the engine does in each', () => {
    expect(MODE_TEXT.guided).toContain('warns you before you dip a loop that is not clean')
    expect(MODE_TEXT.challenge).toContain('until you have recorded an observation there that counts: one made with a clean loop')
    expect(MODE_TEXT.challenge).toContain('no warning about the loop')
    expect(stationView(data, createLab(data, 'challenge'), CA).guidanceShown).toBe(false)
    expect(warnings(data, createLab(data, 'challenge'), { type: 'dipLoop', stationId: CA })).toEqual([])
    // An observation made with the handled loop does not count, and shows nothing; one made with a clean loop does.
    expect(stationView(data, run(data, createLab(data, 'challenge'), stationScript(data, CA, [HANDLING])), CA).guidanceShown).toBe(false)
    expect(stationView(data, run(data, createLab(data, 'challenge'), stationScript(data, CA)), CA).guidanceShown).toBe(true)
  })
})
