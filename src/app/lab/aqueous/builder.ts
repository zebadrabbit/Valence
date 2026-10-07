import type { Entry, State, Term } from '@/engine/aqueous'

// An equation while it is built from the palette (spec 8.3): each tap is one of these, and what is built is the
// engine's own entry, so nothing is translated when it is checked. No rule of chemistry is here: whether a
// species belongs, on which side and in what state is the engine's check.

export type Side = 'reactants' | 'products'

/** The largest coefficient the stepper gives. The curated equations need 3 at most; the engine itself takes up to 99. */
export const MAX_COEFFICIENT = 9

export const EMPTY: Entry = { noReaction: false, reactants: [], products: [] }

/**
 * The entry with the species added to a side, after the terms already there: one of it, written as dissolved,
 * which is how nearly everything in these tubes starts and is the learner's to change. A species already on that
 * side is not added again (the engine takes none twice on a side), and the very same entry comes back.
 */
export function addTerm(entry: Entry, side: Side, speciesId: string): Entry {
  if (entry[side].some((term) => term.speciesId === speciesId)) return entry
  return { ...entry, [side]: [...entry[side], { speciesId, coefficient: 1, state: 'aq' }] }
}

/** The entry with a term's coefficient or state changed. A coefficient outside 1 to 9 changes nothing, and the very same entry comes back. */
export function changeTerm(entry: Entry, side: Side, speciesId: string, patch: { coefficient?: number; state?: State }): Entry {
  const { coefficient } = patch
  if (coefficient !== undefined && (coefficient < 1 || coefficient > MAX_COEFFICIENT)) return entry
  return { ...entry, [side]: entry[side].map((term): Term => (term.speciesId === speciesId ? { ...term, ...patch } : term)) }
}

export function removeTerm(entry: Entry, side: Side, speciesId: string): Entry {
  return { ...entry, [side]: entry[side].filter((term) => term.speciesId !== speciesId) }
}

/** "No reaction" chosen or not. What was built stays, out of sight, so that taking the choice back loses nothing. */
export const setNoReaction = (entry: Entry, noReaction: boolean): Entry => ({ ...entry, noReaction })

/** What is handed to the engine: "No reaction" alone, or the two sides as built. */
export const entered = (entry: Entry): Entry => (entry.noReaction ? { noReaction: true, reactants: [], products: [] } : entry)

export const sameEntry = (a: Entry | null, b: Entry | null): boolean => JSON.stringify(a) === JSON.stringify(b)

const BELOW = '₀₁₂₃₄₅₆₇₈₉'
const ABOVE = '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻'
const PLAIN_ABOVE = '0123456789+−'

export interface FormulaPart {
  text: string
  at: 'line' | 'below' | 'above'
}

/**
 * A formula of the record cut where its drawing changes: the record writes subscripts and charges with the raised
 * and lowered characters of plain text ("SO₄²⁻"), and the page draws them as real subscripts and superscripts,
 * which a browser sets evenly and a screen reader reads as digits.
 */
export function formulaParts(formula: string): FormulaPart[] {
  const parts: FormulaPart[] = []
  for (const char of formula) {
    const below = BELOW.indexOf(char)
    const above = ABOVE.indexOf(char)
    const part: FormulaPart = below >= 0 ? { text: String(below), at: 'below' } : above >= 0 ? { text: PLAIN_ABOVE[above]!, at: 'above' } : { text: char, at: 'line' }
    const last = parts.at(-1)
    if (last && last.at === part.at) last.text += part.text
    else parts.push(part)
  }
  return parts
}
