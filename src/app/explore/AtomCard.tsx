import { elementCitations } from '@/chem-data/citations'
import type { DerivedAtom } from '@/chem-data/derive'
import { configurationParts, valenceElectrons } from '@/chem-data/element'
import { formulaParts } from '@/chem-data/formula'
import { registry } from '@/chem-data/registry'
import type { Element, Molecule } from '@/chem-data/schema'
import { FormulaParts } from './Formula'
import { kjPerMol, ordinal, radius, signed } from './format'
import { Card, Disclosure, Note, Row, Rows, Sources } from './InspectorCard'

const DERIVED =
  'Formal charge is part of the Lewis structure as drawn. Oxidation state, hybridization and VSEPR geometry are worked out from that structure by the rules general chemistry textbooks use. Ionization energies are converted from the published values in eV.'

/** One selected atom: element data and the values derived from the Lewis structure, with more detail behind a disclosure. */
export function AtomCard(props: { name: string; atom: Molecule['atoms'][number]; derived: DerivedAtom; element: Element }) {
  const { name, atom, derived, element } = props
  return (
    <Card heading={`Atom: ${name}`}>
      <Rows>
        <Row label="Symbol">{element.symbol}</Row>
        <Row label="Element">{element.name}</Row>
        <Row label="Atomic number">{element.atomicNumber}</Row>
        <Row label="Standard atomic weight">{element.atomicWeight.published ?? element.atomicWeight.value}</Row>
        <Row label="Electronegativity" note={element.electronegativity.note}>
          {element.electronegativity.value} (Pauling)
        </Row>
        <Row label="Valence electrons">{valenceElectrons(element)}</Row>
        <Row label="Formal charge">{signed(atom.formalCharge)}</Row>
        <Row label="Lone pairs">{atom.lonePairs}</Row>
        <Row label="Oxidation state">{signed(derived.oxidationState)}</Row>
        <Row label="Hybridization" note={derived.hybridizationNote}>
          {derived.hybridization}
        </Row>
        <Row label="VSEPR geometry">{derived.geometry}</Row>
      </Rows>

      <Disclosure summary={`More about ${element.name.toLowerCase()}`}>
        <Rows stacked>
          <Row label="Electron configuration">
            {configurationParts(element.configuration.value).map(({ subshell, electrons }, i) => (
              <span key={subshell}>
                {i > 0 && ' '}
                {subshell}
                <sup>{electrons}</sup>
              </span>
            ))}
          </Row>
          <Row label="Ionization energies">
            <ol>
              {element.ionizationEnergiesEv.value.map((ev, i) => (
                <li key={i}>
                  {ordinal(i + 1)}: {kjPerMol(ev)}
                </li>
              ))}
            </ol>
          </Row>
          <Row label="Covalent radius">{radius(element.covalentRadius.value)}</Row>
          <Row label="Van der Waals radius">{radius(element.vdwRadius.value)}</Row>
          {element.ionicRadii.map((ion) => (
            <Row
              key={`${ion.charge}/${ion.coordination}`}
              label="Ionic radius"
              note={
                <>
                  For <FormulaParts parts={formulaParts(element.symbol, ion.charge)} /> with {ion.coordination} nearest neighbours.
                </>
              }
            >
              {radius(ion.value)}
            </Row>
          ))}
        </Rows>
        {element.notes?.map((note) => <Note key={note}>Note: {note}</Note>)}
      </Disclosure>

      <Sources citations={elementCitations(element, registry.sources)} derived={DERIVED} />
    </Card>
  )
}
