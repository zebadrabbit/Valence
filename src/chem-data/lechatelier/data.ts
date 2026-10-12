import { z } from 'zod'
import { cited, citedNumber, hazardsSchema, param } from '../schema'
import data from './lechatelier.json'

// The Le Chatelier's principle lab's record (spec 18): the ten bottles with their hazards; what each solid and
// each coloured thing is and looks like; the rules its tubes follow, each with its source; the Gibbs energies and
// the constants worked out from them; the enthalpies behind the heat that dissolving lead chloride takes in; the
// solubility of lead chloride cold and hot, and the product at saturation each gives; the indicator's range and
// looks; the five equilibria as written; the four systems, each with its tubes and its disturbances in order; and
// the model's parameters. A disturbance holds what is done, what its tube shows after each portion, what is asked
// and what is right, and the notes shown when it is done: the engine reads those and works nothing out, and the
// build holds what the numbers can decide to the numbers. It is its own file and is not part of the registry, so
// only the lab loads it. Like the other labs' schemas, this one keeps to the zod features schema.ts already uses.

const id = z.string().min(1)
const text = z.string().min(1)
const positive = z.number().positive()
const whole = z.number().int().min(0)

/** A citation that may rest on a second source and on more: `alsoSourceId`, then `moreSourceIds`. */
const also = { alsoSourceId: id.optional(), moreSourceIds: z.array(id).min(1).optional() }
const citedText = cited(text).extend(also)

/** A value worked out from cited ones, with the working shown. Exempt from citation (spec 5.1); the build works it out again. */
const workedOut = z.strictObject({ value: z.number(), unit: text, working: text })
/** A constant or a product worked out from cited values. `shown` is how a page writes it. */
const workedConstant = z.strictObject({ value: positive, shown: text, working: text })

// The record sourceId covers the name, the formula and the strength. The hazards are merged in by the build from
// the lab's hazards.json, which is written apart. The indicator has no formula and no molarity: the procedure read
// gives neither.
const reagentSchema = z.strictObject({
  id,
  name: text,
  formula: text.optional(),
  form: z.enum(['solution', 'indicator', 'solid']),
  /** mol/L. */
  molarity: positive.optional(),
  /** What the hazard statements classify, in the words of the heading over them (spec 5.2). */
  classifiedAs: text,
  hazards: hazardsSchema,
  sourceId: id,
})

/**
 * A solid or a coloured thing of the lab. Its name and formula say what it is, which a page shows only in the
 * equilibrium as written and in the notes of a disturbance that is done. `look` is what is seen of it: the colour
 * of a solid, or the colour a dissolved thing gives its liquid; absent for a dissolved thing with no colour.
 */
const substanceSchema = z.strictObject({ id, name: text, formula: text, state: z.enum(['s', 'aq']), look: citedText.optional(), sourceId: id })

/** A rule the tubes follow (spec 18.4), in a sentence, with its source. */
const ruleSchema = z.strictObject({ id, says: text, sourceId: id, ...also })

/** A standard Gibbs energy or enthalpy of formation at 298.15 K, in kJ/mol, as the table prints it. */
const tableRow = citedNumber(z.number()).extend({ id, label: text })

/**
 * A constant worked out from Gibbs energies: the change's own Gibbs energy is the sum of its terms (a product
 * counts +1 and a reactant −1 for each of it), and the constant is e^(−ΔG° ÷ RT).
 */
const constantSchema = z.strictObject({
  id,
  name: text,
  expression: text,
  terms: z.array(z.strictObject({ gibbsId: id, coefficient: z.number().int() })).min(2),
  gibbs: workedOut,
  constant: workedConstant,
})

/** The heat a change takes in, worked out from enthalpies of formation as a constant is from Gibbs energies. */
const heatSchema = z.strictObject({ id, name: text, equation: text, terms: z.array(z.strictObject({ enthalpyId: id, coefficient: z.number().int() })).min(2), enthalpy: workedOut })

const solubility = citedNumber(positive).extend({ unit: z.literal('g/L'), celsius: z.number() })

export const SIDES = ['left', 'right'] as const
const side = z.enum(SIDES)

/**
 * An equilibrium as the lab writes it, one way and kept that way (spec 18.2). `left` and `right` say what stands
 * on each side, with the colour that tells it. `seenBy` is how a shift is read off the tube: by a solid that
 * stands on one side, or by the colour of the liquid, one colour for each side and, where a source gives it, the
 * colour of a liquid that holds both, which lies between the two. `heat` is the side toward which
 * the change takes heat in, where a source gives it. `numbers` names the constants the build checks its tubes with.
 */
const equilibriumSchema = z.strictObject({
  id,
  equation: text,
  left: text,
  right: text,
  seenBy: z.union([z.strictObject({ kind: z.literal('solid'), side }), z.strictObject({ kind: z.literal('colour'), left: text, right: text, between: text.optional() })]),
  heat: z.strictObject({ takenInToward: side, heatId: id.optional(), sourceId: id }).optional(),
  numbers: z.strictObject({ solubilityProduct: id, withHydroxide: id.optional(), withAmmonia: id.optional() }).optional(),
  substanceIds: z.array(id).min(1),
  sourceId: id,
  ...also,
})

/** What a tube shows: the colour of its liquid and of its solid, in the words of `choices`. A stage that a stored observation decides carries the observation's source. */
const stageSchema = z.strictObject({ liquid: text, solid: text, sourceId: id.optional(), ...also })

/** The name of a parameter: the count of drops, of portions or of grams is stored there, with its rationale. */
const parameterName = id

const actionSchema = z.union([
  /** One portion of a reagent, or of water, goes in at each press: `drops` of it, `portions` times (once where no count is named). */
  z.strictObject({ kind: z.literal('add'), reagentId: id, drops: parameterName, portions: parameterName.optional() }),
  /** The tube stands in the bath of boiling water. */
  z.strictObject({ kind: z.literal('heat') }),
  /** The tube stands in the bath of ice water. */
  z.strictObject({ kind: z.literal('cool') }),
])

export const WAYS = ['left', 'right', 'none'] as const
export const CAUSES = ['hydroxide', 'ammonia', 'nothing'] as const

/** What a disturbance asks once its tube has been observed, and the right answer (spec 18.3): which way the equilibrium went, or what took the metal ion away. */
const askSchema = z.union([z.strictObject({ kind: z.literal('direction'), right: z.enum(WAYS) }), z.strictObject({ kind: z.literal('cause'), right: z.enum(CAUSES) })])

export const DISTURBANCE_IDS = [
  'lead-acid',
  'lead-heat',
  'lead-cool',
  'lead-water',
  'indicator-acid',
  'indicator-base',
  'cobalt-water',
  'cobalt-heat',
  'cobalt-cool',
  'zinc-drop',
  'zinc-acid',
  'zinc-base',
  'zinc-ammonia',
  'magnesium-drop',
  'magnesium-acid',
  'magnesium-base',
  'magnesium-ammonia',
] as const

export const TUBE_IDS = ['lead', 'indicator', 'cobalt', 'zinc', 'zinc-acid', 'zinc-base', 'zinc-ammonia', 'magnesium', 'magnesium-acid', 'magnesium-base', 'magnesium-ammonia'] as const

const disturbanceSchema = z.strictObject({
  id: z.enum(DISTURBANCE_IDS),
  name: text,
  /** The tube it is done in, and the equilibrium it disturbs. */
  tube: z.enum(TUBE_IDS),
  equilibriumId: id,
  action: actionSchema,
  /** What the tube shows after each portion, in order: one stage for a tube that is heated or cooled. */
  stages: z.array(stageSchema).min(1),
  ask: askSchema,
  /** The rules that say what the tube shows, and the constants the build checks it with: what its list of sources is drawn from. */
  ruleIds: z.array(id).min(1),
  constantIds: z.array(id),
  /** A second change that bears on the tube, as an equation; shown with the notes. */
  equations: z.array(citedText).min(1).optional(),
  /** Shown once the disturbance is done. They say what happened and why. */
  notes: z.array(citedText).min(1),
})

/** A tube: what goes into it to begin with and what it then shows, or the tube it takes a share of. */
const tubeSchema = z.union([
  z.strictObject({
    id: z.enum(TUBE_IDS),
    contents: z.array(z.union([z.strictObject({ reagentId: id, drops: parameterName }), z.strictObject({ reagentId: id, grams: parameterName })])).min(1),
    shows: stageSchema,
  }),
  z.strictObject({ id: z.enum(TUBE_IDS), shareOf: z.enum(TUBE_IDS) }),
])

export const SYSTEM_IDS = ['lead-chloride', 'methyl-violet', 'cobalt', 'hydroxides'] as const

const systemSchema = <Id extends string>(systemId: Id) =>
  z.strictObject({
    id: z.literal(systemId),
    name: text,
    /** Whether the build works what its tubes show out from the stored numbers, or each stage is a stored observation with its own source (spec 18.4). */
    heldBy: z.enum(['numbers', 'observation']),
    equilibriumIds: z.array(id).min(1),
    tubes: z.array(tubeSchema).min(1),
    /** In the order they are done, each from the state the one before it on its tube left. */
    disturbances: z.array(disturbanceSchema).min(1),
  })

export const lechatelierSchema = z.strictObject({
  reagents: z.array(reagentSchema).min(1),
  water: z.strictObject({ name: text, formula: text }),
  substances: z.array(substanceSchema).min(1),
  rules: z.array(ruleSchema).min(1),
  /** What an observation is recorded from: the colour of a solid, or none, and the colour of the liquid. */
  choices: z.strictObject({ solid: z.array(text).min(2), liquid: z.array(text).min(2) }),
  constants: z.strictObject({ gasConstant: cited(positive).extend({ unit: text }) }),
  gibbs: z.array(tableRow).min(1),
  equilibriumConstants: z.array(constantSchema).min(1),
  enthalpies: z.array(tableRow).min(1),
  heats: z.array(heatSchema).min(1),
  /**
   * The solubility of lead chloride in cold and in hot water as its source prints it, and, worked out from each
   * and from the molar mass, the product of the lead and the square of the chloride in a saturated solution: the
   * two numbers the build decides the first system's tubes by.
   */
  leadChloride: z.strictObject({
    atomicWeights: z.array(citedNumber(positive).extend({ id })).min(2),
    molarMass: workedOut,
    solubilityCold: solubility,
    solubilityHot: solubility,
    saturationCold: workedConstant,
    saturationHot: workedConstant,
    note: citedText,
  }),
  /** Methyl violet: the ends of its range as its source prints them, and its three looks. */
  indicator: z.strictObject({
    reagentId: id,
    range: z.strictObject({ from: citedNumber(z.number()), to: citedNumber(z.number()) }),
    looks: z.strictObject({ below: citedText, within: citedText, noAcid: citedText }),
    note: citedText,
  }),
  equilibria: z.array(equilibriumSchema).min(1),
  systems: z.tuple([systemSchema('lead-chloride'), systemSchema('methyl-violet'), systemSchema('cobalt'), systemSchema('hydroxides')]),
  parameters: z.strictObject({
    temperatureKelvin: param(positive),
    dropMicrolitres: param(whole),
    boilingBathCelsius: param(positive),
    coldCelsius: param(positive),
    clearOfEdge: param(positive),
    completeWithinPercent: param(positive),
    leadNitrateDrops: param(whole),
    leadAcidDrops: param(whole),
    leadAcidPortions: param(whole),
    leadWaterDrops: param(whole),
    indicatorWaterDrops: param(whole),
    indicatorDrops: param(whole),
    indicatorPortionDrops: param(whole),
    indicatorPortions: param(whole),
    cobaltChlorideGrams: param(positive),
    cobaltAcidDrops: param(whole),
    cobaltWaterDrops: param(whole),
    metalNitrateDrops: param(whole),
    firstBaseDrops: param(whole),
    shareDrops: param(whole),
    hydroxideAcidDrops: param(whole),
    excessBaseDrops: param(whole),
    ammoniaDrops: param(whole),
  }),
})

export type LechatelierData = z.infer<typeof lechatelierSchema>
export type Reagent = LechatelierData['reagents'][number]
export type Substance = LechatelierData['substances'][number]
export type Equilibrium = LechatelierData['equilibria'][number]
export type System = LechatelierData['systems'][number]
export type SystemId = (typeof SYSTEM_IDS)[number]
export type Disturbance = System['disturbances'][number]
export type DisturbanceId = (typeof DISTURBANCE_IDS)[number]
export type TubeId = (typeof TUBE_IDS)[number]
export type Tube = System['tubes'][number]
export type Stage = Disturbance['stages'][number]
export type Side = (typeof SIDES)[number]
export type Way = (typeof WAYS)[number]
export type Cause = (typeof CAUSES)[number]
export type ParameterName = keyof LechatelierData['parameters']

/** A system of the record by its id. */
export function systemOf(data: LechatelierData, systemId: SystemId): System {
  const system = data.systems.find((s) => s.id === systemId)
  if (!system) throw new Error(`no system "${systemId}"`)
  return system
}

/** A disturbance of the record by its id, with the system it belongs to. */
export function disturbanceOf(data: LechatelierData, disturbanceId: DisturbanceId): { system: System; disturbance: Disturbance } {
  for (const system of data.systems) {
    const disturbance = system.disturbances.find((d) => d.id === disturbanceId)
    if (disturbance) return { system, disturbance }
  }
  throw new Error(`no disturbance "${disturbanceId}"`)
}

/** The equilibrium a disturbance disturbs. */
export function equilibriumOf(data: LechatelierData, disturbanceId: DisturbanceId): Equilibrium {
  const { disturbance } = disturbanceOf(data, disturbanceId)
  const equilibrium = data.equilibria.find((e) => e.id === disturbance.equilibriumId)
  if (!equilibrium) throw new Error(`no equilibrium "${disturbance.equilibriumId}"`)
  return equilibrium
}

/** The value of a parameter by its name, as an action or a tube names it. */
export function parameterOf(data: LechatelierData, name: string): number {
  const parameter = (data.parameters as Record<string, { value: number } | undefined>)[name]
  if (!parameter) throw new Error(`no parameter "${name}"`)
  return parameter.value
}

/** The bottle a disturbance adds from, or undefined: water is not a bottle of the record, and a bath is no bottle. */
export const reagentOf = (data: LechatelierData, disturbanceId: DisturbanceId): Reagent | undefined => {
  const { action } = disturbanceOf(data, disturbanceId).disturbance
  return action.kind === 'add' ? data.reagents.find((r) => r.id === action.reagentId) : undefined
}

// lechatelier.json is written by `npm run build:data` from docs/research/lechatelier/, after holding it to its
// manifests of sources, working its worked-out values out again and checking what its tubes show against its
// numbers; edit the script or its inputs, not that file.
export const lechatelierData: LechatelierData = lechatelierSchema.parse(data)
