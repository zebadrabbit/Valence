import { describe, expect, it } from 'vitest'
import { labSetup, scatterOf } from '../kinetics/setup'
import { PINNED_MODEL as m } from './pinnedModel'

// What the seed fixes (spec 19.4): the room's temperature, each bath's, and a small scatter in each time.

const SEEDS = Array.from({ length: 100 }, (_, i) => i + 1)

describe('what the seed fixes for the lab', () => {
  it('is the same for the same seed, and pinned for seed 1', () => {
    expect(labSetup(m, 1)).toEqual({ roomTenths: 225, bathTenths: { ice: 5, cool: 101, warm: 420 } })
    expect(labSetup(m, 1)).toEqual(labSetup(m, 1))
    expect(labSetup(m, 2)).toEqual({ roomTenths: 230, bathTenths: { ice: 10, cool: 95, warm: 402 } })
  })

  it('stays inside the ranges of the model at every seed, and reaches across them', () => {
    const setups = SEEDS.map((seed) => labSetup(m, seed))
    const span = (values: number[]) => [Math.min(...values), Math.max(...values)]
    expect(span(setups.map((s) => s.roomTenths))).toEqual([200, 240])
    expect(span(setups.map((s) => s.bathTenths.ice!))).toEqual([5, 20])
    expect(span(setups.map((s) => s.bathTenths.cool!))).toEqual([90, 110])
    expect(span(setups.map((s) => s.bathTenths.warm!))).toEqual([380, 420])
    expect(new Set(setups.map((s) => JSON.stringify(s))).size).toBeGreaterThan(95)
  })
})

describe('the scatter in a time', () => {
  it('is pinned for seed 1: one figure for each run, and another set for each further attempt', () => {
    expect(m.runs.map((run) => scatterOf(m, 1, run.id, 0))).toEqual([94, -44, 23, 44, -15, 99, -9, -2])
    expect(m.runs.map((run) => scatterOf(m, 1, run.id, 1))).toEqual([-73, -19, -51, -69, -2, -87, -21, 54])
  })

  it('is never more than one part in a hundred either way, and reaches both ends', () => {
    const all = SEEDS.flatMap((seed) => m.runs.flatMap((run) => [0, 1, 2].map((attempt) => scatterOf(m, seed, run.id, attempt))))
    expect(Math.min(...all)).toBe(-100)
    expect(Math.max(...all)).toBe(100)
    expect(all.every(Number.isInteger)).toBe(true)
  })

  it('depends on the seed, the run and the attempt and on nothing else, and is not asked of a run the model lacks', () => {
    expect(scatterOf(m, 7, 'bath-warm', 3)).toBe(scatterOf(m, 7, 'bath-warm', 3))
    expect(new Set(SEEDS.map((seed) => scatterOf(m, seed, 'mixture-4', 0))).size).toBeGreaterThan(50)
    expect(() => scatterOf(m, 1, 'mixture-9', 0)).toThrow(/no run "mixture-9"/)
  })
})
