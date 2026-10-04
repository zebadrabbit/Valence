// Cross-checks the PubChem periodic table download against independent sources
// and writes the report.
//
//   node cross-check-periodic-table.mjs [sources folder] [report path]
//
// Reads saved copies only (see sources/MANIFEST.json for where each came from);
// nothing is fetched. The same inputs give a byte-identical report. No value in
// the download is changed: the report lists what disagrees so a person can decide.
//
// Prototype location: .superpowers/tools/periodic-research/crosscheck/. When this
// moves to scripts/, point the two defaults below at docs/research/periodic-table/.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { analyse } from './analyse.mjs'

const here = import.meta.dirname
let root = here
while (!existsSync(join(root, 'package.json'))) {
  if (dirname(root) === root) throw new Error('run this inside the repository')
  root = dirname(root)
}
const sourcesDir = process.argv[2] ?? join(here, 'sources')
const reportPath = process.argv[3] ?? join(here, 'cross-check.md')

const R = analyse({
  pubchemPath: join(root, 'docs/research/periodic-table/pubchem-periodic-table.json'),
  sourcesDir,
  curatedPath: join(root, 'src/chem-data/elements.json'),
  libraryPath: join(root, 'src/chem-data/library-index.json'),
})
const manifest = JSON.parse(readFileSync(join(sourcesDir, 'MANIFEST.json'), 'utf8'))

// ---------------------------------------------------------------------------
// Rendering helpers

const pub = R.pub
const bySymbol = new Map(pub.map((e) => [e.Symbol, e]))
const nm = (symbol) => `${bySymbol.get(symbol).Name} (${symbol})`
const zOf = (symbol) => Number(bySymbol.get(symbol).AtomicNumber)
const cell = (v) => String(v ?? '').replace(/\|/g, '\\|')
const table = (head, rows) => [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`)].join('\n')
const symbols = (list) => (list.length ? list.join(', ') : 'none')
const signed = (x, places) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(places)
const pct = (x) => `${(x * 100).toFixed(1)}%`
const count = (list, test) => list.filter(test).length
const out = []
const p = (...lines) => out.push(...lines, '')
// A Remark states things in words. Each fact a Remark leans on is checked here,
// so a changed download or source stops the script instead of leaving a false sentence.
const need = (condition, fact) => {
  if (!condition) throw new Error(`a Remark in the report is no longer true: ${fact}`)
}
const value = (symbol, column) => bySymbol.get(symbol)[column]

// ---------------------------------------------------------------------------
// Numbers used in more than one place

const massAgree = count(R.mass, (m) => m.verdict === 'agree')
const massTie = R.mass.filter((m) => m.verdict === 'tie')
const massDiffer = R.mass.filter((m) => m.verdict === 'differ')
const ieAgree = count(R.ie, (m) => m.verdict === 'agree')
const ieDiffer = R.ie.filter((m) => m.verdict !== 'agree')
const ieBig = ieDiffer.filter((m) => Math.abs(m.diff) >= 0.1)
const ieMid = ieDiffer.filter((m) => Math.abs(m.diff) >= 0.01 && Math.abs(m.diff) < 0.1)
const ieSmall = ieDiffer.filter((m) => Math.abs(m.diff) < 0.01)
const enAgree = count(R.en, (x) => x.verdict === 'agree')
const enBy = (v) => R.en.filter((x) => x.verdict === v)
const configCompared = R.config.filter((c) => c.nist)
const configDiffer = configCompared.filter((c) => c.differences.length)
const thermal = (c) => {
  const rows = R.thermal[c].filter((r) => r.pubchem)
  return { rows, compared: rows.filter((r) => r.nearest), ok: rows.filter((r) => r.ok), off: rows.filter((r) => r.nearest && !r.ok) }
}
const [mpT, bpT, dT] = ['MeltingPoint', 'BoilingPoint', 'Density'].map(thermal)
const predicted = R.configText.suffixes.filter(([, s]) => s === 'predicted').map(([s]) => s)
const otherSuffix = R.configText.suffixes.filter(([, s]) => s !== 'predicted')
const noStandard = R.massNoStandard
const isotopeNotInCiaaw = noStandard.filter((m) => m.matches.length === 1 && !(m.ciaawMostStable ?? []).some((c) => c.a === m.matches[0].a))
const isotopeEstimated = noStandard.filter((m) => m.matches.some((x) => x.estimated))
const noble = R.oxidation.onlyZero
const nobleInLibrary = noble.flatMap((s) => R.library.filter((m) => new RegExp(`${s}(?![a-z])`).test(m.formula)).map((m) => `${m.formula} (${s})`))

// ---------------------------------------------------------------------------
// The report

p('# Periodic table cross-check')
p(
  `A comparison of the PubChem periodic table download (\`docs/research/periodic-table/pubchem-periodic-table.json\`, 118 elements) with independent sources, made before any of it is shown in the app. This file is written by \`scripts/cross-check-periodic-table.mjs\` from saved copies of every source (retrieved ${manifest.retrieved}); run the script again to regenerate it. No value in the download was changed. Sentences headed **Remark** are a reviewer's reading of the numbers and are part of the script's text; everything else is computed.`,
)
p(
  '**How agreement is judged.** Two published numbers *agree* when the more precise one, rounded to the decimals of the less precise one, gives the same digits. Rounding is done on the published text, not on floating-point numbers. A *tie* means the dropped digits are exactly 5, so the two agree under one rounding convention and not the other; ties are counted apart. For melting point, boiling point and density the comparison is looser and is described in section 5.',
)

p('## Summary')
p(
  table(
    ['Property', 'Compared with', 'Elements compared', 'Agree', 'Disagree', 'Not comparable'],
    [
      ['Atomic mass', `${R.ciaawTitle} (CIAAW)`, R.mass.length, `${massAgree}, plus ${massTie.length} ties (${symbols(massTie.map((m) => m.symbol))})`, `${massDiffer.length} (${symbols(massDiffer.map((m) => m.symbol))})`, `${noStandard.length}: CIAAW gives no standard atomic weight`],
      ['First ionization energy', 'NIST Atomic Spectra Database', R.ie.length, ieAgree, `${ieDiffer.length}`, `${R.ieOnlyNist.length} that only NIST has; ${R.ieNeither.length} that neither has`],
      ['Electronegativity (Pauling)', 'Wikipedia data page (a transcription of WebElements, CRC, Lange)', count(R.en, (x) => x.verdict === 'agree' || x.verdict === 'differ' || x.verdict === 'tie'), enAgree, count(R.en, (x) => x.verdict === 'differ'), `${enBy('only-pubchem').length + enBy('only-in-a-source-column').length} only in PubChem; ${enBy('only-wikipedia').length} only in Wikipedia; ${enBy('neither').length} in neither`],
      ['Ground-state configuration', 'NIST Atomic Spectra Database', configCompared.length, configCompared.length - configDiffer.length, `${configDiffer.length} (${symbols(configDiffer.map((c) => c.symbol))})`, `${118 - configCompared.length}: not in NIST`],
      ['Melting point', 'Wikipedia data page, nearest transcribed value', mpT.compared.length, `${mpT.ok.length} within 0.5%`, `${mpT.off.length} (${symbols(mpT.off.map((r) => r.symbol))})`, `${R.empties.MeltingPoint.length} empty in PubChem`],
      ['Boiling point', 'Wikipedia data page, nearest transcribed value', bpT.compared.length, `${bpT.ok.length} within 0.5%`, `${bpT.off.length} (${symbols(bpT.off.map((r) => r.symbol))})`, `${R.empties.BoilingPoint.length} empty in PubChem`],
      ['Density', 'Wikipedia data page, nearest transcribed value', dT.compared.length, `${dT.ok.length} within 1%`, `${dT.off.length} (${symbols(dT.off.map((r) => r.symbol))})`, `${R.empties.Density.length} empty in PubChem`],
    ],
  ),
)
p(
  'Atomic radius, electron affinity, oxidation states, year discovered and category were not compared value by value with an independent primary source; section 6 scans them for internal problems and section 10 lists what was not checked.',
)

p('## Findings that need a decision')
p(
  [
    `1. **First ionization energy.** PubChem's column is not NIST's data: all ${R.ie.length} values equal the Jefferson Lab value on PubChem's own element page. ${ieDiffer.length} of them disagree with NIST, ${ieBig.length} by 0.1 eV or more (${symbols(ieBig.map((m) => m.symbol))}). PubChem's element pages carry the NIST value beside the Jefferson Lab one. Section 2.`,
    `2. **Atomic mass of ${noStandard.length} elements is one isotope's mass, not an atomic weight.** For every element without a CIAAW standard atomic weight PubChem prints the AME2020 mass of a single isotope. For ${isotopeEstimated.length} of them (${isotopeEstimated[0].symbol} to ${isotopeEstimated.at(-1).symbol}) that mass is itself an estimate, and for ${symbols(isotopeNotInCiaaw.map((m) => m.symbol))} the isotope is not the one CIAAW lists as most stable. Section 1.2.`,
    `3. **Atomic mass of ${symbols(massDiffer.map((m) => nm(m.symbol)))}** differs from the CIAAW abridged value in the last printed digit, inside CIAAW's stated uncertainty. Section 1.1.`,
    `4. **The atomic radius column mixes sets of van der Waals radii.** ${count(R.radius.rows, (r) => r.match)} of ${R.radius.rows.filter((r) => r.pubchem).length} values match the Bondi and Mantina values transcribed on Wikipedia; the origin of the rest was not found, and the mix puts steps in the trend that are not chemistry (zinc ${bySymbol.get('Zn').AtomicRadius} pm to gallium ${bySymbol.get('Ga').AtomicRadius} pm; platinum ${bySymbol.get('Pt').AtomicRadius}, gold ${bySymbol.get('Au').AtomicRadius}, mercury ${bySymbol.get('Hg').AtomicRadius}). A van der Waals radius also does not show the textbook "radius falls across a period" trend. Section 6.5.`,
    `5. **An empty field does not always mean "not measured".** For ${R.provenance.ElectronAffinity.absentButOnPage.length} elements with an empty electron affinity, PubChem's element page gives 0 eV as its first value: the field is empty because the source says zero. The noble gases ${symbols(R.en.filter((x) => !x.pubchem && ['He', 'Ne', 'Ar', 'Rn'].includes(x.symbol)).map((x) => x.symbol))} have no Pauling electronegativity in any source compared. Sections 3 and 6.8.`,
    `6. **${symbols(configDiffer.map((c) => nm(c.symbol)))}:** PubChem's configuration differs from NIST's ground state, which changes the shell counts a Bohr diagram would draw. Section 4.`,
    `7. **Single values far from other tabulations:** boiling point of ${symbols(bpT.off.filter((r) => r.nearest.rel > 0.05).map((r) => nm(r.symbol)))}; density of ${symbols(dT.off.filter((r) => r.nearest.rel > 0.05).map((r) => nm(r.symbol)))}. Section 5.`,
    `8. **Melting and boiling points that are not ordinary melting or boiling:** arsenic's melting point is above its boiling point, carbon and helium do not melt at atmospheric pressure. Section 6.2.`,
    `9. **Oxidation states are a short list of common states, not all known ones.** The noble gases ${symbols(noble)} are given only "0"${nobleInLibrary.length ? `, while the molecule library holds ${symbols(nobleInLibrary)}` : ''}. For ${R.provenance.OxidationStates.unmatched.length} elements from dubnium on, the source marks states as predicted and the download has dropped the marks. Section 6.6.`,
    `10. **Categories and states a chemist would query:** polonium, astatine, group 12, and elements 104 to 118. Sections 6.3 and 6.9.`,
    `11. **Text that the build script must handle:** a configuration ending "(${otherSuffix.map(([, s]) => s).join(', ')})" (${symbols(otherSuffix.map(([s]) => s))}), irregular spacing, unsigned oxidation states, and the American spellings Aluminum and Cesium. Sections 6.6, 6.7 and 6.10.`,
  ].join('\n'),
)

// ---------------------------------------------------------------------------
p('## 1. Atomic mass')
p(
  `Source: ${R.ciaawTitle}, IUPAC Commission on Isotopic Abundances and Atomic Weights. CIAAW gives a standard atomic weight for ${R.mass.length} elements and none (a dash) for ${noStandard.length}. The dividing line is not "has a stable isotope": ${symbols(R.weightWithoutStableIsotope.map(nm))} have no stable isotope in NUBASE2020 and still have a standard atomic weight, because they occur on Earth with a characteristic isotopic composition.`,
)
p('### 1.1 The 84 elements with a standard atomic weight')
p(
  `${massAgree} agree, ${massTie.length} are ties, ${massDiffer.length} disagree. PubChem prints fewer decimals than the abridged table for ${count(R.mass, (m) => m.lessPrecise === 'PubChem')} elements, the same number for ${count(R.mass, (m) => m.lessPrecise === 'same')}, and more for ${count(R.mass, (m) => m.lessPrecise === 'CIAAW')}.`,
)
p(
  table(
    ['Z', 'Element', 'PubChem', 'CIAAW abridged', 'CIAAW full table', 'Result', 'Difference within CIAAW uncertainty'],
    [...massDiffer, ...massTie].sort((a, b) => a.z - b.z).map((m) => [m.z, nm(m.symbol), m.pubchem, `${m.ciaaw} ± ${m.uncertainty}`, m.full.text, m.verdict === 'tie' ? `tie: ${m.ciaaw} rounds to ${m.b} or ${m.pubchem}` : m.lessPrecise === 'same' ? 'disagree in the last digit' : `disagree: ${m.ciaaw} rounds to ${m.b}`, m.withinUncertainty ? 'yes' : 'no']),
  ),
)
{
  const values = R.mass.filter((m) => m.full.kind === 'value')
  const intervals = R.mass.filter((m) => m.full.kind === 'interval')
  p(
    `Against CIAAW's full table, which the more precise PubChem values must come from: of the ${values.length} elements with a single value, ${count(values, (m) => m.full.verdict === 'agree')} agree and ${count(values, (m) => m.full.verdict === 'tie')} are ties (${symbols(values.filter((m) => m.full.verdict === 'tie').map((m) => m.symbol))}), ${count(values, (m) => m.full.verdict === 'differ')} disagree. Of the ${intervals.length} elements given as an interval, PubChem's value lies inside the interval, with its ends rounded to PubChem's digits, for ${count(intervals, (m) => m.full.inside)}${count(intervals, (m) => !m.full.inside) ? ` and outside for ${symbols(intervals.filter((m) => !m.full.inside).map((m) => m.symbol))}` : ''}.`,
  )
}
need(massDiffer.map((m) => m.symbol).join() === 'Li,S' && massDiffer.every((m) => m.withinUncertainty) && massTie.map((m) => m.symbol).join() === 'Ar,Fe', 'mass disagreements are Li and S, within uncertainty; ties are Ar and Fe')
p(
  `**Remark.** PubChem's figures for these are coarser than CIAAW's abridged ones: it shows lithium as ${value('Li', 'AtomicMass')} where the abridged table shows 6.94 ± 0.06, and sulfur as ${value('S', 'AtomicMass')} where the abridged table shows 32.06 ± 0.02. Both differences are within the uncertainty CIAAW states, so neither is wrong, but 6.94 and 32.06 are the figures a learner will meet in a textbook. The ties (argon ${value('Ar', 'AtomicMass')} against 39.95, iron ${value('Fe', 'AtomicMass')} against 55.845) are PubChem dropping a final 5.`,
)

p('### 1.2 The 34 elements without a standard atomic weight')
p(
  `For every one, PubChem's number equals the AME2020 atomic mass of exactly one isotope, rounded to the digits PubChem prints. Among the half-lives NUBASE2020 gives from measurement, that isotope is the longest-lived for ${count(noStandard, (m) => m.isLongestMeasured === 'yes')} elements${count(noStandard, (m) => m.isLongestMeasured === 'tied') ? ` and tied for longest for ${symbols(noStandard.filter((m) => m.isLongestMeasured === 'tied').map((m) => m.symbol))}` : ''}${count(noStandard, (m) => m.isLongestMeasured === 'no') ? `; it is not the longest for ${symbols(noStandard.filter((m) => m.isLongestMeasured === 'no').map((m) => m.symbol))}` : ''}. It is the isotope CIAAW's "most stable known isotopes" list gives for ${noStandard.length - isotopeNotInCiaaw.length} elements; for ${symbols(isotopeNotInCiaaw.map((m) => nm(m.symbol)))} CIAAW lists a different isotope. A mass marked "estimated" was not measured: AME2020 derived it from trends in neighbouring nuclides. Rounding PubChem's number to a whole number gives the isotope's mass number in ${R.massNumberByRounding ? 'all' : 'not all'} ${noStandard.length} cases.`,
)
p(
  table(
    ['Z', 'Element', 'PubChem prints', 'Isotope', 'AME2020 mass (u)', 'Half-life (NUBASE2020)', 'CIAAW most stable', 'Same isotope as CIAAW'],
    noStandard.map((m) => {
      if (m.matches.length !== 1) return [m.z, nm(m.symbol), m.pubchem, `no single match (nearest ${m.nearest.a})`, '', '', '', '']
      const x = m.matches[0]
      const listed = (m.ciaawMostStable ?? []).map((c) => c.a)
      return [m.z, nm(m.symbol), m.pubchem, `${m.symbol}-${x.a}`, `${x.mass}${x.estimated ? ' (estimated)' : ''}`, x.halfLife, listed.join(', '), listed.includes(x.a) ? 'yes' : 'no']
    }),
  ),
)
p(
  `**Remark.** A periodic table normally prints these as a mass number in square brackets, for example [209] for polonium, to show that the element has no atomic weight. Printing "208.98243 u" beside "atomic mass" would tell a learner that polonium has an atomic weight known to eight figures. The value should be labelled as the mass of the named isotope, or shown as the bracketed mass number. Oganesson's ${value('Og', 'AtomicMass')} is the estimated mass of oganesson-295, for which NUBASE2020 gives a half-life of 680 ms with an uncertainty of 540 ms; CIAAW's list gives only oganesson-294.`,
)
need(noStandard.find((m) => m.symbol === 'Og').matches[0].a === 295 && noStandard.find((m) => m.symbol === 'Og').ciaawMostStable.map((c) => c.a).join() === '294', 'PubChem prints Og-295, CIAAW lists Og-294')
need(noStandard.every((m) => m.matches.length === 1), 'every element without a standard atomic weight matches exactly one isotope mass')

// ---------------------------------------------------------------------------
p('## 2. First ionization energy')
{
  const flags = R.nistFlags
  p(
    `Source: NIST Atomic Spectra Database, Ground States and Ionization Energies, neutral atoms, in eV. NIST covers ${R.nistCoverage.count} elements, atomic numbers ${R.nistCoverage.min} to ${R.nistCoverage.max}; it has no entry for ${symbols(R.nistCoverage.missing)}. NIST marks a value in square brackets as found by interpolation, extrapolation or another semi-empirical procedure, and a value in parentheses as theoretical; unmarked values come from evaluated experimental data. Marked: ${flags.map((f) => `${f.symbol} (${f.flag})`).join(', ')}.`,
  )
  p(
    `PubChem has a value for ${R.ie.length} elements and all can be compared. To PubChem's printed digits ${ieAgree} agree and ${ieDiffer.length} disagree: ${ieSmall.length} by less than 0.01 eV, ${ieMid.length} by 0.01 to 0.1 eV, ${ieBig.length} by 0.1 eV or more.`,
  )
  p(
    table(
      ['Z', 'Element', 'PubChem (eV)', 'NIST (eV)', 'NIST to PubChem\'s digits', 'PubChem − NIST (eV)', 'NIST marks it'],
      ieDiffer.map((m) => [m.z, nm(m.symbol), m.pubchem, m.nistUncertainty ? `${m.nist} ± ${m.nistUncertainty}` : m.nist, m.b, signed(m.diff, 4), m.flag]),
    ),
  )
  p(
    `PubChem leaves ${R.empties.IonizationEnergy.length} elements empty. NIST has a value for ${R.ieOnlyNist.length} of them: ${R.ieOnlyNist.map((m) => `${m.symbol} ${m.nist} (${m.flag})`).join(', ')}. Neither has one for ${symbols(R.ieNeither)}.`,
  )
  const tallyText = Object.entries(R.provenance.IonizationEnergy.tally).map(([k, n]) => `${n} from ${k}`).join('; ')
  p(
    `**Where PubChem's column comes from.** On PubChem's own element pages the periodic-table value is the line cited to: ${tallyText}. The same pages also carry NIST's value for ${R.nistCoverage.count} elements. The column is therefore an older compilation, not NIST's current evaluation.`,
  )
  p(
    `**Remark.** The large differences are not rounding: tantalum is ${signed(R.ie.find((m) => m.symbol === 'Ta').diff, 2)} eV away, osmium ${signed(R.ie.find((m) => m.symbol === 'Os').diff, 2)}, thorium ${signed(R.ie.find((m) => m.symbol === 'Th').diff, 2)}, actinium ${signed(R.ie.find((m) => m.symbol === 'Ac').diff, 2)}, astatine ${signed(R.ie.find((m) => m.symbol === 'At').diff, 2)}, francium ${signed(R.ie.find((m) => m.symbol === 'Fr').diff, 2)}. NIST's uncertainties on these are far smaller than the differences. The 11 elements already in the app take their ionization energy from NIST, and all 11 PubChem values agree with those to PubChem's digits (section 7).`,
  )
}

// ---------------------------------------------------------------------------
p('## 3. Electronegativity (Pauling scale)')
{
  const rev = Object.values(R.wikiRevisions).find((x) => x.title.startsWith('Electronegativities')).revisions[0]
  p(
    `Compared with Wikipedia's "Electronegativities of the elements (data page)" (revision ${rev.revid}, ${rev.timestamp.slice(0, 10)}). That page is a transcription, not a primary source: it gives a value to use, taken from WebElements (which cites Allred 1961 and Huheey 1993), and beside it the CRC Handbook and Lange's Handbook values where they differ. Its Pauling table stops at nobelium (102).`,
  )
  p(
    `PubChem has ${118 - R.empties.Electronegativity.length} values and leaves ${R.empties.Electronegativity.length} empty. ${enAgree} agree with the page's value to use; none disagree.`,
  )
  p(
    table(
      ['Z', 'Element', 'PubChem', 'Wikipedia value to use', 'WebElements', 'CRC', 'Lange', 'What differs'],
      R.en.filter((x) => !['agree', 'neither'].includes(x.verdict)).map((x) => [
        x.z, nm(x.symbol), x.pubchem ?? 'empty', x.wikipedia.length ? x.wikipedia.join(' to ') : x.listed ? 'no data' : 'not listed', x.perSource.webElements ?? '', x.perSource.crc ?? '', x.perSource.lange ?? '',
        { 'only-wikipedia': 'PubChem empty, Wikipedia has a value', 'only-in-a-source-column': 'Wikipedia recommends no value; its three source columns have this one', 'only-pubchem': 'beyond the end of Wikipedia\'s table' }[x.verdict],
      ]),
    ),
  )
  p(`Empty in both: ${symbols(enBy('neither').map((x) => x.symbol))}.`)
  const handbook = R.en.filter((x) => Object.values(x.sourceVerdicts).includes('differ'))
  p(
    `Where the transcribed handbooks differ from PubChem (${handbook.length} elements): ${handbook.map((x) => `${x.symbol} ${x.pubchem} (CRC ${x.perSource.crc ?? 'no data'}, Lange ${x.perSource.lange ?? 'no data'})`).join('; ')}.`,
  )
  const unsourced = R.provenance.Electronegativity.unmatched.map((u) => u.symbol)
  p(
    `**Where PubChem's column comes from.** ${Object.values(R.provenance.Electronegativity.tally).reduce((a, b) => a + b, 0)} of the values appear on PubChem's element pages as "Pauling Scale Electronegativity", cited only to "PubChem Elements". ${symbols(unsourced)} ${unsourced.length === 1 ? 'has' : 'have'} a value in the periodic table and no electronegativity line on the element page at all.`,
  )
  p(
    `**Remark.** The agreement shows that PubChem's column is the WebElements set; it is not an independent confirmation of each number. The handbooks disagree with that set by up to ${Math.max(...handbook.flatMap((x) => [x.perSource.crc, x.perSource.lange].filter(Boolean).map((v) => Math.abs(Number(v) - Number(x.pubchem))))).toFixed(2)} for the heavy elements, because electronegativity is a derived scale, not a measurement. The Wikipedia page itself warns that values for the highly radioactive elements are predictions that are not marked as such, and singles out francium's 0.7. Francium's 0.7 is the lowest value in PubChem's column, so it would set the bottom of a colour scale; the lowest value with a recommended figure is caesium's ${bySymbol.get('Cs').Electronegativity}. Helium, neon and argon have no Pauling value because the scale is built from bond energies and they form no ordinary compounds: "not measured" is the wrong phrase for them.`,
  )
}

// ---------------------------------------------------------------------------
p('## 4. Ground-state electron configuration')
p(
  `Not asked for by the spec, but the same NIST file gives the ground-state shells of ${configCompared.length} neutral atoms, and the Bohr diagram is drawn from the configuration. Every one of PubChem's 118 configurations parses and its electrons sum to the atomic number; the only cores used are ${R.coresUsed.filter((c) => c !== '(none)').map((c) => `[${c}]`).join(', ')}. Against NIST, ${configCompared.length - configDiffer.length} of ${configCompared.length} hold the same number of electrons in every subshell.`,
)
p(
  table(
    ['Z', 'Element', 'PubChem', 'NIST ground shells', 'Difference', 'Shells from PubChem', 'Shells from NIST'],
    configDiffer.map((c) => [c.z, nm(c.symbol), c.pubchem, c.nist, c.differences.join('; '), c.shells.join(', '), c.nistShells.join(', ')]),
  ),
)
p(
  `**Remark.** PubChem does not mark lawrencium's configuration as predicted. NIST's ground level for it is ²P°₁/₂, a 7p electron, not a 6d one. For elements ${R.nistCoverage.max + 1} to 118 there is no NIST entry to compare with; PubChem marks ${predicted.length} of those as "(predicted)" and one, ${symbols(otherSuffix.map(([s]) => s))}, as "(${otherSuffix[0][1]})".`,
)

// ---------------------------------------------------------------------------
p('## 5. Melting point, boiling point and density: a plausibility check')
p(
  `These three are shown on the card, and melting point and density colour the table. No single primary source covers them, so each PubChem value is compared with the nearest value on the matching Wikipedia data page, which transcribes WebElements, the CRC Handbook and Lange's Handbook (and gives several allotropes where they exist). A value passes when a transcribed value lies within 0.5% (and at least 1 K) for temperatures, or within 1% for density. This catches a wrong unit or a wrong number; it does not confirm the last digit.`,
)
const offRow = (r) => [zOf(r.symbol), nm(r.symbol), r.pubchem, r.nearest.value, `${r.nearest.label}${r.nearest.heading ? `, ${r.nearest.heading}` : ''}`, pct(r.nearest.rel), [...new Set(r.all)].join('; ')]
for (const [title, t, unit] of [['Melting point', mpT, 'K'], ['Boiling point', bpT, 'K'], ['Density', dT, 'g/cm³']]) {
  p(`**${title}:** ${t.compared.length} compared, ${t.ok.length} pass, ${t.off.length} ${t.off.length === 1 ? 'does' : 'do'} not.`)
  if (t.off.length) p(table(['Z', 'Element', `PubChem (${unit})`, 'Nearest transcribed', 'From', 'Off by', 'All transcribed values'], t.off.map(offRow)))
}
{
  const off = (t, s) => t.off.find((r) => r.symbol === s)
  need(off(bpT, 'Ra')?.nearest.value === 2010 && off(dT, 'Am')?.nearest.value === 12 && off(dT, 'Bk') && off(dT, 'B') && off(bpT, 'Ba') && off(mpT, 'C') && mpT.off.length + bpT.off.length + dT.off.length === 6, 'the six values that fail the plausibility check are C, Ba, Ra, B, Am, Bk')
  need([off(dT, 'B'), off(bpT, 'Ba'), off(mpT, 'C')].every((r) => r.nearest.rel < 0.015), 'boron, barium and carbon are within 1.5%')
  p(
    `**Remark.** Radium's boiling point is the one large outlier: PubChem's periodic table has ${value('Ra', 'BoilingPoint')} K and the other tabulations 2010 K. Americium's density (${value('Am', 'Density')} against 12 g/cm³) and berkelium's (${value('Bk', 'Density')}, between the 14.78 and 13.25 of its two forms) differ between sources. Boron, barium and carbon are within about 1%; carbon's value is discussed in section 6.2.`,
  )
}

// ---------------------------------------------------------------------------
p('## 6. Sanity scan of the whole download')

p('### 6.1 Shape of the download')
p(
  `118 rows, numbered 1 to 118, ${Object.keys(pub[0]).length} columns. Every non-empty numeric field is a plain decimal number (no ranges, signs, or units in the text). Empty fields per column: ${Object.entries(R.empties).filter(([, v]) => v.length).map(([k, v]) => `${k} ${v.length}`).join(', ')}; the other columns are never empty. These match the counts in the plan.`,
)
p(
  table(
    ['Column', 'Empty for'],
    Object.entries(R.empties).filter(([k, v]) => v.length && k !== 'CPKHexColor').map(([k, v]) => [k, v.join(', ')]),
  ),
)

p('### 6.2 Melting point against boiling point')
p(
  `Melting point at or above boiling point: ${R.meltAboveBoil.map((x) => `${nm(x.symbol)}, melting ${x.mp} K, boiling ${x.bp} K`).join('; ') || 'none'}. Liquid range narrower than 10% of the melting point, for an element that is not a gas: ${R.narrowLiquidRange.map((x) => `${nm(x.symbol)}, ${x.mp} K to ${x.bp} K`).join('; ') || 'none'}.`,
)
need(R.quoted.arsenicMelting.some((r) => r.includes('tp 817 °C') && r.includes('at 3.70 MPa')), 'the CRC row for arsenic reads "tp 817 °C (at 3.70 MPa)"')
need(R.quoted.arsenicBoiling.filter((r) => r.includes('(subl.)')).length === 2, 'CRC and Lange mark arsenic\'s boiling point as sublimation')
need(R.quoted.carbonBoiling.some((r) => r.includes('3825 °C (subl.)')) && value('C', 'BoilingPoint') === '4098', 'carbon\'s boiling point equals the CRC sublimation point, 3825 °C')
need(R.quoted.heliumMelting.some((r) => r.includes('at 25.00 atm')) && R.quoted.heliumMelting.some((r) => r.startsWith('LNG') && r.includes('(at 25 atm)')), 'helium solidifies only near 25 atm')
need(R.trendEnds.MeltingPoint.low[0] === 'He' && R.trendEnds.MeltingPoint.high[0] === 'C', 'helium and carbon are the ends of the melting-point column')
p(
  `**Remark.** Neither is a typing error. Arsenic turns straight from solid to vapour at atmospheric pressure (the CRC and Lange rows on the Wikipedia page mark its boiling point "subl."), and its "melting point" of ${value('As', 'MeltingPoint')} K is measured under pressure (the CRC row reads "tp 817 °C (at 3.70 MPa)"). Carbon also sublimes: PubChem's ${value('C', 'BoilingPoint')} K is the CRC value "3825 °C (subl.)". Helium's ${value('He', 'MeltingPoint')} K is the lowest melting point in the column, and helium does not freeze at atmospheric pressure at any temperature: the Wikipedia page gives its melting only at 25 atm and above, and Lange's row reads "(at 25 atm)". Carbon's ${value('C', 'MeltingPoint')} K is the highest melting point in the column, above tungsten's ${value('W', 'MeltingPoint')} K. So both ends of a melting-point colour scale are values that are not melting at ordinary pressure.`,
)

p('### 6.3 Standard state against melting and boiling point at 298.15 K')
p(
  `The state implied by the melting and boiling points at 298.15 K matches PubChem's StandardState for ${R.stateCheck.consistent} elements and contradicts it for ${R.stateCheck.contradictions.length}. It cannot be checked for ${R.stateCheck.unchecked.length} (${symbols(R.stateCheck.unchecked.map((x) => x.symbol))}), which have neither point. Within 10 K of room temperature: ${R.stateCheck.borderline.map((x) => `${nm(x.symbol)} melts at ${x.mp} K`).join('; ')}.`,
)
p(
  `State counts: ${Object.entries(R.states).map(([k, v]) => `${k} ${v}`).join(', ')}. ${symbols(R.stateNotMarkedExpected)} are given as "Solid" with no "Expected to be", although PubChem has no melting point, boiling point or density for them.`,
)
p(
  table(
    ['Element', 'PubChem state', 'Melting and boiling lines on PubChem\'s own element page'],
    R.expectedStates.map((x) => [nm(x.symbol), x.state, x.lines.join('; ') || 'none']),
  ),
)
p(
  `**Remark.** PubChem's own pages contradict three of the "expected" states. A boiling point near 210 K would make flerovium a gas at room temperature, not a solid; 350 ± 30 K would make oganesson a liquid or solid, not a gas; copernicium's 357 K with an error bar of about 110 K leaves it open. All of elements 104 to 118 have been made only a few atoms at a time, so every state from rutherfordium on is a prediction, whether or not PubChem says "Expected".`,
)

p('### 6.4 Density')
{
  const d = R.density
  p(
    `All ${118 - R.empties.Density.length} densities are in one unit, g/cm³, including the ${d.gasCount} gases: each gas value is 1000 times smaller than its familiar g/L figure. The gases match the ideal-gas density at 0 °C and 1 atm, not at 25 °C:`,
  )
  p(
    table(
      ['Gas', 'PubChem (g/cm³)', 'Same in g/L', 'Ideal gas at 0 °C, 1 atm (g/L)', 'Ratio', 'Ratio if it were 25 °C'],
      R.gasDensity.map((g) => [`${nm(g.symbol)}${g.atoms === 2 ? ', diatomic' : ''}`, g.density, g.perLitre.toFixed(4), g.ideal0.toFixed(4), g.ratio0.toFixed(3), g.ratio25.toFixed(3)]),
    ),
  )
  p(
    `The column runs from ${d.min.text} (${d.min.symbol}) to ${d.max.text} (${d.max.symbol}), a factor of ${Math.round(d.max.value / d.min.value).toLocaleString('en-US')}. The densest gas is ${d.gasMax.symbol} at ${d.gasMax.text}; the least dense solid is ${d.condensedMin.symbol} at ${d.condensedMin.text}. Values given to one or two figures: ${d.oneFigure.map(([s, t]) => `${s} ${t}`).join(', ')}. On PubChem's own pages, values carrying a qualifier that the periodic table drops: ${R.qualified.map((q) => `${q.symbol} ${q.column} "${q.page}"`).join('; ')}.`,
  )
  p(
    `**Remark.** The gas densities are at 0 °C, and the Wikipedia rows that match the solids are marked "near r.t.", so the column is not at one temperature. On a straight-line colour scale all ${d.gasCount} gases fall in the bottom ${(((d.gasMax.value - d.min.value) / (d.max.value - d.min.value)) * 100).toFixed(2)}% and look identical; the scale needs to be logarithmic or the gases handled apart. The longest printed value is "${R.trendEnds.Density.longest}", ten characters in a table cell.`,
  )
}

p('### 6.5 Atomic radius')
{
  const r = R.radius
  const have = r.rows.filter((x) => x.pubchem)
  const noWiki = have.filter((x) => x.match === false && !x.wikipedia.length)
  const differ = have.filter((x) => x.match === false && x.wikipedia.length)
  p(
    `PubChem labels the column "${R.unitLabels.AtomicRadius.name}", in ${R.unitLabels.AtomicRadius.unit}, and on its element pages cites every value to Los Alamos National Laboratory's periodic table, which gives no source. Compared with the van der Waals column of Wikipedia's "Atomic radii of the elements (data page)" (Bondi 1964 and Mantina 2009): ${count(have, (x) => x.match)} of ${have.length} match; ${differ.length} differ (${differ.map((x) => `${x.symbol} ${x.pubchem} against ${x.wikipedia.join(' or ')}`).join('; ')}); ${noWiki.length} have no value there at all (most transition metals, all lanthanides and actinides).`,
  )
  p('The column by period (pm):')
  p(Object.entries(r.periods).map(([period, list]) => `- Period ${period}: ${list.join(', ')}`).join('\n'))
  p(
    `Steps of 12% or more between neighbours in a period: ${r.jumps.map((j) => `${j.from} ${j.a} → ${j.to} ${j.b} (${signed(j.change * 100, 0)}%)`).join('; ')}. Places where the element lower in a group is smaller than the one above it: ${r.groupReversals.map((j) => `group ${j.group}, ${j.upper} ${j.upperValue} → ${j.lower} ${j.lowerValue}`).join('; ')}.`,
  )
  const rad = (s) => Number(value(s, 'AtomicRadius'))
  need(rad('B') > rad('Be') && rad('Si') > rad('Al') && [['Ne', 'F'], ['Ar', 'Cl'], ['Kr', 'Br'], ['Xe', 'I'], ['Rn', 'At']].every(([g, h]) => rad(g) > rad(h)), 'B > Be, Si > Al, and each noble gas is larger than its halogen')
  need(['Ni', 'Cu', 'Zn', 'Ag', 'Cd', 'Au'].every((s) => r.rows.find((x) => x.symbol === s).match), 'Ni, Cu, Zn, Ag, Cd, Au match the Wikipedia (Bondi) values')
  need(R.curated.every((c) => String(c.covalent.appPm) === c.covalent.pagePm), 'the covalent radius on PubChem\'s pages equals the app\'s Cordero value for all 11')
  const cov = (period) => R.covalent.filter((x) => x.period === period).map((x) => `${x.symbol} ${x.value ?? '–'}`).join(', ')
  p(
    `For comparison, PubChem's element pages also carry a covalent radius for ${count(R.covalent, (x) => x.value)} elements (hydrogen to curium). For the 11 elements already in the app it equals the Cordero 2008 value the app cites, in every case. It runs smoothly: period 2: ${cov(2)}; period 3: ${cov(3)}; period 4: ${cov(4)}.`,
  )
  p(
    `**Remark.** Two separate problems. First, the column appears to be stitched from more than one set of radii: copper ${value('Cu', 'AtomicRadius')} and zinc ${value('Zn', 'AtomicRadius')} (Bondi's values, as Wikipedia cites them) sit about a quarter below cobalt ${value('Co', 'AtomicRadius')} and gallium ${value('Ga', 'AtomicRadius')}, and gold ${value('Au', 'AtomicRadius')} sits in a notch between platinum ${value('Pt', 'AtomicRadius')} and mercury ${value('Hg', 'AtomicRadius')}. A learner colouring the table by this column would see a pattern that is an accident of sourcing. Second, even a clean set of van der Waals radii is the wrong quantity for the trend a general chemistry course teaches. The textbook statement "atomic radius decreases across a period and increases down a group" is about covalent or metallic radii; in this column boron is larger than beryllium, silicon larger than aluminium, and each noble gas larger than its halogen. If the radius trend is kept, the covalent radius is the quantity that shows it, and the column must in any case be labelled "van der Waals radius", not "atomic radius".`,
  )
}

p('### 6.6 Oxidation states')
{
  const o = R.oxidation
  const pr = R.provenance.OxidationStates
  p(
    `Empty: ${symbols(o.empty)}. Only "0": ${symbols(o.onlyZero)}. Written without a + sign (${o.unsigned.length} elements): ${o.unsigned.map(([s, t]) => `${s} "${t}"`).join('; ')}. Irregular spacing: ${o.spacing.map(([s, t]) => `${s} "${t}"`).join('; ') || 'none'}. Anything that is not a list of signed whole numbers: ${o.other.map(([s, t]) => `${s} "${t}"`).join('; ') || 'none'}. Lists that include 0 beside other states: ${symbols(o.includesZero)}. The longest entry is "${R.longestText.OxidationStates}".`,
  )
  p(
    `On PubChem's element pages the periodic-table text is, character for character apart from spacing, the line cited to ${Object.entries(pr.tally).map(([k, n]) => `${k} for ${n} elements`).join(' and ')}. For the other ${pr.unmatched.length} it is Los Alamos's line with something removed:`,
  )
  p(table(['Element', 'Periodic table', 'Los Alamos line on the element page'], pr.unmatched.map((u) => [nm(u.symbol), u.table, u.lines.map((l) => l.replace(/ \(Los Alamos\)$/, '')).join('; ')])))
  p(
    `Where the periodic table shows a single state, Los Alamos's line on the same element page is longer for: ${R.oxidationFuller.filter((x) => x.losAlamos && x.losAlamos.replace(/\s*\(.*$/, '') !== x.table).map((x) => `${nm(x.symbol)}, table "${x.table}", Los Alamos "${x.losAlamos}"`).join('; ')}.`,
  )
  const xe = R.oxidationFuller.find((x) => x.symbol === 'Xe')
  need(xe.table === '0' && xe.losAlamos.includes('+4') && R.library.some((m) => m.formula === 'XeF4'), 'xenon is given only 0, Los Alamos lists +4, and the library holds XeF4')
  need(value('O', 'OxidationStates') === '-2' && R.library.some((m) => m.formula === 'H2O2') && R.library.some((m) => m.formula === 'O2'), 'oxygen is given only -2 and the library holds H2O2 and O2')
  need(pr.unmatched.filter((u) => u.lines.some((l) => /\(\d\)|predict/.test(l))).length === pr.unmatched.length, 'every unmatched oxidation-state entry is a Los Alamos line that marks predictions')
  p(
    `**Remark.** The column is a short list of common states, not every known state. Three things follow for the app. First, xenon and krypton are given only "0", yet the library holds XeF4, where xenon is +4; oxygen is given only "−2", yet the library holds hydrogen peroxide (oxygen −1) and O₂ (oxygen 0). The card should head the row "common oxidation states" so that a learner does not read it as a complete list. Second, for the ${pr.unmatched.length} elements in the table above, Los Alamos marks some or all states as predictions, in parentheses or with the word "predicted", and PubChem's periodic table has dropped the marks. The spec's rule that predicted text keeps its marking cannot be met from the download alone for these; they need a note. Third, the unsigned entries need a + added for display, or "5, 4, 3" reads as a count.`,
  )
}

p('### 6.7 Electron configuration text')
{
  const c = R.configText
  p(
    `Endings in parentheses: "(predicted)" on ${predicted.length} (${symbols(predicted)}); ${otherSuffix.map(([s, x]) => `"(${x})" on ${s}`).join(', ')}. A space after the core, where the others that have a core have none: ${c.spaceAfterCore.map(([s, t]) => `${s} "${t}"`).join(', ')}. The order of subshells is not uniform: ${c.sNotFirst.map(([s, t]) => `${s} "${t}"`).join(', ')} do not start with the s subshell as the rest do, and ${symbols(c.pBeforeD.map(([s]) => s))} write 7p before 5f and 6d. Configurations that fail to parse: ${c.errors.length}. Configurations whose electrons do not sum to the atomic number: ${c.wrongCount.length}.`,
  )
  p(
    `**Remark.** A build script that strips only "(predicted)" will leave "(calculated)" inside meitnerium's configuration and will not flag it; the plan's count of 9 predicted configurations is right only for the word "predicted", and 10 configurations carry a marker. The configuration text is Los Alamos's (${R.provenance.ElectronConfiguration.tally['Los Alamos']} of 118 match its line on the element page once spaces are removed), which is why the spacing and order vary.`,
  )
}

p('### 6.8 Electron affinity')
{
  const e = R.provenance.ElectronAffinity
  const zero = R.affinityEmpty.filter((x) => x.first === '0 eV')
  need(zero.length === e.absentButOnPage.length && R.affinityEmpty.every((x) => x.first === null || x.first === '0 eV'), 'every empty electron affinity with a line on the element page has 0 eV as its first line')
  const negative = zero.filter((x) => x.second?.startsWith('-'))
  const positive = zero.filter((x) => x.second && !x.second.startsWith('-'))
  p(
    `${118 - R.empties.ElectronAffinity.length} values, all matching a line on PubChem's element page cited to "PubChem Elements", in eV. Of the ${R.empties.ElectronAffinity.length} empty ones, ${R.affinityEmpty.length - zero.length} have no electron affinity line on the element page either, and ${zero.length} have one whose first value is 0 eV: ${symbols(zero.map((x) => x.symbol))}. For those ${zero.length} the page's second value is negative for ${negative.length} (${negative.map((x) => `${x.symbol} ${x.second.replace(' eV', '')}`).join(', ')}), positive for ${positive.length} (${positive.map((x) => `${x.symbol} ${x.second.replace(' eV', '')}`).join(', ')}) and absent for ${symbols(zero.filter((x) => !x.second).map((x) => x.symbol))}.`,
  )
  p(
    `**Remark.** For these ${zero.length} elements the field is empty because PubChem's first source gives zero, not because nobody has looked. A zero or negative electron affinity means the atom does not hold on to an extra electron, which is the expected answer for the noble gases and for atoms with filled subshells such as beryllium and magnesium. "Not measured" is the wrong label for them. PubChem's two sources disagree on the sign for ${symbols(positive.map((x) => x.symbol))}, and electron affinity was not compared with an independent source, so this report cannot say which is right.`,
  )
}

p('### 6.9 Category')
{
  const rows = []
  for (let period = 1; period <= 7; period++) {
    const members = R.categoryRows.filter((x) => x.period === period)
    const runs = []
    for (const m of members) {
      const last = runs.at(-1)
      if (last && last.category === m.category) last.to = m
      else runs.push({ category: m.category, from: m, to: m })
    }
    rows.push([period, runs.map((r) => `${r.from.symbol}${r.to !== r.from ? `–${r.to.symbol}` : ''} (${r.from.z}${r.to !== r.from ? `–${r.to.z}` : ''}) ${r.category}`).join(' · ')])
  }
  p(`PubChem's GroupBlock for all 118, in atomic-number order (a run of neighbours with the same category is written as a range). Counts: ${Object.entries(R.categories).map(([k, v]) => `${k} ${v}`).join(', ')}.`)
  p(table(['Period', 'Categories'], rows))
  const odd = R.classification.filter((c) => (c.category === 'Metalloid' && c.jlab !== 'Semi-metal') || (c.category !== 'Metalloid' && c.jlab === 'Semi-metal') || c.jlab === null)
  p(
    `PubChem's element pages carry a second, three-way classification from Jefferson Lab (Metal, Semi-metal, Non-metal). It agrees with GroupBlock except: ${odd.map((c) => `${nm(c.symbol)}, GroupBlock "${c.category}", page "${c.jlab ?? 'no classification'}"`).join('; ')}. The same pages put ${symbols(R.classification.filter((c) => /^3 -/.test(c.groupText)).map((c) => c.symbol))} in group 3 beside ${symbols(R.classification.filter((c) => c.groupText === '3').map((c) => c.symbol))}, and give ${count(R.classification, (c) => /^- /.test(c.groupText))} lanthanides and actinides no group number.`,
  )
  need(value('Zn', 'OxidationStates') === '+2' && value('Zn', 'ElectronConfiguration') === '[Ar]4s2 3d10' && value('La', 'ElectronConfiguration') === '[Xe]6s2 5d1', 'zinc is +2 only with a full 3d subshell; lanthanum has no f electron')
  need(odd.some((c) => c.symbol === 'Po' && c.jlab === 'Metal') && odd.some((c) => c.symbol === 'At' && c.jlab === 'Semi-metal'), 'the Jefferson Lab classification is Metal for polonium and Semi-metal for astatine')
  p('**Remark.** Assignments a chemist would query, and why:')
  p(
    [
      '- **Hydrogen, "Nonmetal".** Correct, but it sits at the top of group 1, so its cell will be coloured differently from the alkali metals below it. That is right; the group 1 description should say hydrogen is not an alkali metal.',
      '- **Boron, silicon, germanium, arsenic, antimony, tellurium, "Metalloid".** The usual six. Textbooks agree on these.',
      '- **Polonium, "Metalloid".** Contested: PubChem\'s own polonium page (Jefferson Lab) calls it a metal.',
      '- **Astatine, "Halogen".** True by group (17). PubChem\'s own astatine page (Jefferson Lab) calls it a semi-metal, which is the same thing as a metalloid.',
      `- **Zinc, cadmium, mercury (group 12), "Transition metal".** Common in periodic tables. The usual objection is that these atoms keep a full d subshell: PubChem gives zinc "${value('Zn', 'ElectronConfiguration')}" with only the state ${value('Zn', 'OxidationStates')}, in which the two 4s electrons are lost and the ten d electrons stay. Many textbooks therefore do not count group 12 as transition metals. (IUPAC's definition of a transition element was not fetched: the Gold Book refused an automated request.)`,
      `- **Lanthanum to lutetium "Lanthanide", actinium to lawrencium "Actinide", 15 of each.** A common convention for the two families. It is not the same thing as the f block: an f subshell holds 14 electrons, so the f block is 14 elements wide. PubChem's configuration gives lanthanum no f electron ("${value('La', 'ElectronConfiguration')}"), and PubChem's element pages put lutetium and lawrencium in group 3. A "block" highlight that outlines all 15 of each row as f block would be wrong whichever group 3 convention is drawn.`,
      '- **Copernicium, "Transition metal"; nihonium, flerovium, moscovium, livermorium, "Post-transition metal"; tennessine, "Halogen"; oganesson, "Noble gas".** Assigned by position in the table. Their chemistry is unknown or known from a handful of atoms, and the predictions for copernicium, flerovium and oganesson do not match their neighbours (section 6.3). Rutherfordium to roentgenium, "Transition metal", are also assigned by position.',
            '- PubChem\'s ten names mix two kinds of grouping: four are column names (alkali metal, alkaline earth metal, halogen, noble gas), the rest describe metallic character. A halogen or a noble gas is also a nonmetal. The legend heading "one common classification" covers this, as long as nothing in the app treats the ten as exclusive kinds of matter.',
    ].join('\n'),
  )
}

p('### 6.10 Names, years and the unused colour column')
p(
  `Names that differ from CIAAW's (IUPAC) spelling: ${R.names.map((n) => `${n.pubchem} (CIAAW: ${n.ciaaw})`).join(', ')}. YearDiscovered is "Ancient" for ${R.years.ancient.length} (${symbols(R.years.ancient)}) and a four-digit year for the other ${118 - R.years.ancient.length}; none is empty, so the "not known" wording will never be used. CPKHexColor is empty for ${R.empties.CPKHexColor.length} and malformed for ${R.cpkOdd.map(([s, v]) => `${s} ("${v}", leading zeros lost)`).join(', ')}; the feature does not use it.`,
)
need(value('F', 'YearDiscovered') === '1670', 'fluorine is given 1670')
p(
  `**Remark.** A learner taught British or IUPAC spelling will search for "aluminium" and "caesium"; the command palette should find both spellings. The years were not checked against another source, with one exception that stands out: fluorine's ${bySymbol.get('F').YearDiscovered}. PubChem's own fluorine page explains it (Jefferson Lab: the first recorded use of a fluorine compound dates to around 1670) and also says the element "was not isolated until 1886" (CIAAW's text on the same page). 1886 is the date a learner will find everywhere else.`,
)

// ---------------------------------------------------------------------------
p('## 7. The 11 elements already in the app')
p(
  `\`src/chem-data/elements.json\` against the PubChem download. Atomic weight there is from CIAAW's abridged table, electronegativity from PubChem's periodic table, first ionization energy from NIST.`,
)
p(
  table(
    ['Element', 'Atomic weight, app', 'PubChem', 'Result', 'Electronegativity, app', 'PubChem', 'Result', 'First ionization energy, app (eV)', 'PubChem (eV)', 'Result'],
    R.curated.map((c) => [nm(c.symbol), c.mass.app, c.mass.pubchem, c.mass.verdict === 'agree' ? 'agree' : 'disagree', c.en.app, c.en.pubchem, c.en.verdict, c.ie.app, c.ie.pubchem, c.ie.verdict]),
  ),
)
{
  const bad = R.curated.filter((c) => c.mass.verdict !== 'agree')
  const stale = R.curated.filter((c) => !c.ie.appMatchesNistNow)
  const vdwBad = R.curated.filter((c) => c.vdw.pubchemPm && String(c.vdw.appPm) !== c.vdw.pubchemPm)
  p(
    `Atomic weight: ${11 - bad.length} agree; ${bad.map((c) => `${nm(c.symbol)} is ${c.mass.app} in the app and ${c.mass.pubchem} in PubChem`).join('; ')}. Electronegativity: all ${count(R.curated, (c) => c.en.verdict === 'agree')} agree (the app's values were taken from this same PubChem column). First ionization energy: all ${count(R.curated, (c) => c.ie.verdict === 'agree')} agree to PubChem's digits; the app's stored values ${stale.length ? `differ from today's NIST download for ${symbols(stale.map((c) => c.symbol))}` : "equal today's NIST download for all 11"}. Shell counts derived from PubChem's configuration equal the app's for ${count(R.curated, (c) => c.shells.same)} of 11.`,
  )
  p(
    `Two things the task did not ask about but the card will meet. The app stores a van der Waals radius (Mantina 2009, in ångström) and a covalent radius (Cordero 2008) for these elements; PubChem's AtomicRadius is a van der Waals radius in picometres. Converted to picometres the app's van der Waals radius equals PubChem's for ${11 - vdwBad.length} of 11; it differs for ${vdwBad.map((c) => `${nm(c.symbol)}: app ${c.vdw.appPm}, PubChem ${c.vdw.pubchemPm}`).join('; ')}. And the app writes configurations in full ("${R.curated.find((c) => c.symbol === 'Na').configuration.app}") where PubChem uses a noble-gas core ("${R.curated.find((c) => c.symbol === 'Na').configuration.pubchem}").`,
  )
  p(
    `**Remark.** Sulfur is the one place where the card (32.06, curated) and the trend data (32.07, PubChem) would show different atomic weights for the same element; atomic mass is not a trend property, so the two never appear on one scale. For fluorine and hydrogen the card's curated van der Waals radius and the PubChem value used for colouring differ by about 10 pm, and they are in different units. The plan's rule "show the individually sourced value where one exists" needs to say which curated radius, if either, stands in for PubChem's AtomicRadius, and in which unit.`,
  )
}

// ---------------------------------------------------------------------------
p('## 8. Units and origin of each PubChem column')
p(
  `The download carries no units. Two things on PubChem's own site settle them: the labels in the script its periodic table page loads, and the unit written on each line of its element pages. The last column counts the periodic-table values that equal a line on the element's page, by the source PubChem cites for that line.`,
)
p(
  table(
    ['Column', 'PubChem\'s label', 'Unit on the periodic table page', 'Where the values appear on the element pages'],
    Object.entries(R.unitLabels).map(([c, l]) => {
      const pr = R.provenance[c]
      const where = pr ? `${Object.entries(pr.tally).map(([k, n]) => `${n}: ${k}`).join('; ')}${pr.unmatched.length ? `; ${pr.unmatched.length} with no identical line (${symbols(pr.unmatched.map((u) => u.symbol))})` : ''}` : { AtomicMass: 'not matched line by line; see section 1', GroupBlock: 'no such line; see section 6.9', YearDiscovered: 'no such line' }[c]
      return [c, l.name, l.unit ?? 'none', where]
    }),
  ),
)
p(
  `Every unit the plan inferred is confirmed: u, pm, eV, eV, K, K, g/cm³. One element page writes "pm pm"; one boiling point is written "~3400 K". The download is a compilation. Ionization energy, melting point, boiling point, density, standard state and most oxidation states are the lines PubChem cites to Jefferson Lab; the radii and configurations are the lines it cites to Los Alamos; the atomic masses agree with CIAAW's tables and, where CIAAW has none, with AME2020 isotope masses (section 1); electronegativity and electron affinity are cited only to "PubChem Elements". A single citation to PubChem is accurate as the place the numbers were taken from, and should say that PubChem compiles them from those sources.`,
)

// ---------------------------------------------------------------------------
p('## 9. Elements that need a label or a note if the download is shown unchanged')
{
  const notes = new Map()
  const add = (symbol, text) => notes.set(symbol, [...(notes.get(symbol) ?? []), text])
  for (const m of noStandard) add(m.symbol, `atomic mass is the mass of ${m.symbol}-${m.matches[0].a}${m.matches[0].estimated ? ' (estimated)' : ''}, not an atomic weight${isotopeNotInCiaaw.includes(m) ? `; CIAAW lists ${m.symbol}-${m.ciaawMostStable.map((c) => c.a).join(', ')}` : ''}`)
  for (const m of massDiffer) add(m.symbol, `atomic mass ${m.pubchem}; CIAAW abridged ${m.ciaaw} ± ${m.uncertainty}`)
  for (const m of ieDiffer) add(m.symbol, `first ionization energy ${m.pubchem} eV; NIST ${m.nist} eV`)
  for (const c of configDiffer) add(c.symbol, `configuration differs from NIST's ground state (${c.nist}); not marked predicted`)
  for (const [s, x] of otherSuffix) add(s, `configuration marked "(${x})"`)
  for (const u of R.provenance.Electronegativity.unmatched) add(u.symbol, `electronegativity ${u.table} has no source line on PubChem's element page`)
  for (const r of mpT.off) add(r.symbol, `melting point ${r.pubchem} K; nearest other tabulation ${r.nearest.value} K`)
  for (const r of bpT.off) add(r.symbol, `boiling point ${r.pubchem} K; nearest other tabulation ${r.nearest.value} K`)
  for (const r of dT.off) add(r.symbol, `density ${r.pubchem} g/cm³; nearest other tabulation ${r.nearest.value} g/cm³`)
  add('He', 'melting point is under pressure; helium does not freeze at 1 atm')
  add('As', 'melting point is under pressure and exceeds the boiling point, which is a sublimation point')
  add('C', 'boiling point is a sublimation point')
  for (const q of R.qualified) add(q.symbol, `${q.column === 'Density' ? 'density' : 'boiling point'} is approximate on PubChem's own page ("${q.page}")`)
  for (const s of R.stateNotMarkedExpected) add(s, 'state "Solid" is a prediction that PubChem does not mark')
  for (const s of ['Cn', 'Fl', 'Og']) add(s, 'the expected state is contradicted or left open by the boiling point on PubChem\'s own page')
  for (const u of R.provenance.OxidationStates.unmatched) add(u.symbol, 'oxidation states include predictions whose marks PubChem dropped')
  for (const x of R.oxidationFuller.filter((y) => y.losAlamos && y.losAlamos.replace(/\s*\(.*$/, '') !== y.table)) add(x.symbol, `oxidation states "${x.table}" is not the full list`)
  for (const c of R.classification.filter((y) => (y.category === 'Metalloid' && y.jlab === 'Metal') || (y.category !== 'Metalloid' && y.jlab === 'Semi-metal'))) add(c.symbol, `category "${c.category}"; PubChem's own page says ${c.jlab}`)
  add('F', `year ${value('F', 'YearDiscovered')} is the first recorded use of a compound; isolated 1886`)
  const rows = [...notes].sort((a, b) => zOf(a[0]) - zOf(b[0]))
  p(
    `Gathered from the sections above: ${rows.length} elements. This is a list of reasons, not of wording; which become card notes, which become labels, and which are settled by taking a value from the primary source instead, is a decision.`,
  )
  p(table(['Z', 'Element', 'Why'], rows.map(([s, list]) => [zOf(s), nm(s), list.join('; ')])))
}

// ---------------------------------------------------------------------------
p('## 10. What was not checked')
p(
  [
    '- **Electron affinity** (57 values): no independent comparison.',
    '- **Atomic radius**: compared only with a Wikipedia transcription of Bondi and Mantina; the origin of the transition-metal, lanthanide and actinide values was not found.',
    '- **Year discovered**: not compared with another source, apart from the remark on fluorine.',
    '- **Oxidation states**: scanned for form only, not compared with another list.',
    '- **Melting point, boiling point, density**: compared with a transcription to within 0.5% or 1%, not digit by digit, and not against a primary source.',
    '- **Electronegativity**: the comparison source is a transcription and shares its origin (WebElements) with PubChem. No primary source for Pauling values was fetched.',
    `- **Ionization energy and configuration for elements ${R.nistCoverage.max + 1} to 118**: NIST has no entry; PubChem has no ionization energy for them either.`,
    '- **The IUPAC definition of a transition element** (for group 12): the IUPAC Gold Book refused an automated request.',
    existsSync(join(sourcesDir, 'pubchem-periodictable-fresh.json'))
      ? `- **Whether PubChem has changed since the download**: a fresh copy fetched on ${manifest.retrieved} is ${readFileSync(join(sourcesDir, 'pubchem-periodictable-fresh.json')).equals(readFileSync(join(root, 'docs/research/periodic-table/pubchem-periodic-table.json'))) ? 'byte-identical to' : 'DIFFERENT from'} the committed one.`
      : '- **Whether PubChem has changed since the download**: not rechecked.',
  ].join('\n'),
)

// ---------------------------------------------------------------------------
p('## 11. Sources')
p(table(['Saved copy', 'What it is', 'URL'], manifest.files.map((f) => [`\`${f.file}\``, f.what, f.url])))
p(
  `All retrieved ${manifest.retrieved}. The Wikipedia pages are transcriptions and are used only where no primary table could be fetched; the report says so wherever one is used.`,
)

writeFileSync(reportPath, out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n')

// A machine-readable copy of the same results, without the download itself.
const data = Object.fromEntries(Object.entries(R).filter(([key]) => key !== 'pub'))
writeFileSync(reportPath.replace(/\.md$/, '') + '-data.json', JSON.stringify(data, null, 1) + '\n')

process.stdout.write(
  [
    `Wrote ${reportPath}`,
    `atomic mass: ${R.mass.length} compared, ${massAgree} agree, ${massTie.length} ties, ${massDiffer.length} differ; ${noStandard.length} without a standard atomic weight`,
    `ionization energy: ${R.ie.length} compared, ${ieAgree} agree, ${ieDiffer.length} differ`,
    `electronegativity: ${enAgree} agree with the transcription; configuration: ${configDiffer.length} differ from NIST`,
    '',
  ].join('\n'),
)
