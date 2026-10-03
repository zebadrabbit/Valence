import { useEffect } from 'react'
import { Link } from 'react-router'

/** The predictable header on every screen: breadcrumb, then the page's h1. */
export function PageHeader({ title }: { title: string }) {
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
          <span aria-current="page">{title}</span>
        </nav>
      )}
      <h1 className="text-2xl font-semibold">{title}</h1>
    </header>
  )
}
