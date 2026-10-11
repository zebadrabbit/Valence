import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Control } from '@/app/lab/Control'
import { Line, Mark, useSaid } from '@/app/lab/Line'
import { ROLE } from '@/app/lab/roles'
import { Marked, Step } from '@/app/lab/stationPieces'
import type { Action, KineticsLab, RunProgress, RunView, State, Words } from './engine'
import { endsItself, frame, handStop, startPlay } from './play'
import { watchText } from './text'

/** Beside a run's progress in words, and hidden from a screen reader, which is given the words. */
const RUN_MARK: Record<RunProgress, string> = { 'not-started': '○', 'under-way': '◔', running: '◑', 'not-counted': '✕', counts: '✓' }

/** A run's progress as a mark and its words; the tick of a run that counts is in the role of a done mark. */
export function RunProgressLabel({ words, view }: { words: Words; view: RunView }) {
  const progress = words.runProgressOf(view)
  return (
    <Marked mark={RUN_MARK[progress]} done={progress === 'counts'}>
      {words.runProgress[progress]}
    </Marked>
  )
}

/**
 * The second way of stopping the watch, at the change itself: a button that stays pressed, with a tick for the
 * eye. It stands beside the pour before a watch is started, so that a learner who cannot or would rather not time
 * by eye can say so before the first run, and beside Stop while one runs. What a press does is its card's to say.
 */
export function AtChange({ label, pressed, className, onPress }: { label: string; pressed: boolean; className: string; onPress(): void }) {
  return (
    <Control unavailable={false} aria-pressed={pressed} variant={pressed ? 'secondary' : 'outline'} className={`h-auto px-4 py-1.5 text-left whitespace-normal ${className}`} onClick={onPress}>
      <span>
        {pressed && (
          <span aria-hidden="true" className={ROLE.done}>
            ✓{' '}
          </span>
        )}
        {label}
      </span>
    </Control>
  )
}

/** A run's head, and under it whatever of the run can be worked now: which attempt it is and how it stands, and its name as a heading that takes focus when the run comes to be shown. */
export function RunFrame({ words, run, view, headingRef, children }: { words: Words; run: string; view: RunView; headingRef?: ((element: HTMLHeadingElement | null) => void) | undefined; children: ReactNode }) {
  const headingId = useId()
  const placeId = useId()
  return (
    <section aria-labelledby={headingId} className="grid min-w-0 gap-3">
      <div className="grid gap-1">
        <p id={placeId} className="text-xs text-muted-foreground">
          {words.record.attempt(view.attempts)}
          {' · '}
          <span className="font-medium text-foreground">
            <RunProgressLabel words={words} view={view} />
          </span>
        </p>
        <h2 ref={headingRef} id={headingId} tabIndex={-1} aria-describedby={placeId} className="w-fit rounded-sm text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {words.runTitle(run)}
        </h2>
      </div>
      {children}
    </section>
  )
}

export interface WatchCardProps {
  lab: KineticsLab
  /** The lab as it will be stored at the stop: while the watch is played, the stored lab with this run poured. */
  live: State
  run: string
  /** How many seconds of the lab's time pass in one true second until the liquid changes: the lab's own figure for this run. */
  speed: number
  /** The true time at which this run was poured, in milliseconds, while its watch is being played; null otherwise. */
  startedAt: number | null
  /** The learner has asked for the watch to be stopped at the change, and the way to say so. Kept from run to run. */
  atChange: boolean
  onAtChange(next: boolean): void
  reducedMotion: boolean
  /** The watch is stopped, with the engine's action for how. */
  onStop(stop: Action): void
  /** The run is made again. */
  onAgain(): void
  /** Beside the running watch until the liquid changes: that the page plays the time faster than a clock, and how. */
  fast: string
  /**
   * The liquid when the watch reads `labMs`, which is the lab's own to draw and to word: its picture, its look as a
   * sentence, and what the status line under that says, which is empty until there is something to say. `turned`
   * is true while the watch runs once the change has been shown, where the reduced-motion setting allows a mark of it.
   */
  liquid(labMs: number, turned: boolean): { picture: ReactNode; sentence: string; said: string }
}

/**
 * The watch and the liquid (spec 19.2): the picture of the liquid, with its look in words beside it; the watch, in
 * figures large enough to read across a bench; and the two ways of stopping it, side by side from the pour on.
 *
 * While the run is played, every frame asks the engine what the liquid looks like at the time on the watch
 * (play.ts), and the lab draws and words it. A status line says what the lab has to say of it, to a screen reader
 * too. Nothing else here is a live region: a watch that spoke its figures would speak over the change. Stopping by
 * hand is a button that has focus from the pour, so that a key stops the watch as a finger does; the bench takes
 * no press for the first half second after the pour (Bench.tsx), so that a second press of the key that poured
 * does not end the run. The second way of stopping can be pressed before the pour, where it stands beside it, and
 * at any time before or after the change; it stays pressed for the runs that follow, and is taken back by pressing
 * it again.
 *
 * Once the watch is stopped the card says what it reads and how the run came out, which takes focus, and offers
 * the run again where it did not count. A run whose stored record is poured with no stop, which a page never
 * stores, is drawn with its watch at nothing and not running: stopping it ends it, and it is then made again.
 */
export function WatchCard({ lab: { engine, m, words }, live, run, speed, startedAt, atChange, onAtChange, reducedMotion, onStop, onAgain, fast, liquid }: WatchCardProps) {
  const view = engine.runView(m, live, run)
  const playing = startedAt !== null && view.stopped === null
  const playRef = useRef(startedAt === null ? null : startPlay(startedAt))
  const [play, setPlay] = useState(playRef.current)
  // One stop for one watch: a press that lands between the frame that ends a run and the drawing of its end is not a second stop.
  const sent = useRef(false)
  const stop = (action: Action) => {
    if (sent.current) return
    sent.current = true
    onStop(action)
  }
  // What a frame reads when it is drawn: the lab and the learner's choice as they are at that moment.
  const latest = useRef({ live, atChange, stop })
  useEffect(() => {
    latest.current = { live, atChange, stop }
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
      const next = frame(playRef.current!, now, speed, limit, (labMs) => engine.lookAt(m, latest.current.live, run, labMs) === 'after')
      playRef.current = next
      setPlay(next)
      const ends = endsItself(next, limit, latest.current.atChange)
      // At its limit the watch stops itself: as a hand would stop it there, unless it was to be stopped at the change.
      if (ends !== null) return latest.current.stop(ends === 'change' || latest.current.atChange ? { type: 'stopAtEnd', run } : { type: 'stop', run, ...handStop(next, now, limit) })
      handle = requestAnimationFrame(draw)
    })
    return () => cancelAnimationFrame(handle)
  }, [playing, run, speed, engine, m, limit])

  // How the run came out takes focus when the watch is stopped. Never on load.
  const over = view.stopped !== null
  const wasOver = useRef(over)
  useEffect(() => {
    if (over && !wasOver.current) outcomeRef.current?.focus()
    wasOver.current = over
  }, [over])

  const labMs = play?.labMs ?? 0
  const look = engine.lookAt(m, live, run, labMs)
  const tenths = engine.watchAt(m, live, run, labMs)
  const { picture, sentence, said: change } = liquid(labMs, playing && play?.shown != null && !reducedMotion)
  const stopByHand = () => {
    if (playRef.current === null) return stop({ type: 'stop', run, elapsedMs: 0, delayMs: 0 })
    const now = performance.now()
    const at = frame(playRef.current, now, speed, limit, (ms) => engine.lookAt(m, live, run, ms) === 'after')
    stop({ type: 'stop', run, ...handStop(at, now, limit) })
  }
  /** Pressed before the change, it stays pressed and the watch goes on. Pressed once the change has shown, it stops the watch there at once, and stays pressed too: the learner has said how the watch is to be stopped, for this run and the runs after it. */
  const atChangePressed = () => {
    if (play?.shown == null && playing) return onAtChange(!atChange)
    onAtChange(true)
    stop({ type: 'stopAtEnd', run })
  }
  const again: Action = { type: 'runAgain', run }
  return (
    <Step heading={words.run.watch}>
      <div className="flex w-full flex-wrap items-center gap-x-5 gap-y-3">
        {picture}
        <div className="grid flex-1 basis-48 gap-2">
          {/* The watch: a timer, which is not spoken as it runs, named by what it reads. */}
          <p role="timer" aria-label={words.watchStatus(view, tenths)} className="w-fit rounded-xl border-2 border-foreground px-4 py-2 font-mono text-5xl leading-none font-semibold tabular-nums">
            {watchText(tenths)}
          </p>
          {/* Until the liquid changes the lab's time runs faster than a clock, and the page says so; from the change the watch adds true time, and the line is gone. */}
          {over ? <p>{words.watchStatus(view, tenths)}</p> : look === 'before' && <p className="text-muted-foreground">{fast}</p>}
          <p className="font-medium">{sentence}</p>
          {/* Always there, and empty until the lab has something to say of the liquid, so that a screen reader says it when it comes. */}
          <p role="status" className="font-semibold">
            {change}
          </p>
        </div>
      </div>
      {over ? (
        <>
          {/* Room about the words, taken back from the card's own, so that the ring that shows where focus went does not hug them. */}
          <div ref={outcomeRef} tabIndex={-1} className="-mx-2 -my-1 max-w-prose rounded-md px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <p>
              <Mark ok={view.outcome.state === 'counts'} />
              {words.runOutcome(view.outcome, view.stopped, engine.can(m, live, again) !== 'lab-completed')}
            </p>
          </div>
          {view.outcome.state === 'does-not-count' && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <Control
                unavailable={engine.can(m, live, again) !== null}
                className="min-h-11 px-4"
                onClick={() => {
                  const blocked = engine.can(m, live, again)
                  if (blocked !== null) return say(words.blocked(blocked), true)
                  onAgain()
                }}
              >
                {words.run.runAgain}
              </Control>
              <p className="max-w-prose flex-1 basis-48 text-muted-foreground">{words.run.runAgainHelp}</p>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex w-full flex-wrap gap-2">
            <Control ref={stopRef} unavailable={false} variant="default" className="min-h-14 flex-1 basis-40 px-6 text-base font-semibold" onClick={stopByHand}>
              {words.run.stop}
            </Control>
            <AtChange label={words.run.stopAtChange} pressed={atChange} className="min-h-14 flex-1 basis-40" onPress={atChangePressed} />
          </div>
          <div className="grid max-w-prose gap-1 text-muted-foreground">
            <p>{words.run.stopHelp}</p>
            <p>{words.run.stopAtChangeHelp}</p>
          </div>
        </>
      )}
      <Line said={said} />
    </Step>
  )
}
