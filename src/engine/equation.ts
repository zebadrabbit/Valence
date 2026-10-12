// An equation as a learner builds it from tiles, and the one check of it that every lab makes the same way: the
// shape the aqueous reactions lab and the types of reactions lab share, so that one builder on the page serves
// both. Each lab judges a built equation by its own rules (aqueous/check.ts, reactions/built.ts); what is here
// knows nothing of chemistry.

export type State = 'aq' | 's' | 'l' | 'g'
export interface Term {
  speciesId: string
  coefficient: number
  state: State
}
/** An equation as entered: "No reaction", or the species on each side. */
export interface Entry {
  noReaction: boolean
  reactants: Term[]
  products: Term[]
}

/**
 * What is wrong with the species entered on one side, held to the species wanted there (none of them twice):
 * 'extra' where a term is of a species that is not wanted on that side, or is there a second time; 'missing'
 * where a wanted species is not there; null where the side holds each wanted species once and nothing else.
 */
export function sideFault(entered: readonly { speciesId: string }[], wanted: readonly { speciesId: string }[]): 'extra' | 'missing' | null {
  if (entered.some((term, i) => !wanted.some((other) => other.speciesId === term.speciesId) || entered.findIndex((other) => other.speciesId === term.speciesId) !== i)) return 'extra'
  return wanted.every((term) => entered.some((other) => other.speciesId === term.speciesId)) ? null : 'missing'
}
