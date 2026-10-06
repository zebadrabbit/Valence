import { Disclosure, Sources } from '@/app/explore/InspectorCard'
import { citations } from '@/chem-data/citations'
import type { Hazards as HazardsRecord, Source } from '@/chem-data/schema'
import { UNSOURCED_TEXT } from './shellText'

const STRENGTH = 'At the strength used here'

/**
 * The hazards of a bottle, for its tile on a bench. `classifiedAs` is the heading over the statements: it says
 * whose hazards they are and at what strength or in what form, and differs from bottle to bottle. A statement is
 * a line of a data sheet and can begin with two or three codes, so each is drawn whole, as stored and in the
 * stored order.
 */
export function Hazards({ classifiedAs, hazards, sources }: { classifiedAs: string; hazards: HazardsRecord; sources: readonly Source[] }) {
  const { note } = hazards
  return (
    <Disclosure summary="Hazards">
      <p className="font-medium">Signal word: {hazards.signalWord}</p>
      <h4 className="font-medium">{classifiedAs}</h4>
      <ul className="grid list-disc gap-1 pl-5">
        {hazards.statements.map((statement) => (
          <li key={statement}>{statement}</li>
        ))}
      </ul>
      <h4 className="font-medium">{STRENGTH}</h4>
      <p>{note.value}</p>
      <Sources
        citations={citations(
          [['Signal word and hazard statements', hazards.sourceId], [STRENGTH, note.sourceId], ...(note.alsoSourceId === undefined ? [] : [[STRENGTH, note.alsoSourceId] as const])],
          sources,
        )}
        derived={UNSOURCED_TEXT.hazards}
      />
    </Disclosure>
  )
}
