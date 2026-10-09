import { useEffect, useId, useRef, useState, type Ref } from 'react'
import { ChoiceForm, type Answers } from '@/app/lab/ChoiceForm'
import { Paged } from '@/app/lab/Paged'
import { ROLE } from '@/app/lab/roles'
import { Marked } from '@/app/lab/stationPieces'
import type { FlameData } from '@/chem-data/flame/data'
import type { Source } from '@/chem-data/schema'
import { closingView, stationView, type Action, type Blocked, type FlameState, type Warning } from '@/engine/flame'
import { BENCH_TEXT, BLOCKED_TEXT, CLOSING, CLOSING_PROGRESS_TEXT, PAGE_TEXT, STATION_TEXT, closingFeedback, stationTitle } from './messages'
import { ProgressLabel, StationCard } from './StationCard'
import { closingProgressOf, openingEntry, progressOf, type ClosingProgress } from './stationLook'

export interface FlameBenchProps {
  data: FlameData
  sources: readonly Source[]
  state: FlameState
  reducedMotion: boolean
  can(action: Action): Blocked | null
  warn(action: Action): Warning[]
  /** Does the action, and hands back the record as it then stands. */
  act(action: Action): FlameState
  /** The entry shown when the bench mounts, counted from 0, the closing question being the one after the stations; where the stored record says the learner was, unless told. The markup tests draw the others with it. */
  opensAt?: number
}

const CLOSING_MARK: Record<ClosingProgress, string> = { waits: '○', open: '○', 'not-correct': '◑', done: '✓' }
const ClosingLabel = ({ progress }: { progress: ClosingProgress }) => (
  <Marked mark={CLOSING_MARK[progress]} done={progress === 'done'}>
    {CLOSING_PROGRESS_TEXT[progress]}
  </Marked>
)
// The one question of the closing form.
const QUESTION = 'closing'

/**
 * The closing question, the last entry of the list: asked in both modes, and open once the six stations are done.
 * Until then it is there and disabled, with the reason under it. A wrong answer is told why it cannot be the
 * answer and can be changed; the right one completes the lab.
 */
function ClosingCard({ data, state, can, act, headingRef }: Pick<FlameBenchProps, 'data' | 'state' | 'can' | 'act'> & { headingRef: Ref<HTMLHeadingElement> }) {
  const headingId = useId()
  const placeId = useId()
  const heldId = useId()
  const closing = closingView(data, state)
  const answer = (choice: string): Action => ({ type: 'answerClosing', choice })
  const completed = state.status === 'completed'
  const judged = (choice: string, correct: boolean) => ({ wrong: correct ? [] : [QUESTION], text: closingFeedback(choice) })
  return (
    <section aria-labelledby={headingId} className="grid min-w-0 gap-3">
      <div className="grid gap-1">
        <p id={placeId} className="text-xs text-muted-foreground">
          {STATION_TEXT.closingPlace}
          {' · '}
          <span className="font-medium text-foreground">
            <ClosingLabel progress={closingProgressOf(closing)} />
          </span>
        </p>
        <h2 ref={headingRef} id={headingId} tabIndex={-1} aria-describedby={placeId} className="w-fit rounded-sm text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {CLOSING.heading}
        </h2>
        {completed && (
          <p id={heldId} className={`text-sm ${ROLE.held}`}>
            {BLOCKED_TEXT['lab-completed']}
          </p>
        )}
      </div>
      <div className="grid min-w-0 justify-items-start gap-3 rounded-lg border bg-card p-4 text-sm">
        <ChoiceForm
          questions={[{ id: QUESTION, label: CLOSING.question, choices: data.closing.choices.map((value) => ({ value, label: CLOSING.choices[value]! })), waits: closing.open ? null : CLOSING.waits }]}
          recorded={closing.answer === null ? null : { [QUESTION]: closing.answer }}
          judged={closing.answer === null ? null : judged(closing.answer, closing.correct === true)}
          held={completed ? heldId : null}
          refusal={(answers: Answers) => {
            const blocked = can(answer(answers[QUESTION] ?? ''))
            return blocked === null ? null : blocked === 'invalid-entry' ? PAGE_TEXT.chooseAnswer : BLOCKED_TEXT[blocked]
          }}
          onRecord={(answers: Answers) => {
            const choice = answers[QUESTION]!
            return judged(choice, closingView(data, act(answer(choice))).correct === true)
          }}
          text={{ check: PAGE_TEXT.checkAnswer, change: PAGE_TEXT.change, cancel: PAGE_TEXT.cancel }}
        />
      </div>
    </section>
  )
}

/**
 * The Lab tab of the flame test lab: the line that says the lab is complete, and the six stations and the closing
 * question one at a time (Paged), with the list that says how far each has come.
 *
 * An entry is drawn from the first time it is shown, and stays drawn after it: the others that have been shown are
 * hidden, out of the layout, the tab order and a screen reader's reading, so that a station keeps what was chosen
 * there but not yet checked while another is looked at. Changing entry moves focus to the heading of the one shown.
 */
export function FlameBench({ data, sources, state, reducedMotion, can, warn, act, opensAt }: FlameBenchProps) {
  const views = data.salts.map((salt) => stationView(data, state, salt.id))
  const progress = views.map(progressOf)
  const closing = closingProgressOf(closingView(data, state))
  const [index, setIndex] = useState(() => opensAt ?? openingEntry(progress))
  // The entries that have been shown, the one shown now among them.
  const [visited, setVisited] = useState<readonly number[]>([index])
  const headings = useRef<(HTMLHeadingElement | null)[]>([])
  const shown = useRef(index)
  useEffect(() => {
    if (shown.current !== index) headings.current[index]?.focus()
    shown.current = index
  }, [index])
  const last = data.salts.length
  const title = (at: number) => (at === last ? CLOSING.heading : stationTitle(data, data.salts[at]!.id))

  return (
    <div className="grid gap-3">
      {/* Always there, and empty until the lab is complete, so that a screen reader says it when it comes. */}
      <p role="status" className="text-sm font-medium">
        {state.status === 'completed' && <Marked mark="✓" done>{BENCH_TEXT.complete}</Marked>}
      </p>
      <Paged
        items={[
          ...data.salts.map((salt, i) => ({ id: salt.id, heading: salt.name, note: <ProgressLabel progress={progress[i]!} /> })),
          { id: QUESTION, heading: CLOSING.heading, note: <ClosingLabel progress={closing} /> },
        ]}
        index={index}
        onGo={(to) => {
          setIndex(to)
          if (!visited.includes(to)) setVisited([...visited, to])
          // The entry already shown: its heading takes focus all the same, as the list is closed under it.
          if (to === index) headings.current[index]?.focus()
        }}
        text={{ list: STATION_TEXT.list, previous: () => STATION_TEXT.previous(title(index - 1)), next: () => STATION_TEXT.next(title(index + 1)) }}
        // The spectroscope's strip is wide: the list is beside the station only where the station still has the strip's full width.
        roomy
      >
        {data.salts.map(
          (salt, i) =>
            visited.includes(i) && (
              <div key={salt.id} hidden={i !== index}>
                <StationCard
                  data={data}
                  sources={sources}
                  stationId={salt.id}
                  state={state}
                  view={views[i]!}
                  reducedMotion={reducedMotion}
                  can={can}
                  warn={warn}
                  act={act}
                  record={(observation) => stationView(data, act({ type: 'recordObservation', stationId: salt.id, observation }), salt.id)}
                  headingRef={(element) => void (headings.current[i] = element)}
                />
              </div>
            ),
        )}
        {visited.includes(last) && (
          <div hidden={index !== last}>
            <ClosingCard data={data} state={state} can={can} act={act} headingRef={(element) => void (headings.current[last] = element)} />
          </div>
        )}
      </Paged>
    </div>
  )
}
