// What the 3D scene draws for one molecule in one view, as plain data: sizes
// and colours from the element table, positions from the structure file.

import { distance, type Vec3 } from '@/chem-data/geometry'
import type { Element, Molecule } from '@/chem-data/schema'
import type { ViewId } from '../views'
import {
  bondReach,
  bondSticks,
  boundingSphere,
  direction,
  inFrame,
  lerp,
  principalFrame,
  quaternionFromYAxis,
  sphereOverlap,
  type BondKind,
  type Quat,
  type Stick,
  type StickStyle,
} from './sceneMath'

// Display parameters, in ångström. These are drawing choices, not chemistry.
/** A ball-and-stick ball is this fraction of the element's van der Waals radius. */
export const BALL_SCALE = 0.25
const STICK_STYLE: Record<Exclude<ViewId, 'space-filling'>, StickStyle> = {
  'ball-and-stick': { radius: 0.09, multiRadius: 0.06, spacing: 0.2 },
  wireframe: { radius: 0.04, multiRadius: 0.04, spacing: 0.14 },
}
/** Sticks are neutral in ball-and-stick, where the balls carry the element colours. */
const STICK_COLOR = '#9a9a9a'
/** The smallest click targets, so thin wires and small balls can still be picked. */
const MIN_ATOM_PICK_RADIUS = 0.3
const MIN_BOND_PICK_RADIUS = 0.15
/** The dark edge drawn round every shape, as a fraction of the scene radius (about 2 px on screen). */
const OUTLINE_FRACTION = 0.012

/** Positions are in the viewing frame: origin at the centroid, x along the molecule's longest spread. */
export type SceneAtom = { position: Vec3; radius: number; pickRadius: number; color: string }

export type SceneBond = {
  sticks: (Stick & { color: string })[]
  /** The click target, or null where the bond is hidden inside the atoms (space-filling). */
  pick: Stick | null
  /** Where the selection mark goes: its centre, the rotation of +Y onto the bond, and its radius. */
  ring: { position: Vec3; quaternion: Quat; radius: number }
}

export type SceneModel = {
  /** The radius of a sphere about the origin that contains everything drawn; the camera frames it. */
  radius: number
  outline: number
  atoms: SceneAtom[]
  bonds: SceneBond[]
}

export function sceneModel(molecule: Molecule, elements: readonly Element[], view: ViewId): SceneModel {
  const elementOf = molecule.atoms.map((atom) => {
    const element = elements.find((e) => e.symbol === atom.element)
    if (!element) throw new Error(`no element data for ${atom.element}`)
    return element
  })
  const style = view === 'space-filling' ? null : STICK_STYLE[view]

  // Turn the molecule to a good first view: flat molecules face-on, long ones across the canvas.
  const frame = principalFrame(molecule.atoms.map((atom) => atom.position))

  const atoms = molecule.atoms.map((atom, i): SceneAtom => {
    const vdw = elementOf[i]!.vdwRadius.value
    // Wireframe: a joint the width of the wire, so bonds meet cleanly.
    const radius = view === 'space-filling' ? vdw : view === 'ball-and-stick' ? vdw * BALL_SCALE : STICK_STYLE.wireframe.radius
    return { position: inFrame(atom.position, frame), radius, pickRadius: Math.max(radius, MIN_ATOM_PICK_RADIUS), color: elementOf[i]!.color.value }
  })

  // ponytail: one centre for every aromatic atom, which is the ring centre while the library's
  // only aromatic molecule is benzene. Fused or separate rings need ring perception.
  const aromaticAtoms = [...new Set(molecule.bonds.filter((b) => b.aromatic).flatMap((b) => [b.a, b.b]))]
  const ringCenter = aromaticAtoms.length > 0 ? boundingSphere(aromaticAtoms.map((i) => atoms[i]!.position), []).center : undefined

  const bonds = molecule.bonds.map((bond): SceneBond => {
    const a = atoms[bond.a]!
    const b = atoms[bond.b]!
    const quaternion = quaternionFromYAxis(direction(a.position, b.position))
    if (!style) {
      // The ring sits on the seam where the two atom spheres meet.
      const separation = distance(a.position, b.position)
      const seam = sphereOverlap(separation, a.radius, b.radius) ?? { along: separation / 2, radius: Math.min(a.radius, b.radius) }
      return { sticks: [], pick: null, ring: { position: lerp(a.position, b.position, seam.along / separation), quaternion, radius: seam.radius } }
    }
    const kind: BondKind = bond.aromatic ? 'aromatic' : bond.order
    // Parallel lines lie in the plane of a third atom bonded to either end; aromatic dashes face the ring centre.
    const neighbour = molecule.bonds
      .flatMap((other) => (other.a === bond.a || other.a === bond.b || other.b === bond.a || other.b === bond.b ? [other.a, other.b] : []))
      .find((i) => i !== bond.a && i !== bond.b)
    const hint = bond.aromatic ? ringCenter : neighbour === undefined ? undefined : atoms[neighbour]!.position
    const sticks = bondSticks(a.position, b.position, kind, style, hint).map((stick) => ({
      ...stick,
      color: view === 'wireframe' ? (stick.end === 0 ? a : b).color : STICK_COLOR,
    }))
    const middle = lerp(a.position, b.position, 0.5)
    const reach = bondReach(kind, style)
    return {
      sticks,
      pick: { position: middle, quaternion, length: distance(a.position, b.position), radius: Math.max(reach, MIN_BOND_PICK_RADIUS) },
      ring: { position: middle, quaternion, radius: reach + 0.15 },
    }
  })

  const { radius } = boundingSphere(
    atoms.map((a) => a.position),
    atoms.map((a) => (view === 'wireframe' ? a.pickRadius : a.radius)),
  )
  return { radius, outline: radius * OUTLINE_FRACTION, atoms, bonds }
}
