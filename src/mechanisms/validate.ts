import type { Molecule, Source } from '@/chem-data/schema'
import { checkProse, checkPublished, checkSourceIds, duplicates, schemaErrors, type ValidateOptions } from '@/chem-data/validate'
import { mechanismSchema, type Mechanism } from './schema'

/** Every id of a kind that the record names somewhere, each with where it is named. */
function named(mechanism: Mechanism): { actors: [string, string][]; species: [string, string][]; units: [string, string][]; formation: [string, string][]; chapters: [string, string][] } {
  const actors: [string, string][] = []
  const species: [string, string][] = []
  const units: [string, string][] = []
  const formation: [string, string][] = []
  const chapters: [string, string][] = []
  for (const actor of mechanism.actors) if (actor.enters !== undefined) chapters.push([actor.enters, `actor "${actor.id}"`])
  for (const keyframe of mechanism.keyframes) {
    const where = `keyframe "${keyframe.id}"`
    for (const bond of keyframe.bonds) actors.push([bond.a, where], [bond.b, where])
    for (const one of keyframe.species) {
      for (const id of one.atoms) actors.push([id, where])
      species.push(['ion' in one ? one.ion : one.speciesId, where])
    }
    for (const unit of keyframe.units ?? []) {
      for (const id of unit.atoms) actors.push([id, where])
      units.push([unit.unit, where])
    }
  }
  for (const chapter of mechanism.chapters) {
    const where = `chapter "${chapter.id}"`
    for (const id of chapter.active) actors.push([id, where])
    if (chapter.kind !== 'step') continue
    for (const pair of [...chapter.bondsBroken, ...chapter.bondsFormed, ...chapter.orderChanges.map((c) => c.bond)]) actors.push([pair[0], where], [pair[1], where])
    for (const path of chapter.electronPaths) for (const site of [path.from, path.to]) for (const id of 'bond' in site ? site.bond : [site.lonePair]) actors.push([id, where])
    for (const id of [...(chapter.reaction?.reactants ?? []), ...(chapter.reaction?.products ?? [])]) formation.push([id, where])
    for (const id of chapter.deltaH?.covers ?? []) chapters.push([id, where])
  }
  return { actors, species, units, formation, chapters }
}

function checkReferences(mechanism: Mechanism, library: readonly Molecule[], sources: readonly Source[]): string[] {
  const refs = named(mechanism)
  const unknown = (kind: string, list: [string, string][], known: readonly string[]) => list.filter(([id]) => !known.includes(id)).map(([id, where]) => `${where}: unknown ${kind} "${id}"`)
  const steps = mechanism.chapters.flatMap((c) => (c.kind === 'step' ? [c] : []))
  const energies = steps.flatMap((step) => [step.deltaH, step.deltaG, step.activationG].flatMap((e) => (e && e !== 'schematic' ? e.sourceIds.map((id): [string, string] => [id, `chapter "${step.id}"`]) : [])))
  return [
    ...duplicates(mechanism.actors.map((a) => a.id), 'actors'),
    ...duplicates(mechanism.chapters.map((c) => c.id), 'chapters'),
    ...duplicates(mechanism.keyframes.map((k) => k.id), 'keyframes'),
    ...duplicates(mechanism.species.map((s) => s.id), 'species'),
    ...duplicates(mechanism.thermo.formation.map((f) => f.id), 'formation values'),
    ...duplicates(steps.flatMap((s) => (s.question ? [s.question.id] : [])), 'questions'),
    ...unknown('actor', refs.actors, mechanism.actors.map((a) => a.id)),
    // A species of the scene is a record of the library or a monatomic ion, and either way the record names it.
    ...unknown('species', refs.species, mechanism.species.map((s) => s.id).filter((id) => library.some((m) => m.id === id) || mechanism.actors.some((a) => a.ion && a.element === id))),
    // A unit of a solid is neither, and the record names it too.
    ...unknown('unit', refs.units, mechanism.species.map((s) => s.id)),
    ...unknown('formation value', refs.formation, mechanism.thermo.formation.map((f) => f.id)),
    ...unknown('chapter', refs.chapters, mechanism.chapters.map((c) => c.id)),
    ...unknown('source', energies, sources.map((s) => s.id)),
  ]
}

/** The track runs from 0 to 1 with no gap, every keyframe places every actor, and every chapter begins and ends at a keyframe. */
function checkTrack(mechanism: Mechanism): string[] {
  const errors: string[] = []
  const { chapters, keyframes, actors } = mechanism
  chapters.forEach((chapter, i) => {
    const start = i === 0 ? 0 : chapters[i - 1]!.range[1]
    if (chapter.range[0] !== start) errors.push(`chapter "${chapter.id}": begins at ${chapter.range[0]}, not at ${start} where the track has got to`)
    if (!(chapter.range[1] > chapter.range[0])) errors.push(`chapter "${chapter.id}": ends no later than it begins`)
    for (const t of chapter.range) if (!keyframes.some((k) => k.t === t)) errors.push(`chapter "${chapter.id}": no keyframe at its boundary ${t}`)
  })
  if (chapters.at(-1)!.range[1] !== 1) errors.push('chapters: the track does not end at 1')
  keyframes.forEach((keyframe, i) => {
    if (keyframe.positions.length !== actors.length) errors.push(`keyframe "${keyframe.id}": ${keyframe.positions.length} positions for ${actors.length} actors`)
    if (i > 0 && !(keyframe.t > keyframes[i - 1]!.t)) errors.push(`keyframe "${keyframe.id}": not later than the keyframe before it`)
    if ((i === 0) !== (keyframe.easing === undefined)) errors.push(`keyframe "${keyframe.id}": every keyframe but the first names the easing of the move that ends at it`)
  })
  if (keyframes[0]!.t !== 0 || keyframes.at(-1)!.t !== 1) errors.push('keyframes: the first is at 0 and the last at 1')
  return errors
}

/**
 * Checks a mechanism's record (spec 5.1): the schema, that every source named exists, that every id the record
 * names (an actor, a species of the library, a unit, a formation value, a chapter) is one that exists, that the track is
 * whole, that each `published` reads as the number stored beside it, and that no text a learner sees holds
 * institution text. Returns a list of problems; an empty list means the record is valid. Never throws, whatever
 * it is given. That each value is what its source prints is the build script's to hold to the manifest; that the
 * chemistry is consistent (bonds, charge, connectivity, energies) is spec 9.3, tested on the record.
 */
export function validateMechanism(input: unknown, sources: readonly Source[], library: readonly Molecule[], options: ValidateOptions = {}): string[] {
  const parsed = mechanismSchema.safeParse(input)
  if (!parsed.success) return schemaErrors(parsed.error.issues)
  const known = Array.isArray(sources) ? sources : []
  const names = options?.institutionNames
  return [
    ...checkReferences(parsed.data, Array.isArray(library) ? library : [], known),
    ...checkTrack(parsed.data),
    ...checkSourceIds(parsed.data, 'mechanism', known),
    ...checkPublished(parsed.data, 'mechanism'),
    ...checkProse(parsed.data, 'mechanism', Array.isArray(names) ? names : []),
  ]
}
