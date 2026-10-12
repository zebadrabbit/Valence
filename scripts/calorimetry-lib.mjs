// The checks the build makes on the calorimetry lab's record (docs/research/calorimetry/calorimetry.json) that no
// other lab's record needs: the values it works out from cited ones, and its molar masses against the copies other
// labs keep. The record's other checks are the aqueous lab's (aqueous-lib.mjs): the manifest's rows, the merge of
// the reagents' hazards and the list of sources. build-chem-data.mjs runs them;
// src/chem-data/calorimetry/build.test.ts tests them on inputs they must refuse. Nothing is fetched here.

/** A sum of enthalpies of formation, each times its coefficient, to the three decimals the table prints. */
const sumOf = (terms) => Number(terms.reduce((sum, term) => sum + term.coefficient * term.enthalpyOfFormation.value, 0).toFixed(3))

/** A number to three significant figures. */
export const threeFigures = (value) => Number(value.toPrecision(3))

/**
 * Throws unless every value the record works out is what its cited values give: the specific heat of each metal is
 * its molar heat capacity over its molar mass, to three significant figures, with both figures in the working
 * shown; and each part's enthalpy, at the bench's strength and at endless dilution, is the sum of its terms.
 */
export function checkWorkedOut(record) {
  for (const reagent of record.reagents) {
    if (reagent.form !== 'metal') continue
    const where = `reagents[${reagent.id}].specificHeat`
    const { molarHeatCapacity: perMole, molarMass, specificHeat } = reagent
    if (threeFigures(perMole.value / molarMass.value) !== specificHeat.value) throw new Error(`${where}: ${specificHeat.value} is not ${perMole.value} ÷ ${molarMass.value} to three significant figures`)
    for (const figure of [perMole.published, molarMass.published, specificHeat.value.toFixed(3)]) {
      if (!specificHeat.working.includes(figure)) throw new Error(`${where}: the working does not show ${figure}`)
    }
  }
  for (const part of record.parts) {
    if (part.enthalpy === undefined) continue
    for (const [name, worked] of [['enthalpy', part.enthalpy], ['enthalpy.infiniteDilution', part.enthalpy.infiniteDilution]]) {
      const where = `parts[${part.id}].${name}`
      if (sumOf(worked.terms) !== worked.value) throw new Error(`${where}: ${worked.value} is not the sum of its terms, ${sumOf(worked.terms)}`)
      for (const term of worked.terms) {
        if (!worked.working.includes(term.enthalpyOfFormation.published.replace('-', ''))) throw new Error(`${where}: the working does not show ${term.enthalpyOfFormation.published}`)
      }
      if (!worked.working.includes(Math.abs(worked.value).toFixed(3))) throw new Error(`${where}: the working does not show its result`)
    }
  }
}

/**
 * Throws unless every molar mass is the figure a kept copy prints: a metal's the standard atomic weight the
 * periodic table's record holds for its symbol (which the build holds to the kept table of atomic weights), and a
 * compound's the molecular weight in PubChem's kept table for its CID. A reagent with a CID must have a row there.
 */
export function checkMolarMasses(record, periodicTable, properties) {
  const rows = properties.PropertyTable.Properties
  for (const reagent of record.reagents) {
    const where = `reagents[${reagent.id}]`
    if (reagent.form === 'metal') {
      const element = periodicTable.find((e) => e.symbol === reagent.formula)
      if (!element) throw new Error(`${where}: no element "${reagent.formula}" in the periodic table`)
      if (element.atomicMass.published !== reagent.molarMass.published || element.atomicMass.sourceId !== reagent.molarMass.sourceId) {
        throw new Error(`${where}: the periodic table gives ${reagent.formula} the atomic weight ${element.atomicMass.published} from "${element.atomicMass.sourceId}", not the stored ${reagent.molarMass.published}`)
      }
      continue
    }
    const row = rows.find((r) => r.CID === reagent.pubchemCid)
    if (!row) throw new Error(`${where}: PubChem's table has no row for CID ${reagent.pubchemCid}`)
    if (reagent.molarMass !== undefined && (reagent.molarMass.published !== row.MolecularWeight || Number(row.MolecularWeight) !== reagent.molarMass.value)) {
      throw new Error(`${where}: PubChem gives the molecular weight of CID ${reagent.pubchemCid} as ${row.MolecularWeight}, not the stored ${reagent.molarMass.published}`)
    }
  }
}

/**
 * The hazards of this lab's reagents as one file for the merge: its own (solid ammonium nitrate and the four
 * metals) with those of the bottles it shares with another lab, taken from that lab's file unchanged. Throws if a
 * shared bottle has an entry of this lab's own, or none in the other lab's file.
 */
export function withSharedHazards(own, other, sharedIds) {
  const shared = sharedIds.map((id) => {
    if (id in own) throw new Error(`hazards.json: "${id}" carries another lab's record and has no entry here`)
    if (!(id in other)) throw new Error(`the other lab's hazards.json has no entry for "${id}"`)
    return [id, other[id]]
  })
  return { ...Object.fromEntries(shared), ...own }
}

/** The documents behind those hazards: this lab's, then the other lab's that this lab's manifest does not list. */
export const withSharedSheets = (own, other) => [...own, ...other.filter((sheet) => !own.some((mine) => mine.id === sheet.id))]
