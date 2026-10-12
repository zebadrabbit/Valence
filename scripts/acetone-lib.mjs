// The checks the build makes on the iodination of acetone lab's record (docs/research/acetone/acetone.json) that
// no other lab's record needs: that its reaction balances; that its four mixtures are the ones spec 20.1 asks for,
// with the iodine kept apart until it is poured in; that the acetone and the acid are in such excess that taking
// the rate as steady is as fair as its notes say; and that its rate record holds together. The record's other
// checks are the aqueous lab's (aqueous-lib.mjs): the manifest's rows, the merge of the bottles' hazards and the
// list of sources. build-chem-data.mjs runs them; src/chem-data/acetone/build.test.ts tests them on inputs they
// must refuse. Nothing is fetched here.

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
 * Throws unless the reaction has the same atoms and the same charge on both sides, uses up one of what ends a run
 * for each one of itself as the rate counts it, makes one hydrogen ion for each, and has the product it names.
 */
export function checkReaction(record) {
  const { reaction, rateLaw } = record
  const [left, right] = [sideOf(reaction.reactants), sideOf(reaction.products)]
  for (const element of new Set([...Object.keys(left.atoms), ...Object.keys(right.atoms)])) {
    if (left.atoms[element] !== right.atoms[element]) fail(`reaction: ${left.atoms[element] ?? 0} of ${element} on the left and ${right.atoms[element] ?? 0} on the right`)
  }
  if (left.charge !== right.charge) fail(`reaction: a charge of ${left.charge} on the left and ${right.charge} on the right`)
  const used = byId(record.reagents, rateLaw.end.reagentId, 'rateLaw.end')
  const coefficient = reaction.reactants.find((s) => s.formula === used.formula)?.coefficient ?? fail(`reaction: no ${used.formula} among the reactants`)
  if (rateLaw.end.per !== coefficient) fail(`rateLaw.end.per: ${rateLaw.end.per} is not the ${coefficient} of ${used.formula} that one of the reaction uses up`)
  if (!reaction.products.some((s) => s.formula === 'H⁺' && s.coefficient === 1)) fail('reaction: one hydrogen ion is made for each one of the reaction')
  if (!reaction.products.some((s) => s.formula === reaction.product.formula)) fail(`reaction: the product named, ${reaction.product.formula}, is not among the products`)
  for (const reactant of rateLaw.reactants) {
    if (reactant.id !== 'hydrogen-ion' && !reaction.reactants.some((s) => s.formula === reactant.formula)) fail(`rateLaw.reactants[${reactant.id}]: ${reactant.formula} is not a reactant of the reaction`)
  }
}

const partsOf = (mixture) => [...mixture.flask, mixture.added]

/** mol/L of a bottle's solute in a mixture: its strength times its volume over the whole volume. */
function strengthIn(record, mixture, reagentId) {
  const reagent = byId(record.reagents, reagentId, 'reagents')
  const all = partsOf(mixture)
  const total = all.reduce((sum, part) => sum + part.millilitres, 0)
  return (reagent.molarity * (all.find((part) => part.reagentId === reagentId)?.millilitres ?? 0)) / total
}

/** How many times as strong, to a part in a million. */
const ratio = (a, b) => Number((a / b).toFixed(6))

/**
 * Throws unless the mixtures are those of spec 20.1. Each is of `millilitres` in all, of whole tenths of a
 * millilitre, from bottles the record holds and water. What is used up, the iodine, is what is poured in to start
 * a run, and the flask holds none of it before. The first mixture is the reference: the same volume of each of the
 * three solutions and twice that of water. Each reactant's own mixture has twice the reference's strength of that
 * reactant and the same of the others, and there is no mixture more.
 */
export function checkMixtures(record, millilitres = 50) {
  const { rateLaw } = record
  const known = new Set([...record.reagents.map((r) => r.id), 'water'])
  for (const mixture of record.mixtures) {
    const where = `mixtures[${mixture.id}]`
    const all = partsOf(mixture)
    for (const part of all) {
      if (!known.has(part.reagentId)) fail(`${where}: unknown reagent "${part.reagentId}"`)
      if (!Number.isInteger(Math.round(part.millilitres * 1e6) / 1e5) || part.millilitres < 0) fail(`${where}: ${part.millilitres} mL of "${part.reagentId}" is not a whole number of tenths of a millilitre`)
    }
    const ids = all.map((part) => part.reagentId)
    if (new Set(ids).size !== ids.length) fail(`${where}: a liquid is listed twice`)
    const total = all.reduce((sum, part) => sum + part.millilitres, 0)
    if (total !== millilitres) fail(`${where}: ${total} mL in all, not ${millilitres}`)
    if (mixture.added.reagentId !== rateLaw.end.reagentId) fail(`${where}: what is poured in to start the run is what is used up, "${rateLaw.end.reagentId}"`)
    for (const reactant of rateLaw.reactants) if (!(strengthIn(record, mixture, reactant.reagentId) > 0)) fail(`${where}: holds no "${reactant.reagentId}"`)
  }
  const reference = byId(record.mixtures, record.referenceMixtureId, 'mixtures')
  const water = reference.flask.find((part) => part.reagentId === 'water')?.millilitres
  const volumes = partsOf(reference).filter((part) => part.reagentId !== 'water').map((part) => part.millilitres)
  if (new Set(volumes).size !== 1 || water !== 2 * volumes[0]) fail(`mixtures[${reference.id}]: the reference mixture has the same volume of each solution and twice that of water`)
  const times = (mixture) => rateLaw.reactants.map((reactant) => ratio(strengthIn(record, mixture, reactant.reagentId), strengthIn(record, reference, reactant.reagentId)))
  const paired = new Set([reference.id])
  rateLaw.reactants.forEach((reactant, place) => {
    const mixture = byId(record.mixtures, reactant.comparedIn, `rateLaw.reactants[${reactant.id}].comparedIn`)
    const expected = rateLaw.reactants.map((_, i) => (i === place ? 2 : 1))
    if (times(mixture).join() !== expected.join()) fail(`mixtures[${mixture.id}]: holds ${times(mixture).join(', ')} times the reference's strengths, not twice the ${reactant.name} and the same of the others`)
    paired.add(mixture.id)
  })
  if (paired.size !== record.mixtures.length) fail(`mixtures: the reference and one that doubles each reactant, not ${record.mixtures.length}`)
}

/**
 * How fair it is to take the rate as steady through a run, for each mixture, in percent: how much of the acetone
 * has been used up by the end; how far the hydrogen ion has risen, since the reaction makes one for each iodine
 * molecule it uses; and how much shorter a run is, with the rate following both as they change, than with both as
 * they were at mixing. The last is the integral of dx / (k (a - x)(h + x)) from nothing to all the iodine, over
 * the time at the starting rate; the rate constant cancels. Throws where a share is over its limit, which is what
 * the lab's note on the idealisation says it is under. Returns the shares, for the tests and the README.
 */
export function checkExcess(record, limits = { acetonePercent: 0.25, acidPercent: 1, shorterPercent: 0.4 }) {
  const [acetone, acid] = ['acetone', 'hydrogen-ion'].map((id) => byId(record.rateLaw.reactants, id, 'rateLaw.reactants').reagentId)
  return record.mixtures.map((mixture) => {
    const [a, h, x] = [strengthIn(record, mixture, acetone), strengthIn(record, mixture, acid), strengthIn(record, mixture, record.rateLaw.end.reagentId) / record.rateLaw.end.per]
    const shares = {
      acetonePercent: (x / a) * 100,
      acidPercent: (x / h) * 100,
      shorterPercent: (1 - Math.log(((h + x) * a) / (h * (a - x))) / (a + h) / (x / (a * h))) * 100,
    }
    for (const [name, percent] of Object.entries(shares)) {
      if (!(percent >= 0) || percent > limits[name] + 1e-9) fail(`mixtures[${mixture.id}]: ${name} is ${percent.toFixed(2)}, which is not between nothing and ${limits[name]}`)
    }
    return { id: mixture.id, ...shares }
  })
}

const onlyKeys = (object, keys, where) => {
  const given = object && typeof object === 'object' ? Object.keys(object) : []
  if (given.some((key) => !keys.includes(key)) || keys.some((key) => !given.includes(key))) fail(`${where}: expected exactly the keys ${keys.join(', ')}`)
}

const SUPERSCRIPT = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }
/** The rate constant as a note writes it: "2.91 × 10⁻⁵ L/(mol·s)". */
export const rateConstantText = ({ published, exponent, unit }) => `${published} × 10${[...String(exponent)].map((c) => SUPERSCRIPT[c]).join('')} ${unit}`
/** The activation energy in kJ/mol, to one decimal place: the published kilocalories times the joules in a calorie. */
export const activationKilojoules = (record) => (record.rateLaw.activationEnergy.value * record.constants.joulesPerCalorie.value).toFixed(1)

/**
 * Throws unless the rate record holds together (spec 20.4): each order is one of the choices, and the unit that
 * the three orders give the rate constant is one of the units to choose among and is the unit stored; the rate
 * constant and the activation energy are each stored with the figure their source prints, the first with the
 * power of ten printed beside it; a note of the second part gives both as they are stored, the activation energy
 * in kilojoules too; what ends a run is a bottle with a strength and the reactant whose order is nought; and every
 * parameter is a value with a rationale.
 */
export function checkRateRecord(record) {
  const { rateLaw, parameters } = record
  for (const [key, parameter] of Object.entries(parameters)) onlyKeys(parameter, ['value', 'rationale'], `parameters.${key}`)
  const orders = rateLaw.reactants.map((reactant) => reactant.order.value)
  for (const reactant of rateLaw.reactants) {
    if (!parameters.orderChoices.value.includes(reactant.order.value)) fail(`rateLaw.reactants[${reactant.id}].order: ${reactant.order.value} is not one of the orders to choose among`)
    if (!(byId(record.reagents, reactant.reagentId, `rateLaw.reactants[${reactant.id}]`).molarity > 0)) fail(`rateLaw.reactants[${reactant.id}]: its bottle has no strength`)
  }
  const power = 1 - orders.reduce((sum, order) => sum + order, 0)
  if (!parameters.unitPowers.value.includes(power)) fail(`parameters.unitPowers: the unit of a rate constant of order ${1 - power} is not among the choices`)
  const UNITS = { 0: '1/s', '-1': 'L/(mol·s)', '-2': 'L²/(mol²·s)', '-3': 'L³/(mol³·s)', '-4': 'L⁴/(mol⁴·s)' }
  if (rateLaw.rateConstant.unit !== UNITS[power]) fail(`rateLaw.rateConstant.unit: "${rateLaw.rateConstant.unit}" is not the unit of a rate constant of order ${1 - power}, ${UNITS[power]}`)
  if (Number(rateLaw.rateConstant.published) !== rateLaw.rateConstant.value) fail(`rateLaw.rateConstant: published as ${rateLaw.rateConstant.published}, which is not the stored ${rateLaw.rateConstant.value}`)
  if (!Number.isInteger(rateLaw.rateConstant.exponent)) fail('rateLaw.rateConstant.exponent: the power of ten beside the figure is a whole number')
  if (Number(rateLaw.activationEnergy.published) !== rateLaw.activationEnergy.value) fail(`rateLaw.activationEnergy: published as ${rateLaw.activationEnergy.published}, which is not the stored ${rateLaw.activationEnergy.value}`)
  if (rateLaw.activationEnergy.unit !== 'kcal/mol' || record.constants.joulesPerCalorie.unit !== 'J/cal') fail('rateLaw.activationEnergy: stored in kcal/mol, as its source prints it, with the joules in a calorie beside it')
  const end = rateLaw.reactants.find((reactant) => reactant.reagentId === rateLaw.end.reagentId) ?? fail('rateLaw.end: what is used up is one of the reactants')
  if (end.order.value !== 0) fail(`rateLaw.end: the rate is steady to the end of a run only if the order in what is used up is nought, not ${end.order.value}`)
  const notes = byId(record.parts, 'rate-law', 'parts').notes.map((note) => note.value)
  if (!notes.some((note) => note.includes(rateConstantText(rateLaw.rateConstant)) && note.includes(`${rateLaw.rateConstant.celsius} °C`))) fail('parts[rate-law]: no note gives the rate constant as it is stored')
  if (!notes.some((note) => note.includes(`${rateLaw.activationEnergy.published} ${rateLaw.activationEnergy.unit} (${activationKilojoules(record)} kJ/mol)`))) fail('parts[rate-law]: no note gives the activation energy as it is stored, with the same in kJ/mol')
  if (!notes.some((note) => note.includes(rateLaw.expression))) fail('parts[rate-law]: no note gives the rate law')
  if (!(parameters.faintestBelowMicroMolar.value > 0 && parameters.faintestBelowMicroMolar.value < parameters.paleBelowMicroMolar.value)) fail('parameters: the faintest yellow is below pale yellow, and above none')
}
