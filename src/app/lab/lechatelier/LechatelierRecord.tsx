import { Fragment } from 'react'
import { Mark } from '@/app/lab/Line'
import { ROLE } from '@/app/lab/roles'
import { Marked } from '@/app/lab/stationPieces'
import { SYSTEM_IDS, type LechatelierData } from '@/chem-data/lechatelier/data'
import { FIELDS, runRecords, systemView, type LechatelierModel, type LechatelierState, type RunOutcome } from '@/engine/lechatelier'
import { ProgressLabel } from './LechatelierBench'
import { ANSWER_TEXT, LAB_TEXT, PAGE_TEXT, RECORD_TEXT, WAY_LABEL, answerLabel, checkedText, disturbanceTitle, observationLines, progressOf, reasonText, systemName, systemNumber } from './messages'

/** How a run came out, in words: a tick on one that counts. */
function Result({ outcome }: { outcome: RunOutcome }) {
  if (outcome.state === 'open') return <span className="text-muted-foreground">{RECORD_TEXT.open}</span>
  if (outcome.state === 'to-check') return <span className="text-muted-foreground">{RECORD_TEXT.toCheck}</span>
  if (outcome.state === 'does-not-count') return <span className={ROLE.failed}>{RECORD_TEXT.doesNotCount}</span>
  return (
    <Marked mark="✓" done>
      {RECORD_TEXT.counts}
    </Marked>
  )
}

const CELL = 'border-b p-2 text-left align-top'

/**
 * The Record tab: for each of the four systems, how far it has come, and every run of it in order, each with how
 * it came out and, for each disturbance at which something was entered, what was predicted, what was recorded of
 * the tube and what was answered, as lines of one cell, so that the table is three columns and fits an upright
 * tablet; where a run does not count, why; and, once the lab is complete, the line that says so. It reads the stored record and judges it as the engine does (systemView, runRecords), so it cannot
 * disagree with the bench: whether an observation or an answer was right is given only once its run is checked. A
 * prediction is listed as it was made and is never marked.
 */
export function LechatelierRecord({ data, m, state }: { data: LechatelierData; m: LechatelierModel; state: LechatelierState }) {
  return (
    <div className="grid gap-4 text-sm">
      {state.status === 'completed' && (
        <p className="max-w-prose font-medium">
          <Marked mark="✓" done>
            {LAB_TEXT.completed}
          </Marked>
        </p>
      )}
      {/* A region that the keyboard can reach and scroll, should the table ever be wider than its window. */}
      <div role="region" aria-label={RECORD_TEXT.region} tabIndex={0} className="overflow-x-auto rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <table className="w-full max-w-4xl min-w-[26rem] border-collapse">
          <caption className="mb-2 text-left font-medium">{RECORD_TEXT.caption}</caption>
          <thead>
            <tr>
              {[RECORD_TEXT.disturbance, RECORD_TEXT.recorded, RECORD_TEXT.result].map((heading) => (
                <th key={heading} scope="col" className={`${CELL} font-medium text-muted-foreground`}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          {SYSTEM_IDS.map((systemId) => (
            <tbody key={systemId}>
              <tr>
                <th scope="rowgroup" colSpan={2} className={`${CELL} font-semibold`}>
                  {systemNumber(systemId)}: {systemName(data, systemId)}
                </th>
                <td className={`${CELL} font-medium`}>
                  <ProgressLabel progress={progressOf(systemView(m, state, systemId))} />
                </td>
              </tr>
              {runRecords(m, state, systemId).map((run, at) => {
                const entered = run.disturbances.filter((d) => d.prediction !== null)
                const reasons = run.outcome.state === 'does-not-count' ? run.outcome.reasons : []
                return (
                  <Fragment key={at}>
                    <tr>
                      <th scope="row" colSpan={2} className={`${CELL} pl-6 font-medium`}>
                        {PAGE_TEXT.run(at + 1)}
                        {entered.length === 0 && <span className="font-normal text-muted-foreground">: {RECORD_TEXT.nothing}</span>}
                      </th>
                      <td className={CELL}>
                        <Result outcome={run.outcome} />
                      </td>
                    </tr>
                    {entered.map((d) => (
                      <tr key={d.id}>
                        <th scope="row" className={`${CELL} pl-10 font-normal`}>
                          {disturbanceTitle(data, d.id)}
                        </th>
                        <td className={CELL}>
                          <ul className="grid gap-0.5">
                            {/* As it was made, and never marked. */}
                            {d.prediction !== null && (
                              <li>
                                {RECORD_TEXT.predicted}: {WAY_LABEL[d.prediction]}
                              </li>
                            )}
                            {d.observation !== null &&
                              observationLines(d.observation).map((line, field) => (
                                <li key={line}>
                                  {d.wrongFields?.includes(FIELDS[field]!) && <Mark ok={false} />}
                                  {line}
                                </li>
                              ))}
                            {d.answer !== null && (
                              <li>
                                {d.answerRight === false && <Mark ok={false} />}
                                {RECORD_TEXT.answered}: {answerLabel(d.answer)}
                              </li>
                            )}
                          </ul>
                        </td>
                        <td className={CELL}>
                          {d.observation !== null && d.wrongFields !== null && (
                            <p>
                              <Mark ok={d.wrongFields.length === 0} />
                              {checkedText(d.wrongFields)}
                            </p>
                          )}
                          {d.answer !== null && d.answerRight !== null && (
                            <p>
                              <Mark ok={d.answerRight} />
                              {RECORD_TEXT.answered}: {d.answerRight ? ANSWER_TEXT.right : ANSWER_TEXT.notRight}
                            </p>
                          )}
                          {/* A run that has not been checked: nothing recorded in it has been judged. */}
                          {d.observation !== null && d.wrongFields === null && <span className="text-muted-foreground">{RECORD_TEXT.toCheck}</span>}
                        </td>
                      </tr>
                    ))}
                    {reasons.length > 0 && (
                      <tr>
                        <td colSpan={3} className={`${CELL} pl-10`}>
                          <ul className="grid max-w-[75ch] gap-0.5 text-muted-foreground">
                            {reasons.map((reason) => (
                              <li key={reasonText(data, reason)}>{reasonText(data, reason)}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  )
}
