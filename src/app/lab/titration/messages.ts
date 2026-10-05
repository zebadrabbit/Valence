import type { Blocked, Cause, Step, TrialOutcome, Warning } from '@/engine/titration'
import { molarityText, percentErrorText, readingText } from './format'

// Every sentence the titration lab says, keyed by the engine's identifiers, so that an identifier with no sentence
// does not compile. Nothing here takes the model or the state: a sentence can say only what it is handed, which is
// what the learner typed and what the engine's selectors give out.

export const NOTEBOOK_TEXT = { check: 'Check', discard: 'Discard this flask', nextTrial: 'Start the next trial' }

/** Why a control cannot be used now. Each names what is missing and nothing else, so it reads the same in both modes. */
export const BLOCKED_TEXT: Record<Exclude<Blocked, 'invalid-entry' | 'reread'>, string> = {
  'lab-completed': 'The lab is complete. Restart the lab to run it again.',
  'lab-not-completed': 'These are entered once three trials count.',
  'trial-ended': 'This trial is over. Start the next trial.',
  'trial-open': 'Finish or discard the trial under way first.',
  // Said of the pipette rinse only. The engine gives it for a pipette that was rinsed and for one that was never
  // rinsed and is wet with acid from the aliquot it drew, so the sentence is true of both and says which of the two
  // it is of neither.
  'already-done': 'The pipette is already wet with acid, so rinsing it now changes nothing for this flask.',
  'mid-titration': 'That cannot be done once NaOH has run into the flask.',
  'burette-empty': 'Fill the burette first.',
  'burette-at-bottom': 'The burette is at the 50 mL mark, the bottom of its scale. Nothing more can be delivered.',
  'no-tip-bubble': 'There is no air bubble in the tip.',
  'flask-empty': 'Pipette the acid into the flask first.',
  'flask-has-aliquot': 'The flask already holds its 25.00 mL of acid.',
  'indicator-full': 'Three drops of indicator are enough.',
  'water-full': 'The flask has had all the distilled water this lab allows in one trial.',
  'needs-indicator': 'Add 2 or 3 drops of phenolphthalein first.',
  'needs-initial-reading':
    'Record the initial burette reading before you open the stopcock. Once NaOH has run out, the starting level can no longer be read.',
  'endpoint-not-confirmed':
    'The final reading can be recorded once the pink has lasted through a swirl and wait. Titrate until the flask stays pink, then swirl and wait.',
  'needs-final-reading': 'The molarity is worked out from both readings. Record the final reading first.',
  'needs-hcl-molarity': 'Record the HCl molarity from the bottle label first.',
  'not-the-label': 'That is not the molarity printed on the label. Look at the label again and copy all four decimal places.',
  // The initial reading cannot be taken again once titrant has run, so a wrong one leaves no honest final reading.
  'final-not-after-initial': `The final reading must be larger than the initial reading. The numbers on a burette run downward, so the reading grows as NaOH runs out. If it is the initial reading in your notebook that is wrong, it cannot be put right now that NaOH has run out, and the flask must be discarded: choose "${NOTEBOOK_TEXT.discard}" in the notebook and run the trial again.`,
  'calculation-mismatch':
    'That molarity does not follow from your notebook. It must be your HCl molarity × 25.00 ÷ your titre. Keep every digit until the last step, then round the answer to four decimal places; do not cut it off. Nothing has been marked yet.',
}

/** What a typed entry must look like, by the field it was typed in. */
export const INVALID_ENTRY_TEXT: Record<'reading' | 'hcl-molarity' | 'molarity' | 'deviation', string> = {
  reading: 'Write the reading to two decimal places, between 0.00 and 50.00, for example 24.30. The second decimal is your estimate between the marks.',
  'hcl-molarity': 'Write the molarity as the label prints it, to four decimal places, for example 0.1234.',
  molarity: 'Write the molarity to four decimal places, for example 0.1234.',
  deviation: 'Write the relative deviation as a number of parts per thousand, with no more than two decimal places, for example 1.5.',
}

// Guided's answer to a reading off the meniscus. It does not say which way the reading is off.
const reread = (typed: string) =>
  `${typed} is more than 0.02 mL from the meniscus, so it has not been recorded. Read the bottom of the curve. The numbers on a burette run downward from 0.00 at the top, so the reading is the value of the mark just above the meniscus plus your estimate of how far below that mark it sits.`

export const rereadText = (typedUl: number) => reread(`${readingText(typedUl)} mL`)

/**
 * The sentence for any reason the engine gives. Without an entry, 'invalid-entry' is taken to be a reading: a typed
 * text the lab could read at all is refused by the engine only when it is a reading off the burette's scale.
 */
export function blockedText(reason: Blocked, entry: keyof typeof INVALID_ENTRY_TEXT = 'reading', typedUl?: number): string {
  if (reason === 'invalid-entry') return INVALID_ENTRY_TEXT[entry]
  if (reason === 'reread') return typedUl === undefined ? reread('That reading') : rereadText(typedUl)
  return BLOCKED_TEXT[reason]
}

/** Guided's warning before a technique step is skipped. The burette's is raised by a fill and by a reading of a burette already filled dilute, so its body is true in both places. */
export const WARNING_TEXT: Record<Warning, { title: string; body: string }> = {
  'burette-not-conditioned': {
    title: 'The burette has not been conditioned',
    body: 'It was washed with water, and the water left clinging to the inside dilutes the NaOH poured into it. Rinse the burette with a little of the NaOH solution, let that drain out through the tip, and then fill it.',
  },
  'tip-bubble': {
    title: 'There is an air bubble in the burette tip',
    body: 'When you titrate, the bubble will be pushed out and NaOH will take its place. The level in the burette will fall by the volume of the bubble, although that NaOH never reaches the flask. Run a little NaOH through the tip to push the bubble out, then take the reading.',
  },
  'pipette-not-rinsed': {
    title: 'The pipette has not been rinsed with HCl',
    body: 'It was washed with water, and the water left inside will dilute the acid you measure out. Draw up a little HCl, tip the pipette so the acid wets the whole inside, and let it drain to waste first.',
  },
}

/** The two buttons of a warning group, by the action that raised it: one way back and one way on, however many warnings it lists. */
export const WARNING_BUTTONS: Record<'fillBurette' | 'recordInitialReading' | 'pipetteAliquot', { back: string; on: string }> = {
  fillBurette: { back: 'Go back and condition it', on: 'Fill it anyway' },
  recordInitialReading: { back: 'Go back and put it right', on: 'Record the reading anyway' },
  pipetteAliquot: { back: 'Go back and rinse it', on: 'Pipette anyway' },
}

/**
 * What went wrong in a trial. A cause is named under a failed trial, under a passed one and under one that has no
 * titre at all, so each says which way the error pushes a result, not what this trial's result was.
 */
export const CAUSE_TEXT: Record<Cause, string> = {
  'burette-not-conditioned': 'The burette was not conditioned. Water left inside it diluted the NaOH, so the endpoint takes more of it. On its own that makes the titre too high and the calculated molarity too low: what is measured is the diluted NaOH in the burette, not the NaOH in the bottle. In this lab the NaOH in the burette stays diluted, through every refill, until the burette is conditioned.',
  'tip-bubble': 'There was an air bubble in the burette tip when the initial reading was taken. Air left the tip during the titration and NaOH took its place, so the level in the burette fell by more than the volume that reached the flask. On its own that makes the titre too high and the calculated molarity too low.',
  'pipette-not-rinsed': 'The pipette was not rinsed with HCl. Water left inside it diluted the acid, so the flask held less HCl than the calculation assumes, and the endpoint takes less NaOH. On its own that makes the titre too low and the calculated molarity too high.',
  'initial-misread': 'Your initial burette reading was more than 0.02 mL from the meniscus.',
  'final-misread': 'Your final burette reading was more than 0.02 mL from the meniscus.',
  // Of the molarity the trial was graded with: the notebook's may have been put right since.
  'hcl-label-misrecorded': 'The HCl molarity this trial was calculated with is not the one printed on the bottle label.',
}

const everyTrial = (label: string) => ({ first: label, later: label })

/** The checklist's steps, as worded in the first trial and in a later one. */
export const STEP_TEXT: Record<Step, { first: string; later: string }> = {
  hcl: everyTrial('Record the HCl molarity from the bottle label'),
  condition: everyTrial('Condition the burette with NaOH'),
  fill: { first: 'Fill the burette with NaOH', later: 'Refill the burette with NaOH' },
  'tip-bubble': everyTrial('Clear the air bubble from the burette tip'),
  'initial-reading': everyTrial('Record the initial burette reading'),
  'rinse-pipette': everyTrial('Rinse the pipette with HCl'),
  aliquot: { first: 'Pipette 25.00 mL of HCl into the flask', later: 'Pipette 25.00 mL of HCl into a clean flask' },
  indicator: everyTrial('Add 2 or 3 drops of phenolphthalein'),
  titrate: everyTrial('Titrate to a faint pink that lasts through a swirl and wait'),
  'final-reading': everyTrial('Record the final burette reading'),
  molarity: everyTrial('Calculate the NaOH molarity and check it'),
}

export const STEP_STATE_TEXT: Record<'done' | 'next' | 'todo' | 'skipped', string> = { done: 'Done', next: 'Next', todo: 'To do', skipped: 'Skipped' }

/** What the guide says in place of a next step once the trial has ended. True after completion too, so it does not say to begin another. */
export const GUIDE_TRIAL_OVER = 'This trial is over. What comes next is in the notebook.'

type InvalidReason = Extract<TrialOutcome, { state: 'invalid' }>['reason']

const INVALID_LABEL: Record<InvalidReason, string> = {
  overshot: 'Invalid: overshot',
  'ran-out': 'Invalid: burette ran out',
  discarded: 'Invalid: discarded',
}

/** The first line of an ended trial's feedback, and the note on water that closes it. A failed trial's first line carries its figure and is made in feedback(). */
export const OUTCOME_TEXT: Record<'passed' | 'notCounted' | 'closeWithTechniqueError' | 'largerHere' | 'largerHereAndShown' | 'water' | InvalidReason, string> = {
  passed: 'Passed. Your NaOH molarity is within 1.0% of the true value, and the trial counts toward your three.',
  // The whole rule, so it reads the same under a misread, a miscopied label and a technique error (the owner's
  // decisions D1 and of 2026-10-05). The pipette is "not wet with water", not "rinsed": an aliquot drawn before it
  // leaves the pipette wet with acid, and the trial counts.
  notCounted:
    'This trial is within 1.0%, but it does not count toward your three. A trial counts only when it was run with a conditioned burette, no air bubble in the tip at the initial reading and a pipette that was not wet with water, both burette readings are within 0.02 mL of the meniscus, and the HCl molarity is the one on the label.',
  // Said after the causes of a trial within 1.0% that has a technique cause among them. Two cases: a pair of mistakes
  // that cancel (a dilute burette or a tip bubble against a wet pipette), and what is left of a bubble after part of
  // it ran out into a discarded flask.
  closeWithTechniqueError:
    'Mistakes in technique can push a result in opposite directions and cancel, and a small one may not move the result far. So a result this close does not show that the technique was sound.',
  // The model's technique errors are larger than a bench's (spec 7.3), and the learner is told so once, after the
  // causes, whenever a technique cause is named. It gives no size, so it is as true of a part of a bubble as of a
  // whole one. Only a failed trial is told that the mistake shows in the result: a close one's did not, and an
  // invalid one has none.
  largerHere: 'This lab makes a technique mistake cost more than it does at a real bench.',
  largerHereAndShown: 'This lab makes a technique mistake cost more than it does at a real bench, so that it shows in the result.',
  overshot:
    "Overshot: the flask has gone more than two drops too far, so this trial has no usable titre. Run the trial again: close the stopcock when the pink is slow to fade, go on by single drops, and change to half-drops when a drop's pink is slow to fade.",
  // The spec's sentence (7.2), word for word.
  'ran-out': 'The burette ran out before the endpoint, so this trial has no usable titre. Refill the burette before you start a trial.',
  discarded: 'You discarded this flask, so the trial has no result. Run the trial again.',
  // A note, never a cause. It does not say the water changed nothing: with the burette at its last mark it can wash the pink out and end the trial.
  water:
    'Distilled water was added to the flask. Water changes how concentrated the acid in the flask is, not how much acid is there, so the NaOH needed to react with it is the same.',
}

/** The Result cell. A passed trial's percent error is never worded, so it reads the same before completion and after. */
export function outcomeLabel(outcome: TrialOutcome): string {
  switch (outcome.state) {
    case 'open':
      return 'In progress'
    case 'invalid':
      return INVALID_LABEL[outcome.reason]
    case 'failed':
      return `Not passed, ${percentErrorText(outcome.percentError)}`
    case 'passed':
      return outcome.counts ? 'Passed' : 'Passed, not counted'
  }
}

function failedText(percentError: number): string {
  // A failed trial is more than 1.0% out, so a figure that reads 1.00 would look like a pass without a word on it.
  const edge = Math.abs(percentError).toFixed(2) === '1.00' ? ', just outside the 1.0% allowed' : ''
  return `Not passed. Percent error: ${percentErrorText(percentError)}${edge}. Your NaOH molarity is too ${percentError < 0 ? 'low' : 'high'}.`
}

/**
 * An ended trial's feedback, a line at a time: what happened, each named cause in the engine's order, then, when a
 * technique cause is among them, what a close result does not show and that the lab makes such a mistake cost more
 * than a bench does, then the note on water. An open trial has none.
 */
export function feedback(outcome: TrialOutcome, waterUl: number): string[] {
  if (outcome.state === 'open') return []
  const first =
    outcome.state === 'invalid'
      ? OUTCOME_TEXT[outcome.reason]
      : outcome.state === 'failed'
        ? failedText(outcome.percentError)
        : outcome.counts
          ? OUTCOME_TEXT.passed
          : OUTCOME_TEXT.notCounted
  // The technique causes carry the names of Guided's three warnings, whose table is typed from the engine's union.
  const technique = outcome.causes.some((cause) => cause in WARNING_TEXT)
  return [
    first,
    ...outcome.causes.map((cause) => CAUSE_TEXT[cause]),
    ...(outcome.state === 'passed' && technique ? [OUTCOME_TEXT.closeWithTechniqueError] : []),
    ...(technique ? [outcome.state === 'failed' ? OUTCOME_TEXT.largerHereAndShown : OUTCOME_TEXT.largerHere] : []),
    ...(waterUl > 0 ? [OUTCOME_TEXT.water] : []),
  ]
}

/** Guided's worked calculation, set out with the learner's own numbers and stopping before the answer. */
export function workedLines(hclE6: number, initialUl: number, finalUl: number): string[] {
  const titre = readingText(finalUl - initialUl)
  return [
    `Titre = final reading − initial reading = ${readingText(finalUl)} − ${readingText(initialUl)} = ${titre} mL`,
    'HCl and NaOH react one to one, so at the endpoint the moles of NaOH added equal the moles of HCl in the flask.',
    'M_NaOH × V_NaOH = M_HCl × V_HCl',
    'Keep every digit until the last step, then round the answer to four decimal places.',
    `M_NaOH = M_HCl × V_HCl ÷ V_NaOH = ${molarityText(hclE6)} × 25.00 ÷ ${titre} = ?`,
  ]
}

/** `trueNaoh` is the engine's own text, to five decimal places. */
export const completedText = (trueNaoh: string) =>
  `Lab complete: three trials counted. The true NaOH molarity was ${trueNaoh} M, the value each trial was checked against.`

export const SUMMARY = {
  heading: 'Across the three trials that count',
  waiting: 'The average and the relative deviation of the three trials that count are entered here, once there are three.',
  ask: 'Work out the average molarity of the three trials that count, to four decimal places, and their relative deviation, and enter them. For the relative deviation, find how far each molarity is from that average, ignoring the sign; average the three distances; divide by the average molarity and multiply by 1000. The notebook then shows its own values beside yours.',
  ownAverage: 'Your average molarity (M)',
  ownDeviation: 'Your relative deviation (parts per thousand)',
  reveal: "Show the notebook's values",
  average: "The notebook's average of the three trials that count (M)",
  deviation: "The notebook's relative deviation (parts per thousand)",
  explain:
    "Relative deviation says how closely your trials agree with each other, not how close they are to the true value. It is not marked. The notebook works it from the average rounded to four decimal places, so if you kept more digits of the average, your figure can differ from the notebook's in the last digit. Molarities are typed to four decimal places, and one unit in the fourth place is about one part per thousand of the result, so the relative deviation of three careful trials can take only a few values, and reflects rounding as much as technique.",
}

/** Guided's average, set out with the learner's own molarities and stopping before the answer. */
export const workedAverage = (molaritiesE6: readonly number[]) => `Average = (${molaritiesE6.map(molarityText).join(' + ')}) ÷ ${molaritiesE6.length} = ?`
