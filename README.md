<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/media-kit/logos/valence-logo-on-dark.svg">
    <img src="docs/media-kit/logos/valence-logo.svg" alt="Valence" width="320">
  </picture>
</h1>

An independent, browser-based molecule explorer and virtual general-chemistry lab for self-directed learners.

Valence recreates common general-chemistry bench labs so that anyone can do them, understand the chemistry and check their own results. It is a personal learning project with no connection to any school.

**Try it in your browser:** https://firetailfab.com/valence/#/

[![The red cabbage pH lab: a rack of thirteen buffers, each tube a different colour from red at pH 1 to yellow at pH 13](docs/media-kit/screenshots/valence-lab-red-cabbage.png)](https://firetailfab.com/valence/#/)

## What's in it

- **Molecule explorer.** 101 molecules in 3D and as Lewis structures: small molecules and ions, a gallery of VSEPR shapes, organic functional groups, biomolecules, and everyday molecules such as caffeine and vanillin. Atoms, bonds and measurements each have a card. There are three valence display levels and a Ctrl+K search.
- **Periodic table.** All 118 elements, coloured by chemical family or by a property. Each element has a card of sourced values and links to and from the molecules.
- **Fourteen labs**, listed below.
- **A mechanism timeline.** Hydrochloric acid and sodium hydrogen carbonate followed atom by atom through seven chapters, in a 3D scene that can be played, stepped through or scrubbed. A panel draws free energy and enthalpy along the way and says which values are cited, which are derived and which are only drawn. In Challenge mode it asks what happens next before each step.

There are no accounts: progress is saved in the browser.

| | |
|---|---|
| ![Caffeine in the molecule explorer, as a ball-and-stick model with its lone pairs drawn as dots](docs/media-kit/screenshots/valence-explorer-caffeine.png) | ![The periodic table coloured by chemical family, with copper selected](docs/media-kit/screenshots/valence-periodic-table.png) |
| Molecule explorer: caffeine | Periodic table |
| ![The titration lab's bench: bottles, a pipette, a burette over a flask, and a close view of the meniscus](docs/media-kit/screenshots/valence-lab-titration.png) | ![The mechanism timeline at its proton-transfer step, with the energy panel open](docs/media-kit/screenshots/valence-mechanism-timeline.png) |
| Titration lab | Mechanism timeline |

## The labs

Every lab has two modes:

- **Guided** checks each answer as it is given, with hints and warnings along the way.
- **Challenge** records what is given and checks it only when asked.

A run is still there after a reload. Each lab needs a window at least 768 pixels wide.

| Lab | What the learner does | Research record |
|---|---|---|
| Standardization of a base by titration | Standardizes a sodium hydroxide solution against hydrochloric acid on a drawn bench. Each trial is checked against a seeded model. | [phase-3](docs/research/phase-3/sources/README.md) |
| Aqueous reactions | At ten stations, mixes two reagents in a test tube, observes by eye and with tools, and builds the molecular, complete ionic and net ionic equations from a palette of formulas. A solubility table, a table of ions and a calculator float over the page. | [phase-4](docs/research/phase-4/sources/README.md) |
| Flame tests | Cleans a wire loop, dips it in one of six metal chloride solutions and holds it in a burner flame. Looks at the flame, then through a hand spectroscope (400–780 nm), and records the colour and the brightest line or band. A loop that was not clean doesn't count. | [flame](docs/research/flame/README.md) |
| Calorimetry | With a foam-cup calorimeter and a logging temperature probe, finds three things: the heat given out when hydrochloric acid and sodium hydroxide are mixed, the heat taken in when ammonium nitrate dissolves, and the specific heat of an unknown metal. | [calorimetry](docs/research/calorimetry/README.md) |
| Group I cations | Tests a known and an unknown solution for silver, lead and mercury(I) in five steps on three drawn test tubes. Fills in a flow chart of the scheme, then names the unknown's ions. | [cations](docs/research/cations/README.md) |
| Le Chatelier's principle | Disturbs four equilibria in seventeen ways (adding, removing, heating, cooling). For each, predicts which way it will shift, then observes and says which way it went. | [lechatelier](docs/research/lechatelier/README.md) |
| Clock reaction | Times the bromate–iodide clock reaction for five mixtures at room temperature, and for the first again at three other temperatures. Works out the order in each reactant, the rate constant and the activation energy. | [clock](docs/research/clock/README.md) |
| Iodination of acetone | Times the fading yellow of iodine in four mixtures to find the order in acetone, in hydrogen ion and in iodine (zero), and the rate constant. It runs on the clock reaction lab's kinetics engine. | [acetone](docs/research/acetone/README.md) |
| Red cabbage pH | Builds a colour scale from the indicator in thirteen buffers, estimates the pH of fourteen household things, then checks each with a pH meter. | [cabbage](docs/research/cabbage/README.md) |
| Measurement and density | Reads a ruler, a graduated cylinder, a thermometer and a balance to one figure beyond the finest mark. Then finds the density of an unknown liquid and of an unknown metal, keeping to the rules for significant figures. | [density](docs/research/density/README.md) |
| Freezing point depression | Calibrates the probe in ice and water, finds the molar mass of an unknown liquid, and finds how many particles each formula unit of urea or a salt gives in water. | [freezing](docs/research/freezing/README.md) |
| Types of reactions | At five stations covering the four kinds of reaction a first course meets, observes each reaction, names its kind and balances it from tiles. Also puts three metals in order of reactivity. | [reactions](docs/research/reactions/README.md) |
| Polarity and mixing | Mixes pairs of five household liquids, and puts salt or sugar into some of them, to see what mixes and what dissolves. Then sorts the liquids by "like dissolves like". | [mixing](docs/research/mixing/README.md) |
| Endothermic and exothermic | Dissolves Epsom salt and calcium chloride in water, reads the temperature change from a graph, and decides which would suit a hot pack and which a cold pack. | [hotcold](docs/research/hotcold/README.md) |

Each research record gives the lab's sources and its values as stored. It also says what could not be sourced, what a chemist should look at, and what the lab's review found, changed and left. How each lab's screens were built is in its section of the [v1 design spec](docs/superpowers/specs/2026-10-03-valence-v1-design.md).

## How it has been checked

- **By its builders.** AI coding assistants built each lab and the timeline, and checked them by script in headless Chromium.
- **By a reviewer.** Each lab then had one deep review by an AI reviewer that had not built it, again by script and by reading.
- **In other browsers.** On 2026-10-18 the whole app was also run by script in Firefox and WebKit, headless on a Linux server. WebKit is the engine Safari is built on; it is not Safari itself.
- **For accessibility.** The same day, an automated accessibility checker swept the whole app, and every lab was worked to completion with the keyboard alone.

**Not yet done:**

- No chemistry instructor has reviewed any lab or the timeline.
- No person has used a screen reader on it.
- It has not been tried on a real phone or tablet.
- It has not been tested with users outside the project.

[Information for institutional reviewers](docs/for-institutions.md) says in detail what was checked, by whom, and what was not. None of the documents claims conformance to any standard.

## Sources

Every chemistry value in the app has a cited source, and the About page lists every source. Each lab's research record says which of its figures are cited, which are worked out from cited figures, and which are the lab's own model. Two of the lab's own figures are the clock reaction's activation energy and how fast a foam cup trades heat with the room.

The main sources:

- **Molecules:** hand-curated values, covered by tests.
- **Elements:** built by script from saved copies and extracts of PubChem, CIAAW and NIST data, then cross-checked, with a note on the card wherever a value needs one.
- **Thermodynamic data:** the NBS tables of 1982 (enthalpies and Gibbs energies of formation, heat capacities). These are behind the aqueous reactions, calorimetry, Group I cations, Le Chatelier's principle, and endothermic and exothermic labs, and the mechanism timeline.
- **Physical data:** NIST (the Chemistry WebBook and the Atomic Spectra Database), IAPWS, CIAAW's standard atomic weights, PubChem and the NOAA Global Monitoring Laboratory.
- **Kinetics:** a kinetic study and a thesis on the bromate–iodide reaction, and the NBS Tables of Chemical Kinetics of 1951 for the iodination of acetone.
- **Flame spectra:** atomic lines from the NIST Atomic Spectra Database, and molecular bands from published papers and a doctoral dissertation.
- **Procedures and observations:**
  - schools' and colleges' handouts for these experiments;
  - open textbooks: OpenStax Chemistry 2e, David Harvey's Analytical Chemistry 2.1 and an open textbook of qualitative analysis;
  - Chemguide and pages on the reactions of metal ions;
  - a demonstration by the Nuffield Foundation and the Royal Society of Chemistry;
  - Wikipedia.
- **Hazards:** Flinn Scientific's safety data sheets first. Where another supplier's sheet, a state's fact sheet or a NOAA record is stricter about a substance, the stricter wording is used.

The safety data sheets and many of the other pages were read and not kept, so the build cannot check a lab's record against them again. None of these publishers is connected with Valence or has reviewed it.

## Documents

- [v1 design spec](docs/superpowers/specs/2026-10-03-valence-v1-design.md): what was built first, with a section for each lab added since.
- [Periodic table design spec](docs/superpowers/specs/2026-10-03-periodic-table-design.md) and [the research record it is built from](docs/research/periodic-table/README.md).
- [Mechanism timeline sources](docs/research/phase-5/sources/README.md) and [build record](docs/research/phase-5/build-record.md).
- Build records of the [aqueous reactions lab](docs/research/phase-4/build-record.md) and the [flame test lab](docs/research/flame/build-record.md), and [the chemistry review held before the titration lab's screens were built](docs/research/phase-3/gate-a.md).
- [Original design document](Chem%20Lab%20Explorer%20-%20Design%20Document.md): the full vision, including labs planned after v1.
- [Information for institutional reviewers](docs/for-institutions.md): facts for IT, privacy, accessibility, procurement, curriculum and lab safety.
- [Media kit](docs/media-kit/README.md): logos, screenshots, descriptions and colours for writing about Valence.

## Development

Requires Node 22.22 or a later 22 release, Node 24, or Node 26 or newer. Node 23 is not supported by the linter or the test runner, and Node 25 is not supported by the test runner.

    npm install
    npm run dev      # start the app locally
    npm run build    # lint, test, type-check and build to dist/; a failure at any step stops the build

| Command | What it does |
|---|---|
| `npm test` | Runs the tests, including the chemistry-data validation. |
| `npm run lint` | Checks the architecture rules: chemistry code stays pure and deterministic. |
| `npm run typecheck` | Type-checks the project. |
| `npm run preview` | Serves the built `dist/` locally. |
| `npm run build:data` | Regenerates the JSON in `src/chem-data/`, and the mechanism's record in `src/mechanisms/`, from the research records in `docs/research/`. |
| `npm run build:expected` | Regenerates the expected-values test fixture from `docs/research/phase-2/expected.json`. |
| `npm run cross-check` | Rewrites `docs/research/periodic-table/cross-check.md` from the saved sources. |

CI runs `npm run build`, then the three data commands, and fails if they change any tracked file.

To have the validator reject specific institution names, create `src/chem-data/denylist.local.json` containing a JSON array of names. The file is ignored by git.

## v1 scope

The first version was planned as:

- a molecule explorer of about 30 molecules;
- two labs: titration and aqueous reactions;
- one mechanism timeline (HCl + NaHCO₃);
- guest-only use, with progress saved in the browser.

All of it is built. Since then the library has grown to 101 molecules, and the periodic table and twelve more labs have been added.

## License

[MIT](LICENSE)
