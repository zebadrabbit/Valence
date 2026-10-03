import { shellCitations } from '@/chem-data/citations'
import { registry } from '@/chem-data/registry'
import type { Element } from '@/chem-data/schema'
import { ELECTRON_RADIUS, bohrLayout } from './bohrLayout'
import { Card, Sources } from './InspectorCard'

const counted = (n: number) => `${n} ${n === 1 ? 'electron' : 'electrons'}`

/** Valence display level 1 (spec 6.4): the selected atom's element as a Bohr diagram, with the shell counts as text. */
export function BohrCard({ element }: { element: Element }) {
  const shells = element.shells.value
  const { size, nucleus, rings } = bohrLayout(shells)
  return (
    <Card heading={`Bohr model: ${element.name}`}>
      <figure className="grid justify-items-center gap-1">
        {/* The list below says what the picture shows. */}
        <svg aria-hidden="true" width={size} height={size} viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} className="max-w-full text-foreground">
          <circle r={nucleus} className="fill-muted" stroke="currentColor" />
          <text fontSize={13} fontWeight={500} textAnchor="middle" dominantBaseline="central" fill="currentColor">
            {element.symbol}
          </text>
          {rings.map((ring, i) => (
            <g key={i}>
              <circle r={ring.radius} fill="none" stroke="currentColor" strokeOpacity={0.45} />
              {ring.electrons.map(([x, y], k) => (
                <circle key={k} cx={x} cy={y} r={ELECTRON_RADIUS} fill="currentColor" />
              ))}
            </g>
          ))}
        </svg>
        <figcaption className="text-xs text-muted-foreground">Bohr model: a simplified picture</figcaption>
      </figure>
      <ol>
        {shells.map((count, i) => (
          <li key={i}>
            Shell {i + 1}: {counted(count)}
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
