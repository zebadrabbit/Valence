import type { ComponentProps, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'

/** One press, one action: a held key repeats Enter, and on a button every repeat is a click. */
export const noRepeat = (event: KeyboardEvent) => {
  if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault()
}

/**
 * A button that stays focusable when it cannot be used, so that focus never drops to the page when a press makes its own button unavailable.
 * `dimmed` is whether it is drawn faint, as an unavailable button is unless it says so: one that reads as a step done is unavailable and not faint.
 */
export function Control({ unavailable, dimmed = unavailable, className = '', ...props }: { unavailable: boolean; dimmed?: boolean } & ComponentProps<typeof Button>) {
  return <Button type="button" variant="outline" aria-disabled={unavailable || undefined} onKeyDown={noRepeat} {...props} className={`${dimmed ? 'opacity-50' : ''} ${className}`} />
}

/**
 * A choice drawn as a box a finger can press: the label of a radio button, or a button that is itself the choice.
 * The one that is chosen has a heavier edge and bolder words, not a colour alone.
 */
export const CHOICE =
  'flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 py-1 has-checked:border-foreground has-checked:bg-muted has-checked:font-medium has-disabled:cursor-default has-focus-visible:ring-2 has-focus-visible:ring-ring'
