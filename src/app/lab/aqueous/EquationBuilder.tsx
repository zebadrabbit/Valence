import { X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Control } from '@/app/lab/Control'
import { ROLE } from '@/app/lab/roles'
import { entryKey, fieldState } from '@/app/lab/titration/entry'
import { Button } from '@/components/ui/button'
import type { AqueousData } from '@/chem-data/aqueous/data'
import type { Entry, Form, Problem, State, StationView } from '@/engine/aqueous'
import { EMPTY, MAX_COEFFICIENT, addTerm, changeTerm, entered, removeTerm, sameEntry, setNoReaction, type Side } from './builder'
import { EquationLine, Formula, formulaOf } from './Formula'
import { Line, Mark, useSaid } from './Line'
import { BENCH_TEXT, FORM_LABEL, PAGE_TEXT, STATE_NAME, alreadyOnSide, equationFeedback } from './messages'

export interface EquationBuilderProps {
  data: AqueousData
  form: Form
  /** The station's palette: the ids of the species an equation is built from. */
  palette: readonly string[]
  /** The equation last entered in this form, with what the engine finds wrong with it. */
  judged: StationView['equations'][Form]
  /** Where no equation can be entered here now whatever is built, the id of the sentence on the station that says why; else null. */
  held: string | null
  /** Why this entry cannot be entered as it stands, in words, or null. */
  refusal(entry: Entry): string | null
  /** Enters it, and hands back what kind of thing is wrong with it, or null. Called only with one that can be entered. */
  onEnter(entry: Entry): Problem | null
}

const STATES: readonly State[] = ['aq', 's', 'l', 'g']
const SIDES: readonly Side[] = ['reactants', 'products']
const SIDE_HEADING: Record<Side, string> = { reactants: BENCH_TEXT.reactants, products: BENCH_TEXT.products }
const SIDE_BUTTON: Record<Side, string> = { reactants: PAGE_TEXT.reactant, products: PAGE_TEXT.product }
/** A target a finger finds: 44 px each way at the least. */
const TAP = 'min-h-11 min-w-11'
const STATE_CHOICE =
  'flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border px-1.5 has-checked:border-foreground has-checked:bg-foreground has-checked:font-semibold has-checked:text-background has-focus-visible:ring-2 has-focus-visible:ring-ring'

const feedback = (problem: Problem | null) => (problem === null ? equationFeedback(null) : `${PAGE_TEXT.notCorrect}. ${equationFeedback(problem)}`)

/**
 * One equation of a station, built by taps and never typed (spec 8.3): the choice "No reaction", the equation as
 * built in one line, the station's palette, and under it the terms on each side, each with its coefficient, its
 * state and a way to take it out. Choosing a species asks which side it goes on, in two buttons where the hint
 * stood, and adds it there. "Check" enters the equation and says what kind of thing is wrong, never the answer. A
 * correct equation is shown as its one line, with "Change" beside it.
 */
export function EquationBuilder({ data, form, palette, judged, held, refusal, onEnter }: EquationBuilderProps) {
  const [draft, setDraft] = useState<Entry>(judged?.entry ?? EMPTY)
  const [changing, setChanging] = useState(false)
  // The species chosen from the palette, while the side it goes on is asked.
  const [asking, setAsking] = useState<string | null>(null)
  const [said, say] = useSaid(judged ? feedback(judged.problem) : '')
  // Whether the line is the check of the equation as it stands: null once it has been changed since.
  const [checked, setChecked] = useState<boolean | null>(judged ? judged.problem === null : null)
  const headingId = useId()
  const name = useId()
  const button = useRef<HTMLButtonElement>(null)
  const firstSide = useRef<HTMLButtonElement>(null)
  const species = useRef(new Map<string, HTMLButtonElement | null>())
  const correct = judged?.problem === null
  const { editable, changeable, cancellable } = fieldState(correct, held !== null, changing)

  // The side is asked where the hint stood, and its first button takes focus.
  useEffect(() => {
    if (asking !== null) firstSide.current?.focus()
  }, [asking])

  const change = (next: Entry) => {
    if (next === draft) return
    setDraft(next)
    setChecked(null)
    say('')
  }
  const backTo = (speciesId: string) => {
    setAsking(null)
    species.current.get(speciesId)?.focus()
  }
  const cancel = () => {
    button.current?.focus()
    setChanging(false)
    setAsking(null)
    setDraft(judged!.entry)
    setChecked(true)
    say(feedback(null))
  }
  const step = (side: Side, speciesId: string, coefficient: number) => {
    const next = changeTerm(draft, side, speciesId, { coefficient })
    if (next === draft) say(PAGE_TEXT.coefficientLimit, true)
    else change(next)
  }
  const reason = held !== null || !editable ? null : refusal(entered(draft))

  return (
    <form
      noValidate
      aria-labelledby={headingId}
      className="grid gap-2 rounded-md border p-3"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && asking !== null) return backTo(asking)
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
        const problem = onEnter(entered(draft))
        setChanging(false)
        setAsking(null)
        setChecked(problem === null)
        say(feedback(problem))
      }}
    >
      <h4 id={headingId} className="font-medium">
        {FORM_LABEL[form]}
      </h4>
      {editable && (
        <label className={`flex w-fit cursor-pointer items-center gap-2 rounded-md border px-3 has-checked:border-foreground has-checked:bg-muted has-checked:font-medium has-focus-visible:ring-2 has-focus-visible:ring-ring ${TAP}`}>
          <input
            type="checkbox"
            checked={draft.noReaction}
            onChange={(event) => {
              setAsking(null)
              change(setNoReaction(draft, event.target.checked))
            }}
          />
          {BENCH_TEXT.noReaction}
        </label>
      )}
      <p>
        <span className={editable ? `font-medium ${ROLE.entry}` : 'font-medium'}>{PAGE_TEXT.yourEquation}: </span>
        {judged === null && sameEntry(draft, EMPTY) ? (
          <span className="text-muted-foreground">{PAGE_TEXT.nothingBuilt}</span>
        ) : (
          <span className={`text-base ${ROLE.value}`}>
            <EquationLine data={data} entry={editable ? draft : judged!.entry} />
          </span>
        )}
      </p>
      {editable && !draft.noReaction && (
        <>
          <div role="group" aria-label={PAGE_TEXT.palette} className="flex flex-wrap gap-1.5">
            {palette.map((speciesId) => (
              <Button
                key={speciesId}
                ref={(element) => void species.current.set(speciesId, element)}
                type="button"
                variant="outline"
                aria-pressed={asking === speciesId}
                className={`px-3 text-base ${TAP}`}
                onClick={() => setAsking(speciesId)}
              >
                <span>
                  <Formula text={formulaOf(data, speciesId)} />
                </span>
              </Button>
            ))}
          </div>
          {asking === null ? (
            <p className={`flex items-center text-muted-foreground ${TAP}`}>{PAGE_TEXT.paletteHelp}</p>
          ) : (
            <div role="group" aria-label={PAGE_TEXT.whichSide(formulaOf(data, asking))} className={`flex flex-wrap items-center gap-1.5 ${TAP}`}>
              <span>
                {PAGE_TEXT.add}{' '}
                <strong className="font-semibold">
                  <Formula text={formulaOf(data, asking)} />
                </strong>{' '}
                {PAGE_TEXT.asA}
              </span>
              {SIDES.map((side, i) => {
                const there = draft[side].some((term) => term.speciesId === asking)
                return (
                  <Control
                    key={side}
                    ref={i === 0 ? firstSide : undefined}
                    unavailable={there}
                    className={`px-4 ${TAP}`}
                    onClick={() => {
                      if (there) return say(alreadyOnSide(formulaOf(data, asking), side), true)
                      change(addTerm(draft, side, asking))
                      backTo(asking)
                    }}
                  >
                    {SIDE_BUTTON[side]}
                  </Control>
                )
              })}
              <Button type="button" variant="ghost" className={TAP} onClick={() => backTo(asking)}>
                {PAGE_TEXT.cancel}
              </Button>
            </div>
          )}
          {SIDES.map(
            (side) =>
              draft[side].length > 0 && (
                <div key={side} role="group" aria-label={SIDE_HEADING[side]} className="grid gap-1">
                  <p className="text-xs font-medium text-muted-foreground">{SIDE_HEADING[side]}</p>
                  <ul className="@container grid gap-1.5">
                    {draft[side].map((term) => {
                      const formula = formulaOf(data, term.speciesId)
                      return (
                        <li key={term.speciesId}>
                          {/* Two rows where the builder is narrow, the formula and its coefficient over the state and the way out; one row where it is not. The order is the same in both. */}
                          <div role="group" aria-label={formula} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-md bg-muted/50 p-1.5 @lg:grid-cols-[minmax(3.5rem,1fr)_auto_auto_auto]">
                            <span className="text-base font-medium">
                              <Formula text={formula} />
                            </span>
                            <span className="flex items-center gap-1">
                              <Control unavailable={term.coefficient <= 1} aria-label={PAGE_TEXT.fewer} className={TAP} onClick={() => step(side, term.speciesId, term.coefficient - 1)}>
                                −
                              </Control>
                              <span className="min-w-6 text-center text-base tabular-nums">
                                <span className="sr-only">{PAGE_TEXT.coefficient}: </span>
                                {term.coefficient}
                              </span>
                              <Control unavailable={term.coefficient >= MAX_COEFFICIENT} aria-label={PAGE_TEXT.more} className={TAP} onClick={() => step(side, term.speciesId, term.coefficient + 1)}>
                                +
                              </Control>
                            </span>
                            <span role="radiogroup" aria-label={PAGE_TEXT.state} className="flex gap-1">
                              {STATES.map((state) => (
                                <label key={state} className={STATE_CHOICE}>
                                  <input
                                    type="radio"
                                    className="sr-only"
                                    name={`${name}${side}${term.speciesId}`}
                                    aria-label={`${state}: ${STATE_NAME[state]}`}
                                    checked={term.state === state}
                                    onChange={() => change(changeTerm(draft, side, term.speciesId, { state }))}
                                  />
                                  <span aria-hidden="true">({state})</span>
                                </label>
                              ))}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              aria-label={PAGE_TEXT.remove(formula)}
                              className={`justify-self-end ${TAP}`}
                              onClick={() => {
                                change(removeTerm(draft, side, term.speciesId))
                                species.current.get(term.speciesId)?.focus()
                              }}
                            >
                              <X aria-hidden="true" />
                            </Button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ),
          )}
        </>
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
    </form>
  )
}
