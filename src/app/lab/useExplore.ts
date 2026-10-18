import { useEffect, useRef, useState } from 'react'

/**
 * A picture that is explored: which of its parts is being looked at, and what makes a part's button look. A mouse
 * pointer over a part, keyboard focus on it or a tap looks at it, and `onLook` is told once for each look. The look
 * ends when the pointer leaves or focus does, at Escape, and on a touch screen when another part or anywhere else
 * is tapped: a finger does not leave a part as a mouse pointer does. A part's button carries `data-part`.
 * ponytail: a mouse pointer that crosses a part has looked at it, with no time asked of it, so a pointer swept
 * across a picture looks at every part. Ask for a moment's rest on a part if that is found to be done unread.
 */
export function useExplore<Part extends string>(onLook: (part: Part) => void) {
  const [open, setOpen] = useState<Part | null>(null)
  // The part open now, kept at once: two events of one look (a pointer's arrival and the focus of its press, or the
  // focus and then the click of a tap) can come before the page is drawn again with the first one's `open`.
  const looking = useRef<Part | null>(null)
  useEffect(() => {
    if (open === null) return
    const away = (event: PointerEvent) => {
      if (!(event.target instanceof Element && event.target.closest('[data-part]'))) {
        looking.current = null
        setOpen(null)
      }
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [open])
  const show = (part: Part) => {
    // Focus and then the click of one tap, or a press on a part already open, is one look and is said once.
    if (looking.current === part) return
    looking.current = part
    setOpen(part)
    onLook(part)
  }
  const close = (part: Part) => {
    if (looking.current === part) looking.current = null
    setOpen((now) => (now === part ? null : now))
  }
  return {
    open,
    /** What a part's button is given, beside its name and its place. */
    part: (part: Part) => ({
      type: 'button' as const,
      'data-part': part,
      onPointerEnter: (event: { pointerType: string }) => void (event.pointerType === 'mouse' && show(part)),
      onPointerLeave: (event: { pointerType: string }) => void (event.pointerType === 'mouse' && close(part)),
      onFocus: () => show(part),
      onBlur: () => close(part),
      onClick: () => show(part),
      onKeyDown: (event: { key: string }) => void (event.key === 'Escape' && close(part)),
    }),
  }
}
