import { z } from 'zod'
import { cited, citedNumber, hazardsSchema, param } from '../schema'
import data from './acetone.json'

// The iodination of acetone lab's record (spec 20): the three bottles with their hazards; the gas constant, the
// kelvin of 0 °C and the joules in a calorie; the reaction; the reaction's rate record, which is what the kinetics
// engine takes (the order in each reactant, the rate constant at a stated temperature, the activation energy, and
// what ends a run); the four mixtures; the two parts, with the notes shown when each is done; and the model's
// parameters. There are no baths and no part on temperature. It is its own file and is not part of the registry,
// so only the lab loads it. Like the other labs' schemas, this one keeps to the zod features schema.ts already uses.

const id = z.string().min(1)
const text = z.string().min(1)
const positive = z.number().positive()
const whole = z.number().int().min(0)
const range = z.tuple([whole, whole])

/** A citation that may rest on a second source and on more: `alsoSourceId`, then `moreSourceIds`. */
const also = { alsoSourceId: id.optional(), moreSourceIds: z.array(id).min(1).optional() }
const citedText = cited(text).extend(also)

// The record sourceId covers the name, the formula and the strength. The hazards are merged in by the build: the
// acetone's and the iodine's from the lab's hazards.json, which is written apart, and the acid's from the aqueous
// reactions lab's. `shown` is the strength as the bottle's label writes it, with its two figures: "0.0050".
const solutionSchema = z.strictObject({ id, name: text, formula: text, form: z.literal('solution'), molarity: positive, shown: text, classifiedAs: text, hazards: hazardsSchema, sourceId: id })

/** One thing of an equation: how many of it, the atoms of one of it, and its charge. */
const speciesSchema = z.strictObject({ formula: text, coefficient: z.number().int().positive(), composition: z.record(z.string(), z.number().int().positive()), charge: z.number().int() })

export const REACTANT_IDS = ['acetone', 'hydrogen-ion', 'iodine'] as const
export const MIXTURE_IDS = ['mixture-1', 'mixture-2', 'mixture-3', 'mixture-4'] as const
export const PART_IDS = ['runs', 'rate-law'] as const

/**
 * The reaction's rate record: what the kinetics engine takes (spec 20.4). `comparedIn` is the mixture that differs
 * from the reference in that reactant alone, which its order is found from. All of it is cited. The rate constant
 * is stored as its source prints it: `published` is the figure, and `exponent` the power of ten printed beside it,
 * so that the constant is the two together, 2.91 × 10⁻⁵. The activation energy is stored in the kilocalories its
 * source prints, and the model turns it into joules with the cited size of a calorie. `end` is what ends a run: the
 * bottle whose solute is used up by then, which is one of the reactants; how many of it are used for each one of
 * the reaction; and what the liquid looks like before and after. Nothing is added to show the end.
 */
const rateLawSchema = z.strictObject({
  expression: text,
  reactants: z.array(z.strictObject({ id: z.enum(REACTANT_IDS), name: text, formula: text, reagentId: id, comparedIn: z.enum(MIXTURE_IDS), order: cited(whole).extend(also) })).min(1),
  note: citedText,
  rateConstant: citedNumber(positive).extend({ exponent: z.number().int(), unit: text, celsius: z.number(), note: text }),
  activationEnergy: citedNumber(positive).extend({ unit: z.literal('kcal/mol'), note: text }),
  end: z.strictObject({ reagentId: id, per: z.number().int().positive(), before: citedText, after: citedText, sourceId: id }),
})

/** A measured volume of a bottle, or of water, in millilitres. */
const volume = z.strictObject({ reagentId: id, millilitres: z.number().min(0) })
/** A mixture: what is in the flask, and what is poured in to start the run, which is the iodine. */
const mixtureSchema = z.strictObject({ id: z.enum(MIXTURE_IDS), name: text, flask: z.array(volume).min(1), added: volume, sourceId: id })

/** `notes` are shown once the part is done: what happened, what the lab's figures are and whose, and what is idealised. */
const part = { name: text, notes: z.array(citedText).min(1) }

export const acetoneSchema = z.strictObject({
  reagents: z.array(solutionSchema).min(1),
  water: z.strictObject({ name: text, formula: text }),
  constants: z.strictObject({
    gasConstant: cited(positive).extend({ unit: text }),
    /** 0 °C in kelvin: what is added to a Celsius temperature. */
    zeroCelsius: citedNumber(positive).extend({ unit: text }),
    /** The joules in a thermochemical calorie: what turns the activation energy, printed in kilocalories, into joules. */
    joulesPerCalorie: citedNumber(positive).extend({ unit: z.literal('J/cal') }),
  }),
  reaction: z.strictObject({
    id: z.literal('iodination'),
    name: text,
    equation: text,
    reactants: z.array(speciesSchema).min(1),
    products: z.array(speciesSchema).min(1),
    /** The product the notes and the primer's safety card name. */
    product: z.strictObject({ name: text, formula: text }),
    sourceId: id,
    ...also,
  }),
  rateLaw: rateLawSchema,
  mixtures: z.array(mixtureSchema).min(2),
  /** The mixture whose row of the notebook is worked by hand. */
  referenceMixtureId: z.enum(MIXTURE_IDS),
  parts: z.tuple([z.strictObject({ id: z.literal('runs'), ...part }), z.strictObject({ id: z.literal('rate-law'), ...part })]),
  parameters: z.strictObject({
    roomRangeTenths: param(range),
    scatterPerTenThousand: param(whole),
    delayLimitMs: param(whole),
    watchLimitSeconds: param(whole),
    orderChoices: param(z.array(whole).min(2)),
    unitPowers: param(z.array(z.number().int()).min(2)),
    rateConstantTolerancePercent: param(whole),
    /** The steps at which the words for the liquid's colour change, by how much iodine is left. */
    paleBelowMicroMolar: param(whole),
    faintestBelowMicroMolar: param(whole),
  }),
})

export type AcetoneData = z.infer<typeof acetoneSchema>
export type Reagent = AcetoneData['reagents'][number]
export type Mixture = AcetoneData['mixtures'][number]
export type Part = AcetoneData['parts'][number]
export type PartId = (typeof PART_IDS)[number]
export type ReactantId = (typeof REACTANT_IDS)[number]
export type MixtureId = (typeof MIXTURE_IDS)[number]

/** A run of the lab by its id. Every run is a mixture at the room's temperature, and goes by the mixture's own id. */
export const RUN_IDS = MIXTURE_IDS
export type RunId = MixtureId
/** The mixture a run is of. */
export const mixtureOfRun = (record: AcetoneData, runId: RunId): Mixture => record.mixtures.find((mixture) => mixture.id === runId)!
/** Everything a mixture is made of: what is in the flask, then what is poured in. */
export const partsOfMixture = (mixture: Mixture) => [...mixture.flask, mixture.added]

/** A bottle of the record by its id. */
export function reagentOf(record: AcetoneData, reagentId: string): Reagent {
  const reagent = record.reagents.find((r) => r.id === reagentId)
  if (!reagent) throw new Error(`no reagent "${reagentId}"`)
  return reagent
}

// acetone.json is written by `npm run build:data` from docs/research/acetone/, after holding it to its manifests of
// sources and checking its reaction, its mixtures and its rate record; edit the script or its inputs, not that file.
export const acetoneData: AcetoneData = acetoneSchema.parse(data)
