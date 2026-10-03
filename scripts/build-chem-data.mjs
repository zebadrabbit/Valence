// Builds the committed chemistry data from the verified research files.
//
//   npm run build:data
//
// Reads docs/research/phase-2/ and writes, under src/chem-data/:
//   elements.json, sources.json, molecules/<id>.json, molecules/index.ts
//
// Deterministic: the same inputs give byte-identical outputs. Anything
// unexpected in the inputs stops the build with a message and writes nothing.
//
// ponytail: nothing checks that the committed outputs match a fresh run. When
// there is CI, add `npm run build:data && git diff --exit-code src/chem-data`.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { parseSdf } from '../docs/research/phase-2/parse-sdf.mjs'

const root = join(import.meta.dirname, '..')
const research = join(root, 'docs/research/phase-2')
const out = join(root, 'src/chem-data')

function fail(message) {
  throw new Error(message)
}
const readJson = (name) => JSON.parse(readFileSync(join(research, name), 'utf8'))
const toJson = (value) => JSON.stringify(value, null, 2) + '\n'

// ---------------------------------------------------------------------------
// Authored tables. These are authored structure and display text, which the
// spec exempts from citation.

// id, PubChem CID, display name, topic. The order here is the library order.
const LIBRARY = [
  ['water', 962, 'Water', 'basics'],
  ['carbon-dioxide', 280, 'Carbon dioxide', 'basics'],
  ['ammonia', 222, 'Ammonia', 'basics'],
  ['methane', 297, 'Methane', 'basics'],
  ['oxygen', 977, 'Oxygen', 'basics'],
  ['nitrogen', 947, 'Nitrogen', 'basics'],
  ['hydrogen-chloride', 313, 'Hydrogen chloride', 'basics'],
  ['hydrogen-peroxide', 784, 'Hydrogen peroxide', 'basics'],
  ['boron-trifluoride', 6356, 'Boron trifluoride', 'vsepr'],
  ['sulfur-dioxide', 1119, 'Sulfur dioxide', 'vsepr'],
  ['sulfur-hexafluoride', 17358, 'Sulfur hexafluoride', 'vsepr'],
  ['xenon-tetrafluoride', 123324, 'Xenon tetrafluoride', 'vsepr'],
  ['phosphorus-pentachloride', 24819, 'Phosphorus pentachloride', 'vsepr'],
  ['ethane', 6324, 'Ethane', 'organic'],
  ['ethene', 6325, 'Ethene', 'organic'],
  ['ethyne', 6326, 'Ethyne', 'organic'],
  ['ethanol', 702, 'Ethanol', 'organic'],
  ['acetic-acid', 176, 'Acetic acid', 'organic'],
  ['acetone', 180, 'Acetone', 'organic'],
  ['formaldehyde', 712, 'Formaldehyde', 'organic'],
  ['methylamine', 6329, 'Methylamine', 'organic'],
  ['ethyl-acetate', 8857, 'Ethyl acetate', 'organic'],
  ['acetamide', 178, 'Acetamide', 'organic'],
  ['benzene', 241, 'Benzene', 'organic'],
  ['beta-d-glucopyranose', 64689, 'β-D-Glucopyranose', 'biomolecules'],
  ['glycine', 750, 'Glycine', 'biomolecules'],
  ['glycine-zwitterion', 5257127, 'Glycine', 'biomolecules'],
  ['alanine', 5950, 'L-Alanine', 'biomolecules'],
  ['alanine-zwitterion', 7311724, 'L-Alanine', 'biomolecules'],
  ['urea', 1176, 'Urea', 'biomolecules'],
  ['hydronium', 123332, 'Hydronium ion', 'mechanism'],
  ['bicarbonate', 769, 'Hydrogen carbonate ion (bicarbonate)', 'mechanism'],
  ['carbonic-acid', 767, 'Carbonic acid', 'mechanism'],
]

// The Basics and VSEPR groups use cited experimental geometry; the rest use PubChem 3D.
const EXPERIMENTAL_TOPICS = new Set(['basics', 'vsepr'])

// id -> [variantGroup, variantLabel]
const VARIANTS = {
  glycine: ['glycine', 'Neutral'],
  'glycine-zwitterion': ['glycine', 'Zwitterion'],
  alanine: ['alanine', 'Neutral'],
  'alanine-zwitterion': ['alanine', 'Zwitterion'],
}

const CONFORMER = 'One conformer of many.'
const ZWITTERION = 'The form found in water and in the solid; the model is a computed conformer.'
const NOTES = {
  'phosphorus-pentachloride': ['Gas-phase structure. The axial and equatorial P–Cl bond lengths differ.'],
  'hydrogen-peroxide': [
    'The H–O–O angle of 94.8° is the 1962 measurement NIST lists; later measurements give about 100–102°.',
  ],
  'sulfur-dioxide': [
    'Drawn in the octet-obeying resonance form (one S=O, one S–O, formal charges +1 on S and −1 on one O), as in OpenStax Chemistry 2e.',
  ],
  bicarbonate: [
    'The two unprotonated C–O bonds are equivalent in the real ion; the computed conformer shows them at different lengths.',
  ],
  'glycine-zwitterion': [ZWITTERION],
  'alanine-zwitterion': [ZWITTERION],
  ethanol: [CONFORMER],
  'beta-d-glucopyranose': [CONFORMER],
  'ethyl-acetate': [CONFORMER],
}

// In these structures the two bonds to a terminal oxygen (an oxygen with one
// bond) are the resonance pair: one drawn double, one drawn single.
const RESONANCE_NOTE = 'one of two equivalent resonance structures; effective order 1.5'
const RESONANCE_PAIR = new Set(['sulfur-dioxide', 'glycine-zwitterion', 'alanine-zwitterion', 'bicarbonate'])

// In these structures every carbon-carbon bond is aromatic.
const AROMATIC_RING = { benzene: 6 }

// Sulfur dioxide is stored in the octet resonance form (spec 6.1), not the
// two-double-bond form of the research file. Atom order is S, O, O.
const SO2 = { atoms: 'S,O,O', bonds: '0-1:2,0-2:2', orders: [2, 1], formalCharges: [1, 0, -1] }

// The element sources this app cites, by their id in the research file.
// `readVia` names the research source for the copy that was actually read
// when the cited paper was not; the link then goes to that copy.
const ELEMENT_SOURCES = [
  { id: 'ciaaw-abridged-2024' },
  { id: 'nist-asd-ie' },
  { id: 'pubchem-ptable' },
  {
    id: 'cordero-2008',
    readVia: 'wikipedia-covalent-radius',
    said: "The paper is paywalled and was not read: the values were checked only through secondary transcriptions that agree with each other (Wikipedia's covalent radius table, linked here, and the Open Babel element table).",
  },
  {
    id: 'mantina-2009',
    readVia: 'mantina-2009-pmc',
    said: 'Read as the free author manuscript (PMC3658832), linked here.',
  },
  {
    id: 'shannon-1976',
    readVia: 'shannon-db-imperial',
    said: 'The paper was not read: the values were checked only through a secondary transcription, the Database of Ionic Radii (Atomistic Simulation Group, Imperial College London), linked here.',
  },
  { id: 'jmol-pal-source' },
]

const ELEMENT_NOTES = {
  Xe: [
    "The electronegativity is the value PubChem lists. It is a later estimate, not part of Pauling's original scale, and no primary source was traced.",
  ],
}

// ---------------------------------------------------------------------------
// Elements

function buildElements() {
  const file = readJson('elements.json')
  const known = new Map(file.sources.map((s) => [s.id, s]))
  const lookup = (id) => known.get(id) ?? fail(`elements.json has no source "${id}"`)
  const sources = ELEMENT_SOURCES.map(({ id, readVia, said }) => {
    const source = lookup(id)
    if (!readVia) return { id, url: source.url, citation: source.citation }
    return { id, url: lookup(readVia).url, citation: `${source.citation} (${source.url}) ${said}` }
  })
  const allowed = new Set(sources.map((s) => s.id))

  const elements = file.elements.map((e) => {
    const where = `element ${e.symbol}`
    const cite = (value, sourceId) => {
      if (value === undefined || value === null) fail(`${where}: missing value`)
      if (!allowed.has(sourceId)) fail(`${where}: unexpected source "${sourceId}"`)
      return { value, sourceId }
    }

    e.ionizationEnergiesEV.forEach((ie, i) => {
      if (ie.order !== i + 1) fail(`${where}: ionization energies are out of order`)
      if (ie.value !== Number(ie.valueAsPublished)) fail(`${where}: ionization energy ${i + 1} differs from the published text`)
      if (ie.sourceId !== e.ionizationEnergiesEV[0].sourceId) fail(`${where}: ionization energies have mixed sources`)
    })
    if (e.shells.reduce((sum, n) => sum + n, 0) !== e.atomicNumber) fail(`${where}: shells do not sum to Z`)
    if (e.shells.at(-1) !== e.valenceElectrons) fail(`${where}: valence electrons are not the outer shell count`)

    // Van der Waals radii follow Mantina 2009 throughout. The research file
    // records Bondi's value first and Mantina's as an alternative where they
    // differ (hydrogen); elsewhere Mantina's table repeats Bondi's value.
    const mantina = e.vdwRadiusAlternatives?.find((a) => a.sourceId === 'mantina-2009')
    const viaMantina = e.vdwRadiusA.sourceId === 'mantina-2009' || e.vdwRadiusA.verifiedVia?.includes('mantina-2009-pmc')
    if (!viaMantina) fail(`${where}: van der Waals radius was not checked against Mantina 2009`)

    const notes = [...(ELEMENT_NOTES[e.symbol] ?? [])]
    if (e.covalentRadiusAlternatives) {
      const list = e.covalentRadiusAlternatives.map((a) => `${a.label} ${a.value.toFixed(2)} Å`).join(', ')
      notes.push(`The source gives one covalent radius per hybridization: ${list}. The sp3 value is stored.`)
    }
    const flagged = Object.groupBy(
      e.ionizationEnergiesEV.filter((ie) => ie.nistFlag !== 'measured'),
      (ie) => ie.nistFlag,
    )
    for (const [flag, list] of Object.entries(flagged)) {
      notes.push(`NIST marks ionization energy ${list.map((ie) => ie.order).join(', ')} as ${flag}, not measured.`)
    }

    return {
      symbol: e.symbol,
      name: e.name,
      atomicNumber: e.atomicNumber,
      atomicWeight: cite(e.atomicWeight.value, e.atomicWeight.sourceId),
      electronegativity: cite(e.electronegativity.value, e.electronegativity.sourceId),
      configuration: cite(e.configuration, e.configurationSourceId),
      shells: cite(e.shells, e.configurationSourceId),
      ionizationEnergiesEv: cite(
        e.ionizationEnergiesEV.map((ie) => ie.value),
        e.ionizationEnergiesEV[0].sourceId,
      ),
      covalentRadius: cite(e.covalentRadiusA.value, e.covalentRadiusA.sourceId),
      vdwRadius: cite(mantina?.value ?? e.vdwRadiusA.value, 'mantina-2009'),
      ionicRadii: e.ionicRadii.map((r) => ({
        charge: r.charge,
        coordination: r.coordination,
        ...cite(r.valueA, r.sourceId),
      })),
      color: cite(e.colorHex, e.colorSourceId),
      ...(notes.length > 0 ? { notes } : {}),
      sourceId: cite(e.atomicNumber, e.atomicNumberSourceId).sourceId,
    }
  })
  elements.sort((a, b) => a.atomicNumber - b.atomicNumber)
  if (elements.length !== 11) fail(`expected 11 elements, found ${elements.length}`)
  return { elements, sources }
}

// ---------------------------------------------------------------------------
// Structures

function readSdf(fileId, kind) {
  const name = `${fileId}-${kind}.sdf`
  const records = parseSdf(readFileSync(join(research, 'sdf', name), 'utf8'))
  if (records.length !== 1) fail(`${name}: expected 1 record, found ${records.length}`)
  const [record] = records
  const flat = record.atoms.every((a) => a.z === 0)
  if (kind === '2d' && !flat) fail(`${name}: a 2D record with non-zero z`)
  if (kind === '3d' && flat && record.atoms.length > 3) fail(`${name}: a 3D record with every z equal to 0`)
  return record
}

/** Maps each atom of `from` to an atom of `to` with the same element and the same connectivity, or returns null. */
// ponytail: the first match wins and geometry is ignored, so atoms that are
// trans in 3D (SF6, PCl5) need not be drawn opposite in 2D. Fine for a Lewis
// drawing of equivalent atoms; a drawing that must show axial and equatorial
// positions needs a per-molecule atom map.
function matchAtoms(from, to) {
  if (from.atoms.length !== to.atoms.length || from.bonds.length !== to.bonds.length) return null
  const neighbours = (m) =>
    m.atoms.map((_, i) => new Set(m.bonds.flatMap(({ a, b }) => (a === i ? [b] : b === i ? [a] : []))))
  const fromN = neighbours(from)
  const toN = neighbours(to)
  const map = []
  const used = new Set()
  const place = (i) => {
    if (i === from.atoms.length) return true
    for (let j = 0; j < to.atoms.length; j++) {
      if (used.has(j) || to.atoms[j].element !== from.atoms[i].element || toN[j].size !== fromN[i].size) continue
      if (map.some((mapped, k) => fromN[i].has(k) !== toN[j].has(mapped))) continue
      map[i] = j
      used.add(j)
      if (place(i + 1)) return true
      used.delete(j)
      map.length = i
    }
    return false
  }
  return place(0) ? map : null
}

// A 2D record writes a wedge bond starting at its stereocentre, so the two ends are compared in sorted order.
const bondTable = (m) => m.bonds.map((b) => `${Math.min(b.a, b.b)}-${Math.max(b.a, b.b)}:${b.order}`).join(',')
const elementList = (m) => m.atoms.map((a) => a.element).join(',')

/** Atoms as { element, position, formalCharge }, bonds as { a, b, order }, and each atom's index in the 2D record. */
function experimentalStructure(id, geo, drawing) {
  const atoms = geo.atoms.map((a) => ({ element: a.element, position: [a.x, a.y, a.z], formalCharge: 0 }))
  const bonds = geo.bondList.map(({ a, b, order }) => ({ a, b, order }))
  if (id === 'sulfur-dioxide') {
    if (elementList({ atoms }) !== SO2.atoms || bondTable({ bonds }) !== SO2.bonds) {
      fail('sulfur-dioxide: the research structure is not the S, O, O with two double bonds this script rewrites')
    }
    bonds.forEach((bond, i) => (bond.order = SO2.orders[i]))
    atoms.forEach((atom, i) => (atom.formalCharge = SO2.formalCharges[i]))
  }
  const to2d = matchAtoms({ atoms, bonds }, drawing) ?? fail(`${id}: no atom match between the experimental structure and the 2D record`)
  return { atoms, bonds, to2d }
}

function pubchemStructure(id, model, drawing) {
  const same =
    elementList(model) === elementList(drawing) &&
    bondTable(model) === bondTable(drawing) &&
    model.atoms.every((a, i) => a.charge === drawing.atoms[i].charge)
  if (!same) fail(`${id}: the 2D and 3D records differ in atom order, bonds or charges`)
  const atoms = model.atoms.map((a) => ({ element: a.element, position: [a.x, a.y, a.z], formalCharge: a.charge }))
  const bonds = model.bonds.map(({ a, b, order }) => ({ a, b, order }))
  return { atoms, bonds, to2d: atoms.map((_, i) => i) }
}

function measurements(id, geo, sourceId) {
  const entries = (list, size, valueKey) =>
    list.flatMap((m) => {
      const sets = m.appliesTo ?? [m.atoms]
      if (!sets.some((set) => set.join() === m.atoms.join())) fail(`${id}: ${m.label} does not list its own atoms`)
      return sets.map((atoms) => {
        if (atoms.length !== size || typeof m[valueKey] !== 'number') fail(`${id}: malformed measurement ${m.label}`)
        return { atoms, value: m[valueKey], sourceId }
      })
    })
  return {
    lengths: entries(geo.bonds, 2, 'lengthA'),
    angles: entries(geo.angles, 3, 'degrees'),
    dihedrals: entries(geo.dihedrals, 4, 'degrees'),
  }
}

// One source per CCCBDB page. A page can cite a different reference for each
// row, so the citation names which measurement each reference supports.
function cccbdbSource(id, geo) {
  const rows = [...geo.bonds, ...geo.angles, ...geo.dihedrals]
  const urls = new Set(rows.map((r) => r.sourceUrl))
  if (urls.size !== 1) fail(`${id}: expected one CCCBDB page, found ${urls.size}`)
  const byCitation = Object.groupBy(rows, (r) => r.citation)
  const citations = Object.keys(byCitation)
  const page = /^NIST CCCBDB, Standard Reference Database 101, experimental geometry page \(retrieved [\d-]+\)/
  let citation = citations[0]
  if (citations.length > 1) {
    const prefix = page.exec(citation)?.[0] ?? fail(`${id}: unrecognised CCCBDB citation "${citation}"`)
    const parts = citations.map((text) => {
      if (!text.startsWith(prefix)) fail(`${id}: unrecognised CCCBDB citation "${text}"`)
      const reference = text.slice(prefix.length).replace(/^[,:]\s*(citing:\s*)?/, '')
      return `${byCitation[text].map((r) => r.label).join(', ')}: ${reference}`
    })
    citation = `${prefix}. ${parts.join(' | ')}`
  }
  return { id: `cccbdb-${id}`, url: [...urls][0], citation }
}

function pubchemSource(cid, entry, pattern) {
  if (!pattern.includes('<cid>')) fail('pubchem.json: perRecordCitationPattern has no <cid>')
  const wording = pattern.replace(/ \(or [^)]*\)$/, '').replaceAll('<cid>', String(cid))
  return {
    id: `pubchem-cid-${cid}`,
    url: entry.recordUrl,
    citation: `PubChem, National Library of Medicine (NCBI). ${wording}`,
  }
}

/** A canonical, order-free summary of a structure, for comparing with the hand-written expected table. */
function summary(atoms, bonds, elementOf) {
  return [
    ...atoms.map((a) => `atom ${a.element} charge ${a.formalCharge} lone pairs ${a.lonePairs}`),
    ...bonds.map((b) => {
      const ends = [elementOf(b.a), elementOf(b.b)].sort().join('-')
      return `bond ${ends} order ${b.order} aromatic ${b.aromatic} note ${b.resonanceNote ?? 'none'}`
    }),
  ]
    .sort()
    .join('\n')
}

function buildMolecules(elements) {
  const geometry = readJson('geometry.json').molecules
  const pubchem = readJson('pubchem.json')
  const expected = readJson('expected.json').molecules
  const valence = new Map(elements.map((e) => [e.symbol, e.shells.value.at(-1)]))

  const expectedIds = expected.map((m) => m.id).sort().join()
  if (LIBRARY.map(([id]) => id).sort().join() !== expectedIds) fail('the library table and expected.json list different ids')

  const sources = []
  const molecules = LIBRARY.map(([id, cid, name, topic]) => {
    const entry = pubchem.entries.find((e) => e.cid === cid) ?? fail(`${id}: no pubchem.json entry for CID ${cid}`)
    const drawing = readSdf(entry.id, '2d')
    const isExperimental = EXPERIMENTAL_TOPICS.has(topic)
    const geo = geometry.find((g) => g.pubchemCid === cid)
    if (isExperimental !== (geo !== undefined)) fail(`${id}: topic "${topic}" and geometry.json disagree`)

    const source = isExperimental ? cccbdbSource(id, geo) : pubchemSource(cid, entry, pubchem.perRecordCitationPattern)
    sources.push(source)
    if (!isExperimental && !entry.has3d) fail(`${id}: PubChem has no 3D record`)
    const structure = isExperimental
      ? experimentalStructure(id, geo, drawing)
      : pubchemStructure(id, readSdf(entry.id, '3d'), drawing)

    const degree = structure.atoms.map(() => 0)
    const orderSum = structure.atoms.map(() => 0)
    for (const bond of structure.bonds) {
      if (![1, 2, 3].includes(bond.order)) fail(`${id}: bond ${bond.a}-${bond.b} has order ${bond.order}`)
      for (const end of [bond.a, bond.b]) {
        degree[end] += 1
        orderSum[end] += bond.order
      }
    }
    const elementOf = (i) => structure.atoms[i].element

    const atoms = structure.atoms.map((atom, i) => {
      const electrons = valence.get(atom.element) ?? fail(`${id}: element ${atom.element} is not in elements.json`)
      const lonePairs = (electrons - atom.formalCharge - orderSum[i]) / 2
      if (!Number.isInteger(lonePairs) || lonePairs < 0) {
        fail(`${id}: atom ${i} (${atom.element}) would have ${lonePairs} lone pairs`)
      }
      const flat = drawing.atoms[structure.to2d[i]]
      // 2D positions are PubChem drawing units with y pointing up.
      return { element: atom.element, position: atom.position, position2d: [flat.x, flat.y], formalCharge: atom.formalCharge, lonePairs }
    })

    const isTerminalO = (i) => elementOf(i) === 'O' && degree[i] === 1
    const bonds = structure.bonds.map((bond) => ({
      a: bond.a,
      b: bond.b,
      order: bond.order,
      aromatic: id in AROMATIC_RING && elementOf(bond.a) === 'C' && elementOf(bond.b) === 'C',
      ...(RESONANCE_PAIR.has(id) && (isTerminalO(bond.a) || isTerminalO(bond.b)) ? { resonanceNote: RESONANCE_NOTE } : {}),
    }))
    const noted = bonds.filter((b) => b.resonanceNote)
    if (RESONANCE_PAIR.has(id) && noted.map((b) => b.order).sort().join() !== '1,2') {
      fail(`${id}: expected one single and one double bond in the resonance pair`)
    }
    if (id in AROMATIC_RING && bonds.filter((b) => b.aromatic).length !== AROMATIC_RING[id]) {
      fail(`${id}: expected ${AROMATIC_RING[id]} aromatic bonds`)
    }

    const charge = atoms.reduce((sum, a) => sum + a.formalCharge, 0)
    const table = expected.find((m) => m.id === id)
    const element = (label) => label.replace(/\d+$/, '')
    const tableSummary = summary(
      table.atoms,
      table.bonds.map((b) => ({ ...b, a: element(b.a), b: element(b.b) })),
      (e) => e,
    )
    if (charge !== table.charge || charge !== entry.charge || summary(atoms, bonds, elementOf) !== tableSummary) {
      fail(`${id}: the built Lewis structure differs from expected.json`)
    }

    const variant = VARIANTS[id]
    return {
      id,
      name,
      pubchemCid: cid,
      topic,
      ...(variant ? { variantGroup: variant[0], variantLabel: variant[1] } : {}),
      charge,
      atoms,
      bonds,
      geometrySource: isExperimental ? 'cited-experimental' : 'pubchem-computed',
      ...(isExperimental ? { measurements: measurements(id, geo, source.id) } : {}),
      ...(NOTES[id] ? { notes: NOTES[id] } : {}),
      sourceId: source.id,
    }
  })

  for (const id of [...Object.keys(VARIANTS), ...Object.keys(NOTES), ...RESONANCE_PAIR, ...Object.keys(AROMATIC_RING)]) {
    if (!molecules.some((m) => m.id === id)) fail(`an authored table names "${id}", which is not in the library`)
  }
  if (molecules.length !== 33) fail(`expected 33 structures, built ${molecules.length}`)
  return { molecules, sources }
}

// A static import list keeps the registry free of bundler-only APIs.
function moleculeIndex(molecules) {
  const name = (id) => id.replace(/-(.)/g, (_, c) => c.toUpperCase())
  return [
    '// Generated by scripts/build-chem-data.mjs. Do not edit.',
    ...molecules.map((m) => `import ${name(m.id)} from './${m.id}.json'`),
    '',
    'export const moleculeFiles = [',
    ...molecules.map((m) => `  ${name(m.id)},`),
    ']',
    '',
  ].join('\n')
}

function main() {
  const { elements, sources: elementSources } = buildElements()
  const { molecules, sources: moleculeSources } = buildMolecules(elements)
  const sources = [...elementSources, ...moleculeSources]
  if (new Set(sources.map((s) => s.id)).size !== sources.length) fail('duplicate source ids')

  // Everything is built before anything is written.
  const moleculeDir = join(out, 'molecules')
  rmSync(moleculeDir, { recursive: true, force: true })
  mkdirSync(moleculeDir, { recursive: true })
  for (const molecule of molecules) writeFileSync(join(moleculeDir, `${molecule.id}.json`), toJson(molecule))
  writeFileSync(join(moleculeDir, 'index.ts'), moleculeIndex(molecules))
  writeFileSync(join(out, 'elements.json'), toJson(elements))
  writeFileSync(join(out, 'sources.json'), toJson(sources))
  process.stdout.write(`Wrote ${elements.length} elements, ${molecules.length} structures, ${sources.length} sources.\n`)
}

try {
  main()
} catch (error) {
  process.stderr.write(`build-chem-data: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
}
