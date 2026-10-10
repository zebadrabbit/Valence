import { useId, type Ref } from 'react'
import { Button } from '@/components/ui/button'

/**
 * Guided's warning before a technique step is skipped: a group named by the warnings it lists, which takes focus,
 * with one way back and one way on however many it lists. It is not modal: the page that draws it drops it at any
 * other action, and after a reload the action has simply not happened.
 */
export function WarningGroup({
  warnings,
  buttons,
  onBack,
  onGoOn,
  ref,
}: {
  warnings: readonly { id: string; title: string; body: string }[]
  buttons: { back: string; on: string }
  onBack(): void
  onGoOn(): void
  ref: Ref<HTMLDivElement>
}) {
  const id = useId()
  return (
    <div
      ref={ref}
      role="group"
      tabIndex={-1}
      aria-labelledby={warnings.map((warning) => `${id}${warning.id}-title`).join(' ')}
      aria-describedby={warnings.map((warning) => `${id}${warning.id}-body`).join(' ')}
      className="grid gap-2 rounded-md border-2 p-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {warnings.map((warning) => (
        <div key={warning.id} className="grid gap-1">
          <p id={`${id}${warning.id}-title`} className="font-medium">
            {warning.title}
          </p>
          <p id={`${id}${warning.id}-body`}>{warning.body}</p>
        </div>
      ))}
      <div className="flex flex-wrap gap-x-1.5 gap-y-3">
        {/* Drawn as they were, each with the hit area lab.css lays over a small control. Where the two wrap onto two rows, the rows are 0.75rem apart, so that neither area lies over the other button's. */}
        <Button variant="outline" className="lab-tap" onClick={onBack}>
          {buttons.back}
        </Button>
        <Button variant="outline" className="lab-tap" onClick={onGoOn}>
          {buttons.on}
        </Button>
      </div>
    </div>
  )
}
