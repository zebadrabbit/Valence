import { z } from 'zod'
import { cited, citedNumber, hazardsSchema, param } from '../schema'
import data from './hotcold.json'

// The endothermic and exothermic lab's record (spec 26): the two salts with their hazards, each with what it is,
// its molar mass and how much of it dissolves; the water with its specific heat and density; the atomic weights;
// the three parts, the two runs each with the enthalpy the model runs on and the notes shown when the run counts;
// and the model's parameters. It is its own file and is not part of the registry, so only the lab loads it. Like
// the other labs' schemas, this one keeps to the zod features schema.ts already uses.

const id = z.string().min(1)
const text = z.string().min(1)
const positive = z.number().positive()
// Whole numbers: tenths of a degree, hundredths of a gram, parts per million, seconds or steps.
const whole = z.number().int().min(0)
const range = z.tuple([whole, whole])

/** A value worked out from cited ones, with the working shown. Exempt from citation (spec 5.1); the build works it out again. */
const workedOut = z.strictObject({ value: positive, unit: text, working: text })

/**
 * A salt. The record sourceId covers the name on the bench and the formula; `chemicalName` is what the salt is,
 * cited on its own, since the lab turns on it: Epsom salt is the heptahydrate, and the calcium chloride is the dry
 * salt. `watersOfCrystal` are the waters each unit of the crystal holds, which join the solution's water. The
 * hazards are merged in by the build, from this lab's hazards.json.
 */
const saltSchema = z.strictObject({
  id,
  name: text,
  chemicalName: cited(text),
  formula: text,
  form: z.literal('solid'),
  composition: z.record(z.string(), z.number().int().positive()),
  watersOfCrystal: whole,
  molarMass: workedOut,
  appearance: cited(text),
  /** How much dissolves, as its source prints it; the note sets the bench's most beside it. */
  solubility: citedNumber(positive).extend({ unit: z.literal('g/L'), note: text }),
  classifiedAs: text,
  hazards: hazardsSchema,
  sourceId: id,
})

/** One term of an enthalpy: a substance as the table has it, how many of it, and its enthalpy of formation in kJ/mol. A product counts with a plus and a reactant with a minus. */
const term = z.strictObject({ id, label: text, coefficient: z.number().int(), enthalpyOfFormation: citedNumber(z.number()) })
/** A sum of such terms, in kJ/mol, with the sum written out. */
const sum = { value: z.number(), terms: z.array(term).min(2), working: text }
/**
 * An enthalpy of solution: positive where heat is taken in. It is worked out for a solution of about the strength
 * on the bench; `infiniteDilution` is the same for a solution so dilute that more water changes nothing, which
 * the record gives beside it and no model uses.
 */
const enthalpy = z.strictObject({ ...sum, unit: z.literal('kJ/mol'), per: text, note: cited(text), infiniteDilution: z.strictObject(sum) })

/** What goes into the cup: a measured volume, the same every run, or a mass weighed out anew for each run (parameters hold its range). */
const amount = z.union([z.strictObject({ reagentId: id, value: positive, shown: text, unit: z.literal('mL') }), z.strictObject({ reagentId: id, about: positive, unit: z.literal('g') })])
const note = cited(text).extend({ alsoSourceId: id.optional(), moreSourceIds: z.array(id).min(1).optional() })
/** `notes` are shown once the part is done. */
const part = { name: text, notes: z.array(note).min(1) }
/** A run of a salt. `dilution` is the row of the tables its enthalpy is worked from, in moles of water for each mole of salt, with the rows printed under and over it: the build holds the bench's strength to being nearest it. */
const run = { ...part, reagentId: id, amounts: z.array(amount).length(2), dilution: z.strictObject({ row: positive, lower: positive, upper: positive }), enthalpy }

const waterValue = cited(positive).extend({ unit: text, note: text })

export const hotcoldSchema = z.strictObject({
  reagents: z.tuple([saltSchema, saltSchema]),
  /** The water in the cup. Its specific heat and its density are also used, as an idealisation, for each salt's solution (spec 26.3). */
  water: z.strictObject({ name: text, formula: text, specificHeat: waterValue, density: waterValue, sourceId: id }),
  atomicWeights: z.array(z.strictObject({ id, ...citedNumber(positive).shape })).min(1),
  parts: z.tuple([
    /** `dry` is magnesium sulfate with no water in its crystal, dissolved to the same strength: the figure the part's note sets beside Epsom salt's. No model uses it. */
    z.strictObject({ id: z.literal('epsom-salt'), ...run, dry: enthalpy }),
    z.strictObject({ id: z.literal('calcium-chloride'), ...run }),
    /** Part 3 asks which salt suits which pack. Its answers are stored nowhere: they follow from the signs of the two enthalpies. */
    z.strictObject({ id: z.literal('packs'), ...part }),
  ]),
  parameters: z.strictObject({
    loggerStepSeconds: param(whole),
    runOnSteps: param(whole),
    loggerMaxSteps: param(whole),
    mixStirredPpm: param(whole),
    mixStillPpm: param(whole),
    lossLidOnPpm: param(whole),
    lossLidOffPpm: param(whole),
    startRangeTenths: param(range),
    epsomSaltRangeCg: param(range),
    calciumChlorideRangeCg: param(range),
    leastChangeTenths: param(whole),
    highestTemperatureTenths: param(whole),
    readingToleranceTenths: param(whole),
  }),
})

export type HotcoldData = z.infer<typeof hotcoldSchema>
export type Salt = HotcoldData['reagents'][number]
export type Part = HotcoldData['parts'][number]
export type PartId = Part['id']
/** A part that is a run of a salt: named by its salt. */
export type SaltId = Exclude<PartId, 'packs'>

/** The three parts in their order, and the two of them that are runs. */
export const PART_IDS = ['epsom-salt', 'calcium-chloride', 'packs'] as const satisfies readonly PartId[]
export const SALT_IDS = ['epsom-salt', 'calcium-chloride'] as const satisfies readonly SaltId[]
export const isSaltId = (value: unknown): value is SaltId => SALT_IDS.includes(value as SaltId)

/** A run's part and its salt. */
export const runOf = (data: HotcoldData, salt: SaltId) => data.parts[SALT_IDS.indexOf(salt) as 0 | 1]
export const saltOf = (data: HotcoldData, salt: SaltId): Salt => data.reagents[SALT_IDS.indexOf(salt) as 0 | 1]

// hotcold.json is written by `npm run build:data` from docs/research/hotcold/, after holding it to its manifests
// of sources and to the atomic weights the periodic table keeps; edit the script or its inputs, not that file.
export const hotcoldData: HotcoldData = hotcoldSchema.parse(data)
