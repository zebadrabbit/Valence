import type { PartId } from '@/chem-data/calorimetry/data'
import { mulberry32 } from '../rng'
import type { CalorimetryModel } from './model'

/** What the seed fixes for the whole lab: which of the candidates the piece of metal is, by its place among them. Hidden until a run of part 3 counts. */
export interface LabSetup {
  metalIndex: number
}

/** What the seed fixes for one run of a part. Each can be read on the bench: the logger's level line, the balance, the bath's thermometer. */
export interface RunSetup {
  /** The temperature the cup, what goes into it and the room start at, in tenths of a degree. */
  startTenths: number
  /** Part 2: the ammonium nitrate weighed out, in hundredths of a gram. */
  saltCg: number
  /** Part 3: the piece of metal, in hundredths of a gram, and the boiling water it is heated in, in tenths of a degree. */
  metalCg: number
  bathTenths: number
}

/** A whole number from lo to hi, each equally likely, from a draw in [0, 1). */
const pick = (u: number, [lo, hi]: readonly [number, number]) => lo + Math.floor(u * (hi - lo + 1))

// One stream per seed, read in a fixed order: draw 1 the metal, then six for each run index (the start of part 1,
// the start and the salt of part 2, the start, the piece and the bath of part 3). Every seeded value in the lab
// depends on this order; changing it changes every lab.
const LAB_DRAWS = 1
const RUN_DRAWS = 6

export function labSetup(m: CalorimetryModel, seed: number): LabSetup {
  return { metalIndex: pick(mulberry32(seed)(), [0, m.candidates.length - 1]) }
}

/** Run `index` (from 0) of a part. It takes no state, so it cannot depend on what the learner did before. */
export function runSetup(m: CalorimetryModel, seed: number, part: PartId, index: number): RunSetup {
  const rng = mulberry32(seed)
  for (let skip = 0; skip < LAB_DRAWS + RUN_DRAWS * index; skip++) rng()
  const starts = { neutralisation: pick(rng(), m.startRangeTenths), dissolving: pick(rng(), m.startRangeTenths), metal: 0 }
  const saltCg = pick(rng(), m.saltRangeCg)
  starts.metal = pick(rng(), m.startRangeTenths)
  const metalCg = pick(rng(), m.metalRangeCg)
  const bathTenths = pick(rng(), m.bathRangeTenths)
  return { startTenths: starts[part], saltCg, metalCg, bathTenths }
}
