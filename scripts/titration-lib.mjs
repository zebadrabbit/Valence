// The checks the build makes on the titration lab's record (docs/research/phase-3/titration.json) against the kept
// copies of its sources (docs/research/phase-3/sources/), and, for the three bottles, whose statements are read from
// safety data sheets that are not kept, against the manifest's account of each sheet. build-chem-data.mjs runs them;
// src/chem-data/titration/build.test.ts tests them on inputs they must refuse. Each throws with a message.
// Everything reads what it is handed; nothing is fetched here.

import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'

// A printed figure is compared with a source as text, digit for digit, never as a float.
const PLAIN_NUMBER = /^\d+(\.\d+)?$/

/** Throws unless a constant's `published`, where it has one, is a plain decimal that reads as its value. */
export function checkPublished({ value, published }, where) {
  if (published === undefined) return
  if (typeof published !== 'string' || !PLAIN_NUMBER.test(published) || Number(published) !== value) {
    throw new Error(`${where}: published ${JSON.stringify(published)} is not a plain decimal equal to the stored value ${value}`)
  }
}

/** Matches `figure` printed as a number of its own, not as part of a longer one: "6.3" is not in "6.35", nor "0.33" in "10.33". */
const printed = (figure) => new RegExp(`(?<![\\d.])${figure.replace('.', '\\.')}(?!\\.?\\d)`)

/** Throws unless NOAA's file of annual means has one row for `year`, and its mean is printed as `published`. */
export function checkAnnualMean(text, year, published) {
  // "  2025   425.62     0.05": the year, the mean, its uncertainty.
  const rows = [...text.matchAll(/^\s*(\d{4})\s+(\S+)\s+\S+\s*$/gm)].filter((row) => row[1] === String(year))
  if (rows.length !== 1) throw new Error(`the NOAA file has ${rows.length} rows for ${year}, expected 1`)
  if (rows[0][2] !== published) throw new Error(`the NOAA file gives ${rows[0][2]} for ${year}, not the stored ${published}`)
}

/** Throws unless PubChem's property table gives the molecular weight of `cid` as `published`. */
export function checkMolecularWeight(properties, cid, published) {
  const weight = properties.PropertyTable.Properties.find((row) => row.CID === cid)?.MolecularWeight
  if (weight !== published) throw new Error(`PubChem gives the molecular weight of CID ${cid} as ${weight}, not the stored ${published}`)
}

// A hazard statement as a sheet's bottle stores it: its code, or its codes joined by "+" as the sheet pairs them,
// then a colon, a space and the statement.
const SHEET_STATEMENT = /^(H\d{3}[A-Za-z]*(?:\+H\d{3}[A-Za-z]*)*): (\S.*)$/
// The same statement as such a sheet prints it: the statement, then its code or codes in brackets.
const SHEET_LINE = /^(\S.*) \((H\d{3}[A-Za-z]*(?:\+H\d{3}[A-Za-z]*)*)\)$/

/**
 * Throws unless a bottle's hazards are those the manifest records of a safety data sheet that was read and is not
 * kept. There is no copy to read, so this cannot say that the sheet prints them. What it holds is their form, and
 * that the record and the manifest give one account of the sheet: `sheet` is the cited source as the manifest lists
 * it, and its `supports` rows for `field` say what the sheet prints. The signal word must be the one row's, whatever
 * its case (a sheet prints DANGER, the record stores Danger). The statements must be the rows', all of them and in
 * their order, each turned round: the sheet prints "May be corrosive to metals (H290)" and the record stores
 * "H290: May be corrosive to metals", with the codes of a pair in the sheet's order. No statement may carry a code
 * listed in `never`.
 */
export function checkSheetHazards(sheet, field, { signalWord, statements }, never = []) {
  const rows = (name) => sheet.supports.filter((row) => row.field === `${field}.${name}`)
  const signalWords = rows('signalWord')
  if (signalWords.length !== 1) throw new Error(`the source "${sheet.id}" has ${signalWords.length} rows for ${field}.signalWord, expected 1`)
  if (signalWords[0].prints.toLowerCase() !== signalWord.toLowerCase()) {
    throw new Error(`the source "${sheet.id}" prints the signal word "${signalWords[0].prints}", not "${signalWord}"`)
  }
  statements.forEach((statement, i) => {
    const [, codes] = SHEET_STATEMENT.exec(statement) ?? []
    if (!codes) throw new Error(`${field}.statements[${i}]: ${JSON.stringify(statement)} is not a hazard code, or codes joined by "+", then a colon, a space and a statement`)
    const refused = codes.split('+').find((code) => never.includes(code))
    if (refused) throw new Error(`${field}.statements[${i}] carries the code ${refused}, which this bottle must not carry`)
  })
  const printed = sheet.supports.filter((row) => row.field.startsWith(`${field}.statements[`)).length
  if (printed !== statements.length) {
    throw new Error(`the source "${sheet.id}" has rows for ${printed} statements of ${field} and the record stores ${statements.length}: the bottle must carry all of them, in the sheet's order`)
  }
  statements.forEach((statement, i) => {
    const [row, ...more] = rows(`statements[${i}]`)
    if (!row || more.length > 0) throw new Error(`the source "${sheet.id}" has ${more.length + (row ? 1 : 0)} rows for ${field}.statements[${i}], expected 1`)
    const [, said, codes] = SHEET_LINE.exec(row.prints) ?? []
    if (!codes) throw new Error(`the source "${sheet.id}": the row for ${field}.statements[${i}] prints ${JSON.stringify(row.prints)}, which is not a statement and then its code or codes in brackets`)
    if (`${codes}: ${said}` !== statement) throw new Error(`the source "${sheet.id}" prints ${JSON.stringify(row.prints)} for ${field}.statements[${i}], not the stored ${JSON.stringify(statement)}`)
  })
}

/**
 * Throws unless a kept Wikipedia copy (the MediaWiki API's answer for one revision, with its source text) is the
 * revision `citation` names and prints each of `figures`.
 */
export function checkWikipediaCopy(copy, citation, figures) {
  const revisions = Object.values(copy.query.pages).flatMap((page) => page.revisions)
  const named = /revision (\d+)/.exec(citation)?.[1]
  if (revisions.length !== 1 || String(revisions[0].revid) !== named) {
    throw new Error(`the kept Wikipedia copy is revision ${revisions.map((revision) => revision.revid).join(', ')}, but the citation names ${named ?? 'no revision'}`)
  }
  for (const figure of figures) {
    if (!printed(figure).test(revisions[0].slots.main['*'])) throw new Error(`Wikipedia revision ${named} does not print ${figure}`)
  }
}

/** Throws unless `bytes` (a kept copy, as read) hash to the sha256 the manifest records for `file`. */
export function checkSha256(bytes, sha256, file) {
  const actual = createHash('sha256').update(bytes).digest('hex')
  if (actual !== sha256) throw new Error(`${file}: sha256 is ${actual}, not the manifest's ${sha256}`)
}

// Quotation. Nothing the lab writes may repeat a run of QUOTED_RUN consecutive words of a page it rests on. The
// pages are not kept, so the test compares against a fingerprint of them: a hash of each such run.
// scripts/fingerprint-sources.mjs writes it; src/chem-data/titration/quotation.test.ts holds the primer and the
// hazard notes to it. The fingerprint is not kept in the repository either. It holds no words, but text can be
// read back from it: from five words of a page, each word of a dictionary can be tried as the sixth and the hash
// says which is right, and so on a word at a time. So it is written to a path .gitignore lists, and the test runs
// only where it has been made.
export const QUOTED_RUN = 6

/** The words of a text: its runs of letters and digits, in lower case. Punctuation and case make no difference to a run. */
const words = (text) => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []

// 32-bit FNV-1a.
// ponytail: 32 bits. A run that was never in a page matches the fingerprint about once in 60 000 tries; it then
// reads as a quotation and is reworded, so the check can ask too much and never too little.
function hashOf(text) {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193)
  return hash >>> 0
}

/** The hash of every run of QUOTED_RUN consecutive words in a text, in order; none for a shorter text. */
export function runHashes(text) {
  const all = words(text)
  return Array.from({ length: Math.max(0, all.length - QUOTED_RUN + 1) }, (_, i) => hashOf(all.slice(i, i + QUOTED_RUN).join(' ')))
}

/** A set of run hashes as stored: sorted, four bytes each, in base64. And back. */
export const packHashes = (hashes) => Buffer.from(Uint32Array.from([...new Set(hashes)].sort((a, b) => a - b)).buffer).toString('base64')
export const unpackHashes = (base64) => new Set(new Uint32Array(Uint8Array.from(Buffer.from(base64, 'base64')).buffer))

/** The stretches of a text whose every run of QUOTED_RUN words is in the fingerprint, as lower-case words; empty when it quotes nothing. */
export function quotedRuns(text, fingerprint) {
  const all = words(text)
  const hit = runHashes(text).map((hash) => fingerprint.has(hash))
  const runs = []
  for (let i = 0; i < hit.length; i++) {
    if (!hit[i]) continue
    let end = i
    while (hit[end + 1]) end++
    runs.push(all.slice(i, end + QUOTED_RUN).join(' '))
    i = end
  }
  return runs
}
