import type { FreezingModel } from './model'

/**
 * The model as a literal, for tests only: the engine's expected values are pinned against these numbers, so a
 * change to the stored record cannot move them unseen. The app's model is built from the sourced record.
 */
export const PINNED_MODEL: FreezingModel = {
  kfE2: 186,
  liquids: [
    { id: 'acetone', molarMassE2: 5808, particlesE2: 100, idealParticles: 1 },
    { id: 'ethanol', molarMassE2: 4607, particlesE2: 100, idealParticles: 1 },
    { id: 'propan-2-ol', molarMassE2: 6010, particlesE2: 100, idealParticles: 1 },
  ],
  solutes: [
    { id: 'urea', molarMassE2: 6006, particlesE2: 100, idealParticles: 1 },
    { id: 'nacl', molarMassE2: 5844, particlesE2: 182, idealParticles: 2 }, // measured: 1.79 °C at 3% by mass
    { id: 'kcl', molarMassE2: 7455, particlesE2: 200, idealParticles: 2 },
    { id: 'nabr', molarMassE2: 10289, particlesE2: 200, idealParticles: 2 },
  ],
  stepSeconds: 30,
  runOnSteps: 2,
  maxSteps: 60,
  mixStirredPpm: 700000,
  mixStillPpm: 20000,
  leakLidOnMg: 60,
  leakLidOffMg: 1000,
  meltGramDegreesPerGram: 80,
  warmLidOnPpm: 10000,
  warmLidOffPpm: 30000,
  roomHundredths: 2200,
  iceCg: 2500,
  iceLowCg: 500,
  levelBandMicro: 2000,
  startRangeHundredths: [200, 400],
  probeOffRangeHundredths: [5, 25],
  waterRangeCg: [9350, 9800],
  unknownRangeCg: [360, 450],
  soluteRangesCg: { urea: [525, 590], nacl: [266, 308], kcl: [339, 393], nabr: [467, 542] },
  molarMassTolerancePerMille: 15,
  particlesTolerancePerMille: 30,
}
