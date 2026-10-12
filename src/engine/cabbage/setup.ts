import type { ThingId } from '@/chem-data/cabbage/data'
import { mulberry32 } from '../rng'
import type { CabbageModel } from './model'

/** What the seed fixes for a lab: the pH of each household thing, in tenths, as a rinsed probe reads it. Hidden until the meter is read. */
export type LabSetup = Readonly<Record<ThingId, number>>

/** A whole number from lo to hi, each equally likely, from a draw in [0, 1). */
const pick = (u: number, lo: number, hi: number) => lo + Math.floor(u * (hi - lo + 1))

// One stream per seed, read in the order of the model's things, one draw for each. Every seeded value in the lab
// depends on this order; changing it, or the order of the things, changes every lab.
const kept = new WeakMap<CabbageModel, Map<number, LabSetup>>()

/** The pH of every thing for a seed, each inside its range (spec 21.3). It takes no state, so nothing the learner does can move it. */
export function labSetup(m: CabbageModel, seed: number): LabSetup {
  let bySeed = kept.get(m)
  if (!bySeed) kept.set(m, (bySeed = new Map()))
  let setup = bySeed.get(seed)
  if (!setup) {
    const rng = mulberry32(seed)
    setup = Object.fromEntries(m.things.map((thing) => [thing.id, pick(rng(), thing.lowTenths, thing.highTenths)])) as LabSetup
    // ponytail: one seed is kept at a time for a model; a page works with one lab.
    bySeed.clear()
    bySeed.set(seed, setup)
  }
  return setup
}

/**
 * What the meter reads in a thing. From a rinsed probe, the thing's pH. From a probe last in another thing and not
 * rinsed since, that pH moved the model's share of the way toward the other thing's, to the nearest tenth, a half
 * going away from the thing's own pH. The share is the model's own (spec 21.3).
 */
export function readingTenths(m: CabbageModel, setup: LabSetup, thingId: ThingId, lastIn: ThingId | null): number {
  const own = setup[thingId]
  if (lastIn === null) return own
  const gap = setup[lastIn] - own
  return own + Math.sign(gap) * Math.floor((Math.abs(gap) * m.unrinsedSharePercent + 50) / 100)
}
