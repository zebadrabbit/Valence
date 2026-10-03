import { Link } from 'react-router'
import { useAppState } from '@/app/AppState'
import { PageHeader } from '@/app/PageHeader'
import { ENTRY, peekStatus, type ActivityStatus } from '@/app/progress/storage'

const ACTIVITIES = [
  { entry: ENTRY.titration, kind: 'Lab', title: 'Standardization of a base by titration', to: '/lab' },
  { entry: ENTRY.aqueous, kind: 'Lab', title: 'Reactions in aqueous solution', to: '/lab' },
  { entry: ENTRY.mechanism, kind: 'Mechanism', title: 'HCl + NaHCO₃, step by step', to: '/learn' },
]

const STATUS_LABEL: Record<ActivityStatus, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  completed: 'Completed',
}

export function Home() {
  const { store } = useAppState()

  return (
    <>
      <PageHeader title="Home" />
      <p className="mb-6 max-w-prose text-muted-foreground">
        Valence is a molecule explorer and virtual general-chemistry lab. No account is needed; your progress is saved
        in this browser.
      </p>
      <ul className="grid max-w-3xl gap-3">
        {ACTIVITIES.map((activity) => (
          <li key={activity.entry} className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">{activity.kind}</p>
            <Link to={activity.to} className="font-medium underline-offset-4 hover:underline">
              {activity.title}
            </Link>
            <p className="mt-1 text-sm">{STATUS_LABEL[peekStatus(store, activity.entry)]}</p>
          </li>
        ))}
      </ul>
    </>
  )
}
