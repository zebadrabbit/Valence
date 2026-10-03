import { useEffect } from 'react'
import { Link } from 'react-router'

/** The predictable header on every screen: breadcrumb, then the page's h1. `parent` adds a crumb between Home and the page. */
export function PageHeader({ title, parent }: { title: string; parent?: { to: string; label: string } }) {
  useEffect(() => {
    document.title = title === 'Home' ? 'Valence' : `${title} · Valence`
  }, [title])

  return (
    <header className="mb-6">
      {title !== 'Home' && (
        <nav aria-label="Breadcrumb" className="mb-1 text-sm text-muted-foreground">
          <Link to="/" className="underline-offset-4 hover:underline">
            Home
          </Link>
          <span aria-hidden="true"> / </span>
          {parent && (
            <>
              <Link to={parent.to} className="underline-offset-4 hover:underline">
                {parent.label}
              </Link>
              <span aria-hidden="true"> / </span>
            </>
          )}
          <span aria-current="page">{title}</span>
        </nav>
      )}
      {/* Layout moves focus here after each navigation. */}
      <h1 tabIndex={-1} className="w-fit rounded-sm text-2xl font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {title}
      </h1>
    </header>
  )
}
