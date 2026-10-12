import { useEffect, useId, useRef, useState, type Ref } from 'react'
import { Disclosure } from '@/app/explore/InspectorCard'
import { CHOICE } from '@/app/lab/ChoiceForm'
import { Control } from '@/app/lab/Control'
import { Line, Mark, useSaid } from '@/app/lab/Line'
import { ROLE } from '@/app/lab/roles'
import { Marked } from '@/app/lab/stationPieces'
import { Tube } from '@/app/lab/Tube'
import { TUBE_HEIGHT, tubeLayers } from '@/app/lab/tubeDrawing'
import { thingOf, type CabbageData, type ThingId } from '@/chem-data/cabbage/data'
import { Button } from '@/components/ui/button'
import { CANNOT_SAY, CLASSES, benchView, can, meterView, rackView, sampleView, type Action, type CabbageModel, type CabbageState, type Class, type Estimate } from '@/engine/cabbage'
import {
  BLOCKED_TEXT,
  CLASS_LABEL,
  GUIDED_TEXT,
  KIND_LABEL,
  NOTES_TEXT,
  ON_BENCH,
  PAGE_TEXT,
  RACK_TEXT,
  RECORD_TEXT,
  SAMPLE_HINT,
  SAMPLE_TEXT,
  byEyeLine,
  countShort,
  markText,
  meterText,
  partNumber,
  phText,
  probeWarning,
  readingText,
  sampleOutcomeText,
  thingNote,
  tubeText,
} from './messages'
import { attempt, thingStatus } from './pageLook'
import { Rack } from './Rack'
import { CARD, HEADING, SHEET, Sheet } from './sheets'

/** Where the straight part of the glass ends and its round foot begins, in the picture's units (Tube.tsx). */
const STRAIGHT = TUBE_HEIGHT - 64

export interface SampleCardProps {
  data: CabbageData
  m: CabbageModel
  state: CabbageState
  thing: ThingId
  /** The actions done, in order, as one save. */
  act(...actions: Action[]): void
  /** The thing's heading, which takes focus when the thing comes to be shown. */
  headingRef?: Ref<HTMLHeadingElement>
}

/**
 * One household thing, in the order it is worked (spec 21.2). The tube, to explore, with the one action, adding
 * the indicator: a look at the liquid says what is seen in words, and nothing else on the page does. The scale,
 * small, straight under the tube or beside it, so that the two are compared without scrolling: by eye, the tube of
 * the scale the sample is nearest is chosen by pressing that tube, or the choice that the indicator cannot say,
 * and then acid, neutral or basic; the two are recorded with one button, changed until the meter is read, and fold
 * to a line beside "Change". Then the meter: the probe is rinsed and read, and the reading stands large. Guided's
 * warning before an unrinsed probe reads is a line over the two buttons, which are its two ways on: the engine
 * holds the warning in the record, so it is there again after a reload. Last, how the sample came out, and once it
 * counts its note.
 *
 * Nothing here says a thing's pH before the meter is read in it: the card draws from the engine's views, which hand
 * a pH over only as a reading. The card keeps what is chosen and not yet recorded and what its lines last said;
 * everything the lab stores leaves it through `act`.
 */
export function SampleCard({ data, m, state, thing, act, headingRef }: SampleCardProps) {
  const headingId = useId()
  const placeId = useId()
  const exploreId = useId()
  const tubeId = useId()
  const scaleId = useId()
  const pickId = useId()
  const notesId = useId()
  const radios = useId()
  const view = sampleView(m, state, thing)
  const rack = rackView(m, state)
  const meter = meterView(state)
  const record = thingOf(data, thing)
  const guided = state.mode === 'guided'
  const status = thingStatus(view)
  const [tubeSaid, sayOfTube] = useSaid()
  const [lookSaid, sayOfLook] = useSaid()
  const [eyeSaid, sayOfEye] = useSaid()
  const [meterSaid, sayOfMeter] = useSaid()
  const [draft, setDraft] = useState<{ estimate: Estimate | null; is: Class | null }>({ estimate: view.estimate, is: view.is })
  const [changing, setChanging] = useState(false)
  const recordRef = useRef<HTMLButtonElement>(null)
  const changeRef = useRef<HTMLButtonElement>(null)
  const outcomeRef = useRef<HTMLDivElement>(null)

  /** The estimate by eye is whole: a tube with acid, neutral or basic, or that the indicator cannot say. */
  const estimated = view.estimate !== null && (!view.classAsked || view.is !== null)
  const editing = view.estimateOpen && (!estimated || changing)
  const over = view.outcome.state === 'counts' || view.outcome.state === 'does-not-count'

  // Focus is never left on the page: the button that records goes when the estimate is recorded, and "Change" when it is pressed; the check's button goes when the check is made, and focus goes to how the sample came out, which is brought into view whoever made it.
  const wasEditing = useRef(editing)
  const wasOver = useRef(over)
  useEffect(() => {
    if (wasEditing.current !== editing && document.activeElement === document.body) (editing ? recordRef : changeRef).current?.focus()
    wasEditing.current = editing
    if (over && !wasOver.current) {
      if (document.activeElement === document.body) outcomeRef.current?.focus()
      else outcomeRef.current?.scrollIntoView({ block: 'nearest' })
    }
    wasOver.current = over
  }, [editing, over])

  const press = (action: Action, say: (text: string, held?: boolean) => void) => {
    const blocked = can(m, state, action)
    if (blocked !== null) return say(BLOCKED_TEXT[blocked], true)
    say('')
    act(action)
  }
  /** The liquid is looked at: stored the first time the engine takes it, and said each time. Before the indicator is in, the look is of the thing as it is, and stores nothing. */
  const look = () => {
    const action: Action = { type: 'look', thing }
    if (can(m, state, action) === null) act(action)
    sayOfLook(tubeText(view.shows))
  }
  const pick = (estimate: Estimate) => {
    // Until the sample has been looked at there is nothing to choose by, and the card says so. Once the estimate is recorded, a press on a tube is a look at it: "Change" opens the choice again.
    if (!view.estimateOpen) return view.reading === null ? sayOfEye(BLOCKED_TEXT[view.indicator ? 'not-looked' : 'no-indicator'], true) : undefined
    if (!editing) return
    setDraft({ estimate, is: estimate === CANNOT_SAY ? null : draft.is })
    sayOfEye('')
  }
  const recordByEye = () => {
    if (draft.estimate === null) return sayOfEye(BLOCKED_TEXT['no-estimate'], true)
    if (draft.estimate !== CANNOT_SAY && draft.is === null) return sayOfEye(BLOCKED_TEXT['no-class'], true)
    const actions: Action[] = [{ type: 'estimate', thing, is: draft.estimate }, ...(draft.is === null ? [] : [{ type: 'classify' as const, thing, is: draft.is }])]
    // Guided takes an estimate that is near enough and then judges acid, neutral or basic against it: one that is not taken stops there.
    const { done, refused } = attempt(m, state, actions)
    if (done.length > 0) act(...done)
    if (refused !== null) return sayOfEye(BLOCKED_TEXT[refused], true)
    setChanging(false)
    sayOfEye(guided ? (draft.estimate === CANNOT_SAY ? GUIDED_TEXT.cannotSayRight : GUIDED_TEXT.estimateRight) : '')
  }

  const layers = tubeLayers(view.shows, m.sampleMicrolitres + m.indicatorMicrolitres)
  const drawn = layers.liquid && view.shows.liquid?.cloudy ? { ...layers, liquid: { ...layers.liquid, cloudy: true } } : layers
  const add: Action = { type: 'addIndicator', thing }
  const rinse: Action = { type: 'rinse' }
  const read: Action = { type: 'read', thing }
  const judged = view.estimateRight !== null
  const right = view.estimateRight === true && view.classRight !== false
  const warned = view.warning && meter.lastIn !== null

  return (
    <section aria-labelledby={headingId} className="grid min-w-0 gap-2">
      <div className="grid gap-1">
        <p id={placeId} className="text-xs text-muted-foreground">
          {partNumber('things')}
          {' · '}
          {countShort(benchView(m, state))}
          {' · '}
          <span className="font-medium text-foreground">
            <Marked mark={status.mark} done={status.done}>
              {status.text}
            </Marked>
          </span>
          {view.tries > 0 && ` · ${RECORD_TEXT.tries(view.tries)}`}
        </p>
        <h2 ref={headingRef} id={headingId} tabIndex={-1} aria-describedby={placeId} className="w-fit rounded-sm text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {record.name}
        </h2>
        <p className="max-w-prose text-sm">
          {KIND_LABEL[record.kind]}. {ON_BENCH[record.onBench]}
        </p>
      </div>
      {/* What the liquid looked at shows, for a screen reader: the eye has the callout beside it. */}
      <div className="sr-only">
        <Line said={lookSaid} />
      </div>

      <div className="cabbage-work cabbage-part">
        <div className="cabbage-grid">
          <section aria-labelledby={tubeId} className={`cabbage-tube ${CARD}`}>
            <div className={SHEET}>
              {/* The heading is first in the page, and stands beside the picture where the card has the room for that (cabbage.css). */}
              <div className="cabbage-tube-grid w-full">
                <h3 id={tubeId} className={`cabbage-tube-head ${HEADING}`}>
                  {SAMPLE_TEXT.tube}
                </h3>
                <Tube
                  name={PAGE_TEXT.tubePicture(record.name)}
                  describedBy={exploreId}
                  height={TUBE_HEIGHT}
                  layers={drawn}
                  words={{ liquid: PAGE_TEXT.liquidLayer, solid: PAGE_TEXT.solidLayer }}
                  // One part to look at, since the engine has one look for a tube: the liquid, from a little over its surface down to where the glass begins to round. What the look says is the whole tube, a solid under the liquid too.
                  sections={[{ part: 'liquid', top: (drawn.liquid?.surface ?? STRAIGHT - 58) - 12, bottom: STRAIGHT, name: `${SAMPLE_TEXT.look}${view.looked ? `, ${PAGE_TEXT.looked}` : ''}`, looked: view.looked }]}
                  seen={() => tubeText(view.shows)}
                  onLook={look}
                />
                <div className="cabbage-tube-beside grid content-start justify-items-start gap-2">
                  <Control
                    unavailable={can(m, state, add) !== null}
                    dimmed={can(m, state, add) !== null && !view.indicator}
                    variant={view.indicator ? 'secondary' : 'outline'}
                    className="h-auto min-h-11 max-w-full shrink px-3 py-1 text-left whitespace-normal"
                    onClick={() => press(add, sayOfTube)}
                  >
                    <span>
                      {view.indicator && (
                        <span aria-hidden="true" className={ROLE.done}>
                          ✓{' '}
                        </span>
                      )}
                      {SAMPLE_TEXT.addIndicator}
                    </span>
                  </Control>
                  {/* What to do with the picture. What is seen is not said here: the liquid says it when it is looked at. */}
                  <p id={exploreId} className="text-xs text-muted-foreground">
                    {SAMPLE_TEXT.explore}
                  </p>
                  <Line said={tubeSaid} />
                </div>
              </div>
            </div>
          </section>

          <section aria-labelledby={scaleId} className={`cabbage-eye ${CARD}`}>
            <div className={SHEET}>
              {/* Once the estimate is recorded it is a line in the heading's row, beside "Change" until the meter is read: the scale under it has the room. */}
              <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-1">
                <h3 id={scaleId} className={HEADING}>
                  {editing ? SAMPLE_TEXT.nearest : RACK_TEXT.kept}
                </h3>
                {!editing && estimated && view.estimate !== null && (
                  <>
                    <p className="min-w-0 flex-1 basis-40">
                      <span className="font-medium">{SAMPLE_TEXT.byEye}:</span> {byEyeLine(view.estimate, view.is)}{' '}
                      {judged && (
                        <span className="font-medium whitespace-nowrap">
                          <Mark ok={right} />
                          {markText(right)}
                        </span>
                      )}
                    </p>
                    {view.estimateOpen && (
                      <Button
                        ref={changeRef}
                        type="button"
                        variant="outline"
                        className="min-h-11"
                        onClick={() => {
                          setDraft({ estimate: view.estimate, is: view.is })
                          setChanging(true)
                          sayOfEye('')
                        }}
                      >
                        {PAGE_TEXT.change}
                      </Button>
                    )}
                  </>
                )}
              </div>
              <Rack small name={RACK_TEXT.kept} describedBy={pickId} tubes={rack.tubes} pick={{ chosen: editing ? draft.estimate : view.estimate, unavailable: !editing, onPick: pick }} />
              {/* How the scale is used: while a tube is being chosen, for everyone; after that it is the rack's description, as in the first part, and is not drawn. */}
              <p id={pickId} className={editing ? 'max-w-prose text-xs text-muted-foreground' : 'sr-only'}>
                {editing ? `${SAMPLE_TEXT.pick} ${SAMPLE_TEXT.estimateRule}` : RACK_TEXT.explore}
              </p>
              {editing && (
                <>
                  <fieldset disabled={draft.estimate === CANNOT_SAY} className="grid w-full gap-1.5">
                    <legend className={`mb-1.5 font-medium ${draft.estimate === CANNOT_SAY ? '' : ROLE.entry}`}>{SAMPLE_TEXT.which}</legend>
                    <div className="flex flex-wrap gap-1.5">
                      {CLASSES.map((is) => (
                        <label key={is} className={CHOICE}>
                          <input
                            type="radio"
                            name={radios}
                            value={is}
                            checked={draft.is === is}
                            onChange={() => {
                              setDraft({ ...draft, is })
                              sayOfEye('')
                            }}
                          />
                          {CLASS_LABEL[is]}
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{draft.estimate === CANNOT_SAY ? BLOCKED_TEXT['class-not-asked'] : SAMPLE_TEXT.neutralRule}</p>
                  </fieldset>
                  <div className="flex flex-wrap gap-1.5">
                    <Button ref={recordRef} type="button" variant="outline" className="min-h-11" onClick={recordByEye}>
                      {SAMPLE_TEXT.record}
                    </Button>
                    {changing && (
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11"
                        onClick={() => {
                          setChanging(false)
                          setDraft({ estimate: view.estimate, is: view.is })
                          sayOfEye('')
                        }}
                      >
                        {PAGE_TEXT.cancel}
                      </Button>
                    )}
                  </div>
                </>
              )}
              {/* While it has nothing to say it takes no room, the gap over it neither. */}
              <div className={eyeSaid.text === '' ? '-mt-2' : undefined}>
                <Line said={eyeSaid} />
              </div>
              {/* Closed, and Guided's alone: how to go about it, and nothing of what the tube shows. A disclosure is a line of words with a hit area a finger tall laid over it, which reaches 24 px over an open one: it stands that far under the button over it. */}
              {guided && editing && (
                <div className="pt-4 pb-1">
                  <Disclosure summary={SAMPLE_TEXT.hint}>
                    <p className="max-w-prose">{SAMPLE_HINT.estimate}</p>
                    <p className="max-w-prose">{SAMPLE_HINT.which}</p>
                  </Disclosure>
                </div>
              )}
            </div>
          </section>

          {/* There once the estimate by eye is recorded: the meter is what the estimate is checked against. */}
          {(estimated || view.reading !== null) && (
            <div className={`cabbage-meter ${CARD}`}>
              <Sheet heading={SAMPLE_TEXT.meter}>
                <div className="flex w-full flex-wrap items-baseline gap-x-4 gap-y-1">
                  {view.reading === null ? <p className="font-medium text-muted-foreground">{SAMPLE_TEXT.notRead}</p> : <p className={`text-4xl font-semibold tabular-nums ${ROLE.value}`}>{phText(view.reading.tenths)}</p>}
                  {/* Where the probe stands; while Guided's warning is up, the warning says it. */}
                  {!over && !warned && <p className="max-w-prose flex-1 basis-48">{meterText(data, meter)}</p>}
                </div>
                {/* The reading as a sentence, said when the meter is read; for the eye it is the figure above, but for a reading that does not count, which says why. */}
                <p role="status" className={view.reading?.unrinsed ? 'max-w-prose font-medium' : 'sr-only'}>
                  {view.reading === null ? '' : readingText(view.reading)}
                </p>
                {/* Guided's warning, always there and empty until it is given, so that a screen reader says it when it comes. The two buttons under it are its two ways on. */}
                <p role="status" className={warned ? 'max-w-prose rounded-md border-2 p-2 font-medium' : '-mt-2'}>
                  {warned && probeWarning(data, meter.lastIn!)}
                </p>
                {!over && (
                  <div className="flex flex-wrap gap-1.5">
                    <Control unavailable={can(m, state, rinse) !== null} className="min-h-11" onClick={() => press(rinse, sayOfMeter)}>
                      {SAMPLE_TEXT.rinse}
                    </Control>
                    <Control unavailable={can(m, state, read) !== null} className="h-auto min-h-11 max-w-full shrink py-1 text-left whitespace-normal" onClick={() => press(read, sayOfMeter)}>
                      {SAMPLE_TEXT.read}
                    </Control>
                    {/* Guided checks a sample by itself once a rinsed probe has read it. */}
                    {view.outcome.state === 'to-check' && (
                      <Control unavailable={false} className="min-h-11" onClick={() => press({ type: 'checkSample', thing }, sayOfMeter)}>
                        {SAMPLE_TEXT.check}
                      </Control>
                    )}
                  </div>
                )}
                {view.reading !== null && !over && <p className="max-w-prose text-muted-foreground">{SAMPLE_TEXT.fixed}</p>}
                <div className={meterSaid.text === '' ? '-mt-2' : undefined}>
                  <Line said={meterSaid} />
                </div>
                {guided && !over && (
                  <div className="pt-4 pb-1">
                    <Disclosure summary={SAMPLE_TEXT.hint}>
                      <p className="max-w-prose">{SAMPLE_HINT.meter}</p>
                    </Disclosure>
                  </div>
                )}
              </Sheet>
            </div>
          )}

          {/* How the sample came out, under the meter that settled it: always there, and empty until there is something to say. */}
          <div ref={outcomeRef} tabIndex={-1} className={`cabbage-outcome grid justify-items-start gap-2 rounded-lg text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring ${view.outcome.state === 'open' ? '' : 'border bg-card p-3'}`}>
            <p role="status" className="max-w-prose font-medium">
              {view.outcome.state !== 'open' && (
                <>
                  {over && <Mark ok={view.outcome.state === 'counts'} />}
                  {sampleOutcomeText(view)}
                </>
              )}
            </p>
            {view.outcome.state === 'does-not-count' && (
              <Control unavailable={false} className="h-auto min-h-11 py-1 text-left whitespace-normal" onClick={() => press({ type: 'again', thing }, sayOfMeter)}>
                {SAMPLE_TEXT.again}
              </Control>
            )}
            {/* Once the sample counts and not before: the note says the thing's usual pH and where that is from. */}
            {view.notesShown && (
              <section aria-labelledby={notesId} className="grid max-w-[75ch] gap-1 leading-relaxed">
                <h3 id={notesId} className={HEADING}>
                  {NOTES_TEXT.thing}
                </h3>
                <p>{thingNote(data, thing)}</p>
              </section>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
