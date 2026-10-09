import { overallEnergy } from './energy'
import type { Chapter, Energy, Mechanism, Question, Step } from './schema'

// Every sentence the mechanism timeline says that is chemistry and is not in its record. The record holds the
// chapters' titles and explanations, the timescale labels, the questions with their feedback, the note of spec
// 9.2 on step 1 and the energy panel's note (src/mechanisms/hcl-nahco3.json). This module words what is worked
// out from the record: an energy with its sign and unit, where each energy is from, which of them is derived and
// which barrier is not to scale. A sentence here can say only what it is handed.

const steps = (mechanism: Mechanism): Step[] => mechanism.chapters.filter((c): c is Step => c.kind === 'step')
const chapterOf = (mechanism: Mechanism, chapterId: string): Chapter => {
  const chapter = mechanism.chapters.find((c) => c.id === chapterId)
  if (!chapter) throw new Error(`no chapter "${chapterId}"`)
  return chapter
}
const stepOf = (mechanism: Mechanism, stepId: string): Step => {
  const chapter = chapterOf(mechanism, stepId)
  if (chapter.kind !== 'step') throw new Error(`"${stepId}" is not a step`)
  return chapter
}
/** A step's number, from 1, by its id. */
const numberOf = (mechanism: Mechanism, stepId: string) => steps(mechanism).findIndex((s) => s.id === stepId) + 1

/** An energy as the panel prints it: one decimal, with its sign as a plus or a true minus, in kJ/mol. */
export function kJ(value: number): string {
  const shown = Math.abs(value).toFixed(1)
  return `${Number(shown) === 0 ? '' : value > 0 ? '+' : '−'}${shown} kJ/mol`
}

/** "Step 2 of 4: Proton transfer" for a step; the title alone for the prologue and the bookends. */
export function chapterHeading(mechanism: Mechanism, chapterId: string): string {
  const chapter = chapterOf(mechanism, chapterId)
  return chapter.kind === 'step' ? `Step ${numberOf(mechanism, chapterId)} of ${steps(mechanism).length}: ${chapter.title}` : chapter.title
}

/** A chapter's real timescale as the track labels it, or null for a bookend. */
export const timescaleLabel = (chapter: Chapter): string | null => chapter.timescale?.value ?? null

/** What is announced when the scrub position enters a chapter (spec 9.1: on chapter change only): its heading and, for a step, how long it really takes. */
export function chapterAnnouncement(mechanism: Mechanism, chapterId: string): string {
  const chapter = chapterOf(mechanism, chapterId)
  const heading = chapterHeading(mechanism, chapterId)
  return chapter.kind === 'step' && chapter.timescale ? `${heading}. Real time: ${chapter.timescale.value}.` : `${heading}.`
}

export const ENERGY_PANEL = {
  title: 'Energy',
  freeEnergy: 'Free energy, G',
  enthalpy: 'Enthalpy, H',
  axis: 'kJ/mol, from the start of step 1',
  /** Beside a value: where it is from. */
  basis: { cited: 'from cited values', derived: 'derived' },
  /** On a barrier with no value (spec 9.2). */
  notToScale: 'not to scale',
} as const

export type EnergyLine = {
  quantity: 'deltaH' | 'deltaG' | 'activationG'
  /** "ΔG = −19.9 kJ/mol". */
  text: string
  /** "from cited values", "derived" or "not to scale"; null where the line gives no value of its own. */
  tag: string | null
  /** How the value was obtained, for the panel's Sources control; the ids of what it rests on are the energy's `sourceIds`. */
  method: string
  sourceIds: readonly string[]
}

const STATE: Record<Mechanism['thermo']['formation'][number]['state'], string> = { cr: 's', l: 'l', g: 'g', ao: 'aq' }
const celsius = (mechanism: Mechanism) => `${(mechanism.thermo.parameters.temperature.value - 273.15).toFixed(0)} °C`

/** A change as an equation over the formation values: "H⁺(aq) + HCO₃⁻(aq) → CO₂(aq) + H₂O(l)". */
function reactionText(mechanism: Mechanism, step: Step): string {
  if (!step.reaction) throw new Error(`the step "${step.id}" has no reaction`)
  const side = (ids: readonly string[]) =>
    ids
      .map((id) => {
        const entry = mechanism.thermo.formation.find((f) => f.id === id)
        if (!entry) throw new Error(`no formation values for "${id}"`)
        return `${entry.formula}(${STATE[entry.state]})`
      })
      .join(' + ')
  return `${side(step.reaction.reactants)} → ${side(step.reaction.products)}`
}

function methodText(mechanism: Mechanism, step: Step, energy: Energy): string {
  const { carbonicAcid } = mechanism.thermo
  switch (energy.method) {
    case 'formation':
      return `From the formation values of the NBS tables, products less reactants, for ${reactionText(mechanism, step)}.`
    case 'acid-constant':
      return `From the acid constant of the carbonic acid molecule itself, pKa ${carbonicAcid.pKa.value}: −RT ln 10 × pKa, at ${celsius(mechanism)}.`
    case 'remainder':
      return `Derived: the NBS tables' total for ${reactionText(mechanism, step)}, less step ${numberOf(mechanism, step.id) - 1}.`
    case 'eyring':
      return `Derived by the Eyring equation, at ${celsius(mechanism)}, from how long a carbonic acid molecule lasts: about ${carbonicAcid.lifetime.value} ${carbonicAcid.lifetime.unit}.`
  }
}

const and = (items: readonly string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`)

/** What the energy panel says of one step: its free energy, its enthalpy, and its barrier where it has one. */
export function energyLines(mechanism: Mechanism, stepId: string): EnergyLine[] {
  const step = stepOf(mechanism, stepId)
  const { basis, notToScale } = ENERGY_PANEL
  const lines: EnergyLine[] = [{ quantity: 'deltaG', text: `ΔG = ${kJ(step.deltaG.value)}`, tag: basis[step.deltaG.basis], method: methodText(mechanism, step, step.deltaG), sourceIds: step.deltaG.sourceIds }]
  if (step.deltaH) {
    const covered = step.deltaH.covers?.map((id) => String(numberOf(mechanism, id)))
    lines.push({
      quantity: 'deltaH',
      text: `ΔH = ${kJ(step.deltaH.value)}${covered ? ` for steps ${and(covered)} together` : ''}`,
      tag: basis[step.deltaH.basis],
      method: methodText(mechanism, step, step.deltaH),
      sourceIds: step.deltaH.sourceIds,
    })
  } else {
    const next = steps(mechanism).find((s) => s.deltaH?.covers?.includes(step.id))
    if (!next) throw new Error(`no enthalpy covers the step "${step.id}"`)
    lines.push({ quantity: 'deltaH', text: `ΔH: counted with step ${numberOf(mechanism, next.id)}`, tag: null, method: 'No separate enthalpy of the carbonic acid molecule is cited.', sourceIds: [] })
  }
  if (step.activationG === 'schematic') {
    lines.push({ quantity: 'activationG', text: 'Barrier: no value', tag: notToScale, method: 'No value for this barrier was read from a source. Its height on the curve is a drawing choice.', sourceIds: [] })
  } else if (step.activationG) {
    lines.push({ quantity: 'activationG', text: `Barrier: about ${step.activationG.value.toFixed(0)} kJ/mol`, tag: basis[step.activationG.basis], method: methodText(mechanism, step, step.activationG), sourceIds: step.activationG.sourceIds })
  }
  return lines
}

/**
 * The notes under a step's energies: the record's own (the note of spec 9.2 on step 1), then what follows from how
 * its values were obtained: the record's note on the acid constant, that a free energy is derived, that the
 * enthalpy curve shows two steps as one change, that a barrier is not to scale or is derived.
 */
export function stepNotes(mechanism: Mechanism, stepId: string): string[] {
  const step = stepOf(mechanism, stepId)
  const notes = [...step.notes]
  if (step.deltaG.method === 'acid-constant') notes.push(mechanism.thermo.carbonicAcid.pKa.note)
  if (step.deltaG.basis === 'derived') notes.push('The free energy of this step is derived, not read from a table: it is what is left of the total for two steps when the other step is taken away.')
  const shared = step.deltaH?.covers ?? steps(mechanism).find((s) => s.deltaH?.covers?.includes(step.id))?.deltaH?.covers
  if (shared) notes.push(`No separate heat of forming the carbonic acid molecule is cited, so the enthalpy curve shows steps ${and(shared.map((id) => String(numberOf(mechanism, id))))} as one change.`)
  if (step.activationG === 'schematic') notes.push('The barrier of this step is drawn not to scale: no value for it was read from a source.')
  else if (step.activationG?.basis === 'derived') notes.push('The barrier of this step is derived from how long carbonic acid lasts, not measured directly.')
  return notes
}

/** What the energy panel says under its curves: the note of spec 9.2, what "standard" means, and the totals. */
export function energyPanelNotes(mechanism: Mechanism): string[] {
  const { deltaH, deltaG } = overallEnergy(mechanism)
  return [mechanism.energyNote, `Over the whole change, ΔH = ${kJ(deltaH)} and ΔG = ${kJ(deltaG)}.`, mechanism.thermo.standardState.value]
}

export const PREDICTION = {
  /** Over the question Challenge mode asks before a step (spec 9.1). */
  lead: 'What happens next?',
  wrong: 'Not this one.',
} as const

const questionOf = (mechanism: Mechanism, questionId: string): Question | undefined => steps(mechanism).find((s) => s.question?.id === questionId)?.question

/** What is said of an answer to a prediction: whether it is right, and why or why not. Null for an answer that is none of the question's. */
export function predictionFeedback(mechanism: Mechanism, questionId: string, optionId: string): { correct: boolean; text: string } | null {
  const option = questionOf(mechanism, questionId)?.options.find((o) => o.id === optionId)
  return option ? { correct: option.correct, text: option.correct ? option.feedback : `${PREDICTION.wrong} ${option.feedback}` } : null
}
