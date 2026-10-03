import { z } from 'zod'

const id = z.string().min(1)
const text = z.string().min(1)

/** An individually cited value: `{ value, sourceId }`. */
export const cited = <T extends z.ZodType>(value: T) => z.strictObject({ value, sourceId: id })

/** A model parameter, exempt from citation: `{ value, rationale }`. */
export const param = <T extends z.ZodType>(value: T) => z.strictObject({ value, rationale: text })

export const sourceSchema = z.strictObject({
  id,
  url: z.string().regex(/^https?:\/\//, 'must be an http(s) URL'),
  citation: text,
})

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/)

export const speciesSchema = z.strictObject({
  id,
  formula: text,
  composition: z.record(z.string(), z.number().int().positive()),
  charge: z.number().int(),
  state: z.enum(['aq', 's', 'l', 'g']),
  solutionColor: cited(z.strictObject({ name: text, hex })).optional(),
  sourceId: id,
})

const hazardsSchema = z.strictObject({
  signalWord: z.enum(['Danger', 'Warning', 'None']),
  statements: z.array(text),
  note: text,
  sourceId: id,
})

export const reagentSchema = z
  .strictObject({
    id,
    name: text,
    formula: text,
    pubchemCid: z.number().int().positive(),
    form: z.enum(['solution', 'solid', 'metal']),
    molarity: z.number().positive().optional(),
    molarMass: cited(z.number().positive()).optional(),
    appearance: cited(text).optional(),
    ions: z.array(z.strictObject({ speciesId: id, ratio: z.number().int().positive() })),
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

export const observationSchema = z.strictObject({
  productId: id,
  color: text,
  texture: text.optional(),
  odor: text.optional(),
  sourceId: id,
})

const amountSchema = z.strictObject({ value: z.number().positive(), unit: z.enum(['mL', 'g']) })

export const stationSchema = z.strictObject({
  id,
  reagentIds: z.tuple([id, id]),
  amounts: z.tuple([amountSchema, amountSchema]),
  observationTools: z.array(z.enum(['eye', 'waft', 'litmus', 'touch', 'thermometer', 'splint'])).min(1),
  expected: z.strictObject({
    precipitate: id.nullable(),
    gas: id.nullable(),
    temperature: z.enum(['none', 'warm', 'hot']),
    liquidColor: text,
    odor: text.nullable(),
  }),
  notes: z.array(text),
})

// The record sourceId covers symbol, name and atomic number. Radii are in Å.
export const elementSchema = z.strictObject({
  symbol: text,
  name: text,
  atomicNumber: z.number().int().positive(),
  /** `published` is the weight as the source prints it, with its trailing zeros ("1.0080"). */
  atomicWeight: cited(z.number().positive()).extend({ published: text.optional() }),
  electronegativity: cited(z.number().positive()),
  configuration: cited(text),
  /** Electrons per shell, innermost first. */
  shells: cited(z.array(z.number().int().positive()).min(1)),
  /** First, second, ... ionization energies in eV, as published. */
  ionizationEnergiesEv: cited(z.array(z.number().positive()).min(1)),
  covalentRadius: cited(z.number().positive()),
  vdwRadius: cited(z.number().positive()),
  ionicRadii: z.array(
    z.strictObject({
      charge: z.number().int(),
      coordination: z.number().int().positive(),
      value: z.number().positive(),
      sourceId: id,
    }),
  ),
  color: cited(hex),
  notes: z.array(text).optional(),
  sourceId: id,
})

const atomSchema = z.strictObject({
  element: text,
  position: z.tuple([z.number(), z.number(), z.number()]),
  position2d: z.tuple([z.number(), z.number()]),
  formalCharge: z.number().int(),
  lonePairs: z.number().int().min(0),
})

const bondSchema = z.strictObject({
  a: z.number().int().min(0),
  b: z.number().int().min(0),
  order: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  aromatic: z.boolean(),
  resonanceNote: text.optional(),
})

const atomIndex = z.number().int().min(0)

// Cited experimental values. Every symmetry-equivalent atom set is its own
// entry, so the validator checks each one against the stored coordinates.
const measurementsSchema = z.strictObject({
  /** Å between atoms [a, b]. */
  lengths: z.array(z.strictObject({ atoms: z.tuple([atomIndex, atomIndex]), value: z.number().positive(), sourceId: id })),
  /** Degrees at the middle atom of [a, vertex, c]. */
  angles: z.array(
    z.strictObject({ atoms: z.tuple([atomIndex, atomIndex, atomIndex]), value: z.number(), sourceId: id }),
  ),
  /** Signed degrees about the b-c axis of [a, b, c, d]. */
  dihedrals: z.array(
    z.strictObject({ atoms: z.tuple([atomIndex, atomIndex, atomIndex, atomIndex]), value: z.number(), sourceId: id }),
  ),
})

export const moleculeSchema = z.strictObject({
  id,
  name: text,
  /** Authored, as a textbook writes it, in plain digits and without the charge: "NH3". */
  formula: text,
  /**
   * Authored, for a species whose net charge hides charges inside it (a zwitterion): the formula
   * with a "+" or "-" after each charged group, as in "CH3CH(NH3+)COO-". Shown in place of `formula`.
   */
  displayFormula: z
    .string()
    .regex(/[+-]/)
    .optional(),
  pubchemCid: z.number().int().positive(),
  topic: z.enum(['basics', 'vsepr', 'organic', 'biomolecules', 'mechanism']),
  variantGroup: id.optional(),
  variantLabel: text.optional(),
  /** Net charge of the species. */
  charge: z.number().int(),
  atoms: z.array(atomSchema).min(1),
  bonds: z.array(bondSchema),
  geometrySource: z.enum(['pubchem-computed', 'cited-experimental']),
  measurements: measurementsSchema.optional(),
  notes: z.array(text).optional(),
  sourceId: id,
})

// Valence molecular orbitals only (spec 5.3, 6.4).
export const moDiagramSchema = z.strictObject({
  moleculeId: id,
  /** Lowest energy first. */
  levels: z
    .array(
      z.strictObject({
        label: text,
        /** Number of orbitals at this energy. */
        degeneracy: z.number().int().positive(),
        electrons: z.number().int().min(0),
        type: z.enum(['bonding', 'antibonding']),
      }),
    )
    .min(1),
  sourceId: id,
})

export const registrySchema = z.strictObject({
  sources: z.array(sourceSchema),
  species: z.array(speciesSchema),
  reagents: z.array(reagentSchema),
  observations: z.array(observationSchema),
  stations: z.array(stationSchema),
  elements: z.array(elementSchema),
  molecules: z.array(moleculeSchema),
  moDiagrams: z.array(moDiagramSchema),
})

export type Source = z.infer<typeof sourceSchema>
export type Species = z.infer<typeof speciesSchema>
export type Reagent = z.infer<typeof reagentSchema>
export type Observation = z.infer<typeof observationSchema>
export type Station = z.infer<typeof stationSchema>
export type Element = z.infer<typeof elementSchema>
export type Molecule = z.infer<typeof moleculeSchema>
export type MoDiagram = z.infer<typeof moDiagramSchema>
export type Registry = z.infer<typeof registrySchema>
