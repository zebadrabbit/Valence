import type { Vec3 } from '@/chem-data/geometry'
import type { Quat } from './sceneMath'

/** Rotates v by the unit quaternion q (x, y, z, w). Test helper only. */
export function rotate(v: Vec3, [x, y, z, w]: Quat): Vec3 {
  // v + 2w(q x v) + 2 q x (q x v)
  const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
  const q: Vec3 = [x, y, z]
  const t = cross(q, v)
  const u = cross(q, t)
  return [v[0] + 2 * (w * t[0] + u[0]), v[1] + 2 * (w * t[1] + u[1]), v[2] + 2 * (w * t[2] + u[2])]
}
