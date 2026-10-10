import { WAYS, type DisturbanceId, type Way } from '@/chem-data/lechatelier/data'
import { answersFor, type DisturbanceModel, type LechatelierModel, type StageModel, type SystemModel } from './model'

// One run of a system: its disturbances, worked one at a time and in order (spec 18.2, 18.3). A run is stored as
// the list of things done in it, and everything else (which disturbance it has reached, what each tube shows,
// what was predicted and recorded, whether it counts) is worked out again from that list each time it is read. So
// a stored run cannot disagree with itself. Nothing here depends on the mode: Guided's refusals are in actions.ts.
//
// A disturbance goes one way. The learner says beforehand which way the equilibrium will go, and can change that
// until the action begins; the action is done, a portion at each press; both parts of the tube are looked at; what
// is seen is recorded, and can be recorded again; and the question is answered, once, which ends the disturbance.
// When every disturbance is done the system is checked, after which nothing more is done in the run.

/** The two parts of a tube that are looked at, as they lie in it: the liquid, and the bottom, where a solid settles. */
export const LOOKS = ['liquid', 'bottom'] as const
export type Look = (typeof LOOKS)[number]

/** What an observation records: the colour of the solid in the tube, or that there is none, and the colour of the liquid. */
export const FIELDS = ['solid', 'liquid'] as const
export type Field = (typeof FIELDS)[number]
export type Observation = Record<Field, string>

/** One thing done in a run, as it is stored. Each is done to the disturbance the run has reached. */
export type RunEvent =
  /** Which way the equilibrium is expected to go. */
  | { t: 'predict'; way: Way }
  /** One press of the disturbance's action: a portion goes in, or the tube goes into its bath. */
  | { t: 'act' }
  | { t: 'look'; at: Look }
  | { t: 'observe'; solid: string; liquid: string }
  /** The answer to the disturbance's question: a way, or what took the metal ion away. */
  | { t: 'answer'; is: string }
  /** The system's answers are checked together. */
  | { t: 'check' }

export interface StepState {
  prediction: Way | null
  /** How many presses of the action have been made. */
  acted: number
  /** The parts of the tube looked at since it last changed. */
  looked: readonly Look[]
  observation: Observation | null
  answer: string | null
}

export interface RunState {
  /** The disturbance being worked, by its place; the count of them once all are done. */
  at: number
  steps: readonly StepState[]
  checked: boolean
}

const NEW_STEP: StepState = { prediction: null, acted: 0, looked: [], observation: null, answer: null }

export const newRunState = (system: SystemModel): RunState => ({ at: 0, steps: system.disturbances.map(() => NEW_STEP), checked: false })

/** The tube of a disturbance as it stands after so many presses of its action. */
export const stageAt = (disturbance: DisturbanceModel, acted: number): StageModel => (acted === 0 ? disturbance.before : disturbance.stages[Math.min(acted, disturbance.stages.length) - 1]!)

/** What a tube shows at a stage, as an observation records it. */
export const observationOf = (stage: StageModel): Observation => ({ solid: stage.solid, liquid: stage.liquid })

/** What the tube of a disturbance shows once its action is complete: what its observation is held to. */
export const shownAtEnd = (disturbance: DisturbanceModel): Observation => observationOf(disturbance.stages[disturbance.stages.length - 1]!)

/** Why a thing cannot be done in a run as it stands. */
export type Refused =
  | 'system-checked'
  | 'all-done'
  | 'not-all-done'
  | 'predict-first'
  | 'prediction-fixed'
  | 'action-done'
  | 'act-first'
  | 'look-first'
  | 'observe-first'
  | 'invalid-entry'

/**
 * The run after one more thing is done in it, or why that cannot be done. A thing that changes nothing (a look at
 * a part already looked at, the prediction or the observation that already stands) gives back the very same run.
 */
export function apply(m: LechatelierModel, system: SystemModel, run: RunState, event: RunEvent): RunState | Refused {
  if (run.checked) return 'system-checked'
  const count = system.disturbances.length
  if (event.t === 'check') return run.at < count ? 'not-all-done' : { ...run, checked: true }
  if (run.at >= count) return 'all-done'
  const disturbance = system.disturbances[run.at]!
  const step = run.steps[run.at]!
  const withStep = (patch: Partial<StepState>, at: number = run.at): RunState => ({ ...run, at, steps: run.steps.map((other, i) => (i === run.at ? { ...other, ...patch } : other)) })

  switch (event.t) {
    case 'predict':
      if (step.acted > 0) return 'prediction-fixed'
      if (!WAYS.includes(event.way)) return 'invalid-entry'
      return event.way === step.prediction ? run : withStep({ prediction: event.way })
    case 'act':
      if (step.prediction === null) return 'predict-first'
      if (step.acted >= disturbance.portions) return 'action-done'
      // The tube has changed, so it is looked at again.
      return withStep({ acted: step.acted + 1, looked: [] })
    case 'look':
      if (!LOOKS.includes(event.at)) return 'invalid-entry'
      return step.looked.includes(event.at) ? run : withStep({ looked: [...step.looked, event.at] })
    case 'observe':
      if (step.acted < disturbance.portions) return 'act-first'
      if (!LOOKS.every((look) => step.looked.includes(look))) return 'look-first'
      if (!m.solidChoices.includes(event.solid) || !m.liquidChoices.includes(event.liquid)) return 'invalid-entry'
      return step.observation?.solid === event.solid && step.observation.liquid === event.liquid ? run : withStep({ observation: { solid: event.solid, liquid: event.liquid } })
    case 'answer':
      if (step.observation === null) return 'observe-first'
      if (!answersFor(disturbance.ask).includes(event.is)) return 'invalid-entry'
      return withStep({ answer: event.is }, run.at + 1)
  }
}

/** The run a list of events gives, or null where the list is not one a run could have: an event that cannot be done where it stands, or one that changes nothing. */
export function replay(m: LechatelierModel, system: SystemModel, events: readonly RunEvent[]): RunState | null {
  let run = newRunState(system)
  for (const event of events) {
    const next = apply(m, system, run, event)
    if (typeof next === 'string' || next === run) return null
    run = next
  }
  return run
}

/** The fields of an observation that are not what the tube showed. */
export const wrongFieldsOf = (observation: Observation, showed: Observation): Field[] => FIELDS.filter((field) => observation[field] !== showed[field])

/** Why a run does not count (spec 18.3): an observation that is not what the tube showed, or an answer that is not right. */
export type Reason = { kind: 'observation-wrong'; disturbance: DisturbanceId } | { kind: 'answer-wrong'; disturbance: DisturbanceId }

/**
 * A run judged (spec 18.3): it counts when each observation is what its tube showed and each answer is right.
 * The reasons it does not count, in the order of the disturbances; empty when it counts. Null for a run that has
 * not been checked.
 */
export function reasonsOf(system: SystemModel, run: RunState): Reason[] | null {
  if (!run.checked) return null
  return system.disturbances.flatMap((disturbance, at): Reason[] => {
    const step = run.steps[at]!
    return [
      ...(step.observation !== null && wrongFieldsOf(step.observation, shownAtEnd(disturbance)).length === 0 ? [] : [{ kind: 'observation-wrong', disturbance: disturbance.id } as const]),
      ...(step.answer === disturbance.right ? [] : [{ kind: 'answer-wrong', disturbance: disturbance.id } as const]),
    ]
  })
}
