import { describe, expect, it } from 'vitest'
import { registry } from '@/chem-data/registry'
import { distance } from '@/chem-data/geometry'
import { hclNahco3 as mechanism } from './data'
import { chapterAt, chapterStart, state, stepsOf } from './state'
import { overallEnergy } from './energy'

// Spec 9.3, the mechanism phase's acceptance list, on the record as built.

const pairKey = (a: string, b: string) => (a < b ? `${a} ${b}` : `${b} ${a}`)
const keyframeAt = (t: number) => {
  const found = mechanism.keyframes.find((k) => k.t === t)
  if (!found) throw new Error(`no keyframe at ${t}`)
  return found
}
const steps = stepsOf(mechanism)
const boundaries = [...new Set(mechanism.chapters.flatMap((c) => c.range))]

describe('the track', () => {
  it('is a beaker bookend, the prologue, steps 1 to 4 and a beaker bookend, end to end from 0 to 1', () => {
    expect(mechanism.chapters.map((c) => `${c.kind} ${c.id}`)).toEqual([
      'bookend beaker-start',
      'prologue prologue',
      'step dissolving',
      'step proton-transfer',
      'step decomposition',
      'step gas-escapes',
      'bookend beaker-end',
    ])
    expect(mechanism.chapters[0]!.range[0]).toBe(0)
    expect(mechanism.chapters.at(-1)!.range[1]).toBe(1)
    mechanism.chapters.slice(1).forEach((chapter, i) => expect(chapter.range[0]).toBe(mechanism.chapters[i]!.range[1]))
  })

  it('has a keyframe at every chapter boundary, with a position for every actor', () => {
    for (const t of boundaries) expect(keyframeAt(t).positions).toHaveLength(mechanism.actors.length)
    expect(new Set(mechanism.actors.map((a) => a.id)).size).toBe(mechanism.actors.length)
  })
})

describe('continuity (spec 9.3)', () => {
  it.each(boundaries.filter((t) => t > 0 && t < 1))('just before and just after the boundary at %s, every atom is in the same place within 0.001 Å', (t) => {
    const [before, at, after] = [state(mechanism, t - 1e-7), state(mechanism, t), state(mechanism, t + 1e-7)]
    const place = (s: typeof at, id: string) => s.atoms.find((atom) => atom.id === id)?.position
    for (const atom of at.atoms) {
      // An atom that is added at this boundary has no place before it: it is where the keyframe has it, and stays.
      const was = place(before, atom.id)
      if (was) expect(distance(was, atom.position)).toBeLessThan(1e-3)
      else expect(mechanism.actors.find((a) => a.id === atom.id)!.enters).toBe(chapterAt(mechanism, t).id)
      expect(distance(place(after, atom.id)!, atom.position)).toBeLessThan(1e-3)
    }
    // Nothing leaves the scene at a boundary.
    expect(before.atoms.every((atom) => place(at, atom.id))).toBe(true)
    // The camera's target and the energy cursor do not jump either.
    expect(distance(before.camera.target, after.camera.target)).toBeLessThan(1e-3)
    expect(Math.abs(before.energy.g - after.energy.g)).toBeLessThan(1e-2)
    expect(Math.abs(before.energy.h - after.energy.h)).toBeLessThan(1e-2)
  })

  it('at a boundary the state is the keyframe itself: its positions and its whole bonds, for every atom that is in the scene by then', () => {
    for (const t of boundaries) {
      const keyframe = keyframeAt(t)
      const at = state(mechanism, t)
      const there = (id: string) => at.atoms.some((a) => a.id === id)
      expect(at.atoms.map((a) => a.position)).toEqual(keyframe.positions.filter((_, i) => there(mechanism.actors[i]!.id)))
      expect(at.bonds.map((b) => `${pairKey(b.a, b.b)} ${b.order}`).sort()).toEqual(keyframe.bonds.filter((b) => there(b.a)).map((b) => `${pairKey(b.a, b.b)} ${b.order}`).sort())
      expect(at.bonds.every((b) => !b.partial)).toBe(true)
    }
  })

  it('the record places every actor at every keyframe, the ones not yet in the scene too: what the scene leaves out, it leaves out whole', () => {
    for (const t of boundaries) {
      const [keyframe, at] = [keyframeAt(t), state(mechanism, t)]
      const there = new Set(at.atoms.map((a) => a.id))
      for (const species of keyframe.species) expect(new Set(species.atoms.map((id) => there.has(id))).size).toBe(1)
      expect(there.size).toBe(t < chapterStart(mechanism, 'dissolving')! ? 8 : mechanism.actors.length)
    }
  })
})

describe('bond bookkeeping (spec 9.3)', () => {
  it.each(steps.map((step) => [step.id, step] as const))('%s: each bond broken is there before and each bond formed is not, and the end is the start less the broken plus the formed', (_id, step) => {
    const orders = (t: number) => new Map(keyframeAt(t).bonds.map((b) => [pairKey(b.a, b.b), b.order]))
    const [before, after] = [orders(step.range[0]), orders(step.range[1])]
    for (const [a, b] of step.bondsBroken) expect(before.has(pairKey(a, b))).toBe(true)
    for (const [a, b] of step.bondsFormed) expect(before.has(pairKey(a, b))).toBe(false)
    for (const change of step.orderChanges) expect(before.get(pairKey(...change.bond))).toBe(change.from)

    const expected = new Map(before)
    for (const [a, b] of step.bondsBroken) expected.delete(pairKey(a, b))
    // A bond that forms is a single bond: every one in this mechanism is a bond to hydrogen.
    for (const [a, b] of step.bondsFormed) expected.set(pairKey(a, b), 1)
    for (const change of step.orderChanges) expected.set(pairKey(...change.bond), change.to)
    expect([...expected].sort()).toEqual([...after].sort())
  })

  it('no bond changes outside a step', () => {
    for (const chapter of mechanism.chapters.filter((c) => c.kind !== 'step')) {
      expect(keyframeAt(chapter.range[0]).bonds).toEqual(keyframeAt(chapter.range[1]).bonds)
    }
  })

  it('the steps that the spec gives bonds to are the two that have them', () => {
    expect(steps.map((s) => [s.id, s.bondsBroken.length, s.bondsFormed.length, s.orderChanges.length])).toEqual([
      ['dissolving', 0, 0, 0],
      ['proton-transfer', 1, 1, 0],
      ['decomposition', 3, 2, 1],
      ['gas-escapes', 0, 0, 0],
    ])
  })

  it('the proton that moves in step 2 is one atom, bonded to the hydronium oxygen before and to an oxygen of hydrogen carbonate after', () => {
    const [step] = steps.filter((s) => s.id === 'proton-transfer')
    expect(step!.bondsBroken).toEqual([['o-hydronium', 'h-transfer']])
    expect(step!.bondsFormed).toEqual([['o-acceptor', 'h-transfer']])
  })

  it('every electron-pair path leaves a lone pair or a bond that is lost or lowered, and arrives as a lone pair or a bond that is gained or raised', () => {
    for (const step of steps) {
      const lost = new Set([...step.bondsBroken.map(([a, b]) => pairKey(a, b)), ...step.orderChanges.filter((c) => c.to < c.from).map((c) => pairKey(...c.bond))])
      const gained = new Set([...step.bondsFormed.map(([a, b]) => pairKey(a, b)), ...step.orderChanges.filter((c) => c.to > c.from).map((c) => pairKey(...c.bond))])
      for (const path of step.electronPaths) {
        if ('bond' in path.from) expect(lost.has(pairKey(...path.from.bond))).toBe(true)
        if ('bond' in path.to) expect(gained.has(pairKey(...path.to.bond))).toBe(true)
      }
      // Each bond lost and each bond gained is one pair of electrons that an arrow accounts for.
      expect(step.electronPaths.filter((p) => 'bond' in p.from)).toHaveLength(lost.size)
      expect(step.electronPaths.filter((p) => 'bond' in p.to)).toHaveLength(gained.size)
    }
  })
})

describe('the same atoms, the same charge and library connectivity at every chapter boundary (spec 9.3)', () => {
  const chargeOf = (species: (typeof mechanism.keyframes)[number]['species'][number]) =>
    'ion' in species ? species.charge : registry.molecules.find((m) => m.id === species.speciesId)!.charge

  it.each(boundaries)('at %s every actor is in exactly one species, and the scene has no net charge', (t) => {
    const keyframe = keyframeAt(t)
    expect(keyframe.species.flatMap((s) => s.atoms).sort()).toEqual(mechanism.actors.map((a) => a.id).sort())
    expect(keyframe.species.reduce((sum, s) => sum + chargeOf(s), 0)).toBe(0)
  })

  it.each(boundaries)("at %s every species' atoms and bonds are its library record's", (t) => {
    const keyframe = keyframeAt(t)
    const elementOf = new Map(mechanism.actors.map((a) => [a.id, a.element]))
    const claimed: string[] = []
    for (const species of keyframe.species) {
      if ('ion' in species) {
        expect(elementOf.get(species.atoms[0]!)).toBe(species.ion)
        continue
      }
      const molecule = registry.molecules.find((m) => m.id === species.speciesId)!
      expect(species.atoms.map((id) => elementOf.get(id))).toEqual(molecule.atoms.map((a) => a.element))
      const own = keyframe.bonds.filter((b) => species.atoms.includes(b.a) || species.atoms.includes(b.b))
      const library = molecule.bonds.map((b) => `${pairKey(species.atoms[b.a]!, species.atoms[b.b]!)} ${b.order}`)
      expect(own.map((b) => `${pairKey(b.a, b.b)} ${b.order}`).sort()).toEqual(library.sort())
      claimed.push(...library)
      // The species is the library's shape, moved and turned but not bent: every distance within it is the record's.
      const at = (id: string) => keyframe.positions[mechanism.actors.findIndex((a) => a.id === id)]!
      molecule.atoms.forEach((a, i) =>
        molecule.atoms.forEach((b, j) => expect(Math.abs(distance(at(species.atoms[i]!), at(species.atoms[j]!)) - distance(a.position, b.position))).toBeLessThan(2e-3)),
      )
    }
    // No bond joins two species.
    expect(keyframe.bonds).toHaveLength(claimed.length)
  })

  it('the species at the start and at the end are those of the equation', () => {
    const names = (t: number) => keyframeAt(t).species.map((s) => ('ion' in s ? s.ion : s.speciesId)).sort()
    expect(names(0)).toEqual(['Cl', 'Na', 'bicarbonate', 'hydronium', 'water'])
    expect(names(1)).toEqual(['Cl', 'Na', 'carbon-dioxide', 'water', 'water', 'water'])
  })
})

describe('energies (spec 9.3)', () => {
  it('the step enthalpies sum to +31.4 kJ/mol and the step free energies to -42.4 kJ/mol, within 0.5', () => {
    const sum = (key: 'deltaH' | 'deltaG') => steps.reduce((total, step) => total + (step[key]?.value ?? 0), 0)
    expect(steps).toHaveLength(4)
    expect(Math.abs(sum('deltaH') - 31.4)).toBeLessThan(0.5)
    expect(Math.abs(sum('deltaG') - -42.4)).toBeLessThan(0.5)
    expect(overallEnergy(mechanism).deltaH).toBeCloseTo(31.351, 3)
    expect(overallEnergy(mechanism).deltaG).toBeCloseTo(-42.393, 3)
  })

  it('the prologue and the bookends carry no energy values', () => {
    for (const chapter of mechanism.chapters.filter((c) => c.kind !== 'step')) {
      expect(Object.keys(chapter)).not.toContain('deltaH')
      expect(Object.keys(chapter)).not.toContain('deltaG')
    }
  })
})

describe('deep links (spec 9.3)', () => {
  it.each(mechanism.chapters.map((c) => [c.id, c.range[0]] as const))("?step=%s opens at that chapter's start, %s", (id, start) => {
    const t = chapterStart(mechanism, id)
    expect(t).toBe(start)
    expect(chapterAt(mechanism, t!).id).toBe(id)
    expect(state(mechanism, t!).chapter.id).toBe(id)
  })

  it('the spec\'s own link, ?step=proton-transfer, is step 2', () => {
    expect(chapterStart(mechanism, 'proton-transfer')).toBe(0.32)
  })

  it('a link to no chapter opens nowhere', () => {
    expect(chapterStart(mechanism, 'no-such-step')).toBeNull()
    expect(chapterStart(mechanism, '')).toBeNull()
  })
})
