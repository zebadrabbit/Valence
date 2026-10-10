// Reads NIST CCCBDB's experimental geometry page for each CAS number given, one request at a time with a
// pause, and prints what the page states: the point group, the rows of its "Internal coordinates" table and
// its references. Kept as the research record of how the entries of geometry.json dated 2026-10-09 were read.
// The pages themselves are not kept.
//
//   node docs/research/phase-2/fetch-cccbdb.mjs 7783-60-0 7790-91-2
//
// Nothing here runs in the app or in its build.

import process from 'node:process'

const PAUSE_MS = 5000
const AGENT = 'Valence-research/1.0 (an educational chemistry project; one request at a time)'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const text = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/<\/t[dh]>/gi, ' | ')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&Aring;/g, 'Å')
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t\r]+/g, ' ')

for (const [i, cas] of process.argv.slice(2).entries()) {
  if (i > 0) await sleep(PAUSE_MS)
  const url = `https://cccbdb.nist.gov/expgeom2x.asp?casno=${cas.replaceAll('-', '')}`
  const response = await fetch(url, { headers: { 'User-Agent': AGENT } })
  const page = text(await response.text())
  console.log(`\n===== ${cas}  ${url}  HTTP ${response.status}`)
  const title = /Experimental data for ([^\n]*)/.exec(page)
  if (title) console.log(title[0].trim())
  const group = /Point Group\s+([^\n]*)/.exec(page)
  console.log(group ? `Point Group ${group[1].trim()}` : 'no point group stated')
  const start = page.indexOf('Internal coordinates')
  const end = page.indexOf('Bond descriptions')
  console.log(start < 0 ? 'NO INTERNAL COORDINATES TABLE' : page.slice(start, end < 0 ? start + 1500 : end).replace(/\n\s*\n+/g, '\n').trim())
  const cart = page.search(/Atom \| +x \(Å\)/)
  const dist = page.indexOf('Atom - Atom Distances')
  if (cart >= 0) console.log(page.slice(cart, dist < 0 ? cart + 800 : dist).replace(/\n\s*\n+/g, '\n').trim())
  const refs = page.search(/squib \| +reference/)
  const tail = page.indexOf('Got a better number')
  if (refs >= 0) console.log(page.slice(refs, tail < 0 ? refs + 1500 : tail).replace(/\n\s*\n+/g, '\n').trim())
}
