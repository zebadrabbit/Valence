import { z } from 'zod'
import { cited, citedNumber, hazardsSchema, param } from '../schema'
import data from './mixing.json'

// The polarity and mixing lab's record (spec 25): the one bottle that is a laboratory chemical, with its hazards;
// the five liquids, each with what it holds, what it looks like, its density, its family for the rule and the
// molecule of the explorer's library it links to; the two solids; each pair of liquids on the bench with whether
// the two mix, and each solid in a liquid with whether it dissolves, each with what it rests on and the note shown
// when its tube counts; what is left off the bench, and why; part 3's two questions; the one note the foods share;
// the three parts with the notes shown when each is done; and the model's parameters. Which liquid of a pair is on
// top is stored nowhere: it follows from the two densities (spec 25.3). The engine reads these and works no
// chemistry out beyond comparing two densities. It is its own file and is not part of the registry, so only the lab
// loads it. Like the other labs' schemas, this one keeps to the zod features schema.ts already uses.

const id = z.string().min(1)
const text = z.string().min(1)
const positive = z.number().positive()
const whole = z.number().int().min(0)

/** A citation that may rest on a second source and on more: `alsoSourceId`, then `moreSourceIds`. */
const also = { alsoSourceId: id.optional(), moreSourceIds: z.array(id).min(1).optional() }
const citedText = cited(text).extend(also)

export const LIQUID_IDS = ['water', 'rubbing-alcohol', 'vinegar', 'vegetable-oil', 'mineral-oil'] as const
export const SOLID_IDS = ['salt', 'sugar'] as const
/** The pairs of liquids the bench offers (spec 25.1): nine of the ten, the rubbing alcohol with the mineral oil being left off. */
export const PAIR_IDS = [
  'water+rubbing-alcohol',
  'water+vinegar',
  'water+vegetable-oil',
  'water+mineral-oil',
  'rubbing-alcohol+vinegar',
  'rubbing-alcohol+vegetable-oil',
  'vinegar+vegetable-oil',
  'vinegar+mineral-oil',
  'vegetable-oil+mineral-oil',
] as const
/** The solids in liquids the bench offers (spec 25.1): eight of the ten, neither solid being tried in the rubbing alcohol. */
export const SOLID_TUBE_IDS = ['salt-in-water', 'salt-in-vinegar', 'salt-in-vegetable-oil', 'salt-in-mineral-oil', 'sugar-in-water', 'sugar-in-vinegar', 'sugar-in-vegetable-oil', 'sugar-in-mineral-oil'] as const
export const FAMILIES = ['water', 'oil'] as const
export const QUESTION_IDS = ['grease', 'epsom-salt'] as const
export const PART_IDS = ['liquids', 'solids', 'rule'] as const

const liquidId = z.enum(LIQUID_IDS)
const solidId = z.enum(SOLID_IDS)

// The bottle that is a laboratory chemical on this bench (spec 25.3). `holds` says in words what is in it. The
// hazards are merged in by the build from the lab's hazards.json, which is written apart.
const reagentSchema = z.strictObject({
  id,
  name: text,
  holds: text,
  form: z.literal('liquid'),
  /** What the hazard statements classify, in the words of the heading over them (spec 5.2). */
  classifiedAs: text,
  hazards: hazardsSchema,
})

/** A colour in the record's words, from a source that prints it or, where none was read, the lab's own description of its bench, marked so. */
const looksSchema = z.union([cited(text), param(text)])

/**
 * A liquid's density with the figure its source prints. `temperature` is the temperature the source gives it for,
 * and null where the source prints none; `note` says what the source prints the figure as.
 */
const densitySchema = citedNumber(positive).extend({ unit: z.literal('g/mL'), temperature: text.nullable(), note: text })

/** What an outcome rests on: a source that names the two things (`named`), or a rule for a family (`general`), with the reason the source applies either way. */
const outcomeSchema = cited(z.boolean()).extend({ ...also, basis: z.enum(['named', 'general']), reason: text })

const liquidSchema = z.strictObject({
  id: liquidId,
  name: text,
  holds: text,
  /** How strong it is, where it is a solution in water. */
  strength: cited(text).optional(),
  looks: looksSchema,
  density: densitySchema,
  /** Which family it sorts with in part 3 (spec 25.3), and why. Not shown before part 3 is done. */
  family: cited(z.enum(FAMILIES)).extend({ ...also, reason: text }),
  /** Its molecule in the explorer's library, where the library holds it (spec 25.2). */
  moleculeId: id.optional(),
  /** The bottle whose hazards it carries; a liquid with none has the shared note. */
  reagentId: id.optional(),
})

const solidSchema = z.strictObject({ id: solidId, name: text, holds: text, looks: cited(text), moleculeId: id.optional() })

const pairSchema = z.strictObject({
  id: z.enum(PAIR_IDS),
  /** The two liquids, in the bench's order. */
  liquidIds: z.tuple([liquidId, liquidId]),
  /** Whether the two mix into one layer. */
  mix: outcomeSchema,
  /** Shown once its tube counts: what was seen, and what it means. */
  note: citedText,
})

const solidTubeSchema = z.strictObject({
  id: z.enum(SOLID_TUBE_IDS),
  solidId,
  liquidId,
  dissolves: outcomeSchema,
  note: citedText,
})

/** A pair or a solid in a liquid that is left off the bench because no source settles what it shows (spec 25.1). */
const offBenchSchema = z.strictObject({ id, kind: z.enum(['pair', 'solid-in-liquid']), rationale: text })

const questionSchema = z.strictObject({
  id: z.enum(QUESTION_IDS),
  /** The question as the page asks it. */
  asks: text,
  choices: z.tuple([id, id]),
  answer: cited(id).extend({ ...also, reason: text }),
})

const partSchema = <Id extends string>(partId: Id) => z.strictObject({ id: z.literal(partId), name: text, notes: z.array(citedText).min(1) })

export const mixingSchema = z.strictObject({
  reagents: z.array(reagentSchema).length(1),
  liquids: z.array(liquidSchema).length(LIQUID_IDS.length),
  solids: z.array(solidSchema).length(SOLID_IDS.length),
  pairs: z.array(pairSchema).min(1),
  solidInLiquid: z.array(solidTubeSchema).min(1),
  offBench: z.array(offBenchSchema),
  rule: z.strictObject({ questions: z.array(questionSchema).length(QUESTION_IDS.length) }),
  /** The note of everything on the bench but the rubbing alcohol (spec 25.3): the red cabbage pH lab's, copied in by the build. */
  sharedNote: param(text),
  parts: z.tuple([partSchema('liquids'), partSchema('solids'), partSchema('rule')]),
  parameters: z.strictObject({
    neededPairs: param(z.number().int().min(1)),
    neededSolids: param(z.number().int().min(1)),
    leastDensityGap: param(positive),
    moreMicrolitres: param(whole),
    lessMicrolitres: param(whole),
    solidTubeMicrolitres: param(whole),
    unsettledUntilStood: param(z.literal(1)),
    mixedKeepsColour: param(z.literal(1)),
  }),
})

export type MixingData = z.infer<typeof mixingSchema>
export type Reagent = MixingData['reagents'][number]
export type Liquid = MixingData['liquids'][number]
export type Solid = MixingData['solids'][number]
export type LiquidId = (typeof LIQUID_IDS)[number]
export type SolidId = (typeof SOLID_IDS)[number]
export type PairId = (typeof PAIR_IDS)[number]
export type SolidTubeId = (typeof SOLID_TUBE_IDS)[number]
export type TubeId = PairId | SolidTubeId
export type Family = (typeof FAMILIES)[number]
export type QuestionId = (typeof QUESTION_IDS)[number]
export type PartId = (typeof PART_IDS)[number]

export const isPairId = (tubeId: unknown): tubeId is PairId => PAIR_IDS.includes(tubeId as PairId)
export const isSolidTubeId = (tubeId: unknown): tubeId is SolidTubeId => SOLID_TUBE_IDS.includes(tubeId as SolidTubeId)

/** A liquid of the record by its id. */
export function liquidOf(data: MixingData, liquid: LiquidId): Liquid {
  const found = data.liquids.find((l) => l.id === liquid)
  if (!found) throw new Error(`no liquid "${liquid}"`)
  return found
}

/** A solid of the record by its id. */
export function solidOf(data: MixingData, solid: SolidId): Solid {
  const found = data.solids.find((s) => s.id === solid)
  if (!found) throw new Error(`no solid "${solid}"`)
  return found
}

/** The bottle whose hazards a liquid carries, or undefined where it has the shared note. */
export const reagentOf = (data: MixingData, item: { reagentId?: string | undefined }): Reagent | undefined => (item.reagentId === undefined ? undefined : data.reagents.find((r) => r.id === item.reagentId))

// mixing.json is written by `npm run build:data` from docs/research/mixing/, after holding it to its manifests of
// sources and checking its bench, its densities and its links; edit the script or its inputs, not that file.
export const mixingData: MixingData = mixingSchema.parse(data)
