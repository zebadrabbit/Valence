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

Guided warns before each: of the lid and the stirrer when the logger is started and when the solute goes in; that the temperature has not levelled, or that no ice is left, when the solute is added, when the cup is strained and when part 1's reading is entered; that little ice is left, at the first press of Run on made with little left, once in a run; and that the cup has not been strained, at the balance.

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

`src/engine/freezing/`, on the shared figures of `src/engine/figures.ts`. Nothing was lifted out of the calorimetry lab's engine: the cup's recurrence, the readings to a hundredth of a degree and the stored shape are this lab's own, and the calorimetry lab's files are untouched. The build's checks step a copy of the cup in `scripts/freezing-lib.mjs`, which a test holds to the engine's, reading for reading. The stored record's entry is `lab:freezing-point-depression`, version 1 (`src/freezing-version.test.ts`), and the lab is the eleventh of the activities. The sentences of the page are in `src/app/lab/freezing/messages.ts`.

## What nobody checked

No person has worked the lab, and no chemistry instructor has read the record, the primer or the notes. The page was built on 2026-10-12 (section 23.7 of the design spec says how, and what was measured on it) and worked by script in one browser by the AI coding assistant that built it. The lab's one deep review was held on 2026-10-12 by an AI reviewer that had built none of it; the section below is its record, and says again at its end what nobody checked. The hazard notes were written by the AI coding assistant that built the lab, from the documents the manifest lists; the review read them as a learner sees them and held three sheets' worth to their saved documents, and no person has read them.

## The review of 2026-10-12

The one deep review of the phase, held when the screens were whole, by an AI reviewer that had built none of the lab: not the record, the hazards, the engine, the wording or the page. It worked by script in headless Chromium and by reading, on 2026-10-12 by the machine's own clock. It made the changes the project's owner had decided on, worked the lab from Start to the line that says it is complete in each mode, and put right what it found in the same pass. It changed no stored value and no parameter of the model. The page as it now is, is section 23.7 of the design spec.

### The changes the owner had decided

1. **The bench, the cup and the straining fold once the solution is weighed.** Each is then its heading over a closed disclosure whose summary says it in one line: the two masses the balance read; that the cup was poured through the strainer, or left as it was; that it was strained and weighed, or weighed without straining, with the reading. Everything each held is still in it, the graph and the notebook stay open, and the bench's figures stay at the notebook's head. Measured at 768 by 1024, in Guided, before and after:

   | Stage of a run of part 2, of part 3 with urea, of part 3 with sodium chloride | Before | After |
   | --- | --- | --- |
   | The cup level, before the strainer | 2,381, 2,394, 2,484 px | 2,331, 2,394, 2,434 px |
   | Strained | 2,403, 2,416, 2,506 px | 2,353, 2,416, 2,456 px |
   | Weighed, the first entry waiting | 3,097, 3,090, 3,180 px | 2,268, 2,268, 2,288 px |
   | The eighth entry waiting | 3,543, 3,494, 3,584 px | 2,714, 2,672, 2,692 px |
   | The run finished | 3,003, 3,068, 3,198 px | 2,246, 2,246, 2,326 px |

   Part 1 is 1,894 px finished, before and after: it weighs nothing and folds nothing. The press that weighs is made in the straining's card. As the cards fold the window is scrolled by as much as that card moved, and focus goes to its line: the card's top stood at one place in the window in every run worked (584 to 584 px, 628 to 628, 588 to 588 by the keyboard; 848 to 848 and three more by emulated touch; 492 to 493 at 1280 by 800). Before the change that card moved 44 px down as the bench took its line for the solution. Nothing was found that the fold broke.
2. **Part 2's cup and graph are inside one screen.** The fifth step of the cup took a third row in part 2 and in part 3 with a salt: 463 px of row, and the stirrer's and the logger's steps beside the solute's came to 510. The stirrer's step is now "Stir", which is what the calorimetry lab calls it: three steps take 430 px of the first row and two the second, in every part. The cup's card is 328 px and the two cards 924 px, where 959 px are under the tab bar.
3. **Run on warns of little ice once in a run.** The engine names the warning at the first press made with 5 g of ice or less, the press whose reading before it had more, and at no press after. Nothing is stored of a warning, so a press that is not made is asked about again, and so is the first press after a reload.
4. **The Record tab has its own sentence** for a run with an entry that does not follow, which no longer sends the reader to the marks of a notebook the Record does not show.
5. **The storage list of the page for institutional reviewers** has the red cabbage pH lab's entry and the measurement and density lab's, each written from the lab's own stored shape.
6. **The documents say that the review was held,** in each place that said none had been.

### What the review found, and what was done

- **The cup's words said that ice was in a cup and that none was left, in one line** (changed): "Ice, water and the unknown liquid are in the cup. No ice is left." And a cup with no ice, weighed unstrained, was "weighed with the ice in it". Seen in the browser with the lid left off. A cup with no ice is now said to hold water, and such a cup to have been weighed without straining; the warning and the reason of an unstrained cup say that any ice in it is counted as water. A test holds the words of a cup with no ice, with and without the solute.
- **Two sentences of the second temperature said the cup had been strained when it might only have been weighed** (changed): Guided's hint and its refusal. Read in the wording. They say strained or weighed, as the graph's key does.
- **A notebook filled in Challenge could not be checked once the mode was Guided** (changed): every entry made and marked, "Not checked yet" under them, and no button, since Guided checks at the last entry. Made in the browser. A learner could get out by changing the last entry and making it again, and was told none of that. The shared worksheet now offers the button in Guided where every entry is made and the list is not checked, which is that case alone; the calorimetry lab's page has it too. A test holds it.
- **As the solution was weighed, everything under the bench moved 44 px** (changed with the fold): the bench took a line. Measured in the browser. The fold holds the card under the hand where it was.
- **The research record said the lab was not among the activities, since it had no page** (changed): it is the eleventh.
- **What is animated with reduced motion asked for** was taken again through six actions (Run on, a look, the solute, Run on, a disclosure, the Tab key), since a count taken at rest would miss a press: the stirrer does not bob, and every transition is a hundredth of a millisecond long. Nothing to change.

### Can the graph be read?

A fall of one to two degrees is 37 to 80 units of a picture 280 units tall, and its first step alone 26 to 58, as the builder's tests have it over seeds 1 to 100; the review did not measure them again. In the pictures it looked at, the fall and the two level stretches are plain at a glance, in both themes. The line through the points is thin and is not what is read (3.71 to 1 against the card in the light theme, 5.09 in the dark); the points are (19.8 and 17.2).

What cannot be seen is the last few hundredths. Worked from the model's parameters and not measured on the page: a stirred cup goes 70% of the way at each reading, so the third reading after the solute is still 0.03 to 0.05 of a degree from where the cup settles, one or two units of the picture, and looks level. So the picture says roughly when to stop pressing Run on, and the callouts say exactly: the review's scripted learner looked at the last three readings after each press and stopped when they read the same, by the arrow keys and by touch, and every one of its thirteen runs with a solute counted. The primer, the hint and Guided's warning all give that rule. Challenge gives no warning, and a learner there who goes by eye alone will strain a reading or two early and be told the temperature was still changing; that is the lesson and was left.

The reading the notebook wants first is the point just left of the dashed mark, which is how the review's learner found it and is what the entry's label says. The dotted mark stands just right of the last reading, inside the ring drawn about that reading when it is looked at; it adds little, since the last reading is the last point, and it does not mislead. Left as it is.

The graph in words gives the first reading, the reading the solute went in after, the lowest since, the last, and whether the last three were the same, each with its time. That is what a learner who cannot see the picture needs to decide when to add the solute and when to strain, and the two readings the notebook asks for; each must still be looked at through its own button, which has a name and says its reading in a status line. No screen reader was used to hear it.

### Looked at and left

- **Part 1 says two things of a reading taken too soon:** that the cup had not levelled off, and that "the result is too far from the figure the lab holds". The second is true and adds nothing there, since the figure is the probe's own reading in ice and water.
- **A tile's note still says "The unknown liquid may be this"** once the unknown is named and one tile is left under a heading that says which it was.
- **2-Propanol's formula is written C₃H₈O** beside C₂H₅OH and CH₃COCH₃. It is right, and is a stored value.
- **"A few of its ions are paired"** is the primer's and the notes' reason for a salt's count under two. The source says it. A chemist may want the weaker pull between ions said instead; see below.
- **The second entry of the notebook is not in one screen with the graph's picture** at 768 by 1024: 1,017 px, where the builder measured 1,047. The first entry is: 863 px.
- **At 1280 by 800 the cup's card and the graph's are 932 px** in part 2, where 735 px are under the tab bar.
- **The words of a button that cannot be used now** are 3.71 to 1 in the light theme.
- **The links in a list of sources** are 31 px tall where a citation is one line.

### What was read and worked again, and found sound

- **The primer's two worked examples** and its two small ones, by hand: 2.79 ÷ 1.86 = 1.50, 1.50 × 0.0800 = 0.120, 6.00 ÷ 0.120 = 50.0; 14.0 ÷ 160.0 = 0.0875, 0.0875 ÷ 0.125 = 0.700, 1.86 × 0.700 = 1.30, 2.47 ÷ 1.30 = 1.90, and 1.897 unrounded; 0.0500 ÷ 0.125 = 0.400; 82.46 − 7.10 = 75.36.
- **One seeded lab by hand,** from its readings and weighings as the page showed them: 0.05 and −1.49 °C, 3.77 g in 102.75 g, gives 1.54 °C, 0.09898 kg, 0.828 mol/kg, 0.0820 mol and 46.0 g/mol, which is ethanol's and 0.2% under it; urea 5.59 g in 106.25 g with −1.67 °C gives 1.00; sodium chloride 2.84 g in 105.36 g with −1.55 °C gives 1.81, 0.5% under 1.82. The page said the same of each.
- **The seven molar masses** from the eight atomic weights; the three measured rows against the saved pages (−1.19 and −1.79 °C for sodium chloride, −1 °C for ethanol at 2.5%); 1.82 and the 1.83 beside it; the notes' −1.04 and −1.97 °C; the constant in the saved article; and the article's sentence on paired ions.
- **Every sentence a learner sees:** the primer, the labels, the hints, the warnings, the refusals, the outcomes, the notes and the seven hazard notes. No sentence was found that gives the ideal as measured or the measured as the ideal: each of the seven things says which its count is.
- **What tells the unknown.** The three liquids' notes and tiles are in the same words and carry no amount of their own; the folded lines differ only in the balance's figures, which a test holds over eight seeds; the Record shows what was typed and nothing held back. The builder's test of the page's markup at twelve seeds passes on the page as folded.
- **The hazards of the three sheets read new** (2-propanol, urea, sodium bromide) and of two of NOAA's records, against the saved copies: the signal words, the statements and what the notes say of each.
- **The code:** the page takes what a result is held to from the view's `expected` and reads nothing of the model but the logger's step and how many readings a press makes; the lint door has `engine/freezing`; a stored record that did not fit was set aside in the browser three ways (a status the runs do not give, a step the logger had not reached, another version); every one of the lab's 225 tests makes an assertion, and none is skipped but those that want the fingerprint, which was there.

### What was run and measured

- **Four whole labs,** each from Start to complete: Guided by the keyboard alone at 768 by 1024 in the light theme, before the changes and after, and at 1280 by 800 in the dark theme; Challenge by emulated touch at 768 by 1024. Part 3 to its end with sodium chloride twice, potassium chloride twice and sodium bromide once. A reload after each. Run on stood at one place at every press.
- **What goes wrong:** the builder's script again on the page as it now is (the lid, the stirrer, a reading taken too soon, the ice melted, weighing unstrained, wrong entries, Run again, the change of mode), and beside it the warning of little ice, the wrong liquid named in each mode, the record that does not fit, Restart, and the notebook left full across a change of mode. Focus after each warning and each way out of it was where the page's design says.
- **Hit areas,** point by point at both sizes on six states with every disclosure open in turn, those inside another among them: none answered for another control; 4 px the least room.
- **Names:** no control without one on three states. **Contrast,** from the colours the browser computed, in both themes: text 4.74 to 1 at the least in the light theme and 6.94 in the dark; the graph's points and marks 19.8 and 17.2, its line 3.71 and 5.09; a cube of ice against the liquid 13.9 and 10.7. **The ice without colour:** six cubes, two, none, with the words beside them. **Motion:** as above.
- **The calorimetry lab:** part 1 to its end by the keyboard alone, with every reading of its graph walked; the run counted.
- **Pictures:** forty retaken and four new; seven looked at, two of them the builder's.
- **The whole check,** with 6,084 tests and 2,295 skipped for want of the other labs' fingerprints; the data scripts changed no file.

### What nobody checked

- **No person** has worked the lab, by hand, keyboard or touch, and how it looks is the owner's to judge.
- **No screen reader.** What is announced is known from the markup and from where focus went.
- **One browser,** headless Chromium on Linux, and **no real device:** no tablet, no touch screen, no other browser's scrolling as the cards fold.
- **No chemistry instructor** has read the record, the primer, the notes or the hazard notes. For one to decide: whether paired ions is the reason to give for a count under two; whether two salts held to the ideal beside one that is measured is fair to a learner who picks them; and the points under "What a chemist should look at".
- The documents four of the hazard notes share with earlier labs were not read again, and nothing was fetched.
- The page with its text enlarged, at 200% zoom, in a high-contrast mode, or at a width between the two tried.
