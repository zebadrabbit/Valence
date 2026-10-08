// What the 3D scene of a mechanism timeline draws at one scrub position, as plain data worked out from
// `state(mechanism, t)` and the element table and from nothing else, so that a frame is the same whichever way the
// scrub position was reached (spec 9.1). Vitest runs it in node; the React Three Fiber components pass it on.

import { add, distance, scale, sub, type Vec3 } from '@/chem-data/geometry'
import type { Element } from '@/chem-data/schema'
import type { MechanismState, ScenePath } from '@/mechanisms'
import { boundingSphere, direction, lerp, lonePairDots, partialBondSticks, perpendicular, quaternionFromYAxis, type Quat, type Sphere, type Stick } from '@/app/explore/scene/sceneMath'
import { BALL_SCALE, STICK_STYLE } from '@/app/explore/scene/sceneModel'

// Display parameters, in ångström. These are drawing choices, not chemistry.
/** The dark edge round every shape, as a fraction of the radius the camera frames (about 2 px on the screen). */
const OUTLINE_FRACTION = 0.012
/** The smallest sphere a species is pointed at by: a lone ion or a small molecule is still easy to hit. */
const MIN_PICK_RADIUS = 0.9
/** A curved arrow: the radius of its shaft, its head's radius and length, how many pieces the shaft is cut into, and how far it bows out. */
const ARROW = { radius: 0.04, headRadius: 0.1, headLength: 0.22, pieces: 12, bow: 0.5, minBow: 0.45 }
/** The pair of electrons on an arrow: two dots, as the explorer draws a lone pair. Each dot's radius, and half the gap between the two. */
export const PAIR_DOT_RADIUS = 0.07
const PAIR_SPREAD = 0.1

export type DrawnAtom = { id: string; position: Vec3; radius: number; color: string }
/** `partial`: a dash of a bond that is forming, breaking or changing order. */
export type DrawnStick = Stick & { partial: boolean }
export type DrawnArrow = {
  shaft: Stick[]
  /** A cone: its centre, the rotation of +Y onto the way it points, and where its point is. */
  head: { position: Vec3; quaternion: Quat; radius: number; length: number; tip: Vec3 }
  /** Where the pair of electrons is on the arrow now: its two dots. */
  pair: [Vec3, Vec3]
}

export type Drawing = {
  atoms: DrawnAtom[]
  sticks: DrawnStick[]
  arrows: DrawnArrow[]
  /** For each species of the state, in its order: the sphere that holds it. */
  species: Sphere[]
  /** The charge of a monatomic ion that is a species of its own, written on it: "Na⁺". */
  labels: { position: Vec3; text: string; height: number }[]
  outline: number
  /** What the camera frames: the state's own point, and its radius with room for the largest ball or sphere the chapter is about, since the state's radius holds centres. */
  camera: { target: Vec3; radius: number }
}

const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹'
/** "⁺", "⁻", "²⁺": a charge as it is written after a symbol. */
const chargeText = (charge: number) => `${Math.abs(charge) > 1 ? [...String(Math.abs(charge))].map((digit) => SUPERSCRIPT[Number(digit)]).join('') : ''}${charge > 0 ? '⁺' : '⁻'}`

export function drawing(state: MechanismState, elements: readonly Element[]): Drawing {
  const elementOf = (symbol: string) => {
    const element = elements.find((e) => e.symbol === symbol)
    if (!element) throw new Error(`no element data for ${symbol}`)
    return element
  }
  // A molecule's atom is a ball of the explorer's ball-and-stick size; a monatomic ion is a sphere of its ionic radius (spec 9.2).
  const atoms = state.atoms.map((atom): DrawnAtom => ({ id: atom.id, position: atom.position, radius: atom.ion ? atom.ion.radius : elementOf(atom.element).vdwRadius.value * BALL_SCALE, color: elementOf(atom.element).color.value }))
  const at = (id: string) => atoms.find((atom) => atom.id === id)!

  const style = STICK_STYLE['ball-and-stick']
  const sticks = state.bonds.flatMap((bond): DrawnStick[] => {
    // The lines of a double bond lie in the plane of a third atom bonded to either end.
    const neighbour = state.bonds.flatMap((other) => (other === bond || ![other.a, other.b].some((id) => id === bond.a || id === bond.b) ? [] : [other.a, other.b])).find((id) => id !== bond.a && id !== bond.b)
    return partialBondSticks(at(bond.a).position, at(bond.b).position, bond.order, style, neighbour === undefined ? undefined : at(neighbour).position).map((stick) => ({ ...stick, partial: bond.partial && stick.length < distance(at(bond.a).position, at(bond.b).position) / 2 - 1e-9 }))
  })

  return {
    atoms,
    sticks,
    arrows: state.electronPaths.flatMap((path) => curvedArrow(path)),
    species: state.species.map((one) => {
      const sphere = boundingSphere(one.atoms.map((id) => at(id).position), one.atoms.map((id) => at(id).radius))
      return { center: sphere.center, radius: Math.max(sphere.radius, MIN_PICK_RADIUS) }
    }),
    // An ion has its charge written on it once it is a thing of its own: not while it is part of a unit of a solid, which has one name.
    labels: state.atoms.flatMap((atom) => (atom.ion && state.species.some((one) => 'ion' in one && one.atoms[0] === atom.id) ? [{ position: atom.position, text: `${atom.element}${chargeText(atom.ion.charge)}`, height: atom.ion.radius }] : [])),
    outline: state.camera.radius * OUTLINE_FRACTION,
    camera: { target: state.camera.target, radius: state.camera.radius + Math.max(...atoms.filter((_, i) => state.atoms[i]!.active || state.chapter.active.length === 0).map((atom) => atom.radius)) },
  }
}

/** The curved arrow of one pair of electrons: a bow from where the pair leaves to where it arrives, cut into straight pieces, with a cone at its end. Nothing where the two are one point. */
function curvedArrow(path: ScenePath): DrawnArrow[] {
  const chord = distance(path.from, path.to)
  if (chord < 1e-6) return []
  const along = direction(path.from, path.to)
  // The bow is to one side in the plane the scene is laid out in, so arrows that run the same way bow the same way.
  const side = perpendicular(along)
  const control = add(lerp(path.from, path.to, 0.5), scale(side, Math.max(chord * ARROW.bow, ARROW.minBow) * 2))
  const on = (u: number): Vec3 => lerp(lerp(path.from, control, u), lerp(control, path.to, u), u)
  // The head takes the end of the curve, and the shaft stops where the head begins.
  const headStart = Math.max(0, 1 - ARROW.headLength / chord)
  const points = Array.from({ length: ARROW.pieces + 1 }, (_, i) => on((headStart * i) / ARROW.pieces))
  const shaft = points.slice(1).flatMap((point, i): Stick[] => {
    const from = points[i]!
    const length = distance(from, point)
    return length < 1e-9 ? [] : [{ position: lerp(from, point, 0.5), quaternion: quaternionFromYAxis(direction(from, point)), length, radius: ARROW.radius }]
  })
  const base = points.at(-1)!
  const length = distance(base, path.to)
  return [{ shaft, head: { position: lerp(base, path.to, 0.5), quaternion: quaternionFromYAxis(scale(sub(path.to, base), 1 / length)), radius: ARROW.headRadius, length, tip: path.to }, pair: lonePairDots(on(path.progress), side, 0, PAIR_SPREAD) }]
}
