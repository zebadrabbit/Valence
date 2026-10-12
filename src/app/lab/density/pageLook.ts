import type { PartId } from '@/chem-data/density/data'
import { FIELDS, READ_FROM, type Action, type EntryView, type Field, type Instrument, type PartView } from '@/engine/density'

// What the page works out for itself, and nothing of the lab: which pages a part has and which of them opens,
// and when two presses are the same press.

/** A page of a part: what is set out, one instrument, or the notebook. */
export type PageId = 'bench' | Instrument | 'notebook'

/** A part's pages in order, one thing to a page: the bench, each instrument the part reads, and the notebook. In part 3 the balance comes before the cylinder, as the dry pieces are weighed before they go in. */
export const PAGES: Record<PartId, readonly PageId[]> = {
  reading: ['bench', 'ruler-cm', 'ruler-mm', 'cylinder', 'thermometer', 'balance', 'notebook'],
  liquid: ['bench', 'balance', 'cylinder', 'notebook'],
  metal: ['bench', 'balance', 'cylinder', 'notebook'],
}

/** The readings a part takes from one instrument, in the notebook's order. */
export const readingsOf = (part: PartId, instrument: Instrument): Field[] => FIELDS[part].filter((field) => READ_FROM[field] === instrument)

/** A page's own entries out of a part's notebook: an instrument's readings, and on the notebook's page what is worked out and named. */
export const entriesOf = (notebook: readonly EntryView[], page: PageId): EntryView[] => notebook.filter((entry) => (page === 'notebook' ? entry.instrument === null : entry.instrument === page))

/**
 * The page a part opens on, counted from 0: where the stored record says the learner was. A run that has been
 * checked opens on the notebook, where its outcome is. A run with nothing done opens on the bench. Otherwise it is
 * the first instrument with a reading that can be taken now and is not; where there is none, the first with a
 * reading still to take; and with every reading in, the notebook.
 */
export function openingPage(part: PartId, view: Pick<PartView, 'notebook' | 'outcome' | 'bench'>): number {
  const pages = PAGES[part]
  if (view.outcome.state !== 'open') return pages.length - 1
  const { steps } = view.bench
  const begun = view.notebook.some((entry) => entry.value !== null) || steps.emptyWeighed || steps.weighed !== 'no' || steps.added !== 'no'
  if (!begun) return 0
  const waiting = view.notebook.filter((entry) => entry.instrument !== null && entry.value === null)
  const next = waiting.find((entry) => entry.blocked === null) ?? waiting[0]
  return next ? pages.indexOf(next.instrument!) : pages.length - 1
}

/** True for the same action asked twice: the press that raises Guided's warning and the press that goes on. */
export const sameAction = (a: Action | null, b: Action): boolean => a !== null && JSON.stringify(a) === JSON.stringify(b)
