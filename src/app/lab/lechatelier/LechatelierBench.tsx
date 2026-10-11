import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Disclosure, Sources } from '@/app/explore/InspectorCard'
import { Control } from '@/app/lab/Control'
import { Hazards } from '@/app/lab/Hazards'
import { Line, Mark, useSaid } from '@/app/lab/Line'
import { Paged } from '@/app/lab/Paged'
import { BottleTile, Listed, Marked } from '@/app/lab/stationPieces'
import { lechatelierCitations } from '@/chem-data/citations'
import { SYSTEM_IDS, systemOf, type LechatelierData, type Reagent, type SystemId } from '@/chem-data/lechatelier/data'
import type { Source } from '@/chem-data/schema'
import { systemView, type Action, type Blocked, type Field, type LechatelierModel, type LechatelierState, type Mode, type Observation, type SystemView } from '@/engine/lechatelier'
import { DisturbanceCard, StatusLabel } from './DisturbanceCard'
import { LAB_TEXT, PAGE_TEXT, PROGRESS_TEXT, RECORD_TEXT, SOURCES_TEXT, SYSTEM_AIM, benchLines, blockedText, disturbanceTitle, outcomeText, progressOf, systemName, systemNumber, systemShortName, type Progress } from './messages'
import { openingEntry, openingSystem } from './tubeLook'
import './lechatelier.css'

/** Beside a system's progress in words, and hidden from a screen reader, which is given the words. */
export const PROGRESS_MARK: Record<Progress, string> = { 'not-started': '○', 'under-way': '◔', 'to-check': '◑', 'not-counted': '◑', done: '✓' }

/** A system's progress as a mark and its words; the tick of a system done is in the role of a done mark. */
export function ProgressLabel({ progress }: { progress: Progress }) {
  return (
    <Marked mark={PROGRESS_MARK[progress]} done={progress === 'done'}>
      {PROGRESS_TEXT[progress]}
    </Marked>
  )
}

/** How the run shown stands, for the last entry of a system's list: not finished, to be checked, or how it came out. */
function RunLabel({ view }: { view: SystemView }) {
  if (view.outcome.state === 'counts') return <Marked mark="✓" done>{RECORD_TEXT.counts}</Marked>
  if (view.outcome.state === 'does-not-count') return <Marked mark="◑">{RECORD_TEXT.doesNotCount}</Marked>
  if (view.outcome.state === 'to-check') return <Marked mark="◑">{RECORD_TEXT.toCheck}</Marked>
  return <Marked mark="○">{RECORD_TEXT.open}</Marked>
}

export interface LechatelierBenchProps {
  data: LechatelierData
  m: LechatelierModel
  sources: readonly Source[]
  state: LechatelierState
  can(action: Action): Blocked | null
  wrong(system: SystemId, observation: Observation): Field[]
  act(action: Action): void
  /** The system and the entry of its list shown when the bench mounts; where the stored record says the learner was, unless told. The markup tests draw the others with it. */
  opensAt?: { system: SystemId; entry?: number }
}

/**
 * The Lab tab of the Le Chatelier's principle lab: the line that says the lab is complete, the four systems to
 * choose between, and the system shown, one entry of its list at a time.
 *
 * A system is drawn from the first time it is shown, and stays drawn after it: the others, once they have been
 * shown, are hidden, out of the layout, the tab order and a screen reader's reading, so that each keeps the entry
 * it was at and what was chosen there and not yet recorded. Changing system moves focus to the heading of the
 * entry shown.
 */
export function LechatelierBench({ data, m, sources, state, can, wrong, act, opensAt }: LechatelierBenchProps) {
  const views = Object.fromEntries(SYSTEM_IDS.map((systemId) => [systemId, systemView(m, state, systemId)])) as Record<SystemId, SystemView>
  const [shown, setShown] = useState<SystemId>(() => opensAt?.system ?? openingSystem(views))
  const [visited, setVisited] = useState<readonly SystemId[]>([shown])
  const headings = useRef<Partial<Record<SystemId, HTMLHeadingElement | null>>>({})
  // The system shown and which run of it: a change of either is a new column, whose heading takes focus, since the button that was pressed is gone or hidden.
  const column = `${shown}:${views[shown].runs}`
  // Until anything is done in any system, the tab says at its head what the lab is.
  const untouched = SYSTEM_IDS.every((systemId) => progressOf(views[systemId]) === 'not-started' && views[systemId].runs === 1)
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
      <nav aria-label={PAGE_TEXT.systems} className="grid grid-cols-4 gap-1.5 text-sm">
        {SYSTEM_IDS.map((systemId) => (
          <button
            key={systemId}
            type="button"
            aria-current={systemId === shown ? 'true' : undefined}
            onClick={() => {
              setShown(systemId)
              if (!visited.includes(systemId)) setVisited([...visited, systemId])
              // The system already shown: its heading takes focus all the same.
              if (systemId === shown) headings.current[systemId]?.focus()
            }}
            className="group grid min-h-11 content-start rounded-md border border-l-4 px-2 py-1 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring aria-[current]:border-foreground aria-[current]:bg-muted aria-[current]:font-medium"
          >
            {/* Four to a row at every width the bench has, so the name here is the short one; the whole name heads the system's column until its run is begun, and its last entry. */}
            {/* The number and the progress are grey on the page's ground. On the grey ground of the system shown, or under the pointer, that grey measured 4.35 to 1 in the light theme, too faint for words 12 px tall: there they are the text's own colour, as in the shared list and the Group I cations lab's parts. */}
            <span className="text-xs font-normal text-muted-foreground group-hover:text-foreground group-aria-[current]:text-foreground">{systemNumber(systemId)}</span>
            <span>{systemShortName(data, systemId)}</span>
            <span className="text-xs font-normal text-muted-foreground group-hover:text-foreground group-aria-[current]:text-foreground">
              <ProgressLabel progress={progressOf(views[systemId])} />
            </span>
          </button>
        ))}
      </nav>
      {SYSTEM_IDS.map(
        (systemId) =>
          visited.includes(systemId) && (
            <div key={systemId} hidden={systemId !== shown}>
              <SystemColumn
                // A new run of a system is a column of its own: nothing chosen or said in the one before is carried over, and it opens on its first disturbance.
                key={views[systemId].runs}
                data={data}
                m={m}
                sources={sources}
                system={systemId}
                mode={state.mode}
                view={views[systemId]}
                completed={state.status === 'completed'}
                can={can}
                wrong={(observation) => wrong(systemId, observation)}
                act={act}
                opensAt={opensAt?.system === systemId ? opensAt.entry : undefined}
                headingRef={(element) => void (headings.current[systemId] = element)}
              />
            </div>
          ),
      )}
    </div>
  )
}

interface SystemColumnProps {
  data: LechatelierData
  m: LechatelierModel
  sources: readonly Source[]
  system: SystemId
  mode: Mode
  view: SystemView
  completed: boolean
  can(action: Action): Blocked | null
  wrong(observation: Observation): Field[]
  act(action: Action): void
  opensAt?: number | undefined
  /** The heading of the entry shown, which takes focus when the system comes to be shown. */
  headingRef(element: HTMLHeadingElement | null): void
}

/**
 * One system of the lab: what it is, until its run is begun; then its list, the disturbances and after them the
 * entry that closes the run, one at a time (Paged); and under the ways on, the sources of the disturbance shown
 * and the bench. The bench is one place that every disturbance's page has: what stands on it for this system, and
 * a tile with its hazards for each of the lab's ten bottles.
 *
 * An entry is drawn from the first time it is shown, and stays drawn after it, hidden, so that a disturbance keeps
 * what was chosen there and not yet recorded while another is looked at. Changing entry moves focus to its heading.
 */
function SystemColumn({ data, m, sources, system, mode, view, completed, can, wrong, act, opensAt, headingRef }: SystemColumnProps) {
  const { disturbances } = systemOf(data, system)
  const closing = disturbances.length
  const [index, setIndex] = useState(() => opensAt ?? openingEntry(view))
  const [visited, setVisited] = useState<readonly number[]>([index])
  const headings = useRef<(HTMLHeadingElement | null)[]>([])
  const shown = useRef(index)
  useEffect(() => {
    if (shown.current !== index) headings.current[index]?.focus()
    shown.current = index
  }, [index])
  const title = (at: number) => (at === closing ? PAGE_TEXT.outcome : disturbanceTitle(data, disturbances[at]!.id))
  const disturbanceId = disturbances[index]?.id
  const cited = useMemo(() => (disturbanceId === undefined ? null : lechatelierCitations(data, disturbanceId, sources)), [data, disturbanceId, sources])
  // Until a run is begun the system says what it is; from then on the room is the disturbance's.
  const begun = progressOf(view) !== 'not-started' || view.runs > 1
  const refs = (at: number) => (element: HTMLHeadingElement | null) => {
    headings.current[at] = element
    if (at === index) headingRef(element)
  }

  return (
    <div className="grid gap-3">
      {!begun && (
        <div className="grid max-w-prose gap-1 text-sm">
          <p className="font-medium">{systemName(data, system)}</p>
          <p>{SYSTEM_AIM[system]}</p>
          {!completed && <p className="text-muted-foreground">{LAB_TEXT.complete}</p>}
        </div>
      )}
      <Paged
        items={[...view.disturbances.map((d, at) => ({ id: d.id, heading: disturbances[at]!.name, note: <StatusLabel status={d.status} /> })), { id: 'closing', heading: PAGE_TEXT.outcome, note: <RunLabel view={view} /> }]}
        index={index}
        onGo={(to) => {
          setIndex(to)
          if (!visited.includes(to)) setVisited([...visited, to])
          // The entry already shown: its heading takes focus all the same, as the list is closed under it.
          if (to === index) headings.current[index]?.focus()
        }}
        text={{ list: PAGE_TEXT.disturbances, previous: () => PAGE_TEXT.previous(title(index - 1)), next: () => PAGE_TEXT.next(title(index + 1)) }}
        // The disturbance's two columns need more room than a primer's card: the list stays behind its button for longer.
        roomy
        after={
          // Each is a line of words with a hit area a finger tall laid over it, which reaches 12 px over and under a closed one and 24 px over an open one. They stand far enough apart, and far enough under Previous, that no area lies over another control: closer, a tap on Sources with the bench open under it closed the bench and opened nothing. As in the Group I cations lab.
          <div className="mt-4 grid gap-9 text-sm">
            {cited !== null && <Sources citations={cited} derived={SOURCES_TEXT} />}
            <Disclosure summary={PAGE_TEXT.bench}>
              <Bench data={data} sources={sources} system={system} />
            </Disclosure>
          </div>
        }
      >
        {view.disturbances.map(
          (d, at) =>
            visited.includes(at) && (
              <div key={d.id} hidden={at !== index}>
                <DisturbanceCard data={data} m={m} system={system} mode={mode} view={view} disturbance={d} can={can} wrong={wrong} act={act} headingRef={refs(at)} />
              </div>
            ),
        )}
        {visited.includes(closing) && (
          <div hidden={index !== closing}>
            <Closing data={data} system={system} mode={mode} view={view} completed={completed} can={can} act={act} headingRef={refs(closing)} />
          </div>
        )}
      </Paged>
    </div>
  )
}

/**
 * What a bottle's label carries, in two lines at the most: the formula over the strength; for the solid, whose
 * formula is wider than the label, the formula cut before the dot of its water; and for the indicator, which the
 * record gives neither a formula nor a strength, what it is.
 */
export const labelLines = (reagent: Pick<Reagent, 'formula' | 'molarity' | 'form'>): string[] =>
  reagent.formula === undefined ? [reagent.form] : reagent.molarity === undefined ? reagent.formula.split(/(?=·)/) : [reagent.formula, `${reagent.molarity} M`]

/** A bottle of the bench: its name, its label, and its hazards, closed. */
function ReagentTile({ reagent, sources }: { reagent: Reagent; sources: readonly Source[] }) {
  return (
    <BottleTile name={reagent.name} lines={labelLines(reagent)} rows={[]}>
      <Hazards classifiedAs={reagent.classifiedAs} hazards={reagent.hazards} sources={sources} solid={reagent.form === 'solid'} />
    </BottleTile>
  )
}

/** The bench: what stands on it for the system shown, in words, and the lab's ten bottles, each a tile with its hazards. The water has no tile. */
function Bench({ data, sources, system }: { data: LechatelierData; sources: readonly Source[]; system: SystemId }) {
  return (
    <div className="grid gap-3">
      <Listed items={benchLines(data, system)} />
      {/* Two to a row where the bench has the width for a tile's hazards to be read beside its bottle, by the width the bench itself has. */}
      <div className="grid w-full gap-2 @2xl:grid-cols-2">
        {data.reagents.map((reagent) => (
          <ReagentTile key={reagent.id} reagent={reagent} sources={sources} />
        ))}
      </div>
    </div>
  )
}

interface ClosingProps {
  data: LechatelierData
  system: SystemId
  mode: Mode
  view: SystemView
  completed: boolean
  can(action: Action): Blocked | null
  act(action: Action): void
  headingRef(element: HTMLHeadingElement | null): void
}

/**
 * The last entry of a system's list, which closes a run: how the run stands or came out, the check, where it is
 * still to be asked for, and the way to work the system again, which a lab that is complete still takes. Guided
 * checks a system by itself once its last disturbance is done, so the check is there in Challenge, and in Guided
 * only for a run whose last answer was given in Challenge. How the run came out takes focus when the check is made.
 */
function Closing({ data, system, mode, view, completed, can, act, headingRef }: ClosingProps) {
  const headingId = useId()
  const placeId = useId()
  const [said, say] = useSaid()
  const outcomeRef = useRef<HTMLDivElement>(null)
  const check: Action = { type: 'checkSystem', system }
  const again: Action = { type: 'workAgain', system }
  const { outcome } = view
  const over = outcome.state === 'counts' || outcome.state === 'does-not-count'
  // The check's own button goes when the check is made: focus goes to how the run came out. Never on load.
  const wasOver = useRef(over)
  useEffect(() => {
    if (over && !wasOver.current && document.activeElement === document.body) outcomeRef.current?.focus()
    wasOver.current = over
  }, [over])
  const press = (action: Action) => {
    const blocked = can(action)
    if (blocked !== null) return say(blockedText(data, blocked, view.disturbance), true)
    say('')
    act(action)
  }
  const checkOffered = outcome.state === 'to-check' || (mode === 'challenge' && outcome.state === 'open')

  return (
    <section aria-labelledby={headingId} className="grid min-w-0 gap-3">
      <div className="grid gap-1">
        <p id={placeId} className="text-xs text-muted-foreground">
          {systemNumber(system)}
          {' · '}
          {PAGE_TEXT.run(view.runs)}
          {' · '}
          <span className="font-medium text-foreground">
            <RunLabel view={view} />
          </span>
        </p>
        <h2 ref={headingRef} id={headingId} tabIndex={-1} aria-describedby={placeId} className="w-fit rounded-sm text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {PAGE_TEXT.outcome}
        </h2>
        <p className="max-w-prose text-sm">{systemName(data, system)}</p>
        {/* Always there, and empty until the system counts, so that a screen reader says it when it comes. */}
        <p role="status" className="text-sm font-medium">
          {view.done && <Marked mark="✓" done>{PAGE_TEXT.systemDone}</Marked>}
        </p>
      </div>

      <div className="grid justify-items-start gap-3 rounded-lg border bg-card p-3 text-sm">
        {/* Room about the words, taken back from the card's own, so that the ring that shows where focus went does not hug them. */}
        <div ref={outcomeRef} tabIndex={-1} className="-mx-2 -my-1 grid max-w-prose gap-2 rounded-md px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {outcome.state === 'open' ? (
            <p className="text-muted-foreground">{RECORD_TEXT.open}</p>
          ) : (
            <p>
              {over && <Mark ok={outcome.state === 'counts'} />}
              {outcomeText(data, outcome)}
            </p>
          )}
          {!completed && <p className="text-muted-foreground">{LAB_TEXT.complete}</p>}
        </div>
        {checkOffered && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <Control unavailable={can(check) !== null} className="h-auto min-h-11 px-4 py-1 text-left whitespace-normal" onClick={() => press(check)}>
              {PAGE_TEXT.checkSystem}
            </Control>
            <p className="max-w-prose flex-1 basis-48 text-muted-foreground">{PAGE_TEXT.checkSystemHelp}</p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <Control unavailable={can(again) !== null} className="h-auto min-h-11 px-4 py-1 text-left whitespace-normal" onClick={() => press(again)}>
            {PAGE_TEXT.workAgain}
          </Control>
          <p className="max-w-prose flex-1 basis-48 text-muted-foreground">{PAGE_TEXT.workAgainHelp}</p>
        </div>
        <Line said={said} />
      </div>
    </section>
  )
}
