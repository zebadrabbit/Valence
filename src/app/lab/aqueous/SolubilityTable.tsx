import { Table } from 'lucide-react'
import { FloatingPanel } from '@/app/lab/FloatingPanel'
import type { AqueousData } from '@/chem-data/aqueous/data'
import { Formula, formulaOf } from './Formula'
import { SOLUBILITY_TEXT } from './messages'

/** The ions of one kind in the record's solubility rows, each once, in the order the rows first name them. */
const ionsOf = (data: AqueousData, key: 'cationId' | 'anionId') => [...new Set(data.solubility.map((row) => row[key]))]

/**
 * The lab's solubility table as a real table: a row for each positive ion, a column for each negative ion, and in
 * each cell what the record holds for the pair, in a word. A pair the record does not hold is said to be not
 * listed, and the key under the table says what that means. Nothing is worked out here: the cells are the rows of
 * the record (spec 8.1), which hold only the pairs the ten stations can bring together.
 */
export function SolubilityGrid({ data }: { data: AqueousData }) {
  const anions = ionsOf(data, 'anionId')
  return (
    <>
      <table className="w-full border-collapse text-xs">
        <caption className="mb-2 text-left text-sm">{SOLUBILITY_TEXT.caption}</caption>
        <thead>
          <tr>
            <th scope="col" className="border p-1 text-left font-normal text-muted-foreground">
              <span className="sr-only">{SOLUBILITY_TEXT.corner}</span>
            </th>
            {anions.map((anion) => (
              <th key={anion} scope="col" className="border p-1 text-sm">
                <Formula text={formulaOf(data, anion)} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ionsOf(data, 'cationId').map((cation) => (
            <tr key={cation}>
              <th scope="row" className="border p-1 text-left text-sm">
                <Formula text={formulaOf(data, cation)} />
              </th>
              {anions.map((anion) => {
                const row = data.solubility.find((r) => r.cationId === cation && r.anionId === anion)
                return (
                  <td key={anion} className={`border p-1 text-center ${row === undefined ? 'text-muted-foreground' : row.soluble ? '' : 'bg-muted font-semibold'}`}>
                    {row === undefined ? SOLUBILITY_TEXT.notListed : row.soluble ? SOLUBILITY_TEXT.soluble : SOLUBILITY_TEXT.insoluble}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-muted-foreground">{SOLUBILITY_TEXT.key}</p>
    </>
  )
}

/** The solubility table in a panel that floats over the page and can be moved, beside the calculator's. */
export function SolubilityTable({ data }: { data: AqueousData }) {
  return (
    <FloatingPanel name={SOLUBILITY_TEXT.name} icon={<Table aria-hidden="true" />} width={440} height={460} fromRight={304}>
      <SolubilityGrid data={data} />
    </FloatingPanel>
  )
}
