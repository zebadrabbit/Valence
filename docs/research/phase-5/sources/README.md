# Sources of the mechanism timeline

`MANIFEST.json` lists every source of the timeline's record (`../mechanism.json`): the address, the citation, and rows that say what the source prints and where. Each row names, in `fields`, the stored values it supports, by their place in the record with the item's id in brackets: `thermo.formation[water].enthalpy`, `chapters[decomposition].timescale`. Every source was fetched and read on 2026-10-07.

Nothing is kept here. A value rests on what the manifest says its source printed that day: the build cannot check it again, and a page that has changed since is not noticed. What the build does hold is that the record and the manifest give one account: every value that cites a source has a row of that source that names it, a value stored with the figure its source prints has a row that prints that figure, and no row names a value that does not cite its source.

The shapes of the molecules and the radii of the two ions are not cited here. The timeline takes them from the library (`src/chem-data/molecules/`) and from `src/chem-data/elements.json`, where each has its source.

## How each kind of value was read

- **Enthalpies and Gibbs energies of formation.** The NBS tables (Wagman and others, 1982), as spec 5.2 names them: the scanned PDF that NIST serves, which the aqueous reactions lab cites too, under the same id and citation. The file has no text layer. Pages 2-38 (Table 2, hydrogen), 2-83 and 2-84 (Table 23, carbon), 2-299 and 2-314 (Table 99, sodium) were turned into images and read by eye, with pages 2-16, 2-20 and 2-21 of the introduction for what a remark in the table and the standard state mean. Fourteen values are stored, of which two are zero. The citation, which is shared with the aqueous lab, names only the two pages that lab read; the rows here name the pages read for this record.
- **The acid constant of carbonic acid itself.** Pines and others, *J. Phys. Chem. B* 2016, read as the authors' manuscript in PubMed Central, fetched as XML through NCBI's E-utilities. The XML carries the text, the two tables and the captions of the figures, all of which were read; the figures themselves were not seen. It gives a pKa of 3.49 with an uncertainty of 0.05, from experiments at 20.5 °C in ordinary water. The value is not from a titration. An acid made by a flash of light hands a proton to hydrogen carbonate, to lactate and to pyruvate; how fast it does so was timed from the fading of its fluorescence; and the pKa of carbonic acid was read from how that rate goes with acid strength, between the known pKa of lactic acid and of pyruvic acid.
- **How long carbonic acid lasts.** One sentence of the same paper's introduction: about 60 ms at room temperature. The paper did not measure it. The sentence cites studies of 1940, 1941 and 1963, which were not read.
- **How fast a proton moves to hydrogen carbonate.** The same paper, section 5.1: 5.7 × 10¹⁰ per second within a pair already in contact, which is one move in 18 picoseconds. The proton's source in that experiment is the light-made acid, not a hydronium ion.
- **The gas constant, the Boltzmann constant and the Planck constant.** NIST's listing of the 2022 CODATA values, read as its text file. All three are exact by definition.

## What is worked out here, and from what

Nothing was tuned to the totals of spec 9.2. They are what the stored values give.

| Value | Worked out as | Result, kJ/mol |
| --- | --- | --- |
| Step 1, ΔH and ΔG | Na⁺(ao) + HCO₃⁻(ao) − NaHCO₃(cr) | +18.70 and +2.325 |
| Step 2, ΔG | −RT ln 10 × pKa, at 298.15 K, with pKa 3.49 | −19.92 |
| Steps 2 and 3 together, ΔH and ΔG | CO₂(ao) + H₂O(l) − H⁺(ao) − HCO₃⁻(ao) | −7.64 and −36.339 |
| Step 3, ΔG | the line above less step 2: derived | −16.419 |
| Step 3, barrier | RT ln(k_B T τ / h) with τ = 60 ms, at 298.15 K: derived | 66.0 |
| Step 4, ΔH and ΔG | CO₂(g) − CO₂(ao) | +20.291 and −8.379 |
| Sum of the steps, ΔH and ΔG | | +31.351 and −42.393 |

The sums are those of NaHCO₃(cr) + H⁺(ao) → Na⁺(ao) + H₂O(l) + CO₂(g) taken straight from the tables, and round to the +31.4 and −42.4 of the spec.

- **The pKa was measured at 20.5 °C and is used at 298.15 K with no correction.** Its own uncertainty of 0.05 is 0.3 kJ/mol in step 2 and, with the opposite sign, in step 3. The sum of the two steps does not depend on it.
- **The barrier of step 3 is derived, not measured.** It is the Eyring equation with a transmission coefficient of one, applied to a lifetime the source gives as "about" 60 ms at a room temperature it does not state, and evaluated at 298.15 K. A lifetime twice as long or half as long moves it by 1.7 kJ/mol, and 5 K by about 1. The record marks it as derived.
- **Steps 2 and 3 are one change on the enthalpy curve**, as spec 9.2 allows: no enthalpy of the carbonic acid molecule is cited. One was found and is not used; see below.
- **The barrier of step 2 is schematic.** No barrier for a hydronium ion giving its proton to hydrogen carbonate was read. The height it is drawn at is a model parameter with its rationale in the record.
- **Steps 1 and 4 have no barrier in the record.** Neither is one move over a barrier.

## Read as a check, and not cited

- **Adamczyk and others, *Science* 2009, 326, 1690.** Only the abstract was read, as PubMed gives it. It reports a pKa of 3.45 with an uncertainty of 0.15 for carbonic acid, made in heavy water by handing a deuteron to hydrogen carbonate and watched with infrared pulses, and says the acid persists for nanoseconds. The paper itself is not open to read. The stored 3.49 lies within its range.
- **Aminov and others, *Proc. Natl. Acad. Sci. U.S.A.* 2019, 116, 20837** (PubMed Central PMC6800339). The abstract was read directly, from the record NCBI's E-utilities return: it gives the pKa of carbonic acid as a function of temperature, pKa(T) = −373.604 + 16,500/T + 56.478 ln T. At 298.15 K that is 3.525 by this project's arithmetic. The body of the paper was read only through a fetching tool that returns passages picked out by a language model, not the page itself; asked twice, it gave the same figures: a pKa of 3.52 with an uncertainty of 0.02 at 25 °C, measured by stopped flow with an indicator from 5 to 37 °C; a rate constant for the breaking up of carbonic acid of 19.5 per second at 20 °C, measured there, which is a lifetime of 51 ms; and a standard enthalpy and entropy of dissociation at 25 °C of −1.5 kcal/mol and −21.2 cal/(mol·K). Those figures agree with what is stored: 3.52 in place of 3.49 would move steps 2 and 3 by 0.2 kJ/mol each, and 19.5 per second gives a barrier of 64.5 kJ/mol at 293.15 K beside the stored 66.0 at 298.15 K. They are not cited, because the page that prints them was not read by this project. The enthalpy, if a reader of the paper confirms it, is the separate enthalpy that would let the enthalpy curve show steps 2 and 3 apart: +6.3 kJ/mol for step 2 and −13.9 kJ/mol for step 3.
- **The row for H₂CO₃ in the NBS tables** (page 2-84: −699.65 and −623.08 kJ/mol), which the table describes as CO₂ in water with a water molecule. Its figures are within 0.03 kJ/mol of the sum of the rows for CO₂(ao) and H₂O(l). It is not the carbonic acid molecule and nothing is worked out from it; a note in the record says so.

## What could not be sourced, or only in part

- **A measurement of the breaking up of carbonic acid, read at its source.** The studies that measured it are in journals whose pages refused an automated reader on the day (a check for a human visitor, or a refusal outright), and no way round such a check was tried. The stored lifetime is the one sentence of Pines and others described above.
- **A rate for a hydronium ion and a hydrogen carbonate ion.** None was read. The label "picoseconds to nanoseconds" on step 2 rests on the move from another acid, 18 picoseconds once in contact, and on the same paper's timing of the whole process over nanoseconds. How long the two take to find each other in a given solution is not stored.
- **The labels of steps 1 and 4**, "seconds, depending on particle size and stirring" and "seconds", have no source. They are the design's, each stored with that reason, and no number rests on them.
- **That the powder is the one sold as baking soda** has no source in the record. It is said once, in the first chapter's text.
- **The positions of the atoms between and around the reacting species** are this project's choreography, not a computed or measured path: how far apart two species sit when they meet, where the relaying water is, the turn of one O–H group before the relay, and the order in which things move. The shapes of the species themselves are the library's.

## The quotation fingerprint

The check that this project's words share no run of six consecutive words with a page it rests on (`src/mechanisms/quotation.test.ts`) compares them against a fingerprint that is not kept, for the reason `../../phase-3/sources/README.md` gives. `scripts/fingerprint-sources.mjs` writes it to this folder, where `.gitignore` lists it, from pages saved outside the repository:

    node scripts/fingerprint-sources.mjs <folder of saved pages> <YYYY-MM-DD> docs/research/phase-5/sources

The folder holds the text of Pines and others, the two abstracts read as checks and NIST's listing. The scanned tables have no text to take.
