// Fetches PubChem's records for the molecules added to the library on 2026-10-09, from PubChem's public
// REST service (PUG REST), one request at a time with a pause between requests. Kept as the research record
// of how the files under sdf/ and the entries of pubchem.json dated 2026-10-09 were made.
//
//   node docs/research/phase-2/fetch-pubchem.mjs properties   one request: the title, names, formula, SMILES,
//                                                             charge and conformer count of every CID below,
//                                                             saved as pubchem-properties-2026-10-09.json
//   node docs/research/phase-2/fetch-pubchem.mjs sdf          two requests a molecule: the 3D conformer and the
//                                                             2D layout, saved as returned; a file already
//                                                             saved is not fetched again
//   node docs/research/phase-2/fetch-pubchem.mjs entries      no request: reads the saved files and the saved
//                                                             properties and writes the entries of pubchem.json
//
// A 3D request that PubChem answers with 404 means the record has no 3D conformer; nothing is saved for it
// and the entry says so. Nothing here runs in the app or in its build.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { analyse, parseSdf } from './parse-sdf.mjs'

const here = import.meta.dirname
const RETRIEVED = '2026-10-09'
const PAUSE_MS = 5000
const AGENT = 'Valence-research/1.0 (an educational chemistry project; one request at a time)'
const REST = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid'
const PROPERTIES = 'Title,IUPACName,MolecularFormula,SMILES,Charge,ConformerCount3D,AtomStereoCount,DefinedAtomStereoCount,UndefinedAtomStereoCount'
const propertiesFile = join(here, `pubchem-properties-${RETRIEVED}.json`)

// File id (the name of the saved files and of the entry) and PubChem CID.
// Three more records were fetched on the same day and are not kept, because their molecules were left out of the
// library (README.md says why): beryllium chloride (CID 24588), bromine pentafluoride (CID 24606) and the
// triiodide ion (CID 105054). PubChem has no 3D conformer for any of the three.
const WANTED = [
  ['hydrogen', 783],
  ['chlorine', 24526],
  ['hydrogen-fluoride', 14917],
  ['carbon-monoxide', 281],
  ['ozone', 24823],
  ['hydrogen-sulfide', 402],
  ['hydrogen-cyanide', 768],
  ['nitric-acid', 944],
  ['sulfuric-acid', 1118],
  ['phosphoric-acid', 1004],
  ['hydroxide', 961],
  ['ammonium', 223],
  ['nitrate', 943],
  ['carbonate', 19660],
  ['sulfate', 1117],
  ['phosphate', 1061],
  ['acetate', 175],
  ['sulfur-trioxide', 24682],
  ['phosphorus-trichloride', 24387],
  ['carbon-tetrachloride', 5943],
  ['dichloromethane', 6344],
  ['chloroform', 6212],
  ['sulfur-tetrafluoride', 24555],
  ['chlorine-trifluoride', 24637],
  ['xenon-difluoride', 83674],
  ['methanol', 887],
  ['dimethyl-ether', 8254],
  ['propane', 6334],
  ['butane', 7843],
  ['isobutane', 6360],
  ['cyclohexane', 8078],
  ['propene', 8252],
  ['acetaldehyde', 177],
  ['formic-acid', 284],
  ['toluene', 1140],
  ['phenol', 996],
  ['acetonitrile', 6342],
  ['diethyl-ether', 3283],
  ['glycerol', 753],
  ['lactic-acid', 107689],
  ['citric-acid', 311],
  ['serine', 5951],
  ['serine-zwitterion', 6857581],
  ['cysteine', 5862],
  ['cysteine-zwitterion', 6419722],
  ['adenine', 190],
  ['thymine', 1135],
  ['beta-d-fructofuranose', 439709],
  ['sucrose', 5988],
  ['palmitic-acid', 985],
  ['caffeine', 2519],
  ['aspirin', 2244],
  ['acetaminophen', 1983],
  ['ibuprofen', 3672],
  ['vanillin', 1183],
  ['menthol', 16666],
  ['limonene', 440917],
  ['capsaicin', 1548943],
  ['cinnamaldehyde', 637511],
  ['ascorbic-acid', 54670067],
  ['theobromine', 5429],
  ['nicotine', 89594],
  ['isoamyl-acetate', 31276],
  ['methyl-salicylate', 4133],
  ['benzaldehyde', 240],
  ['geosmin', 29746],
  ['dopamine', 681],
  ['serotonin', 5202],
  ['adrenaline', 5816],
  ['indigo', 5318432],
  ['isooctane', 10907],
  ['aspartame', 134601],
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let last = 0
async function get(url) {
  const wait = last + PAUSE_MS - Date.now()
  if (wait > 0) await sleep(wait)
  const response = await fetch(url, { headers: { 'User-Agent': AGENT } })
  last = Date.now()
  return { status: response.status, text: await response.text() }
}

async function properties() {
  const cids = WANTED.map(([, cid]) => cid).join(',')
  const { status, text } = await get(`${REST}/${cids}/property/${PROPERTIES}/JSON`)
  if (status !== 200) throw new Error(`properties: HTTP ${status}`)
  const rows = JSON.parse(text).PropertyTable.Properties
  writeFileSync(propertiesFile, JSON.stringify({ retrieved: RETRIEVED, url: `${REST}/<cids>/property/${PROPERTIES}/JSON`, properties: rows }, null, 2) + '\n')
  for (const [id, cid] of WANTED) {
    const row = rows.find((r) => r.CID === cid)
    console.log(id.padEnd(24), String(cid).padEnd(9), String(row?.Title).slice(0, 28).padEnd(28), String(row?.MolecularFormula).padEnd(12), `q=${row?.Charge}`, `3d=${row?.ConformerCount3D}`, `stereo=${row?.DefinedAtomStereoCount}/${row?.AtomStereoCount}`, row?.SMILES)
  }
}

async function sdf() {
  for (const [id, cid] of WANTED) {
    // The 2D layout is asked for first: a record that has one saved has been asked for both.
    if (existsSync(join(here, 'sdf', `${id}-2d.sdf`))) continue
    for (const kind of ['2d', '3d']) {
      const name = `${id}-${kind}.sdf`
      const { status, text } = await get(`${REST}/${cid}/SDF?record_type=${kind}`)
      if (status === 200) writeFileSync(join(here, 'sdf', name), text)
      else if (status !== 404 || kind === '2d') throw new Error(`${name}: HTTP ${status}`)
      console.log(name, status)
    }
  }
}

function entries() {
  const file = join(here, 'pubchem.json')
  const pubchem = JSON.parse(readFileSync(file, 'utf8'))
  const { properties: rows } = JSON.parse(readFileSync(propertiesFile, 'utf8'))
  const read = (id, kind) => {
    const [record, ...more] = parseSdf(readFileSync(join(here, 'sdf', `${id}-${kind}.sdf`), 'utf8'))
    if (more.length > 0) throw new Error(`${id}-${kind}.sdf holds more than one record`)
    return record
  }
  const table = (m) => m.bonds.map((b) => `${Math.min(b.a, b.b)}-${Math.max(b.a, b.b)}:${b.order}`).join()
  const added = WANTED.map(([id, cid]) => {
    const row = rows.find((r) => r.CID === cid) ?? fail(`${id}: no properties for CID ${cid}`)
    // PubChem answered 404 where no 3D file is saved, and its own count of conformers is then 0.
    const has3d = existsSync(join(here, 'sdf', `${id}-3d.sdf`))
    if (has3d !== (row.ConformerCount3D ?? 0) > 0) throw new Error(`${id}: the saved files and PubChem's conformer count disagree`)
    const flat = read(id, '2d')
    if (Number(flat.data.PUBCHEM_COMPOUND_CID) !== cid) throw new Error(`${id}: the 2D file is CID ${flat.data.PUBCHEM_COMPOUND_CID}`)
    const model = has3d ? read(id, '3d') : null
    if (model && Number(model.data.PUBCHEM_COMPOUND_CID) !== cid) throw new Error(`${id}: the 3D file is CID ${model.data.PUBCHEM_COMPOUND_CID}`)
    const a2 = analyse(flat)
    const a3 = model && analyse(model)
    if (a2.charge !== row.Charge) throw new Error(`${id}: the 2D record's charge ${a2.charge} is not PubChem's ${row.Charge}`)
    if (model) {
      const same = model.atoms.map((a) => a.element).join() === flat.atoms.map((a) => a.element).join() && table(model) === table(flat) && model.atoms.every((a, i) => a.charge === flat.atoms[i].charge)
      if (!same) throw new Error(`${id}: the 2D and 3D records differ in atom order, bonds or charges`)
    }
    const passes = a3 ? (a3.minHBond === null || a3.minHBond >= 0.8) && (a3.minHeavyBond === null || a3.minHeavyBond >= 1.05) : null
    return {
      id,
      retrieved: RETRIEVED,
      cid,
      iupacName: row.IUPACName ?? null,
      pubchemTitle: row.Title,
      molecularFormula: row.MolecularFormula,
      smiles: row.SMILES,
      recordUrl: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
      url3d: `${REST}/${cid}/SDF?record_type=3d`,
      url2d: `${REST}/${cid}/SDF?record_type=2d`,
      http3d: has3d ? 200 : 404,
      http2d: 200,
      has3d,
      has2d: true,
      atomCount: a2.atomCount,
      heavyAtomCount: a2.heavyAtomCount,
      hydrogenCount: a2.hydrogenCount,
      charge: a2.charge,
      chargedAtoms: a2.chargedAtoms,
      minHeavyBondA: a3?.minHeavyBond ?? null,
      minHeavyBondPair: a3?.minHeavyBondPair ?? null,
      minHBondA: a3?.minHBond ?? null,
      minHBondPair: a3?.minHBondPair ?? null,
      passesValidatorRule3: passes,
      threeDAllZZero: a3 ? a3.allZZero : null,
      twoDHasHydrogens: a2.hydrogenCount > 0 ? true : null,
      twoDMinHBondUnits: a2.minHBond,
      twoDMinHeavyBondUnits: a2.minHeavyBond,
      stereo: { atomStereoCount: row.AtomStereoCount, defined: row.DefinedAtomStereoCount, undefined: row.UndefinedAtomStereoCount },
      conformerCount3D: row.ConformerCount3D ?? 0,
    }
  })
  const ids = new Set(added.map((e) => e.id))
  pubchem.entries = [...pubchem.entries.filter((e) => !ids.has(e.id)), ...added]
  writeFileSync(file, JSON.stringify(pubchem, null, 2) + '\n')
  console.log(`wrote ${added.length} entries; ${added.filter((e) => !e.has3d).length} have no 3D conformer: ${added.filter((e) => !e.has3d).map((e) => e.id).join(', ')}`)
}

function fail(message) {
  throw new Error(message)
}

const step = { properties, sdf, entries }[process.argv[2]]
if (!step) fail('say which step: properties, sdf or entries')
await step()
