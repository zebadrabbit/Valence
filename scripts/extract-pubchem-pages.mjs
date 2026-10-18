// Reduces what was downloaded from PubChem's element pages to the parts the build and the
// cross-check read, so the committed copies stay small: the property lines of every page, where the
// sentences of prose that notes rest on are and what they say, and the unit labels. Run once after downloading:
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

// The sentences of the pages' prose (history, description, uses) that a note in decisions.json rests on, since the
// property lines above do not hold them. The sentences are not kept: their text is Jefferson Lab's, Los Alamos's or
// CIAAW's, whose terms for copying it could not be read or are not stated. Each entry gives the atomic number, the
// section heading, the start of the source PubChem credits, a short pattern that finds the one sentence meant, and
// what that sentence says in this project's words, which is what the passages file records with the heading and the
// source. The script stops if a page no longer holds exactly one such sentence.
const AMOUNTS = /small amounts|tiny amounts|a few atoms/
const CIAAW = 'IUPAC Commission on Isotopic Abundances and Atomic Weights'
const PASSAGES = [
  [2, 'Description', 'Los Alamos', /absolute zero/, 'Helium is the one liquid that cooling alone does not freeze: at ordinary pressure it stays liquid down to absolute zero, and raising the pressure solidifies it readily.'],
  [9, 'History', 'Jefferson Lab', /\b1670\b/, 'A fluorine compound was first recorded in use around 1670, in instructions for etching glass with Bohemian emerald (CaF2).'],
  [9, 'History', CIAAW, /\b1886\b/, 'Carl-Wilhelm Scheele found fluorine in hydrofluoric acid in 1771, and Henri Moissan first isolated it in 1886.'],
  [13, 'History', 'Los Alamos', /\balum\b/, 'Alum served the ancient Greeks and Romans as an astringent and, in dyeing, as a mordant.'],
  [13, 'History', CIAAW, /\b1825\b/, 'Impure aluminium was first isolated in 1825, by Hans Christian Oersted, a Danish physicist.'],
  [14, 'History', CIAAW, /1824[\s\S]*1854/, 'Jöns Jacob Berzelius found silicon, in its amorphous form, in 1824, and Henri Sainte-Claire Deville first made the crystalline form in 1854.'],
  [20, 'History', 'Los Alamos', /\bcalx\b/, 'The Romans made lime, which they called calx, in the first century, but the metal was found only in 1808.'],
  [20, 'History', 'Jefferson Lab', /\b1808\b/, 'Humphry Davy first isolated calcium metal in 1808, by electrolysing lime (CaO) mixed with mercuric oxide (HgO).'],
  [33, 'Uses', 'Jefferson Lab', /1090 K/, 'At standard atmospheric pressure arsenic sublimes, passing from solid straight to gas at 887 K; it becomes liquid only under raised pressure, and under 28 times standard atmospheric pressure it melts, at 1090 K.'],
  [85, 'History', 'Jefferson Lab', /0\.05 micrograms/, 'The astatine made so far comes to 0.05 micrograms in all (0.00000005 g).'],
  [87, 'History', 'Los Alamos', /weighable/, 'No amount of francium large enough to weigh has been prepared or isolated.'],
  [100, 'Description', 'Los Alamos', /macroscopic/, 'Fermium is the heaviest element that bombarding lighter elements with neutrons can make, and so the heaviest of which a macroscopic amount can be prepared.'],
  [100, 'Description', 'Los Alamos', /alloys/, 'No fermium metal has been prepared, though fermium alloyed with rare earth metals has been measured, and several predictions have been made.'],
  [85, 'Uses', 'Jefferson Lab', AMOUNTS, 'Astatine has been produced only in small amounts and is short-lived, so it has no use beyond basic research.'],
  [87, 'Uses', 'Jefferson Lab', AMOUNTS, 'Francium has been produced only in small amounts and is short-lived, so it has no use beyond basic research.'],
  [100, 'Uses', 'Jefferson Lab', AMOUNTS, 'Fermium has been produced only in small amounts and is short-lived, so it has no use beyond basic research.'],
  [101, 'Uses', 'Jefferson Lab', AMOUNTS, 'Mendelevium has been produced only in small amounts, so it has no use beyond basic research.'],
  [102, 'Uses', 'Jefferson Lab', AMOUNTS, 'Nobelium has been produced only in tiny amounts, so it has no use beyond basic research.'],
  [103, 'Uses', 'Jefferson Lab', AMOUNTS, 'Lawrencium has been produced only in tiny amounts, so it has no use beyond basic research.'],
  [104, 'Uses', 'Jefferson Lab', AMOUNTS, 'Rutherfordium has been produced only in small amounts and is short-lived, so it has no use beyond basic research.'],
  [105, 'Uses', 'Jefferson Lab', AMOUNTS, 'Dubnium has been produced only in small amounts and is short-lived, so it has no use beyond basic research.'],
  [106, 'Uses', 'Jefferson Lab', AMOUNTS, 'So few atoms of seaborgium have been made that it has no use beyond basic research.'],
  [107, 'Uses', 'Jefferson Lab', AMOUNTS, 'So few atoms of bohrium have been made that it has no use beyond basic research.'],
  [108, 'Uses', 'Jefferson Lab', AMOUNTS, 'Hassium has been produced only in small amounts, so it has no use beyond basic research.'],
  [109, 'Uses', 'Jefferson Lab', AMOUNTS, 'Meitnerium has been produced only in small amounts, so it has no use beyond basic research.'],
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
  for (const [, heading, source, pattern, says] of PASSAGES.filter(([number]) => number === z)) {
    const found = prose.filter((p) => p.heading === heading && p.source.startsWith(source) && pattern.test(p.text))
    if (found.length !== 1) throw new Error(`element ${z}: expected one "${heading}" passage from ${source}, found ${found.length}`)
    ;(passages[z] ??= { title: record.RecordTitle, passages: [] }).passages.push({ heading, source: found[0].source, says })
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
