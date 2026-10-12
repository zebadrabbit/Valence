import { SALT_IDS, type SaltId } from '@/chem-data/hotcold/data'
import { mulberry32 } from '../rng'
import type { HotcoldModel } from './model'

/** What the seed fixes for one run of a salt. Each can be read on the bench: the logger's level line, and the balance. */
export interface RunSetup {
  /** The temperature the cup, the salt and the room start at, in tenths of a degree. */
  startTenths: number
  /** The salt weighed out, in hundredths of a gram. */
  saltCg: number
}

/** A whole number from lo to hi, each equally likely, from a draw in [0, 1). */
const pick = (u: number, [lo, hi]: readonly [number, number]) => lo + Math.floor(u * (hi - lo + 1))

// One stream per seed, read in a fixed order: for each run index, the start and the mass of Epsom salt's run, then
// the start and the mass of calcium chloride's. Every seeded value in the lab depends on this order; changing it
// changes every lab.
const SALT_DRAWS = 2

/** Run `index` (from 0) of a salt. It takes no state, so it cannot depend on what the learner did before, or on which salt was run first. */
export function runSetup(m: HotcoldModel, seed: number, salt: SaltId, index: number): RunSetup {
  const rng = mulberry32(seed)
  for (let skip = 0; skip < SALT_DRAWS * (SALT_IDS.length * index + SALT_IDS.indexOf(salt)); skip++) rng()
  const startTenths = pick(rng(), m.startRangeTenths)
  return { startTenths, saltCg: pick(rng(), m.salts[salt].rangeCg) }
}
