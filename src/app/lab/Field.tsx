import { useId, type ReactNode, type Ref } from 'react'
import { ENTRY_INPUT, ENTRY_INPUT_TALL } from './entry'
import { ROLE } from './roles'

/**
 * One labelled field of a form, with what is said of it tied to it: `held`, why it takes no entry now, or `error`,
 * what its last entry was refused with. A field that takes none shows no refusal and is not marked invalid: the
 * one reason is all that is under it. Its label carries the entry role only while it waits for typing. `children`
 * sit beside the input. The titration lab's notebook and the calorimetry lab's worksheet.
 *
 * `help` is how the entry is written, said under a field that waits for typing until a refusal takes its place.
 * `tall` draws the field a finger's height. `signed` is for an entry that may begin with a minus sign: it asks for
 * a keyboard that has one, which a keypad of digits may not.
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
  help,
  tall = false,
  signed = false,
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
  help?: string
  tall?: boolean
  signed?: boolean
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
          inputMode={signed ? 'text' : 'decimal'}
          autoComplete="off"
          value={value}
          disabled={disabled}
          aria-invalid={refused || undefined}
          aria-describedby={noteId}
          onChange={(event) => onChange(event.target.value)}
          className={tall ? ENTRY_INPUT_TALL : ENTRY_INPUT}
        />
        {children}
      </div>
      <div id={noteId}>
        {held !== null ? <p className={ROLE.held}>{held}</p> : refused ? <p role="alert">{error}</p> : help !== undefined && !disabled && <p className="text-muted-foreground">{help}</p>}
      </div>
    </div>
  )
}
