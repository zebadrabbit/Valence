import { z } from 'zod'
import { cited, citedNumber, param } from '@/chem-data/schema'

// A mechanism timeline's record (spec 9.1): the actors, the chapters in track order, a keyframe at every step
// boundary and wherever a step needs one between, and the cited values its energies are worked out from. The
// record is written by `npm run build:data` from docs/research/phase-5/. Like the labs' schemas, this one keeps
// to the zod features src/chem-data/schema.ts already uses.

const id = z.string().min(1)
const text = z.string().min(1)
const vec3 = z.tuple([z.number(), z.number(), z.number()])
const pair = z.tuple([id, id])
const order = z.union([z.literal(1), z.literal(2), z.literal(3)])

/** The names of the easings a move between two keyframes may have. `state` knows each by name. */
export const EASING_NAMES = ['linear', 'easeInOut'] as const

/** Where a pair of electrons is before or after a step: on one atom as a lone pair, or between two as a bond. */
const site = z.union([z.strictObject({ lonePair: id }), z.strictObject({ bond: pair })])

/**
 * An energy in kJ/mol at standard state. `basis` says whether it is worked out directly from values its sources
 * print (cited) or by a further step of this project's own (derived); `method` says how, and `sourceIds` from
 * what. An enthalpy that `covers` two steps is the one change the enthalpy curve shows for both (spec 9.2).
 */
const energy = z.strictObject({
  value: z.number(),
  basis: z.enum(['cited', 'derived']),
  method: z.enum(['formation', 'acid-constant', 'remainder', 'eyring']),
  sourceIds: z.array(id).min(1),
  covers: z.array(id).min(2).optional(),
})

const question = z
  .strictObject({
    id,
    prompt: text,
    options: z.array(z.strictObject({ id, text, correct: z.boolean(), feedback: text })).min(3),
  })
  .refine((q) => q.options.filter((o) => o.correct).length === 1, 'a prediction question has exactly one right answer')
  .refine((q) => new Set(q.options.map((o) => o.id)).size === q.options.length, 'a prediction question names each option once')

/** A label that rests on a source, or one that is this project's own, with the reason. */
const label = z.union([cited(text), param(text)])

const chapterBase = {
  /** The chapter's deep link: `?step=<id>`. */
  id,
  title: text,
  /** Where the chapter begins and ends on the track, from 0 to 1. The track is not linear in time. */
  range: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]),
  /** The real timescale, as the track labels the chapter; null for a bookend, which has none. */
  timescale: label.nullable(),
  explanation: z.strictObject({ intro: text, expanded: text }),
  /** The actors that take part in the chapter; the rest are in the scene and look on. */
  active: z.array(id),
}

const step = z.strictObject({
  ...chapterBase,
  kind: z.literal('step'),
  bondsBroken: z.array(pair),
  bondsFormed: z.array(pair),
  /** A bond that is there before and after the step, with another order. */
  orderChanges: z.array(z.strictObject({ bond: pair, from: order, to: order })),
  electronPaths: z.array(z.strictObject({ from: site, to: site })),
  /** The change the formation values were taken over, as ids of `thermo.formation`; null where the step's energy is not from them. */
  reaction: z.strictObject({ reactants: z.array(id).min(1), products: z.array(id).min(1) }).nullable(),
  /** Null where the step has no enthalpy of its own: the next step's covers both. */
  deltaH: energy.nullable(),
  deltaG: energy,
  /** Absent where the step is not one move over a barrier (dissolving, a gas leaving). */
  activationG: z.union([energy, z.literal('schematic')]).optional(),
  notes: z.array(text),
  /** What Challenge mode asks before the step. */
  question: question.optional(),
})

const interlude = z.strictObject({ ...chapterBase, kind: z.enum(['bookend', 'prologue']) })

const keyframe = z.strictObject({
  id,
  t: z.number().min(0).max(1),
  /** The easing of the move that ends at this keyframe; the first keyframe has none. */
  easing: z.enum(EASING_NAMES).optional(),
  /** One for each actor, in the actors' order, in ångström. */
  positions: z.array(vec3),
  bonds: z.array(z.strictObject({ a: id, b: id, order })),
  /** What the actors make up at this keyframe: library species by id, each with its actors in its record's atom order, and monatomic ions. */
  species: z.array(z.union([z.strictObject({ speciesId: id, atoms: z.array(id).min(2) }), z.strictObject({ ion: id, charge: z.number().int(), atoms: z.array(id).min(1).max(1) })])),
  /**
   * Species of this keyframe that are held together as one thing and named as one: the ions of one unit of a
   * solid, before it has come apart. `atoms` are all the atoms of those species, in the actors' order.
   */
  units: z.array(z.strictObject({ unit: id, atoms: z.array(id).min(2) })).optional(),
  /** What the camera frames: a point and the radius about it that holds the atoms of interest. */
  camera: z.strictObject({ target: vec3, radius: z.number().positive() }),
})

const formation = z.strictObject({
  id,
  formula: text,
  /** As the tables abbreviate it: cr a crystal, l a liquid, g a gas, ao the standard state in water. */
  state: z.enum(['cr', 'l', 'g', 'ao']),
  /** Standard enthalpy and Gibbs energy of formation at 298.15 K, in kJ/mol. */
  enthalpy: citedNumber(z.number()),
  gibbs: citedNumber(z.number()),
  note: cited(text).optional(),
})

const constant = cited(z.number().positive()).extend({ unit: text })

export const mechanismSchema = z.strictObject({
  id,
  title: text,
  /** How each species of the scene is named and written: a library record's id, the symbol of a monatomic ion, or the id of a unit of a solid. */
  species: z.array(z.strictObject({ id, name: text, formula: text })),
  /**
   * One stable id and element for each atom, for the whole timeline. A monatomic ion is drawn as a sphere sized by
   * its cited ionic radius, in ångström. `enters` is the chapter from whose start the atom is in the scene: the
   * record places every actor at every keyframe, and the scene leaves out what has not been added yet.
   */
  actors: z.array(z.strictObject({ id, element: text, enters: id.optional(), ion: z.strictObject({ charge: z.number().int(), coordination: z.number().int().positive(), radius: cited(z.number().positive()) }).optional() })).min(1),
  chapters: z.array(z.union([step, interlude])).min(1),
  keyframes: z.array(keyframe).min(2),
  thermo: z.strictObject({
    standardState: cited(text),
    formation: z.array(formation).min(1),
    carbonicAcid: z.strictObject({
      /** Of the true H₂CO₃ molecule, not the textbook constant that counts dissolved CO₂ as the acid (spec 9.2). */
      pKa: citedNumber(z.number()).extend({ note: text }),
      /** How long the molecule lasts in water before it splits. */
      lifetime: citedNumber(z.number().positive()).extend({ unit: text, note: text }),
    }),
    protonTransfer: z.strictObject({ onContactRate: constant.extend({ note: text }) }),
    constants: z.strictObject({ gasConstant: constant, boltzmannConstant: constant, planckConstant: constant }),
    parameters: z.strictObject({ temperature: param(z.number().positive()), schematicBarrier: param(z.number().positive()) }),
  }),
  /** What the energy panel says under its curves (spec 9.2). */
  energyNote: text,
})

export type Mechanism = z.infer<typeof mechanismSchema>
export type Chapter = Mechanism['chapters'][number]
export type Step = Extract<Chapter, { kind: 'step' }>
export type Keyframe = Mechanism['keyframes'][number]
export type Energy = NonNullable<Step['deltaH']>
export type Question = NonNullable<Step['question']>
export type ElectronSite = Step['electronPaths'][number]['from']
export type EasingName = (typeof EASING_NAMES)[number]
