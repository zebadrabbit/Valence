import { ROLE } from '@/app/lab/roles'
import { Marked } from '@/app/lab/stationPieces'
import type { FlameData } from '@/chem-data/flame/data'
import { QUESTIONS, closingView, stationView, type FlameState, type StationView } from '@/engine/flame'
import { BENCH_TEXT, CLOSING, QUESTION_LABEL, RECORD_TEXT, choiceLabel, stationTitle } from './messages'

/** What was found of a recorded observation, in words: not judged where the loop was not clean, and a tick on one that is correct. */
function Result({ view }: { view: StationView }) {
  if (view.counts === null) return <span className="text-muted-foreground">{RECORD_TEXT.notRecorded}</span>
  if (!view.counts) return <span className={ROLE.held}>{RECORD_TEXT.notCounted}</span>
  return <Judged ok={view.wrong?.length === 0} />
}
const Judged = ({ ok }: { ok: boolean }) =>
  ok ? (
    <Marked mark="✓" done>
      {RECORD_TEXT.correct}
    </Marked>
  ) : (
    <span className={ROLE.failed}>{RECORD_TEXT.notCorrect}</span>
  )

const CELL = 'border-b p-2 text-left align-top'

/**
 * The Record tab: for each of the six stations, the three answers as they were last checked, and whether the
 * observation counted and is correct; the closing question's answer as last given; and, once the lab is complete,
 * the line that says so. It reads the stored record and judges it as the engine does (stationView, closingView),
 * so it cannot disagree with the bench, and it shows nothing of what an answer should be.
 */
export function FlameRecord({ data, state }: { data: FlameData; state: FlameState }) {
  const closing = closingView(data, state)
  return (
    <div className="grid gap-4 text-sm">
      {state.status === 'completed' && (
        <p className="font-medium">
          <Marked mark="✓" done>
            {BENCH_TEXT.complete}
          </Marked>
        </p>
      )}
      {/* Wider than a narrow window: the table scrolls sideways in a region that the keyboard can reach and scroll. */}
      <div role="region" aria-label={RECORD_TEXT.region} tabIndex={0} className="overflow-x-auto rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <table className="w-full min-w-[40rem] border-collapse">
          <caption className="mb-2 text-left font-medium">{RECORD_TEXT.caption}</caption>
          <thead>
            <tr>
              {[RECORD_TEXT.station, ...QUESTIONS.map((question) => QUESTION_LABEL[question]), RECORD_TEXT.result].map((heading) => (
                <th key={heading} scope="col" className={`${CELL} font-medium text-muted-foreground`}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.salts.map((salt) => {
              const view = stationView(data, state, salt.id)
              return (
                <tr key={salt.id}>
                  <th scope="row" className={`${CELL} font-medium`}>
                    {stationTitle(data, salt.id)}
                  </th>
                  {QUESTIONS.map((question) => (
                    <td key={question} className={CELL}>
                      {view.observation === null ? <span className="text-muted-foreground">{RECORD_TEXT.notRecorded}</span> : <span className={ROLE.value}>{choiceLabel(question, view.observation[question])}</span>}
                    </td>
                  ))}
                  <td className={CELL}>
                    <Result view={view} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <section className="grid max-w-prose gap-1">
        <h3 className="font-medium">{CLOSING.heading}</h3>
        <p>{CLOSING.question}</p>
        <p>
          {RECORD_TEXT.answer}:{' '}
          {closing.answer === null ? (
            <span className="text-muted-foreground">{RECORD_TEXT.notAnswered}</span>
          ) : (
            <>
              <span className={ROLE.value}>{CLOSING.choices[closing.answer]}</span>
              {'. '}
              <Judged ok={closing.correct === true} />
            </>
          )}
        </p>
      </section>
    </div>
  )
}
