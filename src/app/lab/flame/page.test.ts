import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ACTIVITIES } from '@/app/activities'
import { wavelengthColor } from '@/app/explore/spectrum'
import { ROLE } from '@/app/lab/roles'
import { NARROW_NOTICE, SHELL_TEXT } from '@/app/lab/shellText'
import { labProgress } from '@/app/lab/useLabProgress'
import { WarningGroup } from '@/app/lab/WarningGroup'
import { createMemoryStore, saveEntry, type KeyValueStore } from '@/app/progress/storage'
import { flameCitations } from '@/chem-data/citations'
import { flameData as data } from '@/chem-data/flame/data'
import { FLAME_PRIMER, READ_FIRST } from '@/chem-data/flame/primer'
import sources from '@/chem-data/sources.json'
import { FLAME, HANDLING, QUESTIONS, can, createLab, flameStateSchema, looksOf, reduce, stationView, warnings, type Action, type FlameState, type Observation, type Seen } from '@/engine/flame'
import { run, stationScript } from '@/engine/flame/testkit'
import labCss from '../lab.css?raw'
import { FlameBench } from './FlameBench'
import { FlamePage } from './FlamePage'
import { FlameRecord } from './FlameRecord'
import flameCss from './flame.css?raw'
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
  choiceLabel,
  closingFeedback,
  featureCallout,
  flameText,
  lookLabel,
  lookName,
  loopText,
  observationFeedback,
  observationLines,
  stationTitle,
  unseenName,
} from './messages'
import { BAND_STOPS, stripPaint } from './stripColour'
import { BAND_INSET, LINE_GAP, LINE_WIDTH, MIN_WIDTH_PX, STRIP, hitAreas, xOf } from './stripGeometry'

// The flame test lab's page as markup, on a store the test holds. AppStateProvider builds its store from the
// browser and the media hook has no value on a server, so both are given directly. What a press does (Clean, Dip,
// the Guided warning, Hold, a look, the spectroscope's button, a check, Change, Previous and Next) is state, and is
// checked in a browser: a markup render mounts the page and no more.
const app = vi.hoisted(() => ({ store: undefined as unknown as KeyValueStore, persistent: true, wide: true }))
vi.mock('@/app/AppState', () => ({ useAppState: () => ({ store: app.store, persistent: app.persistent, reducedMotion: false }) }))
vi.mock('@/app/useMediaQuery', () => ({ useMediaQuery: () => app.wide }))

const [, , flame] = ACTIVITIES
const SCHEMA = flameStateSchema(data)
const draw = (element: ReactElement) => renderToStaticMarkup(createElement(MemoryRouter, null, element))
const escaped = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;')
const count = (html: string, pattern: RegExp) => [...html.matchAll(pattern)].length
/** What a reader meets: the tags gone, each run of them a single bar. */
const read = (html: string) => html.replace(/<[^>]+>/g, '|').replace(/\s*\|[\s|]*/g, '|')
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

const ids = data.salts.map((s) => s.id)
const [BA, CA, CU, K, NA, SR] = ids as [string, string, string, string, string, string]
const number = (stationId: string) => ids.indexOf(stationId)
const LAST = ids.length
const fresh = (mode: FlameState['mode'] = 'guided') => createLab(data, mode)
const clean: Action = { type: 'cleanLoop' }
const dip = (stationId: string): Action => ({ type: 'dipLoop', stationId })
const hold = (stationId: string): Action => ({ type: 'holdInFlame', stationId })
const record = (stationId: string, observation: Observation): Action => ({ type: 'recordObservation', stationId, observation })
/** A clean loop dipped at a station, then held in the flame there, then every part of both pictures looked at. */
const dipped = (stationId: string, mode?: FlameState['mode']) => run(data, fresh(mode), [clean, dip(stationId)])
const held = (stationId: string, mode?: FlameState['mode']) => run(data, dipped(stationId, mode), [hold(stationId)])
const lookedAt = (state: FlameState, stationId: string) => run(data, state, looksOf(data, state.stations[number(stationId)]!.held!).map((at): Action => ({ type: 'look', stationId, at })))
const looked = (stationId: string, mode?: FlameState['mode']) => lookedAt(held(stationId, mode), stationId)
/** The careless learner's station: the handled loop never cleaned, everything looked at, what a correct observation holds recorded. */
const careless = (stationId: string, mode?: FlameState['mode']) => run(data, fresh(mode), stationScript(data, stationId, [HANDLING]))
const done = (state: FlameState, ...stationIds: string[]) => stationIds.reduce((s, id) => run(data, s, stationScript(data, id)), state)
const allDone = (mode?: FlameState['mode']) => done(fresh(mode), ...ids)
const complete = run(data, allDone(), [{ type: 'answerClosing', choice: data.closing.answer.value }])
/** What a correct observation holds, as Guided is handed it. */
const expected = (stationId: string) => stationView(data, fresh('guided'), stationId).expected!
const WRONG: Observation = { colour: 'red', range: '400-475', kind: 'line' }

/** The Lab tab's bench on a state, opened at an entry, and that entry's own markup: the one that is not hidden. */
function bench(state: FlameState, at: string | number = BA, reducedMotion = false) {
  const html = draw(
    createElement(FlameBench, { data, sources, state, reducedMotion, can: (action: Action) => can(data, state, action), warn: (action: Action) => warnings(data, state, action), act: (action: Action) => reduce(data, state, action), opensAt: typeof at === 'number' ? at : number(at) }),
  )
  const entries = html.split(/(?=<div(?: hidden="")?><section aria-labelledby=)/).slice(1)
  const shown = entries.filter((entry) => !entry.startsWith('<div hidden'))
  return { html, entries, shown, station: shown[0]!.split('<div class="flex flex-wrap justify-between gap-2">')[0]! }
}
/** The cards of a station, by their h3. */
const cards = (station: string) => [...station.matchAll(/<h3[^>]*>(.*?)<\/h3>/g)].map((match) => match[1])
const card = (station: string, heading: string) => station.split(/(?=<section aria-labelledby="[^"]+" class="grid min-w-0 justify-items-start)/).find((part) => part.includes(`>${heading}</h3>`))!
const FLAME_PICTURE = '<svg viewBox="0 0 320 300"'
const STRIP_PICTURE = `<svg viewBox="0 0 ${STRIP.width} ${STRIP.height}"`
/** The buttons laid over the parts of a picture: each by the part it is, its name and where it lies, in hundredths of the picture. */
const parts = (html: string) =>
  [...html.matchAll(/<button type="button" data-part="([^"]+)" aria-label="([^"]+)"([^>]*)>(.*?)<\/button>/gs)].map(([, part, name, tag, body]) => {
    const [, left, top, width, height] = /style="left:([\d.]+)%;top:([\d.]+)%;width:([\d.]+)%;height:([\d.]+)%/.exec(tag!)!.map(Number)
    return { part: part!, name: name!, tag: tag!, body: body!, left: left!, top: top!, width: width!, height: height! }
  })
const fieldsets = (html: string) => [...html.matchAll(/<fieldset([^>]*)>(.*?)<\/fieldset>/gs)].map(([, tag, body]) => ({ tag: tag!, body: body!, legend: /<legend[^>]*>(.*?)<\/legend>/.exec(body!)![1]!, checked: [...body!.matchAll(/<input[^>]*checked=""[^>]*value="([^"]*)"/g)].map((match) => match[1]) }))
/** Everything a learner is not to be told before an observation that counts: what a correct one holds, what gives the light, and where to read of it. */
const kept = (stationId: string) => {
  const salt = data.salts[number(stationId)]!
  return {
    lines: observationLines(expected(stationId)),
    notes: salt.notes.map((note) => note.value),
    leftOut: salt.leftOut.map((left) => left.value),
    featureIds: salt.features.map((feature) => feature.id),
    // A molecule by its formula, which is not the salt's: CuCl is not CuCl₂.
    emitters: salt.features.flatMap((feature) => (feature.emitter.kind === 'molecule' ? [new RegExp(`${feature.emitter.formula}(?![₀-₉])`)] : [])),
  }
}

beforeEach(() => {
  app.store = createMemoryStore()
  app.persistent = true
  app.wide = true
})

describe('the flame test page', () => {
  const page = () => draw(createElement(FlamePage))
  const save = (state: FlameState) => saveEntry(app.store, flame.entry, flame.version, state)

  it("with nothing stored opens on the Primer tab with its six cards one at a time, three of them marked to read first, the mode choice in this lab's own words, and Start; and stores nothing", () => {
    const html = page()
    expect(flame).toMatchObject({ entry: 'lab:flame', to: '/lab/flame', kind: 'Lab' })
    expect(html).toMatch(new RegExp(`<h1[^>]*>${flame.title}</h1>`))
    expect(selectedTab(html)).toEqual(['Primer'])
    const [primer, lab, record] = panels(html)
    expect([primer!.shown, lab!.shown, record!.shown]).toEqual([true, false, false])
    expect(count(primer!.body, /<h2[^>]*>/g)).toBe(1)
    expect(primer!.body).toContain(`>${FLAME_PRIMER[0]!.heading}</h2>`)
    for (const section of FLAME_PRIMER) expect(primer!.body).toContain(`>${escaped(section.heading)}<`)
    expect(FLAME_PRIMER).toHaveLength(6)
    // In the list, on each of the three; and on the card shown, which is the first of them.
    expect(count(primer!.body, />Read first<\/span>/g)).toBe(READ_FIRST.length + 1)
    expect(READ_FIRST).toHaveLength(3)
    expect(html).toContain(escaped(MODE_TEXT.guided))
    expect(html).toContain(escaped(MODE_TEXT.challenge))
    expect(html).not.toContain(escaped(SHELL_TEXT.guided))
    expect(text(lab!.body)).toContain(SHELL_TEXT.notStarted)
    expect(text(record!.body)).toContain(SHELL_TEXT.noRecord)
    expect(buttons(html).some((one) => one.name === SHELL_TEXT.start)).toBe(true)
    expect(html).toContain('href="#/explore/elements"')
    expect(app.store.length).toBe(0)
  })

  it('reads its entry once when it mounts and writes nothing; the first write comes with Start or an action', () => {
    const state = held(CA)
    save(state)
    const before = app.store.getItem(app.store.key(0)!)
    const gets = vi.spyOn(app.store, 'getItem')
    const sets = vi.spyOn(app.store, 'setItem')
    page()
    expect(sets).not.toHaveBeenCalled()
    expect(gets.mock.calls.length).toBeGreaterThan(0)
    expect(app.store.getItem(app.store.key(0)!)).toBe(before)
    expect(labProgress(app.store, flame, SCHEMA).load()).toEqual(state)
  })

  it('with a run stored opens on the Lab tab, on the station the run was in the middle of, with Restart and no docked notebook; and the Record tab holds the record', () => {
    save(held(CA, 'challenge'))
    const html = page()
    expect(selectedTab(html)).toEqual(['Lab'])
    const [, lab, record] = panels(html)
    expect(lab!.body).toContain(`>${escaped(stationTitle(data, CA))}</h2>`)
    expect(lab!.body).not.toContain(`>${escaped(stationTitle(data, BA))}</h2>`)
    expect(buttons(html).some((one) => one.name === SHELL_TEXT.restart)).toBe(true)
    expect(buttons(html).some((one) => one.name === SHELL_TEXT.start)).toBe(false)
    expect(html).not.toContain('aria-label="Lab notebook"')
    expect(html).toContain(`${SHELL_TEXT.mode}: <span class="${ROLE.value}">${SHELL_TEXT.modeName.challenge}</span>`)
    expect(record!.body).toContain(`<caption class="mb-2 text-left font-medium">${RECORD_TEXT.caption}</caption>`)
  })

  it('sets aside a stored record that does not fit, says so, and starts fresh', () => {
    // A hold with a loop that does not carry the station's salt: nothing the reducer could have left.
    const state = fresh()
    saveEntry(app.store, flame.entry, flame.version, { ...state, stations: state.stations.map((station, i) => (i === 0 ? { ...station, held: [CA] } : station)) })
    const html = page()
    expect(html).toContain(escaped(SHELL_TEXT.setAside))
    expect(selectedTab(html)).toEqual(['Primer'])
    expect(buttons(html).some((one) => one.name === SHELL_TEXT.start)).toBe(true)
  })

  it('in a narrow window shows the notice on the Lab tab in place of the stations, the record on its tab, and nothing that changes a run', () => {
    save(done(fresh(), BA))
    app.wide = false
    const html = page()
    const [, lab, record] = panels(html)
    expect(text(lab!.body)).toContain(NARROW_NOTICE.title)
    expect(lab!.body).not.toContain('<h2')
    expect(record!.body).toContain(RECORD_TEXT.caption)
    for (const name of [SHELL_TEXT.start, SHELL_TEXT.restart, BENCH_TEXT.clean, BENCH_TEXT.dip]) expect(buttons(html).some((one) => one.name === name)).toBe(false)
    expect(html).not.toContain('type="radio"')
  })
})

describe('the list of stations', () => {
  const state = run(data, done(careless(BA), CA), [clean, dip(CU), hold(CU), ...stationScript(data, K).slice(0, -1), record(K, WRONG)])
  const { html, entries, shown } = bench(state, CU)
  const nav = /<nav aria-label="Stations"[^>]*>(.*?)<\/nav>/s.exec(html)![1]!
  const items = [...nav.matchAll(/<li>(.*?)<\/li>/gs)].map((match) => read(match[1]!))

  it('is a navigation named Stations that lists the six in order and then the closing question, each with its number and how far it has come in words beside a mark', () => {
    expect(items).toEqual([
      `|1.|${data.salts[0]!.name}|◑|${PROGRESS_TEXT['not-counted']}|`,
      `|2.|${data.salts[1]!.name}|✓|${PROGRESS_TEXT.done}|`,
      `|3.|${escaped(data.salts[2]!.name)}|◔|${PROGRESS_TEXT.started}|`,
      `|4.|${data.salts[3]!.name}|◑|${PROGRESS_TEXT['not-correct']}|`,
      `|5.|${data.salts[4]!.name}|○|${PROGRESS_TEXT['not-started']}|`,
      `|6.|${data.salts[5]!.name}|○|${PROGRESS_TEXT['not-started']}|`,
      `|7.|${CLOSING.heading}|○|${CLOSING_PROGRESS_TEXT.waits}|`,
    ])
    // The marks are for the eye: a screen reader is given the words.
    expect(count(nav, /<span aria-hidden="true"[^>]*>[○◔◑✓] <\/span>/g)).toBe(7)
    expect(nav).toContain(`<span aria-hidden="true" class="${ROLE.done}">✓ </span>`)
    expect(read(/<nav aria-label="Stations"[^>]*>(.*?)<\/nav>/s.exec(bench(allDone()).html)![1]!)).toContain(`|7.|${CLOSING.heading}|○|${CLOSING_PROGRESS_TEXT.open}|`)
    expect(read(/<nav aria-label="Stations"[^>]*>(.*?)<\/nav>/s.exec(bench(complete).html)![1]!)).toContain(`|7.|${CLOSING.heading}|✓|${CLOSING_PROGRESS_TEXT.done}|`)
  })

  it("folds behind a button named Stations, as the primer's topics do, and stays folded for longer: the strip is wide, and lab.css keeps the list from beside it until both have room", () => {
    const [folded, controls] = /<button[^>]*aria-expanded="false"[^>]*aria-controls="([^"]+)"[^>]*>(?:.*?)<\/button>/s.exec(nav)!
    expect(text(folded!)).toBe(STATION_TEXT.list)
    expect(folded).toContain('primer-topics-button')
    expect(nav).toContain(`<ol id="${controls}" class="primer-topics `)
    expect(html).toContain('<div class="primer-layout primer-layout-roomy">')
    const css = labCss.replace(/\/\*.*?\*\//gs, '').replace(/\s+/g, ' ')
    expect(css).toMatch(/@container primer \(min-width: 46rem\) and \(max-width: 57\.99rem\) \{ \.primer-layout-roomy \{ grid-template-columns: minmax\(0, 1fr\); \} \.primer-layout-roomy \.primer-topics-button \{ display: inline-flex; \} \.primer-layout-roomy \.primer-topics \{ display: none;/)
    // From 58rem the list has its 15rem and the gap, and the station beside it still has the strip's least width and more.
    expect(58 * 16 - 15 * 16 - 16).toBeGreaterThan(MIN_WIDTH_PX + 100)
  })

  it('shows one entry at a time, and draws no other until it is asked for', () => {
    expect(entries).toHaveLength(1)
    expect(shown).toHaveLength(1)
    expect(count(html, /<h2[^>]*>/g)).toBe(1)
    expect(html).toContain(`>${escaped(stationTitle(data, CU))}</h2>`)
  })

  it('says on the station where it stands and how far it has come, as the description of a heading that can take focus', () => {
    const [, placeId, place] = /<p id="([^"]+)" class="text-xs text-muted-foreground">(.*?)<\/p>/.exec(shown[0]!)!
    expect(read(place!)).toBe(`${STATION_TEXT.place(3, 6)} ·|◔|${PROGRESS_TEXT.started}|`)
    expect(shown[0]).toMatch(new RegExp(`<h2 id="[^"]+" tabindex="-1" aria-describedby="${placeId}"`))
  })

  it('offers Previous and Next, each named by where it goes; at the first there is no Previous, the last station goes on to the closing question, and at that there is no Next', () => {
    const ways = (at: string | number) => buttons(bench(state, at).html).map((one) => one.name).filter((name) => /^(←|Next)/.test(name))
    expect(ways(CU)).toEqual([`← ${STATION_TEXT.previous(stationTitle(data, CA))}`, `${STATION_TEXT.next(stationTitle(data, K))} →`])
    expect(ways(BA)).toEqual([`${STATION_TEXT.next(stationTitle(data, CA))} →`])
    expect(ways(SR)).toEqual([`← ${STATION_TEXT.previous(stationTitle(data, NA))}`, `${STATION_TEXT.next(CLOSING.heading)} →`])
    expect(ways(LAST)).toEqual([`← ${STATION_TEXT.previous(stationTitle(data, SR))}`])
  })

  it('has at its head a status line that is empty until the lab is complete, and then says so', () => {
    expect(html).toContain('<p role="status" class="text-sm font-medium"></p><div class="primer">')
    expect(html).not.toContain(BENCH_TEXT.complete)
    expect(bench(complete).html).toContain(`<p role="status" class="text-sm font-medium"><span aria-hidden="true" class="${ROLE.done}">✓ </span>${BENCH_TEXT.complete}</p><div class="primer">`)
  })

  it('opens on the closing question once the six stations are done', () => {
    const page = draw(createElement(FlameBench, { data, sources, state: allDone(), reducedMotion: false, can: () => null, warn: () => [], act: () => allDone() }))
    expect(count(page, /<h2[^>]*>/g)).toBe(1)
    expect(page).toContain(`>${CLOSING.heading}</h2>`)
  })
})

describe('a station before the loop is dipped there', () => {
  const { station } = bench(fresh(), CU)

  it('has two cards, the bottle and the loop: the flame waits for the dip, and the spectroscope and the questions for the flame', () => {
    expect(cards(station)).toEqual([BENCH_TEXT.bottle, BENCH_TEXT.loop])
    expect(station).not.toContain('<svg viewBox="0 0 320 300"')
    expect(station).not.toContain('type="radio"')
  })

  it("shows the solution as a tile named by it, with what it looks like in words, its bottle drawn with its label and, where it has a colour, its liquid in it, and its hazards closed", () => {
    const tile = card(station, BENCH_TEXT.bottle)
    const copper = data.salts[2]!
    expect(tile).toContain(`<div role="group" aria-label="${escaped(copper.name)}"`)
    expect(tile).toContain(`<h4 class="font-medium">${escaped(copper.name)}</h4>`)
    expect(appearanceText(data, CU)).toBe('light blue-green solution')
    expect(tile).toContain(`<p>${PAGE_TEXT.looks}: <span class="${ROLE.value}">light blue-green solution</span></p>`)
    // The bottle is 128 px tall, as the aqueous lab's is, and its label holds the formula, subscript and all, over the strength.
    expect(tile).toContain('<div class="h-32"><svg viewBox="0 0 80 110" aria-hidden="true"')
    expect([...tile.matchAll(/<text[^>]*>(.*?)<\/text>/g)].map((match) => match[1])).toEqual(['CuCl₂', '0.1 M'])
    expect(tile).toContain(`fill="${copper.appearance.value.hex}" fill-opacity="1"`)
    expect(count(tile, /<details><summary[^>]*>Hazards<\/summary>/g)).toBe(1)
    expect(tile).not.toContain('<details open')
    // A colourless solution is said so in words, and its bottle is drawn faint as the glass is.
    const barium = card(bench(fresh(), BA).station, BENCH_TEXT.bottle)
    expect(barium).toContain(`<span class="${ROLE.value}">colourless solution</span>`)
    expect(barium).not.toContain('fill-opacity="1"')
    expect([...barium.matchAll(/<text[^>]*>(.*?)<\/text>/g)].map((match) => match[1])).toEqual(['BaCl₂', '0.1 M'])
  })

  it("shows under the bottle's statements its note as three short paragraphs, and every document the note rests on", () => {
    for (const salt of data.salts) {
      const tile = card(bench(fresh(), salt.id).station, BENCH_TEXT.bottle)
      expect(tile).toContain(`<h4 class="font-medium">${escaped(salt.classifiedAs)}</h4>`)
      for (const statement of salt.hazards.statements) expect(tile).toContain(`<li>${escaped(statement)}</li>`)
      const paragraphs = salt.hazards.note.value.split('\n\n')
      expect(paragraphs).toHaveLength(3)
      expect(tile).toContain(paragraphs.map((paragraph) => `<p>${escaped(paragraph)}</p>`).join(''))
      const { note } = salt.hazards
      for (const id of [salt.hazards.sourceId, note.sourceId, note.alsoSourceId!, ...(note.moreSourceIds ?? [])]) expect(tile, id).toContain(escaped(sources.find((s) => s.id === id)!.citation))
    }
  })

  it("draws the loop and says its state in words in a status line: handled and not cleaned when the lab starts, and what it carries after that, this station's or another's", () => {
    const loop = card(station, BENCH_TEXT.loop)
    expect(loop).toContain('<svg viewBox="0 0 160 48" aria-hidden="true"')
    expect(loop).toContain(`<p role="status" class="max-w-prose flex-1 basis-56 font-medium">${loopText(data, [HANDLING], CU)}</p>`)
    expect(loopText(data, [HANDLING], CU)).toBe('The loop has been handled and has not been cleaned.')
    // A loop dipped at another station and brought here: the same loop, and this station says that it has not been cleaned since.
    const brought = card(bench(dipped(CA), CU).station, BENCH_TEXT.loop)
    expect(brought).toContain(`>${loopText(data, [CA], CU)}</p>`)
    expect(loopText(data, [CA], CU)).toBe('The loop carries calcium chloride solution. It has not been cleaned since.')
    // A film across the loop once it carries a solution, and none on one that carries nothing or only what handling left.
    expect(loop).toContain('fill-opacity="0" stroke="currentColor"')
    expect(brought).toContain('fill-opacity="0.22" stroke="currentColor"')
  })

  it('offers Clean and Dip, both available, says what the one step of cleaning is, and shows no warning until Dip is pressed', () => {
    const loop = card(station, BENCH_TEXT.loop)
    expect(buttons(loop).map((one) => one.name)).toEqual([BENCH_TEXT.clean, BENCH_TEXT.dip])
    for (const one of buttons(loop)) {
      expect(one.tag).not.toContain('aria-disabled')
      expect(one.tag).toContain('min-h-11')
    }
    expect(loop).toContain(`<p class="max-w-prose text-muted-foreground">${BENCH_TEXT.clean}: ${BENCH_TEXT.cleaning}</p>`)
    expect(loop).not.toContain('role="group"')
    expect(loop).not.toContain(WARNING_TEXT['loop-not-clean'].title)
    // The engine would raise it in Guided, for the handled loop the lab starts with, and not in Challenge.
    expect(warnings(data, fresh('guided'), dip(CU))).toEqual(['loop-not-clean'])
    expect(warnings(data, fresh('challenge'), dip(CU))).toEqual([])
  })
})

describe("Guided's warning, as the loop's card draws it", () => {
  it('is a group that can take focus, named by its title and described by its body, with the way back before the way on', () => {
    const html = renderToStaticMarkup(createElement(WarningGroup, { warnings: [{ id: 'loop-not-clean', ...WARNING_TEXT['loop-not-clean'] }], buttons: WARNING_BUTTONS, onBack: () => {}, onGoOn: () => {}, ref: null }))
    const [, labelledBy, describedBy] = /^<div role="group" tabindex="-1" aria-labelledby="([^"]+)" aria-describedby="([^"]+)"/.exec(html)!
    expect(html).toContain(`<p id="${labelledBy}" class="font-medium">${WARNING_TEXT['loop-not-clean'].title}</p>`)
    expect(html).toContain(`<p id="${describedBy}">${WARNING_TEXT['loop-not-clean'].body}</p>`)
    expect(buttons(html).map((one) => one.name)).toEqual([WARNING_BUTTONS.back, WARNING_BUTTONS.on])
    // Each is drawn small and has the 44 px hit area the shell's stylesheet lays over a small control.
    expect(buttons(html).every((one) => /class="[^"]*\blab-tap\b/.test(one.tag))).toBe(true)
    // Where the two wrap onto two rows (the titration lab's longer pair does, in its narrow slot), the rows are far enough apart that the hit area of one does not lie over the other's: 2rem of button and 0.75rem between them is the 2.75rem of an area.
    expect(html).toContain('<div class="flex flex-wrap gap-x-1.5 gap-y-3"><button')
  })
})

describe('a station once the loop is dipped there', () => {
  const { station } = bench(dipped(SR), SR)

  it('has a third card, the flame, with Hold available; it says that the loop has not been held yet, and draws no flame', () => {
    expect(cards(station)).toEqual([BENCH_TEXT.bottle, BENCH_TEXT.loop, BENCH_TEXT.flame])
    const flameCard = card(station, BENCH_TEXT.flame)
    expect(buttons(flameCard).map((one) => one.name)).toEqual([BENCH_TEXT.hold])
    expect(button(flameCard, BENCH_TEXT.hold)!.tag).not.toContain('aria-disabled')
    expect(flameCard).toMatch(new RegExp(`<p id="[^"]+" role="status">${BENCH_TEXT.notHeld}</p>`))
    expect(flameCard).not.toContain(FLAME_PICTURE)
    expect(flameCard).not.toContain('<ul')
  })

  it('does not show the card at a station whose solution the loop does not carry, whatever else it carries', () => {
    expect(cards(bench(dipped(SR), CA).station)).toEqual([BENCH_TEXT.bottle, BENCH_TEXT.loop])
  })
})

describe('a station once the loop is held in the flame', () => {
  const state = held(K, 'challenge')
  const { station } = bench(state, K)
  const flameCard = card(station, BENCH_TEXT.flame)

  it('has five cards: the spectroscope and the questions come with the flame', () => {
    expect(cards(station)).toEqual([BENCH_TEXT.bottle, BENCH_TEXT.loop, BENCH_TEXT.flame, BENCH_TEXT.spectroscope, BENCH_TEXT.observations])
  })

  it('draws the flame as a picture described by the line beside it, which says what to do with the pictures and is a status line', () => {
    const [, describedBy] = new RegExp(`${FLAME_PICTURE} role="img" aria-label="${escaped(PAGE_TEXT.flamePicture)}" aria-describedby="([^"]+)"`).exec(flameCard)!
    expect(flameCard).toContain(`<p id="${describedBy}" role="status">${BENCH_TEXT.explore}</p>`)
    expect(BENCH_TEXT.explore).toMatch(/Point at .*tap it.*keyboard/)
  })

  it('draws it on a dark card in both themes, in the colour the engine gives for what is on the loop, with its edge drawn and the burner under it', () => {
    for (const salt of data.salts) {
      const picture = card(bench(held(salt.id), salt.id).station, BENCH_TEXT.flame)
      expect(picture, salt.id).toContain('fill="#0b0f14"')
      expect(picture, salt.id).toMatch(new RegExp(`<path d="M 82 232 [^"]+" fill="${salt.flame.value.hex}" fill-opacity="0.9" stroke="#f4f4f5"`))
    }
    // A handled loop gives sodium's yellow at every station; two salts and no sodium give the colour of each, side by side.
    const yellow = data.salts[4]!.flame.value.hex
    expect(card(bench(run(data, fresh(), [dip(CA), hold(CA)]), CA).station, BENCH_TEXT.flame)).toContain(`fill="${yellow}" fill-opacity="0.9"`)
    const two = card(bench(run(data, fresh(), [clean, dip(CA), dip(SR), hold(SR)]), SR).station, BENCH_TEXT.flame)
    expect([...two.matchAll(/<stop offset="([\d.]+)" stop-color="(#[0-9A-Fa-f]{6})"/g)].map((match) => [match[1], match[2]])).toEqual([['0', data.salts[1]!.flame.value.hex], ['1', data.salts[5]!.flame.value.hex]])
    expect(two).toMatch(/<path d="M 82 232 [^"]+" fill="url\(#[^)]+\)"/)
  })

  it('lays one real button over the flame, named for the look it is, with a dashed edge until it has been looked at', () => {
    const [part, ...others] = parts(flameCard)
    expect(others).toEqual([])
    expect(part).toMatchObject({ part: FLAME, name: lookLabel(lookName({ spectrum: [] }, FLAME), false), body: '' })
    expect(part!.name).toBe('Look at the flame')
    expect(part!.tag).toContain('border-dashed')
    // A target a finger finds, where the picture has its 320 px of width.
    expect((part!.width / 100) * 320).toBeGreaterThanOrEqual(44)
    expect((part!.height / 100) * 300).toBeGreaterThanOrEqual(44)
    const seen = parts(card(bench(run(data, state, [{ type: 'look', stationId: K, at: FLAME }]), K).station, BENCH_TEXT.flame))[0]!
    expect(seen.name).toBe('Look at the flame, looked at')
    expect(seen.tag).not.toContain('border-dashed')
    expect(seen.tag).toContain('border-transparent')
  })

  it('says beside the flame whether it has been looked at: a mark and the words', () => {
    expect(read(/<ul class="grid gap-1">(.*?)<\/ul>/s.exec(flameCard)![1]!)).toBe(`|○|The flame: ${PAGE_TEXT.notLookedAt}|`)
    const seen = card(bench(run(data, state, [{ type: 'look', stationId: K, at: FLAME }]), K).station, BENCH_TEXT.flame)
    expect(read(/<ul class="grid gap-1">(.*?)<\/ul>/s.exec(seen)![1]!)).toBe(`|✓|The flame: ${PAGE_TEXT.lookedAt}|`)
  })

  it('flickers only where the reduced-motion setting allows, and then for under five seconds', () => {
    expect(flameCard).toContain('<g class="fl-flame">')
    expect(card(bench(state, K, true).station, BENCH_TEXT.flame)).not.toContain('fl-flame')
    const css = flameCss.replace(/\/\*.*?\*\//gs, '')
    const [, seconds, times] = /animation: fl-flicker ([\d.]+)s ease-in-out (\d+);/.exec(css)!
    expect(Number(seconds) * Number(times)).toBeLessThan(5)
    expect(css.match(/animation:/g)).toHaveLength(1)
  })

  it('keeps the spectroscope closed until its button is pressed: a button that says whether the strip is out, and no strip', () => {
    const scope = card(station, BENCH_TEXT.spectroscope)
    const [, controls] = /<button type="button"[^>]*aria-expanded="false" aria-controls="([^"]+)"[^>]*>Look through the spectroscope<\/button>/.exec(scope)!
    expect(scope).toContain(`<div id="${controls}" class="grid w-full gap-3"></div>`)
    expect(scope).not.toContain(STRIP_PICTURE)
    expect(button(scope, BENCH_TEXT.through)!.tag).toContain('min-h-11')
  })

  it('has a line for what a look shows, for a screen reader alone, beside the lines for what a press says: one in the loop\'s card, one in the flame\'s and one under the questions', () => {
    expect(station).toContain('<div class="sr-only"><p role="status"></p></div>')
    expect(count(station, /<p role="status"><\/p>/g)).toBe(4)
    for (const heading of [BENCH_TEXT.loop, BENCH_TEXT.flame, BENCH_TEXT.observations]) expect(count(card(station, heading), /<p role="status"><\/p>/g)).toBe(1)
  })

  it('says, where the loop has been cleaned or dipped again since, that the pictures are of the loop as it was held, and that Hold is the way to see what it gives now', () => {
    expect(flameCard).not.toContain(PAGE_TEXT.heldBefore)
    const cleaned = bench(run(data, state, [clean]), K).station
    expect(card(cleaned, BENCH_TEXT.flame)).toContain(`<p class="${ROLE.held}">${PAGE_TEXT.heldBefore}</p>`)
    // The flame stays to be looked at; Hold cannot be used until the loop is dipped here again, and stays focusable.
    expect(card(cleaned, BENCH_TEXT.flame)).toContain(FLAME_PICTURE)
    expect(button(card(cleaned, BENCH_TEXT.flame), BENCH_TEXT.hold)!.tag).toContain('aria-disabled="true"')
    expect(button(card(cleaned, BENCH_TEXT.flame), BENCH_TEXT.hold)!.tag).not.toContain(' disabled=""')
    expect(card(bench(run(data, state, [dip(CA)]), K).station, BENCH_TEXT.flame)).toContain(PAGE_TEXT.heldBefore)
  })
})

describe('the spectroscope, once a line or a band has been looked at', () => {
  const view = (state: FlameState, stationId: string) => stationView(data, state, stationId)
  /** A station with its flame and the first thing on its strip looked at: the strip is then out when the page opens. */
  const opened = (stationId: string, mode: FlameState['mode'] = 'challenge', before: Action[] = [clean]) => {
    const state = run(data, fresh(mode), [...before, dip(stationId), hold(stationId)])
    return run(data, state, looksOf(data, state.stations[number(stationId)]!.held!).slice(0, 2).map((at): Action => ({ type: 'look', stationId, at })))
  }
  const scope = (state: FlameState, stationId: string) => card(bench(state, stationId).station, BENCH_TEXT.spectroscope)
  /** A sharp line as the strip draws it: the dark gap it stands in, then its stroke, both the strip's whole height. */
  const lineMarkup = (seen: Seen) => {
    const width = Math.max(LINE_WIDTH, xOf(data.scale, seen.toNm) - xOf(data.scale, seen.fromNm))
    const left = (xOf(data.scale, seen.fromNm) + xOf(data.scale, seen.toNm)) / 2 - width / 2
    const { colour, strength } = stripPaint((seen.fromNm + seen.toNm) / 2, seen.feature.prominence)
    const tall = `y="${STRIP.top + 1}"`
    return `<g shape-rendering="crispEdges"><rect x="${left - LINE_GAP}" ${tall} width="${width + 2 * LINE_GAP}" height="${STRIP.tall - 2}" fill="#000000"></rect><rect x="${left}" ${tall} width="${width}" height="${STRIP.tall - 2}" fill="${colour}" opacity="${strength}"></rect></g>`
  }

  it('is out when the page opens, its button saying so, as a picture described by the line beside the flame', () => {
    const station = bench(opened(CA), CA).station
    const html = card(station, BENCH_TEXT.spectroscope)
    expect(html).toMatch(/<button type="button"[^>]*aria-expanded="true"[^>]*>Look through the spectroscope<\/button>/)
    const [, describedBy] = new RegExp(`${STRIP_PICTURE} role="img" aria-label="${escaped(PAGE_TEXT.stripPicture)}" aria-describedby="([^"]+)"`).exec(html)!
    expect(station).toContain(`<p id="${describedBy}" role="status">${BENCH_TEXT.explore}</p>`)
  })

  it('draws a black strip on a dark card over a scale with a mark every 20 nm, a number at every 100 nm and at its end, and the unit under it', () => {
    const html = scope(opened(CA), CA)
    expect(html).toContain('<div class="w-full overflow-x-auto rounded-lg p-2" style="background:#0b0f14">')
    expect(html).toContain(`<rect x="0.5" y="${STRIP.top}" width="${STRIP.width - 1}" height="${STRIP.tall}" rx="4" fill="#000000"`)
    expect(count(html, /<line x1="[\d.]+" x2="[\d.]+" y1="80" /g)).toBe(20)
    expect([...html.matchAll(/<text x="([\d.]+)"[^>]*>(\d+)<\/text>/g)].map((match) => [Number(match[2]), Number(match[1])])).toEqual([400, 500, 600, 700, 780].map((nm) => [nm, xOf(data.scale, nm)]))
    expect(html).toContain(`>${PAGE_TEXT.axis}</p>`)
    expect(PAGE_TEXT.axis).toBe('Wavelength in nanometres (nm)')
  })

  it('is never drawn narrower than its least width: in a narrower card it scrolls sideways, its scale with it', () => {
    const html = scope(opened(CA), CA)
    expect(html).toContain(`<div class="relative mx-auto max-w-[45rem]" style="min-width:${MIN_WIDTH_PX}px">`)
    // The scale and the unit are inside what scrolls.
    const scrolled = html.slice(html.indexOf('overflow-x-auto'), html.indexOf('<ul'))
    expect(scrolled).toContain(STRIP_PICTURE)
    expect(scrolled).toContain(PAGE_TEXT.axis)
    // The narrowest window that shows a bench, 768 px with the menu open, leaves the strip 447 px, and an upright tablet 499: it is scrolled at neither.
    expect(MIN_WIDTH_PX).toBeLessThanOrEqual(447)
  })

  it('draws every line and band of every salt where the record puts it, in the colour of its wavelength: a band as a stretch that fades at its two ends, the brightest whole and the others fainter', () => {
    for (const salt of data.salts) {
      const html = scope(opened(salt.id), salt.id)
      const picture = html.slice(html.indexOf(STRIP_PICTURE), html.indexOf('</svg>'))
      const { spectrum } = view(opened(salt.id), salt.id)
      expect(spectrum.map((seen) => seen.feature.id).sort()).toEqual(salt.features.map((feature) => feature.id).sort())
      for (const seen of spectrum) {
        const [from, to] = [xOf(data.scale, seen.fromNm), xOf(data.scale, seen.toNm)]
        const strength = seen.feature.prominence === 1 ? '1' : seen.feature.prominence === 2 ? '0.75' : '0.55'
        if (seen.feature.kind === 'band') {
          expect(picture, seen.feature.id).toMatch(new RegExp(`<rect x="${from}" y="${STRIP.top + 1 + BAND_INSET}" width="${to - from}" height="${STRIP.tall - 2 - 2 * BAND_INSET}" fill="url\\(#[^)]+\\)" opacity="${strength}"`))
        } else {
          expect(picture, seen.feature.id).toContain(lineMarkup(seen))
          expect(lineMarkup(seen)).toContain(`opacity="${strength}"`)
        }
      }
      // A band's two ends are soft, and along it the colour is that of each wavelength in it, at its rank.
      const bands = spectrum.filter((seen) => seen.feature.kind === 'band')
      expect(count(picture, /<linearGradient /g)).toBe(bands.length)
      for (const band of bands) {
        const stops = BAND_STOPS.map((offset) => `<stop offset="${offset}" stop-color="${stripPaint(band.fromNm + offset * (band.toNm - band.fromNm), band.feature.prominence).colour}" stop-opacity="${offset === 0 || offset === 1 ? 0 : 1}"></stop>`)
        expect(picture, band.feature.id).toContain(stops.join(''))
      }
    }
  })

  it('draws a sharp line as a thing of its own, at its wavelength: a thin stroke the whole height of the strip, taller than any band, with a dark gap either side of it and no glow', () => {
    // The stroke is where the record puts the line: its middle is the wavelength's place on the scale.
    for (const salt of data.salts) {
      const html = scope(opened(salt.id), salt.id)
      for (const seen of view(opened(salt.id), salt.id).spectrum.filter((one) => one.feature.kind === 'line')) {
        const [, x, width] = new RegExp(`<rect x="([\\d.]+)" y="${STRIP.top + 1}" width="([\\d.]+)" height="${STRIP.tall - 2}" fill="rgb`).exec(html.slice(html.indexOf(lineMarkup(seen))))!.map(Number)
        expect(x! + width! / 2, seen.feature.id).toBeCloseTo(xOf(data.scale, (seen.fromNm + seen.toNm) / 2), 9)
        expect(width, seen.feature.id).toBe(Math.max(LINE_WIDTH, xOf(data.scale, seen.toNm) - xOf(data.scale, seen.fromNm)))
      }
    }
    // Taller than a band, top and foot, and by enough to see where the picture is at its narrowest. The primer's card on the strip says that this is how the two are drawn.
    expect(FLAME_PRIMER.find((section) => section.id === 'spectroscope')!.paragraphs.map((p) => p.text).join(' ')).toContain('In this lab a line is drawn as a thin stroke the whole height of the strip, and a band as a wider stretch a little shorter')
    expect((BAND_INSET * MIN_WIDTH_PX) / STRIP.width).toBeGreaterThanOrEqual(5)
    expect((LINE_GAP * MIN_WIDTH_PX) / STRIP.width).toBeGreaterThanOrEqual(1.5)
    expect((LINE_WIDTH * MIN_WIDTH_PX) / STRIP.width).toBeGreaterThanOrEqual(2)
    // Barium: the atom's line is 3.5 nm from the end of the broad band. The band has faded out before the line's dark gap begins, and the gap is black.
    const barium = view(opened(BA), BA).spectrum
    const [band, line] = [barium.find((seen) => seen.feature.kind === 'band')!, barium.find((seen) => seen.feature.kind === 'line')!]
    expect(line.fromNm - band.toNm).toBeCloseTo(3.5481, 4)
    expect(xOf(data.scale, line.fromNm) - LINE_WIDTH / 2 - LINE_GAP).toBeGreaterThan(xOf(data.scale, band.toNm))
    // Its edges are drawn on the screen's own pixels and not smoothed into the black beside them: where the picture is at its narrowest a line is two pixels wide, and both are its whole colour.
    expect(lineMarkup(line)).toMatch(/^<g shape-rendering="crispEdges"><rect [^>]*fill="#000000"><\/rect><rect [^>]*fill="rgb\(\d+, \d+, \d+\)" opacity="0.75"><\/rect><\/g>$/)
    expect(scope(opened(BA), BA)).not.toContain('opacity="0.3"')
  })

  it('draws every line over every band, so that a line that stands inside a band on a loop that was not clean is cut out of it by its dark gap', () => {
    // Potassium on a loop that still carries copper(II) chloride: potassium's violet pair near 404 nm is inside copper's blue band.
    const state = opened(K, 'challenge', [clean, dip(CU)])
    const { spectrum } = view(state, K)
    const [band, line] = [spectrum.find((seen) => seen.feature.id === 'cucl-blue')!, spectrum.find((seen) => seen.feature.id === 'k-404')!]
    expect(band.fromNm < line.fromNm && line.toNm < band.toNm).toBe(true)
    const html = scope(state, K)
    const picture = html.slice(html.indexOf(STRIP_PICTURE), html.indexOf('</svg>'))
    expect(picture.lastIndexOf('fill="url(#')).toBeLessThan(picture.indexOf('<g shape-rendering'))
    for (const seen of spectrum.filter((one) => one.feature.kind === 'line')) expect(picture.indexOf(lineMarkup(seen)), seen.feature.id).toBeGreaterThan(picture.lastIndexOf('fill="url(#'))
  })

  it("draws potassium's deep red pair in a red that shows, not in the near-black the colour of 766 nm fades to", () => {
    const html = scope(opened(K), K)
    expect(wavelengthColor(768)).toBe('rgb(124, 0, 0)')
    expect(html).not.toContain('rgb(124, 0, 0)')
    expect(html).toContain(`fill="${stripPaint(740, 1).colour}"`)
  })

  it('lays a real button over each line and band, as tall as the strip and 44 px wide or more where the picture is at its narrowest, a thin line too, no two overlapping, each over or beside its own', () => {
    for (const salt of data.salts) {
      const { spectrum } = view(opened(salt.id), salt.id)
      const laid = parts(scope(opened(salt.id), salt.id))
      expect(laid.map((one) => one.part)).toEqual(spectrum.map((_, at) => String(at)))
      const areas = hitAreas(spectrum.map((seen) => ({ from: xOf(data.scale, seen.fromNm), to: xOf(data.scale, seen.toNm) })))
      laid.forEach((one, at) => {
        const px = (percent: number) => (percent / 100) * MIN_WIDTH_PX
        expect(px(one.width), `${salt.id} ${at}`).toBeGreaterThanOrEqual(44)
        expect((one.height / 100) * STRIP.height * (MIN_WIDTH_PX / STRIP.width), `${salt.id} ${at}`).toBeGreaterThanOrEqual(44)
        expect([one.top, one.height].map((percent) => (percent / 100) * STRIP.height).map(Math.round)).toEqual([STRIP.top, STRIP.tall])
        expect((one.left / 100) * STRIP.width).toBeCloseTo(areas[at]!.from, 6)
        expect(((one.left + one.width) / 100) * STRIP.width).toBeCloseTo(areas[at]!.to, 6)
      })
      const sorted = [...laid].sort((a, b) => a.left - b.left)
      sorted.forEach((one, at) => at > 0 && expect(one.left, salt.id).toBeGreaterThanOrEqual(sorted[at - 1]!.left + sorted[at - 1]!.width - 1e-9))
    }
  })

  it('names a line or a band by its place in the count until it has been looked at, and by what the look said from then on, in its button and in the list under the strip, with a dashed edge on the ones still to look at', () => {
    const state = opened(CA)
    const html = scope(state, CA)
    const laid = parts(html)
    expect(laid.map((one) => one.name)).toEqual(['Look at the line near 423 nm, looked at', 'Look at line or band 2 of 3, counting from the violet end', 'Look at line or band 3 of 3, counting from the violet end'])
    expect(laid.map((one) => one.tag.includes('border-dashed'))).toEqual([false, true, true])
    expect(laid.every((one) => one.body === '')).toBe(true)
    expect([...html.slice(html.lastIndexOf('<ul')).matchAll(/<li>(.*?)<\/li>/g)].map((match) => read(match[1]!))).toEqual([
      `|✓|The line near 423 nm: ${PAGE_TEXT.lookedAt}`,
      `|○|${unseenName(2, 3)}: ${PAGE_TEXT.notLookedAt}`,
      `|○|${unseenName(3, 3)}: ${PAGE_TEXT.notLookedAt}`,
    ])
  })

  it('shows on a loop that was not clean the lines and bands of everything on it, each with a button of its own', () => {
    const state = opened(SR, 'challenge', [])
    expect(view(state, SR).spectrum.map((seen) => seen.saltId)).toEqual([SR, NA, SR, SR])
    expect(parts(scope(state, SR))).toHaveLength(4)
  })
})

describe('what a station says before anything is looked at, and what it never says before an observation that counts', () => {
  it('says nowhere what the flame or the strip shows until a part is looked at: not the colour of the flame, and not where a line or a band is', () => {
    for (const salt of data.salts) {
      const state = held(salt.id, 'challenge')
      const view = stationView(data, state, salt.id)
      const station = bench(state, salt.id).station
      expect(station, salt.id).not.toContain(flameText(view.flame!))
      for (const seen of view.spectrum) {
        expect(station, seen.feature.id).not.toContain(featureCallout(seen, view.spectrum))
        expect(station, seen.feature.id).not.toContain(escaped(lookName(view, seen.feature.id)))
      }
      expect(station, salt.id).not.toMatch(/ checked=""/)
    }
  })

  it('in Challenge holds nothing of what a correct observation is, or of what gives the light, at any step short of an observation that counts: not in its words, and not in a name, an id or an attribute', () => {
    for (const salt of data.salts) {
      const id = salt.id
      const steps: [string, FlameState][] = [
        ['fresh', fresh('challenge')],
        ['dipped', dipped(id, 'challenge')],
        ['held', held(id, 'challenge')],
        ['everything looked at', looked(id, 'challenge')],
        ['recorded with a loop that was not clean', careless(id, 'challenge')],
        ['done again with a clean loop, as far as the looks', lookedAt(run(data, careless(id, 'challenge'), [clean, dip(id), hold(id)]), id)],
      ]
      const { lines, notes, leftOut, featureIds, emitters } = kept(id)
      for (const [step, state] of steps) {
        const { html } = bench(state, id)
        const where = `${id}, ${step}`
        for (const line of lines) expect(html, where).not.toContain(escaped(line))
        for (const sentence of [...notes, ...leftOut]) expect(html, where).not.toContain(escaped(sentence))
        for (const featureId of featureIds) expect(html, where).not.toContain(featureId)
        for (const emitter of emitters) expect(html, where).not.toMatch(emitter)
        expect(html, where).not.toContain(BENCH_TEXT.expected)
        expect(html, where).not.toContain(BENCH_TEXT.hints)
        expect(html, where).not.toContain(HINTS[0])
        expect(html, where).not.toContain(BENCH_TEXT.notes)
        expect(html, where).not.toContain('>Sources</summary><ul')
        expect(html, where).not.toContain(`#/explore/elements/${salt.metal.symbol}`)
        expect(html, where).not.toMatch(/\b(atom|molecule)s?\b/)
        // The one data attribute of the page's own is a part's: the flame, or a place in the count. (data-slot is the button component's, and says "button".)
        for (const [, name, value] of html.matchAll(/ (data-(?!slot)[a-z-]+)="([^"]*)"/g)) expect([name, /^(flame|\d+)$/.test(value!)], where).toEqual(['data-part', true])
        expect(new Set([...html.matchAll(/ data-slot="([^"]*)"/g)].map((match) => match[1])), where).toEqual(new Set(['button']))
      }
      // Where the questions are shown and nothing counts yet, the page says when the rest comes.
      expect(card(bench(careless(id, 'challenge'), id).station, BENCH_TEXT.observations)).toContain(`<p class="max-w-prose text-muted-foreground">${PAGE_TEXT.challengeHidden}</p>`)
    }
  })

  /** The closed list named Hints, with the five hints in it, as the questions' card draws it. */
  const HINTS_CLOSED = new RegExp(`<details><summary[^>]*>${BENCH_TEXT.hints}</summary><div[^>]*><ul[^>]*>${HINTS.map((hint) => `<li>${escaped(hint)}</li>`).join('')}</ul></div></details>`)

  it('in Challenge shows the hints and what a correct observation holds, each in a list that is closed, once an observation that counts is recorded, right or wrong', () => {
    const wrong = run(data, looked(CA, 'challenge'), [record(CA, WRONG)])
    for (const state of [wrong, done(fresh('challenge'), CA)]) {
      const observations = card(bench(state, CA).station, BENCH_TEXT.observations)
      expect(observations).toMatch(HINTS_CLOSED)
      expect(observations).toMatch(new RegExp(`<details><summary[^>]*>${BENCH_TEXT.expected}</summary>`))
      expect(observations).not.toContain('<details open')
      for (const line of observationLines(expected(CA))) expect(observations).toContain(`<li>${line}</li>`)
      expect(observations).not.toContain(PAGE_TEXT.challengeHidden)
    }
  })

  it('in Guided has the hints ready over the questions and what a correct observation holds ready under them, each in a list that is closed and named for what opening it shows: no hint stands open at any station', () => {
    for (const salt of data.salts) {
      const station = bench(held(salt.id, 'guided'), salt.id).station
      const observations = card(station, BENCH_TEXT.observations)
      expect(observations, salt.id).toMatch(HINTS_CLOSED)
      expect(observations.indexOf(BENCH_TEXT.hints)).toBeLessThan(observations.indexOf('<form'))
      expect(observations.indexOf('</form>')).toBeLessThan(observations.indexOf(BENCH_TEXT.expected))
      expect(observations).toMatch(new RegExp(`<details><summary[^>]*>${BENCH_TEXT.expected}</summary>`))
      // Nothing of either stands open: each hint and each of the three lines is inside its closed list and nowhere else in the station.
      expect(station, salt.id).not.toContain('<details open')
      for (const hint of HINTS) expect(station.split(escaped(hint)), salt.id).toHaveLength(2)
      for (const line of observationLines(expected(salt.id))) expect(station.split(line), salt.id).toHaveLength(2)
    }
  })
})

describe('the three questions', () => {
  const form = (state: FlameState, stationId: string) => card(bench(state, stationId).station, BENCH_TEXT.observations)

  it('are three groups of radio buttons of one name each, with a choice for every answer in the order the engine gives, none chosen', () => {
    const groups = fieldsets(form(held(BA), BA))
    expect(groups.map((group) => group.legend)).toEqual(QUESTIONS.map((question) => QUESTION_LABEL[question]))
    expect(groups.map((group) => [...group.body.matchAll(/<label[^>]*><input[^>]*type="radio"[^>]*\/>(.*?)<\/label>/g)].map((match) => match[1]))).toEqual([
      ['blue-green', 'lilac', 'orange-red', 'pale green', 'red', 'yellow'],
      ['400 to 475 nm', '475 to 570 nm', '570 to 600 nm', '600 to 650 nm', '650 to 700 nm', '700 to 780 nm'],
      ['a sharp line', 'a broad band'],
    ])
    for (const group of groups) {
      expect(new Set([...group.body.matchAll(/name="([^"]+)"/g)].map((match) => match[1])).size).toBe(1)
      expect(group.checked).toEqual([])
      expect(count(group.body, /class="flex min-h-11 cursor-pointer/g)).toBeGreaterThan(1)
    }
    // The same choices in the same order at every station: no station's answer is given by its place.
    for (const id of ids) expect(fieldsets(form(held(id), id)).map((group) => text(group.body))).toEqual(groups.map((group) => text(group.body)))
  })

  it('keeps each closed, with what to look at first as visible text under it, until its own looks are made: the flame for the first, every line and band for the other two', () => {
    const closed = fieldsets(form(held(CA), CA))
    expect(closed.map((group) => group.tag.includes('disabled=""'))).toEqual([true, true, true])
    expect(closed.map((group) => /<p class="lab-held">(.*?)<\/p>/.exec(group.body)![1])).toEqual(QUESTIONS.map((question) => LOOK_FIRST[question]))
    const flameSeen = fieldsets(form(run(data, held(CA), [{ type: 'look', stationId: CA, at: FLAME }]), CA))
    expect(flameSeen.map((group) => group.tag.includes('disabled=""'))).toEqual([false, true, true])
    expect(flameSeen[0]!.body).not.toContain('lab-held')
    expect(flameSeen[0]!.body).toContain(`<legend class="mb-1.5 font-medium ${ROLE.entry}">`)
    // One line or band still to look at keeps the two closed.
    const [first] = looksOf(data, [CA]).slice(1)
    expect(fieldsets(form(run(data, held(CA), [{ type: 'look', stationId: CA, at: first! }]), CA)).map((group) => group.tag.includes('disabled=""'))).toEqual([true, true, true])
    expect(fieldsets(form(looked(CA), CA)).map((group) => group.tag.includes('disabled=""'))).toEqual([false, false, false])
  })

  it('has one button that checks the observations, unavailable and still focusable while no answer is chosen', () => {
    const check = button(form(looked(CA), CA), BENCH_TEXT.check)!
    expect(check.tag).toContain('type="submit"')
    expect(check.tag).toContain('aria-disabled="true"')
    expect(check.tag).not.toContain(' disabled=""')
    expect(check.tag).toContain('min-h-11')
  })
})

describe('a recorded observation', () => {
  const observations = (state: FlameState, stationId: string) => card(bench(state, stationId).station, BENCH_TEXT.observations)

  it('made with a loop that was not clean is told that it does not count, and why, as a reason and with no tick or cross; the answers stay as chosen and open, and the way on is offered under them', () => {
    const state = careless(CA, 'guided')
    const view = stationView(data, state, CA)
    expect(view).toMatchObject({ counts: false, wrong: null })
    const html = observations(state, CA)
    const feedback = observationFeedback(data, view)
    expect(feedback).toMatch(/^This observation does not count, whatever it holds: the loop was not clean\./)
    expect(html).toContain(`<p role="status" class="${ROLE.held}">${feedback}</p>`)
    expect(html).not.toMatch(/[✓✕] <\/span>This observation/)
    const groups = fieldsets(html)
    expect(groups.map((group) => group.checked)).toEqual(Object.values(expected(CA)).map((answer) => [answer]))
    expect(groups.map((group) => group.tag.includes('disabled=""'))).toEqual([false, false, false])
    expect(html).not.toContain(PAGE_TEXT.lookAgain)
    // The way on: the button of the loop's card again, after the form.
    const after = html.slice(html.indexOf('</form>'))
    expect(buttons(after).map((one) => one.name)).toEqual([BENCH_TEXT.clean])
    expect(buttons(after)[0]!.tag).toContain('min-h-11')
    // The station's place says which kind of unfinished it is.
    expect(read(bench(state, CA).station)).toContain(`|◑|${PROGRESS_TEXT['not-counted']}|`)
  })

  it('made with a clean loop and not right keeps its questions open with what was chosen, says which to look at again and never the answer, and marks each such question in words', () => {
    const answers: Observation = { ...expected(SR), colour: 'yellow', kind: 'line' }
    const state = run(data, looked(SR), [record(SR, answers)])
    const html = observations(state, SR)
    expect(html).toContain(`<p role="status"><span aria-hidden="true" class="${ROLE.failed}">✕ </span>Not yet. Look again at the colour of the flame and whether the brightest thing is a line or a band.</p>`)
    const groups = fieldsets(html)
    expect(groups.map((group) => group.checked)).toEqual([['yellow'], [answers.range], ['line']])
    expect(groups.map((group) => group.body.includes(`<span aria-hidden="true">✕ </span>${PAGE_TEXT.lookAgain}</p>`))).toEqual([true, false, true])
    expect(groups[0]!.tag).toMatch(/aria-describedby="[^"]+again"/)
    expect(buttons(html.slice(html.indexOf('</form>')))).toEqual([])
    expect(read(bench(state, SR).station)).toContain(`|◑|${PROGRESS_TEXT['not-correct']}|`)
  })

  it('that is what the flame shows is shown with its questions disabled and what was chosen, says so beside a tick, offers Change, and the station says that it is done', () => {
    const state = done(fresh('challenge'), CU)
    const { station } = bench(state, CU)
    const html = observations(state, CU)
    expect(html).toContain(`<p role="status"><span aria-hidden="true" class="${ROLE.done}">✓ </span>That is what this flame shows.</p>`)
    const groups = fieldsets(html)
    expect(groups.map((group) => group.checked)).toEqual(Object.values(expected(CU)).map((answer) => [answer]))
    expect(groups.every((group) => group.tag.includes('disabled=""'))).toBe(true)
    expect(buttons(html.slice(html.indexOf('<form'), html.indexOf('</form>'))).map((one) => one.name)).toEqual([PAGE_TEXT.change])
    expect(station).toContain(`<p role="status" class="text-sm font-medium"><span aria-hidden="true" class="${ROLE.done}">✓ </span>${BENCH_TEXT.done}</p>`)
    expect(read(station)).toContain(`|${STATION_TEXT.place(3, 6)} ·|✓|${PROGRESS_TEXT.done}|`)
  })

  it('made at an earlier hold is not shown in the form of a new one: the questions are empty and closed again, and nothing is said of the old answers', () => {
    const again = run(data, careless(CA, 'guided'), [clean, dip(CA), hold(CA)])
    const html = observations(again, CA)
    const groups = fieldsets(html)
    expect(groups.map((group) => group.checked)).toEqual([[], [], []])
    expect(groups.map((group) => group.tag.includes('disabled=""'))).toEqual([true, true, true])
    expect(html).toContain('<p role="status"></p>')
    expect(html).not.toContain('does not count')
    expect(buttons(html.slice(html.indexOf('</form>')))).toEqual([])
    // It is still the station's observation, in the list and in the record, until another is recorded.
    expect(read(bench(again, CA).station)).toContain(`|◑|${PROGRESS_TEXT['not-counted']}|`)
  })
})

describe('a station that is done', () => {
  it('shows its notes, what the strip leaves out, a link to the card of its metal that opens in a new tab, and its Sources; and none of them before', () => {
    for (const salt of data.salts) {
      const { station } = bench(done(fresh('challenge'), salt.id), salt.id)
      expect(cards(station), salt.id).toEqual([BENCH_TEXT.bottle, BENCH_TEXT.loop, BENCH_TEXT.flame, BENCH_TEXT.spectroscope, BENCH_TEXT.observations, BENCH_TEXT.notes])
      const notes = card(station, BENCH_TEXT.notes)
      expect([...notes.slice(0, notes.indexOf('</div>')).matchAll(/<p>(.*?)<\/p>/g)].map((match) => match[1])).toEqual(salt.notes.map((note) => escaped(note.value)))
      if (salt.leftOut.length > 0) {
        expect(notes).toContain(`<h4 class="font-medium">${BENCH_TEXT.leftOut}</h4>`)
        expect([...notes.slice(0, notes.indexOf('<a href')).matchAll(/<li>(.*?)<\/li>/g)].map((match) => match[1])).toEqual(salt.leftOut.map((left) => escaped(left.value)))
      } else {
        expect(notes).not.toContain(BENCH_TEXT.leftOut)
      }
      const [, link] = new RegExp(`<a href="#/explore/elements/${salt.metal.symbol}" target="_blank" rel="noopener"[^>]*>(.*?)</a>`).exec(notes)!
      expect(link!.replace(/<svg[^>]*aria-hidden="true">.*?<\/svg>/, '|')).toBe(`${PAGE_TEXT.elementCard(salt.metal.name)}|<span class="sr-only">${SHELL_TEXT.newTab}</span>`)
      // The station's own Sources, after the notes: every source the station rests on, and what Valence works out.
      const foot = station.slice(station.lastIndexOf('<details>'))
      expect(foot).toMatch(/^<details><summary[^>]*>Sources<\/summary>/)
      for (const { source } of flameCitations(data, salt.id, sources)) expect(foot, source.id).toContain(escaped(source.citation))
      expect(foot).toContain(escaped(PAGE_TEXT.sources))
      // Before: no notes, no link and no Sources but those of the bottle's hazards.
      const before = bench(looked(salt.id, 'guided'), salt.id).station
      expect(before).not.toContain(BENCH_TEXT.notes)
      expect(before).not.toContain(`#/explore/elements/${salt.metal.symbol}`)
      expect(count(before, />Sources<\/summary>/g)).toBe(1)
      expect(count(station, />Sources<\/summary>/g)).toBe(2)
    }
    expect(PAGE_TEXT.elementCard('barium')).toBe('Barium on the periodic table')
    expect(data.salts.filter((salt) => salt.leftOut.length === 0).map((salt) => salt.id)).toEqual([NA])
  })
})

describe('the closing question', () => {
  const closing = (state: FlameState) => bench(state, LAST).station
  const labels = data.closing.choices.map((choice) => CLOSING.choices[choice]!)

  it('is the last entry: a heading that can take focus, with where it stands and how far it has come, and the question as the name of one group of radio buttons', () => {
    const html = closing(allDone())
    const [, placeId, place] = /<p id="([^"]+)" class="text-xs text-muted-foreground">(.*?)<\/p>/.exec(html)!
    expect(read(place!)).toBe(`${STATION_TEXT.closingPlace} ·|○|${CLOSING_PROGRESS_TEXT.open}|`)
    expect(html).toMatch(new RegExp(`<h2 id="[^"]+" tabindex="-1" aria-describedby="${placeId}"[^>]*>${CLOSING.heading}</h2>`))
    const [group, ...others] = fieldsets(html)
    expect(others).toEqual([])
    expect(group!.legend).toBe(escaped(CLOSING.question))
    expect([...group!.body.matchAll(/<label[^>]*><input[^>]*type="radio"[^>]*\/>(.*?)<\/label>/g)].map((match) => match[1])).toEqual(labels)
    expect(group!.checked).toEqual([])
    expect(group!.tag).not.toContain('disabled=""')
    expect(buttons(html).map((one) => one.name)).toEqual([PAGE_TEXT.checkAnswer])
    // Asked in both modes, and nothing on it says which choice it wants.
    expect(closing(allDone('challenge'))).toBe(closing(allDone('guided')))
    for (const choice of data.closing.choices) expect(html).not.toContain(escaped(closingFeedback(choice)))
  })

  it('waits for the six stations: it is there, disabled, with the reason under it as visible text', () => {
    const html = closing(done(fresh(), BA, CA))
    const [group] = fieldsets(html)
    expect(group!.tag).toContain('disabled=""')
    expect(group!.body).toContain(`<p class="${ROLE.held}">${CLOSING.waits}</p>`)
    expect(read(html)).toContain(`|${STATION_TEXT.closingPlace} ·|○|${CLOSING_PROGRESS_TEXT.waits}|`)
    expect(button(html, PAGE_TEXT.checkAnswer)!.tag).toContain('aria-disabled="true"')
  })

  it('tells a wrong answer why it cannot be the answer, beside a cross, leaves it to be changed, and does not say what the answer is', () => {
    for (const choice of data.closing.choices.filter((one) => one !== data.closing.answer.value)) {
      const html = closing(run(data, allDone(), [{ type: 'answerClosing', choice }]))
      expect(html, choice).toContain(`<p role="status"><span aria-hidden="true" class="${ROLE.failed}">✕ </span>${escaped(closingFeedback(choice))}</p>`)
      const [group] = fieldsets(html)
      expect(group!.checked).toEqual([choice])
      expect(group!.tag).not.toContain('disabled=""')
      expect(html).not.toContain(escaped(closingFeedback(data.closing.answer.value)))
      expect(read(html)).toContain(`|◑|${CLOSING_PROGRESS_TEXT['not-correct']}|`)
    }
  })

  it('tells the right answer why it is, beside a tick; the lab is then complete, the question shows the answer and takes no other, and says why', () => {
    const html = closing(complete)
    expect(html).toContain(`<p role="status"><span aria-hidden="true" class="${ROLE.done}">✓ </span>${escaped(closingFeedback(data.closing.answer.value))}</p>`)
    const [group] = fieldsets(html)
    expect(group!.checked).toEqual([data.closing.answer.value])
    expect(group!.tag).toContain('disabled=""')
    const [, heldId] = new RegExp(`<p id="([^"]+)" class="text-sm ${ROLE.held}">${escaped(BLOCKED_TEXT['lab-completed'])}</p>`).exec(html)!
    expect(button(html, PAGE_TEXT.checkAnswer)!.tag).toContain(`aria-disabled="true" aria-describedby="${heldId}"`)
    expect(read(html)).toContain(`|✓|${CLOSING_PROGRESS_TEXT.done}|`)
  })
})

describe('a lab that is complete', () => {
  const { station } = bench(complete, NA)

  it('says on each station that it is done, and once, at its head, why nothing more is taken: the one sentence that describes the form\'s button', () => {
    const [, heldId] = new RegExp(`<p id="([^"]+)" class="text-sm ${ROLE.held}">${escaped(BLOCKED_TEXT['lab-completed'])}</p>`).exec(station)!
    expect(count(station, new RegExp(escaped(BLOCKED_TEXT['lab-completed']), 'g'))).toBe(1)
    expect(station).toContain(BENCH_TEXT.done)
    expect(button(station, BENCH_TEXT.check)!.tag).toContain(`aria-disabled="true" aria-describedby="${heldId}"`)
    expect(fieldsets(station).every((group) => group.tag.includes('disabled=""'))).toBe(true)
  })

  it('leaves Clean, Dip and Hold focusable and unavailable, and the flame to be looked at', () => {
    for (const name of [BENCH_TEXT.clean, BENCH_TEXT.dip, BENCH_TEXT.hold]) {
      expect(button(station, name)!.tag, name).toContain('aria-disabled="true"')
      expect(button(station, name)!.tag, name).not.toContain(' disabled=""')
    }
    expect(parts(station).map((one) => one.part)).toEqual([FLAME, '0'])
    expect(parts(station).every((one) => !one.tag.includes('disabled'))).toBe(true)
  })
})

describe('the record', () => {
  const recorded = run(data, done(careless(BA, 'challenge'), CA), [...stationScript(data, K).slice(0, -1), record(K, WRONG)])
  const drawn = (state: FlameState) => draw(createElement(FlameRecord, { data, state }))
  const rows = (html: string) => [...html.matchAll(/<tr>(.*?)<\/tr>/gs)].slice(1).map((match) => [...match[1]!.matchAll(/<t[hd][^>]*>(.*?)<\/t[hd]>/gs)].map((cell) => read(`<i>${cell[1]}</i>`).replace(/^\||\|$/g, '')))

  it('is one table with a caption and five headed columns, a row for each of the six stations headed by the station, in a region that the keyboard can scroll', () => {
    const html = drawn(recorded)
    expect(html).toContain(`<div role="region" aria-label="${RECORD_TEXT.region}" tabindex="0"`)
    expect(count(html, /<table/g)).toBe(1)
    expect(html).toContain(`<caption class="mb-2 text-left font-medium">${RECORD_TEXT.caption}</caption>`)
    expect([...html.matchAll(/<th scope="col"[^>]*>(.*?)<\/th>/g)].map((match) => match[1])).toEqual([RECORD_TEXT.station, ...QUESTIONS.map((question) => QUESTION_LABEL[question]), RECORD_TEXT.result])
    expect([...html.matchAll(/<th scope="row"[^>]*>(.*?)<\/th>/g)].map((match) => match[1])).toEqual(ids.map((id) => escaped(stationTitle(data, id))))
  })

  it('gives the three answers as they were recorded, and whether the observation counted and is correct, in words', () => {
    const answers = (observation: Observation) => QUESTIONS.map((question) => choiceLabel(question, observation[question]))
    expect(rows(drawn(recorded))).toEqual([
      [stationTitle(data, BA), ...answers(expected(BA)), RECORD_TEXT.notCounted],
      [stationTitle(data, CA), ...answers(expected(CA)), `✓|${RECORD_TEXT.correct}`],
      [stationTitle(data, CU), ...Array<string>(4).fill(RECORD_TEXT.notRecorded)],
      [stationTitle(data, K), ...answers(WRONG), RECORD_TEXT.notCorrect],
      [stationTitle(data, NA), ...Array<string>(4).fill(RECORD_TEXT.notRecorded)],
      [stationTitle(data, SR), ...Array<string>(4).fill(RECORD_TEXT.notRecorded)],
    ])
    const html = drawn(recorded)
    expect(html).toContain(`<span class="${ROLE.held}">${RECORD_TEXT.notCounted}</span>`)
    expect(html).toContain(`<span class="${ROLE.failed}">${RECORD_TEXT.notCorrect}</span>`)
  })

  it('gives no answer: nothing of what a station expects that the learner has not recorded, and nothing of the closing question but what was answered', () => {
    const html = drawn(fresh('challenge'))
    for (const id of ids) for (const answer of Object.values(expected(id))) for (const question of QUESTIONS) expect(html).not.toContain(`>${choiceLabel(question, answer)}<`)
    expect(html).toContain(CLOSING.question)
    expect(read(html)).toContain(`|${RECORD_TEXT.answer}:|${RECORD_TEXT.notAnswered}|`)
    for (const label of Object.values(CLOSING.choices)) expect(html).not.toContain(label)
  })

  it('gives the closing answer as it was last given and whether it is right, and says that the lab is complete once it is, and not before', () => {
    const wrong = drawn(run(data, allDone(), [{ type: 'answerClosing', choice: 'water' }]))
    expect(read(wrong)).toContain(`|${RECORD_TEXT.answer}:|${CLOSING.choices.water}|.|${RECORD_TEXT.notCorrect}|`)
    expect(wrong).not.toContain(BENCH_TEXT.complete)
    expect(drawn(allDone())).not.toContain(BENCH_TEXT.complete)
    const html = drawn(complete)
    expect(read(html)).toContain(`|${RECORD_TEXT.answer}:|${CLOSING.choices[data.closing.answer.value]}|.|✓|${RECORD_TEXT.correct}|`)
    expect(html).toContain(`<p class="font-medium"><span aria-hidden="true" class="${ROLE.done}">✓ </span>${BENCH_TEXT.complete}</p>`)
  })
})
