import { shellCitations } from '@/chem-data/citations'
import { registry } from '@/chem-data/registry'
import type { Element } from '@/chem-data/schema'
import { BohrDiagram } from './BohrDiagram'
import { electrons } from './format'
import { Card, Sources } from './InspectorCard'

/**
 * Valence display level 1 (spec 6.4): the selected atom's element as a Bohr diagram, with the shell counts as text.
 * It is the neutral atom on its own, whatever the selected atom's bonds and charge, and the caption says so.
 */
export function BohrCard({ element }: { element: Element }) {
  const shells = element.shells.value
  return (
    <Card heading={`Bohr model: ${element.name}`}>
      {/* The list below says what the picture shows. */}
      <BohrDiagram symbol={element.symbol} shells={shells} caption={`Bohr model of a neutral, isolated ${element.name.toLowerCase()} atom: a simplified picture`} />
      <ol>
        {shells.map((count, i) => (
          <li key={i}>
            Shell {i + 1}: {electrons(count)}
          </li>
        ))}
      </ol>
      <Sources
        citations={shellCitations(element, registry.sources)}
        derived="The rings are drawn from the electrons-per-shell counts. Their sizes and spacing are not to scale."
      />
    </Card>
  )
}
