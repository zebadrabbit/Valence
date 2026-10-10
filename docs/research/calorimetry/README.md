# Calorimetry lab research record

The inputs the calorimetry lab is built from (spec section 16), where each came from, and what could not be found. Everything was gathered on 2026-10-09. Nothing in this folder is loaded by the app.

`npm run build:data` reads this folder and writes `src/chem-data/calorimetry/calorimetry.json` and the lab's entries in `src/chem-data/sources.json`. The build stops, and writes nothing, on an input it cannot hold to its sources.

| File | What it is |
| --- | --- |
| `calorimetry.json` | The lab's record: the seven reagents (the acid, the base, solid ammonium nitrate and the four metals), the water with its specific heat and density, the three parts with the enthalpy each model runs on and the notes shown when a part is done, and the model's parameters, each with its rationale |
| `sources/MANIFEST.json` | Every source of that record and of the primer (`src/chem-data/calorimetry/primer.ts`): its address, its citation, and rows that say what it prints and where, each naming the stored values it supports |
| `hazards.json`, `sources/hazard-manifest.json` | The hazards of solid ammonium nitrate and of the four metals as pieces, and the documents behind them. They were written apart from the rest, in the form of the flame test lab's, and the build merges them into the record. The acid and the base carry the aqueous reactions lab's records unchanged (`../phase-4/hazards.json` and its hazard manifest), which the build merges in from there |

No source has a copy in this folder. Three sources are shared with other labs and are read where those labs keep or read them: the NBS tables (the scan the aqueous reactions lab read), the table of standard atomic weights (`../periodic-table/sources/`) and PubChem's table of compounds (`../phase-4/sources/`).

## The values as stored

| Value | Stored | From |
| --- | --- | --- |
| Heat of neutralisation, part 1 | −57.706 kJ for each mole of water formed | NBS tables: NaCl in 100 H₂O (−407.066) + H₂O(l) (−285.830) − HCl in 50 H₂O (−165.356) − NaOH in 50 H₂O (−469.834) |
| The same at endless dilution, given in the part's notes and used by no model | −55.836 kJ/mol | NBS tables: H₂O(l) − H⁺(ao) (0) − OH⁻(ao) (−229.994) |
| Heat of solution of ammonium nitrate, part 2 | +24.405 kJ for each mole | NBS tables: NH₄NO₃ in 50 H₂O (−341.155) − NH₄NO₃(cr) (−365.56) |
| The same at endless dilution, given in the notes | +25.69 kJ/mol | NBS tables: NH₄NO₃(ai) (−339.87) − NH₄NO₃(cr) |
| Specific heat of aluminium | 0.902 J/(g·°C) | NBS tables, 24.35 J/(mol·K), over 26.982 g/mol |
| Specific heat of iron | 0.449 J/(g·°C) | 25.10 over 55.845 |
| Specific heat of zinc | 0.388 J/(g·°C) | 25.40 over 65.38 |
| Specific heat of tin | 0.227 J/(g·°C) | 26.99, white tin, over 118.71 |
| Molar masses of the four metals | as above | CIAAW abridged standard atomic weights, the copy kept for the periodic table |
| Molar mass of ammonium nitrate | 80.044 g/mol | PubChem's table, the copy kept for the aqueous reactions lab |
| Specific heat of water | 4.18 J/(g·°C) | NIST Chemistry WebBook, which prints 4.1813 J/(g·K) at 25 °C and 0.1 MPa |
| Density of water | 1.00 g/mL | The same page, which prints 0.99705 g/mL |

## How each kind of value was read

- **Enthalpies of formation.** The NBS tables, from the scanned PDF that NIST serves, in the copy the aqueous reactions lab read (its sha256 is in the manifest). The scan has no text layer: each page was turned into an image and read by eye, and every row of the manifest says so and names the page, the table and the row. Pages read: 2-38 (hydrogen), 2-47 and 2-48 (chlorine), 2-64 to 2-67 (nitrogen), 2-299 to 2-301 (sodium).
- **Enthalpies at the strength on the bench.** The tables print, beside a dissolved substance, rows "in n H₂O": one mole in n moles of water. A 1.00 M solution holds a mole in about 55 moles of water, and about 4 g of ammonium nitrate in 50.0 g of water is a mole in 53 to 59. The nearest rows are used, for 50, and for 100 for the sodium chloride the neutralisation makes, and nothing is worked between rows. The tables' introduction was not read for how such a row is defined; it is taken as the enthalpy of formation of the dissolved substance with the water counted as pure water.
- **Heat capacities of the four metals.** The same tables, the last column (Cp at 298.15 K), pages 2-116 (tin), 2-127 (aluminium), 2-138 (zinc) and 2-177 (iron). The figure for a gram is the build's arithmetic, with the working stored beside it.
- **Molar masses.** The copies other labs keep; the build holds each stored figure to them.
- **Water.** One page of the NIST Chemistry WebBook, fetched once. Its site's robots file allows every reader, asks five seconds between requests, and carries a content signal that permits use as input to an AI and refuses use for training.
- **What each reagent looks like, and the name and formula of each metal.** Section 9 and the title of the supplier's safety data sheet for it, the same sheets its hazards rest on, read in the copies fetched for the hazards.
- **The primer's ideas.** Fourteen pages, each fetched and read that day, each with a row in the manifest: two of Purdue University's general chemistry help pages and a third of its department's, four pages of Chemguide, a page of NASA's Glenn Research Center, a page of HyperPhysics, a laboratory manual page of North Carolina State University as WebAssign serves it, three of Davidson College's virtual chemistry experiments, and a page of Doc Brown's revision notes. Each site's robots file was asked for first: three of the sites have none, and none of the others has a rule against automated readers or against the folders read.

## What could not be sourced, or only in part

- **The name "calorimeter constant".** The pages read call it the heat capacity of the calorimeter. The name is the usual one in laboratory manuals and is the lab's.
- **How a cooling line is carried back.** One page says that the drift after the reaction is carried back to the time the reaction started. Another names a cooling curve and sends the reader to a book that was not read.
- **That a piece heated in the water itself carries hot water with it, and that a hot piece does not look hot.** Read in no source; the laboratory manual page heats its metal in a dry test tube, which is where the primer has what a careful bench does.
- **The specific heat and density of the real solutions.** Not read. The lab gives every solution water's, as its specification says, and the notes say that this is an idealisation.
- **The strength of each solution in moles of water for each mole.** The lab's own arithmetic, from a litre of water; no density of a solution was read.
- **A correction to the NBS tables.** None was read (see the first point below).

## What a chemist should look at

1. **The tables' row for the nitrate ion.** Page 2-64 prints −205.0 kJ/mol for NO₃⁻(ao). Page 2-65 prints −207.36 for HNO₃(ai), which with H⁺ at 0 is the nitrate ion's figure, and page 2-66 prints −339.87 for NH₄NO₃(ai), which is −132.51 + (−207.36) exactly. So the tables' rows for the dissolved acid and salt agree with each other and not with the row for the ion alone. Summing the two ions' rows gives a heat of solution of +28.05 kJ/mol; the tables' own rows for the salt give +25.69 at endless dilution. The lab uses the rows for the salt. One of the pages read for the primer, another college's virtual experiment, is set to 28.05.
2. **Enthalpies for the strength on the bench, not for the standard state.** The stored −57.7 and +24.4 kJ/mol are for solutions of about the bench's strength; the standard-state figures, −55.8 and +25.7, are 3% and 5% away, which is as large as the lab's tolerance. The lab's specification asked for enthalpies of formation from these tables and did not say which rows. Using the standard-state figures is a change of two stored numbers and two notes.
3. **The solutions are given water's specific heat and density.** One page read says that a solution's specific heat is below water's; no figure for these solutions, and no density, was read. The model and the learner's arithmetic make the same idealisation, so a run is judged fairly; the temperatures drawn are a little off a real cup's.
4. **A metal's specific heat at 25 °C is used from near 100 °C down.** The page read for it says only that the heat capacity of a mole of most solids is nearly constant from room temperature up; no figure for any of the four metals at 100 °C was read.
5. **The model's leak and mixing are made up.** The four shares in `parameters` were chosen so that a careful run is within the tolerance at every seed and each technique error alone is outside it; the two for a careless cup are larger than a real cup's. Their rationales say so.
6. **White tin.** The tables list white tin first, as the reference form, and gray tin second (25.77 J/(mol·K)); the piece is taken to be white tin.
7. **Zinc's third figure.** 25.40 ÷ 65.38 is 0.388498: the stored 0.388 would be 0.389 with the tables' own molar mass of 1982.

## Tried and not read

The site of the United States Naval Academy names this kind of reader in its robots file; the site of the Centers for Disease Control and Prevention refused the request for its robots file. Nothing was done to get round either, and a guide of the second that another site also serves was left unread. Several addresses guessed at other universities' sites did not exist.

Pages that were fetched while looking for these and that nothing rests on: the other twenty-one pages of the laboratory manual the calorimetry page is one of, opened for their titles alone; the menus of a university's laboratory site and of a chemistry tutorial site, neither of which has a page on calorimetry; three more pages of Doc Brown's notes and three more of HyperPhysics, one of them on calorimetry, which says in fewer words what the pages cited say; and a page of NASA's on the specific heats of gases.

No page of OpenStax was fetched: the aqueous reactions lab's figures for water rest on one, and this lab stores the same figures from the NIST page.

## Read and not kept

Every source. A value read from a page that is not kept rests on what the manifest says the page printed that day. What the build holds is that the record and the manifest give one account, that the molar masses are the kept copies' figures, and that the worked-out values follow from the cited ones.

The quotation fingerprint that `src/chem-data/calorimetry/quotation.test.ts` compares the lab's words against is not kept either, for the reason `../phase-3/sources/README.md` gives. `scripts/fingerprint-sources.mjs` writes it to `sources/`, where `.gitignore` lists it, from pages saved outside the repository:

    node scripts/fingerprint-sources.mjs <folder of saved pages> 2026-10-09 docs/research/calorimetry/sources

## What nobody checked

No chemist has read the record, the notes or the primer. The scanned tables were read by one reader, by eye.
