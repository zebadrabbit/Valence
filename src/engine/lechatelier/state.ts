import { z } from 'zod'
import { SYSTEM_IDS, WAYS, type SystemId } from '@/chem-data/lechatelier/data'
import type { LechatelierModel, SystemModel } from './model'
import { LOOKS, reasonsOf, replay, type Reason, type RunEvent, type RunState } from './run'

// The lab as plain data: the whole record saved for it. It holds, for each run of each system, the list of things
// the learner did in it, as short strings, so a round trip through JSON gives back the same value. There is no
// seed: nothing in this lab is drawn by chance (spec 18.1). Which disturbance a run has reached, what each tube
// shows, whether an observation or an answer is right, whether a run counts and why not: all of it is worked out
// on reading and stored nowhere, so a stored record cannot disagree with itself. The one stored judgement is the
// status, and the schema holds it to the runs.
//
// The bounds are literals. A change to this shape, or to anything a stored run is worked out from or judged
// against (a disturbance's portions, what a tube shows at a stage, a right answer, the choices, the order of the
// disturbances), needs the Le Chatelier entry's version raised (src/lechatelier-version.test.ts).

/** The most runs of a system, and the most things done in one run, that a record holds. Either is far more than a learner needs; each keeps a stored record small. */
export const MAX_RUNS = 200
export const MAX_EVENTS = 500

const text = z.string().min(1).max(40)
const bare = <T extends string>(t: T) => z.strictObject({ t: z.literal(t) })
const eventSchema = z.union([
  z.strictObject({ t: z.literal('predict'), way: z.enum(WAYS) }),
  bare('act'),
  z.strictObject({ t: z.literal('look'), at: z.enum(LOOKS) }),
  z.strictObject({ t: z.literal('observe'), solid: text, liquid: text }),
  z.strictObject({ t: z.literal('answer'), is: text }),
  bare('check'),
])

const runSchema = z.strictObject({
  /** 0 for the first run of its system. */
  index: z.number().int().min(0),
  /** What was done in the run, in order. */
  events: z.array(eventSchema).max(MAX_EVENTS),
})
const runsSchema = z.array(runSchema).min(1).max(MAX_RUNS)

const stateSchema = z.strictObject({
  mode: z.enum(['guided', 'challenge']),
  status: z.enum(['in-progress', 'completed']),
  /** Every run of each system in order; the last is the current one. */
  systems: z.strictObject({ 'lead-chloride': runsSchema, 'methyl-violet': runsSchema, cobalt: runsSchema, hydroxides: runsSchema }),
})

export type Run = z.infer<typeof runSchema>
export type LechatelierState = z.infer<typeof stateSchema>
export type Mode = LechatelierState['mode']

export const newRun = (index: number): Run => ({ index, events: [] })

/** A lab that has just been started. */
export function createLab(mode: Mode): LechatelierState {
  return { mode, status: 'in-progress', systems: { 'lead-chloride': [newRun(0)], 'methyl-violet': [newRun(0)], cobalt: [newRun(0)], hydroxides: [newRun(0)] } }
}

/** A system of the model by its id. */
export function systemModel(m: LechatelierModel, systemId: SystemId): SystemModel {
  const system = m.systems.find((s) => s.id === systemId)
  if (!system) throw new Error(`the model has no system "${systemId}"`)
  return system
}

export const currentRun = (state: LechatelierState, systemId: SystemId): Run => state.systems[systemId][state.systems[systemId].length - 1]!

// A stored run is never changed in place: the reducer makes a new one for every action. So what a run works out to
// is kept beside the run itself for as long as the run is, and a page that asks about one run many times works it
// out once. What is kept depends on nothing but its arguments, which are kept with it and compared.
const workedOut = new WeakMap<Run, { m: LechatelierModel; systemId: SystemId; state: RunState }>()

/** A stored run worked out: which disturbance it has reached and what was entered at each. Throws on a run the schema would have refused. */
export function runStateOf(m: LechatelierModel, systemId: SystemId, run: Run): RunState {
  const kept = workedOut.get(run)
  if (kept !== undefined && kept.m === m && kept.systemId === systemId) return kept.state
  const state = replay(m, systemModel(m, systemId), run.events as RunEvent[])
  if (state === null) throw new Error(`the stored run ${run.index} of the system "${systemId}" is not one the lab could have made`)
  workedOut.set(run, { m, systemId, state })
  return state
}

/** Why a run does not count; empty when it counts; null while it has not been checked. */
export const judge = (m: LechatelierModel, systemId: SystemId, run: Run): Reason[] | null => reasonsOf(systemModel(m, systemId), runStateOf(m, systemId, run))

export const runCounts = (m: LechatelierModel, systemId: SystemId, run: Run): boolean => judge(m, systemId, run)?.length === 0

/** A system counts when one of its runs does (spec 18.3). */
export const systemDone = (m: LechatelierModel, state: Pick<LechatelierState, 'systems'>, systemId: SystemId): boolean => state.systems[systemId].some((run) => runCounts(m, systemId, run))

/** The status the runs give: completed when all four systems count. */
export const statusOf = (m: LechatelierModel, state: Pick<LechatelierState, 'systems'>): LechatelierState['status'] => (SYSTEM_IDS.every((systemId) => systemDone(m, state, systemId)) ? 'completed' : 'in-progress')

/**
 * The stored shape, held to the model it is read with: a run's index is its place in the list, every run is a list
 * of things that could have been done in that order and none that changes nothing, and the status is the one the
 * runs give. A run left unfinished behind a later one is as the reducer leaves it: working a system again abandons
 * the run before.
 */
export const lechatelierStateSchema = (m: LechatelierModel): z.ZodType<LechatelierState> =>
  stateSchema.superRefine((state, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message })
    let sound = true
    for (const systemId of SYSTEM_IDS) {
      state.systems[systemId].forEach((run, place) => {
        if (run.index !== place) {
          sound = false
          return issue(['systems', systemId, place, 'index'], "a run's index is its place in the list")
        }
        if (replay(m, systemModel(m, systemId), run.events as RunEvent[]) === null) {
          sound = false
          issue(['systems', systemId, place, 'events'], 'not a list of things that could have been done in this order')
        }
      })
    }
    if (sound && state.status !== statusOf(m, state)) issue(['status'], 'the status is not the one the runs give')
  })
