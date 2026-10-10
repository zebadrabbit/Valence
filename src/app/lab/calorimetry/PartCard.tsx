import { useEffect, useId, useMemo, useRef, useState, type ReactNode, type Ref } from 'react'
import { Disclosure, Sources } from '@/app/explore/InspectorCard'
import { Calculator } from '@/app/lab/Calculator'
import { Control } from '@/app/lab/Control'
import { Hazards } from '@/app/lab/Hazards'
import { Line, Mark, useSaid } from '@/app/lab/Line'
import { ROLE } from '@/app/lab/roles'
import { BottleTile, Listed, Marked, Step } from '@/app/lab/stationPieces'
import { WarningGroup } from '@/app/lab/WarningGroup'
import { candidatesOf, PART_IDS, type CalorimetryData, type PartId, type Reagent } from '@/chem-data/calorimetry/data'
import { calorimetryCitations } from '@/chem-data/citations'
import type { Source } from '@/chem-data/schema'
import type { Action, Blocked, CalorimetryModel, Mode, PartView, Warning } from '@/engine/calorimetry'
import { CupDrawing } from './CupDrawing'
import { Graph } from './Graph'
import {
  BENCH_TEXT,
  CHANGE_LABEL,
  PAGE_TEXT,
  PART_AIM,
  PROGRESS_TEXT,
  RECORD_TEXT,
  SOURCES_TEXT,
  WARNING_BUTTONS,
  WARNING_TEXT,
  benchLines,
  blockedText,
  cupText,
  describeGraph,
  expectedText,
  metalHazardsHeading,
  outcomeText,
  partNotes,
  partTitle,
  pointCallout,
  progressOf,
  type Progress,
} from './messages'
import { Worksheet } from './Worksheet'

/** Beside a part's progress in words, and hidden from a screen reader, which is given the words. */
export const PROGRESS_MARK: Record<Progress, string> = { 'not-started': '○', cup: '◔', worksheet: '◑', 'not-counted': '◑', done: '✓' }

/** A part's progress as a mark and its words; the tick of a part done is in the role of a done mark. */
export function ProgressLabel({ progress }: { progress: Progress }) {
  return (
    <Marked mark={PROGRESS_MARK[progress]} done={progress === 'done'}>
      {PROGRESS_TEXT[progress]}
    </Marked>
  )
}

export interface PartCardProps {
  data: CalorimetryData
  m: CalorimetryModel
  sources: readonly Source[]
  part: PartId
  mode: Mode
  view: PartView
  /** False while another part is the one shown: this one stays drawn, hidden, and keeps what was typed in it. */
  shown: boolean
  reducedMotion: boolean
  /** Why an action cannot be done now, or null; the technique steps it would skip, in Guided; and the action done. The page's, so that the card holds no state of the lab. */
  can(action: Action): Blocked | null
  warn(action: Action): Warning[]
  act(action: Action): void
  /** The part's heading, which takes focus when the part comes to be shown. */
  headingRef?: (element: HTMLHeadingElement | null) => void
}

/** The tiles of what is on the bench, each with its hazards closed: side by side where there is room for two. */
const Tiles = ({ children }: { children: ReactNode }) => <div className="grid w-full gap-2 sm:grid-cols-2">{children}</div>

/** A reagent that comes in a bottle: the acid, the base, and the jar of ammonium nitrate. */
function ReagentTile({ reagent, sources }: { reagent: Reagent; sources: readonly Source[] }) {
  return (
    <BottleTile name={reagent.name} lines={reagent.form === 'solution' ? [reagent.formula, `${reagent.molarity.toFixed(2)} M`] : [reagent.formula]} rows={[]}>
      <Hazards classifiedAs={reagent.classifiedAs} hazards={reagent.hazards} sources={sources} solid={reagent.form !== 'solution'} />
    </BottleTile>
  )
}

/** A metal the piece may be, or the one it was: a piece of metal is in no bottle, so the tile is its name, its symbol and its hazards. */
function MetalTile({ metal, sources }: { metal: Reagent; sources: readonly Source[] }) {
  return (
    <div role="group" aria-label={metal.name} className="grid content-start justify-items-start gap-1.5 rounded-md border p-2">
      <h4 className="font-medium">
        {metal.name} <span className="font-normal text-muted-foreground">{metal.formula}</span>
      </h4>
      <Hazards classifiedAs={metal.classifiedAs} hazards={metal.hazards} sources={sources} solid />
    </div>
  )
}

/**
 * One part of the lab: its head, then one run of it as a column of cards (Run), and its Sources. The head
 * says which run this is and how far the part has come, what the part finds (in Challenge once the part is done,
 * and not before), and that the part is done once a run of it counts. A new run of the part is a new column: nothing typed or said in the one before is carried over,
 * and its heading takes focus.
 */
export function PartCard(props: PartCardProps) {
  const { data, sources, part, mode, view, can, act, headingRef } = props
  const headingId = useId()
  const placeId = useId()
  const heading = useRef<HTMLHeadingElement | null>(null)
  const cited = useMemo(() => calorimetryCitations(data, part, sources), [data, part, sources])
  // Whatever holds the whole lab holds every button here. It is said once, at the part's head.
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
        {/* What the part finds says which way the heat goes, which is an entry of the worksheets of parts 1 and 2: Challenge is shown it once the part is done. */}
        {(mode === 'guided' || view.done) && <p className="max-w-prose text-sm">{PART_AIM[part]}</p>}
        {/* Always there, and empty until the part is done, so that a screen reader says it when it comes. */}
        <p role="status" className="text-sm font-medium">
          {view.done && <Marked mark="✓" done>{BENCH_TEXT.done}</Marked>}
        </p>
        {completed && <p className={`text-sm ${ROLE.held}`}>{blockedText(part, 'lab-completed')}</p>}
      </div>
      <Run
        key={view.runs}
        {...props}
        onRunAgain={() => {
          act({ type: 'runAgain', part })
          heading.current?.focus()
        }}
      />
      <Sources citations={cited} derived={SOURCES_TEXT} />
    </section>
  )
}

/**
 * One run of a part, as a column of cards, each there when the engine has a use for it: the bench; the cup,
 * drawn, with its state in words and the four buttons that set it up and start the change; once the logger is
 * started, the graph, to be explored, with "Run on" over it; once the change is started, the notebook; and once
 * there is a run to leave behind, how this run came out, with "Run this part again". A button that cannot be
 * used now stays focusable and says why when pressed. In Guided, starting the change with the lid off or the
 * stirrer still raises the warning in the cup's card, which takes focus: the way back puts focus on the step that
 * was skipped, and the way on starts the change. When the worksheet is checked, focus goes to how the run came
 * out.
 *
 * The run keeps what is typed and not yet entered, the reading last looked at, a warning that is showing and what
 * its message lines last said; everything the lab stores comes to it as `view` and leaves it through `act`.
 */
function Run({ data, m, sources, part, mode, view, shown, reducedMotion, can, warn, act, onRunAgain }: PartCardProps & { onRunAgain(): void }) {
  const seenId = useId()
  const [cupSaid, sayOfCup] = useSaid()
  const [graphSaid, sayOfGraph] = useSaid()
  const [outcomeSaid, sayOfOutcome] = useSaid()
  const [lookSaid, sayOfLook] = useSaid()
  const [warned, setWarned] = useState(false)
  const lidRef = useRef<HTMLButtonElement>(null)
  const stirRef = useRef<HTMLButtonElement>(null)
  const changeRef = useRef<HTMLButtonElement>(null)
  const warningRef = useRef<HTMLDivElement>(null)
  const outcomeRef = useRef<HTMLDivElement>(null)
  // A warning takes focus when it is raised.
  useEffect(() => {
    if (warned) warningRef.current?.focus()
  }, [warned])
  // The worksheet's own controls go when it is checked: focus goes to what the check found. Never on load.
  const over = view.outcome.state !== 'open'
  const wasOver = useRef(over)
  useEffect(() => {
    if (over && !wasOver.current) outcomeRef.current?.focus()
    wasOver.current = over
  }, [over])

  const { cup, graph, bench, expected } = view
  const change: Action = { type: 'startChange', part }
  const again: Action = { type: 'runAgain', part }
  // A warning that is showing is of a change Guided would warn of now. Once it would not (the lid was put on and the stirrer started, or the mode was changed to Challenge), it is dropped, and does not come back by itself.
  if (warned && warn(change).length === 0) setWarned(false)

  /** A press of a button of the cup: done, or refused with the engine's reason, which `say` puts on the line of the button's own card. Either way a warning that was showing is dropped. */
  const press = (action: Action, say = sayOfCup) => {
    setWarned(false)
    const blocked = can(action)
    if (blocked !== null) return say(blockedText(part, blocked), true)
    say('')
    act(action)
  }
  const pressRunOn = () => press({ type: 'runOn', part }, sayOfGraph)
  const changePressed = () => {
    if (can(change) !== null || warn(change).length === 0) return press(change)
    sayOfCup('')
    // Raised again by the same press, it takes focus again.
    if (warned) warningRef.current?.focus()
    else setWarned(true)
  }
  /** A reading of the graph is looked at: stored the first time, where the engine takes it, and said each time. A completed lab stores nothing and can still be looked at. */
  const look = (step: number) => {
    const action: Action = { type: 'look', part, step }
    if (!graph.looked.includes(step) && can(action) === null) act(action)
    sayOfLook(pointCallout(m, step, graph.readings[step]!))
  }
  /**
   * A button of the cup. One that names a step already taken carries a tick and is not drawn faint, for as long as
   * the run is shown: whatever else holds the cup by then, the ticks say how this run's cup was worked.
   */
  const step = (action: Action, label: string, taken: boolean, ref?: Ref<HTMLButtonElement>, onClick = () => press(action)) => {
    const blocked = can(action)
    return (
      <Control ref={ref} unavailable={blocked !== null} dimmed={blocked !== null && !taken} variant={taken ? 'secondary' : 'outline'} className="min-h-11 px-4" onClick={onClick}>
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
  const metals = candidatesOf(data).filter((candidate) => expected?.kind !== 'metal' || candidate.id === expected.metalId)
  const used = data.parts[PART_IDS.indexOf(part)]!.amounts.flatMap((amount) => data.reagents.filter((reagent) => reagent.id === amount.reagentId))
  const notes = expected === null ? [] : partNotes(data, part, expected)

  return (
    <>
      {/* What the reading looked at shows, for a screen reader: the eye has the callout on the graph. */}
      <div className="sr-only">
        <Line said={lookSaid} />
      </div>

      <Step heading={BENCH_TEXT.bench}>
        <Listed items={benchLines(data, part, bench)} />
        {part === 'metal' ? (
          <>
            <table className="w-full max-w-xs border-collapse">
              <caption className="mb-1 text-left font-medium">{BENCH_TEXT.candidates}</caption>
              <tbody>
                {candidatesOf(data).map((candidate) => (
                  <tr key={candidate.id}>
                    <th scope="row" className="border-b py-1 pr-6 text-left font-normal">
                      {candidate.name}
                    </th>
                    <td className={`border-b py-1 tabular-nums ${ROLE.value}`}>
                      {candidate.specificHeat.value.toFixed(3)} {candidate.specificHeat.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="max-w-prose font-medium">{metalHazardsHeading(data, expected?.kind === 'metal' ? expected.metalId : null)}</p>
            <Tiles>
              {metals.map((metal) => (
                <MetalTile key={metal.id} metal={metal} sources={sources} />
              ))}
            </Tiles>
          </>
        ) : (
          <Tiles>
            {used.map((reagent) => (
              <ReagentTile key={reagent.id} reagent={reagent} sources={sources} />
            ))}
          </Tiles>
        )}
      </Step>

      <Step heading={BENCH_TEXT.cup}>
        <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2">
          <CupDrawing part={part} cup={cup} reducedMotion={reducedMotion} />
          {/* The cup's state in words, said again whenever it changes. Beside the drawing at every width that shows a bench. */}
          <p role="status" className="max-w-prose flex-1 basis-48 font-medium">
            {cupText(part, cup, graph.readings.length)}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {step({ type: 'putLidOn', part }, BENCH_TEXT.lid, cup.lidOn, lidRef)}
          {step({ type: 'stir', part }, BENCH_TEXT.stir, cup.stirring, stirRef)}
          {step({ type: 'startLogger', part }, BENCH_TEXT.logger, cup.loggerStarted)}
          {step(change, CHANGE_LABEL[part], cup.changeStarted, changeRef, changePressed)}
        </div>
        {warned && warn(change).length > 0 && (
          <WarningGroup
            ref={warningRef}
            warnings={warn(change).map((warning) => ({ id: warning, ...WARNING_TEXT[warning] }))}
            buttons={WARNING_BUTTONS}
            onBack={() => {
              // To the first step that was skipped.
              const skipped = warn(change)[0] === 'lid-off' ? lidRef : stirRef
              setWarned(false)
              skipped.current?.focus()
            }}
            onGoOn={() => {
              press(change)
              changeRef.current?.focus()
            }}
          />
        )}
        <Line said={cupSaid} />
      </Step>

      {cup.loggerStarted && (
        <Step heading={BENCH_TEXT.graph}>
          {/* Time passes here, beside the picture it adds to, and not in the cup's card: a press shows in the graph and nowhere else. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {step({ type: 'runOn', part }, BENCH_TEXT.runOn, false, undefined, pressRunOn)}
            <p className="max-w-prose flex-1 basis-48 text-muted-foreground">{BENCH_TEXT.runOnHelp(m)}</p>
          </div>
          <Line said={graphSaid} />
          {/* What to do with the picture, and its description. What a reading is, is not said here: a point says it when it is looked at. */}
          <div id={seenId} className="grid max-w-prose gap-1">
            <p>{BENCH_TEXT.explore}</p>
            <p className="text-muted-foreground">{PAGE_TEXT.arrows}</p>
          </div>
          <Graph m={m} graph={graph} describedBy={seenId} onLook={look} />
          {/* Closed: it names the starting temperature and the highest or lowest outright, which the learner is to find on the graph. */}
          <Disclosure summary={PAGE_TEXT.inWords}>
            <p className="max-w-prose">{describeGraph(m, graph)}</p>
          </Disclosure>
        </Step>
      )}

      {cup.changeStarted && (
        <Step heading={BENCH_TEXT.notebook}>
          {/* One calculator on the page: a part that is not the one shown has none, so that no panel floats over the page with no button of its own in view. */}
          {shown && <Calculator />}
          <Worksheet
            data={data}
            part={part}
            mode={mode}
            entries={view.worksheet}
            graph={graph}
            enter={(field, value) => {
              const action: Action = { type: 'enter', part, field, value }
              const blocked = can(action)
              if (blocked === null) act(action)
              return blocked
            }}
            checkBlocked={can({ type: 'check', part })}
            onCheck={() => act({ type: 'check', part })}
          />
        </Step>
      )}

      {(over || view.done || (can(again) === null && (cup.changeStarted || graph.full))) && (
        <Step heading={PAGE_TEXT.outcome}>
          <div ref={outcomeRef} tabIndex={-1} className="grid max-w-prose gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {view.outcome.state === 'open' ? (
              <p className="text-muted-foreground">{RECORD_TEXT.open}</p>
            ) : (
              <p>
                <Mark ok={view.outcome.state === 'counts'} />
                {outcomeText(m, view.outcome)}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <Control
              unavailable={can(again) !== null}
              className="min-h-11 px-4"
              onClick={() => {
                const blocked = can(again)
                if (blocked !== null) return sayOfOutcome(blockedText(part, blocked), true)
                onRunAgain()
              }}
            >
              {BENCH_TEXT.runAgain}
            </Control>
            <p className="max-w-prose flex-1 basis-48 text-muted-foreground">{BENCH_TEXT.runAgainHelp}</p>
          </div>
          <Line said={outcomeSaid} />
          {/* Once a run of the part counts and not before, and closed: the figure the result was held to, and what the record says of it. */}
          {expected !== null && (
            <Disclosure summary={BENCH_TEXT.notes}>
              <div className="grid max-w-[75ch] gap-2 leading-relaxed">
                <p className="font-medium">{expectedText(data, part, expected)}</p>
                {(expected.kind === 'metal' ? notes.slice(0, -1) : notes).map((note) => (
                  <p key={note}>{note}</p>
                ))}
                {expected.kind === 'metal' && (
                  <>
                    <h4 className="font-medium">{BENCH_TEXT.working}</h4>
                    <p>{notes.at(-1)}</p>
                  </>
                )}
              </div>
            </Disclosure>
          )}
        </Step>
      )}
    </>
  )
}
