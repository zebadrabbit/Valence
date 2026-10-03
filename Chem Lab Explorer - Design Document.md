# Valence — Design Document

Oct 2, 2026 · @Panda

## Overview and goals

Valence is an independent, browser-based molecule explorer and virtual chemistry lab for self-directed learners. It recreates common general chemistry bench labs so anyone can perform them, understand the chemistry, and check their own results.

It is a personal learning project, not an official tool of any school. It contains no course numbers, institution names, or room and location data, and it has no connection to any school's systems or student records.

v1 commits to four things:

- A molecule explorer with element and bond inspection and a curated library.
- Two complete labs: standardization of a base by titration, and reactions in aqueous solution.
- A no-login guest mode, with optional accounts that only sync progress.
- One fully authored molecular mechanism timeline (HCl + NaHCO₃) proving the format.

Non-goals: integration with any school's learning platform, sign-in, or records; replacing bench labs; real molecular dynamics. Accuracy comes from curated data and validated models, not from simulating physics from first principles.

## Audiences and modes

The audience is anyone learning chemistry, from curious beginners to college students; the app never needs to know who they are or where they study.

| Who | How they arrive | Progress saved |
| --- | --- | --- |
| Guest | Direct link, no login | Browser only |
| Signed-in learner | Email link or Google | Account, synced across devices |

Learners pick one of two modes on each lab:

- **Guided:** hints and the engine's expected observations are shown up front.
- **Challenge:** expected observations stay hidden until you record your own, then your results are checked against the model.

The app has three top-level areas:

- **Explore:** the molecule viewer, inspector, and builder.
- **Lab:** the virtual bench labs.
- **Learn:** guided mechanism timelines that link the molecular view to what happens in the beaker.

A guest who later signs in keeps their browser progress; it merges into the new account.

## Platform and stack

The app is a TypeScript web app, so it runs on lab PCs and Chromebooks with nothing to install.

| Layer | Choice | Why |
| --- | --- | --- |
| Language and build | TypeScript, Vite | Type safety across data, engine, and UI |
| UI | React, Tailwind, shadcn/ui on Radix primitives | Accessible components with a clean, modern default look |
| 3D | Three.js via React Three Fiber | Instanced atoms and bonds; molecules are small scenes |
| Chemistry logic | RDKit.js (WASM) | SMILES parsing, valence, aromaticity, formal charge, 2D depictions |
| Backend | Supabase (existing local install for development) | Postgres, Auth, row-level security |
| Simulation | Pure TypeScript in Web Workers | Keeps the UI smooth; testable without a browser |
| Tests | Vitest | Unit tests for every model against textbook values |

**Hosting:** development runs against the local Supabase install. If public interest justifies it, production moves to Panda's own cloud server, running self-hosted Supabase and serving the static web app from the same machine. Until then the app can run guest-only, with no database at all.

Repository layout:

- `apps/web`: the React app.
- `packages/chem-data`: the reagent, molecule, and lab library, written independently and validated at build time.
- `packages/reaction-engine`: ion bookkeeping and reaction rules.
- `packages/sim-core`: the titration, gas, calorimetry, and distillation models, plus the pH solver.
- `packages/mechanisms`: authored mechanism timelines.
- `supabase/`: migrations, row-level security policies, and seed data.

Rules for Code:

- `sim-core` and `reaction-engine` never import React, Three.js, or the DOM.
- All randomness uses a seeded generator, so any student's lab can be reproduced exactly from its seed.
- Every chemistry model ships with tests before its UI is built.

## Data model

Labs are data. The app keeps its own reagent, molecule, and lab library in `packages/chem-data`, written independently and validated at build time.

Real-world lab documents can inform which reagents and concentrations a lab uses, but nothing is imported from them. The library never contains course numbers, institution names, rooms, cabinets, storage locations, or waste procedures.

No chemistry facts or observations are hand-written. Every reagent and product links to its PubChem record by CID; physical descriptions, hazards, and 3D structures are pulled from PubChem at build time and cached. Thermodynamic data comes from the NIST Chemistry WebBook and emission lines from the NIST Atomic Spectra Database. Every displayed value shows a link to its source.

**Reagent fields:**

- `formula`, `form` (solution or solid), `hydrate` and its molar mass. The prep recipes use hydrates (for example BaCl₂·2H₂O at 12.21 g per 100 mL), so this is required.
- `ions`: the ions released and their ratio.
- `appearance`: taken from the PubChem physical description, with a link to the record.
- `hazards`: GHS signal word, hazard statements, and pictograms from PubChem, shown wherever the reagent appears.
- Model data where needed: pKa values, heat capacity, Antoine coefficients.

**Station or reaction fields:**

- The two reagents, by library ID.
- `observationTools`: eye, waft, touch or thermometer, litmus, lit splint.

**Lab fields:** steps, stations, equipment, what learners record, questions, and answer checks.

Example entries:

```json
{
  "reagents": [
    { "id": "naoh-1m", "pubchemCid": 14798, "form": "solution", "molarity": 1.0 }
  ],
  "stations": [
    { "id": "aq-04", "reagents": ["bacl2-0.5m", "cuso4-0.5m"], "observationTools": ["eye"] }
  ]
}
```

## Molecule explorer and builder

The explorer shows any library molecule in 3D and explains every atom and bond on demand.

**Views:** ball-and-stick, space-filling (van der Waals radii), wireframe, and 2D Lewis. Double and triple bonds render as parallel cylinders.

**Atom inspector card** (on hover or select):

- Base layer: symbol, atomic number, mass, electronegativity, valence electrons, formal charge, oxidation state, hybridization, VSEPR geometry.
- Expanded layer: electron configuration, ionization energies, atomic and ionic radii.

**Bond inspector:** length, order, polarity (ΔEN), and σ/π composition.

**Measure tool:** click three atoms for a bond angle, four for a dihedral.

**Valence display levels**, matching the learner's level:

1. Bohr shells, with electrons as dots on rings.
2. Lewis dots and lone pairs.
3. Hybrid orbital lobes, and molecular orbital diagrams for diatomics such as O₂.

**Library:** about 30 molecules for v1, organized by topic: gen chem basics (H₂O, CO₂, NH₃, CH₄), a VSEPR showcase (SF₆, XeF₄, PCl₅), organic functional groups, and biomolecules (glucose, amino acids). 3D coordinates come from PubChem 3D SDF records, fetched once and bundled so the app works offline. Every molecule and element card links to its PubChem page.

**Builder:** students drag atoms into a workspace. Each atom shows its open valence slots, bonds snap only where valence allows, and formal charges update live. An energy meter uses average bond enthalpies: breaking costs energy, forming releases it. When the estimate disagrees with tabulated ΔH, both values are shown with a note on why averages differ.

## Reaction engine

Mixing is predicted by ion bookkeeping and a small rule set, not by scripting each reaction. That covers every scripted station and also gives correct results for combinations nobody planned.

**How a mix resolves:**

1. Tally the moles of every ion and solid present, from reagent volumes and concentrations.
2. Apply rules in order:
   - Solubility rules: insoluble ion pairs form a precipitate.
   - H⁺ with CO₃²⁻ or HCO₃⁻: forms CO₂ gas.
   - NH₄⁺ with OH⁻: forms NH₃ gas.
   - H⁺ with OH⁻: forms water and releases heat.
   - Metal with acid, by activity series: forms H₂ gas and the metal ion.
3. Respect the limiting reagent. Leftover ions keep their color, so excess Cu²⁺ stays blue over white BaSO₄.
4. No rule fires: report no reaction, and show only the blended reagent colors.

**Outputs per mix:** products and amounts, observable effects (precipitate, gas, temperature change, color), and the molecular, complete ionic, and net ionic equations. The equations double as the answer key for grading.

**Visuals** are generated from engine output: precipitate and product colors come from each product's PubChem physical description, and dissolved ion colors from a small fixed table (Cu²⁺ blue, Ni²⁺ green, Co²⁺ pink, Fe³⁺ yellow-orange).

**pH solver:** a charge-balance equation solved for \[H⁺\] by bisection. One solver handles strong, weak, polyprotic, and buffer systems with no special cases.

**Sources:** every observation the engine reports links to the PubChem records of the species involved, so learners can compare the simulation with real-world descriptions themselves.

## Lab simulations

All labs below are practical to simulate, extras included; only aspirin synthesis is reduced, to its chemistry and yield, because crystallization and filtration don't simulate meaningfully.

| Lab | What happens at the bench | What the sim models | Phase |
| --- | --- | --- | --- |
| Laboratory techniques | Measuring length, volume, and temperature; significant figures | Reading rulers, menisci, and thermometers to the right precision, with sig-fig checks | 2 |
| Density of liquids and solids | Mass and volume of unknown liquids and metals; water displacement | Balance and displacement readings; identifying unknowns by density | 3 |
| Standardization of a base | Titrating standardized HCl with NaOH to a phenolphthalein endpoint | Full lab, detailed below | 3 |
| Reactions in aqueous solution | Ten mixing stations, observations, net ionic equations | Full lab, detailed below | 4 |
| Identification of a compound by mass | An unknown carbonate or bicarbonate reacts with HCl; the salt left after evaporation is weighed | Mass ratios compared with the four possible compounds | 4 |
| Determination of a chemical formula | Aluminum displaces copper from copper(II) chloride; the copper is filtered and weighed | Blue color fading, copper deposit, mass of Cu to empirical formula | 4 |
| Calorimetry | Specific heat of unknown metals; heats of solution and neutralization | Heat exchange with a calorimeter constant; temperature-time curves | 7 |
| Molar mass of butane | Gas from a lighter collected over water | Dalton's law with water vapor correction, then PV = nRT | 7 |
| Molar mass of a volatile liquid | Dumas method: vaporize, condense, weigh | Vapor filling the flask at boiling temperature, then PV = nRT | 7 |
| Flame spectroscopy | Metal salts in a flame, viewed through a spectroscope | Flame color and emission line spectrum from reference data | 7 |
| Preparation of aspirin | Synthesis from salicylic acid and acetic anhydride | Reduced: mechanism timeline plus theoretical and percent yield | 7 |
| Le Chatelier's principle (cobalt chloride) | Adding HCl, water, or heat shifts a cobalt solution between pink and blue | Equilibrium shift on the pink and blue cobalt complexes, driven by concentration and temperature | 4 |
| Buffers (extra) | Make a buffer, then add acid and base | pH solver; buffer compared side by side with plain water | 7 |
| Beer's law (extra) | Absorbance of CuSO₄ standards, then an unknown | Absorbance from concentration; calibration line and unknown readout | 7 |
| Red cabbage indicator (extra) | A natural indicator across a pH range | pH solver mapped to indicator color | 7 |
| Hess's law (extra) | Heats of Mg and MgO with HCl combined to find a third | Calorimetry model plus enthalpy bookkeeping | 7 |
| Iodine clock (extra) | Clear solution snaps to blue-black after a delay | Small kinetics model: rate from concentration and temperature | 7 |
| Elephant toothpaste (extra) | Catalyzed hydrogen peroxide decomposition into foam | Same kinetics model, with gas output driving the foam | 7 |

Every lab opens with a short concept primer: the ideas, equations, and vocabulary it needs, written for someone with no chemistry background.

### Standardization of a basic solution (titration)

Students titrate a pipetted aliquot of standardized HCl with \~0.1 M NaOH to a phenolphthalein endpoint, then calculate the NaOH molarity.

**Seeded values:** each run's seed sets the HCl bottle label (for example 0.0954 M, at least 3 significant figures) and the hidden true NaOH concentration, between 0.095 and 0.105 M. The same seed always regenerates the same lab and its expected answer.

**Workflow:**

1. Select the HCl bottle and record its molarity.
2. Condition the burette with NaOH, fill it, clear the tip bubble, and read the initial volume.
3. Rinse the volumetric pipet with HCl, then pipet the aliquot using the pipet filler.
4. Add 2–3 drops of phenolphthalein.
5. Titrate to a faint pink lasting 30 seconds, then read the final volume.
6. Repeat for 3 trials; the notebook calculates average and relative deviation only after the student enters their values.

**Errors come from technique, never random noise:**

- Unconditioned burette: NaOH is diluted, the volume reads high, and the calculated molarity comes out low.
- Tip bubble left in: the initial reading is wrong.
- Meniscus misread: students type readings to 0.01 mL and are checked within ±0.02 mL.
- Overshoot: the flask turns dark pink and the trial is invalid.
- Distilled water added to the flask: no effect on the result, used as a misconception check.
- Optional: CO₂ absorption by NaOH, explaining why the base needs standardizing at all.

**Stopcock control:** closed, stream, dropwise (\~0.05 mL), and half-drop (\~0.025 mL). Each drop makes a local pink plume that fades as the student swirls. Near the endpoint the pink lingers longer. Color intensity is driven by the pH solver across phenolphthalein's 8.2–10 transition range.

### Reactions in an aqueous solution

Ten stations, each mixing two reagents and recording observations, then writing molecular, complete ionic, and net ionic equations.

| # | Reagents | Expected result (test case) | Observation tool |
| --- | --- | --- | --- |
| 1 | FeCl₃ 0.5 M + NaOH 1 M | Rust-brown gelatinous Fe(OH)₃ precipitate | Eye |
| 2 | Na₂CO₃ 0.5 M + CuSO₄ 0.5 M | Blue-green precipitate | Eye |
| 3 | Na₂CO₃ 0.5 M + NiCl₂ 0.5 M | Pale green NiCO₃ precipitate | Eye |
| 4 | BaCl₂ 0.5 M + CuSO₄ 0.5 M | White BaSO₄; liquid stays blue | Eye |
| 5 | CoCl₂ 0.5 M + FeCl₃ 0.5 M | No reaction; colors only blend | Eye |
| 6 | NH₄NO₃ 0.5 M + NaOH 1 M | Ammonia odor; red litmus turns blue | Waft, litmus |
| 7 | CaCO₃ (solid) + HCl 1 M | Fizzing; solid dissolves | Eye |
| 8 | HCl 6 M + NaOH 6 M | Nothing visible; tube gets hot | Touch or thermometer |
| 9 | CoCl₂ 0.5 M + AgNO₃ 0.1 or 0.5 M | White AgCl precipitate; pinkish liquid | Eye |
| 10 | Mg metal + HCl 3 M | H₂ bubbles; gas trapped under Parafilm pops with a lit splint | Lit splint |

Stations 5, 6, and 8 carry the key teaching moments. Station 5 is a no-reaction control, so the engine must not invent one. Station 6 teaches wafting: sniffing directly triggers a safety note. Station 8 is only detectable by temperature.

## Mechanism timeline

Mechanisms are authored choreography, not physics simulation, so one slider can scrub any reaction forward and backward exactly.

**The slider drives, in sync:** the 3D scene (bonds stretch, break, and form; electron pairs travel along curved paths), the energy diagram cursor, highlighting of active species in the equation, the explanation panel, and the camera. Students can take camera control at any time; it returns to auto-framing when released.

**Chapters:** each mechanism step is a labeled segment on the track. Each chapter has a deep link (for example `?step=proton-transfer`) so any step can be bookmarked or shared.

**Nonlinear time:** real steps span picoseconds to seconds, so the track is not to scale. Each chapter shows its real timescale as a label.

**Prediction pauses (Challenge mode):** optional stops before key steps ask "What happens next?" The student answers, then scrubs forward to check.

**Bookends:** every timeline starts at the beaker, zooms into the molecular view, and returns to the beaker at the end.

**Step record fields:** time range, bonds broken, bonds formed, electron paths, energy value, camera target, explanation text at `intro` and `expanded` depth, and an optional prediction question.

**First mechanism, HCl + NaHCO₃ → NaCl + H₂O + CO₂:**

1. Ionization: HCl transfers its proton to water, forming H₃O⁺ and hydrated Cl⁻.
2. Dissolving: NaHCO₃ separates into hydrated Na⁺ and HCO₃⁻.
3. Proton transfer: H₃O⁺ gives its proton to HCO₃⁻, forming H₂CO₃.
4. Decomposition: H₂CO₃ splits into H₂O and CO₂.
5. Gas escapes: CO₂ gathers into bubbles and leaves the solution; Na⁺ and Cl⁻ remain as unchanged spectators.

The energy panel notes that this reaction is slightly endothermic yet proceeds because escaping gas increases entropy, a lead-in to Gibbs free energy.

## Accounts

Accounts are optional and minimal: guests keep progress in their browser, and signing in only syncs it across devices.

- **Sign-in:** email magic link or Google, through Supabase Auth.
- **Merge:** on first sign-in, browser progress merges into the account.
- **Out of scope:** institutional sign-in, learning platform integration, rosters, classes, and grades. Any of these would make the app an official school tool subject to institutional review and oversight.

## Privacy and data handling

The app stores only what it takes to save a learner's progress, and nothing that ties anyone to a school, course, or student record.

- **Stored per account:** lab completions, recorded observations and readings, timeline position, and preferences.
- **Never stored:** school or course affiliation, real names beyond what the sign-in provider returns, and clickstream or behavioral analytics.
- **IDs:** random UUIDs from Supabase Auth; progress tables never hold emails.
- **Encryption:** TLS in transit; disk encryption at rest on the database host.
- **Row-level security:** every user reads and writes only their own rows.
- **Control:** users can export or delete their account and all progress from settings.

## UI/UX and visual design

The interface should feel immediately familiar to anyone used to modern learning platforms and campus portals: calm, clean, card-based, with the 3D work given the most space.

**Familiar patterns to borrow:**

- A collapsible left navigation rail for Explore, Lab, Learn, and Dashboard, like most learning platforms.
- A dashboard of cards for labs in progress and recent molecules, with clear status (not started, in progress, completed).
- Breadcrumbs and a predictable page header on every screen.

**Visual system:**

- Light, neutral surfaces with one accent color for primary actions; full dark mode, which matters for long 3D sessions.
- A clean sans-serif such as Inter, with tabular numerals for all measurements and readings.
- Generous spacing, soft 8 px corner radii, subtle shadows only on raised panels.
- Design tokens defined once in Tailwind config so the whole app can be re-themed later.

**Workspace layout:** the 3D viewport or lab bench fills the center. Inspector and notebook panels dock on the right. The mechanism timeline docks along the bottom. Panels collapse for a focused view.

**Interaction:** a Ctrl+K command palette searches molecules, elements, labs, and mechanisms. Every inspector uses progressive disclosure: a short base layer with an expand control for depth.

**Accessibility (WCAG 2.1 AA):**

- Full keyboard navigation, including lab tools and the timeline.
- Colorblind-safe element colors, always paired with text labels; color is never the only signal.
- Text descriptions of 3D scenes and reactions for screen readers.
- A reduced-motion setting that respects the operating system preference.

**Target screens:** designed for 1366×768 Chromebooks and lab PCs first, scaling up to large monitors. Tablets fully supported; phones support Explore and Learn, with labs shown as view-only.

## Build phases

Each phase ends with passing tests and a usable result; chemistry models are tested before their UI exists.

1. **Foundation.** Monorepo, design tokens, app shell with navigation, guest mode, Supabase schema with row-level security.
   - Done when: the library build validates every reagent and lab file and fails if any institution-specific data appears.
2. **Explorer.** 3D viewer, atom and bond inspectors, measure tool, 30-molecule library, laboratory techniques lab.
   - Done when: every library molecule loads offline and its inspector values match RDKit.
3. **Titration lab.** pH solver, burette and stopcock interaction, phenolphthalein plume, notebook, seeded bottles; density lab.
   - Done when: computed titration curves match textbook values within 0.05 pH units, and a seed always reproduces the same lab.
4. **Reaction engine and aqueous reactions lab.** Rules, observation tools, equation output; identification of a compound and chemical formula labs; Le Chatelier's principle with cobalt chloride.
   - Done when: all 10 stations match the expected results table in Lab simulations, including no reaction at station 5.
5. **Accounts.** Optional email or Google sign-in, guest progress merge, export and delete.
   - Done when: guest progress arrives intact in a new account, and account deletion removes every row.
6. **Mechanism timeline.** Scrubber, chapters, deep links, prediction pauses, HCl + NaHCO₃ timeline.
   - Done when: scrubbing backward and forward gives identical frames at every position.
7. **Gas, heat, and remaining labs.** In order: calorimetry; the gas pair (molar mass of butane, molar mass of a volatile liquid); flame spectroscopy; aspirin; the molecule builder. Then the extras: buffers, Beer's law, red cabbage indicator, Hess's law, iodine clock, and elephant toothpaste. Optional afterward: an ideal gas sandbox and distillation.

## Open questions

None right now. Settled: the app is named Valence.
