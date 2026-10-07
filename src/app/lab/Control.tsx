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
