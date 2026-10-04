import { Link } from 'react-router'
import { Formula } from '@/app/explore/Formula'
import { PageHeader } from '@/app/PageHeader'
import { libraryGroups } from '@/chem-data/library'
import { registry } from '@/chem-data/registry'

const groups = libraryGroups(registry.molecules)

export function Explore() {
  return (
    <>
      <PageHeader title="Explore" />
      <p className="mb-6 max-w-prose text-muted-foreground">
        Choose a molecule to turn it in 3D or view its Lewis structure, read about its atoms and bonds, and measure
        lengths and angles.
      </p>
      <Link
        to="/explore/elements"
        className="mb-6 block w-fit rounded-lg border bg-card p-3 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="block font-medium">Periodic table</span>
        <span className="block text-sm text-muted-foreground">
          All 118 elements, coloured by chemical family or by a property such as electronegativity.
        </span>
      </Link>
      <div className="grid gap-6">
        {groups.map((group) => (
          <section key={group.id} aria-labelledby={`topic-${group.id}`}>
            <h2 id={`topic-${group.id}`} className="mb-2 text-lg font-medium">
              {group.label}
            </h2>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3">
              {group.entries.map((molecule) => (
                <li key={molecule.id}>
                  <Link
                    to={`/explore/${molecule.id}`}
                    className="block h-full rounded-lg border bg-card p-3 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="block font-medium">{molecule.name}</span>
                    <span className="block text-sm text-muted-foreground">
                      <Formula molecule={molecule} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}
