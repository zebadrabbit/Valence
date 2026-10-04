import data from './periodic-table.json'
import { periodicTableSchema, type PeriodicElement } from './schema'

/**
 * Shown wherever a source lists no value for an element. Deliberately not "not measured": an empty
 * cell in these sources does not always mean that (periodic table spec 5.1).
 */
export const NO_VALUE = 'no value listed'

// periodic-table.json is written by `npm run build:data` from the saved downloads and decisions.json under
// docs/research/periodic-table/; edit the script or its inputs, not that file.
/** All 118 elements, by atomic number. */
export const periodicTable: readonly PeriodicElement[] = periodicTableSchema.parse(data)
