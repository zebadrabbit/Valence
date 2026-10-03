import { describe, expect, it } from 'vitest'
import { mulberry32, uniform } from './rng'

describe('mulberry32', () => {
  it('produces the pinned sequence for seed 1', () => {
    const rng = mulberry32(1)
    expect([rng(), rng(), rng()]).toEqual([0.6270739405881613, 0.002735721180215478, 0.5274470399599522])
  })

  it('gives the same sequence for the same seed', () => {
    const a = mulberry32(12345)
    const b = mulberry32(12345)
    for (let i = 0; i < 100; i++) expect(a()).toBe(b())
  })

  it('gives different sequences for different seeds', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)())
  })

  it('stays in [0, 1)', () => {
    const rng = mulberry32(99)
    for (let i = 0; i < 10_000; i++) {
      const x = rng()
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(1)
    }
  })

  it('treats the seed as an unsigned 32-bit integer', () => {
    expect(mulberry32(-1)()).toBe(mulberry32(0xffffffff)())
    expect(mulberry32(Number.NaN)()).toBe(mulberry32(0)())
  })
})

describe('uniform', () => {
  it('stays inside the requested range', () => {
    const rng = mulberry32(7)
    for (let i = 0; i < 1000; i++) {
      const x = uniform(rng, -0.03, 0.03)
      expect(x).toBeGreaterThanOrEqual(-0.03)
      expect(x).toBeLessThan(0.03)
    }
  })
})
