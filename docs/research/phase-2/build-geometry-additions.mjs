// Writes into geometry.json the molecules added on 2026-10-09 that PubChem has no 3D conformer for, or whose
// PubChem conformer does not have the shape the molecule has (see README.md): coordinates built from the lengths
// and angles that NIST CCCBDB's experimental geometry page prints for each, read with fetch-cccbdb.mjs on the
// retrieval date below. Kept as the research record; nothing here runs in the app or in its build.
//
//   node docs/research/phase-2/build-geometry-additions.mjs
//
// Every value below is the text of a row of the page's "Internal coordinates" table. An angle the page
// prints no row for is given only where the stated point group fixes it.

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const RETRIEVED = '2026-10-09'
const PAGE = `NIST CCCBDB, Standard Reference Database 101, experimental geometry page (retrieved ${RETRIEVED})`
const url = (cas) => `https://cccbdb.nist.gov/expgeom2x.asp?casno=${cas.replaceAll('-', '')}`
const rad = (degrees) => (degrees * Math.PI) / 180
const round = (n) => Number(n.toFixed(6)) + 0
// A formal charge is authored structure, like a bond order: given only where it is not zero (ozone).
const at = (element, x, y, z, formalCharge) => ({ element, x: round(x), y: round(y), z: round(z), ...(formalCharge ? { formalCharge } : {}) })
const single = (pairs) => pairs.map(([a, b]) => ({ a, b, order: 1 }))

function entry({ id, name, formula, pubchemCid, cas, pointGroup, origin, lengths, angles, atoms, bondList, notes }) {
  const sourceUrl = url(cas)
  const row = (valueKey) => ({ label, atoms: sets, value, type, cites, fixedBySymmetry }) => ({
    label,
    atoms: sets[0],
    appliesTo: sets,
    [valueKey]: value === null ? fixedBySymmetry.degrees : Number(value),
    valueAsPublished: value,
    ...(valueKey === 'lengthA' ? { lengthType: type ?? null } : { fixedBySymmetry: fixedBySymmetry !== undefined }),
    sourceUrl,
    citation: `${PAGE}${cites}`,
  })
  return { id, name, formula, pubchemCid, cas, pointGroup, origin, bonds: lengths.map(row('lengthA')), angles: angles.map(row('degrees')), dihedrals: [], atoms, bondList, notes }
}

const HUBER = ", citing: Huber, K.P.; Herzberg, G., Molecular Spectra and Molecular Structure. IV. Constants of Diatomic Molecules, Van Nostrand Reinhold Co., 1979 (doi:10.1007/978-1-4757-0961-2); comment 're'"
const MULLER = ', citing: Müller, H. S. P., Phys. Chem. Chem. Phys. 3, 1570-1575 (2001) (doi:10.1039/b100527h)'
const BURGER = ", citing: Bürger, H.; Ma, S., J. Mol. Spectrosc. 157, 536-539 (1993) (doi:10.1006/jmsp.1993.1043); comment 're'"
const TOLLES = ', citing: Tolles, W. M.; Gwinn, W. D., J. Chem. Phys. 36, 1119 (1962) (doi:10.1063/1.1732702)'
const HERZBERG = ', citing: Herzberg, G., Electronic spectra and electronic structure of polyatomic molecules, Van Nostrand, New York, 1966'

// Chlorine trifluoride, T-shaped: the equatorial fluorine on -z, the two axial ones leaning towards it.
const clf3 = { eq: 1.597, ax: 1.697, angle: 87.45 }
// Sulfur tetrafluoride, seesaw: the axial fluorines in the yz plane, the equatorial ones in the xz plane,
// all four leaning to -z, away from the lone pair.
const sf4 = { ax: 1.646, eq: 1.545, axAx: 173.07, eqEq: 101.55 }
// Ozone, bent: the central oxygen at the origin, the outer two in the yz plane.
const o3 = { r: 1.278, angle: 116.8 }

const added = [
  entry({
    id: 'h2',
    name: 'Hydrogen',
    formula: 'H2',
    pubchemCid: 783,
    cas: '1333-74-0',
    pointGroup: 'D∞h',
    origin: 'centre of mass at origin; molecule along z',
    lengths: [{ label: 'r(H-H)', atoms: [[0, 1]], value: '0.741', type: 're', cites: HUBER }],
    angles: [],
    atoms: [at('H', 0, 0, -0.741 / 2), at('H', 0, 0, 0.741 / 2)],
    bondList: single([[0, 1]]),
    notes: "Equilibrium (re) length. CCCBDB prints rHH = 0.741 in its internal-coordinate table; its own Cartesians give 0.7414.",
  }),
  entry({
    id: 'o3',
    name: 'Ozone',
    formula: 'O3',
    pubchemCid: 24823,
    cas: '10028-15-6',
    pointGroup: 'C2v',
    origin: 'central atom (O) at origin; C2 axis along z; molecule in the yz plane',
    lengths: [{ label: 'r(O-O)', atoms: [[0, 1], [0, 2]], value: '1.278', cites: HERZBERG }],
    angles: [{ label: 'a(O-O-O)', atoms: [[1, 0, 2]], value: '116.8', cites: HERZBERG }],
    atoms: [
      at('O', 0, 0, 0, 1),
      at('O', 0, o3.r * Math.sin(rad(o3.angle / 2)), o3.r * Math.cos(rad(o3.angle / 2))),
      at('O', 0, -o3.r * Math.sin(rad(o3.angle / 2)), o3.r * Math.cos(rad(o3.angle / 2)), -1),
    ],
    bondList: [
      { a: 0, b: 1, order: 2 },
      { a: 0, b: 2, order: 1 },
    ],
    notes: "The page gives one O-O length for both bonds and no length type. The bond orders and formal charges are the octet resonance form (O=O(+)-O(-)), authored structure as for sulfur dioxide. PubChem has a computed conformer for this record; it is not used, because its two O-O bonds differ by 0.2 angstrom (1.432 and 1.232), where the page gives the real molecule one length (README.md).",
  }),
  entry({
    id: 'clf3',
    name: 'Chlorine trifluoride',
    formula: 'ClF3',
    pubchemCid: 24637,
    cas: '7790-91-2',
    pointGroup: 'C2v',
    origin: 'central atom (Cl) at origin; C2 axis along z; molecule in the yz plane; atom 1 is the equatorial fluorine, atoms 2 and 3 the axial ones',
    lengths: [
      { label: 'r(Cl-F) equatorial', atoms: [[0, 1]], value: '1.597', type: 're', cites: `${MULLER}; comment 're structure'` },
      { label: 'r(Cl-F) axial', atoms: [[0, 2], [0, 3]], value: '1.697', type: 're', cites: `${MULLER}; comment 're structure'` },
    ],
    angles: [
      { label: 'a(F_eq-Cl-F_ax)', atoms: [[1, 0, 2], [1, 0, 3]], value: '87.45', cites: `${MULLER}; comment 're structure'` },
      { label: 'a(F_ax-Cl-F_ax)', atoms: [[2, 0, 3]], value: '174.9', cites: `${MULLER}; comment 'from symmetry assuming planar'` },
    ],
    atoms: [
      at('Cl', 0, 0, 0),
      at('F', 0, 0, -clf3.eq),
      at('F', 0, clf3.ax * Math.sin(rad(clf3.angle)), -clf3.ax * Math.cos(rad(clf3.angle))),
      at('F', 0, -clf3.ax * Math.sin(rad(clf3.angle)), -clf3.ax * Math.cos(rad(clf3.angle))),
    ],
    bondList: single([[0, 1], [0, 2], [0, 3]]),
    notes: "Equilibrium (re) structure from the rotational spectrum. The page's connectivity columns number the equatorial fluorine 2 and the axial ones 3 and 4; its own Cartesians agree (Cl-F2 1.598, Cl-F3 1.698). The 174.9 between the axial fluorines is twice 87.45: the page marks it 'from symmetry assuming planar', which is a consequence of the other rows and not a value the point group fixes.",
  }),
  entry({
    id: 'xef2',
    name: 'Xenon difluoride',
    formula: 'XeF2',
    pubchemCid: 83674,
    cas: '13709-36-9',
    pointGroup: 'D∞h',
    origin: 'central atom (Xe) at origin; molecule along z',
    lengths: [{ label: 'r(Xe-F)', atoms: [[0, 1], [0, 2]], value: '1.974', type: 're', cites: BURGER }],
    angles: [{ label: 'a(F-Xe-F)', atoms: [[1, 0, 2]], value: '180', fixedBySymmetry: { degrees: 180 }, cites: ": point group D∞h, aFXeF = 180, comment 'from symmetry'" }],
    atoms: [at('Xe', 0, 0, 0), at('F', 0, 0, 1.974), at('F', 0, 0, -1.974)],
    bondList: single([[0, 1], [0, 2]]),
    notes: "Equilibrium (re) length. CCCBDB prints rFXe = 1.974 in its internal-coordinate table; its own Cartesians use 1.9744.",
  }),
  entry({
    id: 'sf4',
    name: 'Sulfur tetrafluoride',
    formula: 'SF4',
    pubchemCid: 24555,
    cas: '7783-60-0',
    pointGroup: 'C2v',
    origin: 'central atom (S) at origin; C2 axis along z; atoms 1 and 2 are the axial fluorines (yz plane), atoms 3 and 4 the equatorial ones (xz plane)',
    lengths: [
      { label: 'r(S-F) axial', atoms: [[0, 1], [0, 2]], value: '1.646', cites: `${TOLLES}; comment 'axial'` },
      { label: 'r(S-F) equatorial', atoms: [[0, 3], [0, 4]], value: '1.545', cites: `${TOLLES}; comment 'equatorial'` },
    ],
    angles: [
      { label: 'a(F_ax-S-F_ax)', atoms: [[1, 0, 2]], value: '173.07', cites: `${TOLLES}; comment 'axial'` },
      { label: 'a(F_eq-S-F_eq)', atoms: [[3, 0, 4]], value: '101.55', cites: `${TOLLES}; comment 'equatorial'` },
      { label: 'a(F_ax-S-F_eq)', atoms: [[1, 0, 3], [1, 0, 4], [2, 0, 3], [2, 0, 4]], value: '87.81', cites: `${TOLLES}; comment 'by symmetry, axial to equatorial'` },
    ],
    atoms: [
      at('S', 0, 0, 0),
      at('F', 0, sf4.ax * Math.sin(rad(sf4.axAx / 2)), -sf4.ax * Math.cos(rad(sf4.axAx / 2))),
      at('F', 0, -sf4.ax * Math.sin(rad(sf4.axAx / 2)), -sf4.ax * Math.cos(rad(sf4.axAx / 2))),
      at('F', sf4.eq * Math.sin(rad(sf4.eqEq / 2)), 0, -sf4.eq * Math.cos(rad(sf4.eqEq / 2))),
      at('F', -sf4.eq * Math.sin(rad(sf4.eqEq / 2)), 0, -sf4.eq * Math.cos(rad(sf4.eqEq / 2))),
    ],
    bondList: single([[0, 1], [0, 2], [0, 3], [0, 4]]),
    notes: "From the microwave spectrum (Tolles and Gwinn, 1962). The page gives no length type. The 87.81 between an axial and an equatorial fluorine follows from the other four rows and the C2v point group ('by symmetry' on the page); the coordinates built from those four rows give it. PubChem has a computed conformer for this record; it is not used, because it is not a seesaw (README.md).",
  }),
]

const file = join(import.meta.dirname, 'geometry.json')
const geometry = JSON.parse(readFileSync(file, 'utf8'))
const ids = new Set(added.map((m) => m.id))
geometry.molecules = [...geometry.molecules.filter((m) => !ids.has(m.id)), ...added]
writeFileSync(file, JSON.stringify(geometry, null, 1) + '\n')
console.log(`wrote ${added.map((m) => m.id).join(', ')}`)
