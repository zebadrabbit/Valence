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
