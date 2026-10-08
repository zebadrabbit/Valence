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
