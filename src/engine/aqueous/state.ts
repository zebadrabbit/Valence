import { z } from 'zod'
import type { AqueousData } from '@/chem-data/aqueous/data'
import { FIELDS, FORMS, TOOL_USES, choicesFor, fieldsOf, usesOf, usesShowing, wrongFields, checkEquation, type Entry, type Observation } from './check'
import { stationOf } from './react'

// The lab as plain data: the whole record saved for it. It holds what the learner did and entered at each of the
// ten stations, as booleans, short strings and whole numbers, so a round trip through JSON gives back the same
// value. There is no seed: the stations are fixed. What is judged (whether an observation or an equation is
// right, whether a station is done) is worked out on reading and stored nowhere, so a stored record cannot
// disagree with its own entries; the one stored judgement is the status, and the schema holds it to them.
//
// A change to this shape, or to anything a stored entry is judged against (a station's expected record, its
// equations, its palette, the choices), needs the aqueous entry's version raised (src/aqueous-version.test.ts).

const text = z.string().min(1)
const termSchema = z.strictObject({ speciesId: text, coefficient: z.number().int().min(1).max(99), state: z.enum(['aq', 's', 'l', 'g']) })
const entrySchema = z.strictObject({ noReaction: z.boolean(), reactants: z.array(termSchema).max(12), products: z.array(termSchema).max(12) })

const stationSchema = z.strictObject({
  /** The two reagents have been put together in the tube. */
  mixed: z.boolean(),
  /** The ways a tool has been applied to the tube, each once, in the order they were first applied. Looking at a part of the tube is one. */
  used: z.array(z.enum(TOOL_USES)),
  /** The observation last recorded: one choice for each field the station's tools show. */
  observation: z.strictObject(Object.fromEntries(FIELDS.map((field) => [field, text.optional()])) as Record<(typeof FIELDS)[number], z.ZodOptional<typeof text>>).nullable(),
  /** The equation last entered in each form. */
  equations: z.strictObject({ molecular: entrySchema.nullable(), completeIonic: entrySchema.nullable(), netIonic: entrySchema.nullable() }),
})

const stateSchema = z.strictObject({
  mode: z.enum(['guided', 'challenge']),
  status: z.enum(['in-progress', 'completed']),
  /** One for each station, in the stations' order. */
  stations: z.array(stationSchema),
})

export type StationState = z.infer<typeof stationSchema>
export type AqueousState = z.infer<typeof stateSchema>
export type Mode = AqueousState['mode']

/** Why an observation cannot be recorded as it stands, or null: its fields are the station's, each value one of the field's choices, and each was shown by a tool that has been applied, the eye's by a look at their part of the tube. */
export function observationProblem(data: AqueousData, stationId: string, used: readonly string[], observation: Observation): 'invalid-entry' | 'tool-not-used' | null {
  const station = stationOf(data, stationId)
  const fields = fieldsOf(station)
  const keys = Object.keys(observation).filter((key) => observation[key as keyof Observation] !== undefined)
  if (keys.length !== fields.length || fields.some((field) => !choicesFor(data, field).includes(observation[field] ?? ''))) return 'invalid-entry'
  const unseen = fields.some((field) => !usesShowing(station, field).some((use) => used.includes(use)))
  return unseen ? 'tool-not-used' : null
}

/** True when an equation can be entered as it stands: "No reaction" with nothing beside it, or two sides of the station's palette species, none twice on a side. */
export function isEntry(data: AqueousData, stationId: string, entry: Entry): boolean {
  if (!entrySchema.safeParse(entry).success) return false
  if (entry.noReaction) return entry.reactants.length === 0 && entry.products.length === 0
  const palette = stationOf(data, stationId).paletteSpecies
  const side = (terms: Entry['reactants']) => terms.length > 0 && terms.every((term, i) => palette.includes(term.speciesId) && terms.findIndex((other) => other.speciesId === term.speciesId) === i)
  return side(entry.reactants) && side(entry.products)
}

/** A station is done when its observation and its three equations are correct (spec 8.3). */
export function stationDone(data: AqueousData, stationId: string, station: StationState): boolean {
  const curated = stationOf(data, stationId)
  if (station.observation === null || wrongFields(curated, station.observation).length > 0) return false
  return FORMS.every((form) => {
    const entry = station.equations[form]
    return entry !== null && checkEquation(data, curated, form, entry) === null
  })
}

/** The status the entries give: completed when all ten stations are done. */
export const statusOf = (data: AqueousData, stations: readonly StationState[]): AqueousState['status'] =>
  stations.every((station, i) => stationDone(data, data.stations[i]!.id, station)) ? 'completed' : 'in-progress'

/**
 * The stored shape, held to the record it is read with: one entry for each station, nothing stored that the
 * reducer would not have stored (a tool applied before mixing, a tool the station has not, an observation of
 * fields the station does not show, a species off the palette), and the status the entries give.
 */
export const aqueousStateSchema = (data: AqueousData): z.ZodType<AqueousState> =>
  stateSchema.superRefine((state, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message })
    if (state.stations.length !== data.stations.length) return issue(['stations'], `expected ${data.stations.length} stations`)
    state.stations.forEach((station, i) => {
      const { id } = data.stations[i]!
      const uses = usesOf(data.stations[i]!)
      if (station.used.some((use, at) => !uses.includes(use) || station.used.indexOf(use) !== at)) issue(['stations', i, 'used'], "each is one of the station's tools, once")
      if (!station.mixed && (station.used.length > 0 || station.observation !== null)) issue(['stations', i, 'mixed'], 'nothing is observed before the tube is mixed')
      if (station.observation !== null && observationProblem(data, id, station.used, station.observation) !== null) issue(['stations', i, 'observation'], 'not an observation this station takes')
      for (const form of FORMS) {
        const entry = station.equations[form]
        if (entry !== null && !isEntry(data, id, entry)) issue(['stations', i, 'equations', form], 'not an equation this station takes')
      }
    })
    if (state.status !== statusOf(data, state.stations)) issue(['status'], 'the status is not the one the entries give')
  })

const newStation = (): StationState => ({ mixed: false, used: [], observation: null, equations: { molecular: null, completeIonic: null, netIonic: null } })

/** A lab that has just been started. */
export function createLab(data: AqueousData, mode: Mode): AqueousState {
  return { mode, status: 'in-progress', stations: data.stations.map(newStation) }
}
