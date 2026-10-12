import { contentsEnd, type LayerWords, type TubeLayers, type TubeSection } from '@/app/lab/Tube'
import { liquidHex, solidHex } from '@/app/lab/tubeDrawing'
import { PAIR_IDS, SOLID_TUBE_IDS, type PartId, type TubeId } from '@/chem-data/mixing/data'
import { benchView, ruleView, tubeView, type MixingModel, type MixingState, type TubeShows, type TubeView } from '@/engine/mixing'
import { PAGE_TEXT, PART_LABEL, TUBE_STATUS, partStatus, tubeStatus, type TubePart } from './messages'

// What the page works out for the picture of a tube, for where it opens and for the few words beside a tube or a
// part where one is chosen. Nothing here is chemistry: a tube is drawn from what the engine says is seen of it, and
// each layer is as thick as the amount the engine gives it.

/** How tall the picture of this lab's tube is, of its own units (Tube.tsx): taller than the other labs', so that the thinner of two layers is a finger tall where the picture is drawn 280 px wide. */
export const TUBE_HEIGHT = 300
const END = contentsEnd(TUBE_HEIGHT)
/** Where the surface of a tube filled as far as this bench fills one is drawn. */
const FULL = 70
/** Where a solid at the bottom begins: every one is drawn at this height, since the engine gives no amount of solid. */
const SOLID_TOP = END - 42
/** Where the bottom of a tube with a solid put in, which is looked at for the solid, begins. */
const BOTTOM = END - 68
/** How far a section of the picture begins over a surface, so that the surface is inside it. */
const OVER = 12
/** How far short of the line between two layers each layer's section stops, so that neither section's edge is drawn over the line. */
const CLEAR = 4

/** Where the surface of so much liquid is drawn, in a tube that `full` fills: the height is in proportion to the amount. */
const surfaceOf = (microlitres: number, full: number) => Math.round(END - (Math.min(microlitres, full) / full) * (END - FULL))

/**
 * What is drawn in a tube, from what the engine says is seen of it. One liquid stands as high as its amount; two
 * fill the tube to the sum of their amounts, and the line between them is where the lower one's share of that
 * height ends, so that each band's height is in proportion to its own amount (spec 25.2). `full` is the most this
 * bench puts in a tube.
 */
export function tubeLayers(shows: TubeShows, full: number): TubeLayers {
  const { liquid, above, solid } = shows
  if (liquid === null) return { liquid: null, solid: null }
  const drawn = { hex: liquidHex(liquid.colour), cloudy: liquid.cloudy }
  return {
    liquid: { ...drawn, surface: surfaceOf(liquid.microlitres, full) },
    ...(above ? { above: { hex: liquidHex(above.colour), surface: surfaceOf(liquid.microlitres + above.microlitres, full) } } : {}),
    solid: solid?.settled ? { hex: solidHex(solid.colour), top: SOLID_TOP } : null,
    spread: solid && !solid.settled ? { hex: solidHex(solid.colour) } : null,
  }
}

/**
 * The sections of a tube's picture that are looked at, from the top. Two layers are a section each, which stop a
 * little short of the line between them. One liquid is one section, down to the foot of the tube. A tube that a
 * solid went into has the bottom as a section of its own whether or not a solid is seen there, so that a look at it
 * finds that out; its name says only where it is. An empty tube has none.
 */
export function tubeSections(view: Pick<TubeView, 'kind' | 'shows'>, layers: TubeLayers, looked: (part: TubePart) => boolean): TubeSection<TubePart>[] {
  if (layers.liquid === null) return []
  const section = (part: TubePart, top: number, bottom: number, label: string, foot = false): TubeSection<TubePart> => ({ part, top, bottom, name: looked(part) ? `${label}, ${PAGE_TEXT.looked}` : label, looked: looked(part), foot })
  const surface = layers.liquid.surface
  if (layers.above) return [section('upper', layers.above.surface - OVER, surface - CLEAR, PART_LABEL.upper), section('lower', surface + CLEAR, END, PART_LABEL.lower, true)]
  if (view.kind === 'solid') return [section('liquid', surface - OVER, BOTTOM, PART_LABEL.liquid), section('solid', BOTTOM, END, PAGE_TEXT.bottom, true)]
  return [section('liquid', surface - OVER, END, PART_LABEL.liquid, true)]
}

/**
 * The word beside the bracket of each layer of a tube's picture: there for a layer that has been looked at, and for
 * no other. A bracket with its word says how many layers a tube has and which is which, and that is the learner's to
 * find by looking: where two liquids have no colour, finding the line between them is the observation (spec 25.2).
 * The picture itself, its bands and its line, is drawn from the start.
 */
export function tubeWords(layers: TubeLayers, looked: (part: TubePart) => boolean): LayerWords {
  const word = (part: TubePart, label: string) => (looked(part) ? label : null)
  return { liquid: layers.above ? word('lower', PART_LABEL.lower) : word('liquid', PART_LABEL.liquid), above: word('upper', PART_LABEL.upper), solid: word('solid', PART_LABEL.solid) }
}

/** A mark for the eye, the words that say the same, and whether it is the mark of something done. */
export interface Status {
  mark: string
  text: string
  done: boolean
}

/** How a tube stands, in a word or two beside a mark, where the tubes are chosen. */
export function tubeMark(view: Pick<TubeView, 'outcome' | 'stage'>): Status {
  const text = tubeStatus(view)
  if (view.outcome.state === 'counts') return { mark: '✓', text, done: true }
  if (view.outcome.state === 'does-not-count') return { mark: '◑', text, done: false }
  return { mark: view.stage === 'empty' ? '○' : '◔', text, done: false }
}

/** What stands in the place of a pair or a solid in a liquid that the bench has not got: words alone, in a place with a dashed edge. */
export const OFF_BENCH: Status = { mark: '', text: TUBE_STATUS['off-bench'], done: false }

/** How each part stands, in a word or two beside a mark, for the three buttons the parts are chosen with. */
export function partMarks(m: MixingModel, state: MixingState): Record<PartId, Status> {
  const bench = benchView(m, state)
  const rule = ruleView(m, state)
  const begun = rule.sorted.some((one) => one.family !== null) || rule.questions.some((question) => question.answer !== null)
  const counted = (done: boolean, count: number, partId: PartId): Status => ({ mark: done ? '✓' : count > 0 ? '◔' : '○', text: partStatus(bench, partId, false), done })
  return {
    liquids: counted(bench.pairsDone, bench.pairsCounted, 'liquids'),
    solids: counted(bench.solidsDone, bench.solidsCounted, 'solids'),
    rule: { mark: bench.ruleDone ? '✓' : bench.ruleOpen && begun ? '◔' : '○', text: partStatus(bench, 'rule', begun), done: bench.ruleDone },
  }
}

/**
 * The part and the tube the Lab tab shows when the page opens: where the learner was, as far as the stored record
 * can tell. A tube that is begun and does not count yet, the earliest on the bench; where none is, the first part
 * of the three that is not done, with no tube chosen; in a lab that is complete, the last part. The record does not
 * hold which was shown.
 */
export function opening(m: MixingModel, state: MixingState): { part: PartId; tube: TubeId | null } {
  const tubes: readonly TubeId[] = [...PAIR_IDS, ...SOLID_TUBE_IDS]
  const begun = tubes.map((id) => tubeView(m, state, id)).find((view) => view.stage !== 'empty' && view.outcome.state !== 'counts')
  if (begun) return { part: begun.kind === 'pair' ? 'liquids' : 'solids', tube: begun.id }
  const bench = benchView(m, state)
  return { part: !bench.pairsDone ? 'liquids' : !bench.solidsDone ? 'solids' : 'rule', tube: null }
}
