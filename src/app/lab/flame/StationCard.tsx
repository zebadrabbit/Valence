import { useEffect, useId, useMemo, useRef, useState, type Ref } from 'react'
import { Disclosure, Sources } from '@/app/explore/InspectorCard'
import { ChoiceForm, type Answers } from '@/app/lab/ChoiceForm'
import { Control } from '@/app/lab/Control'
import { Hazards } from '@/app/lab/Hazards'
import { Line, useSaid } from '@/app/lab/Line'
import { PeriodicTableLink } from '@/app/lab/pagePieces'
import { ROLE } from '@/app/lab/roles'
import { BottleTile, Listed, Marked, Step } from '@/app/lab/stationPieces'
import { WarningGroup } from '@/app/lab/WarningGroup'
import { Button } from '@/components/ui/button'
import { flameCitations } from '@/chem-data/citations'
import type { FlameData } from '@/chem-data/flame/data'
import type { Source } from '@/chem-data/schema'
import { FLAME, HANDLING, QUESTIONS, type Action, type Blocked, type FlameState, type Observation, type StationView, type Warning } from '@/engine/flame'
import { FlamePicture, LoopDrawing } from './FlamePicture'
import {
  BENCH_TEXT,
  BLOCKED_TEXT,
  HINTS,
  LOOK_FIRST,
  PAGE_TEXT,
  PROGRESS_TEXT,
  QUESTION_LABEL,
  STATION_TEXT,
  WARNING_BUTTONS,
  WARNING_TEXT,
  appearanceText,
  choiceList,
  lookName,
  lookText,
  loopText,
  observationFeedback,
  observationLines,
  stationTitle,
  unseenName,
} from './messages'
import { Spectroscope } from './Spectroscope'
import { progressOf, type Progress } from './stationLook'

/** Beside a station's progress in words, and hidden from a screen reader, which is given the words. */
export const PROGRESS_MARK: Record<Progress, string> = { 'not-started': '○', started: '◔', 'not-counted': '◑', 'not-correct': '◑', done: '✓' }

/** A station's progress as a mark and its words; the tick of a station done is in the role of a done mark. */
export function ProgressLabel({ progress }: { progress: Progress }) {
  return (
    <Marked mark={PROGRESS_MARK[progress]} done={progress === 'done'}>
      {PROGRESS_TEXT[progress]}
    </Marked>
  )
}

/** Whether a part of a picture has been looked at, as the list beside the picture says it: a mark and the words. */
function Looked({ name, looked }: { name: string; looked: boolean }) {
  return (
    <li>
      <Marked mark={looked ? '✓' : '○'} done={looked}>
        {name}: {looked ? PAGE_TEXT.lookedAt : PAGE_TEXT.notLookedAt}
      </Marked>
    </li>
  )
}

export interface StationCardProps {
  data: FlameData
  sources: readonly Source[]
  stationId: string
  /** The stored record: the station reads from it what the loop carries now and what it carried when it was held here. */
  state: FlameState
  view: StationView
  reducedMotion: boolean
  /** Why an action cannot be done now, or null; the technique step it would skip, in Guided; and the action done. The page's, so that the card holds no state of the lab. */
  can(action: Action): Blocked | null
  warn(action: Action): Warning[]
  act(action: Action): void
  /** Records an observation here and hands back the station as it then stands. */
  record(observation: Observation): StationView
  /** The station's heading, which takes focus when the station comes to be shown. */
  headingRef?: Ref<HTMLHeadingElement>
}

/**
 * One station, as a short column of steps, each a card: the bottle; the loop, with its state in words, Clean and
 * Dip; once the loop has been dipped here, the flame, with Hold and then the drawn flame to look at; once it has
 * been held, the spectroscope, with its strip to explore, and the three questions. Nothing says what the flame or
 * the strip shows but the part of a picture that is looked at, and each question waits for its looks. A card is
 * there only when the engine has a use for it, and a button that cannot be used now stays focusable and says why
 * when pressed. In Guided, dipping a loop that is not clean raises the warning in the loop's card, which takes
 * focus: the way back puts focus on Clean, and the way on dips. The station's notes, what the strip leaves out,
 * the link to its metal's card and its Sources come once the station is done, and not before: they say what gives
 * the light.
 *
 * The card keeps what is chosen and not yet checked, whether the spectroscope is being looked through, a warning
 * that is showing, and what its message lines last said; everything the lab stores comes to it as `state` and
 * `view` and leaves it through `act` and `record`.
 */
export function StationCard({ data, sources, stationId, state, view, reducedMotion, can, warn, act, record, headingRef }: StationCardProps) {
  const index = data.salts.findIndex((s) => s.id === stationId)
  const salt = data.salts[index]!
  const station = state.stations[index]!
  const headingId = useId()
  const placeId = useId()
  const seenId = useId()
  const heldId = useId()
  const scopeId = useId()
  const [loopSaid, sayOfLoop] = useSaid()
  const [flameSaid, sayOfFlame] = useSaid()
  const [lookSaid, sayOfLook] = useSaid()
  const [warned, setWarned] = useState(false)
  // Whether the spectroscope is looked through, as chosen for one hold of the loop: a new hold is a new thing to look at.
  // ponytail: the page's own and not stored, as the engine has no action for it. After a reload the strip is out
  // if a line or a band had been looked at, and behind its button again if none had.
  const [scope, setScope] = useState<{ hold: string; open: boolean } | null>(null)
  const cleanRef = useRef<HTMLButtonElement>(null)
  const dipRef = useRef<HTMLButtonElement>(null)
  const warningRef = useRef<HTMLDivElement>(null)
  // A warning takes focus when it is raised.
  useEffect(() => {
    if (warned) warningRef.current?.focus()
  }, [warned])
  const cited = useMemo(() => flameCitations(data, stationId, sources), [data, stationId, sources])

  const progress = progressOf(view)
  const clean: Action = { type: 'cleanLoop' }
  const dip: Action = { type: 'dipLoop', stationId }
  const hold: Action = { type: 'holdInFlame', stationId }
  // A warning that is showing is of a dip Guided would warn of now. Once it would not (the loop was cleaned at another station, or the mode was changed to Challenge), the warning is dropped, and does not come back by itself when the loop or the mode changes again.
  if (warned && warn(dip).length === 0) setWarned(false)
  // Whatever holds the whole lab holds every entry here. It is said once, at the station's head, and that sentence is the description of the form's button.
  const completed = can(clean) === 'lab-completed' ? BLOCKED_TEXT['lab-completed'] : null
  const held = station.held?.join() ?? null
  // The pictures are of the loop as it was held here. Cleaned or dipped again since, the loop is no longer that one.
  const changedSince = held !== null && held !== state.loop.join()
  // The observation shown in the form is the one made at this hold. One made at an earlier hold is still the station's, in the list and in the record, until another is recorded.
  const ofThisHold = station.observation !== null && station.observation.loop.join() === held
  const scopeOpen = scope !== null && scope.hold === held ? scope.open : view.looked.some((at) => at !== FLAME)

  /** A press of a button of the loop or the flame: done, or refused with the engine's reason. Either way a warning that was showing is dropped. */
  const press = (action: Action, say: typeof sayOfLoop) => {
    setWarned(false)
    const blocked = can(action)
    if (blocked !== null) return say(BLOCKED_TEXT[blocked], true)
    say('')
    act(action)
  }
  const dipPressed = () => {
    if (can(dip) !== null || warn(dip).length === 0) return press(dip, sayOfLoop)
    sayOfLoop('')
    // Raised again by the same press, it takes focus again.
    if (warned) warningRef.current?.focus()
    else setWarned(true)
  }
  /** The flame, or a line or a band of the strip, is looked at: stored the first time, where the engine takes it, and said each time. A completed lab stores nothing and can still be looked at. */
  const look = (at: string) => {
    const action: Action = { type: 'look', stationId, at }
    if (!view.looked.includes(at) && can(action) === null) act(action)
    sayOfLook(lookText(view, at))
  }
  const judged = (of: StationView) => ({ wrong: of.wrong, text: observationFeedback(data, of) })

  return (
    <section aria-labelledby={headingId} className="grid min-w-0 gap-3">
      <div className="grid gap-1">
        <p id={placeId} className="text-xs text-muted-foreground">
          {STATION_TEXT.place(index + 1, data.salts.length)}
          {' · '}
          <span className="font-medium text-foreground">
            <ProgressLabel progress={progress} />
          </span>
        </p>
        <h2 ref={headingRef} id={headingId} tabIndex={-1} aria-describedby={placeId} className="w-fit rounded-sm text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {stationTitle(data, stationId)}
        </h2>
        {/* Always there, and empty until the station is done, so that a screen reader says it when it comes. */}
        <p role="status" className="text-sm font-medium">
          {view.done && <Marked mark="✓" done>{BENCH_TEXT.done}</Marked>}
        </p>
        {completed !== null && (
          <p id={heldId} className={`text-sm ${ROLE.held}`}>
            {completed}
          </p>
        )}
        {/* What the part looked at shows, for a screen reader: the eye has the callout beside the part. */}
        <div className="sr-only">
          <Line said={lookSaid} />
        </div>
      </div>

      <Step heading={BENCH_TEXT.bottle}>
        <div className="w-full sm:max-w-md">
          <BottleTile name={salt.name} lines={[salt.formula, `${salt.molarity} M`]} liquid={salt.appearance.value.hex} rows={[[PAGE_TEXT.looks, appearanceText(data, stationId)]]}>
            <Hazards classifiedAs={salt.classifiedAs} hazards={salt.hazards} sources={sources} />
          </BottleTile>
        </div>
      </Step>

      <Step heading={BENCH_TEXT.loop}>
        <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2">
          <LoopDrawing wet={state.loop.some((entry) => entry !== HANDLING)} />
          {/* The loop's state in words, said again whenever it changes. */}
          <p role="status" className="max-w-prose flex-1 basis-56 font-medium">
            {loopText(data, state.loop, stationId)}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Control ref={cleanRef} unavailable={can(clean) !== null} className="min-h-11 px-4" onClick={() => press(clean, sayOfLoop)}>
            {BENCH_TEXT.clean}
          </Control>
          <Control ref={dipRef} unavailable={can(dip) !== null} className="min-h-11 px-4" onClick={dipPressed}>
            {BENCH_TEXT.dip}
          </Control>
        </div>
        <p className="max-w-prose text-muted-foreground">
          {BENCH_TEXT.clean}: {BENCH_TEXT.cleaning}
        </p>
        {warned && warn(dip).length > 0 && (
          <WarningGroup
            ref={warningRef}
            warnings={warn(dip).map((warning) => ({ id: warning, ...WARNING_TEXT[warning] }))}
            buttons={WARNING_BUTTONS}
            onBack={() => {
              setWarned(false)
              cleanRef.current?.focus()
            }}
            onGoOn={() => {
              press(dip, sayOfLoop)
              dipRef.current?.focus()
            }}
          />
        )}
        <Line said={loopSaid} />
      </Step>

      {(held !== null || can(hold) === null) && (
        <Step heading={BENCH_TEXT.flame}>
          <Control unavailable={can(hold) !== null} className="min-h-11 px-4" onClick={() => press(hold, sayOfFlame)}>
            {BENCH_TEXT.hold}
          </Control>
          <div className="flex w-full flex-wrap items-start gap-4">
            {view.flame && (
              // A picture of its own for each hold, so that the flame of a new one flickers as it is lit.
              <FlamePicture key={held} flame={view.flame} reducedMotion={reducedMotion} describedBy={seenId} looked={view.looked.includes(FLAME)} seen={() => lookText(view, FLAME)} onLook={() => look(FLAME)} />
            )}
            <div className="grid max-w-prose flex-1 basis-56 content-start gap-2">
              {/* What to do with the two pictures, said when the loop is held, and their description. What is seen is not said here: a part says it when it is looked at. */}
              <p id={seenId} role="status">
                {view.flame ? BENCH_TEXT.explore : BENCH_TEXT.notHeld}
              </p>
              {changedSince && <p className={ROLE.held}>{PAGE_TEXT.heldBefore}</p>}
              {view.flame && (
                <ul className="grid gap-1">
                  <Looked name={lookName(view, FLAME)} looked={view.looked.includes(FLAME)} />
                </ul>
              )}
            </div>
          </div>
          <Line said={flameSaid} />
        </Step>
      )}

      {held !== null && (
        <Step heading={BENCH_TEXT.spectroscope}>
          <Button type="button" variant="outline" className="min-h-11 px-4" aria-expanded={scopeOpen} aria-controls={scopeId} onClick={() => setScope({ hold: held, open: !scopeOpen })}>
            {BENCH_TEXT.through}
          </Button>
          <div id={scopeId} className="grid w-full gap-3">
            {scopeOpen && (
              <>
                <Spectroscope
                  key={held}
                  scale={data.scale}
                  spectrum={view.spectrum}
                  looked={view.spectrum.map((seen) => view.looked.includes(seen.feature.id))}
                  describedBy={seenId}
                  name={(at) => partName(view, at)}
                  seen={(at) => lookText(view, view.spectrum[at]!.feature.id)}
                  onLook={(at) => look(view.spectrum[at]!.feature.id)}
                />
                <ul className="grid gap-1">
                  {view.spectrum.map((seen, at) => (
                    // By its place in the count: the record's own name for a line or a band says what gives it.
                    <Looked key={at} name={partName(view, at)} looked={view.looked.includes(seen.feature.id)} />
                  ))}
                </ul>
              </>
            )}
          </div>
        </Step>
      )}

      {held !== null && (
        <Step heading={BENCH_TEXT.observations}>
          {/* Over the questions and closed: the five are the same at every station, and are there to be opened by a learner who wants them. */}
          {view.guidanceShown && (
            <Disclosure summary={BENCH_TEXT.hints}>
              <Listed items={HINTS} />
            </Disclosure>
          )}
          <ChoiceForm
            // A form of its own for each hold: what was chosen of one flame is not carried to the next.
            key={held}
            questions={QUESTIONS.map((question) => ({ id: question, label: QUESTION_LABEL[question], choices: choiceList(data, question), waits: view.open[question] ? null : LOOK_FIRST[question] }))}
            recorded={ofThisHold ? view.observation : null}
            judged={ofThisHold ? judged(view) : null}
            held={completed === null ? null : heldId}
            refusal={(answers: Answers) => {
              // A question that is closed says under it what to look at first, and cannot be answered: that is what is said, before anything of the answers.
              const blocked = Object.values(view.open).every(Boolean) ? can({ type: 'recordObservation', stationId, observation: answers as Observation }) : 'not-looked'
              return blocked === null ? null : BLOCKED_TEXT[blocked]
            }}
            onRecord={(answers: Answers) => judged(record(answers as Observation))}
            text={{ check: BENCH_TEXT.check, change: PAGE_TEXT.change, cancel: PAGE_TEXT.cancel, again: PAGE_TEXT.lookAgain }}
          />
          {/* The way on from an observation that does not count: its feedback says to clean the loop and observe again, and this cleans it and goes to the next step. */}
          {ofThisHold && view.counts === false && completed === null && (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 px-4"
              onClick={() => {
                press(clean, sayOfLoop)
                dipRef.current?.focus()
              }}
            >
              {BENCH_TEXT.clean}
            </Button>
          )}
          {/* Under the questions and closed, so that the answers are not read before the flame is: in Guided from the start, in Challenge once an observation that counts is recorded. */}
          {view.expected ? (
            <Disclosure summary={BENCH_TEXT.expected}>
              <Listed items={observationLines(view.expected)} />
            </Disclosure>
          ) : (
            <p className="max-w-prose text-muted-foreground">{PAGE_TEXT.challengeHidden}</p>
          )}
        </Step>
      )}

      {/* Once the station is done and not before: the notes, the sources' titles and the element's card say what gives the light. */}
      {view.done && (
        <>
          <Step heading={BENCH_TEXT.notes}>
            <div className="grid max-w-[75ch] gap-2 leading-relaxed">
              {salt.notes.map((note) => (
                <p key={note.value}>{note.value}</p>
              ))}
            </div>
            {salt.leftOut.length > 0 && (
              <div className="grid gap-1">
                <h4 className="font-medium">{BENCH_TEXT.leftOut}</h4>
                <Listed items={salt.leftOut.map((left) => left.value)} />
              </div>
            )}
            <PeriodicTableLink symbol={salt.metal.symbol}>{PAGE_TEXT.elementCard(salt.metal.name)}</PeriodicTableLink>
          </Step>
          <Sources citations={cited} derived={PAGE_TEXT.sources} />
        </>
      )}
    </section>
  )
}

/** A line or a band as its button and the list name it: by its place in the count until it has been looked at, and by what the look said from then on. */
const partName = (view: StationView, at: number) => {
  const { id } = view.spectrum[at]!.feature
  return view.looked.includes(id) ? lookName(view, id) : unseenName(at + 1, view.spectrum.length)
}
