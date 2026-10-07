import { useId, type ReactNode } from 'react'
import { Hazards } from '@/app/lab/Hazards'
import { ROLE } from '@/app/lab/roles'
import type { Source } from '@/chem-data/schema'
import type { TitrationData } from '@/chem-data/titration/data'
import { Bottle, Dropper, Pipette, WashBottle } from './apparatus'
import { STEP_BUTTON, stepsDone, type StepControl } from './benchText'
import type { BenchAction, BenchView } from './benchView'
import { Control } from './StopcockControls'

export interface ShelfProps {
  view: BenchView
  bottles: TitrationData['bottles']
  sources: readonly Source[]
  act(action: BenchAction): void
}

/** One piece of apparatus: its drawing, then a group named by its heading that says its state in text and holds its controls. */
function Tile({ heading, drawing, children }: { heading: ReactNode; drawing: ReactNode; children: ReactNode }) {
  const headingId = useId()
  return (
    <div role="group" aria-labelledby={headingId} className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-2 rounded-md border p-2 text-sm">
      <div className="h-20">{drawing}</div>
      <div className="grid content-start justify-items-start gap-1.5">
        <h3 id={headingId} className="font-medium">
          {heading}
        </h3>
        {children}
      </div>
    </div>
  )
}

/** A figure or a name the learner reads off the shelf and uses. */
const Value = ({ children }: { children: ReactNode }) => <span className={ROLE.value}>{children}</span>

const BUTTON = 'h-auto min-h-8 py-1 text-left whitespace-normal'

/**
 * The reagents and glassware: five tiles, each with the actions that apparatus is used for. Every button calls
 * `act` whether or not the engine can use it now, so that the bench can say why not.
 */
export function Shelf({ view, bottles, sources, act }: ShelfProps) {
  const { controls, flask } = view
  const done = stepsDone(view)
  const button = (type: Exclude<BenchAction['type'], 'deliver'>, name: string) => (
    <Control unavailable={controls[type] !== null} onClick={() => act({ type })} className={BUTTON}>
      {name}
    </Control>
  )
  /**
   * A step as one button. Until it is done the button is named for what a press does. From then it is named for
   * what is so, with a tick in front: the tick is decoration, the words say it is done and are the button's name.
   * It is unavailable then, focusable, and a press is told why; it is not drawn faint, so that the words read as a
   * state, and it is filled in and has no outline, as a thing settled. The fill is the one that can be done again:
   * its button says that the burette is filled and still refills it, keeps the outline of a button that does
   * something, and only the word for the press is faint while the engine cannot use it.
   */
  const step = (type: StepControl) => {
    const { todo, done: so, again } = STEP_BUTTON[type]
    if (!done[type]) return button(type, todo)
    const blocked = controls[type] !== null
    return (
      <Control unavailable={blocked || again === null} dimmed={false} variant={again === null ? 'secondary' : 'outline'} onClick={() => act({ type })} className={BUTTON}>
        <span>
          <span aria-hidden="true" className={ROLE.done}>
            ✓{' '}
          </span>
          {so}
          {again !== null && <span className={blocked ? 'opacity-50' : undefined}> {again}</span>}
        </span>
      </Control>
    )
  }
  return (
    <div role="group" aria-label="Reagents and glassware" className="bench-shelf">
      <Tile heading="Hydrochloric acid" drawing={<Bottle lines={['HCl', `${view.hclLabel} M`]} />}>
        <p>
          Label: <Value>HCl, {view.hclLabel} M. Standardized.</Value>
        </p>
        <Hazards classifiedAs={bottles.hcl.classifiedAs} hazards={bottles.hcl.hazards} sources={sources} />
      </Tile>
      <Tile heading="Sodium hydroxide" drawing={<Bottle lines={['NaOH']} />}>
        {step('conditionBurette')}
        {step('fillBurette')}
        <Hazards classifiedAs={bottles.naoh.classifiedAs} hazards={bottles.naoh.hazards} sources={sources} />
      </Tile>
      <Tile
        heading={
          <>
            Pipette, <Value>25.00 mL</Value>, with filler
          </>
        }
        drawing={<Pipette />}
      >
        {step('rinsePipette')}
        {step('pipetteAliquot')}
      </Tile>
      <Tile heading="Phenolphthalein indicator" drawing={<Dropper />}>
        <p>
          Drops in the flask: <Value>{flask.indicatorDrops}</Value>
        </p>
        {button('addIndicatorDrop', 'Add 1 drop of indicator')}
        <Hazards classifiedAs={bottles.indicator.classifiedAs} hazards={bottles.indicator.hazards} sources={sources} />
      </Tile>
      <Tile heading="Distilled water" drawing={<WashBottle />}>
        <p>
          Rinses of this flask: <Value>{flask.waterPortions}</Value>
        </p>
        {button('addWater', 'Rinse down flask')}
      </Tile>
    </div>
  )
}
