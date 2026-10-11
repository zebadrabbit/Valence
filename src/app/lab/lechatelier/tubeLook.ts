import { SYSTEM_IDS, systemOf, type LechatelierData, type SystemId, type TubeId } from '@/chem-data/lechatelier/data'
import type { LechatelierModel, SystemView } from '@/engine/lechatelier'

// What the page works out for its drawings and for where it opens. Nothing here is chemistry of its own: a tube is
// drawn by the lab shell (src/app/lab/tubeDrawing.ts) from what the engine says is seen of it, the words for each
// part of it are the messages', and where the page opens is read off the engine's views.

/**
 * The most liquid a tube of a system comes to hold, by which its tubes are drawn: a tube is as full as its own
 * system fills one, so that an addition shows. It reads the model's volumes and nothing else of it: what a tube
 * shows is the view's to hand over.
 */
export function fullMicrolitres(m: LechatelierModel, systemId: SystemId): number {
  const system = m.systems.find((s) => s.id === systemId)
  if (!system) throw new Error(`the model has no system "${systemId}"`)
  return Math.max(...system.disturbances.flatMap((d) => [d.before.microlitres, ...d.stages.map((stage) => stage.microlitres)]))
}

/**
 * The tubes that stand together in the rack with a tube: the tube a solid is brought down in and the tubes it is
 * then shared among, in the record's order. A tube that is shared with none stands alone.
 */
export function tubeGroup(data: LechatelierData, systemId: SystemId, tubeId: TubeId): TubeId[] {
  const { tubes } = systemOf(data, systemId)
  const tube = tubes.find((t) => t.id === tubeId)
  if (!tube) throw new Error(`the system "${systemId}" has no tube "${tubeId}"`)
  const first = 'shareOf' in tube ? tube.shareOf : tube.id
  return tubes.filter((t) => t.id === first || ('shareOf' in t && t.shareOf === first)).map((t) => t.id)
}

/** A run that has been begun and is not over: there is work in it to come back to. */
const underWay = (view: Pick<SystemView, 'disturbances' | 'outcome'>) =>
  (view.outcome.state === 'open' || view.outcome.state === 'to-check') && view.disturbances.some((d) => d.status === 'done' || d.prediction !== null || d.looked.length > 0)

/**
 * The system the Lab tab shows when the page opens: the one the learner was in the middle of, as far as the stored
 * record can tell. A system that does not count yet whose run is begun and not over; where none is, a system that
 * counts and is being worked again; else the first that does not count; else the first. The record does not hold
 * which system was shown, so of two that are under way it is the earlier.
 */
export function openingSystem(views: Readonly<Record<SystemId, Pick<SystemView, 'disturbances' | 'outcome' | 'done'>>>): SystemId {
  const notDone = SYSTEM_IDS.filter((systemId) => !views[systemId].done)
  return notDone.find((systemId) => underWay(views[systemId])) ?? SYSTEM_IDS.find((systemId) => underWay(views[systemId])) ?? notDone[0] ?? SYSTEM_IDS[0]
}

/** The entry of a system's list that is shown when the system opens: the disturbance the run has reached, or the entry after them once all are done. */
export const openingEntry = (view: Pick<SystemView, 'disturbance' | 'disturbances'>): number => (view.disturbance === null ? view.disturbances.length : view.disturbances.findIndex((d) => d.id === view.disturbance))
