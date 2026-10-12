// The checks the build makes on the freezing point depression lab's record (docs/research/freezing/freezing.json)
// that no other lab's record needs: the molar masses it works out from the atomic weights the periodic table
// keeps; what it works out from each measured freezing point; and the numbers of spec 23.3 and 23.6, each by
// number: that the three liquids are far enough apart to tell at the figures the instruments give, that ice is
// left in a careful run at every seeded amount, and that every fall keeps three significant figures. For the
// last three the cup of src/engine/freezing/cup.ts is stepped here too, on the same whole numbers;
// src/chem-data/freezing/build.test.ts holds the two to one another, reading for reading. The record's other
// checks are the aqueous lab's (aqueous-lib.mjs): the manifest's rows, the merge of the reagents' hazards and the
// list of sources. build-chem-data.mjs runs them. Nothing is fetched here.

/** A number to so many significant figures. */
export const toFigures = (value, figures = 3) => Number(value.toPrecision(figures))

const NAMES = { H: 'hydrogen', C: 'carbon', N: 'nitrogen', O: 'oxygen', Na: 'sodium', Cl: 'chlorine', K: 'potassium', Br: 'bromine' }

/** The molar mass a composition gives with the record's atomic weights, unrounded. */
export function sumOf(record, composition) {
  return Object.entries(composition).reduce((sum, [symbol, count]) => {
    const weight = record.atomicWeights.find((w) => w.id === symbol)
    if (!weight) throw new Error(`atomicWeights: no "${symbol}"`)
    return sum + count * weight.value
  }, 0)
}

/**
 * Throws unless every atomic weight is the one the periodic table's record holds for its symbol (which the build
 * holds to the kept table of atomic weights), from the same source; every weight is used; and every reagent's
 * molar mass is the sum its composition gives, to two decimals, with each weight and the result in the working.
 */
export function checkMolarMasses(record, periodicTable) {
  for (const weight of record.atomicWeights) {
    const where = `atomicWeights[${weight.id}]`
    const element = periodicTable.find((e) => e.symbol === weight.id)
    if (!element || !(weight.id in NAMES)) throw new Error(`${where}: no such element in the periodic table`)
    if (element.atomicMass.published !== weight.published || element.atomicMass.sourceId !== weight.sourceId || element.atomicMass.value !== weight.value) {
      throw new Error(`${where}: the periodic table gives ${weight.id} the atomic weight ${element.atomicMass.published} from "${element.atomicMass.sourceId}", not the stored ${weight.published}`)
    }
    if (!record.reagents.some((r) => weight.id in r.composition)) throw new Error(`${where}: no reagent holds ${weight.id}`)
  }
  for (const reagent of record.reagents) {
    const where = `reagents[${reagent.id}].molarMass`
    const sum = sumOf(record, reagent.composition)
    if (Number(sum.toFixed(2)) !== reagent.molarMass.value) throw new Error(`${where}: ${reagent.molarMass.value} is not the sum of its atoms' weights to two decimals, ${sum.toFixed(3)}`)
    const figures = [...Object.keys(reagent.composition).map((symbol) => record.atomicWeights.find((w) => w.id === symbol).published), sum.toFixed(3), reagent.molarMass.value.toFixed(2)]
    for (const figure of figures) if (!reagent.molarMass.working.includes(figure)) throw new Error(`${where}: the working does not show ${figure}`)
    for (const symbol of Object.keys(reagent.composition)) if (!reagent.molarMass.working.includes(NAMES[symbol])) throw new Error(`${where}: the working does not name ${NAMES[symbol]}`)
  }
}

/**
 * What a measured freezing point gives: the molality of a solution of so many percent by mass, the fall that
 * molality would give with one particle for each formula unit, and the ratio of the fall the source prints to it.
 */
export function worked(record, row) {
  const reagent = record.reagents.find((r) => r.id === row.reagentId)
  if (!reagent) throw new Error(`measured[${row.id}]: no reagent "${row.reagentId}"`)
  const molality = (row.massPercent.value / (100 - row.massPercent.value)) * 1000 / reagent.molarMass.value
  const idealFall = record.water.freezingPointConstant.value * molality
  return { molality, idealFall, ratio: -row.freezingPoint.value / idealFall, perIon: idealFall * reagent.particles.ideal }
}

/**
 * Throws unless every row of measured freezing points is worked out as stored (the molality and the fall of one
 * particle to three significant figures, the ratio to the figures the source prints for the freezing point, with
 * the figures used in the working), and every reagent's count of particles is what its record says it is: the
 * ideal, a whole number; or the ratio of the row it names, at three figures.
 */
export function checkMeasured(record) {
  for (const row of record.measured) {
    const where = `measured[${row.id}]`
    const { molality, idealFall, ratio } = worked(record, row)
    const figures = row.freezingPoint.published.replace(/^-|\./g, '').replace(/^0+/, '').length
    if (row.ratio.figures !== figures) throw new Error(`${where}.ratio: the source prints the freezing point to ${figures} figures, not ${row.ratio.figures}`)
    for (const [name, value, to] of [['molality', molality, 3], ['idealFall', idealFall, 3], ['ratio', ratio, figures]]) {
      if (toFigures(value, to) !== row[name].value) throw new Error(`${where}.${name}: ${row[name].value} is not ${toFigures(value, to)}, which the printed figures give`)
    }
    for (const figure of [row.massPercent.published, row.freezingPoint.published.replace('-', ''), record.water.freezingPointConstant.published, String(row.molality.value), String(row.idealFall.value)]) {
      if (!row.working.includes(figure)) throw new Error(`${where}: the working does not show ${figure}`)
    }
  }
  for (const reagent of record.reagents) {
    const where = `reagents[${reagent.id}].particles`
    const { particles } = reagent
    if (!Number.isInteger(particles.ideal) || particles.ideal < 1) throw new Error(`${where}: the ideal count is a whole number of particles`)
    if (particles.kind === 'ideal') {
      if (particles.value !== particles.ideal || particles.measuredId !== undefined) throw new Error(`${where}: a count marked as the ideal is the ideal count, and names no measured row`)
      continue
    }
    const row = record.measured.find((r) => r.id === particles.measuredId && r.reagentId === reagent.id)
    if (!row) throw new Error(`${where}: no measured row "${particles.measuredId}" of this reagent`)
    if (row.ratio.figures !== 3 || row.ratio.value !== particles.value) throw new Error(`${where}: ${particles.value} is not the ratio of the row "${row.id}" at three figures, ${row.ratio.value}`)
  }
}

// ---------------------------------------------------------------------------
// The cup, stepped as the engine steps it (src/engine/freezing/cup.ts says what each line is).

/** The model's whole numbers, from the record. */
export function numbersOf(record) {
  const p = Object.fromEntries(Object.entries(record.parameters).map(([key, parameter]) => [key, parameter.value]))
  const e2 = (value) => Math.round(value * 100)
  const solute = (id) => {
    const reagent = record.reagents.find((r) => r.id === id)
    return { id, molarMassE2: e2(reagent.molarMass.value), particlesE2: e2(reagent.particles.value) }
  }
  const [, unknown, particles] = record.parts
  return { ...p, kfE2: e2(record.water.freezingPointConstant.value), liquids: unknown.candidateIds.map(solute), solutes: particles.soluteIds.map(solute) }
}

const during = (from, step) => from !== null && from < step

/** The freezing point of what is dissolved, in millionths of a degree under that of water. */
export const targetMicro = (m, solute, waterMg) => -Math.round((m.kfE2 * solute.particlesE2 * solute.cg * 1e8) / (solute.molarMassE2 * waterMg))

/**
 * The cup at every step from 0 to `timeline.steps`: the liquid water and the ice in milligrams, the temperature in
 * millionths of a degree from the freezing point of water, and whether it has levelled. `solute` is
 * `{ cg, molarMassE2, particlesE2 }` or null; `timeline` is `{ lidFrom, stirFrom, addedAt, steps }`.
 */
export function cupStates(m, setup, solute, timeline) {
  let water = setup.waterCg * 10
  let ice = m.iceCg * 10
  let micro = setup.startHundredths * 1e4
  const out = []
  for (let step = 0; step <= timeline.steps; step++) {
    const dissolved = solute !== null && timeline.addedAt !== null && step > timeline.addedAt
    if (step > 0) {
      const lid = during(timeline.lidFrom, step)
      if (ice > 0) {
        const leak = Math.min(ice, lid ? m.leakLidOnMg : m.leakLidOffMg)
        ice -= leak
        water += leak
      }
      if (ice > 0) {
        const target = dissolved ? targetMicro(m, solute, water) : 0
        const given = Math.round(((target - micro) * (during(timeline.stirFrom, step) ? m.mixStirredPpm : m.mixStillPpm)) / 1e6)
        micro += given
        if (given < 0) {
          const melt = Math.min(ice, Math.round((water * -given) / (m.meltGramDegreesPerGram * 1e6)))
          ice -= melt
          water += melt
        }
      } else {
        micro += Math.round(((m.roomHundredths * 1e4 - micro) * (lid ? m.warmLidOnPpm : m.warmLidOffPpm)) / 1e6)
      }
    }
    const target = dissolved ? targetMicro(m, solute, water) : 0
    out.push({ waterMg: water, iceMg: ice, micro, level: ice > 0 && Math.abs(micro - target) <= m.levelBandMicrodegrees })
  }
  return out
}

/** What the logger shows for a state of the cup, in hundredths of a degree, on a probe that is so many hundredths off. */
export const readingOf = (state, probeHundredths) => Math.round((probeHundredths * 1e4 + state.micro) / 1e4)

/**
 * A careful run: the lid on and the stirrer going from the start; Run on until the cup has levelled; the solute;
 * Run on until it has levelled again, and `extra` presses more; strained and weighed. Returns the two readings,
 * the solution's mass on the balance, and the cup at the end and at the logger's last step.
 */
export function carefulRun(m, setup, solute, extra = 0) {
  const timeline = { lidFrom: 0, stirFrom: 0, addedAt: null, steps: 0 }
  let states = cupStates(m, setup, solute, timeline)
  const on = () => {
    timeline.steps += m.runOnSteps
    states = cupStates(m, setup, solute, timeline)
  }
  do on()
  while (!states.at(-1).level && timeline.steps + m.runOnSteps <= m.loggerMaxSteps)
  timeline.addedAt = timeline.steps
  const before = states.at(-1)
  do on()
  while (!states.at(-1).level && timeline.steps + m.runOnSteps <= m.loggerMaxSteps)
  for (let press = 0; press < extra; press++) on()
  const end = states.at(-1)
  const last = cupStates(m, setup, solute, { ...timeline, steps: m.loggerMaxSteps }).at(-1)
  return { steps: timeline.steps, addedAt: timeline.addedAt, levelled: before.level && end.level, fallHundredths: readingOf(before, 0) - readingOf(end, 0), solutionCg: Math.round(end.waterMg / 10) + solute.cg, iceLeftMg: end.iceMg, iceAtLastStepMg: last.iceMg }
}

const percent = (found, stored) => ((found - stored) / stored) * 100
const halfUnit = (value) => 50 / Number(value.toExponential(2).replace('.', '').slice(0, 3))

/** Every amount a range can seed, thinned to at most so many, both ends kept. */
function sample([low, high], most) {
  const step = Math.max(1, Math.ceil((high - low) / (most - 1)))
  const out = []
  for (let value = low; value < high; value += step) out.push(value)
  return [...out, high]
}

/**
 * The numbers of spec 23.6 for one solute over the seeded amounts: the smallest fall, the least ice left (at the
 * end of a careful run, and at the logger's last step with the lid on), the most presses a careful run takes, and
 * how far a careful learner can come out from the stored figure, in percent of it. That last is the result worked
 * on unrounded numbers, plus half a unit of the third figure of each entry that is rounded on the way: a bound on
 * every chain the rounding rule allows.
 */
export function numbersFor(m, solute, massRange, kind) {
  const out = { smallestFall: Infinity, largestFall: 0, leastIceMg: Infinity, leastIceAtLastStepMg: Infinity, mostSteps: 0, worstPercent: 0 }
  for (const startHundredths of sample(m.startRangeHundredths, 3)) {
    for (const waterCg of sample(m.waterRangeCg, 5)) {
      for (const cg of sample(massRange, 10)) {
        for (const extra of [0, 3]) {
          const run = carefulRun(m, { startHundredths, waterCg }, { ...solute, cg }, extra)
          if (!run.levelled) throw new Error(`a careful run of ${solute.id} does not level before the logger is full (${JSON.stringify({ startHundredths, waterCg, cg })})`)
          const fall = run.fallHundredths / 100
          const kg = (run.solutionCg - cg) / 1e5
          const grams = cg / 100
          const kf = m.kfE2 / 100
          let off
          if (kind === 'molar-mass') {
            const molality = fall / kf
            const moles = molality * kg
            off = Math.abs(percent(grams / moles, solute.molarMassE2 / 100)) + halfUnit(molality) + halfUnit(moles) + halfUnit(grams / moles)
          } else {
            const moles = grams / (solute.molarMassE2 / 100)
            const molality = moles / kg
            const ideal = kf * molality
            off = Math.abs(percent(fall / ideal, solute.particlesE2 / 100)) + halfUnit(moles) + halfUnit(molality) + halfUnit(ideal) + halfUnit(fall / ideal)
          }
          if (off > out.worstPercent) Object.assign(out, { worstPercent: off, worstAt: { startHundredths, waterCg, cg, extra, fall } })
          out.smallestFall = Math.min(out.smallestFall, fall)
          out.largestFall = Math.max(out.largestFall, fall)
          out.leastIceMg = Math.min(out.leastIceMg, run.iceLeftMg)
          out.leastIceAtLastStepMg = Math.min(out.leastIceAtLastStepMg, run.iceAtLastStepMg)
          out.mostSteps = Math.max(out.mostSteps, run.steps - m.runOnSteps * extra)
        }
      }
    }
  }
  return out
}

/**
 * Throws unless the record's numbers hold together as spec 23.3 and 23.6 ask, each by number:
 * - no two liquids are so near in molar mass that the tolerance on either side of one reaches the tolerance on
 *   either side of the other, so a molar mass within tolerance of one is nearest to it;
 * - a careful learner, with every entry rounded the least lucky way, is within the tolerance at every seeded
 *   amount, and within half of what parts the two nearest liquids;
 * - ice is left at the end of every careful run, and at the logger's last step where the lid is on;
 * - every fall is 1.00 °C or more, so it has three significant figures;
 * - a careful run levels, both times, within the logger's span.
 * Returns the numbers, for the record's README and the tests.
 */
export function checkNumbers(record) {
  const m = numbersOf(record)
  const inOrder = [...m.liquids].sort((a, b) => a.molarMassE2 - b.molarMassE2)
  const gaps = inOrder.slice(1).map((upper, i) => ({ lower: inOrder[i].id, upper: upper.id, percent: percent(upper.molarMassE2, inOrder[i].molarMassE2), halfPercent: (percent(upper.molarMassE2, inOrder[i].molarMassE2) / 2) }))
  for (const [i, gap] of gaps.entries()) {
    if (inOrder[i].molarMassE2 * (1000 + m.molarMassTolerancePerMille) >= inOrder[i + 1].molarMassE2 * (1000 - m.molarMassTolerancePerMille)) {
      throw new Error(`parts[unknown]: ${gap.lower} and ${gap.upper} are ${gap.percent.toFixed(2)}% apart in molar mass, too near to tell with a tolerance of ${m.molarMassTolerancePerMille / 10}% on each`)
    }
  }
  const nearest = gaps.reduce((a, b) => (a.percent <= b.percent ? a : b))
  const liquids = Object.fromEntries(m.liquids.map((liquid) => [liquid.id, numbersFor(m, liquid, m.unknownRangeCg, 'molar-mass')]))
  const ranges = { urea: m.ureaRangeCg, nacl: m.naclRangeCg, kcl: m.kclRangeCg, nabr: m.nabrRangeCg }
  const solutes = Object.fromEntries(m.solutes.map((solute) => {
    if (!(solute.id in ranges)) throw new Error(`parts[particles]: no seeded range for "${solute.id}"`)
    return [solute.id, numbersFor(m, solute, ranges[solute.id], 'particles')]
  }))
  for (const [id, numbers] of [...Object.entries(liquids).map((e) => [...e, m.molarMassTolerancePerMille]), ...Object.entries(solutes).map((e) => [...e, m.particlesTolerancePerMille])].map(([id, n, t]) => [id, { ...n, tolerance: t / 10 }])) {
    if (numbers.smallestFall < 1) throw new Error(`${id}: a fall of ${numbers.smallestFall} °C has fewer than three significant figures`)
    if (numbers.leastIceMg <= 0 || numbers.leastIceAtLastStepMg <= 0) throw new Error(`${id}: no ice is left in a careful run at some seeded amount`)
    if (numbers.worstPercent > numbers.tolerance) throw new Error(`${id}: a careful learner can be ${numbers.worstPercent.toFixed(2)}% out (${JSON.stringify(numbers.worstAt)}), outside the tolerance of ${numbers.tolerance}%`)
  }
  const worstLiquid = Math.max(...Object.values(liquids).map((n) => n.worstPercent))
  if (2 * worstLiquid >= nearest.percent) throw new Error(`parts[unknown]: the instruments tell molar masses ${(2 * worstLiquid).toFixed(2)}% apart, and ${nearest.lower} and ${nearest.upper} are only ${nearest.percent.toFixed(2)}% apart`)
  return { gaps, nearest, liquids, solutes }
}
