import { findInstitutionText, findName } from './denylist'
import { valenceElectrons } from './element'
import { angleDeg, dihedralDeg, distance } from './geometry'
import { registrySchema, type Registry } from './schema'

export interface ValidateOptions {
  institutionNames?: readonly string[]
}

// Keys whose strings are identifiers or codes, not prose.
const CODE_KEYS = new Set(['id', 'formula', 'hex', 'element', 'symbol', 'unit', 'precipitate', 'gas', 'variantGroup'])
const isProseKey = (key: string) => !CODE_KEYS.has(key) && !/Ids?$/.test(key)

type Visit = (key: string, text: string, path: string) => void

function walkStrings(value: unknown, key: string, path: string, visit: Visit): void {
  if (typeof value === 'string') {
    visit(key, value, path)
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => walkStrings(item, key, `${path}[${i}]`, visit))
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) walkStrings(v, k, `${path}.${k}`, visit)
  }
}

function duplicates(ids: readonly string[], label: string): string[] {
  const seen = new Set<string>()
  const errors: string[] = []
  for (const id of ids) {
    if (seen.has(id)) errors.push(`${label}: duplicate id "${id}"`)
    seen.add(id)
  }
  return errors
}

function checkSources(registry: Registry): string[] {
  const errors = duplicates(
    registry.sources.map((s) => s.id),
    'sources',
  )
  const known = new Set(registry.sources.map((s) => s.id))
  walkStrings(registry, '', 'registry', (key, text, path) => {
    if (key === 'sourceId' && !known.has(text)) errors.push(`${path}: unknown source "${text}"`)
  })
  return errors
}

function checkReferences(registry: Registry): string[] {
  const errors = [
    ...duplicates(registry.species.map((s) => s.id), 'species'),
    ...duplicates(registry.reagents.map((r) => r.id), 'reagents'),
    ...duplicates(registry.stations.map((s) => s.id), 'stations'),
    ...duplicates(registry.elements.map((e) => e.symbol), 'elements'),
    ...duplicates(registry.molecules.map((m) => m.id), 'molecules'),
  ]
  const species = new Set(registry.species.map((s) => s.id))
  const reagents = new Set(registry.reagents.map((r) => r.id))

  for (const reagent of registry.reagents) {
    for (const ion of reagent.ions) {
      if (!species.has(ion.speciesId)) errors.push(`reagent "${reagent.id}": unknown species "${ion.speciesId}"`)
    }
  }
  for (const observation of registry.observations) {
    if (!species.has(observation.productId)) errors.push(`observation: unknown species "${observation.productId}"`)
  }
  for (const station of registry.stations) {
    for (const reagentId of station.reagentIds) {
      if (!reagents.has(reagentId)) errors.push(`station "${station.id}": unknown reagent "${reagentId}"`)
    }
    for (const productId of [station.expected.precipitate, station.expected.gas]) {
      if (productId !== null && !species.has(productId)) {
        errors.push(`station "${station.id}": unknown species "${productId}"`)
      }
    }
  }
  return errors
}

// A PubChem 2D drawing has unit-length heavy-atom bonds and shorter bonds to H.
const MIN_BOND_TO_H = 0.8
const MIN_HEAVY_BOND = 1.05

function checkGeometry(registry: Registry): string[] {
  const errors: string[] = []
  for (const molecule of registry.molecules) {
    for (const bond of molecule.bonds) {
      const a = molecule.atoms[bond.a]
      const b = molecule.atoms[bond.b]
      const label = `molecule "${molecule.id}": bond ${bond.a}-${bond.b}`
      if (!a || !b || bond.a === bond.b) {
        errors.push(`${label} refers to a missing atom`)
        continue
      }
      const length = Math.hypot(
        a.position[0] - b.position[0],
        a.position[1] - b.position[1],
        a.position[2] - b.position[2],
      )
      const minimum = a.element === 'H' || b.element === 'H' ? MIN_BOND_TO_H : MIN_HEAVY_BOND
      if (length < minimum) {
        errors.push(`${label} is ${length.toFixed(3)} Å, shorter than ${minimum} Å (looks like a 2D drawing)`)
      }
    }
  }
  return errors
}

// Formal charge = valence electrons - lone-pair electrons - sum of bond orders (spec 6.5).
function checkLewis(registry: Registry): string[] {
  const errors: string[] = []
  const elements = new Map(registry.elements.map((e) => [e.symbol, e]))
  for (const molecule of registry.molecules) {
    const label = `molecule "${molecule.id}"`
    const orderSum = molecule.atoms.map(() => 0)
    for (const bond of molecule.bonds) {
      // A bond to a missing atom is reported by checkGeometry.
      if (bond.a < orderSum.length) orderSum[bond.a]! += bond.order
      if (bond.b < orderSum.length) orderSum[bond.b]! += bond.order
    }
    molecule.atoms.forEach((atom, i) => {
      const element = elements.get(atom.element)
      if (!element) {
        errors.push(`${label}: atom ${i} has unknown element "${atom.element}"`)
        return
      }
      const expected = valenceElectrons(element) - 2 * atom.lonePairs - orderSum[i]!
      if (atom.formalCharge !== expected) {
        errors.push(`${label}: atom ${i} (${atom.element}) has formal charge ${atom.formalCharge}, expected ${expected}`)
      }
    })
    const total = molecule.atoms.reduce((sum, atom) => sum + atom.formalCharge, 0)
    if (total !== molecule.charge) errors.push(`${label}: formal charges sum to ${total}, but charge is ${molecule.charge}`)
  }
  return errors
}

// Cited experimental values must be reproduced by the stored coordinates (spec 6.5).
const LENGTH_TOLERANCE = 0.01
const ANGLE_TOLERANCE = 1

function checkMeasurements(registry: Registry): string[] {
  const errors: string[] = []
  for (const molecule of registry.molecules) {
    if (molecule.geometrySource !== 'cited-experimental' || !molecule.measurements) continue
    const { lengths, angles, dihedrals } = molecule.measurements
    const at = (i: number) => molecule.atoms[i]?.position
    const report = (kind: string, unit: string, atoms: readonly number[], cited: number, measured: number | undefined) => {
      const label = `molecule "${molecule.id}": ${kind} ${atoms.join('-')}`
      if (measured === undefined) {
        errors.push(`${label} refers to a missing atom`)
        return
      }
      // Dihedrals wrap: -179.9 and 180 are 0.1 apart.
      const difference =
        kind === 'dihedral' ? Math.abs(((measured - cited + 540) % 360) - 180) : Math.abs(measured - cited)
      // Written so that NaN (a degenerate atom set) fails.
      if (!(difference <= (kind === 'length' ? LENGTH_TOLERANCE : ANGLE_TOLERANCE))) {
        errors.push(`${label} measures ${measured.toFixed(3)} ${unit}, cited ${cited} ${unit}`)
      }
    }
    for (const { atoms, value } of lengths) {
      const [a, b] = atoms.map(at)
      report('length', 'Å', atoms, value, a && b && distance(a, b))
    }
    for (const { atoms, value } of angles) {
      const [a, b, c] = atoms.map(at)
      report('angle', '°', atoms, value, a && b && c && angleDeg(a, b, c))
    }
    for (const { atoms, value } of dihedrals) {
      const [a, b, c, d] = atoms.map(at)
      report('dihedral', '°', atoms, value, a && b && c && d && dihedralDeg(a, b, c, d))
    }
  }
  return errors
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

function checkProse(registry: Registry, names: readonly string[]): string[] {
  const errors: string[] = []
  walkStrings(registry, '', 'registry', (key, text, path) => {
    // Citations and URLs legitimately contain codes and years: check names only.
    // A hex colour such as "#FF8000" is a code, though its key is "value".
    if (HEX_COLOR.test(text)) return
    const reason =
      key === 'citation' || key === 'url'
        ? findName(text, names)
        : isProseKey(key)
          ? findInstitutionText(text, names)
          : null
    if (reason) errors.push(`${path}: ${reason}`)
  })
  return errors
}

/** Returns a list of problems; an empty list means the registry is valid. Never throws. */
export function validateRegistry(input: unknown, options: ValidateOptions = {}): string[] {
  const parsed = registrySchema.safeParse(input)
  if (!parsed.success) {
    return parsed.error.issues.map((issue) => `schema: ${issue.path.map(String).join('.')}: ${issue.message}`)
  }
  const registry = parsed.data
  return [
    ...checkSources(registry),
    ...checkReferences(registry),
    ...checkGeometry(registry),
    ...checkLewis(registry),
    ...checkMeasurements(registry),
    ...checkProse(registry, options.institutionNames ?? []),
  ]
}
