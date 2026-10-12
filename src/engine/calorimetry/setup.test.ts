import { describe, expect, it } from 'vitest'
import { PART_IDS } from '@/chem-data/calorimetry/data'
import { PINNED_MODEL as m } from './pinnedModel'
import { labSetup, runSetup } from './setup'

describe('what the seed fixes', () => {
  it('pins seed 1: the metal, and the first run of each part', () => {
    expect(labSetup(m, 1)).toEqual({ metalIndex: 2 })
    expect(PART_IDS.map((part) => runSetup(m, 1, part, 0))).toEqual([
      { startTenths: 200, saltCg: 420, metalCg: 4912, bathTenths: 996 },
      { startTenths: 221, saltCg: 420, metalCg: 4912, bathTenths: 996 },
      { startTenths: 239, saltCg: 420, metalCg: 4912, bathTenths: 996 },
    ])
    expect(runSetup(m, 1, 'metal', 1)).toEqual({ startTenths: 218, saltCg: 420, metalCg: 4996, bathTenths: 991 })
  })

  it('pins seeds 2, 11 and the largest seed', () => {
    expect([labSetup(m, 2), runSetup(m, 2, 'dissolving', 0), runSetup(m, 2, 'metal', 1)]).toEqual([{ metalIndex: 2 }, { startTenths: 211, saltCg: 402, metalCg: 5052, bathTenths: 995 }, { startTenths: 232, saltCg: 384, metalCg: 4880, bathTenths: 994 }])
    expect([labSetup(m, 11), runSetup(m, 11, 'neutralisation', 0)]).toEqual([{ metalIndex: 2 }, { startTenths: 221, saltCg: 404, metalCg: 5015, bathTenths: 990 }])
    expect([labSetup(m, 4294967295), runSetup(m, 4294967295, 'metal', 0)]).toEqual([{ metalIndex: 3 }, { startTenths: 234, saltCg: 418, metalCg: 5016, bathTenths: 997 }])
  })

  it('gives each of the four metals to some of seeds 1 to 100', () => {
    const counts = [0, 0, 0, 0]
    for (let seed = 1; seed <= 100; seed++) counts[labSetup(m, seed).metalIndex]!++
    expect(counts).toEqual([28, 22, 32, 18])
  })

  it('reaches both ends of each range over seeds 1 to 20 000, and nothing outside them', () => {
    const seen = { start: new Set<number>(), salt: new Set<number>(), metal: new Set<number>(), bath: new Set<number>(), which: new Set<number>() }
    for (let seed = 1; seed <= 20000; seed++) {
      const run = runSetup(m, seed, 'metal', 0)
      seen.start.add(run.startTenths)
      seen.salt.add(run.saltCg)
      seen.metal.add(run.metalCg)
      seen.bath.add(run.bathTenths)
      seen.which.add(labSetup(m, seed).metalIndex)
    }
    const ends = (set: Set<number>) => [Math.min(...set), Math.max(...set)]
    expect(ends(seen.start)).toEqual([...m.startRangeTenths])
    expect(ends(seen.salt)).toEqual([...m.saltRangeCg])
    expect(ends(seen.metal)).toEqual([...m.metalRangeCg])
    expect(ends(seen.bath)).toEqual([...m.bathRangeTenths])
    expect([...seen.which].sort()).toEqual([0, 1, 2, 3])
  }, 60_000)

  it("gives a run numbers that do not depend on the runs before it, and each run of a part numbers of its own", () => {
    // It takes the seed, the part and the index and no state.
    expect(runSetup(m, 7, 'dissolving', 3)).toEqual(runSetup(m, 7, 'dissolving', 3))
    const five = [0, 1, 2, 3, 4].map((index) => runSetup(m, 7, 'dissolving', index))
    expect(new Set(five.map((run) => `${run.startTenths} ${run.saltCg}`)).size).toBe(5)
    // The metal is the lab's: the same piece of unknown, whatever the run.
    expect(labSetup(m, 7)).toEqual(labSetup(m, 7))
  })
})
