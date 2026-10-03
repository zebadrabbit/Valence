import { useId, useReducer, useState } from 'react'
import { Check, Eye, EyeOff } from 'lucide-react'
import { useAppState } from '@/app/AppState'
import { VALENCE_LEVELS, type Prefs } from '@/app/preferences'
import { Button } from '@/components/ui/button'
import { atomNames, bondNames, describeLonePairs, describeMolecule } from '@/chem-data/describe'
import { measure } from '@/chem-data/measure'
import { registry } from '@/chem-data/registry'
import type { Molecule } from '@/chem-data/schema'
import { measurementText } from './format'
import { Inspector } from './Inspector'
import { EMPTY_SELECTION, selectionReducer, selectionStatus } from './selection'
import { ViewerPanel } from './ViewerPanel'

/** The viewer in the centre with the atom and bond list and the inspector docked to its right (spec 11). */
export function MoleculeWorkspace({ molecule }: { molecule: Molecule }) {
  const [selection, dispatch] = useReducer(selectionReducer, EMPTY_SELECTION)
  const [showList, setShowList] = useState(true)
  const [showInspector, setShowInspector] = useState(true)
  const listId = useId()
  const inspectorId = useId()
  const descriptionId = useId()
  const levelId = useId()
  const levelHintId = useId()
  const { prefs, updatePrefs } = useAppState()
  const level = prefs.valenceLevel
  const hasMoDiagram = registry.moDiagrams.some((d) => d.moleculeId === molecule.id)

  const atoms = atomNames(molecule, registry.elements)
  const bonds = bondNames(molecule, registry.elements)
  const description = `${describeMolecule(molecule, registry.elements)} ${describeLonePairs(molecule, registry.elements)}`
  const measurement = measure(molecule, selection.atoms)
  const nothingSelected = selection.atoms.length === 0 && selection.bond === null

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div role="group" aria-label="Panels" className="flex flex-wrap gap-2">
          <PanelToggle label="Atoms and bonds" controls={listId} shown={showList} onChange={setShowList} />
          <PanelToggle label="Inspector" controls={inspectorId} shown={showInspector} onChange={setShowInspector} />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label htmlFor={levelId}>Valence display level</label>
          {/* The same preference as on the Settings page. */}
          <select
            id={levelId}
            className="h-8 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-describedby={levelHintId}
            value={level}
            onChange={(e) => updatePrefs({ valenceLevel: Number(e.target.value) as Prefs['valenceLevel'] })}
          >
            {VALENCE_LEVELS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p id={levelHintId} className="mb-2 max-w-prose text-sm text-muted-foreground">
        {LEVEL_HINT[level]}
        {level === 3 && hasMoDiagram && ' The molecular orbital diagram of this molecule is in the inspector.'}
      </p>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <ViewerPanel molecule={molecule} selection={selection} dispatch={dispatch} describedBy={descriptionId} />
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
            {/* The measurement is announced with the selection that produced it. */}
            {measurement && ` ${measurementText(measurement, atoms)}`}
          </p>
          {/* Stays focusable when disabled: pressing it disables it, and keyboard focus must not drop to the page. */}
          <Button
            variant="outline"
            size="sm"
            className="mb-3 aria-disabled:pointer-events-none aria-disabled:opacity-50"
            disabled={nothingSelected}
            focusableWhenDisabled
            onClick={() => dispatch({ type: 'clear' })}
          >
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

        <aside id={inspectorId} hidden={!showInspector} aria-label="Inspector" className="grid min-w-0 shrink-0 gap-3 lg:w-72">
          <Inspector molecule={molecule} selection={selection} atomNames={atoms} level={level} />
        </aside>
      </div>
    </>
  )
}

/** What each valence display level adds to the page. */
const LEVEL_HINT: Record<Prefs['valenceLevel'], string> = {
  1: 'Select one atom to see its Bohr model in the inspector. Lone pairs are drawn only in the 2D Lewis view.',
  2: 'Lone pairs are drawn as pairs of small dots.',
  3: 'Lone pairs are drawn as pairs of small dots. Select an atom to see its hybrid orbital lobes in the ball and stick and wireframe views.',
}

function PanelToggle(props: { label: string; controls: string; shown: boolean; onChange(shown: boolean): void }) {
  return (
    <Button variant="outline" size="sm" aria-expanded={props.shown} aria-controls={props.controls} onClick={() => props.onChange(!props.shown)}>
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
                className="h-auto min-h-8 w-full justify-start py-1 text-left whitespace-normal"
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
