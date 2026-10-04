# Periodic Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An interactive periodic table of all 118 elements inside Explore, with category and trend colouring, group, period and block highlighting, an element card, and links to and from the molecule library.

**Architecture:** Saved downloads of PubChem, CIAAW, and NIST under `docs/research/periodic-table/` are turned into `src/chem-data/periodic-table.json` by the existing build script, together with one authored `decisions.json` that holds notes and choices. Pure functions in `src/chem-data/` give each element its position, shell counts, and descriptions. The page lives in `src/app/explore/elements/`, is plain DOM (no 3D), loads lazily, and reuses the explorer's cards after two small refactors.

**Tech Stack:** unchanged (TypeScript 6, React 19, Tailwind 4, zod 4, Vitest 5). No new dependency.

**Spec:** `docs/superpowers/specs/2026-10-03-periodic-table-design.md` (revised). The v1 spec's sections 4, 5.1, 11, and 12 also bind.

**Research record** (read the parts your task names before starting): `docs/research/periodic-table/`

| File | Holds |
| --- | --- |
| `pubchem-periodic-table.json` | The table download, as received |
| `units.md` | Units and meaning of every column, confirmed on PubChem's page |
| `cross-check.md`, `prototype/*.mjs`, `sources/` | The cross-check report, the scripts that produced it, and the saved CIAAW, NIST, and PubChem element-page copies |
| `chemistry-review.md` | Position rules, shell parsing, trends, categories, drafted descriptions (section 5.4), card caveats (section 6) |
| `build-review.md` | Card reuse (1.1), palette index (1.3), ARIA design (2), the `move()` rule (3), layout measurements (4), palette values (5) |
| `review-verdicts.md` | Each proposed change with the second reviewer's verdict. **Where a correction there disagrees with a review file, the correction stands**, and where either disagrees with the spec, the spec stands |

Two owner decisions made after the reviews override what they recommend: lanthanum and actinium are d block and sit in group 3 (the reviews call this "rule B"), and the element card sits below the table at every width.

**Branch:** `periodic-table`.

## How this plan is written

Earlier phases showed that plan code written without being run is where defects come from. This plan fixes interfaces, data rules, exact test cases, and done-when checks, and leaves each implementation to be written test-first by its implementer. Every task ends with `npm run lint` and `npm run build` passing and a commit.

## Global Constraints

- `src/chem-data/` never imports React, three, or `src/app/`, and never uses `document`, `window`, `fetch`, or `XMLHttpRequest`. Nothing is fetched at runtime.
- Generated JSON is never edited by hand: change `scripts/build-chem-data.mjs` or its inputs and run `npm run build:data`. After a run, `git status` shows only the intended files changed; the 33 molecule files, `elements.json`, and `mo-diagrams.json` come out byte-identical.
- Notes and choices are authored only in `docs/research/periodic-table/decisions.json`.
- Every displayed value carries a source. An absent value is shown with the single exported constant `NO_VALUE = 'no value listed'`; tests refer to the constant.
- Numbers print in the digits their source publishes, with their unit. Negative numbers and oxidation states use the true minus sign (U+2212), through the existing formatter.
- Colour is never the only signal; dimming never uses opacity. Everything works by keyboard. Nothing animates under reduced motion.
- All schemas are strict. Existing tests are not weakened; the one sanctioned change is the entry count in the palette's search test (Task 6).
- The periodic table's data and code stay out of the main bundle. Baseline on `main` before this work: `index` 368,766 bytes and its preloaded `sources` chunk 116,533 bytes raw.
- The repo will become public: no local paths or personal details. No compliance claims in copy.
- A changed display string that states chemistry is authored in `src/chem-data` or `decisions.json`, not in a component.

## Review Focus

1. **An element with no value for the shown property** (helium's electronegativity, oganesson's density, elements 97 to 118 for covalent radius): hatched, labelled with `NO_VALUE`, left out of the scale's range, still openable. Tasks 1 and 4.
2. **Position of the awkward elements:** helium; lanthanum and actinium in group 3; cerium and thorium starting the detached rows under column 4; hafnium after lanthanum. Task 2.
3. **Configurations the parser must survive:** no core (`1s1`), a space after the core (`[He] 2s2 2p3`), subshells out of shell order (`[Ar]4s1 3d10`), and a marking (`(predicted)`, `(calculated)`). Tasks 1 and 2.
4. **Keyboard movement across the gap** and at edges, and that every move can be reversed. Task 4.
5. **The two kinds of atomic mass:** technetium's card names an isotope and says there is no standard atomic weight; bismuth and uranium do not. Tasks 1 and 5.

## File Structure

| File | Responsibility |
| --- | --- |
| `docs/research/periodic-table/decisions.json` | Authored notes and choices, keyed by symbol |
| `scripts/build-chem-data.mjs` | Adds `buildPeriodicTable()` and the element index |
| `scripts/cross-check-periodic-table.mjs` (+ helpers) | Regenerates `cross-check.md` from the saved sources |
| `src/chem-data/schema.ts` | `periodicElementSchema` |
| `src/chem-data/periodic-table.json`, `element-index.json` | Generated: 118 records; a small index for the palette |
| `src/chem-data/periodic.ts` | Loads the table; position, shells, descriptions |
| `src/chem-data/validate.ts` | Periodic-table checks (a separate exported function; the table is not added to `registrySchema`) |
| `src/app/explore/elements/tableLayout.ts`, `trend.ts`, `elementCard.ts` | Pure logic |
| `src/app/explore/elements/*.tsx` | The page, the two grids, the legend and controls, the card |
| `src/app/explore/BohrCard.tsx`, `EmissionSpectrum.tsx`, `src/chem-data/citations.ts` | Small refactors for reuse (Task 5) |
| `src/main.tsx`, `src/app/pages/Explore.tsx`, `Home.tsx`, `About.tsx`, `src/app/explore/AtomCard.tsx`, the palette | Routes, links, wording |

---

### Task 1: Data

Read: spec 5.1, 5.2, 5.7; `units.md`; `review-verdicts.md` (units and crosscheck sections); `prototype/lib.mjs` for parsing the saved CIAAW and NIST files.

**Produces:**

```ts
// src/chem-data/schema.ts
type Quantity = { value: number; published: string; unit: string; sourceId: string }
type PeriodicElement = {
  atomicNumber: number; symbol: string; name: string
  category: 'Alkali metal' | 'Alkaline earth metal' | 'Transition metal' | 'Post-transition metal' | 'Metalloid'
    | 'Nonmetal' | 'Halogen' | 'Noble gas' | 'Lanthanide' | 'Actinide'
  configuration: { text: string; qualifier?: 'predicted' | 'calculated' }
  standardState: { state: 'Solid' | 'Liquid' | 'Gas'; expected: boolean }
  oxidationStates?: string                       // as published
  yearDiscovered: number | 'Ancient'
  atomicMass: Quantity & ({ kind: 'standard-atomic-weight' } | { kind: 'isotope-mass'; massNumber: number; estimated: boolean })
  electronegativity?: Quantity; covalentRadius?: Quantity; vdwRadius?: Quantity; electronAffinity?: Quantity
  ionizationEnergy?: Quantity & { flag: 'measured' | 'semi-empirical' | 'theoretical' }
  meltingPoint?: Quantity; boilingPoint?: Quantity; density?: Quantity
  notes?: { row: string; text: string; sourceId: string }[]
  sourceId: string
}
// src/chem-data/periodic.ts
export const periodicTable: readonly PeriodicElement[]   // 118, by atomic number
export const NO_VALUE = 'no value listed'
export function validatePeriodicTable(input: unknown, sources: readonly Source[]): string[]   // never throws
```

Units, fixed in one table in the build script: atomic mass `u`; electronegativity `''` (the only empty unit); radii `pm`; ionization energy and electron affinity `eV`; melting and boiling points `K`; density `g/cm³`.

- [ ] Record the baseline: `npm run build`, note the `index` and `sources` chunk sizes in the task report.
- [ ] Add source entries with their own ids and retrieval dates: `pubchem-periodic-table` (the citation wording is in `units.md`; do not reuse `pubchem-ptable`, which the 11 curated elements cite for electronegativity), `ciaaw-abridged-2024` (exists), `nist-asd-ie-all` (the saved all-elements query), `pubchem-element-pages` (covalent radii, Cordero 2008 as carried there).
- [ ] Write `decisions.json` with: the 34 isotope mass numbers and which are estimated (list in `review-verdicts.md`; the build fails if a mass does not round to its mass number); the covalent-radius choice for carbon, manganese, iron, and cobalt (the first value listed); and the notes the spec's section 5.2 requires, each with `row`, `text`, and `sourceId`. Wording for the helium, carbon, arsenic, gas-density, year, xenon, krypton, lawrencium, polonium, and astatine notes is drafted in `chemistry-review.md` section 6 and corrected in `review-verdicts.md` (for arsenic, do not state a bare pressure figure; for oxidation states, mark as predicted only the states PubChem's element pages mark, element by element).
- [ ] Failing tests first. Schema: rejects an unknown key, an unknown category, a quantity with no `published`, and a non-empty unit on electronegativity. `validatePeriodicTable`: rejects a table without exactly numbers 1 to 118, a duplicate symbol, a `published` that does not parse to `value`, an unknown `sourceId`, and returns `schema:` errors without throwing for `null`, `42`, and `[]`. Data test pins: 118 records; the ten categories; 9 configurations qualified predicted and 1 calculated (meitnerium); 9 expected states; 84 standard atomic weights and 34 isotope masses; lithium `6.94`; technetium is isotope mass, mass number 97, not estimated; oganesson is estimated; bismuth, thorium, protactinium, and uranium are standard atomic weights; iron density `7.874`; carbon year `Ancient`; calcium electronegativity published `1`; helium has no electronegativity; oganesson has no density; hydrogen ionization energy matches the curated value's source and digits; covalent radius present for 1 to 96 and absent for 97 to 118; every quantity's unit equals the unit table.
- [ ] Add `buildPeriodicTable()`: strips `(predicted)` and `(calculated)` into the qualifier and fails on any other parenthesised suffix; strips `Expected to be a ` into the flag; fails on a row count other than 118, a gap in atomic numbers, an empty symbol, name, or year, a number that does not parse, or an unknown category or state. It keeps configuration text as published.
- [ ] `npm run build:data`; confirm `git status` shows only the new and intended files; tests pass; commit.

### Task 2: Position, shells, and descriptions

Read: spec 5.4, 5.5, 5.7; `chemistry-review.md` sections 1, 2, and 5; `review-verdicts.md` (chemistry section). The reviews' position tables assume their "rule A"; this plan uses the spec's rule, so take the test values below, not theirs.

**Produces** (`src/chem-data/periodic.ts`):

```ts
type Block = 's' | 'p' | 'd' | 'f'
export function elementPosition(atomicNumber: number): { period: number; group: number | null; block: Block; row: number; column: number }
// rows 1..7 main table; row 9 cerium..lutetium, row 10 thorium..lawrencium, each at columns 4..17
export function shellsFromConfiguration(text: string): number[]   // innermost first; expands the noble-gas core; tolerant of spacing and order
export const GROUP_3_NOTE: { text: string; sourceIds: string[] }
export function describeGroup(group: number): { name?: string; text: string; sourceIds: string[]; support: string }
export function describePeriod(period: number): { text: string; sourceIds: string[]; support: string }
export function describeBlock(block: Block): { text: string; sourceIds: string[]; support: string }
```

- [ ] `elementPosition` tests: H (1, 1, s, row 1, col 1); He (1, 18, s, 1, 18); B (2, 13, p); Sc (4, 3, d, 4, 3); Y (5, 3, d); La (6, 3, d, 6, 3); Ce (6, null, f, 9, 4); Lu (6, null, f, 9, 17); Hf (6, 4, d, 6, 4); Ac (7, 3, d, 7, 3); Th (7, null, f, 10, 4); Lr (7, null, f, 10, 17); Rf (7, 4, d); Og (7, 18, p); all 118 have a unique (row, column); period sizes 2, 8, 8, 18, 18, 32, 32; block sizes s 14, p 36, d 40, f 28; exactly 28 elements have a null group; group 3 is exactly Sc, Y, La, Ac; group 17 is F, Cl, Br, I, At, Ts; an atomic number outside 1 to 118 throws.
- [ ] `shellsFromConfiguration` tests: `1s1` → [1]; `[He]2s2 2p2` → [2, 4]; `[He] 2s2 2p3` → [2, 5]; `[Ne]3s2 3p5` → [2, 8, 7]; `[Ar]4s2 3d6` → [2, 8, 14, 2]; `[Ar]4s1 3d10` → [2, 8, 18, 1]; `[Kr]5s2 4d10 5p6` → [2, 8, 18, 18, 8]; a 7p-before-5f order (`[Rn]7s2 7p2 5f14 6d10`) → [2, 8, 18, 32, 32, 18, 4]; for all 118 stored configurations the counts sum to the atomic number; an unknown core or a malformed subshell throws.
- [ ] Descriptions for 18 groups, 7 periods, 4 blocks, starting from the drafts in `chemistry-review.md` 5.4 with the corrections in `review-verdicts.md`, and rewritten where they assume rule A: the d block is groups 3 to 12 (40 elements, lanthanum and actinium among them); the f block is cerium to lutetium and thorium to lawrencium. Group 1's name is "Hydrogen and the alkali metals" and its text says hydrogen is a nonmetal. Period texts are generated from the table (count and range). Each description stores the passage that supports it in `support`. Tests: every group, period, and block has text, at least one known source, and a non-empty `support`; `describeGroup(1).text` mentions hydrogen; every count a description states equals the count computed from `elementPosition`. Whether each sentence is supported by its passage is a review item in Task 7, not an automated test.
- [ ] `GROUP_3_NOTE` per spec 5.4. Implement; commit.

### Task 3: Cross-check

Read: spec 5.6; `cross-check.md`; `prototype/`.

- [ ] Move the prototype scripts into `scripts/` (lint-clean, no network access: they read only the saved copies), wire `npm run cross-check`, and regenerate `docs/research/periodic-table/cross-check.md`. Now that the shown atomic weights and ionization energies are CIAAW's and NIST's, the report states PubChem's differences from them as information, and lists what remains unresolved: lawrencium's configuration, and the melting-point, boiling-point, and density outliers.
- [ ] Each unresolved item has a note in `decisions.json`; a test asserts that every element the report lists as unresolved carries a note on the named row.
- [ ] The report is byte-identical on a second run. Commit.

### Task 4: The table page

Read: spec 4, 6, 8; `build-review.md` sections 1.2, 2, 3, 4, and 5; `review-verdicts.md` (build section).

**Produces:**

```ts
// src/app/explore/elements/tableLayout.ts
export function move(from: number, key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End'): number
export type Highlight = { kind: 'group'; value: number } | { kind: 'period'; value: number } | { kind: 'block'; value: Block } | { kind: 'category'; value: string } | null
export function isHighlighted(element: PeriodicElement, highlight: Highlight): boolean
export function cellLabel(element: PeriodicElement, property: TrendProperty | null, highlighted: boolean): string
export function highlightStatus(highlight: Highlight): string   // names the set and its size; lists members only for sets of 8 or fewer
// src/app/explore/elements/trend.ts
export type TrendProperty = 'electronegativity' | 'covalentRadius' | 'ionizationEnergy' | 'meltingPoint' | 'density'
export function trendScale(property: TrendProperty): { min: Quantity; max: Quantity; shade(element: PeriodicElement): number | null }  // linear, 0..1; null when the element has no value
```

`move` rule: an arrow key goes to the nearest element in that direction in the same row or column of the drawn layout, crossing empty cells and the gap row; where there is none it stays. Home and End go to the first and last element of the row.

- [ ] `move` tests: right from H → He; down from Mg → Ca; down from Y → La; down from Rf → Ce; up from Ce → Rf; down from Ra stays; down from Ac stays; left from Ce stays; right from Lu stays; Home and End on period 6 give Cs and Rn, and on the cerium row give Ce and Lu; every key from every cell returns a valid atomic number; for every cell and every arrow key that moves, the opposite key returns to the start.
- [ ] `isHighlighted` tests: group 17; group 3 (Sc, Y, La, Ac only); period 6 includes cerium; block f has 28 members; category "Noble gas".
- [ ] `trendScale` tests: for electronegativity fluorine shades 1, the lowest value shades 0, helium is null, and missing values do not affect the range; for covalent radius the scale's ends are the smallest and largest of elements 1 to 96 and einsteinium is null; the scale is linear.
- [ ] `cellLabel` tests: `Fluorine, F, atomic number 9, halogen, electronegativity 3.98`; helium ends `electronegativity: ${NO_VALUE}`; a radius includes its unit; a highlighted cell ends `, highlighted`; "Nonmetal" reads `other nonmetal`.
- [ ] Build the page at one route with an optional symbol (`explore/elements/:symbol?`), lazy, symbol matched without regard to case, unknown symbol → not-found after the hooks. A test asserts no molecule id equals `elements`.
- [ ] The two grids per spec 8 and `build-review.md` section 2 as corrected: two native tables with `role="grid"`, one shared roving tab stop that resets to the selected element when focus leaves, group and period headers on the main table, cell links with `aria-current="page"` on the selected one and router state `keepFocus`, selection replaces the address, and a status line announcing the selection and the highlight.
- [ ] Controls: one native select for colour-by, one native select with four option groups for highlight, legend entries as `aria-pressed` buttons, the group 3 note, the legend notes of spec 5.5, and the trend legends' notes of spec 6. A `<details>` holds the ordered text list of 118 links with the chosen property's value beside each name.
- [ ] Cells: number and symbol always; the value when a property is chosen; the name only when the table is wide enough for names to fit, with a readout of the focused or hovered element otherwise. Minimum cell size 44 px; when the table does not fit it scrolls sideways in its own container. Highlighting and dimming by border and fill, never opacity. Start from the palette, trend scale, and hatching in `build-review.md` section 5, held as named model parameters with a rationale.
- [ ] Explore library page links to the table and the table links back.
- [ ] Node markup tests with `renderToStaticMarkup` inside a `MemoryRouter`: 118 cell links; exactly one `aria-current`; header cells for 18 groups and 7 periods. Focus, layout, theme, and network checks are browser-script checks under `.superpowers/tools/` (git-ignored), by script and by eye in both themes at 1366×768, 400×800, and 2523×1290. Commit.

### Task 5: The element card

Read: spec 5.3, 7; `build-review.md` section 1.1 as corrected.

**Produces:**

```ts
// src/app/explore/elements/elementCard.ts
export type CardRow = { label: string; value: string; note?: string; notes: string[]; sourceIds: string[] }
export function elementCardRows(element: PeriodicElement, curated: Element | undefined): CardRow[]
export function moleculesContaining(symbol: string, index: readonly LibraryEntry[]): LibraryEntry[]
```

- [ ] Refactors for reuse, with existing tests still passing: extract the diagram from `BohrCard` into a component that takes shell counts and a label; let `EmissionSpectrum` be given the curated `Element`; add `periodicCitations(element, sources)` on the existing generic `citations()`.
- [ ] `elementCardRows` tests: sodium's atomic weight row cites CIAAW; technetium's mass row reads as the mass of technetium-97 and says there is no standard atomic weight; oganesson's says the mass is an estimate; bismuth has no isotope sentence; oganesson's density reads `NO_VALUE`; meitnerium's configuration row says calculated; carbon's year reads "Known since ancient times"; fluorine's year row carries its note; arsenic's melting-point row carries its note and arsenic passes validation; a gas's density row carries the gas note; xenon's oxidation-states row carries its note; an oxidation state `-1` prints with U+2212; hydrogen's and fluorine's van der Waals rows show the table's value and one sentence giving the curated value and its source; an ionization energy NIST flags as not measured says so; calcium's electronegativity prints `1`.
- [ ] `moleculesContaining` tests: fluorine lists the three fluorides; xenon lists xenon tetrafluoride; gold lists none.
- [ ] The card per spec 7, below the table across the page with sections side by side, the shell diagram labelled predicted or calculated where the configuration is, the emission spectrum for hydrogen and xenon, a Sources control, and each element's address as its own document title. Verify in the browser at the three sizes in both themes, by script and by eye. Commit.

### Task 6: Links, palette, and wording

Read: `build-review.md` sections 1.3 and 6.3 as corrected.

- [ ] Generate `src/chem-data/element-index.json` (symbol, name, atomic number) for the palette; leave `library-index.json` alone. The palette lists the table page and the 118 elements after molecules, labs, and pages. Tests: the filter finds `Xe`, `xenon`, `gold`, `aluminium`, and `caesium` (spellings PubChem does not use find the element through an authored alias list of those two); update the entry count in the existing search test, which this plan sanctions.
- [ ] Each atom card in the molecule explorer links to its element's page.
- [ ] Wording: the About page's data-sources sentence and acknowledgments (PubChem and the National Library of Medicine, CIAAW, NIST); Home's Explore card; the palette's label and placeholder.
- [ ] Report main-bundle sizes against the Task 1 baseline; `periodic.ts` is imported only under `src/app/explore/elements/` and in tests. Commit.

### Task 7: Documentation and review

- [ ] `docs/research/periodic-table/README.md`: what each file is, the unit table, the two kinds of atomic mass, the per-column sources, and what could not be verified (listed in `units.md` and `cross-check.md`).
- [ ] `docs/for-institutions.md` per spec 10, including the table's exception to the focus rule and what was not tested. Update `README.md`.
- [ ] Independent browser checklist per spec 9, and an independent chemistry and accessibility review of the whole branch, including whether each description is supported by its stored passage and every display string a learner will see. One fix wave, one re-check.
- [ ] Present the branch for the owner to look at, with the palette shown in both themes, before merging.
