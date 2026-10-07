import { useId, useState, type ReactNode, type Ref } from 'react'
import { Subscripted } from '@/app/lab/Primer'
import { Button } from '@/components/ui/button'
import {
  can,
  countingTrials,
  currentTrial,
  parseDeviation,
  parseMolarity,
  summaryView,
  trialOutcome,
  trueNaoh,
  type Action,
  type Blocked,
  type TitrationModel,
  type TitrationState,
  type Trial,
} from '@/engine/titration'
import { deviationE2Text, deviationText, molarityText, readingText } from './format'
import {
  blockedText,
  completedText,
  feedback,
  INVALID_ENTRY_TEXT,
  NOTEBOOK_TEXT,
  outcomeLabel,
  resultHeading,
  seedText,
  SUMMARY,
  tallyText,
  trialHeading,
  workedAverage,
  workedLines,
} from './messages'

/** accepted: the entry is in the notebook. Not accepted: refused, and the text says why. */
export interface EntryReply {
  accepted: boolean
  text: string
}

export interface NotebookPanelProps {
  m: TitrationModel
  state: TitrationState
  /** The panel parses; only a value that parsed is sent. */
  onHclMolarity(molarityE6: number): EntryReply
  onMolarity(molarityE6: number): EntryReply
  onDiscard(): void
  onNextTrial(): void
  onSummary(meanE6: number, deviationE2: number): EntryReply
  /** The last result, which takes focus after a trial ends. */
  resultRef?: Ref<HTMLElement>
}

const [, INITIAL, FINAL, TITRE] = NOTEBOOK_TEXT.columns
const reading = (ul: number | null) => (ul === null ? NOTEBOOK_TEXT.notYet : readingText(ul))
const molarity = (e6: number | null) => (e6 === null ? NOTEBOOK_TEXT.notYet : molarityText(e6))
const titre = ({ initialReadingUl, finalReadingUl }: Trial) => (initialReadingUl === null || finalReadingUl === null ? null : finalReadingUl - initialReadingUl)

/** The engine's answers that are about the value typed and not about the state. */
const ABOUT_THE_VALUE: readonly Blocked[] = ['invalid-entry', 'not-the-label', 'calculation-mismatch']

/** Why an entry cannot be made now whatever is typed, in words; null when one can. `probe` is the entry with any value. */
function entryBlocked(m: TitrationModel, state: TitrationState, probe: Action): string | null {
  const reason = can(m, state, probe)
  return reason === null || ABOUT_THE_VALUE.includes(reason) ? null : blockedText(reason)
}

/** Terms and their values, read in pairs. */
function Pairs({ pairs }: { pairs: readonly (readonly [term: string, value: string])[] }) {
  return (
    <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1">
      {pairs.map(([term, value]) => (
        <div key={term} className="col-span-2 grid grid-cols-subgrid">
          <dt className="text-muted-foreground">{term}</dt>
          <dd className="text-right tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * One labelled field of a form, with what is said of it tied to it: `blocked`, why it cannot be used yet, or
 * `error`, what its last entry was refused with. `children` sit beside the input.
 */
function Field({ label, value, onChange, noteId, blocked = null, error = '', children }: { label: string; value: string; onChange(value: string): void; noteId: string; blocked?: string | null; error?: string; children?: ReactNode }) {
  const id = useId()
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      <div className="flex gap-1.5">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          disabled={blocked !== null}
          aria-invalid={error !== '' || undefined}
          aria-describedby={noteId}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-24 rounded-md border bg-background px-2 tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 aria-invalid:border-destructive"
        />
        {children}
      </div>
      <div id={noteId}>{blocked !== null ? <p className="text-muted-foreground">{blocked}</p> : error !== '' && <p role="alert">{error}</p>}</div>
    </div>
  )
}

/** A molarity typed to four decimal places, in a form of its own: Enter submits it. `invalid` is said of a text that is not one. */
function MolarityEntry({ label, button, invalid, blocked, onEntry }: { label: string; button: string; invalid: string; blocked: string | null; onEntry(molarityE6: number): EntryReply }) {
  const [text, setText] = useState('')
  const [reply, setReply] = useState<EntryReply>({ accepted: true, text: '' })
  const noteId = useId()
  return (
    <form
      noValidate
      className="grid gap-1.5"
      onSubmit={(event) => {
        event.preventDefault()
        if (blocked !== null) return
        const molarityE6 = parseMolarity(text)
        const answer = molarityE6 === null ? { accepted: false, text: invalid } : onEntry(molarityE6)
        if (answer.accepted) setText('')
        setReply(answer)
      }}
    >
      <Field label={label} value={text} onChange={setText} noteId={noteId} blocked={blocked} error={reply.accepted ? '' : reply.text}>
        {/* Stays focusable when it cannot be used, with the reason as its description. */}
        <Button type="submit" variant="outline" aria-disabled={blocked !== null || undefined} aria-describedby={blocked !== null ? noteId : undefined} className="aria-disabled:opacity-50">
          {button}
        </Button>
      </Field>
      <p role="status">{blocked === null && reply.accepted ? reply.text : ''}</p>
    </form>
  )
}

/** The learner's own average and relative deviation: one form, two fields. `worked` is Guided's average, set out. */
function SummaryEntry({ worked, onSummary }: { worked: string | null; onSummary: NotebookPanelProps['onSummary'] }) {
  const [mean, setMean] = useState('')
  const [deviation, setDeviation] = useState('')
  const [errors, setErrors] = useState({ mean: '', deviation: '' })
  const meanNoteId = useId()
  const deviationNoteId = useId()
  return (
    <form
      noValidate
      className="grid justify-items-start gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        const meanE6 = parseMolarity(mean)
        const deviationE2 = parseDeviation(deviation)
        if (meanE6 === null || deviationE2 === null) {
          setErrors({ mean: meanE6 === null ? INVALID_ENTRY_TEXT.molarity : '', deviation: deviationE2 === null ? INVALID_ENTRY_TEXT.deviation : '' })
          return
        }
        const reply = onSummary(meanE6, deviationE2)
        setErrors({ mean: reply.accepted ? '' : reply.text, deviation: '' })
      }}
    >
      <p>{SUMMARY.ask}</p>
      {worked !== null && <p>{worked}</p>}
      <Field label={SUMMARY.ownAverage} value={mean} onChange={setMean} noteId={meanNoteId} error={errors.mean} />
      <Field label={SUMMARY.ownDeviation} value={deviation} onChange={setDeviation} noteId={deviationNoteId} error={errors.deviation} />
      <Button type="submit" variant="outline">
        {SUMMARY.reveal}
      </Button>
    </form>
  )
}

/**
 * The working part of the notebook, docked beside the bench: the run, the trial under way with its two typed
 * entries, the last result, and the part across trials. The burette readings are typed at the bench and shown here.
 * It holds no engine rule: what can be entered, and why not, is the engine's word.
 */
export function NotebookPanel({ m, state, onHclMolarity, onMolarity, onDiscard, onNextTrial, onSummary, resultRef }: NotebookPanelProps) {
  const trial = currentTrial(state)
  const last = [...state.trials].reverse().find(({ end }) => end !== 'open')
  const counting = countingTrials(m, state)
  const naoh = trueNaoh(m, state)
  const summary = summaryView(m, state)
  const titreUl = titre(trial)
  const resultId = useId()
  return (
    <div className="grid gap-4 rounded-lg border bg-card p-3 text-sm">
      <div>
        <h2 className="font-medium">{NOTEBOOK_TEXT.heading}</h2>
        <p className="text-muted-foreground">{seedText(state.seed)}</p>
        <p className="text-muted-foreground">{tallyText(state.trials.filter(({ end }) => end !== 'open').length, counting.length, m.passesToComplete)}</p>
      </div>

      <MolarityEntry
        label={NOTEBOOK_TEXT.hcl}
        button={NOTEBOOK_TEXT.record}
        invalid={INVALID_ENTRY_TEXT['hcl-molarity']}
        blocked={entryBlocked(m, state, { type: 'recordHclMolarity', molarityE6: 0 })}
        onEntry={onHclMolarity}
      />

      <div className="grid gap-2">
        <h3 className="font-medium">{trialHeading(trial.index + 1)}</h3>
        <Pairs
          pairs={[
            // The molarity this trial was calculated with, once it has been: the notebook's can be changed between trials.
            [NOTEBOOK_TEXT.hclRecorded, molarity(trial.hclUsedE6 ?? state.hclRecordedE6)],
            [INITIAL, reading(trial.initialReadingUl)],
            [FINAL, reading(trial.finalReadingUl)],
            [TITRE, reading(titreUl)],
          ]}
        />
        {/* Guided's calculation, with the learner's own numbers and no answer. */}
        {state.mode === 'guided' && trial.end === 'open' && titreUl !== null && state.hclRecordedE6 !== null && (
          <div className="grid gap-1 rounded-md border p-2">
            <h4 className="font-medium">{NOTEBOOK_TEXT.worked}</h4>
            {workedLines(state.hclRecordedE6, trial.initialReadingUl!, trial.finalReadingUl!).map((line) => (
              <p key={line}>
                <Subscripted text={line} />
              </p>
            ))}
          </div>
        )}
        {/* A field of its own for each trial, so that what one trial's entry was told is not said of the next. */}
        <MolarityEntry
          key={trial.index}
          label={NOTEBOOK_TEXT.naoh}
          button={NOTEBOOK_TEXT.check}
          invalid={INVALID_ENTRY_TEXT.molarity}
          blocked={entryBlocked(m, state, { type: 'submitMolarity', molarityE6: 0 })}
          onEntry={onMolarity}
        />
        {can(m, state, { type: 'discardTrial' }) === null && (
          <Button variant="outline" onClick={onDiscard} className="justify-self-start">
            {NOTEBOOK_TEXT.discard}
          </Button>
        )}
      </div>

      {last && (
        <section ref={resultRef} tabIndex={-1} aria-labelledby={resultId} className="grid gap-1.5 rounded-md border p-2 outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <h3 id={resultId} className="font-medium">
            {resultHeading(last.index + 1, outcomeLabel(trialOutcome(m, state, last)))}
          </h3>
          {feedback(trialOutcome(m, state, last), last.waterUl).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </section>
      )}
      {trial.end !== 'open' && can(m, state, { type: 'startNextTrial' }) === null && (
        <Button onClick={onNextTrial} className="justify-self-start">
          {NOTEBOOK_TEXT.nextTrial}
        </Button>
      )}

      <div className="grid gap-2">
        <h3 className="font-medium">{SUMMARY.heading}</h3>
        {naoh === null ? (
          <p>{SUMMARY.waiting}</p>
        ) : (
          <>
            <p>{completedText(naoh)}</p>
            <SummaryEntry worked={state.mode === 'guided' ? workedAverage(counting.map((counted) => counted.molarityE6!)) : null} onSummary={onSummary} />
          </>
        )}
        {/* Always there, and empty until both of the learner's values are in, so that a screen reader says the notebook's when they come. Nothing is marked. */}
        <div role="status" className="grid gap-2">
          {summary && (
            <>
              <Pairs
                pairs={[
                  [SUMMARY.ownAverage, molarityText(summary.learnerMeanE6)],
                  [SUMMARY.average, molarityText(summary.meanE6)],
                  [SUMMARY.ownDeviation, deviationE2Text(summary.learnerDeviationE2)],
                  [SUMMARY.deviation, deviationText(summary.deviationTenths)],
                ]}
              />
              <p>{SUMMARY.explain}</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * The record of the run, on the page's Record tab: every trial with what was recorded in it and how it ended, an
 * ended trial's feedback under its row. Read-only, so it is also what a narrow window shows of a saved run.
 */
export function TrialRecord({ m, state }: { m: TitrationModel; state: TitrationState }) {
  return (
    <section className="grid gap-2 rounded-lg border bg-card p-3 text-sm">
      <h2 className="font-medium">{NOTEBOOK_TEXT.recordHeading}</h2>
      <p>
        {NOTEBOOK_TEXT.hclInRecord}: {molarity(state.hclRecordedE6)}
      </p>
      {/* On a small screen the table scrolls sideways in this box, which the keyboard can reach. */}
      <div tabIndex={0} role="region" aria-label={NOTEBOOK_TEXT.recordHeading} className="overflow-x-auto rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <table className="w-full min-w-[36rem] border-collapse text-left">
          <caption className="mb-1 text-left text-muted-foreground">{NOTEBOOK_TEXT.recordCaption}</caption>
          <thead>
            <tr>
              {NOTEBOOK_TEXT.columns.map((column) => (
                <th key={column} scope="col" className="border-b py-1 pr-3 font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          {state.trials.map((trial) => {
            const outcome = trialOutcome(m, state, trial)
            const lines = feedback(outcome, trial.waterUl)
            return (
              <tbody key={trial.index} className="border-b tabular-nums">
                <tr>
                  <th scope="row" className="py-1 pr-3 font-medium">
                    {trial.index + 1}
                  </th>
                  {[reading(trial.initialReadingUl), reading(trial.finalReadingUl), reading(titre(trial)), molarity(trial.molarityE6), outcomeLabel(outcome)].map((cell, column) => (
                    <td key={column} className="py-1 pr-3">
                      {cell}
                    </td>
                  ))}
                </tr>
                {lines.length > 0 && (
                  <tr>
                    <td colSpan={NOTEBOOK_TEXT.columns.length} className="pb-2 text-muted-foreground">
                      <ul className="grid max-w-[75ch] gap-1">
                        {lines.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </tbody>
            )
          })}
        </table>
      </div>
    </section>
  )
}
