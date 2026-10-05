# Phase 3 design: the titration bench

2026-10-04. Key: `bench`. Scope: what the learner sees and operates on the titration lab's bench. The engine, the chemistry data, the lab shell (mode switch, primer, notebook, check flow) and the stored progress are designed elsewhere; what this design assumes of them is in section 3.

Everything here was tried in a throwaway prototype in this folder (`proto/`, a small Vite app that borrows the app's own stylesheet, `Layout`, `PageHeader` and `Button`, with the spike's flask model standing in for the engine). No tracked file was changed. How to run it is in section 14.

## 1. Decisions, and what needs the owner

Decided here, each explained below:

1. **The bench is three groups in workflow order**: the shelf of reagents and glassware, the burette on its stand over the flask, and an enlarged view of the burette scale at the meniscus. Each group is a drawing with its DOM buttons beside it. Nothing is clicked inside a drawing.
2. **The reading view is always at eye level; parallax is left out.** It shows 1.2 mL of scale, twelve graduations, with the meniscus in the middle. Read blind from screenshots at the smallest size the design allows, 24 of 24 readings were within 0.008 mL of the true value (tolerance 0.02).
3. **The meniscus in words** names the two graduations and one of five positions between them. A learner using only the words is within 0.02 mL at every level from 0.000 to 50.000 mL (checked exhaustively).
4. **No stopcock action depends on timing or on holding anything down.** Stream is a toggle. Two measured pours ("Run in 1 mL", "Run in 5 mL") close by themselves. One key press is one drop, however long the key is held.
5. **The bench never states a volume finer than a whole mL.** The only way to a reading is the meniscus, or its description in words.
6. **The flask stands in front of a white card in both themes**, as a flask stands on a white tile, so the pink is judged against white in the dark theme too. Its colour is always said in words in the status line.
7. **Two live regions.** One says the flask's colour and the plume's cue, and changes only when one of those changes. One says what the last action did. A stream of any length makes two or three announcements, not one per addition.

For the owner to decide (my recommendation first):

- **Parallax.** Leave it out; the primer says the eye must be level and that the view always is. Modelling it means a sixth technique error and one more control.
- **Guided mode closes a running stream when the "slow down" hint first appears.** Recommended. Otherwise the hint appears with under two seconds of stream left before equivalence, too late for anyone to act on and far too late for a screen reader to finish saying it.
- **The meniscus in words is available to every learner**, in a closed disclosure under the reading view. Recommended: a learner with low vision who does not use a screen reader needs it too, and it gives no more than the grading tolerance already allows.
- **Stream speed**: 0.25 mL every 0.4 s (about 0.6 mL a second; 25 mL takes 40 s). A real burette runs at about this rate. Adjust by feel in the running app.
- **How pink the endpoint looks**: `pinkDisplayScale` 1×10⁻⁵ M (section 7). Chosen by eye from a sheet of flasks; the owner has seen more real endpoints than I have.
- **Should Guided label every 0.1 mL graduation in the reading view?** Recommended: no. A real burette numbers only the whole millilitres, and counting from a numbered mark is part of the skill. Guided already prompts a re-read.

## 2. File layout

```
src/app/lab/
  NarrowLabPage.tsx            shared: what a lab page shows below 768 px (section 9.5)
  titration/
    TitrationBench.tsx         the bench: lays out the three groups, owns the stream, the two live regions
    Shelf.tsx                  reagents and glassware: one tile each, with its buttons
    apparatus.tsx              the shelf's small drawings: Bottle, WashBottle, WasteBeaker, Pipette, Dropper
    TitrationStand.tsx         the drawing: stand, burette, stopcock, tip, bubble, white card, flask, liquid, plume
    StopcockControls.tsx       the stopcock's buttons and "Swirl and wait"
    ReadingView.tsx            the drawing: the scale at the meniscus, enlarged
    ReadingInput.tsx           the typed reading
    useStream.ts               the stream timer; the only clock on the bench
    bench.css                  the two drawings' heights; the plume's fade and the falling drop
    buretteGeometry.ts  + .test.ts   volume to y, both drawings; which graduations are drawn
    meniscusText.ts     + .test.ts   the meniscus in words
    reading.ts          + .test.ts   typed text to whole microlitres, and back
    flaskColour.ts      + .test.ts   pink concentration to drawn colour and its name
    stream.ts           + .test.ts   stream mode as volumes
    benchText.ts        + .test.ts   status line, stand description, messages
    benchView.ts                     the BenchView type (section 3)
```

Nothing is added to `src/engine/`, and one model parameter to `src/chem-data/` (section 5). No new dependency. All pure modules are plain TypeScript with no React or DOM import, so their tests run in Vitest's node environment like every other test in the repository.

Not abstracted for phase 4: `Tile` (in `Shelf.tsx`) and `Bottle` (in `apparatus.tsx`) are the two things the aqueous lab is likely to want. They stay in `titration/` until phase 4 needs them, and move then.

## 3. What the bench assumes of the engine and the shell

The engine is being designed in parallel. The bench takes one plain-data object, `BenchView`, and nothing else from it. The lab's controller builds it from the engine's selectors once per state. If the engine's own names differ, only the function that builds `BenchView` changes.

```ts
// src/app/lab/titration/benchView.ts

export type PlumeStatus = 'fades-at-once' | 'fades-slowly' | 'persists'

export interface Plume {
  /** 0 to 1: the share of the flask's remaining acid that the last drop of the addition neutralised. Sets the drawn plume's size. */
  fraction: number
  /** Simulated seconds of swirling until the plume is gone; null when it persists. */
  fadeSeconds: number | null
  status: PlumeStatus
}

export interface BenchView {
  /** The HCl bottle's label, four decimals, as text: "0.0987". */
  hclMolarityText: string
  burette: {
    conditioned: boolean
    filled: boolean
    /** An air bubble is in the tip. Drawn, and said in the description: in Challenge it is the learner's only cue. */
    tipBubble: boolean
    /** The true position of the bottom of the meniscus, whole microlitres from the 0 mark (0 to 50 000). */
    levelUl: number
    /** The level has reached the 50.00 mL mark. */
    empty: boolean
  }
  pipette: { rinsed: boolean }
  flask: {
    hasAliquot: boolean
    indicatorDrops: number
    /** How many 10 mL portions of distilled water have been added. */
    waterPortions: number
    /** Liquid in the flask, for the drawn height only. */
    volumeUl: number
    /** mol/L of the pink form in the fully mixed flask. */
    pinkConcentration: number
    /** More than 0.10 mL past the flask's own equivalence volume. */
    overshot: boolean
  }
  /** The plume of the last addition; null before the first, and after "swirl and wait". */
  plume: Plume | null
  /** How many additions this trial has had. Restarts the plume's fade; never shown. */
  additions: number
  /** preparing: no aliquot yet. titrating: additions are accepted. over: the trial is invalid or has been ended. */
  phase: 'preparing' | 'titrating' | 'over'
  /** Which reading the workflow wants next; null when none can be recorded. */
  readingWanted: 'initial' | 'final' | null
  /** Guided only: within 1.00 mL of the flask's own equivalence volume. Always false in Challenge. */
  slowDown: boolean
}

/** The two model parameters the bench reads from chem-data. */
export interface BenchParams {
  faintPinkConcentration: number   // 1e-6 M (spec 7.3)
  pinkDisplayScale: number         // 1e-5 M (section 5)
}
```

Assumptions, stated so they can be checked against the engine's design:

1. `burette.levelUl` is the meniscus the learner reads. It is the engine's, not `start + delivered` computed by the bench, because the tip bubble makes the level fall further than the volume delivered.
2. `flask.pinkConcentration` is the mixed flask's, 0 with no indicator, and the endpoint is persistent exactly when it is at or above `faintPinkConcentration`. So "faint pink" in the status line and "pink persists" always appear together.
3. `plume` follows the spike's proposal: fraction from the last drop's worth of the addition, `fades-slowly` from 0.10, fade time `fraction × 10` simulated seconds. A stream addition has a plume like any other.
4. Delivering more than the burette holds delivers what there is and sets `burette.empty`. The bench does not compute what is left.
5. An action the state does not allow returns the state unchanged. The bench also marks such buttons unavailable, from `BenchView` alone.
6. The engine takes a delivery as a volume and a kind, nothing else. It never hears of the timer.

Actions go out through one callback. The controller hands each to the engine and saves.

```ts
export type BenchAction =
  | { type: 'conditionBurette' | 'fillBurette' | 'clearTip' | 'rinsePipette' | 'pipetteAliquot' | 'addIndicatorDrop' | 'addWater' | 'swirlAndWait' }
  | { type: 'deliver'; ul: number; kind: 'stream' | 'drop' | 'half-drop' }

/** What the controller says back about a typed reading. In Guided a misread is not accepted and `text` is the re-read prompt. */
export interface ReadingReply { accepted: boolean; text: string }
```

Of the shell I assume: it renders the bench in a page column at least 486 px wide, puts the notebook beside it from 1800 px of viewport and below it otherwise (the prototype's stand-in does this with `min-[1800px]:flex-row`), and intercepts actions in Guided to warn before a skipped step. Guided warnings and feedback are the shell's; the bench only shows the two messages named in section 6.4.

## 4. Interfaces

Pure modules. The code is in `proto/src/lib/` exactly as written here and its tests pass (section 10).

```ts
// buretteGeometry.ts — volumes are whole microlitres; a burette is numbered downward, so a larger volume is a larger y

export const BURETTE_CAPACITY_UL = 50_000
export const GRADUATION_UL = 100

/** The reading view's viewBox and scale: 48 units per 0.1 mL, so 0.01 mL is 4.8 units. */
export const READING = {
  width: 260, height: 576, unitsPerMl: 480,
  aboveUl: 550,        // from the window's top to the graduation at or just above the meniscus
  spanUl: 1200,        // the window: twelve graduations and half a graduation of bare tube at each end
  tubeLeft: 30, tubeRight: 170,
  meniscusRiseUl: 80,  // how far the liquid climbs the glass above the bottom of the meniscus
} as const

/** The whole burette's viewBox and scale: the 0 mark at y = 40, the 50 mark at y = 460. */
export const STAND = { width: 300, height: 640, scaleTop: 40, unitsPerMl: 8.4 } as const

export interface Graduation { ul: number; y: number; kind: 'ml' | 'half' | 'tenth'; label: string | null }

export function readingWindowTopUl(levelUl: number): number      // floor(level / 100) * 100 - 550
export function readingY(volumeUl: number, levelUl: number): number
export function readingGraduations(levelUl: number): Graduation[] // none above 0 or below 50 000
export function standY(volumeUl: number): number
export function standGraduations(): Graduation[]                  // every mL; 'half' at 5s; numbered at 10s
```

```ts
// meniscusText.ts
export const MENISCUS_POSITIONS = ['at-or-just-below', 'quarter', 'half', 'three-quarters', 'just-above'] as const
export type MeniscusPosition = (typeof MENISCUS_POSITIONS)[number]
export function markText(ul: number): string                      // 24300 -> "24.3", by whole-number arithmetic
export function meniscusBracket(levelUl: number): { upperUl: number; lowerUl: number; position: MeniscusPosition }
export function meniscusText(levelUl: number): string
```

```ts
// reading.ts
export type ParsedReading = { ok: true; ul: number } | { ok: false; problem: 'empty' | 'not-a-number' | 'decimals' | 'range' }
export function parseReading(text: string): ParsedReading         // from the characters, never through a float
export const READING_PROBLEM_TEXT: Record<'empty' | 'not-a-number' | 'decimals' | 'range', string>
export function readingText(ul: number): string                   // 24370 -> "24.37"
```

```ts
// flaskColour.ts
export type FlaskColourName = 'empty' | 'colourless' | 'faint pink' | 'pink' | 'dark pink'
export interface FlaskColour { name: FlaskColourName; label: string; strength: number; fill: string }
export const PINK = '#d81b7f'
export const DARK_PINK = '#8a0f4d'
export interface FlaskColourInput {
  hasLiquid: boolean; indicatorDrops: number; pinkConcentration: number
  faintPinkConcentration: number; pinkDisplayScale: number; overshot: boolean
}
export function pinkStrength(pinkConcentration: number, faintPinkConcentration: number, pinkDisplayScale: number): number
export function flaskColour(input: FlaskColourInput): FlaskColour
```

```ts
// stream.ts
export const STREAM_CHUNK_UL = 250
export const STREAM_INTERVAL_MS = 400
export const POURS_UL = [1000, 5000] as const
/** Closed, or open. `pourUl`: the measured pour asked for, null for "until closed"; it also says which button opened it. */
export type Stream = { open: false } | { open: true; pourUl: number | null; remainingUl: number | null }
export const CLOSED: Stream
export function openStream(pourUl: number | null): Stream
export function streamTick(stream: Stream, canDeliver: boolean): { deliverUl: number; next: Stream }
```

```ts
// benchText.ts — rule: no sentence here states a volume finer than a whole mL
export const PLUME_TEXT: Record<PlumeStatus, string>              // 'pink fades at once' | 'pink fades slowly' | 'pink persists'
export function flaskStatus(view: BenchView, params: BenchParams): string
export function levelBracket(levelUl: number): string             // "between the 12 mL and 13 mL marks"
export function describeStand(view: BenchView, stream: Stream, params: BenchParams): string
export function streamMessage(stream: Stream): string
export const SLOW_DOWN_TEXT: string
```

Components. `reducedMotion` comes from `useAppState()` in `TitrationBench` and is passed down.

```ts
// TitrationBench.tsx
export interface TitrationBenchProps {
  view: BenchView
  params: BenchParams
  /** The three reagent records, for the labels and the hazards (spec 5.3). */
  reagents: { hcl: Reagent; naoh: Reagent; indicator: Reagent }
  onAction(action: BenchAction): void
  onReading(ul: number): ReadingReply
}

// Shelf.tsx
export interface ShelfProps {
  view: BenchView
  reagents: TitrationBenchProps['reagents']
  /** Sends the action and sets the bench's message line to `said`. */
  act(action: BenchAction, said: string): void
}

// TitrationStand.tsx — a drawing only
export interface TitrationStandProps {
  burette: BenchView['burette']
  flask: BenchView['flask']
  plume: Plume | null
  additions: number
  colour: FlaskColour
  stopcockOpen: boolean
  reducedMotion: boolean
  describedBy: string          // id of the hidden paragraph holding describeStand(...)
}

// StopcockControls.tsx
export interface StopcockControlsProps {
  stream: Stream
  canDeliver: boolean          // phase === 'titrating' && burette.filled && !burette.empty
  canClearTip: boolean         // burette.filled && burette.tipBubble
  canSwirl: boolean            // phase === 'titrating' && !stream.open
  onClearTip(): void
  onAdd(kind: 'drop' | 'half-drop'): void
  /** Opens a stream (null) or a measured pour; closes it if that one is running. */
  onToggle(pourUl: number | null): void
  onSwirl(): void
}

// ReadingView.tsx — a drawing only
export interface ReadingViewProps { levelUl: number; filled: boolean; running: boolean; describedBy: string }

// ReadingInput.tsx
export interface ReadingInputProps { wanted: 'initial' | 'final' | null; disabled: boolean; onReading(ul: number): ReadingReply }

// useStream.ts
export function useStream(canDeliver: boolean, deliver: (ul: number) => void):
  { stream: Stream; open(pourUl: number | null): void; close(): void }

// ../NarrowLabPage.tsx
export interface NarrowLabPageProps { primer: ReactNode; notebook: ReactNode | null }
```

## 5. Data

One model parameter is added to the titration parameters in `src/chem-data/` (wherever the engine design puts `faintPinkConcentration`), in the existing `{ value, rationale }` shape:

```json
"pinkDisplayScale": {
  "value": 1e-5,
  "rationale": "The concentration of phenolphthalein's pink form, in mol/L, at which the drawn flask reaches 63% of its full pink. The drawing uses 1 - exp(-c / scale): the colour deepens with concentration and levels off, the shape of light absorbed by a coloured solution. Chosen by eye so that the threshold (1e-6 M) is a just-visible pink and the deepest careful endpoint (about 1.5e-5 M) is a clear pink. It matches about 1.2 cm of solution at the absorptivity Tamura et al. report (37,500 L/(mol cm)). Presentation only: nothing is graded by it."
}
```

Whether the stream's step belongs in chem-data depends on the engine design. Spec 7.4 defines a careful run as "stream, in fixed steps", so if the engine's acceptance test needs the step, store `streamStepMicrolitres: { value: 250, rationale }` there and have `stream.ts` read it; the engine cannot import from `app/`. If the engine's test supplies its own steps (the spike passed with 100, 250, 370 and 500), the constant stays in `stream.ts`. The interval (400 ms) is the app's either way.

The colours `PINK`, `DARK_PINK`, the flask's ink and the colourless liquid's grey are drawing constants in `flaskColour.ts` and `TitrationStand.tsx`, like the bond colours in the explorer. They are not theme tokens because the flask is drawn on a white card in both themes.

Nothing is stored by the bench itself. The stream's state (open or closed, what is left of a pour) is component state and is not saved: after a reload the stopcock is closed.

## 6. The bench

### 6.1 What is drawn and what is a control

| Apparatus | Drawn (SVG) | Controls (DOM, beside or under the drawing) |
| --- | --- | --- |
| HCl bottle | Bottle with a paper label: "HCl", "0.0975 M" | "Hazards" disclosure. The label is repeated as text: "Label: HCl, 0.0975 M. Standardized." |
| NaOH bottle | Bottle, label "NaOH", "≈ 0.1 M" | "Condition burette", "Fill burette" (reads "Refill burette" once filled), "Hazards" |
| Volumetric pipette and filler | Pipette with its bulb, single mark and filler; "25" | "Rinse with HCl", "Pipette HCl into flask" |
| Indicator dropper | Dropper bottle, label "phenolphthalein" | "Add 1 drop"; the count is text: "Drops in the flask: 2" |
| Wash bottle | Squeeze bottle with its bent spout, label "H₂O" | "Rinse down flask" (about 10 mL); the count is text |
| Waste beaker | Beaker labelled "waste"; its level rises with each rinsing sent to it | None. It is where conditioning, rinsing and clearing the tip send their liquid. |
| Burette, 50 mL | Tube with a mark at every mL (longer at each 5), numbered 0, 10 … 50 downward; the solution as a filled column | "Clear the tip" |
| Stopcock | A handle across the tube when closed, along it when open, and the word "closed" or "open" beside it | "Add half-drop", "Add drop", "Run in 1 mL", "Run in 5 mL", "Open stopcock" |
| Tip | The tip; an outlined bubble with the words "air bubble" while there is one | (cleared by "Clear the tip") |
| Conical flask | Flask on a white card; liquid at a height that follows the volume; the pink; the plume | "Swirl and wait 30 s" |
| Burette scale at the meniscus | The reading view (section 6.3) | "The meniscus in words" disclosure; the reading input and "Record" |

The whole burette cannot show 0.1 mL graduations: at 8.4 units per mL they would be under a pixel apart. It shows every mL. The 0.1 mL graduations are in the reading view, which is why that view is always on the bench and not behind a button.

The shelf drawings are `aria-hidden`: each tile says its apparatus and its state in text. The stand and the reading view are `role="img"` with a name and a description.

A finished step is marked in its tile by a tick and words ("Burette filled."), not by colour. The tile says what was done, which is the learner's own action and so gives nothing away in Challenge.

### 6.2 Layout

One grid inside one bordered card (`rounded-lg border bg-card p-3`, the explorer's card). DOM order is shelf, stand, reading at every width, and the visual order is the same, so focus order and reading order agree.

- **From 1280 px (`xl`)**: three columns, `grid-cols-[minmax(19rem,1.3fr)_minmax(21rem,1.15fr)_minmax(13rem,0.85fr)]`. Shelf: six tiles, two across. Stand: the drawing with the stopcock's buttons in a column to its right, level with the stopcock, and the status line under both. Reading: the view, then its caption, the words, the input.
- **768 to 1279 px**: the shelf runs across the top, two tiles across. Under it, stand and reading side by side, `grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]`, with the stopcock's buttons wrapping under the stand.
- **Notebook** (the shell's): beside the bench from 1800 px of viewport, below it otherwise.

The two drawings are sized by height, bounded by their column's width so they never letterbox (`bench.css`; the columns are `@container`):

```css
.bench-stand   { height: min(clamp(26rem, calc(100vh - 22rem), 46rem), calc(100cqw * 640 / 300)); }
.bench-reading { height: min(clamp(26rem, calc(100vh - 22rem), 46rem), calc(100cqw * 576 / 260)); }
@media (min-width: 80rem) {
  /* Beside the stand: the stopcock's buttons (9rem) and the gap. */
  .bench-stand { height: min(clamp(26rem, calc(100vh - 22rem), 46rem), calc((100cqw - 9.75rem) * 640 / 300)); }
}
```

26rem (416 px) is the floor because that is the smallest height at which the reading view was read blind.

What the screenshots showed (Chromium, device scale 1, both themes; files in `shots/`):

| Viewport | Bench | Stand | Reading view | Graduation | Notebook | Sideways scroll |
| --- | --- | --- | --- | --- | --- | --- |
| 2523×1290 | 1335 wide | 289×617 | 329×729 | 60.8 px | right of the bench, 916 wide | none |
| 1366×768 | 1110 wide | 195×416 | 188×416 | 34.7 px | below the bench | none |
| 768×1024 | 512 wide | 261×557 | 209×463 | 38.6 px | below the bench | none |
| 400×800 | not shown | | | | read-only, under the notice and primer | none |

What I saw, looking at them:

- **1366×768.** The three groups sit side by side under the shell's toolbar and checklist. The flask, the status line and every stopcock button are on screen together, which is what titrating needs. The reading input is at the bottom edge of the window; the message line and the stand's text description are below the fold. The page scrolls by 359 px in all. With the shell's two-line Guided checklist the bench starts 200 px down; a shorter checklist would bring the message line into view.
- **2523×1290.** Bench on the left at 1335 px, notebook to its right, nothing scrolls. The shelf's six tiles use about the top 390 px of their column and leave it empty below. That space is the obvious place for the Guided checklist or the primer's key equations if the shell wants it; I have not filled it.
- **768×1024.** Shelf across the top (two by three tiles), stand and reading view side by side beneath, notebook under the bench. The page is 1770 px tall: the learner prepares at the top and scrolls once to titrate, where stand, buttons, status line and reading view are together within one screen.
- **Dark theme.** The white card behind the flask reads as a white tile; the pink is the same pink as in the light theme. Scale lines, numerals and the meniscus are light on dark and equally clear. Bottle labels are white paper in both themes.
- **Things I would still fix in the build**: at 1366 the "Pipette HCl into flask" button is nearly as wide as its tile; the reading view's "Stopcock open" notice is wider than the drawn tube and crosses its walls; in the prototype the message line is at the bottom of the card and should sit directly under the status line.

### 6.3 Reading the meniscus

**What is shown.** A window of 1.2 mL of scale: the graduation at or just above the meniscus, five above it, six below it, and half a graduation of bare tube at each end. Whole-mL marks run from wall to wall (a ring round the glass, seen level, is one straight line) and carry their number in large numerals to the right of the tube. Half-mL marks are longer and twice as thick as tenths. Twelve consecutive graduations always include a whole-mL mark, so there is always a number to count from, and two when the meniscus is near a half. Above the 0 mark and below the 50 mark the tube is bare, as on a real burette.

**The meniscus.** The solution is a pale fill. The meniscus is a darker band: its top edge is where the liquid meets the glass, 0.08 mL above, and its lower edge is a curve whose lowest point, in the middle of the tube, is exactly the true level. The band has no outline, so its lower edge is the level itself and not a stroke's width off. Reading the top of the band instead of the bottom gives an answer 0.08 mL low, outside the tolerance: the classic misread costs what it should.

**Level to pixels.** `readingY(volume, level) = (volume − windowTop) × 0.48`, with `windowTop = floor(level / 100) × 100 − 550` in microlitres. The window moves in whole graduations, so every graduation is at a whole number of units and the meniscus moves within one fixed gap in the middle of the view (y from 264 up to, not including, 312 of 576). One hundredth of a mL is 4.8 units; the ±0.02 mL tolerance is 9.6 units either side. At the smallest allowed size (416 px tall) that is 3.5 px per hundredth and 6.9 px of tolerance either side; at 2523×1290 it is 6.1 px and 12.2 px. The level is passed unrounded at 0.001 mL (0.48 unit); SVG draws it between pixels.

**Graduations are one screen pixel thick whatever the size** (`vector-effect="non-scaling-stroke"`, `shape-rendering="crispEdges"`; whole and half mL marks two pixels). My first version scaled the strokes, and at 416 px a 1.08 px line came out one or two pixels thick by turns, so some tenths looked like half-mL marks. Snapping a line to a pixel row moves it by at most half a pixel, 0.0014 mL at the smallest size.

**Parallax is left out**, deliberately. The view is the scale as seen with the eye level with the meniscus, which is the correct technique; the caption under it says "Seen at eye level. 0 is at the top of a burette; read the bottom of the meniscus." Spec 7.3 lists five technique errors and parallax is not one. Modelling it would add a control to raise and lower the eye, a sixth error path in the engine, and a second thing to get right before every reading. The primer should say that the eye must be level and why.

**While the stopcock is open** the view shows no scale, only "Stopcock open. Close it to read the burette." A burette is not read while it runs, and a scale jumping 0.25 mL every 0.4 s is exactly the large moving area that reduced motion is meant to avoid. This is the same with and without reduced motion.

**The typed reading.** A text input (`type="text" inputMode="decimal"`, not `type="number"`: no spinner, no locale surprises, and the characters typed are what is parsed) labelled "Initial burette reading (mL)" or "Final burette reading (mL)" as `readingWanted` says, with a "Record" button; Enter in the field records. `parseReading` reads the characters into whole microlitres and never goes through a float. It requires two decimals: "24.3" is refused with "Record the reading to two decimal places, for example 24.30. The second decimal is your estimate between the marks." That is how a burette reading is written, and it is asked for in both modes; it says nothing about whether the reading is right. A comma is accepted as the decimal mark. The reply appears under the field in a `role="status"` paragraph that the field is described by; `aria-invalid` is set for a reading that could not be parsed, not for a misread. In Guided a reading more than 0.02 mL from the meniscus gets the controller's prompt, for example "27.67 mL is not where the meniscus is. Look at the bottom of the curve and read again.", which does not say which way it is off.

**Legibility, read blind.** `scripts/blind.cjs` drew random levels (four in the filling range 0 to 2 mL, the rest across the scale), screenshotted the reading view alone at 416 and 448 px tall in alternating themes, and wrote the true values to a file without printing them. I read each picture and typed my readings before the comparison script opened that file. Two sets of twelve; the second after the stroke fix, mostly at 416 px.

```
Set 1 (shots/blind/result.txt)
r01.png light h=448 true 0.093 read 0.09 diff -0.003 within
r02.png dark  h=448 true 28.475 read 28.47 diff -0.005 within
r03.png light h=416 true 25.824 read 25.82 diff -0.004 within
r04.png dark  h=448 true 28.910 read 28.91 diff 0.000 within
r05.png light h=448 true 1.446 read 1.44 diff -0.006 within
r06.png dark  h=416 true 21.885 read 21.88 diff -0.005 within
r07.png light h=448 true 22.488 read 22.49 diff 0.002 within
r08.png dark  h=448 true 19.190 read 19.19 diff 0.000 within
r09.png light h=416 true 20.202 read 20.20 diff -0.002 within
r10.png dark  h=448 true 1.646 read 1.65 diff 0.004 within
r11.png light h=448 true 0.130 read 0.13 diff 0.000 within
r12.png dark  h=416 true 41.964 read 41.96 diff -0.004 within
within 0.02 mL: 12/12; worst 0.006 mL

Set 2 (shots/blind2/result.txt)
r01.png light h=416 true 1.812 read 1.81 diff -0.002 within
r02.png dark  h=416 true 1.817 read 1.82 diff 0.003 within
r03.png light h=448 true 15.653 read 15.65 diff -0.003 within
r04.png dark  h=416 true 25.368 read 25.36 diff -0.008 within
r05.png light h=416 true 22.817 read 22.82 diff 0.003 within
r06.png dark  h=448 true 26.949 read 26.95 diff 0.001 within
r07.png light h=416 true 0.089 read 0.09 diff 0.001 within
r08.png dark  h=416 true 20.023 read 20.02 diff -0.003 within
r09.png light h=448 true 32.662 read 32.66 diff -0.002 within
r10.png dark  h=416 true 28.445 read 28.44 diff -0.005 within
r11.png light h=416 true 0.074 read 0.07 diff -0.004 within
r12.png dark  h=416 true 29.687 read 29.68 diff -0.007 within
within 0.02 mL: 12/12; worst 0.008 mL
```

What this does and does not show is in section 13: I am not a person at a screen, and I knew the drawing's geometry.

**The meniscus in words** (spec 11). Exact wording, from `meniscusText`:

> The bottom of the meniscus is between the 24.3 mL and 24.4 mL marks, *position*. The numbers on a burette increase downward.

where *position* is one of five, by which fifth of the gap the level is in:

| Level above the upper mark | Wording | A learner types | Worst error |
| --- | --- | --- | --- |
| 0.000 to 0.019 mL | at or just below the 24.3 mL mark | 24.30, 24.31 or 24.32 | 0.020 |
| 0.020 to 0.039 | about a quarter of the way down from the 24.3 mL mark | 24.32 or 24.33 | 0.019 |
| 0.040 to 0.059 | about halfway between them | 24.34, 24.35 or 24.36 | 0.020 |
| 0.060 to 0.079 | about three quarters of the way down from the 24.3 mL mark | 24.37 or 24.38 | 0.020 |
| 0.080 to 0.099 | just above the 24.4 mL mark | 24.38, 24.39 or 24.40 | 0.020 |

The test `lets a learner with only the text type a reading within 0.02 mL` runs every level from 0 to 50 000 µL against every reading in the third column and finds the worst error to be exactly 20 µL, which the tolerance includes. Typing the middle of each wording (24.31, 24.33, 24.35, 24.37, 24.39) is never more than 0.01 mL out. Five is the fewest positions for which this holds with ordinary readings of the words: with thirds or quarters, one natural choice of hundredth falls outside. The text never contains a number with two decimals (tested).

The words are the reading view's `aria-describedby` description, held in a hidden paragraph as the explorer does it, and are shown to anyone who opens the closed disclosure "The meniscus in words" under the view. While the stopcock is open they say "The stopcock is open. Close it to read the burette."

### 6.4 The stopcock

Five buttons in a group named "Stopcock", plus "Clear the tip" before them and "Swirl and wait 30 s" after:

| Button | What one activation does |
| --- | --- |
| Add half-drop | Delivers 25 µL |
| Add drop | Delivers 50 µL |
| Run in 1 mL | Opens the stopcock, delivers 4 additions of 250 µL on the timer, closes it |
| Run in 5 mL | The same with 20 additions |
| Open stopcock | A toggle (`aria-pressed`). Delivers 250 µL every 400 ms until it is pressed again |

**Pointer and keyboard are the same**: each is a button, activated by a click, a tap, Enter or Space. Nothing is held. While a stream or a pour is running, the button that started it reads "Close stopcock" and one more activation closes it; focus is already on it, so closing is one key press with no travel. The other four are unavailable until it closes. Escape closes the stopcock from anywhere on the bench.

**One key press, one addition.** A held Enter repeats, and on a button every repeat is a click, so holding Enter on "Add drop" would run thirty drops a second: a stream by accident. The stopcock buttons ignore repeated key events (`onKeyDown`: if `event.repeat` and the key is Enter or Space, `preventDefault`). Checked in Chromium: Enter held for eight key events adds 50 µL; Space the same; held on the toggle it toggles once.

**The timer and the engine.** `useStream` holds a `Stream` and, while it is open, a `setInterval` of 400 ms. Each tick calls `streamTick(stream, canDeliver)`, hands the returned volume to `onAction({ type: 'deliver', ul, kind: 'stream' })`, and keeps the returned stream. The engine sees a volume and a kind. The first addition comes one interval after opening, so opening and closing within 400 ms delivers nothing. The stream closes itself when the engine can take no more (`canDeliver` false: the burette is at 50.00 mL or the trial is over), when the page is hidden (a hidden tab runs its timers late and unseen), when the bench unmounts (leaving the page, or the window narrowing below 768 px), and in Guided when `slowDown` first becomes true.

**What the learner sees on each addition.** The column of solution in the whole burette is shorter. The meniscus in the reading view is lower by 12 units for a half-drop and 24 for a drop, and when it crosses a graduation the scale steps up by one. A small drop falls from the tip (220 ms). A patch of pink appears where the drop lands, sized by the plume's fraction, and fades over `fadeSeconds × 400` ms, held between 350 ms and 4 s; a new addition replaces it. The status line under the flask gives the flask's colour and the cue: "Flask: colourless. Last addition: pink fades slowly." During a stream a thin line joins the tip to the liquid, the handle lies along the tube and the word beside it is "open".

**Under reduced motion** the timer, the volumes and the risk are the same. Nothing is tweened: no falling drop, no line of liquid, no plume. The plume and drop elements are not rendered at all, and the app's global rule would stop them if they were. The level and the meniscus change in steps, one per addition. The status line is then the only cue, as spec 7.2 says. Checked: with `prefers-reduced-motion: reduce` there are no plume or drop elements and no running animations, and the status line reads the same as with motion.

**"Swirl and wait 30 s"** sends `swirlAndWait`. The plume goes, and the message line says what was found: "Swirled for 30 seconds: the pink is still there." or "Swirled for 30 seconds: no pink remains."

**Guided.** When `slowDown` first becomes true in a trial the bench closes a running stream and the message line says: "Slow down: the endpoint is near. The stopcock has been closed. Go on a drop at a time, then by half-drops." Checked: five pours of 5 mL from a full burette stop at 24.750 mL delivered against an equivalence volume of 25.652 mL, the first addition within 1.00 mL. The learner can open the stopcock again. Challenge shows nothing and closes nothing.

**Overshooting: a real risk, not a trap.**

It is real. The cue "pink fades slowly" first appears with about 0.5 mL to go (the spike: 0.45 to 0.50 mL). An open stream covers that in under a second, so a stream cannot be stopped on the cue by anyone; a stream run too far overshoots, the flask goes dark pink, and the trial has to be repeated. A learner has to know roughly where the endpoint is, from the label and "about 0.1 M" or from a first rough trial, and leave the stream early. That is the real technique.

It is not a trap, because none of it depends on reaction time or on how a control is operated:

1. Any volume can be delivered with no timing at all: measured pours, then drops, then half-drops. This is what WCAG 2.1.1 asks of a keyboard interface ("without requiring specific timings for individual keystrokes"), and an open stream alone does not meet it.
2. A held key is one addition. Nothing starts on focus or hover.
3. The open stream closes with the same key on the same button, or Escape, and closes itself in the cases above.
4. The cues are words in a live region, announced when they change.
5. In Guided the stream is closed for the learner at the hint.
6. One press too many at the end does not cost the trial. With the spike's model at 1×10⁻⁶ M the mixed flask reaches the threshold at most 0.0120 mL past equivalence (seeds 1 to 100, three trials, 2 and 3 drops; 0.0123 at the corners of the seeded ranges). So (`scripts/extra-press.ts`):

```
endpoint by half-drops, then one more half-drop: under 0.0620 mL past equivalence -> cannot overshoot (limit: more than 0.10)
endpoint by half-drops, then one more drop: under 0.0870 mL past equivalence -> cannot overshoot (limit: more than 0.10)
endpoint by drops, then one more half-drop: under 0.0870 mL past equivalence -> cannot overshoot (limit: more than 0.10)
endpoint by drops, then one more drop: under 0.1120 mL past equivalence -> can overshoot (limit: more than 0.10)
endpoint by half-drops, then one stream addition (0.25 mL): under 0.2870 mL past equivalence -> can overshoot (limit: more than 0.10)
```

   Only a whole drop after an endpoint reached by whole drops, or opening the stream at the endpoint, can overshoot with one press. Both are the blunders the lab is teaching against.

**One thing the design cannot prevent.** Drops are exactly 50 µL and pours exactly 1 or 5 mL (spec 7.1 holds delivered volume as whole microlitres), so a learner who counts presses can work out the final reading from the initial one without looking at the meniscus. The bench does not help: it never prints a delivered volume, a count of additions, or a level finer than a whole mL (`benchText.test.ts` checks the last). Counting is more work than reading, and the initial reading still has to be read.

## 7. Colour

The flask's fill is the colourless liquid (`#e8edf2`, a faint grey so that liquid shows against the white card) with a layer of `PINK` (`#d81b7f`) over it at an opacity, `strength`, from the engine's pink concentration:

```
strength = 0                              if c < faintPinkConcentration
strength = 1 − exp(−c / pinkDisplayScale)  otherwise
```

| Pink concentration | Strength | Name in the status line |
| --- | --- | --- |
| below 1×10⁻⁶ M | 0 | colourless |
| 1×10⁻⁶ (the threshold) | 0.10 | faint pink |
| 4.9×10⁻⁶ (the spike's seed 1 endpoint) | 0.39 | faint pink |
| 1×10⁻⁵ | 0.63 | pink |
| 1.5×10⁻⁵ (about the deepest careful endpoint) | 0.78 | pink |
| 3.1×10⁻⁵ (all of two drops of indicator pink) | 0.95 | pink |
| overshot flag, with indicator | 1, in `DARK_PINK` (`#8a0f4d`) | dark pink (overshot) |

Why nothing is drawn below the threshold: just past equivalence the model has a little pink (7×10⁻⁷ M at 0.010 mL past, by my arithmetic on the spike's pH figures) while the status line says "colourless" and "fades slowly". If that were drawn, colour and words would disagree. So the pink appears in the drawing at the same addition as "faint pink" and "pink persists" appear in words.

Why not simply proportional: with intensity proportional to concentration and full pink at the indicator's total, the threshold would be drawn at 3% and be invisible. The exponential is the shape of light absorbed by a coloured solution, makes the threshold a visible step (10%), and levels off.

"Dark pink, overshot" comes from the engine's flag and nothing else (spec 7.3), in a second, darker colour, never reached by the concentration. With no indicator in the flask there is no pink to show: the flask stays colourless however far past equivalence it is, and the status line says "Flask: colourless. No indicator in it."

**Colour is never the only signal.** The status line under the flask always says the colour's name. The stand's description says it. The stopcock's state is a handle's direction and a word. The tip bubble is a shape and the words "air bubble". A finished step is a tick and a sentence.

**Both themes.** The flask, its liquid and the card behind it have fixed colours, so the pink is the same in both. Everything else on the bench is `currentColor` at an opacity, so it follows the theme's foreground with no new tokens. Looked at in both themes at every size: the threshold's faint pink is distinguishable from colourless side by side, and subtle, which is what a first faint pink is; the dark pink is unmistakably different from the deepest careful pink.

## 8. Reduced motion

The setting is the app's (`useAppState().reducedMotion`, which follows the system unless the learner overrides it). Under it: no plume, no falling drop, no line of liquid; the scale is hidden while the stopcock is open (as it is without it); every other change is a step with no transition. The bench has no CSS transition of its own.

## 9. Accessibility

### 9.1 Names and roles

| Element | Role | Accessible name | Notes |
| --- | --- | --- | --- |
| The bench | `region` (`<section>`) | "Bench" | Escape closes the stopcock from anywhere inside |
| Shelf | `group` | "Reagents and glassware" | |
| Each tile | `group` | its heading: "Hydrochloric acid", "Sodium hydroxide", "Pipette, 25.00 mL, with filler", "Phenolphthalein indicator", "Distilled water", "Waste beaker" | The heading is an `h3` |
| Tile drawings | none (`aria-hidden`) | | The tile's text says the same |
| Shelf buttons | `button` | "Condition burette", "Fill burette" / "Refill burette", "Rinse with HCl", "Pipette HCl into flask", "Add 1 drop", "Rinse down flask" | In the build, name the object where the tile's heading does not: "Add 1 drop of indicator", "Rinse pipette with HCl" |
| Hazards | `<details>` | "Hazards" | The existing `Disclosure` |
| Stand group | `group` | "Burette and flask" | |
| Stand drawing | `img` | "Burette on its stand over the conical flask" | Described by `describeStand(...)` in a hidden paragraph |
| Stopcock group | `group` | "Stopcock" | |
| Stopcock buttons | `button` | "Clear the tip", "Add half-drop", "Add drop", "Run in 1 mL", "Run in 5 mL", "Open stopcock" | The one that opened the stopcock reads "Close stopcock" while it runs; "Open stopcock" has `aria-pressed` |
| Swirl | `button` | "Swirl and wait 30 s" | |
| Status line | `status` | (its text) | Section 9.2 |
| Reading group | `group` | "Burette reading" | |
| Reading view | `img` | "The burette scale at the meniscus, enlarged" | Described by `meniscusText(...)` |
| The words | `<details>` | "The meniscus in words" | |
| Reading field | `textbox` | "Initial burette reading (mL)" or "Final burette reading (mL)" | Described by its reply; `aria-invalid` when unparsable |
| Record | `button` | "Record" | Submits the form; Enter in the field does the same |
| Message line | `status` | (its text) | Section 9.2 |
| Stand description | `<details>` | "Text description of the burette and flask" | The same text as the drawing's description |

A button that is unavailable is `aria-disabled` and stays focusable (`disabled` with `focusableWhenDisabled`, and the class the explorer uses), so focus never drops to the page when a press makes its own button unavailable.

### 9.2 Live regions

Two polite regions, each `role="status"`, each a pure function of state.

- **Status line** (`flaskStatus`): the flask's colour, then the last addition's cue. Its text changes only when the colour's name or the cue changes, and a region whose text does not change is not announced. So in a careful run it speaks about four times: "pink fades at once", "pink fades slowly", "faint pink … pink persists", and once more if the pink deepens.
- **Message line**: what the last action did. Prep actions each say their result ("Burette rinsed with sodium hydroxide solution; the rinsings went to the waste beaker."). Opening the stopcock says so once; closing says "Stopcock closed." The additions in between say nothing. "Drop added." and "Half-drop added." are said the first time and not repeated while the same button is pressed again, because the text is the same.

Measured in the prototype with a `MutationObserver` on each region:

```
open stream for 2.15 s (5 additions): message changed 2 times, status changed 1 time
"Run in 1 mL" (4 additions):          message changed 2 times, status changed 1 time
drop, drop, half-drop, half-drop:     message changed 2 times ("Drop added.", "Half-drop added."), status changed 1 time
```

So neither a stream nor fast pressing can queue up announcements. The cost is that the second and later presses of "Add drop" are silent until the cue changes. That matches what a sighted learner gets (nothing new to see until the pink lingers), but whether it is comfortable with a real screen reader is not something I could test (section 13).

The typed reading's reply is a third `status`, under its field. Guided warnings and trial feedback are the shell's.

### 9.3 Focus order

DOM order, which is the visual order at every width. Tab through the bench with the burette filled and no aliquot yet (from the prototype):

```
button "Hazards"
button "Condition burette"
button "Refill burette"
button "Rinse with HCl"
button "Pipette HCl into flask"
button "Add 1 drop" (unavailable)
button "Rinse down flask" (unavailable)
button "Clear the tip"
button "Add half-drop" (unavailable)
button "Add drop" (unavailable)
button "Run in 1 mL" (unavailable)
button "Run in 5 mL" (unavailable)
button "Open stopcock" (unavailable)
button "Swirl and wait 30 s" (unavailable)
summary "The meniscus in words"
input "Initial burette reading (mL)"
button "Record"
summary "Text description of the burette and flask"
```

The workflow is not a straight line through this (the reading is taken twice, the wash bottle is used mid-titration), so the bench never moves focus by itself. The half-drop and drop buttons come before the stream buttons, so the fine controls are reached first.

### 9.4 Keyboard

Everything is a native button, a `<details>` or a text field: Tab, Shift+Tab, Enter and Space do all of it. Escape closes the stopcock. There are no single-letter shortcuts (they collide with screen reader keys, and WCAG 2.1.4 would need a way to turn them off).

### 9.5 The narrow-viewport lab page

Below 768 px the bench is **not mounted**: the lab page renders `NarrowLabPage` in its place, decided in script by the same media query the rail uses (`(min-width: 768px)`; `useMediaQuery` is already written inside `AppState.tsx` and needs exporting), not hidden with CSS. So no stopcock timer and no bench control exists on a phone, and a window narrowed mid-stream closes the stopcock by unmounting.

It shows, in order: the page header; a notice; the primer, open; the notebook of the saved run, read-only, when there is one.

The notice, exactly:

> **The bench needs a wider screen.** It is shown on screens at least 768 pixels wide: turn this device sideways, or open Valence on a tablet or a computer. Progress is saved in this browser only, so a run started here continues here. Below are the primer and the notebook of your saved run.

The last sentence becomes "Below is the primer." when nothing is saved. The notice must not suggest that a run moves to another device: progress is in this browser's storage.

At exactly 768 px the rail is expanded and the page column is 512 px; the bench fits (screenshots at 768×1024, both themes, no sideways scroll).

## 10. Tests: the pure functions, with expected values

All of these ran in the prototype under the repository's Vitest 5.0.3: 6 files, 115 tests, all passing. The full verbose output is in section 15.

**`buretteGeometry.test.ts`**

| Case | Expected |
| --- | --- |
| `readingWindowTopUl` of 24370, 24300, 24399 | 23750 each |
| of 24400 | 23850 |
| of 0, 370, 2000 | −550, −250, 1450 |
| of 49999, 50000 | 49350, 49450 |
| `readingY(24370, 24370)` | 297.6 |
| `readingY(24300, 24370)`, `(24400, 24370)`, `(24000, 24370)` | 264, 312, 120 |
| `readingY(24371, 24370)` | 298.08 |
| `readingY(24390, 24370)`, `(24350, 24370)` | 307.2, 288 |
| `readingY(0, 0)`, `(50000, 50000)` | 264, 264 |
| `readingY(24380, 24370) − readingY(24370, 24370)` | 4.8 |
| `readingY(24390, 24370) − readingY(24370, 24370)` | 9.6 |
| for every level 0 … 50 000: `readingY(level, level)` | at least 264 and under 312 |
| graduations at levels 0, 370, 1999, 24370, 24950, 49999 | every y a whole number; neighbours 48 apart |
| `readingGraduations(24370)` volumes | 23800, 23900 … 24900 (twelve) |
| their y | 24, 72, 120, 168, 216, 264, 312, 360, 408, 456, 504, 552 |
| its labelled marks | only 24000, label "24", kind `ml` |
| kind of 24500; of 24300 | `half`; `tenth` |
| labels at level 24520; at 24460 | "24", "25" each |
| for every level 0 … 50 000 | at least one labelled mark |
| `readingGraduations(120)` volumes | 0, 100 … 700 (eight; none above 0) |
| its first mark | `{ ul: 0, y: 216, kind: 'ml', label: '0' }` |
| `readingGraduations(49950)` volumes | 49400 … 50000 (seven; none below 50) |
| `standY` of 0, 50000, 25000, 24370 | 40, 460, 250, 244.708 |
| `standGraduations()` | 51 marks; labels "0", "10", "20", "30", "40", "50"; `half` at 5000, 15000, 25000, 35000, 45000 |

**`meniscusText.test.ts`** (each begins "The bottom of the meniscus is between the A mL and B mL marks, " and ends ". The numbers on a burette increase downward.")

| Level | A, B | Position |
| --- | --- | --- |
| 24300 | 24.3, 24.4 | at or just below the 24.3 mL mark |
| 24319 | 24.3, 24.4 | at or just below the 24.3 mL mark |
| 24320 | 24.3, 24.4 | about a quarter of the way down from the 24.3 mL mark |
| 24350 | 24.3, 24.4 | about halfway between them |
| 24370 | 24.3, 24.4 | about three quarters of the way down from the 24.3 mL mark |
| 24399 | 24.3, 24.4 | just above the 24.4 mL mark |
| 0 | 0.0, 0.1 | at or just below the 0.0 mL mark |
| 987 | 0.9, 1.0 | just above the 1.0 mL mark |
| 50000 | 49.9, 50.0 | just above the 50.0 mL mark |

| Case | Expected |
| --- | --- |
| `markText` of 0, 100, 900, 1000, 24300, 29900, 50000 | "0.0", "0.1", "0.9", "1.0", "24.3", "29.9", "50.0" |
| text at every 7th level 0 … 50 000 | never matches `/\d\.\d\d/` |
| every level 0 … 50 000 against every reading in section 6.3's table | worst error exactly 20 µL |
| every level 0 … 49 999 against the middle of its wording (upper + 10, 30, 50, 70, 90 µL) | worst error exactly 10 µL |

**`reading.test.ts`**

| Typed | Expected |
| --- | --- |
| "24.37" | 24370 |
| "0.50", "0.00", "0.07" | 500, 0, 70 |
| " 24.30 " | 24300 |
| "24,37" | 24370 |
| "50.00" | 50000 |
| "05.07", "1.10", "8.29", "33.33" | 5070, 1100, 8290, 33330 |
| "", "   " | `empty` |
| "24.3", "24", "24.", "24.375" | `decimals` |
| "abc", ".50", "-1.00", "2e1", "24.37 mL" | `not-a-number` |
| "50.01", "124.37" | `range` |
| `parseReading(readingText(ul))` for every hundredth 0 … 50 000 | `ul` back exactly |
| `readingText` of 24370, 70, 8290 | "24.37", "0.07", "8.29" |

"8.29" and "33.33" are there because `8.29 * 1000` is 8289.999… in floating point; the parser never multiplies.

**`flaskColour.test.ts`** (threshold 1e-6, scale 1e-5)

| Case | Expected |
| --- | --- |
| `pinkStrength` of 0, 3.9e-13, 9.99e-7 | 0 |
| of 1e-6, 3e-6, 4.9e-6 | 0.0952, 0.2592, 0.3874 |
| of 1e-5, 1.5e-5, 2.35e-5, 3.3e-5 | 0.6321, 0.7769, 0.9046, 0.9631 |
| stepping c from 0 to 6e-5 by 1e-7 | never falls |
| no liquid | `{ name: 'empty', label: 'empty', strength: 0, fill: '#d81b7f' }` |
| c = 9.99e-7 | `{ name: 'colourless', label: 'colourless', strength: 0, fill: '#d81b7f' }` |
| c = 1e-6 | name and label "faint pink", strength 0.0952 |
| c = 4.9e-6; 9.9e-6 | "faint pink" |
| c = 1e-5; 1.5e-5 | "pink" |
| c = 2.4e-5, overshot | `{ name: 'dark pink', label: 'dark pink (overshot)', strength: 1, fill: '#8a0f4d' }` |
| c = 1.7e-5, 3 drops, not overshot | "pink" (never dark at a careful endpoint) |
| no indicator, overshot | "colourless" |

**`stream.test.ts`**

| Case | Expected |
| --- | --- |
| `streamTick(CLOSED, true)` | `{ deliverUl: 0, next: CLOSED }` |
| open stream, 5 ticks | 250, 250, 250, 250, 250; still open, `pourUl` and `remainingUl` null |
| `streamTick(openStream(1000), true)` | `{ deliverUl: 250, next: { open: true, pourUl: 1000, remainingUl: 750 } }` |
| pour of 1000, 6 ticks | 250, 250, 250, 250, 0, 0; closed |
| pour of 5000, 21 ticks | twenty of 250, then 0; closed |
| pour of 600, 4 ticks | 250, 250, 100, 0; closed |
| open stream, `canDeliver` false from the third tick | 250, 250, 0, 0; closed |
| pour of 5000, `canDeliver` false throughout | 0, 0, 0; closed |
| each of `POURS_UL` modulo 250 | 0 |

**`benchText.test.ts`** (threshold 1e-6, scale 1e-5)

| State | `flaskStatus` |
| --- | --- |
| no aliquot | "Flask: empty." |
| aliquot, no indicator | "Flask: colourless. No indicator in it." |
| aliquot, 2 drops, no addition yet | "Flask: colourless." |
| after an addition, c = 7.6e-20, fades at once | "Flask: colourless. Last addition: pink fades at once." |
| c = 1.5e-17, fades slowly | "Flask: colourless. Last addition: pink fades slowly." |
| c = 4.9e-6, persists | "Flask: faint pink. Last addition: pink persists." |
| c = 1.5e-5, persists | "Flask: pink. Last addition: pink persists." |
| c = 2.6e-5, overshot | "Flask: dark pink (overshot)." |
| 78 stream additions before the cue changes | one distinct text |

| State | `describeStand` |
| --- | --- |
| nothing done | "The burette is empty. The stopcock is closed. The conical flask under the burette is empty." |
| filled to 0.370 mL, bubble, no aliquot | "The burette holds sodium hydroxide solution; its level is between the 0 mL and 1 mL marks. There is an air bubble in the tip below the stopcock. The stopcock is closed. The conical flask under the burette is empty." |
| level 12.870, stream open | "The burette holds sodium hydroxide solution; its level is between the 12 mL and 13 mL marks. The stopcock is open. The conical flask under the burette holds the acid with 2 drops of indicator; the liquid is colourless." |
| level 26.045, c = 4.9e-6 | "The burette holds sodium hydroxide solution; its level is between the 26 mL and 27 mL marks. The stopcock is closed. The conical flask under the burette holds the acid with 2 drops of indicator; the liquid is faint pink." |
| levels 370, 12870, 26045, 49999, 50000 | never matches `/\d\.\d/` |

| Case | Expected |
| --- | --- |
| `levelBracket` of 0, 999 | "between the 0 mL and 1 mL marks" |
| of 1000 | "between the 1 mL and 2 mL marks" |
| of 49999 | "between the 49 mL and 50 mL marks" |
| of 50000 | "at the 50 mL mark, the bottom of the scale" |
| `streamMessage(openStream(null))` | "Stopcock open: sodium hydroxide is running into the flask. Press again to close it." |
| `streamMessage(openStream(5000))` | "Running in 5 mL, then the stopcock closes. Press again to close it sooner." |
| `streamMessage(CLOSED)` | "Stopcock closed." |

**Behaviour that cannot be tested in node.** Spec 13 has no end-to-end framework, so these go on the phase's hand checklist. Each was checked once in the prototype by script (`scripts/interact.cjs`, output in `shots/interact.txt`):

```
1. Enter held for 8 key events: +50 uL (want 50). Space held for 8: +50 uL (want 50). Two presses of half-drop: +50 uL (want 50).
2. Open stream for 2.15 s then Enter again: +1250 uL (want 1250), then +0 uL in the next 0.9 s (want 0). Focus stayed on "Close stopcock pressed=true".
   open and close within 150 ms: +0 uL (want 0)
   Enter held on the toggle for 8 key events: stopcock is open (want open: one toggle)
   Escape with focus on the shelf: closed=true, +0 uL afterwards (want 0)
   tab hidden: closed=true
3. "Run in 1 mL" by Space: +1000 uL (want 1000), closed by itself, focus on "Run in 1 mL".
4. Guided, five pours of 5 mL from 0: delivered 24750 uL (V_eq 25652; want the stream to stop at the first addition within 1000 uL of it: 24750).
5. Challenge, open stream 0.05 mL before equivalence: status "Flask: dark pink (overshot).", pink layer fill #8a0f4d, stream still open: false
6. prefers-reduced-motion: no-preference: plume elements 1 (fade 1.91579s), falling-drop elements 1, running animations 3
6. prefers-reduced-motion: reduce: plume elements 0, falling-drop elements 0, running animations 0
7. True level 27.637 mL. "" / "27.5" / "abc" / "60.00" each refused with its message; "27.67" (0.033 mL off) in Guided gets the re-read prompt; "27.62" (0.017 mL off) is recorded.
```

## 11. Implementation tasks, in order

Each pure module is written test-first from section 10. Tasks 1 to 5 need nothing from the engine and can start at once.

1. **`buretteGeometry.ts`.** Done when its tests in section 10 pass in `npm test`.
2. **`meniscusText.ts`.** Done when its tests pass, including the two exhaustive ones (worst error 20 µL and 10 µL).
3. **`reading.ts`.** Done when its tests pass, including the round trip of every hundredth.
4. **`stream.ts`.** Done when its tests pass.
5. **`flaskColour.ts`, and `pinkDisplayScale` in chem-data.** Done when its tests pass and the chem-data validator accepts the parameter with its rationale.
6. **`benchView.ts` and `benchText.ts`.** Needs the engine's selectors. Done when the `benchText` tests pass and one test builds a `BenchView` from a real engine state at each of: fresh, filled with a bubble, mid-stream, endpoint, overshot.
7. **`ReadingView.tsx`, `ReadingInput.tsx`.** Done when, in the running app at 1366×768 in both themes, the view is at least 416 px tall, graduations are one pixel thick, and three levels chosen by someone else are read within 0.02 mL; "24.3" is refused with the two-decimals message; the field's name follows `readingWanted`.
8. **`apparatus.tsx`, `TitrationStand.tsx`, `bench.css`.** Done when the stand shows, in both themes: the level, the stopcock's handle and word in both states, the bubble with its words, the flask at each colour name of section 7 against its white card, and a plume that fades.
9. **`useStream.ts`, `StopcockControls.tsx`.** Done when the hand checks 1 to 5 of section 10 pass in the running app by keyboard alone.
10. **`Shelf.tsx`.** Done when every prep action of spec 7.2 can be done by keyboard, each says its result in the message line, an unavailable button keeps focus, and the hazards of each reagent open.
11. **`TitrationBench.tsx`.** Done when the layout matches section 6.2 at 2523×1290, 1366×768 and 768×1024 in both themes with no sideways scroll, the Tab order is that of section 9.3, and with reduced motion on there is no plume, no falling drop and no running animation.
12. **`NarrowLabPage.tsx`; export `useMediaQuery`.** Done when at 767 px the bench is absent from the DOM, the notice, primer and read-only notebook show, and narrowing the window during a stream closes the stopcock.
13. **Hand checklist and documents.** Done when the phase's checklist includes: a full trial by keyboard only; a full trial with reduced motion on; a full trial with a screen reader, noting what is announced; the three viewport sizes in both themes. `docs/for-institutions.md` gains, under accessibility, what was checked and what was not, in those words.

## 12. The spec: wrong, silent or contradictory, with the change proposed

1. **7.2 Stopcock: stream needs timing.** "In stream mode the app sends fixed-volume additions on a timer" leaves an open stream as the only fast way to deliver, and stopping it is a timed key press. Add after that sentence: *"Stream is a toggle, never a held key or button, and a key held down adds one drop, not many. 'Run in 1 mL' and 'Run in 5 mL' open the stopcock, deliver that volume in the same additions and close it, so no volume needs the learner's timing."*
2. **7.2 Guided: the hint comes too late to act on during a stream.** Change "shows a 'slow down' hint within 1.00 mL of equivalence" to *"shows a 'slow down' hint within 1.00 mL of equivalence and, the first time it shows in a trial, closes the stopcock if it is streaming"*. Owner's decision.
3. **11: "a rough position" is not defined, and must be fine enough to pass.** Change the bullet to: *"The meniscus text alternative gives the two bracketing graduations and which fifth of the gap the meniscus is in (at or just below the upper mark, about a quarter, about halfway, about three quarters, just above the lower mark), not the reading itself. Five positions are the fewest that keep a learner who uses only the text within the ±0.02 mL tolerance. It is available to every learner."*
4. **7.3 Colour: "proportional" and the threshold disagree on screen.** Proportional to concentration, the threshold would be drawn at about 3% and be invisible, and the pink just below the threshold would show while the status line says colourless. Add to the Colour bullet: *"The drawn pink is nil below `faintPinkConcentration`; from there its strength is 1 − exp(−c / `pinkDisplayScale`), a presentation parameter (1×10⁻⁵ M), so that the colour appears at the same addition as 'pink persists'."*
5. **7.3 Trial states: silent on a flask with no indicator.** "An overshot flask is shown dark pink" cannot be true of one. Change to: *"An overshot flask that holds indicator is shown dark pink and labelled 'overshot'… With no indicator the flask stays colourless; the trial is invalid when overshot and the feedback names the missing indicator."* And add "titrating with no indicator in the flask" to the steps Guided warns before in 7.2.
6. **7.1/7.3: silent on parallax.** Add to 7.1: *"The reading view shows the scale with the eye level with the meniscus. Parallax is not modelled; the primer explains it."* Owner's decision.
7. **7.2: silent on reading while the stopcock is open.** Add: *"The reading view shows no scale while the stopcock is open."*
8. **7.1/7.2: silent on whether the bench may show a delivered volume.** Add to 7.1: *"The bench never states a burette level or a delivered volume as a number finer than a whole mL; a reading comes only from the meniscus or its text alternative."* And accept in writing that exact drop volumes let a learner who counts presses compute the titre.
9. **10: "saved after every learner action, including each stopcock close" leaves a stream's additions unsaved until it closes**, so a reload during a stream would undo it. Change to: *"…saved after every learner action and every stream addition, so a reload resumes the current trial at the delivered volume, with the stopcock closed."* A small write every 0.4 s for under a minute.
10. **11: the narrow-page notice.** "A notice to continue on a larger screen" reads as if a run moves between devices. Change to: *"…and a notice that the bench needs a screen at least 768 px wide, which also says that progress stays in this browser."*
11. **11: where the notebook goes.** "The lab notebook docked right" does not fit beside a bench at 1366 px. Change to: *"the lab notebook beside the bench where the window is at least 1800 px wide, and below it otherwise"*, which also matches how the explorer's inspector runs below the viewer.
12. **7.2: stream rate is not stated.** Add: *"A stream addition is 0.25 mL every 0.4 s."* (or wherever the engine design fixes the step).
13. **5.3 says hazards are shown "on the reagent's bottle card".** The bench has no card per bottle; it has a tile with a "Hazards" disclosure. Change "bottle card" to *"bottle's tile on the bench"* for the titration lab, or leave the wording and accept the tile as the card.

## 13. What I could not verify

- **Whether a person can read the meniscus.** The blind readings were mine. I am a model looking at a screenshot, I measured positions in the picture and did arithmetic where a person estimates by eye, and I knew the drawing's geometry (where the gap sits, how far the liquid climbs the glass). The 24 of 24 says the picture holds the information to well inside the tolerance at 416 px; it does not say how a first-time learner fares. No person has looked at any of these screens.
- **Counting from a single numbered mark.** In most views one whole-mL number is visible. On my first look at the bench I misjudged a level by a millilitre before counting the lines. Whether a novice finds this harder than a real burette, and whether Guided should label every graduation, needs the owner's eye.
- **Screen readers.** Nothing was run with NVDA, JAWS, VoiceOver or TalkBack. What a live region announces, how the two regions interleave, whether silence on repeated drops is acceptable, and whether a hidden paragraph named by `aria-describedby` on an SVG `img` is read, are all untested. I counted DOM changes, not speech.
- **Switch access, voice control, touch.** Not tried. The stopcock buttons in the prototype are the app's small size (28 px tall); on a tablet I would use the default (32 px).
- **Browsers other than Chromium.** `vector-effect`, container query units in `min()`, and the key-repeat guard were checked in headless Chromium only. Whether Firefox and Safari fire a click for each repeated Enter on a button, and so whether the guard is needed or behaves the same there, I did not check.
- **Contrast.** Not measured: the scale lines and the meniscus band against the tube, the faint pink against colourless, muted text in the tiles.
- **The engine.** The prototype's engine is the spike's `flask` and `plume` with one fixed trial (seed 1, equivalence 25.652 mL). The real engine's selectors, its tip-bubble level, its plume and its "swirl and wait" may differ from section 3. The "one more press" figures rest on the spike's worst excess (0.0120 mL over seeds, 0.0123 at the corners), not on the engine's.
- **The colour choice.** `pinkDisplayScale`, the two pinks and the grey of the colourless liquid were chosen by me from a rendered sheet. I have not compared them with a real flask, and a monitor is not a flask.
- **The shell.** The mode switch, checklist, notebook and primer in the screenshots are stand-ins I wrote. The bench's height on a real page depends on the shell's.
- **Small heights.** At 1366×768 the bench is 654 px tall and the window leaves 568; on a laptop whose browser chrome leaves 650 px of window the reading input needs a scroll. Not tried below 768 px of height.
- **Hazards and sources.** The "Hazards" button in the prototype does nothing; the reagent records do not exist yet. Where the bench's "Sources" control goes (spec 5.1) depends on the data design.
- **Zoom and large text.** Browser zoom, a minimum font size, and 200% text were not tried on the bench.

## 14. The prototype

```
proto/                 Vite app; root is this folder, alias @ -> the repository's src
  src/lib/             the pure modules and their tests, as specified in section 4
  src/bench/           ReadingView, Stand, apparatus, Bench (the components, in prototype form)
  src/fakeLab.ts       stand-in engine on the spike's model; named states for screenshots
  src/LabPage.tsx      stand-in shell, notebook and narrow page
  src/ReadingSheet.tsx, ColourSheet.tsx   single views for the blind test and the colour choice
scripts/
  shots.cjs            bench at 2523x1290, 1366x768, 768x1024, 400x800, both themes
  blind.cjs, compare.cjs   the blind legibility test
  interact.cjs         keyboard, stream, live regions, reduced motion, typed reading, Tab order
  colours.cjs, states.cjs  colour sheet; plume and open-stream screenshots
  extra-press.ts       the "one more press" arithmetic on the spike's model
shots/                 every screenshot and text output named above
```

Run from `proto/`: `../../../../../node_modules/.bin/vite --config vite.config.ts` (port 5291), then `node ../scripts/shots.cjs endpoint`, and `../../../../../node_modules/.bin/vitest run --root .` for the tests. States: `?state=fresh|bubble|ready|mid|near|endpoint|pink|overshot`, `&mode=challenge`.

The prototype differs from this design in small ways: actions are named as the stand-in engine names them; `readingWanted` is guessed from the count of additions; `onReading` returns a string; the message line is at the bottom of the card; "Hazards" is a dead button; the stand's clip path has a fixed id (use `useId` in the build, as two stands on one page would collide).

## 15. Test output

`vitest run --root . --reporter=verbose` in `proto/` (also in `shots/vitest.txt`):

```
(node:2294545) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)

 RUN  v5.0.3 design-scratch:/bench/proto

(node:2294616) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:2294617) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:2294623) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:2294630) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:2294624) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:2294636) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/lib/stream.test.ts > streamTick > sends nothing while closed 7ms
 ✓ src/lib/stream.test.ts > streamTick > sends 250 uL a tick for as long as an open stream is left open 2ms
 ✓ src/lib/stream.test.ts > streamTick > remembers which pour was asked for while it runs 1ms
 ✓ src/lib/stream.test.ts > streamTick > runs in 1 mL as four additions and closes with the last 1ms
 ✓ src/lib/stream.test.ts > streamTick > runs in 5 mL as twenty additions 4ms
 ✓ src/lib/stream.test.ts > streamTick > sends the remainder when a pour is not a whole number of additions 1ms
 ✓ src/lib/stream.test.ts > streamTick > closes, sending nothing, when the engine can take no more (burette at 50.00 mL, or the trial is over) 3ms
 ✓ src/lib/stream.test.ts > streamTick > offers pours that are whole numbers of additions 1ms
 ✓ src/lib/benchText.test.ts > flaskStatus > 0 6ms
 ✓ src/lib/benchText.test.ts > flaskStatus > 1 1ms
 ✓ src/lib/benchText.test.ts > flaskStatus > 2 1ms
 ✓ src/lib/benchText.test.ts > flaskStatus > 3 1ms
 ✓ src/lib/benchText.test.ts > flaskStatus > 4 2ms
 ✓ src/lib/benchText.test.ts > flaskStatus > 5 1ms
 ✓ src/lib/benchText.test.ts > flaskStatus > 6 1ms
 ✓ src/lib/benchText.test.ts > flaskStatus > 7 0ms
 ✓ src/lib/benchText.test.ts > flaskStatus > says the same thing for every addition of a stream until the cue changes, so a live region speaks once 4ms
 ✓ src/lib/benchText.test.ts > describeStand > before anything is done 2ms
 ✓ src/lib/benchText.test.ts > describeStand > filled, with the bubble still in the tip 1ms
 ✓ src/lib/benchText.test.ts > describeStand > streaming 1ms
 ✓ src/lib/benchText.test.ts > describeStand > at the endpoint 0ms
 ✓ src/lib/benchText.test.ts > describeStand > never gives a volume finer than a whole mL 2ms
 ✓ src/lib/benchText.test.ts > levelBracket > 0 uL 1ms
 ✓ src/lib/benchText.test.ts > levelBracket > 999 uL 1ms
 ✓ src/lib/benchText.test.ts > levelBracket > 1000 uL 0ms
 ✓ src/lib/benchText.test.ts > levelBracket > 49999 uL 0ms
 ✓ src/lib/benchText.test.ts > levelBracket > 50000 uL 0ms
 ✓ src/lib/benchText.test.ts > stream messages > names the open stream, the measured pour and the closed stopcock 1ms
 ✓ src/lib/reading.test.ts > parseReading > reads "24.37" as 24370 uL 10ms
 ✓ src/lib/reading.test.ts > parseReading > reads "0.50" as 500 uL 1ms
 ✓ src/lib/reading.test.ts > parseReading > reads "0.00" as 0 uL 4ms
 ✓ src/lib/reading.test.ts > parseReading > reads " 24.30 " as 24300 uL 1ms
 ✓ src/lib/reading.test.ts > parseReading > reads "24,37" as 24370 uL 1ms
 ✓ src/lib/reading.test.ts > parseReading > reads "50.00" as 50000 uL 1ms
 ✓ src/lib/reading.test.ts > parseReading > reads "05.07" as 5070 uL 2ms
 ✓ src/lib/reading.test.ts > parseReading > reads "0.07" as 70 uL 1ms
 ✓ src/lib/reading.test.ts > parseReading > reads "1.10" as 1100 uL 1ms
 ✓ src/lib/reading.test.ts > parseReading > reads "8.29" as 8290 uL 6ms
 ✓ src/lib/reading.test.ts > parseReading > reads "33.33" as 33330 uL 1ms
 ✓ src/lib/reading.test.ts > parseReading > refuses "": empty 0ms
 ✓ src/lib/reading.test.ts > parseReading > refuses "   ": empty 0ms
 ✓ src/lib/reading.test.ts > parseReading > refuses "24.3": decimals 0ms
 ✓ src/lib/reading.test.ts > parseReading > refuses "24": decimals 1ms
 ✓ src/lib/reading.test.ts > parseReading > refuses "24.": decimals 0ms
 ✓ src/lib/reading.test.ts > parseReading > refuses "24.375": decimals 0ms
 ✓ src/lib/reading.test.ts > parseReading > refuses "abc": not-a-number 0ms
 ✓ src/lib/reading.test.ts > parseReading > refuses ".50": not-a-number 0ms
 ✓ src/lib/reading.test.ts > parseReading > refuses "-1.00": not-a-number 0ms
 ✓ src/lib/reading.test.ts > parseReading > refuses "2e1": not-a-number 0ms
 ✓ src/lib/reading.test.ts > parseReading > refuses "24.37 mL": not-a-number 1ms
 ✓ src/lib/reading.test.ts > parseReading > refuses "50.01": range 0ms
 ✓ src/lib/reading.test.ts > parseReading > refuses "124.37": range 0ms
 ✓ src/lib/reading.test.ts > parseReading > gives every hundredth from 0.00 to 50.00 back exactly 15ms
 ✓ src/lib/flaskColour.test.ts > pinkStrength > a pink concentration of 0 M is drawn at strength 0 7ms
 ✓ src/lib/flaskColour.test.ts > pinkStrength > a pink concentration of 3.9e-13 M is drawn at strength 0 1ms
 ✓ src/lib/flaskColour.test.ts > pinkStrength > a pink concentration of 9.99e-7 M is drawn at strength 0 0ms
 ✓ src/lib/flaskColour.test.ts > pinkStrength > a pink concentration of 0.000001 M is drawn at strength 0.0952 1ms
 ✓ src/lib/flaskColour.test.ts > pinkStrength > a pink concentration of 0.000003 M is drawn at strength 0.2592 1ms
 ✓ src/lib/flaskColour.test.ts > pinkStrength > a pink concentration of 0.0000049 M is drawn at strength 0.3874 0ms
 ✓ src/lib/flaskColour.test.ts > pinkStrength > a pink concentration of 0.00001 M is drawn at strength 0.6321 2ms
 ✓ src/lib/flaskColour.test.ts > pinkStrength > a pink concentration of 0.000015 M is drawn at strength 0.7769 1ms
 ✓ src/lib/flaskColour.test.ts > pinkStrength > a pink concentration of 0.0000235 M is drawn at strength 0.9046 2ms
 ✓ src/lib/flaskColour.test.ts > pinkStrength > a pink concentration of 0.000033 M is drawn at strength 0.9631 1ms
 ✓ src/lib/flaskColour.test.ts > pinkStrength > never falls as the concentration rises 50ms
 ✓ src/lib/flaskColour.test.ts > flaskColour > is empty before the aliquot 4ms
 ✓ src/lib/flaskColour.test.ts > flaskColour > is colourless below the threshold, and drawn with no pink at all 1ms
 ✓ src/lib/flaskColour.test.ts > flaskColour > is faint pink from the threshold 1ms
 ✓ src/lib/flaskColour.test.ts > flaskColour > is still faint pink at the careful endpoint of the spike (4.9e-6 M) 1ms
 ✓ src/lib/flaskColour.test.ts > flaskColour > is pink from the display scale up 1ms
 ✓ src/lib/flaskColour.test.ts > flaskColour > is dark pink when the engine flags overshoot, whatever the concentration 1ms
 ✓ src/lib/flaskColour.test.ts > flaskColour > is never dark pink at a careful endpoint, however deep 0ms
 ✓ src/lib/flaskColour.test.ts > flaskColour > stays colourless with no indicator, even overshot 0ms
 ✓ src/lib/buretteGeometry.test.ts > reading view: level to y > the window for a level of 24370 uL starts at 23750 uL 7ms
 ✓ src/lib/buretteGeometry.test.ts > reading view: level to y > the window for a level of 24300 uL starts at 23750 uL 1ms
 ✓ src/lib/buretteGeometry.test.ts > reading view: level to y > the window for a level of 24399 uL starts at 23750 uL 1ms
 ✓ src/lib/buretteGeometry.test.ts > reading view: level to y > the window for a level of 24400 uL starts at 23850 uL 1ms
 ✓ src/lib/buretteGeometry.test.ts > reading view: level to y > the window for a level of 0 uL starts at -550 uL 1ms
 ✓ src/lib/buretteGeometry.test.ts > reading view: level to y > the window for a level of 370 uL starts at -250 uL 0ms
 ✓ src/lib/buretteGeometry.test.ts > reading view: level to y > the window for a level of 2000 uL starts at 1450 uL 0ms
 ✓ src/lib/buretteGeometry.test.ts > reading view: level to y > the window for a level of 49999 uL starts at 49350 uL 0ms
 ✓ src/lib/buretteGeometry.test.ts > reading view: level to y > the window for a level of 50000 uL starts at 49450 uL 1ms
 ✓ src/lib/buretteGeometry.test.ts > reading view: level to y > volume 24370 uL with the meniscus at 24370 uL is drawn at y = 297.6 1ms
 ✓ src/lib/buretteGeometry.test.ts > reading view: level to y > volume 24300 uL with the meniscus at 24370 uL is drawn at y = 264 0ms
 ✓ src/lib/buretteGeometry.test.ts > reading view: level to y > volume 24400 uL with the meniscus at 24370 uL is drawn at y = 312 0ms
 ✓ src/lib/buretteGeometry.test.ts > reading view: level to y > volume 24000 uL with the meniscus at 24370 uL is drawn at y = 120 0ms
 ✓ src/lib/buretteGeometry.test.ts > reading view: level to y > volume 24371 uL with the meniscus at 24370 uL is drawn at y = 298.08 0ms
 ✓ src/lib/buretteGeometry.test.ts > reading view: level to y > volume 24390 uL with the meniscus at 24370 uL is drawn at y = 307.2 1ms
 ✓ src/lib/buretteGeometry.test.ts > reading view: level to y > volume 24350 uL with the meniscus at 24370 uL is drawn at y = 288 0ms
 ✓ src/lib/buretteGeometry.test.ts > reading view: level to y > volume 0 uL with the meniscus at 0 uL is drawn at y = 264 0ms
 ✓ src/lib/buretteGeometry.test.ts > reading view: level to y > volume 50000 uL with the meniscus at 50000 uL is drawn at y = 264 0ms
 ✓ src/lib/buretteGeometry.test.ts > reading view: level to y > draws 0.01 mL as 4.8 units and the +/-0.02 mL tolerance as 9.6 units either side 0ms
 ✓ src/lib/buretteGeometry.test.ts > reading view: level to y > keeps the bottom of the meniscus in the middle twelfth of the window at every level 8ms
 ✓ src/lib/buretteGeometry.test.ts > reading view: level to y > puts every graduation on a whole unit, 48 apart 13ms
 ✓ src/lib/buretteGeometry.test.ts > reading view: graduations > shows the twelve graduations round 24.37 mL, numbered at 24 3ms
 ✓ src/lib/buretteGeometry.test.ts > reading view: graduations > shows two numbered marks when the meniscus is near a half 2ms
 ✓ src/lib/buretteGeometry.test.ts > reading view: graduations > always shows at least one numbered mark, at every level a burette can have 79ms
 ✓ src/lib/buretteGeometry.test.ts > reading view: graduations > draws no graduation above the 0 mark or below the 50 mark 1ms
 ✓ src/lib/buretteGeometry.test.ts > whole burette > draws 0 uL at y = 40 0ms
 ✓ src/lib/buretteGeometry.test.ts > whole burette > draws 50000 uL at y = 460 0ms
 ✓ src/lib/buretteGeometry.test.ts > whole burette > draws 25000 uL at y = 250 0ms
 ✓ src/lib/buretteGeometry.test.ts > whole burette > draws 24370 uL at y = 244.708 0ms
 ✓ src/lib/buretteGeometry.test.ts > whole burette > has a mark at every mL, numbered at every ten 3ms
 ✓ src/lib/meniscusText.test.ts > meniscusText > describes a level of 24300 uL 7ms
 ✓ src/lib/meniscusText.test.ts > meniscusText > describes a level of 24319 uL 1ms
 ✓ src/lib/meniscusText.test.ts > meniscusText > describes a level of 24320 uL 1ms
 ✓ src/lib/meniscusText.test.ts > meniscusText > describes a level of 24350 uL 1ms
 ✓ src/lib/meniscusText.test.ts > meniscusText > describes a level of 24370 uL 1ms
 ✓ src/lib/meniscusText.test.ts > meniscusText > describes a level of 24399 uL 1ms
 ✓ src/lib/meniscusText.test.ts > meniscusText > describes a level of 0 uL 1ms
 ✓ src/lib/meniscusText.test.ts > meniscusText > describes a level of 987 uL 1ms
 ✓ src/lib/meniscusText.test.ts > meniscusText > describes a level of 50000 uL 2ms
 ✓ src/lib/meniscusText.test.ts > meniscusText > writes marks without float noise 3ms
 ✓ src/lib/meniscusText.test.ts > meniscusText > never contains the reading itself: no number with two decimals 252ms
 ✓ src/lib/meniscusText.test.ts > meniscusText > lets a learner with only the text type a reading within 0.02 mL, at every level from 0.000 to 50.000 mL 21ms
 ✓ src/lib/meniscusText.test.ts > meniscusText > puts the middle of each wording within 0.01 mL 16ms

 Test Files  6 passed (6)
      Tests  115 passed (115)
   Start at  17:49:47
   Duration  859ms (transform 42%, tests 34%, import 21%, worker 4%)
```
