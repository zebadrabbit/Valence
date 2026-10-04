import { describe, expect, it } from 'vitest'
import { measure } from './measure'
import { registry } from './registry'

const molecule = (id: string) => {
  const found = registry.molecules.find((m) => m.id === id)
  if (!found) throw new Error(`no molecule ${id}`)
  return found
}
const indices = (id: string, symbol: string) => molecule(id).atoms.flatMap((a, i) => (a.element === symbol ? [i] : []))

describe('measure', () => {
  it('measures nothing for fewer than two or more than four atoms', () => {
    expect(measure(molecule('water'), [])).toBeNull()
    expect(measure(molecule('water'), [0])).toBeNull()
    expect(measure(molecule('beta-d-glucopyranose'), [0, 1, 2, 3, 4])).toBeNull()
  })

  it('measures the O-H distance of water and finds its cited value', () => {
    const water = molecule('water')
    const [o] = indices('water', 'O')
    const [h1] = indices('water', 'H')
    const result = measure(water, [o!, h1!])
    expect(result).toMatchObject({ kind: 'distance', atoms: [o, h1], cited: { value: 0.958, published: '0.958', sourceId: 'cccbdb-water' } })
    expect(result!.value).toBeCloseTo(0.958, 3)
  })

  it('measures the H-O-H angle of water at the second atom picked', () => {
    const [o] = indices('water', 'O')
    const [h1, h2] = indices('water', 'H')
    const result = measure(molecule('water'), [h1!, o!, h2!])
    expect(result).toMatchObject({ kind: 'angle', cited: { value: 104.4776, sourceId: 'cccbdb-water' } })
    expect(result!.value).toBeCloseTo(104.48, 2)
  })

  it('takes the vertex from the pick order: the angle at a hydrogen of water is not the H-O-H angle', () => {
    const [o] = indices('water', 'O')
    const [h1, h2] = indices('water', 'H')
    const result = measure(molecule('water'), [o!, h1!, h2!])
    // The isosceles triangle's base angle.
    expect(result!.value).toBeCloseTo((180 - 104.48) / 2, 2)
    expect(result!.cited).toBeUndefined()
  })

  it('measures the dihedral of hydrogen peroxide, the same read from either end', () => {
    const peroxide = molecule('hydrogen-peroxide')
    const [o1, o2] = indices('hydrogen-peroxide', 'O')
    const hOn = (o: number) => peroxide.bonds.flatMap((b) => (b.a === o && b.b !== o1 && b.b !== o2 ? [b.b] : b.b === o && b.a !== o1 && b.a !== o2 ? [b.a] : []))[0]!
    const forward = measure(peroxide, [hOn(o1!), o1!, o2!, hOn(o2!)])
    const backward = measure(peroxide, [hOn(o2!), o2!, o1!, hOn(o1!)])
    expect(forward).toMatchObject({ kind: 'dihedral', cited: { value: 119.8, sourceId: 'cccbdb-hydrogen-peroxide' } })
    expect(forward!.value).toBeCloseTo(119.8, 1)
    expect(backward!.value).toBeCloseTo(119.8, 1)
    expect(backward!.cited).toEqual(forward!.cited)
  })

  it('measures a benzene C-C distance of about 1.39 Å, with no cited value on a computed conformer', () => {
    const benzene = molecule('benzene')
    const bond = benzene.bonds.find((b) => b.aromatic)!
    const result = measure(benzene, [bond.a, bond.b])
    expect(result!.value).toBeGreaterThan(1.38)
    expect(result!.value).toBeLessThan(1.41)
    expect(result!.cited).toBeUndefined()
  })

  it('measures a distance between atoms that are not bonded', () => {
    const [h1, h2] = indices('water', 'H')
    const result = measure(molecule('water'), [h1!, h2!])
    expect(result!.value).toBeCloseTo(2 * 0.958 * Math.sin((104.48 / 2) * (Math.PI / 180)), 2)
    expect(result!.cited).toBeUndefined()
  })

  it('gives no value for a dihedral along a straight line (ethyne)', () => {
    const ethyne = molecule('ethyne')
    const [c1, c2] = indices('ethyne', 'C')
    const hOn = (c: number) => ethyne.bonds.flatMap((b) => (b.a === c && ethyne.atoms[b.b]!.element === 'H' ? [b.b] : b.b === c && ethyne.atoms[b.a]!.element === 'H' ? [b.a] : []))[0]!
    expect(measure(ethyne, [hOn(c1!), c1!, c2!, hOn(c2!)])).toMatchObject({ kind: 'dihedral', value: null })
  })

  it('says which point group an angle of PCl5 follows from, and gives it no published text', () => {
    const pcl5 = molecule('phosphorus-pentachloride')
    const p = indices(pcl5.id, 'P')[0]!
    const [cl1, cl2] = indices(pcl5.id, 'Cl')
    const result = measure(pcl5, [cl1!, p, cl2!])
    expect(result!.cited).toEqual({ value: 120, sourceId: 'cccbdb-phosphorus-pentachloride', symmetry: 'D3h' })
    const bond = measure(pcl5, [p, cl1!])
    expect(bond!.cited).toEqual({ value: 2.02, published: '2.020', sourceId: 'cccbdb-phosphorus-pentachloride' })
  })

  it('agrees with every cited measurement in the library', () => {
    for (const m of registry.molecules) {
      const all = [...(m.measurements?.lengths ?? []), ...(m.measurements?.angles ?? []), ...(m.measurements?.dihedrals ?? [])]
      for (const entry of all) {
        const result = measure(m, entry.atoms)
        expect([m.id, entry.atoms, result?.cited?.value]).toEqual([m.id, entry.atoms, entry.value])
        expect(Math.abs(result!.value! - entry.value)).toBeLessThan(entry.atoms.length === 2 ? 0.01 : 1)
      }
    }
  })

  it('rejects an atom index the molecule does not have', () => {
    expect(() => measure(molecule('water'), [0, 9])).toThrow(/no atom 9/)
  })
})
