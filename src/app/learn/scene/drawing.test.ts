import { describe, expect, it } from 'vitest'
import { add, distance, scale, type Vec3 } from '@/chem-data/geometry'
import { registry } from '@/chem-data/registry'
import { hclNahco3 as mechanism, state } from '@/mechanisms'
import { BALL_SCALE } from '@/app/explore/scene/sceneModel'
import { drawing } from './drawing'

const drawn = (t: number) => drawing(state(mechanism, t), registry.elements)
const middleOf = ([a, b]: [Vec3, Vec3]) => scale(add(a, b), 0.5)
const element = (symbol: string) => registry.elements.find((e) => e.symbol === symbol)!

describe('drawing: what the 3D scene of a mechanism draws at one scrub position', () => {
  it('is a function of the state alone: the same position gives the same drawing, whichever way it was reached', () => {
    for (const t of [0, 0.2, 0.445, 0.69, 0.9, 1]) expect(drawn(t)).toEqual(drawn(t))
  })

  it('draws every atom of a molecule as a ball in its element colour, at the explorer\'s ball size', () => {
    const s = state(mechanism, 0.4)
    const { atoms } = drawn(0.4)
    expect(atoms.map((a) => a.id)).toEqual(s.atoms.map((a) => a.id))
    for (const [i, atom] of s.atoms.entries()) {
      expect(atoms[i]!.position).toEqual(atom.position)
      expect(atoms[i]!.color).toBe(element(atom.element).color.value)
      if (!atom.ion) expect(atoms[i]!.radius).toBeCloseTo(element(atom.element).vdwRadius.value * BALL_SCALE, 10)
    }
  })

  it('draws the sodium ion and the chloride ion as spheres of their stored ionic radii, each with its charge written on it', () => {
    const { atoms, labels } = drawn(0.4)
    expect(atoms.find((a) => a.id === 'na')!.radius).toBe(1.02)
    expect(atoms.find((a) => a.id === 'cl')!.radius).toBe(1.81)
    expect(labels.map((l) => l.text)).toEqual(['Na⁺', 'Cl⁻'])
    expect(labels[0]!.position).toEqual(atoms.find((a) => a.id === 'na')!.position)
    // No other atom is labelled: the callout names a molecule when it is pointed at.
    expect(labels).toHaveLength(2)
  })

  it('draws a whole bond as whole sticks: two halves for a single bond, four for a double', () => {
    // At the start: three O-H of hydronium, two O-H of water, and in hydrogen carbonate one O-H, two C-O and one C=O.
    const start = drawn(0)
    expect(start.sticks.every((s) => !s.partial)).toBe(true)
    expect(start.sticks).toHaveLength(8 * 2 + 4)
    // At the end: six O-H of three waters and the two C=O of carbon dioxide.
    expect(drawn(1).sticks).toHaveLength(6 * 2 + 2 * 4)
  })

  it('draws a bond that is breaking or forming as dashes, marked as partial, only while the model has it partial', () => {
    const s = state(mechanism, 0.445)
    expect(s.bonds.filter((b) => b.partial)).toHaveLength(2)
    const partial = drawn(0.445).sticks.filter((stick) => stick.partial)
    // Every dash is shorter than half a bond.
    expect(partial.length).toBeGreaterThanOrEqual(6)
    for (const dash of partial) expect(dash.length).toBeLessThan(0.3)
    for (const t of [0.05, 0.3, 0.4, 0.55, 0.61, 0.8, 0.95]) expect(drawn(t).sticks.some((stick) => stick.partial)).toBe(false)
  })

  it('draws an electron pair on its way as a curved arrow from where it leaves to where it arrives, with the pair on it', () => {
    expect(drawn(0.3).arrows).toEqual([])
    expect(drawn(0.4).arrows).toEqual([])
    const s = state(mechanism, 0.47)
    const { arrows } = drawn(0.47)
    expect(arrows).toHaveLength(s.electronPaths.length)
    expect(arrows).toHaveLength(2)
    for (const [i, arrow] of arrows.entries()) {
      const path = s.electronPaths[i]!
      // The shaft begins where the pair leaves, and the point of the head is where it arrives.
      const first = arrow.shaft[0]!
      expect(distance(first.position, path.from)).toBeLessThan(first.length)
      expect(distance(arrow.head.tip, path.to)).toBeLessThan(1e-9)
      // Curved: the middle of the shaft is off the straight line between the two.
      const middle = arrow.shaft[Math.floor(arrow.shaft.length / 2)]!.position
      const chord = distance(path.from, path.to)
      expect(distance(middle, path.from) + distance(middle, path.to)).toBeGreaterThan(chord * 1.02)
      // The pair is at the start of the arrow when the move begins and at its end when it ends.
      expect(distance(middleOf(arrow.pair), path.from)).toBeLessThan(chord)
      // Two dots side by side, as the explorer draws a lone pair.
      expect(distance(...arrow.pair)).toBeCloseTo(0.2, 10)
    }
    const [early, late] = [drawn(0.4201).arrows[0]!, drawn(0.5199).arrows[0]!]
    expect(distance(middleOf(early.pair), state(mechanism, 0.4201).electronPaths[0]!.from)).toBeLessThan(0.01)
    expect(distance(middleOf(late.pair), state(mechanism, 0.5199).electronPaths[0]!.to)).toBeLessThan(0.01)
    // Step 3 has five pairs on the move.
    expect(drawn(0.69).arrows).toHaveLength(5)
  })

  it('gives each species a sphere that holds all its atoms, in the order of the state, for pointing at it and for its callout', () => {
    for (const t of [0, 0.3, 0.6, 1]) {
      const s = state(mechanism, t)
      const d = drawn(t)
      expect(d.species).toHaveLength(s.species.length)
      s.species.forEach((one, i) => {
        for (const id of one.atoms) {
          const atom = d.atoms.find((a) => a.id === id)!
          expect(distance(atom.position, d.species[i]!.center) + atom.radius).toBeLessThanOrEqual(d.species[i]!.radius + 1e-9)
        }
      })
    }
  })

  it('frames what the state frames, with room for the largest atom or ion the chapter is about, which the state measures to its centre', () => {
    // Dissolving is about the sodium ion and the hydrogen carbonate ion: the sodium ion's sphere is the largest.
    expect(drawn(0.2).camera.target).toEqual(state(mechanism, 0.2).camera.target)
    expect(drawn(0.2).camera.radius).toBeCloseTo(state(mechanism, 0.2).camera.radius + 1.02, 10)
    // Proton transfer is about molecules only: the carbon's ball is the largest of theirs.
    expect(drawn(0.4).camera.radius).toBeCloseTo(state(mechanism, 0.4).camera.radius + element('C').vdwRadius.value * BALL_SCALE, 10)
    // A bookend is about nothing in particular: the largest thing in the scene, the chloride ion.
    expect(drawn(0).camera.radius).toBeCloseTo(state(mechanism, 0).camera.radius + 1.81, 10)
  })

  it('has an outline that keeps its width on the screen: a fraction of what the camera frames', () => {
    expect(drawn(0.42).outline / state(mechanism, 0.42).camera.radius).toBeCloseTo(drawn(0.9).outline / state(mechanism, 0.9).camera.radius, 10)
    expect(drawn(0.42).outline).toBeGreaterThan(0)
  })
})
