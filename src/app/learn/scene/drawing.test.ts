import { describe, expect, it } from 'vitest'
import { add, cross, distance, dot, normalize, scale, sub, type Vec3 } from '@/chem-data/geometry'
import { registry } from '@/chem-data/registry'
import { hclNahco3 as mechanism, state } from '@/mechanisms'
import { BALL_SCALE } from '@/app/explore/scene/sceneModel'
import { framingDistance } from '@/app/explore/scene/sceneMath'
import { FOV, VIEW_FROM, drawing } from './drawing'

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

  it('draws every ball at one scale: an ion at the same fraction of its stored ionic radius as an atom is of its van der Waals radius', () => {
    const { atoms } = drawn(0.4)
    expect(atoms.find((a) => a.id === 'na')!.radius).toBeCloseTo(1.02 * BALL_SCALE, 10)
    expect(atoms.find((a) => a.id === 'cl')!.radius).toBeCloseTo(1.81 * BALL_SCALE, 10)
    // So a sodium ion is not as big as a whole hydrogen carbonate ion beside it, and a chloride ion is no bigger than a molecule.
    const s = state(mechanism, 0.4)
    const reach = (ids: readonly string[]) => Math.max(...ids.flatMap((a) => ids.map((b) => distance(atoms.find((x) => x.id === a)!.position, atoms.find((x) => x.id === b)!.position))))
    const hydrogenCarbonate = s.species.find((one) => 'speciesId' in one && one.speciesId === 'bicarbonate')!
    expect(2 * atoms.find((a) => a.id === 'na')!.radius).toBeLessThan(reach(hydrogenCarbonate.atoms) / 3)
    expect(2 * atoms.find((a) => a.id === 'cl')!.radius).toBeLessThan(reach(s.species.find((one) => 'speciesId' in one && one.speciesId === 'water')!.atoms))
  })

  it('writes the charge of the sodium ion and of the chloride ion beside each, clear of its ball, at a size that is the same on the screen wherever the camera stands', () => {
    const { atoms, labels, camera } = drawn(0.4)
    expect(labels.map((l) => l.text)).toEqual(['Na⁺', 'Cl⁻'])
    expect(labels[0]!.position).toEqual(atoms.find((a) => a.id === 'na')!.position)
    for (const [label, id] of [[labels[0]!, 'na'], [labels[1]!, 'cl']] as const) expect(label.offset).toBeGreaterThan(atoms.find((a) => a.id === id)!.radius)
    // No other atom is labelled: the callout names a molecule when it is pointed at.
    expect(labels).toHaveLength(2)
    const wide = drawn(0.9)
    expect(labels[0]!.height / camera.radius).toBeCloseTo(wide.labels[0]!.height / wide.camera.radius, 10)
    expect(labels[0]!.height / camera.radius).toBeGreaterThan(0.15)
  })

  it('writes no charge on the sodium of the solid until the solid has come apart: the picture names it as the list does, as one unit', () => {
    expect(drawn(0.1).labels.map((l) => l.text)).toEqual(['Cl⁻'])
    for (const t of [0.16, 0.2, 0.24, 0.279]) expect(drawn(t).labels.map((l) => l.text)).toEqual(['Cl⁻'])
    expect(drawn(0.281).labels.map((l) => l.text)).toEqual(['Na⁺', 'Cl⁻'])
    // The unit is one thing to point at: one sphere that holds the six atoms.
    const unit = drawn(0.2)
    expect(unit.species).toHaveLength(4)
    for (const atom of unit.atoms.slice(0, 6)) expect(distance(atom.position, unit.species[0]!.center) + atom.radius).toBeLessThanOrEqual(unit.species[0]!.radius + 1e-9)
  })

  it('draws a whole bond as whole sticks: two halves for a single bond, four for a double', () => {
    // At the start, the acid alone: three O-H of hydronium and two O-H of water.
    const start = drawn(0)
    expect(start.sticks.every((s) => !s.partial)).toBe(true)
    expect(start.sticks).toHaveLength(5 * 2)
    // With the solid in: in hydrogen carbonate one more O-H, two C-O and one C=O.
    expect(drawn(0.2).sticks).toHaveLength(8 * 2 + 4)
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

  describe('an electron pair on its way is a curved arrow that reads as "this pair goes there"', () => {
    const ball = (t: number, id: string) => drawn(t).atoms.find((a) => a.id === id)!
    const middle = (t: number, a: string, b: string) => middleOf([ball(t, a).position, ball(t, b).position])
    // An arrow is a flat mark on the picture, drawn over everything: where it is, is where it is seen from the chapter's camera.
    const view = normalize(VIEW_FROM)
    const depth = (p: Vec3) => dot(p, view)
    const seen = (a: Vec3, b: Vec3) => distance(sub(a, scale(view, depth(a))), sub(b, scale(view, depth(b))))
    /** Points along an arrow: its tail, the middle of each piece of its shaft, and the point of its head. */
    const along = (arrow: ReturnType<typeof drawn>['arrows'][number]) => [arrow.tail, ...arrow.shaft.map((piece) => piece.position), arrow.head.tip]

    it('is drawn only while bonds change: two arrows in step 2 and five in step 3, in the order of the step\'s record', () => {
      for (const t of [0.3, 0.4, 0.55, 0.61, 0.8]) expect(drawn(t).arrows).toEqual([])
      expect(drawn(0.47).arrows).toHaveLength(state(mechanism, 0.47).electronPaths.length)
      expect(drawn(0.47).arrows).toHaveLength(2)
      expect(drawn(0.69).arrows).toHaveLength(5)
    })

    it('starts at the edge of the atom a lone pair is on, not inside its ball, and ends at the middle of the bond the pair becomes', () => {
      for (const t of [0.4201, 0.445, 0.47, 0.5, 0.5199]) {
        // Step 2: a lone pair on the oxygen of hydrogen carbonate becomes the bond to the proton.
        const [onto] = drawn(t).arrows
        const oxygen = ball(t, 'o-acceptor')
        expect(seen(onto!.tail, oxygen.position)).toBeGreaterThan(oxygen.radius)
        expect(seen(onto!.tail, oxygen.position)).toBeLessThan(oxygen.radius + 0.15)
        expect(distance(onto!.head.tip, middle(t, 'o-acceptor', 'h-transfer'))).toBeLessThan(1e-9)
        // On the side of the oxygen that its bond to the carbon leaves free.
        expect(seen(onto!.tail, ball(t, 'c').position)).toBeGreaterThan(seen(oxygen.position, ball(t, 'c').position))
      }
    })

    it('starts at the middle of the bond a pair comes from, and ends at the edge of the atom it stays on as a lone pair', () => {
      for (const t of [0.4201, 0.445, 0.47, 0.5, 0.5199]) {
        // Step 2: the pair that held the proton to the hydronium oxygen stays on that oxygen.
        const [, off] = drawn(t).arrows
        const oxygen = ball(t, 'o-hydronium')
        expect(distance(off!.tail, middle(t, 'o-hydronium', 'h-transfer'))).toBeLessThan(1e-9)
        expect(seen(off!.head.tip, oxygen.position)).toBeGreaterThan(oxygen.radius)
        expect(seen(off!.head.tip, oxygen.position)).toBeLessThan(oxygen.radius + 0.15)
        // It lands further round than the side the proton is leaving from.
        expect(seen(off!.head.tip, ball(t, 'h-transfer').position)).toBeGreaterThan(seen(oxygen.position, ball(t, 'h-transfer').position))
      }
      // Step 3: from one bond to the next, round the atom the two share: the O-H pair becomes the second C-O pair.
      const second = drawn(0.69).arrows[1]!
      expect(distance(second.tail, middle(0.69, 'o-hydroxyl', 'h-hydroxyl'))).toBeLessThan(1e-9)
      expect(distance(second.head.tip, middle(0.69, 'c', 'o-hydroxyl'))).toBeLessThan(1e-9)
    })

    it('goes round the ball of the atom its pair stays on, not across it', () => {
      const across: string[] = []
      for (let i = 0; i <= 400; i++) {
        const [s, d] = [state(mechanism, i / 400), drawn(i / 400)]
        d.arrows.forEach((arrow, k) => {
          const { fromSite, toSite } = s.electronPaths[k]!
          const pivotId = 'lonePair' in fromSite ? fromSite.lonePair : 'lonePair' in toSite ? toSite.lonePair : fromSite.bond.find((id) => toSite.bond.includes(id))!
          const pivot = d.atoms.find((a) => a.id === pivotId)!
          for (const point of along(arrow)) if (seen(point, pivot.position) < pivot.radius) across.push(`${i / 400}: arrow ${k + 1} over ${pivotId}`)
        })
      }
      expect(across).toEqual([])
    })

    it('is long enough to be seen and bowed, with a head a good part of its length', () => {
      for (const t of [0.4201, 0.47, 0.5199, 0.6201, 0.69, 0.7599]) {
        for (const arrow of drawn(t).arrows) {
          const points = along(arrow)
          const length = points.slice(1).reduce((sum, point, i) => sum + seen(points[i]!, point), 0)
          expect([t, length > 1]).toEqual([t, true])
          expect(length).toBeGreaterThan(seen(arrow.tail, arrow.head.tip) * 1.2)
          expect(arrow.head.length).toBeGreaterThan(0.25)
          expect(arrow.head.radius).toBeGreaterThan(arrow.shaft[0]!.radius * 2)
        }
      }
    })

    it('carries the pair as two dots, side by side as the explorer draws a lone pair, as far along it as the move has gone', () => {
      const [early, late] = [drawn(0.4201).arrows[0]!, drawn(0.5199).arrows[0]!]
      expect(distance(middleOf(early.pair), early.tail)).toBeLessThan(0.01)
      expect(distance(middleOf(late.pair), late.head.tip)).toBeLessThan(0.01)
      for (const arrow of drawn(0.69).arrows) expect(distance(...arrow.pair)).toBeCloseTo(0.2, 10)
    })

    it('keeps the five arrows of step 3 apart: no two begin or end at one place', () => {
      for (const t of [0.6201, 0.655, 0.69, 0.725, 0.7599]) {
        const ends = drawn(t).arrows.flatMap((arrow) => [arrow.tail, arrow.head.tip])
        ends.forEach((a, i) => ends.slice(i + 1).forEach((b) => expect([t, seen(a, b) > 0.15]).toEqual([t, true])))
      }
    })
  })

  it('shows the carbon dioxide of step 4 going plainly past everything: seen from the chapter\'s camera, none of its balls comes within half an ångström of touching another species', () => {
    const view = normalize(VIEW_FROM)
    const seen = (a: Vec3, b: Vec3) => {
      const between = sub(a, b)
      return Math.hypot(...sub(between, scale(view, dot(between, view))))
    }
    const step = mechanism.chapters.find((c) => c.id === 'gas-escapes')!
    const near: string[] = []
    for (let i = 0; i <= 200; i++) {
      const t = step.range[0] + ((step.range[1] - step.range[0]) * i) / 200
      const { atoms } = drawn(t)
      const gas = state(mechanism, t).species.find((one) => 'speciesId' in one && one.speciesId === 'carbon-dioxide')!.atoms
      for (const mine of atoms.filter((a) => gas.includes(a.id))) {
        for (const other of atoms.filter((a) => !gas.includes(a.id))) if (seen(mine.position, other.position) < mine.radius + other.radius + 0.5) near.push(`${t.toFixed(3)}: ${mine.id} over ${other.id}`)
      }
    }
    expect(near).toEqual([])
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

  it('frames what the state frames, with room for the largest ball in the scene, which the state measures to its centre', () => {
    expect(drawn(0.2).camera.target).toEqual(state(mechanism, 0.2).camera.target)
    for (const t of [0.1, 0.2, 0.4, 0.9]) expect(drawn(t).camera.radius).toBeCloseTo(state(mechanism, t).camera.radius + Math.max(...drawn(t).atoms.map((a) => a.radius)), 10)
    // The chloride ion's ball is the largest there is, and it is under half an ångström.
    expect(Math.max(...drawn(0.4).atoms.map((a) => a.radius))).toBeCloseTo(1.81 * BALL_SCALE, 10)
  })

  describe('what the camera shows, in the picture as it is at 1024 by 768 (465 by 384) and on a tablet held upright (549 by 320)', () => {
    const SHAPES = [465 / 384, 549 / 320]
    const view = normalize(VIEW_FROM)
    const right = normalize(cross([0, 1, 0], view))
    const up = cross(view, right)
    /** Whether a ball is whole inside the picture, part in it, or outside it, for a picture `aspect` times as wide as tall. */
    const shown = (t: number, id: string, aspect: number): 'whole' | 'part' | 'out' => {
      const d = drawn(t)
      const ball = d.atoms.find((a) => a.id === id)!
      const eye = add(d.camera.target, scale(view, framingDistance(d.camera.radius, FOV, aspect)))
      const from = sub(ball.position, eye)
      const depth = -dot(from, view)
      const half = depth * Math.tan((FOV * Math.PI) / 360)
      const [x, y] = [Math.abs(dot(from, right)) / (half * aspect), Math.abs(dot(from, up)) / half]
      const [rx, ry] = [ball.radius / (half * aspect), ball.radius / half]
      return x + rx <= 1 && y + ry <= 1 ? 'whole' : x - rx >= 1 || y - ry >= 1 ? 'out' : 'part'
    }
    const about = (t: number) => state(mechanism, t).atoms.filter((a) => a.active).map((a) => a.id)

    it('holds every species a chapter is about, whole, when the chapter begins', () => {
      for (const chapter of mechanism.chapters.filter((c) => c.kind !== 'bookend' && c.id !== 'dissolving')) {
        for (const aspect of SHAPES) for (const id of about(chapter.range[0])) expect([chapter.id, id, shown(chapter.range[0], id, aspect)]).toEqual([chapter.id, id, 'whole'])
      }
    })

    it('keeps the solid out of the picture when step 1 begins, which is when its question is asked, in a picture of any shape from square to very wide', () => {
      const t = mechanism.chapters.find((c) => c.id === 'dissolving')!.range[0]
      expect(about(t)).toHaveLength(6)
      for (const aspect of [1, ...SHAPES, 2.4]) for (const id of about(t)) expect([aspect, id, shown(t, id, aspect)]).toEqual([aspect, id, 'out'])
      // Everything of the acid is whole in it.
      for (const aspect of SHAPES) for (const atom of state(mechanism, t).atoms.filter((a) => !a.active)) expect(shown(t, atom.id, aspect)).toBe('whole')
    })

    it('holds the whole unit of the solid once it has come in, and both its ions, whole, when step 1 ends', () => {
      const [arrived, end] = [mechanism.keyframes.find((k) => k.id === 'solid-in')!.t, mechanism.chapters.find((c) => c.id === 'dissolving')!.range[1]]
      const solid = about(arrived)
      for (const aspect of SHAPES) {
        for (const id of solid) expect([aspect, id, shown(arrived, id, aspect)]).toEqual([aspect, id, 'whole'])
        for (const id of solid) expect([aspect, id, shown(end, id, aspect)]).toEqual([aspect, id, 'whole'])
        for (const id of solid) expect([aspect, id, shown(end - 0.0001, id, aspect)]).toEqual([aspect, id, 'whole'])
      }
    })

    it('holds the two that react, whole, all through the move in which a proton crosses, and the ring of step 3 all through the relay', () => {
      for (const t of Array.from({ length: 201 }, (_, i) => i / 200).filter((x) => drawn(x).arrows.length > 0)) {
        for (const aspect of SHAPES) for (const id of about(t)) expect([t, id, shown(t, id, aspect)]).toEqual([t, id, 'whole'])
      }
    })

    it('holds the carbon dioxide, whole, for the first half of step 4, and lets it leave the picture before the step ends', () => {
      const [start, lifted, end] = [mechanism.chapters.find((c) => c.id === 'gas-escapes')!.range[0], mechanism.keyframes.find((k) => k.id === 'lifting')!.t, mechanism.chapters.find((c) => c.id === 'gas-escapes')!.range[1]]
      for (const aspect of SHAPES) {
        for (const t of [start, (start + lifted) / 2, lifted]) for (const id of about(t)) expect([aspect, t, id, shown(t, id, aspect)]).toEqual([aspect, t, id, 'whole'])
        for (const id of about(end - 0.0001)) expect([aspect, id, shown(end - 0.0001, id, aspect)]).toEqual([aspect, id, 'out'])
      }
    })
  })

  it('has an outline that keeps its width on the screen: a fraction of what the camera frames', () => {
    expect(drawn(0.42).outline / state(mechanism, 0.42).camera.radius).toBeCloseTo(drawn(0.9).outline / state(mechanism, 0.9).camera.radius, 10)
    expect(drawn(0.42).outline).toBeGreaterThan(0)
  })
})
