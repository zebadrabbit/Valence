/** One destination in the command palette. */
export interface PaletteItem {
  /** Unique among the items. */
  id: string
  label: string
  /** What kind of destination this is, shown beside the label: "Molecule · Basics", "Lab", "Page". */
  kind: string
  /** The route to open. */
  to: string
  /** A molecule's plain formula ("H2O") or an element's symbol; searched as well as the label. */
  formula?: string
  /** Another spelling of the label ("Aluminium" for Aluminum); searched, not shown. */
  alias?: string
  /** The molecule's net charge, for writing the formula. */
  charge?: number
}

/** Lower case, with subscript digits and other compatibility characters folded: "O₂" becomes "o2". */
function fold(text: string): string {
  return text.normalize('NFKD').toLowerCase()
}

/** 0 for an exact match, 1 when the text starts with the query, 2 when a word in it does, 3 when it contains it; otherwise null. */
function rank(text: string, query: string): number | null {
  const at = text.indexOf(query)
  if (at < 0) return null
  if (text === query) return 0
  if (at === 0) return 1
  return new RegExp(`[^\\p{L}\\p{N}]${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'u').test(text) ? 2 : 3
}

/**
 * The items whose label, formula or other spelling contains the query, ignoring case, best match
 * first; ties keep the given order. An empty query gives every item.
 */
export function searchPalette(items: readonly PaletteItem[], query: string): PaletteItem[] {
  const q = fold(query.trim())
  if (q === '') return [...items]
  return items
    .flatMap((item) => {
      const ranks = [item.label, item.formula, item.alias].flatMap((text) => (text === undefined ? [] : [rank(fold(text), q)])).filter((r) => r !== null)
      return ranks.length > 0 ? [{ item, rank: Math.min(...ranks) }] : []
    })
    .sort((a, b) => a.rank - b.rank)
    .map(({ item }) => item)
}

/** The option to highlight after an arrow key: one step from `active`, wrapping at both ends. */
export function stepActive(active: number, step: 1 | -1, count: number): number {
  return count === 0 ? 0 : (active + step + count) % count
}
