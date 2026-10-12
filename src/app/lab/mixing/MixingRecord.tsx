import { ROLE } from '@/app/lab/roles'
import { Marked } from '@/app/lab/stationPieces'
import { PAIR_IDS, PART_IDS, SOLID_TUBE_IDS, type MixingData, type TubeId } from '@/chem-data/mixing/data'
import { ruleView, tubeView, type MixingModel, type MixingState, type TubeView } from '@/engine/mixing'
import { LAB_TEXT, OUTCOME_LABEL, REASON_TEXT, RECORD_TEXT, choiceLabel, liquidName, markText, partName, partNumber, questionText, recordedLine, sortedLine, tubeName } from './messages'
import { partMarks } from './pageLook'

/** How a tube came out, in words: a tick on one that counts. */
function Result({ view }: { view: TubeView }) {
  const text = OUTCOME_LABEL[view.outcome.state]
  if (view.outcome.state === 'does-not-count') return <span className={ROLE.failed}>{text}</span>
  if (view.outcome.state !== 'counts') return <span className="text-muted-foreground">{text}</span>
  return (
    <Marked mark="✓" done>
      {text}
    </Marked>
  )
}

const CELL = 'border-b p-2 text-left align-top'
const NONE = <span className="text-muted-foreground">–</span>
const TUBES: readonly TubeId[] = [...PAIR_IDS, ...SOLID_TUBE_IDS]

/**
 * The Record tab: how each of the three parts stands; a table of the tubes that have been begun, in the bench's
 * order, with which liquid there was more of, what was recorded of the tube, and how it came out, with why where it
 * does not count; and, once part 3 is open, how each liquid was sorted and what was answered. It reads the stored
 * record through the engine's views, so it cannot disagree with the bench, and holds nothing the bench is kept
 * from: what a tube shows is not here, an answer has a mark only once it is judged, and no liquid has a family but
 * the one the learner gave it. A tube set up again is listed as its fresh tube.
 */
export function MixingRecord({ data, m, state }: { data: MixingData; m: MixingModel; state: MixingState }) {
  const status = partMarks(m, state)
  const begun = TUBES.map((id) => tubeView(m, state, id)).filter((view) => view.stage !== 'empty' || view.tries > 0)
  const rule = ruleView(m, state)
  return (
    <div className="grid gap-4 text-sm">
      {state.status === 'completed' && (
        <p className="max-w-prose font-medium">
          <Marked mark="✓" done>
            {LAB_TEXT.completed}
          </Marked>
        </p>
      )}
      <ul className="grid gap-1">
        {PART_IDS.map((partId) => (
          <li key={partId}>
            <span className="font-medium">
              {partNumber(partId)}: {partName(data, partId)}.
            </span>{' '}
            <Marked mark={status[partId].mark} done={status[partId].done}>
              {status[partId].text}
            </Marked>
          </li>
        ))}
      </ul>
      {begun.length === 0 ? (
        <p className="text-muted-foreground">{RECORD_TEXT.empty}</p>
      ) : (
        // A region that the keyboard can reach and scroll, where the table is wider than its window.
        <div role="region" aria-label={RECORD_TEXT.heading} tabIndex={0} className="overflow-x-auto rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <table className="w-full max-w-4xl min-w-[30rem] border-collapse">
            <caption className="mb-2 text-left font-medium">{RECORD_TEXT.heading}</caption>
            <thead>
              <tr>
                {[RECORD_TEXT.tube, RECORD_TEXT.amounts, RECORD_TEXT.recorded, RECORD_TEXT.result].map((heading) => (
                  <th key={heading} scope="col" className={`${CELL} font-medium text-muted-foreground`}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {begun.map((view) => (
                <tr key={view.id}>
                  <th scope="row" className={`${CELL} font-medium`}>
                    {tubeName(data, view.id)}
                    {view.tries > 0 && <span className="block text-xs font-normal text-muted-foreground">{RECORD_TEXT.tries(view.tries)}</span>}
                  </th>
                  <td className={CELL}>{view.kind === 'pair' && view.more !== null ? liquidName(data, view.more) : NONE}</td>
                  <td className={CELL}>{recordedLine(data, view)}</td>
                  <td className={CELL}>
                    <span className="whitespace-nowrap">
                      <Result view={view} />
                    </span>
                    {view.reasons.length > 0 && (
                      <ul className="mt-1 grid gap-0.5 text-xs text-muted-foreground">
                        {view.reasons.map((reason) => (
                          <li key={reason}>{REASON_TEXT[reason]}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Part 3's answers, once it is open: what the learner gave, and a mark only where it has been judged. */}
      {rule.open && (
        <>
          <section className="grid gap-1">
            <h3 className="font-medium">{RECORD_TEXT.sorting}</h3>
            <ul className="grid gap-0.5">
              {rule.sorted.map((one) => (
                <li key={one.liquid}>
                  {sortedLine(data, one.liquid, one.family)}
                  {one.family !== null && <span className="text-muted-foreground"> · {markText(one.right)}</span>}
                </li>
              ))}
            </ul>
          </section>
          <section className="grid gap-1">
            <h3 className="font-medium">{RECORD_TEXT.questions}</h3>
            <ul className="grid max-w-[75ch] gap-1">
              {rule.questions.map((question) => (
                <li key={question.id}>
                  {questionText(data, question.id)} <span className="font-medium">{question.answer === null ? RECORD_TEXT.notAsked : choiceLabel(question.answer)}</span>
                  {question.answer !== null && <span className="text-muted-foreground"> · {markText(question.right)}</span>}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}
