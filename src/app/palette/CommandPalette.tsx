import { useEffect, useId, useRef, useState } from 'react'
import { CornerDownLeft, Search } from 'lucide-react'
import { useNavigate } from 'react-router'
import { FormulaParts } from '@/app/explore/Formula'
import { Button } from '@/components/ui/button'
import { formulaParts } from '@/chem-data/formula'
import { PALETTE_ITEMS } from './items'
import { searchPalette, stepActive } from './search'

const SHORTCUT = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K'

/**
 * The rail's Search button and the dialog it opens; Ctrl+K or Cmd+K opens it from anywhere.
 * A native modal <dialog> keeps focus inside, closes on Escape and puts focus back where it was.
 */
export function CommandPalette({ expanded }: { expanded: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const close = () => {
    dialog.current?.close()
    setOpen(false)
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== 'k') return
      // Otherwise the browser moves focus to its own search or address bar.
      e.preventDefault()
      if (dialog.current?.open) close()
      else setOpen(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal()
  }, [open])

  return (
    <>
      <Button
        variant="ghost"
        className="mb-2 justify-start"
        aria-haspopup="dialog"
        aria-keyshortcuts="Control+K Meta+K"
        title={expanded ? undefined : `Search (${SHORTCUT})`}
        onClick={() => setOpen(true)}
      >
        <Search aria-hidden="true" />
        <span className={expanded ? '' : 'sr-only'}>Search</span>
        {expanded && (
          <kbd aria-hidden="true" className="ml-auto rounded border px-1 font-sans text-xs text-muted-foreground">
            {SHORTCUT}
          </kbd>
        )}
      </Button>

      <dialog
        ref={dialog}
        aria-label="Search"
        className="mx-auto mt-[12vh] w-[min(36rem,calc(100vw-2rem))] rounded-lg border bg-background p-0 text-foreground shadow-lg backdrop:bg-black/50"
        // Escape closes the dialog natively. The event can arrive late, after the dialog has been
        // opened again, so it copies the dialog's state instead of assuming "closed".
        onClose={(e) => setOpen(e.currentTarget.open)}
        // The content covers the whole dialog, so a click on the dialog itself is a click on the backdrop.
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        {/* Mounted only while open, so the field starts empty every time. */}
        {open && (
          <PaletteBody
            onChoose={(to) => {
              close()
              void navigate(to)
            }}
          />
        )}
      </dialog>
    </>
  )
}

function PaletteBody({ onChoose }: { onChoose(to: string): void }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listId = useId()
  const results = searchPalette(PALETTE_ITEMS, query)
  const optionId = (index: number) => `${listId}-${index}`
  const activeId = results[active] ? optionId(active) : undefined

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' })
  }, [activeId])

  return (
    <div className="flex max-h-[70vh] flex-col">
      <div className="flex items-center gap-2 rounded-t-lg border-b px-3 focus-within:ring-2 focus-within:ring-ring focus-within:ring-inset">
        <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        {/* Focus stays in the field; aria-activedescendant tells assistive technology which option the arrows are on. */}
        <input
          role="combobox"
          aria-label="Search molecules, elements, labs and pages"
          aria-expanded={results.length > 0}
          aria-controls={listId}
          aria-activedescendant={activeId}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search by name, formula or symbol"
          className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault()
              setActive(stepActive(active, e.key === 'ArrowDown' ? 1 : -1, results.length))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              if (results[active]) onChoose(results[active].to)
            }
          }}
        />
      </div>

      <ul id={listId} role="listbox" aria-label="Results" className="min-h-0 flex-1 overflow-y-auto p-1">
        {results.map((item, i) => (
          <li
            key={item.id}
            id={optionId(i)}
            role="option"
            aria-selected={i === active}
            className={`flex cursor-pointer items-center gap-2 rounded-md border-l-4 px-2 py-1.5 text-sm ${
              i === active ? 'border-foreground bg-muted' : 'border-transparent'
            }`}
            onMouseMove={() => setActive(i)}
            onClick={() => onChoose(item.to)}
          >
            {/* On a narrow screen the kind goes under the name. */}
            <span className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-2">
              <span className="block min-w-0 flex-1">
                <span className="font-medium">{item.label}</span>
                {item.formula && (
                  <span className="ml-2 text-muted-foreground">
                    <FormulaParts parts={formulaParts(item.formula, item.charge)} />
                  </span>
                )}
              </span>
              <span className="block shrink-0 text-xs text-muted-foreground">{item.kind}</span>
            </span>
            {/* The arrow and the bar on the left, not the shading alone, mark the option Enter will open. */}
            <CornerDownLeft aria-hidden="true" className={`size-3.5 shrink-0 ${i === active ? '' : 'invisible'}`} />
          </li>
        ))}
      </ul>

      <p className="flex flex-wrap justify-between gap-x-4 border-t px-3 py-2 text-xs text-muted-foreground">
        <span role="status">{results.length === 0 ? 'No matches' : `${results.length} ${results.length === 1 ? 'result' : 'results'}`}</span>
        <span>Up and Down to move, Enter to open, Escape to close</span>
      </p>
    </div>
  )
}
