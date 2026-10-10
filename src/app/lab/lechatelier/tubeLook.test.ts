import { describe, expect, it } from 'vitest'
import { TUBE_HEIGHT, liquidHex, sectionsOf, solidHex, surfaceOf, tubeLayers } from '@/app/lab/tubeDrawing'
import { contentsEnd } from '@/app/lab/Tube'
import { SYSTEM_IDS, TUBE_IDS, lechatelierData as data, type SystemId } from '@/chem-data/lechatelier/data'
import { createLab, modelFrom, reduce, systemView, type LechatelierState, type SystemView } from '@/engine/lechatelier'
import { run, wholeLab, wholeSystem, workDisturbance } from '@/engine/lechatelier/testkit'
import { fullMicrolitres, openingEntry, openingSystem, tubeGroup } from './tubeLook'

const m = modelFrom(data)
const views = (state: LechatelierState) => Object.fromEntries(SYSTEM_IDS.map((id) => [id, systemView(m, state, id)])) as Record<SystemId, SystemView>

// The drawing's colours, as numbers: how light a colour is (its relative luminance), how far two are apart in it
// (the ratio of contrast), and a colour in lightness, chroma and hue (OKLCH). Worked out here and nowhere in the app.
const channels = (hex: string) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
const luminance = (hex: string) => {
  const [r, g, b] = channels(hex)
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}
const contrast = (a: string, b: string) => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (high! + 0.05) / (low! + 0.05)
}
function oklch(hex: string): [lightness: number, chroma: number, hue: number] {
  const [r, g, b] = channels(hex)
  const l = Math.cbrt(0.4122214708 * r! + 0.5363325363 * g! + 0.0514459929 * b!)
  const mid = Math.cbrt(0.2119034982 * r! + 0.6806995451 * g! + 0.1073969566 * b!)
  const s = Math.cbrt(0.0883024619 * r! + 0.2817188376 * g! + 0.6299787005 * b!)
  const a = 1.9779984951 * l - 2.428592205 * mid + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * mid - 0.808675766 * s
  return [0.2104542553 * l + 0.793617785 * mid - 0.0040720468 * s, Math.hypot(a, bb), ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360]
}

describe("the colours the lab's tubes are drawn in", () => {
  const liquids = m.liquidChoices
  const hex = Object.fromEntries(liquids.map((colour) => [colour, liquidHex(colour)]))

  it('has a colour of its own for every word the record has for a liquid and for a solid, and none is the grey of a word it does not know', () => {
    expect(liquids).toEqual(['colourless', 'yellow', 'between blue and yellow', 'blue', 'violet', 'pink'])
    const all = [...liquids.map(liquidHex), ...m.solidChoices.filter((choice) => choice !== 'none').map(solidHex)]
    for (const one of all) expect(one).toMatch(/^#[0-9a-f]{6}$/)
    expect(new Set([...all, liquidHex('puce')]).size).toBe(all.length + 1)
    expect(m.solidChoices).toEqual(['none', 'white'])
  })

  it('draws the colour between blue and yellow, which the record does not name, half way between its blue and its yellow in lightness, chroma and hue', () => {
    const [blue, yellow, between] = [oklch(hex.blue!), oklch(hex.yellow!), oklch(hex['between blue and yellow']!)]
    expect(between[0]).toBeCloseTo((blue[0] + yellow[0]) / 2, 1)
    // The drawing's value is the nearest a screen has: half way lies a little outside what it can show, so its chroma is held within a third of the half-way chroma, and its hue within 5° of the half-way hue.
    expect(Math.abs(between[1] - (blue[1] + yellow[1]) / 2)).toBeLessThan((blue[1] + yellow[1]) / 6)
    // The short way round from the blue (about 265°) to the yellow (about 98°).
    expect(Math.abs(between[2] - (blue[2] + yellow[2]) / 2)).toBeLessThan(5)
    expect(blue[2]).toBeGreaterThan(between[2])
    expect(between[2]).toBeGreaterThan(yellow[2])
  })

  it('sets the five colours apart in how light they are as well as in hue: from the darkest, blue, violet, the colour between, pink, yellow, and the liquid with no colour lighter than all', () => {
    const order = ['blue', 'violet', 'between blue and yellow', 'pink', 'yellow', 'colourless']
    expect([...liquids].sort((a, b) => luminance(hex[a]!) - luminance(hex[b]!))).toEqual(order)
    // The colours one system shows, which a learner tells apart there: each pair by 1.6 to 1 or more, as a ratio of contrast.
    const pairs: [string, string][] = [
      ['blue', 'violet'],
      ['violet', 'pink'],
      ['blue', 'pink'],
      ['violet', 'between blue and yellow'],
      ['between blue and yellow', 'yellow'],
      ['violet', 'yellow'],
    ]
    for (const [a, b] of pairs) expect(contrast(hex[a]!, hex[b]!), `${a} and ${b}`).toBeGreaterThanOrEqual(1.6)
    // Every other pair of the six choices differs too, by less: the words a look says are what tells them, never the colour alone.
    for (const a of liquids) for (const b of liquids) if (a !== b) expect(contrast(hex[a]!, hex[b]!), `${a} and ${b}`).toBeGreaterThanOrEqual(1.15)
    // A white solid on the white card, and a liquid with no colour beside it, are near enough to one colour that neither is left to it (page.test.ts).
    expect(contrast(solidHex('white'), hex.colourless!)).toBeLessThan(1.25)
  })
})

describe('what is drawn in a tube of this lab', () => {
  it('fills a tube as far as its own system fills one: the fullest is drawn full, no addition stands lower than what it was added to, and one of a millilitre or more stands plainly higher', () => {
    expect(SYSTEM_IDS.map((id) => fullMicrolitres(m, id))).toEqual([4800, 1700, 2500, 4500])
    for (const system of m.systems) {
      const full = fullMicrolitres(m, system.id)
      const surfaces = system.disturbances.flatMap((d) => [d.before, ...d.stages].map((stage) => surfaceOf(stage.microlitres, full)))
      expect(Math.min(...surfaces)).toBe(surfaceOf(full, full))
      for (const d of system.disturbances) {
        if (d.kind !== 'add') continue
        const stages = [d.before, ...d.stages]
        const levels = stages.map((stage) => surfaceOf(stage.microlitres, full))
        // Down the picture: a higher surface is a smaller number. A drop or two raises it by a unit or two of the picture, or by none: that it went in is said in words.
        for (let at = 1; at < levels.length; at++) {
          expect(levels[at], `${d.id}, portion ${at}`).toBeLessThanOrEqual(levels[at - 1]!)
          if (stages[at]!.microlitres - stages[at - 1]!.microlitres >= 1000) expect(levels[at - 1]! - levels[at]!, `${d.id}, portion ${at}`).toBeGreaterThanOrEqual(10)
        }
      }
    }
  })

  it('draws a liquid in its colour, and a solid at the bottom under its own layer; the two sections that are looked at are there whatever the tube holds, each tall enough for a finger', () => {
    const end = contentsEnd(TUBE_HEIGHT)
    const full = fullMicrolitres(m, 'hydroxides')
    const share = tubeLayers({ liquid: { colour: 'colourless', cloudy: false, microlitres: 500 }, solid: { colour: 'white', settled: true } }, full)
    expect(share.liquid).toEqual({ hex: liquidHex('colourless'), surface: expect.any(Number) })
    expect(share.solid).toEqual({ hex: solidHex('white'), top: expect.any(Number) })
    expect(share.spread).toBeNull()
    // The least this lab works with, a share of a tube, still stands over the solid, deep enough to be seen.
    expect(share.solid!.top - share.liquid!.surface).toBeGreaterThanOrEqual(20)
    for (const layers of [share, tubeLayers({ liquid: { colour: 'blue', cloudy: false, microlitres: full }, solid: null }, full), tubeLayers(null, full)]) {
      const sections = sectionsOf(layers)
      expect(sections.map(([look]) => look)).toEqual(['liquid', 'bottom'])
      for (const [, top, bottom] of sections) expect(bottom - top).toBeGreaterThanOrEqual(58)
      expect(sections[0]![2]).toBe(sections[1]![1])
      expect(sections[1]![2]).toBe(end)
      if (layers.liquid) expect(sections[0]![1]).toBeLessThan(layers.liquid.surface)
    }
  })
})

describe('the tubes that stand together', () => {
  it('are one tube in the three systems with one, and in the fourth the tube a solid is brought down in with the three it is shared among', () => {
    expect(tubeGroup(data, 'lead-chloride', 'lead')).toEqual(['lead'])
    expect(tubeGroup(data, 'methyl-violet', 'indicator')).toEqual(['indicator'])
    expect(tubeGroup(data, 'cobalt', 'cobalt')).toEqual(['cobalt'])
    const zinc = ['zinc', 'zinc-acid', 'zinc-base', 'zinc-ammonia']
    const magnesium = ['magnesium', 'magnesium-acid', 'magnesium-base', 'magnesium-ammonia']
    for (const tube of zinc) expect(tubeGroup(data, 'hydroxides', tube as (typeof TUBE_IDS)[number])).toEqual(zinc)
    for (const tube of magnesium) expect(tubeGroup(data, 'hydroxides', tube as (typeof TUBE_IDS)[number])).toEqual(magnesium)
    expect(() => tubeGroup(data, 'cobalt', 'zinc')).toThrow()
  })
})

describe('where the Lab tab opens', () => {
  const fresh = createLab('challenge')

  it('is the first system and its first disturbance, in a lab that has just been started', () => {
    expect(openingSystem(views(fresh))).toBe('lead-chloride')
    expect(openingEntry(views(fresh)['lead-chloride'])).toBe(0)
  })

  it('is the system whose run is begun and not over, at the disturbance it has reached', () => {
    const second = workDisturbance(m, fresh, 'cobalt')
    expect(openingSystem(views(second))).toBe('cobalt')
    expect(openingEntry(views(second).cobalt)).toBe(1)
    // A prediction alone begins a run.
    const predicted = run(m, fresh, [{ type: 'predict', system: 'hydroxides', way: 'left' }])
    expect(openingSystem(views(predicted))).toBe('hydroxides')
    // Of two that are under way, the earlier: the record does not hold which was shown.
    expect(openingSystem(views(workDisturbance(m, predicted, 'methyl-violet')))).toBe('methyl-violet')
  })

  it('is the entry that closes the run once every disturbance is done, while the system waits to be checked', () => {
    const toCheck = wholeSystem(m, fresh, 'methyl-violet', { check: false })
    expect(views(toCheck)['methyl-violet'].outcome.state).toBe('to-check')
    expect(openingSystem(views(toCheck))).toBe('methyl-violet')
    expect(openingEntry(views(toCheck)['methyl-violet'])).toBe(2)
  })

  it('is the first system that does not count yet, where no run is under way; and a system that counts and is being worked again, where one is', () => {
    const first = wholeSystem(m, fresh, 'lead-chloride')
    expect(openingSystem(views(first))).toBe('methyl-violet')
    const all = wholeLab(m, createLab('guided'))
    expect(all.status).toBe('completed')
    expect(openingSystem(views(all))).toBe('lead-chloride')
    expect(openingEntry(views(all)['lead-chloride'])).toBe(4)
    const again = workDisturbance(m, reduce(m, all, { type: 'workAgain', system: 'cobalt' }), 'cobalt')
    expect(openingSystem(views(again))).toBe('cobalt')
    expect(openingEntry(views(again).cobalt)).toBe(1)
    // A run that did not count is over: the system is the first that does not count, and opens on the entry that says so.
    const notCounted = wholeSystem(m, fresh, 'lead-chloride', { wrongAnswerAt: 'lead-heat' })
    expect(views(notCounted)['lead-chloride'].outcome.state).toBe('does-not-count')
    expect(openingSystem(views(notCounted))).toBe('lead-chloride')
    expect(openingEntry(views(notCounted)['lead-chloride'])).toBe(4)
  })
})
