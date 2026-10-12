import { KIND_ANSWERS, type Field, type KindAnswer, type Look, type MetalId } from '@/chem-data/reactions/data'
import { checkBuilt, isBuilt, sameBuilt, type Built, type Problem } from './built'
import type { ReactionsModel, Seen, StationModel, VesselModel } from './model'

// One run of a station (spec 24.2). A run is stored as the list of things done in it, and everything else (what
// each vessel shows, what was recorded, whether it counts) is worked out again from that list each time it is
// read. So a stored run cannot disagree with itself. Nothing here depends on the mode: Guided's refusals are in
// actions.ts.
//
// A station goes one way. Its vessels can be looked at before anything is done; the one action is done, once;
// every part of a vessel is looked at; what is seen of the vessel is recorded; then the kind of its reaction is
// said; then, unless the learner said that nothing reacted, its equation is built. The station of the three
// metals also asks for their order, once each tube's observation is recorded. Everything recorded can be recorded
// again until the station is checked, after which nothing more is done in the run.

/** What an observation records: one of its field's choices for each field the vessel asks for. */
export type Observation = Readonly<Partial<Record<Field, string>>>

/** One thing done in a run, as it is stored. `v` is the vessel it is done to. */
export type RunEvent =
  /** The station's one action: the metal goes in, the strip goes into the flame, the solutions are mixed, the drops are added. */
  | { t: 'act' }
  | { t: 'look'; v: string; at: Look }
  | { t: 'observe'; v: string; is: Record<string, string> }
  | { t: 'kind'; v: string; is: KindAnswer }
  | { t: 'equation'; v: string; reactants: Built['reactants']; products: Built['products'] }
  /** The station's metals from the most active to the least. */
  | { t: 'order'; is: MetalId[] }
  /** The station's answers are checked together. */
  | { t: 'check' }

export interface VesselState {
  /** The parts looked at since the vessel last changed. */
  looked: readonly Look[]
  observation: Observation | null
  kind: KindAnswer | null
  equation: Built | null
}

export interface RunState {
  acted: boolean
  /** One for each vessel of the station, in its order. */
  vessels: readonly VesselState[]
  order: readonly MetalId[] | null
  checked: boolean
}

const NEW_VESSEL: VesselState = { looked: [], observation: null, kind: null, equation: null }

export const newRunState = (station: StationModel): RunState => ({ acted: false, vessels: station.vessels.map(() => NEW_VESSEL), order: null, checked: false })

/** What a vessel shows as a run stands: what was there before the action, or what is seen after it. */
export const seenNow = (vessel: VesselModel, run: RunState): Seen => (run.acted ? vessel.after : vessel.before)

/** Why a thing cannot be done in a run as it stands. */
export type Refused = 'station-checked' | 'action-done' | 'act-first' | 'look-first' | 'observe-first' | 'kind-first' | 'nothing-to-write' | 'not-all-done' | 'invalid-entry'

/** Every part of a vessel has been looked at since it last changed. */
export const allLooked = (vessel: VesselModel, state: VesselState): boolean => vessel.looks.every((look) => state.looked.includes(look.at))

/** Everything a station asks for has been recorded: for each vessel what is seen, the kind and, unless the learner said that nothing reacted, the equation; and the order, where it is asked. */
export const complete = (station: StationModel, run: RunState): boolean =>
  run.acted && run.vessels.every((vessel) => vessel.observation !== null && vessel.kind !== null && (vessel.kind === 'none' || vessel.equation !== null)) && (station.order === null || run.order !== null)

const validObservation = (m: ReactionsModel, vessel: VesselModel, is: unknown): is is Record<string, string> =>
  typeof is === 'object' && is !== null && Object.keys(is).length === vessel.asks.length && vessel.asks.every((field) => m.choices[field].includes((is as Record<string, string>)[field]!))

/**
 * The run after one more thing is done in it, or why that cannot be done. A thing that changes nothing (a look at
 * a part already looked at, an observation, a kind, an equation or an order that already stands) gives back the
 * very same run.
 */
export function apply(m: ReactionsModel, station: StationModel, run: RunState, event: RunEvent): RunState | Refused {
  if (run.checked) return 'station-checked'
  if (event.t === 'check') return complete(station, run) ? { ...run, checked: true } : 'not-all-done'
  // The vessels have changed, so each is looked at again.
  if (event.t === 'act') return run.acted ? 'action-done' : { ...run, acted: true, vessels: run.vessels.map((vessel) => ({ ...vessel, looked: [] })) }
  if (event.t === 'order') {
    if (station.order === null || !Array.isArray(event.is) || event.is.length !== station.order.length || !station.order.every((metal) => event.is.includes(metal))) return 'invalid-entry'
    if (run.vessels.some((vessel) => vessel.observation === null)) return 'observe-first'
    return run.order !== null && run.order.every((metal, i) => metal === event.is[i]) ? run : { ...run, order: [...event.is] }
  }
  const at = station.vessels.findIndex((vessel) => vessel.id === event.v)
  const vessel = station.vessels[at]
  const state = run.vessels[at]
  if (!vessel || !state) return 'invalid-entry'
  const withVessel = (patch: Partial<VesselState>): RunState => ({ ...run, vessels: run.vessels.map((other, i) => (i === at ? { ...other, ...patch } : other)) })

  switch (event.t) {
    case 'look':
      if (!vessel.looks.some((look) => look.at === event.at)) return 'invalid-entry'
      return state.looked.includes(event.at) ? run : withVessel({ looked: [...state.looked, event.at] })
    case 'observe':
      if (!run.acted) return 'act-first'
      if (!allLooked(vessel, state)) return 'look-first'
      if (!validObservation(m, vessel, event.is)) return 'invalid-entry'
      return state.observation !== null && vessel.asks.every((field) => state.observation![field] === event.is[field]) ? run : withVessel({ observation: Object.fromEntries(vessel.asks.map((field) => [field, event.is[field]!])) })
    case 'kind':
      if (state.observation === null) return 'observe-first'
      if (!KIND_ANSWERS.includes(event.is)) return 'invalid-entry'
      // Where the learner says that nothing reacted there is no equation to write, and one built before is let go.
      return state.kind === event.is ? run : withVessel({ kind: event.is, ...(event.is === 'none' ? { equation: null } : {}) })
    case 'equation': {
      if (state.kind === null) return 'kind-first'
      if (state.kind === 'none') return 'nothing-to-write'
      const built = { reactants: event.reactants, products: event.products }
      if (!isBuilt(station, built)) return 'invalid-entry'
      return state.equation !== null && sameBuilt(state.equation, built) ? run : withVessel({ equation: { reactants: built.reactants.map((term) => ({ ...term })), products: built.products.map((term) => ({ ...term })) } })
    }
  }
}

/** The run a list of events gives, or null where the list is not one a run could have: an event that cannot be done where it stands, or one that changes nothing. */
export function replay(m: ReactionsModel, station: StationModel, events: readonly RunEvent[]): RunState | null {
  let run = newRunState(station)
  for (const event of events) {
    const next = apply(m, station, run, event)
    if (typeof next === 'string' || next === run) return null
    run = next
  }
  return run
}

/** The fields of an observation that are not what the vessel showed. */
export const wrongFieldsOf = (vessel: VesselModel, observation: Observation): Field[] => vessel.asks.filter((field) => observation[field] !== vessel.after[field])

/** What is wrong with the equation a vessel has in a run; null where it is right, and where the learner said that nothing reacted and there is none. */
export const equationProblem = (m: ReactionsModel, vessel: VesselModel, state: VesselState): Problem | null => (state.equation === null ? null : checkBuilt(m, vessel, state.equation))

export const orderRight = (station: StationModel, order: readonly MetalId[]): boolean => station.order !== null && station.order.every((metal, i) => metal === order[i])

/** Why a run does not count (spec 24.2). */
export type Reason =
  | { kind: 'observation-wrong'; vessel: string }
  | { kind: 'kind-wrong'; vessel: string }
  | { kind: 'equation-wrong'; vessel: string; problem: Problem }
  | { kind: 'order-wrong' }

/** Every entry of a run that is not right, in the order of the vessels; empty where all that is recorded is right. */
export function faultsOf(m: ReactionsModel, station: StationModel, run: RunState): Reason[] {
  const faults = station.vessels.flatMap((vessel, at): Reason[] => {
    const state = run.vessels[at]!
    const problem = equationProblem(m, vessel, state)
    return [
      ...(state.observation !== null && wrongFieldsOf(vessel, state.observation).length > 0 ? [{ kind: 'observation-wrong', vessel: vessel.id } as const] : []),
      ...(state.kind !== null && state.kind !== vessel.kind ? [{ kind: 'kind-wrong', vessel: vessel.id } as const] : []),
      ...(problem !== null ? [{ kind: 'equation-wrong', vessel: vessel.id, problem } as const] : []),
    ]
  })
  return run.order !== null && !orderRight(station, run.order) ? [...faults, { kind: 'order-wrong' }] : faults
}

/**
 * A run judged (spec 24.2): it counts when what was seen matches what each vessel showed, each kind is right,
 * each equation is right and balanced and, where it is asked, the order is right. The reasons it does not count;
 * empty when it counts. Null for a run that has not been checked.
 */
export const reasonsOf = (m: ReactionsModel, station: StationModel, run: RunState): Reason[] | null => (run.checked ? faultsOf(m, station, run) : null)
