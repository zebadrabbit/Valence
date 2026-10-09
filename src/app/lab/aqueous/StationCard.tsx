import { useId, useMemo, type Ref } from 'react'
import { Disclosure, Sources } from '@/app/explore/InspectorCard'
import { ChoiceForm } from '@/app/lab/ChoiceForm'
import { Control } from '@/app/lab/Control'
import { Hazards } from '@/app/lab/Hazards'
import { ROLE } from '@/app/lab/roles'
import { BottleTile, Listed, Marked, Step } from '@/app/lab/stationPieces'
import type { AqueousData } from '@/chem-data/aqueous/data'
import { stationCitations } from '@/chem-data/citations'
import type { Source } from '@/chem-data/schema'
import { FORMS, checkEquation, isLook, usesShowing, wrongFields, type Action, type Blocked, type Look, type Observation, type StationView, type ToolUse } from '@/engine/aqueous'
import { EquationBuilder } from './EquationBuilder'
import { Line, useSaid } from '@/app/lab/Line'
import {
  BENCH_TEXT,
  FIELD_LABEL,
  LOOK_PART,
  PAGE_TEXT,
  PROGRESS_TEXT,
  STATE_KEY,
  STATION_TEXT,
  TOOL_LABEL,
  amountText,
  blockedText,
  choiceList,
  expectedLines,
  observationFeedback,
  observationRefusal,
  stationTitle,
  toolFirstText,
  toolOutcome,
} from './messages'
import { bottleLook, progressOf, tubeLook, type Progress } from './stationLook'
import { STACK, Tube } from './Tube'

/** Beside a station's progress in words, and hidden from a screen reader, which is given the words. */
export const PROGRESS_MARK: Record<Progress, string> = { 'not-started': '○', started: '◔', observed: '◑', done: '✓' }

/** A station's progress as a mark and its word; the tick of a station done is in the role of a done mark. */
export function ProgressLabel({ progress }: { progress: Progress }) {
  return (
    <Marked mark={PROGRESS_MARK[progress]} done={progress === 'done'}>
      {PROGRESS_TEXT[progress]}
    </Marked>
  )
}

export interface StationCardProps {
  data: AqueousData
  sources: readonly Source[]
  stationId: string
  view: StationView
  reducedMotion: boolean
  /** Why an action cannot be done now, or null; and the action done. The page's, so that the card holds no state of the lab. */
  can(action: Action): Blocked | null
  act(action: Action): void
  /** The station's heading, which takes focus when the station comes to be shown. */
  headingRef?: Ref<HTMLHeadingElement>
}

/**
 * One station, as a short column of steps, each a card: the tube, with its two reagents and Mix; once it is mixed,
 * the picture of it to explore, the tools and then the observations; and the three equations, which the engine
 * takes at any time. Nothing says what is seen in the tube but the part of the picture that is looked at, and each
 * of the eye's questions waits for its part. A card is
 * there only when the engine has a use for it, and a button on a card that cannot be used now stays focusable and
 * says why when pressed. The station's notes come once the station is done, under the equations, and its Sources
 * are at its foot.
 *
 * The card keeps what is chosen and built but not yet checked, and what its message lines last said; everything
 * the lab stores comes to it as `view` and leaves it through `act`.
 */
export function StationCard({ data, sources, stationId, view, reducedMotion, can, act, headingRef }: StationCardProps) {
  const station = data.stations.find((s) => s.id === stationId)!
  const number = data.stations.indexOf(station) + 1
  const headingId = useId()
  const placeId = useId()
  const seenId = useId()
  const heldId = useId()
  const [tubeSaid, sayOfTube] = useSaid()
  const [toolSaid, sayOfTool] = useSaid()
  const [lookSaid, sayOfLook] = useSaid()
  const progress = progressOf(view)
  // What the record alone fixes for a station, worked out once for the card's life and not at every press.
  const fixed = useMemo(() => ({ look: tubeLook(data, stationId), cited: stationCitations(data, stationId, sources) }), [data, stationId, sources])
  const mix: Action = { type: 'mix', stationId }
  // Whatever holds the whole lab holds every entry here. It is said once, at the station's head, and that sentence is the description of each entry's button.
  const completed = can(mix) === 'lab-completed' ? blockedText(data, mix, 'lab-completed') : null
  const held = completed === null ? null : heldId
  /** A press of a button of the tube or the tools: done, or refused with the engine's reason. */
  const press = (action: Action, say: typeof sayOfTube, done: string) => {
    const blocked = can(action)
    if (blocked !== null) return say(blockedText(data, action, blocked), true)
    act(action)
    say(done)
  }
  const tool = (use: ToolUse | 'sniff'): Action => ({ type: 'useTool', stationId, tool: use })
  // The eye's uses are made on the picture of the tube; the tools card has the rest.
  const tools = view.uses.filter((use) => !isLook(use))
  /** A part of the tube is looked at: stored the first time, where the engine takes it, and said each time. A completed lab stores nothing and can still be looked at. */
  const look = (part: Look) => {
    if (!view.used.includes(part) && can(tool(part)) === null) act(tool(part))
    sayOfLook(toolOutcome(data, stationId, part))
  }
  // Smelling the tube directly is offered where the engine answers it with the caution: where wafting is a tool.
  const sniffed = view.uses.includes('waft')

  return (
    <section aria-labelledby={headingId} className="grid min-w-0 gap-3">
      <div className="grid gap-1">
        <p id={placeId} className="text-xs text-muted-foreground">
          {STATION_TEXT.place(number, data.stations.length)}
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
          {view.done && (
            <>
              <span aria-hidden="true" className={ROLE.done}>
                ✓{' '}
              </span>
              {BENCH_TEXT.done}
            </>
          )}
        </p>
        {completed !== null && (
          <p id={heldId} className={`text-sm ${ROLE.held}`}>
            {completed}
          </p>
        )}
      </div>

      <Step heading={PAGE_TEXT.tube}>
        <div className="grid w-full gap-2 sm:grid-cols-2">
          {station.reagentIds.map((id, i) => {
            const reagent = data.reagents.find((r) => r.id === id)!
            // What it looks like before the mix: said in words, and for a coloured solution drawn in the bottle too.
            const bottle = bottleLook(data, id)
            return (
              <BottleTile
                key={id}
                name={reagent.name}
                lines={reagent.molarity === undefined ? [reagent.formula] : [reagent.formula, `${reagent.molarity} M`]}
                liquid={bottle.hex ?? undefined}
                rows={[
                  [PAGE_TEXT.looks, bottle.words],
                  [PAGE_TEXT.amount, amountText(station.amounts[i]!)],
                ]}
              >
                <Hazards classifiedAs={reagent.classifiedAs ?? reagent.name} hazards={reagent.hazards} sources={sources} solid={reagent.form !== 'solution'} />
              </BottleTile>
            )
          })}
        </div>
        {/* Until the tube is mixed the button is named for what a press does; from then for what is so, with a tick, as a step done is on the titration lab's shelf. */}
        <Control unavailable={can(mix) !== null} dimmed={!view.mixed && can(mix) !== null} variant={view.mixed ? 'secondary' : 'default'} className="min-h-11 px-4" onClick={() => press(mix, sayOfTube, '')}>
          {view.mixed ? (
            <span>
              <span aria-hidden="true" className={ROLE.done}>
                ✓{' '}
              </span>
              {BENCH_TEXT.mixed}
            </span>
          ) : (
            BENCH_TEXT.mix
          )}
        </Control>
        <div className="flex w-full flex-wrap items-start gap-4">
          {view.mixed && <Tube look={fixed.look} reducedMotion={reducedMotion} describedBy={seenId} uses={view.uses} used={view.used} seen={(part) => toolOutcome(data, stationId, part)} onLook={look} />}
          <div className="grid max-w-prose flex-1 basis-56 content-start gap-2">
            {/* What to do with the picture, said when the tube is mixed, and the picture's description. What is seen is not said here: a part says it when it is looked at. */}
            <p id={seenId} role="status">
              {view.mixed ? PAGE_TEXT.explore : BENCH_TEXT.notMixed}
            </p>
            {view.mixed && (
              <ul className="grid gap-1">
                {STACK.filter((part) => view.uses.includes(part)).map((part) => {
                  const looked = view.used.includes(part)
                  return (
                    <li key={part}>
                      <span aria-hidden="true" className={looked ? ROLE.done : undefined}>
                        {looked ? '✓' : '○'}{' '}
                      </span>
                      {LOOK_PART[part]}: {looked ? PAGE_TEXT.lookedAt : PAGE_TEXT.notLookedAt}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
        {/* What the part looked at shows, for a screen reader: the eye has the callout beside the part. */}
        <div className="sr-only">
          <Line said={lookSaid} />
        </div>
        <Line said={tubeSaid} />
      </Step>

      {view.mixed && tools.length > 0 && (
        <Step heading={PAGE_TEXT.tools}>
          <div className="flex flex-wrap gap-1.5">
            {tools.map((use) => (
              <Control key={use} unavailable={can(tool(use)) !== null} className="h-auto min-h-11 px-3 py-1 text-left whitespace-normal" onClick={() => press(tool(use), sayOfTool, toolOutcome(data, stationId, use))}>
                <span>
                  {view.used.includes(use) && (
                    <span aria-hidden="true" className={ROLE.done}>
                      ✓{' '}
                    </span>
                  )}
                  {TOOL_LABEL[use]}
                  {view.used.includes(use) && <span className="sr-only">, {PAGE_TEXT.used}</span>}
                </span>
              </Control>
            ))}
            {sniffed && (
              // Never done: the engine refuses it, and the refusal is the record's caution.
              <Control unavailable className="h-auto min-h-11 px-3 py-1 text-left whitespace-normal" dimmed={false} onClick={() => press(tool('sniff'), sayOfTool, '')}>
                {TOOL_LABEL.sniff}
              </Control>
            )}
          </div>
          <div className="max-w-prose">
            <Line said={toolSaid} />
          </div>
        </Step>
      )}

      {view.mixed && (
        <Step heading={PAGE_TEXT.observations}>
          <ChoiceForm
            // One question for each field the station's tools can show. One whose part of the tube has not been looked at, or whose tool has not been used yet, waits.
            questions={view.fields.map((field) => {
              const tools = usesShowing(station, field)
              return { id: field, label: FIELD_LABEL[field], choices: choiceList(data, field), waits: tools.length > 0 && !tools.some((use) => view.used.includes(use)) ? toolFirstText(tools) : null }
            })}
            recorded={view.observation}
            judged={view.wrongFields === null ? null : { wrong: view.wrongFields, text: observationFeedback(view.wrongFields) }}
            held={held}
            refusal={(observation: Observation) => {
              const blocked = can({ type: 'recordObservation', stationId, observation })
              return blocked === null ? null : observationRefusal(data, stationId, view.used, blocked)
            }}
            onRecord={(observation: Observation) => {
              act({ type: 'recordObservation', stationId, observation })
              const wrong = wrongFields(station, observation)
              return { wrong, text: observationFeedback(wrong) }
            }}
            text={{ check: PAGE_TEXT.checkObservations, change: PAGE_TEXT.change, cancel: PAGE_TEXT.cancel, again: PAGE_TEXT.lookAgain }}
          />
          {/* Under the questions and closed, so that the answers are not read before the tube is: in Guided from the start, in Challenge once the learner has recorded their own. */}
          {view.guidanceShown ? (
            <Disclosure summary={BENCH_TEXT.expected}>
              <Listed items={expectedLines(data, stationId)} />
            </Disclosure>
          ) : (
            <p className="max-w-prose text-muted-foreground">{PAGE_TEXT.challengeHidden}</p>
          )}
        </Step>
      )}

      <Step heading={PAGE_TEXT.equations}>
        {view.guidanceShown && (
          <div className="grid gap-1">
            <h4 className="font-medium">{BENCH_TEXT.hints}</h4>
            <Listed items={station.hints} />
          </div>
        )}
        <p className="text-muted-foreground">{STATE_KEY}</p>
        <div className="grid w-full gap-3">
          {FORMS.map((form) => (
            <EquationBuilder
              key={form}
              data={data}
              form={form}
              palette={station.paletteSpecies}
              judged={view.equations[form]}
              counts={view.template[form]}
              held={held}
              refusal={(entry) => {
                const action: Action = { type: 'enterEquation', stationId, form, entry }
                const blocked = can(action)
                if (blocked === null) return null
                // The one way the builder makes an entry the engine does not take: a side with nothing on it.
                return blocked === 'invalid-entry' && !entry.noReaction && (entry.reactants.length === 0 || entry.products.length === 0) ? PAGE_TEXT.incomplete : blockedText(data, action, blocked)
              }}
              onEnter={(entry) => {
                act({ type: 'enterEquation', stationId, form, entry })
                return checkEquation(data, station, form, entry)
              }}
            />
          ))}
        </div>
      </Step>

      {/* Once the station is done and not before: a note may name a product or give an equation outright, as the control's does. */}
      {view.done && station.notes.length > 0 && (
        <Step heading={BENCH_TEXT.notes}>
          <div className="grid max-w-[75ch] gap-2 leading-relaxed">
            {station.notes.map((note) => (
              <p key={note.value}>{note.value}</p>
            ))}
          </div>
        </Step>
      )}

      <Sources citations={fixed.cited} derived={PAGE_TEXT.sources} />
    </section>
  )
}
