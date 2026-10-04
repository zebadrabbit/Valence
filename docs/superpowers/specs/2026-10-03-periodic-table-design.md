# Periodic Table — Design Spec

2026-10-03. An addition to the molecule explorer described in `2026-10-03-valence-v1-design.md` (the "v1 spec"). Where this spec is silent, the v1 spec's rules apply: sections 4 (architecture), 5.1 (data rule), 11 (UI and accessibility), and 12 (documentation).

## 1. Purpose

An interactive periodic table of all 118 elements inside Explore. A learner can see how the elements are arranged, highlight groups, periods, blocks, and categories, colour the table by a property to see periodic trends, and open any element to read its details and find the library molecules that contain it.

Success: a learner can open the table, pick "colour by electronegativity" and see the trend across a period, open fluorine, read its values with their source, and follow a link to a molecule that contains it, by pointer or by keyboard alone.

## 2. Decisions that differ from the v1 spec

| Topic | v1 spec | This spec | Why |
| --- | --- | --- | --- |
| Element pages | Out of scope | In scope | Requested after the explorer was built |
| Data rule | Each value hand-curated from its best source | The 118-element table is taken from one cited source by script and cross-checked | About 1,800 values cannot be hand-curated; a single source is consistent and honest about what it is |
| Explorer navigation | One library page | Explore holds two pages: molecules and the periodic table | The table needs its own page |

## 3. Out of scope

Isotopes; discovery history beyond the year; photographs; emission spectra beyond hydrogen and xenon; a 32-column layout; property data from any source other than those named in section 5; editing or comparing elements side by side.

## 4. Pages and navigation

- `#/explore/elements`: the periodic table.
- `#/explore/elements/:symbol`: the same page with that element selected (for example `#/explore/elements/Xe`). An unknown symbol shows the existing not-found page.
- The Explore library page links to the table, and the table links back to the library.
- The command palette lists all 118 elements by name and symbol.
- Every atom card in the molecule explorer links to its element's page.

The table's data and code load lazily and stay out of the main bundle.

## 5. Data

### 5.1 Source

All 118 records come from the PubChem periodic table (`https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON`), downloaded once and committed as `docs/research/periodic-table/pubchem-periodic-table.json`. The existing build script turns it into `src/chem-data/periodic-table.json`. Nothing is fetched at runtime.

Fields taken, each stored with the source's own text beside the parsed number: atomic number, symbol, name, atomic mass, electron configuration, electronegativity, atomic radius, first ionization energy, electron affinity, oxidation states, standard state, melting point, boiling point, density, category, and year discovered. Units are those PubChem documents for each field; the build script records the unit with the field, and the plan confirms each unit against PubChem's documentation before any value is displayed.

Rules:

- A field PubChem leaves empty is stored as absent and shown as "not measured" (or "not known" for the year). It is never shown as zero or blank.
- Text PubChem marks as predicted or expected (for example "Expected to be a Gas", a configuration ending "(predicted)") keeps that marking on screen.
- The record carries one `sourceId`. The build fails if the download does not hold exactly 118 rows numbered 1 to 118, if a symbol or name is empty, or if a number does not parse.

### 5.2 The 11 elements already in the app

Hydrogen, boron, carbon, nitrogen, oxygen, fluorine, sodium, phosphorus, sulfur, chlorine, and xenon already have values in `src/chem-data/elements.json` from individually chosen sources. On their element card, a value that exists there is shown from there, with its own source. The card says, once, that these elements have individually sourced values. Trend colouring uses the PubChem value for every element, so one scale is never built from two sources.

### 5.3 Position: group, period, block

PubChem does not give these. A pure function of atomic number returns `{ period, group, block, row, column }`:

- **Period** 1 to 7 from the atomic number.
- **Group** 1 to 18 for main-table elements. Lanthanides (57 to 71) and actinides (89 to 103) have no group number.
- **Block** s, p, d, or f. Helium is in group 18 and in the s block.
- **Row and column** for drawing: lanthanides and actinides occupy two detached rows beneath the main table, lanthanum and actinium first. The two group 3 cells below yttrium show a marker pointing to those rows.

This layout is the common textbook one. The page says that the placement of group 3 is a convention IUPAC has not settled.

### 5.4 Category

PubChem's ten categories are used as given: alkali metal, alkaline earth metal, transition metal, post-transition metal, metalloid, nonmetal, halogen, noble gas, lanthanide, actinide. The legend is headed "one common classification"; the page notes that textbooks differ on the metalloids.

### 5.5 Cross-check

A script compares, for all 118 elements, PubChem's atomic mass with the CIAAW abridged standard atomic weights and PubChem's first ionization energy with the NIST Atomic Spectra Database. It writes a report listing every disagreement beyond rounding. The report is committed. No value is changed because of it without a recorded decision; an unresolved disagreement is shown on the element card as a note.

### 5.6 Shape

**Periodic element:** `atomicNumber`, `symbol`, `name`, `category`, `configuration` (text, with a `predicted` flag), `standardState` (text, with an `expected` flag), `oxidationStates` (text), `yearDiscovered` (number or "Ancient", or absent), and optional cited numbers with their published text and unit for `atomicMass`, `electronegativity`, `atomicRadius`, `ionizationEnergy`, `electronAffinity`, `meltingPoint`, `boilingPoint`, `density`; `sourceId`. The schema is strict.

**Group, period, and block descriptions:** short authored sentences on what the members share (for example group 17, the halogens), stored in `src/chem-data` with a source each.

## 6. The table

- **Cells** show atomic number, symbol, and name. A cell is a link to the element's page.
- **Colour by category** (default): each cell takes its category's colour. The legend lists the ten categories; choosing one outlines its elements and dims the others.
- **Colour by property:** electronegativity, atomic radius, first ionization energy, melting point, or density. Cells are shaded on a single-hue scale from the lowest to the highest value present; the value is printed in the cell; a legend gives the scale's ends and unit. Elements without a value are hatched and read "not measured".
- **Highlight** a group (1 to 18), a period (1 to 7), or a block (s, p, d, f): its cells are outlined, the rest dimmed, and its description is shown.
- Colour is never the only signal: categories are named in the legend and in each cell's accessible name; highlights use an outline; trend values are printed.
- The colour palettes are chosen to be distinguishable under the common forms of colour blindness and readable in both themes; each is a model parameter with a rationale, not chemistry data.

## 7. The element card

Shown beside the table on a wide screen and below it otherwise, for the selected element:

- Name, symbol, atomic number, atomic mass.
- Group, period, block, and category.
- Electron configuration, and a Bohr diagram with the shell counts as text. Shell counts are derived from the configuration by a pure function; a predicted configuration gives a diagram labelled predicted.
- Electronegativity, atomic radius, first ionization energy, electron affinity, oxidation states.
- Standard state, melting point, boiling point, density, year discovered.
- "In the molecule library": links to every library molecule containing the element, or a line saying none does.
- The emission spectrum, for hydrogen and xenon.
- A Sources control listing the citation for every value shown.

Every number is printed in the digits its source publishes, with its unit.

## 8. Accessibility

- The table is one keyboard stop. Arrow keys move between cells, following the drawn layout including the detached rows; Home and End go to the ends of a row; Enter opens the element.
- Each cell's accessible name gives the element's name, atomic number, category, and, when a property is shown, its value.
- The legend controls, the colour-by control, and the highlight controls are ordinary labelled controls.
- A text list of all elements, in atomic-number order, is available as an alternative to the grid.
- Narrower than 768 px, the table scrolls sideways inside its own container and the page itself never scrolls sideways.
- Nothing animates when reduced motion is on.

## 9. Testing

Pure functions with Vitest tests, written before the UI that uses them:

- Position: hydrogen (period 1, group 1, s), helium (1, 18, s), boron (2, 13, p), scandium (4, 3, d), lanthanum (6, no group, f row), lutetium, hafnium (6, 4, d), oganesson (7, 18, p); every element has a unique row and column; each period holds the right number of elements.
- Shell counts from configurations: hydrogen, carbon, chlorine, iron, copper, xenon, and a predicted superheavy configuration.
- Trend scale: lowest and highest map to the ends; a missing value maps to "not measured".
- Arrow-key navigation: from each edge cell and across the gap to the detached rows.
- Validator: 118 records, unique symbols, published text parses to the stored number, every `sourceId` exists.
- The data: registry test pins the count, the ten categories, and a sample of values against the committed download.

The phase is done when the automated tests pass and a headless-browser checklist passes in both themes at 1366×768 and 400×800: every element opens; each colouring and highlight works; keyboard-only use reaches every element; no console errors; no network requests after load; no sideways page scroll. An independent chemistry and accessibility review follows before merge.

## 10. Documentation

`docs/for-institutions.md` gains a paragraph in the faculty section: the periodic table's values come from PubChem as a single source, with a cross-check report, and the conventions chosen (group 3 placement, category scheme). No compliance claims.
