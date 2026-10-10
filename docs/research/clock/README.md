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
- **The strength of the starch solution.** The record stores none. One handout read lists 0.2%; the note under the bottle's hazards, written apart, says about 2%. Which is on the owner's bench is the owner's to say.

## What a chemist should look at

1. **The activation energy.** It is the lab's own. The one paper read that measures it (in 0.1 M sulfuric acid, with potassium chloride added, at 25 to 40 °C, following the colour of the iodine) gives 16.21 kJ at an ionic strength of 0.306, falling to 5.23 kJ at 2.106, and 21 kJ carried back to no salt. It was not used for three reasons, each of which can be checked: sulfuric acid's own hydrogen ion changes with temperature, so what is measured is not the reaction's alone; the figure moves threefold with the salt; and the paper's rate constants, turned into the fourth-order kind with a hydrogen ion of 0.1 to 0.2 M, come to between 2 and 8 L³/(mol³·s), a twenty-sixth to a sixth of the figure the thesis gives. If a chemist knows a measured figure for dilute hydrochloric acid, it is one number of the record, and the tests' pinned figures follow from it.
2. **The rate constant's medium.** A rate constant between ions changes with the ionic strength, and the paper read shows that this one does. The lab uses a figure from a far saltier medium, in nitrate, for dilute chloride mixtures. With it the first mixture takes 1.8 to 2.4 minutes in the room, which agrees with the handout's about two minutes.
3. **The second term of the rate law.** The lab's rate law has the term in the square of the hydrogen ion alone.
4. **What the rate counts.** See above: the lab takes the thesis's constant as counting bromate. If it counts iodine, the lab's times are a third of what that constant gives.
5. **Iodine and thiosulfate in ice water.** One handout read has the two react all but at once above 10 °C, and says nothing of colder. The lab's ice bath is at 0.5 to 2.0 °C, and the model takes the reaction as instant there too. The note of part 3 says so.
6. **Thiosulfate and acid.** A page read for the primer says that thiosulfate with dilute acid slowly gives sulfur. The lab's thiosulfate is kept from the acid until the flasks are mixed, and is very dilute; the model takes none of it as lost that way, even over the ten minutes of the ice bath.
7. **A flask with no starch.** See above.
8. **The flasks at the bath's temperature.** The model has them there after ten minutes, and has the mixture stay there for the whole run, though the reaction and the room both move it a little.
9. **The ice water.** The thermometer in a flask reads 0.5 to 2.0 °C, not 0: a model parameter, with no source.
10. **Hydrochloric acid as the hydrogen ion.** The hydrogen ion is taken as the acid's whole strength, and the chloride as doing nothing.

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

No chemist has read the record, the notes, the primer or the page's sentences. Two of the sources behind the rate record were read only as summaries. No screen has been built: the engine, the record and the wording were tested by scripts alone.
