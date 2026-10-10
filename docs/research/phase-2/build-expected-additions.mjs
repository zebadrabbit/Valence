// Writes into expected.json the expected values of the molecules added on 2026-10-09: for every atom its
// formal charge, lone pairs, oxidation state, steric number, geometry and hybridization, and for every bond its
// order, whether it is aromatic, and its resonance note. Kept as the research record of how those entries
// were made; nothing here runs in the app or in its build, and it shares no code with src/chem-data/derive.ts.
//
//   node docs/research/phase-2/build-expected-additions.mjs          writes the entries
//   node docs/research/phase-2/build-expected-additions.mjs table    also prints every atom that is not a hydrogen,
//                                                                    one line each, for reading against a textbook
//
// Where each structure comes from: the atoms, bonds and charges of the saved PubChem 2D record, or, for a
// molecule in geometry.json, its atoms and bonds there. Then the conventions of this file (the entries of
// `conventions` in expected.json, the last five of which this script adds) are applied by the tables below.

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { parseSdf } from './parse-sdf.mjs'

const here = import.meta.dirname
const json = (path) => JSON.parse(readFileSync(join(here, path), 'utf8'))

// File id and the name the table gives the entry. The ids are the ones in pubchem.json.
const ADDED = [
  ['hydrogen', 'hydrogen (H2)'],
  ['chlorine', 'chlorine (Cl2)'],
  ['hydrogen-fluoride', 'hydrogen fluoride (HF)'],
  ['carbon-monoxide', 'carbon monoxide (CO)'],
  ['ozone', 'ozone (O3)'],
  ['hydrogen-sulfide', 'hydrogen sulfide (H2S)'],
  ['hydrogen-cyanide', 'hydrogen cyanide (HCN)'],
  ['nitric-acid', 'nitric acid (HNO3)'],
  ['sulfuric-acid', 'sulfuric acid (H2SO4)'],
  ['phosphoric-acid', 'phosphoric acid (H3PO4)'],
  ['hydroxide', 'hydroxide ion (OH-)'],
  ['ammonium', 'ammonium ion (NH4+)'],
  ['nitrate', 'nitrate ion (NO3-)'],
  ['carbonate', 'carbonate ion (CO3 2-)'],
  ['sulfate', 'sulfate ion (SO4 2-)'],
  ['phosphate', 'phosphate ion (PO4 3-)'],
  ['acetate', 'acetate ion (CH3COO-)'],
  ['sulfur-trioxide', 'sulfur trioxide (SO3)'],
  ['phosphorus-trichloride', 'phosphorus trichloride (PCl3)'],
  ['carbon-tetrachloride', 'carbon tetrachloride (CCl4)'],
  ['dichloromethane', 'dichloromethane (CH2Cl2)'],
  ['chloroform', 'chloroform (CHCl3)'],
  ['sulfur-tetrafluoride', 'sulfur tetrafluoride (SF4)'],
  ['chlorine-trifluoride', 'chlorine trifluoride (ClF3)'],
  ['xenon-difluoride', 'xenon difluoride (XeF2)'],
  ['methanol', 'methanol (CH3OH)'],
  ['dimethyl-ether', 'dimethyl ether (CH3OCH3)'],
  ['propane', 'propane (C3H8)'],
  ['butane', 'butane (C4H10)'],
  ['isobutane', '2-methylpropane, isobutane (C4H10)'],
  ['cyclohexane', 'cyclohexane (C6H12)'],
  ['propene', 'propene (C3H6)'],
  ['acetaldehyde', 'acetaldehyde (CH3CHO)'],
  ['formic-acid', 'formic acid (HCOOH)'],
  ['toluene', 'toluene (C6H5CH3)'],
  ['phenol', 'phenol (C6H5OH)'],
  ['acetonitrile', 'acetonitrile (CH3CN)'],
  ['diethyl-ether', 'diethyl ether (C2H5OC2H5)'],
  ['glycerol', 'glycerol (C3H8O3)'],
  ['lactic-acid', 'L-lactic acid (C3H6O3)'],
  ['citric-acid', 'citric acid (C6H8O7)'],
  ['serine', 'L-serine, neutral (C3H7NO3)'],
  ['serine-zwitterion', 'L-serine, zwitterion'],
  ['cysteine', 'L-cysteine, neutral (C3H7NO2S)'],
  ['cysteine-zwitterion', 'L-cysteine, zwitterion'],
  ['adenine', 'adenine (C5H5N5)'],
  ['thymine', 'thymine (C5H6N2O2)'],
  ['beta-d-fructofuranose', 'beta-D-fructofuranose (C6H12O6)'],
  ['sucrose', 'sucrose (C12H22O11)'],
  ['palmitic-acid', 'palmitic acid (C16H32O2)'],
  ['caffeine', 'caffeine (C8H10N4O2)'],
  ['aspirin', 'aspirin, acetylsalicylic acid (C9H8O4)'],
  ['acetaminophen', 'acetaminophen, paracetamol (C8H9NO2)'],
  ['ibuprofen', 'ibuprofen (C13H18O2)'],
  ['vanillin', 'vanillin (C8H8O3)'],
  ['menthol', '(-)-menthol (C10H20O)'],
  ['limonene', '(+)-limonene (C10H16)'],
  ['capsaicin', 'capsaicin (C18H27NO3)'],
  ['cinnamaldehyde', 'cinnamaldehyde (C9H8O)'],
  ['ascorbic-acid', 'L-ascorbic acid (C6H8O6)'],
  ['theobromine', 'theobromine (C7H8N4O2)'],
  ['nicotine', 'nicotine (C10H14N2)'],
  ['isoamyl-acetate', 'isoamyl acetate (C7H14O2)'],
  ['methyl-salicylate', 'methyl salicylate (C8H8O3)'],
  ['benzaldehyde', 'benzaldehyde (C6H5CHO)'],
  ['geosmin', 'geosmin (C12H22O)'],
  ['dopamine', 'dopamine (C8H11NO2)'],
  ['serotonin', 'serotonin (C10H12N2O)'],
  ['adrenaline', 'adrenaline, epinephrine (C9H13NO3)'],
  ['indigo', 'indigo (C16H10N2O2)'],
  ['isooctane', '2,2,4-trimethylpentane (C8H18)'],
  ['aspartame', 'aspartame (C14H18N2O5)'],
]

// Convention "octet-forms": PubChem draws these with S=O or P=O double bonds and an expanded valence shell.
// Here each double bond from the sulfur or phosphorus atom to an oxygen beyond the number kept is drawn single:
// that oxygen takes a lone pair and a formal charge of -1, and the central atom +1.
const OCTET_FORM = { 'sulfur-trioxide': 1, sulfate: 0, phosphate: 0, 'sulfuric-acid': 0, 'phosphoric-acid': 0 }

// Convention "resonance-sets": the bonds from one atom to its terminal oxygens are drawn as one of this many
// equivalent resonance structures.
const RESONANCE_SET = { ozone: 2, 'nitric-acid': 2, acetate: 2, 'serine-zwitterion': 2, 'cysteine-zwitterion': 2, nitrate: 3, carbonate: 3, 'sulfur-trioxide': 3 }
const RESONANCE_NOTE = {
  2: ['one of two equivalent resonance structures; effective order 1.5', 1.5],
  3: ['one of three equivalent resonance structures; effective order 1.33', 1.33],
}

// Convention "benzene-rings": how many benzene rings (six carbons, alternating double and single bonds) each
// structure has. Every bond of such a ring carries the aromatic flag; no other bond does.
const BENZENE_RINGS = {
  toluene: 1,
  phenol: 1,
  aspirin: 1,
  acetaminophen: 1,
  ibuprofen: 1,
  vanillin: 1,
  capsaicin: 1,
  cinnamaldehyde: 1,
  'methyl-salicylate': 1,
  benzaldehyde: 1,
  dopamine: 1,
  serotonin: 1,
  adrenaline: 1,
  indigo: 2,
  aspartame: 1,
}

// Valence electrons of the main-group elements that occur, and Pauling electronegativities read from the
// saved copy of PubChem's periodic table.
const VALENCE = { H: 1, B: 3, C: 4, N: 5, O: 6, F: 7, P: 5, S: 6, Cl: 7, Xe: 8 }
const ptable = json('../periodic-table/pubchem-periodic-table.json').Table
const column = (name) => ptable.Columns.Column.indexOf(name)
const EN = Object.fromEntries(ptable.Row.map((r) => [r.Cell[column('Symbol')], Number(r.Cell[column('Electronegativity')])]))

const GEOMETRY = {
  '2,0': 'linear',
  '3,0': 'trigonal planar',
  '2,1': 'bent',
  '4,0': 'tetrahedral',
  '3,1': 'trigonal pyramidal',
  '2,2': 'bent',
  '5,0': 'trigonal bipyramidal',
  '4,1': 'seesaw',
  '3,2': 'T-shaped',
  '2,3': 'linear',
  '6,0': 'octahedral',
  '5,1': 'square pyramidal',
  '4,2': 'square planar',
}
const ELECTRON_GEOMETRY = { 2: 'linear', 3: 'trigonal planar', 4: 'tetrahedral', 5: 'trigonal bipyramidal', 6: 'octahedral' }
const HYBRID = { 2: 'sp', 3: 'sp2', 4: 'sp3', 5: 'sp3d (textbook label)', 6: 'sp3d2 (textbook label)' }
const SIGMA_PI = { 1: '1 sigma', 2: '1 sigma + 1 pi', 3: '1 sigma + 2 pi' }
const AROMATIC_SIGMA_PI = '1 sigma + delocalised pi (aromatic, effective order 1.5)'

const fail = (message) => {
  throw new Error(message)
}

function structure(id, pubchem, geometry) {
  const entry = pubchem.entries.find((e) => e.id === id) ?? fail(`${id}: not in pubchem.json`)
  const geo = geometry.molecules.find((g) => g.pubchemCid === entry.cid)
  if (geo) return { atoms: geo.atoms.map((a) => ({ element: a.element, charge: a.formalCharge ?? 0 })), bonds: geo.bondList.map((b) => ({ ...b })) }
  const [record] = parseSdf(readFileSync(join(here, 'sdf', `${id}-2d.sdf`), 'utf8'))
  return { atoms: record.atoms.map((a) => ({ element: a.element, charge: a.charge })), bonds: record.bonds.map((b) => ({ ...b })) }
}

function expectedFor(id, name, pubchem, geometry) {
  const { atoms, bonds } = structure(id, pubchem, geometry)
  const bondsOf = (i) => bonds.filter((b) => b.a === i || b.b === i)
  const other = (b, i) => (b.a === i ? b.b : b.a)
  const terminalO = (i) => atoms[i].element === 'O' && bondsOf(i).length === 1

  if (id in OCTET_FORM) {
    const centre = atoms.findIndex((a) => a.element === 'S' || a.element === 'P')
    const doubles = bondsOf(centre).filter((b) => b.order === 2 && terminalO(other(b, centre)))
    for (const bond of doubles.slice(OCTET_FORM[id])) {
      bond.order = 1
      atoms[other(bond, centre)].charge -= 1
      atoms[centre].charge += 1
    }
  }

  const noted = new Set()
  if (id in RESONANCE_SET) {
    for (const bond of bonds) if (terminalO(bond.a) || terminalO(bond.b)) noted.add(bond)
    const orders = [...noted].map((b) => b.order).sort().join()
    if (noted.size !== RESONANCE_SET[id] || orders !== (noted.size === 2 ? '1,2' : '1,1,2')) fail(`${id}: the bonds to terminal oxygens are not a resonance set of ${RESONANCE_SET[id]}`)
    const centres = new Set([...noted].flatMap((b) => [b.a, b.b]).filter((i) => !terminalO(i) || bondsOf(i).length > 1))
    if (centres.size !== 1) fail(`${id}: the resonance set does not share one atom`)
  }

  // Benzene rings: every closed path of six carbons whose bonds alternate double and single.
  // A walk starts on a double bond and is found again from other atoms of the ring, so rings are told apart by their atoms.
  const aromatic = new Set()
  const rings = new Set()
  const walk = (path, used) => {
    const here = path.at(-1)
    for (const bond of bondsOf(here)) {
      const next = other(bond, here)
      if (atoms[next].element !== 'C' || bond.order !== (used.length % 2 === 0 ? 2 : 1)) continue
      if (next === path[0] && path.length === 6) {
        rings.add([...path].sort((p, q) => p - q).join())
        for (const b of [...used, bond]) aromatic.add(b)
      } else if (!path.includes(next) && path.length < 6) walk([...path, next], [...used, bond])
    }
  }
  atoms.forEach((a, i) => a.element === 'C' && walk([i], []))
  if (rings.size !== (BENZENE_RINGS[id] ?? 0)) fail(`${id}: found ${rings.size} benzene rings, expected ${BENZENE_RINGS[id] ?? 0}`)

  const count = {}
  const labels = atoms.map((a) => `${a.element}${(count[a.element] = (count[a.element] ?? 0) + 1)}`)
  const lonePairs = atoms.map((a, i) => {
    const pairs = (VALENCE[a.element] - a.charge - bondsOf(i).reduce((sum, b) => sum + b.order, 0)) / 2
    if (!Number.isInteger(pairs) || pairs < 0) fail(`${id}: ${labels[i]} would have ${pairs} lone pairs`)
    return pairs
  })
  // Convention (c) of this file: a lone-pair atom with no multiple bond of its own, single-bonded to an atom
  // that has a double or triple bond to another atom.
  const override = atoms.map(
    (a, i) =>
      lonePairs[i] > 0 &&
      bondsOf(i).every((b) => b.order === 1) &&
      bondsOf(i).some((b) => bondsOf(other(b, i)).some((far) => far.order > 1 && other(far, other(b, i)) !== i)),
  )

  // Convention "elemental-substances": every atom of an uncharged species made of one element is 0.
  const elemental = atoms.every((a) => a.element === atoms[0].element) && atoms.reduce((sum, a) => sum + a.charge, 0) === 0
  const outAtoms = atoms.map((a, i) => {
    const mine = bondsOf(i)
    const assigned = mine.reduce((sum, b) => {
      const j = other(b, i)
      if (atoms[j].element === a.element) return sum + b.order
      if (EN[a.element] === EN[atoms[j].element]) fail(`${id}: ${a.element} and ${atoms[j].element} have equal electronegativity`)
      return sum + (EN[a.element] > EN[atoms[j].element] ? 2 * b.order : 0)
    }, 0)
    const bondedAtoms = mine.length
    const stericNumber = bondedAtoms + lonePairs[i]
    const effective = override[i] ? stericNumber - 1 : stericNumber
    const terminal = bondedAtoms < 2
    const shape = (steric, pairs) => ({
      electronGeometry: terminal ? null : (ELECTRON_GEOMETRY[steric] ?? fail(`${id}: ${labels[i]} has steric number ${steric}`)),
      geometry: terminal ? 'terminal atom' : (GEOMETRY[`${bondedAtoms},${pairs}`] ?? fail(`${id}: ${labels[i]} has ${bondedAtoms} bonded atoms and ${pairs} lone pairs`)),
    })
    const bySteric = HYBRID[effective]
    const hybridization =
      a.element === 'H' ? 'none (1s)' : terminal && !override[i] && mine.every((b) => b.order === 1) ? 'not assigned (terminal atom)' : (bySteric ?? fail(`${id}: ${labels[i]} has no hybridization for ${effective}`))
    return {
      label: labels[i],
      element: a.element,
      formalCharge: a.charge,
      lonePairs: lonePairs[i],
      oxidationState: elemental ? 0 : VALENCE[a.element] - 2 * lonePairs[i] - assigned,
      bondedAtoms,
      stericNumber,
      resonanceOverride: override[i],
      effectiveStericNumber: effective,
      ...shape(effective, override[i] ? lonePairs[i] - 1 : lonePairs[i]),
      hybridization,
      ...(a.element === 'H' ? {} : { hybridizationByStericNumberOnly: bySteric }),
      valenceShellElectrons: 2 * lonePairs[i] + 2 * mine.reduce((sum, b) => sum + b.order, 0),
      ...(override[i] ? { withoutResonanceOverride: { stericNumber, ...shape(stericNumber, lonePairs[i]), hybridization: HYBRID[stericNumber] } } : {}),
    }
  })

  const outBonds = bonds.map((b) => {
    const note = noted.has(b) ? RESONANCE_NOTE[noted.size] : null
    return {
      a: labels[b.a],
      b: labels[b.b],
      order: b.order,
      aromatic: aromatic.has(b),
      sigmaPi: aromatic.has(b) ? AROMATIC_SIGMA_PI : SIGMA_PI[b.order],
      ...(aromatic.has(b) ? { displayOrder: 1.5 } : {}),
      ...(note ? { resonanceNote: note[0], effectiveOrder: note[1] } : {}),
      paulingDifference: Math.round(Math.abs(EN[atoms[b.a].element] - EN[atoms[b.b].element]) * 100) / 100,
    }
  })

  const charge = atoms.reduce((sum, a) => sum + a.charge, 0)
  if (outAtoms.reduce((sum, a) => sum + a.oxidationState, 0) !== charge) fail(`${id}: oxidation states do not sum to the charge`)
  const composition = {}
  for (const a of atoms) composition[a.element] = (composition[a.element] ?? 0) + 1
  const full = (a) => (a.element === 'H' ? 2 : 8)
  return {
    id,
    name,
    charge,
    composition,
    atoms: outAtoms,
    bonds: outBonds,
    octetExceptions: outAtoms.filter((a) => a.valenceShellElectrons !== full(a)).map((a) => a.label),
    notes: 'Added 2026-10-09 by build-expected-additions.mjs.',
  }
}

const CONVENTIONS = [
  {
    id: 'additions-2026-10-09',
    topic: 'The molecules added on 2026-10-09',
    choice:
      'Each added entry is computed by build-expected-additions.mjs from the saved PubChem 2D record (or, for a molecule in geometry.json, from its atoms and bonds there) by the conventions of this file as they stood, and by the four that follow. The named cases in src/chem-data/derive.test.ts are the checks written by hand.',
    why: 'One pass, by script, read through atom by atom by its author. There was no second, independent pass of the kind the first 33 structures had, and docs/research/phase-2/README.md says so.',
    sources: [],
  },
  {
    id: 'elemental-substances',
    topic: 'Oxidation state of an element',
    choice:
      'Every atom of an uncharged species made of one element has oxidation state 0 (H2, Cl2, O2, N2, O3), whatever its Lewis structure. This comes before the rule of convention oxidation-state, and changes one molecule: ozone, whose stored Lewis structure (O=O(+)-O(-)) would give +1 for the central atom, 0 and -1 for the outer two by that rule, which are its formal charges.',
    why: 'The first of the usual rules for oxidation numbers is that an atom of an element is 0, and it is the answer a first-year course expects for ozone. Splitting the electrons of a bond between like atoms leaves each atom with its formal charge, which is zero in H2, O2, N2 and Cl2 and not in ozone; the two outer oxygens of ozone are also equivalent in the real molecule and would be given different values. The derivation in src/chem-data/derive.ts was changed to match on 2026-10-09, with a test.',
    sources: [],
  },
  {
    id: 'octet-forms',
    topic: 'Sulfate, phosphate, sulfuric acid, phosphoric acid and sulfur trioxide',
    choice:
      'Drawn in the octet-obeying form, as sulfur dioxide is (convention so2-lewis) and by the rule of convention lewis-structures (octet-obeying forms wherever one exists; an expanded valence shell only where unavoidable, as in SF6). Sulfate: four S-O single bonds, S +2, each O -1. Phosphate: four P-O single bonds, P +1, each O -1. Sulfuric acid: S +2, two S-O(-) and two S-OH. Phosphoric acid: P +1, one P-O(-) and three P-OH. Sulfur trioxide: one S=O and two S-O(-), S +2, one of three equivalent resonance structures. PubChem stores each of the five with S=O or P=O double bonds and no formal charge on the central atom.',
    why: 'The same choice as for SO2, for the same reason, so that the library draws one family one way. Oxidation states, steric numbers, geometry and hybridization of the central atom are the same in both drawings (S +6, P +5; tetrahedral, sp3; trigonal planar and sp2 in SO3). Only bond orders, lone pairs and formal charges differ. The competing drawing, which lowers the formal charges by giving the central atom more than eight electrons, is the one the source libretexts-brown-8.7 of this file shows for sulfate beside the octet structure; each of the five molecules carries a note that says both drawings are in use.',
    sources: ['libretexts-brown-8.7'],
  },
  {
    id: 'resonance-sets',
    topic: 'Which added bonds get a resonanceNote',
    choice:
      'Note "one of two equivalent resonance structures; effective order 1.5" on both O-O bonds of ozone, the two N-O bonds of nitric acid to the oxygens that carry no hydrogen, both C-O bonds of acetate and of the carboxylate of the serine and cysteine zwitterions. Note "one of three equivalent resonance structures; effective order 1.33" on the three N-O bonds of nitrate, the three C-O bonds of carbonate and the three S-O bonds of sulfur trioxide (4/3: one double and two single bonds shared among three). No note on sulfate, phosphate, sulfuric or phosphoric acid: in the octet form every bond to oxygen is single.',
    why: 'As convention resonance-notes: the figure is right where the contributing structures are equivalent. In nitric acid the two structures are equivalent as drawings but the molecule has no symmetry that makes the two bonds equal: NIST CCCBDB lists 1.211 and 1.199 angstrom for them (experimental geometry page, casno 7697372, read 2026-10-09), and the molecule carries a note that says so.',
    sources: [],
  },
  {
    id: 'benzene-rings',
    topic: 'Which added bonds are aromatic',
    choice:
      'The six bonds of every benzene ring: a ring of six carbon atoms drawn with alternating double and single bonds (toluene, phenol, aspirin, acetaminophen, ibuprofen, vanillin, capsaicin, cinnamaldehyde, methyl salicylate, benzaldehyde, dopamine, serotonin, adrenaline, aspartame; both benzene rings of indigo). No other bond is flagged. A ring that holds nitrogen (the pyridine ring of nicotine, the rings of adenine, thymine, caffeine and theobromine, the five-membered ring of serotonin and of indigo) is stored as PubChem draws it, with its double bonds where they are drawn.',
    why: 'The flag says "order 1.5", which is the textbook statement for a benzene ring and is not one for a ring with nitrogen in it or for a fused five-membered ring. A known limit: those rings are aromatic too, and the library does not say so.',
    sources: [],
  },
  {
    id: 'added-geometries',
    topic: 'VSEPR geometries added to the vocabulary',
    choice: '(bonded atoms, lone pairs) -> (4,1) seesaw (SF4); (3,2) T-shaped (ClF3); (2,3) linear (XeF2). Square pyramidal (5,1) stays in the table with no molecule in the library.',
    why: 'Convention geometry-names asked for the rest of the table to be added.',
    sources: [],
  },
]

const pubchem = json('pubchem.json')
const geometry = json('geometry.json')
const expected = json('expected.json')
const entries = ADDED.map(([id, name]) => expectedFor(id, name, pubchem, geometry))
const ids = new Set(entries.map((e) => e.id))
const mine = new Set(CONVENTIONS.map((c) => c.id))
expected.conventions = [...expected.conventions.filter((c) => !mine.has(c.id)), ...CONVENTIONS]
expected.molecules = [...expected.molecules.filter((m) => !ids.has(m.id)), ...entries]
expected.resonanceOverrideAtoms = [
  ...expected.resonanceOverrideAtoms.filter((a) => !ids.has(a.molecule)),
  ...entries.flatMap((m) => m.atoms.filter((a) => a.resonanceOverride).map((a) => ({ molecule: m.id, atom: a.label }))),
]
for (const symbol of new Set(entries.flatMap((m) => Object.keys(m.composition)))) {
  if (expected.electronegativityUsed[symbol] === undefined) fail(`no electronegativity recorded for ${symbol}`)
  if (expected.electronegativityUsed[symbol] !== EN[symbol]) fail(`the electronegativity of ${symbol} differs from the saved PubChem table`)
}
writeFileSync(join(here, 'expected.json'), JSON.stringify(expected, null, 1) + '\n')

if (process.argv[2] === 'table') {
  for (const m of entries) {
    console.log(`\n${m.id} (charge ${m.charge}); aromatic bonds ${m.bonds.filter((b) => b.aromatic).length}; noted ${m.bonds.filter((b) => b.resonanceNote).length}`)
    for (const a of m.atoms) {
      if (a.element === 'H') continue
      const to = m.bonds
        .filter((b) => b.a === a.label || b.b === a.label)
        .map((b) => `${'-=#'[b.order - 1]}${(b.a === a.label ? b.b : b.a).replace(/\d+$/, '')}`)
        .sort()
        .join('')
      console.log(`  ${a.label.padEnd(4)} ${to.padEnd(12)} fc ${String(a.formalCharge).padStart(2)} lp ${a.lonePairs} os ${String(a.oxidationState).padStart(2)} ${a.geometry.padEnd(18)} ${a.hybridization}${a.resonanceOverride ? `  [override; without: ${a.withoutResonanceOverride.geometry}, ${a.withoutResonanceOverride.hybridization}]` : ''}`)
    }
  }
}
const overrides = entries.flatMap((m) => m.atoms.filter((a) => a.resonanceOverride).map((a) => a.element))
console.log(`\nwrote ${entries.length} entries; override atoms by element: ${JSON.stringify(Object.fromEntries([...new Set(overrides)].map((e) => [e, overrides.filter((x) => x === e).length])))}`)
