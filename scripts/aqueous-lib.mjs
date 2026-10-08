// The checks the build makes on the aqueous reactions lab's record (docs/research/phase-4/aqueous.json) against its
// manifest of sources (docs/research/phase-4/sources/MANIFEST.json) and the one kept copy, and the merge of the
// reagents' hazards (docs/research/phase-4/hazards.json and sources/hazard-manifest.json) into it.
// build-chem-data.mjs runs them; src/chem-data/aqueous/build.test.ts tests them on inputs they must refuse.
// Each throws with a message. Everything reads what it is handed; nothing is fetched here.

import { checkSheetHazards } from './titration-lib.mjs'

const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/
// A source prints a negative number with a minus sign (U+2212) or a hyphen; the record stores a hyphen.
const plain = (printed) => printed.replaceAll('−', '-')

/** How an item of one of the record's lists is named in a manifest row: by its own id, or by the ids that make it one. */
const itemName = (item, index) => item?.id ?? item?.productId ?? item?.metalId ?? (item?.cationId && item?.anionId ? `${item.cationId}+${item.anionId}` : String(index))

/**
 * Every place the record cites a source: `key` is the place as a manifest row names it (species[water].enthalpyOfFormation,
 * solubility[silver-ion+chloride-ion], stations[aq-02].notes[0]), and `published` the figure stored beside the citation,
 * where there is one. A second source (`alsoSourceId`) is a citation of the same place.
 */
export function citations(record) {
  const found = []
  const walk = (value, key) => {
    if (Array.isArray(value)) value.forEach((item, i) => walk(item, `${key}[${itemName(item, i)}]`))
    else if (value && typeof value === 'object') {
      for (const name of ['sourceId', 'alsoSourceId']) {
        if (typeof value[name] === 'string') found.push({ key, sourceId: value[name], ...(typeof value.published === 'string' ? { published: value.published } : {}) })
      }
      for (const [name, child] of Object.entries(value)) walk(child, key === '' ? name : `${key}.${name}`)
    }
  }
  walk(record, '')
  return found
}

/** A citation of a reagent's hazards: these are held to the hazard manifest by `mergeHazards`, not to the rows of the lab's own manifest. */
const isHazard = ({ key }) => /^reagents\[[^\]]+\]\.hazards(\.|$)/.test(key)

/**
 * Throws unless the record and the manifest give one account of the sources. Every value that cites a source of
 * the manifest must be named in the `fields` of one of that source's rows; a value stored with the figure its
 * source prints must have such a row that prints the figure; and every row must name values that do cite its
 * source, so that no row outlives the value it was written for. A value that cites a safety data sheet (a source
 * of `sheets`) outside a reagent's hazards must cite a sheet that some reagent's hazards cite.
 */
export function checkSupported(record, manifestSources, sheets = []) {
  const cited = citations(record)
  const ofReagents = new Set(cited.filter(isHazard).map((c) => c.sourceId))
  for (const { key, sourceId, published } of cited.filter((c) => !isHazard(c))) {
    if (published !== undefined && !PLAIN_NUMBER.test(published)) throw new Error(`${key}: published ${JSON.stringify(published)} is not a plain decimal`)
    const source = manifestSources.find((s) => s.id === sourceId)
    if (!source) {
      if (!sheets.some((s) => s.id === sourceId)) throw new Error(`${key}: unknown source "${sourceId}"`)
      if (!ofReagents.has(sourceId)) throw new Error(`${key}: cites the safety data sheet "${sourceId}", which no reagent's hazards cite`)
      continue
    }
    const rows = source.supports.filter((row) => row.fields.includes(key))
    if (rows.length === 0) throw new Error(`${key}: the source "${sourceId}" has no row that names it`)
    if (published !== undefined && !rows.some((row) => plain(row.prints) === published)) {
      throw new Error(`${key}: the source "${sourceId}" has no row that prints ${published} for it`)
    }
  }
  const citing = new Set(cited.map((c) => `${c.sourceId} ${c.key}`))
  for (const source of manifestSources) {
    if (source.supports.length === 0) throw new Error(`the source "${source.id}" supports nothing`)
    for (const row of source.supports) {
      for (const field of row.fields) {
        if (field !== 'primer' && !citing.has(`${source.id} ${field}`)) throw new Error(`the source "${source.id}" has a row for ${field}, which does not cite it`)
      }
    }
  }
}

/** The atoms of a formula as PubChem writes it ("Cl3Fe", "CCaO3"): element symbols, each with a count where it is not 1. */
function atoms(formula) {
  const counts = {}
  for (const [, element, count] of formula.matchAll(/([A-Z][a-z]?)(\d*)/g)) counts[element] = (counts[element] ?? 0) + Number(count || 1)
  return counts
}
const sameAtoms = (a, b) => Object.keys(a).length === Object.keys(b).length && Object.entries(a).every(([element, count]) => b[element] === count)

/**
 * Throws unless every reagent is a compound of PubChem's kept table with the atoms the table gives it, and the
 * molar mass of each solid and metal is the molecular weight the table prints.
 */
export function checkReagents(record, properties) {
  const rows = properties.PropertyTable.Properties
  for (const reagent of record.reagents) {
    const row = rows.find((r) => r.CID === reagent.pubchemCid)
    if (!row) throw new Error(`reagent "${reagent.id}": PubChem's table has no row for CID ${reagent.pubchemCid}`)
    const species = record.species.find((s) => s.id === reagent.speciesId)
    if (!species) throw new Error(`reagent "${reagent.id}": unknown species "${reagent.speciesId}"`)
    if (!sameAtoms(atoms(row.MolecularFormula), species.composition)) {
      throw new Error(`reagent "${reagent.id}": PubChem gives CID ${reagent.pubchemCid} the formula ${row.MolecularFormula}, which is not the composition stored for "${species.id}"`)
    }
    if (reagent.molarMass !== undefined && (reagent.molarMass.published !== row.MolecularWeight || Number(row.MolecularWeight) !== reagent.molarMass.value)) {
      throw new Error(`reagent "${reagent.id}": PubChem gives the molecular weight of CID ${reagent.pubchemCid} as ${row.MolecularWeight}, not the stored ${reagent.molarMass.published ?? reagent.molarMass.value}`)
    }
  }
}

const onlyKeys = (object, keys, where, optional = []) => {
  const given = object && typeof object === 'object' ? Object.keys(object) : []
  if (given.some((key) => !keys.includes(key) && !optional.includes(key)) || keys.some((key) => !given.includes(key))) throw new Error(`${where}: expected exactly the keys ${keys.join(', ')}`)
}

/**
 * The reagents with their hazards put in. `hazards` is hazards.json: for each reagent id, `classifiedAs` and the
 * hazards record. `sheets` are the sources of the hazard manifest, every one a safety data sheet that was read and
 * is not kept. So, as for the titration lab's bottles, this cannot say that a sheet prints what is stored. It
 * holds each reagent to the manifest's rows for it (their field begins with the reagent's id): the signal word and
 * the statements by `checkSheetHazards`, and that the heading, the statements' sheet and each sheet under the note
 * have rows of their own. No statement may carry a code listed for the reagent in `never`.
 */
export function mergeHazards(reagents, hazards, sheets, never = {}) {
  const ids = reagents.map((r) => r.id)
  onlyKeys(hazards, ids, 'hazards.json')
  const sheet = (sourceId, where) => {
    const found = sheets.find((s) => s.id === sourceId)
    if (!found) throw new Error(`${where}: unknown source "${sourceId}"`)
    if (found.file !== undefined) throw new Error(`${where}: the sheet "${sourceId}" is cited as read and not kept, but the hazard manifest lists a copy of it`)
    return found
  }
  const hasRow = (source, field, where) => {
    if (!source.supports.some((row) => row.field === field)) throw new Error(`${where}: the source "${source.id}" has no row for ${field}`)
  }
  return reagents.map((reagent) => {
    const where = `hazards.json: ${reagent.id}`
    const entry = hazards[reagent.id]
    onlyKeys(entry, ['classifiedAs', 'hazards'], where)
    onlyKeys(entry.hazards, ['signalWord', 'statements', 'note', 'sourceId'], `${where}.hazards`)
    onlyKeys(entry.hazards.note, ['value', 'sourceId'], `${where}.hazards.note`, ['alsoSourceId'])
    if (typeof entry.classifiedAs !== 'string' || entry.classifiedAs.trim() === '') throw new Error(`${where}: classifiedAs is empty`)
    const statements = sheet(entry.hazards.sourceId, `${where}.hazards`)
    hasRow(statements, `${reagent.id}.classifiedAs`, where)
    checkSheetHazards(statements, `${reagent.id}.hazards`, entry.hazards, never[reagent.id] ?? [])
    const { note } = entry.hazards
    if (typeof note.value !== 'string' || note.value.trim() === '') throw new Error(`${where}.hazards.note: the note is empty`)
    if (note.alsoSourceId === note.sourceId) throw new Error(`${where}.hazards.note: alsoSourceId names "${note.alsoSourceId}", the source the note already cites`)
    for (const sourceId of [note.sourceId, ...(note.alsoSourceId === undefined ? [] : [note.alsoSourceId])]) {
      hasRow(sheet(sourceId, `${where}.hazards.note`), `${reagent.id}.hazards.note`, `${where}.hazards.note`)
    }
    if ('hazards' in reagent || 'classifiedAs' in reagent) throw new Error(`reagent "${reagent.id}": its hazards belong in hazards.json, not in the lab's record`)
    const { sourceId, ...rest } = reagent
    return { ...rest, classifiedAs: entry.classifiedAs, hazards: entry.hazards, sourceId }
  })
}

/**
 * The sources a manifest adds to those already listed, as `{ id, url, citation }`. A source whose id is already in
 * use is the same source cited again (a safety data sheet that an earlier lab read too): it must have the same
 * address and citation, and is not listed twice.
 */
export function newSources(manifestSources, earlier, where) {
  const ids = manifestSources.map((s) => s.id)
  if (new Set(ids).size !== ids.length) throw new Error(`${where} repeats a source id`)
  return manifestSources.flatMap(({ id, url, citation }) => {
    if ([id, url, citation].some((text) => typeof text !== 'string' || text.trim() === '')) throw new Error(`${where}: the source "${id}" needs an id, a url and a citation`)
    const same = earlier.find((s) => s.id === id)
    if (!same) return [{ id, url, citation }]
    if (same.url !== url || same.citation !== citation) throw new Error(`${where}: the source id "${id}" is already in use for another address or citation`)
    return []
  })
}
