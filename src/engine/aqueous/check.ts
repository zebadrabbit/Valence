import type { AqueousData } from '@/chem-data/aqueous/data'
import type { Station } from '@/chem-data/schema'

// What a learner records and enters, and whether it is right (spec 8.3). An observation is recorded from fixed
// choices, in the fields the station's tools can show and no others. An equation is built from the station's
// palette of species and is held to the curated one; nothing is parsed from typed text.

export const FIELDS = ['solid', 'liquid', 'bubbles', 'odor', 'litmusInLiquid', 'litmusInVapour', 'temperature', 'splint'] as const
export type Field = (typeof FIELDS)[number]
/** What was recorded: one of the field's choices for each field the station shows. */
export type Observation = Partial<Record<Field, string>>

export type Tool = Station['observationTools'][number]
/** A tool as it is applied. The eye needs no applying; litmus has two positions (spec 8.2). */
export const TOOL_USES = ['waft', 'litmus-liquid', 'litmus-vapour', 'touch', 'thermometer', 'splint'] as const
export type ToolUse = (typeof TOOL_USES)[number]

const USES: Record<Tool, readonly ToolUse[]> = { eye: [], waft: ['waft'], litmus: ['litmus-liquid', 'litmus-vapour'], touch: ['touch'], thermometer: ['thermometer'], splint: ['splint'] }
/** The fields each tool shows; a tool that is applied shows them by the uses listed. */
const SHOWS: Record<Field, readonly ToolUse[] | 'eye'> = {
  solid: 'eye',
  liquid: 'eye',
  bubbles: 'eye',
  odor: ['waft'],
  litmusInLiquid: ['litmus-liquid'],
  litmusInVapour: ['litmus-vapour'],
  temperature: ['touch', 'thermometer'],
  splint: ['splint'],
}

/** The ways the station's tools can be applied, in the order of TOOL_USES. */
export const usesOf = (station: Station): ToolUse[] => TOOL_USES.filter((use) => station.observationTools.some((tool) => USES[tool].includes(use)))

/** The uses, among the station's, any one of which shows a field; none for a field the eye shows. */
export const usesShowing = (station: Station, field: Field): ToolUse[] => {
  const shows = SHOWS[field]
  return shows === 'eye' ? [] : usesOf(station).filter((use) => shows.includes(use))
}

/** The fields the station's tools can show, which are the ones asked and graded. */
export const fieldsOf = (station: Station): Field[] =>
  FIELDS.filter((field) => (SHOWS[field] === 'eye' ? station.observationTools.includes('eye') : usesShowing(station, field).length > 0))

/** What a field is recorded from. */
export function choicesFor(data: AqueousData, field: Field): readonly string[] {
  switch (field) {
    case 'solid':
      return data.choices.solid
    case 'liquid':
      return data.choices.liquid
    case 'odor':
      return data.choices.odor
    case 'bubbles':
      return ['none', 'bubbles']
    case 'litmusInLiquid':
    case 'litmusInVapour':
      return ['stays red', 'turns blue']
    case 'temperature':
      return ['none', 'warm', 'hot']
    case 'splint':
      return ['no change', 'pop']
  }
}

/** The station's expected record as an observation of its own fields: what a correct observation holds. */
export function expectedObservation(station: Station): Observation {
  const { expected } = station
  const all: Record<Field, string | undefined> = {
    solid: expected.precipitateColor ?? 'none',
    liquid: expected.liquidColor,
    bubbles: expected.bubbles ? 'bubbles' : 'none',
    odor: expected.odor ?? 'none',
    litmusInLiquid: expected.toolResults.litmusInLiquid,
    litmusInVapour: expected.toolResults.litmusInVapour,
    temperature: expected.temperature,
    splint: expected.toolResults.splint,
  }
  return Object.fromEntries(fieldsOf(station).map((field) => [field, all[field]]))
}

/** The shown fields whose recorded value is not the expected one; an observation is correct when there are none. */
export function wrongFields(station: Station, observation: Observation): Field[] {
  const expected = expectedObservation(station)
  return fieldsOf(station).filter((field) => observation[field] !== expected[field])
}

export const FORMS = ['molecular', 'completeIonic', 'netIonic'] as const
export type Form = (typeof FORMS)[number]
export type State = 'aq' | 's' | 'l' | 'g'
export interface Term {
  speciesId: string
  coefficient: number
  state: State
}
/** An equation as entered: "No reaction", or the species on each side. */
export interface Entry {
  noReaction: boolean
  reactants: Term[]
  products: Term[]
}

/**
 * What kind of thing is wrong with an entered equation, the first that applies. The first two are about whether
 * there is a reaction to write at all; the next three about which form was asked for; the last three are the
 * check of spec 8.3 itself: the species on each side, each state, and the coefficients.
 */
export type Problem =
  | 'no-reaction-expected'
  | 'reaction-expected'
  | 'ions-in-molecular'
  | 'not-split'
  | 'spectator'
  | 'species'
  | 'state'
  | 'coefficients'

/**
 * null when the entry is correct (spec 8.3): the species on each side are the curated equation's, each state is
 * one the species accepts, and the coefficients are in the curated proportion, so doubled ones pass.
 */
export function checkEquation(data: AqueousData, station: Station, form: Form, entry: Entry): Problem | null {
  const curated = station.equations[form]
  if (curated === null) return entry.noReaction ? null : 'no-reaction-expected'
  if (entry.noReaction) return 'reaction-expected'
  const species = (id: string) => data.species.find((s) => s.id === id)
  const terms = [...entry.reactants, ...entry.products]
  if (form === 'molecular' && terms.some((term) => (species(term.speciesId)?.charge ?? 0) !== 0)) return 'ions-in-molecular'
  if (form !== 'molecular' && terms.some((term) => species(term.speciesId)?.ions !== undefined)) return 'not-split'
  if (form === 'netIonic' && entry.reactants.some((term) => entry.products.some((other) => other.speciesId === term.speciesId))) return 'spectator'
  const sameSpecies = (entered: Term[], wanted: { speciesId: string }[]) =>
    entered.length === wanted.length && wanted.every((term) => entered.filter((other) => other.speciesId === term.speciesId).length === 1)
  if (!sameSpecies(entry.reactants, curated.reactants) || !sameSpecies(entry.products, curated.products)) return 'species'
  if (terms.some((term) => !(species(term.speciesId)?.acceptedStates ?? [species(term.speciesId)?.state]).includes(term.state))) return 'state'
  // In proportion: every entered coefficient over its curated one is the same ratio, tested by cross-multiplying.
  const pairs = [
    ...curated.reactants.map((term) => [entry.reactants.find((other) => other.speciesId === term.speciesId)!.coefficient, term.coefficient] as const),
    ...curated.products.map((term) => [entry.products.find((other) => other.speciesId === term.speciesId)!.coefficient, term.coefficient] as const),
  ]
  const [entered0, curated0] = pairs[0]!
  return pairs.every(([entered, wanted]) => entered * curated0 === entered0 * wanted) ? null : 'coefficients'
}
