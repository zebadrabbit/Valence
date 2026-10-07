import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ACTIVITIES } from '@/app/activities'
import { ROLE } from '@/app/lab/roles'
import { HAZARDS_TEXT, NARROW_NOTICE, SHELL_TEXT } from '@/app/lab/shellText'
import { labProgress } from '@/app/lab/useLabProgress'
import { createMemoryStore, saveEntry, type KeyValueStore } from '@/app/progress/storage'
import { aqueousData as data } from '@/chem-data/aqueous/data'
import { AQUEOUS_PRIMER } from '@/chem-data/aqueous/primer'
import { stationCitations } from '@/chem-data/citations'
import sources from '@/chem-data/sources.json'
import { FORMS, aqueousStateSchema, can, createLab, expectedObservation, reduce, stationView, type Action, type AqueousState } from '@/engine/aqueous'
import { correctEntry, run, stationScript } from '@/engine/aqueous/testkit'
import { AqueousBench } from './AqueousBench'
import { AqueousPage } from './AqueousPage'
import { AqueousRecord } from './AqueousRecord'
import { EquationLine } from './Formula'
import {
  BENCH_TEXT,
  FIELD_LABEL,
  FORM_LABEL,
  MODE_TEXT,
  PAGE_TEXT,
  PROBLEM_TEXT,
  PROGRESS_TEXT,
  RECORD_TEXT,
  SOLUBILITY_TEXT,
  STATE_KEY,
  STATION_TEXT,
  TOOL_LABEL,
  blockedText,
  equationText,
  expectedLines,
  observationFeedback,
  seenText,
  stationTitle,
  toolFirstText,
} from './messages'
import { SolubilityGrid } from './SolubilityTable'
import aqueousCss from './aqueous.css?raw'

// The aqueous reactions lab's page as markup, on a store the test holds. AppStateProvider builds its store from the
// browser and the media hook has no value on a server, so both are given directly. What a press does (Mix, a tool,
// a check, the palette and its two sides, Change, Previous and Next, the two panels) is state, and is checked in a
// browser: a markup render mounts the page and no more.
const app = vi.hoisted(() => ({ store: undefined as unknown as KeyValueStore, persistent: true, wide: true }))
vi.mock('@/app/AppState', () => ({ useAppState: () => ({ store: app.store, persistent: app.persistent, reducedMotion: false }) }))
vi.mock('@/app/useMediaQuery', () => ({ useMediaQuery: () => app.wide }))

const [, aqueous] = ACTIVITIES
const SCHEMA = aqueousStateSchema(data)
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
/** The class a button that cannot be used is drawn faint with, as its own class and not as a variant of one. */
const FAINT = /(?<![:\w-])opacity-50/
/** Every button, by its opening tag and its text. */
const buttons = (html: string) => [...html.matchAll(/<button([^>]*)>(.*?)<\/button>/gs)].map(([, tag, body]) => ({ tag: tag!, name: text(body!) }))

const fresh = (mode: AqueousState['mode'] = 'guided') => createLab(data, mode)
const done = (state: AqueousState, ...stationIds: string[]) => stationIds.reduce((s, id) => run(data, s, stationScript(data, id)), state)
const complete = done(fresh(), ...data.stations.map((s) => s.id))
const number = (stationId: string) => data.stations.findIndex((s) => s.id === stationId)

/** The Lab tab's bench on a state, opened at a station, and that station's own markup: the one that is not hidden. */
function bench(state: AqueousState, stationId = 'aq-01', reducedMotion = false) {
  const html = draw(createElement(AqueousBench, { data, sources, state, reducedMotion, can: (action: Action) => can(data, state, action), act: () => {}, opensAt: number(stationId) }))
  const stations = html.split(/(?=<div(?: hidden="")?><section aria-labelledby=)/).slice(1)
  const shown = stations.filter((station) => !station.startsWith('<div hidden'))
  return { html, stations, shown, station: shown[0]!.split('<div class="flex flex-wrap justify-between gap-2">')[0]! }
}
/** The cards of a station, by their h3. */
const cards = (station: string) => [...station.matchAll(/<h3[^>]*>(.*?)<\/h3>/g)].map((match) => match[1])
const card = (station: string, heading: string) => station.split(/(?=<section aria-labelledby="[^"]+" class="grid min-w-0 justify-items-start)/).find((part) => part.includes(`>${heading}</h3>`))!
const builder = (station: string, form: (typeof FORMS)[number]) => station.split(/(?=<form [^>]*aria-labelledby)/).find((part) => part.includes(`>${FORM_LABEL[form]}</h4>`))!.split('</form>')[0]!

beforeEach(() => {
  app.store = createMemoryStore()
  app.persistent = true
  app.wide = true
})

describe('the aqueous reactions page', () => {
  const page = () => draw(createElement(AqueousPage))
  const save = (state: AqueousState) => saveEntry(app.store, aqueous.entry, aqueous.version, state)

  it('with nothing stored opens on the Primer tab with its ten cards one at a time, the mode choice in this lab\'s own words, and Start; and stores nothing', () => {
    const html = page()
    expect(html).toMatch(new RegExp(`<h1[^>]*>${aqueous.title}</h1>`))
    expect(selectedTab(html)).toEqual(['Primer'])
    const [primer, lab, record] = panels(html)
    expect([primer!.shown, lab!.shown, record!.shown]).toEqual([true, false, false])
    expect(count(primer!.body, /<h2/g)).toBe(1)
    expect(primer!.body).toContain(`>${AQUEOUS_PRIMER[0]!.heading}</h2>`)
    expect(primer!.body).toContain('>Topic 1 of 10')
    expect(lab!.body).toContain(SHELL_TEXT.notStarted)
    expect(record!.body).toContain(SHELL_TEXT.noRecord)
    expect(html).toContain(MODE_TEXT.guided)
    expect(html).toContain(MODE_TEXT.challenge)
    expect(html).not.toContain(escaped(SHELL_TEXT.guided))
    expect(count(html, new RegExp(`>${SHELL_TEXT.start}</button>`, 'g'))).toBe(2)
    expect(app.store.length).toBe(0)
  })

  it('reads its entry once when it mounts and writes nothing; the first write comes with Start or an action', () => {
    const inner = createMemoryStore()
    const calls: string[] = []
    app.store = { get length() { return inner.length }, key: (i) => inner.key(i), getItem: (k) => (calls.push(`get ${k}`), inner.getItem(k)), setItem: (k, v) => (calls.push(`set ${k}`), inner.setItem(k, v)), removeItem: (k) => (calls.push(`remove ${k}`), inner.removeItem(k)) }
    page()
    expect(calls).toEqual(['get valence:lab:aqueous'])
    save(done(fresh(), 'aq-01'))
    calls.length = 0
    page()
    expect(calls).toEqual(['get valence:lab:aqueous'])
    const progress = labProgress(app.store, aqueous, SCHEMA)
    progress.save(fresh('challenge'))
    expect(calls).toEqual(['get valence:lab:aqueous', 'set valence:lab:aqueous'])
    expect(progress.load()).toEqual(fresh('challenge'))
  })

  it('with a run stored opens on the Lab tab, on the station the run was in the middle of, with Restart and no docked notebook; and the Record tab holds the record', () => {
    save(run(data, done(fresh(), 'aq-01'), [{ type: 'mix', stationId: 'aq-03' }]))
    const html = page()
    expect(selectedTab(html)).toEqual(['Lab'])
    expect(html).toContain(`>${SHELL_TEXT.restart}</button>`)
    expect(html).not.toContain('<aside')
    const [, lab, record] = panels(html)
    expect(lab!.body).toContain(`>${STATION_TEXT.place(3, 10)}`)
    expect(record!.body).toContain(`>${RECORD_TEXT.caption}</caption>`)
    // The mode is the run's.
    save(fresh('challenge'))
    expect([...page().matchAll(/<input[^>]*type="radio"[^>]*name="[^"]*"[^>]*value="(guided|challenge)"[^>]*>/g)].filter((match) => match[0].includes('checked=""')).map((match) => match[1])).toEqual(['challenge'])
  })

  it('sets aside a stored record that does not fit, says so, and starts fresh', () => {
    saveEntry(app.store, aqueous.entry, aqueous.version, { ...fresh(), status: 'completed' })
    const html = page()
    expect(html).toContain(escaped(SHELL_TEXT.setAside))
    expect(selectedTab(html)).toEqual(['Primer'])
    expect(app.store.getItem('valence:backup:lab:aqueous')).not.toBeNull()
  })

  it('in a narrow window shows the notice on the Lab tab in place of the stations, the record on its tab, and nothing that changes a run', () => {
    save(done(fresh(), 'aq-01'))
    app.wide = false
    const html = page()
    const [, lab, record] = panels(html)
    expect(lab!.body).toContain(NARROW_NOTICE.title)
    expect(lab!.body).not.toContain(BENCH_TEXT.mix)
    expect(record!.body).toContain(`>${RECORD_TEXT.caption}</caption>`)
    expect(html).not.toContain(SHELL_TEXT.restart)
    expect(html).not.toContain('type="radio"')
  })
})

describe('the list of stations', () => {
  const state = run(data, done(fresh(), 'aq-01'), [...stationScript(data, 'aq-02').slice(0, 2), { type: 'mix', stationId: 'aq-03' }])
  const { html, stations, shown } = bench(state, 'aq-03')
  const listed = [...html.match(/<ol[^>]*>(.*?)<\/ol>/s)![1]!.matchAll(/<li><button([^>]*)>(.*?)<\/button><\/li>/gs)].map(([, tag, body]) => ({ current: tag!.includes('aria-current="true"'), words: read(body!) }))

  it('is a navigation named Stations that lists the ten in order, each with its number, its two reagents and how far it has come in words beside a mark', () => {
    expect(count(html, /<nav aria-label="Stations"/g)).toBe(1)
    expect(listed.map(({ words }) => words)).toEqual(
      data.stations.map((station, i) => `|${i + 1}.|${station.name}|${i === 0 ? '✓' : i === 1 ? '◑' : i === 2 ? '◔' : '○'}|${PROGRESS_TEXT[i === 0 ? 'done' : i === 1 ? 'observed' : i === 2 ? 'started' : 'not-started']}|`),
    )
    expect(listed.map(({ current }) => current)).toEqual(data.stations.map((_, i) => i === 2))
    // The mark is for the eye, and only the tick of a station done carries a colour role.
    expect(html).toContain(`<span aria-hidden="true" class="${ROLE.done}">✓ </span>${PROGRESS_TEXT.done}`)
    expect(html).toContain(`<span aria-hidden="true">○ </span>${PROGRESS_TEXT['not-started']}`)
  })

  it('folds behind a button named Stations, as the primer\'s topics do', () => {
    const [button, controls] = /<button[^>]*aria-expanded="false"[^>]*aria-controls="([^"]+)"[^>]*>(?:.*?)<\/button>/s.exec(html)!
    expect(text(button!)).toBe(STATION_TEXT.list)
    expect(button).toContain('primer-topics-button')
    expect(html).toContain(`<ol id="${controls}" class="primer-topics `)
  })

  it('shows one station at a time, and draws no other until it is asked for', () => {
    // A station that has been shown stays drawn, hidden, with what was built there: that is state, and is checked in a browser.
    expect(stations).toHaveLength(1)
    expect(shown).toHaveLength(1)
    expect(shown[0]).toContain(`>${escaped(stationTitle(data, 'aq-03'))}</h2>`)
    for (let i = 0; i < 10; i++) expect(bench(state, data.stations[i]!.id).shown[0]).toContain(`>${escaped(stationTitle(data, data.stations[i]!.id))}</h2>`)
  })

  it('says on the station where it stands and how far it has come, as the description of a heading that can take focus', () => {
    const [, describedBy] = /<h2 id="[^"]+" tabindex="-1" aria-describedby="([^"]+)"/.exec(shown[0]!)!
    expect(read(new RegExp(`<p id="${describedBy}"[^>]*>(.*?)</p>`).exec(shown[0]!)![1]!)).toBe(`Station 3 of 10 ·|◔|${PROGRESS_TEXT.started}|`)
  })

  it('offers Previous and Next, each named by the station it goes to; at the first there is no Previous and at the last no Next', () => {
    const ways = (stationId: string) => buttons(bench(state, stationId).html.split('<div class="flex flex-wrap justify-between gap-2">').at(-1)!).map(({ name }) => name.replace(/[←→]/g, '').trim())
    expect(ways('aq-03')).toEqual(['Previous: Station 2: Sodium carbonate and copper(II) sulfate', 'Next: Station 4: Barium chloride and copper(II) sulfate'])
    expect(ways('aq-01')).toEqual(['Next: Station 2: Sodium carbonate and copper(II) sulfate'])
    expect(ways('aq-10')).toEqual(['Previous: Station 9: Cobalt(II) chloride and silver nitrate'])
  })

  it('has the two reference panels\' buttons at its head, each closed, and no line that the lab is complete until it is', () => {
    const head = html.split('<div class="primer">')[0]!
    expect(buttons(head).map(({ name }) => name)).toEqual([SOLUBILITY_TEXT.name, 'Calculator'])
    for (const { tag } of buttons(head)) expect(tag).toContain('aria-expanded="false"')
    // Drawn small, with a finger's hit area laid over each (lab.css).
    for (const { tag } of buttons(head)) expect(tag).toMatch(/class="[^"]*\blab-tap\b/)
    expect(head).toContain('<p role="status" class="text-sm font-medium"></p>')
    expect(bench(complete).html.split('<div class="primer">')[0]).toContain(`</span>${PAGE_TEXT.completed}</p>`)
  })
})

describe('a station before its tube is mixed', () => {
  const { station } = bench(fresh(), 'aq-07')

  it('has two cards, the tube and the equations: the tools and the observations wait for the mix', () => {
    expect(cards(station)).toEqual([PAGE_TEXT.tube, PAGE_TEXT.equations])
  })

  it('shows each reagent as a tile named by the reagent, with its amount and its hazards closed', () => {
    const tube = card(station, PAGE_TEXT.tube)
    expect([...tube.matchAll(/<div role="group" aria-label="([^"]+)"/g)].map((match) => match[1])).toEqual(['Calcium carbonate, powder', 'Hydrochloric acid, 1 M'])
    expect(read(tube)).toContain(`|${PAGE_TEXT.amount}:|0.10 g|`)
    expect(read(tube)).toContain(`|${PAGE_TEXT.amount}:|3.0 mL|`)
    expect(tube).toContain(`<span class="${ROLE.value}">0.10 g</span>`)
    expect(count(tube, /<summary[^>]*>Hazards<\/summary>/g)).toBe(2)
    expect(tube).not.toContain('<details open')
    // The powder's sheet lists no statement, and its note is of a solid; the acid's are of a solution.
    expect(tube).toContain(HAZARDS_TEXT.none)
    expect(tube).toContain(`>${HAZARDS_TEXT.asUsed}</h4>`)
    expect(tube).toContain(`>${HAZARDS_TEXT.strength}</h4>`)
  })

  it('offers Mix, says in a status line that the two are not yet mixed, and draws no tube', () => {
    const tube = card(station, PAGE_TEXT.tube)
    const mix = buttons(tube).find(({ name }) => name === BENCH_TEXT.mix)!
    expect(mix.tag).not.toContain('aria-disabled="true"')
    expect(tube).toMatch(new RegExp(`<p id="[^"]+" role="status"[^>]*>${BENCH_TEXT.notMixed}</p>`))
    expect(tube).not.toContain('<svg viewBox="0 0 120 190"')
  })

  it('takes equations already, as the engine does: three builders, each with "No reaction", the palette and Check', () => {
    expect([...card(station, PAGE_TEXT.equations).matchAll(/<h4[^>]*>(.*?)<\/h4>/g)].map((match) => match[1])).toEqual([BENCH_TEXT.hints, ...FORMS.map((form) => FORM_LABEL[form])])
    for (const form of FORMS) expect(builder(station, form)).toContain(`${BENCH_TEXT.noReaction}</label>`)
  })

  it('lists under the station every source it rests on', () => {
    const cited = stationCitations(data, 'aq-07', sources)
    const foot = station.slice(station.lastIndexOf('<details>'))
    expect(count(station, /<summary[^>]*>Sources<\/summary>/g)).toBe(3)
    for (const { source } of cited) expect(foot).toContain(`href="${escaped(source.url)}"`)
    expect(foot).toContain(PAGE_TEXT.sources)
  })
})

describe('a station once its tube is mixed', () => {
  const mixed = (stationId: string, mode: AqueousState['mode'] = 'guided') => run(data, fresh(mode), [{ type: 'mix', stationId }])

  it('names Mix for what is so, with a tick, unavailable and still focusable', () => {
    const mix = buttons(card(bench(mixed('aq-01')).station, PAGE_TEXT.tube)).find(({ name }) => name.includes(BENCH_TEXT.mixed))!
    expect(mix.name).toBe(`✓ ${BENCH_TEXT.mixed}`)
    expect(mix.tag).toContain('aria-disabled="true"')
    expect(mix.tag).not.toContain(' disabled=""')
    expect(mix.tag).not.toMatch(FAINT)
  })

  it('draws the tube as a picture described by the words under it, which say what is seen at every station', () => {
    for (const { id } of data.stations) {
      const tube = card(bench(mixed(id), id).station, PAGE_TEXT.tube)
      const [, describedBy] = new RegExp(`<svg viewBox="0 0 120 190" role="img" aria-label="${PAGE_TEXT.tubePicture}" aria-describedby="([^"]+)"`).exec(tube)!
      expect(tube, id).toContain(`<p id="${describedBy}" role="status" class="max-w-prose flex-1 basis-64">${escaped(seenText(data, id))}</p>`)
    }
  })

  it('draws the liquid in its colour on a white card, a layer of solid where one forms, and bubbles where a gas comes off', () => {
    const drawn = (stationId: string, reducedMotion = false) => /<svg viewBox="0 0 120 190".*?<\/svg>/s.exec(bench(mixed(stationId), stationId, reducedMotion).station)![0]
    expect(drawn('aq-04')).toContain('fill="#ffffff" stroke="#3f3f46" stroke-opacity="0.35"')
    expect(drawn('aq-04')).toContain(`fill="${data.species.find((s) => s.id === 'copper-ii-ion')!.solutionColor!.value.hex}"`)
    expect(count(drawn('aq-04'), /<rect/g)).toBe(3)
    expect(count(drawn('aq-05'), /<rect/g)).toBe(2)
    expect(count(drawn('aq-04'), /<circle/g)).toBe(0)
    expect(count(drawn('aq-07'), /<circle/g)).toBe(6)
    expect(count(drawn('aq-10'), /<circle/g)).toBe(6)
    expect(count(drawn('aq-06'), /<circle/g)).toBe(0)
  })

  it('moves the bubbles only where the reduced-motion setting allows, and then not for longer than five seconds', () => {
    const drawn = (reducedMotion: boolean) => /<svg viewBox="0 0 120 190".*?<\/svg>/s.exec(bench(mixed('aq-07'), 'aq-07', reducedMotion).station)![0]
    expect(count(drawn(false), /class="aq-bubble"/g)).toBe(6)
    expect(drawn(true)).not.toContain('aq-bubble')
    expect(count(drawn(true), /<circle/g)).toBe(6)
    const [, seconds, times] = /\.aq-bubble \{\s*animation: aq-bubble-rise ([\d.]+)s ease-in (\d+);/.exec(aqueousCss)!
    expect(Number(seconds) * Number(times)).toBeLessThanOrEqual(5)
    expect(aqueousCss).not.toContain('infinite')
  })

  it('has no tools card where the eye is the only tool, and one button for each way of applying a tool where there are more', () => {
    expect(cards(bench(mixed('aq-01')).station)).toEqual([PAGE_TEXT.tube, PAGE_TEXT.observations, PAGE_TEXT.equations])
    const names = (stationId: string) => buttons(card(bench(mixed(stationId), stationId).station, PAGE_TEXT.tools)).map(({ name }) => name)
    expect(names('aq-06')).toEqual([TOOL_LABEL.waft, TOOL_LABEL['litmus-liquid'], TOOL_LABEL['litmus-vapour'], TOOL_LABEL.sniff])
    expect(names('aq-08')).toEqual([TOOL_LABEL.touch, TOOL_LABEL.thermometer])
    expect(names('aq-10')).toEqual([TOOL_LABEL.touch, TOOL_LABEL.splint])
  })

  it('offers smelling the tube directly where wafting is a tool, as a button that cannot be used and is not drawn faint, and has a message line for what a tool shows', () => {
    const tools = card(bench(mixed('aq-06'), 'aq-06').station, PAGE_TEXT.tools)
    const sniff = buttons(tools).find(({ name }) => name === TOOL_LABEL.sniff)!
    expect(sniff.tag).toContain('aria-disabled="true"')
    expect(sniff.tag).not.toMatch(FAINT)
    expect(count(tools, /<p role="status"/g)).toBe(1)
    // The refusal is the engine's, worded with the record's caution.
    const action: Action = { type: 'useTool', stationId: 'aq-06', tool: 'sniff' }
    expect(blockedText(data, action, can(data, mixed('aq-06'), action)!)).toBe(data.cautions.sniffing.value)
  })

  it('marks a tool that has been used with a tick for the eye and a word for a screen reader', () => {
    const state = run(data, mixed('aq-06'), [{ type: 'useTool', stationId: 'aq-06', tool: 'waft' }])
    const names = buttons(card(bench(state, 'aq-06').station, PAGE_TEXT.tools)).map(({ name }) => name)
    expect(names.slice(0, 2)).toEqual([`✓ ${TOOL_LABEL.waft}, ${PAGE_TEXT.used}`, TOOL_LABEL['litmus-liquid']])
  })

  it('asks one question for each field the station shows, each a group of radio buttons of one name with a choice for each answer, none chosen', () => {
    const form = card(bench(mixed('aq-06'), 'aq-06').station, PAGE_TEXT.observations)
    const groups = [...form.matchAll(/<fieldset([^>]*)><legend[^>]*>(.*?)<\/legend>(.*?)<\/fieldset>/gs)].map(([, tag, legend, body]) => ({ disabled: tag!.includes('disabled=""'), legend: text(legend!), names: new Set([...body!.matchAll(/name="([^"]+)"/g)].map((match) => match[1])), choices: [...body!.matchAll(/<label[^>]*>(.*?)<\/label>/g)].map((match) => text(match[1]!)), body: body! }))
    expect(groups.map(({ legend }) => legend)).toEqual(stationView(data, mixed('aq-06'), 'aq-06').fields.map((field) => FIELD_LABEL[field]))
    expect(groups).toHaveLength(6)
    for (const group of groups) expect(group.names.size, group.legend).toBe(1)
    expect(new Set(groups.flatMap(({ names }) => [...names])).size).toBe(6)
    expect(groups[0]!.choices).toEqual(['no solid', 'white', 'rust-brown', 'blue-green', 'pale green', 'blue', 'black'])
    expect(form).not.toContain('checked=""')
    // What the eye sees can be answered at once; what a tool shows waits for the tool, and says which.
    expect(groups.map(({ disabled }) => disabled)).toEqual([false, false, false, true, true, true])
    expect(groups[3]!.body).toContain(`<p class="${ROLE.held}">${toolFirstText(['waft'])}</p>`)
    expect(groups[0]!.body).not.toContain(ROLE.held)
    // A choice is a target a finger finds.
    expect(count(form, /<label class="flex min-h-11 /g)).toBe(groups.reduce((n, { choices }) => n + choices.length, 0))
  })

  it('opens a question once its tool has been used: either the touch or the thermometer for the temperature', () => {
    for (const tool of ['touch', 'thermometer'] as const) {
      const state = run(data, mixed('aq-08'), [{ type: 'useTool', stationId: 'aq-08', tool }])
      const form = card(bench(state, 'aq-08').station, PAGE_TEXT.observations)
      expect(count(form, /<fieldset disabled=""/g)).toBe(0)
      expect(form).not.toContain('Not yet.')
    }
    expect(card(bench(mixed('aq-08'), 'aq-08').station, PAGE_TEXT.observations)).toContain(escaped(toolFirstText(['touch', 'thermometer'])))
  })

  it('has one button that checks the observations, unavailable and still focusable until every question can be answered and is', () => {
    const check = buttons(card(bench(mixed('aq-01')).station, PAGE_TEXT.observations)).at(-1)!
    expect(check.name).toBe(PAGE_TEXT.checkObservations)
    expect(check.tag).toContain('type="submit"')
    expect(check.tag).toContain('aria-disabled="true"')
    expect(check.tag).not.toContain(' disabled=""')
    expect(check.tag).toContain('min-h-11')
  })

  it('in Guided shows what to expect over the questions and the hints over the builders; in Challenge neither, and says when they come', () => {
    const guided = bench(mixed('aq-02'), 'aq-02').station
    expect(read(card(guided, PAGE_TEXT.observations))).toContain(`|${BENCH_TEXT.expected}|${expectedLines(data, 'aq-02').join('|')}|`)
    expect(read(card(guided, PAGE_TEXT.equations))).toContain(`|${BENCH_TEXT.hints}|${data.stations[1]!.hints.map(escaped).join('|')}|`)
    expect(guided).not.toContain(PAGE_TEXT.challengeHidden)
    const challenge = bench(mixed('aq-02', 'challenge'), 'aq-02').station
    expect(challenge).not.toContain(BENCH_TEXT.expected)
    expect(challenge).not.toContain(BENCH_TEXT.hints)
    for (const line of expectedLines(data, 'aq-02')) expect(challenge).not.toContain(line)
    for (const hint of data.stations[1]!.hints) expect(challenge).not.toContain(escaped(hint))
    expect(card(challenge, PAGE_TEXT.observations)).toContain(PAGE_TEXT.challengeHidden)
    // Once the learner has recorded their own, right or not, Challenge shows both.
    const recorded = run(data, mixed('aq-02', 'challenge'), [{ type: 'recordObservation', stationId: 'aq-02', observation: { solid: 'white', liquid: 'blue', bubbles: 'none' } }])
    const after = bench(recorded, 'aq-02').station
    expect(after).toContain(BENCH_TEXT.expected)
    expect(after).toContain(BENCH_TEXT.hints)
    expect(after).not.toContain(PAGE_TEXT.challengeHidden)
  })
})

describe('a recorded observation', () => {
  const at = (observation: Record<string, string>) => run(data, fresh('challenge'), [{ type: 'mix', stationId: 'aq-04' }, { type: 'recordObservation', stationId: 'aq-04', observation }])
  const wrong = bench(at({ solid: 'blue', liquid: 'blue', bubbles: 'bubbles' }), 'aq-04').station
  const right = bench(at(expectedObservation(data.stations[3]!)), 'aq-04').station

  it('that is not the tube\'s keeps its questions open with what was chosen, says which to look at again and never the answer, and marks each such question in words', () => {
    const form = card(wrong, PAGE_TEXT.observations).split('<form')[1]!
    expect(count(form, /<fieldset disabled=""/g)).toBe(0)
    expect([...form.matchAll(/<input[^>]*value="([^"]+)"[^>]*>/g)].filter((match) => match[0].includes('checked=""')).map((match) => match[1])).toEqual(['blue', 'blue', 'bubbles'])
    expect(read(form)).toContain(`|✕|${observationFeedback(['solid', 'bubbles'])}|`)
    expect(form).toContain(`<span aria-hidden="true" class="${ROLE.failed}">✕ </span>`)
    // The mark is beside the question and is its description; the question's name stays the question.
    expect([...form.matchAll(/<fieldset([^>]*)><legend[^>]*>(.*?)<\/legend>(<p id="([^"]+)"[^>]*>.*?<\/p>)?/g)].map(([, tag, legend, mark, id]) => [legend, mark === undefined ? null : text(mark), id === undefined ? !tag!.includes('aria-describedby') : tag!.includes(`aria-describedby="${id}"`)])).toEqual([
      [FIELD_LABEL.solid, `✕ ${PAGE_TEXT.lookAgain}`, true],
      [FIELD_LABEL.liquid, null, true],
      [FIELD_LABEL.bubbles, `✕ ${PAGE_TEXT.lookAgain}`, true],
    ])
    expect(buttons(form).map(({ name }) => name)).toEqual([PAGE_TEXT.checkObservations])
    expect(cards(wrong)).not.toContain(BENCH_TEXT.notes)
  })

  it('that is the tube\'s is shown with its questions disabled and what was chosen, says so beside a tick, and offers Change', () => {
    const form = card(right, PAGE_TEXT.observations).split('<form')[1]!
    expect(count(form, /<fieldset disabled=""/g)).toBe(3)
    expect([...form.matchAll(/<input[^>]*value="([^"]+)"[^>]*>/g)].filter((match) => match[0].includes('checked=""')).map((match) => match[1])).toEqual(['white', 'blue', 'none'])
    expect(read(form)).toContain(`|✓|${observationFeedback([])}|`)
    expect(form).not.toContain(PAGE_TEXT.lookAgain)
    const [change] = buttons(form)
    expect(buttons(form)).toHaveLength(1)
    expect(change!.name).toBe(PAGE_TEXT.change)
    expect(change!.tag).not.toContain('aria-disabled="true"')
    // A question that is answered does not carry the role of one that waits.
    expect(form).not.toContain(ROLE.entry)
  })

  it('keeps the station\'s notes until the station is done, in both modes: a note may name a product or give an equation, and no entry is helped by it', () => {
    const script = stationScript(data, 'aq-06')
    for (const mode of ['guided', 'challenge'] as const) {
      // The observation correct and two of the three equations: no notes yet.
      const almost = run(data, fresh(mode), script.slice(0, -1))
      expect(stationView(data, almost, 'aq-06').wrongFields).toEqual([])
      expect(cards(bench(almost, 'aq-06').station)).toEqual([PAGE_TEXT.tube, PAGE_TEXT.tools, PAGE_TEXT.observations, PAGE_TEXT.equations])
      for (const note of data.stations[5]!.notes) expect(bench(almost, 'aq-06').station).not.toContain(escaped(note.value))
      // Done: the notes, after the equations.
      const { station } = bench(run(data, fresh(mode), script), 'aq-06')
      expect(cards(station)).toEqual([PAGE_TEXT.tube, PAGE_TEXT.tools, PAGE_TEXT.observations, PAGE_TEXT.equations, BENCH_TEXT.notes])
      for (const note of data.stations[5]!.notes) expect(card(station, BENCH_TEXT.notes)).toContain(`<p>${escaped(note.value)}</p>`)
    }
    // The control: its note says outright what all three equations are, and is not on the page while one is still to enter.
    const control = stationScript(data, 'aq-05')
    expect(data.stations[4]!.notes[0]!.value).toContain('The answer to all three equations is')
    expect(bench(run(data, fresh('challenge'), control.slice(0, -1)), 'aq-05').station).not.toContain('The answer to all three equations is')
    expect(bench(run(data, fresh('challenge'), control), 'aq-05').station).toContain('The answer to all three equations is')
    // A station with no notes has no such card when it is done.
    expect(data.stations[3]!.notes).toEqual([])
    expect(cards(bench(done(fresh(), 'aq-04'), 'aq-04').station)).not.toContain(BENCH_TEXT.notes)
  })
})

describe('an equation builder', () => {
  const entered = (form: (typeof FORMS)[number], entry: Parameters<typeof equationText>[1], stationId = 'aq-01') => bench(reduce(data, fresh(), { type: 'enterEquation', stationId, form, entry }), stationId).station
  const empty = builder(bench(fresh()).station, 'molecular')

  it('is a form named by its heading, with the choice "No reaction", the equation so far, the palette as buttons, a hint where the side is asked, and Check', () => {
    const [, labelledBy] = /^<form [^>]*aria-labelledby="([^"]+)"/.exec(empty)!
    expect(empty).toContain(`<h4 id="${labelledBy}" class="font-medium">${FORM_LABEL.molecular}</h4>`)
    expect(empty).toMatch(new RegExp(`<input type="checkbox"/>${BENCH_TEXT.noReaction}</label>`))
    expect(read(empty)).toContain(`|${PAGE_TEXT.yourEquation}:|${PAGE_TEXT.nothingBuilt}|`)
    const palette = /<div role="group" aria-label="Substances to choose from"[^>]*>(.*?)<\/div>/s.exec(empty)![1]!
    expect(buttons(palette).map(({ name }) => name)).toEqual(['FeCl3', 'NaOH', 'Fe(OH)3', 'NaCl', 'Fe3+', 'Cl−', 'Na+', 'OH−', 'Fe(OH)2', 'H2O'])
    expect(empty).toContain(`>${PAGE_TEXT.paletteHelp}</p>`)
    const check = buttons(empty).at(-1)!
    expect(check.name).toBe(BENCH_TEXT.check)
    // Nothing is built yet, so a press of Check is told why: the button is unavailable and still focusable.
    expect(check.tag).toContain('aria-disabled="true"')
    expect(check.tag).toContain(`aria-describedby="${labelledBy}"`)
    expect(empty).not.toContain('type="text"')
  })

  it('draws a formula of the palette with real subscripts and its charge raised', () => {
    expect(empty).toContain('<span>Fe<sup>3+</sup></span>')
    expect(empty).toContain('<span>Fe(OH)<sub>3</sub></span>')
    expect(empty).toContain('<span>Cl<sup>−</sup></span>')
    expect(empty).not.toMatch(/[₀-₉⁰-⁹⁺⁻]/)
  })

  it('offers each station its own palette, the same in the three builders', () => {
    for (const station of data.stations) {
      const drawn = bench(fresh(), station.id).station
      for (const form of FORMS) expect(count(/<div role="group" aria-label="Substances to choose from"[^>]*>(.*?)<\/div>/s.exec(builder(drawn, form))![1]!, /<button/g), `${station.id} ${form}`).toBe(station.paletteSpecies.length)
    }
  })

  it('makes every control a target a finger finds', () => {
    const wrong = builder(entered('netIonic', { noReaction: false, reactants: [{ speciesId: 'iron-iii-ion', coefficient: 2, state: 'aq' }], products: [{ speciesId: 'iron-iii-hydroxide', coefficient: 1, state: 's' }] }), 'netIonic')
    for (const { tag, name } of buttons(wrong)) expect(tag, name).toMatch(/min-h-11 min-w-11|min-w-11 min-h-11/)
    expect(count(wrong, /<label class="flex min-h-11 min-w-11 /g)).toBe(8)
    expect(wrong).toMatch(/<label class="flex [^"]*min-h-11 min-w-11"><input type="checkbox"/)
  })

  it('shows an equation that was entered and is not correct as it was built, each term with its coefficient, its state and a way out, and says what kind of thing is wrong beside a cross', () => {
    const entry = { noReaction: false, reactants: [{ speciesId: 'iron-iii-ion', coefficient: 2, state: 'aq' as const }, { speciesId: 'hydroxide-ion', coefficient: 3, state: 'aq' as const }], products: [{ speciesId: 'iron-iii-hydroxide', coefficient: 1, state: 's' as const }] }
    const drawn = builder(entered('netIonic', entry), 'netIonic')
    expect(text(drawn)).toContain(`${PAGE_TEXT.yourEquation}: 2Fe3+(aq) + 3OH−(aq) → Fe(OH)3(s)`)
    expect([...drawn.matchAll(/<div role="group" aria-label="(Reactants|Products)"/g)].map((match) => match[1])).toEqual(['Reactants', 'Products'])
    const terms = [...drawn.matchAll(/<li><div role="group" aria-label="([^"]+)"[^>]*>(.*?)<\/div><\/li>/gs)].map(([, name, body]) => ({ name, body: body! }))
    expect(terms.map(({ name }) => name)).toEqual(['Fe³⁺', 'OH⁻', 'Fe(OH)₃'])
    const [iron, , solid] = terms
    expect(buttons(iron!.body).map(({ tag }) => /aria-label="([^"]+)"/.exec(tag)![1])).toEqual([PAGE_TEXT.fewer, PAGE_TEXT.more, PAGE_TEXT.remove('Fe³⁺')])
    expect(read(`<i>${iron!.body}</i>`)).toContain(`|${PAGE_TEXT.coefficient}:|2|`)
    expect([...iron!.body.matchAll(/<input type="radio"[^>]*aria-label="([^"]+)"([^>]*)>/g)].map(([, label, rest]) => [label, rest!.includes('checked=""')])).toEqual([['aq: dissolved in water', true], ['s: solid', false], ['l: liquid', false], ['g: gas', false]])
    expect([...solid!.body.matchAll(/<input type="radio"[^>]*aria-label="([^"]+)"([^>]*)>/g)].filter(([, , rest]) => rest!.includes('checked=""')).map(([, label]) => label)).toEqual(['s: solid'])
    // A coefficient of 1 cannot be made fewer: that button is unavailable and still focusable.
    expect(buttons(solid!.body)[0]!.tag).toContain('aria-disabled="true"')
    expect(buttons(iron!.body)[0]!.tag).not.toContain('aria-disabled="true"')
    expect(read(`${drawn}</form>`)).toContain(`|✕|${PAGE_TEXT.notCorrect}. ${PROBLEM_TEXT.coefficients}|`)
    expect(buttons(drawn).at(-1)).toMatchObject({ name: BENCH_TEXT.check })
    expect(buttons(drawn).at(-1)!.tag).not.toContain('aria-disabled="true"')
  })

  it('says of every kind of wrong entry what kind it is, and never shows the curated equation', () => {
    const wanted = equationText(data, correctEntry(data, 'aq-01', 'molecular'))
    const drawn = builder(entered('molecular', { noReaction: true, reactants: [], products: [] }), 'molecular')
    expect(read(`${drawn}</form>`)).toContain(`|${PAGE_TEXT.notCorrect}. ${PROBLEM_TEXT['reaction-expected']}|`)
    expect(text(drawn)).toContain(`${PAGE_TEXT.yourEquation}: ${BENCH_TEXT.noReaction}`)
    expect(drawn).toContain('<input type="checkbox" checked=""/>')
    // "No reaction" chosen: there is no palette and no term to set.
    expect(drawn).not.toContain('Substances to choose from')
    expect(text(bench(fresh()).html)).not.toContain(text(draw(createElement(EquationLine, { data, entry: correctEntry(data, 'aq-01', 'molecular') }))))
    expect(wanted).toBe('FeCl₃(aq) + 3NaOH(aq) → Fe(OH)₃(s) + 3NaCl(aq)')
  })

  it('shows a correct equation as its one line, says Correct beside a tick, and offers Change in place of the palette and the terms', () => {
    for (const form of FORMS) {
      const entry = correctEntry(data, 'aq-01', form)
      const drawn = builder(entered(form, entry), form)
      expect(text(drawn)).toContain(`${PAGE_TEXT.yourEquation}: ${text(draw(createElement(EquationLine, { data, entry })))}`)
      expect(read(`${drawn}</form>`)).toContain('|✓|Correct.|')
      expect(buttons(drawn).map(({ name }) => name)).toEqual([PAGE_TEXT.change])
      expect(drawn).not.toContain('Substances to choose from')
      expect(drawn).not.toContain('type="checkbox"')
      expect(drawn).not.toContain('type="radio"')
      expect(drawn).not.toContain(ROLE.entry)
    }
    expect(builder(entered('netIonic', { noReaction: true, reactants: [], products: [] }, 'aq-05'), 'netIonic')).toContain(`>${BENCH_TEXT.noReaction}</span>`)
  })

  it('draws the equation as one line, a gap where a side has nothing yet', () => {
    const line = (entry: Parameters<typeof equationText>[1]) => text(draw(createElement(EquationLine, { data, entry })))
    expect(line({ noReaction: false, reactants: [{ speciesId: 'magnesium', coefficient: 1, state: 's' }], products: [] })).toBe('Mg(s) → …')
    expect(line({ noReaction: true, reactants: [], products: [] })).toBe(BENCH_TEXT.noReaction)
    // The line as drawn reads as the line as written, with plain digits in place of the raised and lowered ones.
    for (const station of data.stations) for (const form of FORMS) {
      const entry = correctEntry(data, station.id, form)
      const plain = (written: string) => [...written].map((char) => { const below = '₀₁₂₃₄₅₆₇₈₉'.indexOf(char); const above = '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻'.indexOf(char); return below >= 0 ? String(below) : above >= 0 ? '0123456789+−'[above] : char }).join('')
      expect(line(entry), `${station.id} ${form}`).toBe(plain(equationText(data, entry)))
    }
  })

  it('says once over the three builders what the four state symbols stand for', () => {
    expect(count(card(bench(fresh()).station, PAGE_TEXT.equations), new RegExp(escaped(STATE_KEY).replace(/[()]/g, '\\$&'), 'g'))).toBe(1)
  })
})

describe('a lab that is complete', () => {
  const { station } = bench(complete, 'aq-06')

  it('says on each station that it is done, and once, at its head, why no entry is taken: the one sentence that describes every entry\'s button', () => {
    expect(read(station)).toContain(`|✓|${BENCH_TEXT.done}|`)
    const reason = blockedText(data, { type: 'mix', stationId: 'aq-06' }, 'lab-completed')
    // Once for the station, over its cards, and not under each of its four entries.
    expect(count(station, new RegExp(reason, 'g'))).toBe(1)
    const [, noteId] = new RegExp(`<p id="([^"]+)" class="text-sm ${ROLE.held}">${reason}</p>`).exec(station.split('<h3')[0]!)!
    for (const drawn of [card(station, PAGE_TEXT.observations).split('<form')[1]!, ...FORMS.map((form) => builder(station, form))]) {
      const [button] = buttons(drawn)
      expect(buttons(drawn)).toHaveLength(1)
      expect(button!.tag).toContain('aria-disabled="true"')
      expect(button!.tag).toContain(`aria-describedby="${noteId}"`)
      expect(drawn).not.toContain(ROLE.held)
    }
    expect(count(card(station, PAGE_TEXT.observations), /<fieldset disabled=""/g)).toBe(6)
    expect(station).not.toContain(`>${PAGE_TEXT.change}</button>`)
    // A lab that is not complete has no such sentence.
    expect(bench(done(fresh(), 'aq-06'), 'aq-06').station).not.toContain(reason)
  })

  it('leaves every button of the tube and the tools focusable and unavailable', () => {
    for (const heading of [PAGE_TEXT.tube, PAGE_TEXT.tools]) for (const { tag, name } of buttons(card(station, heading))) expect(tag, name).toContain('aria-disabled="true"')
  })

  it('does not say a station is done before it is', () => {
    const almost = run(data, fresh(), stationScript(data, 'aq-01').slice(0, -1))
    expect(bench(almost).station).toContain('<p role="status" class="text-sm font-medium"></p>')
    expect(bench(almost).station).not.toContain(BENCH_TEXT.done)
  })
})

describe('the record', () => {
  const record = (state: AqueousState) => draw(createElement(AqueousRecord, { data, state }))
  const wrongEntry = { noReaction: false, reactants: [{ speciesId: 'copper-ii-ion', coefficient: 1, state: 'aq' as const }], products: [{ speciesId: 'copper-ii-carbonate', coefficient: 1, state: 'aq' as const }] }
  const state = run(data, done(fresh(), 'aq-01'), [
    { type: 'mix', stationId: 'aq-02' },
    { type: 'recordObservation', stationId: 'aq-02', observation: { solid: 'white', liquid: 'colourless', bubbles: 'none' } },
    { type: 'enterEquation', stationId: 'aq-02', form: 'netIonic', entry: wrongEntry },
    { type: 'mix', stationId: 'aq-03' },
  ])
  const html = record(state)
  const groups = [...html.matchAll(/<tbody>(.*?)<\/tbody>/gs)].map((match) => [...match[1]!.matchAll(/<tr>(.*?)<\/tr>/gs)].map((row) => [...row[1]!.matchAll(/<t[hd][^>]*>(.*?)<\/t[hd]>/gs)].map((cell) => text(cell[1]!))))

  it('is one table with a caption and four headed columns, a group of four rows for each of the ten stations, named by the station', () => {
    expect(count(html, /<table/g)).toBe(1)
    // The table can be wider than a narrow window: it scrolls in a named region the keyboard can reach.
    expect(html).toContain(`<div role="region" aria-label="${RECORD_TEXT.region}" tabindex="0" class="overflow-x-auto `)
    expect(html).toContain(`<caption class="mb-2 text-left font-medium">${RECORD_TEXT.caption}</caption>`)
    expect([...html.matchAll(/<th scope="col"[^>]*>(.*?)<\/th>/g)].map((match) => match[1])).toEqual([RECORD_TEXT.station, RECORD_TEXT.entry, RECORD_TEXT.entered, RECORD_TEXT.result])
    expect(groups).toHaveLength(10)
    for (const [i, rows] of groups.entries()) {
      expect(rows.map((cells) => cells.length)).toEqual([4, 3, 3, 3])
      expect(rows[0]![0]).toBe(stationTitle(data, data.stations[i]!.id))
      expect([rows[0]![1], rows[1]![0], rows[2]![0], rows[3]![0]]).toEqual([RECORD_TEXT.observation, ...FORMS.map((form) => FORM_LABEL[form])])
    }
    expect(count(html, /<th scope="rowgroup" rowSpan="4"|<th scope="rowgroup" rowspan="4"/g)).toBe(10)
  })

  it('gives what was observed and each equation as it was entered, in one line, and whether each is correct, in words', () => {
    expect(groups[0]).toEqual([
      [stationTitle(data, 'aq-01'), RECORD_TEXT.observation, expectedLines(data, 'aq-01').join(''), `✓ ${PAGE_TEXT.correct}`],
      [FORM_LABEL.molecular, 'FeCl3(aq) + 3NaOH(aq) → Fe(OH)3(s) + 3NaCl(aq)', `✓ ${PAGE_TEXT.correct}`],
      [FORM_LABEL.completeIonic, 'Fe3+(aq) + 3Cl−(aq) + 3Na+(aq) + 3OH−(aq) → Fe(OH)3(s) + 3Na+(aq) + 3Cl−(aq)', `✓ ${PAGE_TEXT.correct}`],
      [FORM_LABEL.netIonic, 'Fe3+(aq) + 3OH−(aq) → Fe(OH)3(s)', `✓ ${PAGE_TEXT.correct}`],
    ])
    expect(groups[1]!.map((cells) => cells.slice(-2))).toEqual([
      ['Solid in the tube once any reaction is over: white.Colour of the liquid: colourless.Bubbles of gas: no bubbles.', PAGE_TEXT.notCorrect],
      [PAGE_TEXT.notEntered, PAGE_TEXT.notEntered],
      [PAGE_TEXT.notEntered, PAGE_TEXT.notEntered],
      ['Cu2+(aq) → CuCO3(aq)', PAGE_TEXT.notCorrect],
    ])
    expect(groups[2]![0]!.slice(-2)).toEqual([PAGE_TEXT.notEntered, PAGE_TEXT.notEntered])
    expect(groups[3]![0]!.slice(-2)).toEqual([RECORD_TEXT.notMixed, PAGE_TEXT.notEntered])
    // A result is in words; the colour roles are an added cue.
    expect(html).toContain(`<span class="${ROLE.failed}">${PAGE_TEXT.notCorrect}</span>`)
    expect(html).toContain(`<span aria-hidden="true" class="${ROLE.done}">✓ </span>${PAGE_TEXT.correct}`)
  })

  it('gives no answer: nothing of what a station expects that the learner has not entered', () => {
    for (const line of expectedLines(data, 'aq-02')) if (!line.includes('colourless') && !line.includes('no bubbles')) expect(html).not.toContain(line)
    expect(text(html)).not.toContain('CuCO3(s)')
  })

  it('says that the lab is complete once all ten stations are done, and not before', () => {
    expect(html).not.toContain(PAGE_TEXT.completed)
    const finished = record(complete)
    expect(finished).toContain(`</span>${PAGE_TEXT.completed}</p>`)
    expect(count(finished, new RegExp(`</span>${PAGE_TEXT.correct}</span>`, 'g'))).toBe(40)
    expect(finished).not.toContain(PAGE_TEXT.notEntered)
  })
})

describe('the solubility table', () => {
  const html = draw(createElement(SolubilityGrid, { data }))
  const formula = (id: string) => data.species.find((s) => s.id === id)!.formula
  const plain = (cell: string) => text(cell)

  it('is a real table with a caption, a headed column for each negative ion and a headed row for each positive ion', () => {
    expect(html).toMatch(new RegExp(`^<table[^>]*><caption[^>]*>${SOLUBILITY_TEXT.caption}</caption>`))
    const columns = [...html.matchAll(/<th scope="col"[^>]*>(.*?)<\/th>/g)].map((match) => plain(match[1]!))
    const rows = [...html.matchAll(/<th scope="row"[^>]*>(.*?)<\/th>/g)].map((match) => plain(match[1]!))
    expect(columns).toEqual([SOLUBILITY_TEXT.corner, 'OH−', 'CO32−', 'SO42−', 'Cl−', 'NO3−'])
    expect(rows).toEqual(['Fe3+', 'Cu2+', 'Ni2+', 'Ba2+', 'Ag+', 'Ca2+', 'Co2+', 'Mg2+', 'Na+', 'NH4+'])
    expect(html).toContain('NH<sub>4</sub><sup>+</sup>')
  })

  it('says in each cell, in a word, what the record holds for the pair, and that a pair it does not hold is not listed', () => {
    const anions = [...new Set(data.solubility.map((row) => row.anionId))]
    const cations = [...new Set(data.solubility.map((row) => row.cationId))]
    const cells = [...html.matchAll(/<tr><th scope="row".*?<\/tr>/gs)].map((row) => [...row[0].matchAll(/<td[^>]*>(.*?)<\/td>/g)].map((cell) => cell[1]))
    const { reacting } = SOLUBILITY_TEXT
    expect(cells.map((row) => row.map((cell) => text(cell!.split('<sup')[0]!)))).toEqual(
      cations.map((cation) =>
        anions.map((anion) => {
          const row = data.solubility.find((r) => r.cationId === cation && r.anionId === anion)
          return row === undefined ? SOLUBILITY_TEXT.notListed : row.soluble ? SOLUBILITY_TEXT.soluble : SOLUBILITY_TEXT.insoluble
        }),
      ),
    )
    // One cell carries the footnote's sign, with words for a screen reader in place of the sign: ammonium with hydroxide.
    const marked = cells.flatMap((row, r) => row.flatMap((cell, c) => (cell!.includes('<sup') ? [[cations[r], anions[c], cell]] : [])))
    expect(marked).toEqual([[reacting.cationId, reacting.anionId, `${SOLUBILITY_TEXT.soluble}<sup aria-hidden="true">${SOLUBILITY_TEXT.mark}</sup><span class="sr-only">, ${SOLUBILITY_TEXT.marked}</span>`]])
    const all = cells.flat().map((cell) => text(cell!.split('<sup')[0]!))
    expect([all.filter((c) => c === 'insoluble').length, all.filter((c) => c === 'soluble').length, all.filter((c) => c === 'not listed').length]).toEqual([6, 17, 27])
    expect(data.solubility).toHaveLength(23)
    expect(formula('silver-ion')).toBe('Ag⁺')
    expect(html).toContain(`>${SOLUBILITY_TEXT.key}</p>`)
    // The note under the table says in words what the sign means, and names the primer's topic on gases by its own heading.
    const topic = AQUEOUS_PRIMER.find((section) => section.id === 'signs')!.heading
    expect(html).toContain(`>${escaped(SOLUBILITY_TEXT.reactingNote(topic))}</p>`)
    expect(html.indexOf('</table>')).toBeLessThan(html.indexOf(escaped(SOLUBILITY_TEXT.reactingNote(topic))))
    expect(count(html, /<sup aria-hidden="true">\*<\/sup>/g)).toBe(1)
    // It names no solid: which compound a pair makes is the learner's to write.
    for (const row of data.solubility) if (row.precipitateId) expect(text(html)).not.toContain(text(draw(createElement(EquationLine, { data, entry: { noReaction: false, reactants: [{ speciesId: row.precipitateId, coefficient: 1, state: 's' }], products: [] } }))).split('(s)')[0]!)
  })
})
