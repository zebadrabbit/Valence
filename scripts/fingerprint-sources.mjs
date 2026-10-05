// Writes docs/research/phase-3/sources/quotation-fingerprint.json: the hash of every run of six consecutive words
// in the pages the titration primer and the hazard notes rest on. It is what the no-quotation test compares
// against. Those pages are not kept in the repository, and the fingerprint is not either: .gitignore lists it,
// because stretches of the pages can be rebuilt from it a word at a time (see scripts/titration-lib.mjs). Run this
// again, on a machine that has the pages, before changing the primer or a hazard note; the test is skipped where
// the file is absent.
//
//   node scripts/fingerprint-sources.mjs <folder> <date the pages were fetched, YYYY-MM-DD>
//
// The folder holds one file for each source, named by its id in the manifest: <id>.html (a saved page), <id>.txt
// (the text of a PDF, extracted with any tool) or <id>.json (a kept copy, of which every string is read).
// Nothing is fetched here.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { packHashes, QUOTED_RUN, runHashes } from './titration-lib.mjs'

const [folder, retrieved] = process.argv.slice(2)
if (!folder || !/^\d{4}-\d{2}-\d{2}$/.test(retrieved ?? '')) {
  process.stderr.write('usage: node scripts/fingerprint-sources.mjs <folder> <YYYY-MM-DD>\n')
  process.exit(1)
}

// ponytail: tags are cut with a pattern and only numeric entities and five named ones are decoded. Any other
// entity leaves a stray word that splits a run in two, so a quotation across it is caught only if six words lie
// on one side.
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
const pageText = (html) =>
  html
    .replace(/<(script|style|nav|header|footer)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (entity, name) => ENTITIES[name] ?? entity)

const strings = (value) => (typeof value === 'string' ? [value] : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : [])

const READERS = { '.html': (text) => [pageText(text)], '.txt': (text) => [text], '.json': (text) => strings(JSON.parse(text)).map(pageText) }

const files = readdirSync(folder).filter((file) => path.extname(file) in READERS).sort()
const hashes = files.flatMap((file) => READERS[path.extname(file)](readFileSync(path.join(folder, file), 'utf8')).flatMap(runHashes))
const out = { retrieved, runWords: QUOTED_RUN, sources: files.map((file) => path.basename(file, path.extname(file))), hashes: packHashes(hashes) }
writeFileSync(path.join(import.meta.dirname, '../docs/research/phase-3/sources/quotation-fingerprint.json'), `${JSON.stringify(out, null, 2)}\n`)
process.stdout.write(`${out.sources.length} sources, ${new Set(hashes).size} runs of ${QUOTED_RUN} words\n`)
