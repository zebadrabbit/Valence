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

// The size of the page's own text, as before the tabs: what a panel holds sets its own.
const PANEL = 'lab-panel rounded-md pt-2 text-base focus-visible:ring-2 focus-visible:ring-ring'

/**
 * The frame every lab page has: the heading, the notices, the mode and Start or Restart, then three tabs under a
 * bar that stays at the top of the window: the primer, the lab (guide, bench and notebook) and the record.
 *
 * A panel that is not shown stays mounted, hidden and inert: it keeps its state, and it is out of the tab order
 * and of a screen reader's reading. Start and Restart show the Lab tab; Start also moves focus to its panel, since
 * the button that was pressed is gone.
 */
export function LabShell(props: LabShellProps) {
  const { title, narrow, started, persistent, setAside = false, mode, onMode, modeLocked, onStart, onRestart, primer, guide, bench, notebook, record } = props
  const [tab, setTab] = useState(() => openingTab(started))
  const tabs = useRef<HTMLDivElement>(null)
  const lab = useRef<HTMLDivElement>(null)
  const startPressed = useRef(false)
  const shown = useRef(tab)

  useEffect(() => {
    // A change of tab made with the bar stuck to the top of the window: the new panel is shown from its top.
    if (shown.current !== tab && tabs.current && tabs.current.getBoundingClientRect().top < 0) tabs.current.scrollIntoView()
    shown.current = tab
    if (startPressed.current && started && tab === 'lab') {
      startPressed.current = false
      lab.current?.focus()
    }
  }, [tab, started])

  const start = () => {
    startPressed.current = true
    setTab('lab')
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
                setTab('lab')
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
      <Tabs ref={tabs} value={tab} onValueChange={(next: LabTab) => setTab(next)} className="gap-0">
        <div className="sticky top-0 z-10 border-b bg-background py-2">
          <TabsList variant="line" aria-label={title} className="group-data-horizontal/tabs:h-10">
            {(Object.keys(SHELL_TEXT.tabs) as LabTab[]).map((value) => (
              <TabsTrigger key={value} value={value} className="px-4 text-base data-active:font-semibold">
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
