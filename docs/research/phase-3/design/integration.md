# Phase 3 integration: what the three designs do not agree on, and one plan from them

Key `integration`. 2026-10-04. Input to the phase 3 implementation plan. No tracked file was changed; nothing was committed.

Read against: the spec (sections 4, 5, 7, 10 to 14), the spike record, the engine, bench and shell designs, and the three reviewers' corrections. Where two designs disagree the engine's design wins on engine matters and the spec wins on everything, as the brief says; each place I depart from that rule is marked **(departs)** with the reason.

Everything in this folder:

- `integration.md`: this file.
- `proto/join.ts`, `out/join.txt`: the engine prototype, the bench prototype's `BenchView` and status text, and the shell's notebook rows, joined and run. None of the three prototypes was modified.
- `proto-layout/`, `measure.cjs`, `out/layout.txt`, `shots/`: the bench prototype's drawings inside the shell's four slots under one set of layout rules, measured in headless Chromium at 16 window sizes (port 5299, own Vite cache, stopped afterwards).

## 0. Read first

**The designs fit together once one of them owns each thing.** The engine design is complete enough to be the single owner of the stored record, every rule about what can be done when, every typed-entry rule, the checklist and the trial outcome. The shell built second copies of all of these against an engine that does not exist; those copies go. The bench built a second reading parser and its own availability rules; those go too. What is left of the shell is the page frame, the notebook's components, the content and the wording. What is left of the bench is the drawings, the stream timer and the text alternatives.

**Four things I checked by running them** (section 1):

1. A `BenchView` can be built from the engine prototype with one adapter, and the bench's own status and description functions give sensible sentences on it at six states. The adapter has to reach past the engine's selectors for two values (`pinkConcentration`, `volumeUl`), so `FlaskView` needs them.
2. With the engine's plume (the whole addition's share of the acid left), the bench's no-timing route works: "Run in 1 mL" repeated until a pour ends on "pink fades slowly", then drops, then half-drops, gives a valid endpoint in 300 of 300 seeds. "Run in 5 mL" repeated the same way overshoots in 155 of 300. An open stream can be closed up to 3.2 s after the cue first shows without overshooting (0 of 300); at 3.6 s it overshoots in 177.
3. A careful endpoint is called "pink", not "faint pink", in 47 and 56 of 300 trials with the bench's name boundary at 1×10⁻⁵ M. At 1.5×10⁻⁵ M it is "faint pink" in 300 of 300 at 2 and at 3 drops.
4. One set of container-query rules puts the real bench drawings, a one-line Guided panel and a notebook with no reading fields on the page with no sideways scroll, no button outside its tile and a stand at least 416 px tall at every size from 768 to 2523 px wide. At 1366×768 the status line, the message line and the reading field are all in view with the bench starting 180 px down.

**Eight decisions must be made by the owner before the plan is written**, because each changes the stored record or the data (section 9, D1 to D7 and D9). The first is the one neither reviewer let the designers settle: a failed trial's percent error gives the true molarity, and a later trial can then be passed with a typed reading the burette does not show.

**One process point.** The harness that launched me asks for findings in the final output and not in report files. The brief asks for this file by name as the hand-off to planning, so it is written; the structured output carries the same conclusions in short form.

## 1. What I ran

### 1.1 The join (`proto/join.ts`, output `out/join.txt`)

Node 24.21, type stripping, the three prototypes imported as they are.

```
== 1. BenchView built from the engine prototype (seed 1, Guided): the bench prototype's own text on it
fresh lab                      status "Flask: empty."                                          final reading: endpoint-not-confirmed
filled, bubble in the tip      stand "…level is between the 1 mL and 2 mL marks. There is an air bubble in the tip below the stopcock. …"
                               meniscus "…between the 1.9 mL and 2.0 mL marks, about three quarters of the way down from the 1.9 mL mark. …"
mid-stream (40 additions)      status "Flask: colourless. Last addition: pink fades at once."   level 12563, flask volume 35102
endpoint, before swirl         status "Flask: faint pink. Last addition: pink persists."        engine persistence: unchecked; final reading: endpoint-not-confirmed
endpoint, after swirl          status "Flask: faint pink."                                     engine persistence: persisted; final reading: yes
overshot                       status "Flask: dark pink (overshot)."                           every control: trial-ended; Next trial: allowed
controls, mid-stream: Condition "mid-titration", Fill "mid-titration", Clear the tip "no-tip-bubble", Rinse pipette "already-done",
                      Pipette "flask-has-aliquot", Indicator "mid-titration", water / half-drop / stream / swirl: allowed
hclLabel before selectHcl: null; rinsePipette before selectHcl: hcl-not-selected

== 2. The notebook record, straight from engine state (seed 1, Challenge)
   Trial | HCl (M) | Initial | Final | Titre | NaOH (M) | Result
   1 | 0.0976 | 2.56 | 28.79 | 26.23 | 0.0930 | Not passed, -2.13% [burette-not-conditioned]
   2 | —      | 0.56 | —     | —     | —      | Invalid: overshot
   3 | 0.0976 | 2.04 | —     | —     | —      | In progress
   stored record: 1041 bytes

== 3. Measured pours and the open stream in Challenge, read from the status line only (engine plume, seeds 1-300)
   "Run in 1 mL" until a pour ends on "fades slowly", then drops, then half-drops: valid 300/300, overshot 0; pours stopped with 1255 to 2250 uL to go
   "Run in 5 mL" the same way: valid 145/300, overshot 155 (all 155 in the stream part, with no cue at the end of the pour before)
   open stream, closed 0 / 1 / 2 / 3 / 5 / 8 additions (0 to 3.2 s) after "fades slowly" first shows: overshot 0/300 each
   open stream, closed 9 additions (3.6 s) after: overshot 177/300

== 4. Guided: stream until the slow-down hint closes the stopcock (seeds 1-300)
   closed with 750 to 1000 uL to go; "fades slowly" had first shown with 2000 to 2250 uL to go, in 300/300 runs
== 4b. Status-line changes in a careful run, seeds 1-100: 5 in every run
     Flask: colourless.
     Flask: colourless. Last addition: pink fades at once.
     Flask: colourless. Last addition: pink fades slowly.     (the stream, 2.0 to 2.25 mL to go)
     Flask: colourless. Last addition: pink fades at once.     (the first single drops: a smaller plume)
     Flask: colourless. Last addition: pink fades slowly.
     Flask: faint pink. Last addition: pink persists.

== 5. Pink concentration at a careful endpoint (engine model), seeds 1-300
   2 drops: 1.06e-6 to 1.31e-5 M; "faint pink" with the boundary at 1e-5 M: 253/300; at 1.5e-5 M: 300/300; drawn strength 0.10 to 0.73
   3 drops: 1.01e-6 to 1.37e-5 M; "faint pink" with the boundary at 1e-5 M: 244/300; at 1.5e-5 M: 300/300; drawn strength 0.10 to 0.74

== 6. A learner who cuts the molarity off at four decimals instead of rounding it (careful trials, seeds 1-300)
   refused at half a unit in the fourth decimal (engine design): 153/300; at one unit (shell design): 0/300; cutting off costs at most 0.102%
```

What it shows:

- **The adapter is about thirty lines and has two real holes.** The engine's `flaskView` gives `pinkDepth` (concentration over 3×10⁻⁵ M, capped), while the bench needs the concentration itself and the flask's volume. The adapter got them through `flaskOf` and `flaskChemistry`, the same imports that would let a screen show the equivalence volume. So the selectors must carry them, and the screen must not import `flask.ts`.
- **The bench's `phase` and its own `canDeliver` rules are not needed.** `can(m, state, action)` answers for every control, with a reason, in both modes. The bench reviewer's proposed `availability.ts` would be a third copy of those rules.
- **Status and swirl-and-wait.** The status line says "pink persists" on the addition that reaches the threshold; the final reading stays blocked (`endpoint-not-confirmed`) until the wait. After the wait the engine's `persistence` is `persisted` and the bench drops the plume, so the line reads "Flask: faint pink." with nothing that says the wait was done. One sentence is missing there (conflict C17).
- **An invalid trial has no HCl molarity of its own** (`hclUsedE6` is set only when a molarity is checked). The HCl molarity is one value for the lab, so the notebook shows it once above the table, not as a column.

### 1.2 The layout (`proto-layout/`, output `out/layout.txt`, screenshots `shots/guided-*.png`)

The bench prototype's `Stand`, `ReadingView`, apparatus drawings and text modules, unchanged, inside a re-laid bench (five tiles, hazards on three, wrapping buttons, status, hint and message under the stopcock) and a stand-in shell (one toolbar row, one-line Guided panel, a notebook with the HCl and molarity fields only, the record across the bottom). The rules, all container queries:

```css
.lab-page { container: lab / inline-size; }
/* one column: guide, bench, notebook, record */
@container lab (min-width: 78rem)  { /* notebook beside the bench */ grid-template-columns: minmax(56rem, 83rem) minmax(21rem, 1fr); }
@container lab (min-width: 110rem) { /* checklist as a left column */ grid-template-columns: minmax(17rem, 1fr) minmax(56rem, 83rem) minmax(21rem, 1.2fr); }

.bench { container: bench / inline-size; }
/* below 54rem: shelf across the top (tiles auto-fill at 14rem), stand and reading view side by side under it */
@container bench (min-width: 54rem) { grid-template-columns: minmax(15rem, 1fr) minmax(22rem, 1.2fr) minmax(12rem, 0.85fr); /* shelf one tile across */ }
```

Guided mode, state "near" (slow-down hint showing), menu open, light theme:

| Window | Page | Layout | Bench | Stand | Reading view | Status, message, reading field | Notebook |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2523×1290 | 2267 | checklist column 412 | 1328, top 144 | 344×733 | 332×736 | in view | beside, 495 |
| 2200×1200 | 1944 | checklist column 272 | 1304, top 144 | 334×713 | 332×736 | in view | beside, 336 |
| 2016×1100 | 1760 | checklist column 272 | 1120, top 144 | 262×559 | 296×656 | in view | beside, 336 |
| 1920×1080 | 1664 | one-line guide | 1312, top 180 | 337×720 | 329×728 | in view | beside, 336 |
| 1800×900 | 1544 | one-line guide | 1192, top 180 | 257×548 | 247×548 | in view | beside, 336 |
| 1600×900 | 1344 | one-line guide | 992, top 180 | 211×451 | 247×548 | in view | beside, 336 |
| 1504×900 | 1248 | one-line guide | 896, top 180 | 196×418 | 223×495 | in view | beside, 336 |
| 1440×900 | 1184 | one-line guide | 1184, top 180 | 257×548 | 247×548 | in view | below |
| 1366×768 | 1110 | one-line guide | 1110×636, top 180 | 195×416 | 188×416 | in view | below |
| 1366×650 | 1110 | one-line guide | 1110×636, top 180 | 195×416 | 188×416 | message 73 px and field 93 px below the fold | below |
| 1280×720 | 1024 | one-line guide | 1024×648, top 180 | 195×416 | 188×416 | message 3 px and field 23 px below the fold | below |
| 1152×720 | 896 | one-line guide | 896×674, top 180 | 195×416 | 188×416 | message 43 px, field 39 px below | below |
| 1024×768 | 768 | bench in two rows | 768×948, top 208 | 195×416 | 188×416 | status 275 px below the fold | below |
| 900×700 | 644 | bench in two rows | 644×1106 | 195×416 | 188×416 | below the fold | below |
| 768×1024 | 512 | bench in two rows | 512×1323 | 261×557 | 209×463 | below the fold | below |

At every size: no sideways scroll, no tile whose content is wider than it, no button past its tile's edge. Challenge is 20 px higher throughout. With a Guided warning drawn under the message line the warning itself is 43 to 113 px below the fold at 1366 to 1920 px wide on the shorter windows; it takes focus, which scrolls it into view, and nothing above it moves.

What it shows:

- **Both reviewers' layout must-fixes have one answer.** The bench works in three columns from 54rem of its own width (864 px) once the shelf is one tile across and its buttons wrap. The notebook goes beside it from 78rem of page (a 1504 px window with the menu open), and the checklist becomes a column from 110rem (a 2016 px window). The bench reviewer's 1800 px viewport rule and the shell's 56rem and 100rem rules are all replaced.
- **The bench track must be the one that grows first.** My first rules let the side columns grow to their maximum before the bench (the shell design's `minmax(18rem, 24rem)` pattern), and at 1920×1080 the bench was held at 896 px with a 196×418 stand on a 1080 px screen, smaller than at 1800. With the bench as `minmax(56rem, 83rem)` and the sides as `fr`, it is 1312 px with a 337×720 stand.
- **The owner's 2523 px screen** gets the checklist, the bench at full drawing height and the notebook side by side with the record across the bottom, nothing scrolling (`shots/guided-2523x1290.png`).
- **A tablet in landscape with the menu open** (1024×768, 768 px of page) gets the two-row bench and must scroll once to titrate. With the menu collapsed the page is wider than 54rem and the bench is in three columns. Nobody has tried touch.
- **The bench drew without overflow at 579 px of page** (the 683×384 row of `out/layout.txt`, where my stand-in has no narrow page). So the 768 px rule is the spec's choice, not a limit of the drawing; that matters for D14.

Limits of this prototype are in section 10.

## 2. Conflicts, each with one resolution

"E" is the engine design, "B" the bench, "S" the shell; "rev" is that design's reviewer.

### Ownership

| # | Between | The problem | Resolution |
| --- | --- | --- | --- |
| C1 | E, S | **Two stored records.** E: `titrationStateSchema` is "the whole record saved under `lab:titration`", every trial the same shape, judgments worked out on reading. S: `TitrationProgress` wraps an assumed `TrialState`, stores typed text and a `TrialResult` per trial. | The engine's state is the record, whole: `useLabProgress(ACTIVITIES[0], titrationStateSchema)`. `progress.ts` is cut. Section 1.1 part 2 shows the notebook's rows come out of it with no stored result. |
| C2 | E, S | **Two sets of rules.** S's `flow.ts` (`checklist`, `canRecordInitial`, `canDeliver`, `canRecordFinal`, `promptBefore`, `checkTrial`, `invalidResult`) is built on `TrialFacts`, `factsOf`, `firstTrial`, `nextTrial`, `grade`, none of which the engine has. | Cut all of them. Controls ask `can`, Guided asks `warnings`, the checklist is `select.checklist`, a result is `trialOutcome`. The shell keeps wording keyed by the engine's identifiers. |
| C3 | E, B, S | **Three reading parsers.** E `parseReading → number \| null` (µL). B `reading.ts` returns a problem kind and accepts a comma. S `notebook.ts` works in hundredths. | The engine's `entries.ts` is the only parser. One refusal sentence covers every malformed reading. B's `reading.ts` and S's parsing are cut; the comma is not accepted. Formatting (µL to "24.37", E6 to "0.0949", percent error with a real minus sign) is one small `app/lab/titration/format.ts`. |
| C4 | B, S | **Readings typed in two places**: under the meniscus (B) and in the docked notebook (S). | The bench's field under the reading view is the only one. The notebook shows both readings and the titre read-only and has two fields: the HCl molarity and the NaOH molarity. This is also what lets the notebook sit below the bench at 1366 px. |
| C5 | B, S | **Two narrow pages, two notices**: B's `NarrowLabPage`, S's `LabShell narrow`. | The shell's (spec 14 gives it to the shell). `NarrowLabPage` is cut. One query, `!useMediaQuery('(min-width: 768px)')`, the rail's own, so no width between 767 and 768 px falls through. The bench is not mounted when narrow, which is what closes a running stopcock. One notice (section 7, text T1). |
| C6 | E, B | **Two meniscus descriptions**: E's `meniscusPosition` (on the mark, or thirds) in `select.ts`; B's `meniscusText` (five positions, checked over every level from 0 to 50 000 µL). | B's, in `app/lab/titration/meniscusText.ts`: it is the text alternative of a drawing and needs only the level. E's is cut. The 50.000 mL sentence is fixed as B's reviewer says. S's S15 ("in tenths of the gap") is dropped: that is the reading itself, which spec 11 rules out. |
| C7 | E, S | **Two checklists** with different step names and states (E: `done` boolean, steps hidden after trial 1; S: done, next, to do, skipped). | E's `checklist`, with E's step names, returning `state: 'done' \| 'next' \| 'todo' \| 'skipped'`, each step judged from the glassware and the trial as E's reviewer sets out (condition shows while the burette is dilute or unconditioned, whatever the trial number). |
| C8 | E, B, S | **Availability and reasons.** B has rules for the stopcock group only; B rev proposes `availability.ts`; S has four gate sentences; E has 24 `Blocked` reasons. | No `availability.ts`. `BenchView.controls` carries `can(...)` for each bench control. One table `BLOCKED_TEXT: Record<Blocked, string>` in `messages.ts`; pressing an unavailable control puts its sentence in the message line. A draft of all the sentences is in section 4.4. |
| C9 | B, S | **Who shows a Guided warning and the slow-down hint.** B: "the shell's". S: a prompt box at the top of the Guided panel, and the hint in the Guided panel too. S rev: beside the bench control, and the hint only on the bench. | The bench has a `notice` slot under its message line; the page controller fills it with the warning (a named group that takes focus, with a way back and a way on). Focus returns to the control that raised it. The hint is a line of its own under the status line, shown while `slowDown` is true, with the bench's wording (the shell's says "Close the stopcock", which the bench has just done). |
| C10 | E, B, S | **Where sentences live.** S: `chem-data/titration/messages.ts` with its own copies of the unions. E: "all wording is the UI's". B: `benchText.ts` in `app/`. | `app/lab/titration/messages.ts` (typed `Record<Blocked \| Warning \| Cause \| Step, string>` from the engine's unions, so a missing sentence is a type error) and `app/lab/titration/benchText.ts`. Both are run through `findInstitutionText` in a test. The primer stays in `chem-data`. |

### The engine's surface

| # | Between | The problem | Resolution |
| --- | --- | --- | --- |
| C11 | E, B | **Action names and shape.** B: `clearTip`, `deliver { ul, kind: 'stream' \| 'drop' \| 'half-drop' }`. E: `clearTipBubble`, `deliver { amount: 'stream' \| 'drop' \| 'half' }`, the stream's 0.25 mL a model parameter. B rev: `{ kind: 'stream'; ul }`. | The bench sends the engine's `Action` values directly; there is no `BenchAction` translation. No volume crosses from `app/`: `stream.ts` counts additions, the pours are 4 and 20 additions, and its "pour of 600" test is cut. The interval (400 ms) is an app constant and stays out of the spec. |
| C12 | E, B | **Plume formula.** B assumes the spike's last-drop value; E uses the whole addition; B rev asks for the whole addition for the stream. | E's, for every addition. Section 1.1 part 3 is the measured consequence. B's text that the cue "cannot be acted on by anyone" in a stream is no longer true and is dropped; its status line speaks five times in a careful run, not four. |
| C13 | E, B | **The drawn pink.** E: `pinkDepth = c ÷ 3×10⁻⁵`, parameter `fullPinkConcentration`. B: nothing below the threshold, then `1 − exp(−c ÷ 1×10⁻⁵)`, parameter `pinkDisplayScale`; name changes at the same number. | The drawing is the bench's matter: B's curve. `FlaskView` gives `pinkConcentration`, `pink` (the engine's own threshold test) and `volumeUl`; `pinkDepth` and `fullPinkConcentration` are cut. The name boundary is separate: `faintPinkNameLimit` 1.5×10⁻⁵ M (section 1.1 part 5). Both numbers are stored in the titration parameters with a rationale, because they are in mol/L and E and B both put the scale there; the two hex colours stay in `flaskColour.ts`. The bench no longer compares against `faintPinkConcentration` itself. |
| C14 | E, B, S | **Titrating with no indicator.** E blocks the stopcock below 2 drops and caps at 3. B and S add a "no indicator" status, a cause, and spec changes for an overshot colourless flask. | E's block. The cause, S14, B's spec change 5 and the indicator step's "skipped" state are cut. "Flask: colourless. No indicator in it." stays as the status before the drops go in. |
| C15 | E, S | **A misread in Guided.** E and B: not recorded. S: may be kept ("Keep 1.30 mL"). | Not recorded, as spec 7.2's "Challenge … misreadings carry into the result" implies. `Confirmed.reading`, `REREAD.proceed` and the first sentence of S9 are cut. |
| C16 | E, S | **How long a skipped step counts.** E: the burette stays dilute until conditioned; a wet pipette spoils one aliquot; an escaped bubble is gone. S recommends every error stays until the step is done. | E's (owner decision D3). S's S11 is reworded to say so. |
| C17 | E, B | **"Pink persists" before the wait.** E's `plume.status` is `persists` the moment the mixed flask is at the threshold, and the closed-flask model can never fade, so the 30-second check cannot disagree with it. B drops the plume after the wait and says nothing in its place. | Keep the spec's three status strings. After a swirl-and-wait the status line says what the wait found: "Flask: faint pink. Swirled 30 s: the pink has lasted." or "Flask: colourless. Swirled 30 s: no pink remains." (from `FlaskView.persistence`). The reason given for a blocked final reading says to swirl and wait. The primer says the wait stands for the 30 seconds of a real bench (D15). |
| C18 | E, S | **Molarity form and tolerance.** E: four to six decimals, within half a unit in the fourth. S: exactly four, within one unit. S rev: keep one unit. | Exactly four decimals **(departs from E)**: the label has four, the notebook's average is then worked from the digits the learner sees, and the refusal can state one rule. Tolerance stays E's half unit, that is, the correctly rounded value: half of learners who cut the number off are sent back (section 1.1 part 6), so the sentence must say "round, do not cut off". Stored as E6 whole numbers as E has it. Owner decision D6. |
| C19 | E, S | **True NaOH on completion.** E: five decimals, the value graded against. S: four. | E's. S's completion sentence loses "to four decimal places". |
| C20 | E, S | **The summary.** E marks each of the learner's two numbers as matching or not. S marks nothing. Both reviewers: a relative deviation worked from the rounded average differs from the unrounded one in the first decimal for most triples. | Nothing is marked: `meanMatches` and `deviationMatches` are cut. The notebook's average is to four decimals and its relative deviation to one, worked from that rounded average, as the learner is told to do it; one sentence says a learner who kept more digits may differ in the last one. `parseDeviation` takes up to two decimals and a leading point. |
| C21 | E, S | **Mode.** E: `setMode` never blocked. S: any time, each trial labelled with the mode it finished in. Both reviewers: the label can be made false, and Guided's checks become an oracle mid-trial. | `setMode` is blocked (`trial-open`) from a trial's aliquot or initial reading until it ends. No per-trial mode is stored or shown. Before Start the mode is Guided. Owner decision D7. |
| C22 | E, B | **"Select the HCl bottle".** E has `selectHcl`, `hclSelected` and `hcl-not-selected`; the label is null until then. B has one HCl bottle, its label always shown, and no such control. | Cut the action, the field and the reason **(departs from the spec's wording)**: with one bottle there is nothing to choose, and a hidden label is a ceremony. Spec 7.2 step 1 becomes "Read the HCl bottle's label and record its molarity in the notebook." Owner decision D9; it changes the stored shape, so it is settled before the state task. |
| C23 | E, B, S | **Saving during a stream.** E and S: when the stopcock closes. B and both reviewers: after every addition. | After every `reduce` that returns a new state, stream additions included. The controller holds the state; the bench holds none. Spec 10 is amended. |
| C24 | E, B, S | **Ways a trial ends.** E's three states leave a dead end at the 50.00 mL mark and no way out of a flask the learner knows is spoiled or a calculation they cannot get right. S adds `not-refilled` and `no-indicator` causes. | E rev's two fixes: the end is judged after `addWater` as well as `deliver`, and `discardTrial` ends an open trial as `discarded`. An invalid outcome carries the technique causes. `not-refilled` is cut: the ran-out sentence already says to refill. Owner decision D5. |
| C25 | S, E | **`Mode` declared twice** (`LabShell.tsx`, `state.ts`). | Not a conflict: the shared shell must not import a lab's engine, and the two types are the same two strings. |

### Data and files

| # | Between | The problem | Resolution |
| --- | --- | --- | --- |
| C26 | E, B, S | **The three bottles.** E: HCl and NaOH as registry reagents in `reagents.json` with an uncited note; the indicator in `titration.json`. S: `TITRATION_BOTTLES` in `bottles.ts`, not reagents, notes cited to data sheets. B's props type all three as `Reagent`. | One place and one shape: `bottles: { hcl, naoh, indicator }` in the titration record, each `{ name, formula, pubchemCid, hazards }`, `hazards.note` cited (`cited(text)`). Not registry reagents. `reagents.json`, the registry change, `bottles.ts` and E's 5.3 amendment are cut. The HCl bottle is named "Hydrochloric acid, standardized"; its molarity line is `hclLabel`. |
| C27 | E, S | **Which GHS entry for HCl.** E: Safe Work Australia's "hydrochloric acid" (H314, H335). S: the EU entry for "hydrogen chloride" (H314, H331), the same regulation for all three. | Owner decision D4; my recommendation is E's. The build check compares the H-code and the text between ": " and " [", ignoring " ***", within the reference the input names (E rev). |
| C28 | E, S | **Source ids and the manifest.** E adds 9 sources (`pubchem-cid-313`), S adds 20 (`pubchem-ghs-cid-313`), each with its own input file and build step. | One `docs/research/phase-3/sources/MANIFEST.json` and one build step. The repository's existing pattern is `pubchem-cid-N`; one id per PubChem record, its citation naming the sections and the entry used. |
| C29 | E, S, spike | **K_w.** The spec and the spike record: 1.0×10⁻¹⁴ citing IAPWS R11-24 with the conversion noted. E: cite OpenStax 14.1 instead. E rev: an owner's choice, and keep an OpenStax copy "since it is CC BY". S and S rev: OpenStax as served is CC BY-NC-SA with a clause on language models. | The spec's and the spike's: IAPWS R11-24, stored with no `published` and the note "Table 3 prints pK_w 13.99 at 25 °C on the molal scale; the release's equation gives 13.997 on the molar scale". No OpenStax page is kept in the repository. Owner decision D13 only if the owner prefers a source that prints the figure. |
| C30 | E, S | **File names.** E: `chem-data/titration.ts` and `titration.json`. S: a folder `chem-data/titration/`. | The folder: `chem-data/titration/titration.json`, `data.ts`, `primer.ts`. `data.ts` uses `param` and `cited` from `schema.ts`, which already exports both, and does not redeclare them. |
| C31 | E, S | **`hazardsSchema.note`.** E: text. S: `cited(text)`. | S's. E's uncited NaOH note ("can still irritate") contradicts the data sheet S read. |
| C32 | B, S | **`useMediaQuery`.** B: export it from `AppState.tsx`. S: move it to `app/useMediaQuery.ts`. | S's. |
| C33 | B, S | **The hazards control.** B: a "Hazards" disclosure in a tile (and none on the indicator). S: `BottleCard`. | One component, `app/lab/Hazards.tsx` (phase 4 has bottles too), inside each of the three bottle tiles. Spec 5.3's "bottle card" is read as the tile; no wording change. |
| C34 | B, S | **Layout thresholds.** B: notebook beside the bench from an 1800 px viewport; its own grid on the viewport's `xl`. S: container queries at 56rem and 100rem, measured with a 480 px box. | Section 1.2: container queries only, at 78rem and 110rem of page and 54rem of bench, the bench track growing first. |
| C35 | E, B, S | **The burette-ran-out sentence.** The spec fixes "burette ran out; refill before starting a trial". S rewords it. B shows nothing. | One sentence, S's, in `messages.ts`; the bench's message line shows it when the trial ends that way and the notebook shows it as the outcome. |
| C36 | all | **Three hand checklists and three task lists.** | One of each: sections 6 and 8. |

### The integrated interfaces

Only what changes from the engine design, and the join.

```ts
// ===== src/engine/titration/state.ts: changes =====
// seed: z.number().int().min(0).max(4294967295)                         (spec 7.1: 32-bit)
// hclSelected: removed                                                  (C22)
// trial.end: z.enum(['open', 'graded', 'overshot', 'ran-out', 'discarded'])   (C24)

// ===== actions.ts: changes =====
// Action: 'selectHcl' removed; | { type: 'discardTrial' } added
// Blocked: 'hcl-not-selected' removed
// can(setMode): 'trial-open' while the current trial is open and has an aliquot or an initial reading   (C21)
// can(discardTrial): 'trial-ended' | 'lab-completed' | null
// The trial's end is judged in one function after deliver AND addWater: overshot if past equivalence by more than
// overshootUl, else ran-out if levelUl >= buretteCapacityUl and the mixed flask is not pink.
// warnings(recordInitialReading): also 'burette-not-conditioned' when burette.diluted

// ===== entries.ts: changes =====
export function parseMolarity(text: string): number | null    // exactly four decimals, leading zero optional: "0.0949" -> 94900
export function parseDeviation(text: string): number | null   // up to two decimals, leading point allowed
/** The mean rounded to the fourth decimal (as E6), and the relative deviation worked from that rounded mean, in tenths of a part per thousand. */
export function summarise(molaritiesE6: readonly number[]): { meanE6: number; deviationTenths: number }

// ===== select.ts: changes =====
export interface FlaskView {
  hasAliquot: boolean; indicatorDrops: number; waterUl: number
  /** Liquid in the flask, for its drawn height. */
  volumeUl: number
  /** mol/L of the pink form in the mixed flask; 0 with no indicator. For the drawing only. */
  pinkConcentration: number
  /** The engine's own threshold test: the mixed flask is at least faintly pink. */
  pink: boolean
  overshot: boolean
  plume: Plume | null
  persistence: 'unchecked' | 'faded' | 'persisted'
}
export type TrialOutcome =
  | { state: 'open' }
  | { state: 'invalid'; reason: 'overshot' | 'ran-out' | 'discarded'; causes: Cause[] }   // technique causes only
  | { state: 'passed' | 'failed'; percentError: number; causes: Cause[] }               // + `counts: boolean` if D1(b) is taken
export function checklist(m: TitrationModel, state: TitrationState): { step: Step; state: 'done' | 'next' | 'todo' | 'skipped' }[]
export interface SummaryView { meanE6: number; deviationTenths: number; learnerMeanE6: number; learnerDeviationE2: number }
// removed: meniscusPosition, MeniscusPosition, pinkDepth, meanMatches, deviationMatches
// summaryView and trueNaoh return null unless passedTrials(...).length >= passesToComplete;
// trialOutcome treats a graded trial with no molarity as open.

// ===== src/engine/titration/index.ts: new =====
// Re-exports what app/ may use: state, actions (can, warnings, reduce, Action, Blocked, Warning), entries, select,
// model (TitrationModel, modelFrom). It does NOT export flask.ts or setup.ts. A no-restricted-imports pattern for
// src/app/** forbids '@/engine/titration/*', so no screen can show an equivalence volume, a pH or the hidden
// molarity by accident. (The app block of eslint.config.js must restate its whole option list: the last block wins.)

// ===== src/chem-data/titration/data.ts =====
// titrationSchema = { bottles: { hcl, naoh, indicator }, constants: {...}, parameters: {...} }
// parameters: the engine design's list, minus fullPinkConcentration, plus
//   pinkDisplayScale { value: 1e-5, rationale }, faintPinkNameLimit { value: 1.5e-5, rationale }
// These two are read by app/ from titrationData; TitrationModel does not carry them.
export function titrationCitations(data: TitrationData, sources: readonly Source[]): Citation[]

// ===== src/app/lab/titration/benchView.ts =====
export type BenchControl = 'conditionBurette' | 'fillBurette' | 'clearTipBubble' | 'rinsePipette' | 'pipetteAliquot'
  | 'addIndicatorDrop' | 'addWater' | 'deliver' | 'swirlAndWait'
export interface BenchView {
  hclLabel: string                                   // "0.0976"
  burette: { conditioned: boolean; filled: boolean; tipBubble: boolean; levelUl: number; atBottom: boolean }
  pipetteRinsed: boolean
  flask: { hasAliquot: boolean; indicatorDrops: number; waterPortions: number; volumeUl: number
           pinkConcentration: number; pink: boolean; overshot: boolean }
  /** The last addition's plume while no swirl-and-wait has been done since; null otherwise. */
  plume: Plume | null
  /** Changes with every addition (the delivered volume): restarts the plume's fade. Never shown. */
  plumeKey: number
  persistence: 'unchecked' | 'faded' | 'persisted'
  /** The engine's word on each control: null when it can be used now. */
  controls: Record<BenchControl, Blocked | null>
  trialEnd: 'open' | 'graded' | 'overshot' | 'ran-out' | 'discarded'
  readingWanted: 'initial' | 'final' | null
  slowDown: boolean
}
export function benchViewOf(m: TitrationModel, state: TitrationState): BenchView

export type BenchAction = Extract<Action, { type: BenchControl }>
export interface ReadingReply { accepted: boolean; text: string }
export interface TitrationBenchProps {
  view: BenchView
  display: { pinkDisplayScale: number; faintPinkNameLimit: number }
  bottles: TitrationData['bottles']
  sources: readonly Source[]
  onAction(action: BenchAction): void
  onReading(readingUl: number): ReadingReply
  /** A Guided warning, or the sentence that ends a trial; drawn under the message line. */
  notice?: ReactNode
}

// ===== src/app/lab/titration/stream.ts: in additions, not volumes =====
export const STREAM_INTERVAL_MS = 400
export const POUR_ADDITIONS = [4, 20] as const                    // 1 mL and 5 mL at the model's 0.25 mL
export type Stream = { open: false } | { open: true; pour: number | null; remaining: number | null }
export function streamTick(stream: Stream, canDeliver: boolean): { deliver: boolean; next: Stream }
```

`LabShellProps`, `ModeSwitch`, `Primer`, `useLabProgress` and the storage change are the shell design's, unchanged except: `ModeSwitch` takes `disabled` with its reason, and `LabShell`'s `notebook` slot holds no reading field.

The page controller is the one place the three meet:

```ts
// src/app/lab/titration/TitrationPage.tsx, in outline
const m = modelFrom(titrationData)                                   // once, at module scope
const [state, save] = useLabProgress(ACTIVITIES[0], titrationStateSchema)
function dispatch(action: Action) {                                  // every learner action and every stream addition
  const next = reduce(m, state, action)
  if (next !== state) save(next)
}
function onBenchAction(action: BenchAction) {                        // Guided: ask before a skipped step
  const skips = state.mode === 'guided' ? warnings(m, state, action) : []
  if (skips.length > 0 && !confirmed(action)) return ask(skips[0], action)
  dispatch(action)
}
function onReading(readingUl: number): ReadingReply {                // which reading it is comes from the view
  const action = { type: view.readingWanted === 'initial' ? 'recordInitialReading' : 'recordFinalReading', readingUl } as const
  const blocked = can(m, state, action)                              // 'reread', 'final-not-after-initial', ...
  if (blocked) return { accepted: false, text: BLOCKED_TEXT[blocked] }
  onBenchAction(action)                                              // the tip-bubble warning hangs on the initial reading
  return { accepted: true, text: '' }
}
```

### The integrated file layout

```
docs/research/phase-3/
  titration.json                 authored input: bottles, constants with the source's printed text, parameters with rationale
  sources/MANIFEST.json          every source of the lab: model constants, hazards, data sheets, primer
  sources/                       kept copies: NOAA, PubChem (property and GHS, x3), Wikipedia x2 with README. No OpenStax copy.
scripts/build-chem-data.mjs      + buildTitration(): checks the input against the kept copies; writes titration.json and the sources
src/chem-data/
  schema.ts                      hazardsSchema exported; its note becomes cited(text)
  support.ts                     Passage, located, Description, description (moved from periodic.ts, which re-exports them)
  validate.ts  citations.ts      + validateTitration, + titrationCitations
  sources.json                   + the lab's sources (written by the build)
  titration/
    titration.json               written by the build
    data.ts (+test)              titrationSchema, TitrationData, titrationData
    primer.ts (+test)            TITRATION_PRIMER
src/engine/
  ph.ts (+test)
  titration/  model.ts setup.ts flask.ts state.ts entries.ts actions.ts select.ts index.ts testkit.ts
              flask.test.ts (the phase's first test) setup.test.ts entries.test.ts actions.test.ts select.test.ts acceptance.test.ts
src/app/
  useMediaQuery.ts               moved out of AppState.tsx
  activities.ts routes.tsx pages/Lab.tsx        the lab's address; the list of labs
  progress/storage.ts            the notice rule: refused keys
  lab/                           SHARED WITH PHASE 4
    lab.css  LabShell.tsx  ModeSwitch.tsx  Primer.tsx  Hazards.tsx  useLabProgress.ts  shell.test.ts
    titration/
      TitrationPage.tsx          the controller
      benchView.ts (+test)       BenchView, benchViewOf
      messages.ts (+test)        every sentence keyed by an engine identifier; feedback
      benchText.ts (+test)       status line, stand description, stream messages
      format.ts (+test)          microlitres, E6 molarities and percent errors as text
      buretteGeometry.ts meniscusText.ts flaskColour.ts stream.ts   (+tests)
      TitrationBench.tsx Shelf.tsx apparatus.tsx TitrationStand.tsx StopcockControls.tsx ReadingView.tsx ReadingInput.tsx useStream.ts bench.css
      Guide.tsx Notebook.tsx     checklist and warning; NotebookPanel (docked) and TrialRecord (below)
      page.test.ts               markup tests
docs/for-institutions.md         sections of spec 12
```

## 3. Gaps: what the spec asks for that no design covers after the corrections

| # | Spec | The gap |
| --- | --- | --- |
| G1 | 5.2, 7.3 | **The 0.5% indicator strength has no source anyone has read**, and nobody knows whether the product's 0.5% is w/v or by weight. The data task's done-when cannot be met without it. It is an owner input (D4), not a task. |
| G2 | 5.1 | **No design puts a Sources control for the model's constants on the page.** `titrationCitations` exists; the primer's cards and the bottle tiles have Sources; K_w, the indicator's constants, Henry's constant, the CO₂ fraction and the drop volume appear nowhere a learner can open. Put one "Sources for this lab's model" disclosure at the foot of the primer. |
| G3 | 7.1, 7.3 | **The primer does not teach the titration itself.** No card explains the half-drop, swirling, washing the wall down or the 30-second rule, though the bench has a control for each; the reviewer's draft card has no source read for the half-drop or the 30 seconds. Spec 7.3 leaves CO₂ uptake by NaOH to the primer; the primer covers the solid, not the solution once made. Nothing tells a Challenge learner to estimate the endpoint from the label before using a 5 mL pour (section 1.1 part 3). Spec 7.1 says "short"; the primer is 30 paragraphs with no order of importance. |
| G4 | 7.2 | **The bench between trials and after completion is undesigned.** Resolved here in words only: an ended trial's flask stays on the bench with its outcome until "Start the next trial" in the notebook; the engine then gives an empty flask, the burette and pipette as they were; after completion the last flask stays, every control gives `lab-completed`. None of it was prototyped, nor the notebook's last-result block, the summary form or the "Discard this flask" control. |
| G5 | 7.2 | **Most of the engine's reasons have no sentence.** The shell wrote four gates; section 4.4 drafts the rest. Nobody has read them as a learner. |
| G6 | 7.2 step 6 | **"Refill before each further trial" is not enforced and not taught.** A second trial without a refill is an ordinary valid trial in 121 of 200 seeds. Resolution: the checklist shows the refill as its next step, the primer says to refill, nothing blocks; the plan must say this on the hand checklist so it is not reported as a bug. |
| G7 | 10 | **Stored states that pass the schema but no lab could make.** Two are guarded (completed with no passes; graded with no molarity). Nothing bounds a level above 50 000 µL, four drops of indicator, or trial indexes out of order, and no design says what the page does if a selector throws on a hand-edited record. Add bounds to the schema where they are one `.max()`, and one test that feeds the page's selectors a fuzzed schema-valid record. |
| G8 | 11 | **"Tablets fully supported" is untested.** No touch run by anyone. The stopcock buttons are 28 px tall in both prototypes. At 1024×768 with the menu open the bench is in two rows and the status line is 275 px below the fold. |
| G9 | 11 | **No screen reader has been run by anyone, and no person has read the meniscus.** All legibility evidence is a model measuring a screenshot. The plan's first browser check must put the reading view in front of the owner. |
| G10 | 11 | **The flask, where the endpoint is judged, is about 90×50 px at 1366×768.** The status line carries the colour in words, so the spec is met; whether a sighted learner can judge a faint pink at that size has not been looked at by a person. |
| G11 | 11 | **Zoom.** 200% zoom on a 1366 px screen is 683 CSS px: the bench is gone. No design connects this to the 768 px rule (D14). |
| G12 | 12 | **The institution text is not ready.** The Accessibility section and the About page's prose have no draft. The shell's Faculty draft contradicts the resolved design in at least six sentences (readings typed "in the notebook"; "one unit in the fourth decimal"; "errors stay in force until the step is done"; the true molarity "to four decimal places"; the stored record's description; and the sentence that a trial "cannot be passed that way", which is false). The opening paragraph and the "What exists" line still say the labs are not built. Line 145 of the current file states that OpenStax is CC BY 4.0. |
| G13 | 12 | **Facts the Faculty and Lab safety sections need and no design lists together**: grading at ±1.0% with the edge included; three passes; the arithmetic check and its tolerance; each error's exaggeration (2.0%, 0.60 mL, 2.0%) beside what a real bench gives; that a dilute burette stays dilute through refills by design; what is not modelled (CO₂ from the air during a trial, fading in strong base, activity, temperature, the ethanol in the indicator, parallax); that the seed in the export file gives the answers. |
| G14 | 13 | **No test cases with expected values for `validateTitration`, `titrationCitations` or the build step.** Listed in task 3 and 4 below. |
| G15 | 13 | **No checklist covers every requirement of section 7 by hand.** Section 8 is the merged one. |
| G16 | 13, CI | **`Math.pow` across engines, and Node 22.** The pink-or-not test is the one floating-point judgment. Careful runs never come nearer than 1% to the threshold; arbitrary learner paths were not searched. `package.json` allows Node 22.22; nothing ran there and CI runs 24 only. |
| G17 | 14 | **Spec 14 names a shared notebook and check flow; none is shared.** Deliberate (phase 4 checks observations and equations, this lab one number), and right under the project's rule against abstraction ahead of need, but it is a departure from the spec's sentence and needs amendment A22. |
| G18 | 7.4 | **Save-and-resume is required by section 10 and absent from the acceptance list** (amendment A19). |

## 4. The spec: one merged list of amendments

Each goes in with the commit that makes it true. "From" names the design that found it.

| # | Where | Change | From |
| --- | --- | --- | --- |
| A1 | 5.2 K_w row | Keep IAPWS R11-24. Add: "stored as 1.0×10⁻¹⁴ on the molar scale; the release prints pK_w 13.99 on the molal scale, and its equation gives 13.997 on the molar scale". Give "Carbonic acid constants: Perrin 1982, read through a transcription, and marked so" its own row. | spike; E rev |
| A2 | 5.2 indicator row | Name the product once the owner has chosen it, and whether its strength is w/v. | E |
| A3 | 5.2 hazards, 5.3 | "…plus a curated note for the concentration used, with its own source." In 5.3: "`hazards.note` is `{ value, sourceId }`." | S |
| A4 | 7.1 | Add: "The lab's three bottles are part of the titration record in chem-data (name, formula, PubChem CID, hazards). They are not registry reagents: the acid's molarity is seeded." | E rev, S |
| A5 | 7.1 | "0.09500–0.10500 M, in steps of 0.00001 M"; the pipette offset "at 0.001 mL resolution". | E |
| A6 | 7.1 | Add: "The reading view shows the scale with the eye level with the meniscus. Parallax is not modelled; the primer explains it. The bench never states a burette level or a delivered volume finer than a whole mL. Additions are exact, so a learner who counts them can work out the titre; that is accepted." | B |
| A7 | 7.2 step 1 | "Read the HCl bottle's label and record its molarity in the notebook." | B rev |
| A8 | 7.2 | Add: "The stopcock stays closed until the burette is filled, the flask holds the aliquot and 2 or 3 drops of indicator, and an initial reading is recorded. The burette is prepared and refilled only between titrations." | E, S |
| A9 | 7.2 | Add: "The final reading can be recorded only after a swirl and wait has shown the pink to last at the current volume. Adding titrant or water afterwards clears the reading and the wait." | E, S |
| A10 | 7.2 | Replace the average sentence: "When three trials have passed, the learner enters their own average molarity and relative deviation; the notebook then shows its own beside them. Neither is graded." | E, S |
| A11 | 7.2 Stopcock | After "on a timer": "of 0.25 mL. Stream is a toggle, never a held key, and a key held down adds one drop. 'Run in 1 mL' and 'Run in 5 mL' open the stopcock, deliver that volume in the same additions and close it, so no volume needs the learner's timing. The reading view shows no scale while the stopcock is open." The message becomes: "The burette ran out before the endpoint, so this trial has no usable titre. Refill the burette before you start a trial." | B, E, S |
| A12 | 7.2 Plume | After "an engine value": "the share of the acid still in the flask that the addition neutralised. It fades slowly from 0.10 and persists when the mixed flask is at or above the threshold." | E |
| A13 | 7.2 Modes | "…prompts a re-read when a typed reading is more than 0.02 mL from the true meniscus and does not record it; the same for an HCl molarity that is not the label's; and shows a 'slow down' hint within 1.00 mL of equivalence, closing the stopcock the first time it shows in a trial." Add: "The mode can be changed between trials, not during one. Burette readings are typed to two decimal places and molarities to four; any other form is refused, in both modes." | E, B, S |
| A14 | 7.3 Colour | Replace the bullet: "The pink form's concentration is pink fraction × indicator moles ÷ flask volume; more indicator drops give more of it. The drawing shows nothing below `faintPinkConcentration`, then deepens with concentration and levels off, so colour first appears at the addition where 'pink persists' does." In Constants: "Only `faintPinkConcentration` is tuned to the tests. `pinkDisplayScale` and `faintPinkNameLimit` are presentation parameters chosen by eye; they affect no endpoint and no grade." | B, B rev |
| A15 | 7.3 Invalid | "…more than 0.10 mL past the flask's equivalence volume, or the burette reached the 50.00 mL mark with the flask not pink, or the learner discarded the flask." | E rev |
| A16 | 7.3 Valid and passing | Add: "The learner types the molarity to four decimal places. It is accepted, in both modes, only when it is their recorded HCl molarity × 25.00 mL ÷ their recorded titre, rounded to the fourth decimal place; it is entered once per trial. A trial within 1.0% passes even when technique errors are named in it; the feedback says it passed in spite of them." If D1(b): "A trial counts toward the three only if both readings were within 0.02 mL of the meniscus and the HCl molarity is the label's." | E, S, both rev |
| A17 | 7.3 | "The learner may run any number of trials until three have passed; after that no further trial is run and Restart starts a new run. … the true molarity is shown on completion, to five decimal places." Relative deviation: "…worked from the average rounded to four decimal places…" | E, S rev |
| A18 | 7.3 table | Burette: "diluted by 2.0%, through every refill, until the burette is conditioned". Bubble: "A 0.60 mL bubble forms when the burette is filled from empty. Not cleared, it escapes evenly during the first 5 mL delivered, so the meniscus falls 0.60 mL more than was delivered; it does not return at a refill". Pipette: "The first aliquot drawn with the wet pipette is diluted by 2.0%". Water: "(10 mL at a time, at most 30 mL a trial)". | E |
| A19 | 7.4 | Water: "Adding 10, 20 or 30 mL". Corner test: "…and for every flask a learner can make (either dilution error, 2 or 3 drops, up to 30 mL of water)". New line: "**Resume:** a lab reloaded from storage after every action, each stream addition included, ends in the same state as one never reloaded." | E, E rev |
| A20 | 10 | "…saved after every learner action and every stream addition, so a reload resumes the current trial at the delivered volume, with the stopcock closed." "The settings page and each lab page say that progress will last only for that session … 'Clear my progress' clears the notice." | B, S |
| A21 | 11 | Notebook: "the working part of the lab notebook beside the bench where the page is wide enough for both, below it otherwise; its record of finished trials across the page below". Meniscus: "…gives the two bracketing graduations and which fifth of the gap the meniscus is in, not the reading itself. Each position spans 0.02 mL, so the text alone is enough to pass the ±0.02 mL check. It is available to every learner." Narrow: "…and a notice that the bench needs a window at least 768 px wide, and that progress stays in the browser it was made in". | B, S, both rev |
| A22 | 4, 14 | "`#/lab` lists the labs; the titration lab is at `#/lab/titration`." In 14: "the shared lab shell (the page frame with the mode switch and the primer, and slots for a lab's guide, bench, notebook and record) reused by phase 4; each lab owns its notebook and its check". | S |
| A23 | 5.1, 5.2, existing files | The OpenStax licence statements, after D2. | S |

Not adopted: the stream's interval in the spec (B's change 12); "five positions are the fewest" (untrue, B rev); the no-indicator changes (C14); "the learner may keep the reading" (C15); per-trial mode (C21); E's 5.3 Reagent amendment (C26); K_w to OpenStax (C29).

### 4.4 Draft sentences for the engine's reasons

So that `Record<Blocked, string>` can be written at once. Reasons state the precondition only, so they give nothing away in Challenge. They need a reader's eye before they ship.

| Reason | Sentence |
| --- | --- |
| `lab-completed` | The lab is complete. Restart the lab to run it again. |
| `lab-not-completed` | These are entered once three trials have passed. |
| `trial-ended` | This trial is over. Start the next trial. |
| `trial-open` | Finish or discard the trial under way first. |
| `already-done` | That is already done. |
| `mid-titration` | That cannot be done once NaOH has run into the flask. |
| `burette-empty` | Fill the burette first. |
| `burette-at-bottom` | The burette is at the 50 mL mark. Nothing more can be delivered. |
| `no-tip-bubble` | There is no air bubble in the tip. |
| `flask-empty` | Pipette the acid into the flask first. |
| `flask-has-aliquot` | The flask already holds its 25.00 mL of acid. |
| `indicator-full` | Three drops of indicator are enough. |
| `water-full` | The flask has had plenty of rinse water. |
| `needs-indicator` | Add 2 or 3 drops of phenolphthalein first. |
| `needs-initial-reading` | Record the initial burette reading before you open the stopcock. Once NaOH has run out, the starting level can no longer be read. |
| `endpoint-not-confirmed` | Record the final reading once the pink has lasted through a swirl and wait. |
| `needs-final-reading` | The molarity is worked out from both readings. Record the final reading first. |
| `needs-hcl-molarity` | Record the HCl molarity from the bottle label first. |
| `invalid-entry` (reading) | Write the reading to two decimal places, between 0.00 and 50.00, for example 24.30. The second decimal is your estimate between the marks. |
| `invalid-entry` (molarity) | Write the molarity to four decimal places, for example 0.1234. |
| `invalid-entry` (deviation) | Write the relative deviation as a number of parts per thousand, for example 1.5. |
| `not-the-label` | That is not the molarity printed on the label. Look at the label again and copy all four decimal places. |
| `reread` | (the shell's re-read body, without "Keep") |
| `final-not-after-initial` | The final reading must be larger than the initial reading. The numbers on a burette run downward, so the reading grows as NaOH runs out. |
| `calculation-mismatch` | That molarity does not follow from your notebook. It must be your HCl molarity × 25.00 ÷ your titre. Keep every digit until the last step, then round the answer to four decimal places; do not cut it off. Nothing has been marked yet. |

T1, the narrow notice: "**This lab needs a wider window.** The bench is shown in windows at least 768 pixels wide. Use a wider window, a tablet turned sideways, or a computer; if the page is zoomed in, zooming out brings the bench back. Progress is kept in the browser it was made in, so a run started on another device will not appear here." Followed by "Below are the primer and the notebook of your saved run." or "Below is the primer."

The not-saving notice has two wordings today (Settings and the shell design). Use the Settings sentence in both places.

## 5. Cuts

Proposed by a design or a reviewer and not needed for the spec.

**From the shell**

- `progress.ts` (`TitrationProgress`, `newRun`, `finishTrial`) and its tests.
- `flow.ts` whole: `checklist`, the three `can…` gates, `promptBefore`, `Confirmed`, `checkTrial`, `invalidResult`, `Check`, `TrialResult`, its own `Cause`, `Outcome` and `StepId`.
- `notebook.ts` except formatting: `parseReading`, `parseMolarity`, `isDeviation`, `titre`, `followsFromNotebook`, `average`, `relativeDeviationTenths`, `misread`, `ALIQUOT`.
- `percentErrorText`'s rule that 1.004% prints as "+1.01%". Print the figure and say "just outside the 1.0% allowed" when two decimals would read 1.00.
- The per-trial mode label and stored `mode`.
- "Keep 1.30 mL".
- The `no-indicator` and `not-refilled` causes, the `NO_CAUSE` sentence, and `misread-initial` for a level that fell after the reading (the engine clears the reading instead).
- The initial and final reading fields of `TrialForm`.
- `chem-data/titration/messages.ts` and `bottles.ts` as files; `BottleCard` as a titration component.
- The done-when that inspects the built chunk for primer text; a route test that the lab is lazy is enough.
- The Guided panel across the top of the page with the checklist in columns; the prompt box in it; the slow-down line in it.

**From the bench**

- `NarrowLabPage.tsx`.
- `reading.ts` (`ParsedReading`, the four problem kinds, the comma).
- `BenchAction` as its own vocabulary, `deliver { ul }`, `STREAM_CHUNK_UL`, the "pour of 600" case.
- `phase`, `additions` and `BenchParams.faintPinkConcentration` in `BenchView`; the bench's own threshold comparison for the swirl message.
- The waste beaker tile.
- `availability.ts` (reviewer's proposal).
- The viewport breakpoints (`xl`, `min-[1800px]`).
- The stream's interval as spec text.

**From the engine**

- `reagents.json`, the `registry.ts` change and the 5.3 Reagent amendment.
- `selectHcl`, `hclSelected`, `hcl-not-selected` (if D9 is accepted).
- `meniscusPosition` and its type.
- `pinkDepth`, `fullPinkConcentration`.
- `meanMatches`, `deviationMatches`.
- OpenStax 14.1 as the K_w source, and any kept OpenStax copy.
- `equivalenceUl` and `pastEquivalenceUl` as anything but test helpers.
- The sentence justifying `chargeProtonated` by "phase 7", which does not exist. The field and its two ammonia tests stay: the spike's solver has it and it costs one number.
- The `restart` action is redundant with `createLab(seed, mode)` in `app/`; either is fine, one is enough.

**Deferred, not built in phase 3**: parallax; a number on every 0.1 mL graduation in Guided; syncing two tabs; a shared notebook or check flow; moving `Tile` and `Bottle` out of `titration/` (phase 4 does it if it wants them).

## 6. One ordered task list

Engine and data first. Every task writes its tests first, leaves `npm run build` green (it runs lint, tests, type check and the production build, and CI runs it on every push), and can be reviewed on its own. "Draws on" names where the detail and the expected values are.

**Before task 1: the owner settles D1 to D7 and D9** (section 9). D1, D5, D6, D7 and D9 change the stored record or the action set; D3 the technique rules; D4 the data. Task 1 itself needs none of them and can start at once.

### Engine and data

| # | Task | Done when | Draws on |
| --- | --- | --- | --- |
| 1 | **The endpoint test, green.** `engine/ph.ts`; `titration/model.ts` (the type), `setup.ts`, `flask.ts`; `ph.test.ts`, `setup.test.ts`, `flask.test.ts` with the `TitrationModel` pinned as a literal in the test. | The 12 solver cases match engine 5.2 to 10⁻⁶; `labSetup(1)` is `{ hclE4: 976, naohE5: 9502 }`; seeds 1 to 100 land 11.21 to 35.03 µL (2 drops) and 11.21 to 36.33 µL (3 drops) past equivalence, never pink before it, never overshot; corners 9.644 to 12.239 µL; `npm run build` passes. | E 3.1 to 3.4, 4.1, 5.2; E rev correction 2 |
| 2 | **Sources and authored input.** `docs/research/phase-3/sources/` (one manifest, kept copies, README) and `docs/research/phase-3/titration.json` with bottles, constants and parameters. Needs D3 and D4. | Every constant has a manifest entry whose `prints` text contains its figure; K_w has the note of A1 and no `published`; the indicator's entry records w/v or by weight; every hazard note names its source; no OpenStax page is in the folder. | E 2.1, 2.4; S 7.4, 7.6; C26 to C29 |
| 3 | **Schema, validator, citations.** `hazardsSchema` exported with a cited note; `chem-data/titration/data.ts` (schema only, tested on a fixture); `validateTitration`; `titrationCitations`. | The validator rejects, each with its own test: an unknown source id; a `published` that is not its value; a parameter with no rationale; a rationale containing "Room 214"; a hazard note with no source; a constant with no `sourceId`. It accepts "room temperature". The grid test holds (`dropUl`, `streamUl`, `tipBubbleEscapeUl` are whole half-drops; `waterMaxUl` a whole number of steps). `titrationCitations` lists each constant and each bottle under its source, each source once. | E 2.3, 5.2; S 7.4; G14 |
| 4 | **Build step.** `buildTitration()` writes `chem-data/titration/titration.json` and the sources; `titrationData` is exported; `modelFrom`. | `npm run build:data` twice gives identical files and CI's `git diff --exit-code` passes; the build fails when the saved NOAA value for the stored year is altered, and when a stored hazard statement is altered (the H-code and the text between ": " and " [" are compared, " ***" ignored); `modelFrom(titrationData)` equals the literal task 1 pinned; derived values are 1.5708×10⁻² and 1.4663×10⁻⁵ mol/L; one test pins the judged values together with the titration entry's version in `activities.ts`. | E 2.5; E rev (build check, version pin) |
| 5 | **Typed entries.** `entries.ts`. | `parseReading` as engine 5.2; `parseMolarity` takes "0.0949" and ".0949", refuses "0.095", "0.09494", "1.0949"; `withinTolerance` against 0.10000 M passes 0.1010 and fails 0.1011; `followsFromNotebook` for 0.0976 M and 25.70 mL accepts 0.0949 and refuses 0.0950 and 0.0948; `summarise([0.0949, 0.0948, 0.0949])` gives 0.0949 and 0.4; `summarise([0.0987, 0.0989, 0.0986])` gives 0.0987 and 1.0. | E 3.7, 5.2; C18, C20 |
| 6 | **State, actions, test kit.** With the changes of section 2: no `selectHcl`, `discardTrial`, the end judged after water too, `setMode` blocked mid-trial, the extra warning, the seed bound. | `actions.test.ts` passes with engine 5.2's values, and: seed 1384, careful trial 1, trial 2 without a refill taken to the mark, three washes, ends `ran-out`; a discarded trial is followed by an allowed `startNextTrial` with the glassware carried over; `setMode` is `trial-open` after the aliquot and allowed after the trial ends; a blocked action returns the same object; over 20 000 random actions no open trial with titrant delivered has every ending action blocked. | E 3.5, 3.6, 4.2, 4.3; E rev corrections 1, 3, 4 |
| 7 | **Selectors and the public surface.** `select.ts` as in section 2; `index.ts`; the lint rule that keeps `app/` out of `flask.ts` and `setup.ts`, with its case in `lint-rules.test.ts`. | `select.test.ts` passes: the checklist after an unconditioned trial 1 shows `condition` as skipped in trial 2, and after late conditioning shows `tip-bubble` as next; an overshot trial with a wet pipette names `pipette-not-rinsed`; a completed record with no passes gives a null summary and no true molarity; the slow-down hint for seed 1 is true from 24 700 to 25 675 µL in Guided and never in Challenge. | E 3.8, 5.2; E rev (checklist, outcomes, guards) |
| 8 | **Acceptance.** `acceptance.test.ts`: all of spec 7.4 through the state machine, and resume. 60 s timeout on the seed loops. | Careful labs: 200 of 200 complete in three trials, −0.316% to +0.087%. Errors alone shift −2.168 to −1.864, −2.871 to −2.148, +1.910 to +2.216%, each named, none overshot. Water: same equivalence volume, endpoint 0 or 25 µL later. Reachable corner flasks 9.599 to 16.274 µL. Reloading through `JSON` and the schema after every action gives the same lab; a reload after any one stream addition resumes at that delivered volume. | E 5.2, 5.3; A19 |
| 9 | **Storage.** The notice rule in `storage.ts` (refused keys, `forgetRefused`); the lab's entry through the real store. | The seven notice cases of shell 9.5 pass; a lab saved mid-trial through `createMemoryStore` and `loadEntry` resumes to the same final state; `peekStatus` says `completed` for a completed lab; a record of another shape goes to the backup key and Home says not started. | S 6.3, 6.4, 9.5; E task 11 |

### Content, before the review

| # | Task | Done when | Draws on |
| --- | --- | --- | --- |
| 10 | **`chem-data/support.ts` and the primer.** Move the four helpers; `primer.ts` with the shell's eleven cards, the new card "Titrating to the endpoint" (needs a source read for the half-drop and the 30 seconds), the sentence that the acid was itself standardized, "two or three small portions" for conditioning, and that a NaOH solution keeps taking up CO₂. | `periodic.test.ts` passes unchanged; the primer tests of shell 9.6 pass with the new card counted; no OpenStax line is a quotation; every string passes `findInstitutionText`; the arithmetic test passes. | S 7.1 to 7.5, 9.6; S rev; G3 |
| 11 | **Wording.** `app/lab/titration/messages.ts` and `format.ts`: a sentence for every `Blocked`, `Warning`, `Cause` and `Step`, the outcomes, the worked-calculation lines, the summary. | It does not compile with a reason missing; the feedback cases of shell 9.3 pass with the engine's cause names; no sentence contains a number with two decimals except the learner's own; the re-read sentence has no direction word; percent error prints with a real minus sign; every string passes `findInstitutionText`. | S 5.5, 9.3; section 4.4 |

### Gate A: independent chemistry review

Here, before any screen exists. A reviewer who has not seen the designs is given `titration.json` with its manifest and kept copies, the engine and its test output, `primer.ts` and `messages.ts`, and is asked to: check every stored constant against what its source prints; re-derive the corner and seed results with their own implementation; say whether each technique error moves the result the way and by roughly the amount the feedback claims, and whether each simplification (D3) is defensible for a beginner; read every sentence a learner will see for a chemistry claim that is wrong or that a lab instructor would not say; and read the hazard text. The owner reads the primer and the hazard notes as the person who runs this lab (D15). Findings are fixed before task 12. The institution text keeps "no chemistry instructor has reviewed" unless one has.

### Screens

Tasks 12 and 13 are pure modules and may run alongside tasks 5 to 9; they are listed here because nothing before the gate needs them.

| # | Task | Done when | Draws on |
| --- | --- | --- | --- |
| 12 | **Bench pure modules.** `buretteGeometry.ts`, `meniscusText.ts`, `flaskColour.ts`, `stream.ts`. | The bench design's section 10 tables pass, with: level 50 000 reads "at the 50.0 mL mark, the bottom of the scale"; `flaskColour` is "faint pink" at 1×10⁻⁵ M and "pink" at 1.5×10⁻⁵ M; a pour of 4 additions closes with the fourth; worst error of the words is 20 µL over every level. | B 4, 10; B rev; C6, C11, C13 |
| 13 | **The join.** `benchView.ts` with `benchViewOf`; `benchText.ts`. | One test builds a view from a real engine state at each of: new lab, filled with a bubble, 40 stream additions, endpoint before the wait, endpoint after it, overshot, ran out, a new trial after a finished one; the status lines are those of section 1.1 with C17's two sentences; a careful run changes the status line five times; no sentence states a volume finer than a whole mL; every careful endpoint of seeds 1 to 100 is named "faint pink". | section 1.1; B 10 |
| 14 | **The shared shell.** `useMediaQuery.ts`, `lab.css`, `LabShell`, `ModeSwitch`, `Primer`, `Hazards`, `useLabProgress`. | The shell, mode, primer and narrow rows of shell 9.7 pass; the mode switch renders disabled with its reason; a test shows one `saveEntry` per `save` call with the activity's version. | S 3, 9.7; C5, C21, C33 |
| 15 | **Routes and the list of labs.** | `routes.test.ts` has `/lab/titration` as a lazy route; `ACTIVITIES[0].to` is the new address; the list links the titration lab with its status and shows the other as planned. | S 1.1, 9.7 |
| 16 | **Reading view and field.** `ReadingView.tsx`, `ReadingInput.tsx`. **Browser check 1.** | In the running app at 1366×768 in both themes: the view is at least 416 px tall; graduations are one pixel thick; the meniscus band against the liquid is at least 3:1 in both themes, measured; **the owner reads three levels someone else chose to within 0.02 mL**; "24.3" is refused; the field's name follows `readingWanted`. | B 6.3; B rev (contrast); G9 |
| 17 | **Stand and apparatus.** `TitrationStand.tsx`, `apparatus.tsx`, `bench.css`. | Both themes show: the level, the stopcock's handle and word in both states, the bubble with its words, the flask at each colour name against its white card, a plume that fades; with reduced motion on, no plume or drop element exists. | B 6.1, 6.4, 7, 8 |
| 18 | **Stopcock.** `useStream.ts`, `StopcockControls.tsx`. **Browser check 2.** | By keyboard alone: a held Enter or Space adds one drop; the toggle opens and closes from one button with focus staying put; Escape closes it wherever focus is; a hidden tab closes it; "Run in 1 mL" delivers 1.00 mL and closes; a press within 600 ms of an automatic close does nothing and says "The stopcock is already closed."; in Guided the stream closes at the hint with 0.75 to 1.00 mL to go; the stream closes as soon as the engine can take no more. | B 6.4; B rev (toggle race, Escape) |
| 19 | **Shelf and bench.** `Shelf.tsx`, `TitrationBench.tsx`: five tiles, hazards on three, the notice slot, the three lines under the stopcock, the container-query grid. | Every prep action of 7.2 by keyboard; an unavailable button keeps focus and says its reason in the message line; the three hazard disclosures open with their sources; the Tab order is shelf, stopcock, reading. | B 6.1, 6.2, 9; section 1.2; C8, C9 |
| 20 | **Notebook and guide.** `Notebook.tsx`, `Guide.tsx`: the HCl field, the readings and titre read-only, the molarity field with Check, the worked lines (Guided), Discard, the last result, Start the next trial, the summary form, the record table, the checklist as one line and as a list. | Markup tests: two labelled fields; a six-column table with a row header per trial and the trial under way as "In progress"; a result in words; the read-only record has no field or button; the worked lines hold no number the learner did not type; the checklist marks one step as current and each state in words. | S 4, 5.1, 9.7; C4; G4 |
| 21 | **The page.** `TitrationPage.tsx`: Start, dispatch and save, Guided warnings in the bench's notice slot, focus to a warning and back to the control that raised it, focus to a result, next trial, summary, Restart, the narrow page, the model's Sources disclosure. | Gate B. | section 2 (controller); S 1.2 to 1.5; G2 |

### Gate B: browser checks on the whole page

The hand checklist of section 8, in the running app, in both themes. Spec 13 allows no end-to-end framework, so any script used is throwaway and stays out of the repository. The owner looks at D8, D10 and D12 here.

| # | Task | Done when | Draws on |
| --- | --- | --- | --- |
| 22 | **Documents.** `docs/for-institutions.md`: the opening paragraph and "What exists"; the Storage line; "The titration lab" rewritten against the engine as built, with G13's facts; "Lab safety"; Accessibility from what Gate B found, including what was not checked (no screen reader, no person but the owner, Chromium only, no touch, the 768 px rule and zoom). The About page's prose. The spec amendments not yet made. | Every sentence added has been checked against the build; the sentence about the percent error says what D1 decided and nothing more; no sentence says OpenStax is CC BY 4.0 unless D2 found that it is. | S 8; G12, G13; A1 to A23 |
| 23 | **Close.** | Spec 7.4's list passes in CI; every line of section 8 is ticked or carries a note; `npm run build`, `build:data`, `build:expected` and `cross-check` leave no diff. | spec 13, 14 |

The OpenStax corrections to `periodic.ts`, `sources.json` and the existing institution text (D2) are not phase 3 work, but they block making the repository public and should be their own plan.

## 7. What the three reviewers found that stays as written

So the plan does not lose them; each belongs to the task shown.

- Task 16: the reading view usually shows one numbered mark; a real burette shows one every millilitre (B rev). The owner's eye, D11.
- Task 17: the flask is small (G10).
- Task 18: repeated presses of "Add drop" change no text, so a screen reader hears nothing after the first. Alternate "Drop added." and "Another drop added."; the first half-drop says it is touched off on the flask wall and rinsed in (B rev).
- Task 2: the half-drop's rationale should say it is rinsed down with distilled water, which is also the honest reason the wash bottle is on the bench (E rev). The `water-full` sentence must not suggest more water would spoil the flask.
- Task 11: the calculation message names the three numbers in both modes (E rev); done in 4.4.
- Task 22: an HCl label below 0.1000 M has three significant figures, so the relative deviation of three careful trials takes only a few values, set by rounding (E rev). Say so beside the definition.

## 8. The hand checklist (spec 13), merged

Keyboard only where it says so. Both themes unless it says otherwise.

**A whole trial, keyboard only, Guided.** Start; record the label; condition, fill, clear the tip, read; rinse, pipette; two drops; pours of 1 mL to the cue, drops, half-drops; swirl and wait; final reading from "The meniscus in words" alone; molarity; result takes focus. Every warning takes focus, both its buttons work, and focus returns to the control that raised it.

**Section 7.2, line by line.** Each of steps 1 to 6 can be done and each can be skipped where the spec lets it be. Guided warns before each of the three skipped steps and nowhere else. A reading 0.03 mL off is asked for again and not recorded; one 0.02 mL off is taken. A wrong label is asked for again. The hint shows within 1 mL, closes a running stream once, and never shows in Challenge. Guided never shows a titre or a molarity the learner did not type. The stopcock gives a half-drop, a drop, a stream. A trial run to the 50 mL mark ends with the ran-out sentence. A second trial without a refill is allowed and its checklist shows the refill undone (G6).

**Challenge.** Skip each technique step in turn: each fails its trial alone and is named. Misread each reading by 0.05 mL: named. Type the true molarity without the working: "does not follow". A molarity cut off instead of rounded: refused with the rounding sentence. Discard a flask: the next trial starts with the glassware as it was.

**States.** Overshoot: the flask is dark pink and says so in words, every bench control gives "This trial is over", the notebook offers the next trial. Three passes: the true molarity appears; the notebook's average and deviation appear only after both of the learner's are entered. After completion every control says the lab is complete. The mode cannot be changed mid-trial and can between trials.

**Reload** after each of: recording the label; a fill; an initial reading; one stream addition, with the stream still running; the endpoint before the wait; a failed trial; an overshoot; completion. Each time the page comes back where it was, stopcock closed.

**Storage.** Home says Not started before Start, In progress after, Completed after the third pass. Export holds the entry; Clear removes it. With writes refused, the notice shows on the lab page and on Settings, stays after the theme is changed, and goes when a lab save succeeds and after Clear.

**Stream.** Press Enter on the stream button the instant the slow-down sentence appears: nothing more is delivered. Narrow the window during a stream: the stopcock closes. Hide the tab: it closes.

**Reduced motion on.** A whole trial: no plume, no falling drop, no running animation; the status line alone carries the cue.

**Sizes.** 2523×1290, 2016×1100, 1920×1080, 1600×900, 1504×900, 1440×900, 1366×768, 1280×720, 1024×768, 768×1024: no sideways scroll, no button past its tile, the stand at least 416 px tall; at 1366×768 the status line, the message line and the reading field are in view without scrolling, and a warning is wholly in view once it has focus. 767 px: notice, primer, read-only notebook with the trial under way, no bench in the DOM, no field. 200% zoom on a 1366 px screen: the notice, with its sentence about zoom.

**Touch.** One trial on a tablet, or with touch emulation and that said: every control can be hit; the stopcock buttons are at least 32 px tall.

**A screen reader**, if one can be run: what is announced on a drop, a stream, the cue, a warning, a result. If none can, the document says so.

**Chemistry on screen.** Every bottle's hazards open, with the pure-substance label and the note's source. The primer's Sources and the model's Sources list what the cards and the constants cite.

## 9. Owner decisions, merged, most consequential first

**Settle before the plan is written**

**D1. The percent error is an answer key, and typed readings let it be used.** One failed trial gives the hidden molarity exactly (0.0930 typed, −2.126% shown, so the true value is 0.09502). In Challenge the learner can then type a final reading that fits, on a burette that is still dilute, and pass; three such trials complete the lab, each marked passed with "final reading misread" named. The check that the molarity follows from the notebook does not stop this, because the notebook's readings are typed too. Options: (a) accept it, and have the institution text say exactly this; (b) a trial is graded as now, but counts toward the three only if both readings were within 0.02 mL of the meniscus and the HCl molarity is the label's; (c) show only "too high" or "too low". **Recommendation: (b).** It is the tolerance Guided already enforces, it costs one condition and one sentence, and "three trials passed" then means three honest titrations. (c) throws away the most useful feedback the lab gives. Merges engine decision 1, shell O3, and both reviewers.

**D2. OpenStax.** The repository quotes OpenStax and says CC BY 4.0 in `periodic.ts`, `sources.json` and the institution text; the pages served on 2026-10-04 state CC BY-NC-SA 4.0 and restrict use in language models, as the shell's reviewer confirmed live. **Recommendation:** before the repository is public, turn the existing quotations into locators, correct the licence wording, and decide whether the fetched copies in the shell design's folder are kept. To keep any quotation, first find the same passage in a release that is CC BY 4.0 and cite that. New work quotes none. Not phase 3 work, but it decides K_w (D13) and blocks going public.

**D3. The model's simplifications.** (a) An unconditioned burette stays 2.0% dilute through every refill until it is conditioned; a real one dilutes less each time, and honest mixing would put trial 2 at 0.83 to 1.14% dilute, on the grading line. (b) A wet pipette spoils only the first aliquot drawn with it, which is what happens. (c) An escaped tip bubble does not return at a refill. (d) The stopcock stays shut until the flask has 2 or 3 drops of indicator, so no one titrates without it. (e) Distilled water is free of CO₂ and capped at 30 mL a trial. **Recommendation: accept all five.** (a) is the one that is not true to a bench; it is the same kind of exaggeration as the 2.0% itself and the institution text must say so. Merges engine decisions 5, 6, 9 and shell O4.

**D4. The three bottles.** (i) Which GHS entry the HCl bottle carries: PubChem's record has Safe Work Australia's entry for hydrochloric acid (H314, H335 "May cause respiratory irritation") and the EU entry for hydrogen chloride gas (H314, H331 "Toxic if inhaled"). **Recommendation: the hydrochloric acid entry**, because the bottle holds the solution and "Toxic if inhaled" is the gas's classification; the cost is that the three bottles no longer cite one regulation. (ii) The notes for the strength used: the shell's, each resting on a supplier's data sheet, or your own lab's sheets. **Recommendation:** you approve the wording; you handle these solutions. (iii) The indicator: nobody could open a source for a 0.5% solution, and the one data sheet read is for 1% in isopropyl alcohol. **Recommendation:** give the label or data sheet of the indicator your lab stocks, and say whether its percentage is w/v. The endpoint test passes from 0.1% to 1%. The indicator's tile will show "H350: May cause cancer". Merges engine decisions 2, 3, 4 and shell O5.

**D5. How a trial can end.** The final reading is allowed only after a swirl and wait has shown the pink to last; a learner may discard a flask and start the trial again; a trial that reaches the 50 mL mark with no pink is invalid even if water was the last thing added; after the third pass no further trial is run. **Recommendation: accept all four.** Without "discard", a learner who cannot get the calculation right, or who pipetted with a wet pipette and knows it, has no way forward but Restart.

**D6. The molarity.** The learner types it, once per trial, to exactly four decimal places, and it is taken only when it is their own HCl molarity × 25.00 ÷ their own titre, correctly rounded. Half of learners who cut the number off instead of rounding it are sent back (153 of 300 careful trials); the looser rule of the shell design sends none back and accepts a neighbouring wrong value. **Recommendation: the strict rule**, with a sentence that says "round, do not cut off" and names the three numbers. Four decimal places in every case, not a significant-figure rule: three significant figures can cost half the 1.0% band. Merges engine decision 7, shell O3 and O6.

**D7. Changing mode.** **Recommendation:** between trials only; no "Guided" or "Challenge" label on a trial. A switch mid-trial lets Guided's re-read check find the meniscus for a Challenge trial (the engine's reviewer did it in 126 tries). Merges shell O8 and both reviewers.

**Settle before the screens**

**D8. Stream and pours.** Stream is a toggle; "Run in 1 mL" and "Run in 5 mL" close by themselves; Guided closes a running stream when the hint first shows; the plume is the engine's whole-addition value. Measured: 1 mL pours to the cue never overshoot; 5 mL pours repeated blindly overshoot in 155 of 300. **Recommendation:** keep all of it, and have the primer say to use the 5 mL pour only while far from the endpoint, which a learner estimates from the label. Stream speed (0.25 mL every 0.4 s) and the plume's thresholds are for your eye at Gate B. Merges bench decisions 2, 5, 6 and engine decision 8.

**D9. "Select the HCl bottle."** (Changes the stored record, so it is settled with D1 to D7, before task 6.) There is one. **Recommendation:** the label is always readable and step 1 is "read the label and record its molarity" (A7).

**D10. Where the notebook goes.** Readings are typed under the meniscus; the notebook's working part is beside the bench from about a 1500 px window and below it otherwise; the record of finished trials runs across the bottom; the checklist is one line until a window of about 2016 px, where it becomes a column. **Recommendation: as measured.** Look at `shots/guided-2523x1290.png` and `shots/guided-1366x768.png`. Merges shell O9 and bench change 11.

**D11. Reading the meniscus.** Parallax is left out and the primer explains it; the meniscus in words is open to every learner; Guided does not number every 0.1 mL mark. **Recommendation: all three as the bench has them**, and you read three levels yourself at browser check 1, because so far only a model has. Merges bench decisions 1, 3, 4.

**D12. How pink.** `pinkDisplayScale` 1×10⁻⁵ M, "faint pink" up to 1.5×10⁻⁵ M, pink `#d81b7f`, overshot `#8a0f4d`, on a white card in both themes. The deepest careful endpoint is drawn at 0.74 of full strength. **Recommendation:** start there and consider a lighter pink at Gate B; you have seen real endpoints. Also look at whether the flask is big enough (G10).

**D13. K_w's source.** **Recommendation:** IAPWS R11-24 as the spec and the spike record have it, stored as 1.0×10⁻¹⁴ with the conversion in a note and no "as printed" text. The engine design's alternative, OpenStax, prints the figure but runs into D2.

**D14. Zoom and narrow windows.** At 200% zoom on a 1366 px screen the bench is not shown. The drawing itself fitted at 579 px of page in my prototype. **Recommendation:** keep the spec's 768 px, say so in the notice and in the institution text. Lowering the limit is possible later and would need its own check.

**D15. The primer.** Read it as the person who runs this lab: the new card on titrating to the endpoint, the sentence that the acid was itself standardized, "about pH 8.3", "conditioning", the 30-second wait that in this model cannot fail, and the safety card's scope. **Recommendation:** change anything you would say differently at the bench, at Gate A. Merges shell O10.

**D16. Average and relative deviation.** Entered by the learner on completion, over the three passing trials; the notebook's shown beside them; nothing marked; the notebook's deviation worked from the four-decimal average. **Recommendation: as stated.** Merges shell O2 and both reviewers.

Smaller things taken as decided unless you say otherwise: additions are exact, so counting presses gives the titre; the export file holds the seed, from which the answers follow; refilling is not forced; a comma is not accepted as a decimal mark.

## 10. What I could not verify

- **I did not re-run the three designs' own test suites.** Their reviewers did (101, 115 and 97 tests). I ran the engine and bench prototypes' modules through my own join.
- **The engine changes this file proposes were not prototyped by me**: `discardTrial`, the end judged after water, the checklist's four states, removing `selectHcl`, the mode gate, `summarise` from the rounded average, exactly four decimals. The expected values in tasks 5 and 6 for those are arithmetic or the reviewers' measurements, not output of a changed engine. `summarise([0.0949, 0.0948, 0.0949])` = 0.0949 and 0.4, and `[0.0987, 0.0989, 0.0986]` = 0.0987 and 1.0, are worked by hand from the shell reviewer's figures (0.351 and 1.01).
- **The layout prototype is a picture, not the app.** The notebook, the guide and the record are stand-ins with fixed text; the bench's buttons do nothing; the engine behind it is the bench prototype's fake. Headless Chromium only, light theme only for the measurements, menu open only, device scale 1. Firefox and Safari handle container query units inside `min()` and `clamp()` in ways I did not check.
- **Nothing was heard or touched.** No screen reader, no touch, no person.
- **The scripted learners of section 1.1 part 3 are scripts.** "Stops when a pour ends on 'fades slowly'" is one way to read the status line; a person may do better or worse.
- **The hazard entries.** I did not open the PubChem records; D4's recommendation rests on what the two designs and the shell's reviewer report they print.
- **OpenStax.** I did not fetch the pages; the licence finding is the shell design's and its reviewer's.
- **The draft sentences of 4.4 and the notice T1** are mine and have been read by no one.
- **Whether 54rem is the right place for the bench to change layout** in the real components: the real tiles will carry hazard text and status ticks the stand-in only gestures at, and the real notebook's last-result block and summary form were not drawn.
- **`git status` was clean when I finished**, and my Vite server used its own cache directory, which I removed.
