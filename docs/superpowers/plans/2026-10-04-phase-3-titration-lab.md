# Phase 3 (Titration Lab) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The titration lab of spec section 7. A learner standardizes a sodium hydroxide solution against hydrochloric acid on a drawn bench, in Guided or Challenge mode, has each trial checked against a seeded model, and finds the run still there after a reload. With it come the lab shell that phase 4 reuses, the list of labs, and the lab page for a narrow window.

**Architecture:** Three layers, each depending only on the one before it. `src/chem-data/titration/` holds the lab's record (three bottles, cited constants, model parameters with their rationale), written by the build script from an authored input and checked against kept copies of its sources, and the primer. `src/engine/titration/` is a pure state machine on whole numbers: its state is the stored record, and it owns every rule about what can be done when, every typed-entry rule, the checklist and each trial's outcome. `src/app/lab/` is the shell shared with phase 4. `src/app/lab/titration/` holds the drawings, the wording, the stream timer, the notebook and one page controller, and reaches the engine only through its index.

**Tech Stack:** unchanged (TypeScript 6, React 19, react-router 8, Tailwind 4, zod 4, Vitest 5, ESLint 10). No new dependency.

**Spec:** `docs/superpowers/specs/2026-10-03-valence-v1-design.md`, section 7 as amended on 2026-10-04 (its acceptance checks are numbered 1 to 13 in 7.4), with sections 4, 5, 10, 11, 12, 13 and 14.

**Research record** (read the parts your task names before starting): `docs/research/phase-3/`

| File | Holds |
| --- | --- |
| `endpoint-spike.md` | The feasibility proof of the endpoint test, and its independent check |
| `design/engine.md` | The engine and data design: behaviour (section 4), every prototype test value (5.2), the prototype's report (5.3) |
| `design/bench.md` | The bench design: the drawings and their geometry (6), colour (7), accessibility (9), the pure modules' test tables (10) |
| `design/shell.md` | The shell, notebook, content and storage design: the primer in full (7.2), wording drafts (5.5), test tables (9) |
| `design/integration.md` | The three designs joined: what was run (1), each conflict resolved (2), gaps (3), draft sentences (4.4), cuts (5) |
| `design/review-verdicts.md` | Each design's reviewer corrections |

**Order of authority:** the owner decisions below; then the spec; then `integration.md`; then the reviewers' corrections; then the designs. Interfaces are taken from this plan only. The design files are read for reasons and for prototype outputs; where a name or a shape in one of them differs from this plan, this plan stands.

**Owner decisions** (2026-10-04; each overrides any recommendation in the record that differs):

| # | Decision |
| --- | --- |
| D1 | A failed trial still shows its signed percent error. A trial counts toward the three only if both typed burette readings were within 0.02 mL of the true meniscus, the recorded HCl molarity is the label's, and (the owner's answer at Gate A, 2026-10-05) no technique cause is named in it: burette not conditioned, tip bubble, pipette not rinsed. Such a trial can still be within 1.0%, because two mistakes can cancel and part of a bubble is small; it is shown as passed and not counted. Feedback on a passing trial that does not count says why |
| D3 | Accepted simplifications: an unconditioned burette stays 2.0% dilute through refills until conditioned (not true to a bench; the documentation says so); a wet pipette spoils only the first aliquot drawn with it; an escaped tip bubble does not return at a refill; the stopcock stays shut until the flask has 2 or 3 drops of indicator; distilled water is free of CO₂ and capped at 30 mL a trial |
| D4 | The HCl bottle carries the GHS entry for hydrochloric acid, the solution, not the one for hydrogen chloride gas. The indicator is recorded as 0.5% weight per volume and cites a reagent catalogue listing that was fetched and read. The listing prints the basis, 0.5% (w/v), so the basis is not assumed of the listed product; what is assumed, and said in a note, is that this lab's bottle is that kind of solution (reworded 2026-10-05, once the listing had been read). **The listing is cited, not kept** (the owner's answer at Gate A, 2026-10-05): the copy that was in the sources folder is out of the repository, the manifest says what the page printed on 2026-10-04 and where, and the figure rests on that reading; the build no longer checks it against a copy. Hazard notes are drafted from fetched sources and read by the owner at Gate A |
| D5 | The final reading needs a swirl and wait that showed the pink lasts. A flask can be discarded and the trial started again. The 50.00 mL mark with no persistent pink is invalid even when water was added last. No further trial after the third that counts |
| D6 | The molarity is typed once per trial, to exactly four decimal places, and accepted only when it is the learner's own HCl molarity × 25.00 ÷ their own titre, correctly rounded. A value cut off instead of rounded is refused with a sentence that says to round. At an exact tie both neighbours are accepted (Q1 below, answered 2026-10-04) |
| D7 | The mode can change between trials, not during one. No trial is labelled with a mode |
| D9 | One HCl bottle, its label always readable. Step 1 is to read the label and record its molarity |
| D13 | K_w is 1.0×10⁻¹⁴ citing IAPWS R11-24, with a note giving the printed pK_w and the conversion. No OpenStax copy is kept |
| D14 | The narrow limit stays at 768 px. The notice and the institution text say that at 200% zoom on a small screen the bench is not shown |
| D16 | Average and relative deviation are entered by the learner on completion, over the three trials that count. The notebook's own are shown beside them. Nothing is marked |
| D8, D10, D11, D12 | Stream and pours, where the notebook goes, the meniscus view, how pink: the values in this plan are starting values. The owner judges them by eye at the browser checks and reads three meniscus levels at the first one |
| D15 | The owner reads the primer and the hazard notes at Gate A |
| D2 | The OpenStax licence question is not phase 3 work (see the last section). New work quotes no OpenStax text and makes no claim about OpenStax's licence |
| Taken as decided | Additions are exact, so counting presses gives the titre. The export file holds the seed. Refilling between trials is taught and not forced. A comma is not a decimal mark |

**Q1 was answered by the owner on 2026-10-04: both neighbours are accepted at an exact tie.** The plan was already written to that answer, so nothing below changes. The question as it was put:

| # | Question | What this plan is written to until it is answered |
| --- | --- | --- |
| Q1 | D6 says "correctly rounded" and not what that means when the unrounded molarity ends in exactly 5 in the fifth decimal place. Label 0.0972 M with a 24.00 mL titre is exactly 0.10125: rounding a half up gives 0.1013, rounding a half to even gives 0.1012, and both are taught. Of the 47 868 label and titre pairs whose result lies in 0.0950 to 0.1050 M, 9 are such ties | Both neighbours are accepted at an exact tie. This is the half-unit rule of `engine.md` and of `integration.md` C18, and a learner who rounded by either convention is then never told to stop cutting the number off. Its cost: at those 9 ties the cut-off value is the lower neighbour, and it is accepted. If the owner answers "a tie rounds up": Task 5's rule leaves out the lower edge and its tie cases become 0.0938 true, 0.0937 false, 0.1013 true, 0.1012 false; the primer's `calculation` card (Task 10) and the `calculation-mismatch` sentence (Task 11) say that a 5 rounds up; spec 7.3 and 7.4 check 6 are changed to say so. Either way the answer replaces this row as a decision |

**Branch:** `phase-3-titration-lab`.

## How this plan is written

Earlier phases showed that plan code written without being run is where defects come from. This plan fixes interfaces, data rules, exact test cases and done-when checks, and leaves each implementation to be written test-first by its implementer. Every task ends with `npm run lint` and `npm run build` passing and a commit.

Browser looks before the page is whole (Tasks 16 to 19) use one throwaway harness, `.superpowers/tools/phase3-harness/`: a small page that mounts the lab's real components, with the app's stylesheet, on the real engine. Task 16 starts it and Tasks 17 to 19 extend it. The folder is ignored by ESLint and kept out of git by the working copy's own exclude file, not by `.gitignore`, so `git status` is looked at for it before each commit.

Where the expected values come from:

- **Prototype values.** Most are outputs of the three design prototypes as their reviewers corrected them. Every seed-dependent value holds only under the draw rule Task 1 fixes. The engine prototype draws with the repository's own `mulberry32` in that order, so its values for seed 1 carry over; the values for seeds 11 and 1384 and for trial index 3 of seed 1 were read from the same prototype while this plan was written.
- **Worked values.** Where an owner decision changes a value or adds a case, the plan shows the arithmetic beside it so a reviewer can check it by hand.
- **Invariants.** Where a behaviour was never prototyped (discarding a flask, the mode gate, the checklist's four states, the end of a trial judged after water) the case is marked *invariant* and gives the property to test, not a number read from a run.

An expected value that does not reproduce is a finding to report to the owner. It is never a number to change in the test.

## Global Constraints

- **Purity.** `src/engine/` and `src/chem-data/` never import React, three, or `src/app/`, and never use `document`, `window`, `fetch` or `XMLHttpRequest`. Nothing is fetched at runtime.
- **Determinism.** `src/engine/` never calls `Math.random` and never reads the clock. All variation comes from `mulberry32(seed)`. The seed is drawn in `src/app/`. The stream's timer, in `src/app/`, is the only clock in the lab; simulated time is a count the engine is handed.
- **Whole numbers.** Volumes are whole microlitres, molarities whole units of their last digit (`E4`, `E5`, `E6` in a name gives the scale), and every comparison that decides a reading, an overshoot or a grade is whole-number arithmetic. The one floating-point judgment is whether the mixed flask is pink. Typed text is parsed from its characters, never through a float.
- **Sources.** Every chemistry value shown to a learner or used by the model is stored in `src/chem-data/` with a `sourceId` that exists. A model parameter is `{ value, rationale }` and its rationale is a full sentence a reviewer can judge. No cited constant is adjusted to pass a test; only `faintPinkConcentration` is tuned.
- **Generated data.** `src/chem-data/titration/titration.json` and `src/chem-data/sources.json` are written only by `npm run build:data` from the authored input and the manifest. CI runs `build:data`, `build:expected` and `cross-check` and fails on any diff, so after a run `git status` shows only the intended files changed and every earlier generated file is byte-identical.
- **No quotation.** Nothing this phase writes quotes a source: not the primer's `support` lines, the manifest, a note, a rationale, a document or a comment. A passage is given by its location and by a statement in the project's own words of what it establishes. OpenStax is included, and no new text says what OpenStax's licence is. Two things are stored as printed because they are data, not prose: the digits of a `published` figure, and a GHS hazard statement with its code. A kept copy of a fetched file is a file with its attribution, as in `docs/research/periodic-table/sources/`. From Gate A a test holds the primer and the hazard notes to this: neither repeats six words running of a page it rests on. **The check is local.** It compares against a fingerprint of the pages that `scripts/fingerprint-sources.mjs` writes and `.gitignore` lists, because stretches of the pages can be rebuilt from it a word at a time; the pages themselves are not kept either. So the test runs on a machine where the fingerprint has been made and is skipped, visibly, where it has not, CI included. Whoever changes the primer or a hazard note makes the fingerprint first and runs the test; CI does not hold the rule.
- **Keyboard.** Every action works by keyboard. No action depends on timing or on holding a key. An unavailable button stays focusable (`aria-disabled`) and says why when pressed. An unavailable field is `disabled`, with its reason as visible text tied to it by `aria-describedby`.
- **Colour is never the only signal.** The flask's colour, the plume's cue, a step's state and a trial's result are always also words.
- **Reduced motion.** Under it nothing animates: no plume, no falling drop, no transition. The app's setting decides, not the media query alone.
- **No answer leaves the engine.** `src/app/` imports `@/engine/titration` (the index) and nothing below it. No screen, message or selector output states the equivalence volume, a pH, the expected titre, the true meniscus as a number, or the NaOH molarity before completion. Until the flask is pink no selector hands over a number the equivalence volume or the NaOH molarity can be worked back from: the plume leaves the engine as its status alone, and the pink concentration as 0 (Task 7). Three numbers the app must have in order to draw are handed over and never printed: the meniscus level; the flask's volume, which is exact, so that less what the learner put in it is the pipette's delivery; and the pink concentration of a flask that is already pink, which with the record's constants gives the NaOH molarity. Someone who reads the last two out of the page can work those two hidden values back (Gate A, F6 and N9: exact at 400 of 400 seeds). That is accepted, as the comment at the head of `select.ts` says: neither makes a trial count, which takes honest readings and the notebook's own arithmetic, and a failed trial's percent error gives the same molarity by D1. The app draws with these numbers and never renders them as text (Task 17).
- **Lazy.** No app file outside `src/app/lab/titration/` statically imports anything under it, under `src/engine/titration/` or under `src/chem-data/titration/`, types and test files apart. The route loads the page lazily, and Home reads a lab's status with `peekStatus` only.
- **No new runtime dependency.** All schemas are strict and use only the zod features `schema.ts` already uses, and `.max()` on numbers for the stored record's bounds.
- **Public repository.** No local paths, personal details or institution-specific text. No compliance claim in any copy.
- **Tests.** Tests import from `vitest` explicitly and run in the node environment. Existing tests are not weakened or deleted; the sanctioned changes are named in the task that makes them (Tasks 3, 9 and 15).
- **Green before every commit.** `npm run lint` and `npm run build` pass before each commit. `npm run build` runs the linter, the tests, the type check and the production build, and CI runs it on every pull request and on every push to `main`, so no task commits a failing test.

## Review Focus

Five ways this lab could hurt a learner that no single task's tests exercise. Each is tied to the task that owns it; a reviewer of the whole branch looks at these first.

1. **Chemistry that is consistent and wrong.** The tests hold the engine to the stored constants and the sentences to their own structure; neither can see a constant of the wrong kind, a hazard statement under the wrong entry, or a primer sentence a lab instructor would not say. Owned by Task 2 (data) and Tasks 10, 11, 12 and 13 (words); Gate A is the only check.
2. **A meniscus a person cannot read.** The whole lab rests on reading 0.01 mL from a drawing, and so far only a model has read it from screenshots. The geometry tests of Task 12 prove where the lines are, not that an eye can use them. Owned by Task 16, at browser check 1.
3. **An answer that leaks, or a pass that is not honest.** The percent error of one failed trial gives the hidden molarity. D1 closes the route through typed readings, but the same answer can escape through a selector that carries a hidden value to the screen, a passing trial that prints its percent error, a mode change used as a meniscus oracle, or a sentence that names a volume. Owned by Task 7 (the public surface and the counting rule), with Tasks 6, 11 and 20.
4. **A dead end or lost work.** An open trial with nothing left to do, a Guided warning that loses focus with no way on, a stream addition delivered after the learner closed the stopcock, or one that a reload gives back. Owned by Task 6 (every open trial can be ended) and Task 18 (the stream; its browser check closes Task 19), with Tasks 8 and 21.
5. **Words and picture that disagree.** The status line says colourless while the flask is drawn pink, "pink persists" arrives an addition before the colour, the meniscus in words describes a level the drawing does not show, or a tile says "filled" over an empty burette. A learner who relies on the words is then taught something false. Owned by Task 13 (the join), with Tasks 12 and 17.

## File Structure

| File | Responsibility |
| --- | --- |
| `docs/research/phase-3/titration.json` | Authored input: the three bottles, each constant with the figure its source prints, each parameter with its rationale |
| `docs/research/phase-3/sources/` | `MANIFEST.json` (every source of the lab; a source's `alsoKept` lists a second kept copy of the same record, fetched from another address), `README.md` (attribution, and what is not kept and why), the kept copies. Written here and not kept, from Gate A: `quotation-fingerprint.json`, a hash of every six-word run in the pages the primer and the hazard notes rest on. It is in `.gitignore`: text can be read back from it a word at a time |
| `.gitattributes` | Checks the kept copies out byte for byte, with no line-ending conversion, so the build's sha256 check holds on every machine |
| `docs/research/phase-3/gate-a.md`, `gate-b.md` | What each gate found and what was done about it |
| `scripts/build-chem-data.mjs`, `scripts/titration-lib.mjs` | `buildTitration()`; its checks as plain functions, so they can be tested |
| `scripts/fingerprint-sources.mjs`, `src/chem-data/titration/quotation.test.ts` | From Gate A: writes the fingerprint from pages saved outside the repository; holds the primer and the hazard notes to the no-quotation rule where the fingerprint is present, and skips those cases where it is not |
| `src/chem-data/schema.ts`, `support.ts`, `validate.ts`, `citations.ts` | `hazardsSchema` exported with a cited note; `located` moved out of `periodic.ts`; `validateTitration`; `titrationCitations` |
| `src/chem-data/titration/titration.json`, `data.ts`, `fixture.ts`, `primer.ts` | Generated record; its schema and `titrationData`; for tests only, a complete record on sources of its own (`titrationFixture`, `titrationFixtureWith`, `FIXTURE_SOURCES`), which the schema, validator and citation tests share; `TITRATION_PRIMER` |
| `src/engine/ph.ts` | The pH solver |
| `src/engine/titration/` `model.ts`, `pinnedModel.ts`, `setup.ts`, `flask.ts`, `state.ts`, `entries.ts`, `actions.ts`, `select.ts`, `index.ts`, `testkit.ts` | The model's numbers; the literal the tests run on; what the seed fixes; flask chemistry; the stored record; typed entries; `can`, `warnings`, `reduce`; selectors; the public surface; scripted learners for tests |
| `src/titration-version.test.ts` | Pins the judged values and the stored shape together with the entry's version |
| `eslint.config.js`, `src/lint-rules.test.ts` | The rule that keeps `src/app/` out of the engine's internals |
| `src/app/useMediaQuery.ts`, `activities.ts`, `routes.tsx`, `pages/Lab.tsx`, `progress/storage.ts` | The hook, moved; the lab's address; the list of labs; the not-saving notice rule |
| `src/app/lab/` `lab.css`, `shellText.ts`, `LabShell.tsx`, `ModeSwitch.tsx`, `Primer.tsx`, `Hazards.tsx`, `useLabProgress.ts` | Shared with phase 4 |
| `src/app/lab/titration/` `format.ts`, `messages.ts`, `benchText.ts`, `benchView.ts`, `controller.ts` | Numbers as text; every sentence keyed by an engine identifier; status line and descriptions; the engine's state as the bench sees it; the page's decisions |
| `src/app/lab/titration/` `buretteGeometry.ts`, `meniscusText.ts`, `flaskColour.ts`, `stream.ts` | Pure modules of the drawings and the stream |
| `src/app/lab/titration/` `ReadingView.tsx`, `ReadingInput.tsx`, `TitrationStand.tsx`, `apparatus.tsx`, `StopcockControls.tsx`, `useStream.ts`, `Shelf.tsx`, `TitrationBench.tsx`, `bench.css`, `Guide.tsx`, `Notebook.tsx`, `TitrationPage.tsx` | The components and the page |
| `docs/for-institutions.md`, `README.md`, `src/app/pages/About.tsx`, `Settings.tsx` | Documents and wording |

`controller.ts` is this plan's addition to the integrated layout: it holds the page's decisions as pure functions so that Task 21 carries tests of its own.

## Task order

Tasks 1 to 13, then Gate A, then Tasks 14 to 21, then Gate B, then Tasks 22 and 23. Tasks 12 and 13 come before the gate because they write sentences a learner will see (`meniscusText.ts`, `benchText.ts`), and spec 13 has the gate's reviewer read every such sentence before any screen is built. Task 12 is pure and needs nothing from the engine, so it may run alongside Tasks 5 to 9; Task 13 needs Task 7's selectors and may follow it at once. No component (Task 14 onward) is started before Gate A has closed. The numbering is `integration.md`'s, which put the gate before Task 12; no two tasks were merged. Three were sharpened so that each stands on its own: Task 2 gains a test of its inputs, Task 15 lands the page as a shell so the route has something real to load, and Task 21 gains `controller.ts`.

---

### Task 1: The endpoint test, green

Read: spec 7.1, 7.3, 7.4 (checks 1 to 5); `endpoint-spike.md`; `engine.md` 3.1 to 3.4, 4.1, 4.4, 4.5 and 5.2; `review-verdicts.md` (engine, the task-order correction).

**Produces:**

```ts
// src/engine/ph.ts
export interface AcidSpecies {
  total: number                       // mol/L over all protonation states
  pKas: readonly number[]             // most acidic first; strong acids and bases are not listed
  chargeProtonated: number            // 0 for HA, H2A, H3A; +1 for NH4+
}
export interface Solution { strongCharge: number; acids: readonly AcidSpecies[] }   // strongCharge: Na+ counts +, Cl- counts -
export function protonationFractions(pKas: readonly number[], h: number): number[]  // index k: the form that has lost k protons
export function chargeImbalance(solution: Solution, kw: number, pH: number): number
export function solvePH(solution: Solution, kw: number): number                     // bisection, pH -2 to 16, 60 steps

// src/engine/titration/model.ts   (the type only in this task; modelFrom is Task 4)
export interface TitrationModel {
  kw: number; indicatorPKas: readonly number[]; indicatorMolarity: number; indicatorDropUl: number
  dissolvedCo2: number; carbonicPKas: readonly number[]
  faintPinkConcentration: number
  hclRangeE4: readonly [number, number]; naohRangeE5: readonly [number, number]
  pipetteNominalUl: number; pipetteOffsetUl: number; fillLevelMaxUl: number; buretteCapacityUl: number
  streamUl: number; dropUl: number; halfDropUl: number
  unconditionedStrengthPercent: number; wetPipetteStrengthPercent: number
  tipBubbleUl: number; tipBubbleEscapeUl: number
  overshootUl: number; slowDownUl: number; readingToleranceUl: number
  gradeTolerancePercent: number; molarityRoundingE6: number
  waterStepUl: number; waterMaxUl: number; indicatorDrops: readonly [number, number]
  plumeSlowFrom: number; plumeMixSeconds: number; persistSeconds: number; passesToComplete: number
}

// src/engine/titration/pinnedModel.ts   (imported by tests only)
export const PINNED_MODEL: TitrationModel

// src/engine/titration/setup.ts
export interface LabSetup { hclE4: number; naohE5: number }
export interface TrialSetup { aliquotUl: number; fillLevelUl: number }
export function labSetup(m: TitrationModel, seed: number): LabSetup
export function trialSetup(m: TitrationModel, seed: number, index: number): TrialSetup

// src/engine/titration/flask.ts
export interface Flask {
  hclE4: number; aliquotUl: number; aliquotPercent: number      // 100, or less after a wet pipette
  naohE5: number; titrantPercent: number                        // 100, or less in an unconditioned burette
  indicatorDrops: number; waterUl: number; deliveredUl: number
}
export function equivalenceUl(f: Flask): number
export function compareToEquivalence(f: Flask, offsetUl?: number): number   // -1 before offsetUl past equivalence, 0 there, 1 beyond; exact
export const isOvershot: (m: TitrationModel, f: Flask) => boolean
export interface FlaskChemistry { pH: number; pinkConcentration: number; indicatorConcentration: number; volumeUl: number }
export function flaskChemistry(m: TitrationModel, f: Flask): FlaskChemistry
export const isPink: (m: TitrationModel, f: Flask) => boolean
export type PlumeStatus = 'fades-at-once' | 'fades-slowly' | 'persists'
export interface Plume { fraction: number; status: PlumeStatus; fadeSeconds: number | null }
export function plume(m: TitrationModel, f: Flask, addedUl: number): Plume
```

Rules:

- **The draw.** One `mulberry32(seed)` stream read in a fixed order: draw 1 the HCl label, draw 2 the NaOH concentration, then two per trial (pipette, fill level). Each draw `u` becomes a whole number by `lo + floor(u × (hi − lo + 1))`. `trialSetup(seed, N)` skips `2 + 2N` draws and reads two; it takes no state.
- **Equivalence in whole numbers.** With `acid = 10 × hclE4 × aliquotPercent × aliquotUl` and `perUl = naohE5 × titrantPercent`, a delivered volume is past equivalence by more than `x` µL exactly when `(delivered − x) × perUl > acid`.
- **Flask chemistry.** Spectator charge from the acid and the titrant delivered; the indicator as one two-step acid at `indicatorDrops × indicatorDropUl` of `indicatorMolarity`; carbon fixed at `dissolvedCo2 ×` the aliquot's volume and only diluted afterwards; flask volume = aliquot + indicator drops + water + delivered. The pink form is the doubly deprotonated fraction × indicator concentration. `isPink` is `pinkConcentration >= faintPinkConcentration`, and false with no indicator.
- **Plume.** `fraction = min(1, addition ÷ titrant still needed before the addition)`, and 1 at or past equivalence. `persists` when the mixed flask is pink; otherwise `fades-slowly` when `fraction >= plumeSlowFrom`, else `fades-at-once`. `fadeSeconds = fraction × plumeMixSeconds`, null when it persists. This is the engine's own reckoning and stays below the index: Task 7 hands the app the `status` alone, because `fraction` or `fadeSeconds` after one addition gives the titrant still needed, and so the hidden molarity.
- **`PINNED_MODEL`** holds: `kw` 1e-14; `indicatorPKas` [9.05, 9.5]; `indicatorMolarity` 10 × 0.5 ÷ 318.3; `indicatorDropUl` 50; `dissolvedCo2` 0.034 × 425.62e-6 × 1.01325; `carbonicPKas` [6.35, 10.33]; `faintPinkConcentration` 1e-6; `hclRangeE4` [850, 1050]; `naohRangeE5` [9500, 10500]; `pipetteNominalUl` 25000; `pipetteOffsetUl` 30; `fillLevelMaxUl` 2000; `buretteCapacityUl` 50000; `streamUl` 250; `dropUl` 50; `halfDropUl` 25; `unconditionedStrengthPercent` 98; `wetPipetteStrengthPercent` 98; `tipBubbleUl` 600; `tipBubbleEscapeUl` 5000; `overshootUl` 100; `slowDownUl` 1000; `readingToleranceUl` 20; `gradeTolerancePercent` 1; `molarityRoundingE6` 50; `waterStepUl` 10000; `waterMaxUl` 30000; `indicatorDrops` [2, 3]; `plumeSlowFrom` 0.1; `plumeMixSeconds` 10; `persistSeconds` 30; `passesToComplete` 3. The two derived values are 1.5708×10⁻² and 1.4663×10⁻⁵ mol/L (5 ÷ 318.3 = 0.0157085; 0.034 × 425.62×10⁻⁶ = 1.44711×10⁻⁵, × 1.01325 = 1.46628×10⁻⁵).

- [x] `ph.test.ts`, failing first. K_w 1.0×10⁻¹⁴; pinned in the test: acetic pK_a 4.756; phosphoric 2.148, 7.198, 12.375; ammonium 9.25. Each within 10⁻⁶ of: 0.0100 M HCl 2.000000; 1×10⁻⁸ M HCl 6.978294; 0.10 M acetic acid 2.880876; 0.10 M acetic acid with 0.10 M sodium acetate 4.756152; 0.10 M H₃PO₄ 1.631739; 0.10 M NH₄Cl 5.124978; 0.10 M NH₃ 11.122104; pure water 7.000000. To two decimals these read 2.00, 6.98, 2.88, 4.76 and 1.63, as spec 7.4 check 1 asks. Pure water with K_w 10⁻¹³ gives 6.5000 (K_w is an argument). `chargeImbalance` at the returned pH is zero to the bisection's resolution and falls as pH rises. `protonationFractions([9.05, 9.5], 1e-9)` is 0.4602, 0.4101, 0.1297 and sums to 1; a one-step acid is half and half at pH = pK_a.
- [x] `setup.test.ts`, on `PINNED_MODEL`. `labSetup(1)` is `{ hclE4: 976, naohE5: 9502 }`; `trialSetup(1, 0..3)` are `{ 25002, 1963 }`, `{ 25029, 562 }`, `{ 25007, 1442 }`, `{ 24995, 1990 }`. `labSetup(2)` is `{ 997, 9825 }` and `trialSetup(2, 0)` `{ 24987, 1076 }`. `labSetup(11)` is `{ 952, 10030 }` and `trialSetup(11, 0)` `{ 25007, 1180 }`. `labSetup(1384)` is `{ 972, 9959 }`, `trialSetup(1384, 0)` `{ 24988, 612 }`, `trialSetup(1384, 1)` `{ 24975, 963 }`. `labSetup(4294967295)` is `{ 1030, 9689 }` and `trialSetup(4294967295, 0)` `{ 25013, 1889 }`. Seeds 1 to 20 000 reach both ends of each range: 850 and 1050; 9500 and 10500; 24 970 and 25 030; 0 and 2000. Over the corners of the ranges the equivalence volume runs from 20 213.8 to 27 664.7 µL (0.0850 × 24.97 ÷ 0.10500 = 20.2138 mL; 0.1050 × 25.03 ÷ 0.09500 = 27.6647 mL), inside the spec's 20.21 to 27.67 mL.
- [x] `flask.test.ts`, the phase's first test, on `PINNED_MODEL`.
  - Seed 1's equivalence volume is 25 680.86 µL (0.0976 × 25.002 ÷ 0.09502); 26 204.96 with the titrant at 98%; 25 167.24 with the aliquot at 98%; identical, by `toBe`, with 30 mL of water and a third drop.
  - `compareToEquivalence` for seed 1 at 25 675 and 25 700 is −1 and 1. For 0.1000 M × 25.000 mL against 0.10000 M, at 24 999, 25 000 and 25 001 it is −1, 0, 1, and `isOvershot` at 25 100 and 25 101 is false and true.
  - The careful run, flask chemistry only: stream additions while `delivered + 250 <= V_eq − 2000`, then drops while `delivered + 50 <= V_eq − 200`, then half-drops until `isPink`. For seeds 1 to 100, trial index 0: every addition before the last is below the threshold; the last is at or past equivalence and not overshot; it lands 11.21 to 35.03 µL past equivalence at 2 drops and 11.21 to 36.33 µL at 3; it is the first or second addition at or past equivalence (56 and 44 runs at 2 drops, 54 and 46 at 3), never the third; the largest pink before equivalence is 2.54×10⁻¹² M (2 drops) and 3.79×10⁻¹² M (3); a run has 121 to 148 additions.
  - Over every addition of those 200 runs `|pink ÷ threshold − 1|` is more than 0.001 (measured 0.0099), so the last bit of a floating-point number cannot decide a result there.
  - Seed 1 at 2 drops has 143 additions, the last three at 25 650, 25 675 and 25 700. pH and pink concentration at 0, 23 680, 25 650, 25 675, 25 700, 25 725 and 25 800 µL: 1.01 and 1.9×10⁻²¹; 2.41 and 6.0×10⁻¹⁹; 4.24 and 2.6×10⁻¹⁵; 4.95 and 6.9×10⁻¹⁴; 8.96 and 3.5×10⁻⁶; 9.53 and 1.4×10⁻⁵; 10.19 and 2.5×10⁻⁵ (pH to 0.01, concentrations to two figures). The flask's volume at 25 700 is 50 802 µL.
  - Pink at 25 800 µL is deeper with 3 drops than with 2, and exactly 0 with none.
  - **Corners** (spec 7.4 check 4, first half). The excess titrant at which the mixed flask reaches the threshold, found in the test by bisection on a delivered volume that need not be whole, with HCl outermost, then NaOH, and the pipette innermost: (HCl low, NaOH low, pipette low), (low, low, high), (low, high, low), (low, high, high), then the same four with HCl high. At 2 drops: 10.918, 10.941, 9.644, 9.664, 11.564, 11.589, 10.169, 10.191 µL. At 3 drops: 11.588, 11.611, 10.255, 10.275, 12.215, 12.239, 10.768, 10.789 µL. Each to 0.001; all more than 0 and at most 25.
  - Plume, seed 1, as `[fraction, status, fade seconds]` after the addition that brings the delivered volume to: 250 (stream) 0.010, at once, 0.1; 23 250 (stream) 0.093, at once, 0.9; 23 500 (stream) 0.103, slowly, 1.0; 23 750 (drop) 0.025, at once, 0.3; 25 200 (drop) 0.094, at once, 0.9; 25 250 (drop) 0.104, slowly, 1.0; 25 475 (half) 0.108, slowly, 1.1; 25 675 (half) 0.810, slowly, 8.1; 25 700 (half) 1.000, persists, null.
- [x] Implement. The seed loops get a 60 s timeout; the prototype's whole suite ran in about 13 s once the solver worked its constants out once per solve.

**Done when:** the three test files pass; no file under `src/engine/` trips the lint rules; `npm run build` passes.

### Task 2: Sources and the authored input

Read: spec 5.1, 5.2, 5.3; `engine.md` 2.1 and 2.4; `shell.md` 7.4 and 7.6; `integration.md` section 2 (C26 to C31) and section 7; decisions D3, D4, D13; `docs/research/periodic-table/sources/` for the pattern.

**Produces** (plain JSON; shown as types):

```ts
// docs/research/phase-3/sources/MANIFEST.json
type Manifest = {
  retrieved: string                      // the day of the fetch
  about: string
  sources: {
    id: string; url: string; citation: string
    file?: string; sha256?: string       // the kept copy in this folder; absent for a source that was read and not kept
    fetchedSha256?: string               // on a source with no copy: the sha256 of the page as fetched on the day it was read; the hash of no file here, and nothing checks it
    alsoKept?: { file: string; sha256: string; url: string }[]   // a second kept copy of the same record, from another address (PubChem serves the molecular weight apart from the GHS section)
    supports: { field: string; prints: string; where: string }[]   // one row per stored value: the figure as printed, and where
  }[]
}

// docs/research/phase-3/titration.json
type Input = {
  bottles: Record<'hcl' | 'naoh' | 'indicator', {
    name: string; formula: string; pubchemCid: number
    classifiedAs: string                 // what the statements classify, in the words of the tile's heading
    reference: string                    // the entry in the kept PubChem record the statements are read from; input only
    hazards: { signalWord: 'Danger' | 'Warning' | 'None'; statements: string[]; note: { value: string; sourceId: string }; sourceId: string }
  }>
  constants: Record<string, Constant | Constant[]>   // { value, published?, unit, note?, sourceId }; atmosphericCo2 also has year
  parameters: Record<string, { value: number | [number, number]; rationale: string }>
}
```

Data rules:

- **Sources and ids.** `tamura-1996` (pK 9.05 and 9.50; read, not kept); `iapws-r11-24` (read, not kept); `nist-webbook-co2-henry` (0.034 mol/(kg·bar); read, not kept); `noaa-gml-co2-annmean-gl` (425.62 ppm for 2025; kept); `perrin-1982-wikipedia` (6.35 and 10.33, from a recorded revision of the Wikipedia article on carbonic acid; kept, and the citation says the book was not read); `usgs-phreeqc-dat` (the database file of the U.S. Geological Survey's PHREEQC program, read and not kept, added after the review of Tasks 1 to 8: it prints 10.329 and 16.681 as constants at 25 °C, which gives 6.352 for dissolved CO₂; it supports the two carbonic notes and is the `sourceId` of no value); `drop-unit-wikipedia` (0.05 mL, a recorded revision; kept); `pubchem-cid-4764` (molar mass 318.3 and the classification; kept), `pubchem-cid-313` and `pubchem-cid-14798` (classifications; kept), one id per PubChem record, its citation naming the sections and the entry used; the indicator's catalogue listing (read and not kept, D4 as answered on 2026-10-05; its id names the supplier and catalogue number, and its entry carries `fetchedSha256`); and one source for each hazard note. No OpenStax page is kept. `README.md` gives the attribution the two Wikipedia copies require.
- **`prints` and `where`.** `prints` is the figure as the source prints it and nothing else. `where` says in the project's words where it is (page, table, row, heading). No sentence is copied.
- **K_w** (D13), under the key `waterIonProduct`. `{ value: 1e-14, unit: "", sourceId: "iapws-r11-24", note }` with no `published`. The note gives the printed pK_w (13.99, at 25 °C, molal scale) and the conversion to the molar scale (13.997). The conversion is recomputed here, not copied: the release's own equation gives 13.994 on the molal scale, and pK_w(molar) = pK_w(molal) − 2 log₁₀(ρ) with ρ = 0.99705 kg/L is 13.994 + 0.0026 = 13.997. The note names the density used and where it was read.
- **Indicator strength** (D4), under the key `indicatorStrength`. `{ value: 0.5, published: "0.5", unit: "g per 100 mL", sourceId: <the listing>, note }`. The listing is fetched and read; its copy, kept when this task was done, was taken out of the repository on 2026-10-05 (D4). The manifest's rows give what the page prints: 0.5, the basis (w/v), the solvent 50% (v/v) Alcohol, and 5 g/L, each with where it is. The note says what the listing prints (0.5% (w/v), and lower on the page 5 g/L), so that for the listed product the percentage is weight per volume; that the page was read on 2026-10-04, no copy is kept, and the build does not check the figure again; that taking this lab's bottle, labelled 0.5% with no basis, to be that kind of solution is an assumption and not something established; and that the endpoint test passes from 0.1% to 1%. If no catalogue listing can be fetched by any route, the task stops and the owner is asked for a saved copy of one; it does not close on a citation nobody fetched.
- **The other constants** as `engine.md` 2.1 has them: `indicatorPKas` 9.05 and 9.50 (published "9.05", "9.50"; the note on the first says they were measured in 0.2 M phosphate buffers and are used unchanged); `indicatorMolarMass` 318.3 g/mol; `indicatorDropVolume` 0.05 mL; `henryCo2` 0.034 mol/(kg·bar); `atmosphericCo2` 425.62 ppm, year 2025; `carbonicPKas` 6.35 and 10.33. The two carbonic notes say what the kept page prints beside each figure (the word hydrous, and no temperature); that taking 6.35 as the first constant of dissolved CO₂ is this project's reading; that the survey's file bears the reading out with 6.352 and 10.329 at 25 °C, the 6.352 worked out as 16.681 − 10.329 and repeated by the inputs test; and that the one other set the page's body prints, 6.77 and 9.93, moves the endpoint by about 0.1 µL at most, which an acceptance test holds (0.113 µL over the 256 flasks of check 4). No value is worked from the difference of 3.49 that the page also prints: it is not a figure for the second constant.
- **Bottles** (D4, D9). `hcl`: "Hydrochloric acid, standardized", HCl, CID 313, Danger, the two statements of the record's entry for hydrochloric acid (codes H314 and H335), not the entry for hydrogen chloride gas. `naoh`: "Sodium hydroxide solution, about 0.1 M", NaOH, CID 14798, Danger, H314. `indicator`: "Phenolphthalein indicator solution, 0.5%", C20H14O4, CID 4764, Danger, H341, H350, H361f. Statements are stored as the kept record prints them under `reference`, code first, in its order, without the asterisks PubChem prints after H361f. `classifiedAs` never says "pure substance" for the HCl bottle: it names the hydrochloric acid entry. For the `naoh` and `indicator` bottles it says the statements are those of the pure substance, as spec 5.2 labels them.
- **Hazard notes** (D4). Each note is drafted from a source fetched in this task (a supplier's safety data sheet for a solution of that strength, or the nearest one that can be fetched), cites it, and says no more than it says. A note resting on a sheet for a different solution says so. The HCl and NaOH notes say that the supplier's sheet classifies under the United States hazard communication standard: the statements over each note come from another system, Australia's for the acid and the European Union's for the base. A figure worked out, not read (about 0.4% by mass: 0.1 mol/L × 36.458 g/mol = 3.6 g/L and 0.1 × 39.997 = 4.0 g/L, taking the density as 1.00 g/mL), is marked as worked out and repeated by a test. The notes are drafts until the owner has read them at Gate A.
- **Parameters.** Every `PINNED_MODEL` key from `faintPinkConcentration` to `passesToComplete`, with its value (Task 1), plus `airPressureBar` 1.01325 and four that only the drawing uses: `pinkDisplayScale` 1e-5, `faintPinkNameLimit` 1.5e-5, `plumeFadeAtOnceSeconds` 0.5 and `plumeFadeSlowlySeconds` 3 (the real seconds a drawn plume takes to go, one for each way of fading; D8's starting values, added after the review of Tasks 1 to 8). The six keys before those (`kw`, `indicatorPKas`, `indicatorMolarity`, `indicatorDropUl`, `dissolvedCo2`, `carbonicPKas`) are not parameters: `modelFrom` takes or works them out from the constants. Rationales start from `engine.md` 2.1 and `bench.md` section 5, with these required: `unconditionedStrengthPercent` says the 2.0% is held through refills and that a real burette dilutes less each time (D3); `halfDropUl` says the half-drop is touched off on the flask wall and rinsed down with distilled water, and that every delivery is a whole number of half-drops except the last one above the 50.00 mL mark; `airPressureBar` says the CO₂ figure is a fraction of dry air and is applied to the whole pressure; `waterMaxUl` says the endpoint test holds to 30 mL even if the water carried CO₂; `molarityRoundingE6` says a typed molarity is accepted when it is the notebook's value rounded to the fourth decimal place, either neighbour at an exact tie (Q1); `faintPinkNameLimit` and `pinkDisplayScale` say they are presentation only; so do the two plume durations, which also say that the app is handed the plume's status and no number.

- [x] Fetch each source, record the manifest, keep the copies named above. Write the authored input.
- [x] `src/chem-data/titration/inputs.test.ts`, on the two files: the indicator's listing has no `file` and no `sha256`, no HTML file is in the sources folder, its citation says it was read on 2026-10-04 and that no copy is kept, its rows print 0.5, (w/v), 50% (v/v) Alcohol and 5 g/L, it has a `fetchedSha256` of 64 hex digits, no source has both a `file` and a `fetchedSha256`, and the strength's note says the page was read on that date, is not kept, and is not checked again by the build (from 2026-10-05; before, that the listing's kept copy prints the strength); every constant's `sourceId`, every `hazards.sourceId` and every note's `sourceId` is a manifest id; each constant with a `published` has a `supports` row for its field whose `prints` equals it, and K_w's row prints "13.99"; `atmosphericCo2.year` is 2025; no manifest source whose id or url names OpenStax has a `file`; every parameter has a rationale; every name, statement, note and rationale passes `findInstitutionText`; the grid holds (`dropUl % halfDropUl`, `streamUl % halfDropUl`, `(halfDropUl × tipBubbleUl) % tipBubbleEscapeUl`, `tipBubbleEscapeUl % halfDropUl` and `waterMaxUl % waterStepUl` are all 0); the by-mass arithmetic of any note that states it; the HCl bottle's statements carry the codes H314 and H335 and not H331, and its `classifiedAs` does not contain "pure"; the `naoh` and `indicator` bottles' `classifiedAs` each contain "pure substance".

**Done when:** the test passes; the indicator listing's manifest entry has a row that prints the figure 0.5, has no `file`, and gives the sha256 of the page as fetched under `fetchedSha256` (until 2026-10-05: its kept copy contained the figure); every hazard note names a fetched source; `npm run build` passes.

### Task 3: Schema, validator, citations

Read: `engine.md` 2.3; `integration.md` section 2 (C26, C30, C31) and G14; `src/chem-data/schema.ts`, `validate.ts` (`validatePeriodicTable`) and `citations.ts`.

**Produces:**

```ts
// src/chem-data/schema.ts
export const hazardsSchema   // strict: { signalWord: 'Danger' | 'Warning' | 'None', statements: text[], note: cited(text), sourceId: id }
export type Hazards = z.infer<typeof hazardsSchema>

// src/chem-data/titration/data.ts   (schema only in this task; titrationData is Task 4)
export const titrationSchema   // strict: { bottles: { hcl, naoh, indicator }, constants, parameters }
//   bottle:    { name, formula, pubchemCid, classifiedAs, hazards }
//   constant:  { value, published?, unit, note?, sourceId }; atmosphericCo2 adds year
//              unit is a string that may be empty (K_w has none), so it is not schema.ts's own min(1) text
//   constants: waterIonProduct, indicatorPKas[], indicatorMolarMass, indicatorStrength, indicatorDropVolume, henryCo2, atmosphericCo2, carbonicPKas[]
//   parameters: one param(...) per key named in Task 2
export type TitrationData = z.infer<typeof titrationSchema>

// src/chem-data/validate.ts
export function validateTitration(input: unknown, sources: readonly Source[], options?: ValidateOptions): string[]   // never throws

// src/chem-data/citations.ts
export function titrationCitations(data: TitrationData, sources: readonly Source[]): Citation[]
```

`data.ts` uses `param` and `cited` from `schema.ts` and does not redeclare them.

- [x] In `src/chem-data/schema.test.ts` and `src/chem-data/validate.test.ts` the shared `hazards` fixture's note becomes `{ value: 'Dilute.', sourceId: 's1' }` (in `validate.test.ts`, `{ value: 'Dilute solution.', sourceId: 's1' }`). No assertion changes. This is a sanctioned change to existing tests: once `hazardsSchema.note` is `cited(text)`, the bare string those two fixtures hold no longer parses. No stored data uses the shape yet (the registry has no reagents).
- [x] `schema.test.ts` gains: a hazards record whose note is `{ value, sourceId }` is accepted; one whose note is a bare string is rejected.
- [x] `data.test.ts`, on a complete fixture written in the test: the fixture parses, K_w's empty `unit` included; an unknown key at any level, a parameter with no `rationale`, a constant with no `sourceId`, a bottle with no `classifiedAs` and an `atmosphericCo2` with no `year` each fail.
- [x] `validate.test.ts`, each its own case on the fixture with one thing changed: an unknown source id (on a constant, on `hazards.sourceId`, on a note); a `published` that is not a plain decimal equal to its value; a parameter with no rationale; a rationale containing "Room 214"; a hazard note with no source; a constant with no `sourceId`. It accepts a rationale containing "room temperature". For `null`, `42` and `[]` it returns `schema:` errors and does not throw.
- [x] `citations.test.ts`: for the fixture, each constant, each bottle's classification and each bottle's note appears under its own source; each source appears once; a source that supports two things lists both.

**Done when:** the four test files pass; the existing registry and periodic-table tests pass unchanged; `schema.test.ts` and `validate.test.ts` change, apart from the cases added here, only in that fixture.

### Task 4: Build step

Read: `engine.md` 2.5; `review-verdicts.md` (engine: the build check on hazard statements, the version pin); `scripts/build-chem-data.mjs` (`buildPeriodicTable`) and `scripts/periodic-table-lib.mjs` with `src/chem-data/periodicBuild.test.ts` for the pattern.

**Produces:**

```ts
// scripts/build-chem-data.mjs: buildTitration(otherSourceIds) -> { titration, sources }; main() writes nothing until everything is built
// scripts/titration-lib.mjs: the checks below as plain functions that throw with a message

// src/chem-data/titration/data.ts
export const titrationData: TitrationData          // titrationSchema.parse(the generated JSON), once

// src/engine/titration/model.ts
export function modelFrom(data: TitrationData): TitrationModel
```

What `buildTitration` checks against the kept copies, failing the build on any of them: the NOAA file has a row for the stored year whose mean is the stored value; PubChem's molecular weight for CID 4764 is the stored molar mass; each stored hazard statement is in the kept record under the bottle's `reference` (the H-code, and the text between ": " and " [", ignoring " ***" after the code), and so is the signal word; each Wikipedia copy is the revision its citation names and contains the stored figure; each kept copy's sha256 is the manifest's; every `published` is a plain decimal equal to its value; every source id exists and is new. It drops `reference` and writes the bottles, constants and parameters to `src/chem-data/titration/titration.json` and the lab's sources to `sources.json`. As built, the build also checked that the indicator listing's kept copy printed the stored strength as a percentage (w/v). That check and `checkStrength` went on 2026-10-05 with the copy (D4): the strength is now one of the values read from a page that is not kept, which the build cannot check and `inputs.test.ts` holds to the manifest.

- [x] `src/chem-data/titration/build.test.ts`, on inputs the checks must refuse: the saved NOAA value for 2025 altered by one digit; a stored statement with a word changed; a statement that the kept record lists only under another entry (H331 claimed for the HCl bottle); a signal word the entry does not carry; a Wikipedia copy of another revision. And one they must accept: "H361f: Suspected of damaging fertility" against a record that prints the code with asterisks.
- [x] `data.test.ts` gains: `validateTitration(titrationData, sources)` returns no error; `titrationCitations(titrationData, sources)` lists every source the record names.
- [x] `model.test.ts`: `modelFrom(titrationData)` equals `PINNED_MODEL` field for field, the two derived concentrations to 1 part in 10¹², and to five figures they are 1.5708×10⁻² and 1.4663×10⁻⁵ mol/L.
- [x] `src/titration-version.test.ts`: one assertion holds `ACTIVITIES[0].version` (1), `PINNED_MODEL`, `labSetup(PINNED_MODEL, 1)` and `trialSetup(PINNED_MODEL, 1, 0)` together, and its name says that changing any of them means raising the titration entry's version in `activities.ts`.
- [x] `npm run build:data` twice; confirm identical output and that `git status` shows only `titration.json`, `sources.json` and the files of this task.

**Done when:** the tests pass; `npm run build:data && npm run build:expected && npm run cross-check && git diff --exit-code` is clean after a commit; `npm run build` passes.

### Task 5: Typed entries

Read: `engine.md` 3.7, 4.4 and 5.2 (`entries.test.ts`); `integration.md` C3, C18, C20; decisions D6 and D16.

**Produces:**

```ts
// src/engine/titration/entries.ts
export function parseReading(text: string): number | null     // "12.34" -> 12340: one or two digits, a point, two digits; null otherwise
export function parseMolarity(text: string): number | null    // exactly four decimals below 1, leading zero optional: "0.0949" -> 94900
export function parseDeviation(text: string): number | null   // parts per thousand, up to two decimals, leading point allowed: "1.3" -> 130
export const percentError: (molarityE6: number, naohE5: number) => number            // signed, for display
export const withinTolerance: (m: TitrationModel, molarityE6: number, naohE5: number) => boolean   // exact, edge included
/** True when the typed molarity is the notebook's HCl molarity x 25.00 mL / titre rounded to the fourth decimal place; at an exact tie, either neighbour (Q1). Exact. */
export const followsFromNotebook: (m: TitrationModel, molarityE6: number, hclE6: number, titreUl: number) => boolean
/** The mean rounded to the fourth decimal (as E6, a tie rounding up), and the relative deviation worked from that rounded mean, in tenths of a part per thousand. */
export function summarise(molaritiesE6: readonly number[]): { meanE6: number; deviationTenths: number }
```

The rounding rule (D6), in whole numbers: with `d = molarityE6 × titreUl − hclE6 × pipetteNominalUl`, the molarity follows from the notebook exactly when `titreUl > 0` and `−molarityRoundingE6 × titreUl <= d <= molarityRoundingE6 × titreUl`. Both edges are included, so at an exact tie either neighbour is accepted. That is this plan's answer to Q1 until the owner gives theirs; if it is "a tie rounds up", the lower edge is left out and the tie cases below change as Q1 says.

- [x] Q1 was put to the owner and answered on 2026-10-04: both neighbours are accepted at an exact tie.
- [x] `parseReading`: "12.34" 12340; "0.00" 0; " 2.56 " 2560; "05.07" 5070; "8.29" 8290; "33.33" 33330; "50.01" 50010 (the range is `can`'s matter, Task 6). Null for "12.3", "12.345", "12", "24.", ".50", "12,34", "-1.00", "1e1", "24.37 mL", "124.37" and "". "8.29" and "33.33" are there because 8.29 × 100 is 828.99… in floating point: the parser never multiplies a float.
- [x] `parseMolarity`: "0.0949" and ".0949" 94900; "0.1000" 100000; "0.0000" 0. Null for "0.095", "0.09494", "0.094942", "1.0949", "0,0949", "9.49e-2", " " and "".
- [x] `parseDeviation`: "0.47" 47; "1.3" 130; "2" 200; ".5" 50; "0" 0. Null for "1.333", "1.", "-1", "1,5" and "".
- [x] `withinTolerance` against 0.10000 M: 0.1009 true, 0.1011 false, 0.0991 true, 0.0989 false; the edge, 0.1010 and 0.0990, true. Against 0.09502 M (1.0% is 0.00095020): 0.0959 true (off by 0.00088), 0.0960 false (0.00098), 0.0941 true (0.00092), 0.0940 false (0.00102); 95 969 true and 95 971 false.
- [x] `percentError(94900, 9502)` is −0.126; `(96800, 9502)` 1.873; `(93000, 9502)` −2.126; `(100600, 9960)` 1.004. Each to 0.001.
- [x] `followsFromNotebook`, the cases of D6, each with its arithmetic:
  - 0.0976 M and a 25.70 mL titre: 0.0976 × 25.00 ÷ 25.70 = 0.0949416. 0.0949 true; 0.0950 and 0.0948 false.
  - 0.0976 M and 25.67 mL: 2.4400 ÷ 25.67 = 0.0950526, which rounds to 0.0951 and cuts off to 0.0950. 0.0951 true (95 100 × 25 670 − 97 600 × 25 000 = 1 217 000, and 50 × 25 670 = 1 283 500); 0.0950, the cut-off value, false (the difference is −1 350 000); 0.0952 false.
  - A tie, 0.0960 M and 25.60 mL: 2.4000 ÷ 25.60 = 0.09375 exactly. 0.0938 true (the difference is +1 280 000, equal to 50 × 25 600); 0.0937 true (−1 280 000, the other edge); 0.0939 and 0.0936 false (±3 840 000).
  - A tie a bottle here can give, 0.0972 M and 24.00 mL: 2.4300 ÷ 24.00 = 0.10125 exactly. 0.1013 and 0.1012 true (the difference is ±1 200 000, equal to 50 × 24 000); 0.1014 and 0.1011 false.
  - A titre of 0 or less: false.
- [x] `summarise`, each to its two whole numbers:
  - `[94900, 94800, 94900]`: the mean is 94 866.7, rounded 94 900; the distances from 94 900 are 0, 100, 0, their mean 33.3; 33.3 ÷ 94 900 × 1000 = 0.351, so `{ meanE6: 94900, deviationTenths: 4 }`.
  - `[98700, 98900, 98600]`: mean 98 733.3, rounded 98 700; distances 0, 200, 100, mean 100; 100 ÷ 98 700 × 1000 = 1.013, so `{ 98700, 10 }`.
  - `[100000, 100200, 99800]`: `{ 100000, 13 }` (133.3 ÷ 100 000 × 1000 = 1.333).
  - Three equal values: deviation 0. `[94900, 94800]`: the mean 94 850 rounds up to 94 900. The result does not depend on the order of the values.

**Done when:** `entries.test.ts` passes on `PINNED_MODEL`; `npm run build` passes.

### Task 6: State, actions, test kit

Read: spec 7.2, 7.3; `engine.md` 3.5, 3.6, 3.9, 4.2, 4.3 and 5.2 (`actions.test.ts`); `review-verdicts.md` (engine: the dead end at the mark, discarding, the mode); `integration.md` C21, C22, C24, G7; decisions D1, D3, D5, D7, D9.

**Produces:**

```ts
// src/engine/titration/state.ts   (the stored shape and the type are one definition; this is the whole record under lab:titration)
// trial: { index, aliquot: 'none' | 'clean' | 'diluted', indicatorDrops (0..3), waterUl (0..30000), titrantDiluted,
//          startLevelUl | null, initialReadingUl | null, deliveredUl, lastAdditionUl, waitedS,
//          endLevelUl | null, finalReadingUl | null, hclUsedE6 | null, molarityE6 | null,
//          end: 'open' | 'graded' | 'overshot' | 'ran-out' | 'discarded' }
// state: { seed (0..4294967295), mode: 'guided' | 'challenge', status: 'in-progress' | 'completed',
//          hclRecordedE6 | null, pipetteRinsed,
//          burette: { conditioned, filled, diluted, levelUl (0..50000), tipAirUl (0..600) },
//          trials (at least one; the last is the current trial), summary: { meanE6, deviationE2 } | null }
export const titrationStateSchema: z.ZodType<TitrationState>   // strict; whole numbers, booleans and short strings only
export type Trial; export type TitrationState; export type Mode = TitrationState['mode']
export function createLab(seed: number, mode: Mode): TitrationState
export const currentTrial: (state: TitrationState) => Trial

// src/engine/titration/actions.ts
export type Action =
  | { type: 'setMode'; mode: Mode }
  | { type: 'recordHclMolarity'; molarityE6: number }
  | { type: 'conditionBurette' } | { type: 'fillBurette' } | { type: 'clearTipBubble' }
  | { type: 'rinsePipette' } | { type: 'pipetteAliquot' } | { type: 'addIndicatorDrop' } | { type: 'addWater' }
  | { type: 'recordInitialReading'; readingUl: number }
  | { type: 'deliver'; amount: 'stream' | 'drop' | 'half' }
  | { type: 'swirlAndWait' }
  | { type: 'recordFinalReading'; readingUl: number }
  | { type: 'submitMolarity'; molarityE6: number }
  | { type: 'discardTrial' } | { type: 'startNextTrial' }
  | { type: 'recordSummary'; meanE6: number; deviationE2: number }
export type Blocked =
  | 'lab-completed' | 'lab-not-completed' | 'trial-ended' | 'trial-open' | 'already-done'
  | 'mid-titration' | 'burette-empty' | 'burette-at-bottom' | 'no-tip-bubble'
  | 'flask-empty' | 'flask-has-aliquot' | 'indicator-full' | 'water-full'
  | 'needs-indicator' | 'needs-initial-reading' | 'endpoint-not-confirmed' | 'needs-final-reading' | 'needs-hcl-molarity'
  | 'invalid-entry' | 'not-the-label' | 'reread' | 'final-not-after-initial' | 'calculation-mismatch'
export type Warning = 'burette-not-conditioned' | 'tip-bubble' | 'pipette-not-rinsed'
export function can(m: TitrationModel, state: TitrationState, action: Action): Blocked | null
export function warnings(m: TitrationModel, state: TitrationState, action: Action): Warning[]   // empty when the action is blocked
export function reduce(m: TitrationModel, state: TitrationState, action: Action): TitrationState   // a blocked action returns the same object
export function flaskOf(m: TitrationModel, state: TitrationState, trial?: Trial): Flask           // not part of the public surface
export const endpointConfirmed: (m: TitrationModel, state: TitrationState) => boolean
/** The technique steps a trial was run without, from the stored trial alone. Not part of the public surface: trialOutcome names them. (Moved here from select.ts at Gate A, so that countingTrials can use it.) */
export function techniqueCauses(trial: Trial): Warning[]
/** The trials that count toward completion (D1): graded, within tolerance, both readings within readingToleranceUl of the meniscus, the HCl molarity used the label's, and no technique cause. */
export const countingTrials: (m: TitrationModel, state: TitrationState) => Trial[]
/** True when a typed reading is more than readingToleranceUl from the meniscus stored with it; false while either is missing. Not part of the public surface. */
export const misread: (m: TitrationModel, typedUl: number | null, levelUl: number | null) => boolean

// src/engine/titration/testkit.ts   (tests only)
export const honestReading: (levelUl: number) => number                       // the true meniscus to the nearest 0.01 mL
export const calculatedMolarityE6: (m: TitrationModel, hclE6: number, titreUl: number) => number   // the notebook's value rounded to the fourth place, a half rounding up; followsFromNotebook accepts it
/** One addition of a scripted run, and the flask as it stood after it. */
export interface Addition { amount: 'stream' | 'drop' | 'half'; deliveredUl: number; side: number /* compareToEquivalence after it */; pH: number; pinkConcentration: number }
export interface Technique { mode?: Mode; condition?: boolean; clearBubble?: boolean; rinse?: boolean; drops?: number; washes?: number; fill?: boolean }
export function learner(through?: (state: TitrationState) => TitrationState): {
  run(m, state, actions: readonly Action[]): TitrationState         // throws on a blocked action
  readyTrial(m, state, t?: Technique): TitrationState               // the current trial, up to an openable stopcock
  prepared(m, seed, t?: Technique): TitrationState                  // a new lab, label recorded, careful unless told otherwise
  titrateCarefully(m, state): { state: TitrationState; additions: Addition[] }
  finishHonestly(m, state): TitrationState                          // honest final reading, molarity from the notebook
  carefulTrial(m, state): TitrationState
}
```

Rules. `can` gives the first reason that applies: `lab-completed` (every action but `setMode` and `recordSummary`); then `trial-ended`, on a trial that has ended, for every action except `setMode`, `recordHclMolarity`, `startNextTrial` and `recordSummary`; then the action's own, in the order listed. So the HCl molarity can be recorded again between trials: a learner whose feedback named a miscopied label can put it right before the next trial. `mid-titration` means titrant has been delivered in the open trial (`deliveredUl > 0`).

| Action | Blocked when | Effect |
| --- | --- | --- |
| `setMode` | `trial-open`: the current trial is open and has an aliquot or an initial reading | The mode changes |
| `recordHclMolarity` | `invalid-entry`: not a four-decimal value below 1; Guided: `not-the-label` | Stored as typed; can be re-entered; a graded trial keeps the value it used |
| `conditionBurette` | `mid-titration` | Rinsed and left empty: not dilute, air in the tip at the next fill; the initial reading is cleared |
| `fillBurette` | `mid-titration` | The meniscus goes to this trial's fill level. From empty: a 0.60 mL tip bubble, and dilute contents if the burette was never conditioned. A top-up leaves the contents as dilute as they were and makes no bubble. The initial reading is cleared |
| `clearTipBubble` | `burette-empty`; `no-tip-bubble`; `mid-titration` | The meniscus falls by the air left; the initial reading is cleared |
| `rinsePipette` | `already-done` | The pipette is no longer wet with water |
| `pipetteAliquot` | `flask-has-aliquot` | The trial's delivery goes in, `diluted` if the pipette was wet with water; either way the pipette is now wet with acid |
| `addIndicatorDrop` | `flask-empty`; `mid-titration`; `indicator-full` (3 drops) | One more drop |
| `addWater` | `flask-empty`; `water-full` (30 mL) | 10 mL more; the wait is reset; the final reading is cleared; then the trial's end is judged |
| `recordInitialReading` | `burette-empty`; `mid-titration`; `invalid-entry` (not on the 0.01 mL grid from 0.00 to 50.00); Guided: `reread` | The typed reading and the true meniscus are stored |
| `deliver` | `burette-empty`; `flask-empty`; `needs-indicator` (fewer than 2 drops); `needs-initial-reading`; `burette-at-bottom` | 250, 50 or 25 µL, or what is left above the 50.00 mark; the wait is reset; the final reading is cleared; then the trial's end is judged |
| `swirlAndWait` | `flask-empty` | 30 simulated seconds pass |
| `recordFinalReading` | `endpoint-not-confirmed`; `invalid-entry`; `final-not-after-initial`; Guided: `reread` | The typed reading and the true meniscus are stored |
| `submitMolarity` | `needs-final-reading`; `needs-hcl-molarity`; `invalid-entry`; `calculation-mismatch` | The trial is graded and closed. At the third trial that counts the lab is completed |
| `discardTrial` | (only `lab-completed` or `trial-ended`) | The trial ends as `discarded`. Glassware and notebook stay as they are |
| `startNextTrial` | `trial-open`; `lab-completed` | A new trial with the next index; burette, pipette and notebook carry over |
| `recordSummary` | `lab-not-completed`; `invalid-entry`: `meanE6` is not a multiple of 100 below 1 000 000, or `deviationE2` is not a whole number from 0 | The learner's own average and relative deviation are stored |

- **The mode gate stays as built** (D7, as the `setMode` row words it). The mode can still be changed in an open trial that holds neither an aliquot nor an initial reading, so a Guided check of the initial meniscus can be carried into a Challenge trial: a reading Guided refused, or one it took before a fill or a conditioning cleared it, is known to the learner when they switch. That check reaches the initial reading only, since no titrant runs without one and none can be cleared once titrant has run, and it tells nothing about the hidden molarity. It is accepted, and spec 7.4 check 11 says so.
- **The trial's end is judged in one place**, after `deliver` and after `addWater`: `overshot` if the delivered volume is more than `overshootUl` past the flask's own equivalence volume, else `ran-out` if titrant has been delivered in this trial (`deliveredUl > 0`), the meniscus is at `buretteCapacityUl` and the mixed flask is not pink. A trial begun with the burette already at the mark is not ended by this rule: nothing has run into it, nothing can until the burette is filled, and `fillBurette` is allowed. When a trial ends without a final reading its `endLevelUl` is the meniscus at that moment, so every cause can be judged from the stored trial alone.
- **Tip bubble.** Not cleared, the air leaves evenly over the first `tipBubbleEscapeUl` delivered: 3 µL for every 25 µL. A refill does not bring it back; conditioning does.
- **Warnings.** `fillBurette` on a burette that is unconditioned or dilute: `burette-not-conditioned`. `pipetteAliquot` with the pipette wet with water: `pipette-not-rinsed`. `recordInitialReading`: `burette-not-conditioned` when the burette is dilute, and `tip-bubble` when there is air in the tip, in that order.
- **Simulated time.** `waitedS` is seconds of swirling since the flask last changed. The endpoint is confirmed when `waitedS >= persistSeconds` and the mixed flask is pink.
- **Not stored:** anything the seed fixes and anything judged. The schema's bounds (50 000, 3, 30 000, 600) are literals; a test holds them to the model's values.
- **No entry is a negative zero.** `can` gives `invalid-entry` for a reading, a molarity, a mean or a deviation of −0. It is a whole number, not below 0 and on every grid, and JSON writes it as 0, so a state that stored it would not come back from a reload as it went in. A plain 0 is an entry still.
- **Trial indexes.** The schema refuses a record unless `trials[i].index === i`, by a `superRefine`, which `schema.ts` already uses. `trialSetup` skips `2 + 2N` draws, so a hand-edited index of 10¹² would otherwise hang the page on load.

Test cases (`actions.test.ts`, on `PINNED_MODEL`; a blocked action is checked with `can` and by `reduce` returning the same object):

- [x] **A new lab.** `createLab(1, 'guided')` is `{ seed: 1, mode: 'guided', status: 'in-progress', hclRecordedE6: null, pipetteRinsed: false, burette: { conditioned: false, filled: false, diluted: false, levelUl: 0, tipAirUl: 0 }, trials: [one open trial, index 0, aliquot 'none', every count 0 and every nullable field null], summary: null }`, and is unchanged by a round trip through `JSON` and the schema. On it, blocked: `clearTipBubble`, `recordInitialReading` and `deliver` `burette-empty`; `addIndicatorDrop`, `addWater` and `swirlAndWait` `flask-empty`; `recordFinalReading` `endpoint-not-confirmed`; `submitMolarity` `needs-final-reading`; `startNextTrial` `trial-open`; `recordSummary` `lab-not-completed`. Allowed: `setMode`, `recordHclMolarity` with 97 600, `conditionBurette`, `fillBurette`, `rinsePipette`, `pipetteAliquot`, `discardTrial`.
- [x] **The stopcock.** After a fill: `flask-empty`; with the aliquot and 0 or 1 drop: `needs-indicator`; with 2 drops and no initial reading: `needs-initial-reading`; then allowed. A fourth drop is `indicator-full`; a second aliquot `flask-has-aliquot`. On a burette whose tip was cleared before the initial reading, after one drop of titrant: `conditionBurette`, `fillBurette`, `addIndicatorDrop` and `recordInitialReading` are `mid-titration`, `clearTipBubble` is `no-tip-bubble`, `recordFinalReading` is `endpoint-not-confirmed`. With the bubble left in, `clearTipBubble` after one drop is `mid-titration` (594 µL of air is still in the tip). Three washes give 30 000 µL; a fourth is `water-full`.
- [x] **Warnings.** A fill of an unconditioned burette, and its top-up, warn `burette-not-conditioned`; pipetting unrinsed warns `pipette-not-rinsed`; a reading with the bubble warns `tip-bubble`; a reading from a dilute burette with the bubble warns both, burette first; after conditioning, clearing and rinsing, none warn.
- [x] **Unconditioned burette** (seed 1). Trial 1's `titrantDiluted` is true; the burette is still `diluted` in trial 2 after a refill. After `conditionBurette` the burette is `{ conditioned: true, filled: false, diluted: false, levelUl: 0, tipAirUl: 0 }` and the initial reading is null; after the next fill, in trial 2, `{ conditioned: true, filled: true, diluted: false, levelUl: 562, tipAirUl: 600 }`.
- [x] **Wet pipette.** Trial 1's aliquot is `diluted` and `pipetteRinsed` is then true; trial 2's aliquot is `clean`.
- [x] **Tip bubble** (seed 1). A fill gives level 1963 and air 600; clearing gives 2563 and 0 and clears the initial reading; clearing again is `no-tip-bubble`. Left alone, `[delivered, meniscus fall, air left]` after a half-drop, then a drop, then a stream addition: `[25, 28, 597]`, `[75, 84, 591]`, `[325, 364, 561]`; at 4825 delivered `[4825, 5404, 21]`; at 5075 `[5075, 5675, 0]`; at 5325 the fall is 5925. Four stream additions and forty half-drops leave the same burette. After the bubble escaped in trial 1, the fill of trial 2 gives level 562 and air 0.
- [x] **Readings and the two modes** (spec 7.4 check 11). Seed 1, meniscus at 2563: Guided gives `reread` for 2.54 and 2.59 and accepts 2.55, 2.56, 2.57 and 2.58; Challenge stores 2.59 with `startLevelUl` 2563. Both modes refuse 2563, 2565, −10, 50 010 and 25.6 µL as `invalid-entry`. **The edge, exactly** (seed 11, meniscus at 1180 + 600 = 1780): Guided accepts 1.76 and 1.80, each 20 µL off, and gives `reread` for 1.75 and 1.81, each 30 off.
- [x] **The label** (spec 7.4 check 11). Guided: 0.0967 is `not-the-label`, 0.0976 is accepted. Challenge: 0.0967 is accepted. 97 650 is `invalid-entry` in both. **Between trials:** after a Challenge trial graded with 0.0967, `recordHclMolarity` with 97 600 is allowed before the next trial is started; the graded trial keeps `hclUsedE6` 96 700 and still does not count; the next trial is graded with 97 600. On that ended trial `discardTrial`, every bench action, both readings and `submitMolarity` are `trial-ended`, and `setMode` and `startNextTrial` are allowed.
- [x] **The final reading.** Before a swirl and wait at the endpoint it is `endpoint-not-confirmed`; after it, 2.56 is `final-not-after-initial`. A further half-drop, or a wash of water, clears the final reading, the end level and the wait, and the endpoint is no longer confirmed.
- [x] **The molarity** (seed 1, careful: initial 2.56, final 28.26, titre 25.70). 0.0950 and 0.0948 are `calculation-mismatch`; 94 942 is `invalid-entry`; 0.0949 gives `{ end: 'graded', molarityE6: 94900, hclUsedE6: 97600 }`, after which `submitMolarity` and `deliver` are `trial-ended` and `startNextTrial` is allowed. **Cut off, not rounded** (seed 1, Challenge, initial typed 2.58 and final 28.25, each within tolerance, titre 25.67): 0.0950 is `calculation-mismatch` and 0.0951 is graded.
- [x] **The careful first trial of seed 1** is exactly `{ index: 0, aliquot: 'clean', indicatorDrops: 2, waterUl: 0, titrantDiluted: false, startLevelUl: 2563, initialReadingUl: 2560, deliveredUl: 25700, lastAdditionUl: 25, waitedS: 30, endLevelUl: 28263, finalReadingUl: 28260, hclUsedE6: 97600, molarityE6: 94900, end: 'graded' }`.
- [x] **Overshoot** (spec 7.4 check 10; seed 1). Open at 25 750 and 25 775 µL delivered; at 25 800 the trial is `{ deliveredUl: 25800, end: 'overshot' }` (the line is 25 680.86 + 100).
- [x] **Running out** (spec 7.4 check 10; seed 1, a second trial with no refill). The last stream addition delivers 237 µL, the meniscus is 50 000, and the trial is `{ deliveredUl: 21737, end: 'ran-out' }` (50 000 − 28 263; its own equivalence volume, 25 708.6, was not reached).
- [x] **Running out with water added last** (spec 7.4 check 10; seed 1384; D5). After a careful trial 1 (meniscus 25 612), trial 2, with 2 drops of indicator, is run with no refill by stream to the mark: 24 388 µL delivered, the last addition 138, 12.4 µL past its equivalence volume of 24 375.64, the flask pink and the trial still open. One wash leaves it pink and open. The second wash takes it below the threshold and ends it `ran-out`. A third wash is `trial-ended`. (The pink concentration is 1.49×10⁻⁶, 1.12×10⁻⁶ and 8.7×10⁻⁷ M at the three points.) With 3 drops of indicator the first wash ends it (1.28×10⁻⁶, then 9.9×10⁻⁷ M): the sequence above holds at 2 drops only.
- [x] **A trial begun at the mark** (spec 7.4 check 10; *invariant*). Seed 1, after the ran-out trial 2 above: `startNextTrial` gives an open trial 3 with the meniscus at 50 000 and nothing delivered. `pipetteAliquot`, two drops of indicator and `addWater` leave it open. With an initial reading of 50.00 recorded, `deliver` is `burette-at-bottom`. `fillBurette` is allowed throughout, and after it and a new initial reading `deliver` is allowed.
- [x] **Discarding** (spec 7.4 check 10; *invariant*). On seed 1, after pipetting with a wet pipette, `discardTrial` gives `end: 'discarded'`; `startNextTrial` is then allowed; the new trial has index 1, the burette and `hclRecordedE6` are as they were, and its aliquot is `clean`. `discardTrial` is allowed on every open trial of a lab that is not completed, a new one included, and is `trial-ended` after any end.
- [x] **The mode** (spec 7.4 check 11; *invariant*). `setMode` is allowed on a new lab; `trial-open` once the trial has an aliquot, and once it has an initial reading without one; allowed again as soon as the trial ends, however it ends, and in the next trial until that has an aliquot or an initial reading; allowed after completion.
- [x] **Which trials count** (D1; seed 1, Challenge, careful technique unless said; the true NaOH is 0.09502 M and the careful endpoint leaves the meniscus at 28 263).
  - Final typed 28.28 (17 µL off): titre 25.72, 2.4400 ÷ 25.72 = 0.094868, molarity 0.0949, −0.126%. Passes and counts.
  - Final typed 28.29 (27 µL off): titre 25.73, 0.094831, molarity 0.0948, −0.232%. Passes and does not count. So does 28.24 (23 µL off; titre 25.68, molarity 0.0950, −0.021%).
  - HCl recorded as 0.0967 with honest readings: 0.0967 × 25.00 ÷ 25.70 = 0.094066, molarity 0.0941, −0.968%. Passes and does not count.
  - **The edge** (seed 11: label 0.0952, true NaOH 0.10030, start 1780, careful endpoint at 23 750 delivered, meniscus 25 530). Initial typed 1.76 with final 25.53: titre 23.77, 2.3800 ÷ 23.77 = 0.100126, molarity 0.1001, −0.199%: counts. Initial 1.75: titre 23.78, molarity 0.1001: does not count. Initial 1.78 with final 25.55: counts; with final 25.56: does not.
  - **A technique cause** (D1 as answered on 2026-10-05; seed 1, honest readings). Burette not conditioned and pipette not rinsed: both dilutions are 2.0%, so the flask's equivalence volume is the careful one's (0.0976 × 0.98 × 25.002 ÷ (0.09502 × 0.98) = 25 680.86 µL), the titre is 25.70 and the molarity 0.0949, −0.126%. Passes and does not count. Tip bubble not cleared and pipette not rinsed: equivalence 25 167.24, 25 200 µL delivered, the meniscus from 1963 to 27 763, readings 1.96 and 27.76, titre 25.80, 2.4400 ÷ 25.80 = 0.094574, molarity 0.0946, −0.442%. Passes and does not count. Part of a bubble: a trial read with the bubble in the tip, 16 stream additions, the flask discarded (meniscus 6443, 120 µL of air left); the next trial, refilled and titrated carefully without clearing the tip, runs from 562 to 26 407 with 25 725 delivered, readings 0.56 and 26.41, titre 25.85, molarity 0.0944, −0.652%. Passes and does not count, and no air is left.
  - **The route D1 closes** (seed 1, the burette never conditioned). Trial 1 honest: readings 2.56 and 28.79 (meniscus 28 788), titre 26.23, molarity 0.0930, failed at −2.126%. Trials 2, 3 and 4, each refilled and titrated carefully, then given a final reading typed to make the titre 25.68 (26.24, 27.12 and 27.67 against true levels of 26 812, 27 667 and 28 215) and the molarity 0.0950: each is graded within tolerance at −0.021%, none counts, `countingTrials` is empty, the status is `in-progress` and `startNextTrial` is allowed.
- [x] **Completion.** Three careful trials complete the lab at the third and not before; with a failed first trial it completes at the fourth. After completion `startNextTrial` is `lab-completed`, every bench and entry action is `lab-completed`, `recordHclMolarity` included, and `recordSummary` and `setMode` are allowed. `recordSummary` is `invalid-entry` for a mean of 94 950, a mean of 1 000 000, a deviation of −1 and a deviation of 0.5, and allowed for 94 900 with 0.
- [x] **Stored shape.** A level of 50 001, a float level, four drops of indicator, 30 001 µL of water, a seed of −1 or 4 294 967 296, an extra key, an empty trial list, and a trial whose `index` is not its place in the list (a first trial with index 1; a second with index 5) each fail the schema.
- [x] **Negative zero** (added after the review of Tasks 1 to 8). `recordHclMolarity`, `recordInitialReading`, `recordFinalReading`, `submitMolarity` and `recordSummary` (the mean, and the deviation) with −0 are each `invalid-entry`; with 0 the first two and a summary of 0 and 0 are stored, and the stored state is unchanged by a round trip through `JSON` and the schema.
- [x] **Every open trial can be ended** (*invariant*; spec 7.4 check 10). A walk of 20 000 actions on each of seeds 1 to 10, drawn in the test with `mulberry32`. Actions drawn only at random seldom get through a titration, so each action is either any action at all, with what is typed drawn around the honest value and now and then far from it, or the next step of a steady learner who works through whole trials and never refills unasked (on an odd seed the technique steps are taken, on an even one skipped; on every other trial the flask wall is washed down). The steady share is (seed − 1) ÷ 10: every action is random on seed 1, one in ten on seed 10. A completed lab is now and then begun again on the same seed, and so is a lab of more than eight trials. Over the whole walk: no trial that counts has a technique error in it, read from the stored trial and not through `techniqueCauses` (added at Gate A); no state has an open trial with titrant delivered, the meniscus at 50 000 and the mixed flask not pink; in every state with an open trial `discardTrial` is allowed; in every state whose trial has ended and whose lab is not completed `startNextTrial` is allowed; every state passes the schema; `reduce` on a blocked action returns the same object; and the walk met blocked actions, each of the four endings and a completed lab. A second walk, 4000 actions on each of seeds 1 to 5 with 85 in 100 the steady learner's, runs on a model whose burette is cut short to end 13 µL past the first trial's equivalence volume, because the lab's own burette seldom ends so near one: it meets an open trial at the mark with the flask pink, one that a wash of water there ends as ran-out, and trials within 1.0% with a technique error in them, none of which counts.
- [x] Add the state shape to `src/titration-version.test.ts`: `createLab(1, 'guided')` joins the pinned values.
- [x] The cases marked with a check of spec 7.4 carry the check's number and its wording in their test names, so a failure reads as the spec's sentence. Task 8 does not repeat them.

**Done when:** `actions.test.ts` passes; `npm run build` passes.

### Task 7: Selectors and the public surface

Read: `engine.md` 3.8, 4.5 and 5.2 (`select.test.ts`); `review-verdicts.md` (engine: the checklist, the summary, the public surface); `integration.md` C6, C7, C13, C17, C19, C20, G7; decisions D1, D9, D16.

**Produces:**

```ts
// src/engine/titration/select.ts
export const hclLabel: (m: TitrationModel, state: TitrationState) => string            // "0.0976"; always readable
export interface BuretteView { filled: boolean; levelUl: number; tipBubble: boolean; atBottom: boolean }
export const buretteView: (m: TitrationModel, state: TitrationState) => BuretteView
export interface FlaskView {
  hasAliquot: boolean; indicatorDrops: number; waterUl: number
  volumeUl: number                 // liquid in the flask, for its drawn height
  pinkConcentration: number        // mol/L of the pink form once the mixed flask is pink; 0 until then; for the drawing only
  pink: boolean                    // the engine's own threshold test
  overshot: boolean
  plume: PlumeStatus | null        // the last addition's status and nothing else; null before the first addition of a trial
  persistence: 'unchecked' | 'faded' | 'persisted'
}
export function flaskView(m: TitrationModel, state: TitrationState): FlaskView
export function slowDownHint(m: TitrationModel, state: TitrationState): boolean        // Guided only
export type Cause = 'burette-not-conditioned' | 'tip-bubble' | 'pipette-not-rinsed' | 'initial-misread' | 'final-misread' | 'hcl-label-misrecorded'
export type TrialOutcome =
  | { state: 'open' }
  | { state: 'invalid'; reason: 'overshot' | 'ran-out' | 'discarded'; causes: Cause[] }     // technique causes only
  | { state: 'failed'; percentError: number; causes: Cause[]; counts: boolean }             // counts is false for every failed trial
  | { state: 'passed'; percentError: number | null; causes: Cause[]; counts: boolean }      // percentError is null until three trials count; counts is true only when causes is empty
export function trialOutcome(m: TitrationModel, state: TitrationState, trial: Trial): TrialOutcome
export const trueNaoh: (m: TitrationModel, state: TitrationState) => string | null        // "0.09502"; null until three trials count
export interface SummaryView { meanE6: number; deviationTenths: number; learnerMeanE6: number; learnerDeviationE2: number }
export function summaryView(m: TitrationModel, state: TitrationState): SummaryView | null  // null until completed and the learner has entered their own
export type Step = 'hcl' | 'condition' | 'fill' | 'tip-bubble' | 'initial-reading' | 'rinse-pipette' | 'aliquot' | 'indicator' | 'titrate' | 'final-reading' | 'molarity'
export function checklist(m: TitrationModel, state: TitrationState): { step: Step; state: 'done' | 'next' | 'todo' | 'skipped' }[]

// src/engine/titration/index.ts
// Re-exports what src/app may use: state.ts; from actions.ts can, warnings, reduce, endpointConfirmed, countingTrials, Action, Blocked, Warning;
// entries.ts; select.ts; from model.ts TitrationModel and modelFrom; from flask.ts the type PlumeStatus only.
// It does not export flaskOf, labSetup, trialSetup, equivalenceUl, flaskChemistry, isPink or any other value of flask.ts and setup.ts,
// nor the type Plume, whose fraction and fadeSeconds are hidden values.
```

Rules:

- **Causes**, in the union's order. The first three are `techniqueCauses` of `actions.ts`, the one test `countingTrials` uses too. `burette-not-conditioned`: the trial's titrant was dilute. `tip-bubble`: the meniscus fell further than the volume delivered. `pipette-not-rinsed`: the aliquot was diluted. `initial-misread` and `final-misread`: the typed reading is more than `readingToleranceUl` from the meniscus stored with it, by `misread` of `actions.ts`, the one test `can` and `countingTrials` use. `hcl-label-misrecorded`: the HCl molarity the trial used is not the label's. An invalid trial carries the first three only.
- **The percent error.** A failed trial's is given at once (D1). A passed trial's is null until `trueNaoh` is no longer null, that is, until `passesToComplete` trials count: spec 7.3 has a passing trial show none, and one such figure with the molarity the learner typed is the hidden molarity (0.0949 at −0.126% is 0.09502). Once three count the lab shows the true molarity itself, and every graded trial's percent error is given.
- **`counts`** is true exactly when the trial is in `countingTrials`, so a passed trial counts exactly when no cause is named in it (D1 as answered on 2026-10-05). `summaryView` and `trueNaoh` work from the trials that count, and return null unless `passesToComplete` of them exist, whatever `status` says. A graded trial with no molarity is `open`.
- **Checklist.** `condition` is listed when the burette is unconditioned or dilute, or it is the first trial; `tip-bubble` when there is air in the tip, or it is the first trial; `rinse-pipette` when the pipette is wet with water, or it is the first trial; the other eight always. A step is `done` when what it asks for holds for this trial. `fill`: the burette is filled and this trial's `startLevelUl` (the burette's level while there is none) is at most `fillLevelMaxUl + tipBubbleUl`, because clearing the tip lowers a fresh fill by the bubble (seed 1: 1963, then 2563). A skipped step stays listed, in a later trial as in the first, so that it does not vanish at the moment it is skipped: `condition` in every trial until the burette is conditioned, and `tip-bubble` and `rinse-pipette` for the rest of the trial they were skipped in, though the glassware no longer calls for them. A technique step is `skipped` once the action that needed it has been taken without it, and skipped wins over done: `condition` while the burette is filled and dilute; `tip-bubble` when the initial reading was taken with air in the tip, that is, while the trial has an initial reading and either air is still in the tip or the meniscus has fallen further than the volume delivered since that reading (after the bubble has escaped, `tipAirUl` alone would call the step done); `rinse-pipette` when this trial's aliquot is `diluted` (drawing it wets the pipette with acid, so `pipetteRinsed` alone would call the step done). `next` is the first step in order that is neither done nor skipped; the rest are `todo`. For a trial that has ended no step is `next`: the steps that are done or skipped stay so and the others are `todo`.
- **What the flask view carries.** The plume is its `status` and nothing else. `fraction` and `fadeSeconds` stay in `flask.ts`: either one, after a single addition, gives the titrant still needed, and with it the hidden NaOH molarity. `pinkConcentration` is 0 while `pink` is false: below the threshold the figure is the flask's pH in another form (read after two stream additions it gave seed 1's molarity as 0.095020), and the drawing shows nothing there. From the threshold up it is handed over, because the depth of the drawn pink needs it. How long a drawn plume takes to fade is the app's matter and follows from the status alone, through `plumeFadeAtOnceSeconds` and `plumeFadeSlowlySeconds` of the record (Task 2).
- **The hint.** True in Guided when the trial is open, the delivered volume is within `slowDownUl` before the flask's own equivalence volume, or past it, and the mixed flask is not pink. A ran-out trial that stopped within 1 mL of equivalence does not show it.
- **No selector throws** on a record that passes the schema.

- [x] `select.test.ts`, on `PINNED_MODEL`:
  - `hclLabel` is "0.0976" on a new lab of seed 1. `trueNaoh` is null after one counting trial and after the three graded trials of the D1 route in Task 6; "0.09502" on completion.
  - Seed 1 prepared: burette `{ filled: true, levelUl: 2563, tipBubble: false, atBottom: false }`; flask `volumeUl` 25 102, `pink` false, `pinkConcentration` 0, `plume` null, `persistence` `unchecked`. After one stream addition the plume is `fades-at-once`; after a swirl and wait `persistence` is `faded`. At the careful endpoint: `pink` true, `pinkConcentration` 3.51×10⁻⁶ M to three figures, `volumeUl` 50 802, plume `persists`, and after the wait `persisted`. After drops to overshoot, `overshot` is true.
  - Nothing of the answer in the flask view (the Global Constraint). Careful runs of seeds 1 to 10, the view read after every addition: `hasAliquot`, `indicatorDrops`, `waterUl` and `volumeUl` are what the learner put in; the plume is one of the three statuses; and over every addition before the pink one, more than a thousand flasks each with its own volume still to run in, the rest of the view takes exactly two values: `{ pinkConcentration: 0, pink: false, overshot: false, plume: 'fades-at-once', persistence: 'unchecked' }` and the same with `'fades-slowly'`. At the pink addition the plume is `persists` and `pinkConcentration` is at or above the threshold.
  - The hint, seed 1: true in Guided from 24 700 to 25 675 µL delivered and never in Challenge. With an unconditioned burette (equivalence 26 204.96): false at 25 000, true at 25 250.
  - `trialOutcome`: open; the careful trial `{ state: 'passed', percentError: null, causes: [], counts: true }`, its figure −0.126; all three technique errors together failed, the three causes in order, `counts` false; a Challenge trial with the initial reading typed 2.65 and the HCl typed 0.0967 (titre 25.61, 0.0967 × 25.00 ÷ 25.61 = 0.094397, molarity 0.0944): passed, causes `initial-misread` and `hcl-label-misrecorded`, `counts` false, its figure −0.652; the 28.29 trial of Task 6: passed, `final-misread`, `counts` false, its figure −0.232; the unconditioned trial 1: failed, −2.126, `burette-not-conditioned`; the two cancelling pairs of Task 6: passed, the two causes of each named in order, `counts` false, their figures −0.126 and −0.442. Every passed trial in this list is in a lab that is not completed, so its outcome's `percentError` is null; "its figure" is pinned in the same case by the exported `percentError` on the trial's typed molarity and the seed's NaOH, and so is the −0.021 of each fitted trial of the D1 route.
  - The percent error held back and given (spec 7.3). Seed 1: after two careful trials both outcomes are passed with `percentError` null and `trueNaoh` is null; after the third, `trueNaoh` is "0.09502" and the three carry −0.126, −0.232 and −0.126. With the pipette not rinsed in trial 1, that trial is failed at +1.873 at once, and the careful trial after it is passed with null. A hand-made record with three counting trials and `status: 'in-progress'` gives the three figures, as it gives the true molarity. A trial within 1.0% with a technique cause releases nothing (added at Gate A): after the bubble-and-pipette trial of Task 6 and two careful trials the lab is in progress, two trials count, all three outcomes are passed with `percentError` null, `trueNaoh` is null and so is the summary; the fourth trial completes the lab and all four then carry their figures (−0.442, −0.232, −0.126, −0.126).
  - Invalid trials: a streamed trial is `{ state: 'invalid', reason: 'overshot', causes: [] }`; an overshot trial drawn with a wet pipette names `pipette-not-rinsed`; an overshot trial run with the bubble not cleared names `tip-bubble`, also after a round trip through `JSON` with two later trials added; a discarded trial is `{ state: 'invalid', reason: 'discarded', causes }`.
  - For every trial of every lab the tests build, `counts` agrees with `countingTrials`, and a passed trial counts exactly when its `causes` is empty.
  - Summary, seed 1, three careful trials (0.0949, 0.0948, 0.0949): null until entered; after `recordSummary` with 94 900 and 47 it is `{ meanE6: 94900, deviationTenths: 4, learnerMeanE6: 94900, learnerDeviationE2: 47 }`.
  - Guards: a hand-made record with `status: 'completed'` and no counting trial gives a null summary and no true molarity; a hand-made graded trial with no molarity is `open`.
  - Checklist. New lab: eleven steps, `hcl` next, ten to do. After recording the label, conditioning and filling: `hcl`, `condition`, `fill` done, `tip-bubble` next. After clearing the tip as well (level 2563, above `fillLevelMaxUl`): `fill` is still done, `tip-bubble` done, `initial-reading` next. Filled unconditioned with the label recorded: `hcl` done, `condition` skipped, `fill` done, `tip-bubble` next. Prepared carefully: eight done, `titrate` next, `final-reading` and `molarity` to do. Trial 2 after a careful trial 1, nothing done: `hcl` done, `fill` next, then `initial-reading`, `aliquot`, `indicator`, `titrate`, `final-reading`, `molarity` to do, eight steps. Trial 2 after an unconditioned trial 1: the list has `condition`, skipped, and `fill` is next; after conditioning and filling in that trial `condition` is no longer listed, `fill` is done and `tip-bubble`, now listed, is next (nine steps). Trial 2 with an initial reading recorded and no refill: `fill` is next and `initial-reading` done. Skipped wins over done: an initial reading taken with the bubble in the tip gives `tip-bubble` skipped, and it is still skipped after 5 mL has been delivered and no air is left; an aliquot drawn unrinsed gives `rinse-pipette` skipped, though `pipetteRinsed` is then true. A step skipped in a later trial stays in the list: in a trial 2 begun on a pipette still wet with water, `rinse-pipette` is listed and, once the aliquot is drawn, skipped; in a trial 2 conditioned and read with its new bubble, `tip-bubble` is skipped and still listed after 5 mL, and in the trial after it is not listed. An ended trial: for an overshot trial, a ran-out trial and a discarded one no step is `next`. The hint (*invariant*): false in every state of the tests' labs whose current trial has ended, a ran-out trial included.
  - 2000 random records that pass the schema, built in the test: no selector throws on any.
- [x] The lint rule: files under `src/app/` may import `@/engine/titration` and nothing below it, by alias or by relative path; test files under `src/app/` may also import `@/engine/titration/testkit`. The app block of `eslint.config.js` restates its whole option list, because the last block wins. Tests under `src/app/` take the model from `modelFrom(titrationData)`, which Task 4 holds equal to the pinned one. `src/lint-rules.test.ts` gains: an import of `@/engine/titration/flask` and one of `../../../engine/titration/setup` in a file under `src/app/lab/titration/` are rejected; `@/engine/titration` is accepted; `@/engine/titration/testkit` is accepted in a test file there and rejected in a component; a static import of three outside a scene folder is still rejected.

**Done when:** `select.test.ts` and `lint-rules.test.ts` pass; `npm run build` passes.

### Task 8: Acceptance

Read: spec 7.4, all thirteen checks; `engine.md` 5.2 (`acceptance.test.ts`) and 5.3.

`src/engine/titration/acceptance.test.ts` runs spec 7.4 through the state machine, with a 60 s timeout on the seed loops. Where a check is already held by an earlier test the table says so; nothing is repeated without reason. `trialOutcome` holds a passed trial's percent error back until three trials count (Task 7), so wherever a case below gives the percent error of a passed trial in a lab that is not completed, or a shift against one, the test works it with the exported `percentError` from the trial's typed molarity and the seed's NaOH, and holds the outcome's own figure equal to it wherever the outcome carries one.

| Check | Held by |
| --- | --- |
| 1 Solver | `ph.test.ts` (Task 1) |
| 2 Titration curve | here |
| 3 Endpoint | `flask.test.ts` for the chemistry; here through the state machine |
| 4 Grid offset | `flask.test.ts` for the corners; here for every flask a learner can make |
| 5 Grading, 6 Typed molarity | `entries.test.ts` (Task 5); `actions.test.ts` (Task 6) |
| 7 Honest trial | `actions.test.ts` and `select.test.ts`; here for a whole lab, and for a technique cause in a trial within 1.0% |
| 8 Technique errors, 9 Distilled water | here |
| 10 Trial endings, 11 Modes | `actions.test.ts` (Task 6), in cases named after the checks |
| 12 Reproducibility, 13 Resume | here |

- [x] **Curve** (check 2). HCl and NaOH only: HCl 0.0850, 0.0950 and 0.1050 M with NaOH 0.09500, 0.10000 and 0.10500 M, a 25.000 mL aliquot, no indicator, `dissolvedCo2` 0, every 25 µL from 0 to 50 000, leaving out the points within 500 µL of equivalence. That is nine pairs and 17 644 points: the worst difference from the closed form is below 10⁻¹² pH (measured 1.8×10⁻¹⁵), with the basic side's reference worked from the hydroxide root; pH 7.00 is crossed within 10⁻⁶ µL of the stoichiometric volume.
- [x] **Endpoint** (check 3). Seeds 1 to 100 at 2 and at 3 drops through `titrateCarefully`: the values of Task 1, and the trial is open with the endpoint confirmed. Seed 1: 143 additions, pH 4.95 then 8.96, pink 3.51×10⁻⁶ M.
- [x] **Every flask a learner can make** (check 4). The eight corners × 2 or 3 drops × 0, 10, 20 or 30 mL of water × pipette wet or rinsed × burette conditioned or not, 256 flasks: the excess to the threshold runs from 9.599 to 16.274 µL, the largest at 3 drops, 30 mL of water, a rinsed pipette and an unconditioned burette.
- [x] **A careful lab** (checks 7 and 8). Seeds 1 to 100, at 2 and at 3 drops: all 200 labs complete in exactly three trials; all 600 trials pass and count; after the second trial of each lab both outcomes carry no percent error; the percent errors, read from the outcomes of the completed labs, run from −0.316 to +0.087.
- [x] **Technique errors, each alone** (check 8). Seeds 1 to 100, 2 and 3 drops, first trial, Challenge, honest readings. The shift against the careful trial of the same seed: −2.168 to −1.864 for the burette, −2.871 to −2.148 for the bubble, +1.910 to +2.216 for the pipette. Every one of the 600 runs is open after titrating (not overshot), fails, and names exactly its own cause. Later trials, seed 1: with the burette never conditioned, trials 2 and 3 after a refill fail at −2.126 with the cause named, and trial 4, after conditioning, refilling and clearing the new bubble, passes at −0.126 with none; with the pipette never rinsed, and with the bubble never cleared, trial 2 passes at −0.232 with none.
- [x] **Distilled water** (check 9). For 1, 2 and 3 washes, seeds 1 to 100 at 2 and 3 drops: the equivalence volume is identical by `toBe`; the endpoint is unmoved or one half-drop later (later in 10, 24 and 36 of 200 runs); every trial passes and counts; water is never a cause; none is overshot.
- [x] **A whole lab that is not honest** (check 7; *invariant* from the fifth trial on). The D1 route of Task 6, carried on: after its four trials the lab is in progress; the learner then conditions the burette and runs three careful honest trials, and the lab completes on the third of them, with seven trials in the record, three of them counting.
- [x] **A technique cause in a trial within 1.0%** (check 7; D1 as answered on 2026-10-05; added at Gate A). Honest readings throughout. Seeds 1 to 100 at 2 and at 3 drops, first trial: burette not conditioned with pipette not rinsed is within 1.0% in 200 of 200 runs and never counts; tip bubble not cleared with pipette not rinsed is within 1.0% in 186 of 200 and never counts. Seeds 1 to 100: after a trial read with the bubble in the tip, 16 stream additions and a discard, 120 µL of air is left and the next trial, titrated carefully without clearing it, is within 1.0%, names the bubble and does not count; a lab of three such trials, each after 18 stream additions into a discarded flask and with the burette conditioned again to make a new bubble, has six trials, none counting, and is in progress. In every one of these states no true molarity is given and no passed trial carries a percent error. **No dead end** (*invariant*): from each of them a learner who then conditions a burette that is not conditioned, clears whatever air is in the tip and pipettes with the pipette the last aliquot left wet with acid has three trials that pass and count with no cause named, and the lab completes on the third. What is left of a bubble after 1, 8, 12, 16 or 19 stream additions into a discarded flask is still there after a refill (600 − 30 for each addition) and `clearTipBubble` is allowed in the next trial, at every seed; the bubble's row in spec 7.3's table needed no change.
- [x] **The name of a correct endpoint** (the bench reviewer's corner test). At each of the eight corners, at 2 and at 3 drops, the pink concentration of a flask 24.999 µL past its threshold excess, the latest a half-drop can land, is below `titrationData.parameters.faintPinkNameLimit.value`, which is what makes the bench name it "faint pink" (the test compares the two numbers; it imports nothing from `src/app/`). The deepest is 1.371×10⁻⁵ M at 2 drops and 1.474×10⁻⁵ M at 3, both at HCl low, NaOH high, pipette low, against a limit of 1.5×10⁻⁵. It is here and not in Task 13 because a corner flask cannot be made from a seed and only an engine test may call `flaskChemistry`. A limit lowered at Gate B (D12) that would rename a correct endpoint fails here.
- [x] **Reproducibility** (check 12). Equal states for equal seeds (1, 2, 99, 4 294 967 295) and equal actions; unequal for seeds 1 and 2. Trial 2 after a careful trial 1, and after an overshot trial 1 with 3 drops and 20 mL of water, has the same flask and the same burette after a refill, level 562.
- [x] **Resume** (check 13). For a careful and an all-errors technique, seeds 1, 7 and 99, three trials each, with `learner(through)` passing the state through `JSON` and the schema after every action, each stream addition included: the final state is deep-equal to the one never reloaded and gives the same JSON text. After 40 stream additions and a reload: 10 000 µL delivered, meniscus 12 563. A reload after any single stream addition of a run resumes at that delivered volume.

**Done when:** the file passes, the whole engine suite runs inside the timeouts, and `npm run build` passes. From here spec 7.4 is held by CI.

### Task 9: Storage

Read: spec 10; `shell.md` 6.3, 6.4 and 9.5; `src/app/progress/storage.ts` and its tests; `src/app/AppState.tsx`; `src/app/pages/Settings.tsx`.

**Produces:**

```ts
// src/app/progress/storage.ts
export interface SessionStore extends KeyValueStore {
  /** Forgets every refused save. clearAll calls it: once everything is cleared, nothing unsaved is left to lose. */
  forgetRefused(): void
}
/** After every write, removal or clearing, onPersistent is told whether progress now outlasts the session:
 *  never with an in-memory store; with localStorage, only while no key's latest write was refused. */
export function sessionStore(browser: { store: KeyValueStore; persistent: boolean }, onPersistent: (persistent: boolean) => void): SessionStore
export function clearAll(store: KeyValueStore & { forgetRefused?(): void }): void
/** The not-saving notice: the sentence Settings shows today, held once. Settings uses it, and from Task 14 the lab page. */
export const NOT_SAVING_TEXT: string
```

`reportingStore` has no other user and goes. Its two tests are replaced by the seven below, which assert everything those two did (a refused write is reported before the error reaches the caller; an accepted one is reported). This is one of the three sanctioned changes to existing tests.

- [x] `storage.test.ts`, what `onPersistent` is told, in order: a lab save refused, then preferences saved: false, false; then the lab saved: false, false, true; two labs refused, the first saved, the second saved: false, false, false, true; a lab refused, then its key removed: false, true; preferences saved, a lab refused that was never stored, then `clearAll`: true, false, false (the removal of the preferences key), true (`forgetRefused`); an in-memory store, a save and `forgetRefused`: false, false; nothing refused, two saves: true, true.
- [x] `src/app/lab/titration/storage.test.ts`, the lab's entry through the real store. It sits in the lab's folder because it needs the engine and its test kit (`createMemoryStore`, `saveEntry`, `loadEntry`, `ENTRY.titration`, `ACTIVITIES[0].version`, `titrationStateSchema`): before any save Home's status is `not-started`, after the first `in-progress`; a lab of seed 1 saved mid-trial after 73 stream additions loads with `deliveredUl` 18 250 and, carried on with the same actions, reaches the same final state as one never saved; a completed lab reads `completed`; a record with a seed of −1, with an extra key, or of another version loads as null, is moved to `valence:backup:lab:titration`, and Home reads `not-started`; the export holds `valence:lab:titration` with its version and seed; after `clearAll` Home reads `not-started`.
- [x] `NOT_SAVING_TEXT` is exported from `src/app/progress/storage.ts` and Settings shows it: the sentence Settings shows today, word for word.

**Done when:** both storage test files and the existing `firstPaint` and preferences tests pass (there is no `AppState` test); `npm run build` passes.

### Task 10: The passage helper and the primer

Read: spec 7.1; `shell.md` 7.1, 7.2, 7.3, 7.5, 7.6 and 9.6; `review-verdicts.md` (shell: the card on how to titrate, CO₂ and the solution); `integration.md` G2, G3, G6 and section 7; decisions D2, D11, D15; `src/chem-data/periodic.ts` for `located`.

**Produces:**

```ts
// src/chem-data/support.ts   (`located` alone, moved out of periodic.ts with its own doc comment; periodic.ts imports it and exports it again)
export function located(url: string, where: string, establishes: string): string

// src/chem-data/titration/primer.ts
/** A paragraph: the text shown, an equation shown under it, its sources, and what it rests on (kept for review, not shown). */
export interface PrimerParagraph { text: string; equation?: string; sourceIds: string[]; support: string }
export interface PrimerSection { id: string; heading: string; paragraphs: PrimerParagraph[] }
export const TITRATION_PRIMER: readonly PrimerSection[]
```

Content rules:

- **Twelve cards**, in this order of ids: `acids-and-bases`, `molarity`, `titration`, `standardizing`, `endpoint`, `phenolphthalein`, `titrating`, `calculation`, `burette`, `glassware`, `precision`, `safety`. Eleven start from `shell.md` 7.2. The first card opens with one paragraph that says which three cards to read before the bench (`titrating`, `burette`, `calculation`) and that the rest can wait.
- **`titrating`, new.** Swirl throughout. Run the NaOH in quickly while far from the endpoint and use the 5 mL pour only there; where the endpoint lies is estimated from the label before starting (about label × 25.00 ÷ 0.1 mL). When the pink where the drop lands starts to linger, close the stopcock and go a drop at a time. Near the end a whole drop is too much: let part of a drop form on the tip, touch it off on the flask wall and wash it down with distilled water. The endpoint is the first faint pink that lasts 30 seconds of swirling. At a real bench the pink fades as the flask takes up CO₂ from the air, which is why the rule gives a time; this lab's flask is closed, so here a pink that persists always lasts the wait, and the card says so. A source is read and located for the half-drop and for the 30 seconds; a paragraph for which none could be read is marked "This lab:" and says no source was read, and Gate A is told.
- **The helper.** Only `located` moves. `Passage`, `Description` and `description` have no user in this phase (a primer paragraph is its own shape) and stay in `periodic.ts`, and so does the comment above `Passage`, which says what that file quotes and under what licence: moved, it would put a statement of OpenStax's licence into a new file (D2).
- **The `calculation` card** (D6). It says to keep every digit until the last step and to round the answer to four decimal places, not cut it off. Its worked example is one where the two differ: initial 0.50, final 30.60, titre 30.10, 0.1200 × 25.00 ÷ 30.10 = 0.09967, which rounds to 0.0997 and cuts off to 0.0996. The card is one of the three read first, so rounding is met here before it is met as a refusal at the bench. If Q1 is answered "a tie rounds up", the card also says that a 5 rounds up.
- **Corrections to the eleven.** The acid was itself standardized by someone: its molarity is given, and it is not a primary standard. Conditioning uses two or three small portions. A NaOH solution goes on taking up CO₂ once made, which is why its bottle is kept closed and it is standardized again. The burette is refilled before each trial. The eye must be level with the meniscus, why, and that this lab's reading view always is. The safety card describes the three bottles as Task 2 stored them and makes no claim a fetched source does not carry. Nor does it name some of a sheet's hazards and leave out others (Gate A, F15): of the indicator it says that a supplier's sheet for a solution of this kind lists it as flammable and as a hazard to health over the long term, including that it may cause cancer and may harm fertility or an unborn child, and that the note under the bottle gives the full list. The card uses its own words and no codes; the bottle's note keeps the codes.
- **Support lines.** Each is either the located form or begins "This lab:". None is a quotation, from any source. An OpenStax citation added in this task says nothing about a licence.
- **Sources.** The primer's sources go into the manifest of Task 2 and reach `sources.json` through `npm run build:data`. Each has one `supports` row whose field is `primer` (a title or heading as the source prints it), and a test holds the set of those sources to the set the primer cites; none of the pages is kept. The OpenStax sections the primer cites have ids beginning `flowers-chem2e-`, not `openstax-`: `periodic.test.ts`, which this task leaves unchanged, holds every `openstax-` source to a citation that states a licence, and these citations state none (as built).

- [x] `periodic.test.ts` and `periodicCard.test.ts` pass unchanged after the move; `support.ts` imports no JSON and names no source.
- [x] `primer.test.ts`: the twelve ids in order; every section has a heading and at least one paragraph; every cited id exists in `sources.json`; every support line starts "This lab:" or is the located form, and none contains a quotation mark; the paragraphs with no source are exactly those the test lists by section and index, each with a "This lab:" line; every heading, paragraph and equation passes `findInstitutionText`; the arithmetic of the examples holds (0.1000 × 0.02500 = 0.002500; 30.60 − 0.50 = 30.10; 0.1200 × 25.00 ÷ 30.10 = 0.099668, which rounds to 0.0997 and cuts off to 0.0996, so the example shows the difference); the `calculation` card's text holds "0.0997"; the worked example's bottle, 0.1200 M, is outside the 0.0850 to 0.1050 M any bottle here can have; no citation of a source this task adds contains "CC BY" or the word "licensed" where its url names OpenStax.
- [x] `npm run build:data`; no diff after a second run.

**Done when:** both test files pass; `git diff --exit-code` is clean after the data scripts; `npm run build` passes.

### Task 11: Wording

Read: spec 7.2, 7.3; `shell.md` 3.1, 4.5, 5.5 and 9.3; `integration.md` 4.4 and section 5 (the cuts from the shell); decisions D1, D6, D14, D16.

**Produces:**

```ts
// src/app/lab/titration/format.ts
export function readingText(ul: number): string            // 24370 -> "24.37"
export function molarityText(e6: number): string           // 94900 -> "0.0949"
export function percentErrorText(percent: number): string  // "−2.13%", "+1.87%": two decimals, a sign, U+2212 for minus
export function deviationText(tenths: number): string      // the notebook's own: 4 -> "0.4"
export function deviationE2Text(e2: number): string        // the learner's own, with no trailing zero: 47 -> "0.47", 130 -> "1.3"

// src/app/lab/titration/messages.ts
export const BLOCKED_TEXT: Record<Exclude<Blocked, 'invalid-entry' | 'reread'>, string>
export const INVALID_ENTRY_TEXT: Record<'reading' | 'hcl-molarity' | 'molarity' | 'deviation', string>
export function rereadText(typedUl: number): string
/** The sentence for any reason the engine gives: BLOCKED_TEXT's, or INVALID_ENTRY_TEXT[entry] for 'invalid-entry', or rereadText(typedUl) for 'reread'.
 *  Tasks 19 to 21 call this; nothing indexes BLOCKED_TEXT with a Blocked, which does not compile. */
export function blockedText(reason: Blocked, entry?: 'reading' | 'hcl-molarity' | 'molarity' | 'deviation', typedUl?: number): string
export const WARNING_TEXT: Record<Warning, { title: string; body: string }>
/** The two buttons of a warning group, by the action that raised it: one way back and one way on, however many warnings it lists. */
export const WARNING_BUTTONS: Record<'fillBurette' | 'recordInitialReading' | 'pipetteAliquot', { back: string; on: string }>
export const CAUSE_TEXT: Record<Cause, string>
export const STEP_TEXT: Record<Step, { first: string; later: string }>
export const STEP_STATE_TEXT: Record<'done' | 'next' | 'todo' | 'skipped', string>
export const GUIDE_TRIAL_OVER: string                            // what the guide says in place of a next step once the trial has ended
export function outcomeLabel(outcome: TrialOutcome): string     // the Result cell
/** The first line of an ended trial's feedback, a failed trial's apart (it carries a figure), and the note on water. Task 19 shows OUTCOME_TEXT['ran-out']. */
export const OUTCOME_TEXT: Record<'passed' | 'notCounted' | 'closeWithTechniqueError' | 'largerHere' | 'largerHereAndShown' | 'water' | 'overshot' | 'ran-out' | 'discarded', string>
export function feedback(outcome: TrialOutcome, waterUl: number): string[]
export function workedLines(hclE6: number, initialUl: number, finalUl: number): string[]
export function completedText(trueNaoh: string): string
export const SUMMARY: { heading: string; waiting: string; ask: string; ownAverage: string; ownDeviation: string; reveal: string; average: string; deviation: string; explain: string }
export function workedAverage(molaritiesE6: readonly number[]): string
export const NOTEBOOK_TEXT: { check: string; discard: string; nextTrial: string }

// src/app/lab/shellText.ts   (the shared shell's own wording; phase 4 uses it too)
export const SHELL_TEXT: { guided: string; challenge: string; start: string; restart: string; restartConfirm: string; primer: string; modeLocked: string; planned: string }
export const NARROW_NOTICE: { title: string; body: string; withRun: string; withoutRun: string }
```

Typing the tables from the engine's unions makes a missing sentence a type error. Tests refer to the exported constants, never to a copy of a sentence, so a sentence changed at Gate A changes in one place.

Drafts: `integration.md` 4.4 for the reasons; `shell.md` 5.5 for the warnings, the causes (under the engine's names), the steps, the worked lines and the summary; `shell.md` 3.1 for the shell. Required changes and new sentences:

- **Outcome labels:** "Passed"; "Passed, not counted"; "Not passed, −2.13%" (with the figure); "Invalid: overshot"; "Invalid: burette ran out"; "Invalid: discarded"; "In progress".
- **A pass that does not count** (D1 as answered on 2026-10-05): "This trial is within 1.0%, but it does not count toward your three. A trial counts only when it was run with a conditioned burette, no air bubble in the tip at the initial reading and a pipette that was not wet with water, both burette readings are within 0.02 mL of the meniscus, and the HCl molarity is the one on the label." The cause sentences that apply follow it. The pipette is "not wet with water" and not "rinsed": the aliquot of an earlier trial leaves it wet with acid, and a trial drawn with it then counts.
- **Count, not pass** (D1, D16). Every sentence about completion or the summary says "count", not "pass": `lab-not-completed` is "These are entered once three trials count."; `SUMMARY.heading`, `waiting`, `ask` and `average` name "the three trials that count"; `completedText` says three trials counted. A learner can have four or more passed trials of which three count, and a sentence that says to average "three passing trials" would have them include one the notebook leaves out.
- **A technique cause in a trial within 1.0%** (the owner's answer at Gate A, 2026-10-05: it does not count). `OUTCOME_TEXT.passedInSpite` and its branch of `feedback` are gone. The first line is `OUTCOME_TEXT.notCounted`, as for a misread; the causes follow; and after them, when a technique cause is among them, comes `OUTCOME_TEXT.closeWithTechniqueError`: mistakes in technique can push a result in opposite directions and cancel, and a small one may not move the result far, so a result this close does not show that the technique was sound. It covers both cases Gate A found, a pair that cancels and what is left of a bubble. It does not scold and says nothing of luck.
- **Larger here than at a bench** (Gate A, F1; said once from 2026-10-05). When a technique cause is among a trial's causes, one line follows them all, and `closeWithTechniqueError` where there is one: this lab makes a technique mistake cost more than it does at a real bench. It is said once however many causes are named, and no cause's own sentence says it. Under a failed trial the line adds "so that it shows in the result" (`OUTCOME_TEXT.largerHereAndShown`); under a trial within 1.0% and under an invalid one it does not (`OUTCOME_TEXT.largerHere`), since the first's result was close and the second has none. So `feedback` gives: the first line, the causes in the union's order, `closeWithTechniqueError` for a passed trial with a technique cause, the larger-here line for any trial with one, then the water note.
- **Causes are worded for every outcome.** A cause is named under a failed trial, under a passed one and under an invalid one that has no titre, so a technique cause says which way the error pushes a result ("on its own that makes the titre too high"), not what this trial's result was. `hcl-label-misrecorded` speaks of the molarity the trial was calculated with, since the notebook's may have been put right since. The water note does not say the water changed nothing: at the last mark it can end a trial (D5).
- **`final-not-after-initial`** says, after the draft's two sentences, that an initial reading which is wrong cannot be put right once NaOH has run out, and that the flask must then be discarded, naming `NOTEBOOK_TEXT.discard`. A Challenge learner who mistyped the initial reading has no honest final reading left, and this is the way on.
- **`blockedText` with nothing typed** still gives a sentence: `invalid-entry` without an entry is taken as a reading (the engine refuses a parsed entry only when a reading is off the scale), and `reread` without a reading begins "That reading".
- **A discarded trial** has a sentence of its own for "Invalid: discarded", which the drafts lack: the flask was discarded, so the trial has no result and is run again. Its technique causes follow.
- **Warnings.** `burette-not-conditioned` is raised by a fill and by the initial reading of a burette already filled dilute, so its body reads true in both places. The buttons belong to the action, not the warning: the draft's "Fill it anyway" is `WARNING_BUTTONS.fillBurette.on` and nothing else.
- **A passed trial's percent error is never worded.** `trialOutcome` gives null for it until three trials count and a number from then on (Task 7). `outcomeLabel` and `feedback` read `percentError` only where `state` is `failed`, where its type is a number, so a passed trial reads the same before completion and after.
- **A failed trial:** the percent error with its sign, the direction in words (too low, too high), then each cause. When the figure reads 1.00 the line adds "just outside the 1.0% allowed".
- **`calculation-mismatch`** (D6) names the three numbers, says to keep every digit until the last step, to round the answer to four decimal places and not to cut it off, and that nothing has been marked. If Q1 is answered "a tie rounds up", it also says that a 5 rounds up.
- **`GUIDE_TRIAL_OVER`** says the trial is over and points to the notebook for what comes next. It is true after completion too, so it does not say to start another trial.
- **`endpoint-not-confirmed`** says to swirl and wait. **`water-full`** does not suggest more water would spoil the flask. **`SHELL_TEXT.modeLocked`** says the mode can be changed between trials.
- **The ran-out sentence** is the spec's (7.2), word for word.
- **`completedText`** says three trials counted, gives the true molarity as the engine gives it, to five decimal places, and says nothing of four.
- **`SUMMARY.explain`** says what relative deviation measures, that it is not marked, that a learner who kept more digits of the average may differ from the notebook in the last digit, and that molarities are typed to four decimal places, and one unit in the fourth place is about one part per thousand of the result, so the relative deviation of three careful trials can take only a few values and reflects rounding as much as technique. It does not mention the label or significant figures: whether a typed molarity has three or four significant figures depends on the NaOH value (seed 11's is 0.1001 under a label of 0.0952), and the few values come from the four-decimal grid at any molarity in range (0.0001 ÷ 0.0950 to 0.1050 is 1.05 to 0.95 parts per thousand; two equal trials and one a unit off give 0.32 to 0.35).
- **`NARROW_NOTICE`** (D14) is `integration.md`'s T1: the bench is shown in windows at least 768 pixels wide; use a wider window, a tablet turned sideways or a computer; if the page is zoomed in, zooming out brings the bench back; progress is kept in the browser it was made in. Then one of two closing sentences.
- **Steps in a later trial:** "Refill the burette with NaOH"; "Pipette 25.00 mL of HCl into a clean flask".

- [x] `format.test.ts`: `readingText` of 24 370, 70 and 8290 is "24.37", "0.07", "8.29", and `parseReading(readingText(ul))` gives `ul` back for every hundredth from 0 to 50 000; `molarityText` of 94 900 and 100 000 is "0.0949" and "0.1000", and `parseMolarity(molarityText(e6))` gives `e6` back for every multiple of 100 below 1 000 000; `percentErrorText` of −2.1259, 1.8733, 12.5 and −1.5 is "−2.13%", "+1.87%", "+12.50%", "−1.50%", each minus being U+2212; of 1.00402 it is "+1.00%" (a trial at 0.1006 M against a true 0.09960 M: 0.0010 ÷ 0.0996 = 1.004%, which fails, since 100 000 > 99 600); `deviationText` of 0, 4, 10 and 133 is "0.0", "0.4", "1.0", "13.3"; `deviationE2Text` of 47, 130, 200, 50 and 0 is "0.47", "1.3", "2", "0.5", "0", and `parseDeviation(deviationE2Text(e2))` gives `e2` back for every whole number from 0 to 2000.
- [x] `messages.test.ts`:
  - Feedback. "No percent error" below means nothing matching `/[+−]\d+\.\d\d%/`; a bare percent sign is allowed, since the D1 sentence itself says "within 1.0%". A clean counting pass: one line, with no percent error in it, and the same line whether the outcome's `percentError` is null or −0.126. A failed trial at −2.126 with one cause: the first line holds `percentErrorText(−2.126)` and "too low", then that cause's sentence. A failed trial at +1.004: its first line holds "+1.00%" and "just outside". A pass with two technique causes, which does not count: the does-not-count sentence, both causes in the union's order, then `OUTCOME_TEXT.closeWithTechniqueError`, no percent error; that last sentence is not said under a misread alone, a failed trial or an invalid one, and is said when one technique cause stands beside a misread. The larger-here line: no `CAUSE_TEXT` sentence holds "more than it does at a real bench"; the feedback of a trial with one, two or three technique causes holds it exactly once, after the last cause and before the water note; the feedback of a trial with no technique cause (a clean pass, a failed trial with none, a misread, a misread with a wrong label, an overshot trial with no cause) does not hold it; "shows in the result" is in a failed trial's feedback and in no passed or invalid trial's. A pass with `final-misread` and `counts` false: the does-not-count sentence, then the cause, no percent error. Invalid, each of the three reasons, `discarded` included: its sentence, its technique causes, no percent error. Water added: the water note comes last and is never a cause.
  - `outcomeLabel` for each of the seven cases above; a passed outcome reads "Passed" with `percentError` null and with −0.126 alike.
  - `rereadText(1300)`: none of "too high", "too low", "higher", "lower", "larger", "smaller" in it ("above" and "below" are allowed: the draft uses them to say how a burette is read, not which way the reading is off); its only numbers are the typed reading, 0.02 and 0.00.
  - `blockedText('burette-empty')` is `BLOCKED_TEXT['burette-empty']`; `blockedText('invalid-entry', 'molarity')` is `INVALID_ENTRY_TEXT.molarity`; `blockedText('reread', 'reading', 1300)` is `rereadText(1300)`; for every `Blocked` it returns a sentence.
  - Count, not pass: no exported string, and no function output for the cases here, matches `/three (passing )?trials (have )?passed|three passing trials|three passes/`; `BLOCKED_TEXT['lab-not-completed']`, `SUMMARY.heading`, `SUMMARY.waiting`, `SUMMARY.ask`, `SUMMARY.average` and `completedText('0.09502')` each contain "count".
  - `WARNING_BUTTONS` has exactly the three actions that can raise a warning, and `WARNING_BUTTONS.recordInitialReading.on` does not contain "Fill".
  - `workedLines(97600, 2560, 28260)` hold 2.56, 28.26, 25.70, 0.0976 and 25.00, end "= ?" (the substituted line is the last, with the line on rounding before it), and contain neither 0.0949 nor 0.0950.
  - `completedText('0.09502')` contains "0.09502" and no "four". `GUIDE_TRIAL_OVER` contains neither "next trial" nor "Start".
  - Across every exported string of `messages.ts` and `shellText.ts` and every function's output for the cases above: no finding from `findInstitutionText`; the only numbers with two decimals are the learner's own, a failed trial's percent error, and the fixed 0.00, 0.02, 24.30, 25.00 and 50.00; there is no number with four or five decimals except the fixed example 0.1234 and what the function was given.
  - No function in `messages.ts` takes the model or the state: a reviewer checks the signatures above still hold.

**Done when:** both test files pass; a `Blocked`, `Warning`, `Cause` or `Step` added to the engine fails the type check here until it has a sentence; `npm run build` passes.

### Task 12: Bench pure modules

Read: `bench.md` sections 4, 6.3, 7 and 10; `review-verdicts.md` (bench: the name of a correct endpoint, the 50.00 mL wording); `integration.md` C6, C11, C13.

**Produces:**

```ts
// src/app/lab/titration/buretteGeometry.ts   (volumes are whole microlitres; a burette is numbered downward, so a larger volume is a larger y)
export const BURETTE_CAPACITY_UL = 50_000; export const GRADUATION_UL = 100   // the scale's last mark and one graduation; meniscusText.ts reads both
export const READING: { width: 260; height: 576; unitsPerMl: 480; aboveUl: 550; spanUl: 1200; tubeLeft: 30; tubeRight: 170; meniscusRiseUl: 80 }
export const STAND: { width: 300; height: 640; scaleTop: 40; unitsPerMl: 8.4 }
export interface Graduation { ul: number; y: number; kind: 'ml' | 'half' | 'tenth'; label: string | null }
export function readingWindowTopUl(levelUl: number): number       // floor(level / 100) * 100 - 550
export function readingY(volumeUl: number, levelUl: number): number
export function readingGraduations(levelUl: number): Graduation[]  // none above 0 or below 50 000
export function standY(volumeUl: number): number
export function standGraduations(): Graduation[]                   // every mL; 'half' at 5s; numbered at 10s

// meniscusText.ts
export const MENISCUS_POSITIONS: readonly ['at-or-just-below', 'quarter', 'half', 'three-quarters', 'just-above']
export function markText(ul: number): string                       // 24300 -> "24.3", by whole-number arithmetic
export function meniscusBracket(levelUl: number): { upperUl: number; lowerUl: number; position: (typeof MENISCUS_POSITIONS)[number] }   // levels 0 to 49 999
export function meniscusText(levelUl: number): string              // levels 0 to 50 000

// flaskColour.ts
export type FlaskColourName = 'empty' | 'colourless' | 'faint pink' | 'pink' | 'dark pink'
export interface FlaskColour { name: FlaskColourName; label: string; strength: number; fill: string }
export const PINK = '#d81b7f'; export const DARK_PINK = '#8a0f4d'
export interface FlaskColourInput { hasLiquid: boolean; indicatorDrops: number; pinkConcentration: number; pink: boolean; overshot: boolean; pinkDisplayScale: number; faintPinkNameLimit: number }
export function pinkStrength(pinkConcentration: number, pink: boolean, pinkDisplayScale: number): number   // 0 unless pink; else 1 - exp(-c / scale)
export function flaskColour(input: FlaskColourInput): FlaskColour

// stream.ts   (in additions, never volumes: no volume crosses from src/app to the engine)
export const STREAM_INTERVAL_MS = 400
export const POUR_ADDITIONS: readonly [4, 20]                      // 1 mL and 5 mL at the model's 0.25 mL
export type Stream = { open: false } | { open: true; pour: number | null; remaining: number | null }
export const CLOSED: Stream
export function openStream(pour: number | null): Stream
export function streamTick(stream: Stream, canDeliver: boolean): { deliver: boolean; next: Stream }
```

The bench never compares a concentration with the threshold itself: `pink` is the engine's word. The engine hands over a pink concentration of 0 until the flask is pink (Task 7), so the rows below with `pink` false and a concentration above 0 test the function, not a value the bench is ever given. The name is "faint pink" while the flask is pink and below `faintPinkNameLimit`, and "pink" from the limit up. The colours and the display scale are D12's starting values.

As built: the dark pink needs the overshot flag and at least one drop of indicator in the flask, so `indicatorDrops` is read there and nowhere else in `flaskColour`; the engine cannot give an overshot flask with no indicator (D3). `meniscusText` gives the 50.0 mL sentence itself, so `meniscusBracket` is never asked about 50 000. A stand graduation's `kind` is `ml` at every 10 mL, `half` at every 5 and `tenth` at every other mL: the three weights of line, not the volumes the names say. One test holds the last graduation of both drawings to the model's `buretteCapacityUl`.

- [x] `buretteGeometry.test.ts`:

| Case | Expected |
| --- | --- |
| `readingWindowTopUl` of 24370, 24300, 24399; of 24400 | 23750 each; 23850 |
| of 0, 370, 2000; of 49999, 50000 | −550, −250, 1450; 49350, 49450 |
| `readingY(24370, 24370)`; `(24371, 24370)` | 297.6; 298.08 |
| `readingY` of 24300, 24400, 24000, 24390, 24350 at level 24370 | 264, 312, 120, 307.2, 288 |
| `readingY(0, 0)`, `(50000, 50000)` | 264, 264 |
| 0.01 mL; the ±0.02 mL tolerance | 4.8 units; 9.6 units either side |
| for every level 0 to 50 000: `readingY(level, level)` | at least 264 and under 312 |
| graduations at levels 0, 370, 1999, 24370, 24950, 49999 | every y a whole number; neighbours 48 apart |
| `readingGraduations(24370)` | twelve, 23800 to 24900, at y 24, 72, 120, 168, 216, 264, 312, 360, 408, 456, 504, 552; the only label is "24" at 24000, kind `ml`; 24500 is `half`, 24300 `tenth` |
| labels at level 24520; at 24460 | "24" and "25" each |
| for every level 0 to 50 000 | at least one labelled mark |
| `readingGraduations(120)` | eight, 0 to 700, none above 0; the first `{ ul: 0, y: 216, kind: 'ml', label: '0' }` |
| `readingGraduations(49950)` | seven, 49400 to 50000, none below 50 000 |
| `standY` of 0, 50000, 25000, 24370 | 40, 460, 250, 244.708 |
| `standGraduations()` | 51 marks; labels "0", "10", "20", "30", "40", "50"; `half` at 5000, 15000, 25000, 35000, 45000 |

- [x] `meniscusText.test.ts`. Each text for a level below 50 000 begins "The bottom of the meniscus is between the A mL and B mL marks, " and ends ". The numbers on a burette increase downward."

| Level | A, B | Position |
| --- | --- | --- |
| 24300, 24319 | 24.3, 24.4 | at or just below the 24.3 mL mark |
| 24320 | 24.3, 24.4 | about a quarter of the way down from the 24.3 mL mark |
| 24350 | 24.3, 24.4 | about halfway between them |
| 24370 | 24.3, 24.4 | about three quarters of the way down from the 24.3 mL mark |
| 24399 | 24.3, 24.4 | just above the 24.4 mL mark |
| 0 | 0.0, 0.1 | at or just below the 0.0 mL mark |
| 987 | 0.9, 1.0 | just above the 1.0 mL mark |
| 1963 | 1.9, 2.0 | about three quarters of the way down from the 1.9 mL mark |

  At 50 000 the text is "The bottom of the meniscus is at the 50.0 mL mark, the bottom of the scale. The numbers on a burette increase downward." `markText` of 0, 100, 900, 1000, 24300, 29900 and 50000 is "0.0", "0.1", "0.9", "1.0", "24.3", "29.9", "50.0". The text at every level from 0 to 50 000 never matches `/\d\.\d\d/`. A learner with only the text: for every level from 0 to 49 999 and every reading the wording allows (the upper mark plus 0, 10 or 20 µL for the first position; 20 or 30 for the second; 40, 50 or 60; 70 or 80; 80, 90 or 100), the worst error is exactly 20 µL; against the middle of each wording (10, 30, 50, 70, 90) it is exactly 10 µL; at 50 000 the reading 50.00 is exact.

- [x] `flaskColour.test.ts`, scale 10⁻⁵, limit 1.5×10⁻⁵. `pinkStrength` with `pink` false is 0 at 0, 3.9×10⁻¹³ and 9.99×10⁻⁷; with `pink` true it is 0.0952, 0.2592, 0.3874, 0.6321, 0.7769, 0.9046 and 0.9631 at 1×10⁻⁶, 3×10⁻⁶, 4.9×10⁻⁶, 1×10⁻⁵, 1.5×10⁻⁵, 2.35×10⁻⁵ and 3.3×10⁻⁵ (each to 0.0001), and never falls as the concentration rises from 10⁻⁶ to 6×10⁻⁵ in steps of 10⁻⁷. `flaskColour`: no liquid is `{ name: 'empty', label: 'empty', strength: 0, fill: PINK }`; liquid with `pink` false is `colourless` at strength 0, with or without indicator; `pink` true at 1×10⁻⁶ is "faint pink" at 0.0952; at 4.9×10⁻⁶, 1×10⁻⁵ and 1.49×10⁻⁵ "faint pink"; at 1.5×10⁻⁵ and 1.7×10⁻⁵ "pink"; overshot at 2.4×10⁻⁵ is `{ name: 'dark pink', label: 'dark pink (overshot)', strength: 1, fill: DARK_PINK }`; a flask that is not overshot is never dark, however deep.
- [x] `stream.test.ts`: a closed stream ticks to `{ deliver: false, next: CLOSED }`; an open stream delivers on each of five ticks and stays open with `pour` and `remaining` null; `streamTick(openStream(4), true)` is `{ deliver: true, next: { open: true, pour: 4, remaining: 3 } }`; a pour of 4 over six ticks delivers four times and is closed by the fourth tick's result; a pour of 20 over 21 ticks delivers twenty times, then not; an open stream with `canDeliver` false from the third tick delivers twice and is closed by the third; a pour of 20 with `canDeliver` false throughout never delivers and is closed at once.

**Done when:** the four test files pass; `npm run build` passes.

### Task 13: The join

Read: `integration.md` 1.1 and section 2 (C8, C12, C14, C17, C35 and the integrated interfaces); `bench.md` 6.4, 9.2 and 10 (`benchText.test.ts`); `review-verdicts.md` (bench: clearing the tip and the initial reading; repeated drops).

**Produces:**

```ts
// src/app/lab/titration/benchView.ts
export type BenchControl = 'conditionBurette' | 'fillBurette' | 'clearTipBubble' | 'rinsePipette' | 'pipetteAliquot'
  | 'addIndicatorDrop' | 'addWater' | 'deliver' | 'swirlAndWait'
export interface BenchView {
  hclLabel: string                                   // "0.0976"
  burette: { conditioned: boolean; filled: boolean; tipBubble: boolean; levelUl: number; atBottom: boolean }
  pipetteRinsed: boolean
  flask: { hasAliquot: boolean; indicatorDrops: number; waterPortions: number; volumeUl: number; pinkConcentration: number; pink: boolean; overshot: boolean }
  plume: PlumeStatus | null                          // the last addition's status, while no swirl and wait has been done since
  plumeKey: number                                   // changes with every addition; restarts the plume's fade; never shown
  persistence: 'unchecked' | 'faded' | 'persisted'
  controls: Record<BenchControl, Blocked | null>     // the engine's word on each control; null when it can be used now
  trialEnd: 'open' | 'graded' | 'overshot' | 'ran-out' | 'discarded'
  readingWanted: 'initial' | 'final'                 // final once titrant has been delivered in the trial, else initial; never null, so the field always has its label
  readingBlocked: Blocked | null                     // why that reading cannot be recorded now; null when it can
  slowDown: boolean
}
export function benchViewOf(m: TitrationModel, state: TitrationState): BenchView
export type BenchAction = Extract<Action, { type: BenchControl }>

// src/app/lab/titration/benchText.ts   (rule: no sentence here states a volume finer than a whole mL)
export const PLUME_TEXT: Record<PlumeStatus, string>            // 'pink fades at once' | 'pink fades slowly' | 'pink persists'
export function flaskStatus(view: BenchView, display: { pinkDisplayScale: number; faintPinkNameLimit: number }): string
export function levelBracket(levelUl: number): string
export function describeStand(view: BenchView, stream: Stream, display: { pinkDisplayScale: number; faintPinkNameLimit: number }): string
export function streamMessage(stream: Stream): string
/** What a drop or half-drop says; never the same text as `previous`, so a live region speaks on every press. */
export function additionMessage(amount: 'drop' | 'half', previous: string): string
export const ACTION_TEXT: Record<Exclude<BenchControl, 'deliver'>, string>   // what each prep action says it did
export function swirlText(persistence: 'faded' | 'persisted'): string
/** What a wash, a drop or a half-drop adds to its message when it undid a swirl and wait that had shown the pink to last; '' otherwise. `before` is the view before the action. (Added at Gate A.) */
export function undoneText(before: BenchView): string
export const SLOW_DOWN_TEXT: string
export const STOPCOCK_ALREADY_CLOSED: string
```

`benchViewOf` is built from the engine's selectors and `can` alone. `readingWanted` is `final` once titrant has been delivered in the current trial and `initial` until then. `readingBlocked` is `can`'s word on that reading, asked with a probe value; any reading will do, because `benchViewOf` treats `invalid-entry`, `reread` and `final-not-after-initial` as recordable and gives null for them: they are about the value typed, not about the state. `benchText.ts` and Task 12's `meniscusText.ts` are among the files Gate A's reviewer reads, so both are finished before the gate. The status line: "Flask: *name*." then, while a plume is showing, " Last addition: *cue*.", and after a swirl and wait " Swirled 30 s: the pink has lasted." or " Swirled 30 s: no pink remains." in its place.

As built: the status line gives an overshot flask its colour and no cue, and a flask with no indicator "No indicator in it." whatever was done to it. `plumeKey` is the volume delivered in the trial. `benchViewOf` asks about the reading with the value 0. `swirlText` is `ACTION_TEXT.swirlAndWait` with what the wait found, in the status line's own words, and after a pink that lasted it adds that the final reading can be taken. No string in `benchText.ts` holds a number with a decimal point, so the pipette's sentence does not name its 25.00 mL; the checklist and the reasons in `messages.ts` do. The sentences for a fill and for clearing the tip say that an initial reading recorded before them no longer applies, and do not say to take one. `SLOW_DOWN_TEXT` stays on screen for as long as the hint does, through a stopcock opened again, so it says that an open stopcock was closed when the hint appeared and not that the stopcock is closed. Changed at Gate A: a wash of water sets the trial's `lastAdditionUl` to 0, so after one `plume` is null and the line gives the colour alone until titrant runs again. Before that, the join said "Last addition: …" again after a wash, with a cue worked out afresh on the thinner flask, which could call an addition that persisted one that fades slowly. `undoneText` is the sentence for a wash or an addition that undid a confirmed endpoint, which also clears a final reading recorded after it.

- [x] `benchView.test.ts`, each state built with the test kit from a real engine state, on `modelFrom(titrationData)` (seed 1; Guided unless said):

| State | Expected |
| --- | --- |
| New lab | `hclLabel` "0.0976"; status "Flask: empty."; `readingWanted` `initial`, `readingBlocked` `burette-empty` |
| Filled, the bubble in the tip | level 1963; `describeStand` says the level is between the 1 mL and 2 mL marks and that there is an air bubble in the tip; `meniscusText` gives the 1.9 and 2.0 mL marks, three quarters |
| Fill, record the initial reading, clear the tip | `readingWanted` `initial`, `readingBlocked` null; level 2563 |
| Guided, filled, the tip cleared, no reading yet | `readingBlocked` null, whatever the probe: for most values the engine would answer `reread` |
| Aliquot, no indicator | "Flask: colourless. No indicator in it." |
| Prepared | "Flask: colourless."; `controls.deliver` null |
| After 40 stream additions | "Flask: colourless. Last addition: pink fades at once."; level 12 563; flask volume 35 102; controls: condition and fill `mid-titration`, clear the tip `no-tip-bubble`, rinse `already-done`, pipette `flask-has-aliquot`, indicator `mid-titration`, water, deliver and swirl null; `readingWanted` `final`, `readingBlocked` `endpoint-not-confirmed` |
| A swirl and wait then | "Flask: colourless. Swirled 30 s: no pink remains." |
| Guided at 24 700 delivered; Challenge the same | `slowDown` true; false |
| Endpoint, before the wait | "Flask: faint pink. Last addition: pink persists."; `persistence` `unchecked`; `readingWanted` `final`, `readingBlocked` `endpoint-not-confirmed` |
| Endpoint, after the wait | "Flask: faint pink. Swirled 30 s: the pink has lasted."; `plume` null; `readingWanted` `final`, `readingBlocked` null |
| Overshot | "Flask: dark pink (overshot)."; every control `trial-ended`; `trialEnd` `overshot`; `readingWanted` `final`, `readingBlocked` `trial-ended` |
| Ran out (trial 2, no refill) | `trialEnd` `ran-out`; `burette.atBottom`; `levelBracket` "at the 50 mL mark, the bottom of the scale"; every control `trial-ended` |
| A new trial after a careful one | "Flask: empty."; level 28 263; `pipetteRinsed`; fill and pipette null; `readingWanted` `initial`, `readingBlocked` null |
| Completed lab | every control `lab-completed`; `readingBlocked` `lab-completed` |

- [x] A careful run changes the status line five times, in every one of seeds 1 to 100: colourless; fades at once; fades slowly (in the stream, with 2.0 to 2.25 mL to go); fades at once (the first single drops); fades slowly; then "Flask: faint pink. Last addition: pink persists." The same text is returned for every addition between two changes.
- [x] Every careful endpoint of seeds 1 to 100, at 2 and at 3 drops, is named "faint pink". (The latest endpoint at each corner of the ranges is held by Task 8, where the flask chemistry can be called.)
- [x] `benchText.test.ts`: `levelBracket` of 0 and 999 is "between the 0 mL and 1 mL marks", of 1000 "between the 1 mL and 2 mL marks", of 49 999 "between the 49 mL and 50 mL marks", of 50 000 "at the 50 mL mark, the bottom of the scale". `describeStand` for a new lab is "The burette is empty. The stopcock is closed. The conical flask under the burette is empty."; with the stream open at 12 563 it names the 12 and 13 mL marks, the open stopcock, 2 drops of indicator and a colourless liquid; at the endpoint it says the liquid is faint pink; at levels 370, 12 870, 26 045, 49 999 and 50 000 it never matches `/\d\.\d/`. `streamMessage` has one sentence each for an open stream, a pour of 4, a pour of 20 and a closed stopcock, the pours naming 1 mL and 5 mL, and with the model from `modelFrom(titrationData)`, `POUR_ADDITIONS[0] × streamUl` is 1000 and `POUR_ADDITIONS[1] × streamUl` is 5000, so a stream volume changed at Gate B (D8) cannot leave "Run in 1 mL" false. `additionMessage` returns a text different from `previous` on each of three successive calls, and the first half-drop text says it is touched off on the flask wall and rinsed in. Every string passes `findInstitutionText`.

**Done when:** both test files pass; `npm run build` passes.

### Gate A: independent chemistry review

Before any screen is built. Its findings and what was done about each are recorded in `docs/research/phase-3/gate-a.md`. No component (Task 14 onward) starts until every finding is fixed and re-checked.

**The reviewer** has not seen the design files and is not given them. They are given the authored input, the manifest and the kept copies, the generated record, the engine and its test output, `primer.ts`, `messages.ts`, `format.ts`, `shellText.ts`, `meniscusText.ts` and `benchText.ts`, and the spec's section 7.

- [x] **Every stored constant against its source**, fetched afresh where no copy is kept: the figure, its unit, and its kind. K_w is on the molar scale and its source prints the molal; the note's conversion (13.994 + 0.0026 = 13.997) is re-derived, with the density's source. The 6.35 is printed by its source beside the word hydrous, with no temperature and no word on which species it is the constant of. That it is the first constant of dissolved CO₂ and carbonic acid counted as one acid, the species the model holds, is this project's reading, as the stored note says; the U.S. Geological Survey's database file bears it out with 6.352 and 10.329 at 25 °C. The reviewer judges that reading and re-reads the survey's two figures; the first source cannot confirm it. Henry's constant is in mol/(kg·bar) and is multiplied by a pressure in bar. The indicator's two constants describe the colourless-to-pink change.
- [x] **The indicator's strength.** The listing, kept at the time of the review and since taken out of the repository (D4), prints 0.5% (w/v); the note says that what is assumed is that this lab's bottle is that kind of solution; the endpoint test still passes if a bottle is made up by weight (about 7% less phenolphthalein per drop) and from 0.1% to 1%.
- [x] **The model, re-derived with the reviewer's own implementation:** the solver's spot values; the corner excess (9.644 to 12.239 µL) and the 256 flasks (9.599 to 16.274 µL); the endpoint ranges for seeds 1 to 100; the careful lab's percent errors; the three technique-error shifts.
- [x] **Each technique error.** The reviewer first writes down, from bench chemistry alone and before reading the engine's output or the sentences, which way and roughly how far each error moves the calculated molarity. Only then do they compare that with the engine's shift and with the feedback sentence. A direction the engine and the sentence share and the reviewer's own reasoning does not is a finding: the tests cannot see it, because they hold the two to each other.
- [x] **Each simplification of D3:** whether it is defensible for a beginner, and whether the words that describe it say it is a simplification where it is one. Three things are not true to a bench: the unconditioned burette held at 2.0% through refills; the 0.60 mL tip bubble, which is more air than a burette's tip holds and escapes evenly where a real one leaves at once; and the size of every technique error, which is larger than a bench gives.
- [x] **The hazards.** Each stored statement against the kept record under the named entry. The HCl bottle carries the entry for hydrochloric acid (H314, H335) and not the gas's (H331), and nothing over its statements says "pure substance". Each note says no more than its source says, and says so where its sheet is for a different solution.
- [ ] **Every sentence a learner will see**: the primer; every string and every function's output in `messages.ts`, `shellText.ts`, `benchText.ts` and `meniscusText.ts`, which hold what each prep action says it did, the half-drop message, the slow-down line, the stream and swirl messages, the status line, the stand's description and the meniscus in words. The few labels and headings written straight into components in Tasks 14 to 21 do not exist yet; the branch reviewer reads those at Task 23. What is looked for: a chemistry claim that is wrong, or that a lab instructor would not say. No sentence gives away the expected titre, the true molarity before completion, or the meniscus; no reason gives anything away in Challenge.
- [x] **The two rules of D1 and D6, attacked:** try to complete a lab without three honest titrations; try a cut-off molarity, a tie, a molarity one unit either side.
- [ ] **The primer's chemistry that no source was read for** (Task 10; each is marked "This lab:" in its paragraph's `support`): that the faint pink of a real endpoint fades because the open flask takes up CO₂, and that this is why the rule gives a time (`titrating`, the last paragraph; the source read establishes only that CO₂ from the air uses up hydroxide at such an end point); that a NaOH solution which has stood is standardized again (`standardizing`, the second paragraph); touching the hanging part-drop to the flask wall, where the page read washes it off the tip (`titrating`, the third paragraph); the definition of relative deviation (`precision`); and which way an escaping tip bubble moves the reading (`glassware`).
- [x] **No quotation** anywhere in what was written; OpenStax by location only, with no word about its licence. (From 2026-10-05 the test that holds this is a local check: see the Global Constraint.)

As held, 2026-10-05: eight of the ten items above were carried out by the reviewers at commit `036c706`, and `gate-a.md` gives what each found. Two stay open. Every sentence a learner will see was read at that commit, but the sentences written to fix the findings have not been read by anyone independent. The five points of the primer for which no source was read were not judged one by one. Four findings wait on the owner. The gate is not closed.

**The owner** (D4, D15) reads, as the person who runs this lab:

- [ ] the primer, and in particular the new card on titrating to the endpoint, the sentence that the acid was itself standardized, "about pH 8.3", the word "conditioning", the 30-second wait that in this model cannot fail, and what the safety card does and does not cover;
- [ ] the three hazard notes and the heading over each bottle's statements;
- [ ] and changes anything they would say differently at the bench. If the label of the indicator their lab stocks is to hand, they say what it prints (solvent, and whether the percentage is weight per volume).

**Done when:** `gate-a.md` lists every finding with its fix and its re-check; the tests and `npm run build` pass after the fixes; `docs/for-institutions.md` will say (Task 22) that no chemistry instructor has reviewed the lab unless one has.

### Task 14: The shared shell

Read: spec 10, 11, 14; `shell.md` sections 1, 3 and 9.7 (the shell, mode, primer and narrow rows); `integration.md` 1.2 and section 2 (C5, C9, C21, C32, C33, C34), G2; decisions D7, D10, D14.

**Produces:**

```ts
// src/app/useMediaQuery.ts   (moved out of AppState.tsx)
export function useMediaQuery(query: string): boolean

// src/app/activities.ts
export type Activity = (typeof ACTIVITIES)[number]

// src/app/lab/LabShell.tsx
export type Mode = 'guided' | 'challenge'
export interface LabShellProps {
  title: string
  narrow: boolean                  // !useMediaQuery('(min-width: 768px)'), the rail's own query
  started: boolean                 // false until the learner has started the lab
  persistent: boolean              // AppState.persistent
  mode: Mode; onMode(mode: Mode): void
  modeLocked?: string              // the reason the mode cannot be changed now
  onStart(): void; onRestart(): void    // onRestart is called once the learner has confirmed
  primer(open: boolean): ReactNode // the shell decides: open before Start and on the narrow page, closed once the lab is started
  guide?: ReactNode; bench: ReactNode
  notebook: ReactNode              // the working part; it holds no burette reading field
  record: ReactNode                // across the page below; on the narrow page, the read-only notebook
}
export function LabShell(props: LabShellProps): ReactElement

// src/app/lab/ModeSwitch.tsx
export function ModeSwitch(props: { mode: Mode; onChange(mode: Mode): void; disabled?: string }): ReactElement

// src/app/lab/Primer.tsx
export function Primer(props: { sections: readonly PrimerSection[]; sources: readonly Source[]; open: boolean; modelCitations?: readonly Citation[] }): ReactElement
export function subscriptParts(text: string): { text: string; sub: boolean }[]     // "M_NaOH" -> M, then NaOH as a subscript

// src/app/lab/Hazards.tsx   (phase 4 has bottles too)
export function Hazards(props: { classifiedAs: string; hazards: Hazards; sources: readonly Source[] }): ReactElement

// src/app/lab/useLabProgress.ts
export function labProgress<T>(store: KeyValueStore, activity: Activity, schema: z.ZodType<T>): { load(): T | null; save(next: T): boolean }
export function useLabProgress<T>(activity: Activity, schema: z.ZodType<T>): [progress: T | null, save: (next: T) => void]
```

Rules:

- **DOM order** is primer, guide, bench, notebook, record at every width; `lab.css` only places them. Container queries on the page's own width, never the viewport's: one column below 78rem; the notebook beside the bench from 78rem, with the bench's track taking `minmax(56rem, 83rem)` and growing before the side column does; the guide as a left column from 110rem. Nothing in it animates.
- **Narrow** (D14). The shell renders the notice, the primer (open) and the `record` slot. No bench, guide, working notebook, mode switch, field or button is in the DOM; before Start there is no record either. The bench is not mounted, which is what closes a running stopcock.
- **Markup.** The lab's `h1` is the heading the layout focuses after navigation; the breadcrumb is Home, Lab, title. The mode is a `fieldset` with legend "Mode" and two radio inputs; locked, both are disabled and described by the reason. The docked notebook is an `aside` named "Lab notebook". The primer is one native `details`; each section a card with an `h2` and its Sources; at its foot, when given citations, a disclosure named "Sources for this lab's model". The not-saving notice is the sentence of Task 9 in a `role="status"` paragraph.
- **Hazards.** A `details` named "Hazards": the signal word; a heading that names what is classified, from `classifiedAs`; the statements; "At the strength used here" and the note; then Sources, listing the classification's source and the note's.
- **Saving.** `save` sets the state and calls `saveEntry` in the event handler, never in an effect.
- **Existing pieces.** `Card`, `Disclosure` and `Sources` come from `src/app/explore/InspectorCard.tsx` as they are. The source list is `@/chem-data/sources.json`, as `ElementCard.tsx` takes it, never `registry`, which would pull every molecule file into the lab's chunk.
- **Markup tests of pages.** `LabShell`, `ModeSwitch`, `Primer` and `Hazards` take everything as props and render under `renderToStaticMarkup` as they are. A component that calls `useAppState` or `useMediaQuery` does not: in node the media hook has no server snapshot and throws, and `AppStateProvider` builds its store from the browser. So a markup test of the lab list or of the lab page (Tasks 15 and 21) replaces `@/app/AppState` (`useAppState` returning a `createMemoryStore` store the test holds, with `persistent` and `reducedMotion`) and `@/app/useMediaQuery` with `vi.mock`, as `src/app/explore/elements/page.test.ts` does for `react-router`.

- [ ] `shell.test.ts` (`renderToStaticMarkup` in a `MemoryRouter`): the breadcrumb links to `/lab`; the notebook `aside` is named; the DOM order holds. Before Start: Start, the primer open, the mode switch, no bench and no Restart; after: Restart, the bench, no Start, the primer closed (the test's `primer` slot draws the real `Primer` with the `open` it is handed). Narrow with a run: the notice with its zoom sentence, the primer, the record, and none of the excluded things; narrow before Start: no record. Not saving: one `role="status"` paragraph with the sentence; absent otherwise. `ModeSwitch` on `challenge`: the fieldset, `guided` unchecked, `challenge` checked; with `disabled`, both inputs disabled and the reason present and tied by `aria-describedby`. `Primer` on `TITRATION_PRIMER`: one `details`; twelve `h2` in order; twelve Sources controls; `M<sub>NaOH</sub>` present and no `M_` left; every link is https and opens in a new tab; with citations, the model's disclosure lists each source once. `subscriptParts('M_NaOH × V_NaOH = 1')` is M, sub NaOH, ` × V`, sub NaOH, ` = 1`. `Hazards` on the HCl bottle: the signal word, both statements, the note, two source links, and no "pure substance" in its heading.
- [ ] `labProgress` on a memory store: `load` is null before any save; one `saveEntry` per `save`, with the activity's version; what is saved is what is loaded.

**Done when:** `shell.test.ts` and the existing `firstPaint` and preferences tests pass; `npm run build` passes.

### Task 15: Routes and the list of labs

Read: spec 4; `shell.md` 1.1, 1.2, 1.4; `src/app/routes.tsx`, `routes.test.ts`, `activities.ts`, `pages/Lab.tsx`, `pages/Home.tsx`.

**Produces:** the route `lab/titration`, loaded lazily; `ACTIVITIES[0].to` as `/lab/titration`; `pages/Lab.tsx` as the list of labs; and `src/app/lab/titration/TitrationPage.tsx` in its first form: `LabShell` with the primer, the mode choice, Start and Restart, on `useLabProgress(ACTIVITIES[0], titrationStateSchema)`, with its four slots (guide, bench, notebook, record) empty until Task 21 fills them.

- **Start** draws the seed in `src/app/` (a 32-bit value from the browser's random source) and saves `createLab(seed, mode)`. Nothing is saved before it, so opening the page leaves Home at "Not started". Before Start the mode is Guided.
- **Restart** asks with the browser's own confirm, in `SHELL_TEXT.restartConfirm`'s words, draws a new seed, keeps the mode, and saves a new run over the old.
- **The list** links each lab that has a page, with its status, and shows a lab whose address is still `/lab` as text with "Planned. Not built yet."

- [ ] `routes.test.ts` gains: `/lab/titration` is a lazy route whose loader gives a component; `/lab` still opens the list. `activities.test.ts`: the titration activity's `to` is `/lab/titration`. `src/app/palette/search.test.ts` expects the two labs' addresses as `/lab` and `/lab`; it becomes `/lab/titration` and `/lab`. This is the third sanctioned change to an existing test.
- [ ] `src/app/lab/titration/page.test.ts`, with the mocks Task 14 names, the store handed in holding what the case says: the list has one link to `/lab/titration` with its status and the other lab as text with the planned sentence. The page with an empty store shows Start and the primer open, and the store is still empty after the render; with a saved new lab it shows Restart and no Start. (The seed is shown by the notebook panel, Task 20.)
- [ ] Record the size of the `index` chunk before and after this task in the task report. The lab's code, the engine and the primer are in a chunk of their own.

**Done when:** the tests pass; the command palette and Home open the new address; `npm run build` passes.

### Task 16: Reading view and field (browser check 1)

Read: `bench.md` 6.3 and 9.1; `review-verdicts.md` (bench: the band's contrast, the numbered marks); `integration.md` C3, C4 and section 7; decision D11.

**Produces:**

```ts
// src/app/lab/titration/ReadingView.tsx   (a drawing only)
export interface ReadingViewProps { levelUl: number; filled: boolean; running: boolean; describedBy: string }
// src/app/lab/titration/ReadingInput.tsx
/** accepted: the reading was recorded. Not accepted, with a text: refused, and the text says why.
 *  Not accepted, with an empty text: held for a Guided warning; the field keeps its value. */
export interface ReadingReply { accepted: boolean; text: string }
export interface ReadingInputProps { wanted: 'initial' | 'final'; blockedText: string | null; onReading(readingUl: number): ReadingReply }
// src/app/lab/titration/bench.css   (started here with the reading view's height, a floor of 26rem; Task 17 adds the stand's and the animations)
```

- **The view** shows 1.2 mL of scale with the meniscus in the middle gap: whole-mL marks from wall to wall with their number, half-mL marks longer and thicker than tenths, bare tube above 0 and below 50. The meniscus is a darker band with no outline, whose lowest point is the true level and whose top is 0.08 mL above it. Graduations are one screen pixel thick at every size (two for whole and half mL). It is an `img` named "The burette scale at the meniscus, enlarged", described by `meniscusText`. While the stopcock is open it shows no scale, only that the stopcock is open, with and without reduced motion.
- **The words** are shown to every learner in a closed disclosure, "The meniscus in words", under the view.
- **The field** is a text input with a decimal keypad, named "Initial burette reading (mL)" or "Final burette reading (mL)" as `wanted` says, with a Record button; Enter records. It parses with `parseReading`; a text that does not parse gets `INVALID_ENTRY_TEXT.reading` and `aria-invalid`, and nothing is sent. The reply sits under the field in a `role="status"` paragraph that describes it. With a `blockedText` the field is disabled, keeps the label `wanted` gives it, and shows that text under it, tied by `aria-describedby`.

- [ ] `bench.test.ts` (markup): at level 24 370 the view has twelve graduation lines, one numbered "24", and its description is `meniscusText(24370)`; with `running` it has no graduation and says the stopcock is open; the field's label follows `wanted`, with and without a `blockedText`; a `blockedText` gives a disabled input with that text visible and tied to it; the input has `inputMode="decimal"` and is not `type="number"`.
- [ ] **Browser check 1.** The view and the field are rendered in the harness (`.superpowers/tools/phase3-harness/`, started here), with the app's stylesheet and `bench.css`, in Chromium, in both themes. The harness gives the view a box 188 px wide, its measured width on the page at 1366×768 (`integration.md` 1.2):
  - the view is 416 px tall there, and the height comes from `bench.css`'s floor of 26rem, not from the harness; a graduation is one pixel thick; the meniscus band against the liquid under it is at least 3:1 in both themes, measured from a screenshot;
  - "24.3" is refused with the reading sentence; "24.37" is sent as 24 370;
  - **the owner reads three levels to within 0.02 mL.** The implementer picks them (one between 0 and 2 mL, one mid-scale away from a numbered mark, one within 0.02 mL of a graduation) and keeps the true values where the owner cannot see them until the readings are written down. This is the first time a person reads this meniscus.
- [ ] If the owner misses a level, the task stops there. The tolerance is not widened; the view is changed (D11 leaves numbering every mark open) and the check is run again.

**Done when:** the markup tests pass, browser check 1 is recorded in `gate-b.md` with the three levels and the three readings, and `npm run build` passes.

### Task 17: Stand and apparatus

Read: `bench.md` 6.1, 6.4, 7, 8 and 9.1; `integration.md` section 5 (the cuts from the bench) and G10; decision D12.

**Produces:**

```ts
// src/app/lab/titration/TitrationStand.tsx   (a drawing only)
export interface TitrationStandProps {
  burette: BenchView['burette']; flask: BenchView['flask']
  plume: PlumeStatus | null; plumeKey: number
  plumeFadeSeconds: { atOnce: number; slowly: number }   // the record's plumeFadeAtOnceSeconds and plumeFadeSlowlySeconds
  colour: FlaskColour; stopcockOpen: boolean; reducedMotion: boolean
  describedBy: string            // id of the hidden paragraph holding describeStand(...)
}
// src/app/lab/titration/apparatus.tsx: Bottle, WashBottle, Pipette, Dropper   (small drawings for the shelf, each aria-hidden)
```

The whole burette with a mark at every mL, numbered at the tens; the solution as a column to `standY(level)`; the stopcock's handle across the tube when closed and along it when open, with the word beside it; the tip, with an outlined bubble and the words "air bubble" while there is one; the flask on a white card in both themes, its liquid at a height that follows `volumeUl`, the pink as a layer at `colour.strength`; the plume where the drop lands, one size for every addition, fading over `plumeFadeSeconds.atOnce` when its status is `fades-at-once` and over `plumeFadeSeconds.slowly` when it is `fades-slowly`, staying when it is `persists`, restarted by `plumeKey`; a falling drop. The stand is given nothing about the plume but its status and those two durations: the engine hands the app the status alone (Task 7), so the drawing cannot show how near the endpoint is any more finely than the status line says it. The strength (`colour.strength`), `flask.volumeUl` and `plumeKey` reach the drawing as an opacity, a height and a key that restarts the fade, and are never rendered as text: not in a text node, a `title`, a label, or an `aria-` or `data-` attribute. Each can be worked back to a hidden value or, for `plumeKey`, is the volume delivered (the Global Constraint "No answer leaves the engine"). The clip path's id comes from `useId`. `bench.css`, started in Task 16 with the reading view's height, gains the stand's (the same floor of 26rem) and the two animations.

- [ ] `bench.test.ts`: the stand is an `img` named "Burette on its stand over the conical flask" and described by its paragraph; closed and open differ in the handle and in the word; with a tip bubble the words "air bubble" are in the drawing; with `reducedMotion` there is no plume element and no drop element; without it and with a plume there is one of each; the plume's fade lasts `plumeFadeSeconds.atOnce` for `fades-at-once` and `plumeFadeSeconds.slowly` for `fades-slowly`, and a plume that persists has no fade; the flask's fill is `PINK` at the given strength, and `DARK_PINK` when the colour is dark; with a strength of 0.4321, a `volumeUl` of 50 802 and a `plumeKey` of 25 700, no text node of the stand and no `title`, `aria-` or `data-` attribute in it holds "4321", "50802" or "25700".
- [ ] In the harness, both themes: the level, the stopcock in both states, the bubble with its words, the flask at each colour name against its white card, and a plume that fades at once, one that fades slowly and one that persists.

**Done when:** the markup tests pass, the browser look is recorded, and `npm run build` passes.

### Task 18: Stopcock

Read: `bench.md` 6.4, 9.2 and 9.4; `review-verdicts.md` (bench: the toggle race, Escape, repeated drops); `integration.md` 1.1 part 3 and C11; decision D8.

**Produces:**

```ts
// src/app/lab/titration/useStream.ts   (the only clock on the bench)
export function useStream(canDeliver: boolean, deliver: () => void, slowDown: boolean): { stream: Stream; open(pour: number | null): void; close(): void; closedBySelfAt: number | null }
//   closedBySelfAt: when the hook last closed the stopcock without being asked; null after a close the learner made
// src/app/lab/titration/StopcockControls.tsx
export interface StopcockControlsProps {
  stream: Stream
  controls: Pick<BenchView['controls'], 'clearTipBubble' | 'deliver' | 'swirlAndWait'>
  onClearTip(): void
  onAdd(amount: 'drop' | 'half'): void
  onToggle(pour: number | null): void     // opens a stream (null) or a measured pour; closes it if that one is running
  onSwirl(): void
}
```

- **Buttons**, in this order, in a group named "Stopcock": "Clear the tip" before it; "Add half-drop", "Add drop", "Run in 1 mL", "Run in 5 mL", "Open stopcock" (a toggle with `aria-pressed`); "Swirl and wait 30 s" after. The fine controls come first. While a stream or pour runs, the button that started it reads "Close stopcock" and the other four are unavailable.
- **One press, one addition.** The buttons ignore a repeated key event, so a held Enter or Space adds once and toggles once.
- **The timer.** One addition every `STREAM_INTERVAL_MS`, the first one interval after opening. Each tick asks `streamTick` and, when it says so, sends one `deliver` with `amount: 'stream'`. The stream closes itself when the engine can take no more, when a pour is done, when the page is hidden, when the bench unmounts, and when `slowDown` turns true while it is open. The view's `slowDown` is true only in Guided, so this is the Guided close; a stream opened again while the hint still shows stays open. Every close the hook makes itself sets `closedBySelfAt`.
- **After the stopcock closes itself**, a press on a stream button within 600 ms of `closedBySelfAt` does nothing and the message line says `STOPCOCK_ALREADY_CLOSED`. The message line is the bench's, so this rule is built and checked in Task 19.
- **Escape** closes the stopcock wherever focus is on the page, through a document listener that exists only while it is open.

- [ ] `bench.test.ts`: the group and the seven buttons in order; an unavailable button is `aria-disabled` and still focusable; "Open stopcock" has `aria-pressed`; with a stream open, that button reads "Close stopcock".
- [ ] In the harness, the hook and the buttons alone on the real engine, by keyboard, with the harness printing the delivered volume (the page never does):
  - Enter held for eight key events on "Add drop" adds 50 µL, Space the same; held on the toggle it toggles once;
  - the open stream delivers 250 µL every 0.4 s, closes with the same key on the same button with focus staying put, and delivers nothing afterwards; opened and closed inside one interval it delivers nothing;
  - "Run in 1 mL" delivers 1.00 mL and closes with focus on its button; "Run in 5 mL" delivers 5.00 mL;
  - a hidden tab closes it.

  The rest of the stopcock's behaviour needs the message line, the shelf and a view with `slowDown`. It is browser check 2, at the end of Task 19.

**Done when:** the markup tests pass, the harness look at the hook is recorded in `gate-b.md`, and `npm run build` passes.

### Task 19: Shelf and bench (browser check 2)

Read: `bench.md` 6.1, 6.2, 9.1 and 9.3; `integration.md` 1.2, section 2 (C8, C9, C33, C34) and G4, G8; the files of Tasks 12, 13, 16, 17 and 18, which this task puts together.

**Produces:**

```ts
// src/app/lab/titration/Shelf.tsx
export interface ShelfProps { view: BenchView; bottles: TitrationData['bottles']; sources: readonly Source[]; act(action: BenchAction): void }
// src/app/lab/titration/TitrationBench.tsx
export interface TitrationBenchProps {
  view: BenchView
  display: { pinkDisplayScale: number; faintPinkNameLimit: number; plumeFadeAtOnceSeconds: number; plumeFadeSlowlySeconds: number }   // the record's four drawing parameters
  bottles: TitrationData['bottles']
  sources: readonly Source[]
  reducedMotion: boolean                 // from the page, so the bench reads no app state and bench.test.ts needs no mock
  /** 'done': the action was taken. 'asked': it is held for a Guided warning, shown in `notice`. 'refused': the engine blocked it. */
  onAction(action: BenchAction): 'done' | 'asked' | 'refused'
  onReading(readingUl: number): ReadingReply
  /** The action the learner went on with after a warning, handed back by the page until the next action. */
  confirmed?: BenchAction | null
  /** A Guided warning, drawn under the message line. Nothing else goes here. */
  notice?: ReactNode
}
```

- **Five tiles**, each a group named by its heading, in this order: hydrochloric acid (the label repeated as text, "Hazards"); sodium hydroxide ("Condition burette", "Fill burette" or "Refill burette", "Hazards"); pipette ("Rinse pipette with HCl", "Pipette HCl into flask"); phenolphthalein ("Add 1 drop of indicator", the count as text, "Hazards"); distilled water ("Rinse down flask", the count as text). A finished step is marked by a tick and words. The bench holds no engine state.
- **Under the stopcock**, in this order: the status line (`role="status"`), the slow-down line while `view.slowDown`, the message line (`role="status"`), then the `notice` slot. The message line says what the last action did when `onAction` answered `done` (from `ACTION_TEXT`, `additionMessage`, `streamMessage` or `swirlText`), and the same for an action the page hands back in `confirmed`. After a wash, a drop or a half-drop it adds `undoneText` of the view as it was before the action, which is empty unless a pink that had lasted the wait was undone (Gate A). When the answer was `asked` it says nothing new: the warning in the notice slot has the learner's attention. When a control that cannot be used is pressed, or the answer was `refused`, it gives the reason through `blockedText`. When the trial ends as ran-out it shows the ran-out sentence (`OUTCOME_TEXT['ran-out']`). The notice slot holds only Guided warnings.
- **The stream.** `TitrationBench` owns `useStream(view.controls.deliver === null, deliver, view.slowDown)` and gives its `stream` to `StopcockControls`, to `TitrationStand` (as `stopcockOpen`) and to `ReadingView` (as `running`). It gives the stand `plumeFadeSeconds` from `display`. Within 600 ms of `closedBySelfAt` a press on a stream button does nothing and the message line says `STOPCOCK_ALREADY_CLOSED`.
- **Layout**, by container query on the bench's own width: below 54rem the shelf runs across the top and the stand and reading view sit side by side under it; from 54rem three columns, the shelf one tile across with wrapping buttons. DOM order is shelf, stand, reading at every width. A button is at least 32 px tall.
- **Between trials** the ended trial's flask stays with its outcome until the notebook's "Start the next trial"; after completion the last flask stays and every control gives its reason.

- [ ] `bench.test.ts`: five tiles in order with their headings; three "Hazards" disclosures, one of them in the indicator's tile; the HCl tile shows the label as text; a control whose `controls` entry is not null is `aria-disabled` and focusable; the three lines and the notice slot in order; no bench element holds a number with two decimals; the bench renders with `reducedMotion` as a prop and no mock of the app's state.
- [ ] In the harness, both themes, by keyboard: every prep action of spec 7.2 can be done; each says its result in the message line; an unavailable button keeps focus and says its reason; the three hazards open with their sources; the Tab order is shelf, stopcock, reading.
- [ ] **Browser check 2**, the whole bench in the harness on the real engine, by keyboard alone:
  - Escape closes a running stream with focus on the shelf, in the reading field and on the page body;
  - a press within 600 ms of an automatic close delivers nothing and the message line says the stopcock is already closed;
  - in Guided a running stream closes at the hint with 0.75 to 1.00 mL to go, and can be opened again; in Challenge nothing closes it;
  - the stream closes as soon as the trial is overshot and at the 50 mL mark; the reading view shows no scale while it runs;
  - repeated presses of "Add drop" change the message line each time;
  - with reduced motion on: no plume element, no drop element, no running animation, and the status line reads the same.
- [ ] The owner looks at the stream's speed, at the cue, and at the two fades of the plume, 0.5 s and 3 s to start with (D8). A value they change is a parameter or `STREAM_INTERVAL_MS`, with the tests that pin it.

**Done when:** the markup tests pass, the browser look and browser check 2 are recorded line by line in `gate-b.md`, and `npm run build` passes.

### Task 20: Notebook and guide

Read: `shell.md` 4.4, 4.5, 4.6, 5.1 and 9.7 (the notebook, trial and Guided rows); `integration.md` 1.1 part 2, section 2 (C4, C20) and G4; decisions D1, D5, D16.

**Produces:**

```ts
// src/app/lab/titration/Notebook.tsx
export interface EntryReply { accepted: boolean; text: string }
export interface NotebookPanelProps {
  m: TitrationModel; state: TitrationState
  onHclMolarity(molarityE6: number): EntryReply      // the panel parses; only a value that parsed is sent
  onMolarity(molarityE6: number): EntryReply
  onDiscard(): void; onNextTrial(): void
  onSummary(meanE6: number, deviationE2: number): EntryReply
  resultRef?: Ref<HTMLElement>           // the last result takes focus after a trial ends
}
export function NotebookPanel(props: NotebookPanelProps): ReactElement               // docked
export function TrialRecord(props: { m: TitrationModel; state: TitrationState }): ReactElement   // across the page; read-only
// src/app/lab/titration/Guide.tsx
export function Guide(props: { steps: { step: Step; state: 'done' | 'next' | 'todo' | 'skipped' }[]; trialIndex: number }): ReactElement   // draws both forms; lab.css shows one
```

- **The panel**, top to bottom: the seed and the tally (trials finished, and how many of the three needed count); the HCl molarity field; the two readings and the titre, read-only; the worked lines, in Guided, once both readings are in; the NaOH molarity field with Check, open once there is a final reading; "Discard this flask" while the trial is open; the last result (`outcomeLabel`, then `feedback`), in a block that can take focus; "Start the next trial" once the trial has ended; and the part across trials: the waiting line, then on completion the completion line with the true molarity and the two-field form, then the notebook's own two values (`molarityText`, `deviationText`) beside the learner's (`molarityText`, `deviationE2Text`) with the explanation. Nothing there is marked right or wrong.
- **The record** is one table with a caption, six column headers (Trial, Initial reading (mL), Final reading (mL), Titre (mL), NaOH molarity (M), Result), a row header for each trial, and each ended trial's feedback under its row. The HCl molarity is shown once, above the table. A value not yet there is a dash. On a small screen the table scrolls inside its own focusable box.
- **Fields.** Each is its own form with a visible label tied to its input and a decimal keypad; Enter submits; an error is a `role="alert"` tied to the field, with `aria-invalid`. The panel parses, as `ReadingInput` does: `parseMolarity` for the two molarities and the average, `parseDeviation` for the deviation. A text that does not parse gets its `INVALID_ENTRY_TEXT` and nothing is sent; what is sent is the whole number. A refusal from the page comes back as the reply's text. A field that cannot be used yet is disabled, with its reason from `blockedText` visible and tied to it.
- **The guide** draws both of its forms, and `lab.css` shows one of them by the page's container query: the one line below 110rem, the list from there, the other `display: none`, so assistive technology meets one form. This task adds those two rules to `lab.css`, beside Task 14's rule that makes the guide a column. The layout is the stylesheet's choice, so the component takes no layout prop. As a list: each step as a mark hidden from assistive technology, its label (`first` or `later` by trial), and its state in words; one step `aria-current="step"`. As one line: "Step *n* of *total*, next: *label*". For a trial that has ended the checklist has no `next` step: no item is `aria-current`, and the line, and a sentence above the list, are `GUIDE_TRIAL_OVER`.
- No trial is labelled with a mode, anywhere (D7).

- [ ] `src/app/lab/titration/page.test.ts` (markup; the panel, the record and the guide take everything as props, so these cases need no mock), on states built with the test kit. The scenario: seed 1, Challenge; trial 1 with the burette not conditioned, the bubble cleared, the pipette rinsed and honest readings; trial 2 refilled, its initial reading recorded, and streamed to overshoot; trial 3 after conditioning, filling and clearing the new bubble, with its initial reading recorded.
  - The record has the six headers and three row headers. Row 1: "2.56", "28.79", "26.23", "0.0930", "Not passed, −2.13%", with the unconditioned-burette sentence under it. Row 2: "0.56", three dashes, "Invalid: overshot". Row 3: "2.04", three dashes, "In progress". "0.0976" appears once above the table. The record has no `input`, `button`, `select` or `textarea`.
  - The panel in that state has two labelled fields ("HCl molarity, from the bottle label (M)" and "Your NaOH molarity (M)"), the second disabled and tied to its reason; the readings and titre as text; "Discard this flask"; no "Start the next trial"; and the seed, as "Seed 1".
  - After trial 2 ends and before the next is started: the last result block holds "Invalid: overshot", and "Start the next trial" is present.
  - Guided at the endpoint with both readings: the worked lines, holding no molarity the learner did not type; Challenge has none.
  - A pass that does not count (the 28.29 trial of Task 6): its row reads "Passed, not counted", its feedback has the does-not-count sentence, there is no percent error (Task 11's pattern) in the row or under it, and the tally still reads none of three.
  - Completion (three careful trials): the three rows still read "Passed" with no percent error (Task 11's pattern), though their outcomes now carry one; the completion line with "0.09502"; before the learner's two values are entered, the form and no notebook value; after `recordSummary` with 0.0949 and 0.47, "0.0949" and "0.4" beside "0.0949" and "0.47", and no word of right or wrong.
  - The true molarity appears in no state before completion.
  - The guide for a burette filled unconditioned with the label recorded: eleven items; one `aria-current="step"`; the first four read Done, Skipped, Done, Next with their labels. In trial 2: "Refill the burette with NaOH" and "Pipette 25.00 mL of HCl into a clean flask". As a line: "Step 4 of 11, next: Clear the air bubble from the burette tip". Both forms are in the markup of one render. For the overshot trial 2 of the scenario, before the next is started: no `aria-current`, and `GUIDE_TRIAL_OVER` in both forms.

**Done when:** the markup tests pass; `npm run build` passes.

### Task 21: The page

Read: `integration.md` section 2 (the controller in outline; C9, C23), G2, G4, G7; `shell.md` 1.2 to 1.5 and 5.2; `review-verdicts.md` (shell: where focus returns, saving when delivery stops by itself).

**Produces:**

```ts
// src/app/lab/titration/controller.ts   (pure)
export type Decision =
  | { kind: 'do'; action: Action }
  | { kind: 'ask'; action: Action; warnings: Warning[] }     // Guided only: every warning the action raises
  | { kind: 'refuse'; reason: Blocked }
/** What the page does with an action: refuse it with the engine's reason, ask first in Guided, or do it. */
export function decide(m: TitrationModel, state: TitrationState, action: Action, confirmed: boolean): Decision
/** The reading action the bench's field stands for now, from the view: view.readingWanted's, or null while view.readingBlocked is not null. */
export function readingAction(view: BenchView, readingUl: number): Action | null
```

The page, in full: the model once at module scope (`modelFrom(titrationData)`); the state from `useLabProgress`; one `dispatch` that reduces and saves whenever the state object changed, stream additions and trials ended by the engine included; every bench action and every entry through `decide`. A Guided warning is drawn in the bench's `notice` slot as a named group that takes focus, lists every warning the action raised (each one's `WARNING_TEXT` title and body), and has one way back and one way on (`WARNING_BUTTONS`, by the action's type); on either, focus returns to the control that raised it. The page answers the bench's `onAction` with `done`, `asked` or `refused` as `decide` says, and answers a reading that is held for a warning with `{ accepted: false, text: '' }`. When the learner goes on, the page does the action and, for a bench action, hands it to the bench as `confirmed` until the next action. A refused entry puts its sentence, from `blockedText`, under its field. The page gives the bench `reducedMotion` from `useAppState`. After a trial ends, focus moves to the last result. The mode switch is locked with `SHELL_TEXT.modeLocked` while `can(setMode)` says `trial-open`. The primer's foot lists `titrationCitations`. The narrow page gives the shell the read-only record, the trial under way included. If the stored record does not load, the lab is not started, as storage already decides.

- [ ] `controller.test.ts`, on `modelFrom(titrationData)`, seed 1: Challenge, new lab, `fillBurette`: `do`. Guided, the same: `ask` with `burette-not-conditioned`; confirmed: `do`. Guided, `pipetteAliquot` unrinsed: `ask` with `pipette-not-rinsed`. Guided, a burette filled unconditioned with its bubble, an honest `recordInitialReading`: `ask` with both warnings, burette first; confirmed: `do`. Guided, a reading 30 µL off: `refuse` with `reread`, confirmed or not. Either mode, `deliver` on a new lab: `refuse` with `burette-empty`. Challenge never asks. `readingAction` gives the initial or the final action as `readingWanted` says, and null while `readingBlocked` is not null.
- [ ] `src/app/lab/titration/page.test.ts` gains, with the mocks Task 14 names and the store handed in holding the saved run: the narrow page with a run shows the notice, the primer and the record with the trial under way, and has no bench and no field; the wide page with a run has the four slots filled; the primer's foot has the model's Sources.
- [ ] In the running app: one whole Guided trial and one whole Challenge trial, start to result, before Gate B is called.

**Done when:** the tests pass, `npm run build` passes, and the page is whole enough for Gate B to begin.

### Gate B: browser checks on the whole page

The hand checklist of spec 13, in the running app, in Chromium, in both themes unless a line says otherwise. Keyboard only where it says so. Any script used is throwaway and stays out of the repository. Each block's heading says who runs it. *By script*: a throwaway script drives the browser and its output is kept with the line. *By hand*: a person at the keyboard; nothing in such a block is ticked from a script's output. *The owner*: the owner, in person. Each line is recorded in `docs/research/phase-3/gate-b.md` as done, or with a note that says what was found. Findings are fixed in one wave and the lines they touch are run again.

**A whole trial, keyboard only, Guided.** By hand.

- [ ] Start; record the label; condition, fill, clear the tip, read; rinse, pipette; two drops; pours of 1 mL to the cue, drops, half-drops; swirl and wait; the final reading taken from "The meniscus in words" alone; the molarity; the result takes focus.
- [ ] Every warning takes focus, both its buttons work, and focus returns to the control that raised it. An action that raises two warnings shows both.

**Sections 7.1 and 7.2, line by line.** By hand.

- [ ] Each of steps 1 to 7 can be done, and each can be skipped where the spec lets it be. The HCl label is readable from the first moment; nothing has to be selected. The notebook shows the seed.
- [ ] Guided warns before the fill of an unconditioned burette, before a reading with the bubble in the tip, and before pipetting unrinsed; a learner who fills anyway is told of the burette once more at the initial reading; it warns nowhere else.
- [ ] A reading 0.03 mL off is asked for again and not recorded; one 0.02 mL off is taken. A wrong label is asked for again and not recorded.
- [ ] A fill, or clearing the tip, after an initial reading clears that reading, and the field asks for it again.
- [ ] The hint shows within 1 mL, closes a running stream once, and never shows in Challenge. Guided never shows the expected titre, or a molarity the learner did not type; the titre shown is the difference of the learner's own two readings.
- [ ] The stopcock gives a half-drop, a drop and a stream. It stays shut with fewer than 2 drops of indicator and with no initial reading, and says why. The reading view shows no scale while the stopcock is open.
- [ ] The final reading is refused, with its reason, before a swirl and wait has shown the pink to last. A half-drop or a wash of water afterwards clears the reading and the wait.
- [ ] One, two and three washes of distilled water leave the trial's result as it was and show the water note; a fourth is refused with its reason.
- [ ] A trial run to the 50 mL mark ends with the ran-out sentence. So does one at the mark that is washed down until the pink goes (D5). A trial started with the burette still at the mark does not end there: it can be filled and titrated.
- [ ] A second trial without a refill is allowed, and its checklist shows the refill undone. This is intended (refilling is taught, not forced) and is not a defect.

**Challenge.** By hand.

- [ ] Skip each technique step in turn: each fails its trial alone and is named.
- [ ] Misread each reading by 0.05 mL: named.
- [ ] After a failed trial, work out the true molarity from its percent error and type a final reading to fit: the trial reads "Passed, not counted", says why, the tally does not move, and three such do not complete the lab (D1).
- [ ] Record a wrong label and titrate honestly to a result inside 1.0%: passed, not counted, the label named.
- [ ] Skip conditioning and the pipette rinse together in the first trial and titrate honestly: passed, not counted, both steps named, and the sentence that a result this close does not show the technique was sound. The tally does not move. Condition the burette, clear the new bubble, and three careful trials complete the lab.
- [ ] Type the true molarity without the working: "does not follow". Type a molarity cut off instead of rounded: refused, with the sentence that says to round (D6). Type one with three decimals, and one with a comma: refused.
- [ ] Discard a flask: the next trial starts with the glassware as it was.

**States.** By hand.

- [ ] Restart asks first. Cancel keeps the run as it was; OK gives a new seed and keeps the mode.
- [ ] Overshoot: the flask is dark pink and says so in words, every bench control says the trial is over, the notebook offers the next trial.
- [ ] Three trials that count: the true molarity appears, to five decimal places; no further trial can be started; the notebook's average and deviation appear only after both of the learner's are entered, beside them, with nothing marked (D16).
- [ ] After completion every control says the lab is complete.
- [ ] The mode cannot be changed during a trial and says why; it can between trials. No trial carries a mode label (D7).

**Reload** after each of the following; each time the page comes back where it was, stopcock closed. By script.

- [ ] Recording the label; a fill; an initial reading.
- [ ] One stream addition, with the stream still running.
- [ ] The endpoint before the wait; a failed trial; an overshoot; a discarded flask; completion.

**Storage.** By script.

- [ ] Home says Not started before Start, In progress after, Completed after the third trial that counts. Export holds the entry, the seed in it; Clear removes it.
- [ ] With writes refused, the notice shows on the lab page and on Settings, stays after the theme is changed, and goes when a lab save succeeds and after Clear.

**Stream.** By script.

- [ ] Press Enter on the stream button the instant the slow-down sentence appears: nothing more is delivered.
- [ ] Escape closes a running stream with focus in the notebook.
- [ ] Narrow the window during a stream: the stopcock closes. Hide the tab: it closes.

**Reduced motion on.** By script.

- [ ] A whole trial: no plume, no falling drop, no running animation; the status line alone carries the cue.

**Sizes.** By script.

- [ ] 2523×1290, 2016×1100, 1920×1080, 1600×900, 1504×900, 1440×900, 1366×768, 1280×720, 1024×768, 768×1024: no sideways scroll, no button past its tile, the stand at least 416 px tall.
- [ ] At 1366×768 the status line, the message line and the reading field are in view without scrolling, and a warning is wholly in view once it has focus.
- [ ] 767 px: the notice, the primer, the read-only notebook with the trial under way; no bench in the DOM; no field.
- [ ] 200% zoom on a 1366 px screen: the notice, with its sentence about zoom (D14).

**Touch.** By hand.

- [ ] One trial on a tablet, or with touch emulation and that said: every control can be hit; the stopcock buttons are at least 32 px tall.

**A screen reader**, if one can be run. By hand.

- [ ] What is announced on a drop, a stream, the cue, a warning, a result. If none can be run, the document says so.

**Chemistry on screen.** By hand.

- [ ] Every bottle's hazards open, each with its heading, its note and the note's source; the HCl bottle's heading does not say pure substance.
- [ ] The primer's Sources, and the model's Sources at its foot, list what the cards and the constants cite.

**The owner**, in the running app:

- [ ] reads three meniscus levels on the whole page, to within 0.02 mL, at 1366×768 and on their own wide screen (D11);
- [ ] judges the stream's speed, whether the cue comes in time to act on, and whether a plume that fades at once and one that fades slowly can be told apart (D8);
- [ ] judges the pink at a careful endpoint and at an overshoot, in both themes, and whether the flask is big enough to judge it in (D12);
- [ ] judges the wide layout and the layout at 1366×768: where the notebook, the record and the checklist sit (D10);
- [ ] judges whether the burette warning, repeated in Guided at the initial reading of a burette filled dilute, is wanted or is one warning too many. If it goes, it goes from spec 7.2, from Task 6's warnings and from Task 21's controller test together.
- [ ] A value the owner changes is changed where it is stored (a parameter with its rationale, a drawing constant, a layout threshold), with the tests that pin it, and the lines it touches are run again.

**Done when:** every line is ticked or carries a note in `gate-b.md`, and the fixes pass `npm run build`.

### Task 22: Documents

Read: spec 12; `shell.md` section 8 (drafts, several of them superseded); `integration.md` G12 and G13; `gate-a.md` and `gate-b.md`; `docs/for-institutions.md` as it stands.

- [ ] **Opening paragraph and "What exists":** the titration lab is built.
- [ ] **IT and security, Storage:** the titration lab stores one entry: the seed, the mode, what the learner did and typed, and the learner's two summary values. Results are worked out on reading and are not stored. It holds nothing that identifies the learner. The export file holds the seed, from which the hidden values follow.
- [ ] **Faculty and curriculum, "The titration lab"**, written against the engine as built. It states: what the lab teaches and the primer's cards; how a run is seeded; the two modes, and that the mode changes only between trials; that readings are typed to two decimal places and molarities to four; the arithmetic check (the molarity must be the notebook's value correctly rounded), what it accepts at an exact tie (Q1's answer), and that it gives nothing away; grading at ±1.0% with the edge included; that three trials must count, and what makes one count; **the percent error, in D1's terms and no more**: a failed trial's percent error lets a learner work out the true molarity, and a trial counts only when both readings are within 0.02 mL of the meniscus, the HCl molarity is the label's and no technique error is named in it, so a result reached by typing a reading the burette does not show is marked passed and not counted, and so is one that is close only because two mistakes cancelled or because part of a bubble is small; each technique error's size (2.0%, 0.60 mL, 2.0%) beside the statement that these are larger than at a real bench and are parameters, not measurements; the rules that are not true to a bench, each said to be so: a dilute burette stays dilute through refills by design and a real one does not (D3), the 0.60 mL tip bubble is more air than a burette's tip holds and it escapes evenly over the first 5 mL where a real one leaves at once, and every technique error is larger than a bench gives; that a wet pipette spoils one aliquot and an escaped bubble does not return; that relative deviation is shown and not marked, and that molarities are typed to four decimal places, and one unit in the fourth place is about one part per thousand of the result, so the relative deviation of three careful trials can take only a few values and reflects rounding as much as technique (nothing here about the label or significant figures); what is not modelled (CO₂ taken up from the air during a trial, the fading of the pink in strong base, activity corrections, temperature, the ethanol in the indicator, parallax); the conventions chosen (standardized HCl as the known solution; four decimal places, not a significant-figure rule); that counting additions gives the titre; and whether a chemistry instructor has reviewed the lab.
- [ ] **Where the chemistry comes from:** one row per constant, from the record, and in the indicator's row what is assumed: that this lab's bottle is the kind of solution the listing describes, whose basis the listing prints.
- [ ] **Lab safety** (spec 12): a supplement and not a replacement; what each bottle's hazard information classifies, which is the pure substance, except the hydrochloric acid, which carries the classification of hydrochloric acid, the solution; what each note rests on and that it has its own source; what is not covered.
- [ ] **Accessibility:** what Gate B checked and found, and what was not checked: no screen reader unless one was run; no person but the owner has read the meniscus; Chromium only; no touch device unless one was used; the bench is not shown below 768 CSS pixels, which includes 200% zoom on a 1366-pixel screen (D14).
- [ ] **The About page's prose and `README.md`:** the lab's sources and acknowledgments.
- [ ] Nothing added quotes a source, and nothing added says what OpenStax's licence is. The existing sentence about OpenStax in this file is left as it is for the separate task (see the last section).
- [ ] The owner reads the Faculty and curriculum text and the Lab safety text, as they read the primer at Gate A, and changes what they would not say to a colleague. A check against the build cannot tell whether a sentence about chemistry or safety is one a lab would stand behind.

**Done when:** every sentence added has been checked against the build it describes, by a reviewer who runs the lab while reading it; the owner has read the Faculty and Lab safety text; `npm run build` passes.

### Task 23: Close

- [ ] Spec 7.4's thirteen checks pass in CI on the pull request. CI runs on pull requests and on pushes to `main`, not on a push to the branch.
- [ ] Every line of Gate B is ticked or carries a note; every finding of Gate A has its fix and its re-check.
- [ ] `npm run build`, `build:data`, `build:expected` and `cross-check` leave no diff.
- [ ] Spec section 7 is read once more against the lab as built. Where the two differ, the difference goes to the owner: the spec is corrected or the lab is.
- [ ] An independent review of the whole branch, starting from Review Focus. One fix wave, one re-check.
- [ ] In that review, the labels and headings written straight into components in Tasks 14 to 21 (button names, tile and column headings, legends, captions) are read once for chemistry: they were written after Gate A and no gate has read them.
- [ ] The branch is presented to the owner before merging.

**Done when:** all seven are done.

---

## Not built in phase 3, and not verified

**Deliberately not built:**

- Parallax, and a control to raise or lower the eye. The primer explains it.
- A number on every 0.1 mL graduation in Guided. Open again only if the owner cannot read the view at browser check 1.
- Titrating with no indicator in the flask: the stopcock stays shut.
- A trial labelled with its mode; a misread kept in Guided; marks of right or wrong on the average and the relative deviation.
- A shared notebook or check flow for phase 4, and moving the tile and bottle drawings out of the titration folder. Phase 4 takes what it finds it needs.
- Syncing two tabs open on the same lab: the last save wins. Carrying a run to another device.
- Forcing a refill before a trial.
- A narrow limit below 768 px. The drawing fitted at 579 px of page in a prototype; lowering the limit would need its own check.
- A Guided re-check of an HCl molarity recorded in Challenge before the mode was changed: the trial's feedback names it and the trial does not count.

**Not verified by anyone, at the time of writing:**

- **No screen reader has been run.** What a live region says, and whether silence between two cue changes is comfortable, is unknown until Gate B, and stays unknown if none can be run there.
- **Chromium only.** Container query units, the one-pixel graduations and the key-repeat guard were seen in headless Chromium and nowhere else.
- **No person has read the meniscus.** All the evidence is a model measuring screenshots. The owner is the first, at browser check 1 (Task 16), and again on the whole page at Gate B. No learner has.
- **No touch device.** "Tablets fully supported" in spec 11 is untested, and a tablet in landscape with the menu open must scroll once to titrate.
- **No chemistry instructor has read** the primer, the messages or the model, unless Gate A's reviewer is one.
- **The indicator's bottle.** The listing, as read on 2026-10-04, prints 0.5% (w/v) for the product it describes; no copy is kept and the build does not check the figure again. That this lab's bottle is that kind of solution is assumed (D4).
- **The density of water** behind the K_w note's conversion came from memory in the spike; Task 2 and Gate A put a source to it.
- **Node 22.** `package.json` allows it; nothing ran there and CI runs Node 24.
- **Other JavaScript engines.** The test for pink uses a power function that engines may round differently in the last bit. Careful runs never come nearer than 1% to the threshold; arbitrary paths were not searched.
- **The corner test assumes the worst flask is at a corner.** 200 000 flasks sampled inside the ranges agree; it is not proved.
- **The behaviours marked *invariant*** in Tasks 6 and 7 were never prototyped.
- **The tie rule** of the typed molarity (both neighbours accepted) was confirmed by the owner on 2026-10-04.
- **The sentences** drafted in `integration.md` 4.4 and in Task 11 have been read by no learner.

**A separate task, outside this plan: the OpenStax licence (D2).** The repository's existing files quote OpenStax Chemistry 2e and say it is CC BY 4.0, in `src/chem-data/periodic.ts`, `src/chem-data/sources.json` and `docs/for-institutions.md`. The design run questioned that statement. Checking the licence, and correcting the existing quotations and wording to whatever the check finds, is its own task with its own plan. It is not phase 3 work, and it must be done before the repository is made public. Phase 3 adds no OpenStax quotation and no statement of OpenStax's licence, and leaves the existing ones untouched.
