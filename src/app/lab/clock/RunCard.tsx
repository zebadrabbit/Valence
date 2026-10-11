import { useEffect, useRef, useState, type Ref } from 'react'
import { Disclosure } from '@/app/explore/InspectorCard'
import { Control } from '@/app/lab/Control'
import type { RunOnBench } from '@/app/lab/kinetics/Bench'
import type { KineticsLab } from '@/app/lab/kinetics/engine'
import { AtChange, RunFrame, WatchCard } from '@/app/lab/kinetics/Watch'
import { Line, useSaid } from '@/app/lab/Line'
import { ROLE } from '@/app/lab/roles'
import { Step } from '@/app/lab/stationPieces'
import { WarningGroup } from '@/app/lab/WarningGroup'
import { bathOfRun, reagentOf, type ClockData, type RunId } from '@/chem-data/clock/data'
import { can, reduce, runView, warnings, type Action, type ClockState } from '@/engine/clock'
import { FlaskDrawing } from './FlaskDrawing'
import { RUN_TEXT, WARNING_BUTTONS, WARNING_TEXT, blockedText, changeText, flasksText, liquidText, standLabel, temperatureText } from './messages'
import { MixtureTable } from './tables'
import { SPEED } from './watch'

export interface RunCardProps extends RunOnBench {
  data: ClockData
  lab: KineticsLab
  /** The lab as it is stored. */
  state: ClockState
  run: RunId
  reducedMotion: boolean
}

const names = (data: ClockData) => ({ a: RUN_TEXT.flaskA, b: RUN_TEXT.flaskB, indicator: reagentOf(data, data.rateLaw.end.indicatorId).name })
const bathOf = (data: ClockData, run: RunId) => data.baths.find((bath) => bath.id === bathOfRun(run)) ?? null

/**
 * One run (spec 19.2): its head, and then what can be worked now. Until the pour: the mixture as a table (behind a
 * closed disclosure for a run of part 3, which is of the first mixture again), and the two flasks, drawn, with
 * what has been done to them in words, the buttons that make them ready and pour them, and beside the pour the
 * choice to have the watch stopped at the change.
 * From the pour: the watch and the liquid, which is the one card, with the mixture and what was done to the flasks
 * behind two disclosures that are closed. So the flask that is watched and the watch are on the page with nothing
 * else to read.
 *
 * The head, the watch's card and the button that has the watch stopped at the change are the shared pieces of the
 * two labs on the kinetics engine (src/app/lab/kinetics/Watch.tsx); the flasks, the picture and every sentence
 * are this lab's own.
 */
export function RunCard(props: RunCardProps) {
  const { data, lab, state, run, startedAt, atChange, onAtChange, reducedMotion, act, onStop, headingRef } = props
  const { m } = lab
  const heading = useRef<HTMLHeadingElement | null>(null)
  // While the watch is played, the lab as it will be stored at the stop: the stored lab, with this run poured.
  const live = startedAt === null ? state : reduce(m, state, { type: 'pour', run })
  const view = runView(m, live, run)
  return (
    <RunFrame
      words={lab.words}
      run={run}
      view={view}
      headingRef={(element) => {
        heading.current = element
        headingRef(element)
      }}
    >
      {view.poured ? (
        <>
          <WatchCard
            // A watch of its own for each attempt, there from its pour: nothing of the one before is carried over. It is the same watch when it is stopped, so that focus can go to how the run came out.
            key={view.attempts}
            lab={lab}
            live={live}
            run={run}
            speed={SPEED[run]}
            startedAt={startedAt}
            atChange={atChange}
            onAtChange={onAtChange}
            reducedMotion={reducedMotion}
            onStop={onStop}
            onAgain={() => {
              act([{ type: 'runAgain', run }])
              heading.current?.focus()
            }}
            // Each bath has a speed of its own, and the five mixtures one for all: the line beside the watch says which.
            fast={bathOfRun(run) === null ? RUN_TEXT.fast : RUN_TEXT.fastBath}
            liquid={(labMs, turned) => {
              const look = lab.engine.lookAt(m, live, run, labMs)
              return {
                picture: <FlaskDrawing view={view} look={look} lookWord={data.rateLaw.end[look].value} names={names(data)} bath={bathOf(data, run)} reading={null} turned={turned} />,
                sentence: liquidText(data, look, true),
                // Empty until the liquid changes, and then the change, said once.
                said: look === 'after' ? changeText(data) : '',
              }
            }}
          />
          {/* Two lines of words, each under a hit area a finger tall: far enough apart, and far enough from the ways on under them, that neither area lies over the other. */}
          <div className="grid gap-9 pt-1 pb-4">
            <Disclosure summary={RUN_TEXT.mixture}>
              <MixtureTable data={data} run={run} />
            </Disclosure>
            <Disclosure summary={RUN_TEXT.flasks}>
              <p className="max-w-prose text-sm">{flasksText(data, run, view)}</p>
            </Disclosure>
          </div>
        </>
      ) : (
        <>
          {bathOfRun(run) === null ? (
            <Step heading={RUN_TEXT.mixture}>
              <MixtureTable data={data} run={run} />
            </Step>
          ) : (
            // A run in a bath is of the first mixture again, whose table part 1 has shown: it is behind a disclosure, closed, and the bath's steps have the room.
            <Disclosure summary={RUN_TEXT.mixture}>
              <MixtureTable data={data} run={run} />
            </Disclosure>
          )}
          <Flasks key={view.attempts} {...props} />
        </>
      )}
    </RunFrame>
  )
}

/**
 * The two flasks before the pour: the drawing, what has been done in words in a status line beside it, and the
 * buttons, each a finger tall. A step that is taken carries a tick and reads as done; one that cannot be taken now
 * stays focusable and says why when pressed. In Guided, a pour that would not count raises the warning, which
 * takes focus: the way back puts focus on the step that was skipped, and the way on pours.
 */
function Flasks({ data, lab: { m }, state, run, left, atChange, onAtChange, act, onPour }: RunCardProps) {
  const view = runView(m, state, run)
  const [said, say] = useSaid(left ? RUN_TEXT.left : '', left)
  const [warned, setWarned] = useState(false)
  const indicatorRef = useRef<HTMLButtonElement>(null)
  const standRef = useRef<HTMLButtonElement>(null)
  const warningRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (warned) warningRef.current?.focus()
  }, [warned])
  const pour: Action = { type: 'pour', run }
  const warns = warnings(m, state, pour)
  // A warning that is showing is of a pour Guided would warn of now. Once it would not, it is dropped.
  if (warned && warns.length === 0) setWarned(false)
  const press = (action: Action) => {
    setWarned(false)
    const blocked = can(m, state, action)
    if (blocked !== null) return say(blockedText(data, blocked), true)
    say('')
    act([action])
  }
  const pourPressed = () => {
    const blocked = can(m, state, pour)
    if (blocked !== null) {
      setWarned(false)
      return say(blockedText(data, blocked), true)
    }
    if (warns.length === 0) return onPour()
    say('')
    // Raised again by the same press, it takes focus again.
    if (warned) warningRef.current?.focus()
    else setWarned(true)
  }
  const step = (action: Action, label: string, taken: boolean, ref?: Ref<HTMLButtonElement>) => {
    const blocked = can(m, state, action)
    return (
      <Control ref={ref} unavailable={blocked !== null} dimmed={blocked !== null && !taken} variant={taken ? 'secondary' : 'outline'} className="h-auto min-h-11 px-4 py-1.5 text-left whitespace-normal" onClick={() => press(action)}>
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
  const bath = bathOf(data, run)
  const inBath = view.flasks !== 'bench'
  return (
    <Step heading={RUN_TEXT.flasks}>
      <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2">
        <FlaskDrawing view={view} look="before" lookWord={data.rateLaw.end.before.value} names={names(data)} bath={bath} reading={view.thermometerTenths === null ? null : temperatureText(view.thermometerTenths)} />
        <div className="grid max-w-prose flex-1 basis-40 gap-1">
          {/* The flasks in words, said again whenever something is done to them. */}
          <p role="status" className="font-medium">
            {flasksText(data, run, view)}
          </p>
          <p className="text-muted-foreground">{liquidText(data, 'before', false)}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {step({ type: 'addIndicator', run }, view.indicator ? RUN_TEXT.starchDone : RUN_TEXT.starch, view.indicator, indicatorRef)}
        {bath !== null && (
          <>
            {step({ type: 'standInBath', run }, standLabel(data, run, inBath), inBath)}
            {step({ type: 'letStand', run }, view.flasks === 'stood' ? RUN_TEXT.letStandDone(data) : RUN_TEXT.letStand(data), view.flasks === 'stood', standRef)}
            {step({ type: 'readThermometer', run }, RUN_TEXT.read, view.thermometerTenths !== null)}
          </>
        )}
        <Control unavailable={can(m, state, pour) !== null} variant="default" className="h-auto min-h-11 px-4 py-1.5 text-left whitespace-normal" onClick={pourPressed}>
          {RUN_TEXT.pour}
        </Control>
        {/* The second way of stopping the watch, offered before there is one to stop: pressed here, it is pressed when the watch starts. */}
        <AtChange label={RUN_TEXT.stopAtChange} pressed={atChange} className="min-h-11" onPress={() => onAtChange(!atChange)} />
      </div>
      {warned && warns.length > 0 && (
        <WarningGroup
          ref={warningRef}
          warnings={warns.map((warning) => ({ id: warning, ...WARNING_TEXT[warning] }))}
          buttons={WARNING_BUTTONS}
          onBack={() => {
            // To the first step that was skipped.
            const skipped = warns[0] === 'no-indicator' ? indicatorRef : standRef
            setWarned(false)
            skipped.current?.focus()
          }}
          onGoOn={onPour}
        />
      )}
      <Line said={said} />
    </Step>
  )
}
