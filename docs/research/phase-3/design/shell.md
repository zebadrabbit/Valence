# Phase 3 design: the lab shell, the notebook, the content and progress

Key `shell`. 2026-10-04. Design for planning; nothing here is app code. No tracked file was changed (`git status` is clean).

On 2026-10-18 seven of the draft support lines of section 7 that were given as not quoted, but repeated eight words or more running of the OpenStax section they rest on, were given the wording the shipped primer (`src/chem-data/titration/primer.ts`) has for the same passage. So were three more that did the same with a page of Harvey's Analytical Chemistry 2.1, Seely's page on the pipet and the Wikipedia article on the burette. The quotations of Seely's page on the buret are left: section 7.1 records that the page puts itself in the public domain. Nothing else in this design was changed for that reason.

Everything in this folder:

- `design.md`: this file.
- `proto/`: a throwaway prototype of the pure functions, the stored record, the content and the markup, with its tests (97 pass under the repository's Vitest; `tsc` passes under the repository's strict settings). `proto/test-output.txt` is the run pasted in section 9.
- `proto/page/`: a static build of the lab page's frame with the app's own stylesheet, photographed in headless Chromium at nine sizes (`proto/page/shots/`, measurements in `shots/measurements.txt`). It served itself on port 5199 only while the photographs were taken.
- `sources/`: the pages fetched for the primer and the hazards, as downloaded on 2026-10-04.

Run the prototype's tests from the repository root:

```
npx vitest run --config .superpowers/tools/phase3-design/shell/proto/vitest.config.ts
npx tsc -p .superpowers/tools/phase3-design/shell/proto/tsconfig.json
```

## 0. Read first: four things that change the spec or need the owner

1. **OpenStax Chemistry 2e is not CC BY as served today.** Every Chemistry 2e page fetched on 2026-10-04 (nine sections and the preface) states "Creative Commons Attribution-NonCommercial-ShareAlike 4.0", in the page text, in the preface, and in the page's own licence metadata, and adds that the book may not be "ingested into large language models or generative AI offerings" without written permission. The repository says CC BY 4.0 in three places and quotes OpenStax verbatim: the citation text of every `openstax-chem2e-*` entry in `src/chem-data/sources.json`, the `support` strings in `src/chem-data/periodic.ts`, and `docs/for-institutions.md` ("the passage itself where it is from OpenStax (licensed CC BY 4.0)"). The brief's rule is to quote only CC BY text, so **this design quotes no OpenStax text**: every OpenStax passage is given as a locator (heading, address, and what it establishes in this project's words). I did not establish when the licence statement changed, or whether the 2019 release under CC BY 4.0 still covers the same text. The existing quotes are outside this design's area and are an owner decision before the repository goes public (section 11, O1). I read the nine sections before seeing the clause about language models; the copies are in `sources/` (git-ignored) and can be deleted.
2. **A seven-column notebook table cannot dock right of the bench at 1366 px.** Measured in the prototype's first layout: a 491 px table in a 448 px column, and the page scrolled sideways at 1366, 1024 and 2523 px (that first run is not saved; `shots/measurements.txt` is the final layout). The design splits the notebook: the working part (the trial under way, and the part across trials) is docked right; the record of finished trials runs across the page below the bench, as the explorer's inspector does. After the change no size scrolled sideways (section 3.4). This amends spec 11's "the lab notebook docked right".
3. **Spec 7.2's "only after the learner has entered their own values" reads two ways.** The design takes the stricter one, which satisfies both: when three trials have passed, the learner enters their own average and relative deviation, and the notebook then shows what it calculates beside them. Nothing is marked (section 4.4; O2).
4. **A signed percent error gives away the true molarity** to anyone who divides by it, and a typed molarity could then be retyped until it passes. The design closes this with one rule the spec does not have: the check first holds the typed molarity to the learner's own notebook (M(HCl) recorded x 25.00 / titre, within one unit in the fourth decimal place); only then is it marked, and a marked trial is final (section 4.3; O3).

## 1. What the shell is, and what it is not

Two labs demonstrably share these, so the shell has them and nothing else:

| Shared piece | What it is |
| --- | --- |
| Routes | `#/lab` lists the labs; `#/lab/titration` is this lab; phase 4 adds `#/lab/aqueous`. |
| `LabShell` | The frame of a lab page: breadcrumb under Lab, the mode switch, Start or Restart, the primer, then four slots (`guide`, `bench`, `notebook`, `record`) laid out by `lab.css`; and the narrow page. |
| `ModeSwitch` | Guided or Challenge: two native radio buttons in a fieldset. |
| `Primer` | A disclosure holding one card per section of a primer, each with its Sources. Driven by data. |
| `useLabProgress` | Loads a lab's entry once, and saves it after every learner action. |
| `lab.css` | Where the four slots sit at each width. |
| Restart | A button and `window.confirm`, as "Clear my progress" already does. |

Deliberately left out:

- **No generic "check flow" component and no generic notebook.** Phase 4 checks structured observations and equations per station; this lab checks one number per trial. What they share is a slot and a word ("Check"), not code. Each lab owns its check function and its notebook. If phase 4 finds real duplication it extracts it then.
- **No lab registry or plug-in interface.** A lab is a route and a page component. `ACTIVITIES` already lists them.
- **No shared reducer, action type or message bus.** The titration page holds its record in one `useState` and saves it.
- **No modal dialog.** A warning is an inline group in the Guided panel that takes focus (section 5.2). Restart uses `window.confirm`.
- **No per-lab summary on Home.** Home keeps its three words (Not started, In progress, Completed).
- **No syncing between two tabs open on the same lab.** The last save wins.
- **No "resume on another device".** Progress is in one browser; the narrow page says so.
- **No moving of `Card`, `Disclosure`, `Sources` out of `src/app/explore/InspectorCard.tsx`.** The lab imports them from where they are.

### 1.1 Routes

```tsx
// src/app/routes.tsx: the two lines that change
{ path: 'lab', element: <Lab /> },
{ path: 'lab/titration', lazy: async () => ({ Component: (await import('@/app/lab/titration/TitrationPage')).TitrationPage }) },
```

The lab page is lazy, so the engine, the primer and the messages stay out of the main chunk. `ACTIVITIES[0].to` becomes `/lab/titration`; the aqueous lab keeps `to: '/lab'` until phase 4, and the list shows a lab whose address is still `/lab` as "Planned. Not built yet." Home and the command palette read `to` and need no other change.

### 1.2 Before the lab is started

Opening `#/lab/titration` saves nothing: Home keeps saying "Not started". The page shows the primer (open), the mode choice and a "Start the lab" button. Start draws the seed (`crypto.getRandomValues(new Uint32Array(1))[0]`, in `app/`, spec 7.1) and saves the first record. After that the primer is closed and can be opened at any time.

### 1.3 Mode

The mode can be changed at any time, also during a trial; it takes effect at once. Each finished trial is stored with the mode in force when it finished, and the record shows it ("1 (Challenge)"). The spec does not say whether a mode is fixed for a run; nothing is at stake, so the simplest rule is taken (O8).

### 1.4 Restart

"Restart lab" asks `window.confirm("Restart this lab? Everything recorded in this run will be erased. This cannot be undone.")`, then draws a new seed, keeps the mode, and saves a new run over the old one.

### 1.5 The narrow page (under 768 px)

`LabShell` is given `narrow` by the page (a `useMediaQuery('(max-width: 767px)')`, moved out of `AppState.tsx` into `src/app/useMediaQuery.ts`). When narrow it renders the breadcrumb and heading, the notice, the primer (open), and the lab's `record` slot, into which the titration page puts the read-only notebook panel and the table of finished trials. No bench, no Guided panel, no mode switch, no field and no button. With no saved run only the notice and the primer are shown. The notice:

> This lab needs a wider screen. The bench is not shown on a screen narrower than 768 pixels. To do the lab, open Valence in a wider window, on a tablet turned sideways, a laptop or a desktop. Progress is kept in the browser it was made in, so a run started on another device will not appear here.

The last sentence is there because the spec's "continue on a larger screen" would otherwise promise something the app cannot do: a phone has a saved run only if the same browser was once wider than 768 px.

## 2. File layout

```
src/app/
  useMediaQuery.ts                 moved out of AppState.tsx (one more user)
  activities.ts                    titration `to` becomes '/lab/titration'
  routes.tsx                       adds lab/titration (lazy)
  pages/Lab.tsx                    becomes the list of labs
  progress/storage.ts              sessionStore tracks refused keys; clearAll forgets them
  AppState.tsx                     no change of shape; `persistent` now means "no entry's latest save was refused"
  lab/
    lab.css                        the four slots at each width (container queries)
    LabShell.tsx                   frame, Start/Restart, not-saving notice, narrow page
    ModeSwitch.tsx
    Primer.tsx                     cards from PrimerSection[]; Subscripted
    useLabProgress.ts
    shell.test.ts                  markup tests of the four above
    titration/
      notebook.ts                  typed text <-> whole numbers; titre, average, relative deviation, percent-error text
      notebook.test.ts
      flow.ts                      checklist, gates, prompts, checkTrial, invalidResult
      flow.test.ts
      progress.ts                  the stored record: zod schema, newRun, finishTrial
      progress.test.ts
      TitrationPage.tsx            wires engine, bench, shell and record together
      Guide.tsx                    checklist, PromptBox, slow-down status
      TrialForm.tsx                the trial under way: four fields
      Notebook.tsx                 NotebookPanel (docked) and TrialRecord (below)
      BottleCard.tsx               hazards of a bottle (used by the bench)
      page.test.ts                 markup tests of the five above
src/chem-data/
  support.ts                       Description, Passage, located, description: moved out of periodic.ts unchanged
  schema.ts                        hazardsSchema exported; its `note` becomes cited(text)
  titration/
    primer.ts                      TITRATION_PRIMER
    primer.test.ts
    bottles.ts                     TITRATION_BOTTLES (hazards)
    messages.ts                    every sentence the lab says outside the primer
    messages.test.ts
scripts/build-chem-data.mjs        writes the lab's 20 sources into sources.json
docs/research/phase-3/sources/     the lab's sources as input to the script, with what was read where
docs/for-institutions.md           sections of 8 below
```

Why the sentences are in `chem-data/`: spec 5.1 has the validator check "any authored prose string (chem-data text, mechanism text, lab primers)". The hints and feedback state chemistry ("water left inside it diluted the NaOH"), so they are kept where the prose check runs and where a reviewer looks for the chemistry. `chem-data/` may not import from `app/`, so `messages.ts` declares the few string unions it needs; `flow.ts` imports those types from it.

The engine (`src/engine/`) and the bench are other designs. This one touches them only through the surface in section 6.2.

## 3. The shell's interfaces

```ts
// src/app/lab/LabShell.tsx
export type Mode = 'guided' | 'challenge'

export interface LabShellProps {
  title: string
  /** True on a viewport narrower than 768 px (spec 11): notice, primer and `record`; nothing else. */
  narrow: boolean
  /** False until the learner has started the lab: the page is then the primer, the mode choice and Start. */
  started: boolean
  /** AppState.persistent: false while the browser is not keeping progress. */
  persistent: boolean
  mode: Mode
  onMode(mode: Mode): void
  onStart(): void
  /** Called once the learner has confirmed. */
  onRestart(): void
  primer: ReactNode
  /** The lab's Guided panel, if it has one in the current mode. */
  guide?: ReactNode
  bench: ReactNode
  /** The working part of the notebook, docked right of the bench. */
  notebook: ReactNode
  /** The record of what has been done, across the page below the bench. On the narrow page, the read-only notebook. */
  record: ReactNode
}
export function LabShell(props: LabShellProps): ReactElement

// src/app/lab/ModeSwitch.tsx
export function ModeSwitch(props: { mode: Mode; onChange(mode: Mode): void }): ReactElement

// src/app/lab/Primer.tsx
export function Primer(props: { sections: readonly PrimerSection[]; sources: readonly Source[]; open: boolean }): ReactElement
/** "M_NaOH" as M with a subscript: an underscore, then the subscript's letters. */
export function subscriptParts(text: string): { text: string; sub: boolean }[]
export function Subscripted(props: { text: string }): ReactElement

// src/app/lab/useLabProgress.ts
type Activity = (typeof ACTIVITIES)[number]
/** The lab's stored entry (null: not started), and a function that sets it and saves it. Call `save` after every learner action. */
export function useLabProgress<T>(activity: Activity, schema: z.ZodType<T>): [progress: T | null, save: (next: T) => void]

// src/app/useMediaQuery.ts
export function useMediaQuery(query: string): boolean
```

`useLabProgress` is six lines: `useState(() => loadEntry(store, activity.entry, activity.version, schema))`, and a `save` that sets the state and calls `saveEntry` in the event handler, as `updatePrefs` does, never in an effect. While the stopcock is open the bench keeps the running engine state itself and calls `save` when the stopcock closes (spec 10), so a reload resumes at the last closed volume.

### 3.1 The shell's own wording

| Where | Text |
| --- | --- |
| Mode, Guided | **Guided.** A checklist of the steps, a warning before you skip one that matters, and hints as you go. |
| Mode, Challenge | **Challenge.** No checklist, warnings or hints. Mistakes carry into your result and are named afterwards. |
| Start | Start the lab |
| Restart | Restart lab |
| Restart confirmation | Restart this lab? Everything recorded in this run will be erased. This cannot be undone. |
| Not saving (`role="status"`) | This browser is not saving your progress. What you do here will last only until you close this tab. |
| Primer disclosure | Primer: the ideas behind this lab |
| Lab list, unbuilt lab | Planned. Not built yet. |
| Narrow notice (`role="note"`) | as in 1.5 |

### 3.2 Markup contract

- The lab's `h1` is the page heading Layout focuses after navigation; the breadcrumb is Home / Lab / title.
- The mode is a `fieldset` with `legend` "Mode" and two `input type="radio"`.
- The docked notebook is `<aside aria-label="Lab notebook">`.
- DOM order is primer, guide, bench, notebook, record at every width; CSS only places them.
- The primer is a native `details`; each section is a `Card` (`section` with an `h2`) and ends with the existing `Sources` disclosure.

### 3.3 `lab.css`

Container queries, so the layout follows the width the page really has, with the menu open or closed. Long arbitrary Tailwind classes were tried first and are not used: the build put the `min-[1800px]:grid-cols-[...]` rule ahead of the `lg:grid-cols-[...]` rule in the stylesheet (a breakpoint given in px is sorted before the named ones, which are in rem), so the `lg:` rule won at every width and the three-column layout never appeared at 2523 px. A stylesheet of the lab's own, as the periodic table has, says the order outright.

```css
.lab-page { container-type: inline-size; }
.lab-grid { display: grid; gap: 1rem; align-items: start; grid-template-columns: minmax(0, 1fr); grid-template-areas: 'guide' 'bench' 'notebook' 'record'; }
.lab-grid-no-guide { grid-template-areas: 'bench' 'notebook' 'record'; }
.lab-guide { grid-area: guide; min-width: 0; }
.lab-bench { grid-area: bench; min-width: 0; }
.lab-notebook { grid-area: notebook; min-width: 0; }
.lab-record { grid-area: record; min-width: 0; }
/* The checklist runs in columns while the Guided panel lies across the top, so the bench stays in view. */
.lab-steps { columns: 19rem; column-gap: 1.5rem; }
.lab-steps > li { break-inside: avoid; }
@container (min-width: 56rem) {
  .lab-grid { grid-template-columns: minmax(0, 1fr) minmax(20rem, 26rem); grid-template-areas: 'guide guide' 'bench notebook' 'record record'; }
  .lab-grid-no-guide { grid-template-areas: 'bench notebook' 'record record'; }
}
@container (min-width: 100rem) {
  .lab-grid { grid-template-columns: minmax(18rem, 24rem) minmax(0, 1fr) minmax(24rem, 32rem); grid-template-areas: 'guide bench notebook' 'record record record'; }
  .lab-grid-no-guide { grid-template-areas: 'bench bench notebook' 'record record record'; }
  .lab-steps { columns: auto; }
}
```

Nothing in it animates, so reduced motion needs no rule.

### 3.4 What the layout prototype measured

Headless Chromium, the app's stylesheet, menu open (208 px), a 480 px stand-in for the bench. Boxes are left, top, width, height in pixels.

| Window | Layout | Guided panel | Bench | Docked notebook | Record | Primer columns | Sideways scroll |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2523x1290 | three columns | 232, 240, 384, 366 | 632, 240, 1339, 480 | 1987, 240, 512, 492 | 232, 748, 2267, 249 | 5 | no |
| 1920x1080 | three columns | 232, 240, 384, 366 | 632, 240, 736, 480 | 1384, 240, 512, 492 | 232, 748, 1664, 249 | 3 | no |
| 1366x768 | panel across the top, two columns | 232, 240, 1110, 181 | 232, 437, 678, 480 | 926, 437, 416, 516 | 232, 969, 1110, 281 | 2 | no |
| 1366x768, a warning showing | same | 232, 240, 1110, 325 | 232, 581, 678, 480 | 926, 581, 416, 516 | | 2 | no |
| 1024x768 | one column | 232, 360, 768, 226 | 232, 602, 768, 480 | 232, 1098, 768, 476 | 232, 1590, 768, 321 | 1 | no |
| 800x1100 | one column | 232, 360, 544, 350 | 232, 726, 544, 480 | 232, 1222, 544, 492 | table scrolls in its own box | 1 | no |
| 400x800 | narrow page | none | none | none | table scrolls in its own box | 1 | no |

What this tells the bench design: at 1366x768 with the menu open the bench has **678 px of width** and starts 437 px down the page in Guided mode (the checklist is 181 px tall across the top; 325 px while a warning shows). At 1024 px with the menu open there is no room to dock the notebook, so the notebook's fields are below the bench; with the menu closed (920 px of page) it docks and the bench has 488 px. At 2523 px the bench has 1339 px. Two defects the photographs found and the design fixes: the summary's label column pushed its values out of a narrow card (it now uses the existing stacked `Rows`), and a table inside a `Card` needs `min-w-0` on its scroll box or it widens the page.

## 4. The notebook

### 4.1 What the learner types, and what the notebook works out

| Value | Who | Form | Kept as |
| --- | --- | --- | --- |
| HCl molarity, from the bottle label | learner types, once; carried into later trials and still editable | four decimal places, `0.0953` | the text typed |
| Initial burette reading | learner types | two decimal places, `1.23` | the text typed |
| Final burette reading | learner types | two decimal places, `26.48` | the text typed |
| Titre | notebook: final minus initial | two decimal places | not stored |
| NaOH molarity | **learner types** (spec 7.3: "the learner's calculated NaOH molarity") | four decimal places, `0.0944` | the text typed |
| Result | check flow | Passed; Not passed with the signed percent error; Invalid | stored with its causes |
| Average, relative deviation (own) | learner types, when three trials have passed | four decimal places; a plain number of parts per thousand | the text typed |
| Average, relative deviation (notebook's) | notebook, from the three passing trials' typed molarities | four decimal places; one decimal place | not stored |

The titre is the learner's own two numbers subtracted, so showing it gives nothing away; it is shown in both modes. The molarity is the lab's one calculation and is always the learner's.

### 4.2 Significant figures

- **Readings: exactly two decimal places, in both modes.** `1.2` is refused with "Write the reading to two decimal places, for example 1.20. A burette is read to the nearest 0.01 mL." This is the form of a record, not a hint, so Challenge has it too. It also makes "as the learner typed them" exact: the stored text is always `d.dd` or `dd.dd`.
- **Molarities: exactly four decimal places, with the leading zero, in both modes.** The label is printed to four decimal places and the volumes have four significant figures.
- **Why not "significant figures".** By the multiplication rule a label of 0.0953 M (three significant figures) gives a three-figure answer. When that answer is 0.1 M or more it would be written 0.101: rounded to 0.001 M, which is up to 0.5% of the value, half the 1.0% pass band, and enough to fail a careful trial at the edge of the spike's bound (-0.56%). Four decimal places costs at most 0.053% (0.00005 / 0.0950). So the lab asks for four decimal places in every case and the primer says it is a rule of this lab. A lab instructor would call this "report to four decimal places"; it is flagged in section 7.3.
- **Arithmetic is on whole numbers.** Readings are held in hundredths of a millilitre and molarities in ten-thousandths of a mole per litre, so no result depends on floating-point rounding; the only division is the one that produces a displayed figure.
- **Percent error: two decimal places, signed, with a real minus sign**, and the direction also in words ("too low"). A failing trial is more than 1.0% out, so one that would print as 1.00% prints as 1.01%: the notebook never shows a failure that reads as a pass.
- **Relative deviation: one decimal place**, in "parts per thousand" written out.

```ts
// src/app/lab/titration/notebook.ts
/** The pipette's nominal volume, 25.00 mL, in hundredths of a millilitre. */
export const ALIQUOT = 2500
/** A reading typed to two decimal places, in hundredths of a millilitre (0 to 5000); null for anything else. */
export function parseReading(text: string): number | null
/** A molarity typed to four decimal places ("0.0953"), in ten-thousandths of a mole per litre; null for anything else, and for zero. */
export function parseMolarity(text: string): number | null
/** A relative deviation as typed: a plain number with at most two decimal places. Never used in arithmetic. */
export function isDeviation(text: string): boolean
export function formatReading(hundredths: number): string
export function formatMolarity(units: number): string
/** Final minus initial; null unless the final reading is the larger. */
export function titre(initial: number, final: number): number | null
/** |M x titre - M(HCl) x 2500| <= titre: within one unit in the fourth decimal place of M(HCl) x 25.00 / titre. */
export function followsFromNotebook(molarity: number, hcl: number, titreHundredths: number): boolean
/** The mean, rounded to the fourth decimal place, half up. */
export function average(molarities: readonly number[]): number
/** Mean absolute deviation over mean, in tenths of a part per thousand: round(10000 x sum|n m - S| / (n S)). */
export function relativeDeviationTenths(molarities: readonly number[]): number
export function formatDeviation(tenths: number): string
/** More than 0.02 mL from the meniscus: |reading x 10 - meniscusUl| > 20. */
export function misread(readingHundredths: number, meniscusUl: number): boolean
/** "+2.07%", "−2.18%"; never "1.00". For failing trials only. */
export function percentErrorText(percent: number): string
```

### 4.3 The check flow

"Check" is the submit button of the molarity field. `checkTrial` does, in order:

1. **Ready?** A persistent endpoint, all four entries well formed, final reading larger than initial. Otherwise nothing is marked and the field says what is missing.
2. **Does it follow from the notebook?** If the typed molarity is not M(HCl) as recorded x 25.00 / titre to within one unit in the fourth decimal place: "That molarity does not follow from the readings in your notebook. Check your calculation and try again. Nothing has been marked yet." Unlimited tries. This is an arithmetic check against the learner's own numbers; it shows no expected value.
3. **Mark it** against the seeded NaOH molarity (the engine's grading: within 1.0% either side passes). The trial is finished and cannot be checked again.
4. **Name the causes**, in this order: the technique errors the engine counted; a miscopied label; a misread initial reading (against the meniscus when delivery began); a misread final reading (against the meniscus now). Distilled water is a note, not a cause.

A passing trial shows "Passed" and no percent error (that would give the true molarity away before completion). A failing trial shows its signed percent error and its causes. A trial can pass with causes named: a misreading inside the tolerance of the pass band, or two errors that cancel (an unconditioned burette, -2%, with an unrinsed pipette, +2%). It counts as a pass, as spec 7.3 defines one, and the feedback says it passed in spite of them.

A trial the engine ends (overshot, or the burette ran out) stays on the bench so the learner sees the flask; the trial form is replaced by the outcome and a "Start the next trial" button, which stores `invalidResult(facts)` and moves on.

```ts
// src/app/lab/titration/flow.ts
export type Cause = TechniqueError | 'hcl-label' | 'misread-initial' | 'misread-final' | 'no-indicator' | 'not-refilled'
export type Outcome = 'passed' | 'failed' | 'overshot' | 'ran-out'
/** A finished trial's result, as stored and as the notebook shows it. `percentError` is kept for a failed trial only. */
export interface TrialResult { outcome: Outcome; percentError: number | null; causes: Cause[]; notes: 'water-added'[] }

export type Check =
  | { kind: 'not-ready'; problem: 'no-endpoint' | 'entries' | 'final-not-after-initial' }
  | { kind: 'recalculate' }
  | { kind: 'graded'; result: TrialResult }
/** `hclLabel` is the label as printed ("0.0953"); `trueMolarity` the seeded NaOH concentration. */
export function checkTrial(entries: TrialEntries, facts: TrialFacts, hclLabel: string, trueMolarity: number): Check
/** The result of a trial the engine has ended. */
export function invalidResult(facts: TrialFacts): TrialResult
export const PASSES_TO_COMPLETE = 3
export function passes(results: readonly TrialResult[]): number
```

### 4.4 Across trials

Shown in the docked panel under the trial form. Until three trials have passed: "The average and the relative deviation appear here when three trials have passed." On the third pass the lab is completed; the panel shows the completion line with the true molarity, and asks for the learner's own average and relative deviation (one form, two fields, button "Show the notebook's values"). Once both are entered, the notebook's values appear beside them, with the explanation of what relative deviation measures. Nothing is marked; the two pairs are simply side by side. Both are over the three passing trials: failed and invalid trials are in the record but not in the average. After completion no further trial is run; Restart starts a new run with a new seed.

### 4.5 What a worked calculation looks like in Guided mode

Once both readings are recorded, Guided shows a "Work it out" box above the molarity field, set out with the learner's own numbers and stopping before the answer:

> Titre = final reading − initial reading = 26.48 − 1.23 = 25.25 mL
> HCl and NaOH react one to one, so at the endpoint the moles of NaOH added equal the moles of HCl in the flask.
> M<sub>NaOH</sub> × V<sub>NaOH</sub> = M<sub>HCl</sub> × V<sub>HCl</sub>
> M<sub>NaOH</sub> = M<sub>HCl</sub> × V<sub>HCl</sub> ÷ V<sub>NaOH</sub> = 0.0953 × 25.00 ÷ 25.25 = ?
> Give your answer to four decimal places.

It uses only what the learner typed, so it can never show the expected titre or molarity (a markup test holds it to that). Challenge has no such box. At completion Guided sets out the average the same way ("Average = (0.0987 + 0.0989 + 0.0986) ÷ 3 = ?") and says in words how to get the relative deviation.

### 4.6 Components and their markup contract

```ts
// src/app/lab/titration/TrialForm.tsx
export interface TrialFormProps {
  number: number
  mode: Mode
  entries: TrialEntries
  facts: TrialFacts
  /** What the last attempt to record or check was told, by field. */
  errors?: Partial<Record<keyof TrialEntries, string>>
  onAction(action: Action | { type: 'check'; typed: string }): void
}
// src/app/lab/titration/Notebook.tsx
/** Docked: the seed, the trial under way (`current`), the last result, and the part across trials. `trueMolarity` only when completed. */
export function NotebookPanel(props: { progress: TitrationProgress; trueMolarity: string | null; current?: ReactNode }): ReactElement
/** Across the page: one table of finished trials, each trial's feedback under its row. Read-only. */
export function TrialRecord(props: { progress: TitrationProgress }): ReactElement
// src/app/lab/titration/Guide.tsx
export function Guide(props: { number: number; facts: TrialFacts; entries: TrialEntries; prompt?: ReactNode }): ReactElement
export function PromptBox(props: { prompt: Prompt; onBack(): void; onProceed(): void }): ReactElement
```

- Each field is its own `form` (label, `input inputMode="decimal"`, submit button), so Enter records it and a prompt can answer the submission rather than every keystroke.
- A field that is not open yet is `disabled`, with the reason as text under it, tied by `aria-describedby`. A field error is `role="alert"`, tied by `aria-describedby`, with `aria-invalid`.
- The record is one `table` with a caption, seven `th scope="col"` (Trial, HCl molarity (M), Initial reading (mL), Final reading (mL), Titre (mL), NaOH molarity (M), Result) and a `th scope="row"` per trial; each trial is a `tbody` of two rows, the second holding its feedback as a list. On a small screen it scrolls sideways inside its own focusable box.
- The result is words ("Passed", "Not passed, −2.18%", "Invalid: overshot"), never colour alone; the checklist states are words too (Done, Next, To do, Skipped) beside a mark that is hidden from assistive technology.
- After a trial is marked, focus moves to the result (a `tabIndex={-1}` block with `role="status"`) in the docked panel, because the form under the learner's hands has just been replaced by the next trial's.
- The seed is shown at the top of the panel: "Seed 3735928559 · 2 trials finished · 1 of 3 passed".

## 5. The step flow

### 5.1 The checklist (Guided)

The same eleven steps in every trial, in the order of spec 7.2. In a later trial the glassware that is already prepared and the carried HCl molarity show as done, "Fill" reads "Refill", and the flask is "a clean flask". Each step is done, next (the first still open), to do, or skipped. Steps may be done in another order where the glassware allows it; the list reports, it does not gate.

A technique step is **skipped** once the action that needed it has been taken without it: the burette filled unconditioned, the initial reading recorded with the bubble still in the tip, the aliquot pipetted with the pipette unrinsed; and it stays skipped while the engine counts that error against the trial.

```ts
export type StepId = 'record-hcl' | 'condition' | 'fill' | 'clear-bubble' | 'read-initial' | 'rinse-pipette' | 'pipette' | 'indicator' | 'titrate' | 'read-final' | 'calculate'
export type StepState = 'done' | 'next' | 'todo' | 'skipped'
export const STEPS: readonly StepId[]
export function checklist(facts: TrialFacts, entries: TrialEntries): { id: StepId; state: StepState }[]
```

### 5.2 Guided's prompts

A prompt is raised when the learner tries the action, before it happens. It is drawn at the top of the Guided panel as a named group that takes focus, with one way back and one way on. It is not modal: doing anything else on the bench drops it. It is page state, not stored: after a reload the action simply has not happened.

| Trigger (what the learner tries) | Condition | Prompt | Ways out |
| --- | --- | --- | --- |
| Fill the burette | burette not conditioned | warning `condition` | back to condition it; fill it anyway |
| Record the initial reading | air bubble in the tip | warning `clear-bubble` | back to clear it; record anyway |
| Pipette the aliquot | pipette not rinsed | warning `rinse-pipette` | back to rinse it; pipette anyway |
| Record a reading | more than 0.02 mL from the true meniscus | re-read | read it again; keep it |
| Record the HCl molarity | not the label's | "Check the label" | read it again (no way to keep it: the label is exact) |

The bubble warning is tied to the initial reading, not to opening the stopcock, because clearing the bubble afterwards would move the level and spoil a reading already taken. The re-read prompt never says which way the reading is out, or by how much; it can be kept, because estimating the last digit is a judgement and a prompt that cannot be passed would strand a learner who reads the meniscus through its text alternative. A kept misreading carries into the result and is named, as in Challenge.

"Slow down" is a line in a `role="status"` region of the Guided panel, shown from 1.00 mL before the flask's own equivalence volume until the endpoint persists.

```ts
export type Action =
  | { type: 'record-hcl'; typed: string } | { type: 'fill' } | { type: 'record-initial'; typed: string }
  | { type: 'pipette' } | { type: 'record-final'; typed: string }
export type Prompt =
  | { kind: 'skip-warning'; step: 'condition' | 'clear-bubble' | 'rinse-pipette' }
  | { kind: 're-read'; which: 'initial' | 'final'; typed: string }
  | { kind: 'label-mismatch' }
/** What the learner has already answered for this action. */
export interface Confirmed { skip?: boolean; reading?: boolean }
/** The prompt Guided raises before an action, or null when it may go ahead. Challenge: always null. */
export function promptBefore(action: Action, facts: TrialFacts, mode: Mode, hclLabel: string, confirmed?: Confirmed): Prompt | null
export function showSlowDown(facts: TrialFacts, mode: Mode): boolean
```

### 5.3 What both modes share: the order a record can physically be made in

These are not hints, so Challenge has them too. Each shows its reason as text beside the control.

```ts
/** The initial reading is of a filled burette, before any titrant has run. `first`: the first trial, whose burette starts empty. */
export function canRecordInitial(facts: TrialFacts, first: boolean): boolean
/** The stopcock stays shut until there is an initial reading, and after the final one. For the bench. */
export function canDeliver(facts: TrialFacts, entries: TrialEntries): boolean
/** A final reading only at a persistent endpoint of a trial that is still valid. */
export function canRecordFinal(facts: TrialFacts): boolean
```

Without the first two, a learner in Challenge could run NaOH out before reading the burette and be left with a trial that can never be calculated. Without the third, a trial could be checked with no endpoint, a state spec 7.3 does not define.

### 5.4 Challenge

No checklist, no warning, no re-read prompt, no label check, no slow-down line, no "Work it out" box. Everything is accepted as typed (in the right form). After the trial the feedback names every cause, with the same sentences.

### 5.5 Every sentence the lab says

Generated from `proto/messages.ts`, the text the tests ran against. Sentences never show the expected titre, the true molarity, or the true meniscus.

**Checklist steps** (state words: Done, Next, To do, Skipped)

| step | first trial | later trials |
| --- | --- | --- |
| `record-hcl` | Record the HCl molarity from the bottle label | (same) |
| `condition` | Condition the burette with NaOH | (same) |
| `fill` | Fill the burette with NaOH | Refill the burette with NaOH |
| `clear-bubble` | Clear the air bubble from the burette tip | (same) |
| `read-initial` | Record the initial burette reading | (same) |
| `rinse-pipette` | Rinse the pipette with HCl | (same) |
| `pipette` | Pipette 25.00 mL of HCl into the flask | Pipette 25.00 mL of HCl into a clean flask |
| `indicator` | Add 2 or 3 drops of phenolphthalein | (same) |
| `titrate` | Titrate to a faint pink that persists | (same) |
| `read-final` | Record the final burette reading | (same) |
| `calculate` | Calculate the NaOH molarity and check it | (same) |

**Guided: warning before a skipped technique step**

| step | title | body | button back | button on |
| --- | --- | --- | --- | --- |
| `condition` | The burette has not been conditioned | It was washed with water, and the water still clinging to the inside will dilute the NaOH you pour in. Rinse the burette with a little of the NaOH solution first, and let it drain out through the tip. | Go back and condition it | Fill it anyway |
| `clear-bubble` | There is an air bubble in the burette tip | When you titrate, the bubble will be pushed out and NaOH will take its place. The level in the burette will fall by the volume of the bubble, although that NaOH never reaches the flask. Run a little NaOH through the tip to push the bubble out, then take the reading. | Go back and clear the bubble | Record the reading anyway |
| `rinse-pipette` | The pipette has not been rinsed with HCl | It was washed with water, and the water left inside will dilute the acid you measure out. Draw up a little HCl, tip the pipette so the acid wets the whole inside, and let it drain to waste first. | Go back and rinse it | Pipette anyway |

**Every other message** (functions are shown with example arguments)

| key | text |
| --- | --- |
| `REREAD.title` | Check that reading |
| `REREAD.body` | 1.30 mL is more than 0.02 mL from the meniscus. Read the bottom of the curve, with your eye level with it. The numbers on a burette run downward from 0.00 at the top, so the reading is the value of the mark just above the meniscus plus your estimate of how far below that mark it sits. |
| `REREAD.back` | Read it again |
| `REREAD.proceed` | Keep 1.30 mL |
| `LABEL_MISMATCH` | That is not the molarity printed on the label. Look at the label again and copy all four decimal places. |
| `SLOW_DOWN` | Slow down: you are within 1 mL of the endpoint. Close the stopcock, then add one drop at a time and swirl after each. When the pink is slow to fade, change to half-drops. |
| `FIELD_ERROR.hcl` | Write the molarity as the label prints it, to four decimal places, for example 0.1234. |
| `FIELD_ERROR.reading` | Write the reading to two decimal places, for example 1.20. A burette is read to the nearest 0.01 mL. |
| `FIELD_ERROR.readingRange` | A reading on this burette is between 0.00 and 50.00 mL. |
| `FIELD_ERROR.finalNotAfterInitial` | The final reading must be larger than the initial reading. The numbers on a burette run downward, so the reading grows as NaOH runs out. |
| `FIELD_ERROR.molarity` | Write the molarity to four decimal places, for example 0.1234. |
| `FIELD_ERROR.deviation` | Write the relative deviation as a number of parts per thousand, for example 1.5. |
| `GATE.initialNeedsFill` | Fill the burette before you take the initial reading. |
| `GATE.stopcockNeedsInitial` | Record the initial burette reading before you open the stopcock. Once NaOH has run out, the starting level can no longer be read. |
| `GATE.finalNeedsEndpoint` | Record the final reading once the pink persists. |
| `GATE.molarityNeedsFinal` | The molarity is worked out from both readings. Record the final reading first. |
| `RECALCULATE` | That molarity does not follow from the readings in your notebook. Check your calculation and try again. Nothing has been marked yet. |
| `OUTCOME_LABEL.passed` | Passed |
| `OUTCOME_LABEL.failed` | Not passed |
| `OUTCOME_LABEL.overshot` | Invalid: overshot |
| `OUTCOME_LABEL.ran-out` | Invalid: burette ran out |
| `OUTCOME_TEXT.passed` | Passed. Your NaOH molarity is within 1.0% of the true value. |
| `OUTCOME_TEXT.passedWithCauses` | Passed: your NaOH molarity is within 1.0% of the true value. But the trial had the problems below, and it passed in spite of them. |
| `OUTCOME_TEXT.failed` | Not passed. Percent error: −2.18%. Your NaOH molarity is too low. |
| `OUTCOME_TEXT.overshot` | Overshot. More NaOH went in than the endpoint needed, so this trial has no usable titre. Run another trial, and change to half-drops once the pink is slow to fade. |
| `OUTCOME_TEXT.ran-out` | The burette ran out before the endpoint, so this trial has no usable titre. Refill the burette before you start a trial. |
| `CAUSE_TEXT.unconditioned-burette` | The burette was not conditioned. Water left inside it diluted the NaOH, so reaching the endpoint took more of it: the titre is high and the molarity you calculated is low. It is the molarity of the diluted NaOH in the burette, not of the NaOH in the bottle. |
| `CAUSE_TEXT.tip-bubble` | There was an air bubble in the burette tip. It was pushed out during the titration, so the level in the burette fell by more than the volume of NaOH that reached the flask: the titre reads high and the molarity you calculated is low. |
| `CAUSE_TEXT.unrinsed-pipette` | The pipette was not rinsed with HCl. Water left inside it diluted the acid, so the flask held less HCl than you calculated with. Reaching the endpoint took less NaOH: the titre is low and the molarity you calculated is high. |
| `CAUSE_TEXT.hcl-label` | The HCl molarity in your notebook is not the one printed on the bottle label. |
| `CAUSE_TEXT.misread-initial` | Your initial burette reading was more than 0.02 mL from the meniscus. |
| `CAUSE_TEXT.misread-final` | Your final burette reading was more than 0.02 mL from the meniscus. |
| `CAUSE_TEXT.no-indicator` | No phenolphthalein was added, so the flask could not turn pink at the endpoint. |
| `CAUSE_TEXT.not-refilled` | The burette was not refilled before this trial. |
| `NO_CAUSE` | No single step explains this result. Run another trial. |
| `WATER_NOTE` | You added distilled water to the flask. That did not change the result: water changes how concentrated the acid in the flask is, not how much acid is there, so the same amount of NaOH is needed. |
| `COMPLETED("0.0988")` | Lab complete: three trials passed. The true NaOH molarity was 0.0988 M, to four decimal places. |
| `WORKED.titre` | Titre = final reading − initial reading = 26.48 − 1.23 = 25.25 mL |
| `WORKED.ratio` | HCl and NaOH react one to one, so at the endpoint the moles of NaOH added equal the moles of HCl in the flask. |
| `WORKED.equation` | M_NaOH × V_NaOH = M_HCl × V_HCl |
| `WORKED.substituted` | M_NaOH = M_HCl × V_HCl ÷ V_NaOH = 0.0953 × 25.00 ÷ 25.25 = ? |
| `WORKED.places` | Give your answer to four decimal places. |
| `SUMMARY.heading` | Across your three passing trials |
| `SUMMARY.waiting` | The average and the relative deviation appear here when three trials have passed. |
| `SUMMARY.ask` | Work out the average of your three molarities and their relative deviation, and enter them. The notebook then shows its own values beside yours. |
| `SUMMARY.ownAverage` | Your average molarity (M) |
| `SUMMARY.ownDeviation` | Your relative deviation (parts per thousand) |
| `SUMMARY.reveal` | Show the notebook’s values |
| `SUMMARY.average` | Average of your three molarities |
| `SUMMARY.deviation` | Relative deviation |
| `SUMMARY.explain` | Relative deviation = the average distance of the three molarities from their average, divided by that average, times 1000. It says how closely your trials agree with each other, not how close they are to the true value. It is not marked. |
| `SUMMARY.workedAverage` | Average = (0.0987 + 0.0989 + 0.0986) ÷ 3 = ? |
| `SUMMARY.workedDeviation` | Find how far each molarity is from the average, ignoring the sign. Average those three distances, divide by the average molarity, and multiply by 1000. |

## 6. Progress

### 6.1 The stored record

Entry `lab:titration` (key `valence:lab:titration`), version from `ACTIVITIES[0].version` (1), in the envelope `{ version, data }` that `saveEntry` writes. Plain data: strings, numbers, booleans, arrays, objects, null.

```ts
// src/app/lab/titration/progress.ts
export interface TrialEntries { hcl: string | null; initial: string | null; final: string | null; molarity: string | null }

export interface TitrationProgress {
  /** The 32-bit seed drawn when the lab was started (spec 7.1). With the engine it fixes every hidden value. */
  seed: number
  mode: Mode
  /** peekStatus reads this: Home shows "Completed" for 'completed' and "In progress" otherwise. */
  status: 'in-progress' | 'completed'
  /** Finished trials in the order they were run, each with the mode it was finished in. */
  trials: { mode: Mode; entries: TrialEntries; result: TrialResult }[]
  /** The trial under way: what has been typed so far, and the engine's state. Null once the lab is completed. */
  current: { entries: TrialEntries; engine: TrialState } | null
  /** The learner's own average and relative deviation, as typed, once three trials have passed. */
  summary: { average: string | null; deviation: string | null }
}
export const titrationProgressSchema: z.ZodType<TitrationProgress>   // strict objects; typed text held to its pattern
export function newRun(seed: number, mode: Mode, engine: TrialState): TitrationProgress
/** Closes the trial under way. The third pass completes the lab; otherwise the next trial starts with the HCl molarity carried forward. */
export function finishTrial(progress: TitrationProgress, result: TrialResult, nextEngine: TrialState): TitrationProgress
```

An example, mid-trial:

```json
{ "version": 1, "data": {
  "seed": 3735928559, "mode": "guided", "status": "in-progress",
  "trials": [
    { "mode": "challenge",
      "entries": { "hcl": "0.0953", "initial": "1.23", "final": "26.48", "molarity": "0.0944" },
      "result": { "outcome": "failed", "percentError": -2.1762, "causes": ["unconditioned-burette"], "notes": [] } }
  ],
  "current": {
    "entries": { "hcl": "0.0953", "initial": "0.87", "final": null, "molarity": null },
    "engine": { "...": "the engine's TrialState, stored whole" }
  },
  "summary": { "average": null, "deviation": null }
} }
```

What is not stored, and why: the HCl label, the true NaOH molarity and the per-trial draws all follow from the seed through the engine, so storing them would give two sources of truth. A finished trial's result is stored, because the engine state that produced its causes is gone once the trial ends. The true molarity is worked out from the seed when the lab is completed and never written.

**Saved after every learner action**: recording any entry, every bench action the engine takes (condition, fill, clear the bubble, rinse, pipette, indicator drop, water, swirl and wait), each stopcock close, a mode change, a check that marks the trial, "Start the next trial", entering the summary, Restart. A prompt, a field error and a rejected "does not follow" check change nothing stored.

**A record that does not fit** (another version, a seed out of range, a reading with one decimal, an unknown key) is set aside by `loadEntry` under `valence:backup:lab:titration` and the lab starts fresh; Home shows "Not started". Tested in the prototype against the real `storage.ts`.

**The version must be raised** whenever the engine's draw order, its `TrialState` shape or a stored union changes. To make that hard to forget, the engine's reproducibility test should pin the values of one seed and say in its failure message that the titration entry's version in `activities.ts` has to go up with it.

### 6.2 What this design assumes of the engine

The engine is being designed in parallel. This design reads it only through the surface below; `flow.ts` takes `TrialFacts` as plain data, so its tests need no engine, and one engine function produces the facts. If the engine's names differ, that function is the only place to adapt.

```ts
// ASSUMED: src/engine/titration (owned by the engine design)
export interface LabSetup {
  /** The label's molarity: exact to four decimal places. The label text is hclMolarity.toFixed(4). */
  hclMolarity: number
  /** The seeded NaOH concentration. Shown on completion to four decimal places. */
  naohMolarity: number
}
export function labSetup(seed: number): LabSetup
/** The trial in progress as plain data, glassware included, so that it can be stored and restored whole. */
export type TrialState = z.infer<typeof trialStateSchema>
export const trialStateSchema: z.ZodType
export function firstTrial(setup: LabSetup): TrialState
/** A new flask; the glassware carries over. */
export function nextTrial(setup: LabSetup, ended: TrialState): TrialState
export function factsOf(setup: LabSetup, state: TrialState): TrialFacts
/** Spec 7.3 and 7.4: within 1.0% of the seeded concentration, either side, passes. */
export function grade(molarity: number, trueMolarity: number): { percentError: number; passed: boolean }

export type TechniqueError = 'unconditioned-burette' | 'tip-bubble' | 'unrinsed-pipette'
export interface TrialFacts {
  /** Glassware as it stands now. It carries over from trial to trial. */
  buretteConditioned: boolean
  tipBubble: boolean
  pipetteRinsed: boolean
  /** The burette has been filled (or refilled) since the last trial ended. */
  filled: boolean
  aliquotDelivered: boolean
  indicatorDrops: number
  /** Titrant run out of the burette in this trial, in microlitres. */
  deliveredUl: number
  /** Where the meniscus truly was when delivery began (where it is now, if none has), and where it is now: microlitres below the 0.00 mark. */
  startMeniscusUl: number
  meniscusUl: number
  /** Spec 7.3: "a persistent endpoint was reached". */
  endpointReached: boolean
  overshot: boolean
  ranOut: boolean
  /** Within 1.00 mL before this flask's own equivalence volume, or past it, with no persistent endpoint yet. */
  nearEquivalence: boolean
  waterAddedUl: number
  /** The technique errors that count against this trial. */
  errors: readonly TechniqueError[]
}
```

Assumptions, each of which the engine design may answer differently:

1. **A zod schema for `TrialState` is exported by the engine.** zod is already a dependency and is not React or the DOM, so the lint rules allow it. If the engine design prefers a plain type, `progress.ts` writes the schema and holds it to the type with `satisfies z.ZodType<TrialState>`.
2. **Glassware state lives in `TrialState` and carries over** through `nextTrial`.
3. **Which trials a skipped step counts against is the engine's rule** (`errors`). The shell works with either answer: an error that stays until the step is done (recommended, O4), or one that the first use cures. The checklist marks a step skipped from `errors`, whatever the glassware flag says afterwards (tested).
4. **`startMeniscusUl` is frozen when delivery begins.** That is what lets the feedback say truthfully that an initial reading taken before the bubble was cleared was not where the meniscus was when the titration started.
5. **`overshot` is set as soon as** delivered volume is more than 0.10 mL past the flask's equivalence volume, and `ranOut` at the 50.00 mL mark.
6. **`nearEquivalence`** is worked out by the engine from the flask's own equivalence volume, so `app/` never holds that volume.
7. **Grading is the engine's function**, so spec 7.4's grading test and the check flow use the same code.
8. **The bench calls the engine for its own actions** and hands the new `TrialState` to the page, which saves it. The bench asks `promptBefore` before `fill` and `pipette`, and respects `canDeliver`.
9. **When `current` is null** (completed) the bench is drawn at rest; what that looks like is the bench design's.

### 6.3 How it uses `storage.ts` and `activities.ts`

- `useLabProgress(ACTIVITIES[0], titrationProgressSchema)` loads with `loadEntry` and saves with `saveEntry`, both with `ACTIVITIES[0].version`, the number Home reads the status with.
- `ENTRY.titration` and `peekStatus` are used as they are. `peekStatus` needs only `status`.
- **Home** shows the same three words. Nothing is saved until Start, so opening the lab does not turn Home to "In progress".
- **Export** (`exportAll`) already writes every `valence:` key, so the run is in the downloaded file as shown in 6.1. The file contains the seed, from which the answers follow; that is the learner's own file.
- **Clear** (`clearAll`) already removes the entry and its backups.

### 6.4 The "cannot save" notice (spec 10, the rule added today)

Today `sessionStore` reports the last write only, so a refused save of the lab followed by a successful save of the preferences clears the notice while the lab is still unsaved. The change, prototyped in `proto/tracker.ts` against the real `createMemoryStore`, `saveEntry` and `clearAll`:

```ts
// src/app/progress/storage.ts
export interface SessionStore extends KeyValueStore {
  /** Forgets every refused save. clearAll calls it: once everything is cleared, nothing unsaved is left to lose. */
  forgetRefused(): void
}
/**
 * After every write, removal or clearing, `onPersistent` is told whether progress now outlasts the session:
 * never with an in-memory store; with localStorage, only while no key's latest write was refused.
 */
export function sessionStore(browser: { store: KeyValueStore; persistent: boolean }, onPersistent: (persistent: boolean) => void): SessionStore
export function clearAll(store: KeyValueStore & { forgetRefused?(): void }): void
```

It keeps a set of the keys whose latest `setItem` threw. A write that succeeds takes its own key out; `removeItem` takes its key out; the notice shows while the set is not empty. `forgetRefused` exists because an entry whose first save was refused was never stored, so `clearAll` never removes it and the notice would stay for the rest of the session (the prototype's fifth tracker test shows exactly this). `reportingStore` then has no user; it and its two tests in `storage.test.ts` are replaced by `sessionStore`'s.

The lab page shows the notice too (`LabShell`, from `AppState.persistent`): a learner who is titrating is not looking at Settings. Both places use the same state.

## 7. The content

### 7.1 Sourcing rule used

- **Quoted:** only text in the public domain: Oliver Seely's "Proper Use of a Buret" on LibreTexts (the page states that it is in the public domain and may be copied without restriction), and GHS hazard statements as PubChem prints them.
- **Located, not quoted:** everything else, OpenStax included: the heading, the address, and what the passage establishes in this project's own words, in the form `located()` already writes ("not quoted; see ..., https://... It establishes that ...").
- **"This lab:"** marks what a paragraph says that is the lab's own (its set-up, its rules, its model, its arithmetic) and is read in no source.

`support` is kept for review and is not shown; the card's Sources control lists the sources. A test holds every support line to one of the three forms.

Four paragraphs rest on no source. Two need none (the worked example; "nothing here can hurt you"). Two are chemistry and are listed as unverified: the fading pink where a drop lands, and the definition of relative deviation.

### 7.2 The primer, in full

Generated from `proto/primer.ts`. Thirty paragraphs in eleven cards. `M_NaOH` is drawn with a real subscript.

#### 1. Acids, bases and neutralisation

An acid is a substance that gives hydronium ions, H₃O⁺, when it dissolves in water. A base is a substance that gives hydroxide ions, OH⁻, when it dissolves in water.

- *Rests on:* openstax-chem2e-4.2: not quoted; see section 4.2, under “Acid-Base Reactions”, https://openstax.org/books/chemistry-2e/pages/4-2-classifying-chemical-reactions. It establishes that for reactions in water, an acid is a substance that dissolves to yield hydronium ions and a base is one that dissolves to yield hydroxide ions.

Hydrochloric acid is hydrogen chloride, HCl, dissolved in water. It is a strong acid: practically every HCl molecule passes a hydrogen ion to a water molecule, which leaves a hydronium ion and a chloride ion, Cl⁻. Sodium hydroxide, NaOH, is a strong base: in water it separates completely into sodium ions, Na⁺, and hydroxide ions.

- *Rests on:* openstax-chem2e-4.2: not quoted; see section 4.2, under “Acid-Base Reactions”, https://openstax.org/books/chemistry-2e/pages/4-2-classifying-chemical-reactions. It establishes that HCl is a strong acid, since nearly all of the HCl that dissolves gives up its hydrogen ion to water and leaves hydronium and chloride ions; and that NaOH dissolves and dissociates into sodium and hydroxide ions, as the ionic hydroxides that are strong bases do.

When the two solutions meet, hydronium ions and hydroxide ions join to make water. This is a neutralisation: an acid and a base react to give water and a salt. Here the salt is sodium chloride, NaCl, which stays dissolved. One HCl reacts with exactly one NaOH.

> HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l)

- *Rests on:* openstax-chem2e-4.2: not quoted; see section 4.2, under “Acid-Base Reactions”, from the definition of a neutralization reaction to the “Check Your Learning” that follows it, https://openstax.org/books/chemistry-2e/pages/4-2-classifying-chemical-reactions. It establishes that a neutralization reaction is one between an acid and a base whose products are often a salt and water, and that for a strong acid and an ionic hydroxide the net change is hydronium and hydroxide ions forming water.
- *Rests on:* openstax-chem2e-4.5: not quoted; see section 4.5, the worked example “Titration Analysis”, https://openstax.org/books/chemistry-2e/pages/4-5-quantitative-chemical-analysis. It establishes that HCl and NaOH react as HCl(aq) + NaOH(aq) → NaCl(aq) + H2O(l), one mole of HCl for each mole of NaOH.

#### 2. Molarity

Chemists count particles in moles. A mole is a fixed number of particles, about 6.022 × 10²³, in the way that a dozen is twelve.

- *Rests on:* openstax-chem2e-3.1: not quoted; see section 3.1, under “The Mole”, https://openstax.org/books/chemistry-2e/pages/3-1-formula-mass-and-the-mole-concept. It establishes that the mole is an amount unit like a pair or a dozen, and that one mole holds 6.02214076 × 10^23 atoms or molecules.

The concentration of a solution says how much of a substance is dissolved in a given volume of it. Molarity, written M, is the number of moles of the dissolved substance in one litre of solution. A 0.1 M solution of HCl has 0.1 mole of HCl in every litre.

- *Rests on:* openstax-chem2e-3.3: not quoted; see section 3.3, under “Solutions”, https://openstax.org/books/chemistry-2e/pages/3-3-molarity. It establishes that the molarity of a solution is how many moles of solute one litre of it holds.

So the moles in a measured volume are the molarity times the volume in litres. 25.00 mL is 0.02500 L, so 25.00 mL of 0.1000 M HCl holds 0.1000 × 0.02500 = 0.002500 mole of HCl.

- *Rests on:* openstax-chem2e-3.3: not quoted; see section 3.3, the worked example after the definition of molarity, https://openstax.org/books/chemistry-2e/pages/3-3-molarity. It establishes that the definition rearranges to moles of solute = molarity × litres of solution, with millilitres first converted to litres.
- *Rests on:* This lab: the arithmetic of the example is this lab’s own; a test repeats it.

#### 3. What a titration is

A titration measures a concentration by reaction. One solution is run from a burette, a little at a time, into a measured sample of another solution that it reacts with, until the reaction is just complete. If the concentration of one solution is known and both volumes are measured, the concentration of the other can be calculated.

- *Rests on:* openstax-chem2e-4.5: not quoted; see section 4.5, under “Titration”, https://openstax.org/books/chemistry-2e/pages/4-5-quantitative-chemical-analysis. It establishes that a titration uses a buret to add one solution in small steps to a sample of another that it reacts with in a known ratio, and that measuring the volume needed for complete reaction allows a concentration to be calculated.

In most textbook titrations the solution of known concentration is the one in the burette. This lab is the other way round: the HCl in the flask is the known solution, and the NaOH in the burette is the one being measured. The reaction and the arithmetic are the same.

- *Rests on:* openstax-chem2e-4.5: not quoted; see section 4.5, under “Titration”, https://openstax.org/books/chemistry-2e/pages/4-5-quantitative-chemical-analysis. It establishes that in the usual arrangement the buret holds the solution of known concentration (the titrant) and the sample holds the substance being measured (the analyte).
- *Rests on:* This lab: here the flask holds the standardized HCl and the burette the NaOH (spec 7.1).

#### 4. Why sodium hydroxide has to be standardized

A sodium hydroxide solution of exactly known molarity cannot be made by weighing out the solid. Solid NaOH takes up water from the air, and it reacts with carbon dioxide from the air to form sodium carbonate. So a weighed portion is never pure NaOH, and nobody can say exactly how much NaOH it holds.

- *Rests on:* harvey-ac21-5.1: not quoted; see section 5.1, under “Primary and Secondary Standards”, https://chem.libretexts.org/Bookshelves/Analytical_Chemistry/Analytical_Chemistry_2.1_by_David_Harvey/Analytical_Chemistry_2.1_(Harvey)/05%3A_Standardizing_Analytical_Methods/5.01%3A_Analytical_Signals. It establishes that commercial NaOH contains sodium carbonate among its impurities and readily absorbs water from the atmosphere, so it cannot serve as a primary standard and its concentration is found by titration.
- *Rests on:* harvey-ac21-9.2: not quoted; see section 9.2, under “Selecting and Standardizing a Titrant”, https://chem.libretexts.org/Bookshelves/Analytical_Chemistry/Analytical_Chemistry_2.1_by_David_Harvey/Analytical_Chemistry_2.1_(Harvey)/09%3A_Titrimetric_Methods/9.02%3A_AcidBase_Titrations. It establishes that solid NaOH is always contaminated with carbonate from its contact with the atmosphere, because carbon dioxide reacts with hydroxide to form carbonate.

Instead the solution is made up to roughly the strength wanted, about 0.1 M here, and its exact molarity is then measured by titrating it against a solution whose concentration is already known. Measuring a concentration this way is called standardizing the solution. In this lab the known solution is the hydrochloric acid, whose molarity is printed on its bottle.

- *Rests on:* harvey-ac21-5.1: not quoted; see section 5.1, under “Primary and Secondary Standards”, https://chem.libretexts.org/Bookshelves/Analytical_Chemistry/Analytical_Chemistry_2.1_by_David_Harvey/Analytical_Chemistry_2.1_(Harvey)/05%3A_Standardizing_Analytical_Methods/5.01%3A_Analytical_Signals. It establishes that the concentration of a reagent that is not a primary standard, NaOH being the example given, is determined by titrating it against a standard.
- *Rests on:* harvey-ac21-9.2: not quoted; see section 9.2, under “Selecting and Standardizing a Titrant”, https://chem.libretexts.org/Bookshelves/Analytical_Chemistry/Analytical_Chemistry_2.1_by_David_Harvey/Analytical_Chemistry_2.1_(Harvey)/09%3A_Titrimetric_Methods/9.02%3A_AcidBase_Titrations. It establishes that solutions of NaOH are standardized by titration against a standard acid.
- *Rests on:* This lab: the known solution here is standardized HCl (spec 7.1). The sources standardize NaOH against a weighed primary standard, a solid acid such as potassium hydrogen phthalate.

#### 5. Equivalence point and endpoint

The equivalence point is the moment when exactly enough NaOH has been added to react with all the HCl in the flask: the moles of NaOH added equal the moles of HCl that were there. To see it, an indicator is added to the flask: a dye that changes colour at or very near the equivalence point.

- *Rests on:* openstax-chem2e-4.5: not quoted; see section 4.5, under “Titration”, https://openstax.org/books/chemistry-2e/pages/4-5-quantitative-chemical-analysis. It establishes that the equivalence point is the volume of titrant needed for complete reaction with the analyte, and that indicators are dyes added to the sample to change colour at or very near it.

The endpoint is what is actually measured: the burette reading at which the indicator changes colour and you stop. A well-chosen indicator puts the endpoint so close to the equivalence point that the difference does not matter.

- *Rests on:* openstax-chem2e-4.5: not quoted; see section 4.5, under “Titration”, https://openstax.org/books/chemistry-2e/pages/4-5-quantitative-chemical-analysis. It establishes that the end point is the name for the titrant volume that is in fact measured, and that in a properly designed titration the two volumes differ by a negligible amount.

#### 6. Why phenolphthalein

pH is a scale for how acidic or basic a solution is. At 25 °C a pH below 7 is acidic, 7 is neutral, and above 7 is basic. Phenolphthalein is colourless below a pH of about 8.3 and pink above it.

- *Rests on:* openstax-chem2e-14.2: not quoted; see section 14.2, Table 14.1, https://openstax.org/books/chemistry-2e/pages/14-2-ph-and-poh. It establishes that at 25 °C a solution is acidic when its pH is below 7, neutral at 7 and basic above 7.
- *Rests on:* openstax-chem2e-14.7: not quoted; see section 14.7, under “Acid-Base Indicators”, https://openstax.org/books/chemistry-2e/pages/14-7-acid-base-titrations. It establishes that phenolphthalein is colourless in solutions of pH below 8.3 and red or pink in more basic ones.

When a strong acid is titrated with a strong base, the pH of the flask climbs slowly at first and then leaps from acidic to basic over a very small addition around the equivalence point. The colour change of phenolphthalein lies inside that leap, so the first lasting pink appears almost exactly at the equivalence point.

- *Rests on:* openstax-chem2e-14.7: not quoted; see section 14.7, under “Acid-Base Indicators”, the paragraph on Figure 14.20, https://openstax.org/books/chemistry-2e/pages/14-7-acid-base-titrations. It establishes that when a strong base is run into a strong acid, the colour-change interval of phenolphthalein lies within the steep rise in pH around the equivalence point, which gives a sharp colour change.

Where a drop of NaOH lands, the solution turns pink for a moment and then clears as swirling mixes it with acid from the rest of the flask. The closer the flask is to the endpoint, the longer the pink takes to fade. The endpoint is the first faint pink that stays after swirling. A deep pink means the endpoint has been passed.

- *Rests on:* This lab: this describes the lab’s own model of the flask (spec 7.2, the plume; spec 7.3, the threshold and the overshoot). No source for it was read.

#### 7. The calculation

At the endpoint the moles of NaOH added equal the moles of HCl in the flask, because the two react one to one. Moles are molarity times volume, so:

> M_NaOH × V_NaOH = M_HCl × V_HCl

- *Rests on:* openstax-chem2e-4.5: not quoted; see section 4.5, the worked example “Titration Analysis” and the note that follows it, https://openstax.org/books/chemistry-2e/pages/4-5-quantitative-chemical-analysis. It establishes that the calculation rests on the mole ratio of the balanced equation, one HCl to one NaOH, with moles found as molarity times volume; and that molarity is also millimoles per millilitre, so the volumes may be left in millilitres.

Rearranged for the molarity you are looking for, with M_HCl the molarity on the acid bottle, V_HCl the 25.00 mL you pipetted, and V_NaOH the titre: the final burette reading minus the initial reading. Both volumes can stay in millilitres, because the units cancel.

> M_NaOH = M_HCl × V_HCl ÷ V_NaOH

- *Rests on:* openstax-chem2e-4.5: not quoted; see section 4.5, the note after the worked example “Titration Analysis”, https://openstax.org/books/chemistry-2e/pages/4-5-quantitative-chemical-analysis. It establishes that molarity is also millimoles of solute per millilitre of solution, so the volumes may be left in millilitres.
- *Rests on:* This lab: the pipette is 25.00 mL (spec 7.1).

For example, with 0.1200 M HCl, an initial reading of 0.50 mL and a final reading of 30.50 mL, the titre is 30.00 mL and M_NaOH = 0.1200 × 25.00 ÷ 30.00 = 0.1000 M. These numbers are only an example; your bottle and your readings will be different. Give the molarity to four decimal places, as the bottle label does.

- *Rests on:* This lab: the example is this lab’s own, with numbers outside the range any bottle here can have; a test repeats its arithmetic. Four decimal places is a rule of this lab.

#### 8. Reading the burette

A burette is a long, narrow glass tube with a scale along it and a tap, called the stopcock, at the bottom. Its scale starts at 0.00 mL at the top and the numbers increase downward, so the reading grows as solution runs out. The volume delivered is the final reading minus the initial reading; the burette does not need to start at zero.

- *Rests on:* harvey-ac21-9.1: not quoted; see section 9.1, under “The Buret”, https://chem.libretexts.org/Bookshelves/Analytical_Chemistry/Analytical_Chemistry_2.1_by_David_Harvey/Analytical_Chemistry_2.1_(Harvey)/09%3A_Titrimetric_Methods/9.01%3A_Overview_of_Titrimetry. It establishes that a buret is a long, narrow graduated tube with a stopcock for dispensing the titrant.
- *Rests on:* wikipedia-burette: not quoted; see the article’s opening section, https://en.wikipedia.org/w/index.php?title=Burette&oldid=1367898253. It establishes that a burette is graduated from the top downward, so that the volume dispensed is found by taking the first reading from the last.

The surface of the liquid is curved. The curve is called the meniscus. Read the lowest point of the meniscus, with your eye level with it; looking from above or from below shifts the reading.

- *Rests on:* openstax-chem2e-1.5: not quoted; see section 1.5, under “Significant Figures in Measurement”, https://openstax.org/books/chemistry-2e/pages/1-5-measurement-uncertainty-accuracy-and-precision. It establishes that a volume is read where the liquid's curved surface, the meniscus, is lowest.
- *Rests on:* seely-buret: “When reading a buret it is important that your line of sight be in a direction perpendicular to the buret column.”

This burette is marked every 0.1 mL. Judge how far the meniscus sits between two marks, in tenths of the gap, and write the reading to 0.01 mL: 1.20, not 1.2. The last digit is an estimate, and it still counts.

- *Rests on:* openstax-chem2e-1.5: not quoted; see section 1.5, under “Significant Figures in Measurement”, https://openstax.org/books/chemistry-2e/pages/1-5-measurement-uncertainty-accuracy-and-precision. It establishes that a reading is made by mentally dividing the gap between two marks into tenths and estimating the last digit, and that this uncertain last digit is one of the measurement’s significant figures.
- *Rests on:* openstax-chem2e-4.5: not quoted; see section 4.5, the caption of Figure 4.16, https://openstax.org/books/chemistry-2e/pages/4-5-quantitative-chemical-analysis. It establishes that volumes can be measured to within 0.01 mL on an ordinary buret.
- *Rests on:* seely-buret: “A 50 mL buret can be read to ±0.01 mL, but in order to be able to interpolate to the last digit, the perpendicular line of sight must be followed with meticulous care.”
- *Rests on:* This lab: the burette is graduated every 0.1 mL (spec 7.1).

#### 9. Conditioning, rinsing and the tip bubble

Glassware is washed with water, and some water stays behind on the inside. A wet burette dilutes the NaOH poured into it; a wet pipette dilutes the HCl drawn into it. Either way, the solution that is measured is weaker than the solution in the bottle. So before use the burette is rinsed with a little of the NaOH solution, which is called conditioning it, and the pipette is rinsed with a little of the HCl solution. The rinsings go to waste.

- *Rests on:* harvey-ac21-2.4: not quoted; see section 2.4, under “Equipment for Measuring Volume”, https://chem.libretexts.org/Bookshelves/Analytical_Chemistry/Analytical_Chemistry_2.1_by_David_Harvey/Analytical_Chemistry_2.1_(Harvey)/02%3A_Basic_Tools_of_Analytical_Chemistry/2.04%3A_Basic_Equipment. It establishes that before use a pipet is rinsed several times with a little of the solution it is to measure, to remove any liquid left in it.
- *Rests on:* seely-pipet: not quoted; see the paragraphs on cleaning volumetric glassware, before the pipet is first used, https://chem.libretexts.org/Ancillary_Materials/Demos_Techniques_and_Experiments/General_Lab_Techniques/Use_of_a_Volumetric_Pipet. It establishes that volumetric pipets and burets that are still wet from cleaning are rinsed, before they are used, with a little of the solution they are to measure.

The flask is different. It only has to be clean; it may be wet, and distilled water may be added to it during the titration. Water changes the concentration of the acid in the flask but not the number of moles of acid there, and it is the moles that the NaOH has to match.

- *Rests on:* openstax-chem2e-3.3: not quoted; see section 3.3, under “Dilution of Solutions”, https://openstax.org/books/chemistry-2e/pages/3-3-molarity. It establishes that diluting a solution lowers its concentration and leaves the amount of solute as it was.

Air can be trapped in the burette tip, below the stopcock. It has to be pushed out before the first reading, by running a little NaOH through the tip. If the bubble comes out during the titration instead, NaOH takes its place, and the burette reads more than was delivered to the flask.

- *Rests on:* seely-buret: “A bubble in the nozzle of a buret will produce an inaccurate volume reading if the bubble escapes during a titration.”
- *Rests on:* seely-buret: “The quickest way to get rid of nozzle bubbles is to fill the buret with titrant and open the valve.”

#### 10. How closely the trials agree

One titration can go wrong without showing it, so the measurement is repeated. Results that agree closely with each other are precise. Results that are close to the true value are accurate. Precise results are not always accurate: a mistake repeated every time, such as a burette that was never conditioned, gives results that agree with each other and are all wrong.

- *Rests on:* openstax-chem2e-1.5: not quoted; see section 1.5, under “Accuracy and Precision”, https://openstax.org/books/chemistry-2e/pages/1-5-measurement-uncertainty-accuracy-and-precision. It establishes that measurements are precise when repeated results agree closely with each other and accurate when a result is close to the true value, and that scientists repeat measurements to judge both.
- *Rests on:* This lab: the unconditioned burette as an example of a repeated error is the lab’s own model (spec 7.3).

This lab measures agreement by the relative deviation. Take the average of the molarities. Find how far each one is from the average, ignoring the sign, and average those distances. Divide by the average molarity and multiply by 1000. The answer is in parts per thousand: 2 parts per thousand means the trials are, on average, 0.2% away from their average.

- *Rests on:* This lab: the definition is this lab’s (spec 7.3: mean absolute deviation divided by the mean, in parts per thousand). No source for it was read.

#### 11. Safety

Nothing in this simulation can hurt you, and nothing in it replaces the safety training and the rules of a real laboratory.

- *Rests on:* This lab: a statement about Valence, not chemistry.

In a real laboratory this experiment is done wearing eye protection. The solutions are dilute, about 0.1 M, but a supplier’s safety data sheet for hydrochloric acid of this strength still classes it as irritating to the skin and the eyes. For a splash of either solution on the skin or in the eyes, the data sheets say to rinse with plenty of water for at least 15 minutes.

- *Rests on:* fisher-sds-hcl-0.1n: not quoted; see sections 2 (hazard identification) and 4 (first-aid measures), https://www.fishersci.com/store/msds?partNumber=SA541&productDescription=HYDROCHLORIC+ACID+0.1N+1L&vendorId=VN00033897&countryCode=US&language=en. It establishes that 0.1 N hydrochloric acid carries the signal word Warning, as causing skin irritation and serious eye irritation and as possibly corrosive to metals; that eye protection is to be worn; and that eyes and skin are to be rinsed with plenty of water for at least 15 minutes.
- *Rests on:* fisher-sds-naoh-0.1n: not quoted; see sections 2 (hazard identification) and 4 (first-aid measures), https://www.fishersci.com/store/msds?partNumber=SS2761&productDescription=SODIUM+HYDROXIDE+0.1N+1L&vendorId=VN00033897&countryCode=US&language=en. It establishes that 0.1 N sodium hydroxide is not classed as hazardous under the United States hazard communication standard, and that eyes and skin are still to be rinsed with plenty of water for at least 15 minutes.

Concentrated hydrochloric acid and solid sodium hydroxide are another matter: both cause severe skin burns and eye damage. The hazard statements on each bottle in this lab are those of the pure substance, followed by a note about the dilute solution used here.

- *Rests on:* pubchem-ghs-cid-313: “H314: Causes severe skin burns and eye damage”
- *Rests on:* pubchem-ghs-cid-14798: “H314: Causes severe skin burns and eye damage”

Phenolphthalein is classified as a substance that may cause cancer. A titration uses a few drops of a dilute solution of it; the solution is kept off the skin, and hands are washed afterwards. The indicator solution is made with alcohol and is flammable.

- *Rests on:* pubchem-ghs-cid-4764: “H350: May cause cancer”
- *Rests on:* fisher-sds-phenolphthalein-1pct: not quoted; see section 2 (hazard identification), https://www.fishersci.com/store/msds?partNumber=SP62500&productDescription=PHENOLPHTHALEIN+0.5%25+ALCOHOLIC+500ML&vendorId=VN00033897&countryCode=US&language=en. It establishes that a 1% solution of phenolphthalein in isopropyl alcohol is a highly flammable liquid, that gloves and eye protection are to be worn, and that hands and exposed skin are to be washed after handling.
- *Rests on:* This lab: the indicator modelled is 0.5% in ethanol and water (spec 7.3); no data sheet for exactly that solution was read.

### 7.3 What a lab instructor would word differently

1. **The standard.** Courses usually standardize NaOH against a weighed primary standard, potassium hydrogen phthalate; both of Harvey's passages say so. This lab titrates against "standardized HCl" (spec 7.1), which is itself a solution someone had to standardize. The primer says "a solution whose concentration is already known" and does not call the HCl a primary standard. An instructor may want a sentence on where the HCl's value comes from.
2. **"Cannot be weighed accurately."** Strictly, the solid can be weighed; what cannot be known is how much of the weighed mass is NaOH. The primer says that.
3. **Four decimal places** instead of a significant-figure rule (4.2). An instructor who grades significant figures would want 0.101 M where the label is 0.0953 M.
4. **"About pH 8.3."** OpenStax gives 8.3 as the point of change; pharmacopoeias give a range of 8.2 to 10.0, and the model's pink begins near pH 8.5 to 9 (the spike). "About" covers it; an instructor may prefer the range.
5. **"Conditioning."** Some labs say "rinsing" or "priming" the burette. The primer gives both words once.
6. **Endpoint or end point; neutralisation or neutralization.** The primer follows the spec's "endpoint" and the app's British spelling, with "standardize" as the lab's title spells it.
7. **The hydrogen ion.** The primer says HCl "passes a hydrogen ion to a water molecule", following OpenStax. An instructor may say "proton" or "ionizes".
8. **Relative deviation.** Many courses call this "relative average deviation"; others use relative standard deviation. The definition is the spec's.
9. **The faint pink that persists.** Real procedures say "persists for 30 seconds", because the pink slowly fades as the flask takes up CO2 from the air; the model has a closed flask and no fading, so the primer says "stays after swirling" and gives no time.
10. **Safety.** The primer does not tell the learner how to fill a burette safely (below eye level, with a funnel), how to dispose of the solutions, or what gloves to wear: no free source for those was read, and they are a real lab's own rules. It says the simulation replaces none of it.

### 7.4 Hazard text for the three bottles

The existing pattern: one hand-picked GHS classification of the pure substance from the PubChem record, and a note for the concentration used. The classification picked is the one PubChem gives from Regulation (EC) No 1272/2008 (the European Union's harmonised classification), the same choice for all three. The note makes a claim of its own (what a data sheet says about the dilute solution), so it needs its own source: `hazardsSchema.note` becomes `cited(text)`. No reagent exists in the registry yet, so nothing else changes.

**Hydrochloric acid, about 0.1 M (standardized)** (`titration-hcl`, PubChem CID 313)

- Signal word: Danger
- Hazards of the pure substance (`pubchem-ghs-cid-313`): H314: Causes severe skin burns and eye damage; H331: Toxic if inhaled
- Note for the concentration used (`fisher-sds-hcl-0.1n`): Those are the hazards of hydrogen chloride itself. The solution here is about 0.1 M, roughly 0.4% hydrogen chloride by mass. A supplier’s safety data sheet for hydrochloric acid of this strength gives the signal word Warning: it causes skin irritation and serious eye irritation, and may be corrosive to metals.

**Sodium hydroxide, about 0.1 M** (`titration-naoh`, PubChem CID 14798)

- Signal word: Danger
- Hazards of the pure substance (`pubchem-ghs-cid-14798`): H314: Causes severe skin burns and eye damage
- Note for the concentration used (`fisher-sds-naoh-0.1n`): That is the hazard of solid sodium hydroxide. The solution here is about 0.1 M, roughly 0.4% sodium hydroxide by mass. A supplier’s safety data sheet for sodium hydroxide of this strength does not class it as hazardous; its advice for a splash in the eyes or on the skin is still to rinse with plenty of water for at least 15 minutes.

**Phenolphthalein indicator solution, 0.5%** (`titration-phenolphthalein`, PubChem CID 4764)

- Signal word: Danger
- Hazards of the pure substance (`pubchem-ghs-cid-4764`): H350: May cause cancer; H341: Suspected of causing genetic defects; H361f: Suspected of damaging fertility
- Note for the concentration used (`fisher-sds-phenolphthalein-1pct`): Those are the hazards of solid phenolphthalein. The indicator here is a dilute solution, 0.5% in a mixture of alcohol and water, used a few drops at a time. No safety data sheet for exactly this solution was read. One for a 1% solution in alcohol gives the signal word Danger: a highly flammable liquid, suspected of causing cancer, to be handled with gloves and eye protection.

The bottle card labels the statements "Hazards of the pure substance" and the note "At the strength used here", and ends with Sources.

```ts
// src/chem-data/schema.ts (changed)
export const hazardsSchema = z.strictObject({
  signalWord: z.enum(['Danger', 'Warning', 'None']),
  statements: z.array(text),
  /** What is known of the hazards at the concentration used, with the source it rests on. */
  note: cited(text),
  sourceId: id,
})
// src/chem-data/titration/bottles.ts
export interface Bottle { id: string; name: string; formula: string; pubchemCid: number; hazards: z.infer<typeof hazardsSchema> }
export const TITRATION_BOTTLES: readonly Bottle[]
```

The three bottles are **not** registry reagents. `reagentSchema` requires a fixed `molarity` and a list of ions; this lab's acid has a seeded molarity and the engine does not use species records. Phase 4's reagents (1 M, 3 M and 6 M HCl, 1 M and 6 M NaOH) are different bottles and will be registry reagents with their own concentration notes.

"About 0.4% by mass" is worked out, not read: 0.1 mol/L x 36.458 g/mol = 3.6 g/L and 0.1 x 39.997 = 4.0 g/L, taking the density as 1.00 g/mL. A test repeats it.

### 7.5 Data shapes for the content

```ts
// src/chem-data/support.ts (moved from periodic.ts, which re-exports them; periodic.ts itself is too heavy to import for this)
export type Passage = readonly [sourceId: string, passage: string]
export function located(url: string, where: string, establishes: string): string

// src/chem-data/titration/primer.ts
/** A paragraph: the text shown, an equation shown under it, its sources, and what it rests on (kept for review, not shown). */
export interface PrimerParagraph { text: string; equation?: string; sourceIds: string[]; support: string }
export interface PrimerSection { id: string; heading: string; paragraphs: PrimerParagraph[] }
export const TITRATION_PRIMER: readonly PrimerSection[]
```

### 7.6 Sources to add to `sources.json`

`sources.json` is written by `npm run build:data`, so these go in through the script, from an input file under `docs/research/phase-3/`. Twenty entries. The OpenStax citations here do not state a licence; the existing ones do, and are part of O1.

| id | url | citation |
| --- | --- | --- |
| `openstax-chem2e-1.5` | https://openstax.org/books/chemistry-2e/pages/1-5-measurement-uncertainty-accuracy-and-precision | Flowers, P.; Theopold, K.; Langley, R.; Robinson, W. R. Chemistry 2e; OpenStax: Houston, TX, 2019; Section 1.5 Measurement Uncertainty, Accuracy, and Precision (retrieved 2026-10-04). Access for free at https://openstax.org/books/chemistry-2e/pages/1-introduction |
| `openstax-chem2e-3.1` | https://openstax.org/books/chemistry-2e/pages/3-1-formula-mass-and-the-mole-concept | Flowers, P.; Theopold, K.; Langley, R.; Robinson, W. R. Chemistry 2e; OpenStax: Houston, TX, 2019; Section 3.1 Formula Mass and the Mole Concept (retrieved 2026-10-04). Access for free at https://openstax.org/books/chemistry-2e/pages/1-introduction |
| `openstax-chem2e-3.3` | https://openstax.org/books/chemistry-2e/pages/3-3-molarity | Flowers, P.; Theopold, K.; Langley, R.; Robinson, W. R. Chemistry 2e; OpenStax: Houston, TX, 2019; Section 3.3 Molarity (retrieved 2026-10-04). Access for free at https://openstax.org/books/chemistry-2e/pages/1-introduction |
| `openstax-chem2e-4.2` | https://openstax.org/books/chemistry-2e/pages/4-2-classifying-chemical-reactions | Flowers, P.; Theopold, K.; Langley, R.; Robinson, W. R. Chemistry 2e; OpenStax: Houston, TX, 2019; Section 4.2 Classifying Chemical Reactions (retrieved 2026-10-04). Access for free at https://openstax.org/books/chemistry-2e/pages/1-introduction |
| `openstax-chem2e-4.5` | https://openstax.org/books/chemistry-2e/pages/4-5-quantitative-chemical-analysis | Flowers, P.; Theopold, K.; Langley, R.; Robinson, W. R. Chemistry 2e; OpenStax: Houston, TX, 2019; Section 4.5 Quantitative Chemical Analysis (retrieved 2026-10-04). Access for free at https://openstax.org/books/chemistry-2e/pages/1-introduction |
| `openstax-chem2e-14.2` | https://openstax.org/books/chemistry-2e/pages/14-2-ph-and-poh | Flowers, P.; Theopold, K.; Langley, R.; Robinson, W. R. Chemistry 2e; OpenStax: Houston, TX, 2019; Section 14.2 pH and pOH (retrieved 2026-10-04). Access for free at https://openstax.org/books/chemistry-2e/pages/1-introduction |
| `openstax-chem2e-14.7` | https://openstax.org/books/chemistry-2e/pages/14-7-acid-base-titrations | Flowers, P.; Theopold, K.; Langley, R.; Robinson, W. R. Chemistry 2e; OpenStax: Houston, TX, 2019; Section 14.7 Acid-Base Titrations (retrieved 2026-10-04). Access for free at https://openstax.org/books/chemistry-2e/pages/1-introduction |
| `harvey-ac21-2.4` | https://chem.libretexts.org/Bookshelves/Analytical_Chemistry/Analytical_Chemistry_2.1_by_David_Harvey/Analytical_Chemistry_2.1_(Harvey)/02%3A_Basic_Tools_of_Analytical_Chemistry/2.04%3A_Basic_Equipment | Harvey, D. Analytical Chemistry 2.1; LibreTexts; Section 2.4 Basic Equipment (retrieved 2026-10-04). Licensed CC BY-NC-SA 4.0. |
| `harvey-ac21-5.1` | https://chem.libretexts.org/Bookshelves/Analytical_Chemistry/Analytical_Chemistry_2.1_by_David_Harvey/Analytical_Chemistry_2.1_(Harvey)/05%3A_Standardizing_Analytical_Methods/5.01%3A_Analytical_Signals | Harvey, D. Analytical Chemistry 2.1; LibreTexts; Section 5.1 Analytical Signals (retrieved 2026-10-04). Licensed CC BY-NC-SA 4.0. |
| `harvey-ac21-9.1` | https://chem.libretexts.org/Bookshelves/Analytical_Chemistry/Analytical_Chemistry_2.1_by_David_Harvey/Analytical_Chemistry_2.1_(Harvey)/09%3A_Titrimetric_Methods/9.01%3A_Overview_of_Titrimetry | Harvey, D. Analytical Chemistry 2.1; LibreTexts; Section 9.1 Overview of Titrimetry (retrieved 2026-10-04). Licensed CC BY-NC-SA 4.0. |
| `harvey-ac21-9.2` | https://chem.libretexts.org/Bookshelves/Analytical_Chemistry/Analytical_Chemistry_2.1_by_David_Harvey/Analytical_Chemistry_2.1_(Harvey)/09%3A_Titrimetric_Methods/9.02%3A_AcidBase_Titrations | Harvey, D. Analytical Chemistry 2.1; LibreTexts; Section 9.2 Acid–Base Titrations (retrieved 2026-10-04). Licensed CC BY-NC-SA 4.0. |
| `seely-buret` | https://chem.libretexts.org/Ancillary_Materials/Demos_Techniques_and_Experiments/General_Lab_Techniques/Proper_Use_of_a_Buret | Seely, O. Proper Use of a Buret; General Lab Techniques, LibreTexts (retrieved 2026-10-04). The page states that it is in the public domain and may be copied without restriction. |
| `seely-pipet` | https://chem.libretexts.org/Ancillary_Materials/Demos_Techniques_and_Experiments/General_Lab_Techniques/Use_of_a_Volumetric_Pipet | Seely, O. Use of a Volumetric Pipet; General Lab Techniques, LibreTexts (retrieved 2026-10-04). Licensed CC BY-NC-SA 4.0. |
| `wikipedia-burette` | https://en.wikipedia.org/w/index.php?title=Burette&oldid=1367898253 | Wikipedia contributors. Burette; Wikipedia, revision of 2026-08-05 (retrieved 2026-10-04). Licensed CC BY-SA 4.0. |
| `pubchem-ghs-cid-313` | https://pubchem.ncbi.nlm.nih.gov/compound/313#section=GHS-Classification | PubChem, National Library of Medicine (NCBI). Compound summary for CID 313 (hydrochloric acid), section GHS Classification: the classification PubChem gives from Regulation (EC) No 1272/2008, the European Union's harmonised classification (retrieved 2026-10-04). |
| `pubchem-ghs-cid-14798` | https://pubchem.ncbi.nlm.nih.gov/compound/14798#section=GHS-Classification | PubChem, National Library of Medicine (NCBI). Compound summary for CID 14798 (sodium hydroxide), section GHS Classification: the classification PubChem gives from Regulation (EC) No 1272/2008, the European Union's harmonised classification (retrieved 2026-10-04). |
| `pubchem-ghs-cid-4764` | https://pubchem.ncbi.nlm.nih.gov/compound/4764#section=GHS-Classification | PubChem, National Library of Medicine (NCBI). Compound summary for CID 4764 (phenolphthalein), section GHS Classification: the classification PubChem gives from Regulation (EC) No 1272/2008, the European Union's harmonised classification (retrieved 2026-10-04). |
| `fisher-sds-hcl-0.1n` | https://www.fishersci.com/store/msds?partNumber=SA541&productDescription=HYDROCHLORIC+ACID+0.1N+1L&vendorId=VN00033897&countryCode=US&language=en | Fisher Scientific. Safety Data Sheet: Hydrochloric Acid Solution, 0.1N (Certified); revision of 18 December 2025 (retrieved 2026-10-04). |
| `fisher-sds-naoh-0.1n` | https://www.fishersci.com/store/msds?partNumber=SS2761&productDescription=SODIUM+HYDROXIDE+0.1N+1L&vendorId=VN00033897&countryCode=US&language=en | Fisher Scientific. Safety Data Sheet: Sodium hydroxide solutions, 0.1N; revision of 18 December 2025 (retrieved 2026-10-04). |
| `fisher-sds-phenolphthalein-1pct` | https://www.fishersci.com/store/msds?partNumber=SP62500&productDescription=PHENOLPHTHALEIN+0.5%25+ALCOHOLIC+500ML&vendorId=VN00033897&countryCode=US&language=en | Fisher Scientific. Safety Data Sheet: Phenolphthalein Solution, Alcoholic, 1.0% (1% phenolphthalein in isopropyl alcohol); revision of 18 December 2025 (retrieved 2026-10-04). |

## 8. Documentation (spec 12): text for `docs/for-institutions.md`

Written to be true once the lab is built as designed. The sentences marked [engine] describe the model and must be checked against the engine as built before they are committed. The opening paragraph's "The current version has ..." and the "What exists" line need the lab added. The Accessibility section is written from the hand checklist of the phase, not here.

### 8.1 IT and security: one line to add under Storage

> The titration lab stores one entry, `valence:lab:titration`: the seed of the run, the mode, the readings and molarities the learner typed, each trial's result, and the state of the trial under way, so that a reload resumes it. It holds nothing that identifies the learner.

### 8.2 Faculty and curriculum: new section

> ### The titration lab
>
> **What it teaches.** Standardizing a sodium hydroxide solution of about 0.1 M against hydrochloric acid of known molarity, with phenolphthalein as indicator. The learner conditions the burette, clears the bubble from its tip, reads the meniscus to 0.01 mL, rinses a pipette and delivers a 25.00 mL aliquot, titrates to a faint pink that persists, and calculates the molarity of the base from M(NaOH) = M(HCl) × V(HCl) ÷ V(NaOH). Three trials must pass. The learner then works out their average and its relative deviation and compares them with the notebook's.
>
> **The primer.** Before the bench, a primer explains acids, bases and neutralisation, molarity, what a titration is, why sodium hydroxide has to be standardized, the equivalence point and the endpoint, why phenolphthalein is used, the calculation, how to read a burette, why glassware is conditioned and rinsed, precision and accuracy, and safety, for a reader with no chemistry background. Each part lists its sources.
>
> **How a run is made.** Each run has a seed, shown in the notebook. It fixes the molarity on the acid bottle (0.0850 to 0.1050 M), the molarity of the base, which the learner is not shown (0.0950 to 0.1050 M), and small variations in what the pipette delivers and where the burette is filled to. The same seed and the same actions always give the same readings and the same answer. Restarting draws a new seed.
>
> **Two modes.** Guided shows a checklist of the steps, warns before a technique step is skipped, asks for a burette reading again when it is more than 0.02 mL from the meniscus, and says when the endpoint is within 1 mL. It never shows the expected titre or molarity. Challenge shows none of these; a skipped step or a misread burette carries into the result.
>
> **How answers are checked.** The learner types both burette readings and their own calculated molarity. The lab first checks that the molarity follows from the learner's own readings, to within one unit in the fourth decimal place; it then marks the molarity against the base's true molarity. Within 1.0% passes. A trial that does not pass shows its percent error, with its sign, and names what went wrong. A trial in which more than 0.10 mL of base was added past the equivalence point, or in which the burette ran out, is invalid and is repeated. The true molarity is shown only when three trials have passed. The relative deviation (the mean absolute deviation of the three molarities divided by their mean, in parts per thousand) is shown and is not marked.
>
> **Technique errors are exaggerated, and named.** In the model an unconditioned burette dilutes the base by 2.0%, an unrinsed pipette dilutes the acid by 2.0%, and a bubble left in the burette tip adds 0.60 mL to the reading. [engine] These are larger than at a real bench. They were chosen so that each error, by itself, fails a trial, and the feedback after the trial names the error and says which way it moved the result. They are parameters of the model, stored with the reason for each, not measurements. Distilled water added to the flask changes nothing, and the feedback says why.
>
> **Where the chemistry comes from.** [engine: one row per constant, from the engine's data] The primer's statements rest on OpenStax Chemistry 2e, David Harvey's Analytical Chemistry 2.1, and two laboratory technique pages on LibreTexts; the source code keeps, beside each paragraph, where the passage is and what it establishes. The hazard statements are PubChem's.
>
> **Conventions chosen.**
>
> - The known solution is hydrochloric acid whose molarity is given. Courses often standardize sodium hydroxide against a weighed solid acid instead; the calculation has the same form.
> - Molarities are written to four decimal places in every case, the precision of the bottle's label, and not by a significant-figure rule.
> - A burette reading is written to two decimal places; a reading in any other form is not accepted.
> - Technique errors stay in force until the step is done. [engine]
>
> **Known limits.**
>
> - No chemistry instructor has reviewed the primer, the messages or the model.
> - Two statements in the primer rest on no source that was read: the description of how the pink fades where a drop lands, which describes the lab's own model, and the definition of relative deviation.
> - The percent error of a failed trial lets a learner work out the true molarity. A trial cannot be passed that way, because a marked trial is final and the molarity has to follow from the learner's own readings.
> - A trial can pass although a technique step was skipped, when two errors cancel. The feedback says so.
> - The model leaves out the slow fading of the pink as a real flask takes up carbon dioxide from the air, activity corrections, and temperatures other than 25 °C. [engine]

### 8.3 Lab safety: new section (replacing "A lab safety section will be added with the labs")

> ## Lab safety
>
> - **A supplement, not a replacement.** Valence is a simulation. It supplements bench work and does not replace it, and it does not replace safety training. Nothing in it teaches the handling of real glassware or chemicals, and finishing a lab in Valence is no evidence that a learner can work safely at a bench.
> - **What the hazard information is.** Each bottle in the titration lab shows the GHS signal word and hazard statements of the pure substance, taken from its PubChem record (the European Union's harmonised classification as PubChem gives it) and labelled "hazards of the pure substance". Under them is a note about the dilute solution the lab uses, with its own source.
> - **What the notes rest on.** The notes for 0.1 M hydrochloric acid and 0.1 M sodium hydroxide each rest on one supplier's safety data sheet. No data sheet was read for the indicator solution the lab models (0.5% phenolphthalein in ethanol and water); its note says so and describes a 1% solution in alcohol instead. An institution's own safety data sheets and rules take precedence over anything shown in Valence.
> - **What is not covered.** The choice of protective equipment, spills, waste disposal and emergency equipment. The primer's safety part says only what the cited data sheets say, and that the simulation replaces none of a real laboratory's training.
> - **Exaggerated errors.** The technique errors in the titration lab are larger than at a real bench (see Faculty and curriculum). They are about the accuracy of a result, not about safety.

## 9. The tests

The prototype's seven test files become the plan's test files (4 through 12 below name where each goes). All 97 ran and passed; `tsc` passed. The cases with their expected values:

### 9.1 `notebook.test.ts`

| Case | Expected |
| --- | --- |
| `parseReading` of `1.23`, `26.48`, `0.00`, `50.00`, `01.23` | 123, 2648, 0, 5000, 123 |
| `parseReading` of `1.2`, `1.234`, `.50`, `1,23`, empty, ` 1.23`, `-1.00`, `50.01`, `012.30`, `12`, `1e1` | null each |
| `parseMolarity` of `0.0953`, `0.1023`, `0.0001`, `0.9999` | 953, 1023, 1, 9999 |
| `parseMolarity` of `.0953`, `0.095`, `0.09530`, `0.0000`, `1.0000`, `0,0953`, empty, `0.1` | null each |
| `isDeviation` of `0`, `1.5`, `12.25`, `100` | true each |
| `isDeviation` of empty, `1.`, `.5`, `1.234`, `-1`, `1,5`, `1000.0` | false each |
| `formatReading` of 123, 2525, 0; `formatMolarity` of 953, 1000 | `1.23`, `25.25`, `0.00`, `0.0953`, `0.1000` |
| round trip `parseReading(formatReading(h))` for every h from 0 to 5000; `parseMolarity(formatMolarity(u))` for every u from 1 to 9999 | h; u |
| `titre(123, 2648)`, `titre(0, 5000)`, `titre(2648, 123)`, `titre(100, 100)` | 2525, 5000, null, null |
| `followsFromNotebook(m, 953, 2525)` for m = 942, 943, 944, 945 (exact 943.56) | false, true, true, false |
| `followsFromNotebook(m, 1000, 2500)` for m = 998 to 1002 (exact 1000) | false, true, true, true, false |
| `followsFromNotebook(m, 1050, 2021)` for m = 1297 to 1300 (exact 1298.86) | false, true, true, false |
| `average` of [987, 989, 986]; [987, 988]; [1000, 1000, 1000]; [953] | 987, 988, 1000, 953 |
| relative deviation of [987, 989, 986] | `1.1` (1.1254) |
| of [1000, 1000, 1000]; [980, 1000, 1020]; [950, 951]; [953] | `0.0`; `13.3`; `0.5`; `0.0` |
| relative deviation and average of [989, 986, 987] | the same as [987, 989, 986]; 987 |
| `misread(123, 1234)`, `(125, 1234)`, `(121, 1234)`, `(125, 1230)`, `(126, 1239)`, `(120, 1221)` | false, false, true, false, true, true |
| `percentErrorText` of -2.0712, 2.0749, 1.004, -1.0049, 1.1, 12.5, -1.5 | `−2.07%`, `+2.07%`, `+1.01%`, `−1.01%`, `+1.10%`, `+12.50%`, `−1.50%` |
| cost of four decimal places at 0.0950 M; of three significant figures at 0.1000 M | 0.053%; 0.5% |

### 9.2 `flow.test.ts`

Fixtures: `fresh` is a first trial with nothing done (wet glassware, a bubble, an empty burette). `careful` is a trial at its endpoint: filled to 1.234 mL, 25.250 mL delivered, meniscus at 26.484 mL, two drops, no errors. `honest` is `{ hcl: '0.0953', initial: '1.23', final: '26.48', molarity: '0.0944' }`. The label is `0.0953`.

| Case | Expected |
| --- | --- |
| checklist of `fresh`, nothing typed | `record-hcl:next`, the other ten `todo` |
| conditioned and filled, HCl recorded | `record-hcl:done`, `condition:done`, `fill:done`, `clear-bubble:next`, `read-initial:todo` |
| pipette rinsed and aliquot delivered first | `record-hcl:next`; `rinse-pipette:done`, `pipette:done`; the rest `todo` |
| filled unconditioned; initial recorded with the bubble; aliquot with an unrinsed pipette | `condition:skipped`; `clear-bubble:skipped`; `rinse-pipette:skipped` |
| `careful` with all three errors counted by the engine | the three technique steps `skipped`, although the glassware flags read prepared |
| indicator at 1, 3, 0 drops with titrant delivered | `indicator:next`, `done`, `skipped` |
| `careful`, `honest` | ten `done`, `calculate:next` |
| later trial, glassware prepared, HCl carried | `record-hcl:done`, `condition:done`, `fill:next`, `clear-bubble:done`, `rinse-pipette:done`, the rest `todo` |
| later trial, initial recorded without refilling | `fill:skipped` |
| `canRecordInitial`: fresh first trial; filled; filled with 0.05 mL delivered; later trial not refilled | false, true, false, true |
| `canDeliver`: no initial; initial; initial and final; overshot | false, true, false, false |
| `canRecordFinal`: endpoint; none; overshot; ran out | true, false, false, false |
| Challenge: fill unconditioned; pipette unrinsed; initial `9.99`; HCl `0.0935` | null each |
| Guided, fill unconditioned; then confirmed; conditioned | `skip-warning condition`; null; null |
| Guided, pipette unrinsed; rinsed | `skip-warning rinse-pipette`; null |
| Guided, initial `1.23` with the bubble; confirmed | `skip-warning clear-bubble`; null |
| Guided, initial `1.25` at 1.234 (0.016 off); `1.30`; `1.30` kept | null; `re-read initial 1.30`; null |
| Guided, initial `1.30` with the bubble, skip confirmed | `re-read initial 1.30` (the two prompts are answered separately) |
| Guided, final `26.48` at 26.484; `26.51` | null; `re-read final 26.51` |
| Guided, HCl `0.0935`; the same with everything confirmed; `0.0953` | `label-mismatch`; `label-mismatch`; null |
| `showSlowDown`: Guided near; Challenge near; endpoint reached; not near; overshot | true, false, false, false, false |
| `grade(0.1009, 0.1)`, `(0.0991, 0.1)`, `(0.1011, 0.1)`, `(0.0989, 0.1)` | pass, pass, fail, fail (spec 7.4) |
| check `honest` on `careful`, true molarity 0.0946 | graded: passed, no percent error, no cause, no note |
| check with no endpoint; with no molarity; with final `1.00` | not ready: `no-endpoint`; `entries`; `final-not-after-initial` |
| check molarity `0.0950` when the true molarity is 0.0950 | `recalculate` (the right answer typed without the working is not marked) |
| check `honest`, engine counts `unconditioned-burette`, true 0.0965 | failed, percent error -2.1762, cause `unconditioned-burette` |
| final `26.60` (0.116 off), molarity `0.0939`, true 0.0946 | passed, cause `misread-final` |
| HCl `0.0935`, initial `1.30`, final `26.55`, molarity `0.0926`, engine counts `tip-bubble` | failed; causes in order `tip-bubble`, `hcl-label`, `misread-initial`, `misread-final` |
| level fell 0.600 mL after the initial reading (start 1.834, now 27.084), final `27.08`, molarity `0.0922` | failed, cause `misread-initial` only |
| 10 mL of water added | passed, no cause, note `water-added` |
| `invalidResult`: overshot; ran out | `overshot`; `ran-out`; no percent error, no cause |
| ran out without refilling; overshot with no indicator and an unrinsed pipette | cause `not-refilled`; causes `unrinsed-pipette`, `no-indicator` |

### 9.3 `messages.test.ts`

| Case | Expected |
| --- | --- |
| feedback, clean pass | one line: "Passed. Your NaOH molarity is within 1.0% of the true value." |
| failed at -2.1762 with two causes | "Not passed. Percent error: −2.18%. Your NaOH molarity is too low.", then the two cause sentences in order |
| failed at +2.0312 | "Not passed. Percent error: +2.03%. Your NaOH molarity is too high." |
| passed with two causes | the "passed in spite of them" sentence, then both causes |
| failed at +1.2 with no cause and water | the percent-error line, the no-cause line, the water note last |
| overshot with no indicator; ran out, not refilled | the outcome sentence and the cause; no percent error |
| step labels | one for each of the eleven steps, in order |
| worked lines for 1.23, 26.48, 0.0953 | as in 4.5, ending "= ?" |
| re-read body for `1.30` | no "too high", "too low", "higher", "lower", "larger", "smaller"; its only numbers are 1.30, 0.02 and 0.00 |
| completion line for 0.0946 | "Lab complete: three trials passed. The true NaOH molarity was 0.0946 M, to four decimal places." |
| every sentence through the validator's `findInstitutionText` | no finding (more than 60 strings) |

### 9.4 `progress.test.ts` (against the real `storage.ts` and `activities.ts`)

| Case | Expected |
| --- | --- |
| `newRun(3735928559, 'guided', engine)` | the record of 6.1 with no trials, blank entries, `in-progress` |
| Home's status before the first save; after | `not-started`; `in-progress` |
| save, then load | equal to what was saved |
| saved mid-trial with 18.350 mL delivered | loads with `deliveredUl` 18350 |
| `finishTrial` after a failed trial | the trial appended with its mode and entries; the next trial has `hcl: '0.0953'` and the other three null |
| results fail, pass, overshot, pass, then pass | `in-progress` with 4 trials; then `completed`, 5 trials, `current` null; Home says `completed` |
| mode changed between trials | trials stored `guided`, `challenge` |
| seed -1; seed 4294967296; initial `1.2`; an extra key | `loadEntry` null, the entry moved to `valence:backup:lab:titration`, Home `not-started` |
| export; then clear | `valence:lab:titration` present with `version: 1`, `seed: 7`; then `not-started` |

### 9.5 `storage.test.ts` additions (the notice)

| Case | Reports to `onPersistent`, in order |
| --- | --- |
| lab save refused, then preferences saved | false, false |
| ... then the lab saved | false, false, true |
| two labs refused; first saved; second saved | false, false, false, true |
| lab refused, then its key removed | false, true |
| preferences saved, lab refused (never stored), `clearAll` | true, false (still showing); after `forgetRefused`: true |
| in-memory store: a save, `forgetRefused` | false, false |
| nothing refused: two saves | true, true |

### 9.6 `primer.test.ts`

| Case | Expected |
| --- | --- |
| section ids in order | `acids-and-bases`, `molarity`, `titration`, `standardizing`, `endpoint`, `phenolphthalein`, `calculation`, `burette`, `glassware`, `precision`, `safety`; 30 paragraphs |
| sources | 20, each a valid `sourceSchema` record, none already in `sources.json`; every cited id exists |
| paragraphs with no source | exactly four: the fading pink; the worked example; the definition of relative deviation; "nothing in this simulation can hurt you" |
| support lines | each is "This lab: ...", a quotation from `seely-buret` or `pubchem-ghs-cid-*` (7 of them), or the located form; no OpenStax line is a quotation |
| every heading, paragraph, equation, bottle name, statement and note through `findInstitutionText` | no finding |
| the primer's arithmetic | 0.1 x 0.025 = 0.002500; 0.1200 x 25.00 / 30.00 = 0.1000; 30.50 - 0.50 = 30.00; 0.36% and 0.40% by mass |
| the worked example's bottle | 0.1200 M, outside the 0.0850 to 0.1050 M any bottle here can have |
| bottles | `titration-hcl` 313 Danger H314 H331; `titration-naoh` 14798 Danger H314; `titration-phenolphthalein` 4764 Danger H350 H341 H361f |

### 9.7 Markup tests (`renderToStaticMarkup`, as `page.test.ts` does)

| Case | Expected |
| --- | --- |
| record of five trials | one table; column headers Trial, HCl molarity (M), Initial reading (mL), Final reading (mL), Titre (mL), NaOH molarity (M), Result; row headers `1 (Challenge)`, `2 (Guided)` to `5 (Guided)` |
| first row's cells | `0.0953`, `1.23`, `26.48`, `25.25`, `0.0944`, `Not passed, −2.18%` |
| an overshot trial with no final reading | `0.0953`, `1.23`, three dashes, `Invalid: overshot` |
| cause under its row; "Percent error" | the unconditioned-burette sentence present; "Percent error" once in five trials |
| seed; true molarity | "Seed 3735928559"; "The true NaOH molarity was 0.0988 M" only when completed |
| summary before completion; with only the average entered; with both | the waiting line; the ask line and no notebook value; "Average of your three molarities0.0987 M" and "Relative deviation1.1 parts per thousand" |
| read-only record and panel | no `input`, `button`, `select` or `textarea` |
| shell | breadcrumb link to `/lab`; `aside aria-label="Lab notebook"`; DOM order primer, guide, bench, notebook, record |
| shell before Start; after | Start, the primer, no bench, no Restart; Restart, the bench, no Start |
| shell, narrow | the notice, the primer and the record; no bench, guide, working notebook, field or button; before Start no record either |
| shell, not saving | a `role="status"` paragraph with the not-saving sentence; absent otherwise |
| mode switch on `challenge` | `fieldset` with legend Mode; radios `guided` unchecked, `challenge` checked |
| primer | one open `details`; eleven `h2` in order; eleven Sources controls; `M<sub>NaOH</sub> = M<sub>HCl</sub> × V<sub>HCl</sub> ÷ V<sub>NaOH</sub>`; no `M_` left; every link is https and opens in a new tab |
| `subscriptParts('M_NaOH × V_NaOH = 1')` | M, sub NaOH, ` × V`, sub NaOH, ` = 1` |
| lab list | one link to `/lab/titration` with its status; the unbuilt lab as text with "Planned. Not built yet." |
| trial form | four labels each tied to its input: "HCl molarity, from the bottle label (M)", "Initial burette reading (mL)", "Final burette reading (mL)", "Your NaOH molarity (M)"; four `inputMode="decimal"` |
| trial form, nothing done, either mode | three disabled inputs, each `aria-describedby` its reason |
| trial form at the endpoint with both readings | no endpoint reason; "Titre (mL)25.25" |
| Guided at the endpoint; Challenge | the worked lines, containing no `0.0943` or `0.0944`; no "Work it out" |
| a field error | `aria-invalid="true"`, `aria-describedby` the error, one `role="alert"` |
| Guided panel, filled unconditioned, HCl recorded | eleven `li`; one `aria-current="step"`; the first four, each as mark, label, state: ✓ Record the HCl molarity from the bottle label, Done; ✕ Condition the burette with NaOH, Skipped; ✓ Fill the burette with NaOH, Done; → Clear the air bubble from the burette tip, Next |
| Guided panel, trial 2 | "Refill the burette with NaOH"; "Pipette 25.00 mL of HCl into a clean flask" |
| slow-down | inside `<p role="status">`; the region is present and empty when it does not apply |
| prompt box | `role="group"` named by its title, `tabindex="-1"`; a warning has two buttons, a wrong label one |

Not prototyped, and to be given markup tests in the plan from the contract in 4.6 and 7.4: the block that shows the last trial's result in the docked panel, the "Start the next trial" button of a trial the engine has ended, the summary's two-field form, and `BottleCard`.

Not coverable by markup tests, and so on the hand checklist: focus moving to a prompt and to a result, Enter recording a field, the confirm on Restart, the layout at each width, and the save after each action in the running page.

### 9.8 The run

```
 RUN  v5.0.3 <repo>/

 ✓ flow.test.ts > the Guided checklist > starts with the first step next and the other ten to do
 ✓ flow.test.ts > the Guided checklist > marks what is done and moves "next" to the first step still open
 ✓ flow.test.ts > the Guided checklist > lets steps be done out of order: "next" is still the first open step
 ✓ flow.test.ts > the Guided checklist > marks a technique step skipped once the action that needed it has been taken
 ✓ flow.test.ts > the Guided checklist > keeps a step skipped when the engine counts the error, whatever the glassware looks like afterwards
 ✓ flow.test.ts > the Guided checklist > counts the indicator as added at two drops, and as skipped when titrant runs with none
 ✓ flow.test.ts > the Guided checklist > leaves only the calculation open at the end of a careful trial
 ✓ flow.test.ts > the Guided checklist > opens a later trial with the prepared glassware and the carried HCl molarity already done
 ✓ flow.test.ts > what the notebook lets the learner record, in both modes > takes an initial reading of a filled burette before any titrant has run
 ✓ flow.test.ts > what the notebook lets the learner record, in both modes > keeps the stopcock shut until there is an initial reading, and after the final one
 ✓ flow.test.ts > what the notebook lets the learner record, in both modes > takes a final reading only at a persistent endpoint of a trial that is still valid
 ✓ flow.test.ts > the prompts before an action > never prompts in Challenge
 ✓ flow.test.ts > the prompts before an action > warns in Guided before each of the three technique steps is skipped, once
 ✓ flow.test.ts > the prompts before an action > asks for a reading again when it is more than 0.02 mL from the meniscus, and takes it when the learner keeps it
 ✓ flow.test.ts > the prompts before an action > holds the HCl molarity to the label in Guided, with no way to keep a wrong one
 ✓ flow.test.ts > the prompts before an action > shows "slow down" in Guided only, near equivalence, until the endpoint
 ✓ flow.test.ts > grading (spec 7.4) > passes a molarity at +0.9% and at -0.9%, and fails one at +1.1% and at -1.1%
 ✓ flow.test.ts > the check flow > passes a careful trial with honest readings and names nothing
 ✓ flow.test.ts > the check flow > does not mark a trial that has no endpoint, a missing entry, or a final reading not after the initial one
 ✓ flow.test.ts > the check flow > sends back a molarity that does not follow from the notebook, without marking it, even when it is the true one
 ✓ flow.test.ts > the check flow > fails a trial outside 1.0% with its signed percent error, and names the technique error the engine counted
 ✓ flow.test.ts > the check flow > names a misread burette and a miscopied label, in the order label, initial, final, after the technique errors
 ✓ flow.test.ts > the check flow > judges the initial reading against the meniscus when delivery began, and the final one against the meniscus now
 ✓ flow.test.ts > the check flow > notes distilled water in the flask without counting it as a cause
 ✓ flow.test.ts > a trial the engine has ended > is overshot or ran out, with no percent error
 ✓ flow.test.ts > a trial the engine has ended > names a burette that was not refilled, a flask with no indicator, and any technique error
 ✓ messages.test.ts > the feedback for a finished trial > says only that a clean trial passed
 ✓ messages.test.ts > the feedback for a finished trial > gives a failing trial its signed percent error and the direction in words, then each cause by name
 ✓ messages.test.ts > the feedback for a finished trial > says so when a trial passed in spite of a problem
 ✓ messages.test.ts > the feedback for a finished trial > has a line for a failed trial with nothing to name, and adds the water note last
 ✓ messages.test.ts > the feedback for a finished trial > gives an invalid trial no percent error
 ✓ messages.test.ts > the wording > has a label for every step
 ✓ messages.test.ts > the wording > sets out the calculation with the learner’s own numbers and no result
 ✓ messages.test.ts > the wording > never tells a re-read prompt which way the reading is out
 ✓ messages.test.ts > the wording > gives the true molarity only in the completion line
 ✓ messages.test.ts > the wording > contains nothing that reads as an institution, a course number or a storage location (spec 5.1)
 ✓ tracker.test.ts > the "cannot save" notice (spec 10) > stays while any entry’s latest save was refused: a later save of another entry does not clear it
 ✓ tracker.test.ts > the "cannot save" notice (spec 10) > clears when that same entry is next saved
 ✓ tracker.test.ts > the "cannot save" notice (spec 10) > needs every refused entry saved before it clears
 ✓ tracker.test.ts > the "cannot save" notice (spec 10) > clears when the refused entry is removed
 ✓ tracker.test.ts > the "cannot save" notice (spec 10) > clears after "Clear my progress", even for an entry that was never stored
 ✓ tracker.test.ts > the "cannot save" notice (spec 10) > never reports that progress outlasts the session when the store is in memory
 ✓ tracker.test.ts > the "cannot save" notice (spec 10) > reports saves as it does today when nothing is refused
 ✓ progress.test.ts > the stored record of the titration lab > starts in progress with nothing typed, and is the same after a round trip through storage
 ✓ progress.test.ts > the stored record of the titration lab > resumes mid-trial: the engine state saved at a stopcock close comes back as saved
 ✓ progress.test.ts > the stored record of the titration lab > carries the HCl molarity into the next trial and nothing else
 ✓ progress.test.ts > the stored record of the titration lab > is completed by the third pass, however many trials it took, and then has no trial under way
 ✓ progress.test.ts > the stored record of the titration lab > records each trial with the mode it was finished in
 ✓ progress.test.ts > the stored record of the titration lab > sets aside a record that does not fit: a seed out of range, a reading with one decimal, an unknown key
 ✓ progress.test.ts > the stored record of the titration lab > is in the export, and gone after "Clear my progress"
 ✓ notebook.test.ts > what the notebook accepts as typed > reads a burette reading typed to two decimal places, in hundredths of a millilitre
 ✓ notebook.test.ts > what the notebook accepts as typed > refuses a reading with other than two decimal places, off the scale, or not a plain number
 ✓ notebook.test.ts > what the notebook accepts as typed > reads a molarity typed to four decimal places, in ten-thousandths of a mole per litre
 ✓ notebook.test.ts > what the notebook accepts as typed > refuses a molarity with other than four decimal places, without its leading zero, or of zero
 ✓ notebook.test.ts > what the notebook accepts as typed > takes a relative deviation as a plain number with at most two decimal places
 ✓ notebook.test.ts > what the notebook accepts as typed > prints every reading and every molarity back exactly as its whole number says
 ✓ notebook.test.ts > the notebook arithmetic > takes the titre as final minus initial, and has none unless the final reading is the larger
 ✓ notebook.test.ts > the notebook arithmetic > accepts a molarity within one unit in the fourth decimal place of M(HCl) x 25.00 / titre
 ✓ notebook.test.ts > the notebook arithmetic > averages to the fourth decimal place, rounding a half up
 ✓ notebook.test.ts > the notebook arithmetic > gives the relative deviation as mean absolute deviation over mean, in parts per thousand
 ✓ notebook.test.ts > the notebook arithmetic > does not depend on the order of the trials
 ✓ notebook.test.ts > the notebook arithmetic > calls a reading misread only when it is more than 0.02 mL from the meniscus
 ✓ notebook.test.ts > the notebook arithmetic > prints a failing percent error signed, to two places, and never as 1.00
 ✓ notebook.test.ts > four decimal places against significant figures > rounding to four decimal places costs at most 0.053% of a molarity in the seeded range, and three significant figures up to 0.5%
 ✓ primer.test.ts > the titration primer > has the eleven sections the spec and the brief ask for, in reading order
 ✓ primer.test.ts > the titration primer > cites only sources that exist, each a valid source record with a new id
 ✓ primer.test.ts > the titration primer > rests every paragraph on a located or quoted passage, or says that it is the lab’s own
 ✓ primer.test.ts > the titration primer > quotes only public-domain text; every other passage is located, with its address and what it establishes
 ✓ primer.test.ts > the titration primer > contains nothing that reads as an institution, a course number or a storage location (spec 5.1)
 ✓ primer.test.ts > the titration primer > does its own arithmetic correctly
 ✓ primer.test.ts > the titration primer > never gives a number a bottle in this lab could carry as its example
 ✓ primer.test.ts > the hazards of the three bottles > gives each the signal word and statements of the pure substance, and a note for the strength used
 ✓ markup.test.ts > the notebook, read-only > is one table with a caption, seven column headers and a row header for each trial
 ✓ markup.test.ts > the notebook, read-only > shows what was typed as typed, the titre worked out from it, and the result in words
 ✓ markup.test.ts > the notebook, read-only > names the cause of a failing trial under its row, and gives no percent error to a passing one
 ✓ markup.test.ts > the notebook, read-only > shows the seed, and the true molarity only once the lab is completed
 ✓ markup.test.ts > the notebook, read-only > shows the average and the relative deviation only after the learner has entered their own
 ✓ markup.test.ts > the notebook, read-only > has no field or button: it is read-only
 ✓ markup.test.ts > the lab shell > puts the lab under Lab in the breadcrumb and docks the notebook in a named region
 ✓ markup.test.ts > the lab shell > offers Start before the lab is started, with the primer and the mode and no bench; Restart after
 ✓ markup.test.ts > the lab shell > on a narrow screen shows the notice, the primer and the record, and no bench, guide, working notebook, mode switch or button
 ✓ markup.test.ts > the lab shell > says so when the browser is not saving
 ✓ markup.test.ts > the lab shell > offers the mode as two radio buttons in a named group, the current one checked
 ✓ markup.test.ts > the primer > is one disclosure holding a card for each section, each with its own Sources
 ✓ markup.test.ts > the primer > writes M_NaOH with a real subscript
 ✓ markup.test.ts > the primer > is closed once the lab is under way
 ✓ markup.test.ts > the primer > links every source it cites, each opening in a new tab
 ✓ markup.test.ts > the list of labs > links a lab that has a page and shows its status; a lab without one is listed as planned
 ✓ markup.test.ts > the trial under way > has four fields, each with a visible label tied to it, and a decimal keypad
 ✓ markup.test.ts > the trial under way > says why a field is not open yet, tied to the field, in both modes
 ✓ markup.test.ts > the trial under way > opens the final reading at the endpoint, and shows the titre once both readings are in
 ✓ markup.test.ts > the trial under way > sets out the calculation in Guided with the learner’s numbers and no result; Challenge has no such panel
 ✓ markup.test.ts > the trial under way > gives a field error as an alert tied to its field
 ✓ markup.test.ts > the Guided panel > lists the eleven steps in order, each with its state in words, and marks the next one
 ✓ markup.test.ts > the Guided panel > words the later trials’ steps as a refill and a clean flask
 ✓ markup.test.ts > the Guided panel > shows the slow-down hint in a status region, empty until it applies
 ✓ markup.test.ts > the Guided panel > draws a warning as a named group with a way back and a way on; a wrong label has only the way back

 Test Files  7 passed (7)
      Tests  97 passed (97)
   Start at  17:57:49
   Duration  1.72s (transform 46%, import 37%, tests 15%, worker 2%)

  Transform  transforming modules took 2.22s · 46% of tracked time, re-done on every run
             persist transforms across runs with fsModuleCache: true
             learn more: https://vitest.dev/guide/improving-performance#caching-between-reruns
```

## 10. Implementation tasks, in order

Each is test-first: the test file named is written from section 9 and fails before the code exists. Tasks 1 to 7 and 10 to 11 need nothing from the engine; 8, 9, 12 and 13 need the engine's types.

1. **The notice rule in `storage.ts`.** `sessionStore` tracks refused keys; `clearAll` calls `forgetRefused`; `reportingStore` and its two tests removed; `AppState` unchanged in shape. *Done when* the seven cases of 9.5 pass in `storage.test.ts` and the existing storage and AppState tests still pass.
2. **`chem-data/support.ts`.** Move `Passage`, `located`, `Description`, `description` out of `periodic.ts`, which re-exports them. *Done when* `periodic.test.ts` passes unchanged and `support.ts` imports no JSON.
3. **The lab's sources.** An input file under `docs/research/phase-3/` and a step in `scripts/build-chem-data.mjs`. *Done when* `npm run build:data` writes the 20 entries of 7.6 into `sources.json` and the registry test still passes.
4. **`hazardsSchema`.** Export it; `note` becomes `cited(text)`. *Done when* `schema.test.ts` accepts a hazards record whose note has a source and rejects one whose note is a bare string.
5. **`chem-data/titration/primer.ts` and `bottles.ts`.** *Done when* 9.6 passes.
6. **`chem-data/titration/messages.ts`.** *Done when* 9.3 passes.
7. **`app/lab/titration/notebook.ts`.** *Done when* 9.1 passes.
8. **`app/lab/titration/flow.ts`**, on the engine's `TrialFacts` and `grade`. *Done when* 9.2 passes, and one more test drives the real engine through a careful trial and through each technique error and gets from `checkTrial` a pass with no cause and a fail naming that error.
9. **`app/lab/titration/progress.ts`**, on the engine's `trialStateSchema`. *Done when* 9.4 passes, and a state the engine produces after each kind of action parses through the schema unchanged.
10. **The shell.** `useMediaQuery.ts`, `lab.css`, `LabShell`, `ModeSwitch`, `Primer`, `useLabProgress`. *Done when* the shell, mode, primer and lab-list rows of 9.7 pass, and a test of `useLabProgress`'s save path shows one `saveEntry` per call with the activity's version.
11. **Routes and the list.** `pages/Lab.tsx` becomes the list; `lab/titration` lazy route; `ACTIVITIES[0].to`. *Done when* `routes.test.ts` has the new address, the palette opens it, and the built main chunk does not contain the primer's text.
12. **The notebook's components.** `TrialForm`, `NotebookPanel`, `TrialRecord`, `Guide`, `PromptBox`, `BottleCard`. *Done when* the remaining rows of 9.7 pass.
13. **`TitrationPage`.** Start, the handlers (form check, then `promptBefore`, then the engine and `save`), the check, engine-ended trials, the summary, Restart, focus after a prompt and after a result, the narrow page. *Done when* the hand checklist below passes in the running app.
14. **Documentation.** The text of section 8 into `docs/for-institutions.md`, with the [engine] sentences checked against the engine; the About page's citations; the Accessibility section from what the checklist found. *Done when* every sentence added has been checked against the build it describes.

Hand checklist for task 13 (spec 13), keyboard only where it says so:

- Keyboard only: start the lab in Guided; do a whole careful trial; reach every control; every prompt takes focus and both of its buttons work; the result takes focus after Check.
- Reload after each of: recording the HCl molarity, filling, an initial reading, a stopcock close mid-titration, the endpoint, a failed trial, completion. Each time the page comes back where it was, with the same readings.
- Challenge: skip each technique step in turn; each fails the trial by itself and is named. Misread each reading by 0.05 mL; each is named.
- Type the true molarity without the working: "does not follow". Type `1.2` for a reading: refused in both modes.
- Overshoot: the flask stays on the bench labelled overshot until "Start the next trial".
- Three passes: the true molarity appears; the notebook's average and deviation appear only after both of the learner's are entered.
- Home: Not started before Start; In progress after; Completed after the third pass. Export contains the entry; Clear removes it.
- Make storage refuse writes (fill the quota): the notice appears on the lab page and on Settings and stays after the theme is changed; it goes when a lab save succeeds again, and after Clear my progress.
- 1366x768, 1920x1080, 2523x1290, 1024x768 and 800x1100: no sideways scroll; the bench is in view with the checklist showing.
- Under 768 px: notice, primer, read-only notebook; no bench; no field.
- Reduced motion on: nothing in the shell or the notebook moves.
- Light and dark themes.

## 11. Where the spec is wrong, silent or contradicts itself

Each with the change proposed. S1 to S4 are the ones in section 0.

| # | Where | Problem | Proposed text or change |
| --- | --- | --- | --- |
| S1 | 5.1, 5.2, `sources.json`, `periodic.ts`, `for-institutions.md` | They treat OpenStax Chemistry 2e as CC BY 4.0. As served on 2026-10-04 it states CC BY-NC-SA 4.0 and restricts use in language models. | Until the owner decides (O1): quote no OpenStax text in new work; give locators. Change "Licensed under CC BY 4.0" in the citations and the docs to what the pages state, or to a release the owner has verified. |
| S2 | 11 | "the lab notebook docked right": a seven-column table does not fit beside the bench at 1366 px (measured). | "the working part of the lab notebook docked right of the bench, and its record of finished work across the page below, as the explorer's inspector is" |
| S3 | 7.2 | "The notebook shows average and relative deviation only after the learner has entered their own values" does not say which values. | "When three trials have passed, the learner enters their own average molarity and relative deviation; the notebook then shows beside them the values it calculates from the three passing trials' molarities. Neither is graded." |
| S4 | 7.3 | A signed percent error reveals the true molarity, and nothing stops a molarity being retyped until it passes. | Add: "The check first holds the learner's molarity to their own notebook: it must equal the recorded HCl molarity × 25.00 ÷ the titre to within one unit in the fourth decimal place. Until it does, nothing is marked. A marked trial cannot be checked again." |
| S5 | 7.3 | Silent on a trial stopped before a persistent endpoint: it is neither invalid, passing nor failing. | Add to 7.2: "The final reading can be recorded only once a persistent endpoint has been reached." |
| S6 | 7.2 | Silent on a trial titrated with no initial reading, which can never be calculated. | Add: "The stopcock opens only once an initial reading has been recorded." |
| S7 | 7.1, 7.3 | Silent on significant figures and on what form a typed value takes. | Add to 7.2: "Burette readings are typed to two decimal places and molarities to four; any other form is refused with a message, in both modes." |
| S8 | 7.2 | The message "burette ran out; refill before starting a trial" is not a sentence a learner is shown elsewhere in the app's style. | "The burette ran out before the endpoint, so this trial has no usable titre. Refill the burette before you start a trial." |
| S9 | 7.2 | "prompts a re-read" does not say whether the learner may keep the reading. | Add: "The learner may keep the reading; it then carries into the result and is named, as in Challenge. A recorded HCl molarity that is not the label's is asked for again until it is." |
| S10 | 7.2 | Does not say whether the mode is fixed for a run. | Add: "The mode can be changed at any time; each trial is recorded with the mode it was finished in." |
| S11 | 7.3 | Silent on which trials a skipped step counts against: a first fill rinses a real burette, so the error would vanish in trial 2 and the lab could be completed without ever conditioning. | Add (engine's decision, O4): "A skipped technique step stays in force until the learner does it. The tip bubble is the exception: once it has escaped it is gone." |
| S12 | 7.3 | A trial passes when two technique errors cancel; "each fails grading on its own" does not cover pairs. | Add: "A trial that is within 1.0% passes even when technique errors are named in it; the feedback says that it passed in spite of them." |
| S13 | 7.3 | "the true molarity is shown on completion" while the NaOH concentration is not said to be rounded. | Add: "shown to four decimal places", or round the seeded NaOH concentration as the HCl label is (engine's decision). |
| S14 | 7.3 | An overshot flask "is shown dark pink" even when no indicator was added. | Add: "with at least one drop of indicator in the flask"; a flask with none shows no colour and its feedback names the missing indicator. |
| S15 | 11 against 7.2 | "The meniscus text alternative gives the two bracketing graduations and a rough position between them, not the reading itself", but a reading must be within 0.02 mL: a learner using the text needs the position to a tenth of a division, which is the reading. | "gives the two bracketing graduations and how far the meniscus sits between them, in tenths of the gap; the learner still works out and types the reading" |
| S16 | 5.2, 5.3 | Hazards have one `sourceId`, but the note for the concentration used rests on a different source from the GHS classification. The titration's bottles do not fit the Reagent shape (a fixed `molarity`). | In 5.3: "`hazards.note` is `{ value, sourceId }`." In 7.1: "The three bottles of this lab are described in `chem-data/titration/` and are not registry reagents: the acid's molarity is seeded." |
| S17 | 10 | The notice is on the settings page only; a learner in a lab is not there. Clearing progress must also clear the notice. | "The settings page and each lab page say that progress will last only for that session ... 'Clear my progress' clears the notice." |
| S18 | 11 | "a notice to continue on a larger screen" suggests a run can be carried to another device. | "a notice that the bench needs a wider screen, and that progress stays in the browser it was made in" |
| S19 | 4, 14 | Home's activities both link to `/lab`. | Phase 3 sets the titration lab's address to `/lab/titration`; `/lab` lists the labs. |
| S20 | 7.1 | "standardized HCl" is the known solution; the cited sources standardize NaOH against a primary standard. Not wrong, but an instructor will ask. | No change to the lab. The primer says the acid's molarity is given; 7.3 item 1 flags it. |

## 12. Decisions only the owner can make

| # | Decision | Recommendation |
| --- | --- | --- |
| O1 | The OpenStax licence. The repository quotes OpenStax and says CC BY 4.0; the site says CC BY-NC-SA 4.0 with a clause about language models. | Before the repository is public: turn the OpenStax quotations in `periodic.ts` into locators (the mechanism exists), correct the licence wording in `sources.json`, the research README and `for-institutions.md`, and decide whether the copies in this folder's `sources/` are kept. If you would rather keep the quotations, first find a copy of the same passages that is under CC BY 4.0 (the 2019 release) and cite that copy. |
| O2 | Average and relative deviation: the learner enters their own first (as designed), or the notebook simply shows them once two or more trials have a molarity. | As designed. It is what a report sheet asks for, it costs two fields, and it satisfies either reading of the spec. |
| O3 | The rule that the molarity must follow from the learner's own readings before it is marked, and that a marked trial is final. | Adopt. Without it the percent error is an answer key. |
| O4 | A skipped technique step: in force until done, or cured by the first use. | In force until done: otherwise the lab can be completed without ever conditioning a burette. The docs then say it is a simplification. The shell works with either. |
| O5 | The indicator's hazard note rests on a data sheet for a different solution (1% in isopropyl alcohol). | Give me the safety data sheet of the indicator solution your lab stocks (or its catalogue number) and the note is rewritten from it. Until then the note says plainly that no sheet for this exact solution was read. |
| O6 | Four decimal places in every case, instead of a significant-figure rule. | Keep four decimal places; three significant figures can cost half the pass band. |
| O7 | In Guided, a misread burette can be kept after the prompt; a miscopied label cannot. | As designed. |
| O8 | The mode can be changed at any time. | As designed. |
| O9 | The notebook split: working part docked right, record of finished trials across the page below. | As designed; the photographs are in `proto/page/shots/`. |
| O10 | The primer's wording, especially the ten points of 7.3. | Read 7.2 and 7.3 as the person who runs this lab; anything you would say differently at the bench is worth changing now. |

## 13. What I could not verify

- **When the OpenStax licence statement changed**, and whether the passages the repository already quotes are covered by an earlier CC BY 4.0 release. I saw only today's pages.
- **Two primer paragraphs have no source**: how the pink fades where a drop lands and lingers near the endpoint (it describes the lab's model), and the definition of relative deviation (it is the spec's). No free page read today states either.
- **The indicator solution's hazards.** No safety data sheet for 0.5% phenolphthalein in ethanol and water was reachable (Sigma-Aldrich, LabChem, Ricca and Flinn refused or were not found). The one read is Fisher's for 1% in isopropyl alcohol, which is a different product: more concentrated and in a different alcohol.
- **The concentration notes rest on one supplier each** (Fisher, revision of 18 December 2025). The sheet for 0.1 N hydrochloric acid covers every strength under 2.0%, so its "skin irritation" may not be specific to 0.1 M. The European concentration limits, which I believe put 0.1 M of either solution below the irritant threshold, were not read and are not used.
- **The safety data sheets were read through my own text extraction of the PDFs**, not a PDF reader (none is installed). The hazard and first-aid sections came out legibly; I did not read the sheets whole.
- **"About 0.4% by mass"** assumes a density of 1.00 g/mL.
- **The PubChem classification** was read from PubChem's data service, not from the regulation itself. For phenolphthalein PubChem prints "H361f ***"; the asterisks are dropped here.
- **The Wikipedia page on the burette** is the only source read for "the numbers increase downward"; it cites a page I did not read.
- **Nothing was run in the app.** The prototype's components are stand-ins rendered in a static page with a placeholder for the bench. Focus, Enter in a field, the confirm on Restart and saving in a running page were not exercised.
- **No screen reader, no browser but headless Chromium, no touch.** Container queries were seen working in Chromium only.
- **The engine does not exist yet.** `TrialFacts`, `TrialState`, `grade` and the rest of 6.2 are assumptions. The prototype's `grade` and `trialStateSchema` are stand-ins. The claim that a failed trial always has a cause to name rests on the spike's bounds, not on a test; the feedback has a line for the case all the same.
- **The bench's height.** The layout was measured with a 480 px stand-in.
- **Whether the consistency rule's tolerance** (one unit in the fourth decimal place) suits every way a learner might round an intermediate step. It accepts a truncated answer and an answer worked from the titre; it rejects anything further out.
- **A learner with no chemistry background has not read the primer**, and no chemistry instructor has.
