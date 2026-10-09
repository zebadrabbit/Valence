// Scripted learners, for tests only: nothing in the app imports this file.
import type { FlameData } from '@/chem-data/flame/data'
import { can, reduce, type Action } from './actions'
import { expectedObservation, looksOf } from './check'
import type { Loop } from './loop'
import type { FlameState } from './state'

/**
 * What a careful learner does at a station: clean the loop, dip it, hold it in the flame, look at the flame and at
 * every line and band, record what a correct observation holds. Given `uncleaned`, what the loop carries, the
 * cleaning is left out and everything that loop then shows is looked at: the careless learner's station.
 */
export function stationScript(data: FlameData, stationId: string, uncleaned?: Loop): Action[] {
  const held = uncleaned === undefined ? [stationId] : [...uncleaned.filter((entry) => entry !== stationId), stationId]
  return [
    ...(uncleaned === undefined ? [{ type: 'cleanLoop' } as const] : []),
    { type: 'dipLoop', stationId },
    { type: 'holdInFlame', stationId },
    ...looksOf(data, held).map((at): Action => ({ type: 'look', stationId, at })),
    { type: 'recordObservation', stationId, observation: expectedObservation(data, stationId) },
  ]
}

/**
 * Applies the actions in order; throws on one that cannot be done, so a script cannot skip a step unseen.
 * `through` is applied to the state after every action: the resume test passes a round trip through JSON.
 */
export function run(data: FlameData, state: FlameState, actions: readonly Action[], through: (state: FlameState) => FlameState = (s) => s): FlameState {
  for (const action of actions) {
    const blocked = can(data, state, action)
    if (blocked) throw new Error(`${action.type}: ${blocked}`)
    state = through(reduce(data, state, action))
  }
  return state
}
