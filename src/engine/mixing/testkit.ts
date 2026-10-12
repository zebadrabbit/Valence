import { isPairId, LIQUID_IDS, PAIR_IDS, QUESTION_IDS, SOLID_TUBE_IDS, type LiquidId, type PairId, type SolidTubeId, type TubeId } from '@/chem-data/mixing/data'
import { reduce, type Action } from './actions'
import { liquidModel, pairModel, questionModel, solidTubeModel, topOf, type MixingModel } from './model'
import type { MixingState } from './state'

// For tests only: the lab worked as a careful learner would, who records of each tube what it shows. It reads the
// model's answers, which no page may, so the lint rule keeps it out of src/app but for test files.

/** The state after a list of actions; one that cannot be done leaves the state as it was. */
export const run = (m: MixingModel, state: MixingState, actions: readonly Action[]): MixingState => actions.reduce((s, action) => reduce(m, s, action), state)

/** What a careful learner records of a pair: one layer, or two and the liquid on top. `wrong` records the other number of layers. */
const pairAnswers = (m: MixingModel, id: PairId, wrong: boolean): Action[] => {
  const { mix, liquids } = pairModel(m, id)
  const two = mix === wrong
  if (!two) return [{ type: 'sayLayers', tube: id, is: 'one' }]
  return [{ type: 'sayLayers', tube: id, is: 'two' }, { type: 'sayTop', tube: id, is: topOf(m, id) ?? liquids[0] }]
}

/**
 * One pair's tube from pouring to its check: more of `more` (the first liquid of the pair, unless given), shaken,
 * stood, looked at and recorded. `wrong` records what the tube does not show, which Guided refuses. `check: false`
 * leaves a tube of Challenge recorded and not checked.
 */
export function wholePair(m: MixingModel, state: MixingState, id: PairId, options: { more?: LiquidId; wrong?: boolean; check?: boolean } = {}): MixingState {
  const more = options.more ?? pairModel(m, id).liquids[0]
  return run(m, state, [{ type: 'pour', tube: id, more }, { type: 'shake', tube: id }, { type: 'stand', tube: id }, { type: 'look', tube: id }, ...pairAnswers(m, id, options.wrong ?? false), ...(options.check === false ? [] : [{ type: 'check', tube: id } as const])])
}

/** One solid's tube from adding to its check. */
export function wholeSolidTube(m: MixingModel, state: MixingState, id: SolidTubeId, options: { wrong?: boolean; check?: boolean } = {}): MixingState {
  const gone = solidTubeModel(m, id).dissolves !== (options.wrong ?? false)
  return run(m, state, [{ type: 'add', tube: id }, { type: 'shake', tube: id }, { type: 'stand', tube: id }, { type: 'look', tube: id }, { type: 'saySolid', tube: id, is: gone ? 'gone' : 'left' }, ...(options.check === false ? [] : [{ type: 'check', tube: id } as const])])
}

export const wholeTube = (m: MixingModel, state: MixingState, id: TubeId): MixingState => (isPairId(id) ? wholePair(m, state, id) : wholeSolidTube(m, state, id))

/** The first `count` pairs of the bench, each counting: as many as part 1 needs, unless given. */
export const wholePairs = (m: MixingModel, state: MixingState, count = m.neededPairs): MixingState => PAIR_IDS.slice(0, count).reduce((s, id) => wholePair(m, s, id), state)
/** The first `count` solids in liquids of the bench, each counting: as many as part 2 needs, unless given. */
export const wholeSolids = (m: MixingModel, state: MixingState, count = m.neededSolids): MixingState => SOLID_TUBE_IDS.slice(0, count).reduce((s, id) => wholeSolidTube(m, s, id), state)

/** Part 3, every liquid in its family and both questions answered right, and checked. */
export function wholeRule(m: MixingModel, state: MixingState): MixingState {
  return run(m, state, [
    ...LIQUID_IDS.map((liquid): Action => ({ type: 'sort', liquid, family: liquidModel(m, liquid).family })),
    ...QUESTION_IDS.map((question): Action => ({ type: 'answer', question, is: questionModel(m, question).answer })),
    { type: 'checkRule' },
  ])
}

/** The whole lab: as many pairs and solids in liquids as the parts need, and part 3. */
export const wholeLab = (m: MixingModel, state: MixingState): MixingState => wholeRule(m, wholeSolids(m, wholePairs(m, state)))
