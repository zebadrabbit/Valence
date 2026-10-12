import { THING_IDS, type PartId, type ThingId } from '@/chem-data/cabbage/data'
import { benchView, can, rackView, reduce, sampleView, unitView, type Action, type Blocked, type CabbageModel, type CabbageState, type RackView, type SampleView, type UnitView } from '@/engine/cabbage'
import { PART_STATUS, RECORD_TEXT, countShort, sampleOutcomeText } from './messages'

// What the page works out for where it opens, for what it sends on and for the few words beside a name where a
// part or a thing is chosen. Nothing here is chemistry: it reads the engine's views, and asks the engine whether
// an action can be done.

/**
 * Several actions sent as one press: each in turn, on the lab as the ones before it leave it, as far as the first
 * the engine does not take. `done` are those it takes, and `refused` why the next was not, or null where all were
 * taken. Nothing after a refusal is tried: acid, neutral or basic is not judged against an estimate that was not taken.
 */
export function attempt(m: CabbageModel, state: CabbageState, actions: readonly Action[]): { done: Action[]; refused: Blocked | null } {
  const done: Action[] = []
  let now = state
  for (const action of actions) {
    const refused = can(m, now, action)
    if (refused !== null) return { done, refused }
    done.push(action)
    now = reduce(m, now, action)
  }
  return { done, refused: null }
}

/** A sample that has been begun and does not count yet: there is work in it to come back to. */
const underWay = (view: SampleView) => view.indicator && view.outcome.state !== 'counts'

/**
 * The part and the thing the Lab tab shows when the page opens: where the learner was, as far as the stored record
 * can tell. Until the rack is made, the scale. Then a thing that is begun and does not count yet, the earliest on
 * the bench; where none is, the first part of the three that is not done, and in the second the first thing that
 * does not count. In a lab that is complete, the last part. The record does not hold which was shown.
 */
export function opening(m: CabbageModel, state: CabbageState): { part: PartId; thing: ThingId } {
  const bench = benchView(m, state)
  const views = THING_IDS.map((id) => sampleView(m, state, id))
  const begun = views.find(underWay)
  const next = begun ?? views.find((view) => view.outcome.state !== 'counts') ?? views[0]!
  const part: PartId = !bench.thingsOpen ? 'scale' : begun ? 'things' : !bench.scaleDone ? 'scale' : !bench.thingsDone ? 'things' : 'unit'
  return { part, thing: next.id }
}

/** How a thing stands, in a word or two beside a mark, for the list the things are chosen from. */
export function thingStatus(view: Pick<SampleView, 'outcome' | 'indicator' | 'reasons'>): { mark: string; text: string; done: boolean } {
  if (view.outcome.state === 'counts') return { mark: '✓', text: RECORD_TEXT.counts, done: true }
  if (view.outcome.state === 'does-not-count') return { mark: '◑', text: RECORD_TEXT.doesNotCount, done: false }
  return { mark: view.indicator ? '◔' : '○', text: sampleOutcomeText({ ...view, outcome: { state: 'open' } }).replace(/\.$/, ''), done: false }
}

/** How each part stands, in a word or two beside a mark, for the three buttons the parts are chosen with. */
export function partStatus(m: CabbageModel, state: CabbageState, views?: { rack: RackView; unit: UnitView }): Record<PartId, { mark: string; text: string; done: boolean }> {
  const bench = benchView(m, state)
  const rack = views?.rack ?? rackView(m, state)
  const unit = views?.unit ?? unitView(m, state)
  const of = (done: boolean, begun: boolean) => (done ? { mark: '✓', text: PART_STATUS.done, done } : begun ? { mark: '◔', text: PART_STATUS['under-way'], done } : { mark: '○', text: PART_STATUS['not-begun'], done })
  return {
    scale: of(bench.scaleDone, rack.indicator),
    things: { mark: bench.thingsDone ? '✓' : bench.counted > 0 ? '◔' : '○', text: countShort(bench), done: bench.thingsDone },
    unit: unit.open ? of(bench.unitDone, unit.questions.some((q) => q.answer !== null)) : { mark: '○', text: PART_STATUS.closed, done: false },
  }
}
