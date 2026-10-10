import { SYSTEM_IDS, disturbanceOf, equilibriumOf, parameterOf, systemOf, type Cause, type DisturbanceId, type LechatelierData, type SystemId, type TubeId, type Way } from '@/chem-data/lechatelier/data'
import type { Blocked, DisturbanceView, Field, LechatelierModel, Look, Mode, Observation, Reason, RunOutcome, SystemView, Temperature, TubeShows } from '@/engine/lechatelier'

// Every sentence the Le Chatelier's principle lab says, keyed by the engine's identifiers, so that an identifier
// with no sentence does not compile. A sentence can say only what it is handed: the lab's record and what the
// engine's views hold, which is what is seen of a tube now and what the learner has entered. What a tube will show,
// which way an equilibrium goes and why are said in one place only: the notes of a disturbance that is done, which
// are in the record itself with their sources (src/chem-data/lechatelier/lechatelier.json). This module words
// everything else. The equilibrium as written, with the colour that tells each side, is shown from the start: it
// is what an answer is read from, and it gives none.
//
// Feedback on an observation says which part to look at again and never what it should be; feedback on an answer
// says that it is not right and never which answer is.

const listed = (items: readonly string[]) => (items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`)
const lower = (text: string) => `${text[0]!.toLowerCase()}${text.slice(1)}`
const upper = (text: string) => `${text[0]!.toUpperCase()}${text.slice(1)}`
const article = (word: string) => (/^[aeiou]/i.test(word) ? 'an' : 'a')
const TIMES = ['no times', 'once', 'twice', 'three times', 'four times', 'five times']
const times = (count: number) => TIMES[count] ?? `${count} times`

/** The lab's name, and what its page says at its head. */
export const LAB_TEXT = {
  title: "Le Chatelier's principle",
  /** Under the title: what the lab is, in a sentence. */
  aim: 'Disturb four equilibria in test tubes. Before each change, say which way the equilibrium will shift; then make the change, record what you see, and say which way it went.',
  /** Over the list of systems. */
  complete: 'The lab is complete once all four systems count.',
  completed: 'The lab is complete: all four systems count. Any system can still be worked again.',
} as const

/** "System 1", over a system's name. */
export const systemNumber = (systemId: SystemId) => `System ${SYSTEM_IDS.indexOf(systemId) + 1}`
/** A system's name, as the record has it: "A solid and its ions: lead chloride". */
export const systemName = (data: LechatelierData, systemId: SystemId) => systemOf(data, systemId).name

/** What each system is, under its name. None says what any tube shows. */
export const SYSTEM_AIM: Record<SystemId, string> = {
  'lead-chloride': 'A solid that lies in water with its own ions. You add one of the ions, heat the tube, cool it, and add water.',
  'methyl-violet': 'An indicator with two forms of different colours, one hydrogen ion apart. You add an acid, and then a base.',
  cobalt: 'Two ions of cobalt of different colours, one with water and one with chloride. You add water, heat the tube, and cool it.',
  hydroxides: 'Two metal ions, each with its solid hydroxide. For each metal you bring the solid down and share it among three tubes: one gets acid, one more sodium hydroxide, one ammonia.',
}

/** A count of drops, with its volume where that is half a millilitre or more: "2 drops", "20 drops (1 mL)". */
export function dropsText(data: LechatelierData, drops: number): string {
  const count = `${drops} ${drops === 1 ? 'drop' : 'drops'}`
  const millilitres = (drops * data.parameters.dropMicrolitres.value) / 1000
  return millilitres >= 0.5 ? `${count} (${millilitres} mL)` : count
}

/** A bottle, or the water, as a sentence speaks of it: "hydrochloric acid, 0.3 M", "distilled water". */
const reagentName = (data: LechatelierData, reagentId: string) => lower(reagentId === 'water' ? data.water.name : data.reagents.find((r) => r.id === reagentId)!.name)

/** The tubes as they are named. A system with one tube calls it the tube. */
export const TUBE_NAME: Record<TubeId, string> = {
  lead: 'The tube',
  indicator: 'The tube',
  cobalt: 'The tube',
  zinc: 'Zinc, first tube',
  'zinc-acid': 'Zinc, tube for acid',
  'zinc-base': 'Zinc, tube for more sodium hydroxide',
  'zinc-ammonia': 'Zinc, tube for ammonia',
  magnesium: 'Magnesium, first tube',
  'magnesium-acid': 'Magnesium, tube for acid',
  'magnesium-base': 'Magnesium, tube for more sodium hydroxide',
  'magnesium-ammonia': 'Magnesium, tube for ammonia',
}
// A tube that is shared out, as a share speaks of it.
const SHARED_FROM: Partial<Record<TubeId, string>> = { zinc: 'the first zinc tube', magnesium: 'the first magnesium tube' }

/** A reagent after its amount, with the comma its strength needs before the sentence goes on: "hydrochloric acid, 0.3 M," and "distilled water". */
const thenComma = (name: string) => (name.includes(', ') ? `${name},` : name)

/** What a tube holds to begin with, before anything is done to it: what went into it, and nothing of what it is. */
export function tubeStartText(data: LechatelierData, systemId: SystemId, tubeId: TubeId): string {
  const tube = systemOf(data, systemId).tubes.find((t) => t.id === tubeId)!
  if ('shareOf' in tube) return `This tube holds ${dropsText(data, data.parameters.shareDrops.value)} of the stirred mixture from ${SHARED_FROM[tube.shareOf] ?? lower(TUBE_NAME[tube.shareOf])}.`
  const liquids = tube.contents.filter((c) => 'drops' in c).map((c) => `${dropsText(data, parameterOf(data, c.drops))} of ${reagentName(data, c.reagentId)}`)
  const solids = tube.contents.filter((c) => 'grams' in c).map((c) => `about ${parameterOf(data, c.grams)} g of ${reagentName(data, c.reagentId)}`)
  return solids.length > 0 ? `This tube holds ${listed(solids)}, dissolved in ${listed(liquids)}.` : `This tube holds ${listed(liquids)}.`
}

/**
 * What has gone into a disturbance's tube before the disturbance, in the order it went: what the tube began with,
 * and what each disturbance before this one on the same tube did. It says what was done and nothing of what came
 * of it.
 */
export function tubeSoFarText(data: LechatelierData, disturbanceId: DisturbanceId): string {
  const { system, disturbance } = disturbanceOf(data, disturbanceId)
  const earlier = system.disturbances.slice(0, system.disturbances.indexOf(disturbance)).filter((d) => d.tube === disturbance.tube)
  const did = earlier.map((d) => {
    if (d.action.kind === 'heat') return 'Then it stood in the bath of boiling water.'
    if (d.action.kind === 'cool') return 'Then it stood in the bath of ice water.'
    const portions = d.action.portions === undefined ? 1 : parameterOf(data, d.action.portions)
    return `Then ${dropsText(data, portions * parameterOf(data, d.action.drops))} of ${thenComma(reagentName(data, d.action.reagentId))} went in.`
  })
  return [tubeStartText(data, system.id, disturbance.tube).replace(/^This tube holds/, earlier.length > 0 ? 'This tube began with' : 'This tube holds'), ...did].join(' ')
}

/** The bench of a system in words: its tubes to begin with, the bottles it adds from, and the baths where it uses them. */
export function benchLines(data: LechatelierData, systemId: SystemId): string[] {
  const system = systemOf(data, systemId)
  const made = system.tubes.filter((t) => 'contents' in t)
  const added = [...new Set(system.disturbances.flatMap((d) => (d.action.kind === 'add' ? [d.action.reagentId] : [])))]
  const bottles = added.filter((id) => id !== 'water').map((id) => reagentName(data, id))
  const shares = system.tubes.filter((t) => 'shareOf' in t).length
  const baths = system.disturbances.some((d) => d.action.kind !== 'add')
  return [
    ...made.map((tube) => `${TUBE_NAME[tube.id]}: ${lower(tubeStartText(data, systemId, tube.id)).replace(/^this tube holds /, '')}`),
    ...(bottles.length > 0 ? [`To add, each from a dropper bottle: ${bottles.join('; ')}.`] : []),
    ...(added.includes('water') ? [`${data.water.name}.`] : []),
    ...(shares > 0 ? [`${upper(['zero', 'one', 'two', 'three', 'four', 'five', 'six'][shares] ?? String(shares))} small test tubes, clean and empty, for the shares.`] : []),
    ...(baths ? ['A bath of boiling water and a bath of ice water.'] : []),
  ]
}

/** The equilibrium a disturbance disturbs, as its card shows it: the equation, and what stands on each side. */
export const EQUILIBRIUM_TEXT = {
  heading: 'The equilibrium, as written',
  left: 'Left side',
  right: 'Right side',
} as const
export function equilibriumLines(data: LechatelierData, disturbanceId: DisturbanceId): { equation: string; left: string; right: string } {
  const { equation, left, right } = equilibriumOf(data, disturbanceId)
  return { equation, left: `${EQUILIBRIUM_TEXT.left}: ${left}.`, right: `${EQUILIBRIUM_TEXT.right}: ${right}.` }
}

/** "Disturbance 2 of 4: Heat the tube". */
export function disturbanceTitle(data: LechatelierData, disturbanceId: DisturbanceId): string {
  const { system, disturbance } = disturbanceOf(data, disturbanceId)
  return `Disturbance ${system.disturbances.indexOf(disturbance) + 1} of ${system.disturbances.length}: ${disturbance.name}`
}

/** What is about to be done at a disturbance, under its title. It says what is done and nothing of what will be seen. */
export function taskText(data: LechatelierData, disturbanceId: DisturbanceId): string {
  const { action } = disturbanceOf(data, disturbanceId).disturbance
  if (action.kind === 'heat') return 'Stand the tube in the bath of boiling water.'
  if (action.kind === 'cool') return 'Stand the tube in the bath of ice water.'
  const portions = action.portions === undefined ? 1 : parameterOf(data, action.portions)
  const amount = dropsText(data, parameterOf(data, action.drops))
  const name = reagentName(data, action.reagentId)
  return portions === 1 ? `Add ${amount} of ${thenComma(name)} to the tube.` : `Add ${thenComma(name)} to the tube: ${amount} at a time, ${times(portions)}. Look at the tube after each portion.`
}

/** The button of a disturbance's action: "Add 2 drops of hydrochloric acid, 0.3 M". Where there are several portions the same button adds again. */
export function actionLabel(data: LechatelierData, disturbanceId: DisturbanceId): string {
  const { action } = disturbanceOf(data, disturbanceId).disturbance
  if (action.kind === 'heat') return 'Heat the tube in boiling water'
  if (action.kind === 'cool') return 'Cool the tube in ice water'
  return `Add ${dropsText(data, parameterOf(data, action.drops))} of ${reagentName(data, action.reagentId)}`
}

/** What has been done to a disturbance's tube so far, in words, beside its picture. It says what was done and nothing of what came of it. */
export function doneText(view: Pick<DisturbanceView, 'kind' | 'portions' | 'acted'>): string {
  if (view.kind === 'heat') return view.acted === 0 ? 'The tube has not been heated yet.' : 'The tube has stood in the boiling water.'
  if (view.kind === 'cool') return view.acted === 0 ? 'The tube has not been cooled yet.' : 'The tube has stood in the ice water.'
  if (view.acted === 0) return 'Nothing has been added yet.'
  if (view.portions === 1) return 'It has been added.'
  return view.acted >= view.portions ? `All ${view.portions} portions have gone in.` : `${view.acted} of ${view.portions} portions ${view.acted === 1 ? 'has' : 'have'} gone in.`
}

/** Where a tube stands. */
export const TEMPERATURE_TEXT: Record<Temperature, string> = {
  room: 'The tube stands in the rack, at room temperature.',
  hot: 'The tube stands in the bath of boiling water.',
  cold: 'The tube stands in the bath of ice water.',
}

/** The three ways an equilibrium can go, as a choice names them. */
export const WAY_LABEL: Record<Way, string> = { left: 'Toward the left side', right: 'Toward the right side', none: 'Not at all' }
/** A way with what stands on that side, for the two choice forms: "Toward the left side: lead ions and chloride ions, dissolved". */
export function wayChoices(data: LechatelierData, disturbanceId: DisturbanceId): { value: Way; label: string }[] {
  const { left, right } = equilibriumOf(data, disturbanceId)
  return [
    { value: 'left', label: `${WAY_LABEL.left}: ${left}` },
    { value: 'right', label: `${WAY_LABEL.right}: ${right}` },
    { value: 'none', label: WAY_LABEL.none },
  ]
}

/** The prediction made before a disturbance (spec 18.3): asked, kept and never marked. */
export const PREDICTION_TEXT = {
  heading: 'Before',
  question: 'Which way will the equilibrium shift?',
  help: 'This is not marked. It is kept so that you can set it beside what happens.',
  record: 'Record my prediction',
  /** Once the disturbance's action has begun. */
  fixed: 'Your prediction is fixed: the change has begun.',
  /** Beside a disturbance's notes. */
  said: (way: Way) => `You predicted: ${lower(WAY_LABEL[way])}.`,
} as const

/** The two parts of a tube that are looked at, as the list beside the picture names them. */
export const LOOK_PART: Record<Look, string> = { liquid: 'The liquid', bottom: 'The bottom of the tube' }
export const lookLabel = (look: Look, looked: boolean) => `Look at ${lower(LOOK_PART[look])}${looked ? `, ${PAGE_TEXT.lookedAt}` : ''}`

/** A liquid in a sentence after "is": "clear and colourless", "clear, and between blue and yellow in colour". */
const clearAnd = (colour: string) => (colour.includes(' ') ? `clear, and ${colour} in colour` : `clear and ${colour}`)

/**
 * What a look at one part of a tube says: what is seen there and nothing of what it is. This lab's liquids are
 * clear and its solids lie at the bottom; a cloudy liquid, which the shared shape of a tube allows, is said too.
 */
export function lookText(shows: TubeShows, look: Look): string {
  const { liquid, solid } = shows
  if (look === 'bottom') {
    if (solid === null) return liquid === null ? 'The tube is empty.' : 'No solid is at the bottom.'
    return solid.settled ? `${upper(article(solid.colour))} ${solid.colour} solid lies at the bottom.` : 'Nothing has settled at the bottom yet.'
  }
  if (liquid === null) return 'There is no liquid in the tube.'
  if (liquid.cloudy && solid !== null) return `The liquid is cloudy: ${article(solid.colour)} ${solid.colour} solid is spread through it.`
  return `The liquid is ${clearAnd(liquid.colour)}.`
}

/** A whole tube described in words (spec 18.7): its solid and its liquid as they lie in it, and where it stands. Null is a tube not yet in use. */
export function tubeText(shows: TubeShows | null, temperature: Temperature | null = null): string {
  const where = temperature === null ? '' : ` ${TEMPERATURE_TEXT[temperature]}`
  if (shows === null || (shows.liquid === null && shows.solid === null)) return 'The tube is not in use yet.'
  const { liquid, solid } = shows
  if (liquid === null) return `${upper(article(solid!.colour))} ${solid!.colour} solid lies at the bottom of the tube, with no liquid over it.${where}`
  if (solid === null) return `The tube holds a liquid that is ${clearAnd(liquid.colour)}. There is no solid in it.${where}`
  if (!solid.settled) return `The tube holds a cloudy liquid: ${article(solid.colour)} ${solid.colour} solid is spread through it.${where}`
  return `${upper(article(solid.colour))} ${solid.colour} solid lies at the bottom of the tube. The liquid over it is ${clearAnd(liquid.colour)}.${where}`
}

/** What each question of the observation asks. */
export const FIELD_LABEL: Record<Field, string> = { solid: 'Solid in the tube', liquid: 'Colour of the liquid' }
// How a question is spoken of in feedback.
const FIELD_NAME: Record<Field, string> = { solid: 'the solid', liquid: 'the colour of the liquid' }

/** A choice as the form shows it: the record's word, spelt out where the word alone would read oddly as an answer. */
export const choiceLabel = (field: Field, choice: string): string => (field === 'solid' ? (choice === 'none' ? 'no solid' : `${article(choice)} ${choice} solid`) : choice)
/** The choices of a question, each with its label: the stored value is the record's word. */
export const choiceList = (m: LechatelierModel, field: Field) => (field === 'solid' ? m.solidChoices : m.liquidChoices).map((value) => ({ value, label: choiceLabel(field, value) }))

/** An observation in words, one line for each question: "Solid in the tube: a white solid." */
export const observationLines = (observation: Observation): string[] => (Object.keys(FIELD_LABEL) as Field[]).map((field) => `${FIELD_LABEL[field]}: ${choiceLabel(field, observation[field])}.`)

/** The observation, and what stands in its place until it opens. */
export const OBSERVATION_TEXT = {
  heading: 'What is seen',
  record: 'Record what I see',
  /** Under the questions while the action is not complete. */
  actFirst: 'Not open yet. Make the change first, all of it.',
  /** Under the questions while a part of the tube has not been looked at since it last changed. */
  lookFirst: 'Not open yet. Look at the liquid and at the bottom of the tube in the picture first.',
} as const

/** Guided's feedback on an observation it does not record: which part to look at again, never what it should be. */
export const mismatchText = (wrong: readonly Field[]): string => (wrong.length === 0 ? '' : `Not yet. Look again at ${listed(wrong.map((field) => FIELD_NAME[field]))}.`)

/** Beside an observation once it has been judged: that it is what the tube showed, or which part is not. */
export const checkedText = (wrong: readonly Field[]): string =>
  wrong.length === 0 ? 'Checked: this is what the tube showed.' : `Checked: ${listed(wrong.map((field) => FIELD_NAME[field]))} ${wrong.length === 1 ? 'is' : 'are'} not what the tube showed.`

/** The metal of each of the fourth system's two equilibria, as its question names it. */
const METAL: Record<string, string> = { 'zinc-hydroxide': 'zinc', 'magnesium-hydroxide': 'magnesium' }

/** What took the metal ion away, as a choice names it. */
export const CAUSE_LABEL: Record<Cause, string> = {
  hydroxide: 'Hydroxide ions: they hold it in a complex ion that stays dissolved',
  ammonia: 'Ammonia: it holds it in a complex ion that stays dissolved',
  nothing: 'Nothing: the solid is still there',
}

/** The question a disturbance asks once its tube has been observed (spec 18.3), with its choices. The same choices stand at every disturbance that asks the same question. */
export function askText(data: LechatelierData, disturbanceId: DisturbanceId): { heading: string; question: string; choices: { value: string; label: string }[] } {
  const { disturbance } = disturbanceOf(data, disturbanceId)
  if (disturbance.ask.kind === 'direction') return { heading: 'Which way it went', question: 'Which way did the equilibrium shift?', choices: wayChoices(data, disturbanceId) }
  const metal = METAL[disturbance.equilibriumId] ?? 'metal'
  return {
    heading: `What took the ${metal} ion away`,
    question: `By the equilibrium as written, what was added should give more solid. Did something take the ${metal} ion out of this equilibrium instead?`,
    choices: (Object.keys(CAUSE_LABEL) as Cause[]).map((value) => ({ value, label: CAUSE_LABEL[value] })),
  }
}

/** An answer as it was given, for the page and the record: "Toward the left side", "Nothing: the solid is still there". */
export const answerLabel = (answer: string): string => (answer in WAY_LABEL ? WAY_LABEL[answer as Way] : answer in CAUSE_LABEL ? CAUSE_LABEL[answer as Cause] : answer)

/** The answer, and what goes with it. */
export const ANSWER_TEXT = {
  record: 'Record my answer',
  /** Under the question until the observation is recorded. */
  observeFirst: 'Not open yet. Record what you see in the tube first.',
  /** In Challenge, beside the button: an answer ends the disturbance. */
  once: 'You answer once. After that this disturbance is done and its notes are shown.',
  right: 'Right',
  notRight: 'Not right',
  /** Beside an answer in Challenge until its system is checked. */
  notChecked: 'Not checked yet',
} as const

// Hints that several disturbances share.
const ADDED = 'A system at equilibrium moves away from the side that something is added to.'
const TAKEN = 'A system at equilibrium moves toward the side that something is taken from.'
const HEATED = 'Heating puts heat in. One direction of every equilibrium takes heat in, and a heated system moves that way. What the tube shows after heating tells you which direction that is here.'
const COOLED = 'Cooling takes heat out. The system moves the way that gives heat out, which is the opposite of the way it went when it was heated.'
const DROP = `Sodium hydroxide brings hydroxide ions. Find hydroxide in the equilibrium as written. ${ADDED}`
const ACID = `The acid brings hydrogen ions, and each one joins a hydroxide ion and makes water. So hydroxide is taken away. ${TAKEN}`
const MORE_BASE = 'By the equilibrium as written, more hydroxide should give more solid. Look whether the solid is still there. If it has gone, something took the metal ion out of this equilibrium: think what was added in a large amount.'
const AMMONIA = 'Ammonia is a base, so by the equilibrium as written it should not make the solid dissolve. Look whether the solid is still there. If it has gone, something took the metal ion out of this equilibrium: think what was added in a large amount.'

/** Guided's hint for each disturbance, in a closed disclosure (spec 18.3). Each says how to think about the question, and none says what the tube shows or which answer is right. */
export const HINT: Record<DisturbanceId, string> = {
  'lead-acid': `Hydrochloric acid brings chloride ions. Find chloride in the equilibrium as written. ${ADDED}`,
  'lead-heat': HEATED,
  'lead-cool': COOLED,
  'lead-water': 'Water makes everything that is dissolved more dilute, and a solid is not diluted. A diluted system moves toward the side with more dissolved particles.',
  'indicator-acid': `Hydrochloric acid brings hydrogen ions. Find the hydrogen ion in the equilibrium as written. ${ADDED} The colour tells you which form there is more of.`,
  'indicator-base': `Sodium hydroxide brings hydroxide ions, and each one joins a hydrogen ion and makes water. So hydrogen ions are taken away. ${TAKEN}`,
  'cobalt-water': `Find water in the equilibrium as written. ${ADDED} The colour tells you which ion there is more of.`,
  'cobalt-heat': HEATED,
  'cobalt-cool': COOLED,
  'zinc-drop': DROP,
  'zinc-acid': ACID,
  'zinc-base': MORE_BASE,
  'zinc-ammonia': AMMONIA,
  'magnesium-drop': DROP,
  'magnesium-acid': ACID,
  'magnesium-base': MORE_BASE,
  'magnesium-ammonia': AMMONIA,
}

/** Why an action cannot be done now, or why Guided did not take an entry. `disturbanceId` is the disturbance the system has reached, where it has one. */
export function blockedText(data: LechatelierData, blocked: Blocked, disturbanceId: DisturbanceId | null = null): string {
  const act = disturbanceId === null ? 'Make the change' : actionLabel(data, disturbanceId)
  switch (blocked) {
    case 'unknown-system':
      return 'There is no such system.'
    case 'system-checked':
      return 'This run of the system has been checked. Work the system again for a new run.'
    case 'all-done':
      return 'Every disturbance of this system is done. What is left is to have the system checked.'
    case 'not-all-done':
      return 'The system is checked once every one of its disturbances is done.'
    case 'predict-first':
      return 'First say which way you think the equilibrium will shift. It is not marked.'
    case 'prediction-fixed':
      return 'The change has begun, so the prediction stays as it is.'
    case 'action-done':
      return 'That has been done. The amount is fixed.'
    case 'act-first':
      return `First: ${lower(act)}${disturbanceId !== null && disturbanceOf(data, disturbanceId).disturbance.stages.length > 1 ? ', every portion of it' : ''}.`
    case 'look-first':
      return 'Look at the liquid and at the bottom of the tube first: what you record is what you saw there.'
    case 'observe-first':
      return 'Record what you see in the tube first.'
    case 'invalid-entry':
      return 'Choose one answer for each question.'
    case 'nothing-to-repeat':
      return 'This run has not been begun: there is nothing to work again.'
    case 'no-more-runs':
      return 'The record holds no more runs of this system, and its last run counts. The system is done.'
    case 'run-too-long':
      return 'This run has gone on for longer than the record can hold. Work the system again.'
    case 'does-not-match':
      return 'That is not what the tube shows. Look at the liquid and at the bottom of the tube again.'
    case 'not-right':
      return 'Not that one. Look at what changed in the tube, find it in the equilibrium as written, and try again.'
  }
}

/** A disturbance as a sentence speaks of it: "disturbance 2 (heat the tube)". */
function disturbanceRef(data: LechatelierData, disturbanceId: DisturbanceId): string {
  const { system, disturbance } = disturbanceOf(data, disturbanceId)
  return `disturbance ${system.disturbances.indexOf(disturbance) + 1} (${lower(disturbance.name)})`
}

/** One reason a run does not count, as a sentence (spec 18.3). It says where, and never what was right. */
export function reasonText(data: LechatelierData, reason: Reason): string {
  return reason.kind === 'observation-wrong' ? `What was recorded at ${disturbanceRef(data, reason.disturbance)} is not what the tube showed.` : `The answer at ${disturbanceRef(data, reason.disturbance)} is not right.`
}

/** The sentence for a run as it stands: that it is to be checked, that it counts, or that it does not and where (spec 18.3). Empty while disturbances are still to be worked. */
export function outcomeText(data: LechatelierData, outcome: RunOutcome): string {
  if (outcome.state === 'open') return ''
  if (outcome.state === 'to-check') return 'Every disturbance of this system is done. Have the system checked.'
  if (outcome.state === 'counts') return 'This system counts: each observation is what its tube showed, and each answer is right.'
  return `This run does not count. ${outcome.reasons.map((reason) => reasonText(data, reason)).join(' ')} Work the system again.`
}

/** What each mode does in this lab (spec 18.3), beside its radio button. */
export const MODE_TEXT: Record<Mode, string> = {
  guided: 'Guided: the lab checks each observation and each answer as you give it, takes only what is right, and has a hint for each disturbance ready to open.',
  challenge: 'Challenge: no hints. The lab takes whatever you record and checks a system only when you ask. A system that is not right is worked again.',
}

/** How far a system has come, in the list of systems and on its page, beside a mark that says the same. */
export type Progress = 'not-started' | 'under-way' | 'to-check' | 'not-counted' | 'done'
export function progressOf(view: Pick<SystemView, 'disturbances' | 'outcome' | 'done'>): Progress {
  if (view.done) return 'done'
  if (view.outcome.state === 'does-not-count') return 'not-counted'
  if (view.outcome.state === 'to-check') return 'to-check'
  return view.disturbances.some((d) => d.status === 'done' || d.prediction !== null || d.looked.length > 0) ? 'under-way' : 'not-started'
}
export const PROGRESS_TEXT: Record<Progress, string> = {
  'not-started': 'Not started',
  'under-way': 'Under way',
  'to-check': 'To be checked',
  'not-counted': 'Run did not count',
  done: 'Done',
}

/** How far a disturbance has come, in the list of disturbances. */
export const DISTURBANCE_STATUS_TEXT: Record<DisturbanceView['status'], string> = { waiting: 'Not reached yet', current: 'Under way', done: 'Done' }

/** The headings of a disturbance that is done: its notes, which say what happened and why, and any equation that goes with them. */
export const NOTES_TEXT = {
  notes: 'What happened, and why',
  equations: 'A second change in the tube',
  /** Where a disturbance's notes will be, until it is done. */
  later: 'The notes on this disturbance come once it is done.',
} as const

/** The notes of a disturbance that is done, as the record has them. A page shows them only where the disturbance's view says so. */
export const disturbanceNotes = (data: LechatelierData, disturbanceId: DisturbanceId): string[] => disturbanceOf(data, disturbanceId).disturbance.notes.map((note) => note.value)
/** The equations that go with those notes; none for most disturbances. */
export const disturbanceEquations = (data: LechatelierData, disturbanceId: DisturbanceId): string[] => (disturbanceOf(data, disturbanceId).disturbance.equations ?? []).map((equation) => equation.value)

/**
 * What the page itself says and no part of the lab's chemistry: the names of its cards, its pictures and their
 * marks, and its buttons. None of it says anything of a run.
 */
export const PAGE_TEXT = {
  systems: 'Systems',
  disturbances: 'Disturbances',
  previous: (title: string) => `Previous: ${title}`,
  next: (title: string) => `Next: ${title}`,
  run: (count: number) => `Run ${count}`,
  bench: 'The bench',
  tube: 'The tube',
  task: 'What is done',
  hint: 'Hint',
  outcome: 'This system',
  /** The name of the drawn tube. */
  tubePicture: (tube: string) => `${tube}, drawn`,
  /** Beside the picture's two brackets: which layer is liquid and which is solid. */
  liquidLayer: 'liquid',
  solidLayer: 'solid',
  /** Beside the picture: what to do with it. It is the picture's description too. */
  explore: 'Hover over or tap the liquid and the bottom of the tube to look at each.',
  /** After the name of a part of the tube, in the list beside the picture and in the name of the part's button. */
  lookedAt: 'looked at',
  notLookedAt: 'not looked at yet',
  /** The closed disclosure that holds the whole tube described in words. */
  inWords: 'The tube in words',
  change: 'Change',
  cancel: 'Cancel',
  checkSystem: 'Check this system',
  /** Beside that button, in Challenge. */
  checkSystemHelp: 'Checks every observation and every answer of this system together. After that this run takes nothing more.',
  workAgain: 'Work this system again',
  workAgainHelp: 'Sets the system up afresh, with new tubes. The run so far is kept in the record.',
  disturbanceDone: 'Disturbance done.',
  systemDone: 'System done: one run of it counts.',
} as const

/** The Record tab. */
export const RECORD_TEXT = {
  region: 'Record of the four systems',
  caption: 'Every run of each system, with what was predicted, recorded and answered at each disturbance, and whether the run counted',
  system: 'System',
  disturbance: 'Disturbance',
  predicted: 'Predicted',
  recorded: 'As recorded',
  answered: 'Answer',
  result: 'Result',
  nothing: 'Nothing recorded',
  open: 'Not finished yet',
  toCheck: 'Not checked yet',
  counts: 'Counts',
  doesNotCount: 'Does not count',
} as const

/** Under a disturbance's sources: what is Valence's own. */
export const SOURCES_TEXT =
  "What each tube shows is stored with the lab. Where a number can decide it, Valence works it out from these values and from the model's amounts, which are Valence's own. Whether an entry is right and whether a system counts are worked out by Valence, which also wrote the hints and the feedback."
