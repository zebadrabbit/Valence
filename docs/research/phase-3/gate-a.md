# Gate A: independent chemistry review of the titration lab

2026-10-05. The gate of `docs/superpowers/plans/2026-10-04-phase-3-titration-lab.md`, held after Tasks 1 to 13 and before any screen is built.

**The gate is not closed.** Both must-fix findings are fixed and tested. Of the thirteen should-fix findings, nine were fixed at the gate, two (F7 and F8) are closed by the owner's answer of 2026-10-05, and two (F6 and F15) are left to the owner, with both sides given in the last section; for F6 a false comment was corrected and nothing else. The sentences written at this stage have been checked by tests and by running the reviewers' own probes again, but no independent reader has read them yet.

## How the review was done

Three reviewers, none of whom wrote the code under review, worked at commit `036c706`. None changed a tracked file.

| | What they were given | What they did |
| --- | --- | --- |
| R1, chemistry | Spec section 7, the authored and generated record, the manifest and kept copies, the pH solver, the engine, the primer and the five wording files. Not the designs, the spike or the plan | Fetched every source afresh, wrote an independent model of the flask and of whole labs, and wrote down the direction and rough size of each technique error from bench chemistry before reading the engine or the sentences |
| R2, text and rules | The same files. Not the designs, the spike or the plan | Read every learner-facing string from a dump, scanned all written text for runs of six words shared with a source, and attacked the counting and typed-molarity rules through the public surface on seeds 1 to 400 |
| R3, Tasks 9 to 13 against the plan | The plan and the branch | Ran the whole build, checked every interface and test value of Tasks 9 to 13, walked 247 100 states of the join between engine and bench words, and probed storage |

Findings are numbered F1 to F15 (must-fix and should-fix) and N1 to N15 (notes). Each fix was written test-first: the test was seen failing, then the change was made. After the last fix `npm run lint`, `npm run build` (68 test files, 1922 tests, type check, production build), `npm run build:data`, `npm run build:expected` and `npm run cross-check` pass, and the generated files show no diff. Before the gate the count was 67 files and 1774 tests.

## Findings and what was done

### Fixed

**F4 (must-fix, R2). The primer's support lines repeated their sources' wording.** Thirty-two runs of six or more consecutive words, one of them a whole caption, against pages as served on 2026-10-05.

- Reproduced: the new test failed on 25 support lines and on three shown sentences outside the safety card.
- Done: each line is reworded. `src/chem-data/titration/quotation.test.ts` now holds every shown paragraph, every support line (what it says the passage establishes, and every "This lab:" line) and the three hazard notes to the rule: none repeats a run of six words of a page it rests on. The pages are not kept, so the test compares against `docs/research/phase-3/sources/quotation-fingerprint.json`, a hash of every six-word run in the seventeen pages the primer cites, the three safety data sheets and the three PubChem records. No text can be read back from it. `scripts/fingerprint-sources.mjs` writes it from pages saved outside the repository. A passage's location is left out of the test: a heading named there is the source's own name for the place.
- Re-checked: the test went from 37 failing texts, these and those of F5, to none. R2's own scanner, run again over the reworded file, finds four runs in support lines, all four of them headings or example titles used as locations.
- Commit `cf71756`.

**F5 (must-fix, R2). Learner-facing safety text shared runs of 6, 9 and 14 words with the safety data sheets.** The rinse sentence in the safety card and in the acid and base notes; four hazard statements in a row, without their codes, in the indicator note; the wording of H314 without its code in the safety card.

- Reproduced: the same test failed on two shown safety paragraphs, four of their support lines and all three notes.
- Done: the rinse sentence is in the project's words in all three places. The indicator note gives the five codes the sheet prints and then says in its own words what each means. The safety card names H314 by its code and says the two substances are classified as corrosive to the skin and the eyes. Bottle statements stay as printed with their codes: they are data.
- Re-checked: the test above; R2's scanner against the kept copies and the saved sheets finds nothing in `primer.ts`, and in the record only statements with their codes, the names of the two regulations and figures with their units.
- Commit `cf71756`. **The owner reads the result (D4, D15): the hazards say the same, in different words.**

**F3 (should-fix, R1). The indicator note treated the bench's bottle as one supplier's product**, while the strength's note in the same record says that this is assumed.

- Reproduced by reading the two notes side by side.
- Done: the note says the bench's indicator is taken to be a 0.5% (w/v) solution in 50% alcohol, and that a supplier's sheet for a solution of that kind gives what follows. The safety card says "a supplier's safety data sheet for a solution of this kind".
- Re-checked: new cases in `inputs.test.ts` and `primer.test.ts`, seen failing first.
- Commit `ea2608e`.

**F1, F2 and F9 (should-fix, R1 twice and R2). Nothing a learner sees said the technique errors are larger than a bench gives, and the precision card stated one of the model's rules as a fact about benches.** Spec 7.3 names three things that are not true to a bench and says the learner is told. Only a support line, which is not shown, said so. The precision card's example of results that agree and are all wrong was a burette never conditioned, which agrees only because this lab holds the dilution at 2.0% through every refill.

- Reproduced: no shown sentence in the primer or the wording files said it; R1's shifts (about 2% to 3% for each error) match the engine's.
- Done: the glassware card has a new fourth paragraph: the lab makes each of the three mistakes cost more than a real bench does, a real tip holds less air than this lab's bubble, and a real burette is less diluted at each refill where this lab's stays diluted until conditioned. Each of the three technique causes in `messages.ts` ended with one sentence saying the lab makes the mistake cost more than a bench does, "so that it shows in the result". Changed on 2026-10-05, with the owner's answer on counting: the sentence is now said once, after all the causes, whenever a technique cause is among them, so a trial with three causes no longer reads it three times; and only a failed trial is told that the mistake shows in the result, since a trial within 1.0% is one where it did not and an invalid trial has no result. The precision card's example is now a molarity copied wrongly from the acid bottle, which repeats at a real bench too. The two tip-bubble rationales in the record say what a real tip does.
- Reworded on 2026-10-05, with the owner's answer on counting: the paragraph said that each of the three mistakes, on its own, puts a trial outside the 1.0% allowed. That is not true of what is left of a bubble after part of it has run out (F8). The paragraph now names the three mistakes, keeps the three statements about a real bench, and says that a mistake does not always show in the result, since two can push it in opposite directions and cancel, so a trial with one of them in it does not count even when its result is close. It gives no figure for what a trial is allowed: the card does not need one. A new case in `primer.test.ts`, seen failing first, holds it to that.
- Not done: no figure is given for what a bench costs. R1's estimates (a few tenths of a percent) are a reviewer's judgement and no source was read for them.
- Re-checked: new cases in `primer.test.ts` and `messages.test.ts`, seen failing first. For the change of 2026-10-05, two cases in `messages.test.ts` seen failing first: the sentence is in no cause's own text, is in the feedback exactly once for one, two or three technique causes and not at all without one, and says "shows in the result" under a failed trial only. The earlier case, which held each technique cause to carry the sentence, is replaced by them.
- Commit `7bacdd2`.

**F10 (should-fix, R2). The three cards to read first used words defined on other cards.** The titrating card used the titre and the stopcock before the cards that say what they are, and leaned on molarity and the indicator.

- Reproduced with R2's probe of where each term first appears.
- Done: the card order is the plan's and is unchanged. The first paragraph now names the three in an order that can be followed: Reading the burette, Titrating to the endpoint, The calculation. The titrating card says that the volume of NaOH the flask takes is called the titre, says what M means and points to the Molarity card, and says the phenolphthalein in the flask is an indicator that turns pink once the acid is used up.
- Re-checked: a new case in `primer.test.ts`, seen failing first.
- Commit `972858f`.

**F11, F12 and F13 (should-fix, R2 and R3 twice). After a wash of distilled water the status line misdescribed the last addition, and a wash or a further drop erased a recorded final reading without a word.**

- Reproduced with both reviewers' probes: seed 6, a confirmed endpoint, read "Last addition: pink persists." after one wash and "Flask: colourless. Last addition: pink fades slowly." after two, with nothing added but water. Of 500 careful endpoints, 85 were washed colourless by one to three portions.
- Done, in three parts.
  - The engine: a wash sets the trial's `lastAdditionUl` to 0. After a wash there is no plume and no cue, and the line gives the colour alone until titrant runs again. No stored field is added and no rule of the spec changes. R3 marked this change as the owner's because it touches the engine; it was made here because the defect is the plan's Review Focus 5 (words and picture that disagree) and the alternative left a false sentence on the screen. It is one line to take back, and it is listed for the owner below.
  - The bench's words: `undoneText(before)` in `benchText.ts` is the sentence a wash, a drop or a half-drop adds when it undid a swirl and wait that had shown the pink to last: the wait no longer counts and a final reading recorded after it no longer applies. It is empty otherwise, so the drops of an ordinary titration say nothing of it. Task 19 puts it on the message line; the plan says so.
  - The primer: the titrating card now says that in this lab the half-drop is rinsed in for the learner, that the bench's rinse is 10 mL, that so much water can thin a very faint pink until it no longer shows, and to add another half-drop if it does.
- Re-checked: six new cases across `select.test.ts`, `benchText.test.ts` and `primer.test.ts`, seen failing first, one of them over seeds 1 to 100 with up to three washes. Both reviewers' probes, run again, give "Flask: faint pink." and then "Flask: colourless." for seed 6.
- Still open: whether a 10 mL portion is the right size for a rinse, given how often it washes a faint endpoint out. D3 fixes the portion, so that is the owner's.
- Commit `7f9cbb8`.

**F14 (should-fix, R3). On a full store, an entry that could not be loaded was lost.** Its backup was refused, it was left under its own key, and the fresh lab's first save wrote over it. The not-saving notice then stayed up while every save was being taken.

- Reproduced with R3's probe on a store with a byte quota.
- Done: the promise of spec 10 is kept. `saveEntry` does not write over an entry that a load set aside and could not back up. It tries the backup again at each save and goes ahead once there is room. Until then the entry lasts for the session only, and the notice, which the refused backup keeps up, is true. "Clear my progress" removes the entry and lifts the hold. Spec 10 has a sentence on it.
- Re-checked: five new cases in `src/app/progress/storage.test.ts`, four seen failing first, for a value of another version, one of this version with the wrong shape, and one that is not JSON. R3's probe, run again: the fresh save is refused and the old record is still in the store.
- Commit `bc58fe0`.

### Closed by the owner's answers of 2026-10-05

**Decision 1, answered: a trial with a technique cause named in it does not count toward the three.** The three causes are a burette not conditioned, a tip bubble and a pipette not rinsed. Such a trial can still be within 1.0% and is then shown as passed and not counted. This closes F7 and F8, which were found as follows.

**F7 (should-fix, R2). A second pair of technique errors cancels.** Reproduced with R2's test on seeds 1 to 400: an uncleared tip bubble with an unrinsed pipette passed and counted at 381 seeds, the known pair (unconditioned burette with unrinsed pipette) at all 400, and each whole error alone at none. Only one such trial is possible in a lab.

**F8 (should-fix, R2). A tip bubble partly run out into a discarded flask leaves a smaller bubble that passed and counted.** Reproduced: after 16 stream additions and a discard the next trial passed and counted at 400 of 400 seeds with the tip bubble named; after 12, at 72; after 8, at none; and a whole lab was completed this way at 100 of 100 seeds. Readings are honest throughout.

- Done, in the engine: `countingTrials` leaves out a trial that has a technique cause, by `techniqueCauses`, which moved from `select.ts` to `actions.ts` so that the counting rule and the named causes use one test. Nothing else of the model changed: the bubble's row in spec 7.3's table is as it was.
- Done, in the words: `OUTCOME_TEXT.passedInSpite` and its branch are gone. The does-not-count sentence now gives the whole rule, the three technique steps beside the readings and the label. After the causes of a trial within 1.0% that has a technique cause comes one new sentence: mistakes in technique can push a result in opposite directions and cancel, and a small one may not move the result far, so a result this close does not show that the technique was sound. It covers the pairs and the part bubble, does not scold and says nothing of luck.
- What is released: the true molarity and a passed trial's percent error are given at the same count of three, so neither is given by trials that do not count. A test holds that a lab with one such trial and two careful ones is in progress and gives neither.
- No dead end: from every state above, a learner who then conditions a burette that is not conditioned, clears whatever air is in the tip and pipettes with the pipette the last aliquot left wet with acid has three trials that count, and the lab completes on the third. What is left of a part-escaped bubble can be cleared in the next trial as the engine stood: `clearTipBubble` is refused only for an empty burette, a tip with no air, or once titrant has run in the open trial. Nothing had to be changed for it.
- Re-checked, by tests seen failing first for the stated reason (the trial counted): hand-worked cases for seed 1 in `actions.test.ts` (the pair that cancels exactly, titre 25.70 and 0.0949; the bubble with the pipette, titre 25.80 and 0.0946; the part bubble, titre 25.85 and 0.0944); the outcomes and what is withheld in `select.test.ts`; and in `acceptance.test.ts`, over seeds 1 to 100, the two pairs at 2 and at 3 drops (within 1.0% in 200 and in 186 of 200 runs, counting in none), the part bubble after 16 stream additions, a lab of three part-bubble trials, and the way out of each. The walk of `actions.test.ts` now also holds, from the stored fields and not through the engine's own test, that no trial that counts has a technique error in it; on the burette cut short it failed before the change. The check that a part bubble can be cleared passed before the change, as a check should.
- Re-checked, with R2's probes run again on seeds 1 to 400: the known pair is within 1.0% at 400 and counts at 0; the bubble with the pipette is within 1.0% at 381 and counts at 0; after 8, 12, 16 and 18 stream additions into a discarded flask the next trial counts at 0 of 400 each; a lab completed with the tip bubble named in all three counted trials: 0 of 100. R2's leaning of the readings 0.02 mL either way changes how many pass (186 to 400) and not that none counts.
- Expected values changed, because the decision changes the rule they pinned: in `messages.test.ts`, a pass with two technique causes was expected to count and to lead with the in-spite line, and reads "Passed, not counted" where it read "Passed"; in `select.test.ts`, a passing trial was held to count exactly when it had no misread and the right label, and is now held to count exactly when no cause is named. No other expected value changed.

**Decision B, answered: the indicator's catalogue listing is cited, not kept.** The supplier's page was a kept copy in the sources folder, and the build checked the stored strength against it.

- Done: `ricca-5600-listing.html` is out of the repository. Its manifest entry has no `file` and no `sha256`, and reads like the entries for the NIST pages and the IAPWS release: the address, the day the page was read (2026-10-04), and rows for what it prints, which are 0.5, the basis (w/v), the solvent 50% (v/v) Alcohol in the same heading, and 5 g/L lower on the page, each with where it is in this project's words. The sha256 of the page as fetched is kept under a field of its own, `fetchedSha256`, because `sha256` in the manifest is the hash of a kept file and there is none.
- What is lost: the build's check of the strength against a copy (`checkStrength`) is gone. The figure now rests on a page read on 2026-10-04 and is no longer re-checked by the build; a page that changes is not noticed. The record's note on the strength, the sources README, the plan (D4, Tasks 2 and 4) and the spec (5.2, 7.3) say so.
- Re-checked: the case in `inputs.test.ts` that held the kept copy to print the strength now holds the entry to the read-and-not-kept pattern and the folder to hold no HTML file; it and a case that `checkStrength` is gone were seen failing first. `npm run build:data` writes the new citation and note and nothing else.
- History: the file is still in the branch's earlier commits. It is taken out of them separately, before anything is pushed (the plan's Task 23).

### Reproduced, and left for the owner

**F6 (should-fix, R2) and N9 (note, R3). The flask view gives away the pipette's delivery and, once the flask is pink, the hidden NaOH molarity.** Reproduced with R2's test: exact at 400 of 400 seeds for both. Neither passes a trial. The plan's Global Constraints accept the pink concentration of a pink flask as a number the drawing needs, and its Task 13 pins the exact flask volume, so handing the app less changes the plan's interface and one of its test values. The header comment in `select.ts` claimed that no selector hands over such a number; it now says which two do (commit `3ecc4f8`). Nothing else was changed. Decision 2 below.

**F15 (should-fix, R3). The safety card names two of the indicator sheet's hazards and not the other three.** Confirmed against the saved sheet: it carries five hazard codes, and the card speaks of cancer and flammability only. The bottle's note names all five. What the safety card covers is the owner's to say (D15). No change. Decision 3 below.

### Notes

| | Note | Disposition |
| --- | --- | --- |
| N1 (R1) | The strength note's claim that the endpoint test passes from 0.1% to 1% has almost no margin at the low end if 0.1% is read by weight: one extreme flask goes 0.2 µL over the bound of check 4 | No change to the model or the note. The claim holds as the record states the strength, by volume. Open item 5 |
| N2 (R1) | The listing's 0.5 g per 100 mL and the sheet's 0.56% by weight imply a density a little below what such a mixture has | No change. Within what a sheet's composition table rounds to; the endpoint tests pass at either figure |
| N3 (R1) | K_w's unit is empty while its note speaks of the molar scale, and the note does not say the constant is used as a product of concentrations | No change. Open item 5 |
| N4 (R1) | The carbonic acid page's body figures do not agree with each other or with its infobox | No change. The record reports them as printed and does not rest on them |
| N5 (R2) | Shorter runs shared with sources in shown text | Partly fixed with F4: the test covers shown primer text, so the three primer sentences were reworded. The checklist's step for the indicator, which is the spec's own step 4, and the opening words of the meniscus sentence are generic and unchanged. The record's figures with their units are data |
| N6 (R2) | Three points on the calculation text: rounding the average first, four decimal places against significant figures, and "at the endpoint" where the equivalence point is meant | No change. Open item 4 |
| N7 (R2) | A wrong HCl molarity carried from Challenge into Guided is shown as done; "That does not need doing now." for a pipette that was never rinsed; "no pink remains" for a flask that was never pink | No change. Open item 4 |
| N8 (R2) | A record made by hand can make the notebook show the hidden molarity | No change. Inside the risk spec 7.1 accepts: the stored record holds the seed |
| N9 (R3) | The flask view's leak, confirmed from the bench's fields alone | With F6 |
| N10 (R3) | Home says "in progress" for a record of the right version that the lab will refuse, until the lab page has been opened | No change. Open item 6 |
| N11 (R3) | The stored schema lets through numbers no run can make (twelve fields with no upper bound, water that is not a whole portion) | No change. Nothing threw and no text was wrong for a record a run can make |
| N12 (R3) | The titrating card gives no figure for when a 5 mL pour is safe, and teaches a small wash where the bench's is 10 mL | The second is fixed with F11. The first is open item 4 |
| N13 (R3) | Dead code and duplicated test helpers; `ACTION_TEXT.swirlAndWait` is a sentence no caller should show | No change. For Task 19 and the branch review at Task 23 |
| N14 (R3) | Expected values changed, removed or tested less directly since the plan was written, none of them in Tasks 9 to 13 | No change. Each is as its own report said |
| N15 (R3) | `benchViewOf` reads four stored fields directly, where the plan says selectors and `can` alone | No change. All four are the learner's own doing |

One thing R3 raised under F12 is carried forward and not fixed here: on a reload the stored last addition gives a plume again, so a plume drawn on mount would replay once. It is true of the last addition and harms nothing, and Task 17 decides whether to draw it.

## What the reviewers confirmed

**Constants and sources (R1).**

- The generated record equals the authored input in every bottle, constant and parameter. All eight kept copies match their hashes (seven since 2026-10-05, when the listing went). Fresh fetches of the papers, the sheets and the data files are identical to the saved ones.
- K_w: the release's equations were coded and reproduce its six test values. At 25 °C they give 13.994 on the molal scale and, with the density NIST prints, 13.997 on the molar scale, which rounds to the stored value. The note's conversion and its direction are right.
- The indicator's two constants, their conditions and the form that is pink are as the paper prints them, and the notes say they are used unchanged. The molar mass, the drop volume, Henry's constant with its unit, and the CO₂ fraction for the stated year are as their sources print them.
- The carbonic acid constants: the kept page prints the stored figures; the note says that reading the first as the constant of dissolved CO₂ is the project's; the survey's database file bears both out at 25 °C.
- The indicator's strength: the listing, a kept copy at the time of the review, prints weight per volume, and the note says the bottle being such a solution is assumed. (The copy is no longer kept: Decision B above.)

**The model (R1).**

- An independent implementation agrees with the engine across a whole titration curve to 3 parts in 10¹² of a pH unit, and on the solver's spot values.
- The excess titrant at which the flask first counts as pink is 9.644 to 12.239 µL at the corners of the seeded ranges and 9.599 to 16.274 µL over every flask a learner can make, always above 0 and at most 25 µL.
- Careful labs of seeds 1 to 100: no disagreement with the engine in 1500 trials. Careful percent errors run from −0.32% to +0.09%; every trial passes and every lab completes in three.
- Each technique error moves the result the way bench chemistry says, and the feedback sentences give the right mechanism as well as the right direction. Each fails alone at every seed.
- The simplifications that the learner-facing words already named as the lab's own are defensible for a beginner. The sensitivity claims in the record and the spec hold.

**Hazards (R1, R2, R3).**

- Each stored statement is in the kept record under the named entry. The acid bottle carries the entry for hydrochloric acid and not the gas's, and nothing over its statements says pure substance.
- Each note says no more than its sheet. The by-mass figures are right as worked.

**Words (R2, R3).**

- Every learner-facing string was read. No sentence states the equivalence volume, a pH, an expected titre, the meniscus as a number or the NaOH molarity before completion, apart from the two designed exceptions. No sentence scolds.
- The meniscus in words is enough for a reading within 0.02 mL at every level, and is the level the reading view draws at all 50 001 levels.
- Words and picture agree in every state walked, the wash apart (F11 to F13).
- The slow-down hint's advice, followed in 1500 Guided trials, never overshot.
- The primer's arithmetic holds. No licence is stated for any source the branch adds, and no compliance claim was found.

**Rules (R2).**

- An honest, careful trial never fails, even with every reading leaned 0.02 mL the worst way. Dishonest routes in Challenge never count. Four passes with a reading 0.03 mL off leave the lab in progress.
- The typed molarity: over 191 151 pairs of label and titre the rounded value is always accepted, a cut-off value never where it is not the rounded one, and both neighbours only at the 170 exact ties.
- The parsers refuse a comma, a sign, a unit, a wrong number of decimals, non-ASCII digits and exponent form.

**The build and the plan (R3).**

- Lint, build and the three data scripts pass with no diff. Every interface and every exact test value of Tasks 9 to 13 is present as the plan gives it.
- 42 886 reloads, one after every action of whole labs, each gave back the state saved. Records of other versions, truncated records and records with unknown keys load as null and are kept whole under a backup key.
- The purity and import rules of the Global Constraints hold by search.

## What nobody checked

- **The sentences written at this stage.** They are listed in the last section. Tests hold them to their structure and to the no-quotation rule, and the reviewers' probes were run again, but no independent reader has read them for chemistry or tone.
- **The primer's passages.** The wording of the support lines was compared with the pages; whether each location and each claim is right for its source was not gone through one by one. The five points of the primer for which no source was read (the plan's ninth review item) were not judged one by one either.
- **The pages as they stood when the primer was written.** No copy is kept. The comparison, and the fingerprint, are of the pages as served on 2026-10-05. A page that changes later is not noticed. Text inside images, and runs broken by a sheet's layout, are outside the scan.
- **The fingerprint's limits.** A run of five words, or a close paraphrase, passes. A run that was never in a page can match by chance about once in 60 000 tries; it would then be reworded for nothing.
- **Sources not read:** the handbook the carbonic acid page cites; the two regulators' own records behind PubChem's.
- **Estimates:** the real drop size of an alcohol solution, the concentration at which pink is first seen, the reviewer's bench sizes for the technique errors, and the meniscus's rise in the reading view have no measurement or source behind them.
- **Anything in a browser.** No component exists. The drawn colours, the reading view, the plume's fades, live regions, the bottle tile's heading on screen and the full-store behaviour of a real browser's storage were not seen.
- **Seeds and learners.** Seeds beyond 1 to 400 (fewer for some tests), and scripted learners other than the reviewers'.
- **Spec figures:** the count of 9 ties in 47 868 pairs; check 3 with three times outdoor CO₂ at strengths other than three.
- **The institution list.** The optional local list of institution names was not present, so only the built-in list was applied.
- **Whether a failed trial with no named cause can be reached**, the implementers' open question.
- **The earlier stages' own claims:** that each test was seen failing first, and the counts of deliberate breaks, were not repeated. The owner's disposition of the review of Tasks 1 to 8 was not before R3, who checked that stage against its report and the code. R1 ran the engine's test files and did not read them line by line, and reviewed only the files on the gate's list.
- **Whether anything was pushed, and CI.**
- **The institutional documentation.** Whether it says what is not true to a bench is Task 22's.

## For the owner to read

### What to read (D4, D15)

1. **The primer**, `src/chem-data/titration/primer.ts`, the `text` of each paragraph. The plan asks in particular for: the card on titrating to the endpoint; the sentence that the acid was itself standardized; "about pH 8.3"; the word "conditioning"; the 30-second wait that in this model cannot fail; and what the safety card does and does not cover.
2. **The three hazard notes**, `bottles.hcl`, `bottles.naoh` and `bottles.indicator` in `docs/research/phase-3/titration.json`, each under `hazards.note`.
3. **The heading over each bottle's statements**, the same three bottles' `classifiedAs`: the acid's says the statements are those of hydrochloric acid from one regulator's entry; the other two say the statements are those of the pure substance.
4. If the label of the indicator the lab stocks is to hand: what it prints for the solvent, and whether the percentage is weight per volume.

### Sentences written or changed at this stage, which no reviewer has read

- Primer, first card: the three cards are named in a new order, and the sentences defining an acid and a base are reworded.
- Primer, endpoint card: the indicator changes colour "at the equivalence point, or very close to it".
- Primer, titrating card: what the titre is; what M means; that the phenolphthalein is an indicator that turns pink once the acid is used up; and four sentences on the bench's rinse and what to do if it thins the pink away.
- Primer, glassware card: a new fourth paragraph on what is larger here than at a bench, reworded on 2026-10-05 to name the three mistakes and to say that a trial with one of them in it does not count even when its result is close; and "how many moles of acid are there" in the second.
- Primer, precision card: the example of a mistake repeated is now a miscopied molarity.
- Primer, safety card: the rinse sentence; H314 named by code with "corrosive to the skin and the eyes"; "a supplier's safety data sheet for a solution of this kind".
- The three hazard notes: the rinse sentence in the acid's and the base's; the indicator's opening and its list of hazards.
- `src/app/lab/titration/messages.ts`: the sentence that closes each of the three technique causes. After the owner's answer of 2026-10-05: `OUTCOME_TEXT.notCounted`, which now gives the whole counting rule; `OUTCOME_TEXT.closeWithTechniqueError`; and `OUTCOME_TEXT.largerHere` and `largerHereAndShown`, the closing sentence in its two forms, with the three technique causes as they read without it.
- `src/app/lab/titration/benchText.ts`: `undoneText`.

### Open decisions

1. **Does a trial that passes with a technique error named in it count toward the three?** Answered by the owner on 2026-10-05: it does not. See "Closed by the owner's answers" above. The narrower remedy for F8 alone, ending the bubble with the trial, was not needed and spec 7.3's table is unchanged.
2. **Should the engine hand the app less about the flask?** (F6, N9.)
   - As built, and as the plan's Global Constraints accept: the exact flask volume and the pink concentration of a pink flask reach the app for the drawing and are never printed. Someone who reads them out of the page can work back the pipette's delivery and the NaOH molarity before any trial is graded.
   - Against changing: neither passes a trial; a failed trial's percent error gives the same molarity by design; the seed is in the export.
   - For changing: it undoes the reason spec 7.3 gives for holding back a passed trial's percent error. The change is a depth in a few steps in place of a concentration, and a volume to the whole mL; it alters the bench view's fields and one test value of the plan's Task 13.
3. **What the safety card says of the indicator.** (F15.) It names cancer and flammability. The sheet also carries statements on fertility and the unborn child, on damage to organs and on eye irritation, all of which the bottle's note gives. Either the card names them too, or the reproductive one at least, or it says that the sheet lists more and the note under the bottle gives it in full, or it stays as it is.
4. **Wording the reviewers would change and this stage did not.** Each is the owner's call as the person who runs the lab.
   - The calculation card: say that the average is rounded first only because the notebook works it that way; say that four decimal places is this lab's convention, where a report would keep four significant figures; open with the equivalence point, which the endpoint stands for. (N6.)
   - The titrating card: a figure for when the 5 mL pour is safe, for example only while more than 7 mL short of the estimate. (N12.)
   - "That does not need doing now." for a pipette that was never rinsed; "no pink remains" for a flask that was never pink. (N7.)
   - A wrong HCl molarity carried from Challenge into a Guided trial is shown as done and makes the trial not count. Guided could clear it on the change of mode, or show the step as not done. (N7.)
   - "The water does no harm" stays in the titrating card, now followed by the sentences on the 10 mL rinse. Whether 10 mL is the right portion is D3's.
5. **Two record notes R1 would tighten.** The strength note could say which check its range is for, or give the range in grams per 100 mL (N1). The K_w note could say the constant is used as a product of concentrations with no activity correction (N3). Neither changes a value.
6. **Home and a record the lab will refuse.** Home shows "in progress" for a record of the right version that fails the lab's schema, until the lab page has opened and set it aside; spec 10 says such an entry shows as not started. Either the spec is worded to match, since Home cannot load the lab's schema without loading the lab, or the lab page becomes the only place that says a run exists. (N10.)
7. **Two things this stage did that the owner may want to take back.**
   - A wash of water now clears the trial's last addition in the engine (F11 to F13). R3 had marked that change as the owner's.
   - A fingerprint of the cited pages is kept (F4). It holds hashes and no text, and D13's rule that no copy of those pages is kept still holds; but it is a new kind of file in the sources folder, about 350 kB, and the owner may prefer the rule to be checked by hand at each change of the primer.
8. **An independent read of the new sentences**, by the owner or by a reviewer, before the gate closes.
