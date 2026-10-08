# Sources of the aqueous reactions lab

Two manifests are in this folder.

`MANIFEST.json` lists every source of the lab's record (`../aqueous.json`) and of its primer (`src/chem-data/aqueous/primer.ts`): the address, the citation, and rows that say what the source prints and where. Each row names, in `fields`, the stored values it supports, by their place in the record with the item's id in brackets: `species[water].enthalpyOfFormation`, `solubility[silver-ion+chloride-ion]`, `stations[aq-02].notes[0]`. A row whose field is `primer` marks a source the primer rests on. Every source was fetched and read on 2026-10-06, but section 2.7 of OpenStax Chemistry 2e, which was fetched and read on 2026-10-07, when the names of the ions were added; its citation gives that date. Sections 2.6, 4.1, 4.2 and 18.5 of the book were fetched again that day, were byte for byte the files of the day before, and were read again for what was added.

`hazard-manifest.json` lists the safety data sheets behind the reagents' hazards (`../hazards.json`). It was written apart from the rest and keeps the form of the titration lab's manifest: one `field` to a row, beginning with the reagent's id. Three of its sheets are ones the titration lab cites too; the build lists each of those once.

## What is kept

| File | What it is |
| --- | --- |
| `pubchem-aqueous-reagents.json` | PubChem's molecular formula, molecular weight and title for the twelve compounds behind the fifteen reagents, from its PUG REST service |

It is its publisher's data, as downloaded and not edited by hand. It is not this project's work, and the repository's licence does not cover it. The build checks its sha256, each reagent's CID and atoms against it, and the molar mass of calcium carbonate and of magnesium.

Nothing else is kept. A value read from a page that is not kept rests on what the manifest says the page printed that day: the build cannot check it again, and a page that has changed since is not noticed. What the build does hold is that the record and the manifest give one account: every value that cites a source has a row of that source that names it, a value stored with the figure its source prints has a row that prints that figure, and no row names a value that does not cite its source.

The quotation fingerprint that `src/chem-data/aqueous/quotation.test.ts` compares the lab's words against is not kept either, for the reason `../../phase-3/sources/README.md` gives. `scripts/fingerprint-sources.mjs` writes it to this folder, where `.gitignore` lists it, from pages saved outside the repository:

    node scripts/fingerprint-sources.mjs <folder of saved pages> <YYYY-MM-DD> docs/research/phase-4/sources

## How each kind of value was read

- **Solubility of each pair of ions, and how equations are written.** OpenStax Chemistry 2e, located by section and heading and never quoted: Table 4.1 of section 4.2 for the solubility of each pair, section 4.1 for the three forms of an equation. The record stores one row for each pair the ten stations can bring together; the manifest has one row for each line of the table, naming the pairs read from it. Spec 5.2 names a handbook for these values; the table of a general chemistry text was used instead, as the phase's instructions asked.
- **Activity series.** One entry, magnesium above hydrogen, from the table of standard reduction potentials in section 17.3 of the same book. As the text of the page was taken out of it for reading, that table's row gives the ion as Mg2(aq), without the sign of its charge; the two electrons of the half-reaction give the charge.
- **Enthalpies of formation.** The NBS tables (Wagman and others, 1982), as spec 5.2 names them, read as the scanned PDF that NIST serves. The file has no text layer: pages 2-38 (Table 2, hydrogen) and 2-260 (Table 93, magnesium) were turned into images and read by eye. Six values are stored, of which four are zero.
- **Heat capacity and density of the liquid.** Water's, from the worked example of section 5.2 of the book in which hydrochloric acid and sodium hydroxide solution are mixed. The section prints 4.184 J/(g °C); the record stores the 4.18 of spec 5.2.
- **Colours, textures and odours.** One source to a row, or two where the colour is read in one place and the texture in another. The sources are a set of pages on the characteristic reactions of metal ions, sections 18.5 and 19.1 of the book, one page of Chemguide, a university's instruction sheet for preparing basic copper carbonate, and the appearance lines of four Wikipedia infoboxes. The Wikipedia pages are secondary sources, cited by revision.
- **Molar masses and the identity of each reagent.** PubChem's kept table.
- **Names of the ions, and of water and the three gases.** OpenStax Chemistry 2e: the table of polyatomic ions and the text of section 2.6, the naming rules of section 2.7, the worked example of section 4.2 and section 18.5. A name is stored for each ion that a bottle gives or an equation of a station holds, as it is said before the word "ion", and for water, carbon dioxide, ammonia and hydrogen. The compounds and the solids are not named here: each reagent has its name from PubChem's table, and the name of a solid that forms is the learner's to work out.
- **Hazards.** `hazard-manifest.json`.

## What could not be sourced, or only in part

- **The hex value of each ion's colour** is this project's choice for drawing the colour its source names. No source gives one.
- **The colour of the mixed liquid at station 5**, stored as orange, is this project's name for the blend of a pink solution and a yellow-orange one. No source for the mixture was found. The engine reports the two coloured ions; the name of the blend is curated.
- **Blue-green at station 2 and pale green at station 3** are the colours of the basic carbonates that really form, read from a description of the dried solid in each case, and stored under the simple carbonates the stations' equations write. No source describing the fresh precipitate in the tube was read. The two sources read on copper disagree about whether carbon dioxide is given off as the solid forms (the manifest's row for `chemguide-carbonates` says how), and the station's note says nothing of the gas. The source read for basic nickel carbonate makes it from nickel sulfate; the station uses the chloride.
- **Rust-brown** is the word of spec 8.2 for a solid one source calls red-brown and another, read and not cited, orange-brown. **Yellow-orange** is the spec's word for solutions a source calls yellow or amber.
- **Nickel(II) and cobalt(II)** are not printed in the section their names cite. Each is formed by that section's rule, a Roman numeral for the charge of a metal that forms ions of more than one charge, from the charge the record stores. **Silver** is stored without a numeral, as the name of its compound has it; the book writes silver(I) once, in section 4.1.
- **No texture** is stored for silver chloride or for the two carbonates: none of the sources read gives one for the precipitate.
- **Ammonium and hydroxide.** Table 4.1 read line by line gives two answers for this pair: soluble by its row for ammonium, insoluble by its row for hydroxide, which does not list ammonium among its exceptions. The pair is stored as soluble. In the lab the two ions react by another rule.
- **The temperature classes.** Warm from 5 °C and hot from 25 °C are model parameters, each with its rationale in the record. Nothing was tuned to the temperature rises of spec 8.4: 40.07 °C at station 8 and 11.03 °C at station 10 are what the stored enthalpies, heat capacity, density and amounts give.
- **Heat at the other eight stations** is not worked out. Spec 8.1 gives heat to two rules, neutralisation and a metal with an acid, and the model follows it; the enthalpies of the precipitations were not read.
- **The laboratory manual cited for how to waft** has no author on the page that was read. It is cited by its title and by where it was read.
