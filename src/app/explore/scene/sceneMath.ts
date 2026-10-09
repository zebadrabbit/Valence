// View maths for the 3D scene, on plain tuples so Vitest runs it in node. The
// React Three Fiber components pass the results straight to mesh props.

import { add, cross, distance, dot, normalize, scale, sub, type Vec3 } from '@/chem-data/geometry'

/** x, y, z, w: the order THREE.Quaternion.set() and the R3F quaternion prop take. */
export type Quat = readonly [number, number, number, number]

/** The point the fraction `t` of the way from a to b. */
export const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => add(a, scale(sub(b, a), t))

/** The unit vector pointing from a to b. */
export const direction = (a: Vec3, b: Vec3): Vec3 => normalize(sub(b, a))

/**
 * Rotation that turns +Y (the axis of THREE.CylinderGeometry) onto the unit
 * vector `dir`. Same result as Quaternion.setFromUnitVectors((0,1,0), dir).
 */
export function quaternionFromYAxis(dir: Vec3): Quat {
  const [x, y, z] = dir
  // q = (Y x dir, 1 + Y.dir), normalized. Y x dir = (z, 0, -x).
  const w = 1 + y
  if (w < 1e-9) return [1, 0, 0, 0] // dir is -Y: half a turn about X
  const length = Math.hypot(z, x, w)
  return [z / length, 0, -x / length, w / length]
}

/** A unit vector perpendicular to `axis`, in the plane of `axis` and `hint` when the hint is usable. */
export function perpendicular(axis: Vec3, hint?: Vec3): Vec3 {
  if (hint) {
    const rejected = sub(hint, scale(axis, dot(hint, axis)))
    if (Math.hypot(...rejected) > 1e-6) return normalize(rejected)
  }
  // No hint, or the hint is parallel to the axis (CO2): any perpendicular will do. Prefer one in
  // the XY plane, which faces the camera at first, so parallel bond lines do not hide each other.
  const world: Vec3 = Math.abs(axis[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]
  return normalize(cross(axis, world))
}

/** A cylinder: its centre, the rotation of +Y onto its axis, its height and its radius. */
export type Stick = { position: Vec3; quaternion: Quat; length: number; radius: number }

/** A piece of a drawn bond. `end` says which atom's half it is in: 0 for a, 1 for b. */
export type BondStick = Stick & { end: 0 | 1 }

export type BondKind = 1 | 2 | 3 | 'aromatic'

export type StickStyle = {
  /** Radius of a single bond, and of the solid line of an aromatic bond. */
  radius: number
  /** Radius of each line of a double or triple bond, and of the aromatic dashes. */
  multiRadius: number
  /** Distance between neighbouring parallel lines. */
  spacing: number
}

// The dashed line of an aromatic bond: about one dash per this length, the dash filling this fraction.
const DASH_PERIOD = 0.2
const DASH_FILL = 0.6
// The dashed line of a bond that has only just begun to form: this fraction of its full radius, its dashes filling this fraction.
const PART_THIN = 0.25
const PART_FILL = 0.3

/** The lines of one bond from `a` to `b`: whole ones and dashed ones, each `offset` to the side of the axis, towards `hint`. */
function bondLines(a: Vec3, b: Vec3, hint?: Vec3) {
  const length = distance(a, b)
  const axis = direction(a, b)
  const quaternion = quaternionFromYAxis(axis)
  const side = perpendicular(axis, hint && sub(hint, a))

  /** The part of a line between the fractions `from` and `to` of the bond, `offset` to the side. */
  const piece = (offset: number, from: number, to: number, radius: number): BondStick => {
    const middle = (from + to) / 2
    return {
      position: add(add(a, scale(axis, middle * length)), scale(side, offset)),
      quaternion,
      length: (to - from) * length,
      radius,
      end: middle < 0.5 ? 0 : 1,
    }
  }
  return {
    /** Split at the middle, so each half can take its atom's colour. */
    line: (offset: number, radius: number) => [piece(offset, 0, 0.5, radius), piece(offset, 0.5, 1, radius)],
    /** About one dash per DASH_PERIOD of length, each filling the fraction `fill` of its share. */
    dashed: (offset: number, radius: number, fill: number) => {
      const dashes = Math.max(3, Math.round(length / DASH_PERIOD))
      const half = fill / 2 / dashes
      return Array.from({ length: dashes }, (_, i) => {
        const middle = (i + 0.5) / dashes
        return piece(offset, middle - half, middle + half, radius)
      })
    },
  }
}

/** Where the lines of a bond of whole order `order` lie: `spacing` apart, centred on the axis. */
const lineOffset = (order: number, i: number, spacing: number) => (i - (order - 1) / 2) * spacing
const lineRadius = (order: number, style: StickStyle) => (order === 1 ? style.radius : style.multiRadius)

/**
 * The cylinders that draw one bond from `a` to `b`. Every line is split at the
 * middle so each half can take its atom's colour.
 * - order 2 and 3: parallel lines `spacing` apart, centred on the bond axis;
 * - aromatic: a solid line on the axis and a dashed line beside it (delocalised,
 *   not an alternating single or double bond).
 * The lines are spread towards `hint` (a third atom, or the ring centre), so they
 * lie in the plane of the molecule and the aromatic dashes fall inside the ring.
 */
export function bondSticks(a: Vec3, b: Vec3, kind: BondKind, style: StickStyle, hint?: Vec3): BondStick[] {
  const { line, dashed } = bondLines(a, b, hint)
  if (kind === 'aromatic') return [...line(0, style.radius), ...dashed(style.spacing, style.multiRadius, DASH_FILL)]
  return Array.from({ length: kind }, (_, i) => line(lineOffset(kind, i, style.spacing), lineRadius(kind, style))).flat()
}

/**
 * The cylinders of a bond whose order is on its way between two whole numbers (a mechanism's bond that is
 * forming, breaking or changing order): the whole lines it has, and one dashed line for the part that is not
 * whole. The dashed line is thinner and more broken the less of it there is, and every line moves from where the
 * lower order has it to where the higher has it, so the drawing meets the whole bond at each end without a jump.
 * A whole order is drawn as `bondSticks` draws it.
 */
export function partialBondSticks(a: Vec3, b: Vec3, order: number, style: StickStyle, hint?: Vec3): BondStick[] {
  const whole = Math.floor(order)
  const part = order - whole
  if (part === 0) return bondSticks(a, b, whole as 1 | 2 | 3, style, hint)
  const { line, dashed } = bondLines(a, b, hint)
  const between = (from: number, to: number) => from + (to - from) * part
  const radius = between(whole === 0 ? style.radius : lineRadius(whole, style), lineRadius(whole + 1, style))
  return [
    ...Array.from({ length: whole }, (_, i) => line(between(lineOffset(whole, i, style.spacing), lineOffset(whole + 1, i, style.spacing)), radius)).flat(),
    // The new line leaves from the last whole one, or from the axis where there is none.
    ...dashed(between(whole === 0 ? 0 : lineOffset(whole, whole - 1, style.spacing), lineOffset(whole + 1, whole, style.spacing)), lineRadius(whole + 1, style) * (PART_THIN + (1 - PART_THIN) * part), PART_FILL + (1 - PART_FILL) * part),
  ]
}

/** How far from the bond axis the drawn lines of a bond reach. */
export function bondReach(kind: BondKind, style: StickStyle): number {
  if (kind === 1) return style.radius
  if (kind === 2) return style.spacing / 2 + style.multiRadius
  return style.spacing + style.multiRadius
}

/**
 * The circle where two overlapping spheres meet, as the distance of its centre
 * from the first sphere's centre and its radius. Null when the surfaces do not
 * cross (the spheres are apart, or one is inside the other).
 */
export function sphereOverlap(separation: number, radiusA: number, radiusB: number): { along: number; radius: number } | null {
  if (separation <= 0 || separation >= radiusA + radiusB || separation <= Math.abs(radiusA - radiusB)) return null
  const along = (separation ** 2 + radiusA ** 2 - radiusB ** 2) / (2 * separation)
  return { along, radius: Math.sqrt(radiusA ** 2 - along ** 2) }
}

/**
 * A right-handed set of axes through the centroid of the points for looking at them: x along
 * their longest spread, z along their shortest. Seen down z, a flat molecule lies face-on and a
 * linear one lies across the view. Right-handed, so chirality is never mirrored.
 */
export function principalFrame(points: readonly Vec3[]): { center: Vec3; axes: readonly [Vec3, Vec3, Vec3] } {
  if (points.length === 0) throw new Error('principal frame of no points')
  const center = scale(points.reduce(add), 1 / points.length)
  // The covariance matrix of the points (symmetric), then its eigenvectors by Jacobi rotations.
  const m = [0, 1, 2].map((i) => [0, 1, 2].map((j) => points.reduce((sum, p) => sum + (p[i]! - center[i]!) * (p[j]! - center[j]!), 0)))
  const v = [0, 1, 2].map((i) => [0, 1, 2].map((j) => (i === j ? 1 : 0)))
  for (let sweep = 0; sweep < 32; sweep++) {
    for (const [p, q] of [[0, 1], [0, 2], [1, 2]] as const) {
      const off = m[p]![q]!
      if (Math.abs(off) < 1e-12) continue
      const theta = (m[q]![q]! - m[p]![p]!) / (2 * off)
      const t = (theta < 0 ? -1 : 1) / (Math.abs(theta) + Math.hypot(theta, 1))
      const c = 1 / Math.hypot(t, 1)
      const sn = t * c
      for (const rows of [m, v]) {
        for (const row of rows) [row[p], row[q]] = [c * row[p]! - sn * row[q]!, sn * row[p]! + c * row[q]!]
      }
      const [rowP, rowQ] = [[...m[p]!], [...m[q]!]]
      m[p] = rowP.map((x, k) => c * x - sn * rowQ[k]!)
      m[q] = rowP.map((x, k) => sn * x + c * rowQ[k]!)
    }
  }
  // Eigenvectors are the columns of v; take the two with the largest spread, and complete the set.
  const column = (k: number): Vec3 => [v[0]![k]!, v[1]![k]!, v[2]![k]!]
  const [first, second] = [0, 1, 2].sort((i, j) => m[j]![j]! - m[i]![i]!)
  const x = column(first!)
  const y = column(second!)
  return { center, axes: [x, y, cross(x, y)] }
}

/** The coordinates of a point in a frame from principalFrame. */
export function inFrame(point: Vec3, frame: { center: Vec3; axes: readonly [Vec3, Vec3, Vec3] }): Vec3 {
  const d = sub(point, frame.center)
  return [dot(d, frame.axes[0]), dot(d, frame.axes[1]), dot(d, frame.axes[2])]
}

/** A direction (not a point) in a frame from principalFrame: turned, not moved. */
export function directionInFrame(dir: Vec3, frame: { axes: readonly [Vec3, Vec3, Vec3] }): Vec3 {
  return [dot(dir, frame.axes[0]), dot(dir, frame.axes[1]), dot(dir, frame.axes[2])]
}

/**
 * The outline of an orbital lobe as [radius, height] pairs for THREE.LatheGeometry, which spins
 * it about +Y: a teardrop that starts as a point at the nucleus (height 0), is widest about
 * two thirds of the way along, and closes at `length`.
 */
export function lobeProfile(length: number, width: number, steps = 24): [radius: number, height: number][] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps
    return [i === 0 || i === steps ? 0 : width * Math.sin(Math.PI * t ** 1.5), length * t]
  })
}

/** The two dots of a lone pair: `reach` from the atom along the unit vector `dir`, `spread` to each side. */
export function lonePairDots(atom: Vec3, dir: Vec3, reach: number, spread: number): [Vec3, Vec3] {
  const centre = add(atom, scale(dir, reach))
  const side = scale(perpendicular(dir), spread)
  return [add(centre, side), sub(centre, side)]
}

export type Sphere = { center: Vec3; radius: number }

/** A sphere around the centroid that contains every atom sphere. Not minimal, but stable and cheap. */
export function boundingSphere(positions: readonly Vec3[], radii: readonly number[]): Sphere {
  if (positions.length === 0) throw new Error('bounding sphere of no points')
  const center = scale(positions.reduce(add), 1 / positions.length)
  let radius = 0
  positions.forEach((p, i) => {
    radius = Math.max(radius, distance(p, center) + (radii[i] ?? 0))
  })
  return { center, radius }
}

/**
 * Distance from the camera to the centre of a sphere of the given radius so
 * that the sphere just fits a perspective view. `fovDeg` is the vertical field
 * of view (THREE.PerspectiveCamera.fov); `aspect` is width / height.
 */
export function framingDistance(radius: number, fovDeg: number, aspect: number, margin = 1.15): number {
  const halfV = (fovDeg * Math.PI) / 360
  // On a portrait canvas the horizontal field of view is the tighter one.
  const halfH = Math.atan(Math.tan(halfV) * aspect)
  return (radius * margin) / Math.sin(Math.min(halfV, halfH))
}
