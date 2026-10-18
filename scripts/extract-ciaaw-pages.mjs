// Reduces the two CIAAW pages the periodic table reads to the facts the build and the cross-check use, so that the
// pages themselves are not kept: for each element of the abridged table its atomic number, symbol and name, the
// standard atomic weight as printed (value ± uncertainty, or a dash where there is none) and the footnote letters
// beside it; and for each element of the list of radioactive elements the mass numbers of its most stable known
// isotopes. Run once on the pages as saved:
//
//   node scripts/extract-ciaaw-pages.mjs <folder holding the two pages> <output folder>
//
// The folder holds abridged-atomic-weights.htm or ciaaw-abridged-atomic-weights.html, saved from
//   https://www.ciaaw.org/abridged-atomic-weights.htm
// and radioactive-elements.htm or ciaaw-radioactive-elements.html, saved from
//   https://www.ciaaw.org/radioactive-elements.htm

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { parseCiaawAbridged, parseCiaawRadioactive } from './periodic-table-lib.mjs'

const [folder, outputFolder] = process.argv.slice(2)
if (!folder || !outputFolder) throw new Error('usage: node extract-ciaaw-pages.mjs <folder> <output folder>')
const page = (...names) => {
  const name = names.find((n) => existsSync(join(folder, n)))
  if (!name) throw new Error(`${folder} holds none of ${names.join(', ')}`)
  return readFileSync(join(folder, name), 'utf8')
}

const abridged = parseCiaawAbridged(page('abridged-atomic-weights.htm', 'ciaaw-abridged-atomic-weights.html'))
if (abridged.title === null || abridged.rows.length !== 118) throw new Error('the abridged table is not 118 rows under its title')
const weights = {
  title: abridged.title,
  rows: abridged.rows.map(({ z, symbol, name, text, notes }) => ({ z, symbol, name, printed: text, notes })),
}

const listed = parseCiaawRadioactive(page('radioactive-elements.htm', 'ciaaw-radioactive-elements.html'))
const symbols = new Map(abridged.rows.map((row) => [row.z, row.symbol]))
const radioactive = {
  rows: [...listed].map(([z, isotopes]) => ({ z, symbol: symbols.get(z), massNumbers: isotopes.map((isotope) => isotope.a) })),
}

const write = (name, data) => writeFileSync(join(outputFolder, name), JSON.stringify(data, null, 1) + '\n')
write('ciaaw-abridged-atomic-weights-extract.json', weights)
write('ciaaw-radioactive-elements-extract.json', radioactive)
process.stdout.write(`${weights.rows.length} weights, ${radioactive.rows.length} radioactive elements\n`)
