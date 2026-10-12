import { z } from 'zod'
import { cited, citedNumber, hazardsSchema, param } from '../schema'
import data from './calorimetry.json'

// The calorimetry lab's record (spec 16): the acid, the base, solid ammonium nitrate and the four metals with
// their hazards; the water with its specific heat and density; the three parts, each with the enthalpy the model
// runs on and the notes shown when it is done; and the model's parameters. It is its own file and is not part of
// the registry, so only the lab loads it. Like the other labs' schemas, this one keeps to the zod features
// schema.ts already uses.

const id = z.string().min(1)
const text = z.string().min(1)
const positive = z.number().positive()
// Whole numbers: tenths of a degree, hundredths of a gram, parts per million, seconds, steps or a percentage.
const whole = z.number().int().min(0)
const range = z.tuple([whole, whole])

/** A value worked out from cited ones, with the working shown. Exempt from citation (spec 5.1); the build works it out again. */
const workedOut = z.strictObject({ value: positive, unit: text, working: text })

// The record sourceId covers the name and the formula. The hazards are merged in by the build: those of the acid
// and the base from the aqueous reactions lab's file, the others from this lab's hazards.json.
const reagent = { id, name: text, formula: text, classifiedAs: text, hazards: hazardsSchema, sourceId: id }
const cid = z.number().int().positive()
const solutionSchema = z.strictObject({ ...reagent, form: z.literal('solution'), pubchemCid: cid, molarity: positive })
const solidSchema = z.strictObject({ ...reagent, form: z.literal('solid'), pubchemCid: cid, molarMass: citedNumber(positive), appearance: cited(text) })
/** A metal: the heat capacity of a mole of it as its source prints it, and its specific heat, worked out from that and the molar mass. */
const metalSchema = z.strictObject({
  ...reagent,
  form: z.literal('metal'),
  molarMass: citedNumber(positive),
  molarHeatCapacity: citedNumber(positive).extend({ unit: text }),
  specificHeat: workedOut,
  appearance: cited(text),
})

/** One term of an enthalpy: a substance as the table has it, how many of it, and its enthalpy of formation in kJ/mol. A product counts +1 and a reactant -1. */
const term = z.strictObject({ id, label: text, coefficient: z.number().int(), enthalpyOfFormation: citedNumber(z.number()) })
/** A sum of such terms, in kJ/mol, with the sum written out. */
const sum = { value: z.number(), terms: z.array(term).min(2), working: text }
/**
 * The enthalpy a part's model runs on and a run is judged against: negative where heat is given out. It is worked
 * out for solutions of about the strength on the bench; `infiniteDilution` is the same for solutions so dilute
 * that more water changes nothing, which a part's notes give beside it and no model uses.
 */
const enthalpy = z.strictObject({ ...sum, unit: z.literal('kJ/mol'), per: text, note: cited(text), infiniteDilution: z.strictObject(sum) })

/** What goes into the cup: a measured volume, the same every run, or a mass weighed out anew for each run (parameters hold its range). */
const amount = z.union([z.strictObject({ reagentId: id, value: positive, shown: text, unit: z.literal('mL') }), z.strictObject({ reagentId: id, about: positive, unit: z.literal('g') })])
const note = cited(text).extend({ alsoSourceId: id.optional(), moreSourceIds: z.array(id).min(1).optional() })
/** `notes` are shown once the part is done: what the number means, why a cup reads low, what is idealised and what a careful bench does. */
const part = { name: text, amounts: z.array(amount).min(2), notes: z.array(note).min(1) }

const waterValue = cited(positive).extend({ unit: text, note: text })

export const calorimetrySchema = z.strictObject({
  reagents: z.array(z.union([solutionSchema, solidSchema, metalSchema])).min(1),
  /** The water in the cup and in the bath. Its specific heat and its density are also used, as an idealisation, for every solution (spec 16.3). */
  water: z.strictObject({ name: text, formula: text, specificHeat: waterValue, density: waterValue, sourceId: id }),
  parts: z.tuple([
    z.strictObject({ id: z.literal('neutralisation'), ...part, enthalpy }),
    z.strictObject({ id: z.literal('dissolving'), ...part, enthalpy }),
    /** `candidateIds` are the metals the piece may be; `unknown` is how the piece is named and looks before it is identified. */
    z.strictObject({ id: z.literal('metal'), ...part, candidateIds: z.array(id).min(2), unknown: z.strictObject({ name: text, appearance: text }) }),
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
    saltRangeCg: param(range),
    metalRangeCg: param(range),
    bathRangeTenths: param(range),
    readingToleranceTenths: param(whole),
    tolerancePercent: param(whole),
  }),
})

export type CalorimetryData = z.infer<typeof calorimetrySchema>
export type Reagent = CalorimetryData['reagents'][number]
export type Metal = Extract<Reagent, { form: 'metal' }>
export type Part = CalorimetryData['parts'][number]
export type PartId = Part['id']

/** The three parts in their order. */
export const PART_IDS = ['neutralisation', 'dissolving', 'metal'] as const satisfies readonly PartId[]

/** The metals the unknown piece may be, in the record's order: what a page shows, hazards and all, before the piece is identified. */
export const candidatesOf = (data: CalorimetryData): Metal[] => data.parts[2].candidateIds.flatMap((candidate) => data.reagents.filter((r): r is Metal => r.form === 'metal' && r.id === candidate))

// calorimetry.json is written by `npm run build:data` from docs/research/calorimetry/, after holding it to its
// manifests of sources and to the copies other labs keep; edit the script or its inputs, not that file.
export const calorimetryData: CalorimetryData = calorimetrySchema.parse(data)
