import { add, scale, sub, type Vec3 } from '@/chem-data/geometry'
import { energyAt } from './energy'
import type { Chapter, EasingName, ElectronSite, Keyframe, Mechanism, Step } from './schema'

// The scene of a mechanism timeline as a pure function of the scrub position (spec 9.1). Everything a screen
// draws comes from `state(mechanism, t)` and from nothing kept between two calls, so scrubbing backwards gives
// the frames that scrubbing forwards gave.

/** The named easings: how far a move has gone, 0 to 1, when the fraction `u` of its stretch of track is behind. */
export const EASINGS: Record<EasingName, (u: number) => number> = {
  linear: (u) => u,
  /** Starts and ends at rest (smoothstep). */
  easeInOut: (u) => u * u * (3 - 2 * u),
}

export type SceneAtom = { id: string; element: string; position: Vec3; active: boolean; ion?: { charge: number; radius: number } }
/** `order` is the order drawn: whole at a keyframe, and between two keyframes that give the bond different orders (none counts as 0) a fraction, with `partial` set. */
export type SceneBond = { a: string; b: string; order: number; partial: boolean }
/** A library species, a monatomic ion, or a unit of a solid that has not come apart yet: its ions, named as one thing. */
export type SceneSpecies = (Keyframe['species'][number] | { unit: string; atoms: string[] }) & { active: boolean }
/** One pair of electrons on its way: where it leaves from and arrives, in ångström, and how far along it is. */
export type ScenePath = { from: Vec3; to: Vec3; fromSite: ElectronSite; toSite: ElectronSite; progress: number }

export type MechanismState = {
  /** The scrub position the state is of, held to 0..1. */
  t: number
  chapter: Chapter
  /** The atoms that are in the scene at `t`: an actor that `enters` at a later chapter is not there yet. */
  atoms: SceneAtom[]
  bonds: SceneBond[]
  /**
   * What the atoms make up at `t`, from the bonds as they are there: a bond counts once it is more than half
   * formed, and until less than half of it is left. `active` where the chapter is about the species.
   */
  species: SceneSpecies[]
  /** Empty except during the move of a step in which its bonds change. */
  electronPaths: ScenePath[]
  /**
   * Where the cursor of the energy panel is drawn: both curves' values, in kJ/mol from the start of step 1. For
   * drawing only. Part-way through a step it is a point on a drawn curve and not chemistry, so nothing prints it.
   */
  energy: { g: number; h: number }
  camera: { target: Vec3; radius: number }
  explanation: Chapter['explanation']
}

const lerp = (a: Vec3, b: Vec3, u: number): Vec3 => add(a, scale(sub(b, a), u))
const pairKey = (a: string, b: string) => (a < b ? `${a} ${b}` : `${b} ${a}`)
/** 0 for anything that is not a number, and otherwise the number held to 0..1. */
const clamp = (t: number) => (t >= 0 ? Math.min(t, 1) : 0)

export const stepsOf = (mechanism: Mechanism): Step[] => mechanism.chapters.filter((c): c is Step => c.kind === 'step')

/** The chapter the scrub position is in. A boundary belongs to the chapter that begins there, and 1 to the last. */
export function chapterAt(mechanism: Mechanism, t: number): Chapter {
  const at = clamp(t)
  return mechanism.chapters.find((c) => at >= c.range[0] && at < c.range[1]) ?? mechanism.chapters.at(-1)!
}

/** Where a deep link opens (`?step=<id>`): the start of that chapter, or null where no chapter has the id. */
export function chapterStart(mechanism: Mechanism, chapterId: string): number | null {
  return mechanism.chapters.find((c) => c.id === chapterId)?.range[0] ?? null
}

/** The move the scrub position is in: the keyframes at its two ends and how far along it is, eased. */
export function moveAt(mechanism: Mechanism, t: number): { from: Keyframe; to: Keyframe; progress: number } {
  const { keyframes } = mechanism
  const at = clamp(t)
  const next = Math.min(Math.max(keyframes.findIndex((k) => k.t > at), 1), keyframes.length - 1)
  const index = at >= 1 ? keyframes.length - 1 : next
  const [from, to] = [keyframes[index - 1]!, keyframes[index]!]
  return { from, to, progress: EASINGS[to.easing ?? 'linear']((at - from.t) / (to.t - from.t)) }
}

const sameBonds = (a: Keyframe, b: Keyframe) => {
  const list = (k: Keyframe) => k.bonds.map((bond) => `${pairKey(bond.a, bond.b)} ${bond.order}`).sort().join()
  return list(a) === list(b)
}

const sameAtoms = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((id, i) => id === b[i])

/**
 * What the atoms make up part-way through a move. A species of the keyframe behind or of the one ahead is there
 * when the bonds that count at this point, among those that touch its atoms, are that keyframe's own: so the
 * species change when the bonds do, half-way through the move in which they change, and not at its last frame.
 * A unit of a solid is held together by no bond, and is one thing by the same rule: until the move that parts it
 * is more than half done.
 */
function speciesAt(from: Keyframe, to: Keyframe, progress: number, bonds: readonly SceneBond[]): (Keyframe['species'][number] | { unit: string; atoms: string[] })[] {
  const orderIn = (keyframe: Keyframe, bond: SceneBond) => keyframe.bonds.find((b) => pairKey(b.a, b.b) === pairKey(bond.a, bond.b))?.order ?? 0
  const counted = bonds.filter((bond) => (orderIn(to, bond) > orderIn(from, bond) ? bond.order > 0.5 : bond.order >= 0.5))
  const touching = (list: readonly { a: string; b: string }[], atoms: readonly string[]) => list.filter((b) => atoms.includes(b.a) || atoms.includes(b.b)).map((b) => pairKey(b.a, b.b)).sort().join()
  const there = (keyframe: Keyframe) => keyframe.species.filter((one) => touching(keyframe.bonds, one.atoms) === touching(counted, one.atoms))
  const behind = there(from)
  const species = [...behind, ...there(to).filter((one) => !behind.some((other) => sameAtoms(other.atoms, one.atoms)))]

  const held = (progress > 0.5 ? to : from).units ?? []
  return [...species.filter((one) => !held.some((unit) => one.atoms.every((id) => unit.atoms.includes(id)))), ...held]
}

/** The scene at scrub position `t`, from 0 to 1 (spec 9.1). A position outside that is held to it. */
export function state(mechanism: Mechanism, t: number): MechanismState {
  const at = clamp(t)
  const chapter = chapterAt(mechanism, at)
  const { from, to, progress } = moveAt(mechanism, at)
  const active = new Set(chapter.active)
  // An actor that enters at a chapter is in the scene from that chapter's start on.
  const here = new Set(mechanism.actors.filter((actor) => actor.enters === undefined || at >= (chapterStart(mechanism, actor.enters) ?? 0)).map((actor) => actor.id))

  const positions = new Map(mechanism.actors.map((actor, i) => [actor.id, lerp(from.positions[i]!, to.positions[i]!, progress)]))
  const where = (id: string) => positions.get(id)!
  const atoms = mechanism.actors
    .filter((actor) => here.has(actor.id))
    .map((actor): SceneAtom => ({ id: actor.id, element: actor.element, position: where(actor.id), active: active.has(actor.id), ...(actor.ion ? { ion: { charge: actor.ion.charge, radius: actor.ion.radius.value } } : {}) }))

  const orderIn = (keyframe: Keyframe) => new Map(keyframe.bonds.map((bond) => [pairKey(bond.a, bond.b), bond.order as number]))
  const [before, after] = [orderIn(from), orderIn(to)]
  const allBonds = [...from.bonds, ...to.bonds.filter((bond) => !before.has(pairKey(bond.a, bond.b)))].flatMap((bond): SceneBond[] => {
    const key = pairKey(bond.a, bond.b)
    const [start, end] = [before.get(key) ?? 0, after.get(key) ?? 0]
    const order = start + (end - start) * progress
    return order > 0 ? [{ a: bond.a, b: bond.b, order, partial: start !== end && progress > 0 && progress < 1 }] : []
  })
  const bonds = allBonds.filter((bond) => here.has(bond.a) && here.has(bond.b))

  const first = (one: { atoms: readonly string[] }) => Math.min(...one.atoms.map((id) => mechanism.actors.findIndex((actor) => actor.id === id)))
  const species = speciesAt(from, to, progress, allBonds)
    .filter((one) => one.atoms.every((id) => here.has(id)))
    .sort((a, b) => first(a) - first(b))
    .map((one): SceneSpecies => ({ ...one, active: one.atoms.some((id) => active.has(id)) }))

  const site = (s: ElectronSite): Vec3 => ('lonePair' in s ? where(s.lonePair) : scale(add(where(s.bond[0]), where(s.bond[1])), 0.5))
  const reacting = chapter.kind === 'step' && !sameBonds(from, to)
  const electronPaths = reacting ? chapter.electronPaths.map((path): ScenePath => ({ from: site(path.from), to: site(path.to), fromSite: path.from, toSite: path.to, progress })) : []

  return {
    t: at,
    chapter,
    atoms,
    bonds,
    species,
    electronPaths,
    energy: energyAt(mechanism, at),
    camera: { target: lerp(from.camera.target, to.camera.target, progress), radius: from.camera.radius + (to.camera.radius - from.camera.radius) * progress },
    explanation: chapter.explanation,
  }
}
