import { useId, useLayoutEffect, useRef, type ReactNode, type Ref } from 'react'
import { Disclosure } from '@/app/explore/InspectorCard'
import { ChoiceForm } from '@/app/lab/ChoiceForm'
import { Control } from '@/app/lab/Control'
import { Line, Mark, useSaid } from '@/app/lab/Line'
import { ROLE } from '@/app/lab/roles'
import { Marked } from '@/app/lab/stationPieces'
import type { LechatelierData, SystemId, Way } from '@/chem-data/lechatelier/data'
import { FIELDS, LOOKS, type Action, type Blocked, type DisturbanceView, type Field, type LechatelierModel, type Look, type Mode, type Observation, type SystemView } from '@/engine/lechatelier'
import { DisturbanceTube } from './DisturbanceTube'
import {
  ANSWER_TEXT,
  DISTURBANCE_STATUS_TEXT,
  EQUILIBRIUM_TEXT,
  FIELD_LABEL,
  HINT,
  LOOK_PART,
  NOTES_TEXT,
  OBSERVATION_TEXT,
  PAGE_TEXT,
  PREDICTION_TEXT,
  TEMPERATURE_TEXT,
  TUBE_NAME,
  WAY_CHOICES,
  actionLabel,
  answerLabel,
  askText,
  blockedText,
  checkedText,
  choiceList,
  disturbanceEquations,
  disturbanceNotes,
  disturbanceTitle,
  doneText,
  equilibriumLines,
  lookText,
  mismatchText,
  observationLines,
  systemNumber,
  taskText,
  tubeShortName,
  tubeSoFarText,
  tubeText,
  tubesLabel,
} from './messages'
import { fullMicrolitres, tubeGroup } from './tubeLook'

/** Beside a disturbance's standing in words, and hidden from a screen reader, which is given the words. */
export const STATUS_MARK: Record<DisturbanceView['status'], string> = { waiting: '○', current: '◔', done: '✓' }

/** How far a disturbance has come, as a mark and its words; the tick of one that is done is in the role of a done mark. */
export function StatusLabel({ status }: { status: DisturbanceView['status'] }) {
  return (
    <Marked mark={STATUS_MARK[status]} done={status === 'done'}>
      {DISTURBANCE_STATUS_TEXT[status]}
    </Marked>
  )
}

/** A card of a disturbance: one sheet, or two with a rule between them, each under its own heading. */
const CARD = 'grid min-w-0 divide-y rounded-lg border bg-card text-sm'
const SHEET = 'grid min-w-0 justify-items-start gap-2 p-3'
const HEADING = 'text-base font-semibold'

/** One sheet of a card, named by its heading. */
function Sheet({ heading, children }: { heading: string; children: ReactNode }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className={SHEET}>
      <h3 id={headingId} className={HEADING}>
        {heading}
      </h3>
      {children}
    </section>
  )
}

export interface DisturbanceCardProps {
  data: LechatelierData
  m: LechatelierModel
  system: SystemId
  mode: Mode
  view: SystemView
  /** The disturbance this card is of, as the system's view has it. */
  disturbance: DisturbanceView
  /** Why an action cannot be done now, or null; the fields of an observation that Guided would refuse; and the action done. The page's, so that the card holds no state of the lab. */
  can(action: Action): Blocked | null
  wrong(observation: Observation): Field[]
  act(action: Action): void
  /** The disturbance's heading, which takes focus when the disturbance comes to be shown. */
  headingRef?: Ref<HTMLHeadingElement>
}

/**
 * One disturbance of a system, in the order it is worked. The equilibrium as written, with what stands on each side
 * and what is about to be done, and under it the prediction: one choice, recorded before the change, changed until
 * the change begins and never marked. The tube, to explore, with the one button that makes the change, a portion at
 * each press, and what has been done so far in words. What is seen: two questions, which open once the change is
 * complete and both parts of the tube have been looked at since. Then the question of the disturbance: which way
 * the equilibrium went, or what took the metal ion away. Nothing says what is seen in the tube but the part of the
 * picture that is looked at. An entry that is made folds to a line beside "Change", so that the next has the room.
 *
 * A disturbance that is done shows its notes outright, with the learner's prediction over them: they are what the
 * disturbance is for. Its tube is as it was left and can still be looked at, and what was recorded is lines to be
 * read, each with a mark where the engine has judged it. One not yet reached shows what will be done and no more.
 * An action is sent only from the disturbance the system has reached: the engine's actions name a system.
 *
 * Where the card has the width, the tube stands on the left and the sheets on the right; where it has not, they
 * are one column in the order above (lechatelier.css). The card keeps what is chosen and not yet recorded and what
 * its message lines last said; everything the lab stores comes to it as `view` and leaves it through `act`.
 */
export function DisturbanceCard({ data, m, system, mode, view, disturbance: d, can, wrong, act, headingRef }: DisturbanceCardProps) {
  const headingId = useId()
  const placeId = useId()
  const exploreId = useId()
  const tubeId = useId()
  const notesId = useId()
  const leftId = useId()
  const rightId = useId()
  const [tubeSaid, sayOfTube] = useSaid()
  const [lookSaid, sayOfLook] = useSaid()
  const notesRef = useRef<HTMLElement>(null)

  const current = d.status === 'current'
  const done = d.status === 'done'
  const guided = mode === 'guided'
  const change: Action = { type: 'act', system }
  const group = tubeGroup(data, system, d.tube)
  // The tube in words says where the tube stands wherever the system has a bath on its bench: in the others every tube is in the rack throughout.
  const baths = view.disturbances.some((other) => other.kind !== 'add')
  const equilibrium = equilibriumLines(data, d.id)
  const ask = askText(data, d.id)
  // A choice that names a side is described by the line of the equilibrium's card that says what stands on that side: the choice's own words are the way alone, and a reader who is not shown the card over the question is told the side with the choice.
  const sideOf: Readonly<Record<string, string>> = { left: leftId, right: rightId }
  const withSides = <T extends { value: string }>(choices: readonly T[]) => choices.map((choice) => ({ ...choice, describedBy: sideOf[choice.value] }))

  // Focus is never left on the page: the question's form goes when it is answered, and focus goes to the notes, which are what the answer opens.
  const was = useRef(d.status)
  useLayoutEffect(() => {
    if (was.current === d.status) return
    was.current = d.status
    if (d.status === 'done' && document.activeElement === document.body) notesRef.current?.focus()
  }, [d.status])

  /** A part of the tube is looked at: stored the first time, where this is the disturbance the system has reached and the engine takes it, and said each time. A disturbance that is done can still be looked at. */
  const look = (at: Look) => {
    const action: Action = { type: 'look', system, at }
    if (current && !d.looked.includes(at) && can(action) === null) act(action)
    if (d.shows) sayOfLook(lookText(d.shows, at))
  }

  const head = (
    <div className="grid gap-1">
      <p id={placeId} className="text-xs text-muted-foreground">
        {systemNumber(system)}
        {' · '}
        {PAGE_TEXT.run(view.runs)}
        {' · '}
        <span className="font-medium text-foreground">
          <StatusLabel status={d.status} />
        </span>
      </p>
      <h2 ref={headingRef} id={headingId} tabIndex={-1} aria-describedby={placeId} className="w-fit rounded-sm text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {disturbanceTitle(data, d.id)}
      </h2>
    </div>
  )
  const shows = d.shows
  if (shows === null || d.temperature === null) {
    return (
      <section aria-labelledby={headingId} className="grid min-w-0 gap-2">
        {head}
        <p className="max-w-prose text-sm">{taskText(data, d.id)}</p>
        <p className="max-w-prose text-sm text-muted-foreground">{NOTES_TEXT.later}</p>
      </section>
    )
  }
  const { temperature } = d
  // Closed, and Guided's alone: how to think about the question, and nothing of what the tube shows. It stands under each of the two questions it is for, while that question is open.
  const hint = guided && (
    <Disclosure summary={PAGE_TEXT.hint}>
      <p className="max-w-prose">{HINT[d.id]}</p>
    </Disclosure>
  )
  const blocked = can(change)
  // The change is complete: the button names a thing done, which cannot be done again, and carries a tick.
  const complete = d.acted >= d.portions

  return (
    <section aria-labelledby={headingId} className="grid min-w-0 gap-2">
      {head}
      {/* What the part looked at shows, for a screen reader: the eye has the callout beside the part. */}
      <div className="sr-only">
        <Line said={lookSaid} />
      </div>

      {/* Always there, and empty until the disturbance is done, so that a screen reader says it when it comes. While it is empty it takes no room, the gap under it neither. */}
      <p role="status" className={`text-sm font-medium ${done ? '' : '-mb-2'}`}>
        {done && (
          <Marked mark="✓" done>
            {PAGE_TEXT.disturbanceDone}
          </Marked>
        )}
      </p>
      {d.notesShown && d.prediction !== null && d.answer !== null && (
        // Once the disturbance is done and not before, shown outright, and first: the notes say what happened and why, which is what the disturbance is for. The prediction and the answer stand over them, to be set beside what happened.
        <section ref={notesRef} tabIndex={-1} aria-labelledby={notesId} className={`${CARD} outline-none focus-visible:ring-2 focus-visible:ring-ring`}>
          <div className={SHEET}>
            <h3 id={notesId} className={HEADING}>
              {NOTES_TEXT.notes}
            </h3>
            <ul className="grid w-full gap-0.5 rounded-md border-l-4 border-foreground/40 bg-muted/60 py-1.5 pr-2 pl-3">
              {/* As it was made, and never marked. */}
              <li>{PREDICTION_TEXT.said(d.prediction)}</li>
              <li>
                <span className="font-medium">{ask.heading}:</span> {answerLabel(d.answer)}{' '}
                {d.answerRight === null ? (
                  // In the text's own colour and weight, as what a check finds is: on the tinted ground of these two lines the grey of the page's lesser words measured 4.49 to 1.
                  <span className="font-medium whitespace-nowrap">{ANSWER_TEXT.notChecked}</span>
                ) : (
                  <span className="font-medium whitespace-nowrap">
                    <Mark ok={d.answerRight} />
                    {d.answerRight ? ANSWER_TEXT.right : ANSWER_TEXT.notRight}
                  </span>
                )}
              </li>
            </ul>
            <div className="grid max-w-[75ch] gap-2 leading-relaxed">
              {disturbanceNotes(data, d.id).map((note) => (
                <p key={note}>{note}</p>
              ))}
              {disturbanceEquations(data, d.id).length > 0 && (
                <>
                  <h4 className="font-medium">{NOTES_TEXT.equations}</h4>
                  <ul className="grid gap-1">
                    {disturbanceEquations(data, d.id).map((equation) => (
                      <li key={equation} className={ROLE.value}>
                        {equation}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="lechatelier-work">
        <div className="lechatelier-grid">
          <div className={`lechatelier-first ${CARD}`}>
            <Sheet heading={EQUILIBRIUM_TEXT.heading}>
              <p className={`text-base ${ROLE.value}`}>{equilibrium.equation}</p>
              <ul className="grid gap-0.5">
                <li id={leftId}>{equilibrium.left}</li>
                <li id={rightId}>{equilibrium.right}</li>
                {equilibrium.between !== null && <li>{equilibrium.between}</li>}
              </ul>
              <p>
                <span className="font-medium">{PAGE_TEXT.task}:</span> {taskText(data, d.id)}
              </p>
            </Sheet>
            {/* Once the change has begun the prediction is a line, with no heading of its own; once the disturbance is done it stands with its notes. */}
            {current && d.predictionFixed && d.prediction !== null && (
              <p className="px-3 py-2">
                {PREDICTION_TEXT.said(d.prediction)} <span className="text-muted-foreground">{PREDICTION_TEXT.fixed}</span>
              </p>
            )}
            {current && !d.predictionFixed && (
              <Sheet heading={PREDICTION_TEXT.heading}>
                {d.prediction === null && <p className="max-w-prose text-muted-foreground">{PREDICTION_TEXT.help}</p>}
                <ChoiceForm
                  questions={[{ id: 'way', label: PREDICTION_TEXT.question, choices: withSides(WAY_CHOICES), waits: null }]}
                  recorded={d.prediction === null ? null : { way: d.prediction }}
                  // Kept and never marked: nothing is said of it, so no mark is drawn.
                  judged={d.prediction === null ? null : { wrong: [], text: '' }}
                  held={null}
                  refusal={({ way }) => {
                    if (way === undefined) return blockedText(data, 'invalid-entry', d.id)
                    const refused = can({ type: 'predict', system, way: way as Way })
                    return refused === null ? null : blockedText(data, refused, d.id)
                  }}
                  onRecord={({ way }) => {
                    act({ type: 'predict', system, way: way as Way })
                    return { wrong: [], text: '' }
                  }}
                  text={{ check: PREDICTION_TEXT.record, change: PAGE_TEXT.change, cancel: PAGE_TEXT.cancel }}
                  brief={({ way }) => [PREDICTION_TEXT.said(way as Way)]}
                />
                {hint}
              </Sheet>
            )}
          </div>

          <section aria-labelledby={tubeId} className={`lechatelier-tube ${CARD}`}>
            <div className={SHEET}>
              <h3 id={tubeId} className={HEADING}>
                {TUBE_NAME[d.tube]}
              </h3>
              {/* The tubes that stand with this one: the tube a solid was brought down in, and the three it is shared among. The heading over them says the metal, and the list's name does: each is named by what it is for, so that the four stand in one row where the card has the width. */}
              {group.length > 1 && (
                <ol aria-label={tubesLabel(group)} className="lechatelier-rack text-xs">
                  {group.map((tube) => (
                    <li key={tube} aria-current={tube === d.tube ? 'true' : undefined} className="rounded-md border px-2 py-0.5 text-muted-foreground aria-[current]:border-foreground aria-[current]:bg-muted aria-[current]:font-semibold aria-[current]:text-foreground">
                      {tube === d.tube && <span aria-hidden="true">▸ </span>}
                      {tubeShortName(tube)}
                    </li>
                  ))}
                </ol>
              )}
              <div className="lechatelier-tube-grid w-full">
                <DisturbanceTube tube={d.tube} shows={shows} temperature={temperature} full={fullMicrolitres(m, system)} looked={d.looked} describedBy={exploreId} seen={(at) => lookText(shows, at)} onLook={look} />
                <div className="grid content-start justify-items-start gap-2">
                  {current && (
                    <Control
                      unavailable={blocked !== null}
                      dimmed={blocked !== null && !complete}
                      variant={complete ? 'secondary' : 'outline'}
                      className="h-auto min-h-11 max-w-full shrink px-3 py-1 text-left whitespace-normal"
                      onClick={() => {
                        if (blocked !== null) return sayOfTube(blockedText(data, blocked, d.id), true)
                        sayOfTube('')
                        act(change)
                      }}
                    >
                      <span>
                        {complete && (
                          <span aria-hidden="true" className={ROLE.done}>
                            ✓{' '}
                          </span>
                        )}
                        {actionLabel(data, d.id)}
                      </span>
                    </Control>
                  )}
                  {/* What has been done to the tube, and the bath it stands in where that is not the one it has just been stood in, said again whenever either changes. */}
                  <p role="status" className="max-w-prose font-medium">
                    {doneText(d)}
                    {temperature !== 'room' && (d.kind === 'add' || d.acted === 0) && ` ${TEMPERATURE_TEXT[temperature]}`}
                  </p>
                  <div className="grid gap-1 text-xs">
                    {/* What to do with the picture, and its description. What is seen is not said here: a part says it when it is looked at. */}
                    <p id={exploreId} className="text-muted-foreground">
                      {PAGE_TEXT.explore}
                    </p>
                    {/* Which parts have been looked at, until what is seen is recorded: both have been by then. */}
                    {current && d.observation === null && (
                      <ul className="flex flex-wrap gap-x-4 gap-y-0.5">
                        {LOOKS.map((at) => {
                          const looked = d.looked.includes(at)
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
                    )}
                  </div>
                  {/* Closed: what has gone into the tube, and the whole of what the picture shows, which the learner is to find by looking. */}
                  <Disclosure summary={PAGE_TEXT.inWords}>
                    <p className="max-w-prose">{tubeSoFarText(data, d.id)}</p>
                    <p className="max-w-prose">{tubeText(shows, baths ? temperature : null)}</p>
                  </Disclosure>
                </div>
              </div>
              {/* While it has nothing to say it takes no room, the gap over it neither. */}
              {current && (
                <div className={tubeSaid.text === '' ? '-mt-2' : undefined}>
                  <Line said={tubeSaid} />
                </div>
              )}
            </div>
          </section>

          {/* Each sheet is there once the one before it has been worked: what is seen once the prediction is made, the question once what is seen is recorded. */}
          {(done || d.prediction !== null) && (
            <div className={`lechatelier-then ${CARD}`}>
              <Sheet heading={OBSERVATION_TEXT.heading}>
                {done && d.observation !== null && (
                  <>
                    <ul className="grid gap-0.5">
                      {observationLines(d.observation).map((line, at) => (
                        <li key={line}>
                          {d.wrongFields?.includes(FIELDS[at]!) && <Mark ok={false} />}
                          {line}
                        </li>
                      ))}
                    </ul>
                    {d.wrongFields === null ? (
                      <p className="text-muted-foreground">{ANSWER_TEXT.notChecked}</p>
                    ) : (
                      <p className="max-w-prose font-medium">
                        <Mark ok={d.wrongFields.length === 0} />
                        {checkedText(d.wrongFields)}
                      </p>
                    )}
                  </>
                )}
                {/* Until it opens it is one line that says what opens it. */}
                {current && !d.observationOpen && d.observation === null && <p className={`max-w-prose ${ROLE.held}`}>{complete ? OBSERVATION_TEXT.lookFirst : OBSERVATION_TEXT.actFirst}</p>}
                {current && (d.observationOpen || d.observation !== null) && (
                  <>
                    <ChoiceForm
                      // A form of its own for each mode: what is said of an observation that is recorded differs.
                      key={mode}
                      questions={FIELDS.map((field) => ({ id: field, label: FIELD_LABEL[field], choices: choiceList(m, field), waits: null }))}
                      recorded={d.observation}
                      // Guided takes only what the tube shows, so what it has taken is right, but for one that was recorded in Challenge before the mode was changed: that one is held to the tube. Challenge says nothing of an observation until the system is checked.
                      judged={d.observation === null ? null : { wrong: d.wrongFields ?? [], text: d.wrongFields === null ? '' : d.wrongFields.length === 0 ? checkedText([]) : mismatchText(d.wrongFields) }}
                      held={null}
                      refusal={(answers) => {
                        if (FIELDS.some((field) => answers[field] === undefined)) return blockedText(data, 'invalid-entry', d.id)
                        const refused = can({ type: 'observe', system, observation: answers as Observation })
                        // Whether the answers are what the tube shows is said when they are recorded, and not before.
                        return refused === null || refused === 'does-not-match' ? null : blockedText(data, refused, d.id)
                      }}
                      onRecord={(answers) => {
                        const observation = answers as Observation
                        const action: Action = { type: 'observe', system, observation }
                        if (can(action) === 'does-not-match') {
                          const fields = wrong(observation)
                          return { wrong: fields, text: mismatchText(fields) }
                        }
                        act(action)
                        return { wrong: [], text: guided ? checkedText([]) : '' }
                      }}
                      text={{ check: OBSERVATION_TEXT.record, change: PAGE_TEXT.change, cancel: PAGE_TEXT.cancel }}
                      brief={(answers) => observationLines(answers as Observation)}
                    />
                    {!guided && d.observation !== null && <p className="text-muted-foreground">{ANSWER_TEXT.notChecked}</p>}
                  </>
                )}
              </Sheet>
              {/* Once it is answered the answer stands with the notes it opens. */}
              {current && d.answerOpen && (
                <Sheet heading={ask.heading}>
                  <ChoiceForm
                    questions={[{ id: 'answer', label: ask.question, choices: withSides(ask.choices), waits: null }]}
                    recorded={null}
                    judged={null}
                    held={null}
                    refusal={({ answer }) => {
                      if (answer === undefined) return blockedText(data, 'invalid-entry', d.id)
                      const refused = can({ type: 'answer', system, is: answer })
                      // Whether the answer is right is said when it is given, and not before.
                      return refused === null || refused === 'not-right' ? null : blockedText(data, refused, d.id)
                    }}
                    onRecord={({ answer }) => {
                      const action: Action = { type: 'answer', system, is: answer! }
                      const refused = can(action)
                      if (refused !== null) return { wrong: ['answer'], text: blockedText(data, refused, d.id) }
                      act(action)
                      return { wrong: [], text: '' }
                    }}
                    text={{ check: ANSWER_TEXT.record, change: PAGE_TEXT.change, cancel: PAGE_TEXT.cancel }}
                  />
                  {/* Challenge takes whatever is given, once. */}
                  {!guided && <p className="max-w-prose text-muted-foreground">{ANSWER_TEXT.once}</p>}
                  {hint}
                </Sheet>
              )}
            </div>
          )}
        </div>
      </div>
      {!d.notesShown && <p className="max-w-prose text-sm text-muted-foreground">{NOTES_TEXT.later}</p>}
    </section>
  )
}
