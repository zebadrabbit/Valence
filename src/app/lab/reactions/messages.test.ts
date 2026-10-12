import { describe, expect, it } from 'vitest'
import { findInstitutionText } from '@/chem-data/denylist'
import { FIELDS, KIND_ANSWERS, LOOKS, METAL_IDS, STATION_IDS, reactionsData as data, type StationId } from '@/chem-data/reactions/data'
import { can, createLab, modelFrom, reduce, stationView, type Action, type Blocked, type Problem, type ReactionsState, type VesselShows } from '@/engine/reactions'
import { rightEntry, wholeStation, wrongEntry } from '@/engine/reactions/testkit'
import {
  ACTION_DONE,
  ACTION_LABEL,
  BENCH_TEXT,
  BUILDER_TEXT,
  EQUATION_TEXT,
  FIELD_LABEL,
  FIELD_SHORT,
  HINT,
  HINT_LABEL,
  KIND_LABEL,
  KIND_MEANS,
  KIND_TEXT,
  LAB_TEXT,
  METAL_NAME,
  MODE_TEXT,
  NOTES_TEXT,
  OBSERVATION_TEXT,
  ORDER_TEXT,
  PAGE_TEXT,
  PROBLEM_TEXT,
  PROGRESS_TEXT,
  RECORD_TEXT,
  SOURCES_TEXT,
  STATE_LABEL,
  STATION_TASK,
  WARM_TEXT,
  benchLines,
  blockedText,
  catalystText,
  checkedText,
  choiceLabel,
  choiceList,
  equationText,
  fieldLabel,
  kindChoiceLabel,
  kindChoices,
  lookLabel,
  lookPart,
  mismatchText,
  observationLines,
  orderText,
  outcomeText,
  progressOf,
  reasonText,
  stationLetter,
  stationName,
  stationNames,
  stationNotes,
  tileLabel,
  vesselName,
  vesselShort,
  vesselText,
} from './messages'

// Every sentence of the types of reactions lab's page, and the last line of spec 24.5: the description in words of
// every picture is tested.

const m = modelFrom(data)
const act = (stationId: StationId): ReactionsState => reduce(m, createLab('challenge'), { type: 'act', station: stationId })
/** Every picture the lab can show: each vessel of each station, before the action and after it. */
const pictures = STATION_IDS.flatMap((stationId) =>
  stationView(m, createLab('challenge'), stationId).vessels.flatMap((before, i) => [
    { where: `${stationId} ${before.id} before`, shows: before.shows },
    { where: `${stationId} ${before.id} after`, shows: stationView(m, act(stationId), stationId).vessels[i]!.shows },
  ]),
)
/** The words that would say what a thing is, or which kind of reaction it shows. */
const WHAT_IT_IS = /copper|zinc|magnesium|hydrogen|oxygen|oxide|carbonate|chloride|peroxide|sulfate|\bacid\b|combination|decomposition|replacement|catalyst/i
const ALL_BLOCKED: Blocked[] = [
  'station-checked',
  'action-done',
  'act-first',
  'look-first',
  'observe-first',
  'kind-first',
  'nothing-to-write',
  'not-all-done',
  'invalid-entry',
  'unknown-station',
  'nothing-to-repeat',
  'no-more-runs',
  'run-too-long',
  'does-not-match',
  'not-right',
  'no-reaction',
  'species-extra',
  'species-missing',
  'state-wrong',
  'not-balanced',
]

describe('the description in words of every picture (spec 24.5, last item)', () => {
  it('covers every picture the lab can show: fourteen of them, a vessel before and after', () => {
    expect(pictures.length).toBe(14)
    expect(Object.fromEntries(pictures.map(({ where, shows }) => [where, vesselText(shows)]))).toEqual({
      'zinc-copper-sulfate tube before': 'A test tube of clear, blue liquid. A grey piece of metal lies beside the tube.',
      'zinc-copper-sulfate tube after': 'A test tube of clear, paler blue liquid. A grey piece of metal stands in the liquid, with a red-brown coating on it. No bubbles rise.',
      'magnesium-flame strip before': 'A silvery strip of metal, held in tongs beside a burner.',
      'magnesium-flame strip after': 'The strip burns with a white light, too bright to look at. A white powder is left in the tongs.',
      'metals-in-acid magnesium before': 'A test tube of clear, colourless liquid. A silvery piece of metal lies beside the tube.',
      'metals-in-acid magnesium after': 'A test tube of clear, colourless liquid. A silvery piece of metal stands in the liquid. Bubbles stream off the metal, fast.',
      'metals-in-acid zinc before': 'A test tube of clear, colourless liquid. A grey piece of metal lies beside the tube.',
      'metals-in-acid zinc after': 'A test tube of clear, colourless liquid. A grey piece of metal stands in the liquid. Bubbles rise off the metal, slowly.',
      'metals-in-acid copper before': 'A test tube of clear, colourless liquid. A reddish piece of metal lies beside the tube.',
      'metals-in-acid copper after': 'A test tube of clear, colourless liquid. A reddish piece of metal stands in the liquid. No bubbles rise.',
      'two-solutions tube before': 'A test tube of clear, colourless liquid.',
      'two-solutions tube after': 'A test tube of colourless liquid, cloudy with a white solid.',
      'peroxide tube before': 'A test tube of clear, colourless liquid.',
      'peroxide tube after': 'A test tube of clear, pale yellow liquid. Bubbles rise through the liquid. The tube is warm to the touch.',
    })
  })

  it('says every field of what is shown: each colour, a coating, bubbles and how fast, a light, a powder and warmth, which no picture shows', () => {
    for (const { where, shows } of pictures) {
      const text = vesselText(shows)
      for (const colour of [shows.tube?.liquid?.colour, shows.tube?.solid?.colour, shows.metal?.colour, shows.metal?.coating, shows.light, shows.residue]) if (colour) expect(text, where).toContain(colour)
      expect(/Bubbles (stream|rise) (off|through)/.test(text), where).toBe(shows.bubbles !== 'none')
      expect(/fast/.test(text), where).toBe(shows.bubbles === 'fast')
      expect(/slowly/.test(text), where).toBe(shows.bubbles === 'slow')
      expect(text.includes('warm to the touch'), where).toBe(shows.warm)
      expect(text.includes('cloudy'), where).toBe(shows.tube?.liquid?.cloudy === true)
      expect(text.includes('beside the tube') || text.includes('beside a burner'), where).toBe(shows.metal !== null && !shows.metal.placed)
    }
  })

  it('never says what anything is, nor which kind of reaction it shows', () => {
    for (const { where, shows } of pictures) expect(vesselText(shows), where).not.toMatch(WHAT_IT_IS)
  })

  it('words what the shared shapes allow and this lab never shows: a settled solid, an empty tube, a strip in the flame, empty tongs, a coated piece beside its tube', () => {
    const quiet = { bubbles: 'none', light: null, residue: null, warm: false } as const
    const tube = (holds: VesselShows['tube']): VesselShows => ({ drawn: 'tube', tube: holds, metal: null, ...quiet })
    expect(vesselText(tube({ liquid: { colour: 'blue', cloudy: false, microlitres: 1 }, solid: { colour: 'white', settled: true } }))).toBe('A test tube of blue liquid, with a white solid at the bottom.')
    expect(vesselText(tube({ liquid: null, solid: null }))).toBe('An empty test tube.')
    expect(vesselText({ drawn: 'flame', tube: null, metal: { colour: 'silvery', coating: null, placed: true }, ...quiet })).toBe('A silvery strip of metal, held in tongs in the flame of a burner.')
    expect(vesselText({ drawn: 'flame', tube: null, metal: null, ...quiet })).toBe('Tongs beside a burner, with nothing in them.')
    expect(vesselText({ drawn: 'tube', tube: { liquid: { colour: 'colourless', cloudy: false, microlitres: 1 }, solid: null }, metal: { colour: 'grey', coating: 'black', placed: false }, ...quiet, bubbles: 'some' })).toBe(
      'A test tube of clear, colourless liquid. A grey piece of metal lies beside the tube, with a black coating on it. Bubbles rise through the liquid.',
    )
    expect(WARM_TEXT).toBe('Warm to the touch')
  })

  it('names each look by the part it is at, and says when it has been made', () => {
    expect(LOOKS.map((look) => lookLabel('tube', look, false))).toEqual(['Look at the metal', 'Look at the liquid', 'Look for any solid', 'Glance at the strip in the flame', 'Feel the tube'])
    expect([lookLabel('flame', 'solid', false), lookLabel('flame', 'solid', true), lookLabel('tube', 'touch', true)]).toEqual(['Look at what is left', 'Look at what is left, looked at', 'Feel the tube, felt'])
    expect(lookPart('tube', 'metal')).toBe('the metal')
    // The words of a look are the record's, handed over by the view once the part has been looked at; none says what a thing is.
    for (const station of data.stations) for (const vessel of station.vessels) for (const look of vessel.looks) for (const said of [look.before, look.after]) expect(said, `${station.id} ${vessel.id}`).not.toMatch(WHAT_IT_IS)
  })
})

describe('the lab, its stations and their benches', () => {
  it('names the lab and its five stations by what is used, and never by the kind of reaction (spec 24.5)', () => {
    expect(stationNames(data)).toEqual([
      { id: 'zinc-copper-sulfate', name: 'Station A: Zinc in copper(II) sulfate solution' },
      { id: 'magnesium-flame', name: 'Station B: Magnesium in a flame' },
      { id: 'metals-in-acid', name: 'Station C: Three metals in hydrochloric acid' },
      { id: 'two-solutions', name: 'Station D: Calcium chloride and sodium carbonate solutions' },
      { id: 'peroxide', name: 'Station E: Hydrogen peroxide with iron(III) chloride' },
    ])
    expect([stationLetter(data, 'peroxide'), stationName(data, 'peroxide')]).toEqual(['Station E', 'Station E: Hydrogen peroxide with iron(III) chloride'])
    for (const id of STATION_IDS) for (const text of [stationName(data, id), STATION_TASK[id], ACTION_LABEL[id], ACTION_DONE[id]]) expect(text, id).not.toMatch(/combination|decomposition|replacement|displace|catalyst|speeds/i)
  })

  it('says what is to be done at each station with no word of what will be seen', () => {
    for (const id of STATION_IDS) {
      for (const text of [STATION_TASK[id], ACTION_LABEL[id], ACTION_DONE[id]]) expect(text, id).not.toMatch(/bubbl|coating|white|fade|paler|warm|solid|powder|red-brown|cloud|fast|slow/i)
    }
    expect(STATION_TASK['magnesium-flame']).toMatch(/Do not look straight at it/)
  })

  it('lists what is on each bench by the names of the record, and names each vessel', () => {
    expect(benchLines(data, 'metals-in-acid')).toEqual(['Magnesium, ribbon', 'Zinc, pieces', 'Copper, pieces', 'Hydrochloric acid, 1 M'])
    expect(STATION_IDS.flatMap((id) => benchLines(data, id)).length).toBe(11)
    expect(STATION_IDS.map((id) => data.stations.find((s) => s.id === id)!.vessels.map((v) => vesselName(data, id, v.id)))).toEqual([['The tube'], ['The strip'], ['The magnesium tube', 'The zinc tube', 'The copper tube'], ['The tube'], ['The tube']])
    expect(() => vesselName(data, 'peroxide', 'nothing')).toThrow(/no vessel/)
    // One of several tubes in a word, for a button with little room: the word is in the tube's whole name, which is the button's.
    for (const vessel of data.stations.find((s) => s.id === 'metals-in-acid')!.vessels) expect(vesselName(data, 'metals-in-acid', vessel.id).toLowerCase()).toContain(vesselShort(data, 'metals-in-acid', vessel.id).toLowerCase())
    expect(vesselShort(data, 'metals-in-acid', 'copper')).toBe('Copper')
    expect(() => vesselShort(data, 'two-solutions', 'tube')).toThrow(/no tube with a metal/)
    expect(ORDER_TEXT.heading.toLowerCase()).toContain(ORDER_TEXT.short.toLowerCase())
    expect(Object.keys(METAL_NAME)).toEqual([...METAL_IDS])
  })
})

describe('what is seen', () => {
  it('has a label for every field, and words every choice of the record so that it reads alone', () => {
    expect(Object.keys(FIELD_LABEL)).toEqual([...FIELDS])
    expect([fieldLabel('tube', 'solid'), fieldLabel('flame', 'solid'), fieldLabel('flame', 'light')]).toEqual(['Solid in the liquid', 'What is left', 'Light'])
    expect(Object.fromEntries(FIELDS.map((field) => [field, choiceList(field, data.choices[field]).map((c) => c.label)]))).toEqual({
      coating: ['no coating', 'a red-brown coating', 'a black coating', 'a white coating'],
      liquid: ['colourless', 'blue', 'paler blue', 'green', 'pale yellow'],
      solid: ['no solid', 'a white solid', 'a blue solid', 'a black solid'],
      bubbles: ['none', 'slowly', 'fast'],
      gas: ['no bubbles', 'bubbles'],
      light: ['no light', 'a red glow', 'a white light'],
      warmth: ['no change', 'warmer', 'colder'],
    })
    expect(choiceList('gas', data.choices.gas).map((c) => c.value)).toEqual(data.choices.gas)
    expect(choiceLabel('coating', 'red-brown')).toBe('a red-brown coating')
    expect(observationLines('flame', ['light', 'solid'], { light: 'white light', solid: 'white' })).toEqual(['Light: a white light', 'What is left: a white solid'])
    // Under one of several tubes a line is short: each field in a word or two.
    expect(observationLines('tube', ['bubbles'], { bubbles: 'slow' }, true)).toEqual(['Bubbles: slowly'])
    for (const field of FIELDS) expect(FIELD_SHORT[field].length, field).toBeLessThanOrEqual(FIELD_LABEL[field].length)
  })

  it('says which part to look at again, and never what it should be', () => {
    expect(mismatchText([])).toBe('')
    expect(mismatchText(['coating'])).toBe('Not yet. Look again at the metal.')
    expect(mismatchText(['coating', 'liquid'])).toBe('Not yet. Look again at the metal and the liquid.')
    expect(checkedText([])).toBe('That is what it showed.')
    expect(checkedText(['gas', 'warmth'])).toBe('Not what it showed: the bubbles and how the tube feels.')
    for (const field of FIELDS) for (const text of [mismatchText([field]), checkedText([field])]) expect(text).not.toMatch(new RegExp(data.choices[field].filter((c) => c !== 'bubbles').join('|')))
  })
})

describe('the kind, the equation and the order', () => {
  it("offers the five answers at every vessel, each with what it means and the record's pattern", () => {
    expect(kindChoices(data)).toEqual([
      { value: 'combination', label: 'Combination', means: 'two things join into one', pattern: 'A + B → AB' },
      { value: 'decomposition', label: 'Decomposition', means: 'one thing comes apart', pattern: 'AB → A + B' },
      { value: 'single-replacement', label: 'Single replacement', means: 'an element takes the place of another in a compound', pattern: 'A + BC → AC + B' },
      { value: 'double-replacement', label: 'Double replacement', means: 'two compounds trade partners', pattern: 'AB + CD → AD + CB' },
      { value: 'none', label: 'No reaction', means: 'nothing changed', pattern: null },
    ])
    expect(Object.keys(KIND_LABEL)).toEqual([...KIND_ANSWERS])
    expect(Object.keys(KIND_MEANS)).toEqual([...KIND_ANSWERS])
  })

  it('writes a built equation out in a line, names each tile and each state, and says of a catalyst where it stands', () => {
    const tiles = stationView(m, createLab('guided'), 'peroxide').tiles
    const { reactants, products } = rightEntry(m, 'peroxide', 'tube')
    expect(equationText(tiles, { reactants, products })).toBe('2H₂O₂(aq) → 2H₂O(l) + O₂(g)')
    expect(tiles.map(tileLabel)).toEqual(['H₂O₂, hydrogen peroxide', 'H₂O, water', 'O₂, oxygen', 'H₂, hydrogen', 'FeCl₃, iron(III) chloride', 'HCl, hydrochloric acid'])
    expect(STATE_LABEL).toEqual({ aq: 'dissolved in water', s: 'solid', l: 'liquid', g: 'gas' })
    const done = stationView(m, wholeStation(m, createLab('guided'), 'peroxide'), 'peroxide')
    expect(catalystText(done.vessels[0]!.catalyst!)).toBe('Over the arrow: FeCl₃, iron(III) chloride. It sped the reaction and was not used up, so it is on neither side.')
  })

  it('says what kind of thing is wrong with an equation and never what would put it right: no formula, no number, no state', () => {
    const problems: Problem[] = ['no-reaction', 'species-extra', 'species-missing', 'state-wrong', 'not-balanced']
    expect(Object.keys(PROBLEM_TEXT).sort()).toEqual([...problems].sort())
    for (const problem of problems) {
      expect(PROBLEM_TEXT[problem]).not.toMatch(/[A-Z][a-z]?[₀-₉]|\d|\(aq\)|\(s\)|\(g\)|\(l\)|solid|gas\b|liquid|dissolved/)
      expect(PROBLEM_TEXT[problem]).not.toMatch(WHAT_IT_IS)
    }
    // An equation written where nothing reacts is not said to be for a tube where nothing reacts: that would give the kind.
    expect(PROBLEM_TEXT['no-reaction']).not.toMatch(/nothing react|no reaction/i)
  })

  it('writes an order of the metals out, and asks for the most active first', () => {
    expect(orderText(['copper', 'zinc', 'magnesium'])).toBe('copper, then zinc, then magnesium')
    expect(ORDER_TEXT.question).toBe('Put the three metals in order, the most active first.')
  })

  it('has a hint for each thing asked, the same at every station, which says how to think and names nothing of the bench', () => {
    expect(Object.keys(HINT)).toEqual(['observe', 'kind', 'equation', 'order'])
    for (const hint of Object.values(HINT)) {
      expect(hint).not.toMatch(/copper|zinc|magnesium|oxygen|oxide|carbonate|chloride|peroxide|sulfate|iron|coating|white|blue|powder/i)
      expect(hint).not.toMatch(/[A-Z][a-z]?[₀-₉]/)
    }
    expect(HINT_LABEL).toBe('Hint')
  })
})

describe('refusals, and how a station came out', () => {
  it('have a sentence for every reason an action can be refused, none of which says what a vessel shows or which answer is right', () => {
    const said = ALL_BLOCKED.map(blockedText)
    expect(new Set(said).size).toBe(ALL_BLOCKED.length)
    for (const text of said) {
      expect(text).toMatch(/^[A-Z].*\.$/)
      expect(text).not.toMatch(WHAT_IT_IS)
      expect(text).not.toMatch(/red-brown|white|paler|fast|slowly|warmer/)
    }
  })

  it("are the sentences the engine's refusals get, at every point of a careful run and of a careless one in Guided", () => {
    for (const stationId of STATION_IDS) {
      const station = m.stations.find((s) => s.id === stationId)!
      const vessel = station.vessels[0]!
      let state = createLab('guided')
      const tries = (): Action[] => [
        { type: 'act', station: stationId },
        { type: 'look', station: stationId, vessel: vessel.id, at: vessel.looks[0]!.at },
        { type: 'observe', station: stationId, vessel: vessel.id, observation: Object.fromEntries(vessel.asks.map((field) => [field, m.choices[field][0]!])) },
        { type: 'sayKind', station: stationId, vessel: vessel.id, kind: 'none' },
        { type: 'enterEquation', station: stationId, vessel: vessel.id, entry: wrongEntry(m, stationId, vessel.id, 'unbalanced') },
        { type: 'enterEquation', station: stationId, vessel: vessel.id, entry: wrongEntry(m, stationId, vessel.id, 'extra') },
        { type: 'sayOrder', station: stationId, order: ['copper', 'zinc', 'magnesium'] },
        { type: 'checkStation', station: stationId },
        { type: 'workAgain', station: stationId },
      ]
      const seen = new Set<string>()
      const sweep = () => {
        for (const action of tries()) {
          const blocked = can(m, state, action)
          if (blocked === null) continue
          expect(ALL_BLOCKED, `${stationId}: ${blocked}`).toContain(blocked)
          seen.add(blocked)
          expect(blockedText(blocked).length).toBeGreaterThan(10)
        }
      }
      sweep()
      state = reduce(m, state, { type: 'act', station: stationId })
      sweep()
      for (const v of station.vessels) for (const look of v.looks) state = reduce(m, state, { type: 'look', station: stationId, vessel: v.id, at: look.at })
      sweep()
      state = reduce(m, state, { type: 'observe', station: stationId, vessel: vessel.id, observation: Object.fromEntries(vessel.asks.map((field) => [field, vessel.after[field]!])) })
      sweep()
      state = reduce(m, state, { type: 'sayKind', station: stationId, vessel: vessel.id, kind: vessel.kind })
      sweep()
      state = wholeStation(m, createLab('guided'), stationId)
      sweep()
      expect(seen.size, stationId).toBeGreaterThanOrEqual(6)
    }
  })

  it('names each cause a run does not count for, with its vessel, and never what was right', () => {
    expect(reasonText(data, 'metals-in-acid', { kind: 'observation-wrong', vessel: 'zinc' })).toBe('The zinc tube: what was recorded is not what it showed.')
    expect(reasonText(data, 'metals-in-acid', { kind: 'kind-wrong', vessel: 'copper' })).toBe('The copper tube: the kind is not right.')
    expect(reasonText(data, 'magnesium-flame', { kind: 'equation-wrong', vessel: 'strip', problem: 'not-balanced' })).toBe('The strip: the atoms do not balance yet: count each element on both sides.')
    expect(reasonText(data, 'metals-in-acid', { kind: 'order-wrong' })).toBe('The order of the metals is not right.')
  })

  it('says that a station is still open, is to be checked, counts, or does not, and how far each has come', () => {
    expect((['open', 'to-check', 'counts'] as const).map((state) => outcomeText({ state }))).toEqual(['Something is still to be done here.', 'Everything is recorded. Check the station.', 'This station counts.'])
    expect(outcomeText({ state: 'does-not-count', reasons: [] })).toBe('This run does not count. Work the station again.')
    const fresh = createLab('challenge')
    expect(progressOf(stationView(m, fresh, 'peroxide'))).toBe('not-started')
    expect(progressOf(stationView(m, act('peroxide'), 'peroxide'))).toBe('under-way')
    expect(progressOf(stationView(m, wholeStation(m, fresh, 'peroxide', { check: false }), 'peroxide'))).toBe('to-check')
    expect(progressOf(stationView(m, wholeStation(m, fresh, 'peroxide', { wrongKindAt: 'tube' }), 'peroxide'))).toBe('not-counted')
    const done = wholeStation(m, fresh, 'peroxide')
    expect(progressOf(stationView(m, done, 'peroxide'))).toBe('done')
    expect(progressOf(stationView(m, reduce(m, done, { type: 'workAgain', station: 'peroxide' }), 'peroxide'))).toBe('done')
    expect(progressOf(stationView(m, reduce(m, act('peroxide'), { type: 'workAgain', station: 'peroxide' }), 'peroxide'))).toBe('under-way')
    expect(Object.keys(PROGRESS_TEXT)).toEqual(['not-started', 'under-way', 'to-check', 'not-counted', 'done'])
  })
})

describe('the notes and the modes', () => {
  it("hands over a station's notes as the record has them, and says what each mode does", () => {
    for (const id of STATION_IDS) expect(stationNotes(data, id)).toEqual(data.stations.find((s) => s.id === id)!.notes.map((n) => n.value))
    expect(MODE_TEXT.guided).toMatch(/checks each answer as you give it/)
    expect(MODE_TEXT.challenge).toMatch(/checks a station when you ask/)
  })

  it('says in the notes, and only there, what each thing seen was and which kind of reaction it showed', () => {
    const notes = (id: StationId) => stationNotes(data, id).join(' ')
    expect(notes('zinc-copper-sulfate')).toMatch(/coating is copper metal.*single replacement/s)
    expect(notes('magnesium-flame')).toMatch(/magnesium oxide, a white powder.*combination.*nitride/s)
    expect(notes('metals-in-acid')).toMatch(/bubbles are hydrogen.*single replacement, twice.*Copper did nothing.*magnesium, zinc, copper/s)
    expect(notes('two-solutions')).toMatch(/white solid is calcium carbonate.*double replacement/s)
    expect(notes('peroxide')).toMatch(/bubbles are oxygen.*decomposition.*not used up.*catalyst.*gives out heat/s)
  })
})

/** Everything the builder of an equation says of a row, for a tile that stands for any: the words name a place and a tile, and never which belongs where. */
const first = { side: 'reactants', index: 0 } as const
const second = { side: 'products', index: 1 } as const
const builderSaid = [
  BUILDER_TEXT.remove('X'),
  BUILDER_TEXT.alreadyOnSide('X', 'reactants'),
  BUILDER_TEXT.alreadyOnSide('X', 'products'),
  BUILDER_TEXT.slotLabel(first, 2, null, true),
  BUILDER_TEXT.slotLabel(second, null, { formula: 'X', coefficient: 2, state: 's' }, false),
  BUILDER_TEXT.slot.placed('X', first),
  BUILDER_TEXT.slot.replaced('X', second, 'Y'),
  BUILDER_TEXT.slot.exchanged('X', first, 'Y', second),
  BUILDER_TEXT.slot.takenOut('X', 'products'),
  BUILDER_TEXT.slot.coefficient('X', 2),
  BUILDER_TEXT.slot.state('X', 'g'),
  BUILDER_TEXT.slot.term('X', second),
  BUILDER_TEXT.slot.active(first),
]

describe("the builder's words, and the page's own that were added with its screens", () => {
  it('name a place of the row by its number and its side of the arrow, a tile by its formula, and say every change that is made to the row', () => {
    expect(builderSaid).toEqual([
      'Take X out',
      'X is before the arrow already.',
      'X is after the arrow already.',
      'Place 1 of 2 before the arrow, empty, chosen',
      'Place 2 after the arrow: 2 X, solid',
      'X is now in place 1 before the arrow.',
      'X is now in place 2 after the arrow, in place of Y.',
      'X is now in place 1 before the arrow, and Y in place 2 after the arrow.',
      'X is taken out from after the arrow.',
      'X: 2 in front.',
      'X: state (g), gas.',
      'Place 2 after the arrow: X',
      'Place 1 before the arrow is chosen.',
    ])
    expect(BUILDER_TEXT.noReaction).toBeNull()
    expect(BUILDER_TEXT.check).toBe(EQUATION_TEXT.record)
    expect(BUILDER_TEXT.stateName).toBe(STATE_LABEL)
    // How the row is filled, by taps alone: nothing here speaks of dragging, which the builder also takes.
    expect(`${BUILDER_TEXT.slotHelp} ${BUILDER_TEXT.full}`).not.toMatch(/drag/i)
  })

  it('word each of the five kinds for its box with what it means and its pattern, the same at every vessel', () => {
    expect(kindChoices(data).map(kindChoiceLabel)).toEqual([
      'Combination: two things join into one (A + B → AB)',
      'Decomposition: one thing comes apart (AB → A + B)',
      'Single replacement: an element takes the place of another in a compound (A + BC → AC + B)',
      'Double replacement: two compounds trade partners (AB + CD → AD + CB)',
      'No reaction: nothing changed',
    ])
  })

  it('say what to do with a picture and nothing of what it shows, name a picture, and say why two answers for the order cannot be recorded', () => {
    expect(PAGE_TEXT.explore).toBe('Hover over or tap each part of a picture to look at it.')
    expect([PAGE_TEXT.picture('The tube'), PAGE_TEXT.whileBurning, PAGE_TEXT.afterwards, PAGE_TEXT.inWords, PAGE_TEXT.oneAtATime]).toEqual(['The tube, drawn', 'While it burns', 'Afterwards', 'The picture in words', 'One at a time'])
    expect(ORDER_TEXT.sameMetal).toBe('The most active and the least active cannot be the same metal.')
    expect([PAGE_TEXT.previous('A'), PAGE_TEXT.next('B'), KIND_TEXT.record]).toEqual(['Previous: A', 'Next: B', 'Record the kind'])
  })
})

describe('every sentence of the page', () => {
  /** Every fixed string and every sentence a function gives for the cases above, as one list. */
  function sentences(): string[] {
    const flat = (value: unknown): string[] => (typeof value === 'string' ? [value] : value && typeof value === 'object' ? Object.values(value).flatMap(flat) : [])
    const fixed = [LAB_TEXT, STATION_TASK, ACTION_LABEL, ACTION_DONE, BENCH_TEXT, FIELD_LABEL, FIELD_SHORT, OBSERVATION_TEXT, KIND_LABEL, KIND_MEANS, KIND_TEXT, STATE_LABEL, EQUATION_TEXT, BUILDER_TEXT, PROBLEM_TEXT, ORDER_TEXT, HINT, HINT_LABEL, MODE_TEXT, PROGRESS_TEXT, NOTES_TEXT, PAGE_TEXT, RECORD_TEXT, SOURCES_TEXT, WARM_TEXT, METAL_NAME].flatMap(flat)
    const made = [
      ...STATION_IDS.flatMap((id) => [stationName(data, id), stationLetter(data, id), ...benchLines(data, id), ...data.stations.find((s) => s.id === id)!.vessels.map((v) => vesselName(data, id, v.id))]),
      ...pictures.map((p) => vesselText(p.shows)),
      ...(['tube', 'flame'] as const).flatMap((drawn) => LOOKS.flatMap((look) => [lookLabel(drawn, look, false), lookLabel(drawn, look, true)])),
      ...FIELDS.flatMap((field) => [fieldLabel('tube', field), fieldLabel('flame', field), ...data.choices[field].map((choice) => choiceLabel(field, choice)), mismatchText([field]), checkedText([field])]),
      mismatchText(['coating', 'liquid']),
      checkedText([]),
      ...ALL_BLOCKED.map(blockedText),
      ...(['open', 'to-check', 'counts'] as const).map((state) => outcomeText({ state })),
      outcomeText({ state: 'does-not-count', reasons: [] }),
      ...STATION_IDS.flatMap((id) =>
        data.stations
          .find((s) => s.id === id)!
          .vessels.flatMap((v) => [reasonText(data, id, { kind: 'observation-wrong', vessel: v.id }), reasonText(data, id, { kind: 'kind-wrong', vessel: v.id }), reasonText(data, id, { kind: 'equation-wrong', vessel: v.id, problem: 'species-extra' })]),
      ),
      reasonText(data, 'metals-in-acid', { kind: 'order-wrong' }),
      orderText(['magnesium', 'zinc', 'copper']),
      catalystText({ speciesId: 'x', formula: 'X', name: 'a thing' }),
      RECORD_TEXT.run(0),
      ...kindChoices(data).map(kindChoiceLabel),
      PAGE_TEXT.picture('The tube'),
      PAGE_TEXT.previous(stationName(data, 'zinc-copper-sulfate')),
      PAGE_TEXT.next(stationName(data, 'two-solutions')),
      ...builderSaid,
    ]
    return [...new Set([...fixed, ...made])]
  }

  it('is there for every identifier of the engine and of the record', () => {
    expect(sentences().length).toBeGreaterThan(200)
    for (const text of sentences()) expect(text.trim().length, text).toBeGreaterThan(0)
    expect(Object.keys(STATION_TASK)).toEqual([...STATION_IDS])
    expect(Object.keys(ACTION_LABEL)).toEqual([...STATION_IDS])
    expect(Object.keys(ACTION_DONE)).toEqual([...STATION_IDS])
  })

  it('holds no institution text, and names no maker or supplier', () => {
    for (const text of sentences()) {
      expect(findInstitutionText(text, []), text).toBeNull()
      expect(text).not.toMatch(/Flinn|Fisher|Ward|NOAA|Chemguide/)
    }
  })

  it('is short: nothing the page says in one breath runs over 45 words, and no note of the record over 40', () => {
    for (const text of sentences()) expect(text.split(/\s+/).length, text).toBeLessThanOrEqual(45)
    for (const station of data.stations) for (const note of station.notes) expect(note.value.split(/\s+/).length, note.value).toBeLessThanOrEqual(40)
  })

  // No quotation: the fingerprint of the pages is not kept in the repository, and the case is skipped where it is absent (see src/chem-data/reactions/quotation.test.ts).
  type Lib = { unpackHashes(base64: string): Set<number>; quotedRuns(text: string, fingerprint: Set<number>): string[] }
  const [lib] = Object.values(import.meta.glob<Lib>('../../../../scripts/titration-lib.mjs', { eager: true }))
  const [fingerprint] = Object.values(import.meta.glob<{ hashes: string }>('../../../../docs/research/reactions/sources/quotation-fingerprint.json', { eager: true, import: 'default' }))
  it.skipIf(fingerprint === undefined)('repeats no run of six words of a page the lab rests on (skipped where the fingerprint is absent: it is not kept in the repository)', () => {
    const pages = lib!.unpackHashes(fingerprint!.hashes)
    for (const text of sentences()) expect(lib!.quotedRuns(text, pages), text).toEqual([])
  })
})
