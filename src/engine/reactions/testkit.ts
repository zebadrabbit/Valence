// Scripted learners, for tests only: nothing in the app imports this file.
import { FIELD_AT, KIND_ANSWERS, STATION_IDS, type Field, type KindAnswer, type MetalId, type StationId } from '@/chem-data/reactions/data'
import type { Entry, State } from '../equation'
import { scripted } from '../scripted'
import { can, reduce, type Action } from './actions'
import type { ReactionsModel } from './model'
import type { Observation } from './run'
import { stationView, type VesselView } from './select'
import { stationModel, type ReactionsState } from './state'

/** Applies the actions in order; throws on one that cannot be done (see `scripted`). */
export const run = scripted<ReactionsModel, ReactionsState, Action>(can, reduce)

/** How a scripted learner works a station. Careful unless told otherwise. */
export interface Technique {
  /** The vessel whose observation is recorded wrongly. */
  wrongObservationAt?: string
  /** The vessel whose kind is said wrongly. */
  wrongKindAt?: string
  /** The vessel whose equation is built wrongly, and how: with a tile that does not belong, with a tile missing, with a state that is not right, or with every coefficient 1 where that does not balance. */
  wrongEquationAt?: string
  wrongEquation?: 'extra' | 'missing' | 'state' | 'unbalanced'
  /** The order is given with its first two metals changed about. */
  wrongOrder?: boolean
  /** False to leave the station unchecked where the mode has not checked it. */
  check?: boolean
}

/**
 * What a learner records of a vessel, from what its looks say and nothing else: for each field, the choice that
 * the words of the look that opened it name. A look that says "No ..." is the field's first choice.
 */
export function seen(view: VesselView, wordsFor: (field: Field) => string): Observation {
  return Object.fromEntries(
    view.fields.map(({ field, choices }) => {
      const words = wordsFor(field)
      const said = [...choices].sort((a, b) => b.length - a.length).find((choice) => new RegExp(choice === 'slow' ? 'slowly' : choice, 'i').test(words))
      return [field, said ?? choices[0]!]
    }),
  )
}

/** The right equation of a vessel as a learner would build it, each species in its own state. Read from the model, which a learner works out from what was seen and the tiles. */
export function rightEntry(m: ReactionsModel, stationId: StationId, vesselId: string): Entry {
  const equation = stationModel(m, stationId).vessels.find((v) => v.id === vesselId)!.equation!
  const side = (terms: readonly { speciesId: string; coefficient: number }[]) => terms.map((term) => ({ ...term, state: m.species.find((s) => s.id === term.speciesId)!.states[0]! }))
  return { noReaction: false, reactants: side(equation.reactants), products: side(equation.products) }
}

/** A wrong equation of each sort for a vessel that has one. */
export function wrongEntry(m: ReactionsModel, stationId: StationId, vesselId: string, how: NonNullable<Technique['wrongEquation']>): Entry {
  const right = rightEntry(m, stationId, vesselId)
  const station = stationModel(m, stationId)
  const used = [...right.reactants, ...right.products].map((term) => term.speciesId)
  switch (how) {
    case 'extra':
      return { ...right, products: [...right.products, { speciesId: station.tiles.find((tile) => !used.includes(tile))!, coefficient: 1, state: 'aq' }] }
    case 'missing':
      // A tile is left out of a side that holds two, so that both sides still hold a term.
      return right.products.length > 1 ? { ...right, products: right.products.slice(1) } : { ...right, reactants: right.reactants.slice(1) }
    case 'state': {
      const other = (state: State): State => (state === 's' ? 'g' : 's')
      return { ...right, reactants: right.reactants.map((term, i) => (i === 0 ? { ...term, state: other(term.state) } : term)) }
    }
    case 'unbalanced':
      return { ...right, reactants: right.reactants.map((term, i) => (i === 0 ? { ...term, coefficient: term.coefficient + 1 } : term)) }
  }
}

/**
 * One whole run of a station from untouched vessels: a look at every part before the action, the action, a look
 * at every part after it, the observation of each vessel from what the looks said, each kind, each equation, the
 * order where it is asked, and the check where the mode has not made it. The right kind, equation and order are
 * read from the model. `through` is applied after every action. A script that Guided would refuse throws.
 */
export function wholeStation(m: ReactionsModel, state: ReactionsState, stationId: StationId, how: Technique = {}, through: (s: ReactionsState) => ReactionsState = (s) => s): ReactionsState {
  const go = (actions: Action[]) => (state = run(m, state, actions, through))
  const view = () => stationView(m, state, stationId)
  const station = stationModel(m, stationId)
  const looks = (): Action[] => view().vessels.flatMap((vessel) => vessel.looks.map((look): Action => ({ type: 'look', station: stationId, vessel: vessel.id, at: look.at })))
  go(looks())
  go([{ type: 'act', station: stationId }])
  go(looks())
  for (const vessel of station.vessels) {
    const shown = view().vessels.find((v) => v.id === vessel.id)!
    const observation = seen(shown, (field) => shown.looks.find((look) => look.at === FIELD_AT[field])!.words!)
    const wrong = how.wrongObservationAt === vessel.id
    const first = shown.fields[0]!
    go([{ type: 'observe', station: stationId, vessel: vessel.id, observation: wrong ? { ...observation, [first.field]: first.choices.find((choice) => choice !== observation[first.field])! } : observation }])
    const kind: KindAnswer = how.wrongKindAt === vessel.id ? KIND_ANSWERS.find((answer) => answer !== vessel.kind && answer !== 'none')! : vessel.kind
    go([{ type: 'sayKind', station: stationId, vessel: vessel.id, kind }])
    if (kind !== 'none') {
      const entry = vessel.equation === null ? wrongEntry(m, stationId, station.vessels.find((v) => v.equation !== null)!.id, 'extra') : how.wrongEquationAt === vessel.id ? wrongEntry(m, stationId, vessel.id, how.wrongEquation ?? 'unbalanced') : rightEntry(m, stationId, vessel.id)
      go([{ type: 'enterEquation', station: stationId, vessel: vessel.id, entry }])
    }
  }
  if (station.order !== null) {
    const [first, second, ...rest] = station.order as [MetalId, MetalId, ...MetalId[]]
    go([{ type: 'sayOrder', station: stationId, order: how.wrongOrder ? [second, first, ...rest] : station.order }])
  }
  if (how.check !== false && view().outcome.state === 'to-check') go([{ type: 'checkStation', station: stationId }])
  return state
}

/** The whole lab, each station once, careful. */
export function wholeLab(m: ReactionsModel, state: ReactionsState, through: (s: ReactionsState) => ReactionsState = (s) => s): ReactionsState {
  for (const stationId of STATION_IDS) state = wholeStation(m, state, stationId, {}, through)
  return state
}
