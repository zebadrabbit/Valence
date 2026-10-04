// Reduces what was downloaded from PubChem's element pages to the parts the build and the
// cross-check read, so the committed copies stay small: the property lines of every page, the
// sentences of prose that notes rest on, and the unit labels. Run once after downloading:
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

// Sentences from the pages' prose (history, description, uses) that a note in decisions.json rests on, since the
// property lines above do not hold them. Each: atomic number, section heading, the start of the source PubChem
// cites, and the sentences as printed, or a pattern for them. The script stops if a page no longer holds one.
const SMALL_AMOUNTS = /^(Due to the small amounts produced|Since only (small|tiny) amounts of \w+ have ever been produced|Since only a few atoms of \w+ have ever been made)[^.]*\./
const CIAAW = 'IUPAC Commission on Isotopic Abundances and Atomic Weights'
const PASSAGES = [
  [2, 'Description', 'Los Alamos', 'It is the only liquid that cannot be solidified by lowering the temperature. It remains liquid down to absolute zero at ordinary pressures, but will readily solidify by increasing the pressure.'],
  [9, 'History', 'Jefferson Lab', 'The first recorded use of a fluorine compound dates to around 1670 to a set of instructions for etching glass that called for Bohemian emerald (CaF2).'],
  [9, 'History', CIAAW, 'It was discovered in hydrofluoric acid by the Swedish pharmacist and chemist Carl-Wilhelm Scheele in 1771, but it was not isolated until 1886 by the French pharmacist and chemist Henri Moissan.'],
  [13, 'History', 'Los Alamos', 'The ancient Greeks and Romans used alum as an astringent and as a mordant in dyeing.'],
  [13, 'History', CIAAW, 'In 1825, the Danish physicist, Hans Christian Oersted, isolated impure aluminium.'],
  [14, 'History', CIAAW, 'Amorphous silicon was discovered by the Swedish chemist Jöns Jacob Berzelius in 1824. Crystalline silicon was first prepared by the French chemist Henri Sainte-Claire Deville in 1854.'],
  [20, 'History', 'Los Alamos', 'Though lime was prepared by the Romans in the first century under the name calx, the metal was not discovered until 1808.'],
  [20, 'History', 'Jefferson Lab', 'Metallic calcium was first isolated by Sir Humphry Davy in 1808 through the electrolysis of a mixture of lime (CaO) and mercuric oxide (HgO).'],
  [33, 'Uses', 'Jefferson Lab', 'When heated at standard atmospheric pressure, arsenic changes directly from a solid to a gas, or sublimates, at a temperature of 887 K. In order to form liquid arsenic, the atmospheric pressure must be increased. At 28 times standard atmospheric pressure, arsenic melts at a temperature of 1090 K.'],
  [85, 'History', 'Jefferson Lab', 'A total of 0.05 micrograms (0.00000005 grams) of astatine have been produced to date.'],
  [87, 'History', 'Los Alamos', 'No weighable quantity of the element has been prepared or isolated.'],
  [100, 'Description', 'Los Alamos', 'Fermium is the heaviest synthetic element that can be formed by neutron bombardment of lighter elements, and hence the heaviest element that can be prepared in macroscopic quantities.'],
  [100, 'Description', 'Los Alamos', 'Fermium metal has not been prepared, however measurements have been made on fermium alloys with rare earth metals and a number of predictions have been made.'],
  // What each page says of how much of the element has been made: astatine, francium, and fermium to meitnerium.
  ...[85, 87, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109].map((z) => [z, 'Uses', 'Jefferson Lab', SMALL_AMOUNTS]),
]

const out = {}
const passages = {}
for (let z = 1; z <= 118; z++) {
  const record = JSON.parse(readFileSync(join(folder, `element-${z}.json`), 'utf8')).Record
  const sources = new Map(record.Reference.map((r) => [r.ReferenceNumber, r.SourceName]))
  const lines = []
  // Every string of the page's top-level sections, for the passages.
  const prose = record.Section.flatMap((section) =>
    (section.Information ?? []).flatMap((info) =>
      (info.Value?.StringWithMarkup ?? []).map((s) => ({ heading: section.TOCHeading, source: sources.get(info.ReferenceNumber) ?? '', text: s.String })),
    ),
  )
  for (const [, heading, source, wanted] of PASSAGES.filter(([number]) => number === z)) {
    const found = prose
      .filter((p) => p.heading === heading && p.source.startsWith(source))
      .flatMap((p) => (typeof wanted === 'string' ? (p.text.includes(wanted) ? [{ ...p, text: wanted }] : []) : (wanted.exec(p.text) ?? []).slice(0, 1).map((text) => ({ ...p, text }))))
    if (found.length !== 1) throw new Error(`element ${z}: expected one "${heading}" passage from ${source}, found ${found.length}`)
    ;(passages[z] ??= { title: record.RecordTitle, passages: [] }).passages.push(found[0])
  }
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
writeFileSync(join(outputFolder, 'pubchem-element-pages-passages.json'), JSON.stringify(passages, null, 1) + '\n')

// The column labels: `AtomicMass:{name:"Atomic Mass",unit:"u",...` in the page's script.
const labels = {}
const js = readFileSync(scriptPath, 'utf8')
for (const m of js.matchAll(/([A-Za-z]+):\{name:"([^"]+)"(?:,isLong:[^,]+)?(?:,unit:"([^"]*)")?/g)) {
  if (!(m[1] in labels)) labels[m[1]] = { name: m[2], unit: m[3] ?? null }
}
if (!labels.AtomicMass || !labels.Density) throw new Error('column labels not found in the page script; its layout has changed')
writeFileSync(join(outputFolder, 'pubchem-ptable-column-labels.json'), JSON.stringify(labels, null, 1) + '\n')
process.stdout.write(`Wrote three extracts to ${outputFolder}\n`)
