import { candidatesOf, type CalorimetryData } from '@/chem-data/calorimetry/data'

/**
 * The plain numbers the calorimetry engine runs on, all whole: every engine function takes one as an argument, so
 * a test can vary a value. Temperatures are in tenths of a degree, masses in hundredths of a gram, volumes in
 * tenths of a millilitre, heats in joules, shares in parts per million.
 */
export interface CalorimetryModel {
  // cited values, and values worked out from cited ones
  /** J/(g·°C) x 100: water's, used for every solution too (spec 16.3). */
  specificHeatE2: number
  /** g/mL x 100: water's, used for every solution too. */
  densityE2: number
  /** J for each mole of water formed; negative, since heat is given out. */
  neutralisationJ: number
  /** J for each mole dissolved; positive, since heat is taken in. */
  solutionJ: number
  /** g/mol x 1000. */
  saltMolarMassE3: number
  /** The metals the piece may be, each with its specific heat in J/(g·°C) x 1000. */
  candidates: readonly { id: string; specificHeatE3: number }[]
  // the set-up
  acidTenthMl: number
  baseTenthMl: number
  /** mol/L x 100, of the acid and of the base alike. */
  molarityE2: number
  /** The water of parts 2 and 3. */
  waterTenthMl: number
  // model parameters
  stepSeconds: number
  runOnSteps: number
  maxSteps: number
  mixStirredPpm: number
  mixStillPpm: number
  lossLidOnPpm: number
  lossLidOffPpm: number
  startRangeTenths: readonly [number, number]
  saltRangeCg: readonly [number, number]
  metalRangeCg: readonly [number, number]
  bathRangeTenths: readonly [number, number]
  readingToleranceTenths: number
  tolerancePercent: number
}

/** The engine's numbers, from the stored record. */
export function modelFrom(data: CalorimetryData): CalorimetryModel {
  const { parameters: p, water } = data
  const [neutralisation, dissolving, metal] = data.parts
  const volume = (amounts: (typeof neutralisation)['amounts'], reagentId: string) => {
    const amount = amounts.find((a) => a.reagentId === reagentId)
    if (!amount || !('value' in amount)) throw new Error(`no measured volume of "${reagentId}"`)
    return Math.round(amount.value * 10)
  }
  const reagent = (id: string) => data.reagents.find((r) => r.id === id)!
  const [acid, base] = neutralisation.amounts.map((a) => reagent(a.reagentId)) as [ReturnType<typeof reagent>, ReturnType<typeof reagent>]
  const salt = reagent(dissolving.amounts.find((a) => 'about' in a)!.reagentId)
  if (acid.form !== 'solution' || base.form !== 'solution' || acid.molarity !== base.molarity || salt.form !== 'solid') throw new Error('the record does not hold the set-up of spec 16.1')
  return {
    specificHeatE2: Math.round(water.specificHeat.value * 100),
    densityE2: Math.round(water.density.value * 100),
    neutralisationJ: Math.round(neutralisation.enthalpy.value * 1000),
    solutionJ: Math.round(dissolving.enthalpy.value * 1000),
    saltMolarMassE3: Math.round(salt.molarMass.value * 1000),
    candidates: candidatesOf(data).map((c) => ({ id: c.id, specificHeatE3: Math.round(c.specificHeat.value * 1000) })),
    acidTenthMl: volume(neutralisation.amounts, acid.id),
    baseTenthMl: volume(neutralisation.amounts, base.id),
    molarityE2: Math.round(acid.molarity * 100),
    waterTenthMl: volume(metal.amounts, 'water'),
    stepSeconds: p.loggerStepSeconds.value,
    runOnSteps: p.runOnSteps.value,
    maxSteps: p.loggerMaxSteps.value,
    mixStirredPpm: p.mixStirredPpm.value,
    mixStillPpm: p.mixStillPpm.value,
    lossLidOnPpm: p.lossLidOnPpm.value,
    lossLidOffPpm: p.lossLidOffPpm.value,
    startRangeTenths: p.startRangeTenths.value,
    saltRangeCg: p.saltRangeCg.value,
    metalRangeCg: p.metalRangeCg.value,
    bathRangeTenths: p.bathRangeTenths.value,
    readingToleranceTenths: p.readingToleranceTenths.value,
    tolerancePercent: p.tolerancePercent.value,
  }
}
