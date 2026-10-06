import { Link } from 'react-router'
import { useAppState } from '@/app/AppState'
import { PageHeader } from '@/app/PageHeader'
import { ACTIVITIES, activityStatus, STATUS_LABEL } from '@/app/activities'
import { SHELL_TEXT } from '@/app/lab/shellText'

/** #/lab: the labs, each with its status as Home shows it. A lab whose address is still this page has none of its own yet. */
export function Lab() {
  const { store } = useAppState()

  return (
    <>
      <PageHeader title="Lab" />
      <ul className="grid max-w-3xl gap-3">
        {ACTIVITIES.filter((activity) => activity.kind === 'Lab').map((activity) => {
          const built = activity.to !== '/lab'
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
    </>
  )
}
