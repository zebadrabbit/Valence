import { mulberry32 } from '../rng'
import type { KineticsModel } from './model'

/** What the seed fixes for the whole lab: the room's temperature and each bath's, in tenths of a degree. Each is read on a thermometer. */
export interface LabSetup {
  roomTenths: number
  bathTenths: Record<string, number>
}

/** A whole number from lo to hi, each equally likely, from a draw in [0, 1). */
const pick = (u: number, [lo, hi]: readonly [number, number]) => lo + Math.floor(u * (hi - lo + 1))

// One stream per seed, read in a fixed order: draw 1 the room, then one for each bath in the model's order, then,
// for each attempt index, one for each run in the model's order: that attempt's scatter. Every seeded value in
// the lab depends on this order; changing it changes every lab.

export function labSetup(m: KineticsModel, seed: number): LabSetup {
  const rng = mulberry32(seed)
  const roomTenths = pick(rng(), m.roomRangeTenths)
  return { roomTenths, bathTenths: Object.fromEntries(m.baths.map((bath) => [bath.id, pick(rng(), bath.rangeTenths)])) }
}

/**
 * How far the seed moves the time of attempt `attempt` (from 0) of a run, in parts in ten thousand, either way. It
 * takes no state, so it cannot depend on what the learner did before. Hidden: a learner sees only the time.
 */
export function scatterOf(m: KineticsModel, seed: number, runId: string, attempt: number): number {
  const place = m.runs.findIndex((run) => run.id === runId)
  if (place < 0) throw new Error(`no run "${runId}"`)
  const rng = mulberry32(seed)
  for (let skip = 0; skip < 1 + m.baths.length + m.runs.length * attempt + place; skip++) rng()
  return pick(rng(), [-m.scatterPerTenThousand, m.scatterPerTenThousand])
}
