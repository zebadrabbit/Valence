# Phase 3 design: the titration engine and its data

Key: `engine`. 2026-10-04. Design for planning, not app code. Nothing tracked was changed.

Everything quoted as a number in this file was produced by the prototype in `proto/` and is pasted from `out/`. The prototype is the design below, written out and run: 101 Vitest tests pass under Vitest 5.0.3 on Node 24.21, it type-checks under the app's strict options, and every engine file passes the repository's ESLint config when linted as a file in `src/engine/`.

## 0. Read this first

**The model holds.** Ported to a state machine with whole-number volumes, the spike's result stands: for seeds 1 to 100 at 2 and at 3 drops, a careful run is colourless at every addition before equivalence, the pink persists 11.21 to 36.33 µL past the flask's equivalence volume, and no run is overshot. At the corners of the seeded ranges the excess titrant needed is 9.644 to 12.239 µL (limit 25), which reproduces the spike's 0.0116 and 0.0123 mL. Over every flask a learner can make (either dilution error, 2 or 3 drops, up to 30 mL of water) it is 9.599 to 16.274 µL.

**Seven things change or settle the spec** (exact wording in section 7):

1. K_w cannot cite IAPWS R11-24 for 1.0×10⁻¹⁴. That release prints pK_w 13.99 at 25 °C, on the molal scale. Cite OpenStax 14.1, which prints 1.0 × 10⁻¹⁴, and name IAPWS as the reference value it rounds.
2. The hidden NaOH concentration is drawn on a 0.00001 M grid and the pipette offset on a 0.001 mL grid. Then grading and overshoot are exact whole-number comparisons, and the molarity shown on completion is exactly the one graded against.
3. An unconditioned burette stays 2.0% dilute through refills, until the learner conditions it. Mixing arithmetic at a refill would leave trial 2 at 0.83% to 1.14% dilute, which straddles the 1.0% grading line.
4. A wet pipette dilutes only the first aliquot drawn with it: drawing that aliquot wets the pipette with acid.
5. The learner types the molarity. It is accepted only when it follows from their own notebook (HCl molarity × 25.00 ÷ titre) to the fourth decimal place, in both modes, and it can be entered once per trial.
6. The final reading can be recorded only after a swirl and wait has shown the pink to last. So a finished trial always has an endpoint, and the spec's three trial states are complete.
7. Distilled water is capped at three 10 mL washes per trial. The endpoint test holds to 30 mL whether or not the wash water carries dissolved CO₂; at 50 mL with CO₂ it fails (26.3 µL).

**One improvement on the spike:** the plume value is the share of the acid still in the flask that the whole addition neutralised, not only its last drop. It is one division, it has a physical meaning, and in the stream it first shows "pink fades slowly" on the addition that leaves 2.0 to 2.25 mL to go (eight or nine more additions before overshoot) instead of 0.2 to 0.45 mL (one or two).

**The owner must decide** six things, listed in section 8: whether the signed percent error may reveal the answer; which GHS classification the HCl bottle carries; the wording of the three hazard notes; which indicator product the 0.5% strength cites; whether titrating without indicator is blocked or allowed; and whether the refill and pipette rules of points 3 and 4 are acceptable chemistry.

## 1. File layout

```
docs/research/phase-3/
  titration.json            authored input: constants with the source's printed text, parameters with rationale,
                            the indicator bottle, the two reagent records
  sources/MANIFEST.json     every source read, its URL, retrieval date, sha256 and what it prints
  sources/README.md         attribution for the two Wikipedia copies (CC BY-SA), as in periodic-table/sources/
  sources/                  kept copies: noaa-co2-annmean-gl.txt, pubchem-*.json (4), wikipedia-*.json (2)
                            NOT kept (copyright): the Tamura PDF, the IAPWS PDF, the NIST and OpenStax pages

scripts/build-chem-data.mjs       + buildTitration(): reads the two files above, checks them, writes the outputs below

src/chem-data/
  titration.json            written by the build: constants, parameters, indicator
  reagents.json             written by the build: hydrochloric acid and sodium hydroxide
  sources.json              + 9 sources (section 2.4)
  titration.ts              titrationSchema, TitrationData, titrationData (parsed once)
  titration.test.ts
  schema.ts                 export hazardsSchema (it exists, unexported); nothing else changes
  registry.ts               reagents: [] becomes the imported reagents.json
  validate.ts               + validateTitration(input, sources, options)
  citations.ts              + titrationCitations(data, sources)

src/engine/
  ph.ts                     the pH solver                                   ph.test.ts
  titration/
    model.ts                TitrationModel, modelFrom(data)                 model.test.ts
    setup.ts                labSetup, trialSetup: what the seed fixes       setup.test.ts
    flask.ts                flask chemistry, equivalence, plume             flask.test.ts   <- the phase's first test
    state.ts                titrationStateSchema, TitrationState, createLab
    entries.ts              parsing and judging what the learner types      entries.test.ts
    actions.ts              Action, can, warnings, reduce                   actions.test.ts
    select.ts               selectors for everything the UI shows           select.test.ts
    testkit.ts              scripted learners, for tests only
    acceptance.test.ts      spec 7.4 through the state machine
```

Dependencies run one way: `engine/titration` imports the type `TitrationData` from `chem-data`; `chem-data` imports nothing from `engine`; neither imports `app`. The engine takes its numbers as an argument (`m: TitrationModel`), so a test can vary one. `app/` builds the model once with `modelFrom(titrationData)`.

Two differences between the prototype and this layout, both mechanical: in the prototype `modelFrom` is called `titrationModel` and sits in `proto/titrationData.ts`; and the prototype's `model.test.ts` holds what becomes `chem-data/titration.test.ts` plus `setup.test.ts`.

## 2. Data

### 2.1 `src/chem-data/titration.json`

The file as the prototype runs it (`proto/titration.json`, shown here one entry to a line):

```json
{
  "indicator": {
    "name": "Phenolphthalein indicator, 0.5% in ethanol and water", "formula": "C20H14O4", "pubchemCid": 4764,
    "hazards": {
      "signalWord": "Danger",
      "statements": ["H341: Suspected of causing genetic defects", "H350: May cause cancer", "H361f: Suspected of damaging fertility"],
      "note": "This lab uses two or three drops of a 0.5% solution in ethanol and water. The solution is flammable. Keep it off the skin and wash your hands after the lab.",
      "sourceId": "pubchem-cid-4764"
    }
  },
  "constants": {
    "waterIonProduct": {"value": 1e-14, "unit": "", "sourceId": "openstax-chem2e-14.1", "note": "Printed as 1.0 × 10⁻¹⁴ at 25 °C. IAPWS R11-24 (Table 3) prints pKw 13.99 at 25 °C on the molal scale."},
    "indicatorPKas": [
      {"value": 9.05, "published": "9.05", "unit": "", "sourceId": "tamura-1996"},
      {"value": 9.5, "published": "9.50", "unit": "", "sourceId": "tamura-1996"}
    ],
    "indicatorMolarMass": {"value": 318.3, "published": "318.3", "unit": "g/mol", "sourceId": "pubchem-cid-4764"},
    "indicatorStrength": {"value": 0.5, "published": "0.5", "unit": "g per 100 mL", "sourceId": "ricca-5600"},
    "indicatorDropVolume": {"value": 0.05, "published": "0.05", "unit": "mL", "sourceId": "drop-unit-wikipedia"},
    "henryCo2": {"value": 0.034, "published": "0.034", "unit": "mol/(kg·bar)", "sourceId": "nist-webbook-co2-henry"},
    "atmosphericCo2": {"value": 425.62, "published": "425.62", "unit": "ppm", "year": 2025, "sourceId": "noaa-gml-co2-annmean-gl"},
    "carbonicPKas": [
      {"value": 6.35, "published": "6.35", "unit": "", "sourceId": "perrin-1982-wikipedia"},
      {"value": 10.33, "published": "10.33", "unit": "", "sourceId": "perrin-1982-wikipedia"}
    ]
  },
  "parameters": {
    "faintPinkConcentration": {"value": 1e-06, "rationale": "mol/L of the pink form at which the mixed flask counts as faintly pink. The only tuned number in the model."},
    "fullPinkConcentration": {"value": 3e-05, "rationale": "mol/L of the pink form at which the flask is drawn at full depth: about all of two drops of indicator in 50 mL. Drawing only."},
    "airPressureBar": {"value": 1.01325, "rationale": "One standard atmosphere, which is 101 325 Pa by definition."},
    "hclRangeE4": {"value": [850, 1050], "rationale": "Label of the HCl bottle, in units of 0.0001 mol/L (spec 7.1)."},
    "naohRangeE5": {"value": [9500, 10500], "rationale": "Hidden NaOH concentration, in units of 0.00001 mol/L (spec 7.1), so the value shown on completion is exactly the value graded against."},
    "pipetteNominalUl": {"value": 25000, "rationale": "A 25.00 mL transfer pipette."},
    "pipetteOffsetUl": {"value": 30, "rationale": "Delivery varies by up to this much either way: the tolerance of a Class A 25 mL pipette (spec 7.1)."},
    "fillLevelMaxUl": {"value": 2000, "rationale": "A filled burette starts between the 0.00 and 2.00 mL marks (spec 7.1)."},
    "buretteCapacityUl": {"value": 50000, "rationale": "A 50 mL burette; delivery stops at the 50.00 mL mark."},
    "streamUl": {"value": 250, "rationale": "One timed addition with the stopcock open."},
    "dropUl": {"value": 50, "rationale": "One drop of titrant from the burette tip (spec 7.2)."},
    "halfDropUl": {"value": 25, "rationale": "A half-drop touched off the tip (spec 7.2)."},
    "unconditionedStrengthPercent": {"value": 98, "rationale": "Titrant in a burette that was not rinsed with it is 2.0% dilute, exaggerated so the error fails on its own (spec 7.3). Held until the burette is conditioned; a real burette dilutes less with each refill."},
    "wetPipetteStrengthPercent": {"value": 98, "rationale": "The first aliquot drawn with a pipette still wet with water is 2.0% dilute, exaggerated (spec 7.3)."},
    "tipBubbleUl": {"value": 600, "rationale": "Air in the burette tip after a fill from empty, exaggerated (spec 7.3)."},
    "tipBubbleEscapeUl": {"value": 5000, "rationale": "The bubble leaves evenly over this much delivered titrant (spec 7.3)."},
    "overshootUl": {"value": 100, "rationale": "Two drops past the flask's own equivalence volume makes the trial invalid (spec 7.3)."},
    "slowDownUl": {"value": 1000, "rationale": "Guided mode's hint appears this close to equivalence (spec 7.2)."},
    "readingToleranceUl": {"value": 20, "rationale": "A burette graduated every 0.1 mL is read by eye to about 0.02 mL (spec 7.3)."},
    "gradeTolerancePercent": {"value": 1, "rationale": "A trial passes within 1.0% of the true NaOH concentration (spec 7.3)."},
    "molarityRoundingE6": {"value": 50, "rationale": "A calculated molarity follows from the notebook when it agrees to the fourth decimal place."},
    "waterStepUl": {"value": 10000, "rationale": "One wash of the flask walls with distilled water (spec 7.3)."},
    "waterMaxUl": {"value": 30000, "rationale": "Three washes: the most water the flask takes in one trial. The endpoint test holds to here even if the wash water carried dissolved CO2."},
    "indicatorDrops": {"value": [2, 3], "rationale": "The procedure calls for 2 to 3 drops (spec 7.2)."},
    "plumeSlowFrom": {"value": 0.1, "rationale": "An addition that neutralises a tenth or more of the acid left fades slowly. Presentation only."},
    "plumeMixSeconds": {"value": 10, "rationale": "Swirling mixes the whole flask in about this long. Presentation only."},
    "persistSeconds": {"value": 30, "rationale": "An endpoint is a pink that lasts 30 seconds of swirling."},
    "passesToComplete": {"value": 3, "rationale": "Three passing trials complete the lab (spec 7.3)."}
  }
}
```

A constant is `{ value, published?, unit, note?, sourceId }`. `published` is the text the source prints, present when that text is a plain decimal equal to the stored number (the existing `checkPublished` rule). K_w has none, because its source prints "1.0 × 10⁻¹⁴"; its `note` says what is printed. A parameter is `{ value, rationale }`, the spec's shape. Derived numbers are not stored: the indicator's molarity (0.5 g per 100 mL ÷ 318.3 g/mol = 1.5708×10⁻² mol/L) and the dissolved CO₂ (0.034 × 425.62×10⁻⁶ × 1.01325 = 1.4663×10⁻⁵ mol/L, a kilogram of water taken as a litre) are worked out by `modelFrom`.

The delivery and tip-bubble parameters hold the model to a grid, and a test pins it: every delivery is a whole number of half-drops, and the tip bubble leaves 3 µL per 25 µL delivered, so the meniscus is the same whatever mix of additions delivered a volume.

### 2.2 `src/chem-data/reagents.json`

Valid against the repository's unchanged `reagentSchema` (checked: `out/data-check.txt`):

```json
[
  {
    "id": "hydrochloric-acid-0.1m",
    "name": "Hydrochloric acid, about 0.1 M",
    "formula": "HCl",
    "pubchemCid": 313,
    "form": "solution",
    "molarity": 0.1,
    "ions": [],
    "hazards": {
      "signalWord": "Danger",
      "statements": [
        "H314: Causes severe skin burns and eye damage",
        "H335: May cause respiratory irritation"
      ],
      "note": "This lab uses a dilute solution, about 0.1 mol/L. It can still irritate the eyes and skin: wear eye protection and rinse a splash with plenty of water.",
      "sourceId": "pubchem-cid-313"
    },
    "sourceId": "pubchem-cid-313"
  },
  {
    "id": "sodium-hydroxide-0.1m",
    "name": "Sodium hydroxide solution, about 0.1 M",
    "formula": "NaOH",
    "pubchemCid": 14798,
    "form": "solution",
    "molarity": 0.1,
    "ions": [],
    "hazards": {
      "signalWord": "Danger",
      "statements": [
        "H314: Causes severe skin burns and eye damage"
      ],
      "note": "This lab uses a dilute solution, about 0.1 mol/L. It can still irritate the eyes and skin: wear eye protection and rinse a splash with plenty of water.",
      "sourceId": "pubchem-cid-14798"
    },
    "sourceId": "pubchem-cid-14798"
  }
]
```

- `molarity: 0.1` is the nominal strength. The HCl label is seeded (0.0850 to 0.1050 M) and the NaOH value is hidden; both ranges are parameters in `titration.json`.
- `ions` is empty. Nothing in phase 3 reads it: the 1:1 reaction is built into the flask model. Phase 4 adds the species list and fills it. The alternative, four species records now (H⁺, Cl⁻, Na⁺, OH⁻), needs a source for each that nobody has chosen yet.
- The indicator is not a reagent record. It has a strength in percent, no ions, and pK values, none of which fit `reagentSchema`. Its bottle card data sits in `titration.json` under `indicator`, with the same hazards shape. The bottle card component takes `{ name, formula, hazards }`, which both shapes supply.
- Distilled water has no record: it carries no chemistry value and no hazard.

### 2.3 Schema additions

```ts
// src/chem-data/schema.ts: one change
export const hazardsSchema = z.strictObject({ signalWord: z.enum(['Danger', 'Warning', 'None']), statements: z.array(text), note: text, sourceId: id })

// src/chem-data/titration.ts
/** A cited number: the text the source prints for it where that is a plain decimal, its unit, and a caveat. */
const constant = z.strictObject({ value: z.number(), published: text.optional(), unit: z.string(), note: text.optional(), sourceId: id })
const count = z.number().int().min(0)
const range = z.tuple([count, count])

export const titrationSchema = z.strictObject({
  /** The indicator bottle: what its card shows. Its chemistry is under `constants`. */
  indicator: z.strictObject({ name: text, formula: text, pubchemCid: z.number().int().positive(), hazards: hazardsSchema }),
  constants: z.strictObject({
    waterIonProduct: constant,
    indicatorPKas: z.array(constant).min(1),
    indicatorMolarMass: constant,
    indicatorStrength: constant,
    indicatorDropVolume: constant,
    henryCo2: constant,
    atmosphericCo2: constant.extend({ year: z.number().int() }),
    carbonicPKas: z.array(constant).min(1),
  }),
  parameters: z.strictObject({ /* one param(...) per key of 2.1, as in proto/titrationData.ts */ }),
})
export type TitrationData = z.infer<typeof titrationSchema>
export const titrationData: TitrationData   // titrationSchema.parse(the JSON), once

// src/chem-data/validate.ts, on the pattern of validatePeriodicTable
/** Schema, known source ids, `published` equal to its value, and no institution text in notes, rationales and hazard text. */
export function validateTitration(input: unknown, sources: readonly Source[], options?: ValidateOptions): string[]

// src/chem-data/citations.ts
/** What the lab's "Sources" control lists: each constant and each bottle's hazards under its source. */
export function titrationCitations(data: TitrationData, reagents: readonly Reagent[], sources: readonly Source[]): Citation[]
```

The schema keeps to zod features `schema.ts` already uses (`strictObject`, `enum`, `tuple`, `array().min`, `int().min`, `positive`, `optional`, `nullable`, `extend`), because that file warns that new ones grow the preloaded chunk. `titration.json` is its own file outside the registry, like the periodic table, so only the lab's chunk loads it.

### 2.4 Sources, as fetched on 2026-10-04

`sources/MANIFEST.json` in this folder is the proposed manifest, with the sha256 of each copy. What each source prints:

| Constant | Stored | What the source prints | Source id and citation |
| --- | --- | --- | --- |
| Phenolphthalein pK₁, pK₂ | 9.05, 9.50 | Abstract: "only PP²⁻ was red, where pK₁=9.05, and pK₂=9.50". Page 929: "the values of pK₁ and pK₂ were estimated to be 9.05 and 9.50, respectively". Measured in 0.2 M phosphate buffers at 25±2 °C. It also gives pK₃ = 12 for the slow fading in strong base, which the model leaves out | `tamura-1996`: Tamura, Z.; Abe, S.; Ito, K.; Maeda, M. *Anal. Sci.* **1996**, *12* (6), 927–930. doi 10.2116/analsci.12.927. Read as the publisher's PDF. The DOI now resolves to Springer, which did not serve the article to a script; the J-STAGE path `/article/analsci1985/12/6/12_6_927/_pdf` did (the `/analsci/` path returns an error page) |
| K_w | 1.0×10⁻¹⁴ | OpenStax: "at 25 °C, K_w has a value of 1.0 × 10⁻¹⁴". IAPWS R11-24, Table 3, row p_sat, 25 °C: 13.99, with "the molal standard state for the ionic species" | `openstax-chem2e-14.1` (the id pattern the repository already uses). IAPWS is named in the constant's `note`, not as a source id |
| Henry's constant, CO₂ | 0.034 mol/(kg·bar) | "Henry's law constant for solubility in water at 298.15 K (mol/(kg*bar))". Seventeen rows: 0.034 eleven times, 0.035 three times, 0.045, 0.032, 0.031 once each. Every row's Reference cell reads "N/A" today | `nist-webbook-co2-henry`: NIST Chemistry WebBook, SRD 69, Carbon dioxide, Henry's Law data, compiled by R. Sander |
| Atmospheric CO₂ | 425.62 ppm, year 2025 | "2025   425.62     0.05", "mole fraction in dry air", "File Creation: Sat Sep  5 03:55:32 2026", and "the data presented for the last year are subject to change" | `noaa-gml-co2-annmean-gl`: NOAA Global Monitoring Laboratory, global annual mean |
| Carbonic acid pK_a1, pK_a2 | 6.35, 10.33 | Infobox: "pK_a1 = 3.75 (25 °C; anhydrous)", "pK_a1 = 6.35 (hydrous)", "pK_a2 = 10.33", each cited to Perrin 1982. 6.35 is the apparent constant for dissolved CO₂, the species the model holds | `perrin-1982-wikipedia`: Perrin, D. D., Ed. *Ionisation Constants of Inorganic Acids and Bases in Aqueous Solution*, 2nd ed.; Pergamon, 1982. Not read; taken from Wikipedia, Carbonic acid, revision 1376246456 |
| Phenolphthalein molar mass | 318.3 g/mol | `"MolecularWeight": "318.3"`, `"MolecularFormula": "C20H14O4"` | `pubchem-cid-4764` |
| Drop volume | 0.05 mL | "Pharmacists have since moved to metric measurements, with a drop being rounded to exactly 0.05 mL (50 μL, that is, 20 drops per milliliter)." | `drop-unit-wikipedia`: Wikipedia, Drop (unit), revision 1314848686 |
| Indicator strength | 0.5 g per 100 mL | **Not read.** Every catalogue page tried refused a script (section 9) | `ricca-5600` is a placeholder; the owner chooses (section 8) |
| HCl hazards | Danger; H314, H335 | PubChem CID 313 carries two candidate entries. Safe Work Australia, "hydrochloric acid": H314 "Causes severe skin burns and eye damage", H335 "May cause respiratory irritation". EU CLP, "hydrogen chloride" (the gas): H314, H331 "Toxic if inhaled" | `pubchem-cid-313` |
| NaOH hazards | Danger; H314 | EU CLP, "sodium hydroxide; caustic soda": H314 | `pubchem-cid-14798` |
| Phenolphthalein hazards | Danger; H341, H350, H361f | EU CLP, "phenolphthalein": H341 "Suspected of causing genetic defects", H350 "May cause cancer", "H361f ***: Suspected of damaging fertility" | `pubchem-cid-4764` |

The 96 prose strings this design stores (names, statements, notes, rationales) pass the repository's own `findInstitutionText`.

### 2.5 Build script

`buildTitration(otherSourceIds)` follows `buildPeriodicTable`: read the authored input and the manifest, fail on anything unexpected, return `{ titration, reagents, sources }`, and `main()` writes nothing until everything is built. It checks, against the kept copies:

- the NOAA file has a row for the stored year whose mean is the stored value;
- PubChem's `MolecularWeight` for CID 4764 is the stored molar mass;
- each stored hazard statement and signal word is in the saved PubChem record, under the reference the input names;
- each Wikipedia copy is the revision the citation names and contains the stored figure;
- every `published` is a plain decimal equal to its value, and every source id exists.

The values read from PDFs and pages that are not kept (Tamura, OpenStax, NIST) are checked by a person against the manifest's `prints` text; the build can only check that the manifest has an entry for them.

## 3. Interfaces

Copied from the prototype, bodies removed.

### 3.1 `src/engine/ph.ts`

```ts
/** One acid-base system: every protonation state of one substance. */
export interface AcidSpecies {
  /** Total (analytical) concentration over all its protonation states, mol/L. */
  total: number
  /** Successive pKa values, most acidic first. A strong acid or base is not listed here: see `strongCharge`. */
  pKas: readonly number[]
  /** Charge of the fully protonated form: 0 for HA, H2A, H3A; +1 for NH4+. */
  chargeProtonated: number
}

export interface Solution {
  /** Sum of charge x concentration over ions that never take or give a proton (Na+ counts +, Cl- counts -), mol/L. */
  strongCharge: number
  acids: readonly AcidSpecies[]
}

/** Fraction of a species in each protonation state at hydrogen-ion concentration `h`; index k is the form that has lost k protons. */
export function protonationFractions(pKas: readonly number[], h: number): number[]
/** Net charge of the solution at a trial pH, mol/L: zero at the true pH, and falling as pH rises. */
export function chargeImbalance(solution: Solution, kw: number, pH: number): number
/** Ideal-solution pH (no activity corrections) by bisection on the charge balance: pH -2 to 16, 60 steps. */
export function solvePH(solution: Solution, kw: number): number
```

That is all phase 7 needs for a buffer: a weak acid with its salt is one `AcidSpecies` whose `total` is acid plus salt, with the salt's sodium in `strongCharge`; ammonia is `{ pKas: [9.25], chargeProtonated: 1 }`. The prototype checks both (0.10 M NH₄Cl 5.1250, 0.10 M NH₃ 11.1221). Nothing else is exported. Inside, the acid constants are worked out once per solve and the charge sum builds no arrays, which took one flask solve from 65 µs to 15 µs. That matters only to the test suite, whose seed loops solve constantly; it runs in about 13 seconds.

### 3.2 `src/engine/titration/model.ts`

```ts
export interface TitrationModel {
  // cited constants
  kw: number
  indicatorPKas: readonly number[]
  /** mol/L of the indicator solution: 10 x grams per 100 mL / molar mass. */
  indicatorMolarity: number
  indicatorDropUl: number
  /** mol/L of dissolved CO2 in water at equilibrium with air: Henry's constant x mole fraction x pressure. */
  dissolvedCo2: number
  carbonicPKas: readonly number[]
  // model parameters, one per key of titration.json's `parameters` except airPressureBar
  faintPinkConcentration: number
  fullPinkConcentration: number
  hclRangeE4: readonly [number, number]
  naohRangeE5: readonly [number, number]
  pipetteNominalUl: number
  pipetteOffsetUl: number
  fillLevelMaxUl: number
  buretteCapacityUl: number
  streamUl: number
  dropUl: number
  halfDropUl: number
  unconditionedStrengthPercent: number
  wetPipetteStrengthPercent: number
  tipBubbleUl: number
  tipBubbleEscapeUl: number
  overshootUl: number
  slowDownUl: number
  readingToleranceUl: number
  gradeTolerancePercent: number
  molarityRoundingE6: number
  waterStepUl: number
  waterMaxUl: number
  indicatorDrops: readonly [number, number]
  plumeSlowFrom: number
  plumeMixSeconds: number
  persistSeconds: number
  passesToComplete: number
}

/** The plain numbers the engine runs on. The two derived concentrations are worked out here, not stored. */
export function modelFrom(data: TitrationData): TitrationModel
```

### 3.3 `src/engine/titration/setup.ts`

```ts
export interface LabSetup {
  /** HCl molarity x 10 000: the label, and the true value. */
  hclE4: number
  /** True NaOH molarity x 100 000, hidden until the lab is completed. */
  naohE5: number
}
export interface TrialSetup {
  /** What the pipette delivers this trial, in microlitres. */
  aliquotUl: number
  /** The meniscus after a fill this trial, in microlitres below the 0.00 mark. */
  fillLevelUl: number
}
export function labSetup(m: TitrationModel, seed: number): LabSetup
export function trialSetup(m: TitrationModel, seed: number, index: number): TrialSetup
```

### 3.4 `src/engine/titration/flask.ts`

```ts
/** What is in the flask and the burette. Volumes are whole microlitres; concentrations are whole numbers of their unit. */
export interface Flask {
  hclE4: number
  aliquotUl: number
  /** 100, or less when the pipette was wet with water. */
  aliquotPercent: number
  naohE5: number
  /** 100, or less when the burette was not conditioned. */
  titrantPercent: number
  indicatorDrops: number
  waterUl: number
  deliveredUl: number
}

/** The flask's own equivalence volume: the acid actually in it over the concentration actually in the burette. Not shown to the learner. */
export function equivalenceUl(f: Flask): number
/** -1 before `offsetUl` past equivalence, 0 exactly there, 1 beyond. Exact: whole-number arithmetic. */
export function compareToEquivalence(f: Flask, offsetUl?: number): number
export const isOvershot: (m: TitrationModel, f: Flask) => boolean

export interface FlaskChemistry {
  pH: number
  /** mol/L of the pink (doubly deprotonated) form in the fully mixed flask. */
  pinkConcentration: number
  indicatorConcentration: number
  volumeUl: number
}
export function flaskChemistry(m: TitrationModel, f: Flask): FlaskChemistry
/** True when the fully mixed flask is at least faintly pink. */
export const isPink: (m: TitrationModel, f: Flask) => boolean

export type PlumeStatus = 'fades-at-once' | 'fades-slowly' | 'persists'
export interface Plume {
  /** The share of the acid still in the flask that the last addition neutralised: 0 to 1, and 1 at or past equivalence. */
  fraction: number
  status: PlumeStatus
  /** Simulated seconds of swirling until the plume is gone; null when the pink persists. */
  fadeSeconds: number | null
}
/** The plume of the last addition (`addedUl` of the flask's `deliveredUl`). */
export function plume(m: TitrationModel, f: Flask, addedUl: number): Plume
```

`pH` is returned for the tests; no selector passes it on, so the UI cannot show it (spec 3).

### 3.5 `src/engine/titration/state.ts`

The stored shape and the type are one definition, so they cannot drift. This is the whole record saved under `lab:titration`.

```ts
const count = z.number().int().min(0)

const trialSchema = z.strictObject({
  /** 0 for the first trial. With the seed it fixes this trial's pipette delivery and fill level. */
  index: count,
  /** What the pipette put in the flask: nothing yet, a clean aliquot, or one diluted by a wet pipette. */
  aliquot: z.enum(['none', 'clean', 'diluted']),
  indicatorDrops: count,
  waterUl: count,
  /** Whether the titrant run into this flask was diluted by an unconditioned burette. */
  titrantDiluted: z.boolean(),
  /** The true meniscus when the initial reading was taken, and the reading the learner typed; microlitres. */
  startLevelUl: count.nullable(),
  initialReadingUl: count.nullable(),
  /** Titrant actually run into the flask. */
  deliveredUl: count,
  /** Size of the last addition, for the plume; 0 before the first. */
  lastAdditionUl: count,
  /** Simulated seconds of swirling since the flask last changed. */
  waitedS: count,
  endLevelUl: count.nullable(),
  finalReadingUl: count.nullable(),
  /** The HCl molarity in the notebook when the molarity was checked, and the molarity the learner typed; x 1 000 000. */
  hclUsedE6: count.nullable(),
  molarityE6: count.nullable(),
  end: z.enum(['open', 'graded', 'overshot', 'ran-out']),
})

export const titrationStateSchema = z.strictObject({
  seed: count,
  mode: z.enum(['guided', 'challenge']),
  /** Read by the home page (peekStatus). */
  status: z.enum(['in-progress', 'completed']),
  hclSelected: z.boolean(),
  /** The HCl molarity as the learner typed it, x 1 000 000. */
  hclRecordedE6: count.nullable(),
  /** False while the pipette is still wet with water. */
  pipetteRinsed: z.boolean(),
  burette: z.strictObject({
    conditioned: z.boolean(),
    filled: z.boolean(),
    /** The titrant in it is dilute: it was filled without conditioning, and has not been conditioned since. */
    diluted: z.boolean(),
    /** The true meniscus, microlitres below the 0.00 mark. */
    levelUl: count,
    /** Air still in the tip. */
    tipAirUl: count,
  }),
  /** Every trial in order; the last one is the current trial. */
  trials: z.array(trialSchema).min(1),
  /** The learner's own average (x 1 000 000) and relative deviation (hundredths of a part per thousand). */
  summary: z.strictObject({ meanE6: count, deviationE2: count }).nullable(),
})

export type Trial = z.infer<typeof trialSchema>
export type TitrationState = z.infer<typeof titrationStateSchema>
export type Mode = TitrationState['mode']

/** A lab that has just been started. `seed` comes from app/, which draws it. */
export function createLab(seed: number, mode: Mode): TitrationState
export const currentTrial: (state: TitrationState) => Trial
```

What is stored and what is not:

- Stored: the seed, what the learner did, and what the learner typed. All whole numbers, booleans and short strings; no floats, so `JSON.stringify` then `parse` gives back the same value.
- Not stored: anything the seed fixes (the label, the NaOH concentration, the pipette delivery, the fill level) and anything judged (pass or fail, percent error, causes, plume). These are worked out on reading. So a stored record cannot disagree with its seed, and trial N's values cannot depend on earlier trials: they are a function of `(seed, N)` and nothing else.
- A finished trial is the same shape as the current one; the notebook, including the read-only notebook on a narrow screen, is `state.trials` through `trialOutcome`.
- Any change to this shape, or to a value in `titration.json`, needs the titration entry's version in `activities.ts` raised, because judgments are worked out from the model on reading.

The export file ("export my progress") holds the seed, from which the hidden NaOH concentration follows for anyone who reads the source. It is a learning tool; that is accepted.

### 3.6 `src/engine/titration/actions.ts`

```ts
export type Action =
  | { type: 'setMode'; mode: Mode }
  | { type: 'selectHcl' }
  | { type: 'recordHclMolarity'; molarityE6: number }
  | { type: 'conditionBurette' }
  | { type: 'fillBurette' }                      // the first fill and every refill
  | { type: 'clearTipBubble' }
  | { type: 'rinsePipette' }
  | { type: 'pipetteAliquot' }
  | { type: 'addIndicatorDrop' }
  | { type: 'addWater' }
  | { type: 'recordInitialReading'; readingUl: number }
  | { type: 'deliver'; amount: 'stream' | 'drop' | 'half' }
  | { type: 'swirlAndWait' }
  | { type: 'recordFinalReading'; readingUl: number }
  | { type: 'submitMolarity'; molarityE6: number }   // grades and closes the trial
  | { type: 'startNextTrial' }
  | { type: 'recordSummary'; meanE6: number; deviationE2: number }
  | { type: 'restart'; seed: number }

/** Why an action cannot be done now. The UI disables the control and shows the reason. */
export type Blocked =
  | 'lab-completed' | 'lab-not-completed' | 'trial-ended' | 'trial-open' | 'already-done'
  | 'hcl-not-selected' | 'mid-titration' | 'burette-empty' | 'burette-at-bottom' | 'no-tip-bubble'
  | 'flask-empty' | 'flask-has-aliquot' | 'indicator-full' | 'water-full'
  | 'needs-indicator' | 'needs-initial-reading' | 'endpoint-not-confirmed' | 'needs-final-reading' | 'needs-hcl-molarity'
  | 'invalid-entry' | 'not-the-label' | 'reread' | 'final-not-after-initial' | 'calculation-mismatch'

/** A technique step about to be skipped. Guided mode asks before going on; Challenge mode does not look. */
export type Warning = 'burette-not-conditioned' | 'tip-bubble' | 'pipette-not-rinsed'

/** null when the action can be done now. */
export function can(m: TitrationModel, state: TitrationState, action: Action): Blocked | null
/** The technique steps this action would skip. Empty when there are none, or when the action is blocked anyway. */
export function warnings(m: TitrationModel, state: TitrationState, action: Action): Warning[]
/** The state after an action. An action that cannot be done now returns the very same state object. */
export function reduce(m: TitrationModel, state: TitrationState, action: Action): TitrationState

/** The current trial's flask and burette as the chemistry sees them. */
export function flaskOf(m: TitrationModel, state: TitrationState, trial?: Trial): Flask
/** True once a swirl-and-wait has shown the pink to last. */
export const endpointConfirmed: (m: TitrationModel, state: TitrationState) => boolean
/** Trials that have passed. */
export const passedTrials: (m: TitrationModel, state: TitrationState) => Trial[]
```

How `app/` uses it: `can` for every control's disabled state and reason; in Guided mode, `warnings` before dispatching, with a confirm dialog when it is not empty; `next = reduce(m, state, action)`, and save when `next !== state`. In the stream the app dispatches `deliver stream` on its timer and saves when the stopcock closes (spec 10). `restart` takes the new seed from `app/`, which draws it; the engine never makes one.

"Reading the burette" is not an action. Opening the magnified meniscus is view state with nothing to save. The readings are `recordInitialReading` and `recordFinalReading`.

### 3.7 `src/engine/titration/entries.ts`

```ts
/** A burette reading typed to 0.01 mL ("12.34"), in microlitres; null when it is not written that way. */
export function parseReading(text: string): number | null
/** A molarity below 1 typed with four to six decimal places ("0.0987"), x 1 000 000; null otherwise. */
export function parseMolarity(text: string): number | null
/** A relative deviation in parts per thousand with up to two decimals ("1.3"), in hundredths; null otherwise. */
export function parseDeviation(text: string): number | null
/** Signed percent error of a typed molarity against the true one. For display. */
export const percentError: (molarityE6: number, naohE5: number) => number
/** Within the grading tolerance of the true molarity, the edge included. Exact. */
export const withinTolerance: (m: TitrationModel, molarityE6: number, naohE5: number) => boolean
/** True when the typed molarity is the notebook's HCl molarity x 25.00 mL / titre, to the fourth decimal place. Exact. */
export const followsFromNotebook: (m: TitrationModel, molarityE6: number, hclE6: number, titreUl: number) => boolean
/** The mean of the molarities, and their mean absolute deviation over the mean in parts per thousand. */
export function summarise(molaritiesE6: readonly number[]): { meanE6: number; deviationPpt: number }
```

### 3.8 `src/engine/titration/select.ts`

```ts
/** The label on the HCl bottle ("0.0976"), once the bottle has been chosen. */
export const hclLabel: (m: TitrationModel, state: TitrationState) => string | null

export interface BuretteView {
  filled: boolean
  /** The true meniscus in microlitres below the 0.00 mark: what is drawn, never printed. */
  levelUl: number
  tipBubble: boolean
  atBottom: boolean
}
export const buretteView: (m: TitrationModel, state: TitrationState) => BuretteView

/** The text alternative to the meniscus (spec 11): the two graduations around it and roughly where it sits, not the reading. */
export interface MeniscusPosition {
  upperMarkUl: number
  lowerMarkUl: number
  position: 'on-the-mark' | 'just-below-the-upper-mark' | 'about-halfway' | 'just-above-the-lower-mark'
}
export function meniscusPosition(levelUl: number): MeniscusPosition

export interface FlaskView {
  hasAliquot: boolean
  indicatorDrops: number
  waterUl: number
  /** Depth of the mixed flask's pink, 0 to 1: concentration of the pink form over fullPinkConcentration. */
  pinkDepth: number
  /** Drawn dark pink and labelled "overshot" from this flag, not from the colour model. */
  overshot: boolean
  /** The last addition's plume; null before the first addition of a trial. */
  plume: Plume | null
  /** What the last swirl-and-wait showed. */
  persistence: 'unchecked' | 'faded' | 'persisted'
}
export function flaskView(m: TitrationModel, state: TitrationState): FlaskView

/** Guided mode's hint: within 1.00 mL of the flask's own equivalence volume, and not yet pink. Always false in Challenge. */
export function slowDownHint(m: TitrationModel, state: TitrationState): boolean

export type Cause = 'burette-not-conditioned' | 'tip-bubble' | 'pipette-not-rinsed' | 'initial-misread' | 'final-misread' | 'hcl-label-misrecorded'
export type TrialOutcome =
  | { state: 'open' }
  | { state: 'invalid'; reason: 'overshot' | 'ran-out' }
  | { state: 'passed' | 'failed'; percentError: number; causes: Cause[] }
/** A trial's state for the notebook: its signed percent error and the named causes, never the expected value. */
export function trialOutcome(m: TitrationModel, state: TitrationState, trial: Trial): TrialOutcome

/** The true NaOH molarity ("0.09502"), null until the lab is completed. */
export const trueNaoh: (m: TitrationModel, state: TitrationState) => string | null

export interface SummaryView {
  mean: number
  deviationPpt: number
  learnerMean: number
  learnerDeviationPpt: number
  meanMatches: boolean
  deviationMatches: boolean
}
/** Average and relative deviation of the passing trials: null until the lab is completed and the learner has entered their own. */
export function summaryView(m: TitrationModel, state: TitrationState): SummaryView | null

export type Step = 'hcl' | 'condition' | 'fill' | 'tip-bubble' | 'initial-reading' | 'rinse-pipette' | 'aliquot' | 'indicator' | 'titrate' | 'final-reading' | 'molarity'
/** Guided mode's checklist for the current trial. Conditioning, the tip bubble and the pipette rinse are first-trial steps. */
export function checklist(m: TitrationModel, state: TitrationState): { step: Step; done: boolean }[]
```

The selectors give the UI no way to show the equivalence volume, the pH, or the NaOH concentration before completion. All wording (status lines, reasons, causes, steps) is the UI's; the engine hands over identifiers.

### 3.9 `src/engine/titration/testkit.ts`

```ts
export const honestReading: (levelUl: number) => number                // the true meniscus to the nearest 0.01 mL
export const calculatedMolarityE6: (m: TitrationModel, hclE6: number, titreUl: number) => number
export interface Technique { mode?: Mode; condition?: boolean; clearBubble?: boolean; rinse?: boolean; drops?: number; washes?: number; fill?: boolean }
export interface Addition { amount: 'stream' | 'drop' | 'half'; deliveredUl: number; side: number; pinkConcentration: number }

/** Scripted learners. `through` is applied to the state after every action: the resume test passes a round trip through storage. */
export function learner(through?: (state: TitrationState) => TitrationState): {
  run(m, state, actions: readonly Action[]): TitrationState            // throws on a blocked action
  readyTrial(m, state, t?: Technique): TitrationState                  // the current trial, up to an openable stopcock
  prepared(m, seed, t?: Technique): TitrationState                     // a new lab, up to an openable stopcock; careful unless told otherwise
  titrateCarefully(m, state): { state: TitrationState; additions: Addition[] }   // the careful run of spec 7.4
  finishHonestly(m, state): TitrationState                             // honest final reading, molarity from the notebook
  carefulTrial(m, state): TitrationState
}
export const { run, readyTrial, prepared, titrateCarefully, finishHonestly, carefulTrial } = learner()
```

## 4. Behaviour

### 4.1 What the seed fixes

One `mulberry32(seed)` stream, read in a fixed order: draw 1 is the HCl label, draw 2 the NaOH concentration, then two draws per trial (pipette, fill level). Each draw becomes a whole number, every value in its range equally likely, by `lo + floor(u × (hi − lo + 1))`:

| Value | Whole number | Range | Count |
| --- | --- | --- | --- |
| HCl label | `hclE4`, units of 0.0001 M | 850 to 1050 | 201 |
| NaOH, hidden | `naohE5`, units of 0.00001 M | 9500 to 10500 | 1001 |
| Pipette delivery, per trial | `aliquotUl` | 24 970 to 25 030 | 61 |
| Fill level, per trial | `fillLevelUl` | 0 to 2000 | 2001 |

`trialSetup(seed, N)` skips 2 + 2N draws and reads two. It takes no state, so it cannot depend on what the learner did; an invalid trial that is repeated is simply trial N+1 with its own two draws. A `fillBurette` in trial N always sets the meniscus to trial N's fill level, however many times it is done.

Seed 1: HCl 0.0976 M, NaOH 0.09502 M; trials 1 to 3 deliver 25.002, 25.029, 25.007 mL and fill to 1.963, 0.562, 1.442 mL. The equivalence volume is 20.214 to 27.665 mL over the box.

### 4.2 Every action: when it can be done, and what it does

A blocked action is one with nothing sensible to model; the control is disabled and says why, in both modes. A technique step can be skipped in both modes; Guided asks first.

| Action | Blocked when | Effect |
| --- | --- | --- |
| `selectHcl` | already chosen | The bottle is on the bench; its label can be read |
| `recordHclMolarity` | bottle not chosen; **Guided:** the number is not the label's (`not-the-label`) | Stored as typed. Can be re-entered until the lab is completed; each graded trial keeps the value it used |
| `conditionBurette` | titration under way | The burette is rinsed with NaOH and left empty: not dilute, air in the tip again at the next fill. The initial reading is cleared |
| `fillBurette` | titration under way | Meniscus set to this trial's fill level. From empty: a 0.60 mL tip bubble, and the contents are dilute if the burette was never conditioned. A top-up leaves the contents as dilute as they were and makes no bubble. The initial reading is cleared |
| `clearTipBubble` | burette empty; no bubble; titration under way | Titrant takes the air's place: the meniscus falls by the air left (0.60 mL). The initial reading is cleared |
| `rinsePipette` | bottle not chosen; already rinsed | The pipette is no longer wet with water |
| `pipetteAliquot` | bottle not chosen; flask already has an aliquot | The trial's delivery goes into the flask, 2.0% dilute if the pipette was wet. Either way the pipette is now wet with acid |
| `addIndicatorDrop` | flask empty; titration under way; already 3 drops | One more drop |
| `addWater` | flask empty; already 30 mL | 10 mL more. The wait is reset and the final reading cleared |
| `recordInitialReading` | burette empty; titration under way; not a reading on the 0.01 mL grid from 0.00 to 50.00; **Guided:** more than 0.02 mL from the meniscus (`reread`) | The typed reading and the true meniscus are stored |
| `deliver` | burette empty; flask empty; fewer than 2 drops of indicator; no initial reading; meniscus at 50.00 | 0.250, 0.050 or 0.025 mL, or what is left above the 50.00 mark. The wait is reset and the final reading cleared. Ends the trial as overshot or ran out when that applies |
| `swirlAndWait` | flask empty | 30 simulated seconds pass |
| `recordFinalReading` | no swirl and wait has shown the pink to last at this volume; not on the grid; not past the initial reading; **Guided:** `reread` | The typed reading and the true meniscus are stored |
| `submitMolarity` | no final reading; no HCl molarity in the notebook; does not follow from the notebook (`calculation-mismatch`) | The trial is graded and closed. At the third pass the lab is completed |
| `startNextTrial` | current trial still open; lab completed | A new trial with the next index. The burette, the pipette and the notebook carry over |
| `recordSummary` | lab not completed | The learner's own average and relative deviation are stored; the app's then show |
| `setMode`, `restart` | never | The mode changes at once and applies to what is typed from then on; `restart` is `createLab(seed, mode)` |

Once the lab is completed every action except `setMode`, `recordSummary` and `restart` is blocked.

One rule covers stale numbers: **a reading is cleared when the level it describes changes, and the wait is reset when the flask changes.** So filling or clearing the bubble after an initial reading asks for a new one, and more titrant or water after a final reading asks for a new wait and a new reading. This holds in both modes; it is a small kindness in Challenge, taken because the alternative is a second copy of each level in the state.

The questions the brief asks:

| The learner | Guided | Challenge |
| --- | --- | --- |
| Fills without conditioning | Warned before the fill; may go on | Silent |
| Reads the burette with the tip bubble still there | Warned before the reading; may go on | Silent |
| Pipettes without rinsing | Warned before pipetting; may go on | Silent |
| ...and then, in each of those three | The consequence of 4.3 follows and the cause is named after the trial | The same |
| Types a reading more than 0.02 mL off | Re-read asked; nothing is recorded; no direction is given | Recorded as typed, carried into the titre, named after the trial |
| Types the HCl molarity wrongly | Asked again; nothing is recorded | Recorded as typed, carried into the molarity, named after the trial |
| Types a molarity that does not follow from the notebook | Asked again | Asked again |
| Opens the stopcock with no aliquot, fewer than 2 drops of indicator, or no initial reading | Blocked | Blocked |
| Adds a fourth drop of indicator, or indicator mid-titration | Blocked | Blocked |
| Tries to record the final reading before the pink has been shown to last | Blocked | Blocked |
| Starts a second trial without refilling | The checklist shows the refill as not done | Nothing |
| ...and then | A flask that needs more than is left runs out and the trial is invalid; one that does not is an ordinary trial | The same |
| Refills, conditions or clears the bubble mid-titration | Blocked | Blocked |
| Adds water | Allowed, up to 30 mL; never named as a cause | The same |

Requiring 2 or 3 drops before the stopcock opens means the set of flasks a learner can reach is exactly the set the tests cover.

### 4.3 Technique errors

**Unconditioned burette.** The titrant is 98% of its strength from a fill-from-empty of a burette that was never conditioned, and stays so through every top-up, until `conditionBurette`. The flask's equivalence volume is acid ÷ (0.98 × NaOH), so the careful endpoint comes about 0.5 mL later and is not overshot. Molarity −1.86% to −2.17%.

Real titrant in a wet burette is diluted less at each refill. The prototype computed what honest mixing would give: after trial 1 the remainder, topped up, is 0.83% to 1.14% dilute over seeds 1 to 100. A trial 2 at that strength passes for some seeds and fails for others, which is what the spec's "fails grading on its own at every seed" rules out. Holding the full 2.0% is the same kind of exaggeration as the 2.0% itself, and the rationale stored with the parameter says so.

**Tip bubble.** A fill from empty leaves 600 µL of air in the tip. If it is not cleared, it leaves evenly over the first 5000 µL delivered: for every 25 µL that reaches the flask the meniscus falls 28 µL. After 5.000 mL delivered the burette shows 5.600 mL gone, and from then on the two move together. The flask is unaffected, so the equivalence volume and the endpoint are the true ones; the recorded titre is 0.60 mL too large. Molarity −2.15% to −2.87%.

The air leaves once. A bubble that escaped in trial 1 is gone in trial 2 (seed 1: trial 1 fails at −2.336% with the cause named; trial 2 passes at −0.232%). A refill does not bring it back; conditioning does, because it empties the burette. Clearing the bubble lowers the meniscus by the same 0.60 mL, before the initial reading instead of after it.

**Pipette not rinsed.** The first aliquot drawn with a pipette still wet with water is 98% of its strength; it is the same volume and carries the same CO₂. The equivalence volume is 2% smaller, the careful endpoint comes about 0.5 mL sooner, and is not overshot. Molarity +1.91% to +2.22%. Drawing that aliquot wets the pipette with acid, so trial 2 is clean without a rinse (seed 1: +1.873%, then −0.232%).

**Meniscus misread.** Whole-number comparison: off when `|typed − true| > 20` µL. With the meniscus at 2.563 mL, Guided accepts 2.55 to 2.58 and asks again for 2.54 and 2.59.

**Distilled water.** Changes the flask's volume and nothing else. The equivalence volume is identical to the last bit (the test compares with `toBe`). The careful endpoint is unmoved in most runs and one half-drop later in 10, 24 and 36 of 200 runs for 10, 20 and 30 mL. No run changes between pass and fail; none is overshot; water is never a cause.

### 4.4 Equivalence, trial states, grading

Everything near equivalence is judged in whole numbers. With `acid = 10 × hclE4 × aliquotPercent × aliquotUl` and `perUl = naohE5 × titrantPercent`, a delivered volume is past equivalence by more than `x` µL exactly when `(delivered − x) × perUl > acid`. The largest product is about 5×10¹⁰, far inside exact integer range. Overshoot (`x = 100`), "before equivalence" (`x = 0`) and the slow-down hint (`x = −1000`) all use it, each on the flask's own acid and the burette's own titrant.

Only one judgment uses floating point: whether the mixed flask's pink concentration has reached `faintPinkConcentration`. Over all additions of the 200 careful runs, the closest the concentration comes to the threshold is 1% of it (`|pink ÷ threshold − 1| ≥ 0.0099`), so the last bits of a `Math.pow` cannot decide a result there.

Trial states:

- **Overshot** the moment the delivered volume is more than 100 µL past equivalence. The trial ends there. Seed 1: 94 µL past is still open, 119 µL past is overshot.
- **Ran out** when the meniscus reaches 50.000 mL and the flask is not pink. An addition delivers only what is left above the mark. If the flask is pink at exactly 50.00 the trial stays open and can be finished.
- **Graded** when a molarity is accepted: **passed** when `|typedE6 − trueE6| × 100 ≤ 1 × trueE6`, else **failed**. Whole numbers, edge included: against 0.10000 M, 0.1010 passes and 0.101001 fails, where `0.101 / 0.1 − 1` in floating point is 0.010000000000000009 and would fail.

The learner types the molarity, because working it out is the point of a standardization. It is accepted when it follows from their own notebook: `|typedE6 × titre − hclE6 × 25000| ≤ 50 × titre`, which is agreement to the fourth decimal place and allows more decimals. That check uses only numbers the learner typed, so it reveals nothing, and it applies in both modes: an arithmetic slip is asked again, not turned into a repeat of the whole titration. Rounding to four decimals costs at most 0.053%.

Any valid trial with honest technique passes. Over the whole seeded box, with the endpoint up to 0.10 mL late, both readings off by up to 0.02 mL the wrong way and the molarity rounded to four decimals, the error is −0.853% to +0.366%. Careful trials for seeds 1 to 100, three per lab, at 2 and 3 drops: 600 of 600 pass, −0.316% to +0.087%, and all 200 labs complete in three trials.

**Average and relative deviation** are shown once the lab is completed and the learner has typed their own two numbers. They are computed over the three passing trials' typed molarities: mean, then mean absolute deviation ÷ mean × 1000. Each of the learner's numbers is marked as matching or not (the mean to the fourth decimal, the deviation to 0.05 parts per thousand). Nothing is graded. Seed 1, careful: 0.0949, 0.0948, 0.0949 gives mean 0.09487 and 0.47 parts per thousand.

### 4.5 Plume and swirl-and-wait

`fraction = min(1, addition ÷ titrant still needed before the addition)`, and 1 at or past equivalence. In words: the share of the acid left in the flask that this addition neutralised, which is also the share of the flask that must mix into the plume before its pink goes.

- `persists` when the mixed flask is at or above the threshold (the endpoint test itself);
- otherwise `fades-slowly` when `fraction ≥ 0.10`, else `fades-at-once`;
- `fadeSeconds = fraction × 10`, null when it persists.

Where each setting first shows "fades slowly": the stream (0.25 mL) with up to 2.5 mL to go, a drop with up to 0.5 mL, a half-drop with up to 0.25 mL. Along a careful run it never steps back within one stopcock setting and says "persists" only at the endpoint, in 200 of 200 runs. It does step back when the learner changes to a smaller addition, which is true to the flask: a smaller addition makes a smaller plume.

The spike's formula counted only the last drop of an addition. Both formulas let a scripted learner who streams until "fades slowly" and then goes dropwise finish 100 of 100 seeds validly. The difference is warning time in the stream, by arithmetic on the two formulas: the whole-addition value first turns to "fades slowly" on the addition that leaves 2.0 to 2.25 mL to go, eight or nine further additions before overshoot; the last-drop value on the one that leaves 0.2 to 0.45 mL, one or two.

**Simulated time.** `waitedS` counts seconds of swirling since the flask last changed. `swirlAndWait` adds 30; an addition or water sets it to 0. `persistence` is `unchecked` below 30 s, then `persisted` or `faded` by the same threshold test. Nothing in the engine reads a clock. The model's flask is closed, so nothing changes during the wait: the action is the learner's check, and it is what unlocks the final reading. The UI may animate the fade over `fadeSeconds`; under reduced motion it shows only the status.

### 4.6 Display values

`pinkDepth = min(1, pink concentration ÷ 3×10⁻⁵ M)`. A careful endpoint is 1.0×10⁻⁶ to 1.3×10⁻⁵ M, so it is drawn at 0.03 to 0.43 of full depth; seed 1's is 0.117. The overshot look comes from the `overshot` flag.

`meniscusPosition` gives the marks either side and one of three positions (thirds), or "on the mark". A test shows that reading a third as x.x2, a half as x.x5 and two thirds as x.x8 is within 0.02 mL of every level, so a learner using the text alternative can pass Guided's check without the app ever stating the reading.

## 5. Test cases and expected values

All of these ran. The test files in `proto/` are written to be moved into the app as they are, with imports changed.

### 5.1 Vitest: 101 tests, 7 files, all passing

```
 ✓ ph.test.ts > solvePH > 0.0100 M HCl
 ✓ ph.test.ts > solvePH > 1e-8 M HCl
 ✓ ph.test.ts > solvePH > 0.10 M acetic acid
 ✓ ph.test.ts > solvePH > 0.10 M acetic acid with 0.10 M sodium acetate
 ✓ ph.test.ts > solvePH > 0.10 M H3PO4
 ✓ ph.test.ts > solvePH > 0.10 M NH4Cl
 ✓ ph.test.ts > solvePH > 0.10 M NH3
 ✓ ph.test.ts > solvePH > pure water
 ✓ ph.test.ts > solvePH > gives the spec 7.4 values to two decimals
 ✓ ph.test.ts > solvePH > takes Kw as an argument
 ✓ ph.test.ts > solvePH > leaves no charge at the pH it returns, and the imbalance falls as pH rises
 ✓ ph.test.ts > protonationFractions > sums to 1 and is half and half at pH = pKa
 ✓ titration/model.test.ts > titration data > gives the two derived concentrations
 ✓ titration/model.test.ts > titration data > names the year of the CO2 value
 ✓ titration/model.test.ts > titration data > rejects a parameter without a rationale and a constant without a source
 ✓ titration/model.test.ts > titration data > keeps every volume on the half-drop grid
 ✓ titration/model.test.ts > seeded values > pins seed 1, seed 2 and the largest seed
 ✓ titration/model.test.ts > seeded values > stays inside the ranges of spec 7.1 and reaches both ends of each
 ✓ titration/model.test.ts > seeded values > keeps the equivalence volume between 20.21 and 27.67 mL at the corners
 ✓ titration/flask.test.ts > equivalence, in whole numbers > gives the flask's own equivalence volume
 ✓ titration/flask.test.ts > equivalence, in whole numbers > compares a delivered volume with it exactly
 ✓ titration/flask.test.ts > endpoint acceptance (spec 7.4), flask chemistry only > seeds 1-100 at 2 drops: colourless before equivalence, pink within 0.05 mL after it, not overshot
 ✓ titration/flask.test.ts > endpoint acceptance (spec 7.4), flask chemistry only > seeds 1-100 at 3 drops: colourless before equivalence, pink within 0.05 mL after it, not overshot
 ✓ titration/flask.test.ts > endpoint acceptance (spec 7.4), flask chemistry only > is nowhere near the threshold at any addition, so the last bit of a floating-point number cannot change a result
 ✓ titration/flask.test.ts > endpoint acceptance (spec 7.4), flask chemistry only > pins the flask of seed 1 around its equivalence volume
 ✓ titration/flask.test.ts > endpoint acceptance (spec 7.4), flask chemistry only > more indicator gives a deeper pink at the same excess
 ✓ titration/entries.test.ts > typed entries > reads a burette reading typed to 0.01 mL, and nothing else
 ✓ titration/entries.test.ts > typed entries > reads a molarity typed with four to six decimals
 ✓ titration/entries.test.ts > typed entries > reads a relative deviation in parts per thousand
 ✓ titration/entries.test.ts > grading > passes at +0.9% and fails at +1.1%
 ✓ titration/entries.test.ts > grading > includes the edge, exactly
 ✓ titration/entries.test.ts > grading > gives the signed percent error
 ✓ titration/entries.test.ts > grading > accepts a molarity that follows from the notebook to the fourth decimal place
 ✓ titration/entries.test.ts > summarise > gives the mean and the mean absolute deviation over the mean, in parts per thousand
 ✓ titration/actions.test.ts > a new lab > is plain data that passes its own schema
 ✓ titration/actions.test.ts > what cannot be done yet > { type: 'recordHclMolarity', …(1) } is blocked: hcl-not-selected
 ✓ titration/actions.test.ts > what cannot be done yet > { type: 'rinsePipette' } is blocked: hcl-not-selected
 ✓ titration/actions.test.ts > what cannot be done yet > { type: 'pipetteAliquot' } is blocked: hcl-not-selected
 ✓ titration/actions.test.ts > what cannot be done yet > { type: 'clearTipBubble' } is blocked: burette-empty
 ✓ titration/actions.test.ts > what cannot be done yet > { type: 'recordInitialReading', …(1) } is blocked: burette-empty
 ✓ titration/actions.test.ts > what cannot be done yet > { type: 'deliver', amount: 'drop' } is blocked: burette-empty
 ✓ titration/actions.test.ts > what cannot be done yet > { type: 'addIndicatorDrop' } is blocked: flask-empty
 ✓ titration/actions.test.ts > what cannot be done yet > { type: 'addWater' } is blocked: flask-empty
 ✓ titration/actions.test.ts > what cannot be done yet > { type: 'swirlAndWait' } is blocked: flask-empty
 ✓ titration/actions.test.ts > what cannot be done yet > { type: 'recordFinalReading', …(1) } is blocked: endpoint-not-confirmed
 ✓ titration/actions.test.ts > what cannot be done yet > { type: 'submitMolarity', …(1) } is blocked: needs-final-reading
 ✓ titration/actions.test.ts > what cannot be done yet > { type: 'startNextTrial' } is blocked: trial-open
 ✓ titration/actions.test.ts > what cannot be done yet > { type: 'recordSummary', …(2) } is blocked: lab-not-completed
 ✓ titration/actions.test.ts > what cannot be done yet > needs an aliquot, two drops of indicator and an initial reading before the stopcock opens
 ✓ titration/actions.test.ts > what cannot be done yet > keeps burette preparation and indicator out of a titration that has started
 ✓ titration/actions.test.ts > what cannot be done yet > takes three washes of water and no more
 ✓ titration/actions.test.ts > skipped technique steps > warns before each, and only then
 ✓ titration/actions.test.ts > skipped technique steps > an unconditioned burette stays dilute through a refill, until it is conditioned
 ✓ titration/actions.test.ts > skipped technique steps > a wet pipette dilutes only the first aliquot drawn with it
 ✓ titration/actions.test.ts > the tip bubble > appears at a fill from empty and takes 0.60 mL of the meniscus when cleared
 ✓ titration/actions.test.ts > the tip bubble > left alone, leaves over the first 5 mL delivered: the meniscus falls 3 uL more for every 25 uL delivered
 ✓ titration/actions.test.ts > the tip bubble > gives the same meniscus whatever mix of additions delivered the volume
 ✓ titration/actions.test.ts > the tip bubble > does not come back at a refill
 ✓ titration/actions.test.ts > readings and the two modes > Guided asks for a re-read when a reading is more than 0.02 mL from the meniscus
 ✓ titration/actions.test.ts > readings and the two modes > Challenge takes the reading as typed
 ✓ titration/actions.test.ts > readings and the two modes > both refuse a reading that is not on the 0.01 mL grid or not on the burette
 ✓ titration/actions.test.ts > readings and the two modes > Guided checks the HCl molarity against the label; Challenge takes it as typed
 ✓ titration/actions.test.ts > readings and the two modes > a final reading needs a confirmed endpoint and must be past the initial reading
 ✓ titration/actions.test.ts > readings and the two modes > in both modes the molarity must follow from the notebook; then the trial is graded and closed
 ✓ titration/actions.test.ts > how a trial ends > is overshot as soon as the delivered volume is more than 0.10 mL past the flask's own equivalence volume
 ✓ titration/actions.test.ts > how a trial ends > runs out at the 50.00 mL mark when the burette was not refilled
 ✓ titration/actions.test.ts > how a trial ends > delivers only what is left above the 50.00 mL mark
 ✓ titration/actions.test.ts > how a trial ends > completes the lab at the third passing trial, and not before
 ✓ titration/actions.test.ts > how a trial ends > does not count a failed or an invalid trial
 ✓ titration/actions.test.ts > how a trial ends > restart gives a new lab with the new seed and the same mode
 ✓ titration/actions.test.ts > finishHonestly > is what the pinned trial of seed 1 looks like
 ✓ titration/select.test.ts > what the UI shows > shows the HCl label once the bottle is chosen, and the true NaOH molarity only on completion
 ✓ titration/select.test.ts > what the UI shows > describes the meniscus by the marks around it and a rough position, not the reading
 ✓ titration/select.test.ts > what the UI shows > lets a reading be made from that description within the tolerance: third of the way, halfway, two thirds
 ✓ titration/select.test.ts > what the UI shows > shows the burette and the flask
 ✓ titration/select.test.ts > what the UI shows > Guided hints to slow down within 1.00 mL of equivalence; Challenge never does
 ✓ titration/select.test.ts > what the UI shows > uses the flask's own equivalence volume for the hint
 ✓ titration/select.test.ts > what the UI shows > gives each trial its state, its signed percent error and the named causes
 ✓ titration/select.test.ts > what the UI shows > shows average and relative deviation only after the learner has entered their own
 ✓ titration/select.test.ts > what the UI shows > lists the steps of the first trial and of a later one
 ✓ titration/acceptance.test.ts > titration curve, HCl and NaOH only > is within 0.01 pH of the closed form more than 0.5 mL from equivalence
 ✓ titration/acceptance.test.ts > titration curve, HCl and NaOH only > crosses pH 7.00 within 0.01 mL of the stoichiometric volume
 ✓ titration/acceptance.test.ts > endpoint, seeds 1-100 at 2 and 3 drops > 2 drops: colourless before equivalence, persistent within 0.05 mL after it, never overshot
 ✓ titration/acceptance.test.ts > endpoint, seeds 1-100 at 2 and 3 drops > 3 drops: colourless before equivalence, persistent within 0.05 mL after it, never overshot
 ✓ titration/acceptance.test.ts > endpoint, seeds 1-100 at 2 and 3 drops > pins seed 1
 ✓ titration/acceptance.test.ts > endpoint, whatever the grid offset > needs more than 0 and at most 0.025 mL at every corner of the seeded ranges
 ✓ titration/acceptance.test.ts > endpoint, whatever the grid offset > holds for every flask a learner can make: either technique error, and up to 30 mL of water
 ✓ titration/acceptance.test.ts > a careful lab > passes every trial and completes in three, for seeds 1-100
 ✓ titration/acceptance.test.ts > technique errors, each alone, seeds 1-100 > an unconditioned burette moves the molarity the stated way by more than 1.5%, fails, is named, and is not overshot
 ✓ titration/acceptance.test.ts > technique errors, each alone, seeds 1-100 > a tip bubble not cleared moves the molarity the stated way by more than 1.5%, fails, is named, and is not overshot
 ✓ titration/acceptance.test.ts > technique errors, each alone, seeds 1-100 > a pipette not rinsed moves the molarity the stated way by more than 1.5%, fails, is named, and is not overshot
 ✓ titration/acceptance.test.ts > distilled water > 1 washes of 10 mL: same equivalence volume, endpoint at most one half-drop later, same pass or fail
 ✓ titration/acceptance.test.ts > distilled water > 2 washes of 10 mL: same equivalence volume, endpoint at most one half-drop later, same pass or fail
 ✓ titration/acceptance.test.ts > distilled water > 3 washes of 10 mL: same equivalence volume, endpoint at most one half-drop later, same pass or fail
 ✓ titration/acceptance.test.ts > reproducibility > the same seed and the same actions give identical states
 ✓ titration/acceptance.test.ts > reproducibility > a later trial does not depend on what was done in earlier ones
 ✓ titration/acceptance.test.ts > save and resume > reloading after every single action gives the same lab as never reloading
 ✓ titration/acceptance.test.ts > save and resume > resumes mid-trial at the saved delivered volume
 ✓ titration/acceptance.test.ts > save and resume > rejects a stored state of another shape
 ✓ titration/acceptance.test.ts > plume > is the share of the remaining acid that the addition neutralised (seed 1)
 ✓ titration/acceptance.test.ts > plume > says "persists" only at the endpoint of a careful run, and never steps back within one stopcock setting

Test Files  7 passed (7)
Tests  101 passed (101)
```

### 5.2 Expected values, by file

**`ph.test.ts`** (K_w 1.0×10⁻¹⁴; acetic pK_a 4.756; phosphoric 2.148, 7.198, 12.375; ammonium 9.25). Reference values from `proto/independent_ph.py`: each case as its own polynomial in [H⁺], Newton's method, 60-digit decimals, standard library only. Solver within 10⁻⁶ of each.

| Case | Expected pH | Spec 7.4 |
| --- | --- | --- |
| 0.0100 M HCl | 2.000000 | 2.00 |
| 1×10⁻⁸ M HCl | 6.978294 | 6.98 |
| 0.10 M acetic acid | 2.880876 | 2.87–2.88 |
| 0.10 M acetic acid with 0.10 M sodium acetate | 4.756152 | the pinned pK_a |
| 0.10 M H₃PO₄ | 1.631739 | about 1.63 |
| 0.10 M NH₄Cl | 5.124978 | (charge +1 form) |
| 0.10 M NH₃ | 11.122104 | (charge +1 form) |
| pure water; pure water with K_w 10⁻¹³ | 7.000000; 6.5000 | |
| phenolphthalein fractions at pH 9.00 | 0.4602, 0.4101, 0.1297 | |

**`titration.test.ts` and `setup.test.ts`**

- indicator molarity `1.5708e-2`; dissolved CO₂ `1.4663e-5`; indicator drop 50 µL; CO₂ year 2025.
- a parameter without `rationale` and a constant without `sourceId` fail the schema.
- grid: `dropUl % halfDropUl`, `streamUl % halfDropUl`, `(halfDropUl × tipBubbleUl) % tipBubbleEscapeUl`, `tipBubbleEscapeUl % halfDropUl`, `waterMaxUl % waterStepUl` are all 0.
- `labSetup(1)` = `{ hclE4: 976, naohE5: 9502 }`; `trialSetup(1, 0..2)` = `{25002, 1963}`, `{25029, 562}`, `{25007, 1442}`.
- `labSetup(2)` = `{ 997, 9825 }`; `trialSetup(2, 0)` = `{24987, 1076}`.
- `labSetup(4294967295)` = `{ 1030, 9689 }`; `trialSetup(4294967295, 0)` = `{25013, 1889}`.
- seeds 1 to 20 000 reach both ends of each range: 850 and 1050; 9500 and 10500; 24 970 and 25 030; 0 and 2000.
- box corners: 20.21 mL and 27.66 mL (27.6647).

**`flask.test.ts`**, the phase's first test

- seed 1: equivalence 25 680.86 µL; 26 204.96 with the titrant at 98%; 25 167.24 with the aliquot at 98%; identical with 30 mL of water and a third drop.
- `compareToEquivalence` at 25 675 and 25 700: −1, 1. For 0.1000 M × 25.000 mL ÷ 0.10000 M at 24 999, 25 000, 25 001: −1, 0, 1; `isOvershot` at 25 100 and 25 101: false, true.
- seeds 1 to 100: every addition before the last is below the threshold; the last is at or past equivalence and not overshot; µL past equivalence 11.21 to 35.03 (2 drops), 11.21 to 36.33 (3 drops).
- closest approach to the threshold over all additions: more than 0.001 (measured 0.0099).
- seed 1, 2 drops, pH and pink concentration at 0, 23 680, 25 650, 25 675, 25 700, 25 725, 25 800 µL: 1.01 / 1.9e-21; 2.41 / 6.0e-19; 4.24 / 2.6e-15; 4.95 / 6.9e-14; 8.96 / 3.5e-6; 9.53 / 1.4e-5; 10.19 / 2.5e-5. Flask volume at 25 700: 50 802 µL.
- pink at 25 800 µL is deeper with 3 drops than 2, and exactly 0 with none.

**`entries.test.ts`**

- `parseReading`: "12.34" 12340; "0.00" 0; " 2.56 " 2560; null for "12.3", "12.345", "12", ".50", "12,34", "-1.00", "1e1", "".
- `parseMolarity`: "0.0949" and ".0949" 94900; "0.09494" 94940; "0.094942" 94942; null for "0.095", "0.0949422", "1.0949", "0,0949", "9.49e-2", "".
- `parseDeviation`: "0.47" 47; "1.3" 130; "2" 200; null for "1.333", ".5", "-1", "".
- `withinTolerance` against 0.10000 M: 0.1009 true, 0.1011 false, 0.0991 true, 0.0989 false; 0.1010 true, 0.101001 false, 0.0990 true, 0.098999 false. Against 0.09502 M: 0.095969 true, 0.095971 false.
- `percentError(94900, 9502)` −0.126; `(96800, 9502)` 1.873.
- `followsFromNotebook` for 0.0976 M and a 25.70 mL titre (0.094942): 0.0949 true, 0.094942 true, 0.0950 false, 0.0948 false; a zero titre false.
- `summarise([0.1000, 0.1002, 0.0998])`: mean 0.1000, 1.333 ppt. `[0.0949, 0.0948, 0.0949]`: 0.0948667, 0.468 ppt. Three equal values: 0.

**`actions.test.ts`**

- a new lab survives `JSON` and the schema unchanged.
- on a new lab, each of these is blocked with the reason given and `reduce` returns the same object: `recordHclMolarity` hcl-not-selected; `rinsePipette` hcl-not-selected; `pipetteAliquot` hcl-not-selected; `clearTipBubble` burette-empty; `recordInitialReading` burette-empty; `deliver` burette-empty; `addIndicatorDrop` flask-empty; `addWater` flask-empty; `swirlAndWait` flask-empty; `recordFinalReading` endpoint-not-confirmed; `submitMolarity` needs-final-reading; `startNextTrial` trial-open; `recordSummary` lab-not-completed.
- the stopcock: flask-empty, then needs-indicator (0 and 1 drops), then needs-initial-reading, then allowed; a fourth drop indicator-full; a second aliquot flask-has-aliquot.
- after one drop of titrant: `conditionBurette`, `fillBurette`, `addIndicatorDrop`, `recordInitialReading` mid-titration; `recordFinalReading` endpoint-not-confirmed.
- three washes give 30 000 µL; a fourth is water-full.
- warnings: fill of an unconditioned burette, and its top-up, `burette-not-conditioned`; pipetting unrinsed `pipette-not-rinsed`; reading with the bubble `tip-bubble`; none of them after conditioning, clearing and rinsing.
- unconditioned: trial 1 `titrantDiluted` true; trial 2 after a refill still `diluted`; after `conditionBurette` the burette is `{ conditioned: true, filled: false, diluted: false, levelUl: 0, tipAirUl: 0 }` and the initial reading null; after the next fill `{ ..., filled: true, diluted: false, levelUl: 562, tipAirUl: 600 }`.
- wet pipette: trial 1 aliquot `diluted`, `pipetteRinsed` true; trial 2 aliquot `clean`.
- tip bubble (seed 1): fill gives level 1963, air 600; clearing gives 2563, 0 and clears the initial reading; clearing again is no-tip-bubble. Left alone, `[delivered, meniscus fall, air left]` after a half-drop, a drop, a stream addition: `[25, 28, 597]`, `[75, 84, 591]`, `[325, 364, 561]`; at 5075 delivered `[5075, 5675, 0]`; at 5325 the fall is 5925. Four stream additions and forty half-drops give the same burette. After the bubble escaped in trial 1, the trial 2 fill gives level 562, air 0.
- Guided, meniscus 2.563 mL: 2.54 reread; 2.55, 2.56, 2.57, 2.58 accepted; 2.59 reread, and `reduce` returns the same object. Challenge stores 2.59 with `startLevelUl` 2563. Both refuse 2563, 2565, −10, 50 010 and 25.6 µL as invalid-entry.
- Guided: HCl 0.0967 not-the-label, 0.0976 accepted. Challenge: 0.0967 accepted.
- final reading: 2.56 after a confirmed endpoint is final-not-after-initial; a further half-drop or a wash of water clears the final reading, the end level and the wait, and the endpoint is no longer confirmed.
- both modes: 0.0950 and 0.00095 are calculation-mismatch; 0.0949 gives `{ end: 'graded', molarityE6: 94900, hclUsedE6: 97600 }`; then `submitMolarity` and `deliver` are trial-ended and `startNextTrial` is allowed.
- overshoot (seed 1): open at 25 750 and 25 775 µL; at 25 800, `{ deliveredUl: 25800, end: 'overshot' }`.
- a second trial without a refill: meniscus 50 000, `{ deliveredUl: 21737, end: 'ran-out' }`; the last stream addition delivers 237 µL.
- the lab is in-progress after two passes and completed after three; then `startNextTrial` is lab-completed and `recordSummary` is allowed. With a failed first trial it completes at the fourth.
- `restart` with seed 2 from a Guided lab equals `createLab(2, 'guided')`.
- the careful first trial of seed 1 is exactly `{ index: 0, aliquot: 'clean', indicatorDrops: 2, waterUl: 0, titrantDiluted: false, startLevelUl: 2563, initialReadingUl: 2560, deliveredUl: 25700, lastAdditionUl: 25, waitedS: 30, endLevelUl: 28263, finalReadingUl: 28260, hclUsedE6: 97600, molarityE6: 94900, end: 'graded' }`.

**`select.test.ts`**

- `hclLabel`: null, then "0.0976". `trueNaoh`: null after one pass, "0.09502" on completion.
- `meniscusPosition`: 2563 halfway between 2500 and 2600; 2533 just below the upper mark; 2534 and 2566 halfway; 2567 just above the lower mark; 2500 and 0 on the mark. For every level 0 to 2600, the reading made from the description is within 20 µL.
- seed 1 prepared: burette `{ filled: true, levelUl: 2563, tipBubble: false, atBottom: false }`; flask has no plume, `unchecked`, `pinkDepth` below 10⁻⁹. After one stream addition the plume fades at once; after a swirl and wait, `faded`. At the careful endpoint: `persisted`, plume `{ fraction: 1, status: 'persists', fadeSeconds: null }`, `pinkDepth` 0.117. After drops to overshoot, `overshot` true.
- slow-down hint, seed 1: Guided from 24 700 to 25 675 µL delivered; Challenge never. With an unconditioned burette (equivalence 26 204.96): false at 25 000, true at 25 250.
- `trialOutcome`: open; careful `passed`, −0.126, no causes; all three errors together `failed` with the three causes in order; a Challenge trial with the initial reading typed 2.65 and HCl typed 0.0967, molarity 0.0944: `passed`, −0.652, causes `initial-misread`, `hcl-label-misrecorded`; a streamed trial `{ state: 'invalid', reason: 'overshot' }`.
- summary, seed 1: null until entered; then mean 0.09487, 0.47 ppt, the learner's 0.0949 and 0.47 both matching; 0.0950 and 1.00 both not.
- `checklist`: eleven steps on a new lab; `titrate`, `final-reading`, `molarity` left when prepared; the second trial lists `hcl` (done), `fill`, `initial-reading`, `aliquot`, `indicator`, `titrate`, `final-reading`, `molarity`.

**`acceptance.test.ts`**, spec 7.4 through the state machine

- titration curve, 9 concentration pairs, 17 644 points more than 0.5 mL from equivalence: worst difference from the closed form below 10⁻¹² pH (measured 1.8×10⁻¹⁵); pH 7.00 crossing within 10⁻⁶ µL of stoichiometric (measured 3.6×10⁻¹²).
- endpoint, seeds 1 to 100: as the flask test, and the trial is open and the endpoint confirmed. Seed 1: 143 additions, the last three half-drops at 25 650, 25 675, 25 700; pH 4.95 then 8.96; pink 3.51×10⁻⁶ M.
- corners, in the order HCl low/high, NaOH low/high, pipette low/high. 2 drops: 10.918, 10.941, 9.644, 9.664, 11.564, 11.589, 10.169, 10.191 µL. 3 drops: 11.588, 11.611, 10.255, 10.275, 12.215, 12.239, 10.768, 10.789 µL.
- all 256 reachable corner flasks: 9.599 to 16.274 µL.
- careful labs: every lab completed in three trials, all passed; errors −0.316 to 0.087.
- technique errors, shift against the careful trial of the same seed: −2.168 to −1.864 (burette); −2.871 to −2.148 (bubble); 1.910 to 2.216 (pipette). Each run open after titrating (not overshot), failed, and with exactly its own cause named.
- water: for 1, 2, 3 washes the equivalence volume is identical, the endpoint 0 or 25 µL later (later in 10, 24, 36 of 200), every trial passed, no causes.
- reproducibility: equal states for equal seeds (1, 2, 99, 4294967295), unequal for seeds 1 and 2. Trial 2 after a careful trial 1 and after an overshot, 3-drop, 20 mL-of-water trial 1 has the same flask and the same burette; level 562.
- save and resume: for a careful and an all-errors technique, seeds 1, 7, 99, three trials each: reloading through `JSON` and the schema after every action gives a deep-equal state and the same JSON text. After 40 stream additions and a reload: delivered 10 000 µL, meniscus 12 563. A float level, an extra key and an empty trial list each fail the schema.
- plume, seed 1, `[fraction, status, fade s]`: at 250 (stream) 0.010, at once, 0.1; 23 250 (stream) 0.093, at once, 0.9; 23 500 (stream) 0.103, slowly, 1.0; 23 750 (drop) 0.025, at once, 0.3; 25 200 (drop) 0.094, at once, 0.9; 25 250 (drop) 0.104, slowly, 1.0; 25 475 (half) 0.108, slowly, 1.1; 25 675 (half) 0.810, slowly, 8.1; 25 700 and 25 725 (half) 1.000, persists, none.

### 5.3 The prototype's report (`out/report.txt`)

```
== 0. Model derived values
indicator molarity 1.5708e-2 mol/L; dissolved CO2 1.4663e-5 mol/L

== 1. Solver spot values (Kw 1.0e-14)
0.0100 M HCl: 2.000000
1e-8 M HCl: 6.978294
0.10 M acetic acid (pKa 4.756): 2.880876
0.10 M acetic acid + 0.10 M sodium acetate: 4.756152
0.10 M H3PO4 (2.148/7.198/12.375): 1.631739
0.10 M NH4Cl (pKa 9.25, charge +1): 5.124978
0.10 M NH3 (pKa 9.25, charge +1): 11.122104
pure water: 7.000000

== 2. Titration curve, HCl + NaOH only
points more than 0.5 mL from equivalence: 17644; worst |pH - closed form| = 1.78e-15
worst |V(pH 7.00) - V_stoich| over 9 concentration pairs = 3.64e-12 uL

== 3. Endpoint, seeds 1-100, careful run through the state machine
2 drops: pass 100/100; pink before equivalence 0; overshot 0; endpoint lands 11.21 to 35.03 uL past V_eq; on the 1st/2nd/3rd addition at or past V_eq: 56/44/0
   largest pink before equivalence 2.54e-12 M; pink at the endpoint 1.09e-6 to 1.24e-5 M; additions per run 121 to 148
3 drops: pass 100/100; pink before equivalence 0; overshot 0; endpoint lands 11.21 to 36.33 uL past V_eq; on the 1st/2nd/3rd addition at or past V_eq: 54/46/0
   largest pink before equivalence 3.79e-12 M; pink at the endpoint 1.01e-6 to 1.30e-5 M; additions per run 121 to 148
smallest |pink/threshold - 1| over every addition of those 200 runs: 9.89e-3

== 4. Offset-proof corner test: excess titrant (uL past V_eq) at which the mixed flask reaches the threshold
1 drops, 8 corners: 9.272 to 11.359 uL  [10.554, 10.580, 9.272, 9.295, 11.330, 11.359, 9.896, 9.921]
2 drops, 8 corners: 9.644 to 11.589 uL  [10.918, 10.941, 9.644, 9.664, 11.564, 11.589, 10.169, 10.191]
3 drops, 8 corners: 10.255 to 12.239 uL  [11.588, 11.611, 10.255, 10.275, 12.215, 12.239, 10.768, 10.789]
4 drops, 8 corners: 10.867 to 12.927 uL  [12.269, 12.292, 10.867, 10.888, 12.903, 12.927, 11.388, 11.409]
with a technique error (2 and 3 drops, worst corner):
  wet pipette (aliquot 98%): 12.173 uL; unconditioned burette (titrant 98%): 12.558 uL; both: 12.489 uL
with distilled water (worst corner over 2 and 3 drops), CO2-free water as modelled | if the water carried air-equilibrium CO2:
  0 mL: 12.239 uL | 12.239 uL
  10 mL: 13.436 uL | 14.996 uL
  20 mL: 14.647 uL | 17.772 uL
  30 mL: 15.878 uL | 20.574 uL
  40 mL: 17.135 uL | 23.407 uL
  50 mL: 18.420 uL | 26.273 uL
  60 mL: 19.868 uL | 29.376 uL
  80 mL: 23.076 uL | 35.800 uL
  100 mL: 26.535 uL | 42.494 uL
robustness of the threshold (worst corner, 2 and 3 drops, no water):
  threshold 3e-7: 8.274 uL; with 50 mL water 11.401 uL
  threshold 1e-6: 12.239 uL; with 50 mL water 18.420 uL
  threshold 2e-6: 16.072 uL; with 50 mL water 26.054 uL
  threshold 3e-6: 19.162 uL; with 50 mL water 33.045 uL
  threshold 5e-6: 24.367 uL; with 50 mL water 47.340 uL
  CO2 x1: 12.239 uL; with 50 mL water 18.420 uL
  CO2 x2: 16.134 uL; with 50 mL water 22.351 uL
  CO2 x3: 20.029 uL; with 50 mL water 26.282 uL

== 5. Careful lab: three careful trials per seed, honest readings, seeds 1-100, 2 and 3 drops
labs completed after exactly three trials: 200/200; trials passed 600/600; percent error -0.316% to +0.087%
recorded titre 20.40 to 26.87 mL; final meniscus up to 28.852 mL
bound over the seeded box for any valid trial (endpoint 0 to 0.10 mL late, titre misread by up to 0.04 mL, molarity rounded to four decimals): -0.853% to +0.366%

== 6. Technique errors, each alone, seeds 1-100, 2 and 3 drops, first trial, Challenge mode
unconditioned burette: shift -2.168% to -1.864%; error -2.256% to -1.909%; failed 200/200; flagged overshoot 0/200; exactly one cause named 200/200
tip bubble not cleared: shift -2.871% to -2.148%; error -3.053% to -2.209%; failed 200/200; flagged overshoot 0/200; exactly one cause named 200/200
pipette not rinsed: shift +1.910% to +2.216%; error +1.741% to +2.135%; failed 200/200; flagged overshoot 0/200; exactly one cause named 200/200
seed 1, burette never conditioned, trials 2 and 3 after a refill: -2.126% [burette-not-conditioned]; -2.126% [burette-not-conditioned]
  trial 4 after conditioning, refilling and clearing the new bubble: passed -0.126% []
seed 1, pipette never rinsed, trial 2: passed -0.232% []
seed 1, tip bubble never cleared, trial 2: passed -0.232% []
rejected alternative (mix the 2% dilute remainder with fresh titrant at the refill): trial 2 titrant would be 0.83% to 1.14% dilute over seeds 1-100

== 7. Distilled water, seeds 1-100, 2 and 3 drops
10 mL: equivalence volume identical 200/200; endpoint unmoved 190, one half-drop later 10, anything else 0; same pass/fail 200/200; overshot 0
20 mL: equivalence volume identical 200/200; endpoint unmoved 176, one half-drop later 24, anything else 0; same pass/fail 200/200; overshot 0
30 mL: equivalence volume identical 200/200; endpoint unmoved 164, one half-drop later 36, anything else 0; same pass/fail 200/200; overshot 0

== 8. Seeded values
seed 1: {"hclE4":976,"naohE5":9502} {"aliquotUl":25002,"fillLevelUl":1963} {"aliquotUl":25029,"fillLevelUl":562} {"aliquotUl":25007,"fillLevelUl":1442}
seed 2: {"hclE4":997,"naohE5":9825} {"aliquotUl":24987,"fillLevelUl":1076}
seed 4294967295: {"hclE4":1030,"naohE5":9689} {"aliquotUl":25013,"fillLevelUl":1889}
seeds 1-20000: HCl 850,1050, NaOH 9500,10500, aliquot 24970,25030, fill 0,2000, V_eq 20230.8 to 27647.5 uL
box limits: V_eq 20213.8 to 27664.7 uL

== 9. Tip bubble: meniscus against delivered volume (seed 1, bubble not cleared)
delivered 0 -> meniscus fell 0, air left 600
delivered 25 -> meniscus fell 28, air left 597
delivered 75 -> meniscus fell 84, air left 591
delivered 325 -> meniscus fell 364, air left 561
delivered 4825 -> meniscus fell 5404, air left 21
delivered 5075 -> meniscus fell 5675, air left 0
delivered 5325 -> meniscus fell 5925, air left 0
clearing the bubble: meniscus 1963 -> 2563; initial reading now null

== 10. Plume along a careful run, seed 1, 2 drops
V_eq 25680.86 uL
250 | to go 25430.9 | stream | fraction 0.010 | 0.1 s | fades-at-once
5250 | to go 20430.9 | stream | fraction 0.012 | 0.1 s | fades-at-once
10250 | to go 15430.9 | stream | fraction 0.016 | 0.2 s | fades-at-once
15250 | to go 10430.9 | stream | fraction 0.023 | 0.2 s | fades-at-once
20250 | to go 5430.9 | stream | fraction 0.044 | 0.4 s | fades-at-once
23500 | to go 2180.9 | stream | fraction 0.103 | 1.0 s | fades-slowly
23750 | to go 1930.9 | drop | fraction 0.025 | 0.3 s | fades-at-once
23850 | to go 1830.9 | drop | fraction 0.027 | 0.3 s | fades-at-once
24000 | to go 1680.9 | drop | fraction 0.029 | 0.3 s | fades-at-once
24250 | to go 1430.9 | drop | fraction 0.034 | 0.3 s | fades-at-once
24500 | to go 1180.9 | drop | fraction 0.041 | 0.4 s | fades-at-once
24750 | to go 930.9 | drop | fraction 0.051 | 0.5 s | fades-at-once
24850 | to go 830.9 | drop | fraction 0.057 | 0.6 s | fades-at-once
25000 | to go 680.9 | drop | fraction 0.068 | 0.7 s | fades-at-once
25150 | to go 530.9 | drop | fraction 0.086 | 0.9 s | fades-at-once
25200 | to go 480.9 | drop | fraction 0.094 | 0.9 s | fades-at-once
25250 | to go 430.9 | drop | fraction 0.104 | 1.0 s | fades-slowly
25300 | to go 380.9 | drop | fraction 0.116 | 1.2 s | fades-slowly
25350 | to go 330.9 | drop | fraction 0.131 | 1.3 s | fades-slowly
25400 | to go 280.9 | drop | fraction 0.151 | 1.5 s | fades-slowly
25450 | to go 230.9 | drop | fraction 0.178 | 1.8 s | fades-slowly
25475 | to go 205.9 | half | fraction 0.108 | 1.1 s | fades-slowly
25500 | to go 180.9 | half | fraction 0.121 | 1.2 s | fades-slowly
25525 | to go 155.9 | half | fraction 0.138 | 1.4 s | fades-slowly
25550 | to go 130.9 | half | fraction 0.160 | 1.6 s | fades-slowly
25575 | to go 105.9 | half | fraction 0.191 | 1.9 s | fades-slowly
25600 | to go 80.9 | half | fraction 0.236 | 2.4 s | fades-slowly
25625 | to go 55.9 | half | fraction 0.309 | 3.1 s | fades-slowly
25650 | to go 30.9 | half | fraction 0.448 | 4.5 s | fades-slowly
25675 | to go 5.9 | half | fraction 0.810 | 8.1 s | fades-slowly
25700 | to go -19.1 | half | fraction 1.000 | stays | persists
over 200 careful runs: status stepped backwards within one stopcock setting 0 times; "persists" before the last addition 0 times
"fades slowly" first shown in the stream with 2255 to 2498 uL to go (in 200 of 200 runs); dropwise from 450 to 500 uL to go; half-drops showing it 8 to 10

== 11. A careless run: stream until the status line says "fades slowly", then drops until it persists (seeds 1-100)
valid 100/100, overshot 0/100; valid endpoints land 11.2 to 60.0 uL past V_eq

== 12. Worst excess-to-threshold over every reachable flask: corners x 2,3 drops x 0-30 mL water x wet or rinsed pipette x conditioned or unconditioned burette
smallest 9.599 uL, largest 16.274 uL (3 drops, 30 mL water, aliquot 100%, titrant 98%); limit 25 uL

== 13. The spike's plume formula (last drop of the addition) on the same careless run, for comparison
valid 100/100, overshot 0/100

== 14. Running out, and an overshoot (seed 1)
streaming without stopping: trial ends 'overshot' after 104 additions at delivered 26000 uL, meniscus 28563
second trial without a refill: ends 'ran-out' at meniscus 50000, delivered 21737 uL; next deliver: trial-ended
```

### 5.4 Other outputs

`out/independent_ph.txt`:

```
0.0100 M HCl         2.000000
1e-8 M HCl           6.978294
0.10 M acetic acid   2.880876
acetate buffer       4.756152
0.10 M H3PO4         1.631739
0.10 M NH4Cl         5.124978
0.10 M NH3           11.122104
```

`out/box-sample.txt` (is the corner test enough? 3000 flasks from inside the box lie within the corner values):

```
2 drops, 0 mL water, 3000 seeded flasks: 9.657 to 11.550 uL
3 drops, 0 mL water, 3000 seeded flasks: 10.269 to 12.201 uL
3 drops, 30 mL water, 3000 seeded flasks: 13.535 to 15.835 uL
```

`out/lint.txt` and `out/data-check.txt`:

```
10 files linted as engine/chem-data code: 0 problems
reagents.json against the repository's unchanged reagentSchema: valid
96 strings checked, 0 rejected
```

## 6. Implementation tasks, in order

Each task writes its tests first. "Passes" means the named test file passes with the values of section 5.2.

1. **The endpoint test, red.** Write `src/engine/titration/flask.test.ts` as in the prototype. Done when it fails only because `flask.ts`, `setup.ts`, `model.ts` and the data do not exist. This is the spec's "the endpoint acceptance test is the first task"; tasks 2 to 6 are what it needs.
2. **Sources and authored input.** Create `docs/research/phase-3/sources/` with `MANIFEST.json`, the README and the kept copies, and `docs/research/phase-3/titration.json`. Done when every constant in the input has an entry in the manifest whose `prints` text contains its `published` figure, and the owner's decisions 2 to 4 of section 8 are recorded in it.
3. **Titration schema and validator.** `titrationSchema`, `validateTitration`, `hazardsSchema` exported, `titrationCitations`; `titration.test.ts` and new cases in `validate.test.ts`. Done when the validator rejects each of: an unknown source id, a `published` that is not its value, a parameter with no rationale, and a rationale containing "Room 214".
4. **Build script.** `buildTitration()` writes `titration.json` and `reagents.json` and adds the sources; `registry.ts` imports `reagents.json`. Done when `npm run build:data` run twice gives byte-identical files, the build fails if the saved NOAA value for the stored year is changed by hand, `registry.test.ts` finds the two reagents, and `npm run build` passes.
5. **pH solver.** `ph.test.ts`, then `ph.ts`. Done when its 12 tests pass.
6. **Model, seeded values, flask.** `setup.test.ts` and `model.ts`, `setup.ts`, `flask.ts`. Done when `setup.test.ts` passes and task 1's test is green.
7. **Typed entries.** `entries.test.ts`, then `entries.ts`. Done when its 8 tests pass.
8. **State, actions, test kit.** `state.ts`, `actions.test.ts`, `testkit.ts`, `actions.ts`. Done when `actions.test.ts` passes, including "blocked returns the same object".
9. **Selectors.** `select.test.ts`, then `select.ts`. Done when it passes.
10. **Acceptance.** `acceptance.test.ts`. Done when all of spec 7.4 and the save-and-resume test pass; the whole engine suite takes about 13 seconds, so give the seed-loop tests a 60 s timeout.
11. **Storage hand-off** (with the lab shell's design): load with `loadEntry(store, ENTRY.titration, version, titrationStateSchema)`, save after `reduce` when the state object changed. Done when a test saves mid-trial through `createMemoryStore` and resumes to the same final state, and `peekStatus` reports `completed` for a completed lab.
12. **Spec amendments** of section 7, in the same commit as the code that makes each true.

## 7. Where the spec is wrong, silent or contradicts itself

Each with the change proposed.

1. **5.2 and 7.3, K_w. Wrong source.** 7.3 says K_w (1.0×10⁻¹⁴) is cited; 5.2 cites IAPWS R11-24. That release's Table 3 prints pK_w 13.99 at 25 °C, molal scale, which is 1.02×10⁻¹⁴, and its two printed decimals cannot be converted to 14.00. Change the 5.2 row to: "K_w | OpenStax Chemistry 2e, section 14.1 (1.0 × 10⁻¹⁴ at 25 °C, the rounded value textbooks use). IAPWS R11-24 prints pK_w 13.99 on the molal scale; the difference does not affect the endpoint". Move "carbonic acid constants" and "other pKa values" to their own row.
2. **7.1, resolution of two seeded values. Silent.** Change "the hidden true NaOH concentration, 0.0950–0.1050 M" to "...0.09500–0.10500 M, in steps of 0.00001 M", and "plus a uniform offset in [−0.03, +0.03] mL" to "...at 0.001 mL resolution".
3. **7.2, stream size. Silent.** After "the app sends fixed-volume additions on a timer" add "of 0.25 mL".
4. **7.2, what must be in place before titrating. Silent.** Add: "The stopcock stays closed until the burette is filled, the flask holds the aliquot and 2 or 3 drops of indicator, and an initial reading is recorded. The burette is prepared and refilled only between titrations."
5. **7.2 and 7.3, a trial stopped early. Silent.** 7.3's three trial states do not cover a learner who stops before the endpoint. Add to 7.2: "The final reading can be recorded only after a swirl and wait (30 simulated seconds) has shown the pink to last at the current volume. Adding titrant or water afterwards clears the reading and the wait."
6. **7.2, the plume value. Silent.** After "Its intensity and fade time come from an engine value" add: "the share of the acid still in the flask that the addition neutralised. It fades slowly from 0.10 and persists when the mixed flask is at or above the threshold."
7. **7.2, Guided re-read. Silent on whether the reading is kept.** Change "prompts a re-read when a typed reading is more than 0.02 mL from the true meniscus" to "...and does not record it; the same for an HCl molarity that is not the label's".
8. **7.2, average and relative deviation. Silent on when and over what.** Change the sentence to: "On completion the learner enters their own average and relative deviation over the three passing trials; the notebook then shows the app's beside them."
9. **7.3, "the learner's calculated NaOH molarity". Silent on how it is entered.** Add to *Valid and passing*: "The learner types the molarity to at least four decimal places. It is accepted, in both modes, only when it equals their recorded HCl molarity × 25.00 mL ÷ their recorded titre to the fourth decimal place, and it is entered once per trial."
10. **7.3, technique table. Silent on later trials.** Unconditioned burette, effect: "NaOH in the burette diluted by 2.0%, through every refill, until the burette is conditioned". Tip bubble, effect: "A 0.60 mL bubble forms when the burette is filled from empty. Not cleared, it escapes evenly during the first 5 mL delivered, so the meniscus falls 0.60 mL more than was delivered; it does not return at a refill". Pipette, effect: "The first aliquot drawn with the wet pipette is diluted by 2.0%". Distilled water: "(10 mL at a time, at most 30 mL a trial)".
11. **7.4, distilled water.** Change "Adding 10 mL" to "Adding 10, 20 or 30 mL".
12. **7.4, save and resume. Missing from the acceptance list** though section 10 requires it. Add: "**Resume:** a lab reloaded from storage after every action ends in the same state as one never reloaded."
13. **7.4, corner test.** After "at every corner of the seeded ranges" add "and for every flask a learner can make (either dilution error, 2 or 3 drops, up to 30 mL of water)". Measured 9.599 to 16.274 µL.
14. **7.3, signed percent error. Contradicts 7.2.** "The trial shows its signed percent error only" gives the true molarity to anyone who divides: true = typed ÷ (1 + error). 7.2 says Guided "never shows the expected titre or molarity". See section 8, decision 1.
15. **5.2, indicator strength. No source read.** "Curated, cited" has no citation yet (section 9).
16. **5.3, Reagent. Silent on the titration's bottles.** Add: "The titration's HCl and NaOH records carry the nominal 0.1 M; the seeded label and the hidden concentration are model parameters. The indicator's bottle data is part of the titration record."
17. **7.1, "between 20.21 and 27.67 mL".** True as a bound; the largest value is 27.665 mL. No change needed.
18. **The spike record's correction on K_w** ("store K_w = 1.0e-14 citing IAPWS R11-24 with the conversion noted") cannot be done from what IAPWS prints. Item 1 replaces it.

## 8. Owner decisions

1. **The signed percent error reveals the answer.** Options: keep it as the spec has it; or show only "too high" or "too low" for a failed trial. Recommendation: keep it. It is the feedback a real marked report gives, a self-directed learner gains nothing by back-calculating, and the design already limits the damage: one molarity per trial, and it must follow from the notebook. A learner who wants to cheat in Challenge mode can still type a false reading; the feedback names the misread.
2. **Which classification goes on the HCl bottle.** PubChem's record for hydrochloric acid offers the EU entry for hydrogen chloride gas (H314, H331 "Toxic if inhaled") and Safe Work Australia's entry for hydrochloric acid (H314, H335 "May cause respiratory irritation"). Recommendation: the hydrochloric acid entry; the bottle holds the solution, not the gas.
3. **The three hazard notes for the strength used.** The drafts in section 2 say only what I can stand behind: dilute, can still irritate, eye protection, rinse. I believe 0.1 M HCl and 0.1 M NaOH fall below the EU limits for classification, but I read those limits only in a search summary, so the notes do not say it. You handle these solutions; the wording should be yours. The indicator's note matters most: phenolphthalein is classed as a suspected carcinogen and the card will say so.
4. **Which indicator product the 0.5% cites.** I could not open a catalogue page. Recommendation: cite the product your own lab stocks, from its label or safety data sheet. The endpoint test passes from 0.1% to 1%.
5. **Titrating without indicator.** Blocked here, which keeps the reachable flasks equal to the tested ones and needs no fourth status line. The alternative lets a learner forget the indicator and run straight past the endpoint, a real mistake. It costs a "no colour" status, a Guided warning and a cause. Recommendation: blocked for v1.
6. **Two chemistry simplifications to accept or reject.** The unconditioned burette holds its full 2.0% through refills (a real one dilutes less each time; honest mixing puts trial 2 on the grading line). The wet pipette spoils only the first aliquot (this one is what really happens). Recommendation: accept both.

Smaller choices made here that you may want to know: mode can be switched at any time; a reading is cleared when its level changes, in Challenge too; refilling is not forced, so a second trial can run out; distilled water is modelled as free of CO₂, as the spec says, and the 30 mL cap keeps the result true if it is not.

## 9. Not verified

- **The 0.5% indicator strength has no source I read.** Sigma-Aldrich reset the connection, Ricca returned 404, Thomas Scientific 403, Fisher timed out, and one reseller served no page body. "Ricca 5600, 0.5% (w/v) in 50% (v/v) alcohol" was seen only as a search-result title, and one summary of it mentioned methanol.
- **EU concentration limits for NaOH and HCl** were seen only in a search summary. Nothing stored depends on them.
- **Perrin 1982 and the CRC Handbook** were not read. The carbonic acid constants are Wikipedia's transcription, at a recorded revision.
- **NIST's Henry's-law table** shows "N/A" in every Reference cell today, so the 0.034 cannot be tied to a named paper from that page; it is the value of 11 of its 17 rows.
- **The drop volume** rests on one Wikipedia sentence about pharmacists' drops. A real drop of an ethanol solution is smaller; the spike found the test passes down to 0.02 mL, which I did not re-run.
- **Tamura's constants** were measured in 0.2 M phosphate buffer at 25±2 °C and are used without activity correction.
- **IAPWS's unrounded value** (the spike's 13.995 and its conversion to the molar scale) was not recomputed. I read only the printed 13.99.
- **The build script and the validator function are designed, not prototyped.** The schema, the data file, the reagent records (against the real `reagentSchema`) and the prose check were run.
- **Nothing ran in a browser or in the app.** The prototype ran on Node 24.21 with Vitest 5.0.3, outside `src/`. Not run on Node 22.
- **Other JavaScript engines.** Readings, volumes, overshoot and grading are whole-number arithmetic and cannot differ. The pink-or-not test uses `Math.pow`, which engines may round differently in the last bit. On careful runs the nearest miss is 1% from the threshold; a learner's arbitrary path (odd mixes of additions with water) was not searched for a nearer one.
- **The corner test assumes the worst case is at a corner.** 3000 flasks sampled inside the box agree; it is not proved.
- **Bundle size** of the zod schema in the lab's chunk was not measured.
- **How it feels:** the plume thresholds, the 10-second mix time, the 0.25 mL stream addition and its timer rate, the full-depth pink, and whether thirds are the right grain for the meniscus text. None has been seen on screen.
- **Not modelled,** as in the spike: CO₂ taken up from air during a trial (the real reason an endpoint fades), the slow fading of the pink in strong base (Tamura's pK₃), activity corrections, temperature, and the ethanol in the indicator.

## 10. The prototype

```
proto/
  ph.ts  ph.test.ts
  titration.json  reagents.json  titrationData.ts        the data, its schema, and the flattening
  titration/model.ts setup.ts flask.ts state.ts entries.ts actions.ts select.ts testkit.ts
  titration/*.test.ts                                    101 tests
  report.ts            prints out/report.txt
  independent_ph.py    prints out/independent_ph.txt
  box-sample.ts        prints out/box-sample.txt
  data-check.ts        reagents against the real reagentSchema; prose against the real denylist
  lint-as-engine.mjs   lints each file as src/engine/... with the repository's ESLint config
  vitest.config.ts  tsconfig.json
sources/               the copies fetched today, and MANIFEST.json
out/                   every output pasted above
```

From the repository root:

```
npx vitest run --config .superpowers/tools/phase3-design/engine/proto/vitest.config.ts
npx tsc -p .superpowers/tools/phase3-design/engine/proto/tsconfig.json
node .superpowers/tools/phase3-design/engine/proto/report.ts
node .superpowers/tools/phase3-design/engine/proto/lint-as-engine.mjs
node .superpowers/tools/phase3-design/engine/proto/data-check.ts
python3 .superpowers/tools/phase3-design/engine/proto/independent_ph.py
```

It imports `src/engine/rng.ts` and, in `data-check.ts`, `src/chem-data/schema.ts` and `denylist.ts`, unchanged. It is a throwaway: the engine is written test-first in the plan.
