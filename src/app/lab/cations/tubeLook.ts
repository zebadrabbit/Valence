import type { TubeLayers } from '@/app/lab/Tube'
import { TUBE_HEIGHT, liquidHex, sectionsOf, solidHex, surfaceOf as surfaceIn, tubeLayers as layersIn } from '@/app/lab/tubeDrawing'
import { PART_IDS, type PartId, type StepId, type TubeId } from '@/chem-data/cations/data'
import type { CationsModel, PartView, PlaceView, TubeShows } from '@/engine/cations'
import { progressOf } from './messages'

// What the page works out for its drawings and for where it opens. Nothing here is chemistry of its own: a tube is
// drawn from what the engine says is seen of it, the words for each part of it are the messages', and where the
// page opens is read off the engine's views.

// The drawing itself is the lab shell's (src/app/lab/tubeDrawing.ts), which the Le Chatelier's principle lab draws
// its tubes with too: how tall the picture is, the two sections that are looked at, and the colour each word of the
// record is drawn in. What is this lab's own is how full a tube of its bench gets.
export { TUBE_HEIGHT, liquidHex, sectionsOf, solidHex }

/** The most liquid a tube of this bench comes to hold: the first with the sample and its acid, the second with the water and its two reagents, or the third with the ammonia and every addition of acid it takes. */
export const fullMicrolitres = (m: CationsModel) =>
  Math.max(m.sampleMicrolitres + m.hydrochloricAcidMicrolitres, m.waterMicrolitres + m.aceticAcidMicrolitres + m.chromateMicrolitres, m.ammoniaMicrolitres + m.nitricAcidAdditions * m.nitricAcidMicrolitres)

/**
 * Where the surface of a liquid is drawn. More liquid stands higher, and an addition shows, but not to scale: the
 * least a step works with is drawn at a little over half the height of the most, so that a liquid over a solid is
 * tall enough to be seen and looked at.
 */
export const surfaceOf = (m: CationsModel, microlitres: number): number => surfaceIn(microlitres, fullMicrolitres(m))

/** What is drawn in a tube, from what the engine says is seen of it: null is a tube not yet used, which is empty. */
export const tubeLayers = (m: CationsModel, shows: TubeShows | null): TubeLayers => layersIn(shows, fullMicrolitres(m))

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
