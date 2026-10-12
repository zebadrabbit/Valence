import { z } from 'zod'
import { cited, citedNumber, hazardsSchema, param } from '../schema'
import data from './density.json'

// The measurement and density lab's record (spec 22): the two liquids and the three metals an unknown may be,
// with their hazards; the water; the five instruments and what each is read to; the table of liquids and the
// table of metals, each density with the figure its source prints, the temperature it is for and how the stored
// figure is worked out from it; the melting point of ice; the three parts with the notes shown when each is done;
// and the model's parameters. It is its own file and is not part of the registry, so only the lab loads it. Like
// the other labs' schemas, this one keeps to the zod features schema.ts already uses.

const id = z.string().min(1)
const text = z.string().min(1)
const positive = z.number().positive()
// Whole numbers: tenths of a millilitre or of a degree, hundredths of a gram or of a centimetre, or a percentage.
const whole = z.number().int().min(0)
const range = z.tuple([whole, whole])

/** A density worked out from the cited figure beside it, to three significant figures, with the working shown. Exempt from citation (spec 5.1); the build works it out again. */
const workedOut = z.strictObject({ value: positive, unit: z.literal('g/mL'), working: text })
/** What a source prints for a density: the figure with its digits, its unit (grams for each millilitre or cubic centimetre, or a multiple of water's density), and what it is the density of. */
const printed = citedNumber(positive).extend({ published: text, unit: text, what: text })

// The record sourceId covers the name and the formula. The hazards are merged in by the build from this lab's
// hazards.json. `tableId` is the row of the table of liquids or of metals that the thing on the bench is.
const reagentSchema = z.strictObject({ id, name: text, formula: text, form: z.enum(['liquid', 'solution', 'metal']), tableId: id, classifiedAs: text, hazards: hazardsSchema, sourceId: id })

/** A row of the table of liquids. `strength` says how the strength of a solution is defined: by mass, as its source has it. */
const liquidSchema = z.strictObject({ id, name: text, strength: text.optional(), temperature: text, printed, density: workedOut })
/** A row of the table of metals. */
const metalSchema = z.strictObject({ id, name: text, formula: text, temperature: text, printed, density: workedOut })

export const INSTRUMENT_IDS = ['ruler-cm', 'ruler-mm', 'cylinder', 'thermometer', 'balance'] as const
/**
 * An instrument as it is set out (spec 22.1): the unit of its scale, how far apart its marks are and which are
 * numbered, where the scale begins and ends, and how many decimal places a reading has. A scale that is
 * `estimated` is read to one figure beyond its finest mark; the balance shows its figures.
 */
const instrumentSchema = z.strictObject({ id: z.enum(INSTRUMENT_IDS), name: text, unit: text, markEvery: positive, numberEvery: positive, from: z.number(), to: z.number(), decimals: whole, estimated: z.boolean() })

const note = cited(text).extend({ alsoSourceId: id.optional(), moreSourceIds: z.array(id).min(1).optional() })
/** `notes` are shown once the part is done: what the result means, and what the lab takes as simpler than it is. */
const part = { name: text, notes: z.array(note).min(1) }
/** How an unknown is named and looks before it is found; the things it may be, by their rows; and the rows of the table shown beside it. */
const unknown = { unknown: z.strictObject({ name: text, appearance: text }), unknownIds: z.array(id).min(2), candidateIds: z.array(id).min(2) }

export const densitySchema = z.strictObject({
  reagents: z.array(reagentSchema).min(1),
  /** The distilled water: its density at 20 °C turns a relative density into grams for each millilitre. */
  water: z.strictObject({ name: text, formula: text, density: citedNumber(positive).extend({ published: text, unit: text, temperature: text, note: text }), sourceId: id }),
  instruments: z.array(instrumentSchema).length(INSTRUMENT_IDS.length),
  liquids: z.array(liquidSchema).min(2),
  metals: z.array(metalSchema).min(2),
  constants: z.strictObject({ icePoint: citedNumber(z.number()).extend({ published: text, unit: text, note: text }) }),
  parts: z.tuple([z.strictObject({ id: z.literal('reading'), ...part }), z.strictObject({ id: z.literal('liquid'), ...part, ...unknown }), z.strictObject({ id: z.literal('metal'), ...part, ...unknown })]),
  parameters: z.strictObject({
    readingAllowance: param(whole),
    eyeShiftTenthMl: param(whole),
    tolerancePercent: param(whole),
    noteLengthRangeE2: param(range),
    noteWidthRangeE2: param(range),
    firstVolumeRangeTenthMl: param(range),
    thermometerOffRangeTenths: param(range),
    firstMassRangeCg: param(range),
    emptyCylinderRangeCg: param(range),
    liquidRangeTenthMl: param(range),
    waterRangeTenthMl: param(range),
    piecesRangeTenthMl: param(range),
    wetWaterRangeCg: param(range),
    splashRangeTenthMl: param(range),
  }),
})

export type DensityData = z.infer<typeof densitySchema>
export type Reagent = DensityData['reagents'][number]
export type Liquid = DensityData['liquids'][number]
export type Metal = DensityData['metals'][number]
export type Instrument = DensityData['instruments'][number]
export type InstrumentId = Instrument['id']
export type Part = DensityData['parts'][number]
export type PartId = Part['id']
/** A part with an unknown to find. */
export type UnknownPartId = Exclude<PartId, 'reading'>

/** The three parts in their order. */
export const PART_IDS = ['reading', 'liquid', 'metal'] as const satisfies readonly PartId[]

/** The rows of the table shown beside an unknown, in the record's order. */
export const candidatesOf = (data: DensityData, part: UnknownPartId): (Liquid | Metal)[] => {
  const rows: (Liquid | Metal)[] = part === 'liquid' ? data.liquids : data.metals
  return data.parts[part === 'liquid' ? 1 : 2].candidateIds.flatMap((candidate) => rows.filter((row) => row.id === candidate))
}

/** The things on the bench that an unknown may be, in the record's order: what a page shows, hazards and all, before the unknown is named. */
export const unknownsOf = (data: DensityData, part: UnknownPartId): Reagent[] => data.parts[part === 'liquid' ? 1 : 2].unknownIds.flatMap((row) => data.reagents.filter((r) => r.tableId === row))

// density.json is written by `npm run build:data` from docs/research/density/, after holding it to its manifests
// of sources and to the copy the periodic table keeps; edit the script or its inputs, not that file.
export const densityData: DensityData = densitySchema.parse(data)
