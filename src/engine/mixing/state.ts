import { z } from 'zod'
import { FAMILIES, LIQUID_IDS, PAIR_IDS, QUESTION_IDS, SOLID_TUBE_IDS, type Family, type LiquidId, type PairId, type QuestionId, type SolidTubeId } from '@/chem-data/mixing/data'
import { liquidModel, pairModel, questionModel, solidTubeModel, topOf, type MixingModel, type Stage } from './model'

// The lab as plain data: the whole record saved for it. It holds what the learner has done at each tube and in
// part 3: which liquid there is more of, whether the tube has been shaken, has stood and has been looked at, what
// was recorded of it, and whether it has been checked. It holds nothing of what a tube shows, no family and no
// judgement but the status: whether an answer is right, whether a tube counts and why not are worked out on
// reading. So a stored record cannot disagree with the model, and a round trip through JSON gives back the same
// value. Nothing in the lab is drawn by chance, so there is no seed.
//
// The bounds are literals. A change to this shape, or to anything a stored lab is judged against (whether a pair
// mixes, a density, whether a solid dissolves, a family, a question's answer, the pairs and the solids in liquids
// on the bench, the counts that finish a part), needs the mixing entry's version raised
// (src/mixing-version.test.ts).

/** The most times a tube or part 3 is set up again before the count stops rising. Far more than a learner needs. */
export const MAX_TRIES = 99
/** What is recorded of a pair: one layer or two. */
export const LAYERS = ['one', 'two'] as const
export type Layers = (typeof LAYERS)[number]
/** What is recorded of a solid: that it is gone, or that it is still there. */
export const SOLID_SEEN = ['gone', 'left'] as const
export type SolidSeen = (typeof SOLID_SEEN)[number]

const tries = z.number().int().min(0).max(MAX_TRIES)
const liquid = z.enum(LIQUID_IDS)

const pairTubeSchema = z.strictObject({
  tries,
  /** The liquid there is more of. Null until the two are in the tube. */
  more: liquid.nullable(),
  shaken: z.boolean(),
  stood: z.boolean(),
  /** The tube has been looked at since it stood, which opens what is recorded of it. */
  looked: z.boolean(),
  layers: z.enum(LAYERS).nullable(),
  /** Which liquid is on top, asked where two layers are recorded. */
  top: liquid.nullable(),
  checked: z.boolean(),
})

const solidTubeSchema = z.strictObject({
  tries,
  /** The liquid and a little of the solid are in the tube. */
  added: z.boolean(),
  shaken: z.boolean(),
  stood: z.boolean(),
  looked: z.boolean(),
  solid: z.enum(SOLID_SEEN).nullable(),
  checked: z.boolean(),
})

const record = <Id extends string, T extends z.ZodType>(ids: readonly Id[], schema: T) => z.strictObject(Object.fromEntries(ids.map((id) => [id, schema])) as Record<Id, T>)

const stateSchema = z.strictObject({
  mode: z.enum(['guided', 'challenge']),
  status: z.enum(['in-progress', 'completed']),
  pairs: record(PAIR_IDS, pairTubeSchema),
  solids: record(SOLID_TUBE_IDS, solidTubeSchema),
  rule: z.strictObject({
    tries,
    /** The family each liquid is sorted into. */
    sorted: record(LIQUID_IDS, z.enum(FAMILIES).nullable()),
    answers: record(QUESTION_IDS, z.string().min(1).max(40).nullable()),
    checked: z.boolean(),
  }),
})

export type MixingState = z.infer<typeof stateSchema>
export type Mode = MixingState['mode']
export type PairTube = MixingState['pairs'][PairId]
export type SolidTube = MixingState['solids'][SolidTubeId]
export type RuleState = MixingState['rule']

export const newPairTube = (tried = 0): PairTube => ({ tries: tried, more: null, shaken: false, stood: false, looked: false, layers: null, top: null, checked: false })
export const newSolidTube = (tried = 0): SolidTube => ({ tries: tried, added: false, shaken: false, stood: false, looked: false, solid: null, checked: false })
export const newRule = (tried = 0): RuleState => ({
  tries: tried,
  sorted: Object.fromEntries(LIQUID_IDS.map((id) => [id, null])) as RuleState['sorted'],
  answers: Object.fromEntries(QUESTION_IDS.map((id) => [id, null])) as RuleState['answers'],
  checked: false,
})

/** A lab that has just been started. */
export function createLab(mode: Mode): MixingState {
  return {
    mode,
    status: 'in-progress',
    pairs: Object.fromEntries(PAIR_IDS.map((id) => [id, newPairTube()])) as MixingState['pairs'],
    solids: Object.fromEntries(SOLID_TUBE_IDS.map((id) => [id, newSolidTube()])) as MixingState['solids'],
    rule: newRule(),
  }
}

/** How far a tube has come. */
export const stageOf = (tube: { shaken: boolean; stood: boolean }, begun: boolean): Stage => (!begun ? 'empty' : tube.stood ? 'stood' : tube.shaken ? 'shaken' : 'in')

// ---------------------------------------------------------------------------------------------------------------
// Judging: worked out from the stored record and the model, and stored nowhere.
// ---------------------------------------------------------------------------------------------------------------

/** Whether one layer or two is what a pair shows. */
export const layersRight = (m: MixingModel, id: PairId, layers: Layers): boolean => (layers === 'one') === pairModel(m, id).mix
/** Whether a liquid is the one on top of a pair that makes two layers. Never right of a pair that mixes. */
export const topRight = (m: MixingModel, id: PairId, top: LiquidId): boolean => topOf(m, id) === top
/** Whether what is said of a solid is what its tube shows. */
export const solidRight = (m: MixingModel, id: SolidTubeId, seen: SolidSeen): boolean => (seen === 'gone') === solidTubeModel(m, id).dissolves

/** Everything a pair's tube asks is recorded: one layer; or two layers and which liquid is on top. */
export const pairRecorded = (tube: PairTube): boolean => tube.layers === 'one' || (tube.layers === 'two' && tube.top !== null)

/** Why a tube does not count. No slip of technique spoils a run (spec 25.2): a tube fails only by what was recorded of it. */
export type Reason = 'layers-wrong' | 'top-wrong' | 'solid-wrong'

/** Why a pair's tube does not count; empty when it counts; null while it has not been checked. */
export function pairReasons(m: MixingModel, id: PairId, tube: PairTube): Reason[] | null {
  if (!tube.checked || tube.layers === null || !pairRecorded(tube)) return null
  if (!layersRight(m, id, tube.layers)) return ['layers-wrong']
  return tube.layers === 'two' && !topRight(m, id, tube.top!) ? ['top-wrong'] : []
}

/** Why a solid's tube does not count; empty when it counts; null while it has not been checked. */
export function solidReasons(m: MixingModel, id: SolidTubeId, tube: SolidTube): Reason[] | null {
  if (!tube.checked || tube.solid === null) return null
  return solidRight(m, id, tube.solid) ? [] : ['solid-wrong']
}

export const pairCounts = (m: MixingModel, id: PairId, tube: PairTube): boolean => pairReasons(m, id, tube)?.length === 0
export const solidCounts = (m: MixingModel, id: SolidTubeId, tube: SolidTube): boolean => solidReasons(m, id, tube)?.length === 0

/** The pairs whose tubes count, and the solids in liquids whose tubes count, in the bench's order. */
export const countedPairs = (m: MixingModel, state: Pick<MixingState, 'pairs'>): PairId[] => PAIR_IDS.filter((id) => pairCounts(m, id, state.pairs[id]))
export const countedSolids = (m: MixingModel, state: Pick<MixingState, 'solids'>): SolidTubeId[] => SOLID_TUBE_IDS.filter((id) => solidCounts(m, id, state.solids[id]))

/** Parts 1 and 2 are done at their counts (spec 25.1); the rest of the tubes are there to try. */
export const pairsDone = (m: MixingModel, state: Pick<MixingState, 'pairs'>): boolean => countedPairs(m, state).length >= m.neededPairs
export const solidsDone = (m: MixingModel, state: Pick<MixingState, 'solids'>): boolean => countedSolids(m, state).length >= m.neededSolids
/** Part 3 opens once the first two parts are done: it is answered from what the tubes showed. */
export const ruleOpen = (m: MixingModel, state: Pick<MixingState, 'pairs' | 'solids'>): boolean => pairsDone(m, state) && solidsDone(m, state)

/** Whether a liquid is sorted into its stored family (spec 25.5). */
export const sortRight = (m: MixingModel, id: LiquidId, family: Family): boolean => liquidModel(m, id).family === family
export const answerRight = (m: MixingModel, id: QuestionId, answer: string): boolean => questionModel(m, id).answer === answer

/** Every liquid is sorted and both questions are answered. */
export const ruleRecorded = (rule: RuleState): boolean => LIQUID_IDS.every((id) => rule.sorted[id] !== null) && QUESTION_IDS.every((id) => rule.answers[id] !== null)

/** Every liquid is in its family and both answers are right. */
export const ruleRight = (m: MixingModel, rule: RuleState): boolean =>
  LIQUID_IDS.every((id) => rule.sorted[id] !== null && sortRight(m, id, rule.sorted[id])) && QUESTION_IDS.every((id) => rule.answers[id] !== null && answerRight(m, id, rule.answers[id]))

/** Part 3 is done: it is checked, and everything in it is right. */
export const ruleDone = (m: MixingModel, rule: RuleState): boolean => rule.checked && ruleRight(m, rule)

/** The status the record gives: completed when all three parts are done. */
export const statusOf = (m: MixingModel, state: Pick<MixingState, 'pairs' | 'solids' | 'rule'>): MixingState['status'] => (ruleOpen(m, state) && ruleDone(m, state.rule) ? 'completed' : 'in-progress')

/**
 * The stored shape, held to the model it is read with, so that a stored record is one the lab could have made:
 * nothing is done to a tube before what opens it, what is recorded is among the choices, part 3 holds nothing
 * before it is open, and the status is the one the record gives.
 */
export const mixingStateSchema = (m: MixingModel): z.ZodType<MixingState> =>
  stateSchema.superRefine((state, ctx) => {
    let sound = true
    const issue = (path: (string | number)[], message: string) => {
      sound = false
      ctx.addIssue({ code: 'custom', path, message })
    }
    const steps = (path: string[], tube: { shaken: boolean; stood: boolean; looked: boolean; checked: boolean }, begun: boolean, recorded: boolean, complete: boolean) => {
      if (tube.shaken && !begun) issue(path, 'a tube is shaken once something is in it')
      if (tube.stood && !tube.shaken) issue(path, 'a tube stands once it has been shaken')
      if (tube.looked && !tube.stood) issue(path, 'a tube is looked at once it has stood')
      if (recorded && !tube.looked) issue(path, 'what is seen is recorded once the tube has been looked at')
      if (tube.checked && !complete) issue(path, 'a tube is checked once everything it asks is recorded')
    }
    for (const id of PAIR_IDS) {
      const tube = state.pairs[id]
      const path = ['pairs', id]
      if (tube.more !== null && !pairModel(m, id).liquids.includes(tube.more)) issue(path, 'the liquid there is more of is one of the two')
      steps(path, tube, tube.more !== null, tube.layers !== null || tube.top !== null, pairRecorded(tube))
      if (tube.top !== null && tube.layers !== 'two') issue(path, 'which liquid is on top is said where two layers are recorded')
      if (tube.top !== null && !pairModel(m, id).liquids.includes(tube.top)) issue(path, 'the liquid on top is one of the two')
    }
    for (const id of SOLID_TUBE_IDS) {
      const tube = state.solids[id]
      steps(['solids', id], tube, tube.added, tube.solid !== null, tube.solid !== null)
    }
    const { rule } = state
    const given = LIQUID_IDS.some((id) => rule.sorted[id] !== null) || QUESTION_IDS.some((id) => rule.answers[id] !== null)
    if (!sound) return
    if ((given || rule.checked) && !ruleOpen(m, state)) issue(['rule'], 'part 3 opens once the first two parts are done')
    for (const id of QUESTION_IDS) if (rule.answers[id] !== null && !questionModel(m, id).choices.includes(rule.answers[id])) issue(['rule', 'answers', id], 'not a choice of the question')
    if (rule.checked && !ruleRecorded(rule)) issue(['rule', 'checked'], 'part 3 is checked once every liquid is sorted and both questions are answered')
    if (sound && state.status !== statusOf(m, state)) issue(['status'], 'the status is not the one the record gives')
  })
