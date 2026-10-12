import type { HotcoldModel } from './model'

/**
 * The model as a literal, for tests only: the engine's expected values are pinned against these numbers, so a
 * change to the stored record cannot move them unseen. The app's model is built from the sourced record.
 */
export const PINNED_MODEL: HotcoldModel = {
  specificHeatE2: 418,
  densityE2: 100,
  salts: {
    'epsom-salt': { solutionJ: 17560, molarMassE3: 246470, rangeCg: [960, 1040] }, // MgSO4 in 75 H2O + 7 H2O(l) - MgSO4·7H2O(cr), kJ/mol x 1000
    'calcium-chloride': { solutionJ: -77689, molarMassE3: 110980, rangeCg: [380, 420] }, // CaCl2 in 75 H2O - CaCl2(cr)
  },
  waterTenthMl: 500,
  stepSeconds: 15,
  runOnSteps: 2,
  maxSteps: 240,
  mixStirredPpm: 850000,
  mixStillPpm: 150000,
  lossLidOnPpm: 5000,
  lossLidOffPpm: 40000,
  startRangeTenths: [200, 240],
  leastChangeTenths: 20,
  highestTemperatureTenths: 400,
  readingToleranceTenths: 0,
}
