# Iodination of acetone lab research record

The inputs the iodination of acetone lab is built from (spec section 20), where each came from, and what could not be found. Everything was gathered on 2026-10-10 and 2026-10-11. Nothing in this folder is loaded by the app.

`npm run build:data` reads this folder and writes `src/chem-data/acetone/acetone.json` and the lab's entries in `src/chem-data/sources.json`. The build stops, and writes nothing, on an input it cannot hold to its sources, on a reaction that does not balance, and on a set of mixtures that is not the one the lab is specified with.

| File | What it is |
| --- | --- |
| `acetone.json` | The lab's record: the three bottles; the gas constant, the kelvin of 0 °C and the joules in a calorie; the reaction; the reaction's rate record, which is what the engine takes (the order in each reactant, the rate constant at a stated temperature, the activation energy, and what ends a run); the four mixtures; the two parts, each with the notes shown when it is done; and the model's parameters, each with its rationale |
| `sources/MANIFEST.json` | Every source of that record and of the primer (`src/chem-data/acetone/primer.ts`): its address, its citation, and rows that say what it prints and where, each naming the stored values it supports |
| `hazards.json`, `sources/hazard-manifest.json` | The hazards of the acetone and of the iodine, the documents behind them, and the documents read for the primer's safety card. They were written apart from the rest, and the build merges them into the record. The hydrochloric acid carries the aqueous reactions lab's record (`../phase-4/`), unchanged, as the calorimetry bench's does |

No source has a copy in this folder. Five sources are shared with the clock reaction lab and are written in the manifest as that lab writes them: three pages of Chemguide, NIST's listing of the constants and NIST's page on the units of temperature. They were read in the copies fetched for that lab on 2026-10-10 and were not fetched again.

## Which figures are sourced and which are the lab's own

| Figure | Stored | Whose |
| --- | --- | --- |
| Order in acetone, in hydrogen ion, in iodine | 1, 1, 0 | Cited: two universities' laboratory pages and a college's handout, each read as fetched |
| Rate constant | 2.91 × 10⁻⁵ L/(mol·s) at 25 °C | Cited: table 312.471 of the National Bureau of Standards' *Tables of Chemical Kinetics* (Circular 510, 1951), its row for hydrochloric acid of 0.2 mol/L. Stored as printed: 2.91 with a power of ten of −5 |
| Activation energy | 20.6 kcal/mol | Cited: the same table, another study's rows (acid of 0.03 to 0.11 mol/L, 0 to 35 °C). Stored in kilocalories as printed; 86.2 kJ/mol by the calorie below. No part of the lab finds it: the model uses it to give the rate constant at the room's temperature |
| Joules in a calorie | 4.184 | Cited: NIST's Guide to the SI, the thermochemical calorie |
| The reaction | CH₃COCH₃ + I₂ → CH₃COCH₂I + H⁺ + I⁻ | Cited, and held to balance by the build |
| The four mixtures | See below | The first three cited: a college's handout, at ten times its volumes. The fourth is the specification's own: the handout halves the iodine where the lab doubles it |
| Gas constant, kelvin of 0 °C | 8.314462618 J/(mol·K), 273.15 K | Cited: NIST |
| The liquid before and after | yellow; colourless | Cited: the handout and a page of Chemguide |
| Room temperature, the scatter in a time, the limit on a late watch, the tolerance, the two steps between the words for the colour | See `parameters` | The lab's own: model parameters, each with its rationale |

Nothing of the rate record is the lab's own figure. The rate constant and the activation energy rest on a reading of two page images of a scanned table: see the first point under "What a chemist should look at".

## The mixtures

All of 50 mL. The flask holds the acetone, the acid and the water; the iodine is poured in and the watch started, as one action.

| Mixture | Acetone 4.0 M | HCl 1.0 M | Water | Iodine 0.0050 M | Once mixed: [acetone], [H⁺], [I₂] in mol/L |
| --- | --- | --- | --- | --- | --- |
| 1 | 10 | 10 | 20 | 10 | 0.800, 0.200, 0.00100 |
| 2 | 20 | 10 | 10 | 10 | 1.60, 0.200, 0.00100 |
| 3 | 10 | 20 | 10 | 10 | 0.800, 0.400, 0.00100 |
| 4 | 10 | 10 | 10 | 20 | 0.800, 0.200, 0.00200 |

The build checks that each mixture is of 50 mL, that the iodine is what is poured in and the flask holds none before, that the first has 10 mL of each solution and 20 of water, and that mixtures 2, 3 and 4 each hold twice the first's strength of one reactant and the same of the others.

**How fair it is to take the rate as steady.** The acetone is 400 to 1600 times the iodine and the acid 100 to 400 times. By the end of a run 0.06% to 0.25% of the acetone has been used up, and the hydrogen ion is 0.25% to 1.00% up, since the reaction makes one hydrogen ion for each iodine molecule it uses. The acid counts for more: with the rate following both as they change, a run is 0.19%, 0.22%, 0.06% and 0.37% shorter in the four mixtures than the lab's arithmetic has it. The build works this out (the integral that one handout read writes down), and a test checks it against the rate summed in small steps.

## The numbers over seeds 1 to 100

Tests hold every figure here (`src/engine/acetone/acceptance.test.ts`, `model.test.ts`) but the last table's, which a script run once and not kept gave.

| Run | Time, watch stopped at the end | At every room and scatter the draw can give |
| --- | --- | --- |
| Mixture 1 | 240.4 to 388.7 s | 239.0 to 392.5 s |
| Mixture 2 | 120.8 to 196.2 s | 119.5 to 196.3 s |
| Mixture 3 | 119.6 to 195.8 s | 119.5 to 196.3 s |
| Mixture 4 | 478.6 to 777.6 s | 478.0 to 785.0 s |

The first mixture takes 4.0 to 6.5 minutes, and at 25 °C would take 214.8 s. The fourth, with twice the iodine, takes twice as long, 13.1 minutes at the most, inside the watch's half hour. The model's rate constant runs from 1.608 × 10⁻⁵ at 20.0 °C to 2.589 × 10⁻⁵ at 24.0 °C.

**The orders are unmistakable.** With a hand three tenths of a second late on every run, the power that takes the ratio of two strengths to the ratio of two rates is 0.971 to 1.026 for acetone, 0.970 to 1.024 for hydrogen ion, and −0.027 to 0.024 for iodine. What a learner divides for iodine, the rate of mixture 4 by that of mixture 1, is 0.981 to 1.017. At every corner of what the draw can give, with any run stopped as late as still counts and any other on time, the two first orders are within 0.087 of 1 and the order in iodine within 0.059 of nought.

**A careful learner is always within tolerance.** With a hand three tenths of a second late, the mean rate constant is between 0.63% under and 0.61% over what the model gives at the room's temperature; with a hand a second late, 0.97% under to 0.31% over. The tolerance is 5%.

**The limit on a late watch.** A watch stopped by hand more than 5.0 s after the last of the colour went makes its run not count, and the run is made again. With every watch of a lab stopped 5.0 s late, over the hundred seeds the mean rate constant is 1.23% to 2.90% under; at every corner of what the draw can give, 3.68% at the worst. So a lab whose runs all count cannot fail its notebook for the watch alone. (At 6 s the worst corner is 4.20%, at 7 s 4.71%, at 8 s 5.22%.)

Were there no such limit, this is how late one run alone could be stopped, every other run three tenths of a second late, before the part failed: the least over the hundred seeds.

| Run | An order is mistaken from | The mean rate constant leaves its 5% from |
| --- | --- | --- |
| Mixture 1 | 97.5 s | 57.4 s |
| Mixture 2 | 49.5 s | 28.9 s |
| Mixture 3 | 50.1 s | 28.7 s |
| Mixture 4 | 201.7 s | 116.9 s |

## How each kind of value was read

Every source was fetched once, by a plain request that named itself, and read as fetched by the builder: none through a tool that answers questions about a page. Each site's robots file was asked for first.

- **The procedure, the bottles, the colour.** A college's handout for this experiment, read as the text taken out of its file. It works in test tubes at a tenth of the lab's volumes.
- **The orders and why the iodine does not count.** A university's laboratory page (the mechanism, with its working, and that the rate has been found not to depend on the halogen), a second university's teaching guide (the orders one, one and nought; the slow step), and a third laboratory's handout (the slow making of the enol; that the reaction makes acid). Two pages of Chemguide give what an order is and what an order of nought tells of any reaction.
- **The rate constant and the activation energy.** NBS Circular 510, as the scan that NIST serves: 770 pages, 75 MB. The text the scan carries is not legible in its tables, which are printed sideways, so pages 337 and 338 of the file were drawn as images and read by eye, at three sizes. The introduction, which gives the units (moles for a litre, seconds, kilocalories for a mole), was read as text. The studies the table gathers, its references 9 and 21, were not read.
- **The calorie.** NIST's Guide to the SI, appendix B.9, fetched on 2026-10-11.
- **Hazards.** `hazards.json` and `sources/hazard-manifest.json`, written apart.

## Where the lab is other than spec section 20 has it

1. **The primer's card on an order of nought names nothing in this flask.** Spec 20.5 has the primer say what an order of nought tells of how the reaction happens, that the slow step does not involve iodine. The primer is read in Challenge before the entries are made, so it says this of any reaction, and the second note of part 2, shown once that part is done, says it of iodine and the enol.
2. **The notes of part 1 do not say that twice the iodine takes twice as long at the same rate.** That is the result of part 2, and its first note says it.
3. **The fourth mixture is no source's.** See the table above.
4. **"Long after" is five seconds.** Spec 20.2 has a run stopped long after the colour is gone not count. The engine's limit on a late watch makes that exact; a run stopped while any iodine is left does not count either. Neither can be warned of, and Guided has no warning in this lab.
5. **A run that counts is not made again,** the watch stops itself after half an hour, the unit of the rate constant is an entry of its own, and the mean is of all four runs: as in the clock reaction lab, whose engine this is.
6. **The rate is worked from the learner's own entry for the iodine.** In this lab what is used up is one of the reactants, so its strength in the mixture is an entry above the rate. The engine was changed to hold the rate to that entry, as typed or as the value it should have been, as every other entry is held.
7. **How much iodine is left is given as an amount, not a share.** The engine's view gives micromoles for a litre left and at the mixing, so that the mixture with twice the iodine can be drawn deeper at the start. The words for the colour step by the amount: yellow, pale yellow under 500, the faintest yellow under 100, no colour at none. The two steps are model parameters.
8. **The bench names no vessel for the iodine.** The wording says that it has been measured out. Spec 20.1 lists none.
9. **The stored state keeps an empty list for the sheet the lab lacks** (`sheets.temperature`), so that the clock reaction lab's stored shape and its tests stay as they were.
10. **One test of the clock reaction lab was changed.** Its build test held that the sheet for solid iodine is in no lab's list of sources; this lab has it under its iodine's tile.

## What could not be sourced, or only in part

- **A handout with the lab's own four mixtures.** The one read halves the iodine in its fourth. Two others that the search found, with mixtures of 50 mL, are on sites that were not asked: see below.
- **Where the rate stops being independent of the iodine.** One page read says it does so only at very high acidities and gives no figure. The same page's working shows that the rate must fall off as the last of the iodine goes; how long that tail is was not read.
- **The rate constant in acid of 0.4 mol/L,** the third mixture's. The table has 0.2 and 0.5.
- **Which calorie the table means.** The lab takes the thermochemical one; the other in use gives 86.2 kJ/mol as well.
- **The scatter of a real bench,** beyond the handout's 15 to 20 seconds between two timings, and how late a hand is at the end of a fade.
- **At what strength an eye stops seeing iodine.** The steps between the words for the colour are the lab's own.
- **What the iodine is dissolved in.** The handout does not say; the note under the bottle's hazards, written apart, has it in water with potassium iodide.
- **What iodoacetone does to a person.** No official document that could be read says. This is the account of the helper who wrote the hazards, who looked on 2026-10-10: NOAA's database of chemicals, a government record, has no entry for it (the list of names it shows under the letter I was read); three searches of the web found no supplier's safety data sheet for it; and the European Chemicals Agency's site refused a request for its robots file and was not asked again. That helper also read a record for it at PubChem, through that site's data address, which this project does not ask. The record had no section on safety. It is not relied on: it is cited nowhere, it is in neither manifest, and its page is not in the fingerprint. The safety card's sentence, that no official document that could be read says what the product does, is a statement of what was not found and cites no source; its caution rests on NOAA's record for bromoacetone and is the lab's own.

## What a chemist should look at

1. **The two figures read from page images.** 2.91 with a power of −5 at 25 °C for acid of 0.2, and 20.6 for the activation energy, in table 312.471 of NBS Circular 510, pages 337 and 338 of the file NIST serves. The rows about them read 2.83 (acid 0.01 to 0.1), 2.99 (0.5), 3.05 (1.0), and 1.15 × 10⁻⁶, 2.86, 3.60 and 8.80 × 10⁻⁵ at 0, 25, 27 and 35 °C. The model's figures at 0 and 35 °C, 1.21 × 10⁻⁶ and 8.99 × 10⁻⁵, are within a tenth of those. The rate constant and the activation energy are from two different studies in the table.
2. **One rate constant for every mixture.** The table has it rise with the acid. On a real bench the third mixture, at 0.4 mol/L, would be a few percent faster than the model has it, and the order in hydrogen ion would come out a little over one.
3. **The end of a run.** The model has the iodine go at one steady pace to none, and ends the run at a point. A real fade must end in a tail, and an eye loses the colour before that.
4. **Iodine with iodide.** If the bottle is iodine in potassium iodide solution, most of it is there as triiodide. The lab takes all of it as iodine that reacts, and its colour as iodine's.
5. **A second iodine atom.** The lab takes one molecule of iodine for each molecule of acetone that reacts, and no further reaction of the product. One page read says that in acid a second substitution is slower.
6. **The acid as the hydrogen ion.** The hydrogen ion is taken as the acid's whole strength.
7. **The temperature of the flask.** The model has the mixture at the room's temperature from the pour to the end; mixing and the reaction both move it a little. The handout read has the temperature taken in the tube after the run.
8. **The scatter.** One part in a hundred, far less than the handout's bench.
9. **The safety card's caution about the product,** which reasons from bromoacetone: see the hazard manifest, which asks the same.

## Tried and not read

Three sites refused a request and were not asked again: a government archive of reports (its robots file), a university repository's thesis file (a refusal, after its record page had been read), and a chemistry union's server (its robots file). A second university repository and a medical archive each answered with a check for automated readers, which was not worked round; neither was asked again. One journal host's robots file names AI readers, and no page of it was asked for. One outreach site's robots file closes the folder its lesson is in. One university's robots file has a rule that is not well formed and may be meant to close the whole site; it was read so, and the two handouts there, which have mixtures of 50 mL, were not asked for. PubChem's data service was not asked by this lab's builder. No page of OpenStax was fetched, and no page of Wikipedia.

Pages that were fetched while looking and that nothing rests on: a laboratory file with three mixtures of 25 mL; the cover of a school lesson plan; three more pages of the laboratory site that is cited; the record page of a thesis on the enolisation of acetone in buffers; two journal articles on the enolisation of acetophenones; and three records of other iodinations.

## Read and not kept

Every source. A value read from a page that is not kept rests on what the manifest says the page printed that day. What the build holds is that the record and the manifest give one account, that the reaction balances, that the mixtures are the ones specified, and that the rate record holds together.

The quotation fingerprint that `src/chem-data/acetone/quotation.test.ts` and `src/app/lab/acetone/messages.test.ts` compare the lab's words against is not kept either, for the reason `../phase-3/sources/README.md` gives. `scripts/fingerprint-sources.mjs` writes it to `sources/`, where `.gitignore` lists it, from pages saved outside the repository:

    node scripts/fingerprint-sources.mjs <folder of saved pages> 2026-10-10 docs/research/acetone/sources

It holds all 27 documents: the thirteen of this manifest and the fourteen of the hazard manifest. Of the Circular it holds the introduction and the pages of the table, as the text the scan carries.

## The engine

The lab runs on the kinetics engine that the clock reaction lab runs on (`src/engine/kinetics/`); this lab's door for the app is `src/engine/acetone/index.ts`. For this record the engine was made to take a model with no baths, which then has two parts and one sheet; to say how much of what is used up is left at a time handed in, where that is what is seen, and nothing where something added shows the end; and to work a rate from the learner's own entry where what is used up is a reactant. The clock reaction lab's generated record and its entries in `sources.json` are byte for byte as they were.

## What nobody checked

No chemist has read the record, the notes, the primer or the page's sentences. The two figures of the rate record that were read from page images were read by the builder alone. The screens, which the next section is about, were checked by script by the assistant that built them, and at the review of 2026-10-12 by an AI reviewer that had built none of the lab, which the last section is about. No person has run the lab, no screen reader was used, and one browser was tried and no real device. The review read no source of the rate record again, and read the hazard notes as sentences and not against their documents.

## The screens

Built on 2026-10-11 (spec section 20.6, which says what the page shares with the clock reaction lab's and where it is other than 20.2 and 20.3 have it). They changed no engine file, no stored value and no model parameter. This section is as the builder wrote it, but for the speed, which the review changed; what else the review changed is in the last section. What the screens added to the lab's own rules, which the engine does not have:

- **The page plays the time** (`src/app/lab/acetone/watch.ts`, on the shared `src/app/lab/kinetics/play.ts`). The four mixtures are played at one speed: 60 seconds of the lab's time to a true second since the review, a minute to a second, which the page says beside the running watch. As built it was 56, chosen so that the slowest fade, the fourth mixture's 785 s at the most, was watched for about 14 true seconds, and the page did not give it. At 60, over seeds 1 to 100: the first mixture has faded 4.01 to 6.48 true seconds after its pour, the second 2.01 to 3.27, the third 1.99 to 3.26 and the fourth 7.98 to 12.96. A test holds those figures, the fourth in twice the first's true time, and the second and third in half of it. From the frame that shows the end the watch adds true time, so that what it reads when a hand stops it is the time the engine records.
- **The pour is handed to the engine together with the stop.** A run that is left with its watch running has nothing stored and is poured again; its attempt, and so its time, is the same one.
- **For the first half second after a pour the bench takes no press,** as in the clock reaction lab. No run ends within three times that.
- **The delay that is handed in is the page's measure,** from the frame that drew the end to the press, by the browser's own clock. What a device adds before a frame is seen and before a press is handed over is in it and was measured on no device.
- **A watch left running after the end** adds true time until it reads 30 minutes, and then stops itself; the run does not count, for a watch stopped late.
- **The colours on the screen are the drawing's own** (`src/app/lab/acetone/FlaskDrawing.tsx`): water, and the mixture with no iodine left, #e8edf2; the mixture, a straight line in the three colour channels from #d9a000 at 2000 micromoles for a litre, which the fourth mixture starts with, to #f2e596 at the least there can be. Any amount above nought is drawn in a yellow and nought in the water's colour, which is the step that item 7 of the list above and the primer's card speak of. The faintest yellow and the water differ by 43.6 in CIELAB (the 1976 colour difference) and stand at 1.09 to 1 as a ratio of luminances, measured from pictures of the screen in both themes: they are told apart by hue. Whether a real eye tells them apart on a real screen was not tried.
- **Nothing is animated,** where the clock reaction lab marks the edge of its picture at the change.

Three sentences were added to the page's wording and one was changed, each with a test: what a run that was left says; how the record lists a run stopped by hand with its delay; how it lists a watch that stopped itself; and the line beside a running watch, which as built said that the four mixtures are played at one speed, faster than a clock. Both quotation tests were run on 2026-10-11 against the fingerprint of the 27 documents, and passed with none skipped.

One thing was put right in the notebook the two labs share: the relation of a chosen entry stood so close under its form's Enter that, open, its hit area lay over the lowest 6 px of the button. It is in a commit of its own.

What the builder ran in headless Chromium, and what nobody has: `docs/for-institutions.md`, under this lab's name.

## The review of 2026-10-12

The one deep review of the phase, held when the screens were whole, by an AI reviewer that had built none of the lab: not the record, the hazards, the engine, the wording or the page. It worked by script in headless Chromium and by reading. It made the one change the project's owner had decided on, looked for faults by using the page and not by reading alone, and put right what it found in the same pass. This section says what was changed, what was found, what was left and what nobody checked. The page as it now is, is section 20.6 of the design spec.

### The change the owner had decided

1. **The speed is 60.** A second on the page is a minute on the watch, and the line beside the running watch says so: "One second here is one minute on the watch, for all four mixtures." As built the speed was 56 and the line said only that the page plays the time faster than a clock, at one speed. `SPEED` in `src/app/lab/acetone/watch.ts`, the sentence in `messages.ts`, and a test for each.

   | Run | On the watch, seeds 1 to 100 | True seconds from the pour to the end | At any room and scatter the draw can give |
   | --- | --- | --- | --- |
   | Mixture 1 | 240.4 to 388.7 s | 4.01 to 6.48 | 3.98 to 6.54 |
   | Mixture 2 | 120.8 to 196.2 s | 2.01 to 3.27 | 1.99 to 3.27 |
   | Mixture 3 | 119.6 to 195.8 s | 1.99 to 3.26 | 1.99 to 3.27 |
   | Mixture 4 | 478.6 to 777.6 s | 7.98 to 12.96 | 7.97 to 13.08 |

   A test holds the third column. The last is the review's own arithmetic: the record's second table above, over 60. In the browser, by the page's own clock, a first mixture's end was said 5.72 seconds after the press that poured it, where its watch had the end at 341.3 s, and a fourth's 11.40 seconds after, at 682.2 s: 5.69 and 11.37 at the one speed.

### What the review found, and what was done

Each is marked as it was judged: must-fix where a learner is stopped, loses work, is told something false, sees an answer or cannot do something; should-fix where a user or a maintainer would plainly want it corrected. How each is known is said with it: ran (seen in the browser), measured, or read.

2. **Stop moved under the hand while a watch ran, on an upright tablet** (must-fix). Measured, at every frame of a run at 768 by 1024 with the menu open. There the two flasks are as wide as the card, and the watch and its lines stand under them and over the two buttons. Stop's upper edge was 885 px down the page at the pour, 925 from the frame in which the status line first said a step and the look ran on to a second line, and 917 from the end. Stop is 56 px tall: a finger laid on its middle at the pour is 12 px over its upper edge after the first move, by that measure, and a tap there stops nothing; no tap was made to try it. At 1280 by 800 the watch stands beside the picture and nothing moved. The shared watch's card now has an option, `steady`, which this lab asks for: while the watch runs the look keeps the room of two lines and the status line of one, and the line on the speed keeps its room, unseen, once the colour has gone. Stop was then at 925 from the pour to the stop, in three runs at 768 by 1024, and at 673 in five at 1280 by 800, as before. A running card is 743 px long from its pour, where it was 723 and then 763. The clock reaction lab's card does not ask for it, and was measured: its watch stands beside its picture at both sizes, and Stop did not move at the change.
3. **The status line said three things within a second or two of each other** (should-fix). Read, and measured in the browser. It said each step of the fade and then the end, in a line that a screen reader says one sentence after another. At the one speed the faintest yellow comes 0.2 to 0.7 true seconds before the end in every mixture, and pale yellow 1.0 to 1.6 seconds before it in the second and third: a listener who stops the watch by ear would have the end held back behind them. The line now says a step only where the end is still 1.8 true seconds off or more when the step comes (`SAY_MS` and `roomToSay` in `watch.ts`, `fadeSaid` in `messages.ts`, with tests over seeds 1 to 100): pale yellow and then the end in the first and fourth mixture, and the end alone in the second and third. The end is said in seven words where it was thirteen, "The last of the yellow has gone."; the rest, that the mixture cannot be told from the water, is in the sentence beside the watch, as it was. The look is in words beside the watch and under the flask at every frame, whatever is said. Nobody has heard any of it: the 1.8 seconds is the review's own figure for what a sentence takes to say.
4. **"Work this notebook again" lost focus to the page** (should-fix). Ran, by taps and by the keyboard. The button stands in the card that says how a notebook came out, which goes when the notebook is worked again, and focus went with it to the document's body. The shared bench now gives focus to the notebook's heading, as a run's heading has it when a run is made again. Run again in both labs.
5. **Part 1's notes lay over the button of the list of runs** (should-fix). Measured, by asking the page what lies at each point about a control, at 768 by 1024, where the list of runs is behind a button. Once part 1 is done, its notes are a line of words over that button, and a point 21 px under the middle of the line was answered by the button: the kind of fault the reviews of the three labs before this one found in theirs. The notes now have 8 px more under them, in the shared bench. Not seen at 1280 by 800, where the list stands open beside the run.
6. **The two small lines of the part that is shown measured 4.35 to 1** (should-fix). Measured, from the colours as the browser composites them, in the light theme: the part's number and how far it has come, in grey 12 px letters on the grey ground of the part that is shown. They are now in the page's own ink there, and under the pointer, in the shared bench. Every other piece of text of the Lab, Record and Primer tabs measured 4.5 to 1 or more in the light theme and 5.8 or more in the dark, in eight states of the page.
7. **A stopped watch could read more than its limit** (should-fix). Ran, with a clock the script held. The engine's time for a watch stopped by hand after the end is the end with the delay added, and the page held the delay to the watch's limit and not to what the watch had left to run. With a frame that came 26 minutes after the one before it, the card said "The watch stopped itself at 31:52.2", which the running watch never read, and the record said the same. A computer that sleeps with the page showing would do it. The delay is now held to what the watch had left at the end (`handStop` in the shared `play.ts`, with a test that fails without it), and the same run reads 30:00.0. The run did not count before and does not now.
8. **The primer said of any reactant of order nought that it is used up at a steady pace** (should-fix). Read. That holds while nothing else the rate depends on changes, which is what the passage the card rests on says, and what the card's own support line had. The card now says "if nothing else changes".
9. **The documents** said that no review had been held, gave the speed as 56 and the page as not saying it, and said that the status line says each step. `docs/for-institutions.md` said of the pour's press come twice that in one run of eleven the second press had stopped the watch, for a cause not known: see the next section.

No engine file was changed, no stored chemistry value and no model parameter, and the stored entry's name and version are as they were.

### The half second after a pour

The builder saw a second press stop the watch once in eleven runs and could not make it happen again. The review made it happen, and it is the script's and not the page's. The bench judges a press by the time the browser gives the press itself, and takes none within half a second of the pour. A script that waits for the page to take one press before it makes the next makes the second late whenever the page stands still: with the page made to stand still for 0.8 seconds as it took the pour, such a script's second Enter was made 0.85 seconds after the first by the browser's own times, and it stopped the watch, rightly. With the same stall and the second Enter made 0.15 or 0.4 seconds after the first whatever the page was doing, as a hand makes it, the page came to it 0.84 seconds after it came to the first, did not take it, and the watch ran on. Also run: two Enters 45 to 49 ms apart, six times; two presses of Space; a double click; a double tap at 768 by 1024; and Enter held down for 0.45, 0.6 and 0.9 seconds, whose repeats the buttons already refuse. The watch ran on in every one. So the review found no way for the guard to fail for a press made within the half second, in this browser; that the builder's one run was the stall is an inference, since that run recorded no times. What an event's time is in another browser was not tried.

### What was read and worked again, and found sound

- **The primer's worked examples,** by hand: 0.00000123 as 1.23 × 10⁻⁶; 0.30 × 25 ÷ 50 = 0.150 M; 7.90 × 10⁻⁵ ÷ 2.00 × 10⁻⁵ = 3.95, so order 2; 3.60 × 10⁻⁵ ÷ (0.300 × 0.0400²) = 0.0750 L²/(mol²·s); and the unit of a rate constant for each sum of orders from one to four.
- **One whole lab's figures, from its times to its results,** by hand, from the lab the review worked by keyboard (room 21.1 °C; 342.0, 171.9, 169.2 and 682.7 s). The four rates came to 2.92, 5.82, 5.91 and 2.93 × 10⁻⁶ mol/(L·s), the ratios to 1.99, 2.02 and 1.00, the rate constants to 1.83 (1.82 from the rounded entries, which is an exact tie and is taken either way), 1.82, 1.85 and 1.83 × 10⁻⁵ L/(mol·s), and their mean to 1.83, all as the page had them. The model's rate constant at that room, from 2.91 × 10⁻⁵ at 25 °C with 20.6 kcal/mol as 86.19 kJ/mol, came to 1.84 × 10⁻⁵, and the mean is 0.3% under it, as the page said.
- **The record's arithmetic as the notes and this record give it:** the reaction balances in atoms and in charge; by the end 0.06% to 0.25% of the acetone is used up and the hydrogen ion is 0.25% to 1.00% up; the first mixture would take 214.8 s at 25 °C; and the model's rate constant is 1.608 × 10⁻⁵ at 20.0 °C and 2.589 × 10⁻⁵ at 24.0 °C.
- **Every sentence a learner can be shown:** the page's wording (`messages.ts`), the primer's seven cards, the seven notes of the two parts, and the three hazard notes. But for item 8, none was found to give chemistry or arithmetic that is wrong, or to contradict what the page does once the changes above were made. The primer names no reactant of this flask as the one of order nought, and no label, hint, refusal or source's title on the Lab tab gives an order. The safety card gives its caution about the product as the lab's own and no source's, in those words. The hazard notes were read as sentences and not against their documents.
- **What Challenge is kept from.** In two whole labs worked by taps, the text of the Lab tab and of the Record tab, with what is closed or hidden in them, was searched at 21 points each: before the first pour, after each run, after each entry, and after two notebooks that did not count. Part 1's notes were there once its four runs counted and not before; nothing of the orders, the rate law, the rate constant or part 2's notes was there before part 2 was done.
- **The code.** The play of a watch is ended when its run is left, by its frame's own cancelling; a stop is sent once for one watch; the pour is stored only with a stop. This lab's page imports nothing below `@/engine/acetone`, the shared pieces import types alone, and the lint rule holds both. No test of the lab was found that asserts nothing. A stored record that does not fit (not JSON, a working of a sheet the lab lacks, a run it lacks, a watch stopped past its limit, a status the parts do not give, an order that is no choice) is set aside with the app's notice and the lab starts fresh; one with a pour and no stop, which a page never stores, opens with its watch at 0:00.0 and Stop, which ends it.

### What was run

All in headless Chromium on Linux, on the production build, by script, at the fade's own pace unless said. The scripts are not part of the repository.

- **A whole lab in Guided by the keyboard alone,** at 768 by 1024 in the light theme, and part 1 again at 1280 by 800 in the dark: a second Enter just after the pour; a stop by Enter 0.3 seconds after the end; a stop before the end and a stop 5.4 seconds after it, each made again; the watch stopped for the learner, chosen before the pour, kept at the next run and taken back; a run left by the way on, by the Record tab and by the list of parts; wrong entries of each kind in the notebook (nothing, not a number, too few figures, the bottle's strength, a minus sign, the time in minutes, both wrong orders for acetone and both for iodine, a rate constant with the iodine divided in, two wrong units), Enter with nothing chosen, Change, Escape and the same value entered again; the notes; the Record tab; a reload; and Restart.
- **A whole lab in Challenge by emulated touch,** at 768 by 1024 in the dark theme and at 1280 by 800 in the light, through Restart: the choice pressed while the watch ran and after the end; a notebook checked with nothing in it; one with the bottle's strength and the iodine at order one, and one with a wrong unit, each checked, not counting and worked again; and one that counts.
- **A watch left running to its limit,** with a clock the script held; a run left for the Primer tab and for a browser tab that is hidden; the window narrowed to 700 px and back; a run with motion reduced and one without; records that do not fit.
- **The clock reaction lab,** at 768 by 1024: part 1 by keyboard and by the choice, part 2's notebook in Guided to its end and in Challenge through a notebook that did not count and was worked again, and part 3's three baths and the first two entries of its notebook by the graph's keys. One speed in part 1, each bath at its own pace, the choice beside the first pour, and the half second, as that lab's review left them. The relation of a chosen entry stood 28 px under Enter, and no row of either was answered by the other, closed or open: the change the builder made to the shared notebook, measured on that lab's page.
- **The builder's script of pictures and measures again,** on the build the review left, at both sizes in both themes, and the pictures that the changes altered retaken.

### What was measured

- **Every control, point by point,** at the middle and 21 px from it each way: the builder's 23 states at each size again, and 59 more at each (design spec, 20.6). One fault, item 5.
- **The fade's colours, from pictures of the screen,** in both themes, which gave the same figures, the picture standing on its own white card in both. Within 6 true milliseconds of the end the mixture was drawn in #f2e596 beside water in #e8edf2: 1.09 to 1 as a ratio of luminances and 43.6 apart in CIELAB (the 1976 difference), as the builder had it. The end is a step of hue and not of light and dark, and was plain in the pictures the review looked at. The fourth mixture 0.6 seconds after its pour was drawn in about #dba409 and the first in about #e7c754: 1.36 to 1 and 19.7 apart, told apart side by side, though the page never shows them so and has one word, yellow, for both.
- **Contrast of text.** The watch's figures: 19.8 to 1 in the light theme and 17.2 to 1 in the dark. The rest as item 6. A bottle's label is drawn, and is its tile's name in words; it was looked at and not measured.
- **Motion.** The liquid has no transition and was drawn in its own colour at every frame. With motion reduced, in 4 frames of some 190 the page listed transitions of the app's own hundredth of a millisecond, on a button's focus ring and on lines that came and went; nothing else was animating.
- **Names and roles,** in seven states of the Lab and Record tabs: no button, field, group, table or region without a name; the picture hidden from a screen reader beside its words; the watch a timer that is not a live region; headings in order.

### Left for the owner

- **The two starts have one word.** The fourth mixture starts deeper, and "yellow" is under both flasks. That it holds twice the iodine is in its table. A word for the deeper start would be a third step between the words, which are model parameters.
- **The room the lines keep is seen as a gap** under the look while the look is one line long, and where the line on the speed was once the colour has gone. Stop standing still was judged worth it.
- **The end's shorter sentence, and the 1.8 seconds,** are the review's choices. Either is one line to change.
- **Entering the same value after Change empties the entries under it,** as the line under the notebook says of any change. Escape keeps them.
- **A press that is meant and comes within the half second is not taken,** as in the clock reaction lab. And the choice pressed once the colour has gone stops the watch at the end itself, however late: a way round the five seconds.
- **A record with a pour and no stop,** which only a hand can write, is listed as "Watch running" though its watch stands at 0:00.0.
- **At 1280 by 800 the pour is under the window's foot on the first screen** of a lab that is not begun, as the builder measured. Not changed.
- **The clock reaction lab's pictures were not retaken.** They differ from its page in the two small lines of the part shown.
- **For a chemist,** the nine points above stand as they were written. The review adds one: the acetone's hazard note reasons from a sheet for a 50% solution that the bench's solution, about 29% by volume, still burns, and no document read is for that strength.

### What nobody checked

No person has run the lab or read its text. No screen reader was used: what is announced, and how long after the end, has been heard by nobody. One browser was tried, headless Chromium on Linux, and no real device: no tablet, no finger. No chemist or chemistry instructor has read the record, the notes, the primer or the page. The review did not read the sources of the rate record again, the table's two figures among them, and did not read the hazard notes against their documents. It did not try the page with the text enlarged, at a zoom, in a forced-colour mode, or at a width between the two named.
