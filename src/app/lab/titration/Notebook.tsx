import { useId, useState, type ReactNode, type Ref } from 'react'
import { Calculator } from '@/app/lab/Calculator'
import { Subscripted } from '@/app/lab/Primer'
import { ROLE } from '@/app/lab/roles'
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
import { ENTRY_INPUT, entryKey, fieldState, useEntryFocus } from './entry'
import { deviationE2Text, deviationText, molarityText, readingText } from './format'
import {
  blockedText,
  completedText,
  feedback,
  INVALID_ENTRY_TEXT,
  invalidMolarityText,
  NOTEBOOK_TEXT,
  outcomeLabel,
  outcomeRole,
  resultName,
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
/** The role of a figure the notebook holds. The dash of one not yet there is no figure, and is plain. */
const valueRole = (text: string) => (text === NOTEBOOK_TEXT.notYet ? '' : ROLE.value)
/** The role of a result beside its words; none for a trial still open or a pass that does not count. */
const resultRole = (role: ReturnType<typeof outcomeRole>) => (role === null ? '' : ROLE[role])
/** Classes as one attribute, with none left empty. */
const classes = (...names: string[]) => names.filter(Boolean).join(' ') || undefined

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
          <dd className={classes('text-right tabular-nums', valueRole(value))}>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * One labelled field of a form, with what is said of it tied to it: `held`, why it takes no entry now, or `error`,
 * what its last entry was refused with. A field that takes none shows no refusal and is not marked invalid: the
 * one reason is all that is under it. Its label carries the entry role only while it waits for typing. `children`
 * sit beside the input. Exported for its test.
 */
export function Field({
  label,
  value,
  onChange,
  noteId,
  labelId,
  disabled = false,
  held = null,
  error = '',
  inputRef,
  children,
}: {
  label: string
  value: string
  onChange(value: string): void
  noteId: string
  labelId?: string
  disabled?: boolean
  held?: string | null
  error?: string
  inputRef?: Ref<HTMLInputElement>
  children?: ReactNode
}) {
  const id = useId()
  const refused = !disabled && error !== ''
  return (
    <div className="grid gap-1.5">
      <label id={labelId} htmlFor={id} className={disabled ? 'font-medium' : `font-medium ${ROLE.entry}`}>
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          disabled={disabled}
          aria-invalid={refused || undefined}
          aria-describedby={noteId}
          onChange={(event) => onChange(event.target.value)}
          className={ENTRY_INPUT}
        />
        {children}
      </div>
      <div id={noteId}>{held !== null ? <p className={ROLE.held}>{held}</p> : refused && <p role="alert">{error}</p>}</div>
    </div>
  )
}

/** Beside a field while its entry is changed: puts it back as it was, as Escape does anywhere in its form. */
function Cancel({ onCancel }: { onCancel(): void }) {
  return (
    <Button type="button" variant="outline" onClick={onCancel}>
      {NOTEBOOK_TEXT.cancel}
    </Button>
  )
}

/**
 * A molarity typed to four decimal places, in a form of its own: Enter submits it. `invalid` is said of a text that
 * is not one. `recorded` is the entry once it is made: the field is then disabled and shows it, and the button
 * reads "Change" for as long as the engine would take the entry again (`blocked` is null).
 */
function MolarityEntry({
  label,
  button,
  invalid,
  blocked,
  recorded,
  onEntry,
}: {
  label: string
  button: string
  invalid: string
  blocked: string | null
  recorded: number | null
  onEntry(molarityE6: number): EntryReply
}) {
  const [text, setText] = useState('')
  const [changing, setChanging] = useState(false)
  const [reply, setReply] = useState<EntryReply>({ accepted: true, text: '' })
  const noteId = useId()
  const labelId = useId()
  const { editable, changeable, cancellable } = fieldState(recorded !== null, blocked !== null, changing)
  const focus = useEntryFocus(editable)
  const settle = () => {
    setChanging(false)
    setText('')
  }
  const cancel = () => {
    // First, while the button that takes focus is the one that stays.
    focus.button.current?.focus()
    settle()
    setReply({ accepted: true, text: '' })
  }
  return (
    <form
      noValidate
      className="grid gap-1.5"
      onKeyDown={(event) => entryKey(event, cancellable ? cancel : null)}
      onSubmit={(event) => {
        event.preventDefault()
        if (blocked !== null) return
        if (changeable) {
          setText(molarityText(recorded!))
          return setChanging(true)
        }
        const molarityE6 = parseMolarity(text)
        const answer = molarityE6 === null ? { accepted: false, text: invalidMolarityText(text, invalid) } : onEntry(molarityE6)
        if (answer.accepted) settle()
        setReply(answer)
      }}
    >
      <Field
        label={label}
        value={editable ? text : recorded === null ? '' : molarityText(recorded)}
        onChange={setText}
        noteId={noteId}
        labelId={labelId}
        disabled={!editable}
        held={blocked}
        error={reply.accepted ? '' : reply.text}
        inputRef={focus.field}
      >
        {/* Stays focusable when it cannot be used, with the reason as its description. As "Change" it is described by the field it is of, which the Tab key passes over while it is disabled. */}
        <Button
          ref={focus.button}
          type="submit"
          variant="outline"
          aria-disabled={blocked !== null || undefined}
          aria-describedby={blocked !== null ? noteId : changeable ? labelId : undefined}
          className="aria-disabled:opacity-50"
        >
          {changeable ? NOTEBOOK_TEXT.change : button}
        </Button>
        {cancellable && <Cancel onCancel={cancel} />}
      </Field>
      <p role="status">{blocked === null && reply.accepted ? reply.text : ''}</p>
    </form>
  )
}

/**
 * The learner's own average and relative deviation: one form, two fields, and one entry of the engine's. `worked` is
 * Guided's average, set out. Once the two are entered the fields are disabled and show them, the notebook's own
 * values stay beside them below, and the button reads "Change" while the engine would take the entry again.
 */
function SummaryEntry({
  worked,
  blocked,
  recorded,
  onSummary,
}: {
  worked: string | null
  blocked: string | null
  recorded: TitrationState['summary']
  onSummary: NotebookPanelProps['onSummary']
}) {
  const [mean, setMean] = useState('')
  const [deviation, setDeviation] = useState('')
  const [changing, setChanging] = useState(false)
  const [errors, setErrors] = useState({ mean: '', deviation: '' })
  const meanNoteId = useId()
  const deviationNoteId = useId()
  const meanLabelId = useId()
  const deviationLabelId = useId()
  const { editable, changeable, cancellable } = fieldState(recorded !== null, blocked !== null, changing)
  const focus = useEntryFocus(editable)
  const settle = () => {
    setChanging(false)
    setMean('')
    setDeviation('')
    setErrors({ mean: '', deviation: '' })
  }
  const cancel = () => {
    // First, while the button that takes focus is the one that stays.
    focus.button.current?.focus()
    settle()
  }
  return (
    <form
      noValidate
      className="grid justify-items-start gap-2"
      onKeyDown={(event) => entryKey(event, cancellable ? cancel : null)}
      onSubmit={(event) => {
        event.preventDefault()
        if (blocked !== null) return
        if (changeable) {
          setMean(molarityText(recorded!.meanE6))
          setDeviation(deviationE2Text(recorded!.deviationE2))
          return setChanging(true)
        }
        const meanE6 = parseMolarity(mean)
        const deviationE2 = parseDeviation(deviation)
        if (meanE6 === null || deviationE2 === null) {
          setErrors({ mean: meanE6 === null ? invalidMolarityText(mean, INVALID_ENTRY_TEXT.molarity) : '', deviation: deviationE2 === null ? INVALID_ENTRY_TEXT.deviation : '' })
          return
        }
        const reply = onSummary(meanE6, deviationE2)
        if (reply.accepted) settle()
        else setErrors({ mean: reply.text, deviation: '' })
      }}
    >
      <p>{SUMMARY.ask}</p>
      {worked !== null && <p>{worked}</p>}
      <Field
        label={SUMMARY.ownAverage}
        value={editable ? mean : recorded ? molarityText(recorded.meanE6) : ''}
        onChange={setMean}
        noteId={meanNoteId}
        labelId={meanLabelId}
        disabled={!editable}
        held={blocked}
        error={errors.mean}
        inputRef={focus.field}
      />
      <Field
        label={SUMMARY.ownDeviation}
        value={editable ? deviation : recorded ? deviationE2Text(recorded.deviationE2) : ''}
        onChange={setDeviation}
        noteId={deviationNoteId}
        labelId={deviationLabelId}
        disabled={!editable}
        error={errors.deviation}
      />
      <div className="flex flex-wrap gap-1.5">
        <Button
          ref={focus.button}
          type="submit"
          variant="outline"
          aria-disabled={blocked !== null || undefined}
          aria-describedby={blocked !== null ? meanNoteId : changeable ? `${meanLabelId} ${deviationLabelId}` : undefined}
          className="aria-disabled:opacity-50"
        >
          {changeable ? NOTEBOOK_TEXT.change : SUMMARY.reveal}
        </Button>
        {cancellable && <Cancel onCancel={cancel} />}
      </div>
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
  const lastOutcome = last && trialOutcome(m, state, last)
  const counting = countingTrials(m, state)
  const naoh = trueNaoh(m, state)
  const summary = summaryView(m, state)
  const titreUl = titre(trial)
  const resultId = useId()
  return (
    <div className="grid gap-4 rounded-lg border bg-card p-3 text-sm">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium">{NOTEBOOK_TEXT.heading}</h2>
          <Calculator />
        </div>
        <p className="text-muted-foreground">{seedText(state.seed)}</p>
        <p className="text-muted-foreground">{tallyText(state.trials.filter(({ end }) => end !== 'open').length, counting.length, m.passesToComplete)}</p>
      </div>

      <MolarityEntry
        label={NOTEBOOK_TEXT.hcl}
        button={NOTEBOOK_TEXT.record}
        invalid={INVALID_ENTRY_TEXT['hcl-molarity']}
        blocked={entryBlocked(m, state, { type: 'recordHclMolarity', molarityE6: 0 })}
        recorded={state.hclRecordedE6}
        onEntry={onHclMolarity}
      />

      <div className="grid gap-2">
        <h3 className={`font-medium ${ROLE.value}`}>{trialHeading(trial.index + 1)}</h3>
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
          recorded={trial.molarityE6}
          onEntry={onMolarity}
        />
        {can(m, state, { type: 'discardTrial' }) === null && (
          <Button variant="outline" onClick={onDiscard} className="justify-self-start">
            {NOTEBOOK_TEXT.discard}
          </Button>
        )}
      </div>

      {last && lastOutcome && (
        <section ref={resultRef} tabIndex={-1} aria-labelledby={resultId} className="grid gap-1.5 rounded-md border p-2 outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {/* Whose result, in the role of a name, then a colon and the result, in the role of what it is. */}
          <h3 id={resultId} className="font-medium">
            <span className={ROLE.value}>{resultName(last.index + 1)}</span>: <span className={classes(resultRole(outcomeRole(lastOutcome)))}>{outcomeLabel(lastOutcome)}</span>
          </h3>
          {feedback(lastOutcome, last.waterUl).map((line) => (
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
            <SummaryEntry
              worked={state.mode === 'guided' ? workedAverage(counting.map((counted) => counted.molarityE6!)) : null}
              blocked={entryBlocked(m, state, { type: 'recordSummary', meanE6: 0, deviationE2: 0 })}
              recorded={state.summary}
              onSummary={onSummary}
            />
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
        {NOTEBOOK_TEXT.hclInRecord}: <span className={classes(valueRole(molarity(state.hclRecordedE6)))}>{molarity(state.hclRecordedE6)}</span>
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
                  {/* Four figures, each in the role of a value once it is there, then the result in its own. */}
                  {[reading(trial.initialReadingUl), reading(trial.finalReadingUl), reading(titre(trial)), molarity(trial.molarityE6)].map((cell, column) => (
                    <td key={column} className={classes('py-1 pr-3', valueRole(cell))}>
                      {cell}
                    </td>
                  ))}
                  <td className={classes('py-1 pr-3', resultRole(outcomeRole(outcome)))}>{outcomeLabel(outcome)}</td>
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
