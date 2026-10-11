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
3. **The choices of the two questions of direction name the way alone.** As first written each choice also said what stands on that side. The card of the equilibrium stands over both forms and says it once, so the page's choices are "Toward the left side", "Toward the right side" and "Not at all", and the sentence that stood under a question not yet open is gone, since a question is drawn only once it is open. The tests of the wording follow.
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

No chemist has read the record, the notes, the primer or the page's sentences. The scanned tables were read by one reader, by eye. The engine, the record and the wording were tested by scripts alone. The screens were built on 2026-10-10 and checked by script in headless Chromium, on that day and the next, by the AI coding assistant that built them, and by no person; `docs/for-institutions.md` says what was run and what was not. No screen reader was used, one browser was tried and no real device, and the review of the lab by an assistant that did not build it has not been held as this is written.
