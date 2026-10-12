import { isSaltId, SALT_IDS, type SaltId } from '@/chem-data/hotcold/data'
import type { HotcoldModel } from './model'
import { NO_ANSWERS, QUESTIONS, answerRight, curveOfRun, currentRun, newRun, packsAnswered, packsOpen, packsRight, readingsOf, statusOf, type HotcoldState, type Mode, type Question, type Run } from './state'
import { CHOICES, FIELDS, isChoice, verdictOf, type Entries, type Field, type Slip, type Value } from './worksheet'

// Every learner action: when it can be done, and what it does. The two salts can be run in either order, each in
// its own cup. A run goes one way: the cup first (lid, stirrer, logger, the salt, time), then the notebook, which
// opens once the curve has turned back and closes the cup. Part 3's two questions open once both runs count.

export type Action =
  | { type: 'setMode'; mode: Mode }
  | { type: 'putLidOn'; part: SaltId }
  | { type: 'stir'; part: SaltId }
  | { type: 'startLogger'; part: SaltId }
  /** The one action that starts the change: the weighed salt goes into the water. */
  | { type: 'addSalt'; part: SaltId }
  /** Let time pass: 30 seconds, which is two readings. No clock runs: this is the only way time moves. */
  | { type: 'runOn'; part: SaltId }
  /** At one reading of the graph, by its step. Stored, since a look opens an entry. */
  | { type: 'look'; part: SaltId; step: number }
  /** One entry of the notebook. Entries after it are emptied: they followed from it. */
  | { type: 'enter'; part: SaltId; field: Field; value: Value }
  /** Check the notebook and end the run. Guided does it at the last entry. */
  | { type: 'check'; part: SaltId }
  /** Abandon the salt's current run, or leave a checked one behind, and set it up again with new numbers. */
  | { type: 'runAgain'; part: SaltId }
  /** Part 3: the salt for a pack that warms, or for one that cools. */
  | { type: 'answer'; question: Question; salt: SaltId }
  /** Part 3: check the two answers. Guided does it at the second right answer. */
  | { type: 'checkPacks' }
  /** Part 3, once its answers are checked and not both right: empty them and answer again. */
  | { type: 'answerAgain' }

/** Why an action cannot be done now. The reason names what is missing, or the kind of slip an entry looks like, and never a value or an answer. */
export type Blocked =
  | 'lab-completed'
  | 'unknown-part'
  | 'already-done'
  | 'logger-not-started'
  | 'salt-not-added'
  | 'logger-full'
  | 'notebook-begun'
  | 'run-over'
  | 'nothing-there'
  | 'not-turned'
  | 'not-looked'
  | 'entry-above-missing'
  | 'invalid-entry'
  | 'notebook-not-full'
  | 'nothing-to-repeat'
  /** Part 3. */
  | 'runs-not-done'
  | 'not-a-question'
  | 'not-a-salt'
  | 'packs-checked'
  | 'packs-not-answered'
  | 'nothing-to-answer-again'
  /** Guided only: a temperature that is not the one the logger shows, an entry that does not follow from the ones above it, and an answer to part 3 that is not right. */
  | 'not-the-logger'
  | 'does-not-follow'
  | 'not-right'
  | Slip

/** A technique step about to be skipped. Guided mode asks before going on; Challenge mode does not look. */
export type Warning = 'lid-off' | 'not-stirring'

const begun = (run: Run) => Object.values(run.entries).some((entry) => entry !== null)

/** True for a value of the kind a field takes. Not negative zero: JSON writes it as 0, so a state that stored it would not come back from a reload as it went in. */
function isValueOf(field: Field, value: unknown): boolean {
  const whole = (n: unknown, low: number): n is number => Number.isSafeInteger(n) && (n as number) >= low && (n as number) <= 9999 && !Object.is(n, -0)
  if (isChoice(field)) return (CHOICES[field] as readonly unknown[]).includes(value)
  return whole(value, field === 'change' ? -9999 : 0)
}

/**
 * Why an entry cannot be made now, whatever is entered: null when its field is open. The notebook opens when the
 * salt has been added and the curve has turned back; the starting temperature, when a reading before the salt has
 * been looked at; the highest or lowest, when a reading that shows it has been (spec 26.2).
 */
export function entryBlocked(m: HotcoldModel, state: HotcoldState, part: SaltId, field: Field): Blocked | null {
  const run = currentRun(state, part)
  if (state.status === 'completed') return 'lab-completed'
  if (run.closed) return 'run-over'
  if (run.changedAt === null) return 'salt-not-added'
  const shown = readingsOf(m, state.seed, part, run)
  const curve = curveOfRun(run, shown)
  if (curve === null || !curve.turned) return 'not-turned'
  if (FIELDS.slice(0, FIELDS.indexOf(field)).some((above) => run.entries[above] === null)) return 'entry-above-missing'
  const { changedAt } = run
  if (field === 'start' && !run.looked.some((at) => at <= changedAt)) return 'not-looked'
  if (field === 'extreme' && !run.looked.some((at) => at > changedAt && shown[at] === curve.extreme)) return 'not-looked'
  return null
}

/** The entries with one made: the fields after it emptied, since they followed from it. */
function entered(entries: Entries, field: Field, value: Value): Entries {
  const after = Object.fromEntries(FIELDS.slice(FIELDS.indexOf(field) + 1).map((later) => [later, null]))
  return { ...entries, ...after, [field]: value }
}

/** Part 3's actions: when each can be done. */
function canPacks(m: HotcoldModel, state: HotcoldState, action: Extract<Action, { type: 'answer' | 'checkPacks' | 'answerAgain' }>): Blocked | null {
  if (!packsOpen(m, state)) return 'runs-not-done'
  const { packs } = state
  switch (action.type) {
    case 'answer':
      if (!QUESTIONS.includes(action.question)) return 'not-a-question'
      if (!isSaltId(action.salt)) return 'not-a-salt'
      if (packs.checked) return 'packs-checked'
      // Guided checks each answer as it is given (spec 26.2).
      return state.mode === 'guided' && !answerRight(m, action.question, action.salt) ? 'not-right' : null
    case 'checkPacks':
      if (packs.checked) return 'packs-checked'
      return packsAnswered(packs) ? null : 'packs-not-answered'
    case 'answerAgain':
      return packs.checked && !packsRight(m, packs) ? null : 'nothing-to-answer-again'
  }
}

/** null when the action can be done now; otherwise the first reason that applies. */
export function can(m: HotcoldModel, state: HotcoldState, action: Action): Blocked | null {
  if (action.type === 'setMode') return null
  if (state.status === 'completed') return 'lab-completed'
  if (action.type === 'answer' || action.type === 'checkPacks' || action.type === 'answerAgain') return canPacks(m, state, action)
  if (!SALT_IDS.includes(action.part)) return 'unknown-part'
  const run = currentRun(state, action.part)
  switch (action.type) {
    case 'runAgain':
      return run.logger ? null : 'nothing-to-repeat'
    case 'check':
      if (run.closed) return 'run-over'
      return FIELDS.every((field) => run.entries[field] !== null) ? null : 'notebook-not-full'
    case 'look':
      if (!run.logger) return 'logger-not-started'
      return Number.isSafeInteger(action.step) && action.step >= 0 && action.step <= run.steps && !Object.is(action.step, -0) ? null : 'nothing-there'
    case 'enter': {
      if (!FIELDS.includes(action.field)) return 'invalid-entry'
      const blocked = entryBlocked(m, state, action.part, action.field)
      if (blocked) return blocked
      if (!isValueOf(action.field, action.value)) return 'invalid-entry'
      if (state.mode !== 'guided') return null
      // Guided checks each entry as it is made (spec 26.2).
      const verdict = verdictOf(m, curveOfRun(run, readingsOf(m, state.seed, action.part, run))!, entered(run.entries, action.field, action.value), action.field)
      if (verdict === null || verdict.follows) return null
      return verdict.slip ?? (action.field === 'start' || action.field === 'extreme' ? 'not-the-logger' : 'does-not-follow')
    }
  }
  // What is left is done to the cup, which the notebook closes.
  if (run.closed) return 'run-over'
  if (begun(run)) return 'notebook-begun'
  switch (action.type) {
    case 'putLidOn':
      return run.lidFrom !== null ? 'already-done' : null
    case 'stir':
      return run.stirFrom !== null ? 'already-done' : null
    case 'startLogger':
      return run.logger ? 'already-done' : null
    case 'addSalt':
      if (!run.logger) return 'logger-not-started'
      return run.changedAt !== null ? 'already-done' : null
    case 'runOn':
      if (!run.logger) return 'logger-not-started'
      return run.steps + m.runOnSteps > m.maxSteps ? 'logger-full' : null
  }
}

/**
 * The technique steps this action would skip. Empty when there are none, when the action is blocked anyway, and
 * in Challenge. In Guided, adding the salt with the lid off or the stirrer still: the page asks first, and the
 * same action sent again is the way on.
 */
export function warnings(m: HotcoldModel, state: HotcoldState, action: Action): Warning[] {
  if (state.mode !== 'guided' || action.type !== 'addSalt' || can(m, state, action) !== null) return []
  const run = currentRun(state, action.part)
  return [...(run.lidFrom === null ? (['lid-off'] as const) : []), ...(run.stirFrom === null ? (['not-stirring'] as const) : [])]
}

/** The state after an action. An action that cannot be done now, or that changes nothing, returns the very same object. */
export function reduce(m: HotcoldModel, state: HotcoldState, action: Action): HotcoldState {
  if (can(m, state, action) !== null) return state
  if (action.type === 'setMode') return action.mode === state.mode ? state : { ...state, mode: action.mode }
  const settled = (next: HotcoldState): HotcoldState => ({ ...next, status: statusOf(m, next) })
  if (action.type === 'answer') {
    if (state.packs[action.question] === action.salt) return state
    const packs = { ...state.packs, [action.question]: action.salt }
    // In Guided every answer was checked as it was given, so the second right one checks the part. An answer Challenge took and that is not right stays unchecked until it is changed.
    return settled({ ...state, packs: { ...packs, checked: state.mode === 'guided' && packsRight(m, packs) } })
  }
  if (action.type === 'checkPacks') return settled({ ...state, packs: { ...state.packs, checked: true } })
  if (action.type === 'answerAgain') return settled({ ...state, packs: NO_ANSWERS })
  const { part } = action
  const run = currentRun(state, part)
  const withRuns = (runs: Run[]): HotcoldState => {
    const next = { ...state, runs: { ...state.runs, [part]: runs } }
    // A salt run again once part 3 is answered leaves the answers as they are: the part stays done, since a run of each salt still counts.
    return settled(next)
  }
  const withRun = (patch: Partial<Run>) => withRuns([...state.runs[part].slice(0, -1), { ...run, ...patch }])
  switch (action.type) {
    case 'putLidOn':
      return withRun({ lidFrom: run.steps })
    case 'stir':
      return withRun({ stirFrom: run.steps })
    case 'startLogger':
      return withRun({ logger: true })
    case 'addSalt':
      return withRun({ changedAt: run.steps })
    case 'runOn':
      return withRun({ steps: run.steps + m.runOnSteps })
    case 'look':
      return run.looked.includes(action.step) ? state : withRun({ looked: [...run.looked, action.step] })
    case 'enter': {
      const entries = entered(run.entries, action.field, action.value)
      // In Guided every entry was checked as it was made, so the last one checks the notebook.
      return withRun({ entries, closed: state.mode === 'guided' && FIELDS.every((field) => entries[field] !== null) })
    }
    case 'check':
      return withRun({ closed: true })
    case 'runAgain':
      return withRuns([...state.runs[part], newRun(state.runs[part].length)])
  }
}
