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
export type SceneSpecies = Keyframe['species'][number] & { active: boolean }
/** One pair of electrons on its way: where it leaves from and arrives, in ångström, and how far along it is. */
export type ScenePath = { from: Vec3; to: Vec3; fromSite: ElectronSite; toSite: ElectronSite; progress: number }

export type MechanismState = {
  /** The scrub position the state is of, held to 0..1. */
  t: number
  chapter: Chapter
  atoms: SceneAtom[]
  bonds: SceneBond[]
  /** What the atoms make up, as of the last keyframe passed; `active` where the chapter is about the species. */
  species: SceneSpecies[]
  /** Empty except during the move of a step in which its bonds change. */
  electronPaths: ScenePath[]
  /** Where the cursor of the energy panel is: free energy and enthalpy so far, in kJ/mol from the start of step 1. */
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

/** The scene at scrub position `t`, from 0 to 1 (spec 9.1). A position outside that is held to it. */
export function state(mechanism: Mechanism, t: number): MechanismState {
  const at = clamp(t)
  const chapter = chapterAt(mechanism, at)
  const { from, to, progress } = moveAt(mechanism, at)
  const active = new Set(chapter.active)

  const atoms = mechanism.actors.map((actor, i): SceneAtom => ({
    id: actor.id,
    element: actor.element,
    position: lerp(from.positions[i]!, to.positions[i]!, progress),
    active: active.has(actor.id),
    ...(actor.ion ? { ion: { charge: actor.ion.charge, radius: actor.ion.radius.value } } : {}),
  }))
  const where = (id: string) => atoms.find((atom) => atom.id === id)!.position

  const orderIn = (keyframe: Keyframe) => new Map(keyframe.bonds.map((bond) => [pairKey(bond.a, bond.b), bond.order as number]))
  const [before, after] = [orderIn(from), orderIn(to)]
  const bonds = [...from.bonds, ...to.bonds.filter((bond) => !before.has(pairKey(bond.a, bond.b)))].flatMap((bond): SceneBond[] => {
    const key = pairKey(bond.a, bond.b)
    const [start, end] = [before.get(key) ?? 0, after.get(key) ?? 0]
    const order = start + (end - start) * progress
    return order > 0 ? [{ a: bond.a, b: bond.b, order, partial: start !== end && progress > 0 && progress < 1 }] : []
  })

  const settled = progress >= 1 ? to : from
  const species = settled.species.map((s): SceneSpecies => ({ ...s, active: s.atoms.some((id) => active.has(id)) }))

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
