import { STATION_IDS, type Field, type KindAnswer, type Look, type MetalId, type StationId } from '@/chem-data/reactions/data'
import type { TubeShows } from '../tubeShows'
import type { Built, Problem } from './built'
import { speciesOf, type ReactionsModel, type Seen, type StationModel, type VesselModel } from './model'
import { allLooked, complete, equationProblem, orderRight, reasonsOf, seenNow, wrongFieldsOf, type Observation, type Reason, type RunState } from './run'
import { currentRun, runStateOf, stationDone, stationModel, type Mode, type ReactionsState, type Run } from './state'

// Everything the app shows, worked out from the stored record. A vessel is handed over as what is seen of it now:
// before the station's action, what is there; after it, what the record stores as seen; and never what it will
// show after an action that has not been made. The words of a look are handed over once that part has been looked
// at. Whether an observation, a kind, an equation or the order is right is handed over only once it has been
// judged: in Guided as it stands, since Guided marks every answer as it is given, and in Challenge once the
// station has been checked. The catalyst and that the notes may be shown are handed over only once the station
// counts. The wording is the app's: these hand over identifiers and the record's words.

export type { TubeShows }

/** How a vessel bubbles: not at all; slowly or fast, where the record says which; or 'some', where it says only that it does. */
export type Bubbles = 'none' | 'slow' | 'fast' | 'some'

/** What is seen of a vessel, in the record's words for colours, and nothing of what anything is. */
export interface VesselShows {
  /** A test tube, or a strip of metal held in tongs at a burner. */
  drawn: 'tube' | 'flame'
  /** The tube's liquid and any loose solid in it; null for the strip. A solid that has formed in the liquid is spread through it, and the liquid is cloudy. */
  tube: TubeShows | null
  /** The piece of metal: its colour, what coats it (null for nothing), and whether it is in the liquid or the flame (`placed`) or still beside it. Null where there is no metal, and once a strip has burned away. */
  metal: { colour: string; coating: string | null; placed: boolean } | null
  /** Bubbles: from the metal where there is one in the tube, and through the liquid where there is none. */
  bubbles: Bubbles
  /** The light a burning strip gives, in the record's words; null where there is none. */
  light: string | null
  /** The colour of the powder left where a strip burned; null where there is none. */
  residue: string | null
  /** The tube is warmer than it was. It cannot be seen: the page says it in words, and may draw a mark for it. */
  warm: boolean
}

/** A species as a tile of the equation builder. */
export interface Tile {
  speciesId: string
  formula: string
  name: string
}

export interface VesselView {
  id: string
  shows: VesselShows
  /** Each part that can be looked at, whether it has been since the vessel last changed, and, once it has, the record's words for what is there now. */
  looks: { at: Look; looked: boolean; words: string | null }[]
  /** The fields its observation records, each with its choices. */
  fields: { field: Field; choices: readonly string[] }[]
  /** The observation can be recorded: the station's action is done, every part of the vessel has been looked at since, and the station is not checked. */
  observationOpen: boolean
  observation: Observation | null
  /** The fields recorded that are not what the vessel showed: null until judged, and empty where the observation is right. */
  wrongFields: Field[] | null
  /** The kind can be said: an observation is recorded. The kind said, and whether it is right: null until judged. */
  kindOpen: boolean
  kind: KindAnswer | null
  kindRight: boolean | null
  /** An equation can be built: a kind has been said, and it is not that nothing reacted. */
  equationOpen: boolean
  /** The equation recorded, and what is wrong with it: `judged` is false until it has been judged, and `problem` is then null. */
  equation: { built: Built; judged: boolean; problem: Problem | null } | null
  /**
   * How many terms each side of the right equation has, which is the row of empty places Guided draws to be
   * filled: the two counts and nothing else. Null in Challenge at all times, and while no equation can be built.
   */
  places: { reactants: number; products: number } | null
  /** The species that sped the reaction and is in no equation, to be shown over the arrow: null until the station counts, and where there is none. */
  catalyst: Tile | null
}

/** A run as its record names it. */
export type RunOutcome =
  /** Something is still to be done or recorded. */
  | { state: 'open' }
  /** Everything is recorded, and the station waits to be checked. */
  | { state: 'to-check' }
  | { state: 'counts' }
  | { state: 'does-not-count'; reasons: Reason[] }

export interface StationView {
  /** How many runs of the station there are; the view is of the last. */
  runs: number
  /** The station's one action, and whether it has been done. */
  action: StationModel['action']
  acted: boolean
  vessels: VesselView[]
  /** The tiles the station's equations are built from: the same for every vessel, and more than any equation needs. */
  tiles: Tile[]
  /** The order of the station's metals, where it is asked: the metals as they stand at the station, whether the order can be given, what was given, and whether it is right (null until judged). Null where it is not asked. */
  order: { metals: readonly MetalId[]; open: boolean; said: readonly MetalId[] | null; right: boolean | null } | null
  outcome: RunOutcome
  /** One run of the station counts, so its notes may be shown. */
  done: boolean
}

const tileOf = (m: ReactionsModel, id: string): Tile => {
  const species = speciesOf(m, id)
  if (!species) throw new Error(`the model has no species "${id}"`)
  return { speciesId: species.id, formula: species.formula, name: species.name }
}

/** What is seen of a vessel, from what the record stores for it at one point. */
export function showsOf(m: ReactionsModel, vessel: VesselModel, seen: Seen, acted: boolean): VesselShows {
  const nothing = (field: Field) => seen[field] === undefined || seen[field] === m.choices[field][0]
  const solid = nothing('solid') ? null : seen.solid!
  const tube = vessel.drawn === 'tube'
  return {
    drawn: vessel.drawn,
    tube: tube ? { liquid: { colour: seen.liquid!, cloudy: solid !== null, microlitres: acted ? vessel.microlitres!.after : vessel.microlitres!.before }, solid: solid === null ? null : { colour: solid, settled: false } } : null,
    // A strip that has burned is gone: what is left of it is the powder.
    metal: vessel.metal === null || (!tube && acted) ? null : { colour: vessel.metal.colour, coating: nothing('coating') ? null : seen.coating!, placed: acted },
    bubbles: !nothing('bubbles') ? (seen.bubbles as Bubbles) : nothing('gas') ? 'none' : 'some',
    light: nothing('light') ? null : seen.light!,
    residue: tube ? null : solid,
    warm: seen.warmth === 'warmer',
  }
}

function outcomeOf(station: StationModel, run: RunState, reasons: Reason[] | null): RunOutcome {
  if (reasons === null) return complete(station, run) ? { state: 'to-check' } : { state: 'open' }
  return reasons.length === 0 ? { state: 'counts' } : { state: 'does-not-count', reasons }
}

function vesselViews(m: ReactionsModel, mode: Mode, station: StationModel, run: RunState, done: boolean): VesselView[] {
  // Guided marks every answer as it stands; Challenge is judged when the station is checked.
  const judged = run.checked || mode === 'guided'
  return station.vessels.map((vessel, at): VesselView => {
    const state = run.vessels[at]!
    const open = !run.checked
    const equationOpen = open && state.kind !== null && state.kind !== 'none'
    return {
      id: vessel.id,
      shows: showsOf(m, vessel, seenNow(vessel, run), run.acted),
      looks: vessel.looks.map((look) => ({ at: look.at, looked: state.looked.includes(look.at), words: state.looked.includes(look.at) ? (run.acted ? look.after : look.before) : null })),
      fields: vessel.asks.map((field) => ({ field, choices: m.choices[field] })),
      observationOpen: open && run.acted && allLooked(vessel, state),
      observation: state.observation,
      wrongFields: judged && state.observation !== null ? wrongFieldsOf(vessel, state.observation) : null,
      kindOpen: open && state.observation !== null,
      kind: state.kind,
      kindRight: judged && state.kind !== null ? state.kind === vessel.kind : null,
      equationOpen,
      equation: state.equation === null ? null : { built: state.equation, judged, problem: judged ? equationProblem(m, vessel, state) : null },
      // Guided has taken the kind only where it is right, so that there is an equation, and how many terms it has, gives nothing more away.
      places: mode === 'guided' && equationOpen && vessel.equation !== null && state.kind === vessel.kind ? { reactants: vessel.equation.reactants.length, products: vessel.equation.products.length } : null,
      catalyst: done && vessel.catalyst !== null ? tileOf(m, vessel.catalyst) : null,
    }
  })
}

/** A run's outcome; `run` is one of the station's runs. */
export function runOutcome(m: ReactionsModel, stationId: StationId, run: Run): RunOutcome {
  const station = stationModel(m, stationId)
  const worked = runStateOf(m, stationId, run)
  return outcomeOf(station, worked, reasonsOf(m, station, worked))
}

/** A station as its page shows it: the current run's vessels, and how the station stands. */
export function stationView(m: ReactionsModel, state: ReactionsState, stationId: StationId): StationView {
  const station = stationModel(m, stationId)
  const run = runStateOf(m, stationId, currentRun(state, stationId))
  const done = stationDone(m, state, stationId)
  const judged = run.checked || state.mode === 'guided'
  return {
    runs: state.stations[stationId].length,
    action: station.action,
    acted: run.acted,
    vessels: vesselViews(m, state.mode, station, run, done),
    tiles: station.tiles.map((id) => tileOf(m, id)),
    order:
      station.order === null
        ? null
        : {
            // As they stand at the station, which is not their order: the vessels' own.
            metals: station.vessels.flatMap((vessel) => (vessel.metal === null ? [] : [vessel.metal.id])),
            open: !run.checked && run.vessels.every((vessel) => vessel.observation !== null),
            said: run.order,
            right: judged && run.order !== null ? orderRight(station, run.order) : null,
          },
    outcome: outcomeOf(station, run, reasonsOf(m, station, run)),
    done,
  }
}

/** One run as the record lists it: what was recorded for each vessel, the order where it was asked, and how the run came out. The marks are there once the run has been checked. */
export interface RunRecord {
  vessels: { id: string; observation: Observation | null; wrongFields: Field[] | null; kind: KindAnswer | null; kindRight: boolean | null; equation: VesselView['equation'] }[]
  order: { said: readonly MetalId[] | null; right: boolean | null } | null
  outcome: RunOutcome
}

/** Every run of a station, in order, for its record. */
export function runRecords(m: ReactionsModel, state: ReactionsState, stationId: StationId): RunRecord[] {
  const station = stationModel(m, stationId)
  return state.stations[stationId].map((stored): RunRecord => {
    const run = runStateOf(m, stationId, stored)
    return {
      // A run left behind unchecked is listed as it was entered, with no marks: only a check judges a run of the record.
      vessels: vesselViews(m, 'challenge', station, run, false).map(({ id, observation, wrongFields, kind, kindRight, equation }) => ({ id, observation, wrongFields, kind, kindRight, equation })),
      order: station.order === null ? null : { said: run.order, right: run.checked && run.order !== null ? orderRight(station, run.order) : null },
      outcome: outcomeOf(station, run, reasonsOf(m, station, run)),
    }
  })
}

/** The stations that count, in their order. */
export const doneStations = (m: ReactionsModel, state: ReactionsState): StationId[] => STATION_IDS.filter((stationId) => stationDone(m, state, stationId))
