import { EquationLine as Line } from '@/app/lab/EquationBuilder'
import type { AqueousData } from '@/chem-data/aqueous/data'
import type { Entry } from '@/engine/aqueous'
import { BENCH_TEXT } from './messages'

export { Formula } from '@/app/lab/EquationBuilder'

/** The formula of a species of the record; its id where the record has no such species, which a stored entry is held not to have. */
export const formulaOf = (data: AqueousData, speciesId: string) => data.species.find((s) => s.id === speciesId)?.formula ?? speciesId

/**
 * An equation in one line, as it is built or as it was entered: "Fe³⁺(aq) + 3OH⁻(aq) → Fe(OH)₃(s)", with a gap
 * where a side has nothing on it yet, or "No reaction". The same line as messages.equationText writes, drawn.
 */
export function EquationLine({ data, entry }: { data: AqueousData; entry: Entry }) {
  return <Line entry={entry} formula={(speciesId) => formulaOf(data, speciesId)} noReaction={BENCH_TEXT.noReaction} />
}
