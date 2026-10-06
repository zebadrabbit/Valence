import { useId, type ReactNode } from 'react'
import { Hazards } from '@/app/lab/Hazards'
import type { Source } from '@/chem-data/schema'
import type { TitrationData } from '@/chem-data/titration/data'
import { Bottle, Dropper, Pipette, WashBottle } from './apparatus'
import type { BenchAction, BenchView } from './benchView'
import { Control } from './StopcockControls'

export interface ShelfProps {
  view: BenchView
  bottles: TitrationData['bottles']
  sources: readonly Source[]
  act(action: BenchAction): void
}

/** One piece of apparatus: its drawing, then a group named by its heading that says its state in text and holds its controls. */
function Tile({ heading, drawing, children }: { heading: string; drawing: ReactNode; children: ReactNode }) {
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

/** A step that has been done: a tick and words, never colour. It says what the learner did, not whether it was needed. */
function Done({ children }: { children: string }) {
  return (
    <p>
      <span aria-hidden="true">✓ </span>
      {children}
    </p>
  )
}

/**
 * The reagents and glassware: five tiles, each with the actions that apparatus is used for. Every button calls
 * `act` whether or not the engine can use it now, so that the bench can say why not.
 */
export function Shelf({ view, bottles, sources, act }: ShelfProps) {
  const { controls, burette, flask } = view
  const button = (type: Exclude<BenchAction['type'], 'deliver'>, name: string) => (
    <Control unavailable={controls[type] !== null} onClick={() => act({ type })} className="h-auto min-h-8 py-1 text-left whitespace-normal">
      {name}
    </Control>
  )
  return (
    <div role="group" aria-label="Reagents and glassware" className="bench-shelf">
      <Tile heading="Hydrochloric acid" drawing={<Bottle lines={['HCl', `${view.hclLabel} M`]} />}>
        <p>Label: HCl, {view.hclLabel} M. Standardized.</p>
        <Hazards classifiedAs={bottles.hcl.classifiedAs} hazards={bottles.hcl.hazards} sources={sources} />
      </Tile>
      <Tile heading="Sodium hydroxide" drawing={<Bottle lines={['NaOH']} />}>
        {burette.conditioned && <Done>Burette conditioned.</Done>}
        {burette.filled && <Done>Burette filled.</Done>}
        {button('conditionBurette', 'Condition burette')}
        {button('fillBurette', burette.filled ? 'Refill burette' : 'Fill burette')}
        <Hazards classifiedAs={bottles.naoh.classifiedAs} hazards={bottles.naoh.hazards} sources={sources} />
      </Tile>
      <Tile heading="Pipette, 25.00 mL, with filler" drawing={<Pipette />}>
        {/* Not "rinsed": a pipette that drew its acid unrinsed is wet with acid too, and the engine holds the two alike. */}
        {view.pipetteRinsed && <Done>Pipette wet with HCl.</Done>}
        {flask.hasAliquot && <Done>HCl is in the flask.</Done>}
        {button('rinsePipette', 'Rinse pipette with HCl')}
        {button('pipetteAliquot', 'Pipette HCl into flask')}
      </Tile>
      <Tile heading="Phenolphthalein indicator" drawing={<Dropper />}>
        <p>Drops in the flask: {flask.indicatorDrops}</p>
        {button('addIndicatorDrop', 'Add 1 drop of indicator')}
        <Hazards classifiedAs={bottles.indicator.classifiedAs} hazards={bottles.indicator.hazards} sources={sources} />
      </Tile>
      <Tile heading="Distilled water" drawing={<WashBottle />}>
        <p>Rinses of this flask: {flask.waterPortions}</p>
        {button('addWater', 'Rinse down flask')}
      </Tile>
    </div>
  )
}
