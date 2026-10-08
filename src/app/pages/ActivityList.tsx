import { Link } from 'react-router'
import { useAppState } from '@/app/AppState'
import { ACTIVITIES, activityStatus, hasPage, STATUS_LABEL, type Activity } from '@/app/activities'
import { SHELL_TEXT } from '@/app/lab/shellText'

/** The activities of one kind, each with its status as Home shows it. One whose address is still the page that lists its kind has no page of its own yet. */
export function ActivityList({ kind }: { kind: Activity['kind'] }) {
  const { store } = useAppState()
  return (
    <ul className="grid max-w-3xl gap-3">
      {ACTIVITIES.filter((activity) => activity.kind === kind).map((activity) => {
        const built = hasPage(activity)
        return (
          <li key={activity.entry} className="rounded-lg border bg-card p-4">
            {built ? (
              <Link to={activity.to} className="font-medium underline-offset-4 hover:underline">
                {activity.title}
              </Link>
            ) : (
              <span className="font-medium">{activity.title}</span>
            )}
            <p className="mt-1 text-sm">{built ? STATUS_LABEL[activityStatus(store, activity)] : SHELL_TEXT.planned}</p>
          </li>
        )
      })}
    </ul>
  )
}
