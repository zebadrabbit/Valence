// The checks the build makes on the titration lab's record (docs/research/phase-3/titration.json) against the kept
// copies of its sources (docs/research/phase-3/sources/). build-chem-data.mjs runs them;
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

const withSubsections = (section) => [section, ...(section.Section ?? []).flatMap(withSubsections)]

/**
 * Throws unless a bottle's hazards are those of one entry of a kept PubChem record (its GHS Classification section).
 * `reference` names the entry: the name of the classification's source, a colon and a space, and the entry's name.
 * The signal word must be the entry's, and the statements the entry's, all of them and in its order. A statement is
 * compared as its H-code and its text: PubChem prints " ***" after some codes and the statement's own signal word
 * and hazard class in brackets after the text, and neither is stored.
 */
export function checkHazards(record, reference, { signalWord, statements }) {
  const { RecordNumber: cid, Reference: references, Section: sections } = record.Record
  const entries = references.filter((entry) => `${entry.SourceName}: ${entry.Name.trim()}` === reference)
  if (entries.length !== 1) throw new Error(`the PubChem record for CID ${cid} has ${entries.length} entries named "${reference}", expected 1`)
  const where = `the entry "${reference}" of the PubChem record for CID ${cid}`
  const lines = sections.flatMap(withSubsections).find((section) => section.TOCHeading === 'GHS Classification')?.Information ?? []
  const strings = (name) =>
    lines
      .filter((line) => line.ReferenceNumber === entries[0].ReferenceNumber && line.Name === name)
      .flatMap((line) => line.Value.StringWithMarkup.map((markup) => markup.String))

  const signalWords = strings('Signal')
  if (signalWords.length !== 1 || signalWords[0] !== signalWord) {
    throw new Error(`${where} carries the signal word ${JSON.stringify(signalWords.join(', '))}, not "${signalWord}"`)
  }
  // "H361f ***: Suspected of damaging fertility [Warning Reproductive toxicity]" is "H361f: Suspected of damaging fertility".
  const entryStatements = strings('GHS Hazard Statements').map((text) => {
    const [, code, said] = /^(H\d{3}[A-Za-z]*)(?: \*\*\*)?: (.+) \[[^\]]*\]$/.exec(text) ?? []
    if (!code) throw new Error(`${where} has a hazard statement this script cannot read: ${JSON.stringify(text)}`)
    return `${code}: ${said}`
  })
  for (const statement of statements) {
    if (!entryStatements.includes(statement)) throw new Error(`${where} does not print the statement "${statement}"`)
  }
  if (entryStatements.join('\n') !== statements.join('\n')) {
    throw new Error(`${where} prints ${entryStatements.join('; ')}: the bottle must carry all ${entryStatements.length} statements, in its order`)
  }
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
// pages are not kept, so what is kept of them is a fingerprint: a hash of each such run, from which no text can be
// read back. scripts/fingerprint-sources.mjs writes it; src/chem-data/titration/quotation.test.ts holds the
// primer and the hazard notes to it.
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
