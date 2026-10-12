import { findInstitutionText, findName } from './denylist'
import { valenceElectrons } from './element'
import { angleDeg, dihedralDeg, distance } from './geometry'
import { periodicTableSchema, registrySchema, type PeriodicElement, type Registry, type Source } from './schema'
import { aqueousSchema, type AqueousData } from './aqueous/data'
import { calorimetrySchema, type CalorimetryData } from './calorimetry/data'
import { acetoneSchema, type AcetoneData } from './acetone/data'
import { cabbageSchema, type CabbageData } from './cabbage/data'
import { densitySchema, type DensityData } from './density/data'
import { freezingSchema, type FreezingData } from './freezing/data'
import { FIELD_AT, reactionsSchema, type ReactionsData } from './reactions/data'
import { clockSchema, type ClockData } from './clock/data'
import { cationsSchema, type CationsData } from './cations/data'
import { brightestOf, extentOf, flameSchema, rangeOf, type FlameData } from './flame/data'
import { DISTURBANCE_IDS, lechatelierSchema, type LechatelierData } from './lechatelier/data'
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

/** What the Le Chatelier's principle lab's record must hold together beyond its shape: its ids, every id one part of it names in another, and what its tubes are stored as showing. */
function checkLechatelier(data: LechatelierData): string[] {
  const disturbances = data.systems.flatMap((system) => system.disturbances)
  const errors = [
    ...duplicates(data.reagents.map((r) => r.id), 'reagents'),
    ...duplicates(data.substances.map((s) => s.id), 'substances'),
    ...duplicates(data.rules.map((r) => r.id), 'rules'),
    ...duplicates(data.gibbs.map((g) => g.id), 'Gibbs energies'),
    ...duplicates(data.enthalpies.map((e) => e.id), 'enthalpies'),
    ...duplicates(data.equilibriumConstants.map((c) => c.id), 'constants'),
    ...duplicates(data.heats.map((h) => h.id), 'heats'),
    ...duplicates(data.equilibria.map((e) => e.id), 'equilibria'),
    ...duplicates(data.systems.flatMap((system) => system.tubes.map((t) => t.id)), 'tubes'),
    ...duplicates(data.choices.solid, 'choices of a solid'),
    ...duplicates(data.choices.liquid, 'choices of a liquid'),
  ]
  if (disturbances.map((d) => d.id).join() !== DISTURBANCE_IDS.join()) errors.push('disturbances: they are not the seventeen the lab names, each once and in their order')
  const has = (ids: readonly string[]) => new Set(ids)
  const reagents = has([...data.reagents.map((r) => r.id), 'water'])
  const substances = has(data.substances.map((s) => s.id))
  const rules = has(data.rules.map((r) => r.id))
  const gibbs = has(data.gibbs.map((g) => g.id))
  const enthalpies = has(data.enthalpies.map((e) => e.id))
  const constants = has(data.equilibriumConstants.map((c) => c.id))
  const heats = has(data.heats.map((h) => h.id))
  const parameters = has(Object.keys(data.parameters))
  const unknown = (owner: string, kind: string, ids: readonly string[], known: Set<string>) => {
    for (const id of ids) if (!known.has(id)) errors.push(`${owner}: unknown ${kind} "${id}"`)
  }
  const shows = (owner: string, stage: { liquid: string; solid: string }) => {
    if (!data.choices.liquid.includes(stage.liquid)) errors.push(`${owner}: its liquid, "${stage.liquid}", is not a choice of the observation`)
    if (!data.choices.solid.includes(stage.solid)) errors.push(`${owner}: its solid, "${stage.solid}", is not a choice of the observation`)
  }
  for (const constant of data.equilibriumConstants) unknown(`constant "${constant.id}"`, 'Gibbs energy', constant.terms.map((term) => term.gibbsId), gibbs)
  for (const heat of data.heats) unknown(`heat "${heat.id}"`, 'enthalpy', heat.terms.map((term) => term.enthalpyId), enthalpies)
  unknown('indicator', 'reagent', [data.indicator.reagentId], reagents)
  for (const look of Object.values(data.indicator.looks)) if (!data.choices.liquid.includes(look.value)) errors.push(`indicator: its look "${look.value}" is not a choice of the observation`)
  if (data.indicator.range.from.value >= data.indicator.range.to.value) errors.push('indicator: its range runs from its lower end to its upper')
  // Every look a substance has is one an observation can record: a solid's among the choices of a solid, a dissolved thing's among those of the liquid.
  for (const substance of data.substances) {
    if (substance.state === 's' && substance.look === undefined) errors.push(`substance "${substance.id}": a solid needs a look`)
    const choices = substance.state === 's' ? data.choices.solid : data.choices.liquid
    if (substance.look !== undefined && !choices.includes(substance.look.value)) errors.push(`substance "${substance.id}": its look, "${substance.look.value}", is not a choice of the observation`)
  }
  for (const equilibrium of data.equilibria) {
    const owner = `equilibrium "${equilibrium.id}"`
    unknown(owner, 'substance', equilibrium.substanceIds, substances)
    if (equilibrium.heat?.heatId !== undefined) unknown(owner, 'heat', [equilibrium.heat.heatId], heats)
    if (equilibrium.numbers) unknown(owner, 'constant', Object.values(equilibrium.numbers), constants)
    if (equilibrium.seenBy.kind === 'colour') {
      const colours = [equilibrium.seenBy.left, equilibrium.seenBy.right, ...(equilibrium.seenBy.between === undefined ? [] : [equilibrium.seenBy.between])]
      for (const colour of colours) if (!data.choices.liquid.includes(colour)) errors.push(`${owner}: its colour "${colour}" is not a choice of the observation`)
      if (new Set(colours).size !== colours.length) errors.push(`${owner}: two of its colours are one colour, so no shift could be seen`)
    }
  }
  for (const system of data.systems) {
    const tubes = has(system.tubes.map((t) => t.id))
    const begun = new Set<string>()
    unknown(`system "${system.id}"`, 'equilibrium', system.equilibriumIds, has(data.equilibria.map((e) => e.id)))
    for (const tube of system.tubes) {
      const owner = `tube "${tube.id}"`
      if ('shareOf' in tube) {
        unknown(owner, 'tube', [tube.shareOf], tubes)
        if (!system.tubes.some((other) => other.id === tube.shareOf && 'contents' in other)) errors.push(`${owner}: it takes a share of a tube that is itself a share, or is not of this system`)
        continue
      }
      unknown(owner, 'reagent', tube.contents.map((c) => c.reagentId), reagents)
      unknown(owner, 'parameter', tube.contents.map((c) => ('drops' in c ? c.drops : c.grams)), parameters)
      shows(owner, tube.shows)
      if (system.heldBy === 'observation' && tube.shows.sourceId === undefined) errors.push(`${owner}: what it shows is a stored observation and needs a source`)
    }
    for (const disturbance of system.disturbances) {
      const owner = `disturbance "${disturbance.id}"`
      unknown(owner, 'tube', [disturbance.tube], tubes)
      unknown(owner, 'equilibrium', [disturbance.equilibriumId], has(system.equilibriumIds))
      unknown(owner, 'rule', disturbance.ruleIds, rules)
      unknown(owner, 'constant', disturbance.constantIds, constants)
      const { action } = disturbance
      if (action.kind === 'add') {
        unknown(owner, 'reagent', [action.reagentId], reagents)
        unknown(owner, 'parameter', [action.drops, ...(action.portions === undefined ? [] : [action.portions])], parameters)
      }
      const portions = action.kind === 'add' && action.portions !== undefined ? (data.parameters as Record<string, { value: number } | undefined>)[action.portions]?.value : 1
      if (portions !== undefined && disturbance.stages.length !== portions) errors.push(`${owner}: ${disturbance.stages.length} stages are stored for ${portions} ${portions === 1 ? 'portion' : 'portions'}`)
      disturbance.stages.forEach((stage, at) => {
        shows(`${owner}, stage ${at + 1}`, stage)
        if (system.heldBy === 'observation' && stage.sourceId === undefined) errors.push(`${owner}, stage ${at + 1}: what the tube shows is a stored observation and needs a source`)
      })
      // A share is taken of a tube that something has already been done to, and a tube is begun once.
      const tube = system.tubes.find((t) => t.id === disturbance.tube)
      if (tube && 'shareOf' in tube && !begun.has(tube.shareOf)) errors.push(`${owner}: its tube takes a share of a tube that nothing has yet been done to`)
      begun.add(disturbance.tube)
      const equilibrium = data.equilibria.find((e) => e.id === disturbance.equilibriumId)
      if (equilibrium && disturbance.ask.kind === 'cause' && equilibrium.seenBy.kind !== 'solid') errors.push(`${owner}: what took the ion away is asked only of a solid and its ions`)
      if (equilibrium && action.kind !== 'add' && equilibrium.heat === undefined) errors.push(`${owner}: the tube is heated or cooled, and its equilibrium says nothing of heat`)
    }
  }
  return errors
}

/**
 * Checks the Le Chatelier's principle lab's record against the sources it cites: the schema; that its ids hold
 * together and its tubes show only what an observation can record; that every source named exists; that each
 * `published` reads as the number stored beside it; and that no name, note, working or rationale holds institution
 * text. Returns a list of problems; an empty list means the record is valid. Never throws, whatever it is given.
 * That each value is what its source prints is the build script's to hold to the manifest; the values worked out
 * from cited ones are worked out again there, and what the tubes show is checked against the numbers there.
 */
export function validateLechatelier(input: unknown, sources: readonly Source[], options: ValidateOptions = {}): string[] {
  const parsed = lechatelierSchema.safeParse(input)
  if (!parsed.success) return schemaErrors(parsed.error.issues)
  const names = options?.institutionNames
  return [
    ...checkLechatelier(parsed.data),
    ...checkSourceIds(parsed.data, 'lechatelier', Array.isArray(sources) ? sources : []),
    ...checkPublished(parsed.data, 'lechatelier'),
    ...checkProse(parsed.data, 'lechatelier', Array.isArray(names) ? names : []),
  ]
}

/** What the clock reaction lab's record must hold together beyond its shape: its ids, and every id one part of it names in another. */
function checkClock(data: ClockData): string[] {
  const errors = [
    ...duplicates(data.reagents.map((r) => r.id), 'reagents'),
    ...duplicates(data.reactions.map((r) => r.id), 'reactions'),
    ...duplicates(data.rateLaw.reactants.map((r) => r.id), 'reactants'),
    ...duplicates(data.mixtures.map((m) => m.id), 'mixtures'),
    ...duplicates(data.baths.map((b) => b.id), 'baths'),
  ]
  const bottles = new Set(data.reagents.map((r) => r.id))
  const { rateLaw } = data
  if (!data.reactions.some((r) => r.id === rateLaw.reactionId)) errors.push(`rateLaw: unknown reaction "${rateLaw.reactionId}"`)
  for (const reactant of rateLaw.reactants) {
    const bottle = data.reagents.find((r) => r.id === reactant.reagentId)
    if (!bottle || bottle.form !== 'solution') errors.push(`reactant "${reactant.id}": "${reactant.reagentId}" is not a solution of the record`)
    if (!data.mixtures.some((m) => m.id === reactant.comparedIn)) errors.push(`reactant "${reactant.id}": unknown mixture "${reactant.comparedIn}"`)
    if (reactant.comparedIn === data.referenceMixtureId) errors.push(`reactant "${reactant.id}": its order is found from the reference mixture and another`)
  }
  if (data.reagents.find((r) => r.id === rateLaw.end.reagentId)?.form !== 'solution') errors.push(`rateLaw.end: "${rateLaw.end.reagentId}" is not a solution of the record`)
  if (data.reagents.find((r) => r.id === rateLaw.end.indicatorId)?.form !== 'indicator') errors.push(`rateLaw.end: "${rateLaw.end.indicatorId}" is not an indicator of the record`)
  if (!data.mixtures.some((m) => m.id === data.referenceMixtureId)) errors.push(`unknown reference mixture "${data.referenceMixtureId}"`)
  for (const mixture of data.mixtures) {
    // Water is not a bottle of the record: it has no hazards and no strength.
    for (const part of [...mixture.flaskA, ...mixture.flaskB]) if (part.reagentId !== 'water' && !bottles.has(part.reagentId)) errors.push(`mixture "${mixture.id}": unknown reagent "${part.reagentId}"`)
  }
  const parameters: Record<string, { value: unknown } | undefined> = data.parameters
  for (const bath of data.baths) {
    const value = parameters[bath.range]?.value
    if (!Array.isArray(value) || value.length !== 2) errors.push(`bath "${bath.id}": "${bath.range}" is not a parameter that is a range`)
  }
  for (const [name, parameter] of Object.entries(data.parameters)) {
    if (name.endsWith('RangeTenths') && Array.isArray(parameter.value) && parameter.value[0]! > parameter.value[1]!) errors.push(`parameters.${name}: a range runs from its lower end to its upper`)
  }
  return errors
}

/**
 * Checks the clock reaction lab's record against the sources it cites: the schema; that its ids hold together;
 * that every source named exists; that each `published` reads as the number stored beside it; and that no name,
 * note or rationale holds institution text. Returns a list of problems; an empty list means the record is valid.
 * Never throws, whatever it is given. That each value is what its source prints is the build script's to hold to
 * the manifest, and the build checks the record's own chemistry: that its reactions balance, that its mixtures
 * are those of spec 19.1, and that its rate record holds together.
 */
export function validateClock(input: unknown, sources: readonly Source[], options: ValidateOptions = {}): string[] {
  const parsed = clockSchema.safeParse(input)
  if (!parsed.success) return schemaErrors(parsed.error.issues)
  const names = options?.institutionNames
  return [
    ...checkClock(parsed.data),
    ...checkSourceIds(parsed.data, 'clock', Array.isArray(sources) ? sources : []),
    ...checkPublished(parsed.data, 'clock'),
    ...checkProse(parsed.data, 'clock', Array.isArray(names) ? names : []),
  ]
}

/** What the iodination of acetone lab's record must hold together beyond its shape: its ids, and every id one part of it names in another. */
function checkAcetone(data: AcetoneData): string[] {
  const errors = [...duplicates(data.reagents.map((r) => r.id), 'reagents'), ...duplicates(data.rateLaw.reactants.map((r) => r.id), 'reactants'), ...duplicates(data.mixtures.map((m) => m.id), 'mixtures')]
  const bottles = new Set(data.reagents.map((r) => r.id))
  const { rateLaw } = data
  for (const reactant of rateLaw.reactants) {
    if (!bottles.has(reactant.reagentId)) errors.push(`reactant "${reactant.id}": "${reactant.reagentId}" is not a solution of the record`)
    if (!data.mixtures.some((m) => m.id === reactant.comparedIn)) errors.push(`reactant "${reactant.id}": unknown mixture "${reactant.comparedIn}"`)
    if (reactant.comparedIn === data.referenceMixtureId) errors.push(`reactant "${reactant.id}": its order is found from the reference mixture and another`)
  }
  if (!rateLaw.reactants.some((reactant) => reactant.reagentId === rateLaw.end.reagentId)) errors.push(`rateLaw.end: "${rateLaw.end.reagentId}" is not the bottle of a reactant`)
  if (!data.mixtures.some((m) => m.id === data.referenceMixtureId)) errors.push(`unknown reference mixture "${data.referenceMixtureId}"`)
  for (const mixture of data.mixtures) {
    // Water is not a bottle of the record: it has no hazards and no strength.
    for (const part of [...mixture.flask, mixture.added]) if (part.reagentId !== 'water' && !bottles.has(part.reagentId)) errors.push(`mixture "${mixture.id}": unknown reagent "${part.reagentId}"`)
    if (mixture.added.reagentId !== rateLaw.end.reagentId) errors.push(`mixture "${mixture.id}": what is poured in is what is used up, "${rateLaw.end.reagentId}"`)
  }
  const [low, high] = data.parameters.roomRangeTenths.value
  if (low > high) errors.push('parameters.roomRangeTenths: a range runs from its lower end to its upper')
  return errors
}

/**
 * Checks the iodination of acetone lab's record against the sources it cites: the schema; that its ids hold
 * together; that every source named exists; that each `published` reads as the number stored beside it; and that
 * no name, note or rationale holds institution text. Returns a list of problems; an empty list means the record is
 * valid. Never throws, whatever it is given. That each value is what its source prints is the build script's to
 * hold to the manifest, and the build checks the record's own chemistry: that its reaction balances, that its
 * mixtures are those of spec 20.1, and that its rate record holds together.
 */
export function validateAcetone(input: unknown, sources: readonly Source[], options: ValidateOptions = {}): string[] {
  const parsed = acetoneSchema.safeParse(input)
  if (!parsed.success) return schemaErrors(parsed.error.issues)
  const names = options?.institutionNames
  return [
    ...checkAcetone(parsed.data),
    ...checkSourceIds(parsed.data, 'acetone', Array.isArray(sources) ? sources : []),
    ...checkPublished(parsed.data, 'acetone'),
    ...checkProse(parsed.data, 'acetone', Array.isArray(names) ? names : []),
  ]
}

/** What the red cabbage pH lab's record must hold together beyond its shape: its ids, and every id one part of it names in another. */
function checkCabbage(data: CabbageData): string[] {
  const errors = [
    ...duplicates(data.reagents.map((r) => r.id), 'reagents'),
    ...duplicates(data.things.map((t) => t.id), 'things'),
    ...duplicates(data.indicator.colours.map((c) => c.id), 'colours'),
    ...duplicates(data.scale.questions.map((q) => q.id), 'questions'),
    ...duplicates(data.scale.buffers.map((b) => String(b.ph)), 'buffers'),
  ]
  const bottles = new Set(data.reagents.map((r) => r.id))
  if (!bottles.has(data.indicator.reagentId)) errors.push(`indicator: "${data.indicator.reagentId}" is not a bottle of the record`)
  for (const buffer of data.scale.buffers) if (buffer.reagentId !== undefined && !bottles.has(buffer.reagentId)) errors.push(`buffer of pH ${buffer.ph}: unknown reagent "${buffer.reagentId}"`)
  for (const thing of data.things) {
    if (thing.reagentId !== undefined && !bottles.has(thing.reagentId)) errors.push(`thing "${thing.id}": unknown reagent "${thing.reagentId}"`)
    if (thing.ph.low.value > thing.ph.high.value) errors.push(`thing "${thing.id}": a range runs from its lower end to its upper`)
  }
  if (data.parameters.colourEdgesTenths.value.length !== data.indicator.colours.length - 1) errors.push('parameters.colourEdgesTenths: one edge between each two neighbouring colours')
  if (data.parameters.neededToCount.value > data.things.length) errors.push('parameters.neededToCount: more than the bench has things')
  return errors
}

/**
 * Checks the red cabbage pH lab's record against the sources it cites: the schema; that its ids hold together;
 * that every source named exists; that each `published` reads as the number stored beside it; and that no name,
 * note or rationale holds institution text. Returns a list of problems; an empty list means the record is valid.
 * Never throws, whatever it is given. That each value is what its source prints is the build script's to hold to
 * the manifest, and the build checks the record's own chemistry: that the colours cover the scale, that each pH
 * worked out is what its figures give, and that a careful estimate is within a unit of every range.
 */
export function validateCabbage(input: unknown, sources: readonly Source[], options: ValidateOptions = {}): string[] {
  const parsed = cabbageSchema.safeParse(input)
  if (!parsed.success) return schemaErrors(parsed.error.issues)
  const names = options?.institutionNames
  return [
    ...checkCabbage(parsed.data),
    ...checkSourceIds(parsed.data, 'cabbage', Array.isArray(sources) ? sources : []),
    ...checkPublished(parsed.data, 'cabbage'),
    ...checkProse(parsed.data, 'cabbage', Array.isArray(names) ? names : []),
  ]
}

/** What the measurement and density lab's record must hold together beyond its shape: its ids, the rows its reagents and its parts name, and ranges that run upward. */
function checkDensity(data: DensityData): string[] {
  const errors = [...duplicates(data.reagents.map((r) => r.id), 'reagents'), ...duplicates(data.liquids.map((l) => l.id), 'liquids'), ...duplicates(data.metals.map((m) => m.id), 'metals'), ...duplicates(data.instruments.map((i) => i.id), 'instruments')]
  const [, liquid, metal] = data.parts
  for (const [part, rows, form] of [[liquid, data.liquids, 'liquid'], [metal, data.metals, 'metal']] as const) {
    errors.push(...duplicates(part.candidateIds, `part "${part.id}": candidates`), ...duplicates(part.unknownIds, `part "${part.id}": unknowns`))
    for (const candidate of part.candidateIds) if (!rows.some((row) => row.id === candidate)) errors.push(`part "${part.id}": the candidate "${candidate}" is no row of its table`)
    for (const unknown of part.unknownIds) {
      if (!part.candidateIds.includes(unknown)) errors.push(`part "${part.id}": the unknown "${unknown}" is not a candidate`)
      // What an unknown may be is on the bench, so it carries hazards: a reagent of the right form.
      if (!data.reagents.some((r) => r.tableId === unknown && (r.form === 'metal') === (form === 'metal'))) errors.push(`part "${part.id}": the unknown "${unknown}" is no reagent of the record`)
    }
  }
  for (const reagent of data.reagents) if (![...liquid.unknownIds, ...metal.unknownIds].includes(reagent.tableId)) errors.push(`reagent "${reagent.id}": it is no unknown of a part`)
  for (const [name, parameter] of Object.entries(data.parameters)) {
    if (Array.isArray(parameter.value) && parameter.value[0] > parameter.value[1]) errors.push(`parameters.${name}: a range runs from its lower end to its upper`)
  }
  for (const instrument of data.instruments) if (instrument.from >= instrument.to) errors.push(`instrument "${instrument.id}": its scale runs from its lower end to its upper`)
  return errors
}

/**
 * Checks the measurement and density lab's record against the sources it cites: the schema; that its ids hold
 * together; that every cited source exists; that every `published` figure is the number stored beside it; and
 * that no prose holds institution text.
 */
export function validateDensity(input: unknown, sources: readonly Source[], options: ValidateOptions = {}): string[] {
  const parsed = densitySchema.safeParse(input)
  if (!parsed.success) return schemaErrors(parsed.error.issues)
  const names = options?.institutionNames
  return [
    ...checkDensity(parsed.data),
    ...checkSourceIds(parsed.data, 'density', Array.isArray(sources) ? sources : []),
    ...checkPublished(parsed.data, 'density'),
    ...checkProse(parsed.data, 'density', Array.isArray(names) ? names : []),
  ]
}

/** What the freezing point depression lab's record must hold together beyond its shape: its ids, the reagents its parts and its measured rows name, the atoms its atomic weights cover, and ranges that run upward. */
function checkFreezing(data: FreezingData): string[] {
  const errors = [...duplicates(data.reagents.map((r) => r.id), 'reagents'), ...duplicates(data.atomicWeights.map((w) => w.id), 'atomicWeights'), ...duplicates(data.measured.map((row) => row.id), 'measured')]
  const [, unknown, particles] = data.parts
  const ids = data.reagents.map((r) => r.id)
  errors.push(...duplicates([...unknown.candidateIds, ...particles.soluteIds], 'the liquids of part 2 and the solutes of part 3'))
  for (const candidate of unknown.candidateIds) {
    const reagent = data.reagents.find((r) => r.id === candidate)
    if (!reagent) errors.push(`part "unknown": the candidate "${candidate}" is no reagent of the record`)
    // The unknown is a liquid that is poured, whichever it is.
    else if (reagent.form !== 'liquid') errors.push(`part "unknown": the candidate "${candidate}" is not a liquid`)
  }
  for (const solute of particles.soluteIds) if (!ids.includes(solute)) errors.push(`part "particles": the solute "${solute}" is no reagent of the record`)
  for (const reagent of data.reagents) {
    if (![...unknown.candidateIds, ...particles.soluteIds].includes(reagent.id)) errors.push(`reagent "${reagent.id}": no part uses it`)
    for (const symbol of Object.keys(reagent.composition)) if (!data.atomicWeights.some((w) => w.id === symbol)) errors.push(`reagent "${reagent.id}": no atomic weight for ${symbol}`)
    if (reagent.particles.kind === 'measured' && !data.measured.some((row) => row.id === reagent.particles.measuredId && row.reagentId === reagent.id)) errors.push(`reagent "${reagent.id}": its count of particles names no measured row of its own`)
    if (reagent.particles.kind === 'ideal' && reagent.particles.value !== reagent.particles.ideal) errors.push(`reagent "${reagent.id}": a count marked as the ideal is not the ideal count`)
  }
  for (const row of data.measured) if (!ids.includes(row.reagentId)) errors.push(`measured "${row.id}": "${row.reagentId}" is no reagent of the record`)
  for (const [name, parameter] of Object.entries(data.parameters)) {
    if (Array.isArray(parameter.value) && parameter.value[0] > parameter.value[1]) errors.push(`parameters.${name}: a range runs from its lower end to its upper`)
  }
  return errors
}

/**
 * Checks the freezing point depression lab's record against the sources it cites: the schema; that its ids hold
 * together; that every cited source exists; that every `published` figure is the number stored beside it; and
 * that no prose holds institution text.
 */
export function validateFreezing(input: unknown, sources: readonly Source[], options: ValidateOptions = {}): string[] {
  const parsed = freezingSchema.safeParse(input)
  if (!parsed.success) return schemaErrors(parsed.error.issues)
  const names = options?.institutionNames
  return [
    ...checkFreezing(parsed.data),
    ...checkSourceIds(parsed.data, 'freezing', Array.isArray(sources) ? sources : []),
    ...checkPublished(parsed.data, 'freezing'),
    ...checkProse(parsed.data, 'freezing', Array.isArray(names) ? names : []),
  ]
}

/**
 * What the types of reactions lab's record must hold together beyond its shape: its ids; that every station's
 * tiles and every equation's terms are species of the record; that every field asked has something stored for
 * after, in one of its choices, and a look that opens it; and that every bench is reagents of the record. That
 * the equations balance is the build's to check (scripts/reactions-lib.mjs), and a test's.
 */
function checkReactions(data: ReactionsData): string[] {
  const errors = [...duplicates(data.reagents.map((r) => r.id), 'reagents'), ...duplicates(data.species.map((s) => s.id), 'species'), ...duplicates(data.stations.map((s) => s.id), 'stations'), ...duplicates(data.stations.map((s) => s.letter), "the stations' letters")]
  const species = new Set(data.species.map((s) => s.id))
  const reagents = new Set(data.reagents.map((r) => r.id))
  for (const station of data.stations) {
    errors.push(...duplicates(station.vessels.map((v) => v.id), `station "${station.id}": vessels`), ...duplicates(station.tiles, `station "${station.id}": tiles`))
    for (const tile of station.tiles) if (!species.has(tile)) errors.push(`station "${station.id}": the tile "${tile}" is no species of the record`)
    for (const reagent of station.reagentIds) if (!reagents.has(reagent)) errors.push(`station "${station.id}": "${reagent}" is no reagent of the record`)
    for (const vessel of station.vessels) {
      const where = `station "${station.id}", vessel "${vessel.id}"`
      for (const term of vessel.equation === null ? [] : [...vessel.equation.reactants, ...vessel.equation.products]) {
        if (!station.tiles.includes(term.speciesId)) errors.push(`${where}: the equation needs "${term.speciesId}", which is not among the station's tiles`)
      }
      if ((vessel.kind.value === 'none') !== (vessel.equation === null)) errors.push(`${where}: a vessel has an equation when something reacts in it, and none when nothing does`)
      if (vessel.catalyst !== undefined && !species.has(vessel.catalyst.speciesId)) errors.push(`${where}: the catalyst "${vessel.catalyst.speciesId}" is no species of the record`)
      if (vessel.liquid !== null && !data.choices.liquid.includes(vessel.liquid.value)) errors.push(`${where}: "${vessel.liquid.value}" is no choice of the liquid's colour`)
      for (const field of vessel.asks) {
        const seen = vessel.after[field]
        if (seen === undefined) errors.push(`${where}: nothing is stored for "${field}", which is asked`)
        if (!vessel.looks.some((look) => look.at === FIELD_AT[field])) errors.push(`${where}: no look opens "${field}"`)
      }
      for (const [field, seen] of Object.entries(vessel.after)) {
        if (seen !== undefined && !data.choices[field as keyof ReactionsData['choices']].includes(seen.value)) errors.push(`${where}: "${seen.value}" is no choice of "${field}"`)
      }
    }
  }
  return errors
}

/**
 * Checks the types of reactions lab's record against the sources it cites: the schema; that its ids hold
 * together; that every cited source exists; and that no prose holds institution text.
 */
export function validateReactions(input: unknown, sources: readonly Source[], options: ValidateOptions = {}): string[] {
  const parsed = reactionsSchema.safeParse(input)
  if (!parsed.success) return schemaErrors(parsed.error.issues)
  const names = options?.institutionNames
  return [
    ...checkReactions(parsed.data),
    ...checkSourceIds(parsed.data, 'reactions', Array.isArray(sources) ? sources : []),
    ...checkPublished(parsed.data, 'reactions'),
    ...checkProse(parsed.data, 'reactions', Array.isArray(names) ? names : []),
  ]
}
