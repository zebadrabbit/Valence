import { ION_IDS, PART_IDS, STEP_IDS, reagentsOf, substanceOf, type CationsData, type IonId, type PartId, type StepId, type TubeId } from '@/chem-data/cations/data'
import type { Blocked, CationsModel, Field, Litmus, Look, Mode, Observation, PartView, PlaceView, Reason, RunOutcome, StepView, TubeShows, Warning } from '@/engine/cations'

// Every sentence the Group I cations lab says, keyed by the engine's identifiers, so that an identifier with no
// sentence does not compile. A sentence can say only what it is handed: the lab's record and what the engine's
// views hold, which is what is seen of a tube and never what it is, and never which ions an unknown holds until
// they have been named. What a solid is, is said in two places only: the notes of a step that is done, which are in
// the record itself with their sources (src/chem-data/cations/cations.json), and the tiles of the flow chart,
// which name every thing the scheme can make whatever the sample holds. This module words everything else.
//
// Feedback on an observation says which part to look at again and never what it should be.

const listed = (items: readonly string[]) => (items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`)
const lower = (text: string) => `${text[0]!.toLowerCase()}${text.slice(1)}`
const upper = (text: string) => `${text[0]!.toUpperCase()}${text.slice(1)}`
const article = (word: string) => (/^[aeiou]/i.test(word) ? 'an' : 'a')
const number = (stepId: StepId) => STEP_IDS.indexOf(stepId) + 1

/** The lab's name, and what its page says at its head. */
export const LAB_TEXT = {
  title: 'Group I cations',
  /** Under the title: what the lab is, in a sentence. */
  aim: 'Find which of three metal ions a solution holds, silver, lead and mercury(I), by what each one does.',
  /** Over the list of parts. */
  complete: 'The lab is complete once a run of each part counts.',
  completed: 'The lab is complete: a run of each of the two parts counts. Part 2 can still be run again, with a new unknown.',
} as const

/** "Part 1: The known". */
export const PART_NAME: Record<PartId, string> = { known: 'The known', unknown: 'An unknown' }
export const partTitle = (part: PartId) => `Part ${PART_IDS.indexOf(part) + 1}: ${PART_NAME[part]}`

/** What each part is for, under its title. Neither says what any step shows. */
export const PART_AIM: Record<PartId, string> = {
  known: 'A sample that holds all three ions. Work it through the five steps, so that you see what each ion does once.',
  unknown: 'A sample that holds one, two or all three of the ions. Work it through the same five steps, then say which ions it holds.',
}

/** A count of drops: "1 drop", "4 drops". */
export const dropsText = (drops: number) => `${drops} ${drops === 1 ? 'drop' : 'drops'}`

const ionNames = (data: CationsData, ions: readonly IonId[]) => listed(ION_IDS.filter((ion) => ions.includes(ion)).map((ion) => lower(data.ions.find((i) => i.id === ion)!.name)))

/** An ion as its tick box names it: "Silver, Ag⁺". */
export function ionLabel(data: CationsData, ion: IonId): string {
  const { name, formula } = data.ions.find((i) => i.id === ion)!
  return `${name}, ${formula}`
}

/**
 * The bench in words: the sample, then everything that stands ready. The known is named for what it holds, which
 * is no secret; an unknown for what it looks like and what it may hold.
 */
export function benchLines(data: CationsData, part: PartId): string[] {
  const p = data.parameters
  const sample =
    part === 'known'
      ? `The sample, in the first test tube: ${dropsText(p.sampleDrops.value)} of a clear, colourless solution of ${ionNames(data, ION_IDS)} ions, made from ${dropsText(p.sampleDropsOfEach.value)} of each of the three nitrate solutions.`
      : `The sample, in the first test tube: ${dropsText(p.sampleDrops.value)} of a clear, colourless solution. It holds one, two or all three of these ions: ${ionNames(data, ION_IDS)}.`
  return [
    sample,
    `Reagents, each in a dropper bottle: ${data.reagents.filter((r) => !data.ions.some((ion) => ion.reagentId === r.id)).map((r) => lower(r.name)).join('; ')}.`,
    `${data.water.name}, and a beaker of boiling water to heat a tube in.`,
    'Two more test tubes, clean and empty.',
    'Blue and red litmus paper.',
    'A centrifuge.',
  ]
}

/** Over the tiles of the three nitrate solutions, which are shown whatever the sample holds. */
export const SAMPLE_HAZARDS_HEADING: Record<PartId, string> = {
  known: 'The sample is made from these three solutions.',
  unknown: 'The sample is made from one, two or all three of these solutions. The hazards of all three are shown, whichever it holds.',
}

/** "Step 1: Precipitate the group". */
export function stepTitle(data: CationsData, stepId: StepId): string {
  return `Step ${number(stepId)}: ${data.steps[STEP_IDS.indexOf(stepId)]!.name}`
}

/**
 * What is done at each step, under its title. It says what to do and nothing of what will be seen. The centrifuge
 * comes before the record: its button is beside the tube, and what ends the step is under the step's cards, a
 * window further down in part 1, so that in this order the page is worked one way, from its head to its foot.
 */
export const STEP_TASK: Record<StepId, string> = {
  precipitate: 'Add hydrochloric acid to the sample and centrifuge. Record what you see, then pour the liquid away.',
  'extract-lead': 'Add distilled water to what is left in the first tube, heat it in the boiling water and centrifuge. Record what you see, then pour the hot liquid into the second tube.',
  'confirm-lead': 'Add acetic acid and potassium chromate to the second tube, and record what you see.',
  separate: 'Add ammonia solution to what is left in the first tube and centrifuge. Record what you see, then pour the liquid into the third tube.',
  'confirm-silver': 'Add nitric acid to the third tube, a little at a time, testing with litmus paper, until the paper shows that the liquid is acid. Then record what you see.',
}

/** The three tubes as they are named. */
export const TUBE_NAME: Record<TubeId, string> = { a: 'First tube', b: 'Second tube', c: 'Third tube' }

const dropsOf = (data: CationsData, stepId: StepId): number[] => {
  const p = data.parameters
  return { precipitate: [p.hydrochloricAcidDrops.value], 'extract-lead': [p.waterDrops.value], 'confirm-lead': [p.aceticAcidDrops.value, p.chromateDrops.value], separate: [p.ammoniaDrops.value], 'confirm-silver': [p.nitricAcidDrops.value] }[stepId]
}
/** What a step adds, as a sentence speaks of it: "4 drops of hydrochloric acid, 6 M". */
function addedThings(data: CationsData, stepId: StepId): string[] {
  const names = stepId === 'extract-lead' ? [lower(data.water.name)] : reagentsOf(data, stepId).map((r) => lower(r.name))
  return names.map((name, i) => `${dropsText(dropsOf(data, stepId)[i]!)} of ${name}`)
}

/** The button that adds a step's reagent: "Add 4 drops of hydrochloric acid, 6 M". At step 5 the same button adds again. */
export const addLabel = (data: CationsData, stepId: StepId) => `Add ${addedThings(data, stepId).join(', then ')}`

/** The other buttons of a step. Pouring off is named for where the liquid goes. */
export const ACTION_LABEL = {
  heat: 'Heat the tube in the boiling water',
  centrifuge: 'Centrifuge',
  testLitmus: 'Test with litmus paper',
  checkStep: 'Check what you recorded',
  observe: 'Record what you see',
} as const
export const POUR_LABEL: Partial<Record<StepId, string>> = {
  precipitate: 'Pour the liquid away',
  'extract-lead': 'Pour the hot liquid into the second tube',
  separate: 'Pour the liquid into the third tube',
}

/**
 * What has been done to a step's tube so far, in words, beside its picture. It says what was done and nothing of
 * what came of it.
 */
export function doneText(data: CationsData, step: Pick<StepView, 'id' | 'added' | 'heated' | 'litmus'>): string {
  const things = addedThings(data, step.id).join(' and ')
  if (step.added === 0) return `Nothing has been added yet at this step. To add: ${things}.`
  const added = step.id === 'confirm-silver' ? `Nitric acid has gone in ${step.added === 1 ? 'once' : step.added === 2 ? 'twice' : `${step.added} times`}, ${dropsText(dropsOf(data, step.id)[0]!)} each time.` : `Added so far: ${things}.`
  const heated = step.id === 'extract-lead' ? (step.heated ? ' The tube has stood in the boiling water.' : ' The tube has not been heated.') : ''
  const litmus = step.id === 'confirm-silver' ? ` ${step.litmus === null ? 'Litmus has not been tried since.' : litmusText(step.litmus)}` : ''
  return `${added}${heated}${litmus}`
}

/** What litmus paper shows of the liquid. */
export function litmusText(litmus: Litmus): string {
  if (litmus === 'acid') return 'Blue litmus paper turns red, and red litmus paper stays red: the liquid is acid.'
  if (litmus === 'basic') return 'Blue litmus paper stays blue, and red litmus paper turns blue: the liquid is not acid yet.'
  return 'Neither paper changes colour: the liquid is not acid yet.'
}

/** The two parts of a tube that are looked at, as the list beside the picture names them. */
export const LOOK_PART: Record<Look, string> = { liquid: 'The liquid', bottom: 'The bottom of the tube' }
export const lookLabel = (look: Look, looked: boolean) => `Look at ${lower(LOOK_PART[look])}${looked ? `, ${PAGE_TEXT.lookedAt}` : ''}`

/** A colour that reads oddly straight after "and": "clear and colourless", "clear, and yellow to orange". */
const clearAnd = (colour: string) => (colour.includes(' ') ? `clear, and ${colour}` : `clear and ${colour}`)

/**
 * What a look at one part of a tube says: what is seen there and nothing of what it is. A liquid with a solid
 * spread through it is cloudy, and the bottom then has nothing on it yet.
 */
export function lookText(shows: TubeShows, look: Look): string {
  const { liquid, solid } = shows
  if (look === 'bottom') {
    if (solid === null) return liquid === null ? 'The tube is empty.' : 'No solid is at the bottom.'
    if (!solid.settled) return 'Nothing has settled at the bottom yet.'
    return liquid === null ? `${upper(article(solid.colour))} ${solid.colour} solid lies at the bottom, with no liquid over it.` : `${upper(article(solid.colour))} ${solid.colour} solid is packed at the bottom.`
  }
  if (liquid === null) return 'There is no liquid in the tube.'
  if (liquid.cloudy && solid !== null) return `The liquid is cloudy: ${article(solid.colour)} ${solid.colour} solid is spread through it. The liquid itself is ${liquid.colour}.`
  return `The liquid is ${clearAnd(liquid.colour)}.`
}

/** A whole tube described in words (spec 17.7): its solid and its liquid as they lie in it. Null is a tube not yet used. */
export function tubeText(shows: TubeShows | null): string {
  if (shows === null || (shows.liquid === null && shows.solid === null)) return 'The tube is empty.'
  const { liquid, solid } = shows
  if (liquid === null) return `${upper(article(solid!.colour))} ${solid!.colour} solid lies at the bottom of the tube, with no liquid over it.`
  if (solid === null) return `The tube holds a liquid that is ${clearAnd(liquid.colour)}. There is no solid in it.`
  if (!solid.settled) return `The tube holds a cloudy liquid: ${article(solid.colour)} ${solid.colour} solid is spread through a liquid that is itself ${liquid.colour}. Nothing has settled yet.`
  return `${upper(article(solid.colour))} ${solid.colour} solid is packed at the bottom of the tube. The liquid over it is ${clearAnd(liquid.colour)}.`
}

/** What each question of the observation asks. */
export const FIELD_LABEL: Record<Field, string> = { solid: 'Solid in the tube', liquid: 'Colour of the liquid' }
// How a question is spoken of in feedback.
const FIELD_NAME: Record<Field, string> = { solid: 'the solid', liquid: 'the colour of the liquid' }

/** A choice as the form shows it: the record's word, spelt out where the word alone would read oddly as an answer. */
export const choiceLabel = (field: Field, choice: string): string => (field === 'solid' && choice === 'none' ? 'no solid' : choice)
/** The choices of a question, each with its label: the stored value is the record's word. */
export const choiceList = (m: CationsModel, field: Field) => (field === 'solid' ? m.solidChoices : m.liquidChoices).map((value) => ({ value, label: choiceLabel(field, value) }))

/** An observation in words, one line for each question: "Solid in the tube: white." */
export const observationLines = (observation: Observation): string[] => (Object.keys(FIELD_LABEL) as Field[]).map((field) => `${FIELD_LABEL[field]}: ${choiceLabel(field, observation[field])}.`)

/** Under a question that waits for its looks. */
export const LOOK_FIRST = 'Not open yet. Look at the liquid and at the bottom of the tube in the picture first.'

/** Guided's feedback on an observation it does not record: which part to look at again, never what it should be. */
export const mismatchText = (wrong: readonly Field[]): string => (wrong.length === 0 ? '' : `Not yet. Look again at ${listed(wrong.map((field) => FIELD_NAME[field]))}.`)

/** Beside a step's observation once the step is checked: that it is what the tube showed, or which part is not. */
export const checkedText = (wrong: readonly Field[]): string =>
  wrong.length === 0 ? 'Checked: this is what the tube showed.' : `Checked: ${listed(wrong.map((field) => FIELD_NAME[field]))} ${wrong.length === 1 ? 'is' : 'are'} not what the tube showed.`

/** Guided's hint for each step, in a closed disclosure (spec 17.3). Each says how the step is worked and nothing of what it shows. */
export const HINT: Record<StepId, string> = {
  precipitate: 'A solid that has just formed is spread through the liquid and makes it cloudy. The centrifuge packs it at the bottom. Then look at the liquid and at the bottom of the tube, and record what you see. Pour only after the centrifuge, or the solid goes over with the liquid.',
  'extract-lead': 'The water does its work only when it is hot, so heat the tube before you record what you see and before you pour. Centrifuge, then pour the hot liquid into the second tube: the next step tests that liquid, and the step after it tests what is left behind.',
  'confirm-lead': 'The reagent that goes in here is itself coloured, so a coloured liquid tells you nothing. What matters is whether there is a solid. The centrifuge packs a solid at the bottom, where it is easy to tell from the liquid over it.',
  separate: 'After the ammonia goes in, look at whether a solid is left and what colour it is. Centrifuge before you pour: the liquid goes into the third tube, and the last step tests it.',
  'confirm-silver': 'One addition of acid is not enough to use up the ammonia. After each addition, test with litmus paper. Record what you see only once the paper shows that the liquid is acid: before that, a clear liquid proves nothing.',
}

/** Why an action cannot be done now, or why Guided did not take an entry. `stepId` is the step the part has reached, where it has one. */
export function blockedText(data: CationsData, part: PartId, blocked: Blocked, stepId: StepId | null = null): string {
  const add = stepId === null ? 'Add the reagent' : addLabel(data, stepId)
  switch (blocked) {
    case 'unknown-part':
      return 'There is no such part.'
    case 'run-over':
      return 'This run is over. Run this part again for a new run.'
    case 'steps-done':
      return 'All five steps of this run are done. What is left is to say which ions the sample holds.'
    case 'steps-not-done':
      return 'Work all five steps first. The ions are named from what the steps show.'
    case 'not-this-part':
      return part === 'known' ? 'The ions of the known are given. They are named in part 2, for an unknown.' : 'The flow chart is filled in part 1. In part 2 it is there as a map once part 1 is done.'
    case 'not-this-step':
      return 'That is not done at this step.'
    case 'step-checked':
      return 'What you recorded at this step has been checked, so the tube is left as it is. Centrifuging and pouring off are what is left.'
    case 'already-added':
      return 'That has already gone in. The amount is fixed.'
    case 'tube-full':
      return 'The tube is full: no more acid can go in. Test the liquid with litmus paper and record what you see.'
    case 'add-first':
      return `First: ${lower(add)}.`
    case 'already-heated':
      return 'The tube has already stood in the boiling water.'
    case 'nothing-to-spin':
      return 'There is no solid spread through the liquid, so there is nothing for the centrifuge to pack down.'
    case 'look-first':
      return 'Look at the liquid and at the bottom of the tube first: what you record is what you saw there.'
    case 'observe-first':
      return 'Record what you see in the tube first.'
    case 'check-first':
      return 'Record what you see in the tube before you pour, and have it checked: once the liquid is poured off, the tube no longer shows it.'
    case 'invalid-entry':
      return 'Choose one answer for each question.'
    case 'nothing-named':
      // True of every sample, so it says nothing of this one.
      return 'Tick at least one ion: every sample holds one or more of the three.'
    case 'no-such-place':
      return 'There is no such place on the flow chart.'
    case 'no-such-tile':
      return 'There is no such tile.'
    case 'already-placed':
      return 'That tile is already in this place.'
    case 'not-placed':
      return 'That tile is not in this place.'
    case 'places-empty':
      return "Put at least one tile in each of this step's places on the flow chart first."
    case 'nothing-to-repeat':
      return 'This run has not been begun: there is nothing to run again.'
    case 'no-more-runs':
      return 'The record holds no more runs of this part, and its last run counts. The part is done.'
    case 'run-too-long':
      return 'This run has gone on for longer than the record can hold. Run this part again.'
    case 'does-not-match':
      return 'That is not what the tube shows. Look at the liquid and at the bottom of the tube again.'
    case 'wrong-place':
      return 'That does not belong in this place. Think which of the three ions is here after this step, and as what.'
    case 'chart-not-right':
      return "A place of this step holds a tile that does not belong there, or lacks one that does. Put the step's places right first."
  }
}

/** Guided's warning before a slip of technique (spec 17.3): what is about to go wrong and what to do first. */
export const WARNING_TEXT: Record<Warning, { title: string; body: string }> = {
  'not-centrifuged': {
    title: 'The solid has not been spun down',
    body: 'The solid is still spread through the liquid, so it will go over with the liquid when you pour. A run in which that happens does not count. Centrifuge first.',
  },
  'not-heated': {
    title: 'The water has not been heated',
    body: 'Lead chloride dissolves properly only in hot water. Poured off cold, part of any lead chloride stays with the solid and is still there at step 4. A run poured off cold does not count. Heat the tube first.',
  },
  'not-acid': {
    title: 'Litmus has not shown the liquid to be acid',
    body: 'While ammonia is left in the liquid, no solid can form here, whether silver is there or not. What you record now would prove nothing, and the run would not count. Add nitric acid and test with litmus paper until the paper shows acid.',
  },
}
/** The two buttons of a warning: one way back and one way on. */
export const WARNING_BUTTONS: Record<Warning, { back: string; on: string }> = {
  'not-centrifuged': { back: 'Go back', on: 'Pour anyway' },
  'not-heated': { back: 'Go back', on: 'Pour anyway' },
  'not-acid': { back: 'Go back', on: 'Record it anyway' },
}

/** One reason a run does not count, as a sentence (spec 17.3). */
export function reasonText(reason: Reason): string {
  switch (reason.kind) {
    case 'poured-uncentrifuged':
      return `At step ${number(reason.step)} the liquid was poured off before the solid had been spun down, so the solid went over with it.`
    case 'water-not-heated':
      return 'At step 2 the water was poured off without being heated, so any lead chloride was only partly dissolved and the rest stayed with the solid.'
    case 'judged-before-acid':
      return 'At step 5 what was seen was recorded before litmus had shown the liquid to be acid. Until the liquid is acid no solid can form there, whether silver is in it or not.'
    case 'observation-wrong':
      return `What was recorded at step ${number(reason.step)} is not what the tube showed.`
    case 'chart-wrong':
      return 'A place of the flow chart does not hold what belongs in it.'
    case 'ions-wrong':
      return 'The ions named are not the ones the sample held.'
  }
}

/** What a sample held, said once the engine hands it over: an unknown's only after its ions are named. */
export const holdsText = (data: CationsData, ions: readonly IonId[]) => `The sample held ${ionNames(data, ions)} ${ions.length === 1 ? 'ions and neither of the other two' : ions.length === 2 ? 'ions and not the third' : 'ions: all three'}.`

/** The ions a learner named, in words: "You named silver and lead." The engine takes no naming of none. */
export const namedText = (data: CationsData, ions: readonly IonId[]) => `You named ${ionNames(data, ions)}.`

/**
 * The sentence for a run once it is over: that it counts, or that it does not and why (spec 17.3). For an unknown
 * it then says what the sample held, which the engine hands over only then. Empty for a run that is still open.
 */
export function outcomeText(data: CationsData, part: PartId, outcome: RunOutcome, holds: readonly IonId[] | null): string {
  if (outcome.state === 'open') return ''
  const held = part === 'unknown' && holds !== null ? ` ${holdsText(data, holds)}` : ''
  if (outcome.state === 'counts') {
    const last = part === 'known' ? 'every place of the flow chart holds what belongs in it' : 'the ions you named are the ones the sample held'
    return `This run counts: the technique was right, each observation is what its tube showed, and ${last}.${held}`
  }
  const again = part === 'known' ? 'Run this part again.' : 'Run this part again: the unknown will be a new one.'
  return `This run does not count. ${outcome.reasons.map(reasonText).join(' ')}${held} ${again}`
}

/** A tile of the flow chart as it is named: "Silver chloride, AgCl, a solid". The tiles name every thing the scheme can make. */
export function tileLabel(data: CationsData, tileId: string): string {
  const { name, formula, state } = substanceOf(data, tileId)
  return `${name}, ${formula}, ${state === 's' ? 'a solid' : 'dissolved'}`
}

/** A place of the flow chart as it is named: "Step 2: in the liquid". */
export const placeLabel = (place: Pick<PlaceView, 'step' | 'layer'>) => `Step ${number(place.step)}: in the ${place.layer}`

/** The flow chart of part 1, and the same chart as a map in part 2. */
export const CHART_TEXT = {
  title: 'Where each ion went',
  /** Under the title in part 1: how the chart is filled. */
  help: 'After each step, fill its places from the tiles: which of the three ions is in the solid, which in the liquid, and as what. A tile can be used in more than one place.',
  tiles: 'Tiles to choose from',
  /** Under the help, while a place can be filled: how a tile is put in one. */
  how: 'Tap a tile, then the place it belongs in; or tap the place first, then each tile.',
  /** In a place that cannot be filled yet. */
  closed: 'Opens once you have recorded what you see at this step.',
  empty: 'Nothing here yet',
  /** In Guided, how many tiles belong in a place. */
  slots: (count: number) => `${count === 1 ? 'One tile belongs' : `${upper(['zero', 'one', 'two', 'three', 'four'][count] ?? String(count))} tiles belong`} here.`,
  right: 'Right',
  notRight: 'Not right',
  remove: (tile: string) => `Take out ${tile}`,
  /** In part 2: the name of the finished chart, and what stands in its place until part 1 is done. */
  map: 'The scheme, as you filled it in part 1',
  noMap: 'Once part 1 is done, its finished flow chart is shown here as a map of the scheme.',
} as const

/** Naming the ions, in part 2. */
export const NAMING_TEXT = {
  title: 'Which ions does the sample hold?',
  help: 'Tick each ion that the steps showed. Any of the three may be ticked. This is said once for each run.',
  closed: 'Opens once all five steps are done.',
  submit: 'Name the ions',
} as const

/** What each mode does in this lab (spec 17.3), beside its radio button. */
export const MODE_TEXT: Record<Mode, string> = {
  guided: 'Guided: the lab asks before a slip of technique and lets you go on, takes only what the tube really shows and only the tiles that belong, and has a hint for each step ready to open.',
  challenge: 'Challenge: no warning and no hints. The lab takes whatever you record and checks a step only when you ask. A run that does not count is run again.',
}

/** How far a part has come, in the list of parts and on its page, beside a mark that says the same. */
export type Progress = 'not-started' | 'steps' | 'naming' | 'not-counted' | 'done'
export function progressOf(view: Pick<PartView, 'steps' | 'naming' | 'outcome' | 'done'>): Progress {
  if (view.done) return 'done'
  if (view.outcome.state === 'does-not-count') return 'not-counted'
  if (view.naming?.open) return 'naming'
  return view.steps.some((step) => step.added > 0 || step.status === 'done') ? 'steps' : 'not-started'
}
export const PROGRESS_TEXT: Record<Progress, string> = {
  'not-started': 'Not started',
  steps: 'Steps under way',
  naming: 'Ions to be named',
  'not-counted': 'Run did not count',
  done: 'Done',
}

/** How far a step has come, in the list of steps. */
export const STEP_STATUS_TEXT: Record<StepView['status'], string> = { waiting: 'Not reached yet', current: 'Under way', done: 'Done' }

/** The headings of a step that is done: its notes, which say what each thing was, and its net ionic equations. */
export const NOTES_TEXT = {
  notes: 'Notes on this step',
  equations: 'Net ionic equations',
  /** Over the equations in part 2, where a sample may not hold every ion. */
  whichever: 'These are the equations of the scheme. Each is for an ion that the sample may or may not hold.',
} as const

/** The notes of a step that is done, as the record has them. */
export const stepNotes = (data: CationsData, stepId: StepId): string[] => data.steps[STEP_IDS.indexOf(stepId)]!.notes.map((note) => note.value)
/** The net ionic equations of a step that is done. */
export const stepEquations = (data: CationsData, stepId: StepId): string[] => data.steps[STEP_IDS.indexOf(stepId)]!.equations.map((equation) => equation.value)

/**
 * What the page itself says and no part of the lab's chemistry: the names of its cards, its pictures and their
 * marks, and its buttons. None of it says anything of a run.
 */
export const PAGE_TEXT = {
  parts: 'Parts',
  steps: 'Steps',
  place: (stepNumber: number, total: number) => `Step ${stepNumber} of ${total}`,
  previous: (title: string) => `Previous: ${title}`,
  next: (title: string) => `Next: ${title}`,
  run: (count: number) => `Run ${count}`,
  bench: 'The bench',
  tube: 'The tube',
  seen: 'What is seen',
  outcome: 'This run',
  hint: 'Hint',
  /** The name of the drawn tube, with which of the three it is; and of the picture of a step that is done, which has no rack beside it. */
  tubePicture: (tube: string) => `${tube}, drawn in a rack`,
  tubeAsChecked: (tube: string) => `${tube}, as it was when this step was checked`,
  /** Beside the picture's two brackets: which layer is liquid and which is solid. */
  liquidLayer: 'liquid',
  solidLayer: 'solid',
  /** Beside the one bracket of a liquid that a solid is spread through, which is neither of those alone. */
  spreadLayer: 'solid in the liquid',
  /** Beside the picture: what to do with it. It is the picture's description too. */
  explore: 'Point at the liquid and the bottom of the tube, or tap them or move to them with the keyboard, to look at each.',
  /** After the name of a part of the tube, in the list beside the picture and in the name of the part's button. */
  lookedAt: 'looked at',
  notLookedAt: 'not looked at yet',
  /** The closed disclosure that holds the whole tube described in words. */
  inWords: 'The tube in words',
  /** Beside the picture of a step that is done: the tube has been poured off or added to since. */
  asChecked: 'The tube is drawn as it was when this step was checked.',
  change: 'Change',
  cancel: 'Cancel',
  /** Beside a step's observation in Challenge until it is checked. */
  notChecked: 'Not checked yet',
  /** The button that sets a part up again, for each part. */
  runAgain: { known: 'Run this part again', unknown: 'Run this part again, with a new unknown' } satisfies Record<PartId, string>,
  /** Beside that button. */
  runAgainHelp: { known: 'Sets the part up afresh, with a new sample of the known. The run so far is kept in the record.', unknown: 'Sets the part up afresh, with a new unknown. The run so far is kept in the record.' } satisfies Record<PartId, string>,
  /** Where a step's notes will be, until the step is done: they say what each thing was. */
  notesLater: 'The notes on this step, and its equations, come once the step is done.',
  stepDone: 'Step done.',
  partDone: 'Part done: one run of it counts.',
} as const

/** The Record tab. */
export const RECORD_TEXT = {
  region: 'Record of the two parts',
  caption: 'Every run of each part, with what was recorded at each step and whether the run counted',
  part: 'Part',
  step: 'Step',
  recorded: 'As recorded',
  result: 'Result',
  nothing: 'Nothing recorded',
  open: 'Not finished yet',
  counts: 'Counts',
  doesNotCount: 'Does not count',
  chart: 'Flow chart',
  chartRight: 'Every place checked so far holds what belongs in it.',
  chartWrong: 'A place does not hold what belongs in it.',
  named: 'Ions named',
} as const

/** Under a step's sources: what is Valence's own. */
export const SOURCES_TEXT = "What each tube shows, whether an observation is what the tube showed and whether a run counts are worked out by Valence from these rules and values and from the model's amounts, which are Valence's own. The hints, the warnings and the feedback are written by Valence."
