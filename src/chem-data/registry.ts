import { registrySchema } from './schema'
import sources from './sources.json'

// The real curated data. Later phases add molecules, reagents, and stations.
export const registry = registrySchema.parse({
  sources,
  species: [],
  reagents: [],
  observations: [],
  stations: [],
  molecules: [],
})
