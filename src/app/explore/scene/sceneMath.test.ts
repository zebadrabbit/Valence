import { Quaternion, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { dihedralDeg, distance, type Vec3 } from '@/chem-data/geometry'
import {
  bondReach,
  bondSticks,
  boundingSphere,
  directionInFrame,
  framingDistance,
  inFrame,
  lobeProfile,
  lonePairDots,
  partialBondSticks,
  perpendicular,
  principalFrame,
  quaternionFromYAxis,
  sphereOverlap,
  type Quat,
} from './sceneMath'

/** Rotate +Y by q using Three.js itself, as the scene will. */
function rotateY(q: Quat): number[] {
  return new Vector3(0, 1, 0).applyQuaternion(new Quaternion(...q)).toArray()
}

function expectVec(actual: readonly number[], expected: readonly number[]) {
  expect(actual).toHaveLength(expected.length)
  actual.forEach((v, i) => expect(v).toBeCloseTo(expected[i] ?? NaN, 10))
}

const STYLE = { radius: 0.09, multiRadius: 0.06, spacing: 0.2 }

describe('quaternionFromYAxis', () => {
  const dirs: Vec3[] = [
    [0, 1, 0],
    [1, 0, 0],
    [0, 0, 1],
    [0, -1, 0],
    [0.6, 0, -0.8],
    [1 / Math.sqrt(3), -1 / Math.sqrt(3), 1 / Math.sqrt(3)],
  ]

  it.each(dirs)('turns +Y onto (%f, %f, %f)', (...dir) => {
    expectVec(rotateY(quaternionFromYAxis(dir)), dir)
  })

  it.each(dirs.filter((d) => d[1] !== -1))('agrees with THREE.Quaternion.setFromUnitVectors for (%f, %f, %f)', (...dir) => {
    const expected = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(...dir))
    expectVec(quaternionFromYAxis(dir), expected.toArray())
  })

  it('returns a unit quaternion', () => {
    for (const dir of dirs) expect(Math.hypot(...quaternionFromYAxis(dir))).toBeCloseTo(1, 12)
  })
})

describe('perpendicular', () => {
  it('falls back to an arbitrary perpendicular when the hint is collinear (CO2)', () => {
    const p = perpendicular([1, 0, 0], [-2, 0, 0])
    expect(Math.hypot(...p)).toBeCloseTo(1, 12)
    expect(p[0]).toBeCloseTo(0, 12)
    // In the XY plane, so the lines of a double bond lie side by side as first seen.
    expect(p[2]).toBeCloseTo(0, 12)
  })

  it('points towards the hint', () => {
    expectVec(perpendicular([1, 0, 0], [5, -3, 0]), [0, -1, 0])
  })

  it.each<Vec3>([
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ])('is a unit vector perpendicular to (%f, %f, %f) without a hint', (...axis) => {
    const p = perpendicular(axis)
    expect(Math.hypot(...p)).toBeCloseTo(1, 12)
    expect(p[0] * axis[0] + p[1] * axis[1] + p[2] * axis[2]).toBeCloseTo(0, 12)
  })
})

describe('bondSticks', () => {
  it('draws a single bond as two halves along the bond, one per atom', () => {
    const sticks = bondSticks([1, 0, 0], [1, 0, 2], 1, STYLE)
    expect(sticks.map((s) => s.end)).toEqual([0, 1])
    expectVec(sticks[0]!.position, [1, 0, 0.5])
    expectVec(sticks[1]!.position, [1, 0, 1.5])
    for (const s of sticks) {
      expect(s.length).toBeCloseTo(1, 12)
      expect(s.radius).toBe(0.09)
      expectVec(rotateY(s.quaternion), [0, 0, 1])
    }
  })

  it('splits a double bond into two lines one spacing apart, in the plane of the hint', () => {
    // C=O along x; a hydrogen on the carbon lies in the xy plane.
    const sticks = bondSticks([0, 0, 0], [1.2, 0, 0], 2, STYLE, [-0.5, 0.9, 0])
    expect(sticks).toHaveLength(4)
    expectVec(sticks[0]!.position, [0.3, -0.1, 0])
    expectVec(sticks[1]!.position, [0.9, -0.1, 0])
    expectVec(sticks[2]!.position, [0.3, 0.1, 0])
    expectVec(sticks[3]!.position, [0.9, 0.1, 0])
    for (const s of sticks) {
      expect(s.radius).toBe(0.06)
      expectVec(rotateY(s.quaternion), [1, 0, 0])
    }
  })

  it('keeps the middle line of a triple bond on the axis', () => {
    const sticks = bondSticks([0, 0, 0], [0, 0, 1.1], 3, STYLE)
    expect(sticks).toHaveLength(6)
    const offsets = sticks.map((s) => Math.hypot(s.position[0], s.position[1]))
    expectVec(offsets, [0.2, 0.2, 0, 0, 0.2, 0.2])
    // The two outer lines are on opposite sides.
    expectVec([sticks[0]!.position[0] + sticks[4]!.position[0], sticks[0]!.position[1] + sticks[4]!.position[1]], [0, 0])
  })

  it('draws an aromatic bond as a solid line and a dashed line on the side of the ring centre', () => {
    // Two neighbouring ring carbons of a hexagon centred on the origin, 1.4 from it.
    const a: Vec3 = [1.4, 0, 0]
    const b: Vec3 = [0.7, 1.4 * Math.sin(Math.PI / 3), 0]
    const sticks = bondSticks(a, b, 'aromatic', STYLE, [0, 0, 0])
    const solid = sticks.slice(0, 2)
    const dashes = sticks.slice(2)
    expect(solid.map((s) => s.radius)).toEqual([0.09, 0.09])
    expect(solid[0]!.length + solid[1]!.length).toBeCloseTo(1.4, 12)
    expect(dashes).toHaveLength(7)
    const mid: Vec3 = [1.05, 0.7 * Math.sin(Math.PI / 3), 0]
    for (const dash of dashes) {
      expect(dash.radius).toBe(0.06)
      expect(dash.length).toBeCloseTo((1.4 / 7) * 0.6, 12)
      // Each dash is nearer the ring centre than the bond axis is.
      expect(Math.hypot(...dash.position)).toBeLessThan(Math.hypot(...mid))
    }
    // Gaps: the dashes cover 60% of the bond, so this is not a second solid line.
    expect(dashes.reduce((sum, d) => sum + d.length, 0)).toBeCloseTo(1.4 * 0.6, 12)
    // The middle dash sits one spacing inside the bond midpoint.
    expect(Math.hypot(...mid) - Math.hypot(...dashes[3]!.position)).toBeCloseTo(0.2, 12)
  })

  it('throws when both atoms are at the same point', () => {
    expect(() => bondSticks([1, 1, 1], [1, 1, 1], 1, STYLE)).toThrow()
  })
})

describe('partialBondSticks', () => {
  const [a, b]: [Vec3, Vec3] = [[0, 0, 0], [0, 2, 0]]
  const hint: Vec3 = [1, 0, 0]
  /** How much of the bond's length the pieces at one offset cover, as a fraction. */
  const covered = (sticks: readonly { position: Vec3; length: number }[], x: number) => sticks.filter((s) => Math.abs(s.position[0] - x) < 1e-9).reduce((sum, s) => sum + s.length, 0) / 2

  it('draws a bond that is forming or breaking as a dashed line on the axis, thinner and more broken the less of it there is', () => {
    const [weak, half, strong] = [0.1, 0.5, 0.9].map((order) => partialBondSticks(a, b, order, STYLE, hint))
    for (const sticks of [weak!, half!, strong!]) {
      // Ten dashes for a bond of 2 Å, none of them a whole half of the bond, all on the axis.
      expect(sticks).toHaveLength(10)
      for (const stick of sticks) {
        expectVec([stick.position[0], stick.position[2]], [0, 0])
        expect(stick.length).toBeLessThan(0.2)
        expectVec(rotateY(stick.quaternion), [0, 1, 0])
      }
    }
    expect(covered(weak!, 0)).toBeLessThan(covered(half!, 0))
    expect(covered(half!, 0)).toBeLessThan(covered(strong!, 0))
    expect(weak![0]!.radius).toBeLessThan(half![0]!.radius)
    expect(strong![0]!.radius).toBeLessThan(STYLE.radius)
    // Each dash is in the half of the atom it is nearer, as the pieces of a whole bond are.
    expect(half!.map((s) => s.end)).toEqual([0, 0, 0, 0, 0, 1, 1, 1, 1, 1])
  })

  it('arrives at the whole bond without a jump: at an order just short of 1 the dashes all but fill the single line', () => {
    const almost = partialBondSticks(a, b, 0.999, STYLE, hint)
    expect(covered(almost, 0)).toBeCloseTo(1, 2)
    expect(almost[0]!.radius).toBeCloseTo(STYLE.radius, 3)
    // And a bond that has all but gone is a faint row of dashes, not nothing.
    const going = partialBondSticks(a, b, 0.001, STYLE, hint)
    expect(covered(going, 0)).toBeGreaterThan(0.2)
    expect(going[0]!.radius).toBeGreaterThan(0)
  })

  it('draws a single bond on its way to a double as a solid line and a dashed one that move apart', () => {
    const sticks = partialBondSticks(a, b, 1.5, STYLE, hint)
    const solid = sticks.filter((s) => s.length === 1)
    const dashes = sticks.filter((s) => s.length < 1)
    expect(solid).toHaveLength(2)
    expect(dashes).toHaveLength(10)
    // Half way: each line is half way from the axis to its place in a double bond, the dashed one on the hint's side.
    for (const s of solid) expect(s.position[0]).toBeCloseTo(-0.05, 10)
    for (const s of dashes) expect(s.position[0]).toBeCloseTo(0.05, 10)
    expect(solid[0]!.radius).toBeCloseTo((STYLE.radius + STYLE.multiRadius) / 2, 10)
    expect(dashes[0]!.radius).toBeLessThan(solid[0]!.radius)
  })

  it('meets the single bond at one end of that change and the double bond at the other', () => {
    const begun = partialBondSticks(a, b, 1.001, STYLE, hint)
    const single = bondSticks(a, b, 1, STYLE, hint)
    begun.filter((s) => s.length === 1).forEach((s, i) => {
      s.position.forEach((v, k) => expect(v).toBeCloseTo(single[i]!.position[k]!, 3))
      expect(s.radius).toBeCloseTo(STYLE.radius, 3)
    })
    const almost = partialBondSticks(a, b, 1.999, STYLE, hint)
    expect(almost.filter((s) => s.length === 1).every((s) => Math.abs(s.position[0] + 0.1) < 1e-3 && Math.abs(s.radius - STYLE.multiRadius) < 1e-3)).toBe(true)
    expect(covered(almost.filter((s) => s.length < 1), almost.find((s) => s.length < 1)!.position[0])).toBeCloseTo(1, 2)
    expect(almost.find((s) => s.length < 1)!.position[0]).toBeCloseTo(0.1, 3)
  })

  it('is the whole bond at a whole order', () => {
    expect(partialBondSticks(a, b, 1, STYLE, hint)).toEqual(bondSticks(a, b, 1, STYLE, hint))
    expect(partialBondSticks(a, b, 2, STYLE, hint)).toEqual(bondSticks(a, b, 2, STYLE, hint))
  })
})

describe('bondReach', () => {
  it('is the widest extent of the drawn lines from the bond axis', () => {
    expect(bondReach(1, STYLE)).toBeCloseTo(0.09, 12)
    expect(bondReach(2, STYLE)).toBeCloseTo(0.16, 12)
    expect(bondReach(3, STYLE)).toBeCloseTo(0.26, 12)
    expect(bondReach('aromatic', STYLE)).toBeCloseTo(0.26, 12)
  })
})

describe('sphereOverlap', () => {
  it('finds the circle where two equal spheres meet, half way between them', () => {
    const circle = sphereOverlap(1.6, 1, 1)
    expect(circle?.along).toBeCloseTo(0.8, 12)
    expect(circle?.radius).toBeCloseTo(0.6, 12)
  })

  it('puts the circle nearer the smaller sphere', () => {
    // Radii 1.5 and 1.0, centres 2.0 apart: 3-4-5 style check by Pythagoras.
    const circle = sphereOverlap(2, 1.5, 1)
    expect(circle!.along).toBeCloseTo(1.3125, 12)
    expect(circle!.along ** 2 + circle!.radius ** 2).toBeCloseTo(1.5 ** 2, 12)
    expect((2 - circle!.along) ** 2 + circle!.radius ** 2).toBeCloseTo(1, 12)
  })

  it('is null when the surfaces do not cross', () => {
    expect(sphereOverlap(3, 1, 1)).toBeNull()
    expect(sphereOverlap(0.2, 2, 1)).toBeNull()
    expect(sphereOverlap(0, 1, 1)).toBeNull()
  })
})

describe('principalFrame', () => {
  // A flat, lopsided shape in a tilted plane: four points spread most along one direction.
  const u: Vec3 = [0.6, 0.8, 0]
  const w: Vec3 = [0, 0, 1]
  const at = (a: number, b: number): Vec3 => [5 + a * u[0] + b * w[0], -2 + a * u[1] + b * w[1], 1 + a * u[2] + b * w[2]]
  const flat = [at(-3, 0), at(3, 0.5), at(0, 1), at(0.5, -1.5)]

  it('lays a flat shape face-on with its longest spread along x', () => {
    const frame = principalFrame(flat)
    const moved = flat.map((p) => inFrame(p, frame))
    for (const p of moved) expect(p[2]).toBeCloseTo(0, 10)
    const spread = (k: number) => moved.reduce((sum, p) => sum + p[k]! ** 2, 0)
    expect(spread(0)).toBeGreaterThan(spread(1))
    expectVec([0, 1, 2].map((k) => moved.reduce((sum, p) => sum + p[k]!, 0)), [0, 0, 0])
  })

  it('lays a linear shape along x', () => {
    const line: Vec3[] = [[1, 1, 1], [2, 2, 2], [4, 4, 4]]
    const frame = principalFrame(line)
    for (const p of line.map((q) => inFrame(q, frame))) expectVec([p[1], p[2]], [0, 0])
  })

  it('keeps distances and handedness, so a chiral molecule is not mirrored', () => {
    const twisted: Vec3[] = [[1, 0, 0], [0, 0, 0], [0, 0, 1.5], [0.4, 0.9, 2], [-2, 0.3, 0.1]]
    const frame = principalFrame(twisted)
    const moved = twisted.map((p) => inFrame(p, frame))
    expect(distance(moved[0]!, moved[3]!)).toBeCloseTo(distance(twisted[0]!, twisted[3]!), 10)
    const [a, b, c, d] = twisted as [Vec3, Vec3, Vec3, Vec3]
    const [ma, mb, mc, md] = moved as [Vec3, Vec3, Vec3, Vec3]
    expect(dihedralDeg(ma, mb, mc, md)).toBeCloseTo(dihedralDeg(a, b, c, d), 8)
    expect(dihedralDeg(a, b, c, d)).not.toBeCloseTo(0, 1)
  })

  it('leaves an evenly spread shape (an octahedron) as it is', () => {
    const octahedron: Vec3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]
    const frame = principalFrame(octahedron)
    octahedron.forEach((p) => expectVec(inFrame(p, frame), p))
  })
})

describe('camera framing', () => {
  it('bounds every atom sphere', () => {
    const s = boundingSphere([[-1, 0, 0], [3, 0, 0]], [0.5, 0.25])
    expect(s.center).toEqual([1, 0, 0])
    expect(s.radius).toBe(2.5)
    expect(() => boundingSphere([], [])).toThrow()
  })

  it('fits a sphere exactly at margin 1 on a landscape canvas', () => {
    // At distance d the sphere is tangent to the frustum when sin(fov / 2) = r / d.
    expect(framingDistance(1, 60, 16 / 9, 1)).toBeCloseTo(2, 12)
    expect(framingDistance(3, 90, 1, 1)).toBeCloseTo(3 * Math.SQRT2, 12)
  })

  it('moves back on a portrait canvas, where the horizontal view is narrower', () => {
    const landscape = framingDistance(1, 50, 1.5, 1)
    const portrait = framingDistance(1, 50, 0.5, 1)
    expect(portrait).toBeGreaterThan(landscape)
    const halfH = Math.atan(Math.tan((25 * Math.PI) / 180) * 0.5)
    expect(portrait).toBeCloseTo(1 / Math.sin(halfH), 12)
  })
})

describe('directionInFrame', () => {
  it('turns a direction with the frame and does not move it', () => {
    const frame = principalFrame([[5, 3, 5], [5, 7, 5], [5, 5, 6], [5, 5, 4]])
    // The longest spread is along world Y, so world Y reads as the frame's x.
    const turned = directionInFrame([0, 1, 0], frame)
    expect(Math.abs(turned[0])).toBeCloseTo(1, 9)
    expect(Math.hypot(...directionInFrame([0.6, 0, 0.8], frame))).toBeCloseTo(1, 12)
  })
})

describe('lobeProfile', () => {
  it('is a closed teardrop: a point at each end, widest past the middle', () => {
    const profile = lobeProfile(0.8, 0.3)
    expect(profile[0]).toEqual([0, 0])
    expect(profile.at(-1)).toEqual([0, 0.8])
    const widest = profile.reduce((best, point) => (point[0] > best[0] ? point : best))
    expect(widest[0]).toBeCloseTo(0.3, 2)
    expect(widest[1]).toBeGreaterThan(0.4)
    expect(widest[1]).toBeLessThan(0.65)
    for (const [radius] of profile) expect(radius).toBeGreaterThanOrEqual(0)
  })
})

describe('lonePairDots', () => {
  it('puts two dots side by side at the given reach, at right angles to the direction', () => {
    const [a, b] = lonePairDots([1, 1, 1], [0, 1, 0], 0.5, 0.1)
    expect(distance(a, b)).toBeCloseTo(0.2, 12)
    expectVec([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], [1, 1.5, 1])
    expect(a[1]).toBeCloseTo(b[1], 12)
  })
})
