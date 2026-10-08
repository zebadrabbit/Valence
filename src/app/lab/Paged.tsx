import { useId, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface PagedItem {
  id: string
  heading: string
  /** A second line under the heading in the list: a mark the item carries, in words. */
  note?: ReactNode
}

/**
 * One thing at a time out of a list: the primer's topics, a lab's stations. The list (beside the one shown where
 * there is room, behind a button above it where there is not; lab.css decides, under the primer's class names),
 * then `children`, the one shown, with the way to those either side under it, each named by where it goes. At the
 * first there is no Previous and at the last no Next.
 *
 * `onGo` is called with the place chosen, the one already shown included: the caller moves focus to what it shows.
 * `text` is the list's name and the two ways on; `listKey` is drawn under the list, and `after` under the ways on.
 */
export function Paged({
  items,
  index,
  onGo,
  text,
  listKey,
  after,
  children,
}: {
  items: readonly PagedItem[]
  index: number
  onGo(to: number): void
  text: { list: string; previous(heading: string): string; next(heading: string): string }
  listKey?: ReactNode
  after?: ReactNode
  children: ReactNode
}) {
  // The list, where it is behind its button.
  const [listed, setListed] = useState(false)
  const listId = useId()
  const previous = items[index - 1]
  const next = items[index + 1]
  const go = (to: number) => {
    setListed(false)
    onGo(to)
  }
  return (
    <div className="primer">
      <div className="primer-layout">
        <nav
          aria-label={text.list}
          className="primer-menu text-sm"
          onKeyDown={(event) => {
            if (event.key === 'Escape' && listed) setListed(false)
          }}
        >
          <Button variant="outline" className="primer-topics-button lab-tap" aria-expanded={listed} aria-controls={listId} onClick={() => setListed(!listed)}>
            {text.list}
            {listed ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
          </Button>
          <ol id={listId} className={`primer-topics ${listed ? 'primer-topics-listed' : ''} gap-0.5`}>
            {items.map(({ id, heading, note }, i) => (
              <li key={id}>
                <button
                  type="button"
                  aria-current={i === index ? 'true' : undefined}
                  onClick={() => go(i)}
                  className="grid w-full grid-cols-[1.5rem_minmax(0,1fr)] gap-1 rounded-md border-l-4 border-transparent px-2 py-1.5 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring aria-[current]:border-foreground aria-[current]:bg-muted aria-[current]:font-medium"
                >
                  <span className="tabular-nums text-muted-foreground">{i + 1}.</span>
                  <span>
                    {heading}
                    {note !== undefined && <span className="block text-xs font-normal text-muted-foreground">{note}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          {listKey}
        </nav>
        <div className="grid min-w-0 content-start gap-3">
          {children}
          <div className="flex flex-wrap justify-between gap-2">
            {previous && (
              <Button variant="outline" className="lab-tap h-auto min-h-9 max-w-full py-1.5 text-left whitespace-normal" onClick={() => go(index - 1)}>
                <span aria-hidden="true">←</span> {text.previous(previous.heading)}
              </Button>
            )}
            {next && (
              <Button variant="outline" className="lab-tap ml-auto h-auto min-h-9 max-w-full py-1.5 text-left whitespace-normal" onClick={() => go(index + 1)}>
                {text.next(next.heading)} <span aria-hidden="true">→</span>
              </Button>
            )}
          </div>
          {after}
        </div>
      </div>
    </div>
  )
}
