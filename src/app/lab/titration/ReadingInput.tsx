import { useId, useState } from 'react'
import { ROLE } from '@/app/lab/roles'
import { Button } from '@/components/ui/button'
import { parseReading } from '@/engine/titration'
import { ENTRY_INPUT, fieldState, useEntryFocus } from './entry'
import { readingText } from './format'
import { invalidReadingText, NOTEBOOK_TEXT } from './messages'

/**
 * accepted: the reading was recorded. Not accepted, with a text: refused, and the text says why.
 * Not accepted, with an empty text: held for a Guided warning; the field keeps its value.
 */
export interface ReadingReply {
  accepted: boolean
  text: string
}

export interface ReadingInputProps {
  wanted: 'initial' | 'final'
  /** That reading as the learner typed it, once it is recorded; null until then. */
  recorded?: number | null
  /** Why no reading can be recorded now, for the first time or again; null when one can. */
  blockedText: string | null
  /** Changes when a reading is recorded by a way that does not pass through this field's own reply: after a Guided warning. */
  settled?: number
  onReading(readingUl: number): ReadingReply
}

/**
 * What a press of Record does with the text in the field. A text that is not a reading written to two decimal
 * places is refused here and nothing is sent; `invalid` is for that alone, never for a misread. Pure, exported
 * for its test.
 */
export function recordReading(text: string, onReading: ReadingInputProps['onReading']): ReadingReply & { invalid: boolean } {
  const readingUl = parseReading(text)
  if (readingUl === null) return { accepted: false, text: invalidReadingText(text), invalid: true }
  return { ...onReading(readingUl), invalid: false }
}

/** What the field last said of an entry, with the reading it answered and whether the text typed was no reading at all. */
interface Reply {
  wanted: ReadingInputProps['wanted']
  text: string
  invalid: boolean
}

/**
 * The reply that is shown under the field: the last one, while it is of the reading still wanted and the field
 * takes a reading. Under a field that takes none, a trial that is over among them, nothing is said of an earlier
 * entry and nothing is marked invalid: its one reason is there. Pure, exported for its test.
 */
export const replyUnder = (reply: Reply, wanted: Reply['wanted'], blocked: boolean): Reply | null => (!blocked && reply.wanted === wanted ? reply : null)

/**
 * The one place a burette reading is typed: a text field, so that the characters typed are the ones parsed, and
 * Record. Enter records. Once the reading is recorded the field is disabled and shows it, and the button reads
 * "Change" for as long as the engine would take the reading again; where it would not, the field has the reason
 * under it and nothing else.
 */
export function ReadingInput({ wanted, recorded = null, blockedText, settled = 0, onReading }: ReadingInputProps) {
  const [text, setText] = useState('')
  const [changing, setChanging] = useState(false)
  const [settledSeen, setSettledSeen] = useState(settled)
  const [reply, setReply] = useState<Reply>({ wanted, text: '', invalid: false })
  const inputId = useId()
  const labelId = useId()
  const replyId = useId()
  const blockedId = useId()
  const blocked = blockedText !== null
  const { editable, changeable, cancellable } = fieldState(recorded !== null, blocked, changing)
  const { field, button } = useEntryFocus(editable)
  const shown = replyUnder(reply, wanted, blocked)
  const settle = () => {
    setChanging(false)
    setText('')
  }
  if (settled !== settledSeen) {
    setSettledSeen(settled)
    settle()
  }

  return (
    <form
      noValidate
      className="grid gap-1.5 text-sm"
      onSubmit={(event) => {
        event.preventDefault()
        if (blocked) return
        if (changeable) {
          setText(readingText(recorded!))
          return setChanging(true)
        }
        const { accepted, ...said } = recordReading(text, onReading)
        if (accepted) settle()
        setReply({ wanted, ...said })
      }}
    >
      <label id={labelId} htmlFor={inputId} className={editable ? `font-medium ${ROLE.entry}` : 'font-medium'}>
        {wanted === 'initial' ? 'Initial' : 'Final'} burette reading (mL)
      </label>
      <div className="flex flex-wrap gap-1.5">
        <input
          ref={field}
          id={inputId}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={editable ? text : recorded === null ? '' : readingText(recorded)}
          disabled={!editable}
          aria-invalid={(editable && shown?.invalid) || undefined}
          aria-describedby={blocked ? blockedId : replyId}
          onChange={(event) => setText(event.target.value)}
          className={ENTRY_INPUT}
        />
        {/* Stays focusable when it cannot be used, with the reason as its description. As "Change" it is described by the field it is of, which the Tab key passes over while it is disabled. */}
        <Button
          ref={button}
          type="submit"
          variant="outline"
          aria-disabled={blocked || undefined}
          aria-describedby={blocked ? blockedId : changeable ? labelId : undefined}
          className="aria-disabled:opacity-50"
        >
          {changeable ? NOTEBOOK_TEXT.change : NOTEBOOK_TEXT.record}
        </Button>
        {cancellable && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              // First, while the button that takes focus is the one that stays.
              button.current?.focus()
              settle()
              setReply({ wanted, text: '', invalid: false })
            }}
          >
            {NOTEBOOK_TEXT.cancel}
          </Button>
        )}
      </div>
      {blocked && (
        <p id={blockedId} className={ROLE.held}>
          {blockedText}
        </p>
      )}
      <p id={replyId} role="status">
        {shown?.text}
      </p>
    </form>
  )
}
