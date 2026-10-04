# Periodic table plan: build and accessibility review

Reviewer key: `build`. 2026-10-03. Reviewed `docs/superpowers/plans/2026-10-03-periodic-table.md` against `docs/superpowers/specs/2026-10-03-periodic-table-design.md` and the code it builds on.

No tracked file was changed and nothing was committed (`git status` is clean; the real build still emits `index-CZF3etaO.js` and `index-BGdXs2AH.css`, byte for byte). Everything here was produced in `.superpowers/tools/periodic-research/build/`.

## How the evidence was produced

- **Baseline:** `npm run typecheck`, `npm run lint` and `npm run build` on the real repo: all pass, 719 tests.
- **Prototype:** a copy of the app in `proto/` with the feature built roughly as the plan describes: data conversion, position, shells, `move`, the table page, a cut-down element card, the route and the palette entries. It typechecks and lints clean. Its own tests pass (69 in two files).
- **Browser:** Playwright with headless Chromium against `vite preview` of the prototype on ports 4471 to 4473. Scripts and their output are in `browser/`; screenshots in `browser/shots/`.
- **Colour:** scripts in `colour/` (OKLCH to sRGB, WCAG contrast, Machado 2009 colour-vision simulation, a seeded palette search). `colour/report-output.md` holds every number quoted in section 5.
- **Standards:** the ARIA Authoring Practices grid pattern, its layout-grid examples, WAI-ARIA 1.2 and HTML-AAM were downloaded to `sources/` and read, not recalled.

To re-run: `cd proto && npx vitest run src/app/explore/elements`, then `npx vite preview --outDir dist-v1 --port 4471 --strictPort` and `node ../browser/focus.cjs` (also `layout.cjs`, `values.cjs`, `square.cjs`); `node colour/report.mjs`. The variant builds that `focus.cjs` checks on ports 4472 and 4473 were deleted to save space; the edits that produce them are described in section 2.

## What changes the plan (short list)

1. **The build will fail at Task 2 as written.** Meitnerium's configuration ends `(calculated)`, not `(predicted)`, and nitrogen and fermium have a space after the core. The plan's facts table misses all three.
2. **`BohrCard`, `EmissionSpectrum`, `elementCitations` and `shellCitations` do not accept a `PeriodicElement`.** Five TypeScript errors. The fix is small.
3. **Without `state={{ keepFocus: true }}` on the cell links, every Enter throws focus to the h1.** Confirmed in the browser.
4. **The plan names no ARIA roles.** Roving tabindex without `role="grid"` is a defect; one grid with group column headers would announce cerium under "Group 4". Use two native tables with `role="grid"`.
5. **Dimming by opacity fails contrast** (2.71:1 at 40% in the light theme). Dim by removing the fill.
6. **Number, symbol, name and a trend value do not all fit in a cell at 1366 px.** The name has to come out of the cell below about 1540 px of table width.
7. **"Extend the generated library index" breaks an existing test and the Home page count.** Use a separate small file. Importing `periodic.ts` from the palette would add 79.8 kB to the main chunk.
8. **Two ordering faults:** units are confirmed in Task 7 after values are displayed in Tasks 4 and 5 (the spec forbids that), and Task 3 writes a `note` the strict schema of Task 1 has no field for.

## 1. Interfaces that do not fit the existing code

### 1.1 Reuse of the cards

I wrote a file that does what Task 5 says ("reusing `BohrCard`, `EmissionSpectrum`, and `Sources`") with a `PeriodicElement` and ran `tsc -b`. Five errors:

| Plan assumes | Result | Why |
| --- | --- | --- |
| `<BohrCard element={periodicElement} />` | TS2740 | `BohrCard.tsx:12` takes `Element`; line 13 reads `element.shells.value`; line 45 calls `shellCitations(element, …)`, which reads `element.shells.sourceId`. A `PeriodicElement` has no `shells`. |
| `<EmissionSpectrum element={periodicElement} />` | TS2740 | `EmissionSpectrum.tsx:11` takes `Element` and reads `element.emission` (line 12). |
| `elementCitations(periodicElement, …)` | TS2345 | `citations.ts:24` takes `Element`. |
| `shellCitations(periodicElement, …)` | TS2345 | `citations.ts:44` takes `Element`. |
| `publishedValue(quantity)` | TS2345 | `format.ts:41` takes `Element['atomicWeight']`, which requires `sourceId`; the plan's `Quantity` has none. |

What is reusable unchanged: `Card`, `Rows`, `Row`, `Note`, `Disclosure` and `Sources` (`InspectorCard.tsx:11` to `:55`) take plain props, and the generic `citations(entries, sources)` (`citations.ts:11`) takes label and source id pairs. The prototype card uses all of them.

Smallest change that makes the reuse real:

- **Bohr diagram.** Move the figure and the shell list of `BohrCard.tsx` lines 16 to 43 into `BohrDiagram({ name, symbol, shells })` in the same file. `BohrCard` keeps its signature and renders `<Card>`, `<BohrDiagram>` and its `Sources`. The element card renders `<BohrDiagram>` with shells from `shellsFromConfiguration`, its own heading (with "predicted" or "calculated") and its own `derived` sentence, since these shell counts are derived from a cited configuration, not cited themselves. `bohrLayout` already handles seven shells (238 px square for oganesson; rendered in the prototype).
- **Emission spectrum.** No change. Hydrogen and xenon are both among the 11 curated elements, so the card passes the curated `Element` record it must look up anyway for spec 5.2: `own?.emission && <EmissionSpectrum element={own} />`.
- **Citations.** Add one function, `periodicCitations(rows, sources)`, built on `citations()`. Do not widen `elementCitations`.
- **`publishedValue`.** Widen its parameter to `{ value: number; published?: string }`.

Three more things the plan does not see:

- **`configurationParts` cannot read PubChem's text.** `element.ts:18` matches only `1s2 2s2 2p2`. On `[He]2s2 2p2` it throws "unreadable configuration term". The atom card shows superscripts through it (`AtomCard.tsx:45`), so the element card needs a version that accepts a leading `[Xx]` core and an optional space after it, or the two cards will write configurations differently.
- **The 11 curated elements disagree with PubChem in visible ways** (`curated-vs-pubchem.json`). Fluorine's van der Waals radius is 1.47 Å in `elements.json` and 135 pm in PubChem. Hydrogen is 1.10 Å against 120 pm. Sulfur's weight is 32.06 against 32.07. Under spec 5.2 the card shows the curated value while the trend cell beside it prints PubChem's, so a learner sees 135 in the table and 147 pm on the card with no explanation. The card needs to show both where they differ.
- **Review Focus 5 names a case that cannot happen.** Atomic weight is not one of the five trend properties, so sodium's weight never appears on a trend scale. The real collision is the radius.

Derived shells agree with the curated shells for all 11 elements, and sum to the atomic number for all 118. Worth pinning as a test.

### 1.2 The route

No collision. I ran the installed router's own `matchRoutes` (react-router 8.4.0, `proto/scripts/route-check.mjs`) with the new routes declared after `explore/:id`, the worst order:

```
/explore/water        -> molecule  {"id":"water"}
/explore/elements     -> elements  {}
/explore/elements/Xe  -> element   {"symbol":"Xe"}
/explore/Elements     -> elements  {}          (paths match without regard to case)
/explore/elements/xe  -> element   {"symbol":"xe"}
/explore/elements/Xe/extra -> notfound
```

A static segment outranks a parameter whatever the order. Two consequences:

- A molecule whose id is `elements` would be unreachable. Add a one-line test.
- The symbol arrives as typed. `find((e) => e.symbol === symbol)` sends `xe` to the not-found page (checked in the browser). That is an owner decision; see the end.

One optional-segment route, `explore/elements/:symbol?`, covers both addresses in one entry. I also built the plan's two separate routes to see whether selecting the first element remounts the page (which would drop focus and the colour-by choice). It does not: focus, the DOM node and the select value all survived. That is React keeping a component of the same type in the same position, which is observed behaviour and not a documented guarantee, so the single route is the safer form.

The not-found path works the way `MoleculePage.tsx:14` does it: `if (symbol !== undefined && !selected) return <NotFound />`, placed after the hooks. There is no `react-hooks` lint plugin in this repo, so nothing will catch an early return above a hook.

### 1.3 The command palette and the main chunk

How the palette gets its entries: `items.ts:8` builds `PALETTE_ITEMS` from `LIBRARY_INDEX` (`library-index.json`, written by `scripts/build-chem-data.mjs:618`), `ACTIVITIES` and `NAV`. `Layout` imports `CommandPalette` statically, so all of it is in the eagerly loaded JavaScript.

"The main bundle" is two files, not one. The bundler splits zod and `sources.json` into a chunk that `index.html` preloads. Task 6's before and after must count both.

| Build | `index-*.js` raw | gzip -9 | Eager total raw | Notes |
| --- | --- | --- | --- | --- |
| Today | 368,766 | 118,226 | 485,299 (with `sources-*.js` 116,533 / 32,424) | measured on the real repo |
| Prototype: palette reads a separate `element-index.json` | 375,009 | 119,881 | 491,542 | **+6,243 raw, +1,655 gzip** |
| Mistake: palette imports `periodicTable` from `periodic.ts` | 448,601 | 128,623 | 565,134 | **+79,835 raw, +10,397 gzip** |

The periodic route's own chunk is 91,268 raw, 13,750 gzip (page, card and the 118 records). Opening the table loads `index`, `sources`, `PeriodicTablePage`, a 12 kB `format` chunk and a 10 kB `elements` chunk. It does not load the molecule registry or the 3D viewer (checked by listing requests).

If the element card imports `registry` instead of `sources.json` and `elements.json` directly, the route also downloads and zod-parses all 33 molecule files: 56,595 raw, 9,369 gzip more. `About.tsx:2` to `:3` already shows the pattern to follow.

"Extend the generated library index", read literally, breaks things. `library-index.json` also feeds `Home.tsx:31` ("31 molecules"), and `libraryIndex.test.ts:13` pins 31 entries against the registry. The palette index for elements has to be its own generated file. One existing test fails when the 118 entries are added, whichever way it is done: `search.test.ts:9` pins `31 + 2 + 1 + 6`. That count must be updated, which is not weakening it.

With the symbol passed as the palette item's `formula`, the existing search needs no change. Checked in the browser: `Xe`, `xenon`, `gold`, `au`, `c`, `co` and `h` each list the element first. Smaller points: the field is labelled "Search molecules, labs and pages" (`CommandPalette.tsx:104`) and the placeholder says "name or formula" (`:111`); an empty query now lists 158 options; the palette has no entry for the table page itself, only for the six rail pages.

### 1.4 Where the 118 records are imported

Import `periodic-table.json` in `src/chem-data/periodic.ts` only, and import `periodic.ts` only from `src/app/explore/elements/**` and tests. `AtomCard` needs only the symbol to build its link, so it imports nothing. Do not add the table to `registrySchema` or `registry.ts`: both molecule routes import the registry, and the library page would then carry 79 kB of element data it never shows.

Nothing stops a later edit from importing `periodic.ts` into the palette. The repo already has a lint guard of exactly this kind for Three.js (`eslint.config.js:83` to `:105`); a matching rule is cheap.

Storing the unit once instead of 118 × 8 times saves 8.8 kB raw and 69 bytes gzipped. Not worth a spec change.

## 2. Keyboard and ARIA design

### 2.1 Which pattern

| Option | Tab stops in the table | Screen reader | Verdict |
| --- | --- | --- | --- |
| `role="grid"`, links in cells, roving tabindex | 1 | Announced as a grid; arrow keys reach the page; headers announced | Correct. This is the APG "layout grid" case: "group a set of interactive elements, such as links" into one tab stop |
| Plain table of links | 118 | Table reading commands work | Fails spec 8 ("one keyboard stop"); 118 Tab presses to reach the card below |
| Plain table plus roving tabindex, no grid role | 1 | Browse mode swallows the arrow keys; nothing says arrows work; 117 links silently leave the tab order | A defect. This is what "roving focus" without a role produces |
| A list | 118, or 1 with roving | Loses rows and columns | Right as the alternative (spec 8 requires it), wrong as the table |

The plan says "roving focus so the grid is one tab stop" and names no role. That is the third row.

### 2.2 Two grids, not one

Spec 5.3 says lanthanides and actinides have no group number. In one table with `<th scope="col">` for groups 1 to 18, cerium sits in column 4 and a screen reader announces "Group 4". Dropping the column headers fixes that and loses the group announcement for the 88 elements that do have a group.

Use two native tables, each `role="grid"`, with one roving tab stop shared across both:

- **Main table:** `<table role="grid" aria-label="Periodic table, periods 1 to 7">`. A header row of `<th scope="col">` ("Group 1" to "Group 18", the word "Group" visually hidden). Seven rows, each starting `<th scope="row">` ("Period 1" to "Period 7"). Gaps are empty `<td>`. The two group 3 markers are `<td>` with text ("57–71: the lanthanides, in the table that follows"), not focusable.
- **Detached rows:** `<table role="grid" aria-label="Lanthanides and actinides">`. Two rows with `<th scope="row">` ("Lanthanides, period 6", "Actinides, period 7"), 15 cells each, no column headers.

With `role="grid"` on a `<table>`, `tr`, `th` and `td` map to row, columnheader or rowheader, and gridcell by themselves (HTML-AAM 3.5.130, 3.5.136, 3.5.141; APG: "it is not necessary to use ARIA roles for rows and cells"). Chromium's accessibility tree for the prototype shows exactly that: grid 1 has 8 rows, 18 column headers, 7 row headers, 127 gridcells, 88 links; grid 2 has 2 rows, 2 row headers, 30 gridcells, 30 links. Each element is `link < gridcell < row < grid`.

A real table is also the least code for the gaps: empty cells take their place without any `grid-row` or `grid-column` arithmetic.

### 2.3 The rest of the specification

- **`aria-rowindex`, `aria-colindex`, `aria-rowcount`, `aria-colcount`: none.** APG: they apply "if there are conditions where some rows or columns are hidden or not present in the DOM". Every row and column is in the DOM. APG warns that inconsistent values "could have devastating effects on assistive technology behavior".
- **`aria-selected`: none.** The grid has no selection model. **`aria-activedescendant`: none.** Real focus moves.
- **Focus goes on the link, not the cell.** APG's first "optimal" combination: "A cell contains one widget whose operation does not require arrow keys and grid navigation keys set focus on that widget."
- **Roving tabindex:** the link of one element has `tabIndex={0}`, the other 117 have `-1`. The stop is the cell last focused, else the selected element, else hydrogen. Reset it to the selected element when focus leaves the grid; in the prototype it stayed on fluorine after the palette opened gold.
- **Enter:** nothing to write. It is a link; the browser follows it. Do not call `preventDefault` on Enter. Space does nothing.
- **Selected element:** render the cell as `NavLink`. It sets `aria-current="page"` by itself when its address is the current one (confirmed). That value is the accurate one: the link points at the page being shown.
- **Keys handled, on a wrapper around both tables:** the four arrows, Home, End, and optionally Ctrl+Home and Ctrl+End (APG marks both optional). Return without acting when Alt, Meta or Shift is held: Alt+Left is the browser's Back. Call `preventDefault` for every handled key, including at an edge, so the page and the sideways scroller do not scroll. Both checked in the browser.
- **Accessible name of a cell:** an `aria-label` from `cellLabel`, since in a grid a screen reader in focus mode reads only the focused element. The plan's wording drops three things a non-sighted learner needs: the symbol, the group and period, and the unit. Proposed: "Fluorine, F, atomic number 9, halogen, group 17, period 2, electronegativity 3.98". For cerium: "Cerium, Ce, atomic number 58, lanthanide, period 6". The symbol also satisfies WCAG 2.5.3: below about 1540 px the symbol is the only visible label, and it should be in the name.
- **Highlight, non-visually:** two signals. The cell's name ends ", highlighted". A `role="status"` line says what is highlighted and lists it: "Highlighted: 6 elements (Fluorine, Chlorine, Bromine, Iodine, Astatine, Tennessine)." Dimming is conveyed by the absence of "highlighted"; dimmed cells stay focusable and openable.
- **Trend, non-visually:** the value and unit are in each cell's name; a missing value reads "not measured". The status line should also summarise the scale when a property is chosen (lowest, highest, how many not measured), and the text list should print the value beside each element so the trend can be read down the list.
- **Controls:** colour-by is a native `<select>` with a `<label>`, as `MoleculeWorkspace.tsx:47` does. Highlight is one native `<select>` with four `<optgroup>`s (Group, Period, Block, Category), which is exactly the plan's `Highlight` union. Legend entries are `<button aria-pressed>` that set the same state.
- **A visible hint** beside the table: "Arrow keys move between elements. Enter opens one." Sighted keyboard users get no announcement.

### 2.4 Focus when an element is selected

`Layout.tsx:16` to `:19` focuses `main h1` after every navigation unless the link passed `state.keepFocus`. Selecting an element is a navigation.

- I built the cells without `keepFocus` and pressed Enter on fluorine: `document.activeElement` was the h1. The next arrow key does nothing. This is what the plan as written produces.
- With `state={{ keepFocus: true }}` on the cell link (the mechanism `MoleculePage.tsx:56` already uses): focus stayed on the same DOM node, `aria-current="page"` was on it, and Down then Enter moved on to chlorine with focus still in the grid.
- Give the text list's links the same state.
- Do not pass it from the palette or from the atom card. Arriving from elsewhere should focus the h1, and does (checked from the palette).

Because focus stays put, the selection must be announced another way: the `role="status"` line ("Selected: Fluorine. Its details are below the table."), as `MoleculeWorkspace.tsx:71` does for atoms.

Use push, not `replace`, so Back steps through the elements visited. After Back, the earlier element is current and focus is left where it was (checked).

The document title stays "Periodic table · Valence" for every element, because `PageHeader` uses one string for the h1 and the title (`PageHeader.tsx:6` to `:8`). History and bookmarks then cannot tell fluorine from gold.

## 3. The `move()` rule

The plan's three awkward cases are coherent. One rule gives all of them:

> **Arrows:** go to the nearest place holding an element in that direction, along the same column (Up, Down) or the same row (Left, Right). Step over anything that is not an element: an empty place, either group 3 marker, the gap row. If there is none, stay.
> **Home, End:** the first and last element of the current row.
> **Ctrl+Home, Ctrl+End** (optional): hydrogen; the last element of the last row (lawrencium).

What that does at the gap, for every column:

| Column | Down from row 7 | Up from row 9 |
| --- | --- | --- |
| 1 (Fr), 2 (Ra) | stays: nothing is drawn below | no element there |
| 3 | no element in rows 6 and 7 (markers). Down from Y (row 5) goes to La; Down from La to Ac; Down from Ac stays | Up from La goes to Y |
| 4 to 17 (Rf to Ts) | to the lanthanide below (Rf to Ce … Ts to Lu) | back to the row 7 element above |
| 18 (Og) | stays | no element there |

Row ends: Left from Li, La or Ac stays; Right from He, Lu, Lr or Og stays. No wrapping, which APG allows only as an option and calls "disorienting" in a data grid. Inside a row the holes are stepped over: Right from H goes to He, Right from Be to B, Right from Ba to Hf (over the marker).

The alternative reading, where the marker redirects (Right from Ba goes to La), would break the property that Left undoes Right, and would stop following the drawn layout, which spec 8 asks for.

Prototype: `proto/src/app/explore/elements/tableLayout.ts`, 30 lines for `move`. Tests: `tableLayout.test.ts`. Output (`move-test-output.txt`): **66 of 66 pass.**

- The plan's six cases: H Right He; Mg Down Ca; Y Down La; La Up Y; Ba Down Ra; Li Left stays.
- 38 more cases covering every column at the gap, column tops, row ends, row holes, Home and End on rows 1, 3, 6, 9 and 10.
- Every key from every cell returns an integer from 1 to 118 (118 × 8 = 944 checks).
- If an arrow moves, the opposite arrow moves back (all 118 × 4).
- Left, Right, Home and End never change row; Up and Down never change column.
- All 118 elements can be reached from hydrogen with the four arrows alone.

The same file's tests found the Task 1 defect: "sums to the atomic number for all 118" threw on `[Rn]7s2 5f14 6d7 (calculated)`.

In the browser the keys did the same on the real DOM: H Right He, Down Ne, Left F, Left O, Down S, Se, Te, Po, Lv, Yb, Up Lv, Home Fr, End Og, Ctrl+Home H, Ctrl+End Lr.

## 4. Layout

### 4.1 Width available

Cell width = (viewport − rail − 48 px page padding − 24 px period column) ÷ 18. The rail is 208 px open, 56 px collapsed (`Layout.tsx:38`). Measured in Chromium:

| Viewport | Rail | Content width | Cell width | Table fits without sideways scroll |
| --- | --- | --- | --- | --- |
| 1366×768 | open | 1110 | 58.0 | yes |
| 1366×768 | collapsed | 1262 | 66.4 | yes |
| 1920×1080 | open | 1664 | 88.8 | yes |
| 2523×1300 | open | 2267 | 103.3 (table capped at 1920 px) | yes |
| 1024×768 | open | 768 | 42 (minimum) | no: scrolls inside its container |
| 400×800 | collapsed | 296 | 42 (minimum) | no: scrolls inside its container |

Headless Chromium has no scrollbar gutter. On Windows a 15 to 17 px scrollbar takes about 1 px off each cell at 1366.

### 4.2 What fits in a 58 px cell

Not all four items. Measured with the app's Inter font:

- **Names.** "Rutherfordium" is 58 px wide at 8 px type, 63 at 9, 71 at 10, 79 at 11, 86 at 12. In a 56 px inner width, 13 of 118 names are cut at 10 px and 30 at 11 px. Only at 8 px do nearly all fit, and 8 px is not legible. Every name fits at 11 px once the cell is about 84 px wide, which is a table about 1540 px wide: a viewport of roughly 1800 px or more with the rail open.
- **Number, symbol and value** fit at 1366 in a square cell (58 × 58): number about 10 px, symbol about 19 px, value 9 px. No overlaps in any of the five properties (`browser/square-output.jsonl`). In a shorter 5:4 cell the number collides with two-letter symbols in about 50 cells (`values-output.jsonl`), so keep the cells square while a value is shown.
- **The limiting value is hydrogen's density.** "0.00008988" is 56 px wide at 9 px in a 56 px cell: it fits exactly. At the 42 px minimum, the densities of the gases overflow (hydrogen 56 px, helium and nitrogen 50 px, oxygen and fluorine 44 px, in a 40 px cell). "Digits as published" and a 42 px cell cannot both hold for density.

So at 1366: number and symbol always; the value when a property is chosen; the name only from about 1540 px of table width. Below that, the name is in the cell's accessible name, in the card, and in a readout.

**The readout.** The table has an empty block above the transition metals: 10 columns by 3 rows, 580 × 174 px at 1366. The prototype puts the hovered, focused or selected element there in full ("F, 9 Fluorine, Halogen"), `aria-hidden` because the cell's name already says it. It also answers a second problem: at 1366×768 the table ends at y = 751 of 768, so the card is entirely below the fold and a selection would otherwise change nothing on screen.

### 4.3 At 400 px

- The table keeps a minimum cell of 44 px and scrolls sideways inside its own container. The page did not scroll sideways (`scrollWidth` equals the viewport). Moving focus to helium scrolled the container by 526 px and left the page at 0.
- The scroll container needs no `tabindex`: it holds focusable cells.
- Names go. With a property shown, raise the minimum cell to about 60 px or the density values clip.
- The readout stays useful, since it scrolls with the table.
- Spec 8 says the table scrolls "narrower than 768 px". With a 44 px minimum it starts scrolling when the content is under about 816 px, which is a viewport under about 1072 px with the rail open. The rule should be "when it does not fit at its minimum cell size", not a fixed width.

### 4.4 Card beside or below

At 1366 beside is impossible: the table uses all 1110 px. It first becomes possible around 1800 px, and at 2523 px with the table capped at 1920 px only 347 px is left, barely one card.

Recommendation: **below, at every width**, as a grid of cards with the same classes as the molecule inspector (`MoleculeWorkspace.tsx:132`, `grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))]`). At 2267 px of content that is five or six cards in one row: summary, properties, Bohr model, molecules, spectrum. It is one layout instead of two, and it is what the owner asked for on the molecule page. It contradicts spec section 7 ("beside the table on a wide screen"), so it is listed as an owner decision.

Cap the table at about 120 rem. Uncapped at 2523 px the cells would be about 124 px square and the table about 1,150 px tall, ending some 30 px below a 1,300 px screen.

## 5. Colour

### 5.1 Ten category fills

One hue per category in both themes; lightness and chroma differ by theme. Found by a seeded search (`colour/optimise-anchored.mjs`) that maximises the smallest distance between any two fills under normal, protan, deutan and (weighted) tritan vision, while cell text keeps at least 7:1. Text in a cell is always `--foreground`.

| Category | Light fill | Text contrast | Dark fill | Text contrast |
| --- | --- | --- | --- | --- |
| Alkali metal | `#e7a4a1` | 9.64:1 | `#381e1e` | 14.66:1 |
| Alkaline earth metal | `#fca11c` | 9.67:1 | `#66533e` | 7.01:1 |
| Transition metal | `#94bbf6` | 10.09:1 | `#1e54a5` | 7.02:1 |
| Post-transition metal | `#c7c7c7` | 11.71:1 | `#484848` | 8.76:1 |
| Metalloid | `#d7f4cb` | 16.68:1 | `#29570a` | 8.17:1 |
| Nonmetal | `#a4e4ae` | 13.47:1 | `#1c4626` | 10.30:1 |
| Halogen | `#f0fc95` | 17.97:1 | `#2f3300` | 12.62:1 |
| Noble gas | `#b5b4d0` | 9.81:1 | `#393363` | 11.01:1 |
| Lanthanide | `#fadff6` | 15.98:1 | `#472043` | 12.93:1 |
| Actinide | `#8bd8f0` | 12.42:1 | `#2a5a69` | 7.28:1 |

Smallest distance between any two of the ten (OKLab × 100; larger is easier to tell apart), with a published palette measured the same way for scale:

| Vision | Proposed, light | Proposed, dark | Paul Tol "light" (9 colours) | A typical ten-tint pastel scheme |
| --- | --- | --- | --- | --- |
| Normal | 6.31 | 6.41 | 8.95 | 6.88 |
| Protan | 5.43 | 5.43 | 4.87 | 1.67 |
| Deutan | 5.58 | 5.38 | 5.35 | 1.00 |
| Tritan | 4.43 | 3.94 | 3.73 | 2.15 |

Read that as: with ten colours instead of nine, the proposal is at least as separable as Tol's colour-blind-safe set under each deficiency, and two to five times better than an untuned pastel scheme. It is less separable than Tol's for normal vision, the price of a tenth colour. The closest pairs are named in `colour/report-output.md`.

Tol's nine values were checked against his own page (saved as `sources/tol.html`). The pastel scheme's ten values were typed from memory of the kind of palette periodic tables commonly use; treat that column as an illustration, not a measurement of any particular site.

Two cautions:

- **`--muted-foreground` fails on these fills:** 2.31:1 to 4.30:1 in the light theme. Nothing inside a coloured cell may use it.
- "Colour-blind safe" here means simulated, not tested with people. Ten fills can never be as distinct as four or five, which is why the category must also be in the legend, the cell's name and the outline highlight. The spec already requires that.

As CSS: ten custom properties under `:root` and again under `.dark` in `src/index.css`, beside the existing tokens, each with a one-line rationale. The cell takes `background-color: var(--fill)` from a `data-category` attribute.

### 5.2 Single-hue trend scale

Hue 255 (blue), lightness and chroma both moving, text `--foreground` throughout so it never has to flip:

- Light: `--trend-low: oklch(0.97 0.012 255)` to `--trend-high: oklch(0.72 0.12 255)`. Text contrast 18.20:1 at the low end, 7.96:1 at the high end.
- Dark: `--trend-low: oklch(0.24 0.02 255)` to `--trend-high: oklch(0.47 0.13 255)`. Text contrast 15.72:1 to 6.56:1.

In both themes "more" is further from the page background: darker in light, lighter in dark. The ends are 24.5 to 28.5 apart (OKLab × 100) under every kind of vision in both themes, so the ramp survives colour blindness; it is a lightness ramp.

The cell computes its own shade in CSS, so the script never needs to know the theme:

```css
.cell[data-trend='value'] { background-color: color-mix(in oklch, var(--trend-low), var(--trend-high) calc(var(--t) * 100%)); }
```

with `style={{ '--t': shade }}` from `trendScale().shade()`. Rendered in the prototype in both themes.

The scale is linear, as the plan implies. For density that puts every gas at the pale end (0.00008988 to 22.57 g/cm³). That is true to the data; a log scale would be a model choice needing its own rationale.

### 5.3 Hatching for "not measured"

```css
.cell[data-trend='none'] {
  background: repeating-linear-gradient(45deg, transparent 0 4px,
    color-mix(in oklab, var(--foreground) 40%, var(--background)) 4px 5px) bottom / 100% 32% no-repeat;
}
```

- A band along the bottom of the cell, where the value would be. Hatching the whole cell ran the stripes behind the number and symbol and was visibly harder to read (`shots/1366x768-light-electronegativity.png` against `shots/1366x768-light-density-final.png`).
- At 40% the stripe is `#919191` light, `#5e5e5e` dark: 3.15:1 and 3.05:1 against the background, so the pattern itself is perceivable, and 6.28:1 and 6.21:1 under text if any overlaps.
- The legend shows a hatched swatch labelled "not measured"; the cell's name says "not measured".

### 5.4 Dimming, highlight, selection, focus

- **Dimmed:** remove the fill and make the border dashed. Text stays `--foreground`. Never opacity: `--foreground` at 40% opacity over the page is 2.71:1 (light) and 3.66:1 (dark), and these are live links, so 4.5:1 applies.
- **Highlighted:** 2 px solid `--foreground` border.
- **Selected:** 3 px double border and bold, plus `aria-current`.
- **Focused:** a real `outline`, which the global rule at `index.css:124` already gives. Do not add the `outline-none focus-visible:ring-2` pair used elsewhere in the app: a ring is a `box-shadow`, and forced-colours mode drops box shadows.

Under Chromium's forced-colours emulation the fills vanish and the dashed, solid and double borders and the focus outline all remain (`shots/1366x768-forced-colors-group17.png`).

The prototype uses no transitions, so there is nothing to switch off for reduced motion. If any are added, the global rule at `index.css:136` already neutralises them.

## 6. Testing, omissions, cuts and ordering

### 6.1 Steps that cannot be tested in Vitest's node environment as written

`vite.config.ts:20` sets `environment: 'node'`; `scaffold.test.ts` asserts there is no `document`.

| Plan step | Why not | What to do |
| --- | --- | --- |
| Task 2: "no description states a property the cited section does not" | A judgement about prose against a web page | Make it a review checklist item with the quoted sentence from the source beside each description |
| Task 4: "roving focus so the grid is one tab stop", arrow keys moving focus | Needs focus and key events | Browser script. `move()` is pure and tested; the handler is five lines |
| Task 4: legibility, both themes, both sizes, no sideways scroll | Needs layout | Browser script and screenshots |
| Task 4 and 5: "Verify in the browser" | Needs a browser | Say which script and where it lives. Playwright is in `.superpowers/tools/browser-check`, outside the repo, as in phase 2 |
| Task 7: read PubChem's unit labels in a headless browser | Network and a browser | A one-off research script; see ordering |
| Spec 9: "no network requests after load", "no console errors" | Needs a browser | Browser script (the prototype's `focus.cjs` does both) |

What can be tested in node and the plan does not ask for: the page's markup. `renderToStaticMarkup` inside a `MemoryRouter` works (`proto/src/app/explore/elements/page.test.ts`, 3 of 3 pass): two grids, 118 cell links, exactly one `tabindex="0"`, `aria-current="page"` and the full name on the selected cell, the not-found page for an unknown symbol. `cards.test.ts` already tests the inspector this way.

### 6.2 Missing test cases

- Task 1: meitnerium's configuration qualifier; nitrogen's and fermium's core spacing; nihonium has no oxidation states (the one empty cell).
- Task 2: derived shells equal the curated `shells` for the 11 elements; the configuration display function accepts core notation.
- Task 4: `move` reversibility and reachability; Home and End on the detached rows; every column at the gap. `cellLabel` for an f-block element (no group), with a unit, and when highlighted. `isHighlighted` returns false for every element when the highlight is null. `trendScale` for density (extreme range) and for a property whose lowest value is shared.
- Task 5: fluorine's radius (curated 1.47 Å, PubChem 135 pm) shows both; hydrogen and xenon get a spectrum and carbon does not; an element with no curated record shows no "individually sourced" line; nihonium's oxidation states read "not measured".
- Task 6: no molecule id equals `elements`; palette item ids stay unique at 159; `Xe` ranks xenon above xenon tetrafluoride.
- A registry-style test that `element-index.json` equals the names and symbols of `periodic-table.json`, as `libraryIndex.test.ts` does for molecules.

### 6.3 Missing tasks

- **About page.** `About.tsx:36` says "Every chemistry value in Valence is curated by hand". That stops being true. The spec's own section 2 records the change of rule; the page must too.
- **Home page.** `Home.tsx:22` says search "jumps to any molecule, lab or page", and the explorer card does not mention the table.
- **Navigation between the two Explore pages** is in Task 6, so the page built in Task 4 cannot be reached except by typing its address until two tasks later. Move the two links into Task 4.
- **The palette's field label and placeholder**, and an entry for the table page itself.
- **The source record.** `pubchem-ptable`'s citation reads "(Pauling electronegativity column; …)" because it was written for one column. It is generated from `docs/research/phase-2/elements.json` through `build-chem-data.mjs:160`. The plan says to reuse the entry and does not say to reword it or where.
- **The text-list alternative** has one clause in Task 4 and no specification.
- **Reduced motion** has no step. One line is enough: "no transitions or animations on the table; checked with reduced motion on".
- **`docs/for-institutions.md`** needs more than the faculty paragraph: its accessibility section lists what was checked by script, and the table adds a new keyboard pattern and "text contrast has not been measured" is no longer wholly true for this page.
- **The not-found path** is mentioned in Task 4 but has no test.

### 6.4 What could be cut without losing a spec requirement

- `unit` on every value (see 1.4): harmless, keep.
- `cells()` as an export: the page can map over `periodicTable` and `elementPosition`. Keep only if the page uses it.
- A separate route for the bare table: one optional-segment route.
- Three highlight controls: one `<select>` with option groups.
- Page Up and Page Down: APG marks them optional; leave them out.
- A custom Enter handler: none is needed.
- The "beside on wide screens" layout: one layout fewer, if the owner agrees.
- `aria-rowindex` and `aria-colindex`: not needed.

### 6.5 Ordering

- **Units.** Spec 5.1: "the plan confirms each unit against PubChem's documentation before any value is displayed". The plan confirms them in Task 7, after Tasks 4 and 5 display them. Move the confirmation into Task 1.
- **Notes.** Task 3 says an unresolved disagreement "becomes a `note` on that element's record through the build script". Task 1's `PeriodicElement` has no such field and the schema is strict, so the record would be rejected. Add `notes?: string[]` in Task 1.
- **Links.** As above: Explore and table links belong in Task 4.
- **Bundle baseline.** Task 6 reports "before and after". Record the "before" in Task 1, before any code lands: 368,766 + 116,533 bytes raw today.
- **Cross-check before the card.** Task 3 before Task 5 is right. It should also run before the chemistry review of Task 1's data is called done.

## What could not be checked

- No screen reader was run. Roles, names and structure were read from Chromium's accessibility tree; what NVDA, JAWS or VoiceOver actually say (in particular on crossing from one grid to the other, and whether the long computed row names are read) is inferred from the specifications.
- Colour-blind separability is simulated (Machado 2009), not tested with people.
- Chromium only. `color-mix`, container-query units and `repeating-linear-gradient` in Firefox and Safari were not run.
- Forced colours was Chromium's emulation, not a Windows contrast theme.
- The 2523 px measurement assumes 2523 CSS pixels; the owner's display scaling is unknown.
- Touch and a real 400 px device were not tested.
- That two route objects sharing a component do not remount is observed in react-router 8.4.0 and React 19.3, not guaranteed.
- I did not review the chemistry: PubChem's categories, units, the 15-wide f block, or lawrencium's configuration. Those belong to the other reviewers.
