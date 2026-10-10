import { ELECTRON_GEOMETRY, deriveAtoms } from './derive'
import { add, cross, dot, normalize as unit, scale, sub, type Vec3 } from './geometry'
import type { Element, Molecule } from './schema'

// Where to draw an atom's lone pairs (spec 6.4): unit vectors from the atom,
// worked out from the directions of its bonds and its ideal electron geometry.
// Covers the cases in the v1 library and throws on anything else.
//
// ponytail: no per-atom override (spec 6.4 allows one); no library atom needs
// it yet. Add an optional stored direction list on the atom when one does.

const TETRAHEDRAL = Math.acos(-1 / 3) // 109.47°
const RAD = Math.PI / 180
const AXES: readonly Vec3[] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
]

/** The part of v at right angles to the unit vector axis. */
const across = (v: Vec3, axis: Vec3): Vec3 => sub(v, scale(axis, dot(v, axis)))
/** The unit vector at `polar` radians from axis, turned `azimuth` radians about it from side. */
const around = (axis: Vec3, side: Vec3, polar: number, azimuth: number): Vec3 =>
  add(
    scale(axis, Math.cos(polar)),
    scale(add(scale(side, Math.cos(azimuth)), scale(cross(axis, side), Math.sin(azimuth))), Math.sin(polar)),
  )

/** Unit vectors from one atom to the atoms it is bonded to. */
export function bondDirections(molecule: Molecule, index: number): Vec3[] {
  const here = molecule.atoms[index]!.position
  return molecule.bonds
    .filter((b) => b.a === index || b.b === index)
    .map((b) => unit(sub(molecule.atoms[b.a === index ? b.b : b.a]!.position, here)))
}

/** A unit vector at right angles to the plane of the bonds: the first bond crossed with the first bond not in line with it. */
function planeNormal(bonds: readonly Vec3[]): Vec3 {
  const normals = bonds.slice(1).map((b) => cross(bonds[0]!, b))
  return unit(normals.find((n) => Math.hypot(...n) > 0.5) ?? normals[0]!)
}

/** A unit vector at right angles to the axis, where any is as good as another: the axis crossed with the coordinate axis it is least along. */
function perpendicularTo(axis: Vec3): Vec3 {
  const size = axis.map(Math.abs)
  return unit(cross(axis, AXES[size.indexOf(Math.min(...size))]!))
}

/**
 * A unit vector at right angles to the bond of a terminal atom, fixing how its
 * lone pairs are turned about that bond. It points the way the neighbour's first
 * other bond leans. When the neighbour has no other bond, or only one in line
 * with this one (HCl, O₂, CO₂), any turn is as good as another and an arbitrary
 * fixed one is used: the bond crossed with the coordinate axis it is least along.
 * The exception is a terminal double bond whose neighbour's only other bond is a
 * terminal double bond in line with it (CO₂): there the atom with the higher
 * index turns its pairs 90° about the axis, so the two atoms' lone-pair planes
 * are perpendicular, as the π bonds along the chain are.
 */
function sideOf(molecule: Molecule, index: number, axis: Vec3): Vec3 {
  const bond = molecule.bonds.find((b) => b.a === index || b.b === index)!
  const neighbour = bond.a === index ? bond.b : bond.a
  const leaning = bondDirections(molecule, neighbour)
    .map((b) => across(b, axis))
    .find((v) => Math.hypot(...v) > 0.1)
  if (leaning) return unit(leaning)
  const fallback = perpendicularTo(axis)
  const other = molecule.bonds.filter((b) => b !== bond && (b.a === neighbour || b.b === neighbour))
  const partner = other.length === 1 ? (other[0]!.a === neighbour ? other[0]!.b : other[0]!.a) : -1
  const terminalDouble = (atom: number) =>
    molecule.bonds.filter((b) => b.a === atom || b.b === atom).length === 1 &&
    molecule.bonds.some((b) => (b.a === atom || b.b === atom) && b.order === 2)
  const chain = partner >= 0 && terminalDouble(index) && terminalDouble(partner)
  return chain && partner < index ? unit(cross(axis, fallback)) : fallback
}

/**
 * One unit vector per stored lone pair of the atom, pointing from the atom.
 *
 * - One lone pair on a tetrahedral or trigonal planar atom, or on a terminal
 *   atom (NH₃, H₃O⁺, the S of SO₂, the N of N₂): directly away from the bonds.
 * - Two on a tetrahedral atom (H₂O, alcohols): 109.47° apart, in the plane that
 *   bisects the bond angle, tilted away from the bonds.
 * - Two on an octahedral atom (XeF₄): above and below the plane of the bonds.
 * - One, two or three on a trigonal bipyramidal atom (SF₄, ClF₃, XeF₂): in the
 *   equatorial places, at right angles to the line through the two axial bonds.
 *   One points directly away from the bonds; two sit 120° from the equatorial
 *   bond; three sit 120° apart, turned about the axis by a fixed, arbitrary choice.
 * - The lone pair of an amide or urea nitrogen, which is delocalised: at right
 *   angles to the plane of its three bonds. Which face is a fixed but arbitrary
 *   choice (it follows the atom order).
 * - Two on a terminal atom (carbonyl O): 120° from the bond, in the plane of the
 *   neighbour's other bonds.
 * - Three on a terminal atom (halogens, O⁻): 109.47° from the bond and staggered
 *   against the neighbour's first other bond. They are free to turn about the
 *   bond in reality; this turn is a fixed choice, see sideOf.
 */
export function lonePairDirections(molecule: Molecule, atomIndex: number, elements: readonly Element[]): Vec3[] {
  const atom = molecule.atoms[atomIndex]
  if (!atom) throw new Error(`${molecule.id}: no atom ${atomIndex}`)
  const pairs = atom.lonePairs
  if (pairs === 0) return []

  const bonds = bondDirections(molecule, atomIndex)
  const { electronGeometry, resonanceOverride } = deriveAtoms(molecule, elements)[atomIndex]!
  const away = () => unit(scale(bonds.reduce(add), -1))

  if (bonds.length === 1) {
    const axis = bonds[0]!
    if (pairs === 1) return [away()]
    const side = sideOf(molecule, atomIndex, axis)
    if (pairs === 2) return [0, 180].map((turn) => around(axis, side, 120 * RAD, turn * RAD))
    if (pairs === 3) return [60, 180, 300].map((turn) => around(axis, side, TETRAHEDRAL, turn * RAD))
  } else if (resonanceOverride && bonds.length === 3 && pairs === 1) {
    return [planeNormal(bonds)]
  } else if (pairs === 1 && (electronGeometry === ELECTRON_GEOMETRY[4] || electronGeometry === ELECTRON_GEOMETRY[3])) {
    return [away()]
  } else if (pairs === 2 && bonds.length === 2 && electronGeometry === ELECTRON_GEOMETRY[4]) {
    const normal = planeNormal(bonds)
    return [1, -1].map((sign) =>
      add(scale(away(), Math.cos(TETRAHEDRAL / 2)), scale(normal, sign * Math.sin(TETRAHEDRAL / 2))),
    )
  } else if (pairs === 2 && bonds.length === 4 && electronGeometry === ELECTRON_GEOMETRY[6]) {
    const normal = planeNormal(bonds)
    return [normal, scale(normal, -1)]
  } else if (electronGeometry === ELECTRON_GEOMETRY[5] && bonds.length + pairs === 5) {
    // The axial bonds are the two furthest apart; the lone pairs are at right angles to the line through them.
    if (pairs === 1) return [away()]
    const [first, second] = bonds
      .flatMap((a, i) => bonds.slice(i + 1).map((b) => [a, b] as const))
      .reduce((widest, pair) => (dot(...pair) < dot(...widest) ? pair : widest))
    const axis = unit(sub(first, second))
    const equatorial = bonds.find((bond) => bond !== first && bond !== second)
    if (pairs === 2 && equatorial) return [120, 240].map((turn) => around(axis, unit(across(equatorial, axis)), 90 * RAD, turn * RAD))
    if (pairs === 3) return [0, 120, 240].map((turn) => around(axis, perpendicularTo(axis), 90 * RAD, turn * RAD))
  }
  throw new Error(
    `${molecule.id}: atom ${atomIndex} (${atom.element}) with ${bonds.length} bonded atoms and ${pairs} lone pairs is not supported`,
  )
}
