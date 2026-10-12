import { FAMILIES, isPairId, LIQUID_IDS, PAIR_IDS, QUESTION_IDS, SOLID_TUBE_IDS, type Family, type LiquidId, type PairId, type QuestionId, type SolidId, type SolidTubeId, type TubeId } from '@/chem-data/mixing/data'
import type { TubeShows } from '../tubeShows'
import { pairModel, pairShows, questionModel, solidTubeModel, solidTubeShows, type MixingModel, type Stage } from './model'
import {
  answerRight,
  countedPairs,
  countedSolids,
  layersRight,
  pairReasons,
  pairRecorded,
  pairsDone,
  ruleDone,
  ruleOpen,
  ruleRecorded,
  solidReasons,
  solidRight,
  solidsDone,
  sortRight,
  stageOf,
  topRight,
  type Layers,
  type MixingState,
  type Reason,
  type SolidSeen,
} from './state'

// Everything the app shows, worked out from the stored record. A tube is handed over as what is seen of it now,
// in the record's words for colours: one unsettled liquid until it has stood, and then its layers or its solid.
// Whether two liquids mix, which is on top and whether a solid dissolves are handed over only as that picture,
// which a learner looks at and records from. Whether an answer is right is handed over only once it has been
// judged: in Guided as it is recorded, and in Challenge once the tube or the part has been checked. No view hands
// over a liquid's family: part 3's view holds what the learner sorted, and marks it once it is judged (spec 25.5).
// The wording is the app's: these hand over identifiers, whole numbers and the record's words for colours.

export type { TubeShows }

/** How a tube or a part stands. */
export type Outcome =
  /** There is still something to do in it. */
  | { state: 'open' }
  /** Everything is recorded, and it waits to be checked. */
  | { state: 'to-check' }
  | { state: 'counts' }
  | { state: 'does-not-count' }

interface TubeCommon {
  /** How many times the tube has been set up again. */
  tries: number
  /** How far it has come: nothing in it, its things in, shaken, left to stand. */
  stage: Stage
  /** The tube as it is seen now. */
  shows: TubeShows
  /** It has been looked at since it stood. */
  looked: boolean
  /** What is seen can be recorded or changed now. */
  formOpen: boolean
  outcome: Outcome
  /** Why it does not count; empty unless the outcome says so. */
  reasons: Reason[]
  /** The tube counts, so its note may be shown. */
  notesShown: boolean
}

export interface PairView extends TubeCommon {
  kind: 'pair'
  id: PairId
  /** The two liquids, in the bench's order. */
  liquids: readonly [LiquidId, LiquidId]
  /** The liquid there is more of, once the two are in: the thicker layer where there are two. */
  more: LiquidId | null
  layers: Layers | null
  /** Which liquid is on top is asked: two layers are recorded. */
  topAsked: boolean
  top: LiquidId | null
  /** Null until judged. */
  layersRight: boolean | null
  topRight: boolean | null
}

export interface SolidTubeView extends TubeCommon {
  kind: 'solid'
  id: SolidTubeId
  solid: SolidId
  liquid: LiquidId
  seen: SolidSeen | null
  /** Null until judged. */
  seenRight: boolean | null
}

export type TubeView = PairView | SolidTubeView

const outcomeOf = (reasons: Reason[] | null, recorded: boolean): Outcome => (reasons === null ? { state: recorded ? 'to-check' : 'open' } : { state: reasons.length === 0 ? 'counts' : 'does-not-count' })

/** One pair of liquids as its card shows it. */
export function pairView(m: MixingModel, state: MixingState, id: PairId): PairView {
  const tube = state.pairs[id]
  const reasons = pairReasons(m, id, tube)
  // Guided records only what is right, so what it has recorded is judged as it stands; Challenge is judged when the tube is checked.
  const judged = tube.checked || state.mode === 'guided'
  const stage = stageOf(tube, tube.more !== null)
  return {
    kind: 'pair',
    id,
    liquids: pairModel(m, id).liquids,
    more: tube.more,
    tries: tube.tries,
    stage,
    shows: pairShows(m, id, tube.more, stage),
    looked: tube.looked,
    formOpen: tube.looked && !tube.checked,
    layers: tube.layers,
    topAsked: tube.layers === 'two',
    top: tube.top,
    layersRight: judged && tube.layers !== null ? layersRight(m, id, tube.layers) : null,
    // Which liquid is on top is judged only where two layers are what the tube shows: of a pair that mixes there is none to be right about.
    topRight: judged && tube.top !== null && layersRight(m, id, 'two') ? topRight(m, id, tube.top) : null,
    outcome: outcomeOf(reasons, pairRecorded(tube)),
    reasons: reasons ?? [],
    notesShown: reasons?.length === 0,
  }
}

/** One solid in a liquid as its card shows it. */
export function solidTubeView(m: MixingModel, state: MixingState, id: SolidTubeId): SolidTubeView {
  const tube = state.solids[id]
  const reasons = solidReasons(m, id, tube)
  const judged = tube.checked || state.mode === 'guided'
  const stage = stageOf(tube, tube.added)
  const { solid, liquid } = solidTubeModel(m, id)
  return {
    kind: 'solid',
    id,
    solid,
    liquid,
    tries: tube.tries,
    stage,
    shows: solidTubeShows(m, id, stage),
    looked: tube.looked,
    formOpen: tube.looked && !tube.checked,
    seen: tube.solid,
    seenRight: judged && tube.solid !== null ? solidRight(m, id, tube.solid) : null,
    outcome: outcomeOf(reasons, tube.solid !== null),
    reasons: reasons ?? [],
    notesShown: reasons?.length === 0,
  }
}

/** Any tube of the bench by its id. */
export const tubeView = (m: MixingModel, state: MixingState, id: TubeId): TubeView => (isPairId(id) ? pairView(m, state, id) : solidTubeView(m, state, id))

export interface RuleView {
  /** Part 3 is open: the first two parts are done. */
  open: boolean
  /** The families a liquid is sorted into. */
  families: readonly Family[]
  /** Each liquid with the family the learner sorted it into. `right` is null until judged. */
  sorted: { liquid: LiquidId; family: Family | null; right: boolean | null }[]
  questions: { id: QuestionId; choices: readonly [string, string]; answer: string | null; right: boolean | null }[]
  answersOpen: boolean
  outcome: Outcome
  tries: number
  notesShown: boolean
}

/** Part 3: the sorting of the five liquids, and the two questions the rule answers. */
export function ruleView(m: MixingModel, state: MixingState): RuleView {
  const { rule } = state
  const open = ruleOpen(m, state)
  const judged = rule.checked || state.mode === 'guided'
  const done = open && ruleDone(m, rule)
  return {
    open,
    families: FAMILIES,
    sorted: LIQUID_IDS.map((liquid) => {
      const family = rule.sorted[liquid]
      return { liquid, family, right: judged && family !== null ? sortRight(m, liquid, family) : null }
    }),
    questions: QUESTION_IDS.map((id) => {
      const answer = rule.answers[id]
      return { id, choices: questionModel(m, id).choices, answer, right: judged && answer !== null ? answerRight(m, id, answer) : null }
    }),
    answersOpen: open && !rule.checked,
    outcome: rule.checked ? { state: done ? 'counts' : 'does-not-count' } : { state: ruleRecorded(rule) ? 'to-check' : 'open' },
    tries: rule.tries,
    notesShown: done,
  }
}

export interface BenchView {
  /** The three parts: liquid with liquid, solid in liquid, the rule. */
  pairsDone: boolean
  solidsDone: boolean
  ruleDone: boolean
  /** Part 3 can be begun: the first two parts are done. */
  ruleOpen: boolean
  /** How many pairs count, how many part 1 needs, and how many the bench has; and the same for the solids in liquids. */
  pairsCounted: number
  pairsNeeded: number
  pairs: number
  solidsCounted: number
  solidsNeeded: number
  solidTubes: number
  /** The tubes that count, in the bench's order. */
  countedTubes: readonly TubeId[]
  status: MixingState['status']
}

/** How the whole lab stands. */
export function benchView(m: MixingModel, state: MixingState): BenchView {
  const pairs = countedPairs(m, state)
  const solids = countedSolids(m, state)
  const open = ruleOpen(m, state)
  return {
    pairsDone: pairsDone(m, state),
    solidsDone: solidsDone(m, state),
    ruleDone: open && ruleDone(m, state.rule),
    ruleOpen: open,
    pairsCounted: pairs.length,
    pairsNeeded: m.neededPairs,
    pairs: PAIR_IDS.length,
    solidsCounted: solids.length,
    solidsNeeded: m.neededSolids,
    solidTubes: SOLID_TUBE_IDS.length,
    countedTubes: [...pairs, ...solids],
    status: state.status,
  }
}
