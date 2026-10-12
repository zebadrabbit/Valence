import type { CabbageData, ScaleQuestionId, ThingId } from '@/chem-data/cabbage/data'
import type { TubeShows } from '../tubeShows'

// The plain values the red cabbage engine runs on (spec 21.3). The record gives the table of the indicator's
// colours with the model's edges between them, each household thing's range of pH and what it looks like before
// the indicator goes in; the engine reads those and works no chemistry out. Everything is a whole number: a pH is
// held in tenths of a unit, as the meter reads it. That the table covers the scale, and that a careful estimate is
// within a unit of every pH a thing can have, is the build's to check (scripts/cabbage-lib.mjs), which finds a
// colour the same way: a test holds the two to each other.

export interface ThingModel {
  id: ThingId
  /** The lowest and the highest pH a rinsed probe reads in it, in tenths: the seed draws between them. */
  lowTenths: number
  highTenths: number
  /** What is seen of it before the indicator goes in. */
  before: { liquid: string; cloudy: boolean; solid: string | null }
  /** True for the thing that destroys the dye. */
  bleaches: boolean
}

export type ScaleQuestion = { id: ScaleQuestionId; kind: 'colour-of-tube'; ph: number } | { id: ScaleQuestionId; kind: 'same-colour-pair' }

export interface CabbageModel {
  /** The pH of each buffer of the scale, in the rack's order. */
  phs: readonly number[]
  /** The indicator's colours from strong acid to strong base, and the highest pH, in tenths, that shows each but the last. */
  colours: readonly string[]
  edgesTenths: readonly number[]
  /** What is seen where the dye has been destroyed, and of a buffer before the indicator goes in. */
  bleached: string
  things: readonly ThingModel[]
  questions: readonly ScaleQuestion[]
  unrinsedSharePercent: number
  estimateWithinTenths: number
  neededToCount: number
  sampleMicrolitres: number
  indicatorMicrolitres: number
}

export const CLASSES = ['acid', 'neutral', 'basic'] as const
export type Class = (typeof CLASSES)[number]

/** What is said by eye where no tube of the scale can be named. */
export const CANNOT_SAY = 'cannot-say'
export type Estimate = number | typeof CANNOT_SAY

/** The colour the indicator shows at a pH in tenths: the first colour whose edge the pH does not pass. */
export function colourAt(m: CabbageModel, tenths: number): string {
  const at = m.edgesTenths.findIndex((edge) => tenths <= edge)
  return m.colours[at === -1 ? m.edgesTenths.length : at]!
}

/**
 * Whether a pH in tenths is acid, neutral or basic as this lab judges it: neutral where the indicator shows the
 * colour of the pH 7 buffer, which is within half a unit of 7; acid below that, and basic above.
 */
export function classAt(m: CabbageModel, tenths: number): Class {
  if (colourAt(m, tenths) === colourAt(m, 70)) return 'neutral'
  return tenths < 70 ? 'acid' : 'basic'
}

/** A thing of the model by its id. */
export function thingModel(m: CabbageModel, thingId: ThingId): ThingModel {
  const thing = m.things.find((t) => t.id === thingId)
  if (!thing) throw new Error(`the model has no thing "${thingId}"`)
  return thing
}

/** What is seen of a buffer of the scale: a clear liquid with no colour, and then the indicator's colour at its pH. */
export function bufferShows(m: CabbageModel, ph: number, indicator: boolean): TubeShows {
  return { liquid: { colour: indicator ? colourAt(m, ph * 10) : m.bleached, cloudy: false, microlitres: m.sampleMicrolitres + (indicator ? m.indicatorMicrolitres : 0) }, solid: null }
}

/**
 * What is seen of a household thing in its tube. Before the indicator goes in, its own look. After, the
 * indicator's colour at the thing's pH, in a liquid as clear or as cloudy as it was, over whatever solid lay
 * there; and no colour at all where the thing destroys the dye.
 */
export function thingShows(m: CabbageModel, thing: ThingModel, tenths: number, indicator: boolean): TubeShows {
  const { before } = thing
  const colour = !indicator ? before.liquid : thing.bleaches ? m.bleached : colourAt(m, tenths)
  return { liquid: { colour, cloudy: before.cloudy, microlitres: m.sampleMicrolitres + (indicator ? m.indicatorMicrolitres : 0) }, solid: before.solid === null ? null : { colour: before.solid, settled: true } }
}

/** The right answer to a question of the scale: a colour, or the lower pH of the two neighbouring buffers that share one. */
export function scaleAnswer(m: CabbageModel, question: ScaleQuestion): string | number {
  if (question.kind === 'colour-of-tube') return colourAt(m, question.ph * 10)
  const upper = m.phs.find((ph, i) => i > 0 && colourAt(m, ph * 10) === colourAt(m, m.phs[i - 1]! * 10))
  if (upper === undefined) throw new Error('no two neighbouring buffers share a colour')
  return m.phs[m.phs.indexOf(upper) - 1]!
}

/** What a question of the scale is answered from: the indicator's colours, or every buffer that has a neighbour above it. */
export const scaleChoices = (m: CabbageModel, question: ScaleQuestion): readonly (string | number)[] => (question.kind === 'colour-of-tube' ? m.colours : m.phs.slice(0, -1))

/** The engine's values, from the stored record. */
export function modelFrom(data: CabbageData): CabbageModel {
  const { parameters } = data
  return {
    phs: data.scale.buffers.map((buffer) => buffer.ph),
    colours: data.indicator.colours.map((row) => row.colour),
    edgesTenths: parameters.colourEdgesTenths.value,
    bleached: data.indicator.bleached.value,
    things: data.things.map((thing): ThingModel => {
      const { ph } = thing
      // A printed range is narrowed to the tenths inside it; one that is worked out is stored to the tenth.
      const [lowTenths, highTenths] = ph.basis === 'document' ? [Math.ceil(ph.low.value * 10 - 1e-9), Math.floor(ph.high.value * 10 + 1e-9)] : [Math.round(ph.low.value * 10), Math.round(ph.high.value * 10)]
      return { id: thing.id, lowTenths, highTenths, before: thing.before.value, bleaches: thing.bleaches === true }
    }),
    questions: data.scale.questions,
    unrinsedSharePercent: parameters.unrinsedSharePercent.value,
    estimateWithinTenths: parameters.estimateWithinTenths.value,
    neededToCount: parameters.neededToCount.value,
    sampleMicrolitres: parameters.sampleMicrolitres.value,
    indicatorMicrolitres: parameters.indicatorMicrolitres.value,
  }
}
