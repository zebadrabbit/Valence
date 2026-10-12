import { z } from 'zod'
import { ION_IDS, PART_IDS, type PartId } from '@/chem-data/cations/data'
import type { CationsModel } from './model'
import { LOOKS, reasonsOf, replay, type Reason, type RunEvent, type RunState } from './run'
import { sampleOf } from './setup'

// The lab as plain data: the whole record saved for it. It holds the seed and, for each run of each part, the
// list of things the learner did in it, as short strings, so a round trip through JSON gives back the same value.
// Which ions a sample holds, what each tube holds and shows, which step a run has reached, whether an observation
// is right, whether a run counts and why not: all of it is worked out on reading and stored nowhere, so a stored
// record cannot disagree with its seed or with itself, and holds nothing that says what an unknown is. The one
// stored judgement is the status, and the schema holds it to the runs.
//
// The bounds are literals. A change to this shape, or to anything a stored run is worked out from or judged
// against (the draw of the unknowns, a rule of tube.ts, the order of a step, the bench's amounts, the looks, the
// choices, the flow chart), needs the cations entry's version raised (src/cations-version.test.ts).

/** The most runs of a part, and the most things done in one run, that a record holds. Either is far more than a learner needs; each keeps a stored record small. */
export const MAX_RUNS = 200
export const MAX_EVENTS = 500

const text = z.string().min(1).max(40)
const bare = <T extends string>(t: T) => z.strictObject({ t: z.literal(t) })
const eventSchema = z.union([
  bare('add'),
  bare('heat'),
  bare('spin'),
  bare('litmus'),
  bare('check'),
  bare('pour'),
  z.strictObject({ t: z.literal('look'), at: z.enum(LOOKS) }),
  z.strictObject({ t: z.literal('observe'), solid: text, liquid: text }),
  z.strictObject({ t: z.literal('place'), place: text, tile: text }),
  z.strictObject({ t: z.literal('unplace'), place: text, tile: text }),
  z.strictObject({ t: z.literal('name'), ions: z.array(z.enum(ION_IDS)).max(ION_IDS.length) }),
])

const runSchema = z.strictObject({
  /** 0 for the first run of its part. With the seed it fixes which ions an unknown holds. */
  index: z.number().int().min(0),
  /** What was done in the run, in order. */
  events: z.array(eventSchema).max(MAX_EVENTS),
})

const stateSchema = z.strictObject({
  seed: z.number().int().min(0).max(4294967295),
  mode: z.enum(['guided', 'challenge']),
  status: z.enum(['in-progress', 'completed']),
  /** Every run of each part in order; the last is the current one. */
  parts: z.strictObject({ known: z.array(runSchema).min(1).max(MAX_RUNS), unknown: z.array(runSchema).min(1).max(MAX_RUNS) }),
})

export type Run = z.infer<typeof runSchema>
export type CationsState = z.infer<typeof stateSchema>
export type Mode = CationsState['mode']

export const newRun = (index: number): Run => ({ index, events: [] })

/** A lab that has just been started. The seed is drawn in app/; the engine never makes one. */
export function createLab(seed: number, mode: Mode): CationsState {
  return { seed: seed >>> 0, mode, status: 'in-progress', parts: { known: [newRun(0)], unknown: [newRun(0)] } }
}

export const currentRun = (state: CationsState, part: PartId): Run => state.parts[part][state.parts[part].length - 1]!

// A stored run is never changed in place: the reducer makes a new one for every action. So what a run works out to
// is kept beside the run itself for as long as the run is, and a page that asks about one run many times works it
// out once. What is kept depends on nothing but its arguments, which are kept with it and compared.
const workedOut = new WeakMap<Run, { m: CationsModel; seed: number; part: PartId; state: RunState }>()

/** A stored run worked out: what its tubes hold and how far it has come. Throws on a run the schema would have refused. */
export function runStateOf(m: CationsModel, seed: number, part: PartId, run: Run): RunState {
  const kept = workedOut.get(run)
  if (kept !== undefined && kept.m === m && kept.seed === seed && kept.part === part) return kept.state
  const state = replay(m, part, sampleOf(seed, part, run.index), run.events as RunEvent[])
  if (state === null) throw new Error(`the stored run ${run.index} of part "${part}" is not one the lab could have made`)
  workedOut.set(run, { m, seed, part, state })
  return state
}

/** Why a run does not count; empty when it counts; null while it is not over. */
export const judge = (m: CationsModel, seed: number, part: PartId, run: Run): Reason[] | null => reasonsOf(m, part, sampleOf(seed, part, run.index), runStateOf(m, seed, part, run))

export const runCounts = (m: CationsModel, seed: number, part: PartId, run: Run): boolean => judge(m, seed, part, run)?.length === 0

/** A part is done when one of its runs counts (spec 17.3). */
export const partDone = (m: CationsModel, state: Pick<CationsState, 'seed' | 'parts'>, part: PartId): boolean => state.parts[part].some((run) => runCounts(m, state.seed, part, run))

/** The status the runs give: completed when both parts are done. */
export const statusOf = (m: CationsModel, state: Pick<CationsState, 'seed' | 'parts'>): CationsState['status'] => (PART_IDS.every((part) => partDone(m, state, part)) ? 'completed' : 'in-progress')

/**
 * The stored shape, held to the model it is read with: a run's index is its place in the list, every run is a list
 * of things that could have been done in that order and none that changes nothing, and the status is the one the
 * runs give. A run left unfinished behind a later one is as the reducer leaves it: running a part again abandons
 * the run before.
 */
export const cationsStateSchema = (m: CationsModel): z.ZodType<CationsState> =>
  stateSchema.superRefine((state, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message })
    let sound = true
    for (const part of PART_IDS) {
      state.parts[part].forEach((run, place) => {
        if (run.index !== place) {
          sound = false
          return issue(['parts', part, place, 'index'], "a run's index is its place in the list")
        }
        if (replay(m, part, sampleOf(state.seed, part, run.index), run.events as RunEvent[]) === null) {
          sound = false
          issue(['parts', part, place, 'events'], 'not a list of things that could have been done in this order')
        }
      })
    }
    if (sound && state.status !== statusOf(m, state)) issue(['status'], 'the status is not the one the runs give')
  })
