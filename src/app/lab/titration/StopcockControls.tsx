import type { ComponentProps, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import type { BenchView } from './benchView'
import { POUR_ADDITIONS, type Stream } from './stream'

export interface StopcockControlsProps {
  stream: Stream
  controls: Pick<BenchView['controls'], 'clearTipBubble' | 'deliver' | 'swirlAndWait'>
  onClearTip(): void
  onAdd(amount: 'drop' | 'half'): void
  /** Opens a stream (null) or a measured pour; closes it if that one is running. */
  onToggle(pour: number | null): void
  onSwirl(): void
}

/** One press, one addition: a held key repeats Enter, and on a button every repeat is a click. */
const noRepeat = (event: KeyboardEvent) => {
  if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault()
}

/** A button that stays focusable when it cannot be used, so that focus never drops to the page when a press makes its own button unavailable. */
export function Control({ unavailable, className = '', ...props }: { unavailable: boolean } & ComponentProps<typeof Button>) {
  return <Button type="button" variant="outline" aria-disabled={unavailable || undefined} onKeyDown={noRepeat} {...props} className={`aria-disabled:opacity-50 ${className}`} />
}

// A test holds the two pours to 1 mL and 5 mL of the model's stream addition.
const POURS = [
  { pour: POUR_ADDITIONS[0], name: 'Run in 1 mL' },
  { pour: POUR_ADDITIONS[1], name: 'Run in 5 mL' },
  { pour: null, name: 'Open stopcock' },
] as const

/**
 * The burette's controls: clearing the tip, the stopcock's five ways of adding titrant with the fine ones first,
 * and the swirl and wait. Nothing is held and nothing is timed: every one is a button, and a stream or a pour is
 * closed by one more press of the button that opened it.
 *
 * A button the engine has no use for now is marked unavailable and still calls its handler, so that the bench can
 * say why. While a stream or a pour runs, every other way of adding and the swirl are unavailable too, and a
 * press on one of those is dropped here: the button that is running says how to close it.
 */
export function StopcockControls({ stream, controls, onClearTip, onAdd, onToggle, onSwirl }: StopcockControlsProps) {
  const running = stream.open
  const whileClosed = (press: () => void) => () => {
    if (!running) press()
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      <Control unavailable={controls.clearTipBubble !== null} onClick={onClearTip}>
        Clear the tip
      </Control>
      <div role="group" aria-label="Stopcock" className="flex flex-wrap gap-1.5">
        <Control unavailable={controls.deliver !== null || running} onClick={whileClosed(() => onAdd('half'))}>
          Add half-drop
        </Control>
        <Control unavailable={controls.deliver !== null || running} onClick={whileClosed(() => onAdd('drop'))}>
          Add drop
        </Control>
        {POURS.map(({ pour, name }) => {
          // The button that opened the stopcock is the one that closes it: focus is already on it.
          const mine = running && stream.pour === pour
          return (
            <Control
              key={name}
              unavailable={!mine && (controls.deliver !== null || running)}
              variant={mine ? 'default' : 'outline'}
              aria-pressed={pour === null ? mine : undefined}
              onClick={() => (mine || !running) && onToggle(pour)}
            >
              {mine ? 'Close stopcock' : name}
            </Control>
          )
        })}
      </div>
      <Control unavailable={controls.swirlAndWait !== null || running} onClick={whileClosed(onSwirl)}>
        Swirl and wait 30 s
      </Control>
    </div>
  )
}
