import { FIELD_AT, FIELDS, type Field, type KindAnswer, type Look, type MetalId, type ReactionsData, type StationId } from '@/chem-data/reactions/data'
import type { State } from '../equation'

// The plain values the types of reactions engine runs on (spec 24.3). The record says, for each vessel of each
// station, what is there before, what is seen after, the words for each look, the kind of reaction and the
// equation; the engine reads those and works no chemistry out but one thing: whether a built equation balances,
// by counting the atoms of its species. What the model adds is each tube's volume before and after, in whole
// microlitres, from the record's parameters, so that a tube can be drawn to its level. Nothing is drawn by chance.

/** A species an equation is built from: its tile, the atoms it is balanced by, and the states an equation may give it (its own first). */
export interface SpeciesModel {
  id: string
  formula: string
  name: string
  composition: Readonly<Record<string, number>>
  states: readonly State[]
}

/** What is seen of a vessel at one point: a choice for each field it has. */
export type Seen = Readonly<Partial<Record<Field, string>>>

export interface VesselModel {
  id: string
  drawn: 'tube' | 'flame'
  /** The volume of a tube's liquid before the action and after it; null for the strip. */
  microlitres: { before: number; after: number } | null
  /** The piece of metal that goes in, or burns, and its colour; null where there is none. */
  metal: { id: MetalId; colour: string } | null
  /** The fields an observation of this vessel records, in the order they are asked. */
  asks: readonly Field[]
  /** What is seen before the action and after it: every field asked, and the liquid's colour for a tube. */
  before: Seen
  after: Seen
  /** The parts looked at, with the record's words for each before and after. */
  looks: readonly { at: Look; before: string; after: string }[]
  kind: KindAnswer
  /** The balanced equation; null where nothing reacts. */
  equation: { reactants: readonly { speciesId: string; coefficient: number }[]; products: readonly { speciesId: string; coefficient: number }[] } | null
  /** The species that speeds the reaction and is in no equation; null where there is none. */
  catalyst: string | null
}

export interface StationModel {
  id: StationId
  action: 'put-in' | 'burn' | 'mix' | 'add-drops'
  vessels: readonly VesselModel[]
  /** The species the station's equations are built from, in the order they are offered. */
  tiles: readonly string[]
  /** The station's metals from the most active to the least, where the station asks for that; null where it does not. */
  order: readonly MetalId[] | null
}

export interface ReactionsModel {
  stations: readonly StationModel[]
  species: readonly SpeciesModel[]
  /** What each field is recorded from. The first choice of every field but the liquid is that nothing is there, or nothing changed. */
  choices: Readonly<Record<Field, readonly string[]>>
}

/** A species of the model by its id; undefined for an id that is none. */
export const speciesOf = (m: ReactionsModel, id: string): SpeciesModel | undefined => m.species.find((s) => s.id === id)

/** The engine's values, from the stored record. */
export function modelFrom(data: ReactionsData): ReactionsModel {
  const amount = (key: string) => data.parameters[key as keyof ReactionsData['parameters']].value
  return {
    choices: data.choices,
    species: data.species.map((s) => ({ id: s.id, formula: s.formula, name: s.name, composition: s.composition, states: s.acceptedStates ?? [s.state] })),
    stations: data.stations.map((station): StationModel => ({
      id: station.id,
      action: station.action,
      tiles: station.tiles,
      order: station.order ? data.activity.order : null,
      vessels: station.vessels.map((vessel): VesselModel => {
        const fields = FIELDS.filter((field) => vessel.asks.includes(field) || (field === 'liquid' && vessel.liquid !== null))
        const nothing = (field: Field) => (field === 'liquid' ? vessel.liquid!.value : data.choices[field][0]!)
        const start = vessel.liquid === null ? 0 : amount(vessel.liquid.start)
        return {
          id: vessel.id,
          drawn: vessel.drawn,
          microlitres: vessel.liquid === null ? null : { before: start, after: start + (vessel.liquid.added === null ? 0 : amount(vessel.liquid.added)) },
          metal: vessel.metal === null ? null : { id: vessel.metal.id, colour: vessel.metal.colour.value },
          asks: vessel.asks,
          before: Object.fromEntries(fields.map((field) => [field, nothing(field)])),
          after: Object.fromEntries(fields.map((field) => [field, vessel.after[field]?.value ?? nothing(field)])),
          looks: vessel.looks.map(({ at, before, after }) => ({ at, before, after })),
          kind: vessel.kind.value,
          equation: vessel.equation === null ? null : { reactants: vessel.equation.reactants, products: vessel.equation.products },
          catalyst: vessel.catalyst?.speciesId ?? null,
        }
      }),
    })),
  }
}

/** The look that shows a field. */
export const lookFor = (field: Field): Look => FIELD_AT[field]
