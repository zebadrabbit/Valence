import record from './hcl-nahco3.json'
import { mechanismSchema, type Mechanism } from './schema'

// hcl-nahco3.json is written by `npm run build:data` from docs/research/phase-5/, after holding the authored
// record to its manifest of sources and to its choreography; edit the script or its inputs, not that file.
/** "HCl + NaHCO₃, step by step" (spec 9.2). */
export const hclNahco3: Mechanism = mechanismSchema.parse(record)
