# Periodic table research record

The inputs the periodic table is built from, the checks made on them, and the reviews made before it was built. Everything was gathered on 2026-10-03. The design is in `docs/superpowers/specs/2026-10-03-periodic-table-design.md`; where a file here disagrees with it, the spec stands.

Nothing in this folder is loaded by the app. `npm run build:data` reads the saved downloads and `decisions.json` and writes `src/chem-data/periodic-table.json`, `src/chem-data/element-index.json` and the periodic table's entries in `src/chem-data/sources.json`. The build stops, and writes nothing, on anything in its inputs that it does not recognise.

## Files

| File | What it is | Written by |
| --- | --- | --- |
| `pubchem-periodic-table.json` | PubChem's periodic table download, as received: 118 rows, 17 columns. Never edited. | Downloaded |
| `sources/` | Saved copies of the other sources: CIAAW's abridged standard atomic weights and its list of the most stable isotopes, NIST's ground states and ionization energies, two extracts of PubChem's 118 element pages, the unit labels of PubChem's table page, and one Wikipedia data page. `sources/MANIFEST.json` lists each copy with its address and retrieval date, including copies that were read and are not kept. `sources/README.md` gives the attribution the Wikipedia copy requires. | Downloaded; the three `pubchem-*` files by `scripts/extract-pubchem-pages.mjs` |
| `decisions.json` | The one authored input: which isotope each of the 34 isotope masses belongs to and whether it is an estimate, which covalent radius is shown where the source lists more than one (carbon, manganese, iron, cobalt), and the notes shown on the element cards, each with the row it qualifies and the source that supports it. | By hand |
| `units.md` | The unit and meaning of every column of the download, read from PubChem's own page, and which source PubChem takes each column from. | Reviewer, before the build |
| `cross-check.md` | The comparison of the download with CIAAW, NIST and PubChem's own element pages, what was decided about each finding, and the values that stay unresolved. Do not edit it: run `npm run cross-check`. | `scripts/cross-check-periodic-table.mjs` |
| `cross-check-recorded.md` | Comparisons made once, against sources that are not kept. The script copies it into the report unchanged as section 9. | By hand, from the first report |
| `chemistry-review.md` | Review of the spec and plan by a chemistry reviewer: position rules, shell counts, trends, categories, drafted descriptions, card caveats. | Reviewer, before the build |
| `build-review.md` | Review of the plan against the existing code: card reuse, the route, the search, keyboard and ARIA design, layout measurements, colours. | Reviewer, before the build |
| `review-verdicts.md` | A second reviewer's verdict on each change the reviews proposed. Where a correction there disagrees with a review file, the correction stands. | Reviewer, before the build |

Three things to know when reading the review files:

- They were written by AI reviewers before anything was built, and they describe a plan that was then revised. They are kept as the record of why the spec says what it says, not as a description of the app.
- `units.md`, `chemistry-review.md` and `build-review.md` refer to scripts, a prototype, screenshots and folders of evidence (`out/`, `pugview/`, `ext/`, `proto/`, `browser/`, `colour/`). Those were working files and are not in this repository. What is kept is listed in `sources/MANIFEST.json`.
- Two decisions of the project owner, made after the reviews, override what they recommend. Lanthanum and actinium are in the d block and in group 3, with cerium to lutetium and thorium to lawrencium as the f block (the reviews call this "rule B", and their own position tables assume the other rule). The element card sits below the table at every width.

The scripts are in `scripts/`: `build-chem-data.mjs` (the build), `periodic-table-lib.mjs` (the parsers and checks both scripts share), `cross-check-periodic-table.mjs` and `cross-check-analyse.mjs` (the report), and `extract-pubchem-pages.mjs` (reduces PubChem's raw element pages and the script of its table page to the three `pubchem-*` files; the raw downloads are not kept, so it can only be run again by someone who downloads them).

## Units

One table in the build script fixes the unit of every quantity; the schema and the tests hold every stored quantity to it.

| Field | Unit | Where the unit was read |
| --- | --- | --- |
| `atomicMass` | u | PubChem's page prints "Atomic Mass, u". A standard atomic weight is a ratio with no unit; the card labels the row "Atomic mass (standard atomic weight)" for that reason. |
| `electronegativity` | none | Pauling scale. The only quantity with an empty unit. |
| `covalentRadius` | pm | PubChem's element pages print "31(5) pm (Covalent)". |
| `vdwRadius` | pm | PubChem's page prints "Atomic Radius (van der Waals), pm". The download calls the column `AtomicRadius`. |
| `ionizationEnergy` | eV | NIST's file is requested in eV. |
| `electronAffinity` | eV | PubChem's page prints "Electron Affinity, eV". Positive means energy is released. |
| `meltingPoint`, `boilingPoint` | K | PubChem's page prints "Melting Point, K" and "Boiling Point, K". |
| `density` | g/cm³ | PubChem's page prints "Density, g/cm³". No source states the temperature. The gas values equal the ideal-gas density at 0 °C and 1 atm within 2%, which a test repeats; the notes on the gases say the conditions were worked out from the value. |

`units.md` section 2 holds the evidence for each row. Numbers are stored twice: as a number, and as the text the source prints, which is what the app shows ("1" for calcium's electronegativity, "1.0080" for hydrogen's atomic weight).

## The two kinds of atomic mass

PubChem's `AtomicMass` column holds two different things, so the record has a `kind`.

- **Standard atomic weight, 84 elements,** from CIAAW's Abridged Standard Atomic Weights 2024, not from PubChem. Each row of the saved table reads "value ± uncertainty". It gives one value even for the elements whose full standard atomic weight is an interval. The value is stored as printed ("6.94", "207.2"); the uncertainty and CIAAW's footnote letters are not kept. PubChem's own column differs from it for lithium (7.0) and sulfur (32.07).
- **Mass of one isotope, 34 elements** (technetium, promethium, polonium to actinium, neptunium to oganesson), from PubChem, because CIAAW gives these elements no standard atomic weight. `decisions.json` names the isotope; the build fails if the mass does not round to that mass number, or if the 34 are not exactly the elements CIAAW leaves empty. For the 16 from lawrencium to oganesson the mass is an estimate and the card says so. For darmstadtium, copernicium and oganesson the isotope is not the one CIAAW lists as most stable, and each carries a note.

Bismuth, thorium, protactinium and uranium have no stable isotope but do have a standard atomic weight, and are among the 84.

## Which source fills which field

The source id is the one in `src/chem-data/sources.json`, where the full citation is.

| Field | Source id | Elements | Where that source says it comes from |
| --- | --- | --- | --- |
| Atomic number, symbol, name | `pubchem-periodic-table` | 118 | |
| Category | `pubchem-periodic-table` | 118 | PubChem's own grouping |
| Electron configuration | `pubchem-periodic-table` | 118 (9 marked predicted, 1 calculated) | Los Alamos National Laboratory |
| State at 25 °C | `pubchem-periodic-table` | 118 (9 worded "expected") | Jefferson Lab |
| Oxidation states | `pubchem-periodic-table` | 117 (none for nihonium) | Jefferson Lab; Los Alamos for the heaviest |
| Year discovered | `pubchem-periodic-table` | 118 (13 "Ancient") | Not attributed |
| Standard atomic weight | `ciaaw-abridged-2024` | 84 | |
| Mass of one isotope | `pubchem-periodic-table` | 34 | IAEA Atomic Mass Data Center (AME2020) |
| First ionization energy | `nist-asd-ie-all` | 1 to 108 (98 measured, 7 semi-empirical, 3 theoretical, as NIST marks them) | |
| Electronegativity | `pubchem-periodic-table` | 95 | Allred 1961 for 93; francium and lawrencium have no source |
| Covalent radius | `pubchem-element-pages` | 1 to 96 | Cordero et al. 2008 |
| Van der Waals radius | `pubchem-periodic-table` | 99 | Los Alamos, which names no study |
| Electron affinity | `pubchem-periodic-table` | 57 | Myers 1990 |
| Melting point, boiling point, density | `pubchem-periodic-table` | 103, 93, 96 | Jefferson Lab |

PubChem's own ionization energy column and its colour column are not used.

A field its source leaves empty is stored as absent and shown as "no value listed". It is never shown as zero and never called "not measured": for 18 elements PubChem leaves the electron affinity empty because its page gives 0 eV, and each of those carries a note.

The generated table holds 107 notes on 57 elements, from 56 authored entries. Each cites its own source: PubChem's element pages (87), PubChem's table (11), the CRC and Lange handbooks as transcribed on the kept Wikipedia page (5), CIAAW's list of most stable isotopes (3) and NIST (1).

The sentences that are not values (the descriptions of the groups, periods and blocks, the note on group 3, the legend notes, and the general sentences on the card) are authored in `src/chem-data/periodic.ts` and `src/chem-data/periodicCard.ts`. Each stores what supports it beside it, in a `support` field that the app does not show: where the passage is and what it establishes, or, for PubChem, the line read (see the known limits below). Besides the sources above they cite OpenStax Chemistry 2e, the IUPAC Red Book 2005, IUPAC's periodic table page, the Royal Society of Chemistry's periodic table, a 2021 IUPAC task group report, and Mantina et al. 2009.

## What could not be verified

From `units.md` section 10 and `cross-check.md` sections 9 and 10, which give the detail:

- **Only two columns were compared with a primary source:** atomic weight with CIAAW and first ionization energy with NIST, and the app shows CIAAW's and NIST's values for those. Configurations were compared with NIST for elements 1 to 108; lawrencium differs and carries a note. NIST has nothing for 109 to 118.
- **Melting point, boiling point, density, electronegativity and van der Waals radius** were compared once, on 2026-10-03, with Wikipedia's transcriptions of handbooks. Only the densities page is kept. The electronegativity transcription shares its origin with PubChem's column, so its agreement confirms little.
- **Electron affinity, covalent radius, oxidation states and year discovered** were not compared value by value with any independent source. That the covalent radii on PubChem's pages are Cordero's was confirmed for 11 elements only. Eight of the 96 radii are printed there with no uncertainty (helium, neon, promethium, astatine, radon, francium, actinium, protactinium), among them both ends of the colour scale; why was not found out, and each carries a note asking the reader to treat it as an estimate. That the electron affinities are Myers's 1990 values rests on PubChem's attribution; they are dated (fluorine is 3.339 eV here and about 3.401 eV in current compilations).
- **The original papers were not read:** Cordero 2008, Allred 1961, Myers 1990, Bondi 1964, and the CRC and Lange handbooks. Mantina 2009 was read.
- **Jefferson Lab's and Los Alamos's own pages** were read only as PubChem carries them and from archived copies. Where Los Alamos took its van der Waals radii from is not known; about half match no published set they were compared with.
- **41 values are listed as unresolved** at the top of `cross-check.md`: six single values far from other tabulations, lawrencium's configuration, two expected states that a boiling point on PubChem's own page contradicts and one that it leaves open (copernicium), and values PubChem gives as plain facts that are predictions, estimates or untraced (six melting points, twelve states, two electronegativities, three isotope choices, eight covalent radii). Each is shown as PubChem has it, with a note on the card. No PubChem page says in words that the six melting points are estimates; that reading is the cross-check's.
- **The pages the descriptions cite are not saved.** The passages were read on 2026-10-03. `support` gives lines of PubChem's pages as they read, and quotes no other source. For every other source (OpenStax Chemistry 2e, the IUPAC Red Book, IUPAC's periodic table page and its task group's 2021 report, the Royal Society of Chemistry's pages, Mantina 2009, the help page of NIST's ionization energy form) it gives the address, the heading or section, and one sentence in this project's own words on what the passage establishes. Until 2026-10-17 it quoted the passages of OpenStax Chemistry 2e; so that the repository makes no claim about the book's licence, they were then put in this form, each sentence written from the quotation as it was stored, without reading the pages again. Nothing checks automatically that a sentence says no more than its passage.
- **Whether PubChem has changed since the download** has not been rechecked.
- **No chemist has reviewed the data, the notes or the descriptions.** The checks were made by script and by AI reviewers.

## Regenerating

    npm run build:data    # rewrites the generated JSON; the molecule files come out byte-identical
    npm run cross-check   # rewrites cross-check.md; a second run gives the same file

PubChem data is provided by the National Library of Medicine (NCBI), which requests acknowledgment. CIAAW's tables are IUPAC's, and NIST's database is NIST's. None of the saved copies is covered by this repository's MIT licence.
