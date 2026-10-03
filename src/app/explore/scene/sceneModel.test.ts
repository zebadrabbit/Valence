import { describe, expect, it } from 'vitest'
import { distance, type Vec3 } from '@/chem-data/geometry'
import { registry } from '@/chem-data/registry'
import type { ViewId } from '../views'
import { BALL_SCALE, sceneModel } from './sceneModel'

const { elements } = registry
const center: Vec3 = [0, 0, 0]

function model(id: string, view: ViewId) {
  const molecule = registry.molecules.find((m) => m.id === id)
  if (!molecule) throw new Error(`no molecule ${id}`)
  return sceneModel(molecule, elements, view)
}

function element(symbol: string) {
  const found = elements.find((e) => e.symbol === symbol)
  if (!found) throw new Error(`no element ${symbol}`)
  return found
}

describe('sceneModel', () => {
  it('takes atom colours and radii from the element table', () => {
    const o = element('O')
    const h = element('H')
    const filling = model('water', 'space-filling')
    expect(filling.atoms.map((a) => a.radius)).toEqual([o.vdwRadius.value, h.vdwRadius.value, h.vdwRadius.value])
    expect(filling.atoms.map((a) => a.color)).toEqual([o.color.value, h.color.value, h.color.value])
    const balls = model('water', 'ball-and-stick')
    expect(balls.atoms[0]!.radius).toBeCloseTo(o.vdwRadius.value * BALL_SCALE, 12)
    expect(balls.atoms[1]!.radius).toBeCloseTo(h.vdwRadius.value * BALL_SCALE, 12)
  })

  it('draws no sticks in the space-filling view and rings a bond on the seam between its atoms', () => {
    const { atoms, bonds } = model('water', 'space-filling')
    for (const bond of bonds) {
      expect(bond.sticks).toEqual([])
      expect(bond.pick).toBeNull()
      // Every point of the ring is on the surface of both spheres.
      const [o, h] = [atoms[0]!, atoms[1]!]
      expect(Math.hypot(distance(o.position, bond.ring.position), bond.ring.radius)).toBeCloseTo(o.radius, 10)
      expect(Math.hypot(distance(bonds[0] === bond ? h.position : atoms[2]!.position, bond.ring.position), bond.ring.radius)).toBeCloseTo(h.radius, 10)
    }
  })

  it('draws the double bonds of carbon dioxide as two parallel lines each', () => {
    const { bonds } = model('carbon-dioxide', 'ball-and-stick')
    expect(bonds.map((b) => b.sticks.length)).toEqual([4, 4])
    expect(model('nitrogen', 'ball-and-stick').bonds[0]!.sticks).toHaveLength(6)
    expect(model('water', 'ball-and-stick').bonds.map((b) => b.sticks.length)).toEqual([2, 2])
  })

  it('draws every ring bond of benzene the same way, with the dashes inside the ring', () => {
    const { bonds } = model('benzene', 'ball-and-stick')
    const ring = bonds.filter((b) => b.sticks.length > 2)
    expect(ring).toHaveLength(6)
    for (const bond of ring) {
      expect(bond.sticks.length).toBe(ring[0]!.sticks.length)
      const [solid, , ...dashes] = bond.sticks
      for (const dash of dashes) expect(distance(dash.position, center)).toBeLessThan(distance(solid!.position, center))
    }
  })

  it('colours each half of a wireframe bond by its atom, and keeps ball-and-stick sticks neutral', () => {
    const molecule = registry.molecules.find((m) => m.id === 'water')!
    const wire = model('water', 'wireframe')
    wire.bonds.forEach((bond, i) => {
      const { a, b } = molecule.bonds[i]!
      expect(bond.sticks.map((s) => s.color)).toEqual([wire.atoms[a]!.color, wire.atoms[b]!.color])
    })
    const colors = new Set(model('water', 'ball-and-stick').bonds.flatMap((b) => b.sticks.map((s) => s.color)))
    expect(colors.size).toBe(1)
    expect(colors.has(element('O').color.value)).toBe(false)
  })

  it('gives thin wires and small balls a click target that is big enough', () => {
    for (const view of ['ball-and-stick', 'wireframe'] as const) {
      const { atoms, bonds } = model('water', view)
      for (const atom of atoms) expect(atom.pickRadius).toBeGreaterThanOrEqual(Math.max(atom.radius, 0.3))
      for (const bond of bonds) expect(bond.pick!.radius).toBeGreaterThanOrEqual(0.15)
    }
  })

  it.each(registry.molecules.map((m) => m.id))('bounds every atom of %s in every view', (id) => {
    for (const view of ['ball-and-stick', 'space-filling', 'wireframe'] as const) {
      const { atoms, bonds, radius, outline } = model(id, view)
      for (const atom of atoms) expect(distance(atom.position, center) + atom.radius).toBeLessThanOrEqual(radius + 1e-9)
      expect(outline).toBeGreaterThan(0)
      for (const bond of bonds) expect(bond.ring.radius).toBeGreaterThan(0)
    }
  })

  it('turns flat molecules face-on and linear ones across the view, without changing their shape', () => {
    for (const atom of model('benzene', 'ball-and-stick').atoms) expect(atom.position[2]).toBeCloseTo(0, 2)
    for (const atom of model('water', 'ball-and-stick').atoms) expect(atom.position[2]).toBeCloseTo(0, 6)
    for (const atom of model('carbon-dioxide', 'wireframe').atoms) expect(Math.hypot(atom.position[1], atom.position[2])).toBeCloseTo(0, 6)
    const water = registry.molecules.find((m) => m.id === 'water')!
    const drawn = model('water', 'space-filling').atoms
    expect(distance(drawn[0]!.position, drawn[1]!.position)).toBeCloseTo(distance(water.atoms[0]!.position, water.atoms[1]!.position), 10)
  })

  it('makes the scene of glucose larger than that of a diatomic', () => {
    expect(model('beta-d-glucopyranose', 'ball-and-stick').radius).toBeGreaterThan(3 * model('hydrogen-chloride', 'ball-and-stick').radius)
  })
})
