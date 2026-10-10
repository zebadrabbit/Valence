import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { entryKey, fieldState, useEntryFocus } from './entry'
import { Line, Mark, useSaid } from './Line'
import { ROLE } from './roles'

export interface ChoiceQuestion {
  id: string
  label: string
  choices: readonly { value: string; label: string }[]
  /** Why the question cannot be answered yet, in words: it is then disabled, with this under it. Null where it can. */
  waits: string | null
}

/** One answer for each question answered, by the question's id. */
export type Answers = Readonly<Record<string, string>>

/**
 * What a check found: the sentence to say, and the questions whose answers are not right, none where all are.
 * `wrong` is null where the answers were not judged at all (the flame test lab's observation with a loop that was
 * not clean): the sentence is then the reason, drawn as one, with no tick and no cross.
 */
export interface Judged {
  wrong: readonly string[] | null
  text: string
}

export interface ChoiceFormProps {
  questions: readonly ChoiceQuestion[]
  /** The answers last recorded and what was found of them, as the form is first drawn; null where there are none. */
  recorded: Answers | null
  judged: Judged | null
  /** Where nothing can be recorded here now whatever is chosen, the id of the sentence on the page that says why; else null. */
  held: string | null
  /** Why these answers cannot be recorded as they stand, in words, or null. */
  refusal(answers: Answers): string | null
  /** Records them, and hands back what was found. Called only with answers that can be recorded. */
  onRecord(answers: Answers): Judged
  /** The button that checks, the two of a change under way, and the words beside a question whose recorded answer is not right, where the form marks one. */
  text: { check: string; change: string; cancel: string; again?: string }
}

const CHOICE =
  'flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 py-1 has-checked:border-foreground has-checked:bg-muted has-checked:font-medium has-disabled:cursor-default has-focus-visible:ring-2 has-focus-visible:ring-ring'

/**
 * Questions answered from fixed choices: each a group of radio buttons, and one button that records and checks
 * them all. A question that cannot be answered yet is disabled, with what to do first under it. Once the answers
 * are right the questions are disabled and show them, and the button reads "Change", as an entry made in the
 * titration lab does. The aqueous reactions lab's observations, the flame test lab's, and its closing question.
 */
export function ChoiceForm({ questions, recorded, judged: found, held, refusal, onRecord, text }: ChoiceFormProps) {
  const [draft, setDraft] = useState<Answers>(recorded ?? {})
  const [changing, setChanging] = useState(false)
  const [said, say] = useSaid(found?.text ?? '', found?.wrong === null)
  // What the line says is of the answers as recorded: null once an answer has been changed since, and where they were not judged.
  const [judged, setJudged] = useState<boolean | null>(found?.wrong ? found.wrong.length === 0 : null)
  const name = useId()
  const correct = found?.wrong?.length === 0
  const { editable, changeable, cancellable } = fieldState(correct, held !== null, changing)
  const focus = useEntryFocus(editable)
  const shown = editable ? draft : (recorded ?? {})
  const reason = held !== null || !editable ? null : refusal(draft)

  const cancel = () => {
    focus.button.current?.focus()
    setChanging(false)
    setDraft(recorded ?? {})
    setJudged(true)
    say(found?.text ?? '')
  }
  return (
    <form
      noValidate
      className="grid justify-items-start gap-3"
      onKeyDown={(event) => entryKey(event, cancellable ? cancel : null)}
      onSubmit={(event) => {
        event.preventDefault()
        if (changeable) {
          setDraft(recorded!)
          return setChanging(true)
        }
        // What holds the whole form is said on the page, and is the button's description.
        if (held !== null) return
        if (reason !== null) return say(reason, true)
        const next = onRecord(draft)
        setChanging(false)
        setJudged(next.wrong ? next.wrong.length === 0 : null)
        say(next.text, next.wrong === null)
      }}
    >
      {questions.map(({ id, label, choices, waits }, at) => {
        const waiting = waits !== null
        const again = text.again !== undefined && editable && judged === false && found?.wrong?.includes(id) && draft[id] === recorded?.[id]
        return (
          <fieldset key={id} disabled={!editable || waiting} aria-describedby={again ? `${name}${id}again` : undefined} className="grid w-full gap-1.5">
            <legend className={`mb-1.5 font-medium ${editable && !waiting ? ROLE.entry : ''}`}>{label}</legend>
            {/* Beside the question and not in its name, which stays the question. */}
            {again && (
              <p id={`${name}${id}again`} className={ROLE.failed}>
                <span aria-hidden="true">✕ </span>
                {text.again}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {choices.map(({ value, label: choice }, i) => (
                <label key={value} className={CHOICE}>
                  <input
                    ref={at === 0 && (shown[id] === undefined ? i === 0 : shown[id] === value) ? focus.field : undefined}
                    type="radio"
                    name={`${name}${id}`}
                    value={value}
                    checked={shown[id] === value}
                    onChange={() => {
                      setDraft({ ...draft, [id]: value })
                      setJudged(null)
                      say('')
                    }}
                  />
                  {choice}
                </label>
              ))}
            </div>
            {waiting && held === null && <p className={ROLE.held}>{waits}</p>}
          </fieldset>
        )
      })}
      <div className="flex flex-wrap gap-1.5">
        {/* Stays focusable when it cannot be used, and says why when pressed. */}
        <Button ref={focus.button} type="submit" variant="outline" aria-disabled={held !== null || (!changeable && reason !== null) || undefined} aria-describedby={held ?? undefined} className="min-h-11 aria-disabled:opacity-50">
          {changeable ? text.change : text.check}
        </Button>
        {cancellable && (
          <Button type="button" variant="outline" className="min-h-11" onClick={cancel}>
            {text.cancel}
          </Button>
        )}
      </div>
      <Line said={said} mark={judged === null || said.held ? undefined : <Mark ok={judged} />} />
    </form>
  )
}
