# Periodic Table — Design Spec

2026-10-03, revised the same day after a verification run (see "Revision" at the end). An addition to the molecule explorer described in `2026-10-03-valence-v1-design.md` (the "v1 spec"). Where this spec is silent, the v1 spec's rules apply: sections 4 (architecture), 5.1 (data rule), 11 (UI and accessibility), and 12 (documentation).

## 1. Purpose

An interactive periodic table of all 118 elements inside Explore. A learner can see how the elements are arranged, highlight groups, periods, blocks, and categories, colour the table by a property to see periodic trends, and open any element to read its details and find the library molecules that contain it.

Success: a learner can open the table, pick "colour by electronegativity" and see the trend across a period, open fluorine, read its values with their sources, and follow a link to a molecule that contains it, by pointer or by keyboard alone.

## 2. Decisions that differ from the v1 spec

| Topic | v1 spec | This spec | Why |
| --- | --- | --- | --- |
| Element pages | Out of scope | In scope | Requested after the explorer was built |
| Data rule | Each value hand-curated from its best source | The table is built by script from saved downloads of named sources, cross-checked, with authored notes where a value needs one | About 1,800 values cannot be hand-curated |
| Explorer navigation | One library page | Explore holds two pages: molecules and the periodic table | The table needs its own page |

## 3. Out of scope

Isotopes beyond naming the one whose mass is shown; discovery history beyond the year and its notes; photographs; emission lines outside 400 to 700 nm or of an ion; a 32-column layout; comparing elements side by side.

## 4. Pages and navigation

- `#/explore/elements`: the periodic table.
- `#/explore/elements/:symbol`: the same page with that element selected (for example `#/explore/elements/Xe`). The symbol is matched without regard to case. An unknown symbol shows the existing not-found page.
- Choosing an element replaces the address, so Back leaves the table in one step.
- The Explore library page links to the table, and the table links back to the library.
- The command palette lists the table page and all 118 elements by name and symbol, after molecules, labs, and pages.
- Every atom card in the molecule explorer links to its element's page.

The table's data and code load lazily and stay out of the main bundle.

## 5. Data

### 5.1 Sources

Every source is a saved download committed under `docs/research/periodic-table/`, turned into `src/chem-data/periodic-table.json` by the existing build script. Nothing is fetched at runtime.

| Field | Source | Coverage |
| --- | --- | --- |
| Atomic number, symbol, name, category, electron configuration, standard state, oxidation states, year discovered | PubChem periodic table | 118 |
| Standard atomic weight | CIAAW abridged standard atomic weights | 84 |
| Mass of one isotope, for elements with no standard atomic weight | PubChem periodic table | 34 |
| First ionization energy, eV | NIST Atomic Spectra Database, with NIST's flag (measured, semi-empirical, theoretical) | 1 to 108 |
| Electronegativity (Pauling scale) | PubChem periodic table | 95 |
| Covalent radius, pm | Cordero et al. 2008, as carried on PubChem's element pages | 1 to 96 |
| Van der Waals radius, pm | PubChem periodic table (its values come from more than one study) | 99 |
| Electron affinity, eV | PubChem periodic table (from a 1990 compilation) | 57 |
| Melting point and boiling point, K; density, g/cm³ | PubChem periodic table | 103, 93, 96 |

Units were read from PubChem's own page on 2026-10-03 and are recorded in `docs/research/periodic-table/units.md`.

Rules:

- Each numeric value is stored with the source's own text beside the parsed number, and its unit. Numbers print in the digits the source publishes; a source that prints `1` for calcium's electronegativity is shown as `1`. The one exception is a cell of the table too narrow for a value (section 6).
- A field its source leaves empty is stored as absent and shown as "no value listed". It is never shown as zero or blank, and never called "not measured", because an empty cell in these sources does not always mean that.
- A configuration PubChem marks "(predicted)" or "(calculated)" keeps that word on screen. A standard state it words "Expected to be a …" is shown as expected.
- **Atomic mass has two kinds.** The 84 elements with a standard atomic weight show it from CIAAW. The other 34 (technetium, promethium, polonium to actinium, neptunium to oganesson) show the mass PubChem prints, labelled "mass of the isotope X-A", with a sentence that the element has no standard atomic weight, and "estimated" from lawrencium on. Bismuth, thorium, protactinium, and uranium have no stable isotope but do have a standard atomic weight and are among the 84.
- Where Cordero gives more than one covalent radius (carbon by hybridization; manganese, iron, and cobalt by spin state), the first listed is used and the card says so.
- Oxidation states are shown as PubChem lists them, headed "Common oxidation states (PubChem's list, not complete)", with true minus signs. States PubChem's element pages mark as predicted are noted as such.
- The build fails if a download does not hold the expected rows, if a symbol, name, or year is empty, if a number does not parse, or if a configuration carries an unknown marking.

### 5.2 Notes

A record may carry notes: short authored sentences, each tied to the row it qualifies and to a source. They are written in one committed input file, `docs/research/periodic-table/decisions.json`, never in generated JSON. Notes are required for, at least:

- helium's melting point (solid only under pressure); carbon's melting and boiling points (it turns from solid straight to gas at ordinary pressure); arsenic's melting point being above its boiling point (measured under pressure);
- the density of gases (at 0 °C and atmospheric pressure, for the two-atom gas where that applies);
- years that are not the year the element was isolated: aluminium and calcium ("Ancient" because their compounds were known), fluorine (1670 is the first recorded use of a compound; isolated 1886), silicon;
- xenon and krypton's oxidation states (the list shows 0 although compounds such as XeF₄ exist);
- lawrencium's configuration (NIST gives a different ground state);
- polonium and astatine's categories (PubChem's own element pages class them differently);
- every disagreement the cross-check leaves unresolved.

### 5.3 The 11 elements already in the app

Hydrogen, boron, carbon, nitrogen, oxygen, fluorine, sodium, phosphorus, sulfur, chlorine, and xenon also have values in `src/chem-data/elements.json`. With the sourcing above, their atomic weight, first ionization energy, and covalent radius come from the same sources in both places. Where a card value still differs from the curated one (the van der Waals radii of hydrogen and fluorine), the card shows the table's value and one sentence gives the curated value and its source. The emission spectra of hydrogen, sodium and xenon are the ones the curated records hold: hydrogen's and sodium's written by hand and unchanged, xenon's picked by the rule of section 5.8 since 2026-10-08. Section 5.8 says where every other element's comes from.

### 5.4 Position: group, period, block

A pure function of atomic number returns `{ period, group, block, row, column }`.

- **Period** 1 to 7.
- **Group** 1 to 18. Lanthanum and actinium are in group 3, below yttrium. Cerium to lutetium and thorium to lawrencium have no group number.
- **Block:** s (14 elements), p (36), d (40, groups 3 to 12), f (28: cerium to lutetium and thorium to lawrencium). Helium is in group 18 and in the s block.
- **Drawing:** the main table has seven rows of 18 columns. The f block is drawn as two rows beneath it, cerium to lutetium and thorium to lawrencium, under columns 4 to 17. A marker beside lanthanum and beside actinium points to those rows.

The page says, in one note, that which elements belong in group 3 is unsettled: this table follows the convention of OpenStax Chemistry and the Royal Society of Chemistry's table, and IUPAC has not ruled.

### 5.5 Category

PubChem's ten categories are used as given, with no overrides. The legend is headed "Chemical family (PubChem's grouping)", shows "Nonmetal" as "Other nonmetals", and carries these notes: fluorine, chlorine, bromine, iodine and the noble gases helium to radon are nonmetals too, listed under their family names; textbooks differ on the metalloids; group 12 and elements 109 to 118 are placed by position, their chemistry being little known.

### 5.6 Cross-check

A script compares the saved sources with each other and writes `docs/research/periodic-table/cross-check.md`. Outcome on 2026-10-03:

- **Atomic weight:** PubChem agrees with CIAAW for 80 of 84 elements; argon and iron are rounding ties; lithium (7.0 against 6.94) and sulfur (32.07 against 32.06) differ. CIAAW's values are shown.
- **First ionization energy:** PubChem agrees with NIST for 76 of 102 comparable elements and differs for 26, nine of them by 0.1 eV or more. NIST's values are shown.
- **Configuration:** PubChem agrees with NIST's ground state for 107 of 108 elements; lawrencium differs. Elements 109 to 118 could not be checked.
- **Electronegativity, melting point, boiling point, density:** compared only with secondary transcriptions; outliers are listed in the report and noted on the card.

No value is changed because of the report without an entry in `decisions.json`.

### 5.7 Shape

**Periodic element:** `atomicNumber`, `symbol`, `name`, `category`, `configuration` (text, with an optional qualifier "predicted" or "calculated"), `standardState` (solid, liquid, or gas, with an `expected` flag), `oxidationStates` (text, optional), `yearDiscovered` (a number or "Ancient"), `atomicMass` (a quantity with its kind: standard atomic weight, or isotope mass with the mass number and an `estimated` flag), optional quantities `electronegativity`, `covalentRadius`, `vdwRadius`, `ionizationEnergy` (with NIST's flag), `electronAffinity`, `meltingPoint`, `boilingPoint`, `density`, and optional `notes` (each with the row it qualifies, its text, and a source). Every quantity has a value, the published text, a unit, and a source. The schema is strict.

**Group, period, and block descriptions:** short authored sentences on what the members share, each with the sources that support it and the supporting passage stored beside it for review. A passage is quoted only where the source's licence allows it (OpenStax, CC BY 4.0, whose citations carry the licence); for any other source the stored support is where the passage is and one sentence, in this project's words, on what it establishes. Group 1's description says hydrogen is in the group but is a nonmetal, not an alkali metal.

### 5.8 Emission spectra

Added on 2026-10-08. The card of every element shows an emission spectrum or one sentence that says why it shows none. The research record is `docs/research/emission-spectra/`.

- **Source.** The NIST Atomic Spectra Database's lines query, asked once for each element for the neutral atom's observed wavelengths in air from 400 to 700 nm with relative intensities, and saved as returned. For the 20 elements with no lines there, every line the database lists was asked for too.
- **Rule.** Of the lines NIST gives a numeric relative intensity, the six with the largest, and every line that ties with the sixth; all of them where there are six or fewer. The build applies it from the saved responses (`scripts/emission-lib.mjs`). Ties are never cut, so some elements show more than six lines, up to 49.
- **Outcome.** 97 elements have a spectrum: 95 by the rule, and hydrogen and sodium as written by hand before (section 5.3). 21 have a sentence: francium (NIST lists 87 lines in the range and no intensity for any), astatine and fermium (lines, but none of the neutral atom in the range), and mendelevium to oganesson (no lines).
- **Xenon.** Its first six lines, chosen by hand, were stored with a sentence that called them the six strongest by relative intensity. The saved response showed they were the six of largest transition probability. Resolved on 2026-10-08 by the owner's decision: the rule applies to xenon like every other element, on this card and on the molecule explorer's atom card, which reads the same spectrum from the curated record. The research records of both phases keep the history.
- **Storage.** `src/chem-data/emission-spectra.json`, a generated file of its own with one entry for each element in the shape the curated records use for a spectrum. Only the element card reads it, so it loads with the periodic table and with no other page.
- **What the card says.** The sentence after "Lines shown:" states the rule as it came out for the element: how many lines are shown, of how many NIST rates, and how many more it lists with no intensity. One note, the same on every card, says that the lines are those of the single neutral atom as a database lists them; that a real lamp or flame can look different because ions and molecules give light too; that the strip does not show how strong a line is; and that NIST's relative intensities are rough, depend on the lamp, and compare the lines of one element only. It cites NIST's help page and one paper, of which the abstract was read.

## 6. The table

- **Cells** show atomic number and symbol always, and the element's name when the table is wide enough for names to fit. At narrower widths a readout shows the name and details of the focused or hovered element. A cell is a link to the element's page.
- **Colour by category** (default): each cell takes its category's colour. Choosing a legend entry highlights its elements.
- **Colour by property:** electronegativity, covalent radius, first ionization energy, melting point, or density. Cells are shaded on a linear single-hue scale from the lowest to the highest value present; the value is printed in the cell; a legend gives the scale's ends and unit. A value with more digits than its cell has room for (NIST publishes up to 14 for an ionization energy) is printed in the cell rounded, half up, to the most digits that fit: never with a digit the source does not publish, and never cut short or with an ellipsis where at least the rounded value fits, which it does for every value at the cell and type sizes the stylesheet sets. Where a minimum font size set in the browser (15 px or more) leaves no room even for the rounded value, the cell cuts it; the stylesheet asks for an ellipsis, but at those sizes the line itself is cut and the mark is not seen. This is a known limit. The legend says so once, and the cell's accessible name, the readout, the text list and the element card keep the published digits. Elements without a value are hatched and read "no value listed". The melting-point legend notes that its two ends (helium, carbon) are not ordinary-pressure melting points; the density legend notes that gases sit at the bottom of the scale.
- **Highlight** a group (1 to 18), a period (1 to 7), or a block (s, p, d, f): its cells take a solid border, the rest lose their fill and take a dashed border, and the description is shown. Highlighted cells are never marked by opacity, which would fail contrast.
- Colour is never the only signal: categories are named in the legend and in each cell's accessible name; highlights use borders; trend values are printed.
- The palettes are model parameters with a rationale, not chemistry data. Their starting values are computed for contrast and simulated colour blindness and are accepted by eye in both themes before merge.

## 7. The element card

Shown below the table at every width, across the page, with its sections side by side where there is room:

- Name, symbol, atomic number, atomic mass (of whichever kind applies).
- Group, period, block, and category.
- Electron configuration, and the shell diagram with the shell counts as text. Shell counts are derived from the configuration by a pure function; a predicted or calculated configuration gives a diagram labelled so.
- Electronegativity, covalent radius, van der Waals radius (with a sentence on what it is and that the values come from more than one study), first ionization energy (with NIST's flag where it is not measured), electron affinity (with a sentence on its sign and that the values are from a 1990 compilation), common oxidation states.
- Standard state, melting point, boiling point, density, year discovered (headed "as PubChem lists it").
- The element's notes, each beside the row it qualifies.
- "In the molecule library": links to every library molecule containing the element, or a line saying none does.
- The emission spectrum, for the 97 elements that have one (section 5.8), with the sentence that says which lines are shown and a note, the same on every card, on what the strip leaves out. Where lines are too close to draw apart, as sodium's two D lines are, a sentence stored with the data says so under the strip. Each of the other 21 elements has one sentence in its place that says what NIST lists for it, and no strip.
- A Sources control listing the citation for every value shown.

## 8. Accessibility

- The main table and the f-block rows are two native tables, each a grid, sharing one keyboard stop. Arrow keys move to the nearest element in that direction, across the gap between the two; Home and End go to the ends of a row; Enter opens the element. Group and period headers label the main table's columns and rows.
- Opening an element from the table keeps focus on its cell, and a status line announces the selection. This is the one exception to the app's rule that focus moves to the page heading after navigation.
- Each cell's accessible name gives the element's name, symbol, atomic number, category, and, when a property is shown, its value and unit or "no value listed".
- The colour-by control and the highlight control are native selects; legend entries are toggle buttons. A status line names the highlighted set and its size.
- A text list of all elements in atomic-number order, with the chosen property's value beside each name, is available as an alternative to the grid.
- When the table does not fit at its minimum cell size it scrolls sideways inside its own container; the page itself never scrolls sideways.
- Nothing animates when reduced motion is on.

Not tested and stated as such in the documentation: any screen reader used by a person, and browsers other than Chromium.

## 9. Testing

Pure functions with Vitest tests, written before the UI that uses them:

- Position: hydrogen, helium, boron, scandium, lanthanum (period 6, group 3, d), cerium and lutetium (period 6, no group, f), hafnium, actinium, thorium, lawrencium, oganesson; every element has a unique row and column; period sizes 2, 8, 8, 18, 18, 32, 32; block sizes s 14, p 36, d 40, f 28.
- Shell counts from configurations, including a spaced core, no core, subshells out of shell order, and a marked configuration; all 118 sum to the atomic number.
- Trend scale: lowest and highest map to the ends; a missing value maps to "no value listed" and is left out of the range.
- Cell values: a value that fits is printed as published; a longer one is rounded half up on its published digits, giving up a place when rounding carries; none is rounded to zero; every value in the table fits the smallest cell.
- Movement: across the gap, at every edge, and that each move can be reversed.
- Validator and registry: 118 records, unique symbols, published text parses to the stored number, every source exists, the 84 and 34 mass kinds, the marked configurations, and a sample of values against the saved downloads.
- Card rows: which source each row comes from, the notes, and true minus signs.

The phase is done when the automated tests pass and a headless-browser checklist passes in both themes at 1366×768 and 400×800: every element opens; each colouring and highlight works; keyboard-only use reaches every element; no console errors; no network requests after load; no sideways page scroll. An independent chemistry and accessibility review follows before merge.

## 10. Documentation

`docs/for-institutions.md` gains, in the faculty section: where each kind of value comes from, the cross-check outcome, the conventions chosen (group 3 and the f block, PubChem's categories), and the known limits; and in the accessibility section, the table's keyboard model and what was not tested. No compliance claims. The About page acknowledges PubChem (National Library of Medicine), CIAAW, and NIST.

## Revision

Revised after a verification run whose record is in `docs/research/periodic-table/` (`units.md`, `cross-check.md`, `chemistry-review.md`, `build-review.md`, `review-verdicts.md`). Changes from the first version, each decided by the project owner or forced by the evidence:

- Colour by covalent radius, not PubChem's van der Waals column, which does not show the textbook trend.
- Atomic weights from CIAAW and first ionization energies from NIST, in place of a single source.
- Lanthanum and actinium are d block and sit in group 3; the f block is 14 wide.
- The element card sits below the table at every width.
- "No value listed" replaces "not measured"; atomic mass is two kinds; notes are part of the data.
- Names appear in cells only when they fit.
