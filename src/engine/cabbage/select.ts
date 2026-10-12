import { SCALE_QUESTION_IDS, THING_IDS, type ScaleQuestionId, type ThingId } from '@/chem-data/cabbage/data'
import type { TubeShows } from '../tubeShows'
import { bufferShows, CANNOT_SAY, scaleChoices, thingModel, thingShows, type CabbageModel, type Class, type Estimate, type ScaleQuestion } from './model'
import { classRight, estimateRight, POWERS, readingOf, sampleReasons, scaleDone, scaleMarks, setupOf, thingsDone, unitDone, unitQuestions, unitRight, type CabbageState, type Reason, type UnitAnswer, type UnitItem } from './state'

// Everything the app shows, worked out from the stored record. A tube is handed over as what is seen of it now, in
// the record's words for colours. A thing's pH is handed over only as a reading of the meter, once the meter has
// been read in it (spec 21.6). Whether an answer is right is handed over only once it has been judged: in Guided
// as it is recorded, and in Challenge once the part or the sample has been checked. The wording is the app's:
// these hand over identifiers, whole numbers and the record's words for colours.

export type { TubeShows }

/** How a part or a sample stands. */
export type Outcome =
  /** There is still something to do in it. */
  | { state: 'open' }
  /** Everything is recorded, and it waits to be checked. */
  | { state: 'to-check' }
  | { state: 'counts' }
  | { state: 'does-not-count' }

export interface RackTube {
  ph: number
  shows: TubeShows
}

export interface ScaleQuestionView {
  id: ScaleQuestionId
  kind: ScaleQuestion['kind']
  /** For a question on one tube, its pH. */
  ph: number | null
  choices: readonly (string | number)[]
  answer: string | number | null
  /** Null until judged. */
  right: boolean | null
}

export interface RackView {
  /** The indicator is in the buffers, and the rack has been looked along since. */
  indicator: boolean
  looked: boolean
  /** The thirteen tubes in order, each as it is seen now. */
  tubes: RackTube[]
  questions: ScaleQuestionView[]
  /** The questions can be answered now. */
  answersOpen: boolean
  outcome: Outcome
  tries: number
  /** The part is done, so its notes may be shown. */
  notesShown: boolean
}

/** The rack of the scale, which a page keeps in view through all three parts. */
export function rackView(m: CabbageModel, state: CabbageState): RackView {
  const { scale } = state
  const marks = scaleMarks(m, scale)
  // Guided records only what is right, so what it has recorded is judged as it stands; Challenge is judged when the rack is checked.
  const judged = scale.checked || state.mode === 'guided'
  const done = scaleDone(m, scale)
  const answered = SCALE_QUESTION_IDS.every((id) => scale.answers[id] !== null)
  return {
    indicator: scale.indicator,
    looked: scale.looked,
    tubes: m.phs.map((ph) => ({ ph, shows: bufferShows(m, ph, scale.indicator) })),
    questions: m.questions.map((question) => ({
      id: question.id,
      kind: question.kind,
      ph: question.kind === 'colour-of-tube' ? question.ph : null,
      choices: scaleChoices(m, question),
      answer: scale.answers[question.id],
      right: judged ? marks[question.id] : null,
    })),
    answersOpen: scale.looked && !scale.checked,
    outcome: scale.checked ? { state: done ? 'counts' : 'does-not-count' } : { state: answered ? 'to-check' : 'open' },
    tries: scale.tries,
    notesShown: done,
  }
}

export interface SampleView {
  id: ThingId
  /** How many times the thing has been set up again. */
  tries: number
  /** The tube as it is seen now: the thing's own look, and then with the indicator in. */
  shows: TubeShows
  indicator: boolean
  looked: boolean
  /** The estimate by eye can be recorded or changed now. */
  estimateOpen: boolean
  estimate: Estimate | null
  /** Acid, neutral or basic is asked: a tube has been named. */
  classAsked: boolean
  is: Class | null
  /** Null until judged. */
  estimateRight: boolean | null
  classRight: boolean | null
  /** The meter can be read in it now. */
  readOpen: boolean
  /** Guided's warning stands: the probe has not been rinsed since it was in another thing, and the next reading will be taken with it as it is. */
  warning: boolean
  /** What the meter showed, in tenths of a pH unit. `unrinsed` says that the probe had not been rinsed: null until that is judged. */
  reading: { tenths: number; unrinsed: boolean | null } | null
  outcome: Outcome
  /** Why it does not count; empty unless the outcome says so. */
  reasons: Reason[]
  /** The sample counts, so the thing's note may be shown. */
  notesShown: boolean
}

/** One household thing as its card shows it. */
export function sampleView(m: CabbageModel, state: CabbageState, thingId: ThingId): SampleView {
  const sample = state.samples[thingId]
  const setup = setupOf(m, state)
  const reasons = sampleReasons(m, setup, thingId, sample)
  const judged = sample.checked || state.mode === 'guided'
  const estimated = sample.estimate !== null && (sample.estimate === CANNOT_SAY || sample.is !== null)
  const tenths = readingOf(m, setup, thingId, sample)
  const counts = reasons?.length === 0
  return {
    id: thingId,
    tries: sample.tries,
    shows: thingShows(m, thingModel(m, thingId), setup[thingId], sample.indicator),
    indicator: sample.indicator,
    looked: sample.looked,
    estimateOpen: sample.looked && sample.reading === null,
    estimate: sample.estimate,
    classAsked: typeof sample.estimate === 'number',
    is: sample.is,
    estimateRight: judged && sample.estimate !== null ? estimateRight(m, setup, thingId, sample.estimate) : null,
    classRight: judged && sample.is !== null && typeof sample.estimate === 'number' && !thingModel(m, thingId).bleaches ? classRight(m, setup, thingId, sample.is) : null,
    readOpen: estimated && !sample.checked && state.probe !== thingId,
    warning: state.mode === 'guided' && sample.warned && !sample.checked && state.probe !== null && state.probe !== thingId,
    reading: tenths === null ? null : { tenths, unrinsed: judged ? sample.reading !== 'rinsed' : null },
    outcome: reasons === null ? { state: sample.reading === null ? 'open' : state.mode === 'guided' ? 'open' : 'to-check' } : { state: counts ? 'counts' : 'does-not-count' },
    reasons: reasons ?? [],
    notesShown: counts,
  }
}

export interface MeterView {
  /** The probe has been rinsed since it was last in a sample. */
  rinsed: boolean
  /** The thing it was last in, while it has not been rinsed since. */
  lastIn: ThingId | null
}

/** The meter's probe as it stands on the bench: rinsed, or still wet from the thing it was last in. */
export const meterView = (state: CabbageState): MeterView => ({ rinsed: state.probe === null, lastIn: state.probe })

export interface UnitQuestionView {
  /** The two things set side by side, each with the learner's own reading of it, or the pH on a buffer's label. */
  items: readonly [UnitItem, UnitItem]
  answer: UnitAnswer | null
  /** Null until judged. */
  right: boolean | null
}

export interface UnitView {
  /** The closing questions are open: the second part is done. */
  open: boolean
  questions: UnitQuestionView[]
  /** The powers of ten an answer is chosen from: 1 for ten times, 2 for a hundred times, and so on. */
  powers: readonly number[]
  answersOpen: boolean
  outcome: Outcome
  tries: number
  notesShown: boolean
}

/** The closing questions on what a unit means, drawn from the learner's own readings. */
export function unitView(m: CabbageModel, state: CabbageState): UnitView {
  const questions = unitQuestions(m, state)
  const { unit } = state
  const judged = unit.checked || state.mode === 'guided'
  const done = unitDone(m, state)
  const answered = unit.answers.every((answer) => answer !== null)
  return {
    open: questions !== null,
    questions: (questions ?? []).map((question, i) => {
      const answer = unit.answers[i] ?? null
      return { items: question.items, answer, right: judged && answer !== null ? unitRight(question, answer) : null }
    }),
    powers: POWERS,
    answersOpen: questions !== null && !unit.checked,
    outcome: unit.checked ? { state: done ? 'counts' : 'does-not-count' } : { state: answered ? 'to-check' : 'open' },
    tries: unit.tries,
    notesShown: done,
  }
}

export interface BenchView {
  /** The three parts: the scale, the household things, what a unit means. */
  scaleDone: boolean
  thingsDone: boolean
  unitDone: boolean
  /** How many things count, how many the second part needs, and how many the bench has. */
  counted: number
  needed: number
  things: number
  /** The things that count, in the order they came to. */
  countedThings: readonly ThingId[]
  /** The things can be begun: the rack is made. */
  thingsOpen: boolean
  status: CabbageState['status']
}

/** How the whole lab stands. */
export function benchView(m: CabbageModel, state: CabbageState): BenchView {
  return {
    scaleDone: scaleDone(m, state.scale),
    thingsDone: thingsDone(m, state),
    unitDone: unitDone(m, state),
    counted: state.counted.length,
    needed: m.neededToCount,
    things: THING_IDS.length,
    countedThings: state.counted,
    thingsOpen: state.scale.indicator,
    status: state.status,
  }
}
