import { useId } from 'react'
import type { Mode } from './LabShell'
import { ROLE } from './roles'
import { SHELL_TEXT } from './shellText'

/**
 * Guided or Challenge, in as little room as it can have: a native disclosure, closed until it is opened, whose
 * summary says which mode is in force ("Mode: Guided"), and in it two native radio buttons, each with what its mode
 * does. It stays open until it is closed: a keyboard changes the mode with each arrow key, so closing it at a
 * change would take the choice away from under the keys. `disabled` is the reason the mode cannot be changed now.
 * `text` is what each mode does in this lab, where the shell's own words are not true of it.
 */
export function ModeSwitch({ mode, onChange, disabled, text = SHELL_TEXT }: { mode: Mode; onChange(mode: Mode): void; disabled?: string | undefined; text?: Record<Mode, string> | undefined }) {
  const name = useId()
  const reasonId = useId()
  return (
    <details className="text-sm">
      {/* The summary of every disclosure on a lab page (InspectorCard), with the hit area lab.css lays over a small control. */}
      <summary className="lab-tap w-fit cursor-pointer rounded-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {SHELL_TEXT.mode}: <span className={ROLE.value}>{SHELL_TEXT.modeName[mode]}</span>
      </summary>
      <fieldset className="mt-2 grid gap-1">
        <legend className="sr-only">{SHELL_TEXT.mode}</legend>
        {(['guided', 'challenge'] as const).map((value) => (
          <label key={value} className="flex max-w-prose items-baseline gap-2">
            <input
              type="radio"
              name={name}
              value={value}
              checked={mode === value}
              onChange={() => onChange(value)}
              disabled={disabled !== undefined}
              aria-describedby={disabled === undefined ? undefined : reasonId}
            />
            {text[value]}
          </label>
        ))}
        {disabled !== undefined && (
          <p id={reasonId} className={ROLE.held}>
            {disabled}
          </p>
        )}
      </fieldset>
    </details>
  )
}
