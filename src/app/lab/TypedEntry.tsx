import { useId, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { entryKey, fieldState, useEntryFocus } from './entry'
import { Field } from './Field'
import { Mark } from './Line'

export interface TypedEntryProps {
  label: string
  /** The entry as it stands in its field once it is made; empty where none is. */
  made: string
  /** Why no entry can be made here now, in words; null where the field is open. */
  held: string | null
  /** How the entry is written, under a field that waits. */
  help: string
  /** The entry may begin with a minus sign, or be written with a power of ten. */
  signed?: boolean
  /** Whether the entry follows, where that is shown, and what is said of one that does not. */
  verdict: { follows: boolean; feedback: string } | null
  /** Under a field that waits: Guided's relation, closed. */
  hint?: ReactNode
  text: { enter: string; change: string; cancel: string; follows: string; not: string }
  /** Makes the entry from what was typed, and hands back why not, in words, where it is not taken: null once it is made. */
  onEnter(typed: string): string | null
}

/**
 * A typed entry of a notebook, in a form of its own: Enter submits it. While it waits it says under its field how
 * it is written, and a refusal takes that line's place. Once made, the field is disabled and shows it, and the
 * button reads "Change". An entry that cannot be made yet says why under its field, and its button stays
 * focusable. The calorimetry lab's worksheet and the clock reaction lab's notebook: the lab hands over its own
 * words and its own reading of what was typed.
 */
export function TypedEntry({ label, made, held, help, signed = false, verdict, hint, text, onEnter }: TypedEntryProps) {
  const [typed, setTyped] = useState('')
  const [changing, setChanging] = useState(false)
  const [error, setError] = useState('')
  const noteId = useId()
  const labelId = useId()
  const { editable, changeable, cancellable } = fieldState(made !== '', held !== null, changing)
  const focus = useEntryFocus(editable)
  const settle = () => {
    setChanging(false)
    setTyped('')
    setError('')
  }
  const cancel = () => {
    // First, while the button that takes focus is the one that stays.
    focus.button.current?.focus()
    settle()
  }
  return (
    <form
      noValidate
      className="grid justify-items-start gap-1.5"
      onKeyDown={(event) => entryKey(event, cancellable ? cancel : null)}
      onSubmit={(event) => {
        event.preventDefault()
        if (held !== null) return
        if (changeable) {
          setTyped(made)
          setError('')
          return setChanging(true)
        }
        const refused = onEnter(typed)
        if (refused === null) settle()
        else setError(refused)
      }}
    >
      <Field label={label} value={editable ? typed : made} onChange={setTyped} noteId={noteId} labelId={labelId} disabled={!editable} held={held} error={error} help={help} tall signed={signed} inputRef={focus.field}>
        {/* Stays focusable when it cannot be used, with the reason as its description. As "Change" it is described by the field it is of, which the Tab key passes over while it is disabled. */}
        <Button ref={focus.button} type="submit" variant="outline" aria-disabled={held !== null || undefined} aria-describedby={held !== null ? noteId : changeable ? labelId : undefined} className="min-h-11 px-4 aria-disabled:opacity-50">
          {changeable ? text.change : text.enter}
        </Button>
        {cancellable && (
          <Button type="button" variant="outline" className="min-h-11 px-4" onClick={cancel}>
            {text.cancel}
          </Button>
        )}
        {/* Always there, and empty until the entry is made and judged, so that a screen reader says it when it comes. */}
        <p role="status" className="self-center">
          {!editable && verdict && (
            <>
              <Mark ok={verdict.follows} />
              {verdict.follows ? text.follows : text.not}
            </>
          )}
        </p>
      </Field>
      {!editable && verdict?.follows === false && <p className="max-w-prose">{verdict.feedback}</p>}
      {editable && hint}
    </form>
  )
}
