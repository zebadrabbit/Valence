import { X } from 'lucide-react'
import { Fragment, useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent, type TouchEvent } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import type { Entry, State, Term } from '@/engine/equation'
import { Control, noRepeat } from './Control'
import { entryKey, fieldState } from './entry'
import { EMPTY, MAX_COEFFICIENT, SIDES, changeTerm, entered, fit, formulaParts, move, nextEmpty, place, remove, setNoReaction, type At, type Counts, type Refused, type Row, type Side } from './equationRow'
import { Line, Mark, useSaid } from './Line'
import { ROLE } from './roles'

// The builder of an equation from tiles: the aqueous reactions lab's (spec 8.3) and the types of reactions lab's
// (spec 24.2). Each lab gives it its own tiles, its own count of places, the states it offers and every word it
// says; what an equation is checked against is each lab's engine, reached through `refusal` and `onEnter`.

/** A formula of a record with its subscripts and its charge drawn as such. */
export function Formula({ text }: { text: string }) {
  return formulaParts(text).map((part, i) => (part.at === 'below' ? <sub key={i}>{part.text}</sub> : part.at === 'above' ? <sup key={i}>{part.text}</sup> : part.text))
}

/**
 * An equation in one line, as it is built or as it was entered: "Fe³⁺(aq) + 3OH⁻(aq) → Fe(OH)₃(s)", with a gap
 * where a side has nothing on it yet, or the words for "No reaction". `formula` gives a species' formula.
 */
export function EquationLine({ entry, formula, noReaction }: { entry: Entry; formula(speciesId: string): string; noReaction: string }) {
  if (entry.noReaction) return noReaction
  const side = (terms: Entry['reactants']) =>
    terms.length === 0
      ? '…'
      : terms.map((term, i) => (
          <Fragment key={term.speciesId}>
            {i > 0 && ' + '}
            <span className="whitespace-nowrap">
              {term.coefficient === 1 ? '' : term.coefficient}
              <Formula text={formula(term.speciesId)} />({term.state})
            </span>
          </Fragment>
        ))
  return (
    <>
      {side(entry.reactants)} → {side(entry.products)}
    </>
  )
}

/** What the controls of one term say. */
export interface TermText {
  coefficient: string
  fewer: string
  more: string
  state: string
  remove(formula: string): string
  /** A state symbol said in full, as the name of its choice. */
  stateName: Record<State, string>
}

/** Every word a builder says, which is its lab's. */
export interface BuilderText extends TermText {
  /** Before the row of places, and before the line of an equation that is entered. */
  yourEquation: string
  /** The name of the bank of tiles. */
  palette: string
  /** Under the row, until a place holds something: how the row is filled. */
  slotHelp: string
  /** A tile pressed while no place is active: every place of a template is full. */
  full: string
  coefficientLimit: string
  /** The button that enters the equation, and the two of a change under way. */
  check: string
  change: string
  cancel: string
  /** The choice that there is no equation to write; null where the lab asks that elsewhere, and the builder then offers none. */
  noReaction: string | null
  /** Why a species is not put on a side again. */
  alreadyOnSide(formula: string, side: Side): string
  /** The name of a place's button. `of` is how many places its side has where the row is a template, and null where it is not. */
  slotLabel(at: At, of: number | null, term: { formula: string; coefficient: number; state: State } | null, active: boolean): string
  /** What the message line says of each change to the row; the last two are for a screen reader, which the outline does not reach. */
  slot: {
    placed(formula: string, at: At): string
    replaced(formula: string, at: At, was: string): string
    exchanged(formula: string, at: At, other: string, otherAt: At): string
    takenOut(formula: string, side: Side): string
    coefficient(formula: string, coefficient: number): string
    state(formula: string, state: State): string
    /** The name of the group of a term's coefficient, state and way out. */
    term(formula: string, at: At): string
    active(at: At): string
    noneActive: string
  }
}

/** An equation that has been entered: whether it was found right (null where it has not been judged), and the sentence that says so. */
export interface Entered {
  entry: Entry
  ok: boolean | null
  text: string
}

export interface EquationBuilderProps {
  /** The builder's heading. */
  heading: string
  /** The tiles: the ids of the species an equation is built from, and the formula each is drawn as. */
  palette: readonly string[]
  formula(speciesId: string): string
  /** A tile's name for a screen reader, where its formula alone is not one. */
  tileName?: ((speciesId: string) => string) | undefined
  /** The states a term can be given, in the order they are offered. */
  states: readonly State[]
  /** The equation last entered here and what was found of it, as the builder is first drawn; null where there is none. */
  recorded: Entered | null
  /** How many places each side has, where the row is a template to fill; null where a side grows as it is filled. The engine's. */
  counts: Counts
  /** Where no equation can be entered here now whatever is built, the id of the sentence on the page that says why; else null. */
  held: string | null
  /** Why this entry cannot be entered as it stands, in words, or null. */
  refusal(entry: Entry): string | null
  /** Enters it, and hands back what was found of it: right, not right, or (null) not judged, with the sentence that says so. Called only with one that can be entered. */
  onEnter(entry: Entry): Omit<Entered, 'entry'>
  text: BuilderText
  /** What is to be built, in a sentence or two under the heading, while the equation is being built. */
  intro?: string | undefined
  /**
   * The bank of tiles over the row of slots, and not under it. For a card too narrow for every equation a learner
   * can build to stand in one row: the row then takes a second line as it is filled, and tiles under it, which are
   * pressed one after another, would move under the hand.
   */
  bankFirst?: boolean | undefined
}

/** A target a finger finds: 44 px each way at the least. */
const TAP = 'min-h-11 min-w-11'
const STATE_CHOICE =
  'flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border px-1.5 has-checked:border-foreground has-checked:bg-foreground has-checked:font-semibold has-checked:text-background has-focus-visible:ring-2 has-focus-visible:ring-ring'
/** How far a pressed tile is moved, in px, before it is being dragged: nearer than this, the press is a tap. */
const DRAG_START = 8
const SLOT = `flex ${TAP} items-center justify-center rounded-md border px-2 text-base whitespace-nowrap outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50`

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
export function TermControls({ name, formula, term, states, text, onStep, onState, onRemove }: { name: string; formula: string; term: Term; states: readonly State[]; text: TermText; onStep(by: number): void; onState(state: State): void; onRemove(): void }) {
  const group = useId()
  return (
    <div role="group" aria-label={name} className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 ${TAP}`}>
      <strong className="text-base font-semibold">
        <Formula text={formula} />
      </strong>
      <span className="flex items-center gap-1">
        <Control unavailable={term.coefficient <= 1} aria-label={text.fewer} className={TAP} onClick={() => onStep(-1)}>
          −
        </Control>
        <span className="min-w-6 text-center text-base tabular-nums">
          <span className="sr-only">{text.coefficient}: </span>
          {term.coefficient}
        </span>
        <Control unavailable={term.coefficient >= MAX_COEFFICIENT} aria-label={text.more} className={TAP} onClick={() => onStep(1)}>
          +
        </Control>
      </span>
      <span role="radiogroup" aria-label={text.state} className="flex gap-1">
        {states.map((state) => (
          <label key={state} className={STATE_CHOICE}>
            <input type="radio" className="sr-only" name={group} aria-label={`${state}: ${text.stateName[state]}`} checked={term.state === state} onChange={() => onState(state)} />
            <span aria-hidden="true">({state})</span>
          </label>
        ))}
      </span>
      <Button type="button" variant="ghost" aria-label={text.remove(formula)} className={TAP} onClick={onRemove}>
        <X aria-hidden="true" />
      </Button>
    </div>
  )
}

/**
 * One equation of a station, built by taps and never typed (spec 8.3, 24.2). The equation is a row of slots, the
 * reactants left of the arrow and the products right of it, and under it the station's bank of substances as
 * tiles. One slot is the active one, drawn with a thick outline and named as active: a tile that is pressed goes
 * into it, and the next empty slot becomes the active one. A press of a slot makes that one active. A tile can
 * also be dragged from the bank onto a slot, from one slot to another, and out of the row, which empties its
 * slot; nothing is done by dragging alone. The slot last filled or pressed has its coefficient, its state and its
 * way out in one line between the row and the bank. In a template (`counts`) each side has the slots it is given;
 * otherwise a side is its terms and one empty slot. The button enters the equation, and the line under it says what
 * its lab finds of it: what kind of thing is wrong, never the answer. An equation that is entered and not found
 * wrong is shown as its one line, with "Change" beside it: one that is right, and one that its lab has taken and
 * not yet judged.
 */
export function EquationBuilder({ heading, palette, formula, tileName, states, recorded, counts, held, refusal, onEnter, text, intro, bankFirst = false }: EquationBuilderProps) {
  const [draft, setDraft] = useState<Row>(recorded?.entry ?? EMPTY)
  const [changing, setChanging] = useState(false)
  // The slot last pressed, or the one the row moved on to when a tile went in: the active one while it is there.
  const [chosen, setChosen] = useState<At | null>(null)
  // The term whose coefficient and state are under the row, by its side and what it is: a species stands once on a side, and a slot's number changes as a side closes up.
  const [edited, setEdited] = useState<{ side: Side; speciesId: string } | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [said, say] = useSaid(recorded?.text ?? '')
  // Which slot is active, for a screen reader: the eye has the outline.
  const [heard, hear] = useSaid()
  // Whether the line is the check of the equation as it stands: null once it has been changed since.
  const [checked, setChecked] = useState<boolean | null>(recorded?.ok ?? null)
  const headingId = useId()
  const labelId = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const controls = useRef<HTMLDivElement>(null)
  const pressed = useRef<{ held: { speciesId: string; from: At | null } | null; x: number; y: number } | null>(null)
  const dropped = useRef(false)
  // A slot opened by keyboard hands focus to its term's controls once they are drawn.
  const toControls = useRef(false)
  // Entered and not found wrong: right, or taken and not yet judged.
  const settled = recorded !== null && recorded.ok !== false
  const { editable, changeable, cancellable } = fieldState(settled, held !== null, changing)

  const row = fit(draft, counts)
  const termAt = (at: At | null): Term | null => (at === null ? null : (row[at.side][at.index] ?? null))
  const where = (within: Row, side: Side, speciesId: string): At | null => {
    const index = within[side].findIndex((slot) => slot?.speciesId === speciesId)
    return index < 0 ? null : { side, index }
  }
  const active = chosen !== null && row[chosen.side][chosen.index] !== undefined ? chosen : nextEmpty(row)
  const editedAt = edited === null ? null : where(row, edited.side, edited.speciesId)
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
  const refuse = ({ speciesId, side }: Refused) => say(text.alreadyOnSide(formula(speciesId), side), true)
  const go = (at: At | null) => {
    setChosen(at)
    hear(at === null ? text.slot.noneActive : text.slot.active(at))
  }
  const put = (at: At, speciesId: string) => {
    const next = place(row, at, speciesId, counts)
    if ('speciesId' in next) return refuse(next)
    if (next === row) return refuse({ speciesId, side: at.side })
    const was = termAt(at)
    change(next, was === null ? text.slot.placed(formula(speciesId), at) : text.slot.replaced(formula(speciesId), at, formula(was.speciesId)))
    setEdited({ side: at.side, speciesId })
    go(nextEmpty(next, at))
  }
  const take = (at: At) => {
    const was = termAt(at)
    if (was === null) return
    const next = remove(row, at, counts)
    change(next, text.slot.takenOut(formula(was.speciesId), at.side))
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
    change(next, other === null ? text.slot.placed(formula(speciesId), now) : text.slot.exchanged(formula(speciesId), now, formula(other.speciesId), where(next, from.side, other.speciesId)!))
    setEdited({ side: to.side, speciesId })
    go(nextEmpty(next, now))
  }
  const cancel = () => {
    button.current?.focus()
    setChanging(false)
    setChosen(null)
    setEdited(null)
    setDraft(recorded!.entry)
    setChecked(recorded!.ok)
    say(recorded!.text)
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
  // What a pointer does on a slot or on a tile of the bank. A tile (`held`, null for an empty slot) that is pressed
  // and moved is dragged, by pointer events, which a finger, a pen and a mouse all give; it is `touch-none`, so a
  // finger on it moves the tile and not the page. A press that is not a drag is a tap. A mouse's and a key's come
  // as a click. A finger's is taken when the finger lifts, and the click the browser would make of it is stopped:
  // for about half a second after a drag that ends with the finger still moving, the browser makes no click of a
  // tap, and that tap would be lost.
  // ponytail: the page does not scroll while a tile is held near the window's edge; a builder is under a screen long.
  const pointer = (held: { speciesId: string; from: At | null } | null, tap: (byKey: boolean) => void) => ({
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return
      pressed.current = { held, x: event.clientX, y: event.clientY }
      if (held !== null) event.currentTarget.setPointerCapture(event.pointerId)
    },
    onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
      const start = pressed.current
      if (!start?.held || (drag === null && Math.hypot(event.clientX - start.x, event.clientY - start.y) < DRAG_START)) return
      const over = under(event.clientX, event.clientY)
      setDrag({ ...start.held, x: event.clientX, y: event.clientY, over: over === 'row' ? null : over, lifted: event.pointerType !== 'mouse' })
    },
    onPointerUp: (event: PointerEvent<HTMLButtonElement>) => {
      const start = pressed.current
      pressed.current = null
      if (start === null) return
      // Lifted where it came down, or near: a finger that slid off the slot it touched has not tapped it.
      if (drag === null) return event.pointerType === 'touch' && event.currentTarget.contains(document.elementFromPoint(event.clientX, event.clientY)) ? tap(false) : undefined
      setDrag(null)
      // The click a mouse makes as it lets a dragged tile go is not a tap.
      dropped.current = true
      setTimeout(() => (dropped.current = false))
      drop(drag, under(event.clientX, event.clientY))
    },
    onPointerCancel: () => {
      pressed.current = null
      setDrag(null)
    },
    onTouchEnd: (event: TouchEvent) => {
      if (event.cancelable) event.preventDefault()
    },
    // `detail` counts a pointer's clicks: a press by key has none.
    onClick: (event: MouseEvent) => {
      if (!dropped.current) tap(event.detail === 0)
    },
  })
  const slotKey = (event: KeyboardEvent<HTMLButtonElement>, at: At) => {
    noRepeat(event)
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault()
      // One press, one slot: where a side closes up, a held key would empty it term by term.
      if (!event.repeat) take(at)
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const slots = [...formRef.current!.querySelectorAll<HTMLElement>('[data-place]')]
      slots[slots.indexOf(event.currentTarget) + (event.key === 'ArrowRight' ? 1 : -1)]?.focus()
    }
  }
  const reason = held !== null || !editable ? null : refusal(entered(row))
  const building = editable && !row.noReaction
  const bank = (
    <div role="group" aria-label={text.palette} className="flex flex-wrap gap-1.5">
      {palette.map((speciesId) => (
        // Unavailable where no slot is active, and where the active slot's side holds it already; pressed, it says which.
        <Control
          key={speciesId}
          unavailable={active === null || where(row, active.side, speciesId) !== null}
          aria-label={tileName?.(speciesId)}
          className={`cursor-grab touch-none px-3 text-base ${TAP}`}
          {...pointer({ speciesId, from: null }, () => (active === null ? say(text.full, true) : put(active, speciesId)))}
        >
          <span>
            <Formula text={formula(speciesId)} />
          </span>
        </Control>
      ))}
    </div>
  )

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
        const found = onEnter(entered(row))
        // A change whose equation is not right is still under way: where a lab refuses such an equation and keeps the one it had, the builder must not close on the old one with the refusal beside it.
        if (found.ok !== false) setChanging(false)
        setChecked(found.ok)
        say(found.text)
      }}
    >
      {/* The heading and, while the equation can be changed, the choice that there is none to write, in one line. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 id={headingId} className="font-medium">
          {heading}
        </h4>
        {editable && text.noReaction !== null && (
          <label className={`flex w-fit cursor-pointer items-center gap-2 rounded-md border px-3 has-checked:border-foreground has-checked:bg-muted has-checked:font-medium has-focus-visible:ring-2 has-focus-visible:ring-ring ${TAP}`}>
            <input type="checkbox" checked={row.noReaction} onChange={(event) => change(setNoReaction(row, event.target.checked), '')} />
            {text.noReaction}
          </label>
        )}
      </div>
      {building ? (
        <>
          {intro !== undefined && <p className="max-w-[75ch] text-muted-foreground">{intro}</p>}
          {bankFirst && bank}
          {/* The row of slots is the equation's line while it is built: a sign stays with the slot after it where the row wraps. */}
          <div role="group" aria-labelledby={labelId} data-row="" className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
            <span id={labelId} className={`font-medium ${ROLE.entry}`}>
              {text.yourEquation}:
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
                      aria-label={text.slotLabel(at, counts === null ? null : row[side].length, term && { ...term, formula: formula(term.speciesId) }, isActive)}
                      className={[
                        SLOT,
                        term === null ? 'min-w-14 border-dashed border-muted-foreground' : 'cursor-grab touch-none bg-background font-medium',
                        // Thick and solid where the others are thin, or dashed: the active slot is told by its outline's weight, not its colour.
                        isActive ? 'border-solid border-foreground inset-ring-2 inset-ring-foreground' : '',
                        same(at, drag?.over ?? null) ? 'bg-muted ring-3 ring-ring' : '',
                        same(at, drag?.from ?? null) ? 'opacity-40' : '',
                      ].join(' ')}
                      onKeyDown={(event) => slotKey(event, at)}
                      {...pointer(term && { speciesId: term.speciesId, from: at }, (byKey) => {
                        go(at)
                        if (term === null) return
                        setEdited({ side, speciesId: term.speciesId })
                        toControls.current = byKey
                      })}
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
              <p className={`flex items-center text-muted-foreground ${TAP}`}>{text.slotHelp}</p>
            ) : (
              <TermControls
                name={text.slot.term(formula(edited!.speciesId), editedAt)}
                formula={formula(edited!.speciesId)}
                term={termAt(editedAt)!}
                states={states}
                text={text}
                onStep={(by) => {
                  const coefficient = termAt(editedAt)!.coefficient + by
                  const next = changeTerm(row, editedAt, { coefficient })
                  if (next === row) say(text.coefficientLimit, true)
                  else change(next, text.slot.coefficient(formula(edited!.speciesId), coefficient))
                }}
                onState={(state) => change(changeTerm(row, editedAt, { state }), text.slot.state(formula(edited!.speciesId), state))}
                onRemove={() => {
                  // Its controls go with the term, and focus goes to the slot it leaves.
                  formRef.current?.querySelector<HTMLElement>(`[data-place="${editedAt.side}:${editedAt.index}"]`)?.focus()
                  take(editedAt)
                }}
              />
            )}
          </div>
          {!bankFirst && bank}
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
          <span className={editable ? `font-medium ${ROLE.entry}` : 'font-medium'}>{text.yourEquation}: </span>
          <span className={`text-base ${ROLE.value}`}>
            <EquationLine entry={editable ? entered(row) : recorded!.entry} formula={formula} noReaction={text.noReaction ?? ''} />
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
          {changeable ? text.change : text.check}
        </Button>
        {cancellable && (
          <Button type="button" variant="outline" className={TAP} onClick={cancel}>
            {text.cancel}
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
