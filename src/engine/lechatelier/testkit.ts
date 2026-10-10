// Scripted learners, for tests only: nothing in the app imports this file.
import { SYSTEM_IDS, WAYS, type DisturbanceId, type SystemId, type Way } from '@/chem-data/lechatelier/data'
import { scripted } from '../scripted'
import { can, reduce, type Action } from './actions'
import { answersFor, type LechatelierModel } from './model'
import { LOOKS, type Observation } from './run'
import { systemView, type TubeShows } from './select'
import { systemModel, type LechatelierState } from './state'

/** Applies the actions in order; throws on one that cannot be done (see `scripted`). */
export const run = scripted<LechatelierModel, LechatelierState, Action>(can, reduce)

/** How a scripted learner works a system. Careful unless told otherwise. */
export interface Technique {
  /** What is predicted before each disturbance; 'none' unless said. A prediction is never judged, so any will do. */
  predict?: Way
  /** The disturbance at which the colour of the liquid is recorded wrongly. */
  wrongLiquidAt?: DisturbanceId
  /** The disturbance at which the solid is recorded wrongly. */
  wrongSolidAt?: DisturbanceId
  /** The disturbance at which the question is answered wrongly. */
  wrongAnswerAt?: DisturbanceId
  /** False to leave the system unchecked where the mode has not checked it. */
  check?: boolean
}

/** What a learner records of a tube, from what is seen of it and nothing else. */
export const seen = (m: LechatelierModel, shows: TubeShows): Observation => ({ solid: shows.solid?.colour ?? m.solidChoices[0]!, liquid: shows.liquid?.colour ?? m.liquidChoices[0]! })

/**
 * Works the disturbance a system has reached, from the prediction to the answer: the prediction, every press of
 * the action with both looks after each, the observation of what the tube then shows, and the answer. The right
 * answer is read from the model, which a learner works out from the equilibrium and the tube. `through` is applied
 * after every action.
 */
export function workDisturbance(m: LechatelierModel, state: LechatelierState, systemId: SystemId, how: Technique = {}, through: (s: LechatelierState) => LechatelierState = (s) => s): LechatelierState {
  const go = (actions: Action[]) => (state = run(m, state, actions, through))
  const view = () => systemView(m, state, systemId)
  const id = view().disturbance!
  const disturbance = systemModel(m, systemId).disturbances.find((d) => d.id === id)!
  const current = () => view().disturbances.find((d) => d.id === id)!
  go([{ type: 'predict', system: systemId, way: how.predict ?? 'none' }])
  for (let press = 0; press < disturbance.portions; press++) go([{ type: 'act', system: systemId }, ...LOOKS.map((at): Action => ({ type: 'look', system: systemId, at }))])
  const observation = seen(m, current().shows!)
  const other = (choices: readonly string[], value: string) => choices.find((choice) => choice !== value)!
  go([
    {
      type: 'observe',
      system: systemId,
      observation: {
        solid: how.wrongSolidAt === id ? other(m.solidChoices, observation.solid) : observation.solid,
        liquid: how.wrongLiquidAt === id ? other(m.liquidChoices, observation.liquid) : observation.liquid,
      },
    },
  ])
  go([{ type: 'answer', system: systemId, is: how.wrongAnswerAt === id ? other(answersFor(disturbance.ask), disturbance.right) : disturbance.right }])
  return state
}

/** One whole run of a system from untouched tubes: every disturbance in order, and the check where the mode has not made it. A script that Guided would refuse throws. */
export function wholeSystem(m: LechatelierModel, state: LechatelierState, systemId: SystemId, how: Technique = {}, through: (s: LechatelierState) => LechatelierState = (s) => s): LechatelierState {
  while (systemView(m, state, systemId).disturbance !== null) state = workDisturbance(m, state, systemId, how, through)
  if (how.check !== false && systemView(m, state, systemId).outcome.state === 'to-check') state = run(m, state, [{ type: 'checkSystem', system: systemId }], through)
  return state
}

/** The whole lab, each system once, careful. */
export function wholeLab(m: LechatelierModel, state: LechatelierState, through: (s: LechatelierState) => LechatelierState = (s) => s): LechatelierState {
  for (const systemId of SYSTEM_IDS) state = wholeSystem(m, state, systemId, {}, through)
  return state
}

/** Every way a prediction can be made. */
export const PREDICTIONS: readonly Way[] = WAYS
