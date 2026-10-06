import { ENTRY, peekStatus, type ActivityStatus, type KeyValueStore } from './progress/storage'

/**
 * The labs and the mechanism, as Home and the command palette list them. `version` is the version of the
 * activity's stored entry: the activity loads and saves with this number, taken from here so that it cannot
 * fork, and Home reads its status with it (activityStatus). A lab whose `to` is still the list of labs has no
 * page yet.
 */
export const ACTIVITIES = [
  { entry: ENTRY.titration, version: 1, kind: 'Lab', title: 'Standardization of a base by titration', to: '/lab/titration' },
  { entry: ENTRY.aqueous, version: 1, kind: 'Lab', title: 'Reactions in aqueous solution', to: '/lab' },
  { entry: ENTRY.mechanism, version: 1, kind: 'Mechanism', title: 'HCl + NaHCO₃, step by step', to: '/learn' },
] as const

export type Activity = (typeof ACTIVITIES)[number]

/** An activity's status as Home shows it, read with the version the activity itself loads with. */
export function activityStatus(store: KeyValueStore, activity: Activity): ActivityStatus {
  return peekStatus(store, activity.entry, activity.version)
}

export const STATUS_LABEL: Record<ActivityStatus, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  completed: 'Completed',
}
