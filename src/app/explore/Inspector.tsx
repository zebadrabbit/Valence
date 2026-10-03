import { Fragment } from 'react'
import type { Prefs } from '@/app/preferences'
import { deriveAtoms, deriveBonds } from '@/chem-data/derive'
import { VALENCE_BOND_NOTE, describeHybridLobes, hybridLobes } from '@/chem-data/hybrid'
import { measure } from '@/chem-data/measure'
import { registry } from '@/chem-data/registry'
import type { Molecule } from '@/chem-data/schema'
import { AtomCard } from './AtomCard'
import { BohrCard } from './BohrCard'
import { BondCard } from './BondCard'
import { Card, Note } from './InspectorCard'
import { MEASURE_HINT, MeasureCard } from './MeasureCard'
import { MoCard } from './MoCard'
import { inspectorCards, type InspectorCardKind, type Selection } from './selection'

type Props = { molecule: Molecule; selection: Selection; atomNames: readonly string[]; level: Prefs['valenceLevel'] }

/** The cards for the current selection and valence display level (spec 6.3, 6.4); inspectorCards says which. */
export function Inspector(props: Props) {
  const { molecule, selection, atomNames, level } = props
  const { elements } = registry
  const diagram = registry.moDiagrams.find((d) => d.moleculeId === molecule.id)

  const card = (kind: InspectorCardKind) => {
    switch (kind) {
      case 'bond': {
        const bond = molecule.bonds[selection.bond!]!
        return (
          <BondCard
            molecule={molecule}
            bond={bond}
            derived={deriveBonds(molecule, elements)[selection.bond!]!}
            length={measure(molecule, [bond.a, bond.b])!}
            atomNames={atomNames}
          />
        )
      }
      case 'nothing-selected':
        return (
          <Card heading="Nothing selected">
            <p>Select an atom or a bond to see its details: click it in the model, or choose it in the Atoms and bonds list.</p>
            <p>{MEASURE_HINT}</p>
          </Card>
        )
      case 'measure':
        return <MeasureCard molecule={molecule} measurement={measure(molecule, selection.atoms)!} atomNames={atomNames} />
      case 'measure-hint':
        return (
          <Card heading="Measure">
            <p>Select another atom to measure. {MEASURE_HINT}</p>
          </Card>
        )
      case 'mo-diagram':
        return <MoCard diagram={diagram!} name={molecule.name} />
    }

    // The rest are about the one selected atom.
    const index = selection.atoms[0]!
    const atom = molecule.atoms[index]!
    const element = elements.find((e) => e.symbol === atom.element)!
    const derived = deriveAtoms(molecule, elements)[index]!
    if (kind === 'bohr') return <BohrCard element={element} />
    if (kind === 'atom') return <AtomCard name={atomNames[index]!} atom={atom} derived={derived} element={element} />
    const lobes = hybridLobes(molecule, index, elements)
    return (
      <Card heading="Hybrid orbitals">
        {lobes ? (
          <>
            <p>{describeHybridLobes(lobes)}</p>
            {lobes.note && <Note>{lobes.note}</Note>}
            <Note>The lobes are drawn in the ball and stick and wireframe views. Each is a simplified shape, not a computed orbital.</Note>
            {diagram && <Note>{VALENCE_BOND_NOTE}</Note>}
          </>
        ) : (
          <p>No lobes are drawn for this atom. Hybridization: {derived.hybridization}.</p>
        )}
      </Card>
    )
  }

  return inspectorCards(selection, level, diagram !== undefined).map((kind) => <Fragment key={kind}>{card(kind)}</Fragment>)
}
