import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Disclosure } from '@/app/explore/InspectorCard'
import { Calculator } from '@/app/lab/Calculator'
import { ChoiceForm } from '@/app/lab/ChoiceForm'
import { Control } from '@/app/lab/Control'
import { Line, Mark, useSaid } from '@/app/lab/Line'
import { ROLE } from '@/app/lab/roles'
import { Step } from '@/app/lab/stationPieces'
import { TypedEntry } from '@/app/lab/TypedEntry'
import type { ClockData, PartId, RunId } from '@/chem-data/clock/data'
import { can, kindOf, parseFigures, rateLawView, temperatureView, timesTable, type Action, type Blocked, type ClockModel, type ClockState, type EntryView, type Field, type Place, type SheetId, type SheetOutcome, type Sig3, type Value } from '@/engine/clock'
import { ClockGraph } from './ClockGraph'
import {
  GRAPH_TEXT,
  NOTEBOOK_TEXT,
  SHEET_TABLE_TEXT,
  UNIT_LABEL,
  VERDICT_TEXT,
  blockedText,
  describeGraph,
  entryFeedback,
  entryText,
  fieldLabel,
  figuresText,
  formatHelp,
  inverseText,
  kelvinText,
  logText,
  orderChoices,
  partNotes,
  placeCallout,
  placeChoices,
  rateLawExpectedText,
  relationText,
  runTitle,
  sheetOutcomeText,
  temperatureExpectedText,
  temperatureText,
  timeRowText,
  unitChoices,
  valueText,
} from './messages'
import { MixtureTable, Table } from './tables'

/** The typed entries that are written with a minus sign or a power of ten, and so ask for a keyboard that has both. */
const isSigned = (field: Field) => kindOf(field) === 'rate' || kindOf(field) === 'slope'
const isChoice = (field: Field) => ['order', 'unit', 'first', 'second'].includes(kindOf(field))
const ENTRY_TEXT = { enter: NOTEBOOK_TEXT.enter, change: NOTEBOOK_TEXT.change, cancel: NOTEBOOK_TEXT.cancel }

interface SheetProps {
  data: ClockData
  m: ClockModel
  state: ClockState
  /** False while another part is the one shown: this one stays drawn, hidden, and keeps what was typed in it. */
  shown: boolean
  act(actions: readonly Action[]): void
}

interface EntryProps {
  data: ClockData
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
const Relation = ({ data, field }: { data: ClockData; field: Field }) => (
  <Disclosure summary={NOTEBOOK_TEXT.hint}>
    <p className="max-w-prose">{relationText(data, field)}</p>
  </Disclosure>
)

/**
 * An entry chosen from fixed answers, as choice boxes in the shared form. Once made it folds to a line beside
 * "Change", so that the entries under it are not pushed down the page by boxes that are no longer in use. In
 * Guided the engine refuses a choice that does not follow, and the form says why; in Challenge it takes whatever
 * is chosen, with no word on whether it follows.
 */
function ChoiceEntry({ data, entry, guided, places, choices = [], enter }: EntryProps) {
  const { field, value, verdict } = entry
  const label = fieldLabel(data, field)
  // An entry that a change to one above it has emptied is asked afresh: a form of its own, with nothing chosen and nothing said of the choice that went.
  const [asked, setAsked] = useState({ made: value !== null, times: 0 })
  if (asked.made !== (value !== null)) setAsked({ made: value !== null, times: asked.times + (value === null ? 1 : 0) })
  const found = verdict === null ? { wrong: [], text: '' } : { wrong: verdict.follows ? [] : [field], text: verdict.follows ? VERDICT_TEXT.follows : entryFeedback(field, verdict) }
  return (
    <div className="grid justify-items-start gap-1.5">
      <ChoiceForm
        key={asked.times}
        questions={[{ id: field, label, choices: choices.map((choice) => ({ value: String(choice.value), label: choice.label })), waits: choices.length === 0 ? formatHelp(field) : null }]}
        recorded={typeof value === 'number' ? { [field]: String(value) } : null}
        judged={value === null ? null : found}
        held={null}
        refusal={(answers) => (answers[field] === undefined ? blockedText(data, 'invalid-entry', field) : null)}
        onRecord={(answers) => {
          const refused = enter(field, Number(answers[field]))
          if (refused !== null) return { wrong: [field], text: blockedText(data, refused, field) }
          return { wrong: [], text: guided ? VERDICT_TEXT.follows : '' }
        }}
        text={{ check: ENTRY_TEXT.enter, change: ENTRY_TEXT.change, cancel: ENTRY_TEXT.cancel }}
        brief={(answers) => [`${label}: ${valueText(field, Number(answers[field]), places)}`]}
      />
      {guided && value === null && choices.length > 0 && <Relation data={data} field={field} />}
    </div>
  )
}

/** An entry that takes no typing now: one that is made, as its value in words with whether it follows where that is shown; and one that is still to come, as its name alone. */
function Row({ data, entry, places }: Pick<EntryProps, 'data' | 'entry' | 'places'>) {
  const { field, value, verdict } = entry
  const label = fieldLabel(data, field)
  if (value === null) return <p className="text-muted-foreground">{label}</p>
  return (
    <div className="grid gap-0.5">
      <p>
        <span className="font-medium">{label}</span>: <span className={`whitespace-nowrap tabular-nums ${ROLE.value}`}>{valueText(field, value, places)}</span>
        {verdict && (
          <span className="ml-3 whitespace-nowrap">
            <Mark ok={verdict.follows} />
            {verdict.follows ? VERDICT_TEXT.follows : VERDICT_TEXT.not}
          </span>
        )}
      </p>
      {verdict?.follows === false && <p className="max-w-prose">{entryFeedback(field, verdict)}</p>}
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
function Entries({ entries, from, over, mode, ...props }: Omit<EntryProps, 'entry' | 'guided' | 'choices'> & { entries: readonly EntryView[]; from: number; over: boolean; mode: ClockState['mode']; choicesOf?: (field: Field) => readonly { value: number; label: string }[] }) {
  const { choicesOf, ...rest } = props
  return (
    <ol start={from + 1} className="grid w-full list-decimal gap-3 pl-6">
      {entries.map((entry) => {
        const { field, value, blocked } = entry
        return (
          <li key={field}>
            {over || (value === null && blocked !== null) ? (
              <Row {...rest} entry={entry} />
            ) : isChoice(field) ? (
              // A form of its own for each mode: whether a choice follows is said in one and not in the other.
              <ChoiceEntry key={mode} {...rest} entry={entry} guided={mode === 'guided'} choices={choicesOf?.(field) ?? []} />
            ) : (
              <TypedEntry
                label={fieldLabel(rest.data, field)}
                made={value === null || typeof value === 'number' ? '' : entryText(value)}
                held={blocked === null ? null : blockedText(rest.data, blocked, field)}
                help={formatHelp(field)}
                signed={isSigned(field)}
                verdict={entry.verdict && { follows: entry.verdict.follows, feedback: entryFeedback(field, entry.verdict) }}
                hint={mode === 'guided' ? <Relation data={rest.data} field={field} /> : undefined}
                text={{ ...ENTRY_TEXT, ...VERDICT_TEXT }}
                onEnter={(text) => {
                  const typed = parseFigures(text)
                  const refused = typed === null ? 'invalid-entry' : rest.enter(field, typed)
                  return refused === null ? null : blockedText(rest.data, refused, field)
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
const enterIn =
  (m: ClockModel, state: ClockState, sheet: SheetId, act: SheetProps['act']) =>
  (field: Field, value: Value): Blocked | null => {
    const action: Action = { type: 'enter', sheet, field, value }
    const blocked = can(m, state, action)
    if (blocked === null) act([action])
    return blocked
  }

/** Under a sheet's entries: that a change empties what is under it, once two are made; and in Challenge the check, which says what is missing until every entry is made. */
function Foot({ data, m, state, sheet, entries, over, act }: Omit<SheetProps, 'shown'> & { sheet: SheetId; entries: readonly EntryView[]; over: boolean }) {
  const [said, say] = useSaid()
  const check: Action = { type: 'check', sheet }
  if (over) return null
  return (
    <>
      {entries.filter((entry) => entry.value !== null).length > 1 && <p className="text-muted-foreground">{NOTEBOOK_TEXT.changeNote}</p>}
      {state.mode === 'challenge' && (
        <>
          <Control
            unavailable={can(m, state, check) !== null}
            className="min-h-11 px-4"
            onClick={() => {
              const blocked = can(m, state, check)
              if (blocked !== null) return say(blockedText(data, blocked), true)
              say('')
              act([check])
            }}
          >
            {NOTEBOOK_TEXT.check}
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
function Outcome({ data, m, state, part, outcome, expected, act }: Omit<SheetProps, 'shown'> & { part: Exclude<PartId, 'runs'>; outcome: SheetOutcome; expected: string | null }) {
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
    <Step heading={NOTEBOOK_TEXT.outcome}>
      {over && (
        <div ref={ref} tabIndex={-1} className="-mx-2 -my-1 max-w-prose rounded-md px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <p>
            <Mark ok={outcome.state === 'counts'} />
            {sheetOutcomeText(m, part, outcome, can(m, state, again) !== 'lab-completed')}
          </p>
        </div>
      )}
      {outcome.state === 'does-not-count' && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <Control
            unavailable={can(m, state, again) !== null}
            className="min-h-11 px-4"
            onClick={() => {
              const blocked = can(m, state, again)
              if (blocked !== null) return say(blockedText(data, blocked), true)
              act([again])
            }}
          >
            {NOTEBOOK_TEXT.sheetAgain}
          </Control>
          <p className="max-w-prose flex-1 basis-48 text-muted-foreground">{NOTEBOOK_TEXT.sheetAgainHelp}</p>
        </div>
      )}
      <Line said={said} />
      {expected !== null && (
        <Disclosure summary={NOTEBOOK_TEXT.notes}>
          <div className="grid max-w-[75ch] gap-2 leading-relaxed">
            <p className="font-medium">{expected}</p>
            {partNotes(data, part).map((note) => (
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
const made = (entries: readonly EntryView[], field: Field) => entries.find((entry) => entry.field === field)?.value ?? null
const figure = (value: Value | null) => (value === null || typeof value === 'number' ? '' : figuresText(value))

/**
 * Part 2's notebook (spec 19.3), in the order it is worked, with what each stretch of it is worked from standing
 * just over that stretch. First the row of the reference mixture, under that mixture's own table: the three
 * concentrations and the rate. Then the table the notebook fills for the other runs, there only once the engine
 * says the row has been worked, with the sentence that says the notebook filled it; and under it the three orders.
 * Then the rate constant and its unit; and, once both are entered, the rate constants the notebook fills, with
 * their mean.
 */
export function RateLawNotebook({ data, m, state, shown, act }: SheetProps) {
  const view = rateLawView(m, state)
  const enter = enterIn(m, state, 'rate-law', act)
  if (view.blocked === 'runs-missing') return <p className={`max-w-prose text-sm ${ROLE.held}`}>{blockedText(data, 'runs-missing')}</p>
  const over = view.blocked !== null
  const reference = data.referenceMixtureId
  const times = timesTable(m, state)
  const seconds = (runId: string) => ((times.find((timedRow) => timedRow.runId === runId)?.tenths ?? 0) / 10).toFixed(1)
  const kinds = (...wanted: string[]) => view.entries.filter((entry) => wanted.includes(kindOf(entry.field)))
  const [row, orders, constant] = [kinds('concentration', 'rate'), kinds('order'), kinds('rateConstant', 'unit')]
  const list = { data, places: [], over, mode: state.mode, enter }
  const unit = made(view.entries, 'unit')
  const withUnit = (value: Sig3 | Value | null) => (value === null || typeof value === 'number' ? '' : `${figuresText(value)} ${typeof unit === 'number' ? (UNIT_LABEL[unit] ?? '') : ''}`.trim())
  const yours = `${runTitle(data, reference)} (${NOTEBOOK_TEXT.yourRow})`
  return (
    <>
      <Step heading={NOTEBOOK_TEXT.notebook}>
        {/* One calculator on the page: a part that is not the one shown has none. */}
        {shown && <Calculator />}
        <From>
          <MixtureTable data={data} run={reference} />
          {/* The one time the row is worked from, said again here: the table of times is a window up the page by now. */}
          <p className={ROLE.value}>{timeRowText(data, times.find((timedRow) => timedRow.runId === reference)!)}</p>
        </From>
        <Entries {...list} entries={row} from={0} />
        {view.rows !== null && (
          <From>
            <p>{NOTEBOOK_TEXT.filledRows}</p>
            <Table
              wide
              caption={SHEET_TABLE_TEXT.rateLawCaption}
              head={[SHEET_TABLE_TEXT.run, SHEET_TABLE_TEXT.time, ...data.rateLaw.reactants.map((reactant) => SHEET_TABLE_TEXT.concentration(data, reactant.id)), SHEET_TABLE_TEXT.rate]}
              rows={[
                [runTitle(data, reference), seconds(reference), ...data.rateLaw.reactants.map((reactant) => figure(made(view.entries, `concentration:${reactant.id}`))), figure(made(view.entries, 'rate'))],
                ...view.rows.map((filled) => [runTitle(data, filled.runId as RunId), seconds(filled.runId), ...data.rateLaw.reactants.map((reactant) => figuresText(filled.strengths[reactant.id]!)), figuresText(filled.rate)]),
              ]}
            />
          </From>
        )}
        <Entries {...list} entries={orders} from={row.length} choicesOf={() => orderChoices(m)} />
        <Entries {...list} entries={constant} from={row.length + orders.length} choicesOf={() => unitChoices(m)} />
        {view.constants !== null && (
          <From>
            <p>{NOTEBOOK_TEXT.filledConstants}</p>
            <Table
              caption={SHEET_TABLE_TEXT.constant}
              head={[SHEET_TABLE_TEXT.run, SHEET_TABLE_TEXT.constant]}
              rows={[[yours, withUnit(made(view.entries, 'rateConstant'))], ...view.constants.rows.map((filled) => [runTitle(data, filled.runId as RunId), withUnit(filled.constant)]), [NOTEBOOK_TEXT.mean, withUnit(view.constants.mean)]]}
            />
          </From>
        )}
        <Foot data={data} m={m} state={state} sheet="rate-law" entries={view.entries} over={over} act={act} />
      </Step>
      <Outcome data={data} m={m} state={state} part="rate-law" outcome={view.outcome} expected={view.expected && rateLawExpectedText(data, view.expected)} act={act} />
    </>
  )
}

/**
 * Part 3's notebook (spec 19.3). The graph's card holds the table the notebook fills, which the page says it
 * filled, and under it the graph, to be explored, with its description in words behind a disclosure that is
 * closed; the notebook's card, right under the picture, holds the four entries: the two places, each chosen among
 * the places that have been looked at, the slope and the activation energy.
 */
export function TemperatureNotebook({ data, m, state, shown, act }: SheetProps) {
  const view = temperatureView(m, state)
  const enter = enterIn(m, state, 'temperature', act)
  const seenId = useId()
  const [lookSaid, sayOfLook] = useSaid()
  if (view.rows === null || view.graph === null) return <p className={`max-w-prose text-sm ${ROLE.held}`}>{blockedText(data, view.blocked === 'rate-law-first' ? 'rate-law-first' : 'runs-missing')}</p>
  const { graph } = view
  const over = view.blocked !== null
  const first = made(view.entries, 'first')
  /** A place is looked at: stored the first time, where the engine takes it, and said each time. A sheet that is over stores nothing and can still be looked at. */
  const look = (place: number) => {
    const action: Action = { type: 'look', place }
    if (!graph.places[place]!.looked && can(m, state, action) === null) act([action])
    sayOfLook(placeCallout(graph.places[place]!))
  }
  return (
    <>
      {/* What the place looked at shows, for a screen reader: the eye has the callout on the graph. */}
      <div className="sr-only">
        <Line said={lookSaid} />
      </div>
      <Step heading={GRAPH_TEXT.graph}>
        <p className="max-w-prose">{NOTEBOOK_TEXT.filledTemperatures}</p>
        <Table
          wide
          caption={SHEET_TABLE_TEXT.temperatureCaption}
          head={[SHEET_TABLE_TEXT.run, SHEET_TABLE_TEXT.celsius, SHEET_TABLE_TEXT.kelvin, SHEET_TABLE_TEXT.inverse, SHEET_TABLE_TEXT.constant, SHEET_TABLE_TEXT.log]}
          rows={view.rows.map((row) => [runTitle(data, row.runId as RunId), temperatureText(row.tenths), kelvinText(row.centiKelvin), inverseText(row.xMicro), figuresText(row.constant), logText(row.yMilli)])}
        />
        <div id={seenId} className="grid max-w-prose gap-1">
          <p>{GRAPH_TEXT.explore}</p>
          <p className="text-muted-foreground">{GRAPH_TEXT.arrows}</p>
        </div>
        <ClockGraph graph={graph} describedBy={seenId} onLook={look} />
        {/* Closed: it gives the two ends of the line outright, which the learner is to read off the graph. */}
        <Disclosure summary={GRAPH_TEXT.inWords}>
          <p className="max-w-prose">{describeGraph(data, view)}</p>
        </Disclosure>
      </Step>
      <Step heading={NOTEBOOK_TEXT.notebook}>
        {shown && <Calculator />}
        <Entries
          data={data}
          places={graph.places}
          over={over}
          mode={state.mode}
          enter={enter}
          entries={view.entries}
          from={0}
          // The second place is chosen among the others: the first is not offered twice.
          choicesOf={(field) => placeChoices(graph).filter((choice) => kindOf(field) === 'first' || choice.value !== first)}
        />
        <Foot data={data} m={m} state={state} sheet="temperature" entries={view.entries} over={over} act={act} />
      </Step>
      <Outcome data={data} m={m} state={state} part="temperature" outcome={view.outcome} expected={view.expected && temperatureExpectedText(view.expected)} act={act} />
    </>
  )
}
