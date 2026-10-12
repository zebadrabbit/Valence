import { describe, expect, it } from 'vitest'
import { hasTemperature } from '../kinetics/model'
import { sheetIdsOf } from '../kinetics/notebook'
import { leftAt, lookAt } from '../kinetics/select'
import { createLab, currentAttempt, endOf, partIdsOf, PART_IDS, type KineticsState } from '../kinetics/state'
import { makeBathRuns, makeRoomRuns, makeRun, run, wholeLab } from '../kinetics/testkit'
import { PINNED_MODEL as m } from './pinnedModel'

// What the engine gained for the iodination of acetone (spec 20.4) gives nothing of the clock reaction away, and
// leaves this lab as it was: how much thiosulfate is left is never said, since nobody sees it go and the figure
// would say when the blue will come; and the lab keeps its three parts and its two sheets.

describe('how much of what is used up is left, asked of the clock reaction', () => {
  const nothing = (state: KineticsState, where: string) => {
    for (const { id } of m.runs) for (const at of [-1, 0, 1, 1000, 27000, 60000, 110000, 600000, m.watchLimitMs, m.watchLimitMs * 2]) expect(leftAt(m, state, id, at), `${where} ${id} ${at}`).toBeNull()
  }

  it('is not said at any point of a careful lab, at any time handed in', () => {
    for (const seed of [1, 2, 50, 100]) {
      let state = createLab(m, seed, 'challenge')
      nothing(state, `${seed} fresh`)
      state = run(m, state, [{ type: 'addIndicator', run: 'mixture-1' }, { type: 'pour', run: 'mixture-1' }])
      nothing(state, `${seed} watch running`)
      // The liquid still changes at the moment it always did.
      const end = endOf(m, seed, 'mixture-1', currentAttempt(state, 'mixture-1'))!
      expect([lookAt(m, state, 'mixture-1', end - 1), lookAt(m, state, 'mixture-1', end)], String(seed)).toEqual(['before', 'after'])
      state = makeBathRuns(m, makeRoomRuns(m, createLab(m, seed, 'challenge')))
      nothing(state, `${seed} timed`)
      nothing(wholeLab(m, createLab(m, seed, 'guided')), `${seed} completed`)
    }
  }, 60_000)

  it('is not said of a run that went wrong either: no starch, stopped early, stopped late', () => {
    let state = makeRun(m, createLab(m, 3, 'challenge'), 'mixture-2', { indicator: false })
    state = makeRun(m, state, 'mixture-3', { stop: { earlyMs: 5000 } })
    state = makeRun(m, state, 'mixture-4', { stop: { delayMs: 9000 } })
    nothing(state, 'gone wrong')
  })
})

describe('the parts and the sheets of the clock reaction lab', () => {
  it('are the three and the two they were', () => {
    expect(hasTemperature(m)).toBe(true)
    expect(partIdsOf(m)).toEqual([...PART_IDS])
    expect(partIdsOf(m)).toEqual(['runs', 'rate-law', 'temperature'])
    expect(sheetIdsOf(m)).toEqual(['rate-law', 'temperature'])
    expect(createLab(m, 1, 'guided').sheets.temperature).toHaveLength(1)
  })
})
