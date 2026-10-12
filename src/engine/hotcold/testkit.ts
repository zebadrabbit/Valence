// Scripted learners, for tests only: nothing in the app imports this file.
import { SALT_IDS, type SaltId } from '@/chem-data/hotcold/data'
import { scripted } from '../scripted'
import { can, reduce, type Action } from './actions'
import { formatTenths, parseChange, parseTemperature } from './entries'
import type { HotcoldModel } from './model'
import { packsView, runView } from './select'
import { QUESTIONS, type HotcoldState } from './state'
import { FIELDS, type Field, type Value } from './worksheet'

/** Applies the actions in order; throws on one that cannot be done (see `scripted`). */
export const run = scripted<HotcoldModel, HotcoldState, Action>(can, reduce)

export interface Technique {
  /** False to leave the lid off, or the stirrer still. */
  lid?: boolean
  stir?: boolean
  /** Presses of Run on before the salt is added: the level line. */
  before?: number
}

/**
 * Works a salt's cup, from a run whose logger has not been started, to a curve that has turned back: lid and
 * stirrer where they are not already in use, logger, the salt, and Run on until the latest reading is on its way
 * back. `through` is applied after every action.
 */
export function workCup(m: HotcoldModel, state: HotcoldState, part: SaltId, { lid = true, stir = true, before = 1 }: Technique = {}, through: (s: HotcoldState) => HotcoldState = (s) => s): HotcoldState {
  const go = (actions: Action[]) => (state = run(m, state, actions, through))
  const { cup } = runView(m, state, part)
  if (lid && !cup.lidOn) go([{ type: 'putLidOn', part }])
  if (stir && !cup.stirring) go([{ type: 'stir', part }])
  go([{ type: 'startLogger', part }, ...Array.from({ length: before }, (): Action => ({ type: 'runOn', part })), { type: 'addSalt', part }])
  while (!runView(m, state, part).graph.turned) go([{ type: 'runOn', part }])
  return state
}

/** The two looks that open the notebook's first entries: at the last reading before the salt, and at the highest or lowest after it. */
export function looks(m: HotcoldModel, state: HotcoldState, part: SaltId): Action[] {
  const { graph } = runView(m, state, part)
  return [
    { type: 'look', part, step: graph.changedAt! },
    { type: 'look', part, step: graph.extreme!.step },
  ]
}

/** One slip of a learner's: the last reading taken for the highest or lowest; the water said to have gone the other way; the heat; or the word. */
export type SlipOf = 'wrong-point' | 'wrong-way' | 'wrong-heat' | 'wrong-word'

/**
 * What a learner enters, worked out from what the logger shows and nothing else, and typed as a learner types it:
 * each temperature goes through the text a learner would type and the reading of that text. Careful unless a slip
 * is asked for; each entry after a slip follows from the entries above it, as a learner's would.
 */
export function notebookValues(m: HotcoldModel, state: HotcoldState, part: SaltId, slip?: SlipOf): Record<Field, Value> {
  const { graph } = runView(m, state, part)
  const typed = (tenths: number) => parseTemperature(formatTenths(tenths))!
  const start = typed(graph.readings[graph.changedAt!]!)
  const extreme = typed(slip === 'wrong-point' ? graph.readings.at(-1)! : graph.extreme!.tenths)
  const warmer = extreme > start !== (slip === 'wrong-way')
  const out = warmer !== (slip === 'wrong-heat')
  const exothermic = out !== (slip === 'wrong-word')
  return { start, extreme, change: parseChange(formatTenths(Math.abs(extreme - start)))!, temperature: warmer ? 'warmer' : 'colder', heat: out ? 'out' : 'in', word: exothermic ? 'exothermic' : 'endothermic' }
}

/** The entries of a notebook in order, from the values given. */
export const entryActions = (part: SaltId, values: Record<Field, Value>): Action[] => FIELDS.map((field): Action => ({ type: 'enter', part, field, value: values[field] }))

/**
 * One whole run of a salt from an untouched cup: the cup worked, the two looks made, the notebook filled and, in
 * Challenge, checked. Careful unless told otherwise. A script that Guided would refuse throws.
 */
export function wholeRun(m: HotcoldModel, state: HotcoldState, part: SaltId, how: Technique & { slip?: SlipOf } = {}, through: (s: HotcoldState) => HotcoldState = (s) => s): HotcoldState {
  state = workCup(m, state, part, how, through)
  state = run(m, state, looks(m, state, part), through)
  state = run(m, state, entryActions(part, notebookValues(m, state, part, how.slip)), through)
  return state.mode === 'challenge' ? run(m, state, [{ type: 'check', part }], through) : state
}

/**
 * Part 3 answered from what the learner's own two runs showed, and nothing else: the salt whose run that counts
 * was entered as warmer for the pack that warms, and the other for the pack that cools. Checked in Challenge.
 */
export function answerPacks(m: HotcoldModel, state: HotcoldState, through: (s: HotcoldState) => HotcoldState = (s) => s): HotcoldState {
  const warmed = SALT_IDS.find((salt) => state.runs[salt].some((one) => one.closed && one.entries.temperature === 'warmer'))!
  const cooled = SALT_IDS.find((salt) => salt !== warmed)!
  state = run(m, state, QUESTIONS.map((question): Action => ({ type: 'answer', question, salt: question === 'warms' ? warmed : cooled })), through)
  return packsView(m, state).checked ? state : run(m, state, [{ type: 'checkPacks' }], through)
}

/** A whole lab from Start, careful: both salts in the order given, then part 3. */
export function wholeLab(m: HotcoldModel, state: HotcoldState, order: readonly SaltId[] = SALT_IDS, through: (s: HotcoldState) => HotcoldState = (s) => s): HotcoldState {
  for (const part of order) state = wholeRun(m, state, part, {}, through)
  return answerPacks(m, state, through)
}
