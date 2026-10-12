import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ACTIVITIES } from '@/app/activities'
import { useAppState } from '@/app/AppState'
import { Disclosure } from '@/app/explore/InspectorCard'
import { Line, Mark, useSaid } from '@/app/lab/Line'
import { ModeSwitch } from '@/app/lab/ModeSwitch'
import { Notice, PeriodicTableLink } from '@/app/lab/pagePieces'
import { useLabProgress } from '@/app/lab/useLabProgress'
import { PageHeader } from '@/app/PageHeader'
import { NOT_SAVING_TEXT } from '@/app/progress/storage'
import { Button } from '@/components/ui/button'
import { registry } from '@/chem-data/registry'
import {
  PREDICTION,
  chapterHeading,
  chapterStart,
  createProgress,
  hclNahco3 as mechanism,
  mechanismProgressSchema,
  pendingPrediction,
  predictionFeedback,
  reduce,
  state as stateAt,
  type Action,
  type MechanismProgress,
} from '@/mechanisms'
import { EnergyPanel } from './EnergyPanel'
import { SceneFrame, SceneList, useScene } from './SceneFrame'
import { MODE_TEXT, PAGE_TEXT, REFUSAL, announcement, chapterName, completedText, sceneWords, withheld } from './text'
import { Timeline } from './Timeline'
import { entersChapter, playedTo, ways } from './timeline'
import '@/app/lab/lab.css'

const [, , , , , , , , , , , MECHANISM] = ACTIVITIES
// One schema for the page's life: a stored run is held to the mechanism's record as it is read.
const SCHEMA = mechanismProgressSchema(mechanism)
/** What the page shows before anything is stored: a run at the start of the track, in Guided. */
const FRESH = createProgress('guided')

/**
 * #/learn/hcl-nahco3: the mechanism timeline (spec 9). The scrub position is the stored run's, read once when the
 * page mounts; every action of the learner's that the engine takes is saved as it is taken, and nothing is saved
 * by opening the page, so Home goes on saying "Not started" until the learner does something. Playing is shown
 * frame by frame and written when it enters a chapter and when it stops, not at every frame. A deep link
 * (`?step=proton-transfer`) opens at its chapter's start without saving either: the place is shown, and is the
 * run's from the first action on, when the address drops the link so that a reload comes back to where the learner
 * was and not to where the link pointed.
 *
 * Everything drawn and said of the scene is a function of the scrub position (`state(mechanism, t)`), with nothing
 * eased or kept between two positions. Playing is the one clock on the page: it asks the engine to advance, which
 * in Challenge stops at the start of a step whose question is not answered.
 */
export function MechanismPage() {
  const { persistent, reducedMotion, dark } = useAppState()
  const [stored, save, { setAside, taken }] = useLabProgress(MECHANISM, SCHEMA)
  const [params, setParams] = useSearchParams()
  const step = params.get('step')
  // The run a deep link shows, until the learner acts: `step` is the link it was made for.
  const [link, setLink] = useState<{ step: string | null; run: MechanismProgress | null }>({ step: null, run: null })
  if (step !== link.step) {
    const start = step === null ? null : chapterStart(mechanism, step)
    setLink({ step, run: start === null ? null : reduce(mechanism, stored ?? FRESH, { type: 'seek', t: start }) })
  }
  // The run as playing has shown it since it was last written. Null when what is stored is what is shown.
  const [played, setPlayed] = useState<MechanismProgress | null>(null)
  const [playing, setPlaying] = useState(false)
  // Under the reduced-motion setting nothing moves by itself, also when the setting is turned on while playing.
  if (playing && reducedMotion) setPlaying(false)
  // Another tab has saved a run of the timeline: this tab takes it, stops, and drops what it had played on from the old one.
  const [seen, setSeen] = useState(taken)
  if (taken !== seen) {
    setSeen(taken)
    setPlayed(null)
    setPlaying(false)
  }
  const run = link.run ?? played ?? stored ?? FRESH
  const t = run.position
  const now = stateAt(mechanism, t)
  const [looked, setLooked] = useState<number | null>(null)
  // A species is looked at by its place among those of the scene. When the scene's species change (the solid comes
  // apart, a proton has crossed) that place is another's, so the look is dropped and no callout names the wrong thing.
  const made = now.species.map((one) => one.atoms.join()).join(';')
  const [lookedAmong, setLookedAmong] = useState(made)
  if (made !== lookedAmong) {
    setLookedAmong(made)
    setLooked(null)
  }
  const [said, say] = useSaid()
  const scene = useScene()
  const descriptionId = useId()
  const heading = useRef<HTMLHeadingElement>(null)
  const answered = useRef(false)

  /** Writes the run as it now is. The place a deep link showed is the run's own from here, and the address no longer points anywhere else. */
  const write = (next: MechanismProgress) => {
    save(next)
    setPlayed(null)
    if (link.run) setLink({ step, run: null })
    if (step !== null) setParams({}, { replace: true, state: { keepFocus: true } })
  }
  const reached = (next: MechanismProgress) => {
    if (next.status === 'completed' && run.status !== 'completed') say(completedText(mechanism, next))
  }
  /** Does an action if the engine takes it, saves the run, and hands back the run as it then is. */
  const act = (action: Action): MechanismProgress => {
    const next = reduce(mechanism, run, action)
    if (next === run) return run
    write(next)
    reached(next)
    return next
  }
  /**
   * One frame of playing, on to `t`. It is shown, and it is written only where it enters a chapter, where playing
   * stops at it (the end of the track, a question), or where it is the first after a deep link.
   */
  const frame = (t: number): MechanismProgress => {
    const next = reduce(mechanism, run, { type: 'advance', t })
    if (next === run) return run
    const stops = next.position >= 1 || pendingPrediction(mechanism, next) !== null
    if (stops || link.run || entersChapter(mechanism, run.position, next.position)) write(next)
    else setPlayed(next)
    reached(next)
    return next
  }

  // What the clock of playing calls, as the latest render has it. A layout effect, so that the clock's own clean-up, which runs after it, writes what this render shows.
  const live = useRef({ frame, position: run.position, flush: () => {} })
  useLayoutEffect(() => {
    live.current = {
      frame,
      position: run.position,
      /** Writes what playing has shown and not yet written. */
      flush: () => {
        if (!played) return
        save(played)
        setPlayed(null)
      },
    }
  })
  useEffect(() => {
    if (!playing) return
    let last: number | null = null
    let position = live.current.position
    let handle = requestAnimationFrame(function tick(now) {
      const elapsed = last === null ? 0 : now - last
      last = now
      const next = live.current.frame(playedTo(position, elapsed))
      // The first frame has no time behind it and moves nothing; from then on a frame that moves nothing is a stop.
      const stopped = elapsed > 0 && (next.position === position || next.position >= 1 || pendingPrediction(mechanism, next) !== null)
      position = next.position
      if (stopped) setPlaying(false)
      else handle = requestAnimationFrame(tick)
    })
    // Playing is written when it stops, however it stops: Pause, a move by hand, the page left or closed.
    const leave = () => live.current.flush()
    window.addEventListener('pagehide', leave)
    return () => {
      cancelAnimationFrame(handle)
      window.removeEventListener('pagehide', leave)
      live.current.flush()
    }
  }, [playing])

  // A tap anywhere but on the scene or on the list puts the callout away: a finger does not leave as a mouse pointer does.
  useEffect(() => {
    if (looked === null) return
    const away = (event: PointerEvent) => {
      if (!(event.target instanceof Element && event.target.closest('[data-look]'))) setLooked(null)
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [looked])

  // The buttons of a question are gone once it is answered: focus goes to the chapter's heading, over the feedback.
  useEffect(() => {
    if (!answered.current) return
    answered.current = false
    heading.current?.focus()
  })

  const { chapter } = now
  const question = pendingPrediction(mechanism, run)
  const kept = withheld(mechanism, run)
  const name = (chapterId: string) => chapterName(mechanism, chapterId, kept)
  const description = sceneWords(mechanism, run, registry.elements)
  const { previous, next } = ways(mechanism, t)
  const answer = run.mode === 'challenge' && chapter.kind === 'step' ? run.answers.find((given) => given.questionId === chapter.question?.id) : undefined
  const feedback = answer ? predictionFeedback(mechanism, answer.questionId, answer.optionId) : null

  /** A move made by hand stops the playing, and clears what the line last said. */
  const move = (action: Action) => {
    setPlaying(false)
    say('')
    act(action)
  }

  return (
    <>
      <PageHeader title={mechanism.title} parent={{ to: '/learn', label: 'Learn' }} />
      {!persistent && <Notice>{NOT_SAVING_TEXT}</Notice>}
      {setAside && <Notice>{PAGE_TEXT.setAside}</Notice>}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <ModeSwitch mode={run.mode} onChange={(mode) => act({ type: 'setMode', mode })} text={MODE_TEXT} />
          {/* Once a run is stored there is one to start again. It asks first, as a lab's Restart does. */}
          {stored && (
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => {
                if (!window.confirm(PAGE_TEXT.startAgainConfirm)) return
                setPlaying(false)
                setLooked(null)
                act({ type: 'restart' })
                say(PAGE_TEXT.startedAgain)
              }}
            >
              {PAGE_TEXT.startAgain}
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-2">
          <EnergyPanel mechanism={mechanism} t={t} kept={kept} />
          <PeriodicTableLink />
        </div>
      </div>
      {/* Spoken when the timeline enters a chapter, and at no other move of it (spec 9.1). The heading shows the same to the eye. */}
      <p role="status" className="sr-only">
        {announcement(mechanism, run)}
      </p>

      {/* lab-panel is lab.css's class for a part of a page whose disclosures each have a finger's hit area. */}
      <div className="lab-panel @container">
        <div className="grid items-start gap-4 @2xl:grid-cols-[minmax(0,1fr)_17rem] @4xl:grid-cols-[minmax(0,3fr)_minmax(17rem,2fr)]">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
            <div>
              <SceneFrame mechanism={mechanism} state={now} description={description} describedBy={descriptionId} looked={looked} onLook={setLooked} dark={dark} {...scene} />
              {chapter.kind !== 'bookend' && !scene.failed && <p className="mt-1 text-sm text-muted-foreground">{PAGE_TEXT.sceneHint}</p>}
            </div>
            <Timeline
              mechanism={mechanism}
              t={t}
              kept={kept}
              playing={playing}
              reducedMotion={reducedMotion}
              held={question !== null}
              onSeek={(to) => move({ type: 'seek', t: to })}
              onPrevious={() => (previous ? move({ type: 'seek', t: previous.to }) : say(REFUSAL.first, true))}
              onNext={() => (next === null ? say(REFUSAL.last, true) : question ? say(REFUSAL.answerFirst, true) : move({ type: 'advance', t: next.to }))}
              onPlay={() => {
                if (playing) return setPlaying(false)
                if (question) return say(REFUSAL.answerFirst, true)
                say('')
                if (t >= 1) act({ type: 'seek', t: 0 })
                setPlaying(true)
              }}
              line={<Line said={said} />}
            />
            {/* The picture's description for assistive technology: a browser does not read it out of a closed <details>, so it has a hidden copy. */}
            <p id={descriptionId} hidden>
              {description}
            </p>
            {/* Where there is no 3D scene the frame holds these words, open; a bookend's frame holds the beaker, so the words are here. */}
            {(!scene.failed || chapter.kind === 'bookend') && (
              <details className="max-w-prose text-sm">
                <summary className="w-fit cursor-pointer rounded-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">{PAGE_TEXT.description}</summary>
                <p className="mt-1 text-muted-foreground">{description}</p>
              </details>
            )}
          </div>

          <div className="grid min-w-0 gap-4">
            <section className="grid justify-items-start gap-3 rounded-lg border bg-card p-4 text-sm">
              <div className="grid max-w-prose gap-1">
                {question ? (
                  <>
                    <p className="text-muted-foreground">{name(chapter.id)}</p>
                    <h2 className="text-base font-semibold">{PREDICTION.lead}</h2>
                  </>
                ) : (
                  <h2 ref={heading} tabIndex={-1} className="w-fit rounded-sm text-base font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {chapterHeading(mechanism, chapter.id)}
                  </h2>
                )}
                {/* Always there, and empty until a question of this chapter has been answered, so that the feedback is spoken when it comes. */}
                <div role="status" className="grid gap-1">
                  {feedback && !question && (
                    <>
                      <p className="text-muted-foreground">
                        {PAGE_TEXT.prediction}: {chapter.kind === 'step' && chapter.question?.options.find((option) => option.id === answer?.optionId)?.text}
                      </p>
                      <p>
                        <Mark ok={feedback.correct} />
                        {feedback.text}
                      </p>
                    </>
                  )}
                </div>
              </div>
              {question && (
                <>
                  <p className="max-w-prose">{question.prompt}</p>
                  <ul className="grid w-full gap-2">
                    {question.options.map((option) => (
                      <li key={option.id}>
                        {/* One press answers: a button drawn as the labs' choice boxes are, not a radio button, which an arrow key would choose. */}
                        <Button
                          variant="outline"
                          className="h-auto min-h-11 w-full justify-start py-2 text-left whitespace-normal"
                          onClick={() => {
                            answered.current = true
                            act({ type: 'answer', questionId: question.id, optionId: option.id })
                          }}
                        >
                          {option.text}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {!question && (
                <>
                  <p className="max-w-prose">{chapter.explanation.intro}</p>
                  {/* Keyed by the chapter, so that it is closed again in the next one. */}
                  <div key={chapter.id} className="max-w-prose">
                    <Disclosure summary={PAGE_TEXT.more}>
                      <p>{chapter.explanation.expanded}</p>
                    </Disclosure>
                  </div>
                  <Link to={{ search: `?step=${chapter.id}` }} state={{ keepFocus: true }} className="inline-flex min-h-11 items-center rounded-sm text-sm underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {PAGE_TEXT.link}
                  </Link>
                </>
              )}
            </section>
            {chapter.kind !== 'bookend' && <SceneList mechanism={mechanism} state={now} looked={looked} onLook={setLooked} asked={question !== null} />}
          </div>
        </div>
      </div>
    </>
  )
}
