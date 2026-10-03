import { ACTIVITIES } from '@/app/activities'
import { NAV } from '@/app/nav'
import { topicLabel } from '@/chem-data/library'
import { LIBRARY_INDEX } from '@/chem-data/libraryIndex'
import type { PaletteItem } from './search'

/** Everything the palette can open: the library molecules, the labs and the mechanism, then the app pages. */
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
]
