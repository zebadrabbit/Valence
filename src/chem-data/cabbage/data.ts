import { z } from 'zod'
import { cited, citedNumber, hazardsSchema, param } from '../schema'
import data from './cabbage.json'

// The red cabbage pH lab's record (spec 21): the seven bottles that are laboratory chemicals, with their hazards;
// the scale's thirteen buffers and its three questions; the indicator's colours, each with the pH or the range
// its source names it for; the household things, each with how it is on the bench, what it looks like before the
// indicator goes in, its range of pH and the note shown when its sample is done; the one note that the things
// with no record of their own share; three constants; the three parts with the notes shown when each is done; and
// the model's parameters. The engine reads these and works no chemistry out beyond finding a colour in the table.
// It is its own file and is not part of the registry, so only the lab loads it. Like the other labs' schemas, this
// one keeps to the zod features schema.ts already uses.

const id = z.string().min(1)
const text = z.string().min(1)
const positive = z.number().positive()
const whole = z.number().int().min(0)

/** A citation that may rest on a second source and on more: `alsoSourceId`, then `moreSourceIds`. */
const also = { alsoSourceId: id.optional(), moreSourceIds: z.array(id).min(1).optional() }
const citedText = cited(text).extend(also)

// A bottle that is a laboratory chemical on this bench (spec 21.4). `holds` says in words what is in it, which is
// the lab's own account of its bench: the directions name the bottles and give no recipe. The hazards are merged
// in by the build from the lab's hazards.json, which is written apart.
const reagentSchema = z.strictObject({
  id,
  name: text,
  holds: text,
  form: z.enum(['solution', 'indicator']),
  /** What the hazard statements classify, in the words of the heading over them (spec 5.2). */
  classifiedAs: text,
  hazards: hazardsSchema,
})

/** A buffer of the scale, taken to be at its labelled pH (spec 21.3). One with no `reagentId` has the shared note for its hazards. */
const bufferSchema = z.strictObject({ ph: z.number().int().min(1).max(13), reagentId: id.optional() })

export const SCALE_QUESTION_IDS = ['acid-end', 'neutral', 'same-pair'] as const

/**
 * A question the rack answers (spec 21.1). `colour-of-tube` asks what colour the buffer of one pH shows;
 * `same-colour-pair` asks which two neighbouring buffers show the same colour, answered by the lower of the two.
 * The right answers are not stored: the engine reads them off the table of colours.
 */
const scaleQuestionSchema = z.union([
  z.strictObject({ id: z.enum(SCALE_QUESTION_IDS), kind: z.literal('colour-of-tube'), ph: z.number().int().min(1).max(13) }),
  z.strictObject({ id: z.enum(SCALE_QUESTION_IDS), kind: z.literal('same-colour-pair') }),
])

/** A colour of the indicator as its source names it, with the whole pH values the source gives it for. */
const colourSchema = z.strictObject({ id, colour: text, from: z.number().int(), to: z.number().int(), sourceId: id })

export const THING_IDS = ['vinegar', 'lemon-juice', 'apple-juice', 'ammonia', 'shampoo', 'conditioner', 'laundry-detergent', 'lab-detergent', 'mouthwash', 'antacid', 'aspirin', 'bleach', 'drain-cleaner', 'epsom-salt'] as const

/** A pH worked out from cited figures, with the working shown. Exempt from citation (spec 5.1); the build works it out again. */
const workedOut = z.strictObject({ value: z.number(), unit: z.literal('pH'), working: text })

/**
 * A thing's range of pH. `document`: the two ends as a document prints them, and what the document gives them for;
 * one figure is stored as both ends. `arithmetic`: worked out, and said to be (spec 21.4), from the strength of
 * the product in per cent as a document gives it, the formula weight of what is dissolved, the bench's dilution
 * and one of the record's constants.
 */
const phSchema = z.union([
  z.strictObject({ basis: z.literal('document'), low: citedNumber(z.number()), high: citedNumber(z.number()), givenFor: text }),
  z.strictObject({
    basis: z.literal('arithmetic'),
    rule: z.enum(['weak-base', 'salt-of-weak-acid', 'strong-base']),
    solute: z.strictObject({ name: text, formulaWeight: citedNumber(positive) }),
    percent: z.strictObject({ low: citedNumber(positive), high: citedNumber(positive) }),
    low: workedOut,
    high: workedOut,
  }),
])

/** What is seen of a thing in its tube before the indicator goes in: the lab's own description of its bench, and marked so. */
const beforeSchema = param(z.strictObject({ liquid: text, cloudy: z.boolean(), solid: text.nullable() }))

const thingSchema = z.strictObject({
  id: z.enum(THING_IDS),
  /** What it is, never a brand (spec 21.1). */
  name: text,
  kind: z.enum(['food', 'toiletry', 'medicine', 'cleaner']),
  /** How it is on the bench: as sold, one part in twenty or in a hundred in water, crushed tablets in water, or a salt dissolved in water. */
  onBench: z.enum(['as-sold', 'one-in-twenty', 'one-in-hundred', 'tablets', 'dissolved']),
  /** The bottle whose hazards it carries; a thing with none has the shared note. */
  reagentId: id.optional(),
  /** True for the thing that destroys the dye (spec 21.2). */
  bleaches: z.literal(true).optional(),
  before: beforeSchema,
  ph: phSchema,
  /** Shown once its sample is done. */
  note: citedText,
})

export const PART_IDS = ['scale', 'things', 'unit'] as const

const partSchema = <Id extends string>(partId: Id) => z.strictObject({ id: z.literal(partId), name: text, notes: z.array(citedText).min(1) })

export const cabbageSchema = z.strictObject({
  reagents: z.array(reagentSchema).min(1),
  water: z.strictObject({ name: text, formula: text }),
  scale: z.strictObject({ buffers: z.array(bufferSchema).length(13), questions: z.array(scaleQuestionSchema).length(3) }),
  indicator: z.strictObject({
    reagentId: id,
    /** In the order of the scale, from strong acid to strong base. */
    colours: z.array(colourSchema).min(2),
    /** What is seen where the dye has been destroyed. */
    bleached: citedText,
    note: citedText,
  }),
  things: z.array(thingSchema).min(8),
  /** The note of the things and the buffers that have no record of their own (spec 21.4): the lab's own, and marked so. */
  sharedNote: param(text),
  constants: z.strictObject({ pKw: citedNumber(positive), ammoniaPKb: citedNumber(positive), hypochlorousPKa: citedNumber(positive) }),
  parts: z.tuple([partSchema('scale'), partSchema('things'), partSchema('unit')]),
  parameters: z.strictObject({
    colourEdgesTenths: param(z.array(whole).min(1)),
    oneInTwenty: param(positive),
    oneInHundred: param(positive),
    gramsPerHundredMillilitres: param(positive),
    productDensity: param(positive),
    dilutedReadsAsSold: param(z.literal(1)),
    endBufferMolarity: param(positive),
    unrinsedSharePercent: param(z.number().int().min(1).max(99)),
    estimateWithinTenths: param(whole),
    neededToCount: param(z.number().int().min(1)),
    sampleMicrolitres: param(whole),
    indicatorMicrolitres: param(whole),
  }),
})

export type CabbageData = z.infer<typeof cabbageSchema>
export type Reagent = CabbageData['reagents'][number]
export type Thing = CabbageData['things'][number]
export type ThingId = (typeof THING_IDS)[number]
export type PartId = (typeof PART_IDS)[number]
export type ScaleQuestionId = (typeof SCALE_QUESTION_IDS)[number]

/** A thing of the record by its id. */
export function thingOf(data: CabbageData, thingId: ThingId): Thing {
  const thing = data.things.find((t) => t.id === thingId)
  if (!thing) throw new Error(`no thing "${thingId}"`)
  return thing
}

/** The bottle whose hazards a thing or a buffer carries, or undefined where it has the shared note. */
export const reagentOf = (data: CabbageData, item: { reagentId?: string | undefined }): Reagent | undefined => (item.reagentId === undefined ? undefined : data.reagents.find((r) => r.id === item.reagentId))

// cabbage.json is written by `npm run build:data` from docs/research/cabbage/, after holding it to its manifests of
// sources, working its worked-out values out again and checking a careful estimate against every range; edit the
// script or its inputs, not that file.
export const cabbageData: CabbageData = cabbageSchema.parse(data)
