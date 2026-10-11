import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Disclosure } from '@/app/explore/InspectorCard'
import { Calculator } from '@/app/lab/Calculator'
import { ChoiceForm } from '@/app/lab/ChoiceForm'
import { Control } from '@/app/lab/Control'
import { Line, Mark, useSaid } from '@/app/lab/Line'
import { ROLE } from '@/app/lab/roles'
import { Step } from '@/app/lab/stationPieces'
import { TypedEntry } from '@/app/lab/TypedEntry'
import type { Action, Blocked, Engine, EntryView, Field, KineticsLab, Place, SheetId, SheetOutcome, Sig3, State, Value, Words } from './engine'
import { Table } from './tables'

// The notebook of a lab on the kinetics engine: its entries, its check, how it came out, and the sheet on the rate
// law, which the two labs both have. Every sentence is the lab's own (`Words`), and every question is asked of the
// lab's own door.

/** The typed entries that are written with a minus sign or a power of ten, and so ask for a keyboard that has both. */
const isSigned = (engine: Engine, field: Field) => engine.kindOf(field) === 'rate' || engine.kindOf(field) === 'slope'
const isChoice = (engine: Engine, field: Field) => ['order', 'unit', 'first', 'second'].includes(engine.kindOf(field))
const entryWords = ({ notebook }: Words) => ({ enter: notebook.enter, change: notebook.change, cancel: notebook.cancel })

export interface SheetProps {
  lab: KineticsLab
  state: State
  /** False while another part is the one shown: this one stays drawn, hidden, and keeps what was typed in it. */
  shown: boolean
  act(actions: readonly Action[]): void
}

interface EntryProps {
  lab: KineticsLab
  entry: EntryView
  /** Guided: the relation the entry uses is ready to open. */
  guided: boolean
  /** The places on the line, for the two entries that are places. */
  places: readonly Place[]
  /** What a chosen entry is chosen among, and why it cannot be chosen yet, in words. */
  choices?: readonly { value: number; label: string }[]
  /** Makes the entry where the engine takes it, and hands back why not where it does not: null once it is made. */
  enter(field: Field, value: Value): Blocked | null
}

/** The relation an entry uses, closed until it is opened: Guided's, under an entry that waits to be made. */
const Relation = ({ words, field }: { words: Words; field: Field }) => (
  <Disclosure summary={words.notebook.hint}>
    <p className="max-w-prose">{words.relation(field)}</p>
  </Disclosure>
)

/**
 * An entry chosen from fixed answers, as choice boxes in the shared form. Once made it folds to a line beside
 * "Change", so that the entries under it are not pushed down the page by boxes that are no longer in use. In
 * Guided the engine refuses a choice that does not follow, and the form says why; in Challenge it takes whatever
 * is chosen, with no word on whether it follows.
 */
function ChoiceEntry({ lab: { words }, entry, guided, places, choices = [], enter }: EntryProps) {
  const { field, value, verdict } = entry
  const label = words.fieldLabel(field)
  const text = entryWords(words)
  // An entry that a change to one above it has emptied is asked afresh: a form of its own, with nothing chosen and nothing said of the choice that went.
  const [asked, setAsked] = useState({ made: value !== null, times: 0 })
  if (asked.made !== (value !== null)) setAsked({ made: value !== null, times: asked.times + (value === null ? 1 : 0) })
  const found = verdict === null ? { wrong: [], text: '' } : { wrong: verdict.follows ? [] : [field], text: verdict.follows ? words.verdict.follows : words.feedback(field, verdict) }
  return (
    <div className="grid justify-items-start gap-1.5">
      <ChoiceForm
        key={asked.times}
        questions={[{ id: field, label, choices: choices.map((choice) => ({ value: String(choice.value), label: choice.label })), waits: choices.length === 0 ? words.formatHelp(field) : null }]}
        recorded={typeof value === 'number' ? { [field]: String(value) } : null}
        judged={value === null ? null : found}
        held={null}
        refusal={(answers) => (answers[field] === undefined ? words.blocked('invalid-entry', field) : null)}
        onRecord={(answers) => {
          const refused = enter(field, Number(answers[field]))
          if (refused !== null) return { wrong: [field], text: words.blocked(refused, field) }
          return { wrong: [], text: guided ? words.verdict.follows : '' }
        }}
        text={{ check: text.enter, change: text.change, cancel: text.cancel }}
        brief={(answers) => [`${label}: ${words.value(field, Number(answers[field]), places)}`]}
      />
      {guided && value === null && choices.length > 0 && <Relation words={words} field={field} />}
    </div>
  )
}

/** An entry that takes no typing now: one that is made, as its value in words with whether it follows where that is shown; and one that is still to come, as its name alone. */
function Row({ lab: { words }, entry, places }: Pick<EntryProps, 'lab' | 'entry' | 'places'>) {
  const { field, value, verdict } = entry
  const label = words.fieldLabel(field)
  if (value === null) return <p className="text-muted-foreground">{label}</p>
  return (
    <div className="grid gap-0.5">
      <p>
        <span className="font-medium">{label}</span>: <span className={`whitespace-nowrap tabular-nums ${ROLE.value}`}>{words.value(field, value, places)}</span>
        {verdict && (
          <span className="ml-3 whitespace-nowrap">
            <Mark ok={verdict.follows} />
            {verdict.follows ? words.verdict.follows : words.verdict.not}
          </span>
        )}
      </p>
      {verdict?.follows === false && <p className="max-w-prose">{words.feedback(field, verdict)}</p>}
    </div>
  )
}

/**
 * Some of a sheet's entries, as a numbered list that goes on from the entries before it. One entry at a time waits
 * to be made: those above it are made, a typed one in a disabled field beside "Change" and a chosen one as a line
 * beside "Change"; the one that waits has its field or its choices, how it is written and, in Guided, the relation
 * it uses in a closed disclosure; and those under it are their names alone. Once the sheet is checked, or the lab
 * complete, the list is read and not typed in.
 */
export function Entries({ entries, from, over, mode, ...props }: Omit<EntryProps, 'entry' | 'guided' | 'choices'> & { entries: readonly EntryView[]; from: number; over: boolean; mode: State['mode']; choicesOf?: (field: Field) => readonly { value: number; label: string }[] }) {
  const { choicesOf, ...rest } = props
  const { engine, words } = rest.lab
  return (
    <ol start={from + 1} className="grid w-full list-decimal gap-3 pl-6">
      {entries.map((entry) => {
        const { field, value, blocked } = entry
        return (
          <li key={field}>
            {over || (value === null && blocked !== null) ? (
              <Row {...rest} entry={entry} />
            ) : isChoice(engine, field) ? (
              // A form of its own for each mode: whether a choice follows is said in one and not in the other.
              <ChoiceEntry key={mode} {...rest} entry={entry} guided={mode === 'guided'} choices={choicesOf?.(field) ?? []} />
            ) : (
              <TypedEntry
                label={words.fieldLabel(field)}
                made={value === null || typeof value === 'number' ? '' : words.entryText(value)}
                held={blocked === null ? null : words.blocked(blocked, field)}
                help={words.formatHelp(field)}
                signed={isSigned(engine, field)}
                verdict={entry.verdict && { follows: entry.verdict.follows, feedback: words.feedback(field, entry.verdict) }}
                hint={mode === 'guided' ? <Relation words={words} field={field} /> : undefined}
                text={{ ...entryWords(words), ...words.verdict }}
                onEnter={(text) => {
                  const typed = engine.parseFigures(text)
                  const refused = typed === null ? 'invalid-entry' : rest.enter(field, typed)
                  return refused === null ? null : words.blocked(refused, field)
                }}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

/** An entry of a sheet, made where the engine takes it: what is handed back is why not, or null once it is made. */
export const enterIn =
  ({ engine, m }: KineticsLab, state: State, sheet: SheetId, act: SheetProps['act']) =>
  (field: Field, value: Value): Blocked | null => {
    const action: Action = { type: 'enter', sheet, field, value }
    const blocked = engine.can(m, state, action)
    if (blocked === null) act([action])
    return blocked
  }

/**
 * Under a sheet's entries: that a change empties what is under it, once two are made; and in Challenge the check,
 * which says what is missing until every entry is made. Guided checks a sheet at its last entry and has no check
 * to press, but for one case: a sheet whose every entry was made in Challenge and not checked, with the mode then
 * changed. Nothing waits to be entered there, so the check is offered, and the sheet is not left with no way on.
 */
export function Foot({ lab: { engine, m, words }, state, sheet, entries, over, act }: Omit<SheetProps, 'shown'> & { sheet: SheetId; entries: readonly EntryView[]; over: boolean }) {
  const [said, say] = useSaid()
  const check: Action = { type: 'check', sheet }
  if (over) return null
  return (
    <>
      {entries.filter((entry) => entry.value !== null).length > 1 && <p className="text-muted-foreground">{words.notebook.changeNote}</p>}
      {(state.mode === 'challenge' || engine.can(m, state, check) === null) && (
        <>
          <Control
            unavailable={engine.can(m, state, check) !== null}
            className="min-h-11 px-4"
            onClick={() => {
              const blocked = engine.can(m, state, check)
              if (blocked !== null) return say(words.blocked(blocked), true)
              say('')
              act([check])
            }}
          >
            {words.notebook.check}
          </Control>
          <Line said={said} />
        </>
      )}
    </>
  )
}

/**
 * How a sheet came out, once it is checked, in a card of its own that takes focus when the check is made: the
 * sentence, "Work this notebook again" where it did not count, and, once the part is done and not before, what
 * the result was held to and the record's notes on the part, in a disclosure that is closed.
 */
export function Outcome({ lab: { engine, m, words }, state, part, outcome, expected, act }: Omit<SheetProps, 'shown'> & { part: SheetId; outcome: SheetOutcome; expected: string | null }) {
  const [said, say] = useSaid()
  const ref = useRef<HTMLDivElement>(null)
  const over = outcome.state !== 'open'
  const wasOver = useRef(over)
  useEffect(() => {
    if (over && !wasOver.current) ref.current?.focus()
    wasOver.current = over
  }, [over])
  const again: Action = { type: 'sheetAgain', sheet: part }
  if (!over && expected === null) return null
  return (
    <Step heading={words.notebook.outcome}>
      {over && (
        <div ref={ref} tabIndex={-1} className="-mx-2 -my-1 max-w-prose rounded-md px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <p>
            <Mark ok={outcome.state === 'counts'} />
            {words.sheetOutcome(part, outcome, engine.can(m, state, again) !== 'lab-completed')}
          </p>
        </div>
      )}
      {outcome.state === 'does-not-count' && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <Control
            unavailable={engine.can(m, state, again) !== null}
            className="min-h-11 px-4"
            onClick={() => {
              const blocked = engine.can(m, state, again)
              if (blocked !== null) return say(words.blocked(blocked), true)
              act([again])
            }}
          >
            {words.notebook.sheetAgain}
          </Control>
          <p className="max-w-prose flex-1 basis-48 text-muted-foreground">{words.notebook.sheetAgainHelp}</p>
        </div>
      )}
      <Line said={said} />
      {expected !== null && (
        <Disclosure summary={words.notebook.notes}>
          <div className="grid max-w-[75ch] gap-2 leading-relaxed">
            <p className="font-medium">{expected}</p>
            {words.partNotes(part).map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        </Disclosure>
      )}
    </Step>
  )
}

/** A box of figures the entries under it are worked from, named by what it holds. */
const From = ({ children }: { children: ReactNode }) => <div className="grid w-full max-w-[75ch] gap-1.5 rounded-md border px-3 py-2">{children}</div>
export const made = (entries: readonly EntryView[], field: Field) => entries.find((entry) => entry.field === field)?.value ?? null

/**
 * The notebook on the rate law (spec 19.3, and 20.3), in the order it is worked, with what each stretch of it is
 * worked from standing just over that stretch. First the row of the reference mixture, under that mixture's own
 * table, which the lab hands in: the concentrations and the rate. Then the table the notebook fills for the other
 * runs, there only once the engine says the row has been worked, with the sentence that says the notebook filled
 * it; and under it the orders. Then the rate constant and its unit; and, once both are entered, the rate constants
 * the notebook fills, with their mean.
 */
export function RateLawNotebook({ lab, state, shown, act, mixture }: SheetProps & { mixture: ReactNode }) {
  const { engine, m, words } = lab
  const view = engine.rateLawView(m, state)
  const enter = enterIn(lab, state, 'rate-law', act)
  if (view.blocked === 'runs-missing') return <p className={`max-w-prose text-sm ${ROLE.held}`}>{words.blocked('runs-missing')}</p>
  const over = view.blocked !== null
  const reference = m.referenceRunId
  const reactants = m.reactants.map((reactant) => reactant.id)
  const times = engine.timesTable(m, state)
  const seconds = (runId: string) => ((times.find((timedRow) => timedRow.runId === runId)?.tenths ?? 0) / 10).toFixed(1)
  const kinds = (...wanted: string[]) => view.entries.filter((entry) => wanted.includes(engine.kindOf(entry.field)))
  const [row, orders, constant] = [kinds('concentration', 'rate'), kinds('order'), kinds('rateConstant', 'unit')]
  const list = { lab, places: [], over, mode: state.mode, enter }
  const unit = made(view.entries, 'unit')
  const figure = (value: Value | null) => (value === null || typeof value === 'number' ? '' : words.figures(value))
  const withUnit = (value: Sig3 | Value | null) => (value === null || typeof value === 'number' ? '' : `${words.figures(value)} ${typeof unit === 'number' ? (words.unitLabel[unit] ?? '') : ''}`.trim())
  const yours = `${words.runTitle(reference)} (${words.notebook.yourRow})`
  return (
    <>
      <Step heading={words.notebook.notebook}>
        {/* One calculator on the page: a part that is not the one shown has none. */}
        {shown && <Calculator />}
        <From>
          {mixture}
          {/* The one time the row is worked from, said again here: the table of times is a window up the page by now. */}
          <p className={ROLE.value}>{words.timeRow(times.find((timedRow) => timedRow.runId === reference)!)}</p>
        </From>
        <Entries {...list} entries={row} from={0} />
        {view.rows !== null && (
          <From>
            <p>{words.notebook.filledRows}</p>
            <Table
              wide
              caption={words.sheetTable.rateLawCaption}
              head={[words.sheetTable.run, words.sheetTable.time, ...reactants.map((id) => words.sheetTable.concentration(id)), words.sheetTable.rate]}
              rows={[
                [words.runTitle(reference), seconds(reference), ...reactants.map((id) => figure(made(view.entries, `concentration:${id}`))), figure(made(view.entries, 'rate'))],
                ...view.rows.map((filled) => [words.runTitle(filled.runId), seconds(filled.runId), ...reactants.map((id) => words.figures(filled.strengths[id]!)), words.figures(filled.rate)]),
              ]}
            />
          </From>
        )}
        <Entries {...list} entries={orders} from={row.length} choicesOf={() => words.orderChoices} />
        <Entries {...list} entries={constant} from={row.length + orders.length} choicesOf={() => words.unitChoices} />
        {view.constants !== null && (
          <From>
            <p>{words.notebook.filledConstants}</p>
            <Table
              caption={words.sheetTable.constant}
              head={[words.sheetTable.run, words.sheetTable.constant]}
              rows={[[yours, withUnit(made(view.entries, 'rateConstant'))], ...view.constants.rows.map((filled) => [words.runTitle(filled.runId), withUnit(filled.constant)]), [words.notebook.mean, withUnit(view.constants.mean)]]}
            />
          </From>
        )}
        <Foot lab={lab} state={state} sheet="rate-law" entries={view.entries} over={over} act={act} />
      </Step>
      <Outcome lab={lab} state={state} part="rate-law" outcome={view.outcome} expected={view.expected && words.rateLawExpected(view.expected)} act={act} />
    </>
  )
}
