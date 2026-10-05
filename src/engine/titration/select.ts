import { countingTrials, endpointConfirmed, flaskOf } from './actions'
import { percentError, summarise, withinTolerance } from './entries'
import { compareToEquivalence, flaskChemistry, isPink, plume, type Plume } from './flask'
import type { TitrationModel } from './model'
import { labSetup } from './setup'
import { currentTrial, type TitrationState, type Trial } from './state'

// Everything the app shows, worked out from the stored record. Nothing here gives the equivalence volume, a pH or
// the expected titre, and the NaOH molarity is given only once the lab is done. The wording is the app's: these
// hand over identifiers and numbers.

/** The label on the HCl bottle ("0.0976"). It can always be read. */
export const hclLabel = (m: TitrationModel, state: TitrationState) => (labSetup(m, state.seed).hclE4 / 1e4).toFixed(4)

export interface BuretteView {
  filled: boolean
  /** The true meniscus in microlitres below the 0.00 mark: what is drawn, never printed. */
  levelUl: number
  tipBubble: boolean
  atBottom: boolean
}
export const buretteView = (m: TitrationModel, state: TitrationState): BuretteView => ({
  filled: state.burette.filled,
  levelUl: state.burette.levelUl,
  tipBubble: state.burette.tipAirUl > 0,
  atBottom: state.burette.levelUl >= m.buretteCapacityUl,
})

export interface FlaskView {
  hasAliquot: boolean
  indicatorDrops: number
  waterUl: number
  /** Liquid in the flask, for its drawn height. */
  volumeUl: number
  /** mol/L of the pink form in the mixed flask; 0 with no indicator. For the drawing only. */
  pinkConcentration: number
  /** The engine's own threshold test: the mixed flask is at least faintly pink. */
  pink: boolean
  overshot: boolean
  /** The last addition's plume; null before the first addition of a trial. */
  plume: Plume | null
  /** What the last swirl and wait showed. */
  persistence: 'unchecked' | 'faded' | 'persisted'
}
export function flaskView(m: TitrationModel, state: TitrationState): FlaskView {
  const trial = currentTrial(state)
  // flaskOf describes the flask as it will be once the aliquot is in, so an empty flask is answered from the trial.
  const hasAliquot = trial.aliquot !== 'none'
  const flask = flaskOf(m, state)
  const chemistry = flaskChemistry(m, flask)
  const pink = hasAliquot && isPink(m, flask)
  return {
    hasAliquot,
    indicatorDrops: trial.indicatorDrops,
    waterUl: trial.waterUl,
    volumeUl: hasAliquot ? chemistry.volumeUl : 0,
    pinkConcentration: hasAliquot ? chemistry.pinkConcentration : 0,
    pink,
    overshot: trial.end === 'overshot',
    plume: hasAliquot && trial.lastAdditionUl > 0 ? plume(m, flask, trial.lastAdditionUl) : null,
    persistence: trial.waitedS < m.persistSeconds ? 'unchecked' : pink ? 'persisted' : 'faded',
  }
}

/**
 * Guided mode's hint: the open trial's delivered volume is within slowDownUl before the flask's own equivalence
 * volume, or past it, and the mixed flask is not pink. Always false in Challenge and for a trial that has ended.
 */
export function slowDownHint(m: TitrationModel, state: TitrationState): boolean {
  if (state.mode !== 'guided' || currentTrial(state).end !== 'open') return false
  const flask = flaskOf(m, state)
  return compareToEquivalence(flask, -m.slowDownUl) >= 0 && !isPink(m, flask)
}

export type Cause = 'burette-not-conditioned' | 'tip-bubble' | 'pipette-not-rinsed' | 'initial-misread' | 'final-misread' | 'hcl-label-misrecorded'

export type TrialOutcome =
  | { state: 'open' }
  /** Technique causes only: nothing was typed that could be judged. */
  | { state: 'invalid'; reason: 'overshot' | 'ran-out' | 'discarded'; causes: Cause[] }
  /** `counts` is false for every failed trial, and for a passing one with a misread or a label that was not the bottle's (D1). */
  | { state: 'passed' | 'failed'; percentError: number; causes: Cause[]; counts: boolean }

/** What went wrong at the bench, from the stored trial alone. */
function techniqueCauses(trial: Trial): Cause[] {
  const causes: Cause[] = []
  if (trial.titrantDiluted) causes.push('burette-not-conditioned')
  // Air leaving the tip lets the meniscus fall further than the volume that reached the flask.
  if (trial.startLevelUl !== null && trial.endLevelUl !== null && trial.endLevelUl - trial.startLevelUl > trial.deliveredUl) causes.push('tip-bubble')
  if (trial.aliquot === 'diluted') causes.push('pipette-not-rinsed')
  return causes
}

const misread = (m: TitrationModel, typedUl: number | null, levelUl: number | null) =>
  typedUl !== null && levelUl !== null && Math.abs(typedUl - levelUl) > m.readingToleranceUl

/**
 * A trial's result for the notebook: its signed percent error and the named causes, never the expected value.
 * `trial` is one of `state.trials`.
 */
export function trialOutcome(m: TitrationModel, state: TitrationState, trial: Trial): TrialOutcome {
  if (trial.end === 'open') return { state: 'open' }
  if (trial.end !== 'graded') return { state: 'invalid', reason: trial.end, causes: techniqueCauses(trial) }
  // Only a record made by hand has a graded trial without a molarity: there is nothing to judge.
  if (trial.molarityE6 === null) return { state: 'open' }
  const { hclE4, naohE5 } = labSetup(m, state.seed)
  const causes = techniqueCauses(trial)
  if (misread(m, trial.initialReadingUl, trial.startLevelUl)) causes.push('initial-misread')
  if (misread(m, trial.finalReadingUl, trial.endLevelUl)) causes.push('final-misread')
  if (trial.hclUsedE6 !== hclE4 * 100) causes.push('hcl-label-misrecorded')
  return {
    state: withinTolerance(m, trial.molarityE6, naohE5) ? 'passed' : 'failed',
    percentError: percentError(trial.molarityE6, naohE5),
    causes,
    counts: countingTrials(m, state).includes(trial),
  }
}

/** The true NaOH molarity ("0.09502"); null until three trials count, whatever the record's status says. */
export const trueNaoh = (m: TitrationModel, state: TitrationState) =>
  countingTrials(m, state).length >= m.passesToComplete ? (labSetup(m, state.seed).naohE5 / 1e5).toFixed(5) : null

export interface SummaryView {
  /** The notebook's own: the mean of the trials that count (x 1 000 000), and their relative deviation in tenths of a part per thousand. */
  meanE6: number
  deviationTenths: number
  /** The learner's, as typed: x 1 000 000, and hundredths of a part per thousand. */
  learnerMeanE6: number
  learnerDeviationE2: number
}
/** Average and relative deviation over the trials that count; null until three count and the learner has entered their own. Nothing is marked. */
export function summaryView(m: TitrationModel, state: TitrationState): SummaryView | null {
  const counting = countingTrials(m, state)
  if (state.summary === null || counting.length < m.passesToComplete) return null
  // A trial that counts has a molarity: countingTrials requires one.
  return { ...summarise(counting.map((t) => t.molarityE6!)), learnerMeanE6: state.summary.meanE6, learnerDeviationE2: state.summary.deviationE2 }
}

export type Step = 'hcl' | 'condition' | 'fill' | 'tip-bubble' | 'initial-reading' | 'rinse-pipette' | 'aliquot' | 'indicator' | 'titrate' | 'final-reading' | 'molarity'

/**
 * Guided mode's checklist for the current trial, each step judged from the glassware and the trial, not from the
 * trial's number. The three technique steps are listed in the first trial, and later whenever the glassware calls
 * for them. One is `skipped` once the action that needed it has been taken without it, and skipped wins over done.
 * `next` is the first step that is neither; a trial that has ended has none.
 */
export function checklist(m: TitrationModel, state: TitrationState): { step: Step; state: 'done' | 'next' | 'todo' | 'skipped' }[] {
  const trial = currentTrial(state)
  const { burette } = state
  const first = trial.index === 0
  // The reading was taken with air in the tip: it is still there, or the meniscus has since fallen further than
  // the volume delivered. Once the air has all left, tipAirUl alone would call the step done.
  const readWithBubble =
    trial.initialReadingUl !== null && (burette.tipAirUl > 0 || (trial.startLevelUl !== null && burette.levelUl - trial.startLevelUl > trial.deliveredUl))
  // Drawing an aliquot wets the pipette with acid, so pipetteRinsed alone would call the step done.
  const drawnUnrinsed = trial.aliquot === 'diluted'
  const steps: { step: Step; listed?: boolean; done: boolean; skipped?: boolean }[] = [
    { step: 'hcl', done: state.hclRecordedE6 !== null },
    { step: 'condition', listed: first || !burette.conditioned || burette.diluted, done: burette.conditioned && !burette.diluted, skipped: burette.filled && burette.diluted },
    // Filled for this trial: the meniscus was near the top when it was read, or is now. Clearing the tip lowers a fresh fill by the bubble.
    { step: 'fill', done: burette.filled && (trial.startLevelUl ?? burette.levelUl) <= m.fillLevelMaxUl + m.tipBubbleUl },
    { step: 'tip-bubble', listed: first || burette.tipAirUl > 0, done: burette.filled && burette.tipAirUl === 0, skipped: readWithBubble },
    { step: 'initial-reading', done: trial.initialReadingUl !== null },
    { step: 'rinse-pipette', listed: first || !state.pipetteRinsed, done: state.pipetteRinsed, skipped: drawnUnrinsed },
    { step: 'aliquot', done: trial.aliquot !== 'none' },
    { step: 'indicator', done: trial.indicatorDrops >= m.indicatorDrops[0] },
    { step: 'titrate', done: endpointConfirmed(m, state) },
    { step: 'final-reading', done: trial.finalReadingUl !== null },
    { step: 'molarity', done: trial.molarityE6 !== null },
  ]
  let nextGiven = trial.end !== 'open'
  return (
    steps
      // A skipped step stays in the list, so that it does not vanish at the moment it is skipped.
      .filter(({ listed = true, skipped }) => listed || skipped)
      .map(({ step, done, skipped }) => {
        if (skipped) return { step, state: 'skipped' }
        if (done) return { step, state: 'done' }
        if (nextGiven) return { step, state: 'todo' }
        nextGiven = true
        return { step, state: 'next' }
      })
  )
}
