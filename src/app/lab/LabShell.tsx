import { useEffect, useRef, useState, type ReactNode } from 'react'
import { PageHeader } from '@/app/PageHeader'
import { NOT_SAVING_TEXT } from '@/app/progress/storage'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ModeSwitch } from './ModeSwitch'
import { NARROW_NOTICE, SHELL_TEXT } from './shellText'
import './lab.css'

export type Mode = 'guided' | 'challenge'
/** The three tabs of a lab page. Which one is shown is state of the page while it is open: it is not stored and not in the address. */
export type LabTab = keyof typeof SHELL_TEXT.tabs

/** The tab a lab page opens on: the primer until there is a run, the lab once there is one, in progress or completed. */
export const openingTab = (started: boolean): LabTab => (started ? 'lab' : 'primer')

/**
 * How far the window is scrolled when a tab comes to be shown. `barTop` is where the top of the tabs is in the
 * window, below zero while the bar is stuck; `left` is how far under the bar the tab's panel was when the tab was
 * last left, and 0 if it was not under it or has not been seen. A tab left under the bar comes back to that place;
 * any other is shown from the top of its panel where the bar is stuck, and the window is not moved where it is
 * not. Start puts the bar at the top of the window, so that the top of the Lab tab is what is under it.
 */
export const tabShift = (barTop: number, left: number, start: boolean): number => (start ? barTop : left > 0 ? barTop + left : Math.min(barTop, 0))

export interface LabShellProps {
  title: string
  /** True in a window narrower than 768 px (spec 11): the Lab tab then holds the notice in place of the bench, and nothing on the page changes a run. */
  narrow: boolean
  /** False until the learner has started the lab. */
  started: boolean
  /** AppState.persistent: false while the browser is not keeping progress. */
  persistent: boolean
  /** True where a saved run of the lab could not be loaded and was set aside: the page says so until a new run is started. */
  setAside?: boolean
  mode: Mode
  onMode(mode: Mode): void
  /** The reason the mode cannot be changed now. */
  modeLocked?: string | undefined
  onStart(): void
  /** Called once the learner has confirmed. */
  onRestart(): void
  /** The Primer tab. */
  primer: ReactNode
  /** The lab's Guided panel, if it has one in the current mode. On the Lab tab, over the bench. */
  guide?: ReactNode
  /**
   * The Lab tab's bench. `shown` is false while another tab is the one shown: the bench stays mounted, so that what
   * was typed and said there is kept, and nothing on it may go on running unseen.
   */
  bench(shown: boolean): ReactNode
  /** The working part of the notebook, on the Lab tab, beside the bench where there is room. */
  notebook: ReactNode
  /** The Record tab: the record of what has been done in the run. */
  record: ReactNode
}

// The size of the page's own text, as before the tabs: what a panel holds sets its own. Base UI leaves the panel
// that is being left laid out for one more frame, over the next one, for a transition out; there is none here, so
// it is out of the layout at once, and what is measured or focused in that frame is where it will stay.
const PANEL = 'lab-panel rounded-md pt-2 text-base focus-visible:ring-2 focus-visible:ring-ring data-ending-style:hidden'

/**
 * The frame every lab page has: the heading, the notices, the mode and Start or Restart, then three tabs under a
 * bar that stays at the top of the window: the primer, the lab (guide, bench and notebook) and the record.
 *
 * A panel that is not shown stays mounted, hidden and inert: it keeps its state, and it is out of the tab order
 * and of a screen reader's reading. Start and Restart show the Lab tab; Start also moves focus to its panel, since
 * the button that was pressed is gone, and puts the bar at the top of the window. Each tab is shown again where
 * it was left (`tabShift`), so a look at the primer in the middle of a trial does not lose the place on the bench.
 */
export function LabShell(props: LabShellProps) {
  const { title, narrow, started, persistent, setAside = false, mode, onMode, modeLocked, onStart, onRestart, primer, guide, bench, notebook, record } = props
  const [tab, setTab] = useState(() => openingTab(started))
  const tabs = useRef<HTMLDivElement>(null)
  const lab = useRef<HTMLDivElement>(null)
  const startPressed = useRef(false)
  const shown = useRef(tab)
  // How far under the bar each tab's panel was when the tab was last left.
  const left = useRef<Record<LabTab, number>>({ primer: 0, lab: 0, record: 0 })

  useEffect(() => {
    const start = startPressed.current && started && tab === 'lab'
    if (start) {
      startPressed.current = false
      // The window is moved by the line below, not by the browser in answer to the focus.
      lab.current?.focus({ preventScroll: true })
    }
    if ((start || shown.current !== tab) && tabs.current) {
      window.scrollBy({ top: tabShift(tabs.current.getBoundingClientRect().top, left.current[tab], start), behavior: 'instant' })
    }
    shown.current = tab
  }, [tab, started])

  const show = (next: LabTab) => {
    left.current[tab] = Math.max(0, -(tabs.current?.getBoundingClientRect().top ?? 0))
    setTab(next)
  }
  const start = () => {
    startPressed.current = true
    show('lab')
    onStart()
  }
  const startButton = <Button onClick={start}>{SHELL_TEXT.start}</Button>

  return (
    <>
      <PageHeader title={title} parent={{ to: '/lab', label: 'Lab' }} />
      {!persistent && (
        <p role="status" className="mb-4 max-w-prose rounded-md border p-3 text-sm">
          {NOT_SAVING_TEXT}
        </p>
      )}
      {setAside && (
        <p role="status" className="mb-4 max-w-prose rounded-md border p-3 text-sm">
          {SHELL_TEXT.setAside}
        </p>
      )}
      {!narrow && (
        <div className="mb-2 flex flex-wrap items-end justify-between gap-4">
          <ModeSwitch mode={mode} onChange={onMode} disabled={modeLocked} />
          {started ? (
            <Button
              variant="outline"
              onClick={() => {
                if (!window.confirm(SHELL_TEXT.restartConfirm)) return
                show('lab')
                // The place kept was on the bench of the run that is erased.
                left.current.lab = 0
                onRestart()
              }}
            >
              {SHELL_TEXT.restart}
            </Button>
          ) : (
            startButton
          )}
        </div>
      )}
      <Tabs ref={tabs} value={tab} onValueChange={(next: LabTab) => show(next)} className="gap-0">
        <div className="sticky top-0 z-10 border-b bg-background py-2">
          <TabsList variant="line" aria-label={title} className="group-data-horizontal/tabs:h-12">
            {(Object.keys(SHELL_TEXT.tabs) as LabTab[]).map((value) => (
              <TabsTrigger key={value} value={value} className="min-h-11 px-4 text-base data-active:font-semibold">
                {SHELL_TEXT.tabs[value]}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="primer" keepMounted className={PANEL}>
          {primer}
        </TabsContent>
        <TabsContent ref={lab} value="lab" keepMounted className={PANEL}>
          {narrow ? (
            // The bench is not mounted here, which is what closes a running stopcock when the window is made narrow.
            <div role="note" className="grid max-w-prose gap-1 rounded-md border p-3 text-sm">
              <p className="font-medium">{NARROW_NOTICE.title}</p>
              <p>
                {NARROW_NOTICE.body} {started ? NARROW_NOTICE.withRun : NARROW_NOTICE.withoutRun}
              </p>
            </div>
          ) : started ? (
            <div className="lab-page">
              <div className={`lab-grid ${guide ? '' : 'lab-grid-no-guide'}`}>
                {guide && <div className="lab-guide">{guide}</div>}
                <div className="lab-bench">{bench(tab === 'lab')}</div>
                <aside aria-label="Lab notebook" className="lab-notebook">
                  {notebook}
                </aside>
              </div>
            </div>
          ) : (
            <div className="grid max-w-prose justify-items-start gap-3 text-sm">
              <p>{SHELL_TEXT.notStarted}</p>
              {startButton}
            </div>
          )}
        </TabsContent>
        <TabsContent value="record" keepMounted className={PANEL}>
          {started ? record : <p className="max-w-prose text-sm">{SHELL_TEXT.noRecord}</p>}
        </TabsContent>
      </Tabs>
    </>
  )
}
