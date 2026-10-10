import { contentsEnd, type TubeLayers } from '@/app/lab/Tube'
import { PART_IDS, type PartId, type StepId, type TubeId } from '@/chem-data/cations/data'
import type { CationsModel, Look, PartView, PlaceView, TubeShows } from '@/engine/cations'
import { progressOf } from './messages'

// What the page works out for its drawings and for where it opens. Nothing here is chemistry of its own: a tube is
// drawn from what the engine says is seen of it, the words for each part of it are the messages', and where the
// page opens is read off the engine's views.

/** How tall the picture of the step's tube is, of its own units (src/app/lab/Tube.tsx). */
export const TUBE_HEIGHT = 260
const END = contentsEnd(TUBE_HEIGHT)
/** Where the surface of a tube filled as far as this bench fills one is drawn. */
const FULL = 98
/** Where a solid that has settled begins. Every solid is drawn at this one height: the engine gives no amounts of solid. */
const SOLID_TOP = 192

/** Where the bottom of the tube, which is looked at for a solid, begins: 58 units over the foot. */
const BOTTOM = END - 58

/**
 * The two sections of the tube that are looked at, from the top, each by where it begins and ends: the liquid, and
 * the bottom, where a solid settles. Both are there whatever the tube holds, so a look at the liquid of a tube with
 * none in it finds that out. The liquid's begins a little over its surface, and is 58 units tall at the least,
 * as the bottom's is.
 */
export function sectionsOf(layers: Pick<TubeLayers, 'liquid'>): readonly (readonly [look: Look, top: number, bottom: number])[] {
  return [
    ['liquid', Math.min((layers.liquid?.surface ?? BOTTOM) - 12, BOTTOM - 58), BOTTOM],
    ['bottom', BOTTOM, END],
  ]
}

// The colour each thing is drawn in, by the word the record stores for what is seen. The word, which a look says,
// is what has a source; a value here is the drawing's rendering of that word, and nothing is read from it. A
// liquid with no colour is drawn as water is on the other labs' white cards.
const LIQUID_HEX: Record<string, string> = { colourless: '#e8edf2', 'yellow to orange': '#f2a93b' }
const SOLID_HEX: Record<string, string> = { white: '#ffffff', yellow: '#f7e65a', 'grey to black': '#5b6068' }
/** A colour the drawing has no value for: drawn grey, and named in words all the same. */
const UNKNOWN_HEX = '#9ca3af'
/** The grain over a solid too dark for the ink to show on: drawn light. */
const LIGHT_GRAIN: Record<string, string> = { 'grey to black': '#ffffff' }

export const liquidHex = (colour: string) => LIQUID_HEX[colour] ?? UNKNOWN_HEX
export const solidHex = (colour: string) => SOLID_HEX[colour] ?? UNKNOWN_HEX

/** The most liquid a tube of this bench comes to hold: the first with the sample and its acid, the second with the water and its two reagents, or the third with the ammonia and every addition of acid it takes. */
export const fullMicrolitres = (m: CationsModel) =>
  Math.max(m.sampleMicrolitres + m.hydrochloricAcidMicrolitres, m.waterMicrolitres + m.aceticAcidMicrolitres + m.chromateMicrolitres, m.ammoniaMicrolitres + m.nitricAcidAdditions * m.nitricAcidMicrolitres)

/**
 * Where the surface of a liquid is drawn. More liquid stands higher, and an addition shows, but not to scale: the
 * least a step works with is drawn at a little over half the height of the most, so that a liquid over a solid is
 * tall enough to be seen and looked at.
 */
export function surfaceOf(m: CationsModel, microlitres: number): number {
  const share = Math.min(1, microlitres / fullMicrolitres(m))
  return Math.round(END - (0.45 + 0.55 * share) * (END - FULL))
}

/** What is drawn in a tube, from what the engine says is seen of it: null is a tube not yet used, which is empty. */
export function tubeLayers(m: CationsModel, shows: TubeShows | null): TubeLayers {
  const { liquid = null, solid = null } = shows ?? {}
  return {
    liquid: liquid && { hex: liquidHex(liquid.colour), surface: surfaceOf(m, liquid.microlitres) },
    solid: solid?.settled ? { hex: solidHex(solid.colour), top: SOLID_TOP, ...(solid.colour in LIGHT_GRAIN ? { grain: LIGHT_GRAIN[solid.colour]! } : {}) } : null,
    spread: solid && !solid.settled ? { hex: solidHex(solid.colour) } : null,
  }
}

/** The three tubes as they stand in the rack. */
export const TUBE_IDS: readonly TubeId[] = ['a', 'b', 'c']

/** A place of the flow chart with the places that the steps after it make of what it holds. */
export interface ChartNode<Place> {
  place: Place
  children: ChartNode<Place>[]
}

/**
 * The flow chart as a tree: under each place, the places a later step makes of what is there. A step worked in a
 * tube that an earlier step was worked in goes on from that step's solid, which stayed in the tube; a step worked
 * in a tube that is new goes on from the liquid last poured off, which is what the tube was filled with. The places
 * one step makes are in the order they are gone on from: one that no step goes on from first, then the one whose
 * next step comes sooner. So the liquid of step 2, which step 3 tests, is over its solid, which step 4 goes on from.
 */
export function chartTree<Place extends Pick<PlaceView, 'id' | 'step' | 'layer'>>(places: readonly Place[], steps: readonly { id: StepId; tube: TubeId }[]): ChartNode<Place>[] {
  const at = (stepId: StepId) => steps.findIndex((step) => step.id === stepId)
  const parentOf = (place: Place): Place | undefined => {
    const index = at(place.step)
    // The last of each, so the list is read from its end.
    const sameTube = steps.slice(0, index).reverse().find((step) => step.tube === steps[index]!.tube)
    if (sameTube) return places.find((p) => p.step === sameTube.id && p.layer === 'solid')
    return [...places].reverse().find((p) => p.layer === 'liquid' && at(p.step) < index)
  }
  const nodes = new Map(places.map((place) => [place.id, { place, children: [] } as ChartNode<Place>]))
  const roots: ChartNode<Place>[] = []
  for (const place of places) {
    const parent = parentOf(place)
    ;(parent ? nodes.get(parent.id)!.children : roots).push(nodes.get(place.id)!)
  }
  // The step that goes on from a place; before any, where none does.
  const next = (node: ChartNode<Place>): number => Math.min(...node.children.map((child) => at(child.place.step)), node.children.length === 0 ? -1 : Infinity)
  const ordered = (list: ChartNode<Place>[]): ChartNode<Place>[] => list.map((node) => ({ ...node, children: ordered(node.children) })).sort((a, b) => next(a) - next(b))
  return ordered(roots)
}

/** A run that has been begun and is not over: there is work in it to come back to. */
const underWay = (view: Pick<PartView, 'steps' | 'outcome'>) => view.outcome.state === 'open' && view.steps.some((step) => step.added > 0 || step.status === 'done')

/**
 * The part the Lab tab shows when the page opens: the one the learner was in the middle of, as far as the stored
 * record can tell. A part whose run is begun and not over; where none is, the first part that is not done; else the
 * first. A lab that is complete still takes a new run of a part, so a part that is done can be the one under way.
 */
export function openingPart(views: Readonly<Record<PartId, Pick<PartView, 'steps' | 'naming' | 'outcome' | 'done'>>>): PartId {
  const notDone = PART_IDS.filter((part) => progressOf(views[part]) !== 'done')
  return notDone.find((part) => underWay(views[part])) ?? PART_IDS.find((part) => underWay(views[part])) ?? notDone[0] ?? PART_IDS[0]
}

/** The entry of a part's list that is shown when the part opens: the step the run has reached, or the entry after the five once they are done. */
export const openingEntry = (view: Pick<PartView, 'step' | 'steps'>): number => (view.step === null ? view.steps.length : view.steps.findIndex((step) => step.id === view.step))
