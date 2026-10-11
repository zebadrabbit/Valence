import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Disclosure, Sources } from '@/app/explore/InspectorCard'
import { Hazards } from '@/app/lab/Hazards'
import { openingStation } from '@/app/lab/openingStation'
import { Paged } from '@/app/lab/Paged'
import { ROLE } from '@/app/lab/roles'
import { BottleTile, Listed, Marked, Step } from '@/app/lab/stationPieces'
import { Button } from '@/components/ui/button'
import { clockCitations } from '@/chem-data/citations'
import { BATH_IDS, bathRunId, MIXTURE_IDS, PART_IDS, RUN_IDS, type ClockData, type PartId, type RunId } from '@/chem-data/clock/data'
import type { Source } from '@/chem-data/schema'
import { rateLawView, reduce, roomTenths, runView, temperatureView, type Action, type ClockModel, type ClockState } from '@/engine/clock'
import { LAB_TEXT, NOTEBOOK_TEXT, PAGE_TEXT, PART_AIM, PART_DONE_WHEN, PART_PROGRESS_TEXT, SOURCES_TEXT, TABLE_TEXT, benchLines, blockedText, partNotes, partProgressOf, partTitle, runProgressOf, runTitle, runsCountText, type PartProgress } from './messages'
import { RateLawNotebook, TemperatureNotebook } from './Notebook'
import { RunCard, RunProgressLabel } from './RunCard'
import { TimesTable } from './tables'

/** Beside a part's progress in words, and hidden from a screen reader, which is given the words. */
const PART_MARK: Record<PartProgress, string> = { 'not-started': '○', runs: '◔', notebook: '◑', 'not-counted': '◑', done: '✓' }

/** A part's progress as a mark and its words; the tick of a part done is in the role of a done mark. */
export function PartProgressLabel({ progress }: { progress: PartProgress }) {
  return (
    <Marked mark={PART_MARK[progress]} done={progress === 'done'}>
      {PART_PROGRESS_TEXT[progress]}
    </Marked>
  )
}

/** The runs each part makes: the five mixtures, none, and the three baths. The table of times of a part shows the runs its notebook is worked from. */
export const RUNS_OF: Record<PartId, readonly RunId[]> = { runs: MIXTURE_IDS, 'rate-law': [], temperature: BATH_IDS.map(bathRunId) }
const TIMED_FOR = (data: ClockData): Record<PartId, readonly RunId[]> => ({ runs: MIXTURE_IDS, 'rate-law': MIXTURE_IDS, temperature: [data.referenceMixtureId, ...RUNS_OF.temperature] })

/** How far each part has come, from the lab as it stands. */
export function partProgress(m: ClockModel, state: ClockState): Record<PartId, PartProgress> {
  const runs = (part: PartId) => RUNS_OF[part].map((run) => runView(m, state, run))
  const [law, temperature] = [rateLawView(m, state), temperatureView(m, state)]
  return {
    runs: partProgressOf(runs('runs').every((view) => view.outcome.state === 'counts'), runs('runs'), null),
    'rate-law': partProgressOf(law.done, [], law),
    temperature: partProgressOf(temperature.done, runs('temperature'), temperature),
  }
}

/** The entry of a part the Lab tab shows when the page opens: the first of its runs that does not count yet; where all do, the notebook, in the part that has one after its runs, and else the first run. */
export const openingEntry = (m: ClockModel, state: ClockState, part: PartId): number => {
  const waiting = RUNS_OF[part].findIndex((run) => runView(m, state, run).outcome.state !== 'counts')
  return waiting >= 0 ? waiting : part === 'temperature' ? RUNS_OF[part].length : 0
}

export interface ClockBenchProps {
  data: ClockData
  m: ClockModel
  sources: readonly Source[]
  /** The lab as it is stored. */
  state: ClockState
  /** False while another tab of the page is the one shown: the bench stays mounted, and no watch may go on running unseen. */
  shown: boolean
  reducedMotion: boolean
  /** The actions done, in order, and the lab saved once. */
  act(actions: readonly Action[]): void
  /** The part and the entry of it shown when the bench mounts; where the stored record says the learner was, unless told. The markup tests draw the others with it. */
  opensAt?: { part: PartId; entry?: number }
}

/**
 * The Lab tab of the clock reaction lab. A navigation of the three parts, each with how far it has come; and of
 * the part shown, one thing at a time: a run of part 1; part 2's notebook, under the table of times it is worked
 * from; a run of part 3 in its bath, or part 3's notebook. Under the ways on, on every entry, the sources and the
 * bench with every bottle's hazards, closed.
 *
 * The bench holds what the page plays and does not store: which run's watch is running and since when, whether the
 * learner has asked for the watch to be stopped at the change, and which part and entry are shown. A watch runs
 * only while its run is on the screen. Leaving it, for another run or part, for another tab of the page or of the
 * browser, ends the play with nothing stored, so the flasks are as they were before the pour, and the run says so
 * when it is shown again (spec 19.8).
 */
export function ClockBench({ data, m, sources, state, shown, reducedMotion, act, opensAt }: ClockBenchProps) {
  const [play, setPlay] = useState<{ run: RunId; startedAt: number } | null>(null)
  const [left, setLeft] = useState<RunId | null>(null)
  const [atChange, setAtChange] = useState(false)
  // While a watch is played, the lab as it will be stored at the stop.
  const live = play === null ? state : reduce(m, state, { type: 'pour', run: play.run })
  const progress = partProgress(m, live)
  const [part, setPart] = useState<PartId>(() => opensAt?.part ?? PART_IDS[openingStation(PART_IDS.map((id) => progress[id]))]!)
  const [entries, setEntries] = useState<Record<PartId, number>>(() => ({ ...Object.fromEntries(PART_IDS.map((id) => [id, openingEntry(m, state, id)])), ...(opensAt?.entry === undefined ? {} : { [opensAt.part]: opensAt.entry }) }) as Record<PartId, number>)
  // The notebooks that have been shown: each stays drawn after it, hidden, and keeps what was typed in it.
  const [visited, setVisited] = useState<readonly string[]>([`${part}:${entries[part]}`])
  const headings = useRef<Record<string, HTMLHeadingElement | null>>({})
  const place = `${part}:${entries[part]}`
  const was = useRef(place)
  useEffect(() => {
    if (was.current !== place) headings.current[place]?.focus()
    was.current = place
  }, [place])

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

  const go = (toPart: PartId, toEntry = entries[toPart]) => {
    const to = `${toPart}:${toEntry}`
    if (to !== place) leave()
    setPart(toPart)
    setEntries({ ...entries, [toPart]: toEntry })
    if (!visited.includes(to)) setVisited([...visited, to])
    // What is already shown: its heading takes focus all the same, as the list is closed under it.
    if (to === place) headings.current[place]?.focus()
  }
  const completed = state.status === 'completed'
  const untouched = PART_IDS.every((id) => progress[id] === 'not-started')
  const cited = useMemo(() => Object.fromEntries(PART_IDS.map((id) => [id, clockCitations(data, id, sources)])) as Record<PartId, ReturnType<typeof clockCitations>>, [data, sources])

  const run = (runId: RunId, key: string) => (
    <RunCard
      key={runId}
      data={data}
      m={m}
      state={state}
      run={runId}
      startedAt={play?.run === runId ? play.startedAt : null}
      atChange={atChange}
      onAtChange={setAtChange}
      left={left === runId}
      reducedMotion={reducedMotion}
      act={(actions) => {
        // Once something more is done at the run, that it was left has been read.
        setLeft(null)
        act(actions)
      }}
      onPour={() => {
        setLeft(null)
        setPlay({ run: runId, startedAt: performance.now() })
      }}
      onStop={(stop) => {
        // The pour is stored with the stop, and not before it.
        act(play?.run === runId ? [{ type: 'pour', run: runId }, stop] : [stop])
        setPlay(null)
      }}
      headingRef={(element) => void (headings.current[key] = element)}
    />
  )
  /** A part's notebook, under a heading that takes focus: drawn from the first time it is shown, and hidden after that while something else is. */
  const notebook = (of: Exclude<PartId, 'runs'>, key: string, children: ReactNode) =>
    visited.includes(key) && (
      <div hidden={key !== place} className="grid gap-3">
        <div className="grid gap-1">
          <h2 ref={(element) => void (headings.current[key] = element)} tabIndex={-1} className="w-fit rounded-sm text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {partTitle(data, of)}
          </h2>
          <p className="max-w-prose text-sm">
            {PART_AIM[of]} {PART_DONE_WHEN[of]}
          </p>
        </div>
        <Step heading={TABLE_TEXT.caption}>
          <TimesTable data={data} m={m} state={state} runs={TIMED_FOR(data)[of]} />
          <p className="text-muted-foreground">{TABLE_TEXT.use}</p>
        </Step>
        {children}
      </div>
    )
  /** Under the ways on, on every entry: the table of times where the entry is a run, the sources of the part, and the bench. Each closed. */
  const foot = (of: PartId) => (
    <div className="grid gap-2 pt-1 pb-1">
      {entries[of] < RUNS_OF[of].length && (
        <Disclosure summary={TABLE_TEXT.caption}>
          <TimesTable data={data} m={m} state={state} runs={TIMED_FOR(data)[of]} />
        </Disclosure>
      )}
      <Sources citations={cited[of]} derived={SOURCES_TEXT} />
      <Disclosure summary={PAGE_TEXT.bench}>
        <Listed items={benchLines(data, roomTenths(m, state))} />
        <p className="font-medium">{PAGE_TEXT.hazards}</p>
        <div className="grid w-full gap-2 sm:grid-cols-2">
          {data.reagents.map((reagent) => (
            <BottleTile key={reagent.id} name={reagent.name} lines={reagent.form === 'solution' ? [reagent.formula, `${reagent.molarity} M`] : [reagent.name.split(' ')[0]!]} rows={[]}>
              <Hazards classifiedAs={reagent.classifiedAs} hazards={reagent.hazards} sources={sources} solid={reagent.form !== 'solution'} />
            </BottleTile>
          ))}
        </div>
      </Disclosure>
    </div>
  )
  /** The way to the part before and the part after, as the paged list draws its own ways on. */
  const between = (before: PartId | null, after: PartId | null) => (
    <div className="flex flex-wrap justify-between gap-2">
      {before !== null && (
        <Button variant="outline" className="lab-tap h-auto min-h-9 max-w-full py-1.5 text-left whitespace-normal" onClick={() => go(before)}>
          <span aria-hidden="true">←</span> {PAGE_TEXT.previous(partTitle(data, before))}
        </Button>
      )}
      {after !== null && (
        <Button variant="outline" className="lab-tap ml-auto h-auto min-h-9 max-w-full py-1.5 text-left whitespace-normal" onClick={() => go(after)}>
          {PAGE_TEXT.next(partTitle(data, after))} <span aria-hidden="true">→</span>
        </Button>
      )}
    </div>
  )
  /** A part that has runs: how many of them count, and its runs one at a time (Paged), with the notebook after them in the part that has one. */
  const paged = (of: PartId) => {
    const runs = RUNS_OF[of]
    const counting = runs.filter((runId) => runView(m, live, runId).outcome.state === 'counts').length
    const items = [
      ...runs.map((runId) => ({ id: runId, heading: runTitle(data, runId), note: <RunProgressLabel progress={runProgressOf(runView(m, live, runId))} /> })),
      ...(of === 'temperature' ? [{ id: 'notebook', heading: NOTEBOOK_TEXT.notebook, note: <PartProgressLabel progress={progress.temperature} /> }] : []),
    ]
    const shownRun = runs[entries[of]]
    const next = PART_IDS[PART_IDS.indexOf(of) + 1] ?? null
    const sheet = `${of}:${runs.length}`
    return (
      <>
        <div className="grid gap-1 text-sm">
          {/* What the part finds and what makes it done, until it is begun; from then, how many of its runs count, said again each time one more does. */}
          {progress[of] === 'not-started' && (
            <p className="max-w-prose">
              {PART_AIM[of]} {PART_DONE_WHEN[of]}
            </p>
          )}
          <p role="status" className="font-medium">
            {progress[of] !== 'not-started' && runsCountText(counting, runs.length)}
          </p>
          {/* Part 1 has no notebook to carry its notes: once its five runs count and not before, they are here, closed. */}
          {of === 'runs' && progress.runs === 'done' && (
            <Disclosure summary={NOTEBOOK_TEXT.notes}>
              <div className="grid max-w-[75ch] gap-2 leading-relaxed">
                {partNotes(data, 'runs').map((note) => (
                  <p key={note}>{note}</p>
                ))}
              </div>
            </Disclosure>
          )}
        </div>
        <Paged
          roomy
          items={items}
          index={entries[of]}
          onGo={(to) => go(of, to)}
          text={{ list: PAGE_TEXT.runs, previous: PAGE_TEXT.previous, next: PAGE_TEXT.next }}
          after={
            <>
              {/* At the last entry of part 1 the paged list has no way on: the way on is to the next part. */}
              {entries[of] === items.length - 1 && next !== null && between(null, next)}
              {foot(of)}
            </>
          }
        >
          {shownRun !== undefined && run(shownRun, `${of}:${entries[of]}`)}
          {of === 'temperature' && notebook('temperature', sheet, <TemperatureNotebook data={data} m={m} state={state} shown={shown && place === sheet} act={act} />)}
        </Paged>
      </>
    )
  }
  /** A part stays drawn once it has been shown, hidden while another is, where it holds a notebook: what was typed there and not yet entered is kept. */
  const drawn = (of: PartId) => of === part || (of !== 'runs' && visited.some((key) => key.startsWith(`${of}:`)))

  return (
    <div className="grid gap-3">
      {/* Always there, and empty until the lab is complete, so that a screen reader says it when it comes; while it is empty it takes no room, the gap under it neither. */}
      <p role="status" className={`max-w-prose text-sm font-medium ${completed ? '' : '-mb-3'}`}>
        {completed && <Marked mark="✓" done>{LAB_TEXT.complete}</Marked>}
      </p>
      {completed && <p className={`max-w-prose text-sm ${ROLE.held}`}>{blockedText(data, 'lab-completed')}</p>}
      {untouched && <p className="max-w-prose text-sm">{LAB_TEXT.aim}</p>}
      <nav aria-label={PAGE_TEXT.parts} className="grid grid-cols-3 gap-1.5 text-sm">
        {PART_IDS.map((id) => {
          const [number, name] = partTitle(data, id).split(': ')
          return (
            <button
              key={id}
              type="button"
              aria-current={id === part ? 'true' : undefined}
              onClick={() => go(id)}
              className="grid min-h-11 content-start rounded-md border border-l-4 px-2 py-1 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring aria-[current]:border-foreground aria-[current]:bg-muted aria-[current]:font-medium"
            >
              <span className="text-xs font-normal text-muted-foreground">{number}</span>
              <span>{name}</span>
              <span className="text-xs font-normal text-muted-foreground">
                <PartProgressLabel progress={progress[id]} />
              </span>
            </button>
          )
        })}
      </nav>
      {PART_IDS.map(
        (id) =>
          drawn(id) && (
            <div key={id} hidden={id !== part} className="grid gap-3">
              {id === 'rate-law' ? (
                <>
                  {notebook('rate-law', 'rate-law:0', <RateLawNotebook data={data} m={m} state={state} shown={shown && place === 'rate-law:0'} act={act} />)}
                  {between('runs', 'temperature')}
                  {foot(id)}
                </>
              ) : (
                paged(id)
              )}
            </div>
          ),
      )}
    </div>
  )
}

/** Every run of the lab, in the engine's order, with the part that makes it: for the record. */
export const RUN_PARTS = RUN_IDS.map((run) => ({ run, part: PART_IDS.find((part) => RUNS_OF[part].includes(run))! }))
