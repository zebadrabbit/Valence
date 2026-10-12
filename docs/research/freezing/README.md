# Freezing point depression lab research record

The inputs the freezing point depression lab is built from (spec section 23), where each came from, and what could not be found. Everything was gathered on 2026-10-12. Nothing in this folder is loaded by the app.

`npm run build:data` reads this folder and writes `src/chem-data/freezing/freezing.json` and the lab's entries in `src/chem-data/sources.json`. The build stops, and writes nothing, on an input it cannot hold to its sources, on a molar mass that is not the sum of its atoms' weights as the periodic table keeps them, on a measured row that is not worked out as stored, and on numbers that do not hold together as spec 23.3 and 23.6 ask (`scripts/freezing-lib.mjs`).

| File | What it is |
| --- | --- |
| `freezing.json` | The lab's record: the three liquids the unknown may be, urea and the three salts, each with its composition, its molar mass and the particles each formula unit gives; the freezing point constant of water; the eight atomic weights; three measured freezing points of solutions; the three parts with the notes shown when each is done; and the model's twenty-four parameters, each with its rationale |
| `sources/MANIFEST.json` | Every source of that record and of the primer (`src/chem-data/freezing/primer.ts`): its address, its citation, and rows that say what it prints and where, each naming the stored values it supports |
| `hazards.json` | The hazards of the seven things on the bench: for each, the heading over its statements, the signal word, the statements and the note |
| `sources/hazard-manifest.json` | The thirteen documents behind those hazards, with rows that say what each prints, and what was read and not carried |
| `sources/quotation-fingerprint.json` | Not kept in the repository (`.gitignore`): the hashes of every run of six words in the pages read, which the no-quotation tests compare against. Made with `node scripts/fingerprint-sources.mjs <folder of the pages> 2026-10-12 docs/research/freezing/sources`; where it is absent those tests are skipped |

## The values as stored

| Value | Stored | Source |
| --- | --- | --- |
| Freezing point constant of water | 1.86 °C·kg/mol, printed as 1.86 K·kg/mol | Wikipedia's article Freezing-point depression, revision 1336114117, its table of cryoscopic constants; the table gives the figure a reference of its own, to Aylward and Findlay, *SI Chemical Data*, 5th ed., p 202, which was not read |
| Atomic weights of H, C, N, O, Na, Cl, K, Br | 1.0080, 12.011, 14.007, 15.999, 22.990, 35.45, 39.098, 79.904 | CIAAW's abridged standard atomic weights 2024, from the copy the periodic table keeps; the build holds each to the periodic table's record |
| Molar masses | acetone 58.08, ethanol 46.07, 2-propanol 60.10, urea 60.06, sodium chloride 58.44, potassium chloride 74.55, sodium bromide 102.89 g/mol | Worked out from those weights, to two decimals, with the working stored; the build works each out again |
| Sodium chloride in water, 2% by mass | freezes at −1.19 °C | The CRC Handbook's table of the properties of mixtures of water and sodium chloride, 86th ed., as Wikipedia's Sodium chloride (data page), revision 1379379503, transcribes it; the handbook was not read |
| Sodium chloride in water, 3% by mass | freezes at −1.79 °C | The same table |
| Ethanol in water, 2.5% by mass | freezes at −1 °C | Lange's Handbook, 10th ed., as Wikipedia's Ethanol (data page), revision 1341104734, transcribes it; the handbook was not read |

### The particles each formula unit gives

| Solute | Stored | What it is |
| --- | --- | --- |
| Acetone, ethanol, 2-propanol | 1 | The ideal. For ethanol one measured figure stands beside it in the notes: the 2.5% row gives 1 ÷ 1.04, which is 1 to the one figure the table prints. No measured freezing point was found for a solution of acetone or of 2-propanol |
| Urea | 1 | The ideal. No measured freezing point was found |
| Sodium chloride | 1.82 | Measured: the 3% row, 0.529 mol/kg, where one particle for each formula unit would give 0.984 °C and the table prints 1.79 °C. The bench's solutions are 2.4% to 3.1% by mass. The 2% row gives 1.83, and the rows for 1%, 4% and 5% give 1.84, 1.82 and 1.82 |
| Potassium chloride, sodium bromide | 2 | The ideal, marked as the ideal: no measured freezing point of their solutions was found in a source that could be read. The notes and the page say that this is more than a real salt gives |

## The parameters, and the numbers over seeds 1 to 100

All twenty-four are model parameters with rationales in the record; none is a cited figure. They were chosen together.

- **The logger** reads every 30 seconds, a press of Run on is two readings, and it holds 60.
- **The cup.** Stirred, the temperature goes 70% of the way to the freezing point of what is dissolved in each step; still, 2%. With the lid on 60 mg of ice melts in each step, and with it off 1.5 g, which is much faster than a real open cup and is said to be. A gram of ice melts for each 80 gram-degrees the liquid is cooled. The cup starts with 25.00 g of ice and 93.50 to 98.00 g of water, 2.00 to 4.00 °C above the freezing point. With no ice left the liquid warms 1% of the way to a room at 22 °C in each step with the lid on, 3% with it off.
- **A level stretch** is the last three readings within 0.01 °C of one another and the temperature within 0.002 °C of the freezing point of what is dissolved, with ice left. The cup is said to hold only a little ice at 5.00 g or less.
- **The probe** reads 0.05 to 0.25 °C high or low, the same at every temperature.
- **The amounts.** The unknown is 3.60 to 4.50 g, whichever liquid it is. Urea is 5.25 to 5.90 g, sodium chloride 2.66 to 3.08 g, potassium chloride 3.39 to 3.93 g, sodium bromide 4.67 to 5.42 g.
- **The tolerances.** A molar mass counts within 1.5% of the stored one, a count of particles within 3%.

**By the build, over the seeded amounts** (three first readings, five masses of water and up to ten masses of solute for each solute, each with a careful run strained when it levels and again three presses later): every fall is from 1.06 to 1.98 °C, so it has three figures; 16.4 g or more of ice is left when the cup is strained, and 14.0 g or more at the logger's last reading with the lid on; a careful run levels within 14 readings, seven presses. With the result worked on unrounded numbers and half a unit of the third figure added for each rounded entry on the way, a bound on every chain the rounding rule allows, a careful learner is within 0.70% for acetone, 0.60% for ethanol and 0.72% for 2-propanol, and within 1.25% for urea, 0.92% for sodium chloride, 0.88% for potassium chloride and 0.86% for sodium bromide.

**How the three liquids are told apart.** Acetone and 2-propanol are 2.02 g/mol apart, 3.48% of the smaller, so a result nearer the wrong one is 1.74% out. The tolerance, 1.5%, is under the 1.7% at which the two allowances would meet; the build refuses 1.8%. Ethanol is 26% from acetone.

**By the engine's tests, over seeds 1 to 100**, with a scripted learner who works from the views alone, waits for three readings running that are the same, and types every entry as text:

| | Least | Most |
| --- | --- | --- |
| Acetone, molar mass against the stored one | −0.31% | +0.38% |
| Ethanol | −0.37% | +0.28% |
| 2-Propanol | −0.50% | +0.50% |
| Urea, count of particles against the stored one | −0.6% | +1.0% |
| Sodium chloride | −0.55% | +0.55% |
| Potassium chloride, sodium bromide | −0.5% | +0.5% |
| Part 2, every value Guided takes for each entry | −0.5% | +0.5% |
| Part 3, every value Guided takes for each entry | −0.6% | +1.0% |

The right liquid is named at every seed, in both modes and by both chains. A careful run takes nine presses at the most by this learner.

**What each error of technique does**, alone, at every seed:

- *Reading before the temperature has levelled off.* A cup strained a press after the solute went in is named for it, and its molar mass is 8.6% to 9.8% high. A solute added a press after the logger is started, and in part 1 a reading entered then, are named as the water not level. A cup that is not stirred never levels within the logger, and no two of its readings running are the same.
- *Letting all the ice melt.* With the lid off the ice is gone within eight presses of starting the logger, and a run that goes on past that is named for it. With the lid off and ice still left, the solution is never level, and a run strained then is named as not level: the lid is how both errors come about. Part 1, which has no solution to thin, levels with the lid off and counts if it is read in time.
- *Weighing without straining.* The run is named for it at every seed; the molar mass is 14.0% to 17.0% low, and urea's count of particles 16% to 20% high.

Guided warns before each: of the lid and the stirrer when the logger is started and when the solute goes in; that the temperature has not levelled, or that no ice is left, when the solute is added, when the cup is strained and when part 1's reading is entered; that little ice is left, at Run on; and that the cup has not been strained, at the balance.

## How each kind of value was read

- **The constant** was read in a Wikipedia article, at the address the site leaves open (`/wiki/Title?oldid=…`), at the revision recorded. The book its table cites for water was not read.
- **The two handbook tables** were read through Wikipedia's data pages, which transcribe them; neither handbook was read. Both pages are ones the measurement and density lab read on the same day: their saved copies were checked against the hashes that lab recorded and read again for the column of freezing temperatures, which that lab did not use, and were not fetched again. So was the article Thermometer.
- **The atomic weights** are the copy the periodic table keeps.
- **The primer's sources** are the article on freezing-point depression, the article on the van 't Hoff factor and the article on the thermometer, with six of the supplier's sheets for its safety card. No page of OpenStax was fetched, and no site's search was used.
- **The hazards** follow the rule of spec 5.2: the default supplier's sheet for each substance, and one or two other documents. Three sheets were read new (isopropyl alcohol, urea, sodium bromide), with NOAA's records of isopropanol and of urea. For acetone, ethanol, sodium chloride and potassium chloride the documents are ones the iodination of acetone, density and flame test labs had read; their saved pages were checked against the hashes those labs recorded and read again, and none was fetched again. Each record is this lab's own: no other lab has the same thing in the same form (acetone there is a 4 M solution, ethanol a 95% liquid in a cylinder, the two chlorides solutions).

## Where the lab is other than spec section 23 has it

- **Part 2 is named "Molar mass of an unknown"**, without the article the spec gives it: with the article the name is six words that a page read for the lab also has, in another sentence, and the no-quotation test would not pass it.
- **The second temperature is the logger's last reading, taken when the cup is strained**, and not any reading of the level stretch. The ice goes on melting slowly after the fall, so the solution that is weighed is the one in the cup at the last reading; an earlier reading of the level stretch belongs to a solution a little stronger. The first temperature is the reading the solute went in after.
- **The mass of water is entered with every figure the balance gave**, five decimals in kilograms, and used so. To three figures it would be half a percent out, a third of what parts acetone from 2-propanol.
- **The lid and the stirrer are not errors of their own.** The spec names three errors of technique. A lid left off and a stirrer left still are how two of them come about, and Guided warns of each by name; a run is named for the error it made.
- **Part 3 stays open once the lab is complete**, so that the other salts can still be tried, as 23.1 has them; parts 1 and 2 are then read and not worked, as the calorimetry lab's are.
- **Two tolerances, not one**: 1.5% for the molar mass and 3% for the count of particles. The first is fixed by acetone and 2-propanol. A count near 1 or 2 has its third figure at a hundredth and comes through four rounded entries.
- **The solute's warmth and its heat of dissolving are left out.** The solute arrives at the cup's temperature and gives or takes no heat. The learner weighs the water the solution ends with, so no result depends on how much ice melted.

## What could not be sourced, or only in part

- **Measured freezing points of solutions of potassium chloride, sodium bromide, urea, acetone and 2-propanol.** None was found in a source that could be read. One web search was made for a transcription of the handbook's table of the properties of solutions; it gave problem sets and teaching pages and no table. The two salts are stored as 2 and the other three as 1, each marked as the ideal.
- **Ethanol's one row** is printed to a whole degree, so it says only that a real solution of that strength is at the ideal to one figure.
- **The freezing point constant** rests on a secondary transcription of a book's table. The same article gives the heat of melting of ice, 333.6 J/g, which with the specific heat of water is where the rounded 80 gram-degrees of one parameter comes from; that figure is a model parameter and cites nothing.
- **Sodium bromide's hazards** rest on the supplier's sheet alone. NOAA's list of names under the letter S, in the copy the clock reaction lab saved on 2026-10-09, has no record of it, and no second supplier's sheet was looked for.
- **Pure ethanol has no sheet of the default supplier's.** Its sheet for denatured ethyl alcohol is used, as in the density lab, and the tile says so.

## What a chemist should look at

- **One count of particles is measured and two are the ideal.** A learner who picks sodium chloride is held to 1.82 and one who picks potassium chloride or sodium bromide to 2.00, though real solutions of those two at this strength give about as much under two as sodium chloride does. The notes say so. A handbook's rows for the two would put this right.
- **1.82 is used at every strength of the bench**, and the liquids' and urea's 1 likewise: the model has no change of the count with strength.
- **The constant is used as it stands** for solutions of 0.4 to 1.0 mol/kg, 2.4% to 6% by mass, where a real solution is no longer dilute.
- **The three liquids are taken as pure and as not evaporating.** Acetone in particular is volatile. Real ethanol and 2-propanol on a shelf hold water.
- **The supplier prints 58.45 and 74.56 g/mol** on its sheets for sodium chloride and potassium chloride; the record has 58.44 and 74.55, from the atomic weights of 2024.
- **The cup settles in about three minutes and a lid-off cup loses 25 g of ice in about seven**: the first is plausible and the second is not, and is there for the lesson.
- **A probe that is off by one amount at every temperature** is what makes part 1 simple. A real probe's error can change over two degrees.
- **The strainer** is taken to hold back all the ice and none of the solution, and the solution to be weighed at once.
- **Whether 1.5% is a fair bar.** A real bench would not tell acetone from 2-propanol this way; the lab can because its cup is ideal. The notes say that the fall has to be good to about 1%.

## Read and not used

- Wikipedia's article on the van 't Hoff factor has no table of measured factors; its opening paragraphs are used for the notes and the primer.
- NOAA's lists of chemical names under the letters I and U, read to find the records of isopropanol and of urea; the site's search was not used.
- The two Wikipedia articles were first fetched at their plain addresses to find their revisions, and then at the pinned addresses the manifest records; the pinned pages are the ones read and fingerprinted.

## Tried and not read

Nothing was refused. No page was asked for at an address that was guessed.

## Read and not kept

Every page and sheet but the periodic table's copy: the manifests give each one's address, what it prints and where, and the hash of what was fetched.

## The engine

`src/engine/freezing/`, on the shared figures of `src/engine/figures.ts`. Nothing was lifted out of the calorimetry lab's engine: the cup's recurrence, the readings to a hundredth of a degree and the stored shape are this lab's own, and the calorimetry lab's files are untouched. The build's checks step a copy of the cup in `scripts/freezing-lib.mjs`, which a test holds to the engine's, reading for reading. The stored record's entry is `lab:freezing-point-depression`, version 1 (`src/freezing-version.test.ts`); it is not among the activities, since the lab has no page. The sentences of the page are in `src/app/lab/freezing/messages.ts`.

## What nobody checked

No person has worked the lab, and no chemistry instructor has read the record, the primer or the notes. The page was built on 2026-10-12 (section 23.7 of the design spec says how, and what was measured on it) and worked by script in one browser by the AI coding assistant that built it; the lab's one deep review has not been held. The hazard notes were written by the AI coding assistant that built the lab, from the documents the manifest lists, and were read by nobody else.
