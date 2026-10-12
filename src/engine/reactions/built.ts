import { sideFault, type Entry, type Term } from '../equation'
import { speciesOf, type ReactionsModel, type StationModel, type VesselModel } from './model'

// A built equation, and whether it is right (spec 24.2, 24.5). An equation is built from the station's tiles and
// nothing is parsed from typed text. It is right when each side holds the species of the stored equation and no
// other, each in a state the species takes, and the two sides hold the same atoms: so any whole multiple of the
// stored equation is right, and what is wrong is named by its kind and never by what would put it right.

/** An equation as it is stored in a run: the terms of each side. "No reaction" is never stored: it is the kind 'none'. */
export interface Built {
  reactants: Term[]
  products: Term[]
}

/**
 * What is wrong with a built equation, the first that applies: a reaction written where nothing reacts; a species
 * that does not belong on the side it is on; a species missing from a side; a state that is not the species'; the
 * two sides not holding the same atoms.
 */
export type Problem = 'no-reaction' | 'species-extra' | 'species-missing' | 'state-wrong' | 'not-balanced'

/** The most places a side of a stored equation holds; the largest coefficient it takes. */
export const MAX_TERMS = 6
export const MAX_COEFFICIENT = 99
const STATES: readonly string[] = ['aq', 's', 'l', 'g']

/** True when an entry can be taken at a station as it stands: not "No reaction", two sides that each hold a term, every term a tile of the station with a whole coefficient and a state, and no tile twice on a side. */
export function isBuilt(station: StationModel, entry: Entry | Built): boolean {
  if (typeof entry !== 'object' || entry === null || ('noReaction' in entry && entry.noReaction !== false)) return false
  const side = (terms: unknown) =>
    Array.isArray(terms) &&
    terms.length > 0 &&
    terms.length <= MAX_TERMS &&
    terms.every(
      (term: Term, i) =>
        typeof term === 'object' &&
        term !== null &&
        station.tiles.includes(term.speciesId) &&
        Number.isInteger(term.coefficient) &&
        term.coefficient >= 1 &&
        term.coefficient <= MAX_COEFFICIENT &&
        STATES.includes(term.state) &&
        terms.findIndex((other: Term) => other?.speciesId === term.speciesId) === i,
    )
  return side(entry.reactants) && side(entry.products)
}

/** The atoms one side of a built equation holds. */
export function atomsOf(m: ReactionsModel, side: readonly { speciesId: string; coefficient: number }[]): Record<string, number> {
  const atoms: Record<string, number> = {}
  for (const term of side) {
    for (const [element, count] of Object.entries(speciesOf(m, term.speciesId)?.composition ?? {})) atoms[element] = (atoms[element] ?? 0) + count * term.coefficient
  }
  return atoms
}

/** True when the two sides hold the same atoms. Every species of this lab is neutral, so the charge balances with them. */
export function balances(m: ReactionsModel, built: { reactants: readonly { speciesId: string; coefficient: number }[]; products: readonly { speciesId: string; coefficient: number }[] }): boolean {
  const left = atomsOf(m, built.reactants)
  const right = atomsOf(m, built.products)
  return Object.keys({ ...left, ...right }).every((element) => left[element] === right[element])
}

/** null when a built equation is right for a vessel; otherwise what is wrong with it, the first that applies. */
export function checkBuilt(m: ReactionsModel, vessel: VesselModel, built: Built): Problem | null {
  if (vessel.equation === null) return 'no-reaction'
  const faults = [sideFault(built.reactants, vessel.equation.reactants), sideFault(built.products, vessel.equation.products)]
  if (faults.includes('extra')) return 'species-extra'
  if (faults.includes('missing')) return 'species-missing'
  if ([...built.reactants, ...built.products].some((term) => !speciesOf(m, term.speciesId)?.states.includes(term.state))) return 'state-wrong'
  return balances(m, built) ? null : 'not-balanced'
}

/** The same two equations, term for term. */
export const sameBuilt = (a: Built, b: Built): boolean => {
  const side = (x: Term[], y: Term[]) => x.length === y.length && x.every((term, i) => term.speciesId === y[i]!.speciesId && term.coefficient === y[i]!.coefficient && term.state === y[i]!.state)
  return side(a.reactants, b.reactants) && side(a.products, b.products)
}
