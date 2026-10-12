import { bathRunId, type ClockData } from '@/chem-data/clock/data'
import { modelProblems, type KineticsModel } from '../kinetics/model'

/** The plain numbers the clock reaction lab runs on: the kinetics engine's model, with this reaction's record in it. */
export type ClockModel = KineticsModel

/**
 * The engine's numbers, from the stored record. A run at the room's temperature goes by its mixture's id, and a
 * run in a bath by the bath's with "bath-" in front. Throws where the record is not one the engine can run.
 */
export function modelFrom(data: ClockData): ClockModel {
  const { rateLaw, parameters: p } = data
  const range = (name: string) => {
    const value = (p as Record<string, { value: unknown } | undefined>)[name]?.value
    if (!Array.isArray(value) || value.length !== 2) throw new Error(`no range "${name}"`)
    return [value[0], value[1]] as const
  }
  const model: ClockModel = {
    solutions: [...data.reagents.map((r) => ({ id: r.id, microMolar: r.form === 'solution' ? Math.round(r.molarity * 1e6) : null })), { id: 'water', microMolar: null }],
    reactants: rateLaw.reactants.map((reactant) => ({ id: reactant.id, solutionId: reactant.reagentId, order: reactant.order.value })),
    end: { solutionId: rateLaw.end.reagentId, per: rateLaw.end.per, indicatorId: rateLaw.end.indicatorId },
    rateConstant: rateLaw.rateConstant.value,
    referenceCentiKelvin: Math.round((rateLaw.rateConstant.celsius + data.constants.zeroCelsius.value) * 100),
    activationJ: Math.round(rateLaw.activationEnergy.value * 1000),
    gasConstantE9: Math.round(data.constants.gasConstant.value * 1e9),
    zeroCelsiusCentiKelvin: Math.round(data.constants.zeroCelsius.value * 100),
    mixtures: data.mixtures.map((mixture) => ({ id: mixture.id, tenthMl: Object.fromEntries([...mixture.flaskA, ...mixture.flaskB].map((part) => [part.reagentId, Math.round(part.millilitres * 10)])) })),
    runs: [...data.mixtures.map((mixture) => ({ id: mixture.id, mixtureId: mixture.id, bathId: null })), ...data.baths.map((bath) => ({ id: bathRunId(bath.id), mixtureId: data.referenceMixtureId, bathId: bath.id }))],
    referenceRunId: data.referenceMixtureId,
    orderRuns: Object.fromEntries(rateLaw.reactants.map((reactant) => [reactant.id, [data.referenceMixtureId, reactant.comparedIn] as const])),
    baths: data.baths.map((bath) => ({ id: bath.id, rangeTenths: range(bath.range) })),
    roomRangeTenths: p.roomRangeTenths.value,
    orderChoices: p.orderChoices.value,
    unitPowers: p.unitPowers.value,
    scatterPerTenThousand: p.scatterPerTenThousand.value,
    delayLimitMs: p.delayLimitMs.value,
    watchLimitMs: p.watchLimitSeconds.value * 1000,
    rateConstantTolerancePercent: p.rateConstantTolerancePercent.value,
    activationTolerancePercent: p.activationTolerancePercent.value,
    places: { fromMicro: p.placesFromMicro.value, stepMicro: p.placesStepMicro.value, count: p.placesCount.value },
  }
  const problems = modelProblems(model)
  if (problems.length > 0) throw new Error(`the record does not hold a reaction the engine can run: ${problems.join('; ')}`)
  return model
}
