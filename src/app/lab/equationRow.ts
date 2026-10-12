import type { Entry, State, Term } from '@/engine/equation'

// An equation while it is built (spec 8.3, 24.2): a row of places on each side of the arrow, each holding one term
// or nothing yet, filled from a station's bank of species. The aqueous reactions lab's and the types of reactions
// lab's, whose engines take the one shape of entry (src/engine/equation.ts). What is checked is the engine's own
// entry, the terms in their order with the empty places left out, so nothing is translated. No rule of chemistry
// is here: whether a species belongs, on which side and in what state is each engine's check.

export type Side = 'reactants' | 'products'
export const SIDES: readonly Side[] = ['reactants', 'products']
/** One place of the row: a term, or nothing yet. */
export type Slot = Term | null
export interface Row {
  noReaction: boolean
  reactants: Slot[]
  products: Slot[]
}
/**
 * How many places each side has, where the row is a template to fill (Guided, from the engine's view of the
 * station); null where it is not, and each side is then its terms and one empty place after them.
 */
export type Counts = Record<Side, number> | null
/** Where a place is: its side, and its number on that side from 0. */
export interface At {
  side: Side
  index: number
}
/** Why a species is not put on a side: it is there already, and the engine takes none twice on a side. */
export interface Refused {
  speciesId: string
  side: Side
}

/** The largest coefficient the stepper gives. The curated equations need 3 at most; the engine itself takes up to 99. */
export const MAX_COEFFICIENT = 9

export const EMPTY: Row = { noReaction: false, reactants: [], products: [] }

/**
 * The row with as many places as it is to have. With counts, each side is brought to its count: empty places are
 * added at its end, or spare ones taken away from its end backwards, and a term is never dropped, so a side that
 * holds more terms than its count keeps them all. With none, each side is its terms, closed up, and one empty
 * place after them: it gains a place when its last is filled and never shows two empty ones.
 */
export function fit(row: Row, counts: Counts): Row {
  const side = (slots: Slot[], count: number | undefined) => {
    if (count === undefined) return [...slots.filter((slot) => slot !== null), null]
    const out = [...slots]
    for (let i = out.length - 1; i >= 0 && out.length > count; i--) if (out[i] === null) out.splice(i, 1)
    while (out.length < count) out.push(null)
    return out
  }
  return { ...row, reactants: side(row.reactants, counts?.reactants), products: side(row.products, counts?.products) }
}

/** The first empty place at or after one, as the row is read, going round to its start; from the start with none given. Null where every place is full. */
export function nextEmpty(row: Row, from?: At): At | null {
  const all = SIDES.flatMap((side) => row[side].map((slot, index) => ({ side, index, empty: slot === null })))
  const start = Math.max(0, all.findIndex((at) => at.side === from?.side && at.index === from.index))
  const found = [...all.slice(start), ...all.slice(0, start)].find((at) => at.empty)
  return found ? { side: found.side, index: found.index } : null
}

const elsewhere = (row: Row, at: At, speciesId: string) => row[at.side].some((slot, index) => index !== at.index && slot?.speciesId === speciesId)
const withSlot = (row: Row, at: At, slot: Slot): Row => ({ ...row, [at.side]: row[at.side].map((was, index) => (index === at.index ? slot : was)) })

/**
 * The row with a species put in a place, in place of whatever was there: one of it, written as dissolved, which is
 * how nearly everything in a tube starts and is the learner's to change. A species that is on that side
 * already, in another place, is refused; one put where it already is changes nothing, and the very same row comes
 * back.
 */
export function place(row: Row, at: At, speciesId: string, counts: Counts): Row | Refused {
  if (elsewhere(row, at, speciesId)) return { speciesId, side: at.side }
  if (row[at.side][at.index]?.speciesId === speciesId) return row
  return fit(withSlot(row, at, { speciesId, coefficient: 1, state: 'aq' }), counts)
}

/** The row with a place emptied. */
export const remove = (row: Row, at: At, counts: Counts): Row => fit(withSlot(row, at, null), counts)

/**
 * The row with the term of one place moved to another, and what was in that other, if anything, put where the
 * term came from. Refused where either would then be twice on one side. An empty place moves nothing.
 */
export function move(row: Row, from: At, to: At, counts: Counts): Row | Refused {
  const term = row[from.side][from.index] ?? null
  const other = row[to.side][to.index] ?? null
  if (term === null || (from.side === to.side && from.index === to.index)) return row
  if (from.side !== to.side) {
    if (elsewhere(row, to, term.speciesId)) return { speciesId: term.speciesId, side: to.side }
    if (other !== null && elsewhere(row, from, other.speciesId)) return { speciesId: other.speciesId, side: from.side }
  }
  return fit(withSlot(withSlot(row, from, other), to, term), counts)
}

/** The row with a term's coefficient or state changed. A coefficient outside 1 to 9, or an empty place, changes nothing, and the very same row comes back. */
export function changeTerm(row: Row, at: At, patch: { coefficient?: number; state?: State }): Row {
  const term = row[at.side][at.index] ?? null
  const { coefficient } = patch
  if (term === null || (coefficient !== undefined && (coefficient < 1 || coefficient > MAX_COEFFICIENT))) return row
  return withSlot(row, at, { ...term, ...patch })
}

/** "No reaction" chosen or not. What was built stays, out of sight, so that taking the choice back loses nothing. */
export const setNoReaction = (row: Row, noReaction: boolean): Row => ({ ...row, noReaction })

/** What is handed to the engine: "No reaction" alone, or the terms of each side in their order. */
export const entered = (row: Row): Entry =>
  row.noReaction ? { noReaction: true, reactants: [], products: [] } : { noReaction: false, reactants: row.reactants.filter((slot) => slot !== null), products: row.products.filter((slot) => slot !== null) }

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
