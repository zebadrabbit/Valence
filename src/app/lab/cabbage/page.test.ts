import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ACTIVITIES } from '@/app/activities'
import { liquidHex } from '@/app/lab/tubeDrawing'
import { labProgress } from '@/app/lab/useLabProgress'
import { createMemoryStore, type KeyValueStore } from '@/app/progress/storage'
import { routes } from '@/app/routes'
import { cabbageData as data, THING_IDS, type PartId, type ThingId } from '@/chem-data/cabbage/data'
import { CABBAGE_PRIMER } from '@/chem-data/cabbage/primer'
import sources from '@/chem-data/sources.json'
import { cabbageStateSchema, createLab, modelFrom, rackView, sampleView, unitView, type Action, type CabbageState, type Mode } from '@/engine/cabbage'
import { byEye, classOf, run, wholeLab, wholeSample, wholeScale, wholeThings } from '@/engine/cabbage/testkit'
import { CabbageBench, labelLines } from './CabbageBench'
import cabbageCss from './cabbage.css?raw'
import { CabbagePage } from './CabbagePage'
import { CabbageRecord } from './CabbageRecord'
import {
  BLOCKED_TEXT,
  HAZARD_TEXT,
  LAB_TEXT,
  MARK_TEXT,
  NOTES_TEXT,
  PAGE_TEXT,
  PART_AIM,
  RACK_TEXT,
  REASON_TEXT,
  RECORD_TEXT,
  SAMPLE_TEXT,
  UNIT_TEXT,
  colourLabel,
  partNotes,
  phText,
  probeWarning,
  scaleQuestionText,
  thingName,
  thingNote,
  unitQuestionText,
} from './messages'
import { attempt, opening, partStatus, thingStatus } from './pageLook'

// The red cabbage pH lab's page as markup, on a store the test holds. AppStateProvider builds its store from the
// browser and the media hook has no value on a server, so both are given directly. What a press does (a tube
// looked at or chosen, an estimate recorded, the probe rinsed and read, a check) is state, and is checked in a
// browser: a markup render mounts the page and no more.
const app = vi.hoisted(() => ({ store: undefined as unknown as KeyValueStore, persistent: true, wide: true }))
vi.mock('@/app/AppState', () => ({ useAppState: () => ({ store: app.store, persistent: app.persistent, reducedMotion: false }) }))
vi.mock('@/app/useMediaQuery', () => ({ useMediaQuery: () => app.wide }))

const cabbage = ACTIVITIES.find((activity) => activity.to === '/lab/red-cabbage-ph')!
const m = modelFrom(data)
const SCHEMA = cabbageStateSchema(m)
const draw = (element: ReactElement) => renderToStaticMarkup(createElement(MemoryRouter, null, element))
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replaceAll('&#x27;', "'").replaceAll('&amp;', '&').replace(/\s+/g, ' ')
/** The markup with every disclosure taken out: what is on the page before anything is opened. */
function closed(html: string): string {
  // From the innermost out: a tile of the bench has its hazards in a disclosure of its own.
  const without = html.replace(/<details(?:(?!<details).)*?<\/details>/gs, '')
  return without === html ? html : closed(without)
}
const selectedTab = (html: string) => [...html.matchAll(/<button[^>]*role="tab"[^>]*>([^<]*)<\/button>/g)].filter((match) => match[0].includes('aria-selected="true"')).map((match) => match[1])
/** The drawing's value for the liquid of each tube of every rack in the markup, in order. */
const fills = (html: string) => [...html.matchAll(/<rect x="0" y="22" width="32" height="52" fill="(#[0-9a-f]{6})"/g)].map((match) => match[1]!)

const fresh = (mode: Mode = 'guided', seed = 7) => createLab(mode, seed)
const scale = (mode?: Mode) => wholeScale(m, fresh(mode))
const bench = (state: CabbageState, part: PartId, thing?: ThingId) => draw(createElement(CabbageBench, { data, m, sources, state, act: () => undefined, opensAt: thing === undefined ? { part } : { part, thing } }))
/** A thing with the indicator in and looked at; and with the careful estimate by eye recorded. */
const lookedAt = (state: CabbageState, thing: ThingId) => run(m, state, [{ type: 'addIndicator', thing }, { type: 'look', thing }])
function estimated(state: CabbageState, thing: ThingId): CabbageState {
  const next = lookedAt(state, thing)
  const estimate = byEye(rackView(m, next), sampleView(m, next, thing))
  return run(m, next, [{ type: 'estimate', thing, is: estimate }, ...(typeof estimate === 'number' ? [{ type: 'classify', thing, is: classOf(estimate) } satisfies Action] : [])])
}
/** What a rinsed probe reads in a thing in this lab, as the page words it. */
const readingOf = (thing: ThingId, mode?: Mode) => phText(sampleView(m, wholeSample(m, scale(mode), thing), thing).reading!.tenths)

// The drawing's colours, as numbers: how light a colour is (its relative luminance), how far two are apart in it
// (the ratio of contrast), and a colour's lightness and hue (OKLCH). Worked out here and nowhere in the app.
const channels = (hex: string) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number]
const luminance = (hex: string) => {
  const [r, g, b] = channels(hex)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: string, b: string) => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (high! + 0.05) / (low! + 0.05)
}
function lightnessAndHue(hex: string): [lightness: number, hue: number] {
  const [r, g, b] = channels(hex)
  const [l, mm, s] = [0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b, 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b, 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b].map(Math.cbrt) as [number, number, number]
  const [A, B] = [1.9779984951 * l - 2.428592205 * mm + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * mm - 0.808675766 * s]
  return [0.2104542553 * l + 0.793617785 * mm - 0.0040720468 * s, ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360]
}

beforeEach(() => {
  app.store = createMemoryStore()
  app.persistent = true
  app.wide = true
})

describe('the colours the scale is drawn in', () => {
  const words = rackView(m, scale()).tubes.map((tube) => tube.shows.liquid!.colour)

  it('has a value of its own for each of the twelve colours of the indicator and for the three looks of a thing before it goes in', () => {
    const all = [...m.colours, m.bleached, 'pale yellow', 'white']
    expect(m.colours).toHaveLength(12)
    expect(new Set(all.map(liquidHex)).size).toBe(15)
    for (const word of all) expect(liquidHex(word), word).not.toBe(liquidHex('a colour with no value'))
  })

  it("leaves the values another lab draws as they were: the Le Chatelier's principle lab's blue and yellow, and the liquid with no colour", () => {
    expect([liquidHex('blue'), liquidHex('yellow'), liquidHex('colourless')]).toEqual(['#1d3ea6', '#f6d93f', '#e8edf2'])
  })

  it('tells each tube of the rack from the tubes either side wherever their words differ: by 1.4 to 1 or more in contrast, and in lightness or strongly in hue', () => {
    const same: number[] = []
    words.slice(1).forEach((word, at) => {
      const [a, b] = [liquidHex(words[at]!), liquidHex(word)]
      if (word === words[at]) return void same.push(at + 1)
      const [[la, ha], [lb, hb]] = [lightnessAndHue(a), lightnessAndHue(b)]
      const turn = Math.min(Math.abs(ha - hb), 360 - Math.abs(ha - hb))
      expect(contrast(a, b), `pH ${at + 1} and pH ${at + 2}`).toBeGreaterThanOrEqual(1.4)
      expect(Math.abs(la - lb) >= 0.14 || turn >= 25, `pH ${at + 1} and pH ${at + 2}: ${Math.abs(la - lb).toFixed(2)} in lightness, ${turn.toFixed(0)} degrees of hue`).toBe(true)
    })
    // The pH 11 and pH 12 buffers share a word, and so a value: the rack shows them the same.
    expect(same).toEqual([11])
    expect(liquidHex(words[10]!)).toBe(liquidHex(words[11]!))
  })

  it('draws the rack darkest at pH 7 and lighter from there to each end but for the two at the acid end', () => {
    const light = words.map((word) => luminance(liquidHex(word)))
    expect(light.indexOf(Math.min(...light))).toBe(6)
    for (let at = 7; at < 13; at++) expect(light[at]!, `pH ${at + 1}`).toBeGreaterThanOrEqual(light[at - 1]!)
  })
})

describe('the route, the list of activities and the stored lab', () => {
  it('is listed as "Red cabbage pH" at its own address, which the routes load lazily', () => {
    expect(cabbage.title).toBe('Red cabbage pH')
    expect(LAB_TEXT.title).toBe(cabbage.title)
    const route = routes[0]!.children!.find((child) => child.path === 'lab/red-cabbage-ph')!
    expect(typeof route.lazy).toBe('function')
  })

  it('opens on the primer and stores nothing until Start; with a lab stored it opens on the Lab tab where the learner was', () => {
    const before = draw(createElement(CabbagePage))
    expect(selectedTab(before)).toEqual(['Primer'])
    expect(labProgress(app.store, cabbage, SCHEMA).load()).toBeNull()
    for (const section of CABBAGE_PRIMER) expect(text(before)).toContain(section.heading)

    const under = lookedAt(scale(), 'shampoo')
    expect(labProgress(app.store, cabbage, SCHEMA).save(under)).toBe(true)
    const after = draw(createElement(CabbagePage))
    expect(selectedTab(after)).toEqual(['Lab'])
    expect(after).toMatch(new RegExp(`<h2[^>]*>${thingName(data, 'shampoo')}</h2>`))
    // The stored record is the engine's own, and comes back as it went in.
    expect(labProgress(app.store, cabbage, SCHEMA).load()).toEqual(under)
  })
})

describe('where the page opens, and what it sends on', () => {
  it('opens on the scale until the rack is made, then on a thing that is begun, then on the first part not done', () => {
    expect(opening(m, fresh())).toEqual({ part: 'scale', thing: 'vinegar' })
    const filled = run(m, fresh(), [{ type: 'fillRack' }])
    expect(opening(m, filled).part).toBe('scale')
    expect(opening(m, lookedAt(filled, 'bleach'))).toEqual({ part: 'things', thing: 'bleach' })
    expect(opening(m, scale())).toEqual({ part: 'things', thing: 'vinegar' })
    expect(opening(m, wholeSample(m, scale(), 'vinegar'))).toEqual({ part: 'things', thing: 'lemon-juice' })
    expect(opening(m, wholeThings(m, scale())).part).toBe('unit')
    expect(opening(m, wholeLab(m, fresh())).part).toBe('unit')
    expect(opening(m, lookedAt(wholeLab(m, fresh()), 'epsom-salt'))).toEqual({ part: 'things', thing: 'epsom-salt' })
  })

  it('sends several actions as one press as far as the first the engine does not take', () => {
    const state = lookedAt(scale(), 'vinegar')
    const right = byEye(rackView(m, state), sampleView(m, state, 'vinegar')) as number
    const wrongTube = right > 7 ? 1 : 13
    expect(attempt(m, state, [{ type: 'estimate', thing: 'vinegar', is: right }, { type: 'classify', thing: 'vinegar', is: 'acid' }])).toEqual({ done: [expect.anything(), expect.anything()], refused: null })
    // Guided takes no estimate that is not near enough, and acid, neutral or basic is then not tried.
    expect(attempt(m, state, [{ type: 'estimate', thing: 'vinegar', is: wrongTube }, { type: 'classify', thing: 'vinegar', is: 'acid' }])).toEqual({ done: [], refused: 'estimate-off' })
    expect(attempt(m, state, [{ type: 'estimate', thing: 'vinegar', is: right }, { type: 'classify', thing: 'vinegar', is: 'basic' }])).toEqual({ done: [{ type: 'estimate', thing: 'vinegar', is: right }], refused: 'class-wrong' })
  })

  it('says how a thing and a part stand in a word or two beside a mark', () => {
    const state = wholeSample(m, lookedAt(scale(), 'bleach'), 'vinegar')
    expect(THING_IDS.slice(0, 2).concat('bleach').map((id) => thingStatus(sampleView(m, state, id)))).toEqual([
      { mark: '✓', text: RECORD_TEXT.counts, done: true },
      { mark: '○', text: 'Not begun', done: false },
      { mark: '◔', text: 'Under way', done: false },
    ])
    expect(Object.values(partStatus(m, state)).map((status) => status.text)).toEqual(['Done', '1 of 8 count', 'Not open yet'])
    expect(Object.values(partStatus(m, wholeLab(m, fresh()))).map((status) => `${status.mark} ${status.text}`)).toEqual(['✓ Done', '✓ 8 of 8 count', '✓ Done'])
  })
})

describe('what the lab and a part ask for', () => {
  it('stands over a lab that is not begun and over a part that is not, and is not drawn again once it is', () => {
    expect(text(bench(fresh(), 'scale'))).toContain(`${LAB_TEXT.aim} `)
    expect(text(bench(fresh(), 'scale'))).toContain(PART_AIM.scale)
    expect(text(bench(scale(), 'scale'))).not.toContain(PART_AIM.scale)
    expect(text(bench(scale(), 'scale'))).not.toContain(LAB_TEXT.aim)
    expect(text(bench(scale(), 'things', 'vinegar'))).toContain(PART_AIM.things)
    expect(text(bench(lookedAt(scale(), 'vinegar'), 'things', 'vinegar'))).not.toContain(PART_AIM.things)
    expect(text(bench(wholeThings(m, scale()), 'unit'))).toContain(PART_AIM.unit)
  })
})

describe('part 1: the rack', () => {
  it('is thirteen tubes in order, each a button named by its pH, and one stop of the Tab key', () => {
    const html = bench(fresh(), 'scale')
    const tubes = [...html.matchAll(/<button type="button" data-part="(\d+)" tabindex="(-?\d)"[^>]*>.*?<\/button>/gs)]
    expect(tubes.map((tube) => Number(tube[1]))).toEqual(m.phs)
    expect(tubes.map((tube) => text(tube[0]).trim())).toEqual(m.phs.map((ph) => `pH ${ph}`))
    expect(tubes.map((tube) => tube[2])).toEqual(['0', ...Array<string>(12).fill('-1')])
    expect(html).toContain(`role="group" aria-label="${RACK_TEXT.heading}"`)
  })

  it('is drawn with no colour until the indicator is in, and then in the value of each colour word', () => {
    expect(new Set(fills(bench(fresh(), 'scale')))).toEqual(new Set([liquidHex('colourless')]))
    const filled = run(m, fresh(), [{ type: 'fillRack' }])
    expect(fills(bench(filled, 'scale'))).toEqual(rackView(m, filled).tubes.map((tube) => liquidHex(tube.shows.liquid!.colour)))
  })

  it('says no colour in words until a tube is looked at, outside the closed disclosure that says the whole rack; the questions come with the look', () => {
    const filled = run(m, fresh(), [{ type: 'fillRack' }])
    const html = bench(filled, 'scale')
    for (const colour of m.colours) expect(text(closed(html)), colour).not.toMatch(new RegExp(`\\b${colour}\\b`, 'i'))
    expect(text(html)).toContain('pH 3: a clear rose liquid.')
    expect(html).not.toContain(RACK_TEXT.questions)

    const looked = run(m, filled, [{ type: 'lookRack' }])
    const open = bench(looked, 'scale')
    // One question at a time: the first, with the twelve colours to choose from.
    expect([...open.matchAll(/<legend/g)]).toHaveLength(1)
    expect(text(open)).toContain(scaleQuestionText(rackView(m, looked).questions[0]!))
    for (const colour of m.colours) expect(open).toContain(`${colourLabel(colour)}</label>`)
    // Guided's hint is a disclosure that is closed; Challenge has none.
    const hint = `>${RACK_TEXT.hint}</summary>`
    expect(open).toContain(hint)
    expect(open).not.toContain('<details open')
    expect(bench(run(m, { ...filled, mode: 'challenge' }, [{ type: 'lookRack' }]), 'scale')).not.toContain(hint)
  })

  it("shows the part's notes once its three answers are right, and in Challenge nothing of a wrong answer until the check", () => {
    const [first] = partNotes(data, 'scale')
    expect(text(bench(run(m, fresh(), [{ type: 'fillRack' }, { type: 'lookRack' }]), 'scale'))).not.toContain(first)
    const done = text(bench(scale(), 'scale'))
    expect(done).toContain(NOTES_TEXT.part)
    expect(done).toContain(first)

    const unchecked = text(bench(wholeScale(m, fresh('challenge'), { wrong: true, check: false }), 'scale'))
    expect(unchecked).toContain(RACK_TEXT.check)
    expect(unchecked).not.toContain(MARK_TEXT.wrong)
    expect(unchecked).not.toContain(first)
    const checked = text(bench(wholeScale(m, fresh('challenge'), { wrong: true }), 'scale'))
    expect(checked).toContain(MARK_TEXT.wrong)
    expect(checked).toContain(RACK_TEXT.again)
    expect(checked).not.toContain(first)
  })
})

describe('part 2: a household thing', () => {
  it('waits for the rack, and then lists the fourteen things with how each stands', () => {
    expect(text(bench(fresh(), 'things'))).toContain(BLOCKED_TEXT['rack-not-made'])
    const html = bench(wholeSample(m, scale(), 'vinegar'), 'things', 'lemon-juice')
    for (const id of THING_IDS) expect(text(html)).toContain(thingName(data, id))
    expect(text(html)).toContain(`${thingName(data, 'vinegar')} ✓ ${RECORD_TEXT.counts}`)
    expect(text(html)).toContain('1 of 8 count')
  })

  it('keeps the scale beside every sample: thirteen tubes that can be chosen, in their colours, and the choice that the indicator cannot say', () => {
    const state = estimated(scale(), 'apple-juice')
    const html = bench(state, 'things', 'apple-juice')
    expect(html).toContain(`role="group" aria-label="${RACK_TEXT.kept}"`)
    expect(fills(html)).toEqual(rackView(m, state).tubes.map((tube) => liquidHex(tube.shows.liquid!.colour)))
    const pressed = [...html.matchAll(/<button type="button" data-part="(\d+)" tabindex="-?\d" aria-pressed="(true|false)"/g)]
    expect(pressed).toHaveLength(13)
    // The tube recorded is the one marked as chosen, and is the rack's stop of the Tab key.
    expect(pressed.filter((tube) => tube[2] === 'true').map((tube) => Number(tube[1]))).toEqual([sampleView(m, state, 'apple-juice').estimate])
    expect(html).toMatch(new RegExp(`<button type="button" aria-pressed="false"[^>]*>${SAMPLE_TEXT.cannotSay}</button>`))
  })

  it.each(['guided', 'challenge'] as const)('says no pH of a thing before the meter is read in it, and no note before it counts (%s)', (mode) => {
    for (const thing of THING_IDS) {
      const reading = readingOf(thing, mode)
      const stages = [scale(mode), lookedAt(scale(mode), thing), estimated(scale(mode), thing)]
      for (const [at, state] of stages.entries()) {
        const html = text(bench(state, 'things', thing))
        expect(html, `${thing} at stage ${at}`).not.toContain(reading)
        expect(html, `${thing} at stage ${at}`).not.toContain(thingNote(data, thing))
        expect(html, `${thing} at stage ${at}`).not.toContain(MARK_TEXT.wrong)
      }
      // With the meter read: the reading, large; in Challenge nothing more until the check.
      const read = run(m, estimated(scale(mode), thing), [{ type: 'read', thing }])
      const after = text(bench(read, 'things', thing))
      expect(after, thing).toContain(reading)
      expect(after.includes(thingNote(data, thing)), thing).toBe(mode === 'guided')
      if (mode === 'challenge') expect(after, thing).not.toContain(`✓ ${MARK_TEXT.right}`)
      expect(text(bench(run(m, read, mode === 'challenge' ? [{ type: 'checkSample', thing }] : []), 'things', thing)), thing).toContain(thingNote(data, thing))
    }
  })

  it('says what is seen of a tube only when it is looked at: the words are not in the page', () => {
    const html = bench(lookedAt(scale(), 'lemon-juice'), 'things', 'lemon-juice')
    expect(closed(html)).not.toMatch(/cloudy|dark pink/)
    // That it has been looked at is in the name of the liquid's button.
    expect(html).toContain(`aria-label="${SAMPLE_TEXT.look}, ${PAGE_TEXT.looked}"`)
  })

  it('draws a cloudy liquid with wisps, so that it is told from a clear one by more than a word', () => {
    const wisps = /q 3 -3 6 0 t 6 0/
    expect(bench(scale(), 'things', 'antacid')).toMatch(wisps)
    expect(bench(scale(), 'things', 'vinegar')).not.toMatch(wisps)
  })

  it("gives Guided's warning before an unrinsed probe reads, and in Challenge reads; an unrinsed reading does not count, and says why once checked", () => {
    const toRead = (mode: Mode) => run(m, estimated(wholeSample(m, scale(mode), 'vinegar'), 'lemon-juice'), [{ type: 'read', thing: 'lemon-juice' }])
    const warned = text(bench(toRead('guided'), 'things', 'lemon-juice'))
    expect(warned).toContain(probeWarning(data, 'vinegar'))
    expect(warned).toContain(SAMPLE_TEXT.notRead)

    const read = toRead('challenge')
    const unchecked = text(bench(read, 'things', 'lemon-juice'))
    expect(unchecked).not.toContain(probeWarning(data, 'vinegar'))
    expect(unchecked).toContain(phText(sampleView(m, read, 'lemon-juice').reading!.tenths))
    expect(unchecked).not.toContain(REASON_TEXT['probe-unrinsed'])
    expect(unchecked).toContain(SAMPLE_TEXT.check)
    const checked = text(bench(run(m, read, [{ type: 'checkSample', thing: 'lemon-juice' }]), 'things', 'lemon-juice'))
    expect(checked).toContain(REASON_TEXT['probe-unrinsed'])
    expect(checked).toContain(SAMPLE_TEXT.again)
  })

  it('has the bench in one place under every part and thing: seven bottles with their hazards, and the shared note', () => {
    for (const html of [bench(fresh(), 'scale'), bench(scale(), 'things', 'bleach'), bench(scale(), 'things', 'vinegar'), bench(scale(), 'unit')]) {
      // The sources and the bench stand apart, so that the hit area over one cannot lie over the other.
      expect(html).toContain('<div class="mt-4 grid gap-9 text-sm">')
      const tiles = [...html.matchAll(/role="group" aria-label="([^"]+)" class="grid grid-cols-\[6rem/g)].map((match) => match[1])
      expect(tiles).toEqual(data.reagents.map((reagent) => reagent.name))
      expect(text(html)).toContain(data.sharedNote.value.replaceAll('’', '’'))
    }
    // A thing with no bottle of its own has the shared note under its own name; one that is a laboratory chemical has its tile.
    expect(bench(scale(), 'things', 'vinegar')).toContain(`<h4 class="font-medium">${thingName(data, 'vinegar')}</h4>`)
    expect(bench(scale(), 'things', 'bleach')).toContain(`<h4 class="font-medium">${HAZARD_TEXT.others}</h4>`)
    expect(data.reagents.map(labelLines)).toEqual([['Buffer', 'pH 1'], ['Buffer', 'pH 13'], ['Indicator'], ['Household', 'ammonia'], ['Bleach'], ['Drain', 'cleaner'], ['Laboratory', 'detergent']])
  })
})

describe('part 3: what a unit means', () => {
  it('says what opens it until eight things count, and then asks one question at a time with the readings it is drawn from', () => {
    expect(text(bench(scale(), 'unit'))).toContain(UNIT_TEXT.closed)
    const state = wholeThings(m, scale())
    const [first, second] = unitView(m, state).questions
    const html = text(bench(state, 'unit'))
    expect(html).toContain(`${unitQuestionText(data, first!)} ${UNIT_TEXT.more}`)
    expect(html).not.toContain(unitQuestionText(data, second!).split('. ')[1])
    expect(html).toContain('1,000,000,000,000 times')
    expect(text(bench(wholeLab(m, fresh()), 'unit'))).toContain(partNotes(data, 'unit')[0])
  })
})

describe('the Record tab', () => {
  const record = (state: CabbageState) => text(draw(createElement(CabbageRecord, { data, m, state })))

  it('says that nothing is measured yet, and then lists each thing begun with what was said by eye, the reading once read, and how it came out', () => {
    expect(record(fresh())).toContain(RECORD_TEXT.empty)
    const state = estimated(wholeSample(m, scale(), 'vinegar'), 'bleach')
    const html = record(state)
    expect(html).toContain(`${thingName(data, 'vinegar')} `)
    expect(html).toContain(readingOf('vinegar'))
    expect(html).toContain(RECORD_TEXT.counts)
    // Bleach: the indicator cannot say, acid, neutral or basic is not asked, and the meter is not read yet.
    expect(html).toContain(`${SAMPLE_TEXT.cannotSay} ${RECORD_TEXT.notAsked} ${SAMPLE_TEXT.notRead} ${RECORD_TEXT.open}`)
    expect(html).not.toContain(readingOf('bleach'))
    expect(html).not.toContain(thingName(data, 'shampoo'))
    expect(record(wholeLab(m, fresh()))).toContain(LAB_TEXT.completed)
  })
})

describe("the lab's stylesheet", () => {
  it('moves nothing: it has no animation and no transition', () => {
    expect(cabbageCss).not.toMatch(/animation|transition|@keyframes/)
  })

  it('puts the rack in one row only where each of thirteen tubes is a finger wide, and in two shelves of seven where it is not', () => {
    expect(cabbageCss).toMatch(/grid-template-columns: repeat\(7, minmax\(0, 1fr\)\)/)
    expect(cabbageCss).toMatch(/@container cabbage-rack \(min-width: 36rem\) \{\s*\.cabbage-rack-grid \{\s*grid-template-columns: repeat\(13,/)
    // 36rem is 576 px: thirteen tubes of 44 px are 572.
    expect(36 * 16).toBeGreaterThanOrEqual(13 * 44)
  })
})
