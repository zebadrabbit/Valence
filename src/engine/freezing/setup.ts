import type { PartId } from '@/chem-data/freezing/data'
import { mulberry32 } from '../rng'
import type { FreezingModel } from './model'

/** What the seed fixes for the whole lab: which of the liquids the unknown is, by its place among them, hidden until a run of part 2 counts; and how far the probe is off, in hundredths of a degree, which part 1 finds. */
export interface LabSetup {
  liquidIndex: number
  probeHundredths: number
}

/** What the seed fixes for one run of a part. Each can be read on the bench or on the logger: the first reading, and the balance. */
export interface RunSetup {
  /** The first reading of the logger, in hundredths of a degree above the probe's own freezing point of water. */
  startHundredths: number
  /** The water put in the cup with the ice, in hundredths of a gram. It is not weighed: the solution is, at the end. */
  waterCg: number
  /** Part 2: the unknown liquid weighed out, in hundredths of a gram. */
  unknownCg: number
  /** Part 3: what is weighed out of each solute, by its id, in hundredths of a gram. */
  soluteCg: Readonly<Record<string, number>>
}

/** A whole number from lo to hi, each equally likely, from a draw in [0, 1). */
const pick = (u: number, [lo, hi]: readonly [number, number]) => lo + Math.floor(u * (hi - lo + 1))

// One stream per seed, read in a fixed order: three draws for the lab (the liquid, the side the probe is off to,
// how far), then for each run index the start and the water of each part in turn, the unknown's mass, and the mass
// of each solute of part 3 in the model's order. Every seeded value in the lab depends on this order; changing it
// changes every lab.
const LAB_DRAWS = 3
const PARTS: readonly PartId[] = ['water', 'unknown', 'particles']

export function labSetup(m: FreezingModel, seed: number): LabSetup {
  const rng = mulberry32(seed)
  const liquidIndex = pick(rng(), [0, m.liquids.length - 1])
  const sign = rng() < 0.5 ? -1 : 1
  return { liquidIndex, probeHundredths: sign * pick(rng(), m.probeOffRangeHundredths) }
}

/** Run `index` (from 0) of a part. It takes no state, so it cannot depend on what the learner did before. */
export function runSetup(m: FreezingModel, seed: number, part: PartId, index: number): RunSetup {
  const rng = mulberry32(seed)
  const draws = 2 * PARTS.length + 1 + m.solutes.length
  for (let skip = 0; skip < LAB_DRAWS + draws * index; skip++) rng()
  const cups = PARTS.map(() => ({ startHundredths: pick(rng(), m.startRangeHundredths), waterCg: pick(rng(), m.waterRangeCg) }))
  const unknownCg = pick(rng(), m.unknownRangeCg)
  const soluteCg = Object.fromEntries(m.solutes.map((solute) => [solute.id, pick(rng(), m.soluteRangesCg[solute.id]!)]))
  return { ...cups[PARTS.indexOf(part)]!, unknownCg, soluteCg }
}
