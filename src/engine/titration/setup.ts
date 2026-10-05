import { mulberry32 } from '../rng'
import type { TitrationModel } from './model'

export interface LabSetup {
  /** HCl molarity x 10 000: the label, and the true value. */
  hclE4: number
  /** True NaOH molarity x 100 000, hidden until the lab is completed. */
  naohE5: number
}

export interface TrialSetup {
  /** What the pipette delivers this trial, in microlitres. */
  aliquotUl: number
  /** The meniscus after a fill this trial, in microlitres below the 0.00 mark. */
  fillLevelUl: number
}

/** A whole number from lo to hi, each equally likely, from a draw in [0, 1). */
const pick = (u: number, lo: number, hi: number) => lo + Math.floor(u * (hi - lo + 1))

// One stream per seed, read in a fixed order: draw 1 the HCl label, draw 2 the NaOH concentration, then two per
// trial (pipette, fill level). Every seeded value in the lab depends on this order; changing it changes every lab.
const LAB_DRAWS = 2
const TRIAL_DRAWS = 2

export function labSetup(m: TitrationModel, seed: number): LabSetup {
  const rng = mulberry32(seed)
  const hclE4 = pick(rng(), m.hclRangeE4[0], m.hclRangeE4[1])
  const naohE5 = pick(rng(), m.naohRangeE5[0], m.naohRangeE5[1])
  return { hclE4, naohE5 }
}

/** Trial `index` (from 0) of a seed. It takes no state, so it cannot depend on what the learner did before. */
export function trialSetup(m: TitrationModel, seed: number, index: number): TrialSetup {
  const rng = mulberry32(seed)
  for (let skip = 0; skip < LAB_DRAWS + TRIAL_DRAWS * index; skip++) rng()
  const aliquotUl = m.pipetteNominalUl + pick(rng(), -m.pipetteOffsetUl, m.pipetteOffsetUl)
  const fillLevelUl = pick(rng(), 0, m.fillLevelMaxUl)
  return { aliquotUl, fillLevelUl }
}
