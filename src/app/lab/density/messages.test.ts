import { describe, expect, it } from 'vitest'
import { findInstitutionText } from '@/chem-data/denylist'
import { densityData as data, PART_IDS, unknownsOf } from '@/chem-data/density/data'
import { can, createLab, FIELDS, formatReading, kindOf, modelFrom, parseEntry, parseReading, partView, READ_FROM, warnings, type Blocked, type DensityState, type Field, type Instrument, type Reason, type ScaleView, type Slip, type Warning } from '@/engine/density'
import { readingOf, run, scaleOf, takeReadings, wholeRun, workedValue, workOut } from '@/engine/density/testkit'
import {
  BENCH_TEXT,
  benchLines,
  blockedText,
  candidateLines,
  describeBalance,
  describeBench,
  describeCylinder,
  describeNote,
  describePieces,
  describeScale,
  describeThermometer,
  ENTRY_NOT_A_NUMBER,
  enteredText,
  entryFeedback,
  entryText,
  expectedText,
  EYE_LABEL,
  EYE_TEXT,
  FIELD_UNIT,
  fieldLabel,
  figuresText,
  formatHelp,
  hazardsHeading,
  INSTRUMENT_HELP,
  INSTRUMENT_NAME,
  markText,
  MODE_TEXT,
  nameChoices,
  outcomeText,
  PAGE_TEXT,
  PART_AIM,
  PART_NUMBER,
  partNotes,
  partTitle,
  PROGRESS_TEXT,
  progressOf,
  readingRefusal,
  readText,
  readingText,
  reasonText,
  RECORD_TEXT,
  relationText,
  SOURCES_TEXT,
  TABLE_CAPTION,
  TABLE_HEADING,
  VERDICT_TEXT,
  verdictLabel,
  WARNING_BACK,
  WARNING_TEXT,
  weighLabel,
} from './messages'

const m = modelFrom(data)
const seeds = Array.from({ length: 100 }, (_, i) => i + 1)
const lab = (seed = 1, mode: 'guided' | 'challenge' = 'challenge') => createLab(seed, mode)
const SCALES = ['ruler-cm', 'ruler-mm', 'cylinder', 'thermometer'] as const
const INSTRUMENTS: Instrument[] = [...SCALES, 'balance']
const ALL_FIELDS = PART_IDS.flatMap((part) => FIELDS[part])
const SLIPS: Slip[] = ['eye-above', 'eye-below', 'decimals-too-many', 'decimals-too-few', 'figures-too-many', 'figures-too-few', 'cut-off', 'wrong-sign', 'upside-down', 'cylinder-not-taken-off', 'level-not-rise']
const BLOCKED: Blocked[] = ['lab-completed', 'unknown-part', 'not-this-part', 'already-done', 'run-over', 'nothing-to-repeat', 'notebook-not-full', 'invalid-entry', 'not-shown-yet', 'no-longer-shown', 'entry-above-missing', 'empty-not-weighed', 'reading-not-taken', 'not-what-is-shown', 'does-not-follow', ...SLIPS]
const REASONS: Reason[] = ['eye-not-level', 'reading-not-shown', 'weighed-wet', 'dropped-in', 'entries-do-not-follow', 'outside-tolerance']
const WARNINGS: Warning[] = ['eye-above', 'eye-below', 'pieces-not-weighed', 'dropping', 'pieces-wet']
const names = [...data.liquids, ...data.metals].map((row) => row.name)

describe('figures as they are written', () => {
  it('writes a reading with every figure and its unit, and a true minus sign below zero', () => {
    expect(readingText(m, 'ruler-cm', 60)).toBe('6.0 cm')
    expect(readingText(m, 'ruler-mm', 1562)).toBe('15.62 cm')
    expect(readingText(m, 'cylinder', 400)).toBe('40.0 mL')
    expect(readingText(m, 'thermometer', -4)).toBe('−0.4 °C')
    expect(readingText(m, 'balance', 2430)).toBe('24.30 g')
  })

  it('writes an entry in its field as the number alone, as it was typed, so that the parsers read it back as the same entry', () => {
    expect(entryText(m, data, 'firstMass', 2430)).toBe('24.30')
    expect(parseReading(m, 'balance', entryText(m, data, 'firstMass', 2430))).toEqual({ value: 2430 })
    expect(entryText(m, data, 'liquidVolume', { value: 253, eye: 'level' })).toBe('25.3')
    expect(entryText(m, data, 'temperature', -4)).toBe('-0.4')
    for (const text of ['34.28', '0.804', '97', '-0.4', '20.0']) expect(entryText(m, data, 'liquidMass', parseEntry(text)!), text).toBe(text)
    expect(entryText(m, data, 'metal', 'zinc')).toBe('Zinc')
  })

  it('writes an entry beside its label with its unit, and a name as the table has it', () => {
    expect(enteredText(m, data, 'liquidDensity', parseEntry('0.804')!)).toBe('0.804 g/mL')
    expect(enteredText(m, data, 'thermometerOff', parseEntry('-0.4')!)).toBe('−0.4 °C')
    expect(enteredText(m, data, 'areaCm', parseEntry('97')!)).toBe('97 cm²')
    expect(enteredText(m, data, 'liquid', 'nacl-20')).toBe('Sodium chloride solution, 20%')
    expect([figuresText(1), figuresText(3)]).toEqual(['1 significant figure', '3 significant figures'])
  })
})

describe('the parts and what is set out', () => {
  it('names each part and says what it is for, without a relation or a rule: the sentence is shown in Challenge too', () => {
    expect(PART_IDS.map((part) => partTitle(data, part))).toEqual(['Part 1: Reading instruments', 'Part 2: The density of a liquid', 'Part 3: The density of a metal'])
    for (const part of PART_IDS) {
      expect(PART_AIM[part].length, part).toBeGreaterThan(30)
      expect(PART_AIM[part]).not.toMatch(/÷|×|divided|fewest|decimal place/)
    }
    expect(Object.values(PART_NUMBER)).toEqual(['Part 1', 'Part 2', 'Part 3'])
  })

  it('lists what is on each bench, and names no liquid and no metal an unknown may be', () => {
    expect(benchLines(data, 'reading').length).toBe(4)
    for (const part of ['liquid', 'metal'] as const) {
      const lines = benchLines(data, part).join(' ')
      expect(lines).toContain(`unknown ${part}`)
      for (const reagent of unknownsOf(data, part)) expect(lines.toLowerCase(), reagent.name).not.toContain(reagent.name.toLowerCase().split(',')[0]!)
    }
  })

  it('gives the table beside an unknown as the record has it, with what its figures are for', () => {
    expect(candidateLines(data, 'liquid')).toEqual(['Ethanol, 95%: 0.804 g/mL', 'Ethanol, 50%: 0.914 g/mL', 'Water: 0.998 g/mL', 'Sodium chloride solution, 10%: 1.07 g/mL', 'Sodium chloride solution, 20%: 1.15 g/mL'])
    expect(candidateLines(data, 'metal')).toEqual(['Aluminium: 2.70 g/mL', 'Zinc: 7.14 g/mL', 'Iron: 7.87 g/mL', 'Copper: 8.96 g/mL'])
    expect(TABLE_CAPTION.liquid).toContain('20 °C')
    expect(TABLE_CAPTION.liquid).toContain('by mass')
    expect(TABLE_CAPTION.metal).toContain('room temperature')
    expect(Object.values(TABLE_HEADING)).toEqual(['Densities of liquids', 'Densities of metals'])
    expect(nameChoices(data, 'metal')).toEqual([{ value: 'aluminium', label: 'Aluminium' }, { value: 'zinc', label: 'Zinc' }, { value: 'iron', label: 'Iron' }, { value: 'copper', label: 'Copper' }])
  })

  it('heads the hazards with every thing the unknown may be until it is named, and with what it was after', () => {
    expect(hazardsHeading(data, 'liquid', null)).toBe('The unknown liquid may be either of these. Until it is named, handle it as both say.')
    expect(hazardsHeading(data, 'metal', null)).toBe('The unknown metal may be any of these three. Until it is named, handle the pieces as all of them say.')
    for (const name of names) for (const part of ['liquid', 'metal'] as const) expect(hazardsHeading(data, part, null)).not.toContain(name)
    expect(hazardsHeading(data, 'metal', { kind: 'unknown', id: 'zinc', density: 7.14 })).toBe('The unknown metal was zinc. Its hazards:')
  })
})

describe('every instrument’s reading in words (spec 22.6)', () => {
  /** What a reader makes of the words alone: the marks named, and the tenths the whereabouts stand for; two where the words leave two as likely. */
  function fromWords(words: string, instrument: (typeof SCALES)[number]): number[] {
    const unit = instrument === 'cylinder' ? 'mL' : instrument === 'thermometer' ? '°C' : 'cm'
    const number = `(−?\\d+(?:\\.\\d)?) ${unit}`
    const on = new RegExp(`on the ${number} mark`).exec(words)
    const between = new RegExp(`between the ${number} and ${number} marks, (.*)$`).exec(words)
    const value = (text: string) => Number(text.replace('−', '-'))
    const step = instrument === 'ruler-mm' ? 0.01 : 0.1
    const reading = (x: number) => Math.round(x / step)
    if (on) return [reading(value(on[1]!))]
    if (!between) throw new Error(`no marks in "${words}"`)
    const [low, high, where] = [value(between[1]!), value(between[2]!), between[3]!]
    const tenths = /^just (above|past) the/.test(where) ? [1] : /a quarter/.test(where) ? [2, 3] : /halfway/.test(where) ? [5] : /three quarters/.test(where) ? [7, 8] : /^just (below|short of) the/.test(where) ? [9] : null
    if (tenths === null) throw new Error(`no whereabouts in "${words}"`)
    return tenths.map((t) => reading(low + ((high - low) * t) / 10))
  }
  const sentence = (text: string, marker: string) => text.slice(text.indexOf(marker) + marker.length).replace(/\.$/, '')

  it('says where each scale stands by its two marks and whereabouts between them, so that a reading made from the words alone counts: every scale, every eye, seeds 1 to 100', () => {
    for (const seed of seeds) {
      for (const eye of ['level', 'above', 'below'] as const) {
        const state = run(m, lab(seed, 'guided'), [{ type: 'moveEye', part: 'reading', eye }])
        const { bench } = partView(m, state, 'reading')
        const cases: [Field, (typeof SCALES)[number], string][] = [
          ['lengthCm', 'ruler-cm', sentence(describeNote(bench.rulerCm!).split('. ')[1]!, 'its far edge is ')],
          ['widthCm', 'ruler-cm', sentence(describeNote(bench.rulerCm!).split('. ')[2]!, 'its far edge is ')],
          ['lengthMm', 'ruler-mm', describeScale(bench.rulerMm!.length)],
          ['widthMm', 'ruler-mm', describeScale(bench.rulerMm!.width)],
          ['firstVolume', 'cylinder', describeScale(bench.cylinder.scale!)],
          ['temperature', 'thermometer', describeScale(bench.thermometer!)],
        ]
        for (const [field, instrument, words] of cases) {
          for (const value of fromWords(words, instrument)) {
            // Guided takes a reading that is what the scale shows from where the eye is.
            expect(can(m, state, { type: 'enter', part: 'reading', field, value: instrument === 'cylinder' ? { value, eye } : value }), `seed ${seed} ${field} ${eye}: "${words}" read as ${value}`).toBeNull()
          }
        }
      }
    }
  })

  it('never gives the reading itself: no description of a scale holds the number a careful learner types', () => {
    for (const seed of seeds) {
      const state = run(m, lab(seed), [{ type: 'moveEye', part: 'reading', eye: 'level' }])
      const { bench } = partView(m, state, 'reading')
      const said: [Field, string][] = [['lengthCm', describeNote(bench.rulerCm!)], ['widthCm', describeNote(bench.rulerCm!)], ['lengthMm', describeNote(bench.rulerMm!)], ['widthMm', describeNote(bench.rulerMm!)], ['firstVolume', describeCylinder(bench.cylinder)], ['temperature', describeThermometer(bench.thermometer!)]]
      for (const [field, words] of said) {
        const view = scaleOf(m, state, 'reading', field)!
        // A level or an edge on a mark is said to be on it, and the reader adds the zero; anywhere else the number is not in the words.
        if (view.position === 'on-lower' || view.position === 'on-upper') continue
        const typed = formatReading(m, READ_FROM[field]!, (readingOf(m, state, 'reading', field) as { value: number }).value ?? (readingOf(m, state, 'reading', field) as number)).replace('-', '−')
        expect(words.includes(`${typed} `), `seed ${seed} ${field}: "${words}" holds ${typed}`).toBe(false)
      }
    }
  })

  it('names the marks as the scale numbers them', () => {
    const view = (instrument: (typeof SCALES)[number]): Pick<ScaleView, 'markE3' | 'unit'> => ({ markE3: m.scales[instrument].markE3, unit: m.scales[instrument].unit })
    expect(markText(view('ruler-cm'), 13000)).toBe('13 cm')
    expect(markText(view('ruler-mm'), 13800)).toBe('13.8 cm')
    expect(markText(view('cylinder'), 25000)).toBe('25 mL')
    expect(markText(view('thermometer'), -1000)).toBe('−1 °C')
  })

  it('puts each whereabouts into words, along a ruler and up a cylinder or a thermometer', () => {
    const at = (instrument: (typeof SCALES)[number], atE3: number) => {
      const state = lab()
      const view = scaleOf(m, state, 'reading', instrument === 'cylinder' ? 'firstVolume' : instrument === 'thermometer' ? 'temperature' : instrument === 'ruler-cm' ? 'lengthCm' : 'lengthMm')!
      const lowerE3 = Math.floor(atE3 / view.markE3) * view.markE3
      const hundredths = Math.floor(((atE3 - lowerE3) * 100) / view.markE3)
      const position = hundredths < 5 ? 'on-lower' : hundredths < 18 ? 'just-past' : hundredths < 38 ? 'quarter' : hundredths < 63 ? 'half' : hundredths < 83 ? 'three-quarters' : hundredths < 96 ? 'just-short' : 'on-upper'
      return describeScale({ ...view, atE3, lowerE3, upperE3: lowerE3 + view.markE3, position })
    }
    expect(at('cylinder', 25000)).toBe('on the 25 mL mark')
    expect(at('cylinder', 25100)).toBe('between the 25 mL and 26 mL marks, just above the 25 mL mark')
    expect(at('cylinder', 25300)).toBe('between the 25 mL and 26 mL marks, about a quarter of the way up from the 25 mL mark')
    expect(at('cylinder', 25500)).toBe('between the 25 mL and 26 mL marks, about halfway between them')
    expect(at('cylinder', 25800)).toBe('between the 25 mL and 26 mL marks, about three quarters of the way up from the 25 mL mark')
    expect(at('cylinder', 25900)).toBe('between the 25 mL and 26 mL marks, just below the 26 mL mark')
    expect(at('ruler-cm', 15100)).toBe('between the 15 cm and 16 cm marks, just past the 15 cm mark')
    expect(at('ruler-cm', 15700)).toBe('between the 15 cm and 16 cm marks, about three quarters of the way from the 15 cm mark')
    expect(at('ruler-cm', 15970)).toBe('on the 16 cm mark')
    expect(at('ruler-mm', 15690)).toBe('between the 15.6 cm and 15.7 cm marks, just short of the 15.7 cm mark')
    expect(at('thermometer', -400)).toBe('between the −1 °C and 0 °C marks, about halfway between them')
  })

  it('says where the eye is and what is in the cylinder, and that a level seen from above or below only looks to be where it is said', () => {
    const state = lab(1)
    expect(describeCylinder(partView(m, state, 'reading').bench.cylinder)).toMatch(/^The cylinder holds water\. Your eye is above the level: you are looking down on the liquid's surface\. From here the bottom of the curve looks to be (between|on) /)
    const level = run(m, state, [{ type: 'moveEye', part: 'reading', eye: 'level' }])
    expect(describeCylinder(partView(m, level, 'reading').bench.cylinder)).toMatch(/^The cylinder holds water\. Your eye is level with the bottom of the curve\. The bottom of the curve is (between|on) /)
    const below = run(m, state, [{ type: 'moveEye', part: 'reading', eye: 'below' }])
    expect(describeCylinder(partView(m, below, 'reading').bench.cylinder)).toContain('Your eye is below the level: you are looking up at the underside')
    // Which way the level is off is not said anywhere.
    for (const text of [...Object.values(EYE_TEXT), ...Object.values(EYE_LABEL), WARNING_TEXT['eye-above'].body, WARNING_TEXT['eye-below'].body, entryFeedback('firstVolume', { follows: false, slip: 'eye-above' })]) expect(text).not.toMatch(/higher|lower|too high|too low|more than it|less than it/)
    expect(describeCylinder(partView(m, lab(), 'liquid').bench.cylinder)).toBe('The cylinder is empty and dry.')
  })

  it('reads the balance out as its display, every figure, and says what is on it', () => {
    const state = lab(1)
    expect(describeBalance(m, partView(m, state, 'reading').bench.balance)).toBe('The object is on the balance. Its display shows 72.66 g.')
    expect(describeBalance(m, partView(m, state, 'liquid').bench.balance)).toBe('Nothing is on the balance.')
    const weighed = run(m, state, [{ type: 'weigh', part: 'liquid' }])
    expect(describeBalance(m, partView(m, weighed, 'liquid').bench.balance)).toBe('The empty cylinder is on the balance. Its display shows 74.90 g.')
  })

  it('describes each bench as it stands at every stage, a line for each instrument', () => {
    let state = lab(1)
    expect(describeBench(m, 'reading', partView(m, state, 'reading').bench).length).toBe(5)
    expect(describeBench(m, 'metal', partView(m, state, 'metal').bench)).toEqual([expect.stringMatching(/^The cylinder holds water\. /), 'Nothing is on the balance.', 'The pieces are dry, beside the cylinder.'])
    state = run(m, state, [{ type: 'moveEye', part: 'metal', eye: 'level' }, { type: 'weigh', part: 'metal' }])
    expect(describePieces(partView(m, state, 'metal').bench)).toBe('The pieces are dry, on the balance.')
    state = run(m, state, [{ type: 'enter', part: 'metal', field: 'waterLevel', value: readingOf(m, state, 'metal', 'waterLevel') }, { type: 'addPieces', part: 'metal', how: 'slide' }])
    expect(describeBench(m, 'metal', partView(m, state, 'metal').bench)).toEqual([expect.stringMatching(/^The cylinder holds water, with the pieces of metal under it\. /), 'Nothing is on the balance.', 'The pieces are in the cylinder, under the water: they were slid down the tilted glass.'])
    const dropped = takeReadings(m, lab(1), 'metal', { add: 'drop', weigh: 'after' })
    expect(describeBench(m, 'metal', partView(m, dropped, 'metal').bench).slice(1)).toEqual([expect.stringMatching(/^The pieces are on the balance, wet from the cylinder\. Its display shows \d+\.\d\d g\.$/), 'The pieces have been taken out of the cylinder, wet, and put on the balance.'])
    const liquid = takeReadings(m, lab(1), 'liquid')
    expect(describeBench(m, 'liquid', partView(m, liquid, 'liquid').bench)).toEqual([expect.stringMatching(/^The cylinder holds the unknown liquid\. Your eye is level/), expect.stringMatching(/^The cylinder with the liquid in it is on the balance\. /)])
  })

  it('names each instrument and says how it is marked and what it is read to', () => {
    for (const instrument of INSTRUMENTS) {
      expect(INSTRUMENT_NAME[instrument].length).toBeGreaterThan(5)
      expect(INSTRUMENT_HELP[instrument]).toMatch(instrument === 'balance' ? /every figure it shows, a final zero included/ : /Marked each .* (Read|read) .* to a (tenth|hundredth) of a/)
    }
  })

  it('labels the controls of the bench, and the one weighing a bench offers at each stage', () => {
    expect(weighLabel('liquid', partView(m, lab(), 'liquid').bench)).toBe(BENCH_TEXT.weighEmpty)
    let state = run(m, lab(), [{ type: 'weigh', part: 'liquid' }])
    state = run(m, state, [{ type: 'enter', part: 'liquid', field: 'emptyMass', value: readingOf(m, state, 'liquid', 'emptyMass') }, { type: 'pour', part: 'liquid' }])
    expect(weighLabel('liquid', partView(m, state, 'liquid').bench)).toBe(BENCH_TEXT.weighFull)
    expect(weighLabel('metal', partView(m, lab(), 'metal').bench)).toBe(BENCH_TEXT.weighPieces)
    const wet = takeReadings(m, lab(), 'metal', { weigh: 'after' })
    expect(weighLabel('metal', partView(m, wet, 'metal').bench)).toBe(BENCH_TEXT.weighWetPieces)
    expect(BENCH_TEXT.closerLookOf('cylinder')).toBe('Look closer at the graduated cylinder')
    expect(BENCH_TEXT.readingBox('balance')).toBe('Your reading of the balance')
    expect(Object.values(BENCH_TEXT.moveEye)).toEqual(['Look from above', 'Bring your eye level', 'Look from below'])
    expect(BENCH_TEXT.closerPicture('thermometer')).toBe('Thermometer, seen closer')
    expect(Object.values(BENCH_TEXT.side)).toEqual(['The long side of the note along the ruler', 'The short side of the note along the ruler'])
    expect([readText(0, 2), readText(1, 2), readText(2, 2), readText(1, 1)]).toEqual(['Not read yet', '1 of 2 read', 'Read', 'Read'])
    expect([PAGE_TEXT.previous('Balance'), PAGE_TEXT.next('Notebook')]).toEqual(['Previous: Balance', 'Next: Notebook'])
  })
})

describe('the notebook', () => {
  it('labels each entry with its unit, and a name with none', () => {
    expect(fieldLabel('lengthCm')).toBe('Length of the note, centimetre ruler (cm)')
    expect(fieldLabel('areaMm')).toBe('Area of the note, from the millimetre ruler (cm²)')
    expect(fieldLabel('thermometerOff')).toBe('How far the thermometer is off (°C)')
    expect(fieldLabel('liquidDensity')).toBe('Density of the liquid (g/mL)')
    expect(fieldLabel('metal')).toBe('The unknown metal is')
    expect(new Set(ALL_FIELDS.map(fieldLabel)).size).toBe(ALL_FIELDS.length)
    for (const field of ALL_FIELDS) expect(FIELD_UNIT[field] === '', field).toBe(kindOf(field) === 'name')
  })

  it('says how each kind of entry is typed, with an example that its own parser takes', () => {
    for (const field of ALL_FIELDS) {
      const help = formatHelp(field)
      expect(help.length, field).toBeGreaterThan(15)
      const instrument = READ_FROM[field]
      if (instrument === undefined) continue
      for (const example of help.match(/−?\d+\.\d+/g) ?? []) expect(parseReading(m, instrument, example).problem, `${field} ${example}`).toBeUndefined()
      expect(help.match(/−?\d+\.\d+/g)!.length, field).toBeGreaterThan(0)
    }
  })

  it('has the relation and the rounding rule behind every worked-out entry ready for Guided, with no figure of any run, and nothing for a reading', () => {
    for (const field of ALL_FIELDS) {
      const text = relationText(field)
      if (kindOf(field) === 'reading') expect(text, field).toBe('')
      else if (kindOf(field) === 'name') expect(text, field).toBe('Find the density in the table that is nearest your own.')
      else {
        expect(text, field).toMatch(kindOf(field) === 'difference' ? /A sum or a difference stops at the decimal place of its least exact term\./ : /A product or a quotient gets as many significant figures as its factor with the fewest\./)
        expect(text, field).toMatch(kindOf(field) === 'difference' ? / − / : kindOf(field) === 'product' ? / × / : / ÷ /)
        // The only figure in a relation is the ice point, which the bench gives.
        expect(text.replace('0.0 °C', '').match(/\d/), field).toBeNull()
      }
    }
  })
})

describe('refusals and feedback', () => {
  it('refuses a reading with too few figures or too many with the reason, for every instrument, and says what the instrument is read to', () => {
    for (const instrument of INSTRUMENTS) {
      const few = readingRefusal(instrument, 'too-few-figures', ' 12 ')
      expect(few, instrument).toMatch(/^12 has too few figures for the /)
      expect(few, instrument).toMatch(instrument === 'balance' ? /Every figure it shows is part of the reading, a final zero included: 7\.30, not 7\.3\./ : /one figure beyond its finest mark, which you estimate between two marks\. Write that figure even when it is a zero: /)
      const many = readingRefusal(instrument, 'too-many-figures', '12.345')
      expect(many, instrument).toMatch(instrument === 'balance' ? /^12\.345 has more figures than the balance shows\./ : /^12\.345 has too many figures for the .* nobody can read a figure beyond that\. Write it to 0\.0?1 /)
      expect(readingRefusal(instrument, 'not-a-number', 'abc'), instrument).toMatch(/^Type the reading as a number, to 0\.0?1 /)
      expect(readingRefusal(instrument, 'off-the-scale', '999.9'), instrument).toMatch(/^999\.9 is not on the scale of the .*, which runs from /)
    }
    expect(readingRefusal('cylinder', 'too-few-figures', '25')).toBe('25 has too few figures for the graduated cylinder. It is read to 0.1 mL: one figure beyond its finest mark, which you estimate between two marks. Write that figure even when it is a zero: 9.0, not 9.')
    expect(ENTRY_NOT_A_NUMBER).toMatch(/plain number/)
  })

  it('has a sentence for every reason an action cannot be done, for every entry it can be about', () => {
    for (const blocked of BLOCKED) {
      for (const part of PART_IDS) {
        expect(blockedText(part, blocked).length, `${blocked} ${part}`).toBeGreaterThan(15)
        for (const field of FIELDS[part]) expect(blockedText(part, blocked, field).length, `${blocked} ${field}`).toBeGreaterThan(15)
      }
    }
    expect(blockedText('liquid', 'not-shown-yet', 'fullMass')).toBe('Put the cylinder on the balance again, with the liquid in it, first.')
    expect(blockedText('liquid', 'no-longer-shown', 'emptyMass')).toContain('run the part again')
    // The water's first level is gone while the pieces are in the cylinder and once they are out on the balance again: the sentence holds in both.
    expect(blockedText('metal', 'no-longer-shown', 'waterLevel')).toBe('The pieces have been put into the water, so its first level is gone. To change this reading, run the part again.')
    expect(blockedText('liquid', 'reading-not-taken')).toContain("empty cylinder's mass")
    expect(blockedText('metal', 'reading-not-taken')).toContain('Type the level into the notebook first')
    expect(blockedText('reading', 'not-what-is-shown', 'firstMass')).toBe('That is not what the balance shows. Copy every figure of its display.')
  })

  it('says of an entry that is not right which rule it broke, or which slip it looks like, for every slip the engine knows', () => {
    expect(entryFeedback('liquidMass', { follows: false, slip: 'decimals-too-many' })).toMatch(/too many decimal places\. A sum or a difference stops at the decimal place of its least exact term\./)
    expect(entryFeedback('liquidMass', { follows: false, slip: 'decimals-too-few' })).toMatch(/too few decimal places\. A sum or a difference stops at the decimal place of its least exact term\./)
    expect(entryFeedback('liquidDensity', { follows: false, slip: 'figures-too-many' })).toMatch(/too many significant figures\. A product or a quotient gets as many significant figures as its factor with the fewest\./)
    expect(entryFeedback('areaCm', { follows: false, slip: 'figures-too-few' })).toMatch(/too few significant figures\. A product or a quotient gets as many significant figures as its factor with the fewest\./)
    expect(entryFeedback('liquidDensity', { follows: false, slip: 'cut-off' })).toMatch(/cut off where it should have been rounded/)
    expect(entryFeedback('liquidDensity', { follows: false, slip: 'upside-down' })).toBe('That is volume over mass. Density is mass divided by volume.')
    expect(entryFeedback('thermometerOff', { follows: false, slip: 'wrong-sign' })).toContain('off by a negative amount')
    expect(entryFeedback('metalDensity', { follows: false, slip: 'level-not-rise' })).toContain('the rise')
    for (const slip of SLIPS) for (const field of ALL_FIELDS) expect(entryFeedback(field, { follows: false, slip }).length, `${slip} ${field}`).toBeGreaterThan(20)
    for (const field of ALL_FIELDS) {
      expect(entryFeedback(field, { follows: false, slip: null }).length, field).toBeGreaterThan(20)
      expect(entryFeedback(field, { follows: true, slip: null })).toBe(kindOf(field) === 'reading' ? 'This is what the instrument showed.' : 'This follows from your own numbers.')
      expect(verdictLabel(field, { follows: false, slip: null })).toBe(kindOf(field) === 'reading' ? VERDICT_TEXT.reading.not : VERDICT_TEXT.worked.not)
    }
  })

  it("words Guided's refusal of each scripted slip as that slip, and never gives the value the entry should have", () => {
    for (const seed of seeds.slice(0, 25)) {
      for (const part of ['liquid', 'metal'] as const) {
        let state = takeReadings(m, lab(seed, 'guided'), part)
        for (const field of FIELDS[part].filter((f) => kindOf(f) !== 'reading')) {
          const right = workedValue(m, state, part, field)
          for (const slip of ['figures-too-many', 'figures-too-few', 'decimals-too-few', 'upside-down', 'wrong-name'] as const) {
            const wrong = workedValue(m, state, part, field, slip)
            const blocked = can(m, state, { type: 'enter', part, field, value: wrong })
            if (blocked === null) continue
            const text = blockedText(part, blocked, field)
            expect(text.length, `seed ${seed} ${field} ${slip}`).toBeGreaterThan(20)
            if (typeof right !== 'string') expect(text, `seed ${seed} ${field} ${slip}`).not.toContain(entryText(m, data, field, right))
            else for (const name of names) expect(text).not.toContain(name)
          }
          state = run(m, state, [{ type: 'enter', part, field, value: right }])
        }
      }
    }
  })

  it('refuses in Guided a reading off the scale’s level with a sentence that does not say which way, nor what the reading is', () => {
    for (const seed of seeds.slice(0, 25)) {
      const state = run(m, lab(seed, 'guided'), [{ type: 'moveEye', part: 'reading', eye: 'level' }])
      for (const field of FIELDS.reading.filter((f) => kindOf(f) === 'reading' && READ_FROM[f] !== 'balance')) {
        const off = readingOf(m, state, 'reading', field, 4)
        const blocked = can(m, state, { type: 'enter', part: 'reading', field, value: off })
        expect(blocked, `seed ${seed} ${field}`).toBe('not-what-is-shown')
        const text = blockedText('reading', blocked!, field)
        expect(text).toMatch(/^That is more than 0\.0?2 /)
        expect(text).not.toMatch(/too high|too low|higher|lower|above the|below the/)
        expect(text).not.toContain(entryText(m, data, field, readingOf(m, state, 'reading', field)))
      }
    }
  })
})

describe('the warnings', () => {
  it('say before an error what it does and that the run will not count, and leave a way back and a way on', () => {
    for (const warning of WARNINGS) {
      const { title, body, on } = WARNING_TEXT[warning]
      expect(title.length, warning).toBeGreaterThan(10)
      expect(body, warning).toMatch(/this run will not count/)
      expect(on, warning).toMatch(/anyway$/)
    }
    expect(WARNING_BACK).toBe('Go back')
    expect(WARNING_TEXT['pieces-not-weighed'].body).toContain('Weigh them dry first')
    expect(WARNING_TEXT.dropping.body).toContain('slide down the glass')
  })

  it('are the warnings the engine gives, where it gives them', () => {
    let state = lab(1, 'guided')
    const above = warnings(m, state, { type: 'enter', part: 'reading', field: 'firstVolume', value: readingOf(m, state, 'reading', 'firstVolume') })
    expect(above.map((w) => WARNING_TEXT[w].title)).toEqual(['Your eye is above the level'])
    state = run(m, state, [{ type: 'moveEye', part: 'metal', eye: 'level' }])
    state = run(m, state, [{ type: 'enter', part: 'metal', field: 'waterLevel', value: readingOf(m, state, 'metal', 'waterLevel') }])
    expect(warnings(m, state, { type: 'addPieces', part: 'metal', how: 'drop' }).map((w) => WARNING_TEXT[w].title)).toEqual(['The pieces have not been weighed', 'Dropping the pieces in'])
  })
})

describe('a run that is checked', () => {
  it('says that a careful run counts, and for an unknown how far its density is from the figure the lab holds', () => {
    let state = lab(1)
    for (const part of PART_IDS) state = wholeRun(m, state, part)
    expect(outcomeText(m, 'reading', partView(m, state, 'reading').outcome)).toBe('This run counts: every reading is what its instrument showed, and every entry follows.')
    expect(outcomeText(m, 'liquid', partView(m, state, 'liquid').outcome)).toMatch(/^This run counts\. Your density is (equal to|0\.\d% (under|over)) the figure the lab holds for the unknown, and you named it\.$/)
    expect(outcomeText(m, 'metal', { state: 'open' })).toBe('')
  })

  it('says of a run that does not count why, each cause in a sentence, and that the part is run again', () => {
    for (const reason of REASONS) expect(reasonText(m, reason).length, reason).toBeGreaterThan(30)
    expect(reasonText(m, 'outside-tolerance')).toBe('Your density is more than 3% from the figure the lab holds for the unknown.')
    expect(reasonText(m, 'weighed-wet')).toContain('the water on them was weighed too')
    expect(reasonText(m, 'dropped-in')).toContain('the rise read low')
    const state = wholeRun(m, lab(1), 'metal', { weigh: 'after', add: 'drop', eye: 'above' })
    const text = outcomeText(m, 'metal', partView(m, state, 'metal').outcome)
    expect(text).toMatch(/^This run does not count\. /)
    for (const reason of ['weighed-wet', 'dropped-in', 'eye-not-level'] as const) expect(text).toContain(reasonText(m, reason))
    expect(text).toMatch(/Run the part again: it is set up with new numbers\.$/)
    expect(outcomeText(m, 'metal', partView(m, state, 'metal').outcome, false)).not.toContain('Run the part again')
    const marked = wholeRun(m, lab(1), 'liquid', { slip: 'figures-too-many' })
    expect(outcomeText(m, 'liquid', partView(m, marked, 'liquid').outcome)).toContain('rounded by the wrong rule. The notebook marks which.')
  })

  it('gives no figure for how far off a run was, and names no liquid or metal, until a run of the part counts', () => {
    for (const seed of seeds.slice(0, 30)) {
      for (const part of ['liquid', 'metal'] as const) {
        const state = wholeRun(m, lab(seed), part, part === 'metal' ? { add: 'drop' } : { off: 9 })
        const view = partView(m, state, part)
        const text = outcomeText(m, part, view.outcome)
        expect(text, `seed ${seed} ${part}`).not.toMatch(/\d\.\d%/)
        // The name the learner chose is in the notebook; the outcome names none.
        for (const name of names.filter((n) => n !== 'Water')) expect(text).not.toContain(name)
        expect(text).not.toMatch(/\bwater\b(?! splashed| on them)/)
        expect(view.expected).toBeNull()
      }
    }
  })

  it("says what the unknown was once the engine hands it over, and shows the part's notes then", () => {
    let state = lab(1)
    for (const part of PART_IDS) state = wholeRun(m, state, part)
    expect(expectedText(data, 'liquid', partView(m, state, 'liquid').expected!)).toBe('The unknown liquid was sodium chloride solution, 20%: 1.15 g/mL at 20 °C.')
    expect(expectedText(data, 'metal', partView(m, state, 'metal').expected!)).toBe('The unknown metal was aluminium: 2.70 g/mL near room temperature.')
    expect(expectedText(data, 'reading', partView(m, state, 'reading').expected!)).toContain('no figure to find')
    for (const part of PART_IDS) expect(partNotes(data, part)).toEqual(data.parts.find((p) => p.id === part)!.notes.map((n) => n.value))
    expect(hazardsHeading(data, 'liquid', partView(m, state, 'liquid').expected)).toBe('The unknown liquid was sodium chloride solution, 20%. Its hazards:')
  })
})

describe('progress and modes', () => {
  it('says how far a part has come, at every stage', () => {
    const at = (state: DensityState, part: 'reading' | 'liquid' | 'metal') => PROGRESS_TEXT[progressOf(partView(m, state, part))]
    let state = lab(1)
    expect(at(state, 'liquid')).toBe('Not started')
    state = run(m, state, [{ type: 'weigh', part: 'liquid' }])
    expect(at(state, 'liquid')).toBe('Taking readings')
    state = takeReadings(m, lab(1), 'liquid')
    expect(at(state, 'liquid')).toBe('Taking readings')
    state = run(m, state, [{ type: 'enter', part: 'liquid', field: 'liquidMass', value: workedValue(m, state, 'liquid', 'liquidMass') }])
    expect(at(state, 'liquid')).toBe('Working out')
    const failed = wholeRun(m, lab(1), 'liquid', { slip: 'figures-too-few' })
    expect(at(failed, 'liquid')).toBe('Does not count yet: run it again')
    expect(at(run(m, failed, [{ type: 'runAgain', part: 'liquid' }]), 'liquid')).toBe('Taking readings')
    expect(at(workOut(m, state, 'liquid'), 'liquid')).toBe('Working out')
    expect(at(wholeRun(m, lab(1), 'liquid'), 'liquid')).toBe('Done')
  })

  it('says what each mode does', () => {
    expect(MODE_TEXT.guided).toMatch(/checks each reading and each entry as you make it/)
    expect(MODE_TEXT.guided).toMatch(/warns you before/)
    expect(MODE_TEXT.challenge).toMatch(/says nothing until you check the notebook/)
  })
})

describe('every sentence of the module', () => {
  function sentences(): string[] {
    const state = wholeRun(m, wholeRun(m, wholeRun(m, lab(1), 'reading'), 'liquid'), 'metal')
    // A run with one cause: a run with several has a sentence for each, which the tests above read.
    const failed = wholeRun(m, lab(1), 'metal', { add: 'drop' })
    const strings = (value: unknown): string[] => (typeof value === 'string' ? [value] : typeof value === 'function' ? [] : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : [])
    return [
      ...strings([PART_NUMBER, PART_AIM, TABLE_HEADING, TABLE_CAPTION, INSTRUMENT_NAME, INSTRUMENT_HELP, EYE_LABEL, EYE_TEXT, BENCH_TEXT, VERDICT_TEXT, WARNING_TEXT, MODE_TEXT, PROGRESS_TEXT, PAGE_TEXT, RECORD_TEXT]),
      WARNING_BACK,
      ENTRY_NOT_A_NUMBER,
      SOURCES_TEXT,
      PAGE_TEXT.figures('liquidDensity', 3),
      RECORD_TEXT.run(2),
      ...[readText(0, 2), readText(1, 2), readText(2, 2), PAGE_TEXT.previous('Balance'), PAGE_TEXT.next('Notebook')],
      ...INSTRUMENTS.flatMap((instrument) => [BENCH_TEXT.closerLookOf(instrument), BENCH_TEXT.closerPicture(instrument), BENCH_TEXT.readingBox(instrument), ...(['not-a-number', 'too-few-figures', 'too-many-figures', 'off-the-scale'] as const).map((problem) => readingRefusal(instrument, problem, '12'))]),
      ...PART_IDS.flatMap((part) => [partTitle(data, part), ...benchLines(data, part), ...describeBench(m, part, partView(m, lab(1), part).bench), ...describeBench(m, part, partView(m, state, part).bench), outcomeText(m, part, partView(m, state, part).outcome), expectedText(data, part, partView(m, state, part).expected!)]),
      ...(['liquid', 'metal'] as const).flatMap((part) => [...candidateLines(data, part), hazardsHeading(data, part, null), hazardsHeading(data, part, partView(m, state, part).expected)]),
      ...describeBench(m, 'metal', partView(m, failed, 'metal').bench),
      outcomeText(m, 'metal', partView(m, failed, 'metal').outcome),
      ...ALL_FIELDS.flatMap((field) => [fieldLabel(field), formatHelp(field), relationText(field), entryFeedback(field, { follows: true, slip: null }), entryFeedback(field, { follows: false, slip: null }), ...SLIPS.map((slip) => entryFeedback(field, { follows: false, slip }))]),
      ...BLOCKED.flatMap((blocked) => PART_IDS.flatMap((part) => [blockedText(part, blocked), ...FIELDS[part].map((field) => blockedText(part, blocked, field))])),
      ...REASONS.map((reason) => reasonText(m, reason)),
    ].filter((text) => text !== '')
  }

  it('is there: over three hundred of them', () => {
    expect(new Set(sentences()).size).toBeGreaterThan(150)
    expect(sentences().length).toBeGreaterThan(300)
  })

  it('names no maker and no supplier, and holds no institution text', () => {
    for (const text of sentences()) {
      expect(text).not.toMatch(/flinn|fisher|ward's|avantor|wikipedia|NIST|NOAA/i)
      expect(findInstitutionText(text, []), text).toBeNull()
    }
  })

  it('is short and plain: no sentence of the page over 60 words, and no single one over 32', () => {
    for (const text of sentences()) {
      expect(text.split(/\s+/).length, text).toBeLessThanOrEqual(60)
      for (const one of text.split(/(?<=[.:]) (?=[A-Z])/)) expect(one.split(/\s+/).length, one).toBeLessThanOrEqual(32)
    }
  })

  // No quotation: the fingerprint of the pages is not kept in the repository, and the case is skipped where it is absent (see src/chem-data/density/quotation.test.ts).
  type Lib = { unpackHashes(base64: string): Set<number>; quotedRuns(text: string, fingerprint: Set<number>): string[] }
  const [lib] = Object.values(import.meta.glob<Lib>('../../../../scripts/titration-lib.mjs', { eager: true }))
  const [fingerprint] = Object.values(import.meta.glob<{ hashes: string }>('../../../../docs/research/density/sources/quotation-fingerprint.json', { eager: true, import: 'default' }))
  it.skipIf(fingerprint === undefined)('repeats no run of six words of a page the lab rests on (skipped where the fingerprint is absent)', () => {
    const pages = lib!.unpackHashes(fingerprint!.hashes)
    for (const text of sentences()) expect(lib!.quotedRuns(text, pages), text).toEqual([])
  })
})
