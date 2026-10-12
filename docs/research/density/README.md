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
- The note's area is from 44.8 to 95.8 cm² at every reading the allowance takes, so it is written with two figures from the centimetre ruler and three from the millimetre ruler, and never needs a power of ten.

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

## Read and not used

- Wikipedia's article Saline water, whose table gives the same densities of salt solutions but says of their temperature only that it is "some ambient temperature". The data page, whose note gives 20 °C, was used.
- NOAA's lists of chemical names under the letters C and E, read to find the records of copper and of ethanol; the site's search was not used.

## Tried and not read

- A NIST page on checking a thermometer in ice water, at an address that was guessed: the server answered that there is no such page, and that site was not asked again. The fixed point rests on Wikipedia's articles Thermometer and Celsius.

## Read and not kept

Every page and sheet but the periodic table's copy: the manifests give each one's address, what it prints and where, and the hash of what was fetched.

## The engine

`src/engine/density/`, with the two rounding rules in `src/engine/figures.ts`. The stored record's entry is `lab:measurement-and-density`, version 1 (`src/density-version.test.ts`). The sentences of the page are in `src/app/lab/density/messages.ts`. The lab has no page yet.

## What nobody checked

No person has worked the lab, and no chemistry instructor has read the record, the primer or the notes. No page exists, so nothing was looked at in a browser.
