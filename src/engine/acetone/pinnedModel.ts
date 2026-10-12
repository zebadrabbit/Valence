import type { KineticsModel } from '../kinetics/model'

/**
 * The model as a literal, for tests only: the engine's expected values are pinned against these numbers, so a
 * change to the stored record cannot move them unseen. The app's model is built from the sourced record.
 */
export const PINNED_MODEL: KineticsModel = {
  solutions: [
    { id: 'acetone-4m', microMolar: 4000000 },
    { id: 'hcl-1m', microMolar: 1000000 },
    { id: 'iodine-0.005m', microMolar: 5000 },
    { id: 'water', microMolar: null },
  ],
  reactants: [
    { id: 'acetone', solutionId: 'acetone-4m', order: 1 },
    { id: 'hydrogen-ion', solutionId: 'hcl-1m', order: 1 },
    { id: 'iodine', solutionId: 'iodine-0.005m', order: 0 },
  ],
  end: { solutionId: 'iodine-0.005m', per: 1, indicatorId: null },
  rateConstant: 2.91e-5, // L/(mol·s) at 25 °C, as its source prints it: 2.91 with a power of ten of -5
  referenceCentiKelvin: 29815,
  activationJ: 86190, // 20.6 kcal/mol, as its source prints it, at 4.184 J to the calorie
  gasConstantE9: 8314462618,
  zeroCelsiusCentiKelvin: 27315,
  mixtures: [
    { id: 'mixture-1', tenthMl: { 'acetone-4m': 100, 'hcl-1m': 100, water: 200, 'iodine-0.005m': 100 } },
    { id: 'mixture-2', tenthMl: { 'acetone-4m': 200, 'hcl-1m': 100, water: 100, 'iodine-0.005m': 100 } },
    { id: 'mixture-3', tenthMl: { 'acetone-4m': 100, 'hcl-1m': 200, water: 100, 'iodine-0.005m': 100 } },
    { id: 'mixture-4', tenthMl: { 'acetone-4m': 100, 'hcl-1m': 100, water: 100, 'iodine-0.005m': 200 } },
  ],
  runs: [
    { id: 'mixture-1', mixtureId: 'mixture-1', bathId: null },
    { id: 'mixture-2', mixtureId: 'mixture-2', bathId: null },
    { id: 'mixture-3', mixtureId: 'mixture-3', bathId: null },
    { id: 'mixture-4', mixtureId: 'mixture-4', bathId: null },
  ],
  referenceRunId: 'mixture-1',
  orderRuns: { acetone: ['mixture-1', 'mixture-2'], 'hydrogen-ion': ['mixture-1', 'mixture-3'], iodine: ['mixture-1', 'mixture-4'] },
  baths: [],
  roomRangeTenths: [200, 240],
  orderChoices: [0, 1, 2],
  unitPowers: [0, -1, -2, -3, -4],
  scatterPerTenThousand: 100,
  delayLimitMs: 5000,
  watchLimitMs: 1800000,
  rateConstantTolerancePercent: 5,
  activationTolerancePercent: 0,
  places: { fromMicro: 0, stepMicro: 0, count: 0 },
}
