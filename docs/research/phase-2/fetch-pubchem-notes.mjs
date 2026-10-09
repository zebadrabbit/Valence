// Reads what PubChem's record says of each molecule of the Everyday topic, for the one-sentence note the
// library gives it (notes.json holds what was found and the sentence written from it). Two kinds of request to
// PubChem's public REST services, one at a time with a pause; nothing that is read is kept.
//
//   node docs/research/phase-2/fetch-pubchem-notes.mjs descriptions   one request: the record descriptions of every CID
//   node docs/research/phase-2/fetch-pubchem-notes.mjs sections       one request for each [CID, heading] below: that
//                                                                     section of the record, as PUG View returns it
//
// Nothing here runs in the app or in its build.

import process from 'node:process'

const PAUSE_MS = 5000
const AGENT = 'Valence-research/1.0 (an educational chemistry project; one request at a time)'
const CIDS = [2519, 2244, 1983, 3672, 1183, 16666, 440917, 1548943, 637511, 54670067, 5429, 89594, 31276, 4133, 240, 29746, 681, 5202, 5816, 5318432, 10907, 134601]
// Where the record description does not say what a person knows the substance by.
const SECTIONS = [
  [1183, 'Odor'],
  [16666, 'Odor'],
  [440917, 'Odor'],
  [1548943, 'Uses'],
  [637511, 'Odor'],
  [31276, 'Odor'],
  [4133, 'Odor'],
  [240, 'Odor'],
  [29746, 'Odor'],
  [681, 'Record Description'],
  [5318432, 'Depositor-Supplied Synonyms'],
  [10907, 'Uses'],
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

async function descriptions() {
  const { status, text } = await get(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${CIDS.join(',')}/description/JSON`)
  if (status !== 200) throw new Error(`descriptions: HTTP ${status}`)
  for (const item of JSON.parse(text).InformationList.Information) {
    if (item.Title) console.log(`\n## CID ${item.CID} ${item.Title}`)
    if (item.Description) console.log(`  [${item.DescriptionSourceName}] ${item.Description}`)
  }
}

// Every string of a PUG View section, with the number of the reference it is filed under.
function strings(node, out = []) {
  if (Array.isArray(node)) for (const item of node) strings(item, out)
  else if (node && typeof node === 'object') {
    if (node.Value?.StringWithMarkup) out.push([node.ReferenceNumber, node.Value.StringWithMarkup.map((s) => s.String).join(' ')])
    for (const value of Object.values(node)) strings(value, out)
  }
  return out
}

async function sections() {
  for (const [cid, heading] of SECTIONS) {
    const { status, text } = await get(`https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/${cid}/JSON?heading=${encodeURIComponent(heading)}`)
    console.log(`\n## CID ${cid}, "${heading}": HTTP ${status}`)
    if (status !== 200) continue
    const record = JSON.parse(text).Record
    const sources = new Map((record.Reference ?? []).map((r) => [r.ReferenceNumber, r.SourceName]))
    for (const [reference, string] of strings(record.Section).slice(0, 14)) console.log(`  [${sources.get(reference) ?? '?'}] ${string.slice(0, 330)}`)
  }
}

const step = { descriptions, sections }[process.argv[2]]
if (!step) throw new Error('say which step: descriptions or sections')
await step()
