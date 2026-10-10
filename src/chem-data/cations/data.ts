import { z } from 'zod'
import { cited, citedNumber, hazardsSchema, param } from '../schema'
import data from './cations.json'

// The Group I cations lab's record (spec 17): the eight bottles with their hazards; the three ions; what each
// solid and each dissolved thing is and looks like; the rules the engine's actions follow, each with its source;
// the Gibbs energies and the constants worked out from them; the solubility of lead chloride cold and hot; the
// five steps, each with its net ionic equations and the notes shown when it is done; the flow chart; and the
// model's parameters. It is its own file and is not part of the registry, so only the lab loads it. Like the other
// labs' schemas, this one keeps to the zod features schema.ts already uses.

const id = z.string().min(1)
const text = z.string().min(1)
const positive = z.number().positive()
const whole = z.number().int().min(0)

/** A citation that may rest on a second source and on more: `alsoSourceId`, then `moreSourceIds`. */
const also = { alsoSourceId: id.optional(), moreSourceIds: z.array(id).min(1).optional() }
const citedText = cited(text).extend(also)

/** A value worked out from cited ones, with the working shown. Exempt from citation (spec 5.1); the build works it out again. */
const workedOut = z.strictObject({ value: z.number(), unit: text, working: text })

// The record sourceId covers the name and the formula. The hazards are merged in by the build from the lab's
// hazards.json, which is written apart.
const reagentSchema = z.strictObject({
  id,
  name: text,
  formula: text,
  form: z.literal('solution'),
  /** mol/L. */
  molarity: positive,
  /** What the hazard statements classify, in the words of the heading over them (spec 5.2). */
  classifiedAs: text,
  hazards: hazardsSchema,
  sourceId: id,
})

/** One of the three ions: the solution a sample gets it from, and the chloride it comes down as. */
const ionSchema = z.strictObject({ id: z.enum(['silver', 'lead', 'mercury-i']), name: text, formula: text, reagentId: id, chlorideId: id, sourceId: id })

/**
 * A solid or a dissolved thing of the scheme. Its name and formula say what it is, which a page shows only in the
 * notes of a step that is done and on the tiles of the flow chart. `look` is what is seen of it: the colour of a
 * solid, or the colour a dissolved thing gives its liquid; absent for a dissolved thing whose colour no rule uses.
 */
const substanceSchema = z.strictObject({ id, name: text, formula: text, state: z.enum(['s', 'aq']), look: citedText.optional(), sourceId: id })

/** A rule the engine's actions follow (spec 17.4), in a sentence, with its source. */
const ruleSchema = z.strictObject({ id, says: text, sourceId: id, ...also })

/** A standard Gibbs energy of formation at 298.15 K, in kJ/mol, as the table prints it. */
const gibbsSchema = citedNumber(z.number()).extend({ id, label: text })

/**
 * A constant worked out from Gibbs energies: the change's own Gibbs energy is the sum of its terms (a product
 * counts +1 and a reactant −1 for each of it), and the constant is e^(−ΔG° ÷ RT). `shown` is the constant as a
 * page writes it.
 */
const equilibriumSchema = z.strictObject({
  id,
  name: text,
  expression: text,
  terms: z.array(z.strictObject({ gibbsId: id, coefficient: z.number().int() })).min(2),
  gibbs: workedOut,
  constant: z.strictObject({ value: positive, shown: text, working: text }),
})

const solubility = citedNumber(positive).extend({ unit: z.literal('g/L'), celsius: z.number() })

/** A net ionic equation as it is written, with its source. */
const equationSchema = citedText
const noteSchema = citedText

const TUBES = ['a', 'b', 'c'] as const
const stepSchema = <Id extends string>(stepId: Id) =>
  z.strictObject({
    id: z.literal(stepId),
    name: text,
    /** The tube the step is worked in: the first holds the sample and then the solid, the second the hot water poured off it, the third the ammonia poured off it. */
    tube: z.enum(TUBES),
    /** What the step adds, in the order it goes in: a reagent's id, or "water". */
    reagentIds: z.array(id).min(1),
    /** The rules the step's actions follow, the things it makes or leaves, and the constants the build checks it with: what its list of sources is drawn from. */
    ruleIds: z.array(id).min(1),
    substanceIds: z.array(id).min(1),
    equilibriumIds: z.array(id),
    /** Shown in the notes once the step is done. They are the scheme's, whatever the sample holds. */
    equations: z.array(equationSchema).min(1),
    notes: z.array(noteSchema).min(1),
  })

/** A place of the flow chart: what one step leaves in its solid or in its liquid, as the tiles that belong there. */
const placeSchema = z.strictObject({ id, stepId: id, layer: z.enum(['solid', 'liquid']), holds: z.array(id).min(1) })

export const cationsSchema = z.strictObject({
  reagents: z.array(reagentSchema).min(1),
  water: z.strictObject({ name: text, formula: text }),
  ions: z.tuple([ionSchema, ionSchema, ionSchema]),
  substances: z.array(substanceSchema).min(1),
  rules: z.array(ruleSchema).min(1),
  /** What an observation is recorded from: the colour of a solid, or none, and the colour of the liquid. */
  choices: z.strictObject({ solid: z.array(text).min(2), liquid: z.array(text).min(2) }),
  constants: z.strictObject({ gasConstant: cited(positive).extend({ unit: text }) }),
  gibbs: z.array(gibbsSchema).min(1),
  equilibria: z.array(equilibriumSchema).min(1),
  /** The solubility product of lead chromate as its source prints it, for the build's check of step 3. */
  leadChromate: z.strictObject({ solubilityProduct: cited(positive).extend({ shown: text }) }),
  /**
   * The solubility of lead chloride in cold and in hot water as its source prints it, and, worked out from it and
   * from the molar mass, the nanomoles a millilitre of water holds: the two numbers the engine runs step 2 on.
   */
  leadChloride: z.strictObject({
    atomicWeights: z.array(citedNumber(positive).extend({ id })).min(2),
    molarMass: workedOut,
    solubilityCold: solubility,
    solubilityHot: solubility,
    cold: workedOut,
    hot: workedOut,
    note: citedText,
  }),
  steps: z.tuple([stepSchema('precipitate'), stepSchema('extract-lead'), stepSchema('confirm-lead'), stepSchema('separate'), stepSchema('confirm-silver')]),
  /** The flow chart of part 1 (spec 17.3): the tiles it is filled from, and what belongs in each place. `tileIds` holds the right tiles and the distractors. */
  chart: z.strictObject({ tileIds: z.array(id).min(1), places: z.array(placeSchema).min(1), sourceId: id, ...also }),
  parameters: z.strictObject({
    temperatureKelvin: param(positive),
    dropMicrolitres: param(whole),
    sampleDropsOfEach: param(whole),
    sampleDrops: param(whole),
    hydrochloricAcidDrops: param(whole),
    waterDrops: param(whole),
    aceticAcidDrops: param(whole),
    chromateDrops: param(whole),
    ammoniaDrops: param(whole),
    nitricAcidDrops: param(whole),
    nitricAcidAdditions: param(whole),
    completeWithinPercent: param(positive),
  }),
})

export type CationsData = z.infer<typeof cationsSchema>
export type Reagent = CationsData['reagents'][number]
export type Ion = CationsData['ions'][number]
export type IonId = Ion['id']
export type Substance = CationsData['substances'][number]
export type Step = CationsData['steps'][number]
export type StepId = Step['id']
export type TubeId = (typeof TUBES)[number]
export type Place = CationsData['chart']['places'][number]

/** The three ions in the record's order. */
export const ION_IDS = ['silver', 'lead', 'mercury-i'] as const satisfies readonly IonId[]
/** The five steps in their order (spec 17.2). */
export const STEP_IDS = ['precipitate', 'extract-lead', 'confirm-lead', 'separate', 'confirm-silver'] as const satisfies readonly StepId[]
/** The two parts (spec 17.1): the known, which holds all three ions, and an unknown. */
export const PART_IDS = ['known', 'unknown'] as const
export type PartId = (typeof PART_IDS)[number]

/** A substance of the record by its id. */
export function substanceOf(data: CationsData, substanceId: string): Substance {
  const substance = data.substances.find((s) => s.id === substanceId)
  if (!substance) throw new Error(`no substance "${substanceId}"`)
  return substance
}

/** The bottles a step adds from, in the order they go in; the water of step 2 is not a bottle of the record. */
export const reagentsOf = (data: CationsData, stepId: StepId): Reagent[] => data.steps.find((s) => s.id === stepId)!.reagentIds.flatMap((reagentId) => data.reagents.filter((r) => r.id === reagentId))

// cations.json is written by `npm run build:data` from docs/research/cations/, after holding it to its manifests
// of sources, working its worked-out values out again and checking its rules against its numbers; edit the script
// or its inputs, not that file.
export const cationsData: CationsData = cationsSchema.parse(data)
