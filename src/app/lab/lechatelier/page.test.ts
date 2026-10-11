import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ACTIVITIES } from '@/app/activities'
import { ROLE } from '@/app/lab/roles'
import { NARROW_NOTICE, SHELL_TEXT } from '@/app/lab/shellText'
import { EDGE_HALO } from '@/app/lab/Tube'
import { TUBE_HEIGHT, liquidHex } from '@/app/lab/tubeDrawing'
import { labProgress } from '@/app/lab/useLabProgress'
import { createMemoryStore, saveEntry, type KeyValueStore } from '@/app/progress/storage'
import { lechatelierCitations } from '@/chem-data/citations'
import { DISTURBANCE_IDS, SYSTEM_IDS, lechatelierData as data, systemOf, type DisturbanceId, type SystemId } from '@/chem-data/lechatelier/data'
import { LECHATELIER_PRIMER, READ_FIRST } from '@/chem-data/lechatelier/primer'
import sources from '@/chem-data/sources.json'
import { LOOKS, can, createLab, lechatelierStateSchema, mismatch, modelFrom, reduce, systemView, type Action, type LechatelierState, type Mode } from '@/engine/lechatelier'
import { run, seen, wholeLab, wholeSystem, workDisturbance } from '@/engine/lechatelier/testkit'
import labCss from '../lab.css?raw'
import { STATUS_MARK } from './DisturbanceCard'
import { LechatelierBench, PROGRESS_MARK, labelLines } from './LechatelierBench'
import { LechatelierPage } from './LechatelierPage'
import { LechatelierRecord } from './LechatelierRecord'
import lechatelierCss from './lechatelier.css?raw'
import {
  ANSWER_TEXT,
  BATH_LABEL,
  CAUSE_LABEL,
  DISTURBANCE_STATUS_TEXT,
  EQUILIBRIUM_TEXT,
  FIELD_LABEL,
  HINT,
  LAB_TEXT,
  LOOK_PART,
  MODE_TEXT,
  NOTES_TEXT,
  OBSERVATION_TEXT,
  PAGE_TEXT,
  PREDICTION_TEXT,
  PROGRESS_TEXT,
  RECORD_TEXT,
  SOURCES_TEXT,
  SYSTEM_AIM,
  TEMPERATURE_TEXT,
  TUBE_NAME,
  WAY_LABEL,
  actionLabel,
  askText,
  benchLines,
  blockedText,
  checkedText,
  disturbanceEquations,
  disturbanceNotes,
  disturbanceTitle,
  doneText,
  equilibriumLines,
  lookLabel,
  lookText,
  mismatchText,
  observationLines,
  outcomeText,
  reasonText,
  systemName,
  systemNumber,
  systemShortName,
  taskText,
  tubeSoFarText,
  tubeText,
} from './messages'

// The Le Chatelier's principle lab's page as markup, on a store the test holds. AppStateProvider builds its store
// from the browser and the media hook has no value on a server, so both are given directly. What a press does (a
// choice recorded, the button that makes the change, a look, the check, Work this system again, the systems and
// Previous and Next) is state, and is checked in a browser: a markup render mounts the page and no more.
const app = vi.hoisted(() => ({ store: undefined as unknown as KeyValueStore, persistent: true, wide: true }))
vi.mock('@/app/AppState', () => ({ useAppState: () => ({ store: app.store, persistent: app.persistent, reducedMotion: false }) }))
vi.mock('@/app/useMediaQuery', () => ({ useMediaQuery: () => app.wide }))

const [, , , , , lechatelier] = ACTIVITIES
const m = modelFrom(data)
const SCHEMA = lechatelierStateSchema(m)
const draw = (element: ReactElement) => renderToStaticMarkup(createElement(MemoryRouter, null, element))
const escaped = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;')
const count = (html: string, pattern: RegExp) => [...html.matchAll(pattern)].length
/** What a reader meets: the tags gone, each run of them a single bar; and the markup's own writing of a sign put back. */
const read = (html: string) => html.replace(/<[^>]+>/g, '|').replace(/\s*\|[\s|]*/g, '|').replaceAll('&#x27;', "'").replaceAll('&amp;', '&')
const text = (html: string) => html.replace(/<[^>]+>/g, '').replaceAll('&#x27;', "'").replaceAll('&amp;', '&')
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
const button = (html: string, name: string) => buttons(html).find((one) => one.name === name)

const [LEAD, INDICATOR, COBALT, HYDROXIDES] = SYSTEM_IDS
const fresh = (mode: Mode = 'guided') => createLab(mode)
const view = (state: LechatelierState, system: SystemId) => systemView(m, state, system)
const now = (state: LechatelierState, system: SystemId) => view(state, system).disturbances.find((d) => d.status === 'current')!
/** A system brought carefully to one of its disturbances, counted from 0, with nothing done at it yet. */
const reached = (system: SystemId, at: number, mode?: Mode, state = fresh(mode)) => Array.from({ length: at }).reduce<LechatelierState>((s) => workDisturbance(m, s, system, { predict: 'left' }), state)
const predicted = (state: LechatelierState, system: SystemId) => run(m, state, [{ type: 'predict', system, way: 'right' }])
/** Every press of the change, or so many. */
const changed = (state: LechatelierState, system: SystemId, presses = now(state, system).portions) => run(m, state, Array.from({ length: presses }, (): Action => ({ type: 'act', system })))
const looked = (state: LechatelierState, system: SystemId) => run(m, state, LOOKS.map((at): Action => ({ type: 'look', system, at })))
const observed = (state: LechatelierState, system: SystemId) => run(m, state, [{ type: 'observe', system, observation: seen(m, now(state, system).shows!) }])
/** A disturbance with its prediction made, its change complete and both parts looked at; and with what is seen recorded as the tube shows it. */
const open = (system: SystemId, at: number, mode?: Mode) => looked(changed(predicted(reached(system, at, mode), system), system), system)
const recorded = (system: SystemId, at: number, mode?: Mode) => observed(open(system, at, mode), system)
const allDone = (mode?: Mode) => wholeLab(m, fresh(mode))
const idOf = (system: SystemId, at: number) => systemOf(data, system).disturbances[at]!.id
const CLOSING = (system: SystemId) => systemOf(data, system).disturbances.length

/** The Lab tab's bench on a state, opened at a system and an entry of its list, and that entry's own markup: the one that is not hidden. */
function bench(state: LechatelierState, system: SystemId = LEAD, entry?: number) {
  const opensAt = entry === undefined ? { system } : { system, entry }
  const html = draw(createElement(LechatelierBench, { data, m, sources, state, can: (action: Action) => can(m, state, action), wrong: (of: SystemId, observation) => mismatch(m, state, of, observation), act: (action: Action) => void reduce(m, state, action), opensAt }))
  const drawn = html.split(/(?=<div(?: hidden="")?><section aria-labelledby=)/).slice(1)
  const shown = drawn.filter((one) => !one.startsWith('<div hidden'))
  const [entryHtml, foot] = shown[0]!.split('<div class="flex flex-wrap justify-between gap-2">')
  return { html, drawn, shown, entry: entryHtml!, foot: foot! }
}
/** The sheets of an entry, by their h3, in order. */
const sheets = (entry: string) => [...entry.matchAll(/<h3[^>]*>(.*?)<\/h3>/g)].map((match) => text(match[1]!))
/** A sheet alone, from its heading on: no sheet holds a section of its own, so it ends where the first section after its heading ends. Null where the entry has no such sheet. */
const sheet = (entry: string, heading: string) => {
  const at = entry.indexOf(`>${escaped(heading)}</h3>`)
  return at < 0 ? null : entry.slice(at, entry.indexOf('</section>', at))
}
/** The picture of the disturbance's tube, and the buttons laid over its two parts: each by the look it is, its name and where it lies, in hundredths of the picture. */
const TUBE = `<svg viewBox="0 0 320 ${TUBE_HEIGHT}"`
const picture = (entry: string) => new RegExp(`${TUBE}.*?</svg>`, 's').exec(entry)![0]
const parts = (html: string) =>
  [...html.matchAll(/<button type="button" data-part="([^"]+)" aria-label="([^"]+)"([^>]*)>(.*?)<\/button>/gs)].map(([, look, name, tag, body]) => {
    const [, left, top, width, height] = /style="left:([\d.]+)%;top:([\d.]+)%;width:([\d.]+)%;height:([\d.]+)%/.exec(tag!)!.map(Number)
    return { look: look!, name: name!, tag: tag!, body: body!, left: left!, top: top!, width: width!, height: height! }
  })
/** The choices of a form, by question: each question's legend and the labels of its radio buttons. */
const questions = (html: string) =>
  [...html.matchAll(/<fieldset([^>]*)><legend[^>]*>(.*?)<\/legend>(.*?)<\/fieldset>/gs)].map(([, tag, legend, body]) => ({
    tag: tag!,
    legend: text(legend!),
    choices: [...body!.matchAll(/<label class="([^"]*)"><input([^>]*)\/>(.*?)<\/label>/g)].map(([, labelClass, input, label]) => ({ labelClass: labelClass!, input: input!, label: text(label!) })),
  }))

beforeEach(() => {
  app.store = createMemoryStore()
  app.persistent = true
  app.wide = true
})

describe("the Le Chatelier's principle page", () => {
  const page = () => draw(createElement(LechatelierPage))
  const save = (state: LechatelierState) => saveEntry(app.store, lechatelier.entry, lechatelier.version, state)

  it("with nothing stored opens on the Primer tab with its ten cards one at a time, four of them marked to read first, the mode choice in this lab's own words, and Start; and stores nothing", () => {
    const html = page()
    expect(lechatelier).toMatchObject({ entry: 'lab:le-chatelier', to: '/lab/le-chatelier', kind: 'Lab', title: LAB_TEXT.title })
    expect(html).toMatch(new RegExp(`<h1[^>]*>${escaped(lechatelier.title)}</h1>`))
    expect(selectedTab(html)).toEqual(['Primer'])
    const [primer, lab, record] = panels(html)
    expect([primer!.shown, lab!.shown, record!.shown]).toEqual([true, false, false])
    expect(count(primer!.body, /<h2[^>]*>/g)).toBe(1)
    expect(primer!.body).toContain(`>${escaped(LECHATELIER_PRIMER[0]!.heading)}</h2>`)
    for (const section of LECHATELIER_PRIMER) expect(primer!.body).toContain(`>${escaped(section.heading)}<`)
    expect(LECHATELIER_PRIMER).toHaveLength(10)
    // In the list, on each of the four; and on the card shown, which is the first of them.
    expect(count(primer!.body, />Read first<\/span>/g)).toBe(READ_FIRST.length + 1)
    expect(READ_FIRST).toHaveLength(4)
    expect(html).toContain(escaped(MODE_TEXT.guided))
    expect(html).toContain(escaped(MODE_TEXT.challenge))
    expect(html).not.toContain(escaped(SHELL_TEXT.guided))
    expect(text(lab!.body)).toContain(SHELL_TEXT.notStarted)
    expect(text(record!.body)).toContain(SHELL_TEXT.noRecord)
    expect(buttons(html).some((one) => one.name === SHELL_TEXT.start)).toBe(true)
    expect(app.store.length).toBe(0)
  })

  it('reads its entry once when it mounts and writes nothing; the first write comes with Start or an action', () => {
    const state = open(COBALT, 1)
    save(state)
    const before = app.store.getItem(app.store.key(0)!)
    const gets = vi.spyOn(app.store, 'getItem')
    const sets = vi.spyOn(app.store, 'setItem')
    page()
    expect(sets).not.toHaveBeenCalled()
    expect(gets.mock.calls.length).toBeGreaterThan(0)
    expect(app.store.getItem(app.store.key(0)!)).toBe(before)
    expect(labProgress(app.store, lechatelier, SCHEMA).load()).toEqual(state)
  })

  it('stores what was done and nothing worked out from it: a mode, a status and, for each system, its runs as lists of what was done; there is no seed', () => {
    const state = wholeSystem(m, fresh('challenge'), COBALT)
    save(state)
    const stored = JSON.parse(app.store.getItem(app.store.key(0)!)!)
    expect(Object.keys(stored.data).sort()).toEqual(['mode', 'status', 'systems'])
    expect(Object.keys(stored.data.systems)).toEqual([...SYSTEM_IDS])
    expect(Object.keys(stored.data.systems.cobalt[0])).toEqual(['index', 'events'])
    // No word of whether anything was right, of what a tube shows beyond what the learner recorded, or of a note.
    expect(JSON.stringify(stored)).not.toMatch(/wrong|counts|notes|shows|judged/)
  })

  it('with a run stored opens on the Lab tab, on the system and the disturbance the run was in the middle of, with Restart and no docked notebook; and the Record tab holds the record', () => {
    save(open(COBALT, 1, 'challenge'))
    const html = page()
    expect(selectedTab(html)).toEqual(['Lab'])
    const [, lab, record] = panels(html)
    expect(lab!.body).toContain(`>${disturbanceTitle(data, 'cobalt-heat')}</h2>`)
    expect(count(lab!.body, /<h2[^>]*>/g)).toBe(1)
    expect(/<nav aria-label="Systems".*?<\/nav>/s.exec(lab!.body)![0]).toMatch(new RegExp(`aria-current="true"[^>]*><span[^>]*>${systemNumber(COBALT)}</span>`))
    expect(buttons(html).some((one) => one.name === SHELL_TEXT.restart)).toBe(true)
    expect(buttons(html).some((one) => one.name === SHELL_TEXT.start)).toBe(false)
    expect(html).not.toContain('aria-label="Lab notebook"')
    expect(html).toContain(`${SHELL_TEXT.mode}: <span class="${ROLE.value}">${SHELL_TEXT.modeName.challenge}</span>`)
    expect(record!.body).toContain(`<caption class="mb-2 text-left font-medium">${RECORD_TEXT.caption}</caption>`)
    // With system 1 done and nothing begun in the others, system 2, on its first disturbance.
    save(wholeSystem(m, fresh(), LEAD))
    const next = panels(page())[1]!.body
    expect(next).toContain(`>${disturbanceTitle(data, 'indicator-acid')}</h2>`)
    expect(next).toMatch(new RegExp(`aria-current="true"[^>]*><span[^>]*>${systemNumber(INDICATOR)}</span>`))
  })

  it('sets aside a stored record that does not fit, says so, and starts fresh', () => {
    // An answer with nothing recorded: nothing the reducer could have left.
    const state = fresh()
    saveEntry(app.store, lechatelier.entry, lechatelier.version, { ...state, systems: { ...state.systems, cobalt: [{ index: 0, events: [{ t: 'predict', way: 'left' }, { t: 'answer', is: 'left' }] }] } })
    const html = page()
    expect(html).toContain(escaped(SHELL_TEXT.setAside))
    expect(selectedTab(html)).toEqual(['Primer'])
    expect(buttons(html).some((one) => one.name === SHELL_TEXT.start)).toBe(true)
  })

  it('in a narrow window shows the notice on the Lab tab in place of the systems, the record on its tab, and nothing that changes a run', () => {
    save(wholeSystem(m, fresh(), LEAD))
    app.wide = false
    const html = page()
    const [, lab, record] = panels(html)
    expect(text(lab!.body)).toContain(NARROW_NOTICE.title)
    expect(lab!.body).not.toContain('<h2')
    expect(record!.body).toContain(RECORD_TEXT.caption)
    for (const name of [SHELL_TEXT.start, SHELL_TEXT.restart, actionLabel(data, 'indicator-acid'), PAGE_TEXT.workAgain]) expect(buttons(html).some((one) => one.name === name)).toBe(false)
    expect(html).not.toContain('type="radio"')
  })
})

describe('the four systems', () => {
  // System 1 done, system 3 with its second disturbance under way.
  const both = looked(changed(predicted(reached(COBALT, 1, 'challenge', wholeSystem(m, fresh('challenge'), LEAD)), COBALT), COBALT), COBALT)
  const { html, drawn, shown } = bench(both, COBALT)
  const nav = /<nav aria-label="Systems"[^>]*>(.*?)<\/nav>/s.exec(html)![1]!

  it('are chosen in a navigation named Systems: a button for each, a finger tall, with its number, its short name and how far it has come in words beside a mark, the one shown marked as current', () => {
    const chosen = buttons(nav)
    expect(chosen.map((one) => one.name)).toEqual([
      `${systemNumber(LEAD)}${systemShortName(data, LEAD)}${PROGRESS_MARK.done} ${PROGRESS_TEXT.done}`,
      `${systemNumber(INDICATOR)}${systemShortName(data, INDICATOR)}${PROGRESS_MARK['not-started']} ${PROGRESS_TEXT['not-started']}`,
      `${systemNumber(COBALT)}${systemShortName(data, COBALT)}${PROGRESS_MARK['under-way']} ${PROGRESS_TEXT['under-way']}`,
      `${systemNumber(HYDROXIDES)}${systemShortName(data, HYDROXIDES)}${PROGRESS_MARK['not-started']} ${PROGRESS_TEXT['not-started']}`,
    ])
    for (const one of chosen) expect(one.tag).toContain('min-h-11')
    expect(chosen.map((one) => one.tag.includes('aria-current="true"'))).toEqual([false, false, true, false])
    // The mark is for the eye, and the tick of a system that is done is in the role of a done mark.
    expect(nav).toContain(`<span aria-hidden="true" class="${ROLE.done}">${PROGRESS_MARK.done} </span>${PROGRESS_TEXT.done}`)
    expect(nav).toContain(`<span aria-hidden="true">${PROGRESS_MARK['under-way']} </span>${PROGRESS_TEXT['under-way']}`)
    // Four to a row at every width the bench has.
    expect(html).toContain('<nav aria-label="Systems" class="grid grid-cols-4 ')
  })

  it('are shown one at a time, and another is not drawn until it is asked for', () => {
    expect(count(html, /<h2[^>]*>/g)).toBe(1)
    expect(drawn).toHaveLength(1)
    expect(shown[0]).toContain(`>${disturbanceTitle(data, 'cobalt-heat')}</h2>`)
  })

  it("say what they are, by their whole name, and when the lab is complete, until a run is begun, and not after: the room is then the disturbance's", () => {
    const untouched = bench(fresh(), INDICATOR).html
    expect(text(untouched)).toContain(LAB_TEXT.aim)
    expect(text(untouched)).toContain(`${systemName(data, INDICATOR)}${SYSTEM_AIM[INDICATOR]}${LAB_TEXT.complete}`)
    expect(text(html)).not.toContain(SYSTEM_AIM[COBALT])
    expect(text(html)).not.toContain(LAB_TEXT.aim)
    // A system not yet begun still says what it is while another is under way; and the line on the lab's completion goes once the lab is complete.
    expect(text(bench(both, HYDROXIDES).html)).toContain(SYSTEM_AIM[HYDROXIDES])
    expect(text(bench(both, HYDROXIDES).html)).not.toContain(LAB_TEXT.aim)
    const again = reduce(m, allDone(), { type: 'workAgain', system: COBALT })
    expect(text(bench(again, COBALT).html)).not.toContain(SYSTEM_AIM[COBALT])
  })

  it('have at their head a status line that is empty, and takes no room, until the lab is complete, and then says so and that a system can still be worked again', () => {
    expect(html).toContain('<p role="status" class="max-w-prose text-sm font-medium -mb-3"></p>')
    const done = bench(allDone(), LEAD).html
    expect(read(done)).toContain(`|✓|${LAB_TEXT.completed}|`)
    expect(done).toContain('<p role="status" class="max-w-prose text-sm font-medium ">')
  })
})

describe('the list of disturbances', () => {
  const state = open(LEAD, 1)
  const { html, drawn, entry, foot } = bench(state, LEAD)
  const list = /<nav aria-label="Disturbances"[^>]*>(.*?)<\/nav>/s.exec(html)![1]!

  it('is a navigation named Disturbances that lists them and the entry that closes the run, each with its number and how it stands in words beside a mark', () => {
    const items = [...list.matchAll(/<li>(.*?)<\/li>/gs)].map((match) => read(match[1]!))
    const names = systemOf(data, LEAD).disturbances.map((d) => d.name)
    expect(items).toEqual([
      `|1.|${names[0]}|${STATUS_MARK.done}|${DISTURBANCE_STATUS_TEXT.done}|`,
      `|2.|${names[1]}|${STATUS_MARK.current}|${DISTURBANCE_STATUS_TEXT.current}|`,
      `|3.|${names[2]}|${STATUS_MARK.waiting}|${DISTURBANCE_STATUS_TEXT.waiting}|`,
      `|4.|${names[3]}|${STATUS_MARK.waiting}|${DISTURBANCE_STATUS_TEXT.waiting}|`,
      `|5.|${PAGE_TEXT.outcome}|○|${RECORD_TEXT.open}|`,
    ])
    expect(count(list, /aria-current="true"/g)).toBe(1)
    // The eight of system 4, each named for its metal.
    const eight = /<nav aria-label="Disturbances"[^>]*>(.*?)<\/nav>/s.exec(bench(fresh(), HYDROXIDES).html)![1]!
    expect(count(eight, /<li>/g)).toBe(9)
    expect(text(eight)).toContain('Zinc, more sodium hydroxide')
    expect(text(eight)).toContain('Magnesium, ammonia')
  })

  it("folds behind a button named Disturbances, as the primer's topics do, and stays behind it for longer than a primer's: the disturbance's two columns need the room", () => {
    const nav = /<nav aria-label="Disturbances"[^>]*>(.*?)<\/nav>/s.exec(html)![1]!
    const [folded, controls] = /<button[^>]*aria-expanded="false"[^>]*aria-controls="([^"]+)"[^>]*>(?:.*?)<\/button>/s.exec(nav)!
    expect(text(folded!)).toBe(PAGE_TEXT.disturbances)
    expect(folded).toContain('primer-topics-button lab-tap')
    expect(nav).toContain(`<ol id="${controls}" class="primer-topics `)
    expect(html).toContain('<div class="primer-layout primer-layout-roomy">')
    expect(labCss).toContain('@container primer (min-width: 46rem) and (max-width: 57.99rem)')
  })

  it('shows one entry at a time, the disturbance the run has reached, and draws no other until it is asked for', () => {
    expect(drawn).toHaveLength(1)
    expect(entry).toContain(`>${disturbanceTitle(data, 'lead-heat')}</h2>`)
    expect(bench(state, LEAD, 0).entry).toContain(`>${disturbanceTitle(data, 'lead-acid')}</h2>`)
  })

  it('says on a disturbance which system and which run it is of and how it stands, as the description of a heading that can take focus', () => {
    const [, placeId, place, heading] = /<p id="([^"]+)" class="text-xs text-muted-foreground">(.*?)<\/p><h2 ([^>]*)>/s.exec(entry)!
    expect(read(place!)).toBe(`${systemNumber(LEAD)} · ${PAGE_TEXT.run(1)} ·|${STATUS_MARK.current}|${DISTURBANCE_STATUS_TEXT.current}|`)
    expect(heading).toContain(`aria-describedby="${placeId}"`)
    expect(heading).toContain('tabindex="-1"')
  })

  it('offers Previous and Next, each named by where it goes; at the first there is no Previous and at the last no Next', () => {
    const ways = (at: number) => buttons(bench(state, LEAD, at).foot).map((one) => one.name)
    expect(ways(1)).toEqual([`← ${PAGE_TEXT.previous(disturbanceTitle(data, 'lead-acid'))}`, `${PAGE_TEXT.next(disturbanceTitle(data, 'lead-cool'))} →`])
    expect(ways(0)).toEqual([`${PAGE_TEXT.next(disturbanceTitle(data, 'lead-heat'))} →`])
    expect(ways(3)).toEqual([`← ${PAGE_TEXT.previous(disturbanceTitle(data, 'lead-cool'))}`, `${PAGE_TEXT.next(PAGE_TEXT.outcome)} →`])
    expect(ways(CLOSING(LEAD))).toEqual([`← ${PAGE_TEXT.previous(disturbanceTitle(data, 'lead-water'))}`])
    expect(foot).toContain('lab-tap')
  })

  it("has under the ways on, on every entry, the bench; and over it, on a disturbance, the sources of the one shown, with what is Valence's own", () => {
    const under = (at: number) => [...bench(state, LEAD, at).foot.matchAll(/<details><summary[^>]*>(.*?)<\/summary>/g)].map((match) => match[1]).filter((name) => name === 'Sources' || name === PAGE_TEXT.bench)
    // The bench holds a disclosure of sources for each bottle's hazards: the first Sources is the disturbance's own.
    expect(under(1).slice(0, 2)).toEqual(['Sources', PAGE_TEXT.bench])
    expect(under(CLOSING(LEAD))[0]).toBe(PAGE_TEXT.bench)
    expect(text(foot)).toContain(SOURCES_TEXT)
    const cited = lechatelierCitations(data, 'lead-heat', sources)
    expect(cited.length).toBeGreaterThan(3)
    for (const { source } of cited) expect(foot).toContain(escaped(source.citation))
    // Closed, all of them.
    expect(foot).not.toContain('<details open')
  })
})

describe('the bench', () => {
  const { foot } = bench(fresh(), COBALT)
  const [, held] = new RegExp(`<details><summary[^>]*>${PAGE_TEXT.bench}</summary>(.*)$`, 's').exec(foot)!

  it('is one place that every disturbance has, closed: what stands on the bench of the system shown, as a list in words', () => {
    expect([...held!.matchAll(/<li>(.*?)<\/li>/g)].map((match) => text(match[1]!)).slice(0, benchLines(data, COBALT).length)).toEqual(benchLines(data, COBALT))
    expect(text(held!)).toContain('A bath of boiling water and a bath of ice water.')
    expect(text(bench(fresh(), INDICATOR).foot)).not.toContain('A bath of boiling water and a bath of ice water.')
  })

  it("has a tile for each of the lab's ten bottles, whichever system is shown, with its label and its hazards closed; the water has none", () => {
    const tiles = [...held!.matchAll(/<div role="group" aria-label="([^"]+)"/g)].map((match) => match[1])
    expect(tiles).toEqual(data.reagents.map((reagent) => escaped(reagent.name)))
    expect(tiles).toHaveLength(10)
    expect(count(held!, /<details><summary[^>]*>Hazards<\/summary>/g)).toBe(10)
    for (const reagent of data.reagents) expect(held).toContain(`<h4 class="font-medium">${escaped(reagent.classifiedAs)}</h4>`)
    expect(held).not.toContain(`aria-label="${data.water.name}"`)
    // Two to a row by the width the bench has, never the window's.
    expect(held).toContain('<div class="grid w-full gap-2 @2xl:grid-cols-2">')
  })

  it("writes on a bottle's label its formula over its strength; for the solid its formula in two lines; and for the indicator, which the record gives neither, what it is", () => {
    const lines = Object.fromEntries(data.reagents.map((reagent) => [reagent.id, labelLines(reagent)]))
    expect(lines['hcl-12m']).toEqual(['HCl', '12 M'])
    expect(lines['pbno32-0.3m']).toEqual(['Pb(NO₃)₂', '0.3 M'])
    expect(lines['cocl2-solid']).toEqual(['CoCl₂', '·6H₂O'])
    expect(lines['methyl-violet']).toEqual(['indicator'])
    for (const one of Object.values(lines)) expect(one.length).toBeLessThanOrEqual(2)
    // The solid's hazards are of the reagent as it is used, with no strength spoken of.
    expect(/aria-label="Cobalt\(II\) chloride hexahydrate, solid".*?<\/details>/s.exec(held!)![0]).toContain('As it is used here')
  })
})

describe('a disturbance before its prediction', () => {
  const guided = bench(fresh(), COBALT).entry
  const challenge = bench(fresh('challenge'), COBALT).entry

  it('has two cards: the equilibrium with the prediction under it, and the tube; what is seen and the question are not there yet', () => {
    expect(sheets(guided)).toEqual([EQUILIBRIUM_TEXT.heading, PREDICTION_TEXT.heading, TUBE_NAME.cobalt])
    expect(sheets(challenge)).toEqual(sheets(guided))
    expect(text(guided)).toContain(NOTES_TEXT.later)
    expect(guided).toMatch(/<div class="lechatelier-work"><div class="lechatelier-grid"><div class="lechatelier-first [^"]*">.*<\/div><section aria-labelledby="[^"]+" class="lechatelier-tube [^"]*">/s)
    expect(guided).not.toContain('lechatelier-then')
  })

  it('writes the equilibrium as the record has it, with what stands on each side, the colour of a liquid that holds both where the record gives one, and what is about to be done', () => {
    const lines = equilibriumLines(data, 'cobalt-water')
    const card = sheet(guided, EQUILIBRIUM_TEXT.heading)!
    expect(read(card)).toBe(`>${EQUILIBRIUM_TEXT.heading}|${lines.equation}|${lines.left}|${lines.right}|${lines.between}|${PAGE_TEXT.task}:|${taskText(data, 'cobalt-water')}|`)
    expect(card).toContain(`<p class="text-base ${ROLE.value}">`)
    expect(lines.between).toBe('A liquid that holds both is violet.')
    // Cobalt alone has the third line.
    for (const [system, id] of [[LEAD, 'lead-acid'], [INDICATOR, 'indicator-acid'], [HYDROXIDES, 'zinc-drop']] as const) {
      expect(equilibriumLines(data, id).between).toBeNull()
      expect(count(sheet(bench(fresh(), system).entry, EQUILIBRIUM_TEXT.heading)!, /<li>/g)).toBe(2)
    }
    // The equilibrium is the metal's own at each of system 4's disturbances.
    expect(text(bench(reached(HYDROXIDES, 4), HYDROXIDES).entry)).toContain(equilibriumLines(data, 'magnesium-drop').equation)
  })

  it('asks for the prediction as one question with the three ways, each named by the way alone and a finger tall, none chosen; says that it is not marked; and has the button that records it', () => {
    const card = sheet(guided, PREDICTION_TEXT.heading)!
    expect(text(card)).toContain(PREDICTION_TEXT.help)
    const [asked, ...more] = questions(card)
    expect(more).toEqual([])
    expect(asked!.legend).toBe(PREDICTION_TEXT.question)
    expect(asked!.choices.map((choice) => choice.label)).toEqual([WAY_LABEL.left, WAY_LABEL.right, WAY_LABEL.none])
    for (const choice of asked!.choices) {
      expect(choice.labelClass).toContain('min-h-11')
      expect(choice.input).not.toContain('checked')
    }
    expect(asked!.tag).not.toContain('disabled')
    expect(button(card, PREDICTION_TEXT.record)!.tag).toContain('min-h-11')
    // What stands on each side is said once, in the sheet over the form.
    expect(card).not.toContain(escaped(equilibriumLines(data, 'cobalt-water').left.replace(/^Left side: |\.$/g, '')))
  })

  it("has Guided's hint under the question, in a disclosure that is closed; Challenge has none", () => {
    expect(sheet(guided, PREDICTION_TEXT.heading)).toContain(`<details><summary class="[^"]*">${PAGE_TEXT.hint}</summary>`.replace('[^"]*', /<summary class="([^"]*)">Hint/.exec(guided)![1]!))
    expect(text(guided)).toContain(HINT['cobalt-water'])
    expect(count(guided, new RegExp(`>${PAGE_TEXT.hint}</summary>`, 'g'))).toBe(1)
    expect(challenge).not.toContain(`>${PAGE_TEXT.hint}</summary>`)
    for (const id of DISTURBANCE_IDS) expect(challenge).not.toContain(escaped(HINT[id]))
  })

  it('draws the tube already, to be looked at, with the button that makes the change waiting, focusable and faint, until the prediction is made', () => {
    const card = sheet(guided, TUBE_NAME.cobalt)!
    const act = button(card, actionLabel(data, 'cobalt-water'))!
    expect(act.tag).toContain('aria-disabled="true"')
    expect(act.tag).not.toMatch(/ disabled=/)
    expect(act.tag).toMatch(FAINT)
    expect(act.tag).toContain('min-h-11')
    expect(can(m, fresh(), { type: 'act', system: COBALT })).toBe('predict-first')
    expect(read(card)).toContain(`|${doneText(now(fresh(), COBALT))}|`)
    expect(parts(card)).toHaveLength(2)
  })

  it('shows of a disturbance not reached yet what will be done at it and where its notes will be, and nothing to press', () => {
    const waiting = bench(fresh(), COBALT, 2).entry
    expect(read(waiting)).toContain(`|${STATUS_MARK.waiting}|${DISTURBANCE_STATUS_TEXT.waiting}|${disturbanceTitle(data, 'cobalt-cool')}|${taskText(data, 'cobalt-cool')}|${NOTES_TEXT.later}|`)
    expect(waiting).not.toContain('<h3')
    expect(waiting).not.toContain('<button')
    expect(waiting).not.toContain('<svg')
  })
})

describe('the tube of a disturbance', () => {
  const state = predicted(reached(LEAD, 0), LEAD)
  const { entry } = bench(state, LEAD)
  const card = sheet(entry, TUBE_NAME.lead)!

  it('is a picture named for the tube, described by the line that says how it is looked at', () => {
    const [, describedBy] = new RegExp(`${TUBE} role="img" aria-label="${PAGE_TEXT.tubePicture(TUBE_NAME.lead)}" aria-describedby="([^"]+)"`).exec(card)!
    expect(card).toContain(`<p id="${describedBy}" class="text-muted-foreground">${PAGE_TEXT.explore}</p>`)
  })

  it('lays a real button over each of its two parts, the liquid over the bottom, each named for the look it is, inside the glass and tall enough for a finger', () => {
    const [liquid, bottom] = parts(card)
    expect([liquid!.look, bottom!.look]).toEqual(['liquid', 'bottom'])
    expect([liquid!.name, bottom!.name]).toEqual([lookLabel('liquid', false), lookLabel('bottom', false)])
    for (const part of [liquid!, bottom!]) {
      // Of a picture 320 by 260: at its full size the part is 58 px or more tall and 76 wide; at 280 px wide, as it is drawn beside its words, 50 px and 66.
      expect((part.height / 100) * TUBE_HEIGHT).toBeGreaterThanOrEqual(58)
      expect((part.width / 100) * 320).toBeGreaterThanOrEqual(76)
      expect(part.left).toBeCloseTo((50 / 320) * 100, 1)
      expect(part.body).toBe('')
    }
    expect(liquid!.top + liquid!.height).toBeCloseTo(bottom!.top, 5)
  })

  it('says beside the picture, of each part, whether it has been looked at: a mark and the words, the same in the name of its button, and a dashed edge until it has', () => {
    expect(read(card)).toContain(`|○|${LOOK_PART.liquid}: ${PAGE_TEXT.notLookedAt}|○|${LOOK_PART.bottom}: ${PAGE_TEXT.notLookedAt}|`)
    for (const part of parts(card)) expect(part.tag).toContain('border-dashed')
    const one = sheet(bench(run(m, state, [{ type: 'look', system: LEAD, at: 'bottom' }]), LEAD).entry, TUBE_NAME.lead)!
    expect(read(one)).toContain(`|○|${LOOK_PART.liquid}: ${PAGE_TEXT.notLookedAt}|✓|${LOOK_PART.bottom}: ${PAGE_TEXT.lookedAt}|`)
    const [liquid, bottom] = parts(one)
    expect(liquid!.tag).toContain('border-dashed')
    expect(bottom!.tag).not.toContain('border-dashed')
    // An edge has a light line about it, so that it shows on the blue liquid, on which the ink does not; a part that has been looked at has no edge and no line. The line is the shared tube's, for every lab, and no rule of this lab's stylesheet.
    expect(bottom!.tag).toContain('border-transparent')
    expect(liquid!.tag).not.toContain('border-transparent')
    expect(liquid!.tag).toContain(EDGE_HALO)
    expect(bottom!.tag).not.toContain(EDGE_HALO)
    expect(lechatelierCss).not.toContain('data-part')
    expect(bottom!.name).toBe(lookLabel('bottom', true))
    // A press of the change empties the looks: the tube has changed.
    expect(read(sheet(bench(changed(run(m, state, [{ type: 'look', system: LEAD, at: 'bottom' }]), LEAD, 1), LEAD).entry, TUBE_NAME.lead)!)).toContain(`|○|${LOOK_PART.bottom}: ${PAGE_TEXT.notLookedAt}|`)
  })

  it('says nothing of what is seen in it outside the part that is looked at: the whole of it in words is in a disclosure that is closed, with what has gone into the tube', () => {
    const shows = now(state, LEAD).shows!
    for (const at of LOOKS) expect(entry).not.toContain(escaped(lookText(shows, at)))
    const [, inWords] = new RegExp(`<details><summary[^>]*>${PAGE_TEXT.inWords}</summary>(.*?)</details>`, 's').exec(card)!
    expect(read(inWords!)).toBe(`|${tubeSoFarText(data, 'lead-acid')}|${tubeText(shows, 'room')}|`)
    expect(text(card.replace(inWords!, ''))).not.toMatch(/colourless|no solid/i)
    // A system with no bath does not say where its tube stands.
    const plain = sheet(bench(fresh(), INDICATOR).entry, TUBE_NAME.indicator)!
    expect(text(plain)).toContain(tubeText(now(fresh(), INDICATOR).shows!))
    expect(text(plain)).not.toContain(TEMPERATURE_TEXT.room)
  })

  it('has the one button that makes the change, a finger tall, which adds a portion at each press and says how many have gone in; once all are in it carries a tick, is not faint, and cannot be pressed again', () => {
    const label = actionLabel(data, 'lead-acid')
    const at = (presses: number) => sheet(bench(changed(state, LEAD, presses), LEAD).entry, TUBE_NAME.lead)!
    expect(button(card, label)!.tag).not.toContain('aria-disabled')
    expect(button(card, label)!.tag).toContain('min-h-11')
    for (const presses of [0, 1, 2, 3]) expect(at(presses)).toContain(`<p role="status" class="max-w-prose font-medium">${doneText({ kind: 'add', portions: 3, acted: presses })}</p>`)
    expect(button(at(2), label)!.tag).not.toContain('aria-disabled')
    const full = button(at(3), `✓ ${label}`)!
    expect(full.tag).toContain('aria-disabled="true"')
    expect(full.tag).not.toMatch(FAINT)
    expect(at(3)).toContain(`<span aria-hidden="true" class="${ROLE.done}">✓ </span>`)
    expect(can(m, changed(state, LEAD), { type: 'act', system: LEAD })).toBe('action-done')
    expect(blockedText(data, 'action-done', 'lead-acid')).toBe('That has been done. The amount is fixed.')
  })

  it("has two message lines: one for what a look shows, for a screen reader alone, and one for why a press did nothing, which takes no room while it is empty", () => {
    expect(entry).toContain('<div class="sr-only"><p role="status"></p></div>')
    expect(card).toContain('<div class="-mt-2"><p role="status"></p></div>')
  })

  it("lays its card out by the card's own width, never the window's: what goes with the picture is beside it where the card is wide enough, and under it where it is not", () => {
    expect(card).toMatch(/<div class="lechatelier-tube-grid w-full"><div class="relative w-80 max-w-full shrink-0"><svg /)
    expect(lechatelierCss).toContain('container: lechatelier-tube / inline-size')
    expect(lechatelierCss).toContain('@container lechatelier-tube (min-width: 29rem)')
    expect(lechatelierCss).toContain('container: lechatelier-work / inline-size')
    expect(lechatelierCss).toContain('@container lechatelier-work (min-width: 40rem)')
    expect(lechatelierCss).not.toContain('@media')
  })
})

describe('the tube as it is drawn', () => {
  const svgOf = (state: LechatelierState, system: SystemId, at?: number) => picture(bench(state, system, at).entry)
  /** Where the surface of the liquid is drawn. */
  const surface = (svg: string) => Number(/<line x1="48" x2="128" y1="([\d.]+)"/.exec(svg)![1])
  const fill = (svg: string) => /<rect x="48" y="[\d.]+" width="80" height="[\d.]+" fill="(#[0-9a-f]{6})"><\/rect>/.exec(svg)![1]

  it('stands on a white card with everything in fixed colours, so that it is judged against white in the dark theme too', () => {
    const svg = svgOf(fresh(), COBALT)
    expect(svg).toContain('<rect x="1" y="1" width="318" height="258" rx="8" fill="#ffffff"')
    expect(svg).not.toMatch(/currentColor|var\(--/)
  })

  it('draws the liquid in the colour of the word the record has for it, at every tube the lab shows; the six are six colours', () => {
    const drawn = new Map<string, string>()
    for (const system of SYSTEM_IDS) {
      let state = fresh()
      for (let at = 0; at < CLOSING(system); at++) {
        // Before the change, and after each press of it.
        let on = predicted(state, system)
        for (let press = 0; press <= now(state, system).portions; press++) {
          const { colour } = now(on, system).shows!.liquid!
          expect(fill(svgOf(on, system)), `${idOf(system, at)}, press ${press}`).toBe(liquidHex(colour))
          drawn.set(colour, liquidHex(colour))
          if (press < now(state, system).portions) on = changed(on, system, 1)
        }
        state = workDisturbance(m, state, system)
      }
    }
    expect([...drawn.keys()].sort()).toEqual([...m.liquidChoices].sort())
    expect(new Set(drawn.values()).size).toBe(6)
    // The middle of the indicator's range: no name, the colour drawn between its blue and its yellow, and the words the record has.
    const middle = changed(predicted(fresh(), INDICATOR), INDICATOR, 1)
    expect(now(middle, INDICATOR).shows!.liquid!.colour).toBe('between blue and yellow')
    expect(lookText(now(middle, INDICATOR).shows!, 'liquid')).toBe('The liquid is clear, and between blue and yellow in colour.')
    expect(fill(svgOf(middle, INDICATOR))).toBe('#00ae96')
  })

  it('tells a white solid from the liquid over it by more than colour: the solid alone has an edge, a grain over it, and a bracket with the word solid', () => {
    const none = svgOf(changed(predicted(fresh(), LEAD), LEAD, 1), LEAD)
    const solid = svgOf(changed(predicted(fresh(), LEAD), LEAD, 2), LEAD)
    expect(now(changed(predicted(fresh(), LEAD), LEAD, 2), LEAD).shows!.solid).toEqual({ colour: 'white', settled: true })
    const EDGE = /<rect x="48" y="192" width="80" height="260" fill="#ffffff" stroke="#3f3f46" stroke-width="1.2"><\/rect><rect x="48" y="192" width="80" height="260" fill="url\(#[^)]+grain\)"><\/rect>/
    expect(solid).toMatch(EDGE)
    expect(none).not.toMatch(EDGE)
    const words = (svg: string) => [...svg.matchAll(/<text x="153"[^>]*>([^<]+)<\/text>/g)].map((match) => match[1])
    expect(words(none)).toEqual([PAGE_TEXT.liquidLayer])
    expect(words(solid)).toEqual([PAGE_TEXT.liquidLayer, PAGE_TEXT.solidLayer])
    // The same for the hydroxides: a share that keeps its solid, and one that loses it.
    expect(words(svgOf(changed(predicted(reached(HYDROXIDES, 6), HYDROXIDES), HYDROXIDES), HYDROXIDES))).toEqual([PAGE_TEXT.liquidLayer, PAGE_TEXT.solidLayer])
    expect(words(svgOf(changed(predicted(reached(HYDROXIDES, 2), HYDROXIDES), HYDROXIDES), HYDROXIDES))).toEqual([PAGE_TEXT.liquidLayer])
  })

  it('draws the bath a tube stands in behind it, told by what is drawn and by a word and not by a colour: bubbles and steam and "boiling water", or blocks of ice and "ice water"; a tube in the rack has none', () => {
    const hot = svgOf(changed(predicted(reached(LEAD, 1), LEAD), LEAD), LEAD)
    const cold = svgOf(changed(predicted(reached(LEAD, 2), LEAD), LEAD), LEAD)
    const rack = svgOf(changed(predicted(reached(LEAD, 3), LEAD), LEAD), LEAD)
    const bath = (svg: string) => /<g data-bath="(hot|cold)">(.*?)<\/g><path d="M 48 20[^"]*Z" fill="#ffffff"><\/path>/s.exec(svg)
    expect(bath(hot)![1]).toBe('hot')
    expect(bath(cold)![1]).toBe('cold')
    expect(bath(rack)).toBeNull()
    expect(rack).not.toContain('data-bath')
    // The word beside the rim, which is the bath's of the sentence that says where the tube stands.
    expect(bath(hot)![2]).toContain(`>${BATH_LABEL.hot}</text>`)
    expect(bath(cold)![2]).toContain(`>${BATH_LABEL.cold}</text>`)
    // Bubbles and wisps of steam in the one, and neither in the other; blocks in the other, and none in the one.
    expect(count(bath(hot)![2]!, /<circle /g)).toBe(8)
    expect(count(bath(hot)![2]!, /<path d="M \d+ 104 c /g)).toBe(2)
    expect(bath(hot)![2]).not.toContain('<rect')
    expect(count(bath(cold)![2]!, /<rect [^>]*rx="2"/g)).toBe(4)
    expect(bath(cold)![2]).not.toContain('<circle')
    // The water is one colour in both.
    expect(/<path d="[^"]+" fill="(#[0-9a-f]{6})"><\/path>/.exec(bath(hot)![2]!)![1]).toBe(/<path d="[^"]+" fill="(#[0-9a-f]{6})"><\/path>/.exec(bath(cold)![2]!)![1])
    // The inside of the glass is white over the bath, and the brackets stand clear of the beaker.
    expect(hot).toMatch(/<text x="177"[^>]*>liquid<\/text>/)
    expect(rack).toMatch(/<text x="153"[^>]*>liquid<\/text>/)
    // The tube is still in the bath it was left in when the next disturbance opens, and the words beside the picture say so.
    const next = bench(reached(LEAD, 2), LEAD).entry
    expect(picture(next)).toContain('data-bath="hot"')
    expect(text(next)).toContain(`${doneText(now(reached(LEAD, 2), LEAD))} ${TEMPERATURE_TEXT.hot}`)
    // Once the tube has been stood in a bath, the sentence that says so is the one that names the bath.
    expect(bench(changed(predicted(reached(LEAD, 2), LEAD), LEAD), LEAD).entry).toContain(`<p role="status" class="max-w-prose font-medium">${doneText({ kind: 'cool', portions: 1, acted: 1 })}</p>`)
  })

  it('draws the liquid higher once a millilitre or more has gone in', () => {
    const before = surface(svgOf(predicted(reached(LEAD, 3), LEAD), LEAD))
    const after = surface(svgOf(changed(predicted(reached(LEAD, 3), LEAD), LEAD), LEAD))
    expect(after).toBeLessThan(before - 10)
  })

  it('moves nothing: the page has no animation, so there is nothing for the reduced-motion setting to stop', () => {
    expect(lechatelierCss).not.toMatch(/animation|transition|@keyframes/)
    const { html } = bench(changed(predicted(reached(LEAD, 1), LEAD), LEAD), LEAD)
    expect(html).not.toMatch(/animate-|aq-bubble|cal-stir/)
  })
})

describe("the tubes of system 4", () => {
  const rack = (entry: string) => {
    const found = /<ol class="lechatelier-rack text-xs">(.*?)<\/ol>/s.exec(entry)
    return found === null ? null : [...found[1]!.matchAll(/<li([^>]*)>(.*?)<\/li>/g)].map(([, tag, body]) => ({ current: tag!.includes('aria-current="true"'), name: text(body!) }))
  }

  it('are named at the head of the card of each: which metal, and whether the first tube or the share for acid, for more sodium hydroxide or for ammonia', () => {
    const tubes = ['zinc', 'zinc-acid', 'zinc-base', 'zinc-ammonia', 'magnesium', 'magnesium-acid', 'magnesium-base', 'magnesium-ammonia'] as const
    for (const [at, tube] of tubes.entries()) {
      const { entry } = bench(reached(HYDROXIDES, at), HYDROXIDES)
      expect(sheets(entry)).toContain(TUBE_NAME[tube])
      expect(entry).toContain(`aria-label="${PAGE_TEXT.tubePicture(TUBE_NAME[tube])}"`)
      expect(now(reached(HYDROXIDES, at), HYDROXIDES).tube).toBe(tube)
    }
    expect(new Set(tubes.map((tube) => TUBE_NAME[tube])).size).toBe(8)
  })

  it('stand in a list over the picture, the four of the metal in hand, with the one the learner is on marked as current, in bold, behind a pointer for the eye', () => {
    const zinc = rack(bench(reached(HYDROXIDES, 2), HYDROXIDES).entry)!
    expect(zinc).toEqual([
      { current: false, name: TUBE_NAME.zinc },
      { current: false, name: TUBE_NAME['zinc-acid'] },
      { current: true, name: `▸ ${TUBE_NAME['zinc-base']}` },
      { current: false, name: TUBE_NAME['zinc-ammonia'] },
    ])
    expect(bench(reached(HYDROXIDES, 2), HYDROXIDES).entry).toContain('<span aria-hidden="true">▸ </span>')
    expect(bench(reached(HYDROXIDES, 2), HYDROXIDES).entry).toContain('aria-[current]:font-semibold')
    const magnesium = rack(bench(reached(HYDROXIDES, 4), HYDROXIDES).entry)!
    expect(magnesium.map((one) => one.name)).toEqual([`▸ ${TUBE_NAME.magnesium}`, TUBE_NAME['magnesium-acid'], TUBE_NAME['magnesium-base'], TUBE_NAME['magnesium-ammonia']])
    // A disturbance that is done keeps its list.
    expect(rack(bench(reached(HYDROXIDES, 2), HYDROXIDES, 1).entry)!.find((one) => one.current)!.name).toBe(`▸ ${TUBE_NAME['zinc-acid']}`)
  })

  it('say, in the tube in words, that a share holds the stirred mixture of the first tube', () => {
    expect(text(bench(reached(HYDROXIDES, 1), HYDROXIDES).entry)).toContain(tubeSoFarText(data, 'zinc-acid'))
    expect(tubeSoFarText(data, 'zinc-acid')).toBe('This tube holds 10 drops (0.5 mL) of the stirred mixture from the first zinc tube.')
  })

  it('are not listed in the three systems that have one tube', () => {
    for (const system of [LEAD, INDICATOR, COBALT]) {
      const { entry } = bench(fresh(), system)
      expect(rack(entry)).toBeNull()
      expect(sheets(entry)).toContain(PAGE_TEXT.tube)
    }
  })
})

describe('the prediction', () => {
  it('once recorded is a line beside Change, with no mark on it and nothing said of it: it is kept, and never judged', () => {
    for (const mode of ['guided', 'challenge'] as const) {
      const card = sheet(bench(predicted(fresh(mode), COBALT), COBALT).entry, PREDICTION_TEXT.heading)!
      expect(read(card)).toContain(`|${PREDICTION_TEXT.said('right')}|${PAGE_TEXT.change}|`)
      expect(card).not.toContain('<fieldset')
      expect(card).not.toMatch(/✓|✕/)
      expect(card).toContain('<p role="status"></p>')
      expect(text(card)).not.toContain(PREDICTION_TEXT.help)
      expect(button(card, PAGE_TEXT.change)!.tag).toContain('min-h-11')
    }
  })

  it('is fixed once the change begins: a line under the equilibrium that says so, with no heading of its own and no way to change it', () => {
    const state = changed(predicted(fresh(), LEAD), LEAD, 1)
    const { entry } = bench(state, LEAD)
    expect(now(state, LEAD).predictionFixed).toBe(true)
    expect(sheets(entry)).not.toContain(PREDICTION_TEXT.heading)
    expect(read(entry)).toContain(`|${PREDICTION_TEXT.said('right')}|${PREDICTION_TEXT.fixed}|`)
    expect(entry.split('lechatelier-tube')[0]).not.toContain('<button')
    expect(can(m, state, { type: 'predict', system: LEAD, way: 'left' })).toBe('prediction-fixed')
  })
})

describe('what is seen', () => {
  it('comes with the prediction, as one line that says what opens it: first the change, all of it, then both looks', () => {
    const waits = (state: LechatelierState) => read(sheet(bench(state, LEAD).entry, OBSERVATION_TEXT.heading)!)
    const state = predicted(fresh(), LEAD)
    expect(waits(state)).toBe(`>${OBSERVATION_TEXT.heading}|${OBSERVATION_TEXT.actFirst}|`)
    expect(waits(changed(state, LEAD, 2))).toBe(`>${OBSERVATION_TEXT.heading}|${OBSERVATION_TEXT.actFirst}|`)
    expect(waits(changed(state, LEAD))).toBe(`>${OBSERVATION_TEXT.heading}|${OBSERVATION_TEXT.lookFirst}|`)
    expect(waits(run(m, changed(state, LEAD), [{ type: 'look', system: LEAD, at: 'liquid' }]))).toBe(`>${OBSERVATION_TEXT.heading}|${OBSERVATION_TEXT.lookFirst}|`)
    expect(sheet(bench(changed(state, LEAD), LEAD).entry, OBSERVATION_TEXT.heading)).toContain(`<p class="max-w-prose ${ROLE.held}">`)
    // A look made before the last portion does not open it: the tube has changed since.
    expect(now(changed(looked(changed(state, LEAD, 2), LEAD), LEAD, 1), LEAD).observationOpen).toBe(false)
  })

  it('opens with both looks as two questions, the solid and the colour of the liquid, each choice a finger tall and none made for the learner; the question of the disturbance is not there yet', () => {
    const { entry } = bench(open(LEAD, 0), LEAD)
    const card = sheet(entry, OBSERVATION_TEXT.heading)!
    const [solid, liquid, ...more] = questions(card)
    expect(more).toEqual([])
    expect([solid!.legend, liquid!.legend]).toEqual([FIELD_LABEL.solid, FIELD_LABEL.liquid])
    expect(solid!.choices.map((choice) => choice.label)).toEqual(['no solid', 'a white solid'])
    expect(liquid!.choices.map((choice) => choice.label)).toEqual(['colourless', 'yellow', 'between blue and yellow', 'blue', 'violet', 'pink'])
    for (const choice of [...solid!.choices, ...liquid!.choices]) {
      expect(choice.labelClass).toContain('min-h-11')
      expect(choice.input).not.toContain('checked')
    }
    expect(button(card, OBSERVATION_TEXT.record)!.tag).toContain('min-h-11')
    expect(card).toContain('<p role="status"></p>')
    expect(sheets(entry)).toEqual([EQUILIBRIUM_TEXT.heading, TUBE_NAME.lead, OBSERVATION_TEXT.heading])
  })

  it('in Guided, once recorded, is lines beside Change, said beside a tick to be what the tube showed; and the list of looks has gone, both having been made', () => {
    const state = recorded(LEAD, 0)
    const { entry } = bench(state, LEAD)
    const card = sheet(entry, OBSERVATION_TEXT.heading)!
    const [first, second] = observationLines(now(state, LEAD).observation!)
    expect(read(card)).toBe(`>${OBSERVATION_TEXT.heading}|${first}|${second}|${PAGE_TEXT.change}|✓|${checkedText([])}|`)
    expect(card).not.toContain('<fieldset')
    expect(text(sheet(entry, TUBE_NAME.lead)!)).not.toContain(PAGE_TEXT.lookedAt)
  })

  it('in Challenge shows what was recorded and says nothing of it until the system is checked, whether it is what the tube showed or not', () => {
    const right = recorded(LEAD, 0, 'challenge')
    const wrong = run(m, open(LEAD, 0, 'challenge'), [{ type: 'observe', system: LEAD, observation: { solid: 'none', liquid: 'pink' } }])
    for (const state of [right, wrong]) {
      const card = sheet(bench(state, LEAD).entry, OBSERVATION_TEXT.heading)!
      expect(read(card)).toBe(`>${OBSERVATION_TEXT.heading}|${observationLines(now(state, LEAD).observation!).join('|')}|${PAGE_TEXT.change}|${ANSWER_TEXT.notChecked}|`)
      expect(card).not.toMatch(/✓|✕/)
      expect(card).toContain('<p role="status"></p>')
    }
    expect(now(wrong, LEAD).wrongFields).toBeNull()
  })

  it('in Guided holds an observation that was recorded in Challenge to the tube, and says which part to look at again and not what it should be', () => {
    const wrong = run(m, open(LEAD, 0, 'challenge'), [{ type: 'observe', system: LEAD, observation: { solid: 'none', liquid: 'colourless' } }])
    const card = sheet(bench(reduce(m, wrong, { type: 'setMode', mode: 'guided' }), LEAD).entry, OBSERVATION_TEXT.heading)!
    expect(read(card)).toContain(`|✕|${mismatchText(['solid'])}|`)
    // The form is open again, with what was recorded in its boxes.
    expect(questions(card).map((question) => question.choices.filter((choice) => choice.input.includes('checked')).map((choice) => choice.label))).toEqual([['no solid'], ['colourless']])
    expect(mismatchText(['solid'])).not.toMatch(/white/)
  })
})

describe('the question of a disturbance', () => {
  it('comes once what is seen is recorded: which way the equilibrium went, with the three ways, each named by the way alone, none chosen, and the button that records the answer', () => {
    const { entry } = bench(recorded(COBALT, 1), COBALT)
    const asked = askText(data, 'cobalt-heat')
    expect(sheets(entry)).toEqual([EQUILIBRIUM_TEXT.heading, TUBE_NAME.cobalt, OBSERVATION_TEXT.heading, asked.heading])
    const card = sheet(entry, asked.heading)!
    const [question, ...more] = questions(card)
    expect(more).toEqual([])
    expect(question!.legend).toBe(asked.question)
    expect(question!.choices.map((choice) => choice.label)).toEqual([WAY_LABEL.left, WAY_LABEL.right, WAY_LABEL.none])
    for (const choice of question!.choices) {
      expect(choice.labelClass).toContain('min-h-11')
      expect(choice.input).not.toContain('checked')
    }
    expect(button(card, ANSWER_TEXT.record)!.tag).toContain('min-h-11')
    // The two cards after the tube are one, with a rule between its sheets.
    expect(entry).toMatch(/<div class="lechatelier-then grid min-w-0 divide-y /)
  })

  it('asks at the four tubes of system 4 that get more sodium hydroxide or ammonia what took the metal ion away, with the same three choices at each', () => {
    for (const at of [2, 3, 6, 7]) {
      const { entry } = bench(recorded(HYDROXIDES, at), HYDROXIDES)
      const asked = askText(data, idOf(HYDROXIDES, at))
      const [question] = questions(sheet(entry, asked.heading)!)
      expect(question!.legend).toBe(asked.question)
      expect(question!.choices.map((choice) => choice.label)).toEqual([CAUSE_LABEL.hydroxide, CAUSE_LABEL.ammonia, CAUSE_LABEL.nothing])
    }
    expect(askText(data, 'zinc-base').heading).toBe('What took the zinc ion away')
    expect(askText(data, 'magnesium-ammonia').heading).toBe('What took the magnesium ion away')
  })

  it("has Guided's hint under it, closed, and in Challenge the sentence that an answer is given once", () => {
    const guided = sheet(bench(recorded(COBALT, 1), COBALT).entry, askText(data, 'cobalt-heat').heading)!
    expect(guided).toContain(`>${PAGE_TEXT.hint}</summary>`)
    expect(text(guided)).toContain(HINT['cobalt-heat'])
    expect(text(guided)).not.toContain(ANSWER_TEXT.once)
    const challenge = sheet(bench(recorded(COBALT, 1, 'challenge'), COBALT).entry, askText(data, 'cobalt-heat').heading)!
    expect(text(challenge)).toContain(ANSWER_TEXT.once)
    expect(challenge).not.toContain(`>${PAGE_TEXT.hint}</summary>`)
    // The hint stands under the one question that is open: under the prediction before the change, and here after it.
    expect(count(bench(recorded(COBALT, 1), COBALT).entry, new RegExp(`>${PAGE_TEXT.hint}</summary>`, 'g'))).toBe(1)
  })
})

describe('a disturbance that is done', () => {
  const done = bench(reached(COBALT, 2), COBALT, 0).entry

  it('shows its notes first and outright, in a card that can take focus, under the line that says it is done: they are what the disturbance is for', () => {
    expect(sheets(done)).toEqual([NOTES_TEXT.notes, EQUILIBRIUM_TEXT.heading, TUBE_NAME.cobalt, OBSERVATION_TEXT.heading])
    expect(read(done)).toContain(`|✓|${PAGE_TEXT.disturbanceDone}|${NOTES_TEXT.notes}|`)
    expect(done).toMatch(/<section tabindex="-1" aria-labelledby="[^"]+" class="[^"]*focus-visible:ring-2[^"]*"><div[^>]*><h3 /)
    const card = sheet(done, NOTES_TEXT.notes)!
    expect(card).not.toContain('<details')
    for (const note of disturbanceNotes(data, 'cobalt-water')) expect(card).toContain(`<p>${escaped(note)}</p>`)
    expect(text(done)).not.toContain(NOTES_TEXT.later)
    // Until it is done the line is there, empty, and takes no room.
    expect(bench(recorded(COBALT, 0), COBALT).entry).toContain('<p role="status" class="text-sm font-medium -mb-2"></p>')
  })

  it("sets the learner's prediction and answer over the notes: the prediction as it was made and never marked, and the answer, said in Guided beside a tick to be right", () => {
    const card = sheet(done, NOTES_TEXT.notes)!
    const asked = askText(data, 'cobalt-water')
    expect(read(card)).toContain(`|${PREDICTION_TEXT.said('left')}|${asked.heading}:|${WAY_LABEL.left}|✓|${ANSWER_TEXT.right}|`)
    expect(card.indexOf(escaped(PREDICTION_TEXT.said('left')))).toBeLessThan(card.indexOf(escaped(disturbanceNotes(data, 'cobalt-water')[0]!)))
    // A prediction that was not what happened is said the same way, with no mark of its own.
    const other = sheet(bench(workDisturbance(m, fresh(), COBALT, { predict: 'right' }), COBALT, 0).entry, NOTES_TEXT.notes)!
    expect(read(other)).toContain(`|${PREDICTION_TEXT.said('right')}|${asked.heading}:|${WAY_LABEL.left}|✓|${ANSWER_TEXT.right}|`)
    expect(count(other, /✓|✕/g)).toBe(1)
  })

  it('in Challenge says of the answer and of what was recorded that they are not checked yet, until the system is checked; then each carries its mark', () => {
    const wrong = workDisturbance(m, fresh('challenge'), COBALT, { wrongAnswerAt: 'cobalt-water', wrongLiquidAt: 'cobalt-water' })
    const before = bench(wrong, COBALT, 0).entry
    expect(read(sheet(before, NOTES_TEXT.notes)!)).toContain(`|${askText(data, 'cobalt-water').heading}:|${WAY_LABEL.right}|${ANSWER_TEXT.notChecked}|`)
    expect(read(sheet(before, OBSERVATION_TEXT.heading)!)).toContain(`|${ANSWER_TEXT.notChecked}|`)
    expect(before).not.toMatch(/✕/)
    expect(sheet(before, NOTES_TEXT.notes)).not.toMatch(/✓/)
    const checked = bench(wholeSystem(m, wrong, COBALT), COBALT, 0).entry
    expect(read(sheet(checked, NOTES_TEXT.notes)!)).toContain(`|${askText(data, 'cobalt-water').heading}:|${WAY_LABEL.right}|✕|${ANSWER_TEXT.notRight}|`)
    expect(read(sheet(checked, OBSERVATION_TEXT.heading)!)).toContain(`|✕|${FIELD_LABEL.liquid}: colourless.|✕|${checkedText(['liquid'])}|`)
    expect(checked).toContain(`<span aria-hidden="true" class="${ROLE.failed}">✕ </span>`)
  })

  it('gives with the notes the second change in the tube, where the record has one, under its own heading', () => {
    const withEquation = sheet(bench(reached(INDICATOR, 2), INDICATOR, 1).entry, NOTES_TEXT.notes)!
    expect(withEquation).toContain(`<h4 class="font-medium">${NOTES_TEXT.equations}</h4>`)
    expect([...withEquation.matchAll(/<li class="lab-value">(.*?)<\/li>/g)].map((match) => match[1])).toEqual(disturbanceEquations(data, 'indicator-base').map(escaped))
    expect(disturbanceEquations(data, 'cobalt-water')).toEqual([])
    expect(sheet(done, NOTES_TEXT.notes)).not.toContain(NOTES_TEXT.equations)
  })

  it('shows its tube as it was left, which can still be looked at, with what was recorded as lines to be read and nothing to press but the looks', () => {
    const state = reached(COBALT, 2)
    const left = view(state, COBALT).disturbances[0]!
    expect(picture(done)).toContain(`fill="${liquidHex(left.shows!.liquid!.colour)}"`)
    expect(parts(done)).toHaveLength(2)
    expect(buttons(done).filter((one) => !one.tag.includes('data-part'))).toEqual([])
    expect(done).not.toContain('<fieldset')
    const [first, second] = observationLines(left.observation!)
    expect(read(sheet(done, OBSERVATION_TEXT.heading)!)).toBe(`>${OBSERVATION_TEXT.heading}|${first}|${second}|✓|${checkedText([])}|`)
    // The prediction stands with the notes, and nowhere else.
    expect(count(done, new RegExp(escaped(PREDICTION_TEXT.said('left')), 'g'))).toBe(1)
    expect(text(done)).not.toContain(PAGE_TEXT.notLookedAt)
  })
})

describe('what is kept back', () => {
  it('is, of a disturbance, its notes and its equations until it is done, and what its tube shows in words until a part is looked at: they are on no entry before that, in either mode', { timeout: 30_000 }, () => {
    let drawn = 0
    for (const mode of ['guided', 'challenge'] as const) {
      for (const system of SYSTEM_IDS) {
        /** Nothing a disturbance that is not done has to say of what happened is in the Lab tab, whichever entry is shown; and nothing a look would say is there before the look. */
        const kept = (state: LechatelierState) => {
          const of = view(state, system)
          const at = of.disturbance === null ? CLOSING(system) : of.disturbances.findIndex((d) => d.id === of.disturbance)
          const { html } = bench(state, system, at)
          drawn++
          for (const d of of.disturbances) {
            if (d.status === 'done') continue
            for (const said of [...disturbanceNotes(data, d.id), ...disturbanceEquations(data, d.id)]) expect(html.includes(escaped(said)), `${mode} ${d.id}`).toBe(false)
            expect(d.notesShown).toBe(false)
          }
          const current = of.disturbances.find((d) => d.status === 'current')
          if (current) for (const look of LOOKS) expect(html.includes(escaped(lookText(current.shows!, look))), `${mode} ${current.id}: ${look}`).toBe(false)
        }
        // Each disturbance untouched, predicted, after every press, looked at, with what is seen recorded, and done; the last leaves them all done.
        let state = fresh(mode)
        for (let at = 0; at < CLOSING(system); at++) {
          kept(state)
          let on = predicted(state, system)
          kept(on)
          for (let press = 0; press < now(state, system).portions; press++) {
            on = changed(on, system, 1)
            kept(on)
          }
          on = looked(on, system)
          kept(on)
          kept(observed(on, system))
          state = workDisturbance(m, state, system)
        }
        kept(state)
      }
    }
    // For each mode: four points and one for each press at each of the seventeen disturbances, which take twenty-one presses between them, and each of the four systems once more with all done.
    expect(drawn).toBe(2 * (17 * 4 + 21 + 4))
  })

  it('is, in Challenge, whether anything recorded is right, until the system is checked: no mark, no word of it, on any entry of a system with a wrong observation and a wrong answer in it', () => {
    for (const system of SYSTEM_IDS) {
      const first = idOf(system, 0)
      const state = wholeSystem(m, fresh('challenge'), system, { wrongAnswerAt: first, wrongLiquidAt: first, check: false })
      expect(view(state, system).outcome.state).toBe('to-check')
      for (let at = 0; at <= CLOSING(system); at++) {
        const { entry } = bench(state, system, at)
        expect(entry, `${system} ${at}`).not.toMatch(/✕/)
        expect(read(entry)).not.toContain(`|${ANSWER_TEXT.right}|`)
        expect(read(entry)).not.toContain(`|${ANSWER_TEXT.notRight}|`)
        expect(text(entry)).not.toContain('Checked:')
      }
    }
  })

  it('is, in Challenge, the hint, at every point of a disturbance; and in both modes whether an answer is right before it is given: the view the page is drawn from says nothing of it', () => {
    for (const state of [fresh('challenge'), predicted(fresh('challenge'), COBALT), open(COBALT, 1, 'challenge'), recorded(COBALT, 1, 'challenge'), reached(COBALT, 2, 'challenge')]) {
      const { html } = bench(state, COBALT)
      for (const id of DISTURBANCE_IDS) expect(html).not.toContain(escaped(HINT[id]))
      expect(html).not.toContain(`>${PAGE_TEXT.hint}</summary>`)
    }
    for (const mode of ['guided', 'challenge'] as const) {
      const current = now(recorded(COBALT, 1, mode), COBALT)
      expect([current.answer, current.answerRight, current.notesShown]).toEqual([null, null, false])
    }
  })
})

describe('how a system came out', () => {
  const closing = (state: LechatelierState, system: SystemId = INDICATOR) => bench(state, system, CLOSING(system)).entry

  it('is said on the last entry of its list, named This system, with the whole name of the system: not finished yet, while there is a disturbance to work', () => {
    const entry = closing(fresh())
    expect(entry).toMatch(new RegExp(`<h2 [^>]*tabindex="-1"[^>]*>${PAGE_TEXT.outcome}</h2>`))
    expect(read(entry)).toContain(`|${systemNumber(INDICATOR)} · ${PAGE_TEXT.run(1)} ·|○|${RECORD_TEXT.open}|${PAGE_TEXT.outcome}|${systemName(data, INDICATOR)}|${RECORD_TEXT.open}|${LAB_TEXT.complete}|`)
    expect(entry).toMatch(/<div tabindex="-1" class="[^"]*focus-visible:ring-2[^"]*">/)
    // Empty until the system counts.
    expect(entry).toContain('<p role="status" class="text-sm font-medium"></p>')
  })

  it('offers the check in Challenge, a finger tall, with what it does beside it: unavailable and focusable until every disturbance is done; Guided checks by itself and has no button', () => {
    const waiting = button(closing(fresh('challenge')), PAGE_TEXT.checkSystem)!
    expect(waiting.tag).toContain('aria-disabled="true"')
    expect(waiting.tag).toContain('min-h-11')
    expect(text(closing(fresh('challenge')))).toContain(PAGE_TEXT.checkSystemHelp)
    const toCheck = wholeSystem(m, fresh('challenge'), INDICATOR, { check: false })
    expect(button(closing(toCheck), PAGE_TEXT.checkSystem)!.tag).not.toContain('aria-disabled')
    expect(text(closing(toCheck))).toContain(outcomeText(data, { state: 'to-check' }))
    expect(button(closing(fresh()), PAGE_TEXT.checkSystem)).toBeUndefined()
    // A run whose last answer was given in Challenge still has it once the mode is Guided.
    expect(button(closing(reduce(m, toCheck, { type: 'setMode', mode: 'guided' })), PAGE_TEXT.checkSystem)!.tag).not.toContain('aria-disabled')
    // Once the check is made it is gone.
    expect(button(closing(wholeSystem(m, fresh('challenge'), INDICATOR)), PAGE_TEXT.checkSystem)).toBeUndefined()
  })

  it('says beside a tick that the system counts, and at the head of the entry that the system is done', () => {
    for (const mode of ['guided', 'challenge'] as const) {
      const entry = closing(wholeSystem(m, fresh(mode), INDICATOR))
      expect(read(entry)).toContain(`|✓|${PAGE_TEXT.systemDone}|✓|${outcomeText(data, { state: 'counts' })}|`)
      expect(read(entry)).toContain(`|✓|${RECORD_TEXT.counts}|`)
    }
  })

  it('says beside a cross that a run does not count, and where, for a wrong observation and for a wrong answer, and never what was right', () => {
    const state = wholeSystem(m, fresh('challenge'), INDICATOR, { wrongLiquidAt: 'indicator-acid', wrongAnswerAt: 'indicator-base' })
    const entry = closing(state)
    const reasons = [reasonText(data, { kind: 'observation-wrong', disturbance: 'indicator-acid' }), reasonText(data, { kind: 'answer-wrong', disturbance: 'indicator-base' })]
    expect(read(entry)).toContain(`|✕|This run does not count. ${reasons.join(' ')} Work the system again.|`)
    expect(read(entry)).toContain(`|◑|${RECORD_TEXT.doesNotCount}|`)
    expect(text(entry)).not.toMatch(/yellow|between blue|left side|right side/)
    expect(text(entry)).not.toContain(PAGE_TEXT.systemDone)
  })

  it('offers the way to work the system again, a finger tall, with what it does beside it: unavailable and focusable until a run is begun, and still taken once the lab is complete', () => {
    const none = button(closing(fresh()), PAGE_TEXT.workAgain)!
    expect(none.tag).toContain('aria-disabled="true"')
    expect(none.tag).toContain('min-h-11')
    expect(text(closing(fresh()))).toContain(PAGE_TEXT.workAgainHelp)
    expect(button(closing(predicted(fresh(), INDICATOR)), PAGE_TEXT.workAgain)!.tag).not.toContain('aria-disabled')
    const all = allDone()
    expect(button(closing(all), PAGE_TEXT.workAgain)!.tag).not.toContain('aria-disabled')
    expect(text(closing(all))).not.toContain(LAB_TEXT.complete)
    // A new run is a column of its own, on its first disturbance, and the system still counts by the run before.
    const again = reduce(m, all, { type: 'workAgain', system: INDICATOR })
    expect(again.status).toBe('completed')
    expect(read(bench(again, INDICATOR).entry)).toContain(`|${systemNumber(INDICATOR)} · ${PAGE_TEXT.run(2)} ·|${STATUS_MARK.current}|${DISTURBANCE_STATUS_TEXT.current}|${disturbanceTitle(data, 'indicator-acid')}|`)
  })
})

describe('the record', () => {
  const record = (state: LechatelierState) => draw(createElement(LechatelierRecord, { data, m, state }))
  const rows = (html: string) => [...html.matchAll(/<tr>(.*?)<\/tr>/gs)].map((match) => read(match[1]!))

  it('is one table with a caption and three headed columns, a group of rows for each system headed by the system with how far it has come, in a region that the keyboard can scroll', () => {
    const html = record(open(COBALT, 1))
    expect(html).toContain(`<div role="region" aria-label="${RECORD_TEXT.region}" tabindex="0"`)
    expect(html).toContain(`<caption class="mb-2 text-left font-medium">${RECORD_TEXT.caption}</caption>`)
    expect([...html.matchAll(/<th scope="col"[^>]*>(.*?)<\/th>/g)].map((match) => match[1])).toEqual([RECORD_TEXT.disturbance, RECORD_TEXT.recorded, RECORD_TEXT.result])
    expect(count(html, /<tbody>/g)).toBe(4)
    expect([...html.matchAll(/<th scope="rowgroup"[^>]*>(.*?)<\/th>/g)].map((match) => text(match[1]!))).toEqual(SYSTEM_IDS.map((id) => `${systemNumber(id)}: ${systemName(data, id)}`))
    expect(rows(html)).toContain(`|${systemNumber(COBALT)}: ${systemName(data, COBALT)}|${PROGRESS_MARK['under-way']}|${PROGRESS_TEXT['under-way']}|`)
    expect(rows(html)).toContain(`|${systemNumber(LEAD)}: ${systemName(data, LEAD)}|${PROGRESS_MARK['not-started']}|${PROGRESS_TEXT['not-started']}|`)
    // Narrow enough for an upright tablet.
    expect(html).toContain('min-w-[26rem]')
  })

  it('lists every run of a system in order, each with how it came out, and under it each disturbance at which something was entered, with the prediction, what was recorded and the answer', () => {
    const first = wholeSystem(m, fresh('challenge'), COBALT, { predict: 'right', wrongAnswerAt: 'cobalt-heat' })
    const second = observed(looked(changed(predicted(reduce(m, first, { type: 'workAgain', system: COBALT }), COBALT), COBALT), COBALT), COBALT)
    const html = record(second)
    expect(rows(html)).toContain(`|${PAGE_TEXT.run(1)}|${RECORD_TEXT.doesNotCount}|`)
    expect(rows(html)).toContain(`|${PAGE_TEXT.run(2)}|${RECORD_TEXT.open}|`)
    expect(rows(html)).toContain(`|${PAGE_TEXT.run(1)}|: ${RECORD_TEXT.nothing}|${RECORD_TEXT.open}|`)
    // Run 1, checked: the first disturbance right; the second with its answer not right, a cross on the answer and the word for it.
    expect(rows(html)).toContain(`|${disturbanceTitle(data, 'cobalt-water')}|${RECORD_TEXT.predicted}: ${WAY_LABEL.right}|${FIELD_LABEL.solid}: no solid.|${FIELD_LABEL.liquid}: violet.|${RECORD_TEXT.answered}: ${WAY_LABEL.left}|✓|${checkedText([])}|✓|${RECORD_TEXT.answered}: ${ANSWER_TEXT.right}|`)
    expect(rows(html)).toContain(`|${disturbanceTitle(data, 'cobalt-heat')}|${RECORD_TEXT.predicted}: ${WAY_LABEL.right}|${FIELD_LABEL.solid}: no solid.|${FIELD_LABEL.liquid}: blue.|✕|${RECORD_TEXT.answered}: ${WAY_LABEL.left}|✓|${checkedText([])}|✕|${RECORD_TEXT.answered}: ${ANSWER_TEXT.notRight}|`)
    expect(rows(html)).toContain(`|${reasonText(data, { kind: 'answer-wrong', disturbance: 'cobalt-heat' })}|`)
    // Run 2, not checked: what was entered, and that it is not checked yet.
    expect(rows(html)).toContain(`|${disturbanceTitle(data, 'cobalt-water')}|${RECORD_TEXT.predicted}: ${WAY_LABEL.right}|${FIELD_LABEL.solid}: no solid.|${FIELD_LABEL.liquid}: violet.|${RECORD_TEXT.toCheck}|`)
    // A disturbance at which nothing was entered has no row.
    expect(count(html, new RegExp(disturbanceTitle(data, 'cobalt-cool'), 'g'))).toBe(1)
  })

  it('never marks a prediction, and marks nothing of a run that has not been checked, in either mode', () => {
    const unchecked = record(wholeSystem(m, fresh('challenge'), LEAD, { wrongSolidAt: 'lead-acid', check: false }))
    expect(unchecked).not.toMatch(/✕|Checked:/)
    expect(rows(unchecked)).toContain(`|${PAGE_TEXT.run(1)}|${RECORD_TEXT.toCheck}|`)
    // A run under way in Guided is listed as it was entered: a check judges a run of the record.
    expect(record(recorded(LEAD, 1))).not.toMatch(/Checked:/)
    const checked = record(wholeSystem(m, fresh('challenge'), LEAD, { predict: 'none' }))
    for (const row of rows(checked).filter((one) => one.includes(RECORD_TEXT.predicted))) expect(row).toMatch(new RegExp(`\\|${RECORD_TEXT.predicted}: ${WAY_LABEL.none}\\|${FIELD_LABEL.solid}`))
  })

  it('says that the lab is complete once it is, and not before', () => {
    expect(record(wholeSystem(m, fresh(), LEAD))).not.toContain(escaped(LAB_TEXT.completed))
    expect(read(record(allDone()))).toContain(`|✓|${LAB_TEXT.completed}|`)
  })
})

describe('every disturbance of the lab', () => {
  it.each(DISTURBANCE_IDS.map((id) => [id] as const))('%s is drawn at each point of a careful run, with its own title, equilibrium, button and question', (id: DisturbanceId) => {
    const system = SYSTEM_IDS.find((one) => systemOf(data, one).disturbances.some((d) => d.id === id))!
    const at = systemOf(data, system).disturbances.findIndex((d) => d.id === id)
    for (const mode of ['guided', 'challenge'] as const) {
      const start = bench(reached(system, at, mode), system).entry
      expect(start).toContain(`>${escaped(disturbanceTitle(data, id))}</h2>`)
      expect(text(start)).toContain(equilibriumLines(data, id).equation)
      expect(button(start, actionLabel(data, id))).toBeDefined()
      const asked = bench(recorded(system, at, mode), system).entry
      expect(sheets(asked).at(-1)).toBe(askText(data, id).heading)
      const done = bench(reached(system, at + 1, mode), system, at).entry
      expect(sheets(done)[0]).toBe(NOTES_TEXT.notes)
      for (const note of disturbanceNotes(data, id)) expect(done).toContain(escaped(note))
    }
  })
})
