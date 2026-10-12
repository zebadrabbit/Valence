// The types of reactions engine as src/app/ may use it. A lint rule keeps the app out of every file below this
// one, so nothing listed here hands a page what a run hides: what a vessel will show after an action that has not
// been made, the words of a part that has not been looked at, whether an answer is right before it has been
// judged, the right kind or equation of a vessel, or the catalyst and the notes of a station that is not done. A
// page draws from a station's view, which hands over what is seen and what was entered. The model is listed
// because every function takes it; it is made from the record, which a page holds anyway for its titles and its
// notes, and the views say when each of those may be shown. The working out of a run, its judging, the check of a
// built equation and the test kit are left out: what is wrong with an equation reaches a page as the reason an
// action is refused (Guided) or in the view once the station is checked (Challenge).
export { createLab, reactionsStateSchema, currentRun, type Mode, type ReactionsState, type Run } from './state'
export { can, mismatch, reduce, type Action, type Blocked } from './actions'
export type { Observation, Reason } from './run'
export type { Built, Problem } from './built'
export type { Entry, State, Term } from '../equation'
export { doneStations, runOutcome, runRecords, stationView, type Bubbles, type RunOutcome, type RunRecord, type StationView, type Tile, type TubeShows, type VesselShows, type VesselView } from './select'
export { modelFrom, type ReactionsModel } from './model'
