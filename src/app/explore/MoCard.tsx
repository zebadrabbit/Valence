import { moCitations } from '@/chem-data/citations'
import { bondOrder, describeMoDiagram, moConfiguration, unpairedElectrons } from '@/chem-data/mo'
import { registry } from '@/chem-data/registry'
import type { MoDiagram } from '@/chem-data/schema'
import { Card, Row, Rows, Sources } from './InspectorCard'
import { ORBITAL_WIDTH, moLayout } from './moLayout'

/** An electron as an arrow through the orbital's line: spin up on the left, spin down on the right. */
function Arrow({ x, y, up }: { x: number; y: number; up: boolean }) {
  const [tail, tip, barb] = up ? [y + 11, y - 11, 5] : [y - 11, y + 11, -5]
  return <path d={`M${x} ${tail}V${tip}M${x - 3.5} ${tip + barb}L${x} ${tip}L${x + 3.5} ${tip + barb}`} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
}

/** Valence display level 3 (spec 6.4): the molecular orbital diagram of O₂ or N₂, with its configuration as text. */
export function MoCard({ diagram, name }: { diagram: MoDiagram; name: string }) {
  const { width, height, levels } = moLayout(diagram)
  return (
    <Card heading="Molecular orbital diagram">
      <figure className="grid justify-items-center gap-1">
        <svg
          role="img"
          aria-label={describeMoDiagram(diagram, name)}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="max-w-full text-foreground"
        >
          {levels.map((level) => (
            <g key={level.label}>
              <text x={4} y={level.y} fontSize={14} dominantBaseline="central" fill="currentColor">
                {level.label}
              </text>
              {level.orbitals.map((orbital, k) => (
                <g key={k}>
                  <line x1={orbital.x - ORBITAL_WIDTH / 2} x2={orbital.x + ORBITAL_WIDTH / 2} y1={level.y} y2={level.y} stroke="currentColor" strokeWidth={2} />
                  {orbital.electrons >= 1 && <Arrow x={orbital.x - (orbital.electrons === 2 ? 6 : 0)} y={level.y} up />}
                  {orbital.electrons === 2 && <Arrow x={orbital.x + 6} y={level.y} up={false} />}
                </g>
              ))}
            </g>
          ))}
        </svg>
        <figcaption className="text-xs text-muted-foreground">
          Valence orbitals only. Energy increases up the page; the spacing is not to scale. A star marks an antibonding orbital.
        </figcaption>
      </figure>
      <Rows stacked>
        <Row label="Electron configuration">
          {moConfiguration(diagram).map(({ label, electrons }, i) => (
            <span key={label}>
              {i > 0 && ' '}({label})<sup>{electrons}</sup>
            </span>
          ))}
        </Row>
      </Rows>
      <Rows>
        <Row label="Bond order">{bondOrder(diagram)}</Row>
        <Row label="Unpaired electrons">{unpairedElectrons(diagram)}</Row>
      </Rows>
      {diagram.callout && <p className="rounded-md border border-foreground/40 p-2">{diagram.callout}</p>}
      <Sources
        citations={moCitations(diagram, registry.sources)}
        derived="Bond order is half the difference between the bonding and antibonding electrons. The arrows fill each level by Hund's rule: one electron in every orbital of the level before any orbital takes a second."
      />
    </Card>
  )
}
