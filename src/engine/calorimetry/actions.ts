import { PART_IDS, type PartId } from '@/chem-data/calorimetry/data'
import { isSig3 } from './entries'
import type { CalorimetryModel } from './model'
import { runSetup } from './setup'
import { curveOf, currentRun, newRun, readingsOf, statusOf, type CalorimetryState, type Mode, type Run } from './state'
import { FIELDS, verdictOf, type Entries, type Field, type Slip, type Value } from './worksheet'

// Every learner action: when it can be done, and what it does. The three parts can be worked in any order, each
// on its own cup. A run goes one way: the cup first (lid, stirrer, logger, the change, time), then the worksheet,
// which opens once the curve has turned back and closes the cup.

export type Action =
  | { type: 'setMode'; mode: Mode }
  | { type: 'putLidOn'; part: PartId }
  | { type: 'stir'; part: PartId }
  | { type: 'startLogger'; part: PartId }
  /** The one action that starts the change: pour in the second solution, add the solid, add the hot metal (spec 16.2). */
  | { type: 'startChange'; part: PartId }
  /** Let time pass: 30 seconds, which is two readings. No clock runs: this is the only way time moves. */
  | { type: 'runOn'; part: PartId }
  /** At one reading of the graph, by its step. Stored, since a look opens an entry. */
  | { type: 'look'; part: PartId; step: number }
  /** One entry of the worksheet. Entries after it are emptied: they were worked from it. */
  | { type: 'enter'; part: PartId; field: Field; value: Value }
  /** Check the worksheet and end the run. Guided does it at the last entry. */
  | { type: 'check'; part: PartId }
  /** Abandon the part's current run, or leave a checked one behind, and set the part up again with new numbers. */
  | { type: 'runAgain'; part: PartId }

/** Why an action cannot be done now. The reason names what is missing, or the kind of slip an entry looks like, and never a value. */
export type Blocked =
  | 'lab-completed'
  | 'unknown-part'
  | 'already-done'
  | 'logger-not-started'
  | 'change-not-started'
  | 'logger-full'
  | 'worksheet-begun'
  | 'run-over'
  | 'nothing-there'
  | 'not-turned'
  | 'not-looked'
  | 'not-this-part'
  | 'entry-above-missing'
  | 'invalid-entry'
  | 'worksheet-not-full'
  | 'nothing-to-repeat'
  /** Guided only: a temperature that is not the one the logger shows, and an entry that does not follow from the ones above it. */
  | 'not-the-logger'
  | 'does-not-follow'
  | Slip

/** A technique step about to be skipped. Guided mode asks before going on; Challenge mode does not look. */
export type Warning = 'lid-off' | 'not-stirring'

const begun = (run: Run) => Object.values(run.entries).some((entry) => entry !== null)

/** True for a value of the kind a field takes. Not negative zero: JSON writes it as 0, so a state that stored it would not come back from a reload as it went in. */
function isValueOf(m: CalorimetryModel, field: Field, value: unknown): boolean {
  const whole = (n: unknown, low: number): n is number => Number.isSafeInteger(n) && (n as number) >= low && (n as number) <= 9999 && !Object.is(n, -0)
  switch (field) {
    case 'start':
    case 'extreme':
      return whole(value, 0)
    case 'change':
      return whole(value, -9999)
    case 'direction':
      return value === 'out' || value === 'in'
    case 'metal':
      return m.candidates.some((c) => c.id === value)
    default:
      return isSig3(value)
  }
}

/**
 * Why an entry cannot be made now, whatever is typed: null when its field is open. The worksheet opens when the
 * change has been started and the curve has turned back; the starting temperature, when a reading before the
 * change has been looked at; the highest or lowest, when a reading that shows it has been (spec 16.2).
 */
export function entryBlocked(m: CalorimetryModel, state: CalorimetryState, part: PartId, field: Field): Blocked | null {
  const run = currentRun(state, part)
  const fields = FIELDS[part]
  if (state.status === 'completed') return 'lab-completed'
  if (run.closed) return 'run-over'
  if (!fields.includes(field)) return 'not-this-part'
  if (run.changedAt === null) return 'change-not-started'
  const shown = readingsOf(m, state.seed, part, run)
  const curve = curveOf(run, shown)
  if (curve === null || !curve.turned) return 'not-turned'
  if (fields.slice(0, fields.indexOf(field)).some((above) => run.entries[above] === null)) return 'entry-above-missing'
  const { changedAt } = run
  if (field === 'start' && !run.looked.some((at) => at <= changedAt)) return 'not-looked'
  if (field === 'extreme' && !run.looked.some((at) => at > changedAt && shown[at] === curve.extreme)) return 'not-looked'
  return null
}

/** null when the action can be done now; otherwise the first reason that applies. */
export function can(m: CalorimetryModel, state: CalorimetryState, action: Action): Blocked | null {
  if (action.type === 'setMode') return null
  if (state.status === 'completed') return 'lab-completed'
  if (!PART_IDS.includes(action.part)) return 'unknown-part'
  const run = currentRun(state, action.part)
  switch (action.type) {
    case 'runAgain':
      return run.logger ? null : 'nothing-to-repeat'
    case 'check':
      if (run.closed) return 'run-over'
      return FIELDS[action.part].every((field) => run.entries[field] !== null) ? null : 'worksheet-not-full'
    case 'look':
      if (!run.logger) return 'logger-not-started'
      return Number.isSafeInteger(action.step) && action.step >= 0 && action.step <= run.steps && !Object.is(action.step, -0) ? null : 'nothing-there'
    case 'enter': {
      const blocked = entryBlocked(m, state, action.part, action.field)
      if (blocked) return blocked
      if (!isValueOf(m, action.field, action.value)) return 'invalid-entry'
      if (state.mode !== 'guided') return null
      // Guided checks each entry as it is made (spec 16.2).
      const verdict = verdictOf(m, action.part, runSetup(m, state.seed, action.part, run.index), curveOf(run, readingsOf(m, state.seed, action.part, run))!, entered(run.entries, action.part, action.field, action.value), action.field)
      if (verdict === null || verdict.follows) return null
      return verdict.slip ?? (action.field === 'start' || action.field === 'extreme' ? 'not-the-logger' : 'does-not-follow')
    }
  }
  // What is left is done to the cup, which the worksheet closes.
  if (run.closed) return 'run-over'
  if (begun(run)) return 'worksheet-begun'
  switch (action.type) {
    case 'putLidOn':
      return run.lidFrom !== null ? 'already-done' : null
    case 'stir':
      return run.stirFrom !== null ? 'already-done' : null
    case 'startLogger':
      return run.logger ? 'already-done' : null
    case 'startChange':
      if (!run.logger) return 'logger-not-started'
      return run.changedAt !== null ? 'already-done' : null
    case 'runOn':
      if (!run.logger) return 'logger-not-started'
      return run.steps + m.runOnSteps > m.maxSteps ? 'logger-full' : null
  }
}

/**
 * The technique steps this action would skip. Empty when there are none, when the action is blocked anyway, and
 * in Challenge. In Guided, starting the change with the lid off or the stirrer still: the page asks first, and
 * the same action sent again is the way on.
 */
export function warnings(m: CalorimetryModel, state: CalorimetryState, action: Action): Warning[] {
  if (state.mode !== 'guided' || action.type !== 'startChange' || can(m, state, action) !== null) return []
  const run = currentRun(state, action.part)
  return [...(run.lidFrom === null ? (['lid-off'] as const) : []), ...(run.stirFrom === null ? (['not-stirring'] as const) : [])]
}

/** The entries with one made: the fields after it emptied, since they were worked from it. */
function entered(entries: Entries, part: PartId, field: Field, value: Value): Entries {
  const fields = FIELDS[part]
  const after = Object.fromEntries(fields.slice(fields.indexOf(field) + 1).map((later) => [later, null]))
  return { ...entries, ...after, [field]: value }
}

/** The state after an action. An action that cannot be done now, or that changes nothing, returns the very same object. */
export function reduce(m: CalorimetryModel, state: CalorimetryState, action: Action): CalorimetryState {
  if (can(m, state, action) !== null) return state
  if (action.type === 'setMode') return action.mode === state.mode ? state : { ...state, mode: action.mode }
  const { part } = action
  const run = currentRun(state, part)
  const withRuns = (runs: Run[]): CalorimetryState => {
    const next = { ...state, parts: { ...state.parts, [part]: runs } }
    return { ...next, status: statusOf(m, next) }
  }
  const withRun = (patch: Partial<Run>) => withRuns([...state.parts[part].slice(0, -1), { ...run, ...patch }])
  switch (action.type) {
    case 'putLidOn':
      return withRun({ lidFrom: run.steps })
    case 'stir':
      return withRun({ stirFrom: run.steps })
    case 'startLogger':
      return withRun({ logger: true })
    case 'startChange':
      return withRun({ changedAt: run.steps })
    case 'runOn':
      return withRun({ steps: run.steps + m.runOnSteps })
    case 'look':
      return run.looked.includes(action.step) ? state : withRun({ looked: [...run.looked, action.step] })
    case 'enter': {
      const entries = entered(run.entries, part, action.field, action.value)
      // In Guided every entry was checked as it was made, so the last one checks the worksheet.
      return withRun({ entries, closed: state.mode === 'guided' && FIELDS[part].every((field) => entries[field] !== null) })
    }
    case 'check':
      return withRun({ closed: true })
    case 'runAgain':
      return withRuns([...state.parts[part], newRun(state.parts[part].length)])
  }
}

