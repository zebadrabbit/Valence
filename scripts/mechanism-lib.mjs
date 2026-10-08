// What the build does for a mechanism timeline (spec 9): it turns the authored choreography
// (docs/research/phase-5/choreography.json), which places library species by rigid transform and maps their atoms
// to actors, into a keyframe of positions and bonds at every authored point of the track; works out each step's
// energies from the cited values of the authored record (docs/research/phase-5/mechanism.json); and holds the two
// to each other. build-chem-data.mjs runs it; src/mechanisms/build.test.ts tests it on inputs it must refuse.
// Each check throws with a message. Everything reads what it is handed; nothing is fetched here.

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const length = (a) => Math.hypot(a[0], a[1], a[2])
const distance = (a, b) => length(sub(a, b))
const unit = (a, where) => {
  const n = length(a)
  if (!(n > 1e-9)) throw new Error(`${where}: two of its points coincide, so they give no direction`)
  return scale(a, 1 / n)
}
/** The part of `v` at right angles to the unit vector `axis`. */
const across = (v, axis) => sub(v, scale(axis, dot(v, axis)))
// Adding 0 turns a rounded -0 into 0, which is what JSON writes for it.
const round = (x) => Number(x.toFixed(4)) + 0

export const EASINGS = ['linear', 'easeInOut']
const pairKey = (a, b) => (a < b ? `${a} ${b}` : `${b} ${a}`)

/**
 * The positions of a library species' atoms after one rigid move, given by three anchors. `origin` puts one atom
 * at a point. `aim` turns the species so that a second atom lies on the line from there toward a point. `roll`
 * turns it about that line so that a third atom lies on the side a point is on. The move is a rotation and a
 * shift: no distance or angle inside the species changes, and it is never mirrored. A species whose atoms all lie
 * on one line (carbon dioxide) needs no `roll`.
 */
export function placeRigid(atoms, { origin, aim, roll }, where) {
  const from = atoms[origin.atom]
  const e1 = unit(sub(atoms[aim.atom], from), where)
  const f1 = unit(sub(aim.toward, origin.at), where)
  const offAxis = atoms.some((p) => length(across(sub(p, from), e1)) > 1e-6)
  if (!offAxis) return atoms.map((p) => add(origin.at, scale(f1, dot(sub(p, from), e1))))
  if (!roll) throw new Error(`${where}: the species is not a straight line, so it needs a roll`)
  const e2 = unit(across(sub(atoms[roll.atom], from), e1), where)
  const f2 = unit(across(sub(roll.toward, origin.at), f1), where)
  const e3 = cross(e1, e2)
  const f3 = cross(f1, f2)
  return atoms.map((p) => {
    const d = sub(p, from)
    return add(origin.at, add(scale(f1, dot(d, e1)), add(scale(f2, dot(d, e2)), scale(f3, dot(d, e3)))))
  })
}

/** `point` turned by `degrees` about the line from `a` to `b` (right-handed about a→b). */
export function turnAbout(point, a, b, degrees) {
  const k = unit(sub(b, a), 'twist axis')
  const v = sub(point, a)
  const angle = (degrees * Math.PI) / 180
  const turned = add(add(scale(v, Math.cos(angle)), scale(cross(k, v), Math.sin(angle))), scale(k, dot(k, v) * (1 - Math.cos(angle))))
  return add(a, turned)
}

const onlyKeys = (object, keys, where, optional = []) => {
  const given = object && typeof object === 'object' ? Object.keys(object) : []
  if (given.some((key) => !keys.includes(key) && !optional.includes(key)) || keys.some((key) => !given.includes(key))) {
    throw new Error(`${where}: expected the keys ${keys.join(', ')}${optional.length ? ` and at most ${optional.join(', ')}` : ''}`)
  }
}

/**
 * The keyframes of a choreography: for each, every actor's position, the bond list with orders, the species the
 * actors make up, and what the camera frames. A keyframe's bonds are those of the library records of the species
 * placed in it, so at every keyframe each species has its library record's connectivity by construction.
 *
 * A keyframe lists only what it places anew. A species placed earlier stays where it was put until a keyframe
 * places one of its atoms again; all its atoms must then be placed again, in that keyframe. A point is given as
 * coordinates, or as the id of an actor that stays or that was placed earlier in the same keyframe.
 *
 * `molecules` are the library's records and `elements` its elements; a monatomic ion must have a cited ionic
 * radius for its charge there.
 */
export function buildKeyframes(choreography, molecules, elements) {
  onlyKeys(choreography, ['actors', 'keyframes'], 'choreography.json')
  const { actors, keyframes } = choreography
  const ids = actors.map((a) => a.id)
  if (new Set(ids).size !== ids.length) throw new Error('choreography.json: an actor id is given twice')
  const elementOf = new Map(actors.map((a) => [a.id, a.element]))
  for (const actor of actors) {
    onlyKeys(actor, ['id', 'element'], `actor "${actor.id}"`)
    if (!elements.some((e) => e.symbol === actor.element)) throw new Error(`actor "${actor.id}": unknown element "${actor.element}"`)
  }

  /** What is in the scene: each species with its atoms, where they are and the bonds between them. */
  let scene = []
  const built = keyframes.map((keyframe, index) => {
    const where = `keyframe "${keyframe.id}"`
    onlyKeys(keyframe, ['id', 't', 'frame', 'place'], where, ['easing'])
    if ((index === 0) !== (keyframe.easing === undefined)) throw new Error(`${where}: every keyframe but the first names the easing of the move that ends at it`)
    if (keyframe.easing !== undefined && !EASINGS.includes(keyframe.easing)) throw new Error(`${where}: unknown easing "${keyframe.easing}"`)

    const anew = new Set(keyframe.place.flatMap((placed) => (placed.ion !== undefined ? [placed.atom] : (placed.atoms ?? []))))
    scene = scene.filter((entry) => !entry.atoms.some((id) => anew.has(id)))
    const at = new Map(scene.flatMap((entry) => entry.atoms.map((id, i) => [id, entry.positions[i]])))
    const point = (given, what) => {
      if (Array.isArray(given) && given.length === 3 && given.every((x) => typeof x === 'number')) return given
      if (typeof given === 'string' && at.has(given)) return at.get(given)
      throw new Error(`${where}: ${what} is neither coordinates nor an actor that is in place`)
    }
    const put = (actorId, position, element) => {
      if (!elementOf.has(actorId)) throw new Error(`${where}: unknown actor "${actorId}"`)
      if (at.has(actorId)) throw new Error(`${where}: the actor "${actorId}" is placed twice`)
      if (elementOf.get(actorId) !== element) throw new Error(`${where}: the actor "${actorId}" is ${elementOf.get(actorId)}, but is placed as ${element}`)
      at.set(actorId, position)
    }
    for (const [i, placed] of keyframe.place.entries()) {
      const here = `${where}, placement ${i + 1}`
      if (placed.ion !== undefined) {
        onlyKeys(placed, ['ion', 'charge', 'atom', 'at'], here)
        const element = elements.find((e) => e.symbol === placed.ion)
        if (!element?.ionicRadii.some((r) => r.charge === placed.charge)) throw new Error(`${here}: no cited ionic radius for ${placed.ion} of charge ${placed.charge}`)
        put(placed.atom, point(placed.at, 'the ion'), placed.ion)
        scene.push({ species: { ion: placed.ion, charge: placed.charge, atoms: [placed.atom] }, atoms: [placed.atom], positions: [at.get(placed.atom)], bonds: [] })
        continue
      }
      onlyKeys(placed, ['species', 'atoms', 'origin', 'aim'], here, ['roll', 'twist'])
      const molecule = molecules.find((m) => m.id === placed.species)
      if (!molecule) throw new Error(`${here}: the library has no species "${placed.species}"`)
      if (placed.atoms.length !== molecule.atoms.length) throw new Error(`${here}: "${placed.species}" has ${molecule.atoms.length} atoms, and ${placed.atoms.length} actors are given`)
      const anchor = (given, what) => {
        const atom = placed.atoms.indexOf(given.atom)
        if (atom < 0) throw new Error(`${here}: the ${what} names "${given.atom}", which is not one of the placement's actors`)
        return atom
      }
      const origin = { atom: anchor(placed.origin, 'origin'), at: point(placed.origin.at, 'the origin') }
      const aim = { atom: anchor(placed.aim, 'aim'), toward: point(placed.aim.toward, 'the aim') }
      const roll = placed.roll && { atom: anchor(placed.roll, 'roll'), toward: point(placed.roll.toward, 'the roll') }
      const positions = placeRigid(molecule.atoms.map((a) => a.position), { origin, aim, roll }, here)
      placed.atoms.forEach((actorId, atom) => put(actorId, positions[atom], molecule.atoms[atom].element))
      for (const twist of placed.twist ?? []) {
        onlyKeys(twist, ['about', 'atoms', 'degrees'], `${here}, twist`)
        const [a, b] = twist.about.map((id) => point(id, 'a twist axis'))
        for (const actorId of twist.atoms) {
          if (!placed.atoms.includes(actorId) || twist.about.includes(actorId)) throw new Error(`${here}: a twist turns atoms of its own species that are not on its axis`)
          at.set(actorId, turnAbout(at.get(actorId), a, b, twist.degrees))
        }
      }
      scene.push({
        species: { speciesId: molecule.id, atoms: placed.atoms, ...(placed.twist ? { twisted: true } : {}) },
        atoms: placed.atoms,
        positions: placed.atoms.map((id) => at.get(id)),
        bonds: molecule.bonds.map((bond) => ({ a: placed.atoms[bond.a], b: placed.atoms[bond.b], order: bond.order })),
      })
    }
    const missing = ids.filter((id) => !at.has(id))
    if (missing.length > 0) throw new Error(`${where}: no place for ${missing.join(', ')}`)
    // In the actors' order, whatever order the keyframes placed things in, so that two keyframes of one scene read alike.
    const first = (entry) => Math.min(...entry.atoms.map((id) => ids.indexOf(id)))
    scene.sort((a, b) => first(a) - first(b))

    if (keyframe.frame.length === 0 || keyframe.frame.some((id) => !at.has(id))) throw new Error(`${where}: the camera frames actors of the scene, at least one`)
    const framed = keyframe.frame.map((id) => at.get(id))
    const target = scale(framed.reduce(add, [0, 0, 0]), 1 / framed.length)
    const camera = { target: target.map(round), radius: round(Math.max(...framed.map((p) => distance(p, target)))) }
    return {
      id: keyframe.id,
      t: keyframe.t,
      ...(keyframe.easing ? { easing: keyframe.easing } : {}),
      positions: ids.map((id) => at.get(id).map(round)),
      bonds: scene.flatMap((entry) => entry.bonds),
      species: scene.map((entry) => entry.species),
      camera,
    }
  })

  if (built.length < 2 || built[0].t !== 0 || built.at(-1).t !== 1) throw new Error('choreography.json: the first keyframe is at 0 and the last at 1')
  if (built.some((k, i) => i > 0 && !(k.t > built[i - 1].t))) throw new Error('choreography.json: the keyframes are in track order, each later than the one before')
  if (new Set(built.map((k) => k.id)).size !== built.length) throw new Error('choreography.json: a keyframe id is given twice')
  return built
}

/** The charge of a keyframe's scene: the charges of its species' library records and of its ions. */
export function sceneCharge(keyframe, molecules) {
  return keyframe.species.reduce((sum, s) => sum + (s.ion !== undefined ? s.charge : molecules.find((m) => m.id === s.speciesId).charge), 0)
}

// How near two atoms that are not bonded may come, in ångström. They are drawing limits, not chemistry: a
// hydrogen bond brings a hydrogen to about 1.7 Å of an oxygen and two oxygens to about 2.7 Å, and an atom that is
// changing partners passes nearer than either on its way.
const CLOSEST_AT_KEYFRAME = { withHydrogen: 1.5, heavy: 2.3 }
const CLOSEST_ON_THE_WAY = 0.9

/**
 * Throws where two atoms sit on top of each other or pass through each other. At a keyframe, two atoms of
 * different species keep the distances above. Along each move, sampled, two atoms that are in one species at
 * neither end of it do not come within CLOSEST_ON_THE_WAY.
 */
export function checkContacts(actors, keyframes) {
  const lerp = (a, b, u) => add(a, scale(sub(b, a), u))
  // Two atoms of one species are as far apart as its library record has them, bonded to each other or not.
  const together = (keyframe) => new Set(keyframe?.species.flatMap((s) => s.atoms.flatMap((a) => s.atoms.map((b) => pairKey(a, b)))))
  keyframes.forEach((keyframe, k) => {
    const bonded = together(keyframe)
    const next = keyframes[k + 1]
    const bondedNext = together(next)
    for (let i = 0; i < actors.length; i++) {
      for (let j = i + 1; j < actors.length; j++) {
        const pair = pairKey(actors[i].id, actors[j].id)
        const names = `${actors[i].id} and ${actors[j].id}`
        if (!bonded.has(pair)) {
          const limit = actors[i].element === 'H' || actors[j].element === 'H' ? CLOSEST_AT_KEYFRAME.withHydrogen : CLOSEST_AT_KEYFRAME.heavy
          const d = distance(keyframe.positions[i], keyframe.positions[j])
          if (d < limit) throw new Error(`keyframe "${keyframe.id}": ${names}, of different species, are ${d.toFixed(2)} Å apart (the limit is ${limit})`)
        }
        if (!next || bonded.has(pair) || bondedNext.has(pair)) continue
        // ponytail: each move is looked at in 19 places. The longest move here is 12.7 Å, so two places are at most
        // 0.7 Å apart and an atom cannot cross another's 0.9 Å between them; a much longer move would need more.
        for (let step = 1; step < 20; step++) {
          const u = step / 20
          const d = distance(lerp(keyframe.positions[i], next.positions[i], u), lerp(keyframe.positions[j], next.positions[j], u))
          if (d < CLOSEST_ON_THE_WAY) throw new Error(`between "${keyframe.id}" and "${next.id}": ${names} pass within ${d.toFixed(2)} Å of each other`)
        }
      }
    }
  })
}

const round3 = (x) => Number(x.toFixed(3))
const unique = (list) => [...new Set(list)]
const bondKey = ([a, b]) => pairKey(a, b)
/** A copy of an object without some of its keys. */
const without = (object, keys) => Object.fromEntries(Object.entries(object).filter(([key]) => !keys.includes(key)))

/**
 * A step's energies, worked out from the record's cited values (spec 9.2). Each is written in the authored record
 * as the way it is obtained:
 * - "formation": the formation values of the step's `reaction`, products less reactants. Cited.
 * - "acid-constant" (a free energy): −RT ln 10 × pKa of the true carbonic acid molecule, for H⁺ + HCO₃⁻ → H₂CO₃. Cited.
 * - "remainder" (a free energy): the formation values of the step's `reaction`, which is then the total over this
 *   step and the one before, less the step before. Derived.
 * - "with-next" (an enthalpy): none of its own; the next step's covers both. "formation-with-previous" is that next step's.
 * - "eyring" (a barrier): RT ln(k_B T τ / h) from the lifetime τ of carbonic acid, with a transmission coefficient
 *   of one. Derived. "schematic" is a barrier with no value.
 */
function stepEnergies(chapters, thermo) {
  const { formation, carbonicAcid, constants, parameters } = thermo
  const T = parameters.temperature.value
  const R = constants.gasConstant.value
  const entry = (id, where) => formation.find((f) => f.id === id) ?? (() => { throw new Error(`${where}: no formation values for "${id}"`) })()
  const total = (chapter, key) => {
    const where = `chapter "${chapter.id}"`
    if (!chapter.reaction) throw new Error(`${where}: an energy from formation values needs a reaction`)
    const side = (ids) => ids.map((id) => entry(id, where)[key])
    const [reactants, products] = [side(chapter.reaction.reactants), side(chapter.reaction.products)]
    const sum = (terms) => terms.reduce((s, term) => s + term.value, 0)
    return { value: round3(sum(products) - sum(reactants)), sourceIds: unique([...reactants, ...products].map((term) => term.sourceId)) }
  }
  const out = new Map()
  chapters.forEach((chapter, i) => {
    if (chapter.kind !== 'step') return
    const where = `chapter "${chapter.id}"`
    const previous = chapters[i - 1]
    let deltaH
    if (chapter.deltaH === 'formation') deltaH = { ...total(chapter, 'enthalpy'), basis: 'cited', method: 'formation' }
    else if (chapter.deltaH === 'formation-with-previous' && previous?.deltaH === 'with-next') deltaH = { ...total(chapter, 'enthalpy'), basis: 'cited', method: 'formation', covers: [previous.id, chapter.id] }
    else if (chapter.deltaH === 'with-next' && chapters[i + 1]?.deltaH === 'formation-with-previous') deltaH = null
    else throw new Error(`${where}: deltaH is "formation", or "with-next" before a step whose own is "formation-with-previous"`)

    let deltaG
    if (chapter.deltaG === 'formation') deltaG = { ...total(chapter, 'gibbs'), basis: 'cited', method: 'formation' }
    else if (chapter.deltaG === 'acid-constant') {
      deltaG = { value: Number(((-R * T * Math.LN10 * carbonicAcid.pKa.value) / 1000).toFixed(2)), sourceIds: [carbonicAcid.pKa.sourceId, constants.gasConstant.sourceId], basis: 'cited', method: 'acid-constant' }
    } else if (chapter.deltaG === 'remainder' && out.get(previous?.id)?.deltaG.method === 'acid-constant') {
      const whole = total(chapter, 'gibbs')
      const before = out.get(previous.id).deltaG
      deltaG = { value: round3(whole.value - before.value), sourceIds: unique([...whole.sourceIds, ...before.sourceIds]), basis: 'derived', method: 'remainder' }
    } else throw new Error(`${where}: deltaG is "formation", "acid-constant", or "remainder" after a step whose own is "acid-constant"`)

    let activationG
    if (chapter.activationG === 'schematic') activationG = 'schematic'
    else if (chapter.activationG === 'eyring') {
      if (carbonicAcid.lifetime.unit !== 'ms') throw new Error(`${where}: the lifetime of carbonic acid is expected in ms`)
      const seconds = carbonicAcid.lifetime.value / 1000
      const value = (R * T * Math.log((constants.boltzmannConstant.value * T * seconds) / constants.planckConstant.value)) / 1000
      activationG = { value: Number(value.toFixed(1)), sourceIds: unique([carbonicAcid.lifetime, constants.boltzmannConstant, constants.planckConstant, constants.gasConstant].map((c) => c.sourceId)), basis: 'derived', method: 'eyring' }
    } else if (chapter.activationG !== undefined) throw new Error(`${where}: activationG is "schematic" or "eyring"`)
    out.set(chapter.id, { deltaH, deltaG, ...(activationG === undefined ? {} : { activationG }) })
  })
  return out
}

const KINDS_IN_ORDER = /^bookend prologue( step)+ bookend$/

/**
 * The mechanism's record as the app reads it (src/mechanisms/<id>.json), from the authored record and the
 * authored choreography. It holds the two to each other, and throws where they disagree:
 * - the chapters run from the first keyframe to the last, each beginning at the keyframe the one before ended at,
 *   in the track order of spec 9.2: a bookend, the prologue, the steps, a bookend;
 * - at a chapter boundary no species is twisted out of its library shape, and the scene's charge is the same at
 *   every keyframe;
 * - each step's bonds broken and formed and its changes of order are exactly the difference between the bond
 *   lists at its two ends (spec 9.3), and they happen within one move of the step;
 * - no two atoms sit on or pass through each other (`checkContacts`).
 */
export function buildMechanism(record, choreography, molecules, elements) {
  onlyKeys(record, ['id', 'title', 'species', 'thermo', 'energyNote', 'chapters'], 'mechanism.json')
  const keyframes = buildKeyframes(choreography, molecules, elements)
  checkContacts(choreography.actors, keyframes)
  const actorIds = new Set(choreography.actors.map((a) => a.id))
  const known = (ids, where) => {
    for (const id of ids) if (!actorIds.has(id)) throw new Error(`${where}: unknown actor "${id}"`)
  }

  const charge = sceneCharge(keyframes[0], molecules)
  for (const keyframe of keyframes) {
    if (sceneCharge(keyframe, molecules) !== charge) throw new Error(`keyframe "${keyframe.id}": the scene's charge is ${sceneCharge(keyframe, molecules)}, and it began as ${charge}`)
  }

  const indexOf = (id, where) => {
    const index = keyframes.findIndex((k) => k.id === id)
    if (index < 0) throw new Error(`${where}: unknown keyframe "${id}"`)
    return index
  }
  const kinds = record.chapters.map((c) => c.kind).join(' ')
  if (!KINDS_IN_ORDER.test(kinds)) throw new Error(`mechanism.json: the chapters are a bookend, the prologue, the steps and a bookend, not "${kinds}"`)
  if (new Set(record.chapters.map((c) => c.id)).size !== record.chapters.length) throw new Error('mechanism.json: a chapter id is given twice')
  const energies = stepEnergies(record.chapters, record.thermo)

  const chapters = record.chapters.map((chapter, i) => {
    const where = `chapter "${chapter.id}"`
    const [from, to] = [indexOf(chapter.from, where), indexOf(chapter.to, where)]
    if (!(to > from)) throw new Error(`${where}: it ends after it begins`)
    if (i === 0 ? from !== 0 : chapter.from !== record.chapters[i - 1].to) throw new Error(`${where}: it begins where the chapter before it ended`)
    if (i === record.chapters.length - 1 && to !== keyframes.length - 1) throw new Error(`${where}: the last chapter ends at the last keyframe`)
    for (const keyframe of [keyframes[from], keyframes[to]]) {
      if (keyframe.species.some((s) => s.twisted)) throw new Error(`${where}: at "${keyframe.id}", a chapter boundary, a species is twisted out of its library shape`)
    }
    known(chapter.active, where)
    const common = { ...without(chapter, ['from', 'to']), range: [keyframes[from].t, keyframes[to].t] }
    if (chapter.kind !== 'step') return common

    const orders = (keyframe) => new Map(keyframe.bonds.map((b) => [pairKey(b.a, b.b), b.order]))
    const [before, after] = [orders(keyframes[from]), orders(keyframes[to])]
    const sorted = (keys) => [...keys].sort().join('; ')
    const broken = [...before.keys()].filter((key) => !after.has(key))
    const formed = [...after.keys()].filter((key) => !before.has(key))
    const changed = [...before.keys()].filter((key) => after.has(key) && after.get(key) !== before.get(key)).map((key) => `${key}: ${before.get(key)} to ${after.get(key)}`)
    for (const pair of [...chapter.bondsBroken, ...chapter.bondsFormed, ...chapter.orderChanges.map((c) => c.bond)]) known(pair, where)
    if (sorted(chapter.bondsBroken.map(bondKey)) !== sorted(broken)) throw new Error(`${where}: the bonds broken between its keyframes are ${sorted(broken) || 'none'}`)
    if (sorted(chapter.bondsFormed.map(bondKey)) !== sorted(formed)) throw new Error(`${where}: the bonds formed between its keyframes are ${sorted(formed) || 'none'}`)
    if (sorted(chapter.orderChanges.map((c) => `${bondKey(c.bond)}: ${c.from} to ${c.to}`)) !== sorted(changed)) throw new Error(`${where}: the bonds that change order between its keyframes are ${sorted(changed) || 'none'}`)
    const moves = keyframes.slice(from, to).filter((keyframe, k) => sorted([...orders(keyframe)].map(String)) !== sorted([...orders(keyframes[from + k + 1])].map(String)))
    if (moves.length > 1) throw new Error(`${where}: its bonds change in more than one move`)
    for (const path of chapter.electronPaths) for (const site of [path.from, path.to]) known(site.bond ?? [site.lonePair], where)
    return { ...without(common, ['deltaH', 'deltaG', 'activationG']), ...energies.get(chapter.id) }
  })

  const actors = choreography.actors.map((actor) => {
    const ion = keyframes[0].species.find((s) => s.ion !== undefined && s.atoms[0] === actor.id)
    if (!ion) return actor
    if (keyframes.some((k) => !k.species.some((s) => s.ion === ion.ion && s.charge === ion.charge && s.atoms[0] === actor.id))) throw new Error(`actor "${actor.id}": an ion is the same ion at every keyframe`)
    const radius = elements.find((e) => e.symbol === ion.ion).ionicRadii.find((r) => r.charge === ion.charge)
    return { ...actor, ion: { charge: ion.charge, coordination: radius.coordination, radius: { value: radius.value, sourceId: radius.sourceId } } }
  })
  const placedIds = unique(keyframes.flatMap((k) => k.species.map((s) => s.speciesId ?? s.ion)))
  const named = record.species.map((s) => s.id)
  if ([...placedIds].sort().join() !== [...named].sort().join()) throw new Error(`mechanism.json: \`species\` names each species the choreography places, once: ${placedIds.join(', ')}`)

  return {
    id: record.id,
    title: record.title,
    species: record.species,
    actors,
    chapters,
    keyframes: keyframes.map((keyframe) => ({ ...keyframe, species: keyframe.species.map((s) => without(s, ['twisted'])) })),
    thermo: record.thermo,
    energyNote: record.energyNote,
  }
}
