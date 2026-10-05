// Builds the committed chemistry data from the verified research files.
//
//   npm run build:data
//
// Reads docs/research/phase-2/ and writes, under src/chem-data/:
//   elements.json, sources.json, mo-diagrams.json, library-index.json, molecules/<id>.json, molecules/index.ts
// Reads docs/research/periodic-table/ (saved downloads and decisions.json) and writes:
//   periodic-table.json, element-index.json, and into sources.json its sources and the ones the group, period and
//   block descriptions cite
// Reads docs/research/phase-3/ (titration.json and the saved copies its sources/MANIFEST.json lists) and writes:
//   titration/titration.json, and into sources.json the titration lab's sources
//
// Deterministic: the same inputs give byte-identical outputs. Anything
// unexpected in the inputs stops the build with a message and writes nothing.
//
// ponytail: nothing checks that the committed outputs match a fresh run. When
// there is CI, add `npm run build:data && git diff --exit-code src/chem-data`.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { parseSdf } from './parse-sdf.mjs'
import { checkConfiguration, noteProblem, parseCiaawAbridged, parseNistIe, parsePubChem } from './periodic-table-lib.mjs'
import { checkAnnualMean, checkHazards, checkMolecularWeight, checkPublished, checkSha256, checkSheetHazards, checkWikipediaCopy } from './titration-lib.mjs'

const root = join(import.meta.dirname, '..')
const research = join(root, 'docs/research/phase-2')
const periodicResearch = join(root, 'docs/research/periodic-table')
const titrationResearch = join(root, 'docs/research/phase-3')
const out = join(root, 'src/chem-data')

function fail(message) {
  throw new Error(message)
}
const readJson = (name) => JSON.parse(readFileSync(join(research, name), 'utf8'))
const toJson = (value) => JSON.stringify(value, null, 2) + '\n'

// ---------------------------------------------------------------------------
// Authored tables. These are authored structure and display text, which the
// spec exempts from citation.

// id, PubChem CID, display name, formula, topic. The order here is the library order.
// The formula is written the way general chemistry texts write it (condensed
// for organic molecules), in plain digits and without the charge; the build
// checks it against the atom list.
const LIBRARY = [
  ['water', 962, 'Water', 'H2O', 'basics'],
  ['carbon-dioxide', 280, 'Carbon dioxide', 'CO2', 'basics'],
  ['ammonia', 222, 'Ammonia', 'NH3', 'basics'],
  ['methane', 297, 'Methane', 'CH4', 'basics'],
  ['oxygen', 977, 'Oxygen (O₂)', 'O2', 'basics'],
  ['nitrogen', 947, 'Nitrogen (N₂)', 'N2', 'basics'],
  ['hydrogen-chloride', 313, 'Hydrogen chloride', 'HCl', 'basics'],
  ['hydrogen-peroxide', 784, 'Hydrogen peroxide', 'H2O2', 'basics'],
  ['boron-trifluoride', 6356, 'Boron trifluoride', 'BF3', 'vsepr'],
  ['sulfur-dioxide', 1119, 'Sulfur dioxide', 'SO2', 'vsepr'],
  ['sulfur-hexafluoride', 17358, 'Sulfur hexafluoride', 'SF6', 'vsepr'],
  ['xenon-tetrafluoride', 123324, 'Xenon tetrafluoride', 'XeF4', 'vsepr'],
  ['phosphorus-pentachloride', 24819, 'Phosphorus pentachloride', 'PCl5', 'vsepr'],
  ['ethane', 6324, 'Ethane', 'C2H6', 'organic'],
  ['ethene', 6325, 'Ethene', 'C2H4', 'organic'],
  ['ethyne', 6326, 'Ethyne', 'C2H2', 'organic'],
  ['ethanol', 702, 'Ethanol', 'C2H5OH', 'organic'],
  ['acetic-acid', 176, 'Acetic acid', 'CH3COOH', 'organic'],
  ['acetone', 180, 'Acetone', 'CH3COCH3', 'organic'],
  ['formaldehyde', 712, 'Formaldehyde', 'CH2O', 'organic'],
  ['methylamine', 6329, 'Methylamine', 'CH3NH2', 'organic'],
  ['ethyl-acetate', 8857, 'Ethyl acetate', 'CH3COOC2H5', 'organic'],
  ['acetamide', 178, 'Acetamide', 'CH3CONH2', 'organic'],
  ['benzene', 241, 'Benzene', 'C6H6', 'organic'],
  ['beta-d-glucopyranose', 64689, 'β-D-Glucopyranose', 'C6H12O6', 'biomolecules'],
  ['glycine', 750, 'Glycine', 'NH2CH2COOH', 'biomolecules'],
  ['glycine-zwitterion', 5257127, 'Glycine', 'NH3CH2COO', 'biomolecules'],
  ['alanine', 5950, 'L-Alanine', 'CH3CH(NH2)COOH', 'biomolecules'],
  ['alanine-zwitterion', 7311724, 'L-Alanine', 'CH3CH(NH3)COO', 'biomolecules'],
  ['urea', 1176, 'Urea', 'CO(NH2)2', 'biomolecules'],
  ['hydronium', 123332, 'Hydronium ion', 'H3O', 'mechanism'],
  ['bicarbonate', 769, 'Bicarbonate ion', 'HCO3', 'mechanism'],
  ['carbonic-acid', 767, 'Carbonic acid', 'H2CO3', 'mechanism'],
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

// A zwitterion's net charge is zero, so its formula alone would hide the two charges.
// The display formula marks each charged group; the build checks it against the formula.
const DISPLAY_FORMULAS = {
  'glycine-zwitterion': '+NH3CH2COO-',
  'alanine-zwitterion': 'CH3CH(NH3+)COO-',
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

// Authored 2D drawings, where PubChem's 2D record would teach the wrong picture in the Lewis
// view. Unit bond lengths, y up, in the drawing units of the other files; `atoms` is the atom
// order the positions are written for, which the build checks.
// - Sulfur dioxide: PubChem draws it as a straight line. Here the oxygens are at 120° to each other.
// - Ammonia and hydronium: PubChem draws a flat Y, which reads as trigonal planar. Here the three
//   hydrogens are to the sides and below, which leaves the top for the lone pair.
// - Carbon dioxide: PubChem draws it on a slant. Here it is horizontal.
const SIDES_AND_BELOW = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [0, -1],
]
const DRAWINGS = {
  'sulfur-dioxide': {
    atoms: SO2.atoms,
    positions: [
      [0, 0],
      [-0.866, -0.5],
      [0.866, -0.5],
    ],
  },
  ammonia: { atoms: 'N,H,H,H', positions: SIDES_AND_BELOW },
  hydronium: { atoms: 'O,H,H,H', positions: SIDES_AND_BELOW },
  'carbon-dioxide': {
    atoms: 'C,O,O',
    positions: [
      [0, 0],
      [1, 0],
      [-1, 0],
    ],
  },
}

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

// Shown under the electronegativity itself, not among the element's other notes.
const ELECTRONEGATIVITY_NOTES = {
  Xe: "The value PubChem lists. It is a later estimate, not part of Pauling's original scale, and no primary source was traced.",
}

// ---------------------------------------------------------------------------
// Elements

function buildElements() {
  const file = readJson('elements.json')
  const known = new Map(file.sources.map((s) => [s.id, s]))
  const lookup = (id) => known.get(id) ?? fail(`elements.json has no source "${id}"`)
  const sources = ELEMENT_SOURCES.map(({ id, readVia, said }) => {
    const source = lookup(id)
    // dataUrl, where the research file has one, is the page that shows the values.
    if (!readVia) return { id, url: source.dataUrl ?? source.url, citation: source.citation }
    return { id, url: lookup(readVia).url, citation: `${source.citation} (${source.url}) ${said}` }
  })
  // Emission lines are their own research file, with one source per element's NIST query.
  const spectra = readJson('emission-lines.json')
  sources.push(...spectra.sources.map(({ id, url, citation }) => ({ id, url, citation })))
  const allowed = new Set(sources.map((s) => s.id))
  const emission = (symbol) => {
    const entry = spectra.elements.find((x) => x.symbol === symbol)
    if (!entry) return {}
    const lines = entry.lines.map((line) => {
      if (line.wavelengthNm !== Number(line.valueAsPublished)) fail(`element ${symbol}: emission line ${line.valueAsPublished} differs from the published text`)
      if (!allowed.has(entry.sourceId)) fail(`element ${symbol}: unexpected source "${entry.sourceId}"`)
      return { value: line.wavelengthNm, sourceId: entry.sourceId, published: line.valueAsPublished, ...(line.transition ? { transition: line.transition } : {}) }
    })
    if (lines.some((line, i) => i > 0 && line.value >= lines[i - 1].value)) fail(`element ${symbol}: emission lines are not longest first`)
    return { emission: { selection: entry.selection, ...(entry.note ? { note: entry.note } : {}), lines } }
  }

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
    for (const [label, cited] of [['atomic weight', e.atomicWeight], ['electronegativity', e.electronegativity]]) {
      if (typeof cited.valueAsPublished !== 'string' || cited.value !== Number(cited.valueAsPublished)) fail(`${where}: ${label} differs from the published text`)
    }
    if (e.shells.reduce((sum, n) => sum + n, 0) !== e.atomicNumber) fail(`${where}: shells do not sum to Z`)
    if (e.shells.at(-1) !== e.valenceElectrons) fail(`${where}: valence electrons are not the outer shell count`)

    // Van der Waals radii follow Mantina 2009 throughout. The research file
    // records Bondi's value first and Mantina's as an alternative where they
    // differ (hydrogen); elsewhere Mantina's table repeats Bondi's value.
    const mantina = e.vdwRadiusAlternatives?.find((a) => a.sourceId === 'mantina-2009')
    const viaMantina = e.vdwRadiusA.sourceId === 'mantina-2009' || e.vdwRadiusA.verifiedVia?.includes('mantina-2009-pmc')
    if (!viaMantina) fail(`${where}: van der Waals radius was not checked against Mantina 2009`)

    const notes = []
    if (e.covalentRadiusAlternatives) {
      const label = (a) => a.label.replace('sp3', 'sp³').replace('sp2', 'sp²')
      const list = e.covalentRadiusAlternatives.map((a) => `${label(a)} ${a.value.toFixed(2)} Å`).join(', ')
      notes.push(`The source gives one covalent radius per hybridization: ${list}. The sp³ value is stored.`)
    }
    const flagged = Object.groupBy(
      e.ionizationEnergiesEV.filter((ie) => ie.nistFlag !== 'measured'),
      (ie) => ie.nistFlag,
    )
    for (const [flag, list] of Object.entries(flagged)) {
      const orders = list.map((ie) => ie.order)
      const which = orders.length === 1 ? `energy ${orders[0]}` : `energies ${orders.slice(0, -1).join(', ')} and ${orders.at(-1)}`
      notes.push(`NIST marks ionization ${which} as ${flag}, not measured.`)
    }

    return {
      symbol: e.symbol,
      name: e.name,
      atomicNumber: e.atomicNumber,
      atomicWeight: { ...cite(e.atomicWeight.value, e.atomicWeight.sourceId), published: e.atomicWeight.valueAsPublished },
      electronegativity: {
        ...cite(e.electronegativity.value, e.electronegativity.sourceId),
        published: e.electronegativity.valueAsPublished,
        ...(ELECTRONEGATIVITY_NOTES[e.symbol] ? { note: ELECTRONEGATIVITY_NOTES[e.symbol] } : {}),
      },
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
      ...emission(e.symbol),
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
        // A value the molecule's point group fixes is stored with that point group, whether or not the source
        // prints a figure for it, so that the card says so of every such value.
        if (m.fixedBySymmetry === true && !geo.pointGroup) fail(`${id}: ${m.label} is marked as fixed by symmetry but the molecule has no point group`)
        const symmetry = m.fixedBySymmetry === true ? { symmetry: geo.pointGroup } : {}
        // The text the source prints for the value, or null where its table has no row for it. Such a value
        // must be one the point group fixes.
        const published = m.valueAsPublished
        if (published === null) {
          if (m.fixedBySymmetry !== true) fail(`${id}: ${m.label} has no published text and is not marked as fixed by symmetry`)
          return { atoms, value: m[valueKey], sourceId, ...symmetry }
        }
        if (typeof published !== 'string' || Number(published) !== m[valueKey]) fail(`${id}: ${m.label} differs from the published text`)
        return { atoms, value: m[valueKey], sourceId, published, ...symmetry }
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

function pubchemSource(cid, entry, pattern, retrieved) {
  if (!pattern.includes('<cid>')) fail('pubchem.json: perRecordCitationPattern has no <cid>')
  const wording = pattern.replace(/ \(or [^)]*\)$/, '').replaceAll('<cid>', String(cid))
  return {
    id: `pubchem-cid-${cid}`,
    url: entry.recordUrl,
    citation: `PubChem, National Library of Medicine (NCBI). ${wording} (retrieved ${retrieved})`,
  }
}

/** A canonical, order-free summary of a structure, for comparing with the research table. */
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

// Keep in step with formulaElements in src/chem-data/formula.ts; registry.test.ts cross-checks the two.
/** The element symbols a formula writes, one per atom. Handles one level of parentheses with a multiplier, as in CO(NH2)2. */
function formulaElements(formula) {
  const expand = (text) =>
    [...text.matchAll(/([A-Z][a-z]?)(\d*)/g)].flatMap(([, element, count]) => Array(Number(count || 1)).fill(element))
  const outside = formula.replace(/\([^()]*\)\d*/g, '')
  if (/[()]/.test(outside)) fail(`the formula ${formula} has unbalanced or nested parentheses`)
  const groups = [...formula.matchAll(/\(([^()]*)\)(\d*)/g)].flatMap(([, inner, times]) =>
    Array.from({ length: Number(times || 1) }, () => expand(inner)).flat(),
  )
  return [...expand(outside), ...groups]
}

function buildMolecules(elements) {
  const geometry = readJson('geometry.json').molecules
  const pubchem = readJson('pubchem.json')
  const expected = readJson('expected.json').molecules
  const valence = new Map(elements.map((e) => [e.symbol, e.shells.value.at(-1)]))

  const expectedIds = expected.map((m) => m.id).sort().join()
  if (LIBRARY.map(([id]) => id).sort().join() !== expectedIds) fail('the library table and expected.json list different ids')

  const sources = []
  const molecules = LIBRARY.map(([id, cid, name, formula, topic]) => {
    const entry = pubchem.entries.find((e) => e.cid === cid) ?? fail(`${id}: no pubchem.json entry for CID ${cid}`)
    const drawing = readSdf(entry.id, '2d')
    const isExperimental = EXPERIMENTAL_TOPICS.has(topic)
    const geo = geometry.find((g) => g.pubchemCid === cid)
    if (isExperimental !== (geo !== undefined)) fail(`${id}: topic "${topic}" and geometry.json disagree`)

    const source = isExperimental ? cccbdbSource(id, geo) : pubchemSource(cid, entry, pubchem.perRecordCitationPattern, pubchem.retrieved)
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
    const authored = DRAWINGS[id]
    if (authored && elementList(structure) !== authored.atoms) fail(`${id}: the authored drawing is written for the atoms ${authored.atoms}`)

    const atoms = structure.atoms.map((atom, i) => {
      const electrons = valence.get(atom.element) ?? fail(`${id}: element ${atom.element} is not in elements.json`)
      const lonePairs = (electrons - atom.formalCharge - orderSum[i]) / 2
      if (!Number.isInteger(lonePairs) || lonePairs < 0) {
        fail(`${id}: atom ${i} (${atom.element}) would have ${lonePairs} lone pairs`)
      }
      const flat = drawing.atoms[structure.to2d[i]]
      // 2D positions are PubChem drawing units with y pointing up.
      const position2d = authored ? authored.positions[i] : [flat.x, flat.y]
      return { element: atom.element, position: atom.position, position2d, formalCharge: atom.formalCharge, lonePairs }
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

    const written = formulaElements(formula)
    if (written.sort().join() !== atoms.map((a) => a.element).sort().join()) {
      fail(`${id}: the formula ${formula} does not match the atom list`)
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

    const displayFormula = DISPLAY_FORMULAS[id]
    if (displayFormula && displayFormula.replace(/[+-]/g, '') !== formula) {
      fail(`${id}: the display formula ${displayFormula} is not ${formula} with charge markers`)
    }

    const variant = VARIANTS[id]
    return {
      id,
      name,
      formula,
      ...(displayFormula ? { displayFormula } : {}),
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

  for (const id of [...Object.keys(VARIANTS), ...Object.keys(DISPLAY_FORMULAS), ...Object.keys(NOTES), ...Object.keys(DRAWINGS), ...RESONANCE_PAIR, ...Object.keys(AROMATIC_RING)]) {
    if (!molecules.some((m) => m.id === id)) fail(`an authored table names "${id}", which is not in the library`)
  }
  if (molecules.length !== 33) fail(`expected 33 structures, built ${molecules.length}`)
  return { molecules, sources }
}

// ---------------------------------------------------------------------------
// Molecular orbital diagrams

const MO_SOURCE_ID = 'openstax-chem2e-8.4'
// OpenStax Chemistry 2e is licensed CC BY 4.0, which is what lets the descriptions in src/chem-data/periodic.ts keep
// the passages read there. Every citation of the book carries the licence and the attribution OpenStax asks for.
const OPENSTAX_LICENCE =
  'Licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Access for free at https://openstax.org/books/chemistry-2e/pages/1-introduction'
// The research file spells the labels out; the app shows the symbols.
const MO_LABELS = { sigma2s: 'σ2s', 'sigma*2s': 'σ*2s', sigma2p: 'σ2p', 'sigma*2p': 'σ*2p', pi2p: 'π2p', 'pi*2p': 'π*2p' }

// The research note on a molecule's Lewis structure that its MO diagram must carry as a callout
// (spec 6.4). The note points at the research file's own mo[] list, which the app text leaves out.
const MO_CALLOUT_FOR = ['oxygen']
const MO_CALLOUT_POINTER = ' (see mo[])'

function moCallout(expected, id) {
  const note = expected.molecules.find((m) => m.id === id)?.notes
  if (typeof note !== 'string' || !note.includes(MO_CALLOUT_POINTER)) fail(`expected.json: ${id} has no Lewis and MO note`)
  return `The ${note.replace(MO_CALLOUT_POINTER, '')}`
}

function buildMoDiagrams(molecules) {
  const expected = readJson('expected.json')
  const research = expected.mo
  if (research.map((d) => d.id).join() !== 'oxygen,nitrogen') fail('expected.json: expected MO diagrams for oxygen and nitrogen')
  const [{ sourceUrl: url, citation }] = research
  if (!citation.includes('OpenStax')) fail('expected.json: the MO diagrams are expected to cite OpenStax, whose licence line is added below')
  const diagrams = research.map((d) => {
    if (!molecules.some((m) => m.id === d.id)) fail(`MO diagram ${d.id}: not in the library`)
    if (d.sourceUrl !== url || d.citation !== citation) fail(`MO diagram ${d.id}: expected one source for both diagrams`)
    // The research file's own bond order and unpaired count, recomputed from its levels.
    const signed = d.levels.reduce((sum, l) => sum + (l.type === 'bonding' ? l.electrons : -l.electrons), 0)
    const unpaired = d.levels.reduce((sum, l) => sum + Math.min(l.electrons, 2 * l.degeneracy - l.electrons), 0)
    if (signed / 2 !== d.bondOrder || unpaired !== d.unpaired) fail(`MO diagram ${d.id}: the levels do not give the stated bond order and unpaired count`)
    return {
      moleculeId: d.id,
      levels: d.levels.map((l) => ({
        label: MO_LABELS[l.label] ?? fail(`MO diagram ${d.id}: unknown level "${l.label}"`),
        degeneracy: l.degeneracy,
        electrons: l.electrons,
        type: l.type,
      })),
      ...(MO_CALLOUT_FOR.includes(d.id) ? { callout: moCallout(expected, d.id) } : {}),
      sourceId: MO_SOURCE_ID,
    }
  })
  return { diagrams, sources: [{ id: MO_SOURCE_ID, url, citation: `${citation} ${OPENSTAX_LICENCE}` }] }
}

// ---------------------------------------------------------------------------
// Periodic table
//
// Which source fills which field (periodic table spec 5.1):
// - PubChem's periodic table download: number, symbol, name, category, configuration, state, oxidation
//   states, year, and the quantities in PUBCHEM_QUANTITIES; for the 34 elements with no standard atomic
//   weight, also the mass of one isotope.
// - CIAAW's abridged table: the standard atomic weight of the other 84. Each row reads "value ± uncertainty",
//   one conventional value even where the full table gives an interval; the value is stored as printed
//   ("1.0080", "6.94") and the uncertainty is not kept.
// - NIST ASD: the first ionization energy of elements 1 to 108, with NIST's marking of how it was obtained.
// - PubChem's element pages: the covalent radius of elements 1 to 96.
// Notes and choices come from decisions.json and nowhere else.

// The unit of every quantity. Read from PubChem's own page and recorded in docs/research/periodic-table/units.md;
// NIST's file gives the ionization energy in eV. Electronegativity (Pauling scale) is the only one with no unit.
const PERIODIC_UNITS = {
  atomicMass: 'u',
  electronegativity: '',
  covalentRadius: 'pm',
  vdwRadius: 'pm',
  ionizationEnergy: 'eV',
  electronAffinity: 'eV',
  meltingPoint: 'K',
  boilingPoint: 'K',
  density: 'g/cm³',
}

// PubChem column -> field. "AtomicRadius" is a van der Waals radius. "IonizationEnergy" is not used (NIST's is),
// and "CPKHexColor" is not used at all.
const PUBCHEM_QUANTITIES = {
  Electronegativity: 'electronegativity',
  AtomicRadius: 'vdwRadius',
  ElectronAffinity: 'electronAffinity',
  MeltingPoint: 'meltingPoint',
  BoilingPoint: 'boilingPoint',
  Density: 'density',
}
const PUBCHEM_COLUMNS = 'AtomicNumber,Symbol,Name,AtomicMass,CPKHexColor,ElectronConfiguration,Electronegativity,AtomicRadius,IonizationEnergy,ElectronAffinity,OxidationStates,StandardState,MeltingPoint,BoilingPoint,Density,GroupBlock,YearDiscovered'
const CATEGORIES = ['Alkali metal', 'Alkaline earth metal', 'Transition metal', 'Post-transition metal', 'Metalloid', 'Nonmetal', 'Halogen', 'Noble gas', 'Lanthanide', 'Actinide']
// The rows of the element card a note can qualify: field names of the record.
const NOTE_ROWS = ['category', 'configuration', 'standardState', 'oxidationStates', 'yearDiscovered', ...Object.keys(PERIODIC_UNITS)]

const PUBCHEM_TABLE_ID = 'pubchem-periodic-table'
const PUBCHEM_PAGES_ID = 'pubchem-element-pages'
const NIST_ALL_ID = 'nist-asd-ie-all'
const CIAAW_ID = 'ciaaw-abridged-2024'
const CIAAW_TITLE = 'Abridged Standard Atomic Weights 2024'
// Cited by the density notes that quote a handbook: the elements the cross-check found far from other
// tabulations, and the two whose density is that of one form of the element.
const DENSITIES_ID = 'handbook-densities-wikipedia'
// Cited by the atomic-mass notes of the elements whose isotope is not the one this list gives.
const CIAAW_RADIOACTIVE_ID = 'ciaaw-radioactive-elements'
const PUBCHEM = 'PubChem [Internet]. Bethesda (MD): National Library of Medicine (US), National Center for Biotechnology Information; 2004-.'

// What the group, period and block descriptions, the group 3 note and the legend notes in src/chem-data/periodic.ts cite, and
// (section 6.5) the element card's sentence on electron affinity in src/chem-data/periodicCard.ts. Each
// page was read on the retrieval date of the saved downloads. Beside the sentence it supports, there, is the passage
// read (OpenStax, which is CC BY 4.0, and lines of PubChem's pages) or, for any other source, where the passage
// is and what it establishes in this project's words. The pages themselves are not saved.
const OPENSTAX = 'Flowers, P.; Theopold, K.; Langley, R.; Robinson, W. R. Chemistry 2e; OpenStax: Houston, TX, 2019;'
const OPENSTAX_SECTIONS = [
  ['2.5', 'The Periodic Table', '2-5-the-periodic-table'],
  ['6.4', 'Electronic Structure of Atoms (Electron Configurations)', '6-4-electronic-structure-of-atoms-electron-configurations'],
  ['6.5', 'Periodic Variations in Element Properties', '6-5-periodic-variations-in-element-properties'],
  ['18.1', 'Periodicity', '18-1-periodicity'],
  ['18.3', 'Structure and General Properties of the Metalloids', '18-3-structure-and-general-properties-of-the-metalloids'],
  ['18.4', 'Structure and General Properties of the Nonmetals', '18-4-structure-and-general-properties-of-the-nonmetals'],
  ['18.11', 'Occurrence, Preparation, and Properties of Halogens', '18-11-occurrence-preparation-and-properties-of-halogens'],
  ['18.12', 'Occurrence, Preparation, and Properties of the Noble Gases', '18-12-occurrence-preparation-and-properties-of-the-noble-gases'],
  ['19.1', 'Occurrence, Preparation, and Properties of Transition Metals and Their Compounds', '19-1-occurrence-preparation-and-properties-of-transition-metals-and-their-compounds'],
]

function descriptionSources(retrieved) {
  return [
    ...OPENSTAX_SECTIONS.map(([section, title, page]) => ({
      id: `openstax-chem2e-${section}`,
      url: `https://openstax.org/books/chemistry-2e/pages/${page}`,
      citation: `${OPENSTAX} Section ${section} ${title} (${retrieved}). ${OPENSTAX_LICENCE}`,
    })),
    {
      id: 'iupac-red-book-2005',
      url: 'https://iupac.org/wp-content/uploads/2016/07/Red_Book_2005.pdf',
      citation: 'Connelly, N. G.; Damhus, T.; Hartshorn, R. M.; Hutton, A. T., Eds. Nomenclature of Inorganic Chemistry: IUPAC Recommendations 2005; RSC Publishing: Cambridge, 2005; Section IR-3.5 Elements in the periodic table (p 51).',
    },
    {
      id: 'iupac-periodic-table',
      url: 'https://iupac.org/what-we-do/periodic-table-of-elements/',
      citation: `International Union of Pure and Applied Chemistry (IUPAC). Periodic Table of Elements, the section "Group 3" (${retrieved}).`,
    },
    {
      id: 'rsc-periodic-table',
      url: 'https://periodic-table.rsc.org/',
      citation: `Royal Society of Chemistry. Periodic Table: how the table is drawn, its notes on the blocks, and its element pages (https://periodic-table.rsc.org/element/<atomic number>/; ${retrieved}).`,
    },
    {
      id: 'iupac-group-3-report-2021',
      url: 'https://doi.org/10.1515/ci-2021-0115',
      citation: `Scerri, E. Provisional Report on Discussions on Group 3 of The Periodic Table. Chem. Int. 2021, 43 (1), 31-34 (${retrieved}). A progress report from the task group of the IUPAC project "The constitution of group 3 of the periodic table" (https://iupac.org/project/2015-039-2-200).`,
    },
  ]
}

// The retrieval date and the NIST query are the ones recorded beside the saved copies.
function periodicSources(manifest) {
  const saved = (file) => manifest.files.find((f) => f.file === file) ?? fail(`MANIFEST.json does not list ${file}`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(manifest.retrieved)) fail('MANIFEST.json has no retrieval date')
  const retrieved = `retrieved ${manifest.retrieved}`
  // The page was read at this revision, and the copy kept in sources/ is that revision (sources/README.md).
  const revision = /^Wikipedia, Densities of the elements \(data page\), revision (\d+)$/.exec(saved('wikipedia-densities-of-the-elements-data-page.wikitext').what)?.[1] ?? fail('MANIFEST.json does not give the revision of the densities page')
  return [
    {
      id: PUBCHEM_TABLE_ID,
      url: 'https://pubchem.ncbi.nlm.nih.gov/periodic-table/',
      citation: `${PUBCHEM} Periodic Table of Elements (data: https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON, ${retrieved}). PubChem compiles the table from other sources, named on each element's page: Jefferson Lab, Los Alamos National Laboratory, IUPAC CIAAW, the IAEA Atomic Mass Data Center, and journal papers. Source: National Library of Medicine.`,
    },
    {
      id: NIST_ALL_ID,
      url: saved('nist-asd-ie-neutral.txt').url,
      citation: `Kramida, A., Ralchenko, Yu., Reader, J., and NIST ASD Team. NIST Atomic Spectra Database, Ground States and Ionization Energies: the neutral atoms, hydrogen to hassium (${retrieved}). National Institute of Standards and Technology. https://doi.org/10.18434/T4W30F`,
    },
    {
      id: PUBCHEM_PAGES_ID,
      url: 'https://pubchem.ncbi.nlm.nih.gov/periodic-table/',
      citation: `${PUBCHEM} Element pages, one per element, opened from the Periodic Table of Elements (data: https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/element/<atomic number>/JSON, ${retrieved}). The covalent radii carried there are those of Cordero, B. et al. Covalent radii revisited. Dalton Trans. 2008, (21), 2832-2838 (https://doi.org/10.1039/b801115j): they equal Cordero's values for the 11 elements this app checked one by one; the paper is paywalled and was not read. Source: National Library of Medicine.`,
    },
    {
      id: DENSITIES_ID,
      url: `https://en.wikipedia.org/w/index.php?title=Densities_of_the_elements_(data_page)&oldid=${revision}`,
      citation: `Lide, D. R., Ed. CRC Handbook of Chemistry and Physics, 84th ed.; CRC Press: Boca Raton, FL, 2003; Section 4, Physical Constants of Inorganic Compounds. Dean, J. A., Ed. Lange's Handbook of Chemistry, 15th ed.; McGraw-Hill: New York, 1999; Table 3.2. Neither handbook was read: their densities were taken from a secondary transcription, Wikipedia's Densities of the elements (data page), revision ${revision}, linked here (${retrieved}).`,
    },
    {
      id: CIAAW_RADIOACTIVE_ID,
      url: saved('ciaaw-radioactive-elements.html').url,
      citation: `IUPAC Commission on Isotopic Abundances and Atomic Weights (CIAAW), Radioactive elements: the most stable known isotopes of the radioactive elements, compiled from the NUBASE2020 evaluation (${retrieved}).`,
    },
    ...descriptionSources(retrieved),
  ]
}

const PLAIN_NUMBER = /^\d+(\.\d+)?$/

/** A quantity in the source's own digits. Fails on anything that is not a plain positive number. */
function quantity(published, field, sourceId, where) {
  if (typeof published !== 'string' || !PLAIN_NUMBER.test(published) || !(Number(published) > 0)) {
    fail(`${where}: ${field} ${JSON.stringify(published)} is not a positive number`)
  }
  return { value: Number(published), published, unit: PERIODIC_UNITS[field], sourceId }
}

const onlyKeys = (object, keys, where, optional = []) => {
  const unknown = Object.keys(object).filter((key) => !keys.includes(key) && !optional.includes(key))
  const missing = keys.filter((key) => !(key in object))
  if (unknown.length > 0 || missing.length > 0) fail(`${where}: expected exactly the keys ${keys.join(', ')}`)
}

/** decisions.json, checked: { isotopes, covalentChoice, notesFor(symbol) }. A note comes back with its valueAbsent mark. */
function readDecisions(symbols, sourceIds) {
  const decisions = JSON.parse(readFileSync(join(periodicResearch, 'decisions.json'), 'utf8'))
  onlyKeys(decisions, ['about', 'isotopeMasses', 'covalentRadius', 'notes'], 'decisions.json')
  const known = (symbol, where) => symbols.has(symbol) || fail(`decisions.json: ${where} names "${symbol}", which is not an element symbol`)

  for (const [symbol, isotope] of Object.entries(decisions.isotopeMasses)) {
    known(symbol, 'isotopeMasses')
    onlyKeys(isotope, ['massNumber', 'estimated'], `decisions.json: isotopeMasses.${symbol}`)
    if (!Number.isInteger(isotope.massNumber) || typeof isotope.estimated !== 'boolean') fail(`decisions.json: isotopeMasses.${symbol} is malformed`)
  }
  for (const [symbol, value] of Object.entries(decisions.covalentRadius)) {
    known(symbol, 'covalentRadius')
    if (typeof value !== 'string') fail(`decisions.json: covalentRadius.${symbol} must be the published text`)
  }

  const notes = new Map()
  decisions.notes.forEach((note, i) => {
    const where = `decisions.json: notes[${i}]`
    // valueAbsent marks a note about a value the source leaves empty. It is checked against the record and not written out.
    onlyKeys(note, ['symbols', 'row', 'text', 'sourceId'], where, ['valueAbsent'])
    if ('valueAbsent' in note && note.valueAbsent !== true) fail(`${where}: valueAbsent, where given, must be true`)
    if (!Array.isArray(note.symbols) || note.symbols.length === 0 || new Set(note.symbols).size !== note.symbols.length) fail(`${where}: symbols must be a list with no repeats`)
    if (!NOTE_ROWS.includes(note.row)) fail(`${where}: unknown row "${note.row}"`)
    if (typeof note.text !== 'string' || note.text.trim() === '' || note.text !== note.text.trim()) fail(`${where}: text is empty or padded`)
    if (!sourceIds.has(note.sourceId)) fail(`${where}: unknown source "${note.sourceId}"`)
    for (const symbol of note.symbols) {
      known(symbol, `notes[${i}]`)
      const list = notes.get(symbol) ?? []
      if (list.some((other) => other.row === note.row && other.text === note.text)) fail(`${where}: repeats a note on ${symbol}`)
      notes.set(symbol, [...list, { row: note.row, text: note.text, sourceId: note.sourceId, valueAbsent: note.valueAbsent === true }])
    }
  })
  return { isotopes: decisions.isotopeMasses, covalentChoice: decisions.covalentRadius, notesFor: (symbol) => notes.get(symbol) ?? [] }
}

/** The covalent radii an element page lists, as published: [] or ['31'] or, for a few elements, several. */
function covalentRadii(page, where) {
  const lines = page.lines.filter((line) => line.name === 'Covalent Atomic Radius')
  if (lines.length === 0) return []
  if (lines.length > 1) fail(`${where}: more than one covalent radius line`)
  // "31(5) pm (Covalent)", "28 pm (Covalent)", "76(1)[sp3], 73(2)[sp2], 69(1)[sp] pm (Covalent)":
  // a value, its uncertainty in the last digits, and a label where there are several.
  const list = /^(.+) pm \(Covalent\)$/.exec(lines[0].text)?.[1] ?? fail(`${where}: unreadable covalent radius "${lines[0].text}"`)
  return list.split(', ').map((entry) => /^(\d+)(\(\d+\))?(\[[^\]]+\])?$/.exec(entry)?.[1] ?? fail(`${where}: unreadable covalent radius "${lines[0].text}"`))
}

function buildPeriodicTable(otherSourceIds) {
  const read = (name) => readFileSync(join(periodicResearch, name), 'utf8')
  const sources = periodicSources(JSON.parse(read('sources/MANIFEST.json')))
  const sourceIds = new Set([...otherSourceIds, ...sources.map((s) => s.id)])
  if (!sourceIds.has(CIAAW_ID)) fail(`no source "${CIAAW_ID}"`)

  const download = JSON.parse(read('pubchem-periodic-table.json'))
  if (download.Table.Columns.Column.join() !== PUBCHEM_COLUMNS) fail('the PubChem download does not have the expected columns')
  const rows = parsePubChem(download)
  if (rows.length !== 118) fail(`the PubChem download has ${rows.length} rows, expected 118`)

  // The units in the table above are the ones PubChem's page labels its columns with.
  const labels = JSON.parse(read('sources/pubchem-ptable-column-labels.json'))
  for (const [column, field] of [['AtomicMass', 'atomicMass'], ...Object.entries(PUBCHEM_QUANTITIES)]) {
    if ((labels[column]?.unit ?? '') !== PERIODIC_UNITS[field]) fail(`PubChem labels ${column} with the unit "${labels[column]?.unit}", not "${PERIODIC_UNITS[field]}"`)
  }

  const ciaaw = parseCiaawAbridged(read('sources/ciaaw-abridged-atomic-weights.html'))
  if (ciaaw.title !== CIAAW_TITLE || ciaaw.rows.length !== 118) fail(`the saved CIAAW page is not "${CIAAW_TITLE}" with 118 rows`)
  const nistText = read('sources/nist-asd-ie-neutral.txt')
  if (!nistText.includes('Ionization Energy (eV)')) fail('the saved NIST file does not give the ionization energy in eV')
  const nist = parseNistIe(nistText)
  if (nist.length !== 108) fail(`the saved NIST file has ${nist.length} rows, expected 108`)
  const pages = JSON.parse(read('sources/pubchem-element-pages-extract.json'))
  if (Object.keys(pages).length !== 118) fail('the saved PubChem element pages are not 118 records')

  // The download's symbols and names are checked before decisions.json is read against them, so that a fault
  // in the download is not reported as a fault in decisions.json.
  rows.forEach((row, i) => {
    const where = `periodic table row ${i + 1}`
    if (row.AtomicNumber !== String(i + 1)) fail(`${where}: atomic number is "${row.AtomicNumber}"`)
    if (!/^[A-Z][a-z]?$/.test(row.Symbol)) fail(`${where}: symbol is "${row.Symbol}"`)
    if (row.Name.trim() === '' || row.Name !== row.Name.trim()) fail(`${where}: name is empty or padded`)
  })
  if (new Set(rows.map((row) => row.Symbol)).size !== 118 || new Set(rows.map((row) => row.Name)).size !== 118) fail('the PubChem download repeats a symbol or a name')

  const decisions = readDecisions(new Set(rows.map((row) => row.Symbol)), sourceIds)

  const elements = rows.map((row, i) => {
    const atomicNumber = i + 1
    const where = `periodic table row ${atomicNumber}`
    const { Symbol: symbol, Name: name } = row
    if (!CATEGORIES.includes(row.GroupBlock)) fail(`${where}: unknown category "${row.GroupBlock}"`)

    // "(predicted)" and "(calculated)" are the source's own markings; the rest of the text is kept as published.
    const marked = /^(.*?)(?: \((predicted|calculated)\))?$/.exec(row.ElectronConfiguration)
    const [, text, qualifier] = marked
    if (text === '' || /[()]/.test(text)) fail(`${where}: configuration "${row.ElectronConfiguration}" is empty or carries an unknown marking`)
    // The text is kept as published, so it must be text the app can read: its electrons sum to the atomic number.
    try {
      checkConfiguration(text, atomicNumber)
    } catch (error) {
      fail(`${where}: ${error.message}`)
    }

    const state = /^(Expected to be a )?(Solid|Liquid|Gas)$/.exec(row.StandardState) ?? fail(`${where}: unknown state "${row.StandardState}"`)
    if (row.YearDiscovered !== 'Ancient' && !/^\d{3,4}$/.test(row.YearDiscovered)) fail(`${where}: year is "${row.YearDiscovered}"`)

    // Atomic mass: CIAAW's standard atomic weight where there is one, otherwise the isotope mass PubChem prints.
    const weight = ciaaw.rows[i]
    if (weight.z !== atomicNumber || weight.symbol !== symbol) fail(`${where}: the CIAAW row is ${weight.z} ${weight.symbol}`)
    if (weight.value === null && weight.text !== '—') fail(`${where}: unreadable CIAAW entry "${weight.text}"`)
    const isotope = decisions.isotopes[symbol]
    if ((weight.value === null) !== (isotope !== undefined)) fail(`${where}: decisions.json must name an isotope for exactly the elements with no standard atomic weight`)
    const pubchemMass = quantity(row.AtomicMass, 'atomicMass', PUBCHEM_TABLE_ID, where)
    if (isotope && Math.round(pubchemMass.value) !== isotope.massNumber) fail(`${where}: mass ${row.AtomicMass} does not round to mass number ${isotope.massNumber}`)
    const atomicMass = isotope
      ? { ...pubchemMass, kind: 'isotope-mass', massNumber: isotope.massNumber, estimated: isotope.estimated }
      : { ...quantity(weight.value, 'atomicMass', CIAAW_ID, where), kind: 'standard-atomic-weight' }

    const fromPubChem = Object.fromEntries(
      Object.entries(PUBCHEM_QUANTITIES).flatMap(([column, field]) => (row[column] === '' ? [] : [[field, quantity(row[column], field, PUBCHEM_TABLE_ID, where)]])),
    )
    // The column is not shown, but an unreadable value still means the download is not what this script expects.
    if (row.IonizationEnergy !== '') quantity(row.IonizationEnergy, 'ionizationEnergy', PUBCHEM_TABLE_ID, where)

    const page = pages[atomicNumber]
    if (page?.title !== name) fail(`${where}: the saved element page is "${page?.title}"`)
    const radii = covalentRadii(page, where)
    const choice = decisions.covalentChoice[symbol]
    if ((radii.length > 1) !== (choice !== undefined)) fail(`${where}: decisions.json must choose a covalent radius for exactly the elements with several`)
    if (choice !== undefined && choice !== radii[0]) fail(`${where}: the covalent radius chosen is not the first listed (${radii[0]})`)

    const ie = nist[i]
    if (ie && (ie.z !== atomicNumber || ie.charge !== 0 || ie.spectrum !== `${symbol} I`)) fail(`${where}: the NIST row is ${ie.spectrum}`)

    const authored = decisions.notesFor(symbol)
    if (radii.length > 1 && !authored.some((note) => note.row === 'covalentRadius')) fail(`${where}: a chosen covalent radius needs a note saying so`)
    const notes = authored.map(({ row, text, sourceId }) => ({ row, text, sourceId }))

    const record = {
      atomicNumber,
      symbol,
      name,
      category: row.GroupBlock,
      configuration: { text, ...(qualifier ? { qualifier } : {}) },
      standardState: { state: state[2], expected: state[1] !== undefined },
      ...(row.OxidationStates === '' ? {} : { oxidationStates: row.OxidationStates }),
      yearDiscovered: row.YearDiscovered === 'Ancient' ? 'Ancient' : Number(row.YearDiscovered),
      atomicMass,
      ...(fromPubChem.electronegativity ? { electronegativity: fromPubChem.electronegativity } : {}),
      ...(radii.length > 0 ? { covalentRadius: quantity(radii[0], 'covalentRadius', PUBCHEM_PAGES_ID, where) } : {}),
      ...(fromPubChem.vdwRadius ? { vdwRadius: fromPubChem.vdwRadius } : {}),
      ...(fromPubChem.electronAffinity ? { electronAffinity: fromPubChem.electronAffinity } : {}),
      ...(ie ? { ionizationEnergy: { ...quantity(ie.energy, 'ionizationEnergy', NIST_ALL_ID, where), flag: ie.flag } } : {}),
      ...(fromPubChem.meltingPoint ? { meltingPoint: fromPubChem.meltingPoint } : {}),
      ...(fromPubChem.boilingPoint ? { boilingPoint: fromPubChem.boilingPoint } : {}),
      ...(fromPubChem.density ? { density: fromPubChem.density } : {}),
      ...(notes.length > 0 ? { notes } : {}),
      sourceId: PUBCHEM_TABLE_ID,
    }
    for (const note of authored) {
      const problem = noteProblem(record, note)
      if (problem) fail(`decisions.json: a note on ${note.row}: ${problem}`)
    }
    return record
  })
  return { elements, sources }
}

// ---------------------------------------------------------------------------
// Titration lab
//
// The record is authored in docs/research/phase-3/titration.json: three bottles, the cited constants of the flask
// model, and the model's parameters with their rationales. Every source is in sources/MANIFEST.json, and the ones
// with a `file` have their copy kept beside it. A value whose source is kept is checked against the copy here. A
// value read from a page or a PDF that is not kept cannot be: the manifest records what the source prints and
// where, for a person to check, and src/chem-data/titration/inputs.test.ts holds the record to the manifest. The
// acid bottle's hazard statements are of that kind, a sheet's that is read and not kept, and for them the build
// itself holds the record to the manifest's rows.

const BOTTLES = ['hcl', 'naoh', 'indicator']
const CONSTANTS = ['waterIonProduct', 'indicatorPKas', 'indicatorMolarMass', 'indicatorStrength', 'indicatorDropVolume', 'henryCo2', 'atmosphericCo2', 'carbonicPKas']
// The sources whose kept copy a constant is checked against: the constant must cite that source and no other.
const NOAA_ID = 'noaa-gml-co2-annmean-gl'
const CARBONIC_ID = 'perrin-1982-wikipedia'
const DROP_ID = 'drop-unit-wikipedia'
const INDICATOR_RECORD_ID = 'pubchem-cid-4764'
// The acid bottle's statements are not read from a PubChem record (D4 as changed on 2026-10-05, on a reading of the
// owner's words that the owner has not confirmed). They are those of a supplier's safety data sheet for concentrated
// hydrochloric acid, which was read and is not kept, so the bottle must cite that sheet and is held to the manifest's
// rows for it.
const ACID_SHEET_ID = 'flinn-sds-395'
// "Toxic if inhaled". PubChem's record for CID 313, as it was read on 2026-10-04, printed this code under entries
// named hydrogen chloride, the gas. D4 keeps the gas's statements off this bottle, which holds the acid, and the
// sheet does not print the code, so the build refuses it there.
const ACID_NEVER = ['H331']

function buildTitration(otherSourceIds) {
  const read = (name) => readFileSync(join(titrationResearch, name))
  const input = JSON.parse(read('titration.json'))
  const manifest = JSON.parse(read('sources/MANIFEST.json'))

  const sources = manifest.sources.map(({ id, url, citation }) => {
    if ([id, url, citation].some((text) => typeof text !== 'string' || text.trim() === '')) fail(`phase-3 MANIFEST.json: the source "${id}" needs an id, a url and a citation`)
    if (otherSourceIds.includes(id)) fail(`phase-3 MANIFEST.json: the source id "${id}" is already in use`)
    return { id, url, citation }
  })
  if (new Set(sources.map((s) => s.id)).size !== sources.length) fail('phase-3 MANIFEST.json repeats a source id')
  const sourceOf = ({ sourceId }, where) => manifest.sources.find((s) => s.id === sourceId) ?? fail(`${where}: unknown source "${sourceId}"`)

  // The kept copies of each source, as text: its `file`, then any second copy of the same record under `alsoKept`.
  // Each is the file the manifest hashed, so a check below reads what was read when the record was written.
  const kept = new Map(
    manifest.sources.map((source) => [
      source.id,
      [source, ...(source.alsoKept ?? [])]
        .filter((copy) => copy.file !== undefined)
        .map(({ file, sha256 }) => {
          const bytes = read(join('sources', file))
          checkSha256(bytes, sha256, file)
          return bytes.toString('utf8')
        }),
    ]),
  )
  /** The kept copies of the source a value cites, which must be the source `id` where one is given. */
  const copies = (cited, where, id = cited.sourceId) => {
    if (cited.sourceId !== id) fail(`${where}: cites "${cited.sourceId}", but is checked against the kept copy of "${id}"`)
    const texts = kept.get(sourceOf(cited, where).id)
    if (texts.length === 0) fail(`${where}: the source "${id}" has no kept copy to check the value against`)
    return texts
  }

  onlyKeys(input, ['bottles', 'constants', 'parameters'], 'titration.json')
  onlyKeys(input.bottles, BOTTLES, 'titration.json: bottles')
  onlyKeys(input.constants, CONSTANTS, 'titration.json: constants')

  // The base's and the indicator's statements are read from the kept PubChem record of each: `reference` names the
  // entry, and is checked and not written out. The acid's are a sheet's, and that bottle has no `reference`.
  const bottles = Object.fromEntries(
    BOTTLES.map((key) => {
      const where = `titration.json: bottles.${key}`
      const fromSheet = key === 'hcl'
      onlyKeys(input.bottles[key], ['name', 'formula', 'pubchemCid', 'classifiedAs', ...(fromSheet ? [] : ['reference']), 'hazards'], where)
      const { reference, ...bottle } = input.bottles[key]
      onlyKeys(bottle.hazards, ['signalWord', 'statements', 'note', 'sourceId'], `${where}.hazards`)
      onlyKeys(bottle.hazards.note, ['value', 'sourceId'], `${where}.hazards.note`)
      sourceOf(bottle.hazards.note, `${where}.hazards.note`)
      if (fromSheet) {
        if (bottle.hazards.sourceId !== ACID_SHEET_ID) fail(`${where}.hazards: cites "${bottle.hazards.sourceId}", but the acid's statements are those of the sheet "${ACID_SHEET_ID}"`)
        const sheet = sourceOf(bottle.hazards, `${where}.hazards`)
        if (kept.get(sheet.id).length > 0) fail(`${where}.hazards: the sheet "${sheet.id}" is cited as read and not kept, but the manifest lists a copy of it`)
        checkSheetHazards(sheet, `bottles.${key}.hazards`, bottle.hazards, ACID_NEVER)
        return [key, bottle]
      }
      const record = JSON.parse(copies(bottle.hazards, `${where}.hazards`, `pubchem-cid-${bottle.pubchemCid}`)[0])
      if (record.Record.RecordNumber !== bottle.pubchemCid) fail(`${where}: the kept record is that of CID ${record.Record.RecordNumber}`)
      checkHazards(record, reference, bottle.hazards)
      return [key, bottle]
    }),
  )

  const { constants } = input
  const where = (key) => `titration.json: constants.${key}`
  for (const key of CONSTANTS) {
    for (const constant of [constants[key]].flat()) {
      onlyKeys(constant, ['value', 'unit', 'sourceId'], where(key), ['published', 'note', ...(key === 'atmosphericCo2' ? ['year'] : [])])
      checkPublished(constant, where(key))
      sourceOf(constant, where(key))
    }
  }
  // The checks against the kept copies. Each compares the figure the record says its source prints, digit for digit.
  const figure = (key, constant = constants[key]) => constant.published ?? fail(`${where(key)}: a value checked against a kept copy needs the figure its source prints`)
  const { atmosphericCo2, indicatorMolarMass, indicatorDropVolume, carbonicPKas } = constants
  checkAnnualMean(copies(atmosphericCo2, where('atmosphericCo2'), NOAA_ID)[0], atmosphericCo2.year, figure('atmosphericCo2'))
  // PubChem serves the molecular weight from another address than the GHS section, so the record has two kept copies.
  const properties = copies(indicatorMolarMass, where('indicatorMolarMass'), INDICATOR_RECORD_ID).map((text) => JSON.parse(text)).find((copy) => copy.PropertyTable)
  checkMolecularWeight(properties ?? fail(`${where('indicatorMolarMass')}: no kept copy of PubChem's property table`), bottles.indicator.pubchemCid, figure('indicatorMolarMass'))
  // The indicator's strength is not among them: its catalogue listing was read and is not kept, like the papers and
  // the NIST pages, so it rests on what the manifest says the page printed on the day it was read.
  for (const [key, list, id] of [['carbonicPKas', carbonicPKas, CARBONIC_ID], ['indicatorDropVolume', [indicatorDropVolume], DROP_ID]]) {
    const [copy] = list.map((constant) => copies(constant, where(key), id)[0])
    checkWikipediaCopy(JSON.parse(copy), sourceOf(list[0], where(key)).citation, list.map((constant) => figure(key, constant)))
  }

  for (const [key, parameter] of Object.entries(input.parameters)) onlyKeys(parameter, ['value', 'rationale'], `titration.json: parameters.${key}`)

  return { titration: { bottles, constants, parameters: input.parameters }, sources }
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

// What the search needs for each library entry, so the app shell can list the molecules without
// loading their structure files. One row per entry: the first file of a variant group stands for it.
function libraryIndex(molecules) {
  return molecules
    .filter((m, i) => !m.variantGroup || molecules.findIndex((other) => other.variantGroup === m.variantGroup) === i)
    .map(({ id, name, formula, charge, topic }) => ({ id, name, formula, charge, topic }))
}

// What the search needs for each element, so the app shell can list all 118 without loading the table.
function elementIndex(periodicTable) {
  return periodicTable.map(({ symbol, name, atomicNumber }) => ({ symbol, name, atomicNumber }))
}

function main() {
  const { elements, sources: elementSources } = buildElements()
  const { molecules, sources: moleculeSources } = buildMolecules(elements)
  const { diagrams, sources: moSources } = buildMoDiagrams(molecules)
  const otherSources = [...elementSources, ...moleculeSources, ...moSources]
  const { elements: periodicTable, sources: periodicTableSources } = buildPeriodicTable(otherSources.map((s) => s.id))
  const earlierSources = [...otherSources, ...periodicTableSources]
  const { titration, sources: titrationSources } = buildTitration(earlierSources.map((s) => s.id))
  const sources = [...earlierSources, ...titrationSources]
  if (new Set(sources.map((s) => s.id)).size !== sources.length) fail('duplicate source ids')

  // Everything is built before anything is written.
  const moleculeDir = join(out, 'molecules')
  rmSync(moleculeDir, { recursive: true, force: true })
  mkdirSync(moleculeDir, { recursive: true })
  for (const molecule of molecules) writeFileSync(join(moleculeDir, `${molecule.id}.json`), toJson(molecule))
  writeFileSync(join(moleculeDir, 'index.ts'), moleculeIndex(molecules))
  writeFileSync(join(out, 'elements.json'), toJson(elements))
  writeFileSync(join(out, 'mo-diagrams.json'), toJson(diagrams))
  writeFileSync(join(out, 'library-index.json'), toJson(libraryIndex(molecules)))
  writeFileSync(join(out, 'periodic-table.json'), toJson(periodicTable))
  writeFileSync(join(out, 'element-index.json'), toJson(elementIndex(periodicTable)))
  writeFileSync(join(out, 'titration/titration.json'), toJson(titration))
  writeFileSync(join(out, 'sources.json'), toJson(sources))
  process.stdout.write(
    `Wrote ${elements.length} elements, ${molecules.length} structures, ${diagrams.length} MO diagrams, ${periodicTable.length} periodic table records, the titration lab's record, ${sources.length} sources.\n`,
  )
}

try {
  main()
} catch (error) {
  process.stderr.write(`build-chem-data: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
}
