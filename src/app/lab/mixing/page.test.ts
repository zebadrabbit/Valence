import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ACTIVITIES } from '@/app/activities'
import { LAYER_LINE, contentsEnd } from '@/app/lab/Tube'
import { liquidHex } from '@/app/lab/tubeDrawing'
import { labProgress } from '@/app/lab/useLabProgress'
import { createMemoryStore, type KeyValueStore } from '@/app/progress/storage'
import { routes } from '@/app/routes'
import { mixingPartCitations, mixingTubeCitations } from '@/chem-data/citations'
import { LIQUID_IDS, mixingData as data, PAIR_IDS, SOLID_TUBE_IDS, type PartId, type TubeId } from '@/chem-data/mixing/data'
import { MIXING_PRIMER, READ_FIRST } from '@/chem-data/mixing/primer'
import sources from '@/chem-data/sources.json'
import { benchView, createLab, mixingStateSchema, modelFrom, pairView, STAGES, tubeView, type Action, type MixingState, type Mode } from '@/engine/mixing'
import { run, wholeLab, wholePair, wholePairs, wholeRule, wholeSolids, wholeSolidTube } from '@/engine/mixing/testkit'
import {
  CHOOSE_TEXT,
  FAMILY_LABEL,
  FORM_TEXT,
  HAZARD_TEXT,
  LAB_TEXT,
  MOLECULE_LINK,
  NOTES_TEXT,
  PAGE_TEXT,
  PART_AIM,
  PART_LABEL,
  RECORD_TEXT,
  REASON_TEXT,
  RULE_TEXT,
  STEP_TEXT,
  TUBE_HINT,
  countText,
  liquidName,
  moreLabel,
  pairOffBenchText,
  partNotes,
  partText,
  questionText,
  tubeName,
  tubeNote,
  tubeParts,
  tubeText,
} from './messages'
import { MixingBench } from './MixingBench'
import mixingCss from './mixing.css?raw'
import { MixingPage } from './MixingPage'
import { MixingRecord } from './MixingRecord'
import { OFF_BENCH, TUBE_HEIGHT, opening, partMarks, tubeLayers, tubeMark, tubeSections, tubeWords } from './pageLook'

// The polarity and mixing lab's page as markup, on a store the test holds. AppStateProvider builds its store from
// the browser and the media hook has no value on a server, so both are given directly. What a press does (a tube
// chosen, a step, a part looked at, an answer recorded, a check) is state, and is checked in a browser: a markup
// render mounts the page and no more.
const app = vi.hoisted(() => ({ store: undefined as unknown as KeyValueStore, persistent: true, wide: true }))
vi.mock('@/app/AppState', () => ({ useAppState: () => ({ store: app.store, persistent: app.persistent, reducedMotion: false }) }))
vi.mock('@/app/useMediaQuery', () => ({ useMediaQuery: () => app.wide }))

const mixing = ACTIVITIES.find((activity) => activity.to === '/lab/polarity-and-mixing')!
const m = modelFrom(data)
const SCHEMA = mixingStateSchema(m)
const FULL = m.moreMicrolitres + m.lessMicrolitres
const draw = (element: ReactElement) => renderToStaticMarkup(createElement(MemoryRouter, null, element))
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replaceAll('&#x27;', "'").replaceAll('&amp;', '&').replace(/\s+/g, ' ')
/** The markup with every disclosure taken out: what is on the page before anything is opened. */
function closed(html: string): string {
  const without = html.replace(/<details(?:(?!<details).)*?<\/details>/gs, '')
  return without === html ? html : closed(without)
}
const selectedTab = (html: string) => [...html.matchAll(/<button[^>]*role="tab"[^>]*>([^<]*)<\/button>/g)].filter((match) => match[0].includes('aria-selected="true"')).map((match) => match[1])
const count = (html: string, pattern: RegExp) => [...html.matchAll(pattern)].length
/** The places of the table the tubes are chosen from, by their names. */
const places = (html: string) => [...html.matchAll(/<button type="button" aria-label="([^"]*)"([^>]*)>/g)].map((match) => ({ name: match[1]!, off: match[2]!.includes('aria-disabled="true"'), current: match[2]!.includes('aria-current="true"') }))
/** The lines drawn across a tube, and the words of its brackets. */
const lines = (html: string) => [...html.matchAll(/<line [^>]*>/g)].map((match) => match[0])
const brackets = (html: string) => [...closed(html).matchAll(/<text [^>]*>([^<]*)<\/text>/g)].map((match) => match[1])
/** What is seen and how the tube or the part came out: from its first sheet of answers down to the foot, where the marks of answers are. */
const answers = (html: string, heading: string) => html.slice(html.indexOf(`>${heading}</h3>`), html.indexOf('<div class="mt-4 grid gap-9'))

const fresh = (mode: Mode = 'guided') => createLab(mode)
const bench = (state: MixingState, part: PartId, tube: TubeId | null = null) => draw(createElement(MixingBench, { data, m, sources, state, act: () => undefined, opensAt: { part, tube } }))
/** A tube brought as far as a stage, and then looked at. */
const filled = (id: TubeId, more = id.split('+')[0]!): Action => (id.includes('+') ? { type: 'pour', tube: id as (typeof PAIR_IDS)[number], more: more as (typeof LIQUID_IDS)[number] } : { type: 'add', tube: id as (typeof SOLID_TUBE_IDS)[number] })
const stood = (state: MixingState, id: TubeId, more?: string) => run(m, state, [filled(id, more), { type: 'shake', tube: id }, { type: 'stand', tube: id }])
const looked = (state: MixingState, id: TubeId, more?: string) => run(m, stood(state, id, more), [{ type: 'look', tube: id }])
const OIL = 'water+vegetable-oil'
const CLEAR = 'water+mineral-oil'
const ONE = 'water+vinegar'
const FAMILY = /like water|like oil|polar/i

beforeEach(() => {
  app.store = createMemoryStore()
  app.persistent = true
  app.wide = true
})

describe('the route, the list of activities and the stored lab', () => {
  it('is listed as "Polarity and mixing" at its own address, which the routes load lazily', () => {
    expect(mixing.title).toBe('Polarity and mixing')
    expect(LAB_TEXT.title).toBe(mixing.title)
    const route = routes[0]!.children!.find((child) => child.path === 'lab/polarity-and-mixing')!
    expect(typeof route.lazy).toBe('function')
  })

  it('opens on the primer, with its topics to read first marked, and stores nothing until Start; with a lab stored it opens on the Lab tab at the tube the learner was at', () => {
    const before = draw(createElement(MixingPage))
    expect(selectedTab(before)).toEqual(['Primer'])
    expect(labProgress(app.store, mixing, SCHEMA).load()).toBeNull()
    for (const section of MIXING_PRIMER) expect(text(before)).toContain(section.heading)
    expect(READ_FIRST.length).toBeGreaterThan(0)
    expect(count(before, /Read first/g)).toBeGreaterThanOrEqual(READ_FIRST.length)

    const under = looked(wholePair(m, fresh(), ONE), OIL)
    expect(labProgress(app.store, mixing, SCHEMA).save(under)).toBe(true)
    const after = draw(createElement(MixingPage))
    expect(selectedTab(after)).toEqual(['Lab'])
    expect(after).toMatch(new RegExp(`<h3[^>]*>${tubeName(data, OIL)}</h3>`))
    // The stored record is the engine's own, and comes back as it went in.
    expect(labProgress(app.store, mixing, SCHEMA).load()).toEqual(under)
  })
})

describe('where the page opens, and the few words beside a part or a tube', () => {
  it('opens on the first part with no tube chosen, then at a tube that is begun and does not count, then on the first part not done', () => {
    expect(opening(m, fresh())).toEqual({ part: 'liquids', tube: null })
    expect(opening(m, stood(fresh(), OIL))).toEqual({ part: 'liquids', tube: OIL })
    expect(opening(m, wholePair(m, fresh(), OIL))).toEqual({ part: 'liquids', tube: null })
    const pairs = wholePairs(m, fresh())
    expect(opening(m, pairs)).toEqual({ part: 'solids', tube: null })
    expect(opening(m, stood(pairs, 'sugar-in-vinegar'))).toEqual({ part: 'solids', tube: 'sugar-in-vinegar' })
    expect(opening(m, wholeSolids(m, pairs))).toEqual({ part: 'rule', tube: null })
    expect(opening(m, wholeLab(m, fresh()))).toEqual({ part: 'rule', tube: null })
    // A tube left over that is begun in a lab that is complete is where the learner was.
    expect(opening(m, stood(wholeLab(m, fresh()), 'vinegar+vegetable-oil'))).toEqual({ part: 'liquids', tube: 'vinegar+vegetable-oil' })
  })

  it('says how a tube and a part stand in a word or two beside a mark, and has words alone for what the bench has not got', () => {
    const wrong = wholePair(m, fresh('challenge'), OIL, { wrong: true })
    expect([fresh(), stood(fresh(), OIL), wholePair(m, fresh('challenge'), OIL, { check: false }), wholePair(m, fresh(), OIL), wrong].map((state) => tubeMark(tubeView(m, state, OIL)))).toEqual([
      { mark: '○', text: 'Not begun', done: false },
      { mark: '◔', text: 'Under way', done: false },
      { mark: '◔', text: 'To check', done: false },
      { mark: '✓', text: 'Counts', done: true },
      { mark: '◑', text: 'Does not count', done: false },
    ])
    expect(OFF_BENCH).toEqual({ mark: '', text: 'Not on this bench', done: false })
    expect(partMarks(m, fresh())).toEqual({ liquids: { mark: '○', text: '0 of 6 count', done: false }, solids: { mark: '○', text: '0 of 6 count', done: false }, rule: { mark: '○', text: 'Not open yet', done: false } })
    const both = wholeSolids(m, wholePairs(m, wholePair(m, fresh(), 'vegetable-oil+mineral-oil')))
    expect(partMarks(m, both)).toEqual({ liquids: { mark: '✓', text: '7 count, 6 needed', done: true }, solids: { mark: '✓', text: '6 of 6 count', done: true }, rule: { mark: '○', text: 'Not begun', done: false } })
    expect(partMarks(m, run(m, both, [{ type: 'sort', liquid: 'water', family: 'water' }])).rule).toEqual({ mark: '◔', text: 'Under way', done: false })
    expect(partMarks(m, wholeRule(m, both)).rule).toEqual({ mark: '✓', text: 'Done', done: true })
  })
})

describe('the picture of a tube', () => {
  const END = contentsEnd(TUBE_HEIGHT)
  const every = [...PAIR_IDS.flatMap((id) => pairView(m, fresh(), id).liquids.map((more) => [id, more] as const)), ...SOLID_TUBE_IDS.map((id) => [id, undefined] as const)]
  const at = (id: TubeId, more: string | undefined, stage: (typeof STAGES)[number]) => {
    const actions: Action[] = [filled(id, more), { type: 'shake', tube: id }, { type: 'stand', tube: id }]
    return tubeView(m, run(m, fresh(), actions.slice(0, STAGES.indexOf(stage))), id)
  }

  it('fills a tube of two liquids to the sum of the two amounts, and gives each band a height in proportion to its own', () => {
    for (const more of ['water', 'vegetable-oil']) {
      const view = at(OIL, more, 'stood')
      const layers = tubeLayers(view.shows, FULL)
      const { liquid, above } = view.shows
      expect(layers.above!.surface).toBe(70)
      const [upper, lower] = [layers.liquid!.surface - layers.above!.surface, END - layers.liquid!.surface]
      expect(upper + lower).toBe(END - 70)
      expect(upper / lower).toBeCloseTo(above!.microlitres / liquid!.microlitres, 5)
    }
    // More of the liquid that floats is the thicker band on top; less of it is the thinner one.
    expect(tubeLayers(at(OIL, 'vegetable-oil', 'stood').shows, FULL).liquid!.surface).toBe(206)
    expect(tubeLayers(at(OIL, 'water', 'stood').shows, FULL).liquid!.surface).toBe(138)
  })

  it('draws a tube that has not stood as one cloudy liquid to the same height, an empty tube as empty, and a solid at the bottom or spread through', () => {
    expect(tubeLayers(at(OIL, 'water', 'empty').shows, FULL)).toEqual({ liquid: null, solid: null })
    for (const stage of ['in', 'shaken'] as const) expect(tubeLayers(at(OIL, 'water', stage).shows, FULL)).toEqual({ liquid: { hex: liquidHex('pale yellow'), cloudy: true, surface: 70 }, solid: null, spread: null })
    expect(tubeLayers(at(ONE, 'water', 'stood').shows, FULL)).toEqual({ liquid: { hex: liquidHex('colourless'), cloudy: false, surface: 70 }, solid: null, spread: null })
    const salt = (stage: (typeof STAGES)[number]) => tubeLayers(at('salt-in-vegetable-oil', undefined, stage).shows, FULL)
    expect(salt('in')).toMatchObject({ liquid: { cloudy: false, surface: 138 }, solid: { hex: '#ffffff', top: END - 42 }, spread: null })
    expect(salt('shaken')).toMatchObject({ liquid: { cloudy: true }, solid: null, spread: { hex: '#ffffff' } })
    expect(salt('stood')).toMatchObject({ liquid: { cloudy: false }, solid: { top: END - 42 } })
    expect(tubeLayers(at('salt-in-water', undefined, 'stood').shows, FULL)).toMatchObject({ solid: null, spread: null })
  })

  it('has a section to look at for each layer of every tube at every stage, each a finger tall where the picture is 280 px wide, and none over the line between two layers', () => {
    // 280 px of the picture's 320 units: 44 px are 51 units.
    const FINGER = Math.ceil((44 * 320) / 280)
    for (const [id, more] of every) {
      for (const stage of STAGES) {
        const view = at(id, more, stage)
        const layers = tubeLayers(view.shows, FULL)
        const sections = tubeSections(view, layers, () => false)
        if (stage === 'empty') {
          expect(sections).toEqual([])
          continue
        }
        // The parts the messages word are the parts the picture has; a tube a solid went into has its bottom too, whatever lies there.
        expect(sections.map((section) => section.part), `${id} ${stage}`).toEqual(view.kind === 'solid' ? ['liquid', 'solid'] : tubeParts(view.shows))
        for (const section of sections) expect(section.bottom - section.top, `${id} ${stage} ${section.part}`).toBeGreaterThanOrEqual(FINGER)
        expect(sections.at(-1)).toMatchObject({ bottom: END, foot: true })
        if (layers.above) {
          const [upper, lower] = sections
          expect(upper!.top).toBeLessThan(layers.above.surface)
          expect([layers.liquid!.surface - upper!.bottom, lower!.top - layers.liquid!.surface]).toEqual([4, 4])
        }
      }
    }
  })

  it('names a section by where it is, says once it has been looked at, and names the bottom of a tube without saying whether a solid lies there', () => {
    const two = at(OIL, 'water', 'stood')
    expect(tubeSections(two, tubeLayers(two.shows, FULL), (part) => part === 'upper').map((section) => [section.name, section.looked])).toEqual([['Top layer, looked at', true], ['Bottom layer', false]])
    for (const id of ['salt-in-water', 'salt-in-vegetable-oil'] as const) {
      const view = at(id, undefined, 'stood')
      expect(tubeSections(view, tubeLayers(view.shows, FULL), () => false).map((section) => section.name)).toEqual(['Liquid', 'Bottom of the tube'])
    }
  })
})

describe('parts 1 and 2: choosing a tube', () => {
  it('has a place for each pair of the five liquids, each named by its tube and how it stands, and one that says it is not on this bench', () => {
    const state = stood(wholePair(m, fresh(), OIL), CLEAR)
    const html = bench(state, 'liquids')
    expect(places(html)).toEqual([
      { name: 'Distilled water with rubbing alcohol: Not begun', off: false, current: false },
      { name: 'Distilled water with vinegar: Not begun', off: false, current: false },
      { name: 'Distilled water with vegetable oil: Counts', off: false, current: false },
      { name: 'Distilled water with mineral oil: Under way', off: false, current: false },
      { name: 'Rubbing alcohol with vinegar: Not begun', off: false, current: false },
      { name: 'Rubbing alcohol with vegetable oil: Not begun', off: false, current: false },
      { name: 'Rubbing alcohol with mineral oil: Not on this bench', off: true, current: false },
      { name: 'Vinegar with vegetable oil: Not begun', off: false, current: false },
      { name: 'Vinegar with mineral oil: Not begun', off: false, current: false },
      { name: 'Vegetable oil with mineral oil: Not begun', off: false, current: false },
    ])
    expect(html).toContain(`<caption class="mb-1 text-left text-base font-semibold">${CHOOSE_TEXT.pair}</caption>`)
    expect(text(html)).toContain(countText(benchView(m, state), 'liquids'))
    expect(text(html)).toContain('One of the six tubes this part needs counts. The bench has nine to choose from.')
    // Why the pair is not there is said when its place is pressed, and is not in the page before.
    expect(html).not.toContain(pairOffBenchText(data, 'rubbing-alcohol', 'mineral-oil'))
    // No tube is drawn until one is chosen, and the button that opens the table is not there to do nothing.
    expect(html).not.toContain('<svg viewBox="0 0 320')
    expect(html).not.toContain(`>${PAGE_TEXT.choose}<`)
  })

  it('has a place for each solid in each liquid in part 2, two of them not on this bench, and marks the tube shown', () => {
    const html = bench(wholeSolidTube(m, fresh(), 'salt-in-water'), 'solids', 'salt-in-water')
    const all = places(html)
    expect(all).toHaveLength(10)
    expect(all.filter((place) => place.off).map((place) => place.name)).toEqual(['Table salt in rubbing alcohol: Not on this bench', 'Sugar in rubbing alcohol: Not on this bench'])
    expect(all.filter((place) => place.current).map((place) => place.name)).toEqual(['Table salt in distilled water: Counts'])
    // With a tube shown the table is behind its button where there is no room beside the tube, and the stylesheet says where that is.
    expect(html).toMatch(new RegExp(`<button(?=[^>]*mixing-choose-button)(?=[^>]*aria-expanded="false")[^>]*>${PAGE_TEXT.choose}`))
    expect(html).toMatch(/<div id="[^"]*" class="mixing-chooser grid/)
    expect(bench(fresh(), 'solids')).toMatch(/<div id="[^"]*" class="mixing-chooser mixing-chooser-open grid/)
  })

  it('links each thing that has a molecule in the explorer to it from the start, in a new tab, and no other thing', () => {
    const links = (html: string) => [...html.matchAll(/<a href="#\/explore\/([^"]*)" target="_blank" rel="noopener"[^>]*>([^<]*)</g)].map((match) => [match[1], match[2]])
    const water = ['water', MOLECULE_LINK.water]
    const acid = ['acetic-acid', MOLECULE_LINK.vinegar]
    const sugar = ['sucrose', MOLECULE_LINK.sugar]
    // In the table the tubes are chosen from, and in the bench under every part and tube.
    expect(links(closed(bench(fresh(), 'liquids')))).toEqual([water, acid])
    expect(links(closed(bench(fresh(), 'solids')))).toEqual([water, acid, sugar])
    expect(links(bench(fresh(), 'liquids'))).toEqual([water, acid, water, acid, sugar])
    expect(links(bench(wholeSolids(m, wholePairs(m, fresh())), 'rule'))).toEqual([water, acid, sugar])
    for (const id of ['water', 'acetic-acid', 'sucrose']) expect([...data.liquids, ...data.solids].some((item) => item.moleculeId === id)).toBe(true)
  })

  it('says what the lab and the part ask for until a tube is chosen, and not over a tube', () => {
    const before = text(bench(fresh(), 'liquids'))
    expect(before).toContain(LAB_TEXT.aim)
    expect(before).toContain(PART_AIM.liquids)
    const over = text(bench(fresh(), 'liquids', OIL))
    expect(over).not.toContain(LAB_TEXT.aim)
    expect(over).not.toContain(PART_AIM.liquids)
    expect(text(bench(wholePair(m, fresh(), OIL), 'liquids'))).not.toContain(PART_AIM.liquids)
  })
})

describe('a tube', () => {
  it('has its steps as buttons that stay: which liquid there is more of, the shaking and the standing, each with a tick once done', () => {
    const names = (html: string) => [...html.matchAll(/<button[^>]*data-slot="button"[^>]*>(.*?)<\/button>/gs)].map((match) => [text(match[1]!).trim(), match[0].includes('aria-disabled="true"'), !match[1]!.includes('invisible')] as const)
    const steps = (state: MixingState, id: TubeId) => names(bench(state, id.includes('+') ? 'liquids' : 'solids', id)).filter(([name]) => name !== PAGE_TEXT.choose && name !== FORM_TEXT.record)
    const [water, oil] = [`✓ ${moreLabel(data, 'water')}`, `✓ ${moreLabel(data, 'vegetable-oil')}`]
    const [shake, stand] = [`✓ ${STEP_TEXT.shake}`, `✓ ${STEP_TEXT.stand}`]
    // Each as [its words, whether it cannot be pressed, whether its tick is shown].
    expect(steps(fresh(), OIL)).toEqual([[water, false, false], [oil, false, false], [shake, true, false], [stand, true, false]])
    expect(steps(run(m, fresh(), [filled(OIL, 'vegetable-oil')]), OIL)).toEqual([[water, true, false], [oil, true, true], [shake, false, false], [stand, true, false]])
    expect(steps(stood(fresh(), OIL), OIL)).toEqual([[water, true, true], [oil, true, false], [shake, true, true], [stand, true, true]])
    expect(steps(fresh(), 'sugar-in-vinegar')).toEqual([['✓ Put in the vinegar, then a little sugar', false, false], [shake, true, false], [stand, true, false]])
    // The tick is hidden from a screen reader, which is told instead that a step done is pressed: a step done and a step that cannot be taken yet are both unavailable.
    const pressed = (state: MixingState) => [...bench(state, 'liquids', OIL).matchAll(/<button[^>]*data-slot="button"[^>]*aria-pressed="(true|false)"[^>]*>/g)].map((match) => match[1] === 'true')
    expect(pressed(fresh())).toEqual([false, false, false, false])
    expect(pressed(run(m, fresh(), [filled(OIL, 'vegetable-oil')]))).toEqual([false, true, false, false])
    expect(pressed(stood(fresh(), OIL))).toEqual([true, false, true, true])
  })

  it('draws two liquids that do not mix as two bands with the line between them once the tube has stood and not before, and no bracket or word for a layer until it has been looked at', () => {
    const before = bench(run(m, fresh(), [filled(OIL), { type: 'shake', tube: OIL }]), 'liquids', OIL)
    expect(lines(before)).toHaveLength(1)
    expect(brackets(before)).toEqual([])
    const after = bench(stood(fresh(), OIL), 'liquids', OIL)
    expect(lines(after)).toHaveLength(2)
    expect(lines(after)[1]).toBe(`<line x1="48" x2="128" y1="138" y2="138" stroke="${LAYER_LINE.stroke}" stroke-width="${LAYER_LINE.width}">`)
    expect(brackets(after)).toEqual([])
    expect([...after.matchAll(/data-part="(\w+)"[^>]*aria-label="([^"]*)"/g)].map((match) => [match[1], match[2]])).toEqual([['upper', 'Top layer'], ['lower', 'Bottom layer']])
    // The pale yellow oil over the water: two fills. Two liquids with no colour: one fill twice, and the same line.
    expect(after).toContain(`height="68" fill="${liquidHex('pale yellow')}"`)
    const clear = bench(stood(fresh(), CLEAR), 'liquids', CLEAR)
    expect(count(clear, new RegExp(`<rect x="48"[^>]*fill="${liquidHex('colourless')}"`, 'g'))).toBe(2)
    expect(lines(clear)[1]).toBe(lines(after)[1])
    // Two that mix: one band.
    const one = bench(stood(fresh(), ONE), 'liquids', ONE)
    expect(lines(one)).toHaveLength(1)
    expect(brackets(one)).toEqual([])
  })

  it('draws no bracket at any stage of any tube, in either mode, until a part is looked at or the tube is checked: the number of brackets would say how many layers there are', () => {
    for (const mode of ['guided', 'challenge'] as const) {
      for (const id of [...PAIR_IDS, ...SOLID_TUBE_IDS]) {
        // Filled, stood, and looked at with the card made again, as on a reload: nothing is drawn but the picture.
        for (const state of [run(m, fresh(mode), [filled(id)]), stood(fresh(mode), id), looked(fresh(mode), id)]) expect(brackets(bench(state, id.includes('+') ? 'liquids' : 'solids', id)), id).toEqual([])
      }
    }
    // Recorded in Challenge and not yet checked: still none. Checked, whether or not it counts: every layer has its bracket.
    expect(brackets(bench(wholePair(m, fresh('challenge'), OIL, { check: false }), 'liquids', OIL))).toEqual([])
    expect(brackets(bench(wholePair(m, fresh('challenge'), OIL, { wrong: true }), 'liquids', OIL))).toEqual([PART_LABEL.upper, PART_LABEL.lower])
    expect(brackets(bench(wholePair(m, fresh(), ONE), 'liquids', ONE))).toEqual([PART_LABEL.liquid])
    expect(brackets(bench(wholeSolidTube(m, fresh(), 'salt-in-vegetable-oil'), 'solids', 'salt-in-vegetable-oil'))).toEqual([PART_LABEL.liquid, PART_LABEL.solid])
    expect(brackets(bench(wholeSolidTube(m, fresh(), 'salt-in-water'), 'solids', 'salt-in-water'))).toEqual([PART_LABEL.liquid])
  })

  it('gives a layer its word once it has been looked at, and no word to a layer that has not', () => {
    const two = tubeLayers(tubeView(m, stood(fresh(), OIL), OIL).shows, FULL)
    expect(tubeWords(two, () => false)).toEqual({ liquid: null, above: null, solid: null })
    expect(tubeWords(two, (part) => part === 'upper')).toEqual({ liquid: null, above: PART_LABEL.upper, solid: null })
    expect(tubeWords(two, (part) => part === 'lower')).toEqual({ liquid: PART_LABEL.lower, above: null, solid: null })
    const one = tubeLayers(tubeView(m, stood(fresh(), ONE), ONE).shows, FULL)
    expect(tubeWords(one, (part) => part === 'liquid')).toEqual({ liquid: PART_LABEL.liquid, above: null, solid: null })
    // The words of two layers are not those of one, whichever part of the other kind is said to have been looked at.
    expect(tubeWords(one, (part) => part === 'lower' || part === 'upper').liquid).toBeNull()
  })

  it('says what a tube shows nowhere on the page but in a disclosure that is closed, at every stage of every tube in both modes: a look says it', () => {
    for (const mode of ['guided', 'challenge'] as const) {
      for (const id of [...PAIR_IDS, ...SOLID_TUBE_IDS]) {
        for (const state of [run(m, fresh(mode), [filled(id)]), stood(fresh(mode), id), looked(fresh(mode), id)]) {
          const view = tubeView(m, state, id)
          const html = bench(state, view.kind === 'pair' ? 'liquids' : 'solids', id)
          const open = text(closed(html))
          expect(open, `${id} ${view.stage}`).not.toContain(tubeText(view))
          for (const part of ['upper', 'lower', 'liquid', 'solid'] as const) expect(open, `${id} ${view.stage} ${part}`).not.toContain(partText(view.shows, part))
          // No word a description is made of, either. (That no solid is to be seen is also a choice of the form, which says nothing of this tube.)
          expect(open, `${id} ${view.stage}`).not.toMatch(/clear|cloudy|no colour|pale yellow|thicker|thinner|lying at|spread through|not yet settled/)
          // The whole of it is in the closed disclosure, for a reader who cannot use the picture.
          expect(text(html)).toContain(`${PAGE_TEXT.tubeInWords} ${tubeText(view)}`)
        }
      }
    }
  })

  it('opens what is recorded with the look: one layer or two, and of two which liquid is on top, with which there is more of; or whether the solid is gone', () => {
    const before = text(bench(stood(fresh(), OIL), 'liquids', OIL))
    expect(before).toContain(FORM_TEXT.closed)
    expect(before).not.toContain(FORM_TEXT.layers)
    const first = bench(looked(fresh(), OIL), 'liquids', OIL)
    expect(text(first)).toContain(`${FORM_TEXT.layers} One layer Two layers ${FORM_TEXT.record}`)
    expect(text(first)).not.toContain(FORM_TEXT.top)
    expect(text(first)).toContain(`${PAGE_TEXT.hint} ${TUBE_HINT.layers}`)
    const second = text(bench(run(m, looked(fresh(), OIL), [{ type: 'sayLayers', tube: OIL, is: 'two' }]), 'liquids', OIL))
    expect(second).toContain(`${FORM_TEXT.layers} Two layers ${FORM_TEXT.change}`)
    expect(second).toContain(`In this tube: more distilled water, less vegetable oil. ${FORM_TEXT.topHelp} ${FORM_TEXT.top} Distilled water Vegetable oil ${FORM_TEXT.record}`)
    expect(second).toContain(TUBE_HINT.top)
    const solid = text(bench(looked(fresh(), 'salt-in-vinegar'), 'solids', 'salt-in-vinegar'))
    expect(solid).toContain(`${FORM_TEXT.solid} Gone: no solid is to be seen Still there, at the bottom ${FORM_TEXT.record}`)
    // Challenge has no hint.
    expect(text(bench(looked(fresh('challenge'), OIL), 'liquids', OIL))).not.toContain(PAGE_TEXT.hint)
  })

  it('shows the note and lists what the tube rests on once the tube counts, and not before', () => {
    const cited = (html: string) => text(html.slice(html.lastIndexOf('<summary', html.indexOf('>On the bench<')) - 4000))
    const before = bench(looked(fresh(), OIL), 'liquids', OIL)
    expect(text(before)).not.toContain(tubeNote(data, OIL))
    expect(text(before)).not.toContain(NOTES_TEXT.tube)
    expect(mixingTubeCitations(data, OIL, sources, false)).toEqual([])
    expect(cited(before)).toContain('What this tube rests on is listed here once the tube counts.')
    const after = bench(wholePair(m, fresh(), OIL), 'liquids', OIL)
    expect(text(after)).toContain(`✓ This tube counts. ${NOTES_TEXT.tube} ${tubeNote(data, OIL)}`)
    expect(text(after)).toContain('Whether the two liquids mix')
    expect(text(after)).toContain(`✓ ${FORM_TEXT.layers} Two layers Right ✓ ${FORM_TEXT.top} Vegetable oil Right`)
  })
})

describe('a part that is done', () => {
  it('says so, with its notes, under a tube that counts and under the table alone, and not under a tube tried after that while it is under way', () => {
    const done = wholePairs(m, fresh())
    const [sixth, seventh] = [PAIR_IDS[5]!, PAIR_IDS[6]!]
    const under = (state: MixingState, id: TubeId) => text(bench(state, 'liquids', id))
    expect(benchView(m, done).pairsDone).toBe(true)
    expect(under(done, sixth)).toContain(`${countText(benchView(m, done), 'liquids')} ${NOTES_TEXT.part} ${partNotes(data, 'liquids').join(' ')}`)
    expect(text(bench(done, 'liquids'))).toContain(`${countText(benchView(m, done), 'liquids')} ${NOTES_TEXT.part}`)
    // The seventh tube, from empty to looked at: the page of a tube and no more, as the first six had it.
    for (const state of [done, stood(done, seventh), looked(done, seventh)]) {
      expect(under(state, seventh)).not.toContain(NOTES_TEXT.part)
      expect(under(state, seventh)).not.toContain('this part is done')
    }
    const seven = wholePair(m, done, seventh)
    expect(under(seven, seventh)).toContain(`${countText(benchView(m, seven), 'liquids')} ${NOTES_TEXT.part}`)
  })
})

describe('Challenge shows nothing of what is expected before the answers are recorded and checked (spec 25.5)', () => {
  it('records a wrong answer with no mark, no note and no source that names an outcome, and says why the tube does not count only once it is checked', () => {
    const recorded = wholePair(m, fresh('challenge'), OIL, { wrong: true, check: false })
    const before = bench(recorded, 'liquids', OIL)
    expect(text(before)).toContain(`${FORM_TEXT.layers} One layer ${FORM_TEXT.change}`)
    expect(text(before)).toContain(`Everything is recorded. Check this tube. ${FORM_TEXT.check}`)
    expect(answers(before, FORM_TEXT.heading)).not.toMatch(/✓|✕/)
    expect(text(before)).not.toMatch(/Right|Not right|does not count|This tube counts/)
    expect(text(before)).not.toContain(tubeNote(data, OIL))
    expect(text(before)).not.toMatch(/Whether the two liquids mix|its density|Notes on this tube/)
    expect(places(before).find((place) => place.current)!.name).toBe('Distilled water with vegetable oil: To check')

    const checked = bench(run(m, recorded, [{ type: 'check', tube: OIL }]), 'liquids', OIL)
    expect(text(checked)).toContain(`✕ This tube does not count. ${REASON_TEXT['layers-wrong']} Set it up again in a fresh tube. ${FORM_TEXT.again}`)
    expect(text(checked)).toContain(`✕ ${FORM_TEXT.layers} One layer Not right`)
    // What it should have been is still not said, and its note and its sources stay back.
    expect(text(checked)).not.toContain(tubeNote(data, OIL))
    expect(text(checked)).not.toMatch(/Whether the two liquids mix|Notes on this tube/)
  })

  it("has no liquid's family and no word of the rule on the page of parts 1 and 2 at any point, in either mode, with every disclosure open", () => {
    for (const mode of ['guided', 'challenge'] as const) {
      const pairs = wholePairs(m, fresh(mode), PAIR_IDS.length)
      const all = wholeSolids(m, pairs, SOLID_TUBE_IDS.length)
      for (const [state, part, tube] of [
        [fresh(mode), 'liquids', null],
        [looked(fresh(mode), 'rubbing-alcohol+vegetable-oil'), 'liquids', 'rubbing-alcohol+vegetable-oil'],
        [pairs, 'liquids', null],
        [looked(pairs, 'sugar-in-mineral-oil'), 'solids', 'sugar-in-mineral-oil'],
        [all, 'solids', null],
      ] as const) {
        expect(text(bench(state, part, tube)), `${mode} ${part} ${tube}`).not.toMatch(FAMILY)
      }
      // Every tube's note, shown once it counts, speaks of its own tube: the notes of a tube that counts name no family either.
      for (const id of [...PAIR_IDS, ...SOLID_TUBE_IDS]) expect(text(bench(all, id.includes('+') ? 'liquids' : 'solids', id)), id).not.toMatch(/like water|like oil/i)
    }
  })

  it("takes the sorting and the two answers with no mark and no note until part 3 is checked, and lists the sources of the families only once it is done", () => {
    const open = wholeSolids(m, wholePairs(m, fresh('challenge')))
    const wrong = run(m, open, [...LIQUID_IDS.map((liquid): Action => ({ type: 'sort', liquid, family: 'oil' })), { type: 'answer', question: 'grease', is: 'mixes' }, { type: 'answer', question: 'epsom-salt', is: 'dissolves' }])
    const before = bench(wrong, 'rule')
    expect(count(before, /role="radiogroup"/g)).toBe(7)
    expect(count(before, /type="radio"[^>]*checked=""/g)).toBe(7)
    expect(answers(before, RULE_TEXT.sortHeading)).toContain(RULE_TEXT.questionsHeading)
    expect(answers(before, RULE_TEXT.sortHeading)).not.toMatch(/✓|✕/)
    expect(text(before)).toContain(`All answered. Check this part. ${RULE_TEXT.check}`)
    for (const note of partNotes(data, 'rule')) expect(text(before)).not.toContain(note)
    expect(text(before)).not.toMatch(/its family|The two questions:/)
    expect(mixingPartCitations(data, 'rule', sources, false).flatMap((cited) => cited.covers).join(' ')).not.toMatch(/family/)

    const checked = text(bench(run(m, wrong, [{ type: 'checkRule' }]), 'rule'))
    expect(checked).toContain('✓ Vegetable oil: like oil Right')
    expect(checked).toContain('✕ Vinegar: like oil Not right')
    expect(checked).toContain(`✕ Not everything is right. The marks show which. Answer again. ${RULE_TEXT.again}`)
    for (const note of partNotes(data, 'rule')) expect(checked).not.toContain(note)
  })
})

describe('part 3: the rule', () => {
  it('says what opens it until parts 1 and 2 are done', () => {
    const html = text(bench(wholePairs(m, fresh()), 'rule'))
    expect(html).toContain(RULE_TEXT.closed)
    expect(html).not.toContain(RULE_TEXT.sortIntro)
    expect(html).not.toMatch(FAMILY)
  })

  it('asks where each of the five liquids goes, with the two families as choices, and the two questions once all five are sorted', () => {
    const open = wholeSolids(m, wholePairs(m, fresh()))
    const first = bench(open, 'rule')
    expect(count(first, /role="radiogroup"/g)).toBe(5)
    for (const liquid of LIQUID_IDS) expect(text(first)).toContain(`${liquidName(data, liquid)} Which does the ${liquidName(data, liquid).toLowerCase()} go with? ${FAMILY_LABEL.water} ${FAMILY_LABEL.oil}`)
    expect(text(first)).not.toContain(RULE_TEXT.questionsHeading)
    expect(text(first)).toContain(`${PAGE_TEXT.hint} ${RULE_TEXT.sortHint}`)
    // Nothing is chosen for the learner.
    expect(first).not.toMatch(/type="radio"[^>]*checked=""/)

    const sorted = run(m, open, LIQUID_IDS.map((liquid): Action => ({ type: 'sort', liquid, family: m.liquids.find((one) => one.id === liquid)!.family })))
    const second = bench(sorted, 'rule')
    expect(count(second, /role="radiogroup"/g)).toBe(7)
    expect(text(second)).toContain(`${RULE_TEXT.questionsHeading} ${questionText(data, 'grease')} It mixes into the water It stays apart from the water`)
    expect(text(second)).toContain(`${PAGE_TEXT.hint} ${RULE_TEXT.questionHint}`)
    // Guided has taken each of the five, and marks it; the hint for the sorting has gone with the last.
    expect(count(second, /✓ <\/span><span class="font-medium">/g)).toBe(5)
    expect(text(second)).not.toContain(RULE_TEXT.sortHint)
  })

  it('shows its notes once it is done, says that the lab is complete, and lists what the notes rest on', () => {
    const done = text(bench(wholeLab(m, fresh()), 'rule'))
    expect(done).toContain(`✓ ${LAB_TEXT.completed}`)
    expect(done).toContain(`✓ Everything is right: this part is done. ${NOTES_TEXT.part} ${partNotes(data, 'rule').join(' ')}`)
    expect(done).toContain('its family')
    expect(done).not.toContain(LAB_TEXT.complete)
  })
})

describe('the bench and the hazards', () => {
  it("is in one place under every part and every tube, closed: what stands on the bench, the rubbing alcohol's tile with its hazards, and the note the kitchen things share", () => {
    const rule = wholeSolids(m, wholePairs(m, fresh()))
    for (const html of [bench(fresh(), 'liquids'), bench(looked(fresh(), OIL), 'liquids', OIL), bench(fresh(), 'solids', 'salt-in-water'), bench(rule, 'rule')]) {
      expect(count(html, new RegExp(`<summary[^>]*>${PAGE_TEXT.bench}</summary>`, 'g'))).toBe(1)
      const inside = text(html.slice(html.indexOf(`>${PAGE_TEXT.bench}</summary>`)))
      expect(inside).toContain('Five liquids, each in a dropper bottle')
      expect(inside).toContain('Rubbing alcohol: 2-Propanol (isopropyl alcohol) in water, about 70% by volume')
      expect(inside).toContain(`${HAZARD_TEXT.heading} Rubbing alcohol`)
      expect(inside).toContain(data.reagents[0]!.classifiedAs)
      expect(inside).toContain(`Signal word: ${data.reagents[0]!.hazards.signalWord}`)
      for (const statement of data.reagents[0]!.hazards.statements) expect(inside).toContain(statement)
      expect(inside).toContain(`${HAZARD_TEXT.others} ${data.sharedNote.value}`)
      // None of it is on the page until the bench is opened.
      expect(text(closed(html))).not.toContain('Signal word')
    }
    expect(data.reagents).toHaveLength(1)
  })
})

describe('the Record tab', () => {
  const record = (state: MixingState) => text(draw(createElement(MixingRecord, { data, m, state })))

  it('says that no tube has been set up, and then lists each tube begun with which liquid there was more of, what was recorded and how it came out', () => {
    expect(record(fresh())).toContain(RECORD_TEXT.empty)
    const state = wholeSolidTube(m, wholePair(m, wholePair(m, stood(fresh('challenge'), ONE), OIL, { more: 'vegetable-oil' }), CLEAR, { wrong: true }), 'salt-in-vinegar', { check: false })
    const html = record(state)
    expect(html).toContain(`${RECORD_TEXT.tube} ${RECORD_TEXT.amounts} ${RECORD_TEXT.recorded} ${RECORD_TEXT.result}`)
    expect(html).toContain('Distilled water with vinegar Distilled water Nothing recorded yet Not finished')
    expect(html).toContain('Distilled water with vegetable oil Vegetable oil Two layers, vegetable oil on top ✓ Counts')
    expect(html).toContain(`Distilled water with mineral oil Distilled water One layer Does not count ${REASON_TEXT['layers-wrong']}`)
    expect(html).toContain('Table salt in vinegar – The solid is gone To check')
    expect(html).not.toContain('Sugar in')
    // Part 3 is not open: nothing of it is listed.
    expect(html).not.toContain(RECORD_TEXT.sorting)
    expect(html).not.toMatch(FAMILY)
  })

  it("lists part 3's answers once it is open, each with a mark only once it is judged", () => {
    const open = wholeSolids(m, wholePairs(m, fresh('challenge')))
    const given = run(m, open, [{ type: 'sort', liquid: 'vinegar', family: 'oil' }])
    expect(record(given)).toContain(`${RECORD_TEXT.sorting} Distilled water: not sorted yet Rubbing alcohol: not sorted yet Vinegar: like oil · Not checked yet`)
    expect(record(given)).toContain(`${questionText(data, 'grease')} ${RECORD_TEXT.notAsked}`)
    const done = record(wholeLab(m, fresh()))
    expect(done).toContain(`✓ ${LAB_TEXT.completed}`)
    expect(done).toContain('Vinegar: like water · Right')
    expect(done).toContain(`${questionText(data, 'epsom-salt')} It stays a solid · Right`)
  })
})

describe("the lab's stylesheet", () => {
  it('moves nothing: it has no animation and no transition', () => {
    expect(mixingCss).not.toMatch(/animation|transition|@keyframes/)
  })

  it('puts the table beside the tube only where the part is 76rem wide, and behind its button elsewhere', () => {
    expect(mixingCss).toMatch(/\.mixing-chooser \{\s*display: none;\s*\}\s*\.mixing-chooser-open \{\s*display: grid;/)
    expect(mixingCss).toMatch(/@container mixing-part \(min-width: 76rem\) \{[^@]*\.mixing-choose-button \{\s*display: none;\s*\}\s*\.mixing-chooser \{\s*display: grid;/)
    expect(mixingCss).toMatch(/@container mixing-tube \(min-width: 26rem\) \{\s*\.mixing-tube-grid \{\s*grid-template-columns: minmax\(0, 17\.5rem\) minmax\(0, 1fr\);/)
  })

  it("puts part 3's two sheets side by side where the part is 46rem wide, the sorting having the whole card until the questions come", () => {
    expect(mixingCss).toMatch(/@container mixing-part \(min-width: 46rem\) \{\s*\.mixing-rule-card \{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);\s*\}\s*\.mixing-rule-card > :only-child \{\s*grid-column: 1 \/ -1;/)
    const open = wholeSolids(m, wholePairs(m, fresh()))
    expect(count(bench(open, 'rule'), /class="mixing-rule-card /g)).toBe(1)
    expect(count(bench(wholeRule(m, open), 'rule'), /class="mixing-rule-card /g)).toBe(1)
  })

  it('asks what is seen beside the picture where a tube\'s card is 46rem wide, which it is wherever the table stands beside it, and under the picture elsewhere', () => {
    expect(mixingCss).toMatch(/@container mixing-tube \(min-width: 46rem\) \{\s*\.mixing-tube-card \{\s*grid-template-columns: 31rem minmax\(0, 1fr\);/)
    // The table's 29rem and the gap of 0.75rem leave a tube 46rem or more of a part that is 76rem wide.
    expect(76 - 29 - 0.75).toBeGreaterThanOrEqual(46)
    expect(bench(stood(fresh(), OIL), 'liquids', OIL)).toContain('class="mixing-tube-card ')
  })

})
