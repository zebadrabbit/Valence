import { X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { Control, noRepeat } from '@/app/lab/Control'
import { ROLE } from '@/app/lab/roles'
import { entryKey, fieldState } from '@/app/lab/titration/entry'
import { Button } from '@/components/ui/button'
import type { AqueousData } from '@/chem-data/aqueous/data'
import type { Entry, Form, Problem, State, StationView, Term } from '@/engine/aqueous'
import { EMPTY, MAX_COEFFICIENT, SIDES, changeTerm, entered, fit, move, nextEmpty, place, remove, setNoReaction, type At, type Counts, type Refused, type Row, type Side } from './builder'
import { EquationLine, Formula, formulaOf } from './Formula'
import { Line, Mark, useSaid } from './Line'
import { BENCH_TEXT, FORM_LABEL, PAGE_TEXT, SLOT_TEXT, STATE_NAME, alreadyOnSide, equationFeedback, slotLabel } from './messages'

export interface EquationBuilderProps {
  data: AqueousData
  form: Form
  /** The station's palette: the ids of the species an equation is built from. */
  palette: readonly string[]
  /** The equation last entered in this form, with what the engine finds wrong with it. */
  judged: StationView['equations'][Form]
  /** How many slots each side has, where the row is a template to fill; null where a side grows as it is filled. The engine's (StationView.template). */
  counts: Counts
  /** Where no equation can be entered here now whatever is built, the id of the sentence on the station that says why; else null. */
  held: string | null
  /** Why this entry cannot be entered as it stands, in words, or null. */
  refusal(entry: Entry): string | null
  /** Enters it, and hands back what kind of thing is wrong with it, or null. Called only with one that can be entered. */
  onEnter(entry: Entry): Problem | null
}

const STATES: readonly State[] = ['aq', 's', 'l', 'g']
/** A target a finger finds: 44 px each way at the least. */
const TAP = 'min-h-11 min-w-11'
const STATE_CHOICE =
  'flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border px-1.5 has-checked:border-foreground has-checked:bg-foreground has-checked:font-semibold has-checked:text-background has-focus-visible:ring-2 has-focus-visible:ring-ring'
/** How far a pressed tile is moved, in px, before it is being dragged: nearer than this, the press is a tap. */
const DRAG_START = 8
const SLOT = `flex ${TAP} items-center justify-center rounded-md border px-2 text-base whitespace-nowrap outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50`

const feedback = (problem: Problem | null) => (problem === null ? equationFeedback(null) : `${PAGE_TEXT.notCorrect}. ${equationFeedback(problem)}`)
const same = (a: At | null, b: At | null) => a !== null && b !== null && a.side === b.side && a.index === b.index

/** A tile that is being dragged: what it is, the slot it came out of or null for the bank's, where the pointer is, and the slot under it. */
interface Drag {
  speciesId: string
  from: At | null
  x: number
  y: number
  over: At | null
  /** Drawn above the pointer and not under it: a finger would cover it. */
  lifted: boolean
}

/**
 * The coefficient, the state and the way out of one term, in one line under the row of slots: a stepper from 1 to
 * 9, the four states as a choice of one, and a button that empties the slot. A step that cannot be taken stays
 * focusable and says why when pressed.
 */
export function TermControls({ name, formula, term, onStep, onState, onRemove }: { name: string; formula: string; term: Term; onStep(by: number): void; onState(state: State): void; onRemove(): void }) {
  const group = useId()
  return (
    <div role="group" aria-label={name} className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 ${TAP}`}>
      <strong className="text-base font-semibold">
        <Formula text={formula} />
      </strong>
      <span className="flex items-center gap-1">
        <Control unavailable={term.coefficient <= 1} aria-label={PAGE_TEXT.fewer} className={TAP} onClick={() => onStep(-1)}>
          −
        </Control>
        <span className="min-w-6 text-center text-base tabular-nums">
          <span className="sr-only">{PAGE_TEXT.coefficient}: </span>
          {term.coefficient}
        </span>
        <Control unavailable={term.coefficient >= MAX_COEFFICIENT} aria-label={PAGE_TEXT.more} className={TAP} onClick={() => onStep(1)}>
          +
        </Control>
      </span>
      <span role="radiogroup" aria-label={PAGE_TEXT.state} className="flex gap-1">
        {STATES.map((state) => (
          <label key={state} className={STATE_CHOICE}>
            <input type="radio" className="sr-only" name={group} aria-label={`${state}: ${STATE_NAME[state]}`} checked={term.state === state} onChange={() => onState(state)} />
            <span aria-hidden="true">({state})</span>
          </label>
        ))}
      </span>
      <Button type="button" variant="ghost" aria-label={PAGE_TEXT.remove(formula)} className={TAP} onClick={onRemove}>
        <X aria-hidden="true" />
      </Button>
    </div>
  )
}

/**
 * One equation of a station, built by taps and never typed (spec 8.3). The equation is a row of slots, the
 * reactants left of the arrow and the products right of it, and under it the station's bank of substances as
 * tiles. One slot is the active one, drawn with a thick outline and named as active: a tile that is pressed goes
 * into it, and the next empty slot becomes the active one. A press of a slot makes that one active. A tile can
 * also be dragged from the bank onto a slot, from one slot to another, and out of the row, which empties its
 * slot; nothing is done by dragging alone. The slot last filled or pressed has its coefficient, its state and its
 * way out in one line between the row and the bank. In a template (`counts`) each side has the slots it is given;
 * otherwise a side is its terms and one empty slot. "Check" enters the equation and says what kind of thing is
 * wrong, never the answer. A correct equation is shown as its one line, with "Change" beside it.
 */
export function EquationBuilder({ data, form, palette, judged, counts, held, refusal, onEnter }: EquationBuilderProps) {
  const [draft, setDraft] = useState<Row>(judged?.entry ?? EMPTY)
  const [changing, setChanging] = useState(false)
  // The slot last pressed, or the one the row moved on to when a tile went in: the active one while it is there.
  const [chosen, setChosen] = useState<At | null>(null)
  // The term whose coefficient and state are under the row, by its side and what it is: a species stands once on a side, and a slot's number changes as a side closes up.
  const [edited, setEdited] = useState<{ side: Side; speciesId: string } | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [said, say] = useSaid(judged ? feedback(judged.problem) : '')
  // Which slot is active, for a screen reader: the eye has the outline.
  const [heard, hear] = useSaid()
  // Whether the line is the check of the equation as it stands: null once it has been changed since.
  const [checked, setChecked] = useState<boolean | null>(judged ? judged.problem === null : null)
  const headingId = useId()
  const labelId = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const controls = useRef<HTMLDivElement>(null)
  const pressed = useRef<{ speciesId: string; from: At | null; x: number; y: number } | null>(null)
  // The click that ends a drag is not a tap.
  const dropped = useRef(false)
  // A slot opened by keyboard hands focus to its term's controls once they are drawn.
  const toControls = useRef(false)
  const correct = judged?.problem === null
  const { editable, changeable, cancellable } = fieldState(correct, held !== null, changing)

  const row = fit(draft, counts)
  const termAt = (at: At | null): Term | null => (at === null ? null : (row[at.side][at.index] ?? null))
  const where = (within: Row, side: Side, speciesId: string): At | null => {
    const index = within[side].findIndex((slot) => slot?.speciesId === speciesId)
    return index < 0 ? null : { side, index }
  }
  const active = chosen !== null && row[chosen.side][chosen.index] !== undefined ? chosen : nextEmpty(row)
  const editedAt = edited === null ? null : where(row, edited.side, edited.speciesId)
  const formula = (speciesId: string) => formulaOf(data, speciesId)

  useEffect(() => {
    if (!toControls.current) return
    toControls.current = false
    controls.current?.querySelector<HTMLElement>('button, input')?.focus()
  })

  /** A change of the row: the line says it, and is no longer the check of what stands. */
  const change = (next: Row, text: string) => {
    setDraft(next)
    setChecked(null)
    say(text)
  }
  const refuse = ({ speciesId, side }: Refused) => say(alreadyOnSide(formula(speciesId), side), true)
  const go = (at: At | null) => {
    setChosen(at)
    hear(at === null ? SLOT_TEXT.noneActive : SLOT_TEXT.active(at))
  }
  const put = (at: At, speciesId: string) => {
    const next = place(row, at, speciesId, counts)
    if ('speciesId' in next) return refuse(next)
    if (next === row) return refuse({ speciesId, side: at.side })
    const was = termAt(at)
    change(next, was === null ? SLOT_TEXT.placed(formula(speciesId), at) : SLOT_TEXT.replaced(formula(speciesId), at, formula(was.speciesId)))
    setEdited({ side: at.side, speciesId })
    go(nextEmpty(next, at))
  }
  const take = (at: At) => {
    const was = termAt(at)
    if (was === null) return
    const next = remove(row, at, counts)
    change(next, SLOT_TEXT.takenOut(formula(was.speciesId), at.side))
    go(nextEmpty(next, at))
  }
  const drop = ({ speciesId, from }: Drag, to: At | 'row' | null) => {
    if (to === 'row') return
    if (from === null) return to === null ? undefined : put(to, speciesId)
    if (to === null) return take(from)
    const next = move(row, from, to, counts)
    if ('speciesId' in next) return refuse(next)
    if (next === row) return
    const other = termAt(to)
    const now = where(next, to.side, speciesId)!
    change(next, other === null ? SLOT_TEXT.placed(formula(speciesId), now) : SLOT_TEXT.exchanged(formula(speciesId), now, formula(other.speciesId), where(next, from.side, other.speciesId)!))
    setEdited({ side: to.side, speciesId })
    go(nextEmpty(next, now))
  }
  const cancel = () => {
    button.current?.focus()
    setChanging(false)
    setChosen(null)
    setEdited(null)
    setDraft(judged!.entry)
    setChecked(true)
    say(feedback(null))
  }

  /** What lies under a point: a slot of this builder, its row between the slots, or neither. */
  const under = (x: number, y: number): At | 'row' | null => {
    const hit = document.elementFromPoint(x, y)
    if (hit === null || !formRef.current?.contains(hit)) return null
    const slot = hit.closest<HTMLElement>('[data-place]')
    if (slot === null) return hit.closest('[data-row]') ? 'row' : null
    const [side, index] = slot.dataset.place!.split(':')
    return { side: side as Side, index: Number(index) }
  }
  // A tile is dragged by pointer events, which a finger, a pen and a mouse all give; the tile is `touch-none`, so a
  // finger on it moves the tile and not the page.
  // ponytail: the page does not scroll while a tile is held near the window's edge; a builder is under a screen long.
  const draggable = (speciesId: string, from: At | null) => ({
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return
      pressed.current = { speciesId, from, x: event.clientX, y: event.clientY }
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
      const start = pressed.current
      if (start === null || (drag === null && Math.hypot(event.clientX - start.x, event.clientY - start.y) < DRAG_START)) return
      const over = under(event.clientX, event.clientY)
      setDrag({ speciesId: start.speciesId, from: start.from, x: event.clientX, y: event.clientY, over: over === 'row' ? null : over, lifted: event.pointerType !== 'mouse' })
    },
    onPointerUp: (event: PointerEvent<HTMLButtonElement>) => {
      pressed.current = null
      if (drag === null) return
      setDrag(null)
      dropped.current = true
      setTimeout(() => (dropped.current = false))
      drop(drag, under(event.clientX, event.clientY))
    },
    onPointerCancel: () => {
      pressed.current = null
      setDrag(null)
    },
  })
  /** A press that is a tap or a key, and not the end of a drag. `byKey`: it has no pointer, whose clicks `detail` counts. */
  const tapped = (act: (byKey: boolean) => void) => (event: MouseEvent) => {
    if (!dropped.current) act(event.detail === 0)
  }
  const slotKey = (event: KeyboardEvent<HTMLButtonElement>, at: At) => {
    noRepeat(event)
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault()
      take(at)
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const slots = [...formRef.current!.querySelectorAll<HTMLElement>('[data-place]')]
      slots[slots.indexOf(event.currentTarget) + (event.key === 'ArrowRight' ? 1 : -1)]?.focus()
    }
  }
  const reason = held !== null || !editable ? null : refusal(entered(row))
  const building = editable && !row.noReaction

  return (
    <form
      ref={formRef}
      noValidate
      aria-labelledby={headingId}
      className="grid gap-2 rounded-md border p-3"
      onKeyDown={(event) => {
        // Enter on a choice is not a press of Check: an equation is checked when its button is pressed.
        if (event.key === 'Enter' && event.target instanceof HTMLInputElement) event.preventDefault()
        entryKey(event, cancellable ? cancel : null)
      }}
      onSubmit={(event) => {
        event.preventDefault()
        if (changeable) return setChanging(true)
        // What holds the whole builder is said at the station's head, and is the button's description.
        if (held !== null) return
        if (reason !== null) return say(reason, true)
        const problem = onEnter(entered(row))
        setChanging(false)
        setChecked(problem === null)
        say(feedback(problem))
      }}
    >
      {/* The heading and, while the equation can be changed, the choice that there is none to write, in one line. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 id={headingId} className="font-medium">
          {FORM_LABEL[form]}
        </h4>
        {editable && (
          <label className={`flex w-fit cursor-pointer items-center gap-2 rounded-md border px-3 has-checked:border-foreground has-checked:bg-muted has-checked:font-medium has-focus-visible:ring-2 has-focus-visible:ring-ring ${TAP}`}>
            <input type="checkbox" checked={row.noReaction} onChange={(event) => change(setNoReaction(row, event.target.checked), '')} />
            {BENCH_TEXT.noReaction}
          </label>
        )}
      </div>
      {building ? (
        <>
          {/* The row of slots is the equation's line while it is built: a sign stays with the slot after it where the row wraps. */}
          <div role="group" aria-labelledby={labelId} data-row="" className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
            <span id={labelId} className={`font-medium ${ROLE.entry}`}>
              {PAGE_TEXT.yourEquation}:
            </span>
            {SIDES.map((side) =>
              row[side].map((term, index) => {
                const at = { side, index }
                const isActive = same(at, active)
                return (
                  <span key={`${side}${index}`} className="flex items-center gap-1.5 text-base">
                    {index > 0 ? '+' : side === 'products' ? <span className="px-1">→</span> : null}
                    <button
                      type="button"
                      data-place={`${side}:${index}`}
                      aria-label={slotLabel(at, counts === null ? null : row[side].length, term && { ...term, formula: formula(term.speciesId) }, isActive)}
                      className={[
                        SLOT,
                        term === null ? 'min-w-14 border-dashed border-muted-foreground' : 'cursor-grab touch-none bg-background font-medium',
                        // Thick and solid where the others are thin, or dashed: the active slot is told by its outline's weight, not its colour.
                        isActive ? 'border-solid border-foreground inset-ring-2 inset-ring-foreground' : '',
                        same(at, drag?.over ?? null) ? 'bg-muted ring-3 ring-ring' : '',
                        same(at, drag?.from ?? null) ? 'opacity-40' : '',
                      ].join(' ')}
                      onClick={tapped((byKey) => {
                        go(at)
                        if (term === null) return
                        setEdited({ side, speciesId: term.speciesId })
                        toControls.current = byKey
                      })}
                      onKeyDown={(event) => slotKey(event, at)}
                      {...(term === null ? {} : draggable(term.speciesId, at))}
                    >
                      {term !== null && (
                        // Underlined while its coefficient and state are the ones under the row.
                        <span className={same(at, editedAt) ? 'underline decoration-2 underline-offset-4' : undefined}>
                          {term.coefficient === 1 ? '' : term.coefficient}
                          <Formula text={formula(term.speciesId)} />({term.state})
                        </span>
                      )}
                    </button>
                  </span>
                )
              }),
            )}
          </div>
          <div ref={controls}>
            {editedAt === null ? (
              <p className={`flex items-center text-muted-foreground ${TAP}`}>{PAGE_TEXT.slotHelp}</p>
            ) : (
              <TermControls
                name={SLOT_TEXT.term(formula(edited!.speciesId), editedAt)}
                formula={formula(edited!.speciesId)}
                term={termAt(editedAt)!}
                onStep={(by) => {
                  const coefficient = termAt(editedAt)!.coefficient + by
                  const next = changeTerm(row, editedAt, { coefficient })
                  if (next === row) say(PAGE_TEXT.coefficientLimit, true)
                  else change(next, SLOT_TEXT.coefficient(formula(edited!.speciesId), coefficient))
                }}
                onState={(state) => change(changeTerm(row, editedAt, { state }), SLOT_TEXT.state(formula(edited!.speciesId), state))}
                onRemove={() => {
                  // Its controls go with the term, and focus goes to the slot it leaves.
                  formRef.current?.querySelector<HTMLElement>(`[data-place="${editedAt.side}:${editedAt.index}"]`)?.focus()
                  take(editedAt)
                }}
              />
            )}
          </div>
          <div role="group" aria-label={PAGE_TEXT.palette} className="flex flex-wrap gap-1.5">
            {palette.map((speciesId) => (
              // Unavailable where no slot is active, and where the active slot's side holds it already; pressed, it says which.
              <Control
                key={speciesId}
                unavailable={active === null || where(row, active.side, speciesId) !== null}
                className={`cursor-grab touch-none px-3 text-base ${TAP}`}
                onClick={tapped(() => (active === null ? say(PAGE_TEXT.full, true) : put(active, speciesId)))}
                {...draggable(speciesId, null)}
              >
                <span>
                  <Formula text={formula(speciesId)} />
                </span>
              </Control>
            ))}
          </div>
          {drag !== null &&
            createPortal(
              // The tile under the pointer while it is dragged. In the document's body: the page is a container, and would place it by itself.
              <div
                aria-hidden="true"
                style={{ left: drag.x, top: drag.y }}
                className={`pointer-events-none fixed z-50 -translate-x-1/2 rounded-md border bg-card px-3 py-2 text-base font-medium text-card-foreground shadow-lg ${drag.lifted ? '-translate-y-[140%]' : '-translate-y-1/2'}`}
              >
                <Formula text={formula(drag.speciesId)} />
              </div>,
              document.body,
            )}
        </>
      ) : (
        <p>
          <span className={editable ? `font-medium ${ROLE.entry}` : 'font-medium'}>{PAGE_TEXT.yourEquation}: </span>
          <span className={`text-base ${ROLE.value}`}>
            <EquationLine data={data} entry={editable ? entered(row) : judged!.entry} />
          </span>
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {/* Stays focusable when it cannot be used, and says why when pressed. As "Change" it is described by the builder's heading. */}
        <Button
          ref={button}
          type="submit"
          variant="outline"
          aria-disabled={held !== null || (!changeable && reason !== null) || undefined}
          aria-describedby={held ?? headingId}
          className={`aria-disabled:opacity-50 ${TAP}`}
        >
          {changeable ? PAGE_TEXT.change : BENCH_TEXT.check}
        </Button>
        {cancellable && (
          <Button type="button" variant="outline" className={TAP} onClick={cancel}>
            {PAGE_TEXT.cancel}
          </Button>
        )}
      </div>
      <Line said={said} mark={checked === null || said.held ? undefined : <Mark ok={checked} />} />
      <div className="sr-only">
        <Line said={heard} />
      </div>
    </form>
  )
}
