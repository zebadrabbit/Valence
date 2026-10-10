import { openingStation } from '@/app/lab/openingStation'
import type { StationView, closingView } from '@/engine/flame'

// What the page works out for its list of stations. Nothing here is chemistry: a station's progress is read off
// the engine's view of it.

/** How far a station has come, as the list of stations says it. */
export type Progress = 'not-started' | 'started' | 'not-counted' | 'not-correct' | 'done'

/**
 * Not started until the loop has been held in the flame there; started until an observation is recorded. An
 * observation that is recorded and does not make the station done is one of two things, and the list says which:
 * made with a loop that was not clean, or made with a clean one and not correct yet.
 */
export function progressOf(view: Pick<StationView, 'flame' | 'counts' | 'done'>): Progress {
  if (view.done) return 'done'
  if (view.counts !== null) return view.counts ? 'not-correct' : 'not-counted'
  return view.flame === null ? 'not-started' : 'started'
}

/** How far the closing question has come: it waits for the six stations, then is open, then answered, wrongly or rightly. */
export type ClosingProgress = 'waits' | 'open' | 'not-correct' | 'done'

export function closingProgressOf(closing: ReturnType<typeof closingView>): ClosingProgress {
  if (!closing.open) return 'waits'
  return closing.correct === null ? 'open' : closing.correct ? 'done' : 'not-correct'
}

/**
 * The entry of the list that the Lab tab shows when the page opens, the closing question being the one after the
 * stations: the station the learner was in the middle of, as every lab with stations finds it; once every station is done,
 * the closing question, which is then what is left to do, or where the lab was completed.
 */
export const openingEntry = (progress: readonly Progress[]): number => (progress.every((p) => p === 'done') ? progress.length : openingStation(progress))
