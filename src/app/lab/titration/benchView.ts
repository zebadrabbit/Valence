import {
  buretteView,
  can,
  currentTrial,
  flaskView,
  hclLabel,
  slowDownHint,
  type Action,
  type Blocked,
  type PlumeStatus,
  type TitrationModel,
  type TitrationState,
} from '@/engine/titration'

// The engine's state as the bench sees it: one plain object, made from the engine's selectors and `can` and from
// nothing of its own. The bench has no rule about what can be done when; every control carries the engine's word.

export type BenchControl =
  'conditionBurette' | 'fillBurette' | 'clearTipBubble' | 'rinsePipette' | 'pipetteAliquot' | 'addIndicatorDrop' | 'addWater' | 'deliver' | 'swirlAndWait'

/** What the bench sends: the engine's own actions, with no translation. */
export type BenchAction = Extract<Action, { type: BenchControl }>

export interface BenchView {
  /** The HCl bottle's label: "0.0976". */
  hclLabel: string
  /** `levelUl` is the true meniscus: drawn, and said in words by the marks either side of it, never printed as a number. */
  burette: { conditioned: boolean; filled: boolean; tipBubble: boolean; levelUl: number; atBottom: boolean }
  pipetteRinsed: boolean
  /** `pinkConcentration` is for the depth of the drawn pink only; the engine gives 0 until the flask is pink. */
  flask: { hasAliquot: boolean; indicatorDrops: number; waterPortions: number; volumeUl: number; pinkConcentration: number; pink: boolean; overshot: boolean }
  /** The last addition's status, while no swirl and wait has been done since. */
  plume: PlumeStatus | null
  /** Changes with every addition, so the plume's fade starts again. Never shown. */
  plumeKey: number
  persistence: 'unchecked' | 'faded' | 'persisted'
  /** The engine's word on each control; null when it can be used now. */
  controls: Record<BenchControl, Blocked | null>
  trialEnd: 'open' | 'graded' | 'overshot' | 'ran-out' | 'discarded'
  /** Final once titrant has been delivered in the trial, else initial; never null, so the field always has its label. */
  readingWanted: 'initial' | 'final'
  /** Why that reading cannot be recorded now; null when it can, for the first time or again. */
  readingBlocked: Blocked | null
  /** That reading as the learner typed it, once it is in the notebook; never the meniscus. */
  readingRecorded: number | null
  slowDown: boolean
}

// `can` does not look at how much a delivery is, so any amount asks the question.
const CONTROL_ACTIONS: { [C in BenchControl]: Extract<BenchAction, { type: C }> } = {
  conditionBurette: { type: 'conditionBurette' },
  fillBurette: { type: 'fillBurette' },
  clearTipBubble: { type: 'clearTipBubble' },
  rinsePipette: { type: 'rinsePipette' },
  pipetteAliquot: { type: 'pipetteAliquot' },
  addIndicatorDrop: { type: 'addIndicatorDrop' },
  addWater: { type: 'addWater' },
  deliver: { type: 'deliver', amount: 'half' },
  swirlAndWait: { type: 'swirlAndWait' },
}

/** The engine's answers that are about the value typed and not about the state: with one of these, a reading can be recorded now. */
const ABOUT_THE_VALUE: readonly Blocked[] = ['invalid-entry', 'reread', 'final-not-after-initial']

export function benchViewOf(m: TitrationModel, state: TitrationState): BenchView {
  const trial = currentTrial(state)
  const { waterUl, plume, persistence, ...flask } = flaskView(m, state)
  const readingWanted = trial.deliveredUl > 0 ? 'final' : 'initial'
  // Asked with a probe value. Any reading will do, since the answers a value can change are set aside.
  const reading = can(m, state, { type: readingWanted === 'initial' ? 'recordInitialReading' : 'recordFinalReading', readingUl: 0 })
  const controls = {} as Record<BenchControl, Blocked | null>
  for (const action of Object.values(CONTROL_ACTIONS)) controls[action.type] = can(m, state, action)
  return {
    hclLabel: hclLabel(m, state),
    burette: { conditioned: state.burette.conditioned, ...buretteView(m, state) },
    pipetteRinsed: state.pipetteRinsed,
    flask: { ...flask, waterPortions: waterUl / m.waterStepUl },
    plume: persistence === 'unchecked' ? plume : null,
    // The volume delivered: every addition raises it, and the plume is gone between two trials.
    plumeKey: trial.deliveredUl,
    persistence,
    controls,
    trialEnd: trial.end,
    readingWanted,
    readingBlocked: reading !== null && ABOUT_THE_VALUE.includes(reading) ? null : reading,
    readingRecorded: readingWanted === 'initial' ? trial.initialReadingUl : trial.finalReadingUl,
    slowDown: slowDownHint(m, state),
  }
}
