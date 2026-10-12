import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ACTIVITIES, FREEZING_PROGRESS } from '@/app/activities'
import { GRAPH, PLOT_EDGE, axesOf, degreeMarks, yOf } from '@/app/lab/graphGeometry'
import { NARROW_NOTICE, SHELL_TEXT } from '@/app/lab/shellText'
import { labProgress } from '@/app/lab/useLabProgress'
import { createMemoryStore, saveEntry, type KeyValueStore } from '@/app/progress/storage'
import { freezingCitations } from '@/chem-data/citations'
import { candidatesOf, freezingData as data, PART_IDS, solutesOf, type PartId } from '@/chem-data/freezing/data'
import { FREEZING_PRIMER, READ_FIRST } from '@/chem-data/freezing/primer'
import sources from '@/chem-data/sources.json'
import { FIELDS, can, createLab, freezingStateSchema, modelFrom, partView, reduce, warnings, type Action, type FreezingState, type Mode } from '@/engine/freezing'
import { entryActions, looks, run, wholeLab, wholeRun, workCup, worksheetText } from '@/engine/freezing/testkit'
import { FreezingBench, openingPart } from './FreezingBench'
import { FreezingPage } from './FreezingPage'
import { FreezingRecord } from './FreezingRecord'
import { degreeText, scaleOf } from './Graph'
import {
  BENCH_TEXT,
  MODE_TEXT,
  PAGE_TEXT,
  PART_AIM,
  PROGRESS_TEXT,
  RECORD_TEXT,
  SOURCES_TEXT,
  VERDICT_TEXT,
  addLabel,
  benchLines,
  blockedText,
  candidateLines,
  constantText,
  cupText,
  describeGraph,
  enteredText,
  expectedText,
  fieldLabel,
  foldedText,
  formatHelp,
  hazardsHeading,
  liquidChoices,
  notebookLines,
  outcomeText,
  partNotes,
  partTitle,
  pointLabel,
  reasonText,
  recordReasonText,
  relationText,
  soluteChoices,
  temperatureText,
  wantedText,
} from './messages'

// The freezing point depression lab's page as markup, on a store the test holds. AppStateProvider builds its store
// from the browser and the media hook has no value on a server, so both are given directly. What a press does (a
// button of the cup, Guided's warning, Run on, a look at a reading, an entry, the check, Run this part again) is
// state, and is checked in a browser: a markup render mounts the page and no more.
const app = vi.hoisted(() => ({ store: undefined as unknown as KeyValueStore, persistent: true, wide: true }))
vi.mock('@/app/AppState', () => ({ useAppState: () => ({ store: app.store, persistent: app.persistent, reducedMotion: false }) }))
vi.mock('@/app/useMediaQuery', () => ({ useMediaQuery: () => app.wide }))

const freezing = ACTIVITIES[10]
const m = modelFrom(data)
const SCHEMA = freezingStateSchema(m)
const draw = (element: ReactElement) => renderToStaticMarkup(createElement(MemoryRouter, null, element))
const escaped = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;')
const count = (html: string, pattern: RegExp) => [...html.matchAll(pattern)].length
const text = (html: string) => html.replace(/<[^>]+>/g, '')
const selectedTab = (html: string) => [...html.matchAll(/<button[^>]*role="tab"[^>]*>([^<]*)<\/button>/g)].filter((match) => match[0].includes('aria-selected="true"')).map((match) => match[1])
/** Every button, by its opening tag and its text. */
const buttons = (html: string) => [...html.matchAll(/<button([^>]*)>(.*?)<\/button>/gs)].map(([, tag, body]) => ({ tag: tag!, name: text(body!) }))
const button = (html: string, name: string) => buttons(html).find((one) => one.name === name)

const [ONE, TWO, THREE] = PART_IDS
const fresh = (mode: Mode = 'guided', seed = 1) => createLab(seed, mode)
/** A careful cup worked to a weighed solution (in part 1, to a level stretch); then the looks that open the temperatures. */
const worked = (part: PartId, mode?: Mode, seed?: number) => workCup(m, fresh(mode, seed), part)
const looked = (part: PartId, mode?: Mode) => {
  const state = worked(part, mode)
  return run(m, state, looks(m, state, part))
}
/** The first `made` entries of a careful notebook. */
const entered = (part: PartId, made: number, mode?: Mode) => {
  const state = looked(part, mode)
  return run(m, state, entryActions(part, worksheetText(m, state, part)).slice(0, made))
}
const view = (state: FreezingState, part: PartId) => partView(m, state, part)

/** The Lab tab's bench on a state, opened at a part, and that part's own markup: the one that is not hidden. */
function bench(state: FreezingState, at: PartId = ONE, reducedMotion = false) {
  const html = draw(
    createElement(FreezingBench, { data, m, sources, state, reducedMotion, can: (action: Action) => can(m, state, action), warn: (action: Action) => warnings(m, state, action), act: (action: Action) => void reduce(m, state, action), opensAt: PART_IDS.indexOf(at) }),
  )
  const shown = html
    .split(/(?=<div(?: hidden="")?><section aria-labelledby=)/)
    .slice(1)
    .filter((one) => !one.startsWith('<div hidden'))
  return { html, part: shown[0]!.split('<div class="flex flex-wrap justify-between gap-2">')[0]! }
}
const CARD = /(?=<section aria-labelledby="[^"]+" class="grid min-w-0 justify-items-start)/
/** The cards of a part, by their h3; one of them; and what stands over the first. */
const cards = (part: string) => [...part.matchAll(/<h3[^>]*>(.*?)<\/h3>/g)].map((match) => match[1])
const card = (part: string, heading: string) => part.split(CARD).find((one) => one.includes(`>${heading}</h3>`))!
const head = (part: string) => part.split(CARD)[0]!
const cup = (state: FreezingState, part: PartId, reducedMotion = false) => /<svg viewBox="0 0 280 196" aria-hidden="true".*?<\/svg>/s.exec(bench(state, part, reducedMotion).part)![0]
const cubes = (svg: string, group: string) => count(new RegExp(`<g data-${group}="[^"]*">(.*?)</g>`, 's').exec(svg)?.[1] ?? '', /<rect /g)

beforeEach(() => {
  app.store = createMemoryStore()
  app.persistent = true
  app.wide = true
})

describe('the freezing point depression page', () => {
  it("with nothing stored opens on the Primer tab with its nine cards, five of them marked to read first, the mode choice in this lab's own words, and Start; and stores nothing", () => {
    const html = draw(createElement(FreezingPage))
    expect(html).toContain('>Freezing point depression</h1>')
    expect(selectedTab(html)).toEqual(['Primer'])
    expect(FREEZING_PRIMER).toHaveLength(9)
    for (const section of FREEZING_PRIMER) expect(html).toContain(`>${escaped(section.heading)}<`)
    expect(READ_FIRST).toHaveLength(5)
    // In the list, on each of the five; and on the card shown, which is the first of them.
    expect(count(html, />Read first<\/span>/g)).toBe(READ_FIRST.length + 1)
    expect(html).toContain(escaped(MODE_TEXT.guided))
    expect(html).toContain(escaped(MODE_TEXT.challenge))
    expect(button(html, SHELL_TEXT.start)).toBeDefined()
    expect(app.store.length).toBe(0)
  })

  it('with a lab stored opens on the Lab tab, on the part the learner was in the middle of, with its cup, its graph and its entries as stored; the Record tab holds the record', () => {
    const state = entered(TWO, 3)
    labProgress(app.store, freezing, SCHEMA).save(state)
    const html = draw(createElement(FreezingPage))
    expect(selectedTab(html)).toEqual(['Lab'])
    expect(html).toContain(`>${escaped(partTitle(data, TWO))}</h2>`)
    expect(html).toContain(escaped(cupText(data, TWO, view(state, TWO), view(state, TWO).graph.readings.length)))
    expect(html).toContain(`value="${enteredText(data, 'fall', view(state, TWO).worksheet[2]!.value!)}"`)
    expect(html).toContain(escaped(RECORD_TEXT.caption))
    expect(button(html, SHELL_TEXT.restart)).toBeDefined()
    expect(labProgress(app.store, freezing, SCHEMA).load()).toEqual(state)
  })

  it('loads and saves with the entry and the version the lab is pinned to', () => {
    expect({ entry: freezing.entry, version: freezing.version }).toEqual(FREEZING_PROGRESS)
    expect(freezing).toMatchObject({ title: 'Freezing point depression', to: '/lab/freezing-point-depression', kind: 'Lab' })
  })

  it('sets aside a stored record that does not fit, says so, and starts fresh', () => {
    saveEntry(app.store, freezing.entry, freezing.version, { ...fresh(), status: 'completed' })
    const html = draw(createElement(FreezingPage))
    expect(html).toContain(escaped(SHELL_TEXT.setAside))
    expect(selectedTab(html)).toEqual([SHELL_TEXT.tabs.primer])
  })

  it('in a narrow window shows the notice on the Lab tab in place of the parts', () => {
    app.wide = false
    labProgress(app.store, freezing, SCHEMA).save(worked(ONE))
    const html = draw(createElement(FreezingPage))
    expect(text(html)).toContain(NARROW_NOTICE.title)
    expect(html).not.toContain(escaped(BENCH_TEXT.runOn))
  })

  it('opens on the first part begun and not done; and once every part is done, on part 3 where a new run of it is under way', () => {
    const views = (state: FreezingState) => PART_IDS.map((part) => view(state, part))
    expect(openingPart(views(fresh()))).toBe(0)
    expect(openingPart(views(worked(TWO)))).toBe(1)
    const complete = wholeLab(m, fresh())
    expect(complete.status).toBe('completed')
    expect(openingPart(views(complete))).toBe(0)
    const again = run(m, complete, [{ type: 'runAgain', part: THREE }, { type: 'chooseSolute', part: THREE, solute: 'kcl' }])
    expect(openingPart(views(again))).toBe(2)
  })
})

describe('the list of parts and a part\'s head', () => {
  it('lists the three parts, each with how far it has come in words beside a mark, one at a time', () => {
    const { html } = bench(worked(TWO), TWO)
    expect(html).toContain(`aria-label="${PAGE_TEXT.list}"`)
    for (const part of data.parts) expect(html).toContain(escaped(part.name))
    expect(html).toContain(PROGRESS_TEXT.cup)
    expect(html).toContain(PROGRESS_TEXT['not-started'])
    expect(count(html, /<h2 /g)).toBe(1)
  })

  it('says what the part finds in both modes, with no figure, and what part 3 still wants', () => {
    for (const mode of ['guided', 'challenge'] as const) {
      for (const part of PART_IDS) expect(head(bench(fresh(mode), part).part)).toContain(escaped(PART_AIM[part]))
    }
    expect(head(bench(fresh(), THREE).part)).toContain(escaped(wantedText({ molecule: true, salt: true })))
    expect(head(bench(wholeRun(m, fresh(), THREE), THREE).part)).toContain(escaped(wantedText({ molecule: false, salt: true })))
    expect(head(bench(fresh(), ONE).part)).not.toContain('two runs')
  })
})

describe('the bench', () => {
  it('lists what is used, with what the balance reads as each reading is made', () => {
    for (const [part, state] of [[ONE, fresh()], [TWO, fresh()], [TWO, worked(TWO)], [THREE, worked(THREE)]] as const) {
      const html = card(bench(state, part).part, BENCH_TEXT.bench)
      for (const line of benchLines(data, part, view(state, part))) expect(html).toContain(`<li>${escaped(line)}</li>`)
    }
    expect(benchLines(data, TWO, view(worked(TWO), TWO)).join(' ')).toMatch(/the balance reads \d+\.\d\d g.*the balance reads \d+\.\d\d g/)
  })

  it('gives parts 2 and 3 the constant and the table of molar masses that the notebook says again, and part 1 neither', () => {
    const two = card(bench(fresh(), TWO).part, BENCH_TEXT.bench)
    expect(two).toContain(`${BENCH_TEXT.constant}: `)
    expect(two).toContain(escaped(constantText(data)))
    expect(two).toContain(`>${BENCH_TEXT.candidates}</caption>`)
    for (const liquid of candidatesOf(data)) expect(two).toContain(`${liquid.molarMass.value.toFixed(2)} ${liquid.molarMass.unit}`)
    const three = card(bench(fresh(), THREE).part, BENCH_TEXT.bench)
    expect(three).toContain(`>${BENCH_TEXT.solutes}</caption>`)
    for (const solute of solutesOf(data)) expect(three).toContain(`${solute.molarMass.value.toFixed(2)} ${solute.molarMass.unit}`)
    const one = card(bench(fresh(), ONE).part, BENCH_TEXT.bench)
    expect(one).not.toContain('<table')
    expect(one).not.toContain(BENCH_TEXT.constant)
  })

  it('shows the hazards of all three liquids, closed, until the unknown is named by a run that counts, and then of the one it was', () => {
    const before = card(bench(worked(TWO), TWO).part, BENCH_TEXT.bench)
    expect(before).toContain(escaped(hazardsHeading(data, null)))
    for (const liquid of candidatesOf(data)) expect(before).toContain(`role="group" aria-label="${escaped(liquid.name)}"`)
    expect(before).not.toContain('<details open')
    const done = wholeRun(m, fresh(), TWO)
    const expected = view(done, TWO).expected!
    if (expected.kind !== 'liquid') throw new Error('part 2 is held to a liquid')
    const after = card(bench(done, TWO).part, BENCH_TEXT.bench)
    expect(after).toContain(escaped(hazardsHeading(data, expected.liquidId)))
    expect(count(after, /role="group" aria-label=/g)).toBe(1)
    // The table keeps all three.
    expect(count(after, /<tr>/g)).toBe(3)
  })

  it('offers part 3 its four solutes as buttons a finger tall, the one chosen pressed and ticked, with the hazards of all four until one is chosen and of that one after', () => {
    const open = card(bench(fresh(), THREE).part, BENCH_TEXT.bench)
    expect(open).toContain(`>${BENCH_TEXT.choose}</p>`)
    for (const choice of soluteChoices(data)) {
      expect(button(open, choice.label)!.tag).toContain('aria-pressed="false"')
      expect(button(open, choice.label)!.tag).toContain('min-h-11')
    }
    expect(count(open, /role="group" aria-label="[^"]+" class="grid content-start/g)).toBe(4)
    const chosen = card(bench(run(m, fresh(), [{ type: 'chooseSolute', part: THREE, solute: 'nacl' }]), THREE).part, BENCH_TEXT.bench)
    const label = soluteChoices(data).find((choice) => choice.value === 'nacl')!.label
    expect(button(chosen, `✓ ${label}`)!.tag).toContain('aria-pressed="true"')
    expect(count(chosen, /aria-pressed="true"/g)).toBe(1)
    expect(count(chosen, /role="group" aria-label="[^"]+" class="grid content-start/g)).toBe(1)
    // Once the solute is in, the choice stays to be read: focusable, and unavailable.
    const inCup = card(bench(worked(THREE), THREE).part, BENCH_TEXT.bench)
    expect(count(inCup, /aria-disabled="true"/g)).toBe(4)
  })
})

describe('the cup', () => {
  const filled = run(m, fresh(), [{ type: 'fill', part: TWO }])
  const lidOff = (presses: number) => workCup(m, fresh('challenge'), TWO, { lid: false, before: 3, after: presses, strain: false })

  it('is drawn, hidden from a screen reader, with its state in words in a status line beside it', () => {
    for (const state of [fresh(), filled, worked(TWO)]) {
      const html = card(bench(state, TWO).part, BENCH_TEXT.cup)
      expect(html).toContain('<svg viewBox="0 0 280 196" aria-hidden="true"')
      expect(html).toContain(`<p role="status" class="max-w-prose flex-1 basis-48 font-medium">${escaped(cupText(data, TWO, view(state, TWO), view(state, TWO).graph.readings.length))}</p>`)
    }
  })

  it('shows no water and no ice before the cup is filled, and then the ice by how many cubes there are: six while there is plenty, two when a little is left, none when none is', () => {
    expect(cup(fresh(), TWO)).not.toContain('data-ice')
    expect(view(filled, TWO).cup.ice).toBe('plenty')
    expect(cubes(cup(filled, TWO), 'ice')).toBe(6)
    const states = Array.from({ length: 12 }, (_, presses) => lidOff(presses + 1))
    const little = states.find((state) => view(state, TWO).cup.ice === 'little')!
    const none = states.find((state) => view(state, TWO).cup.ice === 'none')!
    expect(cup(little, TWO)).toContain('data-ice="little"')
    expect(cubes(cup(little, TWO), 'ice')).toBe(2)
    expect(cup(none, TWO)).toContain('data-ice="none"')
    expect(cubes(cup(none, TWO), 'ice')).toBe(0)
    // The three are told apart with every colour taken away: by the count, and in the words beside the drawing.
    for (const state of [filled, little, none]) expect(card(bench(state, TWO).part, BENCH_TEXT.cup)).toContain(escaped(cupText(data, TWO, view(state, TWO), view(state, TWO).graph.readings.length)))
    expect(new Set([filled, little, none].map((state) => cupText(data, TWO, view(state, TWO), 0))).size).toBe(3)
  })

  it('shows the lid on the cup or beside it, the marks of the stirrer while it is going, the logger running, and the strainer on the second cup from the start', () => {
    expect(cup(filled, TWO)).toContain('data-lid="off"')
    expect(cup(filled, TWO)).not.toContain('data-stirring')
    expect(cup(filled, TWO)).not.toContain('data-logging')
    const going = cup(worked(ONE), ONE)
    for (const mark of ['data-lid="on"', 'data-stirring', 'data-logging', '<g class="cal-stir">']) expect(going).toContain(mark)
    expect(cup(worked(ONE), ONE, true)).not.toContain('cal-stir')
    expect(cup(fresh(), ONE)).toContain('stroke-dasharray="2 2.5"')
  })

  it('once it is strained is empty, its lid beside it, with the ice that was left in the strainer and the solution in the second cup', () => {
    const before = cup(run(m, fresh(), [{ type: 'fill', part: TWO }]), TWO)
    expect(before).not.toContain('data-held')
    expect(before).not.toContain('data-solution')
    const strained = cup(worked(TWO), TWO)
    expect(strained).not.toContain('data-ice')
    // Poured out, its lid lies on the bench again.
    expect(strained).toContain('data-lid="off"')
    expect(strained).toContain('data-solution')
    expect(cubes(strained, 'held')).toBe(5)
    const unstrained = cup(workCup(m, fresh('challenge'), TWO, { strain: false }), TWO)
    expect(unstrained).toContain('data-ice="plenty"')
    expect(unstrained).not.toContain('data-solution')
  })

  it('offers its steps a finger tall, each ticked once taken, with the one that adds the solute in parts 2 and 3 and not in part 1', () => {
    const one = card(bench(fresh(), ONE).part, BENCH_TEXT.cup)
    expect(buttons(one).map((b) => b.name)).toEqual([BENCH_TEXT.fill, BENCH_TEXT.lid, BENCH_TEXT.stir, BENCH_TEXT.logger])
    for (const b of buttons(one)) expect(b.tag).toContain('min-h-11')
    // A step that waits for another stays focusable and says so when pressed.
    expect(button(one, BENCH_TEXT.lid)!.tag).toContain('aria-disabled="true"')
    expect(button(one, BENCH_TEXT.lid)!.tag).not.toMatch(/ disabled(=|$| )/)
    const two = card(bench(worked(TWO), TWO).part, BENCH_TEXT.cup)
    expect(buttons(two).map((b) => b.name)).toEqual([BENCH_TEXT.fill, BENCH_TEXT.lid, BENCH_TEXT.stir, BENCH_TEXT.logger, addLabel(data, TWO, view(worked(TWO), TWO).bench)].map((name) => `✓ ${name}`))
  })
})

describe('the graph', () => {
  const state = worked(TWO)
  const graph = view(state, TWO).graph
  const html = card(bench(state, TWO).part, BENCH_TEXT.graph)

  it('comes with the logger, with Run on over the picture, a finger tall, beside what one press does', () => {
    expect(cards(bench(fresh(), TWO).part)).toEqual([BENCH_TEXT.bench, BENCH_TEXT.cup])
    const started = card(bench(run(m, fresh(), [{ type: 'fill', part: TWO }, { type: 'startLogger', part: TWO }]), TWO).part, BENCH_TEXT.graph)
    expect(button(started, BENCH_TEXT.runOn)!.tag).toContain('min-h-11')
    expect(started).toContain(escaped(BENCH_TEXT.runOnHelp(m)))
    expect(started.indexOf(BENCH_TEXT.runOn)).toBeLessThan(started.indexOf('<svg viewBox="0 0 480 280"'))
  })

  it('is a picture named for what it is, described by the line that says how it is looked at, with a real button over each reading', () => {
    expect(html).toContain(`role="img" aria-label="${escaped(PAGE_TEXT.graphPicture)}" aria-describedby=`)
    expect(html).toContain(escaped(BENCH_TEXT.explore))
    expect(html).toContain(escaped(PAGE_TEXT.arrows))
    graph.readings.forEach((_, step) => expect(html).toContain(`aria-label="${pointLabel(m, step, graph.looked.includes(step))}"`))
    expect(count(html, /tabindex="0" aria-label="Look at/g)).toBe(1)
    for (const name of [PAGE_TEXT.earlier, PAGE_TEXT.later]) expect(html).toContain(name)
  })

  it('marks where the solute went in with a dashed line and where the cup was strained with a dotted one, each just after its reading, and says which is which in the key', () => {
    expect(count(html, /<line data-change=""/g)).toBe(2)
    expect(html).toMatch(/<line data-change=""[^>]*stroke-dasharray="5 4"/)
    expect(html).toMatch(/<line data-change=""[^>]*stroke-dasharray="1.5 3.5"/)
    expect(html).toContain(PAGE_TEXT.soluteMark)
    expect(html).toContain(PAGE_TEXT.endMark)
    const before = card(bench(workCup(m, fresh(), ONE), ONE).part, BENCH_TEXT.graph)
    expect(before).not.toContain('data-change')
    expect(before).not.toContain(PAGE_TEXT.soluteMark)
  })

  it('is scaled so that a level stretch is drawn level and a fall as a fall: over seeds 1 to 40 the fall when the solute goes in is 30 units of the picture or more, and the three readings of each level stretch lie within one unit', () => {
    for (let seed = 1; seed <= 40; seed++) {
      for (const part of [TWO, THREE]) {
        const { readings, addedAt, endedAt } = view(workCup(m, fresh('guided', seed), part, part === THREE ? { solute: solutesOf(data)[seed % 4]!.id } : {}), part).graph
        const axes = axesOf(readings, m.stepSeconds, scaleOf(readings))
        const y = (step: number) => yOf(axes, readings[step]!)
        expect(y(endedAt!) - y(addedAt!)).toBeGreaterThanOrEqual(30)
        for (const end of [addedAt!, endedAt!]) expect(Math.abs(y(end) - y(end - 2))).toBeLessThanOrEqual(1)
        // Every reading is inside the plot with room for the ring about it, and the axis has between three and ten numbered marks.
        for (const reading of readings) {
          expect(yOf(axes, reading)).toBeGreaterThanOrEqual(PLOT_EDGE.top + 8.5)
          expect(yOf(axes, reading)).toBeLessThanOrEqual(PLOT_EDGE.bottom - 8.5)
        }
        expect(degreeMarks(axes).length).toBeGreaterThanOrEqual(3)
        expect(degreeMarks(axes).length).toBeLessThanOrEqual(10)
      }
    }
    expect(GRAPH).toMatchObject({ width: 480, height: 280 })
  })

  it('keeps room for the ring about a reading however far a cup with no ice left climbs, and writes its marks in degrees with a true minus sign', () => {
    const { readings } = view(workCup(m, fresh('challenge'), TWO, { lid: false, before: 3, after: 20, strain: false }), TWO).graph
    const axes = axesOf(readings, m.stepSeconds, scaleOf(readings))
    for (const reading of readings) {
      expect(yOf(axes, reading)).toBeGreaterThanOrEqual(PLOT_EDGE.top + 8.5)
      expect(yOf(axes, reading)).toBeLessThanOrEqual(PLOT_EDGE.bottom - 8.5)
    }
    expect([degreeText(-150), degreeText(0), degreeText(50), degreeText(300)]).toEqual(['−1.5', '0', '0.5', '3'])
  })

  it('prints no reading beside the picture: no callout until a point is looked at, no temperature in any name, and the graph in words behind a disclosure that is closed', () => {
    expect(html).not.toContain('data-callout')
    expect(html).not.toContain('data-ring')
    const words = describeGraph(m, graph)
    expect(html).toContain(`>${PAGE_TEXT.inWords}</summary>`)
    expect(html).not.toContain('<details open')
    expect(html).toContain(escaped(words))
    const outside = bench(state, TWO).part.replace(/<details>.*?<\/details>/gs, '')
    expect(outside).not.toContain(escaped(words))
    for (const reading of new Set(graph.readings)) expect(outside).not.toContain(escaped(temperatureText(reading)))
  })
})

describe('straining and weighing', () => {
  it('come once the solute is in, as two steps a finger tall in a card of their own; part 1 has none', () => {
    expect(cards(bench(worked(ONE), ONE).part)).not.toContain(BENCH_TEXT.straining)
    expect(cards(bench(run(m, fresh(), [{ type: 'fill', part: TWO }, { type: 'startLogger', part: TWO }]), TWO).part)).not.toContain(BENCH_TEXT.straining)
    const html = card(bench(worked(TWO), TWO).part, BENCH_TEXT.straining)
    expect(buttons(html).map((b) => b.name)).toEqual([`✓ ${BENCH_TEXT.strain}`, `✓ ${BENCH_TEXT.weigh}`])
    for (const b of buttons(html)) expect(b.tag).toContain('min-h-11')
  })

  it('are warned of in Guided and not in Challenge: the engine names the error, and the page asks before it is made', () => {
    // A careful cup up to the solute, and one press of Run on after it: the temperature is still falling.
    const steps: Action[] = [{ type: 'fill', part: TWO }, { type: 'putLidOn', part: TWO }, { type: 'stir', part: TWO }, { type: 'startLogger', part: TWO }, ...Array.from({ length: 4 }, (): Action => ({ type: 'runOn', part: TWO })), { type: 'addSolute', part: TWO }, { type: 'runOn', part: TWO }]
    const cupOf = (mode: Mode) => run(m, fresh(mode), steps)
    expect(warnings(m, cupOf('guided'), { type: 'strain', part: TWO })).toEqual(['not-level'])
    expect(warnings(m, cupOf('guided'), { type: 'weigh', part: TWO })).toEqual(['not-strained'])
    expect(warnings(m, cupOf('challenge'), { type: 'strain', part: TWO })).toEqual([])
    expect(warnings(m, run(m, fresh(), [{ type: 'fill', part: TWO }]), { type: 'startLogger', part: TWO })).toEqual(['lid-off', 'not-stirring'])
  })
})

describe('the notebook', () => {
  it('comes once the solution is weighed, and in part 1 with the logger; the calculator is offered with it in parts 2 and 3', () => {
    const unweighed = run(m, fresh(), [{ type: 'fill', part: TWO }, { type: 'startLogger', part: TWO }])
    expect(cards(bench(unweighed, TWO).part)).not.toContain(BENCH_TEXT.notebook)
    expect(cards(bench(worked(TWO), TWO).part)).toEqual([BENCH_TEXT.bench, BENCH_TEXT.cup, BENCH_TEXT.graph, BENCH_TEXT.straining, BENCH_TEXT.notebook, PAGE_TEXT.outcome])
    expect(cards(bench(run(m, fresh(), [{ type: 'fill', part: ONE }, { type: 'startLogger', part: ONE }]), ONE).part)).toEqual([BENCH_TEXT.bench, BENCH_TEXT.cup, BENCH_TEXT.graph, BENCH_TEXT.notebook, PAGE_TEXT.outcome])
    expect(card(bench(worked(TWO), TWO).part, BENCH_TEXT.notebook)).toContain('Calculator')
    expect(card(bench(worked(ONE), ONE).part, BENCH_TEXT.notebook)).not.toContain('Calculator')
  })

  it("has at its head what the entries are worked from: the balance's two readings, the constant and the molar masses, in both modes, and nothing the bench does not show", () => {
    for (const mode of ['guided', 'challenge'] as const) {
      for (const part of [TWO, THREE]) {
        const state = worked(part, mode)
        const html = card(bench(state, part).part, BENCH_TEXT.notebook)
        const lines = notebookLines(data, part, view(state, part))
        expect(lines.length).toBe(4)
        expect(html).toContain(BENCH_TEXT.fromBench)
        for (const line of lines) expect(html).toContain(`<li>${escaped(line)}</li>`)
        expect(html.indexOf(BENCH_TEXT.fromBench)).toBeLessThan(html.indexOf('<ol '))
      }
    }
    expect(notebookLines(data, TWO, view(worked(TWO), TWO)).at(-1)).toContain(candidateLines(data).join('; '))
    expect(card(bench(worked(ONE), ONE).part, BENCH_TEXT.notebook)).not.toContain(BENCH_TEXT.fromBench)
  })

  it('is a numbered list of the entries in the order they are worked out: one waits, held until its reading has been looked at, and the others are their names alone', () => {
    const html = card(bench(worked(TWO), TWO).part, BENCH_TEXT.notebook)
    FIELDS[TWO].forEach((field) => expect(html).toContain(escaped(fieldLabel(TWO, field))))
    expect(count(html, /<input /g)).toBe(1)
    expect(html).toContain(escaped(blockedText(TWO, 'not-looked', 'water')))
    const open = card(bench(looked(TWO), TWO).part, BENCH_TEXT.notebook)
    expect(open).toContain(escaped(formatHelp('water')))
    expect(open).toContain(escaped(relationText(data, TWO, 'water')))
    expect(open).toContain(`>${BENCH_TEXT.hint}</summary>`)
    const challenge = card(bench(looked(TWO, 'challenge'), TWO).part, BENCH_TEXT.notebook)
    expect(challenge).not.toContain(BENCH_TEXT.hint)
    expect(button(challenge, BENCH_TEXT.check)!.tag).toContain('aria-disabled="true"')
  })

  it('is checked by its button in Challenge, and in Guided by its last entry: Guided has the button only for a notebook that was filled in Challenge and left unchecked when the mode was changed', () => {
    const notebook = (state: FreezingState, part: PartId) => card(bench(state, part).part, BENCH_TEXT.notebook)
    for (const part of [TWO, THREE]) {
      // Challenge has it from the first entry, and it says what is missing until every entry is made.
      expect(button(notebook(entered(part, 2, 'challenge'), part), BENCH_TEXT.check)!.tag).toContain('min-h-11')
      // Guided, part filled: no button. Its own last entry checks the notebook, and the run is then over.
      expect(button(notebook(entered(part, 7), part), BENCH_TEXT.check)).toBeUndefined()
      expect(button(notebook(entered(part, 8), part), BENCH_TEXT.check)).toBeUndefined()
      // Filled in Challenge, not checked, and the mode changed: every entry is made and none can be made again without a change, so the button is the way on.
      const full = entered(part, 8, 'challenge')
      expect(view(full, part).outcome.state).toBe('open')
      const changed = reduce(m, full, { type: 'setMode', mode: 'guided' })
      expect(can(m, changed, { type: 'check', part })).toBeNull()
      expect(button(notebook(changed, part), BENCH_TEXT.check)!.tag).toContain('min-h-11')
      expect(view(reduce(m, changed, { type: 'check', part }), part).outcome.state).toBe('counts')
    }
    // Part 1's one entry likewise.
    const one = reduce(m, entered(ONE, 1, 'challenge'), { type: 'setMode', mode: 'guided' })
    expect(button(card(bench(one, ONE).part, BENCH_TEXT.notebook), BENCH_TEXT.check)).toBeDefined()
    expect(button(card(bench(looked(ONE), ONE).part, BENCH_TEXT.notebook), BENCH_TEXT.check)).toBeUndefined()
  })

  it('shows an entry that is made in a disabled field beside Change, and in Guided says that it follows; the liquid is asked as three choice boxes with none chosen', () => {
    const html = card(bench(entered(TWO, 7), TWO).part, BENCH_TEXT.notebook)
    expect(count(html, /<input [^>]*disabled=""[^>]*type="text"|<input [^>]*type="text"[^>]*disabled=""/g)).toBe(7)
    expect(count(html, new RegExp(`>${PAGE_TEXT.change}</button>`, 'g'))).toBe(7)
    expect(html).toContain(VERDICT_TEXT.follows)
    expect(html).toContain(PAGE_TEXT.changeNote)
    expect(count(html, /<input [^>]*type="radio"/g)).toBe(3)
    expect(html).not.toContain('checked=""')
    for (const choice of liquidChoices(data)) expect(html).toContain(escaped(choice.label))
    const challenge = card(bench(entered(TWO, 7, 'challenge'), TWO).part, BENCH_TEXT.notebook)
    expect(challenge).not.toContain(VERDICT_TEXT.follows)
  })
})

describe('what is kept back until a run counts', () => {
  const liquidOf = (seed: number) => {
    const expected = view(wholeRun(m, fresh('guided', seed), TWO), TWO).expected!
    if (expected.kind !== 'liquid') throw new Error('part 2 is held to a liquid')
    return expected.liquidId
  }
  /**
   * A part's markup with every figure taken out: its pictures, the graph in words, which is the readings said
   * aloud (which was the lowest, and whether the last three were the same), and each number. What is left is the
   * words and the names.
   */
  const worded = (html: string) =>
    html
      .replace(/<svg.*?<\/svg>/gs, '')
      .replace(new RegExp(`(>${PAGE_TEXT.inWords}</summary>).*?</details>`, 's'), '$1')
      .replace(/style="[^"]*"/g, '')
      .replace(/[-−]?[\d.]+/g, '#')

  it('is which liquid the unknown is: at every step up to the naming, the page for one liquid is the page for another, word for word and name for name, in both modes', () => {
    const seeds = Array.from({ length: 12 }, (_, i) => i + 1)
    expect(new Set(seeds.map(liquidOf)).size).toBe(3)
    for (const mode of ['guided', 'challenge'] as const) {
      const pages = seeds.map((seed) => {
        let state = workCup(m, fresh(mode, seed), TWO, { before: 4, after: 4 })
        const steps = [bench(run(m, fresh(mode, seed), [{ type: 'fill', part: TWO }]), TWO).part, bench(state, TWO).part]
        state = run(m, state, looks(m, state, TWO))
        steps.push(bench(state, TWO).part)
        // Up to the molar mass: the entry after it is the naming.
        state = run(m, state, entryActions(TWO, worksheetText(m, state, TWO)).slice(0, 7))
        steps.push(bench(state, TWO).part)
        return steps.map(worded).join('\n')
      })
      expect(new Set(pages).size).toBe(1)
    }
  })

  it('is, in Challenge, the figure a result is held to, the notes, each relation and whether an entry follows, at every step short of the check and after a check that does not count', () => {
    for (const part of PART_IDS) {
      const done = wholeRun(m, fresh(), part)
      // The notes' own heading is also what the list of sources calls them, so the disclosure is looked for by its summary.
      const kept = [...expectedText(data, view(done, part).expected!), ...partNotes(data, part), `>${BENCH_TEXT.notes}</summary>`, VERDICT_TEXT.follows, VERDICT_TEXT.not, BENCH_TEXT.hint]
      let state = worked(part, 'challenge')
      const pages = [bench(state, part).part]
      state = run(m, state, looks(m, state, part))
      for (const action of entryActions(part, worksheetText(m, state, part))) {
        pages.push(bench(state, part).part)
        state = run(m, state, [action])
      }
      pages.push(bench(state, part).part)
      for (const page of pages) for (const one of kept) expect(page).not.toContain(escaped(one))
    }
    const wrong = wholeRun(m, fresh('challenge'), TWO, { slip: 'upside-down' })
    const html = bench(wrong, TWO).part
    expect(view(wrong, TWO).outcome.state).toBe('does-not-count')
    expect(html).toContain(escaped(outcomeText(TWO, view(wrong, TWO).outcome)))
    expect(html).not.toContain(`>${BENCH_TEXT.notes}</summary>`)
    expect(html).toContain(escaped(hazardsHeading(data, null)))
    expect(html).not.toContain('% under')
    expect(html).not.toContain('% over')
  })
})

describe('a run whose solution is weighed', () => {
  /** A card's one line where it is folded: its heading over a disclosure that is closed, with the line as its summary. Null for a card that is open. */
  const line = (part: string, heading: string) => new RegExp(`>${heading}</h3><div class="w-full"><details><summary[^>]*>(.*?)</summary>`, 's').exec(card(part, heading))?.[1] ?? null

  it('folds the bench, the cup and the straining, each under its one line in a disclosure that is closed, with everything it held still in it; the graph, the notebook and how the run came out stay open', () => {
    for (const mode of ['guided', 'challenge'] as const) {
      for (const part of [TWO, THREE]) {
        const state = worked(part, mode)
        const html = bench(state, part).part
        const said = foldedText(data, part, view(state, part))
        expect(line(html, BENCH_TEXT.bench), `${mode} ${part}`).toBe(escaped(said.bench))
        expect(line(html, BENCH_TEXT.cup)).toBe(escaped(said.cup))
        expect(line(html, BENCH_TEXT.straining)).toBe(escaped(said.straining))
        for (const open of [BENCH_TEXT.graph, BENCH_TEXT.notebook, PAGE_TEXT.outcome]) expect(line(html, open), open).toBeNull()
        // What each held is still there to be opened.
        for (const one of benchLines(data, part, view(state, part))) expect(card(html, BENCH_TEXT.bench)).toContain(escaped(one))
        expect(card(html, BENCH_TEXT.bench)).toContain('Hazards')
        expect(card(html, BENCH_TEXT.cup)).toContain('<svg viewBox="0 0 280 196"')
        expect(card(html, BENCH_TEXT.cup)).toContain(escaped(cupText(data, part, view(state, part), view(state, part).graph.readings.length)))
        expect(buttons(card(html, BENCH_TEXT.straining)).map((b) => b.name)).toEqual([`✓ ${BENCH_TEXT.strain}`, `✓ ${BENCH_TEXT.weigh}`])
        // The bench's figures are at the notebook's head, which is open.
        for (const one of notebookLines(data, part, view(state, part))) expect(card(html, BENCH_TEXT.notebook)).toContain(escaped(one))
      }
    }
    // To the end of the run, and in a part that is read and not worked.
    const done = wholeLab(m, fresh())
    for (const heading of [BENCH_TEXT.bench, BENCH_TEXT.cup, BENCH_TEXT.straining]) expect(line(bench(done, TWO).part, heading), heading).not.toBeNull()
  })

  it('says in the lines of a cup weighed without straining that it was not strained', () => {
    const state = workCup(m, fresh('challenge'), TWO, { strain: false })
    const html = bench(state, TWO).part
    expect(line(html, BENCH_TEXT.bench)).toMatch(/In the cup, not strained: \d+\.\d\d g\.$/)
    expect(line(html, BENCH_TEXT.cup)).toBe('Left as it was: weighed with everything in it.')
    expect(line(html, BENCH_TEXT.straining)).toMatch(/^Weighed without straining: the balance reads \d+\.\d\d g\.$/)
  })

  it('folds nothing before the solution is weighed, and nothing in part 1, which weighs nothing', () => {
    const strained = run(m, fresh(), [...(['fill', 'putLidOn', 'stir', 'startLogger', 'runOn', 'addSolute', 'runOn', 'strain'] as const).map((type): Action => ({ type, part: TWO }))])
    expect(cards(bench(strained, TWO).part)).toEqual([BENCH_TEXT.bench, BENCH_TEXT.cup, BENCH_TEXT.graph, BENCH_TEXT.straining, PAGE_TEXT.outcome])
    for (const heading of cards(bench(strained, TWO).part)) expect(line(bench(strained, TWO).part, heading!), heading).toBeNull()
    for (const state of [worked(ONE), wholeRun(m, fresh(), ONE)]) for (const heading of cards(bench(state, ONE).part)) expect(line(bench(state, ONE).part, heading!), heading).toBeNull()
  })
})

describe('a run whose notebook is checked', () => {
  it('says in a card of its own, which can take focus, that the run counts, beside a tick, with Run this part again under it', () => {
    for (const part of PART_IDS) {
      const state = wholeRun(m, fresh(), part)
      const html = card(bench(state, part).part, PAGE_TEXT.outcome)
      expect(html).toContain('tabindex="-1"')
      expect(html).toContain(`✓ </span>${escaped(outcomeText(part, view(state, part).outcome))}`)
      expect(button(html, BENCH_TEXT.runAgain)!.tag).toContain('min-h-11')
    }
    expect(card(bench(wholeRun(m, fresh(), THREE), THREE).part, PAGE_TEXT.outcome)).toContain(escaped(BENCH_TEXT.runAgainOther))
    expect(card(bench(wholeRun(m, fresh(), TWO), TWO).part, PAGE_TEXT.outcome)).toContain(escaped(BENCH_TEXT.runAgainHelp))
  })

  it('has what the result was held to, the notes and how the molar masses were worked out in a disclosure that is closed, once a run counts', () => {
    for (const part of PART_IDS) {
      const state = wholeRun(m, fresh(), part)
      const html = card(bench(state, part).part, PAGE_TEXT.outcome)
      expect(html).toContain(`>${BENCH_TEXT.notes}</summary>`)
      expect(html).not.toContain('<details open')
      for (const one of [...expectedText(data, view(state, part).expected!), ...partNotes(data, part)]) expect(html).toContain(escaped(one))
      expect(html.includes(BENCH_TEXT.working)).toBe(part !== ONE)
    }
    expect(card(bench(wholeRun(m, fresh(), TWO), TWO).part, PAGE_TEXT.outcome)).toContain(escaped(candidatesOf(data)[0]!.molarMass.working))
  })

  it('shows the notebook to be read and not typed in, and says why a run does not count', () => {
    const done = wholeRun(m, fresh(), TWO)
    expect(card(bench(done, TWO).part, BENCH_TEXT.notebook)).not.toContain('<input')
    for (const field of FIELDS[TWO]) expect(card(bench(done, TWO).part, BENCH_TEXT.notebook)).toContain(escaped(enteredText(data, field, done.parts.unknown[0]!.entries[field]!)))
    const unstrained = wholeRun(m, fresh('challenge'), TWO, { strain: false })
    expect(card(bench(unstrained, TWO).part, PAGE_TEXT.outcome)).toContain(escaped(reasonText(TWO, 'not-strained')))
  })
})

describe('a lab that is complete', () => {
  const complete = wholeLab(m, fresh())

  it('says so at its head, holds parts 1 and 2 to be read, and leaves part 3 to be worked: the other salts are still there to try', () => {
    expect(complete.status).toBe('completed')
    expect(bench(complete).html).toContain(escaped(BENCH_TEXT.complete))
    for (const part of [ONE, TWO]) {
      const html = bench(complete, part).part
      expect(head(html)).toContain(escaped(blockedText(part, 'lab-completed')))
      expect(button(html, BENCH_TEXT.runAgain)!.tag).toContain('aria-disabled="true"')
    }
    const three = bench(complete, THREE).part
    expect(head(three)).not.toContain(escaped(blockedText(THREE, 'lab-completed')))
    expect(head(three)).toContain(escaped(wantedText({ molecule: false, salt: false })))
    expect(button(three, BENCH_TEXT.runAgain)!.tag).not.toContain('aria-disabled')
    const again = run(m, complete, [{ type: 'runAgain', part: THREE }])
    for (const choice of soluteChoices(data)) expect(button(bench(again, THREE).part, choice.label)!.tag).not.toContain('aria-disabled')
  })
})

describe('the sources and the record', () => {
  it('lists a part\'s sources at its foot, closed, with what is Valence\'s own, and all three liquids whichever the unknown is', () => {
    const html = bench(worked(TWO), TWO).part
    expect(html).toContain(escaped(SOURCES_TEXT))
    const cited = freezingCitations(data, TWO, sources)
    expect(cited.length).toBeGreaterThan(0)
    for (const { source } of cited) expect(html).toContain(escaped(source.citation))
    for (const liquid of candidatesOf(data)) expect(cited.some(({ covers }) => covers.some((one) => one.startsWith(liquid.name)))).toBe(true)
  })

  it('is one table with a group of rows for each part and every run of it in order, each with how it came out, what part 3 dissolved, what was entered and why a run did not count; and nothing of what a result is held to', () => {
    const unstrained = wholeRun(m, fresh('challenge'), TWO, { strain: false })
    const state = wholeLab(m, run(m, unstrained, [{ type: 'runAgain', part: TWO }]))
    const html = draw(createElement(FreezingRecord, { data, m, state }))
    expect(html).toContain(`<caption class="mb-2 text-left font-medium">${escaped(RECORD_TEXT.caption)}</caption>`)
    expect(count(html, /<tbody>/g)).toBe(3)
    expect(count(html, new RegExp(`>${RECORD_TEXT.run(1)}<`, 'g'))).toBe(3)
    expect(count(html, new RegExp(`>${RECORD_TEXT.run(2)}<`, 'g'))).toBe(2)
    expect(html).toContain(RECORD_TEXT.doesNotCount)
    expect(html).toContain(escaped(reasonText(TWO, 'not-strained')))
    expect(count(html, new RegExp(`${RECORD_TEXT.solute}: `, 'g'))).toBe(2)
    expect(html).toContain(escaped(BENCH_TEXT.complete))
    for (const part of PART_IDS) for (const one of expectedText(data, view(state, part).expected!)) expect(html).not.toContain(escaped(one))
    expect(html).not.toContain('% under')
    expect(html).not.toContain('% over')
    expect(draw(createElement(FreezingRecord, { data, m, state: fresh() }))).toContain(RECORD_TEXT.open)
  })

  it('says in the Record of a run with an entry that does not follow that one does not, in a sentence of its own: the Lab tab\'s sends the reader to the marks of a notebook the Record does not show', () => {
    const slipped = wholeRun(m, fresh('challenge'), TWO, { slip: 'upside-down' })
    expect(view(slipped, TWO).outcome).toMatchObject({ state: 'does-not-count', reasons: ['entries-do-not-follow'] })
    const lab = card(bench(slipped, TWO).part, PAGE_TEXT.outcome)
    expect(lab).toContain(escaped(reasonText(TWO, 'entries-do-not-follow')))
    expect(lab).toMatch(/marks in the notebook/)
    const record = draw(createElement(FreezingRecord, { data, m, state: slipped }))
    expect(record).toContain(escaped(recordReasonText(TWO, 'entries-do-not-follow')))
    expect(record).not.toMatch(/notebook/i)
  })
})
