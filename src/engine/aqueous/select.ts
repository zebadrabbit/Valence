import type { AqueousData } from '@/chem-data/aqueous/data'
import { FORMS, checkEquation, fieldsOf, usesOf, wrongFields, type Entry, type Field, type Form, type Observation, type Problem, type ToolUse } from './check'
import { stationOf } from './react'
import { stationDone, type AqueousState } from './state'

// Everything the app shows of a station's progress, worked out from the stored record. The wording is the app's:
// these hand over identifiers.

export interface StationView {
  mixed: boolean
  /** The ways the station's tools can be applied, and those that have been. */
  uses: ToolUse[]
  used: ToolUse[]
  /** The fields its observation is recorded in. */
  fields: Field[]
  observation: Observation | null
  /** The fields recorded wrongly; null while nothing is recorded, empty when the observation is correct. */
  wrongFields: Field[] | null
  /** For each form, the equation entered and what is wrong with it: null for a correct one. */
  equations: Record<Form, { entry: Entry; problem: Problem | null } | null>
  /**
   * Whether the hints and the expected observations are shown (spec 8.3): from the start in Guided, and in
   * Challenge once the learner has recorded an observation of their own.
   */
  guidanceShown: boolean
  /** The observation and all three equations are correct. */
  done: boolean
}

export function stationView(data: AqueousData, state: AqueousState, stationId: string): StationView {
  const curated = stationOf(data, stationId)
  const station = state.stations[data.stations.indexOf(curated)]!
  const judged = (form: Form) => {
    const entry = station.equations[form]
    return entry === null ? null : { entry, problem: checkEquation(data, curated, form, entry) }
  }
  return {
    mixed: station.mixed,
    uses: usesOf(curated),
    used: station.used,
    fields: fieldsOf(curated),
    observation: station.observation,
    wrongFields: station.observation === null ? null : wrongFields(curated, station.observation),
    equations: Object.fromEntries(FORMS.map((form) => [form, judged(form)])) as StationView['equations'],
    guidanceShown: state.mode === 'guided' || station.observation !== null,
    done: stationDone(data, stationId, station),
  }
}

/** The ids of the stations that are done, in the stations' order. */
export const doneStations = (data: AqueousData, state: AqueousState): string[] =>
  data.stations.filter((station, i) => stationDone(data, station.id, state.stations[i]!)).map((station) => station.id)
