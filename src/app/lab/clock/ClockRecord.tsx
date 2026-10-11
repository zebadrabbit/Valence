import { Fragment } from 'react'
import { ROLE } from '@/app/lab/roles'
import { Marked } from '@/app/lab/stationPieces'
import { PART_IDS, type ClockData, type PartId, type RunId } from '@/chem-data/clock/data'
import { fieldsOf, runOutcomes, sheetOutcomes, temperatureView, type ClockModel, type ClockState, type RunOutcome, type SheetOutcome } from '@/engine/clock'
import { PartProgressLabel, RUNS_OF, partProgress } from './ClockBench'
import { LAB_TEXT, RECORD_TEXT, fieldLabel, partTitle, runReasonText, runTitle, sheetReasonText, valueText } from './messages'

/** How a run or a working of a notebook came out, in words: a tick on one that counts. `open` is what is said of one that is not over. */
function Result({ outcome, open }: { outcome: RunOutcome | SheetOutcome; open: string }) {
  if (outcome.state === 'open') return <span className="text-muted-foreground">{open}</span>
  if (outcome.state === 'does-not-count') return <span className={ROLE.failed}>{RECORD_TEXT.doesNotCount}</span>
  return (
    <Marked mark="✓" done>
      {RECORD_TEXT.counts}
    </Marked>
  )
}

const CELL = 'border-b p-2 text-left align-top'

/**
 * The Record tab: for each of the three parts, how far it has come; every attempt at each of its runs, in order,
 * with what the watch read and how it was stopped (by hand, with how long after the change where the liquid had
 * changed, or at the change), how the run came out and, where it does not count, why; and every working of its
 * notebook, with what was entered. It reads the stored record and judges it as the engine does, so it cannot
 * disagree with the bench, and it shows nothing of what a result is held to.
 */
export function ClockRecord({ data, m, state }: { data: ClockData; m: ClockModel; state: ClockState }) {
  const progress = partProgress(m, state)
  const places = temperatureView(m, state).graph?.places ?? []
  const lines = (items: readonly string[], reasons: readonly string[]) =>
    (items.length > 0 || reasons.length > 0) && (
      <tr>
        <td colSpan={2} className={`${CELL} pl-6`}>
          <ul className="grid max-w-[75ch] gap-0.5">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
            {reasons.map((reason) => (
              <li key={reason} className="text-muted-foreground">
                {reason}
              </li>
            ))}
          </ul>
        </td>
      </tr>
    )
  const runRows = (run: RunId) =>
    runOutcomes(m, state, run).map(({ outcome, stopped }, at) => {
      const stop = state.runs[run]![at]!.stop
      const reasons = outcome.state === 'does-not-count' ? outcome.reasons : []
      // A hand's delay is said where there was a change to be late for.
      const afterChange = stop?.by === 'hand' && !reasons.includes('stopped-early') && !reasons.includes('no-indicator')
      const timed = stopped === null ? [] : [stopped.by === 'end' ? RECORD_TEXT.timedByEnd(stopped.tenths) : afterChange ? RECORD_TEXT.timedByHandAfter(stopped.tenths, stop.delayMs) : RECORD_TEXT.timedByHand(stopped.tenths)]
      return (
        <Fragment key={`${run}:${at}`}>
          <tr>
            <th scope="row" className={`${CELL} pl-6 font-medium`}>
              {runTitle(data, run)}, {RECORD_TEXT.attempt(at + 1).toLowerCase()}
            </th>
            <td className={CELL}>
              <Result outcome={outcome} open={RECORD_TEXT.open} />
            </td>
          </tr>
          {lines(
            timed,
            reasons.map((reason) => runReasonText(m, reason)),
          )}
        </Fragment>
      )
    })
  const sheetRows = (part: Exclude<PartId, 'runs'>) => {
    const outcomes = sheetOutcomes(m, state, part)
    return state.sheets[part].map((sheet, at) => {
      const outcome = outcomes[at]!
      const entered = fieldsOf(m, part).filter((field) => sheet.entries[field] !== null && sheet.entries[field] !== undefined)
      // A notebook with nothing in it yet, and no working before it, has nothing to record.
      if (entered.length === 0 && outcome.state === 'open' && state.sheets[part].length === 1) return null
      return (
        <Fragment key={`${part}:${at}`}>
          <tr>
            <th scope="row" className={`${CELL} pl-6 font-medium`}>
              {RECORD_TEXT.working(at + 1)}
            </th>
            <td className={CELL}>
              <Result outcome={outcome} open={RECORD_TEXT.notChecked} />
            </td>
          </tr>
          {lines(
            entered.map((field) => `${fieldLabel(data, field)}: ${valueText(field, sheet.entries[field]!, places)}`),
            outcome.state === 'does-not-count' ? outcome.reasons.map((reason) => sheetReasonText(m, part, reason)) : [],
          )}
        </Fragment>
      )
    })
  }
  return (
    <div className="grid gap-4 text-sm">
      {state.status === 'completed' && (
        <p className="font-medium">
          <Marked mark="✓" done>
            {LAB_TEXT.complete}
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
          {PART_IDS.map((part) => (
            <tbody key={part}>
              <tr>
                <th scope="rowgroup" className={`${CELL} font-semibold`}>
                  {partTitle(data, part)}
                </th>
                <td className={`${CELL} font-medium`}>
                  <PartProgressLabel progress={progress[part]} />
                </td>
              </tr>
              {RUNS_OF[part].map(runRows)}
              {part !== 'runs' && sheetRows(part)}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  )
}
