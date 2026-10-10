import { useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { FormulaParts } from '@/app/explore/Formula'
import { filterStatus, libraryView } from '@/app/explore/libraryFilter'
import { PageHeader } from '@/app/PageHeader'
import { Button } from '@/components/ui/button'
import { formulaParts } from '@/chem-data/formula'

export function Explore() {
  const [query, setQuery] = useState('')
  const field = useRef<HTMLInputElement>(null)
  const fieldId = useId()
  const view = libraryView(query)
  const clear = () => {
    setQuery('')
    field.current?.focus()
  }

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

      {/* The library is about a hundred molecules: typing a name or a formula narrows the list as it is typed. */}
      <div className="mb-6 grid max-w-md gap-1">
        <label htmlFor={fieldId} className="text-sm font-medium">
          Filter molecules
        </label>
        <div className="flex items-center gap-2">
          <input
            ref={field}
            id={fieldId}
            // A search field, so the keyboard of a tablet offers its search key; the Clear button stands in for the browser's own cross.
            type="search"
            autoComplete="off"
            spellCheck={false}
            placeholder="Name or formula"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && query !== '') clear()
            }}
            className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query !== '' && (
            <Button variant="outline" className="h-10 px-3" onClick={clear}>
              Clear
            </Button>
          )}
        </div>
        <p role="status" className="text-sm text-muted-foreground">
          {filterStatus(view, query)}
        </p>
      </div>

      <div className="grid gap-6">
        {view.groups.map((group) => (
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
                      <FormulaParts parts={formulaParts(molecule.formula, molecule.charge)} />
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
