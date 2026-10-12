import { useId, type ReactNode } from 'react'

/** A card of this lab: one sheet, or two with a rule between them. */
export const CARD = 'grid min-w-0 divide-y rounded-lg border bg-card text-sm'
export const SHEET = 'grid min-w-0 justify-items-start gap-2 p-3'
export const HEADING = 'text-base font-semibold'

/** One sheet of a card, named by its heading. */
export function Sheet({ heading, children }: { heading: string; children: ReactNode }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className={SHEET}>
      <h3 id={headingId} className={HEADING}>
        {heading}
      </h3>
      {children}
    </section>
  )
}
