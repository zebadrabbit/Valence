import { describe, expect, it } from 'vitest'
import authoredChoreography from '../../docs/research/phase-5/choreography.json'
import authoredRecord from '../../docs/research/phase-5/mechanism.json'
import manifest from '../../docs/research/phase-5/sources/MANIFEST.json'
import aqueousManifest from '../../docs/research/phase-4/sources/MANIFEST.json'
import elements from '@/chem-data/elements.json'
import { moleculeFiles } from '@/chem-data/molecules'
import { distance, type Vec3 } from '@/chem-data/geometry'
import stored from './hcl-nahco3.json'

// What scripts/build-chem-data.mjs does for the mechanism: it holds the authored record to its manifest of
// sources, places the library's species at each keyframe, works out the step energies, and holds the record and
// the choreography to each other. Tested here on the real inputs and on inputs it must refuse. The script itself
// writes files, so this work lives in scripts/mechanism-lib.mjs and scripts/aqueous-lib.mjs as plain functions.
type Anchors = { origin: { atom: number; at: Vec3 }; aim: { atom: number; toward: Vec3 }; roll?: { atom: number; toward: Vec3 } }
type Built = { id: string; t: number; positions: Vec3[]; bonds: { a: string; b: string; order: number }[]; species: { speciesId?: string; ion?: string; atoms: string[] }[] }
type Lib = {
  placeRigid(atoms: Vec3[], anchors: Anchors, where: string): Vec3[]
  turnAbout(point: Vec3, a: Vec3, b: Vec3, degrees: number): Vec3
  buildKeyframes(choreography: unknown, molecules: unknown, elements: unknown): Built[]
  checkContacts(actors: unknown, keyframes: unknown): void
  buildMechanism(record: unknown, choreography: unknown, molecules: unknown, elements: unknown): unknown
  sceneCharge(keyframe: { species: { speciesId?: string; ion?: string; charge?: number }[] }, molecules: unknown): number
}
type Checks = { checkSupported(record: unknown, sources: unknown): void; newSources(sources: unknown, earlier: unknown, where: string): { id: string }[] }
const [lib] = Object.values(import.meta.glob<Lib>('../../scripts/mechanism-lib.mjs', { eager: true }))
const [checks] = Object.values(import.meta.glob<Checks>('../../scripts/aqueous-lib.mjs', { eager: true }))
const { placeRigid, turnAbout, buildKeyframes, checkContacts, buildMechanism, sceneCharge } = lib!
const { checkSupported, newSources } = checks!

// The authored files as loosely as a test that breaks them needs: what each key may hold is the build's to say.
type Placed = { species?: string; ion?: string; charge?: number; atom?: string; atoms?: string[]; at?: unknown; aim?: { atom: string; toward: unknown } }
type Choreography = { actors: { id: string; element: string; enters?: string }[]; keyframes: { id: string; t: number; easing?: string; frame: string[]; units?: { unit: string; of: string[] }[]; place: Placed[] }[] }
type Authored = {
  species: unknown[]
  thermo: { formation: { gibbs: { sourceId: string } }[]; carbonicAcid: { pKa: { published: string } } }
  chapters: { id: string; kind: string; from: string; to: string; timescale: unknown; active: string[]; bondsBroken?: string[][]; bondsFormed?: string[][]; orderChanges?: unknown[]; reaction?: { products: string[] } | null; deltaH?: string; deltaG?: string; activationG?: string }[]
}
const choreography = authoredChoreography as Choreography
const authored = authoredRecord as unknown as Authored
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value))
/** A keyframe of a choreography, by its id. */
const at = (c: Choreography, id: string) => c.keyframes.find((k) => k.id === id)!
const build = (record: unknown = authored, moves: unknown = choreography) => buildMechanism(record, moves, moleculeFiles, elements)
const shape = (id: string) => moleculeFiles.find((m) => m.id === id)!.atoms.map((a) => a.position as unknown as Vec3)
const water = shape('water')
const carbonDioxide = shape('carbon-dioxide')

describe('the record as built', () => {
  it('is what the build writes from the authored record and the choreography', () => {
    expect(build()).toEqual(stored)
  })

  it('rests on its manifest: every cited value has a row of its source, and every row a value', () => {
    expect(() => checkSupported(authored, manifest.sources)).not.toThrow()
    // The tables are the aqueous lab's source too, under one id, address and citation, and are listed once.
    expect(newSources(manifest.sources, aqueousManifest.sources, 'the manifest').map((s) => s.id)).toEqual(['pines-2016', 'nist-codata-2022'])
  })

  it('refuses a value whose source has no row for it, a figure the row does not print, and a row with no value', () => {
    const unsupported = copy(authored)
    unsupported.thermo.formation[1]!.gibbs.sourceId = 'pines-2016'
    expect(() => checkSupported(unsupported, manifest.sources)).toThrow(/thermo\.formation\[sodium-ion\]\.gibbs: the source "pines-2016" has no row that names it/)
    const misprinted = copy(authored)
    misprinted.thermo.carbonicAcid.pKa.published = '3.45'
    expect(() => checkSupported(misprinted, manifest.sources)).toThrow(/no row that prints 3\.45/)
    const uncited = copy(authored)
    uncited.chapters[3]!.timescale = { value: 'picoseconds to nanoseconds', rationale: 'none' }
    expect(() => checkSupported(uncited, manifest.sources)).toThrow(/has a row for chapters\[proton-transfer\]\.timescale, which does not cite it/)
  })
})

describe('placeRigid', () => {
  it('puts the origin atom at its point, the aimed atom on the line toward its target and the rolled atom on its side, and changes no distance', () => {
    const placed = placeRigid(water, { origin: { atom: 0, at: [1, 2, 3] }, aim: { atom: 1, toward: [1, 2, 9] }, roll: { atom: 2, toward: [5, 2, 3] } }, 'a water')
    expect(placed[0]).toEqual([1, 2, 3])
    expect(placed[1]![0]).toBeCloseTo(1, 9)
    expect(placed[1]![1]).toBeCloseTo(2, 9)
    expect(placed[1]![2]).toBeCloseTo(3 + distance(water[0]!, water[1]!), 9)
    expect(placed[2]![1]).toBeCloseTo(2, 9)
    expect(placed[2]![0]).toBeGreaterThan(1)
    for (const [i, j] of [[0, 1], [0, 2], [1, 2]] as const) expect(distance(placed[i]!, placed[j]!)).toBeCloseTo(distance(water[i]!, water[j]!), 9)
  })

  it('never mirrors a species: hydronium keeps its handedness', () => {
    const hydronium = shape('hydronium')
    const handedness = ([o, a, b, c]: Vec3[]) => {
      const [u, v, w] = [a!, b!, c!].map((p) => [p[0] - o![0], p[1] - o![1], p[2] - o![2]])
      return Math.sign(u![0]! * (v![1]! * w![2]! - v![2]! * w![1]!) - u![1]! * (v![0]! * w![2]! - v![2]! * w![0]!) + u![2]! * (v![0]! * w![1]! - v![1]! * w![0]!))
    }
    const placed = placeRigid(hydronium, { origin: { atom: 0, at: [4, -1, 2] }, aim: { atom: 1, toward: [-3, 5, 0] }, roll: { atom: 2, toward: [0, 0, -7] } }, 'a hydronium')
    expect(handedness(placed)).toBe(handedness(hydronium))
  })

  it('places a straight species by two anchors, and refuses a bent one without a roll or anchors that give no direction', () => {
    const placed = placeRigid(carbonDioxide, { origin: { atom: 0, at: [0, 0, 0] }, aim: { atom: 1, toward: [0, 5, 0] } }, 'a carbon dioxide')
    expect(placed.map((p) => p.map((x) => Number(x.toFixed(3))))).toEqual([[0, 0, 0], [0, 1.162, 0], [0, -1.162, 0]])
    expect(() => placeRigid(water, { origin: { atom: 0, at: [0, 0, 0] }, aim: { atom: 1, toward: [0, 5, 0] } }, 'a water')).toThrow(/needs a roll/)
    expect(() => placeRigid(water, { origin: { atom: 0, at: [0, 0, 0] }, aim: { atom: 1, toward: [0, 0, 0] }, roll: { atom: 2, toward: [1, 0, 0] } }, 'a water')).toThrow(/coincide/)
    expect(() => placeRigid(water, { origin: { atom: 0, at: [0, 0, 0] }, aim: { atom: 1, toward: [0, 5, 0] }, roll: { atom: 2, toward: [0, 9, 0] } }, 'a water')).toThrow(/coincide/)
  })
})

describe('turnAbout', () => {
  it('turns a point about a line and keeps its distance from both ends of it', () => {
    const rounded = (point: Vec3) => point.map((x) => Number(x.toFixed(9)) + 0)
    expect(rounded(turnAbout([1, 0, 5], [0, 0, 0], [0, 0, 2], 90))).toEqual([0, 1, 5])
    expect(rounded(turnAbout([1, 0, 5], [0, 0, 0], [0, 0, 2], 360))).toEqual([1, 0, 5])
  })
})

describe('buildKeyframes', () => {
  const keyframes = buildKeyframes(choreography, moleculeFiles, elements)

  it('keeps a species where it was put until a keyframe places one of its atoms again', () => {
    const at = (id: string, actor: string) => keyframes.find((k) => k.id === id)!.positions[choreography.actors.findIndex((a) => a.id === actor)]
    // The chloride ion is placed once, in the first keyframe, and is there in the last.
    expect(at('beaker-after', 'cl')).toEqual(at('beaker', 'cl'))
    // The hydrogen carbonate ion is placed again when the solid goes in, and stays through the next two keyframes.
    expect(at('solid-in', 'c')).not.toEqual(at('solid-ready', 'c'))
    expect(at('encounter', 'c')).toEqual(at('solid-in', 'c'))
  })

  it('gives each keyframe the bonds of the library records of its species, named by actor', () => {
    const first = keyframes[0]!
    expect(first.bonds).toHaveLength(4 + 3 + 2)
    expect(first.bonds).toContainEqual({ a: 'o-carbonyl', b: 'c', order: 2 })
    expect(first.bonds).toContainEqual({ a: 'o-hydronium', b: 'h-transfer', order: 1 })
    expect(keyframes.at(-1)!.bonds.filter((b) => b.order === 2)).toHaveLength(2)
  })

  const broken = (change: (c: typeof choreography) => void) => {
    const changed = copy(choreography)
    change(changed)
    return () => buildKeyframes(changed, moleculeFiles, elements)
  }

  it('refuses an actor with no place, an actor placed twice, and a species whose atoms are only partly placed again', () => {
    expect(broken((c) => at(c, 'beaker').place.pop())).toThrow(/keyframe "beaker": no place for cl/)
    expect(broken((c) => at(c, 'beaker').place.push({ ion: 'Cl', charge: -1, atom: 'cl', at: [0, 0, 0] }))).toThrow(/"cl" is placed twice/)
    // The sodium ion alone is placed again where the hydrogen carbonate ion is too: taking the ion's placement out leaves the solid's other half where it was, which is allowed...
    expect(broken((c) => at(c, 'solid-in').place.pop())).not.toThrow()
    // ...but a carbon dioxide made of three of carbonic acid's six atoms leaves the other three with no place.
    expect(broken((c) => (at(c, 'split').place = [at(c, 'split').place[0]!]))).toThrow(/keyframe "split": no place for/)
  })

  it('refuses an actor placed as the wrong element, a species the library has not, and the wrong number of actors', () => {
    expect(broken((c) => (at(c, 'beaker').place[0]!.atoms = ['c', 'o-acceptor', 'o-carbonyl', 'o-hydroxyl', 'h-hydroxyl']))).toThrow(/"c" is C, but is placed as O/)
    expect(broken((c) => (at(c, 'beaker').place[0]!.species = 'carbonate'))).toThrow(/the library has no species "carbonate"/)
    expect(broken((c) => at(c, 'beaker').place[0]!.atoms!.pop())).toThrow(/has 5 atoms, and 4 actors are given/)
  })

  it('refuses an ion with no cited radius for its charge', () => {
    expect(broken((c) => (at(c, 'beaker').place[1]!.charge = 2))).toThrow(/no cited ionic radius for Na of charge 2/)
  })

  it('refuses keyframes out of order, a track that does not run from 0 to 1, an unknown easing and a target that is not in place', () => {
    expect(broken((c) => (at(c, 'solid-ready').t = 0.05))).toThrow(/in track order/)
    expect(broken((c) => (c.keyframes.at(-1)!.t = 0.99))).toThrow(/the first keyframe is at 0 and the last at 1/)
    expect(broken((c) => (at(c, 'acid').easing = 'bounce'))).toThrow(/unknown easing "bounce"/)
    expect(broken((c) => (at(c, 'beaker').place[2]!.aim!.toward = 'o-relay'))).toThrow(/neither coordinates nor an actor that is in place/)
  })
})

describe('checkContacts', () => {
  const keyframes = buildKeyframes(choreography, moleculeFiles, elements)

  it('accepts the choreography as authored', () => {
    expect(() => checkContacts(choreography.actors, keyframes)).not.toThrow()
  })

  it('refuses two atoms of different species on top of each other at a keyframe', () => {
    const crowded = copy(choreography)
    at(crowded, 'beaker').place[4]!.at = [3.4, 6.2, 2.2]
    expect(() => checkContacts(crowded.actors, buildKeyframes(crowded, moleculeFiles, elements))).toThrow(/keyframe "beaker": o-hydronium and cl, of different species, are 1\.20 Å apart/)
  })

  it('refuses an atom that passes through another on its way between two keyframes', () => {
    const through = copy(choreography)
    // The sodium ion is sent to the far side of the chloride ion, straight through it.
    at(through, 'dissolved').place[0]!.at = [11.465, 5.6, -4]
    expect(() => checkContacts(through.actors, buildKeyframes(through, moleculeFiles, elements))).toThrow(/between "solid-in" and "dissolved": na and cl pass within/)
  })
})

describe('buildMechanism', () => {
  const broken = (change: (r: typeof authored) => void, moves?: (c: typeof choreography) => void) => {
    const [record, dance] = [copy(authored), copy(choreography)]
    change(record)
    moves?.(dance)
    return () => build(record, dance)
  }
  const step = (r: typeof authored, id: string) => r.chapters.find((c) => c.id === id)!

  it('refuses a step whose bonds broken, bonds formed or changes of order are not the difference between its two keyframes', () => {
    expect(broken((r) => (step(r, 'proton-transfer').bondsBroken = []))).toThrow(/chapter "proton-transfer": the bonds broken between its keyframes are h-transfer o-hydronium/)
    expect(broken((r) => step(r, 'decomposition').bondsFormed!.push(['c', 'o-relay']))).toThrow(/chapter "decomposition": the bonds formed between its keyframes are/)
    expect(broken((r) => (step(r, 'decomposition').orderChanges = []))).toThrow(/the bonds that change order between its keyframes are c o-hydroxyl: 1 to 2/)
    expect(broken((r) => step(r, 'dissolving').bondsBroken!.push(['c', 'o-carbonyl']))).toThrow(/chapter "dissolving": the bonds broken between its keyframes are none/)
  })

  it('refuses chapters that are not a bookend, the prologue, the steps and a bookend, or that leave a gap', () => {
    expect(broken((r) => (r.chapters[1]!.kind = 'bookend'))).toThrow(/a bookend, the prologue, the steps and a bookend/)
    expect(broken((r) => (r.chapters[3]!.from = 'encounter'))).toThrow(/chapter "proton-transfer": it begins where the chapter before it ended/)
    expect(broken((r) => (r.chapters.at(-1)!.to = 'gas-gone'))).toThrow(/it ends after it begins/)
    expect(broken((r) => (r.chapters[2]!.to = 'no-such'))).toThrow(/unknown keyframe "no-such"/)
  })

  it('refuses a chapter boundary at which a species is twisted out of its library shape', () => {
    expect(broken((r) => ((step(r, 'proton-transfer').to = 'relay-ready'), (step(r, 'decomposition').from = 'relay-ready')))).toThrow(/at "relay-ready", a chapter boundary, a species is twisted/)
  })

  it("counts a scene's charge from its species' library records and its ions", () => {
    expect(sceneCharge({ species: [{ speciesId: 'hydronium' }, { speciesId: 'water' }] }, moleculeFiles)).toBe(1)
    expect(sceneCharge({ species: [{ speciesId: 'hydronium' }, { speciesId: 'bicarbonate' }, { ion: 'Na', charge: 1 }, { ion: 'Cl', charge: -1 }] }, moleculeFiles)).toBe(0)
  })

  it('refuses an actor it does not know and species it has no name for', () => {
    expect(broken((r) => step(r, 'dissolving').active.push('k'))).toThrow(/chapter "dissolving": unknown actor "k"/)
    expect(broken((r) => r.species.pop())).toThrow(/`species` names each species the choreography places and each unit it holds together, once/)
  })

  it('refuses a unit that is not two species of the scene, and an actor that enters half a species, at no chapter, or after a chapter that is about it', () => {
    const moved = (change: (c: Choreography) => void) => () => {
      const c = copy(choreography)
      change(c)
      return build(authored, c)
    }
    expect(moved((c) => (at(c, 'solid-in').units = [{ unit: 'sodium-hydrogen-carbonate', of: ['na', 'nobody'] }]))).toThrow(/keyframe "solid-in", unit 1: no species of the scene has the actor "nobody"/)
    expect(moved((c) => (at(c, 'solid-in').units = [{ unit: 'sodium-hydrogen-carbonate', of: ['c', 'o-carbonyl'] }]))).toThrow(/a unit is two species or more, each named once/)
    expect(moved((c) => (at(c, 'solid-in').units = [{ unit: 'pair', of: ['na', 'c'] }]))).toThrow(/`species` names each species/)
    expect(moved((c) => delete c.actors.find((a) => a.id === 'h-hydroxyl')!.enters)).toThrow(/actor "na": at "beaker" it is in a species or a unit that does not all enter at "dissolving"/)
    expect(moved((c) => delete c.actors.find((a) => a.id === 'na')!.enters)).toThrow(/at "beaker" it is in a species or a unit that does not all enter at "dissolving"/)
    expect(moved((c) => (c.actors.find((a) => a.id === 'cl')!.enters = 'nowhere'))).toThrow(/actor "cl": it enters at the start of a chapter after the first, and "nowhere" is not one/)
    expect(moved((c) => (c.actors.find((a) => a.id === 'cl')!.enters = 'beaker-start'))).toThrow(/actor "cl": it enters at the start of a chapter after the first/)
    expect(moved((c) => (c.actors.find((a) => a.id === 'cl')!.enters = 'dissolving'))).toThrow(/actor "cl": the chapter "prologue" is about it, and it enters only at "dissolving"/)
  })

  it('refuses a way of working out an energy that the steps around it do not allow', () => {
    expect(broken((r) => (step(r, 'proton-transfer').deltaH = 'formation'))).toThrow(/an energy from formation values needs a reaction/)
    expect(broken((r) => (step(r, 'decomposition').deltaH = 'formation'))).toThrow(/chapter "proton-transfer": deltaH is/)
    expect(broken((r) => (step(r, 'gas-escapes').deltaG = 'remainder'))).toThrow(/chapter "gas-escapes": deltaG is/)
    expect(broken((r) => (step(r, 'decomposition').activationG = 'guess'))).toThrow(/activationG is "schematic" or "eyring"/)
    expect(broken((r) => step(r, 'gas-escapes').reaction!.products.push('steam'))).toThrow(/no formation values for "steam"/)
  })
})
