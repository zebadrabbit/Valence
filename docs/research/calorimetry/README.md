# Calorimetry lab research record

The inputs the calorimetry lab is built from (spec section 16), where each came from, and what could not be found. Everything was gathered on 2026-10-09. Nothing in this folder is loaded by the app. The last section is the record of the one review of the whole lab, held that day when its screens were built.

`npm run build:data` reads this folder and writes `src/chem-data/calorimetry/calorimetry.json` and the lab's entries in `src/chem-data/sources.json`. The build stops, and writes nothing, on an input it cannot hold to its sources.

| File | What it is |
| --- | --- |
| `calorimetry.json` | The lab's record: the seven reagents (the acid, the base, solid ammonium nitrate and the four metals), the water with its specific heat and density, the three parts with the enthalpy each model runs on and the notes shown when a part is done, and the model's parameters, each with its rationale |
| `sources/MANIFEST.json` | Every source of that record and of the primer (`src/chem-data/calorimetry/primer.ts`): its address, its citation, and rows that say what it prints and where, each naming the stored values it supports |
| `hazards.json`, `sources/hazard-manifest.json` | The hazards of solid ammonium nitrate and of the four metals as pieces, and the documents behind them. They were written apart from the rest, in the form of the flame test lab's, and the build merges them into the record. The acid and the base carry the aqueous reactions lab's records unchanged (`../phase-4/hazards.json` and its hazard manifest), which the build merges in from there |

No source has a copy in this folder. Three sources are shared with other labs and are read where those labs keep or read them: the NBS tables (the scan the aqueous reactions lab read), the table of standard atomic weights (`../periodic-table/sources/`) and PubChem's table of compounds (`../phase-4/sources/`).

## The values as stored

| Value | Stored | From |
| --- | --- | --- |
| Heat of neutralisation, part 1 | −57.706 kJ for each mole of water formed | NBS tables: NaCl in 100 H₂O (−407.066) + H₂O(l) (−285.830) − HCl in 50 H₂O (−165.356) − NaOH in 50 H₂O (−469.834) |
| The same at endless dilution, given in the part's notes and used by no model | −55.836 kJ/mol | NBS tables: H₂O(l) − H⁺(ao) (0) − OH⁻(ao) (−229.994) |
| Heat of solution of ammonium nitrate, part 2 | +24.405 kJ for each mole | NBS tables: NH₄NO₃ in 50 H₂O (−341.155) − NH₄NO₃(cr) (−365.56) |
| The same at endless dilution, given in the notes | +25.69 kJ/mol | NBS tables: NH₄NO₃(ai) (−339.87) − NH₄NO₃(cr) |
| Specific heat of aluminium | 0.902 J/(g·°C) | NBS tables, 24.35 J/(mol·K), over 26.982 g/mol |
| Specific heat of iron | 0.449 J/(g·°C) | 25.10 over 55.845 |
| Specific heat of zinc | 0.388 J/(g·°C) | 25.40 over 65.38 |
| Specific heat of tin | 0.227 J/(g·°C) | 26.99, white tin, over 118.71 |
| Molar masses of the four metals | as above | CIAAW abridged standard atomic weights, the extract kept for the periodic table |
| Molar mass of ammonium nitrate | 80.044 g/mol | PubChem's table, the copy kept for the aqueous reactions lab |
| Specific heat of water | 4.18 J/(g·°C) | NIST Chemistry WebBook, which prints 4.1813 J/(g·K) at 25 °C and 0.1 MPa |
| Density of water | 1.00 g/mL | The same page, which prints 0.99705 g/mL |

## How each kind of value was read

- **Enthalpies of formation.** The NBS tables, from the scanned PDF that NIST serves, in the copy the aqueous reactions lab read (its sha256 is in the manifest). The scan has no text layer: each page was turned into an image and read by eye, and every row of the manifest says so and names the page, the table and the row. Pages read: 2-38 (hydrogen), 2-47 and 2-48 (chlorine), 2-64 to 2-67 (nitrogen), 2-299 to 2-301 (sodium).
- **Enthalpies at the strength on the bench.** The tables print, beside a dissolved substance, rows "in n H₂O": one mole in n moles of water. A 1.00 M solution holds a mole in about 55 moles of water, and about 4 g of ammonium nitrate in 50.0 g of water is a mole in 53 to 59. The nearest rows are used, for 50, and for 100 for the sodium chloride the neutralisation makes, and nothing is worked between rows. The tables' introduction was not read for how such a row is defined; it is taken as the enthalpy of formation of the dissolved substance with the water counted as pure water.
- **Heat capacities of the four metals.** The same tables, the last column (Cp at 298.15 K), pages 2-116 (tin), 2-127 (aluminium), 2-138 (zinc) and 2-177 (iron). The figure for a gram is the build's arithmetic, with the working stored beside it.
- **Molar masses.** The copies other labs keep; the build holds each stored figure to them.
- **Water.** One page of the NIST Chemistry WebBook, fetched once. Its site's robots file allows every reader, asks five seconds between requests, and carries a content signal that permits use as input to an AI and refuses use for training.
- **What each reagent looks like, and the name and formula of each metal.** Section 9 and the title of the supplier's safety data sheet for it, the same sheets its hazards rest on, read in the copies fetched for the hazards.
- **The primer's ideas.** Fourteen pages, each fetched and read that day, each with a row in the manifest: two of Purdue University's general chemistry help pages and a third of its department's, four pages of Chemguide, a page of NASA's Glenn Research Center, a page of HyperPhysics, a laboratory manual page of North Carolina State University as WebAssign serves it, three of Davidson College's virtual chemistry experiments, and a page of Doc Brown's revision notes. Each site's robots file was asked for first: three of the sites have none, and none of the others has a rule against automated readers or against the folders read.

## What could not be sourced, or only in part

- **The name "calorimeter constant".** The pages read call it the heat capacity of the calorimeter. The name is the usual one in laboratory manuals and is the lab's.
- **How a cooling line is carried back.** One page says that the drift after the reaction is carried back to the time the reaction started. Another names a cooling curve and sends the reader to a book that was not read.
- **That a piece heated in the water itself carries hot water with it, and that a hot piece does not look hot.** Read in no source; the laboratory manual page heats its metal in a dry test tube, which is where the primer has what a careful bench does.
- **The specific heat and density of the real solutions.** Not read. The lab gives every solution water's, as its specification says, and the notes say that this is an idealisation.
- **The strength of each solution in moles of water for each mole.** The lab's own arithmetic, from a litre of water; no density of a solution was read.
- **A correction to the NBS tables.** None was read (see the first point below).

## What a chemist should look at

1. **The tables' row for the nitrate ion.** Page 2-64 prints −205.0 kJ/mol for NO₃⁻(ao). Page 2-65 prints −207.36 for HNO₃(ai), which with H⁺ at 0 is the nitrate ion's figure, and page 2-66 prints −339.87 for NH₄NO₃(ai), which is −132.51 + (−207.36) exactly. So the tables' rows for the dissolved acid and salt agree with each other and not with the row for the ion alone. Summing the two ions' rows gives a heat of solution of +28.05 kJ/mol; the tables' own rows for the salt give +25.69 at endless dilution. The lab uses the rows for the salt. One of the pages read for the primer, another college's virtual experiment, is set to 28.05.
2. **Enthalpies for the strength on the bench, not for the standard state.** The stored −57.7 and +24.4 kJ/mol are for solutions of about the bench's strength; the standard-state figures, −55.8 and +25.7, are 3% and 5% away, which is as large as the lab's tolerance. The lab's specification asked for enthalpies of formation from these tables and did not say which rows. Using the standard-state figures is a change of two stored numbers and two notes.
3. **The solutions are given water's specific heat and density.** One page read says that a solution's specific heat is below water's; no figure for these solutions, and no density, was read. The model and the learner's arithmetic make the same idealisation, so a run is judged fairly; the temperatures drawn are a little off a real cup's.
4. **A metal's specific heat at 25 °C is used from near 100 °C down.** The page read for it says only that the heat capacity of a mole of most solids is nearly constant from room temperature up; no figure for any of the four metals at 100 °C was read.
5. **The model's leak and mixing are made up.** The four shares in `parameters` were chosen so that a careful run is within the tolerance at every seed and each technique error alone is outside it; the two for a careless cup are larger than a real cup's. Their rationales say so.
6. **White tin.** The tables list white tin first, as the reference form, and gray tin second (25.77 J/(mol·K)); the piece is taken to be white tin.
7. **Zinc's third figure.** 25.40 ÷ 65.38 is 0.388498: the stored 0.388 would be 0.389 with the tables' own molar mass of 1982.

## Tried and not read

The site of the United States Naval Academy names this kind of reader in its robots file; the site of the Centers for Disease Control and Prevention refused the request for its robots file. Nothing was done to get round either, and a guide of the second that another site also serves was left unread. Several addresses guessed at other universities' sites did not exist.

Pages that were fetched while looking for these and that nothing rests on: the other twenty-one pages of the laboratory manual the calorimetry page is one of, opened for their titles alone; the menus of a university's laboratory site and of a chemistry tutorial site, neither of which has a page on calorimetry; three more pages of Doc Brown's notes and three more of HyperPhysics, one of them on calorimetry, which says in fewer words what the pages cited say; and a page of NASA's on the specific heats of gases.

No page of OpenStax was fetched: the aqueous reactions lab's figures for water rest on one, and this lab stores the same figures from the NIST page.

## Read and not kept

Every source. A value read from a page that is not kept rests on what the manifest says the page printed that day. What the build holds is that the record and the manifest give one account, that the molar masses are the kept copies' figures, and that the worked-out values follow from the cited ones.

The quotation fingerprint that `src/chem-data/calorimetry/quotation.test.ts` compares the lab's words against is not kept either, for the reason `../phase-3/sources/README.md` gives. `scripts/fingerprint-sources.mjs` writes it to `sources/`, where `.gitignore` lists it, from pages saved outside the repository:

    node scripts/fingerprint-sources.mjs <folder of saved pages> 2026-10-09 docs/research/calorimetry/sources

## What nobody checked

No chemist has read the record, the notes or the primer. The scanned tables were read by one reader, by eye.

## The review of 2026-10-09

The one deep review of the phase, held when the screens were whole, by an AI coding assistant that had built none of the lab: not the record, the engine, the wording or the page. It worked by script in headless Chromium and by reading. It made four changes the project's owner had decided on, looked for faults by using the page and not by reading alone, and put right what it found in the same pass. This section says what was changed, what was found, what was left and what nobody checked. The page as it now is, is section 16.7 of the design spec.

### Four changes the owner had decided

1. **What a part finds is shown in both modes.** The sentences under the titles of parts 1 and 2 said "given out" and "taken in", and which way the heat went is an entry of those two worksheets, so the build had kept the sentence from Challenge until the part was done. They now say neither: "The heat for each mole of water formed when an acid and a base are mixed" and "The heat for each mole of ammonium nitrate that dissolves in water". The sentence is drawn in both modes from the start, and a test holds the three sentences to no word of direction.
2. **The bench's figures are beside the worksheet.** The balance's reading and the bath's temperature are on the bench's card, which by the fifth entry is 1,840 to 2,220 px above the entry that waits. The bench's own lines are now said again at the head of the notebook, under the words "From the bench", 610 to 680 px above that entry: in one window with it on a tablet held upright. No state was added. One line more is the review's own and not part of what was decided: in part 3 the four metals with their specific heats, since the last entry of part 3 is chosen from that table. It is the last line of `notebookLines` in `src/app/lab/calorimetry/messages.ts`, and is the owner's to take out.
3. **The ring about the outcome has room.** The sentence that says how a run came out takes focus when the worksheet is checked, and its ring lay on the words. It now stands 8 px off them at the sides and 4 px over and under, in room taken back from the card's own padding.
4. **The documents say that the review was held,** by whom and how, what it found, and what nobody checked: this section, section 14 and 16.7 of the design spec, `docs/for-institutions.md` and the project's README.

### What the review found, and what was done

Each is marked as it was judged: must-fix where a learner is stopped, loses work, is told something false, sees an answer or cannot do something; should-fix where a user or a maintainer would plainly want it corrected. How each is known is said with it: ran (seen in the browser or in a run of the engine), measured, or read.

5. **A choice that had been emptied still said that it follows** (must-fix: the page said of an entry that was not made that it follows). Ran: in Guided, with the heat and then "gave heat out" entered, Change on the heat and the same heat entered again. The record then held no choice, as the engine has it, and the page still showed "gave heat out" chosen, "✓ Follows" beside it and an Enter button. In Challenge the old choice stayed chosen in the same way. A choice that a change above it has emptied is now asked afresh, with nothing chosen and nothing said.
6. **The lid's warning and the reason for a run without it said that heat leaves the cup** (must-fix: not so of one part of three). Read: "A cup with no lid loses heat from its open top", and "so heat left through the open top". The cup of part 2 is colder than the room and takes heat in, which that part's own notes say. Both now say that the cup trades heat with the room through its open top. The primer's card on the lid is as it was: it speaks of a cup in general and rests on a page that does.
7. **Refusals sent the learner to a relation that is not there, and part 2 was told that millilitres are not litres** (should-fix). Ran: in Challenge, once the worksheet is checked, an entry that does not follow said "Open the relation, and check the mass"; Challenge has no relation, and a checked worksheet has none in either mode. In part 2 a wrong number of moles was told to "check the units: millilitres are not litres", and part 2's moles are a mass over a molar mass. No refusal names the relation now, and part 2 is told to check the mass of the salt and the molar mass.
8. **Enter in a choice box dropped focus to the page** (should-fix; the shared form of choices, which the aqueous reactions lab and the flame test lab use too). Ran: with a choice box in focus, Enter made the entry, the boxes were disabled, and nothing had focus. Focus now goes to the form's button, which reads "Change" from then on. Tried in this lab in both modes, and in one observation of the aqueous lab.
9. **A change of a choice that Guided refused closed on the old choice, with the refusal beside it** (should-fix; found while trying the last, and in the shared form too). Ran: "took heat in" entered and right; Change; "gave heat out" entered. The form showed "took heat in", disabled, with "✕ That does not fit the two temperatures you entered" under it. A change whose answers are not right now stays open. The other two labs record such answers, so their forms were open on them already: seen again in the aqueous lab after the change.
10. **With the logger full and no curve, two sentences each sent the learner to the other** (should-fix). Ran: 120 presses of Run on, then the change. Run on said "Fill in the worksheet from the graph as it is, or run this part again", and the notebook said "Run on until the latest reading has come back". Both now say that the worksheet cannot open and the part is to be run again. "Run this part again" was there throughout, so nobody was stopped.
11. **The bench's lines were not true once the change was started** (should-fix). Read: "ready to pour in" and "The piece is in boiling water" stood on the bench for the whole run, beside a cup that said "Both solutions are in the cup". With the lines said again in the notebook, which comes only with the change, they would have been wrong wherever they were read. They now say "which is poured in" and "The piece is heated in boiling water".
12. **A lab that is complete told a run that had not counted to be run again** (should-fix). Ran: part 2 done, run again without the lid and checked, then the other two parts done. The head of the part said that nothing more is taken, and the sentence under the worksheet said "Run this part again: the lab sets it up with new numbers". It does not say so once the lab is complete.
13. **The Record tab sent the reader to a worksheet it does not show** (should-fix). Ran: a run that did not count for an entry was listed with "the worksheet marks which". On the Lab tab the worksheet is over that sentence; in the record there is none, and the entries are listed without marks. The record's sentence stops at "does not follow from the ones above it". Marking in the record which entries those were would take the engine handing each run's verdicts over; it was left.
14. **A run could be told that its result was too far off with nothing to say why** (should-fix; the sentence was added, and the parameters behind it were left: see below). Ran, over seeds 1 to 100: a typed temperature is taken when it is within 0.1 °C of the logger's, and with the highest temperature typed 0.1 °C short, 2 runs of part 3 in 100 did not count, with every entry told that it follows. Such a run is now told that the cup was worked rightly and every entry follows, and to look at the two temperatures. (On 2026-10-10 the owner set the reading's tolerance to nothing, and that sentence, which can no longer be reached, was taken out: 17 below.)
15. **The "Sources" disclosure at the foot of parts 2 and 3 had a hit area 40 px tall** (should-fix). Measured, by asking the page what lies at each point about the control: the area of "Previous", in the row below, lay over its foot. It has 4 px more room under it and measures 44. `docs/for-institutions.md` had said that every disclosure of a part has the 44.
16. **`docs/for-institutions.md` said that twenty-two hazard documents were read** (should-fix). Read, in `sources/hazard-manifest.json`: twenty-five were, of which the manifest lists 22 as sources and names the other three, the default supplier's sheets for a powder or a dust, in the rows of the sheets for the pieces; the five tiles cite 21 of the 22. The page now says so.

Nothing else in the code was changed. The engine, the record, the primer and the stored figures are as they were, and so are the stored entry's name and version.

### What was read and worked again, and found sound

- **The stored figures' arithmetic.** The two enthalpies and the two for endless dilution from their terms (−57.706, −55.836, +24.405, +25.690), the 2.36 kJ/mol between the two ions' rows and the salt's, the four specific heats from their heat capacities and molar masses, the percentages by mass of the two solutions, the moles of water for each mole of solute, and that 5% is under half the gap between iron and zinc.
- **The primer's five worked examples and its case of rounding,** by hand: each figure is as printed.
- **Three seeded runs, by hand** (seed 7, one of each part): the full change in temperature from the model's relations, the cup's first five steps for part 1, the readings the page drew, the entries a careful learner makes from them, and how far off the page then said the result was. Each agreed.
- **The model over seeds 1 to 100,** in a throwaway test: a careful run counts at every seed, 1.57% low in part 1, 0.84% to 2.89% in part 2 and 0.44% to 3.08% in part 3, and picks the right metal every time; the lid off puts a run 8.2% to 11.6% low and the stirrer still 9.4% to 13.2%, and neither counts at any seed; with the stirrer still the slowest curve turned back 8.5 minutes after the change; the salt's fall was 5.1 to 5.6 °C and the metal's rise 3.8 to 13.9 °C. These are the figures the rationales, the primer and the documents give.
- **Six pages the lab cites,** each asked for after its site's robots file, through a tool that fetches a page and answers questions about it: NIST's page for water (4.1813 J/(g·K), 0.99705 g/mL, 99.9743 °C); Chemguide on neutralisation (between −57 and −58 kJ/mol for a strong acid with a strong alkali, for each mole of water, and why the figures are alike) and on simple measurements (the cup, the lid, 4.18, the approximations and how they compare with lost heat, the cooling curve); the page of revision notes (the double cup, the level line, the line carried back, a change read too small without it, both ways round); the college's page on ammonium nitrate (the heat drawn from the solution, the mass of the solution, a molar mass of 80.04); and the laboratory manual's (its assumptions, the metal in a test tube in boiling water, the holder, the lid kept on, about 30 seconds to a minute or two to settle). Each bore out what the lab's text rests on it for.
- **The lint door** for `engine/calorimetry`, which a test holds, and the stored record's round trip and the records that do not fit, in the browser.

### What was run

By script, in headless Chromium 153 on Linux, against the production build, at 768×1024 first. The scripts are not kept. 259 checks in five scripts passed at the last run, which was made after the last change to the code.

- **A whole Guided lab by the keyboard alone,** 768×1024, light, from a browser with nothing stored, with ten kinds of wrong entry on the way and where focus was after each action read from the page.
- **A whole Challenge lab by tap,** 768×1024, dark, in a context that emulates a touch screen: each part run carelessly and then carefully, and the part shown searched at each stage for what Challenge is kept from.
- **By mouse,** 1280×800: a Guided lab in the dark theme and a Challenge lab in the light.
- **The changes above,** each tried on the build that holds them; five more window sizes; reduced motion; reloads; Restart; ten stored records that do not fit; two tabs; the narrow page; Home, the list of labs, the search and the About page; one observation of the aqueous reactions lab, for the shared form.
- **Measured:** the contrast of the graph's points, lines and ring from screenshots, and of the coloured and grey text from the colours the page is drawn in, in both themes; the hit area of every control of part 3 in the middle of its worksheet and of part 2 with its worksheet checked; how long a part is at six window sizes. The figures are in `docs/for-institutions.md`. Nothing was under 4.5 to 1 among the text measured, or under 3 to 1 among what the graph is read from; the faint level lines behind the plot are 1.4 and 1.5 to 1.
- **The whole check,** after the last change to the code and with this record written: `npm run build`, which is the lint, the tests, the type check and the production build, passed with 4,076 tests at the review and with 4,080 on 2026-10-10, after the changes of the last part of this section, 823 skipped each time for want of the other labs' fingerprints; `npm run build:data`, `npm run build:expected` and `npm run cross-check` left no file changed.

### Left for the owner

None of these was changed at the review. The first was decided on 2026-10-10, the titration lab's test was given a longer limit then, and the line of the four metals was accepted: see the last part of this section.

- **A temperature 0.1 °C off, and the 5%.** The reading's tolerance and the result's meet. Over seeds 1 to 100, careful cup, every entry worked correctly from the temperatures typed: one temperature 0.1 °C off toward the other, and every run of parts 1 and 2 counts and 98 of 100 of part 3 (the two are tin, whose rise is under 4 °C); both off, and every run of part 1 counts, 32 of 100 of part 2 and 58 of 100 of part 3. The specification asks for both rules. Holding a typed temperature to the logger's exactly would end it, and so would a wider tolerance, which would then sit nearer the 8% of a careless cup. The review added a sentence that says where to look and changed neither figure.
- **The line of the four metals in the notebook** (change 2 above) is the review's addition.
- **The number of a chosen entry** in the worksheet's list stands beside its choice boxes and not beside its label, which is the line above it: it is where a browser puts the number of a list item that begins with a group of choices. Moving it means a change to the shared form of choices.
- **A "+" typed before the size of a fall** ("+5.4" where the cup cooled by 5.4 °C) is read as the size and taken.
- **A pointer that rests where the page moves under it** looks at whatever reading comes under it, as section 16.7 says. Seen at the review: when a worksheet was checked by mouse the page moved, and the ring went to the first reading. The run is over by then.
- **The record does not mark which entries of a past run did not follow** (13 above).
- **The primer says which way the heat goes** in both modes, and its safety card that the cup of part 2 gets cold. That is the design's, and the Lab tab alone is held to saying nothing of it.
- **The faint level lines behind the plot** are 1.4 to 1 in the light theme and 1.5 in the dark, and the numbers of the axes about 11.6 px tall where the picture is 463 px wide.
- **The shared head of the page,** which this lab did not change: the mode's line has a hit area 40 px tall, "Restart lab" is 32 px tall, and the two links of the path over the title are 18.
- **Two helpers of one line each,** `listed` and `lower`, are written out in the wording modules of three labs. A place beside the shell would hold them once.
- **One test of the titration lab** (`bench.test.ts`, "has Change exactly when the engine would take the reading again") ran past its limit of five seconds three times at this review, once in a run of the labs' tests and twice in whole runs of the check, on a machine that was busy with other work. It takes 2.8 seconds when run alone, and the check passed each time it was run again. It is not this lab's, and nothing of it was changed.
- **For a chemist,** besides the seven above: the new sentences on the lid (6) are the review's, and say what the lab's own model does, that a cup trades heat with the room faster with the lid off; the page read for the primer says that a lid cuts down the heat lost from the liquid's surface. And item 1 above says that another college's virtual experiment "is set to 28.05": the page as the review's tool fetched it gave no figure for the heat of solution, so that sentence was not confirmed.

### What nobody checked

- **No person** has run the lab, by keyboard, mouse or touch. The build and this review were made by AI coding assistants working by script.
- **No screen reader** was used. That a look, a refusal and an outcome each change a status region or an alert was read from the page; what is spoken was heard by nobody.
- **One browser:** headless Chromium 153 on Linux. No Firefox, no Safari.
- **No real device.** Touch was emulated in a desktop browser; no finger has touched the page, and which keys a tablet shows for the worksheet's fields has not been seen.
- **No chemistry instructor and no chemist** has read the record, the notes, the primer, the feedback or the hazard text. The sentences written at this review were written by the reviewing assistant and read by nobody else.
- The window sizes were 768×1024 and 1280×800 for the whole labs, and 820×1180, 1024×768, 1366×768 and 1920×1080 for parts 1 and 3 with four entries made. No phone size, no browser zoom, no enlarged text, no forced-colours mode.
- The scripts of the build were not run again: the review's own were written without them.
- Contrast was measured on the graph and on the text of a part, and not on the drawn cup, the bottles, the hazard tiles, the primer, the Record tab or the head of the page.
- The scanned tables were not read again, nor the other nine of the fourteen pages the primer and the notes rest on; one of those, on specific heat, could not be asked for, its address answering with a certificate for another name. No safety data sheet was read again: the default supplier's page for ammonium nitrate came back without the sheet's text, and nothing was done to get round either. The six pages that were asked about were read through a tool's answers, not as pages.
- The flame test lab's forms were not tried after the change to the shared form of choices; the aqueous reactions lab's were, at one station. (The flame test lab's were tried on 2026-10-10: 18 below.)
- How the lab looks was judged by nobody: screenshots were looked at by the reviewing assistant to see that nothing is broken or clipped, and no more.

### Decided after the review, on 2026-10-10

The owner read the review and decided what it had left open. The same assistant made the changes, in the same way.

17. **A typed temperature is held to the logger's exactly.** The reading's tolerance, `readingToleranceTenths` in `calorimetry.json`, was 1 tenth of a degree and is 0, with a new rationale; the rationale of the 5% says what follows from it. A look at a reading says it to 0.1 °C, so nothing is estimated, and a lab that ticks every entry and then fails the run is worse than one that refuses a neighbouring reading at once. In Guided a temperature a tenth off is refused with the sentence that was already there for any other reading; in Challenge it is taken, as everything is, and marked when the worksheet is checked. Changed with it: the pinned model and the tests that held the old edge, the primer's sentence ("to the tenth of a degree" where it said "to within 0.1 °C"), sections 10, 14, 16.2, 16.6 and 16.7 of the design spec, and `docs/for-institutions.md`. The stored entry's version stays 1: the lab had not been released, so no stored run could be judged differently. The 5% was not changed.

    Then the question was whether a careful cup with every entry correct can still fail on the 5% alone. It cannot. A careful cup is one with the lid on and the stirrer going when the change is started; its two temperatures are now the logger's own; and each entry after them was tried at every value the rounding rule takes (worked from the entries above as typed or as they stood unrounded, the bench's figures in full or rounded as the rule allows, either neighbour at a tie), so the least favourable chain is among them.

    | | Chains the rule allows | Result, below the stored figure | Chains that do not count |
    | --- | --- | --- | --- |
    | Part 1, seeds 1 to 100 | 100 | 1.57% | none |
    | Part 2, seeds 1 to 100 | 281 | 0.43% to 2.89% | none |
    | Part 3, seeds 1 to 100 | 181 | 0.44% to 3.08% | none |
    | Part 1, every starting temperature | 41 | 1.57% | none |
    | Part 2, every starting temperature and mass of salt (1,681 set-ups) | 4,838 | 0.43% to 2.89% | none |
    | Part 3, aluminium, every start, bath and mass (180,851 set-ups) | 394,728 | 1.44% to 2.77% | none |
    | Part 3, iron, the same | 384,752 | 0.89% to 3.12% | none |
    | Part 3, zinc, the same | 317,612 | 0.52% to 3.35% | none |
    | Part 3, tin, the same | 206,059 | 0.44% to 3.52% | none |

    The first three rows are an acceptance test now, driven through the engine's own actions in Guided (`src/engine/calorimetry/acceptance.test.ts`, and spec 16.6). The same seeds' second and third runs of each part gave no chain that does not count either, the least favourable 3.09% low. The last six rows are every set-up the draw can give, tried once in a throwaway search on the engine's own functions that is not kept. The least favourable of all is a tin piece, 3.52% low: 1.48 points inside the 5%.

    So the sentence that item 14 added, for a run that does not count for its result alone, can no longer be reached, and was taken out. A result outside the 5% is now named only beside a lid that was off or a stirrer that was still; a test shows the reason alone on a model that asks for 1%, since the lab's own cannot come to it.
18. **The flame test lab's forms were tried by keyboard** after the change to the shared form of choices (8 and 9 above), at 1280×800, 11 checks. At one station, with the loop cleaned, dipped and held and everything looked at: three answers that were not right, entered with Enter from a choice box, left the form open with "Not yet" and focus in the box; the three right ones disabled the boxes, said "That is what this flame shows" and left focus on "Change"; Enter on "Change" put focus in a box with "Cancel" beside it, and Escape cancelled the change with focus back on "Change"; a change to a colour that was not right, entered from its box, was recorded, the station went back to "Recorded, not correct yet", and the form was open on it with focus in the box and no "Cancel", as that lab had it before. At the closing question, with the six stations done: Enter with nothing chosen said "Choose one answer" and left focus in the box; a wrong answer left the form open and focus in its box; the right answer disabled the boxes and left focus on the form's button. That button then still reads "Check answer" and is marked unavailable, with the sentence that says the lab is complete as its description: the right answer completes the lab, and a complete lab takes no change. So Escape and a change to a wrong answer could not be tried at the closing question. (By the fault of 8, focus would have gone to the page there before the change to the shared form; that is read from the code and was not tried.)
19. **The titration lab's test that ran past its limit** has a limit of 20 seconds, with a comment that says it runs in about 3 seconds alone and timed out at the default when several builds ran at once. Nothing else of it was changed.
20. **Accepted by the owner as they were done:** the line of the four metals' specific heats at the head of part 3's notebook (change 2), the two reworded lines of the bench (11), and the lid's sentences, which say that the cup trades heat with the room (6).

On the build that holds 17: the whole check passed with 4,080 tests; the five scripts of the review were run again, with the run that typed a temperature a tenth short changed to what the page now does (refused at once in Guided, with focus left in the field and nothing stored; taken in Challenge and the one entry marked at the check), 264 checks passing; and the screenshots were taken again. What nobody checked is as it stands above.

