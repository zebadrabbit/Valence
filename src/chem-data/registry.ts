import elements from './elements.json'
import { moleculeFiles } from './molecules'
import { registrySchema } from './schema'
import sources from './sources.json'

// The real curated data. elements.json, sources.json and molecules/ are written by
// `npm run build:data`; edit the script or its inputs, not those files.
// Later phases add reagents and stations.
export const registry = registrySchema.parse({
  sources,
  species: [],
  reagents: [],
  observations: [],
  stations: [],
  elements,
  molecules: moleculeFiles,
})
