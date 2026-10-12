import { MixtureTable as Mixture } from '@/app/lab/kinetics/tables'
import { mixtureOfRun, type ClockData, type RunId } from '@/chem-data/clock/data'
import { mixtureRows, mixtureTotal, RUN_TEXT } from './messages'

// The plain table and the table of times are the shared pieces (src/app/lab/kinetics/tables.tsx).
export { Table } from '@/app/lab/kinetics/tables'

/** The mixture of a run as a table (spec 19.2): each flask with its liquids and their volumes, and under it what the two come to. */
export function MixtureTable({ data, run }: { data: ClockData; run: RunId }) {
  return <Mixture caption={mixtureOfRun(data, run).name} head={[RUN_TEXT.liquid, RUN_TEXT.volume]} rows={mixtureRows(data, run).map((row) => ({ group: row.flask, liquid: row.liquid, volume: row.volume }))} total={mixtureTotal(data, run)} />
}
