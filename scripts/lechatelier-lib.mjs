// The checks the build makes on the Le Chatelier's principle lab's record (docs/research/lechatelier/lechatelier.json)
// that no other lab's record needs: the values it works out from cited ones, and the checks of what each tube is
// stored as showing against what the stored numbers give at the bench's amounts, which spec 18.4 and 18.7 ask for.
// The two atomic weights are held to the periodic table's record by the Group I cations lab's check, and the
// record's other checks are the aqueous lab's (aqueous-lib.mjs): the manifest's rows, the merge of the reagents'
// hazards and the list of sources. build-chem-data.mjs runs them; src/chem-data/lechatelier/build.test.ts tests
// them on inputs they must refuse. Nothing is fetched here.

import { constantFrom, shownValue, threeFigures } from './cations-lib.mjs'

function fail(message) {
  throw new Error(message)
}

/** A whole number with a thin gap between its thousands, as the workings write it: 93 522. */
const spaced = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

const byId = (list, id, where) => list.find((item) => item.id === id) ?? fail(`${where}: no "${id}"`)

/** A sum of the table's figures, each times its coefficient, to the three decimals the table prints. */
const sumOf = (list, terms, key, where) => Number(terms.reduce((sum, term) => sum + term.coefficient * byId(list, term[key], where).value, 0).toFixed(3))

/**
 * Throws unless every value the record works out is what its cited values give: each constant's Gibbs energy is
 * the sum of its terms, and the constant follows from that energy, the gas constant and the temperature, to three
 * significant figures, and is shown as it is stored; each heat is the sum of its enthalpies; the molar mass of
 * lead chloride is the sum of its atomic weights; and each product at saturation is the lead of a saturated
 * solution times the square of its chloride, 4s³ for a solubility of s moles in a litre, to three significant
 * figures. Each working must show the figures it was made from.
 */
export function checkWorkedOut(record) {
  // The Group I cations lab's `constantFrom` reads the gas constant and the temperature, which this record names alike.
  for (const constant of record.equilibriumConstants) {
    const where = `equilibriumConstants[${constant.id}]`
    const sum = sumOf(record.gibbs, constant.terms, 'gibbsId', where)
    if (sum !== constant.gibbs.value) fail(`${where}.gibbs: ${constant.gibbs.value} is not the sum of its terms, ${sum}`)
    for (const term of constant.terms) {
      const figure = byId(record.gibbs, term.gibbsId, where).published.replace('-', '')
      if (!constant.gibbs.working.includes(figure)) fail(`${where}.gibbs: the working does not show ${figure}`)
    }
    if (!constant.gibbs.working.includes(Math.abs(sum).toFixed(3))) fail(`${where}.gibbs: the working does not show its result`)
    const value = threeFigures(constantFrom(record, sum))
    if (value !== constant.constant.value) fail(`${where}.constant: ${constant.constant.value} is not e^(−ΔG° ÷ RT) to three significant figures, ${value}`)
    if (shownValue(constant.constant.shown) !== constant.constant.value) fail(`${where}.constant: shown as "${constant.constant.shown}", which is not the stored ${constant.constant.value}`)
    for (const figure of [String(record.constants.gasConstant.value), String(record.parameters.temperatureKelvin.value), spaced(Math.round(Math.abs(sum) * 1000))]) {
      if (!constant.constant.working.includes(figure)) fail(`${where}.constant: the working does not show ${figure}`)
    }
  }
  for (const heat of record.heats) {
    const where = `heats[${heat.id}]`
    const sum = sumOf(record.enthalpies, heat.terms, 'enthalpyId', where)
    if (sum !== heat.enthalpy.value) fail(`${where}.enthalpy: ${heat.enthalpy.value} is not the sum of its terms, ${sum}`)
    for (const term of heat.terms) {
      const figure = byId(record.enthalpies, term.enthalpyId, where).published.replace('-', '')
      if (!heat.enthalpy.working.includes(figure)) fail(`${where}.enthalpy: the working does not show ${figure}`)
    }
    if (!heat.enthalpy.working.includes(Math.abs(sum).toFixed(3))) fail(`${where}.enthalpy: the working does not show its result`)
  }

  const lead = record.leadChloride
  const weight = (id) => lead.atomicWeights.find((w) => w.id === id) ?? fail(`leadChloride.atomicWeights: no "${id}"`)
  const molarMass = Number((weight('Pb').value + 2 * weight('Cl').value).toFixed(2))
  if (molarMass !== lead.molarMass.value) fail(`leadChloride.molarMass: ${lead.molarMass.value} is not ${weight('Pb').published} + 2 × ${weight('Cl').published}, ${molarMass}`)
  for (const figure of [weight('Pb').published, weight('Cl').published, molarMass.toFixed(2)]) {
    if (!lead.molarMass.working.includes(figure)) fail(`leadChloride.molarMass: the working does not show ${figure}`)
  }
  for (const [name, solubility] of [['saturationCold', lead.solubilityCold], ['saturationHot', lead.solubilityHot]]) {
    const molar = solubility.value / molarMass
    const product = threeFigures(4 * molar ** 3)
    if (product !== lead[name].value) fail(`leadChloride.${name}: ${lead[name].value} is not 4s³ for ${solubility.published} g/L ÷ ${molarMass.toFixed(2)} g/mol to three significant figures, ${product}`)
    if (shownValue(lead[name].shown) !== lead[name].value) fail(`leadChloride.${name}: shown as "${lead[name].shown}", which is not the stored ${lead[name].value}`)
    for (const figure of [solubility.published, molarMass.toFixed(2), molar.toFixed(5)]) {
      if (!lead[name].working.includes(figure)) fail(`leadChloride.${name}: the working does not show ${figure}`)
    }
  }
}

/** mol/L from nanomoles in microlitres. */
const molar = (nanomoles, microlitres) => nanomoles / microlitres / 1000

const EMPTY = { lead: 0, metal: 0, chloride: 0, acid: 0, base: 0, ammonia: 0 }

/**
 * Every tube of the bench at every stage, as whole numbers, from the record's parameters and the reagents'
 * strengths: volumes in microlitres and amounts in nanomoles. For each disturbance, in the systems' order: the
 * tube before it and after each of its portions. A tube counts what went into it: lead, the metal of the fourth
 * system, chloride, acid, base and ammonia. Whether anything has come out as a solid is not kept here; `checkBench`
 * works that out from these totals. A share of a tube holds the same share of each amount, to the whole nanomole.
 * The engine works the volumes and temperatures out for itself (src/engine/lechatelier/model.ts), and a test
 * holds the two to each other.
 */
export function stagesOf(record) {
  const value = (key, where) => (record.parameters[key] ?? fail(`${where}: no parameter "${key}"`)).value
  const microlitres = (drops) => drops * value('dropMicrolitres', 'parameters')
  const reagent = (id) => (id === 'water' ? { id, form: 'water' } : byId(record.reagents, id, 'reagents'))
  /** What a count of drops of a reagent adds to a tube. */
  function added(reagentId, drops) {
    const r = reagent(reagentId)
    const volume = microlitres(drops)
    const nanomoles = r.molarity === undefined ? 0 : Math.round(volume * r.molarity * 1000)
    const amounts = { ...EMPTY }
    if (r.id === 'pbno32-0.3m') amounts.lead = nanomoles
    else if (r.id === 'znno32-0.1m' || r.id === 'mgno32-0.1m') amounts.metal = nanomoles
    else if (r.formula === 'HCl') amounts.acid = amounts.chloride = nanomoles
    else if (r.id === 'naoh-6m') amounts.base = nanomoles
    else if (r.id === 'nh3-6m') amounts.ammonia = nanomoles
    return { volume, amounts }
  }
  const plus = (tube, { volume, amounts }) => ({ ...tube, microlitres: tube.microlitres + volume, temperature: 'room', ...Object.fromEntries(Object.keys(EMPTY).map((key) => [key, tube[key] + amounts[key]])) })

  const out = []
  for (const system of record.systems) {
    const tubes = {}
    for (const disturbance of system.disturbances) {
      const where = `systems[${system.id}].disturbances[${disturbance.id}]`
      const tubeRecord = byId(system.tubes, disturbance.tube, where)
      if (tubes[tubeRecord.id] === undefined) {
        if (tubeRecord.shareOf !== undefined) {
          const parent = tubes[tubeRecord.shareOf] ?? fail(`${where}: the tube "${tubeRecord.shareOf}" it takes a share of has not been made`)
          const share = microlitres(value('shareDrops', where))
          if (share * system.tubes.filter((t) => t.shareOf === tubeRecord.shareOf).length > parent.microlitres) fail(`${where}: the shares of the tube "${tubeRecord.shareOf}" are more than it holds`)
          tubes[tubeRecord.id] = { ...parent, microlitres: share, temperature: 'room', ...Object.fromEntries(Object.keys(EMPTY).map((key) => [key, Math.round((parent[key] * share) / parent.microlitres)])) }
        } else {
          tubes[tubeRecord.id] = tubeRecord.contents.reduce((tube, content) => (content.drops === undefined ? tube : plus(tube, added(content.reagentId, value(content.drops, where)))), { microlitres: 0, temperature: 'room', ...EMPTY })
        }
      }
      const before = tubes[tubeRecord.id]
      const { action } = disturbance
      const stages = []
      let tube = before
      if (action.kind === 'add') {
        const portions = action.portions === undefined ? 1 : value(action.portions, where)
        for (let portion = 0; portion < portions; portion++) stages.push((tube = plus(tube, added(action.reagentId, value(action.drops, where)))))
      } else {
        stages.push((tube = { ...tube, temperature: action.kind === 'heat' ? 'hot' : 'cold' }))
      }
      tubes[tubeRecord.id] = tube
      out.push({ systemId: system.id, disturbanceId: disturbance.id, tube: tubeRecord.id, before, stages })
    }
  }
  return out
}

/**
 * The checks of what each tube shows against the numbers (spec 18.4), at the bench's amounts. For every system
 * the record holds by numbers, and every stage of every one of its disturbances, this works out from the stored
 * numbers what the tube shows, and throws where the record stores anything else. No number decides from the edge:
 * each must be at least `clearOfEdge` times away from what it is compared with. Returns the figures the checks
 * were made on, for the tests and for the record of the build.
 *
 * 1. Lead chloride: a solid is there when the lead concentration times the square of the chloride concentration,
 *    everything taken as dissolved, is over the product at saturation: the cold one at room temperature and in the
 *    ice bath, the hot one in the boiling bath.
 * 2. Methyl violet: the hydrogen ion is the acid added less the base added, over the volume. With none left the
 *    indicator has its look in water; at the lower end of its range and below, its acid look; inside the range,
 *    the look between. Base left over, or acid left that puts the liquid above the range, is a state the lab has
 *    no look for.
 * 3. The hydroxides. With hydroxide short of what the metal can take up: a solid, if the ion product at mixing is
 *    over the solubility product and what that product leaves dissolved of the hydroxide is under
 *    `completeWithinPercent`. With acid over: no solid, if the ion product at the hydroxide an acid liquid can
 *    hold is under the solubility product. With hydroxide over: for a metal with a complex ion with hydroxide, no
 *    solid if, with all of the metal in that ion, the ion over the square of the free hydroxide is under the
 *    product of the two constants; for a metal with none, a solid. With ammonia: for a metal with a complex ion
 *    with ammonia, no solid if, with all of the metal in that ion and the hydroxide of the solid set free beside
 *    what ammonia itself makes, the quotient is under the product of the two constants; for a metal with none, a
 *    solid, if the ion product with all of it dissolved is over the solubility product.
 */
export function checkBench(record) {
  const clear = record.parameters.clearOfEdge.value
  if (!(clear > 1)) fail('parameters.clearOfEdge: the margin must be over 1')
  const constant = (id) => byId(record.equilibriumConstants, id, 'equilibriumConstants').constant.value
  const lead = record.leadChloride
  const { range, looks } = record.indicator
  const figures = []
  /** Over or under by the margin: 'over', 'under', or a stop at the edge. */
  const side = (where, what, quantity, threshold) => {
    const ratio = quantity / threshold
    if (ratio >= clear) return 'over'
    if (ratio <= 1 / clear) return 'under'
    return fail(`${where}: ${what} is ${quantity.toExponential(3)}, which is within ${clear} times of ${threshold.toExponential(3)}: too near the edge to decide`)
  }

  for (const { systemId, disturbanceId, tube, before, stages } of stagesOf(record)) {
    const system = byId(record.systems, systemId, 'systems')
    if (system.heldBy !== 'numbers') continue
    const disturbance = byId(system.disturbances, disturbanceId, `systems[${systemId}].disturbances`)
    const equilibrium = byId(record.equilibria, disturbance.equilibriumId, 'equilibria')
    const startLiquid = byId(system.tubes, system.tubes.find((t) => t.id === tube).shareOf ?? tube, 'tubes').shows.liquid
    if (disturbance.stages.length !== stages.length) fail(`systems[${systemId}].disturbances[${disturbanceId}]: ${disturbance.stages.length} stages are stored for ${stages.length} portions`)
    stages.forEach((stage, at) => {
      const where = `systems[${systemId}].disturbances[${disturbanceId}].stages[${at}]`
      const stored = disturbance.stages[at]
      const v = stage.microlitres
      let shows
      const figure = { disturbance: disturbanceId, stage: at }
      if (systemId === 'lead-chloride') {
        const product = molar(stage.lead, v) * molar(stage.chloride, v) ** 2
        const saturation = stage.temperature === 'hot' ? lead.saturationHot.value : lead.saturationCold.value
        const over = side(where, 'the product of the lead and the square of the chloride', product, saturation) === 'over'
        shows = { liquid: startLiquid, solid: over ? byId(record.substances, 'lead-chloride', 'substances').look.value : 'none' }
        Object.assign(figure, { product, saturation, times: over ? product / saturation : saturation / product, solid: over })
      } else if (systemId === 'methyl-violet') {
        const left = stage.acid - stage.base
        if (left < 0) fail(`${where}: base is left over, and the lab has no look for the indicator in base`)
        if (left === 0) {
          shows = { liquid: looks.noAcid.value, solid: 'none' }
          Object.assign(figure, { hydrogen: 0 })
        } else {
          const hydrogen = molar(left, v)
          const [yellowAt, rangeTop] = [10 ** -range.from.value, 10 ** -range.to.value]
          if (side(where, 'the hydrogen ion', hydrogen, rangeTop) === 'under') fail(`${where}: acid is left over and the liquid is above the indicator's range, which the lab has no look for`)
          const below = side(where, 'the hydrogen ion', hydrogen, yellowAt) === 'over'
          shows = { liquid: below ? looks.below.value : looks.within.value, solid: 'none' }
          Object.assign(figure, { hydrogen, times: below ? hydrogen / yellowAt : Math.min(yellowAt / hydrogen, hydrogen / rangeTop) })
        }
      } else if (systemId === 'hydroxides') {
        const numbers = equilibrium.numbers ?? fail(`equilibria[${equilibrium.id}]: no constants are named for the build's checks`)
        const ksp = constant(numbers.solubilityProduct)
        const look = byId(record.substances, equilibrium.id, 'substances').look.value
        const metal = molar(stage.metal, v)
        const net = stage.base - stage.acid
        let solid
        if (stage.ammonia > 0) {
          // Hydroxide went in before the ammonia and is all in the solid, two to each formula of it.
          if (net <= 0 || net > 2 * stage.metal) fail(`${where}: ammonia goes into a tube whose hydroxide is not all in the solid`)
          const fromSolid = molar(net, v)
          if (numbers.withAmmonia !== undefined) {
            const free = molar(stage.ammonia - 4 * stage.metal, v)
            if (free <= 0) fail(`${where}: the ammonia is not enough to hold all of the metal`)
            // What ammonia itself makes of hydroxide, beside what the solid sets free: y (fromSolid + y) = Kb [NH₃].
            const own = (-fromSolid + Math.sqrt(fromSolid ** 2 + 4 * constant('ammonia-as-base') * free)) / 2
            const quotient = (metal * (fromSolid + own) ** 2) / free ** 4
            const limit = ksp * constant(numbers.withAmmonia)
            solid = side(where, 'the quotient with all of the metal held by ammonia', quotient, limit) === 'over'
            Object.assign(figure, { ammonia: free, hydroxide: fromSolid + own, quotient, limit, times: solid ? quotient / limit : limit / quotient })
          } else {
            const product = metal * fromSolid ** 2
            solid = side(where, 'the ion product with all of the hydroxide dissolved', product, ksp) === 'over'
            // How much of the metal still dissolved the ammonia brings down: M²⁺ + 2NH₃ + 2H₂O ⇌ M(OH)₂ + 2NH₄⁺, by bisection.
            const dissolved = molar(stage.metal - net / 2, v)
            const ammonia = molar(stage.ammonia, v)
            const k = constant('ammonia-as-base') ** 2 / ksp
            let [low, high] = [0, dissolved]
            for (let i = 0; i < 200; i++) {
              const x = (low + high) / 2
              if ((2 * x) ** 2 / ((dissolved - x) * (ammonia - 2 * x) ** 2) < k) low = x
              else high = x
            }
            Object.assign(figure, { product, limit: ksp, times: product / ksp, comesDownPercent: dissolved === 0 ? 0 : (low / dissolved) * 100 })
          }
        } else if (net < 0) {
          const hydroxide = constant('water') / molar(-net, v)
          const product = metal * hydroxide ** 2
          solid = side(where, 'the ion product in the acid liquid', product, ksp) === 'over'
          Object.assign(figure, { product, limit: ksp, times: solid ? product / ksp : ksp / product })
        } else if (net <= 2 * stage.metal) {
          if (net === 0) fail(`${where}: the acid and the base cancel, and the lab has no look for that`)
          const product = metal * molar(net, v) ** 2
          solid = side(where, 'the ion product at mixing', product, ksp) === 'over'
          // With all of the hydroxide in the solid, what the solubility product leaves of it dissolved.
          const metalLeft = molar(stage.metal - net / 2, v)
          const leftPercent = metalLeft === 0 ? 100 : ((Math.sqrt(ksp / metalLeft) * v * 1000) / net) * 100
          if (solid && leftPercent >= record.parameters.completeWithinPercent.value) fail(`${where}: the solubility product leaves ${leftPercent.toFixed(2)}% of the hydroxide dissolved, which is not under ${record.parameters.completeWithinPercent.value}%`)
          Object.assign(figure, { product, limit: ksp, times: product / ksp, leftPercent })
        } else if (numbers.withHydroxide !== undefined) {
          const free = molar(net - 4 * stage.metal, v)
          if (free <= 0) fail(`${where}: the hydroxide is not enough to hold all of the metal`)
          const quotient = metal / free ** 2
          const limit = ksp * constant(numbers.withHydroxide)
          solid = side(where, 'the quotient with all of the metal held by hydroxide', quotient, limit) === 'over'
          Object.assign(figure, { hydroxide: free, quotient, limit, times: solid ? quotient / limit : limit / quotient })
        } else {
          const product = metal * molar(net, v) ** 2
          solid = side(where, 'the ion product', product, ksp) === 'over'
          Object.assign(figure, { product, limit: ksp, times: product / ksp })
        }
        shows = { liquid: startLiquid, solid: solid ? look : 'none' }
        figure.solid = solid
      } else {
        fail(`systems[${systemId}]: the build has no numbers for this system`)
      }
      if (stored.liquid !== shows.liquid || stored.solid !== shows.solid) {
        fail(`${where}: the record stores a ${stored.liquid} liquid and ${stored.solid === 'none' ? 'no solid' : `a ${stored.solid} solid`}, and the numbers give a ${shows.liquid} liquid and ${shows.solid === 'none' ? 'no solid' : `a ${shows.solid} solid`}`)
      }
      figures.push({ ...figure, before: before.microlitres, microlitres: v })
    })
  }
  return figures
}
