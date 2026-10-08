import { z } from 'zod'
import type { Mechanism, Question, Step } from './schema'

// What is saved of a learner's run through a mechanism (spec 10: mode, last position, answered predictions), as
// plain data, so a round trip through JSON gives back the same value; and every learner action: when it can be
// done and what it does. Whether an answer was right is not stored. It is worked out on reading, against the
// questions as they then are, so a stored record cannot disagree with them.
//
// A change to this shape, to the track (a stored position means a place on it) or to the questions and their
// answers needs the mechanism entry's version raised (src/mechanism-version.test.ts).

const text = z.string().min(1)
const progressSchema = z.strictObject({
  mode: z.enum(['guided', 'challenge']),
  /** Completed once the end of the track has been reached (spec 9.1), and from then on. */
  status: z.enum(['in-progress', 'completed']),
  /** Where the learner last was on the track, from 0 to 1. */
  position: z.number().min(0).max(1),
  /** The first answer given to each prediction, in the order they were given. */
  answers: z.array(z.strictObject({ questionId: text, optionId: text })),
})

export type MechanismProgress = z.infer<typeof progressSchema>
export type Mode = MechanismProgress['mode']

/** A prediction of Challenge mode: the question, the step it comes before, and where on the track it is asked. */
export type Prediction = { question: Question; stepId: string; at: number }

/** The mechanism's predictions, in track order. Each is asked at the start of its step. */
export function predictionsOf(mechanism: Mechanism): Prediction[] {
  return mechanism.chapters.filter((c): c is Step => c.kind === 'step').flatMap((step) => (step.question ? [{ question: step.question, stepId: step.id, at: step.range[0] }] : []))
}

/** The stored shape, held to the mechanism it is read with: each answer is to one of its questions, once, and is one of that question's own. */
export const mechanismProgressSchema = (mechanism: Mechanism): z.ZodType<MechanismProgress> =>
  progressSchema.superRefine((progress, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message })
    const questions = predictionsOf(mechanism).map((p) => p.question)
    progress.answers.forEach((answer, i) => {
      const question = questions.find((q) => q.id === answer.questionId)
      if (!question?.options.some((o) => o.id === answer.optionId)) issue(['answers', i], 'not an answer to a question of this mechanism')
      if (progress.answers.findIndex((other) => other.questionId === answer.questionId) !== i) issue(['answers', i], 'a question is answered once')
    })
    if (progress.position === 1 && progress.status !== 'completed') issue(['status'], 'a run at the end of the track is completed')
  })

/** A run that has just begun. */
export const createProgress = (mode: Mode): MechanismProgress => ({ mode, status: 'in-progress', position: 0, answers: [] })

export type Action =
  | { type: 'setMode'; mode: Mode }
  /** The learner scrubs, or a deep link opens: to anywhere on the track. */
  | { type: 'seek'; t: number }
  /** The timeline plays on to `t`. In Challenge mode it stops at the start of a step whose question is not answered (spec 9.1). */
  | { type: 'advance'; t: number }
  | { type: 'answer'; questionId: string; optionId: string }

/** Why an action cannot be done now. */
export type Blocked = 'out-of-range' | 'not-forward' | 'prediction-pending' | 'unknown-question' | 'unknown-option' | 'not-asked' | 'already-answered'

const answered = (progress: MechanismProgress, questionId: string) => progress.answers.some((a) => a.questionId === questionId)

/** The question Challenge mode is waiting on: that of the step the learner stands at the start of, while it is not answered. Null in Guided mode. */
export function pendingPrediction(mechanism: Mechanism, progress: MechanismProgress): Question | null {
  if (progress.mode !== 'challenge') return null
  // ponytail: "at the start of a step" is the very number the record gives. `advance` stops on that number and a
  // deep link opens on it; a scrub that lands a hair to either side is not asked. A window would need a width.
  return predictionsOf(mechanism).find((p) => p.at === progress.position && !answered(progress, p.question.id))?.question ?? null
}

/** null when the action can be done now; otherwise the first reason that applies. */
export function can(mechanism: Mechanism, progress: MechanismProgress, action: Action): Blocked | null {
  switch (action.type) {
    case 'setMode':
      return null
    case 'seek':
      return action.t >= 0 && action.t <= 1 ? null : 'out-of-range'
    case 'advance':
      if (!(action.t >= 0 && action.t <= 1)) return 'out-of-range'
      if (action.t <= progress.position) return 'not-forward'
      return pendingPrediction(mechanism, progress) ? 'prediction-pending' : null
    case 'answer': {
      const question = predictionsOf(mechanism).find((p) => p.question.id === action.questionId)?.question
      if (!question) return 'unknown-question'
      if (!question.options.some((o) => o.id === action.optionId)) return 'unknown-option'
      if (answered(progress, question.id)) return 'already-answered'
      return pendingPrediction(mechanism, progress)?.id === question.id ? null : 'not-asked'
    }
  }
}

/** The run after an action. An action that cannot be done now returns the very same object. */
export function reduce(mechanism: Mechanism, progress: MechanismProgress, action: Action): MechanismProgress {
  if (can(mechanism, progress, action) !== null) return progress
  const at = (position: number): MechanismProgress => ({ ...progress, position, status: position === 1 ? 'completed' : progress.status })
  switch (action.type) {
    case 'setMode':
      return { ...progress, mode: action.mode }
    case 'seek':
      return at(action.t)
    case 'advance': {
      const stop = progress.mode === 'challenge' ? predictionsOf(mechanism).find((p) => p.at > progress.position && p.at <= action.t && !answered(progress, p.question.id)) : undefined
      return at(stop ? stop.at : action.t)
    }
    case 'answer':
      return { ...progress, answers: [...progress.answers, { questionId: action.questionId, optionId: action.optionId }] }
  }
}

/** Each answer given, with whether it was the right one, worked out against the questions as they are. */
export function predictionResults(mechanism: Mechanism, progress: MechanismProgress): { questionId: string; optionId: string; correct: boolean }[] {
  const questions = predictionsOf(mechanism).map((p) => p.question)
  return progress.answers.map((answer) => ({ ...answer, correct: questions.find((q) => q.id === answer.questionId)?.options.find((o) => o.id === answer.optionId)?.correct === true }))
}
