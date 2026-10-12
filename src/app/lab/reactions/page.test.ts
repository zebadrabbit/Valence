import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ACTIVITIES } from '@/app/activities'
import { EquationBuilder } from '@/app/lab/EquationBuilder'
import { coatingHex, liquidHex, metalHex, solidHex } from '@/app/lab/tubeDrawing'
import { labProgress } from '@/app/lab/useLabProgress'
import { createMemoryStore, type KeyValueStore } from '@/app/progress/storage'
import { reactionsCitations } from '@/chem-data/citations'
import { KIND_IDS, STATION_IDS, reactionsData as data, stationOf, type StationId } from '@/chem-data/reactions/data'
import { REACTIONS_PRIMER, READ_FIRST } from '@/chem-data/reactions/primer'
import sources from '@/chem-data/sources.json'
import { can, createLab, mismatch, modelFrom, reactionsStateSchema, reduce, stationView, type Action, type Mode, type ReactionsState } from '@/engine/reactions'
import { rightEntry, run, wholeLab, wholeStation } from '@/engine/reactions/testkit'
import {
  ACTION_LABEL,
  BUILDER_TEXT,
  EQUATION_TEXT,
  HINT,
  KIND_LABEL,
  KIND_TEXT,
  LAB_TEXT,
  NOTES_TEXT,
  OBSERVATION_TEXT,
  ORDER_TEXT,
  PAGE_TEXT,
  PROGRESS_TEXT,
  RECORD_TEXT,
  WARM_TEXT,
  catalystText,
  equationText,
  outcomeText,
  stationNotes,
  vesselName,
  vesselShort,
  vesselText,
} from './messages'
import { ReactionsBench, fullMicrolitres } from './ReactionsBench'
import { ReactionsPage } from './ReactionsPage'
import { ReactionsRecord } from './ReactionsRecord'
import { BUBBLES, DRAWING, partsOf, scenesOf, sizeOf, surfaceOf } from './vesselLook'
import reactionsCss from './reactions.css?raw'

// The types of reactions lab's page as markup, on a store the test holds. AppStateProvider builds its store from
// the browser and the media hook has no value on a server, so both are given directly. What a press does (the one
// action, a look, a choice recorded, a tile put in a place, the check, Work the station again, the stations and
// Previous and Next) is state, and is checked in a browser: a markup render mounts the page and no more.
const app = vi.hoisted(() => ({ store: undefined as unknown as KeyValueStore, persistent: true, wide: true }))
vi.mock('@/app/AppState', () => ({ useAppState: () => ({ store: app.store, persistent: app.persistent, reducedMotion: false }) }))
vi.mock('@/app/useMediaQuery', () => ({ useMediaQuery: () => app.wide }))

const REACTIONS = ACTIVITIES[11]
const m = modelFrom(data)
const SCHEMA = reactionsStateSchema(m)
const draw = (element: ReactElement) => renderToStaticMarkup(createElement(MemoryRouter, null, element))
const escaped = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;')
const text = (html: string) => html.replace(/<[^>]+>/g, '')
const count = (html: string, pattern: RegExp) => [...html.matchAll(pattern)].length
const at = (stationId: StationId) => STATION_IDS.indexOf(stationId)

/** The Lab tab's bench on a state, opened at a station, and that station's own markup, without the list, the ways on, the sources and the bench under it. */
function bench(state: ReactionsState, stationId: StationId = 'zinc-copper-sulfate') {
  const html = draw(
    createElement(ReactionsBench, { data, m, sources, state, can: (action: Action) => can(m, state, action), wrong: (station, vessel, observation) => mismatch(m, state, station, vessel, observation), act: () => {}, opensAt: at(stationId) }),
  )
  const station = html.slice(html.indexOf('<section aria-labelledby'), html.indexOf('<div class="flex flex-wrap justify-between gap-2">'))
  return { html, station }
}
const fresh = (mode: Mode = 'guided') => createLab(mode)
const go = (state: ReactionsState, actions: Action[]) => run(m, state, actions)
const looks = (state: ReactionsState, stationId: StationId): Action[] => stationView(m, state, stationId).vessels.flatMap((vessel) => vessel.looks.map((look): Action => ({ type: 'look', station: stationId, vessel: vessel.id, at: look.at })))
/** A station acted on and every part of it looked at since. */
const looked = (state: ReactionsState, stationId: StationId) => {
  const acted = go(state, [{ type: 'act', station: stationId }])
  return go(acted, looks(acted, stationId))
}
/** A station with what is seen of each vessel recorded as its looks say, and each kind said as the model has it. */
function kindSaid(mode: Mode, stationId: StationId) {
  let state = looked(fresh(mode), stationId)
  for (const vessel of m.stations[at(stationId)]!.vessels) {
    state = go(state, [
      { type: 'observe', station: stationId, vessel: vessel.id, observation: Object.fromEntries(vessel.asks.map((field) => [field, vessel.after[field]!])) },
      { type: 'sayKind', station: stationId, vessel: vessel.id, kind: vessel.kind },
    ])
  }
  return state
}
/** The pictures of a station's markup: each svg, whole. */
const pictures = (html: string) => [...html.matchAll(/<svg viewBox="0 0 (\d+) (\d+)" role="img" aria-label="([^"]*)"[^>]*data-scene="([^"]*)"[^>]*>(.*?)<\/svg>/gs)].map(([, width, height, name, scene, body]) => ({ width: Number(width), height: Number(height), name: name!, scene: scene!, body: body! }))
const parts = (html: string) => [...html.matchAll(/<button type="button" data-part="([^"]+)" aria-label="([^"]+)"/g)].map(([, part, name]) => ({ part: part!, name: name! }))

beforeEach(() => {
  app.store = createMemoryStore()
  app.persistent = true
  app.wide = true
})

describe('the pictures of the types of reactions lab: where everything is', () => {
  const full = fullMicrolitres(m)
  /** Every picture the lab can show: each vessel before its action and after it, in each of its scenes. */
  const shown = STATION_IDS.flatMap((stationId) => {
    const before = fresh()
    const after = go(before, [{ type: 'act', station: stationId }])
    return [before, after].flatMap((state) =>
      stationView(m, state, stationId).vessels.flatMap((vessel, _, vessels) =>
        scenesOf(vessel.shows).map((scene) => ({ where: `${stationId} ${vessel.id} ${state === before ? 'before' : 'after'} ${scene}`, vessel, scene, narrow: vessels.length > 1 })),
      ),
    )
  })

  it('draws fourteen states of a vessel in fifteen pictures: a strip that has burned is two, its light and what is left of it', () => {
    expect(shown).toHaveLength(15)
    expect(shown.filter(({ scene }) => scene !== 'whole').map(({ where }) => where)).toEqual(['magnesium-flame strip after burning', 'magnesium-flame strip after afterwards'])
  })

  it('gives every look of a vessel one part in its pictures, a finger wide and tall where the picture is as small as it gets, none over another and all on the drawing', () => {
    for (const { where, vessel, scene, narrow } of shown) {
      const { width } = sizeOf(narrow)
      const surface = vessel.shows.tube?.liquid ? surfaceOf(vessel.shows.tube.liquid.microlitres, full) : 0
      const found = partsOf(vessel.shows, vessel.looks.map((look) => look.at), scene, surface, narrow)
      // A narrow picture is drawn 149 px wide for its 160 units in an upright tablet's row of three, and a strip's two pictures 208 px for their 240; the others at full size.
      const scale = narrow ? 149 / 160 : scene === 'whole' ? 1 : 208 / 240
      for (const part of found) {
        expect(part.width * scale, `${where} ${part.at}`).toBeGreaterThanOrEqual(44)
        expect(part.height * scale, `${where} ${part.at}`).toBeGreaterThanOrEqual(44)
        expect(part.left, where).toBeGreaterThanOrEqual(0)
        expect(part.left + part.width, where).toBeLessThanOrEqual(width)
        expect(part.top + part.height, where).toBeLessThanOrEqual(DRAWING)
      }
      for (const a of found) for (const b of found) if (a !== b) expect(a.left + a.width <= b.left || b.left + b.width <= a.left || a.top + a.height <= b.top || b.top + b.height <= a.top, `${where}: ${a.at} over ${b.at}`).toBe(true)
    }
    // Over a vessel's pictures together, each look has exactly one part.
    for (const stationId of STATION_IDS) {
      for (const state of [fresh(), go(fresh(), [{ type: 'act', station: stationId }])]) {
        for (const vessel of stationView(m, state, stationId).vessels) {
          const all = scenesOf(vessel.shows).flatMap((scene) => partsOf(vessel.shows, vessel.looks.map((look) => look.at), scene, 77, false).map((part) => part.at))
          expect(all.sort(), `${stationId} ${vessel.id}`).toEqual(vessel.looks.map((look) => look.at).sort())
        }
      }
    }
  })

  it('tells bubbles apart with nothing moving: none drawn, a few small ones, or many larger ones, and all of them under the surface and inside the glass', () => {
    const size = (kind: keyof typeof BUBBLES) => BUBBLES[kind].reduce((sum, [, , r]) => sum + r, 0) / BUBBLES[kind].length
    expect([BUBBLES.slow.length, BUBBLES.some.length, BUBBLES.fast.length]).toEqual([3, 7, 14])
    expect(size('slow')).toBeLessThan(size('some'))
    expect(size('slow')).toBeLessThan(size('fast'))
    expect(Math.max(...BUBBLES.slow.map(([, , r]) => r))).toBeLessThan(Math.min(...BUBBLES.fast.map(([, , r]) => r)))
    // The highest surface a bubbling tube has, and the tube's wall as Tube.tsx draws it: 48 to 128 across, round below 136 about (88, 136).
    const surface = Math.max(...m.stations.flatMap((station) => station.vessels.filter((vessel) => vessel.after.bubbles !== undefined || vessel.after.gas !== undefined).map((vessel) => surfaceOf(vessel.microlitres!.after, full))))
    for (const [cx, cy, r] of Object.values(BUBBLES).flat()) {
      expect(cy - r, `${cx},${cy}`).toBeGreaterThan(surface)
      expect(cy > 136 ? Math.hypot(cx - 88, cy - 136) + r : Math.max(88 - cx, cx - 88) + r, `${cx},${cy}`).toBeLessThan(39)
    }
    expect(reactionsCss).not.toMatch(/animation|transition|@keyframes/)
  })

  it('has a value to draw every colour word the record stores for something a vessel shows, the paler blue plainly between the blue and no colour', () => {
    const grey = liquidHex('no such colour')
    for (const station of m.stations) {
      for (const vessel of station.vessels) {
        for (const seen of [vessel.before, vessel.after]) {
          if (seen.liquid !== undefined) expect(liquidHex(seen.liquid), seen.liquid).not.toBe(grey)
          if (seen.solid !== undefined && seen.solid !== 'none') expect(solidHex(seen.solid), seen.solid).not.toBe(grey)
          if (seen.coating !== undefined && seen.coating !== 'none') expect(coatingHex(seen.coating), seen.coating).not.toBe(grey)
        }
        if (vessel.metal !== null) expect(metalHex(vessel.metal.colour), vessel.metal.colour).not.toBe(grey)
      }
    }
    for (const colour of data.choices.liquid) expect(liquidHex(colour), colour).not.toBe(grey)
    for (const colour of data.choices.solid.slice(1)) expect(solidHex(colour), colour).not.toBe(grey)
    for (const colour of data.choices.coating.slice(1)) expect(coatingHex(colour), colour).not.toBe(grey)
    const light = (hex: string) => [1, 3, 5].reduce((sum, i) => sum + parseInt(hex.slice(i, i + 2), 16), 0)
    expect(light(liquidHex('blue'))).toBeLessThan(light(liquidHex('paler blue')) - 150)
    expect(light(liquidHex('paler blue'))).toBeLessThan(light(liquidHex('colourless')) - 150)
    expect(new Set(['silvery', 'grey', 'reddish'].map(metalHex)).size).toBe(3)
  })
})

describe('a station of the types of reactions lab', () => {
  it('is one of five, named A to E with what is used and never with the kind of reaction, one at a time', () => {
    const { html, station } = bench(fresh())
    expect(count(html, /<h2 /g)).toBe(1)
    expect(text(station)).toContain('Station A · Run 1 · ○ Not started')
    expect(station).toContain(`>${stationOf(data, 'zinc-copper-sulfate').title}</h2>`)
    const list = html.slice(html.indexOf('<ol'), html.indexOf('</ol>'))
    expect([...list.matchAll(/<span class="tabular-nums[^"]*">([^<]*)<\/span><span>([^<]*)</g)].map(([, mark, name]) => `${mark} ${name}`)).toEqual(STATION_IDS.map((id) => `${stationOf(data, id).letter}. ${stationOf(data, id).title}`))
    for (const stationId of STATION_IDS) expect(stationOf(data, stationId).title).not.toMatch(/combination|decomposition|replacement|catalyst/i)
    expect(text(html)).toContain(LAB_TEXT.aim)
    expect(html).toContain(escaped(PAGE_TEXT.next('Station B: Magnesium in a flame')))
  })

  it('shows before its action the vessel as it stands, the one action, and no question: what is seen is found by looking, and the words of a part are nowhere on the page', () => {
    for (const stationId of STATION_IDS) {
      const state = fresh()
      const { station } = bench(state, stationId)
      const view = stationView(m, state, stationId)
      expect(station, stationId).toContain(`>${ACTION_LABEL[stationId]}</span></button>`)
      expect(pictures(station).map((picture) => picture.name), stationId).toEqual(view.vessels.map((vessel) => PAGE_TEXT.picture(vesselName(data, stationId, vessel.id))))
      expect(parts(station).map((part) => part.part), stationId).toEqual(view.vessels.flatMap((vessel) => vessel.looks.map((look) => look.at)).sort((a, b) => parts(station).findIndex((p) => p.part === a) - parts(station).findIndex((p) => p.part === b)))
      expect(count(station, /type="radio"/g), stationId).toBe(0)
      expect(station, stationId).toContain(OBSERVATION_TEXT.actFirst)
      // The whole of a picture in words is there, in a disclosure that is closed, and is of the vessel as it stands and not as it will be. Outside it nothing says what any part shows, before or after.
      const closed = [...station.matchAll(/<details>.*?<\/details>/gs)].map(([details]) => details).filter((details) => details.includes(`>${PAGE_TEXT.inWords}</summary>`))
      const open = closed.reduce((html, details) => html.replace(details, ''), station)
      expect(closed, stationId).toHaveLength(1)
      for (const vessel of m.stations[at(stationId)]!.vessels) for (const look of vessel.looks) for (const words of [look.before, look.after]) expect(open, words).not.toContain(escaped(words))
      for (const vessel of view.vessels) {
        expect(closed[0], stationId).toContain(escaped(vesselText(vessel.shows)))
        expect(open, stationId).not.toContain(escaped(vesselText(vessel.shows)))
      }
      expect(station, stationId).not.toContain(NOTES_TEXT.heading)
    }
  })

  it('draws the piece of metal in its stored colour beside the tube, then in the liquid with its coating, and the liquid in its colour before and after', () => {
    const before = pictures(bench(fresh()).station)[0]!
    expect(before.body).toContain('data-metal="grey"')
    expect(before.body).not.toContain('data-coating')
    expect(before.body).toContain(`fill="${liquidHex('blue')}"`)
    expect(before.body).toContain(`fill="${metalHex('grey')}"`)
    const after = pictures(bench(looked(fresh(), 'zinc-copper-sulfate')).station)[0]!
    expect(after.body).toContain('data-metal="grey" data-coating="red-brown"')
    expect(after.body).toContain(`fill="${coatingHex('red-brown')}"`)
    expect(after.body).toContain(`fill="${liquidHex('paler blue')}"`)
    expect(after.body).not.toContain(`fill="${liquidHex('blue')}"`)
  })

  it('stands the three tubes in one row, each named by its metal, drawn narrow, with bubbles that are many, few or none', () => {
    const state = looked(fresh(), 'metals-in-acid')
    const { station } = bench(state, 'metals-in-acid')
    const drawn = pictures(station)
    expect(drawn.map((picture) => [picture.name, picture.width])).toEqual([
      ['The magnesium tube, drawn', 160],
      ['The zinc tube, drawn', 160],
      ['The copper tube, drawn', 160],
    ])
    expect(drawn.map((picture) => /data-metal="([^"]+)"/.exec(picture.body)![1])).toEqual(['silvery', 'grey', 'reddish'])
    expect(drawn.map((picture) => (/data-bubbles="([^"]+)"/.exec(picture.body) ?? [])[1])).toEqual(['fast', 'slow', undefined])
    expect(drawn.map((picture) => count(picture.body.slice(picture.body.indexOf('data-bubbles')), /<circle /g) * (picture.body.includes('data-bubbles') ? 1 : 0))).toEqual([14, 3, 0])
    expect(station.indexOf('class="reactions-tubes"')).toBeGreaterThan(0)
    // Each tube has its own question under it, and the three are told apart by their names as well as their colours.
    expect(count(station, new RegExp(`>${OBSERVATION_TEXT.record}<`, 'g'))).toBe(3)
    for (const metal of ['magnesium', 'zinc', 'copper']) expect(station).toContain(`>The ${metal} tube</h4>`)
  })

  it('keeps the three tubes the page until what is seen in each is recorded, and only then asks the kinds, the equations and the order', () => {
    const one = go(looked(fresh(), 'metals-in-acid'), [{ type: 'observe', station: 'metals-in-acid', vessel: 'magnesium', observation: { bubbles: 'fast' } }])
    const waiting = bench(one, 'metals-in-acid').station
    expect(waiting).toMatch(/<section aria-labelledby="[^"]*" hidden=""[^>]*><div[^>]*><h3[^>]*>One at a time</)
    expect(waiting).not.toContain(KIND_TEXT.question)
    // The tube that is recorded has its answer in a word with its tick, under a tube that is still drawn with the room under it.
    expect(text(waiting)).toContain('✓ Bubbles: fast')
    expect(pictures(waiting).map((picture) => picture.height)).toEqual([296, 296, 296])
    const all = go(one, [
      { type: 'observe', station: 'metals-in-acid', vessel: 'zinc', observation: { bubbles: 'slow' } },
      { type: 'observe', station: 'metals-in-acid', vessel: 'copper', observation: { bubbles: 'none' } },
    ])
    const asked = bench(all, 'metals-in-acid').station
    expect(asked).not.toMatch(/hidden=""[^>]*><div[^>]*><h3[^>]*>One at a time</)
    expect(asked).toContain(KIND_TEXT.question)
    expect(pictures(asked).map((picture) => picture.height)).toEqual([200, 200, 200])
  })

  it('draws a picture short, with no room under its drawing, once what is seen of its vessel is recorded, and says what to do with it to a screen reader alone', () => {
    for (const stationId of STATION_IDS) {
      const open = bench(looked(fresh('challenge'), stationId), stationId).station
      const recorded = bench(kindSaid('challenge', stationId), stationId).station
      const narrow = stationId === 'metals-in-acid'
      expect(pictures(open).map((picture) => `${picture.width}x${picture.height}`), stationId).toEqual(pictures(open).map(() => (narrow ? '160x296' : '240x272')))
      expect(pictures(recorded).map((picture) => `${picture.width}x${picture.height}`), stationId).toEqual(pictures(open).map(() => (narrow ? '160x200' : '240x200')))
      expect(count(recorded, new RegExp(`class="sr-only">${escaped(PAGE_TEXT.explore)}<`, 'g')), stationId).toBe(pictures(open).length)
      expect(open, stationId).not.toContain(`class="sr-only">${escaped(PAGE_TEXT.explore)}<`)
      // Every part is still there to be looked at.
      expect(parts(recorded).map((part) => part.part), stationId).toEqual(parts(open).map((part) => part.part))
    }
  })

  it('draws the strip in the tongs beside the burner, and once it has burned its light in one picture and the powder left in the tongs in another, with nothing that moves', () => {
    const before = pictures(bench(fresh(), 'magnesium-flame').station)
    expect(before.map((picture) => picture.scene)).toEqual(['whole'])
    expect(before[0]!.body).toContain('data-metal="silvery"')
    expect(before[0]!.body).not.toMatch(/data-light|data-residue/)
    const { station } = bench(looked(fresh(), 'magnesium-flame'), 'magnesium-flame')
    const after = pictures(station)
    expect(after.map((picture) => [picture.scene, picture.body.includes('data-light="white light"'), picture.body.includes('data-residue="white"'), picture.body.includes('data-metal')])).toEqual([
      ['burning', true, false, false],
      ['afterwards', false, true, false],
    ])
    expect(text(station)).toContain(`${PAGE_TEXT.whileBurning}${''}`)
    expect(text(station)).toContain(PAGE_TEXT.afterwards)
    expect(parts(station).map((part) => part.part)).toEqual(['flame', 'solid'])
    expect(station).not.toMatch(/animate|<animate/)
  })

  it('says that a tube is warm only once the tube has been felt: warmth is not drawn, and is not given away', () => {
    const acted = go(fresh(), [{ type: 'act', station: 'peroxide' }])
    expect(bench(acted, 'peroxide').station).not.toContain(`>${WARM_TEXT}<`)
    expect(bench(go(acted, [{ type: 'look', station: 'peroxide', vessel: 'tube', at: 'liquid' }]), 'peroxide').station).not.toContain(`>${WARM_TEXT}<`)
    const felt = bench(looked(fresh(), 'peroxide'), 'peroxide').station
    expect(felt).toContain(`>${WARM_TEXT}<`)
    expect(felt).toContain('data-bubbles="some"')
    expect(parts(felt).map((part) => part.name)).toEqual(['Look at the liquid, looked at', 'Feel the tube, felt'])
  })

  it('opens what is seen once every part has been looked at, as choices of the record, then which kind, then the equation, each folded to a line beside Change once it is recorded', () => {
    const acted = go(fresh(), [{ type: 'act', station: 'zinc-copper-sulfate' }])
    expect(bench(acted).station).toContain(OBSERVATION_TEXT.lookFirst)
    const open = bench(looked(fresh(), 'zinc-copper-sulfate')).station
    expect(count(open, /type="radio"/g)).toBe(data.choices.coating.length + data.choices.liquid.length)
    expect(open).not.toContain(KIND_TEXT.question)
    expect(text(open)).toContain(HINT.observe)
    const said = bench(kindSaid('guided', 'zinc-copper-sulfate')).station
    expect(text(said)).toContain('On the metal: a red-brown coatingColour of the liquid: paler blue')
    expect(text(said)).toContain(`${KIND_TEXT.heading}: ${KIND_LABEL['single-replacement']}`)
    expect(count(said, />Change</g)).toBe(2)
    expect(count(said, /type="radio" name/g)).toBe(0)
    expect(said).toContain(`>${EQUATION_TEXT.record}</button>`)
  })
})

describe('the equation of a station', () => {
  const builder = (station: string) => station.slice(station.indexOf('<form noValidate="" aria-labelledby'), station.indexOf('</form>', station.indexOf('<form noValidate="" aria-labelledby')))
  const places = (html: string) => [...html.matchAll(/data-place="([^"]+)" aria-label="([^"]+)"/g)].map(([, place, name]) => `${place} ${name}`)
  const tiles = (html: string) => [...html.slice(html.indexOf(`aria-label="${BUILDER_TEXT.palette}"`)).split('data-row')[0]!.matchAll(/<button[^>]*aria-label="([^"]+)"/g)].map(([, name]) => name)

  it("is built from the station's tiles, which stand over the row of places and are named in full, with no choice of No reaction", () => {
    for (const stationId of STATION_IDS) {
      const form = builder(bench(kindSaid('guided', stationId), stationId).station)
      const view = stationView(m, kindSaid('guided', stationId), stationId)
      expect(tiles(form), stationId).toEqual(view.tiles.map((tile) => `${tile.formula}, ${tile.name}`))
      expect(form.indexOf(`aria-label="${BUILDER_TEXT.palette}"`), stationId).toBeLessThan(form.indexOf('data-row'))
      expect(form, stationId).not.toContain('type="checkbox"')
      expect(text(form), stationId).toContain(`${EQUATION_TEXT.heading}${EQUATION_TEXT.build} ${EQUATION_TEXT.balance}`)
    }
  })

  it('has in Guided the row of empty places the engine gives, and in Challenge one empty place on each side whatever the equation is, so that the row gives nothing away', () => {
    for (const stationId of STATION_IDS) {
      const equation = m.stations[at(stationId)]!.vessels[0]!.equation!
      const guided = places(builder(bench(kindSaid('guided', stationId), stationId).station))
      expect(guided.filter((place) => place.startsWith('reactants')), stationId).toHaveLength(equation.reactants.length)
      expect(guided.filter((place) => place.startsWith('products')), stationId).toHaveLength(equation.products.length)
      expect(guided[0], stationId).toBe(`reactants:0 Place 1 of ${equation.reactants.length} before the arrow, empty, chosen`)
      expect(places(builder(bench(kindSaid('challenge', stationId), stationId).station)), stationId).toEqual(['reactants:0 Place 1 before the arrow, empty, chosen', 'products:0 Place 1 after the arrow, empty'])
    }
  })

  it('folds to its line beside Change once it is recorded: with a tick in Guided, which records only one that is right, and in Challenge with no mark and the word that it is recorded', () => {
    const entry = rightEntry(m, 'two-solutions', 'tube')
    // The line as it is drawn: each subscript of the record's formulas as a digit in a sub element.
    const line = equationText(stationView(m, fresh(), 'two-solutions').tiles, entry).replace(/[₀-₉]/g, (digit) => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(digit)))
    // Guided checks the station by itself at the last entry, so the builder of a station with one vessel is seen folded in Challenge, and in Guided at the station of three tubes.
    const challenge = builder(bench(go(kindSaid('challenge', 'two-solutions'), [{ type: 'enterEquation', station: 'two-solutions', vessel: 'tube', entry }]), 'two-solutions').station)
    expect(text(challenge)).toContain(`${BUILDER_TEXT.yourEquation}: ${line}${BUILDER_TEXT.change}${EQUATION_TEXT.recorded}`)
    expect(challenge).not.toMatch(/✓|✕/)
    const guided = bench(go(kindSaid('guided', 'metals-in-acid'), [{ type: 'enterEquation', station: 'metals-in-acid', vessel: 'magnesium', entry: rightEntry(m, 'metals-in-acid', 'magnesium') }]), 'metals-in-acid').station
    expect(text(builder(guided))).toContain(`${BUILDER_TEXT.change}✓ ${EQUATION_TEXT.right}`)
    expect(text(guided)).toContain(`✓ ${vesselShort(data, 'metals-in-acid', 'magnesium')}The magnesium tube: ${EQUATION_TEXT.recorded}`)
    // A tick is for an answer found right: Challenge marks what is recorded with a mark of its own until the check.
    const taken = bench(go(kindSaid('challenge', 'metals-in-acid'), [{ type: 'enterEquation', station: 'metals-in-acid', vessel: 'magnesium', entry: rightEntry(m, 'metals-in-acid', 'magnesium') }]), 'metals-in-acid').station
    expect(text(taken)).toContain(`● ${vesselShort(data, 'metals-in-acid', 'magnesium')}The magnesium tube: ${EQUATION_TEXT.recorded}○ ${vesselShort(data, 'metals-in-acid', 'zinc')}The zinc tube`)
    expect(text(taken).replace(`✓ ${ACTION_LABEL['metals-in-acid']}`, '')).not.toMatch(/✓|✕/)
  })

  it('is not asked of a tube whose learner said that nothing reacted, whatever the tube', () => {
    const state = go(looked(fresh('challenge'), 'zinc-copper-sulfate'), [
      { type: 'observe', station: 'zinc-copper-sulfate', vessel: 'tube', observation: { coating: 'none', liquid: 'blue' } },
      { type: 'sayKind', station: 'zinc-copper-sulfate', vessel: 'tube', kind: 'none' },
    ])
    const { station } = bench(state)
    expect(station).toContain(EQUATION_TEXT.nothingToWrite)
    expect(station).not.toContain('data-place')
  })

  it('leaves the aqueous reactions lab its own order: the shared builder puts the row first, then the line of a term\'s controls, then the tiles, unless it is told otherwise; told, the tiles and that line are over the row', () => {
    const drawn = (toolsFirst: boolean) => draw(createElement(EquationBuilder, { heading: 'H', palette: ['a'], formula: (id: string) => id, states: ['aq'], recorded: null, counts: null, held: null, refusal: () => null, onEnter: () => ({ ok: null, text: '' }), text: BUILDER_TEXT, toolsFirst }))
    const order = (html: string) => ['data-row', escaped(BUILDER_TEXT.slotHelp), `aria-label="${BUILDER_TEXT.palette}"`].map((piece) => html.indexOf(piece))
    const [row, line, bank] = order(drawn(false))
    expect(row).toBeGreaterThan(-1)
    expect(row).toBeLessThan(line!)
    expect(line).toBeLessThan(bank!)
    const [rowUnder, lineOver, bankOver] = order(drawn(true))
    expect(bankOver).toBeGreaterThan(-1)
    expect(bankOver).toBeLessThan(lineOver!)
    expect(lineOver).toBeLessThan(rowUnder!)
  })
})

describe('what Challenge keeps back (spec 24.5)', () => {
  it('shows no kind, no equation, no note, no hint, no mark and no count of places before a station is checked, at any station', () => {
    for (const stationId of STATION_IDS) {
      const state = kindSaid('challenge', stationId)
      const { html, station } = bench(state, stationId)
      expect(station, stationId).not.toMatch(/✓ That|✕/)
      expect(text(station), stationId).not.toContain(KIND_TEXT.right)
      expect(station, stationId).not.toContain(NOTES_TEXT.heading)
      expect(text(station), stationId).toContain(NOTES_TEXT.later)
      for (const note of stationNotes(data, stationId)) expect(html, stationId).not.toContain(escaped(note))
      for (const hint of Object.values(HINT)) expect(html, stationId).not.toContain(escaped(hint))
      expect(station, stationId).not.toContain('data-over-arrow')
      // The sources of the answers are not listed until the station counts.
      const listed = html.slice(html.indexOf('>Sources</summary>'), html.indexOf('</details>', html.indexOf('>Sources</summary>')))
      const covers = (done: boolean) => reactionsCitations(data, stationId, sources, done).flatMap((citation) => citation.covers)
      expect(count(listed, /<li/g), stationId).toBe(reactionsCitations(data, stationId, sources, false).length)
      expect(covers(false).length, stationId).toBeLessThan(covers(true).length)
      for (const label of covers(true).filter((label) => !covers(false).includes(label))) expect(listed, `${stationId}: ${label}`).not.toContain(escaped(label))
      expect(text(station), stationId).toContain(PAGE_TEXT.check)
    }
  })

  it('offers the same five kinds at every vessel, each with what it means and its pattern', () => {
    const forms = STATION_IDS.map((stationId) => {
      const state = go(looked(fresh('challenge'), stationId), m.stations[at(stationId)]!.vessels.map((vessel): Action => ({ type: 'observe', station: stationId, vessel: vessel.id, observation: Object.fromEntries(vessel.asks.map((field) => [field, vessel.after[field]!])) })))
      const { station } = bench(state, stationId)
      return [...station.matchAll(/value="(combination|decomposition|single-replacement|double-replacement|none)"[^>]*\/>([^<]*)</g)].map(([, value, label]) => `${value} ${label}`)
    })
    expect(forms[0]).toHaveLength(5)
    expect(forms[0]!.slice(0, 4).every((label, i) => label.includes(escaped(data.kinds.find((kind) => kind.id === KIND_IDS[i])!.pattern)))).toBe(true)
    expect(forms[2]).toEqual([...forms[0]!, ...forms[0]!, ...forms[0]!])
    for (const form of [forms[1], forms[3], forms[4]]) expect(form).toEqual(forms[0])
  })
})

describe('a station that has been checked', () => {
  it('shows its notes outright and first once it counts, with each finished equation, and a catalyst over its arrow that is also said in words', () => {
    for (const stationId of STATION_IDS) {
      const state = wholeStation(m, fresh(), stationId)
      const { station } = bench(state, stationId)
      const view = stationView(m, state, stationId)
      expect(view.done, stationId).toBe(true)
      expect(text(station), stationId).toContain(`✓ ${outcomeText({ state: 'counts' })}`)
      expect(station.indexOf(NOTES_TEXT.heading), stationId).toBeLessThan(station.indexOf(PAGE_TEXT.beforeAndAfter))
      for (const note of stationNotes(data, stationId)) expect(station, stationId).toContain(escaped(note))
      expect(count(station, /class="inline-flex flex-wrap items-end/g), stationId).toBe(m.stations[at(stationId)]!.vessels.filter((vessel) => vessel.equation !== null).length)
      expect(text(station), stationId).not.toContain(NOTES_TEXT.later)
      // Nothing more is entered in a run that is checked.
      expect(count(station, /type="radio"|type="submit"/g), stationId).toBe(0)
      const catalyst = view.vessels[0]!.catalyst
      expect(catalyst !== null, stationId).toBe(stationId === 'peroxide')
      if (catalyst !== null) {
        expect(station).toMatch(/<span aria-hidden="true" data-over-arrow="" class="text-xs">FeCl<sub>3<\/sub><\/span>/)
        expect(station).toContain(escaped(catalystText(catalyst)))
      } else expect(station, stationId).not.toContain('data-over-arrow')
    }
  })

  it('marks what was recorded in a run that does not count, says why, and keeps the notes back', () => {
    const state = wholeStation(m, fresh('challenge'), 'two-solutions', { wrongKindAt: 'tube', wrongEquationAt: 'tube', wrongEquation: 'unbalanced' })
    const { station } = bench(state, 'two-solutions')
    expect(text(station)).toContain(`✕ ${outcomeText({ state: 'does-not-count', reasons: [] })}`)
    expect(text(station)).toContain(`✕ ${KIND_TEXT.wrong}`)
    expect(text(station)).toContain('✓ That is what it showed.')
    expect(station).not.toContain(NOTES_TEXT.heading)
    expect(text(station)).toContain(NOTES_TEXT.later)
    expect(text(station)).toContain(PAGE_TEXT.workAgain)
  })

  it('marks each line under a checked tube of three with its own tick or cross, and leaves the sentence on what was found to a screen reader, where it would run into the next tube', () => {
    const wrong = bench(wholeStation(m, fresh('challenge'), 'metals-in-acid', { wrongObservationAt: 'zinc' }), 'metals-in-acid').station
    const tubes = wrong.slice(wrong.indexOf('class="reactions-tubes"'), wrong.indexOf('One at a time'))
    expect(text(tubes)).toContain('✓ Bubbles: fast')
    expect(text(tubes)).toMatch(/✕ Bubbles: (none|fast)/)
    expect(text(tubes)).toContain('✓ Bubbles: none')
    // The three sentences are in the page, each hidden from the eye; a station of one tube shows its sentence.
    expect(count(tubes, /<p class="sr-only"><span class="font-medium whitespace-nowrap">/g)).toBe(3)
    const one = bench(wholeStation(m, fresh(), 'two-solutions'), 'two-solutions').station
    expect(one).not.toContain('<p class="sr-only"><span class="font-medium whitespace-nowrap">')
    expect(text(one)).toContain('✓ That is what it showed.')
  })

  it('gives the order of the three metals as two choices, the most active and the least, and lists it with the other answers once the station is checked', () => {
    const asked = bench(kindSaid('guided', 'metals-in-acid'), 'metals-in-acid').station
    expect(text(asked)).toContain(`${ORDER_TEXT.question}${ORDER_TEXT.mostActive}magnesiumzinccopper${ORDER_TEXT.leastActive}magnesiumzinccopper${ORDER_TEXT.record}`)
    // Each of the four is a word to the eye, where they stand in one row, and its whole name to a screen reader.
    expect([...asked.matchAll(/aria-pressed="(true|false)"[^>]*><span aria-hidden="true"><span[^>]*>[^<]*<\/span>([^<]*)<\/span><span class="sr-only">([^<]*)</g)].map(([, pressed, word, name]) => `${pressed} ${word} / ${name}`)).toEqual([
      'true Magnesium / The magnesium tube',
      'false Zinc / The zinc tube',
      `false Copper / The copper tube: ${EQUATION_TEXT.recorded}`,
      `false ${ORDER_TEXT.short} / ${ORDER_TEXT.heading}`,
    ])
    const done = bench(wholeStation(m, fresh(), 'metals-in-acid'), 'metals-in-acid').station
    expect(text(done)).toContain(`magnesium, then zinc, then copper ✓ ${ORDER_TEXT.right}`)
    expect(text(done)).toContain(EQUATION_TEXT.nothingToWrite)
  })
})

describe('the Record tab and the page', () => {
  it("lists each station's runs with what was recorded, the kind said, the equation built and how the run came out, and marks nothing in a run that is not checked", () => {
    let state = wholeStation(m, fresh('challenge'), 'zinc-copper-sulfate', { wrongKindAt: 'tube' })
    state = wholeStation(m, go(state, [{ type: 'workAgain', station: 'zinc-copper-sulfate' }]), 'zinc-copper-sulfate')
    state = wholeStation(m, state, 'metals-in-acid', { check: false })
    const html = draw(createElement(ReactionsRecord, { data, m, state }))
    const read = text(html)
    expect(read).toContain(`Station A: Zinc in copper(II) sulfate solution✓ ${PROGRESS_TEXT.done}`)
    // A run left behind is not said to be worked again: the station counts by the run after it.
    expect(read).toContain(`${RECORD_TEXT.run(0)}: ✕ ${RECORD_TEXT.doesNotCount}On the metal`)
    expect(read).toContain('The tube: the kind is not right.')
    expect(read).toContain(`${RECORD_TEXT.run(1)}: ✓ ${RECORD_TEXT.counts}`)
    expect(read).toContain(`${RECORD_TEXT.kind}: ${KIND_LABEL['single-replacement']}${RECORD_TEXT.equation}: Zn(s) + CuSO4(aq) → ZnSO4(aq) + Cu(s)`)
    const acid = read.slice(read.indexOf('Station C'), read.indexOf('Station D'))
    expect(acid).toContain(`${RECORD_TEXT.run(0)}: ${RECORD_TEXT.notChecked}`)
    expect(acid).toContain(`The copper tubeBubbles from the metal: none${RECORD_TEXT.kind}: ${KIND_LABEL.none}`)
    expect(acid).toContain(`${RECORD_TEXT.order}: magnesium, then zinc, then copper`)
    expect(acid).not.toMatch(/✓|✕/)
    expect(read).toContain(`Station E: Hydrogen peroxide with iron(III) chloride○ ${PROGRESS_TEXT['not-started']}${RECORD_TEXT.run(0)}: ${RECORD_TEXT.nothingRecorded}`)
    expect(draw(createElement(ReactionsRecord, { data, m, state: wholeLab(m, fresh()) }))).toContain(LAB_TEXT.completed)
  })

  it('opens on the primer with its read-first marks before a lab is started, and stores nothing by being opened', () => {
    const html = draw(createElement(ReactionsPage))
    expect(html).toContain(`>${REACTIONS.title}</h1>`)
    expect(REACTIONS_PRIMER.filter((section) => READ_FIRST.includes(section.id))).toHaveLength(4)
    expect(count(html, new RegExp(PAGE_TEXT.readFirst, 'g'))).toBeGreaterThanOrEqual(4)
    expect(labProgress(app.store, REACTIONS, SCHEMA).load()).toBeNull()
  })

  it('reopens a stored lab on its Lab tab at the station the learner was in the middle of, and a complete one says so', () => {
    const under = looked(wholeStation(m, fresh(), 'zinc-copper-sulfate'), 'two-solutions')
    labProgress(app.store, REACTIONS, SCHEMA).save(under)
    const html = draw(createElement(ReactionsPage))
    expect(html).toContain(`>${stationOf(data, 'two-solutions').title}</h2>`)
    expect(html).not.toContain(`>${stationOf(data, 'zinc-copper-sulfate').title}</h2>`)
    labProgress(app.store, REACTIONS, SCHEMA).save(wholeLab(m, fresh()))
    expect(text(draw(createElement(ReactionsPage)))).toContain(`✓ ${LAB_TEXT.completed}`)
    expect(reduce(m, wholeLab(m, fresh()), { type: 'workAgain', station: 'peroxide' }).status).toBe('completed')
  })
})
