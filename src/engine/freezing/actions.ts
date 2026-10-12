import { PART_IDS, type PartId } from '@/chem-data/freezing/data'
import { isSig3 } from './entries'
import type { FreezingModel } from './model'
import { benchOf, currentRun, newRun, readingsOf, shownOf, statesOf, statusOf, type FreezingState, type Mode, type Run } from './state'
import { FIELDS, kindOf, verdictOf, type Entries, type Field, type Slip, type Value } from './worksheet'

// Every learner action: when it can be done, and what it does. The three parts can be worked in any order, each
// on its own cup. A run goes one way: the cup first (ice and water, lid, stirrer, logger, the solute, time, the
// strainer, the balance), then the notebook, which opens once the solution is weighed (in part 1, once the logger
// is started) and closes the cup.

export type Action =
  | { type: 'setMode'; mode: Mode }
  /** Put the ice and the water in the cup. */
  | { type: 'fill'; part: PartId }
  | { type: 'putLidOn'; part: PartId }
  | { type: 'stir'; part: PartId }
  | { type: 'startLogger'; part: PartId }
  /** Part 3: which solute this run dissolves, before it goes in. */
  | { type: 'chooseSolute'; part: PartId; solute: string }
  /** Add the weighed solute: the unknown liquid in part 2, the chosen solute in part 3. */
  | { type: 'addSolute'; part: PartId }
  /** Let time pass: a minute, which is two readings. No clock runs: this is the only way time moves. */
  | { type: 'runOn'; part: PartId }
  /** Pour the cup through the strainer into the second cup, which holds back the ice. The logger takes no reading after it. */
  | { type: 'strain'; part: PartId }
  /** Weigh the solution: what was strained into the second cup, or, unstrained, everything in the cup. */
  | { type: 'weigh'; part: PartId }
  /** At one reading of the graph, by its step. Stored, since a look opens an entry. */
  | { type: 'look'; part: PartId; step: number }
  /** One entry of the notebook. Entries after it are emptied: they were worked from it. */
  | { type: 'enter'; part: PartId; field: Field; value: Value }
  /** Check the notebook and end the run. Guided does it at the last entry. */
  | { type: 'check'; part: PartId }
  /** Abandon the part's current run, or leave a checked one behind, and set the part up again with new numbers. */
  | { type: 'runAgain'; part: PartId }

/** Why an action cannot be done now. The reason names what is missing, or the kind of slip an entry looks like, and never a value. */
export type Blocked =
  | 'lab-completed'
  | 'unknown-part'
  | 'already-done'
  | 'cup-empty'
  | 'logger-not-started'
  | 'no-solute-chosen'
  | 'unknown-solute'
  | 'solute-in'
  | 'solute-not-added'
  | 'no-reading-since'
  | 'logger-full'
  | 'cup-strained'
  | 'cup-weighed'
  | 'worksheet-begun'
  | 'run-over'
  | 'nothing-there'
  | 'not-weighed'
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

/**
 * An error of technique about to be made (spec 23.2). Guided mode asks before going on; Challenge mode does not
 * look. The lid off and the stirrer still are how two of the three errors come about, and are warned of by name.
 */
export type Warning = 'lid-off' | 'not-stirring' | 'not-level' | 'little-ice' | 'no-ice' | 'not-strained'

const begun = (run: Run) => Object.values(run.entries).some((entry) => entry !== null)

/** Part 3 stays open once the lab is complete, so that the other salts can still be tried (spec 23.1); the other two parts are then read and not worked. */
const frozen = (state: FreezingState, part: PartId) => state.status === 'completed' && part !== 'particles'

/** True for a value of the kind a field takes. Not negative zero: JSON writes it as 0, so a state that stored it would not come back from a reload as it went in. */
function isValueOf(m: FreezingModel, field: Field, value: unknown): boolean {
  const whole = (n: unknown, low: number, high: number): n is number => Number.isSafeInteger(n) && (n as number) >= low && (n as number) <= high && !Object.is(n, -0)
  switch (kindOf(field)) {
    case 'temperature':
      return whole(value, -9999, 9999)
    case 'kilograms':
      return whole(value, 0, 999999)
    case 'choice':
      return m.liquids.some((c) => c.id === value)
    case 'figures':
      return isSig3(value)
  }
}

/**
 * Why an entry cannot be made now, whatever is typed: null when its field is open. In part 1 the notebook opens
 * when the logger is started; in parts 2 and 3, when the solution has been weighed. The first temperature opens
 * when a reading that shows the level before the solute has been looked at (in part 1, the latest level), and the
 * second when a reading after the solute that shows the last one has been (spec 23.2).
 */
export function entryBlocked(m: FreezingModel, state: FreezingState, part: PartId, field: Field): Blocked | null {
  const run = currentRun(state, part)
  const fields = FIELDS[part]
  if (frozen(state, part)) return 'lab-completed'
  if (run.closed) return 'run-over'
  if (!fields.includes(field)) return 'not-this-part'
  if (!run.logger) return 'logger-not-started'
  if (part !== 'water' && run.weighedAt === null) return 'not-weighed'
  if (fields.slice(0, fields.indexOf(field)).some((above) => run.entries[above] === null)) return 'entry-above-missing'
  const readings = readingsOf(m, state.seed, part, run)
  const shown = shownOf(part, run, readings)!
  const until = run.addedAt ?? run.steps
  if (field === 'water' && !run.looked.some((at) => at <= until && readings[at] === shown.water)) return 'not-looked'
  if (field === 'solution' && !run.looked.some((at) => at > until && readings[at] === shown.solution)) return 'not-looked'
  return null
}

/** null when the action can be done now; otherwise the first reason that applies. */
export function can(m: FreezingModel, state: FreezingState, action: Action): Blocked | null {
  if (action.type === 'setMode') return null
  if (!PART_IDS.includes(action.part)) return 'unknown-part'
  if (frozen(state, action.part)) return 'lab-completed'
  const { part } = action
  const run = currentRun(state, part)
  switch (action.type) {
    case 'runAgain':
      return run.filled || run.solute !== null ? null : 'nothing-to-repeat'
    case 'check':
      if (run.closed) return 'run-over'
      return FIELDS[part].every((field) => run.entries[field] !== null) ? null : 'worksheet-not-full'
    case 'look':
      if (!run.logger) return 'logger-not-started'
      return Number.isSafeInteger(action.step) && action.step >= 0 && action.step <= run.steps && !Object.is(action.step, -0) ? null : 'nothing-there'
    case 'enter': {
      const blocked = entryBlocked(m, state, part, action.field)
      if (blocked) return blocked
      if (!isValueOf(m, action.field, action.value)) return 'invalid-entry'
      if (state.mode !== 'guided') return null
      // Guided checks each entry as it is made (spec 23.2).
      const verdict = verdictOf(m, part, benchOf(m, state.seed, part, run), shownOf(part, run, readingsOf(m, state.seed, part, run))!, entered(run.entries, part, action.field, action.value), action.field)
      if (verdict === null || verdict.follows) return null
      return verdict.slip ?? (action.field === 'water' || action.field === 'solution' ? 'not-the-logger' : 'does-not-follow')
    }
  }
  // What is left is done to the cup, which the notebook closes and the balance ends.
  if (run.closed) return 'run-over'
  if (begun(run)) return 'worksheet-begun'
  if (run.weighedAt !== null) return 'cup-weighed'
  switch (action.type) {
    case 'fill':
      return run.filled ? 'already-done' : null
    case 'chooseSolute':
      if (part !== 'particles') return 'not-this-part'
      if (run.addedAt !== null) return 'solute-in'
      return m.solutes.some((s) => s.id === action.solute) ? null : 'unknown-solute'
    case 'putLidOn':
    case 'stir':
      if (!run.filled) return 'cup-empty'
      if (run.strainedAt !== null) return 'cup-strained'
      return (action.type === 'stir' ? run.stirFrom : run.lidFrom) !== null ? 'already-done' : null
    case 'startLogger':
      if (!run.filled) return 'cup-empty'
      return run.logger ? 'already-done' : null
    case 'addSolute':
      if (part === 'water') return 'not-this-part'
      if (!run.logger) return 'logger-not-started'
      if (part === 'particles' && run.solute === null) return 'no-solute-chosen'
      return run.addedAt !== null ? 'already-done' : null
    case 'runOn':
      if (!run.logger) return 'logger-not-started'
      if (run.strainedAt !== null) return 'cup-strained'
      return run.steps + m.runOnSteps > m.maxSteps ? 'logger-full' : null
    case 'strain':
    case 'weigh':
      if (part === 'water') return 'not-this-part'
      if (run.addedAt === null) return 'solute-not-added'
      if (action.type === 'strain' && run.strainedAt !== null) return 'already-done'
      // A cup strained or weighed at the very reading the solute went in after has no reading of the solution.
      return run.steps === run.addedAt ? 'no-reading-since' : null
  }
}

/**
 * The errors of technique this action would make or lead to. Empty when there are none, when the action is
 * blocked anyway, and in Challenge. In Guided the page asks first, and the same action sent again is the way on.
 * Starting the logger or adding the solute with the lid off or the stirrer still; adding the solute, straining,
 * or in part 1 entering the reading, before the temperature has levelled off or with no ice left; running on with
 * little ice left; weighing without straining.
 */
export function warnings(m: FreezingModel, state: FreezingState, action: Action): Warning[] {
  if (state.mode !== 'guided' || action.type === 'setMode' || can(m, state, action) !== null) return []
  const { part } = action
  const run = currentRun(state, part)
  const cup = statesOf(m, state.seed, part, run)[run.steps]
  const lid = run.lidFrom === null ? (['lid-off'] as const) : []
  const stirrer = run.stirFrom === null ? (['not-stirring'] as const) : []
  const reading = cup === undefined ? [] : cup.iceMg === 0 ? (['no-ice'] as const) : cup.level ? [] : (['not-level'] as const)
  switch (action.type) {
    case 'startLogger':
      return [...lid, ...stirrer]
    case 'addSolute':
      return [...lid, ...stirrer, ...reading]
    case 'strain':
      return [...reading]
    case 'weigh':
      return run.strainedAt === null ? ['not-strained'] : []
    case 'runOn':
      return cup !== undefined && cup.iceMg > 0 && cup.iceMg <= m.iceLowCg * 10 ? ['little-ice'] : []
    case 'enter':
      return part === 'water' && action.field === 'water' ? [...reading] : []
    default:
      return []
  }
}

/** The entries with one made: the fields after it emptied, since they were worked from it. */
function entered(entries: Entries, part: PartId, field: Field, value: Value): Entries {
  const fields = FIELDS[part]
  const after = Object.fromEntries(fields.slice(fields.indexOf(field) + 1).map((later) => [later, null]))
  return { ...entries, ...after, [field]: value }
}

/** The state after an action. An action that cannot be done now, or that changes nothing, returns the very same object. */
export function reduce(m: FreezingModel, state: FreezingState, action: Action): FreezingState {
  if (can(m, state, action) !== null) return state
  if (action.type === 'setMode') return action.mode === state.mode ? state : { ...state, mode: action.mode }
  const { part } = action
  const run = currentRun(state, part)
  const withRuns = (runs: Run[]): FreezingState => {
    const next = { ...state, parts: { ...state.parts, [part]: runs } }
    return { ...next, status: statusOf(m, next) }
  }
  const withRun = (patch: Partial<Run>) => withRuns([...state.parts[part].slice(0, -1), { ...run, ...patch }])
  switch (action.type) {
    case 'fill':
      return withRun({ filled: true })
    case 'chooseSolute':
      return action.solute === run.solute ? state : withRun({ solute: action.solute })
    case 'putLidOn':
      return withRun({ lidFrom: run.steps })
    case 'stir':
      return withRun({ stirFrom: run.steps })
    case 'startLogger':
      return withRun({ logger: true })
    case 'addSolute':
      return withRun({ addedAt: run.steps })
    case 'runOn':
      return withRun({ steps: run.steps + m.runOnSteps })
    case 'strain':
      return withRun({ strainedAt: run.steps })
    case 'weigh':
      return withRun({ weighedAt: run.steps })
    case 'look':
      return run.looked.includes(action.step) ? state : withRun({ looked: [...run.looked, action.step] })
    case 'enter': {
      const entries = entered(run.entries, part, action.field, action.value)
      // In Guided every entry was checked as it was made, so the last one checks the notebook.
      return withRun({ entries, closed: state.mode === 'guided' && FIELDS[part].every((field) => entries[field] !== null) })
    }
    case 'check':
      return withRun({ closed: true })
    case 'runAgain':
      return withRuns([...state.parts[part], newRun(state.parts[part].length)])
  }
}
