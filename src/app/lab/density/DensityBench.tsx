import { useEffect, useId, useMemo, useRef, useState, type Ref } from 'react'
import { Disclosure, Sources } from '@/app/explore/InspectorCard'
import { Hazards } from '@/app/lab/Hazards'
import { openingStation } from '@/app/lab/openingStation'
import { Paged } from '@/app/lab/Paged'
import { ROLE } from '@/app/lab/roles'
import { Listed, Marked } from '@/app/lab/stationPieces'
import { densityCitations } from '@/chem-data/citations'
import { PART_IDS, unknownsOf, type DensityData, type PartId } from '@/chem-data/density/data'
import type { Source } from '@/chem-data/schema'
import { partView, type Action, type Blocked, type DensityModel, type DensityState, type Warning } from '@/engine/density'
import { InstrumentPage, Page, type PartProps } from './InstrumentPage'
import { INSTRUMENT_NAME, PAGE_TEXT, PART_AIM, PART_NUMBER, PROGRESS_TEXT, RECORD_TEXT, SOURCES_TEXT, benchLines, blockedText, describeBench, hazardsHeading, partTitle, progressOf, readText, type Progress } from './messages'
import { NotebookPage } from './Notebook'
import { entriesOf, openingPage, PAGES, type PageId } from './pageLook'

/** Beside a part's progress in words, and hidden from a screen reader, which is given the words. */
export const PROGRESS_MARK: Record<Progress, string> = { 'not-started': '○', bench: '◔', notebook: '◑', 'not-counted': '◑', done: '✓' }

/** A part's progress as a mark and its words; the tick of a part done is in the role of a done mark. */
export function ProgressLabel({ progress }: { progress: Progress }) {
  return (
    <Marked mark={PROGRESS_MARK[progress]} done={progress === 'done'}>
      {PROGRESS_TEXT[progress]}
    </Marked>
  )
}

export interface DensityBenchProps {
  data: DensityData
  m: DensityModel
  sources: readonly Source[]
  state: DensityState
  can(action: Action): Blocked | null
  warn(action: Action): Warning[]
  act(action: Action): void
  /** The part and the page of it shown when the bench mounts; where the stored record says the learner was, unless told. The markup tests draw the others with it. */
  opensAt?: { part: PartId; page?: PageId }
}

/**
 * The Lab tab of the measurement and density lab: the line that says the lab is complete, the three parts to
 * choose between, and the part shown, one page of it at a time. Changing part moves focus to the part's heading,
 * as does a new run of it, and changing page to the page's. The part and the page shown, what is typed and not yet entered, a closer look
 * that is open, a warning that is showing and what a line last said are the bench's and are not stored.
 */
export function DensityBench({ data, m, sources, state, can, warn, act, opensAt }: DensityBenchProps) {
  const views = PART_IDS.map((part) => partView(m, state, part))
  const progress = views.map(progressOf)
  const [part, setPart] = useState<PartId>(() => opensAt?.part ?? PART_IDS[openingStation(progress)]!)
  const heading = useRef<HTMLHeadingElement>(null)
  const view = views[PART_IDS.indexOf(part)]!
  // Another part, or a new run of this one: its heading takes focus. Never on load.
  const shown = `${part}:${view.runs}`
  const was = useRef(shown)
  useEffect(() => {
    if (was.current !== shown) heading.current?.focus()
    was.current = shown
  }, [shown])

  return (
    <div className="grid gap-3">
      {/* Always there, and empty until the lab is complete, so that a screen reader says it when it comes; while it is empty it takes no room, the gap under it neither. */}
      <p role="status" className={`max-w-prose text-sm font-medium ${state.status === 'completed' ? '' : '-mb-3'}`}>
        {state.status === 'completed' && <Marked mark="✓" done>{PAGE_TEXT.complete}</Marked>}
      </p>
      {/* Three to a row at every width the bench has, each as wide as its words ask and a share of what is left. */}
      <nav aria-label={PAGE_TEXT.parts} className="flex gap-1.5 text-sm">
        {PART_IDS.map((id, i) => (
          <button
            key={id}
            type="button"
            aria-current={id === part ? 'true' : undefined}
            onClick={() => {
              setPart(id)
              // The part already shown: its heading takes focus all the same.
              if (id === part) heading.current?.focus()
            }}
            className="group grid min-h-11 flex-auto content-start rounded-md border border-l-4 px-2 py-1 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring aria-[current]:border-foreground aria-[current]:bg-muted aria-[current]:font-medium"
          >
            {/* The number and the progress are grey on the page's ground, and the text's own colour on the grey ground of the part shown or under the pointer, as in the other labs' lists. */}
            <span className="text-xs font-normal text-muted-foreground group-hover:text-foreground group-aria-[current]:text-foreground">{PART_NUMBER[id]}</span>
            <span>{data.parts[i]!.name}</span>
            <span className="text-xs font-normal text-muted-foreground group-hover:text-foreground group-aria-[current]:text-foreground">
              <ProgressLabel progress={progress[i]!} />
            </span>
          </button>
        ))}
      </nav>
      <PartPages
        // A part's pages afresh for each part shown and each run of it: nothing typed or said in the one before is carried over.
        key={shown}
        data={data}
        m={m}
        sources={sources}
        part={part}
        view={view}
        guided={state.mode === 'guided'}
        can={can}
        warn={warn}
        act={act}
        opensAt={opensAt?.part === part ? opensAt.page : undefined}
        headingRef={heading}
      />
    </div>
  )
}

/** What is set out for a part, on a page of its own: a line for each thing; for an unknown, the hazards of everything it may be until it is named, and then of what it was; and the whole bench in words, closed. */
function BenchPage({ data, m, sources, part, view, headingRef }: Pick<PartProps, 'data' | 'm' | 'part' | 'view'> & { sources: readonly Source[]; headingRef: Ref<HTMLHeadingElement> }) {
  const { expected } = view
  return (
    <Page heading={PAGE_TEXT.bench} headingRef={headingRef}>
      <Listed items={benchLines(data, part)} />
      {part !== 'reading' && (
        <>
          <p className="max-w-prose font-medium">{hazardsHeading(data, part, expected)}</p>
          <div className="grid w-full gap-2 sm:grid-cols-2">
            {unknownsOf(data, part)
              .filter((reagent) => expected?.kind !== 'unknown' || reagent.tableId === expected.id)
              .map((reagent) => (
                <div key={reagent.id} role="group" aria-label={reagent.name} className="grid content-start justify-items-start gap-1.5 rounded-md border p-2">
                  <h4 className="font-medium">
                    {reagent.name} <span className="font-normal text-muted-foreground">{reagent.formula}</span>
                  </h4>
                  <Hazards classifiedAs={reagent.classifiedAs} hazards={reagent.hazards} sources={sources} solid={reagent.form === 'metal'} />
                </div>
              ))}
          </div>
        </>
      )}
      {/* Room over it: the hit area of a tile's last disclosure reaches 12 px under its line, and this one's 12 px over its own, or 24 px when it is open. */}
      <div className="pt-5">
        <Disclosure summary={PAGE_TEXT.benchInWords}>
          <Listed items={describeBench(m, part, view.bench)} />
        </Disclosure>
      </div>
    </Page>
  )
}

const PAGE_NAME = (page: PageId) => (page === 'bench' ? PAGE_TEXT.bench : page === 'notebook' ? PAGE_TEXT.notebook : INSTRUMENT_NAME[page])

/**
 * One part of the lab: its head, then its pages one at a time (Paged), and its sources. The head says which run
 * this is and how far the part has come, and what the part is for, in both modes. The list of pages says of each
 * instrument how many of its readings are taken. When the notebook is checked, at the last entry in Guided or
 * when Challenge asks, the notebook's page is shown and how the run came out takes focus, wherever the last entry
 * was made.
 */
function PartPages({ data, m, sources, part, view, guided, can, warn, act, opensAt, headingRef }: PartProps & { sources: readonly Source[]; opensAt: PageId | undefined; headingRef: Ref<HTMLHeadingElement> }) {
  const pages = PAGES[part]
  const headingId = useId()
  const placeId = useId()
  const [index, setIndex] = useState(() => (opensAt === undefined ? openingPage(part, view) : Math.max(0, pages.indexOf(opensAt))))
  const pageHeading = useRef<HTMLHeadingElement>(null)
  const cited = useMemo(() => densityCitations(data, part, sources), [data, part, sources])
  const over = view.outcome.state !== 'open'
  const [wasOver, setWasOver] = useState(over)
  const [announce, setAnnounce] = useState(false)
  if (over !== wasOver) {
    setWasOver(over)
    if (over) {
      setIndex(pages.length - 1)
      setAnnounce(true)
    }
  }
  const shown = useRef(index)
  useEffect(() => {
    // Not where the outcome is about to take focus.
    if (shown.current !== index && !announce) pageHeading.current?.focus()
    shown.current = index
  }, [index, announce])
  const page = pages[index]!
  // Whatever holds the whole lab holds every button here. It is said once, at the part's head.
  const completed = can({ type: 'runAgain', part }) === 'lab-completed'
  const props = { data, m, part, view, guided, can, warn, act }

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
          ref={headingRef}
          id={headingId}
          tabIndex={-1}
          aria-describedby={placeId}
          className="w-fit rounded-sm text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {partTitle(data, part)}
        </h2>
        {/* What the part is for, in both modes: the sentence gives no relation and no rule. */}
        <p className="max-w-prose text-sm">{PART_AIM[part]}</p>
        {completed && <p className={`text-sm ${ROLE.held}`}>{blockedText(part, 'lab-completed')}</p>}
      </div>
      <Paged
        items={pages.map((id) => {
          const readings = id === 'bench' || id === 'notebook' ? [] : entriesOf(view.notebook, id)
          return { id, heading: PAGE_NAME(id), ...(readings.length > 0 && { note: readText(readings.filter((entry) => entry.value !== null).length, readings.length) }) }
        })}
        index={index}
        onGo={(to) => {
          setIndex(to)
          // The page already shown: its heading takes focus all the same, as the list is closed under it.
          if (to === index) pageHeading.current?.focus()
        }}
        text={{ list: PAGE_TEXT.pages, previous: PAGE_TEXT.previous, next: PAGE_TEXT.next }}
        // An instrument with its closer look and the eye beside it needs more room than a primer's card: the list stays behind its button for longer.
        roomy
        after={
          // Room over it: the closed disclosure's hit area reaches 12 px over its line, and that of Previous, in the row above, 4 px under its own.
          <div className="pt-3 text-sm">
            <Sources citations={cited} derived={SOURCES_TEXT} />
          </div>
        }
      >
        {page === 'bench' ? (
          <BenchPage data={data} m={m} sources={sources} part={part} view={view} headingRef={pageHeading} />
        ) : page === 'notebook' ? (
          <NotebookPage
            {...props}
            headingRef={pageHeading}
            announce={announce}
            onAnnounced={() => setAnnounce(false)}
            onRunAgain={() => act({ type: 'runAgain', part })}
          />
        ) : (
          // A page of its own for each instrument: a closer look that is open and what is typed are that instrument's.
          <InstrumentPage key={page} {...props} instrument={page} headingRef={pageHeading} />
        )}
      </Paged>
    </section>
  )
}
