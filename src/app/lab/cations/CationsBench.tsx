import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Disclosure, Sources } from '@/app/explore/InspectorCard'
import { Control } from '@/app/lab/Control'
import { Hazards } from '@/app/lab/Hazards'
import { Line, Mark, useSaid } from '@/app/lab/Line'
import { Paged } from '@/app/lab/Paged'
import { ROLE } from '@/app/lab/roles'
import { BottleTile, Listed, Marked, Step } from '@/app/lab/stationPieces'
import { ION_IDS, PART_IDS, STEP_IDS, type CationsData, type IonId, type PartId, type Reagent } from '@/chem-data/cations/data'
import { cationsCitations } from '@/chem-data/citations'
import type { Source } from '@/chem-data/schema'
import { partView, type Action, type Blocked, type CationsModel, type CationsState, type Field, type Mode, type Observation, type PartView, type Warning } from '@/engine/cations'
import { FlowChart } from './FlowChart'
import {
  CHART_TEXT,
  LAB_TEXT,
  NAMING_TEXT,
  PAGE_TEXT,
  PART_AIM,
  PROGRESS_TEXT,
  RECORD_TEXT,
  SAMPLE_HAZARDS_HEADING,
  SOURCES_TEXT,
  benchLines,
  blockedText,
  ionLabel,
  namedText,
  outcomeText,
  partTitle,
  progressOf,
  stepTitle,
  type Progress,
} from './messages'
import { StatusLabel, StepCard } from './StepCard'
import { openingEntry, openingPart } from './tubeLook'
import './cations.css'

/** Beside a part's progress in words, and hidden from a screen reader, which is given the words. */
export const PROGRESS_MARK: Record<Progress, string> = { 'not-started': '○', steps: '◔', naming: '◑', 'not-counted': '◑', done: '✓' }

/** A part's progress as a mark and its words; the tick of a part done is in the role of a done mark. */
export function ProgressLabel({ progress }: { progress: Progress }) {
  return (
    <Marked mark={PROGRESS_MARK[progress]} done={progress === 'done'}>
      {PROGRESS_TEXT[progress]}
    </Marked>
  )
}

/** How the run shown stands, for the last entry of a part's list: its ions still to be named, not finished, or how it came out. */
function RunLabel({ view }: { view: PartView }) {
  if (view.outcome.state === 'counts') return <Marked mark="✓" done>{RECORD_TEXT.counts}</Marked>
  if (view.outcome.state === 'does-not-count') return <Marked mark="◑">{RECORD_TEXT.doesNotCount}</Marked>
  return <Marked mark={view.naming?.open ? '◑' : '○'}>{view.naming?.open ? PROGRESS_TEXT.naming : RECORD_TEXT.open}</Marked>
}

export interface CationsBenchProps {
  data: CationsData
  m: CationsModel
  sources: readonly Source[]
  state: CationsState
  can(action: Action): Blocked | null
  warn(action: Action): Warning[]
  wrong(part: PartId, observation: Observation): Field[]
  act(action: Action): void
  /** The part and the entry of its list shown when the bench mounts; where the stored record says the learner was, unless told. The markup tests draw the others with it. */
  opensAt?: { part: PartId; entry?: number }
}

/**
 * The Lab tab of the Group I cations lab: the line that says the lab is complete, the two parts to choose between,
 * and the part shown, one entry of its list at a time.
 *
 * A part is drawn from the first time it is shown, and stays drawn after it: the other, once it has been shown, is
 * hidden, out of the layout, the tab order and a screen reader's reading, so that it keeps the entry it was at and
 * what was chosen there and not yet recorded. Changing part moves focus to the heading of the entry shown.
 */
export function CationsBench({ data, m, sources, state, can, warn, wrong, act, opensAt }: CationsBenchProps) {
  const views = { known: partView(m, state, 'known'), unknown: partView(m, state, 'unknown') } satisfies Record<PartId, PartView>
  const [shown, setShown] = useState<PartId>(() => opensAt?.part ?? openingPart(views))
  const [visited, setVisited] = useState<readonly PartId[]>([shown])
  const headings = useRef<Partial<Record<PartId, HTMLHeadingElement | null>>>({})
  // The part shown and which run of it: a change of either is a new column, whose heading takes focus, since the button that was pressed is gone or hidden.
  const column = `${shown}:${views[shown].runs}`
  // Until anything is done in either part, the tab says at its head what the lab is.
  const untouched = PART_IDS.every((part) => progressOf(views[part]) === 'not-started' && views[part].runs === 1)
  const was = useRef(column)
  useEffect(() => {
    if (was.current !== column) headings.current[shown]?.focus()
    was.current = column
  }, [column, shown])

  return (
    <div className="grid gap-3">
      {/* Always there, and empty until the lab is complete, so that a screen reader says it when it comes; while it is empty it takes no room, the gap under it neither. */}
      <p role="status" className={`max-w-prose text-sm font-medium ${state.status === 'completed' ? '' : '-mb-3'}`}>
        {state.status === 'completed' && <Marked mark="✓" done>{LAB_TEXT.completed}</Marked>}
      </p>
      {untouched && <p className="max-w-prose text-sm">{LAB_TEXT.aim}</p>}
      <nav aria-label={PAGE_TEXT.parts} className="flex flex-wrap gap-1.5 text-sm">
        {PART_IDS.map((part) => (
          <button
            key={part}
            type="button"
            aria-current={part === shown ? 'true' : undefined}
            onClick={() => {
              setShown(part)
              if (!visited.includes(part)) setVisited([...visited, part])
              // The part already shown: its heading takes focus all the same.
              if (part === shown) headings.current[part]?.focus()
            }}
            className="grid min-h-11 flex-1 basis-48 content-center rounded-md border border-l-4 px-3 py-1 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring aria-[current]:border-foreground aria-[current]:bg-muted aria-[current]:font-medium"
          >
            <span>{partTitle(part)}</span>
            <span className="text-xs font-normal text-muted-foreground">
              <ProgressLabel progress={progressOf(views[part])} />
            </span>
          </button>
        ))}
      </nav>
      {PART_IDS.map(
        (part) =>
          visited.includes(part) && (
            <div key={part} hidden={part !== shown}>
              <PartColumn
                // A new run of a part is a column of its own: nothing chosen or said in the one before is carried over, and it opens on its first step.
                key={views[part].runs}
                data={data}
                m={m}
                sources={sources}
                part={part}
                mode={state.mode}
                view={views[part]}
                completed={state.status === 'completed'}
                can={can}
                warn={warn}
                wrong={(observation) => wrong(part, observation)}
                act={act}
                opensAt={opensAt?.part === part ? opensAt.entry : undefined}
                headingRef={(element) => void (headings.current[part] = element)}
              />
            </div>
          ),
      )}
    </div>
  )
}

interface PartColumnProps {
  data: CationsData
  m: CationsModel
  sources: readonly Source[]
  part: PartId
  mode: Mode
  view: PartView
  completed: boolean
  can(action: Action): Blocked | null
  warn(action: Action): Warning[]
  wrong(observation: Observation): Field[]
  act(action: Action): void
  opensAt?: number | undefined
  /** The heading of the entry shown, which takes focus when the part comes to be shown. */
  headingRef(element: HTMLHeadingElement | null): void
}

/**
 * One part of the lab: what it is for, until its run is begun; then its list, the five steps and after them the
 * entry that closes the run, one at a time (Paged); and under the ways on, the sources of the step shown, the
 * bench, and in part 2 the finished flow chart of part 1 as a map. The bench is one place that every step's page
 * has: what stands on it, and a tile with its hazards for each of the five reagents and of the three solutions
 * the samples are made from.
 *
 * An entry is drawn from the first time it is shown, and stays drawn after it, hidden, so that a step keeps what
 * was chosen there and not yet recorded while another is looked at. Changing entry moves focus to its heading.
 */
function PartColumn({ data, m, sources, part, mode, view, completed, can, warn, wrong, act, opensAt, headingRef }: PartColumnProps) {
  const closing = STEP_IDS.length
  const [index, setIndex] = useState(() => opensAt ?? openingEntry(view))
  const [visited, setVisited] = useState<readonly number[]>([index])
  const headings = useRef<(HTMLHeadingElement | null)[]>([])
  const shown = useRef(index)
  useEffect(() => {
    if (shown.current !== index) headings.current[index]?.focus()
    shown.current = index
  }, [index])
  const closingTitle = part === 'known' ? CHART_TEXT.title : NAMING_TEXT.title
  const title = (at: number) => (at === closing ? closingTitle : stepTitle(data, STEP_IDS[at]!))
  const stepId = STEP_IDS[index]
  const cited = useMemo(() => (stepId === undefined ? null : cationsCitations(data, stepId, sources)), [data, stepId, sources])
  // Until a run is begun the part says what it is for; from then on the room is the step's.
  const begun = view.outcome.state !== 'open' || view.steps.some((step) => step.added > 0 || step.status === 'done')
  const refs = (at: number) => (element: HTMLHeadingElement | null) => {
    headings.current[at] = element
    if (at === index) headingRef(element)
  }

  return (
    <div className="grid gap-3">
      {!begun && (
        <div className="grid max-w-prose gap-1 text-sm">
          <p>{PART_AIM[part]}</p>
          {!completed && <p className="text-muted-foreground">{LAB_TEXT.complete}</p>}
        </div>
      )}
      <Paged
        items={[
          ...view.steps.map((step, at) => ({ id: step.id, heading: data.steps[at]!.name, note: <StatusLabel status={step.status} /> })),
          { id: 'closing', heading: closingTitle, note: <RunLabel view={view} /> },
        ]}
        index={index}
        onGo={(to) => {
          setIndex(to)
          if (!visited.includes(to)) setVisited([...visited, to])
          // The entry already shown: its heading takes focus all the same, as the list is closed under it.
          if (to === index) headings.current[index]?.focus()
        }}
        text={{ list: PAGE_TEXT.steps, previous: () => PAGE_TEXT.previous(title(index - 1)), next: () => PAGE_TEXT.next(title(index + 1)) }}
        after={
          <div className="grid gap-2 text-sm">
            {cited !== null && <Sources citations={cited} derived={SOURCES_TEXT} />}
            <Disclosure summary={PAGE_TEXT.bench}>
              <Bench data={data} sources={sources} part={part} />
            </Disclosure>
            {part === 'unknown' &&
              (view.map === null ? (
                <p className="max-w-prose text-muted-foreground">{CHART_TEXT.noMap}</p>
              ) : (
                <Disclosure summary={CHART_TEXT.map}>
                  <FlowChart data={data} places={view.map} steps={view.steps} />
                </Disclosure>
              ))}
          </div>
        }
      >
        {view.steps.map(
          (step, at) =>
            visited.includes(at) && (
              <div key={step.id} hidden={at !== index}>
                <StepCard data={data} m={m} part={part} mode={mode} view={view} step={step} can={can} warn={warn} wrong={wrong} act={act} headingRef={refs(at)} />
              </div>
            ),
        )}
        {visited.includes(closing) && (
          <div hidden={index !== closing}>
            <Closing data={data} part={part} view={view} title={closingTitle} can={can} act={act} headingRef={refs(closing)} />
          </div>
        )}
      </Paged>
    </div>
  )
}

/** A bottle of the bench: its name, its formula and strength on its label, and its hazards, closed. */
function ReagentTile({ reagent, sources }: { reagent: Reagent; sources: readonly Source[] }) {
  return (
    <BottleTile name={reagent.name} lines={[reagent.formula, `${reagent.molarity} M`]} rows={[]}>
      <Hazards classifiedAs={reagent.classifiedAs} hazards={reagent.hazards} sources={sources} />
    </BottleTile>
  )
}

/** The bench: what stands on it, in words; the five reagents, each a tile with its hazards; and the three solutions the samples are made from, under a heading that says why all three are shown. */
function Bench({ data, sources, part }: { data: CationsData; sources: readonly Source[]; part: PartId }) {
  const ofSamples = (reagent: Reagent) => data.ions.some((ion) => ion.reagentId === reagent.id)
  return (
    <div className="grid gap-3">
      <Listed items={benchLines(data, part)} />
      <div className="grid w-full gap-2 sm:grid-cols-2">
        {data.reagents
          .filter((reagent) => !ofSamples(reagent))
          .map((reagent) => (
            <ReagentTile key={reagent.id} reagent={reagent} sources={sources} />
          ))}
      </div>
      <p className="max-w-prose font-medium">{SAMPLE_HAZARDS_HEADING[part]}</p>
      <div className="grid w-full gap-2 sm:grid-cols-2">
        {data.reagents.filter(ofSamples).map((reagent) => (
          <ReagentTile key={reagent.id} reagent={reagent} sources={sources} />
        ))}
      </div>
    </div>
  )
}

interface ClosingProps {
  data: CationsData
  part: PartId
  view: PartView
  title: string
  can(action: Action): Blocked | null
  act(action: Action): void
  headingRef(element: HTMLHeadingElement | null): void
}

/**
 * The last entry of a part's list, which closes a run. In part 1, the whole flow chart as it has been filled, to
 * be read. In part 2, the naming of the ions: three boxes, any of which may be ticked, there and disabled with the
 * reason under them until the five steps are done, and said once for each run. Then how the run came out, which
 * takes focus when the run ends, and the way to run the part again, which a lab that is complete still takes.
 */
function Closing({ data, part, view, title, can, act, headingRef }: ClosingProps) {
  const headingId = useId()
  const placeId = useId()
  const closedId = useId()
  const [ticked, setTicked] = useState<readonly IonId[]>([])
  const [namingSaid, sayOfNaming] = useSaid()
  const [outcomeSaid, sayOfOutcome] = useSaid()
  const outcomeRef = useRef<HTMLDivElement>(null)
  const again: Action = { type: 'runAgain', part }
  const { naming, outcome } = view
  // The naming's own controls go when the ions are named: focus goes to how the run came out. Never on load.
  const over = outcome.state !== 'open'
  const wasOver = useRef(over)
  useEffect(() => {
    if (over && !wasOver.current && document.activeElement === document.body) outcomeRef.current?.focus()
    wasOver.current = over
  }, [over])

  return (
    <section aria-labelledby={headingId} className="grid min-w-0 gap-3">
      <div className="grid gap-1">
        <p id={placeId} className="text-xs text-muted-foreground">
          {PAGE_TEXT.run(view.runs)}
          {' · '}
          <span className="font-medium text-foreground">
            <RunLabel view={view} />
          </span>
        </p>
        <h2 ref={headingRef} id={headingId} tabIndex={-1} aria-describedby={placeId} className="w-fit rounded-sm text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {title}
        </h2>
        {/* Always there, and empty until the part is done, so that a screen reader says it when it comes. */}
        <p role="status" className="text-sm font-medium">
          {view.done && <Marked mark="✓" done>{PAGE_TEXT.partDone}</Marked>}
        </p>
      </div>

      {view.chart !== null && (
        <div className="grid gap-3 rounded-lg border bg-card p-4 text-sm">
          <FlowChart data={data} places={view.chart.places} steps={view.steps} />
        </div>
      )}

      {naming !== null && (
        <form
          noValidate
          className="grid justify-items-start gap-3 rounded-lg border bg-card p-4 text-sm"
          onSubmit={(event) => {
            event.preventDefault()
            const action: Action = { type: 'nameIons', part, ions: [...ticked] }
            const blocked = can(action)
            if (blocked !== null) return sayOfNaming(blockedText(data, part, blocked), true)
            // Said once: a press with no box ticked is asked again and sends nothing, since no sample holds none of the three.
            if (ticked.length === 0) return sayOfNaming(NAMING_TEXT.none, true)
            sayOfNaming('')
            act(action)
          }}
        >
          <p className="max-w-prose">{NAMING_TEXT.help}</p>
          <fieldset disabled={!naming.open} aria-labelledby={headingId} aria-describedby={naming.open || naming.named !== null ? undefined : closedId} className="flex flex-wrap gap-1.5">
            {ION_IDS.map((ion) => (
              <label
                key={ion}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 py-1 has-checked:border-foreground has-checked:bg-muted has-checked:font-medium has-disabled:cursor-default has-focus-visible:ring-2 has-focus-visible:ring-ring"
              >
                <input type="checkbox" checked={(naming.named ?? ticked).includes(ion)} onChange={(event) => setTicked(event.target.checked ? [...ticked, ion] : ticked.filter((other) => other !== ion))} />
                {ionLabel(data, ion)}
              </label>
            ))}
          </fieldset>
          {naming.named === null ? (
            <>
              {!naming.open && (
                <p id={closedId} className={ROLE.held}>
                  {NAMING_TEXT.closed}
                </p>
              )}
              <Control type="submit" unavailable={!naming.open} className="min-h-11 px-4">
                {NAMING_TEXT.submit}
              </Control>
            </>
          ) : (
            <p className="font-medium">{namedText(data, naming.named)}</p>
          )}
          <Line said={namingSaid} />
        </form>
      )}

      <Step heading={PAGE_TEXT.outcome}>
        {/* Room about the words, taken back from the card's own, so that the ring that shows where focus went does not hug them. */}
        <div ref={outcomeRef} tabIndex={-1} className="-mx-2 -my-1 grid max-w-prose gap-2 rounded-md px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {outcome.state === 'open' ? (
            <p className="text-muted-foreground">{RECORD_TEXT.open}</p>
          ) : (
            <p>
              <Mark ok={outcome.state === 'counts'} />
              {outcomeText(data, part, outcome, view.holds)}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <Control
            unavailable={can(again) !== null}
            className="h-auto min-h-11 px-4 py-1 text-left whitespace-normal"
            onClick={() => {
              const blocked = can(again)
              if (blocked !== null) return sayOfOutcome(blockedText(data, part, blocked), true)
              act(again)
            }}
          >
            {PAGE_TEXT.runAgain[part]}
          </Control>
          <p className="max-w-prose flex-1 basis-48 text-muted-foreground">{PAGE_TEXT.runAgainHelp[part]}</p>
        </div>
        <Line said={outcomeSaid} />
      </Step>
    </section>
  )
}
