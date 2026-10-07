import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { parseReading } from '@/engine/titration'
import { invalidReadingText } from './messages'

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
  /** Why no reading can be recorded now; null when one can. */
  blockedText: string | null
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

/** The one place a burette reading is typed: a text field, so that the characters typed are the ones parsed, and Record. Enter records. */
export function ReadingInput({ wanted, blockedText, onReading }: ReadingInputProps) {
  const [text, setText] = useState('')
  // Kept with the reading it answered, and shown only while that is still the one wanted.
  const [reply, setReply] = useState({ wanted, text: '', invalid: false })
  const inputId = useId()
  const replyId = useId()
  const blockedId = useId()
  const blocked = blockedText !== null
  const shown = reply.wanted === wanted ? reply : null

  return (
    <form
      noValidate
      className="grid gap-1.5 text-sm"
      onSubmit={(event) => {
        event.preventDefault()
        if (blocked) return
        const { accepted, ...said } = recordReading(text, onReading)
        if (accepted) setText('')
        setReply({ wanted, ...said })
      }}
    >
      <label htmlFor={inputId} className="font-medium">
        {wanted === 'initial' ? 'Initial' : 'Final'} burette reading (mL)
      </label>
      <div className="flex gap-1.5">
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={text}
          disabled={blocked}
          aria-invalid={shown?.invalid || undefined}
          aria-describedby={blocked ? blockedId : replyId}
          onChange={(event) => setText(event.target.value)}
          className="h-8 w-24 rounded-md border bg-background px-2 tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 aria-invalid:border-destructive"
        />
        {/* Stays focusable when it cannot be used, with the reason as its description. */}
        <Button type="submit" variant="outline" aria-disabled={blocked || undefined} aria-describedby={blocked ? blockedId : undefined} className="aria-disabled:opacity-50">
          Record
        </Button>
      </div>
      {blocked && (
        <p id={blockedId} className="text-muted-foreground">
          {blockedText}
        </p>
      )}
      <p id={replyId} role="status">
        {shown?.text}
      </p>
    </form>
  )
}
