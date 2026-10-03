// Builds the answer key for the derived-value tests (spec 6.5).
//
//   npm run build:expected
//
// Reads docs/research/phase-2/expected.json (the hand-written expected-values
// table) and writes src/chem-data/expected-values.fixture.json.
//
// The fixture is an independent oracle: it comes from the research file and
// the rules below, never from src/chem-data/derive.ts. If a derive test fails,
// work out which side is right; do not regenerate one from the other.
//
// The research file records the research as gathered. Two project conventions
// decided afterwards differ from it (docs/research/phase-2/README.md, spec 6.3):
//   (a) Oxygens are not given the resonance override. An oxygen the research
//       marks with it takes its withoutResonanceOverride values. Nitrogens keep it.
//   (b) A terminal, singly bonded atom other than hydrogen reads
//       "not assigned (terminal atom)".
// Every atom these rules change is printed, so the conversion can be audited.

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

const root = join(import.meta.dirname, '..')
const research = JSON.parse(readFileSync(join(root, 'docs/research/phase-2/expected.json'), 'utf8'))

const NOT_ASSIGNED = 'not assigned (terminal atom)'
const TERMINAL = 'terminal atom'

// The research file writes in ASCII; the app shows the spec's notation.
// This changes spelling only, so it is not listed per atom.
const HYBRIDIZATION_NOTATION = {
  sp2: 'sp²',
  sp3: 'sp³',
  'sp3d (textbook label)': 'sp³d (textbook label)',
  'sp3d2 (textbook label)': 'sp³d² (textbook label)',
}
const notation = (text) => HYBRIDIZATION_NOTATION[text] ?? text
const greek = (text) => text.replaceAll('sigma', 'σ').replaceAll('pi', 'π')

const changes = []

function convertAtom(molecule, atom) {
  const bonds = molecule.bonds.filter((b) => b.a === atom.label || b.b === atom.label)
  let { geometry, hybridization } = atom
  let rule = ''

  if (atom.resonanceOverride && atom.element === 'O') {
    ;({ geometry, hybridization } = atom.withoutResonanceOverride)
    rule = 'a: oxygen not overridden'
  }
  if (atom.element !== 'H' && bonds.length === 1 && bonds[0].order === 1) {
    geometry = TERMINAL
    hybridization = NOT_ASSIGNED
    rule = 'b: terminal single bond'
  }
  const before = `${atom.hybridization}, ${atom.geometry}`
  const after = `${hybridization}, ${geometry}`
  if (before !== after) changes.push([molecule.id, atom.label, before, after, rule])

  return {
    element: atom.element,
    formalCharge: atom.formalCharge,
    lonePairs: atom.lonePairs,
    oxidationState: atom.oxidationState,
    geometry,
    hybridization: notation(hybridization),
  }
}

function convertBond(molecule, bond) {
  const element = (label) => molecule.atoms.find((a) => a.label === label).element
  return {
    elements: [element(bond.a), element(bond.b)].sort(),
    order: bond.order,
    aromatic: bond.aromatic,
    sigmaPi: greek(bond.sigmaPi),
  }
}

const fixture = research.molecules.map((molecule) => ({
  id: molecule.id,
  charge: molecule.charge,
  atoms: molecule.atoms.map((atom) => convertAtom(molecule, atom)),
  bonds: molecule.bonds.map((bond) => convertBond(molecule, bond)),
}))

writeFileSync(join(root, 'src/chem-data/expected-values.fixture.json'), JSON.stringify(fixture, null, 2) + '\n')

const header = ['molecule', 'atom', 'research value', 'fixture value', 'rule']
const rows = [header, ...changes]
const widths = header.map((_, column) => Math.max(...rows.map((row) => row[column].length)))
const line = (row) => row.map((cell, column) => cell.padEnd(widths[column])).join(' | ').trimEnd()
process.stdout.write(
  [
    `Atoms changed relative to the research file: ${changes.length}`,
    line(header),
    widths.map((width) => '-'.repeat(width)).join('-|-'),
    ...changes.map(line),
    'Notation: sp2, sp3, sp3d, sp3d2, sigma and pi are written sp², sp³, sp³d, sp³d², σ and π throughout.',
    `Wrote ${fixture.length} structures to src/chem-data/expected-values.fixture.json.`,
    '',
  ].join('\n'),
)
