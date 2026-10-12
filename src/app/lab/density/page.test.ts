import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ACTIVITIES } from '@/app/activities'
import { labProgress } from '@/app/lab/useLabProgress'
import { createMemoryStore, type KeyValueStore } from '@/app/progress/storage'
import { routes } from '@/app/routes'
import { densityData as data, PART_IDS, unknownsOf, type PartId } from '@/chem-data/density/data'
import { DENSITY_PRIMER, READ_FIRST } from '@/chem-data/density/primer'
import sources from '@/chem-data/sources.json'
import { can, createLab, densityStateSchema, formatReading, modelFrom, partView, READ_FROM, reduce, SCALE_IDS, warnings, type Action, type DensityState, type Mode, type ScaleView } from '@/engine/density'
import { readingOf, run, takeReadings, wholeRun, workedValue } from '@/engine/density/testkit'
import { DensityBench } from './DensityBench'
import { DensityPage } from './DensityPage'
import { DensityRecord } from './DensityRecord'
import {
  BENCH_TEXT,
  EYE_TEXT,
  INSTRUMENT_NAME,
  MODE_TEXT,
  PAGE_TEXT,
  RECORD_TEXT,
  TABLE_HEADING,
  VERDICT_TEXT,
  describeCylinder,
  describeNote,
  entryFeedback,
  expectedText,
  fieldLabel,
  hazardsHeading,
  outcomeText,
  partTitle,
  readText,
  reasonText,
  relationText,
} from './messages'
import { entriesOf, openingPage, PAGES, readingsOf, sameAction, type PageId } from './pageLook'
import { BalanceDrawing, ScaleDrawing } from './ScaleDrawing'
import { along, closerGap, closerPad, closerStretch, CYLINDER_CLOSER, gapsIn, marksIn } from './scaleGeometry'

// The measurement and density lab's page as markup, on a store the test holds. AppStateProvider builds its store
// from the browser and the media hook has no value on a server, so both are given directly. What a press does (a
// closer look opened, the eye moved, a reading typed and refused, a step of the bench, Guided's warning, an entry,
// the check, Run this part again, another part or page) is state, and is checked in a browser: a markup render
// mounts the page and no more.
const app = vi.hoisted(() => ({ store: undefined as unknown as KeyValueStore, persistent: true, wide: true }))
vi.mock('@/app/AppState', () => ({ useAppState: () => ({ store: app.store, persistent: app.persistent, reducedMotion: false }) }))
vi.mock('@/app/useMediaQuery', () => ({ useMediaQuery: () => app.wide }))

const density = ACTIVITIES.find((activity) => activity.to === '/lab/measurement-and-density')!
const m = modelFrom(data)
const SCHEMA = densityStateSchema(m)
const SEEDS = Array.from({ length: 100 }, (_, i) => i + 1)
const draw = (element: ReactElement) => renderToStaticMarkup(createElement(MemoryRouter, null, element))
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replaceAll('&#x27;', "'").replaceAll('&amp;', '&').replace(/\s+/g, ' ')
const count = (html: string, pattern: RegExp) => [...html.matchAll(pattern)].length
/** The markup with every disclosure and every description kept for a screen reader taken out: what is on the page before anything is opened. */
function closed(html: string): string {
  const without = html.replace(/<details(?:(?!<details).)*?<\/details>/gs, '').replace(/<p id="[^"]*" hidden="">.*?<\/p>/gs, '')
  return without === html ? html : closed(without)
}
const fresh = (mode: Mode = 'guided', seed = 1) => createLab(seed, mode)
const view = (state: DensityState, part: PartId) => partView(m, state, part)
/** The Lab tab's bench on a state, opened at a page of a part. */
const bench = (state: DensityState, part: PartId, page: PageId) =>
  draw(createElement(DensityBench, { data, m, sources, state, can: (action: Action) => can(m, state, action), warn: (action: Action) => warnings(m, state, action), act: (action: Action) => void reduce(m, state, action), opensAt: { part, page } }))
/** The card of the page shown: from its heading to the two ways on. */
const card = (html: string) => html.slice(html.indexOf('<h3'), html.indexOf('<div class="flex flex-wrap justify-between gap-2">'))
const scale = (look: ScaleView, closer = false) => draw(createElement(ScaleDrawing, { look, closer: closer ? closerStretch(look) : undefined, name: 'a scale', describedBy: 'words' }))
/** Every scale a fresh lab's part 1 shows, with the reading a careful learner types from it. */
function scalesOf(seed: number): { view: ScaleView; reading: string }[] {
  const state = fresh('guided', seed)
  const { bench: b } = view(state, 'reading')
  const typed = (field: Parameters<typeof readingOf>[3]) => {
    const value = readingOf(m, state, 'reading', field)
    return formatReading(m, READ_FROM[field]!, typeof value === 'number' ? value : value.value)
  }
  return [
    { view: b.rulerCm!.length, reading: typed('lengthCm') },
    { view: b.rulerCm!.width, reading: typed('widthCm') },
    { view: b.rulerMm!.length, reading: typed('lengthMm') },
    { view: b.rulerMm!.width, reading: typed('widthMm') },
    { view: b.cylinder.scale!, reading: typed('firstVolume') },
    { view: b.thermometer!, reading: typed('temperature') },
  ]
}

beforeEach(() => {
  app.store = createMemoryStore()
  app.persistent = true
  app.wide = true
})

describe('the measurement and density page', () => {
  const page = () => draw(createElement(DensityPage))
  const save = (state: DensityState) => labProgress(app.store, density, SCHEMA).save(state)

  it('is at its own address, loaded when it is asked for', () => {
    const route = routes[0]!.children!.find((child) => child.path === 'lab/measurement-and-density')
    expect(route?.lazy).toBeTypeOf('function')
    expect(density).toMatchObject({ entry: 'lab:measurement-and-density', version: 1, kind: 'Lab', title: 'Measurement and density' })
  })

  it("with nothing stored opens on the Primer with its eight cards one at a time, those to read first marked, the mode choice in this lab's own words, and Start; and stores nothing", () => {
    const html = page()
    expect(html).toContain(`>${density.title}</h1>`)
    expect(DENSITY_PRIMER).toHaveLength(8)
    expect(READ_FIRST.length).toBeGreaterThan(0)
    expect(text(html)).toContain(DENSITY_PRIMER[0]!.heading)
    expect(text(html)).toContain(MODE_TEXT.guided.split(' ').slice(0, 6).join(' '))
    expect(html).toMatch(/<button[^>]*>Start[^<]*<\/button>/)
    expect(html).not.toContain(`aria-label="${PAGE_TEXT.parts}"`)
    expect(app.store.length).toBe(0)
  })

  it('with a lab stored opens on the part and the page the learner was at, and the Record tab holds the record; a record that does not fit is set aside', () => {
    save(takeReadings(m, wholeRun(m, fresh(), 'reading'), 'liquid'))
    const html = page()
    expect(html).toContain(`aria-label="${PAGE_TEXT.parts}"`)
    expect(html).toContain(`>${partTitle(data, 'liquid')}</h2>`)
    expect(html).toMatch(new RegExp(`<h3[^>]*>${PAGE_TEXT.notebook}</h3>`))
    expect(text(html)).toContain(RECORD_TEXT.heading)
    app.store = createMemoryStore()
    labProgress(app.store, density, SCHEMA).save({ ...fresh(), status: 'completed' })
    expect(page()).not.toContain(`aria-label="${PAGE_TEXT.parts}"`)
  })

  it('in a narrow window shows no bench', () => {
    save(fresh())
    app.wide = false
    expect(page()).not.toContain(`aria-label="${PAGE_TEXT.parts}"`)
  })
})

describe('where a scale is drawn', () => {
  it('gives every scale the marks its instrument has: a number at each numbered value, a longer mark halfway where ten marks stand to a number, and none beyond either end', () => {
    const [cm, , mm, , cylinder, thermometer] = scalesOf(1).map((one) => one.view) as [ScaleView, ScaleView, ScaleView, ScaleView, ScaleView, ScaleView]
    expect(marksIn(cm, cm).map((mark) => mark.label)).toEqual(Array.from({ length: 21 }, (_, i) => String(i)))
    const millimetres = marksIn(mm, mm)
    expect(millimetres).toHaveLength(201)
    expect(millimetres.filter((mark) => mark.kind === 'numbered').map((mark) => mark.label)).toEqual(Array.from({ length: 21 }, (_, i) => String(i)))
    expect(millimetres.filter((mark) => mark.kind === 'half')).toHaveLength(20)
    expect(marksIn(cylinder, cylinder).filter((mark) => mark.label !== null).map((mark) => mark.label)).toEqual(['0', '5', '10', '15', '20', '25', '30', '35', '40', '45', '50'])
    expect(marksIn(cylinder, cylinder).some((mark) => mark.kind === 'half')).toBe(false)
    expect(marksIn(thermometer, { fromE3: -20000, toE3: 12000 }).filter((mark) => mark.label !== null).map((mark) => mark.label)).toEqual(['−10', '0', '10'])
    expect(marksIn(thermometer, { fromE3: -20000, toE3: 12000 })[0]!.atE3).toBe(-10000)
    expect(marksIn(thermometer, { fromE3: -2000, toE3: 3000 }).map((mark) => mark.kind)).toEqual(['minor', 'minor', 'numbered', 'minor', 'minor', 'minor'])
  })

  it("shows in a closer look the engine's stretch, with a numbered mark in it at every seed: only the millimetre ruler's is ever widened, to seven gaps at the most", () => {
    for (const seed of SEEDS) {
      for (const { view: look } of scalesOf(seed)) {
        const stretch = closerStretch(look)
        expect(stretch.fromE3).toBeLessThanOrEqual(look.closeUp.fromE3)
        expect(stretch.toE3).toBeGreaterThanOrEqual(look.closeUp.toE3)
        expect(marksIn(look, stretch).some((mark) => mark.label !== null), `${seed} ${look.instrument}`).toBe(true)
        expect(marksIn(look, stretch).map((mark) => mark.atE3)).toEqual(expect.arrayContaining([look.lowerE3, look.upperE3]))
        if (look.instrument !== 'ruler-mm') expect(stretch).toEqual(look.closeUp)
        expect(gapsIn(look, stretch)).toBeGreaterThanOrEqual(5)
        expect(gapsIn(look, stretch)).toBeLessThanOrEqual(7)
      }
    }
  })

  it('draws an edge where it stands between its two marks, and two marks of a closer look far enough apart to judge tenths between: 57 units of a ruler 460 wide at the least, and 70 of a thermometer 420 tall and of a cylinder 400 tall, which has less room beyond its end marks', () => {
    expect(CYLINDER_CLOSER).toEqual({ height: 400, room: 5 / 14 })
    for (const seed of SEEDS) {
      for (const { view: look } of scalesOf(seed)) {
        const stretch = closerStretch(look)
        const upright = look.instrument === 'cylinder' || look.instrument === 'thermometer'
        const [length, room] = look.instrument === 'cylinder' ? [CYLINDER_CLOSER.height, CYLINDER_CLOSER.room] : [upright ? 420 : 460, 0.5]
        const pad = closerPad(look, stretch, length, room)
        const at = along(stretch, length, pad, pad)
        expect(at(look.upperE3) - at(look.lowerE3)).toBeCloseTo(closerGap(look, stretch, length, room))
        expect(at(look.atE3)).toBeGreaterThanOrEqual(at(look.lowerE3))
        expect(at(look.atE3)).toBeLessThan(at(look.upperE3))
        expect((at(look.atE3) - at(look.lowerE3)) / closerGap(look, stretch, length, room)).toBeCloseTo((look.atE3 - look.lowerE3) / look.markE3)
        if (upright) expect(closerGap(look, stretch, length, room)).toBeCloseTo(70)
        else expect(closerGap(look, stretch, length, room)).toBeGreaterThanOrEqual(57)
        // The first and last marks stand clear of the picture's edge, by the height of half a number at the least.
        expect(pad).toBeGreaterThanOrEqual(25 - 1e-9)
        expect(at(stretch.fromE3)).toBeCloseTo(pad)
        expect(at(stretch.toE3)).toBeCloseTo(length - pad)
      }
    }
  })
})

describe('a scale as it is drawn', () => {
  it('is a picture named for what it is and described by the words that say the same, in the colour of the text, with every number the scale prints and no other', () => {
    for (const { view: look, reading } of scalesOf(3)) {
      for (const closer of [false, true]) {
        const html = scale(look, closer)
        expect(html).toMatch(/^<svg[^>]*role="img"[^>]*aria-label="a scale"[^>]*aria-describedby="words"/)
        expect(html).not.toMatch(/#[0-9a-f]{3,6}\b|rgb\(/i)
        const printed = [...html.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((match) => match[1]!)
        expect(printed.filter((one) => one !== look.unit).every((one) => /^−?\d+$/.test(one)), printed.join(' ')).toBe(true)
        expect(printed).not.toContain(reading)
        expect(count(html, /data-mark="numbered"/g)).toBeGreaterThan(0)
        expect(html.includes('data-closer')).toBe(closer)
      }
    }
  })

  it('has the note under the rulers, the liquid in the cylinder with the eye beside it, and the thread in the thermometer', () => {
    const [cm, , , , cylinder, thermometer] = scalesOf(1).map((one) => one.view) as [ScaleView, ScaleView, ScaleView, ScaleView, ScaleView, ScaleView]
    expect(scale(cm)).toContain('data-thing="note"')
    expect(scale(cm, true)).toContain('data-thing="note"')
    expect(scale(cylinder)).toContain('data-thing="liquid"')
    expect(scale(cylinder)).toMatch(/data-thing="eye" data-eye="level"/)
    expect(scale(cylinder)).not.toContain('data-thing="pieces"')
    expect(scale(thermometer)).toContain('data-thing="thread"')
    expect(scale(thermometer)).toContain('data-thing="ice"')
    expect(scale(thermometer, true)).toContain('data-thing="thread"')
    const empty = draw(createElement(ScaleDrawing, { look: { instrument: 'cylinder', ...m.scales.cylinder, atE3: null }, name: 'a scale', describedBy: 'words' }))
    expect(empty).not.toContain('data-thing="liquid"')
    expect(count(empty, /data-mark=/g)).toBe(51)
  })

  it('draws the pieces of metal alike whichever metal they are, in the cylinder and on the balance', () => {
    const drawn = new Map<string, Set<string>>()
    for (const seed of SEEDS.slice(0, 40)) {
      const dry = run(m, fresh('guided', seed), [{ type: 'weigh', part: 'metal' }])
      const state = takeReadings(m, fresh('guided', seed), 'metal')
      const metal = view(wholeRun(m, fresh('guided', seed), 'metal'), 'metal').expected!
      const pieces = (html: string) => /<g data-thing="pieces".*?<\/g>/s.exec(html)![0]
      const cylinder = pieces(draw(createElement(ScaleDrawing, { look: view(state, 'metal').bench.cylinder.scale!, pieces: true, name: 'a', describedBy: 'b' })))
      const balance = pieces(draw(createElement(BalanceDrawing, { m, balance: view(dry, 'metal').bench.balance, name: 'a', describedBy: 'b' })))
      const id = metal.kind === 'unknown' ? metal.id : ''
      drawn.set(id, new Set([...(drawn.get(id) ?? []), `${cylinder}${balance}`]))
    }
    expect(drawn.size).toBe(3)
    expect(new Set([...drawn.values()].flatMap((set) => [...set])).size).toBe(1)
  })

  it('shows on the balance every figure of its display, and zero with nothing on it', () => {
    const state = fresh()
    expect(draw(createElement(BalanceDrawing, { m, balance: view(state, 'reading').bench.balance, name: 'a', describedBy: 'b' }))).toContain(`>${formatReading(m, 'balance', view(state, 'reading').bench.balance.cg!)} g</text>`)
    const nothing = draw(createElement(BalanceDrawing, { m, balance: view(state, 'liquid').bench.balance, name: 'a', describedBy: 'b' }))
    expect(nothing).toContain('>0.00 g</text>')
    expect(nothing).not.toContain('data-thing="object"')
  })
})

describe("a part's pages", () => {
  it('are the bench, each instrument the part reads and the notebook, one at a time, in a list that says how many readings of each instrument are taken', () => {
    expect(PAGES.reading).toEqual(['bench', 'ruler-cm', 'ruler-mm', 'cylinder', 'thermometer', 'balance', 'notebook'])
    expect(PAGES.liquid).toEqual(['bench', 'balance', 'cylinder', 'notebook'])
    expect(PAGES.metal).toEqual(PAGES.liquid)
    for (const part of PART_IDS) expect(PAGES[part].flatMap((page) => (page === 'bench' || page === 'notebook' ? [] : readingsOf(part, page))).length).toBe(view(fresh(), part).notebook.filter((entry) => entry.kind === 'reading').length)
    const html = bench(run(m, fresh(), [{ type: 'enter', part: 'reading', field: 'lengthCm', value: readingOf(m, fresh(), 'reading', 'lengthCm') as number }]), 'reading', 'ruler-cm')
    expect(html).toContain(`<nav aria-label="${PAGE_TEXT.pages}"`)
    expect(count(html, /<h3/g)).toBe(1)
    expect(text(html)).toContain(`${INSTRUMENT_NAME['ruler-cm']} ${readText(1, 2)}`)
    expect(text(html)).toContain(`${INSTRUMENT_NAME.balance} ${readText(0, 1)}`)
    expect([readText(0, 2), readText(1, 2), readText(2, 2)]).toEqual(['Not read yet', '1 of 2 read', 'Read'])
    expect(text(html)).toContain(PAGE_TEXT.previous(PAGE_TEXT.bench))
    expect(text(html)).toContain(PAGE_TEXT.next(INSTRUMENT_NAME['ruler-mm']))
  })

  it('open where the stored record says the learner was: the bench of a run not begun, the first instrument with a reading that can be taken, and the notebook once every reading is in or the run is checked', () => {
    const at = (state: DensityState, part: PartId) => PAGES[part][openingPage(part, view(state, part))]
    expect(PART_IDS.map((part) => at(fresh(), part))).toEqual(['bench', 'bench', 'bench'])
    const weighed = run(m, fresh(), [{ type: 'weigh', part: 'liquid' }])
    expect(at(weighed, 'liquid')).toBe('balance')
    const poured = run(m, weighed, [{ type: 'enter', part: 'liquid', field: 'emptyMass', value: readingOf(m, weighed, 'liquid', 'emptyMass') }, { type: 'pour', part: 'liquid' }])
    expect(at(poured, 'liquid')).toBe('cylinder')
    expect(at(takeReadings(m, fresh(), 'liquid'), 'liquid')).toBe('notebook')
    expect(at(wholeRun(m, fresh(), 'liquid'), 'liquid')).toBe('notebook')
    expect(at(run(m, fresh(), [{ type: 'enter', part: 'reading', field: 'lengthCm', value: readingOf(m, fresh(), 'reading', 'lengthCm') as number }]), 'reading')).toBe('ruler-cm')
    expect(sameAction({ type: 'weigh', part: 'metal' }, { type: 'weigh', part: 'metal' })).toBe(true)
    expect(sameAction({ type: 'addPieces', part: 'metal', how: 'slide' }, { type: 'addPieces', part: 'metal', how: 'drop' })).toBe(false)
    expect(sameAction(null, { type: 'weigh', part: 'metal' })).toBe(false)
  })

  it('have the three parts over them, each a button a finger tall with how far it has come, and the part shown marked', () => {
    const html = bench(wholeRun(m, fresh(), 'reading'), 'liquid', 'bench')
    const nav = /<nav aria-label="The three parts".*?<\/nav>/s.exec(html)![0]
    expect(count(nav, /<button/g)).toBe(3)
    expect(count(nav, /min-h-11/g)).toBe(3)
    expect(count(nav, /aria-current="true"/g)).toBe(1)
    expect(text(nav)).toMatch(/Part 1 Reading instruments ✓ Done Part 2 The density of a liquid ○ Not started/)
  })
})

describe('the bench of a part', () => {
  it('lists what is set out, and has the whole bench in words behind a disclosure that is closed', () => {
    const html = card(bench(fresh(), 'reading', 'bench'))
    expect(text(closed(html))).toContain('A paper note, with a ruler marked in centimetres and one marked in millimetres.')
    expect(html).toContain(`>${PAGE_TEXT.benchInWords}</summary>`)
    expect(text(closed(html))).not.toContain('far edge is')
    expect(text(html)).toContain('far edge is')
  })

  it('shows the hazards of everything an unknown may be until it is named, under a heading that says why, and then of the one it was', () => {
    for (const part of ['liquid', 'metal'] as const) {
      const before = card(bench(takeReadings(m, fresh(), part), part, 'bench'))
      expect(text(before)).toContain(hazardsHeading(data, part, null))
      for (const reagent of unknownsOf(data, part)) expect(before).toContain(`role="group" aria-label="${reagent.name}"`)
      const done = wholeRun(m, fresh(), part)
      const after = card(bench(done, part, 'bench'))
      expect(text(after)).toContain(hazardsHeading(data, part, view(done, part).expected))
      expect(count(after, /role="group" aria-label=/g)).toBe(1)
    }
  })
})

describe('an instrument on its page', () => {
  it('is drawn with no closer look until one is asked for, by a button a finger tall named for the instrument; its words are behind a disclosure that is closed and are the description of its picture', () => {
    for (const instrument of SCALE_IDS) {
      const html = card(bench(fresh(), 'reading', instrument))
      expect(html).not.toContain('data-closer')
      expect(html).toMatch(new RegExp(`<button[^>]*aria-label="${BENCH_TEXT.closerLookOf(instrument)}"[^>]*min-h-11[^>]*>${BENCH_TEXT.closerLook}</button>`))
      const id = /<svg[^>]*aria-describedby="([^"]*)"/.exec(html)![1]!
      const words = new RegExp(`<p id="${id}" hidden="">(.*?)</p>`).exec(html)![1]!
      expect(text(words).length).toBeGreaterThan(40)
      expect(html).toContain(`>${BENCH_TEXT.inWords}</summary>`)
      expect(text(html)).toContain(text(words))
      expect(text(closed(html))).not.toContain(text(words).slice(0, 40))
    }
    expect(text(card(bench(fresh(), 'reading', 'ruler-cm')))).toContain(describeNote(view(fresh(), 'reading').bench.rulerCm!))
    expect(text(card(bench(fresh(), 'reading', 'cylinder')))).toContain(describeCylinder(view(fresh(), 'reading').bench.cylinder))
  })

  it('has each reading typed beside it in a field a finger tall, with how it is written, and never prints a reading of a scale before it is typed: seeds 1 to 30', { timeout: 30000 }, () => {
    const html = card(bench(fresh(), 'reading', 'ruler-mm'))
    expect(text(html)).toContain(`${BENCH_TEXT.side.length} `)
    for (const field of ['lengthMm', 'widthMm'] as const) expect(html).toMatch(new RegExp(`<label[^>]*>${fieldLabel(field).replace(/[()]/g, '\\$&')}</label>`))
    expect(count(html, /<input[^>]*class="h-11 /g)).toBe(2)
    expect(count(html, new RegExp(`>${BENCH_TEXT.record}</button>`, 'g'))).toBe(2)
    expect(text(html)).toContain('To a hundredth of a centimetre, for example 8.43.')
    for (const seed of SEEDS.slice(0, 30)) {
      const state = fresh('guided', seed)
      for (const instrument of SCALE_IDS) {
        const page = text(card(bench(state, 'reading', instrument)))
        for (const field of readingsOf('reading', instrument)) {
          const value = readingOf(m, state, 'reading', field)
          const reading = formatReading(m, instrument, typeof value === 'number' ? value : value.value)
          expect(page, `${seed} ${field} ${reading}`).not.toMatch(new RegExp(`(?<![\\d.])${reading.replace('.', '\\.').replace('-', '[-−]')}(?![\\d])`))
        }
      }
    }
  })

  it('says of an empty cylinder that it is empty, where a cylinder with a liquid in it has what is seen from where the eye is: part 2 before the liquid is poured', () => {
    const empty = text(closed(card(bench(fresh(), 'liquid', 'cylinder'))))
    expect(empty).toContain('The cylinder is empty and dry.')
    for (const seen of Object.values(EYE_TEXT)) expect(empty).not.toContain(seen)
    expect(text(closed(card(bench(fresh(), 'metal', 'cylinder'))))).toContain(EYE_TEXT.above)
  })

  it('has beside the cylinder three buttons a finger tall that move the eye, the one where the eye is pressed and marked, with what is seen from there in words; the eye begins above', () => {
    const html = card(bench(fresh(), 'reading', 'cylinder'))
    const group = new RegExp(`<div role="group" aria-label="${BENCH_TEXT.eye}".*?</div>`, 's').exec(html)![0]
    expect([...group.matchAll(/<button[^>]*aria-pressed="(true|false)"[^>]*>/g)].map((match) => match[1])).toEqual(['true', 'false', 'false'])
    expect(count(group, /h-11/g)).toBe(3)
    expect(text(group)).toBe(` ● ${BENCH_TEXT.moveEye.above} ○ ${BENCH_TEXT.moveEye.level} ○ ${BENCH_TEXT.moveEye.below} `)
    expect(html).toContain('data-eye="above"')
    expect(text(closed(html))).toContain(EYE_TEXT.above)
  })

  it("has the bench's steps where they are worked: the weighings at the balance, the pouring and the pieces going in at the cylinder; a step taken carries a tick, and a reading the bench does not show yet has no field", () => {
    const first = card(bench(fresh(), 'liquid', 'balance'))
    expect(text(first)).toContain(BENCH_TEXT.weighEmpty)
    expect(count(first, /<input/g)).toBe(0)
    expect(text(first)).toContain('Put the empty cylinder on the balance first.')
    const weighed = run(m, fresh(), [{ type: 'weigh', part: 'liquid' }])
    expect(text(card(bench(weighed, 'liquid', 'balance')))).toContain(`✓ ${BENCH_TEXT.weighEmpty}`)
    expect(count(card(bench(weighed, 'liquid', 'balance')), /<input/g)).toBe(1)
    expect(text(card(bench(fresh(), 'liquid', 'cylinder')))).toContain(BENCH_TEXT.pour)
    const metal = text(card(bench(fresh(), 'metal', 'cylinder')))
    expect(metal).toContain(BENCH_TEXT.slide)
    expect(metal).toContain(BENCH_TEXT.drop)
    expect(metal).toContain('The pieces are dry, beside the cylinder.')
    const slid = takeReadings(m, fresh(), 'metal')
    expect(text(card(bench(slid, 'metal', 'cylinder')))).toContain(`✓ ${BENCH_TEXT.slide}`)
    expect(card(bench(slid, 'metal', 'cylinder'))).toContain('data-thing="pieces"')
    expect(text(card(bench(slid, 'metal', 'balance')))).toContain(`✓ ${BENCH_TEXT.weighPieces}`)
  })

  it("is warned of by the engine, in Guided and not in Challenge, before a level is read with the eye off it and before each slip of part 3's technique", () => {
    const level = (mode: Mode) => warnings(m, fresh(mode), { type: 'enter', part: 'reading', field: 'firstVolume', value: readingOf(m, fresh(mode), 'reading', 'firstVolume') })
    expect(level('guided')).toEqual(['eye-above'])
    expect(level('challenge')).toEqual([])
    const read = run(m, fresh(), [{ type: 'moveEye', part: 'metal', eye: 'level' }])
    const ready = run(m, read, [{ type: 'enter', part: 'metal', field: 'waterLevel', value: readingOf(m, read, 'metal', 'waterLevel') }])
    expect(warnings(m, ready, { type: 'addPieces', part: 'metal', how: 'drop' })).toEqual(['pieces-not-weighed', 'dropping'])
  })
})

describe('the notebook', () => {
  it('lists the readings as they were typed over what is worked out, each worked-out entry open once what it is worked from is in; Guided has how many figures each reading has and the relation and the rule in a disclosure that is closed', () => {
    const state = takeReadings(m, fresh(), 'liquid')
    const html = card(bench(state, 'liquid', 'notebook'))
    expect(html.indexOf(`>${PAGE_TEXT.readings}</h4>`)).toBeLessThan(html.indexOf(`>${PAGE_TEXT.workedOut}</h4>`))
    for (const entry of entriesOf(view(state, 'liquid').notebook, 'balance')) expect(text(html)).toContain(`${fieldLabel(entry.field)} : ${formatReading(m, 'balance', entry.value as number)} g ${entry.figures} significant figures`)
    expect(entriesOf(view(state, 'liquid').notebook, 'balance').map((entry) => entry.figures)).toEqual([4, 5])
    expect(count(html, /<input[^>]*class="h-11 /g)).toBe(2)
    expect(count(html, /<input[^>]*type="text"[^>]*disabled=""/g)).toBe(1)
    expect(text(html)).toContain('Make the entries this one is worked from first.')
    expect(text(html)).toContain(relationText('liquidMass'))
    expect(text(closed(html))).not.toContain(relationText('liquidMass'))
  })

  it('has for an unknown the table of what it may be over the choice of its name, a finger tall each, and names every row alike', () => {
    for (const part of ['liquid', 'metal'] as const) {
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        const html = card(bench(takeReadings(m, fresh('guided', seed), part), part, 'notebook'))
        expect(html.indexOf(TABLE_HEADING[part])).toBeLessThan(html.indexOf('type="radio"'))
        expect(new Set(unknownsOf(data, part).map((reagent) => count(html, new RegExp(reagent.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')))).size).toBe(1)
        expect(count(html, /type="radio"/g)).toBe(part === 'liquid' ? 5 : 4)
        expect(html).not.toContain('checked=""')
      }
    }
  })

  it('says nothing in Challenge of whether a reading or an entry is right, and has no relation to open, until the notebook is checked; then it marks which entry broke which rule', () => {
    const state = takeReadings(m, fresh('challenge'), 'liquid')
    for (const page of PAGES.liquid) {
      const html = bench(state, 'liquid', page)
      for (const word of [VERDICT_TEXT.reading.right, VERDICT_TEXT.reading.not, VERDICT_TEXT.worked.right, VERDICT_TEXT.worked.not, PAGE_TEXT.hint, 'significant figures']) expect(text(html), `${page} ${word}`).not.toContain(word)
      expect(html).not.toMatch(/✕/)
    }
    expect(text(card(bench(state, 'liquid', 'notebook')))).toContain(PAGE_TEXT.check)
    expect(text(card(bench(takeReadings(m, fresh(), 'liquid'), 'liquid', 'notebook')))).not.toContain(PAGE_TEXT.check)
    const wrong = wholeRun(m, fresh('challenge'), 'liquid', { slip: 'figures-too-many' })
    const html = text(card(bench(wrong, 'liquid', 'notebook')))
    expect(html).toContain(entryFeedback('liquidDensity', { follows: false, slip: 'figures-too-many' }))
    expect(html).toContain(outcomeText(m, 'liquid', view(wrong, 'liquid').outcome))
    expect(html).not.toContain(PAGE_TEXT.notes)
  })

  it('refuses in Guided an entry rounded by the wrong rule, with which rule it broke', () => {
    const state = takeReadings(m, fresh(), 'reading')
    expect(can(m, state, { type: 'enter', part: 'reading', field: 'areaCm', value: workedValue(m, state, 'reading', 'areaCm', 'figures-too-many') })).toBe('figures-too-many')
  })

  it('says how a checked run came out, offers the part again, and has what the unknown was, with the notes, behind a disclosure that is closed and only once a run counts', () => {
    const done = wholeRun(m, fresh(), 'liquid')
    const html = bench(done, 'liquid', 'notebook')
    expect(text(html)).toContain(outcomeText(m, 'liquid', view(done, 'liquid').outcome))
    expect(html).toMatch(new RegExp(`<button[^>]*min-h-11[^>]*>${PAGE_TEXT.runAgain}</button>`))
    expect(text(html)).toContain(expectedText(data, 'liquid', view(done, 'liquid').expected!))
    expect(text(closed(html))).not.toContain(expectedText(data, 'liquid', view(done, 'liquid').expected!))
    expect(count(card(html), /<input/g)).toBe(0)
    expect(text(bench(fresh(), 'liquid', 'notebook'))).not.toContain(PAGE_TEXT.runAgain)
  })
})

describe('what the page shows of an unknown before it is named', () => {
  it('is the same whichever liquid or metal it is: every page of parts 2 and 3 names each thing it may be, and gives its id, as often at every seed from 1 to 30, among which each unknown comes', { timeout: 30000 }, () => {
    for (const part of ['liquid', 'metal'] as const) {
      const unknowns = new Set<string>()
      for (const page of PAGES[part]) {
        const seen = new Set<string>()
        for (const seed of SEEDS.slice(0, 30)) {
          const state = takeReadings(m, fresh('challenge', seed), part)
          const html = bench(state, part, page)
          seen.add(unknownsOf(data, part).map((reagent) => [count(html, new RegExp(reagent.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')), count(html, new RegExp(`"${reagent.tableId}"`, 'g'))].join()).join(' '))
          const named = view(wholeRun(m, fresh('challenge', seed), part), part).expected
          if (named?.kind === 'unknown') unknowns.add(named.id)
        }
        expect(seen.size, `${part} ${page}`).toBe(1)
      }
      expect(unknowns.size).toBe(unknownsOf(data, part).length)
    }
  })
})

describe('the Record tab', () => {
  it('lists every run of each part in order, with what was read and entered, whether it counted and, where it did not, why', () => {
    const state = wholeRun(m, run(m, wholeRun(m, fresh(), 'metal', { add: 'drop' }), [{ type: 'runAgain', part: 'metal' }]), 'metal')
    const html = text(draw(createElement(DensityRecord, { data, m, state })))
    for (const part of PART_IDS) expect(html).toContain(partTitle(data, part))
    expect(html).toContain(`${RECORD_TEXT.run(1)}: ${RECORD_TEXT.doesNotCount}`)
    expect(html).toContain(`${RECORD_TEXT.run(2)}: ✓ ${RECORD_TEXT.counts}`)
    expect(html).toContain(reasonText(m, 'dropped-in'))
    expect(html).toContain(`${fieldLabel('piecesMass')}: `)
    expect(html).toContain(RECORD_TEXT.open)
    expect(html).not.toContain(PAGE_TEXT.complete)
    const all = PART_IDS.reduce((lab, part) => wholeRun(m, lab, part), fresh())
    expect(text(draw(createElement(DensityRecord, { data, m, state: all })))).toContain(PAGE_TEXT.complete)
  })
})
