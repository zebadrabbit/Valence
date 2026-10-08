// What the 3D scene of a mechanism timeline draws at one scrub position, as plain data worked out from
// `state(mechanism, t)` and the element table and from nothing else, so that a frame is the same whichever way the
// scrub position was reached (spec 9.1). Vitest runs it in node; the React Three Fiber components pass it on.

import { add, cross, distance, dot, normalize, scale, sub, type Vec3 } from '@/chem-data/geometry'
import type { Element } from '@/chem-data/schema'
import type { MechanismState, ScenePath } from '@/mechanisms'
import { boundingSphere, direction, lerp, lonePairDots, partialBondSticks, quaternionFromYAxis, type Quat, type Sphere, type Stick } from '@/app/explore/scene/sceneMath'
import { BALL_SCALE, STICK_STYLE } from '@/app/explore/scene/sceneModel'

// Display parameters, in ångström. These are drawing choices, not chemistry.
/** The dark edge round every shape, as a fraction of the radius the camera frames (about 2 px on the screen). */
const OUTLINE_FRACTION = 0.012
/** An ion's symbol and charge beside it: the height of the writing as a fraction of the radius the camera frames, so that it is the same size on the screen in a wide scene and a close one; and the gap between the ball and the writing, as a fraction of that height. */
const LABEL_FRACTION = 0.2
const LABEL_GAP = 0.15
/** The smallest sphere a species is pointed at by: a lone ion or a small molecule is still easy to hit. */
const MIN_PICK_RADIUS = 0.9
/**
 * The direction the camera looks from when it frames a chapter: a little to the right and above, as the
 * explorer's does at first. The curved arrows are drawn flat to it.
 */
export const VIEW_FROM: Vec3 = [0.35, 0.3, 1]
/** The camera's field of view, top to bottom, in degrees. */
export const FOV = 45
/**
 * A curved arrow: the radius of its shaft, its head's radius and length, how many pieces the shaft is cut into, how
 * far it bows out (as a share of its length, and at the least), and how far it keeps from the ball it bows round.
 * A lone pair is drawn `gap` off the edge of its atom, `lonePairAngle` degrees round from the bond its pair becomes
 * or comes from: about where a lone pair points, and far enough round that the arrow has some length.
 */
const ARROW = { radius: 0.045, headRadius: 0.13, headLength: 0.3, pieces: 14, bow: 0.3, minBow: 0.4, clear: 0.12, gap: 0.08, lonePairAngle: 100 }
/** The pair of electrons on an arrow: two dots, as the explorer draws a lone pair. Each dot's radius, and half the gap between the two. */
export const PAIR_DOT_RADIUS = 0.07
const PAIR_SPREAD = 0.1

export type DrawnAtom = { id: string; position: Vec3; radius: number; color: string }
/** `partial`: a dash of a bond that is forming, breaking or changing order. */
export type DrawnStick = Stick & { partial: boolean }
export type DrawnArrow = {
  /** Where the arrow begins: on the surface of the atom a lone pair is on, or at the middle of the bond the pair comes from. */
  tail: Vec3
  shaft: Stick[]
  /** A cone: its centre, the rotation of +Y onto the way it points, and where its point is: at the middle of the bond the pair becomes, or on the surface of the atom it stays on as a lone pair. */
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
  /** The charge of a monatomic ion that is a species of its own, written beside it: "Na⁺". `position` is the ion's centre, `offset` how far to the side of it the writing begins, and `height` the height of the writing. */
  labels: { position: Vec3; text: string; height: number; offset: number }[]
  outline: number
  /** What the camera frames: the state's own point, and its radius with room for the largest ball in the scene, since the state's radius holds centres. */
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
  // One scale for every ball: a molecule's atom is the explorer's ball-and-stick fraction of its van der Waals radius,
  // and a monatomic ion the same fraction of its ionic radius (spec 9.2). Each is far smaller than what it stands for.
  const atoms = state.atoms.map((atom): DrawnAtom => ({ id: atom.id, position: atom.position, radius: (atom.ion ? atom.ion.radius : elementOf(atom.element).vdwRadius.value) * BALL_SCALE, color: elementOf(atom.element).color.value }))
  const at = (id: string) => atoms.find((atom) => atom.id === id)!

  const style = STICK_STYLE['ball-and-stick']
  const sticks = state.bonds.flatMap((bond): DrawnStick[] => {
    // The lines of a double bond lie in the plane of a third atom bonded to either end.
    const neighbour = state.bonds.flatMap((other) => (other === bond || ![other.a, other.b].some((id) => id === bond.a || id === bond.b) ? [] : [other.a, other.b])).find((id) => id !== bond.a && id !== bond.b)
    return partialBondSticks(at(bond.a).position, at(bond.b).position, bond.order, style, neighbour === undefined ? undefined : at(neighbour).position).map((stick) => ({ ...stick, partial: bond.partial && stick.length < distance(at(bond.a).position, at(bond.b).position) / 2 - 1e-9 }))
  })

  const camera = { target: state.camera.target, radius: state.camera.radius + Math.max(...atoms.map((atom) => atom.radius)) }
  const labelHeight = camera.radius * LABEL_FRACTION

  return {
    atoms,
    sticks,
    arrows: state.electronPaths.flatMap((path) => curvedArrow(path, at, state.bonds)),
    species: state.species.map((one) => {
      const sphere = boundingSphere(one.atoms.map((id) => at(id).position), one.atoms.map((id) => at(id).radius))
      return { center: sphere.center, radius: Math.max(sphere.radius, MIN_PICK_RADIUS) }
    }),
    // An ion has its charge written on it once it is a thing of its own: not while it is part of a unit of a solid, which has one name.
    labels: state.atoms.flatMap((atom) =>
      atom.ion && state.species.some((one) => 'ion' in one && one.atoms[0] === atom.id) ? [{ position: atom.position, text: `${atom.element}${chargeText(atom.ion.charge)}`, height: labelHeight, offset: at(atom.id).radius + labelHeight * LABEL_GAP }] : [],
    ),
    outline: state.camera.radius * OUTLINE_FRACTION,
    camera,
  }
}

/**
 * The curved arrow of one pair of electrons, drawn so that it reads as "this pair goes there". It is a flat mark
 * on the picture, as on paper: it lies in the plane the chapter's camera looks at, and the scene draws it over
 * everything else, so that no ball hides it. It begins where the pair is: at the middle of a bond, or just
 * off the edge of the atom a lone pair is on. It ends where the pair will be: at the middle of the bond it
 * becomes, between the two atoms as they are now, or just off the edge of the atom it stays on. Between the two it
 * bows away from the atom the pair stays on (the lone pair's atom, or the atom two bonds share), far enough to go
 * round that atom's ball and not across it. Cut into straight pieces, with a cone at its end and the pair as two
 * dots as far along it as the move has gone.
 */
function curvedArrow(path: ScenePath, at: (id: string) => DrawnAtom, bonds: MechanismState['bonds']): DrawnArrow[] {
  const { fromSite, toSite } = path
  const view = normalize(VIEW_FROM)
  /** The part of a vector that lies in the picture. */
  const flat = (v: Vec3): Vec3 => sub(v, scale(view, dot(v, view)))
  const flatDirection = (from: Vec3, to: Vec3): Vec3 | undefined => {
    const across = flat(sub(to, from))
    return Math.hypot(...across) > 1e-6 ? normalize(across) : undefined
  }
  const middle = (pair: readonly [string, string]) => lerp(at(pair[0]).position, at(pair[1]).position, 0.5)
  /** The atom the pair stays on: a lone pair's own, or the one that both bonds have. */
  const pivotId = 'lonePair' in fromSite ? fromSite.lonePair : 'lonePair' in toSite ? toSite.lonePair : fromSite.bond.find((id) => toSite.bond.includes(id))
  const pivot = pivotId === undefined ? undefined : at(pivotId)
  /** Where a lone pair on `atomId` is drawn, when the other end of the arrow is the bond from that atom to `partnerId`: round the edge of its ball from the bond, to the side its other bonds leave free. */
  const lonePair = (atomId: string, partnerId: string | undefined): Vec3 => {
    const atom = at(atomId)
    const toward = (partnerId === undefined ? undefined : flatDirection(atom.position, at(partnerId).position)) ?? normalize(flat([1, 0, 0]))
    const left = cross(view, toward)
    const others = bonds.flatMap((bond) => (bond.a === atomId ? [bond.b] : bond.b === atomId ? [bond.a] : [])).filter((id) => id !== partnerId)
    const crowd = others.map((id) => sub(at(id).position, atom.position)).reduce(add, [0, 0, 0] as Vec3)
    const side = scale(left, dot(crowd, left) > 0 ? -1 : 1)
    const angle = (ARROW.lonePairAngle * Math.PI) / 180
    return add(atom.position, scale(add(scale(toward, Math.cos(angle)), scale(side, Math.sin(angle))), atom.radius + ARROW.gap))
  }
  const partner = (bond: readonly [string, string], atomId: string) => bond.find((id) => id !== atomId)
  const tail = 'bond' in fromSite ? middle(fromSite.bond) : lonePair(fromSite.lonePair, 'bond' in toSite ? partner(toSite.bond, fromSite.lonePair) : undefined)
  const tip = 'bond' in toSite ? middle(toSite.bond) : lonePair(toSite.lonePair, 'bond' in fromSite ? partner(fromSite.bond, toSite.lonePair) : undefined)

  const along = flatDirection(tail, tip)
  if (!along) return []
  const chord = distance(tail, tip)
  const centre = lerp(tail, tip, 0.5)
  // To the side of the straight line, in the picture, away from the atom the pair stays on.
  const off = pivot ? flat(sub(centre, pivot.position)) : undefined
  const left = cross(view, along)
  const side = scale(left, off && dot(off, left) < 0 ? -1 : 1)
  // How far the middle of the arrow must stand off the straight line to go round that atom's ball.
  const needed = pivot && off ? Math.sqrt(Math.max((pivot.radius + ARROW.clear) ** 2 - dot(off, along) ** 2, 0)) - dot(off, side) : 0
  const bow = Math.max(chord * ARROW.bow, ARROW.minBow, needed)
  // A curve passes its control point at half the control's distance: the control is twice the bow away.
  const control = add(centre, scale(side, bow * 2))
  const on = (u: number): Vec3 => lerp(lerp(tail, control, u), lerp(control, tip, u), u)
  // The head takes the end of the curve, and the shaft stops where the head begins.
  const headStart = Math.max(0, 1 - ARROW.headLength / chord)
  const points = Array.from({ length: ARROW.pieces + 1 }, (_, i) => on((headStart * i) / ARROW.pieces))
  const shaft = points.slice(1).flatMap((point, i): Stick[] => {
    const from = points[i]!
    const length = distance(from, point)
    return length < 1e-9 ? [] : [{ position: lerp(from, point, 0.5), quaternion: quaternionFromYAxis(direction(from, point)), length, radius: ARROW.radius }]
  })
  const base = points.at(-1)!
  const length = distance(base, tip)
  return [{ tail, shaft, head: { position: lerp(base, tip, 0.5), quaternion: quaternionFromYAxis(scale(sub(tip, base), 1 / length)), radius: ARROW.headRadius, length, tip }, pair: lonePairDots(on(path.progress), side, 0, PAIR_SPREAD) }]
}
