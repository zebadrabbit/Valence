import { z } from 'zod'

// The lab as plain data. The stored shape and the type are one definition, so they cannot drift: this is the whole
// record saved for the lab. It holds the seed, what the learner did and what the learner typed, all as whole numbers,
// booleans and short strings, so a round trip through JSON gives back the same value. Anything the seed fixes (the
// label, the NaOH concentration, each trial's pipette delivery and fill level) and anything judged (pass or fail,
// percent error, causes, the plume) is worked out on reading and stored nowhere.
//
// The bounds are literals, and a test holds them to the model's values. A change to this shape, or to a value the
// model judges with, needs the titration entry's version raised (src/titration-version.test.ts).

const count = z.number().int().min(0)

const trialSchema = z.strictObject({
  /** 0 for the first trial. With the seed it fixes this trial's pipette delivery and fill level. */
  index: count,
  /** What the pipette put in the flask: nothing yet, a clean aliquot, or one diluted by a pipette wet with water. */
  aliquot: z.enum(['none', 'clean', 'diluted']),
  indicatorDrops: count.max(3),
  waterUl: count.max(30000),
  /** Whether the titrant run into this flask was diluted by an unconditioned burette. */
  titrantDiluted: z.boolean(),
  /** The true meniscus when the initial reading was taken, and the reading the learner typed; microlitres. */
  startLevelUl: count.nullable(),
  initialReadingUl: count.nullable(),
  /** Titrant actually run into the flask. */
  deliveredUl: count,
  /** Size of the last addition of titrant, for the plume; 0 before the first, and after a wash of water, which leaves none. */
  lastAdditionUl: count,
  /** Simulated seconds of swirling since the flask last changed. */
  waitedS: count,
  /** The true meniscus when the final reading was taken, or when the trial ended without one, and the reading typed. */
  endLevelUl: count.nullable(),
  finalReadingUl: count.nullable(),
  /** The HCl molarity in the notebook when the trial was graded, and the molarity the learner typed; x 1 000 000. */
  hclUsedE6: count.nullable(),
  molarityE6: count.nullable(),
  end: z.enum(['open', 'graded', 'overshot', 'ran-out', 'discarded']),
})

const stateSchema = z.strictObject({
  seed: count.max(4294967295),
  mode: z.enum(['guided', 'challenge']),
  status: z.enum(['in-progress', 'completed']),
  /** The HCl molarity as the learner typed it, x 1 000 000. */
  hclRecordedE6: count.nullable(),
  /** False while the pipette is still wet with water. */
  pipetteRinsed: z.boolean(),
  burette: z.strictObject({
    conditioned: z.boolean(),
    /** False until the first fill, and again after conditioning, which leaves the burette empty. */
    filled: z.boolean(),
    /** The titrant in it is dilute: it was filled without conditioning, and has not been conditioned since. */
    diluted: z.boolean(),
    /** The true meniscus, microlitres below the 0.00 mark. */
    levelUl: count.max(50000),
    /** Air still in the tip. */
    tipAirUl: count.max(600),
  }),
  /** Every trial in order; the last one is the current trial. */
  trials: z.array(trialSchema).min(1),
  /** The learner's own average (x 1 000 000) and relative deviation (hundredths of a part per thousand). */
  summary: z.strictObject({ meanE6: count, deviationE2: count }).nullable(),
})

export type Trial = z.infer<typeof trialSchema>
export type TitrationState = z.infer<typeof stateSchema>
export type Mode = TitrationState['mode']

// A trial's seeded values are found by stepping the seed's stream forward by its index, so an index that is not
// the trial's place in the list (a hand-edited 1e12, say) would hang the page on load.
export const titrationStateSchema: z.ZodType<TitrationState> = stateSchema.superRefine((state, ctx) => {
  state.trials.forEach((trial, place) => {
    if (trial.index !== place) ctx.addIssue({ code: 'custom', path: ['trials', place, 'index'], message: "a trial's index is its place in the list" })
  })
})

export const newTrial = (index: number): Trial => ({
  index,
  aliquot: 'none',
  indicatorDrops: 0,
  waterUl: 0,
  titrantDiluted: false,
  startLevelUl: null,
  initialReadingUl: null,
  deliveredUl: 0,
  lastAdditionUl: 0,
  waitedS: 0,
  endLevelUl: null,
  finalReadingUl: null,
  hclUsedE6: null,
  molarityE6: null,
  end: 'open',
})

/** A lab that has just been started. The seed is drawn in app/; the engine never makes one. */
export function createLab(seed: number, mode: Mode): TitrationState {
  return {
    seed: seed >>> 0,
    mode,
    status: 'in-progress',
    hclRecordedE6: null,
    pipetteRinsed: false,
    burette: { conditioned: false, filled: false, diluted: false, levelUl: 0, tipAirUl: 0 },
    trials: [newTrial(0)],
    summary: null,
  }
}

export const currentTrial = (state: TitrationState): Trial => state.trials[state.trials.length - 1]!
