import { measurementCitations } from '@/chem-data/citations'
import type { Measurement } from '@/chem-data/measure'
import { registry } from '@/chem-data/registry'
import type { Molecule } from '@/chem-data/schema'
import { headlineValue, measuredNote } from './format'
import { Card, MoleculeNotes, Note, Row, Rows, Sources } from './InspectorCard'

const DERIVED = "Distances, angles and dihedrals are worked out from the model's atom coordinates."
const VALUE_LABEL = { distance: 'Distance', angle: 'Angle', dihedral: 'Dihedral' } as const

export const MEASURE_HINT = 'Select two atoms for a distance, three for an angle, or four for a dihedral.'

/** The measurement of the two, three or four selected atoms, in the order they were selected. */
export function MeasureCard({ molecule, measurement, atomNames }: { molecule: Molecule; measurement: Measurement; atomNames: readonly string[] }) {
  const [a, b, c, d] = measurement.atoms.map((i) => atomNames[i])
  return (
    <Card heading="Measure">
      <Rows>
        <Row label={VALUE_LABEL[measurement.kind]} note={measuredNote(molecule, measurement)}>
          {headlineValue(measurement)}
        </Row>
        {measurement.kind === 'distance' && (
          <Row label="Between">
            {a} and {b}
          </Row>
        )}
        {measurement.kind === 'angle' && (
          <>
            <Row label="Vertex" note="The angle is at the second atom you selected.">
              {b}
            </Row>
            <Row label="Between">
              {a} and {c}
            </Row>
          </>
        )}
        {measurement.kind === 'dihedral' && (
          <>
            <Row label="Atoms, in order">
              {a}, {b}, {c}, {d}
            </Row>
            <Row label="Axis" note="The twist is about the line through the second and third atoms you selected.">
              {b} to {c}
            </Row>
          </>
        )}
      </Rows>
      <Note>{MEASURE_HINT}</Note>
      <MoleculeNotes molecule={molecule} />
      <Sources citations={measurementCitations(molecule, measurement, registry.sources)} derived={DERIVED} />
    </Card>
  )
}
