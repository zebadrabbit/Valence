import type { AqueousData } from '@/chem-data/aqueous/data'
import { stationResult, type StationView } from '@/engine/aqueous'

// What the page works out for its drawing and its list of stations. Nothing here is chemistry of its own: the tube
// is drawn from the engine's result, the words for each part of it are worded from this drawing and that result
// (toolOutcome), and a station's progress is read off the engine's view of it.

export interface TubeLook {
  liquid: { name: string; hex: string }
  /** The layer of solid at the bottom of the tube, where one forms. */
  solid: { name: string; hex: string } | null
  bubbles: boolean
}

/** A liquid with no coloured ion in it, drawn as water is on the titration lab's white card. */
const WATER = '#e8edf2'

// The colour a solid is drawn in, by the name the record stores for it. The name, which the bottom of the tube says
// in words when it is looked at, is what has a source; the value here is the drawing's rendering of that name and nothing is read from it.
const SOLID_HEX: Record<string, string> = { 'rust-brown': '#8b4a2b', 'blue-green': '#4fa6a0', 'pale green': '#a9d8a0', white: '#ffffff' }
/** A solid whose colour the drawing has no value for: drawn grey, and named in words all the same. */
const UNKNOWN_SOLID = '#9ca3af'

/** The mean of some colours, channel by channel: how the drawing shows two coloured ions in one liquid. */
export function blend(hexes: readonly string[]): string {
  const channel = (at: number) => Math.round(hexes.reduce((sum, hex) => sum + parseInt(hex.slice(at, at + 2), 16), 0) / hexes.length)
  return `#${[1, 3, 5].map((at) => channel(at).toString(16).padStart(2, '0')).join('')}`
}

/**
 * What is drawn in a station's tube once it is mixed: the liquid's colour from the coloured ions the engine leaves
 * in it, the solid the engine forms in the colour of its observation row, and bubbles where the engine gives a gas
 * and the station's record has it seen to bubble (ammonia is not: spec 8.2).
 * ponytail: a solid that went in and is not all used up is not drawn. None of the ten stations leaves one (spec
 * 8.4); a station that does is the time to draw it.
 */
export function tubeLook(data: AqueousData, stationId: string): TubeLook {
  const station = data.stations.find((s) => s.id === stationId)!
  const result = stationResult(data, stationId)
  const colours = result.colouredIons.map((id) => data.species.find((s) => s.id === id)!.solutionColor!.value)
  const liquid =
    colours.length === 0 ? { name: 'colourless', hex: WATER } : colours.length === 1 ? colours[0]! : { name: station.expected.liquidColor, hex: blend(colours.map((colour) => colour.hex)) }
  const row = result.precipitate === null ? undefined : data.observations.find((o) => o.productId === result.precipitate)
  const solid = result.precipitate === null ? null : { name: row?.color ?? 'new', hex: SOLID_HEX[row?.color ?? ''] ?? UNKNOWN_SOLID }
  return { liquid, solid, bubbles: station.expected.bubbles && result.gas !== null }
}

/** How far a station has come, as the list of stations says it. */
export type Progress = 'not-started' | 'started' | 'observed' | 'done'

export function progressOf(view: StationView): Progress {
  if (view.done) return 'done'
  if (view.wrongFields?.length === 0) return 'observed'
  return view.mixed || Object.values(view.equations).some((equation) => equation !== null) ? 'started' : 'not-started'
}

/**
 * The station the Lab tab shows when the page opens: the one the learner was in the middle of, as far as the
 * stored record can tell. The first that is begun and not done; where none is, the first not done; else the first.
 * ponytail: the station shown is state of the page and is not stored or in the address, so a reload in the middle
 * of the second of two stations begun opens on the first. Store it, or put it in the address, if that is asked for.
 */
export function openingStation(progress: readonly Progress[]): number {
  const begun = progress.findIndex((p) => p === 'started' || p === 'observed')
  return Math.max(0, begun >= 0 ? begun : progress.findIndex((p) => p !== 'done'))
}
