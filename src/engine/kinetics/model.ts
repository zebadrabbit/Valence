import { exact, reduced, times, type Exact } from '../figures'
import { exp } from './numbers'

/**
 * A reaction whose rate is found by timing it, as the plain numbers the kinetics engine runs on: every engine
 * function takes one as an argument, and nothing in the engine knows which reaction it is (spec 19.4). The clock
 * reaction lab's model is made from its stored record (src/engine/clock/model.ts); a second lab hands in another.
 *
 * A run mixes measured volumes of the bottles, and is timed from the mixing to its end: the moment a small, known
 * amount of one bottle's solute has been used up. The rate of a run is that amount, over how many of it are used
 * for each one of the reaction, over the time. Volumes are in tenths of a millilitre, strengths in micromoles for
 * a litre, temperatures in tenths of a degree Celsius or hundredths of a kelvin, times in milliseconds.
 */
export interface KineticsModel {
  /** The bottles: each with its strength, or null for one that has none (water, an indicator). */
  solutions: readonly { id: string; microMolar: number | null }[]
  /** The reactants of the rate law, in the order they are asked about: the bottle each comes from, and its order. */
  reactants: readonly { id: string; solutionId: string; order: number }[]
  /** What ends a run. */
  end: {
    /** The bottle whose solute is used up by then, and how many of it are used for each one of the reaction as the rate counts it. */
    solutionId: string
    per: number
    /** The bottle that must be in the flask for the end to show; null where it shows by itself. */
    indicatorId: string | null
  }
  /** The rate constant at the reference temperature, in litres, moles and seconds. */
  rateConstant: number
  referenceCentiKelvin: number
  /** J/mol. */
  activationJ: number
  /** The gas constant, J/(mol·K) x 10^9. */
  gasConstantE9: number
  /** 0 °C in hundredths of a kelvin. */
  zeroCelsiusCentiKelvin: number
  /** What goes into each mixture, by bottle; the mixture's volume is the sum. */
  mixtures: readonly { id: string; tenthMl: Readonly<Record<string, number>> }[]
  /** The runs a learner makes: a mixture at the room's temperature (no bath) or in a bath. */
  runs: readonly { id: string; mixtureId: string; bathId: string | null }[]
  /** The run whose row the learner works by hand, at the room's temperature. The bath runs are of its mixture. */
  referenceRunId: string
  /** For each reactant, the two runs its order is found from: they differ in that reactant alone. */
  orderRuns: Readonly<Record<string, readonly [string, string]>>
  baths: readonly { id: string; rangeTenths: readonly [number, number] }[]
  roomRangeTenths: readonly [number, number]
  /** The orders a learner chooses among. */
  orderChoices: readonly number[]
  /** The units of a rate constant a learner chooses among, each as the power of mol/L in it: -3 is L³/(mol³·s). */
  unitPowers: readonly number[]
  /** The most a time is moved by the seed, either way, in parts in ten thousand. */
  scatterPerTenThousand: number
  /** A watch stopped by hand later than this after the end does not count. */
  delayLimitMs: number
  /** The watch stops itself here. */
  watchLimitMs: number
  rateConstantTolerancePercent: number
  activationTolerancePercent: number
  /** The places on the line of the graph that can be looked at: 1/T in millionths of a reciprocal kelvin. */
  places: { fromMicro: number; stepMicro: number; count: number }
}

const found = <T extends { id: string }>(list: readonly T[], id: string, what: string): T => {
  const item = list.find((one) => one.id === id)
  if (!item) throw new Error(`no ${what} "${id}"`)
  return item
}
export const runOf = (m: KineticsModel, runId: string) => found(m.runs, runId, 'run')
export const mixtureOf = (m: KineticsModel, mixtureId: string) => found(m.mixtures, mixtureId, 'mixture')
export const reactantOf = (m: KineticsModel, reactantId: string) => found(m.reactants, reactantId, 'reactant')

/** The runs made at the room's temperature, in their order: the ones the rate law is found from. */
export const roomRuns = (m: KineticsModel) => m.runs.filter((run) => run.bathId === null)
/** The runs made in a bath, in their order. */
export const bathRuns = (m: KineticsModel) => m.runs.filter((run) => run.bathId !== null)
/** The runs the graph of part 3 has a point for: the reference run, at the room's temperature, and each bath's. */
export const temperatureRuns = (m: KineticsModel) => [runOf(m, m.referenceRunId), ...bathRuns(m)]

/** A mixture's whole volume, in tenths of a millilitre. */
export const totalTenthMl = (mixture: KineticsModel['mixtures'][number]) => Object.values(mixture.tenthMl).reduce((sum, v) => sum + v, 0)

/** The strength of one bottle's solute in a mixture once everything is in, in mol/L: its strength in the bottle, times its volume, over the whole volume. Exact. */
export function concentration(m: KineticsModel, mixtureId: string, solutionId: string): Exact {
  const mixture = mixtureOf(m, mixtureId)
  const { microMolar } = found(m.solutions, solutionId, 'solution')
  return reduced(exact((microMolar ?? 0) * (mixture.tenthMl[solutionId] ?? 0), totalTenthMl(mixture) * 1e6))
}

/** The strength of a bottle's solute in the bottle, in mol/L. Exact. */
export const bottleStrength = (m: KineticsModel, solutionId: string): Exact => reduced(exact(found(m.solutions, solutionId, 'solution').microMolar ?? 0, 1e6))

/** How much of the reaction has gone by the end of a run of a mixture, in mol/L: the strength of what is used up, over how many of it each one of the reaction uses. Exact. */
export const usedUp = (m: KineticsModel, mixtureId: string): Exact => reduced(exact(concentration(m, mixtureId, m.end.solutionId), m.end.per))

/** A whole power of an exact value. */
export function power(value: Exact, n: number): Exact {
  let out: Exact = [1n, 1n]
  for (let i = 0; i < n; i++) out = reduced(times(out, value))
  return out
}

/** The product of the reactants' strengths in a mixture, each raised to an order: what a rate is the rate constant times. Exact. */
export const strengthsProduct = (m: KineticsModel, mixtureId: string, orders: Readonly<Record<string, number>>): Exact =>
  m.reactants.reduce<Exact>((product, reactant) => reduced(times(product, power(concentration(m, mixtureId, reactant.solutionId), orders[reactant.id] ?? 0))), [1n, 1n])

/** The orders the model holds, by reactant. */
export const modelOrders = (m: KineticsModel): Record<string, number> => Object.fromEntries(m.reactants.map((r) => [r.id, r.order]))

/** A temperature in tenths of a degree Celsius as hundredths of a kelvin. */
export const centiKelvin = (m: KineticsModel, tenths: number) => tenths * 10 + m.zeroCelsiusCentiKelvin

/** The rate constant at a temperature, by the Arrhenius equation from its value at the reference temperature. */
export function rateConstantAt(m: KineticsModel, centiK: number): number {
  const overR = (m.activationJ * 1e9) / m.gasConstantE9
  return m.rateConstant * exp(-overR * (100 / centiK - 100 / m.referenceCentiKelvin))
}

/**
 * The time from mixing to the end of a run, in whole milliseconds: what must be used up, over the rate, with the
 * strengths taken as they are at mixing (spec 19.4: the same idealisation the learner's arithmetic makes), and
 * moved by the run's scatter.
 */
export function endMs(m: KineticsModel, mixtureId: string, centiK: number, scatter: number): number {
  const [usedTop, usedBottom] = usedUp(m, mixtureId)
  const [strengthsTop, strengthsBottom] = strengthsProduct(m, mixtureId, modelOrders(m))
  const rate = rateConstantAt(m, centiK) * (Number(strengthsTop) / Number(strengthsBottom))
  const seconds = Number(usedTop) / Number(usedBottom) / rate
  return Math.round(seconds * 1000 * (1 + scatter / 10000))
}

/**
 * What is wrong with a model, as a list: empty for one the engine can run. A reaction's record is checked with
 * this before a lab is made from it, so that the engine's own functions need not ask again.
 */
export function modelProblems(m: KineticsModel): string[] {
  const problems: string[] = []
  const has = <T extends { id: string }>(list: readonly T[], id: string) => list.some((one) => one.id === id)
  const twice = (ids: readonly string[]) => ids.find((id, i) => ids.indexOf(id) !== i)
  for (const [what, ids] of [['solution', m.solutions.map((s) => s.id)], ['reactant', m.reactants.map((r) => r.id)], ['mixture', m.mixtures.map((x) => x.id)], ['run', m.runs.map((r) => r.id)], ['bath', m.baths.map((b) => b.id)]] as const) {
    const repeated = twice(ids)
    if (repeated !== undefined) problems.push(`the ${what} "${repeated}" is listed twice`)
  }
  const strong = (solutionId: string) => (m.solutions.find((s) => s.id === solutionId)?.microMolar ?? 0) > 0
  if (m.reactants.length === 0) problems.push('a rate law needs a reactant')
  for (const reactant of m.reactants) {
    if (!strong(reactant.solutionId)) problems.push(`the reactant "${reactant.id}" comes from no bottle with a strength`)
    if (!m.orderChoices.includes(reactant.order)) problems.push(`the order of "${reactant.id}" is not one of the choices`)
  }
  if (!strong(m.end.solutionId)) problems.push('what is used up by the end of a run comes from no bottle with a strength')
  if (!Number.isInteger(m.end.per) || m.end.per < 1) problems.push('what is used up is counted in whole numbers')
  if (m.end.indicatorId !== null && !has(m.solutions, m.end.indicatorId)) problems.push('what shows the end of a run is no bottle')
  if (m.orderChoices.some((order) => !Number.isInteger(order) || order < 0)) problems.push('the orders to choose among are whole numbers, none below zero')
  if (!m.unitPowers.includes(1 - m.reactants.reduce((sum, r) => sum + r.order, 0))) problems.push("the unit of the model's own rate constant is not among the choices")
  if (!(m.rateConstant > 0 && m.activationJ > 0 && m.referenceCentiKelvin > 0 && m.gasConstantE9 > 0)) problems.push('the rate constant, its temperature, the activation energy and the gas constant are above zero')
  for (const mixture of m.mixtures) {
    for (const [solutionId, tenthMl] of Object.entries(mixture.tenthMl)) {
      if (!has(m.solutions, solutionId)) problems.push(`the mixture "${mixture.id}" holds "${solutionId}", which is no bottle`)
      if (!Number.isInteger(tenthMl) || tenthMl < 0) problems.push(`the mixture "${mixture.id}" holds a volume of "${solutionId}" that is no whole number of tenths of a millilitre`)
    }
    if (m.reactants.some((r) => !((mixture.tenthMl[r.solutionId] ?? 0) > 0)) || !((mixture.tenthMl[m.end.solutionId] ?? 0) > 0)) problems.push(`the mixture "${mixture.id}" lacks a reactant, or what is used up`)
  }
  for (const run of m.runs) {
    if (!has(m.mixtures, run.mixtureId)) problems.push(`the run "${run.id}" is of no mixture`)
    if (run.bathId !== null && !has(m.baths, run.bathId)) problems.push(`the run "${run.id}" stands in no bath of the model`)
  }
  const reference = m.runs.find((run) => run.id === m.referenceRunId)
  if (!reference || reference.bathId !== null) problems.push("the reference run is one at the room's temperature")
  else if (m.runs.some((run) => run.bathId !== null && run.mixtureId !== reference.mixtureId)) problems.push("the runs in the baths are of the reference run's mixture")
  if (m.baths.some((bath) => m.runs.filter((run) => run.bathId === bath.id).length !== 1)) problems.push('each bath has one run')
  if (problems.length > 0) return problems
  for (const reactant of m.reactants) {
    const pair = m.orderRuns[reactant.id]
    const [first, second] = (pair ?? []).map((id) => m.runs.find((run) => run.id === id && run.bathId === null))
    if (!first || !second) {
      problems.push(`the order of "${reactant.id}" is found from two runs at the room's temperature`)
      continue
    }
    const same = (solutionId: string) => {
      const [a, b] = [concentration(m, first.mixtureId, solutionId), concentration(m, second.mixtureId, solutionId)]
      return a[0] * b[1] === b[0] * a[1]
    }
    if (same(reactant.solutionId)) problems.push(`the two runs for the order of "${reactant.id}" hold the same strength of it`)
    if (m.reactants.some((other) => other.id !== reactant.id && !same(other.solutionId))) problems.push(`the two runs for the order of "${reactant.id}" differ in another reactant too`)
  }
  for (const [name, [low, high]] of [['room', m.roomRangeTenths], ...m.baths.map((bath) => [bath.id, bath.rangeTenths] as const)] as const) {
    if (!Number.isInteger(low) || !Number.isInteger(high) || low > high) problems.push(`the range of "${name}" runs from its lower end to its upper, in whole tenths of a degree`)
  }
  if (!(m.places.count >= 2 && m.places.stepMicro > 0 && m.places.fromMicro > 0)) problems.push('the line has two places or more, each further along than the last')
  if (!(m.delayLimitMs >= 0 && m.watchLimitMs > m.delayLimitMs && m.scatterPerTenThousand >= 0 && m.scatterPerTenThousand < 10000)) problems.push('the limits on the watch and the scatter are not ones a run can be timed with')
  return problems
}
