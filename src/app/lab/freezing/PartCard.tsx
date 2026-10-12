import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { Disclosure, Sources } from '@/app/explore/InspectorCard'
import { Calculator } from '@/app/lab/Calculator'
import { Control } from '@/app/lab/Control'
import { Hazards } from '@/app/lab/Hazards'
import { Line, Mark, useSaid } from '@/app/lab/Line'
import { ROLE } from '@/app/lab/roles'
import { Listed, Marked, Step } from '@/app/lab/stationPieces'
import { WarningGroup } from '@/app/lab/WarningGroup'
import { freezingCitations } from '@/chem-data/citations'
import { candidatesOf, solutesOf, type FreezingData, type PartId } from '@/chem-data/freezing/data'
import type { Source } from '@/chem-data/schema'
import type { Action, Blocked, FreezingModel, Mode, PartView, Warning } from '@/engine/freezing'
import { CupDrawing } from './CupDrawing'
import { Graph } from './Graph'
import {
  BENCH_TEXT,
  PAGE_TEXT,
  PART_AIM,
  PROGRESS_TEXT,
  RECORD_TEXT,
  SOURCES_TEXT,
  WARNING_BUTTONS,
  WARNING_TEXT,
  addLabel,
  benchLines,
  blockedText,
  constantText,
  cupText,
  describeGraph,
  expectedText,
  hazardsHeading,
  notebookLines,
  outcomeText,
  partNotes,
  partTitle,
  pointCallout,
  progressOf,
  soluteChoices,
  wantedText,
  type Progress,
} from './messages'
import { Notebook } from './Notebook'

type Reagent = FreezingData['reagents'][number]

/** Beside a part's progress in words, and hidden from a screen reader, which is given the words. */
export const PROGRESS_MARK: Record<Progress, string> = { 'not-started': '○', cup: '◔', worksheet: '◑', 'not-counted': '◑', half: '◐', done: '✓' }

/** A part's progress as a mark and its words; the tick of a part done is in the role of a done mark. */
export function ProgressLabel({ progress }: { progress: Progress }) {
  return (
    <Marked mark={PROGRESS_MARK[progress]} done={progress === 'done'}>
      {PROGRESS_TEXT[progress]}
    </Marked>
  )
}

export interface PartCardProps {
  data: FreezingData
  m: FreezingModel
  sources: readonly Source[]
  part: PartId
  mode: Mode
  view: PartView
  /** False while another part is the one shown: this one stays drawn, hidden, and keeps what was typed in it. */
  shown: boolean
  reducedMotion: boolean
  /** Why an action cannot be done now, or null; the errors of technique it would make, in Guided; and the action done. The page's, so that the card holds no state of the lab. */
  can(action: Action): Blocked | null
  warn(action: Action): Warning[]
  act(action: Action): void
  /** The part's heading, which takes focus when the part comes to be shown. */
  headingRef?: (element: HTMLHeadingElement | null) => void
}

/** The tiles of what may go into the cup, each with its hazards closed: side by side where there is room for two. */
const Tiles = ({ children }: { children: ReactNode }) => <div className="grid w-full gap-2 sm:grid-cols-2">{children}</div>

/** A liquid the unknown may be, or a solute of part 3: its name, its formula and its hazards. None is drawn in a bottle: the unknown's would be one bottle and not three. */
function ReagentTile({ reagent, sources }: { reagent: Reagent; sources: readonly Source[] }) {
  return (
    <div role="group" aria-label={reagent.name} className="grid content-start justify-items-start gap-1.5 rounded-md border p-2">
      <h4 className="font-medium">
        {reagent.name} <span className="font-normal text-muted-foreground">{reagent.formula}</span>
      </h4>
      {/* Neither a liquid of this bench nor a solid is a solution of some strength: the note is of the thing as it is used. */}
      <Hazards classifiedAs={reagent.classifiedAs} hazards={reagent.hazards} sources={sources} solid />
    </div>
  )
}

/** The table the notebook's molar masses are read from: the three liquids the unknown may be, or what part 3 can dissolve. */
function MolarMasses({ caption, rows }: { caption: string; rows: readonly Reagent[] }) {
  return (
    <table className="w-full max-w-sm border-collapse">
      <caption className="mb-1 text-left font-medium">{caption}</caption>
      <tbody>
        {rows.map((reagent) => (
          <tr key={reagent.id}>
            <th scope="row" className="border-b py-1 pr-6 text-left font-normal">
              {reagent.name} <span className="text-muted-foreground">{reagent.formula}</span>
            </th>
            <td className={`border-b py-1 text-right whitespace-nowrap tabular-nums ${ROLE.value}`}>
              {reagent.molarMass.value.toFixed(2)} {reagent.molarMass.unit}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/**
 * One part of the lab: its head, then one run of it as a column of cards (Run), and its Sources. The head says
 * which run this is and how far the part has come, what the part finds, in both modes, what part 3 still wants,
 * and that the part is done once it is. A new run of the part is a new column: nothing typed or said in the one
 * before is carried over, and its heading takes focus.
 */
export function PartCard(props: PartCardProps) {
  const { data, sources, part, view, can, act, headingRef } = props
  const headingId = useId()
  const placeId = useId()
  const heading = useRef<HTMLHeadingElement | null>(null)
  const cited = useMemo(() => freezingCitations(data, part, sources), [data, part, sources])
  // Whatever holds a whole part holds every button here. It is said once, at the part's head. Part 3 is never held so: it stays open once the lab is complete.
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
        {/* What the part finds, in both modes: no sentence gives a figure. */}
        <p className="max-w-prose text-sm">{PART_AIM[part]}</p>
        {view.wanted !== null && <p className="max-w-prose text-sm text-muted-foreground">{wantedText(view.wanted)}</p>}
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
      {/* Room over it and under it: an open disclosure's hit area stands on its line and reaches 24 px up, toward the last disclosure of the card above; a closed one's reaches 12 px under its line, toward Previous, in the row below. */}
      <div className="pt-4 pb-2">
        <Sources citations={cited} derived={SOURCES_TEXT} />
      </div>
    </section>
  )
}

/**
 * One run of a part, as a column of cards, each there when the engine has a use for it: the bench; the cup,
 * drawn, with its state in words and the buttons that set it up and put the solute in; once the logger is
 * started, the graph, to be explored, with "Run on" over it; once the solute is in, straining and weighing; once
 * the solution is weighed (in part 1, once the logger is started), the notebook; and once there is a run to leave
 * behind, how this run came out, with "Run this part again". A button that cannot be used now stays focusable and
 * says why when pressed.
 *
 * In Guided the engine's warnings are advisory. A press that would make an error of technique raises the warning
 * in the card of the button pressed, and the warning takes focus: the way back puts focus on the step that was
 * skipped, or on the button pressed where none was, and the way on does what was pressed. When the notebook is
 * checked, focus goes to how the run came out.
 *
 * The run keeps what is typed and not yet entered, the reading last looked at, a warning that is showing and what
 * its message lines last said; everything the lab stores comes to it as `view` and leaves it through `act`.
 */
function Run({ data, m, sources, part, mode, view, shown, reducedMotion, can, warn, act, onRunAgain }: PartCardProps & { onRunAgain(): void }) {
  const seenId = useId()
  const chooseId = useId()
  const [benchSaid, sayOfBench] = useSaid()
  const [cupSaid, sayOfCup] = useSaid()
  const [graphSaid, sayOfGraph] = useSaid()
  const [strainSaid, sayOfStrain] = useSaid()
  const [outcomeSaid, sayOfOutcome] = useSaid()
  const [lookSaid, sayOfLook] = useSaid()
  // The action Guided has warned of and has not been answered on.
  const [asked, setAsked] = useState<Action | null>(null)
  const buttons = useRef<Partial<Record<Action['type'], HTMLButtonElement | null>>>({})
  const warningRef = useRef<HTMLDivElement>(null)
  const notebookRef = useRef<HTMLDivElement>(null)
  const outcomeRef = useRef<HTMLDivElement>(null)
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

  const { cup, graph, bench, expected } = view
  const again: Action = { type: 'runAgain', part }
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
      return say(blockedText(part, blocked), true)
    }
    say('')
    // A copy, so that the same press made again is a new warning to the effect that gives it focus.
    if (!answered && warn(action).length > 0) return setAsked({ ...action })
    setAsked(null)
    act(action)
  }
  const pressRunOn = () => {
    // A logger that is full with no solute in, or with no reading since, leaves no cup to finish.
    const spent = part !== 'water' && (graph.addedAt === null || graph.addedAt === graph.readings.length - 1)
    if (can({ type: 'runOn', part }) === 'logger-full' && spent) {
      setAsked(null)
      return sayOfGraph(BENCH_TEXT.spent, true)
    }
    press({ type: 'runOn', part }, sayOfGraph)
  }
  /** Guided's warning of the action asked about, in the card whose buttons are `types`. */
  const warning = (types: readonly Action['type'][], say: typeof sayOfCup) => {
    if (asked === null || !types.includes(asked.type) || warn(asked).length === 0) return null
    const raised = warn(asked)
    return (
      <WarningGroup
        ref={warningRef}
        warnings={raised.map((one) => ({ id: one, ...WARNING_TEXT[one] }))}
        buttons={WARNING_BUTTONS}
        onBack={() => {
          // To the step that was skipped, where the warning is of one; else to what was pressed.
          const to = raised[0] === 'lid-off' ? 'putLidOn' : raised[0] === 'not-stirring' ? 'stir' : raised[0] === 'not-strained' ? 'strain' : asked.type
          setAsked(null)
          if (to === 'enter') notebookRef.current?.querySelector('input')?.focus()
          else buttons.current[to]?.focus()
        }}
        onGoOn={() => {
          press(asked, say, true)
          buttons.current[asked.type]?.focus()
        }}
      />
    )
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
  // Until the unknown is named by a run that counts, all three liquids it may be; then the one it was.
  const liquids = candidatesOf(data).filter((candidate) => expected?.kind !== 'liquid' || candidate.id === expected.liquidId)
  // Until a solute is chosen for this run, all four; then the one chosen.
  const solutes = solutesOf(data).filter((solute) => bench.solute === null || solute.id === bench.solute)
  const fromBench = notebookLines(data, part, view)
  const notebookOpen = part === 'water' ? cup.loggerStarted : cup.weighed

  return (
    <>
      {/* What the reading looked at shows, for a screen reader: the eye has the callout on the graph. */}
      <div className="sr-only">
        <Line said={lookSaid} />
      </div>

      <Step heading={BENCH_TEXT.bench}>
        <Listed items={benchLines(data, part, view)} />
        {part !== 'water' && (
          <p>
            {BENCH_TEXT.constant}: <span className={`whitespace-nowrap tabular-nums ${ROLE.value}`}>{constantText(data)}</span>
          </p>
        )}
        {part === 'unknown' && (
          <>
            <MolarMasses caption={BENCH_TEXT.candidates} rows={candidatesOf(data)} />
            <p className="max-w-prose font-medium">{hazardsHeading(data, expected?.kind === 'liquid' ? expected.liquidId : null)}</p>
            <Tiles>
              {liquids.map((liquid) => (
                <ReagentTile key={liquid.id} reagent={liquid} sources={sources} />
              ))}
            </Tiles>
          </>
        )}
        {part === 'particles' && (
          <>
            <MolarMasses caption={BENCH_TEXT.solutes} rows={solutesOf(data)} />
            {/* The choice of what this run dissolves: a button for each, the one chosen pressed and ticked. It can be changed until the solute is in the cup. */}
            <div role="group" aria-labelledby={chooseId} className="grid justify-items-start gap-1.5">
              <p id={chooseId} className="font-medium">
                {BENCH_TEXT.choose}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {soluteChoices(data).map((choice) => {
                  const action: Action = { type: 'chooseSolute', part, solute: choice.value }
                  const chosen = bench.solute === choice.value
                  const blocked = can(action)
                  return (
                    <Control key={choice.value} aria-pressed={chosen} unavailable={blocked !== null} dimmed={blocked !== null && !chosen} variant={chosen ? 'secondary' : 'outline'} className="min-h-11 px-4" onClick={() => press(action, sayOfBench)}>
                      <span>
                        {chosen && (
                          <span aria-hidden="true" className={ROLE.done}>
                            ✓{' '}
                          </span>
                        )}
                        {choice.label}
                      </span>
                    </Control>
                  )
                })}
              </div>
              <Line said={benchSaid} />
            </div>
            <Tiles>
              {solutes.map((solute) => (
                <ReagentTile key={solute.id} reagent={solute} sources={sources} />
              ))}
            </Tiles>
          </>
        )}
      </Step>

      <Step heading={BENCH_TEXT.cup}>
        <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2">
          <CupDrawing cup={cup} reducedMotion={reducedMotion} />
          {/* The cup's state in words, said again whenever it changes: how much ice is seen is here as well as in the drawing. Beside the drawing at every width that shows a bench. */}
          <p role="status" className="max-w-prose flex-1 basis-48 font-medium">
            {cupText(data, part, view, graph.readings.length)}
          </p>
        </div>
        <div className="grid w-full justify-items-start gap-1.5">
          <div className="flex flex-wrap gap-1.5">
            {step({ type: 'fill', part }, BENCH_TEXT.fill, cup.filled)}
            {step({ type: 'putLidOn', part }, BENCH_TEXT.lid, cup.lidOn)}
            {step({ type: 'stir', part }, BENCH_TEXT.stir, cup.stirring)}
            {step({ type: 'startLogger', part }, BENCH_TEXT.logger, cup.loggerStarted)}
            {part !== 'water' && step({ type: 'addSolute', part }, addLabel(data, part, bench), cup.soluteAdded)}
          </div>
          {warning(['startLogger', 'addSolute'], sayOfCup)}
          <Line said={cupSaid} />
        </div>
      </Step>

      {cup.loggerStarted && (
        <Step heading={BENCH_TEXT.graph}>
          {/* Time passes here, beside the picture it adds to. Nothing over this button changes as it is pressed, so that it stays under the hand; what it is told is under it. */}
          <div className="grid w-full justify-items-start gap-1.5">
            <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5">
              {step({ type: 'runOn', part }, BENCH_TEXT.runOn, false, sayOfGraph, pressRunOn)}
              <p className="max-w-prose flex-1 basis-48 text-muted-foreground">{BENCH_TEXT.runOnHelp(m)}</p>
            </div>
            {warning(['runOn'], sayOfGraph)}
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

      {part !== 'water' && cup.soluteAdded && (
        <Step heading={BENCH_TEXT.straining}>
          <div className="grid w-full justify-items-start gap-1.5">
            <div className="flex flex-wrap gap-1.5">
              {step({ type: 'strain', part }, BENCH_TEXT.strain, cup.strained, sayOfStrain)}
              {step({ type: 'weigh', part }, BENCH_TEXT.weigh, cup.weighed, sayOfStrain)}
            </div>
            {warning(['strain', 'weigh'], sayOfStrain)}
            <Line said={strainSaid} />
          </div>
        </Step>
      )}

      {notebookOpen && (
        <Step heading={BENCH_TEXT.notebook}>
          {/* One calculator on the page: a part that is not the one shown has none, so that no panel floats over the page with no button of its own in view. Part 1's one entry is a reading, with nothing to work out. */}
          {shown && part !== 'water' && <Calculator />}
          {/* What the entries are worked from, said again here: the bench's own card is more than a screen up the page by now. */}
          {fromBench.length > 0 && (
            <div className="grid w-full max-w-[75ch] gap-1 rounded-md border px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">{BENCH_TEXT.fromBench}</p>
              <Listed items={fromBench} />
            </div>
          )}
          <div ref={notebookRef} className="grid w-full justify-items-start gap-3">
            <Notebook
              data={data}
              part={part}
              mode={mode}
              entries={view.worksheet}
              enter={(field, value) => {
                const action: Action = { type: 'enter', part, field, value }
                const blocked = can(action)
                if (blocked !== null) {
                  setAsked(null)
                  return blockedText(part, blocked, field)
                }
                const raised = warn(action)
                // Part 1 in Guided: a reading entered before the cup has levelled off, or with no ice left. The entry stays typed, with the warning's own title under it, and the warning's way on makes it.
                if (raised.length > 0) {
                  setAsked({ ...action })
                  return WARNING_TEXT[raised[0]!].title
                }
                setAsked(null)
                act(action)
                return null
              }}
              checkBlocked={can({ type: 'check', part })}
              onCheck={() => act({ type: 'check', part })}
            />
          </div>
          {warning(['enter'], sayOfCup)}
        </Step>
      )}

      {(over || view.done || (can(again) === null && cup.loggerStarted)) && (
        <Step heading={PAGE_TEXT.outcome}>
          {/* Room about the words, taken back from the card's own, so that the ring that shows where focus went does not hug them. */}
          <div ref={outcomeRef} tabIndex={-1} className="-mx-2 -my-1 grid max-w-prose gap-2 rounded-md px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {view.outcome.state === 'open' ? (
              <p className="text-muted-foreground">{RECORD_TEXT.open}</p>
            ) : (
              <p>
                <Mark ok={view.outcome.state === 'counts'} />
                {outcomeText(part, view.outcome, can(again) !== 'lab-completed')}
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
            {/* Part 3, once a run of it counts: the other solutes are there to try. */}
            <p className="max-w-prose flex-1 basis-48 text-muted-foreground">{part === 'particles' && expected !== null ? BENCH_TEXT.runAgainOther : BENCH_TEXT.runAgainHelp}</p>
          </div>
          <Line said={outcomeSaid} />
          {/* Once a run that counts allows it and not before, and closed: the figure the result was held to, what the record says of the part, and how the table's molar masses were worked out. Room over it: open, its hit area reaches 24 px up from its line, toward the button above. */}
          {expected !== null && (
            <div className="pt-2">
              <Disclosure summary={BENCH_TEXT.notes}>
                <div className="grid max-w-[75ch] gap-2 leading-relaxed">
                  <h4 className="font-medium">{PAGE_TEXT.held}</h4>
                  {expectedText(data, expected).map((sentence) => (
                    <p key={sentence}>{sentence}</p>
                  ))}
                  {partNotes(data, part).map((note) => (
                    <p key={note}>{note}</p>
                  ))}
                  {part !== 'water' && (
                    <>
                      <h4 className="font-medium">{BENCH_TEXT.working}</h4>
                      {(part === 'unknown' ? candidatesOf(data) : solutesOf(data)).map((reagent) => (
                        <p key={reagent.id}>
                          {reagent.name}: {reagent.molarMass.working}
                        </p>
                      ))}
                    </>
                  )}
                </div>
              </Disclosure>
            </div>
          )}
        </Step>
      )}
    </>
  )
}
