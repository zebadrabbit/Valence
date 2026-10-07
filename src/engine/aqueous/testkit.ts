// Scripted learners, for tests only: nothing in the app imports this file.
import type { AqueousData } from '@/chem-data/aqueous/data'
import { can, reduce, type Action } from './actions'
import { FORMS, expectedObservation, usesOf, type Entry, type Form } from './check'
import { stationOf } from './react'
import type { AqueousState } from './state'

/** The curated equation of a form as a learner would enter it, each species in its own state; "No reaction" where there is none. */
export function correctEntry(data: AqueousData, stationId: string, form: Form): Entry {
  const curated = stationOf(data, stationId).equations[form]
  if (curated === null) return { noReaction: true, reactants: [], products: [] }
  const side = (terms: { speciesId: string; coefficient: number }[]) => terms.map((term) => ({ ...term, state: data.species.find((s) => s.id === term.speciesId)!.state }))
  return { noReaction: false, reactants: side(curated.reactants), products: side(curated.products) }
}

/** What a careful learner does at a station that has not been touched: mix, apply every tool, record what is there, enter the three equations. */
export function stationScript(data: AqueousData, stationId: string): Action[] {
  const station = stationOf(data, stationId)
  return [
    { type: 'mix', stationId },
    ...usesOf(station).map((tool): Action => ({ type: 'useTool', stationId, tool })),
    { type: 'recordObservation', stationId, observation: expectedObservation(station) },
    ...FORMS.map((form): Action => ({ type: 'enterEquation', stationId, form, entry: correctEntry(data, stationId, form) })),
  ]
}

/**
 * Applies the actions in order; throws on one that cannot be done, so a script cannot skip a step unseen.
 * `through` is applied to the state after every action: the resume test passes a round trip through JSON.
 */
export function run(data: AqueousData, state: AqueousState, actions: readonly Action[], through: (state: AqueousState) => AqueousState = (s) => s): AqueousState {
  for (const action of actions) {
    const blocked = can(data, state, action)
    if (blocked) throw new Error(`${action.type}: ${blocked}`)
    state = through(reduce(data, state, action))
  }
  return state
}
