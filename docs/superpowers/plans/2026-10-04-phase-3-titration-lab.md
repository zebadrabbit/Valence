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
| D4 | The HCl bottle carries the hazard statements of hydrochloric acid, the solution, not those of hydrogen chloride gas. **Amended by the owner on 2026-10-05, in words that leave no doubt:** one supplier's safety data sheets, Flinn Scientific's, are the lab's reference for hazards. Each bottle carries the signal word and the statements of that supplier's sheet for the concentrated or the pure substance, stored as the sheet prints them: the acid's from the sheet for hydrochloric acid of 6 M to 12 M, to which the owner pointed (`flinn-sds-395`); the base's from the sheet for sodium hydroxide itself, the solid (`flinn-sds-734`); and the indicator's from the sheet for phenolphthalein itself, the solid (`flinn-sds-591`). Each sheet was read on 2026-10-05 and is cited and not kept. The heading over each bottle's statements says whose hazards they are and at what strength or in what form. The kept PubChem copies of the three classifications are out of the repository, since nothing reads them; PubChem's record for phenolphthalein is still the source of its molar mass, and its table of properties is still kept. With no copy of a sheet kept, the build cannot check the record against the sheets themselves: it holds the record to the manifest's rows. How this came about: as first decided, on 2026-10-04, the statements were entries of PubChem's records. The acid's were moved to the supplier's sheet earlier on 2026-10-05, and a check of that change the same day recorded that it rested on a reading of the owner's words which the owner had not confirmed (`gate-a.md`, A1). The owner has since confirmed the change and the sheet, and asked for the other two bottles to follow, so all of it has an owner decision's authority. The note under each bottle's statements rests on the same supplier's sheet or sheets for the solution at the strength on the bench, where the supplier has one for that solution (`gate-a.md`, questions 6 and 11). The acid's label, 0.0850 to 0.1050 M, lies on both sides of the line between two sheets, one for less than 0.1 M that gives Warning and one for 0.1 M to 2.4 M that gives Danger and H314 (`flinn-sds-395.3`, `flinn-sds-395.2`): its note says what each gives, that the bench's acid sits at the line between them, and that it is handled as the stricter sheet says; it does not call the acid mild. The base's strength is wholly under one sheet, for less than 0.3 M, which gives Warning and irritation of the skin and the eyes (`flinn-sds-735.2`). The supplier's one sheet for a phenolphthalein solution is for a solution in alcohol alone, 98% or more, which is not the 0.5% (w/v) in 50% alcohol the record takes the bottle to be; so the indicator's note stays on the other supplier's sheet it rested on, for that solution, and says that its sheet is another supplier's. The sheets of a third supplier that the acid's and the base's notes rested on until then are no longer sources. A note can therefore cite two sources: `hazards.note.alsoSourceId` names the second. The indicator is recorded as 0.5% weight per volume and cites a reagent catalogue listing that was fetched and read. The listing prints the basis, 0.5% (w/v), so the basis is not assumed of the listed product; what is assumed, and said in a note, is that this lab's bottle is that kind of solution (reworded 2026-10-05, once the listing had been read). **The listing is cited, not kept** (the owner's answer at Gate A, 2026-10-05): the copy that was in the sources folder is out of the repository, the manifest says what the page printed on 2026-10-04 and where, and the figure rests on that reading; the build no longer checks it against a copy. Hazard notes are drafted from fetched sources and read by the owner at Gate A |
| D5 | The final reading needs a swirl and wait that showed the pink lasts. A flask can be discarded and the trial started again. The 50.00 mL mark with no persistent pink is invalid even when water was added last. No further trial after the third that counts |
| D6 | The molarity is typed once per trial, to exactly four decimal places, and accepted only when it is the learner's own HCl molarity × 25.00 ÷ their own titre, correctly rounded. A value cut off instead of rounded is refused with a sentence that says to round. At an exact tie both neighbours are accepted (Q1 below, answered 2026-10-04) |
| D7 | The mode can change between trials, not during one. No trial is labelled with a mode |
| D9 | One HCl bottle, its label always readable. Step 1 is to read the label and record its molarity |
| D13 | K_w is 1.0×10⁻¹⁴ citing IAPWS R11-24, with a note giving the printed pK_w and the conversion. No OpenStax copy is kept |
| D14 | The narrow limit stays at 768 px. The notice and the institution text say that at 200% zoom on a small screen the bench is not shown |
| D16 | Average and relative deviation are entered by the learner on completion, over the three trials that count. The notebook's own are shown beside them. Nothing is marked |
| D8, D10, D11, D12 | Stream and pours, where the notebook goes, the meniscus view, how pink: the values in this plan are starting values. The owner judges them by eye at the browser checks and reads three meniscus levels at the first one (as run: the owner judges all four, and reads the three levels, in one look at the close of the phase; see "How the phase was run from Task 14") |
| D15 | The owner reads the primer and the hazard notes at Gate A |
| D2 | The OpenStax licence question is not phase 3 work (see the last section). New work quotes no OpenStax text and makes no claim about OpenStax's licence |
| Taken as decided | Additions are exact, so counting presses gives the titre. The export file holds the seed. Refilling between trials is taught and not forced. A comma is not a decimal mark |

**Q1 was answered by the owner on 2026-10-04: both neighbours are accepted at an exact tie.** The plan was already written to that answer, so nothing below changes. The question as it was put:

| # | Question | What this plan is written to until it is answered |
| --- | --- | --- |
| Q1 | D6 says "correctly rounded" and not what that means when the unrounded molarity ends in exactly 5 in the fifth decimal place. Label 0.0972 M with a 24.00 mL titre is exactly 0.10125: rounding a half up gives 0.1013, rounding a half to even gives 0.1012, and both are taught. Of the 47 868 label and titre pairs whose result lies in 0.0950 to 0.1050 M, 9 are such ties | Both neighbours are accepted at an exact tie. This is the half-unit rule of `engine.md` and of `integration.md` C18, and a learner who rounded by either convention is then never told to stop cutting the number off. Its cost: at those 9 ties the cut-off value is the lower neighbour, and it is accepted. If the owner answers "a tie rounds up": Task 5's rule leaves out the lower edge and its tie cases become 0.0938 true, 0.0937 false, 0.1013 true, 0.1012 false; the primer's `calculation` card (Task 10) and the `calculation-mismatch` sentence (Task 11) say that a 5 rounds up; spec 7.3 and 7.4 check 6 are changed to say so. Either way the answer replaces this row as a decision |

**Branch:** `phase-3-titration-lab`.

## How this plan is written

Earlier phases showed that plan code written without being run is where defects come from. This plan fixes interfaces, data rules, exact test cases and done-when checks, and leaves each implementation to be written test-first by its implementer. Every task ends with `npm run lint` and `npm run build` passing and a commit. (From Task 14 the whole build was run once a stage: see "How the phase was run from Task 14".)

Browser looks before the page is whole (Tasks 16 to 19) use one throwaway harness, `.superpowers/tools/phase3-harness/`: a small page that mounts the lab's real components, with the app's stylesheet, on the real engine. Task 16 starts it and Tasks 17 to 19 extend it. The folder is ignored by ESLint and kept out of git by the working copy's own exclude file, not by `.gitignore`, so `git status` is looked at for it before each commit. As run: the harness was started in Task 16 and extended in Tasks 17 and 18 (its parts `reading`, `stand` and `stopcock`). Task 19 did not extend it: the page became whole in the same stage, and the checks this plan gives the harness for Task 19 were run on the real page.

Where the expected values come from:

- **Prototype values.** Most are outputs of the three design prototypes as their reviewers corrected them. Every seed-dependent value holds only under the draw rule Task 1 fixes. The engine prototype draws with the repository's own `mulberry32` in that order, so its values for seed 1 carry over; the values for seeds 11 and 1384 and for trial index 3 of seed 1 were read from the same prototype while this plan was written.
- **Worked values.** Where an owner decision changes a value or adds a case, the plan shows the arithmetic beside it so a reviewer can check it by hand.
- **Invariants.** Where a behaviour was never prototyped (discarding a flask, the mode gate, the checklist's four states, the end of a trial judged after water) the case is marked *invariant* and gives the property to test, not a number read from a run.

An expected value that does not reproduce is a finding to report to the owner. It is never a number to change in the test.

## How the phase was run from Task 14

On 2026-10-05, with Tasks 1 to 13 built and Gate A held, the owner changed how the rest of the phase is run. That instruction overrides the tasks below where they differ. Each task from 14 on says, in an "As built" note, what was built that this plan did not say and what was done in place of a step it names.

- **Built straight through.** Tasks 14 to 21 were built in three stages (Tasks 14 and 15; 16 to 18; 19 to 21), with no review stop between tasks, no stop for the owner at a browser check, and no mutation-testing campaign. One deep review of the whole branch comes at the end, in Task 23.
- **One look by the owner, at the close.** How the lab looks is judged by the owner, by eye, in the running app, once, at the close of the phase. That look takes the place of the owner's part of browser check 1 (Task 16: reading three meniscus levels), of the owner's item of browser check 2 (Task 19: the stream's speed, the cue and the plume's two fades) and of the owner's block of Gate B. It takes in what the three stages asked the owner to judge as well; those are listed under "The owner's look at the close", after Gate B. Until it has happened no person has read the drawn meniscus, and `docs/for-institutions.md` says so.
- **What was checked without the owner.** What a person cannot see by looking was checked by throwaway scripts in Chromium, by keyboard alone: that every control can be reached and used, where focus goes, names and states, that the words and the picture agree, reduced motion, that nothing is lost on a reload, and that the console stays clean. Nobody ran the blocks of Gate B marked "By hand".
- **No `gate-b.md`.** The file this plan names for the browser checks was not written. What the scripts found is in the "As built" notes of Tasks 14 to 21 and in the "As run" note at the head of Gate B.
- **The whole build once a stage.** Test-first as before, with this plan's exact values. Before each commit of a stage, the linter on the files touched, the type check and the tests of the folders touched were run. `npm run lint`, `npm run build`, `build:data`, `build:expected` and `cross-check`, with `git status` the same before and after the three data steps, were run once, before the stage's last commit. So a commit that is not the last of its stage was not held to the whole build when it was made.
- **Documents once.** The plan, the spec and `gate-a.md` were not amended while the screens were built. They were brought up to what was built once, with Task 22; only the checkboxes were ticked as each stage ended.
- **Gate A was not closed first.** This plan says below that no component is started before Gate A has closed. Every finding of the gate was fixed; what kept it open was the owner's reading and two of the owner's questions. The components were built with those still open, under the instruction to build straight through, and what is open goes to the owner's look and to the review of Task 23 (see the "As run" note under Gate A).

Test counts at the end of each stage, with the quotation fingerprint made and no test skipped: 2099 after Task 15, 2132 after Task 18, 2188 after Task 21, and 2207 after the fixes of the deep review ("The deep review and its fixes", after Task 23). After the page was put into tabs on 2026-10-06 ("The page in tabs", after that section): 2233, and 2235 after the fixes of the check of the tabs, the same day.

## Global Constraints

- **Purity.** `src/engine/` and `src/chem-data/` never import React, three, or `src/app/`, and never use `document`, `window`, `fetch` or `XMLHttpRequest`. Nothing is fetched at runtime.
- **Determinism.** `src/engine/` never calls `Math.random` and never reads the clock. All variation comes from `mulberry32(seed)`. The seed is drawn in `src/app/`. The stream's timer, in `src/app/`, is the only clock in the lab; simulated time is a count the engine is handed.
- **Whole numbers.** Volumes are whole microlitres, molarities whole units of their last digit (`E4`, `E5`, `E6` in a name gives the scale), and every comparison that decides a reading, an overshoot or a grade is whole-number arithmetic. The one floating-point judgment is whether the mixed flask is pink. Typed text is parsed from its characters, never through a float.
- **Sources.** Every chemistry value shown to a learner or used by the model is stored in `src/chem-data/` with a `sourceId` that exists. A model parameter is `{ value, rationale }` and its rationale is a full sentence a reviewer can judge. No cited constant is adjusted to pass a test; only `faintPinkConcentration` is tuned.
- **Generated data.** `src/chem-data/titration/titration.json` and `src/chem-data/sources.json` are written only by `npm run build:data` from the authored input and the manifest. CI runs `build:data`, `build:expected` and `cross-check` and fails on any diff, so after a run `git status` shows only the intended files changed and every earlier generated file is byte-identical.
- **No quotation.** Nothing this phase writes quotes a source: not the primer's `support` lines, the manifest, a note, a rationale, a document or a comment. A passage is given by its location and by a statement in the project's own words of what it establishes. OpenStax is included, and no new text says what OpenStax's licence is. Two things are stored as printed because they are data, not prose: the digits of a `published` figure, and a GHS hazard statement with its code. A kept copy of a fetched file is a file with its attribution, as in `docs/research/periodic-table/sources/`. From Gate A a test holds the primer and the hazard notes to this: neither repeats six words running of a page it rests on. From the check of the bottles' move to the supplier's sheets (2026-10-05; `gate-a.md`, B4) it holds the manifest's rows for the safety data sheets to it as well, in what each says of where a figure is: three of those rows had repeated a line of the sheets, and the test had not read them. **The check is local.** It compares against a fingerprint of the pages that `scripts/fingerprint-sources.mjs` writes and `.gitignore` lists, because stretches of the pages can be rebuilt from it a word at a time; the pages themselves are not kept either. So the test runs on a machine where the fingerprint has been made and is skipped, visibly, where it has not, CI included. Whoever changes the primer or a hazard note makes the fingerprint first and runs the test; CI does not hold the rule.
- **Keyboard.** Every action works by keyboard. No action depends on timing or on holding a key. An unavailable button stays focusable (`aria-disabled`) and says why when pressed. An unavailable field is `disabled`, with its reason as visible text tied to it by `aria-describedby`. As built, two kinds of button say nothing new when pressed. A stopcock button that is unavailable only because a stream or a pour is running drops the press: the running button reads "Close stopcock", and no sentence was written for "close the stopcock first". A Record or Check button whose field cannot be used yet has the reason on screen all the time, tied to it, and does nothing when pressed. An unavailable button carries `aria-disabled` set directly and stays in the tab order; Base UI's own `disabled` was not used, because it swallows the press that has to say why. From the deep review: a reason or a sentence that the bench's message line already shows is said with "Again:" before it, so that the live region speaks on every press, and an open stopcock is told that Escape closes it as well as its own button.
- **Colour is never the only signal.** The flask's colour, the plume's cue, a step's state and a trial's result are always also words. (From 2026-10-06 some of those words are also coloured, by role: "Colour roles, entries made and steps done". The roles are an added cue on words or a mark that say the same.)
- **Reduced motion.** Under it nothing animates: no plume, no falling drop, no transition. The app's setting decides, not the media query alone.
- **No answer leaves the engine.** `src/app/` imports `@/engine/titration` (the index) and nothing below it. No screen, message or selector output states the equivalence volume, a pH, the expected titre, the true meniscus as a number, or the NaOH molarity before completion. Until the flask is pink no selector hands over a number the equivalence volume or the NaOH molarity can be worked back from: the plume leaves the engine as its status alone, and the pink concentration as 0 (Task 7). Three numbers the app must have in order to draw are handed over and never printed: the meniscus level; the flask's volume, which is exact, so that less what the learner put in it is the pipette's delivery; and the pink concentration of a flask that is already pink, which with the record's constants gives the NaOH molarity. Someone who reads the last two out of the page can work those two hidden values back (Gate A, F6 and N9: exact at 400 of 400 seeds). That is accepted, as the comment at the head of `select.ts` says: neither makes a trial count, which takes honest readings and the notebook's own arithmetic, and a failed trial's percent error gives the same molarity by D1. The app draws with these numbers and never renders them as text (Task 17).
- **Lazy.** No app file outside `src/app/lab/titration/` statically imports anything under it, under `src/engine/titration/` or under `src/chem-data/titration/`, types and test files apart. The route loads the page lazily, and Home reads a lab's status with `peekStatus` only. (From the deep review, Home also reads `SHELL_TEXT.planned` from `src/app/lab/shellText.ts`, as the list of labs does; that file is the shell's, not the titration lab's.)
- **No new runtime dependency.** All schemas are strict and use only the zod features `schema.ts` already uses, and `.max()` on numbers for the stored record's bounds.
- **Public repository.** No local paths, personal details or institution-specific text. No compliance claim in any copy.
- **Tests.** Tests import from `vitest` explicitly and run in the node environment. Existing tests are not weakened or deleted; the sanctioned changes are named in the task that makes them (Tasks 3, 9 and 15). As built, Task 21 also changed three of Task 15's cases in `page.test.ts`, because the page gained a bench and a notebook; its "As built" note gives them. A test of this lab that loops over seeds, levels or random records and runs near a second has a timeout of its own, 60 seconds, as `acceptance.test.ts` gives its seed loops: vitest's default is 5 seconds, a loaded machine or a CI runner is slower than the one a test was written on, and one such loop without a timeout failed a build at the last check of Gate A.
- **Green before every commit.** `npm run lint` and `npm run build` pass before each commit. `npm run build` runs the linter, the tests, the type check and the production build, and CI runs it on every pull request and on every push to `main`, so no task commits a failing test. From Task 14 the whole build was run once a stage, before the stage's last commit ("How the phase was run from Task 14").

## Review Focus

Five ways this lab could hurt a learner that no single task's tests exercise. Each is tied to the task that owns it; a reviewer of the whole branch looks at these first.

1. **Chemistry that is consistent and wrong.** The tests hold the engine to the stored constants and the sentences to their own structure; neither can see a constant of the wrong kind, a hazard statement that is not what its sheet prints (no copy of a sheet is kept, so the build holds the record to the manifest alone), or a primer sentence a lab instructor would not say. Owned by Task 2 (data) and Tasks 10, 11, 12 and 13 (words); Gate A is the only check.
2. **A meniscus a person cannot read.** The whole lab rests on reading 0.01 mL from a drawing, and so far only a model has read it from screenshots. The geometry tests of Task 12 prove where the lines are, not that an eye can use them. Owned by Task 16. As run, no person has read it yet: the owner's reading is part of the one look at the close.
3. **An answer that leaks, or a pass that is not honest.** The percent error of one failed trial gives the hidden molarity. D1 closes the route through typed readings, but the same answer can escape through a selector that carries a hidden value to the screen, a passing trial that prints its percent error, a mode change used as a meniscus oracle, or a sentence that names a volume. Owned by Task 7 (the public surface and the counting rule), with Tasks 6, 11 and 20.
4. **A dead end or lost work.** An open trial with nothing left to do, a Guided warning that loses focus with no way on, a stream addition delivered after the learner closed the stopcock, or one that a reload gives back. Owned by Task 6 (every open trial can be ended) and Task 18 (the stream; its browser check closes Task 19), with Tasks 8 and 21.
5. **Words and picture that disagree.** The status line says colourless while the flask is drawn pink, "pink persists" arrives an addition before the colour, the meniscus in words describes a level the drawing does not show, or a tile says "filled" over an empty burette. A learner who relies on the words is then taught something false. Owned by Task 13 (the join), with Tasks 12 and 17.

## File Structure

| File | Responsibility |
| --- | --- |
| `docs/research/phase-3/titration.json` | Authored input: the three bottles, each constant with the figure its source prints, each parameter with its rationale |
| `docs/research/phase-3/sources/` | `MANIFEST.json` (every source of the lab), `README.md` (attribution, and what is not kept and why), the kept copies. Written here and not kept, from Gate A: `quotation-fingerprint.json`, a hash of every six-word run in the pages the primer and the hazard notes rest on. It is in `.gitignore`: text can be read back from it a word at a time |
| `.gitattributes` | Checks the kept copies out byte for byte, with no line-ending conversion, so the build's sha256 check holds on every machine |
| `docs/research/phase-3/gate-a.md` | What Gate A found and what was done about it. No `gate-b.md` was written: what the browser checks found is in this plan, in the "As built" notes of Tasks 14 to 21 and at the head of Gate B |
| `docs/research/phase-3/deep-review.md` | What the one deep review at the close of the phase found, what was done about each finding, and what nobody checked |
| `scripts/build-chem-data.mjs`, `scripts/titration-lib.mjs` | `buildTitration()`; its checks as plain functions, so they can be tested |
| `scripts/fingerprint-sources.mjs`, `src/chem-data/titration/quotation.test.ts` | From Gate A: writes the fingerprint from pages saved outside the repository; holds the primer, the hazard notes and (from 2026-10-05) the manifest's rows for the safety data sheets to the no-quotation rule where the fingerprint is present, and skips those cases where it is not |
| `src/chem-data/schema.ts`, `support.ts`, `validate.ts`, `citations.ts` | `hazardsSchema` exported with a cited note; `located` moved out of `periodic.ts`; `validateTitration`; `titrationCitations` |
| `src/chem-data/titration/titration.json`, `data.ts`, `fixture.ts`, `primer.ts` | Generated record; its schema and `titrationData`; for tests only, a complete record on sources of its own (`titrationFixture`, `titrationFixtureWith`, `FIXTURE_SOURCES`), which the schema, validator and citation tests share; `TITRATION_PRIMER` |
| `src/engine/ph.ts` | The pH solver |
| `src/engine/titration/` `model.ts`, `pinnedModel.ts`, `setup.ts`, `flask.ts`, `state.ts`, `entries.ts`, `actions.ts`, `select.ts`, `index.ts`, `testkit.ts` | The model's numbers; the literal the tests run on; what the seed fixes; flask chemistry; the stored record; typed entries; `can`, `warnings`, `reduce`; selectors; the public surface; scripted learners for tests |
| `src/titration-version.test.ts` | Pins the judged values and the stored shape together with the entry's version |
| `eslint.config.js`, `src/lint-rules.test.ts` | The rule that keeps `src/app/` out of the engine's internals |
| `src/app/useMediaQuery.ts`, `activities.ts`, `routes.tsx`, `pages/Lab.tsx`, `pages/Home.tsx`, `progress/storage.ts` | The hook, moved; the lab's address, and `STATUS_LABEL`, moved out of `Home.tsx` so that Home and the list of labs share it; the list of labs; the not-saving notice rule |
| `src/app/lab/` `lab.css`, `shellText.ts`, `LabShell.tsx`, `ModeSwitch.tsx`, `Primer.tsx`, `Hazards.tsx`, `useLabProgress.ts` | Shared with phase 4. As built, `Primer.tsx` also exports `Subscripted`, which the notebook's worked lines use, and `shellText.ts` holds `UNSOURCED_TEXT`, the note under each list of sources. From 2026-10-06 the shell is three tabs and the primer one topic at a time ("The page in tabs") |
| `src/components/ui/tabs.tsx` | From 2026-10-06: shadcn's tabs on Base UI, added as the registry gives it. It brings no new package |
| `src/app/lab/titration/` `format.ts`, `messages.ts`, `benchText.ts`, `benchView.ts`, `controller.ts` | Numbers as text; every sentence keyed by an engine identifier; status line and descriptions; the engine's state as the bench sees it; the page's decisions |
| `src/app/lab/titration/` `buretteGeometry.ts`, `meniscusText.ts`, `flaskColour.ts`, `stream.ts` | Pure modules of the drawings and the stream |
| `src/app/lab/titration/` `ReadingView.tsx`, `ReadingInput.tsx`, `TitrationStand.tsx`, `apparatus.tsx`, `StopcockControls.tsx`, `useStream.ts`, `Shelf.tsx`, `TitrationBench.tsx`, `bench.css`, `Guide.tsx`, `Notebook.tsx`, `TitrationPage.tsx` | The components and the page. As built, `ReadingView.tsx` also exports `MeniscusWords` and `ReadingInput.tsx` also exports `recordReading` |
| `src/app/lab/shell.test.ts`, `src/app/lab/titration/` `bench.test.ts`, `page.test.ts`, `controller.test.ts` | The markup tests of the shell, the bench and the page, and the tests of the page's decisions |
| `vite.config.ts` | As built (Task 20): `lab.css` is among the stylesheets a test may read as text, for the rule that displays one form of the guide |
| `docs/for-institutions.md`, `README.md`, `src/app/pages/About.tsx`, `Settings.tsx` | Documents and wording. As built, `Settings.tsx` needed no change in Task 22: its not-saving notice is Task 9's |

`controller.ts` is this plan's addition to the integrated layout: it holds the page's decisions as pure functions so that Task 21 carries tests of its own.

## Task order

Tasks 1 to 13, then Gate A, then Tasks 14 to 21, then Gate B, then Tasks 22 and 23. Tasks 12 and 13 come before the gate because they write sentences a learner will see (`meniscusText.ts`, `benchText.ts`), and spec 13 has the gate's reviewer read every such sentence before any screen is built. Task 12 is pure and needs nothing from the engine, so it may run alongside Tasks 5 to 9; Task 13 needs Task 7's selectors and may follow it at once. No component (Task 14 onward) is started before Gate A has closed. The numbering is `integration.md`'s, which put the gate before Task 12; no two tasks were merged. Three were sharpened so that each stands on its own: Task 2 gains a test of its inputs, Task 15 lands the page as a shell so the route has something real to load, and Task 21 gains `controller.ts`. As run, Tasks 14 to 21 were built with Gate A still formally open and with no stop at Gate B: see "How the phase was run from Task 14".

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
    supports: { field: string; prints: string; where: string }[]   // one row per stored value: the figure as printed, and where
  }[]
}

// docs/research/phase-3/titration.json
type Input = {
  bottles: Record<'hcl' | 'naoh' | 'indicator', {
    name: string; formula: string; pubchemCid: number
    classifiedAs: string                 // what the statements classify, in the words of the tile's heading
    hazards: { signalWord: 'Danger' | 'Warning' | 'None'; statements: string[]; note: { value: string; sourceId: string; alsoSourceId?: string }; sourceId: string }   // alsoSourceId (from 2026-10-05): the second sheet of a note that rests on two
  }>
  constants: Record<string, Constant | Constant[]>   // { value, published?, unit, note?, sourceId }; atmosphericCo2 also has year
  parameters: Record<string, { value: number | [number, number]; rationale: string }>
}
```

Data rules:

- **Sources and ids.** `tamura-1996` (pK 9.05 and 9.50; read, not kept); `iapws-r11-24` (read, not kept); `nist-webbook-co2-henry` (0.034 mol/(kg·bar); read, not kept); `noaa-gml-co2-annmean-gl` (425.62 ppm for 2025; kept); `perrin-1982-wikipedia` (6.35 and 10.33, from a recorded revision of the Wikipedia article on carbonic acid; kept, and the citation says the book was not read); `usgs-phreeqc-dat` (the database file of the U.S. Geological Survey's PHREEQC program, read and not kept, added after the review of Tasks 1 to 8: it prints 10.329 and 16.681 as constants at 25 °C, which gives 6.352 for dissolved CO₂; it supports the two carbonic notes and is the `sourceId` of no value); `drop-unit-wikipedia` (0.05 mL, a recorded revision; kept); `pubchem-cid-4764` (molar mass 318.3; its table of properties is kept); `flinn-sds-395`, `flinn-sds-734` and `flinn-sds-591` (the supplier's safety data sheets the three bottles' signal words and statements are read from, D4 as the owner amended it on 2026-10-05: concentrated hydrochloric acid, solid sodium hydroxide and solid phenolphthalein; each read and not kept, with `fetchedSha256`, which for these pages, drawn by a script, is the hash of the text a browser showed; until that day the sources were `pubchem-cid-313`, `pubchem-cid-14798` and the classification in `pubchem-cid-4764`, each a kept copy of PubChem's GHS Classification section, and those three copies and the first two entries are gone); the indicator's catalogue listing (read and not kept, D4 as answered on 2026-10-05; its id names the supplier and catalogue number, and its entry carries `fetchedSha256`); and for the hazard notes, from 2026-10-05, `flinn-sds-395.2` and `flinn-sds-395.3` (the acid's, two sheets), `flinn-sds-735.2` (the base's) and the other supplier's sheet for the indicator solution, `ricca-sds-5600`; each read and not kept. Until that day the acid's and the base's notes each rested on a third supplier's sheet for a 0.1 N solution; those two entries are gone. No OpenStax page is kept. `README.md` gives the attribution the two Wikipedia copies require.
- **`prints` and `where`.** `prints` is the figure as the source prints it and nothing else. `where` says in the project's words where it is (page, table, row, heading). No sentence is copied.
- **K_w** (D13), under the key `waterIonProduct`. `{ value: 1e-14, unit: "", sourceId: "iapws-r11-24", note }` with no `published`. The note gives the printed pK_w (13.99, at 25 °C, molal scale) and the conversion to the molar scale (13.997). The conversion is recomputed here, not copied: the release's own equation gives 13.994 on the molal scale, and pK_w(molar) = pK_w(molal) − 2 log₁₀(ρ) with ρ = 0.99705 kg/L is 13.994 + 0.0026 = 13.997. The note names the density used and where it was read.
- **Indicator strength** (D4), under the key `indicatorStrength`. `{ value: 0.5, published: "0.5", unit: "g per 100 mL", sourceId: <the listing>, note }`. The listing is fetched and read; its copy, kept when this task was done, was taken out of the repository on 2026-10-05 (D4). The manifest's rows give what the page prints: 0.5, the basis (w/v), the solvent 50% (v/v) Alcohol, and 5 g/L, each with where it is. The note says what the listing prints (0.5% (w/v), and lower on the page 5 g/L), so that for the listed product the percentage is weight per volume; that the page was read on 2026-10-04, no copy is kept, and the build does not check the figure again; that taking this lab's bottle, labelled 0.5% with no basis, to be that kind of solution is an assumption and not something established; and that the endpoint test passes from 0.1% to 1%. If no catalogue listing can be fetched by any route, the task stops and the owner is asked for a saved copy of one; it does not close on a citation nobody fetched.
- **The other constants** as `engine.md` 2.1 has them: `indicatorPKas` 9.05 and 9.50 (published "9.05", "9.50"; the note on the first says they were measured in 0.2 M phosphate buffers and are used unchanged); `indicatorMolarMass` 318.3 g/mol; `indicatorDropVolume` 0.05 mL; `henryCo2` 0.034 mol/(kg·bar); `atmosphericCo2` 425.62 ppm, year 2025; `carbonicPKas` 6.35 and 10.33. The two carbonic notes say what the kept page prints beside each figure (the word hydrous, and no temperature); that taking 6.35 as the first constant of dissolved CO₂ is this project's reading; that the survey's file bears the reading out with 6.352 and 10.329 at 25 °C, the 6.352 worked out as 16.681 − 10.329 and repeated by the inputs test; and that the one other set the page's body prints, 6.77 and 9.93, moves the endpoint by about 0.1 µL at most, which an acceptance test holds (0.113 µL over the 256 flasks of check 4). No value is worked from the difference of 3.49 that the page also prints: it is not a figure for the second constant.
- **Bottles** (D4, D9). Each bottle's signal word and statements are those of the supplier's sheet for the concentrated or the pure substance (D4, from 2026-10-05), stored as the sheet's own lines with its code or codes in front as it prints them. `hcl`: "Hydrochloric acid, standardized", HCl, CID 313, Danger, and the three statements of the sheet for concentrated acid: H314+H318, H332+H302 and H290, with the sheet's wording for each. The sheet pairs two codes under one statement twice; the lines are not split into one for each code, because the standard wording of a single code is not on the sheet (the manifest's row for the first statement says so). H331 is not among them. `naoh`: "Sodium hydroxide solution, about 0.1 M", NaOH, CID 14798, Danger, and the two statements of the sheet for sodium hydroxide itself: H314 and H290. `indicator`: "Phenolphthalein indicator solution, 0.5%", C20H14O4, CID 4764, Danger, and the three statements of the sheet for phenolphthalein itself: H341, H350 and H361, the last for fertility or the unborn child. Until 2026-10-05 the statements were those of entries of the kept PubChem records: H314 and H335 for the acid, H314 for the base, and H341, H350 and H361f for the indicator. A sheet's hazard section also prints precautionary statements, and two of the three print a sentence on a cancer listing that carries no hazard code; none of those is a hazard statement and none is carried into the record, and one row of each sheet's manifest entry says so. `classifiedAs` says whose hazards the statements are, at what strength or in what form, and that they are from a supplier's safety data sheet: concentrated hydrochloric acid (6 M to 12 M); solid sodium hydroxide, the pure substance; solid phenolphthalein, the pure substance. It never says "pure substance" for the HCl bottle. "Pure substance" is spec 5.2's label and this project's word for a sheet whose composition table lists the substance alone; the sheets do not use it, and the manifest says so.
- **Hazard notes** (D4). Each note says what a safety data sheet for the solution at the strength on this bench gives, cites the sheet or the two sheets it rests on, and says no more and no less than they do; it never makes the solution sound safer than its sheet does. From 2026-10-05 the acid's and the base's notes rest on the same supplier's sheets as the statements above them. The acid's rests on two, because its label lies on both sides of the 0.1 M at which the supplier's sheets change: it gives each sheet's signal word and every statement of each with its codes, in the project's words; says that the bench's acid sits at the line between them; and says to handle it as the stricter sheet says. It cites the stricter sheet as `sourceId` and the other as `alsoSourceId`. The base's rests on the one sheet whose title covers its strength. The indicator's rests on another supplier's sheet, for a 0.5% (w/v) solution in 50% alcohol, because the first supplier has no sheet for such a solution, and it says that its sheet is from a different supplier than the statements above. No sheet of the first supplier names the rule it classifies under, and no note says that any does. `inputs.test.ts` holds each note to its sheets' rows in the manifest: every code and signal word a note names is printed by a row, and for the acid and the base every statement a row prints is in the note. First aid is given as far as the sheet gives it (`gate-a.md`, B1): for a splash in the eyes each of these sheets says to rinse with water for several minutes, to take contact lenses out where that is easily done, and to go on rinsing, and the acid's and the base's notes say all three; as first written they stopped at the several minutes. No sheet of this supplier gives a number of minutes and no note does; the 15 minutes or longer that the notes gave until 2026-10-05 was the third supplier's, and whether a figure comes back is the owner's (`gate-a.md`). Until that day the acid's and the base's notes rested on a third supplier's sheets for 0.1 N solutions, which classify under the United States hazard communication standard and said so; the acid's then gave Warning and the base's was not classed as hazardous. A figure worked out, not read (about 0.4% by mass: 0.1 mol/L × 36.458 g/mol = 3.6 g/L and 0.1 × 39.997 = 4.0 g/L, taking the density as 1.00 g/mL), is marked as worked out and repeated by a test. The owner read the notes as they stood before these changes and reads a before-and-after of them.
- **Parameters.** Every `PINNED_MODEL` key from `faintPinkConcentration` to `passesToComplete`, with its value (Task 1), plus `airPressureBar` 1.01325 and four that only the drawing uses: `pinkDisplayScale` 1e-5, `faintPinkNameLimit` 1.5e-5, `plumeFadeAtOnceSeconds` 0.5 and `plumeFadeSlowlySeconds` 3 (the real seconds a drawn plume takes to go, one for each way of fading; D8's starting values, added after the review of Tasks 1 to 8). The six keys before those (`kw`, `indicatorPKas`, `indicatorMolarity`, `indicatorDropUl`, `dissolvedCo2`, `carbonicPKas`) are not parameters: `modelFrom` takes or works them out from the constants. Rationales start from `engine.md` 2.1 and `bench.md` section 5, with these required: `unconditionedStrengthPercent` says the 2.0% is held through refills and that a real burette dilutes less each time (D3); `halfDropUl` says the half-drop is touched off on the flask wall and rinsed down with distilled water, and that every delivery is a whole number of half-drops except the last one above the 50.00 mL mark; `airPressureBar` says the CO₂ figure is a fraction of dry air and is applied to the whole pressure; `waterMaxUl` says the endpoint test holds to 30 mL even if the water carried CO₂; `molarityRoundingE6` says a typed molarity is accepted when it is the notebook's value rounded to the fourth decimal place, either neighbour at an exact tie (Q1); `faintPinkNameLimit` and `pinkDisplayScale` say they are presentation only; so do the two plume durations, which also say that the app is handed the plume's status and no number.

- [x] Fetch each source, record the manifest, keep the copies named above. Write the authored input.
- [x] `src/chem-data/titration/inputs.test.ts`, on the two files: the indicator's listing has no `file` and no `sha256`, no HTML file is in the sources folder, its citation says it was read on 2026-10-04 and that no copy is kept, its rows print 0.5, (w/v), 50% (v/v) Alcohol and 5 g/L, it has a `fetchedSha256` of 64 hex digits, no source has both a `file` and a `fetchedSha256`, and the strength's note says the page was read on that date, is not kept, and is not checked again by the build (from 2026-10-05; before, that the listing's kept copy prints the strength); every constant's `sourceId`, every `hazards.sourceId` and every note's `sourceId` is a manifest id; each constant with a `published` has a `supports` row for its field whose `prints` equals it, and K_w's row prints "13.99"; `atmosphericCo2.year` is 2025; no manifest source whose id or url names OpenStax has a `file`; every parameter has a rationale; every name, statement, note and rationale passes `findInstitutionText`; the grid holds (`dropUl % halfDropUl`, `streamUl % halfDropUl`, `(halfDropUl × tipBubbleUl) % tipBubbleEscapeUl`, `tipBubbleEscapeUl % halfDropUl` and `waterMaxUl % waterStepUl` are all 0); the by-mass arithmetic of any note that states it; the HCl bottle's statements are the sheet's three lines, with the codes H314, H318, H332, H302 and H290 and not H331, and its `classifiedAs` is the heading D4 gives and does not contain "pure"; the base's are the two lines of its sheet and the indicator's the three of its sheet, with H361 and not H361f, and their `classifiedAs` are the headings D4 gives; each bottle cites its own sheet and none has a `reference` (from 2026-10-05; before, the base and the indicator cited the kept PubChem record of each under a named entry); each sheet's manifest entry has no `file`, a `fetchedSha256` no other source has, and rows that print the signal word, each statement, the strength or the form, and the revision date; the acid's says in which form the statements are stored and why, and the other two point to it; one row of each says what else the sheet's hazard section prints and that it is not carried, without repeating it; no source and no kept file is a PubChem classification, the manifest has no `alsoKept`, and PubChem's record for phenolphthalein is listed for the molar mass alone, with its table of properties as the kept copy.

**Done when:** the test passes; the indicator listing's manifest entry has a row that prints the figure 0.5, has no `file`, and gives the sha256 of the page as fetched under `fetchedSha256` (until 2026-10-05: its kept copy contained the figure); every hazard note names a fetched source; `npm run build` passes.

### Task 3: Schema, validator, citations

Read: `engine.md` 2.3; `integration.md` section 2 (C26, C30, C31) and G14; `src/chem-data/schema.ts`, `validate.ts` (`validatePeriodicTable`) and `citations.ts`.

**Produces:**

```ts
// src/chem-data/schema.ts
export const hazardsSchema   // strict: { signalWord: 'Danger' | 'Warning' | 'None', statements: text[], note: cited(text) with an optional alsoSourceId (from 2026-10-05), sourceId: id }
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
- [x] From 2026-10-05, a hazard note can rest on two sources: a note keeps `{ value, sourceId }` and may name a second source in `alsoSourceId`. It is the smallest change that lets the acid's note cite the two sheets its strength lies between (D4). `schema.test.ts`: a note with `alsoSourceId` is accepted and given back whole; an empty one, a list, a further key, and a second source with no first are refused. `validate.test.ts`: an unknown `alsoSourceId` is an unknown source. `citations.test.ts`: the fixture's acid note is listed under both of its sources. The fixture's acid bottle has such a note, and the other two have none. The build refuses an `alsoSourceId` that is not in the manifest or that repeats the note's `sourceId`, and `inputs.test.ts` holds the stored record to the same.

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

What `buildTitration` checks against the kept copies, failing the build on any of them: the NOAA file has a row for the stored year whose mean is the stored value; PubChem's molecular weight for CID 4764 is the stored molar mass; each Wikipedia copy is the revision its citation names and contains the stored figure; each kept copy's sha256 is the manifest's; every `published` is a plain decimal equal to its value; every source id exists and is new. As built, it also checked each bottle's hazard statements and signal word against the kept PubChem record under the bottle's `reference`, with `checkHazards`. From 2026-10-05 every bottle's statements are a sheet's that is read and not kept (D4), so `checkHazards`, `reference` and the three kept classifications are gone, and the build checks what it still can, with `checkSheetHazards`: each bottle cites its own sheet (`flinn-sds-395`, `flinn-sds-734`, `flinn-sds-591`), which keeps no copy; each statement is a code, or codes joined by "+", then a colon, a space and the statement; the statements are the lines the manifest's rows for that source print, all of them and in order, each turned round from the sheet's form (the statement, then its codes in brackets); the signal word is the row's, in any case; and the code H331 is not among the acid's. **That is agreement between the record and the manifest. With no copy kept, the build cannot check the record against the sheets themselves; only a person reading the sheets can.** It writes the bottles, constants and parameters to `src/chem-data/titration/titration.json` and the lab's sources to `sources.json`. As built, the build also checked that the indicator listing's kept copy printed the stored strength as a percentage (w/v). That check and `checkStrength` went on 2026-10-05 with the copy (D4): the strength is now one of the values read from a page that is not kept, which the build cannot check and `inputs.test.ts` holds to the manifest.

- [x] `src/chem-data/titration/build.test.ts`, on inputs the checks must refuse: the saved NOAA value for 2025 altered by one digit; a Wikipedia copy of another revision; and for the bottles' sheets, from 2026-10-05: a statement with a word changed, under another code or with its paired codes in another order; H331 on the acid's bottle as a line of its own or paired; a signal word the manifest's row does not print; a statement left out, added or out of order; a statement with no code in front; a source with no rows for the bottle, such as another bottle's sheet; and for the indicator the statement its bottle carried before, "H361f: Suspected of damaging fertility", which its sheet does not print. Until that day the cases for the base and the indicator were against the kept PubChem records (a statement the record lists only under another entry; a signal word the entry does not carry; and one that had to be accepted, H361f against a record that prints the code with asterisks); they went with `checkHazards`, and a case holds that it and the kept classifications are gone.
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

The rounding rule (D6), in whole numbers: with `d = molarityE6 × titreUl − hclE6 × pipetteNominalUl`, the molarity follows from the notebook exactly when `titreUl > 0` and `−molarityRoundingE6 × titreUl <= d <= molarityRoundingE6 × titreUl`. Both edges are included, so at an exact tie either neighbour is accepted. That is the owner's answer to Q1 (2026-10-04).

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
  | { state: 'invalid'; reason: 'overshot' | 'ran-out' | 'washed-out' | 'discarded'; causes: Cause[] }     // technique causes only; 'washed-out' is a trial stored as ran-out that a wash of water ended (the last check of Gate A)
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
- [x] Added at Gate A (N10), to pin what was accepted and not to change it: in `src/app/lab/titration/storage.test.ts`, a record of this version with a seed of −1 reads on Home as the status it claims, `in-progress` or `completed`, until `loadEntry` with the lab's schema has set it aside, and `not-started` after; a record of another version reads `not-started` at once. Home reads the version and the status only (`peekStatus`), because the Lazy rule keeps the lab's schema out of it; spec 10 is worded to match.

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

- **Twelve cards**, in this order of ids: `acids-and-bases`, `molarity`, `titration`, `standardizing`, `endpoint`, `phenolphthalein`, `titrating`, `calculation`, `burette`, `glassware`, `precision`, `safety`. Eleven start from `shell.md` 7.2. The first card opens with one paragraph that says which four cards to read before the bench, in this order: `burette`, `glassware`, `titrating`, `calculation`, and that the other eight can wait. It does not say what the other eight are for. (Until the last check of Gate A it named three and left out `glassware`, the only card that tells the three technique steps and the refill; a Challenge learner who read the three and took none of the steps failed at every seed.) Because `glassware` is read second, it uses no word that only a later card explains: not moles, concentration, endpoint or titre. **Each word is explained at or before its first use in the four, read in that order** (the last check of Gate A): `glassware` opens by saying that the burette delivers the sodium hydroxide solution (NaOH) and the pipette measures out the 25.00 mL of hydrochloric acid (HCl) that goes into the flask; `titrating` opens with the endpoint, the first faint pink in the flask that lasts, and with the indicator, names the NaOH again, and says that its 25.00 is the millilitres of acid in the flask; `calculation` says at its first use what the equivalence point is, since the card that defines it is not one of the four.
- **`titrating`, new.** Swirl throughout. Run the NaOH in quickly while far from the endpoint and use the 5 mL pour only there; where the endpoint lies is estimated from the label before starting (about label × 25.00 ÷ 0.1 mL). From Gate A (N12) the card gives the pour a figure: only while more than 7 mL short of the estimate. It is worked from the model: the estimate is furthest past the real endpoint for the 0.1050 M label with 0.10500 M NaOH and a 24.97 mL aliquot, 0.1050 × (250 − 24.97 ÷ 0.105) = 1.28 mL, and 2.0% of the acid more with a pipette that was not rinsed, 0.1050 × (250 − 0.98 × 24.97 ÷ 0.105) = 1.78 mL; the other two technique errors do not bring the endpoint forward; so 5.00 mL run in from more than 7 mL short ends at least 0.22 mL before it. `primer.test.ts` repeats the arithmetic from the record's parameters, and `acceptance.test.ts` runs it: in Challenge, seeds 1 to 100, all eight combinations of the three technique steps, a learner who pours 5 mL (20 stream additions) whenever the meniscus less the recorded initial reading is more than 7 mL short of the estimate never ends a pour with the flask pink or the trial over, and the nearest any pour comes to its flask's equivalence volume is 1.02 mL. When the pink where the drop lands starts to linger, close the stopcock and go a drop at a time. From the last check of Gate A the card goes on: a single drop is far less NaOH than the stream runs in, so at first its pink clears at once again, which does not mean the endpoint is far off; when a drop's pink lingers too, change to half-drops. The cue is of the addition's size (spec 7.2), and without the sentence a learner who had been told that closer means slower read the first drops as not close after all. `acceptance.test.ts` runs the advice by the cue alone, in Challenge, seeds 1 to 100 at 2 and at 3 drops: the stream closed at its first "fades slowly", single drops until one fades slowly, then half-drops; the first drop always fades at once, as many as 35 in a row do, and every run reaches its endpoint and counts. Near the end a whole drop is too much: let part of a drop form on the tip, touch it off on the flask wall and wash it down with distilled water. The endpoint is the first faint pink that lasts 30 seconds of swirling. At a real bench the pink fades as the flask takes up CO₂ from the air, which is why the rule gives a time; this lab's flask is closed, so here a pink that persists always lasts the wait, and the card says so. A source is read and located for the half-drop and for the 30 seconds; a paragraph for which none could be read is marked "This lab:" and says no source was read, and Gate A is told.
- **The helper.** Only `located` moves. `Passage`, `Description` and `description` have no user in this phase (a primer paragraph is its own shape) and stay in `periodic.ts`, and so does the comment above `Passage`, which says what that file quotes and under what licence: moved, it would put a statement of OpenStax's licence into a new file (D2).
- **The `calculation` card** (D6). From Gate A (N6) it opens with the equivalence point, where the moles are equal, says that the endpoint the learner measures stands for it, and says that four decimal places is this lab's convention. It says to keep every digit until the last step and to round the answer to four decimal places, not cut it off. Its worked example is one where the two differ: initial 0.50, final 30.60, titre 30.10, 0.1200 × 25.00 ÷ 30.10 = 0.09967, which rounds to 0.0997 and cuts off to 0.0996. The card is one of the four read first, so rounding is met here before it is met as a refusal at the bench. If Q1 is answered "a tie rounds up", the card also says that a 5 rounds up.
- **Corrections to the eleven.** The acid was itself standardized by someone: its molarity is given, and it is not a primary standard. Conditioning uses two or three small portions. A NaOH solution goes on taking up CO₂ once made, which is why its bottle is kept closed and it is standardized again. The burette is refilled before each trial. The eye must be level with the meniscus, why, and that this lab's reading view always is. The safety card describes the three bottles as Task 2 stored them and makes no claim a fetched source does not carry. Of the dilute acid and the dilute base it says what the supplier's sheets for their strength give, every statement of each, and what those sheets ask for, with the first aid for a splash in the eyes given whole: several minutes of rinsing, contact lenses out, and more rinsing (`gate-a.md`, B1; as first written it stopped at the several minutes). Because it tells the learner to treat the acid as the stricter sheet says, its last sentence gives what that sheet asks for and the other two do not: a poison centre or a doctor called at once after a splash in the eyes, wetted clothing off at once, and a hood or a well-ventilated room (`gate-a.md`, B2) (from 2026-10-05, on the owner's answer at Gate A: the acid's strength sits at the line between two sheets and is treated as the stricter says, and the base's sheet gives irritation of the skin and the eyes; before, the card rested on another supplier's sheets, and said that the base's did not class it as hazardous, which is not the same as harmless). Nor does it name some of a bottle's hazards and leave out others (Gate A, F15, and its last check). Of the indicator it says all three statements the bottle carries, that phenolphthalein is classified as a substance that may cause cancer and as suspected of causing genetic defects and of harming fertility or an unborn child (from 2026-10-05; before, fertility alone, when the bottle carried H361f), and that those are for the pure substance. It then says each of the five hazards a supplier's sheet for a solution of this kind lists: the solution is flammable, seriously irritates the eyes, and may cause cancer, may harm fertility or an unborn child, and may harm organs; and that the note under the statements on the bottle gives the sheet's list with its codes. (After F15 the card summed the sheet up as flammable and a hazard to health over the long term, which eye irritation and harm to organs are not, and called the note "the full list" though it is the sheet's and not the bottle's own; the last check found both.) The card uses its own words and no codes; the bottle's statements and its note keep the codes.
- **The `precision` card.** From Gate A (N6) it says that the average is rounded to four decimal places first only because that is how the notebook works it.
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
/** The first line of an ended trial's feedback, a failed trial's apart (it carries a figure), and the note on water. Task 19 shows OUTCOME_TEXT['ran-out'] and OUTCOME_TEXT['washed-out']. */
export const OUTCOME_TEXT: Record<'passed' | 'notCounted' | 'closeWithTechniqueError' | 'largerHere' | 'largerHereAndShown' | 'water' | 'overshot' | 'ran-out' | 'washed-out' | 'discarded', string>
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

- **Outcome labels:** "Passed"; "Passed, not counted"; "Not passed, −2.13%" (with the figure); "Invalid: overshot"; "Invalid: burette ran out"; "Invalid: pink rinsed away"; "Invalid: discarded"; "In progress".
- **A pass that does not count** (D1 as answered on 2026-10-05): "This trial is within 1.0%, but it does not count toward your three. A trial counts only when it was run with a conditioned burette, no air bubble in the tip at the initial reading and a pipette that was not wet with water, both burette readings are within 0.02 mL of the meniscus, and the HCl molarity is the one on the label." The cause sentences that apply follow it. The pipette is "not wet with water" and not "rinsed": the aliquot of an earlier trial leaves it wet with acid, and a trial drawn with it then counts.
- **Count, not pass** (D1, D16). Every sentence about completion or the summary says "count", not "pass": `lab-not-completed` is "These are entered once three trials count."; `SUMMARY.heading`, `waiting`, `ask` and `average` name "the three trials that count"; `completedText` says three trials counted. A learner can have four or more passed trials of which three count, and a sentence that says to average "three passing trials" would have them include one the notebook leaves out.
- **A technique cause in a trial within 1.0%** (the owner's answer at Gate A, 2026-10-05: it does not count). `OUTCOME_TEXT.passedInSpite` and its branch of `feedback` are gone. The first line is `OUTCOME_TEXT.notCounted`, as for a misread; the causes follow; and after them, when a technique cause is among them, comes `OUTCOME_TEXT.closeWithTechniqueError`: mistakes in technique can push a result in opposite directions and cancel, and a small one may not move the result far, so a result this close does not show that the technique was sound. It covers both cases Gate A found, a pair that cancels and what is left of a bubble. It does not scold and says nothing of luck.
- **Larger here than at a bench** (Gate A, F1; said once from 2026-10-05). When a technique cause is among a trial's causes, one line follows them all, and `closeWithTechniqueError` where there is one: this lab makes a technique mistake cost more than it does at a real bench. It is said once however many causes are named, and no cause's own sentence says it. Under a failed trial whose every cause is a technique cause the line adds "so that it shows in the result" (`OUTCOME_TEXT.largerHereAndShown`); under a trial within 1.0% and under an invalid one it does not (`OUTCOME_TEXT.largerHere`), since the first's result was close and the second has none. Nor does it under a failed trial that also names a misread or a miscopied label (the last check of Gate A): there the failure may be that cause's doing, with the technique mistakes cancelled or pushing the other way. So `feedback` gives: the first line, the causes in the union's order, `closeWithTechniqueError` for a passed trial with a technique cause, the larger-here line for any trial with one, then the water note.
- **Causes are worded for every outcome.** A cause is named under a failed trial, under a passed one and under an invalid one that has no titre, so a technique cause says which way the error pushes a result ("on its own that makes the titre too high"), not what this trial's result was. `hcl-label-misrecorded` speaks of the molarity the trial was calculated with, since the notebook's may have been put right since. Two causes also say what to do (the last check of Gate A), because Challenge shows no warning and its learner may never have met the word: `burette-not-conditioned` opens by saying what conditioning is, that the burette was not rinsed with a little of the NaOH solution before it was filled; `tip-bubble` ends by saying to run a little NaOH through the tip before an initial reading, to push any bubble out. `pipette-not-rinsed` already says what was not done. The water note does not say the water changed nothing: at the last mark it can end a trial (D5).
- **`final-not-after-initial`** says, after the draft's two sentences, that an initial reading which is wrong cannot be put right once NaOH has run into the flask, and that the flask must then be discarded, naming `NOTEBOOK_TEXT.discard`. A Challenge learner who mistyped the initial reading has no honest final reading left, and this is the way on.
- **"Ran out" is said only of a burette with nothing left to deliver** (the last check of Gate A): of the outcome and its label, and of the primer's sentence on refilling. NaOH that has left the burette has "run from the burette" or "run into the flask", in `needs-initial-reading` and `final-not-after-initial` as in `mid-titration`. Before, the two refusals said "once NaOH has run out" with the burette nowhere near empty. The primer's burette card says that the reading grows as solution leaves the burette.
- **`blockedText` with nothing typed** still gives a sentence: `invalid-entry` without an entry is taken as a reading (the engine refuses a parsed entry only when a reading is off the scale), and `reread` without a reading begins "That reading".
- **The overshot sentence** gives the cue the primer's two answers, in order (the last check of Gate A): run the trial again, close the stopcock when the pink is slow to fade, go on by single drops, and change to half-drops when a drop's pink is slow to fade. Before, it said to change to half-drops once the pink is slow to fade, which the stream's pink is some 2 mL before the endpoint.
- **A discarded trial** has a sentence of its own for "Invalid: discarded", which the drafts lack: the flask was discarded, so the trial has no result and is run again. Its technique causes follow.
- **Warnings.** `burette-not-conditioned` is raised by a fill and by the initial reading of a burette already filled dilute, so its body reads true in both places. The buttons belong to the action, not the warning: the draft's "Fill it anyway" is `WARNING_BUTTONS.fillBurette.on` and nothing else.
- **A passed trial's percent error is never worded.** `trialOutcome` gives null for it until three trials count and a number from then on (Task 7). `outcomeLabel` and `feedback` read `percentError` only where `state` is `failed`, where its type is a number, so a passed trial reads the same before completion and after.
- **A failed trial:** the percent error with its sign, the direction in words (too low, too high), then each cause. When the figure reads 1.00 the line adds "just outside the 1.0% allowed".
- **`calculation-mismatch`** (D6) names the three numbers, says to keep every digit until the last step, to round the answer to four decimal places and not to cut it off, and that nothing has been marked. If Q1 is answered "a tie rounds up", it also says that a 5 rounds up.
- **`GUIDE_TRIAL_OVER`** says the trial is over and points to the notebook for what comes next. It is true after completion too, so it does not say to start another trial.
- **`already-done`** is given for the pipette rinse only, and both for a pipette that was rinsed and for one never rinsed that an aliquot has left wet with acid. Its sentence is true of both: the pipette is already wet with acid, so rinsing it now changes nothing for this flask. It does not say the pipette was rinsed, and says nothing of the aliquot (Gate A, N7; before, "That does not need doing now.").
- **`endpoint-not-confirmed`** says to swirl and wait. **`water-full`** does not suggest more water would spoil the flask. **`SHELL_TEXT.modeLocked`** says the mode can be changed between trials.
- **The ran-out sentence** is the spec's (7.2), word for word.
- **A trial that a rinse ended at the last mark** (the last check of Gate A). `trialOutcome` gives the reason `washed-out` for a trial stored as ran-out whose `lastAdditionUl` is 0: a wash clears the last addition and a delivery sets it, so such a trial was ended by a wash. The stored record is unchanged. Its sentence says that the rinse thinned the pink until it no longer shows, that the burette is at the 50 mL mark so no more NaOH can be added to bring the pink back, that the trial has no usable titre, and to refill before starting a trial; its label is "Invalid: pink rinsed away". The pink may have lasted a swirl and wait, with a final reading recorded, so the sentence does not say that the burette ran out before the endpoint. The water note follows it as it follows any outcome.
- **`completedText`** says three trials counted, gives the true molarity as the engine gives it, to five decimal places, and says nothing of four.
- **`SUMMARY.explain`** says what relative deviation measures, that it is not marked, that a learner who kept more digits of the average may differ from the notebook in the last digit, and that molarities are typed to four decimal places, and one unit in the fourth place is about one part per thousand of the result, so the relative deviation of three careful trials can take only a few values and reflects rounding as much as technique. It does not mention the label or significant figures: whether a typed molarity has three or four significant figures depends on the NaOH value (seed 11's is 0.1001 under a label of 0.0952), and the few values come from the four-decimal grid at any molarity in range (0.0001 ÷ 0.0950 to 0.1050 is 1.05 to 0.95 parts per thousand; two equal trials and one a unit off give 0.32 to 0.35).
- **`NARROW_NOTICE`** (D14) is `integration.md`'s T1: the bench is shown in windows at least 768 pixels wide; use a wider window, a tablet turned sideways or a computer; if the page is zoomed in, zooming out brings the bench back; progress is kept in the browser it was made in. Then one of two closing sentences.
- **Steps in a later trial:** "Refill the burette with NaOH"; "Pipette 25.00 mL of HCl into a clean flask".

- [x] `format.test.ts`: `readingText` of 24 370, 70 and 8290 is "24.37", "0.07", "8.29", and `parseReading(readingText(ul))` gives `ul` back for every hundredth from 0 to 50 000; `molarityText` of 94 900 and 100 000 is "0.0949" and "0.1000", and `parseMolarity(molarityText(e6))` gives `e6` back for every multiple of 100 below 1 000 000; `percentErrorText` of −2.1259, 1.8733, 12.5 and −1.5 is "−2.13%", "+1.87%", "+12.50%", "−1.50%", each minus being U+2212; of 1.00402 it is "+1.00%" (a trial at 0.1006 M against a true 0.09960 M: 0.0010 ÷ 0.0996 = 1.004%, which fails, since 100 000 > 99 600); `deviationText` of 0, 4, 10 and 133 is "0.0", "0.4", "1.0", "13.3"; `deviationE2Text` of 47, 130, 200, 50 and 0 is "0.47", "1.3", "2", "0.5", "0", and `parseDeviation(deviationE2Text(e2))` gives `e2` back for every whole number from 0 to 2000.
- [x] `messages.test.ts`:
  - Feedback. "No percent error" below means nothing matching `/[+−]\d+\.\d\d%/`; a bare percent sign is allowed, since the D1 sentence itself says "within 1.0%". A clean counting pass: one line, with no percent error in it, and the same line whether the outcome's `percentError` is null or −0.126. A failed trial at −2.126 with one cause: the first line holds `percentErrorText(−2.126)` and "too low", then that cause's sentence. A failed trial at +1.004: its first line holds "+1.00%" and "just outside". A pass with two technique causes, which does not count: the does-not-count sentence, both causes in the union's order, then `OUTCOME_TEXT.closeWithTechniqueError`, no percent error; that last sentence is not said under a misread alone, a failed trial or an invalid one, and is said when one technique cause stands beside a misread. The larger-here line: no `CAUSE_TEXT` sentence holds "more than it does at a real bench"; the feedback of a trial with one, two or three technique causes holds it exactly once, after the last cause and before the water note; the feedback of a trial with no technique cause (a clean pass, a failed trial with none, a misread, a misread with a wrong label, an overshot trial with no cause) does not hold it; "shows in the result" is in the feedback of a failed trial with technique causes alone and in no passed or invalid trial's; and, on seed 1 in Challenge, not in that of the pair that cancels with the final reading typed 0.60 mL high (failed at −2.34%), nor in that of a trial with 0.03 mL of bubble left and the label copied 0.0020 too high (failed at +1.77%, too high, under a cause that pushes low). A pass with `final-misread` and `counts` false: the does-not-count sentence, then the cause, no percent error. Invalid, each of the three reasons, `discarded` included: its sentence, its technique causes, no percent error. Water added: the water note comes last and is never a cause.
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
/** What a wash, a drop or a half-drop adds to its message when it undid a swirl and wait that had shown the pink to last; '' otherwise, and '' when the action ended the trial. `before` and `after` are the views either side of the action. (Added at Gate A.) */
export function undoneText(before: BenchView, after: BenchView): string
export const SLOW_DOWN_TEXT: string
export const STOPCOCK_ALREADY_CLOSED: string
```

`benchViewOf` is built from the engine's selectors and `can` alone. `readingWanted` is `final` once titrant has been delivered in the current trial and `initial` until then. `readingBlocked` is `can`'s word on that reading, asked with a probe value; any reading will do, because `benchViewOf` treats `invalid-entry`, `reread` and `final-not-after-initial` as recordable and gives null for them: they are about the value typed, not about the state. `benchText.ts` and Task 12's `meniscusText.ts` are among the files Gate A's reviewer reads, so both are finished before the gate. The status line: "Flask: *name*." then, while a plume is showing, " Last addition: *cue*.", and after a swirl and wait " Swirled 30 s: the pink has lasted." or " Swirled 30 s: no pink." in its place. (Until Gate A the second read "no pink remains". The model's flask is closed, so a wait finds no pink only in a flask that was not pink before it, one that has had no NaOH at all included; "remains" said otherwise.)

As built: the status line gives an overshot flask its colour and no cue, and a flask with no indicator "No indicator in it." whatever was done to it. `plumeKey` is the volume delivered in the trial. `benchViewOf` asks about the reading with the value 0. `swirlText` is `ACTION_TEXT.swirlAndWait` with what the wait found, in the status line's own words, and after a pink that lasted it adds that the final reading can be taken. No string in `benchText.ts` holds a number with a decimal point, so the pipette's sentence does not name its 25.00 mL; the checklist and the reasons in `messages.ts` do. The sentences for a fill and for clearing the tip say that an initial reading recorded before them no longer applies, and do not say to take one. `SLOW_DOWN_TEXT` stays on screen for as long as the hint does, through a stopcock opened again, so it says that an open stopcock was closed when the hint appeared and not that the stopcock is closed. Changed at Gate A: a wash of water sets the trial's `lastAdditionUl` to 0, so after one `plume` is null and the line gives the colour alone until titrant runs again. Before that, the join said "Last addition: …" again after a wash, with a cue worked out afresh on the thinner flask, which could call an addition that persisted one that fades slowly. `undoneText` is the sentence for a wash or an addition that undid a confirmed endpoint, which also clears a final reading recorded after it. It ends with what to do next, from the view after the action: "Swirl and wait again before the final reading." while the flask is still pink, and, where a wash has thinned the pink away, that the water has thinned the pink until it no longer shows, so add a half-drop. It is empty when the action ended the trial (a wash at the last mark that takes the pink away ends it as ran-out). On that thinned flask Guided's hint shows again, so `SLOW_DOWN_TEXT` reads "Add no more than a drop at a time" where it read "Go on a drop at a time": a limit agrees with the half-drop, an instruction to go by drops did not. From the last check of Gate A it ends "and change to half-drops when a single drop's pink is slow to fade", where it ended "once the pink is slow to fade": the hint first shows with the stream's own "pink fades slowly" in the status line, and the next drop's pink fades at once.

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
| A swirl and wait then | "Flask: colourless. Swirled 30 s: no pink." |
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
- [x] **The hazards.** Each stored statement against the kept record under the named entry. The HCl bottle carries the entry for hydrochloric acid (H314, H335) and not the gas's (H331), and nothing over its statements says "pure substance". Each note says no more than its source says, and says so where its sheet is for a different solution. (Ticked for the record as the reviewers had it. On 2026-10-05, after the review, the owner decided that one supplier's safety data sheets are the lab's reference for hazards (D4). All three bottles' statements are now those of that supplier's sheets for the concentrated or the pure substance, and no kept record is left to hold them against: the build holds the record to the manifest, and cannot check it against the sheets themselves. The acid's were moved first, and a check of that change found that the owner's words did not plainly say so (`gate-a.md`, A1) and that the supplier has sheets for acid as dilute as the bench's, which nobody had read (A2, question 11); the owner has since answered both. The new statements, headings and sentences were read against the sheets by whoever made each change, and then by one check of the move, made by someone else with the sheets loaded again, whose findings are `gate-a.md` B1 to B6. What was written to fix those findings has been read by no one independent; `gate-a.md` lists it with the other sentences no independent reader has read.)
- [x] **Every sentence a learner will see**: the primer; every string and every function's output in `messages.ts`, `shellText.ts`, `benchText.ts` and `meniscusText.ts`, which hold what each prep action says it did, the half-drop message, the slow-down line, the stream and swirl messages, the status line, the stand's description and the meniscus in words. The few labels and headings written straight into components in Tasks 14 to 21 do not exist yet; the branch reviewer reads those at Task 23. What is looked for: a chemistry claim that is wrong, or that a lab instructor would not say. No sentence gives away the expected titre, the true molarity before completion, or the meniscus; no reason gives anything away in Challenge. (Ticked after the last check of 2026-10-05, which read the primer as shown and the output of every wording function at `f4aef09`, the sentences written since the first review among them. Its one must-fix and ten should-fix findings are fixed and none about a sentence is open. The sentences written for those fixes are listed at the end of `gate-a.md` and have been read by no one independent.)
- [x] **The two rules of D1 and D6, attacked:** try to complete a lab without three honest titrations; try a cut-off molarity, a tie, a molarity one unit either side.
- [ ] **The primer's chemistry that no source was read for** (Task 10; each is marked "This lab:" in its paragraph's `support`): that the faint pink of a real endpoint fades because the open flask takes up CO₂, and that this is why the rule gives a time (`titrating`, the last paragraph; the source read establishes only that CO₂ from the air uses up hydroxide at such an end point); that a NaOH solution which has stood is standardized again (`standardizing`, the second paragraph); touching the hanging part-drop to the flask wall, where the page read washes it off the tip (`titrating`, the third paragraph); the definition of relative deviation (`precision`); which way an escaping tip bubble moves the reading (`glassware`, the third paragraph); and two added at the gate, which with one added at its last check makes eight points: the statements about a real bench, that each of the three mistakes costs less there, that a real burette tip holds less air than this lab's bubble, and that a real burette which was not conditioned is less diluted at each refill (`glassware`, the fourth paragraph); that a 10 mL rinse can thin a very faint pink until it no longer shows (`titrating`, the third paragraph); and that a single drop's pink clears at once again after the stream's has begun to linger (`titrating`, the second paragraph).
- [x] **No quotation** anywhere in what was written; OpenStax by location only, with no word about its licence. (From 2026-10-05 the test that holds this is a local check: see the Global Constraint.)

As held, 2026-10-05: eight of the ten items above were carried out by the reviewers at commit `cac9a56`, and `gate-a.md` gives what each found. A ninth, every sentence a learner will see, was carried out again by the last check at `f4aef09`, after the sentences written to fix the first findings and those written after the owner's answers; what it found is fixed, and what was written to fix it has not been read by anyone independent. One stays open: the eight points of the primer for which no source was read were not judged one by one. No finding of the reviewers waits on the owner any more: on 2026-10-05 the owner answered two questions (a trial with a technique cause named in it does not count; the indicator's listing is cited, not kept); the rest were decided without the owner, each recorded in `gate-a.md` with its reason so that it can be taken back. A third question, the heading over the acid's statements, was answered later that day: the owner decided that the bottles' statements come from one supplier's safety data sheets (D4). For some hours between, a check of the first change had recorded that the owner's words, as relayed, did not plainly say so; the owner then said so plainly, and `gate-a.md` gives the check under "The check of the acid bottle's new source" and what was done on the answer under "The owner's answer on the supplier's sheets". What the owner reads, and the questions still open for them, are listed there under "For the owner to read". The changes made on that answer were then checked by someone who had not made them, with the supplier's sheets loaded again: one must-fix and five should-fix findings, `gate-a.md` B1 to B6. Five are fixed, two of them in what a learner reads (the first aid for a splash in the eyes, given short of what the sheets give; and what the stricter of the acid's sheets asks for, which the safety card left out); the sixth is a sentence of the safety card that is the owner's, left as it is and put to them. What was written to fix those findings has been read by no one independent. The gate is not closed.

As run, after the paragraph above was written: two more changes were made to the safety card on 2026-10-05, before any screen was built, and `gate-a.md` records both. The sentence of B3 was reworded without the owner to "The statements are for each substance at full strength, and the note says what applies at the strength on this bench.", and shown to the owner in a before-and-after, so the gate no longer waits on that sentence as it stood. And the owner answered the question on the rinse time: the card now says that the sheets give no time, that a laboratory sets its own rule, that a common one is 15 minutes at the eyewash, and to follow the rule of the laboratory one is in. Tasks 14 to 21 were then built with the gate still formally open ("How the phase was run from Task 14"). Still open, and carried to the owner's look and to Task 23: the owner's reading of the before-and-after and of the primer's sentences changed since their first reading; the owner's questions 3 (the depth of the drawn meniscus, which they see at the look) and 4 (three college laboratory manuals named as publishers in citations); the eight points of the primer for which no source was read; and the sentences no independent reader has read, to which Tasks 14 to 21 added the labels listed in their "As built" notes.

**The owner** (D4, D15) reads, as the person who runs this lab:

- [ ] the primer, and in particular the new card on titrating to the endpoint, the sentence that the acid was itself standardized, "about pH 8.3", the word "conditioning", the 30-second wait that in this model cannot fail, and what the safety card does and does not cover;
- [ ] the three hazard notes and the heading over each bottle's statements (read and approved by the owner as they stood before the changes of 2026-10-05 to the hazards; the owner reads a before-and-after of what those changes rewrote, which `gate-a.md` lists, with two items added by the check of those changes and a question on the 15 minutes of rinsing that the approved notes gave and the supplier's sheets do not); (the question is answered, 2026-10-05: the safety card says that the sheets give no time and that a laboratory's own rule, commonly 15 minutes at the eyewash, is the one to follow);
- [ ] and changes anything they would say differently at the bench. If the label of the indicator their lab stocks is to hand, they say what it prints (solvent, and whether the percentage is weight per volume).
- [ ] They answer the questions `gate-a.md` lists for them: whether a real burette tip holds less than 0.60 mL of air and a real bubble leaves at once; whether 10 mL is the right rinse portion; the depth of the drawn meniscus (`READING.meniscusRiseUl`, 0.08 mL of scale, chosen by eye); the three college laboratory manuals named as publishers in citations; the indicator's label; and five from the last check, one of which has since gained a second question: whether the safety card should say more of the dilute sodium hydroxide than its sheet does (answered on 2026-10-05: it says what the supplier's own sheet for that solution prints, which is Warning and irritation of the skin and the eyes); what the heading over the acid's statements should say of the entry's strength (answered on 2026-10-05: the three bottles' statements are now a supplier's sheets', and each heading gives the strength or the form; question 11, added by the check of the first change, asked what the tile and the safety card are to say now that the same supplier's sheets for dilute acid have been read, and the owner answered that too: the notes rest on that supplier's sheets for the strength on the bench, and the acid, whose label lies on both sides of the line between two of them, is handled as the stricter says); whether the stored entry's version stays at 1 now that the counting rule has changed; whether a sentence should say that a burette filled after conditioning traps air in the tip again; and whether it is intended that the tip and the pipette can be put right by a discarded flask without their own steps. With the before-and-after they also answer what `gate-a.md` puts beside it, and one of those keeps the gate open by name: whether the safety card's sentence that the statements are not written for these dilute solutions is to say as well that the code H314 is on the supplier's sheet for acid from 0.1 M up (`gate-a.md`, B3). A check of the bottles' move to the supplier's sheets found that the sentence, though true and approved, now leads a learner to take Danger and H314 for concentrated acid alone. It is the owner's sentence and is left as it is; the gate does not close on it as it stands unless the owner says to keep it. (As run: the sentence was reworded later on 2026-10-05, without the owner, and shown to the owner in a before-and-after: `gate-a.md`, B3.)

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
// From 2026-10-06 ("The page in tabs"): primer: ReactNode, on the Primer tab; bench(shown: boolean): ReactNode, on the
// Lab tab with the guide and the notebook; record on the Record tab. And:
export type LabTab = 'primer' | 'lab' | 'record'
export const openingTab: (started: boolean) => LabTab     // the primer until there is a run, then the lab
// From the check of the tabs: how far the window is scrolled when a tab comes to be shown ("The page in tabs")
export const tabShift: (barTop: number, left: number, start: boolean) => number

// src/app/lab/ModeSwitch.tsx
export function ModeSwitch(props: { mode: Mode; onChange(mode: Mode): void; disabled?: string }): ReactElement

// src/app/lab/Primer.tsx
export function Primer(props: { sections: readonly PrimerSection[]; sources: readonly Source[]; open: boolean; modelCitations?: readonly Citation[] }): ReactElement
export function subscriptParts(text: string): { text: string; sub: boolean }[]     // "M_NaOH" -> M, then NaOH as a subscript
// From 2026-10-06: Primer has no `open`; it takes readFirst?: readonly string[] and opensAt?: number, and the file exports
export function pieces(paragraph: Pick<PrimerParagraph, 'text' | 'terms' | 'labRules'>): { text: string; term: boolean; labRule: boolean }[]

// src/app/lab/Hazards.tsx   (phase 4 has bottles too)
export function Hazards(props: { classifiedAs: string; hazards: Hazards; sources: readonly Source[] }): ReactElement

// src/app/lab/useLabProgress.ts
export function labProgress<T>(store: KeyValueStore, activity: Activity, schema: z.ZodType<T>): { load(): T | null; save(next: T): boolean }
export function useLabProgress<T>(activity: Activity, schema: z.ZodType<T>): [progress: T | null, save: (next: T) => void]
```

Rules:

- **DOM order** is primer, guide, bench, notebook, record at every width; `lab.css` only places them. (Changed 2026-10-06: the order holds, across three tab panels. The primer is the first panel, the guide, bench and notebook the second, the record the third; see "The page in tabs".) Container queries on the page's own width, never the viewport's: one column below 78rem; the notebook beside the bench from 78rem, with the bench's track taking `minmax(56rem, 83rem)` and growing before the side column does; the guide as a left column from 110rem. Nothing in it animates.
- **Narrow** (D14). The shell renders the notice, the primer (open) and the `record` slot. No bench, guide, working notebook, mode switch, field or button is in the DOM; before Start there is no record either. The bench is not mounted, which is what closes a running stopcock. (Changed 2026-10-06: the narrow page keeps the three tabs. The notice is on the Lab tab in place of the bench, the record on the Record tab. There is still no mode switch, Start, Restart or field; the buttons it now has are the tabs and the primer's own.)
- **Markup.** The lab's `h1` is the heading the layout focuses after navigation; the breadcrumb is Home, Lab, title. The mode is a `fieldset` with legend "Mode" and two radio inputs; locked, both are disabled and described by the reason. The docked notebook is an `aside` named "Lab notebook". The primer is one native `details`; each section a card with an `h2` and its Sources; at its foot, when given citations, a disclosure named "Sources for this lab's model". (Changed 2026-10-06: the primer is no longer a `details` and shows one card at a time; the model's disclosure is under the card and the Previous and Next buttons.) The not-saving notice is the sentence of Task 9 in a `role="status"` paragraph.
- **Hazards.** A `details` named "Hazards": the signal word; a heading that names what is classified, from `classifiedAs`; the statements, each drawn whole as it is stored; "At the strength used here" and the note; then Sources, listing the classification's source and the note's, which are two where the note has an `alsoSourceId`.
- **Saving.** `save` sets the state and calls `saveEntry` in the event handler, never in an effect.
- **A statement is a line, not a code and a text.** The statements are a supplier's sheet's own lines (D4), and a sheet can give two or three codes one statement: a line can begin "H314+H318:". The component does not assume one code to a line, does not split a line at its code or look a code up, and does not sort or merge lines; it draws each stored string as it is, in the stored order. The heading comes from `classifiedAs` alone: it is different for each bottle, and no component writes "pure substance" itself.
- **Existing pieces.** `Card`, `Disclosure` and `Sources` come from `src/app/explore/InspectorCard.tsx` as they are. The source list is `@/chem-data/sources.json`, as `ElementCard.tsx` takes it, never `registry`, which would pull every molecule file into the lab's chunk.
- **Markup tests of pages.** `LabShell`, `ModeSwitch`, `Primer` and `Hazards` take everything as props and render under `renderToStaticMarkup` as they are. A component that calls `useAppState` or `useMediaQuery` does not: in node the media hook has no server snapshot and throws, and `AppStateProvider` builds its store from the browser. So a markup test of the lab list or of the lab page (Tasks 15 and 21) replaces `@/app/AppState` (`useAppState` returning a `createMemoryStore` store the test holds, with `persistent` and `reducedMotion`) and `@/app/useMediaQuery` with `vi.mock`, as `src/app/explore/elements/page.test.ts` does for `react-router`.

- [x] (Rewritten 2026-10-06 for the tabs, each changed case saying what it held before: "The page in tabs".) `shell.test.ts` (`renderToStaticMarkup` in a `MemoryRouter`): the breadcrumb links to `/lab`; the notebook `aside` is named; the DOM order holds. Before Start: Start, the primer open, the mode switch, no bench and no Restart; after: Restart, the bench, no Start, the primer closed (the test's `primer` slot draws the real `Primer` with the `open` it is handed). Narrow with a run: the notice with its zoom sentence, the primer, the record, and none of the excluded things; narrow before Start: no record. Not saving: one `role="status"` paragraph with the sentence; absent otherwise. `ModeSwitch` on `challenge`: the fieldset, `guided` unchecked, `challenge` checked; with `disabled`, both inputs disabled and the reason present and tied by `aria-describedby`. `Primer` on `TITRATION_PRIMER`: one `details`; twelve `h2` in order; twelve Sources controls; `M<sub>NaOH</sub>` present and no `M_` left; every link is https and opens in a new tab; with citations, the model's disclosure lists each source once. `subscriptParts('M_NaOH × V_NaOH = 1')` is M, sub NaOH, ` × V`, sub NaOH, ` = 1`. `Hazards` on the HCl bottle: the signal word; each of its three statements whole and in order, the first beginning "H314+H318: " and the second "H332+H302: "; the note; three source links, the classification's and the two under its note; and no "pure substance" in its heading. On the NaOH bottle: two source links. `Hazards` on the other two bottles: each heading as stored, with "pure substance" in it.
- [x] `labProgress` on a memory store: `load` is null before any save; one `saveEntry` per `save`, with the activity's version; what is saved is what is loaded.

As built:

- **Narrow.** The narrow page also shows the not-saving paragraph when the browser is not keeping progress, as the wide page does, because spec 10 has each lab page say so. `shell.test.ts` holds it at both widths.
- **The primer is one outer `details` that holds more.** (No longer so from 2026-10-06: one card is shown at a time, with its own Sources control, and the markup has one `details`, or two with the model's.) Each card's Sources control is the explorer's `Disclosure`, itself a `details`, so the markup has thirteen, and fourteen when the model's citations are given. The test holds the outer one, the twelve Sources controls and the count. The disclosure "Sources for this lab's model" repeats about ten lines of the `Sources` component's list, because that component's summary always reads "Sources"; it is marked with a `ponytail:` comment.
- **Props.** `modeLocked`, `ModeSwitch`'s `disabled` and `Primer`'s `modelCitations` accept `undefined` as well as being optional, as `PageHeader`'s `documentTitle` does.
- **Focus.** Start moves focus to the page's `h1`: the Start button is removed by the press, and focus would otherwise fall to the body. (Changed 2026-10-06: Start shows the Lab tab and moves focus to its panel, which is named "Lab" by its tab.)
- **`STATUS_LABEL`** (Not started, In progress, Completed) moved from `pages/Home.tsx` to `activities.ts`, so that Home and the list of labs share it.
- **Hazards.** Its two headings are `h4`, under a tile's `h3`. The signal word is drawn above the heading that says whose hazards these are, in this plan's order; the stage asked the owner to judge that order (see "The owner's look at the close"). (Changed at the deep review: the signal word is now under that heading, with the statements; `shell.test.ts` holds the new order.)
- **Sentences written here that no one has read** (`shellText.ts`, `UNSOURCED_TEXT`, the note the `Sources` component asks for under each list): for a primer card, "What a card says about this lab's own set-up, rules and model, and the arithmetic of its examples, is Valence's own and is read in no source."; for the model, "The model's other values are this lab's own choices, each stored with its reason, and are read in no source."; for a bottle, "The note on the strength used here is written by Valence from the sources listed for it." Labels written into the components: "This card", "Signal word: ", "Signal word and hazard statements", "At the strength used here", "Sources for this lab's model", "Mode", "Hazards".
- **Tests beyond this plan's list:** no guide slot when the lab hands none; each primer card lists every source its paragraphs cite, once; no "This lab:" support line is shown; a statement line with three codes is drawn unsorted.
- **Not built:** a lint rule or a test for the Global Constraint "Lazy". It was checked by reading the built chunks.
- **In Chromium, on the built app, by keyboard** (58 checks, all passing; the script is not in the repository): the mode's radios, Start, Restart and every disclosure; nothing stored before Start; a reload keeps the run byte for byte; Restart's confirm, dismissed and accepted; Home, the list of labs and the command palette open the new address; 767 px against 768 px; the not-saving notice with writes refused from the start and part-way; an entry that does not fit is backed up; no console error; no request leaves the app.

**Done when:** `shell.test.ts` and the existing `firstPaint` and preferences tests pass; `npm run build` passes.

### Task 15: Routes and the list of labs

Read: spec 4; `shell.md` 1.1, 1.2, 1.4; `src/app/routes.tsx`, `routes.test.ts`, `activities.ts`, `pages/Lab.tsx`, `pages/Home.tsx`.

**Produces:** the route `lab/titration`, loaded lazily; `ACTIVITIES[0].to` as `/lab/titration`; `pages/Lab.tsx` as the list of labs; and `src/app/lab/titration/TitrationPage.tsx` in its first form: `LabShell` with the primer, the mode choice, Start and Restart, on `useLabProgress(ACTIVITIES[0], titrationStateSchema)`, with its four slots (guide, bench, notebook, record) empty until Task 21 fills them.

- **Start** draws the seed in `src/app/` (a 32-bit value from the browser's random source) and saves `createLab(seed, mode)`. Nothing is saved before it, so opening the page leaves Home at "Not started". Before Start the mode is Guided.
- **Restart** asks with the browser's own confirm, in `SHELL_TEXT.restartConfirm`'s words, draws a new seed, keeps the mode, and saves a new run over the old.
- **The list** links each lab that has a page, with its status, and shows a lab whose address is still `/lab` as text with "Planned. Not built yet."

- [x] `routes.test.ts` gains: `/lab/titration` is a lazy route whose loader gives a component; `/lab` still opens the list. `activities.test.ts`: the titration activity's `to` is `/lab/titration`. `src/app/palette/search.test.ts` expects the two labs' addresses as `/lab` and `/lab`; it becomes `/lab/titration` and `/lab`. This is the third sanctioned change to an existing test.
- [x] `src/app/lab/titration/page.test.ts`, with the mocks Task 14 names, the store handed in holding what the case says: the list has one link to `/lab/titration` with its status and the other lab as text with the planned sentence. The page with an empty store shows Start and the primer open, and the store is still empty after the render; with a saved new lab it shows Restart and no Start. (The seed is shown by the notebook panel, Task 20.)
- [x] Record the size of the `index` chunk before and after this task in the task report. The lab's code, the engine and the primer are in a chunk of their own.

As built:

- **The `index` chunk** was 377.12 kB (gzip 122.25) before this task and 379.29 kB (gzip 123.06) after. The lab is a chunk of its own, 71.22 kB (gzip 23.55) then and 123.99 kB (gzip 39.59) with Task 21's page; the primer's text and the engine are in it and not in `index`. The 2.17 kB added to `index` is the list of labs, the route, and `shellText.ts`, which comes whole into the main chunk because the list reads `SHELL_TEXT.planned` from it.
- **This page is the first that saves a titration entry**, at Start and at Restart: a new lab, with version 1, under the counting rule as it now is. `gate-a.md` had said that Task 21 ships the first page that saves (M8, question 8); the reasoning there holds, since no record made under the old counting rule can exist.
- **The mode lock** was wired here, through the engine's `can` and `SHELL_TEXT.modeLocked`, before any trial could be under way on the page; `page.test.ts` holds it on a stored record with an aliquot in the flask.
- **Tests beyond this plan's list:** an address below a lab goes to not-found; the page in a narrow window. A case that the page does not print the seed was added here and changed by Task 21, when the notebook began to show it.

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
- **The field** is a text input with a decimal keypad, named "Initial burette reading (mL)" or "Final burette reading (mL)" as `wanted` says, with a Record button; Enter records. It parses with `parseReading`; a text that does not parse gets `INVALID_ENTRY_TEXT.reading` and `aria-invalid`, and nothing is sent. The reply sits under the field in a `role="status"` paragraph that describes it. With a `blockedText` the field is disabled, keeps the label `wanted` gives it, and shows that text under it, tied by `aria-describedby`. (Changed at the owner's request on 2026-10-06, "Colour roles, entries made and steps done": the field takes `recorded` and, once its reading is recorded, is disabled and shows it, with its button reading "Change" while no `blockedText` holds it; under a field that is held nothing is shown but the reason.)

- [x] `bench.test.ts` (markup): at level 24 370 the view has twelve graduation lines, one numbered "24", and its description is `meniscusText(24370)`; with `running` it has no graduation and says the stopcock is open; the field's label follows `wanted`, with and without a `blockedText`; a `blockedText` gives a disabled input with that text visible and tied to it; the input has `inputMode="decimal"` and is not `type="number"`.
- [ ] **Browser check 1.** The view and the field are rendered in the harness (`.superpowers/tools/phase3-harness/`, started here), with the app's stylesheet and `bench.css`, in Chromium, in both themes. The harness gives the view a box 188 px wide, its measured width on the page at 1366×768 (`integration.md` 1.2):
  - the view is 416 px tall there, and the height comes from `bench.css`'s floor of 26rem, not from the harness; a graduation is one pixel thick; the meniscus band against the liquid under it is at least 3:1 in both themes, measured from a screenshot;
  - "24.3" is refused with the reading sentence; "24.37" is sent as 24 370;
  - **the owner reads three levels to within 0.02 mL.** The implementer picks them (one between 0 and 2 mL, one mid-scale away from a numbered mark, one within 0.02 mL of a graduation) and keeps the true values where the owner cannot see them until the readings are written down. This is the first time a person reads this meniscus.
- [ ] If the owner misses a level, the task stops there. The tolerance is not widened; the view is changed (D11 leaves numbering every mark open) and the check is run again.

As built:

- **Browser check 1 as run.** The two boxes above are left unticked: the owner has not read the three levels. The task was built through, and the reading is part of the owner's one look at the close ("How the phase was run from Task 14"); if the owner misses a level then, the view is changed then. The parts of the check that a script can do were done in the harness, in both themes, and pass (57 of 57, no console error): the view is 188 × 416 px in a 188 px box at 1366×768 and the height comes from `bench.css`; each tenth is one pixel thick and the half two; the band against the liquid under it measured 4.12:1 in the light theme and 5.44:1 in the dark, from a screenshot; "24.3" is refused with the reading sentence and `aria-invalid`; "24.37" is sent as 24 370.
- **`ReadingView.tsx` is not a drawing only.** It also exports `MeniscusWords({ id, levelUl, filled, running })`: a hidden paragraph with that id, which is the view's description, and the closed disclosure "The meniscus in words" with the same text, as the explorer does it. The bench renders it beside `ReadingView` with the id it passes as `describedBy`.
- **`ReadingInput.tsx` also exports `recordReading(text, onReading)`**, the pure rule of a press of Record, so that "does not parse: the reading sentence, invalid, nothing sent" has a node test. On an accepted reading the field is emptied; a refusal or a hold keeps the value. A reply is shown only while `wanted` is what it was when the reply was given. Record with a `blockedText` is `aria-disabled`, focusable and described by the reason, and does nothing when pressed.
- **The drawing.** The meniscus band is at 0.6 opacity (the bench reviewer's correction; the prototype had 0.5). The "Stopcock open" notice is three short lines centred on the tube. The class `bench-reading` is on the `svg` itself, and its height uses `100cqw`, so the column it is in must be a size container. `bench.md` 6.3's caption under the view is not in this task and was not built.
- **Words written here that no one has read:** "The stopcock is open. Close it to read the burette." and "The burette is empty." (the words and the description); in the drawing "Stopcock open. / Close it to read / the burette.", "empty" and "mL"; "The meniscus in words"; "The burette scale at the meniscus, enlarged"; "Initial burette reading (mL)", "Final burette reading (mL)", "Record". All are this plan's or `bench.md`'s wording but the three-line split of the notice and "The burette is empty.", which is `describeStand`'s own sentence.
- **Tests beyond this plan's list:** graduation stroke widths in order; the hidden copy of the words and the closed disclosure; an empty burette; no number with two decimals in the reading view at eight levels; Record tied to the blocked reason and focusable; `recordReading`'s refusals (a comma, one decimal, three decimals, empty, letters, a sign, an exponent), and that a misread is not called invalid.

**Done when:** the markup tests pass, browser check 1 is recorded in `gate-b.md` with the three levels and the three readings, and `npm run build` passes. (As run: the scripted part of the check is recorded in the note above, and no `gate-b.md` was written; the three levels and the three readings are the owner's, at the close.)

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
/** The plume to draw, or null: none while plumeKey is still the key the stand was mounted with, and none under reduced motion. Pure, exported for its test. */
export function plumeToDraw(mountedKey: number, props: Pick<TitrationStandProps, 'plume' | 'plumeKey' | 'plumeFadeSeconds' | 'reducedMotion'>): { status: PlumeStatus; fadeSeconds: number | null } | null
// src/app/lab/titration/apparatus.tsx: Bottle, WashBottle, Pipette, Dropper   (small drawings for the shelf, each aria-hidden)
```

**A plume animates only when `plumeKey` changes after the component is mounted, never on first render** (decided at Gate A, 2026-10-05). The stand keeps the `plumeKey` it was mounted with and draws no plume and no falling drop while `plumeKey` is still that one. A reload gives back the stored last addition (Task 13), and without this rule its plume would be replayed once. The status line still says what that addition did.

The whole burette with a mark at every mL, numbered at the tens; the solution as a column to `standY(level)`; the stopcock's handle across the tube when closed and along it when open, with the word beside it; the tip, with an outlined bubble and the words "air bubble" while there is one; the flask on a white card in both themes, its liquid at a height that follows `volumeUl`, the pink as a layer at `colour.strength`; the plume where the drop lands, one size for every addition, fading over `plumeFadeSeconds.atOnce` when its status is `fades-at-once` and over `plumeFadeSeconds.slowly` when it is `fades-slowly`, staying when it is `persists`, restarted by `plumeKey`; a falling drop. The stand is given nothing about the plume but its status and those two durations: the engine hands the app the status alone (Task 7), so the drawing cannot show how near the endpoint is any more finely than the status line says it. The strength (`colour.strength`), `flask.volumeUl` and `plumeKey` reach the drawing as an opacity, a height and a key that restarts the fade, and are never rendered as text: not in a text node, a `title`, a label, or an `aria-` or `data-` attribute. Each can be worked back to a hidden value or, for `plumeKey`, is the volume delivered (the Global Constraint "No answer leaves the engine"). The clip path's id comes from `useId`. `bench.css`, started in Task 16 with the reading view's height, gains the stand's (the same floor of 26rem) and the two animations.

- [x] `bench.test.ts`: the stand is an `img` named "Burette on its stand over the conical flask" and described by its paragraph; closed and open differ in the handle and in the word; with a tip bubble the words "air bubble" are in the drawing; under `renderToStaticMarkup`, which is a first render, there is no plume element and no drop element, with `reducedMotion` or without, whatever `plume` and `plumeKey` are given (amended at Gate A: before, a plume element was expected here); `plumeToDraw` is null while `plumeKey` is the key at mount and null under `reducedMotion` whatever the key, and once `plumeKey` differs it gives the status with `plumeFadeSeconds.atOnce` for `fades-at-once`, `plumeFadeSeconds.slowly` for `fades-slowly` and no fade for a plume that persists; the flask's fill is `PINK` at the given strength, and `DARK_PINK` when the colour is dark; with a strength of 0.4321, a `volumeUl` of 50 802 and a `plumeKey` of 25 700, no text node of the stand and no `title`, `aria-` or `data-` attribute in it holds "4321", "50802" or "25700".
- [x] In the harness, both themes: the level, the stopcock in both states, the bubble with its words, the flask at each colour name against its white card, and a plume that fades at once, one that fades slowly and one that persists, each drawn after an addition and none drawn when the harness is loaded again on the same state.

As built:

- **A thin line of liquid** runs from the tip to the flask while the stopcock is open (`bench.md` 6.4); it is not drawn under reduced motion. This task's paragraph does not list it.
- **The falling drop** is drawn only together with a plume, for a single addition, and never while the stopcock is open; it ends at opacity 0.
- **The plume's fill** is `colour.fill`, not always `PINK`, so an overshot flask does not get a paler patch on its dark pink.
- **One marked shortcut** (`ponytail:`): the plume's key is the volume delivered in the trial, so a later trial that passes through the exact volume the stand was mounted at draws no plume for that one addition. As Task 21 built the page, each trial has a newly mounted bench and so a newly mounted stand, and within a trial the volume delivered only grows, so on the page the case does not arise.
- **`apparatus.tsx`** has `Bottle({ lines })`, `WashBottle`, `Pipette` and `Dropper`. `Pipette` takes no prop, and there is no waste beaker (`integration.md` section 5). Labels drawn on them: "H₂O", "25", "phenol-/phthalein".
- **The class `bench-stand`** is on the `svg` itself, and its height uses `100cqw`, as the reading view's does.
- **Words written here that no one has read:** "Burette on its stand over the conical flask", "open", "closed", "air bubble", "mL".
- **The harness look as run** (both themes; 51 of 51, and 3 more for a flask named pink; no console error): no plume on a reload and one on the next addition; no plume and no drop under reduced motion, with the same status line; the words under the drawing agree with it in every state tried; nothing readable in the stand holds the flask's volume, the pink's strength or the volume delivered.
- **Tests beyond this plan's list:** the stand's 51 marks and six numbers; the liquid's height rising with volume; no plume from `plumeToDraw` when the status is null; the shelf drawings `aria-hidden`.

**Done when:** the markup tests pass, the browser look is recorded, and `npm run build` passes. (As run: recorded in the note above.)

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

- [x] `bench.test.ts`: the group and the seven buttons in order; an unavailable button is `aria-disabled` and still focusable; "Open stopcock" has `aria-pressed`; with a stream open, that button reads "Close stopcock".
- [x] In the harness, the hook and the buttons alone on the real engine, by keyboard, with the harness printing the delivered volume (the page never does):
  - Enter held for eight key events on "Add drop" adds 50 µL, Space the same; held on the toggle it toggles once;
  - the open stream delivers 250 µL every 0.4 s, closes with the same key on the same button with focus staying put, and delivers nothing afterwards; opened and closed inside one interval it delivers nothing;
  - "Run in 1 mL" delivers 1.00 mL and closes with focus on its button; "Run in 5 mL" delivers 5.00 mL;
  - a hidden tab closes it.

  The rest of the stopcock's behaviour needs the message line, the shelf and a view with `slowDown`. It is browser check 2, at the end of Task 19.

As built:

- **"Swirl and wait 30 s" is unavailable too** while a stream or a pour runs; this task says "the other four". The engine would take a swirl under an open stopcock, and the status line would say what the wait found for 0.4 s.
- **A press on an unavailable button.** Unavailable buttons carry `aria-disabled` set directly, not Base UI's `disabled` with `focusableWhenDisabled` as `bench.md` 9.1 has it, because Base UI swallows the press and a press has to be able to say why. A press on a button the engine has blocked still calls its handler, and the bench gives the reason. While a stream or a pour runs, presses on the other buttons are dropped inside `StopcockControls` and reach no handler, so no drop can be added under a running stream whatever the bench does; they say nothing new (the Global Constraint "Keyboard" gives this as built).
- **The toggle** is as this task has it: `aria-pressed="false"` reading "Open stopcock", `aria-pressed="true"` reading "Close stopcock". A name that changes together with a pressed state can be heard either way through a screen reader. It is left for the owner and the review of Task 23. The two pour buttons change their name only and carry no `aria-pressed`. (Changed at the deep review: no button carries `aria-pressed` now. The stream's button says whether the stopcock is open by its name alone, as the pour buttons do, and `bench.test.ts` holds that.)
- **The hook.** `useStream` closes the stopcock at once when `canDeliver` turns false, through an effect, not at the next tick, so an overshot flask is never drawn under an open stopcock. `open()` does nothing while a stream is open and `close()` nothing while it is closed. `open()` does not ask `canDeliver`: the bench checks before it calls. `closedBySelfAt` is a `performance.now()` time. The Escape and `visibilitychange` listeners exist only while the stopcock is open, and Escape counts as the learner's own close.
- **Layout.** `StopcockControls` lays its buttons out with wrapping only; the column beside the stand is Task 19's. Buttons are the default size, 32 px tall.
- **Names written here that no one has read:** "Stopcock", "Clear the tip", "Add half-drop", "Add drop", "Run in 1 mL", "Run in 5 mL", "Open stopcock", "Close stopcock", "Swirl and wait 30 s".
- **The harness look as run** (45 of 45, no console error), by keyboard: every button reached by Tab in order, the fine controls first; Enter or Space held for eight key events adds one drop or one half-drop, or toggles once; the open stream delivers 250 µL every 0.4 s and closes with the same key on the same button with focus staying put; opened and closed inside 0.4 s it delivers nothing; "Run in 1 mL" and "Run in 5 mL" deliver exactly 1.00 and 5.00 mL and close with focus on their button; Escape closes it with focus on the button, on another button, in a field and on the page body; a hidden tab closes it; unmounting stops it; it closes itself the moment the trial is overshot and when Guided's hint appears, and stays open when opened again under the hint.
- **A note for anyone who measures animation:** under the app's reduced-motion setting `index.css` gives every element a transition of 0.01 ms, so `document.getAnimations()` is not empty just after a change. "No running animation" was counted as no animation longer than 1 ms. The bench adds no transition of its own.
- **Tests beyond this plan's list:** while a stream runs only its own button is usable, for each of the three and for a pour part-way; the closing button stays usable when the engine can take no more; the controls print no number but 1, 5 and 30.

**Done when:** the markup tests pass, the harness look at the hook is recorded in `gate-b.md`, and `npm run build` passes. (As run: recorded in the note above; no `gate-b.md` was written.)

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

- **Five tiles**, each a group named by its heading, in this order: hydrochloric acid (the label repeated as text, "Hazards"); sodium hydroxide ("Condition burette", "Fill burette" or "Refill burette", "Hazards"); pipette ("Rinse pipette with HCl", "Pipette HCl into flask"); phenolphthalein ("Add 1 drop of indicator", the count as text, "Hazards"); distilled water ("Rinse down flask", the count as text). A finished step is marked by a tick and words. The bench holds no engine state. (Changed at the owner's request on 2026-10-06, "Colour roles, entries made and steps done": a step done is no longer a line over its button. The four step buttons read "Burette conditioned", "Burette filled. Refill", "Pipette wet with HCl" and "HCl is in the flask" once each is done, with the tick inside the button.)
- **Under the stopcock**, in this order: the status line (`role="status"`), the slow-down line while `view.slowDown`, the message line (`role="status"`), then the `notice` slot. The message line says what the last action did when `onAction` answered `done` (from `ACTION_TEXT`, `additionMessage`, `streamMessage` or `swirlText`), and the same for an action the page hands back in `confirmed`. After a wash, a drop or a half-drop it adds `undoneText` of the views before and after the action, which is empty unless a pink that had lasted the wait was undone and the trial is still open (Gate A). When the answer was `asked` it says nothing new: the warning in the notice slot has the learner's attention. When a control that cannot be used is pressed, or the answer was `refused`, it gives the reason through `blockedText`. When the trial ends as ran-out it shows the ran-out sentence (`OUTCOME_TEXT['ran-out']`), or, when the action that ended it was a wash of water, the sentence for that (`OUTCOME_TEXT['washed-out']`; the last check of Gate A). The notice slot holds only Guided warnings. (Changed at the deep review. A sentence the line already shows is said with "Again:" before it, and plainly the time after (`saidAgain` in `benchText.ts`), so that no press leaves the live region unchanged. When the answer was `asked` the line is cleared. It is cleared as well when a reading is recorded under it and when the notebook accepts an entry, discards the flask or checks the trial, which the page tells the bench by a count, `notebookDone`. The stream's two open sentences say that Escape closes the stopcock too.)
- **The stream.** `TitrationBench` owns `useStream(view.controls.deliver === null, deliver, view.slowDown)` and gives its `stream` to `StopcockControls`, to `TitrationStand` (as `stopcockOpen`) and to `ReadingView` (as `running`). It gives the stand `plumeFadeSeconds` from `display`. Within 600 ms of `closedBySelfAt` a press on a stream button does nothing and the message line says `STOPCOCK_ALREADY_CLOSED`.
- **Layout**, by container query on the bench's own width: below 54rem the shelf runs across the top and the stand and reading view sit side by side under it; from 54rem three columns, the shelf one tile across with wrapping buttons. DOM order is shelf, stand, reading at every width. A button is at least 32 px tall.
- **Between trials** the ended trial's flask stays with its outcome until the notebook's "Start the next trial"; after completion the last flask stays and every control gives its reason.

- [x] `bench.test.ts`: five tiles in order with their headings; three "Hazards" disclosures, one of them in the indicator's tile; the HCl tile shows the label as text; a control whose `controls` entry is not null is `aria-disabled` and focusable; the three lines and the notice slot in order; no bench element holds a number with two decimals; the bench renders with `reducedMotion` as a prop and no mock of the app's state.
- [x] In the harness, both themes, by keyboard: every prep action of spec 7.2 can be done; each says its result in the message line; an unavailable button keeps focus and says its reason; the three hazards open with their sources; the Tab order is shelf, stopcock, reading.
- [x] **Browser check 2**, the whole bench in the harness on the real engine, by keyboard alone:
  - Escape closes a running stream with focus on the shelf, in the reading field and on the page body;
  - a press within 600 ms of an automatic close delivers nothing and the message line says the stopcock is already closed;
  - in Guided a running stream closes at the hint with 0.75 to 1.00 mL to go, and can be opened again; in Challenge nothing closes it;
  - the stream closes as soon as the trial is overshot and at the 50 mL mark; the reading view shows no scale while it runs;
  - repeated presses of "Add drop" change the message line each time;
  - with reduced motion on: no plume element, no drop element, no running animation, and the status line reads the same.
- [ ] The owner looks at the stream's speed, at the cue, and at the two fades of the plume, 0.5 s and 3 s to start with (D8). A value they change is a parameter or `STREAM_INTERVAL_MS`, with the tests that pin it.

As built:

- **Where the checks were run.** The second and third boxes above are ticked for checks run on the real page, not in the harness: the page was whole within the same stage. They were run on the development server and on the production build, in both themes, by keyboard alone, and no `gate-b.md` was written; the results are in the "As run" note at the head of Gate B. The fourth box is the owner's and is unticked: it is part of the one look at the close.
- **`TitrationBenchProps`** differs from the sketch in two places. `confirmed` also accepts the `recordInitialReading` action, so that after "Record the reading anyway" the message line says "Recorded 2.04 mL as the initial reading."; otherwise nothing tells a learner who cannot see the notebook that it was recorded. And it takes a `ref`, because the page moves focus to the bench when a new trial starts.
- **Layout.** The stopcock's buttons sit under the stand while the bench is narrower than 54rem, and in a 9rem column beside it from there. With the column at every width the stand was 97 × 206 px at 768×1024, under the 416 px this plan asks for.
- **"No bench element holds a number with two decimals"** has two exceptions, which the test sets apart: the indicator's stored hazard note holds "0.56%", and the pipette tile's heading names its 25.00 mL.
- **The reading field** is remounted after every bench action that was done, so a reply such as "Recorded ... initial reading" cannot outlive a fill that cleared the reading; a reading typed and not yet recorded is emptied by any bench action. An action the learner goes on with after a warning resets the field's reply too, except a reading, so that focus can return to the same field. (Corrected at the deep review: opening the stopcock did not remount the field, because a stream's additions go to the page without passing through the bench's `act`, so "Recorded ... as the final reading." outlived a final reading that a pour had cleared. An opening of the stopcock is now counted as an action.)
- **The hint and the undone message** are both drawn when both apply (`gate-a.md`, M6, left this to this task).
- **`ACTION_TEXT.swirlAndWait`** is still in the table and is shown by no caller; the bench says `swirlText` in its place (`gate-a.md`, N13). Left for Task 23.
- **The bench** has a visually hidden `h2`, "Bench".
- **Words written here that no one has read** (`Shelf.tsx` and the names of regions): "Label: HCl, 0.0976 M. Standardized.", "Burette conditioned.", "Burette filled.", "Pipette wet with HCl.", "HCl is in the flask.", "Drops in the flask: n", "Rinses of this flask: n"; "Bench", "Reagents and glassware", "Burette and flask", "Burette reading", "Text description of the burette and flask". The sodium hydroxide bottle's drawn label reads "NaOH" with no strength.

**Done when:** the markup tests pass, the browser look and browser check 2 are recorded line by line in `gate-b.md`, and `npm run build` passes. (As run: recorded at the head of Gate B; no `gate-b.md` was written.)

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
export function TrialRecord(props: { m: TitrationModel; state: TitrationState }): ReactElement   // across the page; read-only (from 2026-10-06, on the Record tab)
// src/app/lab/titration/Guide.tsx
export function Guide(props: { steps: { step: Step; state: 'done' | 'next' | 'todo' | 'skipped' }[]; trialIndex: number }): ReactElement   // draws both forms; lab.css shows one
```

- **The panel**, top to bottom: the seed and the tally (trials finished, and how many of the three needed count); the HCl molarity field; the two readings and the titre, read-only; the worked lines, in Guided, once both readings are in; the NaOH molarity field with Check, open once there is a final reading; "Discard this flask" while the trial is open; the last result (`outcomeLabel`, then `feedback`), in a block that can take focus; "Start the next trial" once the trial has ended; and the part across trials: the waiting line, then on completion the completion line with the true molarity and the two-field form, then the notebook's own two values (`molarityText`, `deviationText`) beside the learner's (`molarityText`, `deviationE2Text`) with the explanation. Nothing there is marked right or wrong.
- **The record** is one table with a caption, six column headers (Trial, Initial reading (mL), Final reading (mL), Titre (mL), NaOH molarity (M), Result), a row header for each trial, and each ended trial's feedback under its row. The HCl molarity is shown once, above the table. A value not yet there is a dash. On a small screen the table scrolls inside its own focusable box.
- **Fields.** Each is its own form with a visible label tied to its input and a decimal keypad; Enter submits; an error is a `role="alert"` tied to the field, with `aria-invalid`. The panel parses, as `ReadingInput` does: `parseMolarity` for the two molarities and the average, `parseDeviation` for the deviation. A text that does not parse gets its `INVALID_ENTRY_TEXT` and nothing is sent; what is sent is the whole number. A refusal from the page comes back as the reply's text. A field that cannot be used yet is disabled, with its reason from `blockedText` visible and tied to it. (Changed at the owner's request on 2026-10-06, "Colour roles, entries made and steps done": a field whose entry is made is disabled too and shows the entry, with "Change" where the engine would take it again; a field that is disabled shows no refusal and carries no `aria-invalid`.)
- **Where they are, from 2026-10-06.** The panel and the guide are on the page's Lab tab with the bench, and the record is on the Record tab ("The page in tabs"). Nothing in the three components changed.
- **The guide** draws both of its forms, and `lab.css` shows one of them by the page's container query: the one line below 110rem, the list from there, the other `display: none`, so assistive technology meets one form. This task adds those two rules to `lab.css`, beside Task 14's rule that makes the guide a column. The layout is the stylesheet's choice, so the component takes no layout prop. As a list: each step as a mark hidden from assistive technology, its label (`first` or `later` by trial), and its state in words; one step `aria-current="step"`. As one line: "Step *n* of *total*, next: *label*". For a trial that has ended the checklist has no `next` step: no item is `aria-current`, and the line, and a sentence above the list, are `GUIDE_TRIAL_OVER`.
- No trial is labelled with a mode, anywhere (D7).

- [x] `src/app/lab/titration/page.test.ts` (markup; the panel, the record and the guide take everything as props, so these cases need no mock), on states built with the test kit. The scenario: seed 1, Challenge; trial 1 with the burette not conditioned, the bubble cleared, the pipette rinsed and honest readings; trial 2 refilled, its initial reading recorded, and streamed to overshoot; trial 3 after conditioning, filling and clearing the new bubble, with its initial reading recorded.
  - The record has the six headers and three row headers. Row 1: "2.56", "28.79", "26.23", "0.0930", "Not passed, −2.13%", with the unconditioned-burette sentence under it. Row 2: "0.56", three dashes, "Invalid: overshot". Row 3: "2.04", three dashes, "In progress". "0.0976" appears once above the table. The record has no `input`, `button`, `select` or `textarea`.
  - The panel in that state has two labelled fields ("HCl molarity, from the bottle label (M)" and "Your NaOH molarity (M)"), the second disabled and tied to its reason; the readings and titre as text; "Discard this flask"; no "Start the next trial"; and the seed, as "Seed 1".
  - After trial 2 ends and before the next is started: the last result block holds "Invalid: overshot", and "Start the next trial" is present.
  - Guided at the endpoint with both readings: the worked lines, holding no molarity the learner did not type; Challenge has none.
  - A pass that does not count (the 28.29 trial of Task 6): its row reads "Passed, not counted", its feedback has the does-not-count sentence, there is no percent error (Task 11's pattern) in the row or under it, and the tally still reads none of three.
  - Completion (three careful trials): the three rows still read "Passed" with no percent error (Task 11's pattern), though their outcomes now carry one; the completion line with "0.09502"; before the learner's two values are entered, the form and no notebook value; after `recordSummary` with 0.0949 and 0.47, "0.0949" and "0.4" beside "0.0949" and "0.47", and no word of right or wrong.
  - The true molarity appears in no state before completion.
  - The guide for a burette filled unconditioned with the label recorded: eleven items; one `aria-current="step"`; the first four read Done, Skipped, Done, Next with their labels. In trial 2: "Refill the burette with NaOH" and "Pipette 25.00 mL of HCl into a clean flask". As a line: "Step 4 of 11, next: Clear the air bubble from the burette tip". Both forms are in the markup of one render. For the overshot trial 2 of the scenario, before the next is started: no `aria-current`, and `GUIDE_TRIAL_OVER` in both forms.

As built, where this task leaves a choice open:

- The last result stays in the panel while the next trial is run, headed "Result of trial N: ...".
- The summary form stays after both values are entered, so they can be entered again, and the comparison appears under it in a `role="status"` block. (From 2026-10-06 its two fields are then disabled and show the two values, and its button reads "Change".)
- Every refusal of a notebook entry sets `aria-invalid`, a wrong label and a molarity that does not follow included; the bench's reading field sets it only for a text that does not parse.
- "Discard this flask" asks for no confirmation. Restart asks.
- The worked lines show only while the trial is open and the HCl molarity is recorded.
- (Corrected at the deep review.) Under the heading of a trial that has been checked, "HCl molarity (M)" is the molarity that trial was calculated with (`hclUsedE6`), not the one in the notebook now: the two differ once a miscopied label is put right between trials, and the panel then stated a figure the trial's own feedback contradicted.
- Record and Check on a field that cannot be used yet are `aria-disabled`, described by the reason, and do nothing when pressed.
- The read-only record holds the table and the HCl molarity only, as this task lists. So the narrow page of a completed lab shows three rows reading "Passed" and no completion line or true molarity; those are in the docked panel, which the narrow page does not show. (From 2026-10-06 that is true of the Record tab at every width: the completion line and the true molarity are on the Lab tab, in the notebook.)
- The notebook's and the guide's labels are in `messages.ts`, so that the existing tests of every sentence read them. `vite.config.ts` lets a test read `lab.css` as text, for the rule that displays one form of the guide.
- **Words written here that no one has read:** "Notebook", "Record", "HCl molarity (M)", "Work it out", "Record of this run", "Every trial of this run: what you recorded, and how it ended.", "HCl molarity in the notebook (M)", "Seed N", "Trials finished: 2. Trials that count: 0 of the 3 needed.", "Trial N", "Result of trial N: ...", "Steps of trial N", "Guided checklist", "Recorded 0.0976 M as the HCl molarity.", "Recorded 2.04 mL as the initial reading."

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

The page, in full: the model once at module scope (`modelFrom(titrationData)`); the state from `useLabProgress`; one `dispatch` that reduces and saves whenever the state object changed, stream additions and trials ended by the engine included; every bench action and every entry through `decide`. A Guided warning is drawn in the bench's `notice` slot as a named group that takes focus, lists every warning the action raised (each one's `WARNING_TEXT` title and body), and has one way back and one way on (`WARNING_BUTTONS`, by the action's type); on either, focus returns to the control that raised it. The page answers the bench's `onAction` with `done`, `asked` or `refused` as `decide` says, and answers a reading that is held for a warning with `{ accepted: false, text: '' }`. When the learner goes on, the page does the action and, for a bench action, hands it to the bench as `confirmed` until the next action. A refused entry puts its sentence, from `blockedText`, under its field. The page gives the bench `reducedMotion` from `useAppState`. After a trial ends, focus moves to the last result. The mode switch is locked with `SHELL_TEXT.modeLocked` while `can(setMode)` says `trial-open`. The primer's foot lists `titrationCitations`. The narrow page gives the shell the read-only record, the trial under way included. (From 2026-10-06 the page gives the shell the record at every width, for the Record tab, hands the primer the four topics to mark "Read first", and gives the bench as a function of whether the Lab tab is shown.) If the stored record does not load, the lab is not started, as storage already decides. **The page loads its entry once per session and never saves before loading** (carried from Gate A): loading is what sets a record that does not fit aside under a backup key, storage holds a save back only for an entry that a load could not back up (spec 10), and Home is right about such a record only once the page has loaded it. A save made before the load would write over the old value unseen; a second load in the session would find the page's own saves and tell nothing.

- [x] A test with a store that counts its calls holds the page to this: the entry is read exactly once and nothing is written before that read; the first write comes on Start or on an action; a second render and a change of mode read nothing more. If the hook cannot be run in the node environment, the test is of `labProgress` (Task 14) as the page calls it, and the task's report says so.
- [x] `controller.test.ts`, on `modelFrom(titrationData)`, seed 1: Challenge, new lab, `fillBurette`: `do`. Guided, the same: `ask` with `burette-not-conditioned`; confirmed: `do`. Guided, `pipetteAliquot` unrinsed: `ask` with `pipette-not-rinsed`. Guided, a burette filled unconditioned with its bubble, an honest `recordInitialReading`: `ask` with both warnings, burette first; confirmed: `do`. Guided, a reading 30 µL off: `refuse` with `reread`, confirmed or not. Either mode, `deliver` on a new lab: `refuse` with `burette-empty`. Challenge never asks. `readingAction` gives the initial or the final action as `readingWanted` says, and null while `readingBlocked` is not null.
- [x] `src/app/lab/titration/page.test.ts` gains, with the mocks Task 14 names and the store handed in holding the saved run: the narrow page with a run shows the notice, the primer and the record with the trial under way, and has no bench and no field; the wide page with a run has the four slots filled; the primer's foot has the model's Sources. (Rewritten 2026-10-06 for the tabs, with cases added for which tab opens with no run, a run in progress and a completed run, and for the two panels not shown being hidden and inert.)
- [x] In the running app: one whole Guided trial and one whole Challenge trial, start to result, before Gate B is called.

As built:

- **The first box is met by its fallback.** The hook does not run in the node environment. `page.test.ts` holds a mount of the page (nothing stored, a run stored, narrow) to exactly one read and no write, on a store that logs its calls, and holds `labProgress` to one write and no read for each save. That a second render and a change of mode read nothing more is not held by a committed test: it was checked in the browser (the entry is read once for each load of the page, nothing is written before Start, each action that changes the record writes once, and a refused action writes nothing).
- **Three of Task 15's cases in `page.test.ts` were changed**, because the page now has a bench and a notebook: "does not print the seed, which the notebook shows" became "prints the seed once, in the notebook"; and the two mode-lock cases now count disabled radio inputs only, since the reading field and the molarity field are disabled inputs too. This plan had named no sanctioned change for this task.
- **`confirmed`.** A reading recorded after a warning is handed back to the bench as well as a bench action (Task 19's note).
- **A new bench for each trial.** The page gives the bench a key of the seed and the number of trials, so each trial has a newly mounted bench: stopcock closed, message line empty, no plume. The cost is that "The meniscus in words" and any open Hazards disclosure close again at each new trial. The notebook panel is keyed by the seed and its NaOH molarity form by the trial, so a refusal said of one trial is not shown under the next. (From the deep review, both keys also hold the count of records taken from another tab, below.)
- **Two tabs, and a record set aside** (added at the deep review). `useLabProgress` listens for the browser's `storage` event on the lab's key and takes the record another tab has saved, or "not started" where the entry was removed; it reads the event's value and writes nothing. A value this version cannot read is left where it is and the tab keeps its own. The page then drops a held warning and makes the bench and the notebook anew, so an open stopcock is closed. The mount is still the page's one read of the store. When that read sets a record aside (another version, or unreadable), `storage.ts` remembers it for the session and the shell says in a `role="status"` paragraph that a saved run was kept and that the export includes it, until a new run is saved.
- **Focus.** "Start the next trial" removes its own button, and focus moves to the bench section. Focus moves to the last result however a trial ends, so on an overshoot or at the 50 mL mark it leaves the stopcock button the learner was on. Start still puts focus on the page heading. (From 2026-10-06 Start puts focus on the Lab tab's panel. The other moves are as they were, and all of them are inside the Lab tab.)
- **A change of mode** goes through the same decide-and-save path as every other action, so it also drops a Guided warning that is showing.
- **A Guided warning** is a `role="group"` named by its warnings' titles and described by their bodies; the titles are paragraphs, not headings.
- **After "Record the reading anyway"** the field keeps the typed value, and the confirmation is in the message line, not under the field.
- **Files outside this task's list:** `vite.config.ts` (Task 20's note) and `src/app/lab/Primer.tsx`, which now exports `Subscripted`.

**Done when:** the tests pass, `npm run build` passes, and the page is whole enough for Gate B to begin.

### Gate B: browser checks on the whole page

The hand checklist of spec 13, in the running app, in Chromium, in both themes unless a line says otherwise. Keyboard only where it says so. Any script used is throwaway and stays out of the repository. Each block's heading says who runs it. *By script*: a throwaway script drives the browser and its output is kept with the line. *By hand*: a person at the keyboard; nothing in such a block is ticked from a script's output. *The owner*: the owner, in person. Each line is recorded in `docs/research/phase-3/gate-b.md` as done, or with a note that says what was found. Findings are fixed in one wave and the lines they touch are run again.

**As run.** Gate B was not held as a stop, and no `gate-b.md` was written ("How the phase was run from Task 14"). No box below is ticked: nobody ran the blocks marked "By hand" by hand, and this plan lets no such line be ticked from a script's output. What was done in their place is recorded here, so that Task 23 can put a note against each line.

Throwaway scripts drove the real page in Chromium 153, by keyboard alone (Tab, Shift+Tab, Enter, Space, the arrow keys, Escape and typing; no pointer, and focus never set by the script), with no console error or warning in any run. They were run when Task 21 was built, on the development server and on the production build, and again on the production build when Task 22's documents were written, with the same results:

- **A whole lab** (133 checks, light and dark): one complete Guided lab, with three trials that count, every reading taken from "The meniscus in words" alone, and the summary entered; and one Challenge trial with an unconditioned burette, failed with its percent error and its cause. Within it: each warning takes focus, both of its buttons work and focus returns to the control that raised it; an action that raises two warnings shows both; the stopcock stays shut without indicator and says why; the final reading is refused before the wait, with its reason; every bench control of an ended trial and of a completed lab gives its reason; a discarded flask; Home says Completed; a reload before the titration and one with the stream still running, each leaving the stored record byte for byte as it was, the stopcock closed and no plume or drop drawn.
- **Checks of the page** (44 checks, light and dark): the Tab order is shelf, stopcock, reading; the three hazards open with their headings, notes and sources, the acid's first two statements with their paired codes; an overshoot and the 50 mL mark each close the stream and end the trial, with focus on the result, and an overshot trial survives a reload; a second trial without a refill is allowed; a trial started at the mark can be filled; the 767 px page; narrowing the window during a stream stops delivery; the ten window sizes of the "Sizes" block, with no sideways scroll, no button past its tile or under 32 px, and both drawings at least 416 px tall; one form of the guide displayed at 1366 and at 2523 px; a warning wholly in view once it has focus; reduced motion (no plume, no drop, no animation longer than 1 ms, the same status line).
- **Going on after each of the three warnings** (7 checks), and **reading and writing the entry** (6 checks: read once for each load, nothing written before Start, one write for each action that changes the record, none for a refused action).
- **Names** (8 checks, run with Task 22): every button, link, field, disclosure, group and table on the lab's page has a text name, before Start, with the bench shown and with a warning showing; both drawings are images with a name and a description.
- **Earlier, on the built app with Task 14's shell** (58 checks): Home, the list of labs and the command palette; Start and Restart; the not-saving notice with writes refused; an entry that does not fit.

Not exercised on the real page, only by unit tests or in the harness of Tasks 16 to 18: the ending in which a rinse thins the pink away at the last mark, and the "wait no longer counts" addition to the message line; a stream opened again under Guided's hint; a hidden tab closing the stream. Not exercised at all: the lines of the "Reload" block for the endpoint before the wait, a failed trial, a discarded flask and completion; Export and Clear in the "Storage" block, and the notice on Settings after a theme change; 200% zoom as zoom (the 767 px page stands for it); touch; a screen reader. The block headed "The owner" is the owner's look at the close, below.

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
- [ ] A trial run to the 50 mL mark ends with the ran-out sentence. One at the mark that is washed down until the pink goes ends too (D5), with the sentence that says the rinse thinned the pink away. A trial started with the burette still at the mark does not end there: it can be filled and titrated.
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
- [ ] After each reload no plume and no falling drop is drawn until the next addition, and the status line still gives the last addition's cue.

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

- [ ] Every bottle's hazards open, each with its heading, its note and the note's source; the HCl bottle's heading does not say pure substance, and says concentrated hydrochloric acid and its strength; the other two say solid sodium hydroxide and solid phenolphthalein, the pure substance. Every statement shows whole, the acid's first two with their paired codes.
- [ ] The primer's Sources, and the model's Sources at its foot, list what the cards and the constants cite.

**The owner**, in the running app:

- [ ] reads three meniscus levels on the whole page, to within 0.02 mL, at 1366×768 and on their own wide screen (D11);
- [ ] judges the stream's speed, whether the cue comes in time to act on, and whether a plume that fades at once and one that fades slowly can be told apart (D8);
- [ ] judges the pink at a careful endpoint and at an overshoot, in both themes, and whether the flask is big enough to judge it in (D12);
- [ ] judges the wide layout and the layout at 1366×768: where the notebook, the record and the checklist sit (D10);
- [ ] judges whether the burette warning, repeated in Guided at the initial reading of a burette filled dilute, is wanted or is one warning too many. If it goes, it goes from spec 7.2, from Task 6's warnings and from Task 21's controller test together.
- [ ] A value the owner changes is changed where it is stored (a parameter with its rationale, a drawing constant, a layout threshold), with the tests that pin it, and the lines it touches are run again.

**Done when:** every line is ticked or carries a note in `gate-b.md`, and the fixes pass `npm run build`.

### The owner's look at the close

In place of the owner's part of browser check 1, the owner's item of browser check 2 and the block above headed "The owner" ("How the phase was run from Task 14"). The lab is at `#/lab/titration` in the running app. The first five items are that block's; the rest are what the three stages asked the owner to judge. A value the owner changes is changed where it is stored, with the tests that pin it.

- [ ] Three meniscus levels read to within 0.02 mL, at 1366×768 and on the owner's own wide screen (D11), with the true values kept from the owner until the readings are written down. If a level is missed, the tolerance is not widened: the view is changed. With it, the depth of the drawn band, 0.08 mL of scale (`gate-a.md`, question 3), and whether the "Stopcock open" notice in the view is large enough.
- [ ] The stream's speed (0.25 mL every 0.4 s), whether the cue comes in time to act on, and whether a plume that fades at once (0.5 s) and one that fades slowly (3 s) can be told apart (D8). Whether the 600 ms in which a press after an automatic close is dropped gets in the way of someone chaining pours.
- [ ] The pink at a careful endpoint and at an overshoot, in both themes, and whether the flask is big enough to judge it in (D12). At the endpoint the plume stays as a deeper patch on the faint pink flask until the swirl.
- [ ] The wide layout and the layout at 1366×768: where the checklist, the bench and the notebook sit on the Lab tab (D10); the record is on the Record tab from 2026-10-06. Between 768 and about 1120 px with the menu open the stopcock's buttons wrap under the stand; whether the stand, its buttons and the status line still read as one group there.
- [ ] Whether the burette warning, repeated in Guided at the initial reading of a burette filled dilute, is wanted or is one warning too many. If it goes, it goes from spec 7.2, from Task 6's warnings and from Task 21's controller test together.
- [ ] Before Start: the mode choice and Start above the tabs. (The owner looked on a tablet on 2026-10-06 and found the twelve open cards about seven screens long, and the started page nearly three; the page was put into tabs for that, and this item is now the next one.) The list of labs at `#/lab`.
- [ ] From 2026-10-06, the page in tabs ("The page in tabs", after the deep review), on a tablet and on a wide screen: the three tabs and their bar, which stays at the top of the window; the primer one topic at a time, with its list of topics beside the card or behind the "Topics" button, "Topic 7 of 12", the "Read first" marks and the Previous and Next buttons; the labels at the head of each paragraph, the bold terms and the sentences set off by a rule, read as a learner would; the Lab tab before Start; after Start, from the Primer tab and from the Lab tab, focus on the Lab panel with the tab bar at the top of the window and the checklist's line and the shelf under it; the sentence the bench shows after a visit to another tab closed an open stopcock, and the bench back where it was left.
- [ ] The Hazards disclosure of each bottle: "Signal word: Danger" stands above the heading that says whose hazards these are. Read cold, "Danger" could be taken for the solution on the bench, and the sodium hydroxide's own sheet at this strength gives Warning. Moving the signal word under the heading is one line in `src/app/lab/Hazards.tsx`. **Done at the deep review**, which rated it a finding: the signal word is under the heading now. What is left for the owner is whether it reads well there.
- [ ] A Guided warning: whether it is noticeable enough under the message line, and the wording of its two buttons. After "Record the reading anyway" the confirmation is in the message line and the typed value stays in the field; whether it should be under the field, with the field emptied.
- [ ] The stream's button is announced as "Open stopcock, not pressed" and, while it runs, "Close stopcock, pressed", which can be heard as "the stopcock is closed". Whether to keep it, to change the name and drop the pressed state, or to keep one name and change only the state. One line in `src/app/lab/titration/StopcockControls.tsx`. **Done at the deep review**, which rated it a finding: the name changes and there is no pressed state. The owner can take it back.
- [ ] When a trial ends by itself (an overshoot, the last mark), focus jumps from the stopcock button to the result in the notebook; whether it should stay on the bench. "Start the next trial" moves focus to the bench and closes "The meniscus in words" and any open Hazards again; whether a learner who reads by the words should have to open it once in each trial (the bench's key in `TitrationPage.tsx`).
- [ ] "Discard this flask" acts at once; whether it should ask first, as Restart does.
- [ ] A completed lab: the completion line with the true molarity, the two-field form, and the notebook's values beside the learner's; the tally line and the result heading, read as a learner would. In a window under 768 px the record of a completed lab says neither that the lab is complete nor the true molarity; whether the record should carry the completion line.
- [ ] The record, on the Record tab from 2026-10-06: a failed trial's feedback under its row, the dash for a value not yet there, the table's width.
- [ ] The words listed in the "As built" notes of Tasks 14 to 21 as read by no one, read once as a learner would.
- [ ] From the deep review (`docs/research/phase-3/deep-review.md`, "For the owner"): the word "Again:" before a sentence the message line already shows; the sentence shown when a saved run was set aside; whether a stream should close when focus leaves its button; a second tab following the first without a word; Home's planned lab and mechanism as text, not links; and the review's notes that are matters of taste.

### Task 22: Documents

Read: spec 12; `shell.md` section 8 (drafts, several of them superseded); `integration.md` G12 and G13; `gate-a.md` and `gate-b.md`; `docs/for-institutions.md` as it stands.

- [x] **Opening paragraph and "What exists":** the titration lab is built.
- [x] **IT and security, Storage:** the titration lab stores one entry: the seed, the mode, what the learner did and typed, and the learner's two summary values. Results are worked out on reading and are not stored. It holds nothing that identifies the learner. The export file holds the seed, from which the hidden values follow.
- [x] **Faculty and curriculum, "The titration lab"**, written against the engine as built. It states: what the lab teaches and the primer's cards; how a run is seeded; the two modes, and that the mode changes only between trials; that readings are typed to two decimal places and molarities to four; the arithmetic check (the molarity must be the notebook's value correctly rounded), what it accepts at an exact tie (Q1's answer), and that it gives nothing away; grading at ±1.0% with the edge included; that three trials must count, and what makes one count; **the percent error, in D1's terms and no more**: a failed trial's percent error lets a learner work out the true molarity, and a trial counts only when both readings are within 0.02 mL of the meniscus, the HCl molarity is the label's and no technique error is named in it, so a result reached by typing a reading the burette does not show is marked passed and not counted, and so is one that is close only because two mistakes cancelled or because part of a bubble is small; each technique error's size (2.0%, 0.60 mL, 2.0%) beside the statement that these are larger than at a real bench and are parameters, not measurements; the rules that are not true to a bench, each said to be so: a dilute burette stays dilute through refills by design and a real one does not (D3), the 0.60 mL tip bubble is more air than a burette's tip holds and it escapes evenly over the first 5 mL where a real one leaves at once, and every technique error is larger than a bench gives; that a wet pipette spoils one aliquot and an escaped bubble does not return; that relative deviation is shown and not marked, and that molarities are typed to four decimal places, and one unit in the fourth place is about one part per thousand of the result, so the relative deviation of three careful trials can take only a few values and reflects rounding as much as technique (nothing here about the label or significant figures); what is not modelled (CO₂ taken up from the air during a trial, the fading of the pink in strong base, activity corrections, temperature, the ethanol in the indicator, parallax); the conventions chosen (standardized HCl as the known solution; four decimal places, not a significant-figure rule); that counting additions gives the titre; and whether a chemistry instructor has reviewed the lab.
- [x] **Where the chemistry comes from:** one row per constant, from the record, and in the indicator's row what is assumed: that this lab's bottle is the kind of solution the listing describes, whose basis the listing prints.
- [x] **Lab safety** (spec 12): a supplement and not a replacement; what each bottle's hazard information classifies, which in the titration lab is the concentrated or the pure substance as one supplier's safety data sheets give it (concentrated hydrochloric acid, and sodium hydroxide and phenolphthalein as solids); that the sheets are cited and not kept, so the build checks the record against the list of what each sheet prints and not against the sheets; what each note rests on and that it has its own source or sources; what is not covered. No word on who buys from the supplier, and no compliance claim.
- [x] **Accessibility:** what Gate B checked and found, and what was not checked: no screen reader unless one was run; no person but the owner has read the meniscus; Chromium only; no touch device unless one was used; the bench is not shown below 768 CSS pixels, which includes 200% zoom on a 1366-pixel screen (D14).
- [x] **The About page's prose and `README.md`:** the lab's sources and acknowledgments.
- [x] Nothing added quotes a source, and nothing added says what OpenStax's licence is. The existing sentence about OpenStax in this file is left as it is for the separate task (see the last section).
- [ ] The owner reads the Faculty and curriculum text and the Lab safety text, as they read the primer at Gate A, and changes what they would not say to a colleague. A check against the build cannot tell whether a sentence about chemistry or safety is one a lab would stand behind.

As built:

- **What the Accessibility text reports** is what the scripts of Tasks 14 to 21 found, since Gate B was not held as a stop and nobody ran its by-hand blocks ("As run", at the head of Gate B). It says who checked: the AI coding assistant that built the lab, by script, with no person taking part. It says that no screen reader was used; that no person's reading of the drawn meniscus is on record, the owner's included, because the owner's look comes after this task; that the lab was run in Chromium only, with no touch device and none emulated; and that the bench is not shown below 768 CSS pixels. When the owner has read the three levels, the sentence on the meniscus is brought up to that.
- **What the Faculty and Lab safety text says was and was not reviewed:** no chemistry instructor and no chemist has reviewed the lab; the reviews of Gate A were by AI reviewers; the owner read and approved the primer and the hazard notes as they stood before the bottles' statements moved to the supplier's sheets; the hazard data rests on safety data sheets that are cited and not kept, so the build cannot check it against them again; and the no-quotation test runs only where its fingerprint has been made. Two statements about a real bench that this task lists to be stated (that a real burette's tip holds less air than this lab's bubble, and that a real bubble leaves at once) are given as the project's own, with the sentence that no source was read for either, as `gate-a.md` records.
- **Added beyond this task's list:** in IT and security, the lab among the parts fetched when first needed, the backup key of an entry that cannot be read, and the not-saving notice; in Legal and privacy, the four copies the repository keeps of the lab's sources and the no-quotation rule with the limit of its test; a list of how the lab was checked and of its known limits; and in the Accessibility text the lab's known limits as built (a stopcock button under a running stream, the toggle's changing name, focus when a trial ends by itself, the disclosures that close at each trial, Discard without a confirmation, the narrow record of a completed lab).
- **The About page** has one new paragraph, naming the publishers of the lab's constants, of the safety data sheets and of the primer's sources, saying that none is connected with Valence or has reviewed it, and that at a real bench the safety data sheet of the product in hand and the laboratory's own rules are followed. Its list of sources already showed the lab's, since it lists all of `sources.json`. `Settings.tsx` was not changed. The paragraph adds 1.08 kB to the `index` chunk, which is 380.37 kB (gzip 123.49) with it; the lab's own chunk is unchanged.
- **`README.md`:** the status (phases 1 to 3 built, with what has not been reviewed or tested), links to the lab's research record, the lab's sources, and `build:data`'s third input.
- **Checked against the build:** every sentence added was read against the code, the record and the gate's findings, and the scripts named at the head of Gate B were run again on the production build that holds the About page's paragraph. That is a check by the one who wrote the sentences, not by a second reviewer who runs the lab while reading them, which the "Done when" below asks for; it is left to Task 23's review. The last box is the owner's and is unticked.
- **Brought up to what was built with this task:** this plan (the notes headed "As built" and "As run", "How the phase was run from Task 14" and "The owner's look at the close"), spec sections 7.2, 7.5, 11 and 13, and `gate-a.md` (its head, the notes marked "As built" in it, and its last section, "After the gate: the screens were built").

**Done when:** every sentence added has been checked against the build it describes, by a reviewer who runs the lab while reading it; the owner has read the Faculty and Lab safety text; `npm run build` passes.

### Task 23: Close

- [ ] Spec 7.4's thirteen checks pass in CI on the pull request. CI runs on pull requests and on pushes to `main`, not on a push to the branch.
- [ ] Every line of Gate B is ticked or carries a note; every finding of Gate A has its fix and its re-check.
- [ ] `npm run build`, `build:data`, `build:expected` and `cross-check` leave no diff.
- [ ] Spec section 7 is read once more against the lab as built. Where the two differ, the difference goes to the owner: the spec is corrected or the lab is.
- [ ] An independent review of the whole branch, starting from Review Focus. One fix wave, one re-check.
- [ ] In that review, the labels and headings written straight into components in Tasks 14 to 21 (button names, tile and column headings, legends, captions) are read once for chemistry: they were written after Gate A and no gate has read them.
- [x] Before the branch is pushed or merged, the two files removed at Gate A, `docs/research/phase-3/sources/ricca-5600-listing.html` and `docs/research/phase-3/sources/quotation-fingerprint.json`, are taken out of its history, and the commit ids quoted in `gate-a.md` and in this plan are rewritten to the new ones. Done on 2026-10-05. Before the push, `git log --all -- <the two paths>` is run again and shows nothing on this branch.
- [ ] The branch is presented to the owner before merging.

**Done when:** all eight are done.

Carried to this task from Tasks 14 to 22, as run: the owner's look at the close, which comes before the branch is presented; a note against each line of Gate B, from its "As run" record; the words listed in the "As built" notes of Tasks 14 to 21, which the sixth box above already asks the review to read; a second reader for the sentences Task 22 added to `docs/for-institutions.md`, with the lab running; what Gate A left open (the "As run" note under Gate A); `ACTION_TEXT.swirlAndWait`, which no caller shows; and the Global Constraint "Lazy", which no lint rule or test holds. The boxes above are as they were: nothing of this task was done with Task 22, and the branch was not pushed.

### The deep review and its fixes

The one deep review of the whole branch ("How the phase was run from Task 14") was made on the branch at `527d17b`, and its record is `docs/research/phase-3/deep-review.md`: fourteen findings, one of them must-fix, and sixteen notes. Each finding was reproduced first, in a failing test or by a throwaway script in Chromium on a build of `527d17b`; each fix that is logic or markup has a test that was seen failing; and the same script was run again on the build with the fixes. This is the fix wave of Task 23's fifth box. Its re-check by someone who did not make the fixes has not been done, so the box is not ticked, and no other box of Task 23 was touched.

What the fixes changed in what this plan says, task by task; each place also has a bracket beginning "at the deep review":

| Task | Changed |
| --- | --- |
| 7 | `checklist` calls the step `hcl` done only when the notebook holds the label's own molarity |
| 9, 14 | `storage.ts` gains `readEntry` (a stored value read with nothing changed) and `wasSetAside`; `useLabProgress` returns a third value, `{ setAside, taken }`, and gains `writtenElsewhere`; `LabShell` gains the prop `setAside` and `SHELL_TEXT` the sentence it shows |
| 14 | In Hazards the signal word is under the heading. `NARROW_NOTICE.withRun` says "the record of your saved run" |
| 15 | Home shows an activity that has no page yet as the list of labs does: no link, and "Planned. Not built yet." in place of a status (`hasPage` in `activities.ts`), the mechanism included |
| 18 | No `aria-pressed`. The two sentences of an open stopcock name Escape |
| 19 | The message line: "Again:", and when it is cleared. The reading field is remounted when the stopcock opens |
| 20 | A checked trial's own HCl molarity under its heading |
| 21 | The record another tab saves is taken; a record set aside is said |
| Tests | Seven loop tests gained a timeout of their own; two of them are the periodic table's page tests, which this branch did not write |

Two existing test cases were changed, each because the finding it answers asks for the opposite of what the case held: in `bench.test.ts`, "make the open stopcock a toggle: not pressed while closed, pressed and reading Close stopcock" now holds that the name changes and that no button carries `aria-pressed`; in `shell.test.ts`, the acid's Hazards case held the signal word before the first heading and now holds it after that heading and before the statements. The case of `page.test.ts` for a stored record that does not fit keeps what it held and also holds the notice. No other existing case was changed, and none was deleted.

After the fixes, `npm run lint`, `npm run build` (72 test files, 2207 tests with the quotation fingerprint made), `build:data`, `build:expected` and `cross-check` pass and the three data steps change no file. That is Task 23's third box as of this commit; the box stays unticked until the close. The `index` chunk is 380.89 kB (gzip 123.66) with the fixes, from 380.37, and the lab's own chunk 125.11 kB, from 123.99. The lab's code is still in its own chunk alone.

Not done from the review: closing a stream when focus leaves its button, which is put to the owner; and the sixteen notes, each with its disposition in the record. Two of them are settled by a finding's fix (the message line after a discarded flask, and Home's planned lab).

### The page in tabs

Made on 2026-10-06, at the owner's request. The owner opened the finished page on a tablet, as part of the look at the close, and found it too much at once: about seven screens of primer before Start (twelve cards stacked), and the guide, the bench, the notebook and the record stacked for nearly three screens after it. The owner chose this redesign. It is recorded at the end of `docs/research/phase-3/deep-review.md`, and spec 7.1 describes the page as it now is.

| Task | Changed |
| --- | --- |
| 10 | `PrimerParagraph` gains `label`, `terms` and `labRules`, given as the first argument of `paragraph`; `primer.ts` exports `termIndex` (where a term first stands as a word of its own) and `READ_FIRST` (the four cards the first paragraph names, taken from that paragraph). No heading, paragraph or equation changed: `primer.test.ts` holds each card to the sha256 of its text as it stood at `e054036`. `quotation.test.ts` checks each label with the paragraph it heads |
| 14 | `LabShell` is the heading, the notices, the mode and Start or Restart over three tabs (shadcn's tabs on Base UI, `src/components/ui/tabs.tsx`), on a bar that sticks to the top of the window. Its props: `primer` is a node, `bench` a function of whether the Lab tab is shown. `openingTab` says which tab opens. A panel not shown is kept mounted, hidden and inert. `Primer` shows one topic at a time. `shellText.ts` gains the tabs' names, the two sentences for a page with no run and `PRIMER_TEXT`; `SHELL_TEXT.primer`, the old disclosure's summary, is gone; the two closing sentences of `NARROW_NOTICE` say where the primer and the record are by their tabs. `lab.css` loses the record's grid area and gains the primer's layout and a scroll margin under the bar |
| 18, 19 | `useStream` takes `shown` and closes the stopcock when it turns false; `stream.ts` gains `CLOSED_UNSEEN` and `streamMessage` a sentence for it; `TitrationBench` takes `shown` |
| 21 | The page hands the shell the primer with `READ_FIRST`, the bench as a function, and the record at every width |

Decisions made in the building, each for the owner to overrule:

- **A panel not shown is kept mounted and inert, and an open stopcock is closed on leaving the Lab tab.** Kept mounted, the Lab panel keeps what was typed in a field, the message line, a Guided warning that is showing and the primer's topic. Inert and hidden, it is out of the tab order and is not read out, and no focus move can land in it. A stream would have gone on running unseen, so it is closed when the tab is left, as it is when the browser's own tab is hidden; when the learner comes back the message line reads "Stopcock closed: it was closed when you left the Lab tab." It is said then and not before, so that the line changes where it can be seen and heard.
- **Previous and Next are absent where there is nowhere to go**, not shown unavailable. Changing topic moves focus to the card's heading, so the button that disappears never leaves focus on nothing.
- **Start moves focus to the Lab tab's panel**, which is named "Lab" by its tab, not to the bench: in Guided the checklist's line is over the bench, and focus on the panel leaves it next in the reading order. (From the check of the tabs: the focus does not scroll the window. Start puts the tab bar at the top of the window, so the heading and the mode go out of view and the checklist's line and the shelf are what is under the bar.)
- **Each tab is shown again where it was left** (from the check of the tabs). When a tab is left with its panel scrolled under the bar, how far is kept, in the page's memory only, and the tab comes back to that place. A tab that has not been seen, or was left while the bar was not stuck, is shown from the top of its panel where the bar is stuck and is not moved where it is not, as before. Restart forgets the Lab tab's place. `tabShift` is the rule, and `shell.test.ts` holds it.
- **The list of topics is drawn once.** Where the primer is under 46rem wide it is behind a button named "Topics" that says whether the list is out; from 46rem it is a column beside the card and the button is not displayed. A native select was not used: in Chromium the arrow keys change a closed select at once, and a change of topic moves focus.
- **A term is bold once in the whole primer, in the card that is about it**, so "endpoint", "indicator", "equivalence point" and "molarity" are bold in their own cards and not in the four cards read first, which use them earlier.
- **Eleven sentences are set off**, in eight paragraphs and nine blocks. (Twelve as built; the check of the tabs took out "This lab measures agreement by the relative deviation.", which names the lab but states its choice of a measure that a real bench uses too.) Each is a whole sentence that names the lab itself, and a test holds that. Other sentences that say "this lab" or "here" are not set off, because they state the chemistry or the set-up and no rule that differs from a bench: that the salt here is sodium chloride, that the acid is the known solution, that this lab asks for three trials.
- **In a narrow window the page opens on the Primer tab while there is no run**, as at every width, so the notice that the bench needs a wider window is one tab away until there is a run.

Tests (as built; the check's two new cases are under "The check of the tabs" below): `shell.test.ts` and `page.test.ts` were brought to the new structure, and each changed case says in a comment what it held before. New cases hold the tab list's roles and names; which tab opens for no run, a run in progress and a completed run; that a panel not shown is hidden and inert; the pager's order, the names on Previous and Next, the place line and the "Read first" marks; and the three formatting rules. 2233 tests in 72 files, with the quotation fingerprint made.

In Chromium, by keyboard, on the production build and on the development server (a throwaway script, not kept; 74 checks, all passing): the tab list is one stop, the arrow keys move in it and wrap, Enter and Space select; Tab reaches nothing in a hidden panel; each tab controls its panel and each panel is named by its tab; Start shows the Lab tab with focus on its panel; a Guided warning takes focus, survives a visit to another tab and returns focus; typed text and the message line survive a visit; with the stopcock open, nothing is delivered while another tab is shown, and the sentence is there on return; a trial that ends by itself moves focus to its result; Restart from the Record tab shows the Lab tab; a reload with a run opens on the Lab tab and moves no focus; Previous, Next and the list move focus to the card's heading, which comes to rest below the bar; the bar sticks; under 768 px there is no bench, Start, Restart or mode; under the reduced-motion setting nothing in the tabs or the primer transitions; no console error and no request off the app.

Not checked: how any of it looks, which is the owner's to judge; a screen reader; a real tablet and touch; any browser but headless Chromium; a completed run's opening tab in the browser (a markup test holds it). The new labels and the page's other new words have been read by no one but the one who wrote them.

#### The check of the tabs

The redesign was checked the same day by a reviewer who had not built it, in headless Chromium on a production build, and three findings were fixed. `docs/research/phase-3/deep-review.md` has them in full.

- **Start from the Primer tab left the page deep in the Lab panel or at its very end**, with the checklist's line and the shelf above the window. Base UI keeps the panel that is being left laid out for one frame, with the next panel under it, and the focus that Start moves was scrolled to in that frame. Fixed in `LabShell`: the panel being left is out of the layout at once (`data-ending-style:hidden`), the focus is moved without scrolling, and the window is then put with the bar at its top.
- **Coming back to the Lab tab always showed it from its top**, so on a tablet the stopcock and the sentence that says it was closed were below the window. Fixed: each tab is shown again where it was left, as above.
- **One sentence was set off that is no rule of the simulation alone.** Fixed in `primer.ts`; the term "relative deviation" is still bold.

Tests: `shell.test.ts` gains the rule `tabShift` and that every panel carries the class that takes it out of the layout when it is left; the block total there is 9, and `primer.test.ts` lists eleven sentences and holds the card on agreement to none. 2235 tests in 72 files.

**What no committed test holds.** The effect that moves focus and the window after Start, the keeping and restoring of a tab's place, and the closing of an open stopcock when the Lab tab is left all run only in a browser; the tests are in the node environment and hold the rule and the markup. They were checked by a script that is not kept in the repository (123 checks, all passing, on a production build and on the development server; before the fixes the same script failed 62, 6 of them only because Start on the Lab tab's own button left the bar 15 px below the top). It pressed Start by keyboard, by pointer and from the Lab tab's own button, with topic 1 and with topic 7 showing, at 1024×768, at 820×1180 by touch and at 1366×768: each time the Lab tab was shown with focus on its panel, the bar at the top of the window, the checklist's line at 65 px and the top of the shelf at 140 px. It opened the stopcock, went to the Primer tab, read on to topic 7 some way down, and came back: nothing was delivered while away, the sentence was there, the stopcock's button was within a pixel of where it had been left, and the message line was in the window at all three sizes; the Primer came back to its own place; the Record tab, not seen before, was shown from its top; by keyboard the place was kept and focus stayed on the tab; Restart from the Record tab did not go to the old run's place; a reload with a run moved nothing. Anyone who changes `LabShell`'s effect or `useStream`'s `shown` has to make these checks again by hand or with such a script. Whether to keep one in the repository, which would bring Playwright in as a development dependency, is the owner's to decide.

Left for the owner, none of them changed: whether the 10 mL rinse sentence and the sentence on a burette that runs out should be set off too, and whether the page should say in a line what the set-off blocks are; four labels that are weak as finders ("The aim", "In the flask", "The two solutions", "The simulation"); that the three longest cards still take about two screens at 1024×768; the height of the tabs (33 px); the three controls named "Record"; that the Topics list does not close on Escape.


### Colour roles, entries made and steps done

Made on 2026-10-06, at the owner's request. The owner used the finished lab on a tablet, said that everything worked well, and asked for three things, with a screenshot of the dark page marked up by hand to show what would help a learner: the marks as colours on the page, the fields already used no longer offered as empty boxes, and each done step of the shelf folded into its button ("[✓ Burette conditioned]"). It is recorded at the end of `docs/research/phase-3/deep-review.md`, and spec 7.1 describes the page as it now is. Nothing of the engine, the model, the chem-data or the stored record changed, and no dependency was added.

| Task | Changed |
| --- | --- |
| 12, 13 | `benchText.ts` gains `STEP_BUTTON` (each step button's two names), `stepsDone`, `ALREADY_CONDITIONED` and `FLASK`, the status line's first words. `BenchView` gains `readingRecorded`: the reading the field stands for as the learner typed it, never the meniscus |
| 14 | `lab.css` gains the six colour variables, once under `:root` and once under `.dark`, and a class for each role; `roles.ts` names the classes. The reason under the mode choice carries the role of a held reason |
| 16 | `ReadingInput` takes `recorded` and `settled`, and exports `replyUnder`. New `entry.ts`: `fieldState` (whether a field takes typing, offers Change, offers Cancel), `useEntryFocus`, and the class of an entry field |
| 18, 19 | `Control` takes `dimmed`. `Shelf` draws the four steps as one button each and the values in their role. `TitrationBench` exports `benchAnswer`, the one press it answers itself; `Said` gains `held`; the status line's words after "Flask: " are in a span |
| 20 | `Field`, `MolarityEntry` and `SummaryEntry` in `Notebook.tsx` take what was entered and whether the engine holds the field; `messages.ts` gains "Change", "Cancel", `resultName` and `outcomeRole`. The guide's tick carries the done role |

**The roles**, with what carries each, the value in each theme, and the least text contrast measured against the background it sits on (how it was measured is under "In Chromium" below):

| Role | Carried by | Light | Dark |
| --- | --- | --- | --- |
| Value | The acid's label, the pipette's volume, the counts of drops and rinses, "Trial N", "Result of trial N", each figure in the notebook and in the record | `oklch(0.5 0.1 215)`, 5.66 | `oklch(0.82 0.12 210)`, 10.67 |
| Entry | The label of a field that takes typing now | `oklch(0.545 0.113 88)`, 5.00 | `oklch(0.89 0.17 100)`, 12.96 |
| Done | The tick in a step button and in the checklist; "Passed" | `oklch(0.5 0.14 150)`, 5.16 | `oklch(0.8 0.19 148)`, 8.69 |
| Failed | "Not passed, ...", "Invalid: ..." | the theme's `--destructive`, 4.77 | the theme's `--destructive`, 6.21 |
| Pink | The status line after "Flask: " while the flask is faint pink or pink | `oklch(0.53 0.21 355)`, 5.93 | `oklch(0.74 0.2 350)`, 6.93 |
| Deep pink | The same, of an overshot flask | `oklch(0.42 0.17 355)`, 9.32 | `oklch(0.67 0.23 355)`, 5.32 |
| Held | The reason under a field, under the mode choice, and in the message line when a press did nothing | `oklch(0.555 0.18 42)`, 5.12 | `oklch(0.79 0.15 60)`, 8.92 |

Decisions made in the building, each for the owner to overrule:

- **The roles are in `lab.css`, not in the app's theme file.** The theme's tokens are the app's; these six belong to a lab page, and `lab.css` is loaded with one. The failed role is the theme's own destructive colour.
- **Where a role goes beyond the marks on the screenshot.** The owner marked the acid's label, the pipette's volume, the two counts and the two headings as values. The figures under a trial's heading, the summary's values and the figures of the record's table are the same kind of thing and carry the role too; a dash does not. The row header of the record's table is plain, as the column headers are.
- **"Passed, not counted" carries no role.** It is neither a good result nor a failed one, and its words say both halves. The first line of a trial's feedback is plain in every case.
- **Yellow on white.** No yellow reaches 4.5 to 1 on a white page, so the light theme's entry colour is a dark gold of the same hue. It is quieter than the black labels round it, where on the dark page the yellow is the brightest thing in the notebook. A yellow mark behind a black label would be louder; it was not built, because it is a second kind of role (a background) and the request was for colours.
- **The checklist's other marks are plain.** Only the tick of a step done carries a role; a skipped step's cross is no result.
- **A step button that is done is filled and has no outline, and is not drawn faint.** Faint is how a button that cannot be used yet looks; a done button has to be read. It keeps `aria-disabled`, stays in the tab order, and a press says why.
- **The fill is one button with both meanings**: "Burette filled. Refill", the tick in front. It keeps the outline of a button that does something, and only the word "Refill" is faint while the engine cannot fill. The other arrangement, a line of text over a "Refill burette" button, is two elements and is what the owner asked to be rid of.
- **A conditioned burette is not conditioned again.** The engine allows a second conditioning, which empties the burette and changes nothing else: `conditioned` is never unset, and a fill of a conditioned burette is never dilute. A button that reads "Burette conditioned" must not empty the burette when pressed, so the bench does not send the action and says `ALREADY_CONDITIONED`. It is the one press the bench answers without the engine's word, `benchAnswer` is the whole rule, and a test holds that through refills nothing needs a second conditioning. Where the engine has a reason of its own, that is said.
- **Change is the form's own button.** The button that reads Record reads Change once the entry is made, so focus that was on it stays on it. When Enter in the field records the entry, the field is disabled and focus is moved to that button. Change puts focus in the field with the old entry selected. Cancel, which is there only while a change is under way, puts focus back on the button. Change is described by the field's label, because the Tab key passes over a disabled field.
- **A field that is disabled is not drawn faint.** It has the muted background and the text at full strength, so that the entry in it can be read.
- **Which answers of the engine make a field "held".** As before: any answer of `can` to a probe value that is not about the value itself. So Guided's HCl field offers Change, though the only molarity Guided will take is the one already there.

Tests: `bench.test.ts`, `page.test.ts` and `benchView.test.ts` were brought to the new structure, and each changed case says in a comment what it held before. What changed in them: the tile headings and the button names are read through their spans; the acid's label (in both files), the status line, the HCl molarity above the record and the heading of the last result (in two cases) are read with their tags taken out; the notebook's first field is disabled once recorded and its button is Change (two cases); the view's list of keys has `readingRecorded`; the checklist's ticks carry a class; the mode's reason is held to its role. One case was replaced: "says what has been done in words beside a tick" held the four status lines, which are gone, and now holds that there is none and that the counts are text. New cases hold which role each kind of text carries, and that no role is on an element with no words; each step button's name, tick and state in nine states; the one press the bench answers itself; a field after its entry, at the bench and in the notebook, with Change exactly when `can` would take the entry again, over a whole trial at the bench and over eleven states of the notebook; that nothing is said of an earlier entry under a field that is held; `fieldState`; the variables of `lab.css`; and a Challenge learner who miscopied the label, who has Change at every point of the run, corrects it and reaches three trials that count. 2272 tests in 72 files, with the quotation fingerprint made.

In Chromium, on a production build (two throwaway scripts, not kept):

- **By keyboard, 72 checks, all passing.** The script put focus on a control and then used keys; two presses, "Discard this flask" and "Start the next trial", were by pointer. A new Guided lab: the HCl molarity refused, recorded, changed, cancelled and refused again in a change; each step button folding into its done name with focus still on it; a press on "Burette conditioned" told why, twice, with the burette still filled; Refill; a reading refused, recorded with Enter (focus on Change), changed (focus in the field, the old reading selected); a Guided warning raised from a step's button, which had its done name and focus when the warning was answered, and from a reading, by Enter and by the button, with focus on Change after "Record the reading anyway" in both; a flask discarded while a change was open. The screenshot's path: a refusal under the final reading, then the molarity checked, and the field of the trial that was over had its one reason, no refusal and no outline. A completed lab's summary entered, changed and cancelled. Challenge with a miscopied label corrected between trials. Under the reduced-motion setting no element of the Lab tab had a transition or an animation to run. No console error.
- **Contrast.** For every shown element that carries a role, in fourteen states of a run on the Lab and Record tabs and after three presses (a held reason in the message line, a field being changed, the checklist as a list): the element's computed colour, the opacity of it and of every ancestor, which was 1 in every case, and the background colours of its ancestors laid over each other, each turned to sRGB by a canvas, and the WCAG contrast ratio of the two. The table above gives the least ratio of each role in each theme. A tick sits on three backgrounds (the card, an outlined button, a filled button) and the figure is the least of them.
- **Sizes.** At 1024×768, 820×1180 and 1366×768, with the reading and the HCl molarity both being changed, so that Record and Cancel stand beside each field: no form and no shelf button ran out of its box, the page did not scroll sideways, and no button was under 32 px tall.

After it, `npm run lint`, `npm run build` (72 test files, 2272 tests with the quotation fingerprint made), `build:data`, `build:expected` and `cross-check` pass, and the three data steps change no file.

**What no committed test holds.** Where focus goes when a field is disabled or made editable (`useEntryFocus`), the message line's held colour, and the measured contrast run only in a browser; the tests hold the rule (`fieldState`, `benchAnswer`, `replyUnder`), the markup and the stylesheet's variables. Anyone who changes `useEntryFocus`, the forms' buttons or a role's value has to make these checks again by hand or with such a script.

Not checked: how any of it looks, which is the owner's to judge, and above all the light theme, which the owner's screenshot does not show; a button while the pointer is over it; the page's other text (the grey secondary text, the faint text of a button that cannot be used); forced colours; a person with a colour-vision deficiency; a screen reader; a real tablet and touch; any browser but headless Chromium.

**Words written here that no one has read:** "Change", "Cancel", "Burette conditioned", "Burette filled. Refill", "Pipette wet with HCl" and "HCl is in the flask" as the names of buttons (the last four were status lines before, with a full stop each), and "The burette is already conditioned, and in this lab it stays conditioned through every refill."

Left for the owner, none of them changed: the six colours in both themes; whether the light theme's entry label should be a yellow mark behind the label and not a dark gold; whether the figures in the notebook and the record should carry the value colour or only the things the owner marked; whether "Burette filled. Refill" reads well as one button; that two buttons on the page can read "Change" at once, the HCl molarity's and a reading's, told apart by their descriptions; whether a done step button should look less like a button still.

**The check of this, and what was done.** A reviewer who had not built it checked it the same day, and the deep review's record (`docs/research/phase-3/deep-review.md`) says what was found and what became of each thing. In short: a burette that has run out to its last mark is no longer called filled, so `stepsDone` counts the fill as done only while the burette can deliver; Escape anywhere in an entry's form is its Cancel, and a held Enter is one press, both by `entryKey` in `entry.ts`, which the three forms hand their keys to; the `Role` type and `resultHeading` are gone. Left for the owner besides the list above: whether "HCl is in the flask" should read "HCl pipetted into the flask", since the acid is neutralised by the endpoint; whether a part-used burette at the start of a later trial should keep its tick; and the orange of a held reason beside the red of a failed result in the light theme. 2275 tests in 72 files. That the forms use `entryKey`, and where focus rests after Escape, run only in a browser, as the focus after an entry does.

---

## Not built in phase 3, and not verified

**Deliberately not built:**

- Parallax, and a control to raise or lower the eye. The primer explains it.
- A number on every 0.1 mL graduation in Guided. Open again only if the owner cannot read the view at the look at the close (as first written: at browser check 1).
- Titrating with no indicator in the flask: the stopcock stays shut.
- A trial labelled with its mode; a misread kept in Guided; marks of right or wrong on the average and the relative deviation.
- A shared notebook or check flow for phase 4, and moving the tile and bottle drawings out of the titration folder. Phase 4 takes what it finds it needs.
- Syncing two tabs open on the same lab: the last save wins. (Built in part at the deep review: a tab takes the record another tab saves, when it is saved, so the last save is no longer of an old record. Two actions in two tabs inside the moment the browser takes to tell the other are still last-save-wins.) Carrying a run to another device.
- Forcing a refill before a trial.
- A narrow limit below 768 px. The drawing fitted at 579 px of page in a prototype; lowering the limit would need its own check.
- A Guided re-check of an HCl molarity recorded in Challenge before the mode was changed: the trial's feedback names it and the trial does not count. (From the deep review, Guided's checklist no longer calls the label step done for such a molarity: it shows as the next step until the label's own is recorded. No warning is raised and no action is refused for it.)
- As built, also not built: a lint rule or a test for the Global Constraint "Lazy"; the caption under the reading view of `bench.md` 6.3; a waste beaker on the shelf; a confirmation before "Discard this flask"; a sentence for a stopcock button pressed while a stream runs; the completion line in the read-only record of the narrow page.

**Not verified by anyone, at the time of writing:**

- **No screen reader has been run.** What a live region says, and whether silence between two cue changes is comfortable, is unknown. (As first written: unknown until Gate B, and still unknown if none can be run there. None was run.)
- **Chromium only.** Container query units, the one-pixel graduations and the key-repeat guard were seen in headless Chromium and nowhere else.
- **No person has read the meniscus.** All the evidence is a model measuring screenshots, and scripts that take each reading from the words. The owner is to be the first, at the look at the close (as first written: at browser check 1, and again at Gate B). No learner has.
- **No touch device.** "Tablets fully supported" in spec 11 is untested, and a tablet in landscape with the menu open must scroll once to titrate. As run, touch was not emulated either.
- **The blocks of Gate B marked "By hand"** were not run by a person. Scripts ran what its "As run" note lists.
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
