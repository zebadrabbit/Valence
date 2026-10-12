// The checks the build makes on the Group I cations lab's record (docs/research/cations/cations.json) that no other
// lab's record needs: the values it works out from cited ones, its two atomic weights against the periodic table's
// record, and the checks of its rules against its numbers that spec 17.4 asks for, at the amounts on its bench.
// The record's other checks are the aqueous lab's (aqueous-lib.mjs): the manifest's rows, the merge of the
// reagents' hazards and the list of sources. build-chem-data.mjs runs them; src/chem-data/cations/build.test.ts
// tests them on inputs they must refuse. Nothing is fetched here.

/** A number to three significant figures. */
export const threeFigures = (value) => Number(value.toPrecision(3))

const SUPERSCRIPT = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' }
/** The number a constant is shown as: "1.77 × 10⁻¹⁰" is 1.77e-10. NaN where the text is not written that way. */
export function shownValue(shown) {
  const match = /^(\d+(?:\.\d+)?) × 10([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)$/.exec(shown)
  if (!match) return NaN
  return Number(`${match[1]}e${[...match[2]].map((c) => SUPERSCRIPT[c]).join('')}`)
}

/** A whole number with a thin gap between its thousands, as the workings write it: 35 958. */
const spaced = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

const gibbsOf = (record, id, where) => record.gibbs.find((g) => g.id === id) ?? fail(`${where}: no Gibbs energy "${id}"`)
function fail(message) {
  throw new Error(message)
}

/** The Gibbs energy of a change, in kJ/mol to the three decimals the table prints: its terms' energies, each times its coefficient. */
const gibbsSum = (record, equilibrium) =>
  Number(equilibrium.terms.reduce((sum, term) => sum + term.coefficient * gibbsOf(record, term.gibbsId, `equilibria[${equilibrium.id}]`).value, 0).toFixed(3))

/** The constant of a change from its Gibbs energy in kJ/mol: e^(−ΔG° ÷ RT). */
export const constantFrom = (record, kilojoules) => Math.exp((-kilojoules * 1000) / (record.constants.gasConstant.value * record.parameters.temperatureKelvin.value))

/**
 * Throws unless every value the record works out is what its cited values give: each equilibrium's Gibbs energy is
 * the sum of its terms, and its constant follows from that energy, the gas constant and the temperature, to three
 * significant figures, and is shown as it is stored; the molar mass of lead chloride is the sum of its atomic
 * weights; and each solubility in nanomoles for each millilitre is the cited solubility over that molar mass. Each
 * working must show the figures it was made from.
 */
export function checkWorkedOut(record) {
  for (const equilibrium of record.equilibria) {
    const where = `equilibria[${equilibrium.id}]`
    const sum = gibbsSum(record, equilibrium)
    if (sum !== equilibrium.gibbs.value) fail(`${where}.gibbs: ${equilibrium.gibbs.value} is not the sum of its terms, ${sum}`)
    for (const term of equilibrium.terms) {
      const figure = gibbsOf(record, term.gibbsId, where).published.replace('-', '')
      if (!equilibrium.gibbs.working.includes(figure)) fail(`${where}.gibbs: the working does not show ${figure}`)
    }
    if (!equilibrium.gibbs.working.includes(Math.abs(sum).toFixed(3))) fail(`${where}.gibbs: the working does not show its result`)
    const constant = threeFigures(constantFrom(record, sum))
    if (constant !== equilibrium.constant.value) fail(`${where}.constant: ${equilibrium.constant.value} is not e^(−ΔG° ÷ RT) to three significant figures, ${constant}`)
    if (shownValue(equilibrium.constant.shown) !== equilibrium.constant.value) fail(`${where}.constant: shown as "${equilibrium.constant.shown}", which is not the stored ${equilibrium.constant.value}`)
    for (const figure of [String(record.constants.gasConstant.value), String(record.parameters.temperatureKelvin.value), spaced(Math.round(Math.abs(sum) * 1000))]) {
      if (!equilibrium.constant.working.includes(figure)) fail(`${where}.constant: the working does not show ${figure}`)
    }
  }
  const chromate = record.leadChromate.solubilityProduct
  if (shownValue(chromate.shown) !== chromate.value) fail(`leadChromate.solubilityProduct: shown as "${chromate.shown}", which is not the stored ${chromate.value}`)

  const lead = record.leadChloride
  const weight = (id) => lead.atomicWeights.find((w) => w.id === id) ?? fail(`leadChloride.atomicWeights: no "${id}"`)
  const molarMass = Number((weight('Pb').value + 2 * weight('Cl').value).toFixed(2))
  if (molarMass !== lead.molarMass.value) fail(`leadChloride.molarMass: ${lead.molarMass.value} is not ${weight('Pb').published} + 2 × ${weight('Cl').published}, ${molarMass}`)
  for (const figure of [weight('Pb').published, weight('Cl').published, molarMass.toFixed(2)]) {
    if (!lead.molarMass.working.includes(figure)) fail(`leadChloride.molarMass: the working does not show ${figure}`)
  }
  for (const [name, solubility] of [['cold', lead.solubilityCold], ['hot', lead.solubilityHot]]) {
    const perMillilitre = Math.round((solubility.value / molarMass) * 1e6)
    if (perMillilitre !== lead[name].value) fail(`leadChloride.${name}: ${lead[name].value} is not ${solubility.published} g/L ÷ ${molarMass.toFixed(2)} g/mol in nanomoles for each millilitre, ${perMillilitre}`)
    for (const figure of [solubility.published, molarMass.toFixed(2), spaced(perMillilitre)]) {
      if (!lead[name].working.includes(figure)) fail(`leadChloride.${name}: the working does not show ${figure}`)
    }
  }
}

/** Throws unless each atomic weight is the figure the periodic table's record holds for its symbol, from the same source. */
export function checkAtomicWeights(record, periodicTable) {
  for (const weight of record.leadChloride.atomicWeights) {
    const where = `leadChloride.atomicWeights[${weight.id}]`
    const element = periodicTable.find((e) => e.symbol === weight.id) ?? fail(`${where}: no element "${weight.id}" in the periodic table`)
    if (element.atomicMass.published !== weight.published || element.atomicMass.sourceId !== weight.sourceId) {
      fail(`${where}: the periodic table gives ${weight.id} the atomic weight ${element.atomicMass.published} from "${element.atomicMass.sourceId}", not the stored ${weight.published}`)
    }
  }
}

/** The eight samples a tube can start from, by the ions each holds: the seven unknowns, of which the last is also the known. */
export const SAMPLES = [['silver'], ['lead'], ['mercury-i'], ['silver', 'lead'], ['silver', 'mercury-i'], ['lead', 'mercury-i'], ['silver', 'lead', 'mercury-i']]

/**
 * The bench's amounts as whole numbers, from the record's parameters and the reagents' strengths: volumes in
 * microlitres and amounts in nanomoles. The engine works the same amounts out for itself (src/engine/cations/model.ts),
 * and a test holds the two to each other.
 */
export function amountsOf(record) {
  const p = Object.fromEntries(Object.entries(record.parameters).map(([key, parameter]) => [key, parameter.value]))
  const molarity = (id) => (record.reagents.find((r) => r.id === id) ?? fail(`no reagent "${id}"`)).molarity
  const microlitres = (drops) => drops * p.dropMicrolitres
  /** nmol in a count of drops of a solution: µL × mol/L × 1000. */
  const nanomoles = (drops, id) => Math.round(microlitres(drops) * molarity(id) * 1000)
  const strengths = record.ions.map((ion) => molarity(ion.reagentId))
  if (new Set(strengths).size !== 1) fail('ions: the three solutions the samples are made from are not of one strength')
  return {
    sampleMicrolitres: microlitres(p.sampleDrops),
    ionNanomoles: nanomoles(p.sampleDropsOfEach, record.ions[0].reagentId),
    acidMicrolitres: microlitres(p.hydrochloricAcidDrops),
    chlorideNanomoles: nanomoles(p.hydrochloricAcidDrops, 'hcl-6m'),
    waterMicrolitres: microlitres(p.waterDrops),
    aceticAcidMicrolitres: microlitres(p.aceticAcidDrops),
    chromateMicrolitres: microlitres(p.chromateDrops),
    chromateNanomoles: nanomoles(p.chromateDrops, 'k2cro4-0.5m'),
    ammoniaMicrolitres: microlitres(p.ammoniaDrops),
    ammoniaNanomoles: nanomoles(p.ammoniaDrops, 'nh3-6m'),
    nitricAcidMicrolitres: microlitres(p.nitricAcidDrops),
    nitricAcidNanomoles: nanomoles(p.nitricAcidDrops, 'hno3-6m'),
    nitricAcidAdditions: p.nitricAcidAdditions,
    leadChlorideColdPerMillilitre: record.leadChloride.cold.value,
    leadChlorideHotPerMillilitre: record.leadChloride.hot.value,
  }
}

/** mol/L from nanomoles in microlitres. */
const molar = (nanomoles, microlitres) => nanomoles / microlitres / 1000

/**
 * The checks of rules against numbers (spec 17.4), at the bench's amounts, for every sample and, where it changes
 * the sum, for the water of step 2 poured off hot and poured off cold. Throws on the first disagreement; returns
 * the figures the checks were made on, for the tests and for the record of the build.
 *
 * 1. Step 1: the ion product of each chloride at the moment of mixing is over its solubility product; the acid
 *    holds more chloride than the ions take up; and the share of each ion that its solubility product leaves
 *    dissolved, at the chloride left in the tube, is under `completeWithinPercent`.
 * 2. Step 2: the water added holds all the lead chloride hot and not all of it cold.
 * 3. Step 3: the ion product of lead and chromate is over the solubility product of lead chromate, with the lead
 *    of hot water and with the lead of cold; and more chromate goes in than there is lead, so some is left over.
 * 4. Step 4: with all the silver chloride dissolved, the quotient of the silver-ammonia ion and chloride over the
 *    square of the free ammonia is under the product of the two constants, so all of it does dissolve.
 * 5. Step 5: one addition of nitric acid leaves ammonia over; the same number of additions, more than one and no
 *    more than the tube takes, makes the liquid acid whatever the sample holds; no addition lands on neutral; and
 *    while ammonia is left the quotient of check 4 is still under the constant, so no silver chloride has come back.
 */
export function checkBench(record) {
  const a = amountsOf(record)
  const constant = (id) => (record.equilibria.find((e) => e.id === id) ?? fail(`no equilibrium "${id}"`)).constant.value
  const product = { silver: constant('silver-chloride'), lead: constant('lead-chloride'), 'mercury-i': constant('mercury-i-chloride') }
  const chloridesEach = { silver: 1, lead: 2, 'mercury-i': 2 }
  const inAmmonia = constant('silver-chloride') * constant('silver-ammonia-ion')
  const chromateProduct = record.leadChromate.solubilityProduct.value
  const limit = record.parameters.completeWithinPercent.value
  const figures = { samples: [], water: null, additionsToAcid: null }

  // Step 2 is the same sum for every sample that holds lead.
  const coldHolds = Math.floor((a.leadChlorideColdPerMillilitre * a.waterMicrolitres) / 1000)
  const hotHolds = Math.floor((a.leadChlorideHotPerMillilitre * a.waterMicrolitres) / 1000)
  if (hotHolds < a.ionNanomoles) fail(`step 2: the hot water holds ${hotHolds} nmol of lead chloride, not all of the ${a.ionNanomoles} nmol there is`)
  if (coldHolds >= a.ionNanomoles) fail(`step 2: the cold water holds ${coldHolds} nmol of lead chloride, which is all of the ${a.ionNanomoles} nmol there is`)
  figures.water = { leadChloride: a.ionNanomoles, hotHolds, coldHolds, leftCold: a.ionNanomoles - coldHolds }

  const additions = new Set()
  for (const sample of SAMPLES) {
    const name = sample.join(' + ')
    const has = (ion) => sample.includes(ion)
    const row = { sample: name, step1: {}, step3: null, step4: null, step5: [] }

    // Step 1.
    const mixed = a.sampleMicrolitres + a.acidMicrolitres
    const taken = sample.reduce((sum, ion) => sum + chloridesEach[ion] * a.ionNanomoles, 0)
    if (taken >= a.chlorideNanomoles) fail(`step 1, ${name}: the acid holds ${a.chlorideNanomoles} nmol of chloride and the ions take up ${taken}`)
    const chlorideAtMixing = molar(a.chlorideNanomoles, mixed)
    const chlorideLeft = molar(a.chlorideNanomoles - taken, mixed)
    for (const ion of sample) {
      const n = chloridesEach[ion]
      const quotient = molar(a.ionNanomoles, mixed) * chlorideAtMixing ** n
      if (quotient <= product[ion]) fail(`step 1, ${name}: the ion product of ${ion} chloride, ${quotient.toExponential(2)}, is not over its solubility product, ${product[ion]}`)
      const leftPercent = (product[ion] / chlorideLeft ** n / molar(a.ionNanomoles, mixed)) * 100
      if (leftPercent >= limit) fail(`step 1, ${name}: the solubility product leaves ${leftPercent.toFixed(2)}% of the ${ion} dissolved, which is not under ${limit}%`)
      row.step1[ion] = { timesOver: quotient / product[ion], leftPercent }
    }

    // What the cold water leaves of the lead chloride when it is poured off unheated, and what it takes with it.
    for (const heated of [true, false]) {
      const leadInLiquid = has('lead') ? (heated ? a.ionNanomoles : coldHolds) : 0
      const leadLeft = has('lead') ? a.ionNanomoles - leadInLiquid : 0
      const how = `${name}, the water poured off ${heated ? 'hot' : 'cold'}`

      // Step 3.
      if (has('lead')) {
        const tested = a.waterMicrolitres + a.aceticAcidMicrolitres + a.chromateMicrolitres
        if (a.chromateNanomoles <= leadInLiquid) fail(`step 3, ${how}: ${a.chromateNanomoles} nmol of chromate is not more than the ${leadInLiquid} nmol of lead, so none would be left to colour the liquid`)
        const quotient = molar(leadInLiquid, tested) * molar(a.chromateNanomoles, tested)
        if (quotient <= chromateProduct) fail(`step 3, ${how}: the ion product of lead chromate, ${quotient.toExponential(2)}, is not over its solubility product, ${chromateProduct}`)
        if (heated) row.step3 = { timesOver: quotient / chromateProduct }
      }

      // Step 4: the ammonia that mercury(I) chloride and any lead chloride left behind use up, two molecules each.
      const used = 2 * ((has('mercury-i') ? a.ionNanomoles : 0) + leadLeft)
      const silver = has('silver') ? a.ionNanomoles : 0
      const free = a.ammoniaNanomoles - used - 2 * silver
      if (free <= 0) fail(`step 4, ${how}: no ammonia is left free`)
      const chloride = silver + (has('mercury-i') ? a.ionNanomoles : 0) + 2 * leadLeft
      if (silver > 0) {
        const quotient = (molar(silver, a.ammoniaMicrolitres) * molar(chloride, a.ammoniaMicrolitres)) / molar(free, a.ammoniaMicrolitres) ** 2
        if (quotient >= inAmmonia) fail(`step 4, ${how}: with all the silver chloride dissolved the quotient is ${quotient.toExponential(2)}, which is not under the constant, ${inAmmonia.toExponential(2)}`)
        if (heated) row.step4 = { timesUnder: inAmmonia / quotient }
      }

      // Step 5: the acid has to use up the free ammonia and the ammonia the silver holds.
      const toNeutralise = free + 2 * silver
      let needed = 0
      for (let k = 1; k <= a.nitricAcidAdditions; k++) {
        const acid = k * a.nitricAcidNanomoles
        if (acid === toNeutralise) fail(`step 5, ${how}: ${k} additions of acid land exactly on neutral`)
        if (acid > toNeutralise) {
          needed = k
          break
        }
        const freeNow = free - acid
        if (freeNow <= 0) fail(`step 5, ${how}: after ${k} additions the free ammonia is gone and the liquid is not yet acid`)
        if (silver > 0) {
          const volume = a.ammoniaMicrolitres + k * a.nitricAcidMicrolitres
          const quotient = (molar(silver, volume) * molar(chloride, volume)) / molar(freeNow, volume) ** 2
          if (quotient >= inAmmonia) fail(`step 5, ${how}: after ${k} additions the liquid is still basic and the quotient is ${quotient.toExponential(2)}, not under the constant, ${inAmmonia.toExponential(2)}: silver chloride would be back before the liquid is acid`)
          if (heated) row.step5.push({ additions: k, timesUnder: inAmmonia / quotient })
        }
      }
      if (needed === 0) fail(`step 5, ${how}: ${a.nitricAcidAdditions} additions of acid do not make the liquid acid`)
      additions.add(needed)
    }
    figures.samples.push(row)
  }
  if (additions.size !== 1) fail(`step 5: the additions of acid that make the liquid acid are not the same for every sample: ${[...additions].sort().join(', ')}`)
  const [needed] = [...additions]
  if (needed < 2) fail('step 5: one addition of acid makes the liquid acid, so nothing is learned from testing it')
  figures.additionsToAcid = needed
  return figures
}
