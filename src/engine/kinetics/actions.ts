import { runOf, type KineticsModel } from './model'
import { fieldsOf, kindOf, SHEET_IDS, verdictOf, type Field, type SheetId, type Slip, type Value } from './notebook'
import { contextOf, currentAttempt, currentSheet, isValueOf, MAX_ATTEMPTS, newAttempt, newSheet, runCounts, sheetCounts, statusOf, type Attempt, type KineticsState, type Mode, type Sheet } from './state'

// Every learner action: when it can be done, and what it does. The runs can be made in any order, each in its own
// pair of flasks. A run goes one way: what goes into the flasks and where they stand, then the pour, which starts
// the watch, then the stop. A sheet of the notebook opens once its runs count.

export type Action =
  | { type: 'setMode'; mode: Mode }
  /** Add to one flask what shows the end of the run. */
  | { type: 'addIndicator'; run: string }
  /** Stand both flasks in the run's bath. */
  | { type: 'standInBath'; run: string }
  /** Let the flasks stand in the bath until they are at its temperature. No clock runs: the time is a count. */
  | { type: 'letStand'; run: string }
  /** Read the thermometer in the flask. */
  | { type: 'readThermometer'; run: string }
  /** Pour one flask into the other and start the watch, as one action (spec 19.2). */
  | { type: 'pour'; run: string }
  /**
   * Stop the watch by hand. The page plays the time and hands it in: what the watch read when it was stopped, and
   * how long after the end of the run showed the hand was, in true milliseconds, both whole. The engine reads no clock.
   */
  | { type: 'stop'; run: string; elapsedMs: number; delayMs: number }
  /** Have the watch stopped at the end of the run itself. */
  | { type: 'stopAtEnd'; run: string }
  /** Leave a run that is over and does not count, and set it up again. */
  | { type: 'runAgain'; run: string }
  /** At one place on the line of the graph, by its number. Stored, since a look opens an entry. */
  | { type: 'look'; place: number }
  /** One entry of a sheet. Entries after it are emptied: they were worked from it. */
  | { type: 'enter'; sheet: SheetId; field: Field; value: Value }
  /** Check a sheet and end it. Guided does it at the last entry. */
  | { type: 'check'; sheet: SheetId }
  /** Leave a sheet that has been checked and does not count, and work it again from empty. */
  | { type: 'sheetAgain'; sheet: SheetId }

/** Why an action cannot be done now. The reason names what is missing, or the kind of slip an entry looks like, and never a value. */
export type Blocked =
  | 'lab-completed'
  | 'unknown-run'
  | 'unknown-sheet'
  | 'already-done'
  | 'no-bath'
  | 'not-in-bath'
  | 'thermometer-not-read'
  | 'already-poured'
  | 'not-poured'
  | 'run-over'
  | 'invalid-time'
  | 'run-not-over'
  | 'run-counts'
  | 'too-many'
  | 'runs-missing'
  | 'rate-law-first'
  | 'sheet-over'
  | 'nothing-there'
  | 'not-this-sheet'
  | 'entry-above-missing'
  | 'not-looked'
  | 'same-place'
  | 'invalid-entry'
  | 'sheet-not-full'
  | 'sheet-not-over'
  | 'sheet-counts'
  /** Guided only: an entry that does not follow from the ones above it. */
  | 'does-not-follow'
  | Slip

/** A step of technique about to be skipped. Guided asks before going on; Challenge does not look. */
export type Warning = 'no-indicator' | 'not-at-temperature'

const isSheet = (sheet: unknown) => SHEET_IDS.includes(sheet as SheetId)
const whole = (n: unknown, max: number): n is number => Number.isSafeInteger(n) && (n as number) >= 0 && (n as number) <= max && !Object.is(n, -0)

/** Why a sheet cannot be worked now, whatever is entered: null when it is open. */
export function sheetBlocked(m: KineticsModel, state: KineticsState, sheetId: SheetId): Blocked | null {
  if (state.status === 'completed') return 'lab-completed'
  if (currentSheet(state, sheetId).closed) return 'sheet-over'
  if (contextOf(m, state, sheetId) !== null) return null
  // The second sheet waits for its own runs first, then for the first sheet, whose rate law its rate constants are worked with.
  return sheetId === 'temperature' && runsReady(m, state) ? 'rate-law-first' : 'runs-missing'
}

/** Whether every run the second sheet has a point for counts. */
function runsReady(m: KineticsModel, state: KineticsState): boolean {
  return m.runs.filter((run) => run.bathId !== null || run.id === m.referenceRunId).every((run) => runCounts(m, state.seed, run.id, currentAttempt(state, run.id)))
}

/** Why an entry cannot be made now, whatever is entered: null when its field is open. A place on the line is entered once it has been looked at (spec 19.3). */
export function entryBlocked(m: KineticsModel, state: KineticsState, sheetId: SheetId, field: Field): Blocked | null {
  const blocked = sheetBlocked(m, state, sheetId)
  if (blocked) return blocked
  const fields = fieldsOf(m, sheetId)
  if (!fields.includes(field)) return 'not-this-sheet'
  const { entries } = currentSheet(state, sheetId)
  return fields.slice(0, fields.indexOf(field)).some((above) => entries[above] === null) ? 'entry-above-missing' : null
}

/** null when the action can be done now; otherwise the first reason that applies. */
export function can(m: KineticsModel, state: KineticsState, action: Action): Blocked | null {
  if (action.type === 'setMode') return null
  if (state.status === 'completed') return 'lab-completed'
  switch (action.type) {
    case 'look': {
      const blocked = sheetBlocked(m, state, 'temperature')
      return blocked ?? (whole(action.place, m.places.count - 1) ? null : 'nothing-there')
    }
    case 'enter': {
      if (!isSheet(action.sheet)) return 'unknown-sheet'
      const blocked = entryBlocked(m, state, action.sheet, action.field)
      if (blocked) return blocked
      if (!isValueOf(m, action.field, action.value)) return 'invalid-entry'
      const sheet = currentSheet(state, action.sheet)
      const kind = kindOf(action.field)
      if ((kind === 'first' || kind === 'second') && !sheet.looked.includes(action.value as number)) return 'not-looked'
      if (kind === 'second' && action.value === sheet.entries.first) return 'same-place'
      if (state.mode !== 'guided') return null
      // Guided checks each entry as it is made (spec 19.3).
      const verdict = verdictOf(m, contextOf(m, state, action.sheet)!, entered(m, action.sheet, sheet.entries, action.field, action.value), action.field)
      return verdict === null || verdict.follows ? null : (verdict.slip ?? 'does-not-follow')
    }
    case 'check': {
      if (!isSheet(action.sheet)) return 'unknown-sheet'
      const sheet = currentSheet(state, action.sheet)
      if (sheet.closed) return 'sheet-over'
      return fieldsOf(m, action.sheet).every((field) => sheet.entries[field] !== null) ? null : 'sheet-not-full'
    }
    case 'sheetAgain': {
      if (!isSheet(action.sheet)) return 'unknown-sheet'
      const sheet = currentSheet(state, action.sheet)
      if (!sheet.closed) return 'sheet-not-over'
      if (sheetCounts(m, state, action.sheet, sheet)) return 'sheet-counts'
      return state.sheets[action.sheet].length >= MAX_ATTEMPTS ? 'too-many' : null
    }
  }
  // What is left is done at a run.
  if (!m.runs.some((run) => run.id === action.run)) return 'unknown-run'
  const run = runOf(m, action.run)
  const attempt = currentAttempt(state, action.run)
  switch (action.type) {
    case 'runAgain':
      if (attempt.stop === null) return 'run-not-over'
      if (runCounts(m, state.seed, action.run, attempt)) return 'run-counts'
      return state.runs[action.run]!.length >= MAX_ATTEMPTS ? 'too-many' : null
    case 'stop':
    case 'stopAtEnd':
      if (!attempt.poured) return 'not-poured'
      if (attempt.stop !== null) return 'run-over'
      return action.type === 'stopAtEnd' || (whole(action.elapsedMs, m.watchLimitMs) && whole(action.delayMs, m.watchLimitMs)) ? null : 'invalid-time'
  }
  if (attempt.stop !== null) return 'run-over'
  if (attempt.poured) return 'already-poured'
  switch (action.type) {
    case 'addIndicator':
      return m.end.indicatorId === null || attempt.indicator ? 'already-done' : null
    case 'standInBath':
      if (run.bathId === null) return 'no-bath'
      return attempt.bath !== 0 ? 'already-done' : null
    case 'letStand':
      if (run.bathId === null) return 'no-bath'
      if (attempt.bath === 0) return 'not-in-bath'
      return attempt.bath === 2 ? 'already-done' : null
    case 'readThermometer':
      if (run.bathId === null) return 'no-bath'
      if (attempt.bath === 0) return 'not-in-bath'
      return attempt.read ? 'already-done' : null
    case 'pour':
      if (run.bathId === null) return null
      if (attempt.bath === 0) return 'not-in-bath'
      return attempt.read ? null : 'thermometer-not-read'
  }
}

/**
 * The steps of technique this action would skip (spec 19.2). Empty when there are none, when the action is blocked
 * anyway, and in Challenge. In Guided, pouring with nothing in the flask to show the end, or before the flasks
 * have stood in their bath: the page asks first, and the same action sent again is the way on.
 */
export function warnings(m: KineticsModel, state: KineticsState, action: Action): Warning[] {
  if (state.mode !== 'guided' || action.type !== 'pour' || can(m, state, action) !== null) return []
  const attempt = currentAttempt(state, action.run)
  return [...(m.end.indicatorId !== null && !attempt.indicator ? (['no-indicator'] as const) : []), ...(runOf(m, action.run).bathId !== null && attempt.bath !== 2 ? (['not-at-temperature'] as const) : [])]
}

/** The entries with one made: the fields after it emptied, since they were worked from it. */
function entered(m: KineticsModel, sheetId: SheetId, entries: Sheet['entries'], field: Field, value: Value): Sheet['entries'] {
  const fields = fieldsOf(m, sheetId)
  const after = Object.fromEntries(fields.slice(fields.indexOf(field) + 1).map((later) => [later, null]))
  return { ...entries, ...after, [field]: value }
}

/** The state after an action. An action that cannot be done now, or that changes nothing, returns the very same object. */
export function reduce(m: KineticsModel, state: KineticsState, action: Action): KineticsState {
  if (can(m, state, action) !== null) return state
  if (action.type === 'setMode') return action.mode === state.mode ? state : { ...state, mode: action.mode }
  const settled = (next: KineticsState): KineticsState => ({ ...next, status: statusOf(m, next) })
  const withSheet = (sheetId: SheetId, patch: Partial<Sheet>) => settled({ ...state, sheets: { ...state.sheets, [sheetId]: [...state.sheets[sheetId].slice(0, -1), { ...currentSheet(state, sheetId), ...patch }] } })
  switch (action.type) {
    case 'look': {
      const { looked } = currentSheet(state, 'temperature')
      return looked.includes(action.place) ? state : withSheet('temperature', { looked: [...looked, action.place] })
    }
    case 'enter': {
      const entries = entered(m, action.sheet, currentSheet(state, action.sheet).entries, action.field, action.value)
      // In Guided every entry was checked as it was made, so the last one checks the sheet.
      return withSheet(action.sheet, { entries, closed: state.mode === 'guided' && fieldsOf(m, action.sheet).every((field) => entries[field] !== null) })
    }
    case 'check':
      return withSheet(action.sheet, { closed: true })
    case 'sheetAgain':
      return settled({ ...state, sheets: { ...state.sheets, [action.sheet]: [...state.sheets[action.sheet], newSheet(m, action.sheet)] } })
  }
  const attempts = state.runs[action.run]!
  const withAttempts = (next: Attempt[]) => settled({ ...state, runs: { ...state.runs, [action.run]: next } })
  const withAttempt = (patch: Partial<Attempt>) => withAttempts([...attempts.slice(0, -1), { ...currentAttempt(state, action.run), ...patch }])
  switch (action.type) {
    case 'addIndicator':
      return withAttempt({ indicator: true })
    case 'standInBath':
      return withAttempt({ bath: 1 })
    case 'letStand':
      // A reading taken before the flasks had stood no longer says what they are at.
      return withAttempt({ bath: 2, read: false })
    case 'readThermometer':
      return withAttempt({ read: true })
    case 'pour':
      return withAttempt({ poured: true })
    case 'stop':
      return withAttempt({ stop: { by: 'hand', elapsedMs: action.elapsedMs, delayMs: action.delayMs } })
    case 'stopAtEnd':
      return withAttempt({ stop: { by: 'end' } })
    case 'runAgain':
      return withAttempts([...attempts, newAttempt(attempts.length)])
  }
}
