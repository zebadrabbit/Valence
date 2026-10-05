import { z } from 'zod'
import { citedNumber, hazardsSchema, param } from '../schema'
import data from './titration.json'

// The titration lab's record (spec 7): three bottles, the cited constants of the flask model, and the model's
// parameters, each with its rationale. It is its own file and is not part of the registry, so only the lab loads it.
// Like the periodic table's, this schema keeps to the zod features schema.ts already uses.

const text = z.string().min(1)

/**
 * A cited number with its unit: `published` is the text the source prints for it, where that is a plain decimal,
 * and `note` a caveat about it. The unit is empty for a number that has none.
 */
const constant = citedNumber(z.number()).extend({ unit: z.string(), note: text.optional() })

/** What a bottle's tile shows. `classifiedAs` names what the hazard statements classify, in the words of the tile's heading. */
const bottle = z.strictObject({
  name: text,
  formula: text,
  pubchemCid: z.number().int().positive(),
  classifiedAs: text,
  hazards: hazardsSchema,
})

// Whole numbers: microlitres, percent, seconds, a count, or a molarity in units of its last digit (E4, E5, E6).
const whole = z.number().int().min(0)
const range = z.tuple([whole, whole])
const positive = z.number().positive()

export const titrationSchema = z.strictObject({
  bottles: z.strictObject({ hcl: bottle, naoh: bottle, indicator: bottle }),
  constants: z.strictObject({
    waterIonProduct: constant,
    /** Most acidic first. */
    indicatorPKas: z.array(constant).min(1),
    indicatorMolarMass: constant,
    indicatorStrength: constant,
    indicatorDropVolume: constant,
    henryCo2: constant,
    /** A figure for one year. */
    atmosphericCo2: constant.extend({ year: z.number().int() }),
    /** Most acidic first. */
    carbonicPKas: z.array(constant).min(1),
  }),
  parameters: z.strictObject({
    faintPinkConcentration: param(positive),
    hclRangeE4: param(range),
    naohRangeE5: param(range),
    pipetteNominalUl: param(whole),
    pipetteOffsetUl: param(whole),
    fillLevelMaxUl: param(whole),
    buretteCapacityUl: param(whole),
    streamUl: param(whole),
    dropUl: param(whole),
    halfDropUl: param(whole),
    unconditionedStrengthPercent: param(whole),
    wetPipetteStrengthPercent: param(whole),
    tipBubbleUl: param(whole),
    tipBubbleEscapeUl: param(whole),
    overshootUl: param(whole),
    slowDownUl: param(whole),
    readingToleranceUl: param(whole),
    gradeTolerancePercent: param(whole),
    molarityRoundingE6: param(whole),
    waterStepUl: param(whole),
    waterMaxUl: param(whole),
    indicatorDrops: param(range),
    plumeSlowFrom: param(positive),
    plumeMixSeconds: param(positive),
    persistSeconds: param(whole),
    passesToComplete: param(whole),
    airPressureBar: param(positive),
    pinkDisplayScale: param(positive),
    faintPinkNameLimit: param(positive),
  }),
})

export type TitrationData = z.infer<typeof titrationSchema>

// titration.json is written by `npm run build:data` from docs/research/phase-3/titration.json, after checking it
// against the saved copies of its sources; edit the script or its inputs, not that file.
export const titrationData: TitrationData = titrationSchema.parse(data)
