export type Vec3 = readonly [number, number, number]

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const DEG = 180 / Math.PI

export function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(...sub(a, b))
}

/** The angle a-vertex-c in degrees, 0 to 180. */
export function angleDeg(a: Vec3, vertex: Vec3, c: Vec3): number {
  const u = sub(a, vertex)
  const v = sub(c, vertex)
  return Math.atan2(Math.hypot(...cross(u, v)), dot(u, v)) * DEG
}

/**
 * The dihedral a-b-c-d in degrees, -180 to 180. Positive when, looking along
 * b to c, the far bond c-d is rotated clockwise from the near bond b-a (IUPAC).
 */
export function dihedralDeg(a: Vec3, b: Vec3, c: Vec3, d: Vec3): number {
  const b1 = sub(b, a)
  const b2 = sub(c, b)
  const b3 = sub(d, c)
  const n2 = cross(b2, b3)
  return Math.atan2(Math.hypot(...b2) * dot(b1, n2), dot(cross(b1, b2), n2)) * DEG
}
