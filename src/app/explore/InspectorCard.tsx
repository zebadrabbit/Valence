import { useId, type ReactNode } from 'react'
import type { Citation } from '@/chem-data/citations'
import { GEOMETRY_SOURCE_LABEL } from '@/chem-data/library'
import type { Measurement } from '@/chem-data/measure'
import type { Molecule } from '@/chem-data/schema'
import { cited, measurementValue } from './format'

// The pieces every inspector card is built from.

const SUMMARY =
  'w-fit cursor-pointer rounded-sm text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function Card({ heading, children }: { heading: string; children: ReactNode }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="grid min-w-0 gap-2 rounded-lg border bg-card p-3 text-sm">
      <h2 id={headingId} className="font-medium">
        {heading}
      </h2>
      {children}
    </section>
  )
}

/** Label and value side by side; `stacked` puts each value under its label, for long values in a narrow card. */
export function Rows({ stacked, children }: { stacked?: boolean; children: ReactNode }) {
  const layout = stacked ? 'grid-cols-[minmax(0,1fr)] [&>dd]:mb-1' : 'grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1'
  return <dl className={`grid break-words ${layout}`}>{children}</dl>
}

/** A label and its value. The note, when there is one, runs under both at full width. */
export function Row({ label, note, children }: { label: string; note?: ReactNode; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{children}</dd>
      {note && <dd className="col-span-full mb-1 text-xs text-muted-foreground">{note}</dd>}
    </>
  )
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>
}

/** A native disclosure: closed until asked for, and it works by keyboard without any script. */
export function Disclosure({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details>
      <summary className={SUMMARY}>{summary}</summary>
      <div className="mt-2 grid gap-2">{children}</div>
    </details>
  )
}

/** The "Sources" control of a card (spec 5.1): each citation with the values it covers, and what the app works out itself. */
export function Sources({ citations, derived }: { citations: readonly Citation[]; derived: string }) {
  return (
    <Disclosure summary="Sources">
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 text-xs wrap-anywhere">
        {citations.map(({ source, covers }) => (
          <li key={source.id}>
            <span className="font-medium">{covers.join(', ')}: </span>
            <a href={source.url} rel="noreferrer" className="underline underline-offset-4">
              {source.citation}
            </a>
          </li>
        ))}
      </ul>
      <Note>{derived}</Note>
    </Disclosure>
  )
}

/** A measured or cited length, angle or dihedral: the cited value where the molecule has one, the model's otherwise. */
export function MeasuredValue({ measurement }: { measurement: Measurement }) {
  return <>{measurement.cited ? cited(measurement.cited.value, measurement.kind) : measurementValue(measurement)}</>
}

/** Says where a MeasuredValue comes from, labelled with the molecule's geometry source. */
export function measuredNote(molecule: Molecule, measurement: Measurement): string {
  const label = GEOMETRY_SOURCE_LABEL[molecule.geometrySource]
  return measurement.cited
    ? `Cited value, ${label}. The model's coordinates give ${measurementValue(measurement)}.`
    : `Measured from the model's coordinates. Model geometry: ${label}.`
}

/** The molecule's own notes, such as "One conformer of many." */
export function MoleculeNotes({ molecule }: { molecule: Molecule }) {
  return molecule.notes?.map((note) => <Note key={note}>Note: {note}</Note>)
}
