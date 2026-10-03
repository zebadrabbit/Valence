import type { Registry } from './schema'
import sources from './sources.json'

// The real curated data. Later phases add molecules, reagents, and stations.
export const registry: Registry = {
  sources,
  species: [],
  reagents: [],
  observations: [],
  stations: [],
  molecules: [],
}
