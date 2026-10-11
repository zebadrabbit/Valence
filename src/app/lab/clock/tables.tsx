import { ROLE } from '@/app/lab/roles'
import { mixtureOfRun, type ClockData, type RunId } from '@/chem-data/clock/data'
import { timesTable, type ClockModel, type ClockState } from '@/engine/clock'
import { mixtureRows, mixtureTotal, runTitle, RUN_TEXT, secondsText, TABLE_TEXT, temperatureText } from './messages'

const CELL = 'border-b px-2 py-1 text-left align-top'
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
              <td key={head[at + 1]} className={`${CELL} tabular-nums ${ROLE.value}`}>
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

/** The mixture of a run as a table (spec 19.2): each flask with its liquids and their volumes, and under it what the two come to. */
export function MixtureTable({ data, run }: { data: ClockData; run: RunId }) {
  const rows = mixtureRows(data, run)
  const flasks = [RUN_TEXT.flaskA, RUN_TEXT.flaskB].map((flask) => rows.filter((row) => row.flask === flask))
  return (
    <div className="grid w-full gap-1.5">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{mixtureOfRun(data, run).name}</caption>
        <thead>
          <tr>
            <td className={CELL} />
            {[RUN_TEXT.liquid, RUN_TEXT.volume].map((heading) => (
              <th key={heading} scope="col" className={HEAD}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        {flasks.map((liquids) => (
          <tbody key={liquids[0]!.flask}>
            {liquids.map((row, at) => (
              <tr key={row.liquid}>
                {at === 0 && (
                  <th scope="rowgroup" rowSpan={liquids.length} className={`${CELL} font-medium whitespace-nowrap`}>
                    {row.flask}
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
      <p className="text-muted-foreground">{mixtureTotal(data, run)}</p>
    </div>
  )
}

/**
 * The table of times (spec 19.2), which the runs fill: a row for each of `runs`, in the engine's order, with the
 * temperature it was made at, its time once it counts, and how its watch was stopped. A run that does not count
 * yet says so in place of a time.
 */
export function TimesTable({ data, m, state, runs }: { data: ClockData; m: ClockModel; state: ClockState; runs: readonly RunId[] }) {
  const rows = timesTable(m, state).filter((row) => runs.includes(row.runId as RunId))
  return (
    <Table
      caption={TABLE_TEXT.caption}
      head={[TABLE_TEXT.run, TABLE_TEXT.temperature, TABLE_TEXT.time, TABLE_TEXT.timed]}
      rows={rows.map((row) => [
        runTitle(data, row.runId as RunId),
        row.temperatureTenths === null ? '' : temperatureText(row.temperatureTenths),
        row.tenths === null ? TABLE_TEXT.empty : secondsText(row.tenths),
        row.by === null ? '' : row.by === 'hand' ? TABLE_TEXT.byHand : TABLE_TEXT.byEnd,
      ])}
    />
  )
}
