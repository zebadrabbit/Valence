import { Atom } from 'lucide-react'
import { FloatingPanel } from '@/app/lab/FloatingPanel'
import type { AqueousData } from '@/chem-data/aqueous/data'
import { AQUEOUS_PRIMER } from '@/chem-data/aqueous/primer'
import { Formula } from './Formula'
import { chargeText, ionRows, wholeRows } from './ions'
import { IONS_TEXT, STATE_NAME } from './messages'

/** The heading of the primer's card of worked steps, which the note under the second table sends a reader to. */
const STEPS_TOPIC = AQUEOUS_PRIMER.find((section) => section.id === 'working')!.heading

const HEAD = 'border p-1 text-left align-bottom font-medium'
const CELL = 'border p-1 align-top'

/**
 * The ions of the bench as a real table, a row for each ion headed by its name: its formula with the charge drawn
 * raised, the charge again as a number and a sign, whether it is one atom or a group, its colour in solution in
 * words, and the bottles that hold it. Under it, a second table for what is not an ion and is written whole: water,
 * the gases and the two bottles that are a solid. Nothing is worked out here: the rows are the record's (ions.ts).
 *
 * It names no solid that forms in a tube: which compound a pair of ions makes is the learner's to write.
 */
export function IonsTables({ data }: { data: AqueousData }) {
  return (
    <>
      <table className="w-full border-collapse text-xs">
        <caption className="mb-2 text-left text-sm">{IONS_TEXT.caption}</caption>
        <thead>
          <tr>
            {IONS_TEXT.columns.map((column) => (
              <th key={column} scope="col" className={HEAD}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ionRows(data).map((row) => (
            <tr key={row.id}>
              <th scope="row" className={`${CELL} text-left font-medium whitespace-nowrap`}>
                {row.name}
              </th>
              <td className={`${CELL} text-sm whitespace-nowrap`}>
                <Formula text={row.formula} />
              </td>
              <td className={`${CELL} whitespace-nowrap`}>{chargeText(row.charge)}</td>
              <td className={`${CELL} whitespace-nowrap`}>{row.atoms === 1 ? IONS_TEXT.oneAtom : IONS_TEXT.group(row.atoms)}</td>
              <td className={`${CELL} whitespace-nowrap`}>{row.colour ?? IONS_TEXT.colourless}</td>
              <td className={CELL}>{row.bottles.map((bottle) => (bottle.form === 'solution' ? bottle.name : `${bottle.name} (${IONS_TEXT.form[bottle.form]})`)).join('; ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs">{IONS_TEXT.formNote}</p>
      <table className="w-full border-collapse text-xs">
        <caption className="mb-2 text-left text-sm">{IONS_TEXT.wholeCaption}</caption>
        <thead>
          <tr>
            {IONS_TEXT.wholeColumns.map((column) => (
              <th key={column} scope="col" className={HEAD}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {wholeRows(data).map((row) => (
            <tr key={row.formula}>
              <th scope="row" className={`${CELL} text-left font-medium`}>
                {row.name}
              </th>
              <td className={`${CELL} text-sm whitespace-nowrap`}>
                <Formula text={row.formula} />
              </td>
              <td className={CELL}>{STATE_NAME[row.state]}</td>
              <td className={`${CELL} whitespace-nowrap`}>{row.states.map((state) => `(${state})`).join(` ${IONS_TEXT.or} `)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs">{IONS_TEXT.solidNote(STEPS_TOPIC)}</p>
    </>
  )
}

/** The ions of the bench in a panel that floats over the page and can be moved, beside the solubility table's. */
export function IonsPanel({ data }: { data: AqueousData }) {
  return (
    <FloatingPanel name={IONS_TEXT.name} icon={<Atom aria-hidden="true" />} width={620} height={720} fromRight={760}>
      <IonsTables data={data} />
    </FloatingPanel>
  )
}
