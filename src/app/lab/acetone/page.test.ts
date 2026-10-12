import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ACETONE_PROGRESS, ACTIVITIES } from '@/app/activities'
import { KineticsRecord } from '@/app/lab/kinetics/Record'
import { NARROW_NOTICE, SHELL_TEXT } from '@/app/lab/shellText'
import { labProgress } from '@/app/lab/useLabProgress'
import { createMemoryStore, saveEntry, type KeyValueStore } from '@/app/progress/storage'
import { acetoneData as data, PART_IDS, RUN_IDS, type PartId } from '@/chem-data/acetone/data'
import { ACETONE_PRIMER, READ_FIRST } from '@/chem-data/acetone/primer'
import sources from '@/chem-data/sources.json'
import { acetoneStateSchema, createLab, leftAt, modelFrom, rateLawView, runView, timesTable, type AcetoneState, type Mode } from '@/engine/acetone'
import { entryActions, makeRoomRuns, makeRun, rateLawValues, run, wholeLab, wholeSheet } from '@/engine/acetone/testkit'
import { AcetoneBench, openingEntry, partProgress } from './AcetoneBench'
import { AcetonePage } from './AcetonePage'
import { FlaskDrawing, liquidFill, WATER } from './FlaskDrawing'
import { acetoneLab } from './lab'
import {
  CHANGE_TEXT,
  LAB_TEXT,
  LOOK_TEXT,
  MODE_TEXT,
  NOTEBOOK_TEXT,
  PAGE_TEXT,
  PART_AIM,
  RECORD_TEXT,
  RUN_TEXT,
  SHEET_TABLE_TEXT,
  TABLE_TEXT,
  blockedText,
  fieldLabel,
  flaskText,
  formatHelp,
  liquidText,
  mixtureRows,
  partNotes,
  partTitle,
  rateLawExpectedText,
  relationText,
  runOutcomeText,
  runReasonText,
  runsCountText,
  secondsText,
  sheetOutcomeText,
  timeRowText,
  watchStatusText,
  watchText,
} from './messages'

// The iodination of acetone lab's page as markup, on a store the test holds. AppStateProvider builds its store
// from the browser and the media hook has no value on a server, so both are given directly. What a press does (the
// pour, the playing of the watch and of the fade, the stop, an entry, the check) is state, and is checked in a
// browser; the playing of the time itself is watch.test.ts. The bench, the watch's card, the notebook and the
// record are the pieces this lab shares with the clock reaction lab (src/app/lab/kinetics/), whose own page tests
// hold their markup at length: these hold what is this lab's, and that the shared pieces say this lab's words.
const app = vi.hoisted(() => ({ store: undefined as unknown as KeyValueStore, persistent: true, wide: true }))
vi.mock('@/app/AppState', () => ({ useAppState: () => ({ store: app.store, persistent: app.persistent, reducedMotion: false }) }))
vi.mock('@/app/useMediaQuery', () => ({ useMediaQuery: () => app.wide }))

const [, , , , , , , acetone] = ACTIVITIES
const m = modelFrom(data)
const SCHEMA = acetoneStateSchema(m)
const draw = (element: ReactElement) => renderToStaticMarkup(createElement(MemoryRouter, null, element))
const escaped = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;')
const count = (html: string, pattern: RegExp) => [...html.matchAll(pattern)].length
const text = (html: string) => html.replace(/<[^>]+>/g, '')
const selectedTab = (html: string) => [...html.matchAll(/<button[^>]*role="tab"[^>]*>([^<]*)<\/button>/g)].filter((match) => match[0].includes('aria-selected="true"')).map((match) => match[1])
const panels = (html: string) =>
  html
    .split(/(?=<div[^>]*role="tabpanel")/)
    .slice(1)
    .map((panel) => ({ shown: !panel.slice(0, panel.indexOf('>')).includes('hidden=""'), body: panel.slice(panel.indexOf('>') + 1) }))
/** Every button, by its opening tag and its text. */
const buttons = (html: string) => [...html.matchAll(/<button([^>]*)>(.*?)<\/button>/gs)].map(([, tag, body]) => ({ tag: tag!, name: text(body!) }))
const button = (html: string, name: string) => buttons(html).find((one) => one.name === name)
/** The cards of an entry, by their h3. */
const cards = (html: string) => [...html.matchAll(/<h3[^>]*>(.*?)<\/h3>/g)].map((match) => match[1])
/** The closed disclosures, by their summaries. */
const closed = (html: string) => [...html.matchAll(/<details><summary[^>]*>(.*?)<\/summary>/g)].map((match) => match[1])
/** What each flask of the picture is drawn in: the mixture's, then the water's. */
const fills = (html: string) => [...html.matchAll(/<g data-flask="(?:mixture|water)">.*?<path data-liquid="" d="[^"]+" fill="(#[0-9a-f]{6})"/gs)].map((match) => match[1])

const [ONE, TWO] = PART_IDS
const fresh = (mode: Mode = 'guided', seed = 1) => createLab(m, seed, mode)
/** The four runs made. */
const timed = (mode?: Mode) => makeRoomRuns(m, fresh(mode))
/** The first `made` entries of a careful working of the notebook. */
const entered = (made: number, mode?: Mode) => {
  const state = timed(mode)
  return run(m, state, entryActions(m, 'rate-law', rateLawValues(m, state)).slice(0, made))
}
const done = (mode?: Mode) => wholeLab(m, fresh(mode))
/** A record that is poured with no stop is one this page never stores (the pour is stored with the stop); it is how a server can draw the card that a pour brings. */
const poured = (runId: (typeof RUN_IDS)[number] = 'mixture-1') => run(m, fresh(), [{ type: 'pour', run: runId }])

/** The Lab tab's bench on a state, opened at a part and an entry of it. */
const bench = (state: AcetoneState, part: PartId = ONE, entry = 0) => draw(createElement(AcetoneBench, { data, m, sources, state, shown: true, reducedMotion: false, act: () => undefined, opensAt: { part, entry } }))
const record = (state: AcetoneState) => draw(createElement(KineticsRecord, { lab: acetoneLab(data, m), state }))
/** Everything a learner is not to be told before a part is done: what its result is held to, and the record's notes on it. */
const kept = (() => {
  const state = done()
  return [rateLawExpectedText(data, rateLawView(m, state).expected!), ...PART_IDS.flatMap((part) => partNotes(data, part))]
})()
const DEEPEST = Math.max(...RUN_IDS.map((runId) => leftAt(m, fresh(), runId, 0)!.ofMicroMolar))

beforeEach(() => {
  app.store = createMemoryStore()
  app.persistent = true
  app.wide = true
})

describe('the iodination of acetone page', () => {
  it('is the eighth activity, a lab at #/lab/iodination-of-acetone, stored under the entry and the version its stored record is pinned to', () => {
    expect(acetone).toMatchObject({ entry: 'lab:iodination-of-acetone', to: '/lab/iodination-of-acetone', kind: 'Lab', title: 'Iodination of acetone' })
    expect(ACETONE_PROGRESS).toEqual({ entry: acetone.entry, version: acetone.version })
  })

  it("with nothing stored opens on the Primer tab with its cards one at a time, those to read first marked, the mode choice in this lab's own words, and Start; and stores nothing", () => {
    const html = draw(createElement(AcetonePage))
    expect(selectedTab(html)).toEqual([SHELL_TEXT.tabs.primer])
    const [primer, lab] = panels(html)
    expect(primer!.shown).toBe(true)
    expect(count(primer!.body, /<h2/g)).toBe(1)
    expect(primer!.body).toContain(escaped(ACETONE_PRIMER[0]!.heading))
    expect(READ_FIRST.length).toBeGreaterThan(0)
    expect(count(text(primer!.body), /Read first/g)).toBeGreaterThanOrEqual(READ_FIRST.length)
    expect(lab!.body).toContain(SHELL_TEXT.notStarted)
    for (const mode of ['guided', 'challenge'] as const) expect(html).toContain(escaped(MODE_TEXT[mode]))
    expect(button(html, SHELL_TEXT.start)).toBeDefined()
    expect(labProgress(app.store, acetone, SCHEMA).load()).toBeNull()
  })

  it('with a lab stored opens on the Lab tab, on the run it was in the middle of, with Restart; and the Record tab holds the record', () => {
    const state = makeRun(m, makeRun(m, fresh(), 'mixture-1'), 'mixture-2')
    saveEntry(app.store, acetone.entry, acetone.version, state)
    const html = draw(createElement(AcetonePage))
    expect(selectedTab(html)).toEqual([SHELL_TEXT.tabs.lab])
    const [, lab, recorded] = panels(html)
    expect(lab!.body).toMatch(/<h2[^>]*>Mixture 3<\/h2>/)
    expect(lab!.body).not.toMatch(/<h2[^>]*>Mixture 1<\/h2>/)
    expect(lab!.body).toContain(runsCountText(2, 4))
    expect(button(html, SHELL_TEXT.restart)).toBeDefined()
    expect(recorded!.body).toContain(RECORD_TEXT.caption)
    // Drawing the page writes nothing.
    expect(labProgress(app.store, acetone, SCHEMA).load()).toEqual(state)
  })

  it('sets aside a stored record that does not fit, says so, and starts fresh', () => {
    saveEntry(app.store, acetone.entry, acetone.version, { ...fresh(), seed: -1 })
    const html = draw(createElement(AcetonePage))
    expect(html).toContain(escaped(SHELL_TEXT.setAside))
    expect(selectedTab(html)).toEqual([SHELL_TEXT.tabs.primer])
  })

  it('in a narrow window shows the notice on the Lab tab in place of the bench, and nothing that changes a run', () => {
    app.wide = false
    saveEntry(app.store, acetone.entry, acetone.version, fresh())
    const [, lab] = panels(draw(createElement(AcetonePage)))
    expect(lab!.body).toContain(NARROW_NOTICE.title)
    expect(lab!.body).not.toContain(RUN_TEXT.pour)
  })
})

describe('the Lab tab', () => {
  it('has a navigation named Parts with the two in order, side by side, each with its number, its name and how far it has come in words beside a mark; the one shown is marked as current', () => {
    const html = bench(makeRun(m, fresh(), 'mixture-1'))
    const nav = /<nav aria-label="Parts" class="([^"]*)">(.*?)<\/nav>/s.exec(html)!
    expect(nav[1]).toContain('grid-cols-2')
    expect(buttons(nav[2]!).map((one) => one.name)).toEqual(['Part 1Four mixtures at room temperature◔ Runs under way', 'Part 2The rate law○ Not started'])
    expect(buttons(nav[2]!).map((one) => one.tag.includes('aria-current="true"'))).toEqual([true, false])
    expect(nav[2]).toContain('min-h-11')
  })

  it("lists part 1's four runs in a navigation named Runs, each with how it stands, and shows one at a time", () => {
    const html = bench(makeRun(m, fresh(), 'mixture-1'), ONE, 1)
    const list = /<nav aria-label="Runs"[^>]*>(.*?)<\/nav>/s.exec(html)![1]!
    expect([...list.matchAll(/<li>(.*?)<\/li>/gs)].map((match) => text(match[1]!))).toEqual(['1.Mixture 1✓ Counts', '2.Mixture 2○ Not started', '3.Mixture 3○ Not started', '4.Mixture 4○ Not started'])
    expect(count(html, /<h2/g)).toBe(1)
    expect(html).toMatch(/<h2[^>]*>Mixture 2<\/h2>/)
    expect(buttons(html).map((b) => b.name).filter((name) => /^(← Previous|Next)/.test(name))).toEqual(['← Previous: Mixture 1', 'Next: Mixture 3 →'])
  })

  it('says what the lab and the part are for until something is done, and from then how many of the runs count, in a status line', () => {
    const before = bench(fresh())
    expect(before).toContain(LAB_TEXT.aim)
    expect(before).toContain(PART_AIM.runs)
    const after = bench(makeRun(m, fresh(), 'mixture-1'))
    expect(after).not.toContain(LAB_TEXT.aim)
    expect(after).toContain(`<p role="status" class="font-medium">${runsCountText(1, 4)}</p>`)
  })

  it('offers, at the last run of part 1, the way on to part 2; and under part 2, the way back to part 1 and no way on', () => {
    expect(buttons(bench(fresh(), ONE, 3)).map((b) => b.name)).toContain('Next: Part 2: The rate law →')
    expect(buttons(bench(fresh(), ONE, 2)).map((b) => b.name)).not.toContain('Next: Part 2: The rate law →')
    const two = buttons(bench(fresh(), TWO)).map((b) => b.name)
    expect(two).toContain('← Previous: Part 1: Four mixtures at room temperature')
    expect(two.filter((name) => name.startsWith('Next'))).toEqual([])
  })

  it("has in one place, under every run and under the notebook, closed, the sources and the bench with the three bottles' hazards; and under a run, the table of times", () => {
    for (const [part, entry] of [[ONE, 0], [ONE, 3], [TWO, 0]] as const) {
      const html = bench(fresh(), part, entry)
      expect(closed(html)).toEqual(expect.arrayContaining(['Sources', PAGE_TEXT.bench]))
      expect(html).toContain(escaped(PAGE_TEXT.hazards))
      expect(data.reagents).toHaveLength(3)
      for (const reagent of data.reagents) expect(html).toContain(`role="group" aria-label="${escaped(reagent.name)}"`)
      expect(count(html, /<summary[^>]*>Hazards<\/summary>/g)).toBe(3)
      expect(closed(html).includes(TABLE_TEXT.caption)).toBe(part === ONE)
    }
    // Each bottle's tile gives its strength as its label writes it.
    expect(bench(fresh())).toContain('0.0050 M')
  })

  it("stands the disclosures under an entry 36 px apart, and the two under a watch too, so that the hit area of none, 44 px tall, lies over another's", () => {
    expect(bench(fresh())).toContain('<div class="mt-4 grid gap-9 pb-3">')
    expect(bench(poured())).toContain('<div class="grid gap-9 pt-1 pb-4">')
  })

  it("has part 1's notes at the part's head, closed, once its four runs count and not before", () => {
    const three = RUN_IDS.slice(0, 3).reduce((state, id) => makeRun(m, state, id), fresh())
    expect(closed(bench(three, ONE, 3))).not.toContain(NOTEBOOK_TEXT.notes)
    const html = bench(timed(), ONE, 3)
    expect(closed(html)).toContain(NOTEBOOK_TEXT.notes)
    for (const note of partNotes(data, ONE)) expect(html).toContain(escaped(note))
  })

  it('says at its head that the lab is complete, and why nothing more is taken, once it is', () => {
    expect(bench(fresh())).toContain('<p role="status" class="max-w-prose text-sm font-medium -mb-3"></p>')
    const html = bench(done())
    expect(html).toContain(LAB_TEXT.complete)
    expect(html).toContain(blockedText('lab-completed'))
  })
})

describe('a run before the pour', () => {
  it('is two cards, the mixture and the flask: the watch comes with the pour', () => {
    expect(cards(bench(fresh()))).toEqual([RUN_TEXT.mixture, RUN_TEXT.flask])
  })

  it('has the mixture as a table: what is in the flask and what is poured in to start, each liquid with its volume, and what they come to', () => {
    const html = bench(fresh(), ONE, 3)
    for (const row of mixtureRows(data, 'mixture-4')) expect(html).toContain(`<th scope="row" class="border-b px-1.5 py-1 text-left align-top font-normal">${row.liquid}</th>`)
    expect(count(html, /<th scope="rowgroup"/g)).toBe(2)
    expect(html).toContain(`<th scope="rowgroup" rowSpan="3" class="border-b px-1.5 py-1 text-left align-top font-medium whitespace-nowrap">${RUN_TEXT.inFlask}</th>`)
    expect(html).toContain(`<th scope="rowgroup" rowSpan="1" class="border-b px-1.5 py-1 text-left align-top font-medium whitespace-nowrap">${RUN_TEXT.pouredIn}</th>`)
    expect(text(html)).toContain('Iodine solution, 0.0050 M20.0 mL')
    expect(html).toContain('50.0 mL in all, once the iodine is poured in.')
  })

  it('draws the flask and the flask of water beside it, each named, hidden from a screen reader, both with no colour; and says how they stand, and what the liquid looks like, in words beside the drawing', () => {
    const html = bench(fresh())
    expect(html).toMatch(/<svg viewBox="0 0 260 158" aria-hidden="true"/)
    expect(fills(html)).toEqual([WATER, WATER])
    expect(html).toContain('>Mixture 1</text>')
    expect(html).toContain(`>${data.water.name}</text>`)
    expect(html).toContain(`<p class="font-medium">${flaskText(data, 'mixture-1', { poured: false })}</p>`)
    expect(html).toContain(liquidText(data, { microMolar: 0 }, false))
    // Nothing of a colour is drawn or worded in the picture before the pour.
    expect(html).not.toContain('data-look')
  })

  it('offers the pour, drawn as the main button, and beside it the choice to have the watch stopped when the colour has gone: each a finger tall, the second a button that can stay pressed', () => {
    const html = bench(fresh())
    const [pour, atEnd] = [button(html, RUN_TEXT.pour)!, button(html, RUN_TEXT.stopAtEnd)!]
    expect(pour.tag).toContain('min-h-11')
    expect(pour.tag).not.toContain('aria-disabled="true"')
    expect(atEnd.tag).toContain('min-h-11')
    expect(atEnd.tag).toContain('aria-pressed="false"')
    expect(html.indexOf(RUN_TEXT.pour)).toBeLessThan(html.indexOf(RUN_TEXT.stopAtEnd))
    // There is nothing to make ready and nothing to warn of: the two are the only buttons of the card.
    expect(html).not.toContain('role="alertdialog"')
    expect(html).not.toContain(RUN_TEXT.left)
  })
})

describe('the watch and the liquid', () => {
  it('is the one card from the pour on, with the mixture and the flasks in words behind two disclosures that are closed', () => {
    const html = bench(poured())
    expect(cards(html)).toEqual([RUN_TEXT.watch])
    expect(closed(html).slice(0, 2)).toEqual([RUN_TEXT.mixture, RUN_TEXT.flask])
    expect(html).toContain(flaskText(data, 'mixture-1', { poured: true }))
  })

  it('draws the two flasks large, side by side: the mixture in a yellow and the water in none, each with its name and the words for its look under it, and the look in a sentence beside the watch', () => {
    const html = bench(poured())
    expect(html).toMatch(/<svg viewBox="0 0 320 212" aria-hidden="true" class="[^"]*w-80[^"]*"/)
    const start = leftAt(m, poured(), 'mixture-1', 0)!
    expect(fills(html)).toEqual([liquidFill(start.microMolar, DEEPEST), WATER])
    expect([...html.matchAll(/<text data-look=""[^>]*>(.*?)<\/text>/g)].map((match) => match[1])).toEqual([LOOK_TEXT.yellow, LOOK_TEXT.none])
    // While the watch runs the look keeps the room of two lines and the status line of one, so that a line that comes or grows does not move Stop under a hand.
    expect(html).toContain(`<p class="min-h-10 font-medium">${liquidText(data, start, true)}</p>`)
    // The status line that says a step of the fade, and then the end, is empty until there is one to say.
    expect(html).toContain('<p role="status" class="min-h-5 font-semibold"></p>')
  })

  it('shows the watch as a timer, which is not a live region, named by what it reads, in large figures, with the line that says what the one speed of the four mixtures is', () => {
    const html = bench(poured())
    expect(html).toMatch(new RegExp(`<p role="timer" aria-label="${watchStatusText(runView(m, poured(), 'mixture-1'), 0, m)}" class="[^"]*text-5xl[^"]*tabular-nums">${watchText(0)}</p>`))
    expect(html).toContain(`<p class="text-muted-foreground">${RUN_TEXT.fast}</p>`)
    expect(html).not.toMatch(/role="timer"[^>]*aria-live/)
  })

  it('has the two ways of stopping the watch side by side, taller than a finger, the second a button that can stay pressed, with what each does under them', () => {
    const html = bench(poured())
    const [stop, atEnd] = [button(html, RUN_TEXT.stop)!, button(html, RUN_TEXT.stopAtEnd)!]
    expect(stop.tag).toContain('min-h-14')
    expect(atEnd.tag).toContain('min-h-14')
    expect(atEnd.tag).toContain('aria-pressed="false"')
    expect(html).toContain(RUN_TEXT.stopHelp)
    expect(html).toContain(RUN_TEXT.stopAtEndHelp)
  })

  it('starts the mixture with twice the iodine in a deeper yellow than the others, which all start in the same', () => {
    const [one, two, three, four] = RUN_IDS.map((runId) => fills(bench(poured(runId), ONE, RUN_IDS.indexOf(runId)))[0])
    expect([two, three]).toEqual([one, one])
    expect(four).not.toBe(one)
    expect(four).toBe(liquidFill(DEEPEST, DEEPEST))
    expect(one).toBe(liquidFill(DEEPEST / 2, DEEPEST))
  })

  it('once stopped at the end shows the mixture in the colour of the water, with no colour in words, the end said in the status line, what the watch reads and how it was stopped, and that the run counts, beside a tick', () => {
    const state = makeRun(m, fresh(), 'mixture-1')
    const view = runView(m, state, 'mixture-1')
    const html = bench(state)
    expect(fills(html)).toEqual([WATER, WATER])
    expect([...html.matchAll(/<text data-look=""[^>]*>(.*?)<\/text>/g)].map((match) => match[1])).toEqual([LOOK_TEXT.none, LOOK_TEXT.none])
    expect(html).toContain(liquidText(data, { microMolar: 0 }, true))
    expect(html).toContain(`<p role="status" class="font-semibold">${CHANGE_TEXT}</p>`)
    expect(html).toContain(`<p>${watchStatusText(view, view.stopped!.tenths, m)}</p>`)
    expect(html).toContain(`<span aria-hidden="true" class="lab-done">✓ </span>${runOutcomeText(m, view.outcome, view.stopped)}`)
    // The two ways of stopping are gone, and a run that counts is not offered again.
    expect(button(html, RUN_TEXT.stop)).toBeUndefined()
    expect(button(html, RUN_TEXT.runAgain)).toBeUndefined()
    expect(html).not.toContain(RUN_TEXT.fast)
  })

  it('says of a run stopped while there was still colour why it does not count, beside a cross, shows the colour and the words of what was left at the stop, and offers the run again with what that does', () => {
    const state = makeRun(m, fresh(), 'mixture-1', { stop: { earlyMs: 30_000 } })
    const view = runView(m, state, 'mixture-1')
    const html = bench(state)
    const left = leftAt(m, state, 'mixture-1', 0)!
    expect(left.microMolar).toBeGreaterThan(0)
    expect(fills(html)).toEqual([liquidFill(left.microMolar, DEEPEST), WATER])
    expect(html).toContain(liquidText(data, left, true))
    expect(html).toContain('<p role="status" class="font-semibold"></p>')
    expect(html).toContain(`<span aria-hidden="true" class="lab-failed">✕ </span>${runOutcomeText(m, view.outcome, view.stopped)}`)
    expect(html).toContain(runReasonText(m, 'stopped-early'))
    expect(button(html, RUN_TEXT.runAgain)!.tag).toContain('min-h-11')
    expect(html).toContain(RUN_TEXT.runAgainHelp)
  })
})

describe('the colour of the fade', () => {
  const rgb = (hex: string) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16))

  it('follows how much iodine is left, step by step paler, down to a faint yellow for the least there can be; and at nought is the colour of the water, which is no yellow', () => {
    const amounts = [DEEPEST, 1500, 1000, 500, 100, 10, 1]
    const drawn = amounts.map((amount) => liquidFill(amount, DEEPEST))
    expect(new Set(drawn).size).toBe(amounts.length)
    // A yellow has less blue than red or green; the less iodine, the more blue comes back, and it never reaches the water's.
    const blue = drawn.map((hex) => rgb(hex)[2]!)
    expect(blue.every((value, at) => at === 0 || value > blue[at - 1]!)).toBe(true)
    for (const hex of drawn) expect(rgb(hex)[2]).toBeLessThan(Math.min(rgb(hex)[0]!, rgb(hex)[1]!) - 60)
    expect(liquidFill(0, DEEPEST)).toBe(WATER)
    expect(rgb(WATER)[2]).toBeGreaterThanOrEqual(Math.max(rgb(WATER)[0]!, rgb(WATER)[1]!))
    // The faintest yellow is far from the water in its blue, which is what an eye reads as yellow: over 60 of 255.
    expect(rgb(WATER)[2]! - rgb(liquidFill(1, DEEPEST))[2]!).toBeGreaterThan(60)
  })

  it('never leaves the look to its colour: the picture carries the words for it under each flask, and the water is drawn the same whatever the mixture is', () => {
    const picture = (fill: string, look: string) => draw(createElement(FlaskDrawing, { names: { mixture: 'Mixture 1', water: data.water.name }, watched: { fill, looks: { mixture: look, water: LOOK_TEXT.none } } }))
    for (const [amount, look] of [[1000, LOOK_TEXT.yellow], [300, LOOK_TEXT['pale-yellow']], [50, LOOK_TEXT['faintest-yellow']], [0, LOOK_TEXT.none]] as const) {
      const html = picture(liquidFill(amount, DEEPEST), look)
      expect(fills(html)[1]).toBe(WATER)
      expect(html).toContain(`>${look}</text>`)
    }
  })

  it('stands on a white card in its own ink in both themes, and gives the liquid no transition and the picture no animation, so that the colour is each frame\'s own, with motion reduced or not', () => {
    for (const html of [bench(fresh()), bench(poured())]) {
      expect(html).toMatch(/<svg viewBox="[^"]+" aria-hidden="true" class="[^"]*"><rect width="\d+" height="\d+" fill="#ffffff"><\/rect>/)
      expect(count(html, /<path data-liquid="" d="[^"]+" fill="#[0-9a-f]{6}" style="transition-property:none"/g)).toBe(2)
      expect(html).not.toMatch(/<svg[^>]*class="[^"]*(animate|clock-turned)/)
      expect(/<svg viewBox.*?<\/svg>/s.exec(html)![0]).not.toMatch(/currentColor|var\(/)
    }
  })
})

describe('the table of times and the notebook', () => {
  it('is closed until the four runs count, and says in one sentence what opens it', () => {
    const html = bench(makeRun(m, fresh(), 'mixture-1'), TWO)
    expect(html).toContain(blockedText('runs-missing'))
    expect(html).not.toContain('<input')
  })

  it('heads part 2 with the table of times, a row for each of the four runs with its temperature, its time and how its watch was stopped', () => {
    const state = makeRun(m, makeRun(m, fresh(), 'mixture-1'), 'mixture-2', { stop: 'end' })
    const html = bench(state, TWO)
    expect(cards(html)[0]).toBe(TABLE_TEXT.caption)
    const rows = [...html.matchAll(/<tr><th scope="row"[^>]*>(Mixture \d)<\/th>(.*?)<\/tr>/g)].map((match) => [match[1], ...[...match[2]!.matchAll(/<td[^>]*>(.*?)<\/td>/g)].map((cell) => cell[1])])
    expect(rows.map((row) => row[0])).toEqual(['Mixture 1', 'Mixture 2', 'Mixture 3', 'Mixture 4'])
    expect(rows[0]!.slice(2)).toEqual([secondsText(runView(m, state, 'mixture-1').stopped!.tenths), TABLE_TEXT.byHand])
    expect(rows[1]![3]).toBe(TABLE_TEXT.byEnd)
    expect(rows[2]!.slice(2)).toEqual([TABLE_TEXT.empty, ''])
  })

  it("opens with the table of the first mixture and its line of the table of times over its first four entries: one field waits, a finger tall, with how it is written and, in Guided, its relation closed", () => {
    const state = timed()
    const html = bench(state, TWO)
    expect(cards(html)).toEqual([TABLE_TEXT.caption, NOTEBOOK_TEXT.notebook])
    expect(html).toContain(RUN_TEXT.pouredIn)
    expect(html).toContain(timeRowText(data, timesTable(m, state).find((row) => row.runId === 'mixture-1')!))
    expect(count(html, /<input/g)).toBe(1)
    expect(html).toMatch(/<input[^>]*class="[^"]*h-11/)
    expect(html).toContain(formatHelp('concentration:acetone'))
    expect(closed(html)).toContain(NOTEBOOK_TEXT.hint)
    expect(html).toContain(escaped(relationText('concentration:acetone')))
    expect(html).toContain(fieldLabel(data, 'rate'))
    expect(html).not.toContain(NOTEBOOK_TEXT.filledRows)
    expect(closed(bench(timed('challenge'), TWO))).not.toContain(NOTEBOOK_TEXT.hint)
    expect(button(bench(timed('challenge'), TWO), NOTEBOOK_TEXT.check)).toBeDefined()
    expect(button(html, NOTEBOOK_TEXT.check)).toBeUndefined()
  })

  it("fills the other three runs' rows only once the first mixture's row has been worked, asks for each order as three choices with none made, and fills the rate constants and their mean only once the first has its unit", () => {
    expect(bench(entered(3), TWO)).not.toContain(NOTEBOOK_TEXT.filledRows)
    const rows = bench(entered(4), TWO)
    expect(rows).toContain(NOTEBOOK_TEXT.filledRows)
    expect(rows).toContain(SHEET_TABLE_TEXT.rateLawCaption)
    expect(rows).toContain(escaped(SHEET_TABLE_TEXT.concentration(data, 'iodine')))
    expect(count(rows, /<input[^>]*type="radio"/g)).toBe(m.orderChoices.length)
    expect(rows).not.toMatch(/<input[^>]*type="radio"[^>]*checked/)
    expect(bench(entered(8), TWO)).not.toContain(NOTEBOOK_TEXT.filledConstants)
    const constants = bench(entered(9, 'challenge'), TWO)
    expect(constants).toContain(NOTEBOOK_TEXT.filledConstants)
    expect(constants).toContain(NOTEBOOK_TEXT.mean)
  })

  it('once checked is read and not typed in, says how it came out in a card of its own, and has what it was held to and the notes behind a disclosure that is closed', () => {
    const state = done()
    const html = bench(state, TWO)
    expect(count(html, /<input/g)).toBe(0)
    expect(cards(html)).toEqual([TABLE_TEXT.caption, NOTEBOOK_TEXT.notebook, NOTEBOOK_TEXT.outcome])
    expect(html).toContain(escaped(sheetOutcomeText(m, rateLawView(m, state).outcome, false)))
    expect(closed(html)).toContain(NOTEBOOK_TEXT.notes)
    for (const words of kept.filter((one) => !partNotes(data, ONE).includes(one))) expect(html).toContain(escaped(words))
  })

  it('offers a notebook that did not count again, with what that does', () => {
    const html = bench(wholeSheet(m, timed('challenge'), 'rate-law', { slip: 'not-diluted' }), TWO)
    expect(button(html, NOTEBOOK_TEXT.sheetAgain)!.tag).toContain('min-h-11')
    expect(html).toContain(NOTEBOOK_TEXT.sheetAgainHelp)
  })
})

describe('what Challenge is shown before a part is done', () => {
  it('is nothing of what the result is held to and none of the notes, at any point of a careful lab short of the check that makes the part done', () => {
    const points: [AcetoneState, PartId, number][] = []
    let state = fresh('challenge')
    points.push([state, ONE, 0], [state, TWO, 0])
    for (const runId of RUN_IDS) {
      state = makeRun(m, state, runId)
      points.push([state, ONE, RUN_IDS.indexOf(runId)])
    }
    for (const action of entryActions(m, 'rate-law', rateLawValues(m, state))) {
      state = run(m, state, [action])
      points.push([state, TWO, 0])
    }
    expect(points).toHaveLength(2 + 4 + 9)
    const ofPartOne = partNotes(data, ONE)
    for (const [at, part, entry] of points) {
      const html = bench(at, part, entry)
      // Part 1's own notes come once its four runs count, and nothing else of what is kept comes with them.
      const partOneDone = partProgress(m, at).runs === 'done'
      for (const words of kept) expect([words, html.includes(escaped(words))]).toEqual([words, partOneDone && part === ONE && ofPartOne.includes(words)])
      expect(html).not.toContain('Follows')
      expect(html).not.toContain(NOTEBOOK_TEXT.hint)
      expect(record(at)).not.toContain(escaped(kept[0]!))
    }
  })

  it('shows the time of no run before its watch is stopped: a run that is poured says nothing of when its colour will go', () => {
    const end = runView(m, makeRun(m, fresh('challenge'), 'mixture-1', { stop: 'end' }), 'mixture-1').stopped!.tenths
    const html = bench(run(m, fresh('challenge'), [{ type: 'pour', run: 'mixture-1' }]))
    expect(html).not.toContain(watchText(end))
    expect(html).not.toContain(secondsText(end))
  })
})

describe('the record', () => {
  it('lists the two parts with how far each has come, and every attempt at each run with how it came out and how it was timed', () => {
    const late = makeRun(m, fresh(), 'mixture-1', { stop: { delayMs: 430 } })
    const html = record(makeRun(m, late, 'mixture-2', { stop: 'end' }))
    for (const part of PART_IDS) expect(html).toContain(`<th scope="rowgroup" class="border-b p-2 text-left align-top font-semibold">${partTitle(data, part)}</th>`)
    expect(html).toContain(`aria-label="${RECORD_TEXT.region}"`)
    expect(count(html, /<th scope="row"/g)).toBe(RUN_IDS.length)
    expect(text(html)).toContain(`Mixture 1, attempt 1✓ ${RECORD_TEXT.counts}`)
    expect(text(html)).toContain(`Mixture 3, attempt 1${RECORD_TEXT.open}`)
    expect(html).toContain(`<li>${RECORD_TEXT.timedByHandAfter(runView(m, late, 'mixture-1').stopped!.tenths, 430)}</li>`)
    expect(html).toContain('watch stopped when the colour had gone</li>')
  })

  it('keeps an attempt that did not count, with why, over the one made after it; says of a watch stopped while there was colour only that a hand stopped it, and of one left to its limit that it stopped itself', () => {
    const early = makeRun(m, fresh(), 'mixture-3', { stop: { earlyMs: 4000 } })
    const again = makeRun(m, run(m, early, [{ type: 'runAgain', run: 'mixture-3' }]), 'mixture-3')
    const html = record(again)
    expect(text(html)).toContain(`Mixture 3, attempt 1${RECORD_TEXT.doesNotCount}`)
    expect(html).toContain(`<li>${RECORD_TEXT.timedByHand(runView(m, early, 'mixture-3').stopped!.tenths)}</li>`)
    expect(html).toContain(runReasonText(m, 'stopped-early'))
    expect(text(html)).toContain(`Mixture 3, attempt 2✓ ${RECORD_TEXT.counts}`)
    // A watch left running adds true time from the end of the fade until it reads its limit, and then stops itself: its delay is the limit less the time of the end.
    const end = runView(m, makeRun(m, fresh(), 'mixture-2', { stop: 'end' }), 'mixture-2').stopped!.tenths * 100
    const leftOn = record(run(m, fresh(), [{ type: 'pour', run: 'mixture-2' }, { type: 'stop', run: 'mixture-2', elapsedMs: m.watchLimitMs, delayMs: m.watchLimitMs - end }]))
    expect(leftOn).toContain(`<li>${RECORD_TEXT.timedOut(m.watchLimitMs / 100)}</li>`)
    expect(leftOn).not.toContain('watch stopped by hand')
  })

  it('lists each working of the notebook with what was entered, and shows nothing of what a result is held to', () => {
    const html = record(done())
    expect(html).toContain(LAB_TEXT.complete)
    expect(text(html)).toContain(`${RECORD_TEXT.working(1)}✓ ${RECORD_TEXT.counts}`)
    expect(html).toContain(`<li>${fieldLabel(data, 'order:iodine')}: order 0</li>`)
    for (const words of kept) expect(html.includes(escaped(words)), words).toBe(false)
    // A notebook that has not been begun is not a working yet.
    expect(text(record(fresh()))).not.toContain(RECORD_TEXT.working(1))
  })
})

describe('where the Lab tab opens', () => {
  it('is the first part begun and not done: part 1 at the first of its runs that does not count yet, and part 2 once the four runs count', () => {
    const state = makeRun(m, makeRun(m, fresh(), 'mixture-1'), 'mixture-2')
    expect(partProgress(m, state)).toEqual({ runs: 'runs', 'rate-law': 'not-started' })
    expect(openingEntry(m, state, ONE)).toBe(2)
    expect(openingEntry(m, timed(), ONE)).toBe(0)
    expect(openingEntry(m, timed(), TWO)).toBe(0)
    const html = draw(createElement(AcetoneBench, { data, m, sources, state: timed(), shown: true, reducedMotion: false, act: () => undefined }))
    expect(html).toMatch(new RegExp(`<h2[^>]*>${partTitle(data, TWO)}</h2>`))
  })
})
