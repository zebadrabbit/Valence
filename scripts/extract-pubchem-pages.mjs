// Reduces what was downloaded from PubChem's element pages to the parts the
// cross-check reads, so the committed copies stay small. Run once after downloading:
//
//   node scripts/extract-pubchem-pages.mjs <folder of element-<Z>.json> <ptable.min.js> <output folder>
//
// The 118 pages (about 15 MB) come from
//   https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/element/<Z>/JSON
// and the script (about 450 kB) that PubChem's periodic table page loads, which
// holds the unit label of each column, from
//   https://pubchem.ncbi.nlm.nih.gov/ptable/ptable.min.js

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

const [folder, scriptPath, outputFolder] = process.argv.slice(2)
if (!folder || !scriptPath || !outputFolder) throw new Error('usage: node extract-pubchem-pages.mjs <folder> <ptable.min.js> <output folder>')

const HEADINGS = [
  'Atomic Weight', 'Electron Configuration', 'Atomic Radius', 'Oxidation States', 'Ionization Energy',
  'Electronegativity', 'Electron Affinity', 'Physical Description', 'Element Classification',
  'Element Period Number', 'Element Group Number', 'Density', 'Melting Point', 'Boiling Point',
]

const out = {}
for (let z = 1; z <= 118; z++) {
  const record = JSON.parse(readFileSync(join(folder, `element-${z}.json`), 'utf8')).Record
  const sources = new Map(record.Reference.map((r) => [r.ReferenceNumber, r.SourceName]))
  const lines = []
  const walk = (section) => {
    if (HEADINGS.includes(section.TOCHeading)) {
      for (const info of section.Information ?? []) {
        const v = info.Value ?? {}
        const text = v.StringWithMarkup
          ? v.StringWithMarkup.map((s) => s.String).join('; ')
          : `${(v.Number ?? []).join(', ')}${v.Unit ? ' ' + v.Unit : ''}`
        // Zero-width spaces appear in some Los Alamos strings.
        lines.push({ heading: section.TOCHeading, name: info.Name ?? null, text: text.replace(/\u200b/g, '').trim(), source: sources.get(info.ReferenceNumber) ?? null })
      }
    }
    for (const child of section.Section ?? []) walk(child)
  }
  for (const section of record.Section) walk(section)
  out[z] = { title: record.RecordTitle, lines }
}
writeFileSync(join(outputFolder, 'pubchem-element-pages-extract.json'), JSON.stringify(out, null, 1) + '\n')

// The column labels: `AtomicMass:{name:"Atomic Mass",unit:"u",...` in the page's script.
const labels = {}
const js = readFileSync(scriptPath, 'utf8')
for (const m of js.matchAll(/([A-Za-z]+):\{name:"([^"]+)"(?:,isLong:[^,]+)?(?:,unit:"([^"]*)")?/g)) {
  if (!(m[1] in labels)) labels[m[1]] = { name: m[2], unit: m[3] ?? null }
}
if (!labels.AtomicMass || !labels.Density) throw new Error('column labels not found in the page script; its layout has changed')
writeFileSync(join(outputFolder, 'pubchem-ptable-column-labels.json'), JSON.stringify(labels, null, 1) + '\n')
process.stdout.write(`Wrote two extracts to ${outputFolder}\n`)
