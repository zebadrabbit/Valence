# Gate A: independent chemistry review of the titration lab

2026-10-05. The gate of `docs/superpowers/plans/2026-10-04-phase-3-titration-lab.md`, held after Tasks 1 to 13 and before any screen is built.

**The gate is not closed.** Both must-fix findings are fixed and tested. Of the thirteen should-fix findings, nine were fixed at the gate, two (F7 and F8) are closed by the owner's answer of 2026-10-05, and two were decided on that day without the owner, each with its reason: F6 is accepted as built, and for F15 the safety card was reworded, which the owner reads. The owner also answered that the indicator's catalogue listing is cited and not kept, and by the same reasoning the quotation fingerprint is not kept either. No finding waits on the owner. What keeps the gate open: the owner has not yet read the primer and the hazard notes; five questions are open for them; and the sentences written since the review have been checked by tests and by running the reviewers' own probes again, but no independent reader has read them. All three are set out in the last section.

## How the review was done

Three reviewers, none of whom wrote the code under review, worked at commit `036c706`. None changed a tracked file.

| | What they were given | What they did |
| --- | --- | --- |
| R1, chemistry | Spec section 7, the authored and generated record, the manifest and kept copies, the pH solver, the engine, the primer and the five wording files. Not the designs, the spike or the plan | Fetched every source afresh, wrote an independent model of the flask and of whole labs, and wrote down the direction and rough size of each technique error from bench chemistry before reading the engine or the sentences |
| R2, text and rules | The same files. Not the designs, the spike or the plan | Read every learner-facing string from a dump, scanned all written text for runs of six words shared with a source, and attacked the counting and typed-molarity rules through the public surface on seeds 1 to 400 |
| R3, Tasks 9 to 13 against the plan | The plan and the branch | Ran the whole build, checked every interface and test value of Tasks 9 to 13, walked 247 100 states of the join between engine and bench words, and probed storage |

Findings are numbered F1 to F15 (must-fix and should-fix) and N1 to N15 (notes). Each fix was written test-first: the test was seen failing, then the change was made. After the last fix `npm run lint`, `npm run build` (68 test files, 1922 tests, type check, production build), `npm run build:data`, `npm run build:expected` and `npm run cross-check` pass, and the generated files show no diff. Before the gate the count was 67 files and 1774 tests. After the changes that followed the owner's answers the same five commands pass with no diff: 68 test files and 1948 tests on a machine where the quotation fingerprint has been made, and 1816 passed with 132 reported as skipped where it has not, as in CI.

## Findings and what was done

### Fixed

**F4 (must-fix, R2). The primer's support lines repeated their sources' wording.** Thirty-two runs of six or more consecutive words, one of them a whole caption, against pages as served on 2026-10-05.

- Reproduced: the new test failed on 25 support lines and on three shown sentences outside the safety card.
- Done: each line is reworded. `src/chem-data/titration/quotation.test.ts` now holds every shown paragraph, every support line (what it says the passage establishes, and every "This lab:" line) and the three hazard notes to the rule: none repeats a run of six words of a page it rests on. The pages are not kept, so the test compares against `docs/research/phase-3/sources/quotation-fingerprint.json`, a hash of every six-word run in the seventeen pages the primer cites, the three safety data sheets and the three PubChem records. `scripts/fingerprint-sources.mjs` writes it from pages saved outside the repository. This record said here that no text can be read back from the fingerprint. That was wrong, and the file is no longer kept: see "The quotation fingerprint is not kept either" below. A passage's location is left out of the test: a heading named there is the source's own name for the place.
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
  - The engine: a wash sets the trial's `lastAdditionUl` to 0. After a wash there is no plume and no cue, and the line gives the colour alone until titrant runs again. No stored field is added and no rule of the spec changes. R3 marked this change as the owner's because it touches the engine; it was made here because the defect is the plan's Review Focus 5 (words and picture that disagree) and the alternative left a false sentence on the screen. It is one line to take back, and it is listed in the last section among what the owner can take back.
  - The bench's words: `undoneText(before)` in `benchText.ts` is the sentence a wash, a drop or a half-drop adds when it undid a swirl and wait that had shown the pink to last: the wait no longer counts and a final reading recorded after it no longer applies. It is empty otherwise, so the drops of an ordinary titration say nothing of it. Task 19 puts it on the message line; the plan says so. (Its ending was changed later the same day, and it now takes the view after the action too: see "Four wordings of the bench" below.)
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

**Answered by the owner: a trial with a technique cause named in it does not count toward the three.** The three causes are a burette not conditioned, a tip bubble and a pipette not rinsed. Such a trial can still be within 1.0% and is then shown as passed and not counted. This closes F7 and F8, which were found as follows.

**F7 (should-fix, R2). A second pair of technique errors cancels.** Reproduced with R2's test on seeds 1 to 400: an uncleared tip bubble with an unrinsed pipette passed and counted at 381 seeds, the known pair (unconditioned burette with unrinsed pipette) at all 400, and each whole error alone at none. Only one such trial is possible in a lab.

**F8 (should-fix, R2). A tip bubble partly run out into a discarded flask leaves a smaller bubble that passed and counted.** Reproduced: after 16 stream additions and a discard the next trial passed and counted at 400 of 400 seeds with the tip bubble named; after 12, at 72; after 8, at none; and a whole lab was completed this way at 100 of 100 seeds. Readings are honest throughout.

- Done, in the engine: `countingTrials` leaves out a trial that has a technique cause, by `techniqueCauses`, which moved from `select.ts` to `actions.ts` so that the counting rule and the named causes use one test. Nothing else of the model changed: the bubble's row in spec 7.3's table is as it was.
- Done, in the words: `OUTCOME_TEXT.passedInSpite` and its branch are gone. The does-not-count sentence now gives the whole rule, the three technique steps beside the readings and the label. After the causes of a trial within 1.0% that has a technique cause comes one new sentence: mistakes in technique can push a result in opposite directions and cancel, and a small one may not move the result far, so a result this close does not show that the technique was sound. It covers the pairs and the part bubble, does not scold and says nothing of luck.
- What is released: the true molarity and a passed trial's percent error are given at the same count of three, so neither is given by trials that do not count. A test holds that a lab with one such trial and two careful ones is in progress and gives neither.
- No dead end: from every state above, a learner who then conditions a burette that is not conditioned, clears whatever air is in the tip and pipettes with the pipette the last aliquot left wet with acid has three trials that count, and the lab completes on the third. What is left of a part-escaped bubble can be cleared in the next trial as the engine stood: `clearTipBubble` is refused only for an empty burette, a tip with no air, or once titrant has run in the open trial. Nothing had to be changed for it.
- Re-checked, by tests seen failing first for the stated reason (the trial counted): hand-worked cases for seed 1 in `actions.test.ts` (the pair that cancels exactly, titre 25.70 and 0.0949; the bubble with the pipette, titre 25.80 and 0.0946; the part bubble, titre 25.85 and 0.0944); the outcomes and what is withheld in `select.test.ts`; and in `acceptance.test.ts`, over seeds 1 to 100, the two pairs at 2 and at 3 drops (within 1.0% in 200 and in 186 of 200 runs, counting in none), the part bubble after 16 stream additions, a lab of three part-bubble trials, and the way out of each. The walk of `actions.test.ts` now also holds, from the stored fields and not through the engine's own test, that no trial that counts has a technique error in it; on the burette cut short it failed before the change. The check that a part bubble can be cleared passed before the change, as a check should.
- Re-checked, with R2's probes run again on seeds 1 to 400: the known pair is within 1.0% at 400 and counts at 0; the bubble with the pipette is within 1.0% at 381 and counts at 0; after 8, 12, 16 and 18 stream additions into a discarded flask the next trial counts at 0 of 400 each; a lab completed with the tip bubble named in all three counted trials: 0 of 100. R2's leaning of the readings 0.02 mL either way changes how many pass (186 to 400) and not that none counts.
- Expected values changed, because the decision changes the rule they pinned: in `messages.test.ts`, a pass with two technique causes was expected to count and to lead with the in-spite line, and reads "Passed, not counted" where it read "Passed"; in `select.test.ts`, a passing trial was held to count exactly when it had no misread and the right label, and is now held to count exactly when no cause is named. No other expected value changed.

**Answered by the owner: the indicator's catalogue listing is cited, not kept.** The supplier's page was a kept copy in the sources folder, and the build checked the stored strength against it.

- Done: `ricca-5600-listing.html` is out of the repository. Its manifest entry has no `file` and no `sha256`, and reads like the entries for the NIST pages and the IAPWS release: the address, the day the page was read (2026-10-04), and rows for what it prints, which are 0.5, the basis (w/v), the solvent 50% (v/v) Alcohol in the same heading, and 5 g/L lower on the page, each with where it is in this project's words. The sha256 of the page as fetched is kept under a field of its own, `fetchedSha256`, because `sha256` in the manifest is the hash of a kept file and there is none.
- What is lost: the build's check of the strength against a copy (`checkStrength`) is gone. The figure now rests on a page read on 2026-10-04 and is no longer re-checked by the build; a page that changes is not noticed. The record's note on the strength, the sources README, the plan (D4, Tasks 2 and 4) and the spec (5.2, 7.3) say so.
- Re-checked: the case in `inputs.test.ts` that held the kept copy to print the strength now holds the entry to the read-and-not-kept pattern and the folder to hold no HTML file; it and a case that `checkStrength` is gone were seen failing first. `npm run build:data` writes the new citation and note and nothing else.
- History: the file is still in the branch's earlier commits. It is taken out of them separately, before anything is pushed (the plan's Task 23).

**The quotation fingerprint is not kept either, by the same reasoning.** The fix for F4 kept a fingerprint of the cited pages in the sources folder and said that no text can be read back from it. A re-check showed otherwise: starting from five words of a page and trying each word of a dictionary as the sixth, the fingerprint says which is right, and stretches of the pages come back a word at a time. A file from which the pages can be rebuilt is too close to a copy of pages that are cited and not kept.

- Done: the file is out of the repository and its path is in `.gitignore`. `scripts/fingerprint-sources.mjs` still writes it there. `quotation.test.ts` reads it if it is present and runs as before; where it is absent, the cases that need it are skipped and the run reports them as skipped. The check of the checker itself, which needs no pages, always runs.
- What is lost: CI no longer holds the no-quotation rule for the primer and the hazard notes. It is a check made when the words are written, on a machine that has the pages. The plan's Global Constraint says so.
- Corrected: every statement that no text can be read back from the fingerprint, in the sources README, in `scripts/titration-lib.mjs`, in `scripts/fingerprint-sources.mjs` and above in this record. The README says why the file is not kept and how to make it again.
- Re-checked: with the file moved away the test as it stood failed on its import, and so did the type check; after the change, 2 cases pass and 132 are skipped without the file, and all 134 pass with it. Every sentence written at this stage was run against the fingerprint before it was committed.
- History: the file is still in the branch's earlier commits. It is taken out of them separately, before anything is pushed (the plan's Task 23).

### Decided without the owner, 2026-10-05

These were not put to the owner. Each is given with its reason, so that the owner can take it back.

**F6 (should-fix, R2) and N9 (note, R3). The flask view gives away the pipette's delivery and, once the flask is pink, the hidden NaOH molarity.** Reproduced with R2's test: exact at 400 of 400 seeds for both. The plan's Global Constraints accepted the pink concentration of a pink flask as a number the drawing needs, and its Task 13 pins the exact flask volume. The header comment in `select.ts` claimed that no selector hands over such a number; it was corrected at the gate to say which two do (commit `3ecc4f8`).

- Decided: accepted as built. The engine hands the app no less.
- Reason: neither number can make a trial count. That takes honest readings, within 0.02 mL of the meniscus, and the notebook's own arithmetic, and from 2026-10-05 no technique error either. And a failed trial's percent error gives the same molarity at once, by the owner's decision D1. Handing over a depth in a few steps and a volume to the whole mL would change the bench view's fields and a test value of the plan's Task 13 to close a route that D1 leaves open by design.
- Done: the plan's Global Constraint "No answer leaves the engine" now says what the comment at the head of `select.ts` says: three numbers reach the app for the drawing (the meniscus level, the flask's exact volume, the pink concentration of a pink flask), the last two can be worked back by someone who reads them out of the page, and that is accepted. The comment no longer calls it the owner's decision. Task 17 of the plan now says that the strength, `volumeUl` and `plumeKey` are never rendered as text, with a markup test for it. Spec 7.3 says the same under Colour.
- Not changed: no code but that comment.

**F15 (should-fix, R3). The safety card named two of the indicator sheet's hazards and not the other three.** Confirmed against the saved sheet: it carries five hazard codes, and the card spoke of cancer and flammability only. The bottle's note names all five.

- Decided: the card must not name some of the sheet's hazards and leave out others. It now says that a supplier's safety data sheet for a solution of this kind lists it as flammable and as a hazard to health over the long term; that it says, among other things, that the solution may cause cancer and may harm fertility or an unborn child; and that the note under the indicator bottle gives the full list. The words are the project's own. The codes stay in the bottle's note, which is unchanged.
- Reason: a reader who sees cancer and flammability named takes the list to be whole. Naming the kinds, the two gravest by name, and pointing to the note says no more than the sheet and hides nothing. What the safety card covers is still the owner's to say (D15), so the owner reads this paragraph.
- Done with it: the paragraph's support line for the sheet now gives all five of the sheet's hazards in the project's words.
- Re-checked: a new case in `primer.test.ts`, seen failing first; the no-quotation test, run with the fingerprint made, passes on the new paragraph and its support line.

**Four wordings of the bench (N7, and what F11 to F13 left).** Decided on 2026-10-05 without the owner, each because the sentence as it stood said something false in a state a learner can reach.

- `undoneText` ended "Swirl and wait again before the final reading." also where a wash had thinned the pink away, and a wait on a colourless flask finds nothing. It now takes the view after the action as well. While the flask is still pink it ends as before; where the wash left it no longer pink it says that the water has thinned the pink until it no longer shows, so add a half-drop, which is what the primer's titrating card says. It says nothing when the action ended the trial.
- On that thinned flask Guided's hint shows again, and it said "Go on a drop at a time" beside "add a half-drop". It now says "Add no more than a drop at a time, and change to half-drops once the pink is slow to fade": a limit, which the half-drop keeps to.
- "no pink remains" is now "no pink", in the status line and in the swirl's message. The model's flask is closed, so a wait finds no pink only in a flask that was not pink before it, and a flask with no NaOH in it yet can be swirled. One wording serves every case, so nothing has to tell them apart.
- The refusal of a pipette rinse read "That does not need doing now." also for a pipette that was never rinsed. The engine gives the one reason for a rinsed pipette and for one an aliquot left wet with acid, and the words are handed nothing else, so the sentence is now true of both: the pipette is already wet with acid, so rinsing it now changes nothing for this flask.
- Re-checked: seven cases in `benchText.test.ts`, `benchView.test.ts` and `messages.test.ts`, seen failing first. Expected values changed because the wording they pinned changed: "no pink remains" in three places, and `undoneText` called with two views.

**Primer wording from the reviewers' notes (N6, N12).** Decided on 2026-10-05 without the owner, each kept small because the owner reads the primer.

- The titrating card gives the 5 mL pour a figure: "Run in 5 mL at once only while you are more than 7 mL short of your estimate." Reason: the card told the learner to use the pour only while several millilitres short, and a learner in Challenge has no hint to stop them. The figure is the model's own arithmetic. The estimate is furthest past the real endpoint for the strongest acid, the strongest NaOH and the pipette's smallest delivery, 1.28 mL, and 1.78 mL with a pipette that was not rinsed; the other two technique errors do not bring the endpoint forward; so 5.00 mL run in from more than 7 mL short ends at least 0.22 mL before it. `primer.test.ts` repeats the arithmetic from the record. `acceptance.test.ts` runs it in Challenge over seeds 1 to 100 and all eight combinations of the three technique steps: no pour ends with the flask pink or the trial over, and the nearest any pour comes to its flask's equivalence volume is 1.02 mL.
- The calculation card opens "The moles of NaOH added equal the moles of HCl in the flask at the equivalence point", and then says that the endpoint you measure stands for the equivalence point. It said "At the endpoint the moles ... equal", which is true of the equivalence point. It also says that four decimal places is this lab's convention.
- The precision card says the average is rounded to four decimal places first only because that is how the notebook works it.
- Re-checked: four cases, seen failing first. The no-quotation test, run with the fingerprint made, refused the first wording of the calculation card's opening, six words of which run together in a page the card cites; it was reworded and passes.
- Not changed: `workedLines` in `messages.ts` still says "at the endpoint the moles of NaOH added equal the moles of HCl in the flask". It is outside the primer; it is listed under "Left as built" in the last section.

**N10. Home and a record the lab will refuse.** Decided on 2026-10-05 without the owner: accepted as built, and spec 10 is worded to match. Home shows "in progress", or "completed", for a record of the right version that fails the lab's schema, until the lab's page has opened and set it aside; from then on it says not started. Reason: Home reads the version and the status only. To do better it would have to hold the record to the lab's own shape, and that means loading the lab's schema into the home page, which the plan's Lazy rule forbids. The other remedy, making the lab's page the only place that says a run exists, would take the status off the list of labs. Only a record made or damaged by hand is affected, and nothing is lost: the page keeps the old value under a backup key. A case in `src/app/lab/titration/storage.test.ts` pins it; it passed as written, since it describes what was built.

### Notes

| | Note | Disposition |
| --- | --- | --- |
| N1 (R1) | The strength note's claim that the endpoint test passes from 0.1% to 1% has almost no margin at the low end if 0.1% is read by weight: one extreme flask goes 0.2 µL over the bound of check 4 | No change to the model or the note. The claim holds as the record states the strength, by volume. Listed under "Left as built" in the last section |
| N2 (R1) | The listing's 0.5 g per 100 mL and the sheet's 0.56% by weight imply a density a little below what such a mixture has | No change. Within what a sheet's composition table rounds to; the endpoint tests pass at either figure |
| N3 (R1) | K_w's unit is empty while its note speaks of the molar scale, and the note does not say the constant is used as a product of concentrations | No change. Listed under "Left as built" in the last section |
| N4 (R1) | The carbonic acid page's body figures do not agree with each other or with its infobox | No change. The record reports them as printed and does not rest on them |
| N5 (R2) | Shorter runs shared with sources in shown text | Partly fixed with F4: the test covers shown primer text, so the three primer sentences were reworded. The checklist's step for the indicator, which is the spec's own step 4, and the opening words of the meniscus sentence are generic and unchanged. The record's figures with their units are data |
| N6 (R2) | Three points on the calculation text: rounding the average first, four decimal places against significant figures, and "at the endpoint" where the equivalence point is meant | Reworded in the primer on 2026-10-05: see "Primer wording from the reviewers' notes" |
| N7 (R2) | A wrong HCl molarity carried from Challenge into Guided is shown as done; "That does not need doing now." for a pipette that was never rinsed; "no pink remains" for a flask that was never pink | The second and third are reworded: see "Four wordings of the bench". The first is unchanged: the plan lists it as not built, the trial's feedback names the label, and the trial does not count |
| N8 (R2) | A record made by hand can make the notebook show the hidden molarity | No change. Inside the risk spec 7.1 accepts: the stored record holds the seed |
| N9 (R3) | The flask view's leak, confirmed from the bench's fields alone | With F6: accepted as built, 2026-10-05 |
| N10 (R3) | Home says "in progress" for a record of the right version that the lab will refuse, until the lab page has been opened | Accepted, 2026-10-05; spec 10 says so |
| N11 (R3) | The stored schema lets through numbers no run can make (twelve fields with no upper bound, water that is not a whole portion) | No change. Nothing threw and no text was wrong for a record a run can make |
| N12 (R3) | The titrating card gives no figure for when a 5 mL pour is safe, and teaches a small wash where the bench's is 10 mL | The second is fixed with F11. The first: the card now gives 7 mL, worked from the model and tested over seeds (2026-10-05) |
| N13 (R3) | Dead code and duplicated test helpers; `ACTION_TEXT.swirlAndWait` is a sentence no caller should show | No change. For Task 19 and the branch review at Task 23 |
| N14 (R3) | Expected values changed, removed or tested less directly since the plan was written, none of them in Tasks 9 to 13 | No change. Each is as its own report said |
| N15 (R3) | `benchViewOf` reads four stored fields directly, where the plan says selectors and `can` alone | No change. All four are the learner's own doing |

One thing R3 raised under F12 was carried forward: on a reload the stored last addition gives a plume again, so a plume drawn on mount would replay once. Decided on 2026-10-05 without the owner: it is not drawn. Task 17 of the plan now says that a plume animates only when `plumeKey` changes after the stand is mounted, never on first render, and its markup test expects no plume element on a first render where it expected one. The reason: a plume is the picture of an addition being made, and a reload makes none; the status line still gives the last addition's cue. No code exists yet for it to change.

## After the owner's answers: what was done, by commit

The commits of 2026-10-05 that followed the owner's two answers, in order. Each leaves lint, the build and the three data scripts passing with no diff. The ids are those of the local branch; the plan's Task 23 has them rewritten when the two removed files are taken out of the branch's history.

| Commit | What it did |
| --- | --- |
| `bb20934` | A trial with a technique cause named in it does not count (the owner's answer on counting; F7, F8) |
| `975fd0b` | The closing sentence on what is larger here than at a bench is said once, after the causes |
| `c67625f` | The glassware card names the three mistakes and says such a trial does not count |
| `5466aea` | The indicator's listing is cited, not kept (the owner's answer on the listing) |
| `ec13c95` | The quotation fingerprint is not kept; its test is local |
| `02dfd20` | What the flask view hands the app is accepted (F6, N9) |
| `4edb5f4` | The safety card's paragraph on the indicator (F15) |
| `13d29d2` | The plan's stand draws no plume on first render |
| `85dc971` | Four wordings of the bench (N7) |
| `80df353` | Primer wording from the reviewers' notes (N6, N12) |
| `a5fbc52` | What Home shows for a record the lab will refuse (N10) |
| `a4303b6` | The seven unsourced points, the owner's list and questions, and the plan's Tasks 21 and 23 |
| `2065725` | The feedback tells a technique cause by the warnings' own table; no sentence and no behaviour changed |
| the commit after it | These last two rows |

## The last check, 2026-10-05

After the commits above the branch was checked once more, at `44971d2`. One check read every learner-facing sentence in the order the primer gives and walked the engine with the advice in it. The other attacked the counting rule again and ran the build from a fresh clone. Between them they made 22 findings: one must-fix, ten should-fix and eleven notes. They are numbered here L1 to L11 (must-fix and should-fix) and M1 to M11 (notes). Each must-fix and should-fix was reproduced before anything was changed, and each fix was written test-first.

### Fixed

**L1 (must-fix). The primer sent the learner to the bench without the card that tells the technique steps.** Its first paragraph named three cards to read first and said that the others explain why the lab is done the way it is and can wait. "Conditioning, rinsing and the tip bubble" is the only card that says to condition the burette, rinse the pipette, clear the tip and refill, and Challenge has no checklist.

- Reproduced: a Challenge learner who takes none of the three steps and is careful and honest otherwise fails the first trial at 200 of 200 seeds, and the second after a refill at 200 of 200 with the burette named.
- Done: the first paragraph names four cards, in the order Reading the burette; Conditioning, rinsing and the tip bubble; Titrating to the endpoint; The calculation, and says only that the other eight can wait. The glassware card is now read before the card that says what the titre, the endpoint and M are, so two of its sentences were reworded to do without those words: water makes the acid more dilute and does not change how much acid is there; and a burette that runs out in the middle of a trial leaves that trial with no result.
- Re-checked: three cases in `primer.test.ts`, seen failing first (three cards named where four were expected; no order for the fourth; "moles" in the glassware card). A case in `acceptance.test.ts` pins the reason over seeds 1 to 100; it passed as written, since it describes the engine as built.
- Expected value changed, because the finding changes the rule it pinned: `primer.test.ts` held the first paragraph to name exactly three cards and now holds it to name exactly four. The plan's Task 10 said three and says four.

**L2 (should-fix). The cue went back to "pink fades at once" at each change to a smaller addition, and no sentence said so.** The primer said that closer to the endpoint the pink takes longer to clear, and to go to single drops when it lingers. The same cue was also given two answers: the overshot feedback and Guided's hint said to change to half-drops once the pink is slow to fade.

- Reproduced on seed 7: the stream's 81st addition reads "pink fades slowly"; the 32 single drops after it read "pink fades at once" before one fades slowly; the first 7 half-drops fade at once again.
- Done: the titrating card says that a single drop is far less NaOH than the stream runs in, so at first its pink clears at once again, that this does not mean the endpoint is far off, and to change to half-drops when a drop's pink lingers too. The overshot sentence now reads: run the trial again, close the stopcock when the pink is slow to fade, go on by single drops, and change to half-drops when a drop's pink is slow to fade. Guided's hint ends "change to half-drops when a single drop's pink is slow to fade"; it is still a limit, so it still agrees with the half-drop that `undoneText` asks for on a thinned flask.
- Re-checked: three cases, in `primer.test.ts`, `messages.test.ts` and `benchText.test.ts`, seen failing first because the sentences were not there. A case in `acceptance.test.ts` runs the advice by the cue alone in Challenge, seeds 1 to 100 at 2 and at 3 drops: the first drop after the stream's "fades slowly" fades at once at every seed, as many as 35 in a row do, and every run reaches its endpoint, passes and counts. It passed as written: the engine is unchanged.
- Not sourced: that a single drop's pink clears at once again is the lab's model of the cue, and the card's support line says no source was read for it. It is the eighth such point of the primer, listed under "What nobody checked".

**L3 (should-fix). Four terms were used on the cards read first before anything explained them:** the 25.00 in the estimate, the endpoint (used in three paragraphs of the titrating card and defined in the fourth), the equivalence point (defined only on a card that is not read first), and the pipette, with NaOH and HCl used without their names.

- Reproduced by reading the cards in the stated order.
- Done. The glassware card, now the first of the four to speak of either solution, opens: two pieces of glassware measure the solutions; the burette delivers the sodium hydroxide solution (NaOH); the pipette measures out the 25.00 mL of hydrochloric acid (HCl) that goes into the flask. The titrating card opens with the endpoint, the first faint pink in the flask that lasts, and with the sentence on the indicator, which moved up from its second paragraph with the two passages it rests on; it names the NaOH again and says that 25.00 is the millilitres of acid in the flask. The calculation card says at its first use that the equivalence point is the moment when exactly enough NaOH has gone in to react with all the acid.
- The pipette is said by what it does, not by what it looks like: no passage was read that describes one, and the support line gives the 25.00 mL as the lab's set-up.
- Re-checked: a case in `primer.test.ts`, seen failing first (the glassware card did not name the NaOH), holds each of the six glosses to stand at or before the word's first use on its card. The no-quotation test, run with the fingerprint made, passes on every changed paragraph and support line.

**L4 (should-fix). Two causes named a mistake without saying what the step is.** After a Challenge trial the burette's cause said "was not conditioned" and "until the burette is conditioned", and the bubble's said only that there was a bubble at the initial reading. Guided's warnings say how each step is done; Challenge never shows them.

- Reproduced: the feedback of a seed 7 trial with all three causes had no line that says how to condition a burette or clear its tip.
- Done: the burette's cause opens "The burette was not conditioned: it was not rinsed with a little of the NaOH solution before it was filled." The bubble's ends "Before an initial reading, run a little NaOH through the tip to push any bubble out." It says "any bubble" because the cause is read after the trial, when the bubble has usually left. The pipette's cause already says what was not done.
- Re-checked: a case in `messages.test.ts`, seen failing first, on the two sentences and on the feedback of that seed 7 trial.

## What the reviewers confirmed

**Constants and sources (R1).**

- The generated record equals the authored input in every bottle, constant and parameter. All eight kept copies match their hashes (seven since 2026-10-05, when the listing went). Fresh fetches of the papers, the sheets and the data files are identical to the saved ones.
- K_w: the release's equations were coded and reproduce its six test values. At 25 °C they give 13.994 on the molal scale and, with the density NIST prints, 13.997 on the molar scale, which rounds to the stored value. The note's conversion and its direction are right.
- The indicator's two constants, their conditions and the form that is pink are as the paper prints them, and the notes say they are used unchanged. The molar mass, the drop volume, Henry's constant with its unit, and the CO₂ fraction for the stated year are as their sources print them.
- The carbonic acid constants: the kept page prints the stored figures; the note says that reading the first as the constant of dissolved CO₂ is the project's; the survey's database file bears both out at 25 °C.
- The indicator's strength: the listing, a kept copy at the time of the review, prints weight per volume, and the note says the bottle being such a solution is assumed. (The copy is no longer kept: see the owner's answer on the listing above.)

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
- **The primer's passages.** The wording of the support lines was compared with the pages; whether each location and each claim is right for its source was not gone through one by one. The points of the primer for which no source was read (the plan's ninth review item) were not judged one by one either. They are eight, with the one the last check added: that the faint pink of a real endpoint fades because the open flask takes up CO₂, and that this is why the rule gives a time; that a NaOH solution which has stood is standardized again; touching the hanging part-drop to the flask wall; the definition of relative deviation; which way an escaping tip bubble moves the reading; the glassware card's statements about a real bench (each mistake costs less there, a real tip holds less air than this lab's bubble, and a real burette that was not conditioned is less diluted at each refill); the titrating card's statement that a 10 mL rinse can thin a very faint pink until it no longer shows; and its statement that a single drop's pink clears at once again after the stream's has begun to linger.
- **The pages as they stood when the primer was written.** No copy is kept. The comparison, and the fingerprint, are of the pages as served on 2026-10-05. A page that changes later is not noticed. Text inside images, and runs broken by a sheet's layout, are outside the scan.
- **The fingerprint's limits.** A run of five words, or a close paraphrase, passes. A run that was never in a page can match by chance about once in 60 000 tries; it would then be reworded for nothing. Since 2026-10-05 the fingerprint is not in the repository, so the test runs only where it has been made again, and not in CI.
- **Sources not read:** the handbook the carbonic acid page cites; the two regulators' own records behind PubChem's.
- **Estimates:** the real drop size of an alcohol solution, the concentration at which pink is first seen, the reviewer's bench sizes for the technique errors, and the meniscus's rise in the reading view (`READING.meniscusRiseUl`, 0.08 mL of scale) have no measurement or source behind them.
- **Anything in a browser.** No component exists. The drawn colours, the reading view, the plume's fades, live regions, the bottle tile's heading on screen and the full-store behaviour of a real browser's storage were not seen.
- **Seeds and learners.** Seeds beyond 1 to 400 (fewer for some tests), and scripted learners other than the reviewers'.
- **Spec figures:** the count of 9 ties in 47 868 pairs; check 3 with three times outdoor CO₂ at strengths other than three.
- **The institution list.** The optional local list of institution names was not present, so only the built-in list was applied.
- **Whether a failed trial with no named cause can be reached**, the implementers' open question.
- **The earlier stages' own claims:** that each test was seen failing first, and the counts of deliberate breaks, were not repeated. The owner's disposition of the review of Tasks 1 to 8 was not before R3, who checked that stage against its report and the code. R1 ran the engine's test files and did not read them line by line, and reviewed only the files on the gate's list.
- **Whether anything was pushed, and CI.**
- **The institutional documentation.** Whether it says what is not true to a bench is Task 22's.

## For the owner to read

### What the owner reads (D4, D15)

These three, and nothing else, are what the plan asks the owner to read at this gate.

1. **The primer**, `src/chem-data/titration/primer.ts`, the `text` of each paragraph. The plan asks in particular for: the card on titrating to the endpoint; the sentence that the acid was itself standardized; "about pH 8.3"; the word "conditioning"; the 30-second wait that in this model cannot fail; and what the safety card does and does not cover. Changed since the review, and so not read by any reviewer:
   - the safety card's last paragraph, on what the indicator's sheet lists (F15);
   - the glassware card's fourth paragraph, which names the three mistakes and says that a trial with one of them in it does not count;
   - the titrating card's sentence that gives the 5 mL pour its 7 mL, and its four sentences on the bench's rinse;
   - the calculation card's opening, on the equivalence point and the endpoint, and "Four decimal places is this lab's convention.";
   - the precision card's clause on why the average is rounded first, and its example of a mistake repeated;
   - the first card's opening, the endpoint card's "or very close to it", and the titrating card's sentences on the titre, on M and on the indicator.
2. **The three hazard notes**, `bottles.hcl`, `bottles.naoh` and `bottles.indicator` in `docs/research/phase-3/titration.json`, each under `hazards.note`.
3. **The heading over each bottle's statements**, the same three bottles' `classifiedAs`: the acid's says the statements are those of hydrochloric acid from one regulator's entry; the other two say the statements are those of the pure substance.

### Questions still open for the owner

Each is something only a person who runs this lab at a bench, or who answers for the repository, can settle.

1. **The tip bubble at a real bench.** The glassware card says that a real burette tip holds less air than this lab's bubble, and spec 7.3 and the record's rationale say that a real bubble leaves at once where this lab's 0.60 mL leaves evenly over the first 5 mL. No source was read for either. Does a real tip hold less than 0.60 mL of air, and does a real bubble leave at once?
2. **The rinse portion.** One wash of the flask wall is 10 mL (D3). Of 500 careful endpoints, 85 were washed colourless by one to three portions, and the primer and the bench now say what to do when that happens. Is 10 mL the right portion?
3. **The depth of the drawn meniscus.** `READING.meniscusRiseUl` in `src/app/lab/titration/buretteGeometry.ts` draws the meniscus as a band whose top is 0.08 mL of scale above its lowest point. The value was chosen by eye and has no source. The owner sees it at browser check 1 (Task 16); is 0.08 mL of scale what a meniscus looks like in a 50 mL burette?
4. **Three college laboratory manuals named as publishers.** The primer cites three laboratory manual pages hosted on LibreTexts, and their citations in the manifest and in `sources.json` name the college or university that publishes each: the sources `lmc-buret-use`, `smc-equivalent-mass-lab` and `ucd-standardization-lab`. The plan's rule is that the repository holds no institution-specific text, and a publisher named in a citation is the one place where a college's name appears in it. Are these three acceptable as cited, or should the primer rest on other pages?
5. **The indicator's own label.** What the label of the indicator this lab would stock prints: the solvent, and whether the percentage is weight per volume. The record takes the bottle to be a 0.5% (w/v) solution in 50% alcohol, as a supplier's catalogue page printed on 2026-10-04, and says that this is assumed.

### Decided without the owner, which the owner can take back

Each is recorded above with its reason: what the flask view hands the app (F6, N9); the safety card's paragraph on the indicator (F15); no plume on a reload; the four wordings of the bench (N7); the primer wording from the reviewers' notes (N6, N12); what Home shows for a record the lab will refuse (N10); and that the quotation fingerprint is not kept. Two from the gate itself stand as they were: a wash of water clears the trial's last addition in the engine (F11 to F13), which R3 had marked as the owner's; and the closing sentence on what is larger here than at a bench, now said once.

### Left as built

- A wrong HCl molarity carried from Challenge into a Guided trial is shown as done and makes the trial not count (N7). The plan lists a Guided re-check of it as not built; the trial's feedback names the label.
- Two record notes R1 would tighten: the strength note could say which check its range is for, or give the range in grams per 100 mL (N1); the K_w note could say the constant is used as a product of concentrations with no activity correction (N3). Neither changes a value.
- `workedLines` in `messages.ts` says "at the endpoint the moles of NaOH added equal the moles of HCl in the flask", where the primer's calculation card now says the equivalence point.
- "The water does no harm" stays in the titrating card, followed by the sentences on the 10 mL rinse.

### Sentences written or changed since the review, which no independent reader has read

The gate does not close until someone independent, the owner or a reviewer, has read these for chemistry and tone.

- Primer: every paragraph listed under "What the owner reads", item 1.
- The three hazard notes: the rinse sentence in the acid's and the base's; the indicator's opening and its list of hazards.
- The record: the note on the indicator's strength, which now says the listing was read on 2026-10-04, is not kept and is not checked again by the build; and the listing's citation.
- `src/app/lab/titration/messages.ts`: the three technique causes, as they read without a closing sentence; `OUTCOME_TEXT.notCounted`, which gives the whole counting rule; `OUTCOME_TEXT.closeWithTechniqueError`; `OUTCOME_TEXT.largerHere` and `largerHereAndShown`; `BLOCKED_TEXT['already-done']`.
- `src/app/lab/titration/benchText.ts`: `undoneText`, both endings; `SLOW_DOWN_TEXT`; "no pink" in the status line and in `swirlText`.
