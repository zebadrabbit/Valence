import { searchPalette } from '@/app/palette/search'
import { TOPICS } from '@/chem-data/library'
import { LIBRARY_INDEX, type LibraryIndexEntry } from '@/chem-data/libraryIndex'

// The library page's list, narrowed by what is typed in its filter. It reads the small index, never the
// structure files, so the page of the library costs no more to open than the shell.

export type LibraryView = {
  /** The topics that have an entry left, in display order, each with its entries in library order. */
  groups: { id: LibraryIndexEntry['topic']; label: string; entries: LibraryIndexEntry[] }[]
  shown: number
  total: number
}

/** The library under its topic headings: every entry for an empty query, or those whose name or formula holds it. A match is what the command palette calls one. */
export function libraryView(query: string): LibraryView {
  const found = new Set(searchPalette(LIBRARY_INDEX.map((m) => ({ id: m.id, label: m.name, kind: '', to: '', formula: m.formula })), query).map((item) => item.id))
  const groups = TOPICS.map((topic) => ({ ...topic, entries: LIBRARY_INDEX.filter((m) => m.topic === topic.id && found.has(m.id)) })).filter((group) => group.entries.length > 0)
  return { groups, shown: found.size, total: LIBRARY_INDEX.length }
}

/** The line under the filter: how many molecules are listed, or that none matches what was typed. */
export function filterStatus({ shown, total }: LibraryView, query: string): string {
  if (shown === 0) return `No molecule matches “${query.trim()}”.`
  return shown === total ? `${total} molecules` : `${shown} of ${total} molecules`
}
