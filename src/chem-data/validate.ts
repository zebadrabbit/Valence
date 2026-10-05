import { findInstitutionText, findName } from './denylist'
import { valenceElectrons } from './element'
import { angleDeg, dihedralDeg, distance } from './geometry'
import { periodicTableSchema, registrySchema, type PeriodicElement, type Registry, type Source } from './schema'
import { titrationSchema } from './titration/data'

export interface ValidateOptions {
  institutionNames?: readonly string[]
}

// Keys whose strings are identifiers or codes, not prose.
const CODE_KEYS = new Set(['id', 'formula', 'displayFormula', 'hex', 'element', 'symbol', 'unit', 'precipitate', 'gas', 'variantGroup'])
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

function checkSourceIds(data: unknown, root: string, sources: readonly Source[]): string[] {
  const errors: string[] = []
  const known = new Set(sources.map((s) => s.id))
  walkStrings(data, '', root, (key, text, path) => {
    if (key === 'sourceId' && !known.has(text)) errors.push(`${path}: unknown source "${text}"`)
  })
  return errors
}

function checkSources(registry: Registry): string[] {
  return [
    ...duplicates(
      registry.sources.map((s) => s.id),
      'sources',
    ),
    ...checkSourceIds(registry, 'registry', registry.sources),
  ]
}

function checkReferences(registry: Registry): string[] {
  const errors = [
    ...duplicates(registry.species.map((s) => s.id), 'species'),
    ...duplicates(registry.reagents.map((r) => r.id), 'reagents'),
    ...duplicates(registry.stations.map((s) => s.id), 'stations'),
    ...duplicates(registry.elements.map((e) => e.symbol), 'elements'),
    ...duplicates(registry.molecules.map((m) => m.id), 'molecules'),
    ...duplicates(registry.moDiagrams.map((d) => d.moleculeId), 'MO diagrams'),
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

function checkStructure(registry: Registry): string[] {
  const errors: string[] = []
  for (const molecule of registry.molecules) {
    if ((molecule.variantGroup === undefined) !== (molecule.variantLabel === undefined)) {
      errors.push(`molecule "${molecule.id}": variantGroup and variantLabel must be given together`)
    }
    if (molecule.displayFormula !== undefined && molecule.displayFormula.replace(/[+-]/g, '') !== molecule.formula) {
      errors.push(`molecule "${molecule.id}": displayFormula must be the formula with charge markers added`)
    }
    const joined = new Set<string>()
    for (const bond of molecule.bonds) {
      const pair = `${Math.min(bond.a, bond.b)}-${Math.max(bond.a, bond.b)}`
      if (joined.has(pair)) errors.push(`molecule "${molecule.id}": duplicate bond ${pair}`)
      joined.add(pair)
      const a = molecule.atoms[bond.a]
      const b = molecule.atoms[bond.b]
      const label = `molecule "${molecule.id}": bond ${bond.a}-${bond.b}`
      if (!a || !b || bond.a === bond.b) {
        errors.push(`${label} refers to a missing atom`)
        continue
      }
      const length = distance(a.position, b.position)
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
      // A bond to a missing atom is reported by checkStructure.
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

// A diagram holds the valence electrons of a molecule that exists, at most two per orbital.
function checkMoDiagrams(registry: Registry): string[] {
  const errors: string[] = []
  const elements = new Map(registry.elements.map((e) => [e.symbol, e]))
  for (const diagram of registry.moDiagrams) {
    const label = `MO diagram "${diagram.moleculeId}"`
    const molecule = registry.molecules.find((m) => m.id === diagram.moleculeId)
    if (!molecule) {
      errors.push(`${label}: unknown molecule "${diagram.moleculeId}"`)
      continue
    }
    for (const level of diagram.levels) {
      if (level.electrons > 2 * level.degeneracy) {
        errors.push(`${label}: level "${level.label}" holds ${level.electrons} electrons, more than ${2 * level.degeneracy}`)
      }
    }
    // An atom of an unknown element is reported by checkLewis.
    const valence =
      molecule.atoms.reduce((sum, atom) => {
        const element = elements.get(atom.element)
        return sum + (element ? valenceElectrons(element) : 0)
      }, 0) - molecule.charge
    const total = diagram.levels.reduce((sum, level) => sum + level.electrons, 0)
    if (total !== valence) errors.push(`${label}: holds ${total} electrons, but the molecule has ${valence} valence electrons`)
  }
  return errors
}

// Cited experimental values must be reproduced by the stored coordinates (spec 6.5),
// and every bond of a cited-experimental molecule must have a cited length.
const LENGTH_TOLERANCE = 0.01
const ANGLE_TOLERANCE = 1

function checkMeasurements(registry: Registry): string[] {
  const errors: string[] = []
  for (const molecule of registry.molecules) {
    if (molecule.geometrySource !== 'cited-experimental') {
      if (molecule.measurements) errors.push(`molecule "${molecule.id}": a computed conformer must not carry measurements`)
      continue
    }
    if (!molecule.measurements) {
      errors.push(`molecule "${molecule.id}": cited experimental geometry needs measurements`)
      continue
    }
    const { lengths, angles, dihedrals } = molecule.measurements
    for (const { a, b } of molecule.bonds) {
      if (!lengths.some(({ atoms: [x, y] }) => (x === a && y === b) || (x === b && y === a))) {
        errors.push(`molecule "${molecule.id}": bond ${a}-${b} has no cited length`)
      }
    }
    // A bent or branched atom needs a cited angle at its vertex, or its angle could drift unchecked.
    molecule.atoms.forEach((_, i) => {
      const bonded = molecule.bonds.filter((b) => b.a === i || b.b === i).length
      if (bonded >= 2 && !angles.some(({ atoms: [, vertex] }) => vertex === i)) {
        errors.push(`molecule "${molecule.id}": atom ${i} is bonded to ${bonded} atoms but has no cited angle`)
      }
    })
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
    // A value is a figure its source prints, or follows from the point group the source states, or both: never neither.
    for (const [kind, list] of [['length', lengths], ['angle', angles], ['dihedral', dihedrals]] as const) {
      for (const { atoms, published, symmetry } of list) {
        if (published === undefined && symmetry === undefined) {
          errors.push(`molecule "${molecule.id}": ${kind} ${atoms.join('-')} has no printed figure, so it must name the point group it follows from`)
        }
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

// A `published` string is the source's own text for the number stored beside it, so it must read as that number.
// That one is present wherever the source prints a figure is not checked here, beyond a molecule's measurements
// (above): the build script fails on a missing one, and registry.test.ts pins the values that have none.
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/

function checkPublished(value: unknown, path: string): string[] {
  if (Array.isArray(value)) return value.flatMap((item, i) => checkPublished(item, `${path}[${i}]`))
  if (!value || typeof value !== 'object') return []
  const errors = Object.entries(value).flatMap(([key, child]) => checkPublished(child, `${path}.${key}`))
  const { published, value: stored } = value as { published?: unknown; value?: unknown }
  if (typeof published === 'string' && !(PLAIN_NUMBER.test(published) && Number(published) === stored)) {
    errors.push(`${path}: published "${published}" is not the stored value ${String(stored)}`)
  }
  return errors
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

function checkProse(data: unknown, root: string, names: readonly string[]): string[] {
  const errors: string[] = []
  walkStrings(data, '', root, (key, text, path) => {
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
  if (!parsed.success) return schemaErrors(parsed.error.issues)
  const registry = parsed.data
  return [
    ...checkSources(registry),
    ...checkReferences(registry),
    ...checkStructure(registry),
    ...checkLewis(registry),
    ...checkMeasurements(registry),
    ...checkMoDiagrams(registry),
    ...checkPublished(registry, 'registry'),
    ...checkProse(registry, 'registry', options.institutionNames ?? []),
  ]
}

const schemaErrors = (issues: readonly { path: PropertyKey[]; message: string }[]) =>
  issues.map((issue) => `schema: ${issue.path.map(String).join('.')}: ${issue.message}`)

function checkNumbering(table: readonly PeriodicElement[]): string[] {
  return table.flatMap((element, i) =>
    element.atomicNumber === i + 1 ? [] : [`periodic table: position ${i + 1} holds atomic number ${element.atomicNumber}`],
  )
}

// The mass shown for an element with no standard atomic weight is that of the isotope named beside it.
function checkIsotopeMasses(table: readonly PeriodicElement[]): string[] {
  return table.flatMap(({ symbol, atomicMass }) =>
    atomicMass.kind === 'isotope-mass' && Math.round(atomicMass.value) !== atomicMass.massNumber
      ? [`periodic table: ${symbol}: mass ${atomicMass.published} does not round to mass number ${atomicMass.massNumber}`]
      : [],
  )
}

function checkNames(table: readonly PeriodicElement[]): string[] {
  const names = table.map((e) => e.name)
  return [...new Set(names.filter((name, i) => names.indexOf(name) !== i))].map((name) => `periodic table: duplicate name "${name}"`)
}

function checkRepeatedNotes(table: readonly PeriodicElement[]): string[] {
  return table.flatMap(({ symbol, notes = [] }) =>
    notes
      .filter((note, i) => notes.findIndex((other) => other.row === note.row && other.text === note.text) !== i)
      .map((note) => `periodic table: ${symbol}: the note on ${note.row} is given twice`),
  )
}

/**
 * Checks the periodic table against the sources it cites. Returns a list of problems; an empty list
 * means the table is valid. Never throws, whatever it is given: a missing list of sources counts as no sources.
 * Which source each kind of value must cite, and that the configurations hold the right number of electrons,
 * are checked by the build script and pinned in periodic.test.ts, not here.
 */
export function validatePeriodicTable(input: unknown, sources: readonly Source[], options: ValidateOptions = {}): string[] {
  const parsed = periodicTableSchema.safeParse(input)
  if (!parsed.success) return schemaErrors(parsed.error.issues)
  const table = parsed.data
  if (table.length !== 118) return [`schema: : expected 118 elements, found ${table.length}`]
  const names = options?.institutionNames
  return [
    ...checkNumbering(table),
    ...duplicates(table.map((e) => e.symbol), 'periodic table'),
    ...checkNames(table),
    ...checkIsotopeMasses(table),
    ...checkRepeatedNotes(table),
    ...checkSourceIds(table, 'periodicTable', Array.isArray(sources) ? sources : []),
    ...checkPublished(table, 'periodicTable'),
    ...checkProse(table, 'periodicTable', Array.isArray(names) ? names : []),
  ]
}

/**
 * Checks the titration lab's record against the sources it cites: the schema, that every source named exists, that
 * each `published` reads as the number stored beside it, and that no name, statement, note or rationale holds
 * institution text. Returns a list of problems; an empty list means the record is valid. Never throws, whatever it
 * is given. That each value is what its source prints is checked by the build script against the kept copies.
 */
export function validateTitration(input: unknown, sources: readonly Source[], options: ValidateOptions = {}): string[] {
  const parsed = titrationSchema.safeParse(input)
  if (!parsed.success) return schemaErrors(parsed.error.issues)
  const names = options?.institutionNames
  return [
    ...checkSourceIds(parsed.data, 'titration', Array.isArray(sources) ? sources : []),
    ...checkPublished(parsed.data, 'titration'),
    ...checkProse(parsed.data, 'titration', Array.isArray(names) ? names : []),
  ]
}
