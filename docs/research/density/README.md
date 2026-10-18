# Measurement and density lab research record

The inputs the measurement and density lab is built from (spec section 22), where each came from, and what could not be found. Everything was gathered on 2026-10-12. Nothing in this folder is loaded by the app.

`npm run build:data` reads this folder and writes `src/chem-data/density/density.json` and the lab's entries in `src/chem-data/sources.json`. The build stops, and writes nothing, on an input it cannot hold to its sources, on a density that is not what its cited figure gives, on a metal's figure that is not the one in the copy the periodic table keeps, and on numbers that do not hold together as spec 22.6 asks (`scripts/density-lib.mjs`).

| File | What it is |
| --- | --- |
| `density.json` | The lab's record: the two liquids and the three metals an unknown may be; the water; the five instruments and what each is read to; the table of liquids and the table of metals, each row with the figure its source prints, the temperature it is for and the density stored; the melting point of ice; the three parts with the notes shown when each is done; and the model's fourteen parameters, each with its rationale |
| `sources/MANIFEST.json` | Every source of that record and of the primer (`src/chem-data/density/primer.ts`): its address, its citation, and rows that say what it prints and where, each naming the stored values it supports |
| `hazards.json` | The hazards of the five things an unknown may be: for each, the heading over its statements, the signal word, the statements and the note |
| `sources/hazard-manifest.json` | The fourteen documents behind those hazards, with rows that say what each prints, and what was read and not carried |
| `sources/quotation-fingerprint.json` | Not kept in the repository (`.gitignore`): the hashes of every run of six words in the pages read, which the no-quotation tests compare against. Made with `node scripts/fingerprint-sources.mjs <folder of the pages> 2026-10-12 docs/research/density/sources`; where it is absent those tests are skipped |

## The densities as stored

Every density is stored to three significant figures, the figures the lab's instruments give, in g/mL. The figure its source prints is stored beside it with the source's own digits, and the build works the stored figure out again.

| Row | Strength, as its source defines it | Temperature | The source prints | Stored | Source |
| --- | --- | --- | --- | --- | --- |
| Ethanol, 95% (an unknown) | 95.0% by mass | 20 °C | 0.80567, relative to water at 20 °C | 0.804 | Lange's Handbook, 10th ed., through Wikipedia's Ethanol (data page) |
| Ethanol, 50% | 50.0% by mass | 20 °C | 0.91546, relative to water at 20 °C | 0.914 | the same table |
| Water | | 20 °C | 0.99821 g/mL | 0.998 | NIST Chemistry WebBook, fluid properties |
| Sodium chloride solution, 10% | 10% by weight | 20 °C | 1.0707 g/cm³ | 1.07 | CRC Handbook, 86th ed., through Wikipedia's Sodium chloride (data page) |
| Sodium chloride solution, 20% (an unknown) | 20% by weight | 20 °C | 1.1478 g/cm³ | 1.15 | the same table |
| Aluminium (an unknown) | | near room temperature | 2.70 g/cm³ | 2.70 | CRC Handbook, 84th ed., through the copy of Wikipedia's Densities of the elements (data page) that the periodic table keeps |
| Zinc (an unknown) | | near room temperature | 7.14 g/cm³ | 7.14 | the same copy |
| Iron | | near room temperature | 7.87 g/cm³ | 7.87 | the same copy |
| Copper (an unknown) | | near room temperature | 8.96 g/cm³ | 8.96 | the same copy |

The two ethanol figures are relative densities, worked into g/mL with the density of water at 20 °C: 0.80567 × 0.99821 = 0.804228. The same table has four columns of densities set against water at 4 °C, which are g/mL as near as makes no difference, and prints 0.80424 and 0.91384 at 20 °C; the page marks those four columns as wanting a citation, so the column next to them was taken. The two agree in the fourth figure.

The melting point of ice is stored as the 0.0001 °C of the table in Wikipedia's article Celsius; the lab takes ice and water stirred together to be at 0.0 °C, to the tenth of a degree its thermometer is read to.

## The parameters, and the numbers over seeds 1 to 100

| Parameter | Value | What it is |
| --- | --- | --- |
| `readingAllowance` | 2 | A reading counts within two of its last figure of what the scale shows: a fifth of the smallest division, as for the titration lab's burette. The balance is copied exactly |
| `eyeShiftTenthMl` | 5 | A level looks 0.5 mL higher on the scale from above and 0.5 mL lower from below. Direction and size are the lab's own |
| `tolerancePercent` | 3 | A density counts within 3% of the stored figure |
| `noteLengthRangeE2`, `noteWidthRangeE2` | 12.00 to 15.49 cm, 4.00 to 5.89 cm | The note: three figures and two on the centimetre ruler, four and three on the millimetre ruler |
| `firstVolumeRangeTenthMl` | 15.0 to 45.0 mL | The water in part 1's cylinder |
| `thermometerOffRangeTenths` | 0.3 to 0.8 °C, high or low | How far the thermometer is off in ice and water |
| `firstMassRangeCg` | 15.00 to 95.00 g | The object on part 1's balance |
| `emptyCylinderRangeCg` | 60.00 to 95.00 g | The empty cylinder of part 2 |
| `liquidRangeTenthMl` | 20.0 to 45.0 mL | The unknown liquid poured |
| `waterRangeTenthMl`, `piecesRangeTenthMl` | 20.0 to 27.0 mL, 15.0 to 20.0 mL | The water of part 3 and the volume of the pieces |
| `wetWaterRangeCg` | 0.60 to 1.20 g | The water on pieces weighed wet |
| `splashRangeTenthMl` | 0.8 to 1.5 mL | The water lost when the pieces are dropped in |

By number, from the build's check and from the engine's acceptance tests over seeds 1 to 100:

- A learner who reads every level where it stands gets the stored density, to its three figures, at every seed: the liquid at 100 seeds of 100 and the metal at 100 of 100.
- A learner whose every level is at the edge of the allowance is at most 0.995% out for the liquid (ethanol, 20.0 mL read as 19.8 mL, 16.08 g: 0.812 against 0.804) and 2.801% for the metal (zinc, a rise of 15.0 mL read as 14.6 mL, 107.10 g: 7.34 against 7.14). Over seeds 1 to 100 the worst are 0.995% (seed 8) and 2.790% (seed 80). All count.
- So the instruments tell densities about 2.0% apart for a liquid and 5.6% for a metal: twice the furthest a careful learner comes out. The nearest two liquids of the table are 7.2% apart (water and the 10% salt solution) and the nearest two metals 10.2% (zinc and iron). With 3% on either side of each, no two candidates' bands meet, so a density within tolerance of one is nearest to it.
- A volume by difference is 15.0 mL or more, and keeps three figures with both levels read at the edge (14.6 mL). Every mass has four figures or more: the lightest liquid poured weighs 16.08 g and the lightest pieces 40.50 g.
- A level read from above or below is 0.5 mL from the true level, never within the 0.2 mL of the allowance.
- Dropped in, the pieces lose 0.8 to 1.5 mL of water and the density comes out 4.1% to 11.1% high over seeds 1 to 100: outside the tolerance at every seed. Weighed wet, the pieces come out 0.4% to 3.0% high: inside the tolerance at every seed, so that run does not count for its cause and not for its number.
- The note's area is from 44.8 to 95.8 cm² at every reading the allowance takes, so it is written with two figures from the centimetre ruler and three from the millimetre ruler, and never needs a power of ten. At two figures it comes to a whole number of tens (50, 60, 70, 80 or 90 cm²) at 39 seeds of the first 400, and is then typed "70": the notebook counts the zero that ends such a number where the rule asks for it (the review of 2026-10-12, below).

## How each kind of value was read

- **The handbook tables** were read through Wikipedia's data pages, which transcribe them; neither handbook was read. Each citation names the handbook and says so, and gives the revision of the page. The two data pages read for the liquids were read and are not kept; the metals' is the copy the periodic table keeps, which the build reads.
- **Water** was read from NIST's page for the fluid properties of water at 20 °C and 0.1 MPa, the same page the calorimetry lab read for 25 °C.
- **The primer's sources** are a university's page on significant figures and five Wikipedia articles (Significant figures, Graduated cylinder, Density, Thermometer, Celsius). No page of OpenStax was fetched, and no site's search was used.
- **The seven Wikipedia pages were read twice.** They were first read on 2026-10-12 as source text at the site's raw addresses (`/w/index.php?…&action=raw`, with one question to its API for their revisions), which the site's robots file closes to automated readers; that was seen only afterwards. They were read again the same day at the addresses the site leaves open (`/wiki/Title?oldid=…`), each at the revision first read, and those are the addresses and hashes the manifest records and the pages the fingerprint was made from. Every figure and passage the record rests on is in the pages as read that way, with the same digits; the article Saline water, read and not used, was read again too.
- **One citation was corrected on the second reading.** The ethanol table's citation gave the handbook a place of publication, which the page does not print; it no longer does.
- **The hazards** follow the rule of spec 5.2: the default supplier's sheet for each substance, and one or two other documents. For ethanol and for copper the supplier's sheet and NOAA's record were read new. For sodium chloride, aluminium and zinc the documents are ones the flame test and calorimetry labs had read; their saved pages were checked against the hashes those labs recorded and read again, and none was meant to be fetched again. One was, by mistake: the supplier's sheet for sodium chloride solution, before it was seen that the flame test lab lists it; what came had the recorded hash.

## Where the lab is other than spec section 22 has it

- **No hazard record is shared.** The spec has other labs' records shared for the same thing in the same form. The calorimetry lab's aluminium and zinc are pieces of about 50 g heated in boiling water, kept from that lab's acid, alkali and ammonium nitrate, and their notes say so; the flame test lab's sodium chloride is a 0.1 mol/L solution. None is the thing on this bench, so each of the five records is this lab's own, on the same documents.
- **The table of liquids holds no third liquid.** Its five rows are the two unknowns, the same two liquids at another strength, and water: all from two handbook tables and NIST, all at 20 °C.
- **Both strengths are by mass**, as their sources define them. A bottle whose 95% is by volume holds a weaker and denser liquid: the same table has 94% by volume as 91% by mass, which is 1.4% denser than 95% by mass. A note says so. Which of the two a laboratory's bottle means was read in no source.
- **The supplier's sheet for 95% ethanol is for a denatured alcohol** (ethanol with isopropyl alcohol, methanol and a ketone). Its statements are carried, one of them for the methanol, and the heading says whose they are. The density stored is of ethanol and water alone.
- **The metals' densities are for "near room temperature"**, which is all their source says; the spec asks for a stated temperature. Only copper has a figure in degrees there (20 °C, in the second handbook's row, the same 8.96).
- **The eye begins above the cylinder** and is moved by the learner; the spec does not say where it begins. Only the cylinder has an eye: the rulers and the thermometer are read as they stand.
- **The allowance is counted from where an edge or a level stands**, so on the centimetre ruler, where an edge is seeded to the hundredth, a reading may be 0.2 cm from the edge and not from the nearest tenth.
- **A step that would lose a reading is refused**: pouring before the empty cylinder's mass is typed, putting the pieces in before the water's level is typed, taking them out before the last level is typed. The spec does not have this; without it a learner could work a bench into a run that cannot be finished.
- **Weighing the pieces wet does not put the density outside the tolerance** (0.4% to 3.0% high). The run does not count because of the technique, which is named. The splash does both.
- **Worked-out entries can be made in any order** once what each is worked from is in, and not only in the notebook's order.
- **A whole number that ends in zeros is read with those zeros counted where a rounding rule asks for it.** An entry takes no power of ten, so an area of two figures that comes to 70 cm² can be typed only as "70", which read by the usual rule has one figure. The notebook takes it as right where it is a right rounding at the figures asked for; read any other way it is judged as it stands. The spec does not have this, and the primer says it.
- **The closer look is the page's.** The engine hands over the stretch of the scale it shows and keeps no record of looking.
- **The pieces are drawn alike whichever metal they are.** Real copper is red-brown and would be known at a glance; a note says so.

## What could not be sourced, or only in part

- **Which way a level looks from above or below.** No source read says. The model has it higher on the scale from above and lower from below, which is where a sight line past marks on the near wall of a cylinder puts a curve that is further back. The primer and the page say only that such a reading is wrong.
- **How far a level then moves** (0.5 mL), how much water clings to wet pieces, how much a drop splashes out, how far a laboratory thermometer may be off, what a 50 mL cylinder weighs: the lab's own figures, each marked so in its rationale.
- **A temperature in degrees for the metals' densities**, as above.
- **The two handbooks themselves.** The figures were read only in transcription.
- **That wet pieces weigh more and that dropped pieces splash water out** are the spec's own two errors and are stated in the primer as the lab's model; no source was read for either.

## What a chemist should look at

1. Ethanol at 95% by mass against the usual bottle at 95% by volume, and whether the bench should hold the denatured product whose sheet was read. A denatured alcohol's density is not the stored one.
2. The eye's direction and size: higher from above, by 0.5 mL.
3. The metals at "near room temperature", and iron at 7.87 where the second handbook has 7.86.
4. Copper among metals that are drawn alike.
5. Wet pieces carrying 0.6 to 1.2 g of water, and a splash of 0.8 to 1.5 mL.
6. A reading allowance of two in the last figure on every scale, the thermometer included.
7. That every density is stored and judged at three figures: 1.1478 becomes 1.15.
8. The hazard notes: zinc "in water only for the measurement", and ethanol under a denatured alcohol's statements.
9. That the liquid's temperature is taken to be 20 °C and nothing evaporates from an open cylinder of ethanol.

## Open for the owner: does a typed "70" have two significant figures?

Where part 1's note comes to a whole number of tens at two figures, the notebook takes "70" as two figures (`waysToRead` in `src/engine/density/worksheet.ts`, and "Where the lab is other than spec section 22 has it" above). Nothing has been changed. To help decide, five openly available general chemistry sources were read on 2026-10-17 for what they say of zeros that end a whole number written with no decimal point. Each site's robots file was read first and none closes these pages; no page is kept.

| Source | What it says | "70" by it |
| --- | --- | --- |
| CK-12, *Introductory Chemistry*, section 3.16 "Significant Figures", on LibreTexts under the CK-12 licence: https://chem.libretexts.org/Bookshelves/Introductory_Chemistry/Introductory_Chemistry_(CK-12)/03:_Measurements/3.16:_Significant_Figures | A stated rule: in a number with no decimal point, the zeros at its right-hand end do not count, and its example 140 has two figures. Such a zero is still needed, as a placeholder. Sometimes only scientific notation can show the figures meant: 15,000,000 to four figures is 1.500 × 10⁷. With a decimal point the end zeros count. | one figure |
| Ball, D. W., *Beginning Chemistry*, section 2.4 "Significant Figures", on LibreTexts under CC BY-NC-SA 3.0: https://chem.libretexts.org/Bookshelves/Introductory_Chemistry/Beginning_Chemistry_(Ball)/02:_Measurements/2.04:_Significant_Figures | A stated convention: zeros that end a number with no decimal point do not count and only put the other digits in place; in any number that has a decimal point they do. Its example, a population of 306,000,000, has three figures. | one |
| Bodner Research Web, Purdue University, "Significant Figures" (the page the primer cites, fetched again and found to be the file recorded in the manifest): https://chemed.chem.purdue.edu/genchem/topicreview/bp/ch1/sigfigs.html | A stated rule: zeros that serve only to set the decimal point do not count, so 470,000 has two figures; and a digit one is unsure of is taken as not counting, so an instruction to add 400 mL of water gives a volume of one figure. | one |
| Lower, S., *Chem1 Virtual Textbook*, section 3.3 "Significant Figures and Rounding off", on LibreTexts under CC BY 3.0: https://chem.libretexts.org/Bookshelves/General_Chemistry/Chem1_(Lower)/03%3A_Measuring_Matter/3.03%3A__Significant_Figures_and_Rounding_off | No rule in words, but its examples treat such zeros as placeholders: 85,381 rounded to three figures ends in two zeros that only hold places, and in a worked conversion an answer written "20 cm" is said to have one significant digit. | one, by its examples |
| Wikipedia, "Significant figures", revision 1376805448 (the article the primer cites, at the revision the manifest records): https://en.wikipedia.org/wiki/Significant_figures?oldid=1376805448 | Ambiguous: zeros that end a whole number may or may not count, and the number alone does not say. It lists marks some writers use (a bar over the last figure that counts, an underline, or a decimal point after the number, as "1300."), says they are not in general use, and gives as the widely understood ways a change of unit prefix, scientific notation, or saying how many figures are meant. | either |

**What this comes to.** Four of the five, the three textbooks and the university's page, state or follow a convention by which "70" has one significant figure. The fifth calls the number ambiguous. None of the five reads "70" as written as having two figures. The ways they give to show two are scientific notation (7.0 × 10¹), a decimal point after the number ("70.", which the CK-12 and Ball rules count as making the zero a figure, and which Wikipedia calls a convention not in general use), a change of unit, or saying the count outright.

**Where the lab stands.** The primer's card on which zeros count teaches the stated convention: a whole number such as 1200 is taken to have two figures. The card after it says that the notebook counts the zero of 70 where a rounding asks for it. So a learner who types "70" for an area of two figures is accepted for a number that, read by the rule the same primer gives, has one. The lab does this because the entry has no other way to show two figures: it takes no power of ten, and "70." is refused as no number. Only this entry can come to such a number, at 39 of the first 400 seeds.

**Choices, none of them made.**

1. Keep it as it is. It agrees with the reading that such a number is ambiguous, and the primer says what the notebook does; it disagrees with the convention four of the five sources give, which the primer itself teaches a card earlier.
2. Follow the stated convention: accept "70." and a power of ten (7.0 × 10¹) as two figures, and refuse "70" as one figure with a sentence that says how two are written. This changes the shared number parser and the notebook's entry, and changes how a stored lab with "70" in it is graded.
3. Keep the case from arising: choose the seeded sizes of the note so that its area at two figures is never a whole number of tens, or have it given in another unit. This changes the lab's seeds or parameters and their tests.

## Read and not used

- Wikipedia's article Saline water, whose table gives the same densities of salt solutions but says of their temperature only that it is "some ambient temperature". The data page, whose note gives 20 °C, was used.
- NOAA's lists of chemical names under the letters C and E, read to find the records of copper and of ethanol; the site's search was not used.

## Tried and not read

- A NIST page on checking a thermometer in ice water, at an address that was guessed: the server answered that there is no such page, and that site was not asked again. The fixed point rests on Wikipedia's articles Thermometer and Celsius.

## Read and not kept

Every page and sheet but the periodic table's copy: the manifests give each one's address, what it prints and where, and the hash of what was fetched.

## The engine

`src/engine/density/`, with the two rounding rules in `src/engine/figures.ts`. The stored record's entry is `lab:measurement-and-density`, version 1 (`src/density-version.test.ts`). The sentences of the page are in `src/app/lab/density/messages.ts`.

## The page

`src/app/lab/density/`, at `#/lab/measurement-and-density`, built on 2026-10-12. Design spec, section 22.7, says the page point by point, each place it is other than 22.2 and 22.3 or than the calorimetry lab's page, how far apart the marks of each closer look are drawn, and how long each page is, measured. Two of its points bear on this record. The closer look of the millimetre ruler shows the engine's stretch and, where that holds no numbered mark, as much more as reaches the nearer one, at most two marks; the engine is as it was. And the balance's display shows 0.00 g with nothing on its pan, where the engine has no figure. The page's builder changed no engine file, no stored value and no parameter, and added seven words to the page's sentences, each with a test. The review of 2026-10-12 made the cylinder's closer look 400 px tall with 25 px beyond its end marks, its marks as far apart as before; section 22.7 has it.

## What nobody checked

No person has worked the lab, and no chemistry instructor has read the record, the primer or the notes. The page was looked at in headless Chromium, by script, by the AI coding assistant that built it, and then by the reviewer of the next section, which is an AI too; the page for institutional reviewers says what was run and measured and what was not. The last part of the next section lists what is still unchecked.

## The review of 2026-10-12

The one deep review of the phase, held when the screens were whole, by an AI reviewer that had built none of the lab: not the record, the hazards, the engine, the wording or the page. It worked by script in headless Chromium and by reading, on 2026-10-12 by the machine's own clock. It made the changes the project's owner had decided on, worked the lab from a new lab to the line that says it is complete in each mode, reading each scale from its picture, and put right what it found in the same pass. This section says what was changed, what was found, what was left and what nobody checked. The page as it now is, is section 22.7 of the design spec.

### The changes the owner had decided

1. **The metals' hazard notes no longer say how many grams of each metal the bench holds.** Each gave its own range (aluminium 40 to 54 g, zinc 107 to 143 g, copper 134 to 179 g), and every tile can be opened before the unknown is named, so the balance's reading named the metal. Each note now says "dry pieces of" its metal, "slid into cold water", and no amount. The two liquids' notes were read for the same fault and left: both give the same 20 to 45 mL, which is poured whichever liquid it is. A test holds that no note of a thing an unknown may be carries a figure in a unit the bench reads unless every other such note carries the same one, and that no note gives grams; it fails on the notes as they were. The rationale of the parameter `piecesRangeTenthMl` still gives the three ranges; no page shows it.
2. **Part 3's cylinder page is inside one screen at 768 by 1024.** With the pieces in, the last level to type and the closer look open it was 984 px, where 976 px are under the tab bar. The cylinder's closer look is 400 px tall where it was 420, with 25 px beyond its first and last marks where it had 35: its marks are as far apart as they were, 69.5 px as measured, and a level stands between the two middle marks, so nothing that is read is in the room given up. Measured after: 964 px.
3. **The documents say that the review was held,** in each place that said none had been.

### What the review found, and what was done

Each is marked as it was judged: must-fix where a learner is stopped, is told something false, sees an answer or cannot do something; should-fix where a user or a maintainer would plainly want it corrected. How each is known is said with it: ran (seen in the browser), measured, or read.

- **Must-fix: part 1 could not be finished where the centimetre ruler's area came to a whole number of tens.** Ran, at seed 9, in Guided by keyboard: 12.5 cm by 5.6 cm is 70 cm² at two figures; "70" was refused as having too few significant figures, "70.0" as having too many, and "70." and a power of ten as no number. The shared parser reads the zero that ends a whole number as holding a place, so "70" has one figure. It is so at 39 seeds of the first 400 (worked out by script); in Challenge the same notebook, right in every entry, did not count. The engine's acceptance tests passed over it because their scripted learner handed over a number of two figures that no page can make. Done: a product or a quotient that is a whole number ending in zeros is read with as many of them counted as makes the figures the rule asks for, where it is then a right rounding, and otherwise as before; the scripted learner writes each number and reads it back as the page does, and the tests of a careful learner fail without the change; the primer's card on significant figures says it. Only this entry can come to such a number. The lab is on no released branch, so no stored record is regraded.
- **Should-fix: the line under an empty cylinder spoke of the liquid's surface.** Ran, in part 2 before the liquid is poured: "Your eye is above the level: you are looking down on the liquid's surface." The line now says that the cylinder is empty and dry.
- **Should-fix: a first level said "The pieces are in the water now" once they were out of it.** Ran, in part 3 after the wet pieces were put on the balance. It says that the pieces have been put into the water.
- **The documents.** The README's paragraphs on the labs counted the labs added since v1 (the red cabbage pH lab was "a seventh") and then called this one the tenth; each now has its place among all the labs, the third to the tenth.

### Can the scales be read?

The reviewer read each closer look from a picture of the page, before looking at what the engine held, and typed what it read. A reading counts within two of its last figure. The reviewer is an AI: it placed an edge or a level by where it stood in the picture between two marks, which is not a person's eye at a screen.

| Instrument | Read | Within the allowance | Between two marks, on the page |
| --- | --- | --- | --- |
| Ruler marked in centimetres | 14, at seeds 1 to 5, 9 and 11 | 14 | 76.8 px at 768 by 1024, 85.0 px at 1280 by 800 |
| Ruler marked in millimetres | 14, at the same seeds | 14, ten of them the figure the engine holds | 76.8, 65.9 or 57.6 px, as the look has five gaps, six or seven |
| Graduated cylinder, eye level | 15, at seeds 1 to 5, and through the three parts at seeds 9 and 11 | 15 | 69.5 px |
| Thermometer | 7, at seeds 1 to 5, 9 and 11 | 7 | 69.5 px |

At seeds 1 to 5 the pictures were of the light theme at 768 by 1024; at seed 9 of the dark theme at 1280 by 800; at seed 11 of the light theme at 768 by 1024. Two more levels were read with the eye off them, one from above and one from below, and each was what the scale showed from there, half a millilitre from the level.

- **Tenths can be judged on each.** A tenth of a gap is 5.8 px at the least (the millimetre ruler at seven gaps, on an upright tablet) and 7 px or more on the cylinder, the thermometer and the centimetre ruler, and the allowance is two tenths either way.
- **One numbered mark is enough to know which marks are which,** on the cylinder (numbered each 5 mL, with six marks in a look), on the thermometer (its closer look in ice and water always holds the zero) and on the millimetre ruler, where the marks are counted from the one number in sight; the mark halfway between two numbers is drawn longer and is in sight whenever the look is widened. It asks of a learner that marks to the left of a number, and under the zero of the thermometer, be counted down: of the thermometer the page gives an example below zero under the field, and says that the numbers run downward once a reading is refused.
- **The curve shows where its bottom is.** The surface is a dark band, flat on top where the liquid meets the glass and curved underneath; its lowest point is the level, and it falls in the middle of the glass, where the short marks are drawn. The top of the band is three tenths of a millilitre over the level, so a level read at the top is refused, with a sentence that names the bottom of the curve. Where the band lies over a mark, the mark is drawn across it, at 4.5 to 1 against it in the light theme and 3.1 to 1 in the dark, worked out from the page's colours.
- **The millimetre ruler's closer look is left widened.** The other way is always five gaps of 76.8 px, with the one numbered mark outside the look at times: a mark would then be counted from nothing, since the ruler on the bench has its millimetre marks 2 px apart. Widened to six gaps or seven it still has 5.8 px to a tenth, and all fourteen readings counted, three of them from looks widened to seven gaps.

### Looked at and left

- **Challenge says what happened at the bench, and not what it costs.** After the pieces are dropped in, the line that says where they are ends "and water splashed out", and wet pieces on the balance are drawn with drops. It is what a learner at a bench would see; it does not say that the run will not count. Left as built.
- **A name that follows can be a metal the unknown cannot be.** With the pieces dropped in and weighed wet the density came to 7.70 g/mL, nearest iron, which is in the table and is never the unknown: "Iron" was marked as following, and the run did not count for its technique and its density. Right by the notebook's rule; noted for the owner.
- **In Guided a reading is found by trying,** as the page for institutions says; and switching the mode in the middle of a lab shows or hides the marks of what is entered, as in the other labs.
- **The notebook's rows give the unit twice** ("Length of the note, centimetre ruler (cm): 12.5 cm"). A matter of taste.
- **Words a first-week learner may not have:** "factor", "term", "product" and "quotient" in the two rounding rules, which the primer shows by one worked example each and does not define.
- **Controls that cannot be used are drawn at half strength,** 3.7 to 1 in the light theme: the frame's, as in every lab.
- **The stored record's version is 1.** The change to what the notebook takes would regrade a stored record with "70" in it; there is none outside this branch.

### What was read and worked again, and found sound

- **The primer's worked examples,** by hand: 61.4 − 52.37 = 9.03, to tenths 9.0; 31.2 × 2.4 = 74.88, to two figures 75; 13.94 ÷ 5.8 = 2.4034…, to two figures 2.4; and the counts of figures in 9.6, 8.43, 7.30, 4.07, 7.0, 0.050 and 1200.
- **Two whole labs, from their readings to their results,** by hand, from what the reviewer read. Seed 9: 12.5 × 5.6 = 70 cm² and 12.49 × 5.56 = 69.4444, so 69.4 cm²; −0.7 °C off; 93.36 − 64.58 = 28.78 g, over 35.8 mL is 0.80391…, so 0.804 g/mL, the ethanol; 42.8 − 24.9 = 17.9 mL, under 160.38 g is 8.9598…, so 8.96 g/mL, copper. Seed 11: 72 and 72.3 cm²; −0.6 °C; 26.57 g over 23.1 mL is 1.15 g/mL, the salt solution; 127.81 g over 17.9 mL is 7.14 g/mL, zinc. The page took each.
- **The two rules as stated and as applied.** A difference is held to the fewest decimal places of its two terms and a product or a quotient to the fewest significant figures of its two factors, which is what the sentences say; an entry with a figure too many, one too few and one cut off was each told which, in both parts with an unknown; a density upside down, one with the cylinder not taken off and one over the last level were each named.
- **Every sentence the page showed on the way,** among them each refusal of a reading, each of the five warnings, each reason a run does not count, the notes of the three parts and the hazard notes. The hazard notes were not read again against their documents.
- **Nothing says which liquid or metal an unknown is before it is named.** At seeds 1 to 8, which have both liquids and all three metals, in both modes, on each page of parts 2 and 3 with every disclosure open and on the Record tab, the names and formulas of the things an unknown may be were counted in the page's markup: the counts are the same at every seed.
- **The code.** The state and its effects, the stored record (four records that do not fit were each set aside with the page's sentence and the lab begun afresh), the lint rule for `engine/density`, and the tests, none of which is without an assertion. `src/engine/figures.ts` gained 153 lines for this lab and lost none; one worked-out entry was made in the browser in each of the calorimetry, the clock reaction and the iodination of acetone labs, and each was refused at the wrong count of figures and taken at three, as before.

### What was run and measured

- **A whole lab in Guided, by the keyboard alone,** at 1280 by 800 in the dark theme, seed 9, in stages, each a script that reopened the stored record and went on: every page reached with Tab and Enter, every reading typed from its picture, the warning before a level read from above, each refusal named above, and the three parts to the line that says the lab is complete. A whole lab in Challenge, by emulated touch, at 768 by 1024 in the light theme, seed 11, the same way: a level read from below, a density with the cylinder not taken off and the wrong liquid named in one run of part 2; the pieces dropped in and weighed wet in one of part 3; each part run again and counted. A reload at each stage reopened the part and the page the record says. Restart asked first and drew a new seed.
- **Focus.** After Next and Previous, the page's heading; after another part or a new run, the part's heading; after the closer look and after a move of the eye, the button pressed; after a warning, the warning; after "Go back", "Bring your eye level" for a level and the button pressed for a step; after the way on, the readings for a level and the button pressed for a step; after an entry, its Change button; after the check, how the run came out.
- **Everything to press,** at 768 by 1024, on the bench of parts 2 and 3, the cylinder's page of parts 1 and 3, the notebook of part 1 in Guided and of part 2 in Guided and in Challenge, and a run that counts, with every disclosure closed and each open in turn: at points 3 px apart over the area of each disclosure none answered for another control, and no button, field or choice was under 44 px either way but those that carry the frame's own area.
- **Contrast,** from the page's computed colours, in both themes: the text 4.7 to 1 or more (the grey of the parts' numbers, 12 px, in the light theme; 6.2 to 1 or more in the dark); the marks and numbers of every scale 19.8 to 1 and 19.0 to 1; the unit 9.3 and 10.7 to 1; the curve of the liquid 4.4 and 6.0 to 1 against the picture's ground and, worked out from the same colours, 3.5 and 4.9 to 1 against the liquid under it; the thermometer's thread 9.3 and 10.7 to 1. The text of a control that cannot be used is 3.7 and 4.9 to 1.
- **Motion.** With reduced motion asked for, no element of the page had a transition or an animation longer than a millisecond; with it not asked for, ten did, the frame's buttons.
- **Sizes.** The pages' lengths and the gaps of each closer look at both sizes, as section 22.7 gives them.

### What nobody checked

- No person has worked the lab, by hand, by keyboard or by touch. Every reading of a scale in this section was made by an AI from a picture.
- No screen reader has been used: that a refusal, a warning and an outcome are announced is known from the markup and from where focus went.
- One browser, headless Chromium on Linux. No real device, no real tablet, no real touch screen.
- No chemistry instructor has read the record, the primer, the notes or the hazards.
- The hazard notes against the documents they rest on, beyond the build's own check of the manifest.
- The page with the text enlarged, at 200% zoom, in a high-contrast mode, or at a width between the two sizes named.
