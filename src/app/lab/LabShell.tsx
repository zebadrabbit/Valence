import type { ReactNode } from 'react'
import { PageHeader } from '@/app/PageHeader'
import { NOT_SAVING_TEXT } from '@/app/progress/storage'
import { Button } from '@/components/ui/button'
import { ModeSwitch } from './ModeSwitch'
import { NARROW_NOTICE, SHELL_TEXT } from './shellText'
import './lab.css'

export type Mode = 'guided' | 'challenge'

export interface LabShellProps {
  title: string
  /** True in a window narrower than 768 px (spec 11): the notice, the primer and `record`, and nothing else. */
  narrow: boolean
  /** False until the learner has started the lab: the page is then the primer, the mode choice and Start. */
  started: boolean
  /** AppState.persistent: false while the browser is not keeping progress. */
  persistent: boolean
  mode: Mode
  onMode(mode: Mode): void
  /** The reason the mode cannot be changed now. */
  modeLocked?: string | undefined
  onStart(): void
  /** Called once the learner has confirmed. */
  onRestart(): void
  /** The shell decides `open`: before Start and on the narrow page it is open, and closed once the lab is started. */
  primer(open: boolean): ReactNode
  /** The lab's Guided panel, if it has one in the current mode. */
  guide?: ReactNode
  bench: ReactNode
  /** The working part of the notebook, beside the bench where there is room. */
  notebook: ReactNode
  /** The record of what has been done, across the page below. On the narrow page, the read-only notebook. */
  record: ReactNode
}

/** The frame every lab page has: heading, mode, Start or Restart, the primer, then the lab's four slots. */
export function LabShell(props: LabShellProps) {
  const { title, narrow, started, persistent, mode, onMode, modeLocked, onStart, onRestart, primer, guide, bench, notebook, record } = props
  const head = (
    <>
      <PageHeader title={title} parent={{ to: '/lab', label: 'Lab' }} />
      {!persistent && (
        <p role="status" className="mb-4 max-w-prose rounded-md border p-3 text-sm">
          {NOT_SAVING_TEXT}
        </p>
      )}
    </>
  )

  // The bench is not mounted here, which is what closes a running stopcock when the window is made narrow.
  if (narrow) {
    return (
      <>
        {head}
        <div role="note" className="mb-4 grid max-w-prose gap-1 rounded-md border p-3 text-sm">
          <p className="font-medium">{NARROW_NOTICE.title}</p>
          <p>
            {NARROW_NOTICE.body} {started ? NARROW_NOTICE.withRun : NARROW_NOTICE.withoutRun}
          </p>
        </div>
        {primer(true)}
        {started && <div className="mt-4">{record}</div>}
      </>
    )
  }

  return (
    <>
      {head}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <ModeSwitch mode={mode} onChange={onMode} disabled={modeLocked} />
        {started ? (
          <Button variant="outline" onClick={() => window.confirm(SHELL_TEXT.restartConfirm) && onRestart()}>
            {SHELL_TEXT.restart}
          </Button>
        ) : (
          <Button
            onClick={() => {
              onStart()
              // This button goes with the click. Focus moves to the heading, as it does when a page opens.
              document.querySelector<HTMLElement>('main h1')?.focus()
            }}
          >
            {SHELL_TEXT.start}
          </Button>
        )}
      </div>
      {primer(!started)}
      {started && (
        <div className="lab-page mt-4">
          <div className={`lab-grid ${guide ? '' : 'lab-grid-no-guide'}`}>
            {guide && <div className="lab-guide">{guide}</div>}
            <div className="lab-bench">{bench}</div>
            <aside aria-label="Lab notebook" className="lab-notebook">
              {notebook}
            </aside>
            <div className="lab-record">{record}</div>
          </div>
        </div>
      )}
    </>
  )
}
