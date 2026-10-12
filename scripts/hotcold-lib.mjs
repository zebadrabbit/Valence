// The checks the build makes on the endothermic and exothermic lab's record (docs/research/hotcold/hotcold.json)
// that no other lab's record needs: its molar masses against the atomic weights the periodic table holds, the sums
// its enthalpies are, which way each salt's heat goes, that each row of the tables is the one nearest the strength
// on the bench, that every portion dissolves, and that the change in temperature is one a logger can read and a
// cup of water can stand (spec 26.3 and 26.5). The record's other checks are the aqueous lab's (aqueous-lib.mjs):
// the manifest's rows, the merge of the salts' hazards and the list of sources. build-chem-data.mjs runs them;
// src/chem-data/hotcold/build.test.ts tests them on inputs they must refuse. Nothing is fetched here.

import { checkWorkedOut as checkSums } from './calorimetry-lib.mjs'

/** The elements a salt of this bench is made of, as a working names them. */
const NAMES = { H: 'hydrogen', O: 'oxygen', Mg: 'magnesium', S: 'sulfur', Cl: 'chlorine', Ca: 'calcium' }

const weightOf = (record, symbol) => record.atomicWeights.find((w) => w.id === symbol)
const massOf = (record, composition) => Object.entries(composition).reduce((sum, [symbol, count]) => sum + count * weightOf(record, symbol).value, 0)
/** The two parts that are runs of a salt, each with its salt and the range its mass is drawn from, in grams. */
const runsOf = (record) =>
  record.parts
    .filter((part) => part.reagentId !== undefined)
    .map((part) => ({ part, salt: record.reagents.find((r) => r.id === part.reagentId), grams: (part.id === 'epsom-salt' ? record.parameters.epsomSaltRangeCg : record.parameters.calciumChlorideRangeCg).value.map((cg) => cg / 100) }))
const waterGrams = (record, part) => part.amounts.find((a) => a.reagentId === 'water').value * record.water.density.value

/**
 * Throws unless every atomic weight is the periodic table's (which the build holds to the kept table of atomic
 * weights) and is used, and every molar mass is the sum of its atoms' weights to two decimals, with each figure
 * and each element shown in the working. A salt's waters of crystal are what its composition holds over the salt itself.
 */
export function checkMolarMasses(record, periodicTable) {
  for (const weight of record.atomicWeights) {
    const where = `atomicWeights[${weight.id}]`
    const element = periodicTable.find((e) => e.symbol === weight.id)
    if (!element || !(weight.id in NAMES)) throw new Error(`${where}: no such element in the periodic table`)
    if (element.atomicMass.published !== weight.published || element.atomicMass.sourceId !== weight.sourceId || element.atomicMass.value !== weight.value) {
      throw new Error(`${where}: the periodic table gives ${weight.id} the atomic weight ${element.atomicMass.published} from "${element.atomicMass.sourceId}", not the stored ${weight.published}`)
    }
    if (!record.reagents.some((r) => weight.id in r.composition)) throw new Error(`${where}: no salt holds ${weight.id}`)
  }
  for (const reagent of record.reagents) {
    const where = `reagents[${reagent.id}].molarMass`
    for (const symbol of Object.keys(reagent.composition)) if (!weightOf(record, symbol)) throw new Error(`${where}: no atomic weight for ${symbol}`)
    const sum = massOf(record, reagent.composition)
    if (Number(sum.toFixed(2)) !== reagent.molarMass.value) throw new Error(`${where}: ${reagent.molarMass.value} is not the sum of its atoms' weights to two decimals, ${sum.toFixed(3)}`)
    const figures = [...Object.keys(reagent.composition).map((symbol) => weightOf(record, symbol).published), sum.toFixed(3), reagent.molarMass.value.toFixed(2)]
    for (const figure of figures) if (!reagent.molarMass.working.includes(figure)) throw new Error(`${where}: the working does not show ${figure}`)
    for (const symbol of Object.keys(reagent.composition)) if (!reagent.molarMass.working.includes(NAMES[symbol])) throw new Error(`${where}: the working does not name ${NAMES[symbol]}`)
    const waters = reagent.watersOfCrystal
    if ((reagent.composition.H ?? 0) !== 2 * waters || (waters > 0 && (reagent.composition.O ?? 0) < waters)) throw new Error(`reagents[${reagent.id}].watersOfCrystal: ${waters} waters are not in its composition`)
  }
}

/**
 * Throws unless every enthalpy the record works out is the sum of its terms, with each figure shown in its
 * working: each salt's at the bench's strength and at endless dilution, and the dry magnesium sulfate's that the
 * note gives. The sums are the calorimetry lab's check, handed this lab's.
 */
export function checkWorkedOut(record) {
  const sums = record.parts.flatMap((part) => [...(part.enthalpy ? [{ id: part.id, enthalpy: part.enthalpy }] : []), ...(part.dry ? [{ id: `${part.id}.dry`, enthalpy: part.dry }] : [])])
  if (sums.length !== 3) throw new Error('parts: expected the enthalpy of each salt and the dry magnesium sulfate\'s')
  checkSums({ reagents: [], parts: sums })
}

/**
 * Throws unless the heat goes the way the lab is built on (spec 26.1 and 26.3): Epsom salt takes heat in, calcium
 * chloride gives it out, and magnesium sulfate with no water in its crystal gives it out, at the bench's strength
 * and at endless dilution alike.
 */
export function checkDirections(record) {
  const [epsom, calcium] = record.parts
  const sign = (worked, positive, what) => {
    for (const [name, value] of [['at the strength on the bench', worked.value], ['at endless dilution', worked.infiniteDilution.value]]) {
      if (value > 0 !== positive || value === 0) throw new Error(`${what}: ${value} kJ/mol ${name} is not heat ${positive ? 'taken in' : 'given out'}`)
    }
  }
  sign(epsom.enthalpy, true, 'parts[epsom-salt].enthalpy')
  sign(epsom.dry, false, 'parts[epsom-salt].dry')
  sign(calcium.enthalpy, false, 'parts[calcium-chloride].enthalpy')
}

/** The moles of water for each mole of salt in a cup that holds `grams` of the salt: the water measured out, and the salt's own waters of crystal. */
export function molesOfWater(record, part, salt, grams) {
  const water = waterGrams(record, part) / massOf(record, { H: 2, O: 1 })
  return water / (grams / salt.molarMass.value) + salt.watersOfCrystal
}

/**
 * Throws unless the row of the tables each enthalpy is worked from is the nearest to the strength on the bench at
 * both ends of the range of masses: nearer than the row printed under it and the row printed over it. The term of
 * the dissolved salt must name that row.
 */
export function checkDilution(record) {
  for (const { part, salt, grams } of runsOf(record)) {
    const where = `parts[${part.id}].dilution`
    const { row, lower, upper } = part.dilution
    if (!(lower < row && row < upper)) throw new Error(`${where}: the rows are not in order`)
    for (const mass of grams) {
      const ratio = molesOfWater(record, part, salt, mass)
      if (Math.abs(ratio - row) >= Math.abs(ratio - lower) || Math.abs(ratio - row) >= Math.abs(ratio - upper)) throw new Error(`${where}: ${mass.toFixed(2)} g is one mole in ${ratio.toFixed(1)} moles of water, which is not nearest the row for ${row}`)
    }
    for (const worked of [part.enthalpy, ...(part.dry ? [part.dry] : [])]) {
      if (!worked.terms.some((term) => term.coefficient === 1 && term.label.endsWith(` in ${row} H₂O`))) throw new Error(`${where}: no term is the dissolved salt in ${row} H₂O`)
    }
  }
}

/** Throws unless the most of each salt a run weighs out, for each litre of the water it goes into, is under half the solubility its source prints. */
export function checkDissolves(record) {
  for (const { part, salt, grams } of runsOf(record)) {
    const litres = part.amounts.find((a) => a.reagentId === 'water').value / 1000
    const perLitre = Math.max(...grams) / litres
    if (salt.solubility.unit !== 'g/L') throw new Error(`reagents[${salt.id}].solubility: expected grams for each litre`)
    if (perLitre * 2 >= salt.solubility.value) throw new Error(`reagents[${salt.id}].solubility: ${Math.max(...grams).toFixed(2)} g in ${litres * 1000} mL is ${perLitre.toFixed(0)} g/L, which is not under half of ${salt.solubility.value} g/L`)
    if (!salt.solubility.note.includes(`${perLitre.toFixed(0)} g`) || !salt.solubility.note.includes(Math.max(...grams).toFixed(2))) throw new Error(`reagents[${salt.id}].solubility: the note does not show ${Math.max(...grams).toFixed(2)} g and ${perLitre.toFixed(0)} g`)
  }
}

/** The change in temperature a cup would show with no heat traded with the room, in degrees: negative for a fall. The engine's relation, in ordinary arithmetic. */
export function fullChange(record, part, salt, grams) {
  const joules = -(grams / salt.molarMass.value) * part.enthalpy.value * 1000
  return joules / ((waterGrams(record, part) + grams) * record.water.specificHeat.value)
}

/**
 * Throws unless, at both ends of each range of masses, the change with no heat lost is at least the least a
 * logger is to show and takes no cup past the highest temperature a cup of this lab may reach (spec 26.5). The
 * engine's own readings, which lose a little to the room, are held to the same two figures over seeds 1 to 100 by
 * a test.
 */
export function checkChange(record) {
  const least = record.parameters.leastChangeTenths.value / 10
  const highest = record.parameters.highestTemperatureTenths.value / 10
  const warmest = record.parameters.startRangeTenths.value[1] / 10
  for (const { part, salt, grams } of runsOf(record)) {
    for (const mass of grams) {
      const change = fullChange(record, part, salt, mass)
      if (Math.abs(change) < least + 0.3) throw new Error(`parts[${part.id}]: ${mass.toFixed(2)} g changes the cup by ${change.toFixed(2)} °C, too little to read plainly`)
      if (warmest + change > highest) throw new Error(`parts[${part.id}]: ${mass.toFixed(2)} g takes a cup that starts at ${warmest.toFixed(1)} °C to ${(warmest + change).toFixed(1)} °C, over ${highest.toFixed(1)} °C`)
    }
  }
}
