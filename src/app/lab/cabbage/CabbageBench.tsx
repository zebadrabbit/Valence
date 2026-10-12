import { useEffect, useId, useMemo, useRef, useState, type ReactNode, type Ref } from 'react'
import { Disclosure, Sources } from '@/app/explore/InspectorCard'
import { ChoiceForm } from '@/app/lab/ChoiceForm'
import { Control } from '@/app/lab/Control'
import { Hazards } from '@/app/lab/Hazards'
import { Line, Mark, useSaid } from '@/app/lab/Line'
import { Paged } from '@/app/lab/Paged'
import { ROLE } from '@/app/lab/roles'
import { BottleTile, Listed, Marked } from '@/app/lab/stationPieces'
import { cabbageScaleCitations, cabbageThingCitations } from '@/chem-data/citations'
import { PART_IDS, THING_IDS, thingOf, type CabbageData, type PartId, type Reagent, type ThingId } from '@/chem-data/cabbage/data'
import type { Citation } from '@/chem-data/citations'
import type { Source } from '@/chem-data/schema'
import { benchView, can, rackView, sampleView, unitView, type Action, type CabbageModel, type CabbageState, type Outcome } from '@/engine/cabbage'
import {
  BLOCKED_TEXT,
  HAZARD_TEXT,
  LAB_TEXT,
  NOTES_TEXT,
  PAGE_TEXT,
  PART_AIM,
  RACK_TEXT,
  SCALE_HINT,
  SOURCES_TEXT,
  UNIT_TEXT,
  benchLines,
  countText,
  hazardsText,
  itemLabel,
  markText,
  partName,
  partNotes,
  partNumber,
  partOutcomeText,
  powerLabel,
  rackTubeText,
  scaleChoiceLabel,
  scaleQuestionText,
  thingName,
  unitQuestionText,
} from './messages'
import { opening, partStatus, thingStatus } from './pageLook'
import { Rack } from './Rack'
import { SampleCard } from './SampleCard'
import { CARD, HEADING, SHEET, Sheet } from './sheets'
import './cabbage.css'

export interface CabbageBenchProps {
  data: CabbageData
  m: CabbageModel
  sources: readonly Source[]
  state: CabbageState
  /** The actions done, in order, as one save. */
  act(...actions: Action[]): void
  /** The part and the thing shown when the bench mounts; where the stored record says the learner was, unless told. The markup tests draw the others with it. */
  opensAt?: { part: PartId; thing?: ThingId }
}

type Parts = Pick<CabbageBenchProps, 'data' | 'm' | 'sources' | 'state' | 'act'> & { headingRef: Ref<HTMLHeadingElement> }

/**
 * The Lab tab of the red cabbage pH lab: the line that says the lab is complete, the three parts to choose
 * between, and the part shown. One part is drawn at a time, and in the second one thing at a time. Changing part
 * or thing moves focus to the heading of what is shown. The part and the thing shown, what is chosen and not yet
 * recorded and what a line last said are the bench's and are not stored.
 */
export function CabbageBench({ data, m, sources, state, act, opensAt }: CabbageBenchProps) {
  const [start] = useState(() => ({ ...opening(m, state), ...opensAt }))
  const [part, setPart] = useState<PartId>(start.part)
  const [thing, setThing] = useState<ThingId>(start.thing)
  const [intro, setIntro] = useState(() => !benchView(m, state).thingsOpen)
  const heading = useRef<HTMLHeadingElement>(null)
  const status = partStatus(m, state)
  const shown = `${part}:${thing}`
  const was = useRef(shown)
  useEffect(() => {
    if (was.current !== shown) heading.current?.focus()
    was.current = shown
  }, [shown])
  const parts = { data, m, sources, state, act, headingRef: heading }

  return (
    <div className="grid gap-3">
      {/* Always there, and empty until the lab is complete, so that a screen reader says it when it comes; while it is empty it takes no room, the gap under it neither. */}
      <p role="status" className={`max-w-prose text-sm font-medium ${state.status === 'completed' ? '' : '-mb-3'}`}>
        {state.status === 'completed' && (
          <Marked mark="✓" done>
            {LAB_TEXT.completed}
          </Marked>
        )}
      </p>
      {/* What the lab is, over a lab that is not begun, until another part is chosen: it does not go at the first press, which would move the rack from under the hand. */}
      {intro && <p className="max-w-prose text-sm">{LAB_TEXT.aim}</p>}
      {/* Three to a row at every width the bench has, each as wide as its words ask and a share of what is left, so that the longest name stands in one line on an upright tablet. */}
      <nav aria-label={PAGE_TEXT.parts} className="flex gap-1.5 text-sm">
        {PART_IDS.map((partId) => (
          <button
            key={partId}
            type="button"
            aria-current={partId === part ? 'true' : undefined}
            onClick={() => {
              setPart(partId)
              setIntro(false)
              // The part already shown: its heading takes focus all the same.
              if (partId === part) heading.current?.focus()
            }}
            className="group grid min-h-11 flex-auto content-start rounded-md border border-l-4 px-2 py-1 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring aria-[current]:border-foreground aria-[current]:bg-muted aria-[current]:font-medium"
          >
            {/* The number and the progress are grey on the page's ground, and the text's own colour on the grey ground of the part shown or under the pointer, as in the other labs' lists. */}
            <span className="text-xs font-normal text-muted-foreground group-hover:text-foreground group-aria-[current]:text-foreground">{partNumber(partId)}</span>
            <span>{partName(data, partId)}</span>
            <span className="text-xs font-normal text-muted-foreground group-hover:text-foreground group-aria-[current]:text-foreground">
              <Marked mark={status[partId].mark} done={status[partId].done}>
                {status[partId].text}
              </Marked>
            </span>
          </button>
        ))}
      </nav>
      {part === 'scale' && <ScalePart {...parts} />}
      {part === 'things' && <ThingsPart {...parts} thing={thing} onThing={setThing} />}
      {part === 'unit' && <UnitPart {...parts} />}
    </div>
  )
}

/** The head of a part: which part it is and how it stands, and its name, which takes focus when the part comes to be shown. */
function PartHead({ data, part, status, headingId, headingRef }: { data: CabbageData; part: PartId; status: { mark: string; text: string; done: boolean }; headingId: string; headingRef: Ref<HTMLHeadingElement> }) {
  const placeId = useId()
  return (
    <div className="grid gap-1">
      <p id={placeId} className="text-xs text-muted-foreground">
        {partNumber(part)}
        {' · '}
        <span className="font-medium text-foreground">
          <Marked mark={status.mark} done={status.done}>
            {status.text}
          </Marked>
        </span>
      </p>
      <h2 ref={headingRef} id={headingId} tabIndex={-1} aria-describedby={placeId} className="w-fit rounded-sm text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {partName(data, part)}
      </h2>
    </div>
  )
}

/**
 * How a part's questions came out, the check where it is still to be asked for, the way to answer them again, and
 * once the part is done its notes, shown outright. Guided checks a part by itself as its last question is answered,
 * so the check is there in Challenge, and in Guided only for answers that were all given in Challenge. Focus goes
 * here when the check is made and its button goes.
 */
function PartEnd({ data, part, outcome, notesShown, check, again, text, press }: { data: CabbageData; part: PartId; outcome: Outcome; notesShown: boolean; check: Action; again: Action; text: { check: string; again: string }; press(action: Action): void }) {
  const notesId = useId()
  const ref = useRef<HTMLDivElement>(null)
  const over = outcome.state === 'counts' || outcome.state === 'does-not-count'
  const wasOver = useRef(over)
  useEffect(() => {
    if (over && !wasOver.current) {
      if (document.activeElement === document.body) ref.current?.focus()
      else ref.current?.scrollIntoView({ block: 'nearest' })
    }
    wasOver.current = over
  }, [over])
  return (
    <div ref={ref} tabIndex={-1} className={`grid justify-items-start gap-2 rounded-lg text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring ${outcome.state === 'open' ? '' : 'border bg-card p-3'}`}>
      {/* Always there, and empty until every question is answered, so that a screen reader says it when it comes. */}
      <p role="status" className="max-w-prose font-medium">
        {outcome.state !== 'open' && (
          <>
            {over && <Mark ok={outcome.state === 'counts'} />}
            {partOutcomeText(outcome)}
          </>
        )}
      </p>
      {outcome.state === 'to-check' && (
        <Control unavailable={false} className="min-h-11" onClick={() => press(check)}>
          {text.check}
        </Control>
      )}
      {outcome.state === 'does-not-count' && (
        <Control unavailable={false} className="min-h-11" onClick={() => press(again)}>
          {text.again}
        </Control>
      )}
      {notesShown && (
        <section aria-labelledby={notesId} className="grid max-w-[75ch] gap-2 leading-relaxed">
          <h3 id={notesId} className={HEADING}>
            {NOTES_TEXT.part}
          </h3>
          {partNotes(data, part).map((note) => (
            <p key={note}>{note}</p>
          ))}
        </section>
      )}
    </div>
  )
}

/** An answer that has been checked, as a line: the question, what was answered, and the mark, for the eye and in words. */
function CheckedLine({ question, answer, right }: { question: string; answer: string; right: boolean | null }) {
  return (
    <li>
      {right !== null && <Mark ok={right} />}
      {question} <span className="font-medium">{answer}</span>
      {right !== null && <span className="sr-only"> {markText(right)}</span>}
    </li>
  )
}

/** Under a part or a thing: its sources, closed, and the bench. The two are lines of words with a hit area a finger tall laid over each, and stand 36 px apart and 16 px under what is over them, so that no area lies over another control. */
function Foot({ data, sources, cited, thing }: { data: CabbageData; sources: readonly Source[]; cited: readonly Citation[]; thing?: ThingId }) {
  return (
    <div className="mt-4 grid gap-9 text-sm">
      <Sources citations={cited} derived={SOURCES_TEXT} />
      <Disclosure summary={PAGE_TEXT.bench}>
        <Bench data={data} sources={sources} thing={thing} />
      </Disclosure>
    </div>
  )
}

/** What a bottle's label carries, in two lines at the most: for a buffer its pH, for the indicator what it is, and for the others the words of its name. */
export const labelLines = (reagent: Pick<Reagent, 'name' | 'form'>): string[] => {
  const ph = /pH \d+/.exec(reagent.name)
  return ph ? ['Buffer', ph[0]] : reagent.form === 'indicator' ? ['Indicator'] : reagent.name.split(' ').slice(0, 2)
}

/**
 * The bench, one place that every part and every thing has: what stands on it, in words; a tile with its hazards,
 * closed, for each of the seven bottles that are laboratory chemicals; and the one note that everything else on
 * the bench shares (spec 21.4), under the name of the thing shown where that thing is one of them.
 */
function Bench({ data, sources, thing }: { data: CabbageData; sources: readonly Source[]; thing?: ThingId | undefined }) {
  const own = thing === undefined ? null : hazardsText(data, thingOf(data, thing))
  return (
    <div className="grid gap-3">
      <Listed items={benchLines(data)} />
      <h3 className="font-medium">{HAZARD_TEXT.heading}</h3>
      {/* Two to a row where the bench has the width for a tile's hazards to be read beside its bottle. */}
      <div className="grid w-full gap-2 @2xl:grid-cols-2">
        {data.reagents.map((reagent) => (
          <BottleTile key={reagent.id} name={reagent.name} lines={labelLines(reagent)} rows={[]}>
            <p>{reagent.holds}</p>
            <Hazards classifiedAs={reagent.classifiedAs} hazards={reagent.hazards} sources={sources} />
          </BottleTile>
        ))}
      </div>
      <div className="grid max-w-prose gap-1 rounded-md border p-2">
        <h4 className="font-medium">{thing !== undefined && own?.shared ? thingName(data, thing) : HAZARD_TEXT.others}</h4>
        <p>{hazardsText(data, {}).text}</p>
      </div>
    </div>
  )
}

/**
 * Part 1: the rack of thirteen buffers, in order, each labelled with its pH; the one action, which puts the
 * indicator into all thirteen; and, once the rack has been looked along, its three questions as choices. Until
 * the indicator is in every tube is drawn with no colour. A look at a tube says its colour in words; the whole
 * rack in words is in a disclosure that is closed, since it says all of what the rack shows.
 */
function ScalePart({ data, m, sources, state, act, headingRef }: Parts) {
  const headingId = useId()
  const exploreId = useId()
  const rack = rackView(m, state)
  const guided = state.mode === 'guided'
  const [said, say] = useSaid()
  // What the part asks for stands over a rack that is not made, and stays while the part is shown: nothing over the rack goes at a press.
  const [intro] = useState(() => !rack.indicator)
  const fill: Action = { type: 'fillRack' }
  const cited = useMemo(() => cabbageScaleCitations(data, sources), [data, sources])
  const press = (action: Action) => {
    const blocked = can(m, state, action)
    if (blocked !== null) return say(BLOCKED_TEXT[blocked], true)
    say('')
    act(action)
  }
  const label = (id: string, answer: string | number) => {
    const question = rack.questions.find((q) => q.id === id)!
    return scaleChoiceLabel(question, question.kind === 'same-colour-pair' ? Number(answer) : answer)
  }

  return (
    <section aria-labelledby={headingId} className="cabbage-part grid min-w-0 gap-2">
      <PartHead data={data} part="scale" status={partStatus(m, state).scale} headingId={headingId} headingRef={headingRef} />
      {intro && <p className="max-w-prose text-sm">{PART_AIM.scale}</p>}
      <div className={CARD}>
        <div className={SHEET}>
          <Rack
            name={RACK_TEXT.heading}
            describedBy={exploreId}
            tubes={rack.tubes}
            onLook={() => {
              // The first look along the rack that has the indicator in is stored: it opens the questions.
              if (can(m, state, { type: 'lookRack' }) === null) act({ type: 'lookRack' })
            }}
          />
          <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2">
            <Control unavailable={can(m, state, fill) !== null} dimmed={false} variant={rack.indicator ? 'secondary' : 'outline'} className="h-auto min-h-11 max-w-full shrink px-3 py-1 text-left whitespace-normal" onClick={() => press(fill)}>
              <span>
                {rack.indicator && (
                  <span aria-hidden="true" className={ROLE.done}>
                    ✓{' '}
                  </span>
                )}
                {RACK_TEXT.fill}
              </span>
            </Control>
            <p role="status" className="max-w-prose flex-1 basis-48 font-medium">
              {!rack.indicator ? RACK_TEXT.before : rack.looked ? '' : RACK_TEXT.filled}
            </p>
          </div>
          {/* How the rack is looked at: for everyone until it has been looked along, and after that the rack's description, not drawn, so that the question in hand has the room. */}
          <p id={exploreId} className={rack.looked ? 'sr-only' : 'max-w-prose text-xs text-muted-foreground'}>
            {RACK_TEXT.explore}
          </p>
          <div className={said.text === '' ? '-mt-2' : undefined}>
            <Line said={said} />
          </div>
          <div className="pt-4 pb-1">
            {/* Closed: the whole of what the rack shows, which the learner is to find by looking. */}
            <Disclosure summary={PAGE_TEXT.rackInWords}>
              <ol className="grid gap-0.5">
                {rack.tubes.map((tube) => (
                  <li key={tube.ph}>{rackTubeText(tube.ph, tube.shows)}</li>
                ))}
              </ol>
            </Disclosure>
          </div>
        </div>
      </div>

      {/* There once the rack has been looked along: the rack is what the three are answered from. */}
      {rack.looked && (
        <div className={CARD}>
          <Sheet heading={RACK_TEXT.questions}>
            {rack.answersOpen ? (
              // One question at a time: each is drawn once the one before it is answered, is recorded by itself, and folds to a line beside "Change", so that the rack and the question in hand stand in one window.
              rack.questions.map(
                (q, at) =>
                  rack.questions.slice(0, at).every((before) => before.answer !== null) && (
                    <div key={q.id} className="grid w-full justify-items-start gap-2">
                      <ChoiceForm
                        // A form of its own for each mode and each time the three are answered again.
                        key={`${state.mode}:${rack.tries}`}
                        questions={[
                          {
                            id: q.id,
                            label: scaleQuestionText(q),
                            choices: q.choices.map((choice) => ({
                              value: String(choice),
                              label: scaleChoiceLabel(q, choice),
                            })),
                            waits: null,
                          },
                        ]}
                        recorded={q.answer === null ? null : { [q.id]: String(q.answer) }}
                        // Challenge says nothing of an answer until the three are checked. Guided takes only what is right, but for an answer recorded in Challenge before the mode was changed: that one is held to the rack.
                        judged={
                          q.answer === null
                            ? null
                            : {
                                wrong: q.right === false ? [q.id] : [],
                                text: q.right === false ? BLOCKED_TEXT['not-right'] : '',
                              }
                        }
                        held={null}
                        refusal={(answers) => (answers[q.id] === undefined ? BLOCKED_TEXT['not-all-answered'] : null)}
                        onRecord={(answers) => {
                          const action: Action = {
                            type: 'answerScale',
                            question: q.id,
                            is: q.kind === 'same-colour-pair' ? Number(answers[q.id]) : answers[q.id]!,
                          }
                          const blocked = can(m, state, action)
                          // That the answer is not right is said, and never what it should be.
                          if (blocked !== null)
                            return {
                              wrong: [q.id],
                              text: BLOCKED_TEXT[blocked],
                            }
                          act(action)
                          return { wrong: [], text: '' }
                        }}
                        text={{
                          check: RACK_TEXT.record,
                          change: PAGE_TEXT.change,
                          cancel: PAGE_TEXT.cancel,
                        }}
                        brief={(answers) => [`${scaleQuestionText(q)} ${label(q.id, answers[q.id]!)}`]}
                      />
                      {/* Closed, and Guided's alone, under the question that is open: where to look, and never the answer. */}
                      {guided && q.answer === null && (
                        <div className="pt-4 pb-1">
                          <Disclosure summary={RACK_TEXT.hint}>
                            <p className="max-w-prose">{SCALE_HINT[q.id]}</p>
                          </Disclosure>
                        </div>
                      )}
                    </div>
                  ),
              )
            ) : (
              <ul className="grid gap-1">
                {rack.questions.map((q) => (
                  <CheckedLine key={q.id} question={scaleQuestionText(q)} answer={q.answer === null ? '' : scaleChoiceLabel(q, q.answer)} right={q.right} />
                ))}
              </ul>
            )}
          </Sheet>
        </div>
      )}
      <PartEnd data={data} part="scale" outcome={rack.outcome} notesShown={rack.notesShown} check={{ type: 'checkScale' }} again={{ type: 'againScale' }} text={{ check: RACK_TEXT.check, again: RACK_TEXT.again }} press={press} />
      <Foot data={data} sources={sources} cited={cited} />
    </section>
  )
}

/**
 * Part 2: the fourteen household things, one at a time out of the shared paged list. The list names each thing
 * with how it stands in words beside a mark, and under it how many count of the eight the part needs. Until the
 * rack is made there is nothing to judge a thing against, and the part says so.
 */
function ThingsPart({ data, m, sources, state, act, headingRef, thing, onThing }: Parts & { thing: ThingId; onThing(thing: ThingId): void }) {
  const headingId = useId()
  const bench = benchView(m, state)
  const index = THING_IDS.indexOf(thing)
  const cited = useMemo(() => cabbageThingCitations(data, thing, sources), [data, thing, sources])
  const views = THING_IDS.map((id) => sampleView(m, state, id))
  const focused = useRef<HTMLHeadingElement | null>(null)
  const [introAt] = useState(() => (views.every((view) => !view.indicator && view.tries === 0) ? thing : null))
  if (!bench.thingsOpen) {
    return (
      <section aria-labelledby={headingId} className="grid min-w-0 gap-2">
        <PartHead data={data} part="things" status={partStatus(m, state).things} headingId={headingId} headingRef={headingRef} />
        <p className="max-w-prose text-sm">{PART_AIM.things}</p>
        <p className={`max-w-prose text-sm ${ROLE.held}`}>{BLOCKED_TEXT['rack-not-made']}</p>
        <Foot data={data} sources={sources} cited={cited} thing={thing} />
      </section>
    )
  }
  return (
    <Paged
      items={views.map((view) => {
        const status = thingStatus(view)
        return {
          id: view.id,
          heading: thingName(data, view.id),
          note: (
            <Marked mark={status.mark} done={status.done}>
              {status.text}
            </Marked>
          ),
        }
      })}
      index={index}
      onGo={(to) => {
        onThing(THING_IDS[to]!)
        // The thing already shown: its heading takes focus all the same, as the list is closed under it.
        if (to === index) focused.current?.focus()
      }}
      text={{
        list: PAGE_TEXT.choose,
        previous: PAGE_TEXT.previous,
        next: PAGE_TEXT.next,
      }}
      // A sample's two columns need more room than a primer's card: the list stays behind its button for longer.
      roomy
      after={<Foot data={data} sources={sources} cited={cited} thing={thing} />}
    >
      {/* Over the first thing shown while none is begun, and there until another is shown: what the part asks for. It does not go at the first press, which would move the tube from under the hand. */}
      {introAt === thing && <p className="max-w-prose text-sm">{PART_AIM.things}</p>}
      <SampleCard
        // A card of its own for each thing, each fresh tube of it and each mode: nothing chosen or said in the one before is carried over.
        key={`${thing}:${views[index]!.tries}:${state.mode}`}
        data={data}
        m={m}
        state={state}
        thing={thing}
        act={act}
        headingRef={(element) => {
          focused.current = element
          if (typeof headingRef === 'function') headingRef(element)
          else if (headingRef) headingRef.current = element
        }}
      />
      {/* Under the sample, so that the tube and the scale stay where they were: always there, and empty until eight count, so that a screen reader says it when it comes. */}
      <p role="status" className="max-w-prose text-sm font-medium empty:hidden">
        {bench.thingsDone && (
          <Marked mark="✓" done>
            {countText(bench)}
          </Marked>
        )}
      </p>
    </Paged>
  )
}

/**
 * Part 3: the two questions on what a unit means, each with the two readings it is drawn from in its own words,
 * and each answered from choices: which of the two holds more hydrogen ion, and how many times more. Each is
 * recorded by itself and folds to a line beside "Change". Until eight things count the part says what opens it.
 */
function UnitPart({ data, m, sources, state, act, headingRef }: Parts) {
  const headingId = useId()
  const unit = unitView(m, state)
  const guided = state.mode === 'guided'
  const [said, say] = useSaid()
  // What the part asks for, while nothing is answered, and then for as long as the part is shown.
  const [intro] = useState(() => !unit.questions.some((q) => q.answer !== null))
  const cited = useMemo(() => cabbageScaleCitations(data, sources), [data, sources])
  const press = (action: Action) => {
    const blocked = can(m, state, action)
    if (blocked !== null) return say(BLOCKED_TEXT[blocked], true)
    say('')
    act(action)
  }
  const answerLine = (q: (typeof unit.questions)[number], more: number, power: number) => `${itemLabel(data, q.items[more]!)}, ${powerLabel(power)}`
  let body: ReactNode = <p className={`max-w-prose text-sm ${ROLE.held}`}>{UNIT_TEXT.closed}</p>
  if (unit.open) {
    body = unit.answersOpen ? (
      <>
        {unit.questions.map(
          (q, at) =>
            // One question at a time: the second is drawn once the first is answered.
            unit.questions.slice(0, at).every((before) => before.answer !== null) && (
              <div key={at} className={CARD}>
                <div className={SHEET}>
                  <ChoiceForm
                    key={`${state.mode}:${unit.tries}`}
                    questions={[
                      {
                        id: 'more',
                        label: `${unitQuestionText(data, q)} ${UNIT_TEXT.more}`,
                        choices: q.items.map((item, k) => ({
                          value: String(k),
                          label: itemLabel(data, item),
                        })),
                        waits: null,
                      },
                      {
                        id: 'power',
                        label: UNIT_TEXT.times,
                        choices: unit.powers.map((power) => ({
                          value: String(power),
                          label: powerLabel(power),
                        })),
                        waits: null,
                      },
                    ]}
                    recorded={
                      q.answer === null
                        ? null
                        : {
                            more: String(q.answer.more),
                            power: String(q.answer.power),
                          }
                    }
                    // Challenge says nothing of an answer until the two are checked. Guided takes only what is right, but for an answer recorded in Challenge before the mode was changed.
                    judged={
                      q.answer === null
                        ? null
                        : {
                            wrong: q.right === false ? ['more', 'power'] : [],
                            text: q.right === false ? BLOCKED_TEXT['not-right'] : '',
                          }
                    }
                    held={null}
                    refusal={(answers) => (answers.more === undefined || answers.power === undefined ? BLOCKED_TEXT['not-all-answered'] : null)}
                    onRecord={(answers) => {
                      const action: Action = {
                        type: 'answerUnit',
                        question: at as 0 | 1,
                        answer: {
                          more: Number(answers.more) as 0 | 1,
                          power: Number(answers.power),
                        },
                      }
                      const blocked = can(m, state, action)
                      // That the answer is not right is said, and never which of its two halves.
                      if (blocked !== null)
                        return {
                          wrong: ['more', 'power'],
                          text: BLOCKED_TEXT[blocked],
                        }
                      act(action)
                      return { wrong: [], text: '' }
                    }}
                    text={{
                      check: UNIT_TEXT.record,
                      change: PAGE_TEXT.change,
                      cancel: PAGE_TEXT.cancel,
                    }}
                    brief={(answers) => [`${unitQuestionText(data, q)} ${answerLine(q, Number(answers.more), Number(answers.power))}`]}
                  />
                </div>
              </div>
            ),
        )}
        {guided && (
          <div className="pt-4 pb-1 text-sm">
            <Disclosure summary={UNIT_TEXT.hint}>
              <p className="max-w-prose">{UNIT_TEXT.hintText}</p>
            </Disclosure>
          </div>
        )}
      </>
    ) : (
      <div className={CARD}>
        <div className={SHEET}>
          <ul className="grid gap-1">
            {unit.questions.map((q, at) => (
              <CheckedLine key={at} question={unitQuestionText(data, q)} answer={q.answer === null ? '' : answerLine(q, q.answer.more, q.answer.power)} right={q.right} />
            ))}
          </ul>
        </div>
      </div>
    )
  }

  return (
    <section aria-labelledby={headingId} className="cabbage-part grid min-w-0 gap-2">
      <PartHead data={data} part="unit" status={partStatus(m, state).unit} headingId={headingId} headingRef={headingRef} />
      {intro && <p className="max-w-prose text-sm">{PART_AIM.unit}</p>}
      {body}
      <div className={said.text === '' ? '-mt-2' : 'text-sm'}>
        <Line said={said} />
      </div>
      {unit.open && <PartEnd data={data} part="unit" outcome={unit.outcome} notesShown={unit.notesShown} check={{ type: 'checkUnit' }} again={{ type: 'againUnit' }} text={{ check: UNIT_TEXT.check, again: UNIT_TEXT.again }} press={press} />}
      {state.status !== 'completed' && <p className="max-w-prose text-sm text-muted-foreground">{LAB_TEXT.complete}</p>}
      <Foot data={data} sources={sources} cited={cited} />
    </section>
  )
}
