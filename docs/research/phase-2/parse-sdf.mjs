// Minimal V2000 molfile / SDF parser. No dependencies, ES modules, Node 24.
//
//   import { parseMolfile, parseSdf } from './parse-sdf.mjs'
//   node parse-sdf.mjs [sdfDir]      -> analyses every *.sdf in sdfDir, prints a table,
//                                       writes analysis.json next to this script
//
// parseMolfile(text) -> { atoms: [{ element, x, y, z, charge }], bonds: [{ a, b, order }] }
//   a and b are 0-based indexes into atoms. order is the molfile bond type (1, 2, 3; 4 = aromatic).
//   Charges come from "M  CHG" lines when any are present (per the CTfile spec these supersede
//   the legacy charge column of the atom block); otherwise from the legacy column.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Legacy atom-block charge codes (CTfile spec): 0 none, 1 +3, 2 +2, 3 +1, 4 doublet radical, 5 -1, 6 -2, 7 -3
const LEGACY_CHARGE = { 0: 0, 1: 3, 2: 2, 3: 1, 4: 0, 5: -1, 6: -2, 7: -3 }

function int(s, what, lineNo) {
  const n = Number.parseInt(s, 10)
  if (!Number.isInteger(n)) throw new Error(`molfile line ${lineNo}: bad ${what} "${s}"`)
  return n
}
function float(s, what, lineNo) {
  const n = Number.parseFloat(s)
  if (!Number.isFinite(n)) throw new Error(`molfile line ${lineNo}: bad ${what} "${s}"`)
  return n
}

export function parseMolfile(text) {
  const lines = text.split(/\r?\n/)
  // Header is 3 lines (name, program/timestamp, comment); counts line is the 4th.
  const counts = lines[3]
  if (counts === undefined || !/V2000/.test(counts)) {
    throw new Error('not a V2000 molfile (no V2000 tag on line 4)')
  }
  const nAtoms = int(counts.slice(0, 3), 'atom count', 4)
  const nBonds = int(counts.slice(3, 6), 'bond count', 4)

  const atoms = []
  for (let i = 0; i < nAtoms; i++) {
    const lineNo = 5 + i
    const l = lines[4 + i]
    if (l === undefined) throw new Error(`molfile truncated in atom block at line ${lineNo}`)
    atoms.push({
      element: l.slice(31, 34).trim(),
      x: float(l.slice(0, 10), 'x', lineNo),
      y: float(l.slice(10, 20), 'y', lineNo),
      z: float(l.slice(20, 30), 'z', lineNo),
      charge: LEGACY_CHARGE[int(l.slice(36, 39).trim() || '0', 'charge code', lineNo)] ?? 0,
    })
  }

  const bonds = []
  for (let i = 0; i < nBonds; i++) {
    const lineNo = 5 + nAtoms + i
    const l = lines[4 + nAtoms + i]
    if (l === undefined) throw new Error(`molfile truncated in bond block at line ${lineNo}`)
    const a = int(l.slice(0, 3), 'bond atom', lineNo) - 1
    const b = int(l.slice(3, 6), 'bond atom', lineNo) - 1
    if (a < 0 || b < 0 || a >= nAtoms || b >= nAtoms) {
      throw new Error(`molfile line ${lineNo}: bond references atom outside 1..${nAtoms}`)
    }
    bonds.push({ a, b, order: int(l.slice(6, 9), 'bond order', lineNo) })
  }

  // Properties block: M  CHGnn8 aaa vvv aaa vvv ...
  let sawChg = false
  let sawEnd = false
  for (let i = 4 + nAtoms + nBonds; i < lines.length; i++) {
    const l = lines[i]
    if (l.startsWith('M  END')) { sawEnd = true; break }
    if (!l.startsWith('M  CHG')) continue
    if (!sawChg) {
      for (const atom of atoms) atom.charge = 0 // M  CHG supersedes the legacy column
      sawChg = true
    }
    const n = int(l.slice(6, 9), 'CHG entry count', i + 1)
    for (let k = 0; k < n; k++) {
      const idx = int(l.slice(10 + 8 * k, 13 + 8 * k), 'CHG atom', i + 1) - 1
      const val = int(l.slice(14 + 8 * k, 17 + 8 * k), 'CHG value', i + 1)
      if (!atoms[idx]) throw new Error(`molfile line ${i + 1}: M  CHG references atom ${idx + 1}`)
      atoms[idx].charge = val
    }
  }
  if (!sawEnd) throw new Error('molfile has no "M  END" line')
  return { atoms, bonds }
}

// An SDF is one or more molfiles, each followed by "> <TAG>" data items and a "$$$$" line.
export function parseSdf(text) {
  return text
    .split(/^\$\$\$\$\r?\n?/m)
    .filter((rec) => rec.trim() !== '')
    .map((rec) => {
      const end = rec.search(/^M {2}END.*$/m)
      if (end < 0) throw new Error('SDF record has no "M  END" line')
      const data = {}
      const re = /^> +<([^>]+)>.*\r?\n([\s\S]*?)(?:\r?\n\r?\n|\r?\n?$)/gm
      const tail = rec.slice(end)
      for (const m of tail.matchAll(re)) data[m[1]] = m[2].trim()
      return { ...parseMolfile(rec), data }
    })
}

// ---------------------------------------------------------------------------------------------

const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z)
const round = (n, d = 4) => (n === null ? null : Number(n.toFixed(d)))

export function analyse(mol) {
  let minHeavy = null
  let minH = null
  let minHeavyPair = null
  let minHPair = null
  for (const { a, b } of mol.bonds) {
    const A = mol.atoms[a]
    const B = mol.atoms[b]
    const d = dist(A, B)
    const label = `${A.element}${a + 1}-${B.element}${b + 1}`
    if (A.element === 'H' || B.element === 'H') {
      if (minH === null || d < minH) { minH = d; minHPair = label }
    } else if (minHeavy === null || d < minHeavy) { minHeavy = d; minHeavyPair = label }
  }
  const hydrogens = mol.atoms.filter((a) => a.element === 'H')
  const charged = mol.atoms
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => a.charge !== 0)
    .map(({ a, i }) => `${a.element}${i + 1}:${a.charge > 0 ? '+' : ''}${a.charge}`)
  // every pair of atoms, bonded or not: catches hydrogens drawn on top of something
  let minAny = null
  for (let i = 0; i < mol.atoms.length; i++) {
    for (let j = i + 1; j < mol.atoms.length; j++) {
      const d = dist(mol.atoms[i], mol.atoms[j])
      if (minAny === null || d < minAny) minAny = d
    }
  }
  const formula = {}
  for (const a of mol.atoms) formula[a.element] = (formula[a.element] ?? 0) + 1
  return {
    atomCount: mol.atoms.length,
    heavyAtomCount: mol.atoms.length - hydrogens.length,
    hydrogenCount: hydrogens.length,
    bondCount: mol.bonds.length,
    formula,
    bondOrders: mol.bonds.map((b) => b.order).sort().join(''),
    charge: mol.atoms.reduce((s, a) => s + a.charge, 0),
    chargedAtoms: charged,
    allZZero: mol.atoms.every((a) => a.z === 0),
    minHeavyBond: round(minHeavy),
    minHeavyBondPair: minHeavyPair,
    minHBond: round(minH),
    minHBondPair: minHPair,
    minAnyPairDistance: round(minAny),
    // every atom has at least one bond (true for all but monatomic records)
    unbondedAtoms: mol.atoms.filter((_, i) => !mol.bonds.some((b) => b.a === i || b.b === i)).length,
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const here = dirname(fileURLToPath(import.meta.url))
  const dir = process.argv[2] ?? join(here, 'sdf')
  const out = {}
  const files = readdirSync(dir).filter((f) => f.endsWith('.sdf')).sort()
  console.log('file'.padEnd(34), 'atoms'.padStart(5), 'H'.padStart(3), 'bonds'.padStart(5), 'chg'.padStart(4), 'minHeavy'.padStart(9), 'minH'.padStart(8), 'z=0'.padStart(5), ' charged')
  for (const f of files) {
    const records = parseSdf(readFileSync(join(dir, f), 'utf8'))
    if (records.length !== 1) throw new Error(`${f}: expected 1 record, got ${records.length}`)
    const r = analyse(records[0])
    r.pubchemCid = records[0].data.PUBCHEM_COMPOUND_CID ?? null
    r.pubchemTotalCharge = records[0].data.PUBCHEM_TOTAL_CHARGE ?? null
    r.pubchemCoordinateType = records[0].data.PUBCHEM_COORDINATE_TYPE?.split(/\s+/).join(',') ?? null
    r.dataTags = Object.keys(records[0].data)
    out[f] = r
    console.log(f.padEnd(34), String(r.atomCount).padStart(5), String(r.hydrogenCount).padStart(3), String(r.bondCount).padStart(5), String(r.charge).padStart(4), String(r.minHeavyBond).padStart(9), String(r.minHBond).padStart(8), String(r.allZZero).padStart(5), ' ' + r.chargedAtoms.join(' '))
  }
  writeFileSync(join(here, 'analysis.json'), JSON.stringify(out, null, 2) + '\n')
  console.log(`\n${files.length} files parsed; wrote ${join(here, 'analysis.json')}`)
}
