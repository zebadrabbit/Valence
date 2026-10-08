import { describe, expect, it } from 'vitest'
import { distance } from '@/chem-data/geometry'
import { hclNahco3 as mechanism } from './data'
import { EASING_NAMES } from './schema'
import { EASINGS, chapterAt, chapterStart, moveAt, state, stepsOf } from './state'

const at = (id: string) => mechanism.keyframes.find((k) => k.id === id)!.t
const atom = (s: ReturnType<typeof state>, id: string) => s.atoms.find((a) => a.id === id)!
const bond = (s: ReturnType<typeof state>, a: string, b: string) => s.bonds.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a))
const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === 'object') Object.values(value).forEach(deepFreeze)
  return Object.freeze(value)
}
const grid = Array.from({ length: 201 }, (_, i) => i / 200)

describe('the easings', () => {
  it.each(EASING_NAMES)('%s starts at 0, ends at 1 and never goes back', (name) => {
    const ease = EASINGS[name]
    expect(ease(0)).toBe(0)
    expect(ease(1)).toBe(1)
    for (let i = 1; i <= 100; i++) expect(ease(i / 100)).toBeGreaterThan(ease((i - 1) / 100))
  })

  it('easeInOut starts and ends at rest; linear does not', () => {
    expect(EASINGS.easeInOut(0.001)).toBeLessThan(0.00001)
    expect(1 - EASINGS.easeInOut(0.999)).toBeLessThan(0.00001)
    expect(EASINGS.easeInOut(0.5)).toBe(0.5)
    expect(EASINGS.linear(0.25)).toBe(0.25)
  })

  it('every move of the mechanism names one', () => {
    expect(mechanism.keyframes.slice(1).every((k) => k.easing !== undefined && k.easing in EASINGS)).toBe(true)
  })
})

describe('state is a pure function of the scrub position (spec 9.1)', () => {
  it('gives the same frames scrubbing backwards as forwards', () => {
    const forwards = grid.map((t) => state(mechanism, t))
    const backwards = [...grid].reverse().map((t) => state(mechanism, t)).reverse()
    expect(backwards).toEqual(forwards)
  })

  it('gives the same frame however it was reached, and changes nothing it is handed', () => {
    const frozen = deepFreeze(structuredClone(mechanism))
    const first = state(frozen, 0.47)
    for (const t of [1, 0, 0.9, 0.2, 0.471, 0.469]) state(frozen, t)
    expect(state(frozen, 0.47)).toEqual(first)
    expect(frozen).toEqual(mechanism)
  })

  it('holds a position outside the track to it, and anything that is not a number to the start', () => {
    expect(state(mechanism, -3)).toEqual(state(mechanism, 0))
    expect(state(mechanism, 7)).toEqual(state(mechanism, 1))
    expect(state(mechanism, Number.NaN)).toEqual(state(mechanism, 0))
    expect(state(mechanism, Number.POSITIVE_INFINITY)).toEqual(state(mechanism, 1))
    expect(state(mechanism, 7).t).toBe(1)
  })

  it('has every atom, with its element, at every position', () => {
    for (const t of grid) {
      const s = state(mechanism, t)
      expect(s.atoms.map((a) => `${a.id} ${a.element}`)).toEqual(mechanism.actors.map((a) => `${a.id} ${a.element}`))
      expect(s.atoms.every((a) => a.position.every(Number.isFinite))).toBe(true)
    }
  })
})

describe('chapters', () => {
  it('a boundary belongs to the chapter that begins there, and 1 to the last', () => {
    expect(chapterAt(mechanism, 0).id).toBe('beaker-start')
    expect(chapterAt(mechanism, 0.32 - 1e-9).id).toBe('dissolving')
    expect(chapterAt(mechanism, 0.32).id).toBe('proton-transfer')
    expect(chapterAt(mechanism, 1).id).toBe('beaker-end')
    expect(chapterAt(mechanism, 2).id).toBe('beaker-end')
    expect(chapterAt(mechanism, -1).id).toBe('beaker-start')
  })

  it('the state carries its chapter and that chapter\'s explanation at both depths', () => {
    for (const chapter of mechanism.chapters) {
      const s = state(mechanism, (chapter.range[0] + chapter.range[1]) / 2)
      expect(s.chapter).toBe(chapter)
      expect(s.explanation).toBe(chapter.explanation)
    }
    expect(stepsOf(mechanism).map((s) => s.id)).toEqual(['dissolving', 'proton-transfer', 'decomposition', 'gas-escapes'])
    expect(chapterStart(mechanism, 'decomposition')).toBe(0.52)
  })

  it('finds the move a position is in, and is at its end only at the end of the track', () => {
    expect(moveAt(mechanism, 0)).toMatchObject({ from: { id: 'beaker' }, to: { id: 'acid' }, progress: 0 })
    expect(moveAt(mechanism, at('encounter'))).toMatchObject({ from: { id: 'encounter' }, to: { id: 'acid-formed' }, progress: 0 })
    expect(moveAt(mechanism, 1)).toMatchObject({ from: { id: 'gas-gone' }, to: { id: 'beaker-after' }, progress: 1 })
    const half = moveAt(mechanism, (at('solid-ready') + at('solid-in')) / 2)
    expect([half.from.id, half.to.id]).toEqual(['solid-ready', 'solid-in'])
    expect(half.progress).toBeCloseTo(0.5, 12)
  })
})

describe('bonds between keyframes', () => {
  const [start, end] = [at('encounter'), at('acid-formed')]

  it('a bond that is breaking and one that is forming are drawn as partial, and together make one bond', () => {
    for (const u of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      const s = state(mechanism, start + (end - start) * u)
      const [breaking, forming] = [bond(s, 'o-hydronium', 'h-transfer')!, bond(s, 'o-acceptor', 'h-transfer')!]
      expect(breaking.partial && forming.partial).toBe(true)
      expect(breaking.order).toBeGreaterThan(0)
      expect(breaking.order).toBeLessThan(1)
      expect(breaking.order + forming.order).toBeCloseTo(1, 12)
      // Every other bond is whole.
      expect(s.bonds.filter((b) => b.partial)).toHaveLength(2)
      expect(s.bonds.filter((b) => !b.partial).every((b) => Number.isInteger(b.order))).toBe(true)
    }
  })

  it('the breaking bond weakens as the forming one grows', () => {
    const orders = [0.2, 0.4, 0.6, 0.8].map((u) => bond(state(mechanism, start + (end - start) * u), 'o-acceptor', 'h-transfer')!.order)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
    expect(bond(state(mechanism, start), 'o-acceptor', 'h-transfer')).toBeUndefined()
    expect(bond(state(mechanism, end), 'o-hydronium', 'h-transfer')).toBeUndefined()
  })

  it('a bond whose order changes is partial between one and two: carbon to the oxygen that stays, in step 3', () => {
    const s = state(mechanism, (at('relay-ready') + at('split')) / 2)
    expect(bond(s, 'c', 'o-hydroxyl')!.partial).toBe(true)
    expect(bond(s, 'c', 'o-hydroxyl')!.order).toBeCloseTo(1.5, 12)
    expect(bond(s, 'c', 'o-carbonyl')).toMatchObject({ order: 2, partial: false })
    expect(s.bonds.filter((b) => b.partial)).toHaveLength(6)
  })

  it('no bond is partial where no bond changes', () => {
    for (const t of [0.03, 0.1, 0.2, 0.28, 0.37, 0.57, 0.8, 0.9, 0.97]) expect(state(mechanism, t).bonds.some((b) => b.partial)).toBe(false)
  })
})

describe('what the choreography looks like (spec 9.1, and the brief: chemically sensible to look at)', () => {
  const index = new Map(mechanism.actors.map((a, i) => [a.id, i]))
  const pairKey = (a: string, b: string) => (a < b ? `${a} ${b}` : `${b} ${a}`)

  it('the proton of step 2 is the same atom throughout: on the hydronium oxygen, then between the two oxygens, then on the hydrogen carbonate oxygen', () => {
    const far = (t: number, oxygen: string) => distance(atom(state(mechanism, t), 'h-transfer').position, atom(state(mechanism, t), oxygen).position)
    for (const t of [0, 0.2, at('dissolved'), at('encounter')]) expect(far(t, 'o-hydronium')).toBeCloseTo(far(0, 'o-hydronium'), 3)
    expect(far(at('encounter'), 'o-acceptor')).toBeGreaterThan(1.5)
    const middle = (at('encounter') + at('acid-formed')) / 2
    expect(far(middle, 'o-hydronium')).toBeLessThan(1.5)
    expect(far(middle, 'o-acceptor')).toBeLessThan(1.5)
    for (const t of [at('acid-formed'), 0.6, at('split'), 1]) expect(far(t, 'o-acceptor')).toBeLessThan(1)
    expect(far(1, 'o-hydronium')).toBeGreaterThan(2.5)
  })

  it('step 3 uses an explicit water: it takes a hydrogen from one oxygen of carbonic acid and gives one of its own to the other', () => {
    const species = (t: number, oxygen: string) => state(mechanism, t).species.find((s) => s.atoms.includes(oxygen))!
    expect(species(at('acid-formed'), 'o-relay')).toMatchObject({ speciesId: 'water', atoms: ['o-relay', 'h-relay-give', 'h-relay-keep'] })
    expect(species(at('split'), 'o-relay')).toMatchObject({ speciesId: 'water', atoms: ['o-relay', 'h-hydroxyl', 'h-relay-keep'] })
    expect(species(at('split'), 'o-acceptor')).toMatchObject({ speciesId: 'water', atoms: ['o-acceptor', 'h-transfer', 'h-relay-give'] })
    expect(species(at('split'), 'c')).toMatchObject({ speciesId: 'carbon-dioxide', atoms: ['c', 'o-hydroxyl', 'o-carbonyl'] })
    // Before the relay, each hydrogen it will move is within hydrogen-bonding reach of the oxygen it goes to.
    const ready = state(mechanism, at('relay-ready'))
    expect(distance(atom(ready, 'h-hydroxyl').position, atom(ready, 'o-relay').position)).toBeCloseTo(1.82, 1)
    expect(distance(atom(ready, 'h-relay-give').position, atom(ready, 'o-acceptor').position)).toBeCloseTo(1.91, 1)
  })

  it('the solid comes apart in step 1, and the sodium and chloride ions are still there at the end', () => {
    const apart = (t: number) => distance(atom(state(mechanism, t), 'na').position, atom(state(mechanism, t), 'c').position)
    expect(apart(at('solid-ready'))).toBeCloseTo(apart(at('solid-in')), 3)
    expect(apart(at('solid-in'))).toBeLessThan(4)
    expect(apart(at('dissolved'))).toBeGreaterThan(8)
    const [atEnd, afterStep1] = [state(mechanism, 1), state(mechanism, at('dissolved'))]
    for (const ion of ['na', 'cl']) expect(atom(atEnd, ion).position).toEqual(atom(afterStep1, ion).position)
    expect(atom(atEnd, 'na').ion).toEqual({ charge: 1, radius: 1.02 })
    expect(atom(atEnd, 'cl').ion).toEqual({ charge: -1, radius: 1.81 })
    expect(atom(atEnd, 'c').ion).toBeUndefined()
  })

  it('the carbon dioxide leaves in step 4: it ends more than 8 Å from everything else', () => {
    const s = state(mechanism, 1)
    const gas = ['c', 'o-hydroxyl', 'o-carbonyl']
    for (const other of s.atoms.filter((a) => !gas.includes(a.id))) expect(distance(other.position, atom(s, 'c').position)).toBeGreaterThan(8)
  })

  it('at no position do two atoms that are not bonded there sit within 0.9 Å, nor two heavy atoms within 2 Å', () => {
    for (const t of grid) {
      const s = state(mechanism, t)
      const bonded = new Set(s.bonds.map((b) => pairKey(b.a, b.b)))
      // Two atoms of one species (the two hydrogens of a water) are as near as its shape has them.
      const { from, to } = moveAt(mechanism, t)
      const together = new Set([from, to].flatMap((k) => k.species.flatMap((sp) => sp.atoms.flatMap((a) => sp.atoms.map((b) => pairKey(a, b))))))
      s.atoms.forEach((a, i) =>
        s.atoms.slice(i + 1).forEach((b) => {
          if (bonded.has(pairKey(a.id, b.id)) || together.has(pairKey(a.id, b.id))) return
          const d = distance(a.position, b.position)
          expect([t, a.id, b.id, d > 0.9]).toEqual([t, a.id, b.id, true])
          if (a.element !== 'H' && b.element !== 'H') expect([t, a.id, b.id, d > 2]).toEqual([t, a.id, b.id, true])
        }),
      )
    }
  })

  it('a bond that is whole at both ends of a move never shrinks below nine tenths of its length on the way', () => {
    for (const [k, from] of mechanism.keyframes.slice(0, -1).entries()) {
      const to = mechanism.keyframes[k + 1]!
      const length = (keyframe: typeof from, a: string, b: string) => distance(keyframe.positions[index.get(a)!]!, keyframe.positions[index.get(b)!]!)
      for (const whole of from.bonds.filter((b) => to.bonds.some((other) => pairKey(other.a, other.b) === pairKey(b.a, b.b)))) {
        const shortest = Math.min(length(from, whole.a, whole.b), length(to, whole.a, whole.b))
        for (let step = 1; step < 10; step++) {
          const s = state(mechanism, from.t + ((to.t - from.t) * step) / 10)
          expect([from.id, whole.a, whole.b, distance(atom(s, whole.a).position, atom(s, whole.b).position) > 0.9 * shortest]).toEqual([from.id, whole.a, whole.b, true])
        }
      }
    }
  })
})

describe('active species', () => {
  it('names the species of the scene as of the last keyframe passed, and marks the ones the chapter is about', () => {
    const names = (t: number) => state(mechanism, t).species.map((s) => `${'ion' in s ? s.ion : s.speciesId}${s.active ? '*' : ''}`)
    expect(names(0.03)).toEqual(['Na', 'bicarbonate', 'hydronium', 'water', 'Cl'])
    expect(names(0.1)).toEqual(['Na', 'bicarbonate', 'hydronium*', 'water', 'Cl*'])
    expect(names(0.2)).toEqual(['Na*', 'bicarbonate*', 'hydronium', 'water', 'Cl'])
    expect(names(0.4)).toEqual(['Na', 'bicarbonate*', 'hydronium*', 'water', 'Cl'])
    // While the proton is on its way the species are still the two that met.
    expect(names(0.47)).toEqual(['Na', 'bicarbonate*', 'hydronium*', 'water', 'Cl'])
    expect(names(0.52)).toEqual(['Na', 'carbonic-acid*', 'water', 'water*', 'Cl'])
    expect(names(0.8)).toEqual(['Na', 'carbon-dioxide*', 'water', 'water', 'water', 'Cl'])
    expect(names(1)).toEqual(['Na*', 'carbon-dioxide', 'water', 'water', 'water', 'Cl*'])
  })

  it('marks the same atoms as taking part as the species they are in', () => {
    const s = state(mechanism, 0.4)
    expect(s.atoms.filter((a) => a.active).map((a) => a.id)).toEqual(['c', 'o-hydroxyl', 'o-acceptor', 'o-carbonyl', 'h-hydroxyl', 'o-hydronium', 'h-transfer', 'h-hydronium-1', 'h-hydronium-2'])
  })
})

describe('electron-pair paths', () => {
  it('are shown only during the move of a step in which its bonds change', () => {
    const shown = grid.filter((t) => state(mechanism, t).electronPaths.length > 0)
    expect(shown.every((t) => (t >= at('encounter') && t < at('acid-formed')) || (t >= at('relay-ready') && t < at('split')))).toBe(true)
    expect(state(mechanism, 0.47).electronPaths).toHaveLength(2)
    expect(state(mechanism, 0.7).electronPaths).toHaveLength(5)
  })

  it('each runs from where its pair is to where it goes, and is as far along as the move', () => {
    const s = state(mechanism, 0.47)
    const [onto, off] = s.electronPaths
    // A lone pair on the oxygen of hydrogen carbonate becomes the bond to the proton...
    expect(onto!.from).toEqual(atom(s, 'o-acceptor').position)
    expect(distance(onto!.to, atom(s, 'h-transfer').position)).toBeCloseTo(distance(onto!.to, atom(s, 'o-acceptor').position), 9)
    // ...and the pair that held the proton to the hydronium oxygen stays on that oxygen.
    expect(off!.to).toEqual(atom(s, 'o-hydronium').position)
    expect(off!.fromSite).toEqual({ bond: ['o-hydronium', 'h-transfer'] })
    expect(onto!.progress).toBe(moveAt(mechanism, 0.47).progress)
    expect(onto!.progress).toBeCloseTo(0.5, 12)
  })
})

describe('the camera target', () => {
  it('moves without a jump along the whole track and always frames something', () => {
    let previous = state(mechanism, 0).camera
    for (const t of Array.from({ length: 2001 }, (_, i) => i / 2000)) {
      const { camera } = state(mechanism, t)
      expect(distance(camera.target, previous.target)).toBeLessThan(0.2)
      expect(camera.radius).toBeGreaterThan(1.5)
      previous = camera
    }
  })

  it('closes in on the two that react in step 2, and takes in the whole scene at both ends', () => {
    const middle = state(mechanism, at('encounter'))
    expect(middle.camera.radius).toBeLessThan(2.5)
    expect(distance(middle.camera.target, atom(middle, 'h-transfer').position)).toBeLessThan(1.5)
    expect(state(mechanism, 0).camera.radius).toBeGreaterThan(8)
    expect(state(mechanism, 1).camera.radius).toBeGreaterThan(8)
  })
})
