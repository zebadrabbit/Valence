import { useLayoutEffect, useRef } from 'react'

// A field that takes one entry, at the bench or in the notebook: how it stands once the entry is made, and where
// focus goes when it changes. It holds no rule of its own: `held` is the engine's word, asked through `can`.

/** The field itself. Disabled, it shows what was entered and is not drawn faint, so that the entry can be read. */
export const ENTRY_INPUT =
  'h-8 w-24 rounded-md border bg-background px-2 tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:bg-muted aria-invalid:border-destructive'

export interface FieldState {
  /** The field takes typing now, and its label is the one that waits for an entry. */
  editable: boolean
  /** The entry is made and the engine would take it again: the field is disabled and shows it, beside "Change". */
  changeable: boolean
  /** A change is under way: "Cancel" puts the field back as it was. The entry stays the old one until a new one is recorded. */
  cancellable: boolean
}

/**
 * `recorded`: the entry is made. `held`: the engine takes no entry here now, whatever is typed. `changing`: the
 * learner has pressed Change. A field that is held is never editable and never offers a change, so a trial that
 * is over shows what was entered, with the one reason under it.
 */
export function fieldState(recorded: boolean, held: boolean, changing: boolean): FieldState {
  const editable = !held && (!recorded || changing)
  return { editable, changeable: !held && recorded && !changing, cancellable: editable && recorded }
}

/**
 * A key pressed anywhere in an entry's form. Escape, while a change is open, is its Cancel: `cancel` is the form's
 * own, and null while there is nothing to cancel. The key is not stopped: Escape also closes an open stopcock.
 * A held Enter is one press, in the field and on the buttons: Enter in the field records and moves focus to the
 * button, and each repeat would then be a press on it, opening the field as "Change" and recording again in turn.
 */
export function entryKey(event: { key: string; repeat: boolean; preventDefault(): void }, cancel: (() => void) | null) {
  if (event.key === 'Escape') cancel?.()
  if (event.key === 'Enter' && event.repeat) event.preventDefault()
}

/**
 * Keeps focus on something that can hold it. When the field stops taking typing while focus is in it (Enter
 * recorded the entry, and a disabled field cannot keep focus), focus goes to the form's button, which then reads
 * "Change" or says why not. When Change makes it editable, focus goes into the field with the old entry selected.
 * Neither happens on a first render, and neither takes focus from anywhere else on the page.
 */
export function useEntryFocus(editable: boolean) {
  const field = useRef<HTMLInputElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const was = useRef(editable)
  useLayoutEffect(() => {
    if (was.current === editable) return
    was.current = editable
    const active = document.activeElement
    if (editable && active === button.current) {
      field.current?.focus()
      field.current?.select()
    }
    if (!editable && active instanceof HTMLInputElement && active.form !== null && active.form === button.current?.form) button.current?.focus()
  }, [editable])
  return { field, button }
}
