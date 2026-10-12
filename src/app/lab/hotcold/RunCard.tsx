import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Disclosure, Sources } from '@/app/explore/InspectorCard'
import { Control } from '@/app/lab/Control'
import { Hazards } from '@/app/lab/Hazards'
import { Line, Mark, useSaid } from '@/app/lab/Line'
import { ROLE } from '@/app/lab/roles'
import { Listed, Marked, Step } from '@/app/lab/stationPieces'
import { WarningGroup } from '@/app/lab/WarningGroup'
import { hotcoldCitations } from '@/chem-data/citations'
import { saltOf, type HotcoldData, type SaltId } from '@/chem-data/hotcold/data'
import type { Source } from '@/chem-data/schema'
import type { Action, Blocked, HotcoldModel, Mode, RunView, Warning } from '@/engine/hotcold'
import { CupDrawing } from './CupDrawing'
import { Graph } from './Graph'
import { BENCH_TEXT, PAGE_TEXT, PART_AIM, PROGRESS_TEXT, RECORD_TEXT, SOURCES_TEXT, WARNING_BUTTONS, WARNING_TEXT, addLabel, benchLines, blockedText, cupText, describeGraph, foldedText, outcomeText, partNotes, partTitle, pointCallout, progressOf, type Progress } from './messages'
import { Notebook } from './Notebook'

/** Beside a part's progress in words, and hidden from a screen reader, which is given the words. */
export const PROGRESS_MARK: Record<Progress, string> = { 'not-started': '○', cup: '◔', notebook: '◑', 'not-counted': '◑', done: '✓', waiting: '○', answers: '◑', 'not-right': '◑' }

/** A part's progress as a mark and its words; the tick of a part done is in the role of a done mark. */
export function ProgressLabel({ progress }: { progress: Progress }) {
  return (
    <Marked mark={PROGRESS_MARK[progress]} done={progress === 'done'}>
      {PROGRESS_TEXT[progress]}
    </Marked>
  )
}

export interface RunCardProps {
  data: HotcoldData
  m: HotcoldModel
  sources: readonly Source[]
  /** The salt this part runs. */
  part: SaltId
  mode: Mode
  view: RunView
  reducedMotion: boolean
  /** Why an action cannot be done now, or null; the errors of technique it would make, in Guided; and the action done. The page's, so that the card holds no state of the lab. */
  can(action: Action): Blocked | null
  warn(action: Action): Warning[]
  act(action: Action): void
  /** The part's heading, which takes focus when the part comes to be shown. */
  headingRef?: (element: HTMLHeadingElement | null) => void
}

/**
 * A card of a run. While the cup is being set up it is the shell's card, open. Once the salt is in, the bench and
 * the cup are what was done: each is handed its one line, and is drawn as its heading over a disclosure that is
 * closed, whose summary is that line. Everything the card held is still in it.
 */
function Card({ heading, folded, children }: { heading: string; folded: string | null; children: ReactNode }) {
  if (folded === null) return <Step heading={heading}>{children}</Step>
  return (
    <Step heading={heading}>
      <div className="w-full">
        <Disclosure summary={folded}>
          <div className="grid justify-items-start gap-3">{children}</div>
        </Disclosure>
      </div>
    </Step>
  )
}

/**
 * One salt's part of the lab: its head, then one run of it as a column of cards (Run), and its Sources. The head
 * says which run this is and how far the part has come, what the part finds, in both modes and without saying
 * which way the temperature goes, and that the part is done once it is. A new run of the part is a new column:
 * nothing typed or said in the one before is carried over, and its heading takes focus.
 */
export function RunCard(props: RunCardProps) {
  const { data, sources, part, view, can, act, headingRef } = props
  const headingId = useId()
  const placeId = useId()
  const heading = useRef<HTMLHeadingElement | null>(null)
  // What stands beside a sentence on which way the heat went is listed once the run counts, and not before.
  const cited = useMemo(() => hotcoldCitations(data, part, sources, view.done), [data, part, sources, view.done])
  // Whatever holds a whole part holds every button here. It is said once, at the part's head.
  const completed = can({ type: 'runAgain', part }) === 'lab-completed'
  return (
    <section aria-labelledby={headingId} className="grid min-w-0 gap-3">
      <div className="grid gap-1">
        <p id={placeId} className="text-xs text-muted-foreground">
          {RECORD_TEXT.run(view.runs)}
          {' · '}
          <span className="font-medium text-foreground">
            <ProgressLabel progress={progressOf(view)} />
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
          {partTitle(data, part)}
        </h2>
        <p className="max-w-prose text-sm">{PART_AIM[part]}</p>
        {/* Always there, and empty until the part is done, so that a screen reader says it when it comes. */}
        <p role="status" className="text-sm font-medium">
          {view.done && <Marked mark="✓" done>{BENCH_TEXT.done}</Marked>}
        </p>
        {completed && <p className={`text-sm ${ROLE.held}`}>{blockedText(data, part, 'lab-completed')}</p>}
      </div>
      <Run
        key={view.runs}
        {...props}
        onRunAgain={() => {
          act({ type: 'runAgain', part })
          heading.current?.focus()
        }}
      />
      {/* Room over it and under it: an open disclosure's hit area stands on its line and reaches 24 px up, toward the last disclosure of the card above; a closed one's reaches 12 px under its line, toward Previous, in the row below. */}
      <div className="pt-4 pb-2">
        <Sources citations={cited} derived={SOURCES_TEXT} />
      </div>
    </section>
  )
}

/**
 * One run of a salt, as a column of cards, each there when the engine has a use for it: the bench, with the
 * balance's reading and the salt's hazards; the cup, drawn, with its state in words and the buttons that set it up
 * and put the salt in; once the logger is started, the graph, to be explored, with "Run on" over it; once the salt
 * is in, the notebook; and once there is a run to leave behind, how this run came out, with "Run this part again".
 * A button that cannot be used now stays focusable and says why when pressed.
 *
 * In Guided the engine's warnings are advisory. Adding the salt with the lid off or the stirrer still raises the
 * warning in the cup's card, and the warning takes focus: the way back puts focus on the step that was skipped,
 * and the way on adds the salt. When the notebook is checked, focus goes to how the run came out.
 *
 * Once the salt is in, the bench and the cup fold, each under one line (Card): nothing more is done to the cup but
 * to let time pass, which is done at the graph, so that the graph and the notebook are near one another and a run
 * is about one screen. The press that adds the salt is made in the cup's card: as the cards fold, the window is
 * scrolled by as much as that card moved, so that it stays where it was under the hand, and focus goes to its
 * line. Nothing over "Run on" changes after that, so it does not move as it is pressed. A run that is opened with
 * its salt already in is drawn folded, and nothing is moved.
 *
 * The run keeps what is typed and not yet entered, the reading last looked at, a warning that is showing and what
 * its message lines last said; everything the lab stores comes to it as `view` and leaves it through `act`.
 */
function Run({ data, m, sources, part, mode, view, reducedMotion, can, warn, act, onRunAgain }: RunCardProps & { onRunAgain(): void }) {
  const seenId = useId()
  const [cupSaid, sayOfCup] = useSaid()
  const [graphSaid, sayOfGraph] = useSaid()
  const [outcomeSaid, sayOfOutcome] = useSaid()
  const [lookSaid, sayOfLook] = useSaid()
  // The action Guided has warned of and has not been answered on.
  const [asked, setAsked] = useState<Action | null>(null)
  const buttons = useRef<Partial<Record<Action['type'], HTMLButtonElement | null>>>({})
  const warningRef = useRef<HTMLDivElement>(null)
  const outcomeRef = useRef<HTMLDivElement>(null)
  const cupRef = useRef<HTMLDivElement>(null)
  // Where the top of the cup's card was in the window when the salt was added from it; null but for that moment.
  const foldFrom = useRef<number | null>(null)
  // A warning takes focus when it is raised, and again when the same press raises it again.
  useEffect(() => {
    if (asked !== null) warningRef.current?.focus()
  }, [asked])
  // The notebook's own controls go when it is checked: focus goes to what the check found. Never on load.
  const over = view.outcome.state !== 'open'
  const wasOver = useRef(over)
  useEffect(() => {
    if (over && !wasOver.current) outcomeRef.current?.focus()
    wasOver.current = over
  }, [over])

  const { cup, graph, bench } = view
  const again: Action = { type: 'runAgain', part }
  // The cards that are history once the salt is in, each in one line; null while the cup is set up.
  const folded = cup.saltAdded ? foldedText(data, part, view) : null
  const isFolded = folded !== null
  // Before the window is drawn again: the bench's card, over the cup's, has just lost most of its height.
  useLayoutEffect(() => {
    const card = cupRef.current?.closest('section')
    if (isFolded && foldFrom.current !== null && card) {
      window.scrollBy({ top: card.getBoundingClientRect().top - foldFrom.current, behavior: 'instant' })
      card.querySelector('summary')?.focus({ preventScroll: true })
    }
    foldFrom.current = null
  }, [isFolded])
  // A warning that is showing is of an action Guided would warn of now. Once it would not (the lid was put on, the mode was changed to Challenge), it is dropped, and does not come back by itself.
  if (asked !== null && warn(asked).length === 0) setAsked(null)

  /**
   * A press of a button: refused with the engine's reason, which `say` puts on the line of the button's own card;
   * or, where Guided warns of it and has not been answered, asked about; or done. Any press drops a warning that
   * was showing for another.
   */
  const press = (action: Action, say = sayOfCup, answered = false) => {
    const blocked = can(action)
    if (blocked !== null) {
      setAsked(null)
      return say(blockedText(data, part, blocked), true)
    }
    say('')
    // A copy, so that the same press made again is a new warning to the effect that gives it focus.
    if (!answered && warn(action).length > 0) return setAsked({ ...action })
    setAsked(null)
    if (action.type === 'addSalt') foldFrom.current = cupRef.current?.closest('section')?.getBoundingClientRect().top ?? null
    act(action)
  }
  const pressRunOn = () => {
    // A logger that is full with no salt in, or with a curve that has not turned, leaves no notebook to open.
    if (can({ type: 'runOn', part }) === 'logger-full' && !graph.turned) {
      setAsked(null)
      return sayOfGraph(BENCH_TEXT.spent, true)
    }
    press({ type: 'runOn', part }, sayOfGraph)
  }
  /** A reading of the graph is looked at: stored the first time, where the engine takes it, and said each time. A part that is read and not worked stores nothing and can still be looked at. */
  const look = (step: number) => {
    const action: Action = { type: 'look', part, step }
    if (!graph.looked.includes(step) && can(action) === null) act(action)
    sayOfLook(pointCallout(m, step, graph.readings[step]!))
  }
  /**
   * A button of the cup. One that names a step already taken carries a tick and is not drawn faint, for as long as
   * the run is shown: whatever else holds the cup by then, the ticks say how this run's cup was worked.
   */
  const step = (action: Action, label: string, taken: boolean, say = sayOfCup, onClick = () => press(action, say)) => {
    const blocked = can(action)
    return (
      <Control ref={(element) => void (buttons.current[action.type] = element)} unavailable={blocked !== null} dimmed={blocked !== null && !taken} variant={taken ? 'secondary' : 'outline'} className="min-h-11 px-4" onClick={onClick}>
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
  const raised = asked === null ? [] : warn(asked)
  const salt = saltOf(data, part)

  return (
    <>
      {/* What the reading looked at shows, for a screen reader: the eye has the callout on the graph. */}
      <div className="sr-only">
        <Line said={lookSaid} />
      </div>

      <Card heading={BENCH_TEXT.bench} folded={folded && folded.bench}>
        <Listed items={benchLines(data, part, bench)} />
        {/* The salt's name and its hazards. It is in no bottle on this bench: it is weighed out. Its formula is under its name, since Epsom salt's says what it is. */}
        <div role="group" aria-label={salt.name} className="grid w-full max-w-md content-start justify-items-start gap-1.5 rounded-md border p-2">
          <h4 className="font-medium">
            {salt.name} <span className="font-normal text-muted-foreground">{salt.formula}</span>
          </h4>
          <Hazards classifiedAs={salt.classifiedAs} hazards={salt.hazards} sources={sources} solid />
        </div>
      </Card>

      <Card heading={BENCH_TEXT.cup} folded={folded && folded.cup}>
        <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2">
          <CupDrawing cup={cup} reducedMotion={reducedMotion} />
          {/* The cup's state in words, said again whenever it changes. Beside the drawing at every width that shows a bench. */}
          <p role="status" className="max-w-prose flex-1 basis-48 font-medium">
            {cupText(data, part, cup, graph.readings.length)}
          </p>
        </div>
        <div ref={cupRef} className="grid w-full justify-items-start gap-1.5">
          <div className="flex flex-wrap gap-1.5">
            {step({ type: 'putLidOn', part }, BENCH_TEXT.lid, cup.lidOn)}
            {step({ type: 'stir', part }, BENCH_TEXT.stir, cup.stirring)}
            {step({ type: 'startLogger', part }, BENCH_TEXT.logger, cup.loggerStarted)}
            {step({ type: 'addSalt', part }, addLabel(data, part), cup.saltAdded)}
          </div>
          {asked !== null && raised.length > 0 && (
            <WarningGroup
              ref={warningRef}
              warnings={raised.map((one) => ({ id: one, ...WARNING_TEXT[one] }))}
              buttons={WARNING_BUTTONS}
              onBack={() => {
                // To the first step that was skipped.
                const to = raised[0] === 'lid-off' ? 'putLidOn' : 'stir'
                setAsked(null)
                buttons.current[to]?.focus()
              }}
              onGoOn={() => press(asked, sayOfCup, true)}
            />
          )}
          <Line said={cupSaid} />
        </div>
      </Card>

      {cup.loggerStarted && (
        <Step heading={BENCH_TEXT.graph}>
          {/* Time passes here, beside the picture it adds to. Nothing over this button changes as it is pressed, so that it stays under the hand; what it is told is under it. */}
          <div className="grid w-full justify-items-start gap-1.5">
            <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5">
              {step({ type: 'runOn', part }, BENCH_TEXT.runOn, false, sayOfGraph, pressRunOn)}
              <p className="max-w-prose flex-1 basis-48 text-muted-foreground">{BENCH_TEXT.runOnHelp(m)}</p>
            </div>
            <Line said={graphSaid} />
          </div>
          {/* What to do with the picture, and the keys that move along it, as one paragraph: it is the picture's description. What a reading is, is not said here: a point says it when it is looked at. */}
          <p id={seenId} className="max-w-prose">
            {BENCH_TEXT.explore} <span className="text-muted-foreground">{PAGE_TEXT.arrows}</span>
          </p>
          <Graph m={m} graph={graph} describedBy={seenId} onLook={look} />
          {/* Closed: it names the readings the notebook's two temperatures are taken from, which the learner is to find on the graph. */}
          <Disclosure summary={PAGE_TEXT.inWords}>
            <p className="max-w-prose">{describeGraph(m, graph)}</p>
          </Disclosure>
        </Step>
      )}

      {cup.saltAdded && (
        <Step heading={BENCH_TEXT.notebook}>
          <div className="grid w-full justify-items-start gap-3">
            <Notebook
              data={data}
              part={part}
              mode={mode}
              entries={view.worksheet}
              full={graph.full}
              enter={(field, value) => {
                const action: Action = { type: 'enter', part, field, value }
                const blocked = can(action)
                if (blocked === null) act(action)
                return blocked
              }}
              checkBlocked={can({ type: 'check', part })}
              onCheck={() => act({ type: 'check', part })}
            />
          </div>
        </Step>
      )}

      {(over || view.done || (can(again) === null && (cup.saltAdded || graph.full))) && (
        <Step heading={PAGE_TEXT.outcome}>
          {/* Room about the words, taken back from the card's own, so that the ring that shows where focus went does not hug them. */}
          <div ref={outcomeRef} tabIndex={-1} className="-mx-2 -my-1 grid max-w-prose gap-2 rounded-md px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {view.outcome.state === 'open' ? (
              <p className="text-muted-foreground">{RECORD_TEXT.open}</p>
            ) : (
              <p>
                <Mark ok={view.outcome.state === 'counts'} />
                {outcomeText(view.outcome, can(again) !== 'lab-completed')}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <Control
              unavailable={can(again) !== null}
              className="min-h-11 px-4"
              onClick={() => {
                const blocked = can(again)
                if (blocked !== null) return sayOfOutcome(blockedText(data, part, blocked), true)
                onRunAgain()
              }}
            >
              {BENCH_TEXT.runAgain}
            </Control>
            <p className="max-w-prose flex-1 basis-48 text-muted-foreground">{BENCH_TEXT.runAgainHelp}</p>
          </div>
          <Line said={outcomeSaid} />
          {/* Once a run of the part counts and not before, and closed: what the record says of the part. Room over it: open, its hit area reaches 24 px up from its line, toward the button above. */}
          {view.expected !== null && (
            <div className="pt-2">
              <Disclosure summary={BENCH_TEXT.notes}>
                <div className="grid max-w-[75ch] gap-2 leading-relaxed">
                  {partNotes(data, part).map((note) => (
                    <p key={note}>{note}</p>
                  ))}
                </div>
              </Disclosure>
            </div>
          )}
        </Step>
      )}
    </>
  )
}
