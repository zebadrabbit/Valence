import { candidatesOf, solutesOf, type FreezingData, type Reagent } from '@/chem-data/freezing/data'

/** Something that is dissolved: its molar mass in g/mol x 100, the particles each formula unit gives x 100 as the model has it, and the whole number its formula gives (one for a molecule, two for these salts). */
export interface Solute {
  id: string
  molarMassE2: number
  particlesE2: number
  idealParticles: number
}

/**
 * The plain numbers the freezing point depression engine runs on, all whole: every engine function takes one as an
 * argument, so a test can vary a value. Temperatures are in hundredths of a degree, masses on the balance in
 * hundredths of a gram, the cup's own water and ice in milligrams, shares in parts per million.
 */
export interface FreezingModel {
  // cited values, and values worked out from cited ones
  /** °C·kg/mol x 100: the freezing point constant of water. */
  kfE2: number
  /** The liquids the unknown may be. */
  liquids: readonly Solute[]
  /** What part 3 dissolves: urea and the three salts. */
  solutes: readonly Solute[]
  // model parameters
  stepSeconds: number
  runOnSteps: number
  maxSteps: number
  mixStirredPpm: number
  mixStillPpm: number
  leakLidOnMg: number
  leakLidOffMg: number
  meltGramDegreesPerGram: number
  warmLidOnPpm: number
  warmLidOffPpm: number
  roomHundredths: number
  iceCg: number
  iceLowCg: number
  levelBandMicro: number
  startRangeHundredths: readonly [number, number]
  probeOffRangeHundredths: readonly [number, number]
  waterRangeCg: readonly [number, number]
  unknownRangeCg: readonly [number, number]
  /** The mass weighed out of each solute of part 3, by its id. */
  soluteRangesCg: Readonly<Record<string, readonly [number, number]>>
  molarMassTolerancePerMille: number
  particlesTolerancePerMille: number
}

const soluteOf = (reagent: Reagent): Solute => ({ id: reagent.id, molarMassE2: Math.round(reagent.molarMass.value * 100), particlesE2: Math.round(reagent.particles.value * 100), idealParticles: reagent.particles.ideal })

/** The engine's numbers, from the stored record. */
export function modelFrom(data: FreezingData): FreezingModel {
  const { parameters: p } = data
  const ranges: Record<string, readonly [number, number]> = { urea: p.ureaRangeCg.value, nacl: p.naclRangeCg.value, kcl: p.kclRangeCg.value, nabr: p.nabrRangeCg.value }
  const solutes = solutesOf(data).map(soluteOf)
  if (solutes.some((solute) => !(solute.id in ranges)) || Object.keys(ranges).length !== solutes.length) throw new Error('the record does not hold a seeded mass for each solute of spec 23.1')
  return {
    kfE2: Math.round(data.water.freezingPointConstant.value * 100),
    liquids: candidatesOf(data).map(soluteOf),
    solutes,
    stepSeconds: p.loggerStepSeconds.value,
    runOnSteps: p.runOnSteps.value,
    maxSteps: p.loggerMaxSteps.value,
    mixStirredPpm: p.mixStirredPpm.value,
    mixStillPpm: p.mixStillPpm.value,
    leakLidOnMg: p.leakLidOnMg.value,
    leakLidOffMg: p.leakLidOffMg.value,
    meltGramDegreesPerGram: p.meltGramDegreesPerGram.value,
    warmLidOnPpm: p.warmLidOnPpm.value,
    warmLidOffPpm: p.warmLidOffPpm.value,
    roomHundredths: p.roomHundredths.value,
    iceCg: p.iceCg.value,
    iceLowCg: p.iceLowCg.value,
    levelBandMicro: p.levelBandMicrodegrees.value,
    startRangeHundredths: p.startRangeHundredths.value,
    probeOffRangeHundredths: p.probeOffRangeHundredths.value,
    waterRangeCg: p.waterRangeCg.value,
    unknownRangeCg: p.unknownRangeCg.value,
    soluteRangesCg: ranges,
    molarMassTolerancePerMille: p.molarMassTolerancePerMille.value,
    particlesTolerancePerMille: p.particlesTolerancePerMille.value,
  }
}
