import { Calculator as CalculatorIcon, GripHorizontal, X } from 'lucide-react'
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { clampToWindow, evaluate, resultText } from './calc'
import { CALCULATOR_TEXT } from './shellText'

const KEYS = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '(', ')'] as const
const STEP = 16

// ponytail: where the panel was left is kept for the visit in the module, not in storage; a stored
// preference if anyone asks for it to come back in the same place tomorrow.
let leftAt: { x: number; y: number } | null = null

/**
 * A calculator that floats over the page and can be moved out of the way: a learner works a sum without leaving
 * the lab. It is not modal, so the bench stays usable under it, and it fills in no field: the learner reads the
 * result and types it where it belongs.
 */
export function Calculator() {
  const [open, setOpen] = useState(false)
  const [at, setAt] = useState(leftAt ?? { x: 0, y: 0 })
  const [sum, setSum] = useState('')
  const [shown, setShown] = useState('')
  const opener = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const grabbed = useRef<{ dx: number; dy: number } | null>(null)

  const moveTo = (x: number, y: number) => {
    const size = panel.current?.getBoundingClientRect() ?? { width: 272, height: 400 }
    leftAt = clampToWindow(x, y, size, { width: window.innerWidth, height: window.innerHeight })
    setAt(leftAt)
  }
  const show = () => {
    // First opened at the right of the window, under the tabs; afterwards where it was left.
    const start = leftAt ?? { x: window.innerWidth - 272 - 16, y: 96 }
    leftAt = clampToWindow(start.x, start.y, { width: 272, height: 400 }, { width: window.innerWidth, height: window.innerHeight })
    setAt(leftAt)
    setOpen(true)
  }
  const close = () => {
    setOpen(false)
    opener.current?.focus()
  }
  const work = () => {
    const value = evaluate(sum)
    setShown(sum.trim() === '' ? '' : value === null ? CALCULATOR_TEXT.notASum : `${sum.trim()} = ${resultText(value)}`)
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
      <Button ref={opener} type="button" variant="outline" size="sm" aria-expanded={open} onClick={() => (open ? close() : show())} onKeyDown={(event) => event.key === 'Escape' && open && close()}>
        <CalculatorIcon aria-hidden="true" />
        {CALCULATOR_TEXT.name}
      </Button>
      {open &&
        createPortal(
          <div
            ref={panel}
            role="dialog"
            aria-label={CALCULATOR_TEXT.name}
            style={{ left: at.x, top: at.y }}
            className="fixed z-50 grid w-68 gap-2 rounded-lg border bg-card p-2 text-sm text-card-foreground shadow-lg"
            onKeyDown={(event) => {
              if (event.key === 'Escape') close()
            }}
          >
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={CALCULATOR_TEXT.move}
                className="flex h-9 min-w-0 flex-1 cursor-move touch-none items-center gap-2 rounded-md px-2 text-left font-medium outline-none select-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                onPointerDown={grab}
                onPointerMove={drag}
                onPointerUp={() => (grabbed.current = null)}
                onPointerCancel={() => (grabbed.current = null)}
                onKeyDown={nudge}
              >
                <GripHorizontal aria-hidden="true" className="size-4 text-muted-foreground" />
                {CALCULATOR_TEXT.name}
              </button>
              <Button type="button" variant="ghost" size="icon" aria-label={CALCULATOR_TEXT.close} onClick={close}>
                <X aria-hidden="true" />
              </Button>
            </div>
            <input
              type="text"
              // The panel's own keys do the typing on a tablet: its keyboard would cover the bench.
              inputMode="none"
              autoComplete="off"
              spellCheck={false}
              aria-label={CALCULATOR_TEXT.sum}
              value={sum}
              onChange={(event) => setSum(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') work()
              }}
              className="h-10 w-full rounded-md border bg-background px-2 text-right font-mono text-base tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <output aria-live="polite" className="min-h-10 rounded-md bg-muted px-2 py-1 text-right font-mono break-all tabular-nums">
              {shown}
            </output>
            <div className="grid grid-cols-4 gap-1">
              {KEYS.map((key) => (
                <Button key={key} type="button" variant="outline" className="h-11 text-base" onClick={() => setSum(sum + key)}>
                  {key}
                </Button>
              ))}
              <Button type="button" variant="outline" className="h-11" aria-label={CALCULATOR_TEXT.clear} onClick={() => (setSum(''), setShown(''))}>
                C
              </Button>
              <Button type="button" variant="outline" className="h-11" aria-label={CALCULATOR_TEXT.back} onClick={() => setSum(sum.slice(0, -1))}>
                ⌫
              </Button>
              <Button type="button" variant="outline" className="h-11 text-base" onClick={() => setSum(sum + '+')}>
                +
              </Button>
              <Button type="button" className="h-11 text-base" aria-label={CALCULATOR_TEXT.equals} onClick={work}>
                =
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{CALCULATOR_TEXT.note}</p>
          </div>,
          document.body,
        )}
    </>
  )
}
