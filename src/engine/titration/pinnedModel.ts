import type { TitrationModel } from './model'

/**
 * The model as a literal, for tests only: the engine's expected values are pinned against these numbers, so a
 * change to the stored record cannot move them unseen. The app's model is built from the sourced record.
 */
export const PINNED_MODEL: TitrationModel = {
  kw: 1e-14,
  indicatorPKas: [9.05, 9.5],
  indicatorMolarity: (10 * 0.5) / 318.3, // 0.5 g per 100 mL over the molar mass, 318.3 g/mol
  indicatorDropUl: 50,
  dissolvedCo2: 0.034 * 425.62e-6 * 1.01325, // Henry's constant, mol/(kg bar) x mole fraction in air x bar
  carbonicPKas: [6.35, 10.33],
  faintPinkConcentration: 1e-6,
  hclRangeE4: [850, 1050],
  naohRangeE5: [9500, 10500],
  pipetteNominalUl: 25000,
  pipetteOffsetUl: 30,
  fillLevelMaxUl: 2000,
  buretteCapacityUl: 50000,
  streamUl: 250,
  dropUl: 50,
  halfDropUl: 25,
  unconditionedStrengthPercent: 98,
  wetPipetteStrengthPercent: 98,
  tipBubbleUl: 600,
  tipBubbleEscapeUl: 5000,
  overshootUl: 100,
  slowDownUl: 1000,
  readingToleranceUl: 20,
  gradeTolerancePercent: 1,
  molarityRoundingE6: 50,
  waterStepUl: 10000,
  waterMaxUl: 30000,
  indicatorDrops: [2, 3],
  plumeSlowFrom: 0.1,
  plumeMixSeconds: 10,
  persistSeconds: 30,
  passesToComplete: 3,
}
