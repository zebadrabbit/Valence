import { useRef } from 'react'
import { Disclosure } from '@/app/explore/InspectorCard'
import { Control } from '@/app/lab/Control'
import type { RunOnBench } from '@/app/lab/kinetics/Bench'
import type { KineticsLab } from '@/app/lab/kinetics/engine'
import { MixtureTable } from '@/app/lab/kinetics/tables'
import { AtChange, RunFrame, WatchCard } from '@/app/lab/kinetics/Watch'
import { Line, useSaid } from '@/app/lab/Line'
import { Step } from '@/app/lab/stationPieces'
import type { AcetoneData, RunId } from '@/chem-data/acetone/data'
import { can, leftAt, reduce, runView, type Action, type AcetoneState } from '@/engine/acetone'
import { FlaskDrawing, liquidFill } from './FlaskDrawing'
import { CHANGE_TEXT, LOOK_TEXT, RUN_TEXT, blockedText, fadeSaid, flaskText, liquidLook, liquidText, mixtureRows, mixtureTotal, runTitle } from './messages'
import { roomToSay, SPEED } from './watch'

export interface RunCardProps extends RunOnBench {
  data: AcetoneData
  lab: KineticsLab
  /** The lab as it is stored. */
  state: AcetoneState
  run: RunId
  /** The most iodine that any mixture of the lab starts with, in micromoles for a litre: the deepest yellow that is drawn. */
  deepest: number
  reducedMotion: boolean
}

/** The mixture of a run as a table (spec 20.2): what is in the flask and what is poured in to start, each liquid with its volume, and under it what they come to. */
export function Mixture({ data, run }: { data: AcetoneData; run: RunId }) {
  return <MixtureTable caption={runTitle(data, run)} head={[RUN_TEXT.liquid, RUN_TEXT.volume]} rows={mixtureRows(data, run).map((row) => ({ group: row.where, liquid: row.liquid, volume: row.volume }))} total={mixtureTotal(data, run)} />
}

const names = (data: AcetoneData, run: RunId) => ({ mixture: runTitle(data, run), water: data.water.name })

/**
 * One run (spec 20.2): its head, and then what can be worked now. Until the pour: the mixture as a table, and the
 * flask with the flask of water beside it, drawn, with how they stand in words, the pour, which starts the watch
 * as the same action, and beside it the choice to have the watch stopped when the colour has gone. From the pour:
 * the watch and the liquid, which is the one card, with the mixture and the flasks in words behind two disclosures
 * that are closed. So the two flasks that are compared and the watch are on the page with nothing else to read.
 *
 * The head, the watch's card and the button that has the watch stopped for the learner are the shared pieces of
 * the two labs on the kinetics engine (src/app/lab/kinetics/Watch.tsx). What is this lab's own is the fade: at
 * every frame the engine says how much iodine is left at the time on the watch, the mixture is drawn in the yellow
 * of that amount beside water that never changes, the look is said in words under the flask and beside the watch,
 * and the status line says a step down in those words where there is room to say it before the end, and then the
 * end (watch.ts). Nothing here moves or pulses, with motion reduced or not: the colour is each frame's own, with
 * no transition; and while the watch runs the lines beside it keep their room, so that Stop stays where it is.
 */
export function RunCard(props: RunCardProps) {
  const { data, lab, state, run, deepest, startedAt, atChange, onAtChange, reducedMotion, act, onStop, headingRef } = props
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
            speed={SPEED}
            startedAt={startedAt}
            atChange={atChange}
            onAtChange={onAtChange}
            reducedMotion={reducedMotion}
            onStop={onStop}
            onAgain={() => {
              act([{ type: 'runAgain', run }])
              heading.current?.focus()
            }}
            fast={RUN_TEXT.fast}
            // On an upright tablet the two flasks are as wide as the card, and the watch and its lines stand under them, over Stop.
            steady
            liquid={(labMs) => {
              // How much iodine is left when the watch reads this, or was left at the stop: the colour and the words are both from it.
              const left = leftAt(m, live, run, labMs)!
              const look = liquidLook(data, left)
              return {
                picture: <FlaskDrawing names={names(data, run)} watched={{ fill: liquidFill(left.microMolar, deepest), looks: { mixture: LOOK_TEXT[look], water: LOOK_TEXT.none } }} />,
                sentence: liquidText(data, left, true),
                // While the watch runs, a step down in the words for the colour where there is room to say it before the end, and then the end. Once it is stopped, the end alone, where the colour had gone.
                said: view.stopped === null ? fadeSaid(data, left, (step) => roomToSay(labMs, left, step)) : look === 'none' ? CHANGE_TEXT : '',
              }
            }}
          />
          {/* Two lines of words, each under a hit area a finger tall: far enough apart, and far enough from the ways on under them, that neither area lies over the other. */}
          <div className="grid gap-9 pt-1 pb-4">
            <Disclosure summary={RUN_TEXT.mixture}>
              <Mixture data={data} run={run} />
            </Disclosure>
            <Disclosure summary={RUN_TEXT.flask}>
              <p className="max-w-prose text-sm">{flaskText(data, run, view)}</p>
            </Disclosure>
          </div>
        </>
      ) : (
        <>
          <Step heading={RUN_TEXT.mixture}>
            <Mixture data={data} run={run} />
          </Step>
          <Flask key={view.attempts} {...props} />
        </>
      )}
    </RunFrame>
  )
}

/**
 * The flask before the pour, with the flask of water beside it: the drawing, how the two stand in words beside
 * it, and two buttons side by side, each a finger tall. The pour pours the iodine in and starts the watch, as one action; it
 * stays focusable where it cannot be taken, and says why when pressed. Beside it is the second way of stopping the
 * watch, offered before there is one to stop: pressed here, it is pressed when the watch starts. There is nothing
 * to make ready and nothing for Guided to warn of (spec 20.2).
 */
function Flask({ data, lab: { m }, state, run, left, atChange, onAtChange, onPour }: RunCardProps) {
  const [said, say] = useSaid(left ? RUN_TEXT.left : '', left)
  const pour: Action = { type: 'pour', run }
  const blocked = can(m, state, pour)
  return (
    <Step heading={RUN_TEXT.flask}>
      <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2">
        <FlaskDrawing names={names(data, run)} />
        <div className="grid max-w-prose flex-1 basis-40 gap-1">
          <p className="font-medium">{flaskText(data, run, { poured: false })}</p>
          <p className="text-muted-foreground">{liquidText(data, { microMolar: 0 }, false)}</p>
        </div>
      </div>
      {/* Side by side, as the two ways of stopping the watch are once it runs, so that a run before its pour is one window of an upright tablet. */}
      <div className="flex w-full flex-wrap gap-2">
        <Control unavailable={blocked !== null} variant="default" className="h-auto min-h-11 flex-1 basis-40 px-4 py-1.5 text-left whitespace-normal" onClick={() => (blocked !== null ? say(blockedText(blocked), true) : onPour())}>
          {RUN_TEXT.pour}
        </Control>
        <AtChange label={RUN_TEXT.stopAtEnd} pressed={atChange} className="min-h-11 flex-1 basis-40" onPress={() => onAtChange(!atChange)} />
      </div>
      <Line said={said} />
    </Step>
  )
}
