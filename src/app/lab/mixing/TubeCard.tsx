import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from 'react'
import { Disclosure } from '@/app/explore/InspectorCard'
import { ChoiceForm } from '@/app/lab/ChoiceForm'
import { Control } from '@/app/lab/Control'
import { Line, Mark, useSaid } from '@/app/lab/Line'
import { ROLE } from '@/app/lab/roles'
import { Marked } from '@/app/lab/stationPieces'
import { Tube } from '@/app/lab/Tube'
import type { LiquidId, MixingData, TubeId } from '@/chem-data/mixing/data'
import { LAYERS, SOLID_SEEN, can, tubeView, type Action, type Layers, type MixingModel, type MixingState, type SolidSeen } from '@/engine/mixing'
import {
  BLOCKED_TEXT,
  CHOOSE_TEXT,
  FORM_TEXT,
  GUIDED_TEXT,
  LAYERS_LABEL,
  NOTES_TEXT,
  NOT_SETTLED_TEXT,
  PAGE_TEXT,
  PART_LABEL,
  RECORD_TEXT,
  SOLID_LABEL,
  STAGE_TEXT,
  STEP_TEXT,
  TUBE_HINT,
  addLabel,
  amountsText,
  liquidName,
  markText,
  moreLabel,
  partText,
  tubeName,
  tubeNote,
  tubeOutcomeText,
  tubeText,
  type TubePart,
} from './messages'
import { TUBE_HEIGHT, tubeLayers, tubeMark, tubeSections } from './pageLook'
import { CARD, HEADING, SHEET, Sheet } from './sheets'

export interface TubeCardProps {
  data: MixingData
  m: MixingModel
  state: MixingState
  tube: TubeId
  /** The actions done, in order, as one save. */
  act(...actions: Action[]): void
  /** The tube's heading, which takes focus when the tube comes to be shown. */
  headingRef?: Ref<HTMLHeadingElement>
}

/** A step of a tube as a button that stays where it is: it has a tick once it is done, and cannot be pressed again. The tick has its room from the start, so that the words do not move when it comes. */
function StepButton({ done, unavailable, onClick, children }: { done: boolean; unavailable: boolean; onClick(): void; children: ReactNode }) {
  return (
    <Control unavailable={unavailable} dimmed={unavailable && !done} variant={done ? 'secondary' : 'outline'} className="h-auto min-h-11 w-full justify-start px-3 py-1 text-left whitespace-normal" onClick={onClick}>
      <span>
        <span aria-hidden="true" className={`${ROLE.done} ${done ? '' : 'invisible'}`}>
          ✓{' '}
        </span>
        {children}
      </span>
    </Control>
  )
}

/** An answer that has been checked, as a line: the question, what was answered, and the mark, for the eye and in words. */
export function CheckedLine({ question, answer, right }: { question: string; answer: string; right: boolean | null }) {
  return (
    <li>
      {right !== null && <Mark ok={right} />}
      {question} <span className="font-medium">{answer}</span>
      {right !== null && <span className="sr-only"> {markText(right)}</span>}
    </li>
  )
}

/** Closed, and Guided's alone, under the question that is open: where to look, and never the answer. A disclosure is a line of words with a hit area a finger tall laid over it, which reaches 24 px over an open one: it stands that far under the button over it. */
function Hint({ children }: { children: string }) {
  return (
    <div className="pt-4 pb-1">
      <Disclosure summary={PAGE_TEXT.hint}>
        <p className="max-w-prose">{children}</p>
      </Disclosure>
    </div>
  )
}

/**
 * One tube, in the order it is worked (spec 25.2). The tube, drawn, to explore, with its steps beside it, each a
 * button that stays where it is: what goes in, the shaking, the standing. A pair is filled by choosing which of
 * its two liquids there is more of. A look at a part of the picture says what is seen there in words, in a callout,
 * and nothing on the page says it before the look but a disclosure that is closed. The first look at a tube that
 * has stood is stored, and opens what is recorded of it: one layer or two and, of two, which liquid is on top; or
 * whether the solid is gone. Each is recorded by itself and folds to a line beside "Change". Last, how the tube
 * came out, and once it counts its note.
 *
 * Nothing here says whether two liquids mix or a solid dissolves before the tube counts: the card draws from the
 * engine's views, which hand that over only as the picture of a tube that has stood. The card keeps which parts
 * have been looked at and what its lines last said; everything the lab stores leaves it through `act`.
 */
export function TubeCard({ data, m, state, tube, act, headingRef }: TubeCardProps) {
  const headingId = useId()
  const exploreId = useId()
  const notesId = useId()
  const view = tubeView(m, state, tube)
  const guided = state.mode === 'guided'
  const name = tubeName(data, tube)
  const status = tubeMark(view)
  const [stepSaid, sayOfStep] = useSaid()
  const [lookSaid, sayOfLook] = useSaid()
  // The parts looked at, each with the stage it was looked at in: a tube that has stood is another picture.
  const [seen, setSeen] = useState<readonly string[]>([])
  // A tube that the stored record says was looked at, as on a reload, has no part left to look at for the first time.
  const [lookedBefore] = useState(view.looked)
  const outcomeRef = useRef<HTMLDivElement>(null)
  const over = view.outcome.state === 'counts' || view.outcome.state === 'does-not-count'

  // The check's button goes when the check is made, and Guided checks by itself: focus goes to how the tube came out if it was left on the page, and that is brought into view whoever made the check.
  const wasOver = useRef(over)
  useEffect(() => {
    if (over && !wasOver.current) {
      if (document.activeElement === document.body) outcomeRef.current?.focus()
      else outcomeRef.current?.scrollIntoView({ block: 'nearest' })
    }
    wasOver.current = over
  }, [over])

  const press = (action: Action) => {
    const blocked = can(m, state, action)
    if (blocked !== null) return sayOfStep(BLOCKED_TEXT[blocked], true)
    sayOfStep('')
    act(action)
  }
  /** A part is looked at: said each time, and stored the first time the engine takes it, which is once the tube has stood. Before that a look is of the tube as it is, and stores nothing. */
  const look = (part: TubePart) => {
    const action: Action = { type: 'look', tube }
    if (can(m, state, action) === null) act(action)
    sayOfLook(partText(view.shows, part))
    setSeen((before) => [...before, `${view.stage}:${part}`])
  }
  const record = (action: Action, right: string) => {
    const blocked = can(m, state, action)
    // That the answer is not right is said, and never what it should be.
    if (blocked !== null) return { wrong: ['answer'], text: BLOCKED_TEXT[blocked] }
    act(action)
    return { wrong: [], text: right }
  }
  const formText = { check: FORM_TEXT.record, change: FORM_TEXT.change, cancel: PAGE_TEXT.cancel }
  const missing = (answers: Readonly<Record<string, string>>) => (answers.answer === undefined ? BLOCKED_TEXT['not-all-recorded'] : null)
  // Challenge says nothing of an answer until the tube is checked. Guided takes only what is right, but for an answer recorded in Challenge before the mode was changed: that one is held to the tube.
  const found = (answer: string | null, right: boolean | null) => (answer === null ? null : { wrong: right === false ? ['answer'] : [], text: right === false ? BLOCKED_TEXT['not-right'] : '' })

  const layers = tubeLayers(view.shows, m.moreMicrolitres + m.lessMicrolitres)
  const sections = tubeSections(view, layers, (part) => seen.includes(`${view.stage}:${part}`) || (lookedBefore && view.stage === 'stood'))
  const shake: Action = { type: 'shake', tube }
  const stand: Action = { type: 'stand', tube }
  const shaken = view.stage === 'shaken' || view.stage === 'stood'

  return (
    <section aria-labelledby={headingId} className="mixing-tube grid min-w-0 gap-2">
      <div className={CARD}>
        <div className={SHEET}>
          <div className="flex w-full flex-wrap items-baseline justify-between gap-x-3">
            <h3 ref={headingRef} id={headingId} tabIndex={-1} className={`rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring ${HEADING}`}>
              {name}
            </h3>
            <p className="text-xs font-medium">
              <Marked mark={status.mark} done={status.done}>
                {status.text}
              </Marked>
              {view.tries > 0 && ` · ${RECORD_TEXT.tries(view.tries)}`}
            </p>
          </div>
          {/* What the part looked at shows, for a screen reader, said at each look: the eye has the callout beside the part. */}
          <div className="sr-only">
            <Line said={lookSaid} />
          </div>
          <div className="mixing-tube-grid w-full">
            <Tube
              name={PAGE_TEXT.tubePicture(name)}
              describedBy={exploreId}
              height={TUBE_HEIGHT}
              layers={layers}
              // Each layer has its bracket and its word: two liquids are told apart by where each is and how thick it is, and never by a colour.
              words={{ liquid: layers.above ? PART_LABEL.lower : PART_LABEL.liquid, above: PART_LABEL.upper, solid: PART_LABEL.solid }}
              sections={sections}
              seen={(part) => partText(view.shows, part)}
              onLook={look}
            />
            <div className="grid content-start justify-items-start gap-2">
              {view.kind === 'pair' ? (
                <div role="group" aria-label={CHOOSE_TEXT.more} className="grid w-full gap-2">
                  <p className={`font-medium ${view.more === null ? ROLE.entry : ''}`}>{CHOOSE_TEXT.more}</p>
                  {view.liquids.map((liquid) => (
                    <StepButton key={liquid} done={view.more === liquid} unavailable={view.more !== null} onClick={() => press({ type: 'pour', tube: view.id, more: liquid })}>
                      {moreLabel(data, liquid)}
                    </StepButton>
                  ))}
                </div>
              ) : (
                <StepButton done={view.stage !== 'empty'} unavailable={view.stage !== 'empty'} onClick={() => press({ type: 'add', tube: view.id })}>
                  {addLabel(data, view)}
                </StepButton>
              )}
              <StepButton done={shaken} unavailable={can(m, state, shake) !== null} onClick={() => press(shake)}>
                {STEP_TEXT.shake}
              </StepButton>
              <StepButton done={view.stage === 'stood'} unavailable={can(m, state, stand) !== null} onClick={() => press(stand)}>
                {STEP_TEXT.stand}
              </StepButton>
              <Line said={stepSaid} />
            </div>
          </div>
          {/* What to do next, under the picture and the buttons, which stay where they are as it changes. It keeps its room once the tube has been looked at and the form says what is next, so that nothing under it moves. */}
          <p role="status" className="min-h-5 font-medium">
            {view.looked ? '' : STAGE_TEXT[view.stage]}
          </p>
          {/* What to do with the picture, once there is something to read in it; until then, that a tube is not read before it has stood. What is seen is not said here: a part says it when it is looked at. */}
          <p id={exploreId} className="max-w-prose text-xs text-muted-foreground">
            {view.stage === 'stood' ? PAGE_TEXT.lookAt : NOT_SETTLED_TEXT}
          </p>
          <div className="pt-4 pb-1">
            {/* Closed: the whole of what the tube shows, which the learner is to find by looking. */}
            <Disclosure summary={PAGE_TEXT.tubeInWords}>
              <p className="max-w-prose">{tubeText(view)}</p>
            </Disclosure>
          </div>
        </div>

        <Sheet heading={FORM_TEXT.heading}>
          {!view.looked ? (
            <p className="max-w-prose">{FORM_TEXT.closed}</p>
          ) : !view.formOpen ? (
            <ul className="grid gap-1">
              {view.kind === 'pair' ? (
                <>
                  <CheckedLine question={FORM_TEXT.layers} answer={view.layers === null ? '' : LAYERS_LABEL[view.layers]} right={view.layersRight} />
                  {view.topAsked && <CheckedLine question={FORM_TEXT.top} answer={view.top === null ? '' : liquidName(data, view.top)} right={view.topRight} />}
                </>
              ) : (
                <CheckedLine question={FORM_TEXT.solid} answer={view.seen === null ? '' : SOLID_LABEL[view.seen]} right={view.seenRight} />
              )}
            </ul>
          ) : view.kind === 'pair' ? (
            <>
              <ChoiceForm
                questions={[{ id: 'answer', label: FORM_TEXT.layers, choices: LAYERS.map((layers) => ({ value: layers, label: LAYERS_LABEL[layers] })), waits: null }]}
                recorded={view.layers === null ? null : { answer: view.layers }}
                judged={found(view.layers, view.layersRight)}
                held={null}
                refusal={missing}
                onRecord={(answers) => record({ type: 'sayLayers', tube: view.id, is: answers.answer as Layers }, guided ? GUIDED_TEXT.recorded : '')}
                text={formText}
                brief={(answers) => [`${FORM_TEXT.layers} ${LAYERS_LABEL[answers.answer as Layers]}`]}
              />
              {guided && view.layers === null && <Hint>{TUBE_HINT.layers}</Hint>}
              {/* Asked once two layers are recorded, and gone again if that is changed to one. */}
              {view.topAsked && (
                <>
                  {/* What the layers are told apart by, over the question it is for: which liquid there is more of, and so which is the thicker. */}
                  <p className="max-w-prose text-xs text-muted-foreground">
                    {amountsText(data, view)} {FORM_TEXT.topHelp}
                  </p>
                  <ChoiceForm
                    questions={[{ id: 'answer', label: FORM_TEXT.top, choices: view.liquids.map((liquid) => ({ value: liquid, label: liquidName(data, liquid) })), waits: null }]}
                    recorded={view.top === null ? null : { answer: view.top }}
                    judged={found(view.top, view.topRight)}
                    held={null}
                    refusal={missing}
                    onRecord={(answers) => record({ type: 'sayTop', tube: view.id, is: answers.answer as LiquidId }, guided ? GUIDED_TEXT.recorded : '')}
                    text={formText}
                    brief={(answers) => [`${FORM_TEXT.top} ${liquidName(data, answers.answer as LiquidId)}`]}
                  />
                  {guided && view.top === null && <Hint>{TUBE_HINT.top}</Hint>}
                </>
              )}
            </>
          ) : (
            <>
              <ChoiceForm
                questions={[{ id: 'answer', label: FORM_TEXT.solid, choices: SOLID_SEEN.map((is) => ({ value: is, label: SOLID_LABEL[is] })), waits: null }]}
                recorded={view.seen === null ? null : { answer: view.seen }}
                judged={found(view.seen, view.seenRight)}
                held={null}
                refusal={missing}
                onRecord={(answers) => record({ type: 'saySolid', tube: view.id, is: answers.answer as SolidSeen }, guided ? GUIDED_TEXT.recorded : '')}
                text={formText}
                brief={(answers) => [`${FORM_TEXT.solid} ${SOLID_LABEL[answers.answer as SolidSeen]}`]}
              />
              {guided && view.seen === null && <Hint>{TUBE_HINT.solid}</Hint>}
            </>
          )}
        </Sheet>
      </div>

      {/* How the tube came out, under what settled it: always there, and empty until there is something to say, so that a screen reader says it when it comes. While it is empty it takes no room, the gap over it neither. */}
      <div ref={outcomeRef} tabIndex={-1} className={`grid justify-items-start gap-2 rounded-lg text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring ${view.outcome.state === 'open' ? '-mt-2' : 'border bg-card p-3'}`}>
        <p role="status" className="max-w-prose font-medium">
          {view.outcome.state !== 'open' && (
            <>
              {over && <Mark ok={view.outcome.state === 'counts'} />}
              {tubeOutcomeText(view)}
            </>
          )}
        </p>
        {/* Guided checks a tube by itself once what it asks is recorded. */}
        {view.outcome.state === 'to-check' && (
          <Control unavailable={false} className="min-h-11" onClick={() => press({ type: 'check', tube })}>
            {FORM_TEXT.check}
          </Control>
        )}
        {view.outcome.state === 'does-not-count' && (
          <Control unavailable={false} className="h-auto min-h-11 py-1 text-left whitespace-normal" onClick={() => press({ type: 'again', tube })}>
            {FORM_TEXT.again}
          </Control>
        )}
        {/* Once the tube counts and not before: the note says what was seen and what it means. */}
        {view.notesShown && (
          <section aria-labelledby={notesId} className="grid max-w-[75ch] gap-1 leading-relaxed">
            <h4 id={notesId} className={HEADING}>
              {NOTES_TEXT.tube}
            </h4>
            <p>{tubeNote(data, tube)}</p>
          </section>
        )}
      </div>
    </section>
  )
}
