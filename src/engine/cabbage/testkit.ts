// Scripted learners, for tests only: nothing in the app imports this file.
import { THING_IDS, type ThingId } from '@/chem-data/cabbage/data'
import { scripted } from '../scripted'
import { can, reduce, type Action } from './actions'
import { CANNOT_SAY, type CabbageModel, type Class, type Estimate } from './model'
import { rackView, sampleView, unitView, type RackView, type SampleView } from './select'
import type { CabbageState } from './state'

/** Applies the actions in order; throws on one that cannot be done (see `scripted`). */
export const run = scripted<CabbageModel, CabbageState, Action>(can, reduce)

type Through = (s: CabbageState) => CabbageState
const same: Through = (s) => s

/**
 * What a careful learner says of a sample by eye, from what is seen and from the rack and nothing else: the tube of
 * the scale with the same colour, the lowest where two share it (`highest` for the other), and that the indicator
 * cannot say where the sample's colour is no tube's.
 */
export function byEye(rack: RackView, sample: SampleView, highest = false): Estimate {
  const colour = sample.shows.liquid?.colour
  const tubes = rack.tubes.filter((tube) => tube.shows.liquid?.colour === colour).map((tube) => tube.ph)
  return tubes.length === 0 ? CANNOT_SAY : highest ? tubes.at(-1)! : tubes[0]!
}

/** Acid, neutral or basic from the tube named: below the neutral tube, at it, or above it. */
export const classOf = (tube: number): Class => (tube < 7 ? 'acid' : tube === 7 ? 'neutral' : 'basic')

/** The first part, careful: the indicator, a look along the rack, and the three answers read off the rack. */
export function wholeScale(m: CabbageModel, state: CabbageState, how: { wrong?: boolean; check?: boolean } = {}, through: Through = same): CabbageState {
  state = run(m, state, [{ type: 'fillRack' }, { type: 'lookRack' }], through)
  const rack = rackView(m, state)
  const colourOf = (ph: number) => rack.tubes.find((tube) => tube.ph === ph)!.shows.liquid!.colour
  const pair = rack.tubes.find((tube, i) => i > 0 && tube.shows.liquid!.colour === rack.tubes[i - 1]!.shows.liquid!.colour)!.ph - 1
  for (const question of rack.questions) {
    const right = question.kind === 'colour-of-tube' ? colourOf(question.ph!) : pair
    const is = how.wrong && question.id === 'neutral' ? question.choices.find((choice) => choice !== right)! : right
    state = run(m, state, [{ type: 'answerScale', question: question.id, is }], through)
  }
  if (how.check !== false && rackView(m, state).outcome.state === 'to-check') state = run(m, state, [{ type: 'checkScale' }], through)
  return state
}

/** How a scripted learner works a sample. Careful unless told otherwise. */
export interface Technique {
  /** False to put the probe in without rinsing it first. Guided's warning is then read and gone past. */
  rinse?: boolean
  /** Name the higher of two tubes that share the sample's colour. */
  highest?: boolean
  /** An estimate to give in place of the careful one. */
  estimate?: Estimate
  /** Acid, neutral or basic to give in place of the careful one. */
  is?: Class
  /** False to leave the sample unchecked where the mode has not checked it. */
  check?: boolean
}

/** One sample from a fresh tube: the indicator, a look, the estimate by eye, the probe rinsed, the meter read, and the check where the mode has not made it. */
export function wholeSample(m: CabbageModel, state: CabbageState, thing: ThingId, how: Technique = {}, through: Through = same): CabbageState {
  state = run(m, state, [{ type: 'addIndicator', thing }, { type: 'look', thing }], through)
  const estimate = how.estimate ?? byEye(rackView(m, state), sampleView(m, state, thing), how.highest)
  state = run(m, state, [{ type: 'estimate', thing, is: estimate }], through)
  if (estimate !== CANNOT_SAY) state = run(m, state, [{ type: 'classify', thing, is: how.is ?? classOf(estimate) }], through)
  if (how.rinse !== false && can(m, state, { type: 'rinse' }) === null) state = run(m, state, [{ type: 'rinse' }], through)
  state = run(m, state, [{ type: 'read', thing }], through)
  // Guided warned and read nothing: the learner reads all the same.
  if (sampleView(m, state, thing).warning) state = run(m, state, [{ type: 'read', thing }], through)
  if (how.check !== false && sampleView(m, state, thing).outcome.state === 'to-check') state = run(m, state, [{ type: 'checkSample', thing }], through)
  return state
}

/** The second part, careful: the things in the bench's order until enough count. `skip` leaves things out. */
export function wholeThings(m: CabbageModel, state: CabbageState, through: Through = same, skip: readonly ThingId[] = []): CabbageState {
  for (const thing of THING_IDS) {
    if (state.counted.length >= m.neededToCount) break
    if (!skip.includes(thing)) state = wholeSample(m, state, thing, {}, through)
  }
  return state
}

/** The last part, careful: each question answered from the two readings on the page. */
export function wholeUnit(m: CabbageModel, state: CabbageState, how: { wrong?: boolean; check?: boolean } = {}, through: Through = same): CabbageState {
  unitView(m, state).questions.forEach((question, i) => {
    const [a, b] = question.items
    const units = Math.abs(a.tenths - b.tenths) / 10
    const answer = { more: (a.tenths < b.tenths ? 0 : 1) as 0 | 1, power: how.wrong && i === 1 ? (units === 1 ? 2 : 1) : units }
    state = run(m, state, [{ type: 'answerUnit', question: i as 0 | 1, answer }], through)
  })
  if (how.check !== false && unitView(m, state).outcome.state === 'to-check') state = run(m, state, [{ type: 'checkUnit' }], through)
  return state
}

/** The whole lab, careful. */
export function wholeLab(m: CabbageModel, state: CabbageState, through: Through = same): CabbageState {
  return wholeUnit(m, wholeThings(m, wholeScale(m, state, {}, through), through), {}, through)
}
