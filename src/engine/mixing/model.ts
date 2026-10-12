import { type Family, type LiquidId, type MixingData, type PairId, type QuestionId, type SolidId, type SolidTubeId } from '@/chem-data/mixing/data'
import type { TubeShows } from '../tubeShows'

// What the polarity and mixing lab is worked from: the record, cut down to what the engine needs, in whole numbers.
// It works one thing out: which liquid of a pair that makes two layers is on top, from the two densities (spec
// 25.3). Everything else is read off: whether a pair mixes, whether a solid dissolves, a liquid's family, an answer.
// The app's model is made from the sourced record (modelFrom); tests pin their expected values against a literal
// (pinnedModel.ts), so that a change to the record cannot move them unseen.

export interface LiquidModel {
  id: LiquidId
  /** Its colour, in the record's words. */
  colour: string
  /** Its density in milligrams for each millilitre, to the nearest one: 0.923 g/mL is 923. */
  density: number
  family: Family
}

export interface SolidModel {
  id: SolidId
  colour: string
}

export interface PairModel {
  id: PairId
  /** The two liquids, in the bench's order. */
  liquids: readonly [LiquidId, LiquidId]
  /** Whether the two mix into one layer. */
  mix: boolean
}

export interface SolidTubeModel {
  id: SolidTubeId
  solid: SolidId
  liquid: LiquidId
  dissolves: boolean
}

export interface QuestionModel {
  id: QuestionId
  choices: readonly [string, string]
  answer: string
}

export interface MixingModel {
  liquids: readonly LiquidModel[]
  solids: readonly SolidModel[]
  pairs: readonly PairModel[]
  solidTubes: readonly SolidTubeModel[]
  questions: readonly QuestionModel[]
  /** How many pairs, and how many solids in liquids, must count for parts 1 and 2 to be done (spec 25.1). */
  neededPairs: number
  neededSolids: number
  /** The volumes a tube is drawn to: of the liquid there is more of and less of in a pair, and of the liquid a solid is tried in. */
  moreMicrolitres: number
  lessMicrolitres: number
  solidTubeMicrolitres: number
}

/** The model the app runs on, from the sourced record. */
export function modelFrom(data: MixingData): MixingModel {
  return {
    liquids: data.liquids.map((liquid) => ({ id: liquid.id, colour: liquid.looks.value, density: Math.round(liquid.density.value * 1000), family: liquid.family.value })),
    solids: data.solids.map((solid) => ({ id: solid.id, colour: solid.looks.value })),
    pairs: data.pairs.map((pair) => ({ id: pair.id, liquids: pair.liquidIds, mix: pair.mix.value })),
    solidTubes: data.solidInLiquid.map((tube) => ({ id: tube.id, solid: tube.solidId, liquid: tube.liquidId, dissolves: tube.dissolves.value })),
    questions: data.rule.questions.map((question) => ({ id: question.id, choices: question.choices, answer: question.answer.value })),
    neededPairs: data.parameters.neededPairs.value,
    neededSolids: data.parameters.neededSolids.value,
    moreMicrolitres: data.parameters.moreMicrolitres.value,
    lessMicrolitres: data.parameters.lessMicrolitres.value,
    solidTubeMicrolitres: data.parameters.solidTubeMicrolitres.value,
  }
}

const found = <T>(item: T | undefined, what: string): T => {
  if (item === undefined) throw new Error(`no ${what}`)
  return item
}
export const liquidModel = (m: MixingModel, id: LiquidId): LiquidModel => found(m.liquids.find((liquid) => liquid.id === id), `liquid "${id}"`)
export const pairModel = (m: MixingModel, id: PairId): PairModel => found(m.pairs.find((pair) => pair.id === id), `pair "${id}"`)
export const solidTubeModel = (m: MixingModel, id: SolidTubeId): SolidTubeModel => found(m.solidTubes.find((tube) => tube.id === id), `solid in liquid "${id}"`)
export const questionModel = (m: MixingModel, id: QuestionId): QuestionModel => found(m.questions.find((question) => question.id === id), `question "${id}"`)

/** The pair of the bench that two liquids make, whichever is named first; null for one liquid twice and for a pair left off the bench. */
export const pairOf = (m: MixingModel, a: LiquidId, b: LiquidId): PairId | null => (a === b ? null : (m.pairs.find((pair) => pair.liquids.includes(a) && pair.liquids.includes(b))?.id ?? null))

/** The tube of the bench for a solid in a liquid; null for one left off the bench. */
export const solidTubeOf = (m: MixingModel, solid: SolidId, liquid: LiquidId): SolidTubeId | null => m.solidTubes.find((tube) => tube.solid === solid && tube.liquid === liquid)?.id ?? null

/**
 * The liquid on top where a pair makes two layers: the less dense of the two, by the stored densities (spec 25.3).
 * Null for a pair that mixes. The build refuses a pair whose two densities are too near to say.
 */
export function topOf(m: MixingModel, id: PairId): LiquidId | null {
  const pair = pairModel(m, id)
  if (pair.mix) return null
  const [a, b] = pair.liquids
  return liquidModel(m, a).density < liquidModel(m, b).density ? a : b
}

/** How far a tube has come: nothing in it; its liquids, or its liquid and its solid, in; shaken; left to stand. */
export const STAGES = ['empty', 'in', 'shaken', 'stood'] as const
export type Stage = (typeof STAGES)[number]

/** The colour of two liquids as one: a liquid with a colour mixed with one that has none keeps its colour (the lab's own: parameters.mixedKeepsColour). */
const mixedColour = (a: LiquidModel, b: LiquidModel) => (a.colour !== 'colourless' ? a.colour : b.colour)

/**
 * What is seen of a pair's tube. Until it has stood it is one cloudy, unsettled liquid, whatever the two are (the
 * lab's own: parameters.unsettledUntilStood), so that nothing can be read from a tube before it has stood. Once it
 * has stood: one clear liquid where the two mix; where they do not, two layers, the less dense above, each as
 * thick as the amount of it that went in.
 */
export function pairShows(m: MixingModel, id: PairId, more: LiquidId | null, stage: Stage): TubeShows {
  const pair = pairModel(m, id)
  if (stage === 'empty' || more === null) return { liquid: null, solid: null }
  const [a, b] = pair.liquids.map((liquid) => liquidModel(m, liquid)) as [LiquidModel, LiquidModel]
  const total = m.moreMicrolitres + m.lessMicrolitres
  if (stage !== 'stood') return { liquid: { colour: mixedColour(a, b), cloudy: true, microlitres: total }, solid: null }
  if (pair.mix) return { liquid: { colour: mixedColour(a, b), cloudy: false, microlitres: total }, solid: null }
  const [upper, lower] = a.density < b.density ? [a, b] : [b, a]
  const amount = (liquid: LiquidModel) => (liquid.id === more ? m.moreMicrolitres : m.lessMicrolitres)
  return { liquid: { colour: lower.colour, cloudy: false, microlitres: amount(lower) }, above: { colour: upper.colour, cloudy: false, microlitres: amount(upper) }, solid: null }
}

/**
 * What is seen of the tube of a solid in a liquid. Just in: the liquid, clear, with the solid at the bottom, where
 * a grain denser than the liquid falls. Shaken: the liquid cloudy with the solid spread through it, whatever the
 * two are (the lab's own, as for a pair). Once it has stood: the clear liquid alone where the solid dissolves, and
 * the clear liquid over the solid at the bottom where it does not.
 */
export function solidTubeShows(m: MixingModel, id: SolidTubeId, stage: Stage): TubeShows {
  const tube = solidTubeModel(m, id)
  if (stage === 'empty') return { liquid: null, solid: null }
  const colour = liquidModel(m, tube.liquid).colour
  const solid = found(m.solids.find((s) => s.id === tube.solid), `solid "${tube.solid}"`).colour
  const liquid = (cloudy: boolean) => ({ colour, cloudy, microlitres: m.solidTubeMicrolitres })
  if (stage === 'in') return { liquid: liquid(false), solid: { colour: solid, settled: true } }
  if (stage === 'shaken') return { liquid: liquid(true), solid: { colour: solid, settled: false } }
  return { liquid: liquid(false), solid: tube.dissolves ? null : { colour: solid, settled: true } }
}
