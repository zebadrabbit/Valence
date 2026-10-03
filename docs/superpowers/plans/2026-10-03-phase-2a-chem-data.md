# Valence Phase 2A (Chemistry Data and Derived Values) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the chemistry data for the molecule explorer (11 elements, 33 structure files, 2 molecular orbital diagrams) and the pure functions that derive and describe values from it, with every value cited and tested.

**Architecture:** This plan adopts a prototype that already exists, has been reviewed, and passes its tests: the local branch `spike/phase-2a` (15 commits on top of `main` at `1cd2920`). Two build scripts turn the verified research files in `docs/research/phase-2/` into JSON under `src/chem-data/`; pure TypeScript in `src/chem-data/` derives oxidation state, geometry, hybridization, bond properties, lone-pair directions, MO bond order, and a screen-reader description. No user interface changes, apart from the About page now listing real sources. The 3D viewer and inspectors are plan 2B.

**Tech Stack:** TypeScript 6, zod 4, Vitest 5, Node 24 ES-module scripts with no dependencies. No new runtime dependency.

**Spec:** `docs/superpowers/specs/2026-10-03-valence-v1-design.md`, sections 5 and 6 (as revised on 2026-10-03).

**Branch:** work continues on `spike/phase-2a`, renamed to `phase-2a-chem-data` in Task 1.

## What the prototype contains

Verified on the branch at `06e90d2`: lint clean, 407 of 407 tests, type check clean, production build succeeds, and both data scripts regenerate byte-identical output.

| Piece | Files | What it does |
| --- | --- | --- |
| Geometry maths | `src/chem-data/geometry.ts` | `distance`, `angleDeg`, signed `dihedralDeg` on plain number tuples |
| Schemas | `src/chem-data/schema.ts` | `elementSchema`, extended `moleculeSchema` (charge, formula, cited measurements, notes), `moDiagramSchema`; all strict |
| Build script | `scripts/build-chem-data.mjs` (`npm run build:data`) | Generates `elements.json`, `sources.json`, `mo-diagrams.json`, and `molecules/<id>.json` from the research files; fails loudly on anything unexpected |
| Data | `src/chem-data/elements.json`, `molecules/*.json`, `mo-diagrams.json`, `sources.json` | 11 elements, 33 structures, 2 MO diagrams, 41 sources |
| Validator | `src/chem-data/validate.ts` | Adds: unknown element; formal charge consistent with lone pairs and bonds; charges sum to the species charge; cited lengths, angles, and dihedrals reproduced by the coordinates (0.01 Å, 1°); every bond of an experimental molecule has a cited length; MO diagram electron count |
| Derived values | `src/chem-data/derive.ts` | Per atom: oxidation state, steric number, geometry, hybridization and note. Per bond: σ/π, Pauling difference, length, displayed order |
| Answer key | `scripts/build-expected-fixture.mjs` (`npm run build:expected`), `src/chem-data/expected-values.fixture.json` | The research table converted to the project's conventions, with a printed audit of the 11 atoms it changes |
| MO functions | `src/chem-data/mo.ts` | `bondOrder`, `unpairedElectrons` |
| Lone pairs | `src/chem-data/lonePairs.ts` | Unit vectors for an atom's lone pairs from its bonds and ideal geometry |
| Description | `src/chem-data/describe.ts` | `describeMolecule`: plain text for screen readers |

The prototype was built by three implementers in sequence, then reviewed by a combined chemistry and engineering reviewer (no wrong chemistry value found; four Important findings, all fixed and re-checked).

## Global Constraints

- `src/chem-data/` and `src/engine/` never import React, Three.js, or `src/app/`, and never use `document`, `window`, `fetch`, or `XMLHttpRequest`.
- Every chemistry value has a source: a record-level `sourceId` or `{ value, sourceId }`. Authored structure and derived values are exempt. All zod schemas are strict.
- Generated JSON is never edited by hand. Change `scripts/build-chem-data.mjs` or `scripts/build-expected-fixture.mjs` and re-run them; after a re-run, `git status --short` shows only intended changes.
- The answer key comes from `docs/research/phase-2/expected.json`, never from `derive.ts`.
- The spec's conventions (section 6.3) bind every displayed value: oxygens are not given the resonance override; amide and urea nitrogens are sp² and trigonal planar; terminal singly bonded atoms other than hydrogen are "not assigned (terminal atom)".
- TypeScript stays on major version 6. No new runtime dependency.
- The repo will become public: no local paths, personal details, or institution-specific text.
- Tests import from `vitest` explicitly and run in the node environment. Existing tests are not weakened or deleted.
- `npm run lint` and `npm run build` pass before every commit.

## Review Focus

1. **A molecule file that is internally consistent but chemically wrong** (for example a formal charge on the wrong oxygen of a zwitterion): the validator's arithmetic cannot see it. Pinned by the answer-key comparison for all 33 structures and the named cases in `derive.test.ts`; Task 3's reviewer re-checks a sample by hand.
2. **An experimental molecule whose coordinates drift from the cited values:** rejected by the validator's reproduction check (tests in `validate.test.ts`).
3. **A molecule added later with a shape the lone-pair function does not cover:** `lonePairDirections` throws a clear error, and a test asserts no library atom is unsupported.
4. **Screen-reader text that states a drawn resonance form as fact:** pinned by `describe.test.ts` for sulfur dioxide and the glycine zwitterion.
5. **Display strings that teach something wrong** (formula order, names, 2D shape of a bent molecule): Task 2 fixes the known ones and adds a test for each.

## File Structure

Task 2 touches only these files; everything else on the branch is adopted as it stands.

| File | Change |
| --- | --- |
| `scripts/build-chem-data.mjs` | Names, formulas, SO₂ 2D positions; import the SDF parser from `scripts/` |
| `scripts/parse-sdf.mjs` | New: the parser moved out of `docs/`, lint-clean, with no CLI side effects |
| `src/chem-data/molecules/*.json` | Regenerated |
| `src/chem-data/lonePairs.ts`, `lonePairs.test.ts` | CO₂ lone pairs in perpendicular planes |
| `src/chem-data/validate.ts`, `validate.test.ts` | Variant fields must come as a pair; duplicate bonds rejected |
| `src/chem-data/describe.test.ts`, `registry.test.ts` | Updated expectations for names and formulas |
| `docs/research/phase-2/README.md`, `README.md` | Wording |

---

### Task 1: Adopt the prototype branch

**Files:** none changed.

**Interfaces:**
- Consumes: local branch `spike/phase-2a` at `06e90d2`.
- Produces: branch `phase-2a-chem-data`, verified.

- [ ] **Step 1: Rename the branch and confirm its base**

```bash
git checkout spike/phase-2a
git branch -m phase-2a-chem-data
git merge-base main phase-2a-chem-data
```

Expected: the merge base is the current tip of `main`. If `main` has moved, run `git rebase main` and resolve nothing by hand in generated files: re-run the two data scripts instead.

- [ ] **Step 2: Verify**

```bash
npm install
npm run lint
npm run build
npm run build:data && npm run build:expected && git status --short
```

Expected: lint prints nothing; the build reports `Tests  407 passed (407)` and `✓ built in`; `git status --short` prints nothing after the two scripts (the generated files are reproducible).

---

### Task 2: Presentation fixes left open by the prototype review

**Files:** see File Structure.

**Interfaces:**
- Consumes: `scripts/build-chem-data.mjs` and its authored tables; `lonePairDirections` in `src/chem-data/lonePairs.ts`; `validateRegistry`.
- Produces: no signature changes.

Each fix follows the same cycle: write or change the test, run it to see it fail, make the change at its source, regenerate if data changed, run `npm run lint` and `npm run build`, commit.

- [ ] **Step 1: Display names**

In the authored names table of `scripts/build-chem-data.mjs`: O₂ becomes "Oxygen (O₂)", N₂ becomes "Nitrogen (N₂)", so the molecule is not confused with the element on the atom card; HCO₃⁻ becomes "Bicarbonate ion". Update the pinned strings in `src/chem-data/describe.test.ts` and `registry.test.ts`. Add a test in `registry.test.ts`: no molecule's `name` equals any element's `name`.

Commit: `Give O2, N2 and bicarbonate names a learner will recognise`

- [ ] **Step 2: Condensed formulas for organic molecules**

In the authored formulas table, use the condensed forms general chemistry texts print:

| Molecule | Formula |
| --- | --- |
| ethane | C2H6 |
| ethene | C2H4 |
| ethyne | C2H2 |
| ethanol | C2H5OH |
| acetic acid | CH3COOH |
| acetone | CH3COCH3 |
| formaldehyde | CH2O |
| methylamine | CH3NH2 |
| ethyl acetate | CH3COOC2H5 |
| acetamide | CH3CONH2 |
| benzene | C6H6 |
| β-D-glucopyranose | C6H12O6 |
| glycine | NH2CH2COOH |
| glycine zwitterion | NH3CH2COO |
| alanine | CH3CH(NH2)COOH |
| alanine zwitterion | CH3CH(NH3)COO |
| urea | CO(NH2)2 |
| carbonic acid | H2CO3 |

The build script's existing check compares a formula's element counts with the atom list. Extend its formula parser to handle one level of parentheses with a multiplier, and add a test in `registry.test.ts` that every registry formula's element counts equal its atom list, including the parenthesised ones. Inorganic formulas (H2O, NH3, HCl, SO2, SF6, XeF4, PCl5, BF3, H2O2, CO2, CH4, O2, N2, H3O, HCO3) stay as they are.

Commit: `Use condensed formulas for organic molecules`

- [ ] **Step 3: Sulfur dioxide is bent in the Lewis view**

PubChem's 2D record draws SO₂ as a straight line, which would show the VSEPR showcase's bent molecule as linear. Add an authored 2D override for `sulfur-dioxide` in the build script: S at `[0, 0]`, the oxygens at `[-0.866, -0.5]` and `[0.866, -0.5]` (a 120° angle, unit bond lengths, in the same drawing units as the other files). Test in `registry.test.ts`, using `angleDeg` with z = 0: the 2D O–S–O angle of sulfur dioxide is between 110° and 130°, and the 2D O–C–O angle of carbon dioxide is 180° ± 1°.

Commit: `Draw sulfur dioxide bent in its 2D layout`

- [ ] **Step 4: Carbon dioxide lone pairs in perpendicular planes**

In `src/chem-data/lonePairs.ts`, a terminal atom with a double bond whose neighbour has no other bond off the axis currently falls back to one fixed plane, so both oxygens of CO₂ get lone pairs in the same plane. When the neighbour's only other bond is collinear and belongs to another terminal double-bonded atom, place the two atoms' lone-pair planes at 90° to each other (deterministically: the lower atom index keeps the fallback plane, the other is rotated 90° about the molecular axis). Test in `lonePairs.test.ts`: for carbon dioxide the normal of oxygen A's lone-pair plane is perpendicular to the normal of oxygen B's (dot product within 0.01 of 0), and each lone pair still makes 120° ± 1° with its C=O bond. Remove the `ponytail:` comment that recorded this limit.

Commit: `Put the lone pairs of carbon dioxide's oxygens in perpendicular planes`

- [ ] **Step 5: Move the SDF parser into scripts/**

Create `scripts/parse-sdf.mjs` exporting only the parse function the build script uses (no command-line entry point, no file writing), passing `npm run lint`. Point `scripts/build-chem-data.mjs` at it. Leave `docs/research/phase-2/parse-sdf.mjs` in place as the research record. Run `npm run build:data`; `git status --short` shows no change to any generated file.

Commit: `Move the SDF parser used by the build into scripts/`

- [ ] **Step 6: Two validator gaps**

In `src/chem-data/validate.ts`, with one failing and one passing test each in `validate.test.ts`:

- a molecule with `variantGroup` but no `variantLabel`, or the reverse, is an error: `molecule "<id>": variantGroup and variantLabel must be given together`;
- two bonds joining the same pair of atoms is an error: `molecule "<id>": duplicate bond <a>-<b>`.

Commit: `Reject unpaired variant fields and duplicate bonds`

- [ ] **Step 7: Wording**

In `docs/research/phase-2/README.md`, replace "The hand-written expected-values table" with "The expected-values table (written from the research and checked by script and by a second reviewer)". In `README.md`, update the Status section to say phase 2A (chemistry data) is built and phase 2B (the 3D explorer) is next, and add `npm run build:data` and `npm run build:expected` to the Development commands with one line each.

Commit: `Update README and research notes for phase 2A`

- [ ] **Step 8: Final check for the task**

```bash
npm run lint
npm run build
npm run build:data && npm run build:expected && git status --short
```

Expected: lint prints nothing; all tests pass; `git status --short` prints nothing.

---

### Task 3: Whole-branch review and sign-off

**Files:** none, unless the review finds something.

- [ ] **Step 1: Whole-branch review**

One reviewer on the most capable model reviews `main..phase-2a-chem-data` against spec sections 5 and 6 and this plan's Review Focus. It re-checks by hand, against the spec's rules, the answer-key entries and generated files for: acetic acid, acetamide, urea, both zwitterions, bicarbonate, sulfur dioxide, SF₆, XeF₄, PCl₅, benzene, and β-D-glucopyranose; and reads every display string a learner will see (names, formulas, notes, hybridization strings, the description sentences).

- [ ] **Step 2: Fix wave**

One fix dispatch for all Critical and Important findings, then one scoped re-review.

- [ ] **Step 3: About page check**

The About page now lists 41 sources. Run the app (`npm run build && npm run preview`) and confirm in a headless browser that the About page renders the list, every source link is an `http(s)` URL, there are no console errors, and there is no sideways scroll at 1366×768 or 400×800.

- [ ] **Step 4: Planka**

Move the Phase 2A cards to Done and record the items left for plan 2B.

## Left for plan 2B

- The About page imports the whole registry, so the main bundle is 527 kB (157 kB gzipped) and trips Vite's size warning. Split it when the Explore route exists.
- Ionization energies lose trailing zeros as numbers (71.6200 becomes 71.62); format them in the UI. Atomic weights too: CIAAW publishes hydrogen as 1.0080 and sodium as 22.990, stored as 1.008 and 22.99; show five significant figures.
- The zwitterion formulas are stored bare ("NH3CH2COO"). Render them with their charges ("⁺NH₃CH₂COO⁻"), for example from an optional authored display formula.
- The amide and urea nitrogen lone pair is one direction; the hybrid-lobe view must decide how to draw a p orbital.
- The O₂ callout text (Lewis shows all electrons paired; the MO diagram shows two unpaired) is authored in the UI.
- Four VSEPR rows no library molecule uses (seesaw, T-shaped, linear with three lone pairs, square pyramidal) stay in the lookup with their tests.

## Not verified by anyone

- Cordero 2008 covalent radii, Bondi's van der Waals radii as tabulated in Mantina 2009, and Shannon 1976 ionic radii were read only through secondary copies that agree with each other. A person with library access should open the three papers before the repo goes public.
- The xenon electronegativity (2.6) has no traced primary source; it is stored with a note saying so.
