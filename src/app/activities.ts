import { ENTRY, peekStatus, type ActivityStatus, type KeyValueStore } from './progress/storage'

/**
 * The labs and the mechanism, as Home and the command palette list them. `version` is the version of the
 * activity's stored entry: the activity loads and saves with this number, taken from here so that it cannot
 * fork, and Home reads its status with it (activityStatus). An activity whose `to` is still the page that lists
 * its kind has no page yet (hasPage).
 */
export const ACTIVITIES = [
  { entry: ENTRY.titration, version: 1, kind: 'Lab', title: 'Standardization of a base by titration', to: '/lab/titration' },
  { entry: ENTRY.aqueous, version: 1, kind: 'Lab', title: 'Reactions in aqueous solution', to: '/lab/aqueous' },
  // src/flame-version.test.ts pins what a stored run of this lab is judged against to this entry and this version.
  { entry: ENTRY.flame, version: 1, kind: 'Lab', title: 'Flame tests', to: '/lab/flame' },
  // src/calorimetry-version.test.ts pins what a stored run of this lab is judged against to this entry and this version.
  { entry: ENTRY.calorimetry, version: 1, kind: 'Lab', title: 'Calorimetry', to: '/lab/calorimetry' },
  { entry: ENTRY.mechanism, version: 1, kind: 'Mechanism', title: 'HCl + NaHCO₃, step by step', to: '/learn/hcl-nahco3' },
] as const

export type Activity = (typeof ACTIVITIES)[number]

/** False while an activity has no page of its own: its address is still the page that lists its kind. Home and the list of labs then show it as planned, with no link and no status. */
export const hasPage = (activity: Activity) => !LISTS.includes(activity.to)
/** The pages that list a kind of activity. */
const LISTS: readonly string[] = ['/lab', '/learn']

/** An activity's status as Home shows it, read with the version the activity itself loads with. */
export function activityStatus(store: KeyValueStore, activity: Activity): ActivityStatus {
  return peekStatus(store, activity.entry, activity.version)
}

export const STATUS_LABEL: Record<ActivityStatus, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  completed: 'Completed',
}
