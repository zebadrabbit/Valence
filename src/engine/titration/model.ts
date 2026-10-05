/** The plain numbers the titration engine runs on. Every engine function takes one as an argument, so a test can vary a value. */
export interface TitrationModel {
  // cited constants
  kw: number
  indicatorPKas: readonly number[]
  /** mol/L of the indicator solution: 10 x grams per 100 mL / molar mass. */
  indicatorMolarity: number
  indicatorDropUl: number
  /** mol/L of dissolved CO2 in water at equilibrium with air: Henry's constant x mole fraction x pressure. */
  dissolvedCo2: number
  carbonicPKas: readonly number[]
  // model parameters
  faintPinkConcentration: number
  hclRangeE4: readonly [number, number]
  naohRangeE5: readonly [number, number]
  pipetteNominalUl: number
  pipetteOffsetUl: number
  fillLevelMaxUl: number
  buretteCapacityUl: number
  streamUl: number
  dropUl: number
  halfDropUl: number
  unconditionedStrengthPercent: number
  wetPipetteStrengthPercent: number
  tipBubbleUl: number
  tipBubbleEscapeUl: number
  overshootUl: number
  slowDownUl: number
  readingToleranceUl: number
  gradeTolerancePercent: number
  molarityRoundingE6: number
  waterStepUl: number
  waterMaxUl: number
  indicatorDrops: readonly [number, number]
  plumeSlowFrom: number
  plumeMixSeconds: number
  persistSeconds: number
  passesToComplete: number
}
