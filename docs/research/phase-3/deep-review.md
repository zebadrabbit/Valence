# The deep review at the close of phase 3

2026-10-05. The one review of the whole branch that `docs/superpowers/plans/2026-10-04-phase-3-titration-lab.md` puts at the end of the phase ("How the phase was run from Task 14", and Task 23), made on the branch at `527d17b`, when the screens and the documents were done. This file records what it found, what was done about each finding, and what nobody checked. It is kept short, in the way `gate-a.md` records Gate A.

**Where it stands.** Fourteen findings, one must-fix and thirteen should-fix, and sixteen notes. All fourteen are fixed and tested. One finding has a second half that is the owner's to decide and is not built (DR2). The notes are recorded with what was done about each, which for most is nothing. **The fixes have not been checked by anyone who did not make them**, and no person has looked at the page since.

## How the review was done, as far as this record knows

The findings came to the fix wave as a list, each with where it is, what is wrong, the evidence and a proposed fix. From that evidence: the reviewers drove the production build under `vite preview` in headless Chromium, by keyboard, at widths of 700, 1366, 1500, 1920 and 2200 pixels; watched every `role="status"` and `role="alert"` node for changes after each key press; ran the whole test suite three times, once with the quotation fingerprint moved aside as CI has it; and read the code of the screens. They were told not to judge how anything looks, and not to read the primer, the hazard notes and the wording files sentence by sentence again. Their scripts and outputs are not in the repository.

## How the fixes were made

Each finding was reproduced before it was touched. A throwaway script drove a build of `527d17b` in Chromium, on stored records made with the engine's test kit, and showed the defect for every finding that shows in a browser. Each fix that is logic or markup has a test that was seen failing first. One commit per finding. The same script was then run on the build with all the fixes, and showed none of the defects; and the scripts that had driven a whole Guided lab and the checks of the page when the screens were built were run again on that build.

## Findings and what was done

| | Finding | What was done | Commit |
| --- | --- | --- | --- |
| DR8, must-fix | Under an ended trial's heading the notebook showed the HCl molarity in the notebook now, not the one the trial was calculated with. After a miscopied label was put right between trials (Challenge), the panel stated a figure that the trial's own feedback, directly under it, contradicted | The pair shows the trial's own molarity once the trial has been checked, and the notebook's until then. `page.test.ts` holds it on a miscopied label put right, and holds that the record still names its own figure as the notebook's. A column for each trial's molarity in the record's table was not added | `4cbaad5` |
| DR1 | The bench's message line is a live region, and an action or a refusal that says the sentence already showing changed nothing in it, so nothing was announced: the second and third drop of indicator, the second and third rinse, a second swirl that found the same, a refusal given twice, and a different button refused for the same reason | A sentence the line already shows is said with "Again:" before it, and plainly the time after, whatever the sentence (`saidAgain`). Drops and half-drops keep their own alternation. `bench.test.ts` holds a refusal, an action and a swirl said twice. In the browser every one of the presses the review listed now changes the line. The word "Again:" is for the owner to read | `fa6ee0e` |
| DR2 | With Tab the learner can leave an open stopcock running. Escape closes it from anywhere, and nothing on the page said so | The sentence said when the stopcock opens, and the sentence of each measured pour, now say that the same button or Escape closes it. **Not built:** closing the stream when focus leaves its button. The review offers it only if the owner wants "cannot be left running by tabbing away" in the keyboard sense; it is put to the owner | `5ff63de` |
| DR3 | Two tabs on one lab: the tab opened earlier kept its old record and saved it over everything the other had done, at its first action, with no word in either | A lab page takes the record another tab saves, from the browser's `storage` event, when it is saved; the bench is then made anew, so an open stopcock closes, and a warning that was showing is dropped. An entry removed in the other tab leaves this one not started. A value this version cannot read is left where it is and the tab keeps its own. Nothing is written by taking a record. The decision is a pure function with tests; the listener was driven in the browser with two tabs | `9ffb259` |
| DR4 | A stored record of another version, or one that cannot be read, was set aside without a word: the learner saw a lab that had never been started | When the page's load sets a record aside, the page says so in a status paragraph, on the wide page and the narrow, on that visit (a reload drops it; the backup stays), until a new run is started: that a saved run could not be opened in this version, that it was kept, and that the export includes it. The home page still shows a record of the right version that the lab will refuse as the status it claims until the lab's page has been opened once: that was accepted at Gate A (N10) and is left so, with a comment at `peekStatus` | `2b686b6` |
| DR5 | A reply under the reading field outlived the reading it spoke of: "Recorded ... as the final reading." stayed after a stream or a measured pour had cleared that reading | Opening the stopcock now counts as an action for the field's key, so the field is made anew. Seen in the browser: after a final reading and a pour, the reply is gone | `965eddd` |
| DR6 | `docs/for-institutions.md` said the bench never states a level more finely than a whole millilitre. The enlarged view's words give it to a fifth of a 0.1 mL gap, and the same document says so elsewhere | Reworded to what holds: no delivered volume is stated; the description of the stand gives the level to the whole millilitre; the level is read in the enlarged view and its words; the only readings printed as numbers are the learner's own | `c74fbef` |
| DR7 | Two of the periodic table's page tests ran at 1.6 to 2.1 s on the default 5 s, and three of the lab's loops near a second had no timeout of their own, which the plan's constraint on tests asks for | Those five have 60 s, as the other loops have. A run of the whole suite with the default lowered to half a second found two more of the lab's loops with none (0.7 and 0.8 s), which got the same. Four tests outside the lab that run at about half a second were left | `978efb5` |
| DR9 | "Signal word: Danger" stood above the heading that says whose classification it is | The signal word is under that heading, with the statements. The stored record is unchanged. The plan had put this to the owner; the review rated it a finding, and the owner can take it back | `8b5ba4d` |
| DR10 | Guided's checklist called the label step done for any molarity in the notebook, so one miscopied in Challenge and carried into Guided was shown as done, and the learner was led through a trial that could not count | The step is done only when the notebook holds the label's own molarity; otherwise it is the next step. This is the one change in `src/engine/`. No warning was added and nothing new is refused | `ef21aaf` |
| DR11 | The message line kept the last bench action's sentence after the notebook had moved the trial on: "The final reading can be taken." beside "This trial is over.", and an old refusal beside the entry that had answered it | The line is cleared when the notebook accepts an entry, discards the flask or checks the trial; when a reading is recorded under it; and when a Guided warning is raised. Driven in the browser, not held by a committed test: it is state of a mounted component | `3ad6276` |
| DR12 | The stream's button changed its name and its pressed state together, and was heard as "Close stopcock, pressed" while the stopcock was open | No button carries a pressed state. The name says what the button will do, as the two pour buttons' names do. The plan had put this to the owner too | `400ee65` |
| DR13 | The narrow page said "the notebook of your saved run" over a section headed "Record of this run" | It says "the record of your saved run" | `b576606` |
| DR14 | The lab that is not built was a link with "Not started" on the home page and plain text with "Planned. Not built yet." in the list of labs | The home page shows it as the list does. The mechanism, which is in the same case, is shown the same way | `178a083` |

Three existing test cases were changed for these fixes, and the plan names them ("The deep review and its fixes"). None was deleted.

## Notes

| | Note | What was done |
| --- | --- | --- |
| DN1 | With storage that takes no writes at load, a run saved earlier is hidden for the session and the notice does not say that one exists | Nothing. The code records it as a deliberate limit. For the owner |
| DN2 | After "Discard this flask" the bench went on describing the discarded flask, and the message line kept its last sentence | The message line is cleared now (DR11). The drawn flask and the status line are as they were: whether the flask should empty is the owner's |
| DN3 | When the third trial counts, the completion sentence is neither focused nor in a live region | Nothing. For the owner |
| DN4 | The home page and the list of labs disagreed about the planned lab and the mechanism | Fixed with DR14 |
| DN5 | After "Record the reading anyway" the field keeps the typed value and the confirmation is in the message line | Nothing. Already in the plan's list for the owner's look |
| DN6 | `save` takes a whole next state, so two actions between two renders could lose one addition. The reviewer could not make it happen | Nothing, as the review advises |
| DN7 | `messageLine` adds the "wait no longer counts" sentence after any action that is not a stream or a swirl, leaning on an engine rule it does not name | Nothing |
| DN8 | Leftovers: a stale comment in `TitrationStand.tsx`, `ACTION_TEXT.swirlAndWait` shown by no caller, an unread field of `Decision`, a submit button written out three times, a source list copied in `Primer.tsx` | Nothing. Left for a tidy at the close |
| DN9 | No lint rule or test holds the plan's constraint "Lazy" | Nothing. The plan lists it as not built |
| DN10 | On the narrow page in a browser that is not saving, the not-saving notice and the narrow notice contradict each other on where progress is kept | Nothing. For the owner |
| DN11 | "Open stopcock" pressed within 0.6 s of a measured pour ending is answered as if it had been a press to close | Nothing. The 0.6 s is already in the plan's list for the owner's look |
| DN12 | "Discard this flask" is offered when the flask is still empty | Nothing. For the owner |
| DN13 | Two buttons on the page are named "Record" | Nothing. For the owner: a name is wording |
| DN14 | "Go back and condition it" reads as if the press does the step; "Step 9 of 11, next: ..." can be read two ways | Nothing. For the owner |
| DN15 | Six small things of wording: what the model's source list is called, "is read in no source", the bare seed, the dash for a value not yet there, "this lab's reading view", and -ize beside -ise | Nothing. For the owner |
| DN16 | The About page's sentence on what the primer rests on leaves out the Wikipedia article on the burette and the safety data sheets of the Safety card | Nothing. For the owner, with the other sentences about sources |

## What was run after the fixes

- `npm run lint`, `npm run build` (the linter, the tests, the type check, the production build), `npm run build:data`, `npm run build:expected` and `npm run cross-check`, with no file changed by the three data steps: 72 test files and 2207 tests, on a machine where the quotation fingerprint has been made. The 19 new tests are the fixes' own. Where the fingerprint has not been made, CI included, 200 of them are skipped, as before; that run was not repeated.
- The reproduction script, on the production build under `vite preview`, in Chromium: 18 checks, every one of which showed its defect on the build of `527d17b`, and none on the build with the fixes. Two tabs in one browser context: the second tab showed what the first had done, an action in the second kept it, a stream open in the second was closed when the first acted, an entry removed in one left the other not started, and a record of another version written in one was left alone by the other. No console error or warning.
- The scripts of Task 21 and Task 22 that drive a whole Guided lab, a Challenge trial, the checks of the page, the three warnings, the reading and writing of the entry and the names, by keyboard: every check passed but the seven that read the stream button's pressed state, which is gone by DR12.

## What nobody checked

**Of the fixes:**

- **No one but the one who made them has read or run the fixes.** Task 23's re-check is not done.
- **No screen reader.** That "Again:" makes a live region speak is taken from the text of the node changing, which is how the review found the defect. Whether NVDA, JAWS or VoiceOver says it, and how "Again:" sounds, has not been heard.
- **Clearing the message line, the remount of the reading field, the `storage` listener and the session's memory of a record set aside** are state of mounted components and of a module. The node tests hold the pure parts (`saidAgain`, `messageLine`, `writtenElsewhere`, `readEntry`, `wasSetAside`) and the markup; the rest was driven in Chromium by a script that is not kept.
- **Two tabs** were two pages of one headless browser context. Two windows side by side with a person at each, two tabs acting within the same moment, and a tab left open on an older build while a newer one saves were not tried. In the last case the older tab still saves its own record over the newer one at its next action: it cannot read the newer record and keeps its own.
- **The development server and React's strict mode.** Only production builds were driven.
- **The Guided trial after a miscopied label** was not run to its end in the browser; the checklist's first step was seen as next, and as done once the label was recorded.
- **Export and Clear on the Settings page** with a record set aside: that the export includes the backup is read from `exportAll`, which lists every key beginning `valence:`, and was not opened as a file.
- **CI.** Nothing was pushed. Timings are from one eight-core machine.

**Of the review, as its reviewers reported:**

- What a screen reader says; any browser but headless Chromium; pointer and touch; browser zoom; forced colours and text contrast; widths between 768 and 1366 pixels.
- How anything looks, and whether a person can read the drawn meniscus. Every reading was taken from the words.
- A really hidden browser tab: the page's visibility was set by script. The stream under a busy main thread or on slower hardware. A key held down on a button was read in the code, not driven.
- A whole Guided lab in the dark theme, and a Challenge lab carried to completion.
- On the real page: the ending in which a rinse thins the pink away at the 50 mL mark, the "wait no longer counts" sentence, a trial that runs out at the mark before the endpoint, a pass that does not count with two cancelling mistakes, the refusal of a fourth rinse, and the wording at exactly 1.00%. Unit tests hold them.
- Reloads at the endpoint before the wait, after a failed trial and at completion in the same browser session as the run.
- Values held in JavaScript memory or in inserted style rules: only the page's markup, its field values and its title were searched for hidden numbers.
- The command palette opening the lab; the Learn page; the source links.
- The chemistry and safety content of `docs/for-institutions.md`, the About paragraph and the README beyond their agreement with the code; the hazard texts against the suppliers' sheets; `gate-a.md` and the spec line by line.
- The engine, the data and the wording files as they stood before the screens, except where a screen depends on them.
- A stored record that passes the schema but that no lab could make, drawn through the page's components.

## For the owner

To look at in the running app, at `#/lab/titration` unless a line says otherwise.

1. **"Again:".** Start a Challenge lab and press "Add 1 drop of indicator" twice before anything else. The message under the stand reads "Pipette the acid into the flask first." and then "Again: Pipette the acid into the flask first." Whether "Again:" is the word wanted, or a count for the drops of indicator and the rinses.
2. **A stream and the Tab key (DR2).** Fill the burette, record the reading, pipette, add two drops, press "Open stopcock" and then Tab. The stopcock stays open; the message says that Escape closes it. Whether it should close when focus leaves its button.
3. **A saved run set aside (DR4).** In the browser's console, on the app's page: `localStorage.setItem('valence:lab:titration', '{"version":2,"data":{}}')`, then open the lab. This writes over a run saved in that browser, so use one with none worth keeping. The page shows the sentence above the mode choice. Whether the sentence says it well.
4. **Two tabs (DR3).** Open the lab in two tabs. What is done in one shows in the other without a word. Whether a word is wanted.
5. **Hazards (DR9).** Open Hazards on each bottle: the signal word is now under the heading, in the same weight as the heading.
6. **The home page (DR14)**, at `#/`: the lab and the mechanism that are not built are text, with "Planned. Not built yet.", and no longer links.
7. **The stream button (DR12)** has no pressed state. Nothing to see; it is here because the plan had left the choice to the owner.
8. **The notes that are matters of taste or of wording:** DN1, DN2, DN3, DN5 and DN10 to DN16 above.

## After the re-check

The re-check of the fixes found two things, both put right directly on 2026-10-06. The fix for the stale message line (DR11) emptied the line when the notebook accepted the HCl molarity while the stopcock was open, so the sentence that says how to close it went and its closing was never said: the line now keeps an open stopcock's sentence. And this record, the spec and the institutions document said the set-aside notice lasts until a new run is started, where it lasts for that visit only: all three now say so. Its three notes stand as notes: the set-aside notice in a second tab after Clear, a tab of an older build saving over a newer record once a version is first raised, and the command palette still listing the two activities that are not built.
