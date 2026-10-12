import { SCALE_QUESTION_IDS, THING_IDS, type ScaleQuestionId, type ThingId } from '@/chem-data/cabbage/data'
import { CANNOT_SAY, CLASSES, scaleAnswer, scaleChoices, type CabbageModel, type Class, type Estimate } from './model'
import { classRight, estimateRight, MAX_TRIES, newSample, newScaleAnswers, POWERS, sampleCounts, scaleDone, setupOf, statusOf, thingsDone, unitDone, unitQuestions, unitRight, type CabbageState, type Mode, type Sample, type UnitAnswer } from './state'

// Every learner action: when it can be done, and what it does. The rack is made first; after that the household
// things can be tried in any order, and one that does not count can be set up again. The closing questions open
// when enough things count. A completed lab still takes actions, so that the things left over can be tried; its
// status stays completed.
//
// The two modes differ here and in what a view shows (spec 21.2). Guided checks each answer as it is given: it
// refuses an answer at the rack or to a closing question that is not right, an estimate that is not near enough
// and a wrong acid, neutral or basic, so what it records is right, and it checks a sample by itself once a rinsed
// probe has read it. Before it lets an unrinsed probe read, it warns once; the reading is then the learner's to
// take. Challenge records whatever it is given, and checks a part or a sample when asked.

export type Action =
  | { type: 'setMode'; mode: Mode }
  /** The indicator goes into the thirteen buffers. */
  | { type: 'fillRack' }
  /** Look along the rack. Stored, since it opens the rack's questions. */
  | { type: 'lookRack' }
  | { type: 'answerScale'; question: ScaleQuestionId; is: string | number }
  /** Check the rack's three answers together. Guided does it by itself. */
  | { type: 'checkScale' }
  /** Set the rack's questions up again after a check that did not count. The rack stays as it is. */
  | { type: 'againScale' }
  /** The indicator goes into a thing's tube. */
  | { type: 'addIndicator'; thing: ThingId }
  /** Look at the liquid of a thing's tube. Stored, since it opens the estimate. */
  | { type: 'look'; thing: ThingId }
  /** By eye: the tube of the scale it is nearest, or that the indicator cannot say. It can be changed until the meter is read. */
  | { type: 'estimate'; thing: ThingId; is: Estimate }
  /** Acid, neutral or basic, where a tube is named. It can be changed until the meter is read. */
  | { type: 'classify'; thing: ThingId; is: Class }
  /** Rinse the probe with distilled water. */
  | { type: 'rinse' }
  /** Put the probe into a thing's tube and read the meter. */
  | { type: 'read'; thing: ThingId }
  /** Check a sample. Guided does it by itself. */
  | { type: 'checkSample'; thing: ThingId }
  /** Set a thing up again in a fresh tube, after a sample that did not count or one left part done. */
  | { type: 'again'; thing: ThingId }
  | { type: 'answerUnit'; question: 0 | 1; answer: UnitAnswer }
  /** Check the two closing answers together. Guided does it by itself. */
  | { type: 'checkUnit' }
  | { type: 'againUnit' }

/** Why an action cannot be done now. A reason names what is missing and never what an answer should be. */
export type Blocked =
  | 'unknown-thing'
  | 'not-a-choice'
  | 'rack-not-made'
  | 'rack-made'
  | 'not-looked'
  | 'already-looked'
  | 'indicator-in'
  | 'no-indicator'
  | 'no-estimate'
  | 'no-class'
  | 'class-not-asked'
  | 'answers-fixed'
  | 'already-rinsed'
  | 'probe-still-in'
  | 'not-read'
  | 'checked'
  | 'counts-already'
  | 'nothing-to-repeat'
  | 'not-all-answered'
  | 'not-enough-count'
  /** Guided only: an answer that is not right, an estimate that is not near enough, a wrong acid, neutral or basic. */
  | 'not-right'
  | 'estimate-off'
  | 'class-wrong'

const isThing = (thing: unknown): thing is ThingId => THING_IDS.includes(thing as ThingId)
/** The estimate by eye is complete: a tube with its acid, neutral or basic, or that the indicator cannot say. */
const estimated = (sample: Sample) => sample.estimate !== null && (sample.estimate === CANNOT_SAY || sample.is !== null)

/** null when the action can be done now; otherwise the first reason that applies. */
export function can(m: CabbageModel, state: CabbageState, action: Action): Blocked | null {
  const guided = state.mode === 'guided'
  switch (action.type) {
    case 'setMode':
      return null
    case 'fillRack':
      return state.scale.indicator ? 'rack-made' : null
    case 'lookRack':
      return !state.scale.indicator ? 'rack-not-made' : state.scale.looked ? 'already-looked' : null
    case 'answerScale': {
      const question = m.questions.find((q) => q.id === action.question)
      if (!question || !scaleChoices(m, question).includes(action.is)) return 'not-a-choice'
      if (!state.scale.looked) return 'not-looked'
      if (state.scale.checked) return 'checked'
      return guided && action.is !== scaleAnswer(m, question) ? 'not-right' : null
    }
    case 'checkScale':
      if (state.scale.checked) return 'checked'
      return SCALE_QUESTION_IDS.every((id) => state.scale.answers[id] !== null) ? null : 'not-all-answered'
    case 'againScale':
      return !state.scale.checked ? 'nothing-to-repeat' : scaleDone(m, state.scale) ? 'counts-already' : null
    case 'rinse':
      return state.probe === null ? 'already-rinsed' : null
    case 'answerUnit': {
      const questions = unitQuestions(m, state)
      if (questions === null) return 'not-enough-count'
      const question = questions[action.question]
      if (!question || !action.answer || ![0, 1].includes(action.answer.more) || !POWERS.includes(action.answer.power as (typeof POWERS)[number])) return 'not-a-choice'
      if (state.unit.checked) return 'checked'
      return guided && !unitRight(question, action.answer) ? 'not-right' : null
    }
    case 'checkUnit':
      if (!thingsDone(m, state)) return 'not-enough-count'
      if (state.unit.checked) return 'checked'
      return state.unit.answers.every((answer) => answer !== null) ? null : 'not-all-answered'
    case 'againUnit':
      return !state.unit.checked ? 'nothing-to-repeat' : unitDone(m, state) ? 'counts-already' : null
    default:
      break
  }
  if (!isThing(action.thing)) return 'unknown-thing'
  const sample = state.samples[action.thing]
  const setup = setupOf(m, state)
  switch (action.type) {
    case 'addIndicator':
      return !state.scale.indicator ? 'rack-not-made' : sample.indicator ? 'indicator-in' : null
    case 'look':
      return !sample.indicator ? 'no-indicator' : sample.looked ? 'already-looked' : null
    case 'estimate':
      if (action.is !== CANNOT_SAY && !m.phs.includes(action.is)) return 'not-a-choice'
      if (!sample.looked) return 'not-looked'
      if (sample.reading !== null) return 'answers-fixed'
      return guided && !estimateRight(m, setup, action.thing, action.is) ? 'estimate-off' : null
    case 'classify':
      if (!CLASSES.includes(action.is)) return 'not-a-choice'
      if (sample.estimate === null) return 'no-estimate'
      if (sample.estimate === CANNOT_SAY) return 'class-not-asked'
      if (sample.reading !== null) return 'answers-fixed'
      // An estimate that Challenge took, before the mode was changed, and that is not near enough is put right first.
      if (guided && !estimateRight(m, setup, action.thing, sample.estimate)) return 'estimate-off'
      return guided && !classRight(m, setup, action.thing, action.is) ? 'class-wrong' : null
    case 'read':
      if (sample.estimate === null) return 'no-estimate'
      if (!estimated(sample)) return 'no-class'
      if (sample.checked) return 'checked'
      // The probe is still in this tube: there is nothing new to read until it has been rinsed or used elsewhere.
      return state.probe === action.thing ? 'probe-still-in' : null
    case 'checkSample':
      return sample.checked ? 'checked' : sample.reading === null ? 'not-read' : null
    case 'again':
      if (!sample.indicator) return 'nothing-to-repeat'
      return sampleCounts(m, setup, action.thing, sample) ? 'counts-already' : null
  }
}

/** The state after an action. An action that cannot be done now returns the very same object. */
export function reduce(m: CabbageModel, state: CabbageState, action: Action): CabbageState {
  if (can(m, state, action) !== null) return state
  const guided = state.mode === 'guided'
  const settled = (next: CabbageState): CabbageState => ({ ...next, status: statusOf(m, next) })
  switch (action.type) {
    case 'setMode':
      return action.mode === state.mode ? state : { ...state, mode: action.mode }
    case 'fillRack':
      return { ...state, scale: { ...state.scale, indicator: true } }
    case 'lookRack':
      return { ...state, scale: { ...state.scale, looked: true } }
    case 'answerScale': {
      const answers = { ...state.scale.answers, [action.question]: action.is }
      // In Guided the rack is checked as soon as its last question is answered.
      const checked = guided && SCALE_QUESTION_IDS.every((id) => answers[id] !== null)
      return settled({ ...state, scale: { ...state.scale, answers, checked } })
    }
    case 'checkScale':
      return settled({ ...state, scale: { ...state.scale, checked: true } })
    case 'againScale':
      return { ...state, scale: { ...state.scale, tries: Math.min(MAX_TRIES, state.scale.tries + 1), answers: newScaleAnswers(), checked: false } }
    case 'rinse':
      return { ...state, probe: null }
    case 'answerUnit': {
      const answers: CabbageState['unit']['answers'] = action.question === 0 ? [action.answer, state.unit.answers[1]] : [state.unit.answers[0], action.answer]
      return settled({ ...state, unit: { ...state.unit, answers, checked: guided && answers.every((answer) => answer !== null) } })
    }
    case 'checkUnit':
      return settled({ ...state, unit: { ...state.unit, checked: true } })
    case 'againUnit':
      return { ...state, unit: { tries: Math.min(MAX_TRIES, state.unit.tries + 1), answers: [null, null], checked: false } }
    default:
      break
  }
  const thingId = action.thing
  const sample = state.samples[thingId]
  const withSample = (next: Sample, more: Partial<CabbageState> = {}): CabbageState => {
    const samples = { ...state.samples, [thingId]: next }
    // A sample that has come to count joins the list of those that do, once.
    const counted = !state.counted.includes(thingId) && sampleCounts(m, setupOf(m, state), thingId, next) ? [...state.counted, thingId] : state.counted
    return settled({ ...state, ...more, samples, counted })
  }
  switch (action.type) {
    case 'addIndicator':
      return withSample({ ...sample, indicator: true })
    case 'look':
      return withSample({ ...sample, looked: true })
    case 'estimate':
      // Acid, neutral or basic goes with a tube: it is dropped where the indicator is said not to say.
      return withSample({ ...sample, estimate: action.is, is: action.is === CANNOT_SAY ? null : sample.is })
    case 'classify':
      return withSample({ ...sample, is: action.is })
    case 'read': {
      // Guided warns once before an unrinsed probe reads, and reads nothing that time.
      if (guided && state.probe !== null && !sample.warned) return withSample({ ...sample, warned: true })
      const reading = state.probe === null ? 'rinsed' : state.probe
      // Guided checks a sample as soon as a rinsed probe has read it; an unrinsed reading is left for the learner to take again.
      return withSample({ ...sample, reading, checked: guided && reading === 'rinsed' }, { probe: thingId })
    }
    case 'checkSample':
      return withSample({ ...sample, checked: true })
    case 'again':
      return withSample(newSample(Math.min(MAX_TRIES, sample.tries + 1)))
  }
}
