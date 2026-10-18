import { z } from 'zod'
import { cited, citedNumber, hazardsSchema, param } from '../schema'
import data from './freezing.json'

// The freezing point depression lab's record (spec 23): the three liquids the unknown may be, urea and the three
// salts, each with its hazards, its molar mass and the particles each formula unit gives; the water with its
// freezing point constant; the atomic weights the molar masses are worked out from; the measured freezing points
// of solutions that a source gives, and the osmotic coefficients of the salts' solutions that an evaluation gives;
// the three parts with the notes shown when each is done; and the model's parameters. It is its own file and is not
// part of the registry, so only the lab loads it. Like the other labs' schemas, this one keeps to the zod features
// schema.ts already uses.

const id = z.string().min(1)
const text = z.string().min(1)
const positive = z.number().positive()
// Whole numbers: hundredths of a degree or of a gram, milligrams, millionths of a degree, parts per million or per thousand, seconds or steps.
const whole = z.number().int().min(0)
const range = z.tuple([whole, whole])

/** A value worked out from cited ones, with the working shown. Exempt from citation (spec 5.1); the build works it out again. */
const workedOut = z.strictObject({ value: positive, unit: text, working: text })

/**
 * The particles each formula unit gives in water (spec 23.3). `ideal` is the whole number the formula gives: one
 * for a molecule, two for these salts. `value` is what the model uses: the ideal, marked as such; a measured
 * figure, with the row of `measured` it is worked out from; or an evaluated one, with the row of `osmotic` it is
 * worked out from. `note` says which in a sentence.
 */
const particles = z.strictObject({ value: positive, ideal: z.number().int().positive(), kind: z.enum(['ideal', 'measured', 'osmotic']), measuredId: id.optional(), osmoticId: id.optional(), note: text })

// The record sourceId covers the name, the formula and what the thing looks like. The hazards are merged in by the build from this lab's hazards.json.
const reagentSchema = z.strictObject({
  id,
  name: text,
  formula: text,
  form: z.enum(['liquid', 'solid']),
  /** How many atoms of each element a formula unit holds. */
  composition: z.record(z.string(), z.number().int().positive()),
  molarMass: workedOut,
  particles,
  appearance: text,
  classifiedAs: text,
  hazards: hazardsSchema,
  sourceId: id,
})

/**
 * A freezing point of a solution in water as a source prints it, and what it gives: the molality of that strength,
 * the fall one particle for each formula unit would give, and the ratio of the fall printed to that, to as many
 * figures as the fall is printed to.
 */
const measuredSchema = z.strictObject({
  id,
  reagentId: id,
  massPercent: citedNumber(positive),
  freezingPoint: citedNumber(z.number().negative()).extend({ unit: z.literal('°C') }),
  molality: z.strictObject({ value: positive, unit: z.literal('mol/kg') }),
  idealFall: z.strictObject({ value: positive, unit: z.literal('°C') }),
  ratio: z.strictObject({ value: positive, figures: z.number().int().min(1).max(3) }),
  working: text,
})

/**
 * An osmotic coefficient of a solution in water as an evaluation prints it, at a stated molality and temperature,
 * and the count of particles it gives: the ideal count times the coefficient, to three figures.
 */
const osmoticSchema = z.strictObject({
  id,
  reagentId: id,
  molality: citedNumber(positive).extend({ unit: z.literal('mol/kg') }),
  kelvin: citedNumber(positive),
  osmoticCoefficient: citedNumber(positive),
  ratio: z.strictObject({ value: positive, figures: z.literal(3) }),
  working: text,
})

const note = cited(text).extend({ alsoSourceId: id.optional(), moreSourceIds: z.array(id).min(1).optional() })
/** `notes` are shown once the part is done: what the number means, how the ideal stands beside a real solution, and what is taken as simpler than it is. */
const part = { name: text, notes: z.array(note).min(1) }

export const freezingSchema = z.strictObject({
  reagents: z.array(reagentSchema).min(1),
  /** The water in the cup. Its freezing point constant is used at every strength of the bench (spec 23.3). */
  water: z.strictObject({ name: text, formula: text, freezingPointConstant: citedNumber(positive).extend({ unit: text, note: text }), sourceId: id }),
  atomicWeights: z.array(z.strictObject({ id, ...citedNumber(positive).shape })).min(1),
  measured: z.array(measuredSchema),
  osmotic: z.array(osmoticSchema),
  parts: z.tuple([
    z.strictObject({ id: z.literal('water'), ...part }),
    /** `candidateIds` are the liquids the unknown may be; `unknown` is how it is named and looks before it is identified. */
    z.strictObject({ id: z.literal('unknown'), ...part, candidateIds: z.array(id).min(2), unknown: z.strictObject({ name: text, appearance: text }) }),
    /** `soluteIds` are what part 3 dissolves: the first is the one that is no salt. */
    z.strictObject({ id: z.literal('particles'), ...part, soluteIds: z.array(id).min(2) }),
  ]),
  parameters: z.strictObject({
    loggerStepSeconds: param(whole),
    runOnSteps: param(whole),
    loggerMaxSteps: param(whole),
    mixStirredPpm: param(whole),
    mixStillPpm: param(whole),
    leakLidOnMg: param(whole),
    leakLidOffMg: param(whole),
    meltGramDegreesPerGram: param(whole),
    warmLidOnPpm: param(whole),
    warmLidOffPpm: param(whole),
    roomHundredths: param(whole),
    iceCg: param(whole),
    iceLowCg: param(whole),
    levelBandMicrodegrees: param(whole),
    startRangeHundredths: param(range),
    probeOffRangeHundredths: param(range),
    waterRangeCg: param(range),
    unknownRangeCg: param(range),
    ureaRangeCg: param(range),
    naclRangeCg: param(range),
    kclRangeCg: param(range),
    nabrRangeCg: param(range),
    molarMassTolerancePerMille: param(whole),
    particlesTolerancePerMille: param(whole),
  }),
})

export type FreezingData = z.infer<typeof freezingSchema>
export type Reagent = FreezingData['reagents'][number]
export type Part = FreezingData['parts'][number]
export type PartId = Part['id']

/** The three parts in their order. */
export const PART_IDS = ['water', 'unknown', 'particles'] as const satisfies readonly PartId[]

const named = (data: FreezingData, ids: readonly string[]): Reagent[] => ids.flatMap((wanted) => data.reagents.filter((r) => r.id === wanted))

/** The liquids the unknown may be, in the record's order: what a page shows, hazards and all, before the unknown is named. */
export const candidatesOf = (data: FreezingData): Reagent[] => named(data, data.parts[1].candidateIds)

/** What part 3 dissolves, in the record's order: urea, then the three salts. */
export const solutesOf = (data: FreezingData): Reagent[] => named(data, data.parts[2].soluteIds)

// freezing.json is written by `npm run build:data` from docs/research/freezing/, after holding it to its manifests
// of sources and to the atomic weights the periodic table keeps; edit the script or its inputs, not that file.
export const freezingData: FreezingData = freezingSchema.parse(data)
