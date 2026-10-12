// Scripted learners, for tests only: nothing in the app imports this file.
import type { PartId } from '@/chem-data/freezing/data'
import { scripted } from '../scripted'
import { can, reduce, type Action } from './actions'
import { formatKilograms, formatSig3, formatTemperature, type Sig3 } from './entries'
import type { FreezingModel } from './model'
import { partView } from './select'
import type { FreezingState } from './state'
import { FIELDS, parseEntry, type Field, type Value } from './worksheet'

/** Applies the actions in order; throws on one that cannot be done (see `scripted`). */
export const run = scripted<FreezingModel, FreezingState, Action>(can, reduce)

/** A number as a learner rounds it to three significant figures, from a calculator's value. */
export function sig(x: number): Sig3 {
  const size = Math.abs(x)
  let exponent = Math.floor(Math.log10(size)) - 2
  let mantissa = Math.round(size / 10 ** exponent)
  if (mantissa === 1000) [mantissa, exponent] = [100, exponent + 1]
  return { mantissa: x < 0 ? -mantissa : mantissa, exponent }
}
export const valueOf = ({ mantissa, exponent }: Sig3) => mantissa * 10 ** exponent

/** A number cut off after its third figure, with no rounding. */
export function cut(x: number): Sig3 {
  const exponent = Math.floor(Math.log10(x)) - 2
  return { mantissa: Math.floor(x / 10 ** exponent + 1e-9), exponent }
}

/** What a learner types in a field, read as the page reads it: the text goes through the engine's own parser, so a script can enter nothing a learner could not type. */
export function typed(field: Field, text: string): Value {
  const value = parseEntry(field, text)
  if (value === null) throw new Error(`"${text}" is not something the field "${field}" takes`)
  return value
}

export interface Technique {
  /** False to leave the lid off, or the stirrer still. */
  lid?: boolean
  stir?: boolean
  /** Part 3: the solute to dissolve. Urea unless told otherwise. */
  solute?: string
  /** Presses of Run on before the solute goes in, and after it; left out, Run on is pressed until the last three readings are the same, and at least twice. */
  before?: number
  after?: number
  /** False to weigh the cup without straining it. */
  strain?: boolean
}

/** True when the logger's last three readings are the same: what a learner sees of a level stretch. */
export const steady = (readings: readonly number[], since: number) => readings.length - 1 - since >= 4 && new Set(readings.slice(-3)).size === 1

/**
 * Works a part's cup from an untouched run to a weighed solution (in part 1, to a level stretch): ice and water,
 * lid and stirrer, logger, Run on until the readings are level, the solute, Run on again, the strainer and the
 * balance. `through` is applied after every action.
 */
export function workCup(m: FreezingModel, state: FreezingState, part: PartId, { lid = true, stir = true, solute, before, after, strain = true }: Technique = {}, through: (s: FreezingState) => FreezingState = (s) => s): FreezingState {
  const go = (actions: Action[]) => (state = run(m, state, actions, through))
  const graph = () => partView(m, state, part).graph
  const wait = (presses: number | undefined, since: number) => {
    if (presses !== undefined) return void go(Array.from({ length: presses }, (): Action => ({ type: 'runOn', part })))
    do go([{ type: 'runOn', part }])
    while (!steady(graph().readings, since) && !graph().full)
  }
  go([{ type: 'fill', part }])
  if (lid) go([{ type: 'putLidOn', part }])
  if (stir) go([{ type: 'stir', part }])
  go([{ type: 'startLogger', part }])
  wait(before, 0)
  if (part === 'water') return state
  if (part === 'particles') go([{ type: 'chooseSolute', part, solute: solute ?? m.solutes[0]!.id }])
  go([{ type: 'addSolute', part }])
  wait(after, graph().addedAt!)
  if (strain) go([{ type: 'strain', part }])
  return go([{ type: 'weigh', part }])
}

/** The looks that open the notebook's temperatures: at the reading the solute followed (in part 1, the latest), and at the last reading. */
export function looks(m: FreezingModel, state: FreezingState, part: PartId): Action[] {
  const { graph } = partView(m, state, part)
  if (part === 'water') return [{ type: 'look', part, step: graph.readings.length - 1 }]
  return [
    { type: 'look', part, step: graph.addedAt! },
    { type: 'look', part, step: graph.endedAt! },
  ]
}

export interface Arithmetic {
  /** Each entry worked from the rounded entries above it, or from the calculator's unrounded values. */
  chain?: 'rounded' | 'unrounded'
  /** One slip: a reading a step early taken for the level one; the solute's mass left in the mass of water; the result cut off where it should be rounded; the last relation worked the wrong way up; another liquid named. */
  slip?: 'wrong-point' | 'solute-not-taken-off' | 'cut-off' | 'upside-down' | 'wrong-name'
}

/**
 * What a learner types in each field, worked out from what the bench and the logger show and nothing else: the
 * readings, the balance, the constant and the molar masses the table prints. Careful unless a slip is asked for.
 * Each is text, as it goes into the page.
 */
export function worksheetText(m: FreezingModel, state: FreezingState, part: PartId, { chain = 'rounded', slip }: Arithmetic = {}): Record<Field, string> {
  const { graph, bench } = partView(m, state, part)
  const keep = chain === 'rounded' ? (x: number) => valueOf(sig(x)) : (x: number) => x
  const last = graph.readings.length - 1
  const water = part === 'water' ? graph.readings[slip === 'wrong-point' ? last - 1 : last]! : graph.readings[graph.addedAt!]!
  const solution = part === 'water' ? water : graph.readings[slip === 'wrong-point' ? graph.addedAt! + 1 : graph.endedAt!]!
  // Part 1 has the one reading: the other fields are not its own, and are left empty.
  if (part === 'water') return { water: formatTemperature(water), solution: '', fall: '', waterKg: '', molality: '', moles: '', molarMass: '', liquid: '', idealFall: '', ratio: '' }
  const fall = Math.abs(solution - water)
  const kf = m.kfE2 / 100
  const waterCg = (bench.solutionCg ?? 0) - (slip === 'solute-not-taken-off' ? 0 : (bench.soluteCg ?? 0))
  const kg = waterCg / 1e5
  const grams = (bench.soluteCg ?? 0) / 100
  const last3 = (x: number) => formatSig3(slip === 'cut-off' ? cut(x) : sig(x))
  // Part 2: the molality from the fall, the moles from it, the molar mass.
  const molality2 = fall / 100 / kf
  const moles2 = keep(molality2) * kg
  const molarMass = slip === 'upside-down' ? keep(moles2) / grams : grams / keep(moles2)
  const size = valueOf(sig(molarMass))
  const ranked = [...m.liquids].sort((a, b) => Math.abs(a.molarMassE2 / 100 - size) - Math.abs(b.molarMassE2 / 100 - size))
  // Part 3: the moles from the molar mass on the table, the molality, the fall of one particle, the ratio.
  const table = m.solutes.find((s) => s.id === bench.solute)?.molarMassE2 ?? 100
  const moles3 = grams / (table / 100)
  const molality3 = keep(moles3) / kg
  const ideal = kf * keep(molality3)
  const ratio = slip === 'upside-down' ? keep(ideal) / (fall / 100) : fall / 100 / keep(ideal)
  return {
    water: formatTemperature(water),
    solution: formatTemperature(solution),
    fall: formatTemperature(fall),
    waterKg: formatKilograms(waterCg),
    molality: formatSig3(sig(part === 'unknown' ? molality2 : molality3)),
    moles: formatSig3(sig(part === 'unknown' ? moles2 : moles3)),
    molarMass: last3(molarMass),
    liquid: ranked[slip === 'wrong-name' ? 1 : 0]!.id,
    idealFall: formatSig3(sig(ideal)),
    ratio: last3(ratio),
  }
}

/** The entries of a part's notebook in order, each typed. */
export const entryActions = (part: PartId, text: Record<Field, string>): Action[] => FIELDS[part].map((field): Action => ({ type: 'enter', part, field, value: typed(field, text[field]) }))

/**
 * One whole run of a part from an untouched cup: the cup worked, the looks made, the notebook filled and, in
 * Challenge, checked. Careful unless told otherwise. A script that Guided would refuse throws.
 */
export function wholeRun(m: FreezingModel, state: FreezingState, part: PartId, how: Technique & Arithmetic = {}, through: (s: FreezingState) => FreezingState = (s) => s): FreezingState {
  state = workCup(m, state, part, how, through)
  state = run(m, state, looks(m, state, part), through)
  state = run(m, state, entryActions(part, worksheetText(m, state, part, how)), through)
  return state.mode === 'challenge' ? run(m, state, [{ type: 'check', part }], through) : state
}

/** A whole lab from a fresh one: every part, part 3 with urea and with one salt. */
export function wholeLab(m: FreezingModel, state: FreezingState, salt = m.solutes[1]!.id, through: (s: FreezingState) => FreezingState = (s) => s): FreezingState {
  state = wholeRun(m, state, 'water', {}, through)
  state = wholeRun(m, state, 'unknown', {}, through)
  state = wholeRun(m, state, 'particles', {}, through)
  state = run(m, state, [{ type: 'runAgain', part: 'particles' }], through)
  return wholeRun(m, state, 'particles', { solute: salt }, through)
}
