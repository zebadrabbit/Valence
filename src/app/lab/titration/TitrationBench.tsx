import { useId, useState, type ReactNode, type Ref } from 'react'
import { Disclosure } from '@/app/explore/InspectorCard'
import type { Source } from '@/chem-data/schema'
import type { TitrationData } from '@/chem-data/titration/data'
import type { Action } from '@/engine/titration'
import { ACTION_TEXT, additionMessage, describeStand, flaskStatus, SLOW_DOWN_TEXT, STOPCOCK_ALREADY_CLOSED, streamMessage, swirlText, undoneText } from './benchText'
import type { BenchAction, BenchView } from './benchView'
import { flaskColour } from './flaskColour'
import { blockedText, OUTCOME_TEXT, readingRecordedText } from './messages'
import { ReadingInput, type ReadingReply } from './ReadingInput'
import { MeniscusWords, ReadingView } from './ReadingView'
import { Shelf } from './Shelf'
import { StopcockControls } from './StopcockControls'
import type { Stream } from './stream'
import { TitrationStand } from './TitrationStand'
import { useStream } from './useStream'
import './bench.css'

export interface TitrationBenchProps {
  view: BenchView
  /** The record's four drawing parameters. */
  display: { pinkDisplayScale: number; faintPinkNameLimit: number; plumeFadeAtOnceSeconds: number; plumeFadeSlowlySeconds: number }
  bottles: TitrationData['bottles']
  sources: readonly Source[]
  /** From the page, so that the bench reads no app state. */
  reducedMotion: boolean
  /** 'done': the action was taken. 'asked': it is held for a Guided warning, shown in `notice`. 'refused': the engine blocked it. */
  onAction(action: BenchAction): 'done' | 'asked' | 'refused'
  onReading(readingUl: number): ReadingReply
  /** The action the learner went on with after a warning, handed back by the page until the next action. */
  confirmed?: BenchAction | Extract<Action, { type: 'recordInitialReading' }> | null
  /** A Guided warning, drawn under the message line. Nothing else goes here. */
  notice?: ReactNode
  /** The bench itself, which can take focus: the page moves it here when a new trial starts. */
  ref?: Ref<HTMLElement>
}

/**
 * What the message line has to say: a text as it stands, or an action that was done, with the view it was done on.
 * What an action did is worded from the view after it, which the bench has only once the page has handed it back.
 */
export interface Said {
  text: string
  done?: { action: BenchAction; before: BenchView }
}

/** A press this soon after the stopcock closed itself was aimed at closing it, and does nothing. */
const CLOSED_BY_ITSELF_MS = 600

const doneText = (action: BenchAction, previous: string) =>
  action.type !== 'deliver' ? ACTION_TEXT[action.type] : action.amount === 'stream' ? '' : additionMessage(action.amount, previous)

/** The message line: what the last action did, or why the last press did nothing. Pure, exported for its test. */
export function messageLine(said: Said, view: BenchView, stream: Stream): string {
  if (!said.done) return said.text
  const { action, before } = said.done
  // The trial ended at the last mark with no pink: said here, at the bench, as well as in the notebook's result.
  if (before.trialEnd === 'open' && view.trialEnd === 'ran-out') return OUTCOME_TEXT[action.type === 'addWater' ? 'washed-out' : 'ran-out']
  // A stream says that it is open and that it has closed, however it closed; its additions say nothing.
  if (action.type === 'deliver' && action.amount === 'stream') return streamMessage(stream)
  if (action.type === 'swirlAndWait') return view.persistence === 'unchecked' ? '' : swirlText(view.persistence)
  const undone = undoneText(before, view)
  return undone === '' ? said.text : `${said.text} ${undone}`
}

/**
 * The bench: the shelf, the burette on its stand with the stopcock's buttons, and the enlarged scale with the field
 * a reading is typed in. It holds no engine state. Every action goes to the page and the view comes back; what it
 * keeps is the open stopcock and what the message line last said.
 */
export function TitrationBench({ view, display, bottles, sources, reducedMotion, onAction, onReading, confirmed = null, notice, ref }: TitrationBenchProps) {
  const [said, setSaid] = useState<Said>({ text: '' })
  const [handedBack, setHandedBack] = useState(confirmed)
  // Counts the actions done, as the key of the reading field: its reply is of a reading the action may have cleared.
  // A reading recorded after a warning is not counted, so the field that focus returns to is still the one it left.
  const [actionsDone, setActionsDone] = useState(0)
  const standWordsId = useId()
  const meniscusWordsId = useId()
  const { stream, open, close, closedBySelfAt } = useStream(view.controls.deliver === null, () => void onAction({ type: 'deliver', amount: 'stream' }), view.slowDown)

  // The page hands an action back once the learner has gone on with it after a warning: it is said as any other is.
  if (confirmed !== handedBack) {
    setHandedBack(confirmed)
    if (confirmed?.type === 'recordInitialReading') setSaid({ text: readingRecordedText('initial', confirmed.readingUl) })
    else if (confirmed) {
      setSaid({ text: doneText(confirmed, said.text) })
      setActionsDone(actionsDone + 1)
    }
  }

  const act = (action: BenchAction) => {
    // Whatever else is picked up, the stopcock is closed first.
    close()
    const answer = onAction(action)
    if (answer === 'done') {
      setSaid({ text: doneText(action, said.text), done: { action, before: view } })
      setActionsDone((count) => count + 1)
    }
    const reason = view.controls[action.type]
    if (answer === 'refused' && reason !== null) setSaid({ text: blockedText(reason) })
  }
  const toggle = (pour: number | null) => {
    if (stream.open) return close()
    if (closedBySelfAt !== null && performance.now() - closedBySelfAt < CLOSED_BY_ITSELF_MS) return setSaid({ text: STOPCOCK_ALREADY_CLOSED })
    if (view.controls.deliver !== null) return setSaid({ text: blockedText(view.controls.deliver) })
    open(pour)
    setSaid({ text: '', done: { action: { type: 'deliver', amount: 'stream' }, before: view } })
  }

  const standWords = describeStand(view, stream, display)
  return (
    <section ref={ref} aria-label="Bench" tabIndex={-1} className="bench rounded-lg border bg-card p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <h2 className="sr-only">Bench</h2>
      <div className="bench-grid">
        <Shelf view={view} bottles={bottles} sources={sources} act={act} />
        <div role="group" aria-label="Burette and flask" className="bench-stand-group grid content-start gap-2 text-sm">
          <div className="bench-stand-row">
            <div className="bench-drawing">
              <TitrationStand
                burette={view.burette}
                flask={view.flask}
                plume={view.plume}
                plumeKey={view.plumeKey}
                plumeFadeSeconds={{ atOnce: display.plumeFadeAtOnceSeconds, slowly: display.plumeFadeSlowlySeconds }}
                colour={flaskColour({ ...view.flask, hasLiquid: view.flask.hasAliquot, ...display })}
                stopcockOpen={stream.open}
                reducedMotion={reducedMotion}
                describedBy={standWordsId}
              />
            </div>
            <StopcockControls
              stream={stream}
              controls={view.controls}
              onClearTip={() => act({ type: 'clearTipBubble' })}
              onAdd={(amount) => act({ type: 'deliver', amount })}
              onToggle={toggle}
              onSwirl={() => act({ type: 'swirlAndWait' })}
            />
          </div>
          <p id={standWordsId} hidden>
            {standWords}
          </p>
          <p role="status">{flaskStatus(view, display)}</p>
          {/* Guided's hint. Always there, and empty until it applies, so that a screen reader says it when it comes. */}
          <p role="status">{view.slowDown ? SLOW_DOWN_TEXT : ''}</p>
          <p role="status">{messageLine(said, view, stream)}</p>
          {notice}
          <Disclosure summary="Text description of the burette and flask">
            <p className="text-muted-foreground">{standWords}</p>
          </Disclosure>
        </div>
        <div role="group" aria-label="Burette reading" className="bench-reading-group grid content-start gap-2">
          <div className="bench-drawing">
            <ReadingView levelUl={view.burette.levelUl} filled={view.burette.filled} running={stream.open} describedBy={meniscusWordsId} />
          </div>
          <MeniscusWords id={meniscusWordsId} levelUl={view.burette.levelUl} filled={view.burette.filled} running={stream.open} />
          <ReadingInput
            key={actionsDone}
            wanted={view.readingWanted}
            blockedText={view.readingBlocked === null ? null : blockedText(view.readingBlocked)}
            onReading={(readingUl) => {
              // A burette is not read while it runs.
              close()
              return onReading(readingUl)
            }}
          />
        </div>
      </div>
    </section>
  )
}
