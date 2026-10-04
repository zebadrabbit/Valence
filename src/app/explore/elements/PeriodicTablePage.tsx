import { useId, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Card } from '@/app/explore/InspectorCard'
import { PageHeader } from '@/app/PageHeader'
import { NotFound } from '@/app/pages/NotFound'
import { CATEGORIES, periodicTable } from '@/chem-data/periodic'
import { ElementGrids } from './ElementGrids'
import { ElementList } from './ElementList'
import './periodic.css'
import { HIGHLIGHT_CHOICES, highlightKey, highlightStatus, type Highlight } from './tableLayout'
import { TableLegend } from './TableLegend'
import { HighlightDescription, TableNotes } from './TableNotes'
import { TRENDS, type TrendProperty } from './trend'

const SELECT = 'h-8 min-w-0 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'
const TREND_PROPERTIES = Object.keys(TRENDS) as TrendProperty[]
const HIGHLIGHTS = HIGHLIGHT_CHOICES.flatMap((set) => set.choices)

/**
 * The periodic table (periodic table spec 4, 6 and 8), with or without an element selected: the address is
 * #/explore/elements or #/explore/elements/Xe. The colouring and the highlight are kept while elements are chosen.
 */
export function PeriodicTablePage() {
  const { symbol } = useParams()
  const selected = symbol === undefined ? undefined : periodicTable.find((e) => e.symbol.toLowerCase() === symbol.toLowerCase())
  const [property, setProperty] = useState<TrendProperty | null>(null)
  const [highlight, setHighlight] = useState<Highlight>(null)
  const colourId = useId()
  const highlightId = useId()

  // After the hooks: an address whose symbol no element has.
  if (symbol !== undefined && !selected) return <NotFound />

  return (
    <>
      <PageHeader title="Periodic table" parent={{ to: '/explore', label: 'Explore' }} />

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <div className="flex max-w-full items-center gap-2">
          <label htmlFor={colourId} className="whitespace-nowrap">
            Colour by
          </label>
          <select id={colourId} className={SELECT} value={property ?? ''} onChange={(e) => setProperty(TREND_PROPERTIES.find((p) => p === e.target.value) ?? null)}>
            <option value="">Chemical family</option>
            {TREND_PROPERTIES.map((p) => (
              <option key={p} value={p}>
                {TRENDS[p].label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex max-w-full items-center gap-2">
          <label htmlFor={highlightId}>Highlight</label>
          <select
            id={highlightId}
            className={SELECT}
            value={highlightKey(highlight)}
            onChange={(e) => setHighlight(HIGHLIGHTS.find((choice) => highlightKey(choice.highlight) === e.target.value)?.highlight ?? null)}
          >
            <option value="">Nothing</option>
            {HIGHLIGHT_CHOICES.map((set) => (
              <optgroup key={set.label} label={set.label}>
                {set.choices.map((choice) => (
                  <option key={choice.label} value={highlightKey(choice.highlight)}>
                    {choice.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <Link to="/explore" className="underline underline-offset-4">
          Molecule library
        </Link>
      </div>

      <TableLegend property={property} highlight={highlight} onHighlight={setHighlight} />
      <ElementGrids selected={selected} property={property} highlight={highlight} />

      {/* Choosing an element leaves focus on its cell, so the selection is announced here; so is the highlight. */}
      <p role="status" className="mt-2 text-sm">
        {[selected && `Selected: ${selected.name}. Its details are below the table.`, highlightStatus(highlight)].filter(Boolean).join(' ')}
      </p>

      <div className="mt-3 grid gap-3">
        <HighlightDescription highlight={highlight} />
        {/* ponytail: a stand-in until the element card of spec 7 is built; it says only what the cell already does. */}
        <Card heading={selected ? `${selected.name} (${selected.symbol})` : 'Element details'}>
          <p className="text-muted-foreground">
            {selected
              ? `Atomic number ${selected.atomicNumber}, ${CATEGORIES.find((c) => c.category === selected.category)?.member}.`
              : 'Choose an element in the table to see its details here.'}
          </p>
        </Card>
      </div>

      <TableNotes />
      <div className="mt-4">
        <ElementList selected={selected} property={property} />
      </div>
    </>
  )
}
