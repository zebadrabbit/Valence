import index from './library-index.json'
import type { Molecule } from './schema'

export type LibraryIndexEntry = Pick<Molecule, 'id' | 'name' | 'formula' | 'charge' | 'topic'>

/**
 * One row per library entry, in library order: enough to list and search the
 * molecules without loading their structure files. Written by
 * `npm run build:data`; libraryIndex.test.ts checks it against the registry.
 */
export const LIBRARY_INDEX = index as readonly LibraryIndexEntry[]
