import { PART_IDS, runOf, saltOf, type HotcoldData, type PartId, type SaltId } from '@/chem-data/hotcold/data'
import { CHOICES, formatTenths, isChoice, type Blocked, type BenchView, type Choice, type CupView, type Field, type GraphView, type HotcoldModel, type Mode, type PacksView, type Question, type Reason, type RunOutcome, type RunView, type Value, type Verdict, type Warning } from '@/engine/hotcold'

// Every sentence the endothermic and exothermic lab says that is chemistry, keyed by the engine's identifiers, so
// that an identifier with no sentence does not compile. A sentence can say only what it is handed: the lab's
// record and what the engine's views hold, which is never a reading not yet taken, which way a salt's temperature
// goes, or which salt answers a question of part 3, until the learner's own entries have given it. The notes
// shown when a part is done are in the record itself, with their sources (src/chem-data/hotcold/hotcold.json);
// this module words everything else.
//
// Feedback on an entry says that it does not follow, and never the value or the choice it should have been.

/** A name as it is said inside a sentence: its first letter small, but for a name that is a proper one ("Epsom salt"). */
const lower = (text: string) => (/^Epsom/.test(text) ? text : text.replace(/^\p{L}/u, (letter) => letter.toLowerCase()))
/** A number with a true minus sign in front of it where it is negative. */
const minus = (text: string) => text.replace(/^-/, '−')

/** A salt as a sentence names it: "Epsom salt", "calcium chloride". */
export const saltName = (data: HotcoldData, salt: SaltId) => lower(saltOf(data, salt).name)

/** A temperature as the logger shows it: "21.4 °C". */
export const temperatureText = (tenths: number) => `${minus(formatTenths(tenths))} °C`
/** A mass as the balance shows it: "10.02 g". */
export const massText = (cg: number) => `${(cg / 100).toFixed(2)} g`
/** A time on the logger, from its first reading: "30 s", "1 min", "1 min 30 s". */
export function timeText(m: HotcoldModel, step: number): string {
  const seconds = step * m.stepSeconds
  const [min, s] = [Math.floor(seconds / 60), seconds % 60]
  return min === 0 ? `${s} s` : s === 0 ? `${min} min` : `${min} min ${s} s`
}

/** "Part 1: Epsom salt in water". */
export function partTitle(data: HotcoldData, part: PartId): string {
  return `Part ${PART_IDS.indexOf(part) + 1}: ${data.parts[PART_IDS.indexOf(part)]!.name}`
}

/** What each part finds, under its title, in both modes. None says which way a temperature goes. */
export const PART_AIM: Record<PartId, string> = {
  'epsom-salt': 'What the water does when Epsom salt dissolves in it, and which kind of change that is.',
  'calcium-chloride': 'What the water does when calcium chloride dissolves in it, and which kind of change that is.',
  packs: 'Which of the two salts would suit a pack that warms, and which a pack that cools.',
}

/** The water measured into the cup, as the bench prints it: "50.0 mL". */
const waterText = (data: HotcoldData, salt: SaltId) => {
  const amount = runOf(data, salt).amounts.find((a) => 'shown' in a)
  return amount && 'shown' in amount ? `${amount.shown} ${amount.unit}` : ''
}

/** The bench in words: what is used, and what the balance reads. Each line is as true at the end of the run as at its start. */
export function benchLines(data: HotcoldData, salt: SaltId, bench: BenchView): string[] {
  const { name, chemicalName, appearance } = saltOf(data, salt)
  return [
    'A foam cup with a lid, a stirrer and a temperature probe. The logger shows the probe to 0.1 °C.',
    `${waterText(data, salt)} of ${data.water.name.toLowerCase()}, in the cup.`,
    `${name} (${chemicalName.value}), ${appearance.value}, weighed out: the balance reads ${massText(bench.balanceCg)}.`,
  ]
}

/** The cards of a part, its buttons, and what is said beside them. */
export const BENCH_TEXT = {
  bench: 'The bench',
  cup: 'The cup',
  graph: 'The graph',
  notebook: 'The notebook',
  lid: 'Put the lid on',
  stir: 'Stir',
  logger: 'Start the logger',
  runOn: 'Run on',
  /** Beside Run on: what one press does. */
  runOnHelp: (m: HotcoldModel) => `Lets ${m.runOnSteps * m.stepSeconds} seconds pass: ${m.runOnSteps === 2 ? 'two' : m.runOnSteps} more readings.`,
  check: 'Check the notebook',
  runAgain: 'Run this part again',
  /** Beside Run this part again. */
  runAgainHelp: 'Sets the part up afresh, with new numbers. The run so far is kept in the record.',
  /** Beside the graph once the logger is started: what to do with it. */
  explore: 'Point at a point of the graph, or tap it or move to it with the keyboard, to look at it.',
  hint: 'A hint for this entry',
  notes: 'Notes on this part',
  /**
   * Under Run on, from the press that turns the curve back until the first entry is made: the notebook opens under
   * the graph, which may be out of the window, and focus stays on Run on. It says nothing of which way the curve went.
   */
  turned: 'The curve has turned back: the notebook is open, under the graph.',
  /** In the notebook and under Run on, where the logger is full and no notebook can open. */
  spent: 'The logger has taken all the readings it can hold, and the curve has not turned back, so the notebook cannot open. Run this part again.',
  done: 'Part done: one run of it counts.',
  complete: 'The lab is complete: a run of each salt counts, and both questions of part 3 are right.',
} as const

/** The one action that starts the change: "Add the Epsom salt". */
export const addLabel = (data: HotcoldData, salt: SaltId) => `Add the ${saltName(data, salt)}`

/** The cup's state in words: what is in it, the lid, the stirrer and the logger. It says what was done and never what the temperature does. */
export function cupText(data: HotcoldData, salt: SaltId, cup: CupView, readings: number): string {
  const name = saltName(data, salt)
  const contents = cup.saltAdded ? `The ${name} is in the water.` : `The cup holds the water. The ${name} has not been added.`
  const logger = !cup.loggerStarted ? 'The logger has not been started.' : `The logger is running: ${readings === 1 ? 'one reading' : `${readings} readings`} so far.`
  return [contents, cup.lidOn ? 'The lid is on.' : 'The lid is off.', cup.stirring ? 'The stirrer is going.' : 'The stirrer is still.', logger].join(' ')
}

/**
 * The bench and the cup in one line each, for a run whose salt is in: from then on they are what was done, and
 * the page folds each under its line. They say what the cards themselves say and no more.
 */
export function foldedText(data: HotcoldData, salt: SaltId, view: { bench: BenchView; cup: CupView }): { bench: string; cup: string } {
  const { bench, cup } = view
  return {
    bench: `${saltOf(data, salt).name}: ${massText(bench.balanceCg)}, in ${waterText(data, salt)} of water.`,
    cup: `The ${saltName(data, salt)} is in. Lid ${cup.lidOn ? 'on' : 'off'}, stirrer ${cup.stirring ? 'going' : 'still'}.`,
  }
}

/** What a look at a point of the graph says: its time and its temperature, "45 s: 19.8 °C". */
export const pointCallout = (m: HotcoldModel, step: number, tenths: number) => `${timeText(m, step)}: ${temperatureText(tenths)}`

/** A point of the graph as its button names it, before and after it is looked at. */
export const pointLabel = (m: HotcoldModel, step: number, looked: boolean) => `Look at the reading at ${timeText(m, step)}${looked ? ', looked at' : ''}`

/**
 * The graph described in words: where it starts, when the salt goes in, where it peaks or bottoms, and that it
 * drifts back. It says what the logger has drawn so far and nothing of what it will draw. It names the readings
 * the notebook's two temperatures are taken from, so the page keeps it behind a closed disclosure.
 */
export function describeGraph(m: HotcoldModel, graph: GraphView): string {
  const { readings, changedAt, extreme } = graph
  if (readings.length === 0) return 'The logger has not been started, and the graph is empty.'
  const axes = 'Temperature in degrees Celsius is up the side and time along the bottom, with a point for each reading.'
  const last = readings.length - 1
  const level = `The readings are level at ${temperatureText(readings[0]!)}`
  if (changedAt === null) return `${axes} ${readings.length === 1 ? `There is one reading: ${temperatureText(readings[0]!)} at ${timeText(m, 0)}` : `${level}, from ${timeText(m, 0)} to ${timeText(m, last)}`}. The salt has not been added.`
  const start = `${level} until the salt is added, just after the reading at ${timeText(m, changedAt)}.`
  if (last === changedAt) return `${axes} ${start} No reading has been taken since.`
  if (extreme === null) return `${axes} ${start} The readings since are still at ${temperatureText(readings[last]!)}.`
  const up = extreme.tenths > readings[changedAt]!
  if (!graph.turned) {
    const flat = last > extreme.step ? `, and are level there up to the latest reading, at ${timeText(m, last)}` : ', the latest reading'
    return `${axes} ${start} They then ${up ? 'rise' : 'fall'}, to ${temperatureText(extreme.tenths)} at ${timeText(m, extreme.step)}${flat}. The curve has not turned back yet.`
  }
  return `${axes} ${start} They then ${up ? 'rise to a highest' : 'fall to a lowest'} reading of ${temperatureText(extreme.tenths)}, first reached at ${timeText(m, extreme.step)}, and after it drift slowly back: the latest reading, at ${timeText(m, last)}, is ${temperatureText(readings[last]!)}.`
}

/** The notebook's labels. The second names both the highest and the lowest whatever the graph shows: which of the two it was is the fourth entry. */
export const FIELD_LABEL: Record<Field, string> = {
  start: 'Starting temperature, in °C',
  extreme: 'Highest or lowest temperature reached, in °C',
  change: 'Change in temperature, as a size, in °C',
  temperature: 'The water got',
  heat: 'The dissolving',
  word: 'This change is',
}

/** The choices of the three entries that are chosen, each as it is read after its label. */
export const CHOICE_LABEL: { [C in Choice]: Record<(typeof CHOICES)[C][number], string> } = {
  temperature: { warmer: 'warmer', colder: 'colder' },
  heat: { out: 'gave heat out', in: 'took heat in' },
  word: { exothermic: 'exothermic', endothermic: 'endothermic' },
}
export const choicesOf = (field: Choice) => CHOICES[field].map((value) => ({ value, label: (CHOICE_LABEL[field] as Record<string, string>)[value]! }))

/** A typed entry as it stands in its field: the number as it was typed, without its unit, which the label gives. */
export const entryText = (value: number) => minus(formatTenths(value))
/** An entry as it is read beside its label, in the notebook once it takes no typing and in the record: the number alone, or the choice in words. */
export const enteredText = (field: Field, value: Value) => (typeof value === 'number' ? entryText(value) : isChoice(field) ? ((CHOICE_LABEL[field] as Record<string, string>)[value] ?? value) : value)

/** How each kind of entry is made, under its field. No run starts at the example temperature or changes by the example change; the temperature can be the lowest reading of a run of Epsom salt, by chance, and it is the same under both temperatures of either salt. */
export function formatHelp(field: Field): string {
  if (isChoice(field)) return 'Choose one.'
  return field === 'change' ? 'One decimal place: 3.5' : 'One decimal place, as the logger shows it: 18.6'
}

/** Guided's closed hint for each entry. It says how the entry is found and gives no figure of the run, and no answer. */
export const HINT_TEXT: Record<Field, string> = {
  start: 'The temperature the logger shows before the salt is added, where the points lie level. Look at one of those points.',
  extreme: 'The reading furthest from the starting temperature after the salt is added: the highest point if the points climbed, the lowest if they dropped. Look at that point.',
  change: 'The difference between your two temperatures: take the smaller from the larger.',
  temperature: 'Compare your two temperatures. Did the water end up above where it started, or below?',
  heat: 'Water that gains heat gets warmer, and water that loses heat gets colder. The heat the water gained came from the dissolving; the heat it lost went into the dissolving.',
  word: 'A change that gives heat out is exothermic. A change that takes heat in is endothermic.',
}

// None of these sends the learner to the hint: Guided has it under the entry, and a notebook that has been checked, or Challenge's, has none to open.
const NOT_FOLLOWING: Record<Field, string> = {
  start: 'That is not the temperature the logger shows before the salt was added. Look at a point on the level part of the graph, and type its temperature.',
  extreme: 'That is not the highest temperature the logger shows after the salt was added, or the lowest if the points dropped. Look at the points again, and type the temperature of the one furthest from the start.',
  change: 'That is not the difference between the two temperatures you entered.',
  temperature: 'That does not fit the two temperatures you entered. Which is the higher?',
  heat: 'That does not fit what you entered for the water. Think where the heat that warmed the water came from, or where the heat it lost went.',
  word: 'That is not the word for what you entered above it.',
}
const WRONG_SIGN = 'The size is right and the sign is not. Give the size alone, or the change with the sign it has: a minus only where the temperature fell.'

/** Feedback on an entry that does not follow: that it does not, and never what it should have been. Empty for an entry that follows. */
export function entryFeedback(field: Field, verdict: Verdict): string {
  if (verdict.follows) return ''
  return verdict.slip === 'wrong-sign' ? WRONG_SIGN : NOT_FOLLOWING[field]
}

/** Beside an entry once it is checked. */
export const VERDICT_TEXT = { follows: 'Follows', not: 'Does not follow' } as const

const NOT_LOOKED: Partial<Record<Field, string>> = {
  start: 'Look at a reading before the salt was added first.',
  extreme: 'Look at the reading furthest from the start first: the highest point, or the lowest.',
}

/** Why an action cannot be done now, or why Guided did not take an entry or an answer. `field` is the entry it was, where it was one; `salt` the part's salt, where the part is a run. */
export function blockedText(data: HotcoldData, salt: SaltId | null, blocked: Blocked, field?: Field): string {
  switch (blocked) {
    case 'lab-completed':
      return 'The lab is complete. Restart the lab to work the parts again.'
    case 'unknown-part':
      return 'There is no such part.'
    case 'already-done':
      return 'That is already done.'
    case 'logger-not-started':
      return 'Start the logger first.'
    case 'salt-not-added':
      return `The notebook opens once the salt is in and the curve has turned back. ${salt === null ? 'Add the salt' : addLabel(data, salt)} first.`
    case 'logger-full':
      return 'The logger has taken all the readings it can hold. Fill in the notebook from the graph as it is, or run this part again.'
    case 'notebook-begun':
      return 'The notebook is begun, so the cup is left as it is. To work the cup again, run this part again.'
    case 'run-over':
      return 'This run is over: its notebook has been checked. Run this part again for a new run.'
    case 'nothing-there':
      return 'There is no reading there to look at.'
    case 'not-turned':
      return 'The notebook opens once the curve has turned back. Run on until the latest reading has come back from the highest or the lowest.'
    case 'not-looked':
      return (field && NOT_LOOKED[field]) ?? 'Look at the graph first.'
    case 'entry-above-missing':
      return 'Make the entries above this one first: each follows from the ones before it.'
    case 'invalid-entry':
      return field && isChoice(field) ? formatHelp(field) : `That is not written as this entry is. ${field ? formatHelp(field) : ''}`.trim()
    case 'notebook-not-full':
      return 'Make every entry of the notebook first.'
    case 'nothing-to-repeat':
      return 'This run has not been begun: there is nothing to run again.'
    case 'not-the-logger':
      return NOT_FOLLOWING[field === 'extreme' ? 'extreme' : 'start']
    case 'does-not-follow':
      return field ? NOT_FOLLOWING[field] : 'That does not follow from the entries above it.'
    case 'wrong-sign':
      return WRONG_SIGN
    case 'runs-not-done':
      return 'Part 3 opens once a run of each salt counts: its two questions are answered from what your two cups showed.'
    case 'not-a-question':
    case 'not-a-salt':
      return 'Choose one of the two salts.'
    case 'not-right':
      return 'Not that one. Look at what your two notebooks say the water did.'
    case 'packs-checked':
      return 'The two answers have been checked.'
    case 'packs-not-answered':
      return 'Answer both questions first.'
    case 'nothing-to-answer-again':
      return 'There is nothing to answer again.'
  }
}

/** Guided's warning before the salt is added with the lid off or the stirrer still (spec 26.2). */
export const WARNING_TEXT: Record<Warning, { title: string; body: string }> = {
  'lid-off': {
    title: 'The lid is off',
    body: 'A cup with no lid trades heat with the room through its open top, so the highest or the lowest temperature will be further from the true one. A run started this way does not count. Put the lid on first.',
  },
  'not-stirring': {
    title: 'The stirrer is still',
    body: 'Without stirring the salt dissolves slowly, and the cup trades heat with the room all the while. A run started this way does not count. Start the stirrer first.',
  },
}
/** The two buttons of the warning: one way back and one way on. */
export const WARNING_BUTTONS = { back: 'Go back', on: 'Add the salt anyway' } as const

const REASON_TEXT: Record<Reason, string> = {
  'lid-off': 'The lid was not on from the moment the salt went in, so the cup traded heat with the room through its open top while the temperature was still changing.',
  'not-stirred': 'The cup was not stirred from the moment the salt went in, so the salt dissolved slowly, and the cup traded heat with the room all the while.',
  'start-not-shown': 'The starting temperature entered is not the one the logger shows before the salt.',
  'extreme-not-shown': 'The highest or lowest temperature entered is not the one the logger shows.',
  'entries-do-not-follow': 'An entry of the notebook does not follow from the ones above it.',
}

/** One reason a run does not count, as a sentence: as the record gives it, where no notebook stands beside it. */
export const reasonText = (reason: Reason) => REASON_TEXT[reason]

/**
 * The sentence for a run once its notebook is checked: that it counts, or that it does not and why (spec 26.2).
 * Empty for a run that is still open. `again` is whether the part can be run again: it cannot once the lab is
 * complete, and the sentence then does not say to.
 */
export function outcomeText(outcome: RunOutcome, again = true): string {
  if (outcome.state === 'open') return ''
  if (outcome.state === 'counts') return "This run counts: its temperatures are the logger's, every entry follows, and the lid was on and the cup stirred from the moment the salt went in."
  const reasons = outcome.reasons.map((reason) => `${reasonText(reason)}${reason === 'entries-do-not-follow' ? ' The notebook marks which.' : ''}`)
  return `This run does not count. ${reasons.join(' ')}${again ? ' Run this part again: the lab sets it up with new numbers.' : ''}`
}

/** What is shown under a part once it is done: the record's notes for it. */
export const partNotes = (data: HotcoldData, part: PartId): string[] => data.parts[PART_IDS.indexOf(part)]!.notes.map((note) => note.value)

/** Part 3: its two questions, the salts they are answered from, and what is said of them. */
export const QUESTION_TEXT: Record<Question, string> = {
  warms: 'For a pack that warms, the salt to use is',
  cools: 'For a pack that cools, the salt to use is',
}
export const saltChoices = (data: HotcoldData) => data.reagents.map((salt) => ({ value: salt.id, label: lower(salt.name) }))
export const PACKS_TEXT = {
  questions: 'The two questions',
  /** Over the questions: what they are answered from. */
  from: 'Answer from what your two cups showed. Your two notebooks are in the Record tab.',
  check: 'Check the answers',
  right: 'Right',
  notRight: 'Not right',
  /** Guided's closed hint under a question, and its name. */
  hintSummary: 'A hint for this question',
  hint: 'A pack that warms needs a change that gives heat out, and a pack that cools one that takes heat in. Your two notebooks say which salt did which.',
  /** Under two answers that are given and not yet checked. */
  changeNote: 'Either answer can be changed until the two are checked.',
  notRightHelp: 'Not right. Look at what your two notebooks say the water did.',
  done: 'Part done: both answers are right.',
  /** Once the answers are checked and not both right. */
  missed: 'The answers are not both right.',
  again: 'Answer again',
  againHelp: 'Empties both answers, to give them afresh.',
} as const

/** What each mode does in this lab (spec 26.2), beside its radio button. */
export const MODE_TEXT: Record<Mode, string> = {
  guided: 'Guided: the lab warns you before the salt goes in with the lid off or the stirrer still, checks each entry of the notebook as you make it, and has a hint for each entry ready to open.',
  challenge: 'Challenge: no warning and no hints. The notebook takes whatever you enter and is checked all together when you ask. A run that does not count is run again, with new numbers.',
}

/** How far a part has come, in the list of parts and on its page, beside a mark that says the same. The last three are part 3's. */
export type Progress = 'not-started' | 'cup' | 'notebook' | 'not-counted' | 'done' | 'waiting' | 'answers' | 'not-right'
export function progressOf(view: Pick<RunView, 'cup' | 'outcome' | 'done'>): Progress {
  if (view.done) return 'done'
  if (view.outcome.state === 'does-not-count') return 'not-counted'
  if (view.cup.notebookBegun) return 'notebook'
  return view.cup.loggerStarted || view.cup.lidOn || view.cup.stirring ? 'cup' : 'not-started'
}
export function packsProgressOf(view: PacksView): Progress {
  if (view.done) return 'done'
  if (!view.open) return 'waiting'
  if (view.checked) return 'not-right'
  return view.questions.some((question) => question.answer !== null) ? 'answers' : 'not-started'
}
export const PROGRESS_TEXT: Record<Progress, string> = {
  'not-started': 'Not started',
  cup: 'Cup under way',
  notebook: 'Notebook under way',
  'not-counted': 'Run did not count',
  done: 'Done',
  waiting: 'Opens after parts 1 and 2',
  answers: 'Answers under way',
  'not-right': 'Not right yet',
}

/**
 * What the page itself says and no part of the lab's chemistry: the names of its list, its pictures and their
 * marks, and its buttons. None of it says anything of a run.
 */
export const PAGE_TEXT = {
  list: 'Parts',
  previous: (title: string) => `Previous: ${title}`,
  next: (title: string) => `Next: ${title}`,
  /** Over the list: the two salts can be run in either order. */
  order: 'Parts 1 and 2 can be done in either order.',
  graphPicture: "The logger's graph: temperature up the side against time along the bottom",
  /** The two axes of the graph, beside them. */
  temperatureAxis: 'Temperature, in °C',
  timeAxis: 'Time since the first reading, in minutes',
  /** The key under the graph: what a filled point, an open one and the dashed line are. */
  lookedAt: 'looked at',
  notLookedAt: 'not looked at yet',
  changeMark: 'the salt was added here',
  /** After the sentence that says how the graph is looked at: the keys that move along it. */
  arrows: 'With the keyboard, the left and right arrow keys move from one reading to the next.',
  /** The two buttons under the graph, a finger's size each: one reading back, and one on. */
  earlier: 'Earlier reading',
  later: 'Later reading',
  /** The closed disclosure that holds the graph described in words. */
  inWords: 'The graph in words',
  /** The button of an entry of the notebook, and the two of a change under way. */
  enter: 'Enter',
  change: 'Change',
  cancel: 'Cancel',
  /** Under the notebook while an entry that has others under it can be changed. */
  changeNote: 'Changing an entry empties the entries under it.',
  /** The card that says how the run came out. */
  outcome: 'This run',
} as const

/** The Record tab. */
export const RECORD_TEXT = {
  region: 'Record of the three parts',
  caption: 'Every run of each salt, with what was entered and whether it counted, and the answers of part 3',
  part: 'Part',
  run: (number: number) => `Run ${number}`,
  result: 'Result',
  open: 'Not checked yet',
  counts: 'Counts',
  doesNotCount: 'Does not count',
  notAnswered: 'Not answered',
} as const

/** Under a part's sources: what is Valence's own. */
export const SOURCES_TEXT = "The readings the logger draws, whether an entry follows and whether a run counts are worked out by Valence from these values and from the model's parameters, which are Valence's own. The hints and the feedback are written by Valence."
