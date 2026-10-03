// A minimal V2000 molfile / SDF parser for the build, with no dependencies.
// Adapted from the research copy in docs/research/phase-2/parse-sdf.mjs, which is
// kept as the research record.
//
// parseSdf(text) -> [{ atoms: [{ element, x, y, z, charge }], bonds: [{ a, b, order }], data }]
//   a and b are 0-based indexes into atoms. order is the molfile bond type (1, 2, 3; 4 = aromatic).
//   Charges come from "M  CHG" lines when any are present (per the CTfile spec these supersede
//   the legacy charge column of the atom block); otherwise from the legacy column.

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

function parseMolfile(text) {
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
