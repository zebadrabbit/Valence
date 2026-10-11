import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ACTIVITIES, CLOCK_PROGRESS } from '@/app/activities'
import { NARROW_NOTICE, SHELL_TEXT } from '@/app/lab/shellText'
import { labProgress } from '@/app/lab/useLabProgress'
import { createMemoryStore, saveEntry, type KeyValueStore } from '@/app/progress/storage'
import { BATH_IDS, bathRunId, clockData as data, MIXTURE_IDS, PART_IDS, RUN_IDS, type PartId, type RunId } from '@/chem-data/clock/data'
import { CLOCK_PRIMER, READ_FIRST } from '@/chem-data/clock/primer'
import sources from '@/chem-data/sources.json'
import { clockStateSchema, createLab, modelFrom, rateLawView, runView, temperatureView, timesTable, type ClockState, type Mode } from '@/engine/clock'
import { entryActions, makeBathRuns, makeRoomRuns, makeRun, rateLawValues, run, temperatureValues, wholeLab, wholeSheet } from '@/engine/clock/testkit'
import { ClockBench, openingEntry, partProgress } from './ClockBench'
import { ClockPage } from './ClockPage'
import { ClockRecord } from './ClockRecord'
import clockCss from './clock.css?raw'
import { FlaskDrawing } from './FlaskDrawing'
import { GRAPH, PLOT_EDGE, axesOf, columns, xOf, yOf } from './graphGeometry'
import {
  GRAPH_TEXT,
  LAB_TEXT,
  MODE_TEXT,
  NOTEBOOK_TEXT,
  PAGE_TEXT,
  PART_AIM,
  RECORD_TEXT,
  RUN_TEXT,
  SHEET_TABLE_TEXT,
  TABLE_TEXT,
  blockedText,
  changeText,
  describeGraph,
  fieldLabel,
  flasksText,
  formatHelp,
  liquidText,
  mixtureRows,
  partNotes,
  partTitle,
  placeLabel,
  rateLawExpectedText,
  relationText,
  runOutcomeText,
  runReasonText,
  runTitle,
  runsCountText,
  secondsText,
  sheetOutcomeText,
  standLabel,
  temperatureExpectedText,
  timeRowText,
  watchStatusText,
  watchText,
} from './messages'

// The clock reaction lab's page as markup, on a store the test holds. AppStateProvider builds its store from the
// browser and the media hook has no value on a server, so both are given directly. What a press does (a step of
// the flasks, the pour, the playing of the watch, the stop, Guided's warning, a look at the line, an entry, the
// check) is state, and is checked in a browser; the playing of the time itself is watch.test.ts.
const app = vi.hoisted(() => ({ store: undefined as unknown as KeyValueStore, persistent: true, wide: true }))
vi.mock('@/app/AppState', () => ({ useAppState: () => ({ store: app.store, persistent: app.persistent, reducedMotion: false }) }))
vi.mock('@/app/useMediaQuery', () => ({ useMediaQuery: () => app.wide }))

const [, , , , , , clock] = ACTIVITIES
const m = modelFrom(data)
const SCHEMA = clockStateSchema(m)
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

const [ONE, TWO, THREE] = PART_IDS
const ICE = bathRunId('ice')
const fresh = (mode: Mode = 'guided', seed = 1) => createLab(m, seed, mode)
/** Part 1's runs made, and all eight. */
const timed = (mode?: Mode) => makeRoomRuns(m, fresh(mode))
const allTimed = (mode?: Mode) => makeBathRuns(m, timed(mode))
/** The first `made` entries of a careful working of part 2's notebook. */
const entered = (made: number, mode?: Mode) => {
  const state = timed(mode)
  return run(m, state, entryActions(m, 'rate-law', rateLawValues(m, state)).slice(0, made))
}
/** Parts 1 and 2 done and the baths' runs made: part 3's notebook is open. */
const graphOpen = (mode?: Mode) => wholeSheet(m, allTimed(mode), 'rate-law')
const done = (mode?: Mode) => wholeLab(m, fresh(mode))

/** The Lab tab's bench on a state, opened at a part and an entry of it. */
const bench = (state: ClockState, part: PartId = ONE, entry = 0) => draw(createElement(ClockBench, { data, m, sources, state, shown: true, reducedMotion: false, act: () => undefined, opensAt: { part, entry } }))
const NOTEBOOK = BATH_IDS.length
/** Everything a learner is not to be told before a part is done: what its result is held to, and the record's notes on it. */
const kept = (() => {
  const state = done()
  return [rateLawExpectedText(data, rateLawView(m, state).expected!), temperatureExpectedText(temperatureView(m, state).expected!), ...PART_IDS.flatMap((part) => partNotes(data, part))]
})()

beforeEach(() => {
  app.store = createMemoryStore()
  app.persistent = true
  app.wide = true
})

describe('the clock reaction page', () => {
  it('is the seventh activity, a lab at #/lab/clock-reaction, stored under the entry and the version its stored record is pinned to', () => {
    expect(clock).toMatchObject({ entry: 'lab:clock-reaction', to: '/lab/clock-reaction', kind: 'Lab', title: 'Clock reaction' })
    expect(CLOCK_PROGRESS).toEqual({ entry: clock.entry, version: clock.version })
  })

  it("with nothing stored opens on the Primer tab with its cards one at a time, those to read first marked, the mode choice in this lab's own words, and Start; and stores nothing", () => {
    const html = draw(createElement(ClockPage))
    expect(selectedTab(html)).toEqual([SHELL_TEXT.tabs.primer])
    const [primer, lab] = panels(html)
    expect(primer!.shown).toBe(true)
    expect(count(primer!.body, /<h2/g)).toBe(1)
    expect(primer!.body).toContain(escaped(CLOCK_PRIMER[0]!.heading))
    expect(READ_FIRST.length).toBeGreaterThan(0)
    expect(count(text(primer!.body), /Read first/g)).toBeGreaterThanOrEqual(READ_FIRST.length)
    expect(lab!.body).toContain(SHELL_TEXT.notStarted)
    for (const mode of ['guided', 'challenge'] as const) expect(html).toContain(escaped(MODE_TEXT[mode]))
    expect(button(html, SHELL_TEXT.start)).toBeDefined()
    expect(labProgress(app.store, clock, SCHEMA).load()).toBeNull()
  })

  it('with a lab stored opens on the Lab tab, on the part and the run it was in the middle of, with Restart; and the Record tab holds the record', () => {
    const state = makeRun(m, makeRun(m, fresh(), 'mixture-1'), 'mixture-2')
    saveEntry(app.store, clock.entry, clock.version, state)
    const html = draw(createElement(ClockPage))
    expect(selectedTab(html)).toEqual([SHELL_TEXT.tabs.lab])
    const [, lab, record] = panels(html)
    expect(lab!.body).toMatch(/<h2[^>]*>Mixture 3<\/h2>/)
    expect(lab!.body).not.toMatch(/<h2[^>]*>Mixture 1<\/h2>/)
    expect(lab!.body).toContain(runsCountText(2, 5))
    expect(button(html, SHELL_TEXT.restart)).toBeDefined()
    expect(record!.body).toContain(RECORD_TEXT.caption)
    // Drawing the page writes nothing.
    expect(labProgress(app.store, clock, SCHEMA).load()).toEqual(state)
  })

  it('sets aside a stored record that does not fit, says so, and starts fresh', () => {
    saveEntry(app.store, clock.entry, clock.version, { ...fresh(), seed: -1 })
    const html = draw(createElement(ClockPage))
    expect(html).toContain(escaped(SHELL_TEXT.setAside))
    expect(selectedTab(html)).toEqual([SHELL_TEXT.tabs.primer])
  })

  it('in a narrow window shows the notice on the Lab tab in place of the bench, and nothing that changes a run', () => {
    app.wide = false
    saveEntry(app.store, clock.entry, clock.version, fresh())
    const [, lab] = panels(draw(createElement(ClockPage)))
    expect(lab!.body).toContain(NARROW_NOTICE.title)
    expect(lab!.body).not.toContain(RUN_TEXT.pour)
  })
})

describe('the Lab tab', () => {
  it('has a navigation named Parts with the three in order, each with its number, its name and how far it has come in words beside a mark; the one shown is marked as current', () => {
    const html = bench(makeRun(m, fresh(), 'mixture-1'))
    const nav = /<nav aria-label="Parts"[^>]*>(.*?)<\/nav>/s.exec(html)![1]!
    expect(buttons(nav).map((one) => one.name)).toEqual(['Part 1Five mixtures at room temperature◔ Runs under way', 'Part 2The rate law○ Not started', 'Part 3Temperature○ Not started'])
    expect(buttons(nav).map((one) => one.tag.includes('aria-current="true"'))).toEqual([true, false, false])
    expect(nav).toContain('min-h-11')
  })

  it("lists part 1's five runs in a navigation named Runs, each with how it stands, and shows one at a time; part 3's list ends in the notebook", () => {
    const one = bench(makeRun(m, fresh(), 'mixture-1'), ONE, 1)
    const list = /<nav aria-label="Runs"[^>]*>(.*?)<\/nav>/s.exec(one)![1]!
    expect([...list.matchAll(/<li>(.*?)<\/li>/gs)].map((match) => text(match[1]!))).toEqual(['1.Mixture 1✓ Counts', '2.Mixture 2○ Not started', '3.Mixture 3○ Not started', '4.Mixture 4○ Not started', '5.Mixture 5○ Not started'])
    expect(count(one, /<h2/g)).toBe(1)
    expect(one).toMatch(/<h2[^>]*>Mixture 2<\/h2>/)
    expect(buttons(one).map((b) => b.name).filter((name) => /^(← Previous|Next)/.test(name))).toEqual(['← Previous: Mixture 1', 'Next: Mixture 3 →'])
    const three = bench(fresh(), THREE, 0)
    const baths = /<nav aria-label="Runs"[^>]*>(.*?)<\/nav>/s.exec(three)![1]!
    expect([...baths.matchAll(/<li>(.*?)<\/li>/gs)].map((match) => text(match[1]!))).toEqual(['1.Mixture 1 in ice water○ Not started', '2.Mixture 1 in cool water○ Not started', '3.Mixture 1 in warm water○ Not started', '4.The notebook○ Not started'])
  })

  it('says what the lab and the part are for until something is done, and from then how many of the runs count, in a status line', () => {
    const before = bench(fresh())
    expect(before).toContain(LAB_TEXT.aim)
    expect(before).toContain(PART_AIM.runs)
    const after = bench(makeRun(m, fresh(), 'mixture-1'))
    expect(after).not.toContain(LAB_TEXT.aim)
    expect(after).toContain(`<p role="status" class="font-medium">${runsCountText(1, 5)}</p>`)
  })

  it('offers, at the last run of part 1, the way on to part 2; and under part 2, the ways to the parts either side', () => {
    expect(buttons(bench(fresh(), ONE, 4)).map((b) => b.name)).toContain('Next: Part 2: The rate law →')
    expect(buttons(bench(fresh(), ONE, 3)).map((b) => b.name)).not.toContain('Next: Part 2: The rate law →')
    const two = buttons(bench(fresh(), TWO)).map((b) => b.name)
    expect(two).toEqual(expect.arrayContaining(['← Previous: Part 1: Five mixtures at room temperature', 'Next: Part 3: Temperature →']))
  })

  it("has under every entry, closed, the sources and the bench with the five bottles' hazards; and under a run, the table of times", () => {
    for (const [part, entry] of [[ONE, 0], [TWO, 0], [THREE, 1], [THREE, NOTEBOOK]] as const) {
      const html = bench(fresh(), part, entry)
      expect(closed(html)).toEqual(expect.arrayContaining(['Sources', PAGE_TEXT.bench]))
      expect(html).toContain(escaped(PAGE_TEXT.hazards))
      for (const reagent of data.reagents) expect(html).toContain(`role="group" aria-label="${escaped(reagent.name)}"`)
      expect(count(html, /<summary[^>]*>Hazards<\/summary>/g)).toBe(data.reagents.length)
      expect(closed(html).includes(TABLE_TEXT.caption)).toBe(entry < 3 && part !== TWO)
    }
  })

  it("has part 1's notes at the part's head, closed, once its five runs count and not before", () => {
    const four = MIXTURE_IDS.slice(0, 4).reduce((state, id) => makeRun(m, state, id), fresh())
    expect(closed(bench(four, ONE, 4))).not.toContain(NOTEBOOK_TEXT.notes)
    const html = bench(timed(), ONE, 4)
    expect(closed(html)).toContain(NOTEBOOK_TEXT.notes)
    for (const note of partNotes(data, ONE)) expect(html).toContain(escaped(note))
  })

  it('says at its head that the lab is complete, and why nothing more is taken, once it is', () => {
    expect(bench(fresh())).toContain('<p role="status" class="max-w-prose text-sm font-medium -mb-3"></p>')
    const html = bench(done())
    expect(html).toContain(LAB_TEXT.complete)
    expect(html).toContain(blockedText(data, 'lab-completed'))
  })
})

describe('a run before the pour', () => {
  it('is two cards, the mixture and the flasks: the watch comes with the pour', () => {
    expect(cards(bench(fresh()))).toEqual([RUN_TEXT.mixture, RUN_TEXT.flasks])
  })

  it('has the mixture as a table: each flask with its liquids and their volumes, and what the two come to', () => {
    const html = bench(fresh(), ONE, 4)
    for (const row of mixtureRows(data, 'mixture-5')) expect(html).toContain(`<th scope="row" class="border-b px-1.5 py-1 text-left align-top font-normal">${escaped(row.liquid)}</th><td class="border-b px-1.5 py-1 text-left align-top whitespace-nowrap tabular-nums lab-value">${row.volume}</td>`)
    expect(count(html, /<th scope="rowgroup" rowSpan="\d"/g)).toBe(2)
    expect(html).toContain('50.0 mL in all')
  })

  it('draws the two flasks, hidden from a screen reader, and says what has been done to them in a status line beside the drawing', () => {
    const state = run(m, fresh(), [{ type: 'addIndicator', run: 'mixture-1' }])
    const html = bench(state)
    expect(html).toMatch(/<svg viewBox="0 0 260 158" aria-hidden="true"/)
    expect(html).toContain(`<p role="status" class="font-medium">${escaped(flasksText(data, 'mixture-1', runView(m, state, 'mixture-1')))}</p>`)
    expect(html).toContain(liquidText(data, 'before', false))
    // What shows the end of the run is in flask B: the picture says so over the flask's mouth, and the button reads as done.
    expect(html).toContain('data-indicator=""')
    expect(bench(fresh())).not.toContain('data-indicator=""')
    expect(button(html, `✓ ${RUN_TEXT.starchDone}`)!.tag).toContain('aria-disabled="true"')
  })

  it('offers the starch and the pour, a finger tall each, and no warning until the pour is pressed', () => {
    const html = bench(fresh())
    for (const name of [RUN_TEXT.starch, RUN_TEXT.pour]) expect(button(html, name)!.tag).toContain('min-h-11')
    expect(button(html, RUN_TEXT.pour)!.tag).not.toContain('aria-disabled')
    expect(html).not.toContain('No starch in flask B')
  })

  it('has for a run of part 3 the three steps of its bath before the pour, and the pour waits for the thermometer; its mixture, the first again, is behind a disclosure that is closed', () => {
    const html = bench(fresh(), THREE, 0)
    expect(cards(html)).toEqual([RUN_TEXT.flasks])
    expect(closed(html)[0]).toBe(RUN_TEXT.mixture)
    for (const name of [RUN_TEXT.starch, standLabel(data, ICE), RUN_TEXT.letStand(data), RUN_TEXT.read, RUN_TEXT.pour]) expect(button(html, name), name).toBeDefined()
    expect(button(html, RUN_TEXT.pour)!.tag).toContain('aria-disabled="true"')
    const stood = bench(run(m, fresh(), [{ type: 'standInBath', run: ICE }, { type: 'letStand', run: ICE }, { type: 'readThermometer', run: ICE }]), THREE, 0)
    expect(button(stood, RUN_TEXT.pour)!.tag).not.toContain('aria-disabled')
    expect(button(stood, `✓ ${RUN_TEXT.letStandDone(data)}`)).toBeDefined()
  })

  it('draws each bath so that it is told from the others without colour: ice at the surface of the ice water, steam over the warm, neither for the cool, and the name of each', () => {
    const inBath = (bath: (typeof BATH_IDS)[number]) => bench(run(m, fresh(), [{ type: 'standInBath', run: bathRunId(bath) }, { type: 'readThermometer', run: bathRunId(bath) }]), THREE, BATH_IDS.indexOf(bath))
    expect(bench(fresh(), THREE, 0)).not.toContain('data-bath')
    for (const bath of data.baths) {
      const html = inBath(bath.id)
      const drawn = /<g data-bath="[^"]+">(.*?)<\/g>/s.exec(html)![1]!
      expect([bath.id, count(drawn, /data-ice/g) > 0, count(drawn, /data-steam/g) > 0]).toEqual([bath.id, bath.id === 'ice', bath.id === 'warm'])
      expect(text(drawn)).toBe(bath.name)
      // The thermometer stands in flask A, with what it reads once it has been read.
      expect(html).toMatch(/<g data-thermometer="">.*?<text[^>]*>-?\d+\.\d °C<\/text><\/g>/s)
    }
    expect(new Set(data.baths.map((bath) => /<rect[^>]*fill="(#[0-9a-f]+)"><\/rect><path/.exec(/<g data-bath="[^"]+">(.*?)<\/g>/s.exec(inBath(bath.id))![1]!)![1])).size).toBe(1)
  })

  it('says nothing of a run that was left until one has been: the sentence is for a run whose watch was running when the page was left', () => {
    expect(bench(fresh())).not.toContain(RUN_TEXT.left)
    expect(bench(run(m, fresh(), [{ type: 'addIndicator', run: 'mixture-1' }]))).not.toContain(RUN_TEXT.left)
  })
})

describe('the watch and the liquid', () => {
  // A record that is poured with no stop is one this page never stores (the pour is stored with the stop); it is how a server can draw the card that a pour brings.
  const poured = run(m, fresh(), [{ type: 'addIndicator', run: 'mixture-1' }, { type: 'pour', run: 'mixture-1' }])

  it('is the one card from the pour on, with the mixture and what was done to the flasks behind two disclosures that are closed', () => {
    const html = bench(poured)
    expect(cards(html)).toEqual([RUN_TEXT.watch])
    expect(closed(html).slice(0, 2)).toEqual([RUN_TEXT.mixture, RUN_TEXT.flasks])
  })

  it('draws the one flask larger, with the look of its liquid in the record\'s words under it and in a sentence beside it; the status line that says the change is empty until it comes', () => {
    const html = bench(poured)
    expect(html).toMatch(/<svg viewBox="0 0 200 220" aria-hidden="true" data-look="before"/)
    expect(html).toContain(`>${data.rateLaw.end.before.value}</text>`)
    expect(html).toContain(`<p class="font-medium">${liquidText(data, 'before', true)}</p>`)
    expect(html).toContain('<p role="status" class="font-semibold"></p>')
    expect(html).not.toContain(data.rateLaw.end.after.value)
  })

  it('shows the watch as a timer, which is not a live region, named by what it reads, in large figures, with the line that says the time is played faster than a clock', () => {
    const html = bench(poured)
    const view = runView(m, poured, 'mixture-1')
    expect(html).toMatch(new RegExp(`<p role="timer" aria-label="${watchStatusText(view, 0, m)}" class="[^"]*text-5xl[^"]*tabular-nums">${watchText(0)}</p>`))
    expect(html).toContain(RUN_TEXT.fast)
    expect(html).not.toMatch(/role="timer"[^>]*aria-live/)
  })

  it('has the two ways of stopping the watch side by side, taller than a finger, the second a button that can stay pressed, with what each does under them', () => {
    const html = bench(poured)
    const [stop, atChange] = [button(html, RUN_TEXT.stop)!, button(html, RUN_TEXT.stopAtChange)!]
    expect(stop.tag).toContain('min-h-14')
    expect(atChange.tag).toContain('min-h-14')
    expect(atChange.tag).toContain('aria-pressed="false"')
    expect(html.indexOf(`>${RUN_TEXT.stop}<`)).toBeLessThan(html.indexOf(RUN_TEXT.stopAtChange))
    expect(html).toContain(RUN_TEXT.stopHelp)
    expect(html).toContain(RUN_TEXT.stopAtChangeHelp)
  })

  it('once stopped shows the liquid as it was at the stop, in colour and in words, what the watch reads and how it was stopped, and that the run counts, beside a tick', () => {
    const state = makeRun(m, fresh(), 'mixture-1')
    const view = runView(m, state, 'mixture-1')
    const html = bench(state)
    expect(html).toMatch(/<svg viewBox="0 0 200 220" aria-hidden="true" data-look="after"/)
    expect(html).toContain(`>${data.rateLaw.end.after.value}</text>`)
    expect(html).toContain(liquidText(data, 'after', true))
    expect(html).toContain(`<p role="status" class="font-semibold">${changeText(data)}</p>`)
    expect(html).toContain(`<p>${watchStatusText(view, view.stopped!.tenths, m)}</p>`)
    expect(html).toContain(`<span aria-hidden="true" class="lab-done">✓ </span>${runOutcomeText(m, view.outcome, view.stopped)}`)
    // The two ways of stopping are gone, and a run that counts is not offered again.
    expect(button(html, RUN_TEXT.stop)).toBeUndefined()
    expect(button(html, RUN_TEXT.runAgain)).toBeUndefined()
    expect(html).not.toContain(RUN_TEXT.fast)
  })

  it('draws the two looks in colours that differ, and never leaves a look to its colour', () => {
    const fill = (html: string) => /<path data-liquid="" d="[^"]+" fill="(#[0-9a-f]{6})"/.exec(html)![1]
    expect(fill(bench(poured))).not.toBe(fill(bench(makeRun(m, fresh(), 'mixture-1'))))
  })

  it('says of a run that does not count why, beside a cross, and offers it again with what that does', () => {
    for (const how of [{ indicator: false }, { stop: { earlyMs: 5000 } }, { stop: { delayMs: 2500 } }] as const) {
      const state = makeRun(m, fresh(), 'mixture-1', how)
      const view = runView(m, state, 'mixture-1')
      const html = bench(state)
      expect(view.outcome.state).toBe('does-not-count')
      expect(html).toContain(`<span aria-hidden="true" class="lab-failed">✕ </span>${runOutcomeText(m, view.outcome, view.stopped)}`)
      expect(button(html, RUN_TEXT.runAgain)!.tag).toContain('min-h-11')
      expect(html).toContain(RUN_TEXT.runAgainHelp)
    }
    // With no starch nothing ever showed.
    expect(bench(makeRun(m, fresh(), 'mixture-1', { indicator: false }))).toContain('data-look="before"')
  })

  it('stands in its bath in the picture of a run of part 3', () => {
    const html = bench(makeRun(m, fresh(), ICE), THREE, 0)
    expect(html).toMatch(/<svg viewBox="0 0 200 236" aria-hidden="true" data-look="after"/)
    expect(html).toContain('<g data-bath="ice">')
  })
})

describe("the flask's drawing", () => {
  const props = { view: { indicator: true, flasks: 'bench', thermometerTenths: null, poured: true }, look: 'after', lookWord: 'dark blue', names: { a: 'A', b: 'B', indicator: 'I' }, bath: null, reading: null } as const

  it('is marked as the change is shown only where it is told to be, and the mark is the one animation of the lab: once, for under a second', () => {
    expect(draw(createElement(FlaskDrawing, { ...props, turned: true }))).toContain('clock-turned')
    expect(draw(createElement(FlaskDrawing, props))).not.toContain('clock-turned')
    expect(count(clockCss, /animation:/g)).toBe(1)
    expect(clockCss).toMatch(/\.clock-turned \{\s*animation: clock-turned 0\.7s ease-out 1;/)
    expect(clockCss).not.toMatch(/transition|infinite/)
  })

  it('stands on a white card in its own ink, in both themes: nothing in it follows the theme', () => {
    const html = draw(createElement(FlaskDrawing, props))
    expect(html).not.toMatch(/currentColor|var\(/)
    expect(html).toContain('<rect width="200" height="220" fill="#ffffff"></rect>')
  })
})

describe('the table of times', () => {
  it('heads part 2 with a row for each of the five runs, each with its temperature, its time and how its watch was stopped; a run that does not count yet says so', () => {
    const state = makeRun(m, makeRun(m, fresh(), 'mixture-1'), 'mixture-2', { stop: 'end' })
    const html = bench(state, TWO)
    expect(cards(html)[0]).toBe(TABLE_TEXT.caption)
    const table = new RegExp(`<caption[^>]*>${TABLE_TEXT.caption}</caption>.*?</table>`, 's').exec(html)![0]
    const rows = [...table.matchAll(/<tr><th scope="row"[^>]*>(.*?)<\/th>(.*?)<\/tr>/gs)].map((match) => [match[1], ...[...match[2]!.matchAll(/<td[^>]*>(.*?)<\/td>/g)].map((cell) => cell[1])])
    const stored = timesTable(m, state)
    expect(rows.map((row) => row[0])).toEqual(MIXTURE_IDS.map((id) => runTitle(data, id)))
    expect(rows[0]!.slice(2)).toEqual([secondsText(stored[0]!.tenths!), TABLE_TEXT.byHand])
    expect(rows[1]!.slice(2)).toEqual([secondsText(stored[1]!.tenths!), TABLE_TEXT.byEnd])
    expect(rows[2]!.slice(2)).toEqual([TABLE_TEXT.empty, ''])
    expect(html).toContain(TABLE_TEXT.use)
    // The same row as a sentence is the wording module's.
    expect(timeRowText(data, stored[0]!)).toContain(rows[0]![2])
  })

  it("heads part 3's notebook with the four runs it is worked from", () => {
    const html = bench(graphOpen(), THREE, NOTEBOOK)
    const table = new RegExp(`<caption[^>]*>${TABLE_TEXT.caption}</caption>.*?</table>`, 's').exec(html.slice(html.indexOf(`>${partTitle(data, THREE)}</h2>`)))![0]
    expect([...table.matchAll(/<th scope="row"[^>]*>(.*?)<\/th>/g)].map((match) => match[1])).toEqual([runTitle(data, 'mixture-1'), ...BATH_IDS.map((bath) => runTitle(data, bathRunId(bath)))])
  })
})

describe("part 2's notebook", () => {
  const list = (html: string) => [...html.matchAll(/<ol start="(\d+)" class="grid w-full list-decimal gap-3 pl-6">(.*?)<\/ol>/gs)].map((match) => ({ start: Number(match[1]), items: [...match[2]!.matchAll(/<li>(.*?)<\/li>(?=<li>|$)/gs)].map((item) => item[1]!) }))

  it('is closed until the five runs count, and says in one sentence what opens it', () => {
    const html = bench(makeRun(m, fresh(), 'mixture-1'), TWO)
    expect(html).toContain(blockedText(data, 'runs-missing'))
    expect(cards(html)).toEqual([TABLE_TEXT.caption])
  })

  it("opens with the table of the first mixture over its first four entries: one field waits, a finger tall, with how it is written and, in Guided, its relation closed; the rest are their names alone", () => {
    const html = bench(timed(), TWO)
    expect(cards(html)).toEqual([TABLE_TEXT.caption, NOTEBOOK_TEXT.notebook])
    const [row, orders, constant] = list(html)
    expect([row!.start, orders!.start, constant!.start]).toEqual([1, 5, 8])
    expect([row!.items.length, orders!.items.length, constant!.items.length]).toEqual([4, 3, 2])
    expect(row!.items[0]).toMatch(/<input[^>]*type="text"[^>]*class="h-11 /)
    expect(row!.items[0]).toContain(formatHelp('concentration:iodide'))
    expect(closed(row!.items[0]!)).toEqual([NOTEBOOK_TEXT.hint])
    expect(row!.items[0]).toContain(escaped(relationText(data, 'concentration:iodide')))
    expect(text(row!.items[1]!)).toBe(fieldLabel(data, 'concentration:bromate'))
    expect(count(html, /<input[^>]*type="text"/g)).toBe(1)
    // The mixture's own table stands over the entries that are worked from it, with the one time they are worked from under it.
    expect(html.indexOf('rowSpan')).toBeLessThan(html.indexOf('<ol start="1"'))
    const time = html.indexOf(`<p class="lab-value">${timeRowText(data, timesTable(m, timed())[0]!)}</p>`)
    expect(time).toBeGreaterThan(html.indexOf('rowSpan'))
    expect(time).toBeLessThan(html.indexOf('<ol start="1"'))
    expect(bench(timed('challenge'), TWO)).not.toContain(NOTEBOOK_TEXT.hint)
    expect(html).toContain(SHELL_TEXT_CALCULATOR)
  })

  it('shows an entry that is made in a disabled field beside Change, and in Guided says beside a tick that it follows', () => {
    const [row] = list(bench(entered(1), TWO))
    expect(row!.items[0]).toMatch(/<input[^>]*disabled=""[^>]*value="0\.00200"|<input[^>]*value="0\.00200"[^>]*disabled=""/)
    expect(button(row!.items[0]!, NOTEBOOK_TEXT.change)).toBeDefined()
    expect(row!.items[0]).toContain('✓ </span>Follows')
    expect(list(bench(entered(1, 'challenge'), TWO))[0]!.items[0]).not.toContain('Follows')
  })

  it("fills the other four runs' rows only once the first mixture's row has been worked, and says that the notebook filled them", () => {
    expect(bench(entered(3), TWO)).not.toContain(SHEET_TABLE_TEXT.rateLawCaption)
    expect(bench(entered(3), TWO)).not.toContain(NOTEBOOK_TEXT.filledRows)
    const html = bench(entered(4), TWO)
    expect(html).toContain(NOTEBOOK_TEXT.filledRows)
    const table = new RegExp(`<caption[^>]*>${SHEET_TABLE_TEXT.rateLawCaption}</caption>.*?</table>`, 's').exec(html)![0]
    expect([...table.matchAll(/<th scope="row"[^>]*>(.*?)<\/th>/g)].map((match) => match[1])).toEqual(MIXTURE_IDS.map((id) => runTitle(data, id)))
    // It stands between the row that was worked and the orders that are read off it.
    expect(html.indexOf(SHEET_TABLE_TEXT.rateLawCaption)).toBeGreaterThan(html.indexOf('<ol start="1"'))
    expect(html.indexOf(SHEET_TABLE_TEXT.rateLawCaption)).toBeLessThan(html.indexOf('<ol start="5"'))
  })

  it('asks for an order as three choices, a finger tall each, with none made for the learner; one that is made folds to a line beside Change', () => {
    const [, orders] = list(bench(entered(4), TWO))
    expect(count(orders!.items[0]!, /<input[^>]*type="radio"/g)).toBe(m.orderChoices.length)
    expect(orders!.items[0]).not.toContain('checked=""')
    expect(orders!.items[0]).toContain('min-h-11')
    const [, made] = list(bench(entered(5), TWO))
    expect(made!.items[0]).not.toContain('type="radio"')
    expect(text(made!.items[0]!)).toContain(`${fieldLabel(data, 'order:iodide')}: order `)
    expect(button(made!.items[0]!, NOTEBOOK_TEXT.change)).toBeDefined()
  })

  it("fills the other runs' rate constants and the mean only once the first has been entered with its unit", () => {
    expect(bench(entered(8), TWO)).not.toContain(NOTEBOOK_TEXT.filledConstants)
    const state = entered(9, 'challenge')
    const html = bench(state, TWO)
    expect(html).toContain(NOTEBOOK_TEXT.filledConstants)
    expect(html).toContain(`>${NOTEBOOK_TEXT.mean}</th>`)
    expect(html).toContain(`>Mixture 1 (${NOTEBOOK_TEXT.yourRow})</th>`)
    // In Challenge the check is under the list, and nothing is said of whether an entry follows.
    expect(button(html, NOTEBOOK_TEXT.check)!.tag).not.toContain('aria-disabled')
    expect(button(bench(entered(8, 'challenge'), TWO), NOTEBOOK_TEXT.check)!.tag).toContain('aria-disabled="true"')
    expect(html).not.toContain('Follows')
  })

  it('once checked is read and not typed in, says how it came out in a card of its own, and has what it was held to and the notes behind a disclosure that is closed', () => {
    const state = wholeSheet(m, timed(), 'rate-law')
    const html = bench(state, TWO)
    expect(cards(html)).toEqual([TABLE_TEXT.caption, NOTEBOOK_TEXT.notebook, NOTEBOOK_TEXT.outcome])
    expect(count(html.slice(html.indexOf(`>${NOTEBOOK_TEXT.notebook}</h3>`)), /<input/g)).toBe(0)
    expect(html).toContain(escaped(sheetOutcomeText(m, 'rate-law', rateLawView(m, state).outcome)))
    expect(closed(html)).toContain(NOTEBOOK_TEXT.notes)
    expect(html).toContain(escaped(rateLawExpectedText(data, rateLawView(m, state).expected!)))
  })

  it('offers a notebook that did not count again, with what that does', () => {
    const state = wholeSheet(m, timed('challenge'), 'rate-law', { slip: 'wrong-order' })
    const html = bench(state, TWO)
    expect(html).toContain(escaped(sheetOutcomeText(m, 'rate-law', rateLawView(m, state).outcome)))
    expect(button(html, NOTEBOOK_TEXT.sheetAgain)!.tag).toContain('min-h-11')
    expect(closed(html)).not.toContain(NOTEBOOK_TEXT.notes)
  })
})

describe("part 3's notebook and its graph", () => {
  const SVG = `<svg viewBox="0 0 ${GRAPH.width} ${GRAPH.height}" role="img"`
  const places = (html: string) =>
    [...html.matchAll(/<button type="button" data-part="(\d+)" tabindex="(-?\d)" aria-label="([^"]+)" style="left:([\d.]+)%;top:([\d.]+)%;width:([\d.]+)%;height:([\d.]+)%"[^>]*><\/button>/g)].map(([, place, tab, name, left, , width]) => ({ place: Number(place), tab: Number(tab), name: name!, left: Number(left), width: Number(width) }))

  it('waits for its runs, and then for part 2, and says which in one sentence', () => {
    expect(bench(fresh(), THREE, NOTEBOOK)).toContain(blockedText(data, 'runs-missing'))
    const html = bench(allTimed(), THREE, NOTEBOOK)
    expect(html).toContain(blockedText(data, 'rate-law-first'))
    expect(html).not.toContain(SVG)
  })

  it('has the table the notebook fills, with the sentence that says it filled it, over the graph', () => {
    const html = bench(graphOpen(), THREE, NOTEBOOK)
    expect(cards(html)).toEqual([TABLE_TEXT.caption, GRAPH_TEXT.graph, NOTEBOOK_TEXT.notebook])
    expect(html).toContain(NOTEBOOK_TEXT.filledTemperatures)
    const table = new RegExp(`<caption[^>]*>${SHEET_TABLE_TEXT.temperatureCaption}</caption>.*?</table>`, 's').exec(html)![0]
    expect(count(table, /<th scope="row"/g)).toBe(4)
    expect(html.indexOf(SHEET_TABLE_TEXT.temperatureCaption)).toBeLessThan(html.indexOf(SVG))
  })

  it('draws the graph as a picture named for what it is: a diamond for each run, the line, and a circle for each place on it, open until it is looked at', () => {
    const state = run(m, graphOpen(), [{ type: 'look', place: 2 }])
    const html = bench(state, THREE, NOTEBOOK)
    const graph = temperatureView(m, state).graph!
    expect(html).toContain(`${SVG} aria-label="${escaped(GRAPH_TEXT.picture)}"`)
    expect(count(html, /<rect data-point="/g)).toBe(4)
    expect(count(html, /<line data-line=""/g)).toBe(1)
    expect([...html.matchAll(/<circle data-place="" cx="[\d.]+" cy="[\d.]+" r="4" fill="([^"]+)"/g)].map((match) => match[1] === 'currentColor')).toEqual(graph.places.map((place) => place.looked))
    // Each place is drawn on the line, where the geometry puts it.
    const axes = axesOf(graph.places, graph.points)
    const first = /<circle data-place="" cx="([\d.]+)" cy="([\d.]+)"/.exec(html)!
    expect([Number(first[1]), Number(first[2])]).toEqual([xOf(axes, graph.places[0]!.xMicro), yOf(axes, graph.places[0]!.yMilli)])
    for (const words of [GRAPH_TEXT.point, GRAPH_TEXT.line, GRAPH_TEXT.lookedAt, GRAPH_TEXT.notLookedAt]) expect(html).toContain(words)
  })

  it('lays a real button over each place: a column the whole height of the plot, the columns meeting, each named for the look it is, and the graph one stop of the Tab key', () => {
    const state = run(m, graphOpen(), [{ type: 'look', place: 2 }])
    const graph = temperatureView(m, state).graph!
    const found = places(bench(state, THREE, NOTEBOOK))
    expect(found.map((one) => one.place)).toEqual(graph.places.map((_, at) => at))
    expect(found.map((one) => one.name)).toEqual(graph.places.map((place) => placeLabel(place, place.looked)))
    expect(found.filter((one) => one.tab === 0).map((one) => one.place)).toEqual([0])
    const areas = columns(graph.places, axesOf(graph.places, graph.points))
    expect(areas[0]!.from).toBe(PLOT_EDGE.left)
    expect(areas.at(-1)!.to).toBe(PLOT_EDGE.right)
    for (let at = 1; at < areas.length; at++) expect(areas[at]!.from).toBe(areas[at - 1]!.to)
    expect(found[3]!.left).toBeCloseTo((areas[3]!.from / GRAPH.width) * 100, 6)
  })

  it('has under the graph two buttons a finger tall that step one place to the left and to the right, and shows no figure of a place until one is looked at: no callout, and the graph in words closed', () => {
    const state = graphOpen()
    const html = bench(state, THREE, NOTEBOOK)
    expect(button(html, `← ${GRAPH_TEXT.earlier}`)!.tag).toContain('min-h-11')
    expect(button(html, `${GRAPH_TEXT.later} →`)!.tag).toContain('min-h-11')
    expect(html).not.toContain('data-callout')
    expect(html).not.toContain('data-ring')
    expect(closed(html)).toContain(GRAPH_TEXT.inWords)
    expect(html).toContain(escaped(describeGraph(data, temperatureView(m, state))))
  })

  it('offers as a place to enter only one that has been looked at, and as the second only another: until then the question waits and says so', () => {
    const none = bench(graphOpen(), THREE, NOTEBOOK)
    expect(none).toContain(formatHelp('first'))
    expect(count(none.slice(none.lastIndexOf(`>${NOTEBOOK_TEXT.notebook}</h3>`)), /type="radio"/g)).toBe(0)
    const two = run(m, graphOpen(), [{ type: 'look', place: 0 }, { type: 'look', place: 11 }])
    expect(count(bench(two, THREE, NOTEBOOK).slice(none.lastIndexOf(`>${NOTEBOOK_TEXT.notebook}</h3>`)), /type="radio"/g)).toBe(2)
    const firstMade = run(m, two, [{ type: 'enter', sheet: 'temperature', field: 'first', value: 0 }])
    const html = bench(firstMade, THREE, NOTEBOOK)
    expect(count(html.slice(html.lastIndexOf(`>${NOTEBOOK_TEXT.notebook}</h3>`)), /type="radio"/g)).toBe(1)
  })

  it('says, once it counts, that the activation energy is the lab\'s own figure and not a measured one', () => {
    const state = done()
    const html = bench(state, THREE, NOTEBOOK)
    expect(html).toContain(escaped(temperatureExpectedText(temperatureView(m, state).expected!)))
    expect(temperatureExpectedText(temperatureView(m, state).expected!)).toContain("the lab's own figure, not a measured one")
  })
})

describe('what Challenge is shown before a part is done', () => {
  it('is nothing of what a result is held to and none of the notes, at any point of a careful lab short of the check that makes the part done', () => {
    const points: [ClockState, PartId, number][] = []
    let state = fresh('challenge')
    points.push([state, ONE, 0])
    for (const runId of RUN_IDS) {
      const part = MIXTURE_IDS.includes(runId as (typeof MIXTURE_IDS)[number]) ? ONE : THREE
      const entry = part === ONE ? MIXTURE_IDS.indexOf(runId as (typeof MIXTURE_IDS)[number]) : RUN_IDS.indexOf(runId) - MIXTURE_IDS.length
      state = makeRun(m, state, runId as RunId)
      points.push([state, part, entry])
    }
    const law = entryActions(m, 'rate-law', rateLawValues(m, state))
    for (const action of law) {
      state = run(m, state, [action])
      points.push([state, TWO, 0])
    }
    const ofPartOne = partNotes(data, ONE)
    for (const [at, part, entry] of points) {
      const html = bench(at, part, entry)
      // Part 1's own notes come once its five runs count, and nothing else of what is kept comes with them.
      const partOneDone = partProgress(m, at).runs === 'done'
      for (const words of kept) expect([words, html.includes(escaped(words))]).toEqual([words, partOneDone && part === ONE && ofPartOne.includes(words)])
      expect(html).not.toContain('Follows')
      expect(html).not.toContain(NOTEBOOK_TEXT.hint)
    }
    // Part 2 checked and done: its own notes may be said, and part 3's still may not.
    state = run(m, state, [{ type: 'check', sheet: 'rate-law' }])
    const values = temperatureValues(m, state)
    for (const action of entryActions(m, 'temperature', values)) {
      state = run(m, state, [action])
      const html = bench(state, THREE, NOTEBOOK)
      expect(html).not.toContain(escaped(temperatureExpectedText({ activationKJ: m.activationJ / 1000 })))
      for (const note of partNotes(data, THREE)) expect(html.includes(escaped(note)), note).toBe(false)
    }
  })

  it('shows the time of no run before its watch is stopped: a run that is poured says nothing of when its liquid changes', () => {
    const state = run(m, fresh('challenge'), [{ type: 'addIndicator', run: 'mixture-1' }, { type: 'pour', run: 'mixture-1' }])
    const end = runView(m, makeRun(m, fresh('challenge'), 'mixture-1', { stop: 'end' }), 'mixture-1').stopped!.tenths
    const html = bench(state)
    expect(html).not.toContain(watchText(end))
    expect(html).not.toContain(secondsText(end))
  })
})

describe('the record', () => {
  const record = (state: ClockState) => draw(createElement(ClockRecord, { data, m, state }))

  it('lists each part with how far it has come, and every attempt at each run with how it came out', () => {
    const html = record(makeRun(m, fresh(), 'mixture-1'))
    for (const part of PART_IDS) expect(html).toContain(`<th scope="rowgroup" class="border-b p-2 text-left align-top font-semibold">${partTitle(data, part)}</th>`)
    expect(count(html, /<th scope="row"/g)).toBe(RUN_IDS.length)
    expect(text(html)).toContain(`Mixture 1, attempt 1✓ ${RECORD_TEXT.counts}`)
    expect(text(html)).toContain(`Mixture 2, attempt 1${RECORD_TEXT.open}`)
  })

  it('says how each run was timed: by hand, with how long after the change; at the change; or by hand, where there was no change to be late for', () => {
    const late = makeRun(m, fresh(), 'mixture-1', { stop: { delayMs: 430 } })
    const tenths = (state: ClockState, runId: RunId) => runView(m, state, runId).stopped!.tenths
    expect(record(late)).toContain(`<li>${RECORD_TEXT.timedByHandAfter(tenths(late, 'mixture-1'), 430)}</li>`)
    const atChange = makeRun(m, fresh(), 'mixture-2', { stop: 'end' })
    expect(record(atChange)).toContain(`<li>${RECORD_TEXT.timedByEnd(tenths(atChange, 'mixture-2'))}</li>`)
    const early = makeRun(m, fresh(), 'mixture-3', { stop: { earlyMs: 4000 } })
    expect(record(early)).toContain(`<li>${RECORD_TEXT.timedByHand(tenths(early, 'mixture-3'))}</li>`)
    expect(record(early)).toContain(runReasonText(m, 'stopped-early'))
    expect(record(early)).not.toContain('after the change')
  })

  it('keeps an attempt that did not count, with why, over the one made after it', () => {
    const again = makeRun(m, run(m, makeRun(m, fresh(), ICE, { stand: false }), [{ type: 'runAgain', run: ICE }]), ICE)
    const html = text(record(again))
    expect(html).toContain(`Mixture 1 in ice water, attempt 1${RECORD_TEXT.doesNotCount}`)
    expect(record(again)).toContain(escaped(runReasonText(m, 'not-at-temperature')))
    expect(html).toContain(`Mixture 1 in ice water, attempt 2✓ ${RECORD_TEXT.counts}`)
  })

  it("lists each working of a notebook with what was entered, and shows nothing of what a result is held to", () => {
    const state = done()
    const html = record(state)
    expect(html).toContain(LAB_TEXT.complete)
    expect(text(html)).toContain(`${RECORD_TEXT.working(1)}✓ ${RECORD_TEXT.counts}`)
    expect(html).toContain(`<li>${fieldLabel(data, 'order:iodide')}: order 1</li>`)
    expect(html).toContain(`${fieldLabel(data, 'first')}: 1/T = `)
    for (const words of kept) expect(html.includes(escaped(words)), words).toBe(false)
    // A notebook that has not been begun is not a working yet.
    expect(text(record(fresh()))).not.toContain(RECORD_TEXT.working(1))
  })
})

describe('where the Lab tab opens', () => {
  it('is the first part begun and not done, at the first of its runs that does not count yet; and at the notebook of part 3 once its runs count', () => {
    const state = makeRun(m, makeRun(m, fresh(), 'mixture-1'), 'mixture-2')
    expect(partProgress(m, state)).toEqual({ runs: 'runs', 'rate-law': 'not-started', temperature: 'not-started' })
    expect(openingEntry(m, state, ONE)).toBe(2)
    expect(openingEntry(m, fresh(), THREE)).toBe(0)
    expect(openingEntry(m, allTimed(), THREE)).toBe(NOTEBOOK)
    expect(openingEntry(m, allTimed(), ONE)).toBe(0)
    const html = draw(createElement(ClockBench, { data, m, sources, state: timed(), shown: true, reducedMotion: false, act: () => undefined }))
    expect(html).toMatch(new RegExp(`<h2[^>]*>${partTitle(data, TWO)}</h2>`))
  })
})

const SHELL_TEXT_CALCULATOR = 'Calculator'
