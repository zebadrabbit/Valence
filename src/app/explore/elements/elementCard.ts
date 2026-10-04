import type { LibraryIndexEntry } from '@/chem-data/libraryIndex'
import { CATEGORIES, elementPosition, NO_VALUE, shellsFromConfiguration, type Description } from '@/chem-data/periodic'
import {
  ANCIENT,
  CARD_LABELS,
  curatedRadiusNote,
  ELECTRON_AFFINITY_NOTE,
  group3Pointer,
  IONIZATION_FLAG_NOTES,
  isotopeMassNote,
  massLabel,
  NO_GROUP,
  VDW_RADIUS_NOTE,
  type CardRowId,
} from '@/chem-data/periodicCard'
import type { Element, PeriodicElement, Quantity } from '@/chem-data/schema'
import { minusSigns } from '../minus'
import { quantityText } from './trend'

// What the element card shows (periodic table spec 7), as plain rows. The labels and every sentence that states
// chemistry are authored in src/chem-data; this puts them beside the values they belong to.

export type CardRow = {
  id: CardRowId
  label: string
  /** As its source publishes it, with its unit; NO_VALUE where the source lists none. */
  value: string
  /** What every element's card says of this row, such as what a van der Waals radius is. */
  note?: string
  /** What is said of this element's value: its notes from the record, and the sentences that follow from the record by a rule. */
  notes: string[]
  /** The sources of the value and of every sentence beside it. Empty for a row the app works out. */
  sourceIds: string[]
}

type Sentences = { explains?: Description | undefined; about?: (Description | undefined)[] }

/** The rows of an element's card, in the order of spec 7. `curated` is the element's record in the molecule explorer, if it has one. */
export function elementCardRows(element: PeriodicElement, curated: Element | undefined): CardRow[] {
  const position = elementPosition(element.atomicNumber)
  const table = [element.sourceId]
  const { configuration, standardState, yearDiscovered, oxidationStates, ionizationEnergy } = element

  const row = (id: CardRowId, value: string, sourceIds: readonly string[], { explains, about = [] }: Sentences = {}): CardRow => {
    const said = about.filter((sentence) => sentence !== undefined)
    const own = (element.notes ?? []).filter((note) => note.row === id)
    return {
      id,
      label: id === 'atomicMass' ? massLabel(element) : CARD_LABELS[id],
      value,
      ...(explains ? { note: explains.text } : {}),
      notes: [...said.map((sentence) => sentence.text), ...own.map((note) => note.text)],
      sourceIds: [...new Set([...sourceIds, ...(explains?.sourceIds ?? []), ...said.flatMap((sentence) => sentence.sourceIds), ...own.map((note) => note.sourceId)])],
    }
  }
  // A value the source leaves empty takes no sentence about a value; a note on the empty row still shows.
  const quantity = (id: CardRowId, value: Quantity | undefined, sentences: Sentences = {}) =>
    row(id, quantityText(value), value ? [value.sourceId] : [], value ? sentences : {})

  return [
    row('symbol', element.symbol, table),
    row('name', element.name, table),
    row('atomicNumber', String(element.atomicNumber), table),
    quantity('atomicMass', element.atomicMass, { explains: isotopeMassNote(element) }),
    row('group', position.group === null ? NO_GROUP : String(position.group), [], { about: [group3Pointer(element)] }),
    row('period', String(position.period), []),
    row('block', position.block, []),
    row('category', (CATEGORIES.find((c) => c.category === element.category)?.member ?? element.category).replace(/^./, (first) => first.toUpperCase()), table),
    row('configuration', configuration.qualifier ? `${configuration.text} (${configuration.qualifier})` : configuration.text, table),
    row('shells', shellsFromConfiguration(configuration.text).join(', '), []),
    quantity('electronegativity', element.electronegativity),
    quantity('covalentRadius', element.covalentRadius),
    quantity('vdwRadius', element.vdwRadius, { explains: VDW_RADIUS_NOTE, about: [curatedRadiusNote(element, curated)] }),
    quantity('ionizationEnergy', ionizationEnergy, { about: [ionizationEnergy && ionizationEnergy.flag !== 'measured' ? IONIZATION_FLAG_NOTES[ionizationEnergy.flag] : undefined] }),
    quantity('electronAffinity', element.electronAffinity, { explains: ELECTRON_AFFINITY_NOTE }),
    row('oxidationStates', oxidationStates ? minusSigns(oxidationStates) : NO_VALUE, oxidationStates ? table : []),
    row('standardState', standardState.expected ? `${standardState.state} (expected)` : standardState.state, table),
    quantity('meltingPoint', element.meltingPoint),
    quantity('boilingPoint', element.boilingPoint),
    quantity('density', element.density),
    row('yearDiscovered', yearDiscovered === 'Ancient' ? ANCIENT : String(yearDiscovered), table),
  ]
}

/** The library molecules whose formula holds the element, in library order. */
export function moleculesContaining(symbol: string, index: readonly LibraryIndexEntry[]): LibraryIndexEntry[] {
  // A symbol is a capital with or without a small letter, so "C" must not be followed by one: not the C of "Cl".
  const inFormula = new RegExp(`${symbol}(?![a-z])`)
  return index.filter((entry) => inFormula.test(entry.formula))
}
