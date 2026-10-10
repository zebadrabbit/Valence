import type { KineticsModel } from '../kinetics/model'

/**
 * The model as a literal, for tests only: the engine's expected values are pinned against these numbers, so a
 * change to the stored record cannot move them unseen. The app's model is built from the sourced record.
 */
export const PINNED_MODEL: KineticsModel = {
  solutions: [
    { id: 'ki-0.01m', microMolar: 10000 },
    { id: 'na2s2o3-0.001m', microMolar: 1000 },
    { id: 'kbro3-0.04m', microMolar: 40000 },
    { id: 'hcl-0.1m', microMolar: 100000 },
    { id: 'starch', microMolar: null },
    { id: 'water', microMolar: null },
  ],
  reactants: [
    { id: 'iodide', solutionId: 'ki-0.01m', order: 1 },
    { id: 'bromate', solutionId: 'kbro3-0.04m', order: 1 },
    { id: 'hydrogen-ion', solutionId: 'hcl-0.1m', order: 2 },
  ],
  end: { solutionId: 'na2s2o3-0.001m', per: 6, indicatorId: 'starch' },
  rateConstant: 50.26, // L³/(mol³·s) at 25 °C, as its source prints it
  referenceCentiKelvin: 29815,
  activationJ: 50000, // the lab's own figure
  gasConstantE9: 8314462618,
  zeroCelsiusCentiKelvin: 27315,
  mixtures: [
    { id: 'mixture-1', tenthMl: { 'ki-0.01m': 100, 'na2s2o3-0.001m': 100, water: 100, 'kbro3-0.04m': 100, 'hcl-0.1m': 100 } },
    { id: 'mixture-2', tenthMl: { 'ki-0.01m': 200, 'na2s2o3-0.001m': 100, water: 0, 'kbro3-0.04m': 100, 'hcl-0.1m': 100 } },
    { id: 'mixture-3', tenthMl: { 'ki-0.01m': 100, 'na2s2o3-0.001m': 100, water: 0, 'kbro3-0.04m': 200, 'hcl-0.1m': 100 } },
    { id: 'mixture-4', tenthMl: { 'ki-0.01m': 100, 'na2s2o3-0.001m': 100, water: 0, 'kbro3-0.04m': 100, 'hcl-0.1m': 200 } },
    { id: 'mixture-5', tenthMl: { 'ki-0.01m': 80, 'na2s2o3-0.001m': 100, water: 120, 'kbro3-0.04m': 50, 'hcl-0.1m': 150 } },
  ],
  runs: [
    { id: 'mixture-1', mixtureId: 'mixture-1', bathId: null },
    { id: 'mixture-2', mixtureId: 'mixture-2', bathId: null },
    { id: 'mixture-3', mixtureId: 'mixture-3', bathId: null },
    { id: 'mixture-4', mixtureId: 'mixture-4', bathId: null },
    { id: 'mixture-5', mixtureId: 'mixture-5', bathId: null },
    { id: 'bath-ice', mixtureId: 'mixture-1', bathId: 'ice' },
    { id: 'bath-cool', mixtureId: 'mixture-1', bathId: 'cool' },
    { id: 'bath-warm', mixtureId: 'mixture-1', bathId: 'warm' },
  ],
  referenceRunId: 'mixture-1',
  orderRuns: { iodide: ['mixture-1', 'mixture-2'], bromate: ['mixture-1', 'mixture-3'], 'hydrogen-ion': ['mixture-1', 'mixture-4'] },
  baths: [
    { id: 'ice', rangeTenths: [5, 20] },
    { id: 'cool', rangeTenths: [90, 110] },
    { id: 'warm', rangeTenths: [380, 420] },
  ],
  roomRangeTenths: [200, 240],
  orderChoices: [0, 1, 2],
  unitPowers: [0, -1, -2, -3, -4],
  scatterPerTenThousand: 100,
  delayLimitMs: 2000,
  watchLimitMs: 1800000,
  rateConstantTolerancePercent: 5,
  activationTolerancePercent: 5,
  places: { fromMicro: 3150, stepMicro: 50, count: 12 },
}
