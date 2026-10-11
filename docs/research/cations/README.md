# Group I cations lab research record

The inputs the Group I cations lab is built from (spec section 17), where each came from, and what could not be found. Everything was gathered on 2026-10-09. Nothing in this folder is loaded by the app.

`npm run build:data` reads this folder and writes `src/chem-data/cations/cations.json` and the lab's entries in `src/chem-data/sources.json`. The build stops, and writes nothing, on an input it cannot hold to its sources, and on a number that says the scheme would not go as the lab's rules have it.

| File | What it is |
| --- | --- |
| `cations.json` | The lab's record: the eight bottles (five reagents and the three nitrate solutions the samples are made from), the three ions, what each solid and each dissolved thing is and looks like, the eight rules the engine's actions follow, the Gibbs energies and the constants worked out from them, the solubility of lead chloride cold and hot, the five steps with their net ionic equations and the notes shown when a step is done, the flow chart's places and tiles, and the model's parameters, each with its rationale |
| `sources/MANIFEST.json` | Every source of that record and of the primer (`src/chem-data/cations/primer.ts`): its address, its citation, and rows that say what it prints and where, each naming the stored values it supports |
| `hazards.json`, `sources/hazard-manifest.json` | The hazards of seven of the eight bottles, the documents behind them, and the documents read for the primer's safety card. They were written apart from the rest, in the form of the calorimetry lab's, and the build merges them into the record. The hydrochloric acid carries the aqueous reactions lab's record unchanged (`../phase-4/hazards.json` and its hazard manifest), which the build merges in from there |

No source has a copy in this folder. Four sources are shared with other labs and are written in the manifest as those labs write them: the NBS tables (read in the scan the aqueous reactions lab read), NIST's listing of the constants (read in the file the mechanism timeline was read from), the table of standard atomic weights (`../periodic-table/sources/`), and one page on the reactions of the silver ion, which was fetched again.

## The values as stored

| Value | Stored | From |
| --- | --- | --- |
| Solubility product of silver chloride | 1.77 × 10⁻¹⁰ | NBS tables: Ag⁺(aq) (77.107) + Cl⁻(aq) (−131.228) − AgCl(s) (−109.789) = 55.668 kJ/mol; e^(−ΔG° ÷ RT) at 298.15 K |
| Solubility product of lead chloride | 1.71 × 10⁻⁵ | NBS tables: Pb²⁺(aq) (−24.43) + 2 Cl⁻(aq) − PbCl₂(s) (−314.10) = 27.214 kJ/mol |
| Solubility product of mercury(I) chloride | 1.46 × 10⁻¹⁸ | NBS tables: Hg₂²⁺(aq) (153.52) + 2 Cl⁻(aq) − Hg₂Cl₂(s) (−210.745) = 101.809 kJ/mol |
| Formation constant of the silver-ammonia ion | 1.67 × 10⁷ | NBS tables: [Ag(NH₃)₂]⁺(aq) (−17.12) − Ag⁺(aq) − 2 NH₃(aq) (−26.50) = −41.227 kJ/mol |
| Gas constant | 8.314462618 J/(mol·K) | NIST's listing of the 2022 CODATA values |
| Solubility product of lead chromate | 2.8 × 10⁻¹³ | A university handout, which gives no source for it and no temperature. The NBS tables print an enthalpy for PbCrO₄(s) and no Gibbs energy |
| Solubility of lead chloride, cold | 10 g/L at 20 °C | A page on the reactions of the lead ion |
| Solubility of lead chloride, hot | 33.5 g/L at 100 °C | The same page |
| Molar mass of lead chloride | 278.10 g/mol | 207.2 + 2 × 35.45, the standard atomic weights the periodic table's record holds |
| What a millilitre of water holds of it | 35 958 nmol cold, 120 460 nmol hot | The two solubilities over the molar mass |

The build works each worked-out value out again and holds the two atomic weights to the periodic table's record.

## The checks of rules against numbers

Spec 17.4 asks the build to check a rule against a stored number wherever it can. `scripts/cations-lib.mjs` does, for each of the seven samples and, where it changes the sum, for the water of step 2 poured off hot and poured off cold, at the bench's amounts (50 µmol of each ion a sample holds, in 1.5 mL):

| Step | Check | At the bench's amounts |
| --- | --- | --- |
| 1 | The ion product of each chloride is over its solubility product, and the share the product leaves dissolved is under 1% | Lead chloride, the closest: 857 times over, 0.14% to 0.19% left |
| 2 | The water holds all the lead chloride hot and not all of it cold | 0.75 mL holds 90.3 µmol hot and 27.0 µmol cold, of 50 |
| 3 | The ion product of lead and chromate is over the solubility product of lead chromate, with the lead of hot water and of cold; and more chromate goes in than there is lead | Over 10⁹ times over; 100 µmol of chromate to 50 of lead |
| 4 | With all the silver chloride dissolved, [Ag(NH₃)₂⁺][Cl⁻] ÷ [NH₃]² is under Ksp × Kf | 23 times under; 11 times with mercury(I) there |
| 5 | One addition of acid leaves ammonia over; two make the liquid acid whatever the sample holds; none lands on neutral; and after one the quotient of step 4 is still under the constant | 4.7 times under after one addition; 2.1 times with mercury(I) there |

The figures of steps 4 and 5 are those of a run in which the water of step 2 was poured off hot. Poured off cold, 23 µmol of lead chloride stays with the solid and takes up ammonia and gives chloride at step 4, and the build makes both checks for that case too. They pass, with less room: 12 times under at step 4 and 2.3 after one addition for silver with lead, and 7.3 and 1.4 for a sample of all three (worked again at the review of 2026-10-10, which found that only the first set had been written down).

Nothing was bent to pass them. The amounts are model parameters, chosen so that the checks pass with room, and `src/chem-data/cations/build.test.ts` holds each check to refusing amounts and constants that would not.

## How each kind of value was read

- **Gibbs energies of formation.** The NBS tables, from the scanned PDF that NIST serves, in the copy the aqueous reactions lab read (its sha256 is in the manifest). The scan has no text layer: each page was turned into an image and read by eye, and every row of the manifest says so and names the page, the table and the row. Pages read: 2-47 (chlorine), 2-64 and 2-65 (nitrogen), 2-119 (lead), 2-150 and 2-151 (mercury), 2-160 to 2-162 (silver), 2-197 and 2-200 (chromium). Seven of the nine stored figures were read a second time from a crop of their rows at about twice the size; the other two, for the chloride ion and for dissolved ammonia, were read once, from a crop of the half page they are on.
- **The constants.** Worked out by the build as e^(−ΔG° ÷ RT) at 298.15 K, to three significant figures, with the working stored. The tables' standard state for a dissolved ion is one mole in a kilogram of water; the checks use moles in a litre, which at these strengths differs by less than the third figure matters.
- **The scheme, the rules and the looks.** Twelve sections of an open textbook of qualitative analysis (Malik, on LibreTexts), four pages of a set on the characteristic reactions of metal ions (Birk, on LibreTexts), a college's laboratory experiment that is this scheme step for step (Santa Monica College, on LibreTexts), a university's handout for the same scheme (National Taiwan University, a PDF whose text was taken out and read), and one page of a college's pre-lab notes (Hope College, on LibreTexts). Each was fetched once and read; each site's robots file was read first, and none has a rule against automated readers or against the folders read.
- **Names, formulas and strengths of the bottles.** The lists of chemicals of the two procedures. The strengths are the specification's.
- **Hazards.** `hazards.json` and `sources/hazard-manifest.json`, written apart.

## Where the lab is other than spec section 17 first had it

The first two are in sections 17.2, 17.3 and 17.7 of the design spec since the review of 2026-10-10, which put those sections right to what was built. They are kept here with their reasons.

1. **The liquid of step 3 is stored as yellow to orange, not yellow.** A page on confirmatory tests calls a chromate solution yellow; a page of pre-lab notes for this very test calls the liquid over the yellow solid orange. With acetic acid in it, some of the chromate is turned into dichromate, which is orange. The stored look takes in both sources.
2. **A slip of technique makes a run not count wherever it is made,** and not only where it changes what is seen. A warning or a verdict that turned on what the sample holds would say what an unknown holds. So the water of step 2 poured off cold does not count for a sample with no lead, and step 5 judged early does not count for a sample with no silver. Pouring off without the centrifuge is a slip only where a solid is spread through the liquid, which can be seen.
3. **Judging step 5 before the liquid is acid** is recording what is seen there before litmus paper has shown the liquid acid. A learner who adds acid twice and never tests has not been shown that the liquid is acid, and the run does not count.
4. **In part 1 the flow chart is part of what counts.** Spec 17.3's rule for a run that counts names the technique, the observations and, in part 2, the ions. A chart filled wrongly cannot be the map part 2 is given, so a run of part 1 counts only with every place right.
5. **A completed lab still takes actions,** so that part 2 can be run again with a new unknown; its status stays completed. The other labs take nothing once complete.
6. **The centrifuge is offered at steps 3 and 5 too.** Nothing is poured off there, but a solid packed at the bottom is easier to tell from a coloured liquid, which is the point of step 3.
7. **What is seen is recorded before the liquid is poured off,** and the pouring off ends the step. Once the liquid is gone the tube no longer shows it.
8. **No PubChem CID is stored.** PubChem's robots file excludes its data service from automated readers, so it was not asked.
9. **A naming of none of the three is refused.** Every sample holds one or more of them, and the naming is said once for each run, so a press with no box ticked is asked again and nothing is spent. As first built, on 2026-10-10, this was the page's own rule, and the engine would have taken such a naming and judged it wrong. At the review of the same day it was made the engine's: the refusal `nothing-named` in `src/engine/cations/run.ts`, with its sentence among the lab's messages, and the page asks the engine as it does for every other press. A stored run that names none is no longer one the lab could have made; the page had never sent one, so the stored entry's version is as it was.

Where the page is other than section 17.3 has it (what ends a step is under the step's cards and not beside the tube; the flow chart is a tree of nested lists; the map of part 2 is in a closed disclosure under the step) is section 17.8 of the design spec.

## What could not be sourced, or only in part

- **That a little silver can be lost where there is much mercury(I).** The specification first asked the primer to say it. No page read says it, so on 2026-10-10 the sentence was taken out of the specification and out of the primer: the lab says nothing of it.
- **What ammonia does to solid lead chloride.** One handout says that a solid with lead still in it gives white lead hydroxide when ammonia is added, and gives no equation. A page on the lead ion says that ammonia brings a white basic salt out of a solution of the ion and does not dissolve it. The stored rule says that a white solid is left, which the handout gives as lead hydroxide. The model turns the lead chloride into it with two ammonia to each, which is the lab's own balancing and is used only to count ammonia.
- **A Gibbs energy for lead chromate.** The NBS tables have none. Its solubility product is a handout's figure, with no source of its own.
- **What two solids of different colours look like in one tube.** The model gives the colour that comes later in the choices: white is hidden by yellow, and both by grey to black. No source was read for it. It matters only after a slip.
- **What a solid does in a tube where the scheme has none.** After a pouring off without the centrifuge, the solid that goes over stays as it is, whatever is added. No source was read.
- **The look of each bottle's liquid.** The model draws every liquid as colourless but one with chromate in it. The silver-ammonia ion's lack of colour has a source; the others' is the model's.
- **Why the 15 minutes at the eyewash.** The primer gives what the sheets read ask.
- **The colours on the screen.** The record stores a word for what is seen ("white", "yellow", "grey to black", "yellow to orange"), each with its source. The colour the page draws for a word is the drawing's own value, and nothing is read from it. How high a liquid stands is the drawing's too: higher for each thing added, and not to scale. Every solid is drawn at one height, since the model hands the page no amount of solid.

## What a chemist should look at

1. **The solubility products are worked out, not read.** A textbook section read gives 1.8 × 10⁻¹⁰, 1.6 × 10⁻⁵ and 1.3 × 10⁻¹⁸ for the three chlorides and 1.7 × 10⁷ for the formation constant, with no source; the lab's figures from the NBS tables are 1.77 × 10⁻¹⁰, 1.71 × 10⁻⁵, 1.46 × 10⁻¹⁸ and 1.67 × 10⁷.
2. **Lead chloride's solubility product does not give its measured solubility.** From 1.71 × 10⁻⁵ and free ions alone, a saturated solution at 25 °C would hold 4.5 g/L; the page read gives 10 g/L at 20 °C. The same page of the tables has rows for PbCl⁺ (−164.81), for the molecule that has not come apart (−297.16) and for PbCl₃⁻ (−426.3); with the first two counted, the tables themselves give about 8 g/L before any correction for the strength of the solution. The lab uses the solubility product for step 1, where chloride is in large excess, and the measured solubilities for step 2. Step 1's check counts free ions only: with the tables' rows for the complexes counted, nearly a tenth of the lead would stay dissolved at step 1, and the note of step 1 says that a real bench leaves some lead in the liquid.
3. **Lead chloride is slow to come down, and far too much chloride dissolves the chlorides again.** Two pages read say so. The model has neither: the acid is a fixed four drops, and the chlorides form at once.
4. **Step 5 is all or nothing in the model.** While free ammonia is left, no silver chloride comes back; once the acid is past all the ammonia, all of it does. In a real tube the solid begins to come back as the ammonia runs out. The amounts were chosen so that the model's rule holds by the stored constants at every stage a learner can reach: by a factor of 2.1 at the least in a run whose water was poured off hot, and of 1.4 where it was poured off cold from a sample that holds all three.
5. **The second tube is taken to stay hot.** Fifty micromoles of lead chloride in 0.75 mL is more than cold water holds, so the liquid would give lead chloride back as it cools. A handout read says so, and the note of step 3 says that a real bench tests the liquid before it cools.
6. **Water from a boiling bath is taken as 100 °C.**
7. **Lead hydroxide or a basic chloride.** By the tables' rows, PbCl₂(s) + NH₃(aq) + H₂O(l) → PbClOH(s) + NH₄⁺(aq) + Cl⁻(aq) has ΔG° = −24.0 kJ/mol: a basic chloride is likely too. The record names the solid as the handout does.
8. **A solid carried into the wrong tube is inert in the model.** In a real tube mercury(II) amidochloride dissolves in acid, by a page read, and silver chloride may react with chromate. A run in which that happens does not count whatever the tube shows.
9. **The handout's solubility product of lead chromate** has no source and no temperature. Nothing turns on its size: the ion product is over a thousand million times over it.
10. **One figure's caption in the textbook section on litmus** says that an alkaline solution turned blue paper red. The section's text says the opposite, as every other source does, and the lab follows the text.
11. **The samples are plain solutions.** One page read makes each nitrate solution up in 0.1 M nitric acid, as a real bench does to keep it clear. The lab's have none.

## Tried and not read

One address, of a community college's copy of another university's procedure, did not answer. PubChem's data service is closed to automated readers by its robots file and was not asked. Nothing was done to get round either.

Pages that were fetched while looking for these and that nothing rests on: the index of the textbook and of three of its chapters, and its section on the common reagents and their hazards, opened for their headings; the index of the college manual; and a second college's page for the same experiment, which says what the first says.

No page of OpenStax was fetched, and no page of Wikipedia.

## Read and not kept

Every source. A value read from a page that is not kept rests on what the manifest says the page printed that day. What the build holds is that the record and the manifest give one account, that the two atomic weights are the periodic table's, that the worked-out values follow from the cited ones, and that the rules hold at the bench's amounts.

The quotation fingerprint that `src/chem-data/cations/quotation.test.ts` and `src/app/lab/cations/messages.test.ts` compare the lab's words against is not kept either, for the reason `../phase-3/sources/README.md` gives. `scripts/fingerprint-sources.mjs` writes it to `sources/`, where `.gitignore` lists it, from pages saved outside the repository:

    node scripts/fingerprint-sources.mjs <folder of saved pages> 2026-10-09 docs/research/cations/sources

## What nobody checked

No chemist and no chemistry instructor has read the record, the notes, the primer or the page's sentences. The scanned tables were read by one reader, by eye, and were not read again at the review. The screens were built on 2026-10-10 (section 17.8 of the design spec) and checked by script, in headless Chromium, by the AI coding assistant that built them, and then by the one that reviewed them: the next section says what the review ran, and `docs/for-institutions.md` what was run and what was not. No person has run the lab, no screen reader was used, one browser was tried and no real device.

## The review of 2026-10-10

The one deep review of the phase, held when the screens were whole, by an AI coding assistant that had built none of the lab: not the record, the hazards, the engine, the wording or the page. It worked by script in headless Chromium and by reading. It made three changes the project's owner had decided on, looked for faults by using the page and not by reading alone, and put right what it found in the same pass. This section says what was changed, what was found, what was left and what nobody checked. The page as it now is, is section 17.8 of the design spec.

### Three changes the owner had decided

1. **Sections 17.2, 17.3 and 17.7 of the design spec say what was built.** They said that the liquid of step 3 is yellow, and that a slip of technique makes a run not count wherever it changes what is seen. They now say yellow to orange, and wherever the slip is made, whatever the sample holds, so that neither a warning nor a verdict tells what an unknown holds. Section 17.8 no longer lists the two as things done other than the section says.
2. **A naming of none of the three ions is refused by the engine.** It was the page's rule alone (9 above). The engine now refuses it as `nothing-named`, in either mode and before anything is stored; the sentence is among the lab's messages; the page's own rule is taken out; and a test holds the refusal, that nothing is spent by it, and that the stored shape does not take a run which names none. The tests' scripted learner, who used to name none where a careless run's tubes had shown nothing, names the first ion there.
3. **The documents say that the review was held,** by whom and how, what it found, and what nobody checked: this section, sections 14 and 17.8 of the design spec, `docs/for-institutions.md` and the project's README.

### What the review found, and what was done

Each is marked as it was judged: must-fix where a learner is stopped, loses work, is told something false, sees an answer or cannot do something; should-fix where a user or a maintainer would plainly want it corrected. How each is known is said with it: ran (seen in the browser or in a run of the engine), measured, or read.

4. **With the bench open, "Sources" over it could not be opened by a tap** (must-fix). Measured, by asking the page what lies at each point about a control, and ran. Under the ways on of every entry stand "Sources", "The bench" and, in part 2, the map: each a line of words 20 px tall under a hit area of 44, and they stood 8 px apart. The area of "Sources" was 28 px tall, and the lowest 4 px of its own words answered to "The bench". With the bench open, whose area then reaches 24 px over its line, 16 of the 20 px of "Sources" answered to the bench: a click on the middle of "Sources" closed the bench and opened nothing. "The bench" stood the same way under the map. "Previous", in the row over them, measured 40 px, and 28 with the sources open, when the lowest 12 px of the button answered to "Sources"; a step's "Notes on this step" measured 40 over "Previous". They now stand 36 px apart and 28 px under the ways on, and the notes have 4 px more under them. After the change every control of the Lab tab measured 44 px or more each way, in twelve states of the page at each of two window sizes, and the click opens the sources.
5. **A learner who followed a step's task went up the page and came down again** (should-fix). Measured. The tasks of steps 1, 2 and 4, which both modes show, said to record what is seen, then centrifuge, then pour. The centrifuge is beside the tube; what ends the step is under the step's cards, and in part 1 the chart is between them. Once the chart was filled, the centrifuge was 925 to 1,037 px over the pouring off at 768×1024, where the window shows 959 px, and 807 px over it at 1280×800, where it shows 735. The three tasks now have the centrifuge before the record, and Guided's hint for step 1 follows them, so that the page is worked one way. The engine takes either order, as it did; a test holds the order of the words.
6. **The words under the name of the part shown were grey on grey** (should-fix). Measured, from the colours the browser worked out: "Steps under way" and the like, 12 px tall, were 4.35 to 1 on the grey ground of the part that is shown, in the light theme, and 5.86 in the dark. The same was so of the number and the note of the entry shown in the list of steps, which is the shared paged list (`src/app/lab/Paged.tsx`), and of either under the pointer. There they are now the text's own colour, 18.2 and 14.5 to 1. The shared list is every lab's: the primer's topics in all five, and the stations or parts of three others. Its 36 lists were drawn on a build of the commit before the review and on the build after, at two window sizes in both themes: the markup of each is the same but for the classes added, the 256 entries that are not the one shown are the same in every colour, and 24 whole pages of the other labs are the same markup. So the other labs are changed in that one thing and no other: the number and the note of the entry shown, or under the pointer, are dark and not grey.
7. **The primer said that in part 2 the finished chart "is beside you as a map"** (should-fix: a sentence the page contradicts). Read, and ran: the map is under each step of part 2, in a disclosure that is closed, and only once a run of part 1 counts. The card now says so.
8. **The picture of a step that is done was named as a tube "drawn in a rack"** (should-fix). Read, in the page's accessibility tree: that picture has no rack. It is now named "as it was when this step was checked".
9. **The note under the nitric acid ended in half a sentence** (should-fix). Read: "Step 5 adds it to ammonia a little at a time, as the experiment." It now ends "as the experiment does". Nothing else of any hazard record was changed: no statement, no signal word, no source, and no other word of a note.
10. **This record said that step 5's rule holds by a factor of 2.1 at the least at every stage a learner can reach** (should-fix). Worked again by hand and with the build's own amounts: 2.13 is the least for a run poured off hot; for a sample of all three poured off cold it is 1.39. The build's check covers that case and passes, and only the first figure had been written down. The table of checks and the fourth of the things a chemist should look at now give both.
11. **`docs/for-institutions.md` said that the grain's dots are the ink's, 8.2 to 10.4 to 1, and that no contrast was measured** (should-fix). Measured, on the pixels of the picture drawn at four device pixels to the unit, the same in both themes since the card is white in both: the grain is drawn at half strength and is 2.6 to 1 on a white solid, 2.5 on the yellow and, drawn light, 2.9 on the grey to black; the line of a liquid's surface, at half strength too, is 2.5 to 1 against a colourless liquid and 2.1 against the yellow to orange. The edge of a solid is the ink at full strength: 10.4 to 1 against a white solid and 8.9 against the colourless liquid over it, 8.2 against the yellow solid and 5.2 against the yellow to orange liquid over it; the grey to black solid is itself 5.4 to 1 against its liquid. The brackets and their words are 10.4 to 1. The page now gives these figures. The drawing was not changed: see what was left.
12. **`docs/for-institutions.md` said that every control of the Lab tab was 44 px tall or more,** read from each control's own height (should-fix: see 4). It now says what was measured, and how.

Nothing else in the code was changed. No stored chemistry value, rule or model parameter was changed, and the stored entry's name and version are as they were.

### What was read and worked again, and found sound

- **The four constants from the nine Gibbs energies,** by hand: 55.668, 27.214, 101.809 and −41.227 kJ/mol, and from them 1.768 × 10⁻¹⁰, 1.707 × 10⁻⁵, 1.458 × 10⁻¹⁸ and 1.670 × 10⁷ at 298.15 K. The nine energies themselves were not read from the scan again.
- **Lead chloride in the water of step 2.** 10 g/L over 278.10 g/mol is 35,958 nmol in a millilitre, and 33.5 g/L is 120,460. The 0.75 mL of step 2 holds 26,968 nmol cold, which is 53.9% of the 50,000 there is, and 90,345 hot, which is 1.81 times it. So the rule holds: all of it hot, about half of it cold.
- **The acid against the ammonia.** Fifteen drops of 6 M ammonia are 4.50 mmol. Mercury(I) chloride and any lead chloride left take two ammonia each and silver holds two, so the acid has 4.35 to 4.50 mmol to use up, whatever the sample holds and however step 2 was poured. One addition of nitric acid is 2.40 mmol and two are 4.80: one always leaves ammonia over and two always make the liquid acid, with 0.30 to 0.45 mmol to spare, and none lands on neutral.
- **The other checks of the table above,** each with the bench's amounts: lead chloride 857 times over its solubility product at step 1 and 0.14% to 0.19% left by it; 22.9 and 10.9 times under at step 4; 4.73 and 2.13 after one addition of acid.
- **Every sentence a learner can be shown:** the primer's ten cards, the steps' tasks and hints, the refusals, the three warnings, the reasons a run does not count, the notes and the net ionic equations, and the seven hazard notes. The two equations with ammonia balance, atom for atom and in charge. Mercury(II) is named only where it belongs: in the amidochloride that ammonia makes of mercury(I) chloride, and on the primer's card of the two ions of mercury, which says that chloride gives no solid with it.
- **Eleven of the documents the lab cites,** each in the copy its builder saved on 2026-10-09, which is not in the repository; nothing was fetched again. The page on the lead ion (10 g/L at 20 °C and 33.5 at 100 °C, the slow coming down, the dissolving in much chloride); the page on mercury (the white chloride of mercury(I), no reaction seen with mercury(II), and the equation with ammonia, term for term); the page on silver (both equations); the page of confirmatory tests (a yellow solution of chromate); the pre-lab notes (the liquid over the yellow solid is orange, and the centrifuge helps to tell them); the handout (the acetic acid keeps other chromates from coming down, lead still with the solid gives white lead hydroxide with ammonia, the solubility product of lead chromate, lead chloride coming back as the liquid cools); two sections of the textbook (about 1.1 g and about 3.2 g in 100 mL; the litmus rule in its text, and the figure's caption that says the opposite); and three safety data sheets (the statements of silver nitrate with its line on ammonia, of lead nitrate, and of mercury(I) nitrate). Each says what the record has it say.
- **All seven unknowns in the browser,** in Challenge by tap and in Guided: a careful run of each showed what its ions give and counted, and what the tubes showed named the sample each time.
- **That nothing tells what an unknown holds before it is named.** At every point of those fourteen runs the Lab tab's markup, its accessibility tree and the Record tab's markup were kept, and two unknowns that had shown the same things so far were set side by side: 234 comparisons, every one the same to the byte. What the browser stores held the seed and what was done, and named an ion only where the learner had named it.
- **The lint door** for `engine/cations`, which a test holds; the stored record's round trip; and eight stored records that do not fit, each set aside with the notice and kept under a backup key.

### What was run

By script, in headless Chromium 153 on Linux, against the production build, at 768×1024 first. The scripts are not kept. 443 checks in six scripts passed at the last run, which was made after the last change to the code, beside the comparisons and the measurements below.

- **Part 1 in Guided by the keyboard alone,** 768×1024, light, from a browser with nothing stored: Tab to every control, Enter and Space, the chart filled with the place chosen first, and where focus was after each action read from the page.
- **Each of the seven unknowns, twice:** in Challenge by tap, in a context that emulates a touch screen, and in Guided.
- **Each slip of technique alone,** in Guided with its warning, where focus went, the way back and the way on, and in Challenge with none; among them the acid added twice and the liquid recorded before litmus paper was tried.
- **Wrong entries and the rest:** an observation and a tile that are not right in each mode, the chart by tap in either order and by keyboard with the tile first, a wrong naming and a naming of none, the mode changed in the middle of a step, a reload in the middle of a step and of a lab that is complete, Restart refused and accepted, a whole Guided lab by mouse at 1280×800 with part 2 run again, the map, a window 600 px wide, and motion with and without the system's setting.
- **Both themes,** for the measurements and the pictures at both sizes.
- **Measured:** the picture's contrasts on its pixels (11 above); the contrast of every piece of text on the Lab tab and the Record tab from the colours the browser worked out, in both themes at both sizes; the hit area of every control point by point (4 above); how long a step is at each stage; and how long it would be with fewer places of the chart drawn. The figures are in `docs/for-institutions.md`. After the changes, the least among text that is not faint was 4.74 to 1 in the light theme, the grey words, and 6.21 in the dark; the faint words of a button that cannot be used now were 3.71 and 4.86.
- **The other labs.** One form of choices of the aqueous reactions lab, which also draws the shared tube, of the flame test lab and of the calorimetry lab, by keyboard: answers that are not right, right ones, Change and Escape. And the shared list, before and after (6 above).
- **The whole check,** after the last change to the code and with this record written: `npm run build`, which is the lint, the tests, the type check and the production build, passed with 4,394 tests, and 1,059 skipped for want of the other labs' fingerprints; `npm run build:data`, `npm run build:expected` and `npm run cross-check` left no file changed.

### The chart's length

The owner asked whether a step of part 1 should draw only its own places of the chart, with the whole chart on the last entry. Measured at 768×1024 in Guided, with the chart open and empty, and estimated for the two other ways by hiding lines of the page as built:

| Step | As built: the step, the chart's card | Its own places only | Its own places and the one they are made from |
| --- | --- | --- | --- |
| 1 | 1,699 px, 683 | 1,475, 459 | 1,475, 459 |
| 2 | 1,863, 807 | 1,595, 539 | 1,625, 569 |
| 3 | 1,771, 799 | 1,431, 459 | 1,461, 489 |
| 4 | 1,881, 865 | 1,555, 539 | 1,585, 569 |
| 5 | 1,845, 873 | 1,431, 459 | 1,461, 489 |

The review's view: it would not be better, and it was left. The step would be 224 to 414 px shorter and still a window and a half, since the tube and the questions are 908 to 948 px before the chart begins, which is a window by themselves. The chart's card is 683 to 873 px as built and fits a window of 959, so the places and the tiles are in one view already. And the place a step's places hang under holds what the step began with, which is what the learner reasons from: with the step's own places alone it is gone. If the page is to be shorter, the third column keeps that place and costs 30 px more than the second. It would take a filter of a few lines where the step hands the chart its places, the tree being made of whatever places it is given; two of the page's tests written again; and the paragraphs of section 17.8 and of `docs/for-institutions.md`. What made a step feel long was the trip between the centrifuge and the pouring off, which is 5 above.

### Left for the owner

None of these was changed.

- **The grain of a solid is under 3 to 1** (11 above). A liquid is told from a solid by three things beside its colour: the edge, which is 5.2 to 1 or more against both of its neighbours, or stands on a solid that is itself 5.4 to 1 against its liquid; the bracket with its word, 10.4 to 1; and the grain, 2.5 to 2.9. Drawn at seven tenths of its strength where it is drawn at half, the grain would be about 4.4 to 1 on white, 3.9 on yellow and 4.0 on the grey to black. It is one figure in the shared tube and would change the aqueous reactions lab's solids too, and how the picture looks is the owner's to judge.
- **Acid added twice, the tube recorded, and litmus tried after.** Ran, both. In Challenge such a run does not count, by 3 of the list of where the lab is other than its design, and it is told that "until the liquid is acid no solid can form there", of a tube in which the liquid was acid and a solid had formed. The rule is the engine's and was not touched. With the mode changed to Guided between the record and the check, the check raises the warning that "litmus has not shown the liquid to be acid", under a status line that says it has, with a way on that reads "Record it anyway"; "Go back" goes to the acid. To record again is the way on that counts, and the warning does not say so. A sentence of its own for a record made before the paper was tried would take a fourth warning in the engine; it was left.
- **The faint words of a button that cannot be used now** are 3.7 to 1 in the light theme. The button stays in the tab order and says why when pressed. It is the shared control's look in every lab.
- **The unknowns come round without one twice in seven.** A learner who has named six knows the seventh before a tube shows anything, and the Record tab lists what each named one held.
- **"The smaller the number, the less dissolves",** on the primer's card of the three solubility products. It is true of these three, and it is not a rule for solids whose formulas differ in kind, as silver chloride's and lead chloride's do: a chemist's to word.
- **A part not yet looked at has a dashed edge,** and the edge between the two parts crosses the liquid as a dashed line until both have been looked at. It is the same in every tube, and it is not an edge of anything in the tube.

### What nobody checked

- **No person has run the lab.** Everything above was done by scripts and by reading, by an AI coding assistant. How the page looks is the owner's to judge.
- **No screen reader was used.** Roles, names and states were read from the page; what is announced has not been heard.
- **One browser, and no real device:** headless Chromium on Linux, with a touch screen emulated. No other browser, no phone, no tablet, no finger.
- **No chemistry instructor and no chemist** has read the record, the notes, the primer or the page's sentences. The review worked the arithmetic again and read eleven documents; it is not a chemist's reading, and the eleven things a chemist should look at stand, the fourth with the second figure the review gave it.
- **Not read at the review:** the scanned tables; forty-six of the forty-nine hazard documents; and any page as its site serves it today.
- Browser zoom, enlarged text and forced colours were not tried, and the window sizes were 768×1024, 1280×800 and one 600 px wide.
