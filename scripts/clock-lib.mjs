// The checks the build makes on the clock reaction lab's record (docs/research/clock/clock.json) that no other
// lab's record needs: that its two reactions balance and give the count it stores between them; that its five
// mixtures are the ones spec 19.1 asks for, split so that nothing reacts before they are mixed; and that what is
// used up by the end of a run is as small beside the reactants as its notes say. The record's other checks are the
// aqueous lab's (aqueous-lib.mjs): the manifest's rows, the merge of the bottles' hazards and the list of sources.
// build-chem-data.mjs runs them; src/chem-data/clock/build.test.ts tests them on inputs they must refuse. Nothing
// is fetched here.

function fail(message) {
  throw new Error(message)
}

const byId = (list, id, where) => list.find((item) => item.id === id) ?? fail(`${where}: no "${id}"`)

/** The atoms of one side of an equation, each counted, and its charge. */
function sideOf(species) {
  const atoms = {}
  let charge = 0
  for (const { coefficient, composition, charge: own } of species) {
    for (const [element, count] of Object.entries(composition)) atoms[element] = (atoms[element] ?? 0) + coefficient * count
    charge += coefficient * own
  }
  return { atoms, charge }
}

/**
 * Throws unless each reaction has the same atoms and the same charge on both sides, and the count between the two
 * is what they give: the iodine one bromate ion makes, times the thiosulfate one molecule of iodine takes. The
 * stored count, the number a run's rate divides by, and the figures in the working must all be that.
 */
export function checkReactions(record) {
  for (const reaction of record.reactions) {
    const [left, right] = [sideOf(reaction.reactants), sideOf(reaction.products)]
    const elements = new Set([...Object.keys(left.atoms), ...Object.keys(right.atoms)])
    for (const element of elements) {
      if (left.atoms[element] !== right.atoms[element]) fail(`reactions[${reaction.id}]: ${left.atoms[element] ?? 0} of ${element} on the left and ${right.atoms[element] ?? 0} on the right`)
    }
    if (left.charge !== right.charge) fail(`reactions[${reaction.id}]: a charge of ${left.charge} on the left and ${right.charge} on the right`)
  }
  const slow = byId(record.reactions, record.rateLaw.reactionId, 'reactions')
  const clock = record.reactions.find((reaction) => reaction.id !== slow.id) ?? fail('reactions: no second reaction')
  const coefficient = (species, formula, where) => (species.find((s) => s.formula === formula) ?? fail(`${where}: no ${formula}`)).coefficient
  const iodineMade = coefficient(slow.products, 'I₂', `reactions[${slow.id}]`) / coefficient(slow.reactants, 'BrO₃⁻', `reactions[${slow.id}]`)
  const thiosulfateTaken = coefficient(clock.reactants, 'S₂O₃²⁻', `reactions[${clock.id}]`) / coefficient(clock.reactants, 'I₂', `reactions[${clock.id}]`)
  const count = iodineMade * thiosulfateTaken
  if (record.count.value !== count) fail(`count: ${record.count.value} is not the ${iodineMade} × ${thiosulfateTaken} = ${count} that the two reactions give`)
  if (record.rateLaw.end.per !== count) fail(`rateLaw.end.per: ${record.rateLaw.end.per} is not the count of the two reactions, ${count}`)
  for (const figure of [String(iodineMade), String(thiosulfateTaken), String(count)]) {
    if (!record.count.working.includes(figure)) fail(`count: the working does not show ${figure}`)
  }
}

/** mol/L of a bottle's solute in a mixture: its strength times its volume over the whole volume. */
function strengthIn(record, mixture, reagentId) {
  const reagent = byId(record.reagents, reagentId, 'reagents')
  const all = [...mixture.flaskA, ...mixture.flaskB]
  const total = all.reduce((sum, part) => sum + part.millilitres, 0)
  return ((reagent.molarity ?? 0) * (all.find((part) => part.reagentId === reagentId)?.millilitres ?? 0)) / total
}

/** How many times as strong, to a part in a million. */
const ratio = (a, b) => Number((a / b).toFixed(6))

/**
 * Throws unless the mixtures are those of spec 19.1. Each is of `millilitres` in all, of whole tenths of a
 * millilitre, from bottles the record holds and water. No flask holds every reactant of the rate law, and what is
 * used up by the end of a run is not in the flask with the acid, so nothing reacts until the flasks are mixed. The
 * first mixture is the reference, with the same volume of each of its five liquids. Each reactant's own mixture
 * has twice the reference's strength of that reactant and the same of the others; and one mixture more differs
 * from the reference in every reactant. Every mixture holds the same amount of what is used up.
 */
export function checkMixtures(record, millilitres = 50) {
  const { rateLaw } = record
  const known = new Set([...record.reagents.map((r) => r.id), 'water'])
  const reactantBottles = rateLaw.reactants.map((reactant) => reactant.reagentId)
  const acid = byId(rateLaw.reactants, 'hydrogen-ion', 'rateLaw.reactants').reagentId
  for (const mixture of record.mixtures) {
    const where = `mixtures[${mixture.id}]`
    const all = [...mixture.flaskA, ...mixture.flaskB]
    for (const part of all) {
      if (!known.has(part.reagentId)) fail(`${where}: unknown reagent "${part.reagentId}"`)
      if (!Number.isInteger(Math.round(part.millilitres * 1e6) / 1e5) || part.millilitres < 0) fail(`${where}: ${part.millilitres} mL of "${part.reagentId}" is not a whole number of tenths of a millilitre`)
    }
    const ids = all.map((part) => part.reagentId)
    if (new Set(ids).size !== ids.length) fail(`${where}: a liquid is listed twice`)
    const total = all.reduce((sum, part) => sum + part.millilitres, 0)
    if (total !== millilitres) fail(`${where}: ${total} mL in all, not ${millilitres}`)
    for (const [name, flask] of [['flaskA', mixture.flaskA], ['flaskB', mixture.flaskB]]) {
      const holds = new Set(flask.filter((part) => part.millilitres > 0).map((part) => part.reagentId))
      if (reactantBottles.every((id) => holds.has(id))) fail(`${where}.${name}: holds every reactant, so the reaction would start before the flasks are mixed`)
      if (holds.has(rateLaw.end.reagentId) && holds.has(acid)) fail(`${where}.${name}: holds what is used up together with the acid`)
    }
    if (all.some((part) => part.reagentId === rateLaw.end.indicatorId)) fail(`${where}: the drops of "${rateLaw.end.indicatorId}" are not counted in the volume`)
    for (const id of [...reactantBottles, rateLaw.end.reagentId]) if (!(strengthIn(record, mixture, id) > 0)) fail(`${where}: holds no "${id}"`)
  }
  const reference = byId(record.mixtures, record.referenceMixtureId, 'mixtures')
  const volumes = [...reference.flaskA, ...reference.flaskB].map((part) => part.millilitres)
  if (new Set(volumes).size !== 1) fail(`mixtures[${reference.id}]: the reference mixture has the same volume of each liquid`)
  const used = (mixture) => strengthIn(record, mixture, rateLaw.end.reagentId)
  const times = (mixture) => rateLaw.reactants.map((reactant) => ratio(strengthIn(record, mixture, reactant.reagentId), strengthIn(record, reference, reactant.reagentId)))
  for (const mixture of record.mixtures) if (ratio(used(mixture), used(reference)) !== 1) fail(`mixtures[${mixture.id}]: holds another amount of what is used up than the reference does`)
  const paired = new Set([reference.id])
  rateLaw.reactants.forEach((reactant, place) => {
    const mixture = byId(record.mixtures, reactant.comparedIn, `rateLaw.reactants[${reactant.id}].comparedIn`)
    const expected = rateLaw.reactants.map((_, i) => (i === place ? 2 : 1))
    if (times(mixture).join() !== expected.join()) fail(`mixtures[${mixture.id}]: holds ${times(mixture).join(', ')} times the reference's strengths, not twice the ${reactant.name} and the same of the others`)
    paired.add(mixture.id)
  })
  const rest = record.mixtures.filter((mixture) => !paired.has(mixture.id))
  if (rest.length !== 1) fail(`mixtures: one mixture beside the reference and the three that double a reactant, not ${rest.length}`)
  if (times(rest[0]).some((x) => x === 1)) fail(`mixtures[${rest[0].id}]: the mixture that checks the rate law differs from the reference in every reactant`)
}

/**
 * How much of each mixture's reactants has been used up by the end of a run, in percent: the bromate by what the
 * run uses up, the hydrogen ion by the hydrogen ions the reaction takes for each bromate ion, and the iodide not
 * at all, since the second reaction gives back every iodide ion the first takes. Throws where a share is over
 * `limitPercent`, which is what the lab's note on the idealisation says it is under. Returns the shares, for the
 * tests and for the record of the build.
 */
export function checkUsedUp(record, limitPercent = 1) {
  const { rateLaw } = record
  const slow = byId(record.reactions, rateLaw.reactionId, 'reactions')
  const clock = record.reactions.find((reaction) => reaction.id !== slow.id)
  const coefficientOf = (formula) => slow.reactants.find((s) => s.formula === formula)?.coefficient ?? fail(`reactions[${slow.id}]: no ${formula}`)
  // The iodide the second reaction gives back, for each bromate ion: it must be all that the first took.
  const givenBack = (slow.products.find((s) => s.formula === 'I₂').coefficient * clock.products.find((s) => s.formula === 'I⁻').coefficient) / clock.reactants.find((s) => s.formula === 'I₂').coefficient
  if (givenBack !== coefficientOf('I⁻')) fail('reactions: the second reaction does not give back the iodide the first takes')
  return record.mixtures.map((mixture) => {
    const used = strengthIn(record, mixture, rateLaw.end.reagentId) / rateLaw.end.per
    const shares = Object.fromEntries(
      rateLaw.reactants.filter((reactant) => reactant.id !== 'iodide').map((reactant) => [reactant.id, ((used * coefficientOf(reactant.formula)) / strengthIn(record, mixture, reactant.reagentId)) * 100]),
    )
    for (const [id, percent] of Object.entries(shares)) {
      if (percent > limitPercent + 1e-9) fail(`mixtures[${mixture.id}]: ${percent.toFixed(2)}% of the ${id} is used up by the end of a run, which is over ${limitPercent}%`)
    }
    return { id: mixture.id, ...shares }
  })
}

const onlyKeys = (object, keys, where) => {
  const given = object && typeof object === 'object' ? Object.keys(object) : []
  if (given.some((key) => !keys.includes(key)) || keys.some((key) => !given.includes(key))) fail(`${where}: expected exactly the keys ${keys.join(', ')}`)
}

/**
 * Throws unless the rate record holds together (spec 19.4): each order is one of the choices, and the unit that
 * the three orders give the rate constant is one of the units to choose among and is the unit stored; the rate
 * constant is stored with the figure its source prints; the activation energy, which no source gives, is a model
 * parameter with its rationale and nothing else, and its rationale says that it is the lab's own; each bath names
 * a parameter that is a range; and every parameter is a value with a rationale.
 */
export function checkRateRecord(record) {
  const { rateLaw, parameters } = record
  for (const [key, parameter] of Object.entries(parameters)) onlyKeys(parameter, ['value', 'rationale'], `parameters.${key}`)
  const orders = rateLaw.reactants.map((reactant) => reactant.order.value)
  for (const reactant of rateLaw.reactants) {
    if (!parameters.orderChoices.value.includes(reactant.order.value)) fail(`rateLaw.reactants[${reactant.id}].order: ${reactant.order.value} is not one of the orders to choose among`)
    if (byId(record.reagents, reactant.reagentId, `rateLaw.reactants[${reactant.id}]`).molarity === undefined) fail(`rateLaw.reactants[${reactant.id}]: its bottle has no strength`)
  }
  const power = 1 - orders.reduce((sum, order) => sum + order, 0)
  if (!parameters.unitPowers.value.includes(power)) fail(`parameters.unitPowers: the unit of a rate constant of order ${1 - power} is not among the choices`)
  const UNITS = { 0: '1/s', '-1': 'L/(mol·s)', '-2': 'L²/(mol²·s)', '-3': 'L³/(mol³·s)', '-4': 'L⁴/(mol⁴·s)' }
  if (rateLaw.rateConstant.unit !== UNITS[power]) fail(`rateLaw.rateConstant.unit: "${rateLaw.rateConstant.unit}" is not the unit of a rate constant of order ${1 - power}, ${UNITS[power]}`)
  if (Number(rateLaw.rateConstant.published) !== rateLaw.rateConstant.value) fail(`rateLaw.rateConstant: published as ${rateLaw.rateConstant.published}, which is not the stored ${rateLaw.rateConstant.value}`)
  onlyKeys(rateLaw.activationEnergy, ['value', 'unit', 'rationale'], 'rateLaw.activationEnergy')
  if (!rateLaw.activationEnergy.rationale.startsWith("The lab's own figure, not a measured one.")) fail("rateLaw.activationEnergy: the rationale must begin by saying that the figure is the lab's own, not a measured one")
  for (const id of [rateLaw.end.reagentId, rateLaw.end.indicatorId]) byId(record.reagents, id, 'rateLaw.end')
  for (const bath of record.baths) {
    const range = parameters[bath.range]?.value
    if (!Array.isArray(range) || range.length !== 2 || !(range[0] <= range[1])) fail(`baths[${bath.id}]: "${bath.range}" is not a parameter that is a range`)
  }
  for (const part of record.parts) {
    if (part.id === 'rate-law' && !part.notes.some((n) => n.value.includes(`${rateLaw.rateConstant.published} ${rateLaw.rateConstant.unit}`))) fail('parts[rate-law]: no note gives the rate constant as it is stored')
    if (part.id === 'temperature' && !part.notes.some((n) => n.value.includes(`${rateLaw.activationEnergy.value} ${rateLaw.activationEnergy.unit}`) && n.value.includes("the lab's own figure, not a measured one"))) fail("parts[temperature]: no note gives the activation energy and says that it is the lab's own figure, not a measured one")
  }
}
