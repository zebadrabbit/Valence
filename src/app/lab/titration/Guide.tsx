import type { Step } from '@/engine/titration'
import { GUIDE_TRIAL_OVER, guideHeading, guideLine, STEP_STATE_TEXT, STEP_TEXT } from './messages'

type StepState = 'done' | 'next' | 'todo' | 'skipped'

/** Beside each step's state in words, and hidden from a screen reader, which is given the words. */
const MARK: Record<StepState, string> = { done: '✓', next: '→', todo: '○', skipped: '✕' }

/**
 * Guided's checklist for the trial under way, as the engine gives it. It reports and does not gate. It draws both
 * of its forms, the one line and the list, and lab.css displays one of them by the page's width, so the component
 * takes no layout prop and a screen reader meets one form.
 */
export function Guide({ steps, trialIndex }: { steps: { step: Step; state: StepState }[]; trialIndex: number }) {
  const label = (step: Step) => STEP_TEXT[step][trialIndex === 0 ? 'first' : 'later']
  const next = steps.findIndex(({ state }) => state === 'next')
  // A trial that has ended has no next step.
  const nextStep = steps[next]
  return (
    <section aria-label="Guided checklist" className="rounded-lg border bg-card p-3 text-sm">
      <p className="lab-guide-line">{nextStep ? guideLine(next + 1, steps.length, label(nextStep.step)) : GUIDE_TRIAL_OVER}</p>
      <div className="lab-guide-list">
        <h2 className="mb-2 font-medium">{guideHeading(trialIndex + 1)}</h2>
        {!nextStep && <p className="mb-2">{GUIDE_TRIAL_OVER}</p>}
        <ol className="grid gap-1.5">
          {steps.map(({ step, state }) => (
            <li key={step} aria-current={state === 'next' ? 'step' : undefined} className="grid grid-cols-[1rem_minmax(0,1fr)] gap-1.5 aria-[current]:font-medium">
              <span aria-hidden="true">{MARK[state]}</span>
              <span>
                {label(step)} <span className="font-normal text-muted-foreground">({STEP_STATE_TEXT[state]})</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
