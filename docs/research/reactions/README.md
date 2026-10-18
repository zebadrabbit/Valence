# Types of reactions lab research record

The inputs the types of reactions lab is built from (spec section 24), where each came from, and what could not be found. Everything was gathered on 2026-10-12. Nothing in this folder is loaded by the app.

`npm run build:data` reads this folder and writes `src/chem-data/reactions/reactions.json` and the lab's entries in `src/chem-data/sources.json`. The build stops, and writes nothing, on an input it cannot hold to its sources, on an equation that does not balance in atoms and in charge or is not in its lowest whole numbers, on a tile an equation needs that its station does not offer, on a station whose tiles are all needed, on a field that is asked with no stored choice or no look to open it, and on an order of the metals that is not the order their tubes show (`scripts/reactions-lib.mjs`).

| File | What it is |
| --- | --- |
| `reactions.json` | The lab's record: the nine things on the benches; the twenty-two species an equation is built from; the four kinds with their patterns in letters; the choices an observation is recorded from; the order of the three metals; the five stations, each with its vessels, its tiles and the notes shown when it is done; and three parameters, each with its rationale |
| `sources/MANIFEST.json` | Every source of that record and of the primer (`src/chem-data/reactions/primer.ts`): its address, its citation, and rows that say what it prints and where, each naming the stored values it supports |
| `hazards.json` | The hazards of seven of the nine things on the benches: for each, the heading over its statements, the signal word, the statements and the note. The other two, the 1 M hydrochloric acid and the 0.5 M iron(III) chloride, carry the aqueous reactions lab's records unchanged (`../phase-4/hazards.json`) |
| `sources/hazard-manifest.json` | The seventeen documents behind those seven, with rows that say what each prints, and what was read and not carried |
| `sources/quotation-fingerprint.json` | Not kept in the repository (`.gitignore`): the hashes of every run of six words in the pages read, which the no-quotation tests compare against. Made with `node scripts/fingerprint-sources.mjs <folder of the pages> 2026-10-12 docs/research/reactions/sources`; where it is absent those tests are skipped |

## The stations as stored

What is seen is stored as seen, in the words of a choice; what it is, and why, is in the notes of a station, which are shown once the station counts.

| Station | Before | After | Kind | Equation | Seen: source |
| --- | --- | --- | --- | --- | --- |
| A. Zinc in copper(II) sulfate solution | a grey piece of metal; a blue liquid | a red-brown coating; a paler blue liquid | single replacement | Zn(s) + CuSO₄(aq) → ZnSO₄(aq) + Cu(s) | a microscale class experiment's teaching notes (zinc turns red-brown, the blue fades) |
| B. Magnesium in a flame | a silvery strip | a white light; a white powder | combination | 2Mg(s) + O₂(g) → 2MgO(s) | a page on the second group's metals with oxygen (an intense white flame, a white ash) and an open textbook (a fine powder of the oxide) |
| C. Three metals in hydrochloric acid | a colourless liquid; a silvery, a grey and a reddish piece | magnesium bubbles fast, zinc slowly, copper not at all | single replacement, twice; no reaction | Mg(s) + 2HCl(aq) → MgCl₂(aq) + H₂(g); Zn(s) + 2HCl(aq) → ZnCl₂(aq) + H₂(g) | a page on metals with dilute acids, with the reactivity series |
| D. Calcium chloride and sodium carbonate solutions | two colourless liquids | a white solid | double replacement | CaCl₂(aq) + Na₂CO₃(aq) → CaCO₃(s) + 2NaCl(aq) | two pages on the reactions of the calcium and the barium ion |
| E. Hydrogen peroxide with iron(III) chloride | a colourless liquid | bubbles; the tube warmer | decomposition | 2H₂O₂(aq) → 2H₂O(l) + O₂(g), with FeCl₃ as the catalyst and in no equation | a magazine's laboratory problem and an open textbook's page on catalysts |

**The order of the three metals** is magnesium, zinc, copper, with hydrogen after zinc. It is stored from a cited reactivity series (`basis: "activity-series"`), not worked out from standard potentials: the series is what an introductory learner is given, and it needs no arithmetic. The NBS tables the other labs use would give the same order from the Gibbs energies of formation of the three aqueous ions; that was not done, and the scanned tables were not read for this lab.

**The tiles** of a station are the species its equations need and at least two that none of them needs. Station C offers copper(II) chloride, so that an equation for copper can be built by a learner who thinks copper reacted; station E offers iron(III) chloride, the catalyst, which belongs in no equation.

**The parameters** are three amounts of liquid (3 mL in a tube, 2 mL of each solution that is mixed, 0.25 mL of drops). They set the level a tube is drawn to and nothing else.

## How each kind of value was read

- **What is seen at a station.** From pages that say what is seen: a class experiment's teaching notes, two pages of a chemistry teaching site, two pages of a textbook module on the reactions of single ions, a magazine's laboratory problem. Where the page is about something near to this bench and not this bench itself, the manifest row says how far the stored value goes beyond it (see below).
- **The kinds and their patterns in letters.** Four pages of one open introductory textbook, one for each kind, each of which prints its pattern. The record stores each pattern as printed.
- **The equations.** Three are printed by a source with their states (magnesium and oxygen; magnesium and zinc each with hydrochloric acid); the peroxide's is printed without states; two are written by this project from what sources print (zinc with copper(II) sulfate, from the same page's equation for iron; calcium chloride with sodium carbonate, from a general form and a table of solubility). The build balances every one by counting atoms.
- **The formula and state of each species.** From the equation of a source that prints it, named in the manifest row. Two formulas are read in safety data sheets' tables of composition (copper(II) chloride, iron(III) chloride).
- **What a metal looks like.** From the line of characteristics on a page for each metal's ions, in the pages earlier labs saved.
- **Hazards.** The default supplier's safety data sheets, read in a browser, since the site draws them by script; NOAA's records, found in the site's lists by letter and never by its search. Fourteen of the seventeen documents are ones earlier labs list: each was read again for this lab in the page that lab saved, after the saved file was checked against the hash that lab recorded, and none was fetched again.

## Where the lab is other than spec section 24 has it

- **Station E asks for bubbles and for warmth, and not for the colour of the liquid.** No page that was read says what colour the tube is. The tube is drawn pale yellow after the drops, which is this lab's own reading of a page that calls solutions of the iron(III) ion yellow; the manifest row says so, and the colour is in no note.
- **At station E the bubbles are recorded as bubbles or none, with no rate.** Station C has three rates, since the comparison is what it is for. No source gives a rate for a tube of 3% peroxide with a few drops of the catalyst.
- **A learner who says that nothing reacted is asked for no equation.** Spec 24.2 has an equation at every station, and one for each metal that reacts. Whether an equation is asked depends on the kind the learner said, not on the right kind, so that in Challenge the page does not show which tubes react.
- **A whole multiple of an equation is taken as right** (2Zn + 2CuSO₄ and so on), as the aqueous reactions lab takes it. The build holds the stored equations themselves to their lowest numbers.
- **The primer's everyday double replacement names its chemical.** The card said that "a water softener" trades partners with the calcium in hard water. The source has sodium phosphate bringing the calcium down as solid calcium phosphate, in some softeners that are sold; a reader would take "a water softener" for the kind that swaps ions on a resin and leaves no solid. The card now names the phosphate.
- **The page asks the order of the metals as two choices,** the most active and the least, and says that a tube is warm only once it has been felt. Section 24.6 of the design spec lists where the page is other than 24.2.
- **The primer gives no everyday case of a single replacement.** Spec 24.4 asks for one of each kind; none was found in a source that was read.
- **The primer does not name the three metals in order, nor any reaction of the bench.** Spec 24.4 has "the order they come in" as a topic. The primer is not kept back in either mode, and the order is an answer the lab asks for, so the card gives the rules the order is found by and names other metals at the ends of the series.
- **Burning magnesium and its ash.** Spec 24.1 has a white powder; the note says, as the source does, that the ash of magnesium burnt in air holds magnesium nitride with the oxide, and that the equation is for the oxide alone. No proportion is given, since the source gives none.

## What could not be sourced, or only in part

- **The colour of the liquid at station E** while it bubbles, and afterwards. Not found. Not asked, and in no note.
- **A page that describes calcium chloride mixed with sodium carbonate itself.** Not found. The white solid rests on a page that says a carbonate that dissolves gives with the calcium ion a solid like barium's, and on the page that calls barium's white; both are about ammonium carbonate. The equation is written from a general form and a table of solubility. That sodium carbonate does as ammonium carbonate does is this lab's reading.
- **A page that describes zinc in a tube of 1 M copper(II) sulfate.** The source has a few drops of a 0.2 M solution and says that the blue fades. That a tube of the 1 M solution with one piece of zinc is paler, and not colourless, is this lab's reading of that word.
- **How fast each metal bubbles in 1 M acid.** The source says that the reaction is faster the higher a metal stands in the series and that zinc is a little slow in cold dilute acid, and gives no rate. Fast and slow are this lab's two words for that; a real piece of zinc with a clean surface in 1 M acid may bubble very slowly indeed.
- **That the tube of station E is felt to warm.** The sources give the heat of the reaction (it is given out) and say that heat comes off as a catalyst speeds it. Neither gives a rise in temperature for 3 mL of 3% peroxide. See the next section.
- **An everyday single replacement.** Not found in a source that was read.
- **That a catalyst is written over the arrow.** A convention this lab uses; the source says only that a catalyst has no place in the equation for the whole change.
- **A second document for 3% hydrogen peroxide, for sodium carbonate solution and for copper(II) sulfate solution.** The peroxide's note rests on the default supplier's sheet alone; the carbonate's on that supplier's two sheets; the copper(II) sulfate's on that supplier's two sheets and NOAA's record of the solid. No document that was read classes copper(II) sulfate as a hazard to water life, so its note says nothing of drains; other suppliers' sheets, which were not read, may.

## What a chemist should look at

No chemist has read the record, the notes, the primer or the page's sentences.

1. **Station E is this lab's reading of the directions**, which name iron(III) chloride and nothing to go with it (spec 24.1). If the directions mean another reaction, the station is wrong as a whole.
2. **Does a tube of 3% peroxide with five drops of 0.5 M iron(III) chloride bubble plainly and warm enough to feel?** The decomposition of all the peroxide in 3 mL would warm the liquid by roughly twenty degrees if no heat were lost (worked from the −98.2 kJ/mol a source prints and the heat capacity of water; this working is not in the record), but how fast it goes with this little catalyst is not known to this project. If it is slow, the warmth may not be felt.
3. **The colour of that tube.** Iron(III) with hydrogen peroxide is often darker while it reacts than the pale yellow drawn. Nothing rests on the drawn colour, but it may be wrong.
4. **Zinc in 1 M hydrochloric acid** is often slow enough that a learner would call it no reaction for the first minutes, and faster on an impure surface. The lab shows slow bubbles.
5. **The fading of 1 M copper(II) sulfate with one piece of zinc** takes long, and the copper comes down as a dark, loose deposit as often as a red-brown coating. The lab shows what the source describes for a small amount.
6. **The white solid of station D** is drawn spread through the liquid, which is cloudy. In a real tube it settles.
7. **Hydrogen peroxide is taken as (aq) or (l)** in a built equation; every other species in one state alone. Water is (l) only, though some texts would write the peroxide's products otherwise.
8. **The shared note of the 1 M hydrochloric acid** says nothing of the hydrogen it gives with metals, which matters on this bench and not on the aqueous lab's first nine stations. The primer's safety card, and the notes of zinc and of magnesium, say it. The owner may want a record of this lab's own for the acid.
9. **Copper(II) sulfate and water life** (see the section before).
10. **Burning magnesium on a real bench** needs more than a note: the primer and the hazard record say what the documents say (the light, never water on the fire, dry sand), and a supervisor decides whether it is done as a demonstration.

## Read and not used

- A university course page on the types of inorganic reactions, with all four patterns on one page. Its address holds a course number, which this project's check of its own text for institution-specific patterns refuses in a primer's support line; four pages of the open textbook it is drawn from are cited in its place.
- The safety lines of the class experiment's page, which rest on a school safety service's cards: not a safety data sheet or a government record, and not used for hazards.

## Tried and not read

Nothing was refused. Two sites answered a request for their robots file with a page that says there is none (the chemistry teaching site and the university that hosts the magazine); nothing of theirs was closed, and four pages of the first and one of the second were read. A guess at the address of the teaching site's list of pages found no page, and that site was not asked again. No site's search was used.

## Read and not kept

Every source. No copy of any page is in the repository; the manifests record what each prints and where.

## The engine

`src/engine/reactions/` (spec 24.2, 24.3). A run of a station is stored as the list of things done in it and worked out again on reading; nothing is drawn by chance and there is no seed. The engine works out one piece of chemistry for itself: whether a built equation balances, by counting the atoms of its species. The types of a built equation and the check of the species on one side are in `src/engine/equation.ts`, which the aqueous reactions lab's check uses too.

## What nobody checked

No person has read any of it, and no chemist. The engine, the record and the wording were tested by scripts alone. The lab's page was built on 2026-10-12 and checked by script by the AI coding assistant that built it; what it ran, what it measured and what it did not check are in the design spec, section 24.6, and on the page for institutional reviewers. The lab's one deep review was held that day by an AI reviewer that had built none of it; the next section is its record. The scanned NBS tables were not read. The pages earlier labs saved were read again only where this lab stores something from them.

## The review of 2026-10-12

The one deep review of the phase, held when the screens were whole, by an AI reviewer that had built none of the lab: not the record, the hazards, the engine, the wording or the page. It worked by script in headless Chromium and by reading, on 2026-10-12 by the machine's own clock. It made the change the project's owner had decided on, worked the lab from Start to the line that says it is complete in each mode, and put right what it found in the same pass. It changed no stored observation, kind, equation or order. The page as it now is, is section 24.6 of the design spec.

### The change the owner had decided: two stations were too long

At 768 by 1024, 976 px of the window are under the tab bar. The lengths are from a station's head to the foot of its last card before the one that closes it, in Guided, by the pointer, measured on the build before the review and on the build after it.

| Stage | A before, after | B before, after | D before, after | E before, after |
| --- | --- | --- | --- | --- |
| Before anything is done | 467, 467 px | 467, 467 px | 467, 467 px | 467, 467 px |
| What is seen open | 795, 795 px | 853, 825 px | 613, 613 px | 695, 695 px |
| The kind open | 910, 828 px | 1,026, 907 px | 910, 810 px | 910, 810 px |
| The equation open | 1,001, 839 px | 1,117, 918 px | 1,051, 871 px | 1,001, 821 px |
| The equation built | 1,021, 859 px | 1,137, 938 px | 1,071, 891 px | 1,021, 841 px |
| Done, with its notes | 1,023, 951 px | 1,062, 972 px | 902, 830 px | 1,028, 956 px |

| Stage of station C | Before | After |
| --- | --- | --- |
| Before anything is done | 673 px | 645 px |
| What is seen open | 869 px | 841 px |
| One tube recorded (Challenge, by touch) | 1,379 px | 794 px |
| The kinds open | 1,281 px | 1,048 px |
| An equation open | 1,422 px | 1,109 px |
| An equation built | 1,442 px | 1,129 px |
| The order open | 1,178 px | 945 px |
| Done, with its notes | 1,268 px | 1,059 px |

So stations A, B, D and E are inside one screen at every stage, and station C is inside one until its kinds are asked and at most 153 px over one from there, where a screen and a quarter is 1,220 px. In Challenge by emulated touch no stage was longer than in Guided: station B 910 px at the most while it is worked, station C 1,125 px. What was done:

1. **An entry that is recorded is one row:** its lines, what is said of them, and "Change". The sentence had a line of its own under them.
2. **A picture is drawn short once what is seen of every vessel of its station is recorded:** the drawing alone, 200 units tall, with no room under it. What a part shows is then said in a box that hangs under the drawing, over what stands there, for as long as the part is looked at; a press goes through it. Every part is still there to be looked at.
3. **The line of a term's controls stands over the row of an equation, under the tiles.** As built the row kept the height of two lines from the start so that the buttons that raise and lower a number would not move as it took its second. They are now over the row, where nothing moves them, and the row takes its second line only when it needs it. At station D, the widest equation, the tiles stood at one place and "One more" at one place through four tiles and eight presses; "Record the equation" moved once, by 52 px. The shared builder's option is `toolsFirst`, which the aqueous reactions lab does not ask for.
4. **The disclosure with the pictures in words stands beside the one button** where the card has the width.
5. **Station C asks its kinds, its equations and the order once what is seen in all three tubes is recorded,** and not as soon as one is. With one tube recorded the page had the three full pictures over an open question of five choices, a stage the builder had not measured. Under each tube the recorded answer is a word and its choice with the tick of an answer found right before it; the four buttons that choose what is asked are a word each, in one line.

### What the review found, and what was done

- **Three answers were on the page before they were given** (changed), each behind a closed disclosure at the foot of every station, in both modes. Read in the browser in Challenge before anything was done. The list of a station's sources named the pages behind what is seen afterwards and behind the tiles: at the burning strip the one page on the kinds that carried "What is seen afterwards" was "Combination Reactions"; at the peroxide two pages on catalysts. Those are now listed once the station counts, with the other sources of answers. The hazard note of copper said that its piece goes into the acid "where nothing is seen to happen", and the note of the hydrogen peroxide that it slowly decomposes and that iron(III) chloride "make[s] it do so fast": both sentences are reworded, and what each sheet asks is kept. The notes of zinc and of magnesium still say that each gives hydrogen with acids, which is a hazard of the metal and is in the primer's safety card of any metal in acid.
- **Under each of the three tubes of a station C that has been checked, the sentence on what was found ran out of its column** (changed): "That is what it showed." is kept on one line, a column at 768 px is narrower than it, and the three ran into one another and out of the card. It was so as built, in the builder's own picture of the station done, which had not been looked at; the review saw it in its own. Each line under a checked tube now has its own tick or cross, and the sentence is there a screen reader's alone, as under a tube that is recorded and not yet checked.
- **In Challenge a tick stood beside a tube of station C as soon as its kind and equation were recorded** (changed), in the role of a step done, before anything was judged. Seen in the browser. A tick is now for an answer found right; what is recorded and not judged has a filled circle.
- **The Record tab told the reader to work a station again under a run left behind,** of a station that counts by a later run (changed). It says that the run does not count, or that it counts.
- **Guided's open hint could be closed by a press on the button over it** (changed): the hit area of its summary reaches upward when it is open, and lay over the lower part of "Record what is seen" and "Record the kind". Found by asking the page, point by point, which control answers. An open hint stands 16 px lower.
- **Before the strip burns its two parts were named for after** (changed): "Glance at the strip in the flame" and "Look at what is left", of a strip beside the burner. They are "Look at the strip" and "Look at the tongs" until it is held in the flame.
- **The primer's first card said that two cards can wait "until a station sends you to them"** (changed). No station sends a learner to a card. They can wait until the learner wants them.
- **The page's files had been run through a formatter with options of its own** (changed where a reader would notice): short literals broken over many lines. They are on one line each, as in every other lab's page files.

### The pictures, and what was measured of them

The picture of every station before and after its action was looked at: on the builder's sheet at 768 px in the light theme, on the sheets retaken after the review at 768 px in the dark theme and at 1280 px in the light, and one by one and larger at 768 px in the light theme. Ten whole pages of the builds the review made were looked at too, in both themes and at both sizes, and two of the build before it. The three metals of station C are plainly three; the tubes that bubble fast, slowly and not at all are told apart at a glance by how many bubbles there are and how large; the coated piece of station A reads as coated; the star with its rays reads as a light and the heap in the tongs as a powder. Each of those is also said in words when it is looked at, and none of the words says what a thing is.

One weakness was left: **the white solid of station D and the bubbles of station E are both white circles with a dark edge.** The solid's are small, many and evenly set, and the liquid is cloudy; the bubbles are seven, larger and scattered. The words of the look say which, station D asks only for a solid and station E only for bubbles. The spread solid is the shared tube's drawing, which the aqueous reactions lab uses.

Every picture stands on a white card in both themes, so its contrast is one figure. Measured in the page, as ratios of contrast: the ink that edges every piece of metal, bubble, light and powder is 10.4 against the card, 8.9 against the colourless liquid, 9.3 against the pale yellow and 4.4 against the paler blue. The fills, which are not what tells a thing: the grey metal 3.4 against the card and 2.9 against the liquid, the reddish 4.1 and 3.4, the silvery 1.3 and 1.1, the red-brown coating 3.2 against the paler blue; a bubble's white 1.2 against the liquid; the light and the powder are white on white and are their edges. The blue of station A before and the paler blue after differ by 3.8, so the fading is seen without telling two hues apart. The dashed outline of a part not yet looked at is 3.4 against the card, the outline of a part looked at 17.7. The grey and the reddish piece differ by 1.2 and are told by hue, by the names over their tubes and by the words of the look.

Text, measured for every piece on the Lab tab at eleven stages in both themes: the least is 4.7 in the light theme (the grey of a line that is not yet anything to do) and 6.9 in the dark. The words of a button that cannot be used now, which is drawn at half strength and still takes focus and says why, are 3.7 in the light theme and 4.9 in the dark.

### Looked at and left

- **The words of a short picture's part hang over the line and the "Change" under it** for as long as the part is looked at. A press goes through them.
- **A done action pressed again says "That has been done already."** and the sentence stays under the button for the rest of the run.
- **After a change of mode in the middle of a station, Guided shows what Challenge recorded with its marks** and says "Everything is recorded. Check the station." beside a button, though some of it is marked wrong. That is the engine's design: the learner may put it right or ask for the check.
- **A row emptied place by place leaves the last place emptied as the chosen one,** so the next tile goes there and not to the first place. The outline shows it.
- **Every tile goes in as (aq),** a metal and a gas too, as in the aqueous reactions lab.
- **Station A's notes say that zinc is the more active of zinc and copper,** which is part of the order station C asks for. They are shown once station A counts.
- **The picture in words says "Bubbles rise off the metal, slowly."** where the look says "from the metal".
- **"Hover over or tap each part of a picture"** said nothing of the keyboard, by which focus on a part looks at it. Changed on 2026-10-18 by the accessibility sweep to "Point at each part of a picture, or tap it or move to it with the keyboard, to look at it.", the form the calorimetry, freezing, clock, flame, mixing and hot and cold labs use; the aqueous, cations, Le Chatelier and red cabbage labs took the same change.
- **Under a tube the heading "What is seen" is of the same level as the tube's name.**

### What a beginner is not told before the notes

The lab is introductory and its primer is short. Three stations ask for something no sentence gives before the station counts:

- **Station B:** that burning in air is joining with the air's oxygen. The tiles offer oxygen, and Guided's row has two places before the arrow.
- **Station D:** which of the two products is the solid. Guided says only that a state is not right.
- **Station E:** that the iron(III) chloride is a catalyst and so is in no equation. The card on a catalyst is not one of the four to read first; Guided's row has one place before the arrow, and Challenge gives no such help.

None was changed: each would put an answer, or most of one, on the page before it is given. They are the owner's to weigh.

### What was read and worked again, and found sound

- **The six equations of the record,** balanced by hand, atom by atom: Zn + CuSO₄ → ZnSO₄ + Cu; 2Mg + O₂ → 2MgO; Mg + 2HCl → MgCl₂ + H₂; Zn + 2HCl → ZnCl₂ + H₂; CaCl₂ + Na₂CO₃ → CaCO₃ + 2NaCl; 2H₂O₂ → 2H₂O + O₂. And the primer's worked example, step by step.
- **Every sentence a learner sees:** the primer, the labels, the hints, the refusals, the outcomes, the notes and the nine hazard notes. No sentence of the page before a station counts says what a thing seen is.
- **Against the saved pages:** that the zinc turns red-brown and the blue fades; the intense white flame and the white ash with its nitride; that zinc is slow in cold dilute acid and that reactions are faster higher in the series; that the peroxide decomposes slowly by itself and −98.2 kJ/mol; the match and the phosphate of the primer; the sentences on not staring at the magnesium and not touching the metals; the peroxide sheet's signal word and its two statements. Other rows of the manifests were not read again.
- **The code:** the engine's states and the page's effects; a stored record that does not fit (six kinds of one were put in the store: each was set aside under a second key with a notice and the lab started fresh, and a sound one reopened at its station); the lint rule that keeps the app out of the engine's files; no test of the lab asserts nothing.

### What was run and measured

- **A whole lab in Challenge by emulated touch,** at 768 by 1024, on the build before the review and after each change: at each station a run recorded wrongly and checked, then worked again right. An equation with an empty side (refused, with its sentence); a species that does not belong; one missing; not balanced; a state; the catalyst on both sides; "No reaction" said of zinc and a reaction, with an equation, of copper; the order wrong, and one metal given twice (refused); whole multiples of three equations, which counted; the peroxide as a liquid, which counted. A reload in the middle of station C kept what was recorded and not what was only chosen. A change to Guided in the middle of station D marked what Challenge had recorded, and the station counted once the kind and the state were put right. Restart asked first and left a new lab. Counted in the live markup before each check: no tile and no place before a kind is said; then the station's six, seven or ten tiles and one empty place on each side, whatever the equation; no tick or cross but the action's own; no hint, no note, nothing over an arrow.
- **A whole lab in Guided by the keyboard alone,** at 1280 by 800 in the dark theme, by Tab, Shift+Tab, the arrows, Space, Enter and Delete, with nothing focused by script: every part looked at by moving focus to it; a wrong observation, a wrong kind and "No reaction" of the wrong tube refused; equations refused for a species that does not belong, a state, the balance and a species missing; a tile put in the place of another; a place emptied by Delete; a hint opened by Enter. Focus after each press: on "Change" after an entry is taken, on the button after a refusal, on a term's controls after Enter on its place, on the notes when a station comes to count, on the station's heading after Next and after "Work the station again".
- **Names and roles,** read from the browser's accessibility tree at three stages: a picture is an image with a name and a description; its parts are buttons named for what is looked at and whether it has been; a tile is its formula and its name; a place says its number, its side, what it holds and whether it is chosen; a term's group has its number in front, a group of four states each named in full, and its way out.
- **The size of everything to press and whose hit area answers where,** at twelve stages at both sizes, with the picture in words closed and open and each hint open, and at the foot with each of its disclosures open in turn: no button, choice, tile or place of a station under 44 px, the least part of a picture 49 px, and after the change to the hint no point of any control answers for another.
- **Motion:** with reduced motion asked for, no element with a transition or an animation over a millisecond.
- **The aqueous reactions lab,** whose builder is the shared one: at its first station, at 768 by 1024, the molecular equation built by emulated touch and the complete ionic and the net ionic by the keyboard alone, each found correct and stored, with no error. Its bank of tiles is under the row and moves: by 52 px as the row takes another line (at the first tile of the molecular equation, at the last of the complete ionic) and by 50 px more while a term's controls take two lines, as they do for Fe(OH)₃. That lab has done so since it was built and was left as it is. `toolsFirst` on its one call of the shared builder would put the tiles and the controls over the row, where neither moves.

### What nobody checked

No person has worked the lab, by hand, by keyboard or by touch. No screen reader was used. One browser, headless Chromium on Linux, and no real device. No chemistry instructor has read any of it. The page with its text enlarged, zoomed, or in a high-contrast mode was not looked at. The keyboard was used at one size and touch at one.

### For the owner, or for a chemist

The ten things listed under "What a chemist should look at" stand, station E first. To them the review adds: whether the notes of zinc and of magnesium should say that each gives hydrogen with acids on a bench whose third station asks which tubes react; the three things a beginner is not told; and the line of a term's controls over the row, which is a matter of taste and is one option of the builder to undo, at the cost of 52 px at every equation.
