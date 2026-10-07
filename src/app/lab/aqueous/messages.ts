import type { AqueousData } from '@/chem-data/aqueous/data'
import { choicesFor, describeStationResult, expectedObservation, stationResult, type Action, type Blocked, type Entry, type Field, type Form, type Mode, type Observation, type Problem, type State, type ToolUse } from '@/engine/aqueous'
import type { Side } from './builder'
import type { Progress } from './stationLook'

// Every sentence the aqueous reactions lab says that is chemistry, keyed by the engine's identifiers, so that an
// identifier with no sentence does not compile. A sentence can say only what it is handed: the lab's record and
// what the engine works out from it. The hints, the notes and the two cautions are in the record itself, with
// their sources (src/chem-data/aqueous/aqueous.json); this module words everything else, and from PAGE_TEXT down
// what the page says that is not chemistry: its headings, its buttons and the names of its controls.

const stationOf = (data: AqueousData, stationId: string) => {
  const index = data.stations.findIndex((s) => s.id === stationId)
  if (index < 0) throw new Error(`no station "${stationId}"`)
  return { station: data.stations[index]!, number: index + 1 }
}

/** "Station 1: Iron(III) chloride and sodium hydroxide". */
export function stationTitle(data: AqueousData, stationId: string): string {
  const { station, number } = stationOf(data, stationId)
  return `Station ${number}: ${station.name}`
}

/** An amount as the bench gives it: a volume to 0.1 mL, a mass to two figures. */
export const amountText = ({ value, unit }: { value: number; unit: 'mL' | 'g' }) => `${unit === 'mL' ? value.toFixed(1) : value.toPrecision(2)} ${unit}`

/** What goes into the tube, one line for each reagent: "2.0 mL of iron(III) chloride solution, 0.5 M". */
export function reagentLines(data: AqueousData, stationId: string): string[] {
  const { station } = stationOf(data, stationId)
  return station.reagentIds.map((id, i) => {
    const { name } = data.reagents.find((r) => r.id === id)!
    return `${amountText(station.amounts[i]!)} of ${name[0]!.toLowerCase()}${name.slice(1)}`
  })
}

export const BENCH_TEXT = {
  mix: 'Mix the two in the tube',
  mixed: 'Mixed',
  notMixed: 'The two reagents are side by side, not yet mixed.',
  hints: 'Hints',
  expected: 'What to expect',
  notes: 'Notes on this station',
  record: 'Record',
  check: 'Check',
  noReaction: 'No reaction',
  reactants: 'Reactants',
  products: 'Products',
  done: 'Station done: the observation and all three equations are correct.',
} as const

/** What a field of the observation asks. */
export const FIELD_LABEL: Record<Field, string> = {
  solid: 'Solid in the tube after mixing',
  liquid: 'Colour of the liquid',
  bubbles: 'Bubbles of gas',
  odor: 'Smell, wafted',
  litmusInLiquid: 'Red litmus dipped in the liquid',
  litmusInVapour: 'Moist red litmus held above the liquid',
  temperature: 'Temperature of the tube',
  splint: 'Lit splint at the mouth of the tube',
}

// A choice is stored as the record's word for it. Where that word alone would read oddly as an answer, it is spelt out.
const CHOICE_TEXT: Partial<Record<Field, Record<string, string>>> = {
  solid: { none: 'no solid' },
  bubbles: { none: 'no bubbles', bubbles: 'bubbles rise' },
  odor: { none: 'no smell' },
  temperature: { none: 'no warmer than before', warm: 'warm', hot: 'hot' },
  splint: { 'no change': 'burns on as before', pop: 'a pop' },
}
/** A choice as the form shows it. */
export const choiceLabel = (field: Field, choice: string): string => CHOICE_TEXT[field]?.[choice] ?? choice

/** The choices of a field, each with the label the form shows: the stored value is the record's word. */
export const choiceList = (data: AqueousData, field: Field) => choicesFor(data, field).map((value) => ({ value, label: choiceLabel(field, value) }))

/** An observation in words, one line for each field it holds: "Colour of the liquid: pink." */
export const observationLines = (observation: Observation): string[] =>
  (Object.keys(FIELD_LABEL) as Field[]).filter((field) => observation[field] !== undefined).map((field) => `${FIELD_LABEL[field]}: ${choiceLabel(field, observation[field]!)}.`)

/** What a correct observation holds, in words, for Guided mode and for Challenge once the learner has recorded their own. */
export const expectedLines = (data: AqueousData, stationId: string): string[] => observationLines(expectedObservation(stationOf(data, stationId).station))

/** The name of each way of applying a tool, as its button reads. 'sniff' is offered so that it can be refused with the safety note. */
export const TOOL_LABEL: Record<ToolUse | 'sniff', string> = {
  waft: 'Waft the vapour towards your nose',
  sniff: 'Smell the tube directly',
  'litmus-liquid': 'Dip red litmus paper in the liquid',
  'litmus-vapour': 'Hold moist red litmus paper above the liquid',
  touch: 'Touch the outside of the tube',
  thermometer: 'Read the thermometer',
  splint: 'Hold a lit splint at the mouth of the tube',
}

/** What the eye sees in the mixed tube: the engine's own description. */
export const seenText = (data: AqueousData, stationId: string) => describeStationResult(data, stationId)

/**
 * What a tool shows at a station once it is applied. The smell, the litmus and the splint are the station's
 * curated results; the warmth is the engine's, and a hot tube carries the record's caution with it (spec 8.2).
 */
export function toolOutcome(data: AqueousData, stationId: string, tool: ToolUse): string {
  const { expected } = stationOf(data, stationId).station
  const result = stationResult(data, stationId)
  switch (tool) {
    case 'waft':
      return expected.odor === null ? 'Wafted towards your nose, the vapour has no smell.' : `Wafted towards your nose, the vapour has a ${expected.odor} smell.`
    case 'litmus-liquid':
      return `Red litmus paper dipped in the liquid ${expected.toolResults.litmusInLiquid ?? 'stays red'}.`
    case 'litmus-vapour':
      return `Moist red litmus paper held above the liquid, touching neither the liquid nor the glass, ${expected.toolResults.litmusInVapour ?? 'stays red'}.`
    case 'touch':
      return { none: 'The tube feels no warmer than before.', warm: 'The tube feels warm.', hot: `The tube feels hot. ${data.cautions.hotTube.value}` }[result.temperature]
    case 'thermometer': {
      const rise = Math.round(result.temperatureRiseC)
      return rise === 0 ? 'The thermometer does not move.' : `The thermometer rises by about ${rise} °C. That figure is idealised: it is worked out as if no heat escaped from the tube and the liquid were plain water, so a real tube warms somewhat less.`
    }
    case 'splint':
      return expected.toolResults.splint === 'pop' ? 'A lit splint held at the mouth of the tube gives a sharp pop.' : 'A lit splint held at the mouth of the tube burns on as before.'
  }
}

// How a field is spoken of in feedback.
const FIELD_NAME: Record<Field, string> = {
  solid: 'the solid',
  liquid: 'the colour of the liquid',
  bubbles: 'whether a gas comes off',
  odor: 'the smell',
  litmusInLiquid: 'the litmus in the liquid',
  litmusInVapour: 'the litmus above the liquid',
  temperature: 'the temperature',
  splint: 'the lit splint',
}
const listed = (items: string[]) => (items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`)

/** Feedback on a recorded observation: which fields to look at again, never what they should be. */
export const observationFeedback = (wrong: readonly Field[]): string =>
  wrong.length === 0 ? 'That is what this tube shows.' : `Not yet. Look again at ${listed(wrong.map((field) => FIELD_NAME[field]))}.`

export const FORM_LABEL: Record<Form, string> = { molecular: 'Molecular equation', completeIonic: 'Complete ionic equation', netIonic: 'Net ionic equation' }

/** Feedback on an entered equation: the kind of thing that is wrong, never the answer. */
export const PROBLEM_TEXT: Record<Problem, string> = {
  'no-reaction-expected': 'Check each product you have written. Is it really insoluble, a gas, or water made from an acid and a base? If nothing in the tube can make such a product, there is no equation to write.',
  'reaction-expected': 'Something does react in this tube. A solid, bubbles, a smell or heat is the sign of a reaction, and that reaction has an equation.',
  'ions-in-molecular': 'A molecular equation has no ions in it. Every substance is written as one whole formula with no charge.',
  'not-split': 'In an ionic equation a dissolved ionic compound is not written whole, and neither is hydrochloric acid: each is written as its separate ions.',
  spectator: 'A net ionic equation leaves the spectators out. An ion that stands unchanged on both sides does not belong in it.',
  species: 'The substances are not right yet. Something is missing, something is there that should not be, or something is on the wrong side. Check each side against what went into the tube and what you observed.',
  state: 'The substances are right, but a state symbol is not. Ask of each one whether it is dissolved, a solid, a liquid or a gas.',
  coefficients: 'The substances and their states are right, but the equation does not balance. Count each kind of atom on both sides and, in an ionic equation, the charge.',
}
/** The feedback for an equation as the engine judged it. */
export const equationFeedback = (problem: Problem | null): string => (problem === null ? 'Correct.' : PROBLEM_TEXT[problem])

/** An entered equation in one line: "Fe³⁺(aq) + 3OH⁻(aq) → Fe(OH)₃(s)", or "No reaction". */
export function equationText(data: AqueousData, entry: Entry): string {
  if (entry.noReaction) return BENCH_TEXT.noReaction
  const side = (terms: Entry['reactants']) =>
    terms.map((term) => `${term.coefficient === 1 ? '' : term.coefficient}${data.species.find((s) => s.id === term.speciesId)?.formula ?? term.speciesId}(${term.state})`).join(' + ')
  return `${side(entry.reactants)} → ${side(entry.products)}`
}

/** Why an action cannot be done now. Smelling a tube directly is answered with the record's safety note. */
export function blockedText(data: AqueousData, action: Action, blocked: Blocked): string {
  switch (blocked) {
    case 'lab-completed':
      return 'The lab is complete. Restart the lab to work the stations again.'
    case 'unknown-station':
      return 'There is no such station.'
    case 'already-mixed':
      return 'This tube is already mixed.'
    case 'not-mixed':
      return 'Mix the two reagents in the tube first.'
    case 'no-such-tool':
      return 'That tool is not used at this station.'
    case 'sniffing':
      return data.cautions.sniffing.value
    case 'tool-not-used':
      return 'Use each tool before you record what it shows.'
    case 'invalid-entry':
      return action.type === 'enterEquation'
        ? `An equation needs at least one substance on each side, none of them twice on one side, and a coefficient from 1 to 99 for each. Or choose "${BENCH_TEXT.noReaction}".`
        : 'Choose one answer for each question.'
  }
}

/** What each mode does in this lab (spec 8.3), beside its radio button: the shell's own two sentences are the titration lab's. */
export const MODE_TEXT: Record<Mode, string> = {
  guided: 'Guided: each station shows its hints, and what a correct observation holds, from the start.',
  challenge: 'Challenge: a station shows no hints, and nothing of what to expect, until you have recorded your own observation there.',
}

/** The list of stations, where the one shown stands in it, and the two ways on. */
export const STATION_TEXT = {
  list: 'Stations',
  place: (number: number, total: number) => `Station ${number} of ${total}`,
  previous: (title: string) => `Previous: ${title}`,
  next: (title: string) => `Next: ${title}`,
}

/** How far a station has come, in the list and on its card, beside a mark that says the same. */
export const PROGRESS_TEXT: Record<Progress, string> = { 'not-started': 'Not started', started: 'Started', observed: 'Observed', done: 'Done' }

/** The page's own headings, buttons and names of controls. */
export const PAGE_TEXT = {
  tube: 'The tube',
  tools: 'Tools',
  observations: 'Observations',
  equations: 'Equations',
  amount: 'Amount',
  tubePicture: 'The test tube after mixing',
  /** After the name of a tool that has been applied, for a screen reader; the eye has a tick. */
  used: 'used',
  checkObservations: 'Check observations',
  /** Beside a question whose recorded answer is not the tube's, until it is answered again. */
  lookAgain: 'Look again',
  change: 'Change',
  cancel: 'Cancel',
  correct: 'Correct',
  notCorrect: 'Not correct yet',
  notEntered: 'Not entered yet',
  /** In Challenge, where the hints and the expected observation will be. */
  challengeHidden: 'In Challenge, the hints and what to expect are shown once you have recorded your own observation.',
  yourEquation: 'Your equation',
  nothingBuilt: 'Nothing chosen yet.',
  palette: 'Substances to choose from',
  paletteHelp: 'Choose a substance, then the side it goes on.',
  reactant: 'Reactant',
  product: 'Product',
  add: 'Add',
  asA: 'as a',
  /** The name of the two buttons that ask which side: "Add Fe³⁺ as a", then Reactant or Product. */
  whichSide: (formula: string) => `Add ${formula} as a`,
  coefficient: 'Coefficient',
  fewer: 'One fewer',
  more: 'One more',
  state: 'State',
  remove: (formula: string) => `Remove ${formula}`,
  /** Where the built equation has a side with nothing on it. */
  incomplete: `Put at least one substance on each side, or choose "${BENCH_TEXT.noReaction}".`,
  coefficientLimit: 'A coefficient here is a whole number from 1 to 9.',
  completed: 'Lab complete: all ten stations have a correct observation and three correct equations.',
  sources: 'What the tube shows, the temperature rise and whether an entry is correct are worked out by Valence from these values. The hints are written by Valence.',
} as const

/** A state symbol said in full, as the name of its choice. */
export const STATE_NAME: Record<State, string> = { aq: 'dissolved in water', s: 'solid', l: 'liquid', g: 'gas' }
/** The four state symbols with what each stands for, once over the three builders. */
export const STATE_KEY = `States: ${(Object.keys(STATE_NAME) as State[]).map((state) => `(${state}) ${STATE_NAME[state]}`).join(', ')}.`

/** Why a species is not added to a side again. */
export const alreadyOnSide = (formula: string, side: Side) => `${formula} is already among the ${side === 'reactants' ? 'reactants' : 'products'}.`

/** Under a question that waits for a tool: which one to use first. Any one of them shows it. */
export const toolFirstText = (uses: readonly ToolUse[]) => `Not yet. First use: ${uses.map((use) => TOOL_LABEL[use]).join(', or ')}.`

/** The solubility table, as a panel that floats over the page. */
export const SOLUBILITY_TEXT = {
  name: 'Solubility table',
  caption: 'Whether the compound of a positive ion and a negative ion dissolves in water, for the pairs of ions these ten stations can bring together.',
  corner: 'Positive ion, by negative ion',
  soluble: 'soluble',
  insoluble: 'insoluble',
  notListed: 'not listed',
  key: 'A pair marked not listed is one that no station here brings together. This table does not hold it, which says nothing of whether its compound dissolves.',
} as const

/** The Record tab. */
export const RECORD_TEXT = {
  region: 'Record of the ten stations',
  caption: 'What was recorded at each of the ten stations, as it was last checked',
  station: 'Station',
  entry: 'Entry',
  entered: 'As recorded',
  result: 'Result',
  observation: 'Observation',
  notMixed: 'Not mixed yet',
} as const
