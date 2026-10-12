import { ROLE } from '@/app/lab/roles'
import { Marked } from '@/app/lab/stationPieces'
import { PART_IDS, THING_IDS, type CabbageData } from '@/chem-data/cabbage/data'
import { CANNOT_SAY, sampleView, type CabbageModel, type CabbageState, type SampleView } from '@/engine/cabbage'
import { CLASS_LABEL, LAB_TEXT, REASON_TEXT, RECORD_TEXT, SAMPLE_TEXT, estimateLabel, partName, partNumber, phText, thingName } from './messages'
import { partStatus } from './pageLook'

/** How a sample came out, in words: a tick on one that counts. */
function Result({ view }: { view: SampleView }) {
  if (view.outcome.state === 'does-not-count') return <span className={ROLE.failed}>{RECORD_TEXT.doesNotCount}</span>
  if (view.outcome.state !== 'counts') return <span className="text-muted-foreground">{RECORD_TEXT.open}</span>
  return (
    <Marked mark="✓" done>
      {RECORD_TEXT.counts}
    </Marked>
  )
}

const CELL = 'border-b p-2 text-left align-top'
const NONE = <span className="text-muted-foreground">–</span>

/**
 * The Record tab: how each of the three parts stands, and a table of the household things that have been begun, in
 * the bench's order: what was said by eye, the meter's reading once the meter has been read, and how the sample
 * came out, with why where it does not count. It reads the stored record through the engine's views, so it cannot
 * disagree with the bench, and holds nothing the bench is kept from: a pH is there only as a reading, and how a
 * sample came out only once it is checked. A thing set up again is listed as its fresh tube.
 */
export function CabbageRecord({ data, m, state }: { data: CabbageData; m: CabbageModel; state: CabbageState }) {
  const status = partStatus(m, state)
  const begun = THING_IDS.map((id) => sampleView(m, state, id)).filter((view) => view.indicator || view.tries > 0)
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
                {[RECORD_TEXT.thing, RECORD_TEXT.byEye, RECORD_TEXT.which, RECORD_TEXT.meter, RECORD_TEXT.result].map((heading) => (
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
                    {thingName(data, view.id)}
                    {view.tries > 0 && <span className="block text-xs font-normal text-muted-foreground">{RECORD_TEXT.tries(view.tries)}</span>}
                  </th>
                  <td className={CELL}>{view.estimate === null ? NONE : estimateLabel(view.estimate)}</td>
                  <td className={CELL}>{view.is !== null ? CLASS_LABEL[view.is] : view.estimate === CANNOT_SAY ? RECORD_TEXT.notAsked : NONE}</td>
                  <td className={`${CELL} tabular-nums`}>{view.reading === null ? <span className="text-muted-foreground">{SAMPLE_TEXT.notRead}</span> : <span className={ROLE.value}>{phText(view.reading.tenths)}</span>}</td>
                  <td className={CELL}>
                    <Result view={view} />
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
    </div>
  )
}
