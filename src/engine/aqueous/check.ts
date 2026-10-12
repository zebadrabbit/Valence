import type { AqueousData } from '@/chem-data/aqueous/data'
import type { Station } from '@/chem-data/schema'
import { sideFault, type Entry, type State, type Term } from '../equation'

// What a learner records and enters, and whether it is right (spec 8.3). An observation is recorded from fixed
// choices, in the fields the station's tools can show and no others. An equation is built from the station's
// palette of species and is held to the curated one; nothing is parsed from typed text.

export const FIELDS = ['solid', 'liquid', 'bubbles', 'odor', 'litmusInLiquid', 'litmusInVapour', 'temperature', 'splint'] as const
export type Field = (typeof FIELDS)[number]
/** What was recorded: one of the field's choices for each field the station shows. */
export type Observation = Partial<Record<Field, string>>

export type Tool = Station['observationTools'][number]
/**
 * The eye as it is applied: by looking at one part of what is in the tube, as the parts lie in it. The bottom,
 * where a solid settles; the liquid; and the liquid's surface, where bubbles rise and break.
 */
export const LOOKS = ['look-bottom', 'look-liquid', 'look-surface'] as const
export type Look = (typeof LOOKS)[number]
/** A tool as it is applied. The eye has its three parts of the tube; litmus has two positions (spec 8.2). */
export const TOOL_USES = [...LOOKS, 'waft', 'litmus-liquid', 'litmus-vapour', 'touch', 'thermometer', 'splint'] as const
export type ToolUse = (typeof TOOL_USES)[number]
export const isLook = (use: string): use is Look => (LOOKS as readonly string[]).includes(use)

const USES: Record<Tool, readonly ToolUse[]> = { eye: LOOKS, waft: ['waft'], litmus: ['litmus-liquid', 'litmus-vapour'], touch: ['touch'], thermometer: ['thermometer'], splint: ['splint'] }
/** The uses that show each field: any one of them, where there are two. */
const SHOWS: Record<Field, readonly ToolUse[]> = {
  solid: ['look-bottom'],
  liquid: ['look-liquid'],
  bubbles: ['look-surface'],
  odor: ['waft'],
  litmusInLiquid: ['litmus-liquid'],
  litmusInVapour: ['litmus-vapour'],
  temperature: ['touch', 'thermometer'],
  splint: ['splint'],
}

/** The ways the station's tools can be applied, in the order of TOOL_USES. */
export const usesOf = (station: Station): ToolUse[] => TOOL_USES.filter((use) => station.observationTools.some((tool) => USES[tool].includes(use)))

/** The uses, among the station's, any one of which shows a field. */
export const usesShowing = (station: Station, field: Field): ToolUse[] => usesOf(station).filter((use) => SHOWS[field].includes(use))

/** The fields the station's tools can show, which are the ones asked and graded. */
export const fieldsOf = (station: Station): Field[] => FIELDS.filter((field) => usesShowing(station, field).length > 0)

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
// An equation as entered is the shape every lab's builder makes (../equation.ts).
export type { Entry, State, Term }

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
  // Each side holds each of its curated species once and nothing else.
  if (sideFault(entry.reactants, curated.reactants) !== null || sideFault(entry.products, curated.products) !== null) return 'species'
  if (terms.some((term) => !(species(term.speciesId)?.acceptedStates ?? [species(term.speciesId)?.state]).includes(term.state))) return 'state'
  // In proportion: every entered coefficient over its curated one is the same ratio, tested by cross-multiplying.
  const pairs = [
    ...curated.reactants.map((term) => [entry.reactants.find((other) => other.speciesId === term.speciesId)!.coefficient, term.coefficient] as const),
    ...curated.products.map((term) => [entry.products.find((other) => other.speciesId === term.speciesId)!.coefficient, term.coefficient] as const),
  ]
  const [entered0, curated0] = pairs[0]!
  return pairs.every(([entered, wanted]) => entered * curated0 === entered0 * wanted) ? null : 'coefficients'
}
