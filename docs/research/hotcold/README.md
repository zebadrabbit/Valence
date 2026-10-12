# Endothermic and exothermic lab research record

The inputs the endothermic and exothermic lab is built from (spec section 26), where each came from, and what could not be found. Everything was gathered on 2026-10-12. Nothing in this folder is loaded by the app.

`npm run build:data` reads this folder and writes `src/chem-data/hotcold/hotcold.json` and the lab's entries in `src/chem-data/sources.json`. The build stops, and writes nothing, on an input it cannot hold to its sources; on a molar mass that is not the sum of its atoms' weights; on an enthalpy that is not the sum of its terms; on a record in which Epsom salt does not take heat in, or calcium chloride or the dry magnesium sulfate does not give it out; on masses whose strength is nearer another row of the tables than the one used; on a portion that is half of what dissolves or more; and on masses that would change the cup by too little to read or take it past 40 °C.

| File | What it is |
| --- | --- |
| `hotcold.json` | The lab's record: the two salts, each with what it is, its composition, its molar mass worked out from the atomic weights, what it looks like and how much of it dissolves; the water; the atomic weights; the three parts, the two runs each with the enthalpy the model runs on, the row of the tables it is worked from and the notes shown when the run counts, the first with the dry magnesium sulfate's figure that its note gives; and the model's parameters, each with its rationale |
| `sources/MANIFEST.json` | Every source of that record and of the primer (`src/chem-data/hotcold/primer.ts`): its address, its citation, the hash of the page as read, and rows that say what it prints and where, each naming the stored values it supports |
| `hazards.json` | The hazards of the two salts: the heading over each one's statements, the signal word, the statements and the note for this bench |
| `sources/hazard-manifest.json` | The five documents behind those hazards, with rows that say what each prints, and what was read and not carried |
| `sources/quotation-fingerprint.json` | Not kept in the repository (`.gitignore`): the hashes of every run of six words in the pages read, which the no-quotation tests compare against. Made with `node scripts/fingerprint-sources.mjs <folder of the pages> 2026-10-12 docs/research/hotcold/sources`; where it is absent those tests are skipped |

## The values as stored

Every enthalpy of formation is from the NBS tables, in kJ/mol at 298.15 K, with the digits the table prints.

| Value | Stored | From |
| --- | --- | --- |
| Heat of solution of Epsom salt, at the bench's strength: what the model runs on | +17.56 kJ for each mole | MgSO₄ in 75 H₂O (−1370.34) + 7 × H₂O(l) (−285.830) − MgSO₄·7H₂O(cr) (−3388.71) |
| The same at endless dilution, used by no model | +11.78 kJ/mol | MgSO₄(ai) (−1376.12) + 7 × H₂O(l) − MgSO₄·7H₂O(cr) |
| Heat of solution of calcium chloride, at the bench's strength: what the model runs on | −77.689 kJ for each mole | CaCl₂ in 75 H₂O (−873.489) − CaCl₂(cr) (−795.8) |
| The same at endless dilution, used by no model | −81.33 kJ/mol | CaCl₂(ai) (−877.13) − CaCl₂(cr) |
| Heat of solution of magnesium sulfate with no water in its crystal, at the same strength: for a note, used by no model | −85.44 kJ for each mole | MgSO₄ in 75 H₂O − MgSO₄(cr) (−1284.9) |
| The same at endless dilution | −91.22 kJ/mol | MgSO₄(ai) − MgSO₄(cr) |
| Molar mass of Epsom salt, MgSO₄·7H₂O | 246.47 g/mol | 24.305 + 32.06 + 11 × 15.999 + 14 × 1.0080 = 246.466, from the standard atomic weights the periodic table holds |
| Molar mass of calcium chloride, CaCl₂ | 110.98 g/mol | 40.078 + 2 × 35.45 = 110.978 |
| Solubility of Epsom salt | 710 g/L at 20 °C | a second supplier's sheet for the heptahydrate |
| Solubility of calcium chloride | 740 g/L at 20 °C | a second supplier's sheet for the anhydrous salt |
| Specific heat and density of water | 4.18 J/(g·°C), 1.00 g/mL | the NIST page the calorimetry lab reads: 4.1813 and 0.99705, stored to three figures |

The two crystals with no water are printed to one decimal, so the figures for calcium chloride and for the dry magnesium sulfate are good to a tenth of a kilojoule; the sums are stored with the table's own digits, as the calorimetry lab's are.

**Why the row for 75.** A row of the tables such as "in 75 H₂O" is one mole of the dissolved salt in that many moles of water. 50.0 mL of water is 2.775 mol. Over the masses a run can have, calcium chloride (3.80 to 4.20 g) is one mole in 73.3 to 81.1 moles of water, and Epsom salt (9.60 to 10.40 g) one mole of magnesium sulfate in 72.8 to 78.3, counting the seven waters each unit of the crystal brings. The rows printed are for 50, 75 and 100, and 75 is the nearest at every mass; the build checks it. Taking the rows on either side would move Epsom salt's figure by +0.46 or −0.30 kJ/mol and calcium chloride's by 0.58 or 0.34.

**Why Epsom salt's two figures are so far apart.** At the bench's strength the tables give +17.56 kJ/mol and at endless dilution +11.78: by the tables, a solution of magnesium sulfate goes on giving out heat as it is diluted, 5.8 kJ/mol between 75 moles of water and endlessly many. A figure quoted for this salt elsewhere may be either, or one between; none was read.

## The model's parameters

Each has its rationale in the record. The cup's are the calorimetry lab's, unchanged: a reading every 15 seconds; 30 seconds to a press of Run on; 240 steps at the most; 85% of the change still to come in a stirred step and 15% in an unstirred one; 0.5% of the difference from the room lost in a step with the lid on and 4% with it off; a start of 20.0 to 24.0 °C; a typed temperature held to the logger's own. This lab's own are the two ranges of mass (9.60 to 10.40 g of Epsom salt; 3.80 to 4.20 g of calcium chloride), the least change a careful run may show (2.0 °C) and the highest temperature a cup may reach (40.0 °C).

Over seeds 1 to 100, by the engine's own readings (`src/engine/hotcold/acceptance.test.ts`):

| | Epsom salt | Calcium chloride |
| --- | --- | --- |
| Careful run | falls 2.7 to 2.9 °C | rises 11.6 to 12.8 °C, to 36.4 °C at the most |
| Lid off | falls 2.5 to 2.7 °C | rises 10.7 to 11.8 °C |
| Stirrer still | falls 2.5 to 2.6 °C | rises 10.6 to 11.6 °C |

A careful run counts at every seed in both modes and either order. A run with the lid off or the stirrer still does not count at any seed: that is a rule of the lab (spec 26.2) and not a tolerance, since this lab asks for no figure that a tolerance could be set on. The numbers above are what the error does to the reading.

## How each source was read

- **Enthalpies of formation.** The NBS tables, from the scanned PDF that NIST serves, in the copy the aqueous reactions lab read (its sha256 is in the manifest). The scan has no text layer: each page was turned into an image and read by eye, and each figure the record stores was read twice, from two images of the page made at different sizes. Pages read: 2-38 (hydrogen, for liquid water), 2-262 and 2-263 (magnesium), 2-267 and 2-268 (calcium). Page 2-260, the first of the magnesium table, was opened to find the place.
- **Atomic weights.** The periodic table's record, which the build holds to the kept copy of the table of standard atomic weights.
- **Water.** The NIST page the calorimetry lab reads; the saved page was checked against its recorded hash and not fetched again.
- **What Epsom salt is, and packs.** Three pages of an encyclopedia, fetched on 2026-10-12, each at the address of one revision: on magnesium sulfate, on ice packs and on heating pads. Its robots file was read first, through a browser that says what it is; it closes the `/w/` addresses and the pages were read at `/wiki/` addresses only. All three are secondary sources. The page on heating pads carries a notice that it needs more references.
- **Solubility.** Two sheets of a second supplier that the red cabbage pH lab and the flame test lab had read; each saved file was checked against its recorded hash and not fetched again.
- **The primer's ideas.** Seven pages the calorimetry lab's primer rests on, each checked against its recorded hash and read again in its saved copy.
- **Hazards.** Five documents, none fetched for this lab. The default supplier's sheet for calcium chloride, a second supplier's sheet for it and a government record of it are the flame test lab's; the second supplier's sheet for Epsom salt is the red cabbage pH lab's. The default supplier's sheet for Epsom salt (magnesium sulfate heptahydrate) was fetched on 2026-10-12 by the builder of the red cabbage pH lab, whose record does not cite it: the saved page was checked against the hash in the log of that fetch and read for this lab. Its site was not asked for anything.

## What could not be sourced, or was not read

- **That either salt is used in a pack that is sold.** The page on heating pads names calcium chloride dissolving as its example of a pack that mixes. The page on ice packs names ammonium nitrate, calcium ammonium nitrate and urea, and not magnesium sulfate. So part 3 asks only what the two runs showed, of these two salts, and its note says that the cold packs that are sold use other solids.
- **A second source for either enthalpy of solution.** Each rests on the tables alone.
- **How the tables define a row at a stated dilution.** The tables' introduction was not read, as it was not for the calorimetry lab.
- **How fast either salt dissolves.** The model has a stirred cup within a part in a thousand of its end after a minute, which is the calorimetry lab's parameter. Epsom salt in large crystals may take longer; no source was read.
- **The specific heat and the density of either solution.** Each is given water's, as an idealisation. Calcium chloride's solution is about 7% salt by mass and Epsom salt's about 8% magnesium sulfate.
- **The temperature at which water scalds.** The record's 40 °C is the lab's own limit, a little over the temperature of the body.
- **Whose litre the two solubilities are for.** Each sheet prints grams for each litre and does not say whether of water or of solution. The bench's most is under a third of one figure and under an eighth of the other.
- **The purity of a real bottle.** Dry calcium chloride takes up water from the air, by its sheets, and a bottle that has done so gives out less heat for each gram. Calcium chloride is also sold with water in its crystal. The tables print rows for those crystals (page 2-268); they were not read twice and nothing rests on them.

## What a chemist should look at

1. **The two sums, and above all Epsom salt's.** Whether a heat of solution at one mole in 75 moles of water, with the crystal's seven waters counted as liquid water that joins the solution, is rightly worked as the record has it; and whether +17.56 kJ/mol is believable for this salt at about 0.7 mol for each kilogram of water, beside the +11.78 at endless dilution.
2. **The dry salt's figure in a learner's note.** The note says that magnesium sulfate with no water in its crystal gives out about 85 kJ for each mole, and that a bottle filled with it would turn the run round. The figure is the tables'; that such a bottle might be on a shelf is the lab's own caution. The note does not say how much warmer: by the same figure, about 28 °C for 10 g in this cup (the review's arithmetic, in the last section).
3. **The size of the two changes.** A fall of 2.7 to 2.9 °C for about 10 g of Epsom salt and a rise of 11.6 to 12.8 °C for about 4 g of calcium chloride, each in 50.0 mL of water, with each solution given water's specific heat. A real solution's specific heat is lower, so a real cup would change a little more.
4. **Calcium chloride and hot water.** A government record tells of the salt added to hot water and of violent boiling. The hazard tile does not say it, because the tile is shown before the run and would say which way this salt's temperature goes. The primer's safety card says, of no salt by name, that only water at room temperature is used, and the part's second note tells of the case once the run counts. Whether that is enough is the owner's to decide.
5. **Epsom salt's hazards.** Both sheets class it as no hazard; the default supplier's section on toxicology still lists irritation and pain in the abdomen as acute effects. The note says both.
6. **The words.** The notebook asks whether "the dissolving" gave heat out or took heat in, and calls it exothermic or endothermic. The pages read use the two words of reactions and of changes; one of them uses them of a heat of solution.

## What was fetched and not used

The current version of each of the three encyclopedia pages, asked for once to learn the number of its revision, before the revision itself was asked for: six requests for three pages, and one for the robots file. Nothing else was fetched. No request was refused.

## What nobody checked

No person has worked the lab. No screen reader was used. One browser, headless Chromium on Linux, and no real device. No chemist or chemistry instructor has read the record, the notes or the primer. The scanned tables were read by eye by the builder, each figure twice, and four of the eight rows again by the reviewer; by nobody else.

## The review of 2026-10-12

Held that day, when the page was whole, by an AI reviewer that had built none of the lab, by script in headless Chromium on the production build and by reading. No stored value, parameter, outcome or answer was changed.

### Two changes the owner had decided on

- **The hint under an entry that is chosen has its room in the calorimetry lab and the freezing point depression lab.** Measured at 768 by 1024 and at 1280 by 800, on the calorimetry lab's entry for which way the heat went and on the freezing point depression lab's entry that names the liquid, the two pages the same to the pixel. Before: the hint's line 18 px under "Enter"; with the hint closed every point of the button answered for itself; with it open the lowest 7 of its 44 rows of pixels, 133 of the 836 points asked, answered for the hint. After: the line 30 px under the button, and no point of "Enter" answering for anything else, closed or open. Each page is 12 px longer while such an entry waits in Guided. A test of each page holds the room; none had held the page without it. Every page that draws the shared worksheet now asks for the room, so it could be the worksheet's own: left as a thing a lab asks for, as decided.
- **The documents say that the review was held,** by whom and how, what it found and did, and what nobody checked: this section, the design spec (section 14 and the last points of 26.6, 16.7 and 23.7), the page for institutional reviewers and the README.

### Found by using the page, and put right

- **Nothing said that the notebook had opened.** It opens under the graph when the curve has turned back, on a press of "Run on". As it opened, the notebook's card began 1,205 px down a window of 1,024 px at 768 by 1024, 1,119 px down one of 800 px at 1280 by 800 and 761 px down one of 768 px at 1366 by 768; focus stayed on "Run on"; and no line that a screen reader is given changed. The one sign in the window was the last point a tenth of a degree nearer the level: 4 px on Epsom salt's axis and about 1 px on calcium chloride's. A line under "Run on", always there and empty until then, now says "The curve has turned back: the notebook is open, under the graph." until the first entry is made, in both modes. It is in the window at each of the three sizes, "Run on" does not move, and the graph's card is 20 px longer while the line is said and as long as it was otherwise.
- **The primer's first card** said that the two cards not marked to read first "can wait until the bench sends you to them". Nothing on this bench sends a learner to the primer. It now says that they are for the notebook's fifth entry and for part 3.
- **Epsom salt's hazard note** said that the supplier's section on toxicology "calls it an irritant that brings pain in the abdomen". The sheet lists two acute effects, irritant and abdominal pain, and does not join them. The note now says that it lists the two.
- **A comment and a test's title** said that no example under a field is a figure a run can have. The example temperature, 18.6, is one no run starts at, and it can be the lowest reading of a run of Epsom salt by chance. They now say what the test holds.

### Looked at and left, for the owner or a chemist

1. **A hazard statement is held back so as not to give the answer.** The default supplier's sheet says in four words that calcium chloride gives out heat in water, and NOAA's record tells of the salt put into hot water, which boiled violently. Neither is on the tile, which is shown before the run. The primer's safety card, marked to read first, gives the caution of no salt by name, and the part's second note names the salt once the run counts. This is a safety statement kept from the place a learner looks for hazards, for the sake of the exercise; it is the owner's to rule on, and the review left it as built.
2. **A bottle of the dry salt would do more than turn part 1 round.** By the stored −85.44 kJ/mol and the molar mass the tables print for MgSO₄ (120.37 g/mol, which the record does not store), 10 g of magnesium sulfate with no water in its crystal is 0.083 mol and gives out about 7.1 kJ; in a cup of 60 g at water's specific heat that is a rise of about 28 °C, to about 50 °C, past the 40 °C this lab holds its own cups to. The note says "the cup would get warmer, not colder". The reviewer's arithmetic, by hand; whether the note should say how much warmer is for the owner and a chemist.
3. **The links of the lists of sources lead to pages that say which way.** The page itself says of neither salt which way its temperature goes before its run counts: in Challenge, on each salt's page before the salt and as it went in, on part 3 before it opens and on the Record tab, the text, what is inside closed disclosures and the names of the controls were searched and nothing was found; the primer names the salts on its safety card alone, and lists its sources by card. But calcium chloride's tile links to the supplier's sheet, which prints it, and the primer's card on packs links to the page on heating pads, which names calcium chloride. A learner who follows a link can read it. It cannot be closed without dropping a citation.
4. **Calcium chloride's turn cannot be seen by eye.** See "The two graphs" below.
5. **How many presses of "Run on" a run takes after the salt,** over seeds 1 to 100, by the engine: two to six for a careful run of Epsom salt and two or three for calcium chloride, the points level meanwhile; twelve to eighteen for a cup that was not stirred, and six to nine with the lid off as well. None is a dead end, and the new line says when to stop.
6. **The card "Where the heat goes" is not among the four to read first,** and it is the one that teaches against the commonest mistake, that a cup which turned cold "gave heat out". Guided's hint at the fifth entry says it; Challenge has no hint.
7. **Part 3's second note says "a solid that takes heat in",** where everywhere else it is the dissolving that takes heat in. The primer says the same of solids once. Every other sentence about direction says whose heat goes where: the water gains or loses it, the dissolving gives it out or takes it in.
8. **Guided's warning of a lid left off** says that the highest or the lowest temperature "will be further from the true one". It does not say what the true one is; the part's third note says it better, as what a cup with no leak would reach.
9. **In Challenge the field for the highest or the lowest temperature opens only once a reading that shows it has been looked at,** as in the calorimetry lab, so a learner cannot enter that temperature from another point. And the mode can be changed in the middle of a notebook, which shows which entries follow. Both are the calorimetry lab's rules.
10. **A button that cannot be used now is drawn at half strength,** 3.7 to 1 in the light theme: the shared button.
11. **The words.** Item 6 of "What a chemist should look at" stands: the notebook calls the dissolving exothermic or endothermic.

### Read and worked again, and found sound

- **The three enthalpies, by hand from the stored rows,** each at the bench's strength and at endless dilution: −1370.34 + 7 × (−285.830) + 3388.71 = +17.56 and −1376.12 − 2000.81 + 3388.71 = +11.78; −873.489 + 795.8 = −77.689 and −877.13 + 795.8 = −81.33; −1370.34 + 1284.9 = −85.44 and −1376.12 + 1284.9 = −91.22. In the builder's images of the scanned tables the reviewer read again MgSO₄ in 75 H₂O (−1370.34, with −1369.88 for 50 and −1370.64 for 100), MgSO₄·7H₂O (−3388.71), CaCl₂ in 75 H₂O (−873.489, with −872.91 and −873.824) and CaCl₂ in endlessly much water (−877.13). The other four rows were not read again.
- **The strength.** 50.0 g of water is 2.775 mol; 10.40 and 9.60 g of Epsom salt make one mole of magnesium sulfate in 72.8 and 78.3 moles of water with the crystal's seven counted, and 4.20 and 3.80 g of calcium chloride one mole in 73.3 and 81.1.
- **One seeded run of each salt, seed 7.** 9.65 g of Epsom salt is 0.03915 mol and takes in 687.5 J; the cup holds 59.65 g, 249.3 J for each degree; 2.76 °C with no leak. The logger starts at 20.0 and reads 17.7 and then 17.3 at its lowest: a fall of 2.7 °C. 4.08 g of calcium chloride is 0.03676 mol and gives out 2,856 J; 54.08 g, 226.1 J for each degree; 12.63 °C with no leak. The logger starts at 24.0 and reads 34.7, 36.2 and 36.4 at its highest: a rise of 12.4 °C.
- **The table of this record over seeds 1 to 100,** worked again from the engine: each figure is as given.
- **Every sentence a learner sees:** the primer, the labels, the hints, the warnings, the refusals, the outcomes, the notes and the two hazard notes. The hazard text and the notes were read against the lines they rest on in the five saved hazard documents and the three encyclopedia pages. The seven pages behind the primer's first four cards were not read again.
- **The code:** the actions, the stored shape and seven stored records that do not fit (a status the record does not give, a run whose index is not its place, an answer to part 3 before the runs, a notebook checked with no entry, a step past the logger's last, not a record, a key too many), each of which the page set aside and kept, offering Start; the one door for the engine, tried with a file that reached past it three ways; and the lab's nine files of tests, 282 tests as the runner counts them, none of which asserts nothing.
- **The two things the builder changed outside the lab.** The two lines of the calorimetry lab's engine are types alone. The shared worksheet's room is drawn only where it is asked for. The calorimetry lab was worked by the keyboard alone as far as its fifth entry, four typed and one chosen, and the freezing point depression lab's chosen entry was made by the keyboard alone: a first choice refused, the second taken, the run counted.

### The two graphs

Seven pictures were looked at, one of the builder's and six of the reviewer's own: Epsom salt's graph at both sizes in the light theme, and calcium chloride's at both sizes in the dark and at 768 px in the light. The builder had looked at eight of its seventy-two; the rest have been looked at by nobody. Epsom salt's axis runs over five degrees, about 40 px for each: the level stretch, the fall of under three degrees and the lowest reading are plain, and the turn, a tenth of a degree, is 4 px and can just be seen. Calcium chloride's runs over sixteen degrees in marks of two, about 12 px for each: the level stretch and the rise are plain, and the turn is not, since the highest reading and the ones on either side of it are 1 or 2 px apart. There the highest is found by looking at the points one by one, with the two buttons under the graph or the arrow keys, and Guided refuses a temperature a tenth off. A reading is never printed beside the graph, so both are read from a point's callout.

### What was run and measured

- **A whole lab in Guided by the keyboard alone, in each order of the two salts:** Epsom salt first at 768 by 1024 in the light theme, 751 presses, and calcium chloride first at 1280 by 800 in the dark, 1,311. Every control was reached with Tab and none given focus by the script; the choice boxes were chosen with Space and the arrow keys. On the way: Guided's warning answered both ways, a run with the stirrer still, the part run again, a temperature a tenth off, a change with the wrong sign and of the wrong size, each wrong choice, part 3 wrong and then right, a reload. The browser reported no error.
- **A whole lab in Challenge by emulated touch, in each order,** at 768 by 1024 in both themes: the lid off and the stirrer still with no warning, a notebook checked with a temperature a tenth off and a wrong choice left in it, the part run again, entries changed, part 3 wrong, checked, and answered again.
- **Both again on the page as the review left it,** with the builder's own whole lab in Guided: every length the builder gives at 768 by 1024 came out as given, but for the page as the notebook opens, 1,875 px where it was 1,855 px.
- **Focus** after each action and each warning: on the warning as it is raised, on the step skipped after "Go back", on the cup's line as the salt goes in, on "Run on" through every press, on how the run came out when the notebook is checked, on the part's heading after "Run this part again" and "Answer again", on the line that says how part 3 stands when it is checked.
- **Contrast of every text,** from the computed colours on eight states at both sizes in both themes: 4.5 to 1 or more, but for the name of a button that cannot be used now.
- **What is pressed,** with the builder's script, on six states at both sizes with each disclosure open in turn: no control answered for another, and none was under 44 px either way, the links of an open list of sources and the columns over the graph's readings apart.
- **Names and roles, motion, Restart, a full logger, a change of mode in the middle, a narrow window:** as the page for institutional reviewers has them.
- **Pictures.** The twenty that the review's changes altered were taken again: the page as the notebook opens, the graph with a point looked at, and the primer, at both sizes in both themes.
