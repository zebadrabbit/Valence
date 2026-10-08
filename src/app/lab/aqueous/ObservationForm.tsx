import { useId, useState } from 'react'
import { ROLE } from '@/app/lab/roles'
import { entryKey, fieldState, useEntryFocus } from '@/app/lab/titration/entry'
import { Button } from '@/components/ui/button'
import type { AqueousData } from '@/chem-data/aqueous/data'
import type { Field, Observation, StationView, ToolUse } from '@/engine/aqueous'
import { Line, Mark, useSaid } from './Line'
import { FIELD_LABEL, PAGE_TEXT, choiceList, observationFeedback, toolFirstText } from './messages'

export interface ObservationFormProps {
  data: AqueousData
  view: StationView
  /** For each field, the uses of a tool any one of which shows it: for what the eye sees, the look at its part of the tube. */
  shownBy(field: Field): ToolUse[]
  /** Where nothing can be recorded here now whatever is chosen, the id of the sentence on the station that says why; else null. */
  held: string | null
  /** Why this observation cannot be recorded as it stands, in words, or null. */
  refusal(observation: Observation): string | null
  /** Records it, and hands back the fields that are not the tube's. Called only with one that can be recorded. */
  onRecord(observation: Observation): Field[]
}

const CHOICE =
  'flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 py-1 has-checked:border-foreground has-checked:bg-muted has-checked:font-medium has-disabled:cursor-default has-focus-visible:ring-2 has-focus-visible:ring-ring'

/**
 * The observation of a station: one question for each field its tools can show, each a group of radio buttons, and
 * one button that records and checks them all. A question whose part of the tube has not been looked at, or whose
 * tool has not been used yet, is disabled, with what to do first under it. Once the observation is correct the questions are disabled and show it, and the button
 * reads "Change", as an entry made in the titration lab does.
 */
export function ObservationForm({ data, view, shownBy, held, refusal, onRecord }: ObservationFormProps) {
  const recorded = view.observation
  const [draft, setDraft] = useState<Observation>(recorded ?? {})
  const [changing, setChanging] = useState(false)
  const [said, say] = useSaid(view.wrongFields === null ? '' : observationFeedback(view.wrongFields))
  // What the line says is of the observation as recorded: null once an answer has been changed since.
  const [judged, setJudged] = useState<boolean | null>(view.wrongFields === null ? null : view.wrongFields.length === 0)
  const name = useId()
  const correct = view.wrongFields?.length === 0
  const { editable, changeable, cancellable } = fieldState(correct, held !== null, changing)
  const focus = useEntryFocus(editable)
  const shown = editable ? draft : (recorded ?? {})
  const reason = held !== null || !editable ? null : refusal(draft)

  const cancel = () => {
    focus.button.current?.focus()
    setChanging(false)
    setDraft(recorded ?? {})
    setJudged(true)
    say(observationFeedback([]))
  }
  return (
    <form
      noValidate
      className="grid justify-items-start gap-3"
      onKeyDown={(event) => entryKey(event, cancellable ? cancel : null)}
      onSubmit={(event) => {
        event.preventDefault()
        if (changeable) {
          setDraft(recorded!)
          return setChanging(true)
        }
        // What holds the whole form is said at the station's head, and is the button's description.
        if (held !== null) return
        if (reason !== null) return say(reason, true)
        const wrong = onRecord(draft)
        setChanging(false)
        setJudged(wrong.length === 0)
        say(observationFeedback(wrong))
      }}
    >
      {view.fields.map((field, at) => {
        const tools = shownBy(field)
        const waiting = tools.length > 0 && !tools.some((tool) => view.used.includes(tool))
        const again = editable && judged === false && view.wrongFields?.includes(field) && draft[field] === recorded?.[field]
        return (
          <fieldset key={field} disabled={!editable || waiting} aria-describedby={again ? `${name}${field}again` : undefined} className="grid w-full gap-1.5">
            <legend className={`mb-1.5 font-medium ${editable && !waiting ? ROLE.entry : ''}`}>{FIELD_LABEL[field]}</legend>
            {/* Beside the question and not in its name, which stays the question. */}
            {again && (
              <p id={`${name}${field}again`} className={ROLE.failed}>
                <span aria-hidden="true">✕ </span>
                {PAGE_TEXT.lookAgain}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {choiceList(data, field).map(({ value, label }, i) => (
                <label key={value} className={CHOICE}>
                  <input
                    ref={at === 0 && (shown[field] === undefined ? i === 0 : shown[field] === value) ? focus.field : undefined}
                    type="radio"
                    name={`${name}${field}`}
                    value={value}
                    checked={shown[field] === value}
                    onChange={() => {
                      setDraft({ ...draft, [field]: value })
                      setJudged(null)
                      say('')
                    }}
                  />
                  {label}
                </label>
              ))}
            </div>
            {waiting && held === null && <p className={ROLE.held}>{toolFirstText(tools)}</p>}
          </fieldset>
        )
      })}
      <div className="flex flex-wrap gap-1.5">
        {/* Stays focusable when it cannot be used, and says why when pressed. */}
        <Button ref={focus.button} type="submit" variant="outline" aria-disabled={held !== null || (!changeable && reason !== null) || undefined} aria-describedby={held ?? undefined} className="min-h-11 aria-disabled:opacity-50">
          {changeable ? PAGE_TEXT.change : PAGE_TEXT.checkObservations}
        </Button>
        {cancellable && (
          <Button type="button" variant="outline" className="min-h-11" onClick={cancel}>
            {PAGE_TEXT.cancel}
          </Button>
        )}
      </div>
      <Line said={said} mark={judged === null || said.held ? undefined : <Mark ok={judged} />} />
    </form>
  )
}
