import { ROLE } from '@/app/lab/roles'
import type { KineticsLab, State } from './engine'
import { secondsText, temperatureText } from './text'

// The tables of a lab on the kinetics engine: a plain table of figures, a mixture, and the table of times.

const CELL = 'border-b px-1.5 py-1 text-left align-top'
const HEAD = `${CELL} font-medium text-muted-foreground`

/**
 * A table of figures: its caption, its heads, and its rows, each a head of its own and then its cells. `wide` is
 * for one that a narrow page may not hold: it then stands in a region that the keyboard can reach and scroll.
 */
export function Table({ caption, head, rows, wide = false }: { caption: string; head: readonly string[]; rows: readonly (readonly string[])[]; wide?: boolean }) {
  const table = (
    <table className="w-full border-collapse text-sm">
      <caption className="mb-1 text-left font-medium">{caption}</caption>
      <thead>
        <tr>
          {head.map((heading) => (
            <th key={heading} scope="col" className={HEAD}>
              {heading}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(([first, ...cells]) => (
          <tr key={first}>
            <th scope="row" className={`${CELL} font-normal`}>
              {first}
            </th>
            {cells.map((cell, at) => (
              <td key={head[at + 1]} className={`${CELL} whitespace-nowrap tabular-nums ${ROLE.value}`}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
  if (!wide) return table
  return (
    <div role="region" aria-label={caption} tabIndex={0} className="w-full overflow-x-auto rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {table}
    </div>
  )
}

/**
 * A mixture as a table: its liquids in groups, each group headed by where its liquids are (a flask, or what is
 * poured in), each liquid with its volume, and under the table what they come to.
 */
export function MixtureTable({ caption, head, rows, total }: { caption: string; head: readonly [liquid: string, volume: string]; rows: readonly { group: string; liquid: string; volume: string }[]; total: string }) {
  const groups = [...new Set(rows.map((row) => row.group))].map((group) => rows.filter((row) => row.group === group))
  return (
    <div className="grid w-full gap-1.5">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <td className={CELL} />
            {head.map((heading) => (
              <th key={heading} scope="col" className={HEAD}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        {groups.map((liquids) => (
          <tbody key={liquids[0]!.group}>
            {liquids.map((row, at) => (
              <tr key={row.liquid}>
                {at === 0 && (
                  <th scope="rowgroup" rowSpan={liquids.length} className={`${CELL} font-medium whitespace-nowrap`}>
                    {row.group}
                  </th>
                )}
                <th scope="row" className={`${CELL} font-normal`}>
                  {row.liquid}
                </th>
                <td className={`${CELL} whitespace-nowrap tabular-nums ${ROLE.value}`}>{row.volume}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
      <p className="text-muted-foreground">{total}</p>
    </div>
  )
}

/**
 * The table of times, which the runs fill: a row for each of `runs`, in the engine's order, with the temperature
 * it was made at, its time once it counts, and how its watch was stopped. A run that does not count yet says so
 * in place of a time.
 */
export function TimesTable({ lab: { engine, m, words }, state, runs }: { lab: KineticsLab; state: State; runs: readonly string[] }) {
  const rows = engine.timesTable(m, state).filter((row) => runs.includes(row.runId))
  return (
    <Table
      caption={words.table.caption}
      head={[words.table.run, words.table.temperature, words.table.time, words.table.timed]}
      rows={rows.map((row) => [
        words.runTitle(row.runId),
        row.temperatureTenths === null ? '' : temperatureText(row.temperatureTenths),
        row.tenths === null ? words.table.empty : secondsText(row.tenths),
        row.by === null ? '' : row.by === 'hand' ? words.table.byHand : words.table.byEnd,
      ])}
    />
  )
}
