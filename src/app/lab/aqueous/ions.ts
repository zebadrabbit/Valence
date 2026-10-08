import type { AqueousData } from '@/chem-data/aqueous/data'
import type { State } from '@/engine/aqueous'

// The rows of the "Ions on this bench" panel, read from the lab's record and from nothing else: which ions the
// bench has, what each is called, and which bottles hold it. No rule of chemistry is here.

type Reagent = AqueousData['reagents'][number]

/** A bottle as the panel names it: its name without its strength or its form ("Hydrochloric acid, 1 M" and its two others are one). */
export interface Bottle {
  name: string
  /** A solid or a metal holds the ion locked up, and is itself written whole. */
  form: Reagent['form']
}

export interface IonRow {
  id: string
  name: string
  formula: string
  charge: number
  /** How many atoms the ion is: one, or a group that stays together. */
  atoms: number
  /** The colour it gives a solution, by the record's name for it; null where the record stores none. */
  colour: string | null
  bottles: Bottle[]
}

const bottleName = (reagent: Reagent) => reagent.name.split(',')[0]!

/**
 * One row for each ion that a bottle gives or an equation of a station holds, in the order of the record, which
 * has the positive ions first. An ion that only a station's list of formulas to choose from holds has no row.
 */
export function ionRows(data: AqueousData): IonRow[] {
  const met = new Set([
    ...data.reagents.flatMap((reagent) => reagent.ions.map((ion) => ion.speciesId)),
    ...data.stations.flatMap((station) => Object.values(station.equations).flatMap((equation) => (equation ? [...equation.reactants, ...equation.products].map((term) => term.speciesId) : []))),
  ])
  return data.species
    .filter((species) => species.charge !== 0 && met.has(species.id))
    .map((species) => {
      const bottles: Bottle[] = []
      for (const reagent of data.reagents) {
        const name = bottleName(reagent)
        if (reagent.ions.some((ion) => ion.speciesId === species.id) && !bottles.some((bottle) => bottle.name === name)) bottles.push({ name, form: reagent.form })
      }
      return {
        id: species.id,
        // A test holds every ion here to having a stored name; its formula stands in where one is missing.
        name: species.name?.value ?? species.formula,
        formula: species.formula,
        charge: species.charge,
        atoms: Object.values(species.composition).reduce((sum, count) => sum + count, 0),
        colour: species.solutionColor?.value.name ?? null,
        bottles,
      }
    })
}

/** A charge as a number and its sign: "3+", "1−". */
export const chargeText = (charge: number) => `${Math.abs(charge)}${charge > 0 ? '+' : '−'}`

export interface WholeRow {
  name: string
  formula: string
  /** What it is: a liquid, a gas or a solid. */
  state: State
  /** Every state symbol an equation may give it. */
  states: State[]
}

/**
 * What is not an ion and is written as one whole formula: the named molecules of the record (water, then the
 * gases) and the bottles that are a solid or a metal. A solid that forms in a tube is written whole too, and is
 * not here: its formula is the learner's to work out.
 */
export function wholeRows(data: AqueousData): WholeRow[] {
  const molecules = data.species.filter((species) => species.name !== undefined && species.charge === 0)
  const ofState = (state: State) => molecules.filter((species) => species.state === state).map((species) => ({ name: species.name!.value, formula: species.formula, state, states: species.acceptedStates ?? [state] }))
  const solids = data.reagents
    .filter((reagent) => reagent.form !== 'solution')
    .map((reagent) => {
      const state = data.species.find((species) => species.id === reagent.speciesId)?.state ?? 's'
      return { name: bottleName(reagent), formula: reagent.formula, state, states: [state] }
    })
  return [...ofState('l'), ...ofState('g'), ...solids]
}
