// Scripted learners, for tests only: nothing in the app imports this file.
import type { PartId } from '@/chem-data/calorimetry/data'
import { scripted } from '../scripted'
import { can, reduce, type Action } from './actions'
import type { Sig3 } from './entries'
import type { CalorimetryModel } from './model'
import { partView } from './select'
import type { CalorimetryState } from './state'
import { FIELDS, type Field, type Value } from './worksheet'

/** Applies the actions in order; throws on one that cannot be done (see `scripted`). */
export const run = scripted<CalorimetryModel, CalorimetryState, Action>(can, reduce)

/** A number as a learner rounds it to three significant figures, from a calculator's value. */
export function sig(x: number): Sig3 {
  const size = Math.abs(x)
  let exponent = Math.floor(Math.log10(size)) - 2
  let mantissa = Math.round(size / 10 ** exponent)
  if (mantissa === 1000) [mantissa, exponent] = [100, exponent + 1]
  return { mantissa: x < 0 ? -mantissa : mantissa, exponent }
}
export const valueOf = ({ mantissa, exponent }: Sig3) => mantissa * 10 ** exponent

export interface Technique {
  /** False to leave the lid off, or the stirrer still. */
  lid?: boolean
  stir?: boolean
  /** Presses of Run on before the change is started: the level line. */
  before?: number
}

/**
 * Works a part's cup, from a run whose logger has not been started, to a curve that has turned back: lid and
 * stirrer where they are not already in use, logger, the change, and Run on until the latest reading is on its
 * way back. `through` is applied after every action.
 */
export function workCup(m: CalorimetryModel, state: CalorimetryState, part: PartId, { lid = true, stir = true, before = 1 }: Technique = {}, through: (s: CalorimetryState) => CalorimetryState = (s) => s): CalorimetryState {
  const go = (actions: Action[]) => (state = run(m, state, actions, through))
  const { cup } = partView(m, state, part)
  if (lid && !cup.lidOn) go([{ type: 'putLidOn', part }])
  if (stir && !cup.stirring) go([{ type: 'stir', part }])
  go([{ type: 'startLogger', part }, ...Array.from({ length: before }, (): Action => ({ type: 'runOn', part })), { type: 'startChange', part }])
  while (!partView(m, state, part).graph.turned) go([{ type: 'runOn', part }])
  return state
}

/** The two looks that open the worksheet's first entries: at the last reading before the change, and at the highest or lowest after it. */
export function looks(m: CalorimetryModel, state: CalorimetryState, part: PartId): Action[] {
  const { graph } = partView(m, state, part)
  return [
    { type: 'look', part, step: graph.changedAt! },
    { type: 'look', part, step: graph.extreme!.step },
  ]
}

export interface Arithmetic {
  /** Each entry worked from the rounded entries above it, or from the calculator's unrounded values. */
  chain?: 'rounded' | 'unrounded'
  /** One slip: the last reading taken for the highest or lowest; the salt left out of the mass that cooled; the sign of the result dropped; the result cut off where it should be rounded. */
  slip?: 'wrong-point' | 'salt-left-out' | 'no-sign' | 'cut-off'
}

/**
 * What a learner enters, worked out from what the bench and the logger show and nothing else: the readings, the
 * balance, the bath, the molar mass and the specific heats the bench prints. Careful unless a slip is asked for.
 */
export function worksheetValues(m: CalorimetryModel, state: CalorimetryState, part: PartId, { chain = 'rounded', slip }: Arithmetic = {}): Record<Field, Value> {
  const { graph, bench } = partView(m, state, part)
  const keep = chain === 'rounded' ? (x: number) => valueOf(sig(x)) : (x: number) => x
  const start = graph.readings[graph.changedAt!]!
  const extreme = slip === 'wrong-point' ? graph.readings.at(-1)! : graph.extreme!.tenths
  const change = Math.abs(extreme - start)
  const c = m.specificHeatE2 / 100
  const water = (m.waterTenthMl * m.densityE2) / 1000
  const grams = part === 'neutralisation' ? ((m.acidTenthMl + m.baseTenthMl) * m.densityE2) / 1000 : part === 'dissolving' && slip !== 'salt-left-out' ? water + bench.balanceCg! / 100 : water
  const heat = grams * c * (change / 10)
  const moles = part === 'neutralisation' ? (Math.min(m.acidTenthMl, m.baseTenthMl) * m.molarityE2) / 1e6 : (bench.balanceCg ?? 0) / 100 / (m.saltMolarMassE3 / 1000)
  const direction = extreme > start ? 'out' : 'in'
  const size = keep(heat) / keep(moles) / 1000
  const cut = (x: number): Sig3 => {
    const exponent = Math.floor(Math.log10(x)) - 2
    return { mantissa: Math.floor(x / 10 ** exponent + 1e-9), exponent }
  }
  const perMole = slip === 'cut-off' ? cut(size) : sig(size)
  const perGram = keep(heat) / (((bench.balanceCg ?? 1) / 100) * (((bench.bathTenths ?? 0) - extreme) / 10))
  const specificHeat = slip === 'cut-off' ? cut(perGram) : sig(perGram)
  const nearest = [...m.candidates].sort((a, b) => Math.abs(a.specificHeatE3 / 1000 - valueOf(specificHeat)) - Math.abs(b.specificHeatE3 / 1000 - valueOf(specificHeat)))[0]!
  return {
    start,
    extreme,
    change,
    heat: sig(heat),
    direction,
    moles: sig(moles),
    perMole: direction === 'out' && slip !== 'no-sign' ? { ...perMole, mantissa: -perMole.mantissa } : perMole,
    specificHeat,
    metal: nearest.id,
  }
}

/** The entries of a part's worksheet in order, from the values given. */
export const entryActions = (part: PartId, values: Record<Field, Value>): Action[] => FIELDS[part].map((field): Action => ({ type: 'enter', part, field, value: values[field] }))

/**
 * One whole run of a part from an untouched cup: the cup worked, the two looks made, the worksheet filled and, in
 * Challenge, checked. Careful unless told otherwise. A script that Guided would refuse throws.
 */
export function wholeRun(m: CalorimetryModel, state: CalorimetryState, part: PartId, how: Technique & Arithmetic = {}, through: (s: CalorimetryState) => CalorimetryState = (s) => s): CalorimetryState {
  state = workCup(m, state, part, how, through)
  state = run(m, state, looks(m, state, part), through)
  state = run(m, state, entryActions(part, worksheetValues(m, state, part, how)), through)
  return state.mode === 'challenge' ? run(m, state, [{ type: 'check', part }], through) : state
}
