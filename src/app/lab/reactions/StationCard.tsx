import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from 'react'
import { Disclosure } from '@/app/explore/InspectorCard'
import { ChoiceForm } from '@/app/lab/ChoiceForm'
import { Control } from '@/app/lab/Control'
import { EquationBuilder, EquationLine, Formula } from '@/app/lab/EquationBuilder'
import { Line, Mark, useSaid } from '@/app/lab/Line'
import { ROLE } from '@/app/lab/roles'
import { Marked } from '@/app/lab/stationPieces'
import { stationOf, type Field, type KindAnswer, type Look, type MetalId, type ReactionsData, type StationId } from '@/chem-data/reactions/data'
import type { Action, Blocked, Built, Mode, Observation, Problem, RunRecord, State, StationView, Tile, VesselView } from '@/engine/reactions'
import {
  ACTION_DONE,
  ACTION_LABEL,
  BUILDER_TEXT,
  EQUATION_TEXT,
  HINT,
  HINT_LABEL,
  KIND_LABEL,
  KIND_TEXT,
  METAL_NAME,
  NOTES_TEXT,
  OBSERVATION_TEXT,
  ORDER_TEXT,
  PAGE_TEXT,
  PROBLEM_TEXT,
  PROGRESS_TEXT,
  RECORD_TEXT,
  STATION_TASK,
  blockedText,
  catalystText,
  checkedText,
  choiceList,
  fieldLabel,
  kindChoiceLabel,
  kindChoices,
  lookPart,
  mismatchText,
  observationLines,
  orderText,
  outcomeText,
  progressOf,
  reasonText,
  stationLetter,
  stationNotes,
  tileLabel,
  vesselName,
  vesselShort,
  vesselText,
  type Progress,
} from './messages'
import { scenesOf, type Scene } from './vesselLook'
import { VesselPicture } from './VesselPicture'

/** Beside a station's progress in words, and hidden from a screen reader, which is given the words. */
export const PROGRESS_MARK: Record<Progress, string> = {
  'not-started': '○',
  'under-way': '◔',
  'to-check': '◑',
  'not-counted': '◑',
  done: '✓',
}

/** A station's progress as a mark and its words; the tick of a station that counts is in the role of a done mark. */
export function ProgressLabel({ progress }: { progress: Progress }) {
  return (
    <Marked mark={PROGRESS_MARK[progress]} done={progress === 'done'}>
      {PROGRESS_TEXT[progress]}
    </Marked>
  )
}

const STATES: readonly State[] = ['aq', 's', 'l', 'g']
const CARD = 'grid min-w-0 divide-y rounded-lg border bg-card text-sm'
const SHEET = 'grid min-w-0 justify-items-start gap-2 p-3'
const isProblem = (blocked: Blocked): blocked is Problem => blocked in PROBLEM_TEXT
/** The order of the metals, among the things a station of several tubes asks one at a time: no vessel has this id. */
const ORDER = ':order'

/** One question of a vessel, named by its heading. `folded` is for one whose answer is recorded and stands as a line beside "Change": the line says what it is of, so the heading is then a screen reader's alone, and the sheet is as short as the line, with what is said of the answer in the same row where there is the width (reactions.css). */
function Sheet({ heading, folded = false, children }: { heading: string; folded?: boolean; children: ReactNode }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className={folded ? 'reactions-folded' : SHEET}>
      <h4 id={headingId} className={folded ? 'sr-only' : 'font-semibold'}>
        {heading}
      </h4>
      {children}
    </section>
  )
}

/** Guided's hint for one thing asked: closed, and how to think, never what the vessel shows. */
const Hint = ({ children }: { children: string }) => (
  <Disclosure summary={HINT_LABEL}>
    <p className="max-w-prose">{children}</p>
  </Disclosure>
)

/** What a check found of one entry: a tick or a cross, and the sentence. */
const Found = ({ ok, children }: { ok: boolean; children: string }) => (
  <span className="font-medium whitespace-nowrap">
    <Mark ok={ok} />
    {children}
  </span>
)

/**
 * A finished equation in one line. With a catalyst, its formula stands over the arrow; a screen reader is given the
 * sentence under the line, which says the same, and not the formula in the middle of the equation.
 */
export function FinishedEquation({ tiles, built, catalyst }: { tiles: readonly Tile[]; built: Built; catalyst: Tile | null }) {
  const formula = (speciesId: string) => tiles.find((tile) => tile.speciesId === speciesId)?.formula ?? speciesId
  const side = (terms: Built['reactants']) =>
    terms.map((term, i) => (
      <span key={term.speciesId} className="whitespace-nowrap">
        {i > 0 && ' + '}
        {term.coefficient === 1 ? '' : term.coefficient}
        <Formula text={formula(term.speciesId)} />({term.state})
      </span>
    ))
  return (
    <span className={`inline-flex flex-wrap items-end gap-x-1.5 text-base ${ROLE.value}`}>
      {side(built.reactants)}
      <span className="inline-grid justify-items-center leading-none">
        {catalyst !== null && (
          <span aria-hidden="true" data-over-arrow="" className="text-xs">
            <Formula text={catalyst.formula} />
          </span>
        )}
        <span className={catalyst === null ? undefined : 'px-2'}>{catalyst === null ? '→' : '⟶'}</span>
      </span>
      {side(built.products)}
    </span>
  )
}

export interface StationCardProps {
  data: ReactionsData
  stationId: StationId
  mode: Mode
  view: StationView
  /** The run of the station that counts, where one does: the equations that were built in it stand with the notes. */
  counted: RunRecord | null
  /** The most liquid a tube of the lab comes to hold. */
  full: number
  /** Why an action cannot be done now, or null; the fields of an observation that Guided would refuse; and the action done. The page's, so that the card holds no state of the lab. */
  can(action: Action): Blocked | null
  wrong(vessel: string, observation: Observation): Field[]
  act(action: Action): void
  /** The station's heading, which takes focus when the station comes to be shown. */
  headingRef?: Ref<HTMLHeadingElement>
}

/**
 * One station (spec 24.2), in the order it is worked. The picture of each vessel, to explore, with the one button
 * that sets the reaction off: nothing says what is seen but the part of the picture that is looked at. What is
 * seen: choices, which open once the action is done and every part has been looked at since. Which kind: one
 * choice of five, the same five at every vessel. The equation, built from the station's tiles, unless the learner
 * said that nothing reacted. At the station of three tubes each tube has its own three, and the order of the
 * metals is asked last. An entry that is made folds to a line beside "Change", so that the next has the room.
 *
 * Once the run is checked nothing more is entered in it: what was recorded is lines to be read, each with a mark,
 * and how the run came out stands under them, with the way to work the station again. A station that counts shows
 * its notes outright, first, with each finished equation and a catalyst over its arrow: they are what the station
 * is for. The pictures can still be looked at.
 *
 * A station with one vessel has its picture on the left and the first two questions beside it, and the equation
 * under both, with the card's whole width; the three tubes stand in a row, each with what is seen under it
 * (reactions.css). The card keeps what is chosen or built and not yet recorded and what its message lines last
 * said; everything the lab stores comes to it as `view` and leaves it through `act`.
 */
export function StationCard({ data, stationId, mode, view, counted, full, can, wrong, act, headingRef }: StationCardProps) {
  const station = stationOf(data, stationId)
  const headingId = useId()
  const placeId = useId()
  const pictureId = useId()
  const notesId = useId()
  const tubesId = useId()
  const [said, say] = useSaid()
  const [closingSaid, sayAtClose] = useSaid()
  const notesRef = useRef<HTMLElement>(null)
  const outcomeRef = useRef<HTMLDivElement>(null)

  const guided = mode === 'guided'
  const { outcome } = view
  // At the station of several tubes, which is asked about now: a tube, for its kind and its equation, or the order of the metals. As the card is first drawn, the first tube that still wants either, or the order where every tube is answered and it is not given; from then on what the learner chooses.
  const answered = (vessel: VesselView) => vessel.kind !== null && (vessel.kind === 'none' || vessel.equation !== null)
  const [asked, setAsked] = useState(() => view.vessels.find((vessel) => !answered(vessel))?.id ?? (view.order?.said === null ? ORDER : view.vessels[0]!.id))
  const checked = outcome.state === 'counts' || outcome.state === 'does-not-count'
  const several = view.vessels.length > 1
  // What is seen of every vessel is recorded, or the run is checked: the pictures are then drawn short, with no room under them, so that what is asked next has it.
  const observed = checked || view.vessels.every((vessel) => vessel.observation !== null)
  const name = (vessel: VesselView) => vesselName(data, stationId, vessel.id)
  const drawnOf = (vessel: VesselView) => vessel.shows.drawn
  const formula = (speciesId: string) => view.tiles.find((tile) => tile.speciesId === speciesId)?.formula ?? speciesId

  // Guided checks a station by itself at its last entry, and the form that entry was made in goes: focus is never left on the page. It goes to the notes of a station that counts, and else to how the run came out. Never on load.
  const wasChecked = useRef(checked)
  useEffect(() => {
    if (checked && !wasChecked.current && document.activeElement === document.body) (view.done ? notesRef : outcomeRef).current?.focus()
    wasChecked.current = checked
  }, [checked, view.done])

  const press = (action: Action, to: typeof say) => {
    const blocked = can(action)
    if (blocked !== null) return to(blockedText(blocked), true)
    to('')
    act(action)
  }
  const doIt: Action = { type: 'act', station: stationId }
  const check: Action = { type: 'checkStation', station: stationId }
  const again: Action = { type: 'workAgain', station: stationId }

  /** A part of a vessel is looked at: stored the first time, where the engine takes it, and said each time. A run that is checked can still be looked at. */
  const look = (vessel: VesselView, at: Look) => {
    const action: Action = { type: 'look', station: stationId, vessel: vessel.id, at }
    if (!vessel.looks.find((l) => l.at === at)?.looked && can(action) === null) act(action)
  }
  const picture = (vessel: VesselView, scene: Scene) => (
    <VesselPicture
      name={PAGE_TEXT.picture(scene === 'burning' ? `${name(vessel)}, ${PAGE_TEXT.whileBurning}` : scene === 'afterwards' ? `${name(vessel)}, ${PAGE_TEXT.afterwards}` : name(vessel))}
      shows={vessel.shows}
      scene={scene}
      full={full}
      narrow={several}
      short={observed}
      looks={vessel.looks}
      seen={(at) => vessel.looks.find((l) => l.at === at)?.words ?? ''}
      onLook={(at) => look(vessel, at)}
    />
  )
  /** Which parts of a vessel have been looked at, until what is seen of it is recorded: all have been by then. */
  const looksList = (vessel: VesselView) =>
    vessel.observation === null && !checked && (
      <ul className="grid gap-0.5 text-xs">
        {vessel.looks.map(({ at, looked }) => (
          <li key={at}>
            <span aria-hidden="true" className={looked ? ROLE.done : undefined}>
              {looked ? '✓' : '○'}{' '}
            </span>
            {lookPart(drawnOf(vessel), at, vessel.shows.light !== null)}: {looked ? (at === 'touch' ? PAGE_TEXT.felt : PAGE_TEXT.lookedAt) : PAGE_TEXT.notLookedAt}
          </li>
        ))}
      </ul>
    )

  // ---- What is seen ----
  const seen = (vessel: VesselView) => {
    const drawn = drawnOf(vessel)
    const fields = vessel.fields.map(({ field }) => field)
    if (checked) {
      if (vessel.observation === null) return null
      return (
        <Sheet heading={OBSERVATION_TEXT.heading}>
          <ul className="grid gap-0.5">
            {observationLines(drawn, fields, vessel.observation, several).map((line, at) => (
              <li key={line}>
                {vessel.wrongFields?.includes(fields[at]!) && <Mark ok={false} />}
                {line}
              </li>
            ))}
          </ul>
          {vessel.wrongFields !== null && (
            <p>
              <Found ok={vessel.wrongFields.length === 0}>{checkedText(vessel.wrongFields)}</Found>
            </p>
          )}
        </Sheet>
      )
    }
    // Where several tubes stand in a row, what opens their questions is said once, under the row.
    if (several && !vessel.observationOpen && vessel.observation === null) return null
    return (
      <Sheet heading={OBSERVATION_TEXT.heading} folded={vessel.observation !== null && (vessel.wrongFields === null || vessel.wrongFields.length === 0)}>
        {/* Until it opens it is one line that says what opens it. */}
        {!vessel.observationOpen && vessel.observation === null ? (
          <p className={`max-w-prose ${ROLE.held}`}>{view.acted ? OBSERVATION_TEXT.lookFirst : OBSERVATION_TEXT.actFirst}</p>
        ) : (
          <>
            <ChoiceForm
              // A form of its own for each mode: what is said of an observation that is recorded differs.
              key={mode}
              questions={vessel.fields.map(({ field, choices }) => ({ id: field, label: fieldLabel(drawn, field), choices: choiceList(field, choices), waits: null }))}
              recorded={vessel.observation}
              // Guided takes only what the vessel shows, so what it has taken is right, but for one that was recorded in Challenge before the mode was changed: that one is held to the vessel. Challenge says nothing of an observation until the station is checked.
              judged={vessel.observation === null ? null : { wrong: vessel.wrongFields ?? [], text: vessel.wrongFields === null ? '' : vessel.wrongFields.length === 0 ? checkedText([]) : mismatchText(vessel.wrongFields) }}
              held={null}
              refusal={(answers) => {
                if (fields.some((field) => answers[field] === undefined)) return blockedText('invalid-entry')
                const refused = can({ type: 'observe', station: stationId, vessel: vessel.id, observation: answers as Observation })
                // Whether the answers are what the vessel shows is said when they are recorded, and not before.
                return refused === null || refused === 'does-not-match' ? null : blockedText(refused)
              }}
              onRecord={(answers) => {
                const observation = answers as Observation
                const action: Action = { type: 'observe', station: stationId, vessel: vessel.id, observation }
                if (can(action) === 'does-not-match') {
                  const not = wrong(vessel.id, observation)
                  return { wrong: not, text: mismatchText(not) }
                }
                act(action)
                return { wrong: [], text: guided ? checkedText([]) : '' }
              }}
              text={{ check: OBSERVATION_TEXT.record, change: PAGE_TEXT.change, cancel: PAGE_TEXT.cancel }}
              // Under one of several tubes a line has little room: each field in a word, and the tick of an answer found right before its line, where the sentence that says so has no room to stand (reactions.css).
              brief={(answers) => observationLines(drawn, fields, answers as Observation, several).map((line) => (several && vessel.wrongFields?.length === 0 ? `✓ ${line}` : line))}
            />
            {!guided && vessel.observation !== null && <p className="text-muted-foreground">{RECORD_TEXT.notChecked}</p>}
            {guided && !several && vessel.observation === null && <Hint>{HINT.observe}</Hint>}
          </>
        )}
      </Sheet>
    )
  }

  // ---- Which kind ----
  const kind = (vessel: VesselView) => {
    if (vessel.kind === null && !vessel.kindOpen) return null
    if (checked) {
      return (
        vessel.kind !== null && (
          <Sheet heading={KIND_TEXT.heading}>
            <p>
              {KIND_LABEL[vessel.kind]} {vessel.kindRight !== null && <Found ok={vessel.kindRight}>{vessel.kindRight ? KIND_TEXT.right : KIND_TEXT.wrong}</Found>}
            </p>
          </Sheet>
        )
      )
    }
    return (
      <Sheet heading={KIND_TEXT.heading} folded={vessel.kind !== null && vessel.kindRight !== false}>
        <ChoiceForm
          key={mode}
          questions={[{ id: 'kind', label: KIND_TEXT.question, choices: kindChoices(data).map((choice) => ({ value: choice.value, label: kindChoiceLabel(choice) })), waits: null }]}
          recorded={vessel.kind === null ? null : { kind: vessel.kind }}
          judged={vessel.kind === null ? null : vessel.kindRight === false ? { wrong: ['kind'], text: KIND_TEXT.wrong } : { wrong: [], text: vessel.kindRight === null ? '' : KIND_TEXT.right }}
          held={null}
          refusal={(answers) => {
            if (answers.kind === undefined) return blockedText('invalid-entry')
            const refused = can({ type: 'sayKind', station: stationId, vessel: vessel.id, kind: answers.kind as KindAnswer })
            // Whether the kind is right is said when it is given, and not before.
            return refused === null || refused === 'not-right' ? null : blockedText(refused)
          }}
          onRecord={(answers) => {
            const action: Action = { type: 'sayKind', station: stationId, vessel: vessel.id, kind: answers.kind as KindAnswer }
            if (can(action) === 'not-right') return { wrong: ['kind'], text: KIND_TEXT.tryAgain }
            act(action)
            return { wrong: [], text: guided ? KIND_TEXT.right : '' }
          }}
          text={{ check: KIND_TEXT.record, change: PAGE_TEXT.change, cancel: PAGE_TEXT.cancel }}
          brief={(answers) => [`${KIND_TEXT.heading}: ${KIND_LABEL[answers.kind as KindAnswer]}`]}
        />
        {!guided && vessel.kind !== null && <p className="text-muted-foreground">{RECORD_TEXT.notChecked}</p>}
        {guided && vessel.kind === null && <Hint>{HINT.kind}</Hint>}
      </Sheet>
    )
  }

  // ---- The equation ----
  const equation = (vessel: VesselView) => {
    if (vessel.kind === null) return null
    if (vessel.kind === 'none') {
      return (
        <Sheet heading={EQUATION_TEXT.heading}>
          <p className="max-w-prose">{EQUATION_TEXT.nothingToWrite}</p>
        </Sheet>
      )
    }
    const recorded = vessel.equation
    if (checked) {
      return (
        recorded !== null && (
          <Sheet heading={EQUATION_TEXT.heading}>
            <p className={`text-base ${ROLE.value}`}>
              <EquationLine entry={{ noReaction: false, ...recorded.built }} formula={formula} noReaction="" />
            </p>
            {recorded.judged && (
              <p>
                <Found ok={recorded.problem === null}>{recorded.problem === null ? EQUATION_TEXT.right : PROBLEM_TEXT[recorded.problem]}</Found>
              </p>
            )}
          </Sheet>
        )
      )
    }
    const open = recorded === null || (recorded.judged && recorded.problem !== null)
    return (
      <div className="reactions-equation grid min-w-0 gap-2 p-3">
        <EquationBuilder
          // A builder of its own for each mode: Guided gives the row its places, and what is said of an equation that is recorded differs.
          key={mode}
          heading={EQUATION_TEXT.heading}
          palette={view.tiles.map((tile) => tile.speciesId)}
          formula={formula}
          tileName={(speciesId) => tileLabel(view.tiles.find((tile) => tile.speciesId === speciesId)!)}
          states={STATES}
          recorded={recorded && { entry: { noReaction: false, ...recorded.built }, ok: recorded.judged ? recorded.problem === null : null, text: !recorded.judged ? EQUATION_TEXT.recorded : recorded.problem === null ? EQUATION_TEXT.right : PROBLEM_TEXT[recorded.problem] }}
          counts={vessel.places}
          held={null}
          refusal={(entry) => {
            const refused = can({ type: 'enterEquation', station: stationId, vessel: vessel.id, entry })
            // What is wrong with an equation is said when it is recorded, and not before. The one entry the builder makes that the engine does not take is a side with nothing on it.
            if (refused === null || isProblem(refused)) return null
            return refused === 'invalid-entry' ? EQUATION_TEXT.incomplete : blockedText(refused)
          }}
          onEnter={(entry) => {
            const action: Action = { type: 'enterEquation', station: stationId, vessel: vessel.id, entry }
            const refused = can(action)
            if (refused !== null && isProblem(refused)) return { ok: false, text: PROBLEM_TEXT[refused] }
            act(action)
            return guided ? { ok: true, text: EQUATION_TEXT.right } : { ok: null, text: EQUATION_TEXT.recorded }
          }}
          text={BUILDER_TEXT}
          intro={`${EQUATION_TEXT.build} ${EQUATION_TEXT.balance}`}
          // The tiles and a term's controls stand over the row: the row takes a second line as it is filled in a narrow card, and what is pressed one time after another must not move.
          toolsFirst
        />
        {guided && open && <Hint>{HINT.equation}</Hint>}
      </div>
    )
  }

  // ---- The order of the metals ----
  const order = () => {
    if (view.order === null) return null
    const { metals, said: given, right, open } = view.order
    const choices = metals.map((metal) => ({ value: metal, label: METAL_NAME[metal] }))
    const orderOf = (answers: Readonly<Record<string, string>>): MetalId[] => [answers.most as MetalId, ...metals.filter((metal) => metal !== answers.most && metal !== answers.least), answers.least as MetalId]
    return (
      <Sheet heading={ORDER_TEXT.heading} folded={!checked && given !== null && right !== false}>
        {checked ? (
          given !== null && (
            <p>
              {orderText(given)} {right !== null && <Found ok={right}>{right ? ORDER_TEXT.right : ORDER_TEXT.wrong}</Found>}
            </p>
          )
        ) : !open && given === null ? (
          <p className={`max-w-prose ${ROLE.held}`}>{ORDER_TEXT.observeFirst}</p>
        ) : (
          <>
            <p className="max-w-prose">{ORDER_TEXT.question}</p>
            <ChoiceForm
              key={mode}
              questions={[
                { id: 'most', label: ORDER_TEXT.mostActive, choices, waits: null },
                { id: 'least', label: ORDER_TEXT.leastActive, choices, waits: null },
              ]}
              recorded={given === null ? null : { most: given[0]!, least: given.at(-1)! }}
              judged={given === null ? null : right === false ? { wrong: ['most', 'least'], text: ORDER_TEXT.wrong } : { wrong: [], text: right === null ? '' : ORDER_TEXT.right }}
              held={null}
              refusal={(answers) => {
                if (answers.most === undefined || answers.least === undefined) return blockedText('invalid-entry')
                if (answers.most === answers.least) return ORDER_TEXT.sameMetal
                const refused = can({ type: 'sayOrder', station: stationId, order: orderOf(answers) })
                return refused === null || refused === 'not-right' ? null : blockedText(refused)
              }}
              onRecord={(answers) => {
                const action: Action = { type: 'sayOrder', station: stationId, order: orderOf(answers) }
                if (can(action) === 'not-right') return { wrong: ['most', 'least'], text: ORDER_TEXT.tryAgain }
                act(action)
                return { wrong: [], text: guided ? ORDER_TEXT.right : '' }
              }}
              text={{ check: ORDER_TEXT.record, change: PAGE_TEXT.change, cancel: PAGE_TEXT.cancel }}
              brief={(answers) => [`${ORDER_TEXT.heading}: ${orderText(orderOf(answers))}`]}
            />
            {!guided && given !== null && <p className="text-muted-foreground">{RECORD_TEXT.notChecked}</p>}
            {guided && given === null && <Hint>{HINT.order}</Hint>}
          </>
        )}
      </Sheet>
    )
  }

  const actButton = (
    <Control unavailable={can(doIt) !== null} dimmed={!view.acted && can(doIt) !== null} variant={view.acted ? 'secondary' : 'default'} className="h-auto min-h-11 max-w-full px-4 py-1 text-left whitespace-normal" onClick={() => press(doIt, say)}>
      <span>
        {view.acted && (
          <span aria-hidden="true" className={ROLE.done}>
            ✓{' '}
          </span>
        )}
        {ACTION_LABEL[stationId]}
      </span>
    </Control>
  )
  /** What is to be done, until it is done; then that it has been, said again as it changes. */
  const stage = (
    <p role="status" className="max-w-prose">
      <span className="font-medium">{view.acted ? PAGE_TEXT.after : PAGE_TEXT.before}.</span> {view.acted ? ACTION_DONE[stationId] : STATION_TASK[stationId]}
    </p>
  )
  /** Closed: the whole of what each picture shows, which the learner is to find by looking. */
  const inWords = (
    <Disclosure summary={PAGE_TEXT.inWords}>
      {view.vessels.map((vessel) => (
        <p key={vessel.id} className="max-w-prose">
          {several && <span className="font-medium">{name(vessel)}: </span>}
          {vesselText(vessel.shows)}
        </p>
      ))}
    </Disclosure>
  )
  /** The one button and, beside it where the card has the width, the closed disclosure that holds the pictures in words. */
  const doing = (
    <div className="reactions-act">
      {actButton}
      {inWords}
    </div>
  )
  const first = view.vessels[0]!
  const scenes = scenesOf(first.shows)
  // Under the row of several tubes, while any of them is still to be recorded: what opens their boxes, said once, and Guided's one hint for them all.
  const unopened = !checked && view.vessels.some((vessel) => !vessel.observationOpen && vessel.observation === null)
  const hinted = guided && !checked && view.vessels.some((vessel) => vessel.observation === null)
  const equations = (counted?.vessels ?? []).flatMap((recorded) => {
    const vessel = view.vessels.find((v) => v.id === recorded.id)
    return recorded.equation === null || vessel === undefined ? [] : [{ vessel, built: recorded.equation.built }]
  })

  return (
    <section aria-labelledby={headingId} className="reactions-station grid min-w-0 gap-2">
      <div className="grid gap-1">
        <p id={placeId} className="text-xs text-muted-foreground">
          {stationLetter(data, stationId)}
          {' · '}
          {RECORD_TEXT.run(view.runs - 1)}
          {' · '}
          <span className="font-medium text-foreground">
            <ProgressLabel progress={progressOf(view)} />
          </span>
        </p>
        <h2 ref={headingRef} id={headingId} tabIndex={-1} aria-describedby={placeId} className="w-fit rounded-sm text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {station.title}
        </h2>
      </div>
      {/* Always there, and empty until the station counts, so that a screen reader says it when it comes. While it is empty it takes no room, the gap under it neither. */}
      <p role="status" className={`text-sm font-medium ${view.done ? '' : '-mb-2'}`}>
        {view.done && (
          <Marked mark="✓" done>
            {outcomeText({ state: 'counts' })}
          </Marked>
        )}
      </p>

      {view.done && (
        // Once the station counts and not before, shown outright, and first: the notes say what each thing was and why, which is what the station is for.
        <section ref={notesRef} tabIndex={-1} aria-labelledby={notesId} className={`${CARD} outline-none focus-visible:ring-2 focus-visible:ring-ring`}>
          <div className={SHEET}>
            <h3 id={notesId} className="text-base font-semibold">
              {NOTES_TEXT.heading}
            </h3>
            <div className="grid max-w-[75ch] gap-2 leading-relaxed">
              {stationNotes(data, stationId).map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>
            <ul className="grid w-full gap-1.5 rounded-md border-l-4 border-foreground/40 bg-muted/60 py-1.5 pr-2 pl-3">
              {equations.map(({ vessel, built }) => (
                <li key={vessel.id} className="grid gap-0.5">
                  <span>
                    {several && <span className="font-medium">{name(vessel)}: </span>}
                    <FinishedEquation tiles={view.tiles} built={built} catalyst={vessel.catalyst} />
                  </span>
                  {vessel.catalyst !== null && <span className="max-w-prose">{catalystText(vessel.catalyst)}</span>}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {several ? (
        <>
          <section aria-labelledby={pictureId} className={CARD}>
            <div className={SHEET}>
              <h3 id={pictureId} className="text-base font-semibold">
                {PAGE_TEXT.beforeAndAfter}
              </h3>
              {stage}
              {doing}
              <Line said={said} />
            </div>
            {/* The three tubes in one row, each with its name over it and what is seen of it under it. */}
            <div className="reactions-tubes">
              {view.vessels.map((vessel) => (
                <div key={vessel.id} className="grid min-w-0 content-start">
                  <div className="grid grid-cols-1 justify-items-start gap-1 p-2 pb-1">
                    <h4 className="font-semibold">{name(vessel)}</h4>
                    {picture(vessel, 'whole')}
                    {looksList(vessel)}
                  </div>
                  {seen(vessel)}
                </div>
              ))}
            </div>
            {(unopened || hinted) && (
              <div className={SHEET}>
                {unopened && <p className={`max-w-prose ${ROLE.held}`}>{view.acted ? OBSERVATION_TEXT.lookFirst : OBSERVATION_TEXT.actFirst}</p>}
                {hinted && <Hint>{HINT.observe}</Hint>}
              </div>
            )}
          </section>
          {/* One thing at a time, once what is seen in every tube is recorded: a tube's kind and its equation, or the order of the metals. Each keeps what is chosen or built for it while another is shown. Until then the three tubes, which are compared, have the page. */}
          <section aria-labelledby={tubesId} hidden={!observed} className={CARD}>
            <div className={SHEET}>
              <h3 id={tubesId} className="text-base font-semibold">
                {PAGE_TEXT.oneAtATime}
              </h3>
              <div role="group" aria-labelledby={tubesId} className="reactions-chooser w-full">
                {[
                  // A tick is for an answer found right, which Challenge finds only at the check: until then what is recorded has a mark of its own.
                  ...view.vessels.map((vessel) => ({ id: vessel.id, label: name(vessel), short: vesselShort(data, stationId, vessel.id), recorded: answered(vessel), right: vessel.kindRight === true && (vessel.equation === null || (vessel.equation.judged && vessel.equation.problem === null)) })),
                  ...(view.order === null ? [] : [{ id: ORDER, label: ORDER_TEXT.heading, short: ORDER_TEXT.short, recorded: view.order.said !== null, right: view.order.right === true }]),
                ].map(({ id, label, short, recorded, right }) => (
                  <button key={id} type="button" aria-pressed={id === asked} onClick={() => setAsked(id)} className="min-h-11 rounded-md border border-l-4 px-1.5 py-1 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-foreground aria-pressed:bg-muted aria-pressed:font-medium">
                    {/* A word, where four stand in a row; the whole name is a screen reader's. */}
                    <span aria-hidden="true">
                      <Marked mark={recorded && right ? '✓' : recorded ? '●' : '○'} done={recorded && right}>
                        {short}
                      </Marked>
                    </span>
                    <span className="sr-only">
                      {label}
                      {recorded && `: ${EQUATION_TEXT.recorded}`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            {observed &&
              view.vessels.map((vessel) => (
                <section key={vessel.id} aria-label={name(vessel)} hidden={vessel.id !== asked} className="divide-y">
                  {kind(vessel)}
                  {equation(vessel)}
                </section>
              ))}
            {observed && <div hidden={asked !== ORDER}>{order()}</div>}
          </section>
        </>
      ) : (
        <section aria-labelledby={pictureId} className={CARD}>
          <div className="reactions-top" data-scenes={scenes.length}>
            <div className={`reactions-pictures ${SHEET} content-start`}>
              <h3 id={pictureId} className="text-base font-semibold">
                {PAGE_TEXT.beforeAndAfter}
              </h3>
              <div className={scenes.length > 1 ? 'grid w-full max-w-[26.5rem] grid-cols-2 gap-2' : undefined}>
                {scenes.map((scene) => (
                  <figure key={scene} className="grid min-w-0 grid-cols-1 content-start gap-1">
                    {picture(first, scene)}
                    {scene !== 'whole' && <figcaption className="text-xs font-medium">{scene === 'burning' ? PAGE_TEXT.whileBurning : PAGE_TEXT.afterwards}</figcaption>}
                  </figure>
                ))}
              </div>
            </div>
            <div className={`reactions-side ${SHEET} content-start`}>
              {stage}
              {doing}
              <Line said={said} />
              {looksList(first)}
            </div>
            <div className="reactions-asked grid min-w-0 content-start divide-y">
              {seen(first)}
              {kind(first)}
            </div>
          </div>
          {equation(first)}
        </section>
      )}

      <section className="grid justify-items-start gap-2 rounded-lg border bg-card p-3 text-sm">
        {/* Room about the words, taken back from the card's own, so that the ring that shows where focus went does not hug them. */}
        <div ref={outcomeRef} tabIndex={-1} className="-mx-2 -my-1 grid max-w-prose gap-1 rounded-md px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <p className={outcome.state === 'open' ? 'text-muted-foreground' : undefined}>
            {checked && <Mark ok={outcome.state === 'counts'} />}
            {outcomeText(outcome)}
            {!view.done && ` ${NOTES_TEXT.later}`}
          </p>
          {outcome.state === 'does-not-count' && (
            <ul className="grid list-disc gap-0.5 pl-5">
              {outcome.reasons.map((reason) => (
                <li key={reasonText(data, stationId, reason)}>{reasonText(data, stationId, reason)}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Guided checks a station by itself; the check is asked for in Challenge, and in Guided only where something recorded in Challenge is still not right. */}
          {(outcome.state === 'to-check' || (mode === 'challenge' && outcome.state === 'open')) && (
            <Control unavailable={can(check) !== null} className="h-auto min-h-11 px-4 py-1 text-left whitespace-normal" onClick={() => press(check, sayAtClose)}>
              {PAGE_TEXT.check}
            </Control>
          )}
          <Control
            unavailable={can(again) !== null}
            className="h-auto min-h-11 px-4 py-1 text-left whitespace-normal"
            onClick={() => {
              const blocked = can(again)
              if (blocked !== null) return sayAtClose(blockedText(blocked), true)
              if (window.confirm(PAGE_TEXT.workAgainAsk)) act(again)
            }}
          >
            {PAGE_TEXT.workAgain}
          </Control>
        </div>
        {/* While it has nothing to say it takes no room, the gap over it neither. */}
        <div className={closingSaid.text === '' ? '-mt-2' : undefined}>
          <Line said={closingSaid} />
        </div>
      </section>
    </section>
  )
}
