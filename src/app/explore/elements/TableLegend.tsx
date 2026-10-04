import { useId } from 'react'
import { Check } from 'lucide-react'
import { Note, Sources } from '@/app/explore/InspectorCard'
import { Button } from '@/components/ui/button'
import { citations } from '@/chem-data/citations'
import { CATEGORIES, CATEGORY_HEADING, NO_VALUE, periodicTable } from '@/chem-data/periodic'
// The sources alone, as on the About page: the registry would bring every molecule with it.
import sources from '@/chem-data/sources.json'
import { familyFill } from './ElementGrids'
import type { Highlight } from './tableLayout'
import { quantityText, ROUNDED_NOTE, roundedInCells, trendNotes, TRENDS, trendScale, type TrendProperty } from './trend'

/**
 * What the table's colours mean (periodic table spec 6). By family: one toggle button per family, which
 * highlights it. By a property: the two ends of the scale in words, the hatching, the notes on the scale
 * and the source of the values.
 */
export function TableLegend(props: { property: TrendProperty | null; highlight: Highlight; onHighlight(highlight: Highlight): void }) {
  const { property, highlight, onHighlight } = props
  const headingId = useId()
  if (property) return <TrendLegend property={property} />
  return (
    <section aria-labelledby={headingId} className="mb-3 text-sm">
      <div className="mb-1 flex flex-wrap items-baseline gap-x-3">
        <h2 id={headingId} className="font-medium">
          {CATEGORY_HEADING}
        </h2>
        <Note>Choose a family to highlight its elements. The notes on the families are below the table.</Note>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {CATEGORIES.map(({ category, family }) => {
          const pressed = highlight?.kind === 'category' && highlight.value === category
          return (
            <li key={category}>
              <Button variant="outline" size="sm" aria-pressed={pressed} onClick={() => onHighlight(pressed ? null : { kind: 'category', value: category })}>
                <span aria-hidden="true" className="pt-swatch" style={familyFill(category)} />
                {family}
                {/* The tick, not the colour alone, marks a pressed button. */}
                {pressed && <Check aria-hidden="true" />}
              </Button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function TrendLegend({ property }: { property: TrendProperty }) {
  const headingId = useId()
  const { label } = TRENDS[property]
  const { min, max, lowest, highest, missing } = trendScale(property)
  const notes = trendNotes(property)
  return (
    <section aria-labelledby={headingId} className="mb-3 grid gap-1 text-sm">
      <h2 id={headingId} className="font-medium">
        {label}
      </h2>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          Lowest: {quantityText(min)}, {lowest.name.toLowerCase()}
        </span>
        <span aria-hidden="true" className="pt-scale" />
        <span>
          Highest: {quantityText(max)}, {highest.name.toLowerCase()}
        </span>
        <span>Shaded on a linear scale between the two.</span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="pt-swatch" data-trend="none" />
          {NO_VALUE}: {missing} elements
        </span>
      </p>
      {notes.map((note) => (
        <Note key={note.text}>{note.text}</Note>
      ))}
      {roundedInCells(property) && <Note>{ROUNDED_NOTE}</Note>}
      <Sources
        citations={citations(
          [
            ...periodicTable.flatMap((element) => (element[property] ? [[label, element[property].sourceId] as const] : [])),
            ...notes.flatMap((note) => note.sourceIds.map((id) => ['Notes on the scale', id] as const)),
          ],
          sources,
        )}
        derived="Each cell is shaded by how far its value lies from the lowest to the highest, on a linear scale. The colours are a display choice."
      />
    </section>
  )
}
