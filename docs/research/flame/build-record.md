# The flame test lab: record of the build of its screens

Written on 2026-10-09, when the screens were whole, by the AI coding assistant that built them. It says what was built, where that differs from the design spec (`docs/superpowers/specs/2026-10-03-valence-v1-design.md`, section 15) or from the instructions for the build, and why, and what nobody checked. The record, the engine, the primer and the chemistry wording were built before the screens and are the subject of `README.md` in this folder; this record covers them only where it corrected them.

## Five corrections to what was already built

1. **Challenge no longer hands over the answers for an observation that did not count.** The engine showed the hints, and what a correct observation holds, after any recorded observation. A dip with the handled loop and a guess was enough. They are now shown in Challenge only once an observation made with a clean loop is recorded, right or wrong; Guided has them from the start, as before. The mode's own sentence was rewritten to say so.
2. **The barium chloride bottle's note gives first aid for swallowing again.** The second supplier's sheet for a 0.1 M solution asks that a doctor or a poison centre be called at once if any is swallowed. The note had left that out to keep to a length, and the manifest had a row that said so. The sentence is back, in the project's words, in the note's second paragraph (192 words in all), with a row of its own in `sources/hazard-manifest.json`. The row for what is still left out now covers the skin's line alone. That supplier's form prints the same first aid on every sheet of its that was read; it is carried all the same, because swallowing is the hazard the bottle's statements name first, and the row says that too.
3. **Two sources were replaced, because their sites' robots files set rules for automated readers.**
   - The abstract of a paper in Nature (1956), which the periodic table's note on what an emission spectrum leaves out cited for the bands of CaOH, SrOH and BaOH. The note now cites three of this lab's sources for the same statement: the abstracts in English of Daidoji's two papers of 1979 and the paper of Human and Zeegers of 1975. What each establishes is stored beside the note, in `src/chem-data/element.ts`. The note's own words did not change. The build lists the old source no longer, and the emission spectra's manifest and READMEs were brought into line. The publisher's site was not fetched again.
   - One university's page on burner safety, which the primer's paragraph on the burner rested on. It now rests on another university's standard operating procedure for burners, fetched and read on 2026-10-08, whose site's robots file has no such rule. Prudent Practices in the Laboratory, chapter 6, which the project already cites, was read first: it speaks of open flames only as sources of ignition near flammable liquids and says nothing of hair, of leaving a flame, of the gas or of cooling, so it could not carry the paragraph. The paragraph's words did not change. The fingerprint that the no-quotation test compares against was made again with the new page in place of the old.
4. **The shared Hazards disclosure** draws a note whose text holds blank lines as short paragraphs, and lists every source the note names, the third and those after it too. A note with no blank line is one paragraph as before: the tiles of the titration lab and of the aqueous reactions lab were rendered before and after the change and compared, and were the same byte for byte.
5. **The lab is among the activities,** third, at `/lab/flame`, with the title "Flame tests". Home, the list of labs and the search show it with its status. The mechanism timeline moved from third to fourth in that list, and the three places that read it by position were changed with it.

## What was built

- **The page** at `#/lab/flame`, loaded lazily, on the labs' shell: Primer, Lab and Record tabs, the mode in one line, Start, Restart, the notices and the periodic-table link above them.
- **The Lab tab:** a list of seven, one shown at a time: the six stations, each with how far it has come in words beside a mark, and the closing question. Previous and Next are named for where they go.
- **A station:** the bottle (its tile, with what the solution looks like and its hazards); the loop (drawn, its state in words, Clean and Dip, and in Guided the warning); the flame (Hold, then the drawn flame to look at); the spectroscope (its button, then the strip to explore, with a list under it of what has been looked at); the three questions and one check; and, once the station is done, its notes, what the strip leaves out, a link to the metal's card on the periodic table and its sources.
- **The closing question:** five choices and one check, disabled with its reason until the six stations are done.
- **The Record tab:** a table of what was recorded at each station and whether it counted and is correct, the closing answer, and the line that says the lab is complete.
- **Shared with the other labs, and made shared here:** the observation form, now a form of questions answered from fixed choices, which the closing question uses too; the Guided warning, which was the titration page's; a station's step card, its short list, a mark beside its words, and a bottle's tile, which were the aqueous station's; the way a picture is explored, as a hook the aqueous tube now uses; the periodic-table link, which can now go to one element; and the message line and the helpers of a field that takes one entry, moved up beside the shell. The aqueous lab's and the titration lab's markup tests pass unchanged.

## Where it differs from the spec or from the instructions, and why

- **The strip is drawn down to 440 px before it scrolls, not 560.** The instructions gave about 560 px as the width below which the strip should scroll sideways rather than shrink. A window of 768 px, the narrowest that shows a bench, leaves the strip 447 px with the menu open, and an upright tablet of 820 px leaves it 499. At 560 both would scroll, and what is scrolled out of sight is the far red end, where potassium's brightest line is: a learner who did not scroll would not find it, and two questions would stay closed. At 440 px the scale's marks are about 21 px apart and every button is 44 px wide. One constant, `MIN_WIDTH_PX` in `src/app/lab/flame/stripGeometry.ts`, sets it.
- **The list of stations stays behind its button for longer than the primer's topics.** With the list beside it at 1024×768, a station had 462 px for the strip. The paged list has a second form, used by this lab alone, that puts the list beside the card only from 58rem of bench, where the card still has the strip's full 720 px. At 1024×768 the list is therefore behind its "Stations" button, as it is on a tablet.
- **A number at every 100 nm and at 780,** with a mark every 20 nm. A number at every 50 nm would not stand on a mark.
- **Beyond 740 nm a line is drawn in the colour of 740 nm.** The shared function fades toward 780 nm and gives potassium's pair near 766 nm a red that is nearly black. The line is the one the lab calls the brightest on that strip, and it has to be found.
- **A line has a glow** about its stroke, so that a thin stroke of a dark colour is found; a violet or blue line of low rank is dim all the same.
- **Brightness by rank is 1, 0.75 and 0.55 of full strength.** The instructions asked for brighter or dimmer by rank and gave no figures.
- **A line or a band is named by its place in the count until it is looked at:** "Line or band 2 of 3, counting from the violet end". A name that said "the line near 589 nm" before the look would say which of the two it is, which is what the third question asks.
- **The page never carries the record's own names for the lines and bands.** They are names like the formula of the molecule that gives a band. A button's part is its place in the count.
- **The spectroscope's button opens and closes the strip,** and says which. The engine has no action for it, and nothing of it is stored: after a reload the strip is out if a line or a band had been looked at.
- **A new hold of the loop closes the spectroscope and empties the form.** The engine starts the looks again at a new hold; the page follows, so that what was chosen of one flame is not carried to another.
- **An observation made at an earlier hold is not shown in the form.** It is still the station's in the list and in the record. The flame's card says, where the loop has been cleaned or dipped again since it was held, that its pictures are of the loop as it was held.
- **The way on from an observation that does not count is a "Clean the loop" button under the feedback,** which cleans the loop and puts focus on "Dip the loop". The feedback's own sentence says the rest.
- **"Dip it anyway" puts focus on "Dip the loop",** the control that raised the warning, as the titration lab's warnings do. The instructions said where focus goes for the way back and not for the way on.
- **The hints are in the card of the questions,** over them, as the aqueous lab has its hints in the card they help with. That card comes when the loop has been held, so the first hint, on cleaning the loop, is first read after the first dip; in Guided the warning has said the same by then.
- **Five states of a station, not one mark for "done".** Not started; started; recorded with a loop that was not clean; recorded, not correct yet; done.
- **The whole strip is not described in one sentence on the page.** The engine's wording has such a sentence and it is tested for every salt (spec 15.5). It names the brightest thing, which is what two questions ask, so the page shows what one line or band is when that one is looked at, as the aqueous lab does with its tube.
- **A spot plate is not drawn.** The spec's set-up has a well of each solution; the page has the bottle and "Dip the loop".
- **The title is "Flame tests".** No title was given.
- **The About page** has a paragraph naming this lab's publishers, as it has for the other labs.
- **Twelve departures in the research README.** The instructions spoke of twelve departures listed there by the data's builder. That README lists what could not be sourced and what a chemist should look at, and no list of departures as such. The list that closes section 15.3 of the spec was written from the record, the engine and the wording as they stand.

## What a learner sees that is new wording

Everything the page says that is not from the lab's record or from the wording written before the screens is in `src/app/lab/flame/messages.ts`, from `STATION_TEXT` down, with its tests. Besides that: the Challenge mode's sentence in the same file was rewritten; one sentence was added to the barium chloride bottle's note; the lab's title is in `src/app/activities.ts`; and one paragraph is on the About page.

## How it was checked

By the assistant that built it, with scripts that drove the production build in headless Chromium 153 on Linux and are not kept: 308 checks in five scripts, all passing at the last run.

- One whole lab in Guided to completion by keyboard alone at 1024×768, with the warning met at every station, answered "Dip it anyway" once, a wrong observation, an observation that did not count, and a wrong answer to the closing question on the way.
- Two stations in Challenge by tap at 820×1180 in a context that emulates a touch screen, the first with the handled loop and then again with a clean one; the page was searched on the way for what is kept back.
- A mouse pointer over the flame and over each line and band; a reload in the middle of a station; the dark theme; the operating system's reduced-motion setting; five window sizes; the warning raised twice and a change of mode under it; a completed lab; Restart; two tabs.
- Home, the list of labs and the search; the narrow page; one Hazards tile of each of the other two labs; and the emission note and its sources on barium's card of the periodic table.

Screenshots were looked at only to see that nothing was broken, clipped or invisible: the lilac and the pale green flame on the dark card in both themes, the line near 404 nm and the line near 766 nm, and a callout at each end of the strip.

## What the chemistry looked like once it was on the screen

None of these was changed. Each is for whoever reviews the chemistry.

- **Barium.** The band is stored from 480 to 550 nm and the atom's line at 553.5 nm. On the strip the line stands 3.5 nm from the band's end and reads as the band's bright edge more than as a thing of its own; its dashed box is what sets it apart. The band is drawn in the colours of its wavelengths, from blue-green at 480 nm to yellow-green at 550, and its callout calls it green.
- **Potassium.** The flame is lilac, and the brightest thing on its strip is a deep red line at the very end of the scale, drawn in a plain red so that it shows. The lab says, in the primer, that an eye sees that light faintly; the picture does not.
- **Strontium and calcium.** The atom's blue or violet line, ranked third, is very dim on the black strip. It can be found by its dashed box and by the list.
- **A band without limits** is 10 nm wide or little more and, dimmed by its rank, is a narrow brownish or dull green bar: strontium's orange band and copper's green one.
- **A handled loop** puts sodium's line on every strip at full strength, beside the station's own brightest, and the callouts then say "one of the brightest" of both.
- **Two salts and no sodium** give a flame drawn half in one colour and half in the other. That is the model's rule for naming such a flame, drawn; no source was read for what such a flame looks like.

## What nobody checked

- No person has run the lab, by keyboard, mouse or touch. No screen reader was used. Chromium only, and no real device.
- No reviewer that did not build the screens has looked at them: the one deep review comes after this record.
- How it looks is the owner's to judge: the flame, the strip, the dark cards, the spacing, and whether five hints over the questions at every station are too many.
- Contrast was not measured on this page, in the text or in the pictures.
- No chemist or chemistry instructor has read the record, the notes, the primer, the feedback or the hazard text. The barium note's new sentence was compared by script with the text of the documents under the six notes and repeats no run of six words of them; nobody else has read it against the sheet.
- The no-quotation test of the primer, the notes and the manifest ran with the fingerprint of the pages, the new burner page among them. It is skipped where the fingerprint is absent.
