import { describe, expect, it } from 'vitest'
import aqueousHazards from '../../../docs/research/phase-4/hazards.json'
import ownHazards from '../../../docs/research/reactions/hazards.json'
import authored from '../../../docs/research/reactions/reactions.json'
import { reactionsCitations } from '../citations'
import sources from '../sources.json'
import { validateReactions } from '../validate'
import { FIELD_AT, FIELDS, KIND_IDS, reactionsData, reactionsSchema, STATION_IDS, stationOf, type ReactionsData } from './data'
import stored from './reactions.json'

const local = import.meta.glob<string[]>('../denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

const copy = (): ReactionsData => JSON.parse(JSON.stringify(stored))
const errorsWith = (edit: (data: ReactionsData) => void) => {
  const data = copy()
  edit(data)
  return validateReactions(data, sources).join('\n')
}
const words = (text: string) => text.split(/\s+/).length
const vessels = reactionsData.stations.flatMap((station) => station.vessels.map((vessel) => ({ station, vessel })))

describe('reactionsData', () => {
  it('is the generated file, with nothing dropped or added by the schema', () => {
    expect(reactionsData).toEqual(stored)
    expect(reactionsSchema.safeParse({ ...stored, extra: 1 }).success).toBe(false)
  })

  it('passes validation against the stored sources', () => {
    expect(validateReactions(stored, sources, { institutionNames })).toEqual([])
  })

  it("is the authored record with each reagent's hazards merged in, from this lab's own file or, for the two shared bottles, the aqueous reactions lab's, and nothing else changed", () => {
    const bare = (reagent: (typeof reactionsData.reagents)[number]) => Object.fromEntries(Object.entries(reagent).filter(([key]) => key !== 'classifiedAs' && key !== 'hazards'))
    expect({ ...reactionsData, reagents: reactionsData.reagents.map(bare) }).toEqual(authored)
    const shared = ['hcl-1m', 'fecl3-0.5m']
    expect(Object.keys(ownHazards).sort()).toEqual(reactionsData.reagents.map((r) => r.id).filter((id) => !shared.includes(id)).sort())
    for (const reagent of reactionsData.reagents) {
      const from = shared.includes(reagent.id) ? aqueousHazards[reagent.id as keyof typeof aqueousHazards] : ownHazards[reagent.id as keyof typeof ownHazards]
      expect({ classifiedAs: reagent.classifiedAs, hazards: reagent.hazards }, reagent.id).toEqual(from)
    }
  })

  it('has the five stations of spec 24.1 in order, lettered A to E, each with its one action', () => {
    expect(reactionsData.stations.map((s) => [s.id, s.letter, s.action, s.vessels.map((v) => v.id)])).toEqual([
      ['zinc-copper-sulfate', 'A', 'put-in', ['tube']],
      ['magnesium-flame', 'B', 'burn', ['strip']],
      ['metals-in-acid', 'C', 'put-in', ['magnesium', 'zinc', 'copper']],
      ['two-solutions', 'D', 'mix', ['tube']],
      ['peroxide', 'E', 'add-drops', ['tube']],
    ])
    expect(reactionsData.stations.map((s) => s.id)).toEqual(STATION_IDS)
    expect(stationOf(reactionsData, 'peroxide').letter).toBe('E')
    expect(() => stationOf(reactionsData, 'nothing' as never)).toThrow(/no station/)
  })

  it('shows one or two of each of the four kinds, and one tube where nothing reacts (spec 24.1)', () => {
    expect(vessels.map(({ station, vessel }) => `${station.letter} ${vessel.id}: ${vessel.kind.value}`)).toEqual([
      'A tube: single-replacement',
      'B strip: combination',
      'C magnesium: single-replacement',
      'C zinc: single-replacement',
      'C copper: none',
      'D tube: double-replacement',
      'E tube: decomposition',
    ])
    for (const kind of KIND_IDS) expect(vessels.some(({ vessel }) => vessel.kind.value === kind), kind).toBe(true)
    expect(reactionsData.kinds.map((k) => [k.id, k.pattern])).toEqual([
      ['combination', 'A + B → AB'],
      ['decomposition', 'AB → A + B'],
      ['single-replacement', 'A + BC → AC + B'],
      ['double-replacement', 'AB + CD → AD + CB'],
    ])
  })

  it('stores what each station shows (spec 24.1): the coating and the fading blue, the white light and the white powder, the three rates, the white solid, the bubbles and the warmth', () => {
    const after = (stationId: (typeof STATION_IDS)[number], vesselId: string) => {
      const vessel = stationOf(reactionsData, stationId).vessels.find((v) => v.id === vesselId)!
      return Object.fromEntries(vessel.asks.map((field) => [field, vessel.after[field]!.value]))
    }
    expect(after('zinc-copper-sulfate', 'tube')).toEqual({ coating: 'red-brown', liquid: 'paler blue' })
    expect(after('magnesium-flame', 'strip')).toEqual({ light: 'white light', solid: 'white' })
    expect(after('metals-in-acid', 'magnesium')).toEqual({ bubbles: 'fast' })
    expect(after('metals-in-acid', 'zinc')).toEqual({ bubbles: 'slow' })
    expect(after('metals-in-acid', 'copper')).toEqual({ bubbles: 'none' })
    expect(after('two-solutions', 'tube')).toEqual({ solid: 'white' })
    expect(after('peroxide', 'tube')).toEqual({ gas: 'bubbles', warmth: 'warmer' })
    expect(reactionsData.activity).toMatchObject({ order: ['magnesium', 'zinc', 'copper'], hydrogenAfter: 'zinc', basis: 'activity-series' })
  })

  it('gives every look words for before and for after, short and as seen: no look names what a thing is', () => {
    const names = /copper|zinc|magnesium|hydrogen|oxygen|oxide|carbonate|chloride|peroxide|sulfate|acid\b/i
    for (const { station, vessel } of vessels) {
      for (const look of vessel.looks) {
        for (const said of [look.before, look.after]) {
          expect(words(said), `${station.id} ${vessel.id} ${look.at}`).toBeLessThanOrEqual(16)
          expect(said, `${station.id} ${vessel.id} ${look.at}`).not.toMatch(names)
        }
      }
      // What is recorded is said in the words of the look that opens it.
      for (const field of vessel.asks) {
        const look = vessel.looks.find((l) => l.at === FIELD_AT[field])!
        const value = vessel.after[field]!.value
        const said: Record<string, RegExp> = { none: /^No /, slow: /slowly/, fast: /fast/, 'white light': /white light/, bubbles: /Bubbles/, warmer: /warmer/, 'paler blue': /paler blue/ }
        expect(look.after, `${station.id} ${vessel.id} ${field}`).toMatch(said[value] ?? new RegExp(value))
      }
    }
  })

  it('names no kind in a title (spec 24.5), and keeps every note short', () => {
    for (const station of reactionsData.stations) {
      expect(station.title).not.toMatch(/replacement|combination|decomposition|displace|synthesis/i)
      expect(station.notes.length).toBeLessThanOrEqual(3)
      for (const note of station.notes) expect(words(note.value), station.id).toBeLessThanOrEqual(40)
    }
  })

  it('has a field table that every field and every look is in', () => {
    expect(Object.keys(FIELD_AT).sort()).toEqual([...FIELDS].sort())
    expect(Object.keys(reactionsData.choices).sort()).toEqual([...FIELDS].sort())
  })

  it('keeps every hazard note of its own to three short paragraphs of 160 words at most, the last on disposal and never a procedure (spec 5.2)', () => {
    for (const [id, entry] of Object.entries(ownHazards)) {
      const paragraphs = entry.hazards.note.value.split('\n\n')
      expect(paragraphs.length, id).toBe(3)
      expect(words(entry.hazards.note.value), id).toBeLessThanOrEqual(160)
      expect(paragraphs[2], id).toBe("How any of it is disposed of is decided by the laboratory's own rules and by local regulations; ask the laboratory's supervisor.")
      expect(entry.hazards.note.value, id).not.toMatch(/Flinn|Ward|Fisher|Avantor/)
    }
  })
})

describe('validateReactions', () => {
  it('refuses a record whose pieces do not hold together', () => {
    expect(errorsWith((d) => void d.stations[0]!.tiles.push('nothing'))).toMatch(/"nothing" is no species/)
    expect(errorsWith((d) => void (d.stations[0]!.tiles = d.stations[0]!.tiles.filter((t) => t !== 'zinc')))).toMatch(/needs "zinc"/)
    expect(errorsWith((d) => void (d.stations[2]!.vessels[2]!.kind.value = 'single-replacement'))).toMatch(/an equation when something reacts/)
    expect(errorsWith((d) => void (d.stations[0]!.vessels[0]!.after.coating!.value = 'purple'))).toMatch(/"purple" is no choice of "coating"/)
    expect(errorsWith((d) => void delete d.stations[4]!.vessels[0]!.after.warmth)).toMatch(/nothing is stored for "warmth"/)
    expect(errorsWith((d) => void d.stations[4]!.vessels[0]!.looks.pop())).toMatch(/no look opens "warmth"/)
    expect(errorsWith((d) => void (d.stations[1]!.notes[0]!.sourceId = 'nothing'))).toMatch(/nothing/)
    expect(errorsWith((d) => void (d.stations[3]!.reagentIds = ['nothing']))).toMatch(/"nothing" is no reagent/)
    expect(errorsWith((d) => void (d.stations[0]!.notes[0]!.value = 'See the instructor in room 214.'))).not.toBe('')
  })
})

describe('reactionsCitations', () => {
  const ids = (station: (typeof STATION_IDS)[number], done = true) => reactionsCitations(reactionsData, station, sources, done).map((c) => c.source.id)

  it('lists every source behind a station, each once', () => {
    for (const station of STATION_IDS) {
      const listed = ids(station)
      expect(new Set(listed).size, station).toBe(listed.length)
      for (const note of stationOf(reactionsData, station).notes) expect(listed, station).toContain(note.sourceId)
    }
    expect(ids('metals-in-acid')).toContain('chemguide-reactivity-series')
    expect(ids('peroxide')).toContain('flinn-sds-398.5')
  })

  it('keeps back, until the station is done, what would say only the answers: every source it then leaves out is one of a kind, an equation, the order or a note', () => {
    for (const station of STATION_IDS) {
      const before = ids(station, false)
      const after = ids(station)
      expect(after, station).toEqual(expect.arrayContaining(before))
      const labels = reactionsCitations(reactionsData, station, sources, false).flatMap((c) => c.covers)
      expect(labels.filter((label) => /kind of reaction$|^The equation|order|Notes|catalyst/.test(label)), station).toEqual([])
    }
    expect(() => reactionsCitations(reactionsData, 'nothing' as never, sources)).toThrow(/no station "nothing"/)
  })
})
