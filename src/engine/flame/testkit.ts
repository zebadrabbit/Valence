// Scripted learners, for tests only: nothing in the app imports this file.
import type { FlameData } from '@/chem-data/flame/data'
import { scripted } from '../scripted'
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

/** Applies the actions in order; throws on one that cannot be done (see `scripted`). */
export const run = scripted<FlameData, FlameState, Action>(can, reduce)
