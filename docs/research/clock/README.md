# Clock reaction lab research record

The inputs the clock reaction lab is built from (spec section 19), where each came from, and what could not be found. Everything was gathered on 2026-10-10. Nothing in this folder is loaded by the app.

`npm run build:data` reads this folder and writes `src/chem-data/clock/clock.json` and the lab's entries in `src/chem-data/sources.json`. The build stops, and writes nothing, on an input it cannot hold to its sources, on a reaction that does not balance, and on a set of mixtures that is not the one the lab is specified with.

| File | What it is |
| --- | --- |
| `clock.json` | The lab's record: the five bottles; the gas constant and the kelvin of 0 °C; the two reactions and the count of six to one between them; the reaction's rate record, which is what the engine takes (the order in each reactant, the rate constant at a stated temperature, the activation energy, and what ends a run); the five mixtures, each split between two flasks; the three baths; the three parts, each with the notes shown when it is done; and the model's parameters, each with its rationale |
| `sources/MANIFEST.json` | Every source of that record and of the primer (`src/chem-data/clock/primer.ts`): its address, its citation, and rows that say what it prints and where, each naming the stored values it supports |
| `hazards.json`, `sources/hazard-manifest.json` | The hazards of the five bottles, the documents behind them, and the documents read for the primer's safety card. They were written apart from the rest, in the form of the Le Chatelier's principle lab's, and the build merges them into the record. Every bottle's record is this lab's own |

No source has a copy in this folder. One source is shared with other labs and is written in the manifest as they write it: NIST's listing of the constants. Four documents of the hazard manifest are ones earlier labs read too, and are listed once.

## Which figures are sourced and which are the lab's own

| Figure | Stored | Whose |
| --- | --- | --- |
| Order in iodide, in bromate, in hydrogen ion | 1, 1, 2 | Cited: the summary of a study of this reaction, and the summary of a thesis that calls its rate law fourth order |
| Rate constant | 50.26 L³/(mol³·s) at 25 °C | Cited: the summary of that thesis, which measured it at an ionic strength of 1.00 in a nitrate medium. Used as printed, in mixtures that hold far less salt |
| Activation energy | 50 kJ/mol | **The lab's own, not a measured one.** No source read gives it for a mixture like this bench's. It is stored as a model parameter with its rationale, cites no source, and the notes, the wording and this file say that it is the lab's own |
| Count between the reactions | 6 thiosulfate ions for 1 bromate ion | Cited, and worked out again by the build from the two equations |
| The five mixtures | See below | Cited: a school's handout for this experiment, with the lab's own bottles at the lab's own volume |
| Gas constant | 8.314462618 J/(mol·K) | Cited: NIST's listing of the 2022 CODATA values |
| Kelvin of 0 °C | 273.15 K | Cited: NIST's page on the units of temperature |
| The liquid before and after | clear and colourless; dark blue | Cited: two colleges' handouts |
| Room and bath temperatures, the scatter in a time, the limit on a late watch, the tolerances, the places on the line | See `parameters` | The lab's own: model parameters, each with its rationale |

## The mixtures

All of 50 mL. Flask A holds the iodide, the thiosulfate and the water; flask B holds the bromate and the acid, and the starch goes into it.

| Mixture | KI 0.010 M | Na₂S₂O₃ 0.0010 M | Water | KBrO₃ 0.040 M | HCl 0.10 M | Once mixed: [I⁻], [BrO₃⁻], [H⁺] in mol/L |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 10 | 10 | 10 | 10 | 10 | 0.00200, 0.00800, 0.0200 |
| 2 | 20 | 10 | 0 | 10 | 10 | 0.00400, 0.00800, 0.0200 |
| 3 | 10 | 10 | 0 | 20 | 10 | 0.00200, 0.0160, 0.0200 |
| 4 | 10 | 10 | 0 | 10 | 20 | 0.00200, 0.00800, 0.0400 |
| 5 | 8 | 10 | 12 | 5 | 15 | 0.00160, 0.00400, 0.0300 |

Every mixture holds 0.000200 mol/L of thiosulfate, so a run ends when 1/30 000 mol/L of bromate has reacted. The build checks that each mixture is of 50 mL, that no flask holds all three reactants or the thiosulfate with the acid, that the first has the same volume of each liquid, that mixtures 2, 3 and 4 each hold twice the first's strength of one reactant and the same of the others, and that the fifth differs from the first in all three.

**How fair it is to take the concentrations as they start.** By the end of a run 0.21% to 0.83% of the bromate and 0.50% to 1.00% of the hydrogen ion have been used up. The iodide is as it was: the second reaction gives back the six iodide ions the first takes. Summing the true, slowly falling rate over a run gives a time 0.71% to 1.22% longer than the lab's arithmetic, which a test works out. One handout read says that the error of this idealisation is typically under 5%.

## The numbers over seeds 1 to 100

Tests hold every figure here (`src/engine/clock/acceptance.test.ts`).

| Run | Time, watch stopped at the change |
| --- | --- |
| Mixture 1 | 109.9 to 146.4 s |
| Mixture 2 | 55.7 to 73.0 s |
| Mixture 3 | 54.9 to 73.0 s |
| Mixture 4 | 27.5 to 36.7 s |
| Mixture 5 | 123.7 to 163.6 s |
| Mixture 1 in ice water | 556.0 to 636.8 s |
| Mixture 1 in cool water | 277.8 to 325.9 s |
| Mixture 1 in warm water | 34.8 to 44.9 s |

One handout read has the first mixture turn blue in about two minutes at room temperature.

**The orders are unmistakable.** An order is the choice nearest the power that takes the ratio of two strengths to the ratio of two rates, so it is mistaken only where that power is half an order or more from the whole number. With a hand three tenths of a second late on every run, the power is within 0.04 of the whole number at every seed: 0.971 to 1.019 for iodide, 0.969 to 1.024 for bromate, 1.961 to 2.014 for hydrogen ion. At every corner of what the draw can give, with any run stopped as late as still counts and any other on time, it is within 0.128.

**A careful learner is always within tolerance.** With a hand three tenths of a second late, the mean rate constant is between 1.12% under and 0.09% over what the model gives at the room's temperature, and the activation energy between 0.8% under and 0.4% over the model's, whichever two of the twelve places on the line the slope is taken between and whichever way the rounding rule lets each entry be worked. Both tolerances are 5%.

**The limit on a late watch.** A watch stopped by hand more than 2.0 s after the change makes its run not count, and the run is made again. With every watch of a lab stopped 2.0 s late, over the hundred seeds the mean rate constant is 2.33% to 3.93% under and the activation energy 0.8% to 2.4% under. At every corner of what the draw can give, the worst is 4.33% for the rate constant and 2.89% for the activation energy. So a lab whose runs all count cannot fail a part for the watch alone.

Were there no such limit, this is how late one run alone could be stopped, every other run three tenths of a second late, before its part failed. The shortest runs are the tightest.

| Run | An order is mistaken from | The mean rate constant leaves its 5% from | The activation energy leaves its 5% from |
| --- | --- | --- | --- |
| Mixture 1 | 46.2 s | 27.9 s | 52.8 s |
| Mixture 2 | 22.2 s | 14.1 s | |
| Mixture 3 | 22.7 s | 14.0 s | |
| Mixture 4 | 11.4 s | 7.4 s | |
| Mixture 5 | never | 30.8 s | |
| Mixture 1 in ice water | | | 93.7 s |
| Mixture 1 in cool water | | | 115.6 s |
| Mixture 1 in warm water | | | 4.8 s |

Each figure is the least over the hundred seeds, found by a script that was run once and not kept.

## How each kind of value was read

- **The procedure.** Four handouts for this experiment, each fetched once and read as the text taken out of its file: a college's, with the lab's own five bottles and three baths; a school's, with the five mixtures of 50 mL; a second college's, which says how long the first mixture takes and that the clock counts a sixth of a mole of bromate for each mole of thiosulfate; and a third college's, in a copy that another university's instructor serves. Each site's robots file was asked for first: two have none, and none of the others has a rule against automated readers or against the folders read.
- **The orders.** The record that a university's research portal keeps for a paper of 1976. The page is drawn by a script, so a plain request brings no words back. It was read through a tool that fetches a page and answers questions about it, asked twice; no copy of its words could be saved, and the manifest says so. The paper itself was not read.
- **The rate constant.** The record that a university's repository keeps for a thesis of 1969, read as fetched. The thesis file is open only to a reader who is signed in; the request for it was answered with a sign-in page, and the site was not asked again.
- **The activation energy.** Not found. See below.
- **The constants.** NIST's listing of the 2022 CODATA values, fetched again and found to be the file the earlier labs read; and NIST's page on the units of temperature.
- **The primer's ideas.** Six pages of Chemguide and the four handouts, each with a row in the manifest.
- **Hazards.** `hazards.json` and `sources/hazard-manifest.json`, written apart. Fifteen rows of that manifest that were read for the primer's safety card and that the card does not use are marked there as read and not carried, for length.

## Where the lab is other than spec section 19 has it

1. **A run that counts is not made again.** Spec 19.2 says that a run can be made again. A run that does not count can be, as often as is wanted. One that counts is in the table of times, and the notebook's entries are held to that table; if its time could change under them, entries already made would stop following. It is one rule of the engine (`run-counts`).
2. **A watch stopped by hand too late, or too early, makes a run not count.** Spec 19.2 names two errors of technique. The engine has two reasons more, both of timing: stopped before the liquid changed, and stopped more than 2.0 s after. The first cannot give a time at all. The second is the limit on a learner's own delay: without it a lab whose every run counted and whose every entry followed could fail a part for the watch alone. Neither has a warning in Guided, since neither can be seen coming.
3. **The watch stops itself after half an hour.** A run with no starch never shows anything, and a learner in Challenge has not been warned. The limit ends it.
4. **The thermometer must be read before the flasks of a bath are poured.** The pour is refused until it has been, with a sentence that says so. It is not a third error of technique: nothing is made that does not count.
5. **Letting the flasks stand is one step, taken or skipped.** After it they are at the bath's temperature; before it they are at the room's. A run mixed before it is timed by the model at the temperature half way between the room's and the bath's, which is the model's own device for a time that belongs to no one temperature, and never counts.
6. **Part 3's notebook waits for part 2 to be done.** Its rate constants are worked with the rate law found there. The runs in the baths can be made at any time.
7. **The unit of the rate constant is an entry of its own,** after the figure. It must follow from the learner's own three orders.
8. **The two places on the line are entries,** each a choice among the places that have been looked at, and the slope must follow from those two.
9. **The mean is of all five runs.** Spec 19.3 has the notebook fill the rest and their mean. The fifth mixture checks the rate law by giving the same rate constant as the others; the notebook does not work out a predicted time for it.
10. **The liquid after the change is stored as dark blue,** as a handout read has it, where spec 19.1 says blue.
11. **No molar mass is stored.** Spec 19.5 asks for them where a note needs them, and none does.

## What could not be sourced, or only in part

- **This reaction's activation energy in dilute hydrochloric acid.** No source read gives it. The lab's 50 kJ/mol is its own figure. It is the size at which a rate about doubles for a rise of ten degrees near room temperature, which one page read works through with that very figure. One paper read gives apparent figures for this reaction, and they are not used: see the first point under "What a chemist should look at".
- **A rate constant measured in a mixture like this bench's.** The figure stored was measured at an ionic strength of 1.00. The lab's mixtures are between 0.03 and 0.05, by the lab's own arithmetic from the bottles.
- **How the two terms of the rate law compare at this bench's acidity.** The study read was made at pH 3 to 4 and its summary gives no figure for either constant.
- **Whether the rate constant read counts its rate in bromate.** The summary of the thesis does not say what its rate is the rate of. The lab takes it as the bromate used up, which is how the lab's own rate is counted.
- **How long the runs in the baths take on a real bench.** No handout read gives a time for any of them.
- **The scatter of a real bench,** and how late an ordinary hand is. Both are the lab's own.
- **What a flask with no starch shows.** Spec 19.2 has nothing ever show. A document read for the safety card describes a dilute solution of iodine as pale yellow to brown, so a real flask would slowly take on a colour; the model shows none. It is said in no sentence of the lab that a real flask stays colourless.
- **The strength of the starch solution.** The record stores none, and since the review of 2026-10-11 the note under the bottle's hazards gives none either, where it said about 2%. One handout read lists 0.2%. Which is on the owner's bench is the owner's to say. Two things still lean on the figure that was taken out, and are in the review's list for the owner: the note calls one supplier's sheet, which is for a solution of under 1%, a sheet for "a weaker solution", and the hazard manifest's row for that sheet says that the bench's is about 2%.

## What a chemist should look at

1. **The activation energy.** It is the lab's own. The one paper read that measures it (in 0.1 M sulfuric acid, with potassium chloride added, at 25 to 40 °C, following the colour of the iodine) gives 16.21 kJ at an ionic strength of 0.306, falling to 5.23 kJ at 2.106, and 21 kJ carried back to no salt. It was not used for three reasons, each of which can be checked: sulfuric acid's own hydrogen ion changes with temperature, so what is measured is not the reaction's alone; the figure moves threefold with the salt; and the paper's rate constants, turned into the fourth-order kind with a hydrogen ion of 0.1 to 0.2 M, come to between 2 and 8 L³/(mol³·s), a twenty-sixth to a sixth of the figure the thesis gives. If a chemist knows a measured figure for dilute hydrochloric acid, it is one number of the record, and the tests' pinned figures follow from it. A second paper of the same group was read on 2026-10-18 and disagrees with the first: see "The activation energy, looked for again on 2026-10-18" below.
2. **The rate constant's medium.** A rate constant between ions changes with the ionic strength, and the paper read shows that this one does. The lab uses a figure from a far saltier medium, in nitrate, for dilute chloride mixtures. With it the first mixture takes 1.8 to 2.4 minutes in the room, which agrees with the handout's about two minutes.
3. **The second term of the rate law.** The lab's rate law has the term in the square of the hydrogen ion alone.
4. **What the rate counts.** See above: the lab takes the thesis's constant as counting bromate. If it counts iodine, the lab's times are a third of what that constant gives.
5. **Iodine and thiosulfate in ice water.** One handout read has the two react all but at once above 10 °C, and says nothing of colder. The lab's ice bath is at 0.5 to 2.0 °C, and the model takes the reaction as instant there too. The note of part 3 says so.
6. **Thiosulfate and acid.** A page read for the primer says that thiosulfate with dilute acid slowly gives sulfur. The lab's thiosulfate is kept from the acid until the flasks are mixed, and is very dilute; the model takes none of it as lost that way, even over the ten minutes of the ice bath.
7. **A flask with no starch.** See above.
8. **The flasks at the bath's temperature.** The model has them there after ten minutes, and has the mixture stay there for the whole run, though the reaction and the room both move it a little.
9. **The ice water.** The thermometer in a flask reads 0.5 to 2.0 °C, not 0: a model parameter, with no source.
10. **Hydrochloric acid as the hydrogen ion.** The hydrogen ion is taken as the acid's whole strength, and the chloride as doing nothing.

## The activation energy, looked for again on 2026-10-18

Asked for by the owner's list of open chemistry questions: a published activation energy for this reaction, with this rate law, to replace the lab's own 50 kJ/mol. None was found that fits, and the two that were read disagree with each other, so nothing in the record was changed.

**The second paper read.** Uddin, F.; Tahir, H. Salt effects in the kinetics of reaction between iodide and bromate ions. *Pakistan J. Sci. Ind. Res.* 2002, 45 (3), 168–171 (https://pjsir.org/multidisciplinary-archive/Volume%2045%202002/Issue%203/Article%206%20Vol%2045%20Issue%203%202002%20pp%20168-171.pdf), read as the scanned PDF the journal's archive serves, whose site has no robots file; read and not kept. Potassium iodide and potassium bromate at 1.25 × 10⁻³ mol/dm³ each, in sulfuric acid of 2.5 × 10⁻² mol/dm³, at 20, 25, 30, 40 and 45 °C, followed by the iodine's absorbance at 425 nm, with sodium nitrate added for the higher ionic strengths. With the acid in excess the rate is treated as second order, the acid folded into the constant. Table 2 gives the apparent activation energy as 42.00 kJ/mol with no salt added (the square root of the ionic strength 0.277, an ionic strength near 0.077), falling to 26.35 kJ/mol as salt is added (0.822, near 0.68), and 49.60 kJ/mol for the line carried back to no ionic strength at all (49.61 in the text). Table 3 has the constant rise 1.5 to 1.8 times for ten degrees.

**Why it is not used.** It has the two faults of the 1979 paper by the same first author (see the first point above): the acid is sulfuric, whose second hydrogen ion comes off less as the solution warms, so part of what is measured is the acid's and not the reaction's, and that part counts twice in a rate that goes with the square of the hydrogen ion; and the constant is of the second order, not the fourth the record uses. The two papers also disagree: near an ionic strength of 0.3 the 1979 paper gives 16.21 kJ/mol and the 2002 paper about 35 kJ/mol, and carried back to no salt, 21 and 49.6. That the 2002 figure for no salt lies near the lab's 50 is not taken as support for it: it is a line carried beyond its points, from the paper that disagrees with the other.

**What it would change, if a chemist preferred the 42.00.** Worked by this project from the record's own figures: the first mixture would take about 3% less time in the room, about a quarter less in ice water and about a sixth more in the warm bath, and the slope of part 3 would be about −5 050 K where it is about −6 010 K. The record and its tests would change as for any figure of the rate record.

**Not read.** King and Lister's paper of 1968 in the *Canadian Journal of Chemistry*, which the 2002 paper cites for the order of the reaction: the journal's robots file names an AI reader, so it was not asked for. No other measurement of this reaction's activation energy was found by the web searches made; they found student reports giving figures such as 45 kJ/mol, which are not sources. The thesis whose summary gives the rate constant is still closed to a reader who is not signed in.

## Tried and not read

One university's site closes itself to every automated reader in its robots file, and a journal's site names an AI reader in its own: neither was asked for a page. A university's repository answered the request for a thesis with an error, and was not asked again. The thesis file of the repository that was read asks for a sign-in, as above. PubChem's data service was not asked. No page of OpenStax was fetched, and no page of Wikipedia.

Pages that were fetched while looking and that nothing rests on: a university's page for a virtual iodine clock, which is of another reaction, iodate with arsenite; a second paper of the journal read, which is of bromide with bromate; and Chemguide's menu of pages on rates.

## Read and not kept

Every source. A value read from a page that is not kept rests on what the manifest says the page printed that day. What the build holds is that the record and the manifest give one account, that the two reactions balance and give the stored count, that the mixtures are the ones specified, and that the rate record holds together, with the activation energy marked as the lab's own.

The quotation fingerprint that `src/chem-data/clock/quotation.test.ts` and `src/app/lab/clock/messages.test.ts` compare the lab's words against is not kept either, for the reason `../phase-3/sources/README.md` gives. `scripts/fingerprint-sources.mjs` writes it to `sources/`, where `.gitignore` lists it, from pages saved outside the repository:

    node scripts/fingerprint-sources.mjs <folder of saved pages> 2026-10-10 docs/research/clock/sources

It holds every page but one: the record of the research portal, of which no words could be saved.

## The engine

The lab runs on a kinetics engine that takes a reaction's record and is not this lab's alone (`src/engine/kinetics/`); this lab's door for the app is `src/engine/clock/index.ts`. A test runs the engine on a second, made-up record with other orders, another end to a run and no indicator (`src/engine/kinetics/secondRecord.test.ts`). The numbers of three significant figures and the rounding rule are shared with the calorimetry lab (`src/engine/figures.ts`).

Two things in the engine are not whole-number arithmetic: e to a power, for the Arrhenius equation, and the natural logarithm, for the graph. Each is worked with + − × ÷ alone, so that every engine gives the same bits, and what comes of them is rounded, to whole milliseconds and to whole thousandths, before anything is worked from it. Every entry a learner makes is judged on fractions of whole numbers.

## What nobody checked

No chemist has read the record, the notes, the primer or the page's sentences. Two of the sources behind the rate record were read only as summaries.

## The screens

Built on 2026-10-11 (spec section 19.8, which says where the page is other than 19.2 and 19.3 have it). They changed no engine file and no stored value. What they added to the lab's own rules, which the engine does not have:

- **The page plays the time** (`src/app/lab/clock/watch.ts`). As first built every run had a speed of its own, 5 to 55 seconds of the lab's time to a true second, so that each changed 5 to 12 true seconds after its pour. Since the review the five mixtures of part 1 are played at one speed, 14, so that a shorter time is a shorter wait, and each bath of part 3 keeps its own: 5 for the warm bath, 30 for the cool and 55 for the ice. The review's section below has the true times. From the frame that shows the change the watch adds true time, so that what it reads when a hand stops it is the time the engine records.
- **A watch in whose flask nothing will show** runs on to its limit after 20 true seconds, in 4 more, and is stopped there.
- **The pour is handed to the engine together with the stop.** A run that is left with its watch running has nothing stored and is poured again; its attempt, and so its time, is the same one.
- **A press in the frame that finds the change** is handed in with no delay.
- **For the first half second after a pour the bench takes no press,** since the review: a press that soon is the pour's own, come twice.
- **The delay that is handed in is the page's measure,** from the frame that drew the change to the press, by the browser's own clock. What a device adds before a frame is seen and before a press is handed over is in it and was measured on no device.
- **The colours on the screen are the drawing's own:** the liquid with no colour #e8edf2 and the dark blue #14296b, on a white card in both themes.

Two sentences were added to the page's wording, each with a test: what a run that was left says, and how the record lists a run stopped by hand with its delay. Both quotation tests were run on 2026-10-11 against a fingerprint rebuilt from the 47 pages saved for the lab, and passed with none skipped.

The screens were checked by script in headless Chromium by the AI coding assistant that built them, and then reviewed by one that had built none of the lab, which is the next section: `docs/for-institutions.md` says what was run and what was not. No person has run the lab, no screen reader was used, and no real device.

## The review of 2026-10-11

The one deep review of the phase, held when the screens were whole, by an AI coding assistant that had built none of the lab: not the record, the hazards, the engine, the wording or the page. It worked by script in headless Chromium and by reading. It made five changes the project's owner had decided on, looked for faults by using the page and not by reading alone, and put right what it found in the same pass. This section says what was changed, what was found, what was left and what nobody checked. The page as it now is, is section 19.8 of the design spec.

### Five changes the owner had decided

1. **The five mixtures of part 1 are played at one speed.** As built each run had a speed of its own (13, 7, 7, 5 and 14 seconds of the lab's time to a true second), chosen so that all five changed 5 to 12 true seconds after their pour. That hid the very thing the lab is about: the mixture with twice the acid, whose time is a quarter, took as long to wait for as the first. All five are now played at 14 (`ROOM_SPEED` in `src/app/lab/clock/watch.ts`), so a time twice as long on the watch is twice as long to wait for. The baths of part 3 keep their own speeds, 5, 30 and 55, since forty seconds and ten minutes cannot both be waited for at one; the line beside a running watch says which: "at one speed for all five mixtures", or "each bath at its own pace".

   | Run | On the watch, seeds 1 to 100 | True seconds from the pour to the change | At any room and scatter the draw can give |
   | --- | --- | --- | --- |
   | Mixture 1 | 109.9 to 146.4 s | 7.9 to 10.5 | 7.8 to 10.6 |
   | Mixture 2 | 55.7 to 73.0 s | 4.0 to 5.2 | 3.9 to 5.3 |
   | Mixture 3 | 54.9 to 73.0 s | 3.9 to 5.2 | 3.9 to 5.3 |
   | Mixture 4 | 27.5 to 36.7 s | 2.0 to 2.6 | 2.0 to 2.6 |
   | Mixture 5 | 123.7 to 163.6 s | 8.8 to 11.7 | 8.7 to 11.7 |

   The last column is the review's own arithmetic from the record, at 20.0 and 24.0 °C with the scatter at either end. Tests hold the one speed, the slowest within 12 true seconds and the fastest in two to three at every seed from 1 to 100, the fourth mixture in a quarter of the first's true time, and each bath's run between 5 and 12. In the browser, in six labs, the first mixture's picture changed 8.1 to 10.8 true seconds after the press that poured it and the fourth's 2.2 to 2.6, by the page's own clock as the script read it.
2. **"Stop the watch for me at the change" is offered before the first pour,** beside the pour, in a run of part 1 and of part 3, and beside Stop from the pour as before. It is one small piece drawn in both places. It costs a third row of buttons under the flasks: see what was left for the owner.
3. **A press just after the pour is not taken.** Focus goes to Stop at the pour, so a second press of Enter stopped the run before its change, and it did not count. The bench now takes no press for the first half second after a pour: one handler on the bench (`ClockBench.tsx`), which asks `tooSoon` in `watch.ts`, with a test. It is on the bench and not on Stop alone because of what was measured: at 768 by 1024 with the menu open, the watch's card brings Stop, the other way of stopping and a disclosure to where the pour stood, so the second tap of a double tap landed on one of the three. A press is judged by when it was made, as the browser has it, and not by when the page came to it; in one run the page stood still for 2.5 seconds just after a pour, and a press made 0.17 seconds after the pour was still not taken when the page came to it. No run changes within 1.9 true seconds of its pour, so no press that is meant to stop a watch is lost; a press that is meant for something else and comes within the half second is not taken either, and nothing says so.
4. **The starch bottle's note says no strength.** It said "about 2%". No page saved for the lab gives that: one handout lists 0.2%, the two suppliers' sheets for a solution are for one of under 1% and one of 5%, and the record stores none. One word of `hazards.json` was changed, and the app's record rebuilt from it. The bench's line and the bottle's tile gave no strength already.
5. **The documents say that the review was held,** by whom and how, what it found, and what nobody checked: this section, sections 14 and 19.8 of the design spec, `docs/for-institutions.md` and the project's README.

### What the review found, and what was done

Each is marked as it was judged: must-fix where a learner is stopped, loses work, is told something false, sees an answer or cannot do something; should-fix where a user or a maintainer would plainly want it corrected. How each is known is said with it: ran (seen in the browser), measured, or read.

6. **With the bench open, "Sources" over it could not be opened** (must-fix). Measured, by asking the page what lies at each point about a control, and ran. Under a running watch stand "The mixture" and "The flasks", and under the ways on of every entry "Times of the runs that count", "Sources" and "The bench": each a line of words 20 px tall under a hit area of 44, and they stood 8 px apart. "The mixture" and "Sources" each answered over 28 px of height, and with the bench open a click on the middle of "Sources" closed the bench and opened nothing. It is the fault the reviews of the Group I cations lab and of the Le Chatelier's principle lab found and put right in those pages; this page had the form they had before. The lines now stand 36 px apart. After the change every control of the Lab, Record and Primer tabs answered 21 px either side of its middle, each way, in fourteen states of the page at 768 by 1024 in each theme and at 1280 by 800 in the light theme, and with each disclosure open, but for the twelve columns of the graph, which are 31 to 38 px wide by design and have the two step buttons under the graph.
7. **A notebook filled in Challenge and not checked had nothing to press once the mode was Guided** (should-fix). Ran. Guided checks a notebook at its last entry and has no check; with all nine entries made in Challenge, nothing waited to be entered. The page said of each entry whether it follows, and the ways on were to change the mode back or to press "Change" on the last entry and enter it again, which nothing said. The check is now offered in Guided where a notebook is full and not checked, with a test for both notebooks. No engine file was changed.
8. **The Record tab said of a watch that had stopped itself that it was stopped by hand** (should-fix). Ran. A run with no starch runs to the watch's limit and the run's own card says "The watch stopped itself at 30:00.0"; the record said "1800.0 s, watch stopped by hand", or "at the change" where that had been asked for, and there had been no change. It now says "1800.0 s, the watch stopped itself", with a test.
9. **Pressed once the liquid had changed, the choice to have the watch stopped did not stay pressed** (should-fix). Ran. Spec 19.8 has it stay pressed for the runs that follow; it stopped that run's watch at the change and was not pressed at the next run. It now stays pressed whenever it is pressed.
10. **With motion reduced, the liquid's new colour came one frame after its words** (should-fix). Measured, by asking the page in every frame from the change on what was animating. The app's rule for reduced motion gives every transition a length of a hundredth of a millisecond, and that still held the new fill back by a frame; the page's builder had seen it once in five runs and not named it. The liquid now has no transition, with a test, and nothing was animating in any of forty frames from the change on.
11. **`docs/for-institutions.md` said that every control was 44 px or more,** from each control's own size, that no run had been made by the keyboard alone, and that the contrast of nothing had been measured (see 6 and what was run and measured, below). It now says what was measured, how, and what was changed.

Nothing else in the code was changed. No engine file was changed, no stored chemistry value or model parameter, and the stored entry's name and version are as they were.

### What was read and worked again, and found sound

- **The primer's worked examples,** by hand: 0.000000322 as 3.22 × 10⁻⁷; 0.50 × 20 ÷ 50 = 0.200 M; 1.58 × 10⁻⁶ ÷ 4.00 × 10⁻⁷ = 3.95; 2.40 × 10⁻⁶ ÷ (0.0200 × 0.0100²) = 1.20 L²/(mol²·s); 20.0 °C as 293.15 K; (2.300 − 4.500) ÷ (0.00360 − 0.00320) = −5500 K; 5500 × 8.314 = 45 727 J/mol, 45.7 kJ/mol; and the unit of a rate constant for each sum of orders from one to four.
- **One whole lab's figures, from its times to its results,** by hand, from the lab the review worked by keyboard (room 23.2 °C; 117.7, 59.0, 58.9, 29.8 and 130.6 s). The five rates came to 2.83, 5.65, 5.66, 11.2 and 2.55 × 10⁻⁷ mol/(L·s), the ratios to 2.00, 2.00 and 3.95, the rate constants to 44.2 (from the rounded entries), 44.1, 44.2, 43.7 and 44.3, and their mean to 44.1, all as the page had them. The model's rate constant at that room, from 50.26 at 25 °C with the lab's 50 kJ/mol, came to 44.5, and the mean is 0.8% under it, as the page said. In part 3 the two places entered, (0.003150, 5.132) and (0.003250, 4.533), give a slope of −5990 K and 49.8 kJ/mol; the line's two ends give −5994; and the bath temperatures the three times imply by that line are 0.8 and 41.5 °C for ice and warm water, inside the ranges the record gives. A second lab's rate constant at 22.5 °C, 42.4, was worked the same way.
- **The record's arithmetic as the notes give it:** the slow reaction balances in atoms and in charge, and with the fast one gives six thiosulfate ions to one bromate ion; by the blue 0.21% to 0.83% of the bromate and 0.50% to 1.00% of the hydrogen ion are used up; and with 50 kJ/mol a rate goes up 1.97 times from 20 to 30 °C.
- **Every sentence a learner can be shown:** the page's wording (`messages.ts`), the primer's eight cards, the nine notes of the three parts, and the five hazard notes. None was found to give chemistry or arithmetic that is wrong, to contradict what the page does once the changes above were made, or to give the activation energy without saying that it is the lab's own: the sentence that gives it, the note of part 3, the sentence that says what a result was held to and the line under the sources each say so. The hazard notes were read as sentences and not against their documents.
- **The watch** (`watch.ts` and its tests), and in the browser what a learner is given. The time recorded is the watch's own reading at the press: the model's time of the change with the true time since the frame that drew it. In six runs stopped by Enter about 0.35 seconds after the change, the delay stored was 348 to 390 ms, each within 20 ms of the script's own measure from the moment the picture changed. The stopped watch reads the time of the press, which is later than the last figure drawn by up to a frame; with a watch running the page drew 60 frames a second at both window sizes in both themes, the longest gap 27 ms.
- **The code.** The play of a watch is ended when its run is left, by its frame's own cancelling; a stop is sent once for one watch (a guard was added so that a press between the frame that ends a run and the drawing of its end is not a second stop: read, and not seen to happen); the pour is stored only with a stop. The app imports nothing below the clock engine's door and nothing of the kinetics engine, and the lint rule's own test holds that. No test of the lab was found that asserts nothing.

### What was run

All in headless Chromium on Linux, on the production build, by script. The scripts are not part of the repository.

- **A whole lab in Guided by the keyboard alone,** at 768 by 1024 in the light theme and at 1280 by 800 in the dark: 76 checks at each, all passing at the last run. A stop before the change, a stop 2.6 seconds after it, the watch stopped for the learner (chosen before the pour, and while the watch ran), no starch with Guided's warning and its way back, a bath's run mixed before it had stood, the pour held until the thermometer is read, a run left for another part, for another tab of the page and for another tab of the browser, a reload with a watch running, wrong entries of each kind in both notebooks, Change and Escape on an earlier entry, the graph by the arrow keys, Home and End, and the Record tab.
- **A whole lab in Challenge by emulated touch,** at 768 by 1024 in the dark theme, through Restart: 50 checks, all passing at the last run. The text of the Lab tab and of the Record tab was searched at nineteen points for what Challenge is kept from before a part is done, and none of it was there before its time.
- **Reduced motion, Restart, a double click on the pour at 1280 by 800, records the page never writes and records that do not fit:** 19 checks, passing. Six double taps on the pour at 768 by 1024, with the menu open and closed, each left the watch running and the choice not pressed.
- **The calorimetry lab's graph and worksheet by keyboard,** which now draw the typed entry and use the keys that were lifted into the shell: 9 checks.
- **The builder's own scripts again,** on the build the review left: 43 checks, passing, and its pictures of the page retaken in both themes at both sizes.

### What was measured

- **Contrast, on pictures of the page at 768 by 1024.** The figures of the watch and its frame: 19.8 to 1 in the light theme and 17.2 to 1 in the dark. The graph's line, a run's point, a place and its edge, and the figures of its axes: the same. The drawn flask stands on a white card in both themes: the dark blue liquid is 13.5 to 1 against the card and 11.4 to 1 against the liquid before the change, which is 1.2 to 1 against the card inside a glass drawn at 14.8 to 1. The change is from light to dark, and is told in words under the flask, beside it and in a status line.
- **How long a run is,** at 768 by 1024 with the menu open, where 959 px of the window are under the tab bar: 744 px before its pour, where it was 694, ending at 938 px, and at 1,014 on the first screen of a lab that is not begun; 871 with Guided's warning; 517 with the watch running and 385 stopped; 594 for a bath's run ready to pour. At 1280 by 800, where 735 px are under the bar: 667 px before the pour with 126 over it.

### Left for the owner

- **The third row of buttons.** With the choice beside the pour, a run of part 1 before its pour is 50 px longer. On the first screen of a lab at 768 by 1024 the choice is partly under the window's foot until the first press, and at 1280 by 800 it is under it. The starch and the pour are in the window at both sizes.
- **The starch note said "for a weaker solution"**, which compared a sheet with a bench strength the record does not store. Put right after the review, on 2026-10-11: the note now gives that sheet's own figure, under 1%, and compares nothing, and the hazard record's row for the sheet no longer gives the bench a strength.
- **The half second takes a press that was meant, too,** and says nothing: "Stop the watch for me at the change" pressed within half a second of the pour is not pressed. It is beside the pour now, and shows whether it is pressed.
- **A late press of "Stop the watch for me at the change" makes any run one that counts.** Pressed however long after the change, it stops the watch at the change. That is the design; it is said here because it is also a way round the 2.0 seconds.
- **The slope's line of help gives its example with a minus sign,** "−1230", in Challenge as in Guided, before the entry is made.
- **A time of four figures may be rounded to three before the rate is worked,** by the rounding rule the lab shares with the calorimetry lab: with a time of 139.5 s both 2.38 × 10⁻⁷ and 2.39 × 10⁻⁷ follow.
- **A run's point can lie over a place on the line** where a bath's temperature falls on one, and the place's circle is then under the diamond; its column and its callout are as they are everywhere.
- **For a chemist,** the ten points above stand as they were written. The review adds none, and removes none.

### What nobody checked

No person has run the lab or read its text. No screen reader was used: what is announced at the change, and how long after it, has been heard by nobody. One browser was tried, headless Chromium, and no real device: no tablet, no finger, and no slow machine but the script's own, where a watch started just after a reload stood still for between 1 and about 22 seconds while the browser disposed of the page before; a trace of one such stall put it in the browser and not in the page's script, and each time the watch then read the right time of the change. No chemistry instructor and no chemist has read the record, the notes, the primer or the page's sentences. The review did not read the sources of the rate record again, and did not read the hazard notes against their documents. Browser zoom, enlarged text and forced colours were not tried.

## Changed on 2026-10-11, with the review of the iodination of acetone lab

This lab's page draws pieces it shares with the iodination of acetone lab's (`src/app/lab/kinetics/`, design spec 20.6), and that lab's review, by an AI reviewer working by script in headless Chromium, changed four things in them. What it found and how is the last section of `../acetone/README.md`.

- **A notebook that is worked again gives focus to its heading.** Focus was lost to the page with the card that held "Work this notebook again". Run on this lab's page, in Challenge, after the change.
- **Part 1's notes have 8 px more under them.** At 768 by 1024, once part 1 is done, the notes' line stood over the button of the list of runs and part of its hit area was answered by that button. That was measured on the other lab's page, which has the same markup; on this lab's page every control of that state answered for itself after the change, and it was not asked before.
- **The two small lines of the part that is shown are in the page's own ink.** Grey on the grey ground measured 4.35 to 1 in the light theme, on the other lab's page.
- **A stopped watch cannot read more than its limit.** The delay handed to the engine is held to what the watch had left to run at the change. A watch with no starch was at its limit already; this is for a frame that comes long after the one before it, once the liquid has changed.

On that build the review worked one run of each part and each notebook of this lab at 768 by 1024, and found it as the review above left it: the five mixtures at one speed, 10.35 true seconds to the change for a first mixture whose watch had it at 144.4 s; a bath's run at its own pace, with the line that says so; the choice to have the watch stopped beside the first pour; a second Enter just after the pour not taken; both notebooks, part 2's to its end. It measured what the builder of the other lab's screens had changed in the shared notebook and had not measured here: the relation of a chosen entry stands 28 px under Enter, and no row of either was answered by the other, closed or open. The twelve columns of the graph are narrower than a finger, as before. This lab's pictures were not retaken. Nobody but AI assistants working by script has checked any of it: no person, no screen reader, one browser, no real device, no chemistry instructor.
