import type { TitrationData } from '@/chem-data/titration/data'

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

/**
 * The engine's numbers, from the stored record. The two concentrations are worked out here and stored nowhere.
 * The record's other parameters (the air pressure, used here, and two of the drawing) are not the engine's.
 */
export function modelFrom(data: TitrationData): TitrationModel {
  const { constants: c, parameters: p } = data
  return {
    kw: c.waterIonProduct.value,
    indicatorPKas: c.indicatorPKas.map((pKa) => pKa.value),
    // g per 100 mL, so ten times that per litre, over g/mol.
    indicatorMolarity: (10 * c.indicatorStrength.value) / c.indicatorMolarMass.value,
    // mL to whole microlitres.
    indicatorDropUl: Math.round(1000 * c.indicatorDropVolume.value),
    // mol/(kg bar) x ppm of dry air x bar; a kilogram of water is taken as a litre.
    dissolvedCo2: c.henryCo2.value * c.atmosphericCo2.value * 1e-6 * p.airPressureBar.value,
    carbonicPKas: c.carbonicPKas.map((pKa) => pKa.value),
    faintPinkConcentration: p.faintPinkConcentration.value,
    hclRangeE4: p.hclRangeE4.value,
    naohRangeE5: p.naohRangeE5.value,
    pipetteNominalUl: p.pipetteNominalUl.value,
    pipetteOffsetUl: p.pipetteOffsetUl.value,
    fillLevelMaxUl: p.fillLevelMaxUl.value,
    buretteCapacityUl: p.buretteCapacityUl.value,
    streamUl: p.streamUl.value,
    dropUl: p.dropUl.value,
    halfDropUl: p.halfDropUl.value,
    unconditionedStrengthPercent: p.unconditionedStrengthPercent.value,
    wetPipetteStrengthPercent: p.wetPipetteStrengthPercent.value,
    tipBubbleUl: p.tipBubbleUl.value,
    tipBubbleEscapeUl: p.tipBubbleEscapeUl.value,
    overshootUl: p.overshootUl.value,
    slowDownUl: p.slowDownUl.value,
    readingToleranceUl: p.readingToleranceUl.value,
    gradeTolerancePercent: p.gradeTolerancePercent.value,
    molarityRoundingE6: p.molarityRoundingE6.value,
    waterStepUl: p.waterStepUl.value,
    waterMaxUl: p.waterMaxUl.value,
    indicatorDrops: p.indicatorDrops.value,
    plumeSlowFrom: p.plumeSlowFrom.value,
    plumeMixSeconds: p.plumeMixSeconds.value,
    persistSeconds: p.persistSeconds.value,
    passesToComplete: p.passesToComplete.value,
  }
}
