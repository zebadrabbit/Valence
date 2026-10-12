// The checks the build makes on the polarity and mixing lab's record (docs/research/mixing/mixing.json) that no
// other lab's record needs (spec 25.1, 25.3 and 25.5): that every pair of liquids and every solid in a liquid is
// either on the bench or listed as left off it, never both and none unnamed; that everything on the bench says what
// it rests on; that which liquid is on top of a pair that makes two layers follows from the two stored densities,
// which are far enough apart to say; that the counts that finish a part can be reached; that part 3's answers are
// among their choices; and that a molecule the record links to is in the explorer's library. It also puts in the
// one note the foods share, in the red cabbage pH lab's wording. The record's other checks are the aqueous lab's
// (aqueous-lib.mjs): the manifest's rows, the merge of the bottle's hazards and the list of sources.
// build-chem-data.mjs runs them; src/chem-data/mixing/build.test.ts tests them on inputs they must refuse.
// Nothing is fetched here.

function fail(message) {
  throw new Error(message)
}

/** The id of a pair of liquids: the two ids in the bench's order, joined by a plus sign. */
export const pairId = (record, a, b) => {
  const order = record.liquids.map((liquid) => liquid.id)
  return [a, b].sort((x, y) => order.indexOf(x) - order.indexOf(y)).join('+')
}

/** The id of a solid in a liquid. */
export const solidTubeId = (solid, liquid) => `${solid}-in-${liquid}`

/**
 * Throws unless the bench is whole: each pair on it is two different liquids of the record, named in the bench's
 * order; each solid in a liquid is a solid and a liquid of the record; nothing is there twice; and every one of the
 * pairs and of the solids in liquids that the record's liquids and solids allow is either on the bench or listed in
 * `offBench` with why it is not, and never both (spec 25.1: what no source settles is not on the bench).
 */
export function checkBench(record) {
  const liquids = record.liquids.map((liquid) => liquid.id)
  const solids = record.solids.map((solid) => solid.id)
  for (const pair of record.pairs) {
    const [a, b] = pair.liquidIds
    if (!liquids.includes(a) || !liquids.includes(b) || a === b) fail(`pairs[${pair.id}]: not two different liquids of the record`)
    if (pair.id !== pairId(record, a, b) || pair.id !== `${a}+${b}`) fail(`pairs[${pair.id}]: a pair is named by its two liquids in the bench's order, "${pairId(record, a, b)}"`)
  }
  for (const tube of record.solidInLiquid) {
    if (!solids.includes(tube.solidId) || !liquids.includes(tube.liquidId)) fail(`solidInLiquid[${tube.id}]: not a solid and a liquid of the record`)
    if (tube.id !== solidTubeId(tube.solidId, tube.liquidId)) fail(`solidInLiquid[${tube.id}]: it is named "${solidTubeId(tube.solidId, tube.liquidId)}"`)
  }
  const on = [...record.pairs.map((pair) => pair.id), ...record.solidInLiquid.map((tube) => tube.id)]
  const off = record.offBench.map((item) => item.id)
  const twice = [...on, ...off].find((id, i, all) => all.indexOf(id) !== i)
  if (twice !== undefined) fail(`"${twice}" is listed twice: a tube is on the bench once, or left off it once`)
  const every = [
    ...liquids.flatMap((a, i) => liquids.slice(i + 1).map((b) => ({ id: `${a}+${b}`, kind: 'pair' }))),
    ...solids.flatMap((solid) => liquids.map((liquid) => ({ id: solidTubeId(solid, liquid), kind: 'solid-in-liquid' }))),
  ]
  for (const { id, kind } of every) {
    if (!on.includes(id) && !off.includes(id)) fail(`"${id}" is neither on the bench nor listed as left off it`)
    const left = record.offBench.find((item) => item.id === id)
    if (left && left.kind !== kind) fail(`offBench[${id}]: it is a ${kind}`)
  }
  const unknown = [...on, ...off].find((id) => !every.some((tube) => tube.id === id))
  if (unknown !== undefined) fail(`"${unknown}" is no pair of two liquids and no solid in a liquid of the record`)
  for (const item of record.offBench) if (typeof item.rationale !== 'string' || item.rationale.trim() === '') fail(`offBench[${item.id}]: it does not say why it is left off`)
}

const sourced = (cited) => typeof cited?.sourceId === 'string' && cited.sourceId.trim() !== ''

/**
 * Throws unless everything on the bench says what it rests on (spec 25.5): each liquid's density and family, each
 * pair's outcome and each solid's, each with a source and with the reason the source applies. An outcome that rests
 * on a rule for a family, and not on a source that names the two things, is marked `general` and must give a reason.
 */
export function checkSourced(record) {
  for (const liquid of record.liquids) {
    if (!sourced(liquid.density)) fail(`liquids[${liquid.id}].density: no source`)
    if (!sourced(liquid.family)) fail(`liquids[${liquid.id}].family: no source`)
    if (!(liquid.density.value > 0)) fail(`liquids[${liquid.id}].density: not a density`)
  }
  const outcomes = [...record.pairs.map((pair) => [`pairs[${pair.id}].mix`, pair.mix]), ...record.solidInLiquid.map((tube) => [`solidInLiquid[${tube.id}].dissolves`, tube.dissolves])]
  for (const [where, outcome] of outcomes) {
    if (typeof outcome?.value !== 'boolean') fail(`${where}: no outcome`)
    if (!sourced(outcome)) fail(`${where}: no source; a tube with no source is not on the bench`)
    if (!['named', 'general'].includes(outcome.basis)) fail(`${where}: its basis is "named" or "general"`)
    if (typeof outcome.reason !== 'string' || outcome.reason.trim() === '') fail(`${where}: it does not say why its source applies`)
  }
}

/** The liquid of a pair that is on top where the two make layers: the less dense, by the stored densities. */
export function onTop(record, pair) {
  const [a, b] = pair.liquidIds.map((id) => record.liquids.find((liquid) => liquid.id === id))
  return a.density.value < b.density.value ? a.id : b.id
}

/**
 * Throws unless, for every pair on the bench that makes two layers, the two stored densities are at least
 * `parameters.leastDensityGap` apart, so that which liquid is on top can be said (spec 25.3). Nothing stores which
 * is on top: it is worked out here and in the engine from the densities, and a test holds the two to each other.
 * Returns, for each such pair, the liquid on top and how far apart the two densities are.
 */
export function checkLayers(record) {
  const least = record.parameters.leastDensityGap.value
  return record.pairs
    .filter((pair) => !pair.mix.value)
    .map((pair) => {
      const [a, b] = pair.liquidIds.map((id) => record.liquids.find((liquid) => liquid.id === id).density.value)
      const gap = Math.abs(a - b)
      if (gap < least - 1e-9) fail(`pairs[${pair.id}]: its two densities, ${a} and ${b} g/mL, are ${gap.toFixed(3)} apart: under ${least}, too near to say which liquid is on top`)
      return { id: pair.id, top: onTop(record, pair), gap: Number(gap.toFixed(3)) }
    })
}

/** Throws unless each part's count can be reached with what is on the bench, and part 3's questions have their answer among two choices. */
export function checkParts(record) {
  const { neededPairs, neededSolids } = record.parameters
  if (neededPairs.value > record.pairs.length) fail(`parameters.neededPairs: ${neededPairs.value} pairs are needed and the bench has ${record.pairs.length}`)
  if (neededSolids.value > record.solidInLiquid.length) fail(`parameters.neededSolids: ${neededSolids.value} tubes are needed and the bench has ${record.solidInLiquid.length}`)
  for (const question of record.rule.questions) {
    if (question.choices.length !== 2 || question.choices[0] === question.choices[1]) fail(`rule.questions[${question.id}]: a question has two different choices`)
    if (!question.choices.includes(question.answer.value)) fail(`rule.questions[${question.id}]: its answer is not one of its choices`)
    if (!sourced(question.answer)) fail(`rule.questions[${question.id}]: its answer has no source`)
  }
}

/** Throws unless every molecule the record links a liquid or a solid to is in the explorer's library (spec 25.2). */
export function checkMolecules(record, libraryIds) {
  for (const item of [...record.liquids, ...record.solids]) {
    if (item.moleculeId !== undefined && !libraryIds.includes(item.moleculeId)) fail(`${item.id}: the library holds no molecule "${item.moleculeId}"`)
  }
}

/**
 * The record with the note its foods share put in: the red cabbage pH lab's note for foods on a bench, word for
 * word, from that lab's record. The mixing record names the lab it shares with and says why; it holds no wording of
 * its own, so the two cannot come to differ.
 */
export function withSharedNote(record, cabbage) {
  const { sharedWith, rationale, ...rest } = record.sharedNote
  if (sharedWith !== 'cabbage' || Object.keys(rest).length > 0) fail('sharedNote: it names the lab it is shared with, "cabbage", and why, and holds no wording of its own')
  const value = cabbage?.sharedNote?.value
  if (typeof value !== 'string' || value.trim() === '') fail("sharedNote: the red cabbage pH lab's record has no shared note to take")
  return { ...record, sharedNote: { value, rationale } }
}
