# The mechanism timeline: record of the build of its page

Written on 2026-10-08, when the page was whole, by the AI coding assistant that built it. It says what was built, where that differs from the design spec (`docs/superpowers/specs/2026-10-03-valence-v1-design.md`, section 9) or from the instructions for the build, and why, and what nobody checked. The sources, the record, the pure model, the wording and the stored progress were built before the page and are not this record's subject, except for one correction made to them here and for a list of where they differ from the spec, gathered from the code and from `sources/README.md`.

## One correction to what was already built

**The scene's description gave energies read off the drawn curves.** `describeMechanismState` said where free energy and enthalpy stood at any position, part-way through a step too. Between the level a step starts at and the level it ends at, a curve is a smooth line chosen for the drawing, so that figure was not chemistry. The description now gives a step's own whole change, at the start of a chapter the total of the steps before it, and after the last step the total of all four. Between steps 2 and 3 it gives no total of enthalpy, because the two are one change. A test holds every figure it gives, at a thousand positions, to a step's own value or a sum of whole steps. The model's state still carries the cursor's two values, for drawing; its comment says nothing prints them.

## What was built

- **The page** at `#/learn/hcl-nahco3`, loaded lazily. Home, the Learn page and the search link it with its status. The Learn page is now a list, made from the same component as the list of labs.
- **The scene:** a 3D picture drawn from the model's state at the scrub position and from nothing else. Balls and sticks in the explorer's sizes and colours; a bond between two whole orders as its whole lines and one dashed line; the two ions as spheres of their stored radii with symbol and charge written on them; an electron pair on its way as a curved arrow with two dots on it; at the two bookends a drawn beaker laid over the scene.
- **Names in the scene:** a callout on the molecule or ion that is pointed at or tapped, and a list beside the scene with the same names, which puts the callout on a molecule when its name is focused or tapped.
- **The timeline:** Play or Pause, Previous and Next, a native range input, and the seven chapters marked under it.
- **The chapter in words:** heading, short text, the longer text closed, and a link to the chapter.
- **The energy panel:** a floating panel with the two curves and a cursor, what the current step changes, and behind disclosures a table of all four steps, the panel's notes, how each value was worked out, and the sources.
- **Challenge:** a question before each step, answered by one press, with feedback.
- **The scene in words,** in a closed disclosure, and in the scene's place where the browser has no WebGL.
- **Stored progress** through the labs' hook: mode, status, position and the first answer to each question.
- **Shared with the explorer and the labs, and made shared here:** the shapes of a 3D scene (ball, stick, click target, light, the watch for a lost context), which were inside the molecule viewer; the check for WebGL and the boundary that catches a scene's failure, which were inside the viewer's panel; the notice over a page and the link to the periodic table, which were inside the lab shell. The floating panel gained one option: where from the top of the window it first opens. Used as they were: the mode switch, the message line that says "Again:", the button that stays focusable, the inspector's disclosure and Sources control, and the hook that loads and saves progress.

## Where the page differs from the spec or from the instructions, and why

- **The camera's framing comes back when the timeline moves, not when the learner lets go.** Spec 9.1 says it resumes on release. A view that sprang back the moment it was let go could not be looked at, and a zoom by the mouse wheel has no release. As built, a turn or a zoom holds while the timeline is still; when the timeline moves the camera is the chapter's again at once, and if it moves while the learner is holding the scene, that waits until they let go. The cost: a step cannot be watched playing from the learner's own angle.
- **A step's notes are in the energy panel, not with the chapter's words.** The instructions put them with the chapter. Every one of them is about an energy: the note on step 1 that it is slightly uphill, and the notes on what is derived and what is not to scale. The note on step 1 shows under the step's values while the timeline is in step 1; the others are with how each value was worked out.
- **The track's marks show a step's number and nothing else.** The instructions ask for each step's real timescale as its label on the track. A chapter's share of the track is between 30 and 130 pixels on a tablet held upright, and the labels are up to seven words. The real timescale of the step the timeline is in is one line under the track, and the list of chapters gives a screen reader all seven names and the four timescales.
- **In the energy panel only the current step's values are open.** The table of all four steps, the panel's three notes, how each value was worked out and the sources are each behind a disclosure. With everything open the panel was taller than a tablet's window is.
- **The energy panel opens under the timeline in a window narrower than 1000 pixels,** so that on a tablet held upright it covers neither the scene nor the slider. In a wider window it opens at the top right, over the chapter's words, as the labs' panels do.
- **The answers to a question are buttons, not radio buttons in boxes.** The instructions ask for one press to answer. An arrow key chooses a radio button, so a keyboard would answer by moving. They are drawn as boxes of the same size.
- **Challenge keeps more back than the instructions ask.** A step's title is close to the answer to its question, so until the question is answered, or the learner has gone into the step by hand, the title is not on the track, on Previous or Next, in the slider's words or in the energy panel. While a question waits, the page also leaves out the step's real time, the split of the list into those that take part and those that look on, and the sentence of the scene's description that says which species the step is about.
- **A deep link saves nothing, and the address drops it at the learner's first action.** Opening a link is not an action of the learner's on the timeline, and Home should go on saying "Not started". Without the second half, a reload after moving on would go back to where the link pointed.
- **Previous always goes to the start of the chapter before,** not first to the start of the chapter the timeline is in; a button says where it goes, and can say only one place. In the first chapter Previous goes to the start of the track and in the last Next goes to its end, each named so.
- **Play takes one minute for the track, at one speed, and a move by hand stops it.** At the end the button offers to play again from the start.
- **Under reduced motion Play is not offered,** which the instructions allow, and one line says why.
- **There is no way to start over or to answer again.** The stored progress keeps the first answer to each question, as it was built to. "Clear my progress" in Settings is the only reset.
- **The run is saved at every frame while playing.** The labs save at each action. Here playing is one long action, and a reload in the middle should come back to where it was.
- **Only the two ions have their charge written in the scene.** The charge of the hydronium ion and of the hydrogen carbonate ion is in their names, in the callout and the list.
- **Species that look on are not dimmed.** The list says which take part.
- **The About page** has a paragraph naming the timeline's sources, as it has for each lab.

## Where what was built before the page differs from the spec

Gathered from the code, the build script and `sources/README.md`. Spec sections 9.1 and 9.2 now say each of these.

- A step has keyframes inside it as well as at its ends: fifteen keyframes in all.
- A keyframe also holds what the actors make up there, and what the camera frames; the camera is not in the step record.
- The authored choreography places a species by three anchors, not by a matrix, and a species stays where it was put until one of its atoms is placed again.
- An energy is a record of its own: value, cited or derived, the method, and its sources. The build works each out; none is typed in.
- A step can have no enthalpy of its own, and the next step's then covers both.
- A barrier can be a derived value, which the spec's list of "cited, or schematic" did not foresee. Step 3's is, by the Eyring equation.
- A bond that changes order is listed apart from bonds broken and formed.
- A timescale label is stored with its source or with the reason it has none; those of steps 1 and 4 have none.
- Every chapter, the bookends and the prologue too, has its text at two depths and the list of actors it is about.
- The acid constant was measured at 20.5 °C and is used at 25 °C.
- Steps 1 and 4 have no barrier.
- The enthalpy curve shows steps 2 and 3 as one change.
- One water molecule is in the scene from the start.
- In step 3 an O–H group turns in four moves before the protons move.
- The energy panel's note is longer than the spec's sentence.
- A question waits only at the very start of its step: a position a hair to either side is not asked.

## What a learner sees that is new wording

Everything the page says that is not from the timeline's record or from the wording written before the page is in `src/app/learn/text.ts`, with its tests. One paragraph is on the About page. The sentences of the description's energies (the correction above) are in `src/mechanisms/describe.ts`.

## What was checked, and how

- **Automated tests:** 3,300 in all at the close. Those for the page are in `src/app/learn/`: the drawing against the model, the page's words, the slider and its buttons, the chart's geometry, and the page's markup in each state.
- **By script in a browser:** the production build in headless Chromium 153, by keyboard at 1024×768 and by tap at 820×1180: the whole timeline in Guided, Play to the end, a frame compared both ways in words and in pixels, each deep link, the energy panel open while scrubbing, Challenge with an answer that is not right and one that is, a reload in the middle, reduced motion, a context with no WebGL, both themes, a stored record that does not fit, and Home and the labs loading without the 3D code. 200 checks, all passing at the last run, with the console empty and nothing requested but the app's own files. The script is not in the repository. `docs/for-institutions.md` lists what it covered.
- **One check failed once.** In one run of five, the picture of the scene taken a little after a drag differed from the one taken just after it. It passed in every other run, and in three runs of a script written to catch it. The cause was not found.

## What nobody checked

- **No person has used the page.** Nobody sat at a keyboard, and nobody has touched it on a tablet.
- **How it looks:** the scene, the size of the ions beside the molecules, the arrows, the beaker, the chart, the spacing and the size of the panel are the owner's to judge by eye. Screenshots were taken only to see that nothing was broken, clipped or black.
- **No screen reader**, no browser but Chromium, no measurement of contrast, no browser zoom or enlarged text.
- **Turning the scene with a finger, a pinch, and the mouse wheel** were not tried; a drag with a mouse was.
- **The page open in two tabs** was not tried.
- **No review by a reader who did not build it.** The one deep review of the phase comes after this and is not part of it. That covers the chemistry too: no chemistry instructor or chemist has read the chapters, the questions or the energies, or looked at the choreography.
- **The new wording** has been read by nobody but the assistant that wrote it.

## What looked worth a second look once it was on the screen

None of these was changed.

- **The solid's two ions are in the scene before mixing.** In the prologue the text says this is the acid before anything is added, and the scene shows the sodium ion and the hydrogen carbonate ion a little way off, side by side.
- **The first question is close to answered by the scene.** Before step 1 the scene and the list already show a sodium ion and a hydrogen carbonate ion as two named things, and the right answer is that the solid comes apart into those.
- **The two ions are large beside the molecules.** A molecule's atoms are balls a quarter of their van der Waals radius and the ions are spheres of their whole ionic radius, as the spec asks. The sodium ion is drawn about as large as the hydrogen carbonate ion beside it, and the chloride ion larger than any molecule.
- **In step 4 the carbon dioxide passes in front of a water molecule,** seen from where the camera stands. The two are several ångström apart, but it can look as if one went through the other.
- **An arrow from a lone pair starts at the centre of its atom,** inside the ball, because the model gives a lone pair's place as its atom's. The arrows are short, under an ångström, and are drawn with a deep bow so that they show.
- **The arrows are there at the first frame of the move in which bonds change,** before anything has moved, pointing at a bond that is not yet drawn.
- **A species keeps its name until the keyframe at which it has become something else.** Through the whole of the proton's move in step 2 the callouts say hydronium ion and hydrogen carbonate ion, and carbonic acid from the move's last frame.
- **At the start of several chapters the camera frames a wide scene,** with a radius of seven to eleven ångström, in which the molecules are small on a tablet and an ion's label is hard to read.

## The deep review of the phase (2026-10-08)

Written by the AI coding assistant that made the one deep review of the phase. It had built none of it. It read the spec's section 9, this record, the sources' README, the model, the build script, the page and the scene, and the difference from the main branch for what the phase changed outside its own folders; it drove the production build in a browser; and it changed what it found in the same pass. Everything above this section is as its author left it, and where it and this section differ, this section is the later.

Nine changes were decided before the review began and were made whatever else was found. The rest is what the review found.

### The nine decided changes

- **"Before mixing" no longer shows the solid.** An actor can name the chapter it enters at. The record still places every actor at every keyframe, and `state`, the list and the description leave out what has not been added yet, so the prologue is the acid alone. The solid's six atoms enter at the start of step 1. Spec 9.3 now says that its tests of the same atoms and charge are of the record, and that continuity is of every atom that is in the scene on both sides of a boundary.
- **The picture does not answer step 1's question.** A keyframe can hold species together as a unit. The sodium ion and the hydrogen carbonate ion are "unit of solid sodium hydrogen carbonate, NaHCO₃" in the callout, the list and the description until the move that parts them is half done, and no charge is written on the sodium until then. Besides that, the acid now starts as a close group and the solid comes down into the picture from above it: when the question is asked the solid is out of the picture, in a picture of any shape from square to very wide, and a test holds that.
- **Names follow the chemistry.** A species is named from the bonds at the scrub position, where a bond counts once it is more than half formed and until less than half of it is left. The hydronium ion is a water molecule from the middle of the proton's move, and carbonic acid is carbon dioxide and water from the middle of the relay. The description was reworded where this left two molecules of one name in a sentence ("the oxygen of one water molecule and a hydrogen of another", "two of the three water molecules").
- **One scale for every ball.** An ion is drawn at a quarter of its ionic radius, as an atom is at a quarter of its van der Waals radius. The symbol and charge no longer fit on the ball, so they are written beside it, at a size that holds on the screen, in dark ink in the light theme and light ink in the dark one. The helper line under the scene says that every ball is drawn much smaller than the atom or ion it stands for, so that the bonds can be seen. A sodium ion's ball is now a little smaller than a hydrogen's, which is what the two cited radii give.
- **Step 4.** The path was changed, not the camera: the carbon dioxide leaves up and to the right, where nothing is, and the water made in step 2, which it used to pass in front of, moves off upward during step 3. A test projects every ball onto the picture and holds the carbon dioxide at least half an ångström clear of touching anything else all through the step.
- **Framing.** A keyframe's frame now names species, not atoms, and the build gives the camera the smallest sphere that holds every atom of them. With the acid drawn close together at the start, the camera's sphere is never wider than 4.5 Å, where it was up to 11, and under 3.5 Å wherever bonds change. Tests project the scene as it is at 1024 by 768 (a picture of 465 by 384) and on a tablet held upright (549 by 320): what a chapter is about is whole in the picture when the chapter begins (but in step 1, whose solid comes into the picture and is whole in it half-way through), both ions of the solid are whole when step 1 ends, the two that react are whole all through each move in which bonds change, and the carbon dioxide is whole for the first half of step 4.
- **Electron-pair arrows.** An arrow starts at the edge of the atom a lone pair is on, round from the bond the pair becomes, or at the middle of the bond a pair comes from. It ends at the middle of the bond the pair becomes, between the two atoms as they are, or at the edge of the atom it stays on. It bows round that atom's ball, is thicker and has a larger head, and is drawn flat to the chapter's camera and over everything else, so that no ball hides it. All five arrows of step 3 are shown together: once they were flat and on top they could be told apart, so they were not split up.
- **Start again** is a button beside the mode, there once a run is stored. It asks first, with the browser's own question as a lab's Restart does, then puts the run at the start with nothing answered, in the mode it was in. Focus stays on the button and one line says what happened.
- **Saving.** Playing is shown frame by frame and written where a frame enters a chapter and where playing stops: Pause, a move by hand, a question, the end, the reduced-motion setting turned on, the page left or closed. A whole play wrote the run seven times in the browser, where it wrote some sixty times a second. A page closed in a way the browser gives no notice of comes back at the start of the chapter it was in.

### What the review found besides, and what was done

Each was fixed unless it says otherwise.

- **The energy panel answered Challenge's questions (must fix).** It kept back a step's name and nothing else. The note on step 1 named the ion the solid gives; how each value was worked out printed the change it was worked out over, NaHCO₃(s) → Na⁺(aq) + HCO₃⁻(aq) for step 1; and the sources were listed by titles such as how fast a proton moves to a hydrogen carbonate ion. While any step's name is kept back the panel now gives figures and no words about them, with one line that says the notes, the working and the sources come once every question is answered. Keeping back only the steps still ahead was tried first and was not enough: the working of step 2 says that the textbook constant counts dissolved carbon dioxide as the acid, which answers step 3.
- **One piece of feedback gave away the next answer (must fix).** A wrong answer to step 1's question was told that a hydrogen carbonate ion then has to take a proton from the acid. It now says only that more has to happen first. A test holds each question's prompt, answers and feedback clear of the words the later right answers turn on.
- **The scene in words described molecules where a beaker is drawn (should fix).** At the two bookends the words listed what is in the 3D scene, which is not shown there, and at the end a carbon dioxide molecule that has left. They are now the chapter, the picture of the beaker and, at the end, the totals. The model hands over its description sentence by sentence, which also ended the page cutting one sentence out by the words it begins with.
- **Step 4 said the sodium ion took no part in any step (should fix),** and so did two pieces of feedback, while step 1 lists it as taking part. Reworded.
- **"Its molecules gather into bubbles" (should fix)** followed a sentence about the water and read as the water's molecules, which is the misconception one of the wrong answers offers. Reworded.
- **The note on step 1 (should fix; the spec's own sentence, changed).** "It dissolves because the acid removes HCO₃⁻ as it forms" reads as if sodium hydrogen carbonate did not dissolve in water. It is uphill only when both ions are at 1 M, and they start far more dilute. The spec's section 9.2 keeps its sentence and gives the one as built after it.
- **Step 3's label, "the slow step" (should fix; the spec's own, changed),** stood beside two steps labelled in seconds. It is the slower of the two steps that change bonds.
- **Step 1 said that pulling the ions out of the solid takes in heat (should fix).** The enthalpy the record has is that of dissolving as a whole. Reworded.
- **Enthalpy was named and never explained (should fix).** The panel's note now says what it is.
- **Nothing a learner reads said that the path is the project's own drawing (should fix).** It was in the panel's Sources control and on the About page. The first chapter's longer text now says it of how the molecules move, and step 3's of how the hydrogen crosses.
- **A window made narrower with the page open scrolled sideways (must fix).** The scene's column sized itself to the canvas, so a tablet turned from landscape to upright kept the scene at its old width: 879 pixels of page in a window of 820. A fresh load at each size was right, which is how the build's own check of sizes passed.
- **A turned scene stayed turned through "Before mixing" (should fix).** The framing came back only where the chapter's own camera moved, and in the prologue it stands still, so the helper line under the scene was not true there. It comes back at every move of the timeline.
- **The sodium ion left the picture half-way through step 1 (should fix),** at the moment its charge is first written. It now parts from the hydrogen carbonate ion by an ångström and a half within the step, where both are in view at its end, and drifts on in step 2.
- **A callout could name the wrong thing (should fix).** A species is looked at by its place among the scene's, and with a pointer resting on the scene while the timeline moved, the place became another's when the solid came apart. The look is dropped when the scene's species change.
- **"Decomposition" ran over the next column in the panel's table (should fix).** The first column is wider.
- **A tab that was playing would have written its place over another tab's (should fix, and new with the change to saving).** It stops and takes the run the other tab saves, as the labs' pages do.
- **In the dark theme an ion's charge was a pale smudge (should fix, and new with the change of scale),** since the writing had moved off the ball onto the page's background.
- **Not changed: the last question is largely answered by the first chapter,** whose longer text says the fizz is carbon dioxide leaving. That sentence is the premise of the whole timeline. What the question still asks is what becomes of the ions. For the owner.
- **Not changed: the height of the scene.** On a tablet held upright the scene is 549 by 320 pixels in a window 1,180 tall. Framing closer made the molecules about twice as large as they were; a taller frame would do as much again, and is a matter of layout. For the owner.
- **Not changed: the arrows are there from the first frame of the move in which bonds change,** before anything has moved. Noted above by the builder; it reads as an announcement of what is about to happen.

### Every sentence a learner sees that was written or changed

In the record (`docs/research/phase-5/mechanism.json`):

- The solid's name, new: "unit of solid sodium hydrogen carbonate", written NaHCO₃.
- First chapter, longer text, added: "How the molecules move and turn along the way is this timeline's own drawing, not a path that has been measured."
- Step 1, longer text: "Dissolving this solid takes in heat." It was "Pulling the ions out of the solid takes in heat."
- Step 1, note in the energy panel: "Slightly uphill when both ions are at 1 M. It dissolves all the same: the ions start far more dilute than that, and the acid removes HCO₃⁻ as it forms."
- Step 1, feedback to "It gives off carbon dioxide at once": "The carbon dioxide comes later, and more has to happen before it can. First of all, the ions of the solid separate."
- Step 2, feedback to "goes back to the sodium ion": "The sodium ion stays on its own, with water round it. It takes no part in this step or in any that follow."
- Step 3, real time: "tens of milliseconds; the slower of the two steps that change bonds".
- Step 3, longer text, from its fifth sentence on: "That oxygen, now with two hydrogens, breaks away from the carbon as a water molecule. The carbon is left with a double bond, two shared pairs of electrons, to each oxygen that stays: carbon dioxide, still dissolved. A carbonic acid molecule lasts about 60 thousandths of a second at room temperature, far longer than the step before. How the hydrogen crosses is this timeline's own drawing, not a measured path." The fourth sentence lost a word: "gives one of its own to the other oxygen". The trims made room for the last sentence inside the limit the wording's tests set.
- Step 4, short text: "The carbon dioxide molecules gather into bubbles, rise and leave."
- Step 4, longer text: "The sodium ion has done nothing since it dissolved, and the chloride ion nothing at all: both stay in the water."
- Step 4, feedback to the right answer: "Yes. The carbon dioxide leaves as gas, which is the fizz. The sodium ions and the chloride ions are not changed by any of this, and stay in the water."
- The energy panel's note, second sentence, added: "Enthalpy, H, keeps count of that heat: where ΔH is above zero, heat is taken in."

On the page (`src/app/learn/text.ts`):

- Under the scene, added to the helper line: "Every ball is drawn much smaller than the atom or ion it stands for, so that the bonds can be seen."
- The mode's line for Challenge: "Challenge: before each step you are asked what happens next. Your first answer is the one kept, until you start again."
- "Start again"; its question, "Start this timeline again? Your place on it and your answers to its questions will be erased, and there is no way to bring them back."; and what the line says after, "The timeline is at its start again, with nothing answered."
- In the energy panel in Challenge: "The notes on these figures, how each was worked out and the sources are here once every question is answered: they give some of the answers away."

In the scene's description (`src/mechanisms/describe.ts`): "a unit of solid sodium hydrogen carbonate"; "two of the three water molecules" where two of several alike take part; "a water molecule" where the scene has more than one; and "the oxygen of one water molecule and a hydrogen of another".

### What the pictures showed after the changes

The reviewing assistant looked at screenshots of the scene's frame at the start, the middle and the end of every chapter, at 1024 by 768 and at 820 by 1180 in the light theme and at 1366 by 768 in the dark one. This is what it saw. It is one assistant's reading of pictures, and no substitute for the owner's eye.

- **In the beaker:** the drawn beaker of acid with the powder on a spatula; the grains fall to the surface as the chapter goes by.
- **Before mixing:** the hydronium ion, the chloride ion with Cl⁻ beside it, and one water molecule, close together, all whole, nothing else, and nothing moving.
- **Step 1:** at its start the same picture as the prologue. The unit of the solid comes in from the top, cut by the edge while it does. At the middle it is alone in the centre, the hydrogen carbonate ion and an unlabelled sodium ball, with one hydrogen of the acid's water showing at the left edge. At the end the two ions are apart and whole, Na⁺ is written beside the sodium, and the acid's three species are back in the picture.
- **Step 2:** the hydronium ion above the hydrogen carbonate ion, whole; they close in; then two arrows, one from the edge of the hydrogen carbonate oxygen to the middle of the new bond and one from the middle of the old bond back onto the hydronium oxygen, with both bonds dashed. The chloride ion is half cut by the left edge while the camera is at its closest.
- **Step 3:** carbonic acid and the relaying water fill the picture; one O–H group turns; then five arrows round the ring of six atoms, each with its two dots, with three bonds dashed and thinning and two growing. The water made in step 2 leaves by the top during the turn.
- **Step 4:** carbon dioxide beside two water molecules; it moves up and to the right through empty space, is whole at the middle of the step and out of the picture by its end, where three water molecules and the chloride ion are left.
- **Back in the beaker:** the beaker of salt water, with four bubbles that fade to none.

### Left for the owner to judge by eye

- The five arrows of step 3 together, and whether they should be shown one move at a time after all.
- The size of the two ions now that they are at the atoms' scale, and the writing beside them.
- The sodium of the solid with no charge written on it until the solid has come apart.
- Species that look on and are cut by the edge of the picture, the chloride ion in step 2 most of all.
- The solid coming into the picture from outside it, and the carbon dioxide going out of it.
- The height of the scene on a tablet.
- Where the energy panel opens on a tablet held upright: under the timeline, over the right-hand part of the chapter's words or of a question's answers.
- The energy panel in Challenge with its notes, working and sources kept back.
- The three sentences of chemistry the review added and the two of the spec's own that it changed, listed above.

### What was checked, and how

- **Automated tests:** 3,334 at the close of the review, 34 more than before it. With the three quotation fingerprints moved aside, 2,734 passed and 600 were skipped. The linter, the type check, the production build and the three data scripts were run at the end, and the data scripts left no file changed.
- **By script in a browser:** eight scripts against the production build in headless Chromium 153 on Linux, with WebGL drawn in software: 371 checks, all passing at the last run of each. Four more took the pictures and measured sizes. `docs/for-institutions.md` lists what they covered. The scripts are not in the repository.

### What nobody checked

- **No person has used the page,** by hand, by keyboard or on a tablet, and no person has read its words. The review was made by one AI coding assistant.
- **No chemist and no chemistry instructor.** The review read the chemistry as a teacher of first-year chemistry would be expected to, and it is not one.
- **No screen reader.** Roles, names, states and the order of things were read by script.
- **Chromium only,** version 153, headless, on Linux. No Firefox, no Safari, no real phone or tablet.
- **WebGL drawn in software only** (SwiftShader). No graphics card drew the scene, so how fast it plays and how it looks on real hardware were not seen. In software a frame can take longer than the tenth of a second the timeline lets one frame count for, so playing ran slower than its pace of a minute for the track: five seconds of it moved the timeline about a seventh less far than they should.
- **Touch by emulation only.** Taps, a one-finger drag and a pinch were touch events sent by script to a desktop browser. No finger touched glass.
- **Sizes:** 1024 by 768, 820 by 1180 and 1366 by 768 in full; 400 by 800 and 768 by 1024 only for sideways scrolling and the size of hit areas. No browser zoom, no enlarged text, no forced colours.
- **Contrast** was not measured, in the page or in the scene.
- **The sources were not read again.** The review checked the arithmetic of the four steps' energies and of the barrier against the stored values, and did not fetch any page the values rest on.
- **The About page** was checked for naming the timeline's sources and read once; nothing in it changed.
