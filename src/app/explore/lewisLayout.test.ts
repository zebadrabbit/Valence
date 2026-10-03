import { describe, expect, it } from 'vitest'
import { registry } from '@/chem-data/registry'
import { UNIT, bondLines, chargeAngle, fitViewBox, gapAngles, lewisLayout, type Point } from './lewisLayout'

const deg = (radians: number) => Math.round((radians * 180) / Math.PI)
const rad = (degrees: number) => (degrees * Math.PI) / 180
const degrees = (angles: number[]) => angles.map(deg).sort((a, b) => a - b)
const layoutOf = (id: string) => {
  const molecule = registry.molecules.find((m) => m.id === id)
  if (!molecule) throw new Error(`no molecule ${id}`)
  return { molecule, layout: lewisLayout(molecule) }
}
const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1])
const midpoint = (a: Point, b: Point): Point => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
/** The angle at `vertex` between a and b, in degrees. */
const angleAt = (a: Point, vertex: Point, b: Point) => {
  const turn = Math.atan2(a[1] - vertex[1], a[0] - vertex[0]) - Math.atan2(b[1] - vertex[1], b[0] - vertex[0])
  return 180 - Math.abs(180 - Math.abs(deg(turn)) % 360)
}

describe('fitViewBox', () => {
  it('centres a small drawing in the minimum box', () => {
    expect(fitViewBox([[1, 1], [2, 1]], 0.5, 6, 4)).toEqual({ x: -1.5, y: -1, width: 6, height: 4 })
  })

  it('grows to hold a large drawing with its margin', () => {
    expect(fitViewBox([[0, 0], [10, 8]], 0.5, 6, 4)).toEqual({ x: -0.5, y: -0.5, width: 11, height: 9 })
  })

  it('refuses an empty drawing', () => {
    expect(() => fitViewBox([], 0, 1, 1)).toThrow()
  })
})

describe('gapAngles', () => {
  it('puts the one pair of a terminal atom opposite its bond', () => {
    expect(degrees(gapAngles([0], 1))).toEqual([180])
  })

  it('puts two pairs of a terminal atom at 120° from the bond, and three at right angles', () => {
    expect(degrees(gapAngles([0], 2))).toEqual([120, 240])
    expect(degrees(gapAngles([rad(90)], 3))).toEqual([0, 180, 270])
  })

  it('keeps both pairs of a bent atom on the side away from its bonds', () => {
    // Bonds 120° apart, at 30° and 150°: the 240° gap takes both pairs.
    expect(degrees(gapAngles([rad(30), rad(150)], 2))).toEqual([230, 310])
    // A stored drawing is rounded, so its 120° is not exact; the answer must not flip.
    expect(degrees(gapAngles([rad(29.9), rad(150.1)], 2))).toEqual([230, 310])
    expect(degrees(gapAngles([rad(30.1), rad(149.9)], 2))).toEqual([230, 310])
  })

  it('puts one pair on each side of a straight atom', () => {
    expect(degrees(gapAngles([0, rad(180)], 2))).toEqual([90, 270])
  })

  it('puts the two pairs of a square planar atom opposite each other', () => {
    expect(degrees(gapAngles([0, rad(90), rad(180), rad(270)], 2))).toEqual([45, 225])
    // Drawn as a cross on its corners, as xenon tetrafluoride is stored: above and below.
    expect(degrees(gapAngles([rad(45), rad(135), rad(225), rad(315)], 2))).toEqual([90, 270])
  })

  it('puts the pair of a pyramidal atom in the widest gap', () => {
    expect(degrees(gapAngles([0, rad(90), rad(180)], 1))).toEqual([270])
    expect(degrees(gapAngles([0, rad(180), rad(270)], 1))).toEqual([90])
  })

  it('puts the pair on top when the gaps are equal', () => {
    // Three bonds 120° apart, one pointing straight down, as ammonia is stored.
    expect(degrees(gapAngles([rad(90), rad(210), rad(330)], 1))).toEqual([270])
    expect(degrees(gapAngles([rad(89.8), rad(210.1), rad(330)], 1))).toEqual([270])
  })

  it('spreads the pairs of an atom with no bonds evenly from the top, and returns none for none', () => {
    expect(degrees(gapAngles([], 4))).toEqual([0, 90, 180, 270])
    expect(gapAngles([0, 1], 0)).toEqual([])
  })
})

describe('chargeAngle', () => {
  it('prefers the upper right', () => {
    expect(deg(chargeAngle([]))).toBe(-45)
    expect(deg(chargeAngle([0, rad(90), rad(180), rad(270)]))).toBe(-45)
  })

  it('moves on from a corner with a bond or lone pair in the way', () => {
    expect(deg(chargeAngle([rad(-45)]))).toBe(-135)
    expect(deg(chargeAngle([rad(-45), rad(45), rad(135), rad(-135)]))).toBe(-90)
  })

  it('keeps the upper right when it has room, even if another place has more', () => {
    // Bent, bonds pointing down and a lone pair on top, as on the sulfur of SO₂.
    expect(deg(chargeAngle([rad(30), rad(150), rad(-90)]))).toBe(-45)
  })

  it('takes the roomiest place on a crowded atom', () => {
    // A bond and three lone pairs at right angles, turned 30°: every candidate is within 40° of something.
    expect(deg(chargeAngle([rad(210), rad(300), rad(30), rad(120)]))).toBe(-90)
  })
})

describe('bondLines', () => {
  const a: Point = [0, 0]
  const b: Point = [200, 0]

  it('draws a single bond as one line that stops short of each symbol', () => {
    expect(bondLines(a, b, 1, 20, 30)).toEqual([{ from: [20, 0], to: [170, 0], dashed: false }])
  })

  it('draws double and triple bonds as parallel lines centred on the bond', () => {
    const offsets = (kind: 2 | 3) => bondLines(a, b, kind, 20, 20).map((line) => [line.from[1], line.to[1]])
    const [low, high] = offsets(2)
    expect(low![0]).toBeCloseTo(-high![0]!, 12)
    expect(low![0]).toBe(low![1])
    expect(high![0]! - low![0]!).toBeGreaterThan(5)
    expect(offsets(3).map(([y]) => Math.sign(Math.round(y! * 1e6)))).toEqual([-1, 0, 1])
  })

  it('draws an aromatic bond as a full line and a shorter dashed line on the ring side', () => {
    for (const centre of [[100, 500], [100, -500]] as const) {
      const [solid, dashed] = bondLines(a, b, 'aromatic', 20, 20, centre)
      expect(solid).toEqual({ from: [20, 0], to: [180, 0], dashed: false })
      expect(dashed!.dashed).toBe(true)
      expect(Math.sign(dashed!.from[1])).toBe(Math.sign(centre[1]))
      expect(dashed!.to[0] - dashed!.from[0]).toBeLessThan(160)
    }
  })

  it('refuses a bond of no length', () => {
    expect(() => bondLines(a, a, 1, 0, 0)).toThrow()
  })
})

describe('lewisLayout', () => {
  it('draws water bent, with both lone pairs on the far side of the oxygen from the hydrogens', () => {
    const { atoms, bonds } = layoutOf('water').layout
    const [o, h1, h2] = atoms
    expect(angleAt(h1!.position, o!.position, h2!.position)).toBeLessThan(150)
    expect(bonds.map((b) => b.lines.length)).toEqual([1, 1])
    expect(o!.lonePairs).toHaveLength(2)
    const between = midpoint(h1!.position, h2!.position)
    for (const [first, second] of o!.lonePairs) {
      const pair = midpoint(first, second)
      // Further from the hydrogens' midpoint than the oxygen is.
      expect(distance(pair, between)).toBeGreaterThan(distance(o!.position, between))
    }
    expect(atoms.map((a) => a.charge)).toEqual([null, null, null])
  })

  it('scales the stored drawing and turns it the right way up: y grows downwards', () => {
    const { molecule, layout } = layoutOf('water')
    layout.atoms.forEach((atom, i) => {
      expect(atom.position).toEqual([molecule.atoms[i]!.position2d[0] * UNIT, -molecule.atoms[i]!.position2d[1] * UNIT])
    })
  })

  it('draws sulfur dioxide bent, with a double and a single bond and the charges +1 and −1', () => {
    const { atoms, bonds } = layoutOf('sulfur-dioxide').layout
    expect(angleAt(atoms[1]!.position, atoms[0]!.position, atoms[2]!.position)).toBe(120)
    expect(bonds.map((b) => b.lines.length)).toEqual([2, 1])
    expect(bonds[0]!.width).toBeGreaterThan(bonds[1]!.width)
    expect(atoms.map((a) => a.charge?.text)).toEqual(['+', undefined, '−'])
    expect(atoms.map((a) => a.lonePairs.length)).toEqual([1, 2, 3])
  })

  it('draws every ring bond of benzene as delocalised, the dashed line inside the ring', () => {
    const { molecule, layout } = layoutOf('benzene')
    const carbons = layout.atoms.filter((a) => a.symbol === 'C').map((a) => a.position)
    const centre: Point = [carbons.reduce((s, p) => s + p[0], 0) / 6, carbons.reduce((s, p) => s + p[1], 0) / 6]
    molecule.bonds.forEach((bond, i) => {
      const { lines } = layout.bonds[i]!
      if (!bond.aromatic) return expect(lines.map((l) => l.dashed)).toEqual([false])
      expect(lines.map((l) => l.dashed)).toEqual([false, true])
      const [solid, dashed] = lines
      expect(distance(midpoint(dashed!.from, dashed!.to), centre)).toBeLessThan(distance(midpoint(solid!.from, solid!.to), centre))
    })
    expect(molecule.bonds.filter((b) => b.aromatic)).toHaveLength(6)
  })

  it('draws carbon dioxide straight with two double bonds and two lone pairs on each oxygen', () => {
    const { atoms, bonds } = layoutOf('carbon-dioxide').layout
    expect(bonds.map((b) => b.lines.length)).toEqual([2, 2])
    expect(atoms.map((a) => `${a.symbol}${a.lonePairs.length}`).sort()).toEqual(['C0', 'O2', 'O2'])
  })

  it('marks the charged nitrogen and oxygen of the glycine zwitterion', () => {
    const { atoms } = layoutOf('glycine-zwitterion').layout
    expect(atoms.filter((a) => a.charge).map((a) => `${a.symbol}${a.charge!.text}`).sort()).toEqual(['N+', 'O−'])
  })

  it('keeps lone-pair dots and charges clear of the symbol and inside the view box, for every molecule', () => {
    for (const molecule of registry.molecules) {
      const { viewBox, atoms, bonds } = lewisLayout(molecule)
      const inside = (p: Point) => p[0] > viewBox.x && p[0] < viewBox.x + viewBox.width && p[1] > viewBox.y && p[1] < viewBox.y + viewBox.height
      atoms.forEach((atom, i) => {
        expect(atom.lonePairs, `${molecule.id} atom ${i}`).toHaveLength(molecule.atoms[i]!.lonePairs)
        const marks = [...atom.lonePairs.flat(), ...(atom.charge ? [atom.charge.position] : [])]
        for (const mark of marks) {
          expect(distance(mark, atom.position), `${molecule.id} atom ${i}`).toBeGreaterThan(atom.clear)
          expect(inside(mark), `${molecule.id} atom ${i}`).toBe(true)
        }
        expect(inside(atom.position)).toBe(true)
      })
      for (const bond of bonds) expect(bond.length, molecule.id).toBeGreaterThan(0.1 * UNIT)
    }
  })
})
