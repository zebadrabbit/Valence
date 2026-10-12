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
2. **The dry salt's figure in a learner's note.** The note says that magnesium sulfate with no water in its crystal gives out about 85 kJ for each mole, and that a bottle filled with it would turn the run round. The figure is the tables'; that such a bottle might be on a shelf is the lab's own caution.
3. **The size of the two changes.** A fall of 2.7 to 2.9 °C for about 10 g of Epsom salt and a rise of 11.6 to 12.8 °C for about 4 g of calcium chloride, each in 50.0 mL of water, with each solution given water's specific heat. A real solution's specific heat is lower, so a real cup would change a little more.
4. **Calcium chloride and hot water.** A government record tells of the salt added to hot water and of violent boiling. The hazard tile does not say it, because the tile is shown before the run and would say which way this salt's temperature goes. The primer's safety card says, of no salt by name, that only water at room temperature is used, and the part's second note tells of the case once the run counts. Whether that is enough is the owner's to decide.
5. **Epsom salt's hazards.** Both sheets class it as no hazard; the default supplier's section on toxicology still calls it an irritant. The note says both.
6. **The words.** The notebook asks whether "the dissolving" gave heat out or took heat in, and calls it exothermic or endothermic. The pages read use the two words of reactions and of changes; one of them uses them of a heat of solution.

## What was fetched and not used

The current version of each of the three encyclopedia pages, asked for once to learn the number of its revision, before the revision itself was asked for: six requests for three pages, and one for the robots file. Nothing else was fetched. No request was refused.

## Not yet reviewed

The lab's one deep review, by a reviewer who built none of it, has not been held. No chemist or chemistry instructor has read the record, the notes or the primer. The scanned tables were read by one reader, by eye.
