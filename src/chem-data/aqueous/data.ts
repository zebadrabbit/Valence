import { z } from 'zod'
import { cited, citedNumber, observationSchema, param, reagentSchema, speciesSchema, stationSchema } from '../schema'
import data from './aqueous.json'

// The aqueous reactions lab's record (spec 8): the species, the fifteen reagents with their hazards, the solubility
// of each pair of ions the ten stations can bring together, the activity series, the observation rows, what the
// temperature rise is worked out with, the choices an observation is recorded from, two cautions and the ten
// stations. It is its own file and is not part of the registry, so only the lab loads it. Like the titration
// lab's, this schema keeps to the zod features schema.ts already uses.

const id = z.string().min(1)
const text = z.string().min(1)

/** A cited number with its unit and a caveat about it; `published` is the text its source prints, where that is the stored number. */
const constant = citedNumber(z.number().positive()).extend({ unit: text, note: text.optional() })

export const aqueousSchema = z.strictObject({
  species: z.array(speciesSchema).min(1),
  reagents: z.array(reagentSchema).min(1),
  /** One row for each pair of a positive and a negative ion: whether their compound dissolves, and the solid it is where it does not. */
  solubility: z.array(z.strictObject({ cationId: id, anionId: id, soluble: z.boolean(), precipitateId: id.optional(), sourceId: id })),
  /** The metals of this lab and whether each stands above hydrogen, so that it gives hydrogen gas with an acid. Only the entries the lab uses. */
  activitySeries: z.array(z.strictObject({ metalId: id, ionId: id, aboveHydrogen: z.boolean(), sourceId: id })),
  observations: z.array(observationSchema),
  /** The heat capacity and the density every mixed solution is given: water's (spec 5.2), so the rise is idealised. */
  constants: z.strictObject({ solutionHeatCapacity: constant, solutionDensity: constant }),
  /** The computed rise, in °C, from which a tube is recorded as warm and as hot. */
  parameters: z.strictObject({ warmFromC: param(z.number().positive()), hotFromC: param(z.number().positive()) }),
  /** What a learner chooses from when recording what is seen and smelt. Every expected value is among them. */
  choices: z.strictObject({ solid: z.array(text).min(2), liquid: z.array(text).min(2), odor: z.array(text).min(2) }),
  /** What is said when a learner goes to smell a tube directly, and beside the touch tool at a tube that is hot. */
  cautions: z.strictObject({ sniffing: cited(text), hotTube: cited(text).extend({ alsoSourceId: id.optional() }) }),
  stations: z.array(stationSchema).min(1),
})

export type AqueousData = z.infer<typeof aqueousSchema>

// aqueous.json is written by `npm run build:data` from docs/research/phase-4/, after holding it to its manifests of
// sources; edit the script or its inputs, not that file.
export const aqueousData: AqueousData = aqueousSchema.parse(data)
