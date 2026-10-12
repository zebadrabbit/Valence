import { Fragment } from 'react'
import { ROLE } from '@/app/lab/roles'
import { Marked } from '@/app/lab/stationPieces'
import { PART_IDS, type FreezingData } from '@/chem-data/freezing/data'
import { FIELDS, partView, runOutcomes, type FreezingModel, type FreezingState, type RunOutcome } from '@/engine/freezing'
import { BENCH_TEXT, RECORD_TEXT, enteredText, fieldLabel, partTitle, progressOf, recordReasonText, valueText } from './messages'
import { ProgressLabel } from './PartCard'

/** How a run came out, in words: a tick on one that counts. */
function Result({ outcome }: { outcome: RunOutcome }) {
  if (outcome.state === 'open') return <span className="text-muted-foreground">{RECORD_TEXT.open}</span>
  if (outcome.state === 'does-not-count') return <span className={ROLE.failed}>{RECORD_TEXT.doesNotCount}</span>
  return (
    <Marked mark="✓" done>
      {RECORD_TEXT.counts}
    </Marked>
  )
}

const CELL = 'border-b p-2 text-left align-top'

/**
 * The Record tab: for each of the three parts, how far it has come, and every run of it in order, each with how
 * it came out, what part 3's run dissolved, what was entered in its notebook and, where it does not count, why;
 * and, once the lab is complete, the line that says so. It reads the stored record and judges it as the engine
 * does (partView, runOutcomes), so it cannot disagree with the bench, and it shows nothing of what a result is
 * held to: not the figure, and not how far from it a run came.
 */
export function FreezingRecord({ data, m, state }: { data: FreezingData; m: FreezingModel; state: FreezingState }) {
  return (
    <div className="grid gap-4 text-sm">
      {state.status === 'completed' && (
        <p className="font-medium">
          <Marked mark="✓" done>
            {BENCH_TEXT.complete}
          </Marked>
        </p>
      )}
      {/* A region that the keyboard can reach and scroll, should the table ever be wider than its window. */}
      <div role="region" aria-label={RECORD_TEXT.region} tabIndex={0} className="overflow-x-auto rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <table className="w-full max-w-4xl min-w-[24rem] border-collapse">
          <caption className="mb-2 text-left font-medium">{RECORD_TEXT.caption}</caption>
          <thead>
            <tr>
              {[RECORD_TEXT.part, RECORD_TEXT.result].map((heading) => (
                <th key={heading} scope="col" className={`${CELL} font-medium text-muted-foreground`}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          {PART_IDS.map((part) => {
            const outcomes = runOutcomes(m, state, part)
            return (
              <tbody key={part}>
                <tr>
                  <th scope="rowgroup" className={`${CELL} font-semibold`}>
                    {partTitle(data, part)}
                  </th>
                  <td className={`${CELL} font-medium`}>
                    <ProgressLabel progress={progressOf(partView(m, state, part))} />
                  </td>
                </tr>
                {state.parts[part].map((run, at) => {
                  const outcome = outcomes[at]!
                  const entered = FIELDS[part].filter((field) => run.entries[field] !== null)
                  const reasons = outcome.state === 'does-not-count' ? outcome.reasons : []
                  return (
                    <Fragment key={run.index}>
                      <tr>
                        <th scope="row" className={`${CELL} pl-6 font-medium`}>
                          {RECORD_TEXT.run(run.index + 1)}
                        </th>
                        <td className={CELL}>
                          <Result outcome={outcome} />
                        </td>
                      </tr>
                      {(run.solute !== null || entered.length > 0 || reasons.length > 0) && (
                        <tr>
                          <td colSpan={2} className={`${CELL} pl-6`}>
                            <ul className="grid max-w-[75ch] gap-0.5">
                              {run.solute !== null && (
                                <li>
                                  {RECORD_TEXT.solute}: <span className={ROLE.value}>{valueText(data, run.solute)}</span>
                                </li>
                              )}
                              {entered.map((field) => (
                                <li key={field}>
                                  {fieldLabel(part, field)}: <span className={`whitespace-nowrap tabular-nums ${ROLE.value}`}>{enteredText(data, field, run.entries[field]!)}</span>
                                </li>
                              ))}
                              {reasons.map((reason) => (
                                <li key={reason} className="text-muted-foreground">
                                  {recordReasonText(part, reason)}
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            )
          })}
        </table>
      </div>
    </div>
  )
}
