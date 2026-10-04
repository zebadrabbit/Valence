import { Link } from 'react-router'
import { useAppState } from '@/app/AppState'
import { PageHeader } from '@/app/PageHeader'
import { ACTIVITIES } from '@/app/activities'
import { peekStatus, type ActivityStatus } from '@/app/progress/storage'
import { ELEMENT_INDEX } from '@/chem-data/elementIndex'
import { LIBRARY_INDEX } from '@/chem-data/libraryIndex'

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
        in this browser. Search in the menu (Ctrl+K, or ⌘K on a Mac) jumps to any molecule, element, lab or page.
      </p>
      <ul className="grid max-w-3xl gap-3">
        <li className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Explorer</p>
          <Link to="/explore" className="font-medium underline-offset-4 hover:underline">
            Molecule explorer
          </Link>
          <p className="mt-1 text-sm">
            {LIBRARY_INDEX.length} molecules to turn in 3D or view as Lewis structures, with cards for each atom and bond and a
            tool for measuring lengths and angles.
          </p>
        </li>
        <li className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Explorer</p>
          <Link to="/explore/elements" className="font-medium underline-offset-4 hover:underline">
            Periodic table
          </Link>
          <p className="mt-1 text-sm">
            All {ELEMENT_INDEX.length} elements, coloured by chemical family or by a property such as electronegativity, with a card
            for each element that gives its values and their sources.
          </p>
        </li>
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
