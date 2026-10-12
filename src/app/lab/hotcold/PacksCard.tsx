import { useEffect, useId, useMemo, useRef } from 'react'
import { Disclosure, Sources } from '@/app/explore/InspectorCard'
import { Control } from '@/app/lab/Control'
import { Line, useSaid } from '@/app/lab/Line'
import { ROLE } from '@/app/lab/roles'
import { Marked, Step } from '@/app/lab/stationPieces'
import { Worksheet } from '@/app/lab/Worksheet'
import { hotcoldCitations } from '@/chem-data/citations'
import { isSaltId, type HotcoldData } from '@/chem-data/hotcold/data'
import type { Source } from '@/chem-data/schema'
import type { Action, Blocked, Mode, PacksView, Question } from '@/engine/hotcold'
import { BENCH_TEXT, PACKS_TEXT, PAGE_TEXT, PART_AIM, QUESTION_TEXT, SOURCES_TEXT, blockedText, packsProgressOf, partNotes, partTitle, saltChoices, saltName } from './messages'
import { ProgressLabel } from './RunCard'

export interface PacksCardProps {
  data: HotcoldData
  sources: readonly Source[]
  mode: Mode
  view: PacksView
  /** Part 3 can be answered again: its answers are checked and not both right. */
  missed: boolean
  can(action: Action): Blocked | null
  act(action: Action): void
  /** The part's heading, which takes focus when the part comes to be shown. */
  headingRef?: (element: HTMLHeadingElement | null) => void
}

/**
 * Part 3: the two questions the two runs answer (spec 26.1), each answered by choosing one of the two salts. Until
 * a run of each salt counts, one sentence says what opens it. The questions are the shell's notebook
 * (../Worksheet.tsx) with two entries that are choices, so they are asked one at a time and checked as the runs'
 * notebooks are: in Guided each as it is given, and in Challenge together, when asked. Answers that are checked and
 * not both right can be emptied and given again; focus then goes to the part's heading. Once both are right, the
 * part's notes are there to open, closed.
 */
export function PacksCard({ data, sources, mode, view, missed, can, act, headingRef }: PacksCardProps) {
  const headingId = useId()
  const placeId = useId()
  const heading = useRef<HTMLHeadingElement | null>(null)
  const resultRef = useRef<HTMLParagraphElement>(null)
  const [said, say] = useSaid()
  const cited = useMemo(() => hotcoldCitations(data, 'packs', sources, view.done), [data, sources, view.done])
  const completed = can({ type: 'checkPacks' }) === 'lab-completed'
  // The questions' own controls go when they are checked: focus goes to what the check found. Never on load.
  const wasChecked = useRef(view.checked)
  useEffect(() => {
    if (view.checked && !wasChecked.current) resultRef.current?.focus()
    wasChecked.current = view.checked
  }, [view.checked])
  const checkBlocked = can({ type: 'checkPacks' })
  return (
    <section aria-labelledby={headingId} className="grid min-w-0 gap-3">
      <div className="grid gap-1">
        <p id={placeId} className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            <ProgressLabel progress={packsProgressOf(view)} />
          </span>
        </p>
        <h2
          ref={(element) => {
            heading.current = element
            headingRef?.(element)
          }}
          id={headingId}
          tabIndex={-1}
          aria-describedby={placeId}
          className="w-fit rounded-sm text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {partTitle(data, 'packs')}
        </h2>
        <p className="max-w-prose text-sm">{PART_AIM.packs}</p>
        {/* Always there, and empty until the part is done, so that a screen reader says it when it comes. */}
        <p ref={resultRef} tabIndex={-1} role="status" className="w-fit rounded-sm text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {view.done ? <Marked mark="✓" done>{PACKS_TEXT.done}</Marked> : missed ? <Marked mark="✗">{PACKS_TEXT.missed}</Marked> : null}
        </p>
      </div>
      <Step heading={PACKS_TEXT.questions}>
        {view.open && !view.checked && <p className="max-w-prose text-muted-foreground">{PACKS_TEXT.from}</p>}
        <div className="grid w-full justify-items-start gap-3">
          <Worksheet<Question, string, { follows: boolean }>
            entries={view.questions.map(({ id, answer, right }) => ({ field: id, value: answer, held: null, verdict: right === null ? null : { follows: right } }))}
            guided={mode === 'guided'}
            closed={view.open ? null : blockedText(data, null, 'runs-not-done')}
            over={view.checked || completed}
            label={(question) => QUESTION_TEXT[question]}
            choices={() => saltChoices(data)}
            signed={() => false}
            typedText={(_question, value) => value}
            enteredText={(_question, value) => (isSaltId(value) ? saltName(data, value) : value)}
            help={() => blockedText(data, null, 'not-a-salt')}
            relation={() => PACKS_TEXT.hint}
            feedback={(_question, verdict) => (verdict.follows ? '' : PACKS_TEXT.notRightHelp)}
            invalid={() => blockedText(data, null, 'not-a-salt')}
            parse={(_question, text) => (text === '' ? null : text)}
            enter={(question, value) => {
              if (!isSaltId(value)) return blockedText(data, null, 'not-a-salt')
              const action: Action = { type: 'answer', question, salt: value }
              const blocked = can(action)
              if (blocked !== null) return blockedText(data, null, blocked)
              act(action)
              return null
            }}
            checkHeld={checkBlocked === null ? null : blockedText(data, null, checkBlocked)}
            onCheck={() => act({ type: 'checkPacks' })}
            text={{ hint: PACKS_TEXT.hintSummary, check: PACKS_TEXT.check, enter: PAGE_TEXT.enter, change: PAGE_TEXT.change, cancel: PAGE_TEXT.cancel, changeNote: PACKS_TEXT.changeNote, follows: PACKS_TEXT.right, not: PACKS_TEXT.notRight }}
          />
        </div>
        {missed && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <Control
              unavailable={can({ type: 'answerAgain' }) !== null}
              className="min-h-11 px-4"
              onClick={() => {
                const blocked = can({ type: 'answerAgain' })
                if (blocked !== null) return say(blockedText(data, null, blocked), true)
                act({ type: 'answerAgain' })
                heading.current?.focus()
              }}
            >
              {PACKS_TEXT.again}
            </Control>
            <p className="max-w-prose flex-1 basis-48 text-muted-foreground">{PACKS_TEXT.againHelp}</p>
          </div>
        )}
        <Line said={said} />
        {completed && !view.done && <p className={ROLE.held}>{blockedText(data, null, 'lab-completed')}</p>}
        {/* Once the part is done and not before, and closed: what the record says of packs. */}
        {view.done && (
          <div className="pt-2">
            <Disclosure summary={BENCH_TEXT.notes}>
              <div className="grid max-w-[75ch] gap-2 leading-relaxed">
                {partNotes(data, 'packs').map((note) => (
                  <p key={note}>{note}</p>
                ))}
              </div>
            </Disclosure>
          </div>
        )}
      </Step>
      <div className="pt-4 pb-2">
        <Sources citations={cited} derived={SOURCES_TEXT} />
      </div>
    </section>
  )
}
