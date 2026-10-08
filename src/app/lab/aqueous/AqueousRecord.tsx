import { ROLE } from '@/app/lab/roles'
import type { AqueousData } from '@/chem-data/aqueous/data'
import { FORMS, stationView, type AqueousState } from '@/engine/aqueous'
import { EquationLine } from './Formula'
import { FORM_LABEL, PAGE_TEXT, RECORD_TEXT, observationLines, stationTitle } from './messages'

/** Whether an entry is correct, in words, with a tick on the one that is; null for one not made yet. */
function Result({ ok }: { ok: boolean | null }) {
  if (ok === null) return <span className="text-muted-foreground">{PAGE_TEXT.notEntered}</span>
  return ok ? (
    <span>
      <span aria-hidden="true" className={ROLE.done}>
        ✓{' '}
      </span>
      {PAGE_TEXT.correct}
    </span>
  ) : (
    <span className={ROLE.failed}>{PAGE_TEXT.notCorrect}</span>
  )
}

const CELL = 'border-b p-2 text-left align-top'

/**
 * The Record tab: for each of the ten stations, the observation and the three equations as they were last
 * checked, and whether each is correct; and, once every station is done, the line that says the lab is complete.
 * It reads the stored record and judges it as the engine does (stationView), so it cannot disagree with the bench.
 */
export function AqueousRecord({ data, state }: { data: AqueousData; state: AqueousState }) {
  return (
    <div className="grid gap-3 text-sm">
      {state.status === 'completed' && (
        <p className="font-medium">
          <span aria-hidden="true" className={ROLE.done}>
            ✓{' '}
          </span>
          {PAGE_TEXT.completed}
        </p>
      )}
      {/* Wider than a narrow window: the table scrolls sideways in a region that the keyboard can reach and scroll. */}
      <div role="region" aria-label={RECORD_TEXT.region} tabIndex={0} className="overflow-x-auto rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <table className="w-full min-w-[36rem] border-collapse">
          <caption className="mb-2 text-left font-medium">{RECORD_TEXT.caption}</caption>
          <thead>
            <tr>
              {[RECORD_TEXT.station, RECORD_TEXT.entry, RECORD_TEXT.entered, RECORD_TEXT.result].map((heading) => (
                <th key={heading} scope="col" className={`${CELL} font-medium text-muted-foreground`}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          {data.stations.map((station) => {
            const view = stationView(data, state, station.id)
            return (
              <tbody key={station.id}>
                <tr>
                  <th scope="rowgroup" rowSpan={FORMS.length + 1} className={`${CELL} w-48 font-medium`}>
                    {stationTitle(data, station.id)}
                  </th>
                  <th scope="row" className={`${CELL} font-normal`}>
                    {RECORD_TEXT.observation}
                  </th>
                  <td className={CELL}>
                    {view.observation === null ? (
                      <span className="text-muted-foreground">{view.mixed ? PAGE_TEXT.notEntered : RECORD_TEXT.notMixed}</span>
                    ) : (
                      <ul className={`grid gap-0.5 ${ROLE.value}`}>
                        {observationLines(view.observation).map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className={`${CELL} whitespace-nowrap`}>
                    <Result ok={view.wrongFields === null ? null : view.wrongFields.length === 0} />
                  </td>
                </tr>
                {FORMS.map((form) => {
                  const judged = view.equations[form]
                  return (
                    <tr key={form}>
                      <th scope="row" className={`${CELL} font-normal`}>
                        {FORM_LABEL[form]}
                      </th>
                      <td className={CELL}>
                        {judged === null ? <span className="text-muted-foreground">{PAGE_TEXT.notEntered}</span> : <span className={ROLE.value}>{<EquationLine data={data} entry={judged.entry} />}</span>}
                      </td>
                      <td className={`${CELL} whitespace-nowrap`}>
                        <Result ok={judged === null ? null : judged.problem === null} />
                      </td>
                    </tr>
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
