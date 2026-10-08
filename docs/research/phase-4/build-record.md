# The aqueous reactions lab: record of the build of its screens

Written on 2026-10-07, when the screens were whole, by the AI coding assistant that built them. It says what was built, where that differs from the design spec (`docs/superpowers/specs/2026-10-03-valence-v1-design.md`, section 8) or from the instructions for the build, and why, and what nobody checked. The data, the engine, the primer and the chemistry wording were built before the screens and are not this record's subject, except for three corrections made to them here.

## Three corrections to what was already built

1. **The eye is a tool at every station.** The record followed the spec's table to the letter, so stations 6, 8 and 10 had no eye and never asked what is seen. They now ask for the solid, the colour of the liquid and the bubbles, beside what their other tools show. The expected records already held those values; only the stations' lists of tools changed, in `docs/research/phase-4/aqueous.json`, and the tests and the pin of what a stored run is judged against came along. The stored entry's version stayed 1, because the lab had no page before this and no run had been stored.
2. **The primer's safety card ends with the owner's rule** on how long to rinse, in the sentence the titration primer has. The sentence before it is not the titration primer's. That one says the sheets give no time for the rinsing, which is not so here: the two sheets for iron(III) chloride solution ask for flushing for at least 15 minutes without saying what is flushed, and the two for cobalt chloride print no first aid for the eyes. The card says that, and a test holds it to the notes under the bottles.
3. **A bottle whose sheet lists no hazard statement** (calcium carbonate) shows its heading, one sentence that the sheet lists no signal word and no statement, and its note, in place of "Signal word: None" over an empty list. The note of a solid or a metal is headed "As it is used here", since it has no strength. The note for cobalt chloride, which says that neither sheet prints first aid for the eyes, was left as it is.

## What was built

- **The page** at `#/lab/aqueous`, loaded lazily, on the titration lab's shell: Primer, Lab and Record tabs, the mode choice, Start, Restart and the notices above them. Home, the list of labs and the search link it with its status.
- **The Lab tab:** the ten stations one at a time, with a list that says how far each has come and a Previous and a Next named for where they go; the list folds behind a button where the tab is narrow.
- **A station:** the tube (two reagent tiles with amount and hazards, Mix, then a drawn tube on a white card with what is seen in words under it); the tools, each press answered in a message line; the observations, as groups of radio buttons checked by one button; the notes, once the observation is correct; three equation builders; the station's sources.
- **The equation builder:** "No reaction", the equation so far in one line, the palette, two buttons that ask the side, and for each term a coefficient from 1 to 9, a state and a way out. No dialog and nothing typed.
- **Two floating panels:** the solubility table and the calculator.
- **The Record tab:** a table of what was recorded at each station and whether it is correct, and the line that says the lab is complete.
- **Shared with the titration lab, and made shared here:** the floating panel (it was the calculator's), the paged list (it was the primer's), the button that stays focusable when it cannot be used, the rule that a sentence said twice says "Again:", and a shell that takes a lab with no docked notebook and a lab's own words for its two modes.

## Where it differs from the spec or from the instructions, and why

- **Four states of a station, not three.** The list says not started, started, observed, done. The instructions named three. A tube that is mixed, or a station with an equation entered, is not "not started", and "observed" is not true of it either.
- **"Smell the tube directly" is at station 6 only.** The instructions say it is always refused with the caution. The engine answers it with the caution only where wafting is a tool, and the caution ends by pointing to the waft tool, so the button is offered where that is true.
- **A message line on each card, not one for the station.** The tube, the tools, the observations and each builder have their own, so that what a press says is beside the button that was pressed and not off the screen.
- **The equation builders are on the station before the tube is mixed.** The engine takes an equation at any time. The tools and the observations wait for the mix.
- **A new term is written as dissolved, (aq).** The spec does not say what state a term starts in. With none, every ion would cost a third tap, over thirty equations. With (aq), an ion is right as it is added and every solid, liquid and gas is the learner's to set, so a state that is right for those is never the page's doing.
- **The coefficient stops at 9.** The engine takes up to 99; the curated equations need 3 at most.
- **One sentence of refusal is the page's and not the engine's wording:** an equation with nothing on a side is told to put a substance on each side or choose "No reaction". The wording module's sentence for that case speaks of a coefficient up to 99, which the stepper does not offer.
- **The solubility table is a grid** of positive ions by negative ions, not a list of pairs. A pair the record does not hold is marked "not listed", and a key under the table says that this says nothing of whether its compound dissolves. The table does not name the solid a pair makes.
- **Progress is saved with each action, not per station** (spec 8.3 and 10 said per station). What is chosen or built and not yet checked is not stored, and neither is the station shown: a reload opens on the first station that is begun and not done.
- **A station is drawn from the first time it is shown** and stays in the page, hidden, afterwards. This is what keeps a half-built equation while another station is looked at.
- **The bubbles rise three times and stop,** in under five seconds, where the instructions said only that they are animated when reduced motion allows.
- **The mode's two sentences are this lab's own.** The shell's speak of a checklist, warnings and trials.
- **The About page** has a paragraph naming this lab's publishers, as it has for the titration lab.

## What a learner sees that is new wording

Everything the page says that is not from the lab's record or from the wording written before the screens is in `src/app/lab/aqueous/messages.ts`, from `MODE_TEXT` down, with its tests; three more sentences are in `src/app/lab/shellText.ts` (the two under a bottle whose sheet lists nothing or which is a solid, and the names of a floating panel's grip and close button), one paragraph is in the primer's safety card, and one on the About page.

## What was checked, and how

- **Automated tests:** 2,808 in all at the close, of which those for this lab's screens are in `src/app/lab/aqueous/` (the builder's steps, the drawing against the record and the words, the wording, and the page's markup in each state).
- **By script in a browser:** the production build in headless Chromium 153, by keyboard: one whole lab in Guided to completion, two stations in Challenge with a wrong observation and a wrong equation each, a reload in the middle of a station, both themes, reduced motion, a narrow window, a stored record that does not fit, the two panels, and the Tab order of one station. 271 checks, all passing at the last run, with the console empty and nothing requested but the app's own files. The script is not in the repository. `docs/for-institutions.md` lists what it covered.

## What nobody checked

- **No person has used the page.** The script put focus on a control and pressed keys; nobody sat at a keyboard, and nobody has touched it on a tablet.
- **How it looks:** the colours, the spacing, the drawn tube, the bubbles, the length of a station's column and the size of the panels are the owner's to judge by eye. Screenshots were taken only to see that nothing was broken.
- **No screen reader**, no browser but Chromium, no measurement of contrast on this page, no browser zoom or enlarged text.
- **No review by a reader who did not build it.** The one deep review of the phase comes after this and is not part of it. That covers the chemistry too: no chemistry instructor or chemist has read the stations, the feedback or the primer.
- **The new wording** has been read by nobody but the assistant that wrote it.
- **The hazard text** was not read against the sheets again here. The sheets are not kept.

## What looked worth a second look in the chemistry, while building on it

None of these was changed.

- The solubility table shows ammonium with hydroxide as "soluble", as the record stores it and as the sources' note explains. At station 6 those two ions are the ones that react. A learner who looks the pair up may take "soluble" to mean that nothing happens.
- At stations 7 and 10 the correct answer to "Solid in the tube after mixing" is "no solid", because the powder and the ribbon dissolve completely. The question can be read as asking about what went in.
- At stations 2 and 3 the liquid over the solid is colourless, because the two reagents are put in to match exactly and the model takes every ion. A real tube is unlikely to be so clean. The stations' notes speak of the basic carbonate and not of this.
- The palette offers copper(II) hydroxide at station 2 and nickel(II) hydroxide at station 3 as formulas that do not belong. The solubility table has no row for either pair, so the table cannot be used to rule them out, and the station's own note says that the solid that really forms does hold hydroxide.

## The review at the close of the phase (2026-10-07)

Made by an AI coding assistant that did not build the lab, in one pass: it read the spec's section 8, this record, the code and the wording, ran the lab in a browser by scripts of its own, and fixed what it found as it went. The sections above are the builder's and stand as they were written; where this section says a thing was changed, the lab is now as this section says. The spec's section 8 and `docs/for-institutions.md` were brought into line.

### How it was run

The production build, served locally, in headless Chromium 153 on Linux, by script.

- **One whole lab in Challenge to completion, four times:** by keyboard at 1024×768 (light) and 1366×768 (dark), and by tap at 820×1180 in each theme, in a browser context that emulates a touch screen. The keyboard runs put focus on a control and pressed a key; the touch runs tapped. Every run made the same mistakes on the way: at every station an observation with the solid and the colour of the liquid not the tube's; at stations 6, 8 and 10 a check before the tools were used; at station 1 a state that is not right, an equation that does not balance, the two sides exchanged, a formula that does not belong and "No reaction" where there is a reaction; at station 5 an equation where there is none; at station 7 a spectator left in the net ionic equation and a compound not split in the complete ionic one. 209 checks a run, all passing at the last run, the console empty.
- **At every station of each run:** that the words under the tube agree with what is drawn (a layer of solid or none, bubbles or none, the liquid's colour by the name the choices use) and with the lab's record; and, before the mix, after it, after the tools and after a recorded observation, a search of the text and the attributes of the station on the page for the hints, the lines that say what a correct observation holds, the notes and the three stored equations.
- **Apart from those runs:** reloads with an equation half built, after a check that found an entry not correct, in the middle of the second of two stations begun, and after completion; Restart, refused and accepted; five stored records that do not fit (another version, not JSON, a status its entries do not give, a formula off the palette, a plain string); two tabs on the lab; a change of mode in both directions in the middle of a station; the app's own reduced-motion setting with the system allowing motion, and the reverse; the two panels opened, dragged past each edge of the window by pointer and by touch, moved by the arrow keys, closed by Escape, left by Tab at either end, and the window made smaller under each; the Tab key walked through station 6 with its tube mixed (53 stops for 53 controls, each in view, none under the tab bar); the size of every control on the Lab tab, and after the change the hit area of each small one by tapping beside it; the length of a station's page at three window sizes.
- **The rest of the app:** Home, the list of labs and the command palette each showed the lab and reached it; Home did not fetch the lab's code; Explore, the periodic table, the titration lab, Learn, Settings and About loaded. The titration lab's primer paging and calculator were run by the builder's own script, and one Guided trial to a result of "Passed" by a script kept from that lab's own build. That script is older than the titration page as it now stands and fails 10 of its 58 checks on wording that has changed since; it fails the same 10, and passes the same 48, on a build of the main branch, so nothing in it is this phase's doing.
- **Automated:** the full check passes, with the tests at 2,811 where the build closed at 2,808; and the tests pass with the two git-ignored quotation fingerprints moved aside, the cases that need them skipped.

### What was found, and what was done

Each with how much it matters: **must** (a learner is stopped, loses work, is told something false or is shown an answer), **should** (a learner or a maintainer would plainly want it corrected), **taste** (left to the owner).

1. **must: a station's notes gave away its equations.** The notes came as soon as the observation was correct, in Guided and in Challenge. The note of station 5 says that the answer to all three equations is "No reaction"; those of stations 2 and 3 give the net ionic equation that is checked; that of station 1 the formula of the solid; one of station 6 names the gas. *Done:* the notes are shown once the station is done, under its equations. This departs from the spec as it stood (8.5 said "once its observation is correct"), which is changed; the owner may want it otherwise, for instance the notes of stations 6 and 8, which explain an observation and give away no equation, earlier than the rest. The record does not say which note is of which kind, so no such line was drawn.
2. **must: the primer said something that is false at station 6.** The card "When nothing happens" said that with no acid to meet a carbonate, a base or a metal there is no gas and no heat. Ammonium nitrate and sodium hydroxide give a gas with no acid in the tube. *Done:* the sentence also names a base meeting an ammonium ion.
3. **should (decided beforehand): the solubility table read "soluble" for the pair that reacts at station 6.** *Done:* the cell keeps the stored word and carries a footnote's sign, with words for a screen reader in its place; a line under the table says that the two make no solid but do react, giving ammonia, and names the primer's card on gases by its own heading. A test holds the marked pair to the record.
4. **should (decided beforehand): the question about a solid.** *Done:* "Solid in the tube once any reaction is over", and the feedback speaks of "the solid in the tube at the end".
5. **should (decided beforehand): a completed lab said "The lab is complete…" four times on a station.** *Done:* once, at the station's head; it is the description of each entry's button.
6. **should (decided beforehand): small touch targets.** *Done:* a hit area of 44 px each way, which draws nothing and takes no room, over the two buttons that open the panels and over every disclosure's summary on a lab page; and, beyond what was asked, over the list's button, Previous and Next, and a panel's grip and close button, which were 32 to 36 px. It is in the shell's stylesheet, so the titration lab has it too. Every box on both labs' pages was measured with the rule and with it switched off, and none moved.
7. **should: a check of the observations before the tools were used said "Choose one answer for each question"**, of questions that are disabled until a tool is used. *Done:* it says that some questions wait for a tool and to use the tool named under each.
8. **should: the thermometer gave a rise and left the answer to a guess.** The question's choices are "no warmer than before", "warm" and "hot"; "about 40 °C" is neither word, and a learner who used the thermometer alone had no way to tell. *Done:* the thermometer says "so the tube is hot", as the touch does.
9. **should: an open panel was left outside a window made smaller** (a tablet turned upright, a window resized), with its grip and close button out of a pointer's reach. *Done:* an open panel is held inside the window as the window changes. Checked in the browser; no automated test runs an effect.
10. **should: the primer described the solubility table as a list of pairs with the answer "beside them".** The page draws a grid. *Done:* the card says a row for each positive ion and a column for each negative ion, to find where the two cross, that any other pair is marked "not listed", and where the table opens from.
11. **should: the cards read first used "precipitate" before saying what one is.** The card that defines it is not one of the four. *Done:* the card on the three forms of an equation says what a precipitate is where the word first stands.
12. **should: two things in the lab's wording that nothing draws** (lines naming what goes into a tube, and a label "Record"). *Done:* taken out, with their tests.

### What was left for the owner

- **How long a station is, and how many taps an equation takes.** At 820×1180 station 1, in Guided, is 1.9 screens long before its tube is mixed, 2.5 after, and 4.0 with its three equations built and none yet checked; at 1024×768 those are 2.8, 3.8 and 6.0. A builder that is open with seven terms is a screen long by itself, because under about 510 px of width each term takes two rows; once its equation is correct it is one line. At station 1 a correct net ionic equation takes 10 taps (two for each of its three substances, two more for the coefficient 3, one for the state of the solid, and Check) and a correct complete ionic equation 26. A faultless lab is 450 taps, 378 of them in the thirty equations. All of it worked by tap; none of it is quick. Two things would cut it, and neither was done, because each changes how the builder works: a side that stays chosen until it is changed (one tap for a substance in place of two) would take the thirty equations from 378 taps to 273; and a coefficient chosen in one tap would save 8. The palette is also at the top of a builder and Check at its foot, so that with many terms the two are a screen apart.
- **The words "acid", "base" and "basic"** are used in the cards read first and nowhere defined in this primer. A definition wants a source and none was read for one.
- **A window made narrower than 768 px and then wide again** shows the stations afresh, as a reload does: what was chosen or built and not checked is gone, and the station shown is the one a reload would open on. The shell takes the bench off the page while the notice is shown, as it does for the titration lab.
- **The white solids of stations 4 and 9 on the white card** are told from it by an outline and by the words under the drawing. Whether that reads as a solid is for the eye.
- **The hit areas meet where two small controls are close.** Under the panels' two buttons, where the "Stations" button is 12 px below at widths that fold the list, the two areas share 2 px; between "Sources" and Next, 4 px.
- **The titration lab's own bench buttons are 32 px tall**, as they were. Not this phase's, and not changed.
- **A function that writes an equation in one line of plain text** is used only by the tests, as the thing the drawn line is held to. It was left.
- **The four things the builder marked for a second look:** the first two are items 3 and 4 above. The colourless liquid over the solids of stations 2 and 3, and the hydroxide formulas offered at those two stations with no row in the table to rule them out, are as they were; the second is the more awkward now that the note which explains it comes only when the station is done.

### What nobody checked

- **No person has used the page:** not by keyboard, not by mouse, not on a tablet. Every tap was made by script in desktop Chromium emulating a touch screen at 820×1180; no finger has touched it, and no real tablet or phone has shown it.
- **No screen reader.** The roles, names, descriptions and live regions were read by script. What is spoken, and when, has been heard by nobody.
- **No browser but Chromium 153, headless, on Linux.** Not Firefox, not Safari, not Chrome or Edge as installed on a person's machine.
- **Three window sizes:** 1024×768, 1366×768 and 820×1180, and for the panels a window shrunk to 800×500. The builder's script covered 768×1024 and 1920×1080 as well; this review did not go back to them.
- **No contrast was measured**, no browser zoom or enlarged text was tried, and no forced-colours mode.
- **How it looks** was not judged. Screenshots were taken and looked at only to see that nothing was broken.
- **The chemistry was read by an AI assistant and by no chemist or instructor.** The sources' pages are not kept, so no sentence was read against its source again; the three sentences changed in the primer rest on what the primer's own support lines already say of the same passages, and on the lab's own rules.
- **Guided was not run again to completion**; the builder's script did that. This review ran Challenge, and Guided at single stations.
- **The hazard text** was not read against the sheets.

### What a learner sees that is new or changed

- The observation's first question: "Solid in the tube once any reaction is over". In feedback: "Not yet. Look again at the solid in the tube at the end."
- Under the solubility table: "* Ammonium ions and hydroxide ions make no solid together, but they do react: they give ammonia. See "Gases and heat as signs of a reaction" in the primer." In the marked cell, for a screen reader: "see the note under the table".
- On a check before the tools are used: "Some questions wait for a tool. Use the tool named under each of them, then choose one answer for each question."
- The thermometer at station 8: "The thermometer rises by about 40 °C, so the tube is hot. That figure is idealised: it is worked out as if no heat escaped from the tube and the liquid were plain water, so a real tube warms somewhat less." (For a rise too small to feel, which no station has: "which is too little to feel"; for a warm tube: "so the tube is warm".)
- Primer, "Solubility and the solubility table": "The solubility table of this lab has a row for each positive ion and a column for each negative ion. Where a row and a column cross, it says whether the compound the two ions make is soluble or insoluble. To use it, take a positive ion from one bottle and a negative ion from the other, and find where the two cross. The table holds only the pairs that these ten stations can bring together; any other pair is marked "not listed". Once the lab is started, it opens from the "Solubility table" button at the top of the Lab tab."
- Primer, "The three forms of an equation": "Mixed, they give a bright yellow solid, lead(II) iodide. A solid that forms like this, out of two solutions, is called a precipitate."
- Primer, "When nothing happens": "If there is no acid to meet a carbonate, a base or a metal, and no base to meet an ammonium ion, there is no gas and no heat."
- No new sentence, but in a new place: "The lab is complete. Restart the lab to work the stations again." once at a station's head; and a station's notes under its equations, once the station is done.

## The tube made something to explore (2026-10-07, after the owner used the page)

Made by an AI coding assistant, after the review above. The sections above stand as they were written; where this one says a thing was changed, the lab is now as this one says.

**What the owner said.** At a station whose tube was mixed, the page said what is seen three times: in a sentence beside a small drawing, in the list "What to expect", and in the choices of the questions. That tires a reader. The owner asked for the expected observation to be closed, and for a larger picture of the tube in place of the sentence, to be explored with the pointer: the sections of what is in the tube, each showing what it is when the pointer is over it. The choices stay, to confirm what was seen.

**What changed.**

- The sentence beside the tube is gone. The tube is drawn 300 px tall, and a button lies over each of three sections of it: the surface of the liquid, the liquid, the bottom. A pointer over a section, focus on it or a tap outlines it and shows a callout beside it with what is seen there and nothing else. Beside the picture are the line "Hover over or tap each part of the tube to look at it." and a list of the three parts, each "looked at" or "not looked at yet" beside a mark.
- Each of the eye's three questions is closed until its part has been looked at, with a sentence under it such as "Not yet. First look at the liquid in the picture." In the engine a look is a use of the eye and is stored with the station, as a tool's use is. The stored shape takes three more values and the entry's version stays 1: the lab has not been released.
- In Guided, what a correct observation holds is no longer shown from the start. It is under the questions, in a list that is closed until it is opened, named "What a correct observation holds". Challenge shows nothing of it until an observation is recorded, as before, and then the same closed list.
- The callouts: "A rust-brown, gelatinous solid has settled here." (and the like for the other three solids), "No solid has settled.", "The white powder has dissolved. No solid is left here." and the same of the silvery metal ribbon, "The liquid is yellow-orange." (and each other colour), "Bubbles rise through the liquid and break at the surface." and "No bubbles rise."
- The engine's description of the whole tube (`describeStationResult`) is not on the page any more. It is kept as what the three sentences are held to in the tests.

**How it was checked.** Automated tests, 2,824 in all. The production build in headless Chromium by script: stations 1, 5, 7 and 10 in Guided and station 1 in Challenge, with a mouse and by keyboard at 1024×768 and by tap at 820×1180 in a context that emulates a touch screen, in both themes; that a question is closed until its part is looked at, that a reload keeps what was looked at, that nothing of what is seen or expected is in the page before a look, and that the console is empty.

**What nobody checked.** No person has used it, by mouse, by keyboard or by finger; no screen reader has spoken it; no browser but Chromium has drawn it. How the picture, its dashed edges and its callouts look is the owner's to judge. A pointer swept down the tube looks at all three parts at once and opens all three questions; no time is asked of it.

## A card of worked steps, and a panel of the bench's ions (2026-10-07, after the owner tried the equations)

Made by an AI coding assistant, after the section above. The sections above stand as they were written; where this one says a thing was changed, the lab is now as this one says.

**What the owner said.** At a station's three equations the owner, who is not a chemist, did not know how to do them, and asked whether a learner can get everything needed from the primer and the periodic table in the app. The honest answer was no: the primer showed the three forms on one example and said that an equation must balance, but never walked from two bottles to three equations, did not say that an ion can be a group of atoms, and nowhere listed the ions of this bench with their names and charges.

**What changed.**

- **A new primer card, "Working a station, step by step"**, straight after "The three forms of an equation" and read first: the primer has eleven cards and five are read first. It works calcium chloride solution with potassium phosphate solution, which are at no station, in eight labelled steps, and ends by saying where each thing is on the page. The example was chosen because its answer cannot be copied onto a station, because it needs a coefficient other than 1 and a group ion in brackets, and because the book the lab's solubility data rests on prints the formula of its solid and gives its solubility. Its equations are 3CaCl₂(aq) + 2K₃PO₄(aq) → Ca₃(PO₄)₂(s) + 6KCl(aq); 3Ca²⁺(aq) + 6Cl⁻(aq) + 6K⁺(aq) + 2PO₄³⁻(aq) → Ca₃(PO₄)₂(s) + 6K⁺(aq) + 6Cl⁻(aq); and 3Ca²⁺(aq) + 2PO₄³⁻(aq) → Ca₃(PO₄)₂(s).
- **Two paragraphs in "Ions in solution"**: that some ions are a group of atoms that stays together, with the five the bottles give; and what an acid and a base are, with "basic". This closes the item on those three words under "What was left for the owner", above. No other shown sentence of the primer was changed.
- **A third floating panel, "Ions on this bench"**, beside the solubility table's: a table of the sixteen ions with name, formula, charge, one atom or a group, colour in solution and the bottles that hold each, and a second table of what is written whole. For it the record stores a name, with a source, for each of those ions and for water and the three gases.
- **One sentence of a station was changed, and not for its meaning.** With section 2.7 of the book among the pages the lab rests on, the note of station 5 shared six words running with it by chance, because both name two chlorides one after the other. The note now names iron(III) chloride before cobalt(II) chloride.
- **The shared floating panel** is placed again by its real height once it is drawn. The new panel is taller than a window 768 px high allows and opened with its foot outside it.

**How it was checked.** Automated tests, 2,897 in all: every equation of the new card for balance in atoms and in charge, the net one as the complete one less its spectators, the two counts of step five against the formulas, the first card's five group ions against the record, the panel's rows and markup against the record, and the no-quotation test over the new text, against a fingerprint made again with section 2.7 in it. The production build in headless Chromium by script, by keyboard at 1024×768 and by tap at 820×1180: that the card is the fifth topic with its ten paragraphs and three equations, and that the panel opens, moves by the arrow keys and by its grip, stays inside the window and closes; the console was empty.

**What nobody checked.** No chemist or instructor has read the card, the two paragraphs or the panel; the chemistry was checked by the assistant that wrote it, against the book's sections fetched again that day. No person has used the panel, and no screen reader has read its tables. How the card and the panel look is the owner's to judge. The card is long: about three screens at 1024×768.

**What is awkward and was left.** In a window 768 px high the panel scrolls inside itself, and its second table is below the fold. A wheel or a finger scrolls it. By keyboard, Page Down scrolls it once focus is in the panel, and a floating panel does not take focus when it opens: from its button the panel is 53 presses of Tab away at an unmixed station, as the other two panels are. Moving focus into a panel when it opens would mend that for all three; it changes how the shared panel behaves, and was not done without the owner's word. At 1024×768 the open panel also lies over the bar of tabs and its own button until it is moved or closed.
