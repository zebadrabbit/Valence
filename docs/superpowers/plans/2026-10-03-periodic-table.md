# Periodic Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An interactive periodic table of all 118 elements inside Explore, with category and trend colouring, group, period and block highlighting, an element card, and links to and from the molecule library.

**Architecture:** One committed download of the PubChem periodic table is turned into `src/chem-data/periodic-table.json` by the existing build script. Pure functions in `src/chem-data/` give each element its position, shell counts, and descriptions. The page lives in `src/app/explore/elements/`, is plain DOM (no 3D), loads lazily, and reuses the explorer's cards.

**Tech Stack:** unchanged (TypeScript 6, React 19, Tailwind 4, zod 4, Vitest 5). No new dependency.

**Spec:** `docs/superpowers/specs/2026-10-03-periodic-table-design.md`; the v1 spec's sections 4, 5.1, 11 and 12 also bind.

**Branch:** `periodic-table`.

## How this plan is written

Earlier phases showed that plan code written without being run is where defects come from. This plan therefore fixes interfaces, data rules, exact test cases, and done-when checks, and leaves each implementation to be written test-first by its implementer. Every task ends with `npm run lint` and `npm run build` passing and a commit.

## Facts established before planning

Downloaded 2026-10-03 to `docs/research/periodic-table/pubchem-periodic-table.json` (118 rows, 17 columns).

| Column | Notes |
| --- | --- |
| `AtomicMass` | Never empty. Units u |
| `ElectronConfiguration` | Core notation without a space after the core: `[Ar]4s2 3d6`. 9 end in `(predicted)` |
| `Electronegativity` | Pauling. Empty for 23 elements, helium among them |
| `AtomicRadius` | pm; van der Waals (carbon is 170, Bondi's value). Empty for 19 |
| `IonizationEnergy` | eV. Empty for 16 |
| `ElectronAffinity` | eV. Empty for 61 |
| `OxidationStates` | Text such as `+3, +2`. Empty for 1 |
| `StandardState` | `Solid` 96, `Gas` 11, `Liquid` 2, `Expected to be a Solid` 8, `Expected to be a Gas` 1 |
| `MeltingPoint`, `BoilingPoint` | K (hydrogen melts at 13.81). Empty for 15 and 25 |
| `Density` | g/cm³ (iron 7.874; hydrogen 0.00008988). Empty for 22 |
| `GroupBlock` | The ten categories. Mercury is a "Transition metal" here |
| `YearDiscovered` | A year, or `Ancient` for 13 |
| `CPKHexColor` | Empty for 10; not used by this feature |

The units above are inferred from the values, which match known references. PubChem's JSON carries no unit labels. Task 7 confirms each unit against the labels on PubChem's own periodic table page in a real browser and records the result; until then units are provisional and the build script keeps them in one table so a correction is one edit.

## Global Constraints

- `src/chem-data/` never imports React, three, or `src/app/`, and never uses `document`, `window`, `fetch`, or `XMLHttpRequest`. Nothing is fetched at runtime.
- Generated JSON is never edited by hand: change `scripts/build-chem-data.mjs` and run `npm run build:data`.
- Every displayed chemistry value carries a source. An empty source field is shown as "not measured" ("not known" for the year), never as zero or blank. Text PubChem marks predicted or expected keeps that marking.
- Numbers print in the digits their source publishes, with their unit.
- Trend colouring uses PubChem values for every element. The element card shows the individually sourced value for the 11 elements in `elements.json` where one exists.
- Colour is never the only signal. Everything works by keyboard. Nothing animates under reduced motion.
- All schemas are strict. Existing tests are not weakened.
- The periodic table's data and code stay out of the main bundle.
- The repo will become public: no local paths or personal details. No compliance claims in copy.

## Review Focus

1. **An element with no value for the shown property** (helium's electronegativity, oganesson's density): hatched, labelled "not measured", excluded from the scale's range, and still openable. Tests in Tasks 1 and 4.
2. **Position of the awkward elements:** helium, group 3, lanthanum and lutetium, hafnium after the lanthanides, the last row. Tests in Task 2.
3. **Shell counts from a configuration whose subshells are not in shell order** (`[Ar]4s1 3d10` for copper) or predicted. Tests in Task 2.
4. **Keyboard movement across the gap** between the main table and the detached rows, and at the edges. Tests in Task 4.
5. **Two sources for one element:** sodium's card shows its individually sourced atomic weight while the trend scale uses PubChem's. Test in Task 5.

## File Structure

| File | Responsibility |
| --- | --- |
| `docs/research/periodic-table/pubchem-periodic-table.json` | The download, as received |
| `docs/research/periodic-table/cross-check.md` | Report of disagreements with CIAAW and NIST |
| `scripts/build-chem-data.mjs` | Adds `buildPeriodicTable()` |
| `scripts/cross-check-periodic-table.mjs` | Writes the cross-check report from saved downloads |
| `src/chem-data/schema.ts` | `periodicElementSchema` |
| `src/chem-data/periodic-table.json` | Generated: 118 records |
| `src/chem-data/periodic.ts` | Loads the table; `elementPosition`, `shellsFromConfiguration`, descriptions |
| `src/chem-data/validate.ts` | Periodic-table checks |
| `src/app/explore/elements/tableLayout.ts` | Pure: grid cells, arrow-key movement, highlight membership |
| `src/app/explore/elements/trend.ts` | Pure: scale and shade for a property |
| `src/app/explore/elements/PeriodicTablePage.tsx` and small components beside it | The page |
| `src/app/explore/elements/ElementCard.tsx` | The element card |
| `src/main.tsx`, `src/app/pages/Explore.tsx`, `src/app/explore/AtomCard.tsx`, the palette index | Routes and links |

---

### Task 1: Data

**Interfaces — Produces:**

```ts
// src/chem-data/schema.ts
type Quantity = { value: number; published: string; unit: string }
type PeriodicElement = {
  atomicNumber: number; symbol: string; name: string
  category: 'Alkali metal' | 'Alkaline earth metal' | 'Transition metal' | 'Post-transition metal' | 'Metalloid'
    | 'Nonmetal' | 'Halogen' | 'Noble gas' | 'Lanthanide' | 'Actinide'
  configuration: { text: string; predicted: boolean }
  standardState: { state: 'Solid' | 'Liquid' | 'Gas'; expected: boolean }
  oxidationStates?: string
  yearDiscovered?: number | 'Ancient'
  atomicMass: Quantity
  electronegativity?: Quantity; atomicRadius?: Quantity; ionizationEnergy?: Quantity; electronAffinity?: Quantity
  meltingPoint?: Quantity; boilingPoint?: Quantity; density?: Quantity
  sourceId: string
}
// src/chem-data/periodic.ts
export const periodicTable: readonly PeriodicElement[]   // 118, by atomic number
```

- [ ] Commit the research download (already in the working tree).
- [ ] Write the failing tests: schema rejects an unknown key and an unknown category; `validateRegistry`-style checks reject a table without exactly numbers 1 to 118, a duplicate symbol, a `published` string that does not parse to `value`, and an unknown `sourceId`; a registry test pins 118 records, the ten categories, the count of predicted configurations (9) and expected states (9), and these values as published: hydrogen mass `1.0080`, iron density `7.874`, carbon year `Ancient`, helium has no electronegativity, oganesson has no density.
- [ ] Add `buildPeriodicTable()` to the build script: one unit table at the top; strips `(predicted)` into the flag and `Expected to be a ` into the flag; fails on a row count other than 118, a gap in atomic numbers, an empty symbol or name, a number that does not parse, or an unknown category or state. The source is the existing `pubchem-ptable` entry.
- [ ] Run `npm run build:data`; make the tests pass; commit.

### Task 2: Position, shells, and descriptions

**Interfaces — Produces** (`src/chem-data/periodic.ts`):

```ts
type Block = 's' | 'p' | 'd' | 'f'
export function elementPosition(atomicNumber: number): { period: number; group: number | null; block: Block; row: number; column: number }
// row 1..7 main table, 9 lanthanides, 10 actinides (row 8 is the gap); column 1..18; lanthanum and actinium at column 3
export function shellsFromConfiguration(text: string): number[]   // innermost first; expands the noble-gas core
export const GROUP_3_NOTE: string
export function describeGroup(group: number): { name?: string; text: string; sourceId: string }
export function describePeriod(period: number): { text: string; sourceId: string }
export function describeBlock(block: Block): { text: string; sourceId: string }
```

- [ ] Tests for `elementPosition`: H (1, 1, s, row 1, col 1); He (1, 18, s, row 1, col 18); B (2, 13, p); Sc (4, 3, d); La (6, null, f, row 9, col 3); Lu (6, null, f, row 9, col 17); Hf (6, 4, d, row 6, col 4); Ac (7, null, f, row 10, col 3); Og (7, 18, p); all 118 have a unique (row, column); period sizes are 2, 8, 8, 18, 18, 32, 32; an atomic number outside 1 to 118 throws.
- [ ] Tests for `shellsFromConfiguration`: `1s1` → [1]; `[He]2s2 2p2` → [2, 4]; `[Ne]3s2 3p5` → [2, 8, 7]; `[Ar]4s2 3d6` → [2, 8, 14, 2]; `[Ar]4s1 3d10` → [2, 8, 18, 1]; `[Kr]5s2 4d10 5p6` → [2, 8, 18, 18, 8]; for every one of the 118 stored configurations the counts sum to the atomic number.
- [ ] Descriptions: one or two plain sentences for each of the 18 groups (with the family name where it has one: alkali metals, alkaline earth metals, pnictogens omitted, chalcogens, halogens, noble gases), 7 periods, and 4 blocks, each citing one freely linkable general chemistry source (OpenStax Chemistry 2e, section 2.5, or a IUPAC page). A test asserts every group, period, and block has text and a known `sourceId`, and that no description states a property the cited section does not.
- [ ] Implement; commit.

### Task 3: Cross-check

- [ ] `scripts/cross-check-periodic-table.mjs` reads saved copies of the CIAAW abridged table and the NIST ionization-energy table for all 118 elements (saved under `docs/research/periodic-table/`), compares them with the PubChem values, and writes `cross-check.md`: for each property, how many agree, and a table of every disagreement beyond rounding to the fewer published digits.
- [ ] Commit the saved copies, the script, and the report. Change no value. List the disagreements in the task report for a decision; an unresolved one becomes a `note` on that element's record through the build script.

### Task 4: The table page

**Interfaces — Produces:**

```ts
// src/app/explore/elements/tableLayout.ts
export function cells(): { atomicNumber: number; row: number; column: number }[]
export function move(from: number, key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End'): number  // atomic number; stays put at an edge
export type Highlight = { kind: 'group'; value: number } | { kind: 'period'; value: number } | { kind: 'block'; value: Block } | { kind: 'category'; value: string } | null
export function isHighlighted(element: PeriodicElement, highlight: Highlight): boolean
export function cellLabel(element: PeriodicElement, property: TrendProperty | null): string
// src/app/explore/elements/trend.ts
export type TrendProperty = 'electronegativity' | 'atomicRadius' | 'ionizationEnergy' | 'meltingPoint' | 'density'
export function trendScale(property: TrendProperty): { min: Quantity; max: Quantity; shade(element: PeriodicElement): number | null }  // 0..1, null when not measured
```

- [ ] Tests: `move` right from H lands on He; down from Mg lands on Ca; down from Y lands on La's marker target (lanthanum); up from lanthanum returns to yttrium; down from Ba stays in the main table (Ra); left from Li stays; Home and End reach the row's ends; every key from every cell returns a valid atomic number. `isHighlighted` for group 17, period 2, block f, and category "Noble gas". `trendScale('electronegativity')`: fluorine shades 1, the lowest shades 0, helium is null, and the range ignores missing values. `cellLabel` reads "Fluorine, atomic number 9, Halogen, electronegativity 3.98" and "Helium, atomic number 2, Noble gas, electronegativity not measured".
- [ ] Build the page at `#/explore/elements` and `#/explore/elements/:symbol` (lazy route; unknown symbol shows the not-found page): the grid with the two detached rows and the group 3 markers; group numbers along the top and period numbers down the side; category colours with a legend headed "one common classification"; the colour-by control; the highlight controls with the description text; a text list of all elements as an alternative; roving focus so the grid is one tab stop.
- [ ] Palettes are model parameters with a rationale, distinguishable without relying on hue alone; missing values are hatched.
- [ ] Verify in a headless browser by script and by eye, both themes, 1366×768 and 400×800. Commit.

### Task 5: The element card

- [ ] Pure function `elementCardRows(element, curated)` returning the rows to show, each with its value text, unit, and `sourceId`, choosing the individually sourced value where `elements.json` has one. Tests: sodium's atomic weight comes from the curated source and its melting point from PubChem; oganesson's density reads "not measured"; a predicted configuration is marked; carbon's year reads "Ancient".
- [ ] Card content per spec section 7, reusing `BohrCard` (shells from `shellsFromConfiguration`, labelled predicted where the configuration is), `EmissionSpectrum`, and `Sources`. "In the molecule library" lists links from the library index using `formulaElements`; a test checks fluorine lists the three fluorides and gold lists none.
- [ ] Beside the table at wide widths, below it otherwise. Verify in the browser; commit.

### Task 6: Links

- [ ] Explore library links to the table and back; each atom card links to its element's page; the command palette lists all 118 elements by name and symbol without pulling the table into the main bundle (extend the generated library index). Test the palette filter finds "Xe", "xenon", and "gold".
- [ ] Report main-bundle size before and after. Commit.

### Task 7: Units, documentation, and review

- [ ] Open PubChem's periodic table page in a headless browser, read the unit shown for each property, and compare with the build script's unit table. Record the result in `docs/research/periodic-table/README.md`. Fix any unit that differs.
- [ ] Add the faculty paragraph to `docs/for-institutions.md` (single source, cross-check report, conventions chosen) and update `README.md`.
- [ ] Independent browser checklist per spec section 9, and an independent chemistry and accessibility review of the whole branch. One fix wave, one re-check.
- [ ] Present the branch for the owner to look at before merging.
