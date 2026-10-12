import { FAMILIES, isPairId, isSolidTubeId, LIQUID_IDS, QUESTION_IDS, type Family, type LiquidId, type PairId, type QuestionId, type SolidTubeId, type TubeId } from '@/chem-data/mixing/data'
import { pairModel, questionModel, type MixingModel } from './model'
import {
  answerRight,
  LAYERS,
  layersRight,
  MAX_TRIES,
  newPairTube,
  newRule,
  newSolidTube,
  pairCounts,
  pairRecorded,
  ruleDone,
  ruleOpen,
  ruleRecorded,
  ruleRight,
  SOLID_SEEN,
  solidCounts,
  solidRight,
  sortRight,
  statusOf,
  topRight,
  type Layers,
  type MixingState,
  type Mode,
  type PairTube,
  type SolidSeen,
  type SolidTube,
} from './state'

// Every learner action: when it can be done, and what it does. The tubes can be tried in any order, and one that
// does not count can be set up again in a fresh tube. Part 3 opens when the first two parts are done. A completed
// lab still takes actions, so that the tubes left over can be tried; its status stays completed.
//
// A tube goes one way: its liquids, or its liquid and its solid, go in; it is shaken; it stands; it is looked at;
// what is seen is recorded. No step can be done out of turn, and none spoils a run (spec 25.2).
//
// The two modes differ here and in what a view shows. Guided checks each answer as it is given: it refuses one
// that is not right, so what it records is right, and it checks a tube or part 3 by itself once everything is
// recorded. Challenge records whatever it is given, and checks a tube or part 3 when asked. Where a tube or part 3
// holds an answer that Challenge took and that is not right, and the mode is then changed, Guided checks nothing by
// itself until that answer has been changed: its view marks it, and the learner puts it right or asks for the check.

export type Action =
  | { type: 'setMode'; mode: Mode }
  /** The two liquids of a pair go into a tube, more of `more` than of the other. */
  | { type: 'pour'; tube: PairId; more: LiquidId }
  /** The liquid goes into a tube, and then a little of the solid. */
  | { type: 'add'; tube: SolidTubeId }
  | { type: 'shake'; tube: TubeId }
  /** Leave the tube to stand. */
  | { type: 'stand'; tube: TubeId }
  /** Look at a tube that has stood. Stored, since it opens what is recorded of it. */
  | { type: 'look'; tube: TubeId }
  /** One layer or two. It can be changed until the tube is checked. */
  | { type: 'sayLayers'; tube: PairId; is: Layers }
  /** Which liquid is on top, where two layers are recorded. */
  | { type: 'sayTop'; tube: PairId; is: LiquidId }
  /** Whether the solid is gone. */
  | { type: 'saySolid'; tube: SolidTubeId; is: SolidSeen }
  /** Check a tube. Guided does it by itself. */
  | { type: 'check'; tube: TubeId }
  /** Set a tube up again, fresh, after one that did not count or one left part done. */
  | { type: 'again'; tube: TubeId }
  /** Sort a liquid into a family. It can be changed until part 3 is checked. */
  | { type: 'sort'; liquid: LiquidId; family: Family }
  | { type: 'answer'; question: QuestionId; is: string }
  /** Check part 3. Guided does it by itself. */
  | { type: 'checkRule' }
  | { type: 'againRule' }

/** Why an action cannot be done now. A reason names what is missing and never what an answer should be. */
export type Blocked =
  | 'unknown-tube'
  | 'not-a-choice'
  | 'already-in'
  | 'nothing-in'
  | 'already-shaken'
  | 'not-shaken'
  | 'already-stood'
  | 'not-stood'
  | 'already-looked'
  | 'not-looked'
  | 'top-not-asked'
  | 'not-all-recorded'
  | 'checked'
  | 'counts-already'
  | 'nothing-to-repeat'
  | 'parts-not-done'
  /** Guided only: an answer that is not right; or, of which liquid is on top, that what is recorded of the layers is to be put right first. */
  | 'not-right'
  | 'layers-first'

type AnyTube = PairTube | SolidTube
const begun = (tube: AnyTube) => ('more' in tube ? tube.more !== null : tube.added)

/** null when the action can be done now; otherwise the first reason that applies. */
export function can(m: MixingModel, state: MixingState, action: Action): Blocked | null {
  const guided = state.mode === 'guided'
  switch (action.type) {
    case 'setMode':
      return null
    case 'sort':
      if (!LIQUID_IDS.includes(action.liquid) || !FAMILIES.includes(action.family)) return 'not-a-choice'
      if (!ruleOpen(m, state)) return 'parts-not-done'
      if (state.rule.checked) return 'checked'
      return guided && !sortRight(m, action.liquid, action.family) ? 'not-right' : null
    case 'answer':
      if (!QUESTION_IDS.includes(action.question) || !questionModel(m, action.question).choices.includes(action.is)) return 'not-a-choice'
      if (!ruleOpen(m, state)) return 'parts-not-done'
      if (state.rule.checked) return 'checked'
      return guided && !answerRight(m, action.question, action.is) ? 'not-right' : null
    case 'checkRule':
      if (!ruleOpen(m, state)) return 'parts-not-done'
      if (state.rule.checked) return 'checked'
      return ruleRecorded(state.rule) ? null : 'not-all-recorded'
    case 'againRule':
      return !state.rule.checked ? 'nothing-to-repeat' : ruleDone(m, state.rule) ? 'counts-already' : null
    default:
      break
  }
  const pair = isPairId(action.tube) ? state.pairs[action.tube] : undefined
  const solid = isSolidTubeId(action.tube) ? state.solids[action.tube] : undefined
  const tube: AnyTube | undefined = pair ?? solid
  if (!tube) return 'unknown-tube'
  switch (action.type) {
    case 'pour':
      if (!pair) return 'unknown-tube'
      if (!pairModel(m, action.tube).liquids.includes(action.more)) return 'not-a-choice'
      return pair.more !== null ? 'already-in' : null
    case 'add':
      return !solid ? 'unknown-tube' : solid.added ? 'already-in' : null
    case 'shake':
      return !begun(tube) ? 'nothing-in' : tube.shaken ? 'already-shaken' : null
    case 'stand':
      return !begun(tube) ? 'nothing-in' : !tube.shaken ? 'not-shaken' : tube.stood ? 'already-stood' : null
    case 'look':
      return !begun(tube) ? 'nothing-in' : !tube.stood ? 'not-stood' : tube.looked ? 'already-looked' : null
    case 'sayLayers':
      if (!pair) return 'unknown-tube'
      if (!LAYERS.includes(action.is)) return 'not-a-choice'
      if (!pair.looked) return 'not-looked'
      if (pair.checked) return 'checked'
      return guided && !layersRight(m, action.tube, action.is) ? 'not-right' : null
    case 'sayTop':
      if (!pair) return 'unknown-tube'
      if (!pairModel(m, action.tube).liquids.includes(action.is)) return 'not-a-choice'
      if (!pair.looked) return 'not-looked'
      if (pair.checked) return 'checked'
      if (pair.layers !== 'two') return 'top-not-asked'
      // Two layers that Challenge took, before the mode was changed, of a pair that makes one are put right first.
      if (guided && !layersRight(m, action.tube, 'two')) return 'layers-first'
      return guided && !topRight(m, action.tube, action.is) ? 'not-right' : null
    case 'saySolid':
      if (!solid) return 'unknown-tube'
      if (!SOLID_SEEN.includes(action.is)) return 'not-a-choice'
      if (!solid.looked) return 'not-looked'
      if (solid.checked) return 'checked'
      return guided && !solidRight(m, action.tube, action.is) ? 'not-right' : null
    case 'check':
      if (tube.checked) return 'checked'
      if (!tube.looked) return 'not-looked'
      return (pair ? pairRecorded(pair) : solid!.solid !== null) ? null : 'not-all-recorded'
    case 'again':
      if (!begun(tube)) return 'nothing-to-repeat'
      return (pair ? pairCounts(m, action.tube as PairId, pair) : solidCounts(m, action.tube as SolidTubeId, solid!)) ? 'counts-already' : null
  }
}

/** The state after an action. An action that cannot be done now returns the very same object. */
export function reduce(m: MixingModel, state: MixingState, action: Action): MixingState {
  if (can(m, state, action) !== null) return state
  const guided = state.mode === 'guided'
  const settled = (next: MixingState): MixingState => ({ ...next, status: statusOf(m, next) })
  const withRule = (rule: MixingState['rule']): MixingState => settled({ ...state, rule: { ...rule, checked: guided && ruleRight(m, rule) } })
  switch (action.type) {
    case 'setMode':
      return action.mode === state.mode ? state : { ...state, mode: action.mode }
    case 'sort':
      return withRule({ ...state.rule, sorted: { ...state.rule.sorted, [action.liquid]: action.family } })
    case 'answer':
      return withRule({ ...state.rule, answers: { ...state.rule.answers, [action.question]: action.is } })
    case 'checkRule':
      return settled({ ...state, rule: { ...state.rule, checked: true } })
    case 'againRule':
      return { ...state, rule: newRule(Math.min(MAX_TRIES, state.rule.tries + 1)) }
    default:
      break
  }
  const again = (tried: number) => Math.min(MAX_TRIES, tried + 1)
  if (isPairId(action.tube)) {
    const id = action.tube
    const tube = state.pairs[id]
    // In Guided a tube is checked as soon as everything it asks is recorded and right.
    const withTube = (next: PairTube): MixingState => settled({ ...state, pairs: { ...state.pairs, [id]: guided && !next.checked && pairCounts(m, id, { ...next, checked: true }) ? { ...next, checked: true } : next } })
    switch (action.type) {
      case 'pour':
        return withTube({ ...tube, more: action.more })
      case 'shake':
        return withTube({ ...tube, shaken: true })
      case 'stand':
        return withTube({ ...tube, stood: true })
      case 'look':
        return withTube({ ...tube, looked: true })
      case 'sayLayers':
        // Which liquid is on top goes with two layers: it is dropped where one layer is recorded.
        return withTube({ ...tube, layers: action.is, top: action.is === 'two' ? tube.top : null })
      case 'sayTop':
        return withTube({ ...tube, top: action.is })
      case 'check':
        return withTube({ ...tube, checked: true })
      case 'again':
        return withTube(newPairTube(again(tube.tries)))
      default:
        return state
    }
  }
  const id = action.tube as SolidTubeId
  const tube = state.solids[id]
  const withTube = (next: SolidTube): MixingState => settled({ ...state, solids: { ...state.solids, [id]: guided && !next.checked && solidCounts(m, id, { ...next, checked: true }) ? { ...next, checked: true } : next } })
  switch (action.type) {
    case 'add':
      return withTube({ ...tube, added: true })
    case 'shake':
      return withTube({ ...tube, shaken: true })
    case 'stand':
      return withTube({ ...tube, stood: true })
    case 'look':
      return withTube({ ...tube, looked: true })
    case 'saySolid':
      return withTube({ ...tube, solid: action.is })
    case 'check':
      return withTube({ ...tube, checked: true })
    case 'again':
      return withTube(newSolidTube(again(tube.tries)))
    default:
      return state
  }
}
