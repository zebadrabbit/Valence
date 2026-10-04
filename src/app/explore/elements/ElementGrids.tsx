import { useState, type CSSProperties, type KeyboardEvent, type SyntheticEvent } from 'react'
import { Link } from 'react-router'
import { CATEGORIES, periodicTable } from '@/chem-data/periodic'
import type { PeriodicElement } from '@/chem-data/schema'
import { cellLabel, DETACHED_ROWS, isHighlighted, MAIN_ROWS, move, type Highlight } from './tableLayout'
import { quantityText, TRENDS, trendScale, type TrendProperty } from './trend'

const MOVE_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'] as const
const isMoveKey = (key: string): key is (typeof MOVE_KEYS)[number] => (MOVE_KEYS as readonly string[]).includes(key)

/** The atomic number of the cell an event came from, if it came from one. */
function cellOf(event: SyntheticEvent): number | null {
  const z = (event.target as Element).closest<HTMLElement>('[data-z]')?.dataset.z
  return z === undefined ? null : Number(z)
}

/** The fill of a family, as periodic.css names it. */
export const familyFill = (category: string) => ({ '--fill': `var(--family-${category.toLowerCase().replaceAll(' ', '-')})` }) as CSSProperties

const COLUMNS = (
  <colgroup>
    <col className="pt-period-column" />
    {MAIN_ROWS[0]!.map((_, c) => (
      <col key={c} />
    ))}
  </colgroup>
)
// The empty block above the transition metals, where the readout goes: columns 3 to 12 of periods 1 to 3.
const inGap = (r: number, c: number) => r < 3 && c >= 2 && c < 12

/**
 * The table itself (periodic table spec 6 and 8): the main table and the two rows below it, as two native
 * tables that are each a grid and share one tab stop. Arrow keys, Home and End move between the cells;
 * each cell is a link, so Enter opens it without any script.
 */
export function ElementGrids(props: { selected: PeriodicElement | undefined; property: TrendProperty | null; highlight: Highlight }) {
  const { selected, property, highlight } = props
  // The cell that has focus, while focus is inside the grids. The tab stop goes back to the selected element when focus leaves.
  const [focused, setFocused] = useState<number | null>(null)
  const [pointed, setPointed] = useState<number | null>(null)
  const tabStop = focused ?? selected?.atomicNumber ?? 1
  const scale = property && trendScale(property)
  const readout = periodicTable[(pointed ?? focused ?? selected?.atomicNumber ?? 0) - 1]

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Alt+Left is the browser's Back; leave every modified key alone.
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !isMoveKey(event.key)) return
    const from = cellOf(event)
    if (from === null) return
    // Also at an edge, where nothing moves: the page and the sideways scroller must not scroll instead.
    event.preventDefault()
    event.currentTarget.querySelector<HTMLElement>(`[data-z="${move(from, event.key)}"]`)?.focus()
  }

  const cell = (element: PeriodicElement) => {
    const highlighted = isHighlighted(element, highlight)
    const quantity = property ? element[property] : undefined
    const row = DETACHED_ROWS.find((r) => r.after === element)
    return (
      <td key={element.symbol}>
        {/* replace: Back leaves the table in one step. keepFocus: Layout leaves focus on the cell (spec 8). */}
        <Link
          to={`/explore/elements/${element.symbol}`}
          replace
          state={{ keepFocus: true }}
          className="pt-cell"
          data-z={element.atomicNumber}
          tabIndex={element.atomicNumber === tabStop ? 0 : -1}
          aria-current={element === selected ? 'page' : undefined}
          aria-label={cellLabel(element, property, highlighted)}
          data-trend={scale ? (quantity ? 'value' : 'none') : undefined}
          data-highlighted={highlighted || undefined}
          data-dim={(highlight !== null && !highlighted) || undefined}
          style={scale ? ({ '--t': scale.shade(element) ?? 0 } as CSSProperties) : familyFill(element.category)}
        >
          <span className="pt-number">{element.atomicNumber}</span>
          <span className="pt-symbol">{element.symbol}</span>
          <span className="pt-name">{element.name}</span>
          {/* Without its unit, which the legend gives. Empty for an element with no value: the hatching and the cell's name say so. */}
          {property && <span className="pt-value">{quantity?.published}</span>}
        </Link>
        {row && (
          <span className="pt-marker">
            <span aria-hidden="true">{row.marker}</span>
            <span className="sr-only">{row.note}</span>
          </span>
        )}
      </td>
    )
  }

  return (
    <div
      className="pt-scroll"
      data-values={property ? true : undefined}
      onKeyDown={onKeyDown}
      onFocus={(event) => setFocused(cellOf(event))}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(null)
      }}
      onPointerOver={(event) => setPointed(cellOf(event))}
      onPointerLeave={() => setPointed(null)}
    >
      <table role="grid" aria-label="Periodic table, periods 1 to 7" className="pt-table">
        {COLUMNS}
        <thead>
          <tr>
            <td />
            {MAIN_ROWS[0]!.map((_, c) => (
              <th key={c} scope="col">
                <span className="sr-only">Group </span>
                {c + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MAIN_ROWS.map((row, r) => (
            <tr key={r}>
              <th scope="row">
                <span className="sr-only">Period </span>
                {r + 1}
              </th>
              {row.map((element, c) =>
                element ? (
                  cell(element)
                ) : !inGap(r, c) ? (
                  <td key={c} />
                ) : r === 0 && c === 2 ? (
                  <td key={c} rowSpan={3} colSpan={10} className="align-bottom">
                    <Readout element={readout} property={property} />
                  </td>
                ) : null,
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* A table of their own: under the main table's column headers, cerium would be announced as group 4. */}
      <table role="grid" aria-label={`${DETACHED_ROWS[0]!.label} and ${DETACHED_ROWS[1]!.label.toLowerCase()}`} className="pt-table">
        {COLUMNS}
        <tbody>
          {DETACHED_ROWS.map((row) => (
            <tr key={row.period}>
              <th scope="row" colSpan={4}>
                <span aria-hidden="true">{row.marker} </span>
                {row.label}
                <span className="sr-only">, period {row.period}</span>
              </th>
              {row.elements.map(cell)}
              <td />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * The element under the pointer or with focus, else the selected one, written out in the table's empty
 * corner: below the width at which names fit in the cells, this is where a sighted learner reads the name.
 * Hidden from assistive technology, which gets the same words from the cell's own name.
 */
function Readout({ element, property }: { element: PeriodicElement | undefined; property: TrendProperty | null }) {
  return (
    <div className="grid gap-1 p-2 text-left text-xs">
      {element && (
        <div aria-hidden="true" className="flex items-center gap-3">
          <span className="text-3xl font-semibold">{element.symbol}</span>
          <span className="grid text-sm leading-tight">
            <span>
              {element.atomicNumber} · <span className="font-medium">{element.name}</span>
            </span>
            <span>{CATEGORIES.find((c) => c.category === element.category)?.member}</span>
            {property && (
              <span>
                {TRENDS[property].name}: {quantityText(element[property])}
              </span>
            )}
          </span>
        </div>
      )}
      <p className="text-muted-foreground">Arrow keys move between elements; Home and End go to the ends of a row. Enter opens an element.</p>
    </div>
  )
}
