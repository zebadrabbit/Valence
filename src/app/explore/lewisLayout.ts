// Where everything in the 2D Lewis view goes, as plain numbers, so Vitest can check it in node.
// The stored 2D positions (a bond is about 1 long, y up) are scaled by UNIT and turned so y points
// down, as SVG has it. Angles are in radians, measured the SVG way: 0 is right, +90° is down.

import { formulaParts } from '@/chem-data/formula'
import type { Molecule } from '@/chem-data/schema'

export type Point = readonly [number, number]
export type Line = { from: Point; to: Point; dashed: boolean }
export type Box = { x: number; y: number; width: number; height: number }

export type LewisAtom = {
  position: Point
  symbol: string
  /** The radius round the symbol that bond lines stay out of. */
  clear: number
  /** The formal charge as written beside the atom ("+", "2−"), or null when it is zero. */
  charge: { text: string; position: Point } | null
  /** The two dots of each lone pair. */
  lonePairs: (readonly [Point, Point])[]
}

export type LewisBond = {
  lines: Line[]
  /** For the selection mark and the click target: the middle, the direction in degrees, the drawn length and the width across all the lines. */
  middle: Point
  angle: number
  length: number
  width: number
}

export type LewisLayout = { viewBox: Box; atoms: LewisAtom[]; bonds: LewisBond[] }

// Drawing parameters. These are layout choices, not chemistry.
/**
 * SVG units per stored drawing unit. The SVG is scaled to its frame, so this sets no size on
 * screen; it keeps the numbers near whole pixels, because browsers hit-test small fractions of
 * an SVG unit unreliably.
 */
export const UNIT = 100
export const FONT_SIZE = 36
export const DOT_RADIUS = 3.5
/** Room for one-letter and two-letter symbols. */
const CLEAR = [20, 27] as const
/** Lone-pair dots sit this far outside the symbol's clear radius, and this far to each side of their direction. */
const PAIR_GAP = 10
const PAIR_SPREAD = 7
const CHARGE_GAP = 20
/** Distance between the parallel lines of a double or triple bond, and from an aromatic bond to its dashed line. */
const LINE_SPACING = 10
const AROMATIC_SPACING = 13
/** The dashed line of an aromatic bond is shorter than the bond by this fraction at each end. */
const AROMATIC_INSET = 0.12
/** The smallest drawing area, so a diatomic is not blown up to fill the frame. */
const MIN_WIDTH = 440
const MIN_HEIGHT = 310
const MARGIN = 25

const TAU = 2 * Math.PI
/** Gaps within this of each other (about 3°) count as equal: stored drawings are rounded to four decimals. */
const SAME = 0.05
const UP = -Math.PI / 2
const turn = (angle: number) => ((angle % TAU) + TAU) % TAU
/** The smaller angle between two directions, 0 to π. */
const between = (a: number, b: number) => Math.PI - Math.abs(Math.PI - turn(a - b))
const polar = (centre: Point, angle: number, radius: number): Point => [
  centre[0] + radius * Math.cos(angle),
  centre[1] + radius * Math.sin(angle),
]

/** A box centred on the points that holds them all with a margin, and is at least the given size. */
export function fitViewBox(points: readonly Point[], margin: number, minWidth: number, minHeight: number): Box {
  if (points.length === 0) throw new Error('view box of no points')
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  const [left, right, top, bottom] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const width = Math.max(right - left + 2 * margin, minWidth)
  const height = Math.max(bottom - top + 2 * margin, minHeight)
  return { x: (left + right - width) / 2, y: (top + bottom - height) / 2, width, height }
}

/**
 * Directions for `count` lone pairs round an atom whose bonds leave in the `occupied` directions.
 * Each pair goes into the widest gap between bonds; pairs that share a gap divide it evenly.
 * Between equally good gaps the wider one wins, then the one furthest from the pairs already
 * placed, then the one nearest the top, so water's pairs sit together opposite the hydrogens,
 * xenon tetrafluoride's sit across from each other and ammonia's sits on top when its three
 * bonds are drawn evenly. With no bonds the pairs are spread evenly from the top.
 */
export function gapAngles(occupied: readonly number[], count: number): number[] {
  if (occupied.length === 0) return Array.from({ length: count }, (_, i) => turn(UP + (i * TAU) / count))
  const sorted = occupied.map(turn).sort((a, b) => a - b)
  const gaps = sorted.map((start, i) => {
    const size = sorted.length === 1 ? TAU : turn(sorted[(i + 1) % sorted.length]! - start)
    return { start, size, pairs: 0 }
  })
  const middle = (gap: (typeof gaps)[number]) => gap.start + gap.size / 2
  for (let placed = 0; placed < count; placed++) {
    const used = gaps.filter((gap) => gap.pairs > 0)
    const apart = (gap: (typeof gaps)[number]) => Math.min(...used.map((other) => between(middle(gap), middle(other))))
    const better = (a: (typeof gaps)[number], b: (typeof gaps)[number]) => {
      const share = a.size / (a.pairs + 1) - b.size / (b.pairs + 1)
      if (Math.abs(share) > SAME) return share > 0
      if (Math.abs(a.size - b.size) > SAME) return a.size > b.size
      if (used.length > 0 && Math.abs(apart(a) - apart(b)) > SAME) return apart(a) > apart(b)
      return between(middle(a), UP) < between(middle(b), UP) - SAME
    }
    gaps.reduce((best, gap) => (better(gap, best) ? gap : best)).pairs += 1
  }
  return gaps.flatMap((gap) => Array.from({ length: gap.pairs }, (_, j) => turn(gap.start + (gap.size * (j + 1)) / (gap.pairs + 1))))
}

// Upper right first, as a charge is usually written; then the other corners, then the sides.
const CHARGE_ANGLES = [-45, -135, 45, 135, -90, 0, 180, 90].map((degrees) => (degrees * Math.PI) / 180)

/** A charge this far (40°) from every bond and lone pair has room enough. */
const CHARGE_ROOM = (40 * Math.PI) / 180

/**
 * Where to write the formal charge: the first candidate direction with room round it, or,
 * when the atom is crowded, the one furthest from every bond and lone pair.
 */
export function chargeAngle(occupied: readonly number[]): number {
  const room = (angle: number) => Math.min(Math.PI, ...occupied.map((other) => between(angle, other)))
  return CHARGE_ANGLES.find((angle) => room(angle) >= CHARGE_ROOM) ?? CHARGE_ANGLES.reduce((best, angle) => (room(angle) > room(best) + 1e-9 ? angle : best))
}

/**
 * The lines of one bond from a to b, stopping `clearA` and `clearB` short of the atoms' centres.
 * Orders 2 and 3 are parallel lines centred on the bond. An aromatic bond is a full line with a
 * shorter dashed line beside it, on the side of `toward` (the ring centre): delocalised, not a
 * single or a double bond.
 */
export function bondLines(a: Point, b: Point, kind: 1 | 2 | 3 | 'aromatic', clearA: number, clearB: number, toward?: Point): Line[] {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1])
  if (length === 0) throw new Error('a bond between two atoms at one point')
  const along: Point = [(b[0] - a[0]) / length, (b[1] - a[1]) / length]
  let side: Point = [-along[1], along[0]]
  if (toward && (toward[0] - a[0]) * side[0] + (toward[1] - a[1]) * side[1] < 0) side = [-side[0], -side[1]]
  const line = (offset: number, inset: number, dashed: boolean): Line => {
    const at = (distance: number): Point => [a[0] + along[0] * distance + side[0] * offset, a[1] + along[1] * distance + side[1] * offset]
    return { from: at(clearA + inset), to: at(length - clearB - inset), dashed }
  }
  if (kind === 'aromatic') return [line(0, 0, false), line(AROMATIC_SPACING, (length - clearA - clearB) * AROMATIC_INSET, true)]
  return Array.from({ length: kind }, (_, i) => line((i - (kind - 1) / 2) * LINE_SPACING, 0, false))
}

/** The Lewis structure of a molecule laid out from its stored 2D positions, lone-pair counts and formal charges. */
export function lewisLayout(molecule: Molecule): LewisLayout {
  // The stored drawing has y up.
  const positions = molecule.atoms.map((atom): Point => [atom.position2d[0] * UNIT, -atom.position2d[1] * UNIT])
  const clears = molecule.atoms.map((atom) => CLEAR[Math.min(atom.element.length, 2) - 1]!)

  const atoms = molecule.atoms.map((atom, i): LewisAtom => {
    const here = positions[i]!
    const clear = clears[i]!
    const bonds = molecule.bonds.flatMap((bond) => {
      if (bond.a !== i && bond.b !== i) return []
      const there = positions[bond.a === i ? bond.b : bond.a]!
      return [Math.atan2(there[1] - here[1], there[0] - here[0])]
    })
    const pairs = gapAngles(bonds, atom.lonePairs)
    // The superscript of the symbol written as an ion is its charge in the app's notation.
    const text = formulaParts(atom.element, atom.formalCharge).find((part) => part.kind === 'superscript')?.text
    return {
      position: here,
      symbol: atom.element,
      clear,
      charge: text === undefined ? null : { text, position: polar(here, chargeAngle([...bonds, ...pairs]), clear + CHARGE_GAP) },
      lonePairs: pairs.map((angle) => {
        const centre = polar(here, angle, clear + PAIR_GAP)
        return [polar(centre, angle + Math.PI / 2, PAIR_SPREAD), polar(centre, angle - Math.PI / 2, PAIR_SPREAD)] as const
      }),
    }
  })

  // ponytail: one centre for every aromatic atom, right while benzene is the only aromatic
  // molecule in the library. Fused or separate rings need ring perception (as in the 3D scene).
  const aromatic = [...new Set(molecule.bonds.filter((b) => b.aromatic).flatMap((b) => [b.a, b.b]))].map((i) => positions[i]!)
  const ringCentre: Point | undefined =
    aromatic.length > 0
      ? [aromatic.reduce((sum, p) => sum + p[0], 0) / aromatic.length, aromatic.reduce((sum, p) => sum + p[1], 0) / aromatic.length]
      : undefined

  const bonds = molecule.bonds.map((bond): LewisBond => {
    const a = positions[bond.a]!
    const b = positions[bond.b]!
    return {
      lines: bondLines(a, b, bond.aromatic ? 'aromatic' : bond.order, clears[bond.a]!, clears[bond.b]!, ringCentre),
      middle: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
      angle: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI,
      length: Math.hypot(b[0] - a[0], b[1] - a[1]) - clears[bond.a]! - clears[bond.b]!,
      width: bond.aromatic ? 2 * AROMATIC_SPACING : (bond.order - 1) * LINE_SPACING,
    }
  })

  // Everything drawn round an atom fits inside this reach: the charge, or the lone-pair dots.
  const reach = (atom: LewisAtom) => atom.clear + CHARGE_GAP + FONT_SIZE / 2
  const corners = atoms.flatMap((atom): Point[] => [
    [atom.position[0] - reach(atom), atom.position[1] - reach(atom)],
    [atom.position[0] + reach(atom), atom.position[1] + reach(atom)],
  ])
  return { viewBox: fitViewBox(corners, MARGIN, MIN_WIDTH, MIN_HEIGHT), atoms, bonds }
}
