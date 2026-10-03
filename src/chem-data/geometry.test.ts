import { describe, expect, it } from 'vitest'
import { angleDeg, dihedralDeg, distance, type Vec3 } from './geometry'

const origin: Vec3 = [0, 0, 0]

describe('distance', () => {
  it('measures a 3-4-12 box diagonal', () => {
    expect(distance(origin, [3, 4, 12])).toBeCloseTo(13, 12)
  })
})

describe('angleDeg', () => {
  it('measures a right angle', () => {
    expect(angleDeg([2, 0, 0], origin, [0, 3, 0])).toBeCloseTo(90, 10)
  })

  it('measures the tetrahedral angle', () => {
    expect(angleDeg([1, 1, 1], origin, [1, -1, -1])).toBeCloseTo(109.47, 2)
  })

  it('measures a straight line as 180', () => {
    expect(angleDeg([1, 0, 0], origin, [-2, 0, 0])).toBeCloseTo(180, 10)
  })
})

describe('dihedralDeg', () => {
  const b: Vec3 = [0, 0, 0]
  const c: Vec3 = [0, 0, 1]
  const a: Vec3 = [1, 0, 0]
  const at = (degrees: number): Vec3 => {
    const r = (degrees * Math.PI) / 180
    return [Math.cos(r), Math.sin(r), 1]
  }

  it('measures an anti arrangement as 180', () => {
    expect(Math.abs(dihedralDeg(a, b, c, at(180)))).toBeCloseTo(180, 10)
  })

  it('measures a gauche arrangement as 60, with a sign', () => {
    expect(dihedralDeg(a, b, c, at(60))).toBeCloseTo(60, 10)
    expect(dihedralDeg(a, b, c, at(-60))).toBeCloseTo(-60, 10)
  })

  it('gives the same value read from either end', () => {
    expect(dihedralDeg(at(60), c, b, a)).toBeCloseTo(60, 10)
  })

  it('reproduces the cited H-O-O-H dihedral of hydrogen peroxide (119.8)', () => {
    // Coordinates from the experimental geometry research data (NIST CCCBDB values).
    const o1: Vec3 = [-0.028139, 0, 0.7375]
    const o2: Vec3 = [-0.028139, 0, -0.7375]
    const h1: Vec3 = [0.446625, 0.819011, 0.816994]
    const h2: Vec3 = [0.446625, -0.819011, -0.816994]
    expect(dihedralDeg(h1, o1, o2, h2)).toBeCloseTo(119.8, 1)
    expect(angleDeg(h1, o1, o2)).toBeCloseTo(94.8, 1)
    expect(distance(o1, o2)).toBeCloseTo(1.475, 3)
  })
})
