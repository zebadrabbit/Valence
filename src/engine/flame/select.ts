import type { FlameData } from '@/chem-data/flame/data'
import { expectedObservation, wrongAnswers, type Observation, type Question } from './check'
import { flameOf, isClean, spectrumOf, uncleanCause, type Flame, type Seen } from './loop'
import { allStationsDone, openQuestions, stationDone, type FlameState } from './state'

// Everything the app shows of the lab's progress, worked out from the stored record. The wording is the app's:
// these hand over identifiers, and what the record stores to be drawn.

export interface StationView {
  /** What the flame shows for the loop as it was last held here; null before the first hold. */
  flame: Flame | null
  /** What the spectroscope shows for it, along the scale. */
  spectrum: Seen[]
  /** What has been looked at since that hold. */
  looked: string[]
  /** Which questions are open: each once what it asks about has been looked at. */
  open: Record<Question, boolean>
  /** The observation last recorded. */
  observation: Observation | null
  /** Whether it was made with a clean loop: null while nothing is recorded. An observation that was not, does not count, whatever it holds. */
  counts: boolean | null
  /** Why it does not count: the loop had been handled and never cleaned, it still carried these other salts, or both. */
  cause: { handled: boolean; carried: string[] } | null
  /** The questions answered wrongly; null while nothing is recorded or what is recorded does not count, empty when the observation is correct. */
  wrong: Question[] | null
  /** Whether the hints and what a correct observation holds are shown (spec 15.2): from the start in Guided, and in Challenge once the learner has recorded an observation of their own that counts. One made with a loop that was not clean hands nothing over, or the answers could be had for a careless dip. */
  guidanceShown: boolean
  /** What a correct observation holds, where that is shown; null where it is not, so that a page cannot show it by mistake. */
  expected: Observation | null
  /** The observation is correct and was made with a clean loop. */
  done: boolean
}

export function stationView(data: FlameData, state: FlameState, stationId: string): StationView {
  const station = state.stations[data.salts.findIndex((salt) => salt.id === stationId)]
  if (!station) throw new Error(`no station "${stationId}"`)
  const recorded = station.observation
  const { loop = [], ...observation } = recorded ?? {}
  const counts = recorded === null ? null : isClean(loop, stationId)
  const guidanceShown = state.mode === 'guided' || counts === true
  return {
    flame: station.held === null ? null : flameOf(data, station.held),
    spectrum: station.held === null ? [] : spectrumOf(data, station.held),
    looked: station.looked,
    open: openQuestions(data, station),
    observation: recorded === null ? null : (observation as Observation),
    counts,
    cause: counts === false ? uncleanCause(loop, stationId) : null,
    wrong: counts ? wrongAnswers(data, stationId, observation as Observation) : null,
    guidanceShown,
    expected: guidanceShown ? expectedObservation(data, stationId) : null,
    done: stationDone(data, stationId, station),
  }
}

/** The ids of the stations that are done, in the stations' order. */
export const doneStations = (data: FlameData, state: FlameState): string[] => data.salts.filter((salt, i) => stationDone(data, salt.id, state.stations[i]!)).map((salt) => salt.id)

/** The closing question: whether it can be answered yet (all six stations done), the answer last given, and whether that is right. Never the answer itself. */
export function closingView(data: FlameData, state: FlameState): { open: boolean; answer: string | null; correct: boolean | null } {
  return { open: allStationsDone(data, state.stations), answer: state.closing, correct: state.closing === null ? null : state.closing === data.closing.answer.value }
}
