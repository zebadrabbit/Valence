import { partsOfMixture, type AcetoneData } from '@/chem-data/acetone/data'
import { modelProblems, type KineticsModel } from '../kinetics/model'

/** The plain numbers the iodination of acetone lab runs on: the kinetics engine's model, with this reaction's record in it. */
export type AcetoneModel = KineticsModel

/**
 * The engine's numbers, from the stored record. Every run is a mixture at the room's temperature and goes by its
 * mixture's id; there are no baths, so the model has no part on temperature, no places on a line and no tolerance
 * for an activation energy. The rate constant is the figure its source prints with the power of ten printed beside
 * it, and the activation energy is the kilocalories its source prints, in joules by the cited size of a calorie:
 * nobody finds it here, and it gives the rate constant at the room's temperature. Throws where the record is not
 * one the engine can run.
 */
export function modelFrom(data: AcetoneData): AcetoneModel {
  const { rateLaw, constants, parameters: p } = data
  const model: AcetoneModel = {
    solutions: [...data.reagents.map((r) => ({ id: r.id, microMolar: Math.round(r.molarity * 1e6) })), { id: 'water', microMolar: null }],
    reactants: rateLaw.reactants.map((reactant) => ({ id: reactant.id, solutionId: reactant.reagentId, order: reactant.order.value })),
    end: { solutionId: rateLaw.end.reagentId, per: rateLaw.end.per, indicatorId: null },
    rateConstant: Number(`${rateLaw.rateConstant.value}e${rateLaw.rateConstant.exponent}`),
    referenceCentiKelvin: Math.round((rateLaw.rateConstant.celsius + constants.zeroCelsius.value) * 100),
    activationJ: Math.round(rateLaw.activationEnergy.value * constants.joulesPerCalorie.value * 1000),
    gasConstantE9: Math.round(constants.gasConstant.value * 1e9),
    zeroCelsiusCentiKelvin: Math.round(constants.zeroCelsius.value * 100),
    mixtures: data.mixtures.map((mixture) => ({ id: mixture.id, tenthMl: Object.fromEntries(partsOfMixture(mixture).map((part) => [part.reagentId, Math.round(part.millilitres * 10)])) })),
    runs: data.mixtures.map((mixture) => ({ id: mixture.id, mixtureId: mixture.id, bathId: null })),
    referenceRunId: data.referenceMixtureId,
    orderRuns: Object.fromEntries(rateLaw.reactants.map((reactant) => [reactant.id, [data.referenceMixtureId, reactant.comparedIn] as const])),
    baths: [],
    roomRangeTenths: p.roomRangeTenths.value,
    orderChoices: p.orderChoices.value,
    unitPowers: p.unitPowers.value,
    scatterPerTenThousand: p.scatterPerTenThousand.value,
    delayLimitMs: p.delayLimitMs.value,
    watchLimitMs: p.watchLimitSeconds.value * 1000,
    rateConstantTolerancePercent: p.rateConstantTolerancePercent.value,
    activationTolerancePercent: 0,
    places: { fromMicro: 0, stepMicro: 0, count: 0 },
  }
  const problems = modelProblems(model)
  if (problems.length > 0) throw new Error(`the record does not hold a reaction the engine can run: ${problems.join('; ')}`)
  return model
}
