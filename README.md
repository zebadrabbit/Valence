# Valence

An independent, browser-based molecule explorer and virtual general-chemistry lab for self-directed learners.

Valence recreates common general chemistry bench labs so anyone can perform them, understand the chemistry, and check their own results. It is a personal learning project with no connection to any school.

## Status

All five phases of v1 are built. Phase 1 is the foundation: the app shell, themes, guest progress storage, and the chemistry-data validator. Phase 2 is the molecule explorer: molecules in 3D and as Lewis structures, with atom, bond and measurement cards, three valence display levels, and a Ctrl+K search. Its library was 31 molecules and is 101 since 2026-10-09: small molecules and ions, a gallery of VSEPR shapes, organic functional groups, biomolecules, and everyday molecules such as caffeine and vanillin, with a field on the library page that filters them by name or formula. The explorer also has a periodic table of all 118 elements, added after phase 2: coloured by chemical family or by a property, with a card of sourced values for each element and links to and from the molecules. Phase 3 is the titration lab: a sodium hydroxide solution is standardized against hydrochloric acid on a drawn bench, in a Guided or a Challenge mode, each trial is checked against a seeded model, and the run is still there after a reload. Phase 4 is the aqueous reactions lab: ten fixed stations, each a test tube in which two reagents are mixed, observed by eye and with tools, and written up as a molecular, a complete ionic and a net ionic equation built from a palette of formulas, in a Guided or a Challenge mode, with a solubility table, a table of the bench's ions and a calculator that float over the page. Each lab needs a window at least 768 pixels wide. Phase 5 is the mechanism timeline: hydrochloric acid and sodium hydrogen carbonate followed atom by atom through seven chapters, in a 3D scene that is played, stepped through or scrubbed, with a panel that draws free energy and enthalpy along the way and says which of its values are cited, which derived and which only drawn, and a Challenge mode that asks what happens next before each step.

One lab has been added since v1, the flame test lab: six stations, one for each of six metal chlorides in solution. At a station a wire loop is cleaned, dipped and held in a drawn burner's flame; the flame is looked at, then its light through a hand spectroscope, a strip with a scale from 400 to 780 nm on which sharp lines and broad bands show; and the colour of the flame, where the brightest thing is and whether it is a line or a band are recorded from fixed choices, in a Guided or a Challenge mode. An observation made with a loop that was not clean does not count. A closing question asks what gives each flame its colour. Its screens were built on 2026-10-08 and 2026-10-09 and have been checked by script by the AI coding assistant that built them; the review by one that did not build them was held on 2026-10-09, by script in the same way, and what it changed is in the record of the build. No person has run the lab, and no chemist has read it.

No chemistry instructor has reviewed any of the three labs or the timeline, no screen reader has been used on them, and they have been run in Chromium only. The timeline's page has been checked by the AI coding assistant that built it and reviewed by another that did not, each by script; no person has used it. [Information for institutional reviewers](docs/for-institutions.md) says what was checked, by whom, and what was not.

- [v1 design spec](docs/superpowers/specs/2026-10-03-valence-v1-design.md): what is being built first.
- [Periodic table design spec](docs/superpowers/specs/2026-10-03-periodic-table-design.md), and [the research record it is built from](docs/research/periodic-table/README.md).
- The titration lab's research record: [its sources, and which of them are kept](docs/research/phase-3/sources/README.md), and [the chemistry review held before its screens were built](docs/research/phase-3/gate-a.md).
- The aqueous reactions lab's research record: [its sources, and what could not be sourced](docs/research/phase-4/sources/README.md), and [the record of how its screens were built, what the review at the close of the phase found and changed, and what nobody checked](docs/research/phase-4/build-record.md).
- The flame test lab's research record: [its sources, what could not be sourced, and what a chemist should look at](docs/research/flame/README.md), and [the record of how its screens were built, where they differ from the design, and what nobody checked](docs/research/flame/build-record.md).
- The mechanism timeline's research record: [its sources, what is worked out from them, and what could not be sourced](docs/research/phase-5/sources/README.md), and [the record of how its page was built, where it differs from the design, and what nobody checked](docs/research/phase-5/build-record.md).
- [Original design document](Chem%20Lab%20Explorer%20-%20Design%20Document.md): the full vision, including labs planned after v1.
- [Information for institutional reviewers](docs/for-institutions.md): IT, privacy, accessibility, procurement, curriculum and lab safety facts.

## Development

Requires Node 22.22 or a later 22 release, Node 24, or Node 26 or newer. Node 23 is not supported by the linter or the test runner, and Node 25 is not supported by the test runner.

    npm install
    npm run dev        # start the app locally
    npm test           # run the tests, including chem-data validation
    npm run lint       # architecture rules: chemistry code stays pure and deterministic
    npm run build      # lint, test, type-check, and build to dist/; a failure at any step stops the build
    npm run build:data # regenerate src/chem-data/ JSON from docs/research/phase-2/, docs/research/periodic-table/, docs/research/phase-3/, docs/research/phase-4/, docs/research/emission-spectra/ and docs/research/flame/, and the mechanism's record in src/mechanisms/ from docs/research/phase-5/
    npm run build:expected # regenerate the expected-values test fixture from docs/research/phase-2/expected.json
    npm run cross-check # rewrite docs/research/periodic-table/cross-check.md from the saved sources

To have the validator reject specific institution names, create `src/chem-data/denylist.local.json` containing a JSON array of names. The file is ignored by git.

## v1 scope

- A molecule explorer with atom and bond inspection over a curated library of about 30 molecules (grown to 101 after v1's phases were built), and a periodic table (added to the scope after the explorer was built).
- Two labs: standardization of a base by titration, and ten reactions in aqueous solution. (A third, flame tests, was added after v1.)
- One mechanism timeline: HCl + NaHCO₃.
- Guest-only; progress is saved in the browser.

Every chemistry value in the app has a cited source. The explorer's values are hand-curated and covered by tests. The periodic table's values are built by script from saved copies of PubChem, CIAAW and NIST data, cross-checked, with a note on the card wherever a value needs one. The titration lab's constants come from IAPWS, NIST, the NOAA Global Monitoring Laboratory, PubChem, a paper in Analytical Sciences, a supplier's catalogue page and two Wikipedia pages; the hazard statements on its bottles are those of Flinn Scientific's safety data sheets, with a note from a safety data sheet for the solution at the strength used (the indicator's from Ricca Chemical Company); and its primer rests on OpenStax Chemistry 2e, David Harvey's Analytical Chemistry 2.1 and pages on laboratory technique, quoting none of them. The safety data sheets and most of the other pages were read and are not kept, so the build cannot check the lab's record against them again. The aqueous reactions lab's values come from OpenStax Chemistry 2e (the solubility of each pair of ions and the forms of an equation), the NBS tables of 1982 (enthalpies of formation), PubChem, pages on the reactions of metal ions, Chemguide and Wikipedia (colours and odours), and Flinn Scientific's safety data sheets for its fifteen reagents, read and not kept. The mechanism timeline's energies are worked out by the build from the NBS tables of 1982 and from the acid constant of carbonic acid in a paper of 2016, read and not kept; where its atoms are between the species' library shapes is Valence's own choreography. The flame test lab's atomic lines are the NIST Atomic Spectra Database's, from saved tables; its bands are from a paper of 1975, the English abstracts of two papers of 1979 and a doctoral dissertation; its flame colours from Chemguide and an open textbook; and the hazards of its six bottles from Flinn Scientific's safety data sheets, with what a second or a third supplier's sheet or a NOAA record says more strictly of the substance, all read and not kept. Which of a flame's lines and bands the lab calls the brightest follows what those sources' instruments recorded, which is not always what an eye would find. None of these publishers is connected with Valence or has reviewed it. The About page lists every source.

## License

[MIT](LICENSE)
