import { useId, useReducer, useState } from 'react'
import { Check, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { atomNames, bondNames, describeMolecule } from '@/chem-data/describe'
import { registry } from '@/chem-data/registry'
import type { Molecule } from '@/chem-data/schema'
import { FOCUS_RING } from './focusRing'
import { EMPTY_SELECTION, selectionReducer, selectionStatus } from './selection'

/** The viewer in the centre with the atom and bond list and the inspector docked to its right (spec 11). */
export function MoleculeWorkspace({ molecule }: { molecule: Molecule }) {
  const [selection, dispatch] = useReducer(selectionReducer, EMPTY_SELECTION)
  const [showList, setShowList] = useState(true)
  const [showInspector, setShowInspector] = useState(true)
  const listId = useId()
  const inspectorId = useId()
  const descriptionId = useId()

  const atoms = atomNames(molecule, registry.elements)
  const bonds = bondNames(molecule, registry.elements)
  const description = describeMolecule(molecule, registry.elements)
  const nothingSelected = selection.atoms.length === 0 && selection.bond === null

  return (
    <>
      <div role="group" aria-label="Panels" className="mb-2 flex flex-wrap gap-2">
        <PanelToggle label="Atoms and bonds" controls={listId} shown={showList} onChange={setShowList} />
        <PanelToggle label="Inspector" controls={inspectorId} shown={showInspector} onChange={setShowInspector} />
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          {/* Placeholder: the next stage puts the 3D canvas here, with the same name and description. */}
          <div
            role="img"
            aria-label={`3D model of ${molecule.name}`}
            aria-describedby={descriptionId}
            className="flex h-72 items-center justify-center rounded-lg border bg-card p-4 lg:h-[420px]"
          >
            <p className="max-w-prose text-center text-sm text-muted-foreground">
              The 3D model is not built yet. The atom and bond list and the text description work now.
            </p>
          </div>
          {/* The viewer's description for assistive technology. A browser does not read it out of a closed
              <details>, so it has its own hidden copy, which is exposed only through aria-describedby. */}
          <p id={descriptionId} hidden>
            {description}
          </p>
          <details className="mt-2 max-w-prose text-sm">
            <summary className="w-fit cursor-pointer rounded-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Text description
            </summary>
            <p className="mt-1 text-muted-foreground">{description}</p>
          </details>
        </div>

        <section id={listId} hidden={!showList} aria-label="Atoms and bonds" className="shrink-0 rounded-lg border bg-card p-3 lg:w-64">
          <p role="status" className="mb-2 text-sm">
            {selectionStatus(selection, atoms, bonds)}
          </p>
          <Button variant="outline" size="sm" className={`mb-3 ${FOCUS_RING}`} disabled={nothingSelected} onClick={() => dispatch({ type: 'clear' })}>
            Clear selection
          </Button>
          <div className="grid gap-3 lg:max-h-[19rem] lg:overflow-y-auto">
            <ToggleList
              heading="Atoms"
              names={atoms}
              pressed={(i) => selection.atoms.includes(i)}
              onToggle={(index) => dispatch({ type: 'toggleAtom', index })}
            />
            <ToggleList
              heading="Bonds"
              names={bonds}
              pressed={(i) => selection.bond === i}
              onToggle={(index) => dispatch({ type: 'toggleBond', index })}
            />
          </div>
        </section>

        <aside id={inspectorId} hidden={!showInspector} aria-label="Inspector" className="grid shrink-0 gap-3 lg:w-64">
          <PlaceholderCard heading="Atom or bond">
            Select an atom or a bond to see its details here. The detail cards are not built yet.
          </PlaceholderCard>
          <PlaceholderCard heading="Measure">
            Select three atoms for a bond angle, or four for a dihedral. The measure tool is not built yet.
          </PlaceholderCard>
        </aside>
      </div>
    </>
  )
}

function PanelToggle(props: { label: string; controls: string; shown: boolean; onChange(shown: boolean): void }) {
  return (
    <Button variant="outline" size="sm" className={FOCUS_RING} aria-expanded={props.shown} aria-controls={props.controls} onClick={() => props.onChange(!props.shown)}>
      {props.shown ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
      {props.label}
    </Button>
  )
}

function ToggleList(props: { heading: string; names: readonly string[]; pressed(index: number): boolean; onToggle(index: number): void }) {
  return (
    <div>
      <h2 className="mb-1 text-sm font-medium">{props.heading}</h2>
      {/* p-1 leaves room for the focus ring inside the scrolling box. */}
      <ul className="grid gap-1 p-1">
        {props.names.map((name, i) => {
          const pressed = props.pressed(i)
          return (
            <li key={i}>
              <Button
                variant={pressed ? 'default' : 'ghost'}
                className={`h-auto min-h-8 w-full justify-start py-1 text-left whitespace-normal ${FOCUS_RING}`}
                aria-pressed={pressed}
                onClick={() => props.onToggle(i)}
              >
                {/* The tick, not the colour alone, marks a selected item. */}
                <Check aria-hidden="true" className={pressed ? '' : 'invisible'} />
                {name}
              </Button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function PlaceholderCard({ heading, children }: { heading: string; children: string }) {
  return (
    <section className="rounded-lg border bg-card p-3">
      <h2 className="mb-1 text-sm font-medium">{heading}</h2>
      <p className="text-sm text-muted-foreground">{children}</p>
    </section>
  )
}
