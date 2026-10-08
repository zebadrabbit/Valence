import { add, distance, scale, type Vec3 } from '@/chem-data/geometry'
import type { Element } from '@/chem-data/schema'
import type { Mechanism } from './schema'
import { moveAt, state, stepsOf, type MechanismState, type SceneBond, type SceneSpecies } from './state'
import { chapterHeading, kJ } from './wording'

// The scene of a mechanism timeline in words, for a reader who cannot see it (spec 11). Like the picture, it is a
// pure function of the scrub position.

const NUMBERS = ['no', 'one', 'two', 'three', 'four', 'five', 'six']
const ORDERS = ['no bond', 'a single bond', 'a double bond', 'a triple bond']
/** "an ion", "a unit": by the sound the noun begins with, for the nouns the scene has. */
const article = (noun: string) => (/^(?!uni)[aeiou]/i.test(noun) ? 'an' : 'a')
const and = (items: readonly string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`)
const speciesId = (s: SceneSpecies) => ('unit' in s ? s.unit : 'ion' in s ? s.ion : s.speciesId)

/**
 * What the scene shows at scrub position `t`: the chapter and how far through it, what is in the scene, which
 * species take part and how far apart they are, each bond that is breaking, forming or changing order, and, from
 * step 1 on, the energies: each step's whole change and the totals of whole steps, never a point on a drawn curve.
 */
export function describeMechanismState(mechanism: Mechanism, t: number, elements: readonly Element[]): string {
  const s = state(mechanism, t)
  const name = (one: SceneSpecies) => mechanism.species.find((x) => x.id === speciesId(one))?.name ?? speciesId(one)
  const elementName = (symbol: string) => elements.find((e) => e.symbol === symbol)?.name.toLowerCase() ?? symbol

  const [start, end] = s.chapter.range
  const through = Math.round((100 * (s.t - start)) / (end - start))
  const lead = `${chapterHeading(mechanism, s.chapter.id)}. ${through === 0 ? 'At its start' : through === 100 ? 'At its end' : `${through}% of the way through`}.`

  const counts = new Map<string, number>()
  for (const one of s.species) counts.set(name(one), (counts.get(name(one)) ?? 0) + 1)
  const scene = `In the scene: ${and([...counts].map(([noun, n]) => (n === 1 ? `${article(noun)} ${noun}` : `${NUMBERS[n] ?? n} ${noun}s`)))}.`

  return [lead, scene, taking(s, name), ...changing(mechanism, s, name, elementName), energies(mechanism, s)].filter((sentence) => sentence !== '').join(' ')
}

const centre = (s: MechanismState, one: SceneSpecies): Vec3 => scale(one.atoms.map((id) => s.atoms.find((a) => a.id === id)!.position).reduce(add), 1 / one.atoms.length)
const apart = (s: MechanismState, a: SceneSpecies, b: SceneSpecies) => `${distance(centre(s, a), centre(s, b)).toFixed(1)} Å`

/** Which species the chapter is about, and how near they are: two that react are told by the distance between them, one that leaves by its distance from its nearest neighbour. */
function taking(s: MechanismState, name: (one: SceneSpecies) => string): string {
  const active = s.species.filter((one) => one.active)
  const [first, second] = active
  if (!first) return ''
  /** "the hydronium ion", or "two of the three water molecules" where the scene has others like them that look on. */
  const told = [...new Set(active.map(name))].map((noun) => {
    const [taking, alike] = [active.filter((one) => name(one) === noun).length, s.species.filter((one) => name(one) === noun).length]
    if (alike === 1) return `the ${noun}`
    return taking === alike ? `the ${NUMBERS[alike] ?? alike} ${noun}s` : `${NUMBERS[taking] ?? taking} of the ${NUMBERS[alike] ?? alike} ${noun}s`
  })
  const names = and(told)
  if (active.length === 2 && second) return `Taking part: ${names}, ${apart(s, first, second)} apart, centre to centre.`
  if (active.length > 1) return `Taking part: ${names}.`
  const others = s.species.filter((one) => one !== first)
  const nearest = others.reduce((best, one) => (distance(centre(s, one), centre(s, first)) < distance(centre(s, best), centre(s, first)) ? one : best), others[0]!)
  return `Taking part: ${names}, ${apart(s, first, nearest)} from its nearest neighbour, ${article(name(nearest))} ${name(nearest)}.`
}

/** One sentence for each bond that is partial: which atoms it joins, of which species, and what is happening to it. */
function changing(mechanism: Mechanism, s: MechanismState, name: (one: SceneSpecies) => string, elementName: (symbol: string) => string): string[] {
  const { from, to } = moveAt(mechanism, s.t)
  const orderIn = (keyframe: typeof from, bond: SceneBond) => keyframe.bonds.find((b) => (b.a === bond.a && b.b === bond.b) || (b.a === bond.b && b.b === bond.a))?.order ?? 0
  const owner = (atomId: string) => s.species.find((one) => one.atoms.includes(atomId))!
  const element = (atomId: string) => elementName(s.atoms.find((a) => a.id === atomId)!.element)
  /** "the carbon", or "an oxygen" where its species has more than one. */
  const atomIn = (atomId: string) => {
    const alike = owner(atomId).atoms.filter((id) => element(id) === element(atomId)).length
    return alike === 1 ? `the ${element(atomId)}` : `${article(element(atomId))} ${element(atomId)}`
  }
  /** "the carbonic acid molecule", or "a water molecule" where the scene has more than one. */
  const the = (one: SceneSpecies) => (s.species.filter((other) => name(other) === name(one)).length > 1 ? `${article(name(one))} ${name(one)}` : `the ${name(one)}`)
  const told = new Set<string>()
  return s.bonds
    .filter((bond) => bond.partial)
    .map((bond) => {
      const [before, after] = [orderIn(from, bond), orderIn(to, bond)]
      const percent = Math.round((100 * (bond.order - before)) / (after - before))
      const [a, b] = [owner(bond.a), owner(bond.b)]
      const where = a === b ? `${atomIn(bond.a)} and ${atomIn(bond.b)} of ${the(a)}` : name(a) === name(b) ? `${atomIn(bond.a)} of one ${name(a)} and ${atomIn(bond.b)} of another` : `${atomIn(bond.a)} of ${the(a)} and ${atomIn(bond.b)} of ${the(b)}`
      // Two bonds of one species can read alike (carbon to one oxygen, carbon to another): the second is told as another.
      const bondBetween = `${told.has(where) ? 'Another' : before === 0 ? 'A' : 'The'} bond between ${where}`
      told.add(where)
      if (before === 0) return `${bondBetween} is forming: ${percent}% formed.`
      if (after === 0) return `${bondBetween} is breaking: ${100 - percent}% of it is left.`
      return `${bondBetween} is turning from ${ORDERS[before]} into ${ORDERS[after]}: ${percent}% of the way.`
    })
}

/**
 * The energies, from step 1 on: a step's own whole change, at the start of a chapter the total of the steps before
 * it, and after the last step the total of them all. Never where the drawn curves stand part-way through a step:
 * between two levels a curve is a drawing, and only the levels are chemistry.
 */
function energies(mechanism: Mechanism, s: MechanismState): string {
  const steps = stepsOf(mechanism)
  const first = steps[0]
  if (!first || s.t < first.range[0]) return ''
  const done = steps.filter((step) => step.range[1] <= s.t)
  const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0)
  const freeEnergy = kJ(sum(done.map((step) => step.deltaG.value)))
  const numberOf = (stepId: string) => steps.findIndex((step) => step.id === stepId) + 1
  // An enthalpy that covers two steps is one change: between the two there is no total of it to give.
  const enthalpy = done.every((step) => step.deltaH || done.some((other) => other.deltaH?.covers?.includes(step.id))) ? ` and enthalpy by ${kJ(sum(done.map((step) => step.deltaH?.value ?? 0)))}` : ''
  if (s.chapter.kind !== 'step') return `Over the ${NUMBERS[steps.length] ?? steps.length} steps together, free energy changes by ${freeEnergy}${enthalpy}.`

  const { deltaG, deltaH, id } = s.chapter
  const own = `Over the whole of this step, free energy changes by ${kJ(deltaG.value)}`
  const ownEnthalpy = !deltaH
    ? `. Its enthalpy is counted with step ${numberOf(steps.find((step) => step.deltaH?.covers?.includes(id))?.id ?? id)}.`
    : deltaH.covers
      ? `, and enthalpy by ${kJ(deltaH.value)} over steps ${and(deltaH.covers.map((covered) => String(numberOf(covered))))} together.`
      : ` and enthalpy by ${kJ(deltaH.value)}.`
  const soFar = done.length > 0 && s.t === s.chapter.range[0] ? `Up to here, from the start of step 1, free energy has changed by ${freeEnergy}${enthalpy}. ` : ''
  return `${soFar}${own}${ownEnthalpy}`
}
