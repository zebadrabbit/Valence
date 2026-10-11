import { Fragment } from 'react'
import { ROLE } from '@/app/lab/roles'
import { Marked } from '@/app/lab/stationPieces'
import type { KineticsLab, PartProgress, Place, RunOutcome, SheetId, SheetOutcome, State, Words } from './engine'

/** Beside a part's progress in words, and hidden from a screen reader, which is given the words. */
const PART_MARK: Record<PartProgress, string> = { 'not-started': '○', runs: '◔', notebook: '◑', 'not-counted': '◑', done: '✓' }

/** A part's progress as a mark and its words; the tick of a part done is in the role of a done mark. */
export function PartProgressLabel({ words, progress }: { words: Words; progress: PartProgress }) {
  return (
    <Marked mark={PART_MARK[progress]} done={progress === 'done'}>
      {words.partProgress[progress]}
    </Marked>
  )
}

/** How a run or a working of a notebook came out, in words: a tick on one that counts. `open` is what is said of one that is not over. */
function Result({ words, outcome, open }: { words: Words; outcome: RunOutcome | SheetOutcome; open: string }) {
  if (outcome.state === 'open') return <span className="text-muted-foreground">{open}</span>
  if (outcome.state === 'does-not-count') return <span className={ROLE.failed}>{words.record.doesNotCount}</span>
  return (
    <Marked mark="✓" done>
      {words.record.counts}
    </Marked>
  )
}

const CELL = 'border-b p-2 text-left align-top'

/**
 * The Record tab of a lab on the kinetics engine: for each of its parts, how far it has come; every attempt at
 * each of its runs, in order, with what the watch read and how it was stopped (by hand, with how long after the
 * change where the liquid had changed; at the change; or by itself, at its limit), how the run came out and, where
 * it does not count, why; and every working of its notebook, with what was entered. It reads the stored record and
 * judges it as the engine does, so it cannot disagree with the bench, and it shows nothing of what a result is
 * held to. `places` are the places on a line that an entry may name, in the lab that has one.
 */
export function KineticsRecord({ lab, state, places = [] }: { lab: KineticsLab; state: State; places?: readonly Place[] }) {
  const { engine, m, words, parts } = lab
  const progress = lab.progress(state)
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
  const runRows = (run: string) =>
    engine.runOutcomes(m, state, run).map(({ outcome, stopped }, at) => {
      const stop = state.runs[run]![at]!.stop
      const reasons = outcome.state === 'does-not-count' ? outcome.reasons : []
      // A hand's delay is said where there was a change to be late for.
      const afterChange = stop?.by === 'hand' && !reasons.includes('stopped-early') && !reasons.includes('no-indicator')
      // A watch at its limit stopped itself, whichever way of stopping was asked for: the run's own card says the same.
      const itself = stopped !== null && stopped.tenths * 100 >= m.watchLimitMs
      const timed = stopped === null ? [] : [itself ? words.record.timedOut(stopped.tenths) : stopped.by === 'end' ? words.record.timedByEnd(stopped.tenths) : afterChange ? words.record.timedByHandAfter(stopped.tenths, stop.delayMs) : words.record.timedByHand(stopped.tenths)]
      return (
        <Fragment key={`${run}:${at}`}>
          <tr>
            <th scope="row" className={`${CELL} pl-6 font-medium`}>
              {words.runTitle(run)}, {words.record.attempt(at + 1).toLowerCase()}
            </th>
            <td className={CELL}>
              <Result words={words} outcome={outcome} open={words.record.open} />
            </td>
          </tr>
          {lines(
            timed,
            reasons.map((reason) => words.runReason(reason)),
          )}
        </Fragment>
      )
    })
  const sheetRows = (sheet: SheetId) => {
    const outcomes = engine.sheetOutcomes(m, state, sheet)
    return state.sheets[sheet].map((working, at) => {
      const outcome = outcomes[at]!
      const entered = engine.fieldsOf(m, sheet).filter((field) => working.entries[field] !== null && working.entries[field] !== undefined)
      // A notebook with nothing in it yet, and no working before it, has nothing to record.
      if (entered.length === 0 && outcome.state === 'open' && state.sheets[sheet].length === 1) return null
      return (
        <Fragment key={`${sheet}:${at}`}>
          <tr>
            <th scope="row" className={`${CELL} pl-6 font-medium`}>
              {words.record.working(at + 1)}
            </th>
            <td className={CELL}>
              <Result words={words} outcome={outcome} open={words.record.notChecked} />
            </td>
          </tr>
          {lines(
            entered.map((field) => `${words.fieldLabel(field)}: ${words.value(field, working.entries[field]!, places)}`),
            outcome.state === 'does-not-count' ? outcome.reasons.map((reason) => words.sheetReason(sheet, reason)) : [],
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
            {words.lab.complete}
          </Marked>
        </p>
      )}
      {/* A region that the keyboard can reach and scroll, should the table ever be wider than its window. */}
      <div role="region" aria-label={words.record.region} tabIndex={0} className="overflow-x-auto rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <table className="w-full max-w-4xl min-w-[24rem] border-collapse">
          <caption className="mb-2 text-left font-medium">{words.record.caption}</caption>
          <thead>
            <tr>
              {[words.record.part, words.record.result].map((heading) => (
                <th key={heading} scope="col" className={`${CELL} font-medium text-muted-foreground`}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          {parts.map((part) => (
            <tbody key={part.id}>
              <tr>
                <th scope="rowgroup" className={`${CELL} font-semibold`}>
                  {words.partTitle(part.id)}
                </th>
                <td className={`${CELL} font-medium`}>
                  <PartProgressLabel words={words} progress={progress[part.id]!} />
                </td>
              </tr>
              {part.runs.map(runRows)}
              {part.sheet !== null && sheetRows(part.sheet)}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  )
}
