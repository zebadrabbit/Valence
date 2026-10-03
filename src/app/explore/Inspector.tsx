import type { ReactNode } from 'react'
import type { Prefs } from '@/app/preferences'
import { deriveAtoms, deriveBonds } from '@/chem-data/derive'
import { describeHybridLobes, hybridLobes } from '@/chem-data/hybrid'
import { measure } from '@/chem-data/measure'
import { registry } from '@/chem-data/registry'
import type { Molecule } from '@/chem-data/schema'
import { AtomCard } from './AtomCard'
import { BohrCard } from './BohrCard'
import { BondCard } from './BondCard'
import { Card, Note } from './InspectorCard'
import { MEASURE_HINT, MeasureCard } from './MeasureCard'
import { MoCard } from './MoCard'
import type { Selection } from './selection'

type Props = { molecule: Molecule; selection: Selection; atomNames: readonly string[]; level: Prefs['valenceLevel'] }

/**
 * The cards for the current selection (spec 6.3): a bond, one atom, or a measurement of two to four atoms.
 * The valence display level (spec 6.4) adds the Bohr model of one selected atom at level 1 and, at level 3,
 * what its hybrid orbital lobes show and the molecular orbital diagram of a molecule that has one.
 */
export function Inspector(props: Props) {
  const diagram = props.level === 3 ? registry.moDiagrams.find((d) => d.moleculeId === props.molecule.id) : undefined
  return (
    <>
      {selectionCards(props)}
      {diagram && <MoCard diagram={diagram} name={props.molecule.name} />}
    </>
  )
}

function selectionCards({ molecule, selection, atomNames, level }: Props): ReactNode {
  const { elements } = registry

  if (selection.bond !== null) {
    const bond = molecule.bonds[selection.bond]!
    return (
      <BondCard
        molecule={molecule}
        bond={bond}
        derived={deriveBonds(molecule, elements)[selection.bond]!}
        length={measure(molecule, [bond.a, bond.b])!}
        atomNames={atomNames}
      />
    )
  }

  const [first] = selection.atoms
  if (first === undefined) {
    return (
      <Card heading="Nothing selected">
        <p>Select an atom or a bond to see its details: click it in the model, or choose it in the Atoms and bonds list.</p>
        <p>{MEASURE_HINT}</p>
      </Card>
    )
  }

  const measurement = measure(molecule, selection.atoms)
  if (measurement) return <MeasureCard molecule={molecule} measurement={measurement} atomNames={atomNames} />

  const atom = molecule.atoms[first]!
  const element = elements.find((e) => e.symbol === atom.element)!
  const derived = deriveAtoms(molecule, elements)[first]!
  const lobes = level === 3 ? hybridLobes(molecule, first, elements) : null
  return (
    <>
      {level === 1 && <BohrCard element={element} />}
      <AtomCard name={atomNames[first]!} atom={atom} derived={derived} element={element} />
      {level === 3 && (
        <Card heading="Hybrid orbitals">
          {lobes ? (
            <>
              <p>{describeHybridLobes(lobes)}</p>
              {lobes.note && <Note>{lobes.note}</Note>}
              <Note>The lobes are drawn in the ball and stick and wireframe views. Each is a simplified shape, not a computed orbital.</Note>
            </>
          ) : (
            <p>No lobes are drawn for this atom. Hybridization: {derived.hybridization}.</p>
          )}
        </Card>
      )}
      <Card heading="Measure">
        <p>Select another atom to measure. {MEASURE_HINT}</p>
      </Card>
    </>
  )
}
