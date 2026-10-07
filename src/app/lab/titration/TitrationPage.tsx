import { useEffect, useId, useRef, useState, type Ref } from 'react'
import { ACTIVITIES } from '@/app/activities'
import { useAppState } from '@/app/AppState'
import { LabShell } from '@/app/lab/LabShell'
import { Primer } from '@/app/lab/Primer'
import { SHELL_TEXT } from '@/app/lab/shellText'
import { useLabProgress } from '@/app/lab/useLabProgress'
import { useMediaQuery } from '@/app/useMediaQuery'
import { Button } from '@/components/ui/button'
import { titrationCitations } from '@/chem-data/citations'
import sources from '@/chem-data/sources.json'
import { titrationData } from '@/chem-data/titration/data'
import { READ_FIRST, TITRATION_PRIMER } from '@/chem-data/titration/primer'
import { can, checklist, createLab, currentTrial, modelFrom, reduce, titrationStateSchema, type Action, type Mode, type Warning } from '@/engine/titration'
import { benchViewOf } from './benchView'
import { decide, readingAction, type Decision } from './controller'
import { Guide } from './Guide'
import { blockedText, hclRecordedText, INVALID_ENTRY_TEXT, readingRecordedText, WARNING_BUTTONS, WARNING_TEXT } from './messages'
import { NotebookPanel, TrialRecord, type EntryReply } from './Notebook'
import type { ReadingReply } from './ReadingInput'
import { TitrationBench } from './TitrationBench'

const [TITRATION] = ACTIVITIES
const MODEL = modelFrom(titrationData)
const MODEL_CITATIONS = titrationCitations(titrationData, sources)
const { pinkDisplayScale, faintPinkNameLimit, plumeFadeAtOnceSeconds, plumeFadeSlowlySeconds } = titrationData.parameters
const DISPLAY = {
  pinkDisplayScale: pinkDisplayScale.value,
  faintPinkNameLimit: faintPinkNameLimit.value,
  plumeFadeAtOnceSeconds: plumeFadeAtOnceSeconds.value,
  plumeFadeSlowlySeconds: plumeFadeSlowlySeconds.value,
}

/** What the bench is told of an action, by what the page decided. */
const ANSWER = { do: 'done', ask: 'asked', refuse: 'refused' } as const

/** A 32-bit seed from the browser's random source. Drawn here: the engine never makes one. */
const drawSeed = () => crypto.getRandomValues(new Uint32Array(1))[0]!

/** The actions Guided asks about before doing: the three the engine raises a warning for. */
type AskedAction = Extract<Action, { type: keyof typeof WARNING_BUTTONS }>
const isAsked = (action: Action): action is AskedAction => action.type in WARNING_BUTTONS

/** An action held for the learner's answer, with the control that raised it, where focus goes back to. */
interface Asked {
  action: AskedAction
  warnings: Warning[]
  from: HTMLElement | null
}

/**
 * Guided's warning before a technique step is skipped, drawn in the bench's notice slot: a group named by the
 * warnings it lists, which takes focus, with one way back and one way on however many it lists. It is not modal:
 * any other action that reaches the page drops it, and after a reload the action has simply not happened. The one
 * press the bench answers by itself (benchAnswer: a conditioned burette pressed again) does not reach the page and
 * leaves it showing, still true and still to be answered.
 */
function WarningGroup({ asked, onBack, onGoOn, ref }: { asked: Asked; onBack(): void; onGoOn(): void; ref: Ref<HTMLDivElement> }) {
  const id = useId()
  const buttons = WARNING_BUTTONS[asked.action.type]
  return (
    <div
      ref={ref}
      role="group"
      tabIndex={-1}
      aria-labelledby={asked.warnings.map((warning) => `${id}${warning}-title`).join(' ')}
      aria-describedby={asked.warnings.map((warning) => `${id}${warning}-body`).join(' ')}
      className="grid gap-2 rounded-md border-2 p-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {asked.warnings.map((warning) => (
        <div key={warning} className="grid gap-1">
          <p id={`${id}${warning}-title`} className="font-medium">
            {WARNING_TEXT[warning].title}
          </p>
          <p id={`${id}${warning}-body`}>{WARNING_TEXT[warning].body}</p>
        </div>
      ))}
      <div className="flex flex-wrap gap-1.5">
        <Button variant="outline" onClick={onBack}>
          {buttons.back}
        </Button>
        <Button variant="outline" onClick={onGoOn}>
          {buttons.on}
        </Button>
      </div>
    </div>
  )
}

/**
 * #/lab/titration: the one place the engine, the bench and the notebook meet. The state is the stored record, read
 * once when the page mounts and taken again only when another tab saves it; every action of the learner's is
 * decided on here, and every change of the state is saved, the additions of an open stopcock and a trial the
 * engine ended included. Nothing is stored until Start, so opening the page leaves Home at "Not started".
 */
export function TitrationPage() {
  const { persistent, reducedMotion } = useAppState()
  // The rail's own query (Layout.tsx), so no width falls between the two.
  const narrow = !useMediaQuery('(min-width: 768px)')
  const [lab, save, { setAside, taken }] = useLabProgress(TITRATION, titrationStateSchema)
  // The mode chosen before Start. From Start on, the mode is the run's.
  const [chosen, setChosen] = useState<Mode>('guided')
  const [asked, setAsked] = useState<Asked | null>(null)
  // The action the learner went on with after a warning, for the bench to say, until the next action.
  const [confirmed, setConfirmed] = useState<AskedAction | null>(null)
  // Counts what the notebook has done, for the bench, whose message line is then of the bench as it was before.
  const [notebookDone, setNotebookDone] = useState(0)
  // A record taken from another tab: a warning held for an action on the one before is dropped with it, and the
  // bench and the notebook are made anew (their keys), with the stopcock closed and nothing said.
  const [takenSeen, setTakenSeen] = useState(taken)
  if (taken !== takenSeen) {
    setTakenSeen(taken)
    setAsked(null)
    setConfirmed(null)
  }
  const warningRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLElement>(null)
  const benchRef = useRef<HTMLElement>(null)

  // A warning takes focus when it is raised, and again when the same action raises it again.
  useEffect(() => {
    if (asked) warningRef.current?.focus()
  }, [asked])

  // Where focus goes when the control it was on has gone or can no longer be used: to the last result when a trial
  // ends, however it ended, and to the bench when the next one starts. Never on load.
  const trials = lab?.trials.length ?? 0
  const ended = lab !== null && currentTrial(lab).end !== 'open'
  const was = useRef({ trials, ended })
  useEffect(() => {
    const before = was.current
    was.current = { trials, ended }
    if (ended && !before.ended) resultRef.current?.focus()
    else if (before.trials > 0 && trials > before.trials) benchRef.current?.focus()
  }, [trials, ended])

  const mode = lab?.mode ?? chosen
  // Start and Restart both: a new seed, the mode as it is, and a new run saved over whatever was there.
  const start = () => {
    setAsked(null)
    setConfirmed(null)
    save(createLab(drawSeed(), mode))
  }
  const shell = {
    title: TITRATION.title,
    narrow,
    persistent,
    mode,
    onStart: start,
    onRestart: start,
    primer: <Primer sections={TITRATION_PRIMER} sources={sources} readFirst={READ_FIRST} modelCitations={MODEL_CITATIONS} />,
  }
  if (lab === null) return <LabShell {...shell} started={false} setAside={setAside} onMode={setChosen} bench={() => null} notebook={null} record={null} />

  const view = benchViewOf(MODEL, lab)
  const dispatch = (action: Action) => {
    const next = reduce(MODEL, lab, action)
    if (next !== lab) save(next)
  }
  /** Every action of the learner's: refused with the engine's reason, held for a Guided warning, or done and saved. Any of them drops a warning that was showing. */
  const attempt = (action: Action): Decision => {
    const decision = decide(MODEL, lab, action, false)
    const active = document.activeElement
    setAsked(decision.kind === 'ask' && isAsked(action) ? { action, warnings: decision.warnings, from: active instanceof HTMLElement ? active : null } : null)
    setConfirmed(null)
    if (decision.kind === 'do') dispatch(action)
    return decision
  }
  /** An action taken in the notebook. */
  const fromNotebook = (action: Action): Decision => {
    const decision = attempt(action)
    if (decision.kind === 'do') setNotebookDone((count) => count + 1)
    return decision
  }
  /** A typed entry of the notebook: what a refusal says is put under its field. */
  const entry = (action: Action, field: keyof typeof INVALID_ENTRY_TEXT, accepted = ''): EntryReply => {
    const decision = fromNotebook(action)
    return decision.kind === 'do' ? { accepted: true, text: accepted } : { accepted: false, text: decision.kind === 'refuse' ? blockedText(decision.reason, field) : '' }
  }
  const onReading = (readingUl: number): ReadingReply => {
    const action = readingAction(view, readingUl)
    // The field is disabled, with its reason, while no reading can be recorded.
    if (action === null) return { accepted: false, text: '' }
    const decision = attempt(action)
    if (decision.kind === 'do') return { accepted: true, text: readingRecordedText(view.readingWanted, readingUl) }
    // Held for a warning: an empty text, and the field keeps its value.
    return { accepted: false, text: decision.kind === 'refuse' ? blockedText(decision.reason, 'reading', readingUl) : '' }
  }
  /** Either answer to a warning takes it away and puts focus back on the control that raised it. */
  const answer = (goOn: boolean) => {
    if (!asked) return
    if (goOn && decide(MODEL, lab, asked.action, true).kind === 'do') {
      dispatch(asked.action)
      setConfirmed(asked.action)
    }
    setAsked(null)
    asked.from?.focus()
  }

  return (
    <LabShell
      {...shell}
      started
      onMode={(next) => attempt({ type: 'setMode', mode: next })}
      modeLocked={can(MODEL, lab, { type: 'setMode', mode }) !== null ? SHELL_TEXT.modeLocked : undefined}
      guide={lab.mode === 'guided' ? <Guide steps={checklist(MODEL, lab)} trialIndex={currentTrial(lab).index} /> : undefined}
      bench={(shown) => (
        // A bench of its own for each trial of each run, and for a record taken from another tab: the stopcock closed, nothing said yet, no plume.
        <TitrationBench
          key={`${lab.seed}:${trials}:${taken}`}
          ref={benchRef}
          shown={shown}
          view={view}
          display={DISPLAY}
          bottles={titrationData.bottles}
          sources={sources}
          reducedMotion={reducedMotion}
          onAction={(action) => ANSWER[attempt(action).kind]}
          onReading={onReading}
          confirmed={confirmed}
          notice={asked && <WarningGroup ref={warningRef} asked={asked} onBack={() => answer(false)} onGoOn={() => answer(true)} />}
          notebookDone={notebookDone}
        />
      )}
      notebook={
        <NotebookPanel
          key={`${lab.seed}:${taken}`}
          m={MODEL}
          state={lab}
          onHclMolarity={(molarityE6) => entry({ type: 'recordHclMolarity', molarityE6 }, 'hcl-molarity', hclRecordedText(molarityE6))}
          onMolarity={(molarityE6) => entry({ type: 'submitMolarity', molarityE6 }, 'molarity')}
          onDiscard={() => fromNotebook({ type: 'discardTrial' })}
          onNextTrial={() => attempt({ type: 'startNextTrial' })}
          onSummary={(meanE6, deviationE2) => entry({ type: 'recordSummary', meanE6, deviationE2 }, 'molarity')}
          resultRef={resultRef}
        />
      }
      record={<TrialRecord m={MODEL} state={lab} />}
    />
  )
}
