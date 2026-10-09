import { Link } from 'react-router'
import { BohrDiagram } from '@/app/explore/BohrDiagram'
import { EMISSION_HEADING, EmissionSpectrum } from '@/app/explore/EmissionSpectrum'
import { Card, Row, Rows, Sources } from '@/app/explore/InspectorCard'
import { periodicCitations } from '@/chem-data/citations'
import { coreAndSubshells } from '@/chem-data/element'
// The curated records alone: importing the registry here would load every molecule with the table.
import elements from '@/chem-data/elements.json'
import { spectrumOf } from '@/chem-data/emissionSpectra'
import { LIBRARY_INDEX } from '@/chem-data/libraryIndex'
import { shellsFromConfiguration } from '@/chem-data/periodic'
import { CARD_DERIVED, shellCaption, type CardRowId } from '@/chem-data/periodicCard'
import type { Element, PeriodicElement } from '@/chem-data/schema'
import sources from '@/chem-data/sources.json'
import { elementCardRows, moleculesContaining, type CardRow } from './elementCard'

// registry.test.ts validates elements.json against the schema.
const CURATED = elements as readonly Element[]

/** The card's sections, side by side where there is room (periodic table spec 7), each with the rows it holds. */
const SECTIONS: readonly { heading: string; rows: readonly CardRowId[] }[] = [
  { heading: 'Element', rows: ['symbol', 'name', 'atomicNumber', 'atomicMass', 'group', 'period', 'block', 'category'] },
  { heading: 'Electrons', rows: ['configuration', 'shells'] },
  { heading: 'Atomic properties', rows: ['electronegativity', 'covalentRadius', 'vdwRadius', 'ionizationEnergy', 'electronAffinity', 'oxidationStates'] },
  { heading: 'Physical properties and discovery', rows: ['standardState', 'meltingPoint', 'boilingPoint', 'density', 'yearDiscovered'] },
]

/** The configuration with superscript counts, as the atom card writes it, and the word PubChem marks it with. */
function Configuration({ element }: { element: PeriodicElement }) {
  const { core, parts } = coreAndSubshells(element.configuration.text)
  return (
    <>
      {core}
      {parts.map(({ subshell, electrons }, i) => (
        <span key={subshell}>
          {(i > 0 || core) && ' '}
          {subshell}
          <sup>{electrons}</sup>
        </span>
      ))}
      {element.configuration.qualifier && ` (${element.configuration.qualifier})`}
    </>
  )
}

function CardRows({ element, rows }: { element: PeriodicElement; rows: readonly CardRow[] }) {
  return (
    <Rows stacked>
      {rows.map((row) => {
        const sentences = [...(row.note ? [row.note] : []), ...row.notes]
        return (
          <Row
            key={row.id}
            label={row.label}
            note={
              sentences.length > 0 && (
                <span className="grid gap-1">
                  {sentences.map((sentence) => (
                    <span key={sentence}>{sentence}</span>
                  ))}
                </span>
              )
            }
          >
            {row.id === 'configuration' ? <Configuration element={element} /> : row.value}
          </Row>
        )
      })}
    </Rows>
  )
}

/** Everything the table holds on one element (periodic table spec 7), below the table and across the page. */
export function ElementCard({ element }: { element: PeriodicElement }) {
  const curated = CURATED.find((e) => e.symbol === element.symbol)
  const rows = elementCardRows(element, curated)
  const spectrum = spectrumOf(element.symbol)
  const molecules = moleculesContaining(element.symbol, LIBRARY_INDEX)
  return (
    <Card heading={`${element.name} (${element.symbol})`} wide>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] items-start gap-x-8 gap-y-4">
        {SECTIONS.map((section) => (
          <div key={section.heading} className="grid content-start gap-2">
            <h3 className="font-medium">{section.heading}</h3>
            <CardRows element={element} rows={rows.filter((row) => section.rows.includes(row.id))} />
            {/* The row above gives the counts the picture shows. */}
            {section.rows.includes('shells') && (
              <BohrDiagram symbol={element.symbol} shells={shellsFromConfiguration(element.configuration.text)} caption={shellCaption(element)} />
            )}
          </div>
        ))}
      </div>

      {/* Below the sections: the spectrum, or the sentence that says why there is none, with the molecules beside it. */}
      <div className="grid items-start gap-x-8 gap-y-4 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
        {'emission' in spectrum ? (
          <EmissionSpectrum name={element.name} emission={spectrum.emission} />
        ) : (
          <div className="grid max-w-md gap-2">
            <h3 className="font-medium">{EMISSION_HEADING}</h3>
            <p className="text-muted-foreground">{spectrum.none.value}</p>
          </div>
        )}
        <div className="grid gap-2">
          <h3 className="font-medium">In the molecule library</h3>
          {molecules.length === 0 ? (
            <p className="text-muted-foreground">No molecule in the library contains {element.name.toLowerCase()}.</p>
          ) : (
            <ul className="columns-[14rem] gap-x-8">
              {molecules.map((molecule) => (
                <li key={molecule.id} className="py-0.5">
                  <Link to={`/explore/${molecule.id}`} className="underline underline-offset-4">
                    {molecule.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Sources citations={periodicCitations(rows, spectrum, sources)} derived={CARD_DERIVED} />
    </Card>
  )
}
