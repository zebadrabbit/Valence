import type { CalorimetryModel } from './model'

/**
 * The model as a literal, for tests only: the engine's expected values are pinned against these numbers, so a
 * change to the stored record cannot move them unseen. The app's model is built from the sourced record.
 */
export const PINNED_MODEL: CalorimetryModel = {
  specificHeatE2: 418,
  densityE2: 100,
  neutralisationJ: -57706, // NaCl in 100 H2O + H2O(l) - HCl in 50 H2O - NaOH in 50 H2O, kJ/mol x 1000
  solutionJ: 24405, // NH4NO3 in 50 H2O - NH4NO3(cr)
  saltMolarMassE3: 80044,
  candidates: [
    { id: 'aluminium-piece', specificHeatE3: 902 },
    { id: 'iron-piece', specificHeatE3: 449 },
    { id: 'zinc-piece', specificHeatE3: 388 },
    { id: 'tin-piece', specificHeatE3: 227 },
  ],
  acidTenthMl: 500,
  baseTenthMl: 500,
  molarityE2: 100,
  waterTenthMl: 500,
  stepSeconds: 15,
  runOnSteps: 2,
  maxSteps: 240,
  mixStirredPpm: 850000,
  mixStillPpm: 150000,
  lossLidOnPpm: 5000,
  lossLidOffPpm: 40000,
  startRangeTenths: [200, 240],
  saltRangeCg: [380, 420],
  metalRangeCg: [4800, 5200],
  bathRangeTenths: [990, 1000],
  readingToleranceTenths: 0,
  tolerancePercent: 5,
}
