import { useEffect, useRef, useState, type Ref } from 'react'
import { Disclosure } from '@/app/explore/InspectorCard'
import { Calculator } from '@/app/lab/Calculator'
import { ChoiceForm } from '@/app/lab/ChoiceForm'
import { Control } from '@/app/lab/Control'
import { Line, Mark, useSaid } from '@/app/lab/Line'
import { ROLE } from '@/app/lab/roles'
import { TypedEntry } from '@/app/lab/TypedEntry'
import { candidatesOf, type DensityData, type PartId, type UnknownPartId } from '@/chem-data/density/data'
import { parseEntry, type Action, type Blocked, type DensityModel, type EntryView, type Field, type Value } from '@/engine/density'
import { Page, type PartProps } from './InstrumentPage'
import {
  ENTRY_NOT_A_NUMBER,
  PAGE_TEXT,
  RECORD_TEXT,
  TABLE_CAPTION,
  TABLE_HEADING,
  VERDICT_TEXT,
  blockedText,
  enteredText,
  entryFeedback,
  entryText,
  expectedText,
  fieldLabel,
  figuresText,
  formatHelp,
  nameChoices,
  outcomeText,
  partNotes,
  relationText,
  verdictLabel,
} from './messages'
import { entriesOf } from './pageLook'

interface EntryProps {
  data: DensityData
  m: DensityModel
  part: PartId
  entry: EntryView
  /** Guided: the relation and the rule behind the entry are ready to open, and an entry is checked as it is made. */
  guided: boolean
  /** Makes the entry where the engine takes it, and hands back why not where it does not: null once it is made. */
  enter(field: Field, value: Value): Blocked | null
}

/** The relation an entry uses and the rule it is rounded by, closed until it is opened: Guided's, under an entry that waits to be made. */
const Relation = ({ field }: { field: Field }) => (
  <Disclosure summary={PAGE_TEXT.hint}>
    <p className="max-w-prose">{relationText(field)}</p>
  </Disclosure>
)

/** A worked-out entry: the shell's typed entry, with this lab's words. In Guided one that broke a rounding rule is refused with which rule. */
function WorkedEntry({ data, m, part, entry, guided, enter }: EntryProps) {
  const { field, value, blocked, verdict } = entry
  return (
    <TypedEntry
      label={fieldLabel(field)}
      made={value === null ? '' : entryText(m, data, field, value)}
      held={blocked === null ? null : blockedText(part, blocked, field)}
      help={formatHelp(field)}
      signed={field === 'thermometerOff'}
      verdict={verdict && { follows: verdict.follows, feedback: entryFeedback(field, verdict) }}
      hint={guided ? <Relation field={field} /> : undefined}
      text={{ enter: PAGE_TEXT.enter, change: PAGE_TEXT.change, cancel: PAGE_TEXT.cancel, follows: VERDICT_TEXT.worked.right, not: VERDICT_TEXT.worked.not }}
      onEnter={(typed) => {
        const number = parseEntry(typed)
        if (number === null) return ENTRY_NOT_A_NUMBER
        const refused = enter(field, number)
        return refused === null ? null : blockedText(part, refused, field)
      }}
    />
  )
}

/** The unknown's name, chosen from the rows of its table: the shared form of questions, with this one question. In Guided a row that is not the nearest to the learner's own density is refused; in Challenge whatever is chosen is taken, with no word on it. */
function NameEntry({ data, part, entry, guided, enter }: EntryProps & { part: UnknownPartId }) {
  const { field, value, blocked, verdict } = entry
  // An entry that a change to one above it has emptied is asked afresh: a form of its own, with nothing chosen and nothing said of the choice that went.
  const [asked, setAsked] = useState({ made: value !== null, times: 0 })
  if (asked.made !== (value !== null)) setAsked({ made: value !== null, times: asked.times + (value === null ? 1 : 0) })
  const found = verdict === null ? { wrong: [], text: '' } : { wrong: verdict.follows ? [] : [field], text: verdict.follows ? VERDICT_TEXT.worked.right : entryFeedback(field, verdict) }
  return (
    <div className="grid justify-items-start gap-1.5">
      <ChoiceForm
        key={`${asked.times}:${blocked === null}`}
        questions={[{ id: field, label: fieldLabel(field), choices: nameChoices(data, part), waits: blocked === null ? null : blockedText(part, blocked, field) }]}
        recorded={typeof value === 'string' ? { [field]: value } : null}
        judged={value === null ? null : found}
        held={null}
        refusal={(answers) => (answers[field] === undefined ? formatHelp(field) : null)}
        onRecord={(answers) => {
          const refused = enter(field, answers[field]!)
          if (refused !== null) return { wrong: [field], text: blockedText(part, refused, field) }
          return { wrong: [], text: guided ? VERDICT_TEXT.worked.right : '' }
        }}
        text={{ check: PAGE_TEXT.enter, change: PAGE_TEXT.change, cancel: PAGE_TEXT.cancel }}
      />
      {guided && value === null && blocked === null && <Relation field={field} />}
    </div>
  )
}

/** An entry that takes no typing here: its label and what was entered, with whether it is right where that is shown and, of one that is not, what is said of it. One that is not made is its label alone. */
function Row({ data, m, entry, figures }: { data: DensityData; m: DensityModel; entry: EntryView; figures: boolean }) {
  const { field, value, verdict } = entry
  if (value === null) return <p className="text-muted-foreground">{fieldLabel(field)}</p>
  return (
    <div className="grid gap-0.5">
      <p>
        <span className="font-medium">{fieldLabel(field)}</span>: <span className={`whitespace-nowrap tabular-nums ${ROLE.value}`}>{enteredText(m, data, field, value)}</span>
        {/* Guided's: how many figures the learner's own number has, which the two rounding rules count. */}
        {figures && entry.figures !== null && <span className="ml-3 whitespace-nowrap text-muted-foreground">{figuresText(entry.figures)}</span>}
        {verdict && (
          <span className="ml-3 whitespace-nowrap">
            <Mark ok={verdict.follows} />
            {verdictLabel(field, verdict)}
          </span>
        )}
      </p>
      {verdict?.follows === false && <p className="max-w-prose">{entryFeedback(field, verdict)}</p>}
    </div>
  )
}

/** The table beside an unknown: each row's name with its density, and what the figures are for. */
function Candidates({ data, part }: { data: DensityData; part: UnknownPartId }) {
  return (
    <table className="w-full max-w-sm border-collapse">
      <caption className="mb-1 text-left">
        <span className="font-medium">{TABLE_HEADING[part]}</span>
        <span className="block text-muted-foreground">{TABLE_CAPTION[part]}</span>
      </caption>
      <tbody>
        {candidatesOf(data, part).map((row) => (
          <tr key={row.id}>
            <th scope="row" className="border-b py-1 pr-6 text-left font-normal">
              {row.name}
            </th>
            <td className={`border-b py-1 whitespace-nowrap tabular-nums ${ROLE.value}`}>
              {row.density.value.toPrecision(3)} {row.density.unit}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/**
 * A part's notebook, on a page of its own, with the calculator beside it: the readings as they were typed at
 * their instruments, so that nothing an entry is worked from is further off than the top of the card; then what
 * is worked out, each entry open once the entries it is worked from are made, in any order; for an unknown, the
 * table of what it may be over the choice of its name; in Challenge "Check the notebook"; and, once there is a run
 * to leave behind, how this run came out, with "Run this part again". Once the run is checked, or the lab
 * complete, every entry is read and not typed. `announce` is true when a check has just been made: the outcome
 * then takes focus.
 */
export function NotebookPage({ data, m, part, view, guided, can, act, headingRef, announce, onAnnounced, onRunAgain }: PartProps & { headingRef: Ref<HTMLHeadingElement>; announce: boolean; onAnnounced(): void; onRunAgain(): void }) {
  const [checkSaid, sayOfCheck] = useSaid()
  const [outcomeSaid, sayOfOutcome] = useSaid()
  const outcomeRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!announce) return
    outcomeRef.current?.focus()
    onAnnounced()
  }, [announce, onAnnounced])

  const { notebook, outcome, expected } = view
  const readings = notebook.filter((entry) => entry.kind === 'reading')
  const worked = entriesOf(notebook, 'notebook')
  const numbers = worked.filter((entry) => entry.kind !== 'name')
  const name = worked.find((entry) => entry.kind === 'name')
  const closedBy = notebook[0]!.blocked
  const over = closedBy === 'run-over' || closedBy === 'lab-completed'
  const again: Action = { type: 'runAgain', part }
  const check: Action = { type: 'check', part }
  const enter = (field: Field, value: Value) => {
    const action: Action = { type: 'enter', part, field, value }
    const blocked = can(action)
    if (blocked === null) act(action)
    return blocked
  }
  return (
    <>
      <Page heading={PAGE_TEXT.notebook} headingRef={headingRef}>
        <Calculator />
        <h4 className="font-medium">{PAGE_TEXT.readings}</h4>
        <ul className="grid w-full gap-1.5">
          {readings.map((entry) => (
            <li key={entry.field}>
              <Row data={data} m={m} entry={entry} figures={guided} />
            </li>
          ))}
        </ul>
        <h4 className="font-medium">{PAGE_TEXT.workedOut}</h4>
        <ol className="grid w-full list-decimal gap-4 pl-6">
          {numbers.map((entry) => (
            <li key={entry.field}>{over ? <Row data={data} m={m} entry={entry} figures={false} /> : <WorkedEntry data={data} m={m} part={part} entry={entry} guided={guided} enter={enter} />}</li>
          ))}
        </ol>
        {/* The table an unknown is named from, straight over the choice of its name and under the learner's own density. */}
        {name && part !== 'reading' && (
          <>
            <Candidates data={data} part={part} />
            {/* In line with the entries over it, and with no number: the form's question stands over its choices, where a number would stand beside them. */}
            <div className="w-full pl-6">
              {over ? (
                <Row data={data} m={m} entry={name} figures={false} />
              ) : (
                // A form of its own for each mode: whether a choice follows is said in one and not in the other.
                <NameEntry key={String(guided)} data={data} m={m} part={part} entry={name} guided={guided} enter={enter} />
              )}
            </div>
          </>
        )}
        {!over && worked.some((entry) => entry.value !== null) && <p className="text-muted-foreground">{PAGE_TEXT.changeNote}</p>}
        {!over && !guided && (
          <>
            <Control
              unavailable={can(check) !== null}
              className="min-h-11 px-4"
              onClick={() => {
                const blocked = can(check)
                if (blocked !== null) return sayOfCheck(blockedText(part, blocked), true)
                sayOfCheck('')
                act(check)
              }}
            >
              {PAGE_TEXT.check}
            </Control>
            <Line said={checkSaid} />
          </>
        )}
      </Page>

      {(over || view.done || can(again) === null) && (
        <Page heading={PAGE_TEXT.outcome}>
          {/* Room about the words, taken back from the card's own, so that the ring that shows where focus went does not hug them. */}
          <div ref={outcomeRef} tabIndex={-1} className="-mx-2 -my-1 grid max-w-prose gap-2 rounded-md px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {outcome.state === 'open' ? (
              <p className="text-muted-foreground">{RECORD_TEXT.open}</p>
            ) : (
              <p>
                <Mark ok={outcome.state === 'counts'} />
                {outcomeText(m, part, outcome, can(again) !== 'lab-completed')}
              </p>
            )}
          </div>
          <Control
            unavailable={can(again) !== null}
            className="min-h-11 px-4"
            onClick={() => {
              const blocked = can(again)
              if (blocked !== null) return sayOfOutcome(blockedText(part, blocked), true)
              onRunAgain()
            }}
          >
            {PAGE_TEXT.runAgain}
          </Control>
          <Line said={outcomeSaid} />
          {/* Once a run of the part counts and not before, and closed: what the unknown was, and what the record says of the part. */}
          {expected !== null && (
            // Room over it: open, the disclosure's hit area reaches 24 px over its line, where the button would otherwise be.
            <div className="pt-3">
              <Disclosure summary={PAGE_TEXT.notes}>
                <div className="grid max-w-[75ch] gap-2 leading-relaxed">
                  <p className="font-medium">{expectedText(data, part, expected)}</p>
                  {partNotes(data, part).map((note) => (
                    <p key={note}>{note}</p>
                  ))}
                </div>
              </Disclosure>
            </div>
          )}
        </Page>
      )}
    </>
  )
}
