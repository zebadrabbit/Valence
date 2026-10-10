import { z } from 'zod'
import { cited, citedNumber, hazardsSchema, param } from '../schema'
import data from './clock.json'

// The clock reaction lab's record (spec 19): the five bottles with their hazards; the gas constant and the kelvin
// of 0 °C; the two reactions and the count between them; the reaction's rate record, which is what the kinetics
// engine takes (the order in each reactant, the rate constant at a stated temperature, the activation energy, and
// what ends a run); the five mixtures, each split between two flasks; the three baths; the three parts, with the
// notes shown when each is done; and the model's parameters. It is its own file and is not part of the registry,
// so only the lab loads it. Like the other labs' schemas, this one keeps to the zod features schema.ts already uses.

const id = z.string().min(1)
const text = z.string().min(1)
const positive = z.number().positive()
const whole = z.number().int().min(0)
const range = z.tuple([whole, whole])

/** A citation that may rest on a second source and on more: `alsoSourceId`, then `moreSourceIds`. */
const also = { alsoSourceId: id.optional(), moreSourceIds: z.array(id).min(1).optional() }
const citedText = cited(text).extend(also)

// The record sourceId covers the name, the formula and the strength. The hazards are merged in by the build from
// the lab's hazards.json, which is written apart. The starch has no formula and no strength: it is what shows the
// end of a run, and the procedure read gives it as so many drops.
const bottle = { id, name: text, classifiedAs: text, hazards: hazardsSchema, sourceId: id }
/** `shown` is the strength as the bottle's label writes it, with its two figures: "0.010". */
const solutionSchema = z.strictObject({ ...bottle, formula: text, form: z.literal('solution'), molarity: positive, shown: text })
const indicatorSchema = z.strictObject({ ...bottle, form: z.literal('indicator') })

/** One thing of an equation: how many of it, the atoms of one of it, and its charge. */
const speciesSchema = z.strictObject({ formula: text, coefficient: z.number().int().positive(), composition: z.record(z.string(), z.number().int().positive()), charge: z.number().int() })
export const REACTION_IDS = ['slow', 'clock'] as const
const reactionSchema = z.strictObject({ id: z.enum(REACTION_IDS), name: text, equation: text, reactants: z.array(speciesSchema).min(1), products: z.array(speciesSchema).min(1), sourceId: id, ...also })

export const REACTANT_IDS = ['iodide', 'bromate', 'hydrogen-ion'] as const
export const MIXTURE_IDS = ['mixture-1', 'mixture-2', 'mixture-3', 'mixture-4', 'mixture-5'] as const
export const BATH_IDS = ['ice', 'cool', 'warm'] as const
export const PART_IDS = ['runs', 'rate-law', 'temperature'] as const

/**
 * The reaction's rate record: what the kinetics engine takes (spec 19.4). `comparedIn` is the mixture that differs
 * from the reference in that reactant alone, which its order is found from. The orders and the rate constant are
 * cited; the activation energy, which no source read gives for a mixture like this bench's, is a model parameter
 * with its rationale. `end` is what ends a run: the bottle whose solute is used up by then, how many of it are
 * used for each one of the reaction as the rate counts it, what must be in the flask for the end to show and
 * which flask it goes into, and what the liquid looks like before and after.
 */
const rateLawSchema = z.strictObject({
  reactionId: z.enum(REACTION_IDS),
  expression: text,
  reactants: z
    .array(z.strictObject({ id: z.enum(REACTANT_IDS), name: text, formula: text, reagentId: id, comparedIn: z.enum(MIXTURE_IDS), order: cited(whole).extend(also) }))
    .min(1),
  note: citedText,
  rateConstant: citedNumber(positive).extend({ unit: text, celsius: z.number(), note: text }),
  activationEnergy: param(positive).extend({ unit: z.literal('kJ/mol') }),
  end: z.strictObject({ reagentId: id, per: z.number().int().positive(), indicatorId: id, indicatorFlask: z.enum(['a', 'b']), before: citedText, after: citedText, sourceId: id }),
})

/** A measured volume of a bottle, or of water, in millilitres. */
const volume = z.strictObject({ reagentId: id, millilitres: z.number().min(0) })
/** A mixture: what goes into each of its two flasks. The drops of starch are not counted. */
const mixtureSchema = z.strictObject({ id: z.enum(MIXTURE_IDS), name: text, flaskA: z.array(volume).min(1), flaskB: z.array(volume).min(1), sourceId: id })

/** A bath: `about` is the temperature its procedure sets it at, in °C, and `range` names the parameter that holds what the thermometer may read. */
const bathSchema = z.strictObject({ id: z.enum(BATH_IDS), name: text, about: z.number(), range: id, sourceId: id })

/** `notes` are shown once the part is done: what happened, what the lab's figures are and whose, and what is idealised. */
const part = { name: text, notes: z.array(citedText).min(1) }

export const clockSchema = z.strictObject({
  reagents: z.array(z.union([solutionSchema, indicatorSchema])).min(1),
  water: z.strictObject({ name: text, formula: text }),
  constants: z.strictObject({
    gasConstant: cited(positive).extend({ unit: text }),
    /** 0 °C in kelvin: what is added to a Celsius temperature. */
    zeroCelsius: citedNumber(positive).extend({ unit: text }),
  }),
  reactions: z.array(reactionSchema).length(2),
  /** How many thiosulfate ions are used for each bromate ion that reacts: worked out from the two reactions, and held to them by the build. */
  count: z.strictObject({ value: z.number().int().positive(), working: text, sourceId: id }),
  rateLaw: rateLawSchema,
  mixtures: z.array(mixtureSchema).min(2),
  /** The mixture whose row of the notebook is worked by hand, and which is run again in each bath. */
  referenceMixtureId: z.enum(MIXTURE_IDS),
  baths: z.array(bathSchema).min(1),
  parts: z.tuple([z.strictObject({ id: z.literal('runs'), ...part }), z.strictObject({ id: z.literal('rate-law'), ...part }), z.strictObject({ id: z.literal('temperature'), ...part })]),
  parameters: z.strictObject({
    roomRangeTenths: param(range),
    iceRangeTenths: param(range),
    coolRangeTenths: param(range),
    warmRangeTenths: param(range),
    standMinutes: param(whole),
    starchDrops: param(whole),
    scatterPerTenThousand: param(whole),
    delayLimitMs: param(whole),
    watchLimitSeconds: param(whole),
    orderChoices: param(z.array(whole).min(2)),
    unitPowers: param(z.array(z.number().int()).min(2)),
    rateConstantTolerancePercent: param(whole),
    activationTolerancePercent: param(whole),
    placesFromMicro: param(whole),
    placesStepMicro: param(whole),
    placesCount: param(whole),
  }),
})

export type ClockData = z.infer<typeof clockSchema>
export type Reagent = ClockData['reagents'][number]
export type Reaction = ClockData['reactions'][number]
export type Mixture = ClockData['mixtures'][number]
export type Bath = ClockData['baths'][number]
export type Part = ClockData['parts'][number]
export type PartId = (typeof PART_IDS)[number]
export type ReactantId = (typeof REACTANT_IDS)[number]
export type MixtureId = (typeof MIXTURE_IDS)[number]
export type BathId = (typeof BATH_IDS)[number]

/** A run of the lab by its id: a mixture at the room's temperature goes by the mixture's own id, and a run in a bath by the bath's with "bath-" in front. */
export const RUN_IDS = [...MIXTURE_IDS, ...BATH_IDS.map((bath) => `bath-${bath}` as const)] as const
export type RunId = (typeof RUN_IDS)[number]
export const bathRunId = (bath: BathId): RunId => `bath-${bath}`
/** The bath a run stands in, or null for a run at the room's temperature. */
export const bathOfRun = (runId: RunId): BathId | null => BATH_IDS.find((bath) => runId === `bath-${bath}`) ?? null
/** The mixture a run is of: its own, or the reference mixture for a run in a bath. */
export const mixtureOfRun = (record: ClockData, runId: RunId): Mixture => record.mixtures.find((mixture) => mixture.id === (bathOfRun(runId) === null ? runId : record.referenceMixtureId))!

/** A bottle of the record by its id. */
export function reagentOf(record: ClockData, reagentId: string): Reagent {
  const reagent = record.reagents.find((r) => r.id === reagentId)
  if (!reagent) throw new Error(`no reagent "${reagentId}"`)
  return reagent
}

// clock.json is written by `npm run build:data` from docs/research/clock/, after holding it to its manifests of
// sources and checking its reactions, its mixtures and its rate record; edit the script or its inputs, not that file.
export const clockData: ClockData = clockSchema.parse(data)
