import { z } from 'zod'
import { cited, hazardsSchema, param } from '../schema'
import data from './reactions.json'

// The types of reactions lab's record (spec 24): the nine things on the benches, each with its hazards; the
// species an equation is built from; the four kinds of reaction with their patterns in letters; the choices an
// observation is recorded from; the order of the three metals; the five stations, each with its vessels, its
// tiles and the notes shown when it is done; and the model's parameters. It is its own file and is not part of
// the registry, so only the lab loads it. Like the other labs' schemas, this one keeps to the zod features
// schema.ts already uses.

export const STATION_IDS = ['zinc-copper-sulfate', 'magnesium-flame', 'metals-in-acid', 'two-solutions', 'peroxide'] as const
export type StationId = (typeof STATION_IDS)[number]

/** The four kinds of reaction of spec 24.1. A vessel in which nothing reacts has the kind 'none'. */
export const KIND_IDS = ['combination', 'decomposition', 'single-replacement', 'double-replacement'] as const
export type KindId = (typeof KIND_IDS)[number]
/** What a learner may say a vessel's reaction is: one of the four kinds, or that nothing reacted. */
export const KIND_ANSWERS = [...KIND_IDS, 'none'] as const
export type KindAnswer = (typeof KIND_ANSWERS)[number]

/**
 * What an observation can record. `coating`: what is on a piece of metal. `liquid`: the colour of the liquid.
 * `solid`: a loose solid, in the liquid or left where a strip burned. `bubbles`: how fast a piece of metal
 * bubbles. `gas`: whether bubbles rise in the liquid. `light`: what a flame gives. `warmth`: how the tube feels.
 */
export const FIELDS = ['coating', 'liquid', 'solid', 'bubbles', 'gas', 'light', 'warmth'] as const
export type Field = (typeof FIELDS)[number]

/** The parts of a vessel that are looked at; `touch` is the tube felt with the hand. */
export const LOOKS = ['metal', 'liquid', 'solid', 'flame', 'touch'] as const
export type Look = (typeof LOOKS)[number]

/** The look that shows each field (scripts/reactions-lib.mjs holds the same table, and a test holds the two to each other). */
export const FIELD_AT: Record<Field, Look> = { coating: 'metal', bubbles: 'metal', liquid: 'liquid', gas: 'liquid', solid: 'solid', light: 'flame', warmth: 'touch' }

/** The three metals of the station that puts them in order. */
export const METAL_IDS = ['magnesium', 'zinc', 'copper'] as const
export type MetalId = (typeof METAL_IDS)[number]

const id = z.string().min(1)
const text = z.string().min(1)
const state = z.enum(['aq', 's', 'l', 'g'])

// The record sourceId covers the name and the formula. The hazards are merged in by the build from this lab's hazards.json, or from the aqueous reactions lab's for the two bottles shared with it.
const reagentSchema = z.strictObject({
  id,
  name: text,
  formula: text,
  form: z.enum(['metal', 'solution']),
  classifiedAs: text,
  hazards: hazardsSchema,
  sourceId: id,
})

// The record sourceId covers the formula, the composition and the state. Every species here is neutral.
const speciesSchema = z.strictObject({
  id,
  formula: text,
  name: text,
  /** How many atoms of each element one formula unit holds: what an equation is balanced by. */
  composition: z.record(z.string(), z.number().int().positive()),
  state,
  /** Every state a learner's equation may give this species, where that is more than the one above. */
  acceptedStates: z.array(state).min(2).optional(),
  sourceId: id,
})

const kindSchema = z.strictObject({ id: z.enum(KIND_IDS), name: text, pattern: text, sourceId: id })

/** What is seen, in one of a field's choices, with its source or two. */
const seen = cited(text).extend({ alsoSourceId: id.optional() })

const term = z.strictObject({ speciesId: id, coefficient: z.number().int().positive() })
const side = z.array(term).min(1)

const vesselSchema = z.strictObject({
  id,
  /** A test tube, or a strip of metal held in a flame. */
  drawn: z.enum(['tube', 'flame']),
  /** The liquid a tube starts with: its colour, how much there is (a parameter) and how much the action adds (a parameter, or null). Null for the strip. */
  liquid: seen.extend({ start: id, added: id.nullable() }).nullable(),
  /** The piece of metal that goes in, or burns: which metal, the reagent it is, and its colour. Null where there is none. */
  metal: z.strictObject({ id: z.enum(METAL_IDS), reagentId: id, colour: cited(text) }).nullable(),
  /** The fields the observation of this vessel records. */
  asks: z.array(z.enum(FIELDS)).min(1),
  /** What is seen once the action is done, field by field: every field asked, and the liquid's colour where it changes. */
  after: z.strictObject({ coating: seen.optional(), liquid: seen.optional(), solid: seen.optional(), bubbles: seen.optional(), gas: seen.optional(), light: seen.optional(), warmth: seen.optional() }),
  /** The parts that are looked at, with the words for what is there before the action and after it. */
  looks: z.array(z.strictObject({ at: z.enum(LOOKS), before: text, after: text })).min(1),
  /** The kind of reaction, or 'none' where nothing reacts. */
  kind: seen.extend({ value: z.enum(KIND_ANSWERS) }),
  /** The balanced molecular equation; null where nothing reacts. The state of each species is the species' own. */
  equation: z.strictObject({ reactants: side, products: side, sourceId: id, alsoSourceId: id.optional() }).nullable(),
  /** A species that speeds the reaction and is not used up: it is in no equation, and is shown over the arrow once the station is done. */
  catalyst: z.strictObject({ speciesId: id, sourceId: id }).optional(),
})

const stationSchema = z.strictObject({
  id: z.enum(STATION_IDS),
  letter: z.string().length(1),
  /** What the station is called: what is used, and never the kind of reaction. */
  title: text,
  /** The one thing done at the station. */
  action: z.enum(['put-in', 'burn', 'mix', 'add-drops']),
  reagentIds: z.array(id).min(1),
  /** The species the station's equations are built from: those the equations need, and others. */
  tiles: z.array(id).min(3),
  vessels: z.array(vesselSchema).min(1),
  /** True for the station that asks for the order of its metals. */
  order: z.boolean(),
  /** Shown when the station is done: what was seen, what it is and why. */
  notes: z.array(seen).min(1),
})

export const reactionsSchema = z.strictObject({
  reagents: z.array(reagentSchema).min(1),
  species: z.array(speciesSchema).min(1),
  kinds: z.array(kindSchema).length(KIND_IDS.length),
  /** What each field is recorded from. The first choice of every field but the liquid is that nothing is there, or nothing changed. */
  choices: z.strictObject({ coating: z.array(text).min(2), liquid: z.array(text).min(2), solid: z.array(text).min(2), bubbles: z.array(text).min(2), gas: z.array(text).min(2), light: z.array(text).min(2), warmth: z.array(text).min(2) }),
  /** The three metals, most active first; the metal hydrogen stands after; and what the order is taken from. */
  activity: z.strictObject({ order: z.array(z.enum(METAL_IDS)).length(METAL_IDS.length), hydrogenAfter: z.enum(METAL_IDS), basis: z.enum(['activity-series', 'standard-potentials']), sourceId: id }),
  stations: z.array(stationSchema).length(STATION_IDS.length),
  parameters: z.strictObject({ tubeMicrolitres: param(z.number().int().positive()), mixMicrolitres: param(z.number().int().positive()), dropsMicrolitres: param(z.number().int().positive()) }),
})

export type ReactionsData = z.infer<typeof reactionsSchema>
export type Reagent = ReactionsData['reagents'][number]
export type Species = ReactionsData['species'][number]
export type Station = ReactionsData['stations'][number]
export type Vessel = Station['vessels'][number]

/** The stored record, parsed once: a record the schema refuses is a build that fails here. */
export const reactionsData: ReactionsData = reactionsSchema.parse(data)

/** A station of the record by its id. */
export function stationOf(record: ReactionsData, stationId: StationId): Station {
  const station = record.stations.find((s) => s.id === stationId)
  if (!station) throw new Error(`no station "${stationId}"`)
  return station
}
