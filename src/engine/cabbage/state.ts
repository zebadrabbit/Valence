import { z } from 'zod'
import { SCALE_QUESTION_IDS, THING_IDS, type ScaleQuestionId, type ThingId } from '@/chem-data/cabbage/data'
import { CANNOT_SAY, CLASSES, classAt, scaleAnswer, thingModel, type CabbageModel, type Class, type Estimate } from './model'
import { labSetup, readingTenths, type LabSetup } from './setup'

// The lab as plain data: the whole record saved for it. It holds the seed, what the learner has done at the rack,
// at each household thing and at the two closing questions, and where the probe was last. It holds no pH, no colour
// and no judgement but the status: a reading is stored as the state of the probe that took it, and what the meter
// showed, whether an estimate was near enough, whether a sample counts and why not are worked out on reading. So a
// stored record cannot disagree with the model, and a round trip through JSON gives back the same value.
//
// The bounds are literals. A change to this shape, or to anything a stored lab is worked out from or judged against
// (the table of colours, a thing's range, the order of the things, the share an unrinsed probe is pulled, what makes
// a sample count, how the closing questions are drawn), needs the red cabbage entry's version raised
// (src/cabbage-version.test.ts).

/** The most times a sample, the scale's questions or the closing questions are tried again before the count stops rising. Far more than a learner needs. */
export const MAX_TRIES = 99
/** The powers of ten a closing question is answered from: ten times to a million million times. */
export const POWERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const

const tries = z.number().int().min(0).max(MAX_TRIES)
const thing = z.enum(THING_IDS)

const sampleSchema = z.strictObject({
  tries,
  /** The indicator is in the tube, and the liquid has been looked at since. */
  indicator: z.boolean(),
  looked: z.boolean(),
  /** By eye: the tube of the scale it is nearest, or that the indicator cannot say; and acid, neutral or basic, where a tube is named. */
  estimate: z.union([z.number().int().min(1).max(13), z.literal(CANNOT_SAY)]).nullable(),
  is: z.enum(CLASSES).nullable(),
  /** Guided has warned that the probe is not rinsed. */
  warned: z.boolean(),
  /** How the meter was last read in it: with a rinsed probe, or with one last in another thing and not rinsed since. Null until it is read. */
  reading: z.union([z.literal('rinsed'), thing]).nullable(),
  checked: z.boolean(),
})

const samplesSchema = z.strictObject(Object.fromEntries(THING_IDS.map((id) => [id, sampleSchema])) as Record<ThingId, typeof sampleSchema>)

const unitAnswer = z.strictObject({ more: z.union([z.literal(0), z.literal(1)]), power: z.number().int().min(1).max(12) }).nullable()

const stateSchema = z.strictObject({
  mode: z.enum(['guided', 'challenge']),
  seed: z.number().int().min(0).max(0xffffffff),
  status: z.enum(['in-progress', 'completed']),
  scale: z.strictObject({
    tries,
    indicator: z.boolean(),
    looked: z.boolean(),
    /** The colour of the most acidic buffer, the colour of the neutral one, and the lower pH of the two neighbours that share a colour. */
    answers: z.strictObject({ 'acid-end': z.string().min(1).max(40).nullable(), neutral: z.string().min(1).max(40).nullable(), 'same-pair': z.number().int().min(1).max(13).nullable() }),
    checked: z.boolean(),
  }),
  samples: samplesSchema,
  /** The thing the probe was last in, while it has not been rinsed since; null for a rinsed probe. */
  probe: thing.nullable(),
  /** The things whose samples count, in the order they came to count. */
  counted: z.array(thing).max(THING_IDS.length),
  unit: z.strictObject({ tries, answers: z.tuple([unitAnswer, unitAnswer]), checked: z.boolean() }),
})

export type CabbageState = z.infer<typeof stateSchema>
export type Mode = CabbageState['mode']
export type Sample = CabbageState['samples'][ThingId]
export type ScaleState = CabbageState['scale']
export type UnitAnswer = NonNullable<CabbageState['unit']['answers'][number]>

export const newSample = (tried = 0): Sample => ({ tries: tried, indicator: false, looked: false, estimate: null, is: null, warned: false, reading: null, checked: false })
const noAnswers = (): ScaleState['answers'] => ({ 'acid-end': null, neutral: null, 'same-pair': null })
export const newScaleAnswers = noAnswers

/** A lab that has just been started. */
export function createLab(mode: Mode, seed: number): CabbageState {
  return {
    mode,
    seed: seed >>> 0,
    status: 'in-progress',
    scale: { tries: 0, indicator: false, looked: false, answers: noAnswers(), checked: false },
    samples: Object.fromEntries(THING_IDS.map((id) => [id, newSample()])) as CabbageState['samples'],
    probe: null,
    counted: [],
    unit: { tries: 0, answers: [null, null], checked: false },
  }
}

export const setupOf = (m: CabbageModel, state: Pick<CabbageState, 'seed'>): LabSetup => labSetup(m, state.seed)

// ---------------------------------------------------------------------------------------------------------------
// Judging: worked out from the stored record and the model, and stored nowhere.
// ---------------------------------------------------------------------------------------------------------------

/** Whether an estimate by eye is right: within the margin of what a rinsed probe reads, or, for the thing that destroys the dye, that the indicator cannot say (spec 21.2). */
export function estimateRight(m: CabbageModel, setup: LabSetup, thingId: ThingId, estimate: Estimate): boolean {
  if (thingModel(m, thingId).bleaches) return estimate === CANNOT_SAY
  return estimate !== CANNOT_SAY && Math.abs(estimate * 10 - setup[thingId]) <= m.estimateWithinTenths
}

/** Whether acid, neutral or basic is right for a thing: judged against what a rinsed probe reads. */
export const classRight = (m: CabbageModel, setup: LabSetup, thingId: ThingId, is: Class): boolean => is === classAt(m, setup[thingId])

/** What the meter showed in a sample, in tenths; null while it has not been read. */
export function readingOf(m: CabbageModel, setup: LabSetup, thingId: ThingId, sample: Sample): number | null {
  return sample.reading === null ? null : readingTenths(m, setup, thingId, sample.reading === 'rinsed' ? null : sample.reading)
}

/** Why a sample does not count. `probe-unrinsed` names the one error of technique (spec 21.2). */
export type Reason = 'estimate-off' | 'class-wrong' | 'probe-unrinsed'

/** Why a sample does not count; empty when it counts; null while it has not been checked. */
export function sampleReasons(m: CabbageModel, setup: LabSetup, thingId: ThingId, sample: Sample): Reason[] | null {
  if (!sample.checked || sample.estimate === null || sample.reading === null) return null
  const reasons: Reason[] = []
  const right = estimateRight(m, setup, thingId, sample.estimate)
  if (!right) reasons.push('estimate-off')
  // Acid, neutral or basic is asked only where a tube is named, and is not held against a thing that has no colour to judge by.
  if (sample.estimate !== CANNOT_SAY && sample.is !== null && !thingModel(m, thingId).bleaches && !classRight(m, setup, thingId, sample.is)) reasons.push('class-wrong')
  if (sample.reading !== 'rinsed') reasons.push('probe-unrinsed')
  return reasons
}

export const sampleCounts = (m: CabbageModel, setup: LabSetup, thingId: ThingId, sample: Sample): boolean => sampleReasons(m, setup, thingId, sample)?.length === 0

/** Whether each answer at the rack is right, by question; null for one not answered. */
export function scaleMarks(m: CabbageModel, scale: ScaleState): Record<ScaleQuestionId, boolean | null> {
  const mark = (id: ScaleQuestionId) => {
    const answer = scale.answers[id]
    return answer === null ? null : answer === scaleAnswer(m, m.questions.find((q) => q.id === id)!)
  }
  return { 'acid-end': mark('acid-end'), neutral: mark('neutral'), 'same-pair': mark('same-pair') }
}

/** The first part is done: its three answers are checked and right. */
export const scaleDone = (m: CabbageModel, scale: ScaleState): boolean => scale.checked && SCALE_QUESTION_IDS.every((id) => scaleMarks(m, scale)[id] === true)

/** The second part is done: enough of the household things count (spec 21.1). */
export const thingsDone = (m: CabbageModel, state: Pick<CabbageState, 'counted'>): boolean => state.counted.length >= m.neededToCount

/** One of the two things a closing question sets side by side: a household thing with the learner's own reading of it, or a buffer of the scale at its label. */
export type UnitItem = { kind: 'thing'; id: ThingId; tenths: number } | { kind: 'buffer'; ph: number; tenths: number }
export interface UnitQuestion {
  items: readonly [UnitItem, UnitItem]
  /** How many whole units of pH apart the two are. */
  units: number
}

/** The pairs of buffers a closing question falls back on where the learner's readings hold too few pairs a whole number of units apart. */
const BUFFER_PAIRS: readonly (readonly [number, number])[] = [[4, 7], [9, 11]]

/**
 * The two closing questions (spec 21.1), drawn from the learner's own readings: of the first things to count, as
 * many as the part needs, every pair whose readings are a whole number of units apart, one or more. The first
 * question is the pair the fewest units apart and the second, of the pairs left, the one the most units apart, each the
 * earliest such pair. Where the readings hold only one such pair, or none, a pair of buffers of the scale stands in. Null until the second
 * part is done. A sample that counts is never set up again, so the questions do not change once they are there.
 */
export function unitQuestions(m: CabbageModel, state: Pick<CabbageState, 'seed' | 'counted'>): readonly [UnitQuestion, UnitQuestion] | null {
  if (!thingsDone(m, state)) return null
  const setup = setupOf(m, state)
  const things = state.counted.slice(0, m.neededToCount).map((id): UnitItem => ({ kind: 'thing', id, tenths: setup[id] }))
  const pairs: UnitQuestion[] = []
  things.forEach((a, i) =>
    things.slice(i + 1).forEach((b) => {
      const gap = Math.abs(a.tenths - b.tenths)
      if (gap > 0 && gap % 10 === 0) pairs.push({ items: [a, b], units: gap / 10 })
    }),
  )
  const buffers = BUFFER_PAIRS.map(([a, b]): UnitQuestion => ({ items: [{ kind: 'buffer', ph: a, tenths: a * 10 }, { kind: 'buffer', ph: b, tenths: b * 10 }], units: b - a }))
  if (pairs.length === 0) return [buffers[0]!, buffers[1]!]
  const fewest = pairs.reduce((best, pair) => (pair.units < best.units ? pair : best))
  const others = pairs.filter((pair) => pair !== fewest)
  return [fewest, others.length === 0 ? buffers[0]! : others.reduce((best, pair) => (pair.units > best.units ? pair : best))]
}

/** Whether an answer to a closing question is right: the one with the lower pH holds more hydrogen ion, ten times for each unit. */
export const unitRight = (question: UnitQuestion, answer: UnitAnswer): boolean => answer.more === (question.items[0].tenths < question.items[1].tenths ? 0 : 1) && answer.power === question.units

/** The last part is done: its two answers are checked and right. */
export function unitDone(m: CabbageModel, state: Pick<CabbageState, 'seed' | 'counted' | 'unit'>): boolean {
  const questions = unitQuestions(m, state)
  return questions !== null && state.unit.checked && state.unit.answers.every((answer, i) => answer !== null && unitRight(questions[i]!, answer))
}

/** The status the record gives: completed when all three parts are done. */
export const statusOf = (m: CabbageModel, state: Pick<CabbageState, 'seed' | 'scale' | 'counted' | 'unit'>): CabbageState['status'] => (scaleDone(m, state.scale) && thingsDone(m, state) && unitDone(m, state) ? 'completed' : 'in-progress')

/**
 * The stored shape, held to the model it is read with, so that a stored record is one the lab could have made:
 * nothing is recorded before what opens it, the answers are among the choices, the things listed as counting are
 * exactly those whose samples count, and the status is the one the record gives.
 */
export const cabbageStateSchema = (m: CabbageModel): z.ZodType<CabbageState> =>
  stateSchema.superRefine((state, ctx) => {
    let sound = true
    const issue = (path: (string | number)[], message: string) => {
      sound = false
      ctx.addIssue({ code: 'custom', path, message })
    }
    const { scale } = state
    if (scale.looked && !scale.indicator) issue(['scale', 'looked'], 'the rack is looked along once the indicator is in')
    const answered = SCALE_QUESTION_IDS.filter((id) => scale.answers[id] !== null)
    if (answered.length > 0 && !scale.looked) issue(['scale', 'answers'], 'the questions open once the rack has been looked along')
    for (const id of ['acid-end', 'neutral'] as const) if (scale.answers[id] !== null && !m.colours.includes(scale.answers[id])) issue(['scale', 'answers', id], 'not a colour of the indicator')
    if (scale.answers['same-pair'] !== null && !m.phs.slice(0, -1).includes(scale.answers['same-pair'])) issue(['scale', 'answers', 'same-pair'], 'not a buffer with a neighbour above it')
    if (scale.checked && answered.length < SCALE_QUESTION_IDS.length) issue(['scale', 'checked'], 'the questions are checked once all three are answered')

    const setup = setupOf(m, state)
    const counting: ThingId[] = []
    for (const id of THING_IDS) {
      const sample = state.samples[id]
      const bad = (message: string) => issue(['samples', id], message)
      if (sample.indicator && !scale.indicator) bad('a sample is begun once the rack is made')
      if (sample.looked && !sample.indicator) bad('a sample is looked at once the indicator is in')
      if (sample.estimate !== null && !sample.looked) bad('an estimate is made once the sample has been looked at')
      if (sample.is !== null && typeof sample.estimate !== 'number') bad('acid, neutral or basic is said where a tube is named')
      if (sample.warned && sample.estimate === null) bad('the warning comes when the meter is about to be read')
      if (sample.reading !== null && (sample.estimate === null || (sample.estimate !== CANNOT_SAY && sample.is === null))) bad('the meter is read once the estimate by eye is recorded')
      if (sample.reading === id) bad('a probe cannot carry a sample into itself')
      if (sample.checked && sample.reading === null) bad('a sample is checked once the meter has been read')
      if (sampleCounts(m, setup, id, sample)) counting.push(id)
    }
    if (new Set(state.counted).size !== state.counted.length || state.counted.length !== counting.length || state.counted.some((id) => !counting.includes(id))) issue(['counted'], 'the things listed as counting are those whose samples count, each once')
    const questions = unitQuestions(m, state)
    if (questions === null && (state.unit.checked || state.unit.answers.some((answer) => answer !== null))) issue(['unit'], 'the closing questions open once the second part is done')
    if (state.unit.checked && state.unit.answers.some((answer) => answer === null)) issue(['unit', 'checked'], 'the closing questions are checked once both are answered')
    if (sound && state.status !== statusOf(m, state)) issue(['status'], 'the status is not the one the record gives')
  })
