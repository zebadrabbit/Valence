import { Formula } from '@/app/lab/EquationBuilder'
import { Mark } from '@/app/lab/Line'
import { ROLE } from '@/app/lab/roles'
import { Marked } from '@/app/lab/stationPieces'
import { STATION_IDS, stationOf, type ReactionsData } from '@/chem-data/reactions/data'
import { runRecords, stationView, type ReactionsModel, type ReactionsState, type RunRecord } from '@/engine/reactions'
import { KIND_LABEL, LAB_TEXT, RECORD_TEXT, observationLines, orderText, outcomeText, progressOf, reasonText, stationName, vesselName } from './messages'
import { ProgressLabel } from './StationCard'

/** A formula-bearing line of a built equation, drawn with its subscripts. */
function Equation({ tiles, built }: { tiles: readonly { speciesId: string; formula: string }[]; built: NonNullable<RunRecord['vessels'][number]['equation']>['built'] }) {
  const side = (terms: typeof built.reactants) =>
    terms.map((term, i) => (
      <span key={term.speciesId} className="whitespace-nowrap">
        {i > 0 && ' + '}
        {term.coefficient === 1 ? '' : term.coefficient}
        <Formula text={tiles.find((tile) => tile.speciesId === term.speciesId)?.formula ?? term.speciesId} />({term.state})
      </span>
    ))
  return (
    <span className={ROLE.value}>
      {side(built.reactants)} → {side(built.products)}
    </span>
  )
}

/**
 * The Record tab: for each of the five stations, how far it has come, and every run of it in order, each with how
 * it came out and, for each vessel at which something was recorded, what was recorded of it, the kind that was
 * said and the equation that was built; the order of the metals where it was given; where a run does not count,
 * why; and, once the lab is complete, the line that says so. It reads the stored record and judges it as the
 * engine does (stationView, runRecords), so it cannot disagree with the bench: whether an entry was right is given
 * only once its run has been checked, and never what would have been.
 */
export function ReactionsRecord({ data, m, state }: { data: ReactionsData; m: ReactionsModel; state: ReactionsState }) {
  return (
    <div className="grid max-w-4xl gap-4 text-sm">
      <h2 className="text-lg font-semibold">{RECORD_TEXT.heading}</h2>
      {state.status === 'completed' && (
        <p className="max-w-prose font-medium">
          <Marked mark="✓" done>
            {LAB_TEXT.completed}
          </Marked>
        </p>
      )}
      {STATION_IDS.map((stationId) => {
        const station = stationOf(data, stationId)
        const view = stationView(m, state, stationId)
        const runs = runRecords(m, state, stationId)
        return (
          <section key={stationId} className="grid gap-2 rounded-lg border bg-card p-3">
            <h3 className="flex flex-wrap items-baseline justify-between gap-x-4 text-base font-semibold">
              {stationName(data, stationId)}
              <span className="text-sm font-medium">
                <ProgressLabel progress={progressOf(view)} />
              </span>
            </h3>
            {runs.map((run, at) => {
              const entered = run.vessels.filter((vessel) => vessel.observation !== null)
              const checked = run.outcome.state === 'counts' || run.outcome.state === 'does-not-count'
              return (
                <div key={at} className="grid gap-1 border-t pt-2">
                  <h4 className="font-medium">
                    {RECORD_TEXT.run(at)}
                    {': '}
                    <span className="font-normal">
                      {entered.length === 0 ? (
                        <span className="text-muted-foreground">{RECORD_TEXT.nothingRecorded}</span>
                      ) : (
                        <>
                          {checked && <Mark ok={run.outcome.state === 'counts'} />}
                          {checked ? outcomeText(run.outcome) : RECORD_TEXT.notChecked}
                        </>
                      )}
                    </span>
                  </h4>
                  {entered.map((vessel) => {
                    const drawn = station.vessels.find((v) => v.id === vessel.id)!.drawn
                    const fields = view.vessels.find((v) => v.id === vessel.id)!.fields.map(({ field }) => field)
                    return (
                      <ul key={vessel.id} className="grid gap-0.5 pl-4">
                        {station.vessels.length > 1 && <li className="font-medium">{vesselName(data, stationId, vessel.id)}</li>}
                        {observationLines(drawn, fields, vessel.observation!).map((line, field) => (
                          <li key={line}>
                            {vessel.wrongFields?.includes(fields[field]!) && <Mark ok={false} />}
                            {line}
                          </li>
                        ))}
                        {vessel.kind !== null && (
                          <li>
                            {vessel.kindRight === false && <Mark ok={false} />}
                            {RECORD_TEXT.kind}: {KIND_LABEL[vessel.kind]}
                          </li>
                        )}
                        {vessel.equation !== null && (
                          <li>
                            {vessel.equation.judged && vessel.equation.problem !== null && <Mark ok={false} />}
                            {RECORD_TEXT.equation}: <Equation tiles={view.tiles} built={vessel.equation.built} />
                          </li>
                        )}
                      </ul>
                    )
                  })}
                  {run.order !== null && run.order.said !== null && (
                    <p className="pl-4">
                      {run.order.right === false && <Mark ok={false} />}
                      {RECORD_TEXT.order}: {orderText(run.order.said)}
                    </p>
                  )}
                  {run.outcome.state === 'does-not-count' && run.outcome.reasons.length > 0 && (
                    <ul className="grid max-w-[75ch] list-disc gap-0.5 pl-9 text-muted-foreground">
                      {run.outcome.reasons.map((reason) => (
                        <li key={reasonText(data, stationId, reason)}>{reasonText(data, stationId, reason)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}
