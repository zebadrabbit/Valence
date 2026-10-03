import { describe, expect, it } from 'vitest'
import { angleDeg, cross, dot, sub, type Vec3 } from './geometry'
import { lonePairDirections } from './lonePairs'
import { registry } from './registry'
import type { Molecule } from './schema'

const { elements, molecules } = registry
const ORIGIN: Vec3 = [0, 0, 0]
const TETRAHEDRAL = 109.4712

function moleculeOf(id: string): Molecule {
  const found = molecules.find((m) => m.id === id)
  if (!found) throw new Error(`no molecule ${id}`)
  return found
}

/** The first atom of the element with the given number of bonded atoms: its index, bond vectors and lone pairs. */
function domains(id: string, element: string, bondedAtoms: number) {
  const molecule = moleculeOf(id)
  const neighbours = (i: number) => molecule.bonds.flatMap((b) => (b.a === i ? [b.b] : b.b === i ? [b.a] : []))
  const index = molecule.atoms.findIndex((a, i) => a.element === element && neighbours(i).length === bondedAtoms)
  if (index < 0) throw new Error(`${id}: no ${element} bonded to ${bondedAtoms} atoms`)
  const at = (i: number) => molecule.atoms[i]!.position
  return {
    molecule,
    index,
    bonds: neighbours(index).map((j) => sub(at(j), at(index))),
    pairs: lonePairDirections(molecule, index, elements),
  }
}

const between = (a: Vec3, b: Vec3) => angleDeg(a, ORIGIN, b)

describe('lonePairDirections', () => {
  // Spec 6.5: "Lone-pair directions for H₂O and NH₃ match the tetrahedral positions within 5°."
  // Read as: every angle that involves a lone pair (lone pair to bond, and lone pair to lone
  // pair) is within 5° of the tetrahedral angle, 109.47°, measured against the real bonds.
  // The bond-to-bond angles are not asserted: they are cited measurements (104.5° in H₂O,
  // 106.7° in NH₃), not something this function produces, and a lone pair cannot sit at
  // 109.47° from bonds and also restore an ideal tetrahedron that the bonds do not form.
  it.each([
    ['water', 'O', 2, 2],
    ['ammonia', 'N', 3, 1],
  ])('puts the lone pairs of %s at the tetrahedral positions within 5°', (id, element, bondedAtoms, count) => {
    const { bonds, pairs } = domains(id, element, bondedAtoms)
    expect(pairs).toHaveLength(count)
    const angles = pairs.flatMap((pair, i) => [...bonds, ...pairs.slice(i + 1)].map((other) => between(pair, other)))
    expect(angles).toHaveLength(count * bondedAtoms + (count * (count - 1)) / 2)
    for (const angle of angles) expect(Math.abs(angle - TETRAHEDRAL)).toBeLessThan(5)
  })

  it('puts the lone pairs of water on opposite sides of the molecular plane', () => {
    const { bonds, pairs } = domains('water', 'O', 2)
    const normal = cross(bonds[0]!, bonds[1]!)
    expect(dot(pairs[0]!, normal) * dot(pairs[1]!, normal)).toBeLessThan(0)
    expect(between(pairs[0]!, bonds[0]!)).toBeCloseTo(between(pairs[1]!, bonds[0]!), 6)
  })

  it('puts the lone pairs of the two oxygens of carbon dioxide in perpendicular planes', () => {
    const co2 = moleculeOf('carbon-dioxide')
    const carbon = co2.atoms.findIndex((a) => a.element === 'C')
    const [first, second] = co2.atoms.flatMap((a, i) => (a.element === 'O' ? [i] : []))
    const planeNormalOf = (index: number) => {
      const pairs = lonePairDirections(co2, index, elements)
      expect(pairs).toHaveLength(2)
      const bond = sub(co2.atoms[carbon]!.position, co2.atoms[index]!.position)
      for (const pair of pairs) expect(Math.abs(angleDeg(pair, ORIGIN, bond) - 120)).toBeLessThan(1)
      const n = cross(pairs[0]!, pairs[1]!)
      return n.map((x) => x / Math.hypot(...n)) as unknown as Vec3
    }
    expect(Math.abs(dot(planeNormalOf(first!), planeNormalOf(second!)))).toBeLessThan(0.01)
  })

  it('puts the two lone pairs of XeF₄ at right angles to the molecular plane, opposite each other', () => {
    const { bonds, pairs } = domains('xenon-tetrafluoride', 'Xe', 4)
    expect(pairs).toHaveLength(2)
    for (const pair of pairs) for (const bond of bonds) expect(between(pair, bond)).toBeCloseTo(90, 6)
    expect(between(pairs[0]!, pairs[1]!)).toBeCloseTo(180, 6)
  })

  it('puts the lone pair of the sulfur of SO₂ in the molecular plane, away from both oxygens', () => {
    const { bonds, pairs } = domains('sulfur-dioxide', 'S', 2)
    expect(pairs).toHaveLength(1)
    expect(dot(pairs[0]!, cross(bonds[0]!, bonds[1]!))).toBeCloseTo(0, 9)
    expect(between(pairs[0]!, bonds[0]!)).toBeCloseTo(between(pairs[0]!, bonds[1]!), 6)
    expect(Math.abs(between(pairs[0]!, bonds[0]!) - 120)).toBeLessThan(5)
  })

  it('puts the two lone pairs of a carbonyl oxygen in the plane of the carbon, 120° from the bond', () => {
    const { molecule, index, bonds, pairs } = domains('formaldehyde', 'O', 1)
    const carbon = molecule.atoms.findIndex((a) => a.element === 'C')
    const hydrogen = molecule.atoms.findIndex((a) => a.element === 'H')
    const at = (i: number) => molecule.atoms[i]!.position
    const normal = cross(sub(at(index), at(carbon)), sub(at(hydrogen), at(carbon)))
    expect(pairs).toHaveLength(2)
    for (const pair of pairs) {
      expect(between(pair, bonds[0]!)).toBeCloseTo(120, 6)
      expect(dot(pair, normal)).toBeCloseTo(0, 9)
    }
    expect(between(pairs[0]!, pairs[1]!)).toBeCloseTo(120, 6)
  })

  it('spreads the three lone pairs of a terminal halogen tetrahedrally about its bond', () => {
    for (const [id, element] of [
      ['hydrogen-chloride', 'Cl'], // the neighbour has no other bond: the arbitrary turn
      ['boron-trifluoride', 'F'], // staggered against the neighbour's other bonds
    ] as const) {
      const { bonds, pairs } = domains(id, element, 1)
      expect(pairs).toHaveLength(3)
      const others = pairs.flatMap((pair, i) => [bonds[0]!, ...pairs.slice(i + 1)].map((other) => between(pair, other)))
      for (const angle of others) expect(angle).toBeCloseTo(TETRAHEDRAL, 3)
    }
  })

  it('points the lone pair of each nitrogen of N₂ straight away from the bond', () => {
    const { bonds, pairs } = domains('nitrogen', 'N', 1)
    expect(pairs).toHaveLength(1)
    expect(between(pairs[0]!, bonds[0]!)).toBeCloseTo(180, 6)
  })

  it('puts the delocalised lone pair of an amide nitrogen at right angles to its bonds', () => {
    const { bonds, pairs } = domains('acetamide', 'N', 3)
    expect(pairs).toHaveLength(1)
    // The computed conformer is planar at nitrogen only approximately.
    for (const bond of bonds) expect(Math.abs(between(pairs[0]!, bond) - 90)).toBeLessThan(5)
  })

  it('returns one unit vector per stored lone pair for every atom in the registry', () => {
    const unsupported: string[] = []
    for (const molecule of molecules) {
      molecule.atoms.forEach((atom, i) => {
        let pairs: Vec3[]
        try {
          pairs = lonePairDirections(molecule, i, elements)
        } catch {
          unsupported.push(`${molecule.id} atom ${i} (${atom.element})`)
          return
        }
        expect(pairs, `${molecule.id} atom ${i}`).toHaveLength(atom.lonePairs)
        for (const pair of pairs) expect(Math.hypot(...pair), `${molecule.id} atom ${i}`).toBeCloseTo(1, 12)
      })
    }
    // Every atom of the v1 library is supported.
    expect(unsupported).toEqual([])
  })

  it('gives the same answer every time', () => {
    const chlorine = () => domains('hydrogen-chloride', 'Cl', 1).pairs
    expect(chlorine()).toEqual(chlorine())
  })

  it('throws a clear error for a case it does not cover', () => {
    // ClF₃: three bonds and two lone pairs on a trigonal bipyramid.
    const fluorine = { element: 'F', position2d: [0, 0] as [number, number], formalCharge: 0, lonePairs: 3 }
    const molecule: Molecule = {
      ...moleculeOf('hydrogen-chloride'),
      id: 'chlorine-trifluoride',
      atoms: [
        { element: 'Cl', position: [0, 0, 0], position2d: [0, 0], formalCharge: 0, lonePairs: 2 },
        { ...fluorine, position: [1.6, 0, 0] },
        { ...fluorine, position: [0, 1.7, 0] },
        { ...fluorine, position: [0, -1.7, 0] },
      ],
      bonds: [1, 2, 3].map((b) => ({ a: 0, b, order: 1 as const, aromatic: false })),
    }
    expect(() => lonePairDirections(molecule, 0, elements)).toThrow(
      'chlorine-trifluoride: atom 0 (Cl) with 3 bonded atoms and 2 lone pairs is not supported',
    )
    expect(() => lonePairDirections(molecule, 9, elements)).toThrow('chlorine-trifluoride: no atom 9')
    expect(lonePairDirections(molecule, 1, elements)).toHaveLength(3)
  })
})
