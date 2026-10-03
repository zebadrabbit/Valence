# Phase 2 spike: Three.js through React Three Fiber on the Explore page

Date: 2026-10-03. Throwaway spike. Nothing under `<repo>` was modified (checked with `find -newermt` and `diff -rq` at the end).

- Spike copy: `./spike`
- Browser scripts, screenshots and raw results: `./browser/`

## 1. Result in one paragraph

It works with no dependency conflict and no change to `tsconfig`. `three` + `@react-three/fiber` (no drei) render a ball-and-stick molecule in a lazily loaded chunk, with orbit controls, click selection, a DOM atom list that shares selection, keyboard-reachable view buttons, reduced-motion handling and `frameloop="demand"`. `npm run typecheck`, `npm run lint` and `npm run build` pass (151 tests). 26 of 26 headless-browser checks pass against both the production build and the dev server (StrictMode). The main chunk grows by 5.5 kB; the 3D chunk is 935 kB raw, 247 kB gzip, and is requested only when Explore opens.

Three things the plan should know before it is written:

1. **The 3D chunk is large and cannot be tree-shaken much**: 934,702 bytes raw, 247.05 kB gzip. R3F registers the whole `three` namespace.
2. **R3F 9.8.1 on three r183+ logs a deprecation warning on every Canvas mount** (`THREE.Clock: This module has been deprecated`). Pinning three to 0.182 removes the warning but also removes the public `rotateLeft` / `dollyIn` methods the keyboard view buttons use (I tried it: 4 type errors). The spike filters that single message with `THREE.setConsoleFunction`.
3. **`OrbitControls.reset()` does not clear damping inertia.** A reset pressed soon after a drag drifts away from the saved view. Found by pixel-diffing in the browser; fixed in `reset()` below.

## 2. Commands run

```sh
S=./spike
mkdir -p $S
rsync -a --exclude node_modules --exclude dist --exclude .git --exclude .superpowers <repo>/ $S/
cd $S
npm install --no-audit --no-fund
npm install three @react-three/fiber --no-audit --no-fund
npm install -D @types/three --no-audit --no-fund
npm run typecheck   # exit 0
npm run lint        # exit 0
npm run build       # exit 0 (vitest run && tsc -b && vite build)
npx vite preview --port 4391 --strictPort   # production build, for the browser checks
npx vite --port 4392 --strictPort           # dev server (StrictMode double-mount), for the browser checks
cd ./browser
node check.cjs http://localhost:4391/ prod '["--use-angle=swiftshader"]'
node check.cjs http://localhost:4392/ dev  '["--use-angle=swiftshader"]'
node nogl.cjs  http://localhost:4391/
node reset.cjs
```

Node v24.21.0, npm 12.1.0.

## 3. Versions and peer dependencies (goal 1)

| Package | Resolved | Notes |
| --- | --- | --- |
| `three` | 0.186.1 | dependency |
| `@react-three/fiber` | 9.8.1 | dependency. Peer range `react >=19 <19.4`, `react-dom >=19 <19.4`, `three >=0.156` |
| `@types/three` | 0.186.0 | devDependency. **Needed**: `three` ships no types |
| `react`, `react-dom` | 19.3.0 | unchanged |
| `typescript` | 6.0.3 | unchanged |
| `@react-three/drei` | not installed | see below |

- **No peer conflict with React 19.3.0.** `npm install` printed no warning and `npm ls` shows no `invalid` entry. The only unmet peers are R3F's optional React Native ones (`expo`, `expo-gl`, `react-native`…), which are marked optional.
- **Watch the upper bound:** R3F 9.8.1 declares `react <19.4`. When React 19.4 ships, `npm install` will fail with ERESOLVE until R3F widens the range. `package.json` has `"react": "^19.3.0"`, so a fresh install after 19.4 is out would hit it. The lockfile protects `npm ci`.
- R3F brings 11 transitive packages (`its-fine`, `react-use-measure`, `scheduler`, `suspend-react`, `zustand`, `@types/webxr`, …).
- **drei did not earn its place.** The only thing the spike wanted from it is `<OrbitControls>`. `three/addons/controls/OrbitControls.js` ships with three, is typed by `@types/three`, and the R3F wrapper is the 60-line `Controls` component below. drei 10.7.9 would add 21 direct dependencies (`three-stdlib`, `troika-three-text`, `hls.js`, `@mediapipe/tasks-vision`, `camera-controls`, `detect-gpu`, …). I did not install it or measure its bundle cost.

`package.json` change:

```diff
+    "@react-three/fiber": "^9.8.1",
+    "three": "^0.186.1",
 (devDependencies)
+    "@types/three": "^0.186.0",
```

## 4. Files added or changed

| File | Status | Imports three? |
| --- | --- | --- |
| `src/chem-data/geometry.ts` | new | no (plain tuples) |
| `src/chem-data/geometry.test.ts` | new | no |
| `src/app/explore/scene/sceneMath.ts` | new | no (plain tuples) |
| `src/app/explore/scene/sceneMath.test.ts` | new | yes, to cross-check the quaternion against Three.js |
| `src/app/explore/scene/MoleculeViewer.tsx` | new | yes: the lazy chunk |
| `src/app/explore/spikeMolecules.ts` | new, spike data only | no |
| `src/app/useReducedMotion.ts` | new | no |
| `src/app/pages/Explore.tsx` | replaced | type-only |
| `eslint.config.js` | optional guard added | |
| `src/lint-rules.test.ts` | one test replaced, four added | |
| `vite.config.ts` | `chunkSizeWarningLimit` | |
| `package.json`, `package-lock.json` | three packages | |

`src/main.tsx`, `tsconfig*.json`, `AppState.tsx` and `Layout.tsx` are unchanged. The route stays `{ path: 'explore', element: <Explore /> }`; the lazy boundary is inside the page (`React.lazy` + `Suspense`), so the page header, description and atom list paint at once and still work if WebGL does not.

### 4.1 Pure maths (goal 5)

**Where it lives.** Geometry uses `readonly [number, number, number]` tuples, not `THREE.Vector3`:

- `src/chem-data/geometry.ts`: distance, angle, dihedral, centroid. Spec 6.3 measures lengths and angles from stored coordinates, 6.5 has the validator compare them with cited values, and `describeMolecule` needs them. All of those are in the pure folders, which may not import three.
- `src/app/explore/scene/sceneMath.ts`: bond cylinder transforms, double-bond offsets, bounding sphere, camera framing distance. View concerns, so they stay in `app/`, but still on tuples, so the tests do not depend on three for anything but a cross-check.

R3F accepts readonly tuples directly for `position`, `quaternion` and `scale` (typecheck passes with no casts), so nothing is converted at the boundary.

Vitest runs these in the node environment unchanged. Importing `three` in a node test works (it is plain ESM maths with no DOM access at import time); `sceneMath.test.ts` uses it to prove `quaternionFromYAxis` equals `Quaternion.setFromUnitVectors`. The whole suite takes 3.2 s.

The tests caught a real bug while I wrote this: my first `dihedralDeg` had the sign reversed. The IUPAC-sign test failed with `expected -90 to be close to 90`.

What stays untested by Vitest: the R3F components themselves (no DOM, no WebGL in node). Spec 13 says no end-to-end framework in v1, so they are covered by the phase's hand checklist. The Playwright script in `browser/check.cjs` is scratch tooling, not part of the repo.

#### `src/chem-data/geometry.ts`

```ts
// Vector maths on plain number tuples. No Three.js: this file is imported by
// the validator, the derive functions, the tests (node) and the 3D scene alike.

export type Vec3 = readonly [number, number, number]

export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
export const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k]
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
export const length = (a: Vec3): number => Math.hypot(a[0], a[1], a[2])
export const distance = (a: Vec3, b: Vec3): number => length(sub(a, b))

/** Unit vector. Throws on a zero vector: two atoms at one point is a data error. */
export function normalize(a: Vec3): Vec3 {
  const len = length(a)
  if (len === 0) throw new Error('cannot normalize a zero vector')
  return scale(a, 1 / len)
}

const DEG = 180 / Math.PI

/** Angle a-b-c at the vertex b, in degrees, 0 to 180. */
export function angleDeg(a: Vec3, b: Vec3, c: Vec3): number {
  const u = sub(a, b)
  const v = sub(c, b)
  // atan2 of |u x v| and u.v stays accurate near 0 and 180 degrees, where acos loses digits.
  return Math.atan2(length(cross(u, v)), dot(u, v)) * DEG
}

/**
 * Dihedral a-b-c-d in degrees, -180 to 180 (IUPAC sign: positive when the far
 * bond c-d is rotated clockwise from the near bond a-b, looking along b to c).
 */
export function dihedralDeg(a: Vec3, b: Vec3, c: Vec3, d: Vec3): number {
  const b1 = sub(b, a)
  const b2 = sub(c, b)
  const b3 = sub(d, c)
  const n1 = cross(b1, b2)
  const n2 = cross(b2, b3)
  const m = cross(normalize(b2), n1)
  return Math.atan2(dot(m, n2), dot(n1, n2)) * DEG
}

export function centroid(points: readonly Vec3[]): Vec3 {
  if (points.length === 0) throw new Error('centroid of no points')
  let sum: Vec3 = [0, 0, 0]
  for (const p of points) sum = add(sum, p)
  return scale(sum, 1 / points.length)
}
```

#### `src/chem-data/geometry.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { angleDeg, centroid, cross, dihedralDeg, distance, normalize, type Vec3 } from './geometry'

describe('geometry', () => {
  it('measures distance', () => {
    expect(distance([0, 0, 0], [1, 2, 2])).toBeCloseTo(3, 12)
  })

  it('cross product is right-handed', () => {
    expect(cross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1])
  })

  it('refuses to normalize a zero vector', () => {
    expect(() => normalize([0, 0, 0])).toThrow()
  })

  it('measures the water angle from coordinates', () => {
    // O-H 0.9572 A, H-O-H 104.52 degrees, built in the xy plane.
    const half = (104.52 / 2) * (Math.PI / 180)
    const o: Vec3 = [0, 0, 0]
    const h1: Vec3 = [0.9572 * Math.sin(half), 0.9572 * Math.cos(half), 0]
    const h2: Vec3 = [-0.9572 * Math.sin(half), 0.9572 * Math.cos(half), 0]
    expect(angleDeg(h1, o, h2)).toBeCloseTo(104.52, 10)
    expect(distance(o, h1)).toBeCloseTo(0.9572, 12)
  })

  it('handles the 0 and 180 degree limits', () => {
    expect(angleDeg([1, 0, 0], [0, 0, 0], [2, 0, 0])).toBe(0)
    expect(angleDeg([1, 0, 0], [0, 0, 0], [-3, 0, 0])).toBe(180)
  })

  it('gives the tetrahedral angle for methane-like directions', () => {
    const c: Vec3 = [0, 0, 0]
    expect(angleDeg([1, 1, 1], c, [1, -1, -1])).toBeCloseTo(109.4712, 4)
  })

  it('measures dihedrals with the IUPAC sign', () => {
    const a: Vec3 = [1, 0, 0]
    const b: Vec3 = [0, 0, 0]
    const c: Vec3 = [0, 0, 1]
    expect(dihedralDeg(a, b, c, [1, 0, 1])).toBeCloseTo(0, 12) // cis (eclipsed)
    expect(Math.abs(dihedralDeg(a, b, c, [-1, 0, 1]))).toBeCloseTo(180, 12) // trans (anti)
    // Looking from b towards c (+z, away from the viewer), d is 90 degrees clockwise from a.
    expect(dihedralDeg(a, b, c, [0, 1, 1])).toBeCloseTo(90, 12)
    expect(dihedralDeg(a, b, c, [0, -1, 1])).toBeCloseTo(-90, 12)
    const s = Math.sin(Math.PI / 3)
    expect(dihedralDeg(a, b, c, [0.5, s, 1])).toBeCloseTo(60, 12) // gauche+
  })

  it('finds the centroid', () => {
    expect(centroid([[0, 0, 0], [2, 4, 6]])).toEqual([1, 2, 3])
    expect(() => centroid([])).toThrow()
  })
})
```

#### `src/app/explore/scene/sceneMath.ts`

```ts
// View maths for the 3D scene, on plain tuples so Vitest can run it in node
// without loading Three.js. The React Three Fiber components pass the results
// straight to mesh props: position={...} quaternion={...} scale={...}.

import { add, centroid, cross, distance, dot, normalize, scale, sub, type Vec3 } from '@/chem-data/geometry'

/** x, y, z, w: the order THREE.Quaternion.set() and the R3F quaternion prop take. */
export type Quat = readonly [number, number, number, number]

/**
 * Rotation that turns +Y (the axis of THREE.CylinderGeometry) onto the unit
 * vector `dir`. Same result as Quaternion.setFromUnitVectors((0,1,0), dir).
 */
export function quaternionFromYAxis(dir: Vec3): Quat {
  const [x, y, z] = dir
  // q = (Y x dir, 1 + Y.dir), normalized. Y x dir = (z, 0, -x).
  const w = 1 + y
  if (w < 1e-9) return [1, 0, 0, 0] // dir is -Y: half a turn about X
  const len = Math.hypot(z, x, w)
  return [z / len, 0, -x / len, w / len]
}

export interface CylinderTransform {
  /** Centre of the cylinder. */
  position: Vec3
  quaternion: Quat
  /** Height of the cylinder (the bond length). */
  length: number
}

/**
 * One cylinder per unit of bond order between atoms at `a` and `b`. Parallel
 * cylinders are spread `spacing` apart, centred on the bond axis, along a
 * direction perpendicular to the bond. When `reference` is given (the position
 * of any other atom bonded to a or b) the cylinders lie in the a-b-reference
 * plane, which is how a double bond is drawn in a planar molecule.
 */
export function bondCylinders(
  a: Vec3,
  b: Vec3,
  order: 1 | 2 | 3,
  spacing: number,
  reference?: Vec3,
): CylinderTransform[] {
  const axis = normalize(sub(b, a))
  const mid = scale(add(a, b), 0.5)
  const quaternion = quaternionFromYAxis(axis)
  const len = distance(a, b)
  if (order === 1) return [{ position: mid, quaternion, length: len }]

  const side = perpendicular(axis, reference ? sub(reference, a) : undefined)
  const transforms: CylinderTransform[] = []
  for (let i = 0; i < order; i++) {
    const offset = (i - (order - 1) / 2) * spacing
    transforms.push({ position: add(mid, scale(side, offset)), quaternion, length: len })
  }
  return transforms
}

/** A unit vector perpendicular to `axis`, in the plane of `axis` and `hint` when the hint is usable. */
export function perpendicular(axis: Vec3, hint?: Vec3): Vec3 {
  if (hint) {
    const rejected = sub(hint, scale(axis, dot(hint, axis)))
    if (Math.hypot(...rejected) > 1e-6) return normalize(rejected)
  }
  // No hint, or the hint is parallel to the axis (CO2): any perpendicular will do.
  // Cross with the world axis the bond is least aligned with, so the result is never near zero.
  const ax = Math.abs(axis[0])
  const ay = Math.abs(axis[1])
  const az = Math.abs(axis[2])
  const world: Vec3 = ax <= ay && ax <= az ? [1, 0, 0] : ay <= az ? [0, 1, 0] : [0, 0, 1]
  return normalize(cross(axis, world))
}

export interface Sphere {
  center: Vec3
  radius: number
}

/** A sphere around the centroid that contains every atom sphere. Not minimal, but stable and cheap. */
export function boundingSphere(positions: readonly Vec3[], radii: readonly number[]): Sphere {
  const center = centroid(positions)
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
```

#### `src/app/explore/scene/sceneMath.test.ts`

```ts
import { Quaternion, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import type { Vec3 } from '@/chem-data/geometry'
import { bondCylinders, boundingSphere, framingDistance, perpendicular, quaternionFromYAxis } from './sceneMath'

/** Rotate +Y by q using Three.js itself, as the scene will. */
function rotateY(q: readonly [number, number, number, number]): number[] {
  return new Vector3(0, 1, 0).applyQuaternion(new Quaternion(...q)).toArray()
}

function expectVec(actual: readonly number[], expected: readonly number[]) {
  actual.forEach((v, i) => expect(v).toBeCloseTo(expected[i] ?? NaN, 10))
}

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

describe('bondCylinders', () => {
  it('places a single bond at the midpoint, along the bond', () => {
    const [c, ...rest] = bondCylinders([1, 0, 0], [1, 0, 2], 1, 0.2)
    expect(rest).toHaveLength(0)
    expect(c?.position).toEqual([1, 0, 1])
    expect(c?.length).toBe(2)
    expectVec(rotateY(c!.quaternion), [0, 0, 1])
  })

  it('splits a double bond into two cylinders one spacing apart, in the reference plane', () => {
    // C=O along x; a hydrogen on the carbon lies in the xy plane.
    const cyl = bondCylinders([0, 0, 0], [1.2, 0, 0], 2, 0.24, [-0.5, 0.9, 0])
    expect(cyl).toHaveLength(2)
    expectVec(cyl[0]!.position, [0.6, -0.12, 0])
    expectVec(cyl[1]!.position, [0.6, 0.12, 0])
    for (const c of cyl) {
      expect(c.length).toBeCloseTo(1.2, 12)
      expectVec(rotateY(c.quaternion), [1, 0, 0])
    }
  })

  it('keeps the middle cylinder of a triple bond on the axis', () => {
    const cyl = bondCylinders([0, 0, 0], [0, 0, 1.1], 3, 0.2)
    expect(cyl).toHaveLength(3)
    expectVec(cyl[1]!.position, [0, 0, 0.55])
    const d = [0, 1, 2].map((i) => cyl[2]!.position[i]! - cyl[0]!.position[i]!)
    expect(Math.hypot(...d)).toBeCloseTo(0.4, 12)
    expect(d[2]).toBeCloseTo(0, 12) // the offset is perpendicular to the bond
  })

  it('throws when both atoms are at the same point', () => {
    expect(() => bondCylinders([1, 1, 1], [1, 1, 1], 1, 0.2)).toThrow()
  })
})

describe('perpendicular', () => {
  it('falls back to an arbitrary perpendicular when the hint is collinear (CO2)', () => {
    const p = perpendicular([1, 0, 0], [-2, 0, 0])
    expect(Math.hypot(...p)).toBeCloseTo(1, 12)
    expect(p[0]).toBeCloseTo(0, 12)
  })

  it.each<Vec3>([[1, 0, 0], [0, 1, 0], [0, 0, 1]])('is a unit vector perpendicular to (%f, %f, %f) without a hint', (...axis) => {
    const p = perpendicular(axis)
    expect(Math.hypot(...p)).toBeCloseTo(1, 12)
    expect(p[0] * axis[0] + p[1] * axis[1] + p[2] * axis[2]).toBeCloseTo(0, 12)
  })
})

describe('camera framing', () => {
  it('bounds every atom sphere', () => {
    const s = boundingSphere([[-1, 0, 0], [3, 0, 0]], [0.5, 0.25])
    expect(s.center).toEqual([1, 0, 0])
    expect(s.radius).toBe(2.5)
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
```

### 4.2 The viewer (goals 2 and 6)

Plain meshes, no instancing: one `<mesh>` per atom and per bond cylinder. Water is 5 draw calls a frame; a 24-atom molecule is about 50. With `frameloop="demand"` those happen only when something changes, so there is no reason to instance. Plain meshes also give per-atom `onClick` for free.

#### `src/app/explore/scene/MoleculeViewer.tsx`

```tsx
// Three.js lives only under a scene/ folder (ESLint enforces it). This file is
// loaded with React.lazy from the Explore page, so three and @react-three/fiber
// land in their own chunk and never in the main bundle.

import { useEffect, useImperativeHandle, useMemo, useRef, type Ref } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { BackSide, setConsoleFunction, type DirectionalLight } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { scale as scaleVec, type Vec3 } from '@/chem-data/geometry'
import { bondCylinders, boundingSphere, framingDistance } from './sceneMath'
import { atomLabel, elementStyle, type ViewMolecule } from '../spikeMolecules'

// @react-three/fiber 9.8 still constructs a THREE.Clock, which three r183 and later report as
// deprecated with a console warning on every Canvas mount. Nothing here can act on it, so drop
// that one message and pass everything else through. Remove this when R3F stops using Clock.
setConsoleFunction((type, message, ...params) => {
  if (type === 'warn' && message.startsWith('THREE.Clock:')) return
  console[type](message, ...params)
})

const FOV = 45
const BOND_RADIUS = 0.09
const MULTI_BOND_RADIUS = 0.06
const MULTI_BOND_SPACING = 0.2
const ROTATE_STEP = Math.PI / 12 // 15 degrees per button press
const ZOOM_STEP = 1.2

/** What the DOM buttons beside the canvas can ask the camera to do. */
export interface ViewHandle {
  rotate(azimuthSteps: number, polarSteps: number): void
  zoom(steps: number): void
  reset(): void
}

export interface MoleculeViewerProps {
  molecule: ViewMolecule
  selected: number | null
  onSelect(index: number | null): void
  reducedMotion: boolean
  /** Ignored while reducedMotion is true. */
  autoRotate: boolean
  /** Text alternative: the id of an element that describes the molecule. */
  describedBy: string
  viewRef?: Ref<ViewHandle>
  onContextLost?(lost: boolean): void
}

export function MoleculeViewer(props: MoleculeViewerProps) {
  const { molecule, selected, onSelect, reducedMotion, autoRotate, describedBy, viewRef, onContextLost } = props
  const sphere = useMemo(
    () =>
      boundingSphere(
        molecule.atoms.map((a) => a.position),
        molecule.atoms.map((a) => elementStyle(a.element).radius),
      ),
    [molecule],
  )

  return (
    <Canvas
      // Render only when something changed (a prop, a camera move), not 60 times a second.
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ fov: FOV, near: 0.1, far: 200 }}
      gl={{ antialias: true, alpha: true }}
      // These land on the wrapper <div> that R3F puts around the <canvas>.
      role="img"
      aria-label={`3D ball-and-stick model of ${molecule.name}`}
      aria-describedby={describedBy}
      // A click on empty space clears the selection.
      onPointerMissed={() => onSelect(null)}
    >
      <ambientLight intensity={1.2} />
      <Headlight />
      <Controls radius={sphere.radius} reducedMotion={reducedMotion} autoRotate={autoRotate} viewRef={viewRef} />
      <ContextLossWatcher onChange={onContextLost} />
      {/* Move the molecule so its centre is the origin; the camera orbits the origin. */}
      <group position={scaleVec(sphere.center, -1)}>
        {molecule.atoms.map((atom, i) => (
          <AtomMesh
            key={i}
            position={atom.position}
            element={atom.element}
            label={atomLabel(molecule, i)}
            selected={selected === i}
            onSelect={() => onSelect(i)}
          />
        ))}
        {molecule.bonds.map((bond, i) => (
          <BondMesh key={i} molecule={molecule} a={bond.a} b={bond.b} order={bond.order} />
        ))}
      </group>
    </Canvas>
  )
}

function AtomMesh(props: { position: Vec3; element: string; label: string; selected: boolean; onSelect(): void }) {
  const { color, radius } = elementStyle(props.element)
  const gl = useThree((s) => s.gl)

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    // The ray hits every atom along it; only the nearest one should react.
    e.stopPropagation()
    // R3F fires onClick after an orbit drag that starts and ends on the atom. delta is the drag length in px.
    if (e.delta > 4) return
    props.onSelect()
  }

  return (
    <group position={props.position}>
      <mesh
        name={props.label}
        scale={radius}
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation()
          gl.domElement.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          gl.domElement.style.cursor = ''
        }}
      >
        <sphereGeometry args={[1, 32, 16]} />
        <meshStandardMaterial color={color} roughness={0.45} />
      </mesh>
      {props.selected && (
        // Selection ring: a slightly larger shell drawn from its inside faces, so it shows as an
        // outline around the atom. A shape cue, not a colour change. raycast is off so it never eats clicks.
        <mesh scale={radius * 1.22} raycast={() => null}>
          <sphereGeometry args={[1, 32, 16]} />
          <meshBasicMaterial color="#1d6ef2" side={BackSide} />
        </mesh>
      )}
    </group>
  )
}

function BondMesh({ molecule, a, b, order }: { molecule: ViewMolecule; a: number; b: number; order: 1 | 2 | 3 }) {
  const cylinders = useMemo(() => {
    const pa = molecule.atoms[a]?.position
    const pb = molecule.atoms[b]?.position
    if (!pa || !pb) return []
    // Any third atom bonded to either end fixes the plane the parallel cylinders lie in.
    const neighbour = molecule.bonds
      .flatMap((bond) => (bond.a === a || bond.a === b || bond.b === a || bond.b === b ? [bond.a, bond.b] : []))
      .find((i) => i !== a && i !== b)
    const reference = neighbour === undefined ? undefined : molecule.atoms[neighbour]?.position
    return bondCylinders(pa, pb, order, MULTI_BOND_SPACING, reference)
  }, [molecule, a, b, order])

  const radius = order === 1 ? BOND_RADIUS : MULTI_BOND_RADIUS
  return (
    <group>
      {cylinders.map((c, i) => (
        <mesh
          key={i}
          position={c.position}
          quaternion={c.quaternion}
          scale={[radius, c.length, radius]}
        >
          {/* Unit cylinder along +Y, open ended: the ends are hidden inside the atoms. */}
          <cylinderGeometry args={[1, 1, 1, 16, 1, true]} />
          <meshStandardMaterial color="#9a9a9a" roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

/** A light that stays behind the camera, so the lit side always faces the viewer. */
function Headlight() {
  const light = useRef<DirectionalLight>(null)
  useFrame(({ camera }) => {
    light.current?.position.copy(camera.position)
  })
  return <directionalLight ref={light} intensity={2.4} />
}

function Controls(props: { radius: number; reducedMotion: boolean; autoRotate: boolean; viewRef?: Ref<ViewHandle> }) {
  const { radius, reducedMotion, autoRotate, viewRef } = props
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const invalidate = useThree((s) => s.invalidate)
  const get = useThree((s) => s.get)
  const controls = useMemo(() => new OrbitControls(camera), [camera])

  // Attach to the canvas. With frameloop="demand" nothing draws unless asked,
  // so every camera change requests one frame.
  useEffect(() => {
    const onChange = () => invalidate()
    controls.connect(gl.domElement)
    controls.addEventListener('change', onChange)
    return () => {
      controls.removeEventListener('change', onChange)
      controls.disconnect()
    }
  }, [controls, gl, invalidate])

  // Frame the molecule when it changes: back the camera off along +Z far enough to fit it.
  useEffect(() => {
    const { width, height } = get().size
    const distance = framingDistance(radius, FOV, width / height)
    camera.position.set(0, 0, distance)
    controls.target.set(0, 0, 0)
    controls.minDistance = radius * 1.2
    controls.maxDistance = distance * 4
    controls.enablePan = false
    controls.update()
    controls.saveState() // what reset() goes back to
    invalidate()
  }, [camera, controls, get, invalidate, radius])

  // Reduced motion: no inertia after a drag and no auto-rotation. Dragging itself
  // still works, because that motion is directly driven by the learner.
  useEffect(() => {
    controls.enableDamping = !reducedMotion
    controls.autoRotate = autoRotate && !reducedMotion
    invalidate() // start (or settle) the loop
  }, [controls, invalidate, reducedMotion, autoRotate])

  // update() applies damping and auto-rotation and fires 'change' while the camera is still
  // moving, which requests the next frame. When it stops firing, rendering stops.
  useFrame((_, delta) => {
    controls.update(delta)
  })

  useImperativeHandle(
    viewRef,
    () => ({
      // rotateLeft, rotateUp, dollyIn and dollyOut each call controls.update() themselves. With damping
      // on, the step eases in over the next frames; with reduced motion it is applied at once.
      rotate(azimuthSteps, polarSteps) {
        if (azimuthSteps !== 0) controls.rotateLeft(azimuthSteps * ROTATE_STEP)
        if (polarSteps !== 0) controls.rotateUp(polarSteps * ROTATE_STEP)
      },
      zoom(steps) {
        if (steps > 0) controls.dollyOut(ZOOM_STEP ** steps)
        else controls.dollyIn(ZOOM_STEP ** -steps)
      },
      reset() {
        // reset() does not clear inertia left over from a drag, so the view would drift away
        // again. An update with damping off applies and zeroes it first.
        const damping = controls.enableDamping
        controls.enableDamping = false
        controls.update()
        controls.reset()
        controls.enableDamping = damping
      },
    }),
    [controls],
  )

  return null
}

/** Tells the page when the browser takes the WebGL context away (GPU reset, too many contexts). */
function ContextLossWatcher({ onChange }: { onChange?: (lost: boolean) => void }) {
  const gl = useThree((s) => s.gl)
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    const canvas = gl.domElement
    const lost = (e: Event) => {
      e.preventDefault() // allows the browser to restore the context
      onChange?.(true)
    }
    const restored = () => {
      onChange?.(false)
      invalidate()
    }
    canvas.addEventListener('webglcontextlost', lost)
    canvas.addEventListener('webglcontextrestored', restored)
    return () => {
      canvas.removeEventListener('webglcontextlost', lost)
      canvas.removeEventListener('webglcontextrestored', restored)
    }
  }, [gl, invalidate, onChange])
  return null
}
```

#### `src/app/pages/Explore.tsx`

```tsx
import { Component, lazy, Suspense, useId, useRef, useState, type ReactNode } from 'react'
import { PageHeader } from '@/app/PageHeader'
import { useReducedMotion } from '@/app/useReducedMotion'
import { Button } from '@/components/ui/button'
import { angleDeg } from '@/chem-data/geometry'
import type { ViewHandle } from '@/app/explore/scene/MoleculeViewer'
import { atomLabel, elementStyle, SPIKE_MOLECULES, type ViewMolecule } from '@/app/explore/spikeMolecules'

// The dynamic import is the chunk boundary: three and @react-three/fiber are
// fetched the first time this page renders, not with the main bundle.
// (The type-only import above is erased and does not pull the chunk in.)
const MoleculeViewer = lazy(() => import('@/app/explore/scene/MoleculeViewer').then((m) => ({ default: m.MoleculeViewer })))

export function Explore() {
  const [molecule, setMolecule] = useState<ViewMolecule>(SPIKE_MOLECULES[0]!)
  const [selected, setSelected] = useState<number | null>(null)
  const [autoRotate, setAutoRotate] = useState(false)
  const [contextLost, setContextLost] = useState(false)
  const reducedMotion = useReducedMotion()
  const view = useRef<ViewHandle>(null)
  const descriptionId = useId()

  const choose = (next: ViewMolecule) => {
    setMolecule(next)
    setSelected(null)
  }

  return (
    <>
      <PageHeader title="Explore" />

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Molecule">
        {SPIKE_MOLECULES.map((m) => (
          <Button
            key={m.id}
            variant={m === molecule ? 'default' : 'outline'}
            aria-pressed={m === molecule}
            onClick={() => choose(m)}
          >
            {m.name}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="min-w-0 flex-1">
          {/* The Canvas fills its parent, so the parent needs a height. */}
          <div data-testid="viewport" className="h-[420px] rounded-lg border bg-card">
            <ViewerBoundary fallback={<ViewerMessage>The 3D view could not start in this browser. The atom list and description still work.</ViewerMessage>}>
              <Suspense fallback={<ViewerMessage>Loading the 3D view…</ViewerMessage>}>
                <MoleculeViewer
                  molecule={molecule}
                  selected={selected}
                  onSelect={setSelected}
                  reducedMotion={reducedMotion}
                  autoRotate={autoRotate}
                  describedBy={descriptionId}
                  viewRef={view}
                  onContextLost={setContextLost}
                />
              </Suspense>
            </ViewerBoundary>
          </div>

          {contextLost && (
            <p role="status" className="mt-2 text-sm">
              The 3D view was paused by the browser. It will come back by itself; if it does not, reload the page.
            </p>
          )}

          {/* The text alternative. Phase 2 generates this with describeMolecule() from chem-data. */}
          <p id={descriptionId} className="mt-2 max-w-prose text-sm text-muted-foreground">
            {describe(molecule)}
          </p>

          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="3D view">
            <Button variant="outline" size="sm" onClick={() => view.current?.rotate(1, 0)}>Rotate left</Button>
            <Button variant="outline" size="sm" onClick={() => view.current?.rotate(-1, 0)}>Rotate right</Button>
            <Button variant="outline" size="sm" onClick={() => view.current?.rotate(0, 1)}>Rotate up</Button>
            <Button variant="outline" size="sm" onClick={() => view.current?.rotate(0, -1)}>Rotate down</Button>
            <Button variant="outline" size="sm" onClick={() => view.current?.zoom(1)}>Zoom in</Button>
            <Button variant="outline" size="sm" onClick={() => view.current?.zoom(-1)}>Zoom out</Button>
            <Button variant="outline" size="sm" onClick={() => view.current?.reset()}>Reset view</Button>
            <Button
              variant="outline"
              size="sm"
              aria-pressed={autoRotate && !reducedMotion}
              disabled={reducedMotion}
              onClick={() => setAutoRotate(!autoRotate)}
            >
              Auto-rotate{reducedMotion ? ' (off: reduced motion)' : ''}
            </Button>
          </div>
        </div>

        <aside className="w-full shrink-0 md:w-64" aria-label="Inspector">
          <h2 className="mb-2 text-lg font-medium">Atoms</h2>
          <p data-testid="selection" role="status" className="mb-2 text-sm">
            {selected === null ? 'No atom selected' : `Selected atom ${selected}: ${atomLabel(molecule, selected)}`}
          </p>
          <ul className="flex flex-col gap-1">
            {molecule.atoms.map((atom, i) => (
              <li key={i}>
                <Button
                  variant={selected === i ? 'default' : 'outline'}
                  className="w-full justify-start"
                  aria-pressed={selected === i}
                  onClick={() => setSelected(selected === i ? null : i)}
                >
                  {atomLabel(molecule, i)}
                  <span className="text-xs opacity-70">{elementStyle(atom.element).name}</span>
                </Button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  )
}

function ViewerMessage({ children }: { children: ReactNode }) {
  return <p className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">{children}</p>
}

/** Stand-in for describeMolecule(). */
function describe(m: ViewMolecule): string {
  const counts = new Map<string, number>()
  for (const a of m.atoms) counts.set(a.element, (counts.get(a.element) ?? 0) + 1)
  const parts = [...counts].map(([el, n]) => `${n} ${elementStyle(el).name}`)
  const [a, b, c] = [m.atoms[1], m.atoms[0], m.atoms[2]]
  const angle = a && b && c ? ` The ${a.element}–${b.element}–${c.element} angle is ${angleDeg(a.position, b.position, c.position).toFixed(1)}°.` : ''
  return `${m.name}: ${m.atoms.length} atoms (${parts.join(', ')}) joined by ${m.bonds.length} bonds.${angle}`
}

/** Catches a failed chunk load and "WebGL is not available" from the renderer. */
class ViewerBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
```

#### `src/app/useReducedMotion.ts`

```ts
import { useSyncExternalStore } from 'react'

// AppStateProvider writes the resolved preference (OS setting or the learner's
// override) to <html data-reduced-motion="true|false">. CSS reads it with an
// attribute selector; JS-driven motion (the 3D scene) reads it with this hook.

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-reduced-motion'] })
  return () => observer.disconnect()
}

const getSnapshot = () => document.documentElement.dataset.reducedMotion === 'true'

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot)
}
```

#### `src/app/explore/spikeMolecules.ts`

```ts
// SPIKE DATA ONLY. Phase 2 reads molecules from src/chem-data; these two are
// hand-typed so the viewer can be tried before the library exists.
import type { Vec3 } from '@/chem-data/geometry'

export interface ViewAtom {
  element: string
  position: Vec3
}

export interface ViewBond {
  a: number
  b: number
  order: 1 | 2 | 3
}

export interface ViewMolecule {
  id: string
  name: string
  atoms: ViewAtom[]
  bonds: ViewBond[]
}

const HALF_HOH = (104.52 / 2) * (Math.PI / 180)

export const WATER: ViewMolecule = {
  id: 'water',
  name: 'Water',
  atoms: [
    { element: 'O', position: [0, 0, 0] },
    { element: 'H', position: [0.9572 * Math.sin(HALF_HOH), -0.9572 * Math.cos(HALF_HOH), 0] },
    { element: 'H', position: [-0.9572 * Math.sin(HALF_HOH), -0.9572 * Math.cos(HALF_HOH), 0] },
  ],
  bonds: [
    { a: 0, b: 1, order: 1 },
    { a: 0, b: 2, order: 1 },
  ],
}

export const FORMALDEHYDE: ViewMolecule = {
  id: 'formaldehyde',
  name: 'Formaldehyde',
  atoms: [
    { element: 'C', position: [0, 0, 0] },
    { element: 'O', position: [0, 1.205, 0] },
    { element: 'H', position: [0.943, -0.587, 0] },
    { element: 'H', position: [-0.943, -0.587, 0] },
  ],
  bonds: [
    { a: 0, b: 1, order: 2 },
    { a: 0, b: 2, order: 1 },
    { a: 0, b: 3, order: 1 },
  ],
}

export const SPIKE_MOLECULES = [WATER, FORMALDEHYDE]

/** CPK-style colour and a ball-and-stick display radius in angstroms. Spike values. */
export const ELEMENT_STYLE: Record<string, { name: string; color: string; radius: number }> = {
  H: { name: 'hydrogen', color: '#f2f2f2', radius: 0.25 },
  C: { name: 'carbon', color: '#4a4a4a', radius: 0.38 },
  O: { name: 'oxygen', color: '#e0281e', radius: 0.36 },
}
const UNKNOWN_ELEMENT = { name: 'unknown element', color: '#d68fd6', radius: 0.35 }

export function elementStyle(element: string) {
  return ELEMENT_STYLE[element] ?? UNKNOWN_ELEMENT
}

/** "O 1", "H 2", "H 3": the label shared by the DOM list and the selection read-out. */
export function atomLabel(molecule: ViewMolecule, index: number): string {
  const atom = molecule.atoms[index]
  return atom ? `${atom.element} ${index + 1}` : `atom ${index + 1}`
}
```

### 4.3 Config changes (goal 7)

#### `eslint.config.js` (diff against the real repo)

```diff
--- a/eslint.config.js
+++ b/eslint.config.js
@@ -12,6 +12,8 @@
 const NO_NETWORK = 'No network at runtime: all chem-data is bundled.'
 const NO_DOM = 'engine/, chem-data/ and mechanisms/ must not touch the DOM.'
 const NO_CLOCK = 'engine/ must not read the clock: take time as an argument.'
+const NO_EAGER_THREE =
+  'Three.js is imported only inside a scene/ folder, which pages load with React.lazy. A static import anywhere else puts about 900 kB into the main bundle.'
 
 const NETWORK_GLOBALS = [
   { name: 'fetch', message: NO_NETWORK },
@@ -78,6 +80,30 @@
     },
   },
 
+  // Three.js stays in the lazily loaded scene/ folders, out of the main bundle.
+  // (The pure folders have their own, stricter block above.)
+  {
+    files: ['src/app/**/*.{ts,tsx}', 'src/main.tsx'],
+    ignores: ['src/app/**/scene/**'],
+    rules: {
+      'no-restricted-imports': [
+        'error',
+        {
+          paths: [{ name: 'three', message: NO_EAGER_THREE }],
+          patterns: [
+            { group: ['three/*', '@react-three/*'], message: NO_EAGER_THREE },
+            {
+              // A value import of a scene module would drag Three.js along with it.
+              regex: '/scene/',
+              allowTypeImports: true,
+              message: 'Import scene/ modules with import type, or load them with React.lazy(() => import(...)).',
+            },
+          ],
+        },
+      ],
+    },
+  },
+
   // The engine is deterministic: no Math.random, no clock.
   {
     files: ['src/engine/**/*.{ts,tsx}'],
```

#### `src/lint-rules.test.ts` (diff against the real repo)

```diff
--- a/src/lint-rules.test.ts
+++ b/src/lint-rules.test.ts
@@ -93,16 +93,48 @@
     ])
   })
 
-  it('accepts React, Three.js, the DOM, Math.random, and the clock in src/app', async () => {
+  it('accepts React, the DOM, Math.random, and the clock in src/app', async () => {
     const code = [
       'import { useState } from "react"',
-      'import * as THREE from "three"',
-      'export const a = [useState, THREE, Math.random(), Date.now(), new Date(), document.title, window.innerWidth]',
+      'export const a = [useState, Math.random(), Date.now(), new Date(), document.title, window.innerWidth]',
       '',
     ].join('\n')
     expect(await ruleIds(code, 'src/app/x.tsx')).toEqual([])
   })
 
+  it('accepts Three.js and React Three Fiber inside a scene folder', async () => {
+    const code = [
+      'import * as THREE from "three"',
+      'import { Canvas } from "@react-three/fiber"',
+      'import { OrbitControls } from "three/addons/controls/OrbitControls.js"',
+      'import { helper } from "./helper"',
+      'export const a = [THREE, Canvas, OrbitControls, helper]',
+      '',
+    ].join('\n')
+    expect(await ruleIds(code, 'src/app/explore/scene/x.tsx')).toEqual([])
+    expect(await ruleIds(code, 'src/app/learn/scene/x.test.ts')).toEqual([])
+  })
+
+  it.each(['three', 'three/addons/controls/OrbitControls.js', '@react-three/fiber'])(
+    'rejects importing %s in src/app outside a scene folder',
+    async (source) => {
+      const code = `import * as m from "${source}"\nexport const v = m\n`
+      expect(await ruleIds(code, 'src/app/pages/x.tsx')).toEqual(['no-restricted-imports'])
+      expect(await ruleIds(code, 'src/main.tsx')).toEqual(['no-restricted-imports'])
+    },
+  )
+
+  it('rejects a static import of a scene module outside a scene folder, but allows type imports and lazy loading', async () => {
+    const eager = 'import { MoleculeViewer } from "@/app/explore/scene/MoleculeViewer"\nexport const v = MoleculeViewer\n'
+    expect(await ruleIds(eager, 'src/app/pages/x.tsx')).toEqual(['no-restricted-imports'])
+    const relative = 'import { MoleculeViewer } from "../explore/scene/MoleculeViewer"\nexport const v = MoleculeViewer\n'
+    expect(await ruleIds(relative, 'src/app/pages/x.tsx')).toEqual(['no-restricted-imports'])
+    const typeOnly = 'import type { ViewHandle } from "@/app/explore/scene/MoleculeViewer"\nexport type V = ViewHandle\n'
+    expect(await ruleIds(typeOnly, 'src/app/pages/x.tsx')).toEqual([])
+    const lazy = 'export const load = () => import("@/app/explore/scene/MoleculeViewer")\n'
+    expect(await ruleIds(lazy, 'src/app/pages/x.tsx')).toEqual([])
+  })
+
   it('accepts Math.random and the clock in chem-data and mechanisms', async () => {
     const code = 'export const a = [Math.random(), Date.now(), new Date()]\n'
     expect(await ruleIds(code, 'src/chem-data/x.ts')).toEqual([])
```

#### `vite.config.ts` (diff against the real repo)

```diff
--- a/vite.config.ts
+++ b/vite.config.ts
@@ -11,6 +11,11 @@
       '@': path.resolve(import.meta.dirname, './src'),
     },
   },
+  build: {
+    // The lazy 3D chunk (three + @react-three/fiber) is about 935 kB minified, 247 kB gzip.
+    // It is loaded only by Explore and Learn. Raise the limit so the warning keeps its meaning.
+    chunkSizeWarningLimit: 1000,
+  },
   test: {
     environment: 'node',
     include: ['src/**/*.test.ts'],
```

## 5. Typecheck, lint, build, chunk sizes (goal 3)

All three exit 0. `npm run build` output (fonts omitted):

```
 Test Files  11 passed (11)
      Tests  151 passed (151)
dist/index.html                              0.52 kB │ gzip:   0.33 kB
dist/assets/index-t3qV24vL.css              27.70 kB │ gzip:   5.91 kB
dist/assets/index-C0n1dILl.js              468.25 kB │ gzip: 147.88 kB
dist/assets/MoleculeViewer-C3Mo1B_b.js     934.70 kB │ gzip: 247.05 kB
```

| Chunk | Raw bytes | gzip (Vite) | gzip -9 |
| --- | --- | --- | --- |
| Main, real repo today (`dist/assets/index-mt9jHBc_.js`) | 462,712 | not rebuilt | 144,063 |
| Main, spike | 468,258 | 147.88 kB | 145,976 |
| Lazy 3D chunk | 934,702 | 247.05 kB | 243,276 |

**Three.js is not in the main chunk:**

```
index-C0n1dILl.js           WebGLRenderer=0  gl_Position=0
MoleculeViewer-C3Mo1B_b.js  WebGLRenderer=6  gl_Position=12
```

(counts of lines matching each string). The main chunk contains ``import(`./MoleculeViewer-C3Mo1B_b.js`)``, and `index.html` has no preload for it. In the browser, the home page made no request matching `MoleculeViewer|three`; the request appeared on navigating to Explore.

The 3D chunk imports React from the main chunk, so React is not duplicated.

Before `chunkSizeWarningLimit` was raised, Vite printed "Some chunks are larger than 500 kB after minification". It is a warning and does not fail the build.

## 6. Headless browser evidence (goal 4)

Playwright 1.63 from `browser-check/node_modules`, Chromium headless, 1366x768. Script: `./browser/check.cjs`. It counts WebGL draw calls by wrapping `drawElements`/`drawArrays` in an init script, and reads pixels by decoding Playwright screenshots, so "it rendered" and "it stopped rendering" are numbers.

**26 of 26 pass on the production preview and on the dev server.** Production run:

```
{"check":"home page does not request the 3D chunk","result":"pass","evidence":[]}
{"check":"explore requests the 3D chunk on demand","result":"pass","evidence":["assets/MoleculeViewer-C3Mo1B_b.js"]}
{"check":"canvas mounted with a WebGL2 context","result":"pass","evidence":{"canvasOk":true,"webgl":{"version":"WebGL 2.0 (OpenGL ES 3.0 Chromium)","renderer":"ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)"}}}
{"check":"canvas renders non-blank pixels","result":"pass","evidence":{"distinctColours":888,"redPixels":10353,"ringPixels":0}}
{"check":"idle scene makes no draw calls (frameloop=demand)","result":"pass","evidence":{"drawCallsDuringIdleSecond":0,"totalSoFar":5}}
{"check":"initial selection text","result":"pass","evidence":"No atom selected"}
{"check":"clicking the oxygen atom updates the DOM selection","result":"pass","evidence":{"text":"Selected atom 0: O 1","clickedAt":{"x":650.4937699217618,"y":297.02250555394573}}}
{"check":"clicked atom shows the selection ring in the scene","result":"pass","evidence":{"ringPixels":4435,"ringCentre":[418.5485907553551,136.8293122886133],"oxygenCentre":[418.5113227718923,145.02352026436]}}
{"check":"DOM list reflects the canvas selection","result":"pass","evidence":["O 1\noxygen"]}
{"check":"clicking empty canvas clears the selection","result":"pass","evidence":{"text":"No atom selected","ringPixels":0}}
{"check":"choosing H 2 in the DOM list (keyboard) highlights it in the scene","result":"pass","evidence":{"text":"Selected atom 1: H 2","ringPixels":2227,"ringCentre":[548,245],"oxygenCentre":[418,145]}}
{"check":"Tab then Space moves the selection to H 3 (left of the oxygen)","result":"pass","evidence":{"text":"Selected atom 2: H 3","ringCentre":[289,245]}}
{"check":"dragging rotates the view and does not select","result":"pass","evidence":{"imageChanged":true,"text":"No atom selected"}}
{"check":"mouse wheel zooms in","result":"pass","evidence":{"redPixelsBefore":11219,"after":17591}}
{"check":"Reset / Rotate left / Zoom in buttons drive the camera","result":"pass","evidence":{"resetMatchesFirstFrame":true,"rotatedChanged":true,"redBeforeZoom":10296,"redAfterZoom":14962}}
{"check":"with motion allowed, damping keeps rendering after release and then stops","result":"pass","evidence":{"drawsFirst100ms":35,"draws100to3100ms":460,"drawsAfter3100ms":0}}
{"check":"auto-rotate renders continuously","result":"pass","evidence":{"drawCallsInOneSecond":305}}
{"check":"reduced motion stops auto-rotation","result":"pass","evidence":{"dataReducedMotion":"true","drawCallsInOneSecond":0,"buttonText":"Auto-rotate (off: reduced motion)"}}
{"check":"reduced motion removes damping (no frames after release)","result":"pass","evidence":{"drawsFirst100ms":0,"draws100to3100ms":0,"drawsAfter3100ms":0}}
{"check":"auto-rotation resumes when reduced motion is turned off","result":"pass","evidence":{"drawCallsIn600ms":185}}
{"check":"switching molecule re-renders and rebuilds the list","result":"pass","evidence":{"atoms":["C 1 carbon","O 2 oxygen","H 3 hydrogen","H 4 hydrogen"],"redPixels":4583}}
{"check":"canvas wrapper is an img with a name and a description","result":"pass","evidence":{"description":"Water: 3 atoms (1 oxygen, 2 hydrogen) joined by 2 bonds. The H–O–H angle is 104.5°."}}
{"check":"context loss shows a notice; restore redraws and selection still works","result":"pass","evidence":{"noticeWhileLost":1,"noticeAfterRestore":0,"redPixelsAfterRestore":10355,"ringPixelsAfterSelecting":4435}}
{"check":"3 round trips Home <-> Explore still render","result":"pass","evidence":{"redPixels":10353}}
{"check":"reload on #/explore renders","result":"pass","evidence":{"redPixels":10353}}
{"check":"narrow viewport renders","result":"pass","evidence":{"canvasBox":[316,420],"redPixels":6181}}
```

How to read it:

- **Non-blank canvas:** 888 distinct colours, 10,353 oxygen-red pixels.
- **Click on an atom:** the script finds the centroid of the red pixels, clicks there, and the DOM text changes from `No atom selected` to `Selected atom 0: O 1`. The list button for O 1 becomes `aria-pressed`, and 4,435 ring-blue pixels appear centred on the oxygen.
- **DOM list drives the scene:** focusing `H 2` and pressing Enter puts the ring at (548, 245), right of and below the oxygen at (418, 145). Tab then Space moves it to H 3 at (289, 245).
- **Drag does not select:** a drag that starts and ends on the oxygen rotates the view and leaves the selection empty (the `e.delta > 4` guard).
- **`frameloop="demand"`:** 0 draw calls in an idle second. Auto-rotate: about 300 a second (5 meshes at 60 fps).
- **Reduced motion** (`page.emulateMedia({ reducedMotion: 'reduce' })`, which flips `data-reduced-motion` to `"true"` through the existing AppState): auto-rotation stops (0 draws), no frames after a drag is released, and both come back when it is turned off.

Screenshots in `./browser/`: `prod-1-water.png`, `prod-2-oxygen-selected.png`, `prod-3-h2-from-list.png`, `prod-5-formaldehyde.png` (double bond as two parallel cylinders in the molecular plane), `prod-7-narrow.png`.

### WebGL flags in headless Chromium

**None were needed.** With `args: []` Chromium falls back to SwiftShader by itself and all 26 checks pass. Every flag set gave the same renderer, `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)`, WebGL 2.0.

| Launch args | Checks | Console noise from the driver |
| --- | --- | --- |
| `[]` | 26/26 | 4x `GL Driver Message … GPU stall due to ReadPixels` |
| `['--enable-unsafe-swiftshader']` | 26/26 | same |
| `['--use-gl=swiftshader','--enable-unsafe-swiftshader']` | 26/26 | same |
| `['--use-angle=swiftshader']` | 26/26 on the final run | none |
| `['--disable-gpu','--disable-software-rasterizer']` | no WebGL: fallback text shown | three logs the context-creation error |

Use `--use-angle=swiftshader` for a clean console. The `ReadPixels` warning comes from the software GL path, appears before any screenshot is taken, and is not from app code. One earlier `--use-angle` run failed a damping-timing assertion because my wait was shorter than the damping tail (about 2 s); I lengthened the wait and it has passed since.

### Console errors and warnings

- **Production and dev (StrictMode), final code:** no errors and no warnings. The only three.js output is the two `log` lines produced when the script deliberately loses and restores the context.
- **Before the filter was added:** `warning: THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.` once per Canvas mount (6 times in the run). It comes from `new THREE.Clock()` in `@react-three/fiber/dist/events-*.js`. The deprecation was added in three r183.
- **React 19 StrictMode:** no extra warnings. The double effect run connects, disconnects and reconnects the controls, which is symmetric. Three round trips Home ↔ Explore render correctly each time.
- **Context loss:** forced with `WEBGL_lose_context`. The page shows the status notice, three restores itself on `webglcontextrestored`, the notice clears, the scene redraws (10,355 red pixels) and selection still works. The watcher must call `preventDefault()` on `webglcontextlost` or the browser will not restore.
- **No WebGL at all** (`node nogl.cjs`): the boundary shows "The 3D view could not start in this browser. The atom list and description still work.", and selecting `H 2` in the list still updates the selection text. Blocking the chunk request shows the same fallback.

## 7. Accessibility and reduced motion (goal 6)

**Accessible name and text alternative.** `<Canvas>` spreads unknown props onto the wrapper `<div>` it renders around the `<canvas>`, so `role="img"`, `aria-label` and `aria-describedby` go straight on `<Canvas>`. Rendered DOM:

```html
<div role="img" aria-label="3D ball-and-stick model of Water" aria-describedby="_r_0_" style="…">
  <div style="…"><canvas data-engine="three.js r186" width="836" height="418"></canvas></div>
</div>
```

The description is a visible paragraph under the canvas (in Phase 2, the output of `describeMolecule`). Accessibility tree of the page:

```
- main:
  - navigation "Breadcrumb":
    - link "Home":
      - /url: "#/"
    - text: Explore
  - heading "Explore" [level=1]
  - group "Molecule":
    - button "Water" [pressed]
    - button "Formaldehyde"
  - img "3D ball-and-stick model of Water"
  - paragraph: "Water: 3 atoms (1 oxygen, 2 hydrogen) joined by 2 bonds. The H–O–H angle is 104.5°."
  - group "3D view":
    - button "Rotate left"
    - button "Rotate right"
    - button "Rotate up"
    - button "Rotate down"
    - button "Zoom in"
    - button "Zoom out"
    - button "Reset view"
    - button "Auto-rotate"
  - complementary "Inspector":
    - heading "Atoms" [level=2]
    - status: No atom selected
    - list:
      - listitem:
        - button "O 1 oxygen"
      - listitem:
        - button "H 2 hydrogen"
      - listitem:
        - button "H 3 hydrogen"
```

The canvas is not focusable and takes no keyboard input. Everything it does has a DOM equivalent:

- **Selection:** the atom list, toggle buttons with `aria-pressed`, plus a `role="status"` line that announces the selection. Toggle buttons rather than a listbox because the measure tool needs three or four atoms selected at once.
- **Camera:** Rotate left/right/up/down, Zoom in/out, Reset view. These call `OrbitControls.rotateLeft/rotateUp/dollyIn/dollyOut/reset` through a ref handle. Without them the camera is mouse-only, which fails spec 11 "full keyboard operation".
- **Not colour alone:** the selected atom gets an outline shell (a shape), and the list shows the same state in text.

**Reduced motion.** `useReducedMotion()` reads `<html data-reduced-motion>` with `useSyncExternalStore` and a `MutationObserver`; no change to `AppState.tsx`. When true:

- `controls.enableDamping = false`: no inertia after a drag (0 frames after release, against about 90 frames with damping).
- `controls.autoRotate = false`, and the Auto-rotate button is disabled and says why.
- The view buttons snap instead of easing.
- Dragging still works: motion the learner drives directly is not what the preference is about.

Auto-rotate is off by default regardless.

**`frameloop="demand"`.** R3F renders one frame when a prop changes or `invalidate()` is called. The controls call `invalidate()` on their `change` event, and `useFrame` calls `controls.update(delta)`, which keeps firing `change` only while damping or auto-rotation is still moving the camera. So the loop sustains itself during motion and stops by itself. Toggling auto-rotate needs one explicit `invalidate()` to start it.

## 8. What the existing config trips over (goal 7)

**Nothing.** No change to `tsconfig.app.json`, `tsconfig.node.json` or `eslint.config.js` was required.

- `jsx: "react-jsx"` with `types: ["vite/client"]`: R3F's JSX element types (`<mesh>`, `<sphereGeometry>`…) arrive through the `@react-three/fiber` import. No `types` entry or `declare` needed.
- `verbatimModuleSyntax`: `import type { ViewHandle }` in `Explore.tsx` is erased, so it does not pull the 3D chunk into main. A plain `import { … }` of a type from that file would.
- `noUncheckedIndexedAccess`: `molecule.atoms[i]` is `ViewAtom | undefined`. The viewer guards; tests use `!`.
- `noUnusedLocals`/`noUnusedParameters`: no problems.
- ESLint: there is no `react-hooks` plugin in the config, so nothing checks effect dependency arrays in the R3F components. The existing pure-folder block already bans `three`, `three/*` and `@react-three/*` there (`three/addons/...` is caught by `three/*`).

**Optional guard I added and tested** (section 4.3): `three` and `@react-three/*` may be imported only under `src/app/**/scene/`, and other `src/app` files may import a `scene/` module only with `import type` or a dynamic `import()`. The reason: one stray static import silently moves 935 kB into the main bundle and nothing else would notice. Costs:

- The existing test "accepts React, Three.js, the DOM, Math.random, and the clock in src/app" imports three from `src/app/x.tsx` and fails under the guard. I replaced it and added four tests (28 pass).
- `allowTypeImports` on a `no-restricted-imports` pattern is accepted by core ESLint 10.12 with the typescript-eslint parser.
- Pure helpers that live in `scene/` (`sceneMath.ts`) can then only be value-imported from other `scene/` files. If the page needs one, move it out of `scene/`.

**`vite.config.ts`:** `build.chunkSizeWarningLimit: 1000` silences the 500 kB warning for the 3D chunk. Optional.

## 9. Gotchas

1. **`OrbitControls.reset()` keeps leftover inertia.** With damping on, `reset()` restores the saved position and then the remaining `_sphericalDelta` carries the camera off again. Pixel diff against the first frame after "drag, wait 1.5 s, reset": 3,644 differing channels before the fix, 0 after. Fix: call `update()` once with `enableDamping = false` before `reset()`.
2. **`rotateLeft()` under damping eases in** over about 2 s (`dampingFactor` 0.05) and stops just short of the full angle when the remainder drops below epsilon. Fine for a view button; do not use it where an exact angle matters.
3. **R3F fires `onClick` after a drag** that starts and ends on the same object. Check `e.delta` (pixels moved) and ignore large values.
4. **`e.stopPropagation()` in `onClick`** is needed or every atom along the ray is selected in turn.
5. **`onPointerMissed` on `<Canvas>`** is the "clicked empty space" event. Verified for a plain click. Not verified: whether an orbit drag that starts on empty space also fires it and so clears the selection; check this by hand.
6. **The Canvas fills its parent**; the parent needs an explicit height (`h-[420px]`) or the canvas is 0 px tall.
7. **The selection shell must not be raycast** (`raycast={() => null}`) or it swallows clicks meant for the atom.
8. **`React.lazy` caches a failed import.** If the chunk fails to load, the boundary fallback stays until the page is reloaded. The spike shows one message for both "chunk failed" and "no WebGL".
9. **`useReducedMotion` reads `false` for the very first render** after a hard reload, because AppState writes the attribute in an effect. The observer corrects it right after, and auto-rotate is off by default, so nothing moves. Exposing the resolved boolean from the AppState context would remove the gap.
10. **three public API moved recently:** `rotateLeft`, `rotateUp`, `dollyIn`, `dollyOut` on `OrbitControls` are public from r183. On 0.182 they are underscore-private and untyped.
11. **Sharing one geometry across meshes with `geometry={shared}`** is unnecessary here; if it is ever done, add `dispose={null}`, because R3F disposes an unmounted mesh's geometry and material (from memory of R3F's behaviour; not tested here).
12. **Do not `pkill -f "vite preview"` from a script whose own command line contains that text**; it kills the calling shell (it did here, harmlessly).

## 10. Not done

- Bond selection in the canvas (spec 6.3 wants atoms and bonds). The same pattern applies: `onClick` on the bond's `<group>`.
- Multi-select for the measure tool; the spike holds one index.
- Space-filling, wireframe, aromatic rendering, lone pairs, orbital lobes.
- A route-level `lazy` variant (react-router's `lazy` on the route object) was not built or measured.
- drei was not installed, so its bundle cost is not measured.
- Only Chromium with SwiftShader was tested. No real GPU, Firefox, Safari or touch device.
- Theme: the canvas is transparent, so the card background shows through in light and dark, but atom colours were checked only in light mode. White hydrogens on a white card have low contrast (visible in `prod-1-water.png`).
