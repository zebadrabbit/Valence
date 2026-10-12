# Polarity and mixing lab research record

The inputs the polarity and mixing lab is built from (spec section 25), where each came from, and what could not be found. Everything was gathered on 2026-10-12. Nothing in this folder is loaded by the app.

`npm run build:data` reads this folder and writes `src/chem-data/mixing/mixing.json` and the lab's entries in `src/chem-data/sources.json`. The build stops, and writes nothing, on an input it cannot hold to its sources; on a pair of liquids or a solid in a liquid that is neither on the bench with a source nor listed as left off it; on two liquids that make layers whose stored densities are too near to say which floats; and on a link to a molecule the explorer's library does not hold.

| File | What it is |
| --- | --- |
| `mixing.json` | The lab's record: the one bottle that is a laboratory chemical; the five liquids, each with what it holds, what it looks like, its density, its family for the rule and the molecule it links to; the two solids; the nine pairs of liquids and the eight solids in liquids on the bench, each with its outcome, what the outcome rests on and the note shown when its tube counts; the three left off the bench, with why; part 3's two questions; the three parts with the notes shown when each is done; and the model's parameters, each with its rationale |
| `sources/MANIFEST.json` | Every source of that record and of the primer (`src/chem-data/mixing/primer.ts`): its address, its citation, the hash of the page as read, and rows that say what it prints and where, each naming the stored values it supports |
| `hazards.json` | The hazards of the rubbing alcohol: the heading over its statements, the signal word, the statements and the note for this bench |
| `sources/hazard-manifest.json` | The two documents behind those hazards, with rows that say what each prints, and what was read and not carried |
| `sources/quotation-fingerprint.json` | Not kept in the repository (`.gitignore`): the hashes of every run of six words in the pages read, which the no-quotation tests compare against. Made with `node scripts/fingerprint-sources.mjs <folder of the pages> 2026-10-12 docs/research/mixing/sources`; where it is absent those tests are skipped |

## The liquids as stored

| Liquid | On the bench as | Density, g/mL | Temperature | Family | Looks | Molecule linked |
| --- | --- | --- | --- | --- | --- | --- |
| Distilled water | water | 0.99821 | 20 °C | water | no colour (the lab's own) | water |
| Rubbing alcohol | 2-propanol, about 70% by volume, in water | 0.87 | none printed | water | no colour | none: the library holds no 2-propanol |
| Vinegar | 4% to 8% acetic acid in water | 1.01 | none printed | water | no colour (the lab's own: white vinegar) | acetic acid |
| Vegetable oil | an edible oil pressed from plants | 0.923 | 25 °C | oil | pale yellow | none |
| Mineral oil | a mixture of saturated hydrocarbons | 0.822 | 20 °C | oil | no colour | none |

The water's density is the NIST WebBook's. The rubbing alcohol's and the vinegar's are the specific gravities of the default supplier's safety data sheets, which print no temperature. The two oils' are the specific gravities of NOAA's CAMEO Chemicals records, printed at 77 °F and 68 °F. A specific gravity is stored as a density in g/mL: at the figures printed the two differ by 0.003 at most, and each density's note says so. The supplier's sheet for mineral oil prints 0.845 to 0.860 with no temperature; the record stores the government figure, which has one.

The two solids are table salt (sodium chloride) and sugar (sucrose), each white by its supplier's sheet. Sugar links to sucrose in the library.

## The tubes as stored

Which liquid is on top is stored nowhere. The build and the engine work it out from the two densities, and the build refuses a pair whose densities are less than `parameters.leastDensityGap`, 0.03 g/mL, apart.

| Pair | Outcome | On top (worked out) | Densities apart, g/mL | Rests on |
| --- | --- | --- | --- | --- |
| water, rubbing alcohol | one layer | | | named: the supplier's sheet, Wikipedia on 2-propanol, the Purdue handout |
| water, vinegar | one layer | | | named: the supplier's sheet for vinegar |
| water, vegetable oil | two layers | vegetable oil | 0.075 | named: NOAA's record; the Alaska lesson |
| water, mineral oil | two layers | mineral oil | 0.176 | named: NOAA's record; the supplier's sheet |
| rubbing alcohol, vinegar | one layer | | | general: what each bottle holds |
| rubbing alcohol, vegetable oil | two layers | rubbing alcohol | 0.053 | general: the Purdue handout, which is for alcohol of 75% or more |
| vinegar, vegetable oil | two layers | vegetable oil | 0.087 | named: Wikipedia on solvents |
| vinegar, mineral oil | two layers | mineral oil | 0.188 | general: the supplier's sheet (acids, and water) |
| vegetable oil, mineral oil | one layer | | | general: the rule for oils |

| Solid in liquid | Outcome | Rests on |
| --- | --- | --- |
| salt in water | dissolves | named: the supplier's sheet; CK-12 |
| salt in vinegar | dissolves | general: the sheets for salt and for vinegar |
| salt in vegetable oil, salt in mineral oil | does not | general: Wikipedia on solvents (salts dissolve in very polar liquids only) |
| sugar in water | dissolves | named: the supplier's sheet; CK-12 |
| sugar in vinegar | dissolves | general: the sheets for sucrose and for vinegar |
| sugar in vegetable oil, sugar in mineral oil | does not | general: Wikipedia on solvents (sugars dissolve in very polar liquids only) |

`named` means that a source read names the two things. `general` means that the outcome rests on a rule for a family or on what a bottle holds; the record's `reason` says which, and why it applies.

## Where the lab is other than spec section 25 has it

- **Nine pairs, not ten.** The rubbing alcohol with the mineral oil is left off the bench: no source read says what the two show, and the supplier's own density for mineral oil is within 0.03 g/mL of the rubbing alcohol's. Part 1 is done at six of nine.
- **Eight solids in liquids, not ten.** Neither salt nor sugar is tried in the rubbing alcohol. The supplier's sheets say that each dissolves slightly in alcohol, with no strength given; the bottle is about a third water; and Wikipedia's article on 2-propanol says that salt can drive the alcohol out of its water as a layer of its own. What a little of either does would turn on the amount. Part 2 is done at six of eight, where 25.1 has six of ten.
- **The rubbing alcohol sorts with water.** On this bench it mixes with water and with vinegar and makes two layers with the vegetable oil, and Wikipedia calls its molecule polar. The note of part 3 and the primer say that the molecule has an oily part too, and that the alcohol with no water in it dissolves many oils. There is no third family.
- **A tube is not read before it has stood.** Until then the lab draws what is in it as one cloudy, unsettled liquid, whatever it holds (`parameters.unsettledUntilStood`). That is the lab's own, and no claim about any pair.
- **The hazards rest on the supplier's sheet for the alcohol in water,** 40% to 90%, and not on its sheet for the alcohol alone, which the freezing point depression lab's record rests on. The sheet for the solution is the one for this bench's strength, and it has one statement more, for the skin. So the record is this lab's own and the freezing lab's is not shared.

## What could not be sourced, or only in part

- **A temperature for two densities.** The supplier's sheets for the rubbing alcohol and for vinegar print a specific gravity and no temperature. No other figure for either, at a stated temperature and for these strengths, was read.
- **The rubbing alcohol with the vegetable oil, at 70%.** The one source read, a demonstration handout, is for rubbing alcohol of 75% or more with olive oil. It classes the two as immiscible and has them stay as two layers while water is added. It asks for 75% or more so that the alcohol is sure to float; at 70% which floats is taken from the stored densities, which are 0.053 g/mL apart. A lesson plan of the American Chemical Society that is said to use 70% could not be read: its site answers an automated reader with a challenge page.
- **The rubbing alcohol with vinegar, and the two oils with each other.** No source read names either pair. Each rests on a general rule, and its `reason` says so.
- **Salt and sugar in vinegar.** No source read names either. Each rests on the solid's sheet, which says that it dissolves in water, and on vinegar's, which gives it as 92% to 96% water.
- **Salt and sugar in an oil.** No source read names table salt in vegetable oil or in mineral oil. Each rests on Wikipedia's sentence that salts and sugars dissolve in very polar liquids only.
- **That Epsom salt is magnesium sulfate, an ionic compound.** Part 3's second question states it; no source of this lab was read for it.
- **What the liquids look like.** Water and white vinegar are described as the lab's own bench has them.
- **The strength of the bottle.** Wikipedia gives the pharmacopoeia's isopropyl rubbing alcohol as about 70% by volume and says that what is sold runs from 70% to 99%. The lab takes 70%, the strength the supplier's sheet prints its specific gravity for. A bench with the 91% kind may see something else with an oil.

## What a chemist should look at

1. Whether rubbing alcohol of about 70% and a vegetable oil are rightly given as two layers with the alcohol on top, after shaking and standing. The stored densities say so by 0.053 g/mL; a real pair may stay cloudy for some time.
2. Whether the rubbing alcohol is rightly sorted with water, with a note on its oily part, or should be left out of the sorting.
3. The four pairs and the six solids in liquids marked `general`, which rest on a rule for a family or on what a bottle holds and on no source that names the two things.
4. That mixed liquids are drawn at the sum of their volumes and, where one is the yellow oil, pale yellow: both are the lab's own.
5. The primer's card on why salt does not dissolve in oil, which puts two passages together: no page read says it in so many words.
6. The hazard note: the supplier's sheet lists acids among what the alcohol is kept from, and this bench puts it in a tube with vinegar. The note says so and gives no opinion.
7. Whether "Epsom salt" is a fair salt-like thing for part 3, and "cooking grease" a fair oily one.

## Read and not used

- The supplier's sheet for 2-propanol alone (sds_420) and NOAA's record of 2-propanol were read for the freezing point depression lab. The second is under this lab's hazard note; the first is not used here.
- The Alaska lesson's demonstration of an ice cube sinking in 2-propanol, and the handout's table of densities (olive oil 0.80 to 0.92 g/mL), are not used.
- NOAA's list of chemicals under the letters O and M, and the index page of the textbook chapter, were read only to find the pages cited.

## Tried and not read

- `www.acs.org`: the request for its robots file was answered with a challenge page for automated readers. Nothing more was asked of the site.

## Read and not kept

Every source. Each manifest row says what its source prints and where, and the manifest holds the hash of each page as it was read. The robots file of each site was read before the first request to it. Wikipedia was read only at `/wiki/` addresses that pin a revision. NOAA's records were found in the lists the site shows by letter; its search was not used. The supplier's sheets were read in a browser, since the site draws them by script.

## The hazards

One record, the rubbing alcohol's. Its signal word and four statements are those of the default supplier's sheet for 2-propanol of 40% to 90% in water. Its note gives that sheet's precautions and, where NOAA's record of the alcohol is stricter (the vapour, splashed skin, the eyes), NOAA's lines. It gives no method of disposal.

The water, the vinegar, the two oils, the salt and the sugar have no record. They share the red cabbage pH lab's note for foods on a bench, word for word: this folder's `mixing.json` names that lab and holds no wording, and the build copies the note from `docs/research/cabbage/cabbage.json`. A test holds the two to each other.

## What nobody checked

No chemist or chemistry instructor has read the record, the notes, the primer or the hazard note. No tube of this bench was set up: every outcome is from a document, and ten of the seventeen rest on a general rule or on what a bottle holds, not on a source that names the two things.
