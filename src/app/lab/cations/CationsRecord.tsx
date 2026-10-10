import { Fragment } from 'react'
import { Mark } from '@/app/lab/Line'
import { ROLE } from '@/app/lab/roles'
import { Marked } from '@/app/lab/stationPieces'
import { PART_IDS, type CationsData } from '@/chem-data/cations/data'
import { partView, runRecords, type CationsModel, type CationsState, type RunOutcome } from '@/engine/cations'
import { ProgressLabel } from './CationsBench'
import { LAB_TEXT, PAGE_TEXT, RECORD_TEXT, checkedText, holdsText, namedText, observationLines, partTitle, progressOf, reasonText, stepTitle } from './messages'

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
 * The Record tab: for each of the two parts, how far it has come, and every run of it in order, each with how it
 * came out, what was recorded at each step and whether that was what the tube showed, the flow chart in part 1
 * and the ions named in part 2, and, where a run does not count, why; and, once the lab is complete, the line that
 * says so. It reads the stored record and judges it as the engine does (partView, runRecords), so it cannot
 * disagree with the bench: whether an observation was right is given only once its step is checked, and what an
 * unknown held only once its ions are named.
 */
export function CationsRecord({ data, m, state }: { data: CationsData; m: CationsModel; state: CationsState }) {
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
              {[RECORD_TEXT.part, RECORD_TEXT.recorded, RECORD_TEXT.result].map((heading) => (
                <th key={heading} scope="col" className={`${CELL} font-medium text-muted-foreground`}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          {PART_IDS.map((part) => (
            <tbody key={part}>
              <tr>
                <th scope="rowgroup" colSpan={2} className={`${CELL} font-semibold`}>
                  {partTitle(part)}
                </th>
                <td className={`${CELL} font-medium`}>
                  <ProgressLabel progress={progressOf(partView(m, state, part))} />
                </td>
              </tr>
              {runRecords(m, state, part).map((run, at) => {
                const recorded = run.steps.filter((step) => step.observation !== null)
                const reasons = run.outcome.state === 'does-not-count' ? run.outcome.reasons : []
                return (
                  <Fragment key={at}>
                    <tr>
                      <th scope="row" colSpan={2} className={`${CELL} pl-6 font-medium`}>
                        {PAGE_TEXT.run(at + 1)}
                        {recorded.length === 0 && <span className="font-normal text-muted-foreground">: {RECORD_TEXT.nothing}</span>}
                      </th>
                      <td className={CELL}>
                        <Result outcome={run.outcome} />
                      </td>
                    </tr>
                    {recorded.map((step) => (
                      <tr key={step.id}>
                        <th scope="row" className={`${CELL} pl-10 font-normal`}>
                          {stepTitle(data, step.id)}
                        </th>
                        <td className={CELL}>
                          <ul className="grid gap-0.5">
                            {observationLines(step.observation!).map((line) => (
                              <li key={line}>{line}</li>
                            ))}
                          </ul>
                        </td>
                        <td className={CELL}>
                          {step.wrongFields === null ? (
                            <span className="text-muted-foreground">{PAGE_TEXT.notChecked}</span>
                          ) : (
                            <>
                              <Mark ok={step.wrongFields.length === 0} />
                              {checkedText(step.wrongFields)}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                    {run.chartRight !== null && (
                      <tr>
                        <th scope="row" className={`${CELL} pl-10 font-normal`}>
                          {RECORD_TEXT.chart}
                        </th>
                        <td colSpan={2} className={CELL}>
                          <Mark ok={run.chartRight} />
                          {run.chartRight ? RECORD_TEXT.chartRight : RECORD_TEXT.chartWrong}
                        </td>
                      </tr>
                    )}
                    {run.named !== null && (
                      <tr>
                        <th scope="row" className={`${CELL} pl-10 font-normal`}>
                          {RECORD_TEXT.named}
                        </th>
                        <td colSpan={2} className={CELL}>
                          {namedText(data, run.named)}
                          {/* What the sample held, which the engine hands over once the ions are named and not before. */}
                          {part === 'unknown' && run.holds !== null && <> {holdsText(data, run.holds)}</>}
                        </td>
                      </tr>
                    )}
                    {reasons.length > 0 && (
                      <tr>
                        <td colSpan={3} className={`${CELL} pl-10`}>
                          <ul className="grid max-w-[75ch] gap-0.5 text-muted-foreground">
                            {reasons.map((reason) => (
                              <li key={reasonText(reason)}>{reasonText(reason)}</li>
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
