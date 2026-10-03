import { deriveAtoms, deriveBonds } from '@/chem-data/derive'
import { measure } from '@/chem-data/measure'
import { registry } from '@/chem-data/registry'
import type { Molecule } from '@/chem-data/schema'
import { AtomCard } from './AtomCard'
import { BondCard } from './BondCard'
import { Card } from './InspectorCard'
import { MEASURE_HINT, MeasureCard } from './MeasureCard'
import type { Selection } from './selection'

/** The cards for the current selection (spec 6.3): a bond, one atom, or a measurement of two to four atoms. */
export function Inspector({ molecule, selection, atomNames }: { molecule: Molecule; selection: Selection; atomNames: readonly string[] }) {
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
        <p>Select an atom or a bond to see its details: click it in the 3D model, or choose it in the Atoms and bonds list.</p>
        <p>{MEASURE_HINT}</p>
      </Card>
    )
  }

  const measurement = measure(molecule, selection.atoms)
  if (measurement) return <MeasureCard molecule={molecule} measurement={measurement} atomNames={atomNames} />

  const atom = molecule.atoms[first]!
  return (
    <>
      <AtomCard
        name={atomNames[first]!}
        atom={atom}
        derived={deriveAtoms(molecule, elements)[first]!}
        element={elements.find((e) => e.symbol === atom.element)!}
      />
      <Card heading="Measure">
        <p>Select another atom to measure. {MEASURE_HINT}</p>
      </Card>
    </>
  )
}
