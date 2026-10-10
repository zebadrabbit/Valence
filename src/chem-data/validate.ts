import { findInstitutionText, findName } from './denylist'
import { valenceElectrons } from './element'
import { angleDeg, dihedralDeg, distance } from './geometry'
import { periodicTableSchema, registrySchema, type PeriodicElement, type Registry, type Source } from './schema'
import { aqueousSchema, type AqueousData } from './aqueous/data'
import { calorimetrySchema, type CalorimetryData } from './calorimetry/data'
import { cationsSchema, type CationsData } from './cations/data'
import { brightestOf, extentOf, flameSchema, rangeOf, type FlameData } from './flame/data'
import { titrationSchema } from './titration/data'

export interface ValidateOptions {
  institutionNames?: readonly string[]
}

// Keys whose strings are identifiers or codes, not prose.
const CODE_KEYS = new Set(['id', 'formula', 'displayFormula', 'hex', 'element', 'symbol', 'unit', 'precipitate', 'gas', 'variantGroup', 'colouredIons', 'paletteSpecies'])
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

export function duplicates(ids: readonly string[], label: string): string[] {
  const seen = new Set<string>()
  const errors: string[] = []
  for (const id of ids) {
    if (seen.has(id)) errors.push(`${label}: duplicate id "${id}"`)
    seen.add(id)
  }
  return errors
}

export function checkSourceIds(data: unknown, root: string, sources: readonly Source[]): string[] {
  const errors: string[] = []
  const known = new Set(sources.map((s) => s.id))
  walkStrings(data, '', root, (key, text, path) => {
    if ((key === 'sourceId' || key === 'alsoSourceId' || key === 'moreSourceIds') && !known.has(text)) errors.push(`${path}: unknown source "${text}"`)
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
  return [
    ...checkBench(registry),
    ...duplicates(registry.elements.map((e) => e.symbol), 'elements'),
    ...duplicates(registry.molecules.map((m) => m.id), 'molecules'),
    ...duplicates(registry.moDiagrams.map((d) => d.moleculeId), 'MO diagrams'),
  ]
}

/** The ids of a lab bench: each species, reagent and station named once, and every id a record names one that exists. */
function checkBench({ species: allSpecies, reagents: allReagents, observations, stations }: Pick<Registry, 'species' | 'reagents' | 'observations' | 'stations'>): string[] {
  const errors = [
    ...duplicates(allSpecies.map((s) => s.id), 'species'),
    ...duplicates(allReagents.map((r) => r.id), 'reagents'),
    ...duplicates(stations.map((s) => s.id), 'stations'),
  ]
  const species = new Set(allSpecies.map((s) => s.id))
  const reagents = new Set(allReagents.map((r) => r.id))
  const unknown = (owner: string, ids: readonly (string | null | undefined)[]) => {
    for (const id of ids) if (typeof id === 'string' && !species.has(id)) errors.push(`${owner}: unknown species "${id}"`)
  }

  for (const one of allSpecies) unknown(`species "${one.id}"`, one.ions?.map((ion) => ion.speciesId) ?? [])
  for (const reagent of allReagents) unknown(`reagent "${reagent.id}"`, [...reagent.ions.map((ion) => ion.speciesId), reagent.speciesId])
  unknown('observation', observations.map((observation) => observation.productId))
  for (const station of stations) {
    for (const reagentId of station.reagentIds) {
      if (!reagents.has(reagentId)) errors.push(`station "${station.id}": unknown reagent "${reagentId}"`)
    }
    const terms = Object.values(station.equations).flatMap((equation) => (equation ? [...equation.reactants, ...equation.products] : []))
    unknown(`station "${station.id}"`, [station.expected.precipitate, station.expected.gas, ...station.expected.colouredIons, ...station.paletteSpecies, ...terms.map((term) => term.speciesId)])
  }
  return errors
}

// A PubChem 2D drawing has unit-length heavy-atom bonds and shorter bonds to H.
// The bond of H₂ is the one real bond shorter than 0.80 Å (0.741 Å), so a bond between two hydrogens has its own floor.
const MIN_BOND_TO_H = 0.8
const MIN_H_H_BOND = 0.7
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
      const hydrogens = [a, b].filter((atom) => atom.element === 'H').length
      const minimum = [MIN_HEAVY_BOND, MIN_BOND_TO_H, MIN_H_H_BOND][hydrogens]!
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

export function checkPublished(value: unknown, path: string): string[] {
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

export function checkProse(data: unknown, root: string, names: readonly string[]): string[] {
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

export const schemaErrors = (issues: readonly { path: PropertyKey[]; message: string }[]) =>
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

/**
 * Checks the aqueous reactions lab's record against the sources it cites: the schema, that every source named
 * exists, that every id a record names is one the record holds, that each `published` reads as the number stored
 * beside it, and that no name, note, hint, caution or rationale holds institution text. Returns a list of problems;
 * an empty list means the record is valid. Never throws, whatever it is given. That each value is what its source
 * prints is the build script's to hold to the manifest; that the chemistry is consistent (the equations balance,
 * the engine reaches each station's expected result) is tested with the engine.
 */
export function validateAqueous(input: unknown, sources: readonly Source[], options: ValidateOptions = {}): string[] {
  const parsed = aqueousSchema.safeParse(input)
  if (!parsed.success) return schemaErrors(parsed.error.issues)
  const data: AqueousData = parsed.data
  const names = options?.institutionNames
  const species = new Set(data.species.map((s) => s.id))
  const tables = [
    ...data.solubility.flatMap((row) => [row.cationId, row.anionId, row.precipitateId]),
    ...data.activitySeries.flatMap((row) => [row.metalId, row.ionId]),
  ].flatMap((id) => (id === undefined || species.has(id) ? [] : [`tables: unknown species "${id}"`]))
  return [
    ...checkBench(data),
    ...tables,
    ...checkSourceIds(data, 'aqueous', Array.isArray(sources) ? sources : []),
    ...checkPublished(data, 'aqueous'),
    ...checkProse(data, 'aqueous', Array.isArray(names) ? names : []),
  ]
}

/** A boundary between two answer ranges is kept at least this far, in nm, from every salt's brightest feature as drawn. */
const RANGE_MARGIN_NM = 5

/** What the flame test lab's record must hold together beyond its shape: its ids, its ranks, its scale and its answer ranges. */
function checkFlame(data: FlameData): string[] {
  const errors = [...duplicates(data.salts.map((s) => s.id), 'salts'), ...duplicates(data.salts.flatMap((s) => s.features.map((f) => f.id)), 'features'), ...duplicates(data.closing.choices, 'closing choices')]
  // Each flame is a choice of the question about its colour, so two salts cannot share a name.
  errors.push(...duplicates(data.salts.map((s) => s.flame.value.name), 'flame colours'))
  const salts = new Set(data.salts.map((s) => s.id))
  for (const [name, saltId] of [['handling', data.handling.value], ['masking', data.masking.value]] as const) {
    if (!salts.has(saltId)) errors.push(`${name}: unknown salt "${saltId}"`)
  }
  if (!data.closing.choices.includes(data.closing.answer.value)) errors.push(`closing: the answer "${data.closing.answer.value}" is not one of the choices`)

  const { scale } = data
  const ranges = data.parameters.ranges.value
  const joined = ranges.every(([from, to], i) => from < to && from === (i === 0 ? scale.fromNm : ranges[i - 1]![1]))
  if (!joined || ranges[ranges.length - 1]![1] !== scale.toNm) errors.push('ranges: the answer ranges must cover the scale from end to end, each starting where the one before stops')
  const within = data.parameters.unresolvedWithinNm.value

  for (const salt of data.salts) {
    const where = `salt "${salt.id}"`
    const ranks = salt.features.map((f) => f.prominence).sort((a, b) => a - b)
    if (ranks.some((rank, i) => rank !== i + 1)) errors.push(`${where}: the ranks of its features must be 1, 2, 3 and so on, each once`)
    const lines = salt.features.flatMap((f) => (f.kind === 'line' ? [f] : []))
    for (const feature of salt.features) {
      const at = `${where}: feature "${feature.id}"`
      const { fromNm, toNm } = extentOf(data, feature)
      if (fromNm < scale.fromNm || toNm > scale.toNm) errors.push(`${at} is not on the scale`)
      if (feature.kind === 'band' && (feature.fromNm > feature.toNm || (!feature.approximate && feature.fromNm === feature.toNm))) errors.push(`${at}: a band runs from a shorter wavelength to a longer one`)
      if (feature.kind === 'line' && toNm - fromNm >= within) errors.push(`${at}: its pair is ${within} nm or more apart, which is two lines`)
    }
    lines.forEach((line, i) => {
      for (const other of lines.slice(i + 1)) {
        const [a, b] = [extentOf(data, line), extentOf(data, other)]
        if (Math.max(a.fromNm, b.fromNm) - Math.min(a.toNm, b.toNm) < within) errors.push(`${where}: the lines "${line.id}" and "${other.id}" are closer than ${within} nm, which is one feature`)
      }
    })
    if (ranks[0] !== 1) continue
    const brightest = brightestOf(salt)
    const range = rangeOf(data, brightest)
    const extent = extentOf(data, brightest)
    const clear = range !== undefined && (range[0] === scale.fromNm || extent.fromNm - range[0] >= RANGE_MARGIN_NM) && (range[1] === scale.toNm || range[1] - extent.toNm >= RANGE_MARGIN_NM)
    if (!clear) errors.push(`${where}: its brightest feature, "${brightest.id}", does not lie plainly inside one answer range`)
  }
  return errors
}

/**
 * Checks the flame test lab's record against the sources it cites: the schema; that its ids, ranks, scale and
 * answer ranges hold together, with each salt's brightest feature plainly inside one range; that every source
 * named exists; that each `published` reads as the number stored beside it; and that no name, note or rationale
 * holds institution text. Returns a list of problems; an empty list means the record is valid. Never throws,
 * whatever it is given. That each value is what its source prints is the build script's to hold to the manifest
 * and to the saved NIST tables.
 */
export function validateFlame(input: unknown, sources: readonly Source[], options: ValidateOptions = {}): string[] {
  const parsed = flameSchema.safeParse(input)
  if (!parsed.success) return schemaErrors(parsed.error.issues)
  const names = options?.institutionNames
  return [
    ...checkFlame(parsed.data),
    ...checkSourceIds(parsed.data, 'flame', Array.isArray(sources) ? sources : []),
    ...checkPublished(parsed.data, 'flame'),
    ...checkProse(parsed.data, 'flame', Array.isArray(names) ? names : []),
  ]
}

/** What the calorimetry lab's record must hold together beyond its shape: its ids, what goes into each cup, the four candidates, and ranges that run upward. */
function checkCalorimetry(data: CalorimetryData): string[] {
  const errors = [...duplicates(data.reagents.map((r) => r.id), 'reagents')]
  const [, , metal] = data.parts
  const known = new Set([...data.reagents.map((r) => r.id), 'water'])
  for (const part of data.parts) {
    if (part.id !== 'metal') errors.push(...duplicates(part.enthalpy.terms.map((t) => t.id), `part "${part.id}": terms`), ...duplicates(part.enthalpy.infiniteDilution.terms.map((t) => t.id), `part "${part.id}": terms at endless dilution`))
    // The piece of part 3 is named by no reagent: which of the candidates it is, is the run's to find.
    for (const amount of part.amounts) if (!known.has(amount.reagentId) && !(part.id === 'metal' && 'about' in amount)) errors.push(`part "${part.id}": unknown reagent "${amount.reagentId}"`)
  }
  errors.push(...duplicates(metal.candidateIds, 'candidates'))
  for (const candidate of metal.candidateIds) if (!data.reagents.some((r) => r.id === candidate && r.form === 'metal')) errors.push(`candidates: "${candidate}" is not a metal of the record`)
  for (const [name, parameter] of Object.entries(data.parameters)) {
    if (Array.isArray(parameter.value) && parameter.value[0] > parameter.value[1]) errors.push(`parameters.${name}: a range runs from its lower end to its upper`)
  }
  return errors
}

/**
 * Checks the calorimetry lab's record against the sources it cites: the schema; that its ids hold together; that
 * every source named exists; that each `published` reads as the number stored beside it; and that no name, note,
 * working or rationale holds institution text. Returns a list of problems; an empty list means the record is
 * valid. Never throws, whatever it is given. That each value is what its source prints is the build script's to
 * hold to the manifest, and the values worked out from cited ones are worked out again there.
 */
export function validateCalorimetry(input: unknown, sources: readonly Source[], options: ValidateOptions = {}): string[] {
  const parsed = calorimetrySchema.safeParse(input)
  if (!parsed.success) return schemaErrors(parsed.error.issues)
  const names = options?.institutionNames
  return [
    ...checkCalorimetry(parsed.data),
    ...checkSourceIds(parsed.data, 'calorimetry', Array.isArray(sources) ? sources : []),
    ...checkPublished(parsed.data, 'calorimetry'),
    ...checkProse(parsed.data, 'calorimetry', Array.isArray(names) ? names : []),
  ]
}

/** What the Group I cations lab's record must hold together beyond its shape: its ids, and every id one part of it names in another. */
function checkCations(data: CationsData): string[] {
  const errors = [
    ...duplicates(data.reagents.map((r) => r.id), 'reagents'),
    ...duplicates(data.ions.map((i) => i.id), 'ions'),
    ...duplicates(data.substances.map((s) => s.id), 'substances'),
    ...duplicates(data.rules.map((r) => r.id), 'rules'),
    ...duplicates(data.gibbs.map((g) => g.id), 'Gibbs energies'),
    ...duplicates(data.equilibria.map((e) => e.id), 'equilibria'),
    ...duplicates(data.chart.places.map((p) => p.id), 'places'),
    ...duplicates(data.chart.tileIds, 'tiles'),
    ...duplicates(data.choices.solid, 'choices of a solid'),
    ...duplicates(data.choices.liquid, 'choices of a liquid'),
  ]
  const has = (ids: readonly string[]) => new Set(ids)
  const reagents = has([...data.reagents.map((r) => r.id), 'water'])
  const substances = has(data.substances.map((s) => s.id))
  const rules = has(data.rules.map((r) => r.id))
  const gibbs = has(data.gibbs.map((g) => g.id))
  const equilibria = has(data.equilibria.map((e) => e.id))
  const tiles = has(data.chart.tileIds)
  const steps = has(data.steps.map((s) => s.id))
  const unknown = (owner: string, kind: string, ids: readonly string[], known: Set<string>) => {
    for (const id of ids) if (!known.has(id)) errors.push(`${owner}: unknown ${kind} "${id}"`)
  }
  for (const ion of data.ions) {
    unknown(`ion "${ion.id}"`, 'reagent', [ion.reagentId], reagents)
    unknown(`ion "${ion.id}"`, 'substance', [ion.chlorideId], substances)
  }
  for (const equilibrium of data.equilibria) unknown(`equilibrium "${equilibrium.id}"`, 'Gibbs energy', equilibrium.terms.map((term) => term.gibbsId), gibbs)
  for (const step of data.steps) {
    unknown(`step "${step.id}"`, 'reagent', step.reagentIds, reagents)
    unknown(`step "${step.id}"`, 'rule', step.ruleIds, rules)
    unknown(`step "${step.id}"`, 'substance', step.substanceIds, substances)
    unknown(`step "${step.id}"`, 'equilibrium', step.equilibriumIds, equilibria)
  }
  unknown('chart', 'substance', data.chart.tileIds, substances)
  for (const place of data.chart.places) {
    unknown(`place "${place.id}"`, 'step', [place.stepId], steps)
    unknown(`place "${place.id}"`, 'tile', place.holds, tiles)
    errors.push(...duplicates(place.holds, `place "${place.id}"`))
  }
  // Every look a substance has is one an observation can record: a solid's among the choices of a solid, a dissolved thing's among those of the liquid.
  for (const substance of data.substances) {
    if (substance.state === 's' && substance.look === undefined) errors.push(`substance "${substance.id}": a solid needs a look`)
    const choices = substance.state === 's' ? data.choices.solid : data.choices.liquid
    if (substance.look !== undefined && !choices.includes(substance.look.value)) errors.push(`substance "${substance.id}": its look, "${substance.look.value}", is not a choice of the observation`)
  }
  return errors
}

/**
 * Checks the Group I cations lab's record against the sources it cites: the schema; that its ids hold together;
 * that every source named exists; that each `published` reads as the number stored beside it; and that no name,
 * note, working or rationale holds institution text. Returns a list of problems; an empty list means the record
 * is valid. Never throws, whatever it is given. That each value is what its source prints is the build script's to
 * hold to the manifest; the values worked out from cited ones are worked out again there, and the rules are
 * checked against the numbers there.
 */
export function validateCations(input: unknown, sources: readonly Source[], options: ValidateOptions = {}): string[] {
  const parsed = cationsSchema.safeParse(input)
  if (!parsed.success) return schemaErrors(parsed.error.issues)
  const names = options?.institutionNames
  return [
    ...checkCations(parsed.data),
    ...checkSourceIds(parsed.data, 'cations', Array.isArray(sources) ? sources : []),
    ...checkPublished(parsed.data, 'cations'),
    ...checkProse(parsed.data, 'cations', Array.isArray(names) ? names : []),
  ]
}
