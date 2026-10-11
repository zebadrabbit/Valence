import { useState } from 'react'
import { Disclosure } from '@/app/explore/InspectorCard'
import { ChoiceForm } from '@/app/lab/ChoiceForm'
import { Control } from '@/app/lab/Control'
import { Line, Mark, useSaid } from '@/app/lab/Line'
import { ROLE } from '@/app/lab/roles'
import { TypedEntry as SharedTypedEntry } from '@/app/lab/TypedEntry'
import type { CalorimetryData, PartId } from '@/chem-data/calorimetry/data'
import { parseChange, parseSig3, parseTemperature, type Blocked, type EntryView, type Field, type GraphView, type Mode, type Value, type Verdict } from '@/engine/calorimetry'
import { BENCH_TEXT, DIRECTION_LABEL, PAGE_TEXT, VERDICT_TEXT, blockedText, enteredText, entryFeedback, entryText, fieldLabel, formatHelp, metalChoices, relationText } from './messages'

/** The entries that are chosen, not typed. */
const isChoice = (field: Field) => field === 'direction' || field === 'metal'
/** The typed entries that may begin with a minus sign. */
const isSigned = (field: Field) => field === 'change' || field === 'perMole'

/** What was typed, as the engine takes it; null where it is not written as its entry is. */
function parse(field: Field, text: string): Value | null {
  if (field === 'start' || field === 'extreme') return parseTemperature(text)
  return field === 'change' ? parseChange(text) : parseSig3(text)
}

/** Whether an entry follows, as a mark and the words. */
const Follows = ({ verdict }: { verdict: Verdict }) => (
  <>
    <Mark ok={verdict.follows} />
    {verdict.follows ? VERDICT_TEXT.follows : VERDICT_TEXT.not}
  </>
)

interface EntryProps {
  data: CalorimetryData
  part: PartId
  entry: EntryView
  label: string
  /** Guided: the relation the entry uses is ready to open, and an entry is checked as it is made. */
  guided: boolean
  /** Makes the entry where the engine takes it, and hands back why not where it does not: null once it is made. */
  enter(field: Field, value: Value): Blocked | null
}

/** The relation an entry uses, closed until it is opened: Guided's, under an entry that waits to be made. */
const Relation = ({ data, part, field }: { data: CalorimetryData; part: PartId; field: Field }) => (
  <Disclosure summary={BENCH_TEXT.hint}>
    <p className="max-w-prose">{relationText(data, part, field)}</p>
  </Disclosure>
)

/** A typed entry: the shell's (../TypedEntry.tsx), with this lab's words and its reading of what was typed. */
function TypedEntry({ data, part, entry, label, guided, enter }: EntryProps) {
  const { field, value, blocked, verdict } = entry
  return (
    <SharedTypedEntry
      label={label}
      made={value === null || typeof value === 'string' ? '' : entryText(value)}
      held={blocked === null ? null : blockedText(part, blocked, field)}
      help={formatHelp(field)}
      signed={isSigned(field)}
      verdict={verdict && { follows: verdict.follows, feedback: entryFeedback(part, field, verdict) }}
      hint={guided ? <Relation data={data} part={part} field={field} /> : undefined}
      text={{ enter: PAGE_TEXT.enter, change: PAGE_TEXT.change, cancel: PAGE_TEXT.cancel, ...VERDICT_TEXT }}
      onEnter={(text) => {
        const typed = parse(field, text)
        const refused = typed === null ? 'invalid-entry' : enter(field, typed)
        return refused === null ? null : blockedText(part, refused, field)
      }}
    />
  )
}

/**
 * An entry chosen from fixed answers, as choice boxes: the shared form of questions, with this one question. In
 * Guided the engine refuses a choice that does not follow, and the form says why; in Challenge it takes whatever
 * is chosen and the form shows it, disabled, beside "Change", with no word on whether it follows.
 */
function ChoiceEntry({ data, part, entry, label, guided, enter }: EntryProps) {
  const { field, value, verdict } = entry
  // An entry that a change to one above it has emptied is asked afresh: a form of its own, with nothing chosen and nothing said of the choice that went.
  const [asked, setAsked] = useState({ made: value !== null, times: 0 })
  if (asked.made !== (value !== null)) setAsked({ made: value !== null, times: asked.times + (value === null ? 1 : 0) })
  const choices = field === 'direction' ? (['out', 'in'] as const).map((direction) => ({ value: direction, label: DIRECTION_LABEL[direction] })) : metalChoices(data)
  // A choice that is made and not judged is drawn as one that needs no change: disabled, and with nothing said of it.
  const found = verdict === null ? { wrong: [], text: '' } : { wrong: verdict.follows ? [] : [field], text: verdict.follows ? VERDICT_TEXT.follows : entryFeedback(part, field, verdict) }
  return (
    <div className="grid justify-items-start gap-1.5">
      <ChoiceForm
        key={asked.times}
        questions={[{ id: field, label, choices, waits: null }]}
        recorded={typeof value === 'string' ? { [field]: value } : null}
        judged={value === null ? null : found}
        held={null}
        refusal={(answers) => (answers[field] === undefined ? blockedText(part, 'invalid-entry', field) : null)}
        onRecord={(answers) => {
          const refused = enter(field, answers[field]!)
          if (refused !== null) return { wrong: [field], text: blockedText(part, refused, field) }
          return { wrong: [], text: guided ? VERDICT_TEXT.follows : '' }
        }}
        text={{ check: PAGE_TEXT.enter, change: PAGE_TEXT.change, cancel: PAGE_TEXT.cancel }}
      />
      {guided && value === null && <Relation data={data} part={part} field={field} />}
    </div>
  )
}

/** An entry that takes no typing now: one that is made, as its value in words with whether it follows where that is shown; and one that is still to come, as its name alone. */
function Row({ data, part, entry, label }: Pick<EntryProps, 'data' | 'part' | 'entry' | 'label'>) {
  const { field, value, verdict } = entry
  if (value === null) return <p className="text-muted-foreground">{label}</p>
  return (
    <div className="grid gap-0.5">
      <p>
        <span className="font-medium">{label}</span>: <span className={`whitespace-nowrap tabular-nums ${ROLE.value}`}>{enteredText(data, field, value)}</span>
        {verdict && (
          <span className="ml-3 whitespace-nowrap">
            <Follows verdict={verdict} />
          </span>
        )}
      </p>
      {verdict?.follows === false && <p className="max-w-prose">{entryFeedback(part, field, verdict)}</p>}
    </div>
  )
}

export interface WorksheetProps {
  data: CalorimetryData
  part: PartId
  mode: Mode
  /** The worksheet's entries in the order they are worked out, each as the engine has it. */
  entries: readonly EntryView[]
  /** What the graph has shown, which settles whether the second entry is the highest temperature or the lowest. */
  graph: GraphView
  enter(field: Field, value: Value): Blocked | null
  /** Why the worksheet cannot be checked now, or null; and the check, which Challenge asks for and Guided makes at the last entry. */
  checkBlocked: Blocked | null
  onCheck(): void
}

/**
 * A part's worksheet, as a numbered list of its entries in the order they are worked out.
 *
 * Until the curve has turned back the list is not drawn, and one sentence says what opens it. From then on, one
 * entry at a time waits to be made: the entries above it are made, each in a disabled field or as disabled choice
 * boxes beside "Change"; the one that waits has its field or its choices, how it is written and, in Guided, the
 * relation it uses in a closed disclosure; and those under it are their names alone. The first two wait for a look
 * at the graph, and say so. Changing an entry empties the ones under it, which the list says once two are made.
 * In Challenge "Check the worksheet" is under the list, and says what is missing until every entry is made. Once
 * the run is over, or the lab complete, the list is read and not typed in: each entry as its value in words, with
 * whether it follows.
 */
export function Worksheet({ data, part, mode, entries, graph, enter, checkBlocked, onCheck }: WorksheetProps) {
  const [said, say] = useSaid()
  const closedBy = entries[0]!.blocked
  // Where the logger is full and the curve has not turned, there is no running on to wait for.
  if (closedBy === 'change-not-started' || closedBy === 'not-turned') return <p className={`max-w-prose ${ROLE.held}`}>{graph.full ? BENCH_TEXT.spent : blockedText(part, closedBy)}</p>
  const over = closedBy === 'run-over' || closedBy === 'lab-completed'
  const waiting = entries.findIndex((entry) => entry.value === null)
  const guided = mode === 'guided'
  return (
    <>
      <ol className="grid w-full list-decimal gap-3 pl-6">
        {entries.map((entry, at) => {
          const props = { data, part, entry, label: fieldLabel(part, entry.field, graph) }
          return (
            <li key={entry.field}>
              {over || (entry.value === null && at !== waiting) ? (
                <Row {...props} />
              ) : isChoice(entry.field) ? (
                // A form of its own for each mode: whether a choice follows is said in one and not in the other.
                <ChoiceEntry key={mode} {...props} guided={guided} enter={enter} />
              ) : (
                <TypedEntry {...props} guided={guided} enter={enter} />
              )}
            </li>
          )
        })}
      </ol>
      {!over && entries.filter((entry) => entry.value !== null).length > 1 && <p className="text-muted-foreground">{PAGE_TEXT.changeNote}</p>}
      {!over && !guided && (
        <>
          <Control
            unavailable={checkBlocked !== null}
            className="min-h-11 px-4"
            onClick={() => {
              if (checkBlocked !== null) return say(blockedText(part, checkBlocked), true)
              say('')
              onCheck()
            }}
          >
            {BENCH_TEXT.check}
          </Control>
          <Line said={said} />
        </>
      )}
    </>
  )
}
