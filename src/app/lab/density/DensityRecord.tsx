import { ROLE } from '@/app/lab/roles'
import { Marked } from '@/app/lab/stationPieces'
import { PART_IDS, type DensityData } from '@/chem-data/density/data'
import { FIELDS, partView, runOutcomes, type DensityModel, type DensityState, type RunOutcome } from '@/engine/density'
import { ProgressLabel } from './DensityBench'
import { PAGE_TEXT, RECORD_TEXT, enteredText, fieldLabel, partTitle, progressOf, reasonText } from './messages'

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

/**
 * The Record tab: for each of the three parts, how far it has come, and every run of it in order, each with how
 * it came out, what was read and entered in its notebook and, where it does not count, why; and, once the lab is
 * complete, the line that says so. It reads the stored record and judges it as the engine does (partView,
 * runOutcomes), so it cannot disagree with the bench, and it shows nothing of what a result is held to: an unknown
 * is named here only as the learner named it.
 */
export function DensityRecord({ data, m, state }: { data: DensityData; m: DensityModel; state: DensityState }) {
  return (
    <div className="grid max-w-[75ch] gap-4 text-sm">
      {state.status === 'completed' && (
        <p className="font-medium">
          <Marked mark="✓" done>
            {PAGE_TEXT.complete}
          </Marked>
        </p>
      )}
      {PART_IDS.map((part) => {
        const outcomes = runOutcomes(m, state, part)
        return (
          <section key={part} aria-label={partTitle(data, part)} className="grid gap-2 rounded-lg border bg-card p-4">
            <h2 className="text-base font-semibold">{partTitle(data, part)}</h2>
            <p className="font-medium">
              <ProgressLabel progress={progressOf(partView(m, state, part))} />
            </p>
            <h3 className="text-muted-foreground">{RECORD_TEXT.heading}</h3>
            <ol className="grid gap-3">
              {state.parts[part].map((run, at) => {
                const outcome = outcomes[at]!
                const entered = FIELDS[part].filter((field) => run.entries[field] !== null)
                const reasons = outcome.state === 'does-not-count' ? outcome.reasons : []
                return (
                  <li key={run.index} className="grid gap-1 border-t pt-2">
                    <p className="font-medium">
                      {RECORD_TEXT.run(run.index + 1)}
                      {': '}
                      <Result outcome={outcome} />
                    </p>
                    {(entered.length > 0 || reasons.length > 0) && (
                      <ul className="grid gap-0.5">
                        {entered.map((field) => (
                          <li key={field}>
                            {fieldLabel(field)}: <span className={`whitespace-nowrap tabular-nums ${ROLE.value}`}>{enteredText(m, data, field, run.entries[field]!)}</span>
                          </li>
                        ))}
                        {reasons.map((reason) => (
                          <li key={reason} className="text-muted-foreground">
                            {reasonText(m, reason)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ol>
          </section>
        )
      })}
    </div>
  )
}
