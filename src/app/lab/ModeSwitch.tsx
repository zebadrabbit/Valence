import { useId } from 'react'
import type { Mode } from './LabShell'
import { ROLE } from './roles'
import { SHELL_TEXT } from './shellText'

/** Guided or Challenge: two native radio buttons. `disabled` is the reason the mode cannot be changed now. */
export function ModeSwitch({ mode, onChange, disabled }: { mode: Mode; onChange(mode: Mode): void; disabled?: string | undefined }) {
  const name = useId()
  const reasonId = useId()
  return (
    <fieldset className="grid gap-1 text-sm">
      <legend className="mb-1 font-medium">Mode</legend>
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
          {SHELL_TEXT[value]}
        </label>
      ))}
      {disabled !== undefined && (
        <p id={reasonId} className={ROLE.held}>
          {disabled}
        </p>
      )}
    </fieldset>
  )
}
