import { SYSTEM_IDS, type DisturbanceId, type SystemId, type TubeId, type Way } from '@/chem-data/lechatelier/data'
import type { TubeShows } from '../tubeShows'
import { showsOf, type DisturbanceModel, type LechatelierModel, type Temperature } from './model'
import { LOOKS, reasonsOf, shownAtEnd, stageAt, wrongFieldsOf, type Field, type Look, type Observation, type Reason, type RunState } from './run'
import { currentRun, runStateOf, systemDone, systemModel, type LechatelierState, type Mode, type Run } from './state'

// Everything the app shows, worked out from the stored record. A tube is handed over as what is seen of it now:
// the colour of its liquid and of its solid, and never what it will show after a press that has not been made.
// Whether an observation or an answer is right is handed over only once it has been judged: in Guided as it is
// recorded, since Guided records nothing that is not right, and in Challenge once the system has been checked.
// That a disturbance's notes may be shown is said here too, and is true only once the disturbance is done. The
// wording is the app's: these hand over identifiers and the record's words for colours.

export type { TubeShows }

export interface DisturbanceView {
  id: DisturbanceId
  /** `waiting` until the disturbances before it are done; `current` while it is worked; `done` once its question is answered. */
  status: 'waiting' | 'current' | 'done'
  /** The tube it is done in. */
  tube: TubeId
  /** What that tube shows: now, while the disturbance is current; as it was left, once it is done; null while it waits. */
  shows: TubeShows | null
  /** Where the tube stands; null while the disturbance waits. */
  temperature: Temperature | null
  /** What is done, how many presses it takes, and how many have been made. */
  kind: DisturbanceModel['kind']
  portions: number
  acted: number
  /** Which way the learner said the equilibrium would go, and whether that can still be changed: it is fixed once the action begins. */
  prediction: Way | null
  predictionFixed: boolean
  /** The parts of the tube looked at since it last changed. */
  looked: readonly Look[]
  /** The observation can be recorded: the action is complete, both parts have been looked at since, and the question is not yet answered. */
  observationOpen: boolean
  observation: Observation | null
  /** What is asked, whether it can be answered now, and the answer given. */
  ask: DisturbanceModel['ask']
  answerOpen: boolean
  answer: string | null
  /** The fields recorded that are not what the tube showed: null until judged, and empty where the observation is right. */
  wrongFields: Field[] | null
  /** Whether the answer is right: null until judged. */
  answerRight: boolean | null
  /** The disturbance is done, so its notes may be shown, with the prediction beside them. */
  notesShown: boolean
}

/** A run as its record names it. */
export type RunOutcome =
  /** There is still a disturbance to work. */
  | { state: 'open' }
  /** Every disturbance is done, and the system waits to be checked. */
  | { state: 'to-check' }
  | { state: 'counts' }
  | { state: 'does-not-count'; reasons: Reason[] }

export interface SystemView {
  /** How many runs of the system there are; the views below are of the last. */
  runs: number
  /** The disturbance being worked; null once all are done. */
  disturbance: DisturbanceId | null
  disturbances: DisturbanceView[]
  outcome: RunOutcome
  /** One run of the system counts. */
  done: boolean
}

function outcomeOf(system: { disturbances: readonly unknown[] }, run: RunState, reasons: Reason[] | null): RunOutcome {
  if (reasons === null) return run.at >= system.disturbances.length ? { state: 'to-check' } : { state: 'open' }
  return reasons.length === 0 ? { state: 'counts' } : { state: 'does-not-count', reasons }
}

function disturbanceViews(m: LechatelierModel, mode: Mode, systemId: SystemId, run: RunState): DisturbanceView[] {
  return systemModel(m, systemId).disturbances.map((disturbance, at): DisturbanceView => {
    const step = run.steps[at]!
    const status = at < run.at ? 'done' : at === run.at ? 'current' : 'waiting'
    const stage = status === 'waiting' ? null : stageAt(disturbance, step.acted)
    const complete = step.acted >= disturbance.portions
    // Guided records only what is right, so what it has recorded is judged as it stands; Challenge is judged when the system is checked.
    const judged = run.checked || mode === 'guided'
    return {
      id: disturbance.id,
      status,
      tube: disturbance.tube,
      shows: stage === null ? null : showsOf(m, stage),
      temperature: stage === null ? null : stage.temperature,
      kind: disturbance.kind,
      portions: disturbance.portions,
      acted: step.acted,
      prediction: step.prediction,
      predictionFixed: step.acted > 0,
      looked: step.looked,
      observationOpen: status === 'current' && !run.checked && complete && LOOKS.every((look) => step.looked.includes(look)),
      observation: step.observation,
      ask: disturbance.ask,
      answerOpen: status === 'current' && !run.checked && step.observation !== null,
      answer: step.answer,
      wrongFields: judged && step.observation !== null ? wrongFieldsOf(step.observation, shownAtEnd(disturbance)) : null,
      answerRight: judged && step.answer !== null ? step.answer === disturbance.right : null,
      notesShown: status === 'done',
    }
  })
}

/** A run's outcome; `run` is one of the system's runs. */
export function runOutcome(m: LechatelierModel, systemId: SystemId, run: Run): RunOutcome {
  const system = systemModel(m, systemId)
  const worked = runStateOf(m, systemId, run)
  return outcomeOf(system, worked, reasonsOf(system, worked))
}

/** A system as its page shows it: the current run's disturbances, and how the system stands. */
export function systemView(m: LechatelierModel, state: LechatelierState, systemId: SystemId): SystemView {
  const system = systemModel(m, systemId)
  const run = runStateOf(m, systemId, currentRun(state, systemId))
  return {
    runs: state.systems[systemId].length,
    disturbance: system.disturbances[run.at]?.id ?? null,
    disturbances: disturbanceViews(m, state.mode, systemId, run),
    outcome: outcomeOf(system, run, reasonsOf(system, run)),
    done: systemDone(m, state, systemId),
  }
}

/** One run as the record lists it: what was predicted, recorded and answered at each disturbance, and how the run came out. The marks are there once the run has been checked. */
export interface RunRecord {
  disturbances: { id: DisturbanceId; prediction: Way | null; observation: Observation | null; answer: string | null; wrongFields: Field[] | null; answerRight: boolean | null }[]
  outcome: RunOutcome
}

/** Every run of a system, in order, for its record. */
export function runRecords(m: LechatelierModel, state: LechatelierState, systemId: SystemId): RunRecord[] {
  const system = systemModel(m, systemId)
  return state.systems[systemId].map((stored): RunRecord => {
    const run = runStateOf(m, systemId, stored)
    return {
      // A run left behind unchecked is listed as it was entered, with no marks: only a check judges a run of the record.
      disturbances: disturbanceViews(m, 'challenge', systemId, run).map(({ id, prediction, observation, answer, wrongFields, answerRight }) => ({ id, prediction, observation, answer, wrongFields, answerRight })),
      outcome: outcomeOf(system, run, reasonsOf(system, run)),
    }
  })
}

/** The systems that count, in their order. */
export const doneSystems = (m: LechatelierModel, state: LechatelierState): SystemId[] => SYSTEM_IDS.filter((systemId) => systemDone(m, state, systemId))
