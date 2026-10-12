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

`src/engine/cabbage/` is pure and seeded, in whole numbers, with a pH held in tenths. A stored lab holds the seed and what the learner did, and no pH, colour or mark. `src/cabbage-version.test.ts` pins the model, the draw and the stored shape to the stored entry `lab:red-cabbage-ph`, version 1. The lab has no page yet and is not in the list of activities.

## What nobody checked

No chemist has read this record. No bench was run: no colour here was seen, and no pH measured. The hazards rest on what the manifests say each sheet prints; the build cannot check them against the sheets.
