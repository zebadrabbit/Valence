import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ACTIVITIES } from '@/app/activities'
import { Field } from '@/app/lab/Field'
import { ROLE } from '@/app/lab/roles'
import { NARROW_NOTICE, SHELL_TEXT } from '@/app/lab/shellText'
import { labProgress } from '@/app/lab/useLabProgress'
import { WarningGroup } from '@/app/lab/WarningGroup'
import { createMemoryStore, saveEntry, type KeyValueStore } from '@/app/progress/storage'
import { calorimetryData as data, candidatesOf, PART_IDS, type PartId } from '@/chem-data/calorimetry/data'
import { CALORIMETRY_PRIMER, READ_FIRST } from '@/chem-data/calorimetry/primer'
import { calorimetryCitations } from '@/chem-data/citations'
import sources from '@/chem-data/sources.json'
import { FIELDS, calorimetryStateSchema, can, createLab, modelFrom, partView, reduce, warnings, type Action, type CalorimetryState, type Field as EntryField, type Mode } from '@/engine/calorimetry'
import { entryActions, looks, run, wholeRun, workCup, worksheetValues } from '@/engine/calorimetry/testkit'
import labCss from '../lab.css?raw'
import { CalorimetryBench } from './CalorimetryBench'
import { CalorimetryPage } from './CalorimetryPage'
import { CalorimetryRecord } from './CalorimetryRecord'
import calorimetryCss from './calorimetry.css?raw'
import { GRAPH, PLOT_EDGE, axesOf, columns, xOf, yOf } from './graphGeometry'
import {
  BENCH_TEXT,
  CHANGE_LABEL,
  DIRECTION_LABEL,
  MODE_TEXT,
  PAGE_TEXT,
  PART_AIM,
  PROGRESS_TEXT,
  RECORD_TEXT,
  SOURCES_TEXT,
  VERDICT_TEXT,
  WARNING_BUTTONS,
  WARNING_TEXT,
  benchLines,
  blockedText,
  candidateLines,
  cupText,
  describeGraph,
  enteredText,
  entryFeedback,
  entryText,
  expectedText,
  fieldLabel,
  formatHelp,
  metalChoices,
  metalHazardsHeading,
  outcomeText,
  partNotes,
  partTitle,
  pointLabel,
  reasonText,
  relationText,
} from './messages'

// The calorimetry lab's page as markup, on a store the test holds. AppStateProvider builds its store from the
// browser and the media hook has no value on a server, so both are given directly. What a press does (a button of
// the cup, the Guided warning, Run on, a look at a reading, the arrow keys, an entry, Change, the check, Run this
// part again, Previous and Next) is state, and is checked in a browser: a markup render mounts the page and no more.
const app = vi.hoisted(() => ({ store: undefined as unknown as KeyValueStore, persistent: true, wide: true }))
vi.mock('@/app/AppState', () => ({ useAppState: () => ({ store: app.store, persistent: app.persistent, reducedMotion: false }) }))
vi.mock('@/app/useMediaQuery', () => ({ useMediaQuery: () => app.wide }))

const [, , , calorimetry] = ACTIVITIES
const m = modelFrom(data)
const SCHEMA = calorimetryStateSchema(m)
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

const [ONE, TWO, THREE] = PART_IDS
const fresh = (mode: Mode = 'guided', seed = 1) => createLab(seed, mode)
/** A careful cup worked to a curve that has turned back; then the two looks that open the first entries. */
const worked = (part: PartId, mode?: Mode) => workCup(m, fresh(mode), part)
const looked = (part: PartId, mode?: Mode) => {
  const state = worked(part, mode)
  return run(m, state, looks(m, state, part))
}
/** The first `made` entries of a careful worksheet. */
const entered = (part: PartId, made: number, mode?: Mode) => {
  const state = looked(part, mode)
  return run(m, state, entryActions(part, worksheetValues(m, state, part)).slice(0, made))
}
const allDone = (mode?: Mode) => PART_IDS.reduce((state, part) => wholeRun(m, state, part), fresh(mode))
const view = (state: CalorimetryState, part: PartId) => partView(m, state, part)

/** The Lab tab's bench on a state, opened at a part, and that part's own markup: the one that is not hidden. */
function bench(state: CalorimetryState, at: PartId = ONE, reducedMotion = false) {
  const html = draw(
    createElement(CalorimetryBench, { data, m, sources, state, reducedMotion, can: (action: Action) => can(m, state, action), warn: (action: Action) => warnings(m, state, action), act: (action: Action) => void reduce(m, state, action), opensAt: PART_IDS.indexOf(at) }),
  )
  const drawn = html.split(/(?=<div(?: hidden="")?><section aria-labelledby=)/).slice(1)
  const shown = drawn.filter((one) => !one.startsWith('<div hidden'))
  return { html, drawn, shown, part: shown[0]!.split('<div class="flex flex-wrap justify-between gap-2">')[0]! }
}
/** The cards of a part, by their h3. */
const cards = (part: string) => [...part.matchAll(/<h3[^>]*>(.*?)<\/h3>/g)].map((match) => match[1])
const card = (part: string, heading: string) => part.split(/(?=<section aria-labelledby="[^"]+" class="grid min-w-0 justify-items-start)/).find((one) => one.includes(`>${heading}</h3>`))!
/** The head of a part: what stands over its first card. */
const head = (part: string) => part.split(/(?=<section aria-labelledby="[^"]+" class="grid min-w-0 justify-items-start)/)[0]!
const GRAPH_PICTURE = `<svg viewBox="0 0 ${GRAPH.width} ${GRAPH.height}"`
const CUP_PICTURE = '<svg viewBox="0 0 280 196" aria-hidden="true"'
/** The buttons laid over the readings of the graph: each by its step, its name, whether the Tab key stops on it, and where it lies in hundredths of the picture. */
const points = (html: string) =>
  [...html.matchAll(/<button type="button" data-part="(\d+)" tabindex="(-?\d)" aria-label="([^"]+)" style="left:([\d.]+)%;top:([\d.]+)%;width:([\d.]+)%;height:([\d.]+)%"[^>]*><\/button>/g)].map(([, step, tab, name, left, top, width, height]) => ({
    step: Number(step),
    tab: Number(tab),
    name: name!,
    left: Number(left),
    top: Number(top),
    width: Number(width),
    height: Number(height),
  }))
/** The entries of the worksheet, as its list has them. */
const entries = (notebook: string) => [.../<ol class="grid w-full list-decimal gap-3 pl-6">(.*)<\/ol>/s.exec(notebook)![1]!.matchAll(/<li>(.*?)<\/li>(?=<li>|$)/gs)].map((match) => match[1]!)
/** Everything a learner is not to be told before a run of the part counts: the figure its result is held to, and what the record says of it. */
const kept = (part: PartId) => {
  const expected = view(wholeRun(m, fresh(), part), part).expected!
  return [expectedText(data, part, expected), ...partNotes(data, part, expected)]
}

beforeEach(() => {
  app.store = createMemoryStore()
  app.persistent = true
  app.wide = true
})

describe('the calorimetry page', () => {
  const page = () => draw(createElement(CalorimetryPage))
  const save = (state: CalorimetryState) => saveEntry(app.store, calorimetry.entry, calorimetry.version, state)

  it("with nothing stored opens on the Primer tab with its eight cards one at a time, four of them marked to read first, the mode choice in this lab's own words, and Start; and stores nothing", () => {
    const html = page()
    expect(calorimetry).toMatchObject({ entry: 'lab:calorimetry', to: '/lab/calorimetry', kind: 'Lab' })
    expect(html).toMatch(new RegExp(`<h1[^>]*>${calorimetry.title}</h1>`))
    expect(selectedTab(html)).toEqual(['Primer'])
    const [primer, lab, record] = panels(html)
    expect([primer!.shown, lab!.shown, record!.shown]).toEqual([true, false, false])
    expect(count(primer!.body, /<h2[^>]*>/g)).toBe(1)
    expect(primer!.body).toContain(`>${CALORIMETRY_PRIMER[0]!.heading}</h2>`)
    for (const section of CALORIMETRY_PRIMER) expect(primer!.body).toContain(`>${escaped(section.heading)}<`)
    expect(CALORIMETRY_PRIMER).toHaveLength(8)
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
    const state = worked(TWO)
    save(state)
    const before = app.store.getItem(app.store.key(0)!)
    const gets = vi.spyOn(app.store, 'getItem')
    const sets = vi.spyOn(app.store, 'setItem')
    page()
    expect(sets).not.toHaveBeenCalled()
    expect(gets.mock.calls.length).toBeGreaterThan(0)
    expect(app.store.getItem(app.store.key(0)!)).toBe(before)
    expect(labProgress(app.store, calorimetry, SCHEMA).load()).toEqual(state)
  })

  it('with a run stored opens on the Lab tab, on the part the run was in the middle of, with Restart and no docked notebook; and the Record tab holds the record', () => {
    save(worked(TWO, 'challenge'))
    const html = page()
    expect(selectedTab(html)).toEqual(['Lab'])
    const [, lab, record] = panels(html)
    expect(lab!.body).toContain(`>${partTitle(data, TWO)}</h2>`)
    expect(lab!.body).not.toContain(`>${partTitle(data, ONE)}</h2>`)
    expect(buttons(html).some((one) => one.name === SHELL_TEXT.restart)).toBe(true)
    expect(buttons(html).some((one) => one.name === SHELL_TEXT.start)).toBe(false)
    expect(html).not.toContain('aria-label="Lab notebook"')
    expect(html).toContain(`${SHELL_TEXT.mode}: <span class="${ROLE.value}">${SHELL_TEXT.modeName.challenge}</span>`)
    expect(record!.body).toContain(`<caption class="mb-2 text-left font-medium">${RECORD_TEXT.caption}</caption>`)
    // With a part done and none begun, the first that is not done.
    save(wholeRun(m, fresh(), ONE))
    expect(panels(page())[1]!.body).toContain(`>${partTitle(data, TWO)}</h2>`)
  })

  it('sets aside a stored record that does not fit, says so, and starts fresh', () => {
    // A look at a reading the logger has not taken: nothing the reducer could have left.
    const state = fresh()
    saveEntry(app.store, calorimetry.entry, calorimetry.version, { ...state, parts: { ...state.parts, [ONE]: [{ ...state.parts[ONE][0]!, logger: true, looked: [3] }] } })
    const html = page()
    expect(html).toContain(escaped(SHELL_TEXT.setAside))
    expect(selectedTab(html)).toEqual(['Primer'])
    expect(buttons(html).some((one) => one.name === SHELL_TEXT.start)).toBe(true)
  })

  it('in a narrow window shows the notice on the Lab tab in place of the parts, the record on its tab, and nothing that changes a run', () => {
    save(wholeRun(m, fresh(), ONE))
    app.wide = false
    const html = page()
    const [, lab, record] = panels(html)
    expect(text(lab!.body)).toContain(NARROW_NOTICE.title)
    expect(lab!.body).not.toContain('<h2')
    expect(record!.body).toContain(RECORD_TEXT.caption)
    for (const name of [SHELL_TEXT.start, SHELL_TEXT.restart, BENCH_TEXT.lid, BENCH_TEXT.runAgain]) expect(buttons(html).some((one) => one.name === name)).toBe(false)
    expect(html).not.toContain('type="radio"')
  })
})

describe('the list of parts', () => {
  // Part 1 done, part 2 with a run that did not count, part 3 with its cup under way.
  const state = run(m, wholeRun(m, wholeRun(m, fresh('challenge'), ONE), TWO, { lid: false }), [{ type: 'startLogger', part: THREE }])
  const { html, drawn, shown } = bench(state, TWO)
  const nav = /<nav aria-label="Parts"[^>]*>(.*?)<\/nav>/s.exec(html)![1]!

  it('is a navigation named Parts that lists the three in order, each with its number and how far it has come in words beside a mark', () => {
    expect([...nav.matchAll(/<li>(.*?)<\/li>/gs)].map((match) => read(match[1]!))).toEqual([
      `|1.|${data.parts[0].name}|✓|${PROGRESS_TEXT.done}|`,
      `|2.|${data.parts[1].name}|◑|${PROGRESS_TEXT['not-counted']}|`,
      `|3.|${escaped(data.parts[2].name)}|◔|${PROGRESS_TEXT.cup}|`,
    ])
    // The marks are for the eye: a screen reader is given the words.
    expect(count(nav, /<span aria-hidden="true"[^>]*>[○◔◑✓] <\/span>/g)).toBe(3)
    expect(nav).toContain(`<span aria-hidden="true" class="${ROLE.done}">✓ </span>`)
    expect(read(/<nav aria-label="Parts"[^>]*>(.*?)<\/nav>/s.exec(bench(entered(ONE, 2)).html)![1]!)).toContain(`|1.|${data.parts[0].name}|◑|${PROGRESS_TEXT.worksheet}|`)
    expect(read(/<nav aria-label="Parts"[^>]*>(.*?)<\/nav>/s.exec(bench(fresh()).html)![1]!)).toContain(`|1.|${data.parts[0].name}|○|${PROGRESS_TEXT['not-started']}|`)
  })

  it("folds behind a button named Parts, as the primer's topics do, and is beside the part from the same width", () => {
    const [folded, controls] = /<button[^>]*aria-expanded="false"[^>]*aria-controls="([^"]+)"[^>]*>(?:.*?)<\/button>/s.exec(nav)!
    expect(text(folded!)).toBe(PAGE_TEXT.list)
    expect(folded).toContain('primer-topics-button')
    expect(nav).toContain(`<ol id="${controls}" class="primer-topics `)
    expect(html).toContain('<div class="primer-layout">')
    expect(labCss).toContain('@container primer (min-width: 46rem)')
  })

  it('shows one part at a time, and draws no other until it is asked for', () => {
    expect(drawn).toHaveLength(1)
    expect(shown).toHaveLength(1)
    expect(count(html, /<h2[^>]*>/g)).toBe(1)
    expect(html).toContain(`>${partTitle(data, TWO)}</h2>`)
  })

  it('says on the part which run it is and how far the part has come, as the description of a heading that can take focus', () => {
    const [, placeId, place] = /<p id="([^"]+)" class="text-xs text-muted-foreground">(.*?)<\/p>/.exec(shown[0]!)!
    expect(read(place!)).toBe(`${RECORD_TEXT.run(1)} ·|◑|${PROGRESS_TEXT['not-counted']}|`)
    expect(shown[0]).toMatch(new RegExp(`<h2 id="[^"]+" tabindex="-1" aria-describedby="${placeId}"`))
    // A part run again says so.
    const again = run(m, state, [{ type: 'runAgain', part: TWO }])
    expect(read(/<p id="[^"]+" class="text-xs text-muted-foreground">(.*?)<\/p>/.exec(bench(again, TWO).part)![1]!)).toBe(`${RECORD_TEXT.run(2)} ·|○|${PROGRESS_TEXT['not-started']}|`)
  })

  it('offers Previous and Next, each named by where it goes; at the first there is no Previous and at the last no Next', () => {
    const ways = (at: PartId) => buttons(bench(state, at).html).map((one) => one.name).filter((name) => /^(← Previous|Next)/.test(name))
    expect(ways(TWO)).toEqual([`← ${PAGE_TEXT.previous(partTitle(data, ONE))}`, `${escaped(PAGE_TEXT.next(partTitle(data, THREE)))} →`])
    expect(ways(ONE)).toEqual([`${PAGE_TEXT.next(partTitle(data, TWO))} →`])
    expect(ways(THREE)).toEqual([`← ${PAGE_TEXT.previous(partTitle(data, TWO))}`])
  })

  it('has at its head a status line that is empty until the lab is complete, and then says so', () => {
    expect(html).toContain('<p role="status" class="text-sm font-medium"></p><div class="primer">')
    expect(html).not.toContain(BENCH_TEXT.complete)
    expect(bench(allDone()).html).toContain(`<p role="status" class="text-sm font-medium"><span aria-hidden="true" class="${ROLE.done}">✓ </span>${BENCH_TEXT.complete}</p><div class="primer">`)
  })
})

describe('a part before anything is done', () => {
  const { part } = bench(fresh(), ONE)

  it('has two cards, the bench and the cup: the graph waits for the logger, the notebook for the change, and how the run came out for a run to leave behind', () => {
    expect(cards(part)).toEqual([BENCH_TEXT.bench, BENCH_TEXT.cup])
    expect(part).not.toContain(GRAPH_PICTURE)
    expect(part).not.toContain('<ol')
    expect(buttons(part).some((one) => one.name === BENCH_TEXT.runAgain || one.name === BENCH_TEXT.runOn)).toBe(false)
  })

  it('says under its title what the part finds, in Guided; in Challenge that waits until the part is done, since it says which way the heat goes', () => {
    for (const id of PART_IDS) {
      expect(head(bench(fresh(), id).part)).toContain(`<p class="max-w-prose text-sm">${PART_AIM[id]}</p>`)
      expect(head(bench(fresh('challenge'), id).part)).not.toContain(PART_AIM[id])
      expect(head(bench(wholeRun(m, fresh('challenge'), id), id).part)).toContain(PART_AIM[id])
    }
    expect(PART_AIM[ONE]).toContain('given out')
    expect(PART_AIM[TWO]).toContain('taken in')
  })

  it('lists on the bench what is used, with what the balance reads where something is weighed, and a tile for each reagent with its hazards closed', () => {
    for (const id of [ONE, TWO]) {
      const state = fresh()
      const benchCard = card(bench(state, id).part, BENCH_TEXT.bench)
      expect(benchCard).toContain(`<ul class="grid max-w-[75ch] list-disc gap-1 pl-5">${benchLines(data, id, view(state, id).bench).map((line) => `<li>${escaped(line)}</li>`).join('')}</ul>`)
      const used = data.parts[PART_IDS.indexOf(id)]!.amounts.flatMap((amount) => data.reagents.filter((reagent) => reagent.id === amount.reagentId))
      expect(used.map((reagent) => reagent.id)).toEqual(id === ONE ? ['hcl-1m', 'naoh-1m'] : ['nh4no3-solid'])
      for (const reagent of used) {
        expect(benchCard).toContain(`<div role="group" aria-label="${escaped(reagent.name)}"`)
        expect(benchCard).toContain(`<h4 class="font-medium">${escaped(reagent.classifiedAs)}</h4>`)
        for (const statement of reagent.hazards.statements) expect(benchCard).toContain(`<li>${escaped(statement)}</li>`)
        const { note } = reagent.hazards
        for (const sourceId of [reagent.hazards.sourceId, note.sourceId, ...(note.alsoSourceId === undefined ? [] : [note.alsoSourceId]), ...(note.moreSourceIds ?? [])]) expect(benchCard, sourceId).toContain(escaped(sources.find((s) => s.id === sourceId)!.citation))
      }
      expect(count(benchCard, /<details><summary[^>]*>Hazards<\/summary>/g)).toBe(used.length)
      expect(benchCard).not.toContain('<details open')
    }
    expect(benchLines(data, TWO, view(fresh(), TWO).bench)[1]).toBe('Ammonium nitrate, white crystals, weighed out: the balance reads 4.20 g.')
    // A bottle's label holds the formula, over the strength where it is a solution; the note of a solid is of the solid as it is used.
    const one = card(part, BENCH_TEXT.bench)
    expect([...one.matchAll(/<text[^>]*>(.*?)<\/text>/g)].map((match) => match[1])).toEqual(['HCl', '1.00 M', 'NaOH', '1.00 M'])
    expect(one).toContain('<h4 class="font-medium">At the strength used here</h4>')
    const two = card(bench(fresh(), TWO).part, BENCH_TEXT.bench)
    expect([...two.matchAll(/<text[^>]*>(.*?)<\/text>/g)].map((match) => match[1])).toEqual(['NH₄NO₃'])
    expect(two).toContain('<h4 class="font-medium">As it is used here</h4>')
  })

  it('draws the cup, hidden from a screen reader, and says its state in words in a status line beside it', () => {
    const cup = card(part, BENCH_TEXT.cup)
    expect(cup).toContain(CUP_PICTURE)
    expect(cup).toContain(`<p role="status" class="max-w-prose flex-1 basis-48 font-medium">${cupText(ONE, view(fresh(), ONE).cup, 0)}</p>`)
    expect(cupText(ONE, view(fresh(), ONE).cup, 0)).toBe('The cup holds the hydrochloric acid. The sodium hydroxide solution has not been poured in. The lid is off. The stirrer is still. The logger has not been started.')
  })

  it('offers the lid, the stirrer, the logger and the one action that starts the change, a finger tall each; the change waits for the logger, stays focusable, and no warning shows until it is pressed', () => {
    const cup = card(part, BENCH_TEXT.cup)
    expect(buttons(cup).map((one) => one.name)).toEqual([BENCH_TEXT.lid, BENCH_TEXT.stir, BENCH_TEXT.logger, CHANGE_LABEL[ONE]])
    for (const one of buttons(cup)) expect(one.tag).toContain('min-h-11')
    for (const name of [BENCH_TEXT.lid, BENCH_TEXT.stir, BENCH_TEXT.logger]) expect(button(cup, name)!.tag).not.toContain('aria-disabled')
    expect(button(cup, CHANGE_LABEL[ONE])!.tag).toContain('aria-disabled="true"')
    expect(button(cup, CHANGE_LABEL[ONE])!.tag).not.toContain(' disabled=""')
    expect(cup).not.toContain('role="group"')
    for (const id of PART_IDS) expect(buttons(card(bench(fresh(), id).part, BENCH_TEXT.cup)).map((one) => one.name)).toContain(CHANGE_LABEL[id])
    // One message line, empty until a press is refused.
    expect(count(cup, /<p role="status"><\/p>/g)).toBe(1)
  })

  it('marks a step that is taken with a tick, leaves it focusable and not faint, and says the cup again', () => {
    const state = run(m, fresh(), [
      { type: 'putLidOn', part: ONE },
      { type: 'startLogger', part: ONE },
    ])
    const cup = card(bench(state, ONE).part, BENCH_TEXT.cup)
    for (const name of [BENCH_TEXT.lid, BENCH_TEXT.logger]) {
      const taken = button(cup, `✓ ${name}`)!
      expect(taken.tag).toContain('aria-disabled="true"')
      // Drawn whole: the class that draws an unavailable button faint is not on it.
      expect(taken.tag).not.toMatch(/[" ]opacity-50[" ]/)
    }
    expect(button(cup, BENCH_TEXT.runOn)).toBeUndefined()
    expect(button(card(bench(fresh(), ONE).part, BENCH_TEXT.cup), CHANGE_LABEL[ONE])!.tag).toMatch(/[" ]opacity-50[" ]/)
    expect(cup).toContain(`<span aria-hidden="true" class="${ROLE.done}">✓ </span>${BENCH_TEXT.lid}`)
    expect(button(cup, BENCH_TEXT.stir)!.tag).not.toContain('aria-disabled')
    expect(button(cup, CHANGE_LABEL[ONE])!.tag).not.toContain('aria-disabled')
    expect(cup).toContain('The lid is on. The stirrer is still. The logger is running: one reading so far.')
  })

  it('lists its sources at its foot, closed, with what is Valence\'s own', () => {
    for (const id of PART_IDS) {
      const { part: html } = bench(fresh(), id)
      const foot = html.slice(html.lastIndexOf('<details><summary'))
      expect(foot).toMatch(/^<details><summary[^>]*>Sources<\/summary>/)
      for (const { source } of calorimetryCitations(data, id, sources)) expect(foot, source.id).toContain(escaped(source.citation))
      expect(foot).toContain(escaped(SOURCES_TEXT))
    }
  })
})

describe('the sources of a part', () => {
  const covers = (part: PartId) => calorimetryCitations(data, part, sources).flatMap((citation) => citation.covers)

  it('cover what is used and its hazards, the water, the enthalpies behind the stored figure, and the notes', () => {
    expect(covers(ONE)).toEqual(expect.arrayContaining(['Hydrochloric acid, 1.00 M: the substance', 'Sodium hydroxide solution, 1.00 M: hazards at the strength used', 'Specific heat and density of water, taken for every solution too (idealised)', 'Enthalpies of formation, for the figure the lab holds', 'Notes on this part']))
    expect(covers(TWO)).toEqual(expect.arrayContaining(['Ammonium nitrate: molar mass', 'Ammonium nitrate: appearance', 'Ammonium nitrate: hazards as it is used here', 'Enthalpies of formation, for the figure the lab holds']))
    expect(calorimetryCitations(data, ONE, sources).map((citation) => citation.source.id)).toContain('nbs-tables-1982')
  })

  it('list all four metals for part 3, whichever the piece is, and nothing that names a figure or a metal as the answer', () => {
    for (const metal of candidatesOf(data)) expect(covers(THREE)).toEqual(expect.arrayContaining([`${metal.name}: heat capacity of a mole, for its specific heat`, `${metal.name}: molar mass`, `${metal.name}: hazard classification`]))
    expect(covers(THREE)).not.toContain('Enthalpies of formation, for the figure the lab holds')
    for (const id of PART_IDS) for (const label of covers(id)) expect(label).not.toMatch(/57\.7|24\.4|0\.\d{3}|piece (is|was)/)
  })
})

describe("part 3's bench", () => {
  const state = fresh()
  const benchCard = (of: CalorimetryState) => card(bench(of, THREE).part, BENCH_TEXT.bench)

  it('names the piece for what it looks like, with what the balance and the thermometer in the boiling water read', () => {
    expect(benchLines(data, THREE, view(state, THREE).bench)).toEqual(['50.0 mL of distilled water, in the cup.', 'Unknown metal, a grey piece of metal: the balance reads 49.12 g.', 'The piece is in boiling water, and the thermometer in that water reads 99.6 °C.'])
    for (const line of benchLines(data, THREE, view(state, THREE).bench)) expect(benchCard(state)).toContain(`<li>${line}</li>`)
  })

  it('has the table of the four metals the piece may be, each with its specific heat, as the record has them', () => {
    const table = /<table[^>]*>(.*?)<\/table>/s.exec(benchCard(state))![1]!
    expect(table).toContain(`<caption class="mb-1 text-left font-medium">${BENCH_TEXT.candidates}</caption>`)
    expect([...table.matchAll(/<tr><th scope="row"[^>]*>(.*?)<\/th><td[^>]*>(.*?)<\/td><\/tr>/g)].map((match) => `${match[1]}: ${match[2]}`)).toEqual(candidateLines(data))
    expect(candidateLines(data)).toHaveLength(4)
  })

  it('shows the hazards of all four until the part is done, under a heading that says why, and then of the one the piece was', () => {
    const before = benchCard(state)
    expect(before).toContain(`<p class="max-w-prose font-medium">${metalHazardsHeading(data, null)}</p>`)
    expect([...before.matchAll(/<div role="group" aria-label="([^"]+)"/g)].map((match) => match[1])).toEqual(candidatesOf(data).map((metal) => metal.name))
    expect(count(before, /<details><summary[^>]*>Hazards<\/summary>/g)).toBe(4)
    for (const metal of candidatesOf(data)) expect(before).toContain(`<h4 class="font-medium">${escaped(metal.classifiedAs)}</h4>`)
    // A run that does not count leaves all four.
    expect(count(benchCard(wholeRun(m, fresh('challenge'), THREE, { stir: false })), /<div role="group" aria-label=/g)).toBe(4)
    const done = wholeRun(m, state, THREE)
    const was = view(done, THREE).expected!
    if (was.kind !== 'metal') throw new Error('part 3 is held to a metal')
    const after = benchCard(done)
    expect(after).toContain(`<p class="max-w-prose font-medium">${metalHazardsHeading(data, was.metalId)}</p>`)
    expect([...after.matchAll(/<div role="group" aria-label="([^"]+)"/g)].map((match) => match[1])).toEqual([candidatesOf(data).find((metal) => metal.id === was.metalId)!.name])
    // The table still holds all four.
    expect(count(after, /<th scope="row"/g)).toBe(4)
  })
})

describe("the cup's drawing", () => {
  const cup = (state: CalorimetryState, part: PartId, reducedMotion = false) => card(bench(state, part, reducedMotion).part, BENCH_TEXT.cup)
  const lid: Action = { type: 'putLidOn', part: ONE }
  const stir: Action = { type: 'stir', part: ONE }

  it('shows the lid on the cup or on the bench beside it, the marks of the stirrer while it is going, and the logger running', () => {
    const off = cup(fresh(), ONE)
    expect(off).toContain('data-lid="off"')
    expect(off).not.toContain('data-lid="on"')
    expect(off).not.toContain('data-stirring')
    expect(off).not.toContain('data-logging')
    const on = cup(run(m, fresh(), [lid, stir, { type: 'startLogger', part: ONE }]), ONE)
    expect(on).toContain('data-lid="on"')
    expect(on).not.toContain('data-lid="off"')
    expect(on).toContain('<g data-stirring=""')
    expect(on).toContain('<g data-logging="">')
  })

  it('shows what is to go into the cup beside it until the change is started, and the cup fuller, or the piece in it, from then', () => {
    for (const id of PART_IDS) {
      const before = cup(fresh(), id)
      const after = cup(worked(id), id)
      expect(count(before, /data-waiting=""/g)).toBe(1)
      expect(after).not.toContain('data-waiting')
      const level = (html: string) => Number(/<path d="M [\d.]+ ([\d.]+) L [\d.]+ [\d.]+ L 158 177 L 102 177 Z"/.exec(html)![1])
      // Higher on the page is a smaller number.
      expect(level(after)).toBeLessThan(level(before))
    }
    expect(cup(worked(THREE), THREE)).toContain('<rect x="128" y="164" width="22" height="13"')
    expect(cup(fresh(), THREE)).not.toContain('<rect x="128" y="164"')
  })

  it('bobs the stirrer only while it is going and only where the reduced-motion setting allows, and then for under five seconds', () => {
    expect(cup(run(m, fresh(), [stir]), ONE)).toContain('<g class="cal-stir">')
    expect(cup(run(m, fresh(), [stir]), ONE, true)).not.toContain('cal-stir')
    expect(cup(run(m, fresh(), [stir]), ONE, true)).toContain('data-stirring')
    expect(cup(fresh(), ONE)).not.toContain('cal-stir')
    const css = calorimetryCss.replace(/\/\*.*?\*\//gs, '')
    const [, seconds, times] = /animation: cal-stir ([\d.]+)s ease-in-out (\d+);/.exec(css)!
    expect(Number(seconds) * Number(times)).toBeLessThan(5)
    expect(css.match(/animation:/g)).toHaveLength(1)
  })
})

describe("Guided's warning, as the cup's card draws it", () => {
  const change: Action = { type: 'startChange', part: ONE }
  const logging = run(m, fresh(), [{ type: 'startLogger', part: ONE }])

  it('is raised by the engine for the lid and for the stirrer, each alone or both, in Guided and not in Challenge', () => {
    expect(warnings(m, logging, change)).toEqual(['lid-off', 'not-stirring'])
    expect(warnings(m, run(m, logging, [{ type: 'putLidOn', part: ONE }]), change)).toEqual(['not-stirring'])
    expect(warnings(m, run(m, logging, [{ type: 'stir', part: ONE }]), change)).toEqual(['lid-off'])
    expect(warnings(m, run(m, fresh('challenge'), [{ type: 'startLogger', part: ONE }]), change)).toEqual([])
    // Before the logger the change is refused, and there is nothing to warn of.
    expect(warnings(m, fresh(), change)).toEqual([])
  })

  it('is one group that can take focus, named by the titles of what it warns of and described by their bodies, with the way back before the way on', () => {
    const both = warnings(m, logging, change)
    const html = renderToStaticMarkup(createElement(WarningGroup, { warnings: both.map((warning) => ({ id: warning, ...WARNING_TEXT[warning] })), buttons: WARNING_BUTTONS, onBack: () => {}, onGoOn: () => {}, ref: null }))
    const [, labelledBy, describedBy] = /^<div role="group" tabindex="-1" aria-labelledby="([^"]+)" aria-describedby="([^"]+)"/.exec(html)!
    expect(labelledBy!.split(' ')).toHaveLength(2)
    labelledBy!.split(' ').forEach((id, at) => expect(html).toContain(`<p id="${id}" class="font-medium">${WARNING_TEXT[both[at]!].title}</p>`))
    describedBy!.split(' ').forEach((id, at) => expect(html).toContain(`<p id="${id}">${WARNING_TEXT[both[at]!].body}</p>`))
    expect(buttons(html).map((one) => one.name)).toEqual([WARNING_BUTTONS.back, WARNING_BUTTONS.on])
    expect(buttons(html).every((one) => /class="[^"]*\blab-tap\b/.test(one.tag))).toBe(true)
  })
})

describe('the graph', () => {
  const state = looked(ONE)
  const { part } = bench(state, ONE)
  const graphCard = card(part, BENCH_TEXT.graph)
  const { graph } = view(state, ONE)
  const axes = axesOf(graph.readings, m.stepSeconds)

  it('comes with the logger, as a third card, with one reading', () => {
    const started = run(m, fresh(), [{ type: 'startLogger', part: ONE }])
    expect(cards(bench(started, ONE).part)).toEqual([BENCH_TEXT.bench, BENCH_TEXT.cup, BENCH_TEXT.graph])
    expect(points(card(bench(started, ONE).part, BENCH_TEXT.graph))).toHaveLength(1)
  })

  it('has Run on over the picture it adds to, a finger tall, with what one press does beside it and a message line of its own', () => {
    expect(graphCard).toMatch(new RegExp(`^<section[^>]*><h3[^>]*>${BENCH_TEXT.graph}</h3><div class="flex flex-wrap items-center gap-x-3 gap-y-1.5"><button[^>]*><span>${BENCH_TEXT.runOn}</span></button><p class="max-w-prose flex-1 basis-48 text-muted-foreground">${BENCH_TEXT.runOnHelp(m)}</p></div><p role="status"></p>`))
    expect(button(graphCard, BENCH_TEXT.runOn)!.tag).toContain('min-h-11')
    expect(BENCH_TEXT.runOnHelp(m)).toBe('Lets 30 seconds pass: two more readings.')
    // The cup's card does not hold it.
    expect(buttons(card(part, BENCH_TEXT.cup)).map((one) => one.name)).not.toContain(BENCH_TEXT.runOn)
    // Once the worksheet is begun the cup is left as it is: the button stays, unavailable and focusable.
    expect(button(card(bench(entered(ONE, 1), ONE).part, BENCH_TEXT.graph), BENCH_TEXT.runOn)!.tag).toContain('aria-disabled="true"')
  })

  it('is a picture named for what it is and described by the lines that say how it is looked at, the keys among them', () => {
    const [, describedBy] = new RegExp(`${GRAPH_PICTURE} role="img" aria-label="${escaped(PAGE_TEXT.graphPicture)}" aria-describedby="([^"]+)"`).exec(graphCard)!
    expect(graphCard).toContain(`<div id="${describedBy}" class="grid max-w-prose gap-1"><p>${BENCH_TEXT.explore}</p><p class="text-muted-foreground">${PAGE_TEXT.arrows}</p></div>`)
    expect(BENCH_TEXT.explore).toMatch(/Point at .*tap it.*keyboard/)
    expect(PAGE_TEXT.arrows).toMatch(/arrow keys/)
  })

  it('follows the theme: everything in it is the colour of the text, and an open point is filled with the colour of its card', () => {
    const picture = graphCard.slice(graphCard.indexOf(GRAPH_PICTURE), graphCard.indexOf('</svg>'))
    expect(picture).toContain('class="block h-auto w-full text-foreground"')
    expect([...new Set([...picture.matchAll(/(?:fill|stroke)="([^"]+)"/g)].map((match) => match[1]))].sort()).toEqual(['currentColor', 'none', 'var(--card)'])
  })

  it('draws a point for each reading where the reading is, a line through them, and both axes with their marks, numbers and names', () => {
    const drawn = [...graphCard.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="4" fill="([^"]+)"/g)].map((match) => [Number(match[1]), Number(match[2]), match[3]])
    expect(drawn).toHaveLength(graph.readings.length)
    graph.readings.forEach((tenths, step) => expect(drawn[step]).toEqual([xOf(axes, step), yOf(axes, tenths), graph.looked.includes(step) ? 'currentColor' : 'var(--card)']))
    expect(graphCard).toContain(`<polyline points="${graph.readings.map((tenths, step) => `${xOf(axes, step)},${yOf(axes, tenths)}`).join(' ')}"`)
    const numbers = [...graphCard.matchAll(/<text x="[\d.]+" y="[\d.]+" text-anchor="(end|middle)"[^>]*class="tabular-nums">(\d+)<\/text>/g)].map((match) => [match[1], Number(match[2])])
    expect(numbers.filter(([anchor]) => anchor === 'end').map(([, number]) => number)).toEqual([19, 20, 21, 22, 23, 24, 25, 26, 27, 28])
    expect(numbers.filter(([anchor]) => anchor === 'middle').map(([, number]) => number)).toEqual([0, 1, 2, 3])
    expect(graphCard).toContain(`>${PAGE_TEXT.temperatureAxis}</text>`)
    expect(graphCard).toContain(`>${PAGE_TEXT.timeAxis}</text>`)
  })

  it('fills a point once it has been looked at and leaves it open until then, and says which is which in a key under the picture', () => {
    expect(graph.looked).toHaveLength(2)
    expect(count(graphCard, /r="4" fill="currentColor"/g)).toBe(2)
    expect(count(graphCard, /r="4" fill="var\(--card\)"/g)).toBe(graph.readings.length - 2)
    const key = /<ul class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">(.*?)<\/ul>/s.exec(graphCard)![1]!
    expect(read(key)).toBe(`|${PAGE_TEXT.lookedAt}|${PAGE_TEXT.notLookedAt}|${PAGE_TEXT.changeMark}|`)
    expect(count(key, /<svg[^>]*aria-hidden="true"/g)).toBe(3)
  })

  it('marks where the change was started with a dashed line just after the reading it followed, and says so in the key, from the change on and not before', () => {
    const [, x] = /<line data-change="" x1="([\d.]+)"[^>]*stroke-dasharray="5 4"/.exec(graphCard)!
    expect(Number(x)).toBeGreaterThan(xOf(axes, graph.changedAt!))
    expect(Number(x)).toBeLessThan(xOf(axes, graph.changedAt! + 1))
    const before = card(bench(run(m, fresh(), [{ type: 'startLogger', part: ONE }, { type: 'runOn', part: ONE }]), ONE).part, BENCH_TEXT.graph)
    expect(before).not.toContain('data-change')
    expect(before).not.toContain(PAGE_TEXT.changeMark)
  })

  it('lays a real button over each reading: a column the whole height of the plot, the columns meeting, each named for the look it is and saying once it has been looked at', () => {
    const laid = points(graphCard)
    const areas = columns(graph.readings.length, axes)
    expect(laid.map((one) => one.step)).toEqual(graph.readings.map((_, step) => step))
    laid.forEach((one, step) => {
      expect(one.name).toBe(pointLabel(m, step, graph.looked.includes(step)))
      expect(one.left).toBeCloseTo((areas[step]!.from / GRAPH.width) * 100, 9)
      expect(one.width).toBeCloseTo(((areas[step]!.to - areas[step]!.from) / GRAPH.width) * 100, 9)
      expect(one.top).toBeCloseTo((PLOT_EDGE.top / GRAPH.height) * 100, 9)
      expect(one.height).toBeCloseTo(((PLOT_EDGE.bottom - PLOT_EDGE.top) / GRAPH.height) * 100, 9)
      if (step > 0) expect(one.left).toBeCloseTo(laid[step - 1]!.left + laid[step - 1]!.width, 9)
    })
    expect(laid[graph.changedAt!]!.name).toMatch(/, looked at$/)
    expect(laid[0]!.name).toBe('Look at the reading at 0 s')
  })

  it('is one stop of the Tab key however many readings it has: the first, until a reading is looked at', () => {
    expect(points(graphCard).map((one) => one.tab)).toEqual([0, ...graph.readings.slice(1).map(() => -1)])
    const long = points(card(bench(workCup(m, fresh(), ONE, { stir: false }), ONE).part, BENCH_TEXT.graph))
    expect(long.length).toBeGreaterThan(20)
    expect(long.filter((one) => one.tab === 0)).toHaveLength(1)
  })

  it('has under it two buttons a finger tall that step one reading back and one on, for a run whose columns are narrower than a finger', () => {
    const names = buttons(graphCard).map((one) => one.name)
    expect(names.slice(-2)).toEqual([`← ${PAGE_TEXT.earlier}`, `${PAGE_TEXT.later} →`])
    for (const name of names.slice(-2)) {
      expect(button(graphCard, name)!.tag).toContain('min-h-11')
      expect(button(graphCard, name)!.tag).not.toContain('aria-disabled')
    }
    expect(graphCard).toContain(`<span aria-hidden="true">←</span> ${PAGE_TEXT.earlier}`)
  })

  it('shows no reading in words until one is looked at: no callout, no ring, and the graph in words behind a disclosure that is closed', () => {
    expect(graphCard).not.toContain('data-callout')
    expect(graphCard).not.toContain('data-ring')
    expect(graphCard).toContain(`<details><summary class="w-fit cursor-pointer rounded-sm text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">${PAGE_TEXT.inWords}</summary><div class="mt-2 grid gap-2"><p class="max-w-prose">${describeGraph(m, graph)}</p></div></details>`)
    // Outside that disclosure and the names of the axes' marks, the card holds no temperature.
    const outside = text(graphCard.replace(/<details>.*?<\/details>/gs, '').replace(/<svg.*?<\/svg>/gs, ''))
    expect(outside).not.toMatch(/\d °C|\d\.\d/)
    // For a screen reader, a line of its own says what a look shows; it is empty until then.
    expect(part).toContain('<div class="sr-only"><p role="status"></p></div>')
  })
})

describe('the notebook', () => {
  const notebook = (state: CalorimetryState, part: PartId = ONE) => card(bench(state, part).part, BENCH_TEXT.notebook)

  it('comes with the change, closed, and says in one sentence what opens it; the calculator is offered from then', () => {
    const started = run(m, fresh(), [{ type: 'startLogger', part: ONE }])
    expect(cards(bench(started, ONE).part)).not.toContain(BENCH_TEXT.notebook)
    const changed = run(m, started, [{ type: 'startChange', part: ONE }])
    expect(cards(bench(changed, ONE).part)).toEqual([BENCH_TEXT.bench, BENCH_TEXT.cup, BENCH_TEXT.graph, BENCH_TEXT.notebook, PAGE_TEXT.outcome])
    const closed = notebook(changed)
    expect(closed).toContain(`<p class="max-w-prose ${ROLE.held}">${blockedText(ONE, 'not-turned')}</p>`)
    expect(closed).not.toContain('<ol')
    expect(closed).not.toContain('<input')
    expect(buttons(closed).map((one) => one.name)).toEqual(['Calculator'])
    expect(button(closed, 'Calculator')!.tag).toContain('lab-tap')
  })

  it('once the curve has turned back is a numbered list of the entries in the order they are worked out: the first to be made, and the others as their names alone', () => {
    const open = notebook(looked(ONE))
    const list = entries(open)
    expect(list).toHaveLength(FIELDS[ONE].length)
    const { graph } = view(looked(ONE), ONE)
    expect(list.slice(1).map((entry) => entry)).toEqual(FIELDS[ONE].slice(1).map((field) => `<p class="text-muted-foreground">${escaped(fieldLabel(ONE, field, graph))}</p>`))
    expect(count(open, /<input/g)).toBe(1)
    expect(fieldLabel(ONE, 'extreme', graph)).toBe('Highest temperature reached, in °C')
    expect(fieldLabel(TWO, 'extreme', view(looked(TWO), TWO).graph)).toBe('Lowest temperature reached, in °C')
    expect(entries(notebook(looked(THREE), THREE))).toHaveLength(FIELDS[THREE].length)
  })

  it('keeps the first entry closed until a reading before the change has been looked at, and the second until the highest or lowest has: the reason is under the field and is its description, and the button stays focusable', () => {
    const waiting = entries(notebook(worked(ONE)))[0]!
    expect(waiting).toMatch(/<input[^>]* disabled=""/)
    const [, noteId] = /<input[^>]*aria-describedby="([^"]+)"/.exec(waiting)!
    expect(waiting).toContain(`<div id="${noteId}"><p class="${ROLE.held}">${blockedText(ONE, 'not-looked', 'start')}</p></div>`)
    expect(waiting).toMatch(new RegExp(`<button type="submit"[^>]*aria-disabled="true" aria-describedby="${noteId}"[^>]*>${PAGE_TEXT.enter}</button>`))
    // The starting temperature made with only its own look: the second waits for its look.
    const state = worked(ONE)
    const [startLook] = looks(m, state, ONE)
    const second = entries(notebook(run(m, state, [startLook!, entryActions(ONE, worksheetValues(m, state, ONE))[0]!])))[1]!
    expect(second).toContain(`<p class="${ROLE.held}">${blockedText(ONE, 'not-looked', 'extreme')}</p>`)
    expect(blockedText(ONE, 'not-looked', 'extreme')).toMatch(/^Look at the reading furthest from the start first/)
  })

  it('draws the entry that waits as a labelled field a finger tall with its button, how it is written under it and, in Guided, the relation it uses in a disclosure that is closed', () => {
    const [first] = entries(notebook(looked(ONE)))
    const [, labelId, inputId] = new RegExp(`<label id="([^"]+)" for="([^"]+)" class="font-medium ${ROLE.entry}">${escaped(fieldLabel(ONE, 'start'))}</label>`).exec(first!)!
    expect(labelId).toBeTruthy()
    const [input, noteId] = new RegExp(`<input id="${inputId}" type="text" inputMode="decimal" autoComplete="off" aria-describedby="([^"]+)" class="h-11 w-28 text-base [^"]*" value=""/>`).exec(first!)!
    expect(input).not.toContain(' disabled=""')
    expect(first).toContain(`<div id="${noteId}"><p class="text-muted-foreground">${formatHelp('start')}</p></div>`)
    expect(first).toMatch(new RegExp(`<button type="submit"[^>]*class="[^"]*min-h-11[^"]*">${PAGE_TEXT.enter}</button>`))
    expect(first).toContain(`<details><summary class="w-fit cursor-pointer rounded-sm text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">${BENCH_TEXT.hint}</summary><div class="mt-2 grid gap-2"><p class="max-w-prose">${relationText(data, ONE, 'start')}</p></div></details>`)
    // Always there, and empty until the entry is judged.
    expect(first).toContain('<p role="status" class="self-center"></p>')
    // An entry that may begin with a minus sign asks for a keyboard that has one.
    expect(entries(notebook(entered(ONE, 2)))[2]).toContain('inputMode="text"')
    expect(entries(notebook(entered(ONE, 6)))[6]).toContain('inputMode="text"')
    expect(entries(notebook(entered(ONE, 3)))[3]).toContain('inputMode="decimal"')
  })

  it('shows an entry that is made in a disabled field with Change beside it, described by its label; in Guided it says beside a tick that it follows', () => {
    const state = entered(ONE, 2)
    const [first, second, third] = entries(notebook(state))
    const values = worksheetValues(m, looked(ONE), ONE)
    for (const [entry, field] of [[first, 'start'], [second, 'extreme']] as const) {
      const [, labelId] = new RegExp(`<label id="([^"]+)" for="[^"]+" class="font-medium">${escaped(fieldLabel(ONE, field, view(state, ONE).graph))}</label>`).exec(entry!)!
      expect(entry).toMatch(new RegExp(`<input[^>]* disabled=""[^>]* value="${entryText(values[field] as number)}"/>`))
      expect(entry).toMatch(new RegExp(`<button type="submit"[^>]*aria-describedby="${labelId}"[^>]*>${PAGE_TEXT.change}</button>`))
      expect(entry).toContain(`<p role="status" class="self-center"><span aria-hidden="true" class="${ROLE.done}">✓ </span>${VERDICT_TEXT.follows}</p>`)
      // Made, it says no more how it is written and holds no hint.
      expect(entry).not.toContain(formatHelp(field))
      expect(entry).not.toContain('<details')
    }
    expect(third).toMatch(/<input[^>]*value=""\/>/)
    expect(third).not.toMatch(/<input[^>]* disabled=""/)
    expect(entryText(values.start as number)).toBe('20.0')
  })

  it('says under the list, once two entries are made, that changing one empties those under it', () => {
    expect(notebook(entered(ONE, 1))).not.toContain(PAGE_TEXT.changeNote)
    expect(notebook(entered(ONE, 2))).toContain(`<p class="text-muted-foreground">${PAGE_TEXT.changeNote}</p>`)
    // The engine does empty them.
    const state = entered(ONE, 4)
    const again = run(m, state, [{ type: 'enter', part: ONE, field: 'extreme', value: view(state, ONE).worksheet[1]!.value! }])
    expect(view(again, ONE).worksheet.map((entry) => entry.value !== null)).toEqual([true, true, false, false, false, false, false])
  })

  it('asks for a choice as choice boxes, a finger tall each, with one button; no choice is made for the learner', () => {
    const direction = entries(notebook(entered(ONE, 4)))[4]!
    expect(direction).toContain(`<legend class="mb-1.5 font-medium ${ROLE.entry}">${fieldLabel(ONE, 'direction')}</legend>`)
    expect([...direction.matchAll(/<label class="flex min-h-11 [^"]*"><input type="radio" name="[^"]+" value="([^"]+)"\/>([^<]*)<\/label>/g)].map((match) => [match[1], match[2]])).toEqual([['out', DIRECTION_LABEL.out], ['in', DIRECTION_LABEL.in]])
    expect(direction).not.toContain('checked=""')
    expect(buttons(direction).map((one) => one.name)).toEqual([PAGE_TEXT.enter])
    expect(button(direction, PAGE_TEXT.enter)!.tag).toContain('aria-disabled="true"')
    expect(direction).toContain(`>${BENCH_TEXT.hint}</summary>`)
    const metal = entries(notebook(entered(THREE, 5), THREE))[5]!
    expect([...metal.matchAll(/<input type="radio" name="[^"]+" value="([^"]+)"\/>([^<]*)<\/label>/g)].map((match) => [match[1], match[2]])).toEqual(metalChoices(data).map((choice) => [choice.value, choice.label]))
    expect(metalChoices(data).map((choice) => choice.label)).toEqual(['aluminium', 'iron', 'zinc', 'tin'])
  })

  it('shows a choice that is made as its boxes disabled with the one chosen, beside Change; in Guided with a tick and that it follows, in Challenge with no word on it', () => {
    for (const mode of ['guided', 'challenge'] as const) {
      const direction = entries(notebook(entered(ONE, 5, mode)))[4]!
      expect(direction).toMatch(/<fieldset disabled=""/)
      expect([...direction.matchAll(/<input[^>]*checked=""[^>]*value="([^"]*)"/g)].map((match) => match[1])).toEqual(['out'])
      expect(buttons(direction).map((one) => one.name)).toEqual([PAGE_TEXT.change])
      expect(direction).toContain(mode === 'guided' ? `<p role="status"><span aria-hidden="true" class="${ROLE.done}">✓ </span>${VERDICT_TEXT.follows}</p>` : '<p role="status"></p>')
    }
  })

  it('in Challenge has no relation to open and says of no entry whether it follows; "Check the worksheet" is under the list, a finger tall, unavailable and focusable until every entry is made', () => {
    const open = notebook(entered(ONE, 3, 'challenge'))
    expect(open).not.toContain(BENCH_TEXT.hint)
    expect(open).not.toContain(VERDICT_TEXT.follows)
    expect(open).not.toContain('<details')
    const check = button(open, BENCH_TEXT.check)!
    expect(check.tag).toContain('aria-disabled="true"')
    expect(check.tag).toContain('min-h-11')
    expect(check.tag).not.toContain(' disabled=""')
    expect(button(notebook(entered(ONE, 7, 'challenge')), BENCH_TEXT.check)!.tag).not.toContain('aria-disabled')
    // Guided has no such button: its last entry is the check.
    expect(button(notebook(entered(ONE, 3)), BENCH_TEXT.check)).toBeUndefined()
  })

  it('in Guided marks an entry that was made in Challenge and does not follow, says what kind of slip it looks like and never the value, and leaves it to be changed', () => {
    const state = looked(TWO, 'challenge')
    const slipped = entryActions(TWO, worksheetValues(m, state, TWO, { slip: 'salt-left-out' })).slice(0, 4)
    const guided = run(m, run(m, state, slipped), [{ type: 'setMode', mode: 'guided' }])
    const heat = entries(notebook(guided, TWO))[3]!
    const verdict = view(guided, TWO).worksheet[3]!.verdict!
    expect(verdict).toEqual({ follows: false, slip: 'salt-left-out' })
    expect(heat).toContain(`<p role="status" class="self-center"><span aria-hidden="true" class="${ROLE.failed}">✕ </span>${VERDICT_TEXT.not}</p>`)
    expect(heat).toContain(`<p class="max-w-prose">${escaped(entryFeedback(TWO, 'heat', verdict))}</p>`)
    expect(buttons(heat).map((one) => one.name)).toEqual([PAGE_TEXT.change])
  })
})

describe('the shared field, as the worksheet uses it', () => {
  const field = (props: { disabled?: boolean; held?: string | null; error?: string; help?: string; tall?: boolean; signed?: boolean }) => renderToStaticMarkup(createElement(Field, { label: 'An entry', value: '', onChange: () => {}, noteId: 'note', ...props }))

  it('says how the entry is written until a refusal or a reason takes that line, and not once the field takes no typing', () => {
    expect(field({ help: 'Written so.' })).toContain('<div id="note"><p class="text-muted-foreground">Written so.</p></div>')
    expect(field({ help: 'Written so.', error: 'Refused.' })).toContain('<div id="note"><p role="alert">Refused.</p></div>')
    expect(field({ help: 'Written so.', disabled: true, held: 'Held.' })).toContain(`<div id="note"><p class="${ROLE.held}">Held.</p></div>`)
    expect(field({ help: 'Written so.', disabled: true })).toContain('<div id="note"></div>')
    expect(field({})).toContain('<div id="note"></div>')
  })

  it("is a finger tall where it is asked to be, with text a tablet's browser does not zoom in on, and is as the titration lab has it where it is not", () => {
    expect(field({ tall: true })).toMatch(/<input[^>]*inputMode="decimal"[^>]*class="h-11 w-28 text-base /)
    expect(field({})).toMatch(/<input[^>]*inputMode="decimal"[^>]*class="h-8 w-24 rounded-md /)
    expect(field({ signed: true })).toContain('inputMode="text"')
  })
})

describe('what Challenge is shown before a run of the part counts', () => {
  it('is nothing of the figure a result is held to, of which metal the piece is, of the notes, of a relation or of whether an entry follows, at any step short of the check', () => {
    for (const part of PART_IDS) {
      const start = looked(part, 'challenge')
      const actions = entryActions(part, worksheetValues(m, start, part))
      const steps = [fresh('challenge'), run(m, fresh('challenge'), [{ type: 'startLogger', part }]), worked(part, 'challenge'), start, ...actions.map((_, made) => run(m, start, actions.slice(0, made + 1)))]
      for (const state of steps) {
        const { html } = bench(state, part)
        for (const sentence of kept(part)) expect(html, sentence).not.toContain(escaped(sentence))
        expect(html).not.toContain(`>${BENCH_TEXT.notes}</summary>`)
        expect(html).not.toContain(BENCH_TEXT.hint)
        expect(html).not.toContain(VERDICT_TEXT.follows)
        expect(html).not.toContain(VERDICT_TEXT.not)
        expect(html).not.toContain(PART_AIM[part])
        expect(view(state, part).expected).toBeNull()
      }
    }
    // The metal the piece is, by name: on the bench only in the table and the tiles of all four, and in the choices.
    const state = entered(THREE, 5, 'challenge')
    expect(bench(state, THREE).html).not.toContain('The piece was')
  })

  it('is, after a check that does not count, why, and which entries do not follow, and still nothing of the figure or of how far off the result was', () => {
    for (const part of PART_IDS) {
      const state = wholeRun(m, fresh('challenge'), part, { lid: false })
      const { html, part: shown } = bench(state, part)
      const { outcome } = view(state, part)
      if (outcome.state !== 'does-not-count') throw new Error('a run with the lid off does not count')
      expect(outcome.percentOff).toBeNull()
      expect(card(shown, PAGE_TEXT.outcome)).toContain(`<p><span aria-hidden="true" class="${ROLE.failed}">✕ </span>${escaped(outcomeText(m, outcome))}</p>`)
      expect(outcomeText(m, outcome)).toContain(reasonText(m, 'lid-off'))
      for (const sentence of kept(part)) expect(html, sentence).not.toContain(escaped(sentence))
      expect(html).not.toContain(`>${BENCH_TEXT.notes}</summary>`)
      expect(html).not.toMatch(/% (under|over) the figure/)
    }
  })
})

describe('a run whose worksheet is checked', () => {
  const state = wholeRun(m, fresh(), ONE)
  const { part } = bench(state, ONE)
  const outcome = card(part, PAGE_TEXT.outcome)
  const expected = view(state, ONE).expected!

  it('says in a card of its own, which can take focus, that the run counts and how far its result is from the figure the lab holds, beside a tick', () => {
    expect(cards(part)).toEqual([BENCH_TEXT.bench, BENCH_TEXT.cup, BENCH_TEXT.graph, BENCH_TEXT.notebook, PAGE_TEXT.outcome])
    expect(outcome).toContain(`<div tabindex="-1" class="grid max-w-prose gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"><p><span aria-hidden="true" class="${ROLE.done}">✓ </span>${escaped(outcomeText(m, view(state, ONE).outcome))}</p></div>`)
    expect(outcomeText(m, view(state, ONE).outcome)).toMatch(/^This run counts: .* Your result is 1\.6% under that figure\.$/)
    expect(head(part)).toContain(`<p role="status" class="text-sm font-medium"><span aria-hidden="true" class="${ROLE.done}">✓ </span>${BENCH_TEXT.done}</p>`)
  })

  it('says of a run that is still open that it is not checked yet, once there is a run to leave behind', () => {
    const open = card(bench(worked(ONE), ONE).part, PAGE_TEXT.outcome)
    expect(open).toContain(`<p class="text-muted-foreground">${RECORD_TEXT.open}</p>`)
    expect(head(bench(worked(ONE), ONE).part)).toContain('<p role="status" class="text-sm font-medium"></p>')
  })

  it('offers "Run this part again", a finger tall, with what it does under it', () => {
    const again = button(outcome, BENCH_TEXT.runAgain)!
    expect(again.tag).toContain('min-h-11')
    expect(again.tag).not.toContain('aria-disabled')
    expect(outcome).toContain(`<p class="max-w-prose text-muted-foreground">${BENCH_TEXT.runAgainHelp}</p>`)
    expect(can(m, state, { type: 'runAgain', part: ONE })).toBeNull()
  })

  it('has the figure the result was held to and the notes on the part in a disclosure that is closed, once a run counts and not before', () => {
    const notes = /<details><summary[^>]*>Notes on this part<\/summary>(.*?)<\/details>/s.exec(outcome)![1]!
    expect(outcome).not.toContain('<details open')
    expect(notes).toContain(`<p class="font-medium">${escaped(expectedText(data, ONE, expected))}</p>`)
    for (const note of partNotes(data, ONE, expected)) expect(notes).toContain(`<p>${escaped(note)}</p>`)
    expect(expectedText(data, ONE, expected)).toBe('The figure the lab holds for this part is −57.7 kJ for each mole of water formed.')
    for (const mode of ['guided', 'challenge'] as const) {
      const failed = wholeRun(m, fresh('challenge'), ONE, { stir: false })
      const html = bench(mode === 'guided' ? run(m, failed, [{ type: 'setMode', mode }]) : failed, ONE).html
      expect(html).not.toContain(`>${BENCH_TEXT.notes}</summary>`)
      for (const sentence of kept(ONE)) expect(html).not.toContain(escaped(sentence))
    }
  })

  it("gives for part 3 which metal the piece was, the notes, and how the figure in the table was worked out under a heading of its own", () => {
    const done = wholeRun(m, fresh(), THREE)
    const was = view(done, THREE).expected!
    const notes = /<details><summary[^>]*>Notes on this part<\/summary>(.*?)<\/details>/s.exec(card(bench(done, THREE).part, PAGE_TEXT.outcome))![1]!
    const all = partNotes(data, THREE, was)
    expect(notes).toContain(`<p class="font-medium">${escaped(expectedText(data, THREE, was))}</p>`)
    expect(expectedText(data, THREE, was)).toBe('The piece was zinc, whose specific heat is 0.388 J/(g·°C).')
    for (const note of all.slice(0, -1)) expect(notes).toContain(`<p>${escaped(note)}</p>`)
    expect(notes).toContain(`<h4 class="font-medium">${BENCH_TEXT.working}</h4><p>${escaped(all.at(-1)!)}</p>`)
  })

  it('shows the worksheet to be read and not typed in: each entry as its value beside its label, which gives its unit, with whether it follows', () => {
    const notebook = card(part, BENCH_TEXT.notebook)
    expect(notebook).not.toContain('<input')
    expect(notebook).not.toContain('<form')
    expect(notebook).not.toContain(PAGE_TEXT.changeNote)
    const list = entries(notebook)
    const { worksheet, graph } = view(state, ONE)
    worksheet.forEach((entry, at) => {
      expect(list[at]).toBe(
        `<div class="grid gap-0.5"><p><span class="font-medium">${escaped(fieldLabel(ONE, entry.field, graph))}</span>: <span class="whitespace-nowrap tabular-nums ${ROLE.value}">${enteredText(data, entry.field, entry.value!)}</span><span class="ml-3 whitespace-nowrap"><span aria-hidden="true" class="${ROLE.done}">✓ </span>${VERDICT_TEXT.follows}</span></p></div>`,
      )
    })
    expect(worksheet.map((entry) => enteredText(data, entry.field, entry.value!))).toEqual(['20.0', '26.8', '6.8', '2840', 'gave heat out', '0.0500', '−56.8'])
  })

  it('marks in a checked worksheet each entry that does not follow, with what kind of slip it looks like and never the value', () => {
    const slipped = wholeRun(m, fresh('challenge'), ONE, { slip: 'no-sign' })
    const list = entries(card(bench(slipped, ONE).part, BENCH_TEXT.notebook))
    const verdict = view(slipped, ONE).worksheet[6]!.verdict!
    expect(verdict).toEqual({ follows: false, slip: 'wrong-sign' })
    expect(list[6]).toContain(`<span aria-hidden="true" class="${ROLE.failed}">✕ </span>${VERDICT_TEXT.not}</span></p><p class="max-w-prose">${escaped(entryFeedback(ONE, 'perMole', verdict))}</p>`)
    expect(list.slice(0, 6).every((entry) => entry.includes(`✓ </span>${VERDICT_TEXT.follows}`))).toBe(true)
    expect(entryFeedback(ONE, 'perMole', verdict)).not.toMatch(/\d/)
  })
})

describe('a lab that is complete', () => {
  const state = allDone()

  it('says on each part that it is done, and once, at its head, why nothing more is taken', () => {
    expect(state.status).toBe('completed')
    for (const id of PART_IDS) {
      const { part } = bench(state, id)
      expect(head(part)).toContain(`✓ </span>${BENCH_TEXT.done}</p><p class="text-sm ${ROLE.held}">${blockedText(id, 'lab-completed')}</p>`)
      expect(count(part, new RegExp(blockedText(id, 'lab-completed').replaceAll('.', '\\.'), 'g'))).toBe(1)
    }
  })

  it('leaves every button of the cup, Run on and "Run this part again" focusable and unavailable, the graph to be looked at, and the worksheet to be read', () => {
    const { part } = bench(state, TWO)
    for (const name of [BENCH_TEXT.lid, BENCH_TEXT.stir, BENCH_TEXT.logger, CHANGE_LABEL[TWO], BENCH_TEXT.runOn, BENCH_TEXT.runAgain]) {
      expect(button(part, name)!.tag, name).toContain('aria-disabled="true"')
      expect(button(part, name)!.tag, name).not.toContain(' disabled=""')
    }
    expect(points(card(part, BENCH_TEXT.graph)).length).toBe(view(state, TWO).graph.readings.length)
    expect(card(part, BENCH_TEXT.notebook)).not.toContain('<input')
  })
})

describe('the record', () => {
  const record = (state: CalorimetryState) => draw(createElement(CalorimetryRecord, { data, m, state }))
  // Part 2 run twice in Challenge: without the lid, and then carefully.
  const state = wholeRun(m, run(m, wholeRun(m, fresh('challenge'), TWO, { lid: false }), [{ type: 'runAgain', part: TWO }]), TWO)
  const html = record(state)
  const groups = [...html.matchAll(/<tbody>(.*?)<\/tbody>/gs)].map((match) => match[1]!)

  it('is one table with a caption and two headed columns, a group of rows for each part headed by the part with how far it has come, in a region that the keyboard can scroll', () => {
    expect(html).toContain(`<div role="region" aria-label="${RECORD_TEXT.region}" tabindex="0"`)
    expect(count(html, /<table/g)).toBe(1)
    expect(html).toContain(`<caption class="mb-2 text-left font-medium">${RECORD_TEXT.caption}</caption>`)
    expect([...html.matchAll(/<th scope="col"[^>]*>(.*?)<\/th>/g)].map((match) => match[1])).toEqual([RECORD_TEXT.part, RECORD_TEXT.result])
    expect(groups).toHaveLength(3)
    expect(groups.map((group) => read(/<tr>(.*?)<\/tr>/s.exec(group)![1]!))).toEqual([
      `|${partTitle(data, ONE)}|○|${PROGRESS_TEXT['not-started']}|`,
      `|${partTitle(data, TWO)}|✓|${PROGRESS_TEXT.done}|`,
      `|${escaped(partTitle(data, THREE))}|○|${PROGRESS_TEXT['not-started']}|`,
    ])
    expect(groups[0]).toContain('<th scope="rowgroup"')
  })

  it('lists every run of a part in order, each with how it came out in words: not checked yet, does not count, or counts beside a tick', () => {
    const rows = (group: string) => [...group.matchAll(/<tr><th scope="row"[^>]*>(.*?)<\/th><td[^>]*>(.*?)<\/td><\/tr>/g)].map((match) => [match[1], read(`<i>${match[2]}</i>`)])
    expect(rows(groups[0]!)).toEqual([[RECORD_TEXT.run(1), `|${RECORD_TEXT.open}|`]])
    expect(rows(groups[1]!)).toEqual([[RECORD_TEXT.run(1), `|${RECORD_TEXT.doesNotCount}|`], [RECORD_TEXT.run(2), `|✓|${RECORD_TEXT.counts}|`]])
    expect(groups[1]).toContain(`<span class="${ROLE.failed}">${RECORD_TEXT.doesNotCount}</span>`)
  })

  it('gives under a run what was entered, each entry beside its label, and under one that does not count why; and nothing under a run with no entry', () => {
    const [first, second] = state.parts[TWO]
    const lists = [...groups[1]!.matchAll(/<tr><td colSpan="2"[^>]*><ul[^>]*>(.*?)<\/ul><\/td><\/tr>/gs)].map((match) => [...match[1]!.matchAll(/<li[^>]*>(.*?)<\/li>/g)].map((item) => text(item[1]!)))
    expect(lists).toHaveLength(2)
    expect(lists[0]).toEqual([...FIELDS[TWO].map((field: EntryField) => escaped(`${fieldLabel(TWO, field)}: ${enteredText(data, field, first!.entries[field]!)}`)), reasonText(m, 'lid-off'), reasonText(m, 'outside-tolerance')])
    expect(lists[1]).toEqual(FIELDS[TWO].map((field: EntryField) => escaped(`${fieldLabel(TWO, field)}: ${enteredText(data, field, second!.entries[field]!)}`)))
    expect(groups[0]).not.toContain('colSpan')
    expect(lists[1]![4]).toBe('The dissolving: took heat in')
  })

  it('gives nothing of what a result is held to, and says that the lab is complete once it is, and not before', () => {
    for (const part of PART_IDS) for (const sentence of kept(part)) expect(html).not.toContain(escaped(sentence))
    expect(record(allDone())).not.toMatch(/57\.7|24\.4|0\.388 J|The piece was/)
    expect(html).not.toContain(BENCH_TEXT.complete)
    expect(record(allDone())).toContain(`<p class="font-medium"><span aria-hidden="true" class="${ROLE.done}">✓ </span>${BENCH_TEXT.complete}</p>`)
  })
})
