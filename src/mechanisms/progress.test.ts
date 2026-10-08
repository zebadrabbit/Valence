import { describe, expect, it } from 'vitest'
import { hclNahco3 as mechanism } from './data'
import { can, createProgress, mechanismProgressSchema, pendingPrediction, predictionResults, predictionsOf, reduce, type Action, type MechanismProgress } from './progress'

const schema = mechanismProgressSchema(mechanism)
const run = (progress: MechanismProgress, ...actions: Action[]) => actions.reduce((state, action) => reduce(mechanism, state, action), progress)
const guided = createProgress('guided')
const challenge = createProgress('challenge')

describe('a run that has just begun', () => {
  it('is at the start, in its mode, with nothing answered', () => {
    expect(guided).toEqual({ mode: 'guided', status: 'in-progress', position: 0, answers: [] })
    expect(challenge.mode).toBe('challenge')
    expect(schema.safeParse(guided).success).toBe(true)
  })
})

describe('the predictions', () => {
  it('are one before each step, each asked at the start of its step', () => {
    expect(predictionsOf(mechanism).map((p) => [p.question.id, p.stepId, p.at])).toEqual([
      ['dissolving', 'dissolving', 0.16],
      ['proton-transfer', 'proton-transfer', 0.32],
      ['decomposition', 'decomposition', 0.52],
      ['gas-escapes', 'gas-escapes', 0.76],
    ])
  })
})

describe('seek: the learner scrubs, or a deep link opens', () => {
  it('goes anywhere on the track, in either mode, past any question', () => {
    expect(run(guided, { type: 'seek', t: 0.4 }).position).toBe(0.4)
    expect(run(challenge, { type: 'seek', t: 0.9 }).position).toBe(0.9)
    expect(run(challenge, { type: 'seek', t: 0.9 }, { type: 'seek', t: 0.1 }).position).toBe(0.1)
  })

  it('is refused off the track, and for anything that is not a number', () => {
    for (const t of [-0.1, 1.1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(can(mechanism, guided, { type: 'seek', t })).toBe('out-of-range')
      expect(reduce(mechanism, guided, { type: 'seek', t })).toBe(guided)
    }
  })
})

describe('advance: the timeline plays', () => {
  it('in Guided mode plays through every step without a pause', () => {
    expect(run(guided, { type: 'advance', t: 0.5 }).position).toBe(0.5)
    expect(pendingPrediction(mechanism, run(guided, { type: 'seek', t: 0.32 }))).toBeNull()
  })

  it('in Challenge mode stops at the start of the next step whose question is not answered, and asks it', () => {
    const paused = run(challenge, { type: 'advance', t: 0.5 })
    expect(paused.position).toBe(0.16)
    expect(pendingPrediction(mechanism, paused)?.id).toBe('dissolving')
    // It stays there until the question is answered.
    expect(can(mechanism, paused, { type: 'advance', t: 0.5 })).toBe('prediction-pending')
    expect(reduce(mechanism, paused, { type: 'advance', t: 0.5 })).toBe(paused)
    const answered = run(paused, { type: 'answer', questionId: 'dissolving', optionId: 'atoms' })
    expect(pendingPrediction(mechanism, answered)).toBeNull()
    expect(run(answered, { type: 'advance', t: 0.3 }).position).toBe(0.3)
    // ...and stops again at the next.
    expect(run(answered, { type: 'advance', t: 0.6 }).position).toBe(0.32)
  })

  it('does not stop before the first question, nor at one already answered', () => {
    expect(run(challenge, { type: 'advance', t: 0.1 }).position).toBe(0.1)
    const answered = run(challenge, { type: 'advance', t: 1 }, { type: 'answer', questionId: 'dissolving', optionId: 'ions' }, { type: 'advance', t: 0.2 }, { type: 'seek', t: 0.05 })
    expect(run(answered, { type: 'advance', t: 0.25 }).position).toBe(0.25)
  })

  it('goes forward only', () => {
    const later = run(guided, { type: 'seek', t: 0.5 })
    expect(can(mechanism, later, { type: 'advance', t: 0.4 })).toBe('not-forward')
    expect(can(mechanism, later, { type: 'advance', t: 0.5 })).toBe('not-forward')
    expect(can(mechanism, later, { type: 'advance', t: 1.5 })).toBe('out-of-range')
  })

  it('a learner who scrubs to the start of a step in Challenge mode is asked its question, and one who scrubs past is not', () => {
    expect(pendingPrediction(mechanism, run(challenge, { type: 'seek', t: 0.52 }))?.id).toBe('decomposition')
    expect(pendingPrediction(mechanism, run(challenge, { type: 'seek', t: 0.53 }))).toBeNull()
  })
})

describe('answer', () => {
  const asked = run(challenge, { type: 'advance', t: 1 })

  it('records the first answer to the question that is being asked, right or wrong', () => {
    const wrong = run(asked, { type: 'answer', questionId: 'dissolving', optionId: 'molecules' })
    expect(wrong.answers).toEqual([{ questionId: 'dissolving', optionId: 'molecules' }])
    expect(predictionResults(mechanism, wrong)).toEqual([{ questionId: 'dissolving', optionId: 'molecules', correct: false }])
    expect(predictionResults(mechanism, run(asked, { type: 'answer', questionId: 'dissolving', optionId: 'ions' }))).toEqual([{ questionId: 'dissolving', optionId: 'ions', correct: true }])
  })

  it('is refused for a question that is not being asked, an answer that is not one of its own, and a second answer', () => {
    expect(can(mechanism, asked, { type: 'answer', questionId: 'no-such', optionId: 'ions' })).toBe('unknown-question')
    expect(can(mechanism, asked, { type: 'answer', questionId: 'dissolving', optionId: 'pair' })).toBe('unknown-option')
    expect(can(mechanism, asked, { type: 'answer', questionId: 'proton-transfer', optionId: 'pair' })).toBe('not-asked')
    expect(can(mechanism, run(guided, { type: 'seek', t: 0.16 }), { type: 'answer', questionId: 'dissolving', optionId: 'ions' })).toBe('not-asked')
    const once = run(asked, { type: 'answer', questionId: 'dissolving', optionId: 'atoms' })
    expect(can(mechanism, run(once, { type: 'seek', t: 0.16 }), { type: 'answer', questionId: 'dissolving', optionId: 'ions' })).toBe('already-answered')
    expect(run(once, { type: 'seek', t: 0.16 }, { type: 'answer', questionId: 'dissolving', optionId: 'ions' }).answers).toEqual(once.answers)
  })
})

describe('completion (spec 9.1): the mechanism is completed when the learner has reached t = 1', () => {
  it('by playing or by scrubbing, and stays completed when the learner goes back', () => {
    expect(run(guided, { type: 'advance', t: 1 }).status).toBe('completed')
    expect(run(guided, { type: 'seek', t: 1 }).status).toBe('completed')
    expect(run(guided, { type: 'seek', t: 0.999 }).status).toBe('in-progress')
    const back = run(guided, { type: 'seek', t: 1 }, { type: 'seek', t: 0.2 })
    expect(back).toMatchObject({ status: 'completed', position: 0.2 })
  })

  it('a Challenge run reaches the end by answering each question as it comes', () => {
    let progress = challenge
    for (const [questionId, optionId] of [['dissolving', 'ions'], ['proton-transfer', 'pair'], ['decomposition', 'splits'], ['gas-escapes', 'bubbles']] as const) {
      progress = run(progress, { type: 'advance', t: 1 })
      expect(pendingPrediction(mechanism, progress)?.id).toBe(questionId)
      progress = run(progress, { type: 'answer', questionId, optionId })
    }
    progress = run(progress, { type: 'advance', t: 1 })
    expect(progress).toMatchObject({ status: 'completed', position: 1 })
    expect(predictionResults(mechanism, progress).map((r) => r.correct)).toEqual([true, false, true, true])
    expect(schema.safeParse(progress).success).toBe(true)
  })
})

describe('setMode', () => {
  it('changes the mode and nothing else, at any time', () => {
    const part = run(challenge, { type: 'advance', t: 1 }, { type: 'answer', questionId: 'dissolving', optionId: 'ions' }, { type: 'advance', t: 0.3 })
    expect(run(part, { type: 'setMode', mode: 'guided' })).toEqual({ ...part, mode: 'guided' })
    expect(run(guided, { type: 'seek', t: 1 }, { type: 'setMode', mode: 'challenge' }).status).toBe('completed')
  })
})

describe('the stored record', () => {
  const full = run(challenge, { type: 'advance', t: 1 }, { type: 'answer', questionId: 'dissolving', optionId: 'atoms' }, { type: 'advance', t: 0.3 })

  it('round-trips through JSON unchanged, at every stage of a run', () => {
    for (const progress of [guided, challenge, full, run(guided, { type: 'seek', t: 1 }), run(guided, { type: 'seek', t: 1 }, { type: 'seek', t: 1 / 3 })]) {
      const stored = JSON.parse(JSON.stringify(progress)) as unknown
      expect(schema.parse(stored)).toEqual(progress)
    }
  })

  it('is plain data: its mode, its status, a position and the answers given', () => {
    expect(full).toEqual({ mode: 'challenge', status: 'in-progress', position: 0.3, answers: [{ questionId: 'dissolving', optionId: 'atoms' }] })
  })

  it('refuses what the reducer would not have stored', () => {
    const refused = (change: Partial<MechanismProgress> & Record<string, unknown>) => schema.safeParse({ ...full, ...change }).success === false
    expect(refused({ position: 1.2 })).toBe(true)
    expect(refused({ position: -0.1 })).toBe(true)
    expect(refused({ mode: 'expert' as never })).toBe(true)
    expect(refused({ extra: 1 })).toBe(true)
    expect(refused({ answers: [{ questionId: 'no-such', optionId: 'ions' }] })).toBe(true)
    expect(refused({ answers: [{ questionId: 'dissolving', optionId: 'pair' }] })).toBe(true)
    expect(refused({ answers: [...full.answers, { questionId: 'dissolving', optionId: 'ions' }] })).toBe(true)
    // At the end of the track the run is completed.
    expect(refused({ position: 1 })).toBe(true)
    expect(refused({ position: 1, status: 'completed' })).toBe(false)
  })

  it('an action that cannot be done returns the very same record', () => {
    expect(reduce(mechanism, full, { type: 'answer', questionId: 'dissolving', optionId: 'ions' })).toBe(full)
    expect(reduce(mechanism, full, { type: 'advance', t: 0.2 })).toBe(full)
  })
})
