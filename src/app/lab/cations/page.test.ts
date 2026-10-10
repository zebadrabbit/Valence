import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ACTIVITIES } from '@/app/activities'
import { ROLE } from '@/app/lab/roles'
import { NARROW_NOTICE, SHELL_TEXT } from '@/app/lab/shellText'
import { labProgress } from '@/app/lab/useLabProgress'
import { WarningGroup } from '@/app/lab/WarningGroup'
import { createMemoryStore, saveEntry, type KeyValueStore } from '@/app/progress/storage'
import { cationsData as data, ION_IDS, PART_IDS, STEP_IDS, type PartId, type TubeId } from '@/chem-data/cations/data'
import { CATIONS_PRIMER, READ_FIRST } from '@/chem-data/cations/primer'
import { cationsCitations } from '@/chem-data/citations'
import sources from '@/chem-data/sources.json'
import { LOOKS, cationsStateSchema, can, createLab, mismatch, modelFrom, partView, reduce, warnings, type Action, type CationsState, type Mode, type Warning } from '@/engine/cations'
import { deduced, run, seen, wholeRun, workStep, type Technique } from '@/engine/cations/testkit'
import labCss from '../lab.css?raw'
import { CationsBench } from './CationsBench'
import { CationsPage } from './CationsPage'
import { CationsRecord } from './CationsRecord'
import cationsCss from './cations.css?raw'
import {
  ACTION_LABEL,
  CHART_TEXT,
  FIELD_LABEL,
  HINT,
  LAB_TEXT,
  LOOK_FIRST,
  LOOK_PART,
  MODE_TEXT,
  NAMING_TEXT,
  NOTES_TEXT,
  PAGE_TEXT,
  PART_AIM,
  POUR_LABEL,
  PROGRESS_TEXT,
  RECORD_TEXT,
  SAMPLE_HAZARDS_HEADING,
  SOURCES_TEXT,
  STEP_STATUS_TEXT,
  STEP_TASK,
  TUBE_NAME,
  WARNING_BUTTONS,
  WARNING_TEXT,
  addLabel,
  benchLines,
  blockedText,
  checkedText,
  doneText,
  holdsText,
  ionLabel,
  lookLabel,
  lookText,
  namedText,
  observationLines,
  outcomeText,
  partTitle,
  placeLabel,
  reasonText,
  stepEquations,
  stepNotes,
  stepTitle,
  tileLabel,
  tubeText,
} from './messages'
import { TUBE_HEIGHT, liquidHex, solidHex } from './tubeLook'

// The Group I cations lab's page as markup, on a store the test holds. AppStateProvider builds its store from the
// browser and the media hook has no value on a server, so both are given directly. What a press does (a button of
// the tube, a look, the Guided warning, the record of what is seen, a tile and a place, the check, the pouring off,
// the naming, Run this part again, the parts and Previous and Next) is state, and is checked in a browser: a markup
// render mounts the page and no more.
const app = vi.hoisted(() => ({ store: undefined as unknown as KeyValueStore, persistent: true, wide: true }))
vi.mock('@/app/AppState', () => ({ useAppState: () => ({ store: app.store, persistent: app.persistent, reducedMotion: false }) }))
vi.mock('@/app/useMediaQuery', () => ({ useMediaQuery: () => app.wide }))

const [, , , , cations] = ACTIVITIES
const m = modelFrom(data)
const SCHEMA = cationsStateSchema(m)
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
const button = (html: string, name: string) => buttons(html).find((one) => one.name === name)

const [KNOWN, UNKNOWN] = PART_IDS
const CLOSING = STEP_IDS.length
const fresh = (mode: Mode = 'guided', seed = 1) => createLab(seed, mode)
const view = (state: CationsState, part: PartId) => partView(m, state, part)
const stepOf = (state: CationsState, part: PartId) => view(state, part).steps.find((step) => step.status === 'current')!
/** A part brought carefully to one of its steps, counted from 0, with nothing done at it yet. */
const reached = (part: PartId, at: number, mode?: Mode, state = fresh(mode)) => Array.from({ length: at }).reduce<CationsState>((s) => workStep(m, s, part), state)
/** The reagent in; then the solid packed where there is one to pack; then both parts looked at; then what is seen recorded as the tube shows it. */
const added = (part: PartId, at: number, mode?: Mode, state?: CationsState) => run(m, reached(part, at, mode, state), [{ type: 'add', part }])
const packed = (state: CationsState, part: PartId) => (can(m, state, { type: 'centrifuge', part }) === null ? run(m, state, [{ type: 'centrifuge', part }]) : state)
const looked = (state: CationsState, part: PartId) => run(m, state, LOOKS.map((at): Action => ({ type: 'look', part, at })))
const observed = (state: CationsState, part: PartId) => run(m, state, [{ type: 'observe', part, observation: seen(m, stepOf(state, part).shows!) }])
const recorded = (part: PartId, at: number, mode?: Mode) => observed(looked(packed(added(part, at, mode), part), part), part)
/** The lab with a careful run of each part. */
const allDone = (mode?: Mode) => wholeRun(m, wholeRun(m, fresh(mode), KNOWN), UNKNOWN)

/** The Lab tab's bench on a state, opened at a part and an entry of its list, and that entry's own markup: the one that is not hidden. */
function bench(state: CationsState, part: PartId = KNOWN, entry?: number) {
  const opensAt = entry === undefined ? { part } : { part, entry }
  const html = draw(
    createElement(CationsBench, { data, m, sources, state, can: (action: Action) => can(m, state, action), warn: (action: Action) => warnings(m, state, action), wrong: (of: PartId, observation) => mismatch(m, state, of, observation), act: (action: Action) => void reduce(m, state, action), opensAt }),
  )
  const drawn = html.split(/(?=<div(?: hidden="")?><section aria-labelledby=)/).slice(1)
  const shown = drawn.filter((one) => !one.startsWith('<div hidden'))
  const [entryHtml, foot] = shown[0]!.split('<div class="flex flex-wrap justify-between gap-2">')
  return { html, drawn, shown, entry: entryHtml!, foot: foot! }
}
/** The cards of an entry, by their h3. */
const CARD = /(?=<section aria-labelledby="[^"]+" class="grid min-w-0 justify-items-start)/
const cards = (entry: string) => [...entry.matchAll(/<h3[^>]*>(.*?)<\/h3>/g)].map((match) => match[1])
/** A card alone: no card holds a section of its own, so it ends where the first section in it ends. */
const card = (entry: string, heading: string) => {
  const from = entry.split(CARD).find((one) => one.includes(`>${heading}</h3>`))!
  return from.slice(0, from.indexOf('</section>'))
}
/** The head of an entry: what stands over its first card. And what stands under its last: the buttons that end a step, the line that says it is done, and its notes. */
const head = (entry: string) => entry.split(CARD)[0]!
const tail = (entry: string) => {
  const last = entry.split(CARD).at(-1)!
  return entry.split(CARD).length === 1 ? last : last.slice(last.indexOf('</section>'))
}
/** The picture of the step's tube, and the buttons laid over its two parts: each by the look it is, its name and where it lies, in hundredths of the picture. */
const TUBE = `<svg viewBox="0 0 320 ${TUBE_HEIGHT}"`
const picture = (entry: string) => new RegExp(`${TUBE}.*?</svg>`, 's').exec(entry)![0]
const parts = (html: string) =>
  [...html.matchAll(/<button type="button" data-part="([^"]+)" aria-label="([^"]+)"([^>]*)>(.*?)<\/button>/gs)].map(([, look, name, tag, body]) => {
    const [, left, top, width, height] = /style="left:([\d.]+)%;top:([\d.]+)%;width:([\d.]+)%;height:([\d.]+)%/.exec(tag!)!.map(Number)
    return { look: look!, name: name!, tag: tag!, body: body!, left: left!, top: top!, width: width!, height: height! }
  })
/** The large tube alone: the picture with the rack, which is the last group of it, taken off. */
const large = (svg: string) => svg.split('<g><defs><pattern')[0]!
/** The places of a chart, each by its name, whether it can be filled, and what it holds in words. */
const places = (chart: string) =>
  [...chart.matchAll(/<ul(?: aria-live="polite")? aria-label="([^"]+)" class="flex[^"]*">(.*?)<\/ul>/gs)].map(([tag, name, body]) => ({
    name: name!,
    open: tag.startsWith('<ul aria-live'),
    holds: [...body!.matchAll(/<li[^>]*>(.*?)<\/li>/gs)].map((match) => read(match[1]!).replace(/^\||\|$/g, '')),
  }))

beforeEach(() => {
  app.store = createMemoryStore()
  app.persistent = true
  app.wide = true
})

describe('the Group I cations page', () => {
  const page = () => draw(createElement(CationsPage))
  const save = (state: CationsState) => saveEntry(app.store, cations.entry, cations.version, state)

  it("with nothing stored opens on the Primer tab with its ten cards one at a time, four of them marked to read first, the mode choice in this lab's own words, and Start; and stores nothing", () => {
    const html = page()
    expect(cations).toMatchObject({ entry: 'lab:cations', to: '/lab/cations', kind: 'Lab', title: LAB_TEXT.title })
    expect(html).toMatch(new RegExp(`<h1[^>]*>${cations.title}</h1>`))
    expect(selectedTab(html)).toEqual(['Primer'])
    const [primer, lab, record] = panels(html)
    expect([primer!.shown, lab!.shown, record!.shown]).toEqual([true, false, false])
    expect(count(primer!.body, /<h2[^>]*>/g)).toBe(1)
    expect(primer!.body).toContain(`>${CATIONS_PRIMER[0]!.heading}</h2>`)
    for (const section of CATIONS_PRIMER) expect(primer!.body).toContain(`>${escaped(section.heading)}<`)
    expect(CATIONS_PRIMER).toHaveLength(10)
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
    const state = added(UNKNOWN, 2)
    save(state)
    const before = app.store.getItem(app.store.key(0)!)
    const gets = vi.spyOn(app.store, 'getItem')
    const sets = vi.spyOn(app.store, 'setItem')
    page()
    expect(sets).not.toHaveBeenCalled()
    expect(gets.mock.calls.length).toBeGreaterThan(0)
    expect(app.store.getItem(app.store.key(0)!)).toBe(before)
    expect(labProgress(app.store, cations, SCHEMA).load()).toEqual(state)
  })

  it('stores nothing that says which ions an unknown holds: a seed, a mode, a status and what was done', () => {
    const state = wholeRun(m, fresh('challenge'), UNKNOWN)
    save(state)
    const stored = app.store.getItem(app.store.key(0)!)!
    expect(Object.keys(JSON.parse(stored).data).sort()).toEqual(['mode', 'parts', 'seed', 'status'])
    // The one place an ion's name is stored is the naming itself, which the learner said.
    const named = deduced(m, state, UNKNOWN)
    expect(stored.replace(JSON.stringify({ t: 'name', ions: named }), '')).not.toMatch(/silver|lead|mercury/)
  })

  it('with a run stored opens on the Lab tab, on the part and the step the run was in the middle of, with Restart and no docked notebook; and the Record tab holds the record', () => {
    save(added(UNKNOWN, 2, 'challenge'))
    const html = page()
    expect(selectedTab(html)).toEqual(['Lab'])
    const [, lab, record] = panels(html)
    expect(lab!.body).toContain(`>${stepTitle(data, STEP_IDS[2])}</h2>`)
    expect(count(lab!.body, /<h2[^>]*>/g)).toBe(1)
    expect(/<nav aria-label="Parts".*?<\/nav>/s.exec(lab!.body)![0]).toMatch(new RegExp(`aria-current="true"[^>]*><span>${partTitle(UNKNOWN)}</span>`))
    expect(buttons(html).some((one) => one.name === SHELL_TEXT.restart)).toBe(true)
    expect(buttons(html).some((one) => one.name === SHELL_TEXT.start)).toBe(false)
    expect(html).not.toContain('aria-label="Lab notebook"')
    expect(html).toContain(`${SHELL_TEXT.mode}: <span class="${ROLE.value}">${SHELL_TEXT.modeName.challenge}</span>`)
    expect(record!.body).toContain(`<caption class="mb-2 text-left font-medium">${RECORD_TEXT.caption}</caption>`)
    // With part 1 done and nothing begun in part 2, part 2, on its first step.
    save(wholeRun(m, fresh(), KNOWN))
    const next = panels(page())[1]!.body
    expect(next).toContain(`>${stepTitle(data, STEP_IDS[0])}</h2>`)
    expect(next).toMatch(new RegExp(`aria-current="true"[^>]*><span>${partTitle(UNKNOWN)}</span>`))
  })

  it('sets aside a stored record that does not fit, says so, and starts fresh', () => {
    // A pouring off with nothing recorded: nothing the reducer could have left.
    const state = fresh()
    saveEntry(app.store, cations.entry, cations.version, { ...state, parts: { ...state.parts, known: [{ index: 0, events: [{ t: 'add' }, { t: 'pour' }] }] } })
    const html = page()
    expect(html).toContain(escaped(SHELL_TEXT.setAside))
    expect(selectedTab(html)).toEqual(['Primer'])
    expect(buttons(html).some((one) => one.name === SHELL_TEXT.start)).toBe(true)
  })

  it('in a narrow window shows the notice on the Lab tab in place of the parts, the record on its tab, and nothing that changes a run', () => {
    save(wholeRun(m, fresh(), KNOWN))
    app.wide = false
    const html = page()
    const [, lab, record] = panels(html)
    expect(text(lab!.body)).toContain(NARROW_NOTICE.title)
    expect(lab!.body).not.toContain('<h2')
    expect(record!.body).toContain(RECORD_TEXT.caption)
    for (const name of [SHELL_TEXT.start, SHELL_TEXT.restart, addLabel(data, STEP_IDS[0]), PAGE_TEXT.runAgain.known]) expect(buttons(html).some((one) => one.name === name)).toBe(false)
    expect(html).not.toContain('type="radio"')
  })
})

describe('the two parts', () => {
  // Part 1 done, part 2 with its second step under way.
  const state = added(UNKNOWN, 1, 'challenge', wholeRun(m, fresh('challenge'), KNOWN))
  const { html, drawn, shown } = bench(state, UNKNOWN)
  const nav = /<nav aria-label="Parts"[^>]*>(.*?)<\/nav>/s.exec(html)![1]!

  it('are chosen in a navigation named Parts: a button for each, a finger tall, with its title and how far it has come in words beside a mark, the one shown marked as current', () => {
    expect([...nav.matchAll(/<button([^>]*)>(.*?)<\/button>/gs)].map(([, tag, body]) => [tag!.includes('aria-current="true"'), read(body!)])).toEqual([
      [false, `|${partTitle(KNOWN)}|✓|${PROGRESS_TEXT.done}|`],
      [true, `|${partTitle(UNKNOWN)}|◔|${PROGRESS_TEXT.steps}|`],
    ])
    for (const { tag } of buttons(nav)) expect(tag).toContain('min-h-11')
    // The marks are for the eye: a screen reader is given the words.
    expect(count(nav, /<span aria-hidden="true"[^>]*>[○◔◑✓] <\/span>/g)).toBe(2)
    expect(nav).toContain(`<span aria-hidden="true" class="${ROLE.done}">✓ </span>`)
  })

  it('are shown one at a time, and the other is not drawn until it is asked for', () => {
    expect(drawn).toHaveLength(1)
    expect(shown).toHaveLength(1)
    expect(count(html, /<h2[^>]*>/g)).toBe(1)
    expect(html).toContain(`>${stepTitle(data, STEP_IDS[1])}</h2>`)
  })

  it('say what they are for, and when the lab is complete, until a run is begun, and not after: the room is then the step\'s', () => {
    const untouched = bench(fresh(), KNOWN).html
    expect(untouched).toContain(`<p>${PART_AIM.known}</p><p class="text-muted-foreground">${LAB_TEXT.complete}</p>`)
    // Over the two parts, until anything is done in either, what the lab is.
    expect(untouched).toContain(`<p class="max-w-prose text-sm">${LAB_TEXT.aim}</p><nav aria-label="Parts"`)
    expect(bench(added(UNKNOWN, 0), KNOWN).html).not.toContain(LAB_TEXT.aim)
    expect(bench(fresh(), UNKNOWN).html).toContain(`<p>${PART_AIM.unknown}</p>`)
    expect(html).not.toContain(PART_AIM.unknown)
    expect(bench(added(KNOWN, 0), KNOWN).html).not.toContain(PART_AIM.known)
    // A new run that is not begun says it again, but for when the lab is complete, once it is.
    const again = bench(reduce(m, allDone(), { type: 'runAgain', part: UNKNOWN }), UNKNOWN).html
    expect(again).toContain(`<p>${PART_AIM.unknown}</p>`)
    expect(again).not.toContain(LAB_TEXT.complete)
  })

  it('have at their head a status line that is empty, and takes no room, until the lab is complete, and then says so and that part 2 can still be run', () => {
    expect(html).toContain('<div class="grid gap-3"><p role="status" class="max-w-prose text-sm font-medium -mb-3"></p>')
    expect(read(/<p role="status" class="max-w-prose text-sm font-medium ">(.*?)<\/p>/.exec(bench(allDone()).html)![1]!)).toBe(`|✓|${LAB_TEXT.completed}`)
    expect(LAB_TEXT.completed).toContain('Part 2 can still be run again')
  })
})

describe('the list of steps', () => {
  // Step 1 done, step 2 under way.
  const state = added(KNOWN, 1, 'challenge')
  const { html, drawn, shown, foot } = bench(state, KNOWN)
  const nav = /<nav aria-label="Steps"[^>]*>(.*?)<\/nav>/s.exec(html)![1]!
  const items = (of: string) => [...of.matchAll(/<li>(.*?)<\/li>/gs)].map((match) => read(match[1]!))

  it('is a navigation named Steps that lists the five and the entry that closes the run, each with its number and how it stands in words beside a mark', () => {
    expect(items(nav)).toEqual([
      `|1.|${data.steps[0].name}|✓|${STEP_STATUS_TEXT.done}|`,
      `|2.|${data.steps[1].name}|◔|${STEP_STATUS_TEXT.current}|`,
      `|3.|${data.steps[2].name}|○|${STEP_STATUS_TEXT.waiting}|`,
      `|4.|${data.steps[3].name}|○|${STEP_STATUS_TEXT.waiting}|`,
      `|5.|${data.steps[4].name}|○|${STEP_STATUS_TEXT.waiting}|`,
      `|6.|${CHART_TEXT.title}|○|${RECORD_TEXT.open}|`,
    ])
    expect(count(nav, /<span aria-hidden="true"[^>]*>[○◔◑✓] <\/span>/g)).toBe(6)
  })

  it('ends in part 2 with the naming of the ions, which says when the ions are to be named and then how the run came out', () => {
    const last = (of: CationsState) => items(/<nav aria-label="Steps"[^>]*>(.*?)<\/nav>/s.exec(bench(of, UNKNOWN).html)![1]!).at(-1)
    expect(last(fresh())).toBe(`|6.|${NAMING_TEXT.title}|○|${RECORD_TEXT.open}|`)
    expect(last(reached(UNKNOWN, 5))).toBe(`|6.|${NAMING_TEXT.title}|◑|${PROGRESS_TEXT.naming}|`)
    expect(last(wholeRun(m, fresh(), UNKNOWN))).toBe(`|6.|${NAMING_TEXT.title}|✓|${RECORD_TEXT.counts}|`)
    expect(last(wholeRun(m, fresh('challenge'), UNKNOWN, { nameWrong: true }))).toBe(`|6.|${NAMING_TEXT.title}|◑|${RECORD_TEXT.doesNotCount}|`)
  })

  it("folds behind a button named Steps, as the primer's topics do, and is beside the step from the same width", () => {
    const [folded, controls] = /<button[^>]*aria-expanded="false"[^>]*aria-controls="([^"]+)"[^>]*>(?:.*?)<\/button>/s.exec(nav)!
    expect(text(folded!)).toBe(PAGE_TEXT.steps)
    expect(folded).toContain('primer-topics-button')
    expect(nav).toContain(`<ol id="${controls}" class="primer-topics `)
    expect(html).toContain('<div class="primer-layout">')
    expect(labCss).toContain('@container primer (min-width: 46rem)')
  })

  it('shows one entry at a time, the step the run has reached, and draws no other until it is asked for', () => {
    expect(drawn).toHaveLength(1)
    expect(shown).toHaveLength(1)
    expect(html).toContain(`>${stepTitle(data, STEP_IDS[1])}</h2>`)
    expect(bench(reached(KNOWN, 5), KNOWN).html).toContain(`>${CHART_TEXT.title}</h2>`)
  })

  it('says on a step which run it is of, which step it is and how it stands, as the description of a heading that can take focus', () => {
    const [, placeId, place] = /<p id="([^"]+)" class="text-xs text-muted-foreground">(.*?)<\/p>/.exec(shown[0]!)!
    expect(read(place!)).toBe(`${PAGE_TEXT.run(1)} · ${PAGE_TEXT.place(2, 5)} ·|◔|${STEP_STATUS_TEXT.current}|`)
    expect(shown[0]).toMatch(new RegExp(`<h2 id="[^"]+" tabindex="-1" aria-describedby="${placeId}"[^>]*>${stepTitle(data, STEP_IDS[1])}</h2>`))
  })

  it('offers Previous and Next, each named by where it goes; at the first there is no Previous and at the last no Next', () => {
    const ways = (of: string) => buttons(of).map((one) => one.name).filter((name) => /^(←|Next)/.test(name))
    expect(ways(foot)).toEqual([`← ${PAGE_TEXT.previous(stepTitle(data, STEP_IDS[0]))}`, `${PAGE_TEXT.next(stepTitle(data, STEP_IDS[2]))} →`])
    expect(ways(bench(state, KNOWN, 0).foot)).toEqual([`${PAGE_TEXT.next(stepTitle(data, STEP_IDS[1]))} →`])
    expect(ways(bench(state, KNOWN, 4).foot)).toEqual([`← ${PAGE_TEXT.previous(stepTitle(data, STEP_IDS[3]))}`, `${PAGE_TEXT.next(CHART_TEXT.title)} →`])
    expect(ways(bench(state, KNOWN, CLOSING).foot)).toEqual([`← ${PAGE_TEXT.previous(stepTitle(data, STEP_IDS[4]))}`])
    expect(ways(bench(state, UNKNOWN, 4).foot).at(-1)).toBe(`${PAGE_TEXT.next(NAMING_TEXT.title)} →`)
  })

  it('has under the ways on, on every entry, the bench; over it the sources of the step shown; and in part 2 the map, or what stands for it', () => {
    expect([...foot.matchAll(/<summary[^>]*>(.*?)<\/summary>/g)].map((match) => match[1]).filter((name) => name !== 'Hazards' && name !== 'Sources').length).toBe(1)
    expect(foot).toContain(`>${PAGE_TEXT.bench}</summary>`)
    expect(foot.indexOf('>Sources</summary>')).toBeLessThan(foot.indexOf(`>${PAGE_TEXT.bench}</summary>`))
    expect(text(foot)).toContain(escaped(SOURCES_TEXT))
    const closing = bench(state, KNOWN, CLOSING).foot
    expect(closing).toContain(`>${PAGE_TEXT.bench}</summary>`)
    expect(text(closing)).not.toContain(escaped(SOURCES_TEXT))
    expect(foot).not.toContain(CHART_TEXT.noMap)
    expect(text(bench(state, UNKNOWN).foot)).toContain(CHART_TEXT.noMap)
  })
})

describe('a step before its reagent is in', () => {
  const state = fresh()
  const { entry } = bench(state, KNOWN)

  it('has one card, the tube: what is seen and the chart wait for the reagent', () => {
    expect(cards(entry)).toEqual([PAGE_TEXT.tube])
    expect(cards(bench(added(KNOWN, 0), KNOWN).entry)).toEqual([PAGE_TEXT.tube, PAGE_TEXT.seen, CHART_TEXT.title])
    expect(cards(bench(added(UNKNOWN, 0), UNKNOWN).entry)).toEqual([PAGE_TEXT.tube, PAGE_TEXT.seen])
  })

  it("says under its title what is done at it, in both modes, and has Guided's hint in a disclosure that is closed; Challenge has none", () => {
    for (const [at, id] of STEP_IDS.entries()) {
      const guided = head(bench(reached(UNKNOWN, at), UNKNOWN).entry)
      expect(guided).toContain(`<p class="max-w-prose text-sm">${STEP_TASK[id]}</p>`)
      expect(guided).toContain(`<details><summary class="w-fit cursor-pointer rounded-sm text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">${PAGE_TEXT.hint}</summary>`)
      expect(text(guided)).toContain(HINT[id])
      const challenge = head(bench(reached(UNKNOWN, at, 'challenge'), UNKNOWN).entry)
      expect(challenge).toContain(`<p class="max-w-prose text-sm">${STEP_TASK[id]}</p>`)
      expect(challenge).not.toContain('<details')
      expect(text(challenge)).not.toContain(HINT[id])
    }
  })

  it('draws the tube the step is worked in as a picture named for which of the three it is, described by the line that says how it is looked at', () => {
    const TUBES: TubeId[] = ['a', 'a', 'b', 'a', 'c']
    for (const [at] of STEP_IDS.entries()) {
      const tube = card(bench(reached(UNKNOWN, at), UNKNOWN).entry, PAGE_TEXT.tube)
      const [, describedBy] = new RegExp(`${TUBE} role="img" aria-label="${PAGE_TEXT.tubePicture(TUBE_NAME[TUBES[at]!])}" aria-describedby="([^"]+)"`).exec(tube)!
      expect(tube).toContain(`<p id="${describedBy}" class="max-w-prose">${PAGE_TEXT.explore}</p>`)
    }
    expect(PAGE_TEXT.tubePicture(TUBE_NAME.a)).toBe('First tube, drawn in a rack')
  })

  it('lays a real button over each of its two parts, the liquid over the bottom, each named for the look it is, inside the glass and tall enough for a finger', () => {
    for (const of of [state, added(KNOWN, 0), reached(KNOWN, 1), reached(KNOWN, 4)]) {
      const [liquid, bottom, ...more] = parts(card(bench(of, KNOWN).entry, PAGE_TEXT.tube))
      expect(more).toEqual([])
      expect([liquid!.look, bottom!.look]).toEqual(LOOKS)
      expect([liquid!.name, bottom!.name]).toEqual(LOOKS.map((look) => lookLabel(look, false)))
      expect(bottom!.top).toBeCloseTo(liquid!.top + liquid!.height, 5)
      for (const part of [liquid!, bottom!]) {
        expect((part.height / 100) * TUBE_HEIGHT).toBeGreaterThanOrEqual(58)
        expect((part.left / 100) * 320).toBeGreaterThanOrEqual(48)
        expect(((part.left + part.width) / 100) * 320).toBeLessThanOrEqual(128)
        expect((part.width / 100) * 320).toBeGreaterThanOrEqual(44)
        // Nothing of what is seen is in the page until the part is looked at.
        expect(part.body).toBe('')
      }
    }
  })

  it('says beside the picture, of each part, whether it has been looked at: a mark and the words, the same in the name of its button, and a dashed edge until it has', () => {
    const list = (of: CationsState) => [...card(bench(of, KNOWN).entry, PAGE_TEXT.tube).matchAll(/<li><span aria-hidden="true"( class="[^"]+")?>(.) <\/span>(.*?)<\/li>/g)].map(([, role, mark, words]) => [mark, words, role ?? ''])
    const one = run(m, added(KNOWN, 0), [{ type: 'look', part: KNOWN, at: 'bottom' }])
    expect(list(added(KNOWN, 0))).toEqual(LOOKS.map((look) => ['○', `${LOOK_PART[look]}: ${PAGE_TEXT.notLookedAt}`, '']))
    expect(list(one)).toEqual([
      ['○', `${LOOK_PART.liquid}: ${PAGE_TEXT.notLookedAt}`, ''],
      ['✓', `${LOOK_PART.bottom}: ${PAGE_TEXT.lookedAt}`, ` class="${ROLE.done}"`],
    ])
    const drawn = parts(card(bench(one, KNOWN).entry, PAGE_TEXT.tube))
    expect(drawn.map(({ name }) => name)).toEqual([lookLabel('liquid', false), lookLabel('bottom', true)])
    expect(drawn.map(({ tag }) => tag.includes('border-dashed'))).toEqual([true, false])
    // The centrifuge moves the solid, so both are looked at again.
    expect(list(packed(looked(added(KNOWN, 0), KNOWN), KNOWN)).map(([mark]) => mark)).toEqual(['○', '○'])
  })

  it('draws the rack beside the tube: the three tubes small, each over its name, the name of the step\'s own in bold', () => {
    const names = (of: CationsState, part: PartId) => [...picture(bench(of, part).entry).matchAll(/<text text-anchor="middle" font-size="10.5" font-weight="(\d+)"[^>]*>(.*?)<\/text>/g)].map(([, weight, words]) => [text(words!.replaceAll('</tspan>', ' ')).trim(), weight])
    expect(names(state, KNOWN)).toEqual([[TUBE_NAME.a, '700'], [TUBE_NAME.b, '400'], [TUBE_NAME.c, '400']])
    expect(names(reached(UNKNOWN, 2), UNKNOWN)).toEqual([[TUBE_NAME.a, '400'], [TUBE_NAME.b, '700'], [TUBE_NAME.c, '400']])
    expect(names(reached(UNKNOWN, 4), UNKNOWN)).toEqual([[TUBE_NAME.a, '400'], [TUBE_NAME.b, '400'], [TUBE_NAME.c, '700']])
    // Each small tube holds what its tube holds now: at step 3 the first has its solid and no liquid, the second the liquid poured into it, the third nothing.
    const rack = picture(bench(reached(KNOWN, 2), KNOWN).entry).split('<g><defs><pattern')[1]!
    const [first, second, third] = rack.split(/(?=<g><defs><clipPath)/).slice(1)
    expect([first!.includes(`fill="${solidHex('white')}"`), first!.includes(`fill="${liquidHex('colourless')}"`)]).toEqual([true, false])
    expect([second!.includes('stroke-width="0.8"'), second!.includes(`fill="${liquidHex('colourless')}"`)]).toEqual([false, true])
    expect(count(third!, /<rect/g)).toBe(0)
  })

  it('has the tube in words, the three by name with the step\'s own marked, in a disclosure that is closed', () => {
    const at = reached(KNOWN, 2)
    const tube = card(bench(at, KNOWN).entry, PAGE_TEXT.tube)
    const [, words] = new RegExp(`<details><summary[^>]*>${PAGE_TEXT.inWords}</summary>(.*?)</details>`, 's').exec(tube)!
    const { rack } = view(at, KNOWN)
    expect([...words!.matchAll(/<li( aria-current="true")?><span class="([^"]+)">(.*?)<\/span> (.*?)<\/li>/g)].map(([, current, weight, name, said]) => [name, said, current !== undefined, weight])).toEqual([
      [`${TUBE_NAME.a}:`, tubeText(rack.a), false, 'font-medium'],
      [`${TUBE_NAME.b}:`, tubeText(rack.b), true, 'font-semibold'],
      [`${TUBE_NAME.c}:`, tubeText(rack.c), false, 'font-medium'],
    ])
    expect(tubeText(rack.c)).toBe('The tube is empty.')
    // Outside the disclosure the card says nothing of what the tube shows: not what a look at either part would say, and no word of it.
    const outside = text(tube.replace(/<details>.*?<\/details>/s, ''))
    for (const look of LOOKS) expect(outside).not.toContain(lookText(rack.b, look))
    expect(outside).not.toMatch(/white|colourless|cloudy|clear/)
  })

  it('offers the buttons the engine has a use for at each step, a finger tall each: the reagent and the centrifuge at every step, the bath at step 2, litmus at step 5', () => {
    const offered = (at: number) => buttons(card(bench(reached(UNKNOWN, at), UNKNOWN).entry, PAGE_TEXT.tube)).filter(({ tag }) => !tag.includes('data-part'))
    for (const [at, id] of STEP_IDS.entries()) {
      const expected = [addLabel(data, id), ...(at === 1 ? [ACTION_LABEL.heat] : []), ...(at === 4 ? [ACTION_LABEL.testLitmus] : []), ACTION_LABEL.centrifuge]
      expect(offered(at).map((one) => one.name)).toEqual(expected)
      for (const { tag, name } of offered(at)) {
        expect(tag, name).toContain('min-h-11')
        // All but the reagent wait for it: unavailable, faint, and still in the tab order, to say why when pressed.
        expect(tag.includes('aria-disabled="true"'), name).toBe(name !== addLabel(data, id))
        expect(FAINT.test(tag), name).toBe(name !== addLabel(data, id))
        expect(tag, name).not.toMatch(/ disabled=""/)
      }
    }
  })

  it('ends each step with what ends it: the pouring off at steps 1, 2 and 4, named for where the liquid goes, and in Challenge the check; both wait, focusable, until there is something to check', () => {
    const ending = (at: number, mode: Mode) => buttons(tail(bench(reached(UNKNOWN, at, mode), UNKNOWN).entry))
    for (const [at, id] of STEP_IDS.entries()) {
      const pour = POUR_LABEL[id]
      expect(ending(at, 'guided').map((one) => one.name)).toEqual(pour === undefined ? [] : [pour])
      expect(ending(at, 'challenge').map((one) => one.name)).toEqual([ACTION_LABEL.checkStep, ...(pour === undefined ? [] : [pour])])
      for (const { tag, name } of ending(at, 'challenge')) {
        expect(tag, name).toContain('min-h-11')
        expect(tag, name).toContain('aria-disabled="true"')
      }
    }
    expect(Object.keys(POUR_LABEL)).toEqual([STEP_IDS[0], STEP_IDS[1], STEP_IDS[3]])
  })

  it('says what has been done to the tube in a status line, and marks with a tick, not faint, what has gone in', () => {
    const tube = (of: CationsState) => card(bench(of, UNKNOWN).entry, PAGE_TEXT.tube)
    const status = (of: CationsState) => /<p role="status" class="max-w-prose font-medium">(.*?)<\/p>/.exec(tube(of))![1]
    const before = reached(UNKNOWN, 1)
    expect(status(before)).toBe(doneText(data, stepOf(before, UNKNOWN)))
    const heated = run(m, before, [{ type: 'add', part: UNKNOWN }, { type: 'heat', part: UNKNOWN }])
    expect(status(heated)).toBe(doneText(data, stepOf(heated, UNKNOWN)))
    expect(status(heated)).toContain('The tube has stood in the boiling water.')
    for (const name of [addLabel(data, STEP_IDS[1]), ACTION_LABEL.heat]) {
      const { tag } = button(tube(heated), `✓ ${name}`)!
      expect(tag).toContain('aria-disabled="true"')
      expect(tag).not.toMatch(FAINT)
    }
    expect(tube(heated)).toContain(`<span aria-hidden="true" class="${ROLE.done}">✓ </span>${addLabel(data, STEP_IDS[1])}`)
    // Litmus shows in the same line; nitric acid goes in again, so its button stays to be used, with no tick, until the tube is full.
    const tested = run(m, reached(UNKNOWN, 4), [{ type: 'add', part: UNKNOWN }, { type: 'testLitmus', part: UNKNOWN }])
    expect(status(tested)).toContain('the liquid is not acid yet.')
    expect(button(tube(tested), addLabel(data, STEP_IDS[4]))!.tag).not.toContain('aria-disabled')
    const full = run(m, reached(UNKNOWN, 4), Array.from({ length: m.nitricAcidAdditions }, (): Action => ({ type: 'add', part: UNKNOWN })))
    expect(button(tube(full), `✓ ${addLabel(data, STEP_IDS[4])}`)!.tag).toContain('aria-disabled="true"')
  })

  it("lays the tube's card out by the card's own width, never the window's: the buttons beside the picture, and the words beside it too where the card is wide enough", () => {
    const tube = card(entry, PAGE_TEXT.tube)
    expect(tube).toMatch(/<div class="cations-tube w-full"><div class="cations-tube-grid"><div class="cations-tube-picture">.*<div class="cations-tube-actions [^"]*">.*<div class="cations-tube-words [^"]*">/s)
    expect(cationsCss).toContain('container: cations-tube / inline-size')
    expect(cationsCss).toContain('@container cations-tube (min-width: 38rem)')
    expect(cationsCss).not.toContain('@media')
  })

  it('has two message lines in the tube\'s card: one for what a look shows, for a screen reader alone, and one for why a press did nothing, which takes no room while it is empty', () => {
    expect(entry).toContain('<div class="sr-only"><p role="status"></p></div>')
    expect(card(entry, PAGE_TEXT.tube)).toContain('<div class="-mt-3"><p role="status"></p></div>')
  })

  it('shows of a step not reached yet its task and where its notes will be, and nothing to press', () => {
    const waiting = bench(state, KNOWN, 3).entry
    expect(cards(waiting)).toEqual([])
    expect(waiting).toContain(`<p class="max-w-prose text-sm">${STEP_TASK[STEP_IDS[3]]}</p>`)
    expect(text(waiting)).toContain(PAGE_TEXT.notesLater)
    expect(read(waiting)).toContain(`|○|${STEP_STATUS_TEXT.waiting}|`)
    expect(buttons(waiting)).toEqual([])
  })
})

describe('the tube as it is drawn', () => {
  const svg = (state: CationsState, part: PartId = UNKNOWN, entry?: number) => large(picture(bench(state, part, entry).entry))
  const words = (of: string) => [...of.matchAll(/<text x="153"[^>]*>(.*?)<\/text>/g)].map((match) => match[1])
  // Step 3 of the known, which holds lead: first as the solid forms, then packed. And of the first unknown of this seed that holds none.
  const cloudy = added(KNOWN, 2)
  const withLead = packed(cloudy, KNOWN)
  const noLead = (() => {
    let state = fresh('challenge')
    for (let unknown = 0; unknown < 7; unknown++) {
      const third = packed(added(UNKNOWN, 2, undefined, state), UNKNOWN)
      if (stepOf(third, UNKNOWN).shows!.solid === null) return third
      state = reduce(m, wholeRun(m, state, UNKNOWN), { type: 'runAgain', part: UNKNOWN })
    }
    throw new Error('no unknown of this seed is without lead')
  })()

  it('stands on a white card with everything in fixed colours, so that it is judged against white in the dark theme too', () => {
    expect(svg(withLead, KNOWN)).toContain('fill="#ffffff" stroke="#3f3f46" stroke-opacity="0.35"')
    expect(picture(bench(withLead, KNOWN).entry)).not.toContain('currentColor')
    expect(card(bench(withLead, KNOWN).entry, PAGE_TEXT.tube)).toContain('<div class="relative w-80 max-w-full shrink-0">')
  })

  it('tells the yellow to orange liquid of step 3 from a yellow solid by more than colour: the solid alone has an edge, a grain over it, and a bracket with the word solid', () => {
    const [lead, none] = [svg(withLead, KNOWN), svg(noLead)]
    expect(stepOf(withLead, KNOWN).shows).toMatchObject({ liquid: { colour: 'yellow to orange', cloudy: false }, solid: { colour: 'yellow', settled: true } })
    expect(stepOf(noLead, UNKNOWN).shows).toMatchObject({ liquid: { colour: 'yellow to orange', cloudy: false }, solid: null })
    // Both hold the same liquid, drawn the same and marked liquid.
    for (const one of [lead, none]) {
      expect(one).toContain(`fill="${liquidHex('yellow to orange')}"`)
      expect(words(one)).toContain(PAGE_TEXT.liquidLayer)
    }
    // With lead: the liquid, then the solid with its edge, then the grain over it; and both brackets.
    expect(count(lead, /<rect x="48"/g)).toBe(3)
    expect(lead).toMatch(new RegExp(`<rect x="48" y="\\d+" width="80" height="\\d+" fill="${solidHex('yellow')}" stroke="#3f3f46" stroke-width="1.2"></rect><rect x="48" y="\\d+" width="80" height="\\d+" fill="url\\(#[^)]+grain\\)"></rect>`))
    expect(words(lead)).toEqual([PAGE_TEXT.liquidLayer, PAGE_TEXT.solidLayer])
    // With none: the liquid alone, no edge, no grain, one bracket, and no word solid.
    expect(count(none, /<rect x="48"/g)).toBe(1)
    expect(none).not.toMatch(/stroke-width="1.2"|grain\)/)
    expect(words(none)).toEqual([PAGE_TEXT.liquidLayer])
  })

  it('draws a solid that has not settled as specks with an edge all through the liquid, under one bracket that says so, and no layer at the bottom', () => {
    const drawn = svg(cloudy, KNOWN)
    expect(stepOf(cloudy, KNOWN).shows).toMatchObject({ liquid: { cloudy: true }, solid: { settled: false } })
    expect(drawn).toMatch(new RegExp(`<pattern id="[^"]+spread"[^>]*><circle[^>]*fill="${solidHex('yellow')}" stroke="#3f3f46"`))
    expect(drawn).toMatch(/fill="url\(#[^)]+spread\)"/)
    expect(drawn).not.toMatch(/stroke-width="1.2"|grain\)/)
    expect(words(drawn)).toEqual([PAGE_TEXT.spreadLayer])
    expect(PAGE_TEXT.spreadLayer).toBe('solid in the liquid')
  })

  it('draws a solid with no liquid over it under its one bracket, and a tube with nothing in it with none', () => {
    const poured = reached(UNKNOWN, 1)
    expect(stepOf(poured, UNKNOWN).shows).toMatchObject({ liquid: null, solid: { colour: 'white' } })
    expect(words(svg(poured))).toEqual([PAGE_TEXT.solidLayer])
    expect(svg(poured)).not.toContain('<line')
    // The third tube before anything is poured into it: on the page only as a small tube of the rack, which is empty.
    expect(view(poured, UNKNOWN).rack.c).toEqual({ liquid: null, solid: null })
  })

  it('draws the liquid higher for each thing that goes in', () => {
    const surface = (state: CationsState) => Number(/<line x1="48" x2="128" y1="(\d+)"/.exec(svg(state))![1])
    expect(surface(added(UNKNOWN, 0))).toBeLessThan(surface(fresh()))
    const third = reached(UNKNOWN, 4)
    const once = run(m, third, [{ type: 'add', part: UNKNOWN }])
    const twice = run(m, once, [{ type: 'add', part: UNKNOWN }])
    expect([surface(third), surface(once), surface(twice)]).toEqual([surface(third), surface(once), surface(twice)].sort((a, b) => b - a))
    expect(surface(twice)).toBeLessThan(surface(third))
  })

  it('moves nothing: the page has no animation, so there is nothing for the reduced-motion setting to stop', () => {
    expect(cationsCss).not.toMatch(/animation|transition|@keyframes/)
    const { html } = bench(withLead, KNOWN)
    expect(html).not.toMatch(/animate-|aq-bubble|cal-stir/)
    expect(html).not.toContain('<circle cx="66"')
  })

  it('shows of a step that is done the tube as it was when the step was checked, says so, has no rack beside it, and can still be looked at', () => {
    const state = reached(KNOWN, 2)
    const done = bench(state, KNOWN, 0).entry
    const tube = card(done, PAGE_TEXT.tube)
    expect(text(tube)).toContain(PAGE_TEXT.asChecked)
    expect(picture(done)).not.toContain('<g><defs><pattern')
    // As it was at the check: the solid packed under the liquid, though the liquid has been poured away since.
    expect(view(state, KNOWN).steps[0]!.shows).toMatchObject({ liquid: { colour: 'colourless' }, solid: { colour: 'white', settled: true } })
    expect(view(state, KNOWN).rack.a.liquid).toBeNull()
    expect(words(large(picture(done)))).toEqual([PAGE_TEXT.liquidLayer, PAGE_TEXT.solidLayer])
    expect(parts(tube).map(({ look }) => look)).toEqual(LOOKS)
    expect(buttons(tube).filter(({ tag }) => !tag.includes('data-part'))).toEqual([])
    expect(text(/<details><summary[^>]*>The tube in words<\/summary>(.*?)<\/details>/s.exec(tube)![1]!)).toBe(`${TUBE_NAME.a}: ${tubeText(view(state, KNOWN).steps[0]!.shows)}`)
  })
})

describe('what is seen', () => {
  const seenCard = (state: CationsState, part: PartId = UNKNOWN, entry?: number) => card(bench(state, part, entry).entry, PAGE_TEXT.seen)
  const fieldsets = (html: string) => [...html.matchAll(/<fieldset([^>]*)>(.*?)<\/fieldset>/gs)].map(([, tag, body]) => ({ disabled: tag!.includes('disabled=""'), legend: /<legend[^>]*>(.*?)<\/legend>/.exec(body!)![1], choices: [...body!.matchAll(/<label[^>]*><input type="radio"([^>]*)\/>(.*?)<\/label>/g)].map((match) => [match[2], match[1]!.includes('checked=""')]), waits: /<p class="lab-held">(.*?)<\/p>/.exec(body!)?.[1] }))

  it('comes with the reagent as two questions, each choice a finger tall, closed until both parts of the tube have been looked at: what opens them is said once, under the first', () => {
    const closed = seenCard(added(UNKNOWN, 0))
    expect(fieldsets(closed)).toEqual([
      { disabled: true, legend: FIELD_LABEL.solid, choices: [['no solid', false], ['white', false], ['yellow', false], ['grey to black', false]], waits: LOOK_FIRST },
      { disabled: true, legend: FIELD_LABEL.liquid, choices: [['colourless', false], ['yellow to orange', false]], waits: undefined },
    ])
    expect(count(closed, /<label class="flex min-h-11 /g)).toBe(6)
    const { tag } = button(closed, ACTION_LABEL.observe)!
    expect(tag).toContain('type="submit"')
    expect(tag).toContain('aria-disabled="true"')
    expect(tag).toContain('min-h-11')
    // One look is not enough.
    expect(fieldsets(seenCard(run(m, added(UNKNOWN, 0), [{ type: 'look', part: UNKNOWN, at: 'liquid' }]))).map((one) => one.disabled)).toEqual([true, true])
  })

  it('opens with both looks, with no choice made for the learner and nothing said', () => {
    const open = seenCard(looked(added(UNKNOWN, 0), UNKNOWN))
    expect(fieldsets(open).map((one) => [one.disabled, one.waits, one.choices.some(([, chosen]) => chosen)])).toEqual([[false, undefined, false], [false, undefined, false]])
    expect(open).toContain(`<legend class="mb-1.5 font-medium ${ROLE.entry}">${FIELD_LABEL.solid}</legend>`)
    expect(open).toContain('<p role="status"></p>')
    expect(text(open)).not.toMatch(/Checked|Not yet|Not checked/)
  })

  it('in Guided shows what was recorded in its boxes, disabled, beside Change, and says beside a tick that it is what the tube showed', () => {
    const state = recorded(KNOWN, 0)
    const made = seenCard(state, KNOWN)
    expect(stepOf(state, KNOWN)).toMatchObject({ observation: { solid: 'white', liquid: 'colourless' }, checked: false })
    expect(fieldsets(made).map((one) => [one.disabled, one.choices.filter(([, chosen]) => chosen).map(([choice]) => choice)])).toEqual([[true, ['white']], [true, ['colourless']]])
    expect(button(made, PAGE_TEXT.change)).toBeDefined()
    expect(made).toContain(`<p role="status"><span aria-hidden="true" class="${ROLE.done}">✓ </span>${checkedText([])}</p>`)
  })

  it('in Challenge shows what was recorded and says nothing of it until the step is checked, whether it is what the tube showed or not', () => {
    const at = looked(packed(added(UNKNOWN, 0, 'challenge'), UNKNOWN), UNKNOWN)
    const right = run(m, at, [{ type: 'observe', part: UNKNOWN, observation: { solid: 'white', liquid: 'colourless' } }])
    const wrong = run(m, at, [{ type: 'observe', part: UNKNOWN, observation: { solid: 'yellow', liquid: 'colourless' } }])
    expect(text(seenCard(right))).toContain(PAGE_TEXT.notChecked)
    expect(seenCard(right)).toContain('<p role="status"></p>')
    expect(text(seenCard(right))).not.toMatch(/Checked|Not yet/)
    // The two cards differ in the box that is checked and in nothing else.
    const unmarked = (html: string) => html.replaceAll(' checked=""', '')
    expect(seenCard(wrong)).not.toBe(seenCard(right))
    expect(unmarked(seenCard(wrong))).toBe(unmarked(seenCard(right)))
  })

  it('in Guided holds an observation that was recorded in Challenge to the tube, and says which part to look at again and not what it should be', () => {
    const at = looked(packed(added(UNKNOWN, 0, 'challenge'), UNKNOWN), UNKNOWN)
    const wrong = reduce(m, run(m, at, [{ type: 'observe', part: UNKNOWN, observation: { solid: 'yellow', liquid: 'colourless' } }]), { type: 'setMode', mode: 'guided' })
    const shown = seenCard(wrong)
    expect(shown).toContain(`<p role="status"><span aria-hidden="true" class="${ROLE.failed}">✕ </span>Not yet. Look again at the solid.</p>`)
    expect(fieldsets(shown).map((one) => one.disabled)).toEqual([false, false])
    expect(button(shown, ACTION_LABEL.observe)).toBeDefined()
  })

  it('once the step is checked is read and not changed: each answer as a line, a cross on one that is not what the tube showed, and what the check found beside a mark', () => {
    const at = looked(packed(added(UNKNOWN, 0, 'challenge'), UNKNOWN), UNKNOWN)
    const wrong = run(m, at, [{ type: 'observe', part: UNKNOWN, observation: { solid: 'yellow', liquid: 'colourless' } }, { type: 'checkStep', part: UNKNOWN }])
    const shown = seenCard(wrong)
    expect(shown).not.toContain('<form')
    expect([...shown.matchAll(/<li>(.*?)<\/li>/g)].map((match) => read(match[1]!))).toEqual([`|✕|${observationLines({ solid: 'yellow', liquid: 'colourless' })[0]}`, observationLines({ solid: 'yellow', liquid: 'colourless' })[1]])
    expect(shown).toContain(`<p role="status" class="max-w-prose font-medium"><span aria-hidden="true" class="${ROLE.failed}">✕ </span>${checkedText(['solid'])}</p>`)
    // The check names the part and never the colour it should have been.
    expect(text(shown)).not.toContain('white')
    // While the pouring off is still to come, the card says why nothing more is taken and what is left.
    expect(shown).toContain(`<p class="max-w-prose ${ROLE.held}">${blockedText(data, UNKNOWN, 'step-checked', STEP_IDS[0])}</p>`)
    const right = seenCard(reached(UNKNOWN, 1), UNKNOWN, 0)
    expect(right).toContain(`<span aria-hidden="true" class="${ROLE.done}">✓ </span>${checkedText([])}`)
    expect(right).not.toContain(ROLE.held)
  })
})

describe('the flow chart', () => {
  const chartOf = (state: CationsState, entry?: number) => card(bench(state, KNOWN, entry).entry, CHART_TEXT.title)
  const tiles = (chart: string) => /<div role="group" aria-label="Tiles to choose from"[^>]*>(.*?)<\/div><\/div>/s.exec(chart)?.[1]

  it('is one line that says what opens it until what is seen at the step is recorded', () => {
    const closed = chartOf(looked(added(KNOWN, 0), KNOWN))
    expect(text(closed)).toBe(`${CHART_TEXT.title}${CHART_TEXT.closed}`)
    expect(closed).toContain(`<p class="max-w-prose ${ROLE.held}">${CHART_TEXT.closed}</p>`)
    expect(buttons(closed)).toEqual([])
  })

  it('then is the whole scheme as a tree of seven places, each a list named for its step and its layer, with the places of this step to fill and the others to read', () => {
    const state = recorded(KNOWN, 1)
    const chart = chartOf(state)
    expect(text(chart)).toContain(CHART_TEXT.help)
    expect(places(chart).map((place) => [place.name, place.open, place.holds])).toEqual([
      ['Step 1: in the solid', false, ['Silver chloride, AgCl, a solid', 'Lead chloride, PbCl₂, a solid', 'Mercury(I) chloride, Hg₂Cl₂, a solid']],
      ['Step 2: in the liquid', true, [CHART_TEXT.empty]],
      ['Step 3: in the solid', false, [CHART_TEXT.empty]],
      ['Step 2: in the solid', true, [CHART_TEXT.empty]],
      ['Step 4: in the solid', false, [CHART_TEXT.empty]],
      ['Step 4: in the liquid', false, [CHART_TEXT.empty]],
      ['Step 5: in the solid', false, [CHART_TEXT.empty]],
    ])
    expect(places(chart).map((place) => place.name).sort()).toEqual(view(state, KNOWN).chart!.places.map(placeLabel).sort())
    // Nested as the scheme goes: a list under a place for what the next step makes of it.
    expect(count(chart, /<ul class="ml-2 grid gap-1 border-l-2 pl-3">/g)).toBe(4)
    // Each place to fill is a button, pressed or not, which is how the one chosen is told; with two to fill none is chosen.
    expect(buttons(chart).filter(({ tag }) => tag.includes('aria-pressed')).filter(({ name }) => name.startsWith('Step')).map(({ name, tag }) => [name, /aria-pressed="(\w+)"/.exec(tag)![1]])).toEqual([['Step 2: in the liquid', 'false'], ['Step 2: in the solid', 'false']])
    expect(count(chart, /border-dashed border-muted-foreground/g)).toBe(2)
    // One place alone is the chosen one from the start, with a whole edge.
    const one = chartOf(recorded(KNOWN, 0))
    expect(one).toMatch(/<div data-place="precipitate-solid" class="[^"]*border-2[^"]* border-foreground"><button[^>]*aria-pressed="true"/)
  })

  it('is filled from nine tiles, each a button a finger tall named for what it is, with how a tile is put in a place said over them; a tile is not used up', () => {
    const state = run(m, recorded(KNOWN, 1), [{ type: 'place', part: KNOWN, place: 'extract-lead-liquid', tile: 'lead-ion' }])
    const chart = chartOf(state)
    expect(text(chart)).toContain(`${CHART_TEXT.tiles}. ${CHART_TEXT.how}`)
    const bank = [...tiles(chart)!.matchAll(/<button([^>]*)>(.*?)<\/button>/gs)].map(([, tag, body]) => ({ tag: tag!, label: /aria-label="([^"]+)"/.exec(tag!)![1], words: read(body!) }))
    expect(bank.map((tile) => tile.label)).toEqual(m.tiles.map((tile) => tileLabel(data, tile)))
    expect(bank).toHaveLength(9)
    expect(bank[0]!.words).toBe('|Silver chloride|AgCl, a solid|')
    for (const { tag } of bank) {
      expect(tag).toContain('min-h-11')
      expect(tag).toContain('aria-pressed="false"')
      expect(tag).not.toContain('aria-disabled')
    }
    // The tile that has gone in is in its place, with a button that takes it out, and is still among the tiles.
    const [, liquid] = places(chart)
    expect(liquid).toEqual({ name: 'Step 2: in the liquid', open: true, holds: ['Lead ion|Pb²⁺, dissolved'] })
    expect(chart).toMatch(new RegExp(`<button[^>]*aria-label="${CHART_TEXT.remove('Lead ion')}"[^>]*class="[^"]*lab-tap`))
  })

  it("in Guided says how many tiles belong in a place that is being filled, and in Challenge does not", () => {
    expect(text(chartOf(recorded(KNOWN, 1)))).toContain(`${CHART_TEXT.slots(1)}`)
    expect(text(chartOf(recorded(KNOWN, 1)))).toContain(`${CHART_TEXT.slots(2)}`)
    expect(text(chartOf(recorded(KNOWN, 1, 'challenge')))).not.toMatch(/tiles? belongs? here/)
  })

  it('once the step is checked is read: no tile to choose, no way to take one out, and of each place checked, in words beside a mark, whether it holds what belongs in it', () => {
    const wrong = run(m, recorded(KNOWN, 0, 'challenge'), [{ type: 'place', part: KNOWN, place: 'precipitate-solid', tile: 'lead-ion' }, { type: 'checkStep', part: KNOWN }])
    const chart = chartOf(wrong)
    expect(tiles(chart)).toBeUndefined()
    expect(buttons(chart)).toEqual([])
    expect(text(chart)).not.toContain(CHART_TEXT.help)
    expect(chart).toContain(`<span class="text-xs font-medium whitespace-nowrap"><span aria-hidden="true" class="${ROLE.failed}">✕ </span>${CHART_TEXT.notRight}</span>`)
    expect(count(chart, new RegExp(`>${CHART_TEXT.right}<|>${CHART_TEXT.notRight}<`, 'g'))).toBe(1)
    const right = chartOf(reached(KNOWN, 2), 1)
    expect(count(right, new RegExp(`<span aria-hidden="true" class="${ROLE.done}">✓ </span>${CHART_TEXT.right}</span>`, 'g'))).toBe(3)
  })

  it("is whole on the last entry of part 1's list, to be read, with nothing to fill it from", () => {
    const closing = bench(wholeRun(m, fresh(), KNOWN), KNOWN, CLOSING).entry
    expect(places(closing).map((place) => [place.name, place.open, place.holds.length])).toEqual([
      ['Step 1: in the solid', false, 3],
      ['Step 2: in the liquid', false, 1],
      ['Step 3: in the solid', false, 1],
      ['Step 2: in the solid', false, 2],
      ['Step 4: in the solid', false, 1],
      ['Step 4: in the liquid', false, 1],
      ['Step 5: in the solid', false, 1],
    ])
    expect(count(closing, new RegExp(`>${CHART_TEXT.right}<`, 'g'))).toBe(7)
    expect(closing).not.toContain('role="group"')
    // Part way through, the places still to come say that nothing is there yet.
    expect(places(bench(reached(KNOWN, 2), KNOWN, CLOSING).entry).filter((place) => place.holds[0] === CHART_TEXT.empty)).toHaveLength(4)
  })

  it('is not in part 2, which has under its ways on the finished chart of part 1 as a map, closed, once part 1 is done, and until then a sentence that says so', () => {
    const before = bench(added(UNKNOWN, 0), UNKNOWN)
    expect(before.entry).not.toContain(CHART_TEXT.title)
    expect(text(before.foot)).toContain(CHART_TEXT.noMap)
    expect(before.foot).not.toContain(CHART_TEXT.map)
    const done = bench(run(m, wholeRun(m, fresh(), KNOWN), [{ type: 'add', part: UNKNOWN }]), UNKNOWN)
    expect(text(done.foot)).not.toContain(CHART_TEXT.noMap)
    const [, map] = new RegExp(`<details><summary[^>]*>${CHART_TEXT.map}</summary>(.*?)</details>`, 's').exec(done.foot)!
    expect(places(map!).map((place) => [place.name, place.open, place.holds.length])).toEqual(places(bench(wholeRun(m, fresh(), KNOWN), KNOWN, CLOSING).entry).map((place) => [place.name, place.open, place.holds.length]))
    // The map is the scheme's and says nothing of this run: no place is marked right or not.
    expect(map).not.toMatch(new RegExp(`${CHART_TEXT.right}|${CHART_TEXT.notRight}`))
    expect(buttons(map!)).toEqual([])
  })
})

describe("Guided's warning", () => {
  const pour: Action = { type: 'pourOff', part: UNKNOWN }
  const checked = (state: CationsState) => observed(looked(state, UNKNOWN), UNKNOWN)

  it('is raised by the engine before each of the three slips, in Guided and not in Challenge', () => {
    const cloudy = checked(added(UNKNOWN, 0))
    expect(warnings(m, cloudy, pour)).toEqual<Warning[]>(['not-centrifuged'])
    const cold = checked(packed(added(UNKNOWN, 1), UNKNOWN))
    expect(warnings(m, cold, pour)).toEqual<Warning[]>(['not-heated'])
    expect(warnings(m, checked(added(UNKNOWN, 1)), pour)).toEqual<Warning[]>(['not-centrifuged', 'not-heated'])
    const early = looked(added(UNKNOWN, 4), UNKNOWN)
    const observe: Action = { type: 'observe', part: UNKNOWN, observation: seen(m, stepOf(early, UNKNOWN).shows!) }
    expect(warnings(m, early, observe)).toEqual<Warning[]>(['not-acid'])
    for (const [state, action] of [[cloudy, pour], [cold, pour], [early, observe]] as const) expect(warnings(m, reduce(m, state, { type: 'setMode', mode: 'challenge' }), action)).toEqual([])
    // The press that raises it does nothing: the page draws no warning until then, and the step is not ended by it.
    expect(bench(cloudy, UNKNOWN).entry).not.toContain('role="group"')
  })

  it('is one group that can take focus, named by the titles of what it warns of and described by their bodies, with the way back before the way on', () => {
    const both: Warning[] = ['not-centrifuged', 'not-heated']
    const html = draw(createElement(WarningGroup, { ref: null, warnings: both.map((id) => ({ id, ...WARNING_TEXT[id] })), buttons: WARNING_BUTTONS[both[0]!], onBack: () => {}, onGoOn: () => {} }))
    const [, labelledBy, describedBy] = /<div role="group" tabindex="-1" aria-labelledby="([^"]+)" aria-describedby="([^"]+)"/.exec(html)!
    expect(labelledBy!.split(' ').map((id) => new RegExp(`<p id="${id}"[^>]*>(.*?)</p>`).exec(html)![1])).toEqual(both.map((id) => WARNING_TEXT[id].title))
    expect(describedBy!.split(' ').map((id) => new RegExp(`<p id="${id}"[^>]*>(.*?)</p>`).exec(html)![1])).toEqual(both.map((id) => WARNING_TEXT[id].body))
    expect(buttons(html).map((one) => one.name)).toEqual(['Go back', 'Pour anyway'])
    for (const { tag } of buttons(html)) expect(tag).toContain('lab-tap')
    expect(WARNING_BUTTONS['not-acid'].on).toBe('Record it anyway')
  })
})

describe('what is kept back', () => {
  const shownAt = (state: CationsState, part: PartId) => {
    const at = view(state, part).steps.findIndex((step) => step.status === 'current')
    return at < 0 ? CLOSING : at
  }

  it('is, of a step, its notes and its equations until the step is done: they are on no entry of the list before that, in either mode, and from then on in a disclosure that is closed', () => {
    let drawn = 0
    for (const mode of ['guided', 'challenge'] as const) {
      for (const part of PART_IDS) {
        /** Nothing a step that is not done has to say of what things are is in the Lab tab, whichever entry is shown. */
        const kept = (state: CationsState) => {
          const html = bench(state, part, shownAt(state, part)).html
          drawn++
          for (const [index, step] of view(state, part).steps.entries()) {
            if (step.status === 'done') continue
            for (const said of [...stepNotes(data, step.id), ...stepEquations(data, step.id)]) expect(html.includes(escaped(said)), `${mode} ${part}: step ${index + 1}`).toBe(false)
          }
        }
        // Each step before its reagent, with what is seen recorded, and worked to its end; the last leaves the five done.
        let state = fresh(mode)
        for (let at = 0; at < STEP_IDS.length; at++) {
          kept(state)
          kept(observed(looked(packed(run(m, state, [{ type: 'add', part }]), part), part), part))
          state = workStep(m, state, part)
        }
        kept(state)
      }
    }
    expect(drawn).toBe(2 * 2 * 11)
    const done = bench(reached(UNKNOWN, 1), UNKNOWN, 0).entry
    const [, notes] = new RegExp(`<details><summary[^>]*>${NOTES_TEXT.notes}</summary>(.*?)</details>`, 's').exec(done)!
    for (const note of stepNotes(data, STEP_IDS[0])) expect(notes).toContain(`<p>${escaped(note)}</p>`)
    expect(notes).toContain(`<h4 class="font-medium">${NOTES_TEXT.equations}</h4><p class="text-muted-foreground">${NOTES_TEXT.whichever}</p>`)
    expect([...notes!.matchAll(/<li class="lab-value">(.*?)<\/li>/g)].map((match) => match[1])).toEqual(stepEquations(data, STEP_IDS[0]).map(escaped))
    // In part 1 the sample holds all three, so nothing is said of an ion that may not be there.
    expect(bench(reached(KNOWN, 1), KNOWN, 0).entry).not.toContain(NOTES_TEXT.whichever)
    expect(text(bench(fresh(), UNKNOWN).entry)).toContain(PAGE_TEXT.notesLater)
    expect(text(done)).not.toContain(PAGE_TEXT.notesLater)
  })

  // Seven runs of part 2, each drawn at fifteen points and at the naming: over a hundred renders of the whole Lab tab. It runs in about 3 seconds alone, and is given room for a machine that is busy.
  it('is, of an unknown, which ions it holds until they are named: two unknowns that have shown the same things are the same page, markup and all, and the seven of a seed are not told apart before a tube of theirs differs', { timeout: 30_000 }, () => {
    const pages = new Map<string, Set<string>>()
    const held: string[] = []
    let state = fresh('challenge')
    let compared = 0
    const compare = (at: CationsState, unknown: number) => {
      const of = view(at, UNKNOWN)
      expect(of.outcome.state).toBe('open')
      expect(of.holds).toBeNull()
      // What a learner has been shown so far: every step as its view has it, the rack, and whether the part is done, which an earlier run settled.
      const shown = JSON.stringify([of.steps, of.rack, of.naming, of.done])
      const markup = bench(at, UNKNOWN, shownAt(at, UNKNOWN)).html.replaceAll(PAGE_TEXT.run(unknown + 1), 'Run')
      pages.set(shown, (pages.get(shown) ?? new Set()).add(markup))
      compared++
    }
    for (let unknown = 0; unknown < 7; unknown++) {
      // Each step as its reagent goes in, once its solid is packed, and once what is seen is recorded; then the naming, open.
      for (let at = 0; at < STEP_IDS.length; at++) {
        const first = run(m, state, [{ type: 'add', part: UNKNOWN }])
        compare(first, unknown)
        const settled = packed(first, UNKNOWN)
        compare(settled, unknown)
        compare(observed(looked(settled, UNKNOWN), UNKNOWN), unknown)
        state = workStep(m, state, UNKNOWN)
      }
      compare(state, unknown)
      state = run(m, state, [{ type: 'nameIons', part: UNKNOWN, ions: deduced(m, state, UNKNOWN) }])
      held.push(view(state, UNKNOWN).holds!.join('+'))
      state = reduce(m, state, { type: 'runAgain', part: UNKNOWN })
    }
    // The seven are the seven samples. Pages that show the same things are one page; and some are shared, the first step's by all six runs that come after the part is done.
    expect(new Set(held).size).toBe(7)
    for (const [shown, markups] of pages) expect(markups.size, shown.slice(0, 200)).toBe(1)
    expect(compared).toBe(7 * 16)
    expect(pages.size).toBeLessThan(compared)
    const afterTheAcid = [...pages.keys()].filter((shown) => JSON.parse(shown)[0][0].status === 'current' && JSON.parse(shown)[0][0].looked.length === 0 && JSON.parse(shown)[0][0].shows.liquid.cloudy)
    expect(afterTheAcid).toHaveLength(2)
  })

  it('is, of an unknown, anything that names an ion it holds: before the naming the Lab tab names the three only as what the sample may hold, and what it held comes with the outcome', () => {
    const state = reached(UNKNOWN, 5, 'challenge')
    const { html, entry } = bench(state, UNKNOWN, CLOSING)
    expect(view(state, UNKNOWN).holds).toBeNull()
    expect(html).not.toContain('The sample held')
    expect(text(entry)).toContain(NAMING_TEXT.help)
    const named = run(m, state, [{ type: 'nameIons', part: UNKNOWN, ions: deduced(m, state, UNKNOWN) }])
    expect(text(bench(named, UNKNOWN, CLOSING).entry)).toContain(holdsText(data, view(named, UNKNOWN).holds!))
  })
})

describe('the naming of the ions', () => {
  const closing = (state: CationsState) => bench(state, UNKNOWN, CLOSING).entry
  const boxes = (html: string) => [...html.matchAll(/<label[^>]*><input type="checkbox"([^>]*)\/>(.*?)<\/label>/g)].map(([, tag, name]) => [name, tag!.includes('checked=""')])

  it('is the last entry of part 2: three boxes, a finger tall each, named for the ions, there and disabled with the reason under them until the five steps are done', () => {
    const waiting = closing(added(UNKNOWN, 2))
    expect(waiting).toContain(`>${NAMING_TEXT.title}</h2>`)
    expect(text(waiting)).toContain(NAMING_TEXT.help)
    const [, labelledBy, describedBy] = /<fieldset disabled="" aria-labelledby="([^"]+)" aria-describedby="([^"]+)"/.exec(waiting)!
    expect(waiting).toContain(`<h2 id="${labelledBy}"`)
    expect(waiting).toContain(`<p id="${describedBy}" class="${ROLE.held}">${NAMING_TEXT.closed}</p>`)
    expect(boxes(waiting)).toEqual(ION_IDS.map((ion) => [ionLabel(data, ion), false]))
    expect(count(waiting, /<label class="flex min-h-11 /g)).toBe(3)
    const { tag } = button(waiting, NAMING_TEXT.submit)!
    expect(tag).toContain('type="submit"')
    expect(tag).toContain('aria-disabled="true"')
    expect(tag).toContain('min-h-11')
  })

  it('opens when the five steps are done, with no box ticked for the learner', () => {
    const open = closing(reached(UNKNOWN, 5))
    expect(open).toMatch(/<fieldset aria-labelledby="[^"]+" class=/)
    expect(open).not.toContain(NAMING_TEXT.closed)
    expect(boxes(open).map(([, ticked]) => ticked)).toEqual([false, false, false])
    expect(button(open, NAMING_TEXT.submit)!.tag).not.toContain('aria-disabled')
    expect(NAMING_TEXT.none).toContain('Tick at least one ion')
  })

  it('is said once: once the ions are named the boxes show them, disabled, with what was named in words, and there is no button to name them again', () => {
    const state = wholeRun(m, fresh(), UNKNOWN)
    const named = closing(state)
    const ions = view(state, UNKNOWN).naming!.named!
    expect(named).toContain('<fieldset disabled=""')
    expect(boxes(named)).toEqual(ION_IDS.map((ion) => [ionLabel(data, ion), ions.includes(ion)]))
    expect(named).toContain(`<p class="font-medium">${namedText(data, ions)}</p>`)
    expect(button(named, NAMING_TEXT.submit)).toBeUndefined()
  })

  it('is not in part 1, whose ions are given', () => {
    expect(bench(wholeRun(m, fresh(), KNOWN), KNOWN, CLOSING).entry).not.toContain('type="checkbox"')
  })
})

describe('how a run came out', () => {
  const run1 = (state: CationsState, part: PartId) => card(bench(state, part, CLOSING).entry, PAGE_TEXT.outcome)

  it('is said on the last entry of a part, in a card of its own which can take focus: not finished yet, while there is still something to do', () => {
    const open = run1(added(KNOWN, 0), KNOWN)
    expect(open).toContain(`<div tabindex="-1" class="-mx-2 -my-1 grid max-w-prose gap-2 rounded-md px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"><p class="text-muted-foreground">${RECORD_TEXT.open}</p></div>`)
  })

  it('says beside a tick that a run counts, and of an unknown what it held; and at the head of the entry that the part is done', () => {
    for (const part of PART_IDS) {
      const state = wholeRun(m, fresh(), part)
      const of = view(state, part)
      expect(run1(state, part)).toContain(`<p><span aria-hidden="true" class="${ROLE.done}">✓ </span>${outcomeText(data, part, of.outcome, of.holds)}</p>`)
      expect(read(/<p role="status" class="text-sm font-medium">(.*?)<\/p>/.exec(bench(state, part, CLOSING).entry)![1]!)).toBe(`|✓|${PAGE_TEXT.partDone}`)
    }
    expect(text(run1(wholeRun(m, fresh(), UNKNOWN), UNKNOWN))).toContain('The sample held')
    expect(text(run1(wholeRun(m, fresh(), KNOWN), KNOWN))).not.toContain('The sample held')
  })

  it('says beside a cross that a run does not count, and why, for each slip of technique and each wrong entry', () => {
    const slips: [PartId, Technique, RegExp][] = [
      [UNKNOWN, { uncentrifugedAt: 0 }, /At step 1 the liquid was poured off before the solid had been spun down/],
      [UNKNOWN, { heat: false }, /At step 2 the water was poured off without being heated/],
      [UNKNOWN, { judgeEarly: true }, /At step 5 what was seen was recorded before litmus had shown the liquid to be acid/],
      [UNKNOWN, { wrongSolidAt: 2 }, /What was recorded at step 3 is not what the tube showed/],
      [UNKNOWN, { nameWrong: true }, /The ions named are not the ones the sample held/],
      [KNOWN, { wrongTileAt: 3 }, /A place of the flow chart does not hold what belongs in it/],
    ]
    for (const [part, how, why] of slips) {
      const state = wholeRun(m, fresh('challenge'), part, how)
      const of = view(state, part)
      expect(of.outcome.state, JSON.stringify(how)).toBe('does-not-count')
      const shown = run1(state, part)
      expect(shown).toContain(`<p><span aria-hidden="true" class="${ROLE.failed}">✕ </span>${outcomeText(data, part, of.outcome, of.holds)}</p>`)
      expect(text(shown)).toMatch(why)
      expect(bench(state, part, CLOSING).entry).not.toContain(PAGE_TEXT.partDone)
    }
  })

  it('offers the way to run the part again, a finger tall, with what it does beside it: unavailable and focusable until a run is begun, and still taken once the lab is complete', () => {
    for (const part of PART_IDS) {
      const untouched = run1(fresh(), part)
      expect(button(untouched, PAGE_TEXT.runAgain[part])!.tag).toContain('aria-disabled="true"')
      expect(button(untouched, PAGE_TEXT.runAgain[part])!.tag).toContain('min-h-11')
      expect(text(untouched)).toContain(PAGE_TEXT.runAgainHelp[part])
      expect(button(run1(added(part, 0), part), PAGE_TEXT.runAgain[part])!.tag).not.toContain('aria-disabled')
      // A lab that is complete takes it all the same: part 2 can be practised on a new unknown.
      const complete = allDone()
      expect(complete.status).toBe('completed')
      expect(can(m, complete, { type: 'runAgain', part })).toBeNull()
      expect(button(run1(complete, part), PAGE_TEXT.runAgain[part])!.tag).not.toContain('aria-disabled')
    }
    const again = reduce(m, allDone(), { type: 'runAgain', part: UNKNOWN })
    expect(again.status).toBe('completed')
    expect(bench(again, UNKNOWN).entry).toContain(`>${stepTitle(data, STEP_IDS[0])}</h2>`)
    expect(read(bench(again, UNKNOWN).entry)).toContain(`${PAGE_TEXT.run(2)} · ${PAGE_TEXT.place(1, 5)} ·|◔|${STEP_STATUS_TEXT.current}|`)
    expect(button(card(bench(again, UNKNOWN).entry, PAGE_TEXT.tube), addLabel(data, STEP_IDS[0]))!.tag).not.toContain('aria-disabled')
  })
})

describe('the bench', () => {
  const benchOf = (part: PartId) => new RegExp(`<details><summary[^>]*>${PAGE_TEXT.bench}</summary>(.*)$`, 's').exec(bench(fresh(), part).foot)![1]!.split(`>${CHART_TEXT.map}<`)[0]!

  it('is in a disclosure that is closed, under the ways on of every entry: what stands on it, as a list in words', () => {
    for (const part of PART_IDS) {
      expect([...benchOf(part).matchAll(/<li>(.*?)<\/li>/g)].map((match) => match[1]).slice(0, benchLines(data, part).length)).toEqual(benchLines(data, part).map(escaped))
      for (const entry of [0, 3, CLOSING]) expect(bench(fresh(), part, entry).foot).toMatch(new RegExp(`<details><summary[^>]*>${PAGE_TEXT.bench}</summary>`))
    }
    expect(bench(fresh()).foot).not.toContain('<details open')
  })

  it('has a tile for each of the eight bottles, with its formula and its strength on its label and its hazards closed: the five reagents, then the three solutions the samples are made from under a heading that says why all three are shown', () => {
    for (const part of PART_IDS) {
      const shown = benchOf(part)
      const tiles = [...shown.matchAll(/<div role="group" aria-label="([^"]+)"/g)].map((match) => match[1])
      expect(tiles).toEqual(data.reagents.map((reagent) => escaped(reagent.name)))
      expect(tiles).toHaveLength(8)
      expect(count(shown, /<summary[^>]*>Hazards<\/summary>/g)).toBe(8)
      const heading = shown.indexOf(`<p class="max-w-prose font-medium">${SAMPLE_HAZARDS_HEADING[part]}</p>`)
      expect(heading).toBeGreaterThan(shown.indexOf(`aria-label="${escaped(data.reagents[4]!.name)}"`))
      expect(heading).toBeLessThan(shown.indexOf(`aria-label="${escaped(data.reagents[5]!.name)}"`))
      for (const reagent of data.reagents) {
        expect(shown).toContain(`>${escaped(reagent.formula)}</text>`)
        expect(shown).toContain(`>${reagent.molarity} M</text>`)
        expect(text(shown)).toContain(text(escaped(reagent.classifiedAs)))
        for (const statement of reagent.hazards.statements) expect(shown).toContain(`<li>${escaped(statement)}</li>`)
      }
    }
    expect(data.ions.map((ion) => ion.reagentId)).toEqual(data.reagents.slice(5).map((reagent) => reagent.id))
  })

  it("lists the sources of the step shown over it, closed, with what is Valence's own, from the start: the list is the scheme's, whatever a sample holds", () => {
    for (const [at, id] of STEP_IDS.entries()) {
      const { foot } = bench(fresh('challenge'), UNKNOWN, at)
      const [, list] = /<details><summary[^>]*>Sources<\/summary>(.*?)<\/details>/s.exec(foot)!
      const cited = cationsCitations(data, id, sources)
      expect(count(list!, /<li>/g)).toBe(cited.length)
      for (const { source } of cited) expect(list).toContain(escaped(source.citation))
      expect(text(list!)).toContain(escaped(SOURCES_TEXT))
    }
  })
})

describe('the record', () => {
  const record = (state: CationsState) => draw(createElement(CationsRecord, { data, m, state }))
  const rows = (html: string) => [...html.matchAll(/<tr>(.*?)<\/tr>/gs)].map((match) => read(match[1]!))

  it('is one table with a caption and three headed columns, a group of rows for each part headed by the part with how far it has come, in a region that the keyboard can scroll', () => {
    const html = record(fresh())
    expect(html).toContain(`<div role="region" aria-label="${RECORD_TEXT.region}" tabindex="0"`)
    expect(count(html, /<table/g)).toBe(1)
    expect(html).toContain(`<caption class="mb-2 text-left font-medium">${RECORD_TEXT.caption}</caption>`)
    expect([...html.matchAll(/<th scope="col"[^>]*>(.*?)<\/th>/g)].map((match) => match[1])).toEqual([RECORD_TEXT.part, RECORD_TEXT.recorded, RECORD_TEXT.result])
    expect(count(html, /<tbody>/g)).toBe(2)
    expect([...html.matchAll(/<th scope="rowgroup"[^>]*>(.*?)<\/th>/g)].map((match) => match[1])).toEqual(PART_IDS.map(partTitle))
    expect(rows(html)).toEqual([
      `|${RECORD_TEXT.part}|${RECORD_TEXT.recorded}|${RECORD_TEXT.result}|`,
      `|${partTitle(KNOWN)}|○|${PROGRESS_TEXT['not-started']}|`,
      `|${PAGE_TEXT.run(1)}|: ${RECORD_TEXT.nothing}|${RECORD_TEXT.open}|`,
      `|${partTitle(UNKNOWN)}|○|${PROGRESS_TEXT['not-started']}|`,
      `|${PAGE_TEXT.run(1)}|: ${RECORD_TEXT.nothing}|${RECORD_TEXT.open}|`,
    ])
  })

  it('lists every run of a part in order, each with how it came out, and under it each step with what was recorded there and what the check found', () => {
    const first = wholeRun(m, fresh('challenge'), UNKNOWN, { wrongSolidAt: 2 })
    const second = observed(looked(packed(run(m, reduce(m, first, { type: 'runAgain', part: UNKNOWN }), [{ type: 'add', part: UNKNOWN }]), UNKNOWN), UNKNOWN), UNKNOWN)
    const html = record(second)
    const unknown = rows(/<tbody>.*?<\/tbody><tbody>(.*?)<\/tbody>/s.exec(html)![1]!)
    const one = view(first, UNKNOWN)
    expect(unknown[0]).toBe(`|${partTitle(UNKNOWN)}|◔|${PROGRESS_TEXT.steps}|`)
    expect(unknown[1]).toBe(`|${PAGE_TEXT.run(1)}|${RECORD_TEXT.doesNotCount}|`)
    expect(unknown.slice(2, 7)).toEqual(
      one.steps.map((step) => `|${stepTitle(data, step.id)}|${observationLines(step.observation!).join('|')}|${step.wrongFields!.length === 0 ? '✓' : '✕'}|${checkedText(step.wrongFields!)}|`),
    )
    expect(unknown[4]).toContain(checkedText(['solid']))
    // What was named, and what the sample held, which the engine hands over once the ions are named.
    expect(unknown[7]).toBe(`|${RECORD_TEXT.named}|${namedText(data, one.naming!.named!)} ${holdsText(data, one.holds!)}|`)
    // Why it did not count: the observation, and the ions, which this learner named from what they had recorded.
    expect(unknown[8]).toBe(`|${reasonText({ kind: 'observation-wrong', step: STEP_IDS[2] })}|${reasonText({ kind: 'ions-wrong' })}|`)
    // The second run: one step recorded, not checked, and nothing of what its sample holds.
    expect(unknown[9]).toBe(`|${PAGE_TEXT.run(2)}|${RECORD_TEXT.open}|`)
    expect(unknown[10]).toBe(`|${stepTitle(data, STEP_IDS[0])}|${observationLines(stepOf(second, UNKNOWN).observation!).join('|')}|${PAGE_TEXT.notChecked}|`)
    expect(unknown).toHaveLength(11)
    expect(count(html, /The sample held/g)).toBe(1)
  })

  it('says of part 1, in a row of its own, whether every place checked so far holds what belongs in it', () => {
    const right = record(reached(KNOWN, 2))
    expect(rows(right)).toContain(`|${RECORD_TEXT.chart}|✓|${RECORD_TEXT.chartRight}|`)
    const wrong = record(wholeRun(m, fresh('challenge'), KNOWN, { wrongTileAt: 1 }))
    expect(rows(wrong)).toContain(`|${RECORD_TEXT.chart}|✕|${RECORD_TEXT.chartWrong}|`)
    expect(rows(wrong)).toContain(`|${reasonText({ kind: 'chart-wrong' })}|`)
    expect(record(fresh())).not.toContain(RECORD_TEXT.chart)
  })

  it('says that the lab is complete once it is, and not before', () => {
    expect(record(wholeRun(m, fresh(), KNOWN))).not.toContain(LAB_TEXT.completed)
    expect(read(record(allDone()))).toContain(`|✓|${LAB_TEXT.completed}|`)
  })
})
