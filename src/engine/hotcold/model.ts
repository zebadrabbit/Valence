import { runOf, SALT_IDS, saltOf, type HotcoldData, type SaltId } from '@/chem-data/hotcold/data'
import type { CalorimetryModel } from '../calorimetry/model'

/** What the engine holds of one salt: all whole numbers. */
export interface SaltModel {
  /** J for each mole dissolved; positive where heat is taken in. */
  solutionJ: number
  /** g/mol x 1000. */
  molarMassE3: number
  /** The mass weighed out for a run, in hundredths of a gram: from, to. */
  rangeCg: readonly [number, number]
}

/**
 * The plain numbers the endothermic and exothermic engine runs on, all whole: every engine function takes one as
 * an argument, so a test can vary a value. Temperatures are in tenths of a degree, masses in hundredths of a gram,
 * volumes in tenths of a millilitre, heats in joules, shares in parts per million.
 */
export interface HotcoldModel {
  // cited values, and values worked out from cited ones
  /** J/(g·°C) x 100: water's, used for each salt's solution too (spec 26.3). */
  specificHeatE2: number
  /** g/mL x 100: water's. */
  densityE2: number
  salts: Record<SaltId, SaltModel>
  // the set-up
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
  leastChangeTenths: number
  highestTemperatureTenths: number
  readingToleranceTenths: number
}

/** The engine's numbers, from the stored record. */
export function modelFrom(data: HotcoldData): HotcoldModel {
  const { parameters: p, water } = data
  const ranges: Record<SaltId, readonly [number, number]> = { 'epsom-salt': p.epsomSaltRangeCg.value, 'calcium-chloride': p.calciumChlorideRangeCg.value }
  const volumes = SALT_IDS.map((salt) => {
    const amount = runOf(data, salt).amounts.find((a) => a.reagentId === 'water')
    if (!amount || !('value' in amount)) throw new Error(`no measured water for "${salt}"`)
    return Math.round(amount.value * 10)
  })
  if (new Set(volumes).size !== 1) throw new Error('the record does not hold the set-up of spec 26.1: each salt goes into the same water')
  const salt = (id: SaltId): SaltModel => ({ solutionJ: Math.round(runOf(data, id).enthalpy.value * 1000), molarMassE3: Math.round(saltOf(data, id).molarMass.value * 1000), rangeCg: ranges[id] })
  return {
    specificHeatE2: Math.round(water.specificHeat.value * 100),
    densityE2: Math.round(water.density.value * 100),
    salts: { 'epsom-salt': salt('epsom-salt'), 'calcium-chloride': salt('calcium-chloride') },
    waterTenthMl: volumes[0]!,
    stepSeconds: p.loggerStepSeconds.value,
    runOnSteps: p.runOnSteps.value,
    maxSteps: p.loggerMaxSteps.value,
    mixStirredPpm: p.mixStirredPpm.value,
    mixStillPpm: p.mixStillPpm.value,
    lossLidOnPpm: p.lossLidOnPpm.value,
    lossLidOffPpm: p.lossLidOffPpm.value,
    startRangeTenths: p.startRangeTenths.value,
    leastChangeTenths: p.leastChangeTenths.value,
    highestTemperatureTenths: p.highestTemperatureTenths.value,
    readingToleranceTenths: p.readingToleranceTenths.value,
  }
}

/**
 * The calorimetry lab's model with one of this lab's salts in the place of its ammonium nitrate: what that lab's
 * cup (../calorimetry/cup.ts) is stepped with, as its part 2, a salt dissolving. That cup reads only the water,
 * the salt and the four shares of mixing and of loss; everything else it is handed here is nothing.
 */
export function cupModel(m: HotcoldModel, salt: SaltId): CalorimetryModel {
  const { solutionJ, molarMassE3, rangeCg } = m.salts[salt]
  return {
    specificHeatE2: m.specificHeatE2,
    densityE2: m.densityE2,
    neutralisationJ: 0,
    solutionJ,
    saltMolarMassE3: molarMassE3,
    candidates: [],
    acidTenthMl: 0,
    baseTenthMl: 0,
    molarityE2: 0,
    waterTenthMl: m.waterTenthMl,
    stepSeconds: m.stepSeconds,
    runOnSteps: m.runOnSteps,
    maxSteps: m.maxSteps,
    mixStirredPpm: m.mixStirredPpm,
    mixStillPpm: m.mixStillPpm,
    lossLidOnPpm: m.lossLidOnPpm,
    lossLidOffPpm: m.lossLidOffPpm,
    startRangeTenths: m.startRangeTenths,
    saltRangeCg: rangeCg,
    metalRangeCg: [0, 0],
    bathRangeTenths: [0, 0],
    readingToleranceTenths: m.readingToleranceTenths,
    tolerancePercent: 0,
  }
}
