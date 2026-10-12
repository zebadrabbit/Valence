// The checks the build makes on the types of reactions lab's record (docs/research/reactions/reactions.json) that
// no other lab's record needs (spec 24.3, 24.5): that every equation balances in atoms and in charge and is in
// its lowest whole numbers; that every tile an equation needs is offered at its station, with some that no
// equation there needs; that every choice offered and every thing seen has stored words; and that the order of the
// three metals is the order their tubes show. The record's other checks are the aqueous lab's (aqueous-lib.mjs):
// the manifest's rows, the merge of the reagents' hazards and the list of sources. build-chem-data.mjs runs them;
// src/chem-data/reactions/build.test.ts tests them on records they must refuse. Nothing is fetched here.

/** The fields an observation can record, and the part of a vessel that is looked at, or felt, to see each. */
export const FIELD_AT = { coating: 'metal', bubbles: 'metal', liquid: 'liquid', gas: 'liquid', solid: 'solid', light: 'flame', warmth: 'touch' }
/** How fast a tube bubbles, slowest first: the order of the choices of `bubbles`. */
const RATES = ['none', 'slow', 'fast']
/** The fewest tiles of a station that no equation of it needs (spec 24.5: the tiles do not give the equation). */
export const SPARE_TILES = 2

const speciesOf = (record, id, where) => {
  const species = record.species.find((s) => s.id === id)
  if (!species) throw new Error(`${where}: unknown species "${id}"`)
  return species
}

/** The atoms on one side of an equation, and its charge: `{ atoms: { H: 2, ... }, charge }`. */
export function tally(record, side, where = 'equation') {
  const atoms = {}
  let charge = 0
  for (const term of side) {
    const species = speciesOf(record, term.speciesId, where)
    for (const [element, count] of Object.entries(species.composition)) atoms[element] = (atoms[element] ?? 0) + count * term.coefficient
    charge += (species.charge ?? 0) * term.coefficient
  }
  return { atoms, charge }
}

/** True when the two sides of an equation hold the same atoms and the same charge. */
export function balanced(record, equation, where = 'equation') {
  const left = tally(record, equation.reactants, where)
  const right = tally(record, equation.products, where)
  const elements = new Set([...Object.keys(left.atoms), ...Object.keys(right.atoms)])
  return left.charge === right.charge && [...elements].every((element) => left.atoms[element] === right.atoms[element])
}

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b))

/** Every vessel of the record with its station: `{ station, vessel, where }`. */
export const vesselsOf = (record) => record.stations.flatMap((station) => station.vessels.map((vessel) => ({ station, vessel, where: `stations[${station.id}].vessels[${vessel.id}]` })))

/**
 * Throws unless every equation of the record balances in atoms and in charge, has no species twice on a side or
 * on both sides, and is in its lowest whole numbers; a vessel has an equation exactly when its kind is one of the
 * four, and none where nothing reacts; and a catalyst is a species that is not in its equation.
 */
export function checkEquations(record) {
  const kinds = record.kinds.map((kind) => kind.id)
  for (const { vessel, where } of vesselsOf(record)) {
    const kind = vessel.kind.value
    if (kind !== 'none' && !kinds.includes(kind)) throw new Error(`${where}.kind: "${kind}" is none of the kinds, nor "none"`)
    if ((kind === 'none') !== (vessel.equation === null)) throw new Error(`${where}: a vessel has an equation when something reacts in it, and none when nothing does`)
    if (vessel.equation === null) {
      if (vessel.catalyst !== undefined) throw new Error(`${where}: a catalyst with no reaction`)
      continue
    }
    const { reactants, products } = vessel.equation
    const ids = [...reactants, ...products].map((term) => term.speciesId)
    if (new Set(ids).size !== ids.length) throw new Error(`${where}.equation: a species stands twice in it`)
    if (!balanced(record, vessel.equation, `${where}.equation`)) throw new Error(`${where}.equation: does not balance in atoms and in charge`)
    if ([...reactants, ...products].map((term) => term.coefficient).reduce(gcd) !== 1) throw new Error(`${where}.equation: its coefficients are not the lowest whole numbers`)
    if (vessel.catalyst !== undefined) {
      speciesOf(record, vessel.catalyst.speciesId, `${where}.catalyst`)
      if (ids.includes(vessel.catalyst.speciesId)) throw new Error(`${where}.catalyst: a catalyst is not in the equation`)
    }
  }
}

/**
 * Throws unless every station offers every species its equations need, with at least `SPARE_TILES` that none of
 * them needs, each tile a species of the record and none twice; and every species of the record is some station's
 * tile.
 */
export function checkTiles(record) {
  for (const station of record.stations) {
    const where = `stations[${station.id}].tiles`
    if (new Set(station.tiles).size !== station.tiles.length) throw new Error(`${where}: a tile is offered twice`)
    for (const tile of station.tiles) speciesOf(record, tile, where)
    const needed = new Set(station.vessels.flatMap((vessel) => (vessel.equation === null ? [] : [...vessel.equation.reactants, ...vessel.equation.products].map((term) => term.speciesId))))
    for (const id of needed) if (!station.tiles.includes(id)) throw new Error(`${where}: the equation needs "${id}", which is not offered`)
    const spare = station.tiles.filter((tile) => !needed.has(tile)).length
    if (spare < SPARE_TILES) throw new Error(`${where}: ${spare} of the tiles are in no equation of the station, and at least ${SPARE_TILES} must be, or the tiles give the equation away`)
  }
  for (const species of record.species) if (!record.stations.some((station) => station.tiles.includes(species.id))) throw new Error(`species[${species.id}]: no station offers it`)
}

/**
 * Throws unless what is seen holds together: every field a vessel asks for is one of the record's, has a choice
 * stored for what is seen after and is opened by a look the vessel has, with words for before and for after; no
 * look is there that opens nothing; every value stored is one of its field's choices; a tube has a liquid and a
 * strip in a flame has none; and the amounts of liquid are parameters of the record.
 */
export function checkSeen(record) {
  for (const [field, list] of Object.entries(record.choices)) {
    if (!(field in FIELD_AT)) throw new Error(`choices.${field}: no such field`)
    if (list.length < 2 || new Set(list).size !== list.length) throw new Error(`choices.${field}: a field is recorded from two choices or more, none twice`)
  }
  for (const field of Object.keys(FIELD_AT)) if (!(field in record.choices)) throw new Error(`choices: no choices for "${field}"`)
  for (const { vessel, where } of vesselsOf(record)) {
    if ((vessel.drawn === 'tube') !== (vessel.liquid !== null)) throw new Error(`${where}: a tube holds a liquid, and a strip in a flame holds none`)
    if (vessel.liquid !== null) {
      if (!record.choices.liquid.includes(vessel.liquid.value)) throw new Error(`${where}.liquid: "${vessel.liquid.value}" is no choice of the liquid's colour`)
      for (const key of [vessel.liquid.start, ...(vessel.liquid.added === null ? [] : [vessel.liquid.added])]) if (!(key in record.parameters)) throw new Error(`${where}.liquid: no parameter "${key}"`)
    }
    if (vessel.asks.length === 0 || new Set(vessel.asks).size !== vessel.asks.length) throw new Error(`${where}.asks: a vessel asks for one field or more, none twice`)
    for (const field of vessel.asks) {
      if (!(field in FIELD_AT)) throw new Error(`${where}.asks: no such field "${field}"`)
      if (vessel.after[field] === undefined) throw new Error(`${where}.after: nothing stored for "${field}", which is asked`)
      if (!vessel.looks.some((look) => look.at === FIELD_AT[field])) throw new Error(`${where}.looks: "${field}" is asked and nothing opens it: no look at the ${FIELD_AT[field]}`)
    }
    for (const [field, seen] of Object.entries(vessel.after)) {
      if (!record.choices[field]?.includes(seen.value)) throw new Error(`${where}.after.${field}: "${seen.value}" is no choice of that field`)
      if (field !== 'liquid' && seen.value === record.choices[field][0] && !(field === 'bubbles' && vessel.kind.value === 'none')) throw new Error(`${where}.after.${field}: stores what was there before`)
    }
    if (new Set(vessel.looks.map((look) => look.at)).size !== vessel.looks.length) throw new Error(`${where}.looks: a part is looked at twice`)
    for (const look of vessel.looks) {
      if (!vessel.asks.some((field) => FIELD_AT[field] === look.at)) throw new Error(`${where}.looks: the look at the ${look.at} opens nothing that is asked`)
      if (look.before.trim() === '' || look.after.trim() === '' || look.before === look.after) throw new Error(`${where}.looks: the look at the ${look.at} needs words for before and other words for after`)
    }
    if ((vessel.looks.some((look) => look.at === 'metal') || vessel.drawn === 'flame') && vessel.metal === null) throw new Error(`${where}: no metal to look at`)
  }
}

/**
 * Throws unless the order of the metals is what one station shows: exactly one station asks for it; that station's
 * vessels are the metals of the order, one each; the order runs from the tube that bubbles fastest to the one that
 * does not bubble, with no two alike; and hydrogen is put after the last metal that bubbles.
 */
export function checkOrder(record) {
  const asking = record.stations.filter((station) => station.order)
  if (asking.length !== 1) throw new Error(`stations: ${asking.length} stations ask for the order of the metals, expected 1`)
  const [station] = asking
  const where = `stations[${station.id}]`
  const { order, hydrogenAfter } = record.activity
  const rate = (metal) => {
    const vessel = station.vessels.find((v) => v.metal?.id === metal)
    if (!vessel) throw new Error(`${where}: no tube holds "${metal}", which the order names`)
    return RATES.indexOf(vessel.after.bubbles?.value)
  }
  if (order.length !== station.vessels.length || new Set(order).size !== order.length) throw new Error(`${where}: the order names each metal of the station once`)
  const rates = order.map(rate)
  if (rates.some((r, i) => r < 0 || (i > 0 && r >= rates[i - 1]))) throw new Error(`activity.order: not the order the tubes show, from the one that bubbles fastest to the one that does not`)
  const lastBubbling = order.filter((metal) => rate(metal) > 0).at(-1)
  if (hydrogenAfter !== lastBubbling) throw new Error(`activity.hydrogenAfter: hydrogen stands after "${lastBubbling}", the last metal that bubbles in the acid, not after "${hydrogenAfter}"`)
}

/** Throws unless every station's bench is reagents of the record, every reagent is on some bench, and every metal piece is one of its station's reagents. */
export function checkBench(record) {
  const ids = record.reagents.map((reagent) => reagent.id)
  for (const station of record.stations) {
    for (const id of station.reagentIds) if (!ids.includes(id)) throw new Error(`stations[${station.id}].reagentIds: unknown reagent "${id}"`)
    for (const vessel of station.vessels) {
      if (vessel.metal !== null && !station.reagentIds.includes(vessel.metal.reagentId)) throw new Error(`stations[${station.id}].vessels[${vessel.id}].metal: "${vessel.metal.reagentId}" is not on the station's bench`)
    }
    if (station.notes.length === 0) throw new Error(`stations[${station.id}].notes: a station has a note to show when it is done`)
  }
  for (const id of ids) if (!record.stations.some((station) => station.reagentIds.includes(id))) throw new Error(`reagents[${id}]: no station uses it`)
}
