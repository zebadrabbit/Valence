# Phase 2 research data

Verified inputs for the molecule explorer (spec section 6). Gathered on 2026-10-03; each file was produced by one pass and re-checked by a second, independent pass that re-fetched the sources and recomputed the derived values. The 72 structures added on 2026-10-09 were gathered in one pass, with no second one: see "The molecules added on 2026-10-09" below. What the table says of the first 33 structures is still true of them; the files now hold the added ones too.

| File | Contents |
| --- | --- |
| `geometry.json` | Experimental gas-phase bond lengths, angles, and coordinates for the 13 Basics and VSEPR molecules, from NIST CCCBDB, with a citation per value. |
| `elements.json` | Data for the 11 elements used in v1 (atomic weight, electronegativity, configuration, ionization energies, radii, colour), with a source per value. |
| `expected.json` | The expected-values table (written from the research and checked by script and by a second reviewer): Lewis structure, formal charge, oxidation state, steric number, geometry, and hybridization for every atom of all 33 structures, plus molecular orbital data for O₂ and N₂. |
| `pubchem.json` | PubChem CIDs, record availability, and checks for all 33 structures. |
| `sdf/` | PubChem 3D and 2D structure files as downloaded. 3D exists for 29 of 33; BF₃, SF₆, XeF₄, and PCl₅ have 2D only. |
| `emission-lines.json` | Visible emission lines of hydrogen, sodium and xenon from the NIST Atomic Spectra Database (wavelengths in air, as NIST prints them), generated from the downloaded tables and re-checked against the cited pages. Sodium's two D lines were added on 2026-10-04, read from the same query for Na I. Xenon's entry is history since 2026-10-08: see the correction below. |
| `parse-sdf.mjs` | The V2000 molfile parser used to check the downloads. |
| `fetch-pubchem.mjs`, `pubchem-properties-2026-10-09.json` | How the records of the added molecules were fetched from PubChem's REST service (one request at a time, five seconds apart), and the one response that is not an SDF file: the title, names, formula, SMILES, charge and conformer count of each CID, as returned. |
| `fetch-cccbdb.mjs`, `build-geometry-additions.mjs` | How NIST CCCBDB's experimental geometry pages were read for the added molecules, and the script that builds their coordinates from the printed lengths and angles into `geometry.json`. The pages are not kept. |
| `build-expected-additions.mjs` | The script that wrote the added molecules' entries, and five conventions, into `expected.json`. |
| `fetch-pubchem-notes.mjs`, `notes.json` | How PubChem's records were read for the sentence that says what each everyday molecule is, and, for each sentence, where in the record it was read and what was found. Nothing read is kept. |
| `r3f-spike.md` | Findings from a throwaway React Three Fiber prototype of the 3D viewer. |

`geometry.json` and `elements.json` keep `valueAsPublished` beside each cited length, angle, dihedral, atomic weight and electronegativity: the text the source prints, re-read from the CCCBDB pages, the PubChem periodic table and the CIAAW table on 2026-10-03. The build copies it into the app's data as `published`, and the app shows it, so a printed trailing zero (PCl₅ 2.020 Å, H₂O₂ 0.950 Å, hydrogen 1.0080) is kept. PubChem prints the electronegativity of hydrogen as 2.2 and of xenon as 2.6. CCCBDB prints no angle rows for PCl₅, so its three angles have no published text: they follow from the point group the page states (D3h), the build stores them with it, and the card labels them as following from the molecule's symmetry and not as a cited figure. The angles marked `fixedBySymmetry` that the page does print (CO₂, CH₄, BF₃, SF₆, XeF₄) are stored with their point group too, and the card labels each as a cited value that the molecule's symmetry fixes.

## Correction, 2026-10-08: xenon's emission lines

`emission-lines.json` held six xenon lines picked on 2026-10-03 as the six strongest by NIST's relative intensity. They were picked by transition probability, the column `Aki` that stands next to the relative intensity in NIST's table, and the file recorded those six numbers under the name `relativeIntensityAsPublished`. Two of the six have no relative intensity in NIST's table. This was found on 2026-10-08, when one rule was applied to every element from saved copies of NIST's responses (`docs/research/emission-spectra/README.md`).

The six were replaced the same day by the six that rule picks, by relative intensity, on the periodic table and in the molecule explorer. The entry stays in the file as the record of what was shown before, with two changes: it is marked `superseded`, with the date and the correction, and the field is renamed `transitionProbabilityAsPublished`. The build reads nothing from a superseded entry but the mark, and no longer writes its source to the app. Hydrogen's and sodium's entries were checked against the saved responses at the same time: their `relativeIntensityAsPublished` values are what NIST prints as relative intensities.

## Conventions decided after this research

`expected.json` records the research as gathered. Two project decisions differ from it; the spec (sections 6.1 and 6.3) is the authority:

- **Oxygen hybridization.** The file marks O–H and ester oxygens next to a C=O as sp² (the organic chemistry description). The project follows general chemistry textbooks: those oxygens are sp³ and bent. Each such atom's `withoutResonanceOverride` block in the file holds the values the project uses. Nitrogen in amides and urea stays sp².
- **Terminal singly bonded atoms.** Halogens and singly bonded O⁻ show "not assigned (terminal atom)" for hybridization.

## Known limits

- Covalent radii (Cordero 2008), Bondi's van der Waals radii, and ionic radii (Shannon 1976) come from paywalled papers and were checked only against secondary transcriptions that agree with each other.
- The xenon electronegativity (2.6) has no traced primary source.
- PubChem 3D structures are computed conformers, not measurements.

PubChem data is provided by the National Library of Medicine (NCBI), which places no restrictions on its use and requests acknowledgment. It is not covered by this repository's MIT licence.

## The molecules added on 2026-10-09

Seventy library entries (72 structures: serine and cysteine each have a zwitterion) were added to the first 31, in one pass, on 2026-10-09.

**Structures.** Each is PubChem's record by CID. `fetch-pubchem.mjs` asked PubChem's public REST service (PUG REST) for the properties of all the CIDs in one request, then for the 3D conformer and the 2D layout of each, one request at a time with five seconds between requests; the files under `sdf/` are what came back, and `pubchem.json` has an entry for each, dated. PubChem's `robots.txt` names no reader of any one kind; its rules for every crawler disallow `/rest/pug/` and ask for five seconds between requests. PUG REST is the interface PubChem documents for programs (`otherPolicyUrls.usagePolicyRateLimit` in `pubchem.json`), the first 33 structures came through it, and the pause was kept to the five seconds.

- The CID of every candidate resolved to the compound meant. Two choices: indigo is CID 5318432, the usual drawing (two C=O, two N–H), and not CID 10215, which PubChem titles Indigo and which draws a tautomer; fructose is β-D-fructofuranose (CID 439709), the five-membered ring, as glucose is the pyranose.
- 3D and 2D records list the atoms in the same order with the same bonds and charges for all 69 structures that have both (checked when the entries are written).

**Geometry.** A molecule added after the first 33 uses its PubChem 3D conformer. Six do not, and are built from the lengths and angles that NIST CCCBDB's experimental geometry page prints (`fetch-cccbdb.mjs`, read 2026-10-09; `build-geometry-additions.mjs`):

| Molecule | Why | What the page prints |
| --- | --- | --- |
| Hydrogen | PubChem has no 3D conformer | D∞h; rHH 0.741 (re; Huber and Herzberg 1979) |
| Chlorine trifluoride | PubChem has no 3D conformer | C2v; rFCl 1.597 (equatorial) and 1.697 (axial), aFClF 87.45 and 174.9 (Müller 2001, re structure; the 174.9 "from symmetry assuming planar") |
| Xenon difluoride | PubChem has no 3D conformer | D∞h; rFXe 1.974 (re; Bürger and Ma 1993), aFXeF 180 "from symmetry" |
| Sulfur tetrafluoride | PubChem's conformer is tetrahedral (every F–S–F angle 109.5°), and the molecule is a seesaw | C2v; rSF 1.646 (axial) and 1.545 (equatorial), aFSF 173.07, 101.55 and 87.81 (Tolles and Gwinn 1962) |
| Ozone | PubChem's conformer has O–O bonds of 1.432 and 1.232 Å, and the real molecule's are equal | C2v; rOO 1.278, aOOO 116.8 (Herzberg 1966) |
| Carbon monoxide | PubChem's conformer has a bond of 1.057 Å, 0.07 Å shorter than the measured one, and a diatomic molecule has no other geometry | C∞v; rCO 1.128 (re; NIST Diatomic Spectral Database) |

So the Basics and VSEPR groups now hold both kinds: the first 13 and these six are experimental, and the other 19 added to those two groups are computed conformers, labelled as such on their pages. Those 19 were not compared with measured structures, with one exception, seen and not corrected: nitric acid's two N–O bonds to the oxygens without a hydrogen are both 1.230 Å in the conformer, where CCCBDB's page for nitric acid (casno 7697372) prints 1.211 and 1.199 (Cox and Riveros 1965). The molecule's note gives those two figures.

**Left out, of the candidates.**

- **Beryllium chloride and bromine pentafluoride.** Both have a clean page at CCCBDB (BeCl₂: D∞h, rBeCl 1.750; BrF₅: C4v, rFBr 1.689 axial and 1.774 equatorial, aFBrF 84.8 and 89.53; both citing Gurvich 1989), and PubChem has no conformer for either. They are left out because beryllium and bromine are not among the 11 elements of `elements.json`: an element there carries a covalent radius (Cordero 2008), a van der Waals radius (Mantina 2009), ionic radii (Shannon 1976) and a colour (Jmol), each read through a copy that was not read for these two. Adding the two elements is the work that would bring both molecules in; bromine pentafluoride would be the library's only square pyramid.
- **The triiodide ion.** PubChem has no conformer and CCCBDB has no experimental geometry page for it (casno 14900040 answers with an error), so no geometry can be cited. Iodine is not in `elements.json` either.
- Chlorine pentafluoride was looked at as another square pyramid from elements the table has. CCCBDB's page for it (casno 13637633) prints one Cl–F length, one angle and the point group D3h, which is not the molecule's: not a page to build a structure from. It was not added.

**Expected values.** `build-expected-additions.mjs` wrote the 72 entries of `expected.json` from the saved 2D records (or from `geometry.json`), by the conventions the file already had and five it adds to it:

- `elemental-substances`: every atom of an uncharged element is 0. The rule of `oxidation-state` would give ozone +1, 0 and −1, its formal charges. The app's derivation was changed to match, with a test.
- `octet-forms`: sulfate, phosphate, sulfuric acid, phosphoric acid and sulfur trioxide are drawn in the octet-obeying form, as SO₂ is; PubChem stores each with S=O or P=O double bonds.
- `resonance-sets`: pairs (order 1.5) in ozone, nitric acid, acetate and the two zwitterions; sets of three (order 1.33) in nitrate, carbonate and sulfur trioxide.
- `benzene-rings`: the six bonds of every benzene ring are aromatic, and no other bond is. A ring that holds nitrogen is stored as drawn. A known limit.
- `added-geometries`: seesaw, T-shaped, and linear with three lone pairs.

The script printed every atom that is not a hydrogen, one line each, and its author read the 72 structures against what a first-year course would answer. For the last 22 of them (nicotine to aspartame) the lines of three kinds of carbon that always read alike were left out of the reading: a methyl carbon, a CH₂ between two carbons, and an aromatic C–H. Twenty-nine named cases in `src/chem-data/derive.test.ts` are the checks written by hand. The override of convention (c) selects 42 oxygens and 16 nitrogens among the added structures and no atom of another element.

**Notes.** `notes.json` gives, for the sentence under each everyday molecule, the part of its PubChem record it was written from. Two sentences say less than a reader might expect, because the record says no more: geosmin "has an earthy smell", and indigo is "a dye". The record used for indigo's structure has no description, so its sentence rests on the other record and names it.

**Not done.** No second, independent pass re-fetched the sources or recomputed the values, as one did for the first 33. No chemist has read any of it.
