import { z } from 'zod'

const id = z.string().min(1)
const text = z.string().min(1)

/** An individually cited value: `{ value, sourceId }`. */
export const cited = <T extends z.ZodType>(value: T) => z.strictObject({ value, sourceId: id })

/**
 * A cited number with `published`, the text the source prints for it, which keeps the source's
 * digits ("1.0080", "2.020"). Absent where the source prints no figure for the value.
 */
export const citedNumber = <T extends z.ZodNumber>(value: T) => cited(value).extend({ published: text.optional() })

/** A model parameter, exempt from citation: `{ value, rationale }`. */
export const param = <T extends z.ZodType>(value: T) => z.strictObject({ value, rationale: text })

export const sourceSchema = z.strictObject({
  id,
  url: z.string().regex(/^https?:\/\//, 'must be an http(s) URL'),
  citation: text,
})

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/)

const state = z.enum(['aq', 's', 'l', 'g'])
/** An ion of a compound, and how many of it one formula unit holds. */
const counted = z.strictObject({ speciesId: id, ratio: z.number().int().positive() })

// The record sourceId covers the formula, the composition, the charge and the state.
export const speciesSchema = z.strictObject({
  id,
  formula: text,
  /**
   * What the species is called, where a page says its name: an ion as it is said before the word "ion"
   * ("iron(III)", "chloride"), a molecule by its own name ("water"). Cited on its own.
   */
  name: cited(text).optional(),
  composition: z.record(z.string(), z.number().int().positive()),
  charge: z.number().int(),
  state,
  /** Every state a learner's equation may give this species, where that is more than the one above: ammonia leaves as a gas and is also in solution. */
  acceptedStates: z.array(state).min(2).optional(),
  solutionColor: cited(z.strictObject({ name: text, hex })).optional(),
  /** Standard enthalpy of formation at 298.15 K in kJ/mol, where a model needs it (spec 5.3). */
  enthalpyOfFormation: citedNumber(z.number()).optional(),
  /** For a dissolved strong electrolyte written as one formula: the ions an ionic equation splits it into. */
  ions: z.array(counted).min(2).optional(),
  sourceId: id,
})

// The record sourceId covers the signal word and the statements, which are one GHS classification.
export const hazardsSchema = z.strictObject({
  signalWord: z.enum(['Danger', 'Warning', 'None']),
  statements: z.array(text),
  /**
   * What holds at the strength used, which the classification need not describe. Cited on its own. A note that
   * rests on two sources (two data sheets that between them cover the strength) names the second in `alsoSourceId`.
   */
  note: cited(text).extend({ alsoSourceId: id.optional() }),
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
    molarMass: citedNumber(z.number().positive()).optional(),
    appearance: cited(text).optional(),
    ions: z.array(counted),
    /** The species this reagent is in a molecular equation: the dissolved compound, the solid or the metal. */
    speciesId: id.optional(),
    /** What the hazard statements classify, in the words of the heading over them (spec 5.2). */
    classifiedAs: text.optional(),
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

// One source for the row, or two where the colour is read in one place and the texture or the odour in another.
export const observationSchema = z.strictObject({
  productId: id,
  color: text,
  texture: text.optional(),
  odor: text.optional(),
  sourceId: id,
  alsoSourceId: id.optional(),
})

const amountSchema = z.strictObject({ value: z.number().positive(), unit: z.enum(['mL', 'g']) })

/** One side of an equation: each species once, with its coefficient. The state is the species' own. */
const side = z.array(z.strictObject({ speciesId: id, coefficient: z.number().int().positive() })).min(1)
/** A curated equation, or null where there is none to write: the station where nothing reacts (spec 5.3). */
const equation = z.strictObject({ reactants: side, products: side }).nullable()
const litmus = z.enum(['stays red', 'turns blue'])

export const stationSchema = z.strictObject({
  id,
  name: text,
  reagentIds: z.tuple([id, id]),
  amounts: z.tuple([amountSchema, amountSchema]),
  observationTools: z.array(z.enum(['eye', 'waft', 'litmus', 'touch', 'thermometer', 'splint'])).min(1),
  equations: z.strictObject({ molecular: equation, completeIonic: equation, netIonic: equation }),
  /** The test oracle (spec 8.2): what the engine must work out, and what a correct observation records. */
  expected: z.strictObject({
    precipitate: id.nullable(),
    precipitateColor: text.nullable(),
    gas: id.nullable(),
    /** Whether the gas is seen to bubble out of the liquid. */
    bubbles: z.boolean(),
    temperature: z.enum(['none', 'warm', 'hot']),
    liquidColor: text,
    /** The coloured ions still dissolved, which give the liquid its colour. */
    colouredIons: z.array(id),
    odor: text.nullable(),
    /** What a tool shows that the fields above do not hold: litmus in each of its two positions, and the lit splint. */
    toolResults: z.strictObject({ litmusInLiquid: litmus.optional(), litmusInVapour: litmus.optional(), splint: z.enum(['pop', 'no change']).optional() }),
  }),
  /** The species a learner builds this station's equations from: those of the curated equations, and distractors. */
  paletteSpecies: z.array(id).min(1),
  hints: z.array(text),
  notes: z.array(cited(text).extend({ alsoSourceId: id.optional() })),
})

// The record sourceId covers symbol, name and atomic number. Radii are in Å.
export const elementSchema = z.strictObject({
  symbol: text,
  name: text,
  atomicNumber: z.number().int().positive(),
  atomicWeight: citedNumber(z.number().positive()),
  /** `note` is a caveat about this value, shown with it. */
  electronegativity: citedNumber(z.number().positive()).extend({ note: text.optional() }),
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
  /**
   * Emission lines of the isolated atom in a discharge lamp: wavelengths in nm, in air, longest first.
   * `selection` says which of the source's lines were chosen. `note` is shown under the strip, where the strip
   * cannot show what the table does. Present only for the elements whose card shows a spectrum.
   */
  emission: z
    .strictObject({
      selection: text,
      note: text.optional(),
      lines: z.array(citedNumber(z.number().positive()).extend({ transition: text.optional() })).min(1),
    })
    .optional(),
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
// `symmetry` is the molecule's point group, as its source states it, on a value the point group fixes: the 120° of
// BF3 and of PCl5. The source may print a figure for such a value all the same (BF3) or none (PCl5, which then
// has no `published`).
const measurement = <T extends z.ZodType>(atoms: T, value: z.ZodNumber) =>
  z.array(citedNumber(value).extend({ atoms, symmetry: text.optional() }))
const measurementsSchema = z.strictObject({
  /** Å between atoms [a, b]. */
  lengths: measurement(z.tuple([atomIndex, atomIndex]), z.number().positive()),
  /** Degrees at the middle atom of [a, vertex, c]. */
  angles: measurement(z.tuple([atomIndex, atomIndex, atomIndex]), z.number()),
  /** Signed degrees about the b-c axis of [a, b, c, d]. */
  dihedrals: measurement(z.tuple([atomIndex, atomIndex, atomIndex, atomIndex]), z.number()),
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
  /** What the diagram shows that the molecule's Lewis structure does not; covered by the record's source. */
  callout: text.optional(),
  sourceId: id,
})

// The periodic table: 118 records built by script from saved downloads (periodic table spec 5.7).
// It is its own file and is not part of the registry, so the app shell does not load it.
// zod itself sits in a chunk the app shell preloads, so this schema keeps to the zod features the
// registry already uses: z.discriminatedUnion and .length() would each add to that chunk.

/** The unit each quantity is stored in. Electronegativity (Pauling scale) is the only one with none. */
export const PERIODIC_UNITS = {
  atomicMass: 'u',
  electronegativity: '',
  covalentRadius: 'pm',
  vdwRadius: 'pm',
  ionizationEnergy: 'eV',
  electronAffinity: 'eV',
  meltingPoint: 'K',
  boilingPoint: 'K',
  density: 'g/cm³',
} as const

/** A number with `published`, the source's own text for it, its unit and its source. */
const quantity = <K extends keyof typeof PERIODIC_UNITS>(field: K) =>
  z.strictObject({ value: z.number().positive(), published: text, unit: z.literal(PERIODIC_UNITS[field]), sourceId: id })

/**
 * A stored electron configuration: an optional noble-gas core, with or without one space after it, then subshells
 * separated by single spaces. No marking: "(predicted)" and "(calculated)" are stored in the qualifier.
 * scripts/periodic-table-lib.mjs checks the build's input against the same pattern; a test compares the two.
 */
export const CONFIGURATION_TEXT = /^(\[[A-Z][a-z]\] ?)?\d[spdf]\d{1,2}( \d[spdf]\d{1,2})*$/

// The rows of the element card a note can qualify: the fields below, by name.
const NOTE_ROWS = [
  'category',
  'configuration',
  'standardState',
  'oxidationStates',
  'yearDiscovered',
  'atomicMass',
  'electronegativity',
  'covalentRadius',
  'vdwRadius',
  'ionizationEnergy',
  'electronAffinity',
  'meltingPoint',
  'boilingPoint',
  'density',
] as const

// The record sourceId covers atomic number, symbol, name, category, configuration, state, oxidation states and year.
export const periodicElementSchema = z.strictObject({
  atomicNumber: z.number().int().positive(),
  symbol: z.string().regex(/^[A-Z][a-z]?$/),
  name: text,
  /** PubChem's ten categories, as given. */
  category: z.enum([
    'Alkali metal',
    'Alkaline earth metal',
    'Transition metal',
    'Post-transition metal',
    'Metalloid',
    'Nonmetal',
    'Halogen',
    'Noble gas',
    'Lanthanide',
    'Actinide',
  ]),
  /** As published, with the source's "(predicted)" or "(calculated)" marking moved into `qualifier`. */
  configuration: z.strictObject({ text: z.string().regex(CONFIGURATION_TEXT), qualifier: z.enum(['predicted', 'calculated']).optional() }),
  /** `expected` where the source words it "Expected to be a ...". */
  standardState: z.strictObject({ state: z.enum(['Solid', 'Liquid', 'Gas']), expected: z.boolean() }),
  /** As published: signs, spacing and order are the source's. */
  oxidationStates: text.optional(),
  yearDiscovered: z.union([z.number().int().positive(), z.literal('Ancient')]),
  /** A standard atomic weight, or for an element that has none the mass of the one isotope the source prints. */
  atomicMass: z.union([
    quantity('atomicMass').extend({ kind: z.literal('standard-atomic-weight') }),
    quantity('atomicMass').extend({ kind: z.literal('isotope-mass'), massNumber: z.number().int().positive(), estimated: z.boolean() }),
  ]),
  /** Pauling scale. */
  electronegativity: quantity('electronegativity').optional(),
  covalentRadius: quantity('covalentRadius').optional(),
  vdwRadius: quantity('vdwRadius').optional(),
  electronAffinity: quantity('electronAffinity').optional(),
  /** First ionization energy, with NIST's marking of how the value was obtained. */
  ionizationEnergy: quantity('ionizationEnergy')
    .extend({ flag: z.enum(['measured', 'semi-empirical', 'theoretical']) })
    .optional(),
  meltingPoint: quantity('meltingPoint').optional(),
  boilingPoint: quantity('boilingPoint').optional(),
  density: quantity('density').optional(),
  /** Authored sentences, each tied to the card row it qualifies. Written in docs/research/periodic-table/decisions.json. */
  notes: z
    .array(z.strictObject({ row: z.enum(NOTE_ROWS), text, sourceId: id }))
    .min(1)
    .optional(),
  sourceId: id,
})

export const periodicTableSchema = z.array(periodicElementSchema)

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
export type Hazards = z.infer<typeof hazardsSchema>
export type Reagent = z.infer<typeof reagentSchema>
export type Observation = z.infer<typeof observationSchema>
export type Station = z.infer<typeof stationSchema>
export type Element = z.infer<typeof elementSchema>
export type Molecule = z.infer<typeof moleculeSchema>
export type MoDiagram = z.infer<typeof moDiagramSchema>
export type Registry = z.infer<typeof registrySchema>
export type PeriodicElement = z.infer<typeof periodicElementSchema>
export type Quantity = { value: number; published: string; unit: string; sourceId: string }
