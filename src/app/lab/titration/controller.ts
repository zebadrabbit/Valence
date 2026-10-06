import { can, warnings, type Action, type Blocked, type TitrationModel, type TitrationState, type Warning } from '@/engine/titration'
import type { BenchView } from './benchView'

// The page's decisions, as pure functions: what it does with an action, and which reading the bench's one field
// stands for. Every rule in them is the engine's.

export type Decision =
  | { kind: 'do'; action: Action }
  /** Guided only: every warning the action raises. */
  | { kind: 'ask'; action: Action; warnings: Warning[] }
  | { kind: 'refuse'; reason: Blocked }

/**
 * What the page does with an action: refuse it with the engine's reason, ask first in Guided, or do it.
 * `confirmed` is true once the learner has been asked and has gone on.
 */
export function decide(m: TitrationModel, state: TitrationState, action: Action, confirmed: boolean): Decision {
  const reason = can(m, state, action)
  if (reason !== null) return { kind: 'refuse', reason }
  const raised = state.mode === 'guided' && !confirmed ? warnings(m, state, action) : []
  return raised.length > 0 ? { kind: 'ask', action, warnings: raised } : { kind: 'do', action }
}

/** The reading action the bench's field stands for now, from the view; null while no reading can be recorded. */
export function readingAction(view: BenchView, readingUl: number): Action | null {
  if (view.readingBlocked !== null) return null
  return { type: view.readingWanted === 'initial' ? 'recordInitialReading' : 'recordFinalReading', readingUl }
}
