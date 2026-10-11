import { useEffect, useId, useRef, useState, type Ref } from 'react'
import { Disclosure } from '@/app/explore/InspectorCard'
import { Control } from '@/app/lab/Control'
import { Line, Mark, useSaid } from '@/app/lab/Line'
import { ROLE } from '@/app/lab/roles'
import { Marked, Step } from '@/app/lab/stationPieces'
import { WarningGroup } from '@/app/lab/WarningGroup'
import { bathOfRun, reagentOf, type ClockData, type RunId } from '@/chem-data/clock/data'
import { can, lookAt, reduce, runView, warnings, watchAt, type Action, type ClockModel, type ClockState } from '@/engine/clock'
import { FlaskDrawing } from './FlaskDrawing'
import {
  RECORD_TEXT,
  RUN_PROGRESS_TEXT,
  RUN_TEXT,
  WARNING_BUTTONS,
  WARNING_TEXT,
  blockedText,
  changeText,
  flasksText,
  liquidText,
  runOutcomeText,
  runProgressOf,
  runTitle,
  standLabel,
  temperatureText,
  watchStatusText,
  watchText,
  type RunProgress,
} from './messages'
import { MixtureTable } from './tables'
import { endsItself, frame, handStop, SPEED, startPlay } from './watch'

/** Beside a run's progress in words, and hidden from a screen reader, which is given the words. */
const RUN_MARK: Record<RunProgress, string> = { 'not-started': '○', 'under-way': '◔', running: '◑', 'not-counted': '✕', counts: '✓' }

/** A run's progress as a mark and its words; the tick of a run that counts is in the role of a done mark. */
export function RunProgressLabel({ progress }: { progress: RunProgress }) {
  return (
    <Marked mark={RUN_MARK[progress]} done={progress === 'counts'}>
      {RUN_PROGRESS_TEXT[progress]}
    </Marked>
  )
}

export interface RunCardProps {
  data: ClockData
  m: ClockModel
  /** The lab as it is stored. */
  state: ClockState
  run: RunId
  /**
   * The true time at which this run's flasks were poured, in milliseconds, while its watch is being played; null
   * otherwise. The pour is the page's until the watch is stopped: it is stored together with the stop, so that a
   * run that is left with its watch running has no time recorded.
   */
  startedAt: number | null
  /** The learner has asked for the watch to be stopped at the change, and the way to say so. Kept from run to run. */
  atChange: boolean
  onAtChange(next: boolean): void
  /** This run was left while its watch was running, and has been set back to before its pour. */
  left: boolean
  reducedMotion: boolean
  act(actions: readonly Action[]): void
  /** The flasks are poured and the watch started, now. */
  onPour(): void
  /** The watch is stopped, with the engine's action for how. */
  onStop(stop: Action): void
  /** The run's heading, which takes focus when the run comes to be shown. */
  headingRef?: (element: HTMLHeadingElement | null) => void
}

const names = (data: ClockData) => ({ a: RUN_TEXT.flaskA, b: RUN_TEXT.flaskB, indicator: reagentOf(data, data.rateLaw.end.indicatorId).name })
const bathOf = (data: ClockData, run: RunId) => data.baths.find((bath) => bath.id === bathOfRun(run)) ?? null

/**
 * One run (spec 19.2): its head, and then what can be worked now. Until the pour: the mixture as a table, and the
 * two flasks, drawn, with what has been done to them in words and the buttons that make them ready and pour them.
 * From the pour: the watch and the liquid, which is the one card, with the mixture and what was done to the flasks
 * behind two disclosures that are closed. So the flask that is watched and the watch are on the page with nothing
 * else to read.
 */
export function RunCard(props: RunCardProps) {
  const { data, m, state, run, startedAt, act, headingRef } = props
  const headingId = useId()
  const placeId = useId()
  const heading = useRef<HTMLHeadingElement | null>(null)
  // While the watch is played, the lab as it will be stored at the stop: the stored lab, with this run poured.
  const live = startedAt === null ? state : reduce(m, state, { type: 'pour', run })
  const view = runView(m, live, run)
  return (
    <section aria-labelledby={headingId} className="grid min-w-0 gap-3">
      <div className="grid gap-1">
        <p id={placeId} className="text-xs text-muted-foreground">
          {RECORD_TEXT.attempt(view.attempts)}
          {' · '}
          <span className="font-medium text-foreground">
            <RunProgressLabel progress={runProgressOf(view)} />
          </span>
        </p>
        <h2
          ref={(element) => {
            heading.current = element
            headingRef?.(element)
          }}
          id={headingId}
          tabIndex={-1}
          aria-describedby={placeId}
          className="w-fit rounded-sm text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {runTitle(data, run)}
        </h2>
      </div>
      {view.poured ? (
        <>
          <Watch
            // A watch of its own for each attempt, there from its pour: nothing of the one before is carried over. It is the same watch when it is stopped, so that focus can go to how the run came out.
            key={view.attempts}
            {...props}
            live={live}
            onAgain={() => {
              act([{ type: 'runAgain', run }])
              heading.current?.focus()
            }}
          />
          <div className="grid gap-2 pb-1">
            <Disclosure summary={RUN_TEXT.mixture}>
              <MixtureTable data={data} run={run} />
            </Disclosure>
            <Disclosure summary={RUN_TEXT.flasks}>
              <p className="max-w-prose text-sm">{flasksText(data, run, view)}</p>
            </Disclosure>
          </div>
        </>
      ) : (
        <>
          <Step heading={RUN_TEXT.mixture}>
            <MixtureTable data={data} run={run} />
          </Step>
          <Flasks key={view.attempts} {...props} />
        </>
      )}
    </section>
  )
}

/**
 * The two flasks before the pour: the drawing, what has been done in words in a status line beside it, and the
 * buttons, each a finger tall. A step that is taken carries a tick and reads as done; one that cannot be taken now
 * stays focusable and says why when pressed. In Guided, a pour that would not count raises the warning, which
 * takes focus: the way back puts focus on the step that was skipped, and the way on pours.
 */
function Flasks({ data, m, state, run, left, act, onPour }: RunCardProps) {
  const view = runView(m, state, run)
  const [said, say] = useSaid(left ? RUN_TEXT.left : '', left)
  const [warned, setWarned] = useState(false)
  const indicatorRef = useRef<HTMLButtonElement>(null)
  const standRef = useRef<HTMLButtonElement>(null)
  const warningRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (warned) warningRef.current?.focus()
  }, [warned])
  const pour: Action = { type: 'pour', run }
  const warns = warnings(m, state, pour)
  // A warning that is showing is of a pour Guided would warn of now. Once it would not, it is dropped.
  if (warned && warns.length === 0) setWarned(false)
  const press = (action: Action) => {
    setWarned(false)
    const blocked = can(m, state, action)
    if (blocked !== null) return say(blockedText(data, blocked), true)
    say('')
    act([action])
  }
  const pourPressed = () => {
    const blocked = can(m, state, pour)
    if (blocked !== null) {
      setWarned(false)
      return say(blockedText(data, blocked), true)
    }
    if (warns.length === 0) return onPour()
    say('')
    // Raised again by the same press, it takes focus again.
    if (warned) warningRef.current?.focus()
    else setWarned(true)
  }
  const step = (action: Action, label: string, taken: boolean, ref?: Ref<HTMLButtonElement>) => {
    const blocked = can(m, state, action)
    return (
      <Control ref={ref} unavailable={blocked !== null} dimmed={blocked !== null && !taken} variant={taken ? 'secondary' : 'outline'} className="h-auto min-h-11 px-4 py-1.5 text-left whitespace-normal" onClick={() => press(action)}>
        <span>
          {taken && (
            <span aria-hidden="true" className={ROLE.done}>
              ✓{' '}
            </span>
          )}
          {label}
        </span>
      </Control>
    )
  }
  const bath = bathOf(data, run)
  const inBath = view.flasks !== 'bench'
  return (
    <Step heading={RUN_TEXT.flasks}>
      <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2">
        <FlaskDrawing view={view} look="before" lookWord={data.rateLaw.end.before.value} names={names(data)} bath={bath} reading={view.thermometerTenths === null ? null : temperatureText(view.thermometerTenths)} />
        <div className="grid max-w-prose flex-1 basis-40 gap-1">
          {/* The flasks in words, said again whenever something is done to them. */}
          <p role="status" className="font-medium">
            {flasksText(data, run, view)}
          </p>
          <p className="text-muted-foreground">{liquidText(data, 'before', false)}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {step({ type: 'addIndicator', run }, view.indicator ? RUN_TEXT.starchDone : RUN_TEXT.starch, view.indicator, indicatorRef)}
        {bath !== null && (
          <>
            {step({ type: 'standInBath', run }, standLabel(data, run, inBath), inBath)}
            {step({ type: 'letStand', run }, view.flasks === 'stood' ? RUN_TEXT.letStandDone(data) : RUN_TEXT.letStand(data), view.flasks === 'stood', standRef)}
            {step({ type: 'readThermometer', run }, RUN_TEXT.read, view.thermometerTenths !== null)}
          </>
        )}
        <Control unavailable={can(m, state, pour) !== null} variant="default" className="h-auto min-h-11 px-4 py-1.5 text-left whitespace-normal" onClick={pourPressed}>
          {RUN_TEXT.pour}
        </Control>
      </div>
      {warned && warns.length > 0 && (
        <WarningGroup
          ref={warningRef}
          warnings={warns.map((warning) => ({ id: warning, ...WARNING_TEXT[warning] }))}
          buttons={WARNING_BUTTONS}
          onBack={() => {
            // To the first step that was skipped.
            const skipped = warns[0] === 'no-indicator' ? indicatorRef : standRef
            setWarned(false)
            skipped.current?.focus()
          }}
          onGoOn={onPour}
        />
      )}
      <Line said={said} />
    </Step>
  )
}

/**
 * The watch and the liquid (spec 19.2): the flask that holds the mixture, drawn large, with the look of its liquid
 * in words under it and beside it; the watch, in figures large enough to read across a bench; and the two ways of
 * stopping it, side by side from the pour on.
 *
 * While the run is played, every frame asks the engine what the liquid looks like at the time on the watch
 * (watch.ts). When it changes, the flask is drawn in its new colour at once, the words beside it change, and a
 * status line says the change, once, to a screen reader. Nothing else here is a live region: a watch that spoke
 * its figures would speak over the change. Stopping by hand is a button that has focus from the pour, so that a
 * key stops the watch as a finger does. "Stop the watch for me at the change" can be pressed at any time before or
 * after the change, stays pressed for the runs that follow, and is taken back by pressing it again.
 *
 * Once the watch is stopped the card says what it reads and how the run came out, which takes focus, and offers
 * the run again where it did not count. A run whose stored record is poured with no stop, which this page never
 * stores, is drawn with its watch at nothing and not running: stopping it ends it, and it is then made again.
 */
function Watch({ data, m, run, live, startedAt, atChange, onAtChange, reducedMotion, onStop, onAgain }: RunCardProps & { live: ClockState; onAgain(): void }) {
  const view = runView(m, live, run)
  const playing = startedAt !== null && view.stopped === null
  const playRef = useRef(startedAt === null ? null : startPlay(startedAt))
  const [play, setPlay] = useState(playRef.current)
  // What a frame reads when it is drawn: the lab and the learner's choice as they are at that moment.
  const latest = useRef({ live, atChange, onStop })
  useEffect(() => {
    latest.current = { live, atChange, onStop }
  })
  const [said, say] = useSaid()
  const stopRef = useRef<HTMLButtonElement>(null)
  const outcomeRef = useRef<HTMLDivElement>(null)
  const limit = m.watchLimitMs

  useEffect(() => {
    if (!playing) return
    // The watch is started by the press that poured, and the button that was pressed is gone: the way to stop it has focus.
    stopRef.current?.focus()
    let handle = requestAnimationFrame(function draw() {
      const now = performance.now()
      const next = frame(playRef.current!, now, SPEED[run], limit, (labMs) => lookAt(m, latest.current.live, run, labMs) === 'after')
      playRef.current = next
      setPlay(next)
      const ends = endsItself(next, limit, latest.current.atChange)
      // At its limit the watch stops itself: as a hand would stop it there, unless it was to be stopped at the change.
      if (ends !== null) return latest.current.onStop(ends === 'change' || latest.current.atChange ? { type: 'stopAtEnd', run } : { type: 'stop', run, ...handStop(next, now, limit) })
      handle = requestAnimationFrame(draw)
    })
    return () => cancelAnimationFrame(handle)
  }, [playing, run, m, limit])

  // How the run came out takes focus when the watch is stopped. Never on load.
  const over = view.stopped !== null
  const wasOver = useRef(over)
  useEffect(() => {
    if (over && !wasOver.current) outcomeRef.current?.focus()
    wasOver.current = over
  }, [over])

  const labMs = play?.labMs ?? 0
  const look = lookAt(m, live, run, labMs)
  const tenths = watchAt(m, live, run, labMs)
  const stopByHand = () => {
    if (playRef.current === null) return onStop({ type: 'stop', run, elapsedMs: 0, delayMs: 0 })
    const now = performance.now()
    const at = frame(playRef.current, now, SPEED[run], limit, (ms) => lookAt(m, live, run, ms) === 'after')
    onStop({ type: 'stop', run, ...handStop(at, now, limit) })
  }
  const again: Action = { type: 'runAgain', run }
  return (
    <Step heading={RUN_TEXT.watch}>
      <div className="flex w-full flex-wrap items-center gap-x-5 gap-y-3">
        <FlaskDrawing
          view={view}
          look={look}
          lookWord={data.rateLaw.end[look].value}
          names={names(data)}
          bath={bathOf(data, run)}
          reading={null}
          turned={playing && play?.shown != null && !reducedMotion}
        />
        <div className="grid flex-1 basis-48 gap-2">
          {/* The watch: a timer, which is not spoken as it runs, named by what it reads. */}
          <p role="timer" aria-label={watchStatusText(view, tenths, m)} className="w-fit rounded-xl border-2 border-foreground px-4 py-2 font-mono text-5xl leading-none font-semibold tabular-nums">
            {watchText(tenths)}
          </p>
          {over ? <p>{watchStatusText(view, tenths, m)}</p> : <p className="text-muted-foreground">{RUN_TEXT.fast}</p>}
          <p className="font-medium">{liquidText(data, look, true)}</p>
          {/* Always there, and empty until the liquid changes, so that a screen reader says the change when it comes. */}
          <p role="status" className="font-semibold">
            {look === 'after' && changeText(data)}
          </p>
        </div>
      </div>
      {over ? (
        <>
          {/* Room about the words, taken back from the card's own, so that the ring that shows where focus went does not hug them. */}
          <div ref={outcomeRef} tabIndex={-1} className="-mx-2 -my-1 max-w-prose rounded-md px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <p>
              <Mark ok={view.outcome.state === 'counts'} />
              {runOutcomeText(m, view.outcome, view.stopped, can(m, live, again) !== 'lab-completed')}
            </p>
          </div>
          {view.outcome.state === 'does-not-count' && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <Control
                unavailable={can(m, live, again) !== null}
                className="min-h-11 px-4"
                onClick={() => {
                  const blocked = can(m, live, again)
                  if (blocked !== null) return say(blockedText(data, blocked), true)
                  onAgain()
                }}
              >
                {RUN_TEXT.runAgain}
              </Control>
              <p className="max-w-prose flex-1 basis-48 text-muted-foreground">{RUN_TEXT.runAgainHelp}</p>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex w-full flex-wrap gap-2">
            <Control ref={stopRef} unavailable={false} variant="default" className="min-h-14 flex-1 basis-40 px-6 text-base font-semibold" onClick={stopByHand}>
              {RUN_TEXT.stop}
            </Control>
            {/* Pressed, it stays pressed: the watch of this run and of the runs after it stops at the change. Once the change has shown, a press stops the watch there at once. */}
            <Control unavailable={false} aria-pressed={atChange} variant={atChange ? 'secondary' : 'outline'} className="h-auto min-h-14 flex-1 basis-40 px-4 py-1.5 whitespace-normal" onClick={() => (play?.shown != null || !playing ? onStop({ type: 'stopAtEnd', run }) : onAtChange(!atChange))}>
              <span>
                {atChange && (
                  <span aria-hidden="true" className={ROLE.done}>
                    ✓{' '}
                  </span>
                )}
                {RUN_TEXT.stopAtChange}
              </span>
            </Control>
          </div>
          <div className="grid max-w-prose gap-1 text-muted-foreground">
            <p>{RUN_TEXT.stopHelp}</p>
            <p>{RUN_TEXT.stopAtChangeHelp}</p>
          </div>
        </>
      )}
      <Line said={said} />
    </Step>
  )
}
