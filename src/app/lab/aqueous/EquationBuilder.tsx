import type { ComponentProps } from 'react'
import { EquationBuilder as Builder, TermControls as Controls, type BuilderText } from '@/app/lab/EquationBuilder'
import type { Counts } from '@/app/lab/equationRow'
import type { AqueousData } from '@/chem-data/aqueous/data'
import type { Entry, Form, Problem, State, StationView } from '@/engine/aqueous'
import { formulaOf } from './Formula'
import { BENCH_TEXT, FORM_LABEL, PAGE_TEXT, SLOT_TEXT, STATE_NAME, alreadyOnSide, equationFeedback, slotLabel } from './messages'

// The aqueous reactions lab's equation builder (spec 8.3): the shell's builder of an equation from tiles
// (src/app/lab/EquationBuilder.tsx), given this lab's record, its three forms of an equation and its words.

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
const TEXT: BuilderText = {
  yourEquation: PAGE_TEXT.yourEquation,
  palette: PAGE_TEXT.palette,
  slotHelp: PAGE_TEXT.slotHelp,
  full: PAGE_TEXT.full,
  coefficient: PAGE_TEXT.coefficient,
  fewer: PAGE_TEXT.fewer,
  more: PAGE_TEXT.more,
  state: PAGE_TEXT.state,
  remove: PAGE_TEXT.remove,
  coefficientLimit: PAGE_TEXT.coefficientLimit,
  check: BENCH_TEXT.check,
  change: PAGE_TEXT.change,
  cancel: PAGE_TEXT.cancel,
  noReaction: BENCH_TEXT.noReaction,
  stateName: STATE_NAME,
  alreadyOnSide,
  slotLabel,
  slot: SLOT_TEXT,
}

const found = (problem: Problem | null) => ({ ok: problem === null, text: problem === null ? equationFeedback(null) : `${PAGE_TEXT.notCorrect}. ${equationFeedback(problem)}` })

/** The coefficient, the state and the way out of one term, in this lab's words. */
export function TermControls(props: Omit<ComponentProps<typeof Controls>, 'states' | 'text'>) {
  return <Controls {...props} states={STATES} text={TEXT} />
}

/**
 * One equation of a station in one of its three forms, built by taps and never typed. "Check" enters the equation
 * and says what kind of thing is wrong, never the answer. A correct equation is shown as its one line, with
 * "Change" beside it.
 */
export function EquationBuilder({ data, form, palette, judged, counts, held, refusal, onEnter }: EquationBuilderProps) {
  return (
    <Builder
      heading={FORM_LABEL[form]}
      palette={palette}
      formula={(speciesId) => formulaOf(data, speciesId)}
      states={STATES}
      recorded={judged && { entry: judged.entry, ...found(judged.problem) }}
      counts={counts}
      held={held}
      refusal={refusal}
      onEnter={(entry) => found(onEnter(entry))}
      text={TEXT}
    />
  )
}
