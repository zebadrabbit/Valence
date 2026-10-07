import { useId, useMemo, type ReactNode, type Ref } from 'react'
import { Sources } from '@/app/explore/InspectorCard'
import { Control } from '@/app/lab/Control'
import { Hazards } from '@/app/lab/Hazards'
import { ROLE } from '@/app/lab/roles'
import { Bottle } from '@/app/lab/titration/apparatus'
import type { AqueousData } from '@/chem-data/aqueous/data'
import { stationCitations } from '@/chem-data/citations'
import type { Source } from '@/chem-data/schema'
import { FORMS, checkEquation, usesShowing, wrongFields, type Action, type Blocked, type StationView, type ToolUse } from '@/engine/aqueous'
import { EquationBuilder } from './EquationBuilder'
import { Line, useSaid } from './Line'
import {
  BENCH_TEXT,
  PAGE_TEXT,
  PROGRESS_TEXT,
  STATE_KEY,
  STATION_TEXT,
  TOOL_LABEL,
  amountText,
  blockedText,
  expectedLines,
  seenText,
  stationTitle,
  toolOutcome,
} from './messages'
import { ObservationForm } from './ObservationForm'
import { progressOf, tubeLook, type Progress } from './stationLook'
import { Tube } from './Tube'

/** Beside a station's progress in words, and hidden from a screen reader, which is given the words. */
export const PROGRESS_MARK: Record<Progress, string> = { 'not-started': '○', started: '◔', observed: '◑', done: '✓' }

/** A station's progress as a mark and its word; the tick of a station done is in the role of a done mark. */
export function ProgressLabel({ progress }: { progress: Progress }) {
  return (
    <>
      <span aria-hidden="true" className={progress === 'done' ? ROLE.done : undefined}>
        {PROGRESS_MARK[progress]}{' '}
      </span>
      {PROGRESS_TEXT[progress]}
    </>
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

/** One step of a station: a card named by its heading. */
function Step({ heading, children }: { heading: string; children: ReactNode }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="grid min-w-0 justify-items-start gap-3 rounded-lg border bg-card p-4 text-sm">
      <h3 id={headingId} className="text-base font-semibold">
        {heading}
      </h3>
      {children}
    </section>
  )
}

/** A short list under a small heading: the hints, what to expect, the notes. */
function Listed({ heading, items }: { heading: string; items: readonly string[] }) {
  return (
    <div className="grid max-w-[75ch] gap-1">
      <h4 className="font-medium">{heading}</h4>
      <ul className="grid list-disc gap-1 pl-5">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

/**
 * One station, as a short column of steps, each a card: the tube, with its two reagents and Mix; once it is mixed,
 * the tools and then the observations; and the three equations, which the engine takes at any time. A card is
 * there only when the engine has a use for it, and a button on a card that cannot be used now stays focusable and
 * says why when pressed. The station's notes come once its observation is correct, and its Sources are at its foot.
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
  const [tubeSaid, sayOfTube] = useSaid()
  const [toolSaid, sayOfTool] = useSaid()
  const progress = progressOf(view)
  // What the record alone fixes for a station, worked out once for the card's life and not at every press.
  const fixed = useMemo(() => ({ look: tubeLook(data, stationId), seen: seenText(data, stationId), cited: stationCitations(data, stationId, sources) }), [data, stationId, sources])
  const mix: Action = { type: 'mix', stationId }
  // Whatever holds the whole lab holds every entry here, and is said once under each entry's button.
  const completed = can(mix) === 'lab-completed' ? blockedText(data, mix, 'lab-completed') : null
  /** A press of a button of the tube or the tools: done, or refused with the engine's reason. */
  const press = (action: Action, say: typeof sayOfTube, done: string) => {
    const blocked = can(action)
    if (blocked !== null) return say(blockedText(data, action, blocked), true)
    act(action)
    say(done)
  }
  const tool = (use: ToolUse | 'sniff'): Action => ({ type: 'useTool', stationId, tool: use })
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
      </div>

      <Step heading={PAGE_TEXT.tube}>
        <div className="grid w-full gap-2 sm:grid-cols-2">
          {station.reagentIds.map((id, i) => {
            const reagent = data.reagents.find((r) => r.id === id)!
            return (
              <div key={id} role="group" aria-label={reagent.name} className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-2 rounded-md border p-2">
                <div className="h-20">
                  <Bottle lines={reagent.molarity === undefined ? [reagent.formula] : [reagent.formula, `${reagent.molarity} M`]} />
                </div>
                <div className="grid content-start justify-items-start gap-1.5">
                  <h4 className="font-medium">{reagent.name}</h4>
                  <p>
                    {PAGE_TEXT.amount}: <span className={ROLE.value}>{amountText(station.amounts[i]!)}</span>
                  </p>
                  <Hazards classifiedAs={reagent.classifiedAs ?? reagent.name} hazards={reagent.hazards} sources={sources} solid={reagent.form !== 'solution'} />
                </div>
              </div>
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
        <div className="flex flex-wrap items-center gap-4">
          {view.mixed && <Tube look={fixed.look} reducedMotion={reducedMotion} describedBy={seenId} />}
          {/* What is seen, in words: said when the tube is mixed, and the description of the drawing. */}
          <p id={seenId} role="status" className="max-w-prose flex-1 basis-64">
            {view.mixed ? fixed.seen : BENCH_TEXT.notMixed}
          </p>
        </div>
        <Line said={tubeSaid} />
      </Step>

      {view.mixed && view.uses.length > 0 && (
        <Step heading={PAGE_TEXT.tools}>
          <div className="flex flex-wrap gap-1.5">
            {view.uses.map((use) => (
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
          {view.guidanceShown ? <Listed heading={BENCH_TEXT.expected} items={expectedLines(data, stationId)} /> : <p className="max-w-prose text-muted-foreground">{PAGE_TEXT.challengeHidden}</p>}
          <ObservationForm
            data={data}
            view={view}
            shownBy={(field) => usesShowing(station, field)}
            held={completed}
            refusal={(observation) => {
              const action: Action = { type: 'recordObservation', stationId, observation }
              const blocked = can(action)
              return blocked === null ? null : blockedText(data, action, blocked)
            }}
            onRecord={(observation) => {
              act({ type: 'recordObservation', stationId, observation })
              return wrongFields(station, observation)
            }}
          />
        </Step>
      )}

      {view.wrongFields?.length === 0 && station.notes.length > 0 && (
        <Step heading={BENCH_TEXT.notes}>
          <div className="grid max-w-[75ch] gap-2 leading-relaxed">
            {station.notes.map((note) => (
              <p key={note.value}>{note.value}</p>
            ))}
          </div>
        </Step>
      )}

      <Step heading={PAGE_TEXT.equations}>
        {view.guidanceShown && <Listed heading={BENCH_TEXT.hints} items={station.hints} />}
        <p className="text-muted-foreground">{STATE_KEY}</p>
        <div className="grid w-full gap-3">
          {FORMS.map((form) => (
            <EquationBuilder
              key={form}
              data={data}
              form={form}
              palette={station.paletteSpecies}
              judged={view.equations[form]}
              held={completed}
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

      <Sources citations={fixed.cited} derived={PAGE_TEXT.sources} />
    </section>
  )
}
