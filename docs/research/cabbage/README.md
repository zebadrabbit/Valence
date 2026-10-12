# Red cabbage pH lab research record

The inputs the red cabbage pH lab is built from (spec section 21), where each came from, and what could not be found. Everything was gathered on 2026-10-11. Nothing in this folder is loaded by the app.

`npm run build:data` reads this folder and writes `src/chem-data/cabbage/cabbage.json` and the lab's entries in `src/chem-data/sources.json`. The build stops, and writes nothing, on an input it cannot hold to its sources, on a pH that is not what its figures give, and on a household thing whose colour would send a careful learner to a tube more than a unit away.

| File | What it is |
| --- | --- |
| `cabbage.json` | The lab's record: the seven bottles that are laboratory chemicals; the scale's thirteen buffers and its three questions; the indicator's twelve colours, each with the pH or the range its source names it for; the fourteen household things, each with how it is on the bench, what it looks like before the indicator goes in, its range of pH and the note shown when its sample counts; the note shared by the things with no record of their own; three constants; the three parts with the notes shown when each is done; and the model's parameters, each with its rationale |
| `sources/MANIFEST.json` | Every source of that record and of the primer (`src/chem-data/cabbage/primer.ts`): its address, its citation, and rows that say what it prints and where, each naming the stored values it supports |
| `hazards.json` | The hazards of the seven bottles: for each, the heading over its statements, the signal word, the statements and the note for the bench's strength |
| `sources/hazard-manifest.json` | The thirteen documents behind those hazards, with rows that say what each prints, and what was read and not carried |
| `sources/quotation-fingerprint.json` | Not kept in the repository (`.gitignore`): the hashes of every run of six words in the pages read, which the no-quotation tests compare against. Made with `node scripts/fingerprint-sources.mjs <folder of the pages> 2026-10-11 docs/research/cabbage/sources`; where it is absent those tests are skipped |

## The colours as stored

| pH | Colour | Source | Upper edge (the model's own) |
| --- | --- | --- | --- |
| 1 | red | a table for anthocyanins in general (LibreTexts, Indicators in Foods) | 1.5 |
| 2 | dark pink | the supplier's figure for red cabbage indicator (Flinn publication 91633, Figure 1) | 2.5 |
| 3 | rose | the same figure | 3.5 |
| 4 | lavender | the same figure | 4.5 |
| 5 | purple | the same figure | 5.5 |
| 6 | blue-violet | the same figure | 6.5 |
| 7 | dark blue | the same figure | 7.5 |
| 8 | blue | the same figure | 8.5 |
| 9 | teal | the same figure | 9.5 |
| 10 | emerald | the same figure | 10.5 |
| 11–12 | greenish-yellow | the same figure, which gives one swatch for both | 12.0 |
| 13 | yellow | the table for anthocyanins in general | none |

A sample shows the first colour whose upper edge its pH does not pass; a sample exactly on an edge shows the lower colour. Ten edges are half way between the two pH values named. The last is not: the figure ends at 12, the other table has yellow at 13, and nothing read says what is seen between. The model shows yellow for everything above 12.0. That choice is made for the acceptance check: the pH 11 and pH 12 buffers share a word, a careful learner may name either, and both must be within a unit of every sample of that colour, so no sample above 12.0 may show it.

Where the dye is destroyed the liquid is colourless: the same publication says that bleach soon takes the colour out of the indicator.

## The household things as stored

| Thing | On the bench | Range | From | Basis |
| --- | --- | --- | --- | --- |
| Vinegar | as sold | 2.40 to 3.40 | FDA, Approximate pH of Foods and Food Products (2007) | document |
| Lemon juice | as sold | 2.00 to 2.60 | the same table | document |
| Apple juice | as sold | 3.35 to 4.00 | the same table | document |
| Household ammonia | 1 in 20 | 11.2 to 11.4 | 5 to 10% ammonia (ATSDR), formula weight 17.0305 (NIST), pKb 4.75 and pKw 14 (LibreTexts) | arithmetic |
| Shampoo | 1 in 20 | 5.50 to 6.80 | a maker's sheet, for the product as sold | document |
| Hair conditioner | 1 in 20 | 3.5 | a maker's sheet, for the product as sold; one figure | document |
| Laundry detergent | 1 in 20 | 9.5 to 10.5 | a maker's sheet, for a 1% solution | document |
| Laboratory detergent | 1 in 20 | 9.5 | the default supplier's sheet, for a solution of no stated strength; one figure | document |
| Mouthwash | 1 in 20 | 6.0 to 8.0 | a supplier's sheet for a chlorhexidine mouthwash, as sold | document |
| Antacid tablet (calcium carbonate) | 5 g in 100 mL | 7 to 9 | a supplier's sheet for calcium carbonate, at 20 °C | document |
| Aspirin | 5 g in 100 mL | 3.5 | a supplier's sheet for acetylsalicylic acid, 2.5 g/L at 20 °C; one figure | document |
| Bleach | 1 in 100 | 9.6 to 9.8 | 5 to 12.5% sodium hypochlorite and formula weight 74.44 (the supplier's sheet), pKa 7.40 of hypochlorous acid and pKw 14 (LibreTexts) | arithmetic |
| Drain cleaner | 1 in 20 | 12.1 to 12.8 | 1 to 5% sodium hydroxide (a maker's sheet), formula weight 39.997 (the supplier's sheet), pKw 14 | arithmetic |
| Epsom salt | 5 g in 100 mL | 5 to 8.2 | a supplier's sheet for magnesium sulfate heptahydrate, 5% solution | document |

The seed draws one pH for each thing, to a tenth, from the tenths inside its range. Over the build's check, the tube a careful learner names is at most 0.5 of a unit from the meter for eleven things, 0.8 for the ammonia (which shows the colour of pH 11 and of pH 12) and 0.9 for the drain cleaner (yellow, the pH 13 tube, from 12.1 up).

## How each kind of value was read

- **The colours.** The supplier's publication is a PDF with a text layer. The names over the swatches were paired with the pH under each from the places of the words on the page, read out with a PDF library, as well as from their order.
- **A range from a document.** Stored with the document's own digits (`published`). Where a document prints one figure, both ends of the range are that figure, and the meter reads the same in every lab.
- **A pH worked out.** Stored with its working, and worked out again by the build from the cited per cent, formula weight and constant. A per cent is taken as grams in 100 mL of the product, since no density was read.
- **Hazards.** As the other labs': the default supplier's sheets were rendered in a browser and saved as text; seven sheets that earlier labs read were not fetched again, and each saved copy was checked against the hash that lab recorded.

## Where the lab is other than spec section 21 has it

1. **Fourteen things, not fifteen.** Buffered aspirin is left off the bench: no document that states its pH in water could be read. Eight of fourteen still make the part.
2. **Two neighbouring buffers share a word.** pH 11 and pH 12 are both greenish-yellow, as the supplier's figure has them. The rack shows that, and the third question of the scale asks for it.
3. **Acid, neutral or basic is not asked where the learner says the indicator cannot say.** With no colour there is nothing to judge it by.
4. **Neutral is the colour of the pH 7 buffer**: a reading from 6.6 to 7.5. Acid is below that and basic above. Spec 21.2 does not say where the lines are.
5. **The three questions of the scale are this build's**: the colour at pH 1, the colour at pH 7, and which two neighbours share a colour. Spec 21.1 says only that the rack answers them.
6. **The closing questions fall back on buffers.** Where the first eight things to count hold only one pair of readings a whole number of units apart, the second question sets the pH 4 and pH 7 buffers side by side; where they hold none, the second pair is pH 9 and pH 11. In seeds 1 to 100, worked in the bench's order, four seeds have one pair and none has no pair.
7. **The estimate can be changed until the meter is read, and the meter can be read again.** After an unrinsed reading the probe can be rinsed and the sample read again; the last reading stands. A sample that counts stays as it is.

## What could not be sourced, or only in part

- **Buffered aspirin**: nothing read states its pH. Left off.
- **Red at pH 1 and yellow at pH 13** are from a table for anthocyanins in general, not for red cabbage: the supplier's figure runs from 2 to 11–12.
- **What is seen between pH 12 and pH 13**, and every other edge between two colours: the model's own.
- **What an unrinsed probe reads**: the model's own, a fifth of the way toward the last sample. A source was read only for the practice of rinsing.
- **What each thing looks like before the indicator goes in**: the lab's own description of its bench, marked so in each `before`.
- **The pH of the shampoo, the conditioner and the mouthwash at one part in twenty**: the sheets give the product as sold, and the model takes the dilution to read the same (`parameters.dilutedReadsAsSold`).
- **How fast bleach takes the colour out, and why**: the publication says only that it soon does.

## What a chemist should look at

1. **The drain cleaner.** It is taken as sodium hydroxide in water alone, at 1 to 5%. The maker's sheet that gives that strength also lists 5 to 10% sodium hypochlorite: that product would take the colour out as bleach does. The thing's note says so. Whether a drain cleaner belongs on this bench as a plain base is the owner's to decide.
2. **The edge at 12.0.** Everything above pH 12.0 is drawn yellow, so a drain cleaner at 12.1 is yellow while the pH 12 buffer is greenish-yellow.
3. **Bleach at 9.6 to 9.8** is worked out for hypochlorite alone. A real bleach also holds a little sodium hydroxide and reads higher. No document read gives how much.
4. **Aspirin at 3.5.** The sheet's figure is for 2.5 g/L. The bench's suspension is saturated, and a pH worked out from an acid constant would be lower, nearer 2.7. No acid constant for aspirin was read, so the sheet's figure stands.
5. **The antacid at 7 to 9** is the sheet's range for calcium carbonate with no strength given; the sheet for antacid tablets says they may also hold magnesium hydroxide, which would read higher.
6. **The diluted toiletries** (above), and the laundry detergent, whose sheet is for a 1% solution while the bench has about 5%.
7. **A thing's own colour.** The model shows the indicator's colour whatever the thing's own: apple juice and lemon juice are pale yellow before it goes in.
8. **The mouthwash** is a chlorhexidine mouthwash at 6.0 to 8.0. A sheet for another maker's rinse gives 3.5 to 4.5; that rinse holds hydrogen peroxide, which may attack the dye, so it was not used.
9. **Household ammonia's tile** carries Danger, from the supplier's sheet for 1.1 M to 14.8 M, which household ammonia of 5 to 10% falls inside; the supplier's own sheet for household ammonia gives only Warning.
10. **Weak-base arithmetic.** The ammonia and the bleach use pOH = (pKb − log c) ÷ 2, which leaves out the part of the base that has reacted; at these strengths that moves the pH by less than 0.01.

## Read and not used

- A national science museum's page on cabbage indicator: its colour key is a picture with no names.
- The default supplier's sheets for shampoo and for magnesium sulfate heptahydrate: neither prints a pH.
- Two sheets of one maker for an antiseptic mouth rinse (3.5 to 4.5): see above.

## Tried and not read

- One state health department's site refused the request for its robots file; nothing more was asked of it.
- One chemistry education site's robots file excludes AI readers; no page of it was fetched.
- A professional society's teaching site lists its download address in its robots file; its handout was not fetched.

## Read and not kept

Every source was read and none is kept. The manifests record the sha256 of each file as fetched.

## The engine

`src/engine/cabbage/` is pure and seeded, in whole numbers, with a pH held in tenths. A stored lab holds the seed and what the learner did, and no pH, colour or mark. `src/cabbage-version.test.ts` pins the model, the draw and the stored shape to the stored entry `lab:red-cabbage-ph`, version 1. The lab's page is `src/app/lab/cabbage/`, which uses the engine through its index alone; the lab is in the list of activities as "Red cabbage pH", and section 21.7 of the design spec says how the page was built and where it is other than section 21.2. The page's builder changed one note of this record on 2026-10-11: the hair conditioner's, which had said that it is more acidic than its maker's shampoo, while the shampoo's figure on this bench is another maker's. The note now gives the conditioner's figure and sets it beside nothing.

## What nobody checked

No chemist has read this record. No bench was run: no colour here was seen, and no pH measured. The hazards rest on what the manifests say each sheet prints; the build cannot check them against the sheets. The review below read five of the sheets and the one record of NOAA's against the notes that rest on them, as saved text, and nothing more of the hazards.

## The review of 2026-10-12

The one deep review of the phase, held when the screens were whole, by an AI reviewer that had built none of the lab: not the record, the hazards, the engine, the wording or the page. It worked by script in headless Chromium and by reading, through the night of 2026-10-11 into 2026-10-12 by the machine's own clock. It made the changes the project's owner had decided on, looked for faults by using the page and not by reading alone, and put right what it found in the same pass. This section says what was changed, what was found, what was left and what nobody checked. The page as it now is, is section 21.7 of the design spec.

### The changes the owner had decided

1. **The meter's two buttons stay where they are under Guided's warning.** As built the warning stood over them. Measured, as the height of the buttons' upper edges down the page, with a lemon juice read after a vinegar: at 768 by 1024 with the menu open, 1,084 px before the press and 1,164 with the warning up, 80 px lower, and the point first pressed was then on the warning's words; at 1280 by 800, where the two stand one over the other, 807 and 857 before and 907 and 957 after, 100 px lower. The warning now takes its room under the two buttons, and they were at 1,076 px, and at 799 and 849, before the press and after it.
2. **The bench's file is back in the style of the other labs' bench files.** `CabbageBench.tsx` had gone through a formatter and was 636 lines; it is 492 with nothing it does changed. The file as it was and as it was left compile to the same syntax tree, node for node, brackets aside: the review compiled both with the type checker's own transpiler and walked the two.
3. **The documents say that the review was held,** in each place that said none had been.

### What the review found, and what was done

Each is marked as it was judged: must-fix where a learner is stopped, is told something false, sees an answer or cannot do something; should-fix where a user or a maintainer would plainly want it corrected. How each is known is said with it: ran (seen in the browser), measured, or read.

4. **The two buttons moved at two more presses** (should-fix). Measured, in the same run. A reading taken anyway under the warning left them 48 px lower than they began, since the sentence on a reading that does not count came over them. Reading the meter moved them 20 px up, from 1,064 px to 1,044 in Challenge at 768 by 1024: "Change" goes from the row over the scale when the meter is read, and the row grew shorter. Everything that comes and goes with the probe is now under the two buttons (where the probe stands, the warning, the sentence on an unrinsed reading), the reading stands alone over them, and the estimate's row is as tall without "Change" as with it. The buttons were then at one height at every step: before the press, with the warning up, after a reading taken anyway, after a rinse and after a second reading, in Guided and in Challenge, at both sizes.
5. **A double click read through the warning** (must-fix, and made by the first change). Ran. With the buttons kept in place, the second press of a double click on the meter's button landed on the button that had just raised the warning, and the meter read with the probe as it was. A press on that button within half a second of the press that raised the warning is now that press come twice, and reads nothing (`comesTwice` in `pageLook.ts`, with a test; the rate labs' watch is deaf for as long after a pour). Run by a double click, by two taps of a finger and by Enter twice: the warning came and nothing was read, and a press a second later read.
6. **Guided sent a learner the wrong way on acid, neutral or basic** (must-fix). Ran. Guided takes a tube within a unit of the meter, and then judges acid, neutral or basic against the meter. With a mouthwash at pH 7.1, which shows dark blue, the pH 8 tube was taken; Basic was refused with "Think about which side of pH 7 the tube you named is on", which is the side the learner had said; and Neutral was then taken beside pH 8. The refusal and the hint now send the learner back to the colour: "Match the colour again: is it that of the pH 7 tube, or of a tube to its left or its right?" A learner who names the tube with the sample's own colour is never refused on this.
7. **A fresh tube was told that the meter showed its reading** (must-fix). Ran, in Challenge. A sample that did not count was set up again, the probe was still where it had last read, and the meter's button refused with "The probe is still in this tube, and the meter shows its reading" over a meter that said "Not read yet". The sentence now says that the probe was last in this thing and has not been rinsed since, which is so in both tubes.
8. **A sample that had been checked was told to rinse and read again** (should-fix). Ran, in Challenge, and seen in the builder's own picture of it. A reading taken with an unrinsed probe and then checked says that it does not count, and the meter has no buttons left; the sentence ended "Rinse the probe and read again." It ends there only while the sample can still be read.
9. **A reading was said to have been pulled where it was not** (should-fix). Ran. An unrinsed probe reads a fifth of the way toward the last sample, to the nearest tenth, which is no way at all where the two are two tenths apart or less: with the lemon juice read after the vinegar, each at pH 2.4, the meter read 2.4 unrinsed, "the last sample pulled it", and 2.4 rinsed. Of the 77 pairs of values the two can draw, 15 are that close. The warning, the sentence on such a reading and the cause now say that the meter may be pulled, or that the probe was not rinsed after the last sample.
10. **"Set it up again in a fresh tube" lost focus to the page** (should-fix). Ran, by taps and by the keyboard: the button goes with its card. Focus now goes to the thing's heading.
11. **"14 of 8 count"** (should-fix). Ran. Past the eight the part needs, the part's button, a thing's head and the record now say "14 count, 8 needed".
12. **The lemon juice's note called it the most acidic thing on the bench** (should-fix). Read, and worked out: the vinegar's range reaches down to 2.40 and the lemon juice's up to 2.60, so the vinegar reads lower in 3 of the 77 draws and the same in 3. The note now says that its range is the lowest of the things on the bench. This is the one line of the record the review changed, with the row of the manifest that says what it rests on.
13. **The primer's worked example was the far end of its ranges** (should-fix). Read. It said that lemon juice is about two units below apple juice and holds about a hundred times the hydrogen ion. By the table's ranges the two are 0.75 to 2.00 of a unit apart. The card now says one to two units, and ten to a hundred times.
14. **A sample's colour in words went as soon as the scale was touched** (should-fix). Ran, by taps. What a sample's liquid shows was in words in the callout of a look and nowhere else that is drawn, and the callout goes when the pointer or the finger moves to the scale, where the two are compared. The words now stay in a line under the picture's directions, once the liquid has been looked at as it now is.
15. **Two colours of the scale came out as two others with a colour vision deficiency simulated** (should-fix). Measured: see the next section.
16. **The documents** said that no review had been held, counted eight labs where there are nine (the README, and the page for institutional reviewers in two places, which listed the labs without this one), had no entry for this lab among the phases of the design spec, gave the page's lengths and its colours as built, and on the About page called the mouthwash's sheet a maker's where the record has a supplier's.

### The colours, measured

Read from the pixels of a picture of the page, in the rack of part 1 and in the small rack beside a sample, in the light theme and the dark, at 768 by 1024 and at 1280 by 800: each of the thirteen tubes is exactly the value the drawing has for its word, in all eight places, and the card under them is white in both themes. So the builder's figures, worked out from the values, are the figures of the screen. Each pair of neighbours as it now is:

| Neighbours | Values | CIEDE2000 | Contrast | Lightness apart (OKLCH) | Hue apart | Deuteranopia simulated | Protanopia | Tritanopia | Told apart? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pH 1 red, pH 2 dark pink | #e02424, #992154 | 24.7 | 1.65 | 0.12 | 27° | 25.3 | 30.9 | 19.8 | yes |
| pH 2 dark pink, pH 3 rose | #992154, #f089ae | 33.8 | 3.29 | 0.29 | 3° | 31.6 | 35.0 | 33.9 | yes |
| pH 3 rose, pH 4 lavender | #f089ae, #d2c2f7 | 21.7 | 1.44 | 0.09 | 59° | 19.5 | 15.0 | 25.9 | yes |
| pH 4 lavender, pH 5 purple | #d2c2f7, #920de4 | 39.9 | 3.76 | 0.31 | 6° | 33.8 | 33.6 | 37.1 | yes |
| pH 5 purple, pH 6 blue-violet | #920de4, #6f72f2 | 19.6 | 1.58 | 0.09 | 27° | 9.6 | 14.3 | 38.3 | yes |
| pH 6 blue-violet, pH 7 dark blue | #6f72f2, #0e1650 | 35.4 | 4.29 | 0.38 | 8° | 35.4 | 37.5 | 35.1 | yes |
| pH 7 dark blue, pH 8 blue | #0e1650, #1d3ea6 | 16.0 | 1.83 | 0.17 | 4° | 15.8 | 17.2 | 16.4 | yes, by how dark |
| pH 8 blue, pH 9 teal | #1d3ea6, #0d7480 | 28.3 | 1.67 | 0.10 | 58° | 16.1 | 19.6 | 15.1 | yes |
| pH 9 teal, pH 10 emerald | #0d7480, #16a05c | 29.7 | 1.62 | 0.11 | 53° | 31.9 | 32.5 | 13.5 | yes |
| pH 10 emerald, pH 11 and 12 greenish-yellow | #16a05c, #8eba0e | 20.6 | 1.48 | 0.11 | 29° | 18.4 | 14.5 | 16.8 | yes |
| pH 11 and 12 greenish-yellow, pH 13 yellow | #8eba0e, #f6d93f | 19.6 | 1.62 | 0.15 | 27° | 13.0 | 10.1 | 34.9 | yes |

The last column is the reviewer's judgement, from the figures and from looking at pictures of the rack in both themes at both sizes: a difference of 2 or 3 is the least that is seen, and none of these is under 16 as drawn. The nearest neighbours are the dark blue of pH 7 and the blue of pH 8, which differ in how dark they are and hardly in hue; they are the two that decide neutral from basic. Against the white card the yellow of pH 13 is 1.41 to 1 and the lavender 1.64: each tube's glass, its surface line and its label are in the ink.

A sample is held against all thirteen tubes, so the review also measured every two of the twelve, neighbours or not, as drawn and with each of three colour vision deficiencies simulated (Machado, Oliveira and Fernandes, 2009, at full severity, on linear RGB). As built, two pairs came out near each other:

| Pair | As built | Simulated | Now |
| --- | --- | --- | --- |
| purple (pH 5), blue (pH 8) | #742bb0, #1d3ea6: 14.4 as drawn, the nearest of all 66 pairs | protanopia 1.6, deuteranopia 5.9 | #920de4: 19.1 as drawn, protanopia 9.5, deuteranopia 12.1 |
| dark pink (pH 2), teal (pH 9) | #99186a, #0d7480: 47.4 as drawn | deuteranopia 6.8 | #992154: 52.6 as drawn, deuteranopia 19.3 |
| dark pink (pH 2), blue (pH 8) | 27.4 as drawn | protanopia 9.2 | 30.6 as drawn, protanopia 16.2 |

So two of this lab's own values were changed, and no value another lab draws: the purple from #742bb0 to #920de4, lighter and stronger, and the dark pink from #99186a to #992154, the same in lightness and a little toward red. Each was found by a search over values that keep the word, hold the test's rule for neighbours and stand farthest from every other of the twelve in all four ways of seeing. The least difference between any two of the twelve, in any of the four, is now 9.5 (purple and blue, protanopia) where it was 1.6, and as drawn the nearest of all pairs is now the dark blue and the blue, at 16.0. What it cost: the purple is nearer the blue-violet beside it, 19.6 as drawn where it was 21.7 and 9.6 with deuteranopia simulated where it was 15.7, and the dark pink is nearer the red, 24.7 where it was 29.9. A test holds every pair of the twelve to 0.06 or more apart in OKLab, as drawn and in each of the three simulations; the values as built fail it at 0.018 and 0.045. A simulation is a model of what is seen and nobody's eye, and nobody with a colour vision deficiency has looked at the rack.

**Without seeing colour.** Every look says the colour as a word: a tube of the rack in the line under the rack, which stays, and a sample's liquid in its callout and now in a line that stays. A script worked the whole lab from those words, in each mode. Done that way the lab asks nothing of a learner beyond matching one word to another in part 2, and reading a word off the rack in part 1; part 3 is the same for everyone. That is not what the lab sets out to teach, and it is the owner's to weigh.

### Looked at and left

- **Guided takes a tube next to the right one.** It is the rule (within one unit), and it means that Guided can take pH 8 for a dark blue sample and then ask for Neutral. With the words of finding 6 a learner is sent back to the colour. Whether Guided should take only the tube whose colour the sample has is the owner's.
- **The warning comes once for a tube.** Read in the engine, not run: a learner who is warned, goes to another thing, and comes back with the probe unrinsed again is not warned a second time in that tube.
- **The questions of part 1 open at the first tube that is looked at,** by a pointer that crosses it too, though the line says to look along the rack.
- **In Challenge, with the meter read and the check to come, a sample is longer than the window** at 768 by 1024 with the menu open, for the longest of the fourteen things: 990 px from the line over its name where 976 are under the tab bar, and 942 as built. The tube, the scale and the buttons are in view; the foot of the last card, which says to check, is 14 px under the window's.
- **The list of sources, open, at 1280 by 800:** its links are lines 31 px tall one under another, and the 44 px area of one reaches 13 px into the next. The list is the shell's and every lab's.
- **A control that cannot be used now is drawn at half strength,** and its contrast was not measured.
- **The sources name makers' products,** as a citation must: a shampoo, a conditioner, a drain cleaner and a detergent by their makers' names, in the list a learner can open. Nothing else a learner is shown names a brand. Whether a citation is under that rule is the owner's.
- **`SampleCard.tsx`** has two of the formatter's marks too, an import over many lines and two buttons with a line to each attribute; it was not asked for and was left.

### What was read and worked again, and found sound

- **The three ranges that are arithmetic,** by hand from the record's own figures. Ammonia: 5 g in 100 mL over 17.0305 is 2.936 mol/L, a twentieth 0.1468, pOH (4.75 + 0.833) ÷ 2 = 2.792, pH 11.21; at 10 g, 0.2936, pOH 2.641, pH 11.36. Bleach: 5 g over 74.44 is 0.6717 mol/L, a hundredth 0.006717, pKb 6.60, pOH (6.60 + 2.173) ÷ 2 = 4.386, pH 9.61; at 12.5 g, 0.01679, pOH 4.187, pH 9.81. Drain cleaner: 1 g over 39.997 is 0.2500 mol/L, a twentieth 0.01250, pH 14 − 1.903 = 12.10; at 5 g, 0.06250, pH 12.80. Each is the record's, and each note says that it is worked out and not measured.
- **Every sentence a learner can be shown:** the primer's seven cards, the messages, the fourteen notes, the notes of the three parts, the seven hazard notes and the shared note. The supplier's publication was read against the colours and their pH, the primer's cards and the note on bleach; the page on indicators in foods against red at pH 1, yellow at pH 13 and the two groups of dyes; five of the supplier's sheets and NOAA's record against the hazard notes that cite them. Beyond the findings above nothing was found that its source does not bear out, no figure that is arithmetic and not said to be, and no claim of conformance to any standard.
- **For a beginner.** The primer says what an acid, a base, pH, an indicator and a buffer are before the bench uses the words. Three sentences assume more than it has said: the note on ammonia speaks of "the base constant of ammonia", and the notes on bleach and on drain cleaner of sodium hypochlorite and sodium hydroxide, none of which a card explains; they are in notes shown once a sample counts, and say where a figure is from.
- **What is kept back.** At two to four points of every thing in two whole labs, before its meter was read, the page's markup was searched for the pH the seed had drawn for that thing, the Record tab's with it: it was found only where another thing that had been read had the same reading.
- **Records that do not fit.** Six were put in the lab's place in storage (not JSON, a thing listed as counting whose sample does not, a reading with no estimate, a field the record does not have, a later version, a seed that is not a whole number): each was set aside and kept, the page said so and offered Start, and the console was empty.
- **The code:** the state and its effects, the door of the lint rule for `engine/cabbage`, what the bench has of its own beside the shell's, and the tests, each of which asserts something.

### What was run and measured

- **A whole lab in Guided by the keyboard alone,** at 768 by 1024 in the light theme and at 1280 by 800 in the dark, with a wrong answer at the rack, a wrong tube, a wrong acid, neutral or basic, bleach with a tube named and then that the indicator cannot say, the cloudy antacid, the probe not rinsed and read anyway, an estimate changed and a change cancelled before the meter was read, all fourteen things, and part 3 wrong and then right; at the second size also the Record tab, a reload and Restart. No press left focus on the page's body.
- **A whole lab in Challenge by emulated touch,** at 768 by 1024 in both themes: a wrong answer at the rack checked and answered again, a wrong tube checked and set up again, the probe not rinsed and checked, an unrinsed reading taken again with a rinsed probe before the check, bleach with a tube named, all fourteen things, part 3 wrong and then right, the Record tab before a meter was read and at the end, a reload and Restart.
- **The builder's script of a careful learner,** again on the page as left, in five settings; section 21.7 has the lengths it measured.
- **Every control's 44 px area, point by point,** at both sizes, in seven states of the page (part 1 with a question open; a sample with the estimate open, with the warning up, with an unrinsed reading, in Challenge with the check to come, and once it counts; part 3), with every disclosure closed and with each open in turn, the seven inside the open bench too: 180 passes and 3.4 million points. No point answered for another control but in the open list of sources at 1280 by 800, above.
- **The contrast of every run of text,** from the colours as the browser composites them, in nine states of the Lab, Record and Primer tabs at 768 by 1024: 4.50 to 1 or more in the light theme and 6.21 or more in the dark.
- **Motion.** With reduced motion asked for, no element of the page had a transition or an animation longer than a millisecond at five points of a lab. Without it the lab's panel has the short transition of the app's buttons and nothing in the rack or the tube.
- **Names and roles:** the rack a group of thirteen buttons named by their pH and one stop of the Tab key, with the arrow keys, Home and End along it; beside a sample the same group with each tube's button pressed or not, and "The indicator cannot say" with them; acid, neutral or basic a group of three radio buttons under its question.
- **One tube of each of the three labs that draw the shared tube,** the Le Chatelier's principle lab's, the Group I cations lab's and the aqueous reactions lab's: each was drawn with no wisps, said what is seen when looked at, and left the console empty.
- **The builder's pictures:** the rack and the samples in both themes at both sizes were looked at, and the pictures the changes altered were retaken.

### What nobody checked

No person has run the lab, by hand, by keyboard or by touch. No screen reader was used. One browser, headless Chromium on Linux, and no real device. No chemistry instructor has read the record, the notes or the primer. No colour was seen on a bench or by a person with a colour vision deficiency, and no pH was measured. The review read no source of the things' ranges but the food regulator's table as the record gives it, and no hazard sheet but the five named. How the lab looks is the owner's to judge.
