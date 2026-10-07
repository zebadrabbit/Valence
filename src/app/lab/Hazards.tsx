import { Disclosure, Sources } from '@/app/explore/InspectorCard'
import { citations } from '@/chem-data/citations'
import type { Hazards as HazardsRecord, Source } from '@/chem-data/schema'
import { HAZARDS_TEXT, UNSOURCED_TEXT } from './shellText'

/**
 * The hazards of a bottle, for its tile on a bench. `classifiedAs` is the heading over the signal word and the
 * statements: it says whose hazards they are and at what strength or in what form, and differs from bottle to
 * bottle. The signal word is under it, so that it is not read as the word for the solution on the bench, whose
 * own sheet can give another (the note says which). A statement is a line of a data sheet and can begin with two
 * or three codes, so each is drawn whole, as stored and in the stored order. A sheet that lists no statement has
 * a sentence saying so in place of the signal word and the list. `solid` is for a reagent that is not a solution:
 * its note is of the reagent as it is used, and no strength is spoken of.
 */
export function Hazards({ classifiedAs, hazards, sources, solid = false }: { classifiedAs: string; hazards: HazardsRecord; sources: readonly Source[]; solid?: boolean }) {
  const { note } = hazards
  const noteHeading = solid ? HAZARDS_TEXT.asUsed : HAZARDS_TEXT.strength
  return (
    <Disclosure summary="Hazards">
      <h4 className="font-medium">{classifiedAs}</h4>
      {hazards.statements.length === 0 ? (
        <p>{HAZARDS_TEXT.none}</p>
      ) : (
        <>
          <p className="font-medium">Signal word: {hazards.signalWord}</p>
          <ul className="grid list-disc gap-1 pl-5">
            {hazards.statements.map((statement) => (
              <li key={statement}>{statement}</li>
            ))}
          </ul>
        </>
      )}
      <h4 className="font-medium">{noteHeading}</h4>
      <p>{note.value}</p>
      <Sources
        citations={citations(
          [['Signal word and hazard statements', hazards.sourceId], [noteHeading, note.sourceId], ...(note.alsoSourceId === undefined ? [] : [[noteHeading, note.alsoSourceId] as const])],
          sources,
        )}
        derived={solid ? UNSOURCED_TEXT.hazardsSolid : UNSOURCED_TEXT.hazards}
      />
    </Disclosure>
  )
}
