import { z } from 'zod'
import { KIND_ANSWERS, LOOKS, METAL_IDS, STATION_IDS, type StationId } from '@/chem-data/reactions/data'
import { MAX_COEFFICIENT, MAX_TERMS } from './built'
import type { ReactionsModel, StationModel } from './model'
import { reasonsOf, replay, type Reason, type RunEvent, type RunState } from './run'

// The lab as plain data: the whole record saved for it. It holds, for each run of each station, the list of
// things the learner did in it, as short strings, so a round trip through JSON gives back the same value. There is
// no seed: nothing in this lab is drawn by chance (spec 24.3). What each vessel shows, whether an observation, a
// kind, an equation or the order is right, whether a run counts and why not: all of it is worked out on reading
// and stored nowhere, so a stored record cannot disagree with itself. The one stored judgement is the status, and
// the schema holds it to the runs.
//
// The bounds are literals. A change to this shape, or to anything a stored run is worked out from or judged
// against (what a vessel shows, the choices, the looks, a kind, an equation, a species' atoms or states, the
// tiles, the order of the metals), needs the reactions entry's version raised (src/reactions-version.test.ts).

/** The most runs of a station, and the most things done in one run, that a record holds. Either is far more than a learner needs; each keeps a stored record small. */
export const MAX_RUNS = 200
export const MAX_EVENTS = 500

const text = z.string().min(1).max(40)
const termSchema = z.strictObject({ speciesId: text, coefficient: z.number().int().min(1).max(MAX_COEFFICIENT), state: z.enum(['aq', 's', 'l', 'g']) })
const sideSchema = z.array(termSchema).min(1).max(MAX_TERMS)
const eventSchema = z.union([
  z.strictObject({ t: z.literal('act') }),
  z.strictObject({ t: z.literal('look'), v: text, at: z.enum(LOOKS) }),
  z.strictObject({ t: z.literal('observe'), v: text, is: z.record(text, text) }),
  z.strictObject({ t: z.literal('kind'), v: text, is: z.enum(KIND_ANSWERS) }),
  z.strictObject({ t: z.literal('equation'), v: text, reactants: sideSchema, products: sideSchema }),
  z.strictObject({ t: z.literal('order'), is: z.array(z.enum(METAL_IDS)).length(METAL_IDS.length) }),
  z.strictObject({ t: z.literal('check') }),
])

const runSchema = z.strictObject({
  /** 0 for the first run of its station. */
  index: z.number().int().min(0),
  /** What was done in the run, in order. */
  events: z.array(eventSchema).max(MAX_EVENTS),
})
const runsSchema = z.array(runSchema).min(1).max(MAX_RUNS)

const stateSchema = z.strictObject({
  mode: z.enum(['guided', 'challenge']),
  status: z.enum(['in-progress', 'completed']),
  /** Every run of each station in order; the last is the current one. */
  stations: z.strictObject({ 'zinc-copper-sulfate': runsSchema, 'magnesium-flame': runsSchema, 'metals-in-acid': runsSchema, 'two-solutions': runsSchema, peroxide: runsSchema }),
})

export type Run = z.infer<typeof runSchema>
export type ReactionsState = z.infer<typeof stateSchema>
export type Mode = ReactionsState['mode']

export const newRun = (index: number): Run => ({ index, events: [] })

/** A lab that has just been started. */
export function createLab(mode: Mode): ReactionsState {
  return { mode, status: 'in-progress', stations: { 'zinc-copper-sulfate': [newRun(0)], 'magnesium-flame': [newRun(0)], 'metals-in-acid': [newRun(0)], 'two-solutions': [newRun(0)], peroxide: [newRun(0)] } }
}

/** A station of the model by its id. */
export function stationModel(m: ReactionsModel, stationId: StationId): StationModel {
  const station = m.stations.find((s) => s.id === stationId)
  if (!station) throw new Error(`the model has no station "${stationId}"`)
  return station
}

export const currentRun = (state: ReactionsState, stationId: StationId): Run => state.stations[stationId][state.stations[stationId].length - 1]!

// A stored run is never changed in place: the reducer makes a new one for every action. So what a run works out to
// is kept beside the run itself for as long as the run is, and a page that asks about one run many times works it
// out once. What is kept depends on nothing but its arguments, which are kept with it and compared.
const workedOut = new WeakMap<Run, { m: ReactionsModel; stationId: StationId; state: RunState }>()

/** A stored run worked out: what was done and recorded in it. Throws on a run the schema would have refused. */
export function runStateOf(m: ReactionsModel, stationId: StationId, run: Run): RunState {
  const kept = workedOut.get(run)
  if (kept !== undefined && kept.m === m && kept.stationId === stationId) return kept.state
  const state = replay(m, stationModel(m, stationId), run.events as RunEvent[])
  if (state === null) throw new Error(`the stored run ${run.index} of the station "${stationId}" is not one the lab could have made`)
  workedOut.set(run, { m, stationId, state })
  return state
}

/** Why a run does not count; empty when it counts; null while it has not been checked. */
export const judge = (m: ReactionsModel, stationId: StationId, run: Run): Reason[] | null => reasonsOf(m, stationModel(m, stationId), runStateOf(m, stationId, run))

export const runCounts = (m: ReactionsModel, stationId: StationId, run: Run): boolean => judge(m, stationId, run)?.length === 0

/** A station counts when one of its runs does (spec 24.2). */
export const stationDone = (m: ReactionsModel, state: Pick<ReactionsState, 'stations'>, stationId: StationId): boolean => state.stations[stationId].some((run) => runCounts(m, stationId, run))

/** The status the runs give: completed when all five stations count. */
export const statusOf = (m: ReactionsModel, state: Pick<ReactionsState, 'stations'>): ReactionsState['status'] => (STATION_IDS.every((stationId) => stationDone(m, state, stationId)) ? 'completed' : 'in-progress')

/**
 * The stored shape, held to the model it is read with: a run's index is its place in the list, every run is a list
 * of things that could have been done in that order and none that changes nothing, and the status is the one the
 * runs give. A run left unfinished behind a later one is as the reducer leaves it: working a station again
 * abandons the run before.
 */
export const reactionsStateSchema = (m: ReactionsModel): z.ZodType<ReactionsState> =>
  stateSchema.superRefine((state, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message })
    let sound = true
    for (const stationId of STATION_IDS) {
      state.stations[stationId].forEach((run, place) => {
        if (run.index !== place) {
          sound = false
          return issue(['stations', stationId, place, 'index'], "a run's index is its place in the list")
        }
        if (replay(m, stationModel(m, stationId), run.events as RunEvent[]) === null) {
          sound = false
          issue(['stations', stationId, place, 'events'], 'not a list of things that could have been done in this order')
        }
      })
    }
    if (sound && state.status !== statusOf(m, state)) issue(['status'], 'the status is not the one the runs give')
  })
