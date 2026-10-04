// Cross-checks the PubChem periodic table download against the other saved sources
// and writes the report.
//
//   npm run cross-check        (node scripts/cross-check-periodic-table.mjs [report path])
//
// Reads the saved copies under docs/research/periodic-table/ (sources/MANIFEST.json says
// where each came from); nothing is fetched. The same inputs give a byte-identical report.
// No value in the download is changed.
//
// Some comparisons were made once, on the date in MANIFEST.json, against sources that are
// not kept in the repository. They are not repeated here: their outcome is in
// cross-check-recorded.md, which is copied into the report unchanged as section 9.

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { analyse } from './cross-check-analyse.mjs'

const root = join(import.meta.dirname, '..')
const research = join(root, 'docs/research/periodic-table')
const sourcesDir = join(research, 'sources')
const reportPath = process.argv[2] ?? join(research, 'cross-check.md')

const R = analyse({
  pubchemPath: join(research, 'pubchem-periodic-table.json'),
  sourcesDir,
  decisionsPath: join(research, 'decisions.json'),
  curatedPath: join(root, 'src/chem-data/elements.json'),
  libraryPath: join(root, 'src/chem-data/library-index.json'),
})
const manifest = JSON.parse(readFileSync(join(sourcesDir, 'MANIFEST.json'), 'utf8'))
const recorded = readFileSync(join(research, 'cross-check-recorded.md'), 'utf8').trim()

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
const configCompared = R.config.filter((c) => c.nist)
const configDiffer = configCompared.filter((c) => c.differences.length)
const predicted = R.configText.suffixes.filter(([, s]) => s === 'predicted').map(([s]) => s)
const otherSuffix = R.configText.suffixes.filter(([, s]) => s !== 'predicted')
const noStandard = R.massNoStandard
const isotopeNotInCiaaw = noStandard.filter((m) => !m.ciaawMostStable.includes(m.massNumber))
const isotopeEstimated = noStandard.filter((m) => m.estimated)
const stateContradicted = R.expectedStates.filter((x) => x.contradicted)

// The values that failed the plausibility check recorded in section 9.4, read from its three tables.
// The check is not repeated; the download must still hold each value.
const OUTLIER_TABLES = { 'Melting point': ['MeltingPoint', 'meltingPoint', 'K', 'Melting Point'], 'Boiling point': ['BoilingPoint', 'boilingPoint', 'K', 'Boiling Point'], Density: ['Density', 'density', 'g/cm³', 'Density'] }
const outliers = []
let outlierTable = null
for (const line of recorded.split('\n')) {
  if (line.startsWith('#')) outlierTable = null
  outlierTable = OUTLIER_TABLES[/^\*\*([A-Za-z ]+):\*\* \d+ compared/.exec(line)?.[1]] ?? outlierTable
  const row = outlierTable && /^\| \d+ \| [^|]*\((\w+)\) \| ([\d.]+) \| ([\d.]+) \|/.exec(line)
  if (!row) continue
  const [, symbol, shown, nearest] = row
  const [column, field, unit, heading] = outlierTable
  if (value(symbol, column) !== shown) throw new Error(`section 9.4 records ${shown} for ${symbol} ${column}, but the download has ${value(symbol, column)}`)
  outliers.push({ symbol, column, field, unit, heading, shown, nearest })
}
// Its summary counts 1 melting point, 2 boiling points and 3 densities.
if (outliers.length !== 6) throw new Error(`section 9.4 should list 6 values that failed its check; ${outliers.length} were read`)
// The melting points the card notes as estimates. Which they are is a chemist's reading, not a computation: the
// sections below check what PubChem's own pages say of each, and say what that does and does not show.
const ESTIMATED_MELTING = ['At', 'Fr', 'Fm', 'Md', 'No', 'Lr']
const enUntraced = R.provenance.Electronegativity.unmatched.map((u) => u.symbol)
// The covalent radii PubChem's element pages print with no uncertainty: "28 pm (Covalent)" against "31(5) pm (Covalent)".
const covalentLines = R.covalent.filter((x) => x.value)
const covalentBare = covalentLines.filter((x) => !/\(\d+\)/.test(x.text))
// Copernicium's boiling point on its page, "357+112-108K": the figure, and how far the page lets it lie above and below.
const cnBoiling = /^(\d+)\+(\d+)-(\d+)K/.exec(R.expectedStates.find((x) => x.symbol === 'Cn').boiling).slice(1).map(Number)
// The kept sentences of one element page, and the handbook densities for one element and form.
const kept = (symbol, heading) => (R.passages[zOf(symbol)] ?? []).filter((passage) => !heading || passage.heading === heading).map((passage) => passage.text)
const handbook = (symbol, form = null) => R.handbookDensities.find((entry) => entry.symbol === symbol && entry.form === form)?.values ?? {}
const noble = R.oxidation.onlyZero
const nobleInLibrary = noble.flatMap((s) => R.library.filter((m) => new RegExp(`${s}(?![a-z])`).test(m.formula)).map((m) => `${m.formula} (${s})`))

// ---------------------------------------------------------------------------
// The report

p('# Periodic table cross-check')
p(
  `A comparison of the PubChem periodic table download (\`docs/research/periodic-table/pubchem-periodic-table.json\`, 118 elements) with other sources. This file is written by \`scripts/cross-check-periodic-table.mjs\` (\`npm run cross-check\`) from the saved copies in \`docs/research/periodic-table/\` (retrieved ${manifest.retrieved}); nothing is fetched, and running the script again gives the same file. Sentences headed **Remark** are a reviewer's reading of the numbers and are part of the script's text; the script checks the facts each one leans on and stops if one no longer holds. Everything else outside section 9 is computed on every run.`,
)
p(
  `**Section 9 is a record, not a computation.** It holds comparisons made on ${manifest.retrieved} against sources that, with one exception, are not kept in this repository. The script copies it in unchanged from \`cross-check-recorded.md\` and repeats none of it.`,
)
p(
  `**What the app shows.** The first version of this report was written before any value was shown, and asked for decisions. They have been made (design spec, section 5.1): the atomic weight shown is CIAAW's for the ${R.mass.length} elements that have one, the first ionization energy shown is NIST's for elements ${R.nistCoverage.min} to ${R.nistCoverage.max}, the covalent radius is the one on PubChem's element pages, and every other value is PubChem's periodic table as downloaded. So sections 1 and 2 no longer describe a fault in a shown value: they record how far PubChem's columns are from the values shown. No value in the download was changed.`,
)
p(
  '**How agreement is judged.** Two published numbers *agree* when the more precise one, rounded to the decimals of the less precise one, gives the same digits. Rounding is done on the published text, not on floating-point numbers. A *tie* means the dropped digits are exactly 5, so the two agree under one rounding convention and not the other; ties are counted apart. The comparison recorded for melting point, boiling point and density is looser and is described in section 9.4.',
)

p('## Summary')
p(
  table(
    ['Property', 'Compared with', 'Elements compared', 'Agree', 'Disagree', 'Not comparable'],
    [
      ['Atomic mass', `${R.ciaawTitle} (CIAAW)`, R.mass.length, `${massAgree}, plus ${massTie.length} ties (${symbols(massTie.map((m) => m.symbol))})`, `${massDiffer.length} (${symbols(massDiffer.map((m) => m.symbol))})`, `${noStandard.length}: CIAAW gives no standard atomic weight`],
      ['First ionization energy', 'NIST Atomic Spectra Database', R.ie.length, ieAgree, `${ieDiffer.length}, of which ${ieBig.length} by 0.1 eV or more`, `${R.ieOnlyNist.length} that only NIST has; ${R.ieNeither.length} that neither has`],
      ['Ground-state configuration', 'NIST Atomic Spectra Database', configCompared.length, configCompared.length - configDiffer.length, `${configDiffer.length} (${symbols(configDiffer.map((c) => c.symbol))})`, `${118 - configCompared.length}: not in NIST`],
    ],
  ),
)
p(
  `Electronegativity, melting point, boiling point, density and van der Waals radius were compared only with secondary transcriptions, on ${manifest.retrieved}; section 9 records the outcome. Covalent radius, electron affinity, oxidation states, year discovered and category were not compared value by value with an independent source; section 6 scans them for internal problems and section 10 lists what was not checked.`,
)

p('## What was decided')
p(
  'The first version of this report listed findings that needed a decision. Each is given here with what was decided. The decisions are recorded in the design spec (`docs/superpowers/specs/2026-10-03-periodic-table-design.md`, sections 5 to 7); the notes are authored in `decisions.json`.',
)
p(
  [
    `1. **First ionization energy.** PubChem's column is not NIST's data: all ${R.ie.length} values equal the Jefferson Lab value on PubChem's own element page. ${ieDiffer.length} of them disagree with NIST, ${ieBig.length} by 0.1 eV or more (${symbols(ieBig.map((m) => m.symbol))}). *Decided:* NIST's value is shown for elements ${R.nistCoverage.min} to ${R.nistCoverage.max}, with NIST's marking where the value is not measured; PubChem's column is not shown. Section 2.`,
    `2. **Atomic mass of ${symbols(massDiffer.map((m) => nm(m.symbol)))}** differs from the CIAAW abridged value in the last printed digit, inside CIAAW's stated uncertainty. *Decided:* CIAAW's abridged value is shown for all ${R.mass.length} elements that have a standard atomic weight. Section 1.1.`,
    `3. **Atomic mass of ${noStandard.length} elements is one isotope's mass, not an atomic weight.** For every element without a CIAAW standard atomic weight PubChem prints the mass of a single isotope. For ${isotopeEstimated.length} of them (${isotopeEstimated[0].symbol} to ${isotopeEstimated.at(-1).symbol}) that mass is itself an estimate, and for ${symbols(isotopeNotInCiaaw.map((m) => m.symbol))} the isotope is not the one CIAAW lists as most stable. *Decided:* PubChem's number is shown, labelled as the mass of the named isotope, with a sentence that the element has no standard atomic weight, and "estimated" where it is. The ${isotopeNotInCiaaw.length} whose isotope CIAAW does not list are under "Unresolved". Sections 1.2 and 9.2.`,
    `4. **PubChem's radius column mixes sets of van der Waals radii**, which puts steps in the trend that are not chemistry (zinc ${bySymbol.get('Zn').AtomicRadius} pm to gallium ${bySymbol.get('Ga').AtomicRadius} pm; platinum ${bySymbol.get('Pt').AtomicRadius}, gold ${bySymbol.get('Au').AtomicRadius}, mercury ${bySymbol.get('Hg').AtomicRadius}), and a van der Waals radius does not show the textbook "radius falls across a period" trend. *Decided:* the table is coloured by covalent radius, which PubChem's element pages carry for ${count(R.covalent, (x) => x.value)} elements; PubChem's column is shown on the card only, labelled "van der Waals radius", with a sentence that its values come from more than one study. Sections 6.5 and 9.6.`,
    `5. **An empty field does not always mean "not measured".** For ${R.provenance.ElectronAffinity.absentButOnPage.length} elements with an empty electron affinity, PubChem's element page gives 0 eV as its first value: the field is empty because the source says zero. The noble gases ${symbols(R.empties.Electronegativity.filter((s) => noble.includes(s)))} have no electronegativity in PubChem's column, nor in the transcription it was compared with (section 9.3). *Decided:* an empty field is shown as "no value listed", never as zero and never as "not measured"; each of the ${R.provenance.ElectronAffinity.absentButOnPage.length} carries a note giving the page's 0 eV. Sections 3 and 6.8.`,
    `6. **Melting and boiling points that are not ordinary melting or boiling:** arsenic's melting point is above its boiling point, and carbon and helium do not melt at atmospheric pressure. *Decided:* the values are shown, each with a note, and the melting-point legend says that its two ends are not ordinary-pressure melting points. Section 6.2.`,
    `7. **Oxidation states are a short list of common states, not all known ones.** The noble gases ${symbols(noble)} are given only "0"${nobleInLibrary.length ? `, while the molecule library holds ${symbols(nobleInLibrary)}` : ''}. For ${R.oxidationPredicted.length} elements from dubnium on, the source marks states as predicted and the download has dropped the marks. *Decided:* the row is headed "Common oxidation states (PubChem's list, not complete)"; xenon, krypton, radon and oxygen carry a note; each element whose states the source marks as predictions carries a note saying which. Section 6.6.`,
    `8. **Categories a chemist would query:** polonium, astatine, group 12, and the heaviest elements. *Decided:* PubChem's ten categories are used as given; polonium and astatine carry a note; the legend says that group 12 and elements 109 to 118 are placed by position. Section 6.9.`,
    `9. **Text that the build script must handle:** a configuration ending "(${otherSuffix.map(([, s]) => s).join(', ')})" (${symbols(otherSuffix.map(([s]) => s))}), irregular spacing, unsigned oxidation states, and the American spellings Aluminum and Cesium. *Decided:* the build moves "(predicted)" and "(calculated)" into a qualifier that stays on screen and fails on any other marking; configurations, oxidation states and names are otherwise kept as PubChem writes them. Sections 6.6, 6.7 and 6.10.`,
    '10. **Lawrencium\'s configuration, single values far from other tabulations, expected states that PubChem\'s own pages contradict, and values PubChem gives as plain facts that are predictions, estimates or untraceable.** No decision settles these; they are listed next.',
  ].join('\n'),
)

p('## Unresolved')
p(
  'Disagreements between sources about a value the app shows, which no decision settles, and values that PubChem gives as plain facts although they are predictions, estimates, or cannot be traced. Each value is shown as PubChem\'s table has it, and the element\'s card carries a note on the row named here. A test (`src/chem-data/periodic.test.ts`) reads this table and fails if any row has no note.',
)
const unresolved = [
  ...configDiffer.map((c) => [c.symbol, 'configuration', c.pubchem, `NIST's ground state, ${c.nist}`, '4']),
  ...outliers.map((o) => [o.symbol, o.field, `${o.shown} ${o.unit}`, `${o.nearest} ${o.unit}, the nearest value in other tabulations (recorded ${manifest.retrieved})`, '9.4']),
  ...stateContradicted.map((x) => [x.symbol, 'standardState', x.state, `a boiling point of "${x.boiling}" on PubChem's own element page`, '6.3']),
  ...isotopeNotInCiaaw.map((m) => [m.symbol, 'atomicMass', `${m.pubchem} u, the mass of the isotope of mass number ${m.massNumber}`, `CIAAW's list of the most stable known isotopes, which gives ${m.ciaawMostStable.join(', ')}`, '1.2']),
  ...R.stateNotMarkedExpected.map((symbol) => [symbol, 'standardState', value(symbol, 'StandardState'), 'no measurement: a prediction that PubChem does not word as one', '6.3']),
  ...ESTIMATED_MELTING.map((symbol) => [symbol, 'meltingPoint', `${value(symbol, 'MeltingPoint')} K`, 'no measurement: an estimate that PubChem does not mark as one', '6.2']),
  ...enUntraced.map((symbol) => [symbol, 'electronegativity', value(symbol, 'Electronegativity'), 'no source: PubChem\'s own page for the element has no Pauling-scale line', '3']),
  ...ESTIMATED_MELTING.map((symbol) => [symbol, 'standardState', value(symbol, 'StandardState'), 'no sample large enough to observe: a prediction that PubChem does not word as one', '6.3']),
  ['Cn', 'standardState', value('Cn', 'StandardState'), `a boiling point of "${R.expectedStates.find((x) => x.symbol === 'Cn').boiling}" on PubChem's own element page, a range that reaches below room temperature`, '6.3'],
  ...covalentBare.map((x) => [x.symbol, 'covalentRadius', `${x.value} pm (PubChem's page for the element; the table has no such column)`, `no uncertainty on the page, unlike its radii for ${covalentLines.length - covalentBare.length} other elements`, '6.5']),
].sort((a, b) => zOf(a[0]) - zOf(b[0]))
p(table(['Z', 'Element', 'Card row', 'PubChem\'s table', 'Against', 'Section'], unresolved.map(([symbol, row, shown, against, section]) => [zOf(symbol), nm(symbol), `\`${row}\``, shown, against, section])))
p(
  'The card row is the name of the field in `src/chem-data/periodic-table.json`. Not in this table, because a decision above settles each with a note or a label: the fuller oxidation-state lists on PubChem\'s own pages (section 6.6), the electron affinities those pages give as zero (6.8), the two values they qualify (6.4), and the densities and temperatures that belong to one form of an element (6.2 and 6.4).',
)

// ---------------------------------------------------------------------------
p('## 1. Atomic mass')
p(
  `Source: ${R.ciaawTitle}, IUPAC Commission on Isotopic Abundances and Atomic Weights. CIAAW gives a standard atomic weight for ${R.mass.length} elements and none (a dash) for ${noStandard.length}. The app shows CIAAW's value for the ${R.mass.length}; this section records how PubChem's AtomicMass column compares.`,
)
p(`### 1.1 The ${R.mass.length} elements with a standard atomic weight`)
p(
  `${massAgree} agree, ${massTie.length} are ties, ${massDiffer.length} disagree. PubChem prints fewer decimals than the abridged table for ${count(R.mass, (m) => m.lessPrecise === 'PubChem')} elements, the same number for ${count(R.mass, (m) => m.lessPrecise === 'same')}, and more for ${count(R.mass, (m) => m.lessPrecise === 'CIAAW')}.`,
)
p(
  table(
    ['Z', 'Element', 'PubChem', 'CIAAW abridged (shown)', 'Result', 'Difference within CIAAW uncertainty'],
    [...massDiffer, ...massTie].sort((a, b) => a.z - b.z).map((m) => [m.z, nm(m.symbol), m.pubchem, `${m.ciaaw} ± ${m.uncertainty}`, m.verdict === 'tie' ? `tie: ${m.ciaaw} rounds to ${m.b} or ${m.pubchem}` : m.lessPrecise === 'same' ? 'disagree in the last digit' : `disagree: ${m.ciaaw} rounds to ${m.b}`, m.withinUncertainty ? 'yes' : 'no']),
  ),
)
need(massDiffer.map((m) => m.symbol).join() === 'Li,S' && massDiffer.every((m) => m.withinUncertainty) && massTie.map((m) => m.symbol).join() === 'Ar,Fe', 'mass disagreements are Li and S, within uncertainty; ties are Ar and Fe')
p(
  `**Remark.** PubChem's figures for these are coarser than CIAAW's abridged ones: it prints lithium as ${value('Li', 'AtomicMass')} where the abridged table has 6.94 ± 0.06, and sulfur as ${value('S', 'AtomicMass')} where the abridged table has 32.06 ± 0.02. Both differences are within the uncertainty CIAAW states, so neither is wrong, but 6.94 and 32.06 are the figures a learner will meet in a textbook, and they are the ones the app shows. The ties (argon ${value('Ar', 'AtomicMass')} against 39.95, iron ${value('Fe', 'AtomicMass')} against 55.845) are PubChem dropping a final 5. The comparison with CIAAW's full table is in section 9.2.`,
)

p(`### 1.2 The ${noStandard.length} elements without a standard atomic weight`)
p(
  `For every one, PubChem's number is the mass of a single isotope, and rounding it to a whole number gives that isotope's mass number. Which isotope, and whether its mass is measured or estimated, was settled against AME2020 on ${manifest.retrieved} (section 9.2) and is written down in \`decisions.json\`; the script checks only that the two agree on the mass number. The isotope is one that CIAAW's "most stable known isotopes" list gives for ${noStandard.length - isotopeNotInCiaaw.length} elements; for ${symbols(isotopeNotInCiaaw.map((m) => nm(m.symbol)))} CIAAW lists a different isotope.`,
)
p(
  table(
    ['Z', 'Element', 'PubChem prints', 'Shown as the mass of', 'CIAAW most stable', 'Same isotope as CIAAW'],
    noStandard.map((m) => [m.z, nm(m.symbol), m.pubchem, `${m.symbol}-${m.massNumber}${m.estimated ? ' (estimated)' : ''}`, m.ciaawMostStable.join(', '), m.ciaawMostStable.includes(m.massNumber) ? 'yes' : 'no']),
  ),
)
need(symbols(isotopeNotInCiaaw.map((m) => m.symbol)) === 'Ds, Cn, Og' && isotopeEstimated.length === 16 && isotopeEstimated[0].symbol === 'Lr', 'the isotopes CIAAW does not list are those of Ds, Cn and Og; 16 masses, from Lr on, are estimates')
p(
  `**Remark.** A periodic table normally prints these as a mass number in square brackets, for example [209] for polonium, to show that the element has no atomic weight. Printing "${value('Po', 'AtomicMass')} u" beside "atomic mass" would tell a learner that polonium has an atomic weight known to eight figures, so the app labels the number as the mass of the named isotope and says that the element has no standard atomic weight. For darmstadtium, copernicium and oganesson the isotope whose mass PubChem prints is not one that CIAAW's list gives, so "mass of the isotope" would name an isotope that the list of the most stable known ones does not hold. Each of the three carries a note on the card giving the mass number CIAAW lists.`,
)

// ---------------------------------------------------------------------------
p('## 2. First ionization energy')
{
  const flags = R.nistFlags
  p(
    `Source: NIST Atomic Spectra Database, Ground States and Ionization Energies, neutral atoms, in eV. NIST covers ${R.nistCoverage.count} elements, atomic numbers ${R.nistCoverage.min} to ${R.nistCoverage.max}; it has no entry for ${symbols(R.nistCoverage.missing)}. NIST marks a value in square brackets as found by interpolation, extrapolation or another semi-empirical procedure, and a value in parentheses as theoretical; unmarked values come from evaluated experimental data. Marked: ${flags.map((f) => `${f.symbol} (${f.flag})`).join(', ')}. The app shows NIST's value, with this marking, for all ${R.nistCoverage.count}; PubChem's IonizationEnergy column is not shown, and what follows records how it differs.`,
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
    `**Where PubChem's column comes from.** On PubChem's own element pages the periodic-table value is the line cited to: ${tallyText}. The same pages also carry NIST's value, for ${R.pagesWithNistIe} elements. The column is therefore an older compilation, not NIST's current evaluation.`,
  )
  p(
    `**Remark.** The large differences are not rounding: tantalum is ${signed(R.ie.find((m) => m.symbol === 'Ta').diff, 2)} eV away, osmium ${signed(R.ie.find((m) => m.symbol === 'Os').diff, 2)}, thorium ${signed(R.ie.find((m) => m.symbol === 'Th').diff, 2)}, actinium ${signed(R.ie.find((m) => m.symbol === 'Ac').diff, 2)}, astatine ${signed(R.ie.find((m) => m.symbol === 'At').diff, 2)}, francium ${signed(R.ie.find((m) => m.symbol === 'Fr').diff, 2)}. NIST's uncertainties on these are far smaller than the differences. The 11 elements already in the app take their ionization energy from NIST, and all 11 PubChem values agree with those to PubChem's digits (section 7).`,
  )
}

// ---------------------------------------------------------------------------
p('## 3. Electronegativity (Pauling scale)')
{
  const unsourced = enUntraced
  const nistEnergy = (symbol) => R.ie.find((m) => m.symbol === symbol).nist
  const [[lowest, lowestValue], [next, nextValue]] = R.enLowest
  p(
    `PubChem has ${118 - R.empties.Electronegativity.length} values and leaves ${R.empties.Electronegativity.length} empty (section 6.1 names them). The app shows the column as it is. No primary source for Pauling values is among the saved copies; the comparison with a Wikipedia transcription made on ${manifest.retrieved}, in which every value that could be compared agreed, is in section 9.3.`,
  )
  p(
    `**Where PubChem's column comes from.** ${Object.values(R.provenance.Electronegativity.tally).reduce((a, b) => a + b, 0)} of the values appear on PubChem's element pages as "Pauling Scale Electronegativity", cited only to "PubChem Elements". ${symbols(unsourced)} ${unsourced.length === 1 ? 'has' : 'have'} a value in the periodic table and no Pauling-scale line on the element page.`,
  )
  need(lowest === 'Fr' && next === 'Cs' && unsourced.join() === 'Fr,Lr', 'francium has the lowest electronegativity, cesium the next, and francium\'s and lawrencium\'s have no line on their pages')
  need(Number(nistEnergy('Fr')) > Number(nistEnergy('Cs')), 'NIST gives francium a higher first ionization energy than cesium')
  need(kept('Fr', 'History').includes('No weighable quantity of the element has been prepared or isolated.'), 'PubChem\'s francium page says no weighable quantity has been prepared')
  p(
    `**Remark.** Francium's ${lowestValue} is the lowest value in the column, so it sets the bottom of the electronegativity colour scale, and it is one of the ${unsourced.length} values that cannot be traced to a line on PubChem's own page. The next lowest is cesium's ${nextValue}. NIST's first ionization energies point the other way: francium's (${nistEnergy('Fr')} eV) is higher than cesium's (${nistEnergy('Cs')} eV), which a lower electronegativity would not lead one to expect. Both untraced values carry a note on the card saying that they could not be traced beyond PubChem's table, and are listed under "Unresolved"; francium's note adds what PubChem's francium page says, that no weighable quantity of the element has been prepared. Helium, neon and argon have no Pauling value because the scale is built from bond energies and they form no ordinary compounds, which is one reason an empty field is not called "not measured".`,
  )
}

// ---------------------------------------------------------------------------
p('## 4. Ground-state electron configuration')
p(
  `The same NIST file gives the ground-state shells of ${configCompared.length} neutral atoms, and the card's shell diagram is drawn from the configuration. Every one of PubChem's 118 configurations parses and its electrons sum to the atomic number; the only cores used are ${R.coresUsed.filter((c) => c !== '(none)').map((c) => `[${c}]`).join(', ')}. Against NIST, ${configCompared.length - configDiffer.length} of ${configCompared.length} hold the same number of electrons in every subshell.`,
)
p(
  table(
    ['Z', 'Element', 'PubChem', 'NIST ground shells', 'Difference', 'Shells from PubChem', 'Shells from NIST'],
    configDiffer.map((c) => [c.z, nm(c.symbol), c.pubchem, c.nist, c.differences.join('; '), c.shells.join(', '), c.nistShells.join(', ')]),
  ),
)
p(
  `**Remark.** PubChem does not mark lawrencium's configuration as predicted. NIST's ground level for it is ²P°₁/₂, a 7p electron, not a 6d one. For elements ${R.nistCoverage.max + 1} to 118 there is no NIST entry to compare with; PubChem marks ${predicted.length} of those as "(predicted)" and one, ${symbols(otherSuffix.map(([s]) => s))}, as "(${otherSuffix[0][1]})". The card shows PubChem's configuration for lawrencium, draws the shell diagram from it, and gives NIST's ground state in a note.`,
)

// ---------------------------------------------------------------------------
p('## 5. Melting point, boiling point and density')
p(
  `No primary source for these three columns is among the saved copies. On ${manifest.retrieved} each value was compared with the nearest value transcribed on a Wikipedia data page; section 9.4 records that check, which the script does not repeat. ${outliers.length} values failed it and are listed under "Unresolved". What the script still computes about these columns is in sections 6.2 to 6.4.`,
)
{
  const lines = (o) => R.pages[zOf(o.symbol)].lines.filter((l) => l.heading === o.heading).map((l) => `${l.text} (${l.source.split(',')[0]})`)
  p(
    `PubChem's own element pages can be read for a second opinion on those ${outliers.length}. Beside the Jefferson Lab line that the table's value comes from, some pages carry a line from Los Alamos:`,
  )
  p(table(['Z', 'Element', 'Property', 'PubChem\'s table', 'Lines on PubChem\'s element page'], outliers.map((o) => [zOf(o.symbol), nm(o.symbol), o.heading.toLowerCase(), `${o.shown} ${o.unit}`, lines(o).join('; ')])))
  const second = (symbol) => lines(outliers.find((o) => o.symbol === symbol))[1]
  need(second('Ba') === '1845°C (Los Alamos National Laboratory)' && second('Ra') === '1737°C (Los Alamos National Laboratory)', 'the second boiling-point lines are 1845 °C for barium and 1737 °C for radium')
  need(second('C') === '3550°C(diamond) (Los Alamos National Laboratory)' && value('C', 'MeltingPoint') === '3823', 'the second melting-point line for carbon is 3550 °C, labelled diamond, which is the table\'s 3823 K')
  need(['B', 'Am', 'Bk'].every((symbol) => lines(outliers.find((o) => o.symbol === symbol)).length === 1), 'the boron, americium and berkelium pages carry one density line each')
  // The densities page is the one Wikipedia transcription that is kept, so the figures the three notes quote are read here.
  const forms = (symbol) => R.handbookDensities.filter((entry) => entry.symbol === symbol)
  p(
    `For the three densities the page has nothing to set beside the table's value. The handbook figures are read from the kept copy of Wikipedia's densities page (solid phase), which transcribes the CRC Handbook and Lange's Handbook:`,
  )
  p(table(['Z', 'Element', 'PubChem\'s table (g/cm³)', 'CRC Handbook', 'Lange\'s Handbook'], ['B', 'Am', 'Bk'].flatMap((symbol) => forms(symbol).map((entry) => [zOf(symbol), `${nm(symbol)}${entry.form ? `, ${entry.form}` : ''}`, value(symbol, 'Density'), entry.values.CRC, entry.values.LNG]))))
  need(handbook('B').CRC === '2.34' && handbook('B').LNG === '2.34' && handbook('Am').CRC === '12' && handbook('Am').LNG === '12', 'both handbooks give 2.34 for boron and 12 for americium')
  need(handbook('Bk', 'alpha').CRC === '14.78' && handbook('Bk', 'alpha').LNG === '14.78' && handbook('Bk', 'beta').CRC === '13.25' && handbook('Bk', 'beta').LNG === '13.25', 'both handbooks give 14.78 and 13.25 for the two forms of berkelium')
  p(
    `**Remark.** For barium and radium the page's second line is itself the disagreement: 1845 °C is 2118 K against the table's ${value('Ba', 'BoilingPoint')} K, and 1737 °C is 2010 K against the table's ${value('Ra', 'BoilingPoint')} K. Their notes on the card quote those lines. The notes on boron, americium and berkelium quote the handbook figures in the table above: 2.34, 12, and 14.78 and 13.25 g/cm³. For carbon the second line, "3550°C(diamond)", is the table's own ${value('C', 'MeltingPoint')} K with a label; section 6.2 says why that figure needs its note.`,
  )
}

// ---------------------------------------------------------------------------
p('## 6. Sanity scan of the whole download')

p('### 6.1 Shape of the download')
need(R.notPlainNumbers.length === 0, 'every non-empty numeric field is a plain decimal number')
{
  // Design spec, section 5.1: how many elements each shown PubChem column covers.
  const coverage = { Electronegativity: 95, AtomicRadius: 99, ElectronAffinity: 57, MeltingPoint: 103, BoilingPoint: 93, Density: 96 }
  need(Object.entries(coverage).every(([column, n]) => 118 - R.empties[column].length === n), 'the columns the app shows cover the numbers of elements the design spec states')
}
p(
  `118 rows, numbered 1 to 118, ${Object.keys(pub[0]).length} columns. Every non-empty numeric field is a plain decimal number (no ranges, signs, or units in the text). Empty fields per column: ${Object.entries(R.empties).filter(([, v]) => v.length).map(([k, v]) => `${k} ${v.length}`).join(', ')}; the other columns are never empty. For the columns the app shows, these are the coverage figures in the design spec (section 5.1).`,
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
need(R.trendEnds.MeltingPoint.low[0] === 'He' && R.trendEnds.MeltingPoint.high[0] === 'C', 'helium and carbon are the ends of the melting-point column')
need(R.meltAboveBoil.map((x) => x.symbol).join() === 'As' && R.narrowLiquidRange.map((x) => x.symbol).join() === 'C', 'arsenic melts above its boiling point; carbon has the narrow liquid range')
need(R.pages[6].lines.some((l) => l.heading === 'Boiling Point' && l.text === '3800°C(sublimation)'), 'PubChem\'s carbon page has a boiling-point line marked as sublimation')
need(kept('As', 'Uses').some((text) => text.includes('At 28 times standard atmospheric pressure, arsenic melts at a temperature of 1090 K.')) && value('As', 'MeltingPoint') === '1090', 'PubChem\'s arsenic page says arsenic melts at 1090 K at 28 times atmospheric pressure')
need(kept('He', 'Description').some((text) => text.includes('It remains liquid down to absolute zero at ordinary pressures')), 'PubChem\'s helium page says helium stays liquid down to absolute zero at ordinary pressures')
const whitePhosphorus = (heading) => R.pages[15].lines.find((l) => l.heading === heading && l.text.endsWith('(whitephosphorus)'))?.text
need(whitePhosphorus('Melting Point') && whitePhosphorus('Boiling Point'), 'PubChem\'s phosphorus page labels its melting and boiling points as white phosphorus\'s')
p(
  `**Remark.** Neither is a typing error. Arsenic turns straight from solid to vapour at atmospheric pressure, and its "melting point" of ${value('As', 'MeltingPoint')} K is measured under pressure. PubChem's arsenic page gives that pressure as 28 times atmospheric; the CRC row quoted in section 9.5 gives 3.70 MPa, which is about 36 times, so the note on the card says "under pressure" and gives no figure. Carbon also sublimes: PubChem's own carbon page carries a second boiling-point line that reads "3800°C(sublimation)". Helium's ${value('He', 'MeltingPoint')} K is the lowest melting point in the column, and helium does not freeze at atmospheric pressure at any temperature. The rows of other tabulations that say these things are quoted in section 9.5. Carbon's ${value('C', 'MeltingPoint')} K is the highest melting point in the column, above tungsten's ${value('W', 'MeltingPoint')} K. So both ends of a melting-point colour scale are values that are not melting at ordinary pressure: the melting-point legend says so, and arsenic, carbon and helium each carry a note on the card. Phosphorus's melting and boiling points are those of one of its forms: the Los Alamos lines on its page read "${whitePhosphorus('Melting Point')}" and "${whitePhosphorus('Boiling Point')}", in °C, and each row carries a note saying so.`,
)
{
  const amounts = (symbol) => kept(symbol, 'Uses').find((text) => /small amounts|tiny amounts/.test(text))
  need(ESTIMATED_MELTING.every((symbol) => value(symbol, 'MeltingPoint') !== '' && amounts(symbol)), 'each melting point noted as an estimate is in the table, and the element\'s page says only small amounts have been produced')
  need(kept('At', 'History').some((text) => text.includes('0.05 micrograms')) && kept('Fm', 'Description').some((text) => text.startsWith('Fermium metal has not been prepared')) && kept('Fm', 'Description').some((text) => text.includes('the heaviest element that can be prepared in macroscopic quantities')), 'the astatine and fermium pages say how little has been made')
  need(['Md', 'No', 'Lr'].every((symbol) => zOf(symbol) > zOf('Fm')), 'mendelevium, nobelium and lawrencium are heavier than fermium')
  need(value('Es', 'MeltingPoint') !== '' && !ESTIMATED_MELTING.includes('Es'), 'einsteinium has a melting point that is not noted as an estimate')
  p(
    `**Melting points of elements never made in bulk.** PubChem's table gives a melting point, with no marking, for ${ESTIMATED_MELTING.length} elements of which no sample large enough to melt has been made. What PubChem's own pages say of each:`,
  )
  p(table(['Z', 'Element', 'PubChem\'s table (K)', 'On PubChem\'s page for the element'], ESTIMATED_MELTING.map((symbol) => [zOf(symbol), nm(symbol), value(symbol, 'MeltingPoint'), [amounts(symbol), ...kept(symbol).filter((text) => text !== amounts(symbol) && !text.includes('heaviest element'))].join(' ')])))
  p(
    `**Remark.** A melting point is measured on a sample that can be seen to melt, so these ${ESTIMATED_MELTING.length} figures are estimates or predictions; each carries a note on the card saying so and is listed under "Unresolved". No page says in so many words that its melting point is an estimate. Francium's says that no weighable quantity has been prepared, fermium's that the metal has not been prepared and that predictions have been made, and astatine's that 0.05 micrograms have been produced in all. For mendelevium, nobelium and lawrencium the pages say only that small or tiny amounts have been produced; that no bulk sample exists follows from the fermium page, which calls fermium "the heaviest element that can be prepared in macroscopic quantities". That the figures are estimates is therefore a chemist's reading of these pages, not a statement found on them. Einsteinium's page says the same of einsteinium, and its melting point (${value('Es', 'MeltingPoint')} K) carries no note: it was measured on microgram samples, which is the reviewer's general knowledge and not something a saved source states.`,
  )
}

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
need(symbols(stateContradicted.map((x) => x.symbol)) === 'Fl, Og', 'the expected states a boiling point on the page contradicts are those of flerovium and oganesson')
need(R.expectedStates.find((x) => x.symbol === 'Cn').boiling.startsWith('357+112-108K'), 'copernicium\'s page gives its boiling point as 357 K, plus 112 or minus 108')
need(cnBoiling[0] > 298.15 && cnBoiling[0] - cnBoiling[2] < 298.15 && Math.abs(cnBoiling[1] - 110) < 5 && Math.abs(cnBoiling[2] - 110) < 5, 'room temperature lies inside the range copernicium\'s page gives for its boiling point, which is about 110 K either way')
need(ESTIMATED_MELTING.every((symbol) => value(symbol, 'StandardState') === 'Solid'), 'the six elements whose melting point is an estimate are given as Solid with no "Expected to be"')
need(symbols(R.stateNotMarkedExpected) === 'Rf, Db, Sg, Bh, Hs, Mt' && R.stateNotMarkedExpected.every((symbol) => kept(symbol, 'Uses').length === 1 && /small amounts|only a few atoms/.test(kept(symbol, 'Uses')[0])), 'rutherfordium to meitnerium are given as Solid with no measurement, and each page says only small amounts or a few atoms have been made')
p(
  `**Remark.** PubChem's own pages contradict two of the "expected" states: the boiling-point figure on the page is on the wrong side of 298.15 K for ${symbols(stateContradicted.map((x) => nm(x.symbol)))}. A boiling point near 210 K would make flerovium a gas at room temperature, not a solid; 350 ± 30 K would mean oganesson is not a gas. Both carry a note on the card and are listed under "Unresolved". Copernicium's ${cnBoiling[0]} K has an error bar of about 110 K, which reaches below room temperature, so its page leaves the state open; it carries a note on the card giving that figure and is listed under "Unresolved". All of elements 104 to 118 have been made only a few atoms at a time, so every state from rutherfordium on is a prediction, whether or not PubChem says "Expected". ${symbols(R.stateNotMarkedExpected)} are shown as "Solid" without that word; each carries a note on the card saying that PubChem does not word the state as expected although it lists no measurement, and is listed under "Unresolved". PubChem's page for each says that only small amounts of it, or only a few atoms, have been made; the sentences are kept in \`sources/pubchem-element-pages-passages.json\`. The same holds further down the table for ${symbols(ESTIMATED_MELTING.map(nm))}, the six whose melting points are estimates (section 6.2): PubChem gives each as "Solid" with no "Expected to be", although its page says that only small amounts have ever been produced. Each carries a note on the card saying so and is listed under "Unresolved".`,
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
  need(R.qualified.map((q) => `${q.symbol} ${q.column}`).sort().join() === 'At Density,Cm BoilingPoint', 'the values the pages qualify are astatine\'s density and curium\'s boiling point')
  p(
    `**Remark.** The gas densities are at 0 °C and the solids' are near room temperature (section 9.5), so the column is not at one temperature; each gas carries a note on the card saying what its density refers to. On a straight-line colour scale all ${d.gasCount} gases fall in the bottom ${(((d.gasMax.value - d.min.value) / (d.max.value - d.min.value)) * 100).toFixed(2)}% and look identical. The scale is kept linear and the density legend says that the gases sit at the bottom of it (design spec, section 6). The longest printed value is "${R.trendEnds.Density.longest}", ten characters in a table cell. Astatine's density and curium's boiling point, which the pages qualify, each carry a note.`,
  )
  need(Number(handbook('C', 'graphite').LNG) === Number(value('C', 'Density')) && handbook('C', 'diamond').CRC === '3.513' && handbook('C', 'diamond').LNG === '3.513', 'carbon\'s density is the handbook figure for graphite, and both handbooks give 3.513 for diamond')
  need(handbook('P', 'white').CRC === '1.823' && handbook('P', 'white').LNG === '1.823' && Number(handbook('P', 'white').CRC).toFixed(2) === value('P', 'Density') && ['red', 'black'].every((form) => Object.values(handbook('P', form)).every((v) => Number(v) > 1.823)), 'phosphorus\'s density is the handbook figure for white phosphorus, and red and black phosphorus are denser')
  p(
    `Two densities are those of one form of an element that has several. On the kept copy of Wikipedia's densities page, carbon's ${value('C', 'Density')} is Lange's figure for graphite (${handbook('C', 'graphite').LNG}; both handbooks give ${handbook('C', 'diamond').CRC} for diamond), and phosphorus's ${value('P', 'Density')} is both handbooks' figure for white phosphorus (${handbook('P', 'white').CRC}) to two decimals, with red and black phosphorus denser. Each carries a note on the card naming the form. PubChem's own pages do not say which form these two densities are for.`,
  )
}

p('### 6.5 Atomic radius')
{
  const r = R.radius
  const have = r.rows.filter((x) => x.pubchem)
  const cited = Object.entries(R.provenance.AtomicRadius.tally)
  need(cited.every(([key]) => key.startsWith('Los Alamos')) && cited.reduce((n, [, k]) => n + k, 0) === have.length, 'every van der Waals radius equals a Los Alamos line on the element page')
  p(
    `PubChem labels the column "${R.unitLabels.AtomicRadius.name}", in ${R.unitLabels.AtomicRadius.unit}, and all ${have.length} values equal the line its element pages cite to Los Alamos National Laboratory's periodic table. The app shows the column on the card, labelled "van der Waals radius", and does not colour the table by it. Its comparison with Bondi's and Mantina's published values (${manifest.retrieved}; about half match) is in section 9.6.`,
  )
  p('The column by period (pm):')
  p(Object.entries(r.periods).map(([period, list]) => `- Period ${period}: ${list.join(', ')}`).join('\n'))
  p(
    `Steps of 12% or more between neighbours in a period: ${r.jumps.map((j) => `${j.from} ${j.a} → ${j.to} ${j.b} (${signed(j.change * 100, 0)}%)`).join('; ')}. Places where the element lower in a group is smaller than the one above it: ${r.groupReversals.map((j) => `group ${j.group}, ${j.upper} ${j.upperValue} → ${j.lower} ${j.lowerValue}`).join('; ')}.`,
  )
  const rad = (s) => Number(value(s, 'AtomicRadius'))
  need(rad('B') > rad('Be') && rad('Si') > rad('Al') && [['Ne', 'F'], ['Ar', 'Cl'], ['Kr', 'Br'], ['Xe', 'I'], ['Rn', 'At']].every(([g, h]) => rad(g) > rad(h)), 'B > Be, Si > Al, and each noble gas is larger than its halogen')
  need(R.curated.every((c) => String(c.covalent.appPm) === c.covalent.pagePm), 'the covalent radius on PubChem\'s pages equals the app\'s Cordero value for all 11')
  const cov = (period) => R.covalent.filter((x) => x.period === period).map((x) => `${x.symbol} ${x.value ?? '–'}`).join(', ')
  p(
    `For comparison, PubChem's element pages also carry a covalent radius for ${count(R.covalent, (x) => x.value)} elements (hydrogen to curium). For the 11 elements already in the app it equals the Cordero 2008 value the app cites, in every case. This is the radius the app colours the table by. It runs smoothly: period 2: ${cov(2)}; period 3: ${cov(3)}; period 4: ${cov(4)}.`,
  )
  p(
    `**Remark.** Two separate problems. First, the column appears to be stitched from more than one set of radii: copper ${value('Cu', 'AtomicRadius')} and zinc ${value('Zn', 'AtomicRadius')} (Bondi's values; section 9.6) sit about a quarter below cobalt ${value('Co', 'AtomicRadius')} and gallium ${value('Ga', 'AtomicRadius')}, and gold ${value('Au', 'AtomicRadius')} sits in a notch between platinum ${value('Pt', 'AtomicRadius')} and mercury ${value('Hg', 'AtomicRadius')}. A learner who saw the table coloured by this column would see a pattern that is an accident of sourcing. Second, even a clean set of van der Waals radii is the wrong quantity for the trend a general chemistry course teaches. The textbook statement "atomic radius decreases across a period and increases down a group" is about covalent or metallic radii; in this column boron is larger than beryllium, silicon larger than aluminium, and each noble gas larger than its halogen. The covalent radius is the quantity that shows that trend, which is why the app colours by it, and why this column is never labelled plain "atomic radius".`,
  )
  const byRadius = [...covalentLines].sort((a, b) => Number(a.value) - Number(b.value))
  need(symbols(covalentBare.map((x) => x.symbol)) === 'He, Ne, Pm, At, Rn, Fr, Ac, Pa' && byRadius[0].symbol === 'He' && byRadius.at(-1).symbol === 'Fr', 'eight covalent radii are printed with no uncertainty, the smallest (helium) and the largest (francium) among them')
  p(
    `**Covalent radii printed with no uncertainty.** Of the ${covalentLines.length} covalent-radius lines on PubChem's element pages, ${covalentLines.length - covalentBare.length} give the radius with an uncertainty in its last digit, as in "${covalentLines[0].text}" for hydrogen. ${covalentBare.length} give none: ${covalentBare.map((x) => `${nm(x.symbol)} ${x.value}`).join(', ')}. Both ends of the covalent-radius colour scale are among them: helium's ${byRadius[0].value} pm is the smallest radius and francium's ${byRadius.at(-1).value} pm the largest.`,
  )
  p(
    `**Remark on the ${covalentBare.length}.** The page does not say why these radii have no uncertainty. The paper they come from (Cordero 2008) was not read, so nothing here says how they were arrived at. Each carries a note on the card saying that the page gives the radius with no uncertainty, unlike its radii for ${covalentLines.length - covalentBare.length} other elements, and that it should be treated as an estimate; each is listed under "Unresolved". Because the two ends of the scale carry the note, the covalent-radius legend shows it for both.`,
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
  const alsoMarked = R.oxidationPredicted.filter((symbol) => !pr.unmatched.some((u) => u.symbol === symbol))
  need(R.oxidationPredicted[0] === 'Db' && R.oxidationPredicted.length === pr.unmatched.length + alsoMarked.length, 'the pages mark predicted oxidation states from dubnium on, and every unmatched entry is among them')
  p(
    `The comparison above sets aside a closing remark in parentheses. For ${symbols(alsoMarked)} that remark is "(predicted)", so their text matches although the table has dropped the mark too. In all, the pages mark some or all states as predictions for ${R.oxidationPredicted.length} elements: ${symbols(R.oxidationPredicted)}.`,
  )
  p(
    `Where the periodic table shows a single state, Los Alamos's line on the same element page is longer for: ${R.oxidationFuller.filter((x) => x.losAlamos && x.losAlamos.replace(/\s*\(.*$/, '') !== x.table).map((x) => `${nm(x.symbol)}, table "${x.table}", Los Alamos "${x.losAlamos}"`).join('; ')}.`,
  )
  const xe = R.oxidationFuller.find((x) => x.symbol === 'Xe')
  need(xe.table === '0' && xe.losAlamos.includes('+4') && R.library.some((m) => m.formula === 'XeF4'), 'xenon is given only 0, Los Alamos lists +4, and the library holds XeF4')
  need(value('O', 'OxidationStates') === '-2' && R.library.some((m) => m.formula === 'H2O2') && R.library.some((m) => m.formula === 'O2'), 'oxygen is given only -2 and the library holds H2O2 and O2')
  const fuller = (symbol) => R.oxidationFuller.find((x) => x.symbol === symbol).losAlamos
  need(fuller('O') === '2, 1, -1, -2' && fuller('Rn') === '6, 2, 0' && fuller('Kr').startsWith('2, 1, 0 '), 'Los Alamos lists 2, 1, -1, -2 for oxygen, 6, 2, 0 for radon and 2, 1, 0 for krypton')
  need(pr.unmatched.filter((u) => u.lines.some((l) => /\(\d\)|predict/.test(l))).length === pr.unmatched.length, 'every unmatched oxidation-state entry is a Los Alamos line that marks predictions')
  p(
    `**Remark.** The column is a short list of common states, not every known state. Three things follow for the app. First, xenon and krypton are given only "0", yet the library holds XeF4, where xenon is +4; oxygen is given only "−2", yet the library holds hydrogen peroxide (oxygen −1) and O₂ (oxygen 0). The card therefore heads the row "Common oxidation states (PubChem's list, not complete)", and xenon, krypton, radon and oxygen each carry a note giving the other states on PubChem's own page. Second, for the ${R.oxidationPredicted.length} elements just named, Los Alamos marks some or all states as predictions, in parentheses or with the word "predicted", and PubChem's periodic table has dropped the marks. The rule that predicted text keeps its marking cannot be met from the download alone for these, so each carries a note saying which states the page marks. Third, ${o.unsigned.length} entries are written without a + sign; the app shows each list as PubChem writes it, changing only "-" to the true minus sign.`,
  )
}

p('### 6.7 Electron configuration text')
{
  const c = R.configText
  p(
    `Endings in parentheses: "(predicted)" on ${predicted.length} (${symbols(predicted)}); ${otherSuffix.map(([s, x]) => `"(${x})" on ${s}`).join(', ')}. A space after the core, where the others that have a core have none: ${c.spaceAfterCore.map(([s, t]) => `${s} "${t}"`).join(', ')}. The order of subshells is not uniform: ${c.sNotFirst.map(([s, t]) => `${s} "${t}"`).join(', ')} do not start with the s subshell as the rest do, and ${symbols(c.pBeforeD.map(([s]) => s))} write 7p before 5f and 6d. Configurations that fail to parse: ${c.errors.length}. Configurations whose electrons do not sum to the atomic number: ${c.wrongCount.length}.`,
  )
  p(
    `**Remark.** ${predicted.length + otherSuffix.length} configurations carry a marker: ${predicted.length} say "(predicted)" and meitnerium's says "(calculated)". The build moves either word into a qualifier that stays on screen, keeps the rest of the text as published, and fails on any other ending in parentheses. The configuration text is Los Alamos's (${R.provenance.ElectronConfiguration.tally['Los Alamos']} of 118 match its line on the element page once spaces are removed), which is why the spacing and order vary.`,
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
    `**Remark.** For these ${zero.length} elements the field is empty because PubChem's first source gives zero, not because nobody has looked. A zero or negative electron affinity means the atom does not hold on to an extra electron, which is the expected answer for the noble gases and for atoms with filled subshells such as beryllium and magnesium. "Not measured" is the wrong label for them, and the app's wording for every empty field is "no value listed"; each of the ${zero.length} also carries a note on the card saying that PubChem's page for the element lists 0 eV. PubChem's two sources disagree on the sign for ${symbols(positive.map((x) => x.symbol))}, and electron affinity was not compared with an independent source, so this report cannot say which is right.`,
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
      '- **Hydrogen, "Nonmetal".** Correct, but it sits at the top of group 1, so its cell will be coloured differently from the alkali metals below it. That is right; the group 1 description says that hydrogen is a nonmetal, not an alkali metal.',
      '- **Boron, silicon, germanium, arsenic, antimony, tellurium, "Metalloid".** The usual six. Textbooks agree on these.',
      '- **Polonium, "Metalloid".** Contested: PubChem\'s own polonium page (Jefferson Lab) calls it a metal. The card carries a note.',
      '- **Astatine, "Halogen".** True by group (17). PubChem\'s own astatine page (Jefferson Lab) calls it a semi-metal, which is the same thing as a metalloid. The card carries a note.',
      `- **Zinc, cadmium, mercury (group 12), "Transition metal".** Common in periodic tables. The usual objection is that these atoms keep a full d subshell: PubChem gives zinc "${value('Zn', 'ElectronConfiguration')}" with only the state ${value('Zn', 'OxidationStates')}, in which the two 4s electrons are lost and the ten d electrons stay. Many textbooks therefore do not count group 12 as transition metals. (IUPAC's definition of a transition element was not fetched: the Gold Book refused an automated request.) The legend says that group 12 is placed by position.`,
      `- **Lanthanum to lutetium "Lanthanide", actinium to lawrencium "Actinide", 15 of each.** A common convention for the two families. It is not the same thing as the f block: an f subshell holds 14 electrons, so the f block is 14 elements wide. PubChem's configuration gives lanthanum no f electron ("${value('La', 'ElectronConfiguration')}"), and PubChem's element pages put lutetium and lawrencium in group 3. The app takes neither the 15-wide families nor PubChem's group numbers for its blocks: it puts lanthanum and actinium in group 3 and the d block, and makes the f block cerium to lutetium and thorium to lawrencium (design spec, section 5.4), with one note on the page saying that group 3 is unsettled and that PubChem puts lutetium and lawrencium there.`,
      '- **Copernicium, "Transition metal"; nihonium, flerovium, moscovium, livermorium, "Post-transition metal"; tennessine, "Halogen"; oganesson, "Noble gas".** Assigned by position in the table. Their chemistry is unknown or known from a handful of atoms, and the predictions for copernicium, flerovium and oganesson do not match their neighbours (section 6.3). Rutherfordium to roentgenium, "Transition metal", are also assigned by position. The legend says that elements 109 to 118 are placed by position.',
      '- PubChem\'s ten names mix two kinds of grouping: four are column names (alkali metal, alkaline earth metal, halogen, noble gas), the rest describe metallic character. A halogen or a noble gas is also a nonmetal. The legend is headed "Chemical family (PubChem\'s grouping)", shows "Nonmetal" as "Other nonmetals", and says that the halogens and noble gases that are nonmetals are listed under their family names (design spec, section 5.5).',
    ].join('\n'),
  )
}

p('### 6.10 Names, years and the unused colour column')
p(
  `Names that differ from CIAAW's (IUPAC) spelling: ${R.names.map((n) => `${n.pubchem} (CIAAW: ${n.ciaaw})`).join(', ')}. YearDiscovered is "Ancient" for ${R.years.ancient.length} (${symbols(R.years.ancient)}) and a four-digit year for the other ${118 - R.years.ancient.length}; none is empty. CPKHexColor is empty for ${R.empties.CPKHexColor.length} and malformed for ${R.cpkOdd.map(([s, v]) => `${s} ("${v}", leading zeros lost)`).join(', ')}; the feature does not use it.`,
)
need(value('F', 'YearDiscovered') === '1670' && R.years.other.length === 0, 'fluorine is given 1670, and every year is four digits or "Ancient"')
need(kept('F', 'History').some((text) => text.startsWith('The first recorded use of a fluorine compound dates to around 1670')) && kept('F', 'History').some((text) => text.includes('it was not isolated until 1886')), 'PubChem\'s fluorine page dates the first recorded use of a compound to around 1670 and the isolation to 1886')
need(kept('Al', 'History').some((text) => text.includes('In 1825')) && kept('Ca', 'History').some((text) => text.includes('1808')) && kept('Si', 'History').some((text) => text.includes('1824') && text.includes('1854')), 'the kept sentences give 1825 for aluminium, 1808 for calcium, and 1824 and 1854 for silicon')
p(
  `**Remark.** PubChem's spellings are the ones the app shows. A learner taught British or IUPAC spelling will search for "aluminium" and "caesium", so the command palette is to find both spellings. The years were not checked against another source, with one exception that stands out: fluorine's ${bySymbol.get('F').YearDiscovered}. PubChem's own fluorine page explains it (Jefferson Lab: the first recorded use of a fluorine compound dates to around 1670) and also says the element "was not isolated until 1886" (CIAAW's text on the same page). 1886 is the date a learner will find everywhere else, and the card gives it in a note. Aluminum and calcium, both "Ancient", and silicon's 1854 carry notes of the same kind. The sentences of the pages' history text that these four notes rest on, and those behind the helium, arsenic and francium notes, are kept in \`sources/pubchem-element-pages-passages.json\`.`,
)

// ---------------------------------------------------------------------------
p('## 7. The 11 elements already in the app')
p(
  `The 11 curated records in \`src/chem-data/elements.json\`, which the molecule explorer's atom cards show, against the PubChem download. Their atomic weight is from CIAAW's abridged table, their electronegativity from PubChem's periodic table, their first ionization energy from NIST.`,
)
p(
  table(
    ['Element', 'Atomic weight, curated', 'PubChem', 'Result', 'Electronegativity, curated', 'PubChem', 'Result', 'First ionization energy, curated (eV)', 'PubChem (eV)', 'Result'],
    R.curated.map((c) => [nm(c.symbol), c.mass.app, c.mass.pubchem, c.mass.verdict === 'agree' ? 'agree' : 'disagree', c.en.app, c.en.pubchem, c.en.verdict, c.ie.app, c.ie.pubchem, c.ie.verdict]),
  ),
)
{
  const bad = R.curated.filter((c) => c.mass.verdict !== 'agree')
  const stale = R.curated.filter((c) => !c.ie.appMatchesNistNow)
  const vdwBad = R.curated.filter((c) => c.vdw.pubchemPm && String(c.vdw.appPm) !== c.vdw.pubchemPm)
  p(
    `Atomic weight: ${11 - bad.length} agree; ${bad.map((c) => `${nm(c.symbol)} is ${c.mass.app} in the curated record and ${c.mass.pubchem} in PubChem`).join('; ')}. Electronegativity: all ${count(R.curated, (c) => c.en.verdict === 'agree')} agree (the curated values were taken from this same PubChem column). First ionization energy: all ${count(R.curated, (c) => c.ie.verdict === 'agree')} agree to PubChem's digits; the curated values ${stale.length ? `differ from the saved NIST file for ${symbols(stale.map((c) => c.symbol))}` : 'equal the saved NIST file for all 11'}. Shell counts derived from PubChem's configuration equal the curated ones for ${count(R.curated, (c) => c.shells.same)} of 11.`,
  )
  p(
    `Two more things the element card meets. The curated records store a van der Waals radius (Mantina 2009, in ångström) and a covalent radius (Cordero 2008); PubChem's AtomicRadius is a van der Waals radius in picometres. Converted to picometres the curated van der Waals radius equals PubChem's for ${11 - vdwBad.length} of 11; it differs for ${vdwBad.map((c) => `${nm(c.symbol)}: curated ${c.vdw.appPm}, PubChem ${c.vdw.pubchemPm}`).join('; ')}. And the curated records write configurations in full ("${R.curated.find((c) => c.symbol === 'Na').configuration.app}") where PubChem uses a noble-gas core ("${R.curated.find((c) => c.symbol === 'Na').configuration.pubchem}").`,
  )
  need(symbols(bad.map((c) => c.symbol)) === 'S' && stale.length === 0 && symbols(vdwBad.map((c) => c.symbol)) === 'H, F', 'of the 11, only sulfur\'s atomic weight differs from PubChem, the ionization energies are NIST\'s, and the van der Waals radii of H and F differ')
  p(
    `**Remark.** The periodic table takes its atomic weights from CIAAW and its first ionization energies from NIST, as the curated records do, so PubChem's 32.07 for sulfur is shown nowhere, and the two sets of records agree on atomic weight, first ionization energy and covalent radius for all 11 (a test in \`src/chem-data/periodic.test.ts\` pins this). What still differs is the van der Waals radius of hydrogen and of fluorine, by about 10 pm. For those two the element card shows the table's value and gives the curated value and its source in one sentence (design spec, section 5.3).`,
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
  `The units are PubChem's own: u, pm, eV, eV, K, K, g/cm³. The build script stores the same ones and fails if PubChem's label for a column it uses says otherwise. One element page writes "pm pm"; one boiling point is written "~3400 K". The download is a compilation. Ionization energy, melting point, boiling point, density, standard state and most oxidation states are the lines PubChem cites to Jefferson Lab; the radii and configurations are the lines it cites to Los Alamos; the atomic masses agree with CIAAW's tables and, where CIAAW has none, with AME2020 isotope masses (sections 1 and 9.2); electronegativity and electron affinity are cited only to "PubChem Elements". A single citation to PubChem is accurate as the place the numbers were taken from, and the app's citation says that PubChem compiles them from other sources.`,
)

// ---------------------------------------------------------------------------
// Section 9 is the record of the comparisons that are not repeated.
p(recorded)

// ---------------------------------------------------------------------------
p('## 10. What was not checked')
p(
  [
    `- **Electron affinity** (${118 - R.empties.ElectronAffinity.length} values): no independent comparison here. \`units.md\` (section 9) records that the column is a 1990 compilation and that a comparison with a secondary source found it dated; the card is to say that the values are from a 1990 compilation.`,
    '- **Van der Waals radius**: compared once with a Wikipedia transcription of Bondi and Mantina (section 9.6); the origin of the transition-metal, lanthanide and actinide values was not found.',
    `- **Covalent radius**: taken from PubChem's element pages. That the values there are Cordero's was confirmed for the 11 curated elements only (section 6.5). Why ${covalentBare.length} of the radii have no uncertainty was not found out: Cordero 2008 was not read.`,
    '- **Year discovered**: not compared with another source, apart from the remark on fluorine.',
    '- **Oxidation states**: scanned for form and against PubChem\'s own element pages, not compared with an independent list.',
    '- **Melting point, boiling point, density**: compared once with a transcription to within 0.5% or 1% (section 9.4), not digit by digit, and not against a primary source.',
    '- **That the six melting points noted as estimates are estimates**: PubChem\'s pages say how little of each element has been made, and none says that its melting point is an estimate (section 6.2).',
    '- **The handbooks behind the density notes**: the CRC Handbook and Lange\'s Handbook were read only through the kept Wikipedia transcription (section 5).',
    '- **Electronegativity**: the one comparison (section 9.3) was with a transcription that shares its origin (WebElements) with PubChem. No primary source for Pauling values was fetched.',
    `- **Ionization energy and configuration for elements ${R.nistCoverage.max + 1} to 118**: NIST has no entry; PubChem has no ionization energy for them either.`,
    '- **The IUPAC definition of a transition element** (for group 12): the IUPAC Gold Book refused an automated request.',
    `- **Everything in section 9**: computed on ${manifest.retrieved} and not repeated since, because its sources are not kept.`,
    `- **Whether PubChem has changed since the download**: not rechecked since ${manifest.retrieved} (section 9.7).`,
  ].join('\n'),
)

// ---------------------------------------------------------------------------
p('## 11. Sources')
{
  const row = (f) => [`\`${f.file}\``, f.what, f.url]
  const keptFiles = manifest.files.filter((f) => R.filesRead.includes(f.file))
  if (keptFiles.length !== R.filesRead.length) throw new Error('MANIFEST.json does not list every saved copy the script reads')
  p('Saved copies the script reads, in `docs/research/periodic-table/sources/`. The Wikipedia page is kept under its own licence; `README.md` in that folder gives the attribution:')
  p(table(['Saved copy', 'What it is', 'URL'], keptFiles.map(row)))
  p(
    'The script also reads the download itself (`pubchem-periodic-table.json`), `decisions.json` for the isotope each mass belongs to, `cross-check-recorded.md` for section 9, and the app\'s `src/chem-data/elements.json` and `src/chem-data/library-index.json`.',
  )
  p(`Read on ${manifest.retrieved} and not kept in the repository. Section 9 rests on these; the NIST help page is where the meaning of NIST's brackets and parentheses (section 2) comes from, and section 9.8 quotes it:`)
  p(table(['Copy', 'What it is', 'URL'], manifest.files.filter((f) => !keptFiles.includes(f)).map(row)))
  p(
    `All retrieved ${manifest.retrieved}. The Wikipedia pages are transcriptions and were used only where no primary table could be fetched; the report says so wherever one is used.`,
  )
}

writeFileSync(reportPath, out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n')

process.stdout.write(
  [
    `Wrote ${reportPath}`,
    `atomic mass: ${R.mass.length} compared, ${massAgree} agree, ${massTie.length} ties, ${massDiffer.length} differ; ${noStandard.length} without a standard atomic weight`,
    `ionization energy: ${R.ie.length} compared, ${ieAgree} agree, ${ieDiffer.length} differ`,
    `configuration: ${configDiffer.length} differ from NIST; ${unresolved.length} items unresolved, each needing a note in decisions.json`,
    '',
  ].join('\n'),
)
