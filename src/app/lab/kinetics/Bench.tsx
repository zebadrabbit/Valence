import { Fragment, useEffect, useRef, useState, type ReactNode, type SyntheticEvent } from 'react'
import { Disclosure, Sources } from '@/app/explore/InspectorCard'
import { openingStation } from '@/app/lab/openingStation'
import { Paged } from '@/app/lab/Paged'
import { ROLE } from '@/app/lab/roles'
import { Listed, Marked, Step } from '@/app/lab/stationPieces'
import { Button } from '@/components/ui/button'
import type { Citation } from '@/chem-data/citations'
import type { Action, KineticsLab, PartSpec, State } from './engine'
import { tooSoon } from './play'
import { PartProgressLabel } from './Record'
import { TimesTable } from './tables'
import { RunProgressLabel } from './Watch'

/** The entry of a part the Lab tab shows when the page opens: the first of its runs that does not count yet; where all do, the notebook, in the part that has one after its runs, and else the first run. */
export const openingEntry = ({ engine, m }: Pick<KineticsLab, 'engine' | 'm'>, state: State, part: Pick<PartSpec, 'runs' | 'sheet'>): number => {
  const waiting = part.runs.findIndex((run) => engine.runView(m, state, run).outcome.state !== 'counts')
  return waiting >= 0 ? waiting : part.runs.length > 0 && part.sheet !== null ? part.runs.length : 0
}

/** What the bench hands a lab's own card for a run, which the lab draws: the run as the bench is playing it, and what a press on it does. */
export interface RunOnBench {
  /**
   * The true time at which this run was poured, in milliseconds, while its watch is being played; null otherwise.
   * The pour is the page's until the watch is stopped: it is stored together with the stop, so that a run that is
   * left with its watch running has no time recorded.
   */
  startedAt: number | null
  /** The learner has asked for the watch to be stopped at the change, and the way to say so. Kept from run to run. */
  atChange: boolean
  onAtChange(next: boolean): void
  /** This run was left while its watch was running, and has been set back to before its pour. */
  left: boolean
  act(actions: readonly Action[]): void
  /** The run is poured and the watch started, now. */
  onPour(): void
  /** The watch is stopped, with the engine's action for how. */
  onStop(stop: Action): void
  /** The run's heading, which takes focus when the run comes to be shown. */
  headingRef(element: HTMLHeadingElement | null): void
}

export interface KineticsBenchProps {
  lab: KineticsLab
  /** The lab as it is stored. */
  state: State
  /** False while another tab of the page is the one shown: the bench stays mounted, and no watch may go on running unseen. */
  shown: boolean
  /** The actions done, in order, and the lab saved once. */
  act(actions: readonly Action[]): void
  /** The part and the entry of it shown when the bench mounts; where the stored record says the learner was, unless told. The markup tests draw the others with it. */
  opensAt?: { part: string; entry?: number } | undefined
  /** The sources of each part. */
  citations: Record<string, readonly Citation[]>
  /** A tile for each bottle on the bench, with its hazards closed. */
  bottles: ReactNode
  /** The lab's own card for a run. */
  run(runId: string, on: RunOnBench): ReactNode
  /** The lab's own notebook for a part that has one; `shown` is false while something else is on the screen. */
  notebook(part: PartSpec, shown: boolean): ReactNode
}

/**
 * The Lab tab of a lab on the kinetics engine. A navigation of its parts, each with how far it has come; and of
 * the part shown, one thing at a time: a run; a notebook, under the table of times it is worked from; or, in a
 * part that has both, its runs and then its notebook. Under the ways on, on every entry, the sources and the bench
 * with every bottle's hazards, closed.
 *
 * The bench holds what the page plays and does not store: which run's watch is running and since when, whether the
 * learner has asked for the watch to be stopped at the change, and which part and entry are shown. A watch runs
 * only while its run is on the screen. Leaving it, for another run or part, for another tab of the page or of the
 * browser, ends the play with nothing stored, so the run is as it was before the pour, and says so when it is
 * shown again (spec 19.8). For the first half second after a pour the bench takes no press at all.
 */
export function KineticsBench({ lab, state, shown, act, opensAt, citations, bottles, run: runCard, notebook: sheetOf }: KineticsBenchProps) {
  const { engine, m, words, parts } = lab
  const ids = parts.map((one) => one.id)
  const [play, setPlay] = useState<{ run: string; startedAt: number } | null>(null)
  const [left, setLeft] = useState<string | null>(null)
  const [atChange, setAtChange] = useState(false)
  // While a watch is played, the lab as it will be stored at the stop.
  const live = play === null ? state : engine.reduce(m, state, { type: 'pour', run: play.run })
  const progress = lab.progress(live)
  const [part, setPart] = useState<string>(() => opensAt?.part ?? ids[openingStation(ids.map((id) => progress[id]!))]!)
  const [entries, setEntries] = useState<Record<string, number>>(() => ({ ...Object.fromEntries(parts.map((one) => [one.id, openingEntry(lab, state, one)])), ...(opensAt?.entry === undefined ? {} : { [opensAt.part]: opensAt.entry }) }))
  // The notebooks that have been shown: each stays drawn after it, hidden, and keeps what was typed in it.
  const [visited, setVisited] = useState<readonly string[]>([`${part}:${entries[part]}`])
  const headings = useRef<Record<string, HTMLHeadingElement | null>>({})
  const place = `${part}:${entries[part]}`
  const was = useRef(place)
  useEffect(() => {
    if (was.current !== place) headings.current[place]?.focus()
    was.current = place
  }, [place])

  // A notebook that is worked again is a new working, from empty, and the button that asked for it is gone with the card it stood in: the notebook's heading takes focus, as a run's does when it is made again.
  const workings = parts.map((one) => (one.sheet === null ? 0 : state.sheets[one.sheet].length)).join(':')
  const hadWorkings = useRef(workings)
  useEffect(() => {
    if (hadWorkings.current !== workings) headings.current[place]?.focus()
    hadWorkings.current = workings
  }, [workings, place])

  /** The play is ended with nothing stored, and its run says so when it is next shown. */
  const leave = () => {
    if (play === null) return
    setLeft(play.run)
    setPlay(null)
  }
  // No watch runs unseen: not behind another tab of the page, and not in a tab of the browser that is hidden.
  useEffect(() => {
    if (play === null) return
    const drop = () => {
      setLeft(play.run)
      setPlay(null)
    }
    if (!shown) return drop()
    const onHidden = () => void (document.hidden && drop())
    document.addEventListener('visibilitychange', onHidden)
    return () => document.removeEventListener('visibilitychange', onHidden)
  }, [play, shown])

  const go = (toPart: string, toEntry = entries[toPart]!) => {
    const to = `${toPart}:${toEntry}`
    if (to !== place) leave()
    setPart(toPart)
    setEntries({ ...entries, [toPart]: toEntry })
    if (!visited.includes(to)) setVisited([...visited, to])
    // What is already shown: its heading takes focus all the same, as the list is closed under it.
    if (to === place) headings.current[place]?.focus()
  }
  /**
   * A press that comes within half a second of the pour is the pour's own, come twice, and the bench takes none:
   * not Stop, which has focus by then, and not whatever the watch's card has brought to where the pour stood,
   * which at 768 by 1024 is Stop, the other way of stopping and a disclosure (play.ts).
   */
  const pourTwice = (event: SyntheticEvent) => {
    // By when the press was made, as the browser has it, and not by when the page came to it: a page that is slow to draw the watch must not take the pour's second press for a later one. Never later than now, for a browser that counts an event's time from another origin.
    if (play === null || !tooSoon(play, Math.min(event.timeStamp, performance.now()))) return
    event.preventDefault()
    event.stopPropagation()
  }
  const completed = state.status === 'completed'
  const untouched = ids.every((id) => progress[id] === 'not-started')

  const run = (runId: string, key: string) => (
    <Fragment key={runId}>
      {runCard(runId, {
        startedAt: play?.run === runId ? play.startedAt : null,
        atChange,
        onAtChange: setAtChange,
        left: left === runId,
        act: (actions) => {
          // Once something more is done at the run, that it was left has been read.
          setLeft(null)
          act(actions)
        },
        onPour: () => {
          setLeft(null)
          setPlay({ run: runId, startedAt: performance.now() })
        },
        onStop: (stop) => {
          // The pour is stored with the stop, and not before it.
          act(play?.run === runId ? [{ type: 'pour', run: runId }, stop] : [stop])
          setPlay(null)
        },
        headingRef: (element) => void (headings.current[key] = element),
      })}
    </Fragment>
  )
  /** A part's notebook, under a heading that takes focus: drawn from the first time it is shown, and hidden after that while something else is. */
  const notebook = (of: PartSpec, key: string) =>
    visited.includes(key) && (
      <div hidden={key !== place} className="grid gap-3">
        <div className="grid gap-1">
          <h2 ref={(element) => void (headings.current[key] = element)} tabIndex={-1} className="w-fit rounded-sm text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {words.partTitle(of.id)}
          </h2>
          <p className="max-w-prose text-sm">
            {words.partAim(of.id)} {words.partDoneWhen(of.id)}
          </p>
        </div>
        <Step heading={words.table.caption}>
          <TimesTable lab={lab} state={state} runs={of.timed} />
          <p className="text-muted-foreground">{words.table.use}</p>
        </Step>
        {sheetOf(of, shown && place === key)}
      </div>
    )
  /**
   * Under the ways on, on every entry: the table of times where the entry is a run, the sources of the part, and
   * the bench. Each closed. Each is a line of words with a hit area a finger tall laid over it, which reaches 12 px
   * over and under a closed one and 24 px over an open one: they stand far enough apart, and far enough under the
   * ways on, that no area lies over another, as the Group I cations lab's and the Le Chatelier lab's do.
   */
  const foot = (of: PartSpec) => (
    <div className="mt-4 grid gap-9 pb-3">
      {entries[of.id]! < of.runs.length && (
        <Disclosure summary={words.table.caption}>
          <TimesTable lab={lab} state={state} runs={of.timed} />
        </Disclosure>
      )}
      <Sources citations={[...citations[of.id]!]} derived={words.sources} />
      <Disclosure summary={words.page.bench}>
        <Listed items={words.benchLines(engine.roomTenths(m, state))} />
        <p className="font-medium">{words.page.hazards}</p>
        <div className="grid w-full gap-2 sm:grid-cols-2">{bottles}</div>
      </Disclosure>
    </div>
  )
  /** The way to the part before and the part after, as the paged list draws its own ways on. */
  const between = (before: string | null, after: string | null) => (
    <div className="flex flex-wrap justify-between gap-2">
      {before !== null && (
        <Button variant="outline" className="lab-tap h-auto min-h-9 max-w-full py-1.5 text-left whitespace-normal" onClick={() => go(before)}>
          <span aria-hidden="true">←</span> {words.page.previous(words.partTitle(before))}
        </Button>
      )}
      {after !== null && (
        <Button variant="outline" className="lab-tap ml-auto h-auto min-h-9 max-w-full py-1.5 text-left whitespace-normal" onClick={() => go(after)}>
          {words.page.next(words.partTitle(after))} <span aria-hidden="true">→</span>
        </Button>
      )}
    </div>
  )
  const beside = (of: PartSpec, by: number) => ids[ids.indexOf(of.id) + by] ?? null
  /** A part that has runs: how many of them count, and its runs one at a time (Paged), with the notebook after them in the part that has one. */
  const paged = (of: PartSpec) => {
    const { runs } = of
    const counting = runs.filter((runId) => engine.runView(m, live, runId).outcome.state === 'counts').length
    const items = [
      ...runs.map((runId) => ({ id: runId, heading: words.runTitle(runId), note: <RunProgressLabel words={words} view={engine.runView(m, live, runId)} /> })),
      ...(of.sheet !== null ? [{ id: 'notebook', heading: words.notebook.notebook, note: <PartProgressLabel words={words} progress={progress[of.id]!} /> }] : []),
    ]
    const shownRun = runs[entries[of.id]!]
    const next = beside(of, 1)
    return (
      <>
        <div className="grid gap-1 text-sm">
          {/* What the part finds and what makes it done, until it is begun; from then, how many of its runs count, said again each time one more does. */}
          {progress[of.id] === 'not-started' && (
            <p className="max-w-prose">
              {words.partAim(of.id)} {words.partDoneWhen(of.id)}
            </p>
          )}
          <p role="status" className="font-medium">
            {progress[of.id] !== 'not-started' && words.runsCount(counting, runs.length)}
          </p>
          {/* A part with no notebook has none to carry its notes: once its runs count and not before, they are here, closed. Room under them, so that the hit area of the line, which reaches 12 px under it, does not lie over that of the button of the list of runs, which on an upright tablet stands next under it. */}
          {of.sheet === null && progress[of.id] === 'done' && (
            <div className="pb-2">
              <Disclosure summary={words.notebook.notes}>
                <div className="grid max-w-[75ch] gap-2 leading-relaxed">
                  {words.partNotes(of.id).map((note) => (
                    <p key={note}>{note}</p>
                  ))}
                </div>
              </Disclosure>
            </div>
          )}
        </div>
        <Paged
          roomy
          items={items}
          index={entries[of.id]!}
          onGo={(to) => go(of.id, to)}
          text={{ list: words.page.runs, previous: words.page.previous, next: words.page.next }}
          after={
            <>
              {/* At the last entry of a part the paged list has no way on: the way on is to the next part. */}
              {entries[of.id] === items.length - 1 && next !== null && between(null, next)}
              {foot(of)}
            </>
          }
        >
          {shownRun !== undefined && run(shownRun, `${of.id}:${entries[of.id]}`)}
          {of.sheet !== null && notebook(of, `${of.id}:${runs.length}`)}
        </Paged>
      </>
    )
  }
  /** A part stays drawn once it has been shown, hidden while another is, where it holds a notebook: what was typed there and not yet entered is kept. */
  const drawn = (of: PartSpec) => of.id === part || (of.sheet !== null && visited.some((key) => key.startsWith(`${of.id}:`)))

  return (
    // A key's press is caught as it goes down, where its own time is known: the click it makes is made when the page comes to it.
    <div className="grid gap-3" onClickCapture={pourTwice} onKeyDownCapture={(event) => void ((event.key === 'Enter' || event.key === ' ') && pourTwice(event))}>
      {/* Always there, and empty until the lab is complete, so that a screen reader says it when it comes; while it is empty it takes no room, the gap under it neither. */}
      <p role="status" className={`max-w-prose text-sm font-medium ${completed ? '' : '-mb-3'}`}>
        {completed && <Marked mark="✓" done>{words.lab.complete}</Marked>}
      </p>
      {completed && <p className={`max-w-prose text-sm ${ROLE.held}`}>{words.blocked('lab-completed')}</p>}
      {untouched && <p className="max-w-prose text-sm">{words.lab.aim}</p>}
      <nav aria-label={words.page.parts} className={`grid ${parts.length === 2 ? 'grid-cols-2' : 'grid-cols-3'} gap-1.5 text-sm`}>
        {parts.map(({ id }) => {
          const [number, name] = words.partTitle(id).split(': ')
          return (
            <button
              key={id}
              type="button"
              aria-current={id === part ? 'true' : undefined}
              onClick={() => go(id)}
              className="group grid min-h-11 content-start rounded-md border border-l-4 px-2 py-1 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring aria-[current]:border-foreground aria-[current]:bg-muted aria-[current]:font-medium"
            >
              {/* The two small lines are grey on the page's ground. On the grey ground of the part that is shown, and of one the pointer is over, grey on grey measured 4.35 to 1 in the light theme: there they are in the page's own ink. */}
              <span className="text-xs font-normal text-muted-foreground group-hover:text-foreground group-aria-[current]:text-foreground">{number}</span>
              <span>{name}</span>
              <span className="text-xs font-normal text-muted-foreground group-hover:text-foreground group-aria-[current]:text-foreground">
                <PartProgressLabel words={words} progress={progress[id]!} />
              </span>
            </button>
          )
        })}
      </nav>
      {parts.map(
        (of) =>
          drawn(of) && (
            <div key={of.id} hidden={of.id !== part} className="grid gap-3">
              {of.runs.length === 0 ? (
                <>
                  {notebook(of, `${of.id}:0`)}
                  {between(beside(of, -1), beside(of, 1))}
                  {foot(of)}
                </>
              ) : (
                paged(of)
              )}
            </div>
          ),
      )}
    </div>
  )
}
