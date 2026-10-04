import { ACTIVITIES } from '@/app/activities'
import { NAV } from '@/app/nav'
import { ELEMENT_ALIASES, ELEMENT_INDEX } from '@/chem-data/elementIndex'
import { topicLabel } from '@/chem-data/library'
import { LIBRARY_INDEX } from '@/chem-data/libraryIndex'
import type { PaletteItem } from './search'

/**
 * Everything the palette can open: the library molecules, the labs and the mechanism, the app pages, then the
 * periodic table and its elements. The elements come from the small index, never from the table itself, which
 * would put all 118 records into the main chunk.
 */
export const PALETTE_ITEMS: readonly PaletteItem[] = [
  ...LIBRARY_INDEX.map((m) => ({
    id: `molecule:${m.id}`,
    label: m.name,
    kind: `Molecule · ${topicLabel(m.topic)}`,
    to: `/explore/${m.id}`,
    formula: m.formula,
    charge: m.charge,
  })),
  ...ACTIVITIES.map((a) => ({ id: a.entry, label: a.title, kind: a.kind, to: a.to })),
  ...NAV.map((page) => ({ id: `page:${page.to}`, label: page.label, kind: 'Page', to: page.to })),
  { id: 'page:/explore/elements', label: 'Periodic table', kind: 'Page', to: '/explore/elements' },
  ...ELEMENT_INDEX.map((e) => ({
    id: `element:${e.symbol}`,
    label: e.name,
    kind: `Element ${e.atomicNumber}`,
    to: `/explore/elements/${e.symbol}`,
    formula: e.symbol,
    ...(ELEMENT_ALIASES[e.symbol] && { alias: ELEMENT_ALIASES[e.symbol] }),
  })),
]
