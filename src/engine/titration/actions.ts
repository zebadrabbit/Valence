import { followsFromNotebook, withinTolerance } from './entries'
import { isOvershot, isPink, type Flask } from './flask'
import type { TitrationModel } from './model'
import { labSetup, trialSetup } from './setup'
import { currentTrial, newTrial, type Mode, type TitrationState, type Trial } from './state'

// Every learner action: when it can be done, and what it does. All of it is whole-number arithmetic on the stored
// record, but for the one question asked of the flask chemistry: is the mixed flask pink.

export type Action =
  | { type: 'setMode'; mode: Mode }
  | { type: 'recordHclMolarity'; molarityE6: number }
  | { type: 'conditionBurette' }
  | { type: 'fillBurette' } // the first fill and every refill
  | { type: 'clearTipBubble' }
  | { type: 'rinsePipette' }
  | { type: 'pipetteAliquot' }
  | { type: 'addIndicatorDrop' }
  | { type: 'addWater' }
  | { type: 'recordInitialReading'; readingUl: number }
  | { type: 'deliver'; amount: 'stream' | 'drop' | 'half' }
  | { type: 'swirlAndWait' }
  | { type: 'recordFinalReading'; readingUl: number }
  | { type: 'submitMolarity'; molarityE6: number } // grades and closes the trial
  | { type: 'discardTrial' }
  | { type: 'startNextTrial' }
  | { type: 'recordSummary'; meanE6: number; deviationE2: number }

/** Why an action cannot be done now. The reason names what is missing and nothing else. */
export type Blocked =
  | 'lab-completed'
  | 'lab-not-completed'
  | 'trial-ended'
  | 'trial-open'
  | 'already-done'
  | 'mid-titration'
  | 'burette-empty'
  | 'burette-at-bottom'
  | 'no-tip-bubble'
  | 'flask-empty'
  | 'flask-has-aliquot'
  | 'indicator-full'
  | 'water-full'
  | 'needs-indicator'
  | 'needs-initial-reading'
  | 'endpoint-not-confirmed'
  | 'needs-final-reading'
  | 'needs-hcl-molarity'
  | 'invalid-entry'
  | 'not-the-label'
  | 'reread'
  | 'final-not-after-initial'
  | 'calculation-mismatch'

/** A technique step about to be skipped. Guided mode asks before going on; Challenge mode does not look. */
export type Warning = 'burette-not-conditioned' | 'tip-bubble' | 'pipette-not-rinsed'

/**
 * A trial's flask and the titrant run into it, as the chemistry sees them; the current trial's unless one is given.
 * It holds the hidden concentrations, so it is not part of the public surface. Before the aliquot is drawn it
 * describes the flask as it will be once it is.
 */
export function flaskOf(m: TitrationModel, state: TitrationState, trial: Trial = currentTrial(state)): Flask {
  const lab = labSetup(m, state.seed)
  // The burette cannot be conditioned mid-titration, so until titrant runs the burette says how dilute it will be.
  const diluted = trial.deliveredUl > 0 ? trial.titrantDiluted : state.burette.diluted
  return {
    hclE4: lab.hclE4,
    aliquotUl: trialSetup(m, state.seed, trial.index).aliquotUl,
    aliquotPercent: trial.aliquot === 'diluted' ? m.wetPipetteStrengthPercent : 100,
    naohE5: lab.naohE5,
    titrantPercent: diluted ? m.unconditionedStrengthPercent : 100,
    indicatorDrops: trial.indicatorDrops,
    waterUl: trial.waterUl,
    deliveredUl: trial.deliveredUl,
  }
}

/** True once a swirl and wait has shown the pink to last at the current volume. */
export const endpointConfirmed = (m: TitrationModel, state: TitrationState) =>
  currentTrial(state).waitedS >= m.persistSeconds && isPink(m, flaskOf(m, state))

/** A whole number from 0. Not negative zero: JSON writes it as 0, so a state that stored it would not come back from a reload as it went in. */
const isCount = (n: number) => Number.isSafeInteger(n) && n >= 0 && !Object.is(n, -0)
/** A reading on the burette's scale, typed to 0.01 mL. */
const isReading = (m: TitrationModel, ul: number) => isCount(ul) && ul <= m.buretteCapacityUl && ul % 10 === 0
/** A molarity below 1 with exactly four decimal places. */
const isMolarity = (e6: number) => isCount(e6) && e6 < 1_000_000 && e6 % 100 === 0
/** True when a typed reading is more than readingToleranceUl from the meniscus stored with it; false while either is missing. */
export const misread = (m: TitrationModel, typedUl: number | null, levelUl: number | null) =>
  typedUl !== null && levelUl !== null && Math.abs(typedUl - levelUl) > m.readingToleranceUl

/** The trials that count toward completion (D1): graded, within tolerance, both readings within readingToleranceUl of the meniscus, and the HCl molarity used the label's. */
export const countingTrials = (m: TitrationModel, state: TitrationState) => {
  const { hclE4, naohE5 } = labSetup(m, state.seed)
  return state.trials.filter(
    (t) =>
      t.end === 'graded' &&
      t.molarityE6 !== null &&
      withinTolerance(m, t.molarityE6, naohE5) &&
      // A reading that was not stored is not an honest one: only a record made by hand has a graded trial without them.
      t.startLevelUl !== null &&
      t.initialReadingUl !== null &&
      !misread(m, t.initialReadingUl, t.startLevelUl) &&
      t.endLevelUl !== null &&
      t.finalReadingUl !== null &&
      !misread(m, t.finalReadingUl, t.endLevelUl) &&
      t.hclUsedE6 === hclE4 * 100,
  )
}

/** null when the action can be done now; otherwise the first reason that applies. */
export function can(m: TitrationModel, state: TitrationState, action: Action): Blocked | null {
  const trial = currentTrial(state)
  const { burette } = state
  const guided = state.mode === 'guided'
  const open = trial.end === 'open'
  const titrating = trial.deliveredUl > 0
  switch (action.type) {
    case 'setMode':
      // Not during a trial: Guided's checks would be an oracle for a Challenge trial.
      return open && (trial.aliquot !== 'none' || trial.initialReadingUl !== null) ? 'trial-open' : null
    case 'recordSummary':
      if (state.status !== 'completed') return 'lab-not-completed'
      return isMolarity(action.meanE6) && isCount(action.deviationE2) ? null : 'invalid-entry'
  }
  if (state.status === 'completed') return 'lab-completed'
  switch (action.type) {
    case 'startNextTrial':
      return open ? 'trial-open' : null
    case 'recordHclMolarity':
      // Allowed between trials too, so a miscopied label can be put right before the next one.
      if (!isMolarity(action.molarityE6)) return 'invalid-entry'
      return guided && action.molarityE6 !== labSetup(m, state.seed).hclE4 * 100 ? 'not-the-label' : null
  }
  if (!open) return 'trial-ended'
  switch (action.type) {
    case 'discardTrial':
      return null
    case 'conditionBurette':
    case 'fillBurette':
      return titrating ? 'mid-titration' : null
    case 'clearTipBubble':
      if (!burette.filled) return 'burette-empty'
      if (burette.tipAirUl === 0) return 'no-tip-bubble'
      return titrating ? 'mid-titration' : null
    case 'rinsePipette':
      return state.pipetteRinsed ? 'already-done' : null
    case 'pipetteAliquot':
      return trial.aliquot !== 'none' ? 'flask-has-aliquot' : null
    case 'addIndicatorDrop':
      if (trial.aliquot === 'none') return 'flask-empty'
      if (titrating) return 'mid-titration'
      return trial.indicatorDrops >= m.indicatorDrops[1] ? 'indicator-full' : null
    case 'addWater':
      if (trial.aliquot === 'none') return 'flask-empty'
      return trial.waterUl + m.waterStepUl > m.waterMaxUl ? 'water-full' : null
    case 'recordInitialReading':
      if (!burette.filled) return 'burette-empty'
      if (titrating) return 'mid-titration'
      if (!isReading(m, action.readingUl)) return 'invalid-entry'
      return guided && misread(m, action.readingUl, burette.levelUl) ? 'reread' : null
    case 'deliver':
      if (!burette.filled) return 'burette-empty'
      if (trial.aliquot === 'none') return 'flask-empty'
      if (trial.indicatorDrops < m.indicatorDrops[0]) return 'needs-indicator'
      if (trial.initialReadingUl === null) return 'needs-initial-reading'
      return burette.levelUl >= m.buretteCapacityUl ? 'burette-at-bottom' : null
    case 'swirlAndWait':
      return trial.aliquot === 'none' ? 'flask-empty' : null
    case 'recordFinalReading':
      if (!endpointConfirmed(m, state)) return 'endpoint-not-confirmed'
      if (!isReading(m, action.readingUl)) return 'invalid-entry'
      if (trial.initialReadingUl === null || action.readingUl <= trial.initialReadingUl) return 'final-not-after-initial'
      return guided && misread(m, action.readingUl, burette.levelUl) ? 'reread' : null
    case 'submitMolarity':
      if (trial.finalReadingUl === null || trial.initialReadingUl === null) return 'needs-final-reading'
      if (state.hclRecordedE6 === null) return 'needs-hcl-molarity'
      if (!isMolarity(action.molarityE6)) return 'invalid-entry'
      return followsFromNotebook(m, action.molarityE6, state.hclRecordedE6, trial.finalReadingUl - trial.initialReadingUl) ? null : 'calculation-mismatch'
  }
}

/** The technique steps this action would skip. Empty when there are none, or when the action is blocked anyway. */
export function warnings(m: TitrationModel, state: TitrationState, action: Action): Warning[] {
  if (can(m, state, action) !== null) return []
  const { burette } = state
  switch (action.type) {
    case 'fillBurette':
      return !burette.conditioned || burette.diluted ? ['burette-not-conditioned'] : []
    case 'pipetteAliquot':
      return state.pipetteRinsed ? [] : ['pipette-not-rinsed']
    case 'recordInitialReading':
      return [...(burette.diluted ? (['burette-not-conditioned'] as const) : []), ...(burette.tipAirUl > 0 ? (['tip-bubble'] as const) : [])]
    default:
      return []
  }
}

const withTrial = (state: TitrationState, patch: Partial<Trial>, rest: Partial<TitrationState> = {}): TitrationState => ({
  ...state,
  ...rest,
  trials: [...state.trials.slice(0, -1), { ...currentTrial(state), ...patch }],
})

/** Ends the current trial. Its end level is the meniscus as it stands, so every cause can be judged from the stored trial alone. */
const ended = (state: TitrationState, end: Exclude<Trial['end'], 'open'>) => withTrial(state, { end, endLevelUl: state.burette.levelUl })

/**
 * The one place a trial's end is judged, after titrant or water has gone into the flask: overshot when the delivered
 * volume is more than overshootUl past the flask's own equivalence volume; else ran out when titrant has run into
 * this trial, the meniscus is at the last mark and the mixed flask is not pink, since nothing more can be delivered
 * and without a pink that lasts there is no final reading. A trial begun at the mark is left open: the burette can
 * still be filled.
 */
function judged(m: TitrationModel, state: TitrationState): TitrationState {
  const flask = flaskOf(m, state)
  if (isOvershot(m, flask)) return ended(state, 'overshot')
  const atTheMark = flask.deliveredUl > 0 && state.burette.levelUl >= m.buretteCapacityUl
  return atTheMark && !isPink(m, flask) ? ended(state, 'ran-out') : state
}

/** The state after an action. An action that cannot be done now returns the very same object. */
export function reduce(m: TitrationModel, state: TitrationState, action: Action): TitrationState {
  if (can(m, state, action) !== null) return state
  const trial = currentTrial(state)
  const { burette } = state
  // A reading describes one level, so it goes when that level changes; the wait is over when the flask changes.
  const levelChanged = { startLevelUl: null, initialReadingUl: null }
  const flaskChanged = { waitedS: 0, endLevelUl: null, finalReadingUl: null }
  switch (action.type) {
    case 'setMode':
      return { ...state, mode: action.mode }
    case 'recordHclMolarity':
      return { ...state, hclRecordedE6: action.molarityE6 }
    case 'conditionBurette':
      // Rinsing with titrant leaves the burette empty, so the next fill puts air in the tip again.
      return withTrial(state, levelChanged, { burette: { conditioned: true, filled: false, diluted: false, levelUl: 0, tipAirUl: 0 } })
    case 'fillBurette': {
      const levelUl = trialSetup(m, state.seed, trial.index).fillLevelUl
      const filled = burette.filled
        ? { ...burette, levelUl } // a top-up: what is in the burette stays as dilute as it was, and no air gets in
        : { ...burette, filled: true, diluted: !burette.conditioned, levelUl, tipAirUl: m.tipBubbleUl }
      return withTrial(state, levelChanged, { burette: filled })
    }
    case 'clearTipBubble':
      // Titrant takes the place of the air, so the meniscus falls by the air's volume.
      return withTrial(state, levelChanged, { burette: { ...burette, levelUl: Math.min(m.buretteCapacityUl, burette.levelUl + burette.tipAirUl), tipAirUl: 0 } })
    case 'rinsePipette':
      return { ...state, pipetteRinsed: true }
    case 'pipetteAliquot':
      // Drawing the aliquot wets the pipette with acid, so only the first aliquot from a wet pipette is dilute.
      return withTrial(state, { aliquot: state.pipetteRinsed ? 'clean' : 'diluted' }, { pipetteRinsed: true })
    case 'addIndicatorDrop':
      return withTrial(state, { indicatorDrops: trial.indicatorDrops + 1, ...flaskChanged })
    case 'addWater':
      return judged(m, withTrial(state, { waterUl: trial.waterUl + m.waterStepUl, ...flaskChanged }))
    case 'recordInitialReading':
      return withTrial(state, { startLevelUl: burette.levelUl, initialReadingUl: action.readingUl })
    case 'deliver': {
      // What is asked for, or what is left above the last mark.
      const room = m.buretteCapacityUl - burette.levelUl
      const addedUl = Math.min({ stream: m.streamUl, drop: m.dropUl, half: m.halfDropUl }[action.amount], room)
      // Air left in the tip leaves evenly over the first tipBubbleEscapeUl delivered, and the meniscus falls by it too.
      const escapedUl = Math.min(burette.tipAirUl, Math.floor((addedUl * m.tipBubbleUl) / m.tipBubbleEscapeUl), room - addedUl)
      return judged(
        m,
        withTrial(
          state,
          { deliveredUl: trial.deliveredUl + addedUl, lastAdditionUl: addedUl, titrantDiluted: burette.diluted, ...flaskChanged },
          { burette: { ...burette, levelUl: burette.levelUl + addedUl + escapedUl, tipAirUl: burette.tipAirUl - escapedUl } },
        ),
      )
    }
    case 'swirlAndWait':
      return withTrial(state, { waitedS: trial.waitedS + m.persistSeconds })
    case 'recordFinalReading':
      return withTrial(state, { endLevelUl: burette.levelUl, finalReadingUl: action.readingUl })
    case 'submitMolarity': {
      const graded = withTrial(state, { hclUsedE6: state.hclRecordedE6, molarityE6: action.molarityE6, end: 'graded' })
      return countingTrials(m, graded).length >= m.passesToComplete ? { ...graded, status: 'completed' } : graded
    }
    case 'discardTrial':
      return ended(state, 'discarded')
    case 'startNextTrial':
      return { ...state, trials: [...state.trials, newTrial(state.trials.length)] }
    case 'recordSummary':
      return { ...state, summary: { meanE6: action.meanE6, deviationE2: action.deviationE2 } }
  }
}
