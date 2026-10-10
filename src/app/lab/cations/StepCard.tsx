import { useEffect, useId, useLayoutEffect, useRef, useState, type Ref, type RefObject } from 'react'
import { Disclosure } from '@/app/explore/InspectorCard'
import { ChoiceForm } from '@/app/lab/ChoiceForm'
import { Control } from '@/app/lab/Control'
import { Line, Mark, useSaid } from '@/app/lab/Line'
import { ROLE } from '@/app/lab/roles'
import { Marked, Step } from '@/app/lab/stationPieces'
import { WarningGroup } from '@/app/lab/WarningGroup'
import { STEP_IDS, type CationsData, type PartId } from '@/chem-data/cations/data'
import { FIELDS, LOOKS, type Action, type Blocked, type CationsModel, type Field, type Look, type Mode, type Observation, type PartView, type StepView, type Warning } from '@/engine/cations'
import { FlowChart } from './FlowChart'
import {
  ACTION_LABEL,
  CHART_TEXT,
  FIELD_LABEL,
  HINT,
  LOOK_FIRST,
  LOOK_PART,
  NOTES_TEXT,
  PAGE_TEXT,
  POUR_LABEL,
  STEP_STATUS_TEXT,
  STEP_TASK,
  TUBE_NAME,
  WARNING_BUTTONS,
  WARNING_TEXT,
  addLabel,
  blockedText,
  checkedText,
  choiceList,
  doneText,
  lookText,
  mismatchText,
  observationLines,
  stepEquations,
  stepNotes,
  stepTitle,
  tubeText,
} from './messages'
import { StepTube } from './StepTube'
import { TUBE_IDS } from './tubeLook'

/** Beside a step's standing in words, and hidden from a screen reader, which is given the words. */
export const STATUS_MARK: Record<StepView['status'], string> = { waiting: '○', current: '◔', done: '✓' }

/** How far a step has come, as a mark and its words; the tick of a step done is in the role of a done mark. */
export function StatusLabel({ status }: { status: StepView['status'] }) {
  return (
    <Marked mark={STATUS_MARK[status]} done={status === 'done'}>
      {STEP_STATUS_TEXT[status]}
    </Marked>
  )
}

export interface StepCardProps {
  data: CationsData
  m: CationsModel
  part: PartId
  mode: Mode
  view: PartView
  /** The step this card is of, as the part's view has it. */
  step: StepView
  /** Why an action cannot be done now, or null; the slips it would make, in Guided; the fields of an observation that Guided would refuse; and the action done. The page's, so that the card holds no state of the lab. */
  can(action: Action): Blocked | null
  warn(action: Action): Warning[]
  wrong(observation: Observation): Field[]
  act(action: Action): void
  /** The step's heading, which takes focus when the step comes to be shown. */
  headingRef?: Ref<HTMLHeadingElement>
}

/** A warning that is showing: the action it was raised by, which is sent again by the way on. */
type Asked = { action: Action; from: 'seen' | 'end' }

/**
 * One step of a part, as a short column of cards, each there when the engine has a use for it. The tube: the
 * step's own tube to explore, with the rack of the three beside it, the buttons that add the step's reagent, heat,
 * test with litmus and centrifuge, and what has been done so far in words. What is seen, once the reagent is in:
 * two questions, each closed until both parts of the tube have been looked at. In part 1, where each ion went: the
 * flow chart, whose places for this step open once what is seen is recorded. Then what ends the step: the check,
 * where the mode leaves it to be asked for, and the pouring off, where the step has one. Nothing says what is seen
 * in the tube but the part of the picture that is looked at. A button that cannot be used now stays focusable and
 * says why when pressed. The step's notes and equations, which say what each thing is, come once the step is done.
 *
 * A step that is done shows its tube as it was when the step was checked, and what was recorded, to be read. One
 * not yet reached shows its task and no more. An action is sent only from the step the part has reached: the
 * engine's actions name a part and not a step.
 *
 * In Guided, a slip of technique raises the warning beside the button that would make it, and the warning takes
 * focus: the way back puts focus on what was skipped, and the way on sends the action again. Focus is never left
 * on the page itself: where the control that had it is gone, it goes to the pouring off, or to the line that says
 * the step is done.
 *
 * The card keeps what is chosen and not yet recorded, which tile is held, a warning that is showing and what its
 * message lines last said; everything the lab stores comes to it as `view` and leaves it through `act`.
 */
export function StepCard({ data, m, part, mode, view, step, can, warn, wrong, act, headingRef }: StepCardProps) {
  const headingId = useId()
  const placeId = useId()
  const seenId = useId()
  const [tubeSaid, sayOfTube] = useSaid()
  const [endSaid, sayOfEnd] = useSaid()
  const [lookSaid, sayOfLook] = useSaid()
  const [asked, setAsked] = useState<Asked | null>(null)
  // Counts the observations recorded by way of a warning: the form is drawn afresh from what was recorded.
  const [forms, setForms] = useState(0)
  const addRef = useRef<HTMLButtonElement>(null)
  const heatRef = useRef<HTMLButtonElement>(null)
  const litmusRef = useRef<HTMLButtonElement>(null)
  const spinRef = useRef<HTMLButtonElement>(null)
  const pourRef = useRef<HTMLButtonElement>(null)
  const warningRef = useRef<HTMLDivElement>(null)
  const seenRef = useRef<HTMLDivElement>(null)
  const doneRef = useRef<HTMLParagraphElement>(null)

  const number = STEP_IDS.indexOf(step.id) + 1
  const current = step.status === 'current'
  const done = step.status === 'done'
  const guided = mode === 'guided'
  const add: Action = { type: 'add', part }
  const heat: Action = { type: 'heat', part }
  const litmus: Action = { type: 'testLitmus', part }
  const spin: Action = { type: 'centrifuge', part }
  const check: Action = { type: 'checkStep', part }
  const pour: Action = { type: 'pourOff', part }
  const pourLabel = POUR_LABEL[step.id]
  const lookedAtBoth = LOOKS.every((look) => step.looked.includes(look))
  // What is said of an observation that is recorded and not yet checked. Guided takes only what the tube shows, so what it has taken is right, but for one that was recorded in Challenge before the mode was changed: that one is held to the tube as it stands. Challenge says nothing of an observation until the step is checked.
  const notWhatShows = guided && step.observation !== null ? wrong(step.observation) : []
  const recorded = step.observation === null ? null : { wrong: notWhatShows, text: !guided ? '' : notWhatShows.length === 0 ? checkedText([]) : mismatchText(notWhatShows) }
  // Guided checks a step by itself; the button is there where that has not happened and the check is still to be asked for.
  const checkOffered = current && !step.checked && (!guided || can(check) === null)

  // A warning takes focus when it is raised.
  useEffect(() => {
    if (asked !== null) warningRef.current?.focus()
  }, [asked])
  // A warning that is showing is of a slip Guided would warn of now. Once it would not (the tube was centrifuged or heated, litmus showed acid, or the mode was changed to Challenge), it is dropped, and does not come back by itself.
  if (asked !== null && (!current || warn(asked.action).length === 0)) setAsked(null)
  // Focus is never left on the page: where what had it has gone (the form of a step that is checked, a tile, a button of a step that is done), it goes to what comes next.
  const stage = `${step.status}:${step.checked}:${step.observation === null}`
  const was = useRef(stage)
  useLayoutEffect(() => {
    if (was.current === stage) return
    was.current = stage
    if (document.activeElement !== document.body) return
    const next: RefObject<HTMLElement | null> = done ? doneRef : step.checked ? pourRef : seenRef
    next.current?.focus()
  }, [stage, done, step.checked])

  /** A press of a button of the tube: done, or refused with the engine's reason. Either way a warning that was showing is dropped. */
  const press = (action: Action) => {
    setAsked(null)
    const blocked = can(action)
    if (blocked !== null) return sayOfTube(blockedText(data, part, blocked, step.id), true)
    sayOfTube('')
    act(action)
  }
  /** A press of a button that ends the step: refused with the engine's reason, asked about first where Guided would warn, or done. */
  const end = (action: Action) => {
    const blocked = can(action)
    if (blocked !== null) {
      setAsked(null)
      return sayOfEnd(blockedText(data, part, blocked, step.id), true)
    }
    sayOfEnd('')
    if (warn(action).length === 0) {
      setAsked(null)
      return act(action)
    }
    // Raised again by the same press, it takes focus again.
    if (asked?.action.type === action.type) warningRef.current?.focus()
    else setAsked({ action, from: 'end' })
  }
  /** A part of the tube is looked at: stored the first time, where this is the step the part has reached and the engine takes it, and said each time. A step that is done can still be looked at. */
  const look = (at: Look) => {
    const action: Action = { type: 'look', part, at }
    if (current && !step.looked.includes(at) && can(action) === null) act(action)
    if (step.shows) sayOfLook(lookText(step.shows, at))
  }
  /** A button of the tube. One that names a thing done, which cannot be done again, carries a tick and is not drawn faint: the nitric acid of step 5 goes in again and again, so its button has none until the tube is full. */
  const button = (action: Action, label: string, done: boolean, ref: Ref<HTMLButtonElement>) => {
    const blocked = can(action)
    const taken = done && blocked !== null
    return (
      <Control ref={ref} unavailable={blocked !== null} dimmed={blocked !== null && !taken} variant={taken ? 'secondary' : 'outline'} className="h-auto min-h-11 max-w-full shrink px-3 py-1 text-left whitespace-normal" onClick={() => press(action)}>
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
  const warning = (from: Asked['from']) =>
    asked?.from === from &&
    warn(asked.action).length > 0 && (
      <WarningGroup
        ref={warningRef}
        warnings={warn(asked.action).map((slip) => ({ id: slip, ...WARNING_TEXT[slip] }))}
        buttons={WARNING_BUTTONS[warn(asked.action)[0]!]}
        onBack={() => {
          // To what was skipped: the centrifuge, the bath, or the acid and the paper.
          const [first] = warn(asked.action)
          const skipped = first === 'not-centrifuged' ? spinRef : first === 'not-heated' ? heatRef : step.litmus === null && step.added > 0 ? litmusRef : addRef
          setAsked(null)
          skipped.current?.focus()
        }}
        onGoOn={() => {
          setAsked(null)
          act(asked.action)
          if (asked.action.type === 'observe') setForms((count) => count + 1)
        }}
      />
    )

  const head = (
    <div className="grid gap-1">
      <p id={placeId} className="text-xs text-muted-foreground">
        {PAGE_TEXT.run(view.runs)}
        {' · '}
        {PAGE_TEXT.place(number, STEP_IDS.length)}
        {' · '}
        <span className="font-medium text-foreground">
          <StatusLabel status={step.status} />
        </span>
      </p>
      <h2 ref={headingRef} id={headingId} tabIndex={-1} aria-describedby={placeId} className="w-fit rounded-sm text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {stepTitle(data, step.id)}
      </h2>
      <p className="max-w-prose text-sm">{STEP_TASK[step.id]}</p>
      {/* Closed, and Guided's alone: how the step is worked, and nothing of what it shows. */}
      {guided && !done && (
        <div className="text-sm">
          <Disclosure summary={PAGE_TEXT.hint}>
            <p className="max-w-prose">{HINT[step.id]}</p>
          </Disclosure>
        </div>
      )}
    </div>
  )
  const shows = step.shows
  if (shows === null) {
    return (
      <section aria-labelledby={headingId} className="grid min-w-0 gap-3">
        {head}
        <p className="max-w-prose text-sm text-muted-foreground">{PAGE_TEXT.notesLater}</p>
      </section>
    )
  }

  return (
    <section aria-labelledby={headingId} className="grid min-w-0 gap-3">
      {head}
      {/* What the part looked at shows, for a screen reader: the eye has the callout beside the part. */}
      <div className="sr-only">
        <Line said={lookSaid} />
      </div>

      <Step heading={PAGE_TEXT.tube}>
        <div className="cations-tube w-full">
          <div className="cations-tube-grid">
            <div className="cations-tube-picture">
              <StepTube m={m} tube={step.tube} shows={shows} rack={current ? view.rack : null} looked={step.looked} describedBy={seenId} seen={(at) => lookText(shows, at)} onLook={look} />
            </div>
            {current && (
              <div className="cations-tube-actions flex flex-wrap content-start gap-1.5">
                {button(add, addLabel(data, step.id), step.added > 0, addRef)}
                {can(heat) !== 'not-this-step' && button(heat, ACTION_LABEL.heat, step.heated, heatRef)}
                {can(litmus) !== 'not-this-step' && button(litmus, ACTION_LABEL.testLitmus, false, litmusRef)}
                {button(spin, ACTION_LABEL.centrifuge, false, spinRef)}
              </div>
            )}
            <div className="cations-tube-words grid content-start gap-2">
              {/* What to do with the picture, and its description. What is seen is not said here: a part says it when it is looked at. */}
              <p id={seenId} className="max-w-prose">
                {PAGE_TEXT.explore}
              </p>
              {current ? (
                <>
                  <ul className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
                    {LOOKS.map((at) => {
                      const looked = step.looked.includes(at)
                      return (
                        <li key={at}>
                          <span aria-hidden="true" className={looked ? ROLE.done : undefined}>
                            {looked ? '✓' : '○'}{' '}
                          </span>
                          {LOOK_PART[at]}: {looked ? PAGE_TEXT.lookedAt : PAGE_TEXT.notLookedAt}
                        </li>
                      )
                    })}
                  </ul>
                  {/* What has been done to the tube, said again whenever it changes: litmus shows here. */}
                  <p role="status" className="max-w-prose font-medium">
                    {doneText(data, step)}
                  </p>
                </>
              ) : (
                <p className="max-w-prose text-muted-foreground">{PAGE_TEXT.asChecked}</p>
              )}
            </div>
            {/* Closed: it says the whole of what the picture shows, which the learner is to find by looking. */}
            <div className="cations-tube-in-words">
              <Disclosure summary={PAGE_TEXT.inWords}>
                <ul className="grid max-w-prose gap-1">
                  {(current ? TUBE_IDS : [step.tube]).map((tube) => (
                    <li key={tube} aria-current={current && tube === step.tube ? 'true' : undefined}>
                      <span className={tube === step.tube ? 'font-semibold' : 'font-medium'}>{TUBE_NAME[tube]}:</span> {tubeText(tube === step.tube ? shows : view.rack[tube])}
                    </li>
                  ))}
                </ul>
              </Disclosure>
            </div>
          </div>
        </div>
        {/* While it has nothing to say it takes no room, the gap over it neither. */}
        {current && (
          <div className={tubeSaid.text === '' ? '-mt-3' : undefined}>
            <Line said={tubeSaid} />
          </div>
        )}
      </Step>

      {(step.added > 0 || done) && (
        <Step heading={PAGE_TEXT.seen}>
          {/* Room about the words, taken back from the card's own, so that the ring that shows where focus went does not hug them. */}
          <div ref={seenRef} tabIndex={-1} className="-mx-2 -my-1 grid w-full justify-items-start gap-3 rounded-md px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {step.checked && step.observation !== null ? (
              <>
                <ul className="grid gap-1">
                  {observationLines(step.observation).map((line, at) => (
                    <li key={line}>
                      {step.wrongFields?.includes(FIELDS[at]!) && <Mark ok={false} />}
                      {line}
                    </li>
                  ))}
                </ul>
                <p role="status" className="max-w-prose font-medium">
                  <Mark ok={step.wrongFields?.length === 0} />
                  {checkedText(step.wrongFields ?? [])}
                </p>
                {current && <p className={`max-w-prose ${ROLE.held}`}>{blockedText(data, part, 'step-checked', step.id)}</p>}
              </>
            ) : (
              <>
                <ChoiceForm
                  // A form of its own for each state of the tube that empties what was recorded, for each mode, and for an observation recorded by way of a warning.
                  key={`${mode}:${step.added}:${step.heated}:${forms}`}
                  // Both questions wait for both looks, and the first says so for the two.
                  questions={FIELDS.map((field, at) => ({ id: field, label: FIELD_LABEL[field], choices: choiceList(m, field), waits: lookedAtBoth || step.observation !== null ? null : at === 0 ? LOOK_FIRST : '' }))}
                  recorded={step.observation}
                  judged={recorded}
                  held={null}
                  refusal={(answers) => {
                    if (FIELDS.some((field) => answers[field] === undefined)) return blockedText(data, part, lookedAtBoth ? 'invalid-entry' : 'look-first', step.id)
                    const blocked = can({ type: 'observe', part, observation: answers as Observation })
                    // Whether the answers are what the tube shows is said when they are recorded, and not before.
                    return blocked === null || blocked === 'does-not-match' ? null : blockedText(data, part, blocked, step.id)
                  }}
                  onRecord={(answers) => {
                    const observation = answers as Observation
                    const action: Action = { type: 'observe', part, observation }
                    if (can(action) === 'does-not-match') {
                      const fields = wrong(observation)
                      return { wrong: fields, text: mismatchText(fields) }
                    }
                    if (warn(action).length > 0) {
                      setAsked({ action, from: 'seen' })
                      return { wrong: null, text: '' }
                    }
                    setAsked(null)
                    act(action)
                    return { wrong: [], text: guided ? checkedText([]) : '' }
                  }}
                  text={{ check: ACTION_LABEL.observe, change: PAGE_TEXT.change, cancel: PAGE_TEXT.cancel }}
                />
                {warning('seen')}
                {!guided && step.observation !== null && <p className="text-muted-foreground">{PAGE_TEXT.notChecked}</p>}
              </>
            )}
          </div>
        </Step>
      )}

      {view.chart !== null && step.observation === null && step.added > 0 && (
        // Until what is seen is recorded the chart is one line that says what opens it.
        <Step heading={CHART_TEXT.title}>
          <p className={`max-w-prose ${ROLE.held}`}>{CHART_TEXT.closed}</p>
        </Step>
      )}
      {view.chart !== null && step.observation !== null && (
        <Step heading={CHART_TEXT.title}>
          {current && !step.checked && <p className="max-w-prose">{CHART_TEXT.help}</p>}
          <FlowChart
            data={data}
            places={view.chart.places}
            steps={view.steps}
            fill={
              current
                ? {
                    tiles: view.chart.tiles,
                    refusal: (place, tile, out) => {
                      const blocked = can({ type: out ? 'unplace' : 'place', part, place, tile })
                      return blocked === null ? null : blockedText(data, part, blocked, step.id)
                    },
                    onPlace: (place, tile) => act({ type: 'place', part, place, tile }),
                    onRemove: (place, tile) => act({ type: 'unplace', part, place, tile }),
                  }
                : undefined
            }
          />
        </Step>
      )}

      {current && (checkOffered || pourLabel !== undefined) && (
        <div className="grid justify-items-start gap-2 text-sm">
          <div className="flex flex-wrap gap-1.5">
            {checkOffered && (
              <Control unavailable={can(check) !== null} className="h-auto min-h-11 max-w-full shrink px-4 py-1 text-left whitespace-normal" onClick={() => end(check)}>
                {ACTION_LABEL.checkStep}
              </Control>
            )}
            {pourLabel !== undefined && (
              <Control ref={pourRef} unavailable={can(pour) !== null} className="h-auto min-h-11 max-w-full shrink px-4 py-1 text-left whitespace-normal" onClick={() => end(pour)}>
                {pourLabel}
              </Control>
            )}
          </div>
          {warning('end')}
          <div className={endSaid.text === '' ? '-mt-2' : undefined}>
            <Line said={endSaid} />
          </div>
        </div>
      )}

      {/* Always there, and empty until the step is done, so that a screen reader says it when it comes; it takes focus then, since the button that ended the step is gone. While it is empty it takes no room, the gap under it neither. */}
      <p ref={doneRef} tabIndex={-1} role="status" className={`w-fit rounded-sm text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring ${done ? '' : '-mb-3'}`}>
        {done && (
          <Marked mark="✓" done>
            {PAGE_TEXT.stepDone}
          </Marked>
        )}
      </p>
      {done ? (
        // Once the step is done and not before, and closed: the notes and the equations say what each thing is.
        <div className="text-sm">
          <Disclosure summary={NOTES_TEXT.notes}>
            <div className="grid max-w-[75ch] gap-2 leading-relaxed">
              {stepNotes(data, step.id).map((note) => (
                <p key={note}>{note}</p>
              ))}
              <h4 className="font-medium">{NOTES_TEXT.equations}</h4>
              {part === 'unknown' && <p className="text-muted-foreground">{NOTES_TEXT.whichever}</p>}
              <ul className="grid gap-1">
                {stepEquations(data, step.id).map((equation) => (
                  <li key={equation} className={ROLE.value}>
                    {equation}
                  </li>
                ))}
              </ul>
            </div>
          </Disclosure>
        </div>
      ) : (
        <p className="max-w-prose text-sm text-muted-foreground">{PAGE_TEXT.notesLater}</p>
      )}
    </section>
  )
}
