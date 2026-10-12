import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ACTIVITIES, HOTCOLD_PROGRESS } from '@/app/activities'
import { SHELL_TEXT } from '@/app/lab/shellText'
import { labProgress } from '@/app/lab/useLabProgress'
import { createMemoryStore, type KeyValueStore } from '@/app/progress/storage'
import { hotcoldCitations } from '@/chem-data/citations'
import { hotcoldData as data, PART_IDS, SALT_IDS, type PartId, type SaltId } from '@/chem-data/hotcold/data'
import { HOTCOLD_PRIMER, READ_FIRST } from '@/chem-data/hotcold/primer'
import sources from '@/chem-data/sources.json'
import { FIELDS, can, createLab, formatTenths, hotcoldStateSchema, modelFrom, reduce, runView, warnings, type Action, type HotcoldState, type Mode } from '@/engine/hotcold'
import { entryActions, looks, notebookValues, run, wholeLab, wholeRun, workCup } from '@/engine/hotcold/testkit'
import { HotcoldBench, openingPart } from './HotcoldBench'
import { HotcoldPage } from './HotcoldPage'
import { HotcoldRecord } from './HotcoldRecord'
import { BENCH_TEXT, CHOICE_LABEL, FIELD_LABEL, HINT_TEXT, MODE_TEXT, PACKS_TEXT, PAGE_TEXT, PART_AIM, PROGRESS_TEXT, QUESTION_TEXT, RECORD_TEXT, SOURCES_TEXT, addLabel, benchLines, blockedText, cupText, describeGraph, foldedText, outcomeText, partNotes, partTitle, reasonText } from './messages'

// The endothermic and exothermic lab's page as markup, on a store the test holds. AppStateProvider builds its store
// from the browser and the media hook has no value on a server, so both are given directly. What a press does (a
// button of the cup, Guided's warning, Run on, a look at a reading, an entry, the check, Run this part again) is
// state, and is checked in a browser: a markup render mounts the page and no more.
const app = vi.hoisted(() => ({ store: undefined as unknown as KeyValueStore, persistent: true, wide: true }))
vi.mock('@/app/AppState', () => ({ useAppState: () => ({ store: app.store, persistent: app.persistent, reducedMotion: false }) }))
vi.mock('@/app/useMediaQuery', () => ({ useMediaQuery: () => app.wide }))

const hotcold = ACTIVITIES[13]
const m = modelFrom(data)
const SCHEMA = hotcoldStateSchema(m)
const draw = (element: ReactElement) => renderToStaticMarkup(createElement(MemoryRouter, null, element))
const escaped = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;')
const count = (html: string, pattern: RegExp) => [...html.matchAll(pattern)].length
const text = (html: string) => html.replace(/<[^>]+>/g, '')
const selectedTab = (html: string) => [...html.matchAll(/<button[^>]*role="tab"[^>]*>([^<]*)<\/button>/g)].filter((match) => match[0].includes('aria-selected="true"')).map((match) => match[1])
/** Every button, by its opening tag and its text. */
const buttons = (html: string) => [...html.matchAll(/<button([^>]*)>(.*?)<\/button>/gs)].map(([, tag, body]) => ({ tag: tag!, name: text(body!) }))
const button = (html: string, name: string) => buttons(html).find((one) => one.name === name)

const [E, C] = SALT_IDS
const fresh = (mode: Mode = 'guided', seed = 1) => createLab(seed, mode)
/** A careful cup worked until its curve has turned back; then the looks that open the two temperatures. */
const worked = (part: SaltId, mode?: Mode) => workCup(m, fresh(mode), part)
const looked = (part: SaltId, mode?: Mode) => {
  const state = worked(part, mode)
  return run(m, state, looks(m, state, part))
}
/** The first `made` entries of a careful notebook. */
const entered = (part: SaltId, made: number, mode?: Mode) => {
  const state = looked(part, mode)
  return run(m, state, entryActions(part, notebookValues(m, state, part)).slice(0, made))
}
const both = (mode?: Mode) => SALT_IDS.reduce((state, salt) => wholeRun(m, state, salt), fresh(mode))

/** The Lab tab's bench on a state, opened at a part, and that part's own markup: the one that is not hidden. */
function bench(state: HotcoldState, at: PartId = E, reducedMotion = false) {
  const html = draw(createElement(HotcoldBench, { data, m, sources, state, reducedMotion, can: (action: Action) => can(m, state, action), warn: (action: Action) => warnings(m, state, action), act: (action: Action) => void reduce(m, state, action), opensAt: PART_IDS.indexOf(at) }))
  const shown = html
    .split(/(?=<div(?: hidden="")?><section aria-labelledby=)/)
    .slice(1)
    .filter((one) => !one.startsWith('<div hidden'))
  return { html, part: shown[0]!.split('<div class="flex flex-wrap justify-between gap-2">')[0]! }
}
const CARD = /(?=<section aria-labelledby="[^"]+" class="grid min-w-0 justify-items-start)/
/** The cards of a part, by their h3; and one of them. */
const cards = (part: string) => [...part.matchAll(/<h3[^>]*>(.*?)<\/h3>/g)].map((match) => match[1])
const card = (part: string, heading: string) => part.split(CARD).find((one) => one.includes(`>${heading}</h3>`))!
/** The summaries of the closed disclosures of a stretch of markup. */
const summaries = (html: string) => [...html.matchAll(/<summary[^>]*>(.*?)<\/summary>/g)].map((match) => text(match[1]!))

beforeEach(() => {
  app.store = createMemoryStore()
  app.persistent = true
  app.wide = true
})

describe('the endothermic and exothermic page', () => {
  it("with nothing stored opens on the Primer tab with its six cards, four of them marked to read first, the mode choice in this lab's own words, and Start; and stores nothing", () => {
    const html = draw(createElement(HotcoldPage))
    expect(html).toContain('>Endothermic and exothermic</h1>')
    expect(selectedTab(html)).toEqual(['Primer'])
    expect(HOTCOLD_PRIMER).toHaveLength(6)
    for (const section of HOTCOLD_PRIMER) expect(html).toContain(`>${escaped(section.heading)}<`)
    expect(count(html, />Read first<\/span>/g)).toBe(READ_FIRST.length + 1)
    expect(html).toContain(escaped(MODE_TEXT.guided))
    expect(html).toContain(escaped(MODE_TEXT.challenge))
    expect(button(html, SHELL_TEXT.start)).toBeDefined()
    expect(app.store.length).toBe(0)
    expect({ entry: hotcold.entry, version: hotcold.version }).toEqual(HOTCOLD_PROGRESS)
  })

  it('with a lab stored opens on the Lab tab, on the part the learner was in the middle of, with its cup, its graph and its entries as stored', () => {
    const state = entered(C, 3)
    labProgress(app.store, hotcold, SCHEMA).save(state)
    const html = draw(createElement(HotcoldPage))
    expect(selectedTab(html)).toEqual(['Lab'])
    expect(html).toContain(`>${partTitle(data, C)}</h2>`)
    expect(html).not.toContain(`>${partTitle(data, E)}</h2>`)
    expect(html).toContain(escaped(PAGE_TEXT.order))
    expect(count(html, /<button[^>]*data-part="\d+"/g)).toBe(runView(m, state, C).graph.readings.length)
  })

  it('opens on the first part begun and not done, else the first not done that can be worked: never on part 3 while it waits', () => {
    expect(openingPart(['not-started', 'not-started', 'waiting'])).toBe(0)
    expect(openingPart(['not-started', 'cup', 'waiting'])).toBe(1)
    expect(openingPart(['done', 'not-started', 'waiting'])).toBe(1)
    expect(openingPart(['done', 'done', 'not-started'])).toBe(2)
    expect(openingPart(['done', 'done', 'done'])).toBe(0)
  })
})

describe('a run, card by card', () => {
  it('shows the bench and the cup from the start; the graph once the logger is started; and the bench with the balance and the salt under its own name and formula, with its hazards closed', () => {
    const start = bench(fresh()).part
    expect(cards(start)).toEqual([BENCH_TEXT.bench, BENCH_TEXT.cup])
    expect(start).toContain(`>${partTitle(data, E)}</h2>`)
    expect(start).toContain(escaped(PART_AIM[E]))
    for (const line of benchLines(data, E, runView(m, fresh(), E).bench)) expect(start).toContain(escaped(line))
    expect(card(start, BENCH_TEXT.bench)).toMatch(/<h4[^>]*>Epsom salt <span[^>]*>MgSO₄·7H₂O<\/span><\/h4>/)
    expect(summaries(card(start, BENCH_TEXT.bench))).toEqual(['Hazards', 'Sources'])
    expect(card(start, BENCH_TEXT.cup)).toContain(escaped(cupText(data, E, runView(m, fresh(), E).cup, 0)))
    expect(['Put the lid on', 'Stir', 'Start the logger', addLabel(data, E)].map((name) => button(start, name) !== undefined)).toEqual([true, true, true, true])
    const started = bench(run(m, fresh(), [{ type: 'startLogger', part: E }])).part
    expect(cards(started)).toEqual([BENCH_TEXT.bench, BENCH_TEXT.cup, BENCH_TEXT.graph])
    expect(button(card(started, BENCH_TEXT.graph), BENCH_TEXT.runOn)).toBeDefined()
    expect(card(started, BENCH_TEXT.graph)).toContain(escaped(BENCH_TEXT.runOnHelp(m)))
  })

  it('draws the cup on the shared foam cup, the same for either salt, with nothing in it that says what the temperature does; the stirrer bobs only where motion is allowed', () => {
    const stirring = (salt: SaltId, reducedMotion: boolean) => /<svg viewBox="0 0 280 196" aria-hidden="true".*?<\/svg>/s.exec(bench(run(m, fresh(), [{ type: 'stir', part: salt }]), salt, reducedMotion).part)![0]
    expect(stirring(E, false)).toContain('class="cal-stir"')
    expect(stirring(E, true)).not.toContain('cal-stir')
    expect(stirring(E, true)).toContain('data-stirring')
    expect(stirring(E, false)).toBe(stirring(C, false))
    expect(stirring(E, false)).toContain('data-waiting')
    const added = /<svg viewBox="0 0 280 196" aria-hidden="true".*?<\/svg>/s.exec(bench(worked(E), E).part)![0]
    expect(added).not.toContain('data-waiting')
    expect(added).toBe(/<svg viewBox="0 0 280 196" aria-hidden="true".*?<\/svg>/s.exec(bench(worked(C), C).part)![0])
  })

  it('folds the bench and the cup, each under one line, once the salt is in: the notebook and how the run stands come under the graph', () => {
    const state = run(m, fresh(), [{ type: 'putLidOn', part: E }, { type: 'stir', part: E }, { type: 'startLogger', part: E }, { type: 'addSalt', part: E }])
    const part = bench(state).part
    expect(cards(part)).toEqual([BENCH_TEXT.bench, BENCH_TEXT.cup, BENCH_TEXT.graph, BENCH_TEXT.notebook, PAGE_TEXT.outcome])
    const folded = foldedText(data, E, runView(m, state, E))
    expect(summaries(card(part, BENCH_TEXT.bench))[0]).toBe(folded.bench)
    expect(summaries(card(part, BENCH_TEXT.cup))[0]).toBe(folded.cup)
    // Everything the cards held is still in them, closed: no <details> of the two is open.
    expect(card(part, BENCH_TEXT.cup)).toContain(escaped(cupText(data, E, runView(m, state, E).cup, 1)))
    expect(`${card(part, BENCH_TEXT.bench)}${card(part, BENCH_TEXT.cup)}`).not.toMatch(/<details open/)
    // The notebook says what opens it until the curve has turned back.
    expect(card(part, BENCH_TEXT.notebook)).toContain(escaped(blockedText(data, E, 'not-turned')))
    expect(card(part, PAGE_TEXT.outcome)).toContain(RECORD_TEXT.open)
  })

  it('asks the six entries one at a time once the curve has turned back, the three that are choices as choice boxes, and has a hint in Guided and none in Challenge', () => {
    const waiting = card(bench(looked(E)).part, BENCH_TEXT.notebook)
    for (const field of FIELDS) expect(waiting).toContain(escaped(FIELD_LABEL[field]))
    expect(count(waiting, /<input /g)).toBe(1)
    expect(summaries(waiting)).toEqual([BENCH_TEXT.hint])
    expect(waiting).toContain(escaped(HINT_TEXT.start))
    const choice = card(bench(entered(E, 3)).part, BENCH_TEXT.notebook)
    expect(count(choice, /<input [^>]*type="radio"/g)).toBe(2)
    for (const label of Object.values(CHOICE_LABEL.temperature)) expect(choice).toContain(`>${label}<`)
    expect(choice).toContain(escaped(HINT_TEXT.temperature))
    // Room over the hint of an entry that is chosen: open, its hit area reaches up from its line, toward the Enter button over it.
    expect(choice).toContain('<div class="pt-3"><details>')
    const challenge = card(bench(entered(E, 3, 'challenge')).part, BENCH_TEXT.notebook)
    expect(summaries(challenge)).toEqual([])
    for (const hint of Object.values(HINT_TEXT)) expect(challenge).not.toContain(escaped(hint))
    expect(button(challenge, BENCH_TEXT.check)).toBeDefined()
  })

  it('says how a checked run came out, and keeps the notes of the part closed under it once a run counts and not before', () => {
    const missed = wholeRun(m, fresh('challenge'), E, { lid: false })
    const not = bench(missed).part
    expect(card(not, PAGE_TEXT.outcome)).toContain(escaped(outcomeText(runView(m, missed, E).outcome)))
    expect(not).not.toContain(BENCH_TEXT.notes)
    for (const note of partNotes(data, E)) expect(not).not.toContain(escaped(note))
    expect(text(not)).toContain(PROGRESS_TEXT['not-counted'])
    const counted = bench(wholeRun(m, fresh('challenge'), E)).part
    expect(card(counted, PAGE_TEXT.outcome)).toContain(escaped(outcomeText({ state: 'counts' })))
    // The notes, closed, and after them the part's Sources, which stand under the last card.
    expect(summaries(card(counted, PAGE_TEXT.outcome))).toEqual([BENCH_TEXT.notes, 'Sources'])
    for (const note of partNotes(data, E)) expect(counted).toContain(escaped(note))
    expect(counted).toContain(BENCH_TEXT.done)
    expect(button(counted, BENCH_TEXT.runAgain)).toBeDefined()
  })

  it('prints no reading beside the graph: a temperature is on the page only in the graph described in words, which is closed, until the learner enters it', () => {
    for (const salt of SALT_IDS) {
      const state = worked(salt, 'challenge')
      const { graph } = runView(m, state, salt)
      const part = bench(state, salt).part
      const inWords = escaped(describeGraph(m, graph))
      expect(part).toContain(inWords)
      expect(summaries(card(part, BENCH_TEXT.graph))).toEqual([PAGE_TEXT.inWords])
      const rest = text(part.replace(inWords, ''))
      for (const reading of new Set(graph.readings)) expect(rest, `${salt} ${reading}`).not.toContain(formatTenths(reading))
    }
  })
})

describe('what Challenge is kept from before a run counts (spec 26.5)', () => {
  /** Which way a temperature goes, in any of the words a page might say it with. */
  const WAY = /exothermic|endothermic|warmer|colder|warms|cools|heat out|heat in|gave heat|took heat|gives heat|takes heat|\bhot\b|\bcold\b|rise|rose|fall|fell|drop|climb|kJ/i
  /** Every state a careful run in Challenge passes through, from Start to the last entry before the check. */
  function steps(salt: SaltId): HotcoldState[] {
    const out: HotcoldState[] = []
    const keep = (state: HotcoldState) => (out.push(state), state)
    let state = workCup(m, keep(fresh('challenge')), salt, {}, keep)
    state = run(m, state, looks(m, state, salt), keep)
    run(m, state, entryActions(salt, notebookValues(m, state, salt)), keep)
    return out
  }

  it.each(SALT_IDS)("says nothing on %s's part of which way its temperature goes, at any step of a careful run up to the check, outside the notebook's own choices and the graph in words", (salt) => {
    for (const state of steps(salt)) {
      const { part } = bench(state, salt)
      const { graph } = runView(m, state, salt)
      const notebook = card(part, BENCH_TEXT.notebook) ?? ''
      const rest = part.replace(notebook, '').replace(escaped(describeGraph(m, graph)), '')
      expect(text(rest), `${salt} at ${graph.readings.length} readings`).not.toMatch(WAY)
      // In the notebook the words are there only as the two choices of an entry, both of them, and as the learner's own entries.
      const said = text(notebook)
      for (const word of ['exothermic', 'endothermic']) expect(count(said, new RegExp(word, 'g')), word).toBeLessThanOrEqual(1)
      expect(said).not.toMatch(/kJ|Follows|Does not follow/)
      for (const note of partNotes(data, salt)) expect(part).not.toContain(escaped(note))
      expect(part).not.toContain(BENCH_TEXT.notes)
    }
  })

  it.each(SALT_IDS)("lists under %s's part no source that stands beside a sentence on which way the heat went, until its run counts", (salt) => {
    const before = hotcoldCitations(data, salt, sources).map((c) => c.source.id)
    for (const state of steps(salt)) for (const id of ['nbs-tables-1982', 'docbrown-calorimeter-methods', 'wikipedia-ice-pack', 'wikipedia-heating-pad']) expect(bench(state, salt).part).not.toContain(escaped(sources.find((s) => s.id === id)!.citation))
    expect(before).not.toContain('nbs-tables-1982')
    const done = bench(wholeRun(m, fresh('challenge'), salt), salt).part
    expect(done).toContain(escaped(sources.find((s) => s.id === 'nbs-tables-1982')!.citation))
    expect(done).toContain(escaped(SOURCES_TEXT))
  })

  it("says nothing of a run that did not count beyond why: its notebook marks the entry that does not follow, and the part's notes stay back", () => {
    const state = wholeRun(m, fresh('challenge'), C, { slip: 'wrong-heat' })
    const { part } = bench(state, C)
    expect(part).toContain(escaped(reasonText('entries-do-not-follow')))
    expect(part).toContain('Does not follow')
    for (const note of partNotes(data, C)) expect(part).not.toContain(escaped(note))
    expect(text(part)).not.toMatch(/kJ/)
  })

  it('keeps part 3 closed, with one sentence that says what opens it, until both runs count; and then asks its two questions with nothing said of either answer', () => {
    const closed = bench(wholeRun(m, fresh('challenge'), E), 'packs').part
    expect(closed).toContain(escaped(blockedText(data, null, 'runs-not-done')))
    expect(count(closed, /<input /g)).toBe(0)
    expect(text(closed)).toContain(PROGRESS_TEXT.waiting)
    const open = bench(both('challenge'), 'packs').part
    expect(open).toContain(escaped(QUESTION_TEXT.warms))
    expect(open).toContain(escaped(QUESTION_TEXT.cools))
    expect(count(open, /<input [^>]*type="radio"/g)).toBe(2)
    expect(open).toContain(escaped(PACKS_TEXT.from))
    for (const note of partNotes(data, 'packs')) expect(open).not.toContain(escaped(note))
    expect(text(open)).not.toMatch(/Right|Not right/)
  })
})

describe('part 3 and the lab complete', () => {
  it('marks answers that were checked and are not both right, and offers to answer again; once both are right the part is done, its notes are there to open, and the lab says it is complete', () => {
    const missed = run(m, both('challenge'), [{ type: 'answer', question: 'warms', salt: E }, { type: 'answer', question: 'cools', salt: E }, { type: 'checkPacks' }])
    const not = bench(missed, 'packs')
    expect(not.part).toContain(PACKS_TEXT.missed)
    expect(button(not.part, PACKS_TEXT.again)).toBeDefined()
    expect(text(not.part)).toMatch(/Not right/)
    expect(not.html).not.toContain(escaped(BENCH_TEXT.complete))
    const done = bench(wholeLab(m, fresh('challenge')), 'packs')
    expect(done.part).toContain(PACKS_TEXT.done)
    expect(summaries(done.part)).toContain(BENCH_TEXT.notes)
    for (const note of partNotes(data, 'packs')) expect(done.part).toContain(escaped(note))
    expect(done.html).toContain(escaped(BENCH_TEXT.complete))
    expect(button(done.part, PACKS_TEXT.again)).toBeUndefined()
  })

  it('holds every button of a run once the lab is complete, and says so once at the head of the part', () => {
    const { part } = bench(wholeLab(m, fresh()), E)
    expect(part).toContain(escaped(blockedText(data, E, 'lab-completed')))
    expect(button(part, BENCH_TEXT.runAgain)!.tag).toContain('aria-disabled="true"')
    expect(card(part, PAGE_TEXT.outcome)).not.toContain('Run this part again:')
  })
})

describe('the Record tab', () => {
  it('lists every run of each salt with what was entered and how it came out, why one did not count, and the answers of part 3; and nothing of what was not entered', () => {
    let state = wholeRun(m, fresh('challenge'), E, { stir: false })
    state = wholeRun(m, run(m, state, [{ type: 'runAgain', part: E }]), E)
    const html = draw(createElement(HotcoldRecord, { data, m, state }))
    expect(html).toContain(escaped(RECORD_TEXT.caption))
    for (const part of PART_IDS) expect(html).toContain(escaped(partTitle(data, part)))
    expect(text(html)).toContain(`${RECORD_TEXT.run(1)}${RECORD_TEXT.doesNotCount}`)
    expect(text(html)).toMatch(new RegExp(`${RECORD_TEXT.run(2)}✓ ?${RECORD_TEXT.counts}`))
    expect(html).toContain(escaped(reasonText('not-stirred')))
    expect(text(html)).toContain(`${FIELD_LABEL.word}: endothermic`)
    expect(text(html)).toContain(`${FIELD_LABEL.temperature}: colder`)
    expect(count(text(html), new RegExp(RECORD_TEXT.notAnswered, 'g'))).toBe(2)
    // Calcium chloride's part has not been worked: nothing is said of it but that.
    expect(text(html)).not.toMatch(/exothermic|warmer|kJ/)
    const done = draw(createElement(HotcoldRecord, { data, m, state: wholeLab(m, fresh()) }))
    expect(done).toContain(escaped(BENCH_TEXT.complete))
    expect(text(done)).toMatch(new RegExp(`${QUESTION_TEXT.warms}calcium chloride✓ ?${PACKS_TEXT.right}`))
    expect(text(done)).toMatch(new RegExp(`${QUESTION_TEXT.cools}Epsom salt✓ ?${PACKS_TEXT.right}`))
  })
})
