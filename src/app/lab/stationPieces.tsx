import { useId, type ReactNode } from 'react'
import { ROLE } from './roles'
import { Bottle } from './titration/apparatus'

// What a station of a lab with stations is drawn from: the aqueous reactions lab's and the flame test lab's.

/** One step of a station: a card named by its heading. */
export function Step({ heading, children }: { heading: string; children: ReactNode }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="grid min-w-0 justify-items-start gap-3 rounded-lg border bg-card p-4 text-sm">
      <h3 id={headingId} className="text-base font-semibold">
        {heading}
      </h3>
      {children}
    </section>
  )
}

/** A short list: the hints, and what a correct observation holds. */
export function Listed({ items }: { items: readonly string[] }) {
  return (
    <ul className="grid max-w-[75ch] list-disc gap-1 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

/** A mark for the eye in front of the words that say the same; a mark of something done is in the role of a done mark. */
export function Marked({ mark, done = false, children }: { mark: string; done?: boolean; children: ReactNode }) {
  return (
    <>
      <span aria-hidden="true" className={done ? ROLE.done : undefined}>
        {mark}{' '}
      </span>
      {children}
    </>
  )
}

/**
 * A bottle as a tile named by what it holds: the bottle drawn with its label, its liquid in `liquid` where it has a
 * colour to draw, then the name, a line for each of `rows` (what it looks like, how much of it), and `children`,
 * its hazards.
 */
export function BottleTile({ name, lines, liquid, rows, children }: { name: string; lines: readonly string[]; liquid?: string | undefined; rows: readonly (readonly [label: string, value: string])[]; children: ReactNode }) {
  return (
    <div role="group" aria-label={name} className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 rounded-md border p-2">
      <div className="h-32">
        <Bottle lines={lines} liquid={liquid} />
      </div>
      <div className="grid content-start justify-items-start gap-1.5">
        <h4 className="font-medium">{name}</h4>
        {rows.map(([label, value]) => (
          <p key={label}>
            {label}: <span className={ROLE.value}>{value}</span>
          </p>
        ))}
        {children}
      </div>
    </div>
  )
}
