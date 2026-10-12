import { describe, expect, it } from 'vitest'
import { findInstitutionText } from '@/chem-data/denylist'
import { hotcoldData as data, PART_IDS, SALT_IDS, type SaltId } from '@/chem-data/hotcold/data'
import { CHOICES, FIELDS, QUESTIONS, can, createLab, isChoice, modelFrom, packsView, reduce, runOutcome, runView, currentRun, type Action, type Blocked, type HotcoldState, type Mode, type Reason } from '@/engine/hotcold'
import { entryActions, looks, notebookValues, run, wholeLab, wholeRun, workCup } from '@/engine/hotcold/testkit'
import {
  BENCH_TEXT,
  CHOICE_LABEL,
  FIELD_LABEL,
  HINT_TEXT,
  MODE_TEXT,
  PACKS_TEXT,
  PAGE_TEXT,
  PART_AIM,
  PROGRESS_TEXT,
  QUESTION_TEXT,
  RECORD_TEXT,
  SOURCES_TEXT,
  VERDICT_TEXT,
  WARNING_BUTTONS,
  WARNING_TEXT,
  addLabel,
  benchLines,
  blockedText,
  choicesOf,
  cupText,
  describeGraph,
  enteredText,
  entryFeedback,
  entryText,
  foldedText,
  formatHelp,
  massText,
  outcomeText,
  packsProgressOf,
  partNotes,
  partTitle,
  pointCallout,
  pointLabel,
  progressOf,
  reasonText,
  saltChoices,
  saltName,
  temperatureText,
  timeText,
} from './messages'

const m = modelFrom(data)
const lab = (mode: Mode = 'guided', seed = 1) => createLab(seed, mode)
const [E, C] = SALT_IDS
/** Which way a salt's temperature goes, in any of the words a page might say it with. */
const WAY = /exothermic|endothermic|warmer|colder|warms|cools|heat out|heat in|gives out|takes in|\bhot\b|\bcold\b|rise|rose|fall|fell|drop|climb|kJ/i

describe('figures', () => {
  it('writes a temperature, a mass and a time as the bench shows them', () => {
    expect([temperatureText(214), temperatureText(-5), massText(1002), massText(380)]).toEqual(['21.4 °C', '−0.5 °C', '10.02 g', '3.80 g'])
    expect([0, 1, 2, 4, 6].map((step) => timeText(m, step))).toEqual(['0 s', '15 s', '30 s', '1 min', '1 min 30 s'])
    expect([pointCallout(m, 3, 198), pointLabel(m, 3, false), pointLabel(m, 3, true)]).toEqual(['45 s: 19.8 °C', 'Look at the reading at 45 s', 'Look at the reading at 45 s, looked at'])
    expect([entryText(225), entryText(-27), enteredText('change', 27), enteredText('heat', 'in'), enteredText('word', 'exothermic'), enteredText('temperature', 'colder')]).toEqual(['22.5', '−2.7', '2.7', 'took heat in', 'exothermic', 'colder'])
  })
})

describe('the parts and the bench', () => {
  it('titles the three parts, and says what each finds without a word of which way a temperature goes', () => {
    expect(PART_IDS.map((part) => partTitle(data, part))).toEqual(['Part 1: Epsom salt in water', 'Part 2: Calcium chloride in water', 'Part 3: Hot pack and cold pack'])
    for (const part of SALT_IDS) expect(PART_AIM[part], part).not.toMatch(WAY)
    expect(PART_AIM.packs).toMatch(/warms.*cools/)
  })

  it('names each salt for what it is on the bench, with what the balance reads, and says the same of both but for the name and the mass', () => {
    expect(benchLines(data, E, { balanceCg: 1002 })).toEqual([
      'A foam cup with a lid, a stirrer and a temperature probe. The logger shows the probe to 0.1 °C.',
      '50.0 mL of distilled water, in the cup.',
      'Epsom salt (magnesium sulfate heptahydrate), a white solid, weighed out: the balance reads 10.02 g.',
    ])
    expect(benchLines(data, C, { balanceCg: 401 })[2]).toBe('Calcium chloride (calcium chloride, anhydrous), a white solid, weighed out: the balance reads 4.01 g.')
    expect([saltName(data, E), saltName(data, C), addLabel(data, E), addLabel(data, C)]).toEqual(['Epsom salt', 'calcium chloride', 'Add the Epsom salt', 'Add the calcium chloride'])
    for (const salt of SALT_IDS) for (const line of benchLines(data, salt, { balanceCg: 500 })) expect(line).not.toMatch(WAY)
  })

  it('says the cup in words at each stage, and never what the temperature does', () => {
    const fresh = runView(m, lab(), E).cup
    expect(cupText(data, E, fresh, 0)).toBe('The cup holds the water. The Epsom salt has not been added. The lid is off. The stirrer is still. The logger has not been started.')
    const worked = runView(m, workCup(m, lab(), C), C)
    expect(cupText(data, C, worked.cup, 1)).toBe('The calcium chloride is in the water. The lid is on. The stirrer is going. The logger is running: one reading so far.')
    expect(cupText(data, C, worked.cup, worked.graph.readings.length)).toContain(`${worked.graph.readings.length} readings so far`)
    expect(cupText(data, C, worked.cup, 5)).not.toMatch(WAY)
    expect(foldedText(data, C, worked)).toEqual({ bench: `Calcium chloride: ${massText(worked.bench.balanceCg)}, in 50.0 mL of water.`, cup: 'The calcium chloride is in. Lid on, stirrer going.' })
    expect(foldedText(data, E, runView(m, workCup(m, lab('challenge'), E, { lid: false, stir: false }), E)).cup).toBe('The Epsom salt is in. Lid off, stirrer still.')
  })
})

describe('the graph in words', () => {
  const at = (state: HotcoldState, salt: SaltId) => describeGraph(m, runView(m, state, salt).graph)
  const go = (state: HotcoldState, ...actions: Action['type'][]) => run(m, state, actions.map((type) => ({ type, part: E }) as Action))

  it('says what the logger has drawn so far, stage by stage, and nothing of what it will draw', () => {
    expect(at(lab(), E)).toBe('The logger has not been started, and the graph is empty.')
    const started = go(lab(), 'putLidOn', 'stir', 'startLogger')
    expect(at(started, E)).toMatch(/There is one reading: 22\.5 °C at 0 s\. The salt has not been added\.$/)
    const level = go(started, 'runOn')
    expect(at(level, E)).toMatch(/The readings are level at 22\.5 °C, from 0 s to 30 s\. The salt has not been added\.$/)
    const added = go(level, 'addSalt')
    expect(at(added, E)).toMatch(/until the salt is added, just after the reading at 30 s\. No reading has been taken since\.$/)
    expect(at(go(added, 'runOn'), E)).toMatch(/They then fall, to 19\.8 °C at 1 min, the latest reading\. The curve has not turned back yet\.$/)
    const turned = workCup(m, lab(), E)
    expect(at(turned, E)).toMatch(/They then fall to a lowest reading of 19\.8 °C, first reached at 1 min, and after it drift slowly back: the latest reading, at 2 min 30 s, is 19\.9 °C\.$/)
    expect(at(workCup(m, lab(), C), C)).toMatch(/They then rise to a highest reading of 34\.9 °C, first reached at 1 min 15 s, and after it drift slowly back/)
  })
})

describe('the notebook', () => {
  it('labels its six entries, the second for the highest or the lowest whichever the graph shows, and gives each choice its words', () => {
    expect(FIELDS.map((field) => FIELD_LABEL[field])).toEqual(['Starting temperature, in °C', 'Highest or lowest temperature reached, in °C', 'Change in temperature, as a size, in °C', 'The water got', 'The dissolving', 'This change is'])
    expect(choicesOf('temperature')).toEqual([{ value: 'warmer', label: 'warmer' }, { value: 'colder', label: 'colder' }])
    expect(choicesOf('heat')).toEqual([{ value: 'out', label: 'gave heat out' }, { value: 'in', label: 'took heat in' }])
    expect(choicesOf('word')).toEqual([{ value: 'exothermic', label: 'exothermic' }, { value: 'endothermic', label: 'endothermic' }])
    for (const field of FIELDS) if (isChoice(field)) expect(Object.keys(CHOICE_LABEL[field])).toEqual([...CHOICES[field]])
  })

  it('says how each entry is made, with no example that a run can have, and has a hint for each that gives no figure and names no salt', () => {
    expect(FIELDS.map(formatHelp)).toEqual(['One decimal place, as the logger shows it: 18.6', 'One decimal place, as the logger shows it: 18.6', 'One decimal place: 3.5', 'Choose one.', 'Choose one.', 'Choose one.'])
    // No run starts under 20.0 °C, and no run changes by 3.5 °C: Epsom salt's is under 3 and calcium chloride's over 11.
    expect(m.startRangeTenths[0]).toBeGreaterThan(186)
    for (const field of FIELDS) {
      expect(HINT_TEXT[field], field).not.toMatch(/\d|Epsom|calcium|chloride/i)
      expect(HINT_TEXT[field].split(/\s+/).length, field).toBeLessThanOrEqual(40)
    }
    // A hint teaches both ways round, so that it gives no answer.
    expect(HINT_TEXT.word).toBe('A change that gives heat out is exothermic. A change that takes heat in is endothermic.')
    expect(HINT_TEXT.heat).toMatch(/gains heat gets warmer.*loses heat gets colder/)
  })

  it('says of an entry that does not follow that it does not, and never what it should have been', () => {
    for (const field of FIELDS) {
      const said = entryFeedback(field, { follows: false, slip: null })
      expect(said.length, field).toBeGreaterThan(20)
      expect(said, field).not.toMatch(/\d|exothermic|endothermic|warmer|colder|gave heat|took heat/)
      expect(entryFeedback(field, { follows: true, slip: null })).toBe('')
    }
    expect(entryFeedback('change', { follows: false, slip: 'wrong-sign' })).toMatch(/^The size is right and the sign is not\./)
    expect(VERDICT_TEXT).toEqual({ follows: 'Follows', not: 'Does not follow' })
  })
})

describe('warnings, refusals and outcomes', () => {
  it("words Guided's two warnings, each saying that such a run does not count and what to do first", () => {
    for (const warning of ['lid-off', 'not-stirring'] as const) {
      expect(WARNING_TEXT[warning].body).toContain('A run started this way does not count.')
      expect(WARNING_TEXT[warning].body).toMatch(/ first\.$/)
      expect(`${WARNING_TEXT[warning].title} ${WARNING_TEXT[warning].body}`).not.toMatch(/loses heat|warmer|colder|exothermic|endothermic/)
    }
    expect(WARNING_BUTTONS).toEqual({ back: 'Go back', on: 'Add the salt anyway' })
  })

  it('has a sentence for every reason an action can be refused, none of which gives an entry or an answer', () => {
    const all: Blocked[] = ['lab-completed', 'unknown-part', 'already-done', 'logger-not-started', 'salt-not-added', 'logger-full', 'notebook-begun', 'run-over', 'nothing-there', 'not-turned', 'not-looked', 'entry-above-missing', 'invalid-entry', 'notebook-not-full', 'nothing-to-repeat', 'runs-not-done', 'not-a-question', 'not-a-salt', 'packs-checked', 'packs-not-answered', 'nothing-to-answer-again', 'not-the-logger', 'does-not-follow', 'not-right', 'wrong-sign']
    for (const blocked of all) {
      for (const field of [undefined, ...FIELDS]) {
        const said = blockedText(data, E, blocked, field)
        expect(said.length, blocked).toBeGreaterThan(10)
        expect(said, blocked).not.toMatch(/\d\.\d °C|exothermic|endothermic|warmer|colder|gave heat|took heat/)
      }
    }
    expect(blockedText(data, E, 'salt-not-added')).toBe('The notebook opens once the salt is in and the curve has turned back. Add the Epsom salt first.')
    expect(blockedText(data, null, 'runs-not-done')).toBe('Part 3 opens once a run of each salt counts: its two questions are answered from what your two cups showed.')
    expect(blockedText(data, E, 'not-looked', 'start')).toBe('Look at a reading before the salt was added first.')
    expect(blockedText(data, E, 'invalid-entry', 'word')).toBe('Choose one.')
    expect(blockedText(data, E, 'invalid-entry', 'start')).toBe('That is not written as this entry is. One decimal place, as the logger shows it: 18.6')
  })

  it("are the sentences the engine's refusals get, at the points of a run where each first comes up", () => {
    const refusal = (state: HotcoldState, action: Action) => {
      const blocked = can(m, state, action)
      return blocked === null ? null : blockedText(data, E, blocked, action.type === 'enter' ? action.field : undefined)
    }
    expect(refusal(lab(), { type: 'addSalt', part: E })).toBe('Start the logger first.')
    const cup = workCup(m, lab(), E)
    expect(refusal(cup, { type: 'enter', part: E, field: 'start', value: 225 })).toBe('Look at a reading before the salt was added first.')
    const looked = run(m, cup, looks(m, cup, E))
    expect(refusal(looked, { type: 'enter', part: E, field: 'start', value: 224 })).toMatch(/^That is not the temperature the logger shows before the salt was added\./)
    const values = notebookValues(m, looked, E)
    const three = run(m, looked, entryActions(E, values).slice(0, 3))
    expect(refusal(three, { type: 'enter', part: E, field: 'temperature', value: 'warmer' })).toBe('That does not fit the two temperatures you entered. Which is the higher?')
    expect(refusal(three, { type: 'runOn', part: E })).toMatch(/^The notebook is begun, so the cup is left as it is\./)
  })

  it('names each cause a run does not count for, and says to run the part again only while it can be', () => {
    const reasons: Reason[] = ['lid-off', 'not-stirred', 'start-not-shown', 'extreme-not-shown', 'entries-do-not-follow']
    for (const reason of reasons) expect(reasonText(reason).length, reason).toBeGreaterThan(30)
    expect(reasonText('lid-off')).toMatch(/traded heat with the room/)
    const careful = wholeRun(m, lab('challenge'), E)
    expect(outcomeText(runOutcome(m, careful, E, currentRun(careful, E)))).toBe("This run counts: its temperatures are the logger's, every entry follows, and the lid was on and the cup stirred from the moment the salt went in.")
    const open = wholeRun(m, lab('challenge'), E, { lid: false, slip: 'wrong-word' })
    const said = outcomeText(runOutcome(m, open, E, currentRun(open, E)))
    expect(said).toBe(`This run does not count. ${reasonText('lid-off')} ${reasonText('entries-do-not-follow')} The notebook marks which. Run this part again: the lab sets it up with new numbers.`)
    expect(outcomeText(runOutcome(m, open, E, currentRun(open, E)), false)).not.toContain('Run this part again')
    expect(outcomeText({ state: 'open' })).toBe('')
    // No outcome says which way the temperature went.
    for (const text of [said, ...reasons.map(reasonText)]) expect(text).not.toMatch(/exothermic|endothermic|warmer|colder|rise|fall/)
  })

  it('says how far each part has come', () => {
    expect(progressOf(runView(m, lab(), E))).toBe('not-started')
    expect(progressOf(runView(m, run(m, lab(), [{ type: 'stir', part: E }]), E))).toBe('cup')
    const cup = workCup(m, lab('challenge'), E)
    expect(progressOf(runView(m, run(m, cup, [...looks(m, cup, E), entryActions(E, notebookValues(m, cup, E))[0]!]), E))).toBe('notebook')
    expect(progressOf(runView(m, wholeRun(m, lab('challenge'), E, { stir: false }), E))).toBe('not-counted')
    expect(progressOf(runView(m, wholeRun(m, lab(), E), E))).toBe('done')
    expect(packsProgressOf(packsView(m, lab()))).toBe('waiting')
    const both = SALT_IDS.reduce((state, salt) => wholeRun(m, state, salt), lab('challenge'))
    expect(packsProgressOf(packsView(m, both))).toBe('not-started')
    const one = run(m, both, [{ type: 'answer', question: 'warms', salt: E }])
    expect(packsProgressOf(packsView(m, one))).toBe('answers')
    expect(packsProgressOf(packsView(m, run(m, one, [{ type: 'answer', question: 'cools', salt: E }, { type: 'checkPacks' }])))).toBe('not-right')
    expect(packsProgressOf(packsView(m, wholeLab(m, lab())))).toBe('done')
    for (const text of Object.values(PROGRESS_TEXT)) expect(text.length).toBeGreaterThan(3)
  })
})

describe('part 3', () => {
  it('asks its two questions of the two salts, by name', () => {
    expect(QUESTIONS.map((question) => QUESTION_TEXT[question])).toEqual(['For a pack that warms, the salt to use is', 'For a pack that cools, the salt to use is'])
    expect(saltChoices(data)).toEqual([{ value: 'epsom-salt', label: 'Epsom salt' }, { value: 'calcium-chloride', label: 'calcium chloride' }])
    // What is said of an answer that is not right gives none.
    for (const text of [PACKS_TEXT.notRightHelp, PACKS_TEXT.missed, PACKS_TEXT.hint, blockedText(data, null, 'not-right')]) expect(text).not.toMatch(/Epsom|calcium/)
  })

  it('hands over the notes of each part as the record has them', () => {
    for (const part of PART_IDS) expect(partNotes(data, part)).toEqual(data.parts[PART_IDS.indexOf(part)]!.notes.map((note) => note.value))
  })
})

describe('every sentence of the page', () => {
  /** Every fixed string and every sentence a function gives for the cases above, as one list. */
  function sentences(): string[] {
    const fixed = [PART_AIM, FIELD_LABEL, HINT_TEXT, VERDICT_TEXT, WARNING_BUTTONS, QUESTION_TEXT, PACKS_TEXT, MODE_TEXT, PROGRESS_TEXT]
    const groups = [BENCH_TEXT, PAGE_TEXT, RECORD_TEXT]
    const done = wholeLab(m, lab())
    const blocked: Blocked[] = ['lab-completed', 'unknown-part', 'already-done', 'logger-not-started', 'salt-not-added', 'logger-full', 'notebook-begun', 'run-over', 'nothing-there', 'not-turned', 'not-looked', 'entry-above-missing', 'invalid-entry', 'notebook-not-full', 'nothing-to-repeat', 'runs-not-done', 'not-a-salt', 'packs-checked', 'packs-not-answered', 'nothing-to-answer-again', 'not-the-logger', 'does-not-follow', 'not-right', 'wrong-sign']
    return [
      ...fixed.flatMap((group) => Object.values(group)),
      ...groups.flatMap((group) => Object.values(group).map((value: string | ((m: never) => string)) => (typeof value === 'string' ? value : (value as (x: unknown) => string)(value.length === 1 && group === BENCH_TEXT ? m : group === RECORD_TEXT ? 2 : 'Part 2: Calcium chloride in water')))),
      ...Object.values(WARNING_TEXT).flatMap((warning) => [warning.title, warning.body]),
      ...Object.values(CHOICE_LABEL).flatMap((labels) => Object.values(labels)),
      ...PART_IDS.flatMap((part) => [partTitle(data, part), ...partNotes(data, part)]),
      ...SALT_IDS.flatMap((salt) => [...benchLines(data, salt, runView(m, done, salt).bench), addLabel(data, salt), cupText(data, salt, runView(m, done, salt).cup, 9), cupText(data, salt, runView(m, lab(), salt).cup, 0), ...Object.values(foldedText(data, salt, runView(m, done, salt))), describeGraph(m, runView(m, done, salt).graph), describeGraph(m, runView(m, lab(), salt).graph)]),
      ...blocked.flatMap((one) => [undefined, ...FIELDS].map((field) => blockedText(data, E, one, field))),
      ...FIELDS.flatMap((field) => [formatHelp(field), entryFeedback(field, { follows: false, slip: null })]),
      ...(['lid-off', 'not-stirred', 'start-not-shown', 'extreme-not-shown', 'entries-do-not-follow'] as Reason[]).map(reasonText),
      outcomeText({ state: 'counts' }),
      SOURCES_TEXT,
    ]
  }

  it('is there: over a hundred and fifty of them, none empty', () => {
    expect(new Set(sentences()).size).toBeGreaterThan(150)
    for (const text of sentences()) expect(text.trim().length, text).toBeGreaterThan(0)
  })

  it('names no maker, supplier or site, and holds no institution text', () => {
    for (const text of sentences()) {
      expect(text).not.toMatch(/flinn|fisher|purdue|nasa|chemguide|wikipedia|cameo|noaa|nist\b/i)
      expect(findInstitutionText(text, []), text).toBeNull()
    }
  })

  it('is short and plain: no sentence of the page that is not a note of the record or the graph in words is over 45 words', () => {
    const long = new Set([...PART_IDS.flatMap((part) => partNotes(data, part)), ...SALT_IDS.map((salt) => describeGraph(m, runView(m, wholeLab(m, lab()), salt).graph))])
    for (const text of sentences()) if (!long.has(text)) expect(text.split(/\s+/).length, text).toBeLessThanOrEqual(45)
  })

  it("says which way a salt's temperature goes only in the notes of the record and in the graph in words, each of which a page keeps back or closed", () => {
    const kept = new Set([...PART_IDS.flatMap((part) => partNotes(data, part)), ...SALT_IDS.map((salt) => describeGraph(m, runView(m, wholeLab(m, lab()), salt).graph))])
    for (const text of sentences()) {
      if (kept.has(text)) continue
      // A sentence that names a salt says nothing of heat or of warm and cold; one that speaks of them names no salt.
      if (/Epsom|calcium chloride/i.test(text)) expect(text, text).not.toMatch(WAY)
    }
  })

  // No quotation: the fingerprint of the pages is not kept in the repository, and the case is skipped where it is absent (see src/chem-data/hotcold/quotation.test.ts).
  type Lib = { unpackHashes(base64: string): Set<number>; quotedRuns(text: string, fingerprint: Set<number>): string[] }
  const [lib] = Object.values(import.meta.glob<Lib>('../../../../scripts/titration-lib.mjs', { eager: true }))
  const [fingerprint] = Object.values(import.meta.glob<{ hashes: string }>('../../../../docs/research/hotcold/sources/quotation-fingerprint.json', { eager: true, import: 'default' }))
  it.skipIf(fingerprint === undefined)('repeats no run of six words of a page the lab rests on (skipped where the fingerprint is absent)', () => {
    const pages = lib!.unpackHashes(fingerprint!.hashes)
    for (const text of sentences()) expect(lib!.quotedRuns(text, pages), text).toEqual([])
  })
})

// A reducer that changes nothing hands back the same lab: the page saves only what changed.
describe('the page and the engine', () => {
  it('agree on what a refused action leaves: the very same state', () => {
    const state = lab()
    expect(reduce(m, state, { type: 'addSalt', part: E })).toBe(state)
  })
})
