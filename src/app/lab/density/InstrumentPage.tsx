import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from 'react'
import { Disclosure } from '@/app/explore/InspectorCard'
import { Control } from '@/app/lab/Control'
import { Line, Mark, useSaid } from '@/app/lab/Line'
import { ROLE } from '@/app/lab/roles'
import { TypedEntry } from '@/app/lab/TypedEntry'
import { WarningGroup } from '@/app/lab/WarningGroup'
import type { DensityData, PartId } from '@/chem-data/density/data'
import { EYES, parseReading, type Action, type BenchView, type Blocked, type DensityModel, type EntryView, type Eye, type Instrument, type PartView, type ScaleView, type Warning } from '@/engine/density'
import {
  BENCH_TEXT,
  EYE_TEXT,
  INSTRUMENT_HELP,
  INSTRUMENT_NAME,
  PAGE_TEXT,
  VERDICT_TEXT,
  WARNING_BACK,
  WARNING_TEXT,
  blockedText,
  describeBalance,
  describeCylinder,
  describeNote,
  describePieces,
  describeThermometer,
  enteredText,
  entryFeedback,
  entryText,
  fieldLabel,
  formatHelp,
  readingRefusal,
  verdictLabel,
  weighLabel,
} from './messages'
import { entriesOf, sameAction } from './pageLook'
import { BalanceDrawing, ScaleDrawing, type ScaleLook } from './ScaleDrawing'
import { closerStretch, type Stretch } from './scaleGeometry'

/** One page of a part: a card named by its heading, which takes focus when the page comes to be shown. */
export function Page({ heading, headingRef, children }: { heading: string; headingRef?: Ref<HTMLHeadingElement> | undefined; children: ReactNode }) {
  const headingId = useId()
  return (
    // A message line that is empty takes no room, the gap under it neither: it is there for a screen reader to hear when it is filled.
    <section aria-labelledby={headingId} className="grid min-w-0 justify-items-start gap-3 rounded-lg border bg-card p-4 text-sm [&_p[role=status]:empty]:hidden">
      <h3 ref={headingRef} id={headingId} tabIndex={-1} className="w-fit rounded-sm text-base font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {heading}
      </h3>
      {children}
    </section>
  )
}

export interface PartProps {
  data: DensityData
  m: DensityModel
  part: PartId
  view: PartView
  guided: boolean
  /** Why an action cannot be done now, or null; the errors it would make, in Guided; and the action done. The page's, so that a card holds no state of the lab. */
  can(action: Action): Blocked | null
  warn(action: Action): Warning[]
  act(action: Action): void
}

/** The steps of the bench that are worked at an instrument, each with whether it has been taken: the weighings at the balance; the pouring, and the pieces going in, at the cylinder. */
function stepsOf(part: PartId, instrument: Instrument, bench: BenchView): { action: Action; label: string; taken: boolean }[] {
  const { steps } = bench
  if (part === 'reading' || (instrument !== 'balance' && instrument !== 'cylinder')) return []
  if (instrument === 'balance') {
    const taken = part === 'liquid' ? (steps.poured ? steps.fullWeighed : steps.emptyWeighed) : steps.weighed !== 'no'
    // Pieces that were weighed dry keep the name of that weighing once they are in the water.
    return [{ action: { type: 'weigh', part }, label: steps.weighed === 'dry' ? BENCH_TEXT.weighPieces : weighLabel(part, bench), taken }]
  }
  if (part === 'liquid') return [{ action: { type: 'pour', part }, label: BENCH_TEXT.pour, taken: steps.poured }]
  return [
    { action: { type: 'addPieces', part, how: 'slide' }, label: BENCH_TEXT.slide, taken: steps.added === 'slid' },
    { action: { type: 'addPieces', part, how: 'drop' }, label: BENCH_TEXT.drop, taken: steps.added === 'dropped' },
  ]
}

/** What an instrument shows, in words, a sentence or two for each thing: where an edge, a level or a thread stands between two marks, and never the reading. */
function wordsOf(m: DensityModel, part: PartId, instrument: Instrument, bench: BenchView): string[] {
  const pieces = part === 'metal' ? [describePieces(bench)] : []
  if (instrument === 'ruler-cm') return [describeNote(bench.rulerCm!)]
  if (instrument === 'ruler-mm') return [describeNote(bench.rulerMm!)]
  if (instrument === 'thermometer') return [describeThermometer(bench.thermometer!)]
  return instrument === 'cylinder' ? [describeCylinder(bench.cylinder), ...pieces] : [describeBalance(m, bench.balance), ...pieces]
}

/** The scales an instrument's page draws, each with the stretch its closer look shows: a ruler's two, for the note's long side and its short side; the cylinder's, which has no closer look while it is empty; the thermometer's. None for the balance. */
function looksOf(m: DensityModel, instrument: Instrument, bench: BenchView): { look: ScaleLook; closeUp: Stretch | null; name: string }[] {
  if (instrument === 'balance') return []
  const name = INSTRUMENT_NAME[instrument]
  const seen = (view: ScaleView, named: string) => ({ look: view, closeUp: closerStretch(view), name: named })
  if (instrument === 'cylinder') return [bench.cylinder.scale ? seen(bench.cylinder.scale, name) : { look: { instrument, ...m.scales.cylinder, atE3: null }, closeUp: null, name }]
  if (instrument === 'thermometer') return [seen(bench.thermometer!, name)]
  const note = instrument === 'ruler-cm' ? bench.rulerCm! : bench.rulerMm!
  return [seen(note.length, BENCH_TEXT.side.length), seen(note.width, BENCH_TEXT.side.width)]
}

/**
 * One instrument, on a page of its own: how it is marked; the steps of the bench that are worked at it; the
 * instrument drawn, with the button that opens the closer look of its scale, and for the cylinder the three
 * buttons that move the eye, beside a small drawing of where it is; what it shows, in words, closed; and each
 * reading taken from it, typed beside it. A reading with too few figures or too many is refused with the reason.
 * In Guided a step or a reading that would make an error raises the warning, which takes focus: the way back puts
 * focus where the error is put right, and the way on does what was asked.
 *
 * Everything that comes and goes (a refusal, the warning, the closer look) is under the button that brings it, so
 * that no button moves under the hand that pressed it.
 */
export function InstrumentPage({ data, m, part, view, instrument, can, warn, act, headingRef }: PartProps & { instrument: Instrument; headingRef: Ref<HTMLHeadingElement> }) {
  const { bench } = view
  const wordsId = useId()
  const [closer, setCloser] = useState(false)
  const [said, say] = useSaid()
  const [lookSaid, sayOfLook] = useSaid()
  const [warned, setWarned] = useState<Action | null>(null)
  const warningRef = useRef<HTMLDivElement>(null)
  const pressedRef = useRef<HTMLElement | null>(null)
  const levelRef = useRef<HTMLButtonElement>(null)
  const readingsRef = useRef<HTMLDivElement>(null)
  // A warning takes focus when it is raised.
  useEffect(() => {
    if (warned) warningRef.current?.focus()
  }, [warned])
  // A warning that is showing is of an action Guided would warn of now. Once it would not (the eye was moved, the pieces were weighed, the mode was changed), it is dropped.
  const warnings = warned === null ? [] : warn(warned)
  if (warned !== null && warnings.length === 0) setWarned(null)

  /** An action asked for: refused with the engine's reason, held back by Guided's warning the first time it is asked, or done. */
  const attempt = (action: Action): Blocked | 'warned' | null => {
    const blocked = can(action)
    if (blocked === null && warn(action).length > 0) {
      // Asked again by the same press, the warning takes focus again.
      if (sameAction(warned, action)) warningRef.current?.focus()
      else setWarned(action)
      return 'warned'
    }
    setWarned(null)
    if (blocked === null) act(action)
    return blocked
  }
  const press = (action: Action, button: HTMLElement) => {
    pressedRef.current = button
    const refused = attempt(action)
    say(refused === null || refused === 'warned' ? '' : blockedText(part, refused), refused !== null && refused !== 'warned')
  }

  const steps = stepsOf(part, instrument, bench)
  const looks = looksOf(m, instrument, bench)
  const entries = entriesOf(view.notebook, instrument)
  const eye = bench.cylinder.eye
  // An empty cylinder has no level to look at closely.
  const nothingToLook = looks.every(({ closeUp }) => closeUp === null)
  const upright = instrument === 'cylinder' || instrument === 'thermometer'

  const warning = warned !== null && warnings.length > 0 && (
    <WarningGroup
      ref={warningRef}
      warnings={warnings.map((id) => ({ id, title: WARNING_TEXT[id].title, body: WARNING_TEXT[id].body }))}
      buttons={{ back: WARNING_BACK, on: WARNING_TEXT[warnings.at(-1)!].on }}
      onBack={() => {
        setWarned(null)
        // A level is put right by bringing the eye level; a step, at the button that was pressed.
        const to = warned.type === 'enter' ? levelRef.current : pressedRef.current
        to?.focus()
      }}
      onGoOn={() => {
        setWarned(null)
        act(warned)
        const to = warned.type === 'enter' ? readingsRef.current : pressedRef.current
        to?.focus()
      }}
    />
  )
  const lookButton = looks.length > 0 && (
    <Control
      unavailable={nothingToLook}
      className="min-h-11 px-4"
      aria-label={closer ? undefined : BENCH_TEXT.closerLookOf(instrument)}
      onClick={() => {
        if (nothingToLook) return sayOfLook(blockedText(part, 'not-shown-yet', entries[0]?.field), true)
        sayOfLook('')
        setCloser(!closer)
      }}
    >
      {closer ? BENCH_TEXT.closeLook : BENCH_TEXT.closerLook}
    </Control>
  )
  // A reading the bench does not show yet is its name and what brings it, with no field: the page keeps to one screen, and the field comes with the step.
  const entry = (one: EntryView) =>
    one.value === null && one.blocked === 'not-shown-yet' ? (
      <div key={one.field} className="grid gap-0.5">
        <p className="font-medium">{fieldLabel(one.field)}</p>
        <p className={ROLE.held}>{blockedText(part, one.blocked, one.field)}</p>
      </div>
    ) : one.value !== null && one.blocked === 'no-longer-shown' ? (
      // A reading whose instrument has moved on is read and not typed: what was entered, and why it cannot be changed.
      <div key={one.field} className="grid gap-0.5">
        <p>
          <span className="font-medium">{fieldLabel(one.field)}</span>: <span className={`whitespace-nowrap tabular-nums ${ROLE.value}`}>{enteredText(m, data, one.field, one.value)}</span>
          {one.verdict && (
            <span className="ml-3 whitespace-nowrap">
              <Mark ok={one.verdict.follows} />
              {verdictLabel(one.field, one.verdict)}
            </span>
          )}
        </p>
        {one.verdict?.follows === false && <p className="max-w-prose">{entryFeedback(one.field, one.verdict)}</p>}
        <p className={ROLE.held}>{blockedText(part, one.blocked, one.field)}</p>
      </div>
    ) : (
      <ReadingEntry key={one.field} m={m} data={data} part={part} entry={one} eye={eye} attempt={attempt} />
    )

  return (
    <Page heading={INSTRUMENT_NAME[instrument]} headingRef={headingRef}>
      <p className="max-w-prose text-muted-foreground">{INSTRUMENT_HELP[instrument]}</p>
      {steps.length > 0 && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {steps.map(({ action, label, taken }) => {
              const blocked = can(action)
              return (
                <Control key={label} unavailable={blocked !== null} dimmed={blocked !== null && !taken} variant={taken ? 'secondary' : 'outline'} className="h-auto min-h-11 px-3 py-1.5 text-left whitespace-normal" onClick={(event) => press(action, event.currentTarget)}>
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
            })}
          </div>
          {/* Where the pieces are, said again whenever it changes: the cylinder's picture has them only once they are in. */}
          {part === 'metal' && (
            <p role="status" className="max-w-prose font-medium">
              {describePieces(bench)}
            </p>
          )}
          <Line said={said} />
          {warned?.type !== 'enter' && warning}
        </>
      )}

      {upright ? (
        <>
          <div className="flex w-full flex-wrap items-start gap-3">
            <div className="grid w-[170px] gap-2">
              <ScaleDrawing look={looks[0]!.look} eye={eye} pieces={bench.cylinder.pieces} name={looks[0]!.name} describedBy={wordsId} />
              {/* Under the cylinder, whose picture has the eye where these put it: three buttons one over another, in the eye's own order. */}
              {instrument === 'cylinder' && (
                <div role="group" aria-label={BENCH_TEXT.eye} className="grid grid-rows-3">
                  {EYES.map((to) => (
                    <Control
                      key={to}
                      ref={to === 'level' ? levelRef : undefined}
                      unavailable={can({ type: 'moveEye', part, eye: to }) !== null}
                      aria-pressed={to === eye}
                      variant={to === eye ? 'secondary' : 'outline'}
                      className="h-11 justify-start px-2"
                      onClick={(event) => press({ type: 'moveEye', part, eye: to }, event.currentTarget)}
                    >
                      <span aria-hidden="true">{to === eye ? '●' : '○'}</span>
                      <span className="ml-1.5">{BENCH_TEXT.moveEye[to]}</span>
                    </Control>
                  ))}
                </div>
              )}
            </div>
            {/* As wide as the closer look whether it is open or not. */}
            <div className="grid w-[264px] max-w-full gap-2">
              <div className="justify-self-start">{lookButton}</div>
              <Line said={lookSaid} />
              {closer && looks[0]!.closeUp !== null && <ScaleDrawing look={looks[0]!.look} closer={looks[0]!.closeUp} eye={eye} name={BENCH_TEXT.closerPicture(instrument)} describedBy={wordsId} />}
            </div>
          </div>
          {instrument === 'cylinder' && (
            <>
              {/* Two lines tall at every eye, so that what is under it stays where it is. An empty cylinder has no surface to look at: the line says that it is empty. */}
              <p role="status" className="min-h-10 max-w-prose">
                {bench.cylinder.scale === null ? describeCylinder(bench.cylinder) : EYE_TEXT[eye]}
              </p>
              {steps.length === 0 && <Line said={said} />}
            </>
          )}
        </>
      ) : instrument === 'balance' ? (
        <BalanceDrawing m={m} balance={bench.balance} name={INSTRUMENT_NAME.balance} describedBy={wordsId} />
      ) : (
        <>
          {lookButton}
          <Line said={lookSaid} />
        </>
      )}

      <div ref={readingsRef} role="group" aria-label={PAGE_TEXT.readings} tabIndex={-1} className="grid w-full gap-4 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {upright || instrument === 'balance'
          ? entries.map(entry)
          : looks.map(({ look, closeUp, name }, at) => (
              <div key={name} className="grid justify-items-start gap-1.5">
                <p className="font-medium">{name}</p>
                <ScaleDrawing look={look} name={name} describedBy={wordsId} />
                {closer && closeUp !== null && <ScaleDrawing look={look} closer={closeUp} name={`${name}: ${BENCH_TEXT.closerPicture(instrument)}`} describedBy={wordsId} />}
                {entry(entries[at]!)}
              </div>
            ))}
      </div>
      {warned?.type === 'enter' && warning}

      {/* The words twice: as the pictures' description, which a browser does not read out of a closed disclosure, and for every learner in the disclosure. */}
      <p id={wordsId} hidden>
        {wordsOf(m, part, instrument, bench).join(' ')}
      </p>
      {/* Room over it: open, the disclosure's hit area reaches 24 px over its line, where the field and its button would otherwise be. */}
      <div className="pt-3">
        <Disclosure summary={BENCH_TEXT.inWords}>
          <div className="grid max-w-prose gap-1">
            {wordsOf(m, part, instrument, bench).map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </Disclosure>
      </div>
    </Page>
  )
}

/**
 * A reading, typed beside its instrument: the shell's typed entry, with this lab's words. It must have the
 * figures its instrument gives, and is refused with the reason where it has too few or too many. A level is
 * recorded with where the eye is.
 */
function ReadingEntry({ m, data, part, entry, eye, attempt }: { m: DensityModel; data: DensityData; part: PartId; entry: EntryView; eye: Eye; attempt(action: Action): Blocked | 'warned' | null }) {
  const { field, value, blocked, verdict } = entry
  const instrument = entry.instrument!
  return (
    <TypedEntry
      label={fieldLabel(field)}
      made={value === null ? '' : entryText(m, data, field, value)}
      held={blocked === null ? null : blockedText(part, blocked, field)}
      help={formatHelp(field)}
      signed={instrument === 'thermometer'}
      verdict={verdict && { follows: verdict.follows, feedback: entryFeedback(field, verdict) }}
      text={{ enter: BENCH_TEXT.record, change: PAGE_TEXT.change, cancel: PAGE_TEXT.cancel, follows: VERDICT_TEXT.reading.right, not: VERDICT_TEXT.reading.not }}
      onEnter={(typed) => {
        const parsed = parseReading(m, instrument, typed)
        if (parsed.problem !== undefined) return readingRefusal(instrument, parsed.problem, typed)
        const refused = attempt({ type: 'enter', part, field, value: instrument === 'cylinder' ? { value: parsed.value, eye } : parsed.value })
        // Held back by the warning, the field is emptied: from where the eye is brought to, the level is read afresh.
        return refused === null || refused === 'warned' ? null : blockedText(part, refused, field)
      }}
    />
  )
}
