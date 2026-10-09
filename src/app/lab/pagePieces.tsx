import { ExternalLink } from 'lucide-react'
import type { ReactNode } from 'react'
import { SHELL_TEXT } from './shellText'

// What the head of a lab page and of the mechanism timeline's page both have.

/** A notice over the page (the browser is not saving; a stored run was set aside): a status paragraph in a box. */
export function Notice({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="mb-4 max-w-prose rounded-md border p-3 text-sm">
      {children}
    </p>
  )
}

/** The periodic table in a browser tab of its own, so that the page is not left. */
export function PeriodicTableLink() {
  return (
    <a
      href="#/explore/elements"
      target="_blank"
      rel="noopener"
      className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
    >
      {SHELL_TEXT.periodicTable}
      <ExternalLink aria-hidden="true" className="size-4" />
      <span className="sr-only">{SHELL_TEXT.newTab}</span>
    </a>
  )
}
