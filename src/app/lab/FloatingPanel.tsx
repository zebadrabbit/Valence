import { GripHorizontal, X } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { clampToWindow } from './calc'
import { PANEL_TEXT } from './shellText'

const STEP = 16

// ponytail: where each panel was left is kept for the visit in the module, under the panel's name, not in storage;
// a stored preference if anyone asks for a panel to come back in the same place tomorrow.
const leftAt = new Map<string, { x: number; y: number }>()

/**
 * A button that opens a panel floating over the page, and the panel: a learner looks something up or works a sum
 * without leaving the lab. The panel is not modal, so the bench stays usable under it. It is moved by dragging its
 * grip or with the arrow keys on it, stays inside the window, also when the window is made smaller, and is closed by its own button, by the button that
 * opened it, or by Escape, which puts focus back on that button.
 *
 * `width` and `height` are the panel's size in pixels, the height an estimate until it is drawn, when the panel is
 * placed again by the height it has; `fromRight` is how far from the right of the window it first opens, under the
 * tabs, so that two panels do not open on one spot.
 */
export function FloatingPanel({
  name,
  icon,
  width,
  height = 400,
  fromRight = 16,
  children,
}: {
  name: string
  icon: ReactNode
  width: number
  height?: number
  fromRight?: number
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [at, setAt] = useState(leftAt.get(name) ?? { x: 0, y: 0 })
  const opener = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const grabbed = useRef<{ dx: number; dy: number } | null>(null)

  const moveTo = (x: number, y: number) => {
    const size = panel.current?.getBoundingClientRect() ?? { width, height }
    const next = clampToWindow(x, y, size, { width: window.innerWidth, height: window.innerHeight })
    leftAt.set(name, next)
    setAt(next)
  }
  // A window made smaller under an open panel (a tablet turned upright, a window resized) would leave the panel
  // outside it, where no pointer reaches its grip: it is brought back inside as the window changes.
  useEffect(() => {
    if (!open) return
    const keepInside = () => {
      const was = leftAt.get(name)
      if (was === undefined) return
      const size = panel.current?.getBoundingClientRect() ?? { width, height }
      const next = clampToWindow(was.x, was.y, size, { width: window.innerWidth, height: window.innerHeight })
      leftAt.set(name, next)
      setAt(next)
    }
    window.addEventListener('resize', keepInside)
    return () => window.removeEventListener('resize', keepInside)
  }, [open, name, width, height])

  const show = () => {
    // First opened at the right of the window, under the tabs; afterwards where it was left.
    const start = leftAt.get(name) ?? { x: window.innerWidth - width - fromRight, y: 96 }
    const next = clampToWindow(start.x, start.y, { width, height }, { width: window.innerWidth, height: window.innerHeight })
    leftAt.set(name, next)
    setAt(next)
    setOpen(true)
    // The height handed in is an estimate, and a long panel is no taller than the window lets it be: once it is
    // drawn, it is brought inside the window by the size it has.
    requestAnimationFrame(() => moveTo(next.x, next.y))
  }
  const close = () => {
    setOpen(false)
    opener.current?.focus()
  }

  const grab = (event: PointerEvent<HTMLButtonElement>) => {
    grabbed.current = { dx: event.clientX - at.x, dy: event.clientY - at.y }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const drag = (event: PointerEvent<HTMLButtonElement>) => {
    if (grabbed.current) moveTo(event.clientX - grabbed.current.dx, event.clientY - grabbed.current.dy)
  }
  const nudge = (event: KeyboardEvent<HTMLButtonElement>) => {
    const by = { ArrowLeft: [-STEP, 0], ArrowRight: [STEP, 0], ArrowUp: [0, -STEP], ArrowDown: [0, STEP] }[event.key]
    if (!by) return
    event.preventDefault()
    moveTo(at.x + by[0]!, at.y + by[1]!)
  }

  return (
    <>
      {/* Drawn small; lab.css lays a finger's hit area over it, and over the grip and the close button. */}
      <Button ref={opener} type="button" variant="outline" size="sm" className="lab-tap" aria-expanded={open} onClick={() => (open ? close() : show())} onKeyDown={(event) => event.key === 'Escape' && open && close()}>
        {icon}
        {name}
      </Button>
      {open &&
        createPortal(
          <div
            ref={panel}
            role="dialog"
            aria-label={name}
            style={{ left: at.x, top: at.y, width }}
            className="fixed z-50 grid max-h-[calc(100vh-1rem)] max-w-[calc(100vw-1rem)] gap-2 overflow-auto rounded-lg border bg-card p-2 text-sm text-card-foreground shadow-lg"
            onKeyDown={(event) => {
              if (event.key === 'Escape') close()
            }}
          >
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={PANEL_TEXT.move(name)}
                className="lab-tap flex h-9 min-w-0 flex-1 cursor-move touch-none items-center gap-2 rounded-md px-2 text-left font-medium outline-none select-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                onPointerDown={grab}
                onPointerMove={drag}
                onPointerUp={() => (grabbed.current = null)}
                onPointerCancel={() => (grabbed.current = null)}
                onKeyDown={nudge}
              >
                <GripHorizontal aria-hidden="true" className="size-4 text-muted-foreground" />
                {name}
              </button>
              <Button type="button" variant="ghost" size="icon" className="lab-tap" aria-label={PANEL_TEXT.close(name)} onClick={close}>
                <X aria-hidden="true" />
              </Button>
            </div>
            {children}
          </div>,
          document.body,
        )}
    </>
  )
}
