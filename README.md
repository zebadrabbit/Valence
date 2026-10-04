# Valence

An independent, browser-based molecule explorer and virtual general-chemistry lab for self-directed learners.

Valence recreates common general chemistry bench labs so anyone can perform them, understand the chemistry, and check their own results. It is a personal learning project with no connection to any school.

## Status

Phases 1 and 2 of 5 are built. Phase 1 is the foundation: the app shell, themes, guest progress storage, and the chemistry-data validator. Phase 2 is the molecule explorer: 31 molecules in 3D and as Lewis structures, with atom, bond and measurement cards, three valence display levels, and a Ctrl+K search. The explorer also has a periodic table of all 118 elements, added after phase 2: coloured by chemical family or by a property, with a card of sourced values for each element and links to and from the molecules. Phase 3, the titration lab, is next, followed by the aqueous reactions lab and the mechanism timeline.

- [v1 design spec](docs/superpowers/specs/2026-10-03-valence-v1-design.md): what is being built first.
- [Periodic table design spec](docs/superpowers/specs/2026-10-03-periodic-table-design.md), and [the research record it is built from](docs/research/periodic-table/README.md).
- [Original design document](Chem%20Lab%20Explorer%20-%20Design%20Document.md): the full vision, including labs planned after v1.
- [Information for institutional reviewers](docs/for-institutions.md): IT, privacy, accessibility, procurement, and curriculum facts.

## Development

Requires Node 22 or newer.

    npm install
    npm run dev        # start the app locally
    npm test           # run the tests, including chem-data validation
    npm run lint       # architecture rules: chemistry code stays pure and deterministic
    npm run build      # test, type-check, and build to dist/
    npm run build:data # regenerate src/chem-data/ JSON from docs/research/phase-2/ and docs/research/periodic-table/
    npm run build:expected # regenerate the expected-values test fixture from docs/research/phase-2/expected.json
    npm run cross-check # rewrite docs/research/periodic-table/cross-check.md from the saved sources

To have the validator reject specific institution names, create `src/chem-data/denylist.local.json` containing a JSON array of names. The file is ignored by git.

## v1 scope

- A molecule explorer with atom and bond inspection over a curated library of about 30 molecules, and a periodic table (added to the scope after the explorer was built).
- Two labs: standardization of a base by titration, and ten reactions in aqueous solution.
- One mechanism timeline: HCl + NaHCO₃.
- Guest-only; progress is saved in the browser.

Every chemistry value in the app has a cited source. The explorer's values are hand-curated and covered by tests. The periodic table's values are built by script from saved copies of PubChem, CIAAW and NIST data, cross-checked, with a note on the card wherever a value needs one.

## License

[MIT](LICENSE)
