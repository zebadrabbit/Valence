import { Fragment } from 'react'
import { ROLE } from '@/app/lab/roles'
import { Marked } from '@/app/lab/stationPieces'
import { SALT_IDS, type HotcoldData } from '@/chem-data/hotcold/data'
import { FIELDS, packsView, runOutcomes, runView, type HotcoldModel, type HotcoldState, type RunOutcome } from '@/engine/hotcold'
import { BENCH_TEXT, FIELD_LABEL, PACKS_TEXT, QUESTION_TEXT, RECORD_TEXT, enteredText, packsProgressOf, partTitle, progressOf, reasonText, saltName } from './messages'
import { ProgressLabel } from './RunCard'

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
 * The Record tab: for each salt, how far its part has come and every run of it in order, each with how it came
 * out, what was entered in its notebook and, where it does not count, why; then part 3, with the salt answered to
 * each question and, once the answers are checked, whether each is right; and, once the lab is complete, the line
 * that says so. It reads the stored record and judges it as the engine does (runView, runOutcomes, packsView), so
 * it cannot disagree with the bench, and it says nothing of a run or an answer that the bench does not.
 */
export function HotcoldRecord({ data, m, state }: { data: HotcoldData; m: HotcoldModel; state: HotcoldState }) {
  const packs = packsView(m, state)
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
          {SALT_IDS.map((salt) => {
            const outcomes = runOutcomes(m, state, salt)
            return (
              <tbody key={salt}>
                <tr>
                  <th scope="rowgroup" className={`${CELL} font-semibold`}>
                    {partTitle(data, salt)}
                  </th>
                  <td className={`${CELL} font-medium`}>
                    <ProgressLabel progress={progressOf(runView(m, state, salt))} />
                  </td>
                </tr>
                {state.runs[salt].map((run, at) => {
                  const outcome = outcomes[at]!
                  const entered = FIELDS.filter((field) => run.entries[field] !== null)
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
                      {(entered.length > 0 || reasons.length > 0) && (
                        <tr>
                          <td colSpan={2} className={`${CELL} pl-6`}>
                            <ul className="grid max-w-[75ch] gap-0.5">
                              {entered.map((field) => (
                                <li key={field}>
                                  {FIELD_LABEL[field]}: <span className={`whitespace-nowrap tabular-nums ${ROLE.value}`}>{enteredText(field, run.entries[field]!)}</span>
                                </li>
                              ))}
                              {reasons.map((reason) => (
                                <li key={reason} className="text-muted-foreground">
                                  {reasonText(reason)}
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
          <tbody>
            <tr>
              <th scope="rowgroup" className={`${CELL} font-semibold`}>
                {partTitle(data, 'packs')}
              </th>
              <td className={`${CELL} font-medium`}>
                <ProgressLabel progress={packsProgressOf(packs)} />
              </td>
            </tr>
            {packs.questions.map(({ id, answer, right }) => (
              <tr key={id}>
                <th scope="row" className={`${CELL} pl-6 font-normal`}>
                  {QUESTION_TEXT[id]}
                </th>
                <td className={CELL}>
                  {answer === null ? (
                    <span className="text-muted-foreground">{RECORD_TEXT.notAnswered}</span>
                  ) : (
                    <>
                      <span className={ROLE.value}>{saltName(data, answer)}</span>
                      {/* Whether it is right, where the bench says so: once the answers are checked, and in Guided as each is given. */}
                      {right !== null && <span className="ml-3 whitespace-nowrap">{right ? <Marked mark="✓" done>{PACKS_TEXT.right}</Marked> : <span className={ROLE.failed}>{PACKS_TEXT.notRight}</span>}</span>}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
