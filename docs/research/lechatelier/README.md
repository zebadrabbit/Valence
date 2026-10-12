# Le Chatelier's principle lab research record

The inputs the Le Chatelier's principle lab is built from (spec section 18), where each came from, and what could not be found. Everything was gathered on 2026-10-10. Nothing in this folder is loaded by the app.

`npm run build:data` reads this folder and writes `src/chem-data/lechatelier/lechatelier.json` and the lab's entries in `src/chem-data/sources.json`. The build stops, and writes nothing, on an input it cannot hold to its sources, and on a number that says a tube would not show what the record stores for it.

| File | What it is |
| --- | --- |
| `lechatelier.json` | The lab's record: the ten bottles; what each solid and each coloured thing is and looks like; the twelve rules the tubes follow; the Gibbs energies and the six constants worked out from them; the three enthalpies behind the heat that dissolving lead chloride takes in; the solubility of lead chloride cold and hot, and the product at saturation each gives; the indicator's range and looks; the five equilibria as written; the four systems, each with its tubes and its disturbances in order; and the model's parameters, each with its rationale. A disturbance holds what is done, what its tube shows after each portion, what is asked and what is right, and the notes shown when it is done |
| `sources/MANIFEST.json` | Every source of that record and of the primer (`src/chem-data/lechatelier/primer.ts`): its address, its citation, and rows that say what it prints and where, each naming the stored values it supports |
| `hazards.json`, `sources/hazard-manifest.json` | The hazards of eight of the ten bottles, the documents behind them, and the documents read for the primer's safety card. They were written apart from the rest, in the form of the Group I cations lab's, and the build merges them into the record. The 6 M hydrochloric acid and the 6 M sodium hydroxide carry the aqueous reactions lab's records unchanged (`../phase-4/hazards.json` and its hazard manifest), which the build merges in from there |

No source has a copy in this folder. Three safety data sheets of the hazard manifest, for the solutions of lead nitrate, zinc nitrate and magnesium nitrate, are listed in the lab's own manifest as well, written as they are there, each for one row: what the solution looks like. Six sources are shared with other labs and are written in the manifest as those labs write them: the NBS tables (read in the scan the aqueous reactions lab read), NIST's listing of the constants, the table of standard atomic weights (`../periodic-table/sources/`), and three pages read in the copies fetched for earlier labs, on the reactions of the lead ion and of the magnesium ion and on how the solubility of a salt is changed.

## The values as stored

| Value | Stored | From |
| --- | --- | --- |
| Solubility product of zinc hydroxide | 4.13 × 10⁻¹⁷ | NBS tables: Zn²⁺(aq) (−147.06) + 2 OH⁻(aq) (−157.244) − Zn(OH)₂(s, the epsilon form) (−555.07) = 93.522 kJ/mol; e^(−ΔG° ÷ RT) at 298.15 K |
| Solubility product of magnesium hydroxide | 5.61 × 10⁻¹² | NBS tables: Mg²⁺(aq) (−454.8) + 2 OH⁻(aq) − Mg(OH)₂(s) (−833.51) = 64.222 kJ/mol |
| Formation constant of [Zn(OH)₄]²⁻ | 2.82 × 10¹⁴ | NBS tables: [Zn(OH)₄]²⁻(aq) (−858.52) − Zn²⁺(aq) − 4 OH⁻(aq) = −82.484 kJ/mol |
| Formation constant of [Zn(NH₃)₄]²⁺ | 3.60 × 10⁸ | NBS tables: [Zn(NH₃)₄]²⁺(aq) (−301.9) − Zn²⁺(aq) − 4 NH₃(aq) (−26.50) = −48.840 kJ/mol |
| Constant of ammonia as a base | 1.81 × 10⁻⁵ | NBS tables: NH₄⁺(aq) (−79.31) + OH⁻(aq) − NH₃(aq) − H₂O(l) (−237.129) = 27.075 kJ/mol |
| Ion product of water | 1.01 × 10⁻¹⁴ | NBS tables: H⁺(aq) (0) + OH⁻(aq) − H₂O(l) = 79.885 kJ/mol |
| Gas constant | 8.314462618 J/(mol·K) | NIST's listing of the 2022 CODATA values |
| Heat taken in when lead chloride dissolves | 23.392 kJ/mol | NBS tables, enthalpies of formation: Pb²⁺(aq) (−1.7) + 2 Cl⁻(aq) (−167.159) − PbCl₂(s) (−359.41). The first is printed to one decimal place, so the sum is good to no more |
| Solubility of lead chloride, cold | 10 g/L at 20 °C | A page on the reactions of the lead ion |
| Solubility of lead chloride, hot | 33.5 g/L at 100 °C | The same page |
| Molar mass of lead chloride | 278.10 g/mol | 207.2 + 2 × 35.45, the standard atomic weights the periodic table's record holds |
| Product at saturation, cold | 1.86 × 10⁻⁴ | A solubility of s mol/L is s of lead and 2s of chloride: s × (2s)², with s = 10 ÷ 278.10 |
| Product at saturation, hot | 6.99 × 10⁻³ | The same, with s = 33.5 ÷ 278.10 |
| Methyl violet's range | pH 0.0 to 1.6 | A reference table of indicators, which gives the change as yellow to blue |
| Methyl violet's two forms | yellow with its hydrogen ion, violet without | A college's handout for this lab |
| The two cobalt ions | pink with water, blue with chloride, violet where both are there; the violet liquid blue in hot water and pink in ice water; the change toward blue takes in heat | A demonstration of the Practical Chemistry project, and a page on ligand exchange |

The build works each worked-out value out again and holds the two atomic weights to the periodic table's record.

## The checks of what a tube shows against the numbers

Spec 18.4 has the numbers decide what a tube shows wherever they can, and 18.7 has the build check them at the lab's amounts and stop on a disagreement. `scripts/lechatelier-lib.mjs` does, for every stage of the three systems the record holds by numbers. No number decides from the edge: each must be at least 1.25 times away from what it is compared with (the parameter `clearOfEdge`), or the build stops.

| Tube | Check | At the bench's amounts |
| --- | --- | --- |
| Lead chloride, after each of three portions of acid | [Pb²⁺][Cl⁻]², everything taken as dissolved, against the product at saturation cold | 1.88 times under, then 1.77 times over, then 3.36 times over: no solid, then a solid |
| heated | the same against the product at saturation hot | 11.2 times under: no solid |
| cooled | against the cold product again | 3.36 times over: a solid |
| after 3 mL of water | against the cold product | 5.64 times under: no solid |
| Methyl violet, after each of two portions of acid | the acid left over the volume, against 1 M (pH 0.0) and 0.025 M (pH 1.6) | 0.72 M, inside the range; 1.29 M, past its yellow end |
| after each of two portions of base | the same | 0.58 M, inside the range; then no acid left |
| Zinc or magnesium, one drop of base | the ion product at mixing against the solubility product; what that product leaves of the hydroxide dissolved | over by 10¹³ and by 10⁸; 0.00003% and 0.011% left |
| a share with a drop of acid | the ion product at the hydroxide an acid liquid can hold | under by 10¹¹ and more: no solid |
| a zinc share with 1 mL of base | with all the zinc as [Zn(OH)₄]²⁻, that ion over the square of the free hydroxide, against Ksp × Kf | 5.4 times under: no solid |
| a zinc share with 4 mL of ammonia | with all the zinc as [Zn(NH₃)₄]²⁺, and the hydroxide of the solid set free beside what ammonia itself makes, the quotient against Ksp × Kf | 3.8 times under: no solid |
| a magnesium share with 1 mL of base | the ion product against the solubility product | over by 10¹¹: a solid |
| a magnesium share with 4 mL of ammonia | the ion product with all its hydroxide dissolved, against the solubility product | over by 2 × 10⁵: a solid |

Nothing was bent to pass them. The amounts are model parameters, chosen so that the checks pass with room, and `src/chem-data/lechatelier/build.test.ts` holds each check to refusing amounts and constants that would not.

**Magnesium hydroxide and ammonia.** There is no ammonium in the tube to begin with. What forms comes from ammonia taking a hydrogen ion from water, and each ammonium ion made leaves a hydroxide ion, which brings more magnesium hydroxide down. By the stored constants the ammonia brings down 99.999% of the magnesium still dissolved, and the ammonium that forms (0.011 M) does not dissolve the solid.

**How much ammonia zinc hydroxide needs.** A share holds 49 micromoles of zinc, half of it as the solid, in 0.5 mL. By the stored constants 2 mL of 6 M ammonia does not dissolve the solid, 2.25 mL is at the edge, 2.5 mL clears it by 1.25 times and the lab's 4 mL by 3.8 times. The hydroxide the solid sets free as it dissolves is what holds the change back. Of sodium hydroxide, 0.4 mL clears by 1.3 times and the lab's 1 mL by 5.4.

## How each kind of value was read

- **Gibbs energies and enthalpies of formation.** The NBS tables, from the scanned PDF that NIST serves, in the copy the aqueous reactions lab read (its sha256 is in the manifest). The scan has no text layer: each page was turned into an image and read by eye, and every row of the manifest says so and names the page, the table and the row. Pages read: 2-38 (hydrogen: the hydrogen ion, the hydroxide ion, water), 2-47 (chlorine), 2-64 and 2-65 (nitrogen: ammonia and the ammonium ion), 2-119 (lead), 2-138 and 2-141 (zinc), 2-170 (cobalt, for a row that is not there) and 2-260 (magnesium). Every stored figure was read a second time from a crop of its row at about twice the size.
- **The constants.** Worked out by the build as e^(−ΔG° ÷ RT) at 298.15 K, to three significant figures, with the working stored. The tables' standard state for a dissolved ion is one mole in a kilogram of water; the checks use moles in a litre and take no account of how the other ions in the liquid change what an ion does.
- **The procedure.** A college's handout for this very lab (Bellevue College, a PDF whose text was taken out and read): the same bottles at the same strengths, and the same four systems. It gives the procedure and leaves the results to the learner.
- **The rules and the looks.** Three pages of a set on the characteristic reactions of metal ions (Birk, on LibreTexts), a demonstration of the equilibrium between the two cobalt ions (the Nuffield Foundation and the Royal Society of Chemistry), four pages of Chemguide (Clark), a section of an open textbook of qualitative analysis (Malik, on LibreTexts), a section of an open general chemistry text (Lower, on LibreTexts) and a reference table of indicators (LibreTexts). Each site's robots file was read first, where it has one, and none read has a rule against automated readers or against the folders read.
- **Hazards.** `hazards.json` and `sources/hazard-manifest.json`, written apart.

## Where the lab is other than spec section 18 first had it

On 2026-10-10 section 18 was brought up to points 1, 2, 3, 5, 7 and 8, so that the specification and the lab say one thing there. They stay in this list as the record of what was changed and why.

1. **What took the metal ion away is asked at four tubes, not three.** Spec 18.3 first asked it at "the three tubes of system 4 that turn on the second equilibrium". Two tubes turn on it: zinc hydroxide with more sodium hydroxide, and with ammonia. The record asks the same question, with the same three choices, at magnesium's two tubes as well, where the answer is that nothing did. So the two metals are set side by side under one question, and the answer at magnesium's tubes can be read off the tube. The other way to do it, the direction at magnesium's tubes, would need the tube to show that there is more solid than before, which no source read describes. It is one field of the record for each tube (`ask`).
2. **Methyl violet has no green.** Spec 18.2 first had the violet go "through blue and green to yellow". The table read gives the change as yellow to blue between pH 0.0 and 1.6, the handout calls the indicator violet in water, and no page read names a colour for the middle of the range. The record stores three looks: violet with no acid left, yellow at pH 0.0 and below, and "between blue and yellow" inside the range. At the lab's amounts the blue end is never reached with acid still in the tube.
3. **The acid and the base of system 2 go in three drops at a time, twice each,** not a drop at a time as spec 18.2 first had it. With whole drops of 6 M acid in a small tube, most counts of drops put the hydrogen ion within a few parts in a hundred of the indicator's yellow end, where a number cannot honestly decide the colour. Two portions of three drops are clear of both ends by 1.29 times or more.
4. **Lead chloride's solid is decided by the solubility, not by the solubility product of the tables.** See the first point under "What a chemist should look at".
5. **Cobalt is diluted to violet, and it is the violet tube that is heated and cooled.** Spec 18.2 first had water turn the blue tube pink, heat turn it toward blue and cooling turn it pink again. The demonstration read heats and cools the violet liquid that holds both ions: blue in hot water, pink in ice water. As first built, the lab added two portions of water, to pink, and stored blue for that tube when hot, which the demonstration does not show. That was changed on 2026-10-10 so that the system keeps to what the demonstration shows: one portion of water takes the blue tube to violet, at the make-up the demonstration has for its violet liquid (0.1 g of the salt in 2.5 mL, six tenths of it concentrated acid); the violet tube is heated, and is blue; and the same tube is cooled in ice water, and is pink.
6. **The solid of system 4 is shared as three shares of ten drops,** not the whole tube in thirds. A smaller share keeps the ammonia its tube needs, by the stored constants, to 4 mL.
7. **The number of portions is fixed and is said beforehand.** Spec 18.2 first added acid "until a white solid forms". If the lab stopped taking acid when the solid came, the button would say what the tube shows before it is looked at. So each addition is a stated number of portions, and the learner looks after each.
8. **In Challenge an answer is given once.** Giving it ends the disturbance and opens its notes; what was recorded of the tube can be changed until then. The system's entries are still marked together, when the check is asked for.
9. **A completed lab still takes actions,** so that a system can be worked again; its status stays completed, as in the Group I cations lab.
10. **The cobalt chloride is the hexahydrate,** which is what the procedure read weighs out and what the hazards are for.
11. **The ammonia has a hazards record of its own,** not the Group I cations lab's: that lab's note speaks of its own steps.

## What the screens added

The screens were built on 2026-10-10, after everything above. Section 18.8 of the design spec says what the page is and where it is other than 18.3 has it. Four things of it bear on this record.

1. **The colours on the screen are the drawing's own.** The record stores a word for what is seen, with its source, and the page draws each word in a value of its own choosing (`src/app/lab/tubeDrawing.ts`): nothing is read from a value, and no source gives one. The six for a liquid were chosen to differ in how light they are as well as in hue.
2. **The middle of methyl violet's range is drawn between blue and yellow.** The record has no name for it (point 2 above), and the picture has to draw something: it draws a colour half way between its own blue and its own yellow in lightness, chroma and hue, which is a blue-green. That is a drawing of the record's words and not a finding. A look at the tube says "between blue and yellow in colour", and the choice a learner records is those words.
3. **The choices of the two questions of direction name the way alone.** As first written each choice also said what stands on that side. The card of the equilibrium stands over both forms and says it once, so the page's choices are "Toward the left side", "Toward the right side" and "Not at all", and the sentence that stood under a question not yet open is gone, since a question is drawn only once it is open. The tests of the wording follow. Since the review each of the two choices that names a side has the card's line for that side as its description, for a reader who is not shown where the card stands.
4. **A liquid's level is not to scale, and a drop or two does not raise it.** The picture fills a tube as far as its own system fills one, from the volumes the model gives; a millilitre or more shows plainly, and the two drops of a portion of acid in system 1 by a unit or two of the picture.

The page has one rule the engine does not: it sends an action only from the disturbance a system has reached, since the engine's actions name a system and not a disturbance. A disturbance that is done can still be looked at, and nothing is stored for it.

## What the primer gives away

**The primer gives answers the lab asks for.** In both modes its cards say which way each kind of disturbance pushes; that dissolving lead chloride, and the change from the pink ion of cobalt to the blue one, take in heat; and that a large excess of hydroxide or of ammonia holds the zinc ion in a complex ion, so that zinc hydroxide dissolves, while magnesium has no such ion. A learner who has read them has, before the bench, what is needed to answer which way the two heated and the two cooled tubes go, and what took the metal ion away at all four of the tubes that ask it. That is the design's choice (spec 18.6), and it is why a search of what Challenge keeps back is to leave the Primer tab out. The Lab tab itself says none of it before the answer it belongs to is recorded: the equilibrium's card, the tasks, the hints and the refusals are held to that by tests.

## What could not be sourced, or only in part

- **A colour for the middle of methyl violet's range,** and that it passes through blue before it. Not stored and not said.
- **A Gibbs energy for zinc hydroxide as it comes down.** The tables print one for three crystal forms and none for the row marked precipitated. The lab stores the epsilon form, the least soluble.
- **What the solid from a drop of sodium hydroxide in zinc nitrate solution is.** The lab takes it to be zinc hydroxide, as the pages read do. The tables have a row for a basic nitrate, Zn(NO₃)₂·4Zn(OH)₂, which may be what forms where zinc ions are left over. No page read speaks of it.
- **A constant for the two cobalt ions.** The tables have no row for the ion with chloride. The colours are stored observations, and that the change takes in heat is the demonstration's word, with no figure.
- **The look of a liquid that is not coloured, once something has gone into it.** The three solutions the tubes begin with are colourless by the supplier's sheets for them, which the hazards rest on too and which the manifest lists a second time for that one row. What the liquid looks like after an addition (with the solid over it, or with zinc held in one of its two complex ions) is the model's: colourless, with no source read.
- **How much the other ions in a tube change what dissolves.** See the first point below.
- **That magnesium hydroxide has more solid after more base or ammonia.** By the numbers it has twice as much. The tube is stored as showing a white solid, and nothing is said of how much.
- **How much a tube warms.** The note of the first cobalt disturbance says that concentrated acid gives off heat when water is added, on two documents. Neither gives a figure. The 6 M acid and base of system 2 warm their tube as well, as the aqueous reactions lab shows; no source read says that the indicator's colour changes with temperature, and the model takes no account of it.

## What a chemist should look at

1. **Lead chloride: three numbers, and the lab uses the middle one.** The tables' solubility product is 1.71 × 10⁻⁵ (the Group I cations lab works it out). The product at saturation from the measured solubility in plain water is 1.86 × 10⁻⁴, eleven times larger, because a saturated solution holds lead as PbCl⁺ as well and its ions are less active than their concentrations say. The lab's tube is not plain water: it is 0.25 M lead nitrate, where both effects are larger and nitrate holds some lead too, and the handout read sees no solid when 1 mL of 0.30 M acid has gone into 5 mL of 0.30 M lead nitrate, a mixture whose product is 6.25 × 10⁻⁴. So a real bench probably needs more acid than the lab: the lab's tube after its third portion is at that same product and is stored as holding a solid. The lab rests on the measured solubility because spec 18.4 names it, because it has a hot figure and the tables' product has none, and because it is nearer than the tables' product to what a bench shows. By the tables' product alone a solid would form at the first portion, 5.8 times over. No number read gives the true point in lead nitrate solution. The note of the disturbance says that a real bench may need more acid.
2. **Lead chloride is slow to come down.** A page read says the solid may take three to five minutes to show. The model has it at once.
3. **The form of zinc hydroxide.** With the beta form's Gibbs energy the solubility product is 7.71 × 10⁻¹⁷ and both of zinc's tubes dissolve with about twice the room. A fresh precipitate is likely more soluble still.
4. **Zinc hydroxide and ammonia.** Brought down by sodium hydroxide, with no ammonium in the tube, zinc hydroxide needs a large excess of ammonia by the tables' constants: eight volumes here. A bench that brings the solid down with ammonia itself has ammonium to take up the hydroxide, and needs far less. A page read has the solid dissolve in an excess of ammonia and gives no amounts. A learner on a real bench with this lab's one drop of sodium hydroxide may see the solid thin and not go.
5. **The cobalt tube's make-up.** After its one portion of water the tube has, by arithmetic, what the demonstration's violet liquid has: 0.04 g of the hexahydrate in each millilitre, and six tenths of the liquid concentrated acid. The demonstration says that a little more acid or water may be needed, by trial, to get the violet, and its concentrated acid may be a little weaker than 12 M. The tube the lab starts from, the solid in 12 M acid alone, is stored as blue; the demonstration gets its blue by adding more acid to the violet liquid, and a second page read has concentrated acid turn the pink ion blue.
6. **The cobalt tube warms as it is diluted,** which pushes toward blue while the water pushes toward pink, so a real tube may look bluer than violet until it has cooled. The model shows the tube back at room temperature. The second note of that disturbance says so.
7. **Methyl violet's equation.** The handout writes the two forms one hydrogen ion apart, HMV and MV⁻, and the lab keeps that. The dye's ion carries a positive charge and takes up more than one hydrogen ion in strong acid, which is likely why a real tube passes through more than one colour. No page read says so, and it is said nowhere in the lab.
8. **The indicator back to violet by exact neutralising.** Two portions of base cancel two of acid to the nanomole, which no bench does. With 6 M acid and base in whole drops and under 2 mL of liquid, one drop's worth of acid left over is still inside the indicator's range, so the model can only reach violet with none left. It has no rule for base left over.
9. **The ice bath is taken at 20 °C,** the temperature of the cold solubility. Colder water holds less lead chloride, so the solid is there in ice water if it is there by this figure.
10. **Standard states.** Every check uses concentrations where the constants are for activities. In 6 M sodium hydroxide and 6 M ammonia that is rough. The margins, 5.4 and 3.8 times, are not wide enough to cover it with certainty.
11. **"Magnesium forms no complex ion".** The page read says that the magnesium ion rarely forms complex ions; the tables have a row for MgOH⁺ and none for an ion that would dissolve the hydroxide in base. The notes say that it forms none that would hold it dissolved.

## Tried and not read

One site, a university's courseware with a table of indicators, refused the request for its robots file, and was not asked again. PubChem's data service is closed to automated readers by its robots file and was not asked. No page of OpenStax was fetched, and no page of Wikipedia.

Pages that were fetched while looking for these and that nothing rests on: a university's page of lecture demonstrations, which repeats the cobalt demonstration and has an equation for another system that does not balance; a college's experiment on shifting equilibria (Los Medanos College, on LibreTexts), which has cobalt among other systems and gives no results; a second college's handout for a lab like this one (Kingsborough Community College), which uses crystal violet and gives no colours for the range; and a university's page for a virtual lab on the cobalt equilibrium (Indiana University, on Pressbooks).

## Read and not kept

Every source. A value read from a page that is not kept rests on what the manifest says the page printed that day. What the build holds is that the record and the manifest give one account, that the two atomic weights are the periodic table's, that the worked-out values follow from the cited ones, and that each tube shows what the numbers give at the bench's amounts.

The quotation fingerprint that `src/chem-data/lechatelier/quotation.test.ts` and `src/app/lab/lechatelier/messages.test.ts` compare the lab's words against is not kept either, for the reason `../phase-3/sources/README.md` gives. `scripts/fingerprint-sources.mjs` writes it to `sources/`, where `.gitignore` lists it, from pages saved outside the repository:

    node scripts/fingerprint-sources.mjs <folder of saved pages> 2026-10-10 docs/research/lechatelier/sources

## What nobody checked

No chemist has read the record, the notes, the primer or the page's sentences. The scanned tables were read by one reader, by eye. The engine, the record and the wording were tested by scripts alone. The scanned tables were not read again at the review. The screens were built on 2026-10-10 and checked by script in headless Chromium, on that day and the next, by the AI coding assistant that built them, and then by the one that reviewed them, and by no person: the next section says what the review ran, and `docs/for-institutions.md` what was run and what was not. No screen reader was used, one browser was tried and no real device.

## The review of 2026-10-11

The one deep review of the phase, held when the screens were whole, by an AI coding assistant that had built none of the lab: not the record, the hazards, the engine, the wording or the page. It worked by script in headless Chromium and by reading. It made three changes the project's owner had decided on, looked for faults by using the page and not by reading alone, and put right what it found in the same pass. This section says what was changed, what was found, what was left and what nobody checked. The page as it now is, is section 18.8 of the design spec.

### Three changes the owner had decided

1. **The light line about the edge of a part of the tube is the shared tube's.** A part not yet looked at has a dashed edge, drawn in the ink at six tenths of its strength over whatever the tube holds. On the blue liquid it could not be seen, and the page's builder had given an edge a light line about it in this lab's stylesheet. The cause is in the shared tube: in the Group I cations lab the edge of the bottom of the tube could not be seen over the grey to black solid of step 4. The line is now a class of the shared tube (`src/app/lab/Tube.tsx`), on a dashed edge and on a whole one, and this lab's rule is gone. Measured on the pixels of the picture at four device pixels to the unit, the same before with the lab's rule and after with the shared one: on the blue liquid the ink is 1.1 to 1 and the light line 7.1; on the violet 1.6 and 3.9; on the colour between blue and yellow 2.2 and 2.4; on the pink, the yellow and the liquid with no colour the ink is 2.7 to 3.1 and the light line is not seen. The three labs that draw the tube each hold the class in a test, and this lab's test holds that its stylesheet has no rule for a part of the tube.
2. **System 4's pages are shorter.** Three things were done. The three choices of what took the metal ion away name the thing alone, "Hydroxide ions", "Ammonia" and "Nothing did", where each also said how the ion is held or that the solid is still there: they stand in one row where they stood in three, and how the ion is held is the notes' to say and the primer's. The third is not the one word "Nothing", since "Answer: Nothing" in the record would read as no answer given. The metal's four tubes are listed by what each is for, "First tube", "For acid", "For more sodium hydroxide", "For ammonia", each as wide as its words, in a list named for the metal: one row where they took three or four lines. And Challenge's sentence that an answer is given once is one line. Measured at 768 by 1024 with the menu open, from the line over a disturbance's title to the foot of its last card, where 959 px of the window are under the tab bar:

   | A disturbance of system 4 | As built | After |
   | --- | --- | --- |
   | Before the prediction | 871 to 983 px | 835 to 931 |
   | The change made | 755 to 827 | 719 to 775 |
   | The two questions open | 985 to 1,057 | 949 to 1,005 |
   | The question, where it asks which way, in Guided | 1,010 to 1,074 | 974 to 1,022 |
   | The same, in Challenge | 1,038 to 1,102 | 982 to 1,030 |
   | The question of what took the ion away, in Guided | 1,150 to 1,186 | 1,014 to 1,034 |
   | The same, in Challenge | 1,178 to 1,214 | 1,022 to 1,042 |
   | Done, the notes first | 997 to 1,136 | 943 to 1,080 |

   So the longest page is 83 px longer than the window where it was 255. In the first three systems the question's page in Challenge is 952 to 974 px where it was 972 to 994. Nothing a learner needs was taken off the page: the question still says that what was added should give more solid, and every tube is still named.
3. **The documents say that the review was held,** by whom and how, what it found, and what nobody checked: this section, sections 14 and 18.8 of the design spec, `docs/for-institutions.md` and the project's README.

### What the review found, and what was done

Each is marked as it was judged: must-fix where a learner is stopped, loses work, is told something false, sees an answer or cannot do something; should-fix where a user or a maintainer would plainly want it corrected. How each is known is said with it: ran (seen in the browser or in a run of the engine), measured, or read.

4. **With the bench open, "Sources" over it could not be opened** (must-fix). Measured, by asking the page what lies at each point about a control, and ran. Under the ways on of every entry stand "Sources" and "The bench", each a line of words 20 px tall under a hit area of 44, and they stood 8 px apart: "Sources" answered over 28 px of height, and with the bench open under it not at its own middle. A click, and a tap, on the middle of the word closed the bench and opened nothing. The Group I cations lab's review found the same in that lab's page and put it right there; this page had the form that one had before. The two now stand 36 px apart and 28 px under the ways on, and the click opens the sources. After the changes every control of the Lab tab, the Record tab and the Primer tab measured 44 px or more each way, in nineteen states of the page at 768 by 1024 and eighteen at 1280 by 800, but links in a list of sources, which are words in a line of text.
5. **At a question of direction a screen reader was given the way alone** (should-fix). Read, in the browser's accessibility tree: a choice was the radio button "Toward the left side" and no more, and what stands on the left is in the card of the equilibrium, some way before the question in the reading order. Each of the two choices that names a side now has the card's line for that side as its description ("Left side: lead ions and chloride ions, dissolved."), at the prediction and at the question of which way it went; the third names no side. The shared form of choices takes, for a choice, the id of what describes it; no other lab passes one. Read again from the tree. No screen reader was used, so how it is spoken is not known.
6. **In Guided a disturbance could be ended on an observation that Guided had said was not right** (should-fix). Ran. With an observation recorded wrongly in Challenge and the mode then changed to Guided, the page said which part to look at again; the question stood open under it; the right answer ended the disturbance; and two disturbances later Guided's own check said that the run did not count, for that observation. Guided now takes no answer, right or wrong, while such an observation stands (`src/engine/lechatelier/actions.ts`, with a test), and the button says why when pressed; put right, the observation is taken, and the run counts. What Challenge recorded at a disturbance that is done still stands, since nothing of a disturbance is entered again once it is done. The stored shape is as it was, the mode not being part of a run, and the entry's version is not raised.
7. **A wrong answer to what took the metal ion away was told to "find it in the equilibrium as written"** (should-fix). Read. The sentence is the one for a question of direction. At these four tubes what changed is whether the solid is left, and ammonia is not in the equilibrium as written. They now have a sentence of their own, the same at all four: to look whether the solid is still there, and to think what went into the tube in a large amount. It says how to look and not which answer is right.
8. **Grey words on a grey ground, in two places** (should-fix). Measured, from the colours the browser worked out. The number and the progress on the button of the system that is shown, 12 px tall, were 4.35 to 1 in the light theme: the fault the cations lab's review found on that lab's parts. "Not checked yet", beside an answer over a disturbance's notes in Challenge, was 4.49 to 1 on the tinted ground of those two lines. Both are now the text's own colour. After the changes the least among text that is not faint, on the Lab tab and the Record tab in fourteen states of the page at two window sizes, was 4.74 to 1 in the light theme and 6.21 in the dark.
9. **An entry of the primer's list that is one line was 32 px tall** (should-fix). Measured, as in 4. It is the shared paged list (`src/app/lab/Paged.tsx`), so it was so of every lab's primer: six of this lab's ten entries, those not marked to read first. An entry is now 44 px at the least; in the six labs' primers every entry measured 44 px or more at 768 by 1024 with the list opened and at 1280 by 800. Entries with a note under them were 48 px or more and are as they were.
10. **`docs/for-institutions.md` said that every control was 44 px or more, read from each control's own size,** and that the contrast of the page's text had not been measured (should-fix: see 4, 8 and 9). It now says what was measured, how, and what was changed.

Nothing else in the code was changed. No stored chemistry value, rule or model parameter was changed, and the stored entry's name and version are as they were.

### What was read and worked again, and found sound

- **The six constants from the eleven Gibbs energies,** by hand: 93.522, 64.222, −82.484, −48.840, 27.075 and 79.885 kJ/mol, and from them 4.13 × 10⁻¹⁷, 5.61 × 10⁻¹², 2.82 × 10¹⁴, 3.60 × 10⁸, 1.81 × 10⁻⁵ and 1.01 × 10⁻¹⁴ at 298.15 K; and the heat of dissolving lead chloride, 23.392 kJ/mol, from the three enthalpies. The energies themselves were not read from the scan again.
- **Lead chloride.** 10 g/L over 278.10 g/mol is 0.03596 mol/L, and four times its cube is 1.86 × 10⁻⁴; 33.5 g/L gives 6.99 × 10⁻³. The tube begins with 450 micromoles of lead in 1.5 mL, and a portion of acid is 30 micromoles of chloride in 0.1 mL. After one portion the product of the ions is 9.89 × 10⁻⁵, 1.88 times under the cold figure; after two, 3.30 × 10⁻⁴, 1.77 times over; after three, 6.25 × 10⁻⁴, 3.36 times over, and 11.2 times under the hot figure; and with 3 mL of water, 3.30 × 10⁻⁵, 5.64 times under.
- **One drop of base with each metal.** 300 micromoles of the metal ion and 300 of hydroxide in 3.05 mL: the product at mixing is 9.5 × 10⁻⁴, over the solubility product by 2.3 × 10¹³ for zinc and by 1.7 × 10⁸ for magnesium. With half the metal ion left, 0.0492 M, the hydroxide the product leaves dissolved is 2.9 × 10⁻⁸ M and 1.07 × 10⁻⁵ M, which are 0.00003% and 0.011% of what went in.
- **Zinc hydroxide in excess base and in ammonia.** A share holds 49.18 micromoles of zinc, half of it as the solid. With 1 mL of 6 M sodium hydroxide and all the zinc as its complex ion, the ion is 0.0328 M and the free hydroxide 3.90 M: the quotient is 2.15 × 10⁻³ against 1.16 × 10⁻², 5.4 times under. With 4 mL of 6 M ammonia, the complex ion and the hydroxide the solid sets free are each 0.0109 M, ammonia makes 0.0057 M more, and 5.28 M of ammonia is left: the quotient is 3.9 × 10⁻⁹ against 1.49 × 10⁻⁸, 3.8 times under.
- **The indicator.** 900 micromoles of acid in 1.25 mL is 0.72 M, and 1,800 in 1.4 mL is 1.29 M; with one portion of base, 900 in 1.55 mL is 0.58 M.
- **Each of the seventeen right answers,** against the equilibrium as written and what the tube shows; the nine equations, five equilibria and four second changes, which balance in atoms and in charge; and that the cobalt tube after its water has the make-up of the demonstration's violet liquid, 0.04 g of the salt in a millilitre and six tenths of the liquid concentrated acid.
- **Every sentence a learner can be shown:** the primer's ten cards, the tasks, the hints, the refusals, the outcomes, the notes of the seventeen disturbances and the ten hazard notes. Nothing was found that is wrong in its chemistry, that gives a direction the equilibrium as written does not, or that the page contradicts, but for 7 above.
- **Six of the documents the chemistry rests on,** each in the copy its builder saved on 2026-10-10, which is not in the repository; nothing was fetched again. The page on the lead ion (10 g/L at 20 °C and 33.5 at 100 °C, and the solid that may take three to five minutes to show); the demonstration of the two cobalt ions (the equation with its colours, the violet liquid of 4 g in 100 mL of which 60 are concentrated acid, blue in hot water and pink in ice water, and that the change toward blue is endothermic); the reference table of indicators (methyl violet, pH 0.0 to 1.6, yellow to blue); the handout (the two forms of methyl violet one hydrogen ion apart, yellow and violet, the bottles and their strengths, and its background on the two hydroxides); and the pages on the zinc ion (its hydroxide dissolves in an excess of ammonia and of hydroxide, each as a complex ion) and on the magnesium ion (it rarely forms complex ions, and ammonia brings its hydroxide down). And **four safety data sheets:** the statements of lead nitrate, of cobalt(II) chloride hexahydrate, of methyl violet and of ammonia solution are as stored, with their signal words.
- **What Challenge is kept from.** In the browser, in a whole run by tap with a wrong observation and a wrong answer: no mark and no word of whether an entry is right before the check, on the Lab tab or the Record tab; no note of a disturbance before it is done; and the labels of a disturbance's sources name kinds of thing ("What the tube shows", "Notes on this disturbance") and nothing a tube shows.
- **The lint door** for `engine/lechatelier`, which a test holds. The door does less here than in the labs before: the page is handed the record, for its names and its notes, and the record holds every stage of every tube and every right answer. Nothing of the page's own files reads either, by a search of them, and what holds the page to that is the tests of what is kept back.
- **The tests:** none of the lab's 256, as they are written, is without an assertion.

### What was run

By script, in headless Chromium on Linux, against the production build, at 768×1024 first. The scripts are not kept in the repository. The last run of each was made after the last change to the code.

- **The whole lab in Guided by the keyboard alone,** all seventeen disturbances, at 1280×800 in the light theme and at 768×1024 in the dark, with wrong entries given first at eight of them: 304 checks at each size.
- **The whole lab in Challenge by tap,** in a context that emulates a touch screen, at 768×1024 in the dark theme, with a prediction changed before the change and none after, wrong entries, the check, the system worked again, a reload in the middle of a disturbance and of a lab that is complete, and Restart refused and accepted: 128 checks.
- **The mode changed in the middle of a disturbance,** both ways: 11 checks.
- **The builder's three scripts,** again: 186 checks, with the one sentence that was reworded put into them.
- **The other labs.** One form of choices of each of the four, by keyboard: in the aqueous reactions lab, the flame test lab and the Group I cations lab, answers that are not right, right ones, Change and Escape; in the calorimetry lab, a choice made, recorded and changed. The shared tube in the aqueous lab and the cations lab, with the worked-out style of each part's edge before the change and after. And the primer's list of all six labs (9 above).
- **Measured:** the picture's colours and contrasts on its pixels, in both themes; the hit area of every control point by point; the contrast of the page's text; how long every disturbance's page is at each point of working it, in both modes, at 768×1024 with the menu open and closed, at 1280×800 and at 1024×768; and what the choices of a question are named and described as. The figures are in `docs/for-institutions.md` and in section 18.8 of the design spec.
- **Motion.** With motion allowed, the one thing running just after a press of the change was the app's own button, for 150 ms; with the system set to reduce motion, nothing ran for longer than a hundredth of a millisecond; and the lab's stylesheet has no rule that animates.
- **The whole check,** after the last change to the code: `npm run build` passed with 4,737 tests, and 1,297 skipped for want of the other labs' fingerprints; `npm run build:data`, `npm run build:expected` and `npm run cross-check` left no file changed.

### The colours

The six values are as the builder gave them, read from the pixels of the picture in both themes: blue #1d3ea6, violet #8f58d1, the colour between blue and yellow #00ae96, pink #f8b4ce, yellow #f6d93f and the liquid with no colour #e8edf2, on a card that is white in both themes. Every colour a learner records is said in words when the liquid is looked at, in the callout and in a status line, and the whole tube in words is in its disclosure; none is only shown.

Can pink, yellow and the liquid with no colour be told apart by eye? The review's view, from pictures of the screen set side by side and not from a person's eye: yes, in both themes. They are 1.2 to 1.4 to 1 from one another as ratios of contrast, which says only that they are nearly as light as one another; in hue they are a pink, a yellow and a grey. In OKLab, where a difference of about 2 in a hundred is just noticeable, they are 14 to 21 apart; worked through a published simulation of the three kinds of colour-blindness at full strength, 10 or more, but for yellow against pink without the blue cones, 6, and those two are never in one system. The faintest thing is the liquid with no colour against the white card, 1.2 to 1, which is held by the glass, 8.9 to 1 against it, and by the line of its surface, 2.5 to 1. Nothing was changed.

The white solid is the card's own white. Its edge is the ink at full strength, 10.4 to 1 against the solid and 8.9 against the liquid over it; the word beside its bracket is 10.4 to 1; and its grain, drawn at half strength, is 2.6 to 1, as the cations lab's review measured it there.

### Left for the owner

None of these was changed.

- **A page of system 4 is still up to 83 px longer than a window of an upright tablet** (2 above). What is left to take is small or costs something: the question of what took the ion away is two lines for zinc and three for magnesium, and without its first sentence it is one, but that sentence is what makes it a question in Challenge, which has no hint; "Your prediction is fixed: the change has begun" is a second line under the equilibrium in every system.
- **The edge of a part on the colour between blue and yellow** is 2.2 to 1 in the ink and 2.4 in the light line, the least of the six liquids (1 above). With the ink at its full strength it would be 3.7. It is the shared tube's look in three labs, and the list beside the picture and the button's name say the same in words.
- **The line of a liquid's surface and the grain of a solid are under 3 to 1,** as the cations lab's review left them: the line is 2.2 to 2.5 against the three pale liquids and 1.1 against the blue, which is itself 9.2 to 1 against the card.
- **The faint words of a button that cannot be used now** are 3.7 to 1 in the light theme and 4.9 in the dark. It is the shared control's look in every lab.
- **Two of the ten hazard notes do not end as the other eight do.** The 6 M hydrochloric acid and the sodium hydroxide carry the aqueous reactions lab's records unchanged, which have no sentence on disposal; the eight written for this lab end with it, and the primer's safety card says it of every bottle.
- **In Guided, what Challenge recorded at a disturbance that is done still stands** (6 above), and Guided's own check then says that the run does not count, and where.
- **For a chemist, beside the eleven things above:** after the first portion of acid the indicator's tube is at 0.72 M hydrogen ion, pH 0.14, in a range that runs from 0.0 to 1.6. The build's margin holds, 1.39 times from the yellow end, but a real tube that near the end would look nearer yellow than half way, and the picture draws the colour half way.

### What nobody checked

- **No person has run the lab.** Everything above was done by scripts and by reading, by an AI coding assistant. How the page looks is the owner's to judge.
- **No screen reader was used.** Roles, names, descriptions and states were read from the page and from the browser's accessibility tree; what is announced has not been heard.
- **One browser, and no real device:** headless Chromium on Linux, with a touch screen emulated. No other browser, no phone, no tablet, no finger.
- **No chemistry instructor and no chemist** has read the record, the notes, the primer or the page's sentences. The review worked the arithmetic again and read ten documents; it is not a chemist's reading, and the eleven things a chemist should look at stand.
- **Not read at the review:** the scanned tables; thirty-eight of the forty-two hazard documents, and no hazard note against its documents; twelve of the eighteen sources of the lab's own manifest; and any page as its site serves it today.
- **No person with a colour-vision deficiency** has looked at the page, and no simulated picture was looked at: the figures above are worked out from the six values.
- Browser zoom, enlarged text and forced colours were not tried, and the window sizes were 768×1024, 1280×800 and, for the lengths alone, 1024×768.
