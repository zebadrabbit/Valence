# Valence v1 — Design Spec

2026-10-03. Supersedes the scope, stack, and data-sourcing sections of `Chem Lab Explorer - Design Document.md` (the "original doc") for v1. Where this spec is silent, the original doc's UI/UX and accessibility sections still apply.

## 1. Purpose

Valence is an independent, browser-based molecule explorer and virtual general-chemistry lab for self-directed learners. It is a personal project with no connection to any school; it contains no course numbers, institution names, rooms, or storage locations.

v1 proves each of the app's four formats once:

1. A molecule explorer with atom and bond inspection over a curated library.
2. A quantitative lab: standardization of a base by titration.
3. A qualitative lab: ten reactions in aqueous solution.
4. One authored mechanism timeline: HCl + NaHCO₃.

Success for v1: a learner with no account can open the site, complete both labs in Guided or Challenge mode, have their results checked against the model, scrub the mechanism, and find their progress still there when they return in the same browser.

## 2. Decisions that differ from the original doc

| Topic | Original doc | v1 decision | Why |
| --- | --- | --- | --- |
| Scope | Seven labs across phases 2–4, 18 in total | Two labs, explorer, one mechanism | Smallest set that proves every format |
| Data rule | "No chemistry facts are hand-written" | Every chemistry value is hand-curated with a source link and covered by a test | PubChem and NIST cannot supply solution colours, precipitate textures, aqueous enthalpies, pKa, or 3D for several molecules |
| Mixing | Rules give "correct results for combinations nobody planned" | The ten scripted stations only; two reagents per tube | About 8–10 of the 66 possible reagent pairs come out wrong under the five rules |
| RDKit.js | In the browser | Not in the browser | It exposes no per-atom hybridization, oxidation state, or VSEPR; a fixed library can be precomputed |
| Accounts | Supabase schema in phase 1, accounts in phase 5 | Deferred; guest-only | Nothing to sync until labs exist. A self-hosted Supabase already runs on the dev server when wanted |
| Repo | Monorepo, six packages | One Vite app with folders | One consumer in v1 |
| Web Workers | Simulation in workers | Main thread | The models are microseconds of arithmetic |
| Titration noise | Technique errors only | Technique errors plus small seeded glassware variation | Otherwise three good trials are identical and relative deviation teaches nothing |

## 3. Out of scope for v1

Accounts and any backend; the molecule builder; free mixing; the other 16 labs; RDKit in the browser; Web Workers; a dashboard beyond a list of labs with status; hazard data pulled automatically; analytics of any kind.

## 4. Architecture

A single static TypeScript web app. No server.

Stack: TypeScript, Vite, React, Tailwind, shadcn/ui, Three.js via React Three Fiber, Vitest.

```
src/
  chem-data/    curated JSON + TypeScript types + validator
  engine/       seeded RNG, ion bookkeeping, reaction rules, pH solver, titration model
  mechanisms/   authored timeline data + pure state function
  app/          React UI, 3D scenes, routing, progress storage
scripts/        build-time helpers (fetch PubChem SDFs once, validate chem-data)
```

Rules:

- `engine/`, `chem-data/`, and `mechanisms/` never import React, Three.js, or the DOM. An ESLint `no-restricted-imports` rule enforces this.
- `engine/` never calls `Math.random` or reads the clock (lint rule). All variation comes from a seeded generator (mulberry32) passed in explicitly.
- Every engine model has Vitest tests before its UI is built.
- `app/` depends on the other three folders; they never depend on `app/`.

The app has three areas reached from a collapsible left rail: **Explore**, **Lab**, **Learn**. The home page lists the two labs and the mechanism with status (not started, in progress, completed).

## 5. Chemistry data (`chem-data/`)

### 5.1 The rule

Every chemistry value shown to a learner or used by a model is stored in `chem-data/` together with a `source` (URL plus short citation). The validator runs in tests and in the build and fails when:

- a chemistry value has no `source`;
- an ID referenced by a station, lab, or mechanism does not exist;
- a molecule file's 3D coordinates are a 2D record (every bond length exactly 1.000);
- any string matches a denylist of institution-specific patterns (course-number shapes, "room", "cabinet", "building", and a configurable list of names).

PubChem CIDs are stored for identity and outbound links. Nothing is fetched at runtime; the app works offline once loaded.

### 5.2 Sources

| Data | Source |
| --- | --- |
| 3D coordinates, molecules and polyatomic ions | PubChem 3D SDF where a record exists, fetched once by a script and committed; labelled "computed model (MMFF94s, PubChem3D)" |
| 3D coordinates, SF₆, XeF₄, PCl₅, and any other molecule with no PubChem 3D record | Hand-authored ideal VSEPR geometry using bond lengths cited from NIST CCCBDB |
| Experimental bond lengths and angles for small showcase molecules | NIST CCCBDB, one citation per value |
| Element data (mass, electronegativity, configuration, radii, ionization energies) | A single cited reference table (PubChem periodic table or CRC Handbook) |
| Aqueous-ion formation enthalpies and entropies | NBS tables (Wagman 1982) or CODATA Key Values |
| pKa, Kw | CRC Handbook or IUPAC compilations |
| Precipitate colour and texture, solution colours, odours | Curated observation table, one citation per row |
| Hazards | One hand-picked GHS classification per reagent from its PubChem record, labelled "hazards of the pure substance", plus a curated note for the concentration used |

### 5.3 Shapes

**Reagent:** `id`, `name`, `formula`, `pubchemCid`, `form` (solution, solid, metal), `molarity` (solutions), `ions` (species and stoichiometric ratio), `hazards`, `source`.

**Ion / species:** `id`, `formula`, `charge`, `solutionColor` (or none), thermodynamic values where a model needs them, `source`.

**Observation row:** product `id`, `color`, `texture`, `odor`, `source`.

**Station:** `id`, the two reagent IDs, `observationTools`, `expected` (the hand-written test oracle from section 8.2).

**Molecule:** `id`, `name`, `pubchemCid`, `topic`, atoms (element, 3D position, 2D position, formal charge, lone pairs, oxidation state, hybridization, VSEPR geometry), bonds (atom pair, order, aromatic flag), `geometrySource` (computed or cited-experimental), optional experimental lengths and angles, `source`.

## 6. Explorer

### 6.1 Library

About 30 molecules, each a curated JSON file:

- **Basics:** H₂O, CO₂, NH₃, CH₄, O₂, N₂, HCl, H₂O₂.
- **VSEPR showcase:** BF₃, SO₂, SF₆, XeF₄, PCl₅.
- **Organic functional groups:** ethane, ethene, ethyne, ethanol, acetic acid, acetone, formaldehyde, methylamine, ethyl acetate, acetamide, benzene.
- **Biomolecules:** β-D-glucopyranose (CID 64689), glycine and alanine (each in neutral and zwitterion forms, with a toggle), urea.
- **Mechanism species:** H₃O⁺, HCO₃⁻, H₂CO₃.

No salts in the library: ionic compounds are not molecules. PCl₅ carries a "gas-phase structure" note and separate axial and equatorial bond lengths.

### 6.2 Views

Ball-and-stick, space-filling (van der Waals radii), wireframe, and 2D Lewis. Double and triple bonds render as parallel cylinders; aromatic bonds render as delocalised. The 2D Lewis view is custom SVG drawn from the curated 2D positions and lone-pair counts.

### 6.3 Inspectors

**Atom card**, base layer: symbol, atomic number, mass, electronegativity, valence electrons, formal charge, oxidation state, hybridization, VSEPR geometry. Expanded layer: electron configuration, ionization energies, atomic and ionic radii.

**Bond card:** length, order, polarity as Pauling electronegativity difference (labelled "a rough guide"), σ/π composition. Aromatic bonds show "aromatic (delocalised), order 1.5".

How the values are produced:

- VSEPR geometry: computed in TypeScript from the steric number (bonded atoms + lone pairs) by lookup.
- Oxidation state: computed per atom by assigning each bond's electrons to the more electronegative atom.
- Hybridization: from the steric number, with a resonance override so a lone-pair atom adjacent to a π system (amide N, phenol O, carboxylic and ester O) is sp². For steric numbers 5 and 6 the card reads "sp³d (textbook label; real d-orbital involvement is negligible)" or the sp³d² equivalent.
- Lengths and angles: measured from the stored coordinates and labelled with `geometrySource`. Where cited experimental values exist they are shown instead, with the citation.
- Flexible molecules (ethanol, glucose, ethyl acetate) carry the note "one conformer of many".

**Measure tool:** click three atoms for a bond angle, four for a dihedral.

### 6.4 Valence display levels

1. Bohr shells, with shell counts taken from the stored electron configuration and labelled "Bohr model: a simplified picture".
2. Lewis dots and lone pairs.
3. Hybrid orbital lobes for sp, sp², sp³ only; molecular orbital diagrams for O₂ and N₂ only, each with its own stored orbital order. The O₂ diagram carries a callout that the Lewis structure shows all electrons paired while the MO diagram shows two unpaired.

### 6.5 Acceptance

- Every library molecule loads with the network disabled.
- A curated expected-values table (formal charge, oxidation state, hybridization, VSEPR geometry per atom; order per bond) is checked against the computed inspector values in Vitest. It includes H₂O₂ (O is −1), acetamide (N is sp²), SF₆ (octahedral), XeF₄ (square planar), PCl₅ (trigonal bipyramidal; angles 90°, 120°, 180°), and benzene (all bonds aromatic).

## 7. Titration lab

### 7.1 Setup

The learner titrates a 25.00 mL pipetted aliquot of standardized HCl (in the flask) with ~0.1 M NaOH from a 50 mL burette, using phenolphthalein, and calculates the NaOH molarity. Three trials.

**Seeded values.** A run's seed fixes:

- the HCl label, 0.0850–0.1050 M, shown to four decimal places;
- the hidden true NaOH concentration, 0.0950–0.1050 M;
- glassware variation: pipette delivery within ±0.03 mL of 25.00 mL per trial, and the true meniscus position between graduations.

These ranges keep every titre between about 20 and 28 mL. The same seed always regenerates the same lab, the same variation, and the same expected answer.

### 7.2 Workflow

1. Select the HCl bottle and record its molarity.
2. Condition the burette with NaOH, fill it, clear the tip bubble, read the initial volume.
3. Rinse the pipette with HCl, then pipette the aliquot.
4. Add 2–3 drops of phenolphthalein.
5. Titrate to a faint pink lasting 30 seconds; read the final volume.
6. Repeat for three trials. The notebook shows average and relative deviation only after the learner has entered their own values.

**Stopcock:** closed, stream, dropwise (0.05 mL), half-drop (0.025 mL). Each addition makes a local pink plume that fades on swirling and lingers longer near the endpoint.

### 7.3 Model

**pH solver.** One charge-balance equation solved by bisection on pH, covering strong, weak, and polyprotic species. It returns ideal-solution pH (no activity corrections); the UI shows numeric pH only for solutions of about 0.2 M or less.

**Endpoint colour.** The flask's species list includes the indicator itself (a weak acid, in the amount delivered by the learner's drops) and dissolved CO₂ at air-equilibrium concentration. Both buffer the jump at equivalence, as they do in a real flask. Colour intensity is the fraction of indicator in its pink form. The indicator's pKa and the CO₂ concentration are curated, cited values; the model is tuned only through those and the drop count, and must satisfy the acceptance tests below.

**Overshoot** is defined by volume: more than 0.10 mL (two drops) past the true equivalence volume marks the trial invalid and shows dark pink.

**Technique errors** (each a deterministic consequence of what the learner did or skipped):

- Unconditioned burette: residual water dilutes the NaOH, the titre reads high, the calculated molarity comes out low.
- Tip bubble not cleared: the bubble escapes during the titration, so the recorded volume exceeds the volume delivered and the molarity comes out low.
- Pipette not rinsed with HCl: the aliquot is diluted, the titre reads low, the molarity comes out high.
- Meniscus misread: readings are typed to 0.01 mL and checked within ±0.02 mL of the true position.
- Distilled water added to the flask: no effect on the result (a misconception check).

The primer explains why NaOH needs standardizing: the solid absorbs water and CO₂ from air, so it cannot be weighed accurately.

**Grading.** A trial's calculated NaOH molarity passes if within ±1.0% of the true value. The lab completes with three valid trials.

### 7.4 Acceptance

- Solver: within 0.01 pH of an independently computed exact solution, with constants pinned in the test, for a strong acid, 0.1 M acetic acid (2.87–2.88), 0.1 M H₃PO₄ (about 1.63), an acetate buffer, and 1×10⁻⁸ M HCl (6.98).
- Titration curve: at every point more than 0.5 mL from equivalence, within 0.01 pH of the exact solution; computed equivalence volume within 0.01 mL of the stoichiometric value.
- Endpoint: for 100 seeds, a careful run (half-drops near the end) shows faint pink within one half-drop of equivalence and is not flagged as overshoot.
- Reproducibility: the same seed and the same learner actions give identical readings and expected answer.
- Each technique error moves the calculated molarity in the stated direction.

## 8. Aqueous reactions lab

### 8.1 Engine

A mix resolves in four steps:

1. Tally moles of every ion and solid present from reagent volumes and concentrations.
2. Apply the rules. Each acts on dissolved ions and on solids:
   - insoluble ion pairs form a precipitate (from a per-ion-pair solubility table);
   - H⁺ with CO₃²⁻ or HCO₃⁻ forms CO₂ gas;
   - NH₄⁺ with OH⁻ forms NH₃;
   - H⁺ with OH⁻ forms water and releases heat;
   - a metal with H⁺, by the activity series, forms H₂ gas and the metal ion.
3. Respect the limiting reagent. Spectator ions keep their colour: Cu²⁺ stays blue over white BaSO₄ whichever reagent is limiting.
4. If no rule fires, report no reaction and show only the blended reagent colours.

A tube holds exactly two reagents with no later additions, so one ordered pass is sufficient. The engine exposes only the ten stations; it has no entry point for arbitrary pairs.

**Outputs per station:** products and amounts; observable effects (precipitate, gas, temperature change, colour, odour); and the molecular, complete ionic, and net ionic equations. Colours, textures, and odours come from the curated observation table, never from the rule engine's guess.

### 8.2 Stations

| # | Reagents | Expected result (test oracle) | Tool |
| --- | --- | --- | --- |
| 1 | FeCl₃ 0.5 M + NaOH 1 M | Rust-brown gelatinous Fe(OH)₃ precipitate | Eye |
| 2 | Na₂CO₃ 0.5 M + CuSO₄ 0.5 M | Blue-green precipitate | Eye |
| 3 | Na₂CO₃ 0.5 M + NiCl₂ 0.5 M | Pale green precipitate | Eye |
| 4 | BaCl₂ 0.5 M + CuSO₄ 0.5 M | White BaSO₄; liquid stays blue | Eye |
| 5 | CoCl₂ 0.5 M + FeCl₃ 0.5 M | No reaction; colours only blend | Eye |
| 6 | NH₄NO₃ 0.5 M + NaOH 1 M | Ammonia odour; moist red litmus held above the liquid turns blue | Waft, litmus |
| 7 | CaCO₃ (solid) + HCl 1 M | Fizzing; solid dissolves | Eye |
| 8 | HCl 6 M + NaOH 6 M | Nothing visible; tube gets hot (about 40 °C rise) | Touch or thermometer |
| 9 | CoCl₂ 0.5 M + AgNO₃ 0.1 M | White AgCl precipitate; pinkish liquid | Eye |
| 10 | Mg metal + HCl 3 M | H₂ bubbles; trapped gas pops with a lit splint | Lit splint |

Station notes:

- **2 and 3:** the graded net ionic equation is the simple carbonate (M²⁺ + CO₃²⁻ → MCO₃). An expanded note says the solid that really forms is a basic carbonate, such as Cu₂(OH)₂CO₃.
- **5:** the no-reaction control; the engine must not invent a product.
- **6:** the litmus tool has two positions. In the liquid it turns blue from excess NaOH alone, which proves nothing; held moist in the vapour it shows ammonia. Sniffing directly instead of wafting triggers a safety note. No vigorous bubbling is shown: ammonia is very soluble.
- **8:** only detectable by temperature. The touch tool carries a caution that the tube is hot and the contents corrosive.

### 8.3 Learner input and checking

Observations are recorded with structured choices (precipitate or none, colour, gas, odour, temperature change), not free text.

Equations are entered with a species palette: the learner picks species offered for that station (including distractors), sets coefficients and states, and places each on the reactant or product side. An answer is correct when its species match the engine's equation and its coefficients are proportional to it. No free-text equation parsing.

**Guided mode** shows hints and the expected observations up front. **Challenge mode** hides them until the learner records their own, then checks.

### 8.4 Acceptance

- All ten stations produce the expected results in the table, including no reaction at station 5.
- Station 8's computed temperature rise is between 35 and 45 °C for equal volumes.
- Each station's three equations balance in atoms and charge (checked generically in a test).

## 9. Mechanism timeline

### 9.1 Model

A mechanism is authored choreography. The scene state is a pure function `state(mechanism, t)` of the scrub position `t` in [0, 1]: atom positions, bond orders, electron-pair paths, active species, energy cursor, camera target, and explanation text. Scrubbing in either direction therefore gives identical frames.

**Step record:** time range on the track, bonds broken, bonds formed, electron paths, `deltaH` and `deltaG` (each cited), camera target, explanation text at `intro` and `expanded` depth, real timescale label, optional prediction question.

**Features:** chapters with deep links (`?step=proton-transfer`); a non-linear track with each chapter's real timescale as a label; prediction pauses in Challenge mode; camera auto-framing that the learner can override and that resumes on release; beaker bookends at the start and end.

### 9.2 HCl + NaHCO₃ → NaCl + H₂O + CO₂

Solid NaHCO₃ is added to hydrochloric acid.

- **Prologue (not on the energy diagram):** what is already in the bottle. Hydrochloric acid is fully ionised: H₃O⁺ and hydrated Cl⁻.
1. **Dissolving:** NaHCO₃ separates into hydrated Na⁺ and HCO₃⁻.
2. **Proton transfer:** H₃O⁺ gives its proton to HCO₃⁻, forming H₂CO₃. Timescale: picoseconds to nanoseconds.
3. **Decomposition:** H₂CO₃ splits into H₂O and CO₂ through a water-relayed proton shift. Timescale: tens of milliseconds; the slow step.
4. **Gas escapes:** CO₂ gathers into bubbles and leaves; Na⁺ and Cl⁻ remain as spectators. Timescale: seconds.

The energy panel plots free energy as the main curve with enthalpy alongside. It notes that the reaction absorbs heat yet proceeds because escaping gas increases entropy, as a lead-in to Gibbs free energy.

Monatomic ions (Na⁺, Cl⁻) are drawn as spheres sized by cited ionic radii. Polyatomic species use the library's 3D records.

### 9.3 Acceptance

- `state(m, t)` returns deep-equal results for the same `t` regardless of the scrub path taken to reach it.
- Every step's bonds-broken and bonds-formed conserve atoms.
- The summed step enthalpies equal the cited overall reaction enthalpy within rounding.
- Each chapter's deep link opens at that chapter's start.

## 10. Progress

Guest-only. Progress is stored in `localStorage` under one versioned key as JSON:

- per lab: seed, mode, status, recorded readings and observations, answers;
- mechanism: last position and answered predictions;
- preferences: theme, reduced motion, valence display level.

The stored record is plain data with no browser-specific types, so the same shape can later be written to a database unchanged. If stored data fails to parse or has an unknown version, the app starts fresh and keeps the old value under a backup key instead of deleting it.

A settings page offers "export my progress" (downloads the JSON) and "clear my progress".

## 11. UI and accessibility

As in the original doc: calm, card-based layout; the 3D viewport or lab bench in the centre; inspector and notebook docked right; mechanism timeline docked along the bottom; light and dark themes; Inter with tabular numerals; design tokens in the Tailwind config; a Ctrl+K command palette over molecules, elements, labs, and the mechanism.

Accessibility target is WCAG 2.1 AA: full keyboard operation including lab tools and the timeline; colour never the only signal (every colour observation also has a text label); text descriptions of 3D scenes and reactions; a reduced-motion setting that follows the operating system.

Target screens: 1366×768 first, scaling up. Tablets fully supported. On phones, Explore and Learn work and labs are view-only.

An About page carries the PubChem/NLM acknowledgment and NCBI disclaimer, the NIST citations, and the statement of independence from any school.

## 12. Testing

- Vitest unit tests for every engine model and for the chem-data validator, written before the corresponding UI.
- The acceptance lists in sections 6.5, 7.4, 8.4, and 9.3 are the definition of done for each phase.
- UI is verified by running the app; no end-to-end framework in v1.

## 13. Build phases

1. **Foundation.** App shell, navigation, tokens, themes, progress storage, chem-data types and validator, seeded RNG, lint boundaries.
   - Done when: the validator rejects an unsourced value and an institution-specific string, and progress survives a reload.
2. **Explorer.** Section 6. Done when 6.5 passes.
3. **Titration lab.** Section 7. Done when 7.4 passes.
4. **Aqueous reactions lab.** Section 8. Done when 8.4 passes.
5. **Mechanism timeline.** Section 9. Done when 9.3 passes.

Each phase gets its own implementation plan.
