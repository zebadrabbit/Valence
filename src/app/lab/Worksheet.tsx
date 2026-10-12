import { useState } from 'react'
import { Disclosure } from '@/app/explore/InspectorCard'
import { ChoiceForm } from './ChoiceForm'
import { Control } from './Control'
import { Line, Mark, useSaid } from './Line'
import { ROLE } from './roles'
import { TypedEntry } from './TypedEntry'

// The notebook of a lab whose entries are worked out one from another: the calorimetry lab's worksheet and the
// freezing point depression lab's notebook. It holds no rule and no word of its own: a lab hands over its entries
// as its engine has them, each with why it cannot be made now already in words, its own reading of what is typed,
// and every sentence.

/** Whether an entry follows, as a lab's engine judges it; a lab's verdict may say more, which its own `feedback` words. */
interface Follows {
  follows: boolean
}

/** One entry as the list draws it. `F` is the lab's fields and `V` what its engine takes for an entry: a choice is entered as the id chosen. */
export interface WorksheetEntry<F extends string, V, J extends Follows> {
  field: F
  /** What is entered; null where nothing is. */
  value: V | null
  /** Why the entry cannot be made now, in words; null where its field is open. */
  held: string | null
  /** Whether it follows, where that is shown; null otherwise. */
  verdict: J | null
}

export interface WorksheetProps<F extends string, V, J extends Follows> {
  /** The entries in the order they are worked out. */
  entries: readonly WorksheetEntry<F, V, J>[]
  /** Guided: the relation an entry uses is ready to open, and an entry is checked as it is made. */
  guided: boolean
  /** While the list is not yet to be drawn, the one sentence that says what opens it; null once it is. */
  closed: string | null
  /** The run is over, or the lab complete: the list is read and not typed in. */
  over: boolean
  label(field: F): string
  /** The fixed answers of an entry that is chosen; null for one that is typed. */
  choices(field: F): readonly { value: string; label: string }[] | null
  /** Whether a typed entry may begin with a minus sign. */
  signed(field: F): boolean
  /** A typed entry as its field shows it, and any entry as it is read beside its label. */
  typedText(field: F, value: V): string
  enteredText(field: F, value: V): string
  /** How an entry is written; the relation it uses; what is said of one that has been judged; and that what was typed or chosen is not written as the entry is. */
  help(field: F): string
  relation(field: F): string
  feedback(field: F, verdict: J): string
  invalid(field: F): string
  /** What was typed, as the engine takes it; null where it is not written as its entry is. */
  parse(field: F, text: string): V | null
  /** Makes the entry where the engine takes it, and hands back why not, in words, where it does not: null once it is made. */
  enter(field: F, value: V): string | null
  /** Why the list cannot be checked now, in words, or null; and the check, which Challenge asks for and Guided makes at the last entry. */
  checkHeld: string | null
  onCheck(): void
  text: { hint: string; check: string; enter: string; change: string; cancel: string; changeNote: string; follows: string; not: string }
}

type EntryProps<F extends string, V, J extends Follows> = Pick<WorksheetProps<F, V, J>, 'guided' | 'choices' | 'signed' | 'typedText' | 'enteredText' | 'help' | 'relation' | 'feedback' | 'invalid' | 'parse' | 'enter' | 'text'> & {
  entry: WorksheetEntry<F, V, J>
  label: string
}

/** The relation an entry uses, closed until it is opened: Guided's, under an entry that waits to be made. */
const Relation = ({ summary, children }: { summary: string; children: string }) => (
  <Disclosure summary={summary}>
    <p className="max-w-prose">{children}</p>
  </Disclosure>
)

/** A typed entry: the shell's (./TypedEntry.tsx), with the lab's words and its reading of what was typed. */
function Typed<F extends string, V, J extends Follows>({ entry, label, guided, signed, typedText, help, relation, feedback, invalid, parse, enter, text }: EntryProps<F, V, J>) {
  const { field, value, held, verdict } = entry
  return (
    <TypedEntry
      label={label}
      made={value === null || typeof value === 'string' ? '' : typedText(field, value)}
      held={held}
      help={help(field)}
      signed={signed(field)}
      verdict={verdict && { follows: verdict.follows, feedback: feedback(field, verdict) }}
      hint={guided ? <Relation summary={text.hint}>{relation(field)}</Relation> : undefined}
      text={{ enter: text.enter, change: text.change, cancel: text.cancel, follows: text.follows, not: text.not }}
      onEnter={(typed) => {
        const read = parse(field, typed)
        return read === null ? invalid(field) : enter(field, read)
      }}
    />
  )
}

/**
 * An entry chosen from fixed answers, as choice boxes: the shared form of questions, with this one question. In
 * Guided the engine refuses a choice that does not follow, and the form says why; in Challenge it takes whatever
 * is chosen and the form shows it, disabled, beside "Change", with no word on whether it follows.
 */
function Chosen<F extends string, V, J extends Follows>({ entry, label, guided, choices, relation, feedback, invalid, enter, text }: EntryProps<F, V, J>) {
  const { field, value, verdict } = entry
  // An entry that a change to one above it has emptied is asked afresh: a form of its own, with nothing chosen and nothing said of the choice that went.
  const [asked, setAsked] = useState({ made: value !== null, times: 0 })
  if (asked.made !== (value !== null)) setAsked({ made: value !== null, times: asked.times + (value === null ? 1 : 0) })
  // A choice that is made and not judged is drawn as one that needs no change: disabled, and with nothing said of it.
  const found = verdict === null ? { wrong: [], text: '' } : { wrong: verdict.follows ? [] : [field], text: verdict.follows ? text.follows : feedback(field, verdict) }
  return (
    <div className="grid justify-items-start gap-1.5">
      <ChoiceForm
        key={asked.times}
        questions={[{ id: field, label, choices: choices(field)!, waits: null }]}
        recorded={typeof value === 'string' ? { [field]: value } : null}
        judged={value === null ? null : found}
        held={null}
        refusal={(answers) => (answers[field] === undefined ? invalid(field) : null)}
        onRecord={(answers) => {
          // A choice is entered as the id chosen, which is one of the values the lab's engine takes.
          const refused = enter(field, answers[field] as V)
          if (refused !== null) return { wrong: [field], text: refused }
          return { wrong: [], text: guided ? text.follows : '' }
        }}
        text={{ check: text.enter, change: text.change, cancel: text.cancel }}
      />
      {guided && value === null && <Relation summary={text.hint}>{relation(field)}</Relation>}
    </div>
  )
}

/** An entry that takes no typing now: one that is made, as its value in words with whether it follows where that is shown; and one that is still to come, as its name alone. */
function Row<F extends string, V, J extends Follows>({ entry, label, enteredText, feedback, text }: Pick<EntryProps<F, V, J>, 'entry' | 'label' | 'enteredText' | 'feedback' | 'text'>) {
  const { field, value, verdict } = entry
  if (value === null) return <p className="text-muted-foreground">{label}</p>
  return (
    <div className="grid gap-0.5">
      <p>
        <span className="font-medium">{label}</span>: <span className={`whitespace-nowrap tabular-nums ${ROLE.value}`}>{enteredText(field, value)}</span>
        {verdict && (
          <span className="ml-3 whitespace-nowrap">
            <Mark ok={verdict.follows} />
            {verdict.follows ? text.follows : text.not}
          </span>
        )}
      </p>
      {verdict?.follows === false && <p className="max-w-prose">{feedback(field, verdict)}</p>}
    </div>
  )
}

/**
 * A notebook, as a numbered list of its entries in the order they are worked out.
 *
 * While it is closed the list is not drawn, and one sentence says what opens it. From then on, one entry at a time
 * waits to be made: the entries above it are made, each in a disabled field or as disabled choice boxes beside
 * "Change"; the one that waits has its field or its choices, how it is written and, in Guided, the relation it
 * uses in a closed disclosure; and those under it are their names alone. An entry that cannot be made yet says why
 * under its field. Changing an entry empties the ones under it, which the list says once two are made. In
 * Challenge the button that checks is under the list, and says what is missing until every entry is made. Once
 * the run is over, or the lab complete, the list is read and not typed in: each entry as its value in words, with
 * whether it follows.
 */
export function Worksheet<F extends string, V, J extends Follows>(props: WorksheetProps<F, V, J>) {
  const { entries, guided, closed, over, label, choices, checkHeld, onCheck, text } = props
  const [said, say] = useSaid()
  if (closed !== null) return <p className={`max-w-prose ${ROLE.held}`}>{closed}</p>
  const waiting = entries.findIndex((entry) => entry.value === null)
  return (
    <>
      <ol className="grid w-full list-decimal gap-3 pl-6">
        {entries.map((entry, at) => {
          const entryProps = { ...props, entry, label: label(entry.field) }
          return (
            <li key={entry.field}>
              {over || (entry.value === null && at !== waiting) ? (
                <Row {...entryProps} />
              ) : choices(entry.field) !== null ? (
                // A form of its own for each mode: whether a choice follows is said in one and not in the other.
                <Chosen key={String(guided)} {...entryProps} />
              ) : (
                <Typed {...entryProps} />
              )}
            </li>
          )
        })}
      </ol>
      {!over && entries.filter((entry) => entry.value !== null).length > 1 && <p className="text-muted-foreground">{text.changeNote}</p>}
      {!over && !guided && (
        <>
          <Control
            unavailable={checkHeld !== null}
            className="min-h-11 px-4"
            onClick={() => {
              if (checkHeld !== null) return say(checkHeld, true)
              say('')
              onCheck()
            }}
          >
            {text.check}
          </Control>
          <Line said={said} />
        </>
      )}
    </>
  )
}
