import index from './element-index.json'
import type { PeriodicElement } from './schema'

export type ElementIndexEntry = Pick<PeriodicElement, 'symbol' | 'name' | 'atomicNumber'>

/**
 * One row per element, by atomic number: enough to list and search the elements
 * without loading the periodic table. Written by `npm run build:data`;
 * elementIndex.test.ts checks it against the table.
 */
export const ELEMENT_INDEX = index as readonly ElementIndexEntry[]

/**
 * Spellings the search also finds, by symbol. The names shown are PubChem's; these two are the ones CIAAW's
 * table spells differently (cross-check report, section 6.10).
 */
export const ELEMENT_ALIASES: Readonly<Record<string, string>> = { Al: 'Aluminium', Cs: 'Caesium' }
