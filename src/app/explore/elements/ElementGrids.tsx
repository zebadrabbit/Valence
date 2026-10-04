import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type SyntheticEvent } from 'react'
import { Link } from 'react-router'
import { CATEGORIES, periodicTable } from '@/chem-data/periodic'
import type { PeriodicElement } from '@/chem-data/schema'
import { cellKey, cellLabel, DETACHED_ROWS, elementLink, isHighlighted, MAIN_ROWS, scrollToShow, type Highlight } from './tableLayout'
import { quantityText, TRENDS, trendScale, type TrendProperty } from './trend'

// The room a cell's focus outline needs inside the box the table scrolls in; periodic.css has the same figure.
const EDGE = 8

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
 * each cell is a link, so Enter opens it without any script. What each key does is cellKey's to say.
 */
export function ElementGrids(props: { selected: PeriodicElement | undefined; property: TrendProperty | null; highlight: Highlight }) {
  const { selected, property, highlight } = props
  // The cell that has focus, while focus is inside the grids. The tab stop goes back to the selected element when focus leaves.
  const [focused, setFocused] = useState<number | null>(null)
  // With no element selected, the tab stop stays on the cell that last had focus.
  const [last, setLast] = useState(1)
  const [pointed, setPointed] = useState<number | null>(null)
  const tabStop = focused ?? selected?.atomicNumber ?? last
  const scale = property && trendScale(property)
  const readout = periodicTable[(pointed ?? focused ?? selected?.atomicNumber ?? 0) - 1]
  const box = useRef<HTMLDivElement>(null)

  // An element chosen outside the grids (by its address, the search or the list) can be out of sight where the
  // table scrolls sideways. Bring its cell into view, sideways only, so that the page itself does not jump.
  useEffect(() => {
    const scroller = box.current
    const cell = scroller?.querySelector('[aria-current]')
    if (!scroller || !cell || scroller.contains(document.activeElement)) return
    scroller.scrollLeft += scrollToShow(scroller.getBoundingClientRect(), cell.getBoundingClientRect(), EDGE)
  }, [selected])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const from = cellOf(event)
    const action = from === null ? null : cellKey(from, event)
    if (action === null) return
    // Also at an edge, where nothing moves: the page and the sideways scroller must not scroll instead.
    event.preventDefault()
    if (action === 'open') (event.target as Element).closest<HTMLElement>('[data-z]')?.click()
    else event.currentTarget.querySelector<HTMLElement>(`[data-z="${action}"]`)?.focus()
  }

  const cell = (element: PeriodicElement) => {
    const highlighted = isHighlighted(element, highlight)
    const quantity = property ? element[property] : undefined
    const row = DETACHED_ROWS.find((r) => r.after === element)
    return (
      <td key={element.symbol}>
        <Link
          {...elementLink(element.symbol)}
          className="pt-cell"
          data-z={element.atomicNumber}
          tabIndex={element.atomicNumber === tabStop ? 0 : -1}
          aria-current={element === selected ? 'page' : undefined}
          aria-label={cellLabel(element, property, highlighted)}
          // Heard with the cell: from lanthanum the next cell is hafnium, and this says where 58 to 71 are.
          aria-describedby={row && `pt-after-${row.after.atomicNumber}`}
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
            <span id={`pt-after-${row.after.atomicNumber}`} className="sr-only">
              {row.note}
            </span>
          </span>
        )}
      </td>
    )
  }

  return (
    <div className="pt-frame" data-values={property ? true : undefined}>
      <div
        ref={box}
        className="pt-scroll"
        onKeyDown={onKeyDown}
        onFocus={(event) => {
          const z = cellOf(event)
          setFocused(z)
          if (z === null) return
          setLast(z)
          // Only when focus came from the keyboard, which is when the outline is drawn. A press of the mouse or a
          // tap focuses the cell too, and scrolling then takes the cell from under the pointer and loses the click.
          if (!event.target.matches(':focus-visible')) return
          // The browser brings a focused cell into view but can leave it against the edge of the scrolling box
          // or a little beyond it, with its outline cut off. This honours the cell's scroll-margin.
          event.target.scrollIntoView({ block: 'nearest', inline: 'nearest' })
        }}
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
                      <Readout element={readout} property={property} selected={readout === selected} place="gap" />
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
      {/* Where the table scrolls sideways its empty corner can be out of sight, so the readout is under the box.
          Under and not over: its height changes with what it says, and that must not move the table. */}
      <Readout element={readout} property={property} selected={false} place="strip" />
    </div>
  )
}

/**
 * The element under the pointer or with focus, else the selected one, written out in the table's empty
 * corner: below the width at which names fit in the cells, this is where a sighted learner reads the name.
 * Hidden from assistive technology, which gets the same words from the cell's own name. It is drawn in two
 * places and periodic.css shows one: the corner, or a strip under the table where the table scrolls sideways.
 * `selected` adds where the details are: the corner says it, the strip is next to the status line that does.
 */
function Readout(props: { element: PeriodicElement | undefined; property: TrendProperty | null; selected: boolean; place: 'gap' | 'strip' }) {
  const { element, property, selected, place } = props
  return (
    <div className={`pt-readout-${place} gap-1 p-2 text-left text-xs`}>
      {element && (
        <div aria-hidden="true" className="pt-readout-element flex items-center gap-3">
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
            {/* The card is below the table and often below the screen's edge. */}
            {selected && <span>Selected: details are below the table.</span>}
          </span>
        </div>
      )}
      <p className="text-muted-foreground">Arrow keys move between elements; Home and End go to the ends of a row. Enter opens an element.</p>
    </div>
  )
}
