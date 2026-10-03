import { bondCitations } from '@/chem-data/citations'
import type { DerivedBond } from '@/chem-data/derive'
import type { Measurement } from '@/chem-data/measure'
import { registry } from '@/chem-data/registry'
import type { Molecule } from '@/chem-data/schema'
import { bondOrder } from './format'
import { Card, MeasuredValue, measuredNote, MoleculeNotes, Row, Rows, Sources } from './InspectorCard'

const DERIVED =
  'Bond order and the σ and π count come from the Lewis structure as drawn. Polarity is the difference between the two cited electronegativities.'

/** The selected bond. `length` is the measurement between its two atoms, which carries the cited value when there is one. */
export function BondCard(props: { molecule: Molecule; bond: Molecule['bonds'][number]; derived: DerivedBond; length: Measurement; atomNames: readonly string[] }) {
  const { molecule, bond, derived, length, atomNames } = props
  return (
    <Card heading="Bond">
      <Rows>
        <Row label="Atoms">
          {atomNames[bond.a]} and {atomNames[bond.b]}
        </Row>
        <Row label="Length" note={measuredNote(molecule, length)}>
          <MeasuredValue measurement={length} />
        </Row>
        <Row label="Order" note={bond.resonanceNote}>
          {bondOrder(derived)}
        </Row>
        <Row label="Polarity" note="Pauling electronegativity difference; a rough guide.">
          {derived.electronegativityDifference.toFixed(2)}
        </Row>
        <Row label="σ and π bonds">{derived.sigmaPi}</Row>
      </Rows>
      <MoleculeNotes molecule={molecule} />
      <Sources citations={bondCitations(molecule, length, registry.elements, registry.sources)} derived={DERIVED} />
    </Card>
  )
}
