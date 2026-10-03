# Valence

An independent, browser-based molecule explorer and virtual general-chemistry lab for self-directed learners.

Valence recreates common general chemistry bench labs so anyone can perform them, understand the chemistry, and check their own results. It is a personal learning project with no connection to any school.

## Status

Phase 1 of 5 (foundation) is built: the app shell, themes, guest progress storage, and the chemistry-data validator. Phase 2A (chemistry data: elements, 33 molecule structures, molecular orbital diagrams, and the pure functions that derive from them) is built. Phase 2B, the 3D explorer, is next, followed by the labs and the mechanism timeline.

- [v1 design spec](docs/superpowers/specs/2026-10-03-valence-v1-design.md): what is being built first.
- [Original design document](Chem%20Lab%20Explorer%20-%20Design%20Document.md): the full vision, including labs planned after v1.
- [Information for institutional reviewers](docs/for-institutions.md): IT, privacy, and procurement facts.

## Development

Requires Node 22 or newer.

    npm install
    npm run dev        # start the app locally
    npm test           # run the tests, including chem-data validation
    npm run lint       # architecture rules: chemistry code stays pure and deterministic
    npm run build      # test, type-check, and build to dist/
    npm run build:data # regenerate src/chem-data/ JSON from docs/research/phase-2/
    npm run build:expected # regenerate the expected-values test fixture from docs/research/phase-2/expected.json

To have the validator reject specific institution names, create `src/chem-data/denylist.local.json` containing a JSON array of names. The file is ignored by git.

## v1 scope

- A molecule explorer with atom and bond inspection over a curated library of about 30 molecules.
- Two labs: standardization of a base by titration, and ten reactions in aqueous solution.
- One mechanism timeline: HCl + NaHCO₃.
- Guest-only; progress is saved in the browser.

Every chemistry value in the app is hand-curated with a cited source and covered by a test.

## License

[MIT](LICENSE)
