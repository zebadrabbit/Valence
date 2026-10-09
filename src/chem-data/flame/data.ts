import { z } from 'zod'
import { cited, citedNumber, hazardsSchema, param } from '../schema'
import data from './flame.json'

// The flame test lab's record (spec 15): the six solutions with their hazards, the colour each gives a flame, the
// lines and bands its flame shows in a hand spectroscope, what the strip leaves out and the notes shown when its
// station is done; what a handled loop carries and whose colour hides the others; the closing question's answer;
// and the model's parameters. It is its own file and is not part of the registry, so only the lab loads it. Like
// the other labs' schemas, this one keeps to the zod features schema.ts already uses.

const id = z.string().min(1)
const text = z.string().min(1)
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/)
const nm = z.number().positive()

/** What gives a line or a band: the metal's atom, or a molecule formed in the flame, by its formula. */
const emitter = z.union([z.strictObject({ kind: z.literal('atom'), symbol: text }), z.strictObject({ kind: z.literal('molecule'), formula: text })])

// What a line and a band share. The feature's sources (`sourceId`, a second in `alsoSourceId` and, for a line, the
// source of its wavelength) cover between them where it is, that a flame shows it, what gives it and its rank.
const feature = {
  id,
  /** The everyday word for light of that wavelength; its source's word where the source names a colour. */
  colour: text,
  /** Its rank among its salt's features, 1 for the brightest. No two of a salt share a rank. */
  prominence: z.number().int().positive(),
  emitter,
  sourceId: id,
  alsoSourceId: id.optional(),
}

/**
 * A sharp line: one wavelength, in the digits NIST prints. Where NIST lists a second line closer than a hand
 * spectroscope separates (parameters.unresolvedWithinNm), this is the stronger of the two and `pairedWithNm` the
 * other: the pair is seen, and stored, as one line.
 */
const lineSchema = z.strictObject({ ...feature, kind: z.literal('line'), wavelengthNm: citedNumber(nm), pairedWithNm: citedNumber(nm).optional() })

/**
 * A broad band: a range of wavelengths. Where `approximate` is false the range is the one its source gives. Where
 * it is true no source gives the band's limits: the range runs between the positions (maxima or band heads) the
 * sources do give, one position where they give one, and the band itself is wider than that by an amount nobody
 * read (it is drawn wider by parameters.approximateBandMarginNm).
 */
const bandSchema = z.strictObject({ ...feature, kind: z.literal('band'), fromNm: nm, toNm: nm, approximate: z.boolean() })

// The record sourceId covers the name and the formula. The hazards are merged in by the build from hazards.json.
const saltSchema = z.strictObject({
  id,
  name: text,
  formula: text,
  metal: z.strictObject({ symbol: text, name: text }),
  molarity: z.number().positive(),
  /** What the solution looks like in its bottle: the colour's name, and a colour to draw a coloured one in. */
  appearance: cited(z.strictObject({ name: text, hex: hex.optional() })),
  /** The colour of its flame on a clean loop: a name a learner chooses, and a colour to draw it in. */
  flame: cited(z.strictObject({ name: text, hex })).extend({ alsoSourceId: id.optional() }),
  /** What the spectroscope shows for it. */
  features: z.array(z.union([lineSchema, bandSchema])).min(1),
  /** What its sources say the flame also gives and the strip does not show, each said in a sentence. */
  leftOut: z.array(cited(text)),
  /** Shown once the station is done: what gives the light there. */
  notes: z.array(cited(text).extend({ alsoSourceId: id.optional() })).min(1),
  /** What the hazard statements classify, in the words of the heading over them (spec 5.2). */
  classifiedAs: text,
  hazards: hazardsSchema,
  sourceId: id,
})

export const flameSchema = z.strictObject({
  /** The ends of the spectroscope's scale. */
  scale: z.strictObject({ fromNm: nm, toNm: nm }),
  salts: z.array(saltSchema).min(1),
  /** The salt whose flame a loop gives when it has been handled and not cleaned: it carries a trace of sodium. */
  handling: cited(id).extend({ alsoSourceId: id.optional() }),
  /** The salt whose flame colour hides the colour of every other salt on the loop. */
  masking: cited(id),
  /** The closing question: what it can be answered with, and the answer. The wording is the app's. */
  closing: z.strictObject({ choices: z.array(id).min(2), answer: cited(id) }),
  parameters: z.strictObject({
    /** Whether the trace on a handled loop shows in the flame and the spectroscope. */
    handlingTraceShows: param(z.boolean()),
    /** Two lines of one salt closer than this are one feature. */
    unresolvedWithinNm: param(nm),
    /** How much wider on each side an approximate band is drawn than the positions its sources give. */
    approximateBandMarginNm: param(nm),
    /** The choices for where on the scale the brightest thing is: each from its first number up to its second. */
    ranges: param(z.array(z.tuple([nm, nm])).min(2)),
    /** What a flame with several salts and no sodium is called: the model's one rule. */
    mixedFlame: param(z.literal('every-colour-named')),
  }),
})

export type FlameData = z.infer<typeof flameSchema>
export type Salt = FlameData['salts'][number]
export type Feature = Salt['features'][number]
export type Range = FlameData['parameters']['ranges']['value'][number]

/** Where a feature is on the scale, as it is drawn: a line at its wavelength, with its partner's where it stands for a pair; a band between its limits, an approximate one wider by the margin on each side. */
export function extentOf(data: FlameData, feature: Feature): { fromNm: number; toNm: number } {
  if (feature.kind === 'line') {
    const all = [feature.wavelengthNm.value, ...(feature.pairedWithNm ? [feature.pairedWithNm.value] : [])]
    return { fromNm: Math.min(...all), toNm: Math.max(...all) }
  }
  const margin = feature.approximate ? data.parameters.approximateBandMarginNm.value : 0
  return { fromNm: feature.fromNm - margin, toNm: feature.toNm + margin }
}

/** The brightest of a salt's features: the one of rank 1. */
export const brightestOf = (salt: Salt): Feature => salt.features.find((feature) => feature.prominence === 1)!

/** The answer range a feature as drawn lies wholly inside, or undefined where it crosses from one into the next. */
export function rangeOf(data: FlameData, feature: Feature): Range | undefined {
  const { fromNm, toNm } = extentOf(data, feature)
  const ranges = data.parameters.ranges.value
  // A range runs from its first number up to its second; the last takes the end of the scale too.
  return ranges.find(([from, to], i) => fromNm >= from && (toNm < to || (i === ranges.length - 1 && toNm <= to)))
}

/** A range as an answer is stored: "600-650". */
export const rangeId = ([from, to]: Range): string => `${from}-${to}`

// flame.json is written by `npm run build:data` from docs/research/flame/, after holding it to its manifests of
// sources and to the saved NIST tables; edit the script or its inputs, not that file.
export const flameData: FlameData = flameSchema.parse(data)
