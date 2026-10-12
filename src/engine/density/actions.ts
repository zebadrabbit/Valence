import { PART_IDS, type PartId } from '@/chem-data/density/data'
import type { DensityModel } from './model'
import { EYES, nearEnough, type Eye } from './readings'
import { benchOf, currentRun, isBench, isValueOf, newRun, seenE3, shownNow, shownThen, statusOf, type DensityState, type Mode, type Run, type Step } from './state'
import { dependents, FIELDS, isLevel, kindOf, READ_FROM, verdictOf, WORKED_FROM, type Entries, type Field, type Slip, type Value } from './worksheet'

// Every learner action: when it can be done, and what it does. The three parts can be worked in any order, each
// at its own bench. A reading is taken while its instrument shows it; a worked-out entry is made when the entries
// it is worked from are in. Part 1 has no bench to work. In part 2 the empty cylinder is weighed, the liquid
// poured, and the cylinder weighed again. In part 3 the pieces are weighed and slid in, in the order the learner
// chooses: weighed after they have been in the water, or dropped in, they give a run that does not count.

export type Action =
  | { type: 'setMode'; mode: Mode }
  /** Bring the eye above, level with or below the liquid in the cylinder. */
  | { type: 'moveEye'; part: PartId; eye: Eye }
  /** Part 2: put the cylinder on the balance, empty at first and with the liquid once it is poured. Part 3: put the pieces on it, as they are. */
  | { type: 'weigh'; part: PartId }
  /** Part 2: pour the unknown liquid into the cylinder. */
  | { type: 'pour'; part: PartId }
  /** Part 3: put the pieces into the water, slid down the tilted cylinder or dropped in. */
  | { type: 'addPieces'; part: PartId; how: 'slide' | 'drop' }
  /** One entry of the notebook: a reading, a worked-out number or the unknown's name. Entries worked from it are emptied. */
  | { type: 'enter'; part: PartId; field: Field; value: Value }
  /** Check the notebook and end the run. Guided does it at the last entry. */
  | { type: 'check'; part: PartId }
  /** Abandon the part's current run, or leave a checked one behind, and set the part up again with new numbers. */
  | { type: 'runAgain'; part: PartId }

/** Why an action cannot be done now. The reason names what is missing, or the kind of slip an entry looks like, and never a value. */
export type Blocked =
  | 'lab-completed'
  | 'unknown-part'
  | 'not-this-part'
  | 'already-done'
  | 'run-over'
  | 'nothing-to-repeat'
  | 'notebook-not-full'
  | 'invalid-entry'
  /** A reading whose instrument does not show it: not yet, or no longer. */
  | 'not-shown-yet'
  | 'no-longer-shown'
  /** A worked-out entry with an entry it is worked from still empty. */
  | 'entry-above-missing'
  /** A step of the bench that would lose a reading not yet taken. */
  | 'empty-not-weighed'
  | 'reading-not-taken'
  /** Guided only: a reading that is not what its instrument shows, and an entry that does not follow from the ones it is worked from. */
  | 'not-what-is-shown'
  | 'does-not-follow'
  | Slip

/** An error of reading or of technique about to be made. Guided mode asks before going on; Challenge mode does not look. */
export type Warning = 'eye-above' | 'eye-below' | 'pieces-not-weighed' | 'dropping' | 'pieces-wet'

const begun = (run: Run) => run.bench.length > 0 || run.closed || Object.values(run.entries).some((entry) => entry !== null)

/**
 * Why an entry cannot be made now, whatever is typed: null when its field is open. A reading is open while its
 * instrument shows it; a worked-out entry, when the entries it is worked from are made.
 */
export function entryBlocked(m: DensityModel, state: DensityState, part: PartId, field: Field): Blocked | null {
  if (state.status === 'completed') return 'lab-completed'
  if (!PART_IDS.includes(part)) return 'unknown-part'
  const run = currentRun(state, part)
  if (run.closed) return 'run-over'
  if (!FIELDS[part].includes(field)) return 'not-this-part'
  if (kindOf(field) !== 'reading') return (WORKED_FROM[field] ?? []).some((from) => run.entries[from] === null) ? 'entry-above-missing' : null
  if ((shownNow(m, state.seed, part, run)[field] ?? null) !== null) return null
  return (shownThen(m, state.seed, part, run)[field] ?? null) === null ? 'not-shown-yet' : 'no-longer-shown'
}

/** The entries with one made: the fields worked from it emptied. */
function entered(entries: Entries, field: Field, value: Value): Run['entries'] {
  const after = Object.fromEntries(dependents(field).map((later) => [later, null]))
  return { ...entries, ...after, [field]: value } as Run['entries']
}

/** The step a bench action adds, and why it cannot be added now: null when it can. */
function benchStep(run: Run, action: Extract<Action, { type: 'weigh' | 'pour' | 'addPieces' }>): { step: Step; blocked: Blocked | null } {
  const { part } = action
  const bench = benchOf(part, run)
  const step: Step = action.type === 'addPieces' ? action.how : action.type
  if (part === 'reading' || (action.type === 'pour' && part !== 'liquid') || (action.type === 'addPieces' && part !== 'metal')) return { step, blocked: 'not-this-part' }
  if (action.type === 'addPieces' && action.how !== 'slide' && action.how !== 'drop') return { step, blocked: 'invalid-entry' }
  if (action.type === 'pour') {
    if (bench.poured) return { step, blocked: 'already-done' }
    if (!bench.emptyWeighed) return { step, blocked: 'empty-not-weighed' }
    // Once the liquid is in, the balance cannot show the empty cylinder again.
    return { step, blocked: run.entries.emptyMass === null ? 'reading-not-taken' : null }
  }
  if (action.type === 'addPieces') {
    if (bench.added !== 'no') return { step, blocked: 'already-done' }
    // Once the pieces are in, the water's own level is gone.
    return { step, blocked: run.entries.waterLevel === null ? 'reading-not-taken' : null }
  }
  if (part === 'liquid') return { step, blocked: bench.fullWeighed || (bench.emptyWeighed && !bench.poured) ? 'already-done' : null }
  if (bench.weighed !== 'no') return { step, blocked: 'already-done' }
  // The pieces come out of the cylinder to be weighed, and the level falls back.
  return { step, blocked: bench.added !== 'no' && run.entries.finalLevel === null ? 'reading-not-taken' : null }
}

/** null when the action can be done now; otherwise the first reason that applies. */
export function can(m: DensityModel, state: DensityState, action: Action): Blocked | null {
  if (action.type === 'setMode') return action.mode === 'guided' || action.mode === 'challenge' ? null : 'invalid-entry'
  if (state.status === 'completed') return 'lab-completed'
  if (!PART_IDS.includes(action.part)) return 'unknown-part'
  const { part } = action
  const run = currentRun(state, part)
  switch (action.type) {
    case 'runAgain':
      return begun(run) ? null : 'nothing-to-repeat'
    case 'check':
      if (run.closed) return 'run-over'
      return FIELDS[part].every((field) => run.entries[field] !== null) ? null : 'notebook-not-full'
    case 'moveEye':
      if (run.closed) return 'run-over'
      return EYES.includes(action.eye) ? null : 'invalid-entry'
    case 'enter': {
      const { field, value } = action
      const blocked = entryBlocked(m, state, part, field)
      if (blocked) return blocked
      // A level is read from where the eye is: the action cannot say otherwise.
      if (!isValueOf(m, field, value) || (isLevel(value) && value.eye !== run.eye)) return 'invalid-entry'
      if (state.mode !== 'guided') return null
      // Guided checks each entry as it is made (spec 22.3). A reading is held to what its scale shows from where the eye is, so a level read from above or below can be taken: the warning comes first, and the run then does not count.
      const instrument = READ_FROM[field]
      if (instrument !== undefined) {
        const at = shownNow(m, state.seed, part, run)[field]!
        const reading = isLevel(value) ? value.value : (value as number)
        return nearEnough(m, instrument, reading, isLevel(value) ? seenE3(m, at, value.eye) : at) ? null : 'not-what-is-shown'
      }
      const verdict = verdictOf(m, shownThen(m, state.seed, part, run), entered(run.entries, field, value), field)
      return verdict === null || verdict.follows ? null : (verdict.slip ?? 'does-not-follow')
    }
    default: {
      if (run.closed) return 'run-over'
      const { step, blocked } = benchStep(run, action)
      return blocked ?? (isBench(part, [...run.bench, step]) ? null : 'already-done')
    }
  }
}

/**
 * The errors this action would make. Empty when there are none, when the action is blocked anyway, and in
 * Challenge. In Guided: a level read with the eye above it or below it; the pieces put in before they are
 * weighed, or dropped in; the wet pieces weighed. The page asks first, and the same action sent again is the way
 * on.
 */
export function warnings(m: DensityModel, state: DensityState, action: Action): Warning[] {
  if (state.mode !== 'guided' || action.type === 'setMode' || can(m, state, action) !== null) return []
  const run = currentRun(state, action.part)
  const bench = benchOf(action.part, run)
  switch (action.type) {
    case 'enter':
      return isLevel(action.value) && action.value.eye !== 'level' ? [action.value.eye === 'above' ? 'eye-above' : 'eye-below'] : []
    case 'addPieces':
      return [...(bench.weighed === 'no' ? (['pieces-not-weighed'] as const) : []), ...(action.how === 'drop' ? (['dropping'] as const) : [])]
    case 'weigh':
      return action.part === 'metal' && bench.added !== 'no' ? ['pieces-wet'] : []
    default:
      return []
  }
}

/** The state after an action. An action that cannot be done now, or that changes nothing, returns the very same object. */
export function reduce(m: DensityModel, state: DensityState, action: Action): DensityState {
  if (can(m, state, action) !== null) return state
  if (action.type === 'setMode') return action.mode === state.mode ? state : { ...state, mode: action.mode }
  const { part } = action
  const run = currentRun(state, part)
  const withRuns = (runs: Run[]): DensityState => {
    const next = { ...state, parts: { ...state.parts, [part]: runs } }
    return { ...next, status: statusOf(m, next) }
  }
  const withRun = (patch: Partial<Run>) => withRuns([...state.parts[part].slice(0, -1), { ...run, ...patch }])
  switch (action.type) {
    case 'moveEye':
      return action.eye === run.eye ? state : withRun({ eye: action.eye })
    case 'weigh':
    case 'pour':
      return withRun({ bench: [...run.bench, action.type] })
    case 'addPieces':
      return withRun({ bench: [...run.bench, action.how] })
    case 'enter': {
      const entries = entered(run.entries, action.field, action.value)
      // In Guided every entry was checked as it was made, so the last one checks the notebook.
      return withRun({ entries, closed: state.mode === 'guided' && FIELDS[part].every((field) => entries[field] !== null) })
    }
    case 'check':
      return withRun({ closed: true })
    case 'runAgain':
      return withRuns([...state.parts[part], newRun(state.parts[part].length)])
  }
}
