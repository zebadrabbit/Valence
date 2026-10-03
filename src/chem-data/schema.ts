import { z } from 'zod'

const id = z.string().min(1)
const text = z.string().min(1)

/** An individually cited value: `{ value, sourceId }`. */
export const cited = <T extends z.ZodType>(value: T) => z.object({ value, sourceId: id })

/** A model parameter, exempt from citation: `{ value, rationale }`. */
export const param = <T extends z.ZodType>(value: T) => z.object({ value, rationale: text })

export const sourceSchema = z.object({
  id,
  url: z.string().regex(/^https?:\/\//, 'must be an http(s) URL'),
  citation: text,
})

export const speciesSchema = z.object({
  id,
  formula: text,
  composition: z.record(z.string(), z.number().int().positive()),
  charge: z.number().int(),
  state: z.enum(['aq', 's', 'l', 'g']),
  solutionColor: cited(z.object({ name: text, hex: z.string().regex(/^#[0-9a-fA-F]{6}$/) })).optional(),
  sourceId: id,
})

const hazardsSchema = z.object({
  signalWord: z.enum(['Danger', 'Warning', 'None']),
  statements: z.array(text),
  note: text,
  sourceId: id,
})

export const reagentSchema = z
  .object({
    id,
    name: text,
    formula: text,
    pubchemCid: z.number().int().positive(),
    form: z.enum(['solution', 'solid', 'metal']),
    molarity: z.number().positive().optional(),
    molarMass: cited(z.number().positive()).optional(),
    appearance: cited(text).optional(),
    ions: z.array(z.object({ speciesId: id, ratio: z.number().int().positive() })),
    hazards: hazardsSchema,
    sourceId: id,
  })
  .superRefine((reagent, ctx) => {
    if (reagent.form === 'solution') {
      if (reagent.molarity === undefined) {
        ctx.addIssue({ code: 'custom', path: ['molarity'], message: 'a solution needs a molarity' })
      }
      return
    }
    if (reagent.molarMass === undefined) {
      ctx.addIssue({ code: 'custom', path: ['molarMass'], message: 'a solid or metal needs a molar mass' })
    }
    if (reagent.appearance === undefined) {
      ctx.addIssue({ code: 'custom', path: ['appearance'], message: 'a solid or metal needs an appearance' })
    }
  })

export const observationSchema = z.object({
  productId: id,
  color: text,
  texture: text.optional(),
  odor: text.optional(),
  sourceId: id,
})

const amountSchema = z.object({ value: z.number().positive(), unit: z.enum(['mL', 'g']) })

export const stationSchema = z.object({
  id,
  reagentIds: z.tuple([id, id]),
  amounts: z.tuple([amountSchema, amountSchema]),
  observationTools: z.array(z.enum(['eye', 'waft', 'litmus', 'touch', 'thermometer', 'splint'])).min(1),
  expected: z.object({
    precipitate: id.nullable(),
    gas: id.nullable(),
    temperature: z.enum(['none', 'warm', 'hot']),
    liquidColor: text,
    odor: text.nullable(),
  }),
  notes: z.array(text),
})

const atomSchema = z.object({
  element: text,
  position: z.tuple([z.number(), z.number(), z.number()]),
  position2d: z.tuple([z.number(), z.number()]),
  formalCharge: z.number().int(),
  lonePairs: z.number().int().min(0),
})

const bondSchema = z.object({
  a: z.number().int().min(0),
  b: z.number().int().min(0),
  order: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  aromatic: z.boolean(),
  resonanceNote: text.optional(),
})

export const moleculeSchema = z.object({
  id,
  name: text,
  pubchemCid: z.number().int().positive(),
  topic: z.enum(['basics', 'vsepr', 'organic', 'biomolecules', 'mechanism']),
  variantGroup: id.optional(),
  variantLabel: text.optional(),
  atoms: z.array(atomSchema).min(1),
  bonds: z.array(bondSchema),
  geometrySource: z.enum(['pubchem-computed', 'ideal-vsepr', 'cited-experimental']),
  sourceId: id,
})

export const registrySchema = z.object({
  sources: z.array(sourceSchema),
  species: z.array(speciesSchema),
  reagents: z.array(reagentSchema),
  observations: z.array(observationSchema),
  stations: z.array(stationSchema),
  molecules: z.array(moleculeSchema),
})

export type Source = z.infer<typeof sourceSchema>
export type Species = z.infer<typeof speciesSchema>
export type Reagent = z.infer<typeof reagentSchema>
export type Observation = z.infer<typeof observationSchema>
export type Station = z.infer<typeof stationSchema>
export type Molecule = z.infer<typeof moleculeSchema>
export type Registry = z.infer<typeof registrySchema>
