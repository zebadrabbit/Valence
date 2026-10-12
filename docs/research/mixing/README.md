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
| Mineral oil | a mixture of oily hydrocarbons | 0.822 | 20 °C | oil | no colour | none |

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
- **That Epsom salt is magnesium sulfate, an ionic compound.** Part 3's second question states it, and no source in this lab's manifest says it. The review found it in two pages read for other parts of the project: PubChem's page for the element magnesium, read for the periodic table, gives Epsom salt as hydrated magnesium sulphate; and the page on metals with dilute acids that the types of reactions lab cites (`chemguide-metals-dilute-acids`) names magnesium sulfate among the salts a metal and an acid form and speaks of the ions in them. The question's stored reason says so. Neither page is cited under part 3: the build holds a lab's citations to its own manifest.
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

## The review of 2026-10-12

Held that day, when the page was whole, by an AI reviewer that had built none of the lab, by script in headless Chromium on the production build and by reading. No outcome, density or answer was changed.

### Three changes the owner had decided on

- **A layer's bracket and word are drawn only once that layer has been looked at.** They were drawn as soon as a tube had stood: one bracket with "Liquid", or two with "Top layer" and "Bottom layer", which answered the first question before a look, most of all for the two pairs with no colour. The shared tube now draws no bracket for a layer whose word is null, and the lab gives a word only for a part this card has seen looked at as the tube now stands, or for every part of a tube that was looked at before the card was made and has since been checked. The bands and the line are as they were. The tube that the Group I cations lab, the Le Chatelier's principle lab and the types of reactions lab draw at Start was written out as markup before the change and after it and is the same byte for byte.
- **A filled tube whose other liquid is pressed** was told "To change what is in it, set it up again in a fresh tube", which the page offers only under a tube that is checked and does not count. It now says "This tube is filled already. What is in it cannot be changed."
- **At 1280 by 800 a tube with a question open ran past the window.** With 735 px under the bar of tabs, a tube's page was 644 px until it was looked at, 810 px with its first question open and 930 px with its second. Where a tube's card is 46rem wide, what is seen is now asked beside the picture and its steps: 567 px at every stage with either question open, and 671 to 694 px once the tube counts, with its note. For the card to have that width the table stands beside the tube only where the part is 76rem wide, where it was 58rem; at 1280 px the table is behind "Choose a tube to try", as on a tablet. At 768 by 1024 nothing changed: 644, 810 and 930 px, measured again.

### Found by using the page, and put right

- **A tube tried after its part was done carried the part's notes under it** from the moment it was chosen: at 768 by 1024, with 959 px under the bar, the seventh to ninth tubes of part 1 were 954 px with the first question open and 1,074 px with the second. The line that says the part is done and its notes now stand under a tube that counts and under the table alone; a later tube under way is 810 and 930 px, as the first six are.
- **Part 3 with its questions open was 833 px at 1280 by 800.** Its two sheets now stand side by side where the part is 46rem wide: 580 px with the questions open, 581 px done. At 768 px it is as it was, 873 and 788 px.
- **"Answer again" left focus on the page itself.** In Challenge, a part 3 that is checked and not all right has that button, which goes with the answers it clears. Focus now goes to the part's heading; by the keyboard, the next Tab is the first choice of the sorting.
- **What the last look said stayed in the line a screen reader is given** after the tube was shaken or had stood: a tube whose salt had dissolved still held "A white solid, spread through the liquid." A step now clears the line.
- **A step done and a step that cannot be taken yet were both announced only as unavailable,** the tick being for the eye. Each step's button now says whether it is pressed.
- **The note of rubbing alcohol with vegetable oil** began "Two layers, and this time the oil is underneath", which speaks of other tubes. It is now "Two layers, and the oil is underneath."
- **The table of liquids in this record** gave the mineral oil as "a mixture of saturated hydrocarbons", where the record has "A mixture of oily hydrocarbons".

### Looked at and left, for the owner or a chemist

1. **The parts of a picture still show how many layers there are before a look.** A part not yet looked at has a dashed edge, and each layer is a part, so a tube of two layers stands in two dashed frames with the line between them; and the buttons over them are named "Top layer" and "Bottom layer" from the moment the tube has stood. Only the brackets and their words were held back, as decided. Holding the frames back too would mean one part to look at until the first look.
2. **A tube come back to while it is under way**, from another tube or after a reload, shows its parts as not looked at again, since the record holds that a tube was looked at and not which parts. A tube that has been checked shows every bracket.
3. **The mineral oil has no hazards of its own.** The supplier's sheet classes it as not hazardous; NOAA's record, which the lab cites for its density, calls it combustible and a mild irritant of the eyes, and warns of breathing it in. The note it shares with the kitchen things has eye protection worn and nothing tasted, and the primer has no flame on the bench. By the project's rule of the stricter source it may want a line of its own.
4. **The shared note says "This is sold under its maker's own label"** under the heading "Everything else on this bench": the red cabbage pH lab's wording, written for one thing.
5. **The primer gives the rule, and says that oil floats on water, before the bench.** Spec 25.4 has it so; the page of parts 1 and 2 holds no family and no outcome before it is recorded, in what is shown, in what is hidden for a screen reader, or in a name or a value of its markup, at any stage tried.
6. **"All one layer" is said of the liquid in a solid's tube,** which is true and is not what that tube asks.
7. **An open list of sources has links 16 to 32 px tall,** in this lab as in every lab: the shared list. Everything else pressed was 44 px or more each way.
8. **A step that cannot be taken yet is drawn at half strength,** 3.7 to 1 in the light theme and 4.9 to 1 in the dark: the shared button.
9. **Two lengths are still over the window.** At 768 by 1024 a tube that counts after its part is done is up to 962 px with its note and the part's notes, 3 px over; at 1280 by 800 the sixth tube that counts is 816 px with them, where it was 939 px.
10. **At 1280 px the table is no longer beside the tube,** which is the cost of the questions standing beside the picture there. It is from 1,490 px of window or so.
11. **"Answer again" clears all seven answers of part 3,** those that were right too.

### Read and worked again, and found sound

- **Which liquid is on top,** by hand from the stored densities, in each of the five pairs that make layers: vegetable oil (0.923) over water (0.99821) and over vinegar (1.01); mineral oil (0.822) over water and over vinegar; rubbing alcohol (0.87) over vegetable oil. The page showed the same in every one, with more of either liquid.
- **Every sentence a learner sees:** the page's own, the seventeen notes, the notes of the three parts, the two questions, the primer and the hazard note. The hazard note was read against the saved sheet for the alcohol in water: the signal word, the four statements, what it is kept from, the hood, what is worn, and that drinking it can kill, which is the sheet's line on a lethal dose.
- **The code:** the actions and the stored shape, with eight stored records that do not fit (not a record, another version, a pair missing, a key too many, a tube looked at before it had stood, more of a liquid that is not in the tube, a status the record does not give, part 3 answered before it is open), each of which the page set aside and kept, offering Start; the one door for the engine; and the lab's tests, none of which asserts nothing.

### What was run and measured

- **A whole lab in Guided by the keyboard alone,** at 768 by 1024 in the light theme: 1,693 presses of Tab, Shift+Tab, Enter, Space and the arrow keys, from Start through all nine pairs, all eight solids in liquids and the three places off the bench, with a wrong number of layers, the wrong liquid on top, a wrong answer of a solid, a wrong family and a wrong answer in part 3, to the line that says the lab is complete, the Record tab, a reload and Restart. Focus was never left on the page itself, every control the Tab key reached was inside the window, and the browser reported no error.
- **Challenge by emulated touch,** at 768 by 1024 in the dark theme: a wrong number of layers and the wrong liquid on top recorded, checked, and set up again in a fresh tube; two layers changed to one, which takes the second question away; the mode changed to Guided over a wrong answer, which Guided marks and holds until it is put right; a wrong answer of a solid; part 3 with two of seven wrong, checked, and answered again; a seventh tube; a tube finished after the lab was complete; a reload. Before each check the card, the Record tab and the list of sources held no mark, no note and no source of an outcome.
- **The builder's three whole labs again,** on the changed page, with no error.
- **Pictures.** Nineteen pictures of a tube, of every kind (not settled; one layer with no colour and pale yellow; two layers with the oil on top and underneath; two with no colour, the thinner on top and the thicker; a solid just in, gone and left), before a look and after one, were looked at, with the page at both sizes in both themes.
- **Contrast of the text,** from the computed colours of every text on eighteen states of the page: in the light theme 4.5 to 1 or more (the least, small grey text on the primer's grey box; the cross 4.8, the colour of a question to answer 5.0, a refusal 5.1, the tick 5.2 to 5.6, a bracket's word 10.4), but for a step that cannot be taken yet, 3.7; in the dark theme 6.2 to 1 or more, and that step 4.9. The line between two layers was measured again as the builder measured it: 8.9 to 1 on a liquid with no colour and 9.3 on the pale yellow.
- **What is pressed,** on the same eighteen states at both sizes in both themes, with each disclosure open in turn and the window made as tall as the page, so that every control was in it: by which control answers along the lines through each control's middle, 44 px or more each way but for the links of an open list of sources; and no point of any control's box answered for another control.
- **Motion.** With reduced motion asked for, no element had a transition or an animation over a millisecond on any of those states.
- **Names and roles.** The table has a caption, a heading for each row and column, and a button in each place named by its tube and how it stands; a place off the bench is a button that says it is unavailable and takes focus. A tube is a region named by its heading, its picture an image with a name, its parts buttons, its questions groups of radio buttons named by the question.

### What nobody checked

No person has worked the lab. No screen reader was used. One browser, headless Chromium on Linux, and no real device. No chemistry instructor has read any of it.
