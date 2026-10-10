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

Nothing was bent to pass them. The amounts are model parameters, chosen so that the checks pass with room, and `src/chem-data/cations/build.test.ts` holds each check to refusing amounts and constants that would not.

## How each kind of value was read

- **Gibbs energies of formation.** The NBS tables, from the scanned PDF that NIST serves, in the copy the aqueous reactions lab read (its sha256 is in the manifest). The scan has no text layer: each page was turned into an image and read by eye, and every row of the manifest says so and names the page, the table and the row. Pages read: 2-47 (chlorine), 2-64 and 2-65 (nitrogen), 2-119 (lead), 2-150 and 2-151 (mercury), 2-160 to 2-162 (silver), 2-197 and 2-200 (chromium). Seven of the nine stored figures were read a second time from a crop of their rows at about twice the size; the other two, for the chloride ion and for dissolved ammonia, were read once, from a crop of the half page they are on.
- **The constants.** Worked out by the build as e^(−ΔG° ÷ RT) at 298.15 K, to three significant figures, with the working stored. The tables' standard state for a dissolved ion is one mole in a kilogram of water; the checks use moles in a litre, which at these strengths differs by less than the third figure matters.
- **The scheme, the rules and the looks.** Twelve sections of an open textbook of qualitative analysis (Malik, on LibreTexts), four pages of a set on the characteristic reactions of metal ions (Birk, on LibreTexts), a college's laboratory experiment that is this scheme step for step (Santa Monica College, on LibreTexts), a university's handout for the same scheme (National Taiwan University, a PDF whose text was taken out and read), and one page of a college's pre-lab notes (Hope College, on LibreTexts). Each was fetched once and read; each site's robots file was read first, and none has a rule against automated readers or against the folders read.
- **Names, formulas and strengths of the bottles.** The lists of chemicals of the two procedures. The strengths are the specification's.
- **Hazards.** `hazards.json` and `sources/hazard-manifest.json`, written apart.

## Where the lab is other than spec section 17 has it

1. **The liquid of step 3 is stored as yellow to orange, not yellow.** A page on confirmatory tests calls a chromate solution yellow; a page of pre-lab notes for this very test calls the liquid over the yellow solid orange. With acetic acid in it, some of the chromate is turned into dichromate, which is orange. The stored look takes in both sources.
2. **A slip of technique makes a run not count wherever it is made,** and not only where it changes what is seen. A warning or a verdict that turned on what the sample holds would say what an unknown holds. So the water of step 2 poured off cold does not count for a sample with no lead, and step 5 judged early does not count for a sample with no silver. Pouring off without the centrifuge is a slip only where a solid is spread through the liquid, which can be seen.
3. **Judging step 5 before the liquid is acid** is recording what is seen there before litmus paper has shown the liquid acid. A learner who adds acid twice and never tests has not been shown that the liquid is acid, and the run does not count.
4. **In part 1 the flow chart is part of what counts.** Spec 17.3's rule for a run that counts names the technique, the observations and, in part 2, the ions. A chart filled wrongly cannot be the map part 2 is given, so a run of part 1 counts only with every place right.
5. **A completed lab still takes actions,** so that part 2 can be run again with a new unknown; its status stays completed. The other labs take nothing once complete.
6. **The centrifuge is offered at steps 3 and 5 too.** Nothing is poured off there, but a solid packed at the bottom is easier to tell from a coloured liquid, which is the point of step 3.
7. **What is seen is recorded before the liquid is poured off,** and the pouring off ends the step. Once the liquid is gone the tube no longer shows it.
8. **No PubChem CID is stored.** PubChem's robots file excludes its data service from automated readers, so it was not asked.

## What could not be sourced, or only in part

- **That a little silver can be lost where there is much mercury(I).** The specification first asked the primer to say it. No page read says it, so on 2026-10-10 the sentence was taken out of the specification and out of the primer: the lab says nothing of it.
- **What ammonia does to solid lead chloride.** One handout says that a solid with lead still in it gives white lead hydroxide when ammonia is added, and gives no equation. A page on the lead ion says that ammonia brings a white basic salt out of a solution of the ion and does not dissolve it. The stored rule says that a white solid is left, which the handout gives as lead hydroxide. The model turns the lead chloride into it with two ammonia to each, which is the lab's own balancing and is used only to count ammonia.
- **A Gibbs energy for lead chromate.** The NBS tables have none. Its solubility product is a handout's figure, with no source of its own.
- **What two solids of different colours look like in one tube.** The model gives the colour that comes later in the choices: white is hidden by yellow, and both by grey to black. No source was read for it. It matters only after a slip.
- **What a solid does in a tube where the scheme has none.** After a pouring off without the centrifuge, the solid that goes over stays as it is, whatever is added. No source was read.
- **The look of each bottle's liquid.** The model draws every liquid as colourless but one with chromate in it. The silver-ammonia ion's lack of colour has a source; the others' is the model's.
- **Why the 15 minutes at the eyewash.** The primer gives what the sheets read ask.

## What a chemist should look at

1. **The solubility products are worked out, not read.** A textbook section read gives 1.8 × 10⁻¹⁰, 1.6 × 10⁻⁵ and 1.3 × 10⁻¹⁸ for the three chlorides and 1.7 × 10⁷ for the formation constant, with no source; the lab's figures from the NBS tables are 1.77 × 10⁻¹⁰, 1.71 × 10⁻⁵, 1.46 × 10⁻¹⁸ and 1.67 × 10⁷.
2. **Lead chloride's solubility product does not give its measured solubility.** From 1.71 × 10⁻⁵ and free ions alone, a saturated solution at 25 °C would hold 4.5 g/L; the page read gives 10 g/L at 20 °C. The same page of the tables has rows for PbCl⁺ (−164.81), for the molecule that has not come apart (−297.16) and for PbCl₃⁻ (−426.3); with the first two counted, the tables themselves give about 8 g/L before any correction for the strength of the solution. The lab uses the solubility product for step 1, where chloride is in large excess, and the measured solubilities for step 2. Step 1's check counts free ions only: with the tables' rows for the complexes counted, nearly a tenth of the lead would stay dissolved at step 1, and the note of step 1 says that a real bench leaves some lead in the liquid.
3. **Lead chloride is slow to come down, and far too much chloride dissolves the chlorides again.** Two pages read say so. The model has neither: the acid is a fixed four drops, and the chlorides form at once.
4. **Step 5 is all or nothing in the model.** While free ammonia is left, no silver chloride comes back; once the acid is past all the ammonia, all of it does. In a real tube the solid begins to come back as the ammonia runs out. The amounts were chosen so that the model's rule holds by the stored constants at every stage a learner can reach, by a factor of 2.1 at the least.
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

No chemist has read the record, the notes, the primer or the page's sentences. The scanned tables were read by one reader, by eye. No screen has been built: the engine, the record and the wording were tested by scripts alone.
