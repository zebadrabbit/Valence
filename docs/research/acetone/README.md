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

No chemist has read the record, the notes, the primer or the page's sentences. The two figures of the rate record that were read from page images were read by the builder alone. No screen has been built: the engine, the record and the wording were tested by scripts alone.
